import { prisma } from '../src/lib/prisma';
import officialSnippets from '../src/data/sat-official-snippets.json';
import { buildTagsFromOfficialSnippet } from '../src/lib/sat-tagging';
import type { OfficialSatSnippet } from '../src/lib/sat-question-bank';

async function main() {
  const snippets = officialSnippets as OfficialSatSnippet[];
  let imported = 0;
  let skipped = 0;

  for (const snippet of snippets) {
    const existing = await prisma.question.findFirst({
      where: {
        sourceKind: 'official_import',
        sourceReferenceId: snippet.sourceId,
        sourceReferencePdf: snippet.sourcePdf,
        sourceReferencePage: snippet.pageNumber,
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const tags = buildTagsFromOfficialSnippet(snippet);

    await prisma.question.create({
      data: {
        subject: snippet.section,
        domain: tags.domain,
        skill: tags.skill,
        topic: tags.topic,
        chapterId: tags.chapterId,
        questionType: tags.questionType,
        answerFormat: tags.answerFormat,
        difficultyBand: tags.difficultyBand,
        difficultyTier: tags.difficultyTier,
        text: snippet.prompt,
        choices: JSON.stringify(snippet.choices),
        correctAnswer: null,
        explanation:
          'Imported official SAT question-bank snippet. Answer key not yet attached; use as centralized reference and generation grounding until keyed.',
        distractorExplanations: JSON.stringify({}),
        baseDifficulty:
          snippet.difficulty === 'easy' ? 1000 : snippet.difficulty === 'medium' ? 1350 : 1700,
        tagsJson: {
          tags: tags.tags,
          usableAsPractice: snippet.usableAsPractice,
          rawChoiceCount: snippet.rawChoiceCount,
        },
        generationType: 'official_bank',
        sourceKind: 'official_import',
        sourceReferenceId: snippet.sourceId,
        sourceReferencePdf: snippet.sourcePdf,
        sourceReferencePage: snippet.pageNumber,
      },
    });

    imported += 1;
  }

  console.log(`Imported ${imported} official SAT snippets; skipped ${skipped} already-present rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
