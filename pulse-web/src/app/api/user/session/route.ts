import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextQuestionEligibleAt } from '@/lib/sat-tagging';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,
      eloChanges,
      totalXpGained,
      performances,
    } = body as {
      subject: string;
      eloChanges: Record<string, { newElo: number; xpGained: number; confidence?: number }>;
      totalXpGained: number;
      performances: Array<{
        questionId: string;
        isCorrect: boolean;
        eloChange: number;
        topicName?: string;
        subject?: string;
      }>;
    };

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    let newStreak = dbUser.dailyStreak;

    if (dbUser.lastPracticeDate) {
      const lastStr = dbUser.lastPracticeDate.toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastStr === today) {
        // same-day practice keeps streak
      } else if (lastStr === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyStreak: newStreak,
        lastPracticeDate: new Date(),
        totalXp: { increment: totalXpGained },
      },
    });

    for (const [section, change] of Object.entries(eloChanges ?? {})) {
      await prisma.subjectStats.upsert({
        where: { userId_subject: { userId: user.id, subject: section } },
        update: {
          elo: change.newElo,
          xp: { increment: change.xpGained },
          ...(typeof change.confidence === 'number' ? { confidence: change.confidence } : {}),
        },
        create: {
          userId: user.id,
          subject: section,
          elo: change.newElo,
          xp: change.xpGained,
          confidence: change.confidence ?? 3,
        },
      });
    }

    for (const performance of performances ?? []) {
      await prisma.userPerformance.create({
        data: {
          userId: user.id,
          questionId: performance.questionId,
          isCorrect: performance.isCorrect,
          eloChange: performance.eloChange ?? 0,
        },
      });

      const currentState = await prisma.userQuestionState.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: performance.questionId,
          },
        },
      });

      const nextEligibleAt = getNextQuestionEligibleAt({
        timesSeen: (currentState?.timesSeen ?? 0) + 1,
        isCorrect: performance.isCorrect,
      });

      await prisma.userQuestionState.upsert({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: performance.questionId,
          },
        },
        update: {
          lastSeenAt: new Date(),
          lastAnsweredAt: new Date(),
          lastAnsweredCorrect: performance.isCorrect,
          timesSeen: { increment: 1 },
          timesAnswered: { increment: 1 },
          timesCorrect: performance.isCorrect ? { increment: 1 } : undefined,
          nextEligibleAt,
          lastDifficultySeen: performance.eloChange ?? 0,
        },
        create: {
          userId: user.id,
          questionId: performance.questionId,
          lastAnsweredAt: new Date(),
          lastAnsweredCorrect: performance.isCorrect,
          timesSeen: 1,
          timesAnswered: 1,
          timesCorrect: performance.isCorrect ? 1 : 0,
          nextEligibleAt,
          lastDifficultySeen: performance.eloChange ?? 0,
        },
      });

      if (performance.topicName) {
        await prisma.topicStats.upsert({
          where: {
            userId_subject_topicName: {
              userId: user.id,
              subject: performance.subject ?? subject,
              topicName: performance.topicName,
            },
          },
          update: {
            elo: { increment: performance.eloChange ?? 0 },
            xp: { increment: performance.isCorrect ? 12 : 4 },
            confidence: {
              increment: performance.isCorrect ? 0.05 : -0.05,
            },
          },
          create: {
            userId: user.id,
            subject: performance.subject ?? subject,
            topicName: performance.topicName,
            elo: 1000 + (performance.eloChange ?? 0),
            xp: performance.isCorrect ? 12 : 4,
            confidence: performance.isCorrect ? 3.1 : 2.9,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      dailyStreak: newStreak,
      totalXp: dbUser.totalXp + totalXpGained,
    });
  } catch (error) {
    console.error('Session save error:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const performances = await prisma.userPerformance.findMany({
      where: { userId: user.id },
      include: { question: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ performances });
  } catch (error) {
    console.error('History load error:', error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
