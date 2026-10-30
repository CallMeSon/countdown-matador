'use client';

import type { AppearanceConfig, CustomTextBlock } from '@/types/timer';
import { appearanceClass } from '@/lib/appearance';

export function LayoutOverlay({
  texts,
  appearance,
}: {
  texts: CustomTextBlock[];
  appearance: AppearanceConfig;
}) {
  if (texts.length === 0) return null;
  // Kelas font/bold/italic per blok: bila diset, menggantikan versi global.
  const classFor = (b: CustomTextBlock): string => {
    const base: AppearanceConfig = {
      ...appearance,
      fontFamily: b.font ?? appearance.fontFamily,
      bold: b.bold === undefined ? appearance.bold : false,
      italic: b.italic === undefined ? appearance.italic : false,
    };
    return appearanceClass(base);
  };
  return (
    <>
      {texts.filter((b) => !b.hidden).map((b) => {
        const appClass = classFor(b);
        return (
        <div
          key={b.id}
          data-testid={`custom-text-${b.id}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            transform: `translate(${b.align === 'left' ? '0' : b.align === 'right' ? '-100%' : '-50%'}, -50%)`,
            fontSize: b.size,
            color: b.color ?? appearance.fontColor,
            fontWeight: b.bold === undefined ? undefined : b.bold ? 800 : 400,
            fontStyle: b.italic === undefined ? undefined : b.italic ? 'italic' : 'normal',
            textAlign: b.align ?? 'center',
            letterSpacing: b.spacing ? `${b.spacing}px` : undefined,
          }}
          className={`pointer-events-none z-10 whitespace-nowrap font-inter font-extrabold uppercase leading-none${appClass ? ` ${appClass}` : ''}`}
        >
          {b.text}
        </div>
        );
      })}
    </>
  );
}
