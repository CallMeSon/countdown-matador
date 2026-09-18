import { describe, expect, it } from 'vitest';
import {
  FONT_OPTIONS,
  GALLERY_BACKGROUNDS,
  appearanceClass,
  mergeIncomingState,
  normalizeAppearance,
  sanitizeImageUrl,
} from '@/lib/appearance';
import { DEFAULT_APPEARANCE, DEFAULT_TIMER_STATE } from '@/types/timer';

describe('normalizeAppearance', () => {
  it('mengisi field yang hilang dari default', () => {
    expect(normalizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ bold: true })).toEqual({ ...DEFAULT_APPEARANCE, bold: true });
  });
});

describe('sanitizeImageUrl', () => {
  it('menerima http dan https (di-trim)', () => {
    expect(sanitizeImageUrl(' https://example.com/a.png ')).toBe('https://example.com/a.png');
    expect(sanitizeImageUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
  });

  it('menerima path galeri /backgrounds/', () => {
    expect(sanitizeImageUrl('/backgrounds/grid-dark.svg')).toBe('/backgrounds/grid-dark.svg');
  });

  it('menolak skema berbahaya, relatif, dan kosong', () => {
    expect(sanitizeImageUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeImageUrl('data:image/png;base64,AAAA')).toBe('');
    expect(sanitizeImageUrl('ftp://example.com/a.png')).toBe('');
    expect(sanitizeImageUrl('example.com/a.png')).toBe('');
    expect(sanitizeImageUrl('')).toBe('');
    expect(sanitizeImageUrl('   ')).toBe('');
  });

  it('menolak URL lebih dari 2048 karakter', () => {
    expect(sanitizeImageUrl(`https://example.com/${'a'.repeat(2100)}`)).toBe('');
  });
});

describe('appearanceClass', () => {
  it('default tidak menambah kelas', () => {
    expect(appearanceClass(DEFAULT_APPEARANCE)).toBe('');
  });

  it('menghasilkan kelas font + bold + italic', () => {
    expect(
      appearanceClass({ ...DEFAULT_APPEARANCE, fontFamily: 'oswald', bold: true, italic: true }),
    ).toBe('app-font-oswald app-bold app-italic');
  });
});

describe('mergeIncomingState', () => {
  it('mengisi appearance yang hilang dari state lama', () => {
    const merged = mergeIncomingState({ ...DEFAULT_TIMER_STATE, appearance: undefined });
    expect(merged.appearance).toEqual(DEFAULT_APPEARANCE);
  });

  it('mempertahankan appearance yang sudah ada', () => {
    const appearance = { ...DEFAULT_APPEARANCE, fontFamily: 'teko' as const, bold: true };
    expect(mergeIncomingState({ ...DEFAULT_TIMER_STATE, appearance }).appearance).toEqual(appearance);
  });
});

describe('FONT_OPTIONS / GALLERY_BACKGROUNDS', () => {
  it('memuat default + 7 font dan galeri tidak kosong', () => {
    expect(FONT_OPTIONS.map((f) => f.key)).toEqual([
      'default',
      'anton',
      'bebas',
      'oswald',
      'teko',
      'archivo',
      'orbitron',
      'robotoMono',
    ]);
    expect(GALLERY_BACKGROUNDS.length).toBeGreaterThan(0);
    expect(GALLERY_BACKGROUNDS.every((p) => p.startsWith('/backgrounds/'))).toBe(true);
  });
});
