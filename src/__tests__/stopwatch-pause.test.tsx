import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider isAdmin>{children}</AppProvider>
);

function renderStopwatch() {
  const hook = renderHook(() => ({ app: useApp(), engine: useTimerEngine() }), { wrapper });
  act(() => {
    hook.result.current.app.setMode('stopwatch');
  });
  return hook;
}

describe('Stopwatch pause/resume', () => {
  it('holds the elapsed time while paused, not totalDuration minus elapsed', () => {
    const { result } = renderStopwatch();

    act(() => {
      result.current.app.pauseTimer(10);
    });

    expect(result.current.engine.remainingSeconds).toBe(10);
    expect(result.current.engine.displayTime).toBe('00:10');
  });

  it('resumes from the elapsed time instead of jumping', () => {
    const { result } = renderStopwatch();

    act(() => {
      result.current.app.pauseTimer(10);
    });
    act(() => {
      result.current.app.startTimer();
    });

    // Resumed: startedAt is back-dated by the elapsed seconds, so it counts on from ~10s.
    expect(result.current.engine.remainingSeconds).toBeGreaterThanOrEqual(10);
    expect(result.current.engine.remainingSeconds).toBeLessThan(11);
    expect(result.current.engine.isOvertime).toBe(false);
  });

  it('starts a fresh stopwatch at zero', () => {
    const { result } = renderStopwatch();

    act(() => {
      result.current.app.startTimer();
    });

    expect(result.current.engine.remainingSeconds).toBeLessThan(1);
  });
});
