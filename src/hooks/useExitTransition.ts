'use client';

import { useEffect, useState } from 'react';

/**
 * Versi ringan "AnimatePresence" tanpa library — elemen tetap di-mount
 * selama `exitMs` setelah `active` jadi false, supaya sempat main animasi
 * exit dulu sebelum beneran hilang dari DOM.
 */
export function useExitTransition(active: boolean, exitMs: number): { mounted: boolean; exiting: boolean } {
  const [mounted, setMounted] = useState(active);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (active) {
      setMounted(true);
      setExiting(false);
      return;
    }
    if (!mounted) return;
    setExiting(true);
    const id = setTimeout(() => {
      setMounted(false);
      setExiting(false);
    }, exitMs);
    return () => clearTimeout(id);
  }, [active, exitMs, mounted]);

  return { mounted, exiting };
}
