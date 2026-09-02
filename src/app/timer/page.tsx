'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';

export default function TimerPage() {
  const { displayTime, overtimeTime, secondsLeft, isOvertime } = useTimer();
  const prevSec = useRef(secondsLeft);
  const [animKey, setAnimKey] = useState(0);

  // Trigger animasi tiap perubahan detik
  useEffect(() => {
    if (prevSec.current !== secondsLeft) {
      prevSec.current = secondsLeft;
      setAnimKey((k) => k + 1);
    }
  }, [secondsLeft]);

  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const mainClass = critical
    ? `anim-pop ${secondsLeft <= 5 ? 'text-red-500' : 'text-amber-400'}`
    : 'anim-tick text-white';

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      {isOvertime ? (
        <div className="flex flex-col items-center gap-6">
          <div
            data-testid="timesup"
            className="anim-glow timer-digits font-anton text-[16vw] text-red-500 md:text-[22vw]"
          >
            TIME&apos;S UP
          </div>
          <div
            data-testid="overtime-counter"
            className="timer-digits font-anton text-[6vw] text-red-500 md:text-[8vw]"
          >
            {overtimeTime}
          </div>
        </div>
      ) : (
        <div
          data-testid="countdown-main"
          key={animKey}
          className={`timer-digits font-anton text-[22vw] leading-none md:text-[28vw] ${mainClass}`}
        >
          {displayTime}
        </div>
      )}
    </main>
  );
}
