import type { CustomTextBlock, LayoutOffset, PageLayout } from '@/types/timer';
import { DEFAULT_PAGE_LAYOUT } from '@/types/timer';

export const LAYOUT_LIMITS = {
  DX_MIN: -900, DX_MAX: 900,
  DY_MIN: -500, DY_MAX: 500,
  X_MIN: 0, X_MAX: 1920,
  Y_MIN: 0, Y_MAX: 1080,
  SIZE_MIN: 24, SIZE_MAX: 200,
  TEXT_MAX: 120,
  BLOCKS_MAX: 5,
} as const;

const clampInt = (v: number, min: number, max: number): number => {
  if (!Number.isFinite(v)) return 0;
  return Math.min(max, Math.max(min, Math.round(v)));
};

export function normalizeOffset(raw: unknown): LayoutOffset {
  const o = (raw ?? {}) as Partial<LayoutOffset>;
  return {
    dx: clampInt(Number(o.dx), LAYOUT_LIMITS.DX_MIN, LAYOUT_LIMITS.DX_MAX) || 0,
    dy: clampInt(Number(o.dy), LAYOUT_LIMITS.DY_MIN, LAYOUT_LIMITS.DY_MAX) || 0,
  };
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateBlockId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return id;
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
  };
}

export function normalizePageLayout(raw: unknown): PageLayout {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PAGE_LAYOUT, texts: [] };
  const p = raw as Partial<PageLayout>;
  const offsets: Record<string, LayoutOffset> = {};
  if (p.offsets && typeof p.offsets === 'object') {
    for (const [k, v] of Object.entries(p.offsets)) offsets[k] = normalizeOffset(v);
  }
  const texts: CustomTextBlock[] = [];
  if (Array.isArray(p.texts)) {
    for (const t of p.texts) {
      if (texts.length >= LAYOUT_LIMITS.BLOCKS_MAX) break;
      const clean = sanitizeCustomText(t);
      if (clean) texts.push(clean);
    }
  }
  return { offsets, texts };
}

export function miniToStage(mx: number, my: number, mw: number, mh: number): { x: number; y: number } {
  return {
    x: clampInt((mx / mw) * 1920, LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
    y: clampInt((my / mh) * 1080, LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
  };
}
