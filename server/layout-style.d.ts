import type { CustomTextBlock, ElementStyle, FontKey, PageLayout, TimerState } from '../src/types/timer';

export const LAYOUT_LIMITS: {
  readonly X_MIN: 0; readonly X_MAX: 1920;
  readonly Y_MIN: 0; readonly Y_MAX: 1080;
  readonly SIZE_MIN: 24; readonly SIZE_MAX: 200;
  readonly TEXT_MAX: 120;
  readonly BLOCKS_MAX: 5;
  readonly SPACING_MIN: -10; readonly SPACING_MAX: 40;
  readonly ELEMENT_SIZE_MIN: 50; readonly ELEMENT_SIZE_MAX: 150;
};
export const ELEMENT_KEYS: readonly ['digit', 'label', 'ticker', 'clock'];
export const FONT_KEYS: readonly FontKey[];
export function clampInt(v: number, min: number, max: number): number;
export function sanitizeTextStyle(
  raw: Partial<Omit<CustomTextBlock, 'id'>>,
): Partial<Omit<CustomTextBlock, 'id' | 'text' | 'x' | 'y' | 'size'>>;
export function sanitizeElementStyle(raw: unknown): ElementStyle;
export function sanitizeCustomText(raw: unknown): CustomTextBlock | null;
export function normalizePageLayout(raw: unknown): PageLayout;
export function createDefaultState(): TimerState;
export function normalizeState(raw: unknown, fallbackAppearance?: TimerState['appearance']): TimerState;
