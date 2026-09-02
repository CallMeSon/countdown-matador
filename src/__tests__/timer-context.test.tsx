import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/TimerContext';

describe('TimerContext & AppProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider isAdmin={true}>{children}</AppProvider>
  );

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.state.timer.mode).toBe('countdown');
    expect(result.current.state.timer.status).toBe('idle');
    expect(result.current.state.timer.totalDuration).toBe(300);
    expect(result.current.state.display.normalColor).toBe('#10b981');
    expect(result.current.state.display.overtimeColor).toBe('#ef4444');
  });

  it('should update timer duration with setDuration', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.setDuration(600);
    });
    expect(result.current.state.timer.totalDuration).toBe(600);
    expect(result.current.state.timer.status).toBe('idle');
  });

  it('should change timer mode with setMode', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.setMode('realtime-wib');
    });
    expect(result.current.state.timer.mode).toBe('realtime-wib');
  });

  it('should start, pause, and reset timer correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    
    // Start
    act(() => {
      result.current.startTimer();
    });
    expect(result.current.state.timer.status).toBe('running');
    expect(result.current.state.timer.startedAt).not.toBeNull();

    // Pause
    act(() => {
      result.current.pauseTimer(240);
    });
    expect(result.current.state.timer.status).toBe('paused');
    expect(result.current.state.timer.pausedRemaining).toBe(240);

    // Reset
    act(() => {
      result.current.resetTimer();
    });
    expect(result.current.state.timer.status).toBe('idle');
    expect(result.current.state.timer.startedAt).toBeNull();
    expect(result.current.state.timer.pausedRemaining).toBeNull();
  });

  it('should update display configuration', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.updateDisplayConfig({
        fontFamily: 'bebas',
        fontSize: 150,
        normalColor: '#00ff00',
      });
    });
    expect(result.current.state.display.fontFamily).toBe('bebas');
    expect(result.current.state.display.fontSize).toBe(150);
    expect(result.current.state.display.normalColor).toBe('#00ff00');
  });

  it('should handle cues correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.sendCue('standby');
    });
    expect(result.current.state.activeCue).toBe('standby');

    act(() => {
      result.current.sendCue('go');
    });
    expect(result.current.state.activeCue).toBe('go');

    act(() => {
      result.current.sendCue(null);
    });
    expect(result.current.state.activeCue).toBeNull();
  });

  it('should record event logs and clear them', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.addLog('Test log entry', 'action');
    });
    expect(result.current.state.eventLog.length).toBeGreaterThan(0);
    const lastEntry = result.current.state.eventLog[result.current.state.eventLog.length - 1];
    expect(lastEntry.message).toBe('Test log entry');
    expect(lastEntry.type).toBe('action');

    act(() => {
      result.current.dispatch({ type: 'CLEAR_LOG' });
    });
    expect(result.current.state.eventLog).toHaveLength(0);
  });
});
