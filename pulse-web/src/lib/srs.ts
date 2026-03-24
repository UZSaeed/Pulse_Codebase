/**
 * SM-2 Spaced Repetition Algorithm for Pulse MCAT Prep
 *
 * Implements the SuperMemo SM-2 algorithm to schedule review intervals.
 * Each micro-concept (tied to a question) maintains:
 *   - repetitions: number of consecutive correct recalls
 *   - easeFactor: reflects how "easy" the item is (min 1.3)
 *   - interval: days until next review
 *
 * After each answer the algorithm updates these values and returns
 * the next review date.
 */

export interface SrsState {
  repetitions: number;
  easeFactor: number;
  interval: number; // in days
}

export interface SrsUpdateResult extends SrsState {
  nextReviewDate: Date;
}

/**
 * Quality grade mapping for SM-2 (0-5 scale):
 *   0 - Complete blackout
 *   1 - Incorrect, but upon seeing the answer it felt familiar
 *   2 - Incorrect, but the answer seemed easy to recall afterward
 *   3 - Correct with serious difficulty
 *   4 - Correct after hesitation
 *   5 - Perfect response
 *
 * For Pulse we simplify to binary correct/incorrect plus optional confidence:
 *   - Incorrect  → quality 1
 *   - Correct    → quality 4 (default) or 5 if answered quickly
 */
export function mapToQuality(isCorrect: boolean, timeTakenMs?: number): number {
  if (!isCorrect) return 1;
  // If answered in under 30 seconds, treat as "perfect recall"
  if (timeTakenMs !== undefined && timeTakenMs < 30_000) return 5;
  return 4;
}

/**
 * Core SM-2 calculation.
 *
 * @param prev     Previous SRS state for this item
 * @param quality  Quality of response (0-5)
 * @returns        Updated SRS state including the next review date
 */
export function calculateSrs(
  prev: SrsState,
  quality: number
): SrsUpdateResult {
  let { repetitions, easeFactor, interval } = prev;

  if (quality < 3) {
    // Failed recall — reset repetitions but keep ease factor
    repetitions = 0;
    interval = 1; // review again tomorrow
  } else {
    // Successful recall — advance interval
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor using the SM-2 formula
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Enforce minimum ease factor of 1.3
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Calculate the next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetitions,
    easeFactor: Math.round(easeFactor * 100) / 100, // round to 2 decimal places
    interval,
    nextReviewDate,
  };
}

/** Default SRS state for a brand-new item */
export function defaultSrsState(): SrsState {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
  };
}
