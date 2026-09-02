'use client';

export interface RateLimitState {
  attemptsLeft: number;
  isLocked: boolean;
  lockRemainingSeconds: number;
  totalFailedAttempts: number;
}

const STORAGE_KEY_PREFIX = 'matador_security_limiter_';
const MAX_INITIAL_ATTEMPTS = 5;

interface StoredLimitData {
  failedCount: number;
  lockedUntil: number; // timestamp in ms
}

function getStoredData(key: string): StoredLimitData {
  if (typeof window === 'undefined') {
    return { failedCount: 0, lockedUntil: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return { failedCount: 0, lockedUntil: 0 };
    return JSON.parse(raw);
  } catch {
    return { failedCount: 0, lockedUntil: 0 };
  }
}

function saveStoredData(key: string, data: StoredLimitData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch {}
}

export function checkRateLimit(scopeKey: string = 'global'): RateLimitState {
  const data = getStoredData(scopeKey);
  const now = Date.now();

  // If currently locked
  if (data.lockedUntil > now) {
    const diffSec = Math.ceil((data.lockedUntil - now) / 1000);
    return {
      attemptsLeft: 0,
      isLocked: true,
      lockRemainingSeconds: diffSec,
      totalFailedAttempts: data.failedCount,
    };
  }

  // Lock expired -> reset lockout timestamp, but keep progressive tier if recent
  const attemptsLeft = Math.max(0, MAX_INITIAL_ATTEMPTS - (data.failedCount % MAX_INITIAL_ATTEMPTS));

  return {
    attemptsLeft: attemptsLeft === 0 ? MAX_INITIAL_ATTEMPTS : attemptsLeft,
    isLocked: false,
    lockRemainingSeconds: 0,
    totalFailedAttempts: data.failedCount,
  };
}

export function recordFailedAttempt(scopeKey: string = 'global'): RateLimitState {
  const data = getStoredData(scopeKey);
  data.failedCount += 1;
  const now = Date.now();

  // Progressive cooldown penalties:
  // 3 failed: 30s
  // 5 failed: 5 minutes (300s)
  // 8+ failed: 15 minutes (900s)
  let lockDurationMs = 0;

  if (data.failedCount >= 8) {
    lockDurationMs = 15 * 60 * 1000; // 15 mins
  } else if (data.failedCount >= 5) {
    lockDurationMs = 5 * 60 * 1000; // 5 mins
  } else if (data.failedCount >= 3) {
    lockDurationMs = 30 * 1000; // 30 seconds
  }

  if (lockDurationMs > 0) {
    data.lockedUntil = now + lockDurationMs;
  }

  saveStoredData(scopeKey, data);
  return checkRateLimit(scopeKey);
}

export function resetRateLimit(scopeKey: string = 'global'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + scopeKey);
  } catch {}
}
