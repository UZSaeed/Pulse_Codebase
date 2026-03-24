'use client';

import React from 'react';

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
 */
export const RadarChart: React.FC<RadarChartProps> = ({ data, size = 300, className = '' }) => {
  const center = size / 2;
  const padding = 50; // Space for labels
  const radius = (size - padding * 2) / 2;

  // Number of data points (should be 4 for MCAT)
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  // Start from top (-90 degrees)
  const startAngle = -Math.PI / 2;

  // Gridline levels (at 25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Calculate point position on the chart
  const getPoint = (index: number, fraction: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: center + radius * fraction * Math.cos(angle),
      y: center + radius * fraction * Math.sin(angle),
    };
  };

  // Data polygon points
  const dataPoints = data.map((d, i) => {
    const fraction = Math.min(d.value / d.max, 1);
    return getPoint(i, fraction);
  });
  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Label positions (pushed slightly further out)
  const labelOffset = radius + 28;

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background circle glow */}
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,216,232,0.05)" />
            <stop offset="100%" stopColor="rgba(0,216,232,0)" />
          </radialGradient>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,216,232,0.25)" />
            <stop offset="100%" stopColor="rgba(0,216,232,0.08)" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={radius} fill="url(#radarBg)" />

        {/* Grid rings */}
        {gridLevels.map((level, i) => (
          <polygon
            key={i}
            points={Array.from({ length: n }, (_, j) => {
              const p = getPoint(j, level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={level === 1 ? 1.5 : 0.8}
          />
        ))}

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
          stroke="rgba(0,216,232,0.8)"
          strokeWidth={2}
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(0,216,232,0.4))',
            transition: 'all 0.8s ease-out',
          }}
        />

        {/* Data points (dots at vertices) */}
        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#00D8E8"
              stroke="rgba(0,216,232,0.5)"
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,216,232,0.6))' }}
            />
          </g>
        ))}

        {/* Labels with icons */}
        {data.map((d, i) => {
          const angle = startAngle + i * angleStep;
          const lx = center + labelOffset * Math.cos(angle);
          const ly = center + labelOffset * Math.sin(angle);

          // Determine text anchor based on position
          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (Math.cos(angle) > 0.3) textAnchor = 'start';
          else if (Math.cos(angle) < -0.3) textAnchor = 'end';

          return (
            <g key={i}>
              <text
                x={lx}
                y={ly - 8}
                textAnchor={textAnchor}
                fontSize={16}
                dominantBaseline="middle"
              >
                {d.icon}
              </text>
              <text
                x={lx}
                y={ly + 10}
                textAnchor={textAnchor}
                fontSize={10}
                fontWeight={700}
                fill="rgba(148,163,184,0.8)"
                letterSpacing="0.05em"
                dominantBaseline="middle"
              >
                {d.label}
              </text>
              <text
                x={lx}
                y={ly + 24}
                textAnchor={textAnchor}
                fontSize={11}
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
