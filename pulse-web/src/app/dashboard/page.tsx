'use client';

import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RadarChart } from '@/components/ui/RadarChart';
import { useUserProfile } from '@/context/UserProfileContext';
import { MCAT_SUBJECTS, SUBJECT_LABELS, RANK_COLORS, type McatSubject } from '@/lib/elo';
import { MCAT_CHAPTERS } from '@/lib/chapters';

const SECTION_CONFIG: Record<McatSubject, { icon: string; gradient: string }> = {
  reading_writing: { icon: 'R', gradient: 'from-cyan-400 to-blue-500' },
  math: { icon: 'M', gradient: 'from-emerald-400 to-lime-500' },
};

const OFFICIAL_BANK_TOTAL = 1184;

export default function DashboardPage() {
  const { profile, loading } = useUserProfile();

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
  const radarData = MCAT_SUBJECTS.map((subject) => ({
    subject,
    label: SUBJECT_LABELS[subject],
    icon: SECTION_CONFIG[subject].icon,
    value: profile.subjects[subject].elo,
    max: 2000,
  }));

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
              Your plan prioritizes weaker SAT domains first, then rotates reinforcement as your section ELO and
              confidence improve.
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
              <Link href="/practice">
                <Button variant="primary" neon>
                  Launch block
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Overall ELO</div>
            <div className="mt-3 text-5xl font-display font-bold text-neon-blue">{profile.overallElo}</div>
            <div className="mt-3 text-sm text-slate-400">{profile.overallRank.displayName} adaptive band</div>
          </Card>
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Daily streak</div>
            <div className="mt-3 text-5xl font-display font-bold text-white">{profile.dailyStreak}</div>
            <div className="mt-3 text-sm text-slate-400">{profile.xpMultiplier.toFixed(2)}x XP multiplier</div>
          </Card>
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Latest scores</div>
            <div className="mt-3 text-lg font-semibold text-white">
              RW {profile.preferences.recentReadingWritingScore ?? '—'}
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              Math {profile.preferences.recentMathScore ?? '—'}
            </div>
          </Card>
          <Card className="bg-navy-800/80">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Official bank</div>
            <div className="mt-3 text-5xl font-display font-bold text-white">{OFFICIAL_BANK_TOTAL}</div>
            <div className="mt-3 text-sm text-slate-400">local SAT question-bank snippets indexed</div>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card className="bg-navy-800/80">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Section balance</h3>
            <RadarChart data={radarData} size={340} />
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {MCAT_SUBJECTS.map((subject) => {
              const section = profile.subjects[subject];
              const colors = RANK_COLORS[section.rank.rank];
              return (
                <Card key={subject} className="bg-navy-800/80">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`bg-gradient-to-r ${SECTION_CONFIG[subject].gradient} bg-clip-text text-lg font-bold text-transparent`}>
                        {SUBJECT_LABELS[subject]}
                      </div>
                      <div className="mt-2 text-3xl font-display font-bold text-white">{section.elo}</div>
                      <div className="mt-2 text-sm text-slate-400">
                        Confidence {section.confidence.toFixed(1)} / 5 · {MCAT_CHAPTERS[subject].length} major domains
                      </div>
                    </div>
                    <div className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold uppercase tracking-wider ${colors.gradient} ${colors.text}`}>
                      {section.rank.displayName}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="bg-navy-800/80">
          <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-slate-500">Domain priorities</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {MCAT_SUBJECTS.map((subject) =>
              Object.entries(profile.subjects[subject].topics)
                .sort((a, b) => a[1].elo - b[1].elo)
                .slice(0, 3)
                .map(([topic, topicState]) => (
                  <div key={`${subject}-${topic}`} className="rounded-xl border border-navy-700 bg-navy-900/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-white">{topic}</div>
                        <div className="text-xs uppercase tracking-wider text-slate-500">{SUBJECT_LABELS[subject]}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-neon-blue">{topicState.elo} ELO</div>
                        <div className="text-xs text-slate-500">Confidence {topicState.confidence.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
