'use client';

import React from 'react';
import { getTieredRank } from '@/lib/elo';

interface RadarDataPoint {
  subject: string;
  label: string;
  icon: string;
  value: number;  // Current ELO
  max: number;    // Max ELO for chart scaling
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  className?: string;
}

/**
 * SVG-based radar/polygon chart for visualizing per-subject ELO strength.
 * 4 axes arranged as quadrants: top, right, bottom, left.
 * Shows current rank icon + how much room for growth remains.
 */
export const RadarChart: React.FC<RadarChartProps> = ({ data, size = 380, className = '' }) => {
  const center = size / 2;
  const padding = 65; // Space for labels
  const radius = (size - padding * 2) / 2;

  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  // Gridline levels — show named thresholds
  const gridLevels = [
    { frac: 0.25, label: '' },
    { frac: 0.5, label: '' },
    { frac: 0.75, label: '' },
    { frac: 1.0, label: '' },
  ];

  // ELO thresholds for rank boundaries (map to fraction of max)
  const rankThresholds = [
    { elo: 1200, label: 'Bronze', color: 'rgba(205,127,50,0.3)' },
    { elo: 1500, label: 'Silver', color: 'rgba(192,192,192,0.3)' },
    { elo: 1700, label: 'Gold', color: 'rgba(255,215,0,0.25)' },
    { elo: 1900, label: 'Diamond', color: 'rgba(0,216,232,0.25)' },
  ];

  const getPoint = (index: number, fraction: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: center + radius * fraction * Math.cos(angle),
      y: center + radius * fraction * Math.sin(angle),
    };
  };

  const maxElo = data[0]?.max ?? 2000;
  const minElo = 1000; // Chart floor — ensures ranks are spread out rather than huddled in the center

  // Data polygon points
  const dataPoints = data.map((d, i) => {
    const fraction = Math.max(0, Math.min((d.value - minElo) / (maxElo - minElo), 1));
    return getPoint(i, fraction);
  });
  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Label positions
  const labelOffset = radius + 40;

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background */}
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,216,232,0.06)" />
            <stop offset="100%" stopColor="rgba(0,216,232,0)" />
          </radialGradient>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,216,232,0.3)" />
            <stop offset="100%" stopColor="rgba(0,216,232,0.08)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={center} cy={center} r={radius} fill="url(#radarBg)" />

        {/* Grid rings */}
        {gridLevels.map((level, i) => (
          <polygon
            key={i}
            points={Array.from({ length: n }, (_, j) => {
              const p = getPoint(j, level.frac);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={level.frac === 1 ? 1.5 : 0.8}
          />
        ))}

        {/* Rank threshold rings */}
        {rankThresholds.map((rt, i) => {
          const frac = (rt.elo - minElo) / (maxElo - minElo);
          if (frac > 1 || frac < 0) return null;
          return (
            <g key={`rank-${i}`}>
              <polygon
                points={Array.from({ length: n }, (_, j) => {
                  const p = getPoint(j, frac);
                  return `${p.x},${p.y}`;
                }).join(' ')}
                fill="none"
                stroke={rt.color}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            </g>
          );
        })}

        {/* Axis lines */}
        {data.map((_, i) => {
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

        {/* Data polygon fill */}
        <path
          d={polygonPath}
          fill="url(#radarFill)"
          stroke="rgba(0,216,232,0.9)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          filter="url(#glow)"
          style={{
            transition: 'all 1s ease-out',
          }}
        />

        {/* Data points with pulsing glow */}
        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={6}
              fill="rgba(0,216,232,0.15)"
              style={{ transition: 'all 1s ease-out' }}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#00D8E8"
              stroke="rgba(0,216,232,0.5)"
              strokeWidth={2}
              style={{
                filter: 'drop-shadow(0 0 6px rgba(0,216,232,0.7))',
                transition: 'all 1s ease-out',
              }}
            />
          </g>
        ))}

        {/* Labels with rank icons */}
        {data.map((d, i) => {
          const angle = startAngle + i * angleStep;
          const lx = center + labelOffset * Math.cos(angle);
          const ly = center + labelOffset * Math.sin(angle);
          const rankInfo = getTieredRank(d.value);

          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (Math.cos(angle) > 0.3) textAnchor = 'start';
          else if (Math.cos(angle) < -0.3) textAnchor = 'end';

          return (
            <g key={i}>
              {/* Rank icon */}
              <text
                x={lx}
                y={ly - 18}
                textAnchor={textAnchor}
                fontSize={18}
                dominantBaseline="middle"
              >
                {rankInfo.icon}
              </text>
              {/* Subject icon */}
              <text
                x={textAnchor === 'start' ? lx + 22 : textAnchor === 'end' ? lx - 22 : lx}
                y={ly - 18}
                textAnchor={textAnchor}
                fontSize={14}
                dominantBaseline="middle"
              >
                {d.icon}
              </text>
              {/* Label */}
              <text
                x={lx}
                y={ly + 2}
                textAnchor={textAnchor}
                fontSize={10}
                fontWeight={700}
                fill="rgba(148,163,184,0.9)"
                letterSpacing="0.05em"
                dominantBaseline="middle"
              >
                {d.label}
              </text>
              {/* ELO value */}
              <text
                x={lx}
                y={ly + 16}
                textAnchor={textAnchor}
                fontSize={12}
                fontWeight={800}
                fill="#00D8E8"
                dominantBaseline="middle"
              >
                {d.value}
              </text>
            </g>
          );
        })}

        {/* Center dot */}
        <circle cx={center} cy={center} r={2} fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
};
