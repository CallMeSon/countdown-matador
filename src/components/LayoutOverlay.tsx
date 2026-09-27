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
  const appClass = appearanceClass(appearance);
  return (
    <>
      {texts.map((b) => (
        <div
          key={b.id}
          data-testid={`custom-text-${b.id}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            transform: 'translate(-50%, -50%)',
            fontSize: b.size,
            color: appearance.fontColor,
          }}
          className={`pointer-events-none z-10 whitespace-nowrap text-center font-inter font-extrabold uppercase leading-none${appClass ? ` ${appClass}` : ''}`}
        >
          {b.text}
        </div>
      ))}
    </>
  );
}
