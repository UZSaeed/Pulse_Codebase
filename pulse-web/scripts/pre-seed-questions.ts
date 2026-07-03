/**
 * Pre-seed the question bank with deterministic math template questions.
 *
 * Run: npx tsx scripts/pre-seed-questions.ts
 *
 * This populates the DB with questions from parameterized templates so that
 * early users hit existing questions instead of triggering LLM generation.
 * Each template × seed combination produces a unique-but-mathematically-sound
 * question — no AI/LLM calls are involved.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  generateMathTemplateQuestions,
  type DifficultyBand,
} from '../src/lib/math-templates';
import { MCAT_CHAPTERS, type Chapter } from '../src/lib/chapters';
import type { SatSection } from '../src/lib/elo';
import { buildSatQuestionTags } from '../src/lib/sat-tagging';

const SEEDS_PER_TEMPLATE = 10;
const BANDS: DifficultyBand[] = ['easy', 'medium', 'hard'];
const BAND_ELO: Record<DifficultyBand, number> = { easy: 950, medium: 1300, hard: 1680 };

function createPrisma() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrisma();

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('DB connected.\n');
  } catch (e) {
    console.error('Cannot connect to DB. Is DATABASE_URL set?', e);
    process.exit(1);
  }

  const existingCount = await prisma.question.count();
  console.log(`Existing questions in DB: ${existingCount}`);

  const existingTemplates = await prisma.question.findMany({
    where: { generationType: 'template' },
    select: { templateId: true, templateSeed: true },
  });
  const seenKeys = new Set(existingTemplates.map(q => `${q.templateId}:${q.templateSeed}`));
  console.log(`Existing template questions: ${existingTemplates.length}\n`);

  let created = 0;
  let skipped = 0;

  const mathChapters = MCAT_CHAPTERS.math;

  for (const chapter of mathChapters) {
    for (const band of BANDS) {
      console.log(`Seeding: math > ${chapter.name} > ${band}`);

      for (let seedBase = 1; seedBase <= SEEDS_PER_TEMPLATE; seedBase++) {
        const seed = seedBase * 1000 + BAND_ELO[band];

        const questions = generateMathTemplateQuestions(
          { chapterId: chapter.id, band },
          50,
          seed
        );

        for (const q of questions) {
          const key = `${q.templateId}:${q.seed}`;
          if (seenKeys.has(key)) {
            skipped++;
            continue;
          }
          seenKeys.add(key);

          const tags = buildSatQuestionTags({
            subject: 'math',
            topic: q.topic,
            passage: null,
            stem: q.stem,
            difficulty: q.difficulty,
          });

          try {
            await prisma.question.create({
              data: {
                subject: 'math',
                domain: tags.domain ?? chapter.name,
                skill: tags.skill,
                topic: q.topic,
                chapterId: tags.chapterId ?? chapter.id,
                questionType: tags.questionType,
                answerFormat: 'multiple_choice',
                difficultyBand: q.difficultyBand,
                difficultyTier: tags.difficultyTier,
                passage: null,
                text: q.stem,
                choices: JSON.stringify(q.choices),
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                distractorExplanations: JSON.stringify(q.distractorExplanations),
                baseDifficulty: q.difficulty,
                tagsJson: tags.tags,
                graphSpec: q.graphSpec ? (q.graphSpec as unknown as Record<string, unknown>) : undefined,
                templateId: q.templateId,
                templateSeed: q.seed,
                generationType: 'template',
                sourceKind: 'generated',
              },
            });
            created++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('Unique constraint')) {
              skipped++;
            } else {
              console.error(`  Error creating question ${key}:`, msg);
            }
          }
        }
      }
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped (duplicates): ${skipped}`);
  console.log(`Total questions now: ${await prisma.question.count()}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
