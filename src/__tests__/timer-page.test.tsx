import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Store = typeof import('@/lib/timer-store');
type TimerPageType = typeof import('@/app/timer/page').default;

describe('TimerPage', () => {
  let TimerPage: TimerPageType;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    TimerPage = (await import('@/app/timer/page')).default;
    store = await import('@/lib/timer-store');
    // normalisasi state: konstruktor store baru mem-post REQUEST_STATE dan
    // channel lama (test sebelumnya) bisa membalas STATE basi via mock
    // BroadcastChannel; pastikan titik awal deterministik.
    store.timerStore.setDuration(300);
  });

  it('render angka default 05:00 di tengah', () => {
    render(<TimerPage />);
    expect(screen.getByTestId('countdown-main').textContent).toBe('05:00');
  });

  it("saat overtime render TIME'S UP + counter overtime merah", async () => {
    render(<TimerPage />);
    const timerStore = store.timerStore;
    act(() => {
      timerStore.setDuration(5);
      timerStore.start();
      // mundurkan startedAt seolah 10 detik berlalu → remaining -5
      timerStore.getState().startedAt = Date.now() - 10_000;
    });
    // tunggu tick rAF
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(screen.getByTestId('timesup').textContent).toBe("TIME'S UP");
    expect(screen.getByTestId('overtime-counter').textContent).toBe('-00:05');
  });
});
