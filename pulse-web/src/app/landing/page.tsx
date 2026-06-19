'use client';

import { useState } from 'react';
import Link from 'next/link';

function LoginControls() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tempLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next: '/dashboard' }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Unable to start temp session.');
        return;
      }

      window.location.assign(data.next || '/dashboard');
    } catch {
      setError('Unable to start temp session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        <Link
          href="/testing"
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 transition hover:border-neon-blue/40 hover:text-white"
        >
          Log in
        </Link>
        <button
          type="button"
          onClick={tempLogin}
          disabled={loading}
          className="rounded-full bg-neon-blue px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-navy-900 transition hover:shadow-[0_0_18px_rgba(0,216,232,0.4)] disabled:opacity-60"
        >
          {loading ? 'Starting...' : 'Temp login'}
        </button>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-xl">
      <div className="flex flex-col gap-3 rounded-2xl border border-navy-700 bg-navy-800/80 p-2 shadow-[0_0_24px_rgba(0,216,232,0.08)] sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email for early access"
          className="flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-xl bg-neon-blue px-6 py-3 font-bold text-navy-900 transition-all hover:shadow-[0_0_18px_rgba(0,216,232,0.5)] disabled:opacity-60"
        >
          {status === 'loading' ? 'Joining...' : 'Join beta'}
        </button>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{message}</p>
      )}
    </form>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-navy-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-orbitron">
            <img src="/pulse_transparent.png" alt="Spike Prep" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-black">Spike</span>
            <span className="text-2xl font-black text-neon-blue">Prep</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              SAT beta
            </div>
            <LoginControls />
          </div>
        </div>

        <section className="relative py-24">
          <div className="absolute left-1/4 top-10 h-80 w-80 rounded-full bg-neon-blue/10 blur-[120px]" />
          <div className="absolute right-1/4 top-40 h-80 w-80 rounded-full bg-emerald-500/10 blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neon-blue/30 bg-neon-blue/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-neon-blue">
              Official-bank grounded SAT prep
            </div>
            <h1 className="mb-6 text-5xl font-display font-black leading-tight md:text-7xl">
              Adaptive SAT prep that actually knows your weak spots.
            </h1>
            <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-slate-400 md:text-xl">
              Spike SAT Prep uses local official SAT question-bank exports, domain confidence, and section-level ELO to
              build a daily plan that starts with your weakest Reading & Writing and Math areas first.
            </p>
            <div className="flex justify-center">
              <WaitlistForm />
            </div>
          </div>
        </section>

        <section className="grid gap-6 pb-20 md:grid-cols-3">
          {[
            {
              title: 'Official-bank grounded',
              body: 'The SAT PDF exports in this repo seed a local knowledge layer that shapes retrieval and new-question generation.',
            },
            {
              title: 'Bronze to Gold progression',
              body: 'Each SAT section and domain levels through Bronze, Silver, and Gold bands with visible subtiers and adaptive difficulty.',
            },
            {
              title: 'A planner that thinks in domains',
              body: 'Instead of generic daily quotas, the schedule targets the exact Reading & Writing and Math domains where you need the most work.',
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-navy-700 bg-navy-800/70 p-6">
              <div className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-neon-blue">{feature.title}</div>
              <p className="text-slate-400">{feature.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
