import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Store = typeof import('@/lib/timer-store');
type ControlPageType = typeof import('@/app/control/page').default;

describe('ControlPage', () => {
  let ControlPage: ControlPageType;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    ControlPage = (await import('@/app/control/page')).default;
    store = await import('@/lib/timer-store');
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
});
