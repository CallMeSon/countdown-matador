import { LAYOUT_LIMITS, clampInt } from '../../server/layout-style';

// Aturan layout (batas, sanitasi, normalisasi) hidup di satu tempat: server/layout-style.js,
// supaya klien dan relay tidak pernah punya salinan yang berbeda.
export {
  LAYOUT_LIMITS,
  ELEMENT_KEYS,
  sanitizeTextStyle,
  sanitizeElementStyle,
  sanitizeCustomText,
  normalizePageLayout,
} from '../../server/layout-style';

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateBlockId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return id;
}

export function miniToStage(mx: number, my: number, mw: number, mh: number): { x: number; y: number } {
  return {
    x: clampInt((mx / mw) * 1920, LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
    y: clampInt((my / mh) * 1080, LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
  };
}
