'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { timerStore } from '@/lib/timer-store';
import { formatTime, TimerState } from '@/types/timer';

export interface TimerView {
  state: TimerState;
  remaining: number;      // detik, negatif saat overtime
  isOvertime: boolean;
  displayTime: string;    // "05:00" / "-00:01"
  overtimeTime: string;   // counter overtime, "-00:01" dst
  secondsLeft: number;    // ceil(remaining) untuk fase animasi
}

// identitas stabil agar useSyncExternalStore tidak resubscribe tiap render
const subscribe = (fn: (s: TimerState) => void) => timerStore.subscribe(fn);
const getSnapshot = () => timerStore.getState();

export function useTimer(): TimerView {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const [now, setNow] = useState(() => Date.now());

  const isRunning = state.status === 'running' || state.status === 'overtime';
  useEffect(() => {
    if (!isRunning) return;
    let raf = 0;
    const tick = () => { setNow(Date.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning]);

  const remaining = timerStore.computeRemaining(state, now);
  const isOvertime = remaining < 0;
  const overtimeTime = formatTime(remaining); // negatif sudah berformat "-00:01"

  return {
    state,
    remaining,
    isOvertime,
    displayTime: formatTime(remaining),
    overtimeTime,
    secondsLeft: Math.ceil(remaining),
  };
}
