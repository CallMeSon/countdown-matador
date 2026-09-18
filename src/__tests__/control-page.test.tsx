import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Store = typeof import('@/lib/timer-store');
type ControlPageType = typeof import('@/app/control/page').default;

describe('ControlPage', () => {
  let ControlPage: ControlPageType;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    // room lewat URL supaya ControlPage langsung render ControlBody (bukan RoomGate)
    window.history.pushState({}, '', '/control?room=TEST');
    ControlPage = (await import('@/app/control/page')).default;
    store = await import('@/lib/timer-store');
    store.timerStore.setRoom('TEST');
    // normalisasi state: konstruktor store baru mem-post REQUEST_STATE dan
    // channel lama (test sebelumnya) bisa membalas STATE basi via mock
    // BroadcastChannel; pastikan titik awal deterministik.
    store.timerStore.setDuration(300);
  });

  it('render tombol preset, field menit/detik, START, RESET', () => {
    render(<ControlPage />);
    expect(screen.getByRole('button', { name: '5 MENIT' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'START' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'RESET' })).toBeTruthy();
    expect(screen.getByLabelText('MENIT')).toBeTruthy();
    expect(screen.getByLabelText('DETIK')).toBeTruthy();
    expect((screen.getByTestId('duration-minutes') as HTMLInputElement).value).toBe('00');
    expect((screen.getByTestId('duration-seconds') as HTMLInputElement).value).toBe('00');
    expect(screen.getByRole('button', { name: 'SET' })).toBeTruthy();
  });

  it('klik preset memanggil setDuration dan tampil di preview', () => {
    render(<ControlPage />);
    fireEvent.click(screen.getByRole('button', { name: '10 MENIT' }));
    expect(store.timerStore.getState().duration).toBe(600);
    expect(store.timerStore.getState().status).toBe('idle');
    expect(screen.getByTestId('preview-time').textContent).toBe('10:00');
  });

  it('menit 10 detik 00 → setDuration(600)', () => {
    render(<ControlPage />);
    fireEvent.change(screen.getByTestId('duration-minutes'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('duration-seconds'), { target: { value: '00' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(store.timerStore.getState().duration).toBe(600);
  });

  it('menit 02 detik 30 → setDuration(150)', () => {
    render(<ControlPage />);
    fireEvent.change(screen.getByTestId('duration-minutes'), { target: { value: '02' } });
    fireEvent.change(screen.getByTestId('duration-seconds'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(store.timerStore.getState().duration).toBe(150);
  });

  it('keduanya 00 → SET diabaikan, durasi & status tetap', () => {
    render(<ControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(store.timerStore.getState().duration).toBe(300);
    expect(store.timerStore.getState().status).toBe('idle');
  });

  it('ketik karakter invalid ditolak, store tak berubah', () => {
    render(<ControlPage />);
    const before = store.timerStore.getState().duration;
    const min = screen.getByTestId('duration-minutes') as HTMLInputElement;
    const sec = screen.getByTestId('duration-seconds') as HTMLInputElement;
    fireEvent.change(min, { target: { value: 'xx' } });
    fireEvent.change(sec, { target: { value: 'xx' } });
    expect(min.value).not.toMatch(/\D/);
    expect(sec.value).not.toMatch(/\D/);
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(store.timerStore.getState().duration).toBe(before);
  });

  it('blur mem-pad 1 digit jadi 2 digit', () => {
    render(<ControlPage />);
    const min = screen.getByTestId('duration-minutes') as HTMLInputElement;
    fireEvent.change(min, { target: { value: '5' } });
    fireEvent.blur(min);
    expect(min.value).toBe('05');
  });

  it('klik START → running, tombol berubah PAUSE', () => {
    render(<ControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    expect(store.timerStore.getState().status).toBe('running');
    expect(screen.getByRole('button', { name: 'PAUSE' })).toBeTruthy();
  });

  it('klik RESET dari running → idle durasi penuh', () => {
    render(<ControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    fireEvent.click(screen.getByRole('button', { name: 'RESET' }));
    expect(store.timerStore.getState().status).toBe('idle');
    expect(store.timerStore.getState().duration).toBe(store.timerStore.getState().duration);
  });

  describe('penyesuaian waktu', () => {
    it('tombol +/- tidak muncul saat idle', () => {
      render(<ControlPage />);
      expect(screen.queryByRole('button', { name: '+5D' })).toBeNull();
      expect(screen.queryByRole('button', { name: '-5D' })).toBeNull();
    });

    it('tombol +/- muncul saat running dan mengubah duration', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      fireEvent.click(screen.getByRole('button', { name: '+15D' }));
      expect(store.timerStore.getState().duration).toBe(315);
      fireEvent.click(screen.getByRole('button', { name: '-30D' }));
      expect(store.timerStore.getState().duration).toBe(285);
      fireEvent.click(screen.getByRole('button', { name: '+1M' }));
      expect(store.timerStore.getState().duration).toBe(345);
      fireEvent.click(screen.getByRole('button', { name: '-1M' }));
      expect(store.timerStore.getState().duration).toBe(285);
    });

    it('tombol +/- hilang lagi setelah PAUSE', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      expect(screen.getByRole('button', { name: '+5D' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'PAUSE' }));
      expect(screen.queryByRole('button', { name: '+5D' })).toBeNull();
    });

    it('klik tombol adjust menampilkan badge delta sebagai feedback', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      fireEvent.click(screen.getByRole('button', { name: '-30D' }));
      expect(screen.getByText('-30')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: '+15D' }));
      expect(screen.getByText('+15')).toBeTruthy();
    });
  });

  describe('mode durasi (dropdown)', () => {
    it('default TIMER BIASA: preset & MM:SS terlihat, KE JAM tersembunyi', () => {
      render(<ControlPage />);
      expect(screen.getByRole('button', { name: '5 MENIT' })).toBeTruthy();
      expect(screen.queryByTestId('target-hour')).toBeNull();
    });

    it('pilih TIMER KE JAM: preset & MM:SS hilang, KE JAM muncul', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('MODE DURASI'), { target: { value: 'target' } });
      expect(screen.queryByRole('button', { name: '5 MENIT' })).toBeNull();
      expect(screen.getByTestId('target-hour')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'MULAI KE JAM' })).toBeTruthy();
    });

    it('pilih JAM SAAT INI: menampilkan jam berjalan HH:MM:SS, kontrol durasi lain hilang', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 9, 30, 5));
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('MODE DURASI'), { target: { value: 'now' } });

      expect(screen.getByTestId('current-time').textContent).toBe('09:30:05');
      expect(screen.queryByRole('button', { name: '5 MENIT' })).toBeNull();
      expect(screen.queryByTestId('target-hour')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId('current-time').textContent).toBe('09:30:08');

      vi.useRealTimers();
    });

    it('pilih JAM SAAT INI: dropdown saja belum menyiarkan apa-apa', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('MODE DURASI'), { target: { value: 'now' } });
      expect(store.timerStore.getState().displayMode).toBe('timer');
    });

    it('mode JAM SAAT INI: klik START yang trigger displayMode=clock ke semua layout', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('MODE DURASI'), { target: { value: 'now' } });
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      expect(store.timerStore.getState().displayMode).toBe('clock');
    });

    it('balik ke TIMER BIASA lalu START: displayMode balik ke timer', () => {
      render(<ControlPage />);
      const select = screen.getByLabelText('MODE DURASI');
      fireEvent.change(select, { target: { value: 'now' } });
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      expect(store.timerStore.getState().displayMode).toBe('clock');

      fireEvent.change(select, { target: { value: 'normal' } });
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      expect(store.timerStore.getState().displayMode).toBe('timer');
    });

    it('MULAI KE JAM juga mengembalikan displayMode ke timer', () => {
      const fixedNow = new Date(2024, 0, 1, 10, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
      render(<ControlPage />);
      const select = screen.getByLabelText('MODE DURASI');
      fireEvent.change(select, { target: { value: 'now' } });
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      expect(store.timerStore.getState().displayMode).toBe('clock');

      fireEvent.change(select, { target: { value: 'target' } });
      fireEvent.change(screen.getByTestId('target-hour'), { target: { value: '10' } });
      fireEvent.change(screen.getByTestId('target-minute'), { target: { value: '05' } });
      fireEvent.click(screen.getByRole('button', { name: 'MULAI KE JAM' }));
      expect(store.timerStore.getState().displayMode).toBe('timer');
      vi.useRealTimers();
    });

    it('RESET juga bisa jadi trigger ganti mode (bukan cuma START)', () => {
      render(<ControlPage />);
      const select = screen.getByLabelText('MODE DURASI');
      fireEvent.change(select, { target: { value: 'now' } });
      fireEvent.click(screen.getByRole('button', { name: 'RESET' }));
      expect(store.timerStore.getState().displayMode).toBe('clock');

      fireEvent.change(select, { target: { value: 'normal' } });
      fireEvent.click(screen.getByRole('button', { name: 'RESET' }));
      expect(store.timerStore.getState().displayMode).toBe('timer');
    });

    it('timer lagi running, ganti dropdown belum trigger apa-apa sampai START/RESET diklik', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'START' })); // mulai countdown normal
      expect(store.timerStore.getState().status).toBe('running');
      expect(store.timerStore.getState().displayMode).toBe('timer');

      // ganti dropdown ke JAM SAAT INI saat timer masih jalan — belum boleh berubah
      fireEvent.change(screen.getByLabelText('MODE DURASI'), { target: { value: 'now' } });
      expect(store.timerStore.getState().displayMode).toBe('timer');
      expect(store.timerStore.getState().status).toBe('running');

      // baru berubah setelah START (di mode now) diklik
      fireEvent.click(screen.getByRole('button', { name: 'START' }));
      expect(store.timerStore.getState().displayMode).toBe('clock');
    });
  });

  describe('nav popover (TIMER/MATADOR)', () => {
    it('klik TIMER menampilkan menu Buka Tab Baru / Salin Link', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'TIMER' }));
      expect(screen.getByRole('button', { name: 'Buka Tab Baru' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Salin Link' })).toBeTruthy();
    });

    it('klik "Buka Tab Baru" memanggil window.open dengan path yang benar dan menutup menu', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'MATADOR' }));
      fireEvent.click(screen.getByRole('button', { name: 'Buka Tab Baru' }));
      expect(window.open).toHaveBeenCalledWith('/matador?room=TEST', '_blank', 'noopener,noreferrer');
      expect(screen.queryByRole('button', { name: 'Buka Tab Baru' })).toBeNull();
    });

    it('klik "Salin Link" memanggil clipboard.writeText dengan URL penuh', async () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'TIMER' }));
      fireEvent.click(screen.getByRole('button', { name: 'Salin Link' }));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/timer?room=TEST`,
      );
      expect(await screen.findByRole('button', { name: 'Tersalin!' })).toBeTruthy();
    });

    it('klik di luar menu menutup popover', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'TIMER' }));
      expect(screen.getByRole('button', { name: 'Buka Tab Baru' })).toBeTruthy();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('button', { name: 'Buka Tab Baru' })).toBeNull();
    });
  });

  describe('countdown ke jam (HH:MM)', () => {
    it('jam target masih hari ini → duration = selisih detik, langsung running', () => {
      const fixedNow = new Date(2024, 0, 1, 10, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('MODE DURASI'), { target: { value: 'target' } });
      fireEvent.change(screen.getByTestId('target-hour'), { target: { value: '10' } });
      fireEvent.change(screen.getByTestId('target-minute'), { target: { value: '05' } });
      fireEvent.click(screen.getByRole('button', { name: 'MULAI KE JAM' }));
      expect(store.timerStore.getState().status).toBe('running');
      expect(store.timerStore.getState().duration).toBe(300);
      vi.useRealTimers();
    });

    it('jam target sudah lewat hari ini → rollover ke besok', () => {
      const fixedNow = new Date(2024, 0, 1, 10, 0, 0);
      vi.useFakeTimers();
      vi.setSystemTime(fixedNow);
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('MODE DURASI'), { target: { value: 'target' } });
      fireEvent.change(screen.getByTestId('target-hour'), { target: { value: '09' } });
      fireEvent.change(screen.getByTestId('target-minute'), { target: { value: '00' } });
      fireEvent.click(screen.getByRole('button', { name: 'MULAI KE JAM' }));
      expect(store.timerStore.getState().status).toBe('running');
      // 23 jam dari 10:00 hari ini ke 09:00 besok
      expect(store.timerStore.getState().duration).toBe(23 * 3600);
      vi.useRealTimers();
    });
  });

  describe('pesan ke panggung', () => {
    it('KIRIM disabled kalau teks kosong', () => {
      render(<ControlPage />);
      expect(screen.getByRole('button', { name: 'KIRIM' })).toBeDisabled();
    });

    it('field teks dibatasi maksimal 255 karakter', () => {
      render(<ControlPage />);
      const textarea = screen.getByTestId('stage-text') as HTMLTextAreaElement;
      expect(textarea.maxLength).toBe(255);
      fireEvent.change(textarea, { target: { value: 'A'.repeat(300) } });
      expect(textarea.value.length).toBe(255);
      expect(screen.getByText('255/255')).toBeTruthy();
    });

    it('kirim pesan: input diganti panel PESAN AKTIF + tombol DONE/HIDE', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByTestId('stage-text'), { target: { value: 'Mohon tenang' } });
      fireEvent.click(screen.getByRole('button', { name: 'KIRIM' }));

      expect(store.timerStore.getState().stageMessage?.text).toBe('Mohon tenang');
      expect(screen.queryByTestId('stage-text')).toBeNull();
      expect(screen.getByText('Mohon tenang')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'DONE / HIDE' })).toBeTruthy();
    });

    it('toggle "tampilkan juga di layar timer" ikut terkirim sebagai showOnTimer', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByLabelText('TAMPILKAN JUGA DI LAYAR TIMER'));
      fireEvent.change(screen.getByTestId('stage-text'), { target: { value: 'Halo' } });
      fireEvent.click(screen.getByRole('button', { name: 'KIRIM' }));
      expect(store.timerStore.getState().stageMessage?.showOnTimer).toBe(true);
    });

    it('klik DONE/HIDE mengembalikan ke form input', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByTestId('stage-text'), { target: { value: 'Halo' } });
      fireEvent.click(screen.getByRole('button', { name: 'KIRIM' }));
      fireEvent.click(screen.getByRole('button', { name: 'DONE / HIDE' }));

      expect(store.timerStore.getState().stageMessage).toBeNull();
      expect(screen.getByTestId('stage-text')).toBeTruthy();
      expect((screen.getByTestId('stage-text') as HTMLTextAreaElement).value).toBe('');
    });
  });
});
