'use strict';

// Sumber tunggal aturan layout (batas, sanitasi, normalisasi). Dipakai relay (require)
// dan klien (src/lib/layout.ts mengimpor file ini), jadi tidak ada salinan yang bisa
// melenceng. Tetap CommonJS polos tanpa build karena relay berjalan langsung di Node.

const LAYOUT_LIMITS = {
  X_MIN: 0, X_MAX: 1920,
  Y_MIN: 0, Y_MAX: 1080,
  SIZE_MIN: 24, SIZE_MAX: 200,
  TEXT_MAX: 120,
  BLOCKS_MAX: 5,
  SPACING_MIN: -10, SPACING_MAX: 40,
  ELEMENT_SIZE_MIN: 50, ELEMENT_SIZE_MAX: 150,
};

// Elemen bawaan yang boleh punya gaya, per halaman.
const ELEMENT_KEYS = ['digit', 'label', 'ticker', 'clock'];
const FONT_KEYS = ['default', 'anton', 'bebas', 'oswald', 'teko', 'archivo', 'orbitron', 'robotoMono'];
const ALIGNS = ['left', 'center', 'right'];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const BLOCK_ID = /^[a-z0-9]{8}$/;

// Nilai bukan angka jadi 0, lalu di-clamp ke rentang.
function clampInt(v, min, max) {
  if (!Number.isFinite(v)) return 0;
  return Math.min(max, Math.max(min, Math.round(v)));
}

// Hanya field valid yang dikeluarkan; field yang tidak ada/invalid dibuang.
function sanitizeTextStyle(raw) {
  const out = {};
  if (typeof raw.font === 'string' && FONT_KEYS.includes(raw.font)) out.font = raw.font;
  if (raw.bold !== undefined) out.bold = Boolean(raw.bold);
  if (raw.italic !== undefined) out.italic = Boolean(raw.italic);
  if (typeof raw.align === 'string' && ALIGNS.includes(raw.align)) out.align = raw.align;
  if (typeof raw.color === 'string' && HEX_COLOR.test(raw.color)) out.color = raw.color.toLowerCase();
  if (raw.spacing !== undefined && Number.isFinite(Number(raw.spacing))) {
    out.spacing = clampInt(Number(raw.spacing), LAYOUT_LIMITS.SPACING_MIN, LAYOUT_LIMITS.SPACING_MAX);
  }
  if (raw.hidden !== undefined) out.hidden = Boolean(raw.hidden);
  return out;
}

// Gaya elemen bawaan: size 100 dan style kosong tidak disimpan.
function sanitizeElementStyle(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const { font, bold, italic, color, spacing, hidden } = sanitizeTextStyle(raw);
  const out = {};
  if (font !== undefined) out.font = font;
  if (bold !== undefined) out.bold = bold;
  if (italic !== undefined) out.italic = italic;
  if (color !== undefined) out.color = color;
  if (spacing !== undefined) out.spacing = spacing;
  if (hidden) out.hidden = true;
  if (raw.size !== undefined && raw.size !== null && Number.isFinite(Number(raw.size))) {
    const size = clampInt(Number(raw.size), LAYOUT_LIMITS.ELEMENT_SIZE_MIN, LAYOUT_LIMITS.ELEMENT_SIZE_MAX);
    if (size !== 100) out.size = size;
  }
  return out;
}

function sanitizeCustomText(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !BLOCK_ID.test(raw.id)) return null;
  const text = typeof raw.text === 'string' ? raw.text.trim().slice(0, LAYOUT_LIMITS.TEXT_MAX) : '';
  if (!text) return null;
  return {
    id: raw.id,
    text,
    x: clampInt(Number(raw.x), LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
    y: clampInt(Number(raw.y), LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
    size: clampInt(Number(raw.size), LAYOUT_LIMITS.SIZE_MIN, LAYOUT_LIMITS.SIZE_MAX) || LAYOUT_LIMITS.SIZE_MIN,
    ...sanitizeTextStyle(raw),
  };
}

// `offsets` lama (posisi geser elemen bawaan) sengaja diabaikan: layout bawaan dikunci.
function normalizePageLayout(raw) {
  const out = { styles: {}, texts: [] };
  if (!raw || typeof raw !== 'object') return out;
  if (raw.styles && typeof raw.styles === 'object') {
    for (const key of ELEMENT_KEYS) {
      const clean = sanitizeElementStyle(raw.styles[key]);
      if (Object.keys(clean).length > 0) out.styles[key] = clean;
    }
  }
  if (Array.isArray(raw.texts)) {
    for (const t of raw.texts) {
      if (out.texts.length >= LAYOUT_LIMITS.BLOCKS_MAX) break;
      const clean = sanitizeCustomText(t);
      if (clean) out.texts.push(clean);
    }
  }
  return out;
}

// ---- State penuh (dipakai relay untuk menyaring pesan STATE dari client) ----

const STATUSES = ['idle', 'running', 'paused', 'overtime'];
const DISPLAY_MODES = ['timer', 'clock'];
const BG_MODES = ['color', 'image'];
const STAGE_MESSAGE_MAX = 255;
const DURATION_MAX = 8640000; // 100 hari, detik
const IMAGE_URL_MAX = 2048;
const LOCAL_IMAGE_PREFIXES = ['/backgrounds/', '/uploads/'];

// Cermin DEFAULT_TIMER_STATE di src/types/timer.ts. Fungsi, supaya tiap room dapat objek sendiri.
function createDefaultState() {
  return {
    status: 'idle',
    duration: 300,
    startedAt: null,
    pausedRemaining: null,
    displayMode: 'timer',
    stageMessage: null,
    appearance: {
      bgMode: 'color',
      bgColor: '#000000',
      bgImage: '',
      fontFamily: 'default',
      bold: false,
      italic: false,
      fontColor: '#ffffff',
    },
    layoutTimer: { styles: {}, texts: [] },
    layoutMatador: { styles: {}, texts: [] },
  };
}

// Cermin sanitizeImageUrl di src/lib/appearance.ts.
function sanitizeImageUrl(raw) {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url || url.length > IMAGE_URL_MAX) return '';
  if (LOCAL_IMAGE_PREFIXES.some((prefix) => url.startsWith(prefix))) return url;
  try {
    const { protocol } = new URL(url);
    if (protocol === 'http:' || protocol === 'https:') return url;
  } catch {
    return '';
  }
  return '';
}

const finiteOr = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const finiteOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function normalizeAppearance(raw, base) {
  const a = raw && typeof raw === 'object' ? raw : base;
  const d = createDefaultState().appearance;
  return {
    bgMode: BG_MODES.includes(a.bgMode) ? a.bgMode : d.bgMode,
    bgColor: typeof a.bgColor === 'string' && HEX_COLOR.test(a.bgColor) ? a.bgColor : d.bgColor,
    bgImage: sanitizeImageUrl(a.bgImage),
    fontFamily: FONT_KEYS.includes(a.fontFamily) ? a.fontFamily : d.fontFamily,
    bold: typeof a.bold === 'boolean' ? a.bold : d.bold,
    italic: typeof a.italic === 'boolean' ? a.italic : d.italic,
    fontColor: typeof a.fontColor === 'string' && HEX_COLOR.test(a.fontColor) ? a.fontColor : d.fontColor,
  };
}

function normalizeStageMessage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const text = typeof raw.text === 'string' ? raw.text.trim().slice(0, STAGE_MESSAGE_MAX) : '';
  if (!text) return null;
  return { text, sentAt: finiteOr(raw.sentAt, Date.now()), showOnTimer: raw.showOnTimer === true };
}

/**
 * Saring state penuh dari client: hanya field yang dikenal, tipe dan rentang dicek,
 * field yang hilang diisi default. `fallbackAppearance` (appearance room saat ini)
 * dipakai bila pesan dari client lama tidak membawa `appearance`.
 */
function normalizeState(raw, fallbackAppearance) {
  const d = createDefaultState();
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    status: STATUSES.includes(r.status) ? r.status : d.status,
    duration: Math.min(DURATION_MAX, Math.max(1, Math.round(finiteOr(r.duration, d.duration)))),
    startedAt: finiteOrNull(r.startedAt),
    pausedRemaining: finiteOrNull(r.pausedRemaining),
    displayMode: DISPLAY_MODES.includes(r.displayMode) ? r.displayMode : d.displayMode,
    stageMessage: normalizeStageMessage(r.stageMessage),
    appearance: normalizeAppearance(r.appearance, fallbackAppearance || d.appearance),
    layoutTimer: normalizePageLayout(r.layoutTimer),
    layoutMatador: normalizePageLayout(r.layoutMatador),
  };
}

module.exports = {
  LAYOUT_LIMITS,
  ELEMENT_KEYS,
  FONT_KEYS,
  clampInt,
  sanitizeTextStyle,
  sanitizeElementStyle,
  sanitizeCustomText,
  normalizePageLayout,
  createDefaultState,
  normalizeState,
};
