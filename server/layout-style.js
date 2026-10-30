'use strict';

// HARUS sama dengan FONT_KEYS di src/lib/layout.ts (server tidak bisa impor TS).
const FONT_KEYS = ['default', 'anton', 'bebas', 'oswald', 'teko', 'archivo', 'orbitron', 'robotoMono'];
const ALIGNS = ['left', 'center', 'right'];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
// Sama dengan LAYOUT_LIMITS.SPACING_MIN/MAX di src/lib/layout.ts.
const SPACING_MIN = -10;
const SPACING_MAX = 40;

// Cermin sanitizeTextStyle di src/lib/layout.ts: hanya field valid yang dikeluarkan.
function sanitizeTextStyle(raw) {
  const out = {};
  if (typeof raw.font === 'string' && FONT_KEYS.includes(raw.font)) out.font = raw.font;
  if (raw.bold !== undefined) out.bold = Boolean(raw.bold);
  if (raw.italic !== undefined) out.italic = Boolean(raw.italic);
  if (typeof raw.align === 'string' && ALIGNS.includes(raw.align)) out.align = raw.align;
  if (typeof raw.color === 'string' && HEX_COLOR.test(raw.color)) out.color = raw.color.toLowerCase();
  if (raw.spacing !== undefined && Number.isFinite(Number(raw.spacing))) {
    out.spacing = Math.min(SPACING_MAX, Math.max(SPACING_MIN, Math.round(Number(raw.spacing))));
  }
  if (raw.hidden !== undefined) out.hidden = Boolean(raw.hidden);
  return out;
}

// Cermin sanitizeElementStyle di src/lib/layout.ts (gaya elemen bawaan). Size 50..150 persen.
const ELEMENT_SIZE_MIN = 50;
const ELEMENT_SIZE_MAX = 150;
const ELEMENT_KEYS = ['digit', 'label', 'ticker', 'clock'];

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
    const size = Math.min(ELEMENT_SIZE_MAX, Math.max(ELEMENT_SIZE_MIN, Math.round(Number(raw.size))));
    if (size !== 100) out.size = size;
  }
  return out;
}

module.exports = { sanitizeTextStyle, sanitizeElementStyle, ELEMENT_KEYS, FONT_KEYS };
