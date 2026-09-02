import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from '@/context/TimerContext';
import { useAudioTriggers } from '@/hooks/useAudioTriggers';

// useAudioTriggers is the piece DisplayView currently keeps to itself — this
// test proves it works standalone, so it can also be mounted from /control
// and let the operator hear their own cues, not just the stage display.

function fakeAudioEngine() {
  return {
    playCountdownTick: vi.fn(),
    playGoSound: vi.fn(),
    playStartSound: vi.fn(),
    playWarningSound: vi.fn(),
    playBuzzerSound: vi.fn(),
    playOvertimeSound: vi.fn(),
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider isAdmin={true}>{children}</AppProvider>
);

describe('useAudioTriggers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays the start sound when the timer transitions to running', () => {
    const audio = fakeAudioEngine();
    const { result } = renderHook(
      () => {
        const app = useApp();
        useAudioTriggers(audio as any);
        return app;
      },
      { wrapper }
    );

    act(() => result.current.startTimer());
    expect(audio.playStartSound).toHaveBeenCalledTimes(1);
  });

  it('plays the buzzer and overtime sound on the overtime transition', () => {
    const audio = fakeAudioEngine();
    const { result } = renderHook(
      () => {
        const app = useApp();
        useAudioTriggers(audio as any);
        return app;
      },
      { wrapper }
    );

    act(() => {
      result.current.setDuration(1);
      result.current.startTimer();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(audio.playBuzzerSound).toHaveBeenCalledTimes(1);
    expect(audio.playOvertimeSound).toHaveBeenCalledTimes(1);
  });

  it('is reusable from a second, independent mount (e.g. /control alongside /timer)', () => {
    const displayAudio = fakeAudioEngine();
    const consoleAudio = fakeAudioEngine();

    const { result } = renderHook(
      () => {
        const app = useApp();
        useAudioTriggers(displayAudio as any);
        useAudioTriggers(consoleAudio as any);
        return app;
      },
      { wrapper }
    );

    act(() => result.current.startTimer());
    expect(displayAudio.playStartSound).toHaveBeenCalledTimes(1);
    expect(consoleAudio.playStartSound).toHaveBeenCalledTimes(1);
  });
});
