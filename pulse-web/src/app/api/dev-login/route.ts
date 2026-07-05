import { NextResponse } from 'next/server';
import { ensureDevUser } from '@/lib/auth';
import { DEV_SESSION_COOKIE, isDevLoginEnabled } from '@/lib/auth-shared';

export async function POST(request: Request) {
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: 'Dev login is disabled.' }, { status: 403 });
  }

  await ensureDevUser();

  const body = (await request.json().catch(() => ({}))) as { next?: string };
  const next = typeof body.next === 'string' && body.next.startsWith('/') ? body.next : '/dashboard';

  const response = NextResponse.json({ ok: true, next });
  response.cookies.set(DEV_SESSION_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
