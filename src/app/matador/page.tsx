'use client';

import { useTimer } from '@/hooks/useTimer';

export default function MatadorPage() {
  const { displayTime, overtimeTime, secondsLeft, isOvertime } = useTimer();
  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const timerColor =
    isOvertime || (critical && secondsLeft <= 5)
      ? 'text-red-500'
      : critical
        ? 'text-amber-400'
        : 'text-white';

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-black">
      {/* Bar atas */}
      <header className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
        <span data-testid="matador-label" className="text-sm font-semibold tracking-[0.3em] text-zinc-300">
          COUNTDOWN
        </span>
        {isOvertime ? (
          <span className="flex items-baseline gap-4">
            <span data-testid="matador-timesup" className="anim-glow font-anton text-2xl text-red-500 md:text-4xl">
              TIME&apos;S UP
            </span>
            <span data-testid="matador-overtime" className={`timer-digits font-anton text-2xl md:text-4xl ${timerColor}`}>
              {overtimeTime}
            </span>
          </span>
        ) : (
          <span data-testid="matador-timer" className={`timer-digits font-anton text-3xl md:text-5xl ${timerColor}`}>
            {displayTime}
          </span>
        )}
      </header>

      {/* Space kosong untuk PPT */}
      <div data-testid="ppt-space" className="flex-1" aria-label="ruang presentasi" />
    </main>
  );
}
