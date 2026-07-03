/**
 * "Road to Gold" scheduling algorithm.
 *
 * Goal: get every subject domain to Gold (hard-difficulty questions,
 * ELO ≥ 1550) by the student's exam date.
 *
 * How it works:
 *  1. Each domain's ELO gap to Gold is converted into a question budget
 *     (an average answered question moves domain ELO ~6 points at the
 *     paces students actually hit).
 *  2. Days remaining until the exam turn that budget into a required daily
 *     pace; the domains furthest behind pace get scheduled first.
 *  3. Practice-test results (section scores + per-domain breakdown) shift
 *     domain priorities: domains the student underperformed in on a real
 *     test get boosted even if their drill ELO looks fine.
 *  4. The final six weeks add a weekly full-length practice-test reminder,
 *     and drill volume shifts toward whichever domains are still short of
 *     Gold ("Polish" phase).
 */

import { MCAT_CHAPTERS, type Chapter } from './chapters';
import { type McatSubject, MCAT_SUBJECTS, getTieredRank, type TieredRankInfo } from './elo';
import { type UserProfile, type PracticeTestSummary } from './userProfile';

export interface PlannerTask {
  id: string;
  title: string;
  subject: McatSubject | 'mixed' | 'custom';
  type: 'review' | 'new' | 'practice' | 'manual' | 'checkpoint' | 'practice_test';
  status: 'pending' | 'completed' | 'missed';
  scheduledDate: string;
  phase?: string;
  xpReward?: number;
  questionCount?: number;
  targetTopics?: string[];
  targetChapterId?: string;
  notes?: string;
}

/** Gold I floor — a domain is "Gold" (serving hard questions) at this ELO. */
export const GOLD_TARGET_ELO = 1550;
/** Average net domain-ELO gain per answered question, observed across bands. */
const ELO_PER_QUESTION = 6;
/** Fraction of scheduled questions we assume actually convert into rating. */
const COMPLETION_EFFICIENCY = 0.7;
const DEFAULT_PREP_DAYS = 84;
const PRACTICE_TEST_WINDOW_DAYS = 42; // last 6 weeks
const PLAN_HORIZON_DAYS = 28;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DomainState {
  subject: McatSubject;
  chapterId: string;
  domain: string;
  topics: string[];
  elo: number;
  rank: TieredRankInfo;
  confidence: number;
  gapToGold: number;
  /** Questions still needed (estimated) for this domain to reach Gold. */
  questionsToGold: number;
  /** Latest practice-test accuracy for this domain, if logged (0–1). */
  practiceTestAccuracy: number | null;
  /** Scheduling priority — higher means schedule sooner. */
  priority: number;
}

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDomainElo(profile: UserProfile, subject: McatSubject, chapter: Chapter): number {
  const topicElos = chapter.topics
    .map((topic) => profile.subjects[subject].topics[topic]?.elo)
    .filter((elo): elo is number => typeof elo === 'number');
  if (topicElos.length === 0) return profile.subjects[subject].elo;
  return Math.round(topicElos.reduce((sum, elo) => sum + elo, 0) / topicElos.length);
}

function getDomainConfidence(profile: UserProfile, subject: McatSubject, chapter: Chapter): number {
  const values = chapter.topics
    .map((topic) => profile.subjects[subject].topics[topic]?.confidence)
    .filter((c): c is number => typeof c === 'number');
  if (values.length === 0) return profile.subjects[subject].confidence;
  return values.reduce((sum, c) => sum + c, 0) / values.length;
}

/**
 * Current per-domain standing: ELO (aggregated from topic ratings), rank,
 * gap to Gold, and scheduling priority. Also powers the dashboard node graph.
 */
export function computeDomainStates(
  profile: UserProfile,
  latestPracticeTest?: PracticeTestSummary | null,
  daysToExam: number = DEFAULT_PREP_DAYS
): DomainState[] {
  const test = latestPracticeTest ?? profile.practiceTests?.[0] ?? null;
  const states: DomainState[] = [];

  for (const subject of MCAT_SUBJECTS) {
    for (const chapter of MCAT_CHAPTERS[subject]) {
      const elo = getDomainElo(profile, subject, chapter);
      const confidence = getDomainConfidence(profile, subject, chapter);
      const gapToGold = Math.max(0, GOLD_TARGET_ELO - elo);
      const questionsToGold = Math.ceil(gapToGold / (ELO_PER_QUESTION * COMPLETION_EFFICIENCY));

      const breakdown = test?.domainBreakdown?.[chapter.id];
      const practiceTestAccuracy =
        breakdown && breakdown.total > 0 ? breakdown.correct / breakdown.total : null;

      // Priority: required daily pace to close the gap, scaled up when the
      // student is unconfident or underperformed this domain on a real test.
      const pacePressure = gapToGold / Math.max(7, daysToExam);
      const confidenceBoost = (5 - confidence) * 0.6;
      const testBoost = practiceTestAccuracy != null ? Math.max(0, 0.75 - practiceTestAccuracy) * 20 : 0;
      const priority = pacePressure * 10 + confidenceBoost + testBoost;

      states.push({
        subject,
        chapterId: chapter.id,
        domain: chapter.name,
        topics: chapter.topics,
        elo,
        rank: getTieredRank(elo),
        confidence,
        gapToGold,
        questionsToGold,
        practiceTestAccuracy,
        priority,
      });
    }
  }

  return states.sort((a, b) => b.priority - a.priority);
}

interface PlanningWindow {
  targetDate: Date;
  totalDays: number;
  daysToExam: number;
  phaseName: 'Build' | 'Push' | 'Polish';
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
    targetDate = normalizeDate(new Date(start.getTime() + DEFAULT_PREP_DAYS * MS_PER_DAY));
  }

  const daysToExam = Math.max(1, Math.ceil((targetDate.getTime() - start.getTime()) / MS_PER_DAY));
  const totalDays = Math.max(21, daysToExam);

  let phaseName: PlanningWindow['phaseName'] = 'Build';
  if (daysToExam <= PRACTICE_TEST_WINDOW_DAYS) phaseName = 'Polish';
  else if (daysToExam <= totalDays * (1 - profile.preferences.rampUpPercentage / 100)) phaseName = 'Push';

  return { targetDate, totalDays, daysToExam, phaseName };
}

function getDailyQuestionTarget(profile: UserProfile, phaseName: string, daysToExam: number): number {
  const domainStates = computeDomainStates(profile, null, daysToExam);
  const totalQuestionsNeeded = domainStates.reduce((sum, d) => sum + d.questionsToGold, 0);

  const autoDaily = Math.ceil(totalQuestionsNeeded / Math.max(1, daysToExam));

  const phaseMultiplier = phaseName === 'Build' ? 0.8 : phaseName === 'Push' ? 1.0 : 1.2;
  const smartDaily = Math.round(autoDaily * phaseMultiplier);

  return Math.max(8, Math.min(50, smartDaily));
}

/** Weakest topics inside a domain — what the daily block should target. */
function weakestTopicsInDomain(profile: UserProfile, state: DomainState, limit: number): string[] {
  return [...state.topics]
    .sort(
      (a, b) =>
        (profile.subjects[state.subject].topics[a]?.elo ?? 1000) -
        (profile.subjects[state.subject].topics[b]?.elo ?? 1000)
    )
    .slice(0, limit);
}

/** Dates for weekly full-length practice tests in the final six weeks. */
export function getPracticeTestDates(examDate: Date, from: Date): string[] {
  const dates: string[] = [];
  for (let weeksOut = 1; weeksOut <= PRACTICE_TEST_WINDOW_DAYS / 7; weeksOut += 1) {
    const testDate = normalizeDate(new Date(examDate.getTime() - weeksOut * 7 * MS_PER_DAY));
    if (testDate.getTime() >= normalizeDate(from).getTime()) {
      dates.push(toDateString(testDate));
    }
  }
  return dates.sort();
}

export function generateWeeklyPlan(profile: UserProfile, startDateStr: string): PlannerTask[] {
  const start = normalizeDate(new Date(startDateStr));
  const { targetDate, daysToExam, phaseName } = buildPlanningWindow(profile, start);
  const baseQuestions = getDailyQuestionTarget(profile, phaseName, daysToExam);

  const domainStates = computeDomainStates(profile, profile.practiceTests?.[0] ?? null, daysToExam);

  // Simulated ELO credit per domain: once a domain gets a block, its urgency
  // drops for the next few days so the schedule sweeps all eight domains
  // instead of hammering the single weakest one.
  const simulatedGain: Record<string, number> = {};
  const pickDomain = (candidates: DomainState[], exclude: Set<string>): DomainState | null => {
    let best: DomainState | null = null;
    let bestScore = -Infinity;
    for (const state of candidates) {
      if (exclude.has(state.chapterId)) continue;
      const score = state.priority - (simulatedGain[state.chapterId] ?? 0) / 10;
      if (score > bestScore) {
        best = state;
        bestScore = score;
      }
    }
    return best;
  };

  const planLength = Math.min(PLAN_HORIZON_DAYS, Math.max(7, daysToExam));
  const practiceTestDates = new Set(getPracticeTestDates(targetDate, start));
  const tasks: PlannerTask[] = [];

  for (let dayIndex = 0; dayIndex < planLength; dayIndex += 1) {
    const current = new Date(start.getTime() + dayIndex * MS_PER_DAY);
    const scheduledDate = toDateString(current);
    if (current.getTime() >= targetDate.getTime()) break;

    // Full-length practice-test day: the test replaces drilling.
    if (practiceTestDates.has(scheduledDate)) {
      const weeksOut = Math.round((targetDate.getTime() - current.getTime()) / (7 * MS_PER_DAY));
      tasks.push({
        id: `auto-${scheduledDate}-practice-test`,
        title: `Full-length practice test (${weeksOut} week${weeksOut === 1 ? '' : 's'} out)`,
        subject: 'mixed',
        type: 'practice_test',
        status: 'pending',
        scheduledDate,
        phase: phaseName,
        xpReward: 120,
        questionCount: 98,
        notes:
          'Take a timed, full-length practice test. Afterward, log your section scores and per-domain breakdown on the Testing page — it recalibrates your domain ratings and reshapes this plan.',
      });
      continue;
    }

    const used = new Set<string>();

    // Primary block: the domain furthest behind Gold pace.
    const primary = pickDomain(domainStates, used);
    if (!primary) continue;
    used.add(primary.chapterId);
    const primaryQuestions = Math.max(6, Math.round(baseQuestions * 0.6));
    simulatedGain[primary.chapterId] =
      (simulatedGain[primary.chapterId] ?? 0) + primaryQuestions * ELO_PER_QUESTION * COMPLETION_EFFICIENCY;

    const primaryBadge =
      primary.rank.rank === 'Gold' ? 'Maintain Gold' : `${primary.rank.rank} → Gold`;
    tasks.push({
      id: `auto-${scheduledDate}-primary`,
      title: `${primaryBadge}: ${primary.domain}`,
      subject: primary.subject,
      type: dayIndex % 4 === 0 ? 'review' : 'practice',
      status: 'pending',
      scheduledDate,
      phase: phaseName,
      xpReward: Math.round(primaryQuestions * 1.2),
      questionCount: primaryQuestions,
      targetTopics: weakestTopicsInDomain(profile, primary, 2),
      targetChapterId: primary.chapterId,
      notes:
        primary.gapToGold > 0
          ? `${primary.gapToGold} ELO to Gold (~${primary.questionsToGold} questions at current pace).`
          : 'Gold reached — hard-difficulty upkeep so the rating holds.',
    });

    // Secondary block: strongest-priority domain from the other section, so
    // both SAT sections stay warm every day.
    const otherSection = domainStates.filter((state) => state.subject !== primary.subject);
    const secondary = pickDomain(otherSection, used);
    if (secondary) {
      used.add(secondary.chapterId);
      const secondaryQuestions = Math.max(4, Math.round(baseQuestions * 0.4));
      simulatedGain[secondary.chapterId] =
        (simulatedGain[secondary.chapterId] ?? 0) + secondaryQuestions * ELO_PER_QUESTION * COMPLETION_EFFICIENCY;

      tasks.push({
        id: `auto-${scheduledDate}-secondary`,
        title: `Reinforce: ${secondary.domain}`,
        subject: secondary.subject,
        type: dayIndex % 5 === 0 ? 'new' : 'review',
        status: 'pending',
        scheduledDate,
        phase: phaseName,
        xpReward: Math.round(secondaryQuestions * 0.9),
        questionCount: secondaryQuestions,
        targetTopics: weakestTopicsInDomain(profile, secondary, 2),
        targetChapterId: secondary.chapterId,
        notes: 'Keeps the other section moving toward Gold in parallel.',
      });
    }

    // Weekly mixed checkpoint measures whether weak domains are catching up.
    if ((dayIndex + 1) % 7 === 0) {
      const weakest = domainStates.slice(0, 2);
      tasks.push({
        id: `auto-${scheduledDate}-checkpoint`,
        title: 'Weekly checkpoint: weakest domains',
        subject: 'mixed',
        type: 'checkpoint',
        status: 'pending',
        scheduledDate,
        phase: phaseName,
        xpReward: Math.round(baseQuestions * 1.5),
        questionCount: Math.max(10, Math.round(baseQuestions * 0.75)),
        targetTopics: weakest.flatMap((state) => weakestTopicsInDomain(profile, state, 1)),
        notes: 'Mixed review across your two lowest-rated domains to confirm they are closing the gap.',
      });
    }
  }

  return tasks.sort((a, b) => {
    if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
    return a.id.localeCompare(b.id);
  });
}
