/**
 * SAT adaptive rating system.
 *
 * The app keeps a separate proficiency ELO for each SAT section and domain.
 * Those ratings drive:
 * - which domains need attention next
 * - which difficulty bucket to serve (Bronze/Silver/Gold)
 * - progression feedback in the UI
 */

export const SAT_SECTIONS = ['reading_writing', 'math'] as const;
export type SatSection = (typeof SAT_SECTIONS)[number];

// Backward-compatible aliases so the existing app structure can be refactored
// incrementally without renaming every import at once.
export const MCAT_SUBJECTS = SAT_SECTIONS;
export type McatSubject = SatSection;

export const SUBJECT_LABELS: Record<SatSection, string> = {
  reading_writing: 'Reading & Writing',
  math: 'Math',
};

export const SAT_SECTION_SHORT_LABELS: Record<SatSection, string> = {
  reading_writing: 'RW',
  math: 'Math',
};

export const DEFAULT_ELO = 1000;

export const RANK_NAMES = ['Bronze', 'Silver', 'Gold'] as const;
export type RankName = (typeof RANK_NAMES)[number];

export const RANK_ICONS: Record<RankName, string> = {
  Bronze: 'B',
  Silver: 'S',
  Gold: 'G',
};

export const RANK_COLORS: Record<RankName, { gradient: string; text: string; shadow: string; bg: string }> = {
  Bronze: { gradient: 'from-amber-500 to-orange-400', text: 'text-white', shadow: 'shadow-amber-300/40', bg: 'bg-amber-50' },
  Silver: { gradient: 'from-slate-400 to-slate-500', text: 'text-white', shadow: 'shadow-slate-300/40', bg: 'bg-slate-50' },
  Gold: { gradient: 'from-yellow-400 to-amber-400', text: 'text-white', shadow: 'shadow-yellow-300/40', bg: 'bg-yellow-50' },
};

/**
 * Bronze maps to easier practice, Silver to medium, Gold to harder items.
 * The 9 subtiers create a visible sense of progress inside those bands.
 */
export const TIERED_RANKS: Array<{ rank: RankName; tier: number; minElo: number; maxElo: number }> = [
  { rank: 'Bronze' as RankName, tier: 1, minElo: 0, maxElo: 799 },
  { rank: 'Bronze' as RankName, tier: 2, minElo: 800, maxElo: 949 },
  { rank: 'Bronze' as RankName, tier: 3, minElo: 950, maxElo: 1099 },
  { rank: 'Silver' as RankName, tier: 1, minElo: 1100, maxElo: 1249 },
  { rank: 'Silver' as RankName, tier: 2, minElo: 1250, maxElo: 1399 },
  { rank: 'Silver' as RankName, tier: 3, minElo: 1400, maxElo: 1549 },
  { rank: 'Gold' as RankName, tier: 1, minElo: 1550, maxElo: 1699 },
  { rank: 'Gold' as RankName, tier: 2, minElo: 1700, maxElo: 1849 },
  { rank: 'Gold' as RankName, tier: 3, minElo: 1850, maxElo: Infinity },
];

export const TIER_NUMERALS: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };

export interface TieredRankInfo {
  rank: RankName;
  tier: number;
  tierNumeral: string;
  displayName: string;
  icon: string;
  colors: { gradient: string; text: string; shadow: string };
  currentElo: number;
  eloFloor: number;
  eloCeiling: number;
  eloToNextTier: number;
  progressInTier: number;
  difficultyLabel: 'Easy' | 'Medium' | 'Hard';
}

export function getDifficultyLabelForElo(elo: number): 'Easy' | 'Medium' | 'Hard' {
  const rank = getTieredRank(elo).rank;
  if (rank === 'Bronze') return 'Easy';
  if (rank === 'Silver') return 'Medium';
  return 'Hard';
}

export function getTieredRank(elo: number): TieredRankInfo {
  const clamped = Math.max(0, elo);

  let matched = TIERED_RANKS[0];
  for (const tier of TIERED_RANKS) {
    if (clamped >= tier.minElo && clamped <= tier.maxElo) {
      matched = tier;
      break;
    }
  }

  const tierRange = matched.maxElo === Infinity ? 200 : matched.maxElo - matched.minElo + 1;
  const progressInTier =
    matched.maxElo === Infinity
      ? Math.min(1, (clamped - matched.minElo) / 200)
      : (clamped - matched.minElo) / tierRange;
  const eloToNextTier = matched.maxElo === Infinity ? 0 : matched.maxElo - clamped + 1;

  return {
    rank: matched.rank,
    tier: matched.tier,
    tierNumeral: TIER_NUMERALS[matched.tier],
    displayName: `${matched.rank} ${matched.tier}`,
    icon: RANK_ICONS[matched.rank],
    colors: RANK_COLORS[matched.rank],
    currentElo: clamped,
    eloFloor: matched.minElo,
    eloCeiling: matched.maxElo,
    eloToNextTier,
    progressInTier: Math.min(1, Math.max(0, progressInTier)),
    difficultyLabel: matched.rank === 'Bronze' ? 'Easy' : matched.rank === 'Silver' ? 'Medium' : 'Hard',
  };
}

export function getRankForElo(elo: number): RankName {
  return getTieredRank(elo).rank;
}

function getKFactor(totalAnswered: number): number {
  if (totalAnswered < 20) return 36;
  if (totalAnswered < 75) return 20;
  return 12;
}

function expectedScore(userElo: number, questionElo: number): number {
  return 1 / (1 + Math.pow(10, (questionElo - userElo) / 400));
}

export interface EloUpdateResult {
  newUserElo: number;
  newQuestionElo: number;
  eloChange: number;
  rank: RankName;
  tieredRank: TieredRankInfo;
}

export function satScoreToElo(satScore: number): number {
  const clamped = Math.max(200, Math.min(800, satScore));
  return Math.round(600 + ((clamped - 200) / 600) * 1200);
}

export function calculateElo(
  userElo: number,
  questionElo: number,
  isCorrect: boolean,
  totalAnswered: number
): EloUpdateResult {
  const k = getKFactor(totalAnswered);
  const expected = expectedScore(userElo, questionElo);
  const actual = isCorrect ? 1 : 0;
  const delta = Math.round(k * (actual - expected));

  const newUserElo = Math.max(0, userElo + delta);
  const newQuestionElo = Math.max(0, questionElo - Math.round(delta * 0.35));
  const tieredRank = getTieredRank(newUserElo);

  return {
    newUserElo,
    newQuestionElo,
    eloChange: delta,
    rank: tieredRank.rank,
    tieredRank,
  };
}
