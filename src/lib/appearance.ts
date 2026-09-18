import {
  AppearanceConfig,
  DEFAULT_APPEARANCE,
  DEFAULT_TIMER_STATE,
  FontKey,
  TimerState,
} from '@/types/timer';

export interface FontOption {
  key: FontKey;
  label: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'default', label: 'Default (Anton + Inter)' },
  { key: 'anton', label: 'Anton' },
  { key: 'bebas', label: 'Bebas Neue' },
  { key: 'oswald', label: 'Oswald' },
  { key: 'teko', label: 'Teko' },
  { key: 'archivo', label: 'Archivo Black' },
  { key: 'orbitron', label: 'Orbitron' },
  { key: 'robotoMono', label: 'Roboto Mono' },
];

export const GALLERY_BACKGROUNDS: string[] = [
  '/backgrounds/gradient-slate.svg',
  '/backgrounds/gradient-emerald.svg',
  '/backgrounds/gradient-royal.svg',
  '/backgrounds/gradient-sunset.svg',
  '/backgrounds/grid-dark.svg',
  '/backgrounds/dots-dark.svg',
];

const GALLERY_PREFIX = '/backgrounds/';
const MAX_IMAGE_URL_LENGTH = 2048;

export function normalizeAppearance(
  partial: Partial<AppearanceConfig> | null | undefined,
): AppearanceConfig {
  return { ...DEFAULT_APPEARANCE, ...(partial ?? {}) };
}

export function sanitizeImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url || url.length > MAX_IMAGE_URL_LENGTH) return '';
  if (url.startsWith(GALLERY_PREFIX)) return url;
  try {
    const { protocol } = new URL(url);
    if (protocol === 'http:' || protocol === 'https:') return url;
  } catch {
    return '';
  }
  return '';
}

export function appearanceClass(a: AppearanceConfig): string {
  const classes: string[] = [];
  if (a.fontFamily !== 'default') classes.push(`app-font-${a.fontFamily}`);
  if (a.bold) classes.push('app-bold');
  if (a.italic) classes.push('app-italic');
  return classes.join(' ');
}

export function mergeIncomingState(state: Partial<TimerState>): TimerState {
  return {
    ...DEFAULT_TIMER_STATE,
    ...state,
    appearance: normalizeAppearance(state.appearance),
  };
}
