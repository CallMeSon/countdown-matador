// ============================================================
// Matador Timer — Fase tampilan saat overtime
// ============================================================

/** Lama tulisan TIME'S UP bertahan sebelum berganti ke counter minus (detik). */
export const TIMESUP_HOLD_SECONDS = 5;

/** Durasi animasi keluar TIME'S UP, dijalankan di ujung masa tahan (detik). */
export const TIMESUP_EXIT_SECONDS = 0.4;

export type TimesUpPhase = 'timesup' | 'timesup-exit' | 'counter';

/**
 * Fase dihitung dari `remaining` (negatif saat overtime), bukan wall-clock,
 * supaya tahan pause/resume dan deterministik di test.
 */
export function timesUpPhase(remaining: number): TimesUpPhase {
  const elapsed = -remaining;
  if (elapsed >= TIMESUP_HOLD_SECONDS) return 'counter';
  if (elapsed >= TIMESUP_HOLD_SECONDS - TIMESUP_EXIT_SECONDS) return 'timesup-exit';
  return 'timesup';
}
