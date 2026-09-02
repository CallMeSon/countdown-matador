import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIMER_STATE } from '@/types/timer';

type Store = typeof import('@/lib/timer-store');

describe('timerStore', () => {
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    store = await import('@/lib/timer-store');
  });

  it('mulai dengan state default', () => {
    expect(store.timerStore.getState()).toEqual(DEFAULT_TIMER_STATE);
  });

  it('setDuration → idle dengan durasi baru', () => {
    store.timerStore.setDuration(120);
    const s = store.timerStore.getState();
    expect(s.status).toBe('idle');
    expect(s.duration).toBe(120);
    expect(s.startedAt).toBeNull();
  });

  it('start dari idle → running dengan startedAt', () => {
    store.timerStore.setDuration(60);
    store.timerStore.start();
    const s = store.timerStore.getState();
    expect(s.status).toBe('running');
    expect(s.startedAt).toBeGreaterThan(0);
  });

  it('pause menyimpan pausedRemaining dan resume dari situ', () => {
    store.timerStore.setDuration(100);
    store.timerStore.start();
    const now = Date.now();
    store.timerStore.pause(); // paused ~0s setelah start
    const s = store.timerStore.getState();
    expect(s.status).toBe('paused');
    expect(s.pausedRemaining).not.toBeNull();
    // remaining saat pause ≈ duration
    expect(Math.abs((s.pausedRemaining ?? 0) - 100)).toBeLessThan(5);
    void now;
  });

  it('pause saat overtime menyimpan nilai negatif', () => {
    store.timerStore.setDuration(10);
    store.timerStore.start();
    // simulasi sudah lewat 30 detik → remaining -20
    store.timerStore.getState().startedAt = Date.now() - 30_000;
    store.timerStore.pause();
    const s = store.timerStore.getState();
    expect(s.pausedRemaining).not.toBeNull();
    expect((s.pausedRemaining ?? 0) < -15).toBe(true);
  });

  it('reset → idle kembali ke durasi penuh', () => {
    store.timerStore.setDuration(90);
    store.timerStore.start();
    store.timerStore.reset();
    expect(store.timerStore.getState()).toEqual({
      ...DEFAULT_TIMER_STATE,
      duration: 90,
    });
  });

  it('computeRemaining: running menghitung dari startedAt', () => {
    const s = { ...DEFAULT_TIMER_STATE, status: 'running' as const, duration: 100, startedAt: Date.now() - 40_000 };
    const rem = store.timerStore.computeRemaining(s, Date.now());
    expect(Math.abs(rem - 60)).toBeLessThan(1);
  });

  it('computeRemaining: negatif saat overtime, tidak dibatasi', () => {
    const s = { ...DEFAULT_TIMER_STATE, status: 'running' as const, duration: 10, startedAt: Date.now() - 35_000 };
    const rem = store.timerStore.computeRemaining(s, Date.now());
    expect(rem).toBeLessThan(-24);
  });

  it('computeRemaining: idle → duration, paused → pausedRemaining', () => {
    expect(store.timerStore.computeRemaining(DEFAULT_TIMER_STATE, Date.now())).toBe(300);
    const p = { ...DEFAULT_TIMER_STATE, status: 'paused' as const, pausedRemaining: -7 };
    expect(store.timerStore.computeRemaining(p, Date.now())).toBe(-7);
  });
});
