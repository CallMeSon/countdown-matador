import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSessionRegistry,
  createSession,
  getSessionById,
  getSessionByPin,
  getSessionByToken,
  updateSession,
  regenerateSessionToken,
  deleteSession,
} from '@/lib/session-registry';

describe('Session Registry & Multi-Room PIN Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads default sessions when storage is empty', () => {
    const sessions = getSessionRegistry();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.find((s) => s.id === 'stage-1')).toBeDefined();
    expect(sessions.find((s) => s.id === 'stage-2')).toBeDefined();
  });

  it('creates a new session with custom PIN and slug', () => {
    const newSession = createSession({
      id: 'hall-c',
      title: 'Ruang Seminar C',
      pin: '9876',
      defaultDuration: 900,
    });

    expect(newSession.id).toBe('hall-c');
    expect(newSession.pin).toBe('9876');
    expect(newSession.title).toBe('Ruang Seminar C');

    const found = getSessionById('hall-c');
    expect(found).toBeDefined();
    expect(found?.pin).toBe('9876');
  });

  it('finds session by its unique PIN', () => {
    createSession({
      id: 'vip-stage',
      title: 'VIP Stage',
      pin: '3344',
    });

    const match = getSessionByPin('3344');
    expect(match).toBeDefined();
    expect(match?.id).toBe('vip-stage');
    expect(match?.title).toBe('VIP Stage');

    expect(getSessionByPin('0000')).toBeUndefined();
  });

  it('updates session PIN and title', () => {
    updateSession('stage-1', { pin: '7777', title: 'Panggung Utama Rebranded' });

    const updated = getSessionById('stage-1');
    expect(updated?.pin).toBe('7777');
    expect(updated?.title).toBe('Panggung Utama Rebranded');
  });

  it('gives every session a token, resolvable via getSessionByToken, and lets it be regenerated', () => {
    const created = createSession({ id: 'token-room', title: 'Token Room', pin: '4455' });
    expect(created.token).toBeTruthy();
    expect(getSessionByToken(created.token)?.id).toBe('token-room');

    const rotated = regenerateSessionToken('token-room');
    expect(rotated?.token).toBeTruthy();
    expect(rotated?.token).not.toBe(created.token);
    expect(getSessionByToken(created.token)).toBeUndefined(); // old token invalidated
    expect(getSessionByToken(rotated!.token)?.id).toBe('token-room');
  });

  it('deletes an existing session', () => {
    createSession({
      id: 'temp-session',
      title: 'Temporary Session',
      pin: '1122',
    });

    expect(getSessionById('temp-session')).toBeDefined();
    const deleted = deleteSession('temp-session');
    expect(deleted).toBe(true);
    expect(getSessionById('temp-session')).toBeUndefined();
  });
});
