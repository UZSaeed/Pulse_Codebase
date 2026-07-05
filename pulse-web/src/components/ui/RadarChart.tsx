'use client';

import React from 'react';
import { getTieredRank } from '@/lib/elo';

interface RadarDataPoint {
  subject: string;
  label: string;
  icon: string;
  value: number;
  max: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  className?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({ data, size = 380, className = '' }) => {
  const center = size / 2;
  const padding = 65;
  const radius = (size - padding * 2) / 2;

  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const gridLevels = [
    { frac: 0.25, label: '' },
    { frac: 0.5, label: '' },
    { frac: 0.75, label: '' },
    { frac: 1.0, label: '' },
  ];

  const rankThresholds = [
    { elo: 1200, label: 'Bronze', color: 'rgba(205,127,50,0.25)' },
    { elo: 1500, label: 'Silver', color: 'rgba(148,163,184,0.25)' },
    { elo: 1700, label: 'Gold', color: 'rgba(234,179,8,0.25)' },
    { elo: 1900, label: 'Diamond', color: 'rgba(0,184,212,0.25)' },
  ];

  const getPoint = (index: number, fraction: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: center + radius * fraction * Math.cos(angle),
      y: center + radius * fraction * Math.sin(angle),
    };
  };

  const maxElo = data[0]?.max ?? 2000;
  const minElo = 1000;

  const dataPoints = data.map((d, i) => {
    const fraction = Math.max(0, Math.min((d.value - minElo) / (maxElo - minElo), 1));
    return getPoint(i, fraction);
  });
  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  const labelOffset = radius + 40;

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,184,212,0.04)" />
            <stop offset="100%" stopColor="rgba(0,184,212,0)" />
          </radialGradient>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,184,212,0.25)" />
            <stop offset="100%" stopColor="rgba(0,184,212,0.06)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={center} cy={center} r={radius} fill="url(#radarBg)" />

        {gridLevels.map((level, i) => (
          <polygon
            key={i}
            points={Array.from({ length: n }, (_, j) => {
              const p = getPoint(j, level.frac);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={level.frac === 1 ? 1.5 : 0.8}
          />
        ))}

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

        {data.map((_, i) => {
          const outer = getPoint(i, 1);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(0,0,0,0.06)"
              strokeWidth={0.8}
            />
          );
        })}

        <path
          d={polygonPath}
          fill="url(#radarFill)"
          stroke="rgba(0,184,212,0.8)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          filter="url(#glow)"
          style={{
            transition: 'all 1s ease-out',
          }}
        />

        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={6}
              fill="rgba(0,184,212,0.12)"
              style={{ transition: 'all 1s ease-out' }}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#00B8D4"
              stroke="white"
              strokeWidth={2}
              style={{
                filter: 'drop-shadow(0 0 4px rgba(0,184,212,0.5))',
                transition: 'all 1s ease-out',
              }}
            />
          </g>
        ))}

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
              <text
                x={lx}
                y={ly - 18}
                textAnchor={textAnchor}
                fontSize={18}
                dominantBaseline="middle"
              >
                {rankInfo.icon}
              </text>
              <text
                x={textAnchor === 'start' ? lx + 22 : textAnchor === 'end' ? lx - 22 : lx}
                y={ly - 18}
                textAnchor={textAnchor}
                fontSize={14}
                dominantBaseline="middle"
              >
                {d.icon}
              </text>
              <text
                x={lx}
                y={ly + 2}
                textAnchor={textAnchor}
                fontSize={10}
                fontWeight={700}
                fill="rgba(30,41,59,0.7)"
                letterSpacing="0.05em"
                dominantBaseline="middle"
              >
                {d.label}
              </text>
              <text
                x={lx}
                y={ly + 16}
                textAnchor={textAnchor}
                fontSize={12}
                fontWeight={800}
                fill="#00B8D4"
                dominantBaseline="middle"
              >
                {d.value}
              </text>
            </g>
          );
        })}

        <circle cx={center} cy={center} r={2} fill="rgba(0,0,0,0.1)" />
      </svg>
    </div>
  );
};
