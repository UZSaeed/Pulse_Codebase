import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET: Load user profile (stats, streak, XP, ELO per subject)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        subjectStats: true,
        topicStats: true,
        preferences: true,
        practiceTests: { orderBy: { takenAt: 'desc' }, take: 10 },
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
        confidence: s.confidence,
      })),
      topicStats: dbUser.topicStats.map((topic) => ({
        subject: topic.subject,
        topicName: topic.topicName,
        elo: topic.elo,
        xp: topic.xp,
        confidence: topic.confidence,
      })),
      practiceTests: dbUser.practiceTests.map((test) => ({
        id: test.id,
        takenAt: test.takenAt.toISOString(),
        readingWritingScore: test.readingWritingScore,
        mathScore: test.mathScore,
        domainBreakdown: test.domainBreakdown,
      })),
      preferences: dbUser.preferences ? {
        nextTestDate: dbUser.preferences.nextTestDate?.toISOString() ?? null,
        preparedByDate: dbUser.preferences.preparedByDate?.toISOString() ?? null,
        hasScheduledTest: dbUser.preferences.hasScheduledTest,
        recentReadingWritingScore: dbUser.preferences.recentReadingWritingScore,
        recentMathScore: dbUser.preferences.recentMathScore,
        confidenceProfile: dbUser.preferences.confidenceProfile,
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
