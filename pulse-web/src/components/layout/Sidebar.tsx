'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Target, Calendar, ClipboardCheck, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/practice', label: 'Practice', icon: Target },
  { href: '/planner', label: 'Planner', icon: Calendar },
  { href: '/practice-tests', label: 'Practice Tests', icon: ClipboardCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const getLinkClasses = (path: string) => {
    const active = pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
    return active
      ? 'group flex items-center gap-3 rounded-xl border border-neon-blue/40 bg-navy-700/60 px-4 py-3 font-bold tracking-wide text-neon-blue shadow-[inset_0_0_12px_rgba(0,216,232,0.3)] transition-all duration-300'
      : 'group flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 font-semibold tracking-wide text-slate-400 transition-all duration-300 hover:border-slate-600 hover:bg-navy-700/40 hover:text-white';
  };

  return (
    <aside className="relative z-10 flex h-full w-64 flex-col border-r border-navy-700 bg-navy-800 shadow-[4px_0_24px_rgba(0,216,232,0.12)]">
      <div className="flex items-center justify-center p-6 pb-4">
        <Link href="/" className="flex items-center gap-2 font-orbitron">
          <img
            src="/pulse_transparent.png"
            alt="Spike Prep"
            className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(0,216,232,0.5)]"
          />
          <div className="flex items-center">
            <span className="text-2xl font-black tracking-tight text-white">Spike</span>
            <span className="text-2xl font-black tracking-tight text-neon-blue">Prep</span>
          </div>
        </Link>
      </div>

      <div className="px-6 pb-2">
        <div className="rounded-2xl border border-neon-blue/20 bg-neon-blue/5 px-4 py-3 text-xs text-slate-300">
          <div className="mb-1 font-bold uppercase tracking-[0.18em] text-neon-blue">Digital SAT</div>
          <p>Adaptive section planning, official-bank grounding, and domain-level confidence tracking.</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-3 px-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={getLinkClasses(item.href)}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mb-2 p-4">
        <button
          onClick={async () => {
            await fetch('/api/dev-logout', { method: 'POST' });
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/landing');
            router.refresh();
          }}
          className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 font-semibold tracking-wide text-slate-400 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
