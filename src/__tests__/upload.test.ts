import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_UPLOAD_BYTES, uploadImage } from '@/lib/upload';

const file = (type: string, size: number) => ({ type, size } as unknown as File);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('uploadImage', () => {
  it('menolak tipe yang tidak diizinkan tanpa memanggil fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadImage(file('image/gif', 10))).rejects.toThrow(/JPEG, PNG, atau WebP/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menolak file lebih dari 8 MB tanpa memanggil fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadImage(file('image/png', MAX_UPLOAD_BYTES + 1))).rejects.toThrow(/maksimal 8 MB/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POST file dan mengembalikan url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: '/uploads/abc.png' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const f = file('image/png', 1024);

    await expect(uploadImage(f, '/upload')).resolves.toBe('/uploads/abc.png');
    expect(fetchMock).toHaveBeenCalledWith('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: f,
    });
  });

  it('413 / 400 / 500 → pesan error yang sesuai', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/terlalu besar/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/bukan gambar/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/Upload gagal/);
  });

  it('respons tanpa url → error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/tidak valid/);
  });
});
