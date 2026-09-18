'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * Layout desain fixed di kanvas 1920x1080 (referensi broadcast/OBS standar),
 * lalu di-scale sebagai satu unit biar proporsinya selalu sama persis
 * berapapun ukuran window/browser-source yang sebenarnya me-render-nya —
 * tanpa ini, unit vw/vh bikin ukuran teks meledak di viewport yang beda
 * dari 1920x1080 (mis. saat langsung dibuka di browser biasa).
 */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export function useStageScale() {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    function update() {
      const scaleX = window.innerWidth / STAGE_WIDTH;
      const scaleY = window.innerHeight / STAGE_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}
