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

    const opts: GenerateQuestionOptions = {
      subject,
      topic,
      targetDifficulty,
      passageBased,
      modelTier,
    };

    const question = await generateQuestion(apiKey, opts);

    return NextResponse.json({ question, modelTier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
