import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limiter';

describe('Anti-Bruteforce Rate Limiter', () => {
  beforeEach(() => {
    localStorage.clear();
    resetRateLimit('test_scope');
  });

  it('starts with max initial attempts and unlocked state', () => {
    const state = checkRateLimit('test_scope');
    expect(state.isLocked).toBe(false);
    expect(state.attemptsLeft).toBe(5);
    expect(state.lockRemainingSeconds).toBe(0);
  });

  it('decrements attempts on failed trials and triggers progressive penalty at 3 fails', () => {
    recordFailedAttempt('test_scope');
    const s2 = recordFailedAttempt('test_scope');
    expect(s2.isLocked).toBe(false);

    // 3rd failure triggers 30s cooldown
    const s3 = recordFailedAttempt('test_scope');
    expect(s3.isLocked).toBe(true);
    expect(s3.lockRemainingSeconds).toBeGreaterThan(0);
    expect(s3.lockRemainingSeconds).toBeLessThanOrEqual(30);
  });

  it('triggers 5-minute penalty after 5 failed attempts', () => {
    recordFailedAttempt('test_scope');
    recordFailedAttempt('test_scope');
    recordFailedAttempt('test_scope');
    recordFailedAttempt('test_scope');
    const s5 = recordFailedAttempt('test_scope');

    expect(s5.isLocked).toBe(true);
    expect(s5.lockRemainingSeconds).toBeGreaterThan(200);
    expect(s5.lockRemainingSeconds).toBeLessThanOrEqual(300);
  });

  it('resets attempts after successful authorization', () => {
    recordFailedAttempt('test_scope');
    recordFailedAttempt('test_scope');
    resetRateLimit('test_scope');

    const fresh = checkRateLimit('test_scope');
    expect(fresh.isLocked).toBe(false);
    expect(fresh.attemptsLeft).toBe(5);
  });
});
