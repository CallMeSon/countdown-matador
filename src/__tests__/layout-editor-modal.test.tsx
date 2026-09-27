import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('LayoutEditorModal', () => {
  let Modal: typeof import('@/components/LayoutEditorModal').LayoutEditorModal;
  let store: typeof import('@/lib/timer-store');

  beforeEach(async () => {
    vi.resetModules();
    store = await import('@/lib/timer-store');
    store.timerStore.setRoom('TEST');
    ({ LayoutEditorModal: Modal } = await import('@/components/LayoutEditorModal'));
  });

  it('render kotak skematik + tambah/hapus/reset', () => {
    render(<Modal page="matador" onClose={() => {}} />);
    expect(screen.getByTestId('layout-box-label')).toBeTruthy();
    expect(screen.getByTestId('layout-box-ticker')).toBeTruthy();
    expect(screen.getByTestId('layout-box-clock')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'TAMBAH TEKS' }));
    expect(store.timerStore.getState().layoutMatador.texts).toHaveLength(1);
    const id = store.timerStore.getState().layoutMatador.texts[0].id;
    fireEvent.click(screen.getByTestId(`layout-box-${id}`));
    fireEvent.click(screen.getByRole('button', { name: 'HAPUS' }));
    expect(store.timerStore.getState().layoutMatador.texts).toHaveLength(0);
  });

  it('slider X menggeser elemen terpilih dan RESET mengembalikan default', () => {
    render(<Modal page="timer" onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('layout-box-digit'));
    fireEvent.change(screen.getByLabelText('POSISI X'), { target: { value: '200' } });
    expect(store.timerStore.getState().layoutTimer.offsets.digit).toEqual({ dx: 200, dy: 0 });
    fireEvent.click(screen.getByRole('button', { name: /RESET LAYOUT/ }));
    expect(store.timerStore.getState().layoutTimer).toEqual({ offsets: {}, texts: [] });
  });

  it('drag box memanggil setLayoutOffset dengan koordinat stage', () => {
    render(<Modal page="timer" onClose={() => {}} />);
    const box = screen.getByTestId('layout-box-digit');
    fireEvent.pointerDown(box, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(box, { clientX: 150, clientY: 120 });
    fireEvent.pointerUp(box);
    expect(store.timerStore.getState().layoutTimer.offsets.digit.dx).toBeGreaterThan(0);
  });
});
