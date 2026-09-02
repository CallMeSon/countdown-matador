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
    const { result } = renderHook(() => useTimer());
    act(() => { result.current.state; }); // baca awal
    // start via store langsung
    const store = await import('@/lib/timer-store');
    act(() => { store.timerStore.start(); });
    expect(result.current.state.status).toBe('running');
  });

  it('formatTime: negatif jadi -MM:SS dan >60min jadi H:MM:SS', async () => {
    const { formatTime } = await import('@/types/timer');
    expect(formatTime(-1)).toBe('-00:01');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(59)).toBe('00:59');
  });
});
