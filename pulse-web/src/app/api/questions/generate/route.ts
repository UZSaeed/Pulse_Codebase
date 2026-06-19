import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions, selectModelTier, type GeneratedQuestion } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import type { McatSubject } from '@/lib/elo';
import { getFallbackQuestions, getOfficialSatSnippets } from '@/lib/sat-question-bank';
import { buildTagsFromGeneratedQuestion } from '@/lib/sat-tagging';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const body = await request.json();
    const {
      subject,
      topic,
      targetDifficulty = 1000,
      count = 1,
      tokensUsedThisMonth = 0,
      monthlyTokenBudget = 500_000,
    } = body as {
      subject: McatSubject;
      topic?: string;
      targetDifficulty?: number;
      count?: number;
      tokensUsedThisMonth?: number;
      monthlyTokenBudget?: number;
    };

    const modelTier = selectModelTier(tokensUsedThisMonth, monthlyTokenBudget);
    const now = new Date();

    const blockedQuestionIds = user
      ? (
          await prisma.userQuestionState.findMany({
            where: {
              userId: user.id,
              nextEligibleAt: { gt: now },
            },
            select: { questionId: true },
          })
        ).map((state) => state.questionId)
      : [];

    const markExposure = async (questionIds: string[]) => {
      if (!user || questionIds.length === 0) return;
      const nextEligibleAt = new Date();
      nextEligibleAt.setDate(nextEligibleAt.getDate() + 1);

      for (const questionId of questionIds) {
        await prisma.userQuestionState.upsert({
          where: {
            userId_questionId: {
              userId: user.id,
              questionId,
            },
          },
          update: {
            lastSeenAt: now,
            timesSeen: { increment: 1 },
            nextEligibleAt: {
              set: nextEligibleAt,
            },
          },
          create: {
            userId: user.id,
            questionId,
            timesSeen: 1,
            nextEligibleAt,
          },
        });
      }
    };

    const existingQuestions = await prisma.question.findMany({
      where: {
        subject,
        ...(topic ? { topic } : {}),
        correctAnswer: { not: null },
        ...(blockedQuestionIds.length > 0 ? { id: { notIn: blockedQuestionIds } } : {}),
      },
      take: count,
      orderBy: [{ updatedAt: 'asc' }, { createdAt: 'desc' }],
    });

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
        difficulty: question.baseDifficulty,
      }));
      return NextResponse.json({ question: formatted[0], questions: formatted, modelTier, source: 'database' });
    }

    const fallback = getFallbackQuestions(subject, topic ? [topic] : undefined, count);
    if (fallback.length >= count) {
      const savedFallback = [];
      for (const question of fallback) {
        const tags = buildTagsFromGeneratedQuestion(question);
        const created = await prisma.question.create({
          data: {
            subject: question.subject,
            domain: tags.domain,
            skill: tags.skill,
            topic: question.topic,
            chapterId: tags.chapterId,
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
            generationType: 'hallucinated',
            sourceKind: 'generated',
          },
        });
        savedFallback.push({ ...question, id: created.id });
      }
      await markExposure(savedFallback.map((question) => question.id!).filter(Boolean));
      return NextResponse.json({ question: savedFallback[0], questions: savedFallback, modelTier, source: 'fallback' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
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
      topic,
      targetDifficulty,
      count,
      modelTier,
    });

    const savedQuestions: GeneratedQuestion[] = [];
    for (const question of generatedQuestions) {
      const tags = buildTagsFromGeneratedQuestion(question);
      const officialRefs = getOfficialSatSnippets(question.subject, question.topic, undefined, 1);
      const officialRef = officialRefs[0];
      const created = await prisma.question.create({
        data: {
          subject: question.subject,
          domain: tags.domain,
          skill: tags.skill,
          topic: question.topic,
          chapterId: tags.chapterId,
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
          generationType: 'hallucinated',
          sourceKind: officialRef ? 'official_inspired' : 'generated',
          sourceReferenceId: officialRef?.sourceId,
          sourceReferencePdf: officialRef?.sourcePdf,
          sourceReferencePage: officialRef?.pageNumber,
        },
      });

      savedQuestions.push({ ...question, id: created.id });
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
