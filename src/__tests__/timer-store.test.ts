import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APPEARANCE, DEFAULT_TIMER_STATE } from '@/types/timer';

type Store = typeof import('@/lib/timer-store');

describe('timerStore', () => {
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    store = await import('@/lib/timer-store');
    store.timerStore.setRoom('TEST');
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

  it('pause menyimpan pausedRemaining', () => {
    store.timerStore.setDuration(100);
    store.timerStore.start();
    store.timerStore.pause(); // paused ~0s setelah start
    const s = store.timerStore.getState();
    expect(s.status).toBe('paused');
    expect(s.pausedRemaining).not.toBeNull();
    // remaining saat pause ≈ duration
    expect(Math.abs((s.pausedRemaining ?? 0) - 100)).toBeLessThan(5);
  });

  it('resume dari paused: startedAt digeser agar remaining lanjut dari pausedRemaining', () => {
    store.timerStore.setDuration(100);
    store.timerStore.start();
    store.timerStore.getState().startedAt = Date.now() - 40_000; // remaining ≈ 60
    store.timerStore.pause();
    expect(Math.abs((store.timerStore.getState().pausedRemaining ?? 0) - 60)).toBeLessThan(2);
    store.timerStore.start();
    const s = store.timerStore.getState();
    expect(s.status).toBe('running');
    const rem1 = store.timerStore.computeRemaining(s, Date.now());
    expect(Math.abs(rem1 - 60)).toBeLessThan(2);
    // terus turun pada now berikutnya
    const rem2 = store.timerStore.computeRemaining(s, Date.now() + 500);
    expect(rem2).toBeLessThan(rem1);
    expect(rem2).toBeGreaterThan(rem1 - 2);
  });

  it('resume dari paused overtime: tetap negatif dan terus turun', () => {
    store.timerStore.setDuration(10);
    store.timerStore.start();
    store.timerStore.getState().startedAt = Date.now() - 30_000; // remaining ≈ -20
    store.timerStore.pause();
    expect((store.timerStore.getState().pausedRemaining ?? 0)).toBeLessThan(-19);
    store.timerStore.start();
    const s = store.timerStore.getState();
    expect(s.status).toBe('running');
    const rem1 = store.timerStore.computeRemaining(s, Date.now());
    expect(rem1).toBeLessThan(-19);
    const rem2 = store.timerStore.computeRemaining(s, Date.now() + 500);
    expect(rem2).toBeLessThan(rem1);
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

  describe('addSeconds', () => {
    it('idle: menambah duration', () => {
      store.timerStore.setDuration(100);
      store.timerStore.addSeconds(30);
      expect(store.timerStore.getState().duration).toBe(130);
      expect(store.timerStore.getState().status).toBe('idle');
    });

    it('running: menambah duration, remaining ikut bertambah', () => {
      store.timerStore.setDuration(100);
      store.timerStore.start();
      const before = store.timerStore.computeRemaining(store.timerStore.getState(), Date.now());
      store.timerStore.addSeconds(30);
      const after = store.timerStore.computeRemaining(store.timerStore.getState(), Date.now());
      expect(store.timerStore.getState().status).toBe('running');
      expect(Math.abs(after - before - 30)).toBeLessThan(1);
    });

    it('running: mengurangi duration bisa mendorong ke overtime (negatif, tak dibatasi)', () => {
      store.timerStore.setDuration(10);
      store.timerStore.start();
      store.timerStore.addSeconds(-60);
      const rem = store.timerStore.computeRemaining(store.timerStore.getState(), Date.now());
      expect(rem).toBeLessThan(-45);
    });

    it('paused: menambah pausedRemaining, duration tetap', () => {
      store.timerStore.setDuration(100);
      store.timerStore.start();
      store.timerStore.pause();
      const durationBefore = store.timerStore.getState().duration;
      const remBefore = store.timerStore.getState().pausedRemaining ?? 0;
      store.timerStore.addSeconds(15);
      expect(store.timerStore.getState().pausedRemaining).toBeCloseTo(remBefore + 15, 1);
      expect(store.timerStore.getState().duration).toBe(durationBefore);
    });
  });

  describe('setDisplayMode', () => {
    it('default displayMode adalah timer', () => {
      expect(store.timerStore.getState().displayMode).toBe('timer');
    });

    it('mengubah ke clock lalu balik ke timer, field lain tidak terganggu', () => {
      store.timerStore.setDuration(120);
      store.timerStore.start();
      store.timerStore.setDisplayMode('clock');
      const s1 = store.timerStore.getState();
      expect(s1.displayMode).toBe('clock');
      expect(s1.status).toBe('running');
      expect(s1.duration).toBe(120);

      store.timerStore.setDisplayMode('timer');
      expect(store.timerStore.getState().displayMode).toBe('timer');
    });

    it('setDuration/reset tidak menghapus displayMode yang sudah di-set', () => {
      store.timerStore.setDisplayMode('clock');
      store.timerStore.setDuration(60);
      expect(store.timerStore.getState().displayMode).toBe('clock');
      store.timerStore.reset();
      expect(store.timerStore.getState().displayMode).toBe('clock');
    });
  });

  describe('stage message', () => {
    it('default stageMessage null', () => {
      expect(store.timerStore.getState().stageMessage).toBeNull();
    });

    it('sendStageMessage menyimpan teks ter-trim, sentAt, dan showOnTimer', () => {
      store.timerStore.sendStageMessage('  Mohon tenang  ', true);
      const msg = store.timerStore.getState().stageMessage;
      expect(msg).not.toBeNull();
      expect(msg?.text).toBe('Mohon tenang');
      expect(msg?.showOnTimer).toBe(true);
      expect(msg?.sentAt).toBeGreaterThan(0);
    });

    it('teks dipotong maksimal 255 karakter', () => {
      store.timerStore.sendStageMessage('A'.repeat(300), false);
      expect(store.timerStore.getState().stageMessage?.text.length).toBe(255);
    });

    it('teks kosong / spasi doang diabaikan', () => {
      store.timerStore.sendStageMessage('   ', false);
      expect(store.timerStore.getState().stageMessage).toBeNull();
    });

    it('hideStageMessage mengembalikan ke null', () => {
      store.timerStore.sendStageMessage('halo', false);
      store.timerStore.hideStageMessage();
      expect(store.timerStore.getState().stageMessage).toBeNull();
    });

    it('setDuration/reset/start tidak menghapus stageMessage yang aktif', () => {
      store.timerStore.sendStageMessage('halo', false);
      store.timerStore.setDuration(60);
      store.timerStore.start();
      store.timerStore.reset();
      expect(store.timerStore.getState().stageMessage?.text).toBe('halo');
    });
  });

  describe('appearance', () => {
    it('default appearance sama dengan DEFAULT_APPEARANCE', () => {
      expect(store.timerStore.getState().appearance).toEqual(DEFAULT_APPEARANCE);
    });

    it('setAppearance merge sebagian field, field lain tetap', () => {
      store.timerStore.setAppearance({ bgMode: 'image', bgImage: 'https://example.com/a.png' });
      const a = store.timerStore.getState().appearance;
      expect(a.bgMode).toBe('image');
      expect(a.bgImage).toBe('https://example.com/a.png');
      expect(a.fontFamily).toBe('default');
      expect(a.fontColor).toBe('#ffffff');
    });

    it('setAppearance tidak mengganggu status/durasi timer', () => {
      store.timerStore.setDuration(120);
      store.timerStore.start();
      store.timerStore.setAppearance({ bold: true });
      expect(store.timerStore.getState().status).toBe('running');
      expect(store.timerStore.getState().duration).toBe(120);
      expect(store.timerStore.getState().appearance.bold).toBe(true);
    });

    it('setAppearance menyanitasi bgImage tidak aman, valid tetap lolos', () => {
      store.timerStore.setAppearance({ bgImage: 'javascript:alert(1)' });
      expect(store.timerStore.getState().appearance.bgImage).toBe('');
      store.timerStore.setAppearance({ bgImage: 'https://example.com/a.png' });
      expect(store.timerStore.getState().appearance.bgImage).toBe('https://example.com/a.png');
      store.timerStore.setAppearance({ bgImage: '/backgrounds/grid-dark.svg' });
      expect(store.timerStore.getState().appearance.bgImage).toBe('/backgrounds/grid-dark.svg');
    });
  });
});
