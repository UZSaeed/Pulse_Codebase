import type { NextRequest } from 'next/server';

export const DEV_SESSION_COOKIE = 'spike-dev-session';
export const DEV_USER_ID = 'dev-student';
export const DEV_USER_EMAIL = 'student@spikeprep.local';
export const DEV_USER_NAME = 'Demo Student';

export function isDevLoginEnabled() {
  return process.env.NODE_ENV !== 'production';
}

export function hasDevSessionRequestCookie(request: NextRequest) {
  return isDevLoginEnabled() && request.cookies.get(DEV_SESSION_COOKIE)?.value === '1';
}
