'use client';

import { useEffect, useState } from 'react';

/**
 * True selama `windowMs` pertama sejak `sentAt` (dihitung dari timestamp bersama,
 * bukan timer lokal) — jadi tab yang connect di tengah-tengah window tetap dapat
 * status blink yang benar, bukan mulai dari 0 lagi.
 */
export function useBlinkWindow(sentAt: number | null, windowMs = 15000): boolean {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (sentAt === null) {
      setBlinking(false);
      return;
    }
    const remaining = windowMs - (Date.now() - sentAt);
    if (remaining <= 0) {
      setBlinking(false);
      return;
    }
    setBlinking(true);
    const id = setTimeout(() => setBlinking(false), remaining);
    return () => clearTimeout(id);
  }, [sentAt, windowMs]);

  return blinking;
}
