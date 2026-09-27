import { describe, expect, it } from 'vitest';
import {
  miniToStage,
  normalizeOffset,
  normalizePageLayout,
  sanitizeCustomText,
} from '@/lib/layout';

describe('normalizeOffset', () => {
  it('clamp dx/dy dan buang NaN ke 0', () => {
    expect(normalizeOffset({ dx: 2000, dy: -9999 })).toEqual({ dx: 900, dy: -500 });
    expect(normalizeOffset({ dx: NaN, dy: 'a' })).toEqual({ dx: 0, dy: 0 });
    expect(normalizeOffset(null)).toEqual({ dx: 0, dy: 0 });
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
    expect(normalizePageLayout(undefined)).toEqual({ offsets: {}, texts: [] });
    const texts = Array.from({ length: 7 }, (_, i) => ({ id: `id00000${i}`, text: `T${i}`, x: 0, y: 0, size: 64 }));
    const norm = normalizePageLayout({ offsets: { digit: { dx: 10, dy: 20 } }, texts });
    expect(norm.texts).toHaveLength(5);
    expect(norm.offsets).toEqual({ digit: { dx: 10, dy: 20 } });
  });
});

describe('miniToStage', () => {
  it('konversi proporsional mini canvas ke stage', () => {
    expect(miniToStage(320, 180, 640, 360)).toEqual({ x: 960, y: 540 });
    expect(miniToStage(0, 0, 640, 360)).toEqual({ x: 0, y: 0 });
  });
});
