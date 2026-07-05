import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/landing');
  }

  let dbUser = null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
  } catch (error) {
    console.warn('[dashboard] DB unavailable, skipping onboarding check:', error);
  }

  if (dbUser && !dbUser.onboardingCompleted) {
    redirect('/onboarding');
  }

  return <>{children}</>;
}
