'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUserProfile } from '@/context/UserProfileContext';
import type { PlannerTask } from '@/lib/planner';
import { SUBJECT_LABELS, type McatSubject } from '@/lib/elo';
import { Check, Plus } from 'lucide-react';

const SUBJECT_ICONS: Record<McatSubject | 'mixed' | 'custom', string> = {
  reading_writing: 'R',
  math: 'M',
  mixed: '*',
  custom: '+',
};

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-display font-bold tracking-tight text-white">SAT planner</h1>
            <p className="font-medium text-slate-400">
              Auto-scheduled daily blocks prioritize weaker domains first, then rotate reinforcement as your scores improve.
            </p>
          </div>
          <Button variant="primary" neon onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add custom task
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
                className={isToday ? 'bg-navy-800/90' : 'bg-navy-800/70'}
              >
                <div className="mb-4 flex items-end justify-between border-b border-navy-700 pb-3">
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-[0.18em] ${isToday ? 'text-neon-blue' : 'text-slate-500'}`}>
                      {new Date(`${scheduledDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <div className="text-xl font-display text-white">
                      {new Date(`${scheduledDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  {isToday && (
                    <span className="rounded-full border border-neon-blue/30 bg-neon-blue/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neon-blue">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        if (task.subject === 'custom') togglePlannerTask(task.id);
                        else router.push(`/practice?taskId=${task.id}`);
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        task.status === 'completed'
                          ? 'border-navy-700 bg-navy-900/50 opacity-60'
                          : 'border-navy-700 bg-navy-900/70 hover:border-neon-blue/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            togglePlannerTask(task.id);
                          }}
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            task.status === 'completed'
                              ? 'border-neon-blue bg-neon-blue text-navy-900'
                              : 'border-slate-500 text-transparent'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-bold text-white">{task.title}</div>
                              <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                                {task.phase} · {task.type}
                              </div>
                            </div>
                            <div className="text-right text-xs text-slate-400">
                              <div className="font-bold text-neon-blue">{task.questionCount ?? 0} Q</div>
                              <div>{task.xpReward ?? 0} XP</div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-navy-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                              {SUBJECT_ICONS[task.subject]} {task.subject === 'mixed' || task.subject === 'custom' ? task.subject : SUBJECT_LABELS[task.subject]}
                            </span>
                            {task.targetTopics?.map((topic) => (
                              <span key={topic} className="rounded-full border border-neon-blue/20 bg-neon-blue/5 px-2 py-1 text-[10px] font-bold text-neon-blue">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg bg-navy-800">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Add custom task</h2>
                  <p className="text-sm text-slate-400">Add anything from a full practice test to a college-essay break.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Title</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                    placeholder="Review geometry formulas"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="w-full rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Section</label>
                    <select
                      value={subject}
                      onChange={(event) => setSubject(event.target.value as McatSubject | 'custom')}
                      className="w-full rounded-xl border border-navy-700 bg-navy-900 px-4 py-3 text-white outline-none focus:border-neon-blue/50"
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
                  neon
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
