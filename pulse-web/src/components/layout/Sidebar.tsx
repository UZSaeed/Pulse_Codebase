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
      ? 'group flex items-center gap-3 rounded-2xl bg-cyan-600/10 px-4 py-3 font-bold tracking-wide text-cyan-600 transition-all duration-300'
      : 'group flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold tracking-wide text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-800';
  };

  return (
    <aside className="relative z-10 flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-center p-6 pb-4">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/pulse_transparent.png"
            alt="SpikePrep"
            className="h-10 w-10 object-contain"
          />
          <div className="flex items-center">
            <span className="text-2xl font-black tracking-tight text-slate-800">Spike</span>
            <span className="text-2xl font-black tracking-tight text-cyan-600">Prep</span>
          </div>
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-1.5 px-4">
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
          className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 font-semibold tracking-wide text-slate-400 transition-all duration-300 hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
