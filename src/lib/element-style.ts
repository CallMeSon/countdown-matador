import type { CSSProperties } from 'react';
import { appearanceClass } from '@/lib/appearance';
import type { AppearanceConfig, ElementStyle } from '@/types/timer';

export interface ResolvedElementStyle {
  className: string;
  css: CSSProperties;
  color: string;
  scale: number;
  hidden: boolean;
}

/**
 * Gabungkan gaya satu elemen bawaan dengan pengaturan global (appearance) sebagai bawaan.
 * Bold/italic yang diset per elemen dipasang inline (menggantikan versi global).
 */
export function resolveElementStyle(style: ElementStyle | undefined, appearance: AppearanceConfig): ResolvedElementStyle {
  const s = style ?? {};
  const className = appearanceClass({
    ...appearance,
    fontFamily: s.font ?? appearance.fontFamily,
    bold: s.bold === undefined ? appearance.bold : false,
    italic: s.italic === undefined ? appearance.italic : false,
  });
  const css: CSSProperties = {};
  if (s.bold !== undefined) css.fontWeight = s.bold ? 800 : 400;
  if (s.italic !== undefined) css.fontStyle = s.italic ? 'italic' : 'normal';
  if (s.spacing) css.letterSpacing = `${s.spacing}px`;
  return {
    className,
    css,
    color: s.color ?? appearance.fontColor,
    scale: (s.size ?? 100) / 100,
    hidden: !!s.hidden,
  };
}
