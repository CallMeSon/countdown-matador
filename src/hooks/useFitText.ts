'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Auto-scale font-size (binary search) supaya teks selalu penuh muat di
 * container fixed-size-nya — teks pendek otomatis kebesar, teks panjang
 * otomatis mengecil (wrap multi-baris) sampai muat, tanpa terpotong.
 */
export function useFitText<T extends HTMLElement>(text: string, min = 20, max = 160) {
  const ref = useRef<T>(null);
  const [fontSize, setFontSize] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lo = min;
    let hi = max;
    let best = min;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      el.style.fontSize = `${mid}px`;
      const fits = el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight;
      if (fits) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    el.style.fontSize = `${best}px`;
    setFontSize(best);
  }, [text, min, max]);

  return { ref, fontSize };
}
