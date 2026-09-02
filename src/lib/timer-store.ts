'use client';

import { CHANNEL_NAME, TimerState, DEFAULT_TIMER_STATE } from '@/types/timer';

type Message =
  | { type: 'STATE'; state: TimerState }
  | { type: 'REQUEST_STATE' };

type Listener = (state: TimerState) => void;

class TimerStore {
  private state: TimerState = DEFAULT_TIMER_STATE;
  private listeners = new Set<Listener>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (e: MessageEvent<Message>) => {
        const msg = e.data;
        if (!msg) return;
        if (msg.type === 'STATE') {
          this.setState(msg.state, false);
        } else if (msg.type === 'REQUEST_STATE') {
          this.broadcast();
        }
      };
      // Tab baru minta state terbaru
      this.channel.postMessage({ type: 'REQUEST_STATE' } satisfies Message);
    }
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
    this.setState(
      { status: 'idle', duration: Math.max(1, Math.floor(seconds)), startedAt: null, pausedRemaining: null },
      true,
    );
  }

  start(): void {
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
    if (this.state.status !== 'running' && this.state.status !== 'overtime') return;
    const remaining = this.computeRemaining(this.state, Date.now());
    this.setState({ ...this.state, status: 'paused', pausedRemaining: remaining }, true);
  }

  reset(): void {
    this.setState(
      { status: 'idle', duration: this.state.duration, startedAt: null, pausedRemaining: null },
      true,
    );
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
    this.channel?.postMessage({ type: 'STATE', state: this.state } satisfies Message);
  }
}

export const timerStore = new TimerStore();
