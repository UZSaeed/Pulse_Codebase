import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/landing');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (dbUser && !dbUser.onboardingCompleted) {
    redirect('/onboarding');
  }

  return <>{children}</>;
}
