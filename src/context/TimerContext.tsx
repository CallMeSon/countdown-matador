'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  TimerState,
  DisplayConfig,
  AudioConfig,
  RoomConfig,
  SyncState,
  SyncMessage,
  TimerMode,
  CueType,
  DEFAULT_TIMER_STATE,
  DEFAULT_DISPLAY_CONFIG,
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_ROOM_CONFIG,
  EventLogEntry,
} from '@/types/timer';
import { getSyncChannel, SyncChannel } from '@/lib/sync-channel';
import { getSessionById } from '@/lib/session-registry';

// ============================================================
// State
// ============================================================

export interface AppState {
  timer: TimerState;
  display: DisplayConfig;
  audio: AudioConfig;
  room: RoomConfig;
  activeCue: CueType;
  quickMessage: string | null;
  quickMessageExpiry: number | null;
  preStartRemaining: number | null; // 3..2..1..0
  isAdmin: boolean;
  syncConnected: boolean;
  connectedDisplays: number;
  eventLog: EventLogEntry[];
  operatorNotes: string;
}

const initialState: AppState = {
  timer: DEFAULT_TIMER_STATE,
  display: DEFAULT_DISPLAY_CONFIG,
  audio: DEFAULT_AUDIO_CONFIG,
  room: DEFAULT_ROOM_CONFIG,
  activeCue: null,
  quickMessage: null,
  quickMessageExpiry: null,
  preStartRemaining: null,
  isAdmin: false,
  syncConnected: true,
  connectedDisplays: 0,
  eventLog: [],
  operatorNotes: '',
};

// ============================================================
// Actions
// ============================================================

type AppAction =
  | { type: 'SET_TIMER_STATE'; payload: Partial<TimerState> }
  | { type: 'TIMER_RESET' }
  | { type: 'TIMER_SET_DURATION'; payload: number }
  | { type: 'TIMER_SET_MODE'; payload: TimerMode }
  | { type: 'TIMER_SET_COUNTDOWN_TARGET'; payload: string }
  | { type: 'TIMER_SET_SESSION_LABEL'; payload: string }
  | { type: 'TIMER_SET_OVERTIME'; payload: boolean }
  | { type: 'SET_DISPLAY_CONFIG'; payload: Partial<DisplayConfig> }
  | { type: 'SET_AUDIO_CONFIG'; payload: Partial<AudioConfig> }
  | { type: 'SET_ROOM_ID'; payload: string }
  | { type: 'SET_ADMIN_PIN'; payload: string }
  | { type: 'SET_ADMIN_UNLOCKED'; payload: boolean }
  | { type: 'SET_PEERS_COUNT'; payload: number }
  | { type: 'SET_CUE'; payload: CueType }
  | { type: 'SET_QUICK_MESSAGE'; payload: { text: string; expiry: number } | null }
  | { type: 'SET_PRE_START'; payload: number | null }
  | { type: 'FULL_SYNC'; payload: Partial<AppState> }
  | { type: 'SET_IS_ADMIN'; payload: boolean }
  | { type: 'SET_SYNC_CONNECTED'; payload: boolean }
  | { type: 'ADD_LOG'; payload: EventLogEntry }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_OPERATOR_NOTES'; payload: string };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TIMER_STATE':
      return { ...state, timer: { ...state.timer, ...action.payload } };

    case 'TIMER_RESET':
      return {
        ...state,
        preStartRemaining: null,
        timer: {
          ...state.timer,
          status: 'idle',
          startedAt: null,
          pausedRemaining: null,
          isOvertime: false,
        },
      };

    case 'TIMER_SET_DURATION':
      return {
        ...state,
        preStartRemaining: null,
        timer: {
          ...state.timer,
          totalDuration: action.payload,
          status: 'idle',
          startedAt: null,
          pausedRemaining: null,
          isOvertime: false,
        },
      };

    case 'TIMER_SET_MODE':
      return {
        ...state,
        preStartRemaining: null,
        timer: {
          ...state.timer,
          mode: action.payload,
          status: 'idle',
          startedAt: null,
          pausedRemaining: null,
          isOvertime: false,
        },
      };

    case 'TIMER_SET_COUNTDOWN_TARGET':
      return {
        ...state,
        timer: { ...state.timer, countdownTarget: action.payload },
      };

    case 'TIMER_SET_SESSION_LABEL':
      return {
        ...state,
        timer: { ...state.timer, sessionLabel: action.payload },
      };

    case 'TIMER_SET_OVERTIME':
      return {
        ...state,
        timer: { ...state.timer, isOvertime: action.payload, status: action.payload ? 'overtime' : state.timer.status },
      };

    case 'SET_DISPLAY_CONFIG':
      return {
        ...state,
        display: { ...state.display, ...action.payload },
      };

    case 'SET_AUDIO_CONFIG':
      return {
        ...state,
        audio: { ...state.audio, ...action.payload },
      };

    case 'SET_ROOM_ID':
      return {
        ...state,
        room: { ...state.room, roomId: action.payload },
      };

    case 'SET_ADMIN_PIN':
      return {
        ...state,
        room: { ...state.room, adminPin: action.payload },
      };

    case 'SET_ADMIN_UNLOCKED':
      return {
        ...state,
        room: { ...state.room, isUnlocked: action.payload },
      };

    case 'SET_PEERS_COUNT':
      return {
        ...state,
        connectedDisplays: action.payload,
        room: { ...state.room, connectedPeersCount: action.payload },
      };

    case 'SET_CUE':
      return { ...state, activeCue: action.payload };

    case 'SET_QUICK_MESSAGE':
      return {
        ...state,
        quickMessage: action.payload?.text ?? null,
        quickMessageExpiry: action.payload?.expiry ?? null,
      };

    case 'SET_PRE_START':
      return {
        ...state,
        preStartRemaining: action.payload,
      };

    case 'FULL_SYNC':
      return {
        ...state,
        ...(action.payload.timer && { timer: { ...state.timer, ...action.payload.timer } }),
        ...(action.payload.display && { display: { ...state.display, ...action.payload.display } }),
        ...(action.payload.audio && { audio: { ...state.audio, ...action.payload.audio } }),
        ...(action.payload.activeCue !== undefined && { activeCue: action.payload.activeCue }),
        ...(action.payload.quickMessage !== undefined && { quickMessage: action.payload.quickMessage }),
        ...(action.payload.preStartRemaining !== undefined && { preStartRemaining: action.payload.preStartRemaining }),
      };

    case 'SET_IS_ADMIN':
      return { ...state, isAdmin: action.payload };

    case 'SET_SYNC_CONNECTED':
      return { ...state, syncConnected: action.payload };

    case 'ADD_LOG':
      return { ...state, eventLog: [...state.eventLog, action.payload] };

    case 'CLEAR_LOG':
      return { ...state, eventLog: [] };

    case 'SET_OPERATOR_NOTES':
      return { ...state, operatorNotes: action.payload };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  startTimer: () => void;
  pauseTimer: (remaining: number) => void;
  resetTimer: () => void;
  setDuration: (seconds: number) => void;
  setMode: (mode: TimerMode) => void;
  setSessionLabel: (label: string) => void;
  setCountdownTarget: (target: string) => void;
  updateDisplayConfig: (config: Partial<DisplayConfig>) => void;
  updateAudioConfig: (config: Partial<AudioConfig>) => void;
  setRoomId: (roomId: string) => void;
  setAdminPin: (pin: string) => void;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  sendCue: (cue: CueType) => void;
  sendQuickMessage: (text: string, durationSec: number) => void;
  addLog: (message: string, type?: EventLogEntry['type']) => void;
  broadcastState: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function AppProvider({
  children,
  isAdmin = false,
  initialRoomId,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  // Room id resolved outside the URL (e.g. /timer/<token> looked up by token).
  // Overrides whatever loadPersistedState() derived from ?room= or localStorage.
  initialRoomId?: string;
}) {
  const loadedState = loadPersistedState();
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    ...loadedState,
    ...(initialRoomId ? { room: { ...initialState.room, ...loadedState.room, roomId: initialRoomId } } : {}),
    isAdmin,
  });
  
  const stateRef = useRef(state);
  stateRef.current = state;
  const channelRef = useRef<SyncChannel | null>(null);
  const preStartTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and track Room from URL params or saved config
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.trim()) {
      dispatch({ type: 'SET_ROOM_ID', payload: roomParam.trim().toLowerCase() });
    }
  }, []);

  // Broadcast state to other tabs & remote laptops (ONLY ADMIN CAN BROADCAST)
  const broadcastState = useCallback(() => {
    if (!stateRef.current.isAdmin) return; // Prevent Display from broadcasting!
    if (!channelRef.current) return;
    const s = stateRef.current;
    const msg: SyncMessage = {
      type: 'STATE_UPDATE',
      payload: {
        timer: s.timer,
        display: s.display,
        audio: s.audio,
        activeCue: s.activeCue,
        quickMessage: s.quickMessage,
        quickMessageExpiry: s.quickMessageExpiry,
        preStartRemaining: s.preStartRemaining,
        roomId: s.room.roomId,
      } as SyncState,
      timestamp: Date.now(),
      source: 'admin',
      roomId: s.room.roomId,
    };
    channelRef.current.postMessage(msg);

    // Also persist snapshot to Supabase PostgreSQL DB
    const supabaseSync = channelRef.current.getSupabaseSync();
    if (supabaseSync) {
      supabaseSync.saveRoomState({
        timer: s.timer,
        display: s.display,
        audio: s.audio,
        operatorNotes: s.operatorNotes,
        activeCue: s.activeCue,
        quickMessage: s.quickMessage,
      });
    }
  }, []);

  // Update sync channel when room or role changes
  useEffect(() => {
    const activeRoom = state.room.roomId || 'stage-1';
    const ch = getSyncChannel(activeRoom, isAdmin);
    channelRef.current = ch;

    // Fetch initial state from Supabase DB on startup or room switch
    const supabaseSync = ch.getSupabaseSync();
    if (supabaseSync) {
      supabaseSync.fetchRoomState().then((savedState) => {
        if (savedState) {
          if (savedState.timer && (!stateRef.current.timer.startedAt || stateRef.current.timer.status === 'idle')) {
            dispatch({
              type: 'FULL_SYNC',
              payload: {
                timer: savedState.timer,
                display: savedState.display || stateRef.current.display,
                audio: savedState.audio || stateRef.current.audio,
                activeCue: savedState.activeCue || null,
                quickMessage: savedState.quickMessage || null,
                room: { ...stateRef.current.room, roomId: activeRoom },
              },
            });
          }
        }
      });
    }

    const unsubMsg = ch.onMessage((msg: SyncMessage) => {
      switch (msg.type) {
        case 'STATE_UPDATE': {
          // If admin receives echo from display, ignore it
          if (msg.source === 'display' && stateRef.current.isAdmin) return;
          const payload = msg.payload as SyncState;
          dispatch({ type: 'FULL_SYNC', payload });
          break;
        }
        case 'REQUEST_SYNC': {
          if (stateRef.current.isAdmin) {
            broadcastState();
          }
          break;
        }
        case 'STATE_SYNC_RESPONSE': {
          if (msg.source === 'display' && stateRef.current.isAdmin) return;
          const payload = msg.payload as SyncState;
          dispatch({ type: 'FULL_SYNC', payload });
          break;
        }
        case 'CUE_SIGNAL': {
          const cue = msg.payload as CueType;
          dispatch({ type: 'SET_CUE', payload: cue });
          if (cue) {
            setTimeout(() => dispatch({ type: 'SET_CUE', payload: null }), 3000);
          }
          break;
        }
        case 'QUICK_MESSAGE': {
          const qm = msg.payload as { text: string; expiry: number } | null;
          dispatch({ type: 'SET_QUICK_MESSAGE', payload: qm });
          break;
        }
        case 'PRE_START_TICK': {
          const val = msg.payload as number | null;
          dispatch({ type: 'SET_PRE_START', payload: val });
          break;
        }
      }
    });

    const unsubPeers = ch.onPeersCountChange((count: number) => {
      dispatch({ type: 'SET_PEERS_COUNT', payload: count });
    });

    if (!isAdmin) {
      const syncMsg: SyncMessage = {
        type: 'REQUEST_SYNC',
        payload: null,
        timestamp: Date.now(),
        source: 'display',
        roomId: activeRoom,
      };
      ch.postMessage(syncMsg);
    }

    return () => {
      unsubMsg();
      unsubPeers();
    };
  }, [state.room.roomId, isAdmin, broadcastState]);

  // Periodic Admin Heartbeat when timer is running (ensures remote displays never stall)
  useEffect(() => {
    if (!isAdmin) return;
    const isRunning = state.timer.status === 'running' || state.timer.status === 'overtime';
    if (isRunning) {
      const interval = setInterval(() => {
        broadcastState();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, state.timer.status, broadcastState]);

  // Persist state to localStorage on changes
  useEffect(() => {
    persistState(state);
  }, [state.timer, state.display, state.audio, state.room.roomId, state.room.adminPin, state.operatorNotes]);

  // Execute actual timer running
  const executeStart = useCallback(() => {
    const s = stateRef.current;
    const now = Date.now();
    // Stopwatch counts up: pausedRemaining holds elapsed seconds, not remaining.
    const isStopwatch = s.timer.mode === 'stopwatch';
    const remaining = s.timer.pausedRemaining ?? (isStopwatch ? 0 : s.timer.totalDuration);
    const elapsed = isStopwatch ? remaining : s.timer.totalDuration - remaining;
    const effectiveStart = now - elapsed * 1000;
    const isOvertime = !isStopwatch && remaining < 0;
    
    dispatch({
      type: 'SET_TIMER_STATE',
      payload: {
        status: isOvertime ? 'overtime' : 'running',
        startedAt: effectiveStart,
        pausedRemaining: null,
        isOvertime,
      },
    });
    
    dispatch({ type: 'SET_PRE_START', payload: null });
    setTimeout(() => broadcastState(), 0);
    addLog(isOvertime ? 'Timer RESUMED (Overtime)' : 'Timer STARTED', 'action');
  }, [broadcastState]);

  // Helper functions
  const startTimer = useCallback(() => {
    const s = stateRef.current;

    // Check if pre-start countdown is enabled and timer was idle
    if (s.audio.preStartCountdownEnabled && s.timer.status === 'idle' && s.timer.mode === 'countdown') {
      if (preStartTimerRef.current) clearInterval(preStartTimerRef.current);
      
      let count = s.audio.preStartCountdownDuration || 3;
      dispatch({ type: 'SET_PRE_START', payload: count });
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'PRE_START_TICK',
          payload: count,
          timestamp: Date.now(),
          source: 'admin',
          roomId: s.room.roomId,
        });
      }

      preStartTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          dispatch({ type: 'SET_PRE_START', payload: count });
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: 'PRE_START_TICK',
              payload: count,
              timestamp: Date.now(),
              source: 'admin',
              roomId: s.room.roomId,
            });
          }
        } else if (count === 0) {
          dispatch({ type: 'SET_PRE_START', payload: 0 }); // 0 = GO!
          if (channelRef.current) {
            channelRef.current.postMessage({
              type: 'PRE_START_TICK',
              payload: 0,
              timestamp: Date.now(),
              source: 'admin',
              roomId: s.room.roomId,
            });
          }
        } else {
          if (preStartTimerRef.current) clearInterval(preStartTimerRef.current);
          preStartTimerRef.current = null;
          executeStart();
        }
      }, 1000);
      return;
    }

    executeStart();
  }, [executeStart]);

  const pauseTimer = useCallback((remaining: number) => {
    if (preStartTimerRef.current) {
      clearInterval(preStartTimerRef.current);
      preStartTimerRef.current = null;
    }
    dispatch({ type: 'SET_PRE_START', payload: null });
    dispatch({
      type: 'SET_TIMER_STATE',
      payload: {
        status: 'paused',
        startedAt: null,
        pausedRemaining: remaining,
      },
    });
    setTimeout(() => broadcastState(), 0);
    addLog(`Timer PAUSED at ${formatSecondsToDisplay(remaining)}`, 'action');
  }, [broadcastState]);

  const resetTimer = useCallback(() => {
    if (preStartTimerRef.current) {
      clearInterval(preStartTimerRef.current);
      preStartTimerRef.current = null;
    }
    dispatch({ type: 'SET_PRE_START', payload: null });
    dispatch({ type: 'TIMER_RESET' });
    setTimeout(() => broadcastState(), 0);
    addLog('Timer RESET', 'action');
  }, [broadcastState]);

  const setDuration = useCallback((seconds: number) => {
    if (preStartTimerRef.current) {
      clearInterval(preStartTimerRef.current);
      preStartTimerRef.current = null;
    }
    dispatch({ type: 'SET_PRE_START', payload: null });
    dispatch({ type: 'TIMER_SET_DURATION', payload: seconds });
    setTimeout(() => broadcastState(), 0);
    addLog(`Duration set to ${formatSecondsToDisplay(seconds)}`, 'action');
  }, [broadcastState]);

  const setMode = useCallback((mode: TimerMode) => {
    if (preStartTimerRef.current) {
      clearInterval(preStartTimerRef.current);
      preStartTimerRef.current = null;
    }
    dispatch({ type: 'SET_PRE_START', payload: null });
    dispatch({ type: 'TIMER_SET_MODE', payload: mode });
    setTimeout(() => broadcastState(), 0);
    addLog(`Mode changed to ${mode}`, 'action');
  }, [broadcastState]);

  const setSessionLabel = useCallback((label: string) => {
    dispatch({ type: 'TIMER_SET_SESSION_LABEL', payload: label });
    setTimeout(() => broadcastState(), 0);
  }, [broadcastState]);

  const setCountdownTarget = useCallback((target: string) => {
    dispatch({ type: 'TIMER_SET_COUNTDOWN_TARGET', payload: target });
    setTimeout(() => broadcastState(), 0);
    addLog(`Countdown target set to ${target}`, 'action');
  }, [broadcastState]);

  const updateDisplayConfig = useCallback((config: Partial<DisplayConfig>) => {
    dispatch({ type: 'SET_DISPLAY_CONFIG', payload: config });
    setTimeout(() => broadcastState(), 0);
  }, [broadcastState]);

  const updateAudioConfig = useCallback((config: Partial<AudioConfig>) => {
    dispatch({ type: 'SET_AUDIO_CONFIG', payload: config });
    setTimeout(() => broadcastState(), 0);
  }, [broadcastState]);

  const setRoomId = useCallback((roomId: string) => {
    const clean = (roomId || 'stage-1').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    dispatch({ type: 'SET_ROOM_ID', payload: clean });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', clean);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const setAdminPin = useCallback((pin: string) => {
    const clean = pin.trim() || '1234';
    dispatch({ type: 'SET_ADMIN_PIN', payload: clean });
    addLog(`Admin PIN changed`, 'info');
  }, []);

  const unlockAdmin = useCallback((pin: string): boolean => {
    const s = stateRef.current;
    const cleanPin = pin.trim();

    // 1. Check session registry for this specific room
    const session = getSessionById(s.room.roomId);
    if (session && cleanPin === session.pin) {
      dispatch({ type: 'SET_ADMIN_UNLOCKED', payload: true });
      try {
        sessionStorage.setItem(`matador_admin_unlocked_${s.room.roomId}`, 'true');
      } catch {}
      return true;
    }

    // 2. Fallback to room adminPin
    if (cleanPin === (s.room.adminPin || '1234')) {
      dispatch({ type: 'SET_ADMIN_UNLOCKED', payload: true });
      try {
        sessionStorage.setItem(`matador_admin_unlocked_${s.room.roomId}`, 'true');
      } catch {}
      return true;
    }
    return false;
  }, []);

  const lockAdmin = useCallback(() => {
    const s = stateRef.current;
    dispatch({ type: 'SET_ADMIN_UNLOCKED', payload: false });
    try {
      sessionStorage.removeItem(`matador_admin_unlocked_${s.room.roomId}`);
      sessionStorage.removeItem('matador_admin_unlocked');
    } catch {}
  }, []);

  const sendCue = useCallback((cue: CueType) => {
    dispatch({ type: 'SET_CUE', payload: cue });
    if (channelRef.current) {
      const msg: SyncMessage = {
        type: 'CUE_SIGNAL',
        payload: cue,
        timestamp: Date.now(),
        source: 'admin',
        roomId: stateRef.current.room.roomId,
      };
      channelRef.current.postMessage(msg);
    }
    if (cue) {
      addLog(`Cue sent: ${cue.toUpperCase()}`, 'action');
      setTimeout(() => dispatch({ type: 'SET_CUE', payload: null }), 3000);
    }
  }, []);

  const sendQuickMessage = useCallback((text: string, durationSec: number) => {
    const expiry = Date.now() + durationSec * 1000;
    const payload = { text, expiry };
    dispatch({ type: 'SET_QUICK_MESSAGE', payload });
    if (channelRef.current) {
      const msg: SyncMessage = {
        type: 'QUICK_MESSAGE',
        payload,
        timestamp: Date.now(),
        source: 'admin',
        roomId: stateRef.current.room.roomId,
      };
      channelRef.current.postMessage(msg);
    }
    addLog(`Quick message: "${text}"`, 'action');
    setTimeout(() => {
      dispatch({ type: 'SET_QUICK_MESSAGE', payload: null });
      if (channelRef.current) {
        const clearMsg: SyncMessage = {
          type: 'QUICK_MESSAGE',
          payload: null,
          timestamp: Date.now(),
          source: 'admin',
          roomId: stateRef.current.room.roomId,
        };
        channelRef.current.postMessage(clearMsg);
      }
    }, durationSec * 1000);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function addLog(message: string, type: EventLogEntry['type'] = 'info') {
    const entry: EventLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      message,
      type,
    };
    dispatch({ type: 'ADD_LOG', payload: entry });
  }

  const value: AppContextValue = {
    state,
    dispatch,
    startTimer,
    pauseTimer,
    resetTimer,
    setDuration,
    setMode,
    setSessionLabel,
    setCountdownTarget,
    updateDisplayConfig,
    updateAudioConfig,
    setRoomId,
    setAdminPin,
    unlockAdmin,
    lockAdmin,
    sendCue,
    sendQuickMessage,
    addLog,
    broadcastState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ============================================================
// Persistence helpers
// ============================================================

const STORAGE_KEY = 'matador_timer_config';

function persistState(state: AppState) {
  try {
    const data = {
      timer: state.timer,
      display: state.display,
      audio: state.audio,
      room: {
        roomId: state.room.roomId,
        adminPin: state.room.adminPin,
      },
      operatorNotes: state.operatorNotes,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function loadPersistedState(): Partial<AppState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const urlParams = new URLSearchParams(window.location.search);
    const activeRoom = (urlParams.get('room') || 'stage-1').trim().toLowerCase();
    const sessionUnlocked = 
      sessionStorage.getItem(`matador_admin_unlocked_${activeRoom}`) === 'true' ||
      sessionStorage.getItem('matador_admin_unlocked') === 'true';

    if (!raw) return { room: { ...DEFAULT_ROOM_CONFIG, roomId: activeRoom, isUnlocked: sessionUnlocked } };
    const data = JSON.parse(raw);
    return {
      timer: data.timer ? { ...DEFAULT_TIMER_STATE, ...data.timer } : DEFAULT_TIMER_STATE,
      display: { ...DEFAULT_DISPLAY_CONFIG, ...data.display },
      audio: { ...DEFAULT_AUDIO_CONFIG, ...data.audio },
      room: { ...DEFAULT_ROOM_CONFIG, ...data.room, roomId: activeRoom || data.room?.roomId || 'stage-1', isUnlocked: sessionUnlocked },
      operatorNotes: data.operatorNotes || '',
    };
  } catch {
    return {};
  }
}

function formatSecondsToDisplay(totalSeconds: number): string {
  const isNeg = totalSeconds < 0;
  const absSeconds = Math.abs(Math.floor(totalSeconds));
  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = absSeconds % 60;
  const prefix = isNeg ? '-' : '';
  if (h > 0) {
    return `${prefix}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${prefix}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
