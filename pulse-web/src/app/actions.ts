'use server';

import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function submitOnboarding(data: {
  testDate: Date;
  rampUpPercentage: number;
  grindPercentage: number;
  lastStretchPercentage: number;
  rampUpQuestionsPerDay: number;
  grindQuestionsPerDay: number;
  lastStretchQuestionsPerDay: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not logged in');
  }

  const { testDate, ...prefs } = data;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      onboardingCompleted: true,
      preferences: {
        upsert: {
          create: {
            testDate,
            ...prefs,
          },
          update: {
            testDate,
            ...prefs,
          },
        },
      },
    },
  });

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function getUserPreferences() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { preferences: true },
  });

  return (dbUser as any)?.preferences || null;
}
