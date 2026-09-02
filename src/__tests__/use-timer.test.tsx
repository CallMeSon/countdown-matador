import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimer } from '@/hooks/useTimer';
import { DEFAULT_TIMER_STATE } from '@/types/timer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('menampilkan state default dengan format MM:SS', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.state).toEqual(DEFAULT_TIMER_STATE);
    expect(result.current.displayTime).toBe('05:00');
    expect(result.current.isOvertime).toBe(false);
  });

  it('remaining turun seiring waktu saat running', async () => {
    const { useTimer: useTimerFresh } = await import('@/hooks/useTimer');
    const { timerStore } = await import('@/lib/timer-store');
    const { result } = renderHook(() => useTimerFresh());
    act(() => { timerStore.start(); });
    expect(result.current.state.status).toBe('running');
    const before = result.current.remaining;
    // geser startedAt mundur 30s → remaining turun ~30s pada tick rAF berikutnya
    act(() => { timerStore.getState().startedAt = Date.now() - 30_000; });
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(result.current.remaining).toBeLessThan(before - 25);
  });

  it('resume dari paused overtime: remaining tetap negatif dan terus turun', async () => {
    const { useTimer: useTimerFresh } = await import('@/hooks/useTimer');
    const { timerStore } = await import('@/lib/timer-store');
    const { result } = renderHook(() => useTimerFresh());
    act(() => { timerStore.setDuration(10); timerStore.start(); });
    act(() => { timerStore.getState().startedAt = Date.now() - 30_000; }); // remaining ≈ -20
    act(() => { timerStore.pause(); });
    act(() => { timerStore.start(); }); // resume: lanjut overtime
    expect(result.current.state.status).toBe('running');
    expect(result.current.remaining).toBeLessThan(-19);
    const before = result.current.remaining;
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(result.current.remaining).toBeLessThan(before);
  });

  it('formatTime: negatif jadi -MM:SS dan >60min jadi H:MM:SS', async () => {
    const { formatTime } = await import('@/types/timer');
    expect(formatTime(-1)).toBe('-00:01');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(59)).toBe('00:59');
  });
});
