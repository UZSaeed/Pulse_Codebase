'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useConfetti } from '@/hooks/useConfetti';
import { playCorrectSound } from '@/lib/sounds';
import CountUp from 'react-countup';
import { MCAT_CHAPTERS } from '@/lib/chapters';
import { SUBJECT_LABELS, type McatSubject, MCAT_SUBJECTS, RANK_COLORS } from '@/lib/elo';
import { getSessionQuestions, type DummyQuestion } from '@/lib/dummy-questions';
import {
  Loader2,
  Send,
  MessageCircle,
  Zap,
  ChevronRight,
  BookOpen,
  Trophy,
  ChevronDown,
  Flame,
  RotateCcw,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Flag,
} from 'lucide-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import { AITutorOverlay } from '@/components/practice/AITutorOverlay';

// ─── Constants ───────────────────────────────────────────────────

const SUBJECT_CONFIG: Record<McatSubject, { label: string; gradient: string; icon: string }> = {
  chem_phys: { label: 'Chem/Phys', gradient: 'from-blue-500 to-cyan-400', icon: '⚗️' },
  cars: { label: 'CARS', gradient: 'from-purple-500 to-pink-400', icon: '📖' },
  bio_biochem: { label: 'Bio/Biochem', gradient: 'from-green-500 to-emerald-400', icon: '🧬' },
  psych_soc: { label: 'Psych/Soc', gradient: 'from-orange-500 to-yellow-400', icon: '🧠' },
};



// "Today's section" is determined dynamically (rotate daily)
function getTodaySubject(): McatSubject {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return MCAT_SUBJECTS[dayOfYear % 4];
}

// ─── Component ───────────────────────────────────────────────────

export default function PracticePage() {
  const todaySubject = getTodaySubject();
  const { fireConfetti } = useConfetti();
  const { profile } = useUserProfile();

  // Level-up overlay state
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpRank, setLevelUpRank] = useState(profile.overallRank);
  const [levelUpXp, setLevelUpXp] = useState(0);
  const [levelUpRankChanged, setLevelUpRankChanged] = useState(false);
  const [levelUpOldRank, setLevelUpOldRank] = useState(profile.overallRank);

  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSubject, setSessionSubject] = useState<McatSubject | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<DummyQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Manual mode selection
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualSubject, setManualSubject] = useState<McatSubject | null>(null);
  const [manualChapter, setManualChapter] = useState<string | undefined>(undefined);
  const [manualCount, setManualCount] = useState(5);
  const [manualTopics, setManualTopics] = useState<string[]>([]);

  const [draftAnswer, setDraftAnswer] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionResults, setSessionResults] = useState<{ question: DummyQuestion; userAnswer?: string; correct: boolean }[]>([]);

  // Review mode
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewChatOpen, setReviewChatOpen] = useState(false);
  const [reviewChatMessages, setReviewChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [reviewChatInput, setReviewChatInput] = useState('');
  const [reviewChatLoading, setReviewChatLoading] = useState(false);

  // Practice history
  type PracticeSession = {
    id: number;
    subject: McatSubject;
    questions: DummyQuestion[];
    results: { question: DummyQuestion; userAnswer?: string; correct: boolean }[];
    correctCount: number;
    netElo: number;
    timestamp: Date;
  };
  const [practiceHistory, setPracticeHistory] = useState<PracticeSession[]>([]);

  // View past session report
  const [viewingPastSession, setViewingPastSession] = useState<PracticeSession | null>(null);

  // Explain chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Flag Modal state
  const [flagModalQuestionId, setFlagModalQuestionId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('inaccurate');
  const [flagDetails, setFlagDetails] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

  const submitFlag = async () => {
    if (!flagModalQuestionId) return;
    setIsSubmittingFlag(true);
    try {
      await fetch('/api/questions/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: flagModalQuestionId,
          userId: profile.id || 'anonymous_user',
          reason: flagReason,
          details: flagDetails,
        })
      });
    } finally {
      setIsSubmittingFlag(false);
      setFlagModalQuestionId(null);
      setFlagReason('inaccurate');
      setFlagDetails('');
    }
  };

  const renderFlagModal = () => {
    if (!flagModalQuestionId) return null;
    return (
      <div className="fixed inset-0 z-[100] bg-navy-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-navy-800 border-navy-700 p-6 flex flex-col shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-2">Flag Question</h2>
          <p className="text-slate-400 text-sm mb-6">Help us improve by telling us what is wrong with this question.</p>
          
          <div className="space-y-4 mb-6">
            <select 
              value={flagReason} 
              onChange={e => setFlagReason(e.target.value)}
              className="w-full bg-navy-900 border border-navy-700 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue/50"
            >
              <option value="inaccurate">Inaccurate / Wrong Answer</option>
              <option value="poor_visual">Poor or confusing visual</option>
              <option value="weird_wording">Weird or confusing wording</option>
              <option value="too_easy">Way too easy / hard</option>
              <option value="other">Other</option>
            </select>
            
            <textarea 
              value={flagDetails}
              onChange={e => setFlagDetails(e.target.value)}
              placeholder="Provide specific details (optional but helpful)..."
              className="w-full bg-navy-900 border border-navy-700 rounded-lg p-3 text-white focus:outline-none focus:border-neon-blue/50 h-32 resize-none text-sm"
            />
          </div>
          
          <div className="flex gap-3 justify-end mt-auto">
            <Button variant="ghost" onClick={() => setFlagModalQuestionId(null)} disabled={isSubmittingFlag}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitFlag} disabled={isSubmittingFlag}>
              {isSubmittingFlag ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  // Animated progress bar
  const [progressWidth, setProgressWidth] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sessionActive && sessionQuestions.length > 0) {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      progressTimerRef.current = setTimeout(() => {
        setProgressWidth(((currentIndex + (selectedAnswer ? 1 : 0)) / sessionQuestions.length) * 100);
      }, 100);
    }
    return () => { if (progressTimerRef.current) clearTimeout(progressTimerRef.current); };
  }, [currentIndex, selectedAnswer, sessionActive, sessionQuestions.length]);

  // ─── Handlers ──────────────────────────────────────────────

  const startSession = useCallback((subject: McatSubject, count: number, chapterId?: string, topics?: string[]) => {
    const questions = getSessionQuestions(subject, count, chapterId, topics);
    if (questions.length === 0) return;
    setSessionSubject(subject);
    setSessionQuestions(questions);
    setCurrentIndex(0);
    setDraftAnswer(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCorrectCount(0);
    setSessionResults([]);
    setChatOpen(false);
    setChatMessages([]);
    setProgressWidth(0);
    setSessionActive(true);
    setShowManualModal(false);
  }, []);

  const submitAnswer = useCallback((label: string | null = null) => {
    const finalAnswer = label || draftAnswer;
    if (!finalAnswer || selectedAnswer || sessionQuestions.length === 0) return;
    setSelectedAnswer(finalAnswer);

    const question = sessionQuestions[currentIndex];
    const correct = finalAnswer === question.correctAnswer;

    if (correct) {
      setCorrectCount((c) => c + 1);
      playCorrectSound();
      fireConfetti();
    }

    setSessionResults((prev) => [...prev, { question, userAnswer: finalAnswer, correct }]);
    setShowExplanation(true);
  }, [draftAnswer, selectedAnswer, sessionQuestions, currentIndex, fireConfetti]);

  const handleSkipQuestion = useCallback(() => {
    if (selectedAnswer || sessionQuestions.length === 0) return;
    const question = sessionQuestions[currentIndex];
    setSelectedAnswer('SKIP');
    
    // Marked as incorrect
    setSessionResults((prev) => [...prev, { question, userAnswer: 'SKIP', correct: false }]);
    setShowExplanation(true);
  }, [selectedAnswer, sessionQuestions, currentIndex]);

  const nextQuestion = useCallback(() => {
    setCurrentIndex((i) => i + 1);
    setDraftAnswer(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setChatOpen(false);
    setChatMessages([]);
  }, []);

  const exitSession = useCallback(() => {
    setSessionActive(false);
    setSessionSubject(null);
    setSessionQuestions([]);
    setCurrentIndex(0);
    setDraftAnswer(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setSessionResults([]);
    setProgressWidth(0);
    setChatOpen(false);
  }, []);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || sessionQuestions.length === 0) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/questions/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionStem: sessionQuestions[currentIndex].stem,
          explanation: sessionQuestions[currentIndex].explanation,
          userMessage: userMsg,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', text: data.reply || data.error || 'Could not generate response.' }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Make sure your OPENAI_API_KEY is configured in .env.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, sessionQuestions, currentIndex]);

  // ─── Helper: compute ELO changes ─────────────────────────

  const computeEloChanges = (results: { question: DummyQuestion; userAnswer?: string; correct: boolean }[]) => {
    const topicEloChanges: Record<string, { topicName: string; subject: McatSubject; gained: number; lost: number; net: number }> = {};
    results.forEach(({ question, correct }) => {
      if (!topicEloChanges[question.topic]) {
        topicEloChanges[question.topic] = { topicName: question.topic, subject: question.subject, gained: 0, lost: 0, net: 0 };
      }
      const eloDelta = correct ? 15 : -10;
      if (correct) topicEloChanges[question.topic].gained += eloDelta;
      else topicEloChanges[question.topic].lost += Math.abs(eloDelta);
      topicEloChanges[question.topic].net += eloDelta;
    });
    const netTotal = Object.values(topicEloChanges).reduce((sum, t) => sum + t.net, 0);
    return { topicEloChanges, netTotal };
  };

  // ─── Save session to history on completion ────────────────

  const saveToHistory = useCallback(() => {
    if (!sessionSubject || sessionResults.length === 0) return;
    const { netTotal } = computeEloChanges(sessionResults);
    setPracticeHistory(prev => [{
      id: Date.now(),
      subject: sessionSubject,
      questions: sessionQuestions,
      results: sessionResults,
      correctCount,
      netElo: netTotal,
      timestamp: new Date(),
    }, ...prev]);
  }, [sessionSubject, sessionQuestions, sessionResults, correctCount]);

  // ─── Render: Review Questions Mode ────────────────────────

  const renderReviewMode = (results: { question: DummyQuestion; userAnswer?: string; correct: boolean }[], onBack: () => void) => {
    const item = results[reviewIndex];
    if (!item) return null;
    const { question, userAnswer, correct } = item;
    const subjectCfg = SUBJECT_CONFIG[question.subject];

    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-navy-900 flex flex-col">
          {/* Progress header */}
          <div className="px-8 pt-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-neon-blue" />
                Reviewing {reviewIndex + 1} of {results.length}
              </span>
            </div>
            <div className="flex gap-1.5 mb-4">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { setReviewIndex(i); setReviewChatOpen(false); setReviewChatMessages([]); }}
                  className={`h-2 flex-1 rounded-full cursor-pointer transition-all ${
                    i === reviewIndex ? (r.correct ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]') 
                    : r.correct ? 'bg-emerald-400/30' : 'bg-red-400/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {/* Subject + result badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{subjectCfg.icon}</span>
                <span className={`text-sm font-bold uppercase tracking-widest bg-gradient-to-r ${subjectCfg.gradient} bg-clip-text text-transparent`}>
                  {subjectCfg.label}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 text-sm font-medium">{question.topic}</span>
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${correct ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400'}`}>
                {correct ? '✓ Correct' : '✗ Incorrect'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                {question.passage && (
                  <Card className="bg-navy-800/80 backdrop-blur-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Passage</h3>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-line text-[15px]">{question.passage}</p>
                  </Card>
                )}

                <Card className="bg-navy-800/80 backdrop-blur-sm">
                  <p className="text-white font-medium text-lg leading-relaxed mb-6">{question.stem}</p>
                  <div className="space-y-3">
                    {question.choices.map((choice) => {
                      let choiceStyle = 'border-navy-700 opacity-40';
                      let indicator = null;
                      if (choice.label === question.correctAnswer) {
                        choiceStyle = 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40';
                        indicator = <span className="text-emerald-400 font-bold text-xs ml-auto shrink-0">✓ CORRECT</span>;
                      } else if (!correct && choice.label === userAnswer) {
                        choiceStyle = 'border-red-500 bg-red-500/15 ring-2 ring-red-500/40';
                        indicator = <span className="text-red-400 font-bold text-xs ml-auto shrink-0">✗ YOUR ANSWER</span>;
                      }
                      return (
                        <div key={choice.label} className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${choiceStyle}`}>
                          <span className="font-bold text-neon-blue text-sm min-w-[20px]">{choice.label}.</span>
                          <span className="text-slate-200 text-[15px] leading-relaxed flex-1">{choice.text}</span>
                          {indicator}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Explanation */}
                <Card neonHighlight className="bg-navy-800/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-neon-blue" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-neon-blue">Explanation</h3>
                  </div>
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                        {question.correctAnswer} — Correct
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[15px]">{question.explanation}</p>
                  </div>
                  {question.distractorExplanations && (
                    <div className="space-y-3 pt-4 border-t border-navy-700">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Why other answers are wrong</div>
                      {Object.entries(question.distractorExplanations).map(([label, exp]) => (
                        <div key={label} className="flex gap-3 items-start text-sm">
                          <span className="text-red-400 font-bold shrink-0">{label}.</span>
                          <span className="text-slate-400 leading-relaxed">{exp as string}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => setFlagModalQuestionId(question.id)}>
                      <Flag className="w-4 h-4 mr-2" />
                      Flag Question
                    </Button>
                    <div className="flex gap-2 ml-auto">
                      {reviewIndex > 0 && (
                        <Button variant="outline" size="sm" onClick={() => { setReviewIndex(i => i - 1); setReviewChatOpen(false); setReviewChatMessages([]); }}>
                          ← Previous
                        </Button>
                      )}
                      {reviewIndex < results.length - 1 ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white mr-2">
                            Exit Review
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => { setReviewIndex(i => i + 1); setReviewChatOpen(false); setReviewChatMessages([]); }}>
                            Next →
                          </Button>
                        </>
                      ) : (
                        <Button variant="primary" neon size="sm" onClick={onBack}>
                          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Report
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right side info */}
              <div className="space-y-5">
                <Card className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Question Info</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Subject</span>
                    <span className="text-white text-sm font-medium">{SUBJECT_LABELS[question.subject]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Topic</span>
                    <span className="text-white text-sm font-medium truncate max-w-[140px]">{question.topic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Difficulty</span>
                    <span className="text-neon-blue text-sm font-bold">{question.difficulty} ELO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Your Answer</span>
                    <span className={`text-sm font-bold ${correct ? 'text-emerald-400' : 'text-red-400'}`}>{correct ? '✓ Correct' : '✗ Wrong'}</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
          <AITutorOverlay 
            questionStem={question.stem} 
            explanation={question.explanation} 
            passage={question.passage} 
            choices={question.choices} 
          />
        </main>
        {renderFlagModal()}
      </div>
    );
  };

  // ─── Render: Session Report ───────────────────────────────

  const renderSessionReport = (reportSubject: McatSubject, reportQuestions: DummyQuestion[], reportResults: { question: DummyQuestion; userAnswer?: string; correct: boolean }[], reportCorrectCount: number, onExit: () => void, onContinue?: () => void, animate?: boolean) => {
    const { topicEloChanges, netTotal } = computeEloChanges(reportResults);
    const subjectCfg = SUBJECT_CONFIG[reportSubject];

    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-navy-900 p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl">
            {/* Subject header */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-3xl">{subjectCfg.icon}</span>
              <h2 className={`text-3xl font-display font-bold bg-gradient-to-r ${subjectCfg.gradient} bg-clip-text text-transparent`}>
                {subjectCfg.label}
              </h2>
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-1 text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Session Analysis</h3>
            <p className="text-slate-400 mb-8 text-center">Here is how your subject ratings shifted during this block.</p>
            
            <Card neonHighlight className="mb-6 bg-navy-800/80 backdrop-blur-md p-8">
              <div className="flex items-center justify-between mb-8 border-b border-navy-700 pb-8">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">Total Accuracy</h3>
                  <div className="text-4xl font-display font-bold text-white">
                    {reportCorrectCount} <span className="text-xl text-slate-500">/ {reportQuestions.length}</span>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">Net ELO Shift</h3>
                  <div className={`text-5xl font-display font-bold drop-shadow-[0_0_12px_rgba(0,0,0,0.5)] ${netTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {netTotal >= 0 ? '+' : ''}
                    {animate ? <CountUp end={netTotal} duration={2.5} useEasing /> : netTotal}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Topic Breakdown</h4>
                {Object.values(topicEloChanges).map((topic, i) => {
                  const isPositive = topic.net >= 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-navy-900/50 border border-navy-700 hover:border-slate-600 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{SUBJECT_CONFIG[topic.subject].icon}</span>
                        <div>
                          <div className="font-bold text-slate-200">{topic.topicName}</div>
                          <div className="text-xs text-slate-500">{SUBJECT_LABELS[topic.subject]}</div>
                        </div>
                      </div>
                      <div className={`font-display font-bold text-xl flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}
                        {animate ? <CountUp end={topic.net} duration={2} delay={0.5 + i * 0.2} useEasing /> : topic.net}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="flex gap-4 justify-center">
              <Button variant="outline" className="px-6" onClick={onExit}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Practice
              </Button>
              <Button variant="outline" className="px-6" onClick={() => { setReviewMode(true); setReviewIndex(0); setReviewChatOpen(false); setReviewChatMessages([]); }}>
                <ClipboardList className="w-4 h-4 mr-2" /> Review Questions
              </Button>
              {onContinue && (
                <Button variant="primary" neon className="px-6 font-bold uppercase tracking-wider" onClick={onContinue}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Continue Adaptive Practice
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  // ─── Render: Viewing a past session report ────────────────

  if (viewingPastSession) {
    if (reviewMode) {
      return renderReviewMode(viewingPastSession.results, () => setReviewMode(false));
    }
    return renderSessionReport(
      viewingPastSession.subject,
      viewingPastSession.questions,
      viewingPastSession.results,
      viewingPastSession.correctCount,
      () => { setViewingPastSession(null); setReviewMode(false); },
      undefined,
      false
    );
  }

  // ─── Render: Session complete ─────────────────────────────

  if (sessionActive && !sessionQuestions[currentIndex] && currentIndex >= sessionQuestions.length) {
    // Save to history on first render of this screen
    if (sessionResults.length > 0 && (practiceHistory.length === 0 || practiceHistory[0].questions !== sessionQuestions)) {
      saveToHistory();
    }

    if (reviewMode) {
      return renderReviewMode(sessionResults, () => setReviewMode(false));
    }

    return renderSessionReport(
      sessionSubject!,
      sessionQuestions,
      sessionResults,
      correctCount,
      exitSession,
      () => startSession(sessionSubject!, sessionQuestions.length),
      true
    );
  }

  // ─── Render: Active question session ──────────────────────

  if (sessionActive && sessionQuestions.length > 0) {
    const question = sessionQuestions[currentIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    const subjectCfg = SUBJECT_CONFIG[question.subject];
    const remaining = sessionQuestions.length - currentIndex - (selectedAnswer ? 1 : 0);
    const isLastQuestion = currentIndex === sessionQuestions.length - 1;

    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-navy-900 flex flex-col">
          {/* ── Progress Bar ── */}
          <div className="px-8 pt-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Question {currentIndex + 1} of {sessionQuestions.length}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {remaining} remaining
              </span>
            </div>
            <div className="w-full bg-navy-800 rounded-full h-3 overflow-hidden border border-navy-700 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-blue to-[#00B8C7] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(0,216,232,0.6),0_0_4px_rgba(0,216,232,0.8)]"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>

          {/* ── Top bar ── */}
          <div className="flex items-center justify-between px-8 py-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">{subjectCfg.icon}</span>
              <span className={`text-sm font-bold uppercase tracking-widest bg-gradient-to-r ${subjectCfg.gradient} bg-clip-text text-transparent`}>
                {subjectCfg.label}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 text-sm font-medium">{question.topic}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400 font-bold bg-navy-800/50 px-3 py-1.5 rounded-full border border-navy-700 shadow-sm">
                <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">🔥 {(profile as any).streak || 12} day streak</span>
              </div>
              <Button variant="ghost" size="sm" onClick={exitSession}>✕ Exit Session</Button>
            </div>
          </div>

          {/* ── Question content ── */}
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                {question.passage && (
                  <Card className="bg-navy-800/80 backdrop-blur-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Passage</h3>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-line text-[15px]">{question.passage}</p>
                  </Card>
                )}

                <Card className="bg-navy-800/80 backdrop-blur-sm">
                  <p className="text-white font-medium text-lg leading-relaxed mb-6">{question.stem}</p>
                  <div className="space-y-3">
                    {question.choices.map((choice) => {
                      let choiceStyle = 'border-navy-700 hover:border-neon-blue/60 hover:bg-navy-700/50 cursor-pointer';
                      let indicator = null;
                      
                      const isDraft = draftAnswer === choice.label && !selectedAnswer;

                      if (selectedAnswer) {
                        if (choice.label === question.correctAnswer) {
                          choiceStyle = 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                          indicator = <span className="text-emerald-400 font-bold text-xs ml-auto shrink-0">✓ CORRECT</span>;
                        } else if (choice.label === selectedAnswer && !isCorrect && selectedAnswer !== 'SKIP') {
                          choiceStyle = 'border-red-500 bg-red-500/15 ring-2 ring-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
                          indicator = <span className="text-red-400 font-bold text-xs ml-auto shrink-0">✗ INCORRECT</span>;
                        } else {
                          choiceStyle = 'border-navy-700 opacity-40';
                        }
                      } else if (isDraft) {
                        choiceStyle = 'border-neon-blue bg-neon-blue/5';
                      }

                      return (
                        <button
                          key={choice.label}
                          onClick={() => !selectedAnswer && setDraftAnswer(choice.label)}
                          disabled={!!selectedAnswer}
                          className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${choiceStyle}`}
                        >
                          <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center ${
                            isDraft && !selectedAnswer ? 'border-neon-blue bg-neon-blue/20' : 
                            selectedAnswer && choice.label === question.correctAnswer ? 'border-emerald-500 bg-emerald-500/20' :
                            selectedAnswer && choice.label === selectedAnswer ? 'border-red-500 bg-red-500/20' :
                            'border-slate-600'
                          }`}>
                            {(isDraft && !selectedAnswer) && <span className="w-2.5 h-2.5 rounded-full bg-neon-blue" />}
                            {(selectedAnswer && choice.label === question.correctAnswer) && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                            {(selectedAnswer && choice.label === selectedAnswer && !isCorrect && selectedAnswer !== 'SKIP') && <span className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                          </div>
                          <span className={`${isDraft && !selectedAnswer ? 'text-white font-medium' : selectedAnswer ? 'font-medium' : 'text-slate-200'} text-[15px] leading-relaxed flex-1`}>{choice.text}</span>
                          {indicator}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submission Buttons */}
                  {!showExplanation && (
                    <div className="mt-8 pt-6 flex flex-col sm:flex-row gap-4 justify-between items-center w-full border-t border-navy-800">
                      <Button 
                        variant="outline" 
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-slate-400 font-medium border-navy-700 bg-navy-800/30 hover:bg-navy-800 hover:text-white"
                        onClick={handleSkipQuestion}
                        disabled={!!selectedAnswer}
                      >
                        Skip Question
                      </Button>
                      <Button 
                        variant="primary" 
                        className={`w-full sm:w-auto px-8 py-2.5 rounded-xl font-bold transition-all ${
                          draftAnswer 
                            ? 'bg-neon-blue text-navy-900 shadow-[0_0_20px_rgba(0,216,232,0.4)] hover:shadow-[0_0_30px_rgba(0,216,232,0.6)]' 
                            : 'bg-navy-700 text-slate-500 cursor-not-allowed opacity-70'
                        }`}
                        onClick={() => draftAnswer && submitAnswer()}
                        disabled={!draftAnswer || !!selectedAnswer}
                      >
                        Submit Answer
                      </Button>
                    </div>
                  )}
                </Card>

                {/* ── Explanation ── */}
                {showExplanation && (
                  <Card neonHighlight className="bg-navy-800/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-neon-blue" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-neon-blue">Explanation</h3>
                    </div>

                    {/* Correct answer explanation */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                          {question.correctAnswer} — Correct
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[15px]">{question.explanation}</p>
                    </div>

                    {/* Distractor explanations */}
                    <div className="space-y-3 border-t border-navy-700 pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Why the other choices are wrong</h4>
                      {question.choices
                        .filter((c) => c.label !== question.correctAnswer)
                        .map((c) => (
                          <div key={c.label} className="flex gap-3">
                            <span className="text-xs font-bold text-red-400/70 min-w-[20px] mt-0.5">{c.label}.</span>
                            <p className="text-slate-400 text-sm leading-relaxed">
                              {question.distractorExplanations[c.label]}
                            </p>
                          </div>
                        ))}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button variant="outline" size="sm" onClick={() => setFlagModalQuestionId(question.id)}>
                        <Flag className="w-4 h-4 mr-2" />
                        Flag Question
                      </Button>
                      <div className="flex gap-2 ml-auto">
                        {isLastQuestion ? (
                          <Button variant="primary" size="sm" neon onClick={nextQuestion}>
                            Finish Session →
                          </Button>
                        ) : (
                          <Button variant="primary" size="sm" onClick={nextQuestion}>
                            Next Question →
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* ── Right side stats ── */}
              <div className="space-y-4">
                <Card className="text-center py-6">
                  <div className="text-5xl font-display font-bold text-white mb-1">
                    {correctCount}<span className="text-slate-500 text-lg">/{currentIndex + (selectedAnswer ? 1 : 0)}</span>
                  </div>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Correct</p>
                </Card>

                {selectedAnswer && selectedAnswer !== 'SKIP' && (
                  <Card className={`text-center py-4 transition-all duration-300 ${isCorrect ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                    <div className={`text-2xl font-display font-bold mb-1 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCorrect ? '🎯 Correct!' : '❌ Incorrect'}
                    </div>
                    <p className="text-slate-400 text-sm">
                      Answer: <span className="font-bold text-white">{question.correctAnswer}</span>
                    </p>
                  </Card>
                )}
                
                {selectedAnswer === 'SKIP' && (
                  <Card className="text-center py-4 transition-all duration-300 border-slate-500/30">
                    <div className="text-2xl font-display font-bold mb-1 text-slate-400">
                      ⏭️ Skipped
                    </div>
                    <p className="text-slate-400 text-sm">
                      Answer: <span className="font-bold text-white">{question.correctAnswer}</span>
                    </p>
                  </Card>
                )}

                <Card className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Session Info</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Subject</span>
                    <span className="text-white text-sm font-medium">{SUBJECT_LABELS[question.subject]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Chapter</span>
                    <span className="text-white text-sm font-medium truncate max-w-[140px]">
                      {MCAT_CHAPTERS[question.subject].find((c) => c.id === question.chapterId)?.name ?? question.chapterId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Difficulty</span>
                    <span className="text-neon-blue text-sm font-bold">{question.difficulty} ELO</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
          {showExplanation && (
            <AITutorOverlay 
              questionStem={question.stem} 
              explanation={question.explanation} 
              passage={question.passage} 
              choices={question.choices}
            />
          )}
        </main>
        {renderFlagModal()}
      </div>
    );
  }

  // ─── Render: Practice Hub (subject selection) ─────────────

  const todayCfg = SUBJECT_CONFIG[todaySubject];
  const _todayChapters = MCAT_CHAPTERS[todaySubject];
  const todayRank = profile.subjects[todaySubject].rank;
  const todayRankColors = RANK_COLORS[todayRank.rank];
  const todayQuestionsRemaining = 10; // Mock value

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
        {/* ── Today's Section Banner ── */}
        <div className={`relative overflow-hidden rounded-2xl p-8 mb-10 bg-gradient-to-r ${todayCfg.gradient} shadow-lg`}>
          <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-white/80" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Today&apos;s Focus</span>
              </div>
              <h1 className="text-3xl font-display font-bold text-white mb-1">
                {todayCfg.icon} {todayCfg.label}
              </h1>
              <p className="text-white/70 text-sm flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span>{todayRank.icon}</span> {todayRank.displayName} — {profile.subjects[todaySubject].elo} ELO
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> {todayQuestionsRemaining} questions remaining
                </span>
              </p>
            </div>
            <Button
              variant="primary"
              neon
              className="bg-white text-navy-900 hover:bg-white/90 font-bold uppercase tracking-wider shadow-xl"
              onClick={() => startSession(todaySubject, todayQuestionsRemaining)}
            >
              Start Today&apos;s Block →
            </Button>
          </div>
        </div>

        {/* ── Other Sections ── */}
        <h2 className="text-xl font-display font-bold text-white mb-5 tracking-tight">All Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(Object.entries(SUBJECT_CONFIG) as [McatSubject, typeof SUBJECT_CONFIG[McatSubject]][]).map(
            ([key, cfg]) => {
              const chapters = MCAT_CHAPTERS[key];
              const subRank = profile.subjects[key].rank;
              const subColors = RANK_COLORS[subRank.rank];
              return (
                <Card
                  key={key}
                  className="group p-6 hover:border-neon-blue/50 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                  neonHighlight={key === todaySubject}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cfg.icon}</span>
                      <div>
                        <h3 className={`font-bold text-lg bg-gradient-to-r ${cfg.gradient} bg-clip-text text-transparent`}>
                          {cfg.label}
                        </h3>
                        <p className="text-slate-500 text-xs font-medium">{chapters.length} chapters</p>
                      </div>
                    </div>
                    <div className={`bg-gradient-to-r ${subColors.gradient} ${subColors.text} text-xs font-bold px-2.5 py-1 rounded-lg tracking-wide flex items-center gap-1 ${subColors.shadow}`}>
                      <span className="text-sm">{subRank.icon}</span> {subRank.displayName}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-display font-bold text-white">{profile.subjects[key].elo}</span>
                    <span className="text-xs text-slate-500 font-bold uppercase">ELO</span>
                  </div>
                  {subRank.eloToNextTier > 0 && (
                    <div className="mb-3">
                      <div className="w-full bg-navy-900/80 rounded-full h-1.5 overflow-hidden border border-navy-700">
                        <div className="bg-neon-blue h-full rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(0,216,232,0.5)]" style={{ width: `${subRank.progressInTier * 100}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{subRank.eloToNextTier} ELO to next tier</p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setManualSubject(key);
                      setManualChapter(undefined);
                      setManualTopics([]);
                      setManualCount(5);
                      setShowManualModal(true);
                    }}
                  >
                    Manual Practice <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Card>
              );
            }
          )}
        </div>

        {/* ── Practice History ── */}
        {practiceHistory.length > 0 && (
          <>
            <h2 className="text-xl font-display font-bold text-white mb-5 mt-10 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-neon-blue" /> Practice History
            </h2>
            <div className="space-y-3">
              {practiceHistory.map((session) => {
                const cfg = SUBJECT_CONFIG[session.subject];
                const accuracy = Math.round((session.correctCount / session.questions.length) * 100);
                return (
                  <Card key={session.id} className="p-4 flex items-center justify-between hover:border-neon-blue/30 transition-all cursor-pointer" onClick={() => { setViewingPastSession(session); setReviewMode(false); }}>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{cfg.icon}</span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {cfg.label}
                          <span className="text-xs text-slate-500 font-medium">{session.questions.length} questions</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {session.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white">{accuracy}%</span>
                      </div>
                      <div className={`font-display font-bold text-sm ${session.netElo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {session.netElo >= 0 ? '▲' : '▼'} {session.netElo >= 0 ? '+' : ''}{session.netElo}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* ── Manual Practice Modal ── */}
        {showManualModal && manualSubject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto border border-navy-700 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Manual Practice</h2>
                  <p className="text-slate-400 text-sm">{SUBJECT_CONFIG[manualSubject].icon} {SUBJECT_CONFIG[manualSubject].label}</p>
                </div>
                <button onClick={() => setShowManualModal(false)} className="text-slate-500 hover:text-white text-xl cursor-pointer">✕</button>
              </div>

              {/* Chapter selection */}
              <div className="mb-5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Chapter</label>
                <div className="relative">
                  <select
                    value={manualChapter ?? ''}
                    onChange={(e) => {
                      setManualChapter(e.target.value || undefined);
                      setManualTopics([]);
                    }}
                    className="w-full bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-neon-blue/60"
                  >
                    <option value="">All Chapters (Mixed)</option>
                    {MCAT_CHAPTERS[manualSubject].map((ch) => (
                      <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Chapter topics preview */}
              {manualChapter && (
                <div className="mb-5 bg-navy-900/50 rounded-lg p-3 border border-navy-700">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Select specific topics to focus on (Optional)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {MCAT_CHAPTERS[manualSubject]
                      .find((c) => c.id === manualChapter)
                      ?.topics.map((t) => {
                        const isSelected = manualTopics.includes(t);
                        return (
                          <button
                            key={t}
                            onClick={() => {
                              setManualTopics(prev => 
                                prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                              );
                            }}
                            className={`text-xs px-2.5 py-1.5 rounded-md border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-neon-blue/20 text-neon-blue border-neon-blue/50 shadow-[0_0_8px_rgba(0,216,232,0.3)]' 
                                : 'bg-navy-800 text-slate-300 border-navy-700 hover:border-slate-500 hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Question count */}
              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Number of Questions</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setManualCount(n)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        manualCount === n
                          ? 'bg-neon-blue text-navy-900 shadow-[0_0_12px_rgba(0,216,232,0.5)]'
                          : 'bg-navy-900 text-slate-400 border border-navy-700 hover:border-neon-blue/40'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                neon
                className="w-full uppercase tracking-wider font-bold"
                onClick={() => startSession(manualSubject, manualCount, manualChapter, manualTopics.length > 0 ? manualTopics : undefined)}
              >
                Start Practice →
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
