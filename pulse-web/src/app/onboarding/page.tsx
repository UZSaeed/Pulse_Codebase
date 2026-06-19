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
    if (!raw) return 'We will default to a 12-week plan.';
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
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-6 text-slate-200">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <Card className="w-full bg-navy-800/90 p-8 backdrop-blur-xl">
          {step === 0 && (
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex flex-col justify-center">
                <div className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-neon-blue">Spike SAT Prep</div>
                <h1 className="mb-4 text-5xl font-display font-bold text-white">Let&apos;s build your SAT game plan.</h1>
                <p className="max-w-xl text-lg leading-relaxed text-slate-400">
                  We&apos;ll use your goals, recent scores, and domain confidence to prioritize the weakest skills first and
                  automatically shape your day-by-day practice schedule.
                </p>
                <div className="mt-8 flex gap-3">
                  <Button variant="primary" neon size="lg" onClick={() => setStep(1)}>
                    Start setup
                  </Button>
                </div>
              </div>
              <div className="rounded-3xl border border-neon-blue/20 bg-neon-blue/5 p-6">
                <div className="mb-4 text-sm font-bold uppercase tracking-widest text-neon-blue">What changes in the SAT version</div>
                <ul className="space-y-4 text-sm text-slate-300">
                  <li>Reading & Writing and Math are tracked independently, with domain-level confidence and ELO.</li>
                  <li>Bronze, Silver, and Gold tiers control easy, medium, and hard practice automatically.</li>
                  <li>Official SAT question-bank PDFs seed the app&apos;s local knowledge layer for generation and retrieval.</li>
                  <li>Your planner rotates from weakest domains to stronger ones as you improve instead of splitting time evenly.</li>
                </ul>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-display font-bold text-white">Target date and recent scores</h2>
                <p className="mt-2 text-slate-400">Tell us when you&apos;re aiming to be ready and what your latest SAT breakdown looks like.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-navy-900/60">
                  <div className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Timing</div>
                  <div className="mb-4 flex gap-3">
                    <button
                      onClick={() => setHasScheduledTest(true)}
                      className={`rounded-xl border px-4 py-3 text-sm font-bold ${hasScheduledTest ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-navy-700 text-slate-400'}`}
                    >
                      I have a test date
                    </button>
                    <button
                      onClick={() => setHasScheduledTest(false)}
                      className={`rounded-xl border px-4 py-3 text-sm font-bold ${!hasScheduledTest ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-navy-700 text-slate-400'}`}
                    >
                      I just want to be ready
                    </button>
                  </div>
                  <input
                    type="date"
                    value={hasScheduledTest ? nextTestDate : preparedByDate}
                    onChange={(event) => (hasScheduledTest ? setNextTestDate(event.target.value) : setPreparedByDate(event.target.value))}
                    className="w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                  />
                  <p className="mt-3 text-sm text-slate-500">{targetDateLabel}</p>
                </Card>

                <Card className="bg-navy-900/60">
                  <div className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Recent SAT performance</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Reading & Writing</label>
                      <input
                        inputMode="numeric"
                        placeholder="e.g. 610"
                        value={recentReadingWritingScore}
                        onChange={(event) => setRecentReadingWritingScore(event.target.value)}
                        className="w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Math</label>
                      <input
                        inputMode="numeric"
                        placeholder="e.g. 570"
                        value={recentMathScore}
                        onChange={(event) => setRecentMathScore(event.target.value)}
                        className="w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button variant="primary" neon onClick={() => setStep(2)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-display font-bold text-white">Confidence by SAT domain</h2>
                <p className="mt-2 text-slate-400">
                  Rate how confident you feel right now. We&apos;ll combine this with your scores to seed the first adaptive plan.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {Object.entries(MCAT_CHAPTERS).map(([subject, chapters]) =>
                  chapters.map((chapter) => (
                    <Card key={chapter.id} className="bg-navy-900/60">
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        {subject === 'reading_writing' ? 'Reading & Writing' : 'Math'}
                      </div>
                      <h3 className="text-lg font-bold text-white">{chapter.name}</h3>
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
                          className="w-full accent-cyan-400"
                        />
                        <div className="w-12 text-right text-lg font-bold text-neon-blue">{confidenceProfile[chapter.id]}</div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" neon onClick={() => setStep(3)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-display font-bold text-white">Schedule intensity</h2>
                <p className="mt-2 text-slate-400">Set how your daily workload should ramp up as the test approaches.</p>
              </div>

              <Card className="bg-navy-900/60">
                <div className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
                  Phase distribution ({rampUpPercentage}% / {grindPercentage}% / {lastStretchPercentage}%)
                </div>
                <ReactSlider
                  className="relative mt-4 h-8 w-full cursor-pointer"
                  thumbClassName="top-[4px] z-10 h-6 w-6 rounded-full border-[3px] border-white bg-neon-blue shadow-[0_0_10px_rgba(0,216,232,0.6)]"
                  trackClassName="top-[12px] h-3 rounded-full bg-navy-700"
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
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-blue-300">Build</div>
                    <div className="mt-2 text-2xl font-display font-bold text-white">{rampUpPercentage}%</div>
                  </div>
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-purple-300">Push</div>
                    <div className="mt-2 text-2xl font-display font-bold text-white">{grindPercentage}%</div>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-300">Polish</div>
                    <div className="mt-2 text-2xl font-display font-bold text-white">{lastStretchPercentage}%</div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { key: 'rampUp', label: 'Build', color: 'text-blue-300' },
                  { key: 'grind', label: 'Push', color: 'text-purple-300' },
                  { key: 'lastStretch', label: 'Polish', color: 'text-amber-300' },
                ].map((phase) => (
                  <Card key={phase.key} className="bg-navy-900/60">
                    <div className={`text-sm font-bold uppercase tracking-widest ${phase.color}`}>{phase.label}</div>
                    <div className="mt-3 text-4xl font-display font-bold text-white">
                      {qsPerDay[phase.key as keyof typeof qsPerDay]}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-slate-500">questions per day</div>
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
                      className="mt-5 w-full accent-cyan-400"
                    />
                  </Card>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={loading}>
                  Back
                </Button>
                <Button variant="primary" neon onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Launch my SAT plan'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
