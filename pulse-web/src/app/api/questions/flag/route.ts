import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { questionId, userId, reason, details } = await request.json();

    if (!questionId || !userId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const flag = await prisma.questionFlag.create({
      data: {
        userId,
        questionId,
        reason,
        details,
      },
    });

    return NextResponse.json({ success: true, flag });
  } catch (err: any) {
    console.error('Failed to flag question:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

//s
