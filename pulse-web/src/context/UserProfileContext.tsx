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
  togglePlannerTask: (taskId: string) => void;
  addPlannerTask: (task: Omit<import('@/lib/planner').PlannerTask, 'id'>) => void;
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

  return (
    <UserProfileContext.Provider value={{ profile, submitSession, resetProfile, togglePlannerTask, addPlannerTask }}>
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
