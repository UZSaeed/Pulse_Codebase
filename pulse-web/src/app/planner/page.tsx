'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useUserProfile } from '@/context/UserProfileContext';
import { PlannerTask } from '@/lib/planner';
import { Check, Plus, Calendar as CalendarIcon, Target, Brain, Beaker, BookOpen } from 'lucide-react';
import { MCAT_SUBJECTS, McatSubject, SUBJECT_LABELS } from '@/lib/elo';

const SUBJECT_ICONS: Record<McatSubject | 'mixed' | 'custom', React.ReactNode> = {
  chem_phys: <Beaker className="w-5 h-5 text-blue-400" />,
  cars: <BookOpen className="w-5 h-5 text-purple-400" />,
  bio_biochem: <Brain className="w-5 h-5 text-green-400" />,
  psych_soc: <Target className="w-5 h-5 text-orange-400" />,
  mixed: <CalendarIcon className="w-5 h-5 text-neon-blue" />,
  custom: <Plus className="w-5 h-5 text-slate-400" />,
};

const SUBJECT_COLORS: Record<McatSubject | 'mixed' | 'custom', string> = {
  chem_phys: 'from-blue-500/20 to-cyan-400/10 border-blue-500/30 text-blue-400',
  cars: 'from-purple-500/20 to-pink-400/10 border-purple-500/30 text-purple-400',
  bio_biochem: 'from-green-500/20 to-emerald-400/10 border-green-500/30 text-green-400',
  psych_soc: 'from-orange-500/20 to-yellow-400/10 border-orange-500/30 text-orange-400',
  mixed: 'from-cyan-500/20 to-neon-blue/10 border-neon-blue/30 text-neon-blue',
  custom: 'from-slate-500/20 to-slate-400/10 border-slate-500/30 text-slate-400',
};

export default function PlannerPage() {
  const router = useRouter();
  const { profile, togglePlannerTask, addPlannerTask } = useUserProfile();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    subject: 'custom' as McatSubject | 'mixed' | 'custom',
    type: 'manual' as const,
    scheduledDate: new Date().toISOString().split('T')[0],
  });
  
  const PHASES = ['Ramp Up', 'The Grind', 'Last Stretch'];
  const DAYS = [
    { label: 'M', value: 1 },
    { label: 'T', value: 2 },
    { label: 'W', value: 3 },
    { label: 'Th', value: 4 },
    { label: 'F', value: 5 },
    { label: 'Sa', value: 6 },
    { label: 'S', value: 0 },
  ];

  const [selectedPhase, setSelectedPhase] = useState('The Grind');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Group tasks by date
  const tasksByDate = profile.plannerTasks.reduce((acc, task) => {
    if (!acc[task.scheduledDate]) acc[task.scheduledDate] = [];
    acc[task.scheduledDate].push(task);
    return acc;
  }, {} as Record<string, PlannerTask[]>);

  const dates = Object.keys(tasksByDate).sort();

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    
    if (selectedDays.length > 0) {
      // Generate recurring tasks for the next 4 weeks
      const start = new Date(newTask.scheduledDate);
      // Ensure we don't skew timezone on the start date
      start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
      
      for (let i = 0; i < 28; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        if (selectedDays.includes(d.getDay())) {
          addPlannerTask({
            ...newTask,
            scheduledDate: d.toISOString().split('T')[0],
            phase: selectedPhase,
            status: 'pending',
            xpReward: 25,
            questionCount: 0,
          });
        }
      }
    } else {
      addPlannerTask({
        ...newTask,
        phase: selectedPhase,
        status: 'pending',
        xpReward: 25,
        questionCount: 0,
      });
    }
    
    setShowAddModal(false);
    setNewTask({ ...newTask, title: '' });
    setSelectedDays([]);
    setSelectedPhase('The Grind');
  };

  const toggleDay = (dayVal: number) => {
    setSelectedDays(prev => prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]);
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    if (isToday) return 'TODAY';
    return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  };

  const getMonthAndDay = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleBlockClick = (task: PlannerTask) => {
    if (task.subject !== 'custom') {
      // Auto blocks link to practice page
      router.push(`/practice?taskId=${task.id}`);
    } else {
      // Manual blocks are toggleable
      togglePlannerTask(task.id);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8 relative">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Smart Planner</h1>
            <p className="text-slate-400 font-medium">Your schedule, optimized by spaced repetition and ELO tracking.</p>
          </div>
          <Button 
            variant="primary" 
            neon 
            className="uppercase tracking-widest font-bold shadow-[0_0_20px_rgba(0,216,232,0.4)] flex items-center gap-2"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-5 h-5" />
            Add Custom Task
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dates.map((dateStr) => {
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const tasks = tasksByDate[dateStr];
            
            return (
              <Card 
                key={dateStr} 
                neonHighlight={isToday}
                className={`flex flex-col relative overflow-hidden backdrop-blur-sm ${isToday ? 'bg-navy-800/90 border-neon-blue/30 shadow-[0_0_15px_rgba(0,216,232,0.1)]' : 'bg-navy-800/50 border-navy-700'}`}
              >
                {/* Header */}
                <div className="flex justify-between items-end mb-4 border-b border-navy-700/50 pb-3">
                  <div>
                    <h3 className={`text-sm font-bold tracking-widest ${isToday ? 'text-neon-blue' : 'text-slate-400'}`}>
                      {getDayName(dateStr)}
                    </h3>
                    <p className="text-xl font-display text-white">{getMonthAndDay(dateStr)}</p>
                  </div>
                  {isToday && (
                    <span className="text-[10px] uppercase tracking-widest bg-neon-blue/10 text-neon-blue px-2 py-1 rounded border border-neon-blue/20">
                      CURRENT
                    </span>
                  )}
                </div>

                {/* Tasks List */}
                <div className="flex flex-col gap-3 flex-1">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4 text-center">No tasks scheduled.</p>
                  ) : (
                    tasks.map(task => {
                      const isDone = task.status === 'completed';
                      const colorClasses = SUBJECT_COLORS[task.subject as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS.custom;
                      const isAuto = task.subject !== 'custom';
                      
                      return (
                        <div 
                          key={task.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${
                            isDone 
                              ? 'bg-navy-900/50 border-navy-700 opacity-60' 
                              : `bg-gradient-to-br ${colorClasses} hover:brightness-110 cursor-pointer shadow-lg`
                          }`}
                          onClick={() => handleBlockClick(task)}
                        >
                          <button 
                            className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isDone ? 'bg-neon-blue border-neon-blue text-navy-900' : 'border-slate-500 hover:border-slate-400 text-transparent'
                            }`}
                            onClick={(e) => {
                              // If they click the circle specifically, let it toggle even if it's auto
                              e.stopPropagation();
                              togglePlannerTask(task.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold leading-tight ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>
                              {task.title}
                            </h4>
                            <div className="flex flex-col gap-2 mt-2">
                              {/* Primary Meta Row */}
                              <div className="flex items-center flex-wrap gap-2 text-[10px] uppercase tracking-wider font-semibold">
                                {task.subject !== 'custom' && (
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    {SUBJECT_ICONS[task.subject]}
                                    {task.subject === 'mixed' ? 'Mixed' : SUBJECT_LABELS[task.subject as McatSubject]}
                                  </span>
                                )}
                                {task.targetTopics && task.targetTopics.length > 0 && (
                                  <span className="font-extrabold text-neon-blue bg-neon-blue/10 px-1.5 py-0.5 rounded border border-neon-blue/20">
                                    {task.targetTopics[0]}
                                  </span>
                                )}
                              </div>

                              {/* Secondary Meta Row */}
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-widest text-slate-500 font-bold opacity-80">
                                <span>{task.type}</span>
                                {task.questionCount && task.questionCount > 0 && (
                                  <span className="text-neon-blue/70">{task.questionCount} Qs</span>
                                )}
                                {task.phase && (
                                  <span>{task.phase}</span>
                                )}
                              </div>
                            </div>
                            {isAuto && !isDone && (
                              <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neon-blue bg-neon-blue/5 border border-neon-blue/20 px-3 py-1.5 rounded-lg w-fit group-hover:bg-neon-blue/10 transition-all">
                                Start Session →
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Add Task Modal overlay */}
        {showAddModal && (
          <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-navy-800 border-navy-700 shadow-2xl flex flex-col gap-6" neonHighlight>
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">Add Custom Task</h2>
              <form onSubmit={handleAddTask} className="flex flex-col gap-5">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Task Title</label>
                  <input 
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="E.g., Review Amino Acids Flashcards"
                    className="bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Start Date</label>
                    <input 
                      type="date"
                      required
                      value={newTask.scheduledDate}
                      onChange={(e) => setNewTask({...newTask, scheduledDate: e.target.value})}
                      className="bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Subject / Category</label>
                    <select 
                      value={newTask.subject}
                      onChange={(e) => setNewTask({...newTask, subject: e.target.value as McatSubject | 'mixed' | 'custom'})}
                      className="bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-all appearance-none"
                    >
                      <option value="custom">Custom</option>
                      <option value="mixed">Mixed</option>
                      {MCAT_SUBJECTS.map(s => (
                        <option key={s} value={s}>{SUBJECT_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Phase Bubbles */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Phase</label>
                  <div className="flex flex-wrap gap-2">
                    {PHASES.map(phase => (
                      <button
                        key={phase}
                        type="button"
                        onClick={() => setSelectedPhase(phase)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          selectedPhase === phase 
                            ? 'bg-neon-blue text-navy-900 ring-2 ring-neon-blue/50' 
                            : 'bg-navy-900 text-slate-400 border border-navy-700 hover:border-slate-500'
                        }`}
                      >
                        {phase}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days of week bubbles */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Repeats on Days (Optional)</label>
                  <div className="flex gap-2">
                    {DAYS.map(day => {
                      const isSelected = selectedDays.includes(day.value);
                      return (
                        <button
                          key={day.label}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            isSelected 
                              ? 'bg-neon-blue text-navy-900 ring-2 ring-neon-blue/50' 
                              : 'bg-navy-900 text-slate-400 border border-navy-700 hover:border-slate-500'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDays.length > 0 && <span className="text-[10px] text-neon-blue mt-1">Will generate tasks for the next 4 weeks.</span>}
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    type="submit"
                    neon
                  >
                    Add Task
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}
