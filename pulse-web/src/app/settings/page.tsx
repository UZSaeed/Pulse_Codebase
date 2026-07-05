'use client';

import { useEffect, useState } from 'react';
import ReactSlider from 'react-slider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getUserPreferences, saveSettings } from '../actions';
import { useUserProfile } from '@/context/UserProfileContext';
import { MCAT_CHAPTERS } from '@/lib/chapters';

function buildConfidenceFallback() {
  const profile: Record<string, number> = {};
  for (const section of Object.keys(MCAT_CHAPTERS) as Array<keyof typeof MCAT_CHAPTERS>) {
    for (const chapter of MCAT_CHAPTERS[section]) {
      profile[chapter.id] = 3;
    }
  }
  return profile;
}

export default function SettingsPage() {
  const { refreshProfile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasScheduledTest, setHasScheduledTest] = useState(true);
  const [nextTestDate, setNextTestDate] = useState('');
  const [preparedByDate, setPreparedByDate] = useState('');
  const [recentReadingWritingScore, setRecentReadingWritingScore] = useState('');
  const [recentMathScore, setRecentMathScore] = useState('');
  const [confidenceProfile, setConfidenceProfile] = useState<Record<string, number>>(() => buildConfidenceFallback());
  const [thumb1, setThumb1] = useState(35);
  const [thumb2, setThumb2] = useState(80);
  const [qsPerDay, setQsPerDay] = useState({
    rampUp: 16,
    grind: 24,
    lastStretch: 32,
  });

  useEffect(() => {
    getUserPreferences()
      .then((prefs) => {
        if (!prefs) return;
        setHasScheduledTest(prefs.hasScheduledTest ?? true);
        setNextTestDate(prefs.nextTestDate ? new Date(prefs.nextTestDate).toISOString().split('T')[0] : '');
        setPreparedByDate(prefs.preparedByDate ? new Date(prefs.preparedByDate).toISOString().split('T')[0] : '');
        setRecentReadingWritingScore(prefs.recentReadingWritingScore?.toString() ?? '');
        setRecentMathScore(prefs.recentMathScore?.toString() ?? '');
        setConfidenceProfile({
          ...buildConfidenceFallback(),
          ...((prefs.confidenceProfile as Record<string, number> | null) ?? {}),
        });
        setThumb1(prefs.rampUpPercentage ?? 35);
        setThumb2((prefs.rampUpPercentage ?? 35) + (prefs.grindPercentage ?? 45));
        setQsPerDay({
          rampUp: prefs.rampUpQuestionsPerDay ?? 16,
          grind: prefs.grindQuestionsPerDay ?? 24,
          lastStretch: prefs.lastStretchQuestionsPerDay ?? 32,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const rampUpPercentage = thumb1;
  const grindPercentage = thumb2 - thumb1;
  const lastStretchPercentage = 100 - thumb2;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        nextTestDate: hasScheduledTest && nextTestDate ? new Date(nextTestDate) : null,
        preparedByDate: !hasScheduledTest && preparedByDate ? new Date(preparedByDate) : null,
        hasScheduledTest,
        recentReadingWritingScore: recentReadingWritingScore ? Number(recentReadingWritingScore) : null,
        recentMathScore: recentMathScore ? Number(recentMathScore) : null,
        confidenceProfile,
        rampUpPercentage,
        grindPercentage,
        lastStretchPercentage,
        rampUpQuestionsPerDay: qsPerDay.rampUp,
        grindQuestionsPerDay: qsPerDay.grind,
        lastStretchQuestionsPerDay: qsPerDay.lastStretch,
      });
      await refreshProfile();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <header className="mb-10">
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Settings</h1>
          <p className="font-medium text-slate-500">Adjust your test date, scores, confidence levels, and study pace.</p>
        </header>

        {loading ? (
          <div className="text-slate-500">Loading your settings...</div>
        ) : (
          <div className="space-y-8">
            <Card className="bg-white">
              <h2 className="mb-5 text-xl font-black text-slate-900">Goals and recent scores</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex gap-3">
                    <button
                      onClick={() => setHasScheduledTest(true)}
                      className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold ${hasScheduledTest ? 'border-cyan-600 bg-cyan-50 text-cyan-600' : 'border-slate-200 text-slate-400'}`}
                    >
                      Scheduled SAT
                    </button>
                    <button
                      onClick={() => setHasScheduledTest(false)}
                      className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold ${!hasScheduledTest ? 'border-cyan-600 bg-cyan-50 text-cyan-600' : 'border-slate-200 text-slate-400'}`}
                    >
                      Flexible goal
                    </button>
                  </div>
                  <input
                    type="date"
                    value={hasScheduledTest ? nextTestDate : preparedByDate}
                    onChange={(event) => (hasScheduledTest ? setNextTestDate(event.target.value) : setPreparedByDate(event.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={recentReadingWritingScore}
                    onChange={(event) => setRecentReadingWritingScore(event.target.value)}
                    placeholder="RW score"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                  />
                  <input
                    value={recentMathScore}
                    onChange={(event) => setRecentMathScore(event.target.value)}
                    placeholder="Math score"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                  />
                </div>
              </div>
            </Card>

            <Card className="bg-white">
              <h2 className="mb-5 text-xl font-black text-slate-900">How confident are you?</h2>
              <div className="grid gap-5 md:grid-cols-2">
                {Object.entries(MCAT_CHAPTERS).map(([section, chapters]) =>
                  chapters.map((chapter) => (
                    <div key={chapter.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {section === 'reading_writing' ? 'Reading & Writing' : 'Math'}
                      </div>
                      <div className="mt-1 text-lg font-bold text-slate-800">{chapter.name}</div>
                      <div className="mt-4 flex items-center gap-4">
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={confidenceProfile[chapter.id]}
                          onChange={(event) =>
                            setConfidenceProfile((prev) => ({ ...prev, [chapter.id]: Number(event.target.value) }))
                          }
                          className="w-full accent-cyan-600"
                        />
                        <div className="w-12 text-right text-lg font-bold text-cyan-600">{confidenceProfile[chapter.id]}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="bg-white">
              <h2 className="mb-5 text-xl font-black text-slate-900">Study pace</h2>
              <div className="mb-6 text-sm text-slate-500">
                Build {rampUpPercentage}% · Push {grindPercentage}% · Polish {lastStretchPercentage}%
              </div>
              <ReactSlider
                className="relative mt-3 h-8 w-full cursor-pointer"
                thumbClassName="top-[4px] z-10 h-6 w-6 rounded-full border-[3px] border-white bg-cyan-600 squishy-shadow"
                trackClassName="top-[12px] h-3 rounded-full bg-slate-100"
                value={[thumb1, thumb2]}
                min={1}
                max={99}
                minDistance={1}
                onChange={(value) => {
                  setThumb1(value[0]);
                  setThumb2(value[1]);
                }}
              />
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  { key: 'rampUp', label: 'Build' },
                  { key: 'grind', label: 'Push' },
                  { key: 'lastStretch', label: 'Polish' },
                ].map((phase) => (
                  <div key={phase.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-bold uppercase tracking-wider text-slate-400">{phase.label}</div>
                    <div className="mt-2 text-3xl font-black text-slate-800">
                      {qsPerDay[phase.key as keyof typeof qsPerDay]}
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={50}
                      value={qsPerDay[phase.key as keyof typeof qsPerDay]}
                      onChange={(event) =>
                        setQsPerDay((prev) => ({ ...prev, [phase.key]: Number(event.target.value) }))
                      }
                      className="mt-4 w-full accent-cyan-600"
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
