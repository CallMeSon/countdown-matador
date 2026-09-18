'use client';

import { useCallback, useEffect, useState } from 'react';
import { normalizeRoomCode } from '@/lib/room-code';

const LAST_ROOM_KEY = 'matador-timer:last-room';

export interface RoomInfo {
  ready: boolean;
  room: string | null;
  lastUsedRoom: string | null;
  setRoom: (code: string) => void;
}

export function useRoom(): RoomInfo {
  const [ready, setReady] = useState(false);
  const [room, setRoomState] = useState<string | null>(null);
  const [lastUsedRoom, setLastUsedRoom] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = normalizeRoomCode(new URLSearchParams(window.location.search).get('room') ?? '');
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LAST_ROOM_KEY);
    } catch {
      // localStorage tidak tersedia (private mode dsb) — abaikan
    }
    setLastUsedRoom(stored);
    if (fromUrl) setRoomState(fromUrl);
    setReady(true);
  }, []);

  const setRoom = useCallback((code: string) => {
    const normalized = normalizeRoomCode(code);
    if (!normalized) return;
    setRoomState(normalized);
    setLastUsedRoom(normalized);
    const url = `${window.location.pathname}?room=${normalized}`;
    window.history.replaceState(null, '', url);
    try {
      localStorage.setItem(LAST_ROOM_KEY, normalized);
    } catch {
      // localStorage tidak tersedia — abaikan
    }
  }, []);

  return { ready, room, lastUsedRoom, setRoom };
}
