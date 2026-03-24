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
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      questionId,
      subject,
      topicName,
      userElo = 1500,
      questionElo = 1500,
      isCorrect,
      totalAnswered = 0,
      srsState,
      timeTakenMs,
    } = body as {
      userId?: string;
      questionId?: string;
      subject?: string;
      topicName?: string;
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

    // Persist if user is logged in
    if (userId && questionId) {
      await prisma.userPerformance.create({
        data: {
          userId,
          questionId,
          isCorrect,
          timeTakenMs,
          eloChange: eloResult.eloChange,
          srsInterval: srsResult.interval,
          srsRepetitions: srsResult.repetitions,
          srsEaseFactor: srsResult.easeFactor,
          nextReviewDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + Math.max(1, srsResult.interval));
            return d;
          })()
        }
      });

      // Lazily upsert TopicStats
      if (topicName && subject) {
        await prisma.topicStats.upsert({
          where: {
            userId_subject_topicName: { userId, subject, topicName }
          },
          update: {
            elo: { increment: eloResult.eloChange },
            xp: { increment: xpAwarded }
          },
          create: {
            userId,
            subject,
            topicName,
            elo: 1500 + eloResult.eloChange,
            xp: xpAwarded
          }
        });
      }
    }

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
