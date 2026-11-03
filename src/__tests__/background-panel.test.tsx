import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import { GALLERY_BACKGROUNDS } from '@/lib/appearance';

type Store = typeof import('@/lib/timer-store');
type PanelType = typeof import('@/components/editor/BackgroundPanel').BackgroundPanel;

describe('BackgroundPanel', () => {
  let BackgroundPanel: PanelType;
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    window.history.pushState({}, '', '/layar?room=TEST');
    BackgroundPanel = (await import('@/components/editor/BackgroundPanel')).BackgroundPanel;
    store = await import('@/lib/timer-store');
    store.timerStore.setRoom('TEST');
    store.timerStore.setDuration(300);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Latar per halaman tersimpan di layoutTimer / layoutMatador.background.
  const pageBg = (page: 'timer' | 'matador') => {
    const s = store.timerStore.getState();
    return (page === 'timer' ? s.layoutTimer : s.layoutMatador).background;
  };

  it('menampilkan nama halaman yang sedang diedit', () => {
    const { unmount } = render(<BackgroundPanel page="timer" />);
    expect(screen.getByText('Layar Timer')).toBeTruthy();
    unmount();
    render(<BackgroundPanel page="matador" />);
    expect(screen.getByText('Layar Matador')).toBeTruthy();
  });

  it('default: mode WARNA aktif, kontrol warna tampil, input URL tidak', () => {
    render(<BackgroundPanel page="timer" />);
    expect(screen.getByLabelText('Warna background')).toBeTruthy();
    expect(screen.queryByLabelText('URL gambar')).toBeNull();
  });

  it('halaman tanpa latar sendiri menampilkan nilai global', () => {
    store.timerStore.setAppearance({ bgColor: '#00ff00' });
    render(<BackgroundPanel page="timer" />);
    expect((screen.getByLabelText('Warna background') as HTMLInputElement).value).toBe('#00ff00');
  });

  it('ganti mode ke GAMBAR hanya mengubah latar halaman yang dipilih', () => {
    render(<BackgroundPanel page="timer" />);
    fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
    expect(pageBg('timer')).toEqual({ bgMode: 'image' });
    expect(pageBg('matador')).toBeUndefined();
    expect(store.timerStore.getState().appearance.bgMode).toBe(DEFAULT_APPEARANCE.bgMode);
    expect(screen.getByLabelText('URL gambar')).toBeTruthy();
  });

  it('ubah warna background matador tidak menyentuh halaman timer maupun global', () => {
    render(<BackgroundPanel page="matador" />);
    fireEvent.change(screen.getByLabelText('Warna background'), { target: { value: '#ff0000' } });
    expect(pageBg('matador')).toEqual({ bgColor: '#ff0000' });
    expect(pageBg('timer')).toBeUndefined();
    expect(store.timerStore.getState().appearance.bgColor).toBe(DEFAULT_APPEARANCE.bgColor);
  });

  it('klik thumbnail galeri menetapkan bgImage halaman itu (setelah validasi)', () => {
    render(<BackgroundPanel page="matador" />);
    fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
    fireEvent.click(
      screen.getByRole('button', { name: `Pilih background ${GALLERY_BACKGROUNDS[0]}` }),
    );
    expect(pageBg('matador')?.bgImage).toBe(GALLERY_BACKGROUNDS[0]);
    expect(pageBg('timer')).toBeUndefined();
  });

  it('input URL valid diterapkan saat blur, yang invalid diabaikan', () => {
    render(<BackgroundPanel page="timer" />);
    fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
    const input = screen.getByLabelText('URL gambar');
    fireEvent.change(input, { target: { value: 'https://example.com/a.png' } });
    fireEvent.blur(input);
    expect(pageBg('timer')?.bgImage).toBe('https://example.com/a.png');

    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.blur(input);
    expect(pageBg('timer')?.bgImage).toBe('');
  });

  it('KOSONGKAN GAMBAR menyimpan gambar kosong untuk halaman itu (menimpa global)', () => {
    store.timerStore.setAppearance({ bgMode: 'image', bgImage: '/backgrounds/grid-dark.svg' });
    render(<BackgroundPanel page="timer" />);
    fireEvent.click(screen.getByRole('button', { name: 'KOSONGKAN GAMBAR' }));
    expect(pageBg('timer')).toEqual({ bgImage: '' });
    expect(store.timerStore.getState().appearance.bgImage).toBe('/backgrounds/grid-dark.svg');
  });

  it('font dan warna tidak lagi diatur di Latar (pindah ke per elemen)', () => {
    render(<BackgroundPanel page="timer" />);
    expect(screen.queryByLabelText('Font')).toBeNull();
    expect(screen.queryByLabelText('Warna font')).toBeNull();
    expect(screen.queryByLabelText('BOLD')).toBeNull();
  });

  it('RESET LATAR menghapus latar halaman itu saja, halaman lain dan font global tidak tersentuh', () => {
    store.timerStore.setAppearance({ fontFamily: 'oswald', fontColor: '#00ff00' });
    store.timerStore.setPageBackground('timer', { bgColor: '#ff0000' });
    store.timerStore.setPageBackground('matador', { bgColor: '#0000ff' });
    render(<BackgroundPanel page="timer" />);
    fireEvent.click(screen.getByRole('button', { name: 'RESET LATAR' }));
    expect(pageBg('timer')).toBeUndefined();
    expect(pageBg('matador')).toEqual({ bgColor: '#0000ff' });
    const a = store.timerStore.getState().appearance;
    expect(a.bgColor).toBe(DEFAULT_APPEARANCE.bgColor);
    expect(a.fontFamily).toBe('oswald');
    expect(a.fontColor).toBe('#00ff00');
  });

  it('upload gambar sukses: bgImage halaman jadi URL hasil upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: '/uploads/from-upload.png' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<BackgroundPanel page="matador" />);
    fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));

    const input = screen.getByLabelText('Upload gambar') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], 'bg.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(pageBg('matador')?.bgImage).toBe('/uploads/from-upload.png'));
    expect(pageBg('matador')?.bgMode).toBe('image');
    expect(pageBg('timer')).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/upload',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('upload gagal: pesan error tampil, bgImage halaman tidak berubah', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    render(<BackgroundPanel page="timer" />);
    fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
    const before = pageBg('timer')?.bgImage;

    const input = screen.getByLabelText('Upload gambar') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], 'bg.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);

    expect(await screen.findByText(/Upload gagal/)).toBeTruthy();
    expect(pageBg('timer')?.bgImage).toBe(before);
  });
});
