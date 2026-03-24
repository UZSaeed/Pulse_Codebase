/**
 * ELO Rating System for Pulse MCAT Prep
 * 
 * Inspired by competitive matchmaking (chess / tactical shooters):
 *   - Each user has an ELO per MCAT subject.
 *   - Each question has a base difficulty expressed as an ELO.
 *   - After answering, both the user ability and the question difficulty are updated.
 *   - K-factor scales with the user's number of attempts so that early answers
 *     cause larger swings (placement phase) and ratings stabilize over time.
 */

export const MCAT_SUBJECTS = [
  'chem_phys',
  'cars',
  'bio_biochem',
  'psych_soc',
] as const;

export type McatSubject = (typeof MCAT_SUBJECTS)[number];

export const SUBJECT_LABELS: Record<McatSubject, string> = {
  chem_phys: 'Chem/Phys',
  cars: 'CARS',
  bio_biochem: 'Bio/Biochem',
  psych_soc: 'Psych/Soc',
};

/** Default starting ELO for a brand-new user or question */
export const DEFAULT_ELO = 1500;

/** Rank thresholds mapped to ELO ranges */
export const RANK_THRESHOLDS = [
  { name: 'Iron', minElo: 0, maxElo: 1199 },
  { name: 'Bronze', minElo: 1200, maxElo: 1399 },
  { name: 'Silver', minElo: 1400, maxElo: 1599 },
  { name: 'Gold', minElo: 1600, maxElo: 1799 },
  { name: 'Diamond', minElo: 1800, maxElo: Infinity },
] as const;

export type RankName = (typeof RANK_THRESHOLDS)[number]['name'];

/**
 * Determine the K-factor based on how many questions the user has answered.
 * 
 * - First 30 answers: K=40 (placement / calibration)
 * - 31-100 answers: K=20 (settling)
 * - 100+ answers: K=10 (stable)
 */
function getKFactor(totalAnswered: number): number {
  if (totalAnswered < 30) return 40;
  if (totalAnswered < 100) return 20;
  return 10;
}

/**
 * Calculate the expected score (probability of a correct answer)
 * using the standard logistic ELO formula.
 */
function expectedScore(userElo: number, questionElo: number): number {
  return 1 / (1 + Math.pow(10, (questionElo - userElo) / 400));
}

export interface EloUpdateResult {
  newUserElo: number;
  newQuestionElo: number;
  eloChange: number;
  rank: RankName;
}

/**
 * Compute post-answer ELO updates for both user and question.
 *
 * @param userElo       Current user ELO for the subject
 * @param questionElo   Current question difficulty ELO
 * @param isCorrect     Whether the user answered correctly
 * @param totalAnswered Total questions the user has answered in this subject
 */
export function calculateElo(
  userElo: number,
  questionElo: number,
  isCorrect: boolean,
  totalAnswered: number
): EloUpdateResult {
  const K = getKFactor(totalAnswered);
  const expected = expectedScore(userElo, questionElo);
  const actual = isCorrect ? 1 : 0;

  const delta = Math.round(K * (actual - expected));

  const newUserElo = Math.max(0, userElo + delta);
  // Question difficulty moves in the opposite direction (less aggressively)
  const newQuestionElo = Math.max(0, questionElo - Math.round(delta * 0.5));

  const rank = getRankForElo(newUserElo);

  return {
    newUserElo,
    newQuestionElo,
    eloChange: delta,
    rank,
  };
}

/** Derive the rank name from an ELO value */
export function getRankForElo(elo: number): RankName {
  for (const tier of RANK_THRESHOLDS) {
    if (elo >= tier.minElo && elo <= tier.maxElo) {
      return tier.name;
    }
  }
  return 'Iron';
}
