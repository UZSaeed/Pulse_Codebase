import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { MCAT_SUBJECTS, type McatSubject } from '@/lib/elo';
import { calibrateFromPracticeTest, type DomainBreakdown } from '@/lib/practice-test-calibration';
import type { Prisma } from '@prisma/client';

// GET: list the user's logged practice tests, most recent first.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const tests = await prisma.practiceTestResult.findMany({
      where: { userId: user.id },
      orderBy: { takenAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      tests: tests.map((test) => ({
        id: test.id,
        takenAt: test.takenAt.toISOString(),
        readingWritingScore: test.readingWritingScore,
        mathScore: test.mathScore,
        domainBreakdown: test.domainBreakdown,
        notes: test.notes,
      })),
    });
  } catch (error) {
    console.error('[practice-tests] GET error:', error);
    return NextResponse.json({ error: 'Failed to load practice tests' }, { status: 500 });
  }
}

// POST: log a practice test and recalibrate subject/topic ELOs from it.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = (await request.json()) as {
      takenAt?: string;
      readingWritingScore: number;
      mathScore: number;
      domainBreakdown?: DomainBreakdown | null;
      notes?: string;
    };

    const readingWritingScore = Number(body.readingWritingScore);
    const mathScore = Number(body.mathScore);
    const validScore = (score: number) => Number.isFinite(score) && score >= 200 && score <= 800;
    if (!validScore(readingWritingScore) || !validScore(mathScore)) {
      return NextResponse.json({ error: 'Section scores must be between 200 and 800.' }, { status: 400 });
    }

    const domainBreakdown = body.domainBreakdown ?? null;
    if (domainBreakdown) {
      for (const [chapterId, entry] of Object.entries(domainBreakdown)) {
        const correct = Number(entry?.correct);
        const total = Number(entry?.total);
        if (!Number.isFinite(correct) || !Number.isFinite(total) || total < 0 || correct < 0 || correct > total) {
          return NextResponse.json({ error: `Invalid breakdown for ${chapterId}.` }, { status: 400 });
        }
      }
    }

    // Current ratings, to blend the test evidence into.
    const [subjectStats, topicStats] = await Promise.all([
      prisma.subjectStats.findMany({ where: { userId: user.id } }),
      prisma.topicStats.findMany({ where: { userId: user.id } }),
    ]);

    const currentSubjectElos = { reading_writing: 1000, math: 1000 } as Record<McatSubject, number>;
    for (const stat of subjectStats) {
      if (MCAT_SUBJECTS.includes(stat.subject as McatSubject)) {
        currentSubjectElos[stat.subject as McatSubject] = stat.elo;
      }
    }
    const currentTopicElos = { reading_writing: {}, math: {} } as Record<McatSubject, Record<string, number>>;
    for (const stat of topicStats) {
      if (MCAT_SUBJECTS.includes(stat.subject as McatSubject)) {
        currentTopicElos[stat.subject as McatSubject][stat.topicName] = stat.elo;
      }
    }

    const calibrated = calibrateFromPracticeTest({
      readingWritingScore,
      mathScore,
      domainBreakdown,
      currentSubjectElos,
      currentTopicElos,
    });

    const takenAt = body.takenAt ? new Date(body.takenAt) : new Date();

    const created = await prisma.$transaction(async (tx) => {
      const test = await tx.practiceTestResult.create({
        data: {
          userId: user.id,
          takenAt,
          readingWritingScore,
          mathScore,
          domainBreakdown: domainBreakdown ? (domainBreakdown as unknown as Prisma.InputJsonValue) : undefined,
          notes: body.notes ?? null,
        },
      });

      for (const subject of MCAT_SUBJECTS) {
        await tx.subjectStats.upsert({
          where: { userId_subject: { userId: user.id, subject } },
          update: { elo: calibrated.subjectElos[subject] },
          create: { userId: user.id, subject, elo: calibrated.subjectElos[subject] },
        });

        for (const [topicName, elo] of Object.entries(calibrated.topicElos[subject])) {
          await tx.topicStats.upsert({
            where: { userId_subject_topicName: { userId: user.id, subject, topicName } },
            update: { elo },
            create: { userId: user.id, subject, topicName, elo },
          });
        }
      }

      await tx.userPreference.upsert({
        where: { userId: user.id },
        update: {
          recentReadingWritingScore: readingWritingScore,
          recentMathScore: mathScore,
        },
        create: {
          userId: user.id,
          recentReadingWritingScore: readingWritingScore,
          recentMathScore: mathScore,
        },
      });

      return test;
    });

    return NextResponse.json({
      id: created.id,
      calibrated,
    });
  } catch (error) {
    console.error('[practice-tests] POST error:', error);
    return NextResponse.json({ error: 'Failed to save practice test' }, { status: 500 });
  }
}
