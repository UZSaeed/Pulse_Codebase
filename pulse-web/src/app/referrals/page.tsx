'use client';

import { useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { useUserProfile } from '@/context/UserProfileContext';
import { Gift, Copy, Check, Users, Crown, Share2 } from 'lucide-react';

const REFERRAL_GOAL = 5;

export default function ReferralsPage() {
  const { profile } = useUserProfile();
  const [copied, setCopied] = useState(false);

  const referralCode = useMemo(() => {
    if (!profile.id) return '';
    return profile.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  }, [profile.id]);

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined' || !referralCode) return '';
    return `${window.location.origin}/landing?ref=${referralCode}`;
  }, [referralCode]);

  const referralCount = ((profile.preferences as unknown as Record<string, unknown>)?.referralCount as number) ?? 0;
  const isUnlocked = referralCount >= REFERRAL_GOAL;
  const progress = Math.min(referralCount, REFERRAL_GOAL);

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SpikePrep - SAT prep that actually works',
          text: "I'm using SpikePrep to study for the SAT. It's free right now - try it out!",
          url: referralLink,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900">Referrals</h1>
            <p className="mt-1 text-slate-500">
              Invite friends and earn free lifetime access.
            </p>
          </div>

          <Card className="mb-6 overflow-hidden">
            <div className="flex items-center gap-4 p-6">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isUnlocked ? 'bg-amber-100' : 'bg-cyan-100'}`}
              >
                {isUnlocked ? (
                  <Crown className="h-7 w-7 text-amber-600" />
                ) : (
                  <Gift className="h-7 w-7 text-cyan-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    {isUnlocked
                      ? 'Lifetime access unlocked!'
                      : `${progress} of ${REFERRAL_GOAL} referrals`}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${isUnlocked ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}
                  >
                    {isUnlocked ? 'Unlocked' : `${REFERRAL_GOAL - progress} more to go`}
                  </span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isUnlocked ? 'bg-amber-500' : 'bg-cyan-600'}`}
                    style={{ width: `${(progress / REFERRAL_GOAL) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {isUnlocked
                    ? "You've earned free access to SpikePrep for life - even after paid plans launch. Keep sharing to help your friends!"
                    : `Refer ${REFERRAL_GOAL - progress} more friend${REFERRAL_GOAL - progress === 1 ? '' : 's'} to unlock free lifetime access to all features.`}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between">
                {Array.from({ length: REFERRAL_GOAL }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                        i < progress
                          ? 'bg-cyan-600 text-white'
                          : i === progress
                            ? 'border-2 border-cyan-600 text-cyan-600'
                            : 'border-2 border-slate-200 text-slate-300'
                      }`}
                    >
                      {i < progress ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    {i === REFERRAL_GOAL - 1 && (
                      <span className="text-xs font-bold text-amber-600">Free forever</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="mb-6">
            <div className="p-6">
              <h3 className="mb-1 text-lg font-bold text-slate-900">Your referral link</h3>
              <p className="mb-4 text-sm text-slate-500">
                Share this link with friends. When they sign up, it counts toward your goal.
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {referralLink || 'Loading...'}
                  </p>
                </div>
                <button
                  onClick={copyLink}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-600 hover:text-cyan-600 active:scale-[0.95]"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={shareLink}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-bold text-white transition hover:bg-cyan-700 active:scale-[0.97]"
                >
                  <Share2 className="h-5 w-5" />
                  Share with friends
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="mb-4 text-lg font-bold text-slate-900">How it works</h3>
              <div className="space-y-4">
                {[
                  {
                    icon: Share2,
                    title: 'Share your link',
                    desc: 'Send your unique referral link to friends studying for the SAT.',
                  },
                  {
                    icon: Users,
                    title: 'Friends sign up',
                    desc: 'When a friend creates an account through your link, it counts as a referral.',
                  },
                  {
                    icon: Crown,
                    title: 'Unlock lifetime access',
                    desc: 'Once 5 friends join, you get free access to every SpikePrep feature for life.',
                  },
                ].map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-black text-white">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{step.title}</div>
                        <p className="text-sm text-slate-500">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
