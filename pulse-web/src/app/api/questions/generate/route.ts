import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions, selectModelTier, type GeneratedQuestion } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import type { McatSubject } from '@/lib/elo';
import { getFallbackQuestions, getOfficialSatSnippets } from '@/lib/sat-question-bank';
import { buildTagsFromGeneratedQuestion } from '@/lib/sat-tagging';
import { getCurrentUser } from '@/lib/auth';
import type { DifficultyBand, GraphSpec } from '@/lib/math-templates';
import {
  resolveTarget,
  generateFromMathTemplates,
  mathTemplateQuestionToGenerated,
} from '@/lib/question-generation';
import type { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const {
      subject,
      domain,
      topic,
      difficultyBand,
      targetDifficulty = 1000,
      count = 1,
      tokensUsedThisMonth = 0,
      monthlyTokenBudget = 500_000,
    } = body as {
      subject: McatSubject;
      domain?: string;
      topic?: string;
      difficultyBand?: DifficultyBand;
      targetDifficulty?: number;
      count?: number;
      tokensUsedThisMonth?: number;
      monthlyTokenBudget?: number;
    };

    const resolved = resolveTarget({
      subject,
      domain,
      topic,
      band: difficultyBand,
      targetElo: targetDifficulty,
      count,
    });

    const modelTier = selectModelTier(tokensUsedThisMonth, monthlyTokenBudget);
    const now = new Date();

    // The DB can be unavailable in local dev; question serving should survive that.
    const safeDb = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await operation();
      } catch (dbError) {
        console.warn('[sat/generate] DB unavailable, continuing without persistence:', dbError);
        return fallback;
      }
    };

    const blockedQuestionIds = user
      ? (
          await safeDb(
            () =>
              prisma.userQuestionState.findMany({
                where: { userId: user.id, nextEligibleAt: { gt: now } },
                select: { questionId: true },
              }),
            []
          )
        ).map((state) => state.questionId)
      : [];

    const markExposure = async (questionIds: string[]) => {
      if (!user || questionIds.length === 0) return;
      const nextEligibleAt = new Date();
      nextEligibleAt.setDate(nextEligibleAt.getDate() + 1);

      for (const questionId of questionIds) {
        await safeDb(
          () =>
            prisma.userQuestionState.upsert({
              where: { userId_questionId: { userId: user.id, questionId } },
              update: {
                lastSeenAt: now,
                timesSeen: { increment: 1 },
                nextEligibleAt: { set: nextEligibleAt },
              },
              create: { userId: user.id, questionId, timesSeen: 1, nextEligibleAt },
            }),
          null
        );
      }
    };

    const persistQuestion = async (
      question: GeneratedQuestion,
      extras: {
        generationType: string;
        sourceKind: string;
        templateId?: string;
        templateSeed?: number;
        sourceReferenceId?: string;
        sourceReferencePdf?: string;
        sourceReferencePage?: number;
      }
    ): Promise<string | null> => {
      const tags = buildTagsFromGeneratedQuestion(question);
      const created = await safeDb(
        () =>
          prisma.question.create({
            data: {
              subject: question.subject,
              domain: tags.domain ?? resolved.chapter?.name ?? null,
              skill: tags.skill,
              topic: question.topic,
              chapterId: tags.chapterId ?? resolved.chapter?.id ?? null,
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
              sourceKind: extras.sourceKind,
              sourceReferenceId: extras.sourceReferenceId,
              sourceReferencePdf: extras.sourceReferencePdf,
              sourceReferencePage: extras.sourceReferencePage,
            },
          }),
        null
      );
      return created?.id ?? null;
    };

    // Layer 1: existing DB questions matching subject/domain/topic/band.
    const existingQuestions = await safeDb(
      () =>
        prisma.question.findMany({
          where: {
            subject,
            ...(resolved.chapter ? { OR: [{ domain: resolved.chapter.name }, { chapterId: resolved.chapter.id }] } : {}),
            ...(resolved.topic ? { topic: resolved.topic } : {}),
            difficultyBand: resolved.band,
            correctAnswer: { not: null },
            ...(blockedQuestionIds.length > 0 ? { id: { notIn: blockedQuestionIds } } : {}),
          },
          take: count,
          orderBy: [{ updatedAt: 'asc' }, { createdAt: 'desc' }],
        }),
      []
    );

    if (existingQuestions.length >= count) {
      await markExposure(existingQuestions.map((question) => question.id));
      const formatted = existingQuestions.map((question) => ({
        id: question.id,
        subject: question.subject as McatSubject,
        topic: question.topic || topic || 'Adaptive SAT',
        passage: question.passage,
        stem: question.text,
        choices: question.choices ? JSON.parse(question.choices) : [],
        correctAnswer: question.correctAnswer || 'A',
        explanation: question.explanation,
        distractorExplanations: question.distractorExplanations ? JSON.parse(question.distractorExplanations) : {},
        graphSpec: (question.graphSpec as unknown as GraphSpec | null) ?? null,
        difficulty: question.baseDifficulty,
      }));
      return NextResponse.json({ question: formatted[0], questions: formatted, modelTier, source: 'database' });
    }

    // Layer 2 (math only): parameterized templates — computed numbers, no LLM.
    if (subject === 'math') {
      const templateQuestions = generateFromMathTemplates(resolved);
      if (templateQuestions.length >= count) {
        const served: GeneratedQuestion[] = [];
        for (const templateQuestion of templateQuestions) {
          const generated = mathTemplateQuestionToGenerated(templateQuestion);
          const id = await persistQuestion(generated, {
            generationType: 'template',
            sourceKind: 'generated',
            templateId: templateQuestion.templateId,
            templateSeed: templateQuestion.seed,
          });
          served.push({ ...generated, id: id ?? `template-${templateQuestion.templateId}-${templateQuestion.seed}` });
        }
        await markExposure(served.map((question) => question.id!).filter((id) => !id.startsWith('template-')));
        return NextResponse.json({ question: served[0], questions: served, modelTier, source: 'template' });
      }
    }

    // Layer 3: LLM generation, few-shot prompted with official snippets.
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const fallback = getFallbackQuestions(subject, resolved.topic ? [resolved.topic] : undefined, count);
      if (fallback.length > 0) {
        return NextResponse.json({ question: fallback[0], questions: fallback, modelTier, source: 'fallback' });
      }
      const officialReferenceCount = getOfficialSatSnippets(subject, topic, undefined, 12).length;
      return NextResponse.json(
        {
          error: 'No LLM API key is configured and no sufficient local SAT practice set was available.',
          officialReferenceCount,
        },
        { status: 500 }
      );
    }

    const generatedQuestions = await generateQuestions(apiKey, {
      subject,
      topic: resolved.topic ?? resolved.chapter?.name ?? topic,
      targetDifficulty: resolved.targetElo,
      count,
      modelTier,
    });

    const savedQuestions: GeneratedQuestion[] = [];
    for (const question of generatedQuestions) {
      const officialRefs = getOfficialSatSnippets(question.subject, question.topic, resolved.band, 1);
      const officialRef = officialRefs[0];
      const id = await persistQuestion(question, {
        generationType: 'hallucinated',
        sourceKind: officialRef ? 'official_inspired' : 'generated',
        sourceReferenceId: officialRef?.sourceId,
        sourceReferencePdf: officialRef?.sourcePdf,
        sourceReferencePage: officialRef?.pageNumber,
      });
      savedQuestions.push({ ...question, id: id ?? undefined });
    }
    await markExposure(savedQuestions.map((question) => question.id!).filter(Boolean));

    return NextResponse.json({
      question: savedQuestions[0],
      questions: savedQuestions,
      modelTier,
      source: 'llm',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sat/generate] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
