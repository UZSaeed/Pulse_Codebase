'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUserProfile } from '@/context/UserProfileContext';
import type { PlannerTask } from '@/lib/planner';
import { SUBJECT_LABELS, RANK_COLORS, type McatSubject, getTieredRank } from '@/lib/elo';
import { Check, Plus } from 'lucide-react';

export default function PlannerPage() {
  const router = useRouter();
  const { profile, togglePlannerTask, addPlannerTask } = useUserProfile();
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState<McatSubject | 'custom'>('reading_writing');

  const grouped = useMemo(() => {
    return profile.plannerTasks.reduce<Record<string, PlannerTask[]>>((acc, task) => {
      (acc[task.scheduledDate] ??= []).push(task);
      return acc;
    }, {});
  }, [profile.plannerTasks]);

  const dates = Object.keys(grouped).sort();

  const getTaskLabel = (task: PlannerTask) => {
    const domain = task.targetTopics?.[0] ?? task.title;
    if (task.type === 'practice_test') return task.title;
    if (task.type === 'checkpoint') return 'Weekly checkpoint';
    return domain;
  };

  const getTaskRank = (task: PlannerTask) => {
    if (task.subject === 'mixed' || task.subject === 'custom') return null;
    const topicName = task.targetTopics?.[0];
    if (!topicName) return profile.subjects[task.subject as McatSubject].rank;
    const topicElo = profile.subjects[task.subject as McatSubject].topics[topicName]?.elo ?? 1000;
    return getTieredRank(topicElo);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900">Study planner</h1>
            <p className="font-medium text-slate-500">
              Your daily study blocks, auto-scheduled to focus on what needs the most work.
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add task
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {dates.map((scheduledDate) => {
            const tasks = grouped[scheduledDate];
            const isToday = scheduledDate === new Date().toISOString().split('T')[0];
            return (
              <Card
                key={scheduledDate}
                neonHighlight={isToday}
                className={isToday ? 'bg-white' : 'bg-white'}
              >
                <div className="mb-4 flex items-end justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-cyan-600' : 'text-slate-400'}`}>
                      {new Date(`${scheduledDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <div className="text-xl font-black text-slate-800">
                      {new Date(`${scheduledDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-cyan-600 px-3 py-1 text-xs font-bold text-white">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => {
                    const rankInfo = getTaskRank(task);
                    const rankColors = rankInfo ? RANK_COLORS[rankInfo.rank] : null;
                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          if (task.subject === 'custom') togglePlannerTask(task.id);
                          else if (task.type === 'practice_test') router.push('/practice-tests');
                          else router.push(`/practice?taskId=${task.id}&autoStart=true`);
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          task.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50 opacity-75'
                            : 'border-slate-200 bg-slate-50 hover:border-cyan-600/30 hover:squishy-shadow'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              togglePlannerTask(task.id);
                            }}
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                              task.status === 'completed'
                                ? 'border-emerald-400 bg-emerald-400 text-white'
                                : 'border-slate-300 text-transparent hover:border-cyan-600'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-bold text-slate-800">{getTaskLabel(task)}</div>
                              {rankColors && (
                                <span className={`rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${rankColors.gradient} ${rankColors.text}`}>
                                  {rankInfo!.displayName}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              {task.subject !== 'custom' && task.subject !== 'mixed' && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                                  {SUBJECT_LABELS[task.subject as McatSubject]}
                                </span>
                              )}
                              <span>{task.questionCount ?? 0} questions</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg bg-white">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Add a task</h2>
                  <p className="text-sm text-slate-500">Add a practice block or personal reminder.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Title</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                    placeholder="Review geometry formulas"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Section</label>
                    <select
                      value={subject}
                      onChange={(event) => setSubject(event.target.value as McatSubject | 'custom')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-cyan-600"
                    >
                      <option value="reading_writing">Reading & Writing</option>
                      <option value="math">Math</option>
                      <option value="custom">Personal</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!title.trim()) return;
                    addPlannerTask({
                      title: title.trim(),
                      subject,
                      type: 'manual',
                      status: 'pending',
                      scheduledDate: date,
                      phase: 'Custom',
                      xpReward: 20,
                      questionCount: subject === 'custom' ? 0 : 10,
                    });
                    setTitle('');
                    setShowAddModal(false);
                  }}
                >
                  Save task
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
