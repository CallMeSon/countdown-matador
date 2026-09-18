import { describe, expect, it } from 'vitest';
import {
  TIMESUP_EXIT_SECONDS,
  TIMESUP_HOLD_SECONDS,
  timesUpPhase,
} from '@/lib/timer-phase';

describe('timesUpPhase', () => {
  const exitStart = TIMESUP_HOLD_SECONDS - TIMESUP_EXIT_SECONDS;

  it("awal overtime: TIME'S UP masuk", () => {
    expect(timesUpPhase(-0)).toBe('timesup');
    expect(timesUpPhase(-1)).toBe('timesup');
    expect(timesUpPhase(-(exitStart - 0.01))).toBe('timesup');
  });

  it("menjelang detik ke-5: TIME'S UP animasi keluar", () => {
    expect(timesUpPhase(-exitStart)).toBe('timesup-exit');
    expect(timesUpPhase(-(TIMESUP_HOLD_SECONDS - 0.01))).toBe('timesup-exit');
  });

  it('detik ke-5 dan seterusnya: counter minus', () => {
    expect(timesUpPhase(-TIMESUP_HOLD_SECONDS)).toBe('counter');
    expect(timesUpPhase(-30)).toBe('counter');
  });
});
