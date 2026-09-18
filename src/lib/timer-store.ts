'use client';

import { TimerState, DEFAULT_TIMER_STATE } from '@/types/timer';
import { mergeIncomingState, sanitizeImageUrl } from '@/lib/appearance';

type Message =
  | { type: 'STATE'; state: TimerState }
  | { type: 'REQUEST_STATE' };

type Listener = (state: TimerState) => void;

const MAX_BACKOFF_MS = 10000;
const BASE_BACKOFF_MS = 1000;

class TimerStore {
  private state: TimerState = DEFAULT_TIMER_STATE;
  private listeners = new Set<Listener>();
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private room: string | null = null;
  private epoch = 0;

  setRoom(room: string): void {
    if (room === this.room) return;
    this.epoch += 1;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.room = room;
    this.reconnectAttempts = 0;
    // Jangan nampilin countdown room lama pas transisi ke room baru
    this.setState(DEFAULT_TIMER_STATE, false);
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      this.connect();
    }
  }

  private wsUrl(): string {
    const override = process.env.NEXT_PUBLIC_WS_URL;
    const base = override
      ?? `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${typeof window !== 'undefined' ? window.location.host : ''}/ws`;
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}room=${encodeURIComponent(this.room ?? '')}`;
  }

  private connect(): void {
    const myEpoch = this.epoch;
    const socket = new WebSocket(this.wsUrl());
    this.socket = socket;

    socket.onopen = () => {
      if (myEpoch !== this.epoch) return;
      this.reconnectAttempts = 0;
      // Baru connect/reconnect, minta state terbaru
      socket.send(JSON.stringify({ type: 'REQUEST_STATE' } satisfies Message));
    };

    socket.onmessage = (e: MessageEvent<string>) => {
      if (myEpoch !== this.epoch) return;
      let msg: Message | null = null;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!msg) return;
      if (msg.type === 'STATE') {
        // Merge dgn default, bukan overwrite total — room lama yang persisted di
        // server sebelum field baru (mis. displayMode/stageMessage) ditambah ke
        // TimerState nggak akan punya field itu sama sekali (undefined, bukan
        // null), yang bisa bikin crash di consumer yang cek `!== null`.
        this.setState(mergeIncomingState(msg.state), false);
      } else if (msg.type === 'REQUEST_STATE') {
        this.broadcast();
      }
    };

    const scheduleReconnect = () => {
      if (myEpoch !== this.epoch) return;
      if (this.reconnectTimer) return;
      const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.reconnectAttempts, MAX_BACKOFF_MS);
      this.reconnectAttempts += 1;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (myEpoch === this.epoch) this.connect();
      }, delay);
    };

    socket.onclose = scheduleReconnect;
    socket.onerror = () => socket.close();
  }

  getState(): TimerState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => { this.listeners.delete(fn); };
  }

  setDuration(seconds: number): void {
    if (!this.room) return;
    this.setState(
      { ...this.state, status: 'idle', duration: Math.max(1, Math.floor(seconds)), startedAt: null, pausedRemaining: null },
      true,
    );
  }

  start(): void {
    if (!this.room) return;
    const now = Date.now();
    if (this.state.status === 'paused' && this.state.pausedRemaining !== null) {
      // Resume: startedAt digeser seolah-olah timer jalan sampai pausedRemaining
      const startedAt = now - (this.state.duration - this.state.pausedRemaining) * 1000;
      this.setState({ ...this.state, status: 'running', startedAt, pausedRemaining: null }, true);
      return;
    }
    if (this.state.status === 'idle') {
      this.setState({ ...this.state, status: 'running', startedAt: now, pausedRemaining: null }, true);
    }
  }

  pause(): void {
    if (!this.room) return;
    if (this.state.status !== 'running' && this.state.status !== 'overtime') return;
    const remaining = this.computeRemaining(this.state, Date.now());
    this.setState({ ...this.state, status: 'paused', pausedRemaining: remaining }, true);
  }

  reset(): void {
    if (!this.room) return;
    this.setState(
      { ...this.state, status: 'idle', duration: this.state.duration, startedAt: null, pausedRemaining: null },
      true,
    );
  }

  addSeconds(delta: number): void {
    if (!this.room) return;
    if (this.state.status === 'paused' && this.state.pausedRemaining !== null) {
      this.setState({ ...this.state, pausedRemaining: this.state.pausedRemaining + delta }, true);
      return;
    }
    this.setState({ ...this.state, duration: this.state.duration + delta }, true);
  }

  setDisplayMode(mode: TimerState['displayMode']): void {
    if (!this.room) return;
    if (this.state.displayMode === mode) return;
    this.setState({ ...this.state, displayMode: mode }, true);
  }

  setAppearance(patch: Partial<TimerState['appearance']>): void {
    if (!this.room) return;
    const nextPatch = { ...patch };
    if ('bgImage' in nextPatch) {
      // Validasi di titik masuk store, bukan cuma di UI, supaya caller mana pun
      // (termasuk patch dari peer) dapat jaminan URL yang sama.
      nextPatch.bgImage = sanitizeImageUrl(
        typeof nextPatch.bgImage === 'string' ? nextPatch.bgImage : '',
      );
    }
    this.setState(
      { ...this.state, appearance: { ...this.state.appearance, ...nextPatch } },
      true,
    );
  }

  sendStageMessage(text: string, showOnTimer: boolean): void {
    if (!this.room) return;
    const trimmed = text.trim().slice(0, 255);
    if (!trimmed) return;
    this.setState(
      { ...this.state, stageMessage: { text: trimmed, sentAt: Date.now(), showOnTimer } },
      true,
    );
  }

  hideStageMessage(): void {
    if (!this.room) return;
    if (this.state.stageMessage === null) return;
    this.setState({ ...this.state, stageMessage: null }, true);
  }

  computeRemaining(state: TimerState, now: number): number {
    if (state.status === 'idle') return state.duration;
    if (state.status === 'paused' && state.pausedRemaining !== null) return state.pausedRemaining;
    if (state.startedAt !== null) return state.duration - (now - state.startedAt) / 1000;
    return state.duration;
  }

  private setState(next: TimerState, broadcast: boolean): void {
    this.state = next;
    this.listeners.forEach((fn) => fn(next));
    if (broadcast) this.broadcast();
  }

  private broadcast(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'STATE', state: this.state } satisfies Message));
    }
  }
}

export const timerStore = new TimerStore();
