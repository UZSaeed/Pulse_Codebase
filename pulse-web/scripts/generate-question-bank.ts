/**
 * Batch question-bank filler.
 *
 * For every subject × domain × difficulty band, tops the DB up to a target
 * count. Math cells are filled from parameterized templates (free, always
 * mathematically sound); Reading & Writing cells fall back to the LLM with
 * official SAT snippets as few-shot context.
 *
 * Usage:
 *   npx tsx scripts/generate-question-bank.ts            # 20 questions per cell
 *   npx tsx scripts/generate-question-bank.ts --per-cell 40
 *   npx tsx scripts/generate-question-bank.ts --dry-run
 */

import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { prisma } from '../src/lib/prisma';
import { generateQuestions } from '../src/lib/ai';
import { buildTagsFromGeneratedQuestion } from '../src/lib/sat-tagging';
import {
  enumerateSupplyCells,
  resolveTarget,
  generateFromMathTemplates,
  mathTemplateQuestionToGenerated,
} from '../src/lib/question-generation';
import type { GeneratedQuestion } from '../src/lib/ai';
import type { Prisma } from '@prisma/client';

const args = process.argv.slice(2);
const perCellArg = args.indexOf('--per-cell');
const PER_CELL = perCellArg >= 0 ? Number(args[perCellArg + 1]) : 20;
const DRY_RUN = args.includes('--dry-run');
const LLM_BATCH = 5;

async function saveQuestion(
  question: GeneratedQuestion,
  extras: { generationType: string; templateId?: string; templateSeed?: number; chapterId: string; domain: string }
) {
  const tags = buildTagsFromGeneratedQuestion(question);
  await prisma.question.create({
    data: {
      subject: question.subject,
      domain: tags.domain ?? extras.domain,
      skill: tags.skill,
      topic: question.topic,
      chapterId: tags.chapterId ?? extras.chapterId,
      questionType: tags.questionType,
      answerFormat: tags.answerFormat,
      difficultyBand: tags.difficultyBand,
      difficultyTier: tags.difficultyTier,
      passage: question.passage ?? null,
      text: question.stem,
      choices: JSON.stringify(question.choices),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      distractorExplanations: JSON.stringify(question.distractorExplanations ?? {}),
      baseDifficulty: question.difficulty,
      tagsJson: tags.tags,
      graphSpec: question.graphSpec ? (question.graphSpec as unknown as Prisma.InputJsonValue) : undefined,
      templateId: extras.templateId,
      templateSeed: extras.templateSeed,
      generationType: extras.generationType,
      sourceKind: 'generated',
    },
  });
}

async function main() {
  const cells = enumerateSupplyCells();
  console.log(`Filling ${cells.length} cells to ${PER_CELL} questions each${DRY_RUN ? ' (dry run)' : ''}\n`);

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  let totalCreated = 0;

  for (const cell of cells) {
    const existing = await prisma.question.count({
      where: {
        subject: cell.subject,
        OR: [{ chapterId: cell.chapterId }, { domain: cell.domain }],
        difficultyBand: cell.band,
        correctAnswer: { not: null },
      },
    });

    const needed = Math.max(0, PER_CELL - existing);
    const label = `${cell.subject} / ${cell.domain} / ${cell.band}`;
    if (needed === 0) {
      console.log(`✓ ${label}: ${existing} on hand`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`… ${label}: would create ${needed}`);
      continue;
    }

    if (cell.subject === 'math') {
      const resolved = resolveTarget({
        subject: 'math',
        domain: cell.chapterId,
        band: cell.band,
        count: needed,
      });
      // Seed derived from the cell + current stock so reruns yield new variants.
      const seedBase = (existing + 1) * 7919 + cell.chapterId.length * 131 + cell.band.length;
      const templateQuestions = generateFromMathTemplates(resolved, seedBase);
      for (const templateQuestion of templateQuestions) {
        await saveQuestion(mathTemplateQuestionToGenerated(templateQuestion), {
          generationType: 'template',
          templateId: templateQuestion.templateId,
          templateSeed: templateQuestion.seed,
          chapterId: cell.chapterId,
          domain: cell.domain,
        });
        totalCreated += 1;
      }
      console.log(`+ ${label}: created ${templateQuestions.length} from templates`);
      continue;
    }

    if (!apiKey) {
      console.log(`✗ ${label}: needs ${needed}, but no LLM API key configured — skipped`);
      continue;
    }

    let created = 0;
    while (created < needed) {
      const batch = Math.min(LLM_BATCH, needed - created);
      try {
        const generated = await generateQuestions(apiKey, {
          subject: cell.subject,
          topic: cell.domain,
          targetDifficulty: cell.targetElo,
          count: batch,
        });
        for (const question of generated) {
          await saveQuestion(
            { ...question, difficulty: question.difficulty ?? cell.targetElo },
            { generationType: 'hallucinated', chapterId: cell.chapterId, domain: cell.domain }
          );
          created += 1;
        }
      } catch (error) {
        console.error(`✗ ${label}: LLM batch failed —`, error instanceof Error ? error.message : error);
        break;
      }
    }
    totalCreated += created;
    console.log(`+ ${label}: created ${created} via LLM`);
  }

  console.log(`\nDone. Created ${totalCreated} questions.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
