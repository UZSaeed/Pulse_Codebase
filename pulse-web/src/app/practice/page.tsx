'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AITutorOverlay } from '@/components/practice/AITutorOverlay';
import { MathGraph } from '@/components/practice/MathGraph';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import { useUserProfile } from '@/context/UserProfileContext';
import { MCAT_CHAPTERS } from '@/lib/chapters';
import { MCAT_SUBJECTS, SUBJECT_LABELS, RANK_COLORS, getTieredRank, type McatSubject, type TieredRankInfo } from '@/lib/elo';
import type { GeneratedQuestion } from '@/lib/ai';
import type { ProcessedSessionResult } from '@/lib/userProfile';
import { ChevronRight, Loader2, Zap, Trophy, TrendingUp, RotateCcw, ArrowRight } from 'lucide-react';

type SessionResult = { question: GeneratedQuestion; userAnswer?: string; correct: boolean };

type HistoryItem = {
  id: number;
  subject: McatSubject;
  topic: string;
  questionCount: number;
  correctCount: number;
  netElo: number;
  timestamp: string;
};

function PracticePageInner() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const autoStart = searchParams.get('autoStart') === 'true';
  const { profile, submitSession, persistSession } = useUserProfile();

  const [selectedSubject, setSelectedSubject] = useState<McatSubject>('reading_writing');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [sessionQuestions, setSessionQuestions] = useState<GeneratedQuestion[]>([]);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    oldRank: TieredRankInfo;
    newRank: TieredRankInfo;
    rankChanged: boolean;
    xpGained: number;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(taskId);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionProcessed, setSessionProcessed] = useState<ProcessedSessionResult | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sat_practice_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (historyError) {
      console.error('Failed to load history', historyError);
    }
  }, []);

  const todaysPendingTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return profile.plannerTasks.filter(
      (task) => task.scheduledDate === today && task.status === 'pending' && task.subject !== 'custom'
    );
  }, [profile.plannerTasks]);

  const todaysCompletedTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return profile.plannerTasks.filter(
      (task) => task.scheduledDate === today && task.status === 'completed'
    );
  }, [profile.plannerTasks]);

  const domains = useMemo(() => {
    return MCAT_CHAPTERS[selectedSubject].map((chapter) => ({
      id: chapter.id,
      name: chapter.name,
      topics: chapter.topics,
    }));
  }, [selectedSubject]);

  const startSession = async (subject: McatSubject, topic: string, count: number, difficultyBand?: string) => {
    setLoading(true);
    setError(null);
    setSessionActive(true);
    setSessionResults([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSessionSaved(false);
    setShowSummary(false);
    setSessionProcessed(null);

    try {
      const body: Record<string, unknown> = {
        subject,
        topic: topic || undefined,
        count,
        targetDifficulty: profile.subjects[subject].elo,
      };
      if (difficultyBand) body.difficultyBand = difficultyBand;

      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate questions');

      const questions = Array.isArray(data.questions) ? data.questions : [data.question];
      setSessionQuestions(questions);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Failed to start session');
      setSessionActive(false);
    } finally {
      setLoading(false);
    }
  };

  const startFromTask = (task: typeof todaysPendingTasks[0]) => {
    const subject = task.subject === 'mixed' ? 'reading_writing' : (task.subject as McatSubject);
    const topic = task.targetTopics?.[0] ?? '';
    setSelectedSubject(subject);
    setSelectedDomain(topic);
    setActiveTaskId(task.id);
    startSession(subject, topic, task.questionCount ?? 8);
  };

  useEffect(() => {
    if (autoStarted) return;
    if (!taskId || !autoStart) return;
    const linkedTask = profile.plannerTasks.find((t) => t.id === taskId);
    if (!linkedTask || linkedTask.subject === 'custom') return;
    setAutoStarted(true);
    startFromTask(linkedTask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, autoStart, profile.plannerTasks, autoStarted]);

  const finishSession = async () => {
    setSessionSaved(true);
    const inputs = sessionResults.map((result) => ({
      subject: result.question.subject,
      questionDifficulty: result.question.difficulty,
      isCorrect: result.correct,
      topic: result.question.topic,
    }));

    const processed = submitSession(inputs, activeTaskId);
    if (activeTaskId) setActiveTaskId(null);

    await persistSession(
      processed,
      selectedSubject,
      sessionResults.map((result) => ({
        questionId: result.question.id || `local-${result.question.topic}`,
        isCorrect: result.correct,
        eloChange: processed.eloChanges[result.question.topic]?.eloDelta ?? 0,
        topicName: result.question.topic,
        subject: result.question.subject,
      }))
    );

    const nextHistory = [
      {
        id: Date.now(),
        subject: selectedSubject,
        topic: selectedDomain || 'Adaptive mix',
        questionCount: sessionQuestions.length,
        correctCount: sessionResults.filter((result) => result.correct).length,
        netElo: processed.totalEloDelta,
        timestamp: new Date().toISOString(),
      },
      ...history,
    ].slice(0, 20);
    setHistory(nextHistory);
    localStorage.setItem('sat_practice_history', JSON.stringify(nextHistory));

    setSessionProcessed(processed);
    setShowSummary(true);

    if (processed.rankChanged || processed.leveledUp) {
      setLevelUpData({
        oldRank: processed.oldRank,
        newRank: processed.newRank,
        rankChanged: processed.rankChanged,
        xpGained: processed.xpGained,
      });
      setShowLevelUp(true);
    }
  };

  const startRedoHarder = () => {
    const currentRank = getTieredRank(profile.subjects[selectedSubject].elo).rank;
    const bandMap: Record<string, string> = { Bronze: 'easy', Silver: 'medium', Gold: 'hard' };
    const bumpMap: Record<string, string> = { easy: 'medium', medium: 'hard', hard: 'hard' };
    const currentBand = bandMap[currentRank] ?? 'easy';
    const harderBand = bumpMap[currentBand];
    startSession(selectedSubject, selectedDomain, sessionQuestions.length, harderBand);
  };

  const currentQuestion = sessionQuestions[currentIndex];
  const sessionComplete =
    sessionActive && currentIndex >= sessionQuestions.length && sessionQuestions.length > 0;

  useEffect(() => {
    if (sessionComplete && !sessionSaved) {
      finishSession().catch((finishError) => console.error('Failed to finish session', finishError));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionComplete, sessionSaved]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-600" />
            <p className="text-sm font-medium text-slate-500">Building your practice set...</p>
          </div>
        </main>
      </div>
    );
  }

  // Active question
  if (sessionActive && currentQuestion && !sessionComplete) {
    const subjectColors = RANK_COLORS[profile.subjects[currentQuestion.subject].rank.rank];
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-600">
                  {SUBJECT_LABELS[currentQuestion.subject]}
                </div>
                <h1 className="mt-2 text-2xl font-black text-slate-900">
                  Question {currentIndex + 1} of {sessionQuestions.length}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{currentQuestion.topic}</p>
              </div>
              <div className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold uppercase tracking-wider ${subjectColors.gradient} ${subjectColors.text}`}>
                {profile.subjects[currentQuestion.subject].rank.displayName}
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all"
                style={{ width: `${(currentIndex / sessionQuestions.length) * 100}%` }}
              />
            </div>

            {currentQuestion.passage && (
              <Card className="bg-white">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Passage</h2>
                <p className="whitespace-pre-line text-slate-700">{currentQuestion.passage}</p>
              </Card>
            )}

            {currentQuestion.graphSpec && <MathGraph spec={currentQuestion.graphSpec} />}

            <Card className="bg-white">
              <h2 className="text-xl font-bold text-slate-900">{currentQuestion.stem}</h2>
              <div className="mt-6 space-y-3">
                {currentQuestion.choices.map((choice) => {
                  const isChosen = selectedAnswer === choice.label;
                  const reveal = selectedAnswer !== null;
                  const isCorrect = currentQuestion.correctAnswer === choice.label;
                  return (
                    <button
                      key={choice.label}
                      onClick={() => {
                        if (selectedAnswer) return;
                        setSelectedAnswer(choice.label);
                        setSessionResults((prev) => [
                          ...prev,
                          {
                            question: currentQuestion,
                            userAnswer: choice.label,
                            correct: choice.label === currentQuestion.correctAnswer,
                          },
                        ]);
                      }}
                      className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                        !reveal
                          ? 'border-slate-200 bg-slate-50 hover:border-cyan-600/40 hover:bg-cyan-50/30'
                          : isCorrect
                            ? 'border-emerald-400 bg-emerald-50'
                            : isChosen
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-200 bg-slate-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-6 font-bold text-cyan-600">{choice.label}.</div>
                        <div className="flex-1 text-slate-700">{choice.text}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedAnswer && (
              <Card className="bg-white">
                <div className="text-sm font-bold uppercase tracking-wider text-cyan-600">Explanation</div>
                <p className="mt-4 text-slate-700">{currentQuestion.explanation}</p>
                <div className="mt-5 space-y-2">
                  {Object.entries(currentQuestion.distractorExplanations || {}).map(([label, explanation]) => (
                    <div key={label} className="text-sm text-slate-500">
                      <span className="font-bold text-slate-700">{label}.</span> {explanation}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSelectedAnswer(null);
                      setCurrentIndex((index) => index + 1);
                    }}
                  >
                    {currentIndex === sessionQuestions.length - 1 ? 'Finish block' : 'Next question'}
                  </Button>
                </div>
              </Card>
            )}

            {selectedAnswer && (
              <AITutorOverlay
                questionStem={currentQuestion.stem}
                explanation={currentQuestion.explanation}
                passage={currentQuestion.passage}
                choices={currentQuestion.choices}
              />
            )}
          </div>
        </main>

        {showLevelUp && levelUpData && (
          <LevelUpOverlay
            show={showLevelUp}
            newRank={levelUpData.newRank}
            oldRank={levelUpData.oldRank}
            rankChanged={levelUpData.rankChanged}
            xpGained={levelUpData.xpGained}
            onDismiss={() => setShowLevelUp(false)}
          />
        )}
      </div>
    );
  }

  // Session summary screen
  if (showSummary && sessionProcessed) {
    const correctCount = sessionResults.filter((r) => r.correct).length;
    const questionCount = sessionQuestions.length;
    const pct = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;
    const scoredWell = pct >= 75;
    const rankInfo = profile.subjects[selectedSubject].rank;
    const rankColors = RANK_COLORS[rankInfo.rank];

    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <img src="/spike-celebrate.png" alt="Spike celebrating" className="mb-4 h-24 w-24 object-contain" />
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Block Complete!</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {SUBJECT_LABELS[selectedSubject]} · {selectedDomain || 'Adaptive mix'}
              </p>
            </div>

            {/* Score */}
            <Card className="bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Score</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">{correctCount}</span>
                    <span className="text-2xl font-bold text-slate-400">/ {questionCount}</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-500">{pct}% correct</div>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50">
                  <Trophy className="h-8 w-8 text-cyan-600" />
                </div>
              </div>
            </Card>

            {/* ELO change */}
            <Card className="bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Rating change</div>
                  <div className={`mt-1 text-3xl font-black ${sessionProcessed.totalEloDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {sessionProcessed.totalEloDelta >= 0 ? '+' : ''}{sessionProcessed.totalEloDelta}
                  </div>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                </div>
              </div>

              {/* Per-topic breakdown */}
              {Object.keys(sessionProcessed.eloChanges).length > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">By topic</div>
                  {Object.entries(sessionProcessed.eloChanges).map(([key, change]) => (
                    <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                      <span className="text-sm font-medium text-slate-700">{change.topic}</span>
                      <span className={`text-sm font-bold ${change.eloDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {change.eloDelta >= 0 ? '+' : ''}{change.eloDelta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Rank & XP */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current rank</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-black uppercase tracking-wider ${rankColors.gradient} ${rankColors.text}`}>
                    {rankInfo.displayName}
                  </div>
                </div>
              </Card>
              <Card className="bg-white">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">XP gained</div>
                <div className="mt-2 text-2xl font-black text-cyan-600">+{sessionProcessed.xpGained} XP</div>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {scoredWell && (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={startRedoHarder}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try harder
                </Button>
              )}
              <Button
                variant={scoredWell ? 'outline' : 'primary'}
                className="flex-1"
                onClick={() => {
                  setSessionActive(false);
                  setShowSummary(false);
                  setSessionProcessed(null);
                  setSessionResults([]);
                  setSessionQuestions([]);
                  setCurrentIndex(0);
                  setSelectedAnswer(null);
                  setSessionSaved(false);
                }}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Back to practice
              </Button>
            </div>
          </div>
        </main>

        {showLevelUp && levelUpData && (
          <LevelUpOverlay
            show={showLevelUp}
            newRank={levelUpData.newRank}
            oldRank={levelUpData.oldRank}
            rankChanged={levelUpData.rankChanged}
            xpGained={levelUpData.xpGained}
            onDismiss={() => setShowLevelUp(false)}
          />
        )}
      </div>
    );
  }

  // Selection screen
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Practice</h1>
          <p className="font-medium text-slate-500">
            {todaysPendingTasks.length > 0
              ? "Start today's block, or pick a topic to practice on your own."
              : "Today's blocks are done! Pick a topic to keep practicing."}
          </p>
        </header>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 text-red-600">
            <div className="font-bold">{error}</div>
          </Card>
        )}

        {/* Today's blocks */}
        {todaysPendingTasks.length > 0 && !showBrowse && (
          <div className="mb-8">
            <div className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Today&apos;s blocks</div>
            <div className="grid gap-4 md:grid-cols-2">
              {todaysPendingTasks.map((task) => {
                const taskSubject = task.subject === 'mixed' ? 'reading_writing' : (task.subject as McatSubject);
                const rankInfo = profile.subjects[taskSubject].rank;
                const rankColors = RANK_COLORS[rankInfo.rank];
                return (
                  <button
                    key={task.id}
                    onClick={() => startFromTask(task)}
                    className="flex items-center gap-4 rounded-2xl border-2 border-cyan-600/20 bg-white p-5 text-left transition-all hover:border-cyan-600/40 hover:squishy-shadow-hover active:scale-[0.99]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50">
                      <Zap className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{task.targetTopics?.[0] ?? task.title}</div>
                      <div className="mt-0.5 text-sm text-slate-500">
                        {task.questionCount ?? 0} questions · {SUBJECT_LABELS[taskSubject]}
                      </div>
                    </div>
                    <div className={`rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${rankColors.gradient} ${rankColors.text}`}>
                      {rankInfo.displayName}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowBrowse(true)}
              className="mt-4 text-sm font-bold text-cyan-600 hover:underline"
            >
              Or pick a different topic →
            </button>
          </div>
        )}

        {todaysCompletedTasks.length > 0 && todaysPendingTasks.length === 0 && !showBrowse && (
          <div className="mb-8">
            <Card className="bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-3">
                <img src="/spike-celebrate.png" alt="Spike celebrating" className="h-16 w-16 object-contain" />
                <div>
                  <div className="font-black text-emerald-700">Nice work today!</div>
                  <p className="text-sm text-emerald-600">You finished all your blocks. Practice more below, or take a well-deserved break.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Browse by subject & domain */}
        {(showBrowse || todaysPendingTasks.length === 0) && (
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="bg-white">
              <div className="mb-4">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-600">Choose a topic</div>
                <h2 className="mt-1 text-xl font-black text-slate-900">Pick what to practice</h2>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-2">
                {MCAT_SUBJECTS.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => {
                      setSelectedSubject(subject);
                      setSelectedDomain('');
                    }}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      selectedSubject === subject
                        ? 'border-cyan-600 bg-cyan-50'
                        : 'border-slate-200 bg-slate-50 hover:border-cyan-600/30'
                    }`}
                  >
                    <div className="text-lg font-bold text-slate-800">{SUBJECT_LABELS[subject]}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {profile.subjects[subject].rank.displayName} · {profile.subjects[subject].elo} rating
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Domain</div>
                <div className="flex flex-wrap gap-2">
                  {domains.map((domain) => (
                    <button
                      key={domain.id}
                      onClick={() => setSelectedDomain(domain.topics[0] ?? '')}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition-all ${
                        selectedDomain && domain.topics.includes(selectedDomain)
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-600'
                          : 'border-slate-200 text-slate-500 hover:border-cyan-600/30'
                      }`}
                    >
                      {domain.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="primary" onClick={() => startSession(selectedSubject, selectedDomain, 8)}>
                  Start practice <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="bg-white">
                <div className="text-sm font-bold uppercase tracking-wider text-slate-400">Recent sessions</div>
                <div className="mt-4 space-y-3">
                  {history.length === 0 && <div className="text-sm text-slate-400">No sessions yet — start one above!</div>}
                  {history.slice(0, 5).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-800">{SUBJECT_LABELS[item.subject]}</div>
                          <div className="text-sm text-slate-500">{item.topic}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-cyan-600">
                            {item.correctCount}/{item.questionCount}
                          </div>
                          <div className={`text-sm font-bold ${item.netElo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {item.netElo >= 0 ? '+' : ''}
                            {item.netElo}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {showLevelUp && levelUpData && (
          <LevelUpOverlay
            show={showLevelUp}
            newRank={levelUpData.newRank}
            oldRank={levelUpData.oldRank}
            rankChanged={levelUpData.rankChanged}
            xpGained={levelUpData.xpGained}
            onDismiss={() => setShowLevelUp(false)}
          />
        )}
      </main>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <PracticePageInner />
    </Suspense>
  );
}
