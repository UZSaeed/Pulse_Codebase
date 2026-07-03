'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Gift, Users, Sparkles } from 'lucide-react';

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
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-600"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-full bg-cyan-600 px-6 py-3 font-bold text-white transition-all hover:bg-cyan-700 active:scale-[0.97] disabled:opacity-60"
        >
          {status === 'loading' ? 'Joining...' : 'Join free'}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-center text-sm ${status === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{message}</p>
      )}
    </form>
  );
}

const FEATURES = [
  'Adaptive practice in Reading & Writing and Math',
  'Personalized daily study plan',
  'Bronze → Silver → Gold progression system',
  'AI-powered explanations for every question',
  'Practice test score tracking',
  'Spike, your personal study buddy',
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <img src="/spike-mascot.png" alt="Spike" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-black">Spike</span>
            <span className="text-2xl font-black text-cyan-600">Prep</span>
          </Link>
          <Link
            href="/landing"
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-cyan-600 hover:text-cyan-600"
          >
            Back to home
          </Link>
        </div>

        <section className="py-16 text-center md:py-24">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600">
            <Gift className="h-4 w-4" />
            Early access — completely free
          </div>
          <h1 className="mb-4 text-4xl font-black text-slate-900 md:text-5xl">
            Simple pricing. No surprises.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-500">
            SpikePrep is free during early access. When we launch paid plans, early users keep free access.
          </p>
        </section>

        <div className="mx-auto grid max-w-4xl gap-6 pb-16 md:grid-cols-2">
          {/* Free / Early Access */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-cyan-600 bg-white p-8 squishy-shadow-lg">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-600/10" />
            <div className="relative">
              <div className="mb-1 text-sm font-bold uppercase tracking-wider text-cyan-600">Early bird</div>
              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">$0</span>
                <span className="text-lg text-slate-400">/forever</span>
              </div>
              <p className="mb-6 text-slate-500">Join now and get everything free — no catch.</p>

              <ul className="mb-8 space-y-3">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <WaitlistForm />
            </div>
          </div>

          {/* Pro (Coming Soon) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 squishy-shadow">
            <div className="mb-1 text-sm font-bold uppercase tracking-wider text-slate-400">Pro</div>
            <div className="mb-2 flex items-baseline gap-1">
              <span className="text-5xl font-black text-slate-300">$9</span>
              <span className="text-lg text-slate-300">/month</span>
            </div>
            <p className="mb-6 text-slate-400">Coming later — everything in Free plus more.</p>

            <ul className="mb-8 space-y-3">
              {[
                ...FEATURES,
                'Unlimited AI tutor conversations',
                'Advanced analytics & insights',
                'Priority support',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200">
                    <Check className="h-3 w-3 text-slate-400" />
                  </div>
                  <span className="text-slate-400">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">
              Coming soon — early bird users get this free
            </div>
          </div>
        </div>

        {/* Referral section */}
        <section className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-cyan-50 to-white p-8 text-center md:p-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-600/10">
            <Users className="h-8 w-8 text-cyan-600" />
          </div>
          <h2 className="mb-3 text-2xl font-black text-slate-900">
            Refer 5 friends, get free forever
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-slate-500">
            Love SpikePrep? Share it with friends. When 5 of your referrals sign up, you get lifetime free access to every feature — even after we launch paid plans.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="flex items-center gap-2 rounded-full bg-white px-5 py-3 squishy-shadow">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <span className="font-bold text-slate-700">Refer 5 friends = Free lifetime access</span>
            </div>
          </div>
          <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
            {[
              { step: '1', title: 'Sign up', desc: 'Create your free SpikePrep account.' },
              { step: '2', title: 'Share your link', desc: 'Send your unique referral link to friends.' },
              { step: '3', title: 'Unlock forever', desc: 'When 5 friends join, your access is locked in for life.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-3 rounded-2xl bg-white p-4 squishy-shadow">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-black text-white">
                  {item.step}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{item.title}</div>
                  <div className="text-sm text-slate-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative mx-auto my-16 max-w-lg text-center">
          <img
            src="/spike-celebrate.png"
            alt="Spike celebrating"
            className="mx-auto mb-4 h-28 w-28 object-contain"
          />
          <h3 className="mb-2 text-xl font-black text-slate-900">Questions?</h3>
          <p className="text-slate-500">
            Reach out anytime — we&apos;re a small team and we read every message.
          </p>
        </section>

        <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
          <p>SpikePrep — making SAT prep less painful, one question at a time.</p>
        </footer>
      </div>
    </div>
  );
}
