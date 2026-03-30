import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET: Load user profile (stats, streak, XP, ELO per subject)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subjectStats: true,
        preferences: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: dbUser.id,
      name: dbUser.name || 'Student',
      dailyStreak: dbUser.dailyStreak,
      lastPracticeDate: dbUser.lastPracticeDate?.toISOString() ?? null,
      totalXp: dbUser.totalXp,
      subjectStats: dbUser.subjectStats.map(s => ({
        subject: s.subject,
        elo: s.elo,
        xp: s.xp,
      })),
      preferences: dbUser.preferences ? {
        testDate: dbUser.preferences.testDate?.toISOString() ?? null,
        rampUpPercentage: dbUser.preferences.rampUpPercentage,
        grindPercentage: dbUser.preferences.grindPercentage,
        lastStretchPercentage: dbUser.preferences.lastStretchPercentage,
        rampUpQuestionsPerDay: dbUser.preferences.rampUpQuestionsPerDay,
        grindQuestionsPerDay: dbUser.preferences.grindQuestionsPerDay,
        lastStretchQuestionsPerDay: dbUser.preferences.lastStretchQuestionsPerDay,
      } : null,
    });
  } catch (error) {
    console.error('Profile load error:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
