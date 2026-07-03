/**
 * User profile state management for Spike SAT Prep.
 */

import {
  type McatSubject,
  MCAT_SUBJECTS,
  DEFAULT_ELO,
  calculateElo,
  getTieredRank,
  type TieredRankInfo,
} from './elo';
import { MCAT_CHAPTERS } from './chapters';
import { generateWeeklyPlan } from './planner';

export interface DomainProfile {
  elo: number;
  xp: number;
  confidence: number;
}

export interface SubjectProfile {
  subject: McatSubject;
  elo: number;
  xp: number;
  confidence: number;
  rank: TieredRankInfo;
  topics: Record<string, DomainProfile>;
}

export interface PracticeTestSummary {
  id?: string;
  takenAt: string;
  readingWritingScore: number;
  mathScore: number;
  /** Keyed by chapterId (e.g. "math-algebra") → raw section-breakdown counts. */
  domainBreakdown?: Record<string, { correct: number; total: number }> | null;
}

export interface UserPreferences {
  nextTestDate: string | null;
  preparedByDate: string | null;
  hasScheduledTest: boolean;
  recentReadingWritingScore: number | null;
  recentMathScore: number | null;
  rampUpPercentage: number;
  grindPercentage: number;
  lastStretchPercentage: number;
  rampUpQuestionsPerDay: number;
  grindQuestionsPerDay: number;
  lastStretchQuestionsPerDay: number;
}

export interface UserProfile {
  id: string;
  name: string;
  subjects: Record<McatSubject, SubjectProfile>;
  overallElo: number;
  overallRank: TieredRankInfo;
  totalXp: number;
  dailyStreak: number;
  lastPracticeDate: string | null;
  xpMultiplier: number;
  plannerTasks: import('./planner').PlannerTask[];
  preferences: UserPreferences;
  /** Most recent first. Logged from full-length practice tests. */
  practiceTests: PracticeTestSummary[];
}

export interface SessionResultInput {
  subject: McatSubject;
  questionDifficulty: number;
  isCorrect: boolean;
  topic: string;
}

export interface ProcessedSessionResult {
  eloChanges: Record<string, { topic: string; subject: McatSubject; eloDelta: number }>;
  totalEloDelta: number;
  xpGained: number;
  newProfile: UserProfile;
  leveledUp: boolean;
  oldRank: TieredRankInfo;
  newRank: TieredRankInfo;
  rankChanged: boolean;
}

const XP_PER_CORRECT = 12;
const XP_PER_INCORRECT = 4;

export function getXpMultiplier(streak: number): number {
  const bonus = Math.floor(streak / 5) * 0.15;
  return Math.min(2, 1 + bonus);
}

export function getLevel(xp: number): number {
  return Math.floor(xp / 125) + 1;
}

export function checkLevelUp(oldXp: number, newXp: number): boolean {
  return getLevel(newXp) > getLevel(oldXp);
}

function buildDefaultTopicMap(subject: McatSubject): Record<string, DomainProfile> {
  const topics: Record<string, DomainProfile> = {};
  for (const chapter of MCAT_CHAPTERS[subject]) {
    for (const topic of chapter.topics) {
      topics[topic] = { elo: DEFAULT_ELO, xp: 0, confidence: 3 };
    }
  }
  return topics;
}

export function createDefaultProfile(id: string = 'local', name: string = 'Student'): UserProfile {
  const subjects = {} as Record<McatSubject, SubjectProfile>;

  for (const subject of MCAT_SUBJECTS) {
    subjects[subject] = {
      subject,
      elo: DEFAULT_ELO,
      xp: 0,
      confidence: 3,
      rank: getTieredRank(DEFAULT_ELO),
      topics: buildDefaultTopicMap(subject),
    };
  }

  const baseProfile: UserProfile = {
    id,
    name,
    subjects,
    overallElo: DEFAULT_ELO,
    overallRank: getTieredRank(DEFAULT_ELO),
    totalXp: 0,
    dailyStreak: 0,
    lastPracticeDate: null,
    xpMultiplier: 1,
    plannerTasks: [],
    practiceTests: [],
    preferences: {
      nextTestDate: null,
      preparedByDate: new Date(Date.now() + 84 * 24 * 60 * 60 * 1000).toISOString(),
      hasScheduledTest: false,
      recentReadingWritingScore: null,
      recentMathScore: null,
      rampUpPercentage: 35,
      grindPercentage: 45,
      lastStretchPercentage: 20,
      rampUpQuestionsPerDay: 16,
      grindQuestionsPerDay: 24,
      lastStretchQuestionsPerDay: 32,
    },
  };

  const todayStr = new Date().toISOString().split('T')[0];
  baseProfile.plannerTasks = generateWeeklyPlan(baseProfile, todayStr);
  return baseProfile;
}

export function processSessionResults(
  profile: UserProfile,
  results: SessionResultInput[],
  totalAnsweredInSubject: number = 40
): ProcessedSessionResult {
  const newProfile = structuredClone(profile);
  const oldOverallRank = getTieredRank(newProfile.overallElo);

  const eloChanges: Record<string, { topic: string; subject: McatSubject; eloDelta: number }> = {};
  let totalEloDelta = 0;
  let totalRawXp = 0;

  const today = new Date().toISOString().split('T')[0];
  if (!newProfile.lastPracticeDate) {
    newProfile.dailyStreak = 1;
  } else if (newProfile.lastPracticeDate === today) {
    // no-op
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    newProfile.dailyStreak = newProfile.lastPracticeDate === yesterdayStr ? newProfile.dailyStreak + 1 : 1;
  }
  newProfile.lastPracticeDate = today;
  newProfile.xpMultiplier = getXpMultiplier(newProfile.dailyStreak);

  for (const result of results) {
    const subjectProfile = newProfile.subjects[result.subject];

    const sectionElo = calculateElo(
      subjectProfile.elo,
      result.questionDifficulty,
      result.isCorrect,
      totalAnsweredInSubject
    );
    subjectProfile.elo = sectionElo.newUserElo;
    subjectProfile.rank = sectionElo.tieredRank;

    if (!subjectProfile.topics[result.topic]) {
      subjectProfile.topics[result.topic] = {
        elo: DEFAULT_ELO,
        xp: 0,
        confidence: 3,
      };
    }

    const topicElo = calculateElo(
      subjectProfile.topics[result.topic].elo,
      result.questionDifficulty,
      result.isCorrect,
      totalAnsweredInSubject
    );
    subjectProfile.topics[result.topic].elo = topicElo.newUserElo;
    subjectProfile.topics[result.topic].confidence = Math.max(
      1,
      Math.min(
        5,
        subjectProfile.topics[result.topic].confidence + (result.isCorrect ? 0.1 : -0.1)
      )
    );

    if (!eloChanges[result.topic]) {
      eloChanges[result.topic] = {
        topic: result.topic,
        subject: result.subject,
        eloDelta: 0,
      };
    }
    eloChanges[result.topic].eloDelta += topicElo.eloChange;
    totalEloDelta += sectionElo.eloChange;
    totalRawXp += result.isCorrect ? XP_PER_CORRECT : XP_PER_INCORRECT;
  }

  const xpGained = Math.round(totalRawXp * newProfile.xpMultiplier);
  const oldTotalXp = newProfile.totalXp;
  newProfile.totalXp += xpGained;

  const primarySubject = results[0]?.subject;
  if (primarySubject) {
    newProfile.subjects[primarySubject].xp += xpGained;
    const avgConfidence =
      Object.values(newProfile.subjects[primarySubject].topics).reduce((sum, topic) => sum + topic.confidence, 0) /
      Math.max(1, Object.keys(newProfile.subjects[primarySubject].topics).length);
    newProfile.subjects[primarySubject].confidence = Math.round(avgConfidence * 10) / 10;
  }

  const eloSum = MCAT_SUBJECTS.reduce((sum, subject) => sum + newProfile.subjects[subject].elo, 0);
  newProfile.overallElo = Math.round(eloSum / MCAT_SUBJECTS.length);
  newProfile.overallRank = getTieredRank(newProfile.overallElo);

  const newOverallRank = newProfile.overallRank;
  const leveledUp = checkLevelUp(oldTotalXp, newProfile.totalXp);
  const rankChanged = oldOverallRank.displayName !== newOverallRank.displayName;

  return {
    eloChanges,
    totalEloDelta,
    xpGained,
    newProfile,
    leveledUp,
    oldRank: oldOverallRank,
    newRank: newOverallRank,
    rankChanged,
  };
}
