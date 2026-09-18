'use client';

import { useEffect, useState } from 'react';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Jam sistem lokal berjalan real-time, format "HH:MM:SS". Hanya ticking saat `active`. */
export function useLiveClock(active: boolean): string {
  const [time, setTime] = useState('');

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const d = new Date();
      setTime(`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  return time;
}
