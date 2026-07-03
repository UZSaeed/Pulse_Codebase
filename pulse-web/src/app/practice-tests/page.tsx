'use client';

import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUserProfile } from '@/context/UserProfileContext';
import { MCAT_CHAPTERS } from '@/lib/chapters';
import { MCAT_SUBJECTS, SUBJECT_LABELS, type McatSubject } from '@/lib/elo';
import { getPracticeTestDates } from '@/lib/planner';
import { CalendarClock, ClipboardCheck, Loader2 } from 'lucide-react';

type BreakdownDraft = Record<string, { correct: string; total: string }>;

const DEFAULT_TOTALS: Record<McatSubject, number> = {
  // Rough per-domain question counts on a digital SAT section.
  reading_writing: 13,
  math: 11,
};

export default function PracticeTestsPage() {
  const { profile, refreshProfile } = useUserProfile();

  const [takenAt, setTakenAt] = useState(new Date().toISOString().split('T')[0]);
  const [rwScore, setRwScore] = useState('');
  const [mathScore, setMathScore] = useState('');
  const [breakdown, setBreakdown] = useState<BreakdownDraft>({});
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const upcomingTestDates = useMemo(() => {
    const examDateStr = profile.preferences.nextTestDate ?? profile.preferences.preparedByDate;
    if (!examDateStr) return [];
    return getPracticeTestDates(new Date(examDateStr), new Date());
  }, [profile.preferences.nextTestDate, profile.preferences.preparedByDate]);

  const updateBreakdown = (chapterId: string, field: 'correct' | 'total', value: string) => {
    setBreakdown((prev) => ({
      ...prev,
      [chapterId]: {
        correct: field === 'correct' ? value : (prev[chapterId]?.correct ?? ''),
        total: field === 'total' ? value : (prev[chapterId]?.total ?? ''),
      },
    }));
  };

  const submit = async () => {
    setError(null);
    setSaved(false);

    const rw = Number(rwScore);
    const math = Number(mathScore);
    if (!Number.isFinite(rw) || rw < 200 || rw > 800 || !Number.isFinite(math) || math < 200 || math > 800) {
      setError('Enter both section scores (200–800).');
      return;
    }

    const domainBreakdown: Record<string, { correct: number; total: number }> = {};
    for (const subject of MCAT_SUBJECTS) {
      for (const chapter of MCAT_CHAPTERS[subject]) {
        const draft = breakdown[chapter.id];
        if (!draft) continue;
        const correct = Number(draft.correct);
        const total = Number(draft.total || DEFAULT_TOTALS[subject]);
        if (draft.correct === '' || !Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) continue;
        if (correct < 0 || correct > total) {
          setError(`${chapter.name}: correct answers cannot exceed the total.`);
          return;
        }
        domainBreakdown[chapter.id] = { correct, total };
      }
    }

    setSaving(true);
    try {
      const response = await fetch('/api/practice-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          takenAt: `${takenAt}T12:00:00.000Z`,
          readingWritingScore: rw,
          mathScore: math,
          domainBreakdown: Object.keys(domainBreakdown).length > 0 ? domainBreakdown : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save practice test');

      await refreshProfile();
      setSaved(true);
      setRwScore('');
      setMathScore('');
      setBreakdown({});
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save practice test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
        <header className="mb-10">
          <h1 className="mb-2 text-3xl font-display font-bold tracking-tight text-white">Practice tests</h1>
          <p className="max-w-2xl font-medium text-slate-400">
            Log each full-length practice test here. Your section scores and domain breakdown recalibrate your
            Bronze→Gold ratings and reshape the study plan.
          </p>
        </header>

        {upcomingTestDates.length > 0 && (
          <Card neonHighlight className="mb-8 bg-gradient-to-r from-navy-800 to-cyan-950/40">
            <div className="flex items-start gap-4">
              <CalendarClock className="mt-1 h-6 w-6 shrink-0 text-neon-blue" />
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-neon-blue">
                  Final six weeks — weekly test cadence
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Scheduled practice-test days before your exam:{' '}
                  <span className="font-semibold text-white">
                    {upcomingTestDates
                      .map((date) =>
                        new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      )
                      .join(' · ')}
                  </span>
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-navy-800/80">
            <div className="mb-6 flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-neon-blue" />
              <h2 className="text-xl font-display font-bold text-white">Log a practice test</h2>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {saved && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                Saved — your domain ratings and study plan have been recalibrated.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Date taken
                </label>
                <input
                  type="date"
                  value={takenAt}
                  onChange={(event) => setTakenAt(event.target.value)}
                  className="w-full rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Reading &amp; Writing (200–800)
                </label>
                <input
                  type="number"
                  min={200}
                  max={800}
                  step={10}
                  value={rwScore}
                  onChange={(event) => setRwScore(event.target.value)}
                  placeholder="e.g. 610"
                  className="w-full rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Math (200–800)
                </label>
                <input
                  type="number"
                  min={200}
                  max={800}
                  step={10}
                  value={mathScore}
                  onChange={(event) => setMathScore(event.target.value)}
                  placeholder="e.g. 580"
                  className="w-full rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowBreakdown((value) => !value)}
                className="text-xs font-bold uppercase tracking-widest text-neon-blue hover:text-cyan-300"
              >
                {showBreakdown ? '− Hide' : '+ Add'} domain breakdown (optional, sharpens calibration)
              </button>

              {showBreakdown && (
                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {MCAT_SUBJECTS.map((subject) => (
                    <div key={subject}>
                      <div className="mb-3 text-sm font-bold text-white">{SUBJECT_LABELS[subject]}</div>
                      <div className="space-y-3">
                        {MCAT_CHAPTERS[subject].map((chapter) => (
                          <div
                            key={chapter.id}
                            className="rounded-xl border border-navy-700 bg-navy-900/60 p-3"
                          >
                            <div className="mb-2 text-xs font-semibold text-slate-300">{chapter.name}</div>
                            <div className="flex items-center gap-2 text-sm">
                              <input
                                type="number"
                                min={0}
                                value={breakdown[chapter.id]?.correct ?? ''}
                                onChange={(event) => updateBreakdown(chapter.id, 'correct', event.target.value)}
                                placeholder="correct"
                                className="w-24 rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-white outline-none focus:border-neon-blue/50"
                              />
                              <span className="text-slate-500">/</span>
                              <input
                                type="number"
                                min={1}
                                value={breakdown[chapter.id]?.total ?? ''}
                                onChange={(event) => updateBreakdown(chapter.id, 'total', event.target.value)}
                                placeholder={String(DEFAULT_TOTALS[subject])}
                                className="w-24 rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-white outline-none focus:border-neon-blue/50"
                              />
                              <span className="text-xs text-slate-500">questions</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <Button variant="primary" neon onClick={submit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  'Save & recalibrate'
                )}
              </Button>
            </div>
          </Card>

          <Card className="bg-navy-800/80">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-widest text-slate-500">Test history</h2>
            {profile.practiceTests.length === 0 && (
              <p className="text-sm text-slate-500">
                No practice tests logged yet. Your planner schedules one per week in the final six weeks before your
                exam.
              </p>
            )}
            <div className="space-y-3">
              {profile.practiceTests.map((test) => (
                <div key={test.id ?? test.takenAt} className="rounded-xl border border-navy-700 bg-navy-900/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-white">
                      {new Date(test.takenAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-bold text-neon-blue">RW {test.readingWritingScore}</span>
                      <span className="mx-2 text-slate-600">·</span>
                      <span className="font-bold text-emerald-400">Math {test.mathScore}</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Total {test.readingWritingScore + test.mathScore}
                    {test.domainBreakdown ? ' · domain breakdown logged' : ''}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
