'use client';

import { useEffect, useRef, useState } from 'react';
import { TimerState } from '@/types/timer';

/**
 * Beep 10 detik terakhir countdown.
 * Browser autoplay policy: audio.play() ditolak kalau tab belum pernah
 * dapat interaksi user. play() gagal → set blocked → UI overlay muncul
 * minta user klik sekali buat "unlock" suara.
 */
export function useCountdownBeep(
  secondsLeft: number,
  isOvertime: boolean,
  state: TimerState,
  enabled = true,
) {
  const beepRef = useRef<HTMLAudioElement | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!enabled || isOvertime || secondsLeft !== 10 || state.status !== 'running') return;
    const audio = beepRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => setBlocked(true));
  }, [enabled, secondsLeft, isOvertime, state.status]);

  // Pause/reset audio saat timer berhenti
  useEffect(() => {
    const audio = beepRef.current;
    if (!audio) return;
    if (state.status === 'paused' || state.status === 'idle') {
      audio.pause();
    } else if (state.status === 'running' && !audio.paused) {
      audio.play().catch(() => setBlocked(true));
    }
  }, [state.status]);

  const unlockBeep = () => {
    const audio = beepRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setBlocked(false);
  };

  return { beepRef, beepBlocked: blocked, unlockBeep };
}
