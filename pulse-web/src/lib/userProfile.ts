/**
 * User Profile state management for Spike MCAT Prep.
 * 
 * Handles XP awards, streak tracking, and ELO processing.
 * Designed to work with both in-memory state and database persistence.
 */

import { McatSubject, MCAT_SUBJECTS, DEFAULT_ELO, calculateElo, getTieredRank, type TieredRankInfo } from './elo';

// ─── Types ───────────────────────────────────────────────────────

export interface SubjectProfile {
  subject: McatSubject;
  elo: number;
  xp: number;
  rank: TieredRankInfo;
}

export interface UserProfile {
  id: string;
  name: string;
  subjects: Record<McatSubject, SubjectProfile>;
  overallElo: number;
  overallRank: TieredRankInfo;
  totalXp: number;
  dailyStreak: number;
  lastPracticeDate: string | null; // ISO date string
  xpMultiplier: number;
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

// ─── XP & Streak Logic ──────────────────────────────────────────

const XP_PER_CORRECT = 10;
const XP_PER_INCORRECT = 3; // Participation XP

/** XP multiplier based on streak: +0.25x per 7-day milestone, max 2.0x */
export function getXpMultiplier(streak: number): number {
  const bonus = Math.floor(streak / 7) * 0.25;
  return Math.min(2.0, 1.0 + bonus);
}

/** Level derived from XP: level = floor(xp / 100) + 1 */
export function getLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

/** Check if crossing a level boundary */
export function checkLevelUp(oldXp: number, newXp: number): boolean {
  return getLevel(newXp) > getLevel(oldXp);
}

// ─── Profile Factory ─────────────────────────────────────────────

/** Create a fresh default profile */
export function createDefaultProfile(id: string = 'local', name: string = 'Uzair'): UserProfile {
  const subjects = {} as Record<McatSubject, SubjectProfile>;
  for (const s of MCAT_SUBJECTS) {
    subjects[s] = {
      subject: s,
      elo: DEFAULT_ELO,
      xp: 0,
      rank: getTieredRank(DEFAULT_ELO),
    };
  }

  const overallElo = DEFAULT_ELO;
  return {
    id,
    name,
    subjects,
    overallElo,
    overallRank: getTieredRank(overallElo),
    totalXp: 0,
    dailyStreak: 0,
    lastPracticeDate: null,
    xpMultiplier: 1.0,
  };
}

// ─── Session Processing ──────────────────────────────────────────

/**
 * Process a completed practice session and return updated profile + deltas.
 * This is the core engine that connects questions answered → ELO/XP changes.
 */
export function processSessionResults(
  profile: UserProfile,
  results: SessionResultInput[],
  totalAnsweredInSubject: number = 50 // Used for K-factor; default to mid-range
): ProcessedSessionResult {
  // Clone profile to avoid mutation
  const newProfile = structuredClone(profile);
  const oldOverallRank = getTieredRank(newProfile.overallElo);

  const eloChanges: Record<string, { topic: string; subject: McatSubject; eloDelta: number }> = {};
  let totalEloDelta = 0;
  let totalRawXp = 0;

  // Update streak
  const today = new Date().toISOString().split('T')[0];
  if (newProfile.lastPracticeDate) {
    const lastDate = new Date(newProfile.lastPracticeDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (newProfile.lastPracticeDate === today) {
      // Already practiced today, keep streak
    } else if (newProfile.lastPracticeDate === yesterdayStr) {
      // Practiced yesterday, increment streak
      newProfile.dailyStreak += 1;
    } else {
      // Streak broken
      newProfile.dailyStreak = 1;
    }
  } else {
    newProfile.dailyStreak = 1;
  }
  newProfile.lastPracticeDate = today;
  newProfile.xpMultiplier = getXpMultiplier(newProfile.dailyStreak);

  // Process each question result
  for (const result of results) {
    const subjectProfile = newProfile.subjects[result.subject];
    
    // Calculate ELO change
    const eloResult = calculateElo(
      subjectProfile.elo,
      result.questionDifficulty,
      result.isCorrect,
      totalAnsweredInSubject
    );
    
    subjectProfile.elo = eloResult.newUserElo;
    subjectProfile.rank = eloResult.tieredRank;

    // Track per-topic changes
    if (!eloChanges[result.topic]) {
      eloChanges[result.topic] = { topic: result.topic, subject: result.subject, eloDelta: 0 };
    }
    eloChanges[result.topic].eloDelta += eloResult.eloChange;
    totalEloDelta += eloResult.eloChange;

    // Award XP
    const baseXp = result.isCorrect ? XP_PER_CORRECT : XP_PER_INCORRECT;
    totalRawXp += baseXp;
  }

  // Apply multiplier to XP
  const xpGained = Math.round(totalRawXp * newProfile.xpMultiplier);
  const oldTotalXp = newProfile.totalXp;
  newProfile.totalXp += xpGained;

  // Distribute XP to subject
  const primarySubject = results[0]?.subject;
  if (primarySubject) {
    newProfile.subjects[primarySubject].xp += xpGained;
  }

  // Recalculate overall ELO (average of all subjects)
  const eloSum = MCAT_SUBJECTS.reduce((sum, s) => sum + newProfile.subjects[s].elo, 0);
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
