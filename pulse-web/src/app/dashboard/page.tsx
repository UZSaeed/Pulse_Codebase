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
        <main className="flex flex-1 items-center justify-center bg-navy-900">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
            <p className="text-sm font-medium text-slate-400">Loading your SAT profile...</p>
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
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
        <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-display font-bold tracking-tight text-white">
              SAT dashboard for {profile.name}
            </h1>
            <p className="max-w-2xl font-medium text-slate-400">
              The goal: Gold rank — hard-difficulty questions — in every domain before test day. {goldDomains}/
              {domainStates.length} domains are there now.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/practice">
              <Button variant="primary" neon>
                Start Practice
              </Button>
            </Link>
            <Link href="/planner">
              <Button variant="outline">Open Planner</Button>
            </Link>
          </div>
        </header>

        {nextTask && (
          <Card neonHighlight className="mb-8 bg-gradient-to-r from-navy-800 to-cyan-950/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neon-blue">Next up</div>
                <h2 className="text-2xl font-display font-bold text-white">{nextTask.title}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  {nextTask.questionCount ?? 0} questions · {nextTask.phase} phase ·{' '}
                  {nextTask.targetTopics?.join(', ') || 'Mixed practice'}
                </p>
              </div>
              <Link href={nextTask.type === 'practice_test' ? '/practice-tests' : '/practice'}>
                <Button variant="primary" neon>
                  {nextTask.type === 'practice_test' ? 'Log practice test' : 'Launch block'}
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Domain strength: ranks above, toggleable node graph below */}
        <Card className="mb-8 bg-navy-800/80">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-navy-700 bg-navy-900/60 p-5 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Overall rank</div>
              <div
                className={`mx-auto mt-3 inline-block rounded-full bg-gradient-to-r px-4 py-1.5 text-sm font-black uppercase tracking-wider ${overallColors.gradient} ${overallColors.text}`}
              >
                {profile.overallRank.displayName}
              </div>
              <div className="mt-3 text-3xl font-display font-bold text-neon-blue">{profile.overallElo}</div>
              <div className="mt-1 text-xs text-slate-500">ELO · serves {profile.overallRank.difficultyLabel} questions</div>
            </div>

            {MCAT_SUBJECTS.map((subject) => {
              const sectionProfile = profile.subjects[subject];
              const colors = RANK_COLORS[sectionProfile.rank.rank];
              return (
                <div key={subject} className="rounded-2xl border border-navy-700 bg-navy-900/60 p-5 text-center">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    {SECTION_DISPLAY[subject]} rank
                  </div>
                  <div
                    className={`mx-auto mt-3 inline-block rounded-full bg-gradient-to-r px-4 py-1.5 text-sm font-black uppercase tracking-wider ${colors.gradient} ${colors.text}`}
                  >
                    {sectionProfile.rank.displayName}
                  </div>
                  <div className="mt-3 text-3xl font-display font-bold text-white">{sectionProfile.elo}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    ELO · {SUBJECT_LABELS[subject]}
                  </div>
                </div>
              );
            })}
          </div>

          <DomainRadar states={domainStates} size={400} />
        </Card>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Domains at Gold</div>
            <div className="mt-3 text-5xl font-display font-bold text-yellow-300">
              {goldDomains}
              <span className="text-2xl text-slate-500">/{domainStates.length}</span>
            </div>
            <div className="mt-3 text-sm text-slate-400">Gold = ready for hard questions</div>
          </Card>
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Daily streak</div>
            <div className="mt-3 text-5xl font-display font-bold text-white">{profile.dailyStreak}</div>
            <div className="mt-3 text-sm text-slate-400">{profile.xpMultiplier.toFixed(2)}x XP multiplier</div>
          </Card>
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Latest test scores</div>
            <div className="mt-3 text-lg font-semibold text-white">
              RW {profile.preferences.recentReadingWritingScore ?? '—'}
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              Math {profile.preferences.recentMathScore ?? '—'}
            </div>
          </Card>
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Practice tests logged</div>
            <div className="mt-3 text-5xl font-display font-bold text-white">{profile.practiceTests.length}</div>
            <div className="mt-3 text-sm text-slate-400">
              <Link href="/practice-tests" className="text-neon-blue hover:underline">
                Log a test →
              </Link>
            </div>
          </Card>
        </div>

        <Card className="bg-navy-800/80">
          <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-slate-500">
            Road to Gold — domain priorities
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {domainStates.slice(0, 6).map((state) => {
              const colors = RANK_COLORS[state.rank.rank];
              return (
                <div key={state.chapterId} className="rounded-xl border border-navy-700 bg-navy-900/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-white">{state.domain}</div>
                      <div className="text-xs uppercase tracking-wider text-slate-500">
                        {SECTION_DISPLAY[state.subject]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-block rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${colors.gradient} ${colors.text}`}
                      >
                        {state.rank.displayName}
                      </div>
                      <div className="mt-1 text-sm font-bold text-neon-blue">{state.elo} ELO</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 via-slate-300 to-yellow-300"
                      style={{ width: `${Math.min(100, Math.max(4, ((state.elo - 700) / (GOLD_TARGET_ELO - 700)) * 100))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {state.gapToGold > 0
                      ? `${state.gapToGold} ELO to Gold · ~${state.questionsToGold} questions`
                      : 'Gold reached — maintaining'}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    </div>
  );
}
