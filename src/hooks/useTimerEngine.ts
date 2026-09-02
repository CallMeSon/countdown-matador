'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/TimerContext';
import { TimerMode, WarningThreshold } from '@/types/timer';

export interface TimerEngineResult {
  displayTime: string;       // formatted time string e.g. "05:30" or "-00:15.24"
  remainingSeconds: number;  // raw remaining seconds (negative = overtime)
  isOvertime: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isIdle: boolean;
  progress: number;          // 0-1 progress through timer
  currentWarning: WarningThreshold | null;  // active warning threshold
  shouldFlash: boolean;
}

export function useTimerEngine(): TimerEngineResult {
  const { state, dispatch, broadcastState } = useApp();
  const { timer, display } = state;
  const [now, setNow] = useState(Date.now());
  const rafRef = useRef<number>(0);
  const prevOvertimeRef = useRef(false);

  const isTimerActive = timer.status === 'running' || timer.status === 'overtime';

  // requestAnimationFrame loop for smooth updates (running & overtime & countdown-to-time)
  useEffect(() => {
    if (timer.mode === 'realtime-wib' || timer.mode === 'countdown-to-time') {
      const interval = setInterval(() => setNow(Date.now()), 50);
      return () => clearInterval(interval);
    }

    if (isTimerActive) {
      const tick = () => {
        setNow(Date.now());
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [isTimerActive, timer.mode]);

  // Calculate remaining time
  const calculateRemaining = useCallback((): number => {
    if (timer.mode === 'stopwatch') {
      if (isTimerActive && timer.startedAt) {
        return (Date.now() - timer.startedAt) / 1000;
      }
      if (timer.status === 'paused' && timer.pausedRemaining !== null) {
        return timer.pausedRemaining;
      }
      return 0;
    }

    if (timer.mode === 'countdown-to-time' && timer.countdownTarget) {
      const [h, m] = timer.countdownTarget.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(h, m, 0, 0);
      const diffSec = (targetDate.getTime() - Date.now()) / 1000;
      if (diffSec < -43200) {
        targetDate.setDate(targetDate.getDate() + 1);
        return (targetDate.getTime() - Date.now()) / 1000;
      }
      return diffSec;
    }

    if (isTimerActive && timer.startedAt) {
      const elapsed = (now - timer.startedAt) / 1000;
      return timer.totalDuration - elapsed;
    }
    if (timer.status === 'paused' && timer.pausedRemaining !== null) {
      return timer.pausedRemaining;
    }
    return timer.totalDuration;
  }, [timer, now, isTimerActive]);

  const remainingSeconds = calculateRemaining();
  const isOvertime = (timer.mode === 'countdown' || timer.mode === 'countdown-to-time') && remainingSeconds < 0;

  // Detect overtime transition and update state
  useEffect(() => {
    if (isOvertime && !prevOvertimeRef.current && timer.status === 'running') {
      dispatch({ type: 'TIMER_SET_OVERTIME', payload: true });
      if (state.isAdmin) {
        setTimeout(() => broadcastState(), 0);
      }
    }
    prevOvertimeRef.current = isOvertime;
  }, [isOvertime, timer.status, dispatch, broadcastState, state.isAdmin]);

  // Format time for display
  const formatTime = useCallback((seconds: number, mode: TimerMode, format: string, showMs: boolean): string => {
    if (mode === 'realtime-wib') {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      return formatter.format(new Date());
    }

    if (mode === 'stopwatch') {
      return formatSeconds(Math.max(0, seconds), format, showMs);
    }

    return formatSeconds(seconds, format, showMs);
  }, []);

  // Find active warning threshold (using rounded seconds)
  const currentWarning = (() => {
    if ((timer.mode !== 'countdown' && timer.mode !== 'countdown-to-time') || isOvertime || timer.status === 'idle') return null;
    const remaining = Math.round(Math.max(0, remainingSeconds));
    const sorted = [...display.warningThresholds].sort((a, b) => a.seconds - b.seconds);
    let active: WarningThreshold | null = null;
    for (const threshold of sorted) {
      if (remaining <= threshold.seconds) {
        active = threshold;
        break;
      }
    }
    return active;
  })();

  const shouldFlash = currentWarning?.flash ?? false;

  const progress = timer.mode === 'stopwatch' || timer.mode === 'realtime-wib'
    ? 0
    : timer.totalDuration > 0
      ? Math.max(0, Math.min(1, 1 - remainingSeconds / timer.totalDuration))
      : 0;

  return {
    displayTime: formatTime(remainingSeconds, timer.mode, display.timerFormat, display.showMilliseconds),
    remainingSeconds,
    isOvertime,
    isRunning: isTimerActive || timer.mode === 'realtime-wib' || timer.mode === 'countdown-to-time',
    isPaused: timer.status === 'paused',
    isIdle: timer.status === 'idle' && timer.mode === 'countdown',
    progress,
    currentWarning,
    shouldFlash,
  };
}

function formatSeconds(totalRawSeconds: number, format: string, showMilliseconds: boolean): string {
  const isNeg = totalRawSeconds < 0;
  const absSeconds = Math.abs(totalRawSeconds);
  const floorSec = Math.floor(absSeconds);
  const h = Math.floor(floorSec / 3600);
  const m = Math.floor((floorSec % 3600) / 60);
  const s = floorSec % 60;
  const ms = Math.floor((absSeconds - floorSec) * 100);
  const msStr = `.${ms.toString().padStart(2, '0')}`;
  const prefix = isNeg ? '-' : '';

  const includeMs = showMilliseconds || format.includes('.ms');

  if (format === 'HH:MM:SS' || format === 'HH:MM:SS.ms') {
    return `${prefix}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}${includeMs ? msStr : ''}`;
  }
  if (format === 'H:MM:SS') {
    return `${prefix}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}${includeMs ? msStr : ''}`;
  }
  if (h > 0) {
    return `${prefix}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}${includeMs ? msStr : ''}`;
  }
  return `${prefix}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}${includeMs ? msStr : ''}`;
}
