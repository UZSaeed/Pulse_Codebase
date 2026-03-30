'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type McatSubject, MCAT_SUBJECTS, DEFAULT_ELO, getTieredRank } from '@/lib/elo';
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
  loading: boolean;
  submitSession: (results: SessionResultInput[]) => ProcessedSessionResult;
  persistSession: (processed: ProcessedSessionResult, subject: McatSubject, performances: { questionId: string; isCorrect: boolean; eloChange: number }[]) => Promise<void>;
  resetProfile: () => void;
  togglePlannerTask: (taskId: string) => void;
  addPlannerTask: (task: Omit<import('@/lib/planner').PlannerTask, 'id'>) => void;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => createDefaultProfile());
  const [loading, setLoading] = useState(true);

  // Load profile from DB on mount
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      
      setProfile(prev => {
        const updated = { ...prev };
        updated.id = data.id;
        updated.name = data.name || 'Student';
        updated.dailyStreak = data.dailyStreak ?? 0;
        updated.lastPracticeDate = data.lastPracticeDate ?? null;
        updated.totalXp = data.totalXp ?? 0;

        // Update subject ELO/XP from DB
        if (data.subjectStats && Array.isArray(data.subjectStats)) {
          for (const stat of data.subjectStats) {
            const subj = stat.subject as McatSubject;
            if (updated.subjects[subj]) {
              updated.subjects[subj].elo = stat.elo;
              updated.subjects[subj].xp = stat.xp;
              updated.subjects[subj].rank = getTieredRank(stat.elo);
            }
          }
        }

        // Recalculate overall ELO
        const eloSum = MCAT_SUBJECTS.reduce((sum, s) => sum + updated.subjects[s].elo, 0);
        updated.overallElo = Math.round(eloSum / MCAT_SUBJECTS.length);
        updated.overallRank = getTieredRank(updated.overallElo);

        // Update XP multiplier based on streak
        const { getXpMultiplier } = require('@/lib/userProfile');
        updated.xpMultiplier = getXpMultiplier(updated.dailyStreak);

        // Update preferences from DB
        if (data.preferences) {
          updated.preferences = data.preferences;
        }

        return updated;
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const submitSession = useCallback((results: SessionResultInput[]): ProcessedSessionResult => {
    const processed = processSessionResults(profile, results);
    setProfile(processed.newProfile);
    return processed;
  }, [profile]);

  // Persist session results to DB
  const persistSession = useCallback(async (
    processed: ProcessedSessionResult,
    subject: McatSubject,
    performances: { questionId: string; isCorrect: boolean; eloChange: number }[]
  ) => {
    try {
      // Build per-subject ELO changes
      const eloChanges: Record<string, { newElo: number; xpGained: number }> = {};
      for (const s of MCAT_SUBJECTS) {
        const newElo = processed.newProfile.subjects[s].elo;
        eloChanges[s] = { newElo, xpGained: s === subject ? processed.xpGained : 0 };
      }

      await fetch('/api/user/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          eloChanges,
          totalXpGained: processed.xpGained,
          performances,
        }),
      });
    } catch (err) {
      console.error('Failed to persist session:', err);
    }
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(createDefaultProfile());
  }, []);

  const togglePlannerTask = useCallback((taskId: string) => {
    setProfile((prev) => {
      const newTasks = prev.plannerTasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: (t.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed' };
        }
        return t;
      });
      return { ...prev, plannerTasks: newTasks };
    });
  }, []);

  const addPlannerTask = useCallback((taskData: Omit<import('@/lib/planner').PlannerTask, 'id'>) => {
    setProfile((prev) => {
      const newTask: import('@/lib/planner').PlannerTask = {
        ...taskData,
        id: `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      
      const newTasks = [...prev.plannerTasks, newTask].sort((a, b) => {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      });
      
      return { ...prev, plannerTasks: newTasks };
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return (
    <UserProfileContext.Provider value={{ profile, loading, submitSession, persistSession, resetProfile, togglePlannerTask, addPlannerTask, refreshProfile }}>
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
