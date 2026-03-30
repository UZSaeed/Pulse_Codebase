'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RadarChart } from '@/components/ui/RadarChart';
import { useUserProfile } from '@/context/UserProfileContext';
import { MCAT_SUBJECTS, SUBJECT_LABELS, getTieredRank, RANK_COLORS, type McatSubject } from '@/lib/elo';
import { getXpMultiplier } from '@/lib/userProfile';
import Link from 'next/link';

const SUBJECT_CONFIG: Record<McatSubject, { icon: string; gradient: string }> = {
  chem_phys: { icon: '⚗️', gradient: 'from-blue-500 to-cyan-400' },
  cars: { icon: '📖', gradient: 'from-purple-500 to-pink-400' },
  bio_biochem: { icon: '🧬', gradient: 'from-green-500 to-emerald-400' },
  psych_soc: { icon: '🧠', gradient: 'from-orange-500 to-yellow-400' },
};

export default function Home() {
  const { profile, loading } = useUserProfile();
  const overallRank = profile.overallRank;
  const colors = RANK_COLORS[overallRank.rank];

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-navy-900 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Loading your profile...</p>
          </div>
        </main>
      </div>
    );
  }

  // Radar chart data
  const radarData = MCAT_SUBJECTS.map((s) => ({
    subject: s,
    label: SUBJECT_LABELS[s],
    icon: SUBJECT_CONFIG[s].icon,
    value: profile.subjects[s].elo,
    max: 2000, // Chart scale max — lower ceiling pushes Diamond closer to the edge
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Welcome back, {profile.name}</h1>
            <p className="text-slate-400 font-medium">Your ELO is looking strong today. Let's check your planner.</p>
          </div>
        </header>
        
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Overall ELO + Rank Badge */}
          <Card neonHighlight className="flex flex-col gap-2 relative overflow-hidden backdrop-blur-sm bg-navy-800/80">
            <div className="flex justify-between items-start">
              <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Overall ELO</h3>
              <div className={`bg-gradient-to-br ${colors.gradient} ${colors.text} text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-widest flex items-center gap-1.5 ${colors.shadow}`}>
                <span className="text-sm">{overallRank.icon}</span>
                {overallRank.displayName}
              </div>
            </div>
            <div className="text-5xl font-display font-bold text-neon-blue mt-2 drop-shadow-[0_0_8px_rgba(0,216,232,0.6)]">{profile.overallElo}</div>
            {/* Progress to next tier */}
            {overallRank.eloToNextTier > 0 && (
              <div className="mt-auto pt-2 relative">
                <div className="flex justify-between text-xs mb-1.5 font-medium">
                  <span className="text-slate-400">{overallRank.eloFloor}</span>
                  <span className="text-slate-400">{overallRank.eloCeiling}</span>
                </div>
                <div className="w-full bg-navy-900/90 rounded-full h-3 overflow-hidden border border-navy-700 relative">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-neon-blue h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(0,216,232,0.8)] relative overflow-hidden" 
                    style={{ width: `${overallRank.progressInTier * 100}%` }} 
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:1rem_1rem] animate-[shimmer_1s_linear_infinite]" />
                  </div>
                </div>
                <p className="text-xs text-neon-blue mt-2 font-semibold text-center uppercase tracking-widest">{overallRank.eloToNextTier} ELO to next tier</p>
              </div>
            )}
          </Card>
          
          {/* Daily Streak */}
          <Card className="flex flex-col gap-2 backdrop-blur-sm bg-navy-800/80">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Daily Streak</h3>
            <div className="text-5xl font-display font-bold text-white mt-2">
              {profile.dailyStreak} <span className="text-xl text-slate-500 font-medium tracking-wide">DAYS</span>
            </div>
            <div className="text-sm text-slate-400 mt-auto bg-navy-900/50 w-fit px-2.5 py-1 rounded font-medium border border-navy-700">
              Habit multiplier: <span className="text-neon-blue font-bold tracking-wide">{profile.xpMultiplier.toFixed(1)}x XP</span>
            </div>
          </Card>
          
          {/* Total XP */}
          <Card className="flex flex-col gap-2 backdrop-blur-sm bg-navy-800/80">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total XP</h3>
            <div className="text-5xl font-display font-bold text-white mt-2">
              {profile.totalXp.toLocaleString()} <span className="text-xl text-slate-500 font-medium tracking-wide">XP</span>
            </div>
            <div className="text-sm text-emerald-400 mt-auto flex items-center gap-1.5 font-bold bg-emerald-400/10 w-fit px-2 py-1 rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Multiplier: {profile.xpMultiplier.toFixed(1)}x
            </div>
          </Card>
        </div>

        {/* ── Radar Chart + Subject Cards ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Radar Polygon Chart */}
          <Card className="flex flex-col items-center justify-center p-6 bg-navy-800/80 backdrop-blur-sm">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 self-start">Section Strength</h3>
            <RadarChart data={radarData} size={380} />
          </Card>

          {/* Subject Mastery Cards */}
          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(SUBJECT_CONFIG) as [McatSubject, { icon: string; gradient: string }][]).map(([key, cfg]) => {
              const subjectProfile = profile.subjects[key];
              const rank = subjectProfile.rank;
              const rankColors = RANK_COLORS[rank.rank];
              
              return (
                <Card key={key} className="flex flex-col p-5 bg-gradient-to-b from-navy-800 to-navy-900/50 relative overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{cfg.icon}</span>
                    <h3 className={`font-bold text-sm bg-gradient-to-r ${cfg.gradient} bg-clip-text text-transparent`}>
                      {SUBJECT_LABELS[key]}
                    </h3>
                  </div>

                  {/* Rank Badge */}
                  <div className={`bg-gradient-to-r ${rankColors.gradient} ${rankColors.text} text-xs font-bold px-2.5 py-1 rounded-lg w-fit mb-3 tracking-wide flex items-center gap-1 ${rankColors.shadow}`}>
                    <span className="text-sm">{rank.icon}</span> {rank.displayName}
                  </div>

                  {/* ELO */}
                  <div className="text-2xl font-display font-bold text-white mb-2">{subjectProfile.elo}</div>

                  {/* Progress to next tier */}
                  {rank.eloToNextTier > 0 && (
                    <div className="mt-auto pt-2">
                       <div className="flex justify-between text-[10px] mb-1 font-medium pb-0.5">
                        <span className="text-slate-400">{rank.eloFloor}</span>
                        <span className="text-slate-400">{rank.eloCeiling}</span>
                      </div>
                      <div className="w-full bg-navy-900/90 rounded-full h-2 overflow-hidden border border-navy-700 relative">
                        <div 
                          className={`bg-gradient-to-r ${cfg.gradient} h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.3)] relative overflow-hidden`}
                          style={{ width: `${rank.progressInTier * 100}%` }} 
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:0.5rem_0.5rem] animate-[shimmer_1s_linear_infinite]" />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-semibold text-center uppercase tracking-wider">{rank.eloToNextTier} to rank up</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
