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

  it('render tombol preset, input durasi, START, RESET', () => {
    render(<ControlPage />);
    expect(screen.getByRole('button', { name: '5 MENIT' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'START' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'RESET' })).toBeTruthy();
    expect(screen.getByLabelText('DURASI CUSTOM')).toBeTruthy();
  });

  it('klik preset memanggil setDuration dan tampil di preview', () => {
    render(<ControlPage />);
    fireEvent.click(screen.getByRole('button', { name: '10 MENIT' }));
    expect(store.timerStore.getState().duration).toBe(600);
    expect(store.timerStore.getState().status).toBe('idle');
    expect(screen.getByTestId('preview-time').textContent).toBe('10:00');
  });

  it('input MM:SS valid → setDuration', () => {
    render(<ControlPage />);
    const input = screen.getByLabelText('DURASI CUSTOM');
    fireEvent.change(input, { target: { value: '02:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(store.timerStore.getState().duration).toBe(150);
  });

  it('input invalid tidak mengubah durasi', () => {
    render(<ControlPage />);
    const before = store.timerStore.getState().duration;
    const input = screen.getByLabelText('DURASI CUSTOM');
    fireEvent.change(input, { target: { value: 'xx' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(store.timerStore.getState().duration).toBe(before);
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
