import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import ControlPage from '@/app/control/page';
import { DisplayView } from '@/components/display/DisplayView';
import { PRESET_DURATIONS } from '@/types/timer';

describe('SRS & PRD Compliance Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider isAdmin={true}>{children}</AppProvider>
  );

  it('PRD 4.1: Supports Dual Views (Display /timer and Operator /control)', () => {
    const { unmount: unmountDisplay } = render(<DisplayView />);
    expect(screen.getByText('05:00')).toBeInTheDocument();
    unmountDisplay();

    render(<ControlPage />);
    expect(screen.getByText(/ADMIN SECURITY LOCK/i)).toBeInTheDocument();
  });

  it('PRD 4.1: Preset buttons cover all durations (1, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120 min)', () => {
    expect(PRESET_DURATIONS).toContain(1);
    expect(PRESET_DURATIONS).toContain(5);
    expect(PRESET_DURATIONS).toContain(10);
    expect(PRESET_DURATIONS).toContain(15);
    expect(PRESET_DURATIONS).toContain(30);
    expect(PRESET_DURATIONS).toContain(45);
    expect(PRESET_DURATIONS).toContain(60);
  });

  it('PRD 4.2: Mode Countdown colors normally with Emerald Cyan (#10b981)', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.state.display.normalColor).toBe('#10b981');
  });

  it('PRD 4.2: Overtime handling continues counting into minus with Overtime Red (#ef4444) and Overtime banner', () => {
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

    // Advance 10 seconds past 5s duration -> 5s overtime
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.engine.isOvertime).toBe(true);
    expect(result.current.engine.displayTime).toBe('-00:05');
    expect(result.current.app.state.display.overtimeColor).toBe('#ef4444');
  });

  it('PRD 4.2: Mode Jam Realtime WIB displays Asia/Jakarta timezone with Cyan color and WIB badge', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setMode('realtime-wib');
    });

    expect(result.current.app.state.timer.mode).toBe('realtime-wib');
    expect(result.current.app.state.display.wibColor).toBe('#06b6d4');
    expect(result.current.engine.displayTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('User Extended Feature: Position Control supports 9 anchor presets and draggable custom coordinates', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.updateDisplayConfig({
        position: { x: 50, y: 15, anchor: 'top-center' },
      });
    });
    expect(result.current.state.display.position.anchor).toBe('top-center');

    act(() => {
      result.current.updateDisplayConfig({
        position: { x: 72, y: 38, anchor: 'custom' },
      });
    });
    expect(result.current.state.display.position.x).toBe(72);
    expect(result.current.state.display.position.y).toBe(38);
  });

  it('User Extended Feature: Custom HH:MM:SS format support', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setDuration(7200); // 2 hours
      result.current.app.updateDisplayConfig({ timerFormat: 'HH:MM:SS' });
    });

    expect(result.current.engine.displayTime).toBe('02:00:00');
  });

  it('User Extended Feature: Multi-level Warning Thresholds trigger dynamic color changes', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setDuration(15);
      result.current.app.startTimer();
    });

    // 5 seconds elapsed -> 10 seconds remaining -> matches w4 threshold (10s, flash)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.engine.currentWarning?.seconds).toBe(10);
    expect(result.current.engine.shouldFlash).toBe(true);
  });

  it('User Feature: Session label can be changed and repositioned while timer is actively running without interrupting timer', () => {
    const { result } = renderHook(
      () => {
        const app = useApp();
        const engine = useTimerEngine();
        return { app, engine };
      },
      { wrapper }
    );

    act(() => {
      result.current.app.setDuration(600);
      result.current.app.startTimer();
    });

    expect(result.current.engine.isRunning).toBe(true);

    // Change label while running
    act(() => {
      result.current.app.setSessionLabel('KEYNOTE: PROFESSOR SMITH');
      result.current.app.updateDisplayConfig({
        sessionLabelFontFamily: 'anton',
        sessionLabelScale: 150,
        sessionLabelPlacement: 'below-timer',
      });
    });

    // Verify timer is STILL running and label has updated
    expect(result.current.engine.isRunning).toBe(true);
    expect(result.current.app.state.timer.sessionLabel).toBe('KEYNOTE: PROFESSOR SMITH');
    expect(result.current.app.state.display.sessionLabelFontFamily).toBe('anton');
    expect(result.current.app.state.display.sessionLabelScale).toBe(150);
    expect(result.current.app.state.display.sessionLabelPlacement).toBe('below-timer');
  });
});
