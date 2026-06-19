import { MCAT_CHAPTERS } from './chapters';
import { type McatSubject, MCAT_SUBJECTS } from './elo';
import { type UserProfile } from './userProfile';

export interface PlannerTask {
  id: string;
  title: string;
  subject: McatSubject | 'mixed' | 'custom';
  type: 'review' | 'new' | 'practice' | 'manual' | 'checkpoint';
  status: 'pending' | 'completed' | 'missed';
  scheduledDate: string;
  phase?: string;
  xpReward?: number;
  questionCount?: number;
  targetTopics?: string[];
  notes?: string;
}

const DEFAULT_PREP_DAYS = 84;

interface PlanningWindow {
  targetDate: Date;
  totalDays: number;
  phaseName: string;
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function buildPlanningWindow(profile: UserProfile, today: Date): PlanningWindow {
  const prefs = profile.preferences;
  const start = normalizeDate(today);

  let targetDate: Date;
  if (prefs.nextTestDate) {
    targetDate = normalizeDate(new Date(prefs.nextTestDate));
  } else if (prefs.preparedByDate) {
    targetDate = normalizeDate(new Date(prefs.preparedByDate));
  } else {
    targetDate = normalizeDate(new Date(start.getTime() + DEFAULT_PREP_DAYS * 24 * 60 * 60 * 1000));
  }

  const totalDays = Math.max(21, Math.ceil((targetDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const daysLeft = Math.max(0, totalDays);
  const rampUpDays = Math.round(totalDays * (prefs.rampUpPercentage / 100));
  const lastStretchDays = Math.round(totalDays * (prefs.lastStretchPercentage / 100));

  let phaseName = 'Build';
  if (daysLeft <= lastStretchDays) phaseName = 'Polish';
  else if (daysLeft <= totalDays - rampUpDays) phaseName = 'Push';

  return { targetDate, totalDays, phaseName };
}

function getDailyQuestionTarget(profile: UserProfile, phaseName: string): number {
  if (phaseName === 'Build') return profile.preferences.rampUpQuestionsPerDay;
  if (phaseName === 'Push') return profile.preferences.grindQuestionsPerDay;
  return profile.preferences.lastStretchQuestionsPerDay;
}

function getWeakestTopics(profile: UserProfile, subject: McatSubject, limit: number): string[] {
  const subjectProfile = profile.subjects[subject];
  return Object.entries(subjectProfile.topics)
    .sort((a, b) => a[1].elo - b[1].elo)
    .slice(0, limit)
    .map(([topic]) => topic);
}

function getWeightedDomainRotation(profile: UserProfile): Array<{ subject: McatSubject; weight: number }> {
  return MCAT_SUBJECTS.map((subject) => {
    const sectionElo = profile.subjects[subject].elo;
    const confidence = profile.subjects[subject].confidence;
    const weight = (1800 - sectionElo) + (5 - confidence) * 50;
    return { subject, weight };
  }).sort((a, b) => b.weight - a.weight);
}

export function generateWeeklyPlan(profile: UserProfile, startDateStr: string): PlannerTask[] {
  const start = normalizeDate(new Date(startDateStr));
  const { targetDate, totalDays, phaseName } = buildPlanningWindow(profile, start);
  const baseQuestions = getDailyQuestionTarget(profile, phaseName);
  const weights = getWeightedDomainRotation(profile);
  const primary = weights[0]?.subject ?? 'reading_writing';
  const secondary = weights[1]?.subject ?? 'math';

  const planLength = Math.min(21, Math.max(7, totalDays));
  const tasks: PlannerTask[] = [];

  for (let dayIndex = 0; dayIndex < planLength; dayIndex += 1) {
    const current = new Date(start);
    current.setDate(current.getDate() + dayIndex);
    const scheduledDate = current.toISOString().split('T')[0];

    const rotation = weights[dayIndex % weights.length]?.subject ?? primary;
    const targetSubject = dayIndex % 3 === 0 ? primary : rotation;
    const weakestTopics = getWeakestTopics(profile, targetSubject, 2);
    const titlePrefix =
      targetSubject === 'reading_writing' ? 'Verbal Focus' : 'Quant Focus';

    tasks.push({
      id: `auto-${scheduledDate}-primary`,
      title: `${titlePrefix}: ${MCAT_CHAPTERS[targetSubject].find((d) => d.topics.includes(weakestTopics[0]))?.name ?? 'Adaptive Review'}`,
      subject: targetSubject,
      type: dayIndex % 4 === 0 ? 'review' : 'practice',
      status: 'pending',
      scheduledDate,
      phase: phaseName,
      xpReward: Math.round(baseQuestions * 1.2),
      questionCount: baseQuestions,
      targetTopics: weakestTopics,
      notes: `Targets weakest ${targetSubject === 'reading_writing' ? 'RW' : 'Math'} domains first using section ELO and confidence.`,
    });

    const daysUntilTarget = Math.ceil((targetDate.getTime() - current.getTime()) / (24 * 60 * 60 * 1000));
    const shouldAddSecondTask = baseQuestions >= 25 || daysUntilTarget <= 28 || targetSubject !== secondary;

    if (shouldAddSecondTask) {
      tasks.push({
        id: `auto-${scheduledDate}-secondary`,
        title: `Reinforcement: ${secondary === 'reading_writing' ? 'Reading & Writing' : 'Math'} mixed set`,
        subject: secondary,
        type: dayIndex % 5 === 0 ? 'new' : 'review',
        status: 'pending',
        scheduledDate,
        phase: phaseName,
        xpReward: Math.round(baseQuestions * 0.7),
        questionCount: Math.max(6, Math.round(baseQuestions * 0.45)),
        targetTopics: getWeakestTopics(profile, secondary, 2),
        notes: 'Maintains the non-primary section so gains stay balanced across the full SAT.',
      });
    }

    if ((dayIndex + 1) % 7 === 0) {
      tasks.push({
        id: `auto-${scheduledDate}-checkpoint`,
        title: 'Weekly Checkpoint',
        subject: 'mixed',
        type: 'checkpoint',
        status: 'pending',
        scheduledDate,
        phase: phaseName,
        xpReward: Math.round(baseQuestions * 1.5),
        questionCount: Math.max(12, Math.round(baseQuestions * 0.75)),
        targetTopics: [
          ...getWeakestTopics(profile, primary, 1),
          ...getWeakestTopics(profile, secondary, 1),
        ],
        notes: 'Mixed review checkpoint to measure whether weaker domains are catching up.',
      });
    }
  }

  return tasks.sort((a, b) => {
    if (a.scheduledDate !== b.scheduledDate) {
      return a.scheduledDate.localeCompare(b.scheduledDate);
    }
    return a.id.localeCompare(b.id);
  });
}
