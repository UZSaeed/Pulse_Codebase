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
          className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-cyan-600 hover:text-cyan-600"
        >
          Log in
        </Link>
        <button
          type="button"
          onClick={tempLogin}
          disabled={loading}
          className="rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:opacity-60 active:scale-[0.97]"
        >
          {loading ? 'Starting...' : 'Try it free'}
        </button>
      </div>
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
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
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 squishy-shadow sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email for free early access"
          className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-xl bg-cyan-600 px-6 py-3 font-bold text-white transition-all hover:bg-cyan-700 active:scale-[0.97] disabled:opacity-60"
        >
          {status === 'loading' ? 'Joining...' : 'Get early access'}
        </button>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${status === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{message}</p>
      )}
    </form>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/spike-mascot.png" alt="Spike" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-black">Spike</span>
            <span className="text-2xl font-black text-cyan-600">Prep</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-sm font-bold text-slate-500 transition hover:text-cyan-600"
            >
              Pricing
            </Link>
            <LoginControls />
          </div>
        </div>

        <section className="relative py-20 md:py-28">
          <div className="absolute left-1/4 top-10 h-80 w-80 rounded-full bg-cyan-600/5 blur-[100px]" />
          <div className="absolute right-1/4 top-40 h-60 w-60 rounded-full bg-purple-500/5 blur-[100px]" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-600/20 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-600">
              Free during early access
            </div>
            <h1 className="mb-6 text-4xl font-black leading-tight text-slate-900 md:text-6xl">
              SAT prep that actually knows what you need to work on.
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-500 md:text-xl">
              SpikePrep figures out your weak spots and builds a daily plan just for you. Every practice session adapts to your level — so you spend time where it actually matters.
            </p>
            <div className="flex justify-center">
              <WaitlistForm />
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <img src="/spike-mascot.png" alt="Spike the robot" className="h-32 w-32 animate-bounce-in object-contain md:h-40 md:w-40" />
          </div>
        </section>

        <section className="grid gap-6 pb-16 md:grid-cols-3">
          {[
            {
              emoji: '🎯',
              title: 'Finds your weak spots',
              body: 'Answer questions and Spike tracks which topics you\'re strong in and which need more work. No guessing.',
            },
            {
              emoji: '📈',
              title: 'Levels up with you',
              body: 'Start at your level and work your way up through Bronze, Silver, and Gold. Questions get harder as you improve.',
            },
            {
              emoji: '📅',
              title: 'Daily plan, built for you',
              body: 'Get a study plan that focuses on exactly what you need each day — both Reading & Writing and Math.',
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 squishy-shadow transition-all hover:squishy-shadow-hover">
              <div className="mb-3 text-3xl">{feature.emoji}</div>
              <div className="mb-2 text-lg font-bold text-slate-800">{feature.title}</div>
              <p className="text-slate-500">{feature.body}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-3xl pb-20 text-center">
          <h2 className="mb-4 text-3xl font-black text-slate-900">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { step: '1', title: 'Take a quick quiz', desc: 'Answer a few questions so Spike can figure out where you\'re at.' },
              { step: '2', title: 'Get your daily plan', desc: 'Spike builds a personalized study schedule that targets your weak areas first.' },
              { step: '3', title: 'Level up to Gold', desc: 'Practice every day and watch your skills grow. Aim for Gold in every topic before test day.' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-xl font-black text-white">
                  {item.step}
                </div>
                <div className="text-lg font-bold text-slate-800">{item.title}</div>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative mx-auto mb-16 max-w-2xl rounded-3xl bg-cyan-50 p-8 text-center md:p-12">
          <img
            src="/spike-peek.png"
            alt="Spike peeking"
            className="absolute -top-10 left-1/2 h-20 w-28 -translate-x-1/2 object-contain"
          />
          <h2 className="mb-3 mt-4 text-2xl font-black text-slate-900">Ready to get started?</h2>
          <p className="mb-6 text-slate-600">Join thousands of students already prepping smarter with Spike.</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/pricing"
              className="rounded-full border-2 border-cyan-600 px-6 py-3 font-bold text-cyan-600 transition hover:bg-cyan-600 hover:text-white active:scale-[0.97]"
            >
              See pricing
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
          <p>SpikePrep — making SAT prep less painful, one question at a time.</p>
        </footer>
      </div>
    </div>
  );
}
