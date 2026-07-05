'use server';

import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export interface SatPreferenceInput {
  nextTestDate: Date | null;
  preparedByDate: Date | null;
  hasScheduledTest: boolean;
  recentReadingWritingScore: number | null;
  recentMathScore: number | null;
  confidenceProfile: Record<string, number>;
  rampUpPercentage: number;
  grindPercentage: number;
  lastStretchPercentage: number;
  rampUpQuestionsPerDay: number;
  grindQuestionsPerDay: number;
  lastStretchQuestionsPerDay: number;
}

async function requireUserId() {
  const user = await requireCurrentUser();
  return user.id;
}

async function savePreferencePayload(userId: string, data: SatPreferenceInput) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      preferences: {
        upsert: {
          create: data,
          update: data,
        },
      },
    },
  });
}

export async function submitOnboarding(data: SatPreferenceInput) {
  const userId = await requireUserId();
  await savePreferencePayload(userId, data);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function saveSettings(data: SatPreferenceInput) {
  const userId = await requireUserId();
  await savePreferencePayload(userId, data);
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/planner');
  return { success: true };
}

export async function getUserPreferences() {
  const userId = await requireUserId().catch(() => null);
  if (!userId) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { preferences: true },
  });

  return dbUser?.preferences ?? null;
}
