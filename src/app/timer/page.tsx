'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';

export default function TimerPage() {
  const { displayTime, overtimeTime, secondsLeft, isOvertime, state } = useTimer();
  const prevSec = useRef(secondsLeft);
  const [animKey, setAnimKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const beepRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Trigger animasi tiap perubahan detik
  useEffect(() => {
    if (prevSec.current !== secondsLeft) {
      prevSec.current = secondsLeft;
      setAnimKey((k) => k + 1);
    }
  }, [secondsLeft]);

  // Beep 10 detik terakhir — bunyi sekali tiap detik fase kritis
  useEffect(() => {
    const running = state.status === 'running';
    if (!mounted || !running || isOvertime || secondsLeft > 10 || secondsLeft < 1) return;
    const audio = beepRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, [mounted, secondsLeft, isOvertime, state.status]);

  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const mainClass = critical
    ? `anim-pop ${secondsLeft <= 5 ? 'text-red-500' : 'text-amber-400'}`
    : 'anim-tick text-white';

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <audio ref={beepRef} src="/beeps.mp3" data-testid="beep-audio" preload="auto" />
      {mounted && isOvertime ? (
        <div className="flex flex-col items-center gap-6">
          <div
            data-testid="timesup"
            className="anim-glow timer-digits whitespace-nowrap font-anton text-[clamp(3.5rem,16vw,18rem)] text-red-500 md:text-[clamp(3.5rem,22vw,22rem)]"
          >
            TIME&apos;S UP
          </div>
          <div
            data-testid="overtime-counter"
            className="timer-digits font-anton text-[clamp(1.75rem,6vw,8rem)] text-red-500 md:text-[clamp(1.75rem,8vw,10rem)]"
          >
            {overtimeTime}
          </div>
        </div>
      ) : (
        <div
          data-testid="countdown-main"
          key={animKey}
          className={`timer-digits font-anton text-[clamp(5rem,22vw,28rem)] leading-none md:text-[clamp(5rem,28vw,36rem)] ${mainClass}`}
        >
          {displayTime}
        </div>
      )}
    </main>
  );
}
