'use client';

import { UserProfileProvider } from '@/context/UserProfileContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <UserProfileProvider>{children}</UserProfileProvider>;
}
