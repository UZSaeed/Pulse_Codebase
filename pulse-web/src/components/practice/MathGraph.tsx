'use client';

import { useEffect, useRef, useState } from 'react';
import type { GraphSpec } from '@/lib/math-templates';

interface MathGraphProps {
  spec: GraphSpec;
  className?: string;
}

/**
 * Renders a question's GraphSpec with the function-plot library — accurate,
 * deterministic figures instead of AI-generated images.
 */
export function MathGraph({ spec, className = '' }: MathGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      try {
        const { default: functionPlot } = await import('function-plot');
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        functionPlot({
          target: containerRef.current,
          width: Math.min(560, containerRef.current.clientWidth || 560),
          height: 340,
          grid: true,
          disableZoom: true,
          xAxis: { domain: spec.xDomain },
          yAxis: { domain: spec.yDomain },
          data: spec.data.map((series) => {
            // function-plot's type detection breaks on explicit undefined keys.
            if (series.points) {
              return {
                points: series.points,
                fnType: 'points' as const,
                graphType: series.graphType ?? ('scatter' as const),
                color: series.color ?? '#0e7490',
              };
            }
            return {
              fn: series.fn ?? 'x',
              graphType: series.graphType ?? ('polyline' as const),
              color: series.color ?? '#0e7490',
            };
          }),
        });
        setRenderError(null);
      } catch (error) {
        console.error('Failed to render graph', error);
        if (!cancelled) setRenderError('Graph could not be rendered.');
      }
    })();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = '';
    };
  }, [spec]);

  return (
    <div className={`overflow-hidden rounded-xl border border-navy-700 bg-white p-3 ${className}`}>
      <div ref={containerRef} className="flex justify-center" />
      {renderError && <div className="py-6 text-center text-sm text-slate-500">{renderError}</div>}
      {spec.caption && !renderError && (
        <div className="mt-1 text-center text-xs font-medium text-slate-500">{spec.caption}</div>
      )}
    </div>
  );
}
