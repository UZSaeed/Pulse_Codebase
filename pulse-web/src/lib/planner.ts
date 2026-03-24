import { McatSubject, MCAT_SUBJECTS } from './elo';
import { UserProfile } from './userProfile';

export interface PlannerTask {
  id: string;
  title: string;
  subject: McatSubject | 'mixed' | 'custom';
  type: 'review' | 'new' | 'practice' | 'manual';
  status: 'pending' | 'completed' | 'missed';
  scheduledDate: string; // YYYY-MM-DD
  phase?: string;
  xpReward?: number;
  questionCount?: number;
  targetTopics?: string[]; // Specifically focused topics based on weakest subtopic ELO
}

/**
 * Calculates the current study phase based on the user's test date and phase allocations.
 */
function determinePhase(profile: UserProfile, today: Date): { phaseName: string; qPerDay: number } {
  const prefs = profile.preferences;
  if (!prefs.testDate) return { phaseName: 'The Grind', qPerDay: prefs.grindQuestionsPerDay };

  const testDate = new Date(prefs.testDate);
  const totalDays = 120; // Assume a default 120 day study plan if we don't know start date
  const daysUntilTest = Math.ceil((testDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilTest <= 0) return { phaseName: 'Last Stretch', qPerDay: prefs.lastStretchQuestionsPerDay };

  const rampUpDays = (prefs.rampUpPercentage / 100) * totalDays;
  const lastStretchDays = (prefs.lastStretchPercentage / 100) * totalDays;

  if (daysUntilTest <= lastStretchDays) {
    return { phaseName: 'Last Stretch', qPerDay: prefs.lastStretchQuestionsPerDay };
  } else if (daysUntilTest > totalDays - rampUpDays) {
    return { phaseName: 'Ramp Up', qPerDay: prefs.rampUpQuestionsPerDay };
  } else {
    return { phaseName: 'The Grind', qPerDay: prefs.grindQuestionsPerDay };
  }
}

/**
 * Generates an adaptive 7-day plan using an inverse-ELO weighted Spaced Repetition heuristic.
 * Concept: Lower ELO subjects (harder material) receive shorter review intervals and more focus.
 * Higher ELO subjects get spaced further apart to maintain retention without wasting time.
 */
export function generateWeeklyPlan(profile: UserProfile, startDateStr: string): PlannerTask[] {
  const tasks: PlannerTask[] = [];
  const start = new Date(startDateStr);
  const { phaseName, qPerDay } = determinePhase(profile, start);

  // Calculate SR weights based on Subject ELO. 
  // Base ELO is 1500. Softmax-like inversion to heavily weight weak subjects.
  const weights = MCAT_SUBJECTS.map(s => {
    const elo = profile.subjects[s].elo;
    // Lower ELO = higher weight. E.g. ELO 1200 -> diff 300. ELO 1800 -> diff -300.
    const diff = 1500 - elo;
    const weight = Math.max(0.1, 1 + (diff / 400)); // Cap min weight
    return { subject: s, weight, elo };
  });

  // Sort by weight descending (weakest first)
  weights.sort((a, b) => b.weight - a.weight);

  // Distribute the week:
  // We want to ensure EVERY subject is hit at least once, but weak subjects hit multiple times.
  // 7 days. Day 1: Weakest. Day 2: 2nd Weakest. Day 3: Weakest again (spaced 2 days). 
  // Day 4: 3rd Weakest. Day 5: 4th Weakest (Strongest). Day 6: Mixed review. Day 7: Weakest (spaced 4 days).
  
  const schedulePattern = [
    weights[0].subject, // Day 1: targeted weak subject
    weights[1].subject, // Day 2: second weak
    weights[0].subject, // Day 3: first spaced rep of weak subject
    weights[2].subject, // Day 4: third subject
    weights[3].subject, // Day 5: strongest subject (longest interval)
    'mixed' as const,   // Day 6: comprehensive mixed sets
    weights[0].subject, // Day 7: second spaced rep of weak subject
  ];

  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(start);
    currentDay.setDate(currentDay.getDate() + i);
    const dateStr = currentDay.toISOString().split('T')[0];
    
    const targetSubject = schedulePattern[i];
    
    let type: PlannerTask['type'] = 'review';
    let title = '';
    let targetTopics: string[] | undefined = undefined;

    if (targetSubject === 'mixed') {
      title = `Spaced Repetition: All Subjects`;
      type = 'practice';
    } else {
      // Find the weakest topic within this specific subject
      const subjectData = profile.subjects[targetSubject as McatSubject];
      if (subjectData && subjectData.topics) {
        let weakestTopic = '';
        let lowestTopicElo = 9999;
        
        for (const [topicName, topicData] of Object.entries(subjectData.topics)) {
          if (topicData.elo < lowestTopicElo) {
            lowestTopicElo = topicData.elo;
            weakestTopic = topicName;
          }
        }

        if (weakestTopic) {
          targetTopics = [weakestTopic];
        }
      }

      // If we are repeating the weakest subject, call it Spaced Review
      if (i === 2 || i === 6) {
        title = targetTopics 
          ? `Spaced Target: ${formatSubject(targetSubject)} — ${targetTopics[0]}`
          : `Spaced Target: ${formatSubject(targetSubject)}`;
        type = 'review';
      } else {
        title = targetTopics
          ? `Concept Break-down: ${formatSubject(targetSubject)} — ${targetTopics[0]}`
          : `Concept Integration: ${formatSubject(targetSubject)}`;
        type = 'new';
      }
    }

    // Split daily questions block if phase dictates high volume
    let qCount = qPerDay;
    if (targetSubject === 'mixed') qCount = Math.floor(qPerDay * 1.5); // Push a bit harder on mixed days

    tasks.push({
      id: `auto-${dateStr}-${i}`,
      title,
      subject: targetSubject,
      type,
      status: 'pending',
      scheduledDate: dateStr,
      phase: phaseName,
      xpReward: Math.round(qCount * 1.5),
      questionCount: qCount,
      targetTopics,
    });
  }

  return tasks;
}

function formatSubject(s: McatSubject | 'mixed' | 'custom'): string {
  if (s === 'mixed') return 'Mixed';
  if (s === 'custom') return 'Custom';
  const labels: Record<McatSubject, string> = {
    chem_phys: 'Chem/Phys',
    cars: 'CARS',
    bio_biochem: 'Bio/Biochem',
    psych_soc: 'Psych/Soc',
  };
  return labels[s];
}
