'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type McatSubject, MCAT_SUBJECTS, getTieredRank, satScoreToElo, DEFAULT_ELO } from '@/lib/elo';
import {
  type UserProfile,
  type SessionResultInput,
  type ProcessedSessionResult,
  createDefaultProfile,
  processSessionResults,
  getXpMultiplier,
} from '@/lib/userProfile';
import { generateWeeklyPlan } from '@/lib/planner';
import { MCAT_CHAPTERS } from '@/lib/chapters';

interface UserProfileContextType {
  profile: UserProfile;
  loading: boolean;
  submitSession: (results: SessionResultInput[], completedTaskId?: string | null) => ProcessedSessionResult;
  persistSession: (
    processed: ProcessedSessionResult,
    subject: McatSubject,
    performances: { questionId: string; isCorrect: boolean; eloChange: number; topicName?: string; subject?: string }[]
  ) => Promise<void>;
  resetProfile: () => void;
  togglePlannerTask: (taskId: string) => void;
  addPlannerTask: (task: Omit<import('@/lib/planner').PlannerTask, 'id'>) => void;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => createDefaultProfile());
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const data = await response.json();

      setProfile((prev) => {
        const updated = structuredClone(prev);
        updated.id = data.id;
        updated.name = data.name || 'Student';
        updated.dailyStreak = data.dailyStreak ?? 0;
        updated.lastPracticeDate = data.lastPracticeDate ?? null;
        updated.totalXp = data.totalXp ?? 0;

        if (Array.isArray(data.subjectStats)) {
          for (const stat of data.subjectStats) {
            const subject = stat.subject as McatSubject;
            if (updated.subjects[subject]) {
              updated.subjects[subject].elo = stat.elo;
              updated.subjects[subject].xp = stat.xp;
              updated.subjects[subject].confidence = stat.confidence ?? updated.subjects[subject].confidence;
              updated.subjects[subject].rank = getTieredRank(stat.elo);
            }
          }
        }

        if (Array.isArray(data.topicStats)) {
          for (const stat of data.topicStats) {
            const subject = stat.subject as McatSubject;
            if (updated.subjects[subject]?.topics[stat.topicName]) {
              updated.subjects[subject].topics[stat.topicName].elo = stat.elo;
              updated.subjects[subject].topics[stat.topicName].xp = stat.xp;
              updated.subjects[subject].topics[stat.topicName].confidence =
                stat.confidence ?? updated.subjects[subject].topics[stat.topicName].confidence;
            }
          }
        }

        updated.preferences = {
          ...updated.preferences,
          ...(data.preferences ?? {}),
        };

        updated.practiceTests = Array.isArray(data.practiceTests) ? data.practiceTests : [];

        const rwScore = data.preferences?.recentReadingWritingScore as number | undefined;
        const mathScore = data.preferences?.recentMathScore as number | undefined;
        const satScoreForSubject: Record<McatSubject, number | undefined> = {
          reading_writing: rwScore,
          math: mathScore,
        };

        for (const subject of MCAT_SUBJECTS) {
          const score = satScoreForSubject[subject];
          if (score) {
            const mappedElo = satScoreToElo(score);
            for (const chapter of MCAT_CHAPTERS[subject]) {
              for (const topic of chapter.topics) {
                if (updated.subjects[subject].topics[topic] && updated.subjects[subject].topics[topic].elo === DEFAULT_ELO) {
                  updated.subjects[subject].topics[topic].elo = mappedElo;
                }
              }
            }
          }
        }

        if (data.preferences?.confidenceProfile) {
          const confidenceProfile = data.preferences.confidenceProfile as Record<string, number>;
          for (const subject of MCAT_SUBJECTS) {
            for (const chapter of MCAT_CHAPTERS[subject]) {
              const confidence = confidenceProfile[chapter.id];
              if (typeof confidence !== 'number') continue;
              for (const topic of chapter.topics) {
                if (updated.subjects[subject].topics[topic]) {
                  updated.subjects[subject].topics[topic].confidence = confidence;
                  if (!satScoreForSubject[subject] && updated.subjects[subject].topics[topic].elo === DEFAULT_ELO) {
                    updated.subjects[subject].topics[topic].elo = 850 + confidence * 130;
                  }
                }
              }
            }
            const topicValues = Object.values(updated.subjects[subject].topics);
            updated.subjects[subject].confidence =
              topicValues.reduce((sum, topic) => sum + topic.confidence, 0) / Math.max(1, topicValues.length);
          }
        }

        updated.xpMultiplier = getXpMultiplier(updated.dailyStreak);
        const eloSum = MCAT_SUBJECTS.reduce((sum, subject) => sum + updated.subjects[subject].elo, 0);
        updated.overallElo = Math.round(eloSum / MCAT_SUBJECTS.length);
        updated.overallRank = getTieredRank(updated.overallElo);

        const prevCompleted = new Set(
          prev.plannerTasks.filter((t) => t.status === 'completed').map((t) => t.id)
        );
        // Also pull completed IDs from localStorage (survives page refresh)
        try {
          const stored = JSON.parse(localStorage.getItem('completed_task_ids') || '[]') as string[];
          stored.forEach((id) => prevCompleted.add(id));
        } catch { /* ignore */ }

        const freshTasks = generateWeeklyPlan(updated, new Date().toISOString().split('T')[0]);
        updated.plannerTasks = freshTasks.map((task) =>
          prevCompleted.has(task.id) ? { ...task, status: 'completed' as const } : task
        );
        return updated;
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const submitSession = useCallback(
    (results: SessionResultInput[], completedTaskId?: string | null): ProcessedSessionResult => {
      const processed = processSessionResults(profile, results);

      // Collect previously completed task IDs so regeneration preserves them
      const completedIds = new Set(
        profile.plannerTasks
          .filter((t) => t.status === 'completed')
          .map((t) => t.id)
      );
      if (completedTaskId) completedIds.add(completedTaskId);

      const freshTasks = generateWeeklyPlan(
        processed.newProfile,
        new Date().toISOString().split('T')[0]
      );
      processed.newProfile.plannerTasks = freshTasks.map((task) =>
        completedIds.has(task.id) ? { ...task, status: 'completed' as const } : task
      );

      try {
        localStorage.setItem('completed_task_ids', JSON.stringify([...completedIds]));
      } catch { /* ignore */ }

      setProfile(processed.newProfile);
      return processed;
    },
    [profile]
  );

  const persistSession = useCallback(
    async (
      processed: ProcessedSessionResult,
      subject: McatSubject,
      performances: { questionId: string; isCorrect: boolean; eloChange: number; topicName?: string; subject?: string }[]
    ) => {
      try {
        const eloChanges: Record<string, { newElo: number; xpGained: number; confidence?: number }> = {};
        for (const section of MCAT_SUBJECTS) {
          eloChanges[section] = {
            newElo: processed.newProfile.subjects[section].elo,
            xpGained: section === subject ? processed.xpGained : 0,
            confidence: processed.newProfile.subjects[section].confidence,
          };
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
      } catch (error) {
        console.error('Failed to persist session:', error);
      }
    },
    []
  );

  const resetProfile = useCallback(() => {
    setProfile(createDefaultProfile());
  }, []);

  const togglePlannerTask = useCallback((taskId: string) => {
    setProfile((prev) => {
      const updated = {
        ...prev,
        plannerTasks: prev.plannerTasks.map((task) =>
          task.id === taskId
            ? { ...task, status: task.status === 'completed' ? ('pending' as const) : ('completed' as const) }
            : task
        ),
      };
      try {
        const completedIds = updated.plannerTasks
          .filter((t) => t.status === 'completed')
          .map((t) => t.id);
        localStorage.setItem('completed_task_ids', JSON.stringify(completedIds));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const addPlannerTask = useCallback((taskData: Omit<import('@/lib/planner').PlannerTask, 'id'>) => {
    setProfile((prev) => {
      const newTask: import('@/lib/planner').PlannerTask = {
        ...taskData,
        id: `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      return {
        ...prev,
        plannerTasks: [...prev.plannerTasks, newTask].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)),
      };
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        loading,
        submitSession,
        persistSession,
        resetProfile,
        togglePlannerTask,
        addPlannerTask,
        refreshProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextType {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
