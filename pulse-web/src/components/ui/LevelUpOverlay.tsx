'use client';

import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import CountUp from 'react-countup';
import { useConfetti } from '@/hooks/useConfetti';
import type { TieredRankInfo, RankName } from '@/lib/elo';
import { RANK_COLORS } from '@/lib/elo';

// ─── Inline Lottie JSON: simple starburst celebration ────────────
// A lightweight custom animation since we can't download from LottieFiles at build time.
// Users can replace this with a higher-quality LottieFiles JSON in the future.

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
          { ty: "fl", c: { a: 0, k: [0, 0.85, 0.91, 1] }, o: { a: 0, k: 100 } },
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
            { ty: "st", c: { a: 0, k: [0, 0.85, 0.91, 1] }, o: { a: 0, k: 60 }, w: { a: 0, k: 3 } },
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
  const [visible, setVisible] = useState(false);

  // Negative xpGained indicates a rank/level down
  const isNegative = xpGained < 0;

  useEffect(() => {
    if (show) {
      setVisible(true);
      
      let confettiTimer: NodeJS.Timeout | undefined;
      // Only fire confetti if it's a positive gain
      if (!isNegative) {
        confettiTimer = setTimeout(() => {
          fireConfetti();
          setTimeout(() => fireConfetti(), 300);
        }, 500);
      }

      // Auto-dismiss after 5 seconds
      const dismissTimer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 500);
      }, 5000);

      return () => {
        if (confettiTimer) clearTimeout(confettiTimer);
        clearTimeout(dismissTimer);
      };
    }
  }, [show, fireConfetti, onDismiss, isNegative]);

  if (!show && !visible) return null;

  // Decide colors and title based on positive vs negative change
  const title = rankChanged 
    ? (isNegative ? 'Rank Down' : 'Rank Up!') 
    : (isNegative ? 'Level Down' : 'Level Up!');

  const colors = isNegative 
    ? { gradient: 'from-red-500 to-rose-400', text: 'text-red-900', shadow: 'shadow-red-500/50' }
    : RANK_COLORS[newRank.rank];

  const titleColor = isNegative 
    ? 'text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.5)]' 
    : 'text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]';

  const xpColor = isNegative ? 'text-red-400' : 'text-emerald-400';
  const xpPrefix = isNegative ? '' : '+'; // Negative numbers inherently have a minus sign

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={() => { setVisible(false); setTimeout(onDismiss, 500); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-900/90 backdrop-blur-lg" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Lottie animation behind the rank badge (only for positive gain) */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {!isNegative && (
            <Lottie
              animationData={celebrationAnimation}
              loop={true}
              className="absolute inset-0 w-full h-full"
            />
          )}
          
          {/* Rank icon in center */}
          <div className="relative z-10 flex flex-col items-center">
            <span className={`text-7xl drop-shadow-[0_0_20px_rgba(0,216,232,0.6)] animate-bounce`}>
              {newRank.icon}
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-4xl font-display font-black uppercase tracking-[0.3em] mt-2 ${titleColor}`}>
          {title}
        </h1>

        {/* Rank display */}
        <div className={`mt-4 bg-gradient-to-r ${colors.gradient} ${colors.text} text-2xl font-display font-black px-8 py-3 rounded-2xl shadow-2xl ${colors.shadow} tracking-wider`}>
          {newRank.displayName}
        </div>

        {/* ELO */}
        <div className="mt-4 text-neon-blue font-display font-bold text-xl">
          ELO: <CountUp end={newRank.currentElo} duration={2} useEasing />
        </div>

        {/* XP gained */}
        <div className={`mt-2 font-bold text-sm uppercase tracking-widest ${xpColor}`}>
          {xpPrefix}{xpGained} XP
        </div>

        {/* Rank transition */}
        {rankChanged && oldRank && (
          <div className="mt-6 flex items-center gap-4 text-slate-400 text-sm">
            <span className="text-lg">{oldRank.icon}</span>
            <span>{oldRank.displayName}</span>
            <span className="text-neon-blue text-xl">→</span>
            <span className="text-lg">{newRank.icon}</span>
            <span className={`${isNegative ? 'text-red-400' : 'text-emerald-400'} font-bold`}>{newRank.displayName}</span>
          </div>
        )}

        {/* Dismiss hint */}
        <p className="mt-8 text-slate-500 text-xs uppercase tracking-widest animate-pulse">
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
};
