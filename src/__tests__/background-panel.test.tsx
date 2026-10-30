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

    it('default: mode WARNA aktif, kontrol warna tampil, input URL tidak', () => {
      render(<BackgroundPanel />);
      expect(screen.getByLabelText('Warna background')).toBeTruthy();
      expect(screen.queryByLabelText('URL gambar')).toBeNull();
    });

    it('ganti mode ke GAMBAR → bgMode image, input URL + galeri muncul', () => {
      render(<BackgroundPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      expect(store.timerStore.getState().appearance.bgMode).toBe('image');
      expect(screen.getByLabelText('URL gambar')).toBeTruthy();
    });

    it('ubah warna background', () => {
      render(<BackgroundPanel />);
      fireEvent.change(screen.getByLabelText('Warna background'), { target: { value: '#ff0000' } });
      expect(store.timerStore.getState().appearance.bgColor).toBe('#ff0000');
    });

    it('klik thumbnail galeri menetapkan bgImage (setelah validasi)', () => {
      render(<BackgroundPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      fireEvent.click(
        screen.getByRole('button', { name: `Pilih background ${GALLERY_BACKGROUNDS[0]}` }),
      );
      expect(store.timerStore.getState().appearance.bgImage).toBe(GALLERY_BACKGROUNDS[0]);
    });

    it('input URL valid diterapkan saat blur, yang invalid diabaikan', () => {
      render(<BackgroundPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      const input = screen.getByLabelText('URL gambar');
      fireEvent.change(input, { target: { value: 'https://example.com/a.png' } });
      fireEvent.blur(input);
      expect(store.timerStore.getState().appearance.bgImage).toBe('https://example.com/a.png');

      fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
      fireEvent.blur(input);
      expect(store.timerStore.getState().appearance.bgImage).toBe('');
    });

    it('font dan warna tidak lagi diatur di Latar (pindah ke per elemen)', () => {
      render(<BackgroundPanel />);
      expect(screen.queryByLabelText('Font')).toBeNull();
      expect(screen.queryByLabelText('Warna font')).toBeNull();
      expect(screen.queryByLabelText('BOLD')).toBeNull();
    });

    it('RESET LATAR mengembalikan background ke default tanpa menyentuh font', () => {
      store.timerStore.setAppearance({ fontFamily: 'oswald', fontColor: '#00ff00' });
      render(<BackgroundPanel />);
      fireEvent.change(screen.getByLabelText('Warna background'), { target: { value: '#ff0000' } });
      fireEvent.click(screen.getByRole('button', { name: 'RESET LATAR' }));
      const a = store.timerStore.getState().appearance;
      expect(a.bgColor).toBe(DEFAULT_APPEARANCE.bgColor);
      expect(a.fontFamily).toBe('oswald');
      expect(a.fontColor).toBe('#00ff00');
    });

    it('upload gambar sukses: bgImage jadi URL hasil upload', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ url: '/uploads/from-upload.png' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<BackgroundPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));

      const input = screen.getByLabelText('Upload gambar') as HTMLInputElement;
      const file = new File([new Uint8Array([1, 2, 3])], 'bg.png', { type: 'image/png' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);

      await waitFor(() =>
        expect(store.timerStore.getState().appearance.bgImage).toBe('/uploads/from-upload.png'),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        '/upload',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('upload gagal: pesan error tampil, bgImage tidak berubah', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
      );

      render(<BackgroundPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      const before = store.timerStore.getState().appearance.bgImage;

      const input = screen.getByLabelText('Upload gambar') as HTMLInputElement;
      const file = new File([new Uint8Array([1, 2, 3])], 'bg.png', { type: 'image/png' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);

      expect(await screen.findByText(/Upload gagal/)).toBeTruthy();
      expect(store.timerStore.getState().appearance.bgImage).toBe(before);
    });
  });
