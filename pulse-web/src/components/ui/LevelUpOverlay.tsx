'use client';

import React, { useEffect } from 'react';
import Lottie from 'lottie-react';
import CountUp from 'react-countup';
import { useConfetti } from '@/hooks/useConfetti';
import type { TieredRankInfo } from '@/lib/elo';
import { RANK_COLORS } from '@/lib/elo';

const celebrationAnimation = {
  v: "5.5.2",
  fr: 30,
  ip: 0,
  op: 60,
  w: 400,
  h: 400,
  nm: "Celebration",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0, ind: 1, ty: 4, nm: "Burst", sr: 1, ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 10, s: [100] }, { t: 45, s: [100] }, { t: 60, s: [0] }] },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
        p: { a: 0, k: [200, 200, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [0, 0, 100] }, { t: 15, s: [120, 120, 100] }, { t: 60, s: [80, 80, 100] }] }
      },
      shapes: Array.from({ length: 8 }, (_, i) => ({
        ty: "gr",
        it: [
          { ty: "rc", d: 1, s: { a: 0, k: [6, 40] }, p: { a: 0, k: [0, -80] }, r: { a: 0, k: 4 } },
          { ty: "fl", c: { a: 0, k: [0, 0.72, 0.83, 1] }, o: { a: 0, k: 100 } },
          { ty: "tr", p: { a: 0, k: [0, 0] }, r: { a: 0, k: i * 45 }, s: { a: 0, k: [100, 100] }, o: { a: 0, k: 100 }, a: { a: 0, k: [0, 0] } }
        ],
        nm: `Ray ${i}`
      }))
    },
    {
      ddd: 0, ind: 2, ty: 4, nm: "Ring", sr: 1, ks: {
        o: { a: 1, k: [{ t: 5, s: [0] }, { t: 15, s: [80] }, { t: 50, s: [80] }, { t: 60, s: [0] }] },
        p: { a: 0, k: [200, 200, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 5, s: [0, 0, 100] }, { t: 25, s: [100, 100, 100] }] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "el", d: 1, s: { a: 0, k: [200, 200] }, p: { a: 0, k: [0, 0] } },
            { ty: "st", c: { a: 0, k: [0, 0.72, 0.83, 1] }, o: { a: 0, k: 60 }, w: { a: 0, k: 3 } },
            { ty: "tr", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, o: { a: 0, k: 100 }, a: { a: 0, k: [0, 0] } }
          ],
          nm: "Ring"
        }
      ]
    }
  ]
};

interface LevelUpOverlayProps {
  show: boolean;
  newRank: TieredRankInfo;
  oldRank?: TieredRankInfo;
  rankChanged: boolean;
  xpGained: number;
  onDismiss: () => void;
}

export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({
  show,
  newRank,
  oldRank,
  rankChanged,
  xpGained,
  onDismiss,
}) => {
  const { fireConfetti } = useConfetti();

  const isNegative = xpGained < 0;

  useEffect(() => {
    if (show) {
      let confettiTimer: NodeJS.Timeout | undefined;
      if (!isNegative) {
        confettiTimer = setTimeout(() => {
          fireConfetti();
          setTimeout(() => fireConfetti(), 300);
        }, 500);
      }

      const dismissTimer = setTimeout(onDismiss, 5000);

      return () => {
        if (confettiTimer) clearTimeout(confettiTimer);
        clearTimeout(dismissTimer);
      };
    }
  }, [show, fireConfetti, onDismiss, isNegative]);

  if (!show) return null;

  const title = rankChanged 
    ? (isNegative ? 'Rank Down' : 'Rank Up!') 
    : (isNegative ? 'Level Down' : 'Level Up!');

  const colors = isNegative 
    ? { gradient: 'from-red-500 to-rose-400', text: 'text-white', shadow: 'shadow-red-500/50' }
    : RANK_COLORS[newRank.rank];

  const titleColor = isNegative 
    ? 'text-red-500' 
    : 'text-slate-900';

  const xpColor = isNegative ? 'text-red-500' : 'text-emerald-500';
  const xpPrefix = isNegative ? '' : '+';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500"
      onClick={onDismiss}
    >
      <div className="absolute inset-0 bg-white/90 backdrop-blur-lg" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {!isNegative && (
            <Lottie
              animationData={celebrationAnimation}
              loop={true}
              className="absolute inset-0 w-full h-full"
            />
          )}
          
          <div className="relative z-10">
            <img
              src={isNegative ? "/spike-mascot.png" : "/spike-celebrate.png"}
              alt="Spike"
              className="h-32 w-32 object-contain"
            />
          </div>
        </div>

        <h1 className={`text-4xl font-black uppercase tracking-wider mt-2 ${titleColor}`}>
          {title}
        </h1>

        <div className={`mt-4 bg-gradient-to-r ${colors.gradient} ${colors.text} text-2xl font-black px-8 py-3 rounded-2xl shadow-lg tracking-wider`}>
          {newRank.displayName}
        </div>

        <div className="mt-4 text-cyan-600 font-bold text-xl">
          Rating: <CountUp end={newRank.currentElo} duration={2} useEasing />
        </div>

        <div className={`mt-2 font-bold text-sm uppercase tracking-wider ${xpColor}`}>
          {xpPrefix}{xpGained} XP
        </div>

        {rankChanged && oldRank && (
          <div className="mt-6 flex items-center gap-4 text-slate-500 text-sm">
            <span>{oldRank.displayName}</span>
            <span className="text-cyan-600 text-xl">→</span>
            <span className={`${isNegative ? 'text-red-500' : 'text-emerald-500'} font-bold`}>{newRank.displayName}</span>
          </div>
        )}

        <p className="mt-8 text-slate-400 text-xs uppercase tracking-wider animate-pulse">
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
};
