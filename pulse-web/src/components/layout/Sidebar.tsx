'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Target, Calendar, BarChart2, Settings } from 'lucide-react';

export const Sidebar = () => {
  const pathname = usePathname();

  const getLinkClasses = (path: string) => {
    const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
    if (isActive) {
      return "group flex items-center gap-3 px-4 py-3 text-neon-blue bg-navy-700/60 rounded-xl transition-all duration-300 border border-neon-blue/40 shadow-[inset_0_0_12px_rgba(0,216,232,0.3)] font-bold tracking-wide";
    }
    return "group flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-navy-700/40 rounded-xl transition-all duration-300 border border-transparent hover:border-slate-600 font-semibold tracking-wide";
  };

  const getIconClasses = (path: string) => {
    const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
    if (isActive) {
      return "w-5 h-5 drop-shadow-[0_0_8px_rgba(0,216,232,0.8)]";
    }
    return "w-5 h-5 group-hover:text-neon-blue transition-colors";
  };

  return (
    <aside className="w-64 bg-navy-800 border-r border-navy-700 flex flex-col h-full shadow-[4px_0_24px_rgba(0,216,232,0.15)] relative z-10">
      <div className="p-6 pb-2 flex items-center justify-center">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img 
              src="/pulse_transparent.png" 
              alt="Pulse Logo" 
              className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(0,216,232,0.5)]" 
            />
            <div className="flex items-center font-orbitron">
              <span className="text-2xl font-black tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                Pulse
              </span>
              <span className="text-2xl font-black tracking-tight text-neon-blue drop-shadow-[0_0_12px_rgba(0,216,232,0.8)]">
                Prep
              </span>
            </div>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 px-4 space-y-3 mt-8">
        <Link href="/" className={getLinkClasses('/')}>
          <Home className={getIconClasses('/')} />
          <span>Dashboard</span>
        </Link>
        <Link href="/practice" className={getLinkClasses('/practice')}>
          <Target className={getIconClasses('/practice')} />
          <span>Practice</span>
        </Link>
        <Link href="/planner" className={getLinkClasses('/planner')}>
          <Calendar className={getIconClasses('/planner')} />
          <span>Smart Planner</span>
        </Link>
        <Link href="/analytics" className={getLinkClasses('/analytics')}>
          <BarChart2 className={getIconClasses('/analytics')} />
          <span>Analytics</span>
        </Link>
      </nav>
      
      <div className="p-4 mb-2">
        <Link href="/settings" className={getLinkClasses('/settings')}>
          <Settings className={getIconClasses('/settings')} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
};
