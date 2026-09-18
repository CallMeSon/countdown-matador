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

type MatadorPageType = typeof import('@/app/matador/page').default;

describe('MatadorPage', () => {
  let MatadorPage: MatadorPageType;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    window.history.replaceState(null, '', `/matador?room=${ROOM}`);
    MatadorPage = (await import('@/app/matador/page')).default;
    store = await import('@/lib/timer-store');
    // normalisasi state: titik awal deterministik antar test
    store.timerStore.setRoom(ROOM);
    store.timerStore.setDuration(300);
  });

  it('render label COUNTDOWN TIMER kiri atas dan timer kanan atas', () => {
    render(<MatadorPage />);
    expect(screen.getByTestId('matador-label').textContent).toBe('COUNTDOWN TIMER');
    expect(screen.getByTestId('matador-timer').textContent).toBe('05:00');
  });

  it('ada area kosong untuk PPT (space besar di bawah bar)', () => {
    render(<MatadorPage />);
    expect(screen.getByTestId('ppt-space')).toBeTruthy();
  });

  it('saat overtime: badge OVERTIME + counter minus', async () => {
    render(<MatadorPage />);
    const timerStore = store.timerStore;
    act(() => {
      timerStore.setDuration(5);
      timerStore.start();
      // mundurkan startedAt seolah 8 detik berlalu -> remaining -3
      timerStore.getState().startedAt = Date.now() - 8_000;
    });
    // tunggu tick rAF
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    const badge = screen.getByTestId('matador-timesup');
    expect(badge.textContent).toContain('OVERTIME / KELEBIHAN WAKTU');
    expect(badge.className).toContain('anim-badge-in');
    expect(screen.getByTestId('matador-overtime').textContent).toBe('-00:03');
    expect(screen.queryByTestId('matador-timer')).toBeNull();
  });

  it('displayMode=clock: label jadi CURRENT TIME, tampil jam bukan countdown', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 8, 5, 9));
    store.timerStore.setDisplayMode('clock');
    render(<MatadorPage />);
    expect(screen.getByTestId('matador-label').textContent).toBe('CURRENT TIME');
    expect(screen.getByTestId('matador-clock').textContent).toBe('08:05:09');
    expect(screen.getByTestId('matador-clock').className).toContain('text-emerald-400');
    expect(screen.queryByTestId('matador-timer')).toBeNull();
    vi.useRealTimers();
  });

  describe('stage message ticker', () => {
    it('label disembunyikan (bukan diganti teks) saat ticker muncul, ticker dapat lebar penuh, timer tetap ada', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
      store.timerStore.sendStageMessage('Mohon tenang', false);
      render(<MatadorPage />);
      expect(screen.queryByTestId('matador-label')).toBeNull();
      expect(screen.getByTestId('stage-ticker-text').textContent).toBe('Mohon tenang');
      expect(screen.getByTestId('stage-ticker-text').className).toContain('animate-ticker-scroll');
      expect(screen.getByTestId('matador-timer')).toBeTruthy();
      vi.useRealTimers();
    });

    it('stage message menang atas badge OVERTIME di slot tengah', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
      const timerStore = store.timerStore;
      act(() => {
        timerStore.setDuration(5);
        timerStore.start();
        timerStore.getState().startedAt = Date.now() - 8_000;
      });
      timerStore.sendStageMessage('Prioritas pesan', false);
      render(<MatadorPage />);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByTestId('stage-ticker-text').textContent).toBe('Prioritas pesan');
      expect(screen.queryByTestId('matador-timesup')).toBeNull();
      vi.useRealTimers();
    });

    it('blink 15 detik pertama, lalu berhenti tapi ticker tetap ada', () => {
      vi.useFakeTimers();
      const now = new Date(2024, 0, 1, 0, 0, 0);
      vi.setSystemTime(now);
      store.timerStore.sendStageMessage('Halo panggung', false);
      render(<MatadorPage />);

      const ticker = screen.getByTestId('stage-ticker');
      expect(ticker.className).toContain('anim-ticker-blink');
      // Regression guard: `anim-ticker-blink` & `anim-badge-in` sama-sama nyetel
      // properti CSS `animation` — kalau ketempel di elemen yang sama, salah satu
      // bakal ke-cancel total oleh cascade (bukan cuma warning, animasinya diem).
      // Harus di elemen yang beda (badge-in di wrapper luar, blink di dalam).
      expect(ticker.className).not.toContain('anim-badge-in');
      expect(ticker.parentElement?.className).toContain('anim-badge-in');

      act(() => {
        vi.advanceTimersByTime(15000);
      });
      expect(screen.getByTestId('stage-ticker').className).not.toContain('anim-ticker-blink');
      expect(screen.getByTestId('stage-ticker').className).toContain('bg-red-700');
      expect(screen.getByTestId('stage-ticker-text').textContent).toBe('Halo panggung');
      vi.useRealTimers();
    });

    it('tab connect di tengah window blink tetap dapat status yang benar', () => {
      vi.useFakeTimers();
      const now = new Date(2024, 0, 1, 0, 0, 0);
      vi.setSystemTime(now);
      // pesan "dikirim" 10 detik lalu (sebelum tab ini render)
      store.timerStore.sendStageMessage('Pesan lama', false);
      vi.setSystemTime(new Date(now.getTime() + 10_000));

      render(<MatadorPage />);
      expect(screen.getByTestId('stage-ticker').className).toContain('anim-ticker-blink');

      act(() => {
        vi.advanceTimersByTime(5000); // total 15s sejak sentAt
      });
      expect(screen.getByTestId('stage-ticker').className).not.toContain('anim-ticker-blink');
      vi.useRealTimers();
    });

    it('animasi masuk: wrapper ticker dapat anim-badge-in saat pertama muncul', () => {
      store.timerStore.sendStageMessage('Halo panggung', false);
      render(<MatadorPage />);
      const wrapper = screen.getByTestId('stage-ticker').parentElement;
      expect(wrapper?.className).toContain('anim-badge-in');
      expect(wrapper?.className).not.toContain('anim-timesup-out');
    });

    it('animasi keluar: setelah HIDE, ticker tetap ada sebentar dengan anim-timesup-out, lalu bener-bener hilang & label balik', () => {
      vi.useFakeTimers();
      store.timerStore.sendStageMessage('Halo panggung', false);
      render(<MatadorPage />);
      expect(screen.getByTestId('stage-ticker')).toBeTruthy();

      act(() => {
        store.timerStore.hideStageMessage();
      });
      // masih di DOM sesaat, dengan animasi keluar, teks lama tetap kebaca
      const wrapper = screen.getByTestId('stage-ticker').parentElement;
      expect(wrapper?.className).toContain('anim-timesup-out');
      expect(screen.getByTestId('stage-ticker-text').textContent).toBe('Halo panggung');
      expect(screen.queryByTestId('matador-label')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.queryByTestId('stage-ticker')).toBeNull();
      expect(screen.getByTestId('matador-label').textContent).toBe('COUNTDOWN TIMER');
      vi.useRealTimers();
    });
  });
});
