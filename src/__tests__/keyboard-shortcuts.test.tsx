import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AppProvider, useApp } from '@/context/TimerContext';

describe('Broadcast Keyboard Shortcuts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider isAdmin={true}>{children}</AppProvider>
  );

  it('toggles start and pause on Space key press', () => {
    const { result } = renderHook(
      () => {
        useKeyboardShortcuts(false);
        return useApp();
      },
      { wrapper }
    );

    // Initial is idle
    expect(result.current.state.timer.status).toBe('idle');

    // Press SPACE to start
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(result.current.state.timer.status).toBe('running');

    // Press SPACE to pause
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(result.current.state.timer.status).toBe('paused');
  });

  it('Space does nothing in realtime-wib or countdown-to-time mode (no status to toggle)', () => {
    const { result } = renderHook(
      () => {
        useKeyboardShortcuts(false);
        return useApp();
      },
      { wrapper }
    );

    act(() => result.current.setMode('realtime-wib'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(result.current.state.timer.status).toBe('idle');

    act(() => result.current.setMode('countdown-to-time'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(result.current.state.timer.status).toBe('idle');
  });

  it('resets timer on Escape key press', () => {
    const { result } = renderHook(
      () => {
        useKeyboardShortcuts(false);
        return useApp();
      },
      { wrapper }
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    });
    expect(result.current.state.timer.status).toBe('running');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    });
    expect(result.current.state.timer.status).toBe('idle');
  });
});
