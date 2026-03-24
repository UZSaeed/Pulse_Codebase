/**
 * API Route: Generate a new MCAT question
 * POST /api/questions/generate
 *
 * Body: { subject, topic?, targetDifficulty?, passageBased? }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateQuestion,
  selectModelTier,
  type GenerateQuestionOptions,
} from '@/lib/ai';
import { checkAndExpandQuestionBank } from '@/lib/question-bank';
import { prisma } from '@/lib/prisma';
import type { McatSubject } from '@/lib/elo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subject,
      topic,
      targetDifficulty,
      passageBased,
      tokensUsedThisMonth = 0,
      monthlyTokenBudget = 500_000,
    } = body as {
      subject: McatSubject;
      topic?: string;
      targetDifficulty?: number;
      passageBased?: boolean;
      tokensUsedThisMonth?: number;
      monthlyTokenBudget?: number;
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const modelTier = selectModelTier(tokensUsedThisMonth, monthlyTokenBudget);

    // 1. Asynchronously trigger DB expansion so the global bank grows up to its cap
    if (topic) {
      checkAndExpandQuestionBank(subject, topic).catch((e) => console.error('[BankExpand]', e));
    }

    // 2. Try to fetch an existing question to save tokens
    if (topic) {
      const count = await prisma.question.count({ where: { topic } });
      if (count > 0) {
        const skip = Math.floor(Math.random() * count);
        const randomQ = await prisma.question.findFirst({
          where: { topic },
          skip
        });
        if (randomQ) {
          // Map DB question format to GeneratedQuestion structure
          const formattedQ = {
            subject: randomQ.subject,
            topic: randomQ.topic || '',
            passage: randomQ.passage || null,
            stem: randomQ.text,
            choices: randomQ.choices ? JSON.parse(randomQ.choices) : [],
            correctAnswer: randomQ.correctAnswer || 'A',
            explanation: randomQ.explanation,
            distractorExplanations: randomQ.distractorExplanations ? JSON.parse(randomQ.distractorExplanations) : undefined,
            difficulty: randomQ.baseDifficulty,
          };
          return NextResponse.json({ question: formattedQ, modelTier });
        }
      }
    }

    // 3. Fallback: generate a new one inline if DB is empty
    const opts: GenerateQuestionOptions = {
      subject,
      topic,
      targetDifficulty,
      passageBased,
      modelTier,
    };

    const question = await generateQuestion(apiKey, opts);

    // Save fallback to DB
    await prisma.question.create({
      data: {
        subject: question.subject,
        topic: question.topic,
        passage: question.passage,
        text: question.stem,
        choices: JSON.stringify(question.choices),
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        distractorExplanations: question.distractorExplanations ? JSON.stringify(question.distractorExplanations) : null,
        baseDifficulty: question.difficulty,
      }
    });

    return NextResponse.json({ question, modelTier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
