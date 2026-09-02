import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';

describe('useTimerEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider isAdmin={true}>{children}</AppProvider>
  );

  it('should return initial formatted time for idle countdown', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    expect(result.current.engine.displayTime).toBe('05:00');
    expect(result.current.engine.isIdle).toBe(true);
    expect(result.current.engine.isOvertime).toBe(false);
  });

  it('should count down correctly when running', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setDuration(60);
      result.current.app.startTimer();
    });

    // Advance by 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.engine.isRunning).toBe(true);
    expect(result.current.engine.remainingSeconds).toBeCloseTo(50, 0);
    expect(result.current.engine.displayTime).toBe('00:50');
  });

  it('should transition into overtime with minus sign after time expires', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setDuration(5);
      result.current.app.startTimer();
    });

    // Advance past total duration (8 seconds elapsed)
    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(result.current.engine.isOvertime).toBe(true);
    expect(result.current.engine.remainingSeconds).toBeLessThan(0);
    expect(result.current.engine.displayTime).toBe('-00:03');
  });

  it('should detect warning thresholds accurately', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setDuration(120);
      result.current.app.startTimer();
    });

    // Advance to 60 seconds remaining (threshold w2: 60s, #eab308)
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current.engine.currentWarning).not.toBeNull();
    expect(result.current.engine.currentWarning?.seconds).toBe(60);
    expect(result.current.engine.currentWarning?.color).toBe('#eab308');

    // Advance to 10 seconds remaining (threshold w4: 10s, #ef4444, flash: true)
    act(() => {
      vi.advanceTimersByTime(50000);
    });

    expect(result.current.engine.currentWarning?.seconds).toBe(10);
    expect(result.current.engine.shouldFlash).toBe(true);
  });

  it('should format stopwatch mode correctly (counting up)', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setMode('stopwatch');
      result.current.app.startTimer();
    });

    act(() => {
      vi.advanceTimersByTime(65000); // 1 min 5 sec
    });

    expect(result.current.engine.displayTime).toBe('01:05');
  });

  it('should format HH:MM:SS format when selected', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setDuration(3665); // 1h 1m 5s
      result.current.app.updateDisplayConfig({ timerFormat: 'HH:MM:SS' });
    });

    expect(result.current.engine.displayTime).toBe('01:01:05');
  });
});
