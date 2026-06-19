'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AITutorOverlay } from '@/components/practice/AITutorOverlay';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import { useUserProfile } from '@/context/UserProfileContext';
import { MCAT_CHAPTERS } from '@/lib/chapters';
import { MCAT_SUBJECTS, SUBJECT_LABELS, RANK_COLORS, type McatSubject, type TieredRankInfo } from '@/lib/elo';
import type { GeneratedQuestion } from '@/lib/ai';
import { ChevronRight, Loader2 } from 'lucide-react';

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
  const { profile, submitSession, persistSession, togglePlannerTask } = useUserProfile();

  const [selectedSubject, setSelectedSubject] = useState<McatSubject>('reading_writing');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(8);
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sat_practice_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (historyError) {
      console.error('Failed to load history', historyError);
    }
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const linkedTask = profile.plannerTasks.find((task) => task.id === taskId);
    if (!linkedTask || linkedTask.subject === 'custom') return;
    setSelectedSubject(linkedTask.subject === 'mixed' ? 'reading_writing' : (linkedTask.subject as McatSubject));
    setSelectedTopic(linkedTask.targetTopics?.[0] ?? '');
    setQuestionCount(linkedTask.questionCount ?? 8);
  }, [profile.plannerTasks, taskId]);

  const topics = useMemo(() => {
    return MCAT_CHAPTERS[selectedSubject].flatMap((chapter) => chapter.topics);
  }, [selectedSubject]);

  const startSession = async (subject: McatSubject, topic: string, count: number) => {
    setLoading(true);
    setError(null);
    setSessionActive(true);
    setSessionResults([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setSessionSaved(false);

    try {
      const response = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          topic: topic || undefined,
          count,
          targetDifficulty: profile.subjects[subject].elo,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate SAT questions');

      const questions = Array.isArray(data.questions) ? data.questions : [data.question];
      setSessionQuestions(questions);
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Failed to start session');
      setSessionActive(false);
    } finally {
      setLoading(false);
    }
  };

  const finishSession = async () => {
    setSessionSaved(true);
    const inputs = sessionResults.map((result) => ({
      subject: result.question.subject,
      questionDifficulty: result.question.difficulty,
      isCorrect: result.correct,
      topic: result.question.topic,
    }));

    const processed = submitSession(inputs);
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
        topic: selectedTopic || 'Adaptive mix',
        questionCount: sessionQuestions.length,
        correctCount: sessionResults.filter((result) => result.correct).length,
        netElo: processed.totalEloDelta,
        timestamp: new Date().toISOString(),
      },
      ...history,
    ].slice(0, 20);
    setHistory(nextHistory);
    localStorage.setItem('sat_practice_history', JSON.stringify(nextHistory));

    if (activeTaskId) {
      togglePlannerTask(activeTaskId);
      setActiveTaskId(null);
    }

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

  const currentQuestion = sessionQuestions[currentIndex];
  const sessionComplete =
    sessionActive && currentIndex >= sessionQuestions.length && sessionQuestions.length > 0;

  useEffect(() => {
    if (sessionComplete && !sessionSaved) {
      finishSession().catch((finishError) => console.error('Failed to finish session', finishError));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionComplete, sessionSaved]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center bg-navy-900">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-neon-blue" />
            <p className="text-sm text-slate-400">Building your SAT practice set...</p>
          </div>
        </main>
      </div>
    );
  }

  if (sessionActive && currentQuestion && !sessionComplete) {
    const subjectColors = RANK_COLORS[profile.subjects[currentQuestion.subject].rank.rank];
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-neon-blue">
                  {SUBJECT_LABELS[currentQuestion.subject]}
                </div>
                <h1 className="mt-2 text-2xl font-display font-bold text-white">
                  Question {currentIndex + 1} of {sessionQuestions.length}
                </h1>
                <p className="mt-1 text-sm text-slate-400">{currentQuestion.topic}</p>
              </div>
              <div className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold uppercase tracking-wider ${subjectColors.gradient} ${subjectColors.text}`}>
                {profile.subjects[currentQuestion.subject].rank.displayName}
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full border border-navy-700 bg-navy-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-blue to-cyan-400 transition-all"
                style={{ width: `${(currentIndex / sessionQuestions.length) * 100}%` }}
              />
            </div>

            {currentQuestion.passage && (
              <Card className="bg-navy-800/80">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Passage</h2>
                <p className="whitespace-pre-line text-slate-200">{currentQuestion.passage}</p>
              </Card>
            )}

            <Card className="bg-navy-800/80">
              <h2 className="text-xl font-semibold text-white">{currentQuestion.stem}</h2>
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
                      className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                        !reveal
                          ? 'border-navy-700 bg-navy-900/70 hover:border-neon-blue/40'
                          : isCorrect
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : isChosen
                              ? 'border-red-500 bg-red-500/10'
                              : 'border-navy-700 bg-navy-900/50 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-6 font-bold text-neon-blue">{choice.label}.</div>
                        <div className="flex-1 text-slate-200">{choice.text}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {selectedAnswer && (
              <Card className="bg-navy-800/80">
                <div className="text-sm font-bold uppercase tracking-widest text-neon-blue">Explanation</div>
                <p className="mt-4 text-slate-200">{currentQuestion.explanation}</p>
                <div className="mt-5 space-y-2">
                  {Object.entries(currentQuestion.distractorExplanations || {}).map(([label, explanation]) => (
                    <div key={label} className="text-sm text-slate-400">
                      <span className="font-bold text-white">{label}.</span> {explanation}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    neon
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
        <header className="mb-10">
          <h1 className="mb-2 text-3xl font-display font-bold tracking-tight text-white">SAT practice hub</h1>
          <p className="font-medium text-slate-400">
            Launch section-specific drills, follow today&apos;s planner block, and let the app adapt difficulty through Bronze, Silver, and Gold bands.
          </p>
        </header>

        {error && (
          <Card className="mb-6 border-red-500/20 bg-red-500/10 text-red-200">
            <div className="font-semibold">{error}</div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="bg-navy-800/80">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-neon-blue">Adaptive builder</div>
                <h2 className="mt-2 text-2xl font-display font-bold text-white">Create a focused SAT block</h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {MCAT_SUBJECTS.map((subject) => (
                <button
                  key={subject}
                  onClick={() => {
                    setSelectedSubject(subject);
                    setSelectedTopic('');
                  }}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    selectedSubject === subject
                      ? 'border-neon-blue bg-neon-blue/10'
                      : 'border-navy-700 bg-navy-900/70 hover:border-neon-blue/30'
                  }`}
                >
                  <div className="text-lg font-bold text-white">{SUBJECT_LABELS[subject]}</div>
                  <div className="mt-2 text-sm text-slate-400">
                    {profile.subjects[subject].elo} ELO · {profile.subjects[subject].rank.displayName}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Domain focus</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTopic('')}
                  className={`rounded-full border px-3 py-2 text-xs font-bold ${selectedTopic === '' ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-navy-700 text-slate-400'}`}
                >
                  Adaptive mix
                </button>
                {topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold ${selectedTopic === topic ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-navy-700 text-slate-400'}`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Questions per block</div>
              <input
                type="range"
                min={4}
                max={20}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="mt-2 text-sm text-slate-400">{questionCount} questions</div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button variant="primary" neon onClick={() => startSession(selectedSubject, selectedTopic, questionCount)}>
                Start adaptive block <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="bg-navy-800/80">
              <div className="text-sm font-bold uppercase tracking-widest text-slate-500">Today&apos;s planner focus</div>
              {profile.plannerTasks
                .filter((task) => task.status === 'pending')
                .slice(0, 4)
                .map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setSelectedSubject(task.subject === 'mixed' ? 'reading_writing' : (task.subject as McatSubject));
                      setSelectedTopic(task.targetTopics?.[0] ?? '');
                      setQuestionCount(task.questionCount ?? 8);
                      setActiveTaskId(task.id);
                      startSession(task.subject === 'mixed' ? 'reading_writing' : (task.subject as McatSubject), task.targetTopics?.[0] ?? '', task.questionCount ?? 8);
                    }}
                    className="mt-4 w-full rounded-xl border border-navy-700 bg-navy-900/70 p-4 text-left transition-all hover:border-neon-blue/30"
                  >
                    <div className="font-bold text-white">{task.title}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {task.questionCount ?? 0} questions · {task.targetTopics?.join(', ') || 'Mixed'}
                    </div>
                  </button>
                ))}
            </Card>

            <Card className="bg-navy-800/80">
              <div className="text-sm font-bold uppercase tracking-widest text-slate-500">Recent sessions</div>
              <div className="mt-4 space-y-3">
                {history.length === 0 && <div className="text-sm text-slate-500">No practice sessions yet.</div>}
                {history.map((item) => (
                  <div key={item.id} className="rounded-xl border border-navy-700 bg-navy-900/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{SUBJECT_LABELS[item.subject]}</div>
                        <div className="text-sm text-slate-400">{item.topic}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-neon-blue">
                          {item.correctCount}/{item.questionCount}
                        </div>
                        <div className={`text-sm ${item.netElo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {item.netElo >= 0 ? '+' : ''}
                          {item.netElo} ELO
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

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
    <Suspense fallback={<div className="min-h-screen bg-navy-900" />}>
      <PracticePageInner />
    </Suspense>
  );
}
