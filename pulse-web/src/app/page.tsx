import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const currentRank = "Silver";
  const rankStyles = {
    Iron: "from-zinc-500 to-zinc-700 text-white shadow-zinc-500/50",
    Bronze: "from-orange-700 to-yellow-900 text-amber-50 shadow-orange-700/50",
    Silver: "from-slate-200 to-slate-400 text-navy-900 shadow-slate-300/60 ring-1 ring-white/50",
    Gold: "from-yellow-300 to-amber-500 text-navy-900 shadow-yellow-400/60 ring-1 ring-yellow-200",
    Diamond: "from-cyan-300 to-blue-500 text-navy-900 shadow-cyan-400/60 ring-1 ring-cyan-200"
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-navy-900 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Welcome back, Uzair</h1>
            <p className="text-slate-400 font-medium">Your ELO is looking strong today. Ready for your next block?</p>
          </div>
          <Button variant="primary" neon className="uppercase tracking-widest font-bold shadow-[0_0_20px_rgba(0,216,232,0.4)]">
            Start Today&apos;s Block
          </Button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card neonHighlight className="flex flex-col gap-2 relative overflow-hidden backdrop-blur-sm bg-navy-800/80">
            <div className="flex justify-between items-start">
              <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Overall ELO</h3>
              {/* Profile Rank Badge */}
              <div className={`bg-gradient-to-br ${rankStyles[currentRank as keyof typeof rankStyles]} text-xs font-bold px-3 py-1 rounded-full shadow-lg uppercase tracking-widest flex items-center gap-1.5`}>
                <div className="w-4 h-4 rounded-full bg-white/30 backdrop-blur-md border border-white/50 flex items-center justify-center shadow-inner">
                  {/* Small icon representing user inside badge */}
                  <svg className="w-2.5 h-2.5 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                {currentRank}
              </div>
            </div>
            <div className="text-5xl font-display font-bold text-neon-blue mt-2 drop-shadow-[0_0_8px_rgba(0,216,232,0.6)]">1850</div>
            <div className="text-sm text-emerald-400 mt-auto flex items-center gap-1.5 font-bold bg-emerald-400/10 w-fit px-2 py-1 rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              +12 this week
            </div>
          </Card>
          
          <Card className="flex flex-col gap-2 backdrop-blur-sm bg-navy-800/80">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Daily Streak</h3>
            <div className="text-5xl font-display font-bold text-white mt-2">
              14 <span className="text-xl text-slate-500 font-medium tracking-wide">DAYS</span>
            </div>
            <div className="text-sm text-slate-400 mt-auto bg-navy-900/50 w-fit px-2.5 py-1 rounded font-medium border border-navy-700">
              Habit multiplier: <span className="text-neon-blue font-bold tracking-wide">1.5x XP</span>
            </div>
          </Card>
          
          <Card className="flex flex-col gap-2 backdrop-blur-sm bg-navy-800/80">
            <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Next Scheduled Block</h3>
            <div className="text-2xl font-bold text-white mt-2 tracking-tight">CARS Strategies</div>
            <div className="text-sm text-neon-blue font-bold mt-auto flex items-center gap-2 bg-neon-blue/10 w-fit px-2.5 py-1 rounded border border-neon-blue/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Today at 4:00 PM
            </div>
          </Card>
        </div>

        <h2 className="text-xl font-display font-bold text-white mb-4 tracking-tight">Subject Mastery Trees</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {['Chem/Phys', 'CARS', 'Bio/Biochem', 'Psych/Soc'].map((subject) => (
            <Card key={subject} className="flex flex-col items-center justify-center p-8 text-center min-h-[180px] border border-navy-700 bg-gradient-to-b from-navy-800 to-navy-900/50 relative overflow-hidden">
              <h3 className="font-bold text-lg text-slate-300 mb-4 relative z-10">{subject}</h3>
              
              <div className="w-full bg-navy-900/80 rounded-full h-2.5 mb-4 overflow-hidden shadow-inner border border-navy-700 relative z-10">
                <div className="bg-neon-blue h-full rounded-full transform transition-all duration-1000 shadow-[0_0_12px_rgba(0,216,232,0.8)]" style={{ width: `${Math.random() * 60 + 20}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center w-full relative z-10 mt-1">
                <span className="text-[10px] font-bold text-neon-blue/70 uppercase tracking-widest">Mastery</span>
                <span className="text-sm font-bold text-slate-200 tracking-wide">Lvl {(Math.random() * 20 + 5).toFixed(0)}</span>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
