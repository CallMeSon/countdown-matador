import { describe, expect, it } from 'vitest';
import {
  miniToStage,
  normalizePageLayout,
  sanitizeCustomText,
  sanitizeElementStyle,
} from '@/lib/layout';

describe('sanitizeElementStyle', () => {
  it('hanya field valid; size dibatasi 50..150 dan 100 tidak disimpan', () => {
    expect(sanitizeElementStyle({ color: '#FF0000', font: 'oswald', bold: 1, italic: 0, spacing: 99, size: 5000, hidden: true })).toEqual({
      color: '#ff0000', font: 'oswald', bold: true, italic: false, spacing: 40, size: 150, hidden: true,
    });
    expect(sanitizeElementStyle({ size: 1 })).toEqual({ size: 50 });
    expect(sanitizeElementStyle({ size: 100 })).toEqual({});
    expect(sanitizeElementStyle({ hidden: false })).toEqual({});
  });

  it('membuang nilai tidak valid dan input bukan objek', () => {
    expect(sanitizeElementStyle({ color: 'merah', font: 'comic', size: 'abc', size2: 1 })).toEqual({});
    expect(sanitizeElementStyle({ size: null })).toEqual({});
    expect(sanitizeElementStyle(null)).toEqual({});
    expect(sanitizeElementStyle('x')).toEqual({});
  });
});

describe('sanitizeCustomText', () => {
  it('trim + slice 120 + clamp posisi/ukuran', () => {
    const b = sanitizeCustomText({ id: 'abcd1234', text: '  SESI 1  ', x: 5000, y: -10, size: 999 });
    expect(b).toEqual({ id: 'abcd1234', text: 'SESI 1', x: 1920, y: 0, size: 200 });
  });

  it('menolak teks kosong dan id tak valid', () => {
    expect(sanitizeCustomText({ id: 'abcd1234', text: '   ', x: 0, y: 0, size: 64 })).toBeNull();
    expect(sanitizeCustomText({ id: 42, text: 'HI', x: 0, y: 0, size: 64 })).toBeNull();
  });
});

describe('normalizePageLayout', () => {
  it('default untuk undefined dan cap 5 blok', () => {
    expect(normalizePageLayout(undefined)).toEqual({ styles: {}, texts: [] });
    const texts = Array.from({ length: 7 }, (_, i) => ({ id: `id00000${i}`, text: `T${i}`, x: 0, y: 0, size: 64 }));
    const norm = normalizePageLayout({ styles: { digit: { size: 120 }, ticker: {}, nope: { size: 80 } }, texts });
    expect(norm.texts).toHaveLength(5);
    expect(norm.styles).toEqual({ digit: { size: 120 } });
  });

  it('membuang offsets lama (posisi geser elemen bawaan)', () => {
    const norm = normalizePageLayout({ offsets: { digit: { dx: 10, dy: 20 } }, texts: [] });
    expect(norm).toEqual({ styles: {}, texts: [] });
  });
});

describe('field gaya teks', () => {
  const base = { id: 'abcd1234', text: 'HI', x: 10, y: 20, size: 64 };

  it('blok lama tanpa field baru tidak mendapat field tambahan', () => {
    expect(sanitizeCustomText(base)).toEqual(base);
    expect(normalizePageLayout({ offsets: {}, texts: [base] }).texts[0]).toEqual(base);
  });

  it('color tidak valid dibuang, spacing di-clamp, font tak dikenal dibuang', () => {
    const out = sanitizeCustomText({ ...base, color: 'merah', spacing: 999, font: 'comic', bold: 0, align: 'justify' });
    expect(out).not.toHaveProperty('color');
    expect(out).not.toHaveProperty('font');
    expect(out).not.toHaveProperty('align');
    expect(out).toMatchObject({ spacing: 40, bold: false });
    expect(sanitizeCustomText({ ...base, spacing: -99 })?.spacing).toBe(-10);
  });

  it('field valid dipertahankan', () => {
    const out = sanitizeCustomText({ ...base, color: '#FF0000', font: 'anton', italic: true, align: 'left', hidden: true });
    expect(out).toMatchObject({ color: '#ff0000', font: 'anton', italic: true, align: 'left', hidden: true });
  });
});

describe('miniToStage', () => {
  it('konversi proporsional mini canvas ke stage', () => {
    expect(miniToStage(320, 180, 640, 360)).toEqual({ x: 960, y: 540 });
    expect(miniToStage(0, 0, 640, 360)).toEqual({ x: 0, y: 0 });
  });
});
