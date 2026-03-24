'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type McatSubject } from '@/lib/elo';
import {
  type UserProfile,
  type SessionResultInput,
  type ProcessedSessionResult,
  createDefaultProfile,
  processSessionResults,
} from '@/lib/userProfile';

// ─── Context Types ───────────────────────────────────────────────

interface UserProfileContextType {
  profile: UserProfile;
  submitSession: (results: SessionResultInput[]) => ProcessedSessionResult;
  resetProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => createDefaultProfile());

  const submitSession = useCallback((results: SessionResultInput[]): ProcessedSessionResult => {
    const processed = processSessionResults(profile, results);
    setProfile(processed.newProfile);
    return processed;
  }, [profile]);

  const resetProfile = useCallback(() => {
    setProfile(createDefaultProfile());
  }, []);

  return (
    <UserProfileContext.Provider value={{ profile, submitSession, resetProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────

export function useUserProfile(): UserProfileContextType {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return ctx;
}
