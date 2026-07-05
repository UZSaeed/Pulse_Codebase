/**
 * Practice-test → rating calibration.
 *
 * A full-length practice test is the strongest signal we get about a
 * student's real standing, so its section scores and per-domain breakdown
 * are blended into the drill-derived ELO ratings:
 *
 *  - Section score (200–800) maps linearly onto the Bronze→Gold ELO scale.
 *  - Domain accuracy shifts that section estimate up or down, so a 650
 *    Math with 40% on Geometry still flags Geometry as behind.
 *  - New rating = weighted blend of current drill ELO and test estimate.
 */

import { MCAT_CHAPTERS } from './chapters';
import type { McatSubject } from './elo';

/** Test-day evidence gets this share of the blended rating. */
const TEST_WEIGHT = 0.4;
const MIN_ELO = 400;
const MAX_ELO = 2000;

export interface DomainBreakdownEntry {
  correct: number;
  total: number;
}

export type DomainBreakdown = Record<string, DomainBreakdownEntry>; // keyed by chapterId

/**
 * Map an SAT section score (200–800) onto the app's ELO scale.
 * 200 → 600 (Bronze floor territory), 500 → 1300 (Silver), 800 → 2000 (deep Gold).
 * Gold's 1550 floor corresponds to roughly a 610 section score.
 */
export function sectionScoreToElo(score: number): number {
  const clamped = Math.max(200, Math.min(800, score));
  return Math.round(600 + ((clamped - 200) / 600) * 1400);
}

/**
 * Estimate a domain's ELO from the section score plus that domain's accuracy.
 * Accuracy at the section-typical 70% keeps the section estimate; each
 * percentage point above/below moves the estimate ~8 ELO.
 */
export function domainAccuracyToElo(sectionScore: number, accuracy: number): number {
  const sectionElo = sectionScoreToElo(sectionScore);
  const shifted = sectionElo + (Math.max(0, Math.min(1, accuracy)) - 0.7) * 800;
  return Math.round(Math.max(MIN_ELO, Math.min(MAX_ELO, shifted)));
}

export function blendElo(currentElo: number, testEstimate: number, weight: number = TEST_WEIGHT): number {
  return Math.round(currentElo * (1 - weight) + testEstimate * weight);
}

export interface CalibrationInput {
  readingWritingScore: number;
  mathScore: number;
  domainBreakdown?: DomainBreakdown | null;
  currentSubjectElos: Record<McatSubject, number>;
  /** Current topic ELOs, keyed subject → topic name. */
  currentTopicElos: Record<McatSubject, Record<string, number>>;
}

export interface CalibrationResult {
  subjectElos: Record<McatSubject, number>;
  /** Only topics whose domain had breakdown data (or whole-section shifts). */
  topicElos: Record<McatSubject, Record<string, number>>;
}

/**
 * Compute the post-test ratings. Domains with logged breakdowns are
 * calibrated from their own accuracy; domains without data drift toward the
 * section-level estimate at half strength (weaker evidence).
 */
export function calibrateFromPracticeTest(input: CalibrationInput): CalibrationResult {
  const sectionScores: Record<McatSubject, number> = {
    reading_writing: input.readingWritingScore,
    math: input.mathScore,
  };

  const subjectElos = {} as CalibrationResult['subjectElos'];
  const topicElos = { reading_writing: {}, math: {} } as CalibrationResult['topicElos'];

  for (const subject of Object.keys(sectionScores) as McatSubject[]) {
    const score = sectionScores[subject];
    const sectionEstimate = sectionScoreToElo(score);
    subjectElos[subject] = blendElo(input.currentSubjectElos[subject], sectionEstimate);

    for (const chapter of MCAT_CHAPTERS[subject]) {
      const breakdown = input.domainBreakdown?.[chapter.id];
      const hasBreakdown = breakdown != null && breakdown.total > 0;
      const domainEstimate = hasBreakdown
        ? domainAccuracyToElo(score, breakdown.correct / breakdown.total)
        : sectionEstimate;
      const weight = hasBreakdown ? TEST_WEIGHT : TEST_WEIGHT / 2;

      for (const topic of chapter.topics) {
        const current = input.currentTopicElos[subject]?.[topic] ?? 1000;
        topicElos[subject][topic] = blendElo(current, domainEstimate, weight);
      }
    }
  }

  return { subjectElos, topicElos };
}
