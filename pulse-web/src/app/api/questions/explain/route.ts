/**
 * API Route: "Explain to me" follow-up chat
 * POST /api/questions/explain
 *
 * Body: { questionStem, explanation, userMessage, tokensUsedThisMonth?, monthlyTokenBudget? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { explainChat, selectModelTier } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      questionStem,
      explanation,
      passage,
      choices,
      userMessage,
      tokensUsedThisMonth = 0,
      monthlyTokenBudget = 500_000,
    } = body as {
      questionStem: string;
      explanation: string;
      passage?: string | null;
      choices?: any;
      userMessage: string;
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

    // Explain chat always defaults to economy, but respects budget routing
    const modelTier = selectModelTier(tokensUsedThisMonth, monthlyTokenBudget);

    const reply = await explainChat(apiKey, {
      questionStem,
      explanation,
      passage,
      choices,
      userMessage,
      modelTier: modelTier === 'premium' ? 'economy' : 'economy', // always economy for chat
    });

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[explain] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
