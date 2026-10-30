'use client';

import { useEffect, useState } from 'react';

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/**
 * Menunda unmount sampai animasi keluar selesai. Di reduced-motion elemen
 * langsung dilepas (tanpa menunggu).
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; state: 'enter' | 'exit' } {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (prefersReducedMotion() || exitMs <= 0) {
      setMounted(false);
      return;
    }
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);

  return { mounted: open || mounted, state: open ? 'enter' : 'exit' };
}
