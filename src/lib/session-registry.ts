'use client';

import { getSupabase } from './supabase';

export interface EventSession {
  id: string;              // unique slug e.g. "stage-1" or "hall-a" — used by /control?room=
  title: string;           // display name e.g. "Panggung Utama — Plenary Hall"
  pin: string;             // session PIN e.g. "1234"
  token: string;           // opaque id for /timer/<token> — keeps the room id out of the display URL
  defaultDuration?: number;// default duration in seconds (e.g. 900 for 15m)
  createdAt: number;
  lastActiveAt: number;
}

const REGISTRY_STORAGE_KEY = 'matador_session_registry';

function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return (Math.random().toString(36) + Math.random().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 12);
}

const DEFAULT_SESSIONS: EventSession[] = [
  {
    id: 'stage-1',
    title: 'Panggung Utama (Main Stage)',
    pin: '1234',
    token: 'a1x9k3m7q2z5',
    defaultDuration: 300,
    createdAt: 1700000000000,
    lastActiveAt: 1700000000000,
  },
  {
    id: 'stage-2',
    title: 'Ruang Workshop & Breakout',
    pin: '5678',
    token: 'b8y2j6n0p4w1',
    defaultDuration: 600,
    createdAt: 1700000000000,
    lastActiveAt: 1700000000000,
  },
];

let inMemorySessions: EventSession[] = DEFAULT_SESSIONS;

// Synchronous local getter (cached)
export function getSessionRegistry(): EventSession[] {
  if (typeof window === 'undefined') return inMemorySessions;
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(inMemorySessions));
      return inMemorySessions;
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) {
      // Backfill token for sessions saved before this field existed.
      const backfilled: EventSession[] = data.map((s: EventSession) => (s.token ? s : { ...s, token: generateToken() }));
      inMemorySessions = backfilled;
      if (backfilled.some((s, i) => s.token !== data[i].token)) {
        localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(backfilled));
      }
      return backfilled;
    }
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(inMemorySessions));
    return inMemorySessions;
  } catch {
    return inMemorySessions;
  }
}

// Asynchronously fetch sessions from Supabase Database
export async function fetchRemoteSessions(): Promise<EventSession[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return getSessionRegistry();
    }

    // Reuse whatever token this device already has cached for a session before
    // minting a new random one — without the `token` column on the remote
    // table, every fetch would otherwise hand out a different token and
    // silently break any link generated moments earlier.
    const cachedById = new Map(getSessionRegistry().map((s) => [s.id, s.token]));
    const mapped: EventSession[] = data.map((row) => ({
      id: row.id,
      title: row.title,
      pin: row.pin,
      token: row.token || cachedById.get(row.id) || generateToken(),
      defaultDuration: row.default_duration,
      createdAt: Number(row.created_at),
      lastActiveAt: Number(row.last_active_at),
    }));

    // Backfill the `token` column for rows saved before it existed. If the
    // column itself hasn't been added on the Supabase side yet, this write
    // fails silently — the app still works from the local/generated token.
    mapped.forEach((s, i) => {
      if (!data[i].token) {
        Promise.resolve(supabase.from('sessions').update({ token: s.token }).eq('id', s.id)).catch(() => {});
      }
    });

    saveSessionRegistry(mapped, true);
    return mapped;
  } catch {
    return getSessionRegistry();
  }
}

export function saveSessionRegistry(sessions: EventSession[], notify = true): void {
  inMemorySessions = sessions;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(sessions));
    if (notify) {
      window.dispatchEvent(new CustomEvent('matador_sessions_updated', { detail: sessions }));
    }
  } catch (e) {
    console.error('Failed to save session registry:', e);
  }
}

export function getSessionById(id: string): EventSession | undefined {
  const cleanId = (id || '').trim().toLowerCase();
  const list = getSessionRegistry();
  return list.find((s) => s.id.toLowerCase() === cleanId);
}

export function getSessionByPin(pin: string): EventSession | undefined {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) return undefined;
  const list = getSessionRegistry();
  return list.find((s) => s.pin === cleanPin);
}

export function getSessionByToken(token: string): EventSession | undefined {
  const cleanToken = (token || '').trim();
  if (!cleanToken) return undefined;
  const list = getSessionRegistry();
  return list.find((s) => s.token === cleanToken);
}

export function isPinTaken(pin: string, excludeSessionId?: string): { taken: boolean; existingSession?: EventSession } {
  const cleanPin = (pin || '').trim();
  if (!cleanPin) return { taken: false };
  const list = getSessionRegistry();
  const found = list.find((s) => s.pin === cleanPin && s.id !== excludeSessionId);
  return { taken: !!found, existingSession: found };
}

export function createSession(data: { id: string; title: string; pin: string; defaultDuration?: number }): EventSession {
  const list = getSessionRegistry();
  const cleanId = data.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || `sesi-${Date.now().toString(36)}`;
  const cleanPin = data.pin.trim() || '1234';
  const title = data.title.trim() || `Sesi ${cleanId.toUpperCase()}`;

  const existingIdx = list.findIndex((s) => s.id === cleanId);
  const newSession: EventSession = {
    id: cleanId,
    title,
    pin: cleanPin,
    token: existingIdx >= 0 ? (list[existingIdx].token || generateToken()) : generateToken(),
    defaultDuration: data.defaultDuration || 300,
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : Date.now(),
    lastActiveAt: Date.now(),
  };

  if (existingIdx >= 0) {
    list[existingIdx] = newSession;
  } else {
    list.push(newSession);
  }

  saveSessionRegistry(list);

  // Async persist to Supabase PostgreSQL DB
  if (typeof window !== 'undefined') {
    const supabase = getSupabase();
    Promise.resolve(
      supabase
        .from('sessions')
        .upsert({
          id: newSession.id,
          title: newSession.title,
          pin: newSession.pin,
          token: newSession.token,
          default_duration: newSession.defaultDuration,
          created_at: newSession.createdAt,
          last_active_at: newSession.lastActiveAt,
        })
    ).catch((e) => console.error('Supabase createSession error:', e));
  }

  return newSession;
}

export function updateSession(id: string, updates: Partial<Omit<EventSession, 'id' | 'createdAt'>>): EventSession | null {
  const list = getSessionRegistry();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  list[idx] = {
    ...list[idx],
    ...updates,
    lastActiveAt: Date.now(),
  };

  saveSessionRegistry(list);

  // Async persist to Supabase PostgreSQL DB
  if (typeof window !== 'undefined') {
    const supabase = getSupabase();
    const updated = list[idx];
    Promise.resolve(
      supabase
        .from('sessions')
        .update({
          title: updated.title,
          pin: updated.pin,
          token: updated.token,
          default_duration: updated.defaultDuration,
          last_active_at: updated.lastActiveAt,
        })
        .eq('id', id)
    ).catch((e) => console.error('Supabase updateSession error:', e));
  }

  return list[idx];
}

// Rotates a session's display token — invalidates any bookmarked /timer/<token>
// link without touching its PIN or /control access.
export function regenerateSessionToken(id: string): EventSession | null {
  return updateSession(id, { token: generateToken() });
}

export function deleteSession(id: string): boolean {
  const list = getSessionRegistry();
  const filtered = list.filter((s) => s.id !== id);
  if (filtered.length === list.length) return false;
  saveSessionRegistry(filtered);

  // Async delete from Supabase PostgreSQL DB
  if (typeof window !== 'undefined') {
    const supabase = getSupabase();
    Promise.resolve(
      supabase
        .from('sessions')
        .delete()
        .eq('id', id)
    ).catch((e) => console.error('Supabase deleteSession error:', e));
  }

  return true;
}
