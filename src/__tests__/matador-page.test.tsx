import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Store = typeof import('@/lib/timer-store');
type MatadorPageType = typeof import('@/app/matador/page').default;

describe('MatadorPage', () => {
  let MatadorPage: MatadorPageType;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    MatadorPage = (await import('@/app/matador/page')).default;
    store = await import('@/lib/timer-store');
    // normalisasi state: titik awal deterministik antar test
    store.timerStore.setDuration(300);
  });

  it('render label COUNTDOWN kiri atas dan timer kanan atas', () => {
    render(<MatadorPage />);
    expect(screen.getByTestId('matador-label').textContent).toBe('COUNTDOWN');
    expect(screen.getByTestId('matador-timer').textContent).toBe('05:00');
  });

  it('ada area kosong untuk PPT (space besar di bawah bar)', () => {
    render(<MatadorPage />);
    expect(screen.getByTestId('ppt-space')).toBeTruthy();
  });

  it("saat overtime: TIME'S UP + counter minus", async () => {
    render(<MatadorPage />);
    const timerStore = store.timerStore;
    act(() => {
      timerStore.setDuration(5);
      timerStore.start();
      // mundurkan startedAt seolah 8 detik berlalu → remaining -3
      timerStore.getState().startedAt = Date.now() - 8_000;
    });
    // tunggu tick rAF
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(screen.getByTestId('matador-timesup').textContent).toBe("TIME'S UP");
    expect(screen.getByTestId('matador-overtime').textContent).toBe('-00:03');
  });
});
