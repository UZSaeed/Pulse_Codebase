import type { GeneratedQuestion } from './ai';
import { getDifficultyLabelForElo, getTieredRank, type McatSubject } from './elo';
import { MCAT_CHAPTERS } from './chapters';
import type { OfficialSatSnippet } from './sat-question-bank';

export interface SatQuestionTags {
  domain: string | null;
  skill: string | null;
  topic: string | null;
  chapterId: string | null;
  questionType: string;
  answerFormat: 'multiple_choice';
  difficultyBand: 'easy' | 'medium' | 'hard';
  difficultyTier: string;
  tags: string[];
}

function findDomainByTopic(subject: McatSubject, topic?: string | null) {
  if (!topic) return null;
  for (const chapter of MCAT_CHAPTERS[subject]) {
    if (chapter.topics.some((candidate) => candidate.toLowerCase() === topic.toLowerCase())) {
      return { domain: chapter.name, chapterId: chapter.id };
    }
  }
  return null;
}

export function inferQuestionType(input: {
  subject: McatSubject;
  topic?: string | null;
  passage?: string | null;
  stem: string;
}): string {
  const stem = input.stem.toLowerCase();
  if (input.subject === 'reading_writing') {
    if (input.passage) {
      if (stem.includes('according to the text') || stem.includes('based on the text')) return 'short_passage';
      if (stem.includes('table') || stem.includes('graph') || stem.includes('data')) return 'informational_graphic';
      return 'reading_passage';
    }
    if (stem.includes('which choice completes') || stem.includes('revises') || stem.includes('sentence')) {
      return 'revision_editing';
    }
    return 'sentence_editing';
  }

  if (stem.includes('probability')) return 'probability';
  if (stem.includes('graph') || stem.includes('table') || stem.includes('scatterplot')) return 'data_analysis';
  if (stem.includes('system of linear equations')) return 'systems';
  if (stem.includes('equation') || stem.includes('value of x')) return 'equation_solver';
  if (stem.includes('rectangle') || stem.includes('triangle') || stem.includes('circle')) return 'geometry';
  return 'math_word_problem';
}

export function buildSatQuestionTags(input: {
  subject: McatSubject;
  topic?: string | null;
  passage?: string | null;
  stem: string;
  difficulty: number;
}): SatQuestionTags {
  const domainMatch = findDomainByTopic(input.subject, input.topic);
  const difficultyBand = getDifficultyLabelForElo(input.difficulty).toLowerCase() as 'easy' | 'medium' | 'hard';
  const tier = getTieredRank(input.difficulty);
  const questionType = inferQuestionType(input);
  const tags = [
    input.subject,
    domainMatch?.domain ?? 'adaptive',
    input.topic ?? 'adaptive',
    questionType,
    difficultyBand,
    tier.displayName.toLowerCase().replace(/\s+/g, '_'),
  ];

  return {
    domain: domainMatch?.domain ?? null,
    skill: input.topic ?? null,
    topic: input.topic ?? null,
    chapterId: domainMatch?.chapterId ?? null,
    questionType,
    answerFormat: 'multiple_choice',
    difficultyBand,
    difficultyTier: tier.displayName,
    tags,
  };
}

export function buildTagsFromOfficialSnippet(snippet: OfficialSatSnippet): SatQuestionTags {
  const difficultyTier =
    snippet.difficulty === 'easy' ? 'Bronze 2' : snippet.difficulty === 'medium' ? 'Silver 2' : 'Gold 2';
  const questionType = inferQuestionType({
    subject: snippet.section,
    topic: snippet.domain,
    passage: snippet.prompt.length > 220 ? snippet.prompt : null,
    stem: snippet.prompt,
  });

  return {
    domain: snippet.domain,
    skill: snippet.domain,
    topic: snippet.domain,
    chapterId: findDomainByTopic(snippet.section, snippet.domain)?.chapterId ?? null,
    questionType,
    answerFormat: 'multiple_choice',
    difficultyBand: snippet.difficulty,
    difficultyTier,
    tags: [snippet.section, snippet.domain, snippet.difficulty, questionType, 'official_bank'],
  };
}

export function buildTagsFromGeneratedQuestion(question: GeneratedQuestion): SatQuestionTags {
  return buildSatQuestionTags({
    subject: question.subject,
    topic: question.topic,
    passage: question.passage,
    stem: question.stem,
    difficulty: question.difficulty,
  });
}

export function getNextQuestionEligibleAt(args: {
  timesSeen: number;
  isCorrect: boolean;
  nextReviewDate?: Date | null;
}): Date {
  if (args.nextReviewDate) return args.nextReviewDate;

  const now = new Date();
  const days =
    args.timesSeen <= 1 ? 2 :
    args.isCorrect ? Math.min(14, 2 + args.timesSeen * 2) :
    Math.min(7, 1 + args.timesSeen);
  now.setDate(now.getDate() + days);
  return now;
}
