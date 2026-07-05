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
import { getNextQuestionEligibleAt } from '@/lib/sat-tagging';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      questionId,
      subject,
      topicName,
      userElo = 1000,
      questionElo = 1000,
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
    const baseXp = isCorrect ? 12 : 4;
    const eloBonus = isCorrect && eloResult.eloChange > 15 ? 6 : 0;
    const xpAwarded = baseXp + eloBonus;

    // Persist if user is logged in
    if (userId && questionId) {
      const reviewDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + Math.max(1, srsResult.interval));
        return d;
      })();

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
          nextReviewDate: reviewDate,
        }
      });

      const currentState = await prisma.userQuestionState.findUnique({
        where: {
          userId_questionId: {
            userId,
            questionId,
          },
        },
      });

      await prisma.userQuestionState.upsert({
        where: {
          userId_questionId: {
            userId,
            questionId,
          },
        },
        update: {
          lastSeenAt: new Date(),
          lastAnsweredAt: new Date(),
          lastAnsweredCorrect: isCorrect,
          timesSeen: { increment: 1 },
          timesAnswered: { increment: 1 },
          timesCorrect: isCorrect ? { increment: 1 } : undefined,
          nextEligibleAt: getNextQuestionEligibleAt({
            timesSeen: (currentState?.timesSeen ?? 0) + 1,
            isCorrect,
            nextReviewDate: reviewDate,
          }),
          lastDifficultySeen: questionElo,
        },
        create: {
          userId,
          questionId,
          lastAnsweredAt: new Date(),
          lastAnsweredCorrect: isCorrect,
          timesSeen: 1,
          timesAnswered: 1,
          timesCorrect: isCorrect ? 1 : 0,
          nextEligibleAt: getNextQuestionEligibleAt({
            timesSeen: 1,
            isCorrect,
            nextReviewDate: reviewDate,
          }),
          lastDifficultySeen: questionElo,
        },
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
            elo: 1000 + eloResult.eloChange,
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
