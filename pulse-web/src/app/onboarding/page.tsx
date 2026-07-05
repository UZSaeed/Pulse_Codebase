'use client';

import { useMemo, useState } from 'react';
import ReactSlider from 'react-slider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { submitOnboarding } from '../actions';
import { MCAT_CHAPTERS } from '@/lib/chapters';

function buildDefaultConfidenceProfile() {
  const profile: Record<string, number> = {};
  for (const subject of Object.keys(MCAT_CHAPTERS) as Array<keyof typeof MCAT_CHAPTERS>) {
    for (const chapter of MCAT_CHAPTERS[subject]) {
      profile[chapter.id] = 3;
    }
  }
  return profile;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasScheduledTest, setHasScheduledTest] = useState(true);
  const [nextTestDate, setNextTestDate] = useState('');
  const [preparedByDate, setPreparedByDate] = useState('');
  const [recentReadingWritingScore, setRecentReadingWritingScore] = useState('');
  const [recentMathScore, setRecentMathScore] = useState('');
  const [confidenceProfile, setConfidenceProfile] = useState<Record<string, number>>(() => buildDefaultConfidenceProfile());
  const [thumb1, setThumb1] = useState(35);
  const [thumb2, setThumb2] = useState(80);
  const [qsPerDay, setQsPerDay] = useState({
    rampUp: 16,
    grind: 24,
    lastStretch: 32,
  });

  const rampUpPercentage = thumb1;
  const grindPercentage = thumb2 - thumb1;
  const lastStretchPercentage = 100 - thumb2;

  const targetDateLabel = useMemo(() => {
    const raw = hasScheduledTest ? nextTestDate : preparedByDate;
    if (!raw) return "We'll default to a 12-week plan.";
    return new Date(raw).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [hasScheduledTest, nextTestDate, preparedByDate]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await submitOnboarding({
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
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <Card className="w-full bg-white p-8">
          {step === 0 && (
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col justify-center">
                <div className="mb-4 text-xs font-bold uppercase tracking-wider text-cyan-600">SpikePrep</div>
                <h1 className="mb-4 text-4xl font-black text-slate-900 md:text-5xl">Let&apos;s build your study plan.</h1>
                <p className="max-w-xl text-lg leading-relaxed text-slate-500">
                  Tell Spike about your goals and where you feel strong or need help. We&apos;ll create a personalized plan that focuses on your weak spots first.
                </p>
                <div className="mt-8 flex gap-3">
                  <Button variant="primary" size="lg" onClick={() => setStep(1)}>
                    Let&apos;s go!
                  </Button>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-3xl bg-cyan-50 p-8">
                <img src="/spike-mascot.png" alt="Spike" className="h-40 w-40 object-contain mb-6" />
                <div className="text-center">
                  <div className="font-black text-slate-800 text-lg">Hi, I&apos;m Spike!</div>
                  <p className="mt-2 text-sm text-slate-600">I&apos;ll help you figure out the best way to prep. Let&apos;s get started!</p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-900">When&apos;s your test?</h2>
                <p className="mt-2 text-slate-500">And what were your last scores, if you have them?</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-slate-50">
                  <div className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Timing</div>
                  <div className="mb-4 flex gap-3">
                    <button
                      onClick={() => setHasScheduledTest(true)}
                      className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold ${hasScheduledTest ? 'border-cyan-600 bg-cyan-50 text-cyan-600' : 'border-slate-200 text-slate-400'}`}
                    >
                      I have a test date
                    </button>
                    <button
                      onClick={() => setHasScheduledTest(false)}
                      className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold ${!hasScheduledTest ? 'border-cyan-600 bg-cyan-50 text-cyan-600' : 'border-slate-200 text-slate-400'}`}
                    >
                      Just want to be ready
                    </button>
                  </div>
                  <input
                    type="date"
                    value={hasScheduledTest ? nextTestDate : preparedByDate}
                    onChange={(event) => (hasScheduledTest ? setNextTestDate(event.target.value) : setPreparedByDate(event.target.value))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                  />
                  <p className="mt-3 text-sm text-slate-400">{targetDateLabel}</p>
                </Card>

                <Card className="bg-slate-50">
                  <div className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Recent SAT scores</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Reading & Writing</label>
                      <input
                        inputMode="numeric"
                        placeholder="e.g. 610"
                        value={recentReadingWritingScore}
                        onChange={(event) => setRecentReadingWritingScore(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Math</label>
                      <input
                        inputMode="numeric"
                        placeholder="e.g. 570"
                        value={recentMathScore}
                        onChange={(event) => setRecentMathScore(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setStep(2)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-900">How confident do you feel?</h2>
                <p className="mt-2 text-slate-500">
                  Rate each area so Spike knows where to focus your practice.
                </p>
              </div>

              {(recentReadingWritingScore || recentMathScore) && (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-800">
                  Since you entered your SAT scores, we&apos;ll use those for your starting level. These confidence ratings help Spike prioritize which domains to focus on first.
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                {Object.entries(MCAT_CHAPTERS).map(([subject, chapters]) =>
                  chapters.map((chapter) => (
                    <Card key={chapter.id} className="bg-slate-50">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        {subject === 'reading_writing' ? 'Reading & Writing' : 'Math'}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{chapter.name}</h3>
                      <p className="mt-2 text-sm text-slate-400">{chapter.topics.slice(0, 3).join(', ')}{chapter.topics.length > 3 ? ', ...' : ''}</p>
                      <div className="mt-5 flex items-center gap-4">
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
                    </Card>
                  ))
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setStep(3)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-900">How hard do you want to go?</h2>
                <p className="mt-2 text-slate-500">Set your daily practice volume for each phase of your prep.</p>
              </div>

              <Card className="bg-slate-50">
                <div className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                  Phase distribution ({rampUpPercentage}% / {grindPercentage}% / {lastStretchPercentage}%)
                </div>
                <ReactSlider
                  className="relative mt-4 h-8 w-full cursor-pointer"
                  thumbClassName="top-[4px] z-10 h-6 w-6 rounded-full border-[3px] border-white bg-cyan-600 squishy-shadow"
                  trackClassName="top-[12px] h-3 rounded-full bg-slate-100"
                  value={[thumb1, thumb2]}
                  min={1}
                  max={99}
                  step={1}
                  minDistance={1}
                  onChange={(value) => {
                    setThumb1(value[0]);
                    setThumb2(value[1]);
                  }}
                />
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-500">Build</div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{rampUpPercentage}%</div>
                  </div>
                  <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-purple-500">Push</div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{grindPercentage}%</div>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Polish</div>
                    <div className="mt-2 text-2xl font-black text-slate-800">{lastStretchPercentage}%</div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { key: 'rampUp', label: 'Build', color: 'text-blue-500' },
                  { key: 'grind', label: 'Push', color: 'text-purple-500' },
                  { key: 'lastStretch', label: 'Polish', color: 'text-amber-500' },
                ].map((phase) => (
                  <Card key={phase.key} className="bg-slate-50">
                    <div className={`text-sm font-bold uppercase tracking-wider ${phase.color}`}>{phase.label}</div>
                    <div className="mt-3 text-4xl font-black text-slate-800">
                      {qsPerDay[phase.key as keyof typeof qsPerDay]}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">questions per day</div>
                    <input
                      type="range"
                      min={8}
                      max={50}
                      value={qsPerDay[phase.key as keyof typeof qsPerDay]}
                      onChange={(event) =>
                        setQsPerDay((prev) => ({
                          ...prev,
                          [phase.key]: Number(event.target.value),
                        }))
                      }
                      className="mt-5 w-full accent-cyan-600"
                    />
                  </Card>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={loading}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={loading}>
                  {loading ? 'Building your plan...' : "Let's go!"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
