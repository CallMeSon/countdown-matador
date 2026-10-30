'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@/hooks/useStageScale';
import { DEFAULT_APPEARANCE, type TimerState } from '@/types/timer';
import { StageBackground } from '@/components/StageBackground';
import { TimerStage } from '@/components/stage/TimerStage';
import { MatadorStage } from '@/components/stage/MatadorStage';

const FALLBACK_SCALE = 0.3;

/** Pratinjau read-only stage 1920x1080 yang diskalakan mengikuti lebar kontainer. */
export function StagePreview({
  page,
  state,
  label,
  testId,
  children,
}: {
  page: 'timer' | 'matador';
  state: TimerState;
  label: string;
  testId?: string;
  children?: ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(FALLBACK_SCALE);
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / STAGE_WIDTH);
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <figure data-testid={testId} className="space-y-2">
      <div
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-media border border-line bg-black"
        style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 select-none"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <StageBackground appearance={appearance} />
          {page === 'timer' ? <TimerStage state={state} /> : <MatadorStage state={state} />}
        </div>
        {children}
      </div>
      <figcaption className="text-center text-sm font-medium text-sub">{label}</figcaption>
    </figure>
  );
}
