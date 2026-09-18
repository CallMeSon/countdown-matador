import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Store = typeof import('@/lib/timer-store');

const ROOM = 'TESTRM';

// timerStore.setRoom() membuka WebSocket; jsdom tidak punya server → stub no-op
class StubWebSocket {
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send() {}
  close() {}
}
(globalThis as unknown as { WebSocket: unknown }).WebSocket = StubWebSocket;

type TimerPageType = typeof import('@/app/timer/page').default;

describe('TimerPage', () => {
  let TimerPage: TimerPageType;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    window.history.replaceState(null, '', `/timer?room=${ROOM}`);
    TimerPage = (await import('@/app/timer/page')).default;
    store = await import('@/lib/timer-store');
    store.timerStore.setRoom(ROOM);
    store.timerStore.setDuration(300);
  });

  /** Jalankan timer lalu geser startedAt sehingga remaining = -overtimeSeconds. */
  async function runIntoOvertime(overtimeSeconds: number) {
    const timerStore = store.timerStore;
    act(() => {
      timerStore.setDuration(5);
      timerStore.start();
      timerStore.getState().startedAt = Date.now() - (5 + overtimeSeconds) * 1000;
    });
    // tunggu tick rAF
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
  }

  it('render angka default 05:00 di tengah', () => {
    render(<TimerPage />);
    expect(screen.getByTestId('countdown-main').textContent).toBe('05:00');
  });

  it("detik awal overtime hanya render TIME'S UP", async () => {
    render(<TimerPage />);
    await runIntoOvertime(1);
    const timesup = screen.getByTestId('timesup');
    expect(timesup.textContent).toBe("TIME'S UP");
    expect(timesup.className).toContain('anim-timesup-in');
    expect(screen.queryByTestId('overtime-counter')).toBeNull();
  });

  it("mendekati detik ke-5, TIME'S UP dapat animasi keluar", async () => {
    render(<TimerPage />);
    await runIntoOvertime(4.75);
    const timesup = screen.getByTestId('timesup');
    expect(timesup.className).toContain('anim-timesup-out');
    expect(screen.queryByTestId('overtime-counter')).toBeNull();
  });

  it("mulai detik ke-5, TIME'S UP berganti jadi counter minus", async () => {
    render(<TimerPage />);
    await runIntoOvertime(6);
    expect(screen.queryByTestId('timesup')).toBeNull();
    expect(screen.getByTestId('overtime-counter').textContent).toBe('-00:06');
  });

  it('angka countdown tidak dianimasikan per detik', () => {
    render(<TimerPage />);
    const cls = screen.getByTestId('countdown-main').className;
    expect(cls).not.toContain('anim-tick');
    expect(cls).not.toContain('anim-pop');
  });

  it('displayMode=clock: render jam saat ini, bukan countdown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 14, 22, 33));
    store.timerStore.setDisplayMode('clock');
    render(<TimerPage />);
    expect(screen.getByTestId('clock-main').textContent).toBe('14:22:33');
    expect(screen.getByTestId('clock-main').className).toContain('text-emerald-400');
    expect(screen.queryByTestId('countdown-main')).toBeNull();
    vi.useRealTimers();
  });

  describe('stage message card', () => {
    it('showOnTimer true: card muncul, timer mengecil+naik (dapat class shrink)', () => {
      store.timerStore.sendStageMessage('Break 10 menit', true);
      render(<TimerPage />);
      expect(screen.getByTestId('stage-card-text').textContent).toBe('Break 10 menit');
      expect(screen.getByTestId('countdown-main').textContent).toBe('05:00');
      const shrinkWrapper = screen.getByTestId('countdown-main').parentElement;
      expect(shrinkWrapper?.className).toContain('scale-[0.3]');
      expect(shrinkWrapper?.className).toContain('-translate-y-[324px]');
    });

    it('showOnTimer false: card tidak render, timer tetap ukuran normal', () => {
      store.timerStore.sendStageMessage('Cuma matador', false);
      render(<TimerPage />);
      expect(screen.queryByTestId('stage-card')).toBeNull();
      expect(screen.getByTestId('countdown-main').textContent).toBe('05:00');
      const wrapper = screen.getByTestId('countdown-main').parentElement;
      expect(wrapper?.className).not.toContain('scale-[0.3]');
    });

    it('tidak ada stageMessage: card tidak render', () => {
      render(<TimerPage />);
      expect(screen.queryByTestId('stage-card')).toBeNull();
    });

    it('showOnTimer true saat displayMode=clock: card tetap muncul di atas tampilan jam', () => {
      store.timerStore.setDisplayMode('clock');
      store.timerStore.sendStageMessage('Info penting', true);
      render(<TimerPage />);
      expect(screen.getByTestId('clock-main')).toBeTruthy();
      expect(screen.getByTestId('stage-card-text').textContent).toBe('Info penting');
    });

    it('regression-guard: class blink & class entrance tidak nempel di elemen yang sama', () => {
      store.timerStore.sendStageMessage('Halo panggung', true);
      render(<TimerPage />);
      const card = screen.getByTestId('stage-card');
      expect(card.className).toContain('anim-ticker-blink');
      expect(card.className).not.toContain('anim-timesup-in');
      expect(card.parentElement?.className).toContain('anim-timesup-in');
    });

    it('blink 15 detik pertama, lalu berhenti tapi card tetap ada', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
      store.timerStore.sendStageMessage('Halo panggung', true);
      render(<TimerPage />);
      expect(screen.getByTestId('stage-card').className).toContain('anim-ticker-blink');

      act(() => {
        vi.advanceTimersByTime(15000);
      });
      expect(screen.getByTestId('stage-card').className).not.toContain('anim-ticker-blink');
      expect(screen.getByTestId('stage-card').className).toContain('bg-red-700');
      expect(screen.getByTestId('stage-card-text').textContent).toBe('Halo panggung');
      vi.useRealTimers();
    });
  });
});
