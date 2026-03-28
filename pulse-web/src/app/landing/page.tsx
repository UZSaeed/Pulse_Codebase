'use client';

import { useEffect, useState, useRef } from 'react';

const FEATURES = [
  {
    icon: '🎯',
    title: 'Adaptive AI Questions',
    description: 'AI-generated test-accurate questions that match your exact skill level using ELO matchmaking.',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    icon: '🏆',
    title: 'Competitive Rank System',
    description: 'Climb from Iron to Diamond across 15 tiers. Track your ELO across all four MCAT sections.',
    gradient: 'from-purple-500 to-pink-400',
  },
  {
    icon: '🧠',
    title: 'Spaced Repetition Engine',
    description: 'SM-2 algorithm ensures you review weak concepts at the perfect interval for long-term retention.',
    gradient: 'from-green-500 to-emerald-400',
  },
  {
    icon: '💬',
    title: 'AI Tutor Chat',
    description: 'Ask follow-up questions on any problem. Get instant, context-aware explanations from your AI tutor.',
    gradient: 'from-orange-500 to-yellow-400',
  },
];

function WaitlistForm({ id, variant = 'hero' }: { id: string; variant?: 'hero' | 'cta' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.status === 201) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else if (res.status === 200) {
        setStatus('duplicate');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'success' || status === 'duplicate') {
    return (
      <div className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border ${
        status === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
      } animate-fade-in`}>
        <span className="text-2xl">{status === 'success' ? '🎉' : '✨'}</span>
        <span className="font-semibold text-sm md:text-base">{message}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className={`relative flex items-center gap-2 rounded-2xl border transition-all duration-300 ${
        variant === 'hero'
          ? 'bg-navy-800/80 border-navy-700 hover:border-neon-blue/40 focus-within:border-neon-blue/60 focus-within:shadow-[0_0_30px_rgba(0,216,232,0.15)] p-2'
          : 'bg-navy-900/80 border-navy-700 hover:border-neon-blue/40 focus-within:border-neon-blue/60 focus-within:shadow-[0_0_30px_rgba(0,216,232,0.15)] p-2'
      }`}>
        <input
          ref={inputRef}
          id={id}
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
          placeholder="Enter your email for early access"
          required
          className="flex-1 bg-transparent text-white placeholder:text-slate-500 px-4 py-3 text-sm md:text-base outline-none font-medium"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="shrink-0 bg-neon-blue text-navy-900 font-bold text-sm px-6 py-3 rounded-xl hover:shadow-[0_0_24px_rgba(0,216,232,0.5)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-navy-900/40 border-t-navy-900 rounded-full animate-spin" />
              Joining...
            </>
          ) : (
            'Join Beta'
          )}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-red-400 text-sm mt-3 text-center animate-fade-in">{message}</p>
      )}

      <p className="text-slate-500 text-xs mt-3 text-center">
        We&apos;ll never spam you. Unsubscribe anytime.
      </p>
    </form>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  // Typewriter effect state
  const WORDS = ["Level Up", "Win", "Spike."];
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const currentWord = WORDS[wordIndex];
    let timeoutId: NodeJS.Timeout;

    if (!isDeleting) {
      if (text.length < currentWord.length) {
        timeoutId = setTimeout(() => setText(currentWord.slice(0, text.length + 1)), 100);
      } else {
        if (wordIndex === WORDS.length - 1) {
          // Stop at the last word
          return;
        }
        timeoutId = setTimeout(() => setIsDeleting(true), 2000); // Pause before deleting
      }
    } else {
      if (text.length > 0) {
        timeoutId = setTimeout(() => setText(currentWord.slice(0, text.length - 1)), 50);
      } else {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % WORDS.length);
      }
    }

    return () => clearTimeout(timeoutId);
  }, [text, isDeleting, wordIndex]);

  return (
    <div className="min-h-screen bg-navy-900 text-white overflow-hidden">
      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 font-orbitron">
          <img src="/pulse_transparent.png" alt="Spike Prep" className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(0,216,232,0.5)]" />
          <span className="text-2xl font-black tracking-tight text-white">Spike</span>
          <span className="text-2xl font-black tracking-tight text-neon-blue drop-shadow-[0_0_12px_rgba(0,216,232,0.8)]">Prep</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Invite-Only Beta
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-7xl mx-auto px-8 pt-20 pb-32">
        {/* Glow orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-neon-blue/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className={`relative z-10 text-center max-w-3xl mx-auto transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-xs font-bold uppercase tracking-[0.2em] mb-8">
            <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
            Now in Private Beta
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-black leading-[1.1] mb-6 tracking-tight">
            Watch Your MCAT Score{' '}
            <span className="relative inline-flex items-baseline">
              <span className="bg-gradient-to-r from-neon-blue via-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,216,232,0.4)]">
                {text || '\u200B'}
              </span>
              <span className="animate-pulse ml-1 w-1.5 h-[1em] bg-neon-blue transform translate-y-[2px]" />
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent rounded-full transition-all duration-300" />
            </span>
          </h1>

          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Test-accurate rigor meets adaptive engagement. AI-generated, ELO-matched questions
            with spaced repetition — infinite adaptive practice that makes studying
            <span className="text-white font-semibold"> actually addictive</span>.
          </p>

          {/* Email capture form */}
          <WaitlistForm id="hero-waitlist" variant="hero" />

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">⚡</span> Infinite question bank
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🎮</span> ELO ranking system
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🧬</span> All 4 MCAT sections
            </div>
          </div>
        </div>

        {/* Product Preview UI Mockup */}
        <div className={`relative z-10 mt-24 max-w-5xl mx-auto transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
          <div className="rounded-2xl border border-navy-700 bg-navy-900/80 backdrop-blur-xl shadow-[0_0_80px_rgba(0,216,232,0.15)] overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-800 bg-navy-900/50">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="text-[10px] font-semibold text-slate-500 font-orbitron tracking-[0.2em]">APP.SPIKEPREP.COM</div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-navy-700 bg-navy-800 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                </div>
              </div>
            </div>

            {/* Interface body */}
            <div className="flex flex-col md:flex-row min-h-[460px]">
              {/* Left Panel: Question */}
              <div className="flex-1 p-6 md:p-10 flex flex-col items-start text-left">
                <div className="flex items-center justify-between w-full mb-8">
                  <span className="text-xs font-bold uppercase tracking-widest text-neon-blue bg-neon-blue/10 px-3 py-1.5 rounded-full border border-neon-blue/20">Biology &amp; Biochem</span>
                  <div className="flex items-center gap-2 text-sm text-slate-400 font-bold bg-navy-800/50 px-3 py-1.5 rounded-full border border-navy-700">
                    <span className="text-amber-400">🔥 12 day streak</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">Question 14 of 59</h3>
                <p className="text-slate-300 mb-8 leading-relaxed text-lg text-left">
                  Which of the following would most likely diminish the effect of an enzyme that exhibits cooperative binding?
                </p>

                {/* Options */}
                <div className="space-y-3 mb-8 w-full">
                  {["Adding a competitive inhibitor", "Introducing an allosteric activator", "A mutation that decreases subunit affinity", "Decreasing the temperature of the system"].map((opt, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${i === 2 ? 'border-neon-blue bg-neon-blue/5' : 'border-navy-700 bg-navy-800/30'} flex items-center gap-4`}>
                      <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center ${i === 2 ? 'border-neon-blue bg-neon-blue/20' : 'border-slate-600'}`}>
                        {i === 2 && <span className="w-2.5 h-2.5 rounded-full bg-neon-blue" />}
                      </div>
                      <span className={i === 2 ? 'text-white font-medium' : 'text-slate-400'}>{opt}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 flex justify-between items-center w-full border-t border-navy-800">
                  <div className="px-6 py-2.5 rounded-xl text-slate-500 font-medium border border-navy-700 bg-navy-800/30">Skip Question</div>
                  <div className="px-8 py-2.5 rounded-xl bg-neon-blue text-navy-900 font-bold">Submit Answer</div>
                </div>
              </div>

              {/* Right Panel: AI Tutor & Stats */}
              <div className="w-full md:w-[360px] bg-navy-800/20 border-l border-navy-800 p-6 flex flex-col relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />

                {/* Rank Stats */}
                <div className="relative z-10 p-5 rounded-2xl bg-navy-900/80 border border-navy-700 mb-6 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-400">Current Rank</span>
                    <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-purple-400 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(0,216,232,0.4)]">Diamond II</span>
                  </div>
                  <div className="w-full h-2.5 bg-navy-950 rounded-full overflow-hidden mb-2 border border-navy-800">
                    <div className="h-full bg-gradient-to-r from-neon-blue to-purple-500 w-[78%] rounded-full shadow-[0_0_12px_rgba(0,216,232,0.6)] relative">
                      <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/20 blur-[2px]" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold tracking-wide">
                    <span>1420 ELO</span>
                    <span>1500 ELO</span>
                  </div>
                </div>

                {/* AI Tutor Chat */}
                <div className="relative z-10 flex-1 flex flex-col border border-navy-700 rounded-2xl bg-navy-950/50 overflow-hidden shadow-lg">
                  <div className="px-4 py-3.5 border-b border-navy-800 bg-navy-900/80 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-blue to-purple-500 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(0,216,232,0.3)]">🤖</div>
                    <div>
                      <h4 className="font-bold text-sm text-white leading-tight">Spike AI Tutor</h4>
                      <div className="text-[10px] text-neon-blue font-medium flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" /> Online
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-4 text-[13px] overflow-hidden">
                    <div className="bg-navy-800/80 p-3.5 rounded-2xl rounded-tl-sm border border-navy-700 text-slate-300 shadow-sm leading-relaxed">
                      You&apos;re currently in the top 12% of users for Enzyme Kinetics. Want a quick refresher on Hill coefficients before answering?
                    </div>
                    <div className="bg-neon-blue/10 p-3.5 rounded-2xl rounded-tr-sm border border-neon-blue/20 text-white ml-auto max-w-[85%] shadow-sm leading-relaxed">
                      Yes, briefly explain how positive cooperativity works here.
                    </div>
                    <div className="bg-navy-800/80 p-3.5 rounded-2xl rounded-tl-sm border border-navy-700 text-slate-300 relative shadow-sm leading-relaxed">
                      <div className="w-2 h-2 rounded-full bg-neon-blue animate-ping absolute -left-1 -top-1" />
                      <div className="w-2 h-2 rounded-full bg-neon-blue absolute -left-1 -top-1" />
                      Positive cooperativity means the binding of one substrate...
                      <span className="inline-block w-1.5 h-3.5 ml-1.5 align-middle bg-neon-blue/80 animate-pulse" />
                    </div>
                  </div>

                  <div className="p-3 border-t border-navy-800 bg-navy-900/50 mt-auto">
                    <div className="bg-navy-950 border border-navy-700 rounded-xl px-4 py-2.5 text-slate-500 text-xs flex justify-between items-center shadow-inner">
                      <span>Ask the AI tutor...</span>
                      <div className="w-6 h-6 rounded-md bg-neon-blue/10 text-neon-blue flex items-center justify-center border border-neon-blue/20">↑</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative max-w-6xl mx-auto px-8 pb-32">
        <div className={`text-center mb-16 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
            Built different, for a <span className="text-neon-blue">different kind of student</span>.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Every feature is designed to maximize retention and make practice feel like a game, not a chore.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`group p-8 rounded-2xl border border-navy-700 bg-navy-800/50 backdrop-blur-sm hover:border-neon-blue/40 transition-all duration-500 hover:-translate-y-1 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${400 + i * 150}ms` }}
            >
              <div className="flex items-start gap-5">
                <div className={`text-4xl p-3 rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 shrink-0`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative max-w-4xl mx-auto px-8 pb-24 text-center">
        <div className="p-12 rounded-3xl border border-navy-700 bg-gradient-to-b from-navy-800 to-navy-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 to-purple-500/5" />
          <div className="relative z-10">
            <h2 className="text-3xl font-display font-bold mb-4 tracking-tight">Ready to rank up?</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Join the private beta and be first to experience MCAT prep that feels like competitive gaming.
            </p>
            <WaitlistForm id="cta-waitlist" variant="cta" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-navy-800 py-8 px-8 text-center text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} SpikePrep. All rights reserved.</p>
      </footer>
    </div>
  );
}
