/**
 * ELO Rating System for Spike MCAT Prep
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

// ─── Tiered Rank System ──────────────────────────────────────────

export const RANK_NAMES = ['Iron', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;
export type RankName = (typeof RANK_NAMES)[number];

export const RANK_ICONS: Record<RankName, string> = {
  Iron: '🪨',
  Bronze: '🥉',
  Silver: '🥈',
  Gold: '🥇',
  Diamond: '💎',
};

export const RANK_COLORS: Record<RankName, { gradient: string; text: string; shadow: string }> = {
  Iron: { gradient: 'from-zinc-500 to-zinc-700', text: 'text-zinc-300', shadow: 'shadow-zinc-500/50' },
  Bronze: { gradient: 'from-orange-700 to-yellow-900', text: 'text-amber-200', shadow: 'shadow-orange-700/50' },
  Silver: { gradient: 'from-slate-200 to-slate-400', text: 'text-navy-900', shadow: 'shadow-slate-300/60' },
  Gold: { gradient: 'from-yellow-300 to-amber-500', text: 'text-navy-900', shadow: 'shadow-yellow-400/60' },
  Diamond: { gradient: 'from-cyan-300 to-blue-500', text: 'text-navy-900', shadow: 'shadow-cyan-400/60' },
};

/**
 * 15-tier rank thresholds: 3 sub-tiers per rank.
 * Iron I (0-399), Iron II (400-799), Iron III (800-1199)
 * Bronze I (1200-1299), Bronze II (1300-1399), Bronze III (1400-1499)
 * Silver I (1500-1566), Silver II (1567-1633), Silver III (1634-1699)
 * Gold I (1700-1766), Gold II (1767-1833), Gold III (1834-1899)
 * Diamond I (1900-1966), Diamond II (1967-2033), Diamond III (2034+)
 */
export const TIERED_RANKS = [
  { rank: 'Iron' as RankName, tier: 1, minElo: 0, maxElo: 399 },
  { rank: 'Iron' as RankName, tier: 2, minElo: 400, maxElo: 799 },
  { rank: 'Iron' as RankName, tier: 3, minElo: 800, maxElo: 1199 },
  { rank: 'Bronze' as RankName, tier: 1, minElo: 1200, maxElo: 1299 },
  { rank: 'Bronze' as RankName, tier: 2, minElo: 1300, maxElo: 1399 },
  { rank: 'Bronze' as RankName, tier: 3, minElo: 1400, maxElo: 1499 },
  { rank: 'Silver' as RankName, tier: 1, minElo: 1500, maxElo: 1566 },
  { rank: 'Silver' as RankName, tier: 2, minElo: 1567, maxElo: 1633 },
  { rank: 'Silver' as RankName, tier: 3, minElo: 1634, maxElo: 1699 },
  { rank: 'Gold' as RankName, tier: 1, minElo: 1700, maxElo: 1766 },
  { rank: 'Gold' as RankName, tier: 2, minElo: 1767, maxElo: 1833 },
  { rank: 'Gold' as RankName, tier: 3, minElo: 1834, maxElo: 1899 },
  { rank: 'Diamond' as RankName, tier: 1, minElo: 1900, maxElo: 1966 },
  { rank: 'Diamond' as RankName, tier: 2, minElo: 1967, maxElo: 2033 },
  { rank: 'Diamond' as RankName, tier: 3, minElo: 2034, maxElo: Infinity },
];

export const TIER_NUMERALS: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };

export interface TieredRankInfo {
  rank: RankName;
  tier: number;
  tierNumeral: string;
  displayName: string; // e.g. "Silver II"
  icon: string;
  colors: { gradient: string; text: string; shadow: string };
  currentElo: number;
  eloFloor: number;      // min ELO for this tier
  eloCeiling: number;    // max ELO for this tier 
  eloToNextTier: number; // ELO needed to reach next tier
  progressInTier: number; // 0-1 progress through current tier
}

/** Get full tiered rank info for a given ELO */
export function getTieredRank(elo: number): TieredRankInfo {
  const clamped = Math.max(0, elo);
  
  let matched = TIERED_RANKS[0];
  for (const t of TIERED_RANKS) {
    if (clamped >= t.minElo && clamped <= t.maxElo) {
      matched = t;
      break;
    }
  }

  const tierRange = matched.maxElo === Infinity ? 200 : (matched.maxElo - matched.minElo + 1);
  const progressInTier = matched.maxElo === Infinity 
    ? Math.min(1, (clamped - matched.minElo) / 200) 
    : (clamped - matched.minElo) / tierRange;
  const eloToNextTier = matched.maxElo === Infinity ? 0 : (matched.maxElo - clamped + 1);

  return {
    rank: matched.rank,
    tier: matched.tier,
    tierNumeral: TIER_NUMERALS[matched.tier],
    displayName: `${matched.rank} ${TIER_NUMERALS[matched.tier]}`,
    icon: RANK_ICONS[matched.rank],
    colors: RANK_COLORS[matched.rank],
    currentElo: clamped,
    eloFloor: matched.minElo,
    eloCeiling: matched.maxElo,
    eloToNextTier,
    progressInTier: Math.min(1, Math.max(0, progressInTier)),
  };
}

/** Backwards-compatible: derive rank name from ELO */
export function getRankForElo(elo: number): RankName {
  return getTieredRank(elo).rank;
}

// ─── ELO Calculation ─────────────────────────────────────────────

/**
 * K-factor based on how many questions the user has answered.
 * - First 30 answers: K=40 (placement / calibration)
 * - 31-100 answers: K=20 (settling)
 * - 100+ answers: K=10 (stable)
 */
function getKFactor(totalAnswered: number): number {
  if (totalAnswered < 30) return 40;
  if (totalAnswered < 100) return 20;
  return 10;
}

/** Expected score using the standard logistic ELO formula */
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

/**
 * Compute post-answer ELO updates for both user and question.
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
  const newQuestionElo = Math.max(0, questionElo - Math.round(delta * 0.5));

  const tieredRank = getTieredRank(newUserElo);

  return {
    newUserElo,
    newQuestionElo,
    eloChange: delta,
    rank: tieredRank.rank,
    tieredRank,
  };
}
