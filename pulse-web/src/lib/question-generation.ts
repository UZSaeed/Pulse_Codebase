/**
 * Question generation algorithm.
 *
 * Produces Easy / Medium / Hard questions for every subject × domain by
 * layering three sources, cheapest first:
 *
 *   1. Math templates  — parameterized questions with placeholder numbers
 *      that are computed and substituted deterministically (no LLM, math
 *      guaranteed sound; graphs come from function-plot, not AI images).
 *   2. Existing DB questions — anything already generated and stored.
 *   3. LLM generation  — only for what the first two layers cannot cover
 *      (chiefly Reading & Writing), few-shot prompted with official
 *      SAT question-bank snippets for the same domain + difficulty.
 */

import type { McatSubject } from './elo';
import { getDifficultyLabelForElo } from './elo';
import { MCAT_CHAPTERS, type Chapter } from './chapters';
import type { GeneratedQuestion } from './ai';
import {
  generateMathTemplateQuestions,
  type DifficultyBand,
  type MathTemplateQuestion,
} from './math-templates';

export const DIFFICULTY_BANDS: DifficultyBand[] = ['easy', 'medium', 'hard'];

/** Anchor ELO used when a band is requested without a specific target rating. */
export const BAND_TARGET_ELO: Record<DifficultyBand, number> = {
  easy: 950,
  medium: 1300,
  hard: 1680,
};

export function eloToBand(elo: number): DifficultyBand {
  return getDifficultyLabelForElo(elo).toLowerCase() as DifficultyBand;
}

export interface GenerationTarget {
  subject: McatSubject;
  /** Chapter/domain name (e.g. "Algebra") or chapter id (e.g. "math-algebra"). */
  domain?: string;
  /** Specific skill/topic within the domain (e.g. "Linear Functions"). */
  topic?: string;
  band?: DifficultyBand;
  targetElo?: number;
  count: number;
}

export interface ResolvedTarget {
  subject: McatSubject;
  chapter: Chapter | null;
  topic: string | null;
  band: DifficultyBand;
  targetElo: number;
  count: number;
}

export function resolveTarget(target: GenerationTarget): ResolvedTarget {
  const band = target.band ?? (target.targetElo != null ? eloToBand(target.targetElo) : 'medium');
  const targetElo = target.targetElo ?? BAND_TARGET_ELO[band];

  const query = target.domain?.toLowerCase();
  const topicQuery = target.topic?.toLowerCase();
  let chapter: Chapter | null = null;
  let topic: string | null = null;

  for (const candidate of MCAT_CHAPTERS[target.subject]) {
    if (query && (candidate.id.toLowerCase() === query || candidate.name.toLowerCase() === query)) {
      chapter = candidate;
    }
    const matchedTopic = candidate.topics.find((t) => t.toLowerCase() === topicQuery || t.toLowerCase() === query);
    if (matchedTopic) {
      chapter ??= candidate;
      topic = matchedTopic;
    }
  }

  return { subject: target.subject, chapter, topic, band, targetElo, count: target.count };
}

export function mathTemplateQuestionToGenerated(question: MathTemplateQuestion): GeneratedQuestion {
  return {
    subject: 'math',
    topic: question.topic,
    passage: null,
    stem: question.stem,
    choices: question.choices,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    distractorExplanations: question.distractorExplanations,
    graphSpec: question.graphSpec ?? null,
    difficulty: question.difficulty,
  };
}

/**
 * Layer 1: instantiate math templates for the target. Falls back from
 * topic+band → domain+band → domain-wide so a thin topic never blocks supply.
 */
export function generateFromMathTemplates(resolved: ResolvedTarget, seedBase?: number): MathTemplateQuestion[] {
  if (resolved.subject !== 'math' || resolved.count <= 0) return [];
  const seed = seedBase ?? Math.floor(Math.random() * 1_000_000);

  const attempts = [
    { topic: resolved.topic ?? undefined, chapterId: resolved.chapter?.id, band: resolved.band },
    { chapterId: resolved.chapter?.id, band: resolved.band },
    { topic: resolved.topic ?? undefined, chapterId: resolved.chapter?.id, band: undefined },
    { chapterId: resolved.chapter?.id, band: undefined },
    { band: resolved.band },
  ];

  for (const filter of attempts) {
    const questions = generateMathTemplateQuestions(filter, resolved.count, seed);
    if (questions.length >= resolved.count) return questions;
  }
  return generateMathTemplateQuestions({}, resolved.count, seed);
}

export interface SupplyPlanCell {
  subject: McatSubject;
  domain: string;
  chapterId: string;
  band: DifficultyBand;
  targetElo: number;
}

/** Every subject × domain × difficulty cell the bank must keep stocked. */
export function enumerateSupplyCells(): SupplyPlanCell[] {
  const cells: SupplyPlanCell[] = [];
  for (const subject of Object.keys(MCAT_CHAPTERS) as McatSubject[]) {
    for (const chapter of MCAT_CHAPTERS[subject]) {
      for (const band of DIFFICULTY_BANDS) {
        cells.push({
          subject,
          domain: chapter.name,
          chapterId: chapter.id,
          band,
          targetElo: BAND_TARGET_ELO[band],
        });
      }
    }
  }
  return cells;
}
