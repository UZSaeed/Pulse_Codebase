'use client';

import React, { useMemo, useState } from 'react';
import type { DomainState } from '@/lib/planner';
import type { McatSubject, RankName } from '@/lib/elo';

interface DomainRadarProps {
  states: DomainState[]; // all domains, both sections
  initialSection?: McatSubject;
  size?: number;
  className?: string;
}

/**
 * Node graph of per-domain strength for one SAT section at a time.
 * Four axes = the section's four domains; the radial scale runs from
 * Bronze (easy questions) at the center to Gold (hard questions) at the rim.
 */

// Radial scale: deep Bronze at the center, Gold III at the rim.
const SCALE_MIN = 700;
const SCALE_MAX = 1900;
// Tier floors from elo.ts TIERED_RANKS.
const SILVER_FLOOR = 1100;
const GOLD_FLOOR = 1550;

const RANK_POINT_COLORS: Record<RankName, string> = {
  Bronze: '#cd7f32',
  Silver: '#c9d1e0',
  Gold: '#ffd700',
};

const SECTION_TABS: Array<{ subject: McatSubject; label: string }> = [
  { subject: 'reading_writing', label: 'English' },
  { subject: 'math', label: 'Math' },
];

const toFraction = (elo: number) =>
  Math.max(0.05, Math.min((elo - SCALE_MIN) / (SCALE_MAX - SCALE_MIN), 1));

export const DomainRadar: React.FC<DomainRadarProps> = ({
  states,
  initialSection = 'reading_writing',
  size = 380,
  className = '',
}) => {
  const [section, setSection] = useState<McatSubject>(initialSection);

  const sectionStates = useMemo(
    () =>
      states
        .filter((state) => state.subject === section)
        .sort((a, b) => a.chapterId.localeCompare(b.chapterId)),
    [states, section]
  );

  const center = size / 2;
  const padding = 78;
  const radius = (size - padding * 2) / 2;
  const n = Math.max(1, sectionStates.length);
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, fraction: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: center + radius * fraction * Math.cos(angle),
      y: center + radius * fraction * Math.sin(angle),
    };
  };

  const ringPoints = (fraction: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = getPoint(i, fraction);
      return `${p.x},${p.y}`;
    }).join(' ');

  const dataPoints = sectionStates.map((state, i) => getPoint(i, toFraction(state.elo)));
  const polygonPath =
    dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  const tierRings = [
    { fraction: toFraction(SILVER_FLOOR), label: 'Silver', color: 'rgba(201,209,224,0.45)' },
    { fraction: toFraction(GOLD_FLOOR), label: 'Gold', color: 'rgba(255,215,0,0.5)' },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Section toggle */}
      <div className="mb-4 flex justify-center gap-2">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.subject}
            onClick={() => setSection(tab.subject)}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              section === tab.subject
                ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                : 'border-navy-700 text-slate-400 hover:border-neon-blue/30 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto block overflow-visible">
        <defs>
          <radialGradient id="domainRadarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(205,127,50,0.10)" />
            <stop offset={`${toFraction(SILVER_FLOOR) * 100}%`} stopColor="rgba(201,209,224,0.06)" />
            <stop offset="100%" stopColor="rgba(255,215,0,0.08)" />
          </radialGradient>
          <linearGradient id="domainRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,216,232,0.30)" />
            <stop offset="100%" stopColor="rgba(0,216,232,0.08)" />
          </linearGradient>
          <filter id="domainGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={center} cy={center} r={radius} fill="url(#domainRadarBg)" />

        {/* Outer boundary + subtle grid */}
        {[0.33, 0.66, 1].map((fraction) => (
          <polygon
            key={fraction}
            points={ringPoints(fraction)}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={fraction === 1 ? 1.5 : 0.8}
          />
        ))}

        {/* Tier boundary rings: Bronze center → Silver → Gold rim */}
        {tierRings.map((ring) => (
          <g key={ring.label}>
            <polygon
              points={ringPoints(ring.fraction)}
              fill="none"
              stroke={ring.color}
              strokeWidth={1.2}
              strokeDasharray="5 4"
            />
            <text
              x={center + 6}
              y={center - radius * ring.fraction - 4}
              fontSize={9}
              fontWeight={700}
              fill={ring.color}
              letterSpacing="0.08em"
            >
              {ring.label.toUpperCase()}
            </text>
          </g>
        ))}
        <text
          x={center + 6}
          y={center - 6}
          fontSize={9}
          fontWeight={700}
          fill="rgba(205,127,50,0.7)"
          letterSpacing="0.08em"
        >
          BRONZE
        </text>

        {/* Axis lines */}
        {sectionStates.map((_, i) => {
          const outer = getPoint(i, 1);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.8}
            />
          );
        })}

        {/* Strength polygon */}
        <path
          d={polygonPath}
          fill="url(#domainRadarFill)"
          stroke="rgba(0,216,232,0.9)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          filter="url(#domainGlow)"
          style={{ transition: 'all 0.8s ease-out' }}
        />

        {/* Domain nodes, colored by rank */}
        {sectionStates.map((state, i) => {
          const p = dataPoints[i];
          const color = RANK_POINT_COLORS[state.rank.rank];
          return (
            <g key={state.chapterId}>
              <circle cx={p.x} cy={p.y} r={7} fill={`${color}26`} />
              <circle
                cx={p.x}
                cy={p.y}
                r={4.5}
                fill={color}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.5}
                style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'all 0.8s ease-out' }}
              />
            </g>
          );
        })}

        {/* Domain labels: name, rank tier, ELO */}
        {sectionStates.map((state, i) => {
          const angle = startAngle + i * angleStep;
          const lx = center + (radius + 42) * Math.cos(angle);
          const ly = center + (radius + 42) * Math.sin(angle);
          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (Math.cos(angle) > 0.3) textAnchor = 'start';
          else if (Math.cos(angle) < -0.3) textAnchor = 'end';
          const color = RANK_POINT_COLORS[state.rank.rank];

          return (
            <g key={state.chapterId}>
              <text
                x={lx}
                y={ly - 10}
                textAnchor={textAnchor}
                fontSize={10}
                fontWeight={700}
                fill="rgba(226,232,240,0.95)"
                letterSpacing="0.04em"
              >
                {state.domain}
              </text>
              <text x={lx} y={ly + 4} textAnchor={textAnchor} fontSize={10} fontWeight={800} fill={color}>
                {state.rank.displayName}
              </text>
              <text x={lx} y={ly + 18} textAnchor={textAnchor} fontSize={10} fontWeight={700} fill="#00D8E8">
                {state.elo} ELO
              </text>
            </g>
          );
        })}

        <circle cx={center} cy={center} r={2} fill="rgba(255,255,255,0.15)" />
      </svg>

      {/* Legend */}
      <div className="mt-3 flex justify-center gap-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {(Object.entries(RANK_POINT_COLORS) as Array<[RankName, string]>).map(([rank, color]) => (
          <span key={rank} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {rank} = {rank === 'Bronze' ? 'Easy' : rank === 'Silver' ? 'Medium' : 'Hard'}
          </span>
        ))}
      </div>
    </div>
  );
};
