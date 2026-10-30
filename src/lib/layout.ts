import type { CustomTextBlock, ElementStyle, FontKey, PageLayout } from '@/types/timer';
import { DEFAULT_PAGE_LAYOUT } from '@/types/timer';

export const LAYOUT_LIMITS = {
  X_MIN: 0, X_MAX: 1920,
  Y_MIN: 0, Y_MAX: 1080,
  SIZE_MIN: 24, SIZE_MAX: 200,
  TEXT_MAX: 120,
  BLOCKS_MAX: 5,
  SPACING_MIN: -10, SPACING_MAX: 40,
  ELEMENT_SIZE_MIN: 50, ELEMENT_SIZE_MAX: 150,
} as const;

const clampInt = (v: number, min: number, max: number): number => {
  if (!Number.isFinite(v)) return 0;
  return Math.min(max, Math.max(min, Math.round(v)));
};

// Elemen bawaan yang boleh punya gaya, per halaman.
export const ELEMENT_KEYS = ['digit', 'label', 'ticker', 'clock'] as const;

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateBlockId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return id;
}

// Duplikat FONT_OPTIONS (appearance.ts mengimpor file ini, jadi tidak bisa diimpor balik).
const FONT_KEYS: readonly FontKey[] = [
  'default', 'anton', 'bebas', 'oswald', 'teko', 'archivo', 'orbitron', 'robotoMono',
];
const ALIGNS = ['left', 'center', 'right'] as const;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Hanya mengembalikan field baru yang valid; field yang tidak ada/invalid dibuang.
export function sanitizeTextStyle(
  raw: Partial<Omit<CustomTextBlock, 'id'>>,
): Partial<Omit<CustomTextBlock, 'id' | 'text' | 'x' | 'y' | 'size'>> {
  const out: Partial<Omit<CustomTextBlock, 'id' | 'text' | 'x' | 'y' | 'size'>> = {};
  if (typeof raw.font === 'string' && (FONT_KEYS as readonly string[]).includes(raw.font)) out.font = raw.font;
  if (raw.bold !== undefined) out.bold = Boolean(raw.bold);
  if (raw.italic !== undefined) out.italic = Boolean(raw.italic);
  if (typeof raw.align === 'string' && (ALIGNS as readonly string[]).includes(raw.align)) out.align = raw.align;
  if (typeof raw.color === 'string' && HEX_COLOR.test(raw.color)) out.color = raw.color.toLowerCase();
  if (raw.spacing !== undefined && Number.isFinite(Number(raw.spacing))) {
    out.spacing = clampInt(Number(raw.spacing), LAYOUT_LIMITS.SPACING_MIN, LAYOUT_LIMITS.SPACING_MAX);
  }
  if (raw.hidden !== undefined) out.hidden = Boolean(raw.hidden);
  return out;
}

// Gaya elemen bawaan: hanya field valid yang keluar; size 100 dan style kosong tidak disimpan.
export function sanitizeElementStyle(raw: unknown): ElementStyle {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Partial<ElementStyle>;
  const { font, bold, italic, color, spacing, hidden } = sanitizeTextStyle(r);
  const out: ElementStyle = {};
  if (font !== undefined) out.font = font;
  if (bold !== undefined) out.bold = bold;
  if (italic !== undefined) out.italic = italic;
  if (color !== undefined) out.color = color;
  if (spacing !== undefined) out.spacing = spacing;
  if (hidden) out.hidden = true;
  if (r.size !== undefined && r.size !== null && Number.isFinite(Number(r.size))) {
    const size = clampInt(Number(r.size), LAYOUT_LIMITS.ELEMENT_SIZE_MIN, LAYOUT_LIMITS.ELEMENT_SIZE_MAX);
    if (size !== 100) out.size = size;
  }
  return out;
}

export function sanitizeCustomText(raw: unknown): CustomTextBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Partial<CustomTextBlock>;
  if (typeof b.id !== 'string' || !/^[a-z0-9]{8}$/.test(b.id)) return null;
  const text = typeof b.text === 'string' ? b.text.trim().slice(0, LAYOUT_LIMITS.TEXT_MAX) : '';
  if (!text) return null;
  return {
    id: b.id,
    text,
    x: clampInt(Number(b.x), LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
    y: clampInt(Number(b.y), LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
    size: clampInt(Number(b.size), LAYOUT_LIMITS.SIZE_MIN, LAYOUT_LIMITS.SIZE_MAX) || LAYOUT_LIMITS.SIZE_MIN,
    ...sanitizeTextStyle(b),
  };
}

export function normalizePageLayout(raw: unknown): PageLayout {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PAGE_LAYOUT, texts: [] };
  const p = raw as Partial<PageLayout>;
  // Data lama (`offsets`, posisi geser elemen bawaan) sengaja diabaikan: layout bawaan dikunci.
  const styles: Record<string, ElementStyle> = {};
  if (p.styles && typeof p.styles === 'object') {
    for (const key of ELEMENT_KEYS) {
      const clean = sanitizeElementStyle((p.styles as Record<string, unknown>)[key]);
      if (Object.keys(clean).length > 0) styles[key] = clean;
    }
  }
  const texts: CustomTextBlock[] = [];
  if (Array.isArray(p.texts)) {
    for (const t of p.texts) {
      if (texts.length >= LAYOUT_LIMITS.BLOCKS_MAX) break;
      const clean = sanitizeCustomText(t);
      if (clean) texts.push(clean);
    }
  }
  return { styles, texts };
}

export function miniToStage(mx: number, my: number, mw: number, mh: number): { x: number; y: number } {
  return {
    x: clampInt((mx / mw) * 1920, LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
    y: clampInt((my / mh) * 1080, LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
  };
}
