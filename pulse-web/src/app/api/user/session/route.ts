import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// POST: Save session results — update ELO, XP, streak
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      subject,           // McatSubject string
      eloChanges,        // Record<subject, { newElo: number, xpGained: number }>
      totalXpGained,     // number
      performances,      // Array<{ questionId, isCorrect, eloChange, timeTakenMs? }>
    } = body;

    // 1. Update daily streak
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
        // Already practiced today — keep streak
      } else if (lastStr === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // 2. Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dailyStreak: newStreak,
        lastPracticeDate: new Date(),
        totalXp: { increment: totalXpGained },
      },
    });

    // 3. Update subject stats (ELO + XP)
    if (eloChanges) {
      for (const [subj, change] of Object.entries(eloChanges) as [string, { newElo: number; xpGained: number }][]) {
        await prisma.subjectStats.upsert({
          where: { userId_subject: { userId: user.id, subject: subj } },
          update: { elo: change.newElo, xp: { increment: change.xpGained } },
          create: { userId: user.id, subject: subj, elo: change.newElo, xp: change.xpGained },
        });
      }
    }

    // 4. Record individual performances (for practice history)
    if (performances && Array.isArray(performances)) {
      for (const perf of performances) {
        await prisma.userPerformance.create({
          data: {
            userId: user.id,
            questionId: perf.questionId,
            isCorrect: perf.isCorrect,
            eloChange: perf.eloChange ?? 0,
            timeTakenMs: perf.timeTakenMs ?? null,
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

// GET: Load practice history
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get recent performances grouped by time (sessions within 2 hours)
    const performances = await prisma.userPerformance.findMany({
      where: { userId: user.id },
      include: { question: true },
      orderBy: { createdAt: 'desc' },
      take: 200, // last 200 question performances
    });

    return NextResponse.json({ performances });
  } catch (error) {
    console.error('History load error:', error);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
