import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import {
  DEV_SESSION_COOKIE,
  DEV_USER_EMAIL,
  DEV_USER_ID,
  DEV_USER_NAME,
  isDevLoginEnabled,
} from '@/lib/auth-shared';

export type AppUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  isTemp?: boolean;
};

export async function ensureDevUser() {
  if (!isDevLoginEnabled()) {
    throw new Error('Dev login is disabled.');
  }

  return prisma.user.upsert({
    where: { id: DEV_USER_ID },
    update: {
      email: DEV_USER_EMAIL,
      name: DEV_USER_NAME,
    },
    create: {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: DEV_USER_NAME,
      onboardingCompleted: false,
    },
  });
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const devSession = cookieStore.get(DEV_SESSION_COOKIE)?.value;

  if (isDevLoginEnabled() && devSession === '1') {
    try {
      const user = await ensureDevUser();
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isTemp: true,
      };
    } catch (error) {
      // Dev-only: keep the app usable when the database is unreachable.
      console.warn('[auth] DB unavailable for dev session, using static dev user:', error);
      return {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        name: DEV_USER_NAME,
        image: null,
        isTemp: true,
      };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    image: user.user_metadata?.avatar_url || null,
    isTemp: false,
  };
}

export async function requireCurrentUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not logged in');
  }
  return user;
}
