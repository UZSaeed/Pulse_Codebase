'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DomainRadar } from '@/components/ui/DomainRadar';
import { useUserProfile } from '@/context/UserProfileContext';
import { MCAT_SUBJECTS, SUBJECT_LABELS, RANK_COLORS, type McatSubject } from '@/lib/elo';
import { computeDomainStates, GOLD_TARGET_ELO } from '@/lib/planner';

const SECTION_DISPLAY: Record<McatSubject, string> = {
  reading_writing: 'English',
  math: 'Math',
};

export default function DashboardPage() {
  const { profile, loading } = useUserProfile();

  const domainStates = useMemo(() => computeDomainStates(profile), [profile]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-4">
            <img src="/spike-mascot.png" alt="Spike" className="h-16 w-16 animate-bounce object-contain" />
            <p className="text-sm font-medium text-slate-500">Loading your profile...</p>
          </div>
        </main>
      </div>
    );
  }

  const nextTask = profile.plannerTasks.find((task) => task.status === 'pending');
  const goldDomains = domainStates.filter((state) => state.elo >= GOLD_TARGET_ELO).length;
  const overallColors = RANK_COLORS[profile.overallRank.rank];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">
              Hey, {profile.name}! 👋
            </h1>
            <p className="max-w-2xl font-medium text-slate-500">
              Goal: get every topic to Gold before test day. You&apos;re at {goldDomains}/{domainStates.length} so far — keep going!
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/practice">
              <Button variant="primary">
                Start Practice
              </Button>
            </Link>
            <Link href="/planner">
              <Button variant="outline">Open Planner</Button>
            </Link>
          </div>
        </header>

        {nextTask && (
          <Card neonHighlight className="mb-8 bg-gradient-to-r from-cyan-50 to-surface">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <img src="/spike-mascot.png" alt="Spike" className="h-14 w-14 object-contain" />
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-cyan-600">Today&apos;s next block</div>
                  <h2 className="text-xl font-black text-slate-900">
                    {nextTask.targetTopics?.[0] ?? nextTask.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {nextTask.questionCount ?? 0} questions · {nextTask.subject !== 'mixed' && nextTask.subject !== 'custom' ? SUBJECT_LABELS[nextTask.subject as McatSubject] : 'Mixed'}
                  </p>
                </div>
              </div>
              <Link href={nextTask.type === 'practice_test' ? '/practice-tests' : `/practice?taskId=${nextTask.id}&autoStart=true`}>
                <Button variant="primary" size="lg">
                  {nextTask.type === 'practice_test' ? 'Log practice test' : 'Start this block'}
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <Card className="mb-8 bg-white">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall rank</div>
              <div
                className={`mx-auto mt-3 inline-block rounded-full bg-gradient-to-r px-4 py-1.5 text-sm font-black uppercase tracking-wider ${overallColors.gradient} ${overallColors.text}`}
              >
                {profile.overallRank.displayName}
              </div>
              <div className="mt-3 text-3xl font-black text-cyan-600">{profile.overallElo}</div>
              <div className="mt-1 text-xs text-slate-400">{profile.overallRank.difficultyLabel} difficulty</div>
            </div>

            {MCAT_SUBJECTS.map((subject) => {
              const sectionProfile = profile.subjects[subject];
              const colors = RANK_COLORS[sectionProfile.rank.rank];
              return (
                <div key={subject} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {SECTION_DISPLAY[subject]}
                  </div>
                  <div
                    className={`mx-auto mt-3 inline-block rounded-full bg-gradient-to-r px-4 py-1.5 text-sm font-black uppercase tracking-wider ${colors.gradient} ${colors.text}`}
                  >
                    {sectionProfile.rank.displayName}
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-800">{sectionProfile.elo}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {SUBJECT_LABELS[subject]}
                  </div>
                </div>
              );
            })}
          </div>

          <DomainRadar states={domainStates} size={400} />
        </Card>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <Card className="bg-white">
            <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Topics at Gold</div>
            <div className="mt-3 text-5xl font-black text-yellow-500">
              {goldDomains}
              <span className="text-2xl text-slate-300">/{domainStates.length}</span>
            </div>
            <div className="mt-3 text-sm text-slate-500">Gold = ready for hard questions</div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Daily streak</div>
            <div className="mt-3 text-5xl font-black text-orange-500">{profile.dailyStreak}</div>
            <div className="mt-3 text-sm text-slate-500">{profile.xpMultiplier.toFixed(2)}x XP boost</div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Latest scores</div>
            <div className="mt-3 text-lg font-bold text-slate-800">
              RW {profile.preferences.recentReadingWritingScore ?? '—'}
            </div>
            <div className="mt-1 text-lg font-bold text-slate-800">
              Math {profile.preferences.recentMathScore ?? '—'}
            </div>
          </Card>
          <Card className="bg-white">
            <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Practice tests</div>
            <div className="mt-3 text-5xl font-black text-slate-800">{profile.practiceTests.length}</div>
            <div className="mt-3 text-sm">
              <Link href="/practice-tests" className="font-bold text-cyan-600 hover:underline">
                Log a test →
              </Link>
            </div>
          </Card>
        </div>

        <Card className="relative bg-white">
          <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">
            Road to Gold — your priorities
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {domainStates.slice(0, 6).map((state) => {
              const colors = RANK_COLORS[state.rank.rank];
              return (
                <div key={state.chapterId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-800">{state.domain}</div>
                      <div className="text-xs font-medium text-slate-400">
                        {SECTION_DISPLAY[state.subject]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-block rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${colors.gradient} ${colors.text}`}
                      >
                        {state.rank.displayName}
                      </div>
                      <div className="mt-1 text-sm font-bold text-cyan-600">{state.elo}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-slate-300 to-yellow-400 transition-all"
                      style={{ width: `${Math.min(100, Math.max(4, ((state.elo - 700) / (GOLD_TARGET_ELO - 700)) * 100))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {state.gapToGold > 0
                      ? `${state.gapToGold} to Gold · ~${state.questionsToGold} questions`
                      : 'Gold reached!'}
                  </div>
                </div>
              );
            })}
          </div>
          <img
            src="/spike-peek.png"
            alt="Spike peeking"
            className="absolute -bottom-4 right-4 h-14 w-20 object-contain"
          />
        </Card>
      </main>
    </div>
  );
}
