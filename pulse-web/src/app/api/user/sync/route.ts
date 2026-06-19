import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, email, name, image } = body;

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing id or email' }, { status: 400 });
    }

    // Upsert user — create if new, update name/image if existing
    const user = await prisma.user.upsert({
      where: { id },
      update: { name, image },
      create: {
        id,
        email,
        name,
        image,
      },
    });

    // Ensure SubjectStats exist for SAT sections
    const subjects = ['reading_writing', 'math'];
    for (const subject of subjects) {
      await prisma.subjectStats.upsert({
        where: { userId_subject: { userId: id, subject } },
        update: {},
        create: { userId: id, subject },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
  }
}
