import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Store = typeof import('@/lib/timer-store');
type LayarPageType = typeof import('@/app/layar/page').default;

describe('LayarPage', () => {
  let LayarPage: LayarPageType;
  let store: Store;
  const texts = (p: 'timer' | 'matador' = 'timer') =>
    (p === 'timer' ? store.timerStore.getState().layoutTimer : store.timerStore.getState().layoutMatador).texts;

  const setup = async (url: string) => {
    vi.resetModules();
    window.history.pushState({}, '', url);
    LayarPage = (await import('@/app/layar/page')).default;
    store = await import('@/lib/timer-store');
  };

  beforeEach(async () => {
    await setup('/layar?room=TEST');
    store.timerStore.setRoom('TEST');
    store.timerStore.setDuration(300);
    store.timerStore.resetLayout('timer');
    store.timerStore.resetLayout('matador');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tanpa ?room= tampil room gate', async () => {
    await setup('/layar');
    render(<LayarPage />);
    expect(screen.getByRole('button', { name: 'BUAT ROOM BARU' })).toBeTruthy();
    expect(screen.getByLabelText('Kode room')).toBeTruthy();
  });

  it('klik + Tambah teks menambah blok dan memilihnya', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
    expect(texts()).toHaveLength(1);
    expect(screen.getByText('1 / 5 teks')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Teks 1/ }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByLabelText('Isi teks') as HTMLInputElement).value).toBe('Teks baru');
  });

  it('mengetik di Isi teks mengubah store langsung', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
    fireEvent.change(screen.getByLabelText('Isi teks'), { target: { value: 'Halo dunia' } });
    expect(texts()[0].text).toBe('Halo dunia');
  });

  it('Segmented Layar Matador mengganti halaman yang diedit', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Layar Matador' }));
    expect(screen.getByRole('button', { name: /^Ticker/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
    expect(texts('matador')).toHaveLength(1);
    expect(texts('timer')).toHaveLength(0);
  });

  it('edit inline dikosongkan: blok bertahan saat mengetik, dihapus saat blur', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
    const id = texts()[0].id;
    fireEvent.doubleClick(screen.getByTestId(`hit-text-${id}`));
    const input = screen.getByLabelText('Edit teks') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    expect(texts()).toHaveLength(1); // belum hilang di tengah pengetikan
    expect(texts()[0].text).toBe('Teks baru');
    fireEvent.blur(input);
    expect(texts()).toHaveLength(0);
    expect(screen.queryByLabelText('Edit teks')).toBeNull();
  });

  it('edit inline dengan isi baru tersimpan', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
    const id = texts()[0].id;
    fireEvent.doubleClick(screen.getByTestId(`hit-text-${id}`));
    fireEvent.change(screen.getByLabelText('Edit teks'), { target: { value: 'Baru' } });
    fireEvent.blur(screen.getByLabelText('Edit teks'));
    expect(texts()[0].text).toBe('Baru');
  });

  it('edit inline blok yang sudah ada: dikosongkan lalu blur mengembalikan teks asli', () => {
    const id = store.timerStore.addCustomText('timer', 'Halo')!;
    render(<LayarPage />);
    fireEvent.doubleClick(screen.getByTestId(`hit-text-${id}`));
    const input = screen.getByLabelText('Edit teks') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ha' } });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(texts()).toHaveLength(1);
    expect(texts()[0].text).toBe('Halo');
  });

  it('Escape saat edit inline membatalkan dan mengembalikan teks asli', () => {
    const id = store.timerStore.addCustomText('timer', 'Halo')!;
    render(<LayarPage />);
    fireEvent.doubleClick(screen.getByTestId(`hit-text-${id}`));
    const input = screen.getByLabelText('Edit teks') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Berubah' } });
    expect(texts()[0].text).toBe('Berubah');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(texts()[0].text).toBe('Halo');
    expect(screen.queryByLabelText('Edit teks')).toBeNull();
  });

  it('warna dari panel bisa di-undo dengan Ctrl+Z tanpa menimpa perubahan lain', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // x=961
    const colorInput = screen.getAllByLabelText('Warna teks').find((e) => (e as HTMLInputElement).type === 'color' && !e.hasAttribute('aria-hidden'))!;
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(texts()[0].color).toBe('#ff0000');
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(texts()[0].color).toBeUndefined();
    expect(texts()[0].x).toBe(961);
  });

  it('tombol tambah nonaktif pada 5 teks dengan teks bantuan', () => {
    for (let i = 0; i < 5; i++) store.timerStore.addCustomText('timer', `T${i}`);
    render(<LayarPage />);
    expect((screen.getByRole('button', { name: '+ Tambah teks' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Maksimal 5 teks')).toBeTruthy();
    expect(screen.getByText('5 / 5 teks')).toBeTruthy();
  });

  it('ikon mata mengubah hidden', () => {
    const id = store.timerStore.addCustomText('timer', 'Halo')!;
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Sembunyikan' }));
    expect(texts()[0].hidden).toBe(true);
    expect(screen.getByRole('button', { name: 'Tampilkan' })).toBeTruthy();
    expect(id).toBeTruthy();
  });

  it('keyboard: panah menggeser, Delete menghapus, Escape melepas seleksi', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(texts()[0].x).toBe(961);
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
    expect(texts()[0].y).toBe(550);
    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });
    expect(texts()[0].y).toBe(540);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(texts()).toHaveLength(0);
  });

  describe('elemen bawaan (layout terkunci, hanya gaya)', () => {
    it('Digit timer dipilih: Properti menampilkan gaya, tanpa posisi X/Y atau handle resize', () => {
      render(<LayarPage />);
      fireEvent.click(screen.getByRole('button', { name: /^Digit timer/ }));
      expect(screen.getByLabelText('Warna teks')).toBeTruthy();
      expect(screen.getByLabelText('Font')).toBeTruthy();
      expect(screen.getByLabelText('Bold')).toBeTruthy();
      expect(screen.getByLabelText('Italic')).toBeTruthy();
      expect(screen.getByLabelText('Ukuran')).toBeTruthy();
      expect(screen.getByLabelText('Jarak huruf')).toBeTruthy();
      expect(screen.queryByLabelText('Posisi X')).toBeNull();
      expect(screen.queryByLabelText('Geser X')).toBeNull();
      expect(document.querySelector('[data-handle]')).toBeNull();
    });

    it('mengubah warna, font, tebal, miring, jarak huruf, dan ukuran menyimpan gaya elemen', () => {
      render(<LayarPage />);
      fireEvent.click(screen.getByRole('button', { name: /^Digit timer/ }));
      fireEvent.change(screen.getByLabelText('Warna teks'), { target: { value: '#00ff00' } });
      fireEvent.change(screen.getByLabelText('Font'), { target: { value: 'oswald' } });
      fireEvent.click(screen.getByLabelText('Italic'));
      fireEvent.click(screen.getByLabelText('Bold'));
      fireEvent.change(screen.getByLabelText('Jarak huruf'), { target: { value: '12' } });
      fireEvent.change(screen.getByLabelText('Ukuran'), { target: { value: '120' } });
      expect(store.timerStore.getState().layoutTimer.styles.digit).toEqual({
        color: '#00ff00', font: 'oswald', italic: true, bold: false, spacing: 12, size: 120,
      });
    });

    it('Kembalikan ke bawaan menghapus gaya elemen itu', () => {
      store.timerStore.setElementStyle('timer', 'digit', { color: '#00ff00', size: 120 });
      render(<LayarPage />);
      fireEvent.click(screen.getByRole('button', { name: /^Digit timer/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Kembalikan ke bawaan' }));
      expect(store.timerStore.getState().layoutTimer.styles).toEqual({});
    });

    it('ikon mata menyembunyikan dan menampilkan elemen bawaan', () => {
      render(<LayarPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Sembunyikan Digit timer' }));
      expect(store.timerStore.getState().layoutTimer.styles.digit).toEqual({ hidden: true });
      fireEvent.click(screen.getByRole('button', { name: 'Tampilkan Digit timer' }));
      expect(store.timerStore.getState().layoutTimer.styles.digit).toBeUndefined();
    });

    it('layar Matador: Label, Ticker, Jam punya gaya sendiri-sendiri', () => {
      render(<LayarPage />);
      fireEvent.click(screen.getByRole('radio', { name: 'Layar Matador' }));
      fireEvent.click(screen.getByRole('button', { name: /^Label/ }));
      fireEvent.change(screen.getByLabelText('Warna teks'), { target: { value: '#ff0000' } });
      fireEvent.click(screen.getByRole('button', { name: /^Ticker/ }));
      fireEvent.change(screen.getByLabelText('Ukuran'), { target: { value: '80' } });
      expect(store.timerStore.getState().layoutMatador.styles).toEqual({ label: { color: '#ff0000' }, ticker: { size: 80 } });
    });

    it('editor menampilkan teks contoh di ticker; layar asli tidak', () => {
      render(<LayarPage />);
      fireEvent.click(screen.getByRole('radio', { name: 'Layar Matador' }));
      expect(screen.getByTestId('stage-ticker-text').textContent).toContain('Contoh pesan');
    });

    it('teks tambahan tetap bisa digeser, dan tombol panah memindahkannya', () => {
      render(<LayarPage />);
      fireEvent.click(screen.getByRole('button', { name: '+ Tambah teks' }));
      const before = texts()[0];
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(texts()[0].x).toBe(before.x + 1);
    });
  });

  it('tab Latar menampilkan panel background', () => {
    render(<LayarPage />);
    fireEvent.click(screen.getByRole('radio', { name: 'Latar' }));
    expect(screen.getByRole('button', { name: 'GAMBAR' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'RESET LATAR' })).toBeTruthy();
  });
});
