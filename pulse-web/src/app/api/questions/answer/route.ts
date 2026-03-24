/**
 * API Route: Submit an answer and get ELO + SRS updates
 * POST /api/questions/answer
 *
 * Body: {
 *   userElo, questionElo, isCorrect, totalAnswered,
 *   srsState: { repetitions, easeFactor, interval },
 *   timeTakenMs?
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateElo } from '@/lib/elo';
import { calculateSrs, mapToQuality, defaultSrsState, type SrsState } from '@/lib/srs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userElo = 1500,
      questionElo = 1500,
      isCorrect,
      totalAnswered = 0,
      srsState,
      timeTakenMs,
    } = body as {
      userElo?: number;
      questionElo?: number;
      isCorrect: boolean;
      totalAnswered?: number;
      srsState?: SrsState;
      timeTakenMs?: number;
    };

    // ELO update
    const eloResult = calculateElo(userElo, questionElo, isCorrect, totalAnswered);

    // SRS update
    const prevSrs = srsState ?? defaultSrsState();
    const quality = mapToQuality(isCorrect, timeTakenMs);
    const srsResult = calculateSrs(prevSrs, quality);

    // XP awarded
    const baseXp = isCorrect ? 25 : 5;
    const eloBonus = isCorrect && eloResult.eloChange > 15 ? 10 : 0;
    const xpAwarded = baseXp + eloBonus;

    return NextResponse.json({
      elo: eloResult,
      srs: srsResult,
      xpAwarded,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[answer] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
