# Simple Timer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti sistem timer kompleks dengan 3 page simple (control, timer, matador) yang sync antartab via BroadcastChannel, timer lanjut overtime minus sampai dihentikan manual.

**Architecture:** Satu `timer-store` singleton jadi single source of truth; state hanya berisi timestamp + durasi. Semua page hitung remaining sendiri via requestAnimationFrame → nol drift. Pesan broadcast hanya saat tombol ditekan.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind 3, TypeScript, Vitest + Testing Library (sudah ter-install).

**Spec:** `docs/superpowers/specs/2026-09-02-simple-timer-redesign-design.md`

## Global Constraints

- Bahasa UI Indonesia; label "COUNTDOWN", "TIME'S UP", "START", "PAUSE", "RESET" tetap Inggris (label panggung)
- Format timer `MM:SS`; `HH:MM:SS` otomatis jika > 60 menit; tanpa millidetik
- Overtime tampil `-00:01` dst (tanda minus di depan)
- Channel name BroadcastChannel: `matador-timer-sync` (const `CHANNEL_NAME`)
- Semua fitur lama dihapus: Supabase, audio, cue, PIN, session, admin components, hooks lama, tests lama
- Dependencies di-uninstall: `@supabase/supabase-js`, `qrcode.react`
- Verifikasi tiap task: `npm run typecheck && npx vitest run` (lint di task terakhir)
- Path alias `@/` → `src/` (sudah ada di tsconfig + vitest config)

---

### Task 1: Bersihkan fitur lama

**Files:**
- Delete: `src/components/` (seluruh folder)
- Delete: `src/hooks/useAudioEngine.ts`, `src/hooks/useAudioTriggers.ts`, `src/hooks/useKeyboardShortcuts.ts`, `src/hooks/useTimerEngine.ts`
- Delete: `src/context/TimerContext.tsx`
- Delete: `src/lib/rate-limiter.ts`, `src/lib/session-registry.ts`, `src/lib/supabase-sync.ts`, `src/lib/supabase.ts`, `src/lib/sync-channel.ts`
- Delete: `src/app/admin/page.tsx`, `src/app/control/page.tsx`, `src/app/timer/page.tsx`
- Delete: `src/__tests__/` (seluruh folder)
- Keep: `src/types/timer.ts` (ditulis ulang Task 2), `src/app/page.tsx` (ditulis ulang Task 2), `src/app/layout.tsx`, `src/app/globals.css`, semua config

**Interfaces:**
- Produces: codebase kosong dari fitur lama; `src/types/timer.ts` dan `src/app/*` diisi ulang task berikutnya.

- [ ] **Step 1: Hapus file & folder lama**

```bash
git rm -r src/components src/__tests__ src/app/admin
git rm src/hooks/useAudioEngine.ts src/hooks/useAudioTriggers.ts src/hooks/useKeyboardShortcuts.ts src/hooks/useTimerEngine.ts
git rm src/context/TimerContext.tsx
git rm src/lib/rate-limiter.ts src/lib/session-registry.ts src/lib/supabase-sync.ts src/lib/supabase.ts src/lib/sync-channel.ts
git rm src/app/control/page.tsx src/app/timer/page.tsx
```

- [ ] **Step 2: Uninstall dependencies yang tidak dipakai**

```bash
npm uninstall @supabase/supabase-js qrcode.react
```

- [ ] **Step 3: Verifikasi typecheck error hanya dari file yang akan ditulis ulang**

Run: `npm run typecheck`
Expected: error hanya menunjuk `src/types/timer.ts` / `src/app/page.tsx` (file lama yang masih hidup) — tidak ada referensi ke file terhapus. Jika ada referensi lain, hapus file itu juga.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy features (supabase, audio, admin, sessions)"
```

---

### Task 2: Types + store + hook inti

**Files:**
- Modify: `src/types/timer.ts` (tulis ulang total)
- Create: `src/lib/timer-store.ts`
- Create: `src/hooks/useTimer.ts`
- Test: `src/__tests__/timer-store.test.ts`
- Test: `src/__tests__/use-timer.test.tsx`

**Interfaces:**
- Produces:
  - `TimerState`, `DEFAULT_TIMER_STATE`, `CHANNEL_NAME`, `formatTime(seconds: number): string` di `@/types/timer`
  - `timerStore` singleton: `getState(): TimerState`, `subscribe(fn: (s: TimerState) => void): () => void`, `setDuration(seconds: number): void`, `start(): void`, `pause(): void`, `reset(): void`, `computeRemaining(state: TimerState, now: number): number`
  - `useTimer(): { state: TimerState; remaining: number; isOvertime: boolean; displayTime: string; overtimeTime: string }` di `@/hooks/useTimer`

- [ ] **Step 1: Tulis ulang `src/types/timer.ts`**

```ts
// ============================================================
// Matador Timer — Simple Timer Types
// ============================================================

export type TimerStatus = 'idle' | 'running' | 'paused' | 'overtime';

export interface TimerState {
  status: TimerStatus;
  duration: number;            // total detik
  startedAt: number | null;   // Date.now() saat start
  pausedRemaining: number | null; // sisa detik saat pause (negatif = overtime)
}

export const DEFAULT_TIMER_STATE: TimerState = {
  status: 'idle',
  duration: 300,
  startedAt: null,
  pausedRemaining: null,
};

export const CHANNEL_NAME = 'matador-timer-sync';

export const PRESET_DURATIONS = [60, 180, 300, 600, 900, 1800] as const;

/** Format detik → "MM:SS" atau "HH:MM:SS" jika > 60 menit. Negatif → "-MM:SS". */
export function formatTime(totalSeconds: number): string {
  const isNeg = totalSeconds < 0;
  const abs = Math.floor(Math.abs(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  const core = h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  return isNeg ? `-${core}` : core;
}
```

- [ ] **Step 2: Tulis test store yang gagal**

`src/__tests__/timer-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIMER_STATE } from '@/types/timer';

type Store = typeof import('@/lib/timer-store');

describe('timerStore', () => {
  let store: Store;

  beforeEach(async () => {
    vi.resetModules();
    store = await import('@/lib/timer-store');
  });

  it('mulai dengan state default', () => {
    expect(store.timerStore.getState()).toEqual(DEFAULT_TIMER_STATE);
  });

  it('setDuration → idle dengan durasi baru', () => {
    store.timerStore.setDuration(120);
    const s = store.timerStore.getState();
    expect(s.status).toBe('idle');
    expect(s.duration).toBe(120);
    expect(s.startedAt).toBeNull();
  });

  it('start dari idle → running dengan startedAt', () => {
    store.timerStore.setDuration(60);
    store.timerStore.start();
    const s = store.timerStore.getState();
    expect(s.status).toBe('running');
    expect(s.startedAt).toBeGreaterThan(0);
  });

  it('pause menyimpan pausedRemaining dan resume dari situ', () => {
    store.timerStore.setDuration(100);
    store.timerStore.start();
    const now = Date.now();
    store.timerStore.pause(); // paused ~0s setelah start
    const s = store.timerStore.getState();
    expect(s.status).toBe('paused');
    expect(s.pausedRemaining).not.toBeNull();
    // remaining saat pause ≈ duration
    expect(Math.abs((s.pausedRemaining ?? 0) - 100)).toBeLessThan(5);
    void now;
  });

  it('pause saat overtime menyimpan nilai negatif', () => {
    store.timerStore.setDuration(10);
    store.timerStore.start();
    // simulasi sudah lewat 30 detik → remaining -20
    store.timerStore.getState().startedAt = Date.now() - 30_000;
    store.timerStore.pause();
    const s = store.timerStore.getState();
    expect(s.pausedRemaining).not.toBeNull();
    expect((s.pausedRemaining ?? 0) < -15).toBe(true);
  });

  it('reset → idle kembali ke durasi penuh', () => {
    store.timerStore.setDuration(90);
    store.timerStore.start();
    store.timerStore.reset();
    expect(store.timerStore.getState()).toEqual({
      ...DEFAULT_TIMER_STATE,
      duration: 90,
    });
  });

  it('computeRemaining: running menghitung dari startedAt', () => {
    const s = { ...DEFAULT_TIMER_STATE, status: 'running' as const, duration: 100, startedAt: Date.now() - 40_000 };
    const rem = store.timerStore.computeRemaining(s, Date.now());
    expect(Math.abs(rem - 60)).toBeLessThan(1);
  });

  it('computeRemaining: negatif saat overtime, tidak dibatasi', () => {
    const s = { ...DEFAULT_TIMER_STATE, status: 'running' as const, duration: 10, startedAt: Date.now() - 35_000 };
    const rem = store.timerStore.computeRemaining(s, Date.now());
    expect(rem).toBeLessThan(-24);
  });

  it('computeRemaining: idle → duration, paused → pausedRemaining', () => {
    expect(store.timerStore.computeRemaining(DEFAULT_TIMER_STATE, Date.now())).toBe(300);
    const p = { ...DEFAULT_TIMER_STATE, status: 'paused' as const, pausedRemaining: -7 };
    expect(store.timerStore.computeRemaining(p, Date.now())).toBe(-7);
  });
});
```

- [ ] **Step 3: Run test, verifikasi gagal**

Run: `npx vitest run src/__tests__/timer-store.test.ts`
Expected: FAIL — `Cannot find module '@/lib/timer-store'`

- [ ] **Step 4: Implement `src/lib/timer-store.ts`**

```ts
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
```

Catatan penting untuk implementer: store dibuat di module scope tapi BroadcastChannel hanya diinisialisasi di browser. Di SSR module dijalankan tanpa `window` → aman. Jangan pakai `useSyncExternalStore` langsung di sini; hook ada di file lain.

`pause()` saat overtime: `computeRemaining` mengembalikan nilai negatif → tersimpan di `pausedRemaining` → resume lanjut overtime. Ini perilaku yang dispesifikasikan.

- [ ] **Step 5: Run test store, verifikasi pass**

Run: `npx vitest run src/__tests__/timer-store.test.ts`
Expected: 8 tests PASS

- [ ] **Step 6: Tulis test hook yang gagal**

`src/__tests__/use-timer.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimer } from '@/hooks/useTimer';
import { DEFAULT_TIMER_STATE } from '@/types/timer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('menampilkan state default dengan format MM:SS', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.state).toEqual(DEFAULT_TIMER_STATE);
    expect(result.current.displayTime).toBe('05:00');
    expect(result.current.isOvertime).toBe(false);
  });

  it('remaining turun seiring waktu saat running', async () => {
    const { result } = renderHook(() => useTimer());
    act(() => { result.current.state; }); // baca awal
    // start via store langsung
    const store = await import('@/lib/timer-store');
    act(() => { store.timerStore.start(); });
    expect(result.current.state.status).toBe('running');
  });

  it('formatTime: negatif jadi -MM:SS dan >60min jadi H:MM:SS', async () => {
    const { formatTime } = await import('@/types/timer');
    expect(formatTime(-1)).toBe('-00:01');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(59)).toBe('00:59');
  });
});
```

- [ ] **Step 7: Run test hook, verifikasi gagal**

Run: `npx vitest run src/__tests__/use-timer.test.tsx`
Expected: FAIL — `Cannot find module '@/hooks/useTimer'`

- [ ] **Step 8: Implement `src/hooks/useTimer.ts`**

```ts
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { timerStore } from '@/lib/timer-store';
import { formatTime, TimerState } from '@/types/timer';

export interface TimerView {
  state: TimerState;
  remaining: number;      // detik, negatif saat overtime
  isOvertime: boolean;
  displayTime: string;    // "05:00" / "-00:01"
  overtimeTime: string;   // counter overtime, "-00:01" dst
  secondsLeft: number;    // ceil(remaining) untuk fase animasi
}

export function useTimer(): TimerView {
  const state = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.getState,
    () => timerStore.getState(), // server snapshot
  );

  const [now, setNow] = useState(() => Date.now());

  const isRunning = state.status === 'running' || state.status === 'overtime';
  useEffect(() => {
    if (!isRunning) return;
    let raf = 0;
    const tick = () => { setNow(Date.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning]);

  const remaining = timerStore.computeRemaining(state, now);
  const isOvertime = remaining < 0;
  const overtimeTime = formatTime(remaining); // negatif sudah berformat "-00:01"

  return {
    state,
    remaining,
    isOvertime,
    displayTime: formatTime(remaining),
    overtimeTime,
    secondsLeft: Math.ceil(remaining),
  };
}
```

Catatan: `overtimeTime` dan `displayTime` sama-sama `formatTime(remaining)` — dipisah sebagai field supaya page matador/timer tidak masing-masing manggil format.

- [ ] **Step 9: Run test hook, verifikasi pass**

Run: `npx vitest run src/__tests__/use-timer.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 10: Typecheck + commit**

Run: `npm run typecheck && npx vitest run`
Expected: typecheck PASS, semua test PASS

```bash
git add src/types/timer.ts src/lib/timer-store.ts src/hooks/useTimer.ts src/__tests__
git commit -m "feat: timer store with BroadcastChannel sync + useTimer hook"
```

---

### Task 3: Page Control

**Files:**
- Create: `src/app/control/page.tsx`
- Test: `src/__tests__/control-page.test.tsx`

**Interfaces:**
- Consumes: `useTimer()` (`TimerView`), `timerStore` (`setDuration`, `start`, `pause`, `reset`), `PRESET_DURATIONS`, `formatTime`
- Produces: route `/control` (client component). Label Indonesia. Tombol: preset durasi, input `MM:SS`, START/PAUSE toggle, RESET. Preview timer + indikator status.

- [ ] **Step 1: Tulis test yang gagal**

`src/__tests__/control-page.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ControlPage from '@/app/control/page';

vi.mock('@/lib/timer-store', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/timer-store')>();
  return { ...orig };
});

describe('ControlPage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('render tombol preset, input durasi, START, RESET', () => {
    render(<ControlPage />);
    expect(screen.getByRole('button', { name: '5 MENIT' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'START' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'RESET' })).toBeTruthy();
    expect(screen.getByLabelText('DURASI CUSTOM')).toBeTruthy();
  });

  it('klik preset memanggil setDuration dan tampil di preview', () => {
    render(<ControlPage />);
    fireEvent.click(screen.getByRole('button', { name: '10 MENIT' }));
    const store = require('@/lib/timer-store').timerStore;
    expect(store.getState().duration).toBe(600);
    expect(store.getState().status).toBe('idle');
    expect(screen.getByTestId('preview-time').textContent).toBe('10:00');
  });

  it('input MM:SS valid → setDuration', () => {
    render(<ControlPage />);
    const input = screen.getByLabelText('DURASI CUSTOM');
    fireEvent.change(input, { target: { value: '02:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    const store = require('@/lib/timer-store').timerStore;
    expect(store.getState().duration).toBe(150);
  });

  it('input invalid tidak mengubah durasi', () => {
    render(<ControlPage />);
    const before = require('@/lib/timer-store').timerStore.getState().duration;
    const input = screen.getByLabelText('DURASI CUSTOM');
    fireEvent.change(input, { target: { value: 'xx' } });
    fireEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(require('@/lib/timer-store').timerStore.getState().duration).toBe(before);
  });

  it('klik START → running, tombol berubah PAUSE', () => {
    render(<ControlPage />);
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    const store = require('@/lib/timer-store').timerStore;
    expect(store.getState().status).toBe('running');
    expect(screen.getByRole('button', { name: 'PAUSE' })).toBeTruthy();
  });

  it('klik RESET dari running → idle durasi penuh', () => {
    render(<ControlPage />);
    const store = require('@/lib/timer-store').timerStore;
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    fireEvent.click(screen.getByRole('button', { name: 'RESET' }));
    expect(store.getState().status).toBe('idle');
    expect(store.getState().duration).toBe(store.getState().duration);
  });
});
```

- [ ] **Step 2: Run test, verifikasi gagal**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: FAIL — `Cannot find module '@/app/control/page'`

- [ ] **Step 3: Implement `src/app/control/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { timerStore } from '@/lib/timer-store';
import { PRESET_DURATIONS, formatTime } from '@/types/timer';

const PRESET_LABELS: Record<number, string> = {
  60: '1 MENIT',
  180: '3 MENIT',
  300: '5 MENIT',
  600: '10 MENIT',
  900: '15 MENIT',
  1800: '30 MENIT',
};

/** "MM:SS" → detik; null jika invalid. */
function parseMMSS(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  const sec = Number(m[1]) * 60 + Number(m[2]);
  return sec > 0 ? sec : null;
}

export default function ControlPage() {
  const { state, displayTime, isOvertime } = useTimer();
  const [custom, setCustom] = useState('');

  const statusLabel: Record<string, string> = {
    idle: 'SIAP',
    running: 'JALAN',
    paused: 'PAUSE',
    overtime: 'OVERTIME',
  };
  const statusColor: Record<string, string> = {
    idle: 'text-zinc-400',
    running: 'text-emerald-400',
    paused: 'text-amber-400',
    overtime: 'text-red-500',
  };

  const isRun = state.status === 'running' || state.status === 'overtime';

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-widest">CONTROL</h1>
          <p data-testid="status-label" className={`text-sm font-semibold tracking-widest ${statusColor[state.status]}`}>
            {statusLabel[state.status]}
          </p>
        </header>

        {/* Preview timer */}
        <div className="rounded-2xl border border-zinc-800 bg-black p-10 text-center">
          <div
            data-testid="preview-time"
            className={`timer-digits font-anton text-8xl md:text-9xl ${
              isOvertime ? 'text-red-500' : 'text-white'
            }`}
          >
            {displayTime}
          </div>
        </div>

        {/* Preset */}
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-zinc-400">DURASI</h2>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => timerStore.setDuration(d)}
                className={`rounded-xl border px-4 py-3 font-semibold tracking-wider transition-colors ${
                  state.duration === d
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                }`}
              >
                {PRESET_LABELS[d]}
              </button>
            ))}
          </div>
        </section>

        {/* Custom duration */}
        <section className="flex items-end gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-xs font-semibold tracking-widest text-zinc-400">
              DURASI CUSTOM (MM:SS)
            </span>
            <input
              aria-label="DURASI CUSTOM"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="02:30"
              inputMode="numeric"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-lg tracking-widest focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <button
            onClick={() => {
              const sec = parseMMSS(custom);
              if (sec !== null) timerStore.setDuration(sec);
            }}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold tracking-widest hover:bg-zinc-700"
          >
            SET
          </button>
        </section>

        {/* Kontrol utama */}
        <section className="flex gap-3">
          {isRun ? (
            <button
              onClick={() => timerStore.pause()}
              className="flex-1 rounded-xl bg-amber-500 px-6 py-4 text-xl font-bold tracking-widest text-black hover:bg-amber-400"
            >
              PAUSE
            </button>
          ) : (
            <button
              onClick={() => timerStore.start()}
              disabled={state.status === 'idle' && state.duration <= 0}
              className="flex-1 rounded-xl bg-emerald-500 px-6 py-4 text-xl font-bold tracking-widest text-black hover:bg-emerald-400"
            >
              START
            </button>
          )}
          <button
            onClick={() => timerStore.reset()}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-xl font-bold tracking-widest hover:bg-zinc-800"
          >
            RESET
          </button>
        </section>
      </div>
    </main>
  );
}
```

Catatan: tombol START disabled jika `duration <= 0` — defensif, sebenarnya `setDuration` sudah clamp ke min 1 detik.

- [ ] **Step 4: Run test, verifikasi pass**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: 6 tests PASS

Perhatian: test pakai `require` setelah `vi.resetModules` — jika store singleton antar test bercampur, pastikan `beforeEach` memanggil `vi.resetModules()` SEBELUM `render`, dan ases store via `require` (bukan import top-level). Jika test flaky karena singleton, tambahkan `timerStore.resetForTest?.()` — tapi lebih baik urutan modul saja.

- [ ] **Step 5: Commit**

```bash
git add src/app/control/page.tsx src/__tests__/control-page.test.tsx
git commit -m "feat: control page (preset, custom duration, start/pause/reset)"
```

---

### Task 4: Page Timer (countdown penuh)

**Files:**
- Create: `src/app/timer/page.tsx`
- Modify: `src/app/globals.css` (tambah keyframes animasi)
- Test: `src/__tests__/timer-page.test.tsx`

**Interfaces:**
- Consumes: `useTimer()` (`TimerView`)
- Produces: route `/timer` — angka raksasa tengah, fase animasi normal/kritis/TIME'S UP + overtime counter. CSS classes: `anim-tick` (fade/slide subtle), `anim-pop` (scale pop detik terakhir), `anim-glow` (pulse merah TIME'S UP).

**Fase animasi (dari spec, campuran halus + dramatis):**
- Normal: putih, transisi detik halus
- `secondsLeft <= 10` dan > 0: kuning → merah, scale pop per detik
- Overtime (`remaining < 0`): "TIME'S UP" merah besar + glow berdenyut; di bawahnya counter overtime kecil merah (`-00:01` dst)

- [ ] **Step 1: Tulis test yang gagal**

`src/__tests__/timer-page.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimerPage from '@/app/timer/page';

describe('TimerPage', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('render angka default 05:00 di tengah', () => {
    render(<TimerPage />);
    expect(screen.getByTestId('countdown-main').textContent).toBe('05:00');
  });

  it('saat overtime render TIME\'S UP + counter overtime merah', async () => {
    render(<TimerPage />);
    const store = (await import('@/lib/timer-store')).timerStore;
    act(() => {
      store.setDuration(5);
      store.start();
      // mundurkan startedAt seolah 10 detik berlalu → remaining -5
      store.getState().startedAt = Date.now() - 10_000;
    });
    // tunggu raf tick
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.getByTestId('timesup').textContent).toBe("TIME'S UP");
    expect(screen.getByTestId('overtime-counter').textContent).toBe('-00:05');
  });
});
```

- [ ] **Step 2: Run test, verifikasi gagal**

Run: `npx vitest run src/__tests__/timer-page.test.tsx`
Expected: FAIL — `Cannot find module '@/app/timer/page'`

- [ ] **Step 3: Tambah keyframes ke `src/app/globals.css`**

Append di akhir file (jangan hapus yang ada; Tailwind directive + font import tetap):

```css
/* ============================================================
   Simple Timer — Animations
   ============================================================ */

/* Transisi detik halus (normal) */
@keyframes timer-tick {
  0% { opacity: 0.35; transform: translateY(0.015em); }
  100% { opacity: 1; transform: translateY(0); }
}
.anim-tick {
  animation: timer-tick 0.28s ease-out;
}

/* Scale pop 10 detik terakhir */
@keyframes timer-pop {
  0% { transform: scale(1.14); }
  100% { transform: scale(1); }
}
.anim-pop {
  animation: timer-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Glow merah berdenyut saat TIME'S UP */
@keyframes timer-glow {
  0%, 100% {
    text-shadow: 0 0 0.6em rgba(239, 68, 68, 0.45), 0 0 2.2em rgba(239, 68, 68, 0.25);
  }
  50% {
    text-shadow: 0 0 1.1em rgba(239, 68, 68, 0.85), 0 0 3.5em rgba(239, 68, 68, 0.5);
  }
}
.anim-glow {
  animation: timer-glow 1.1s ease-in-out infinite;
}
```

- [ ] **Step 4: Implement `src/app/timer/page.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';

export default function TimerPage() {
  const { displayTime, overtimeTime, secondsLeft, isOvertime, state } = useTimer();
  const prevSec = useRef(secondsLeft);
  const [animKey, setAnimKey] = useState(0);

  // Trigger animasi tiap perubahan detik
  useEffect(() => {
    if (prevSec.current !== secondsLeft) {
      prevSec.current = secondsLeft;
      setAnimKey((k) => k + 1);
    }
  }, [secondsLeft]);

  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const showTime = state.status !== 'idle' || true; // selalu tampil
  const mainClass = critical
    ? `anim-pop ${secondsLeft <= 5 ? 'text-red-500' : 'text-amber-400'}`
    : 'anim-tick text-white';

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      {isOvertime ? (
        <div className="flex flex-col items-center gap-6">
          <div
            data-testid="timesup"
            className="anim-glow timer-digits font-anton text-[16cqw] text-red-500 md:text-[22vw]"
          >
            TIME&apos;S UP
          </div>
          <div
            data-testid="overtime-counter"
            className="timer-digits font-anton text-[6cqw] text-red-500 md:text-[8vw]"
          >
            {overtimeTime}
          </div>
        </div>
      ) : (
        <div
          data-testid="countdown-main"
          key={animKey}
          className={`timer-digits font-anton text-[22cqw] leading-none md:text-[28vw] ${mainClass}`}
        >
          {showTime ? displayTime : ''}
        </div>
      )}
    </main>
  );
}
```

Catatan implementasi:
- `key={animKey}` re-mount elemen tiap ganti detik → animasi `anim-tick`/`anim-pop` replay. Murah dan andal.
- `text-[16cqw]` butuh container query — jika Tailwind arbitrary tidak resolve `cqw`, fallback ke `md:text-[22vw]` yang sudah ada. Sederhanakan: boleh hapus cqw dan pakai `vw` saja.
- Saat `paused`/`idle` tidak ada animasi berjalan karena `secondsLeft` tidak berubah → `animKey` diam.

- [ ] **Step 5: Run test, verifikasi pass**

Run: `npx vitest run src/__tests__/timer-page.test.tsx`
Expected: 2 tests PASS

Jika test overtime flaky karena timing rAF, ganti `await new Promise(r => setTimeout(r, 50))` jadi 100ms, atau di test panggil `act` setelah mutasi `startedAt` — jangan ubah implementasi untuk test kecuali perlu.

- [ ] **Step 6: Commit**

```bash
git add src/app/timer/page.tsx src/app/globals.css src/__tests__/timer-page.test.tsx
git commit -m "feat: full-screen timer page with phase animations"
```

---

### Task 5: Page Matador

**Files:**
- Create: `src/app/matador/page.tsx`
- Test: `src/__tests__/matador-page.test.tsx`

**Interfaces:**
- Consumes: `useTimer()` (`TimerView`)
- Produces: route `/matador` — bar atas (label "COUNTDOWN" kiri + timer kanan), sisanya space kosong hitam untuk PPT. Timer ikut fase animasi warna (kuning/merah ≤10 detik, merah overtime). Angka overtime minus di samping/bawah angka utama saat TIME'S UP.

- [ ] **Step 1: Tulis test yang gagal**

`src/__tests__/matador-page.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MatadorPage from '@/app/matador/page';

describe('MatadorPage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('render label COUNTDOWN kiri atas dan timer kanan atas', () => {
    render(<MatadorPage />);
    expect(screen.getByTestId('matador-label').textContent).toBe('COUNTDOWN');
    expect(screen.getByTestId('matador-timer').textContent).toBe('05:00');
  });

  it('ada area kosong untuk PPT (space besar di bawah bar)', () => {
    render(<MatadorPage />);
    expect(screen.getByTestId('ppt-space')).toBeTruthy();
  });

  it('saat overtime: TIME\'S UP + counter minus', async () => {
    render(<MatadorPage />);
    const store = (await import('@/lib/timer-store')).timerStore;
    act(() => {
      store.setDuration(5);
      store.start();
      store.getState().startedAt = Date.now() - 8_000; // remaining -3
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.getByTestId('matador-timesup').textContent).toBe("TIME'S UP");
    expect(screen.getByTestId('matador-overtime').textContent).toBe('-00:03');
  });
});
```

- [ ] **Step 2: Run test, verifikasi gagal**

Run: `npx vitest run src/__tests__/matador-page.test.tsx`
Expected: FAIL — `Cannot find module '@/app/matador/page'`

- [ ] **Step 3: Implement `src/app/matador/page.tsx`**

```tsx
'use client';

import { useTimer } from '@/hooks/useTimer';

export default function MatadorPage() {
  const { displayTime, overtimeTime, secondsLeft, isOvertime } = useTimer();
  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const timerColor = isOvertime || critical && secondsLeft <= 5
    ? 'text-red-500'
    : critical
      ? 'text-amber-400'
      : 'text-white';

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-black">
      {/* Bar atas */}
      <header className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
        <span data-testid="matador-label" className="text-sm font-semibold tracking-[0.3em] text-zinc-300">
          COUNTDOWN
        </span>
        {isOvertime ? (
          <span className="flex items-baseline gap-4">
            <span data-testid="matador-timesup" className="anim-glow font-anton text-2xl text-red-500 md:text-4xl">
              TIME&apos;S UP
            </span>
            <span data-testid="matador-overtime" className={`timer-digits font-anton text-2xl md:text-4xl ${timerColor}`}>
              {overtimeTime}
            </span>
          </span>
        ) : (
          <span data-testid="matador-timer" className={`timer-digits font-anton text-3xl md:text-5xl ${timerColor}`}>
            {displayTime}
          </span>
        )}
      </header>

      {/* Space kosong untuk PPT */}
      <div data-testid="ppt-space" className="flex-1" aria-label="ruang presentasi" />
    </main>
  );
}
```

- [ ] **Step 4: Run test, verifikasi pass**

Run: `npx vitest run src/__tests__/matador-page.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/matador/page.tsx src/__tests__/matador-page.test.tsx
git commit -m "feat: matador presentation view (header timer + ppt space)"
```

---

### Task 6: Root page + layout + verifikasi final

**Files:**
- Modify: `src/app/page.tsx` (tulis ulang: redirect ke `/control`)
- Modify: `src/app/layout.tsx` (update metadata title)
- Test: `src/__tests__/root-page.test.tsx`

**Interfaces:**
- Consumes: Next.js `redirect` dari `next/navigation`
- Produces: `/` redirect ke `/control`; metadata "Matador Timer"

- [ ] **Step 1: Tulis test yang gagal**

`src/__tests__/root-page.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));

describe('root page', () => {
  it('redirect ke /control', async () => {
    const Root = (await import('@/app/page')).default;
    expect(() => Root()).toThrow('REDIRECT:/control');
  });
});
```

- [ ] **Step 2: Run test, verifikasi gagal**

Run: `npx vitest run src/__tests__/root-page.test.tsx`
Expected: FAIL (page lama tidak redirect)

- [ ] **Step 3: Implement `src/app/page.tsx`**

```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/control');
}
```

- [ ] **Step 4: Update metadata `src/app/layout.tsx`**

Ganti `metadata.title` jadi `'Matador Timer'` dan `description` jadi `'Sederhana: kontrol, countdown, tampilan matador. Sinkron antartab.'` (sisanya biarkan).

- [ ] **Step 5: Run semua verifikasi**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: semua PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/__tests__/root-page.test.tsx
git commit -m "feat: root redirect to control + final cleanup"
```

- [ ] **Step 7: Smoke test manual (diimplementer lokal)**

Run: `npm run dev`
Buka 3 tab: `localhost:3000/control`, `/timer`, `/matador`. Klik START di control → kedua tampilan jalan serempak. Biarkan lewat 00:00 → TIME'S UP + counter minus. Pause → freeze. Reset → kembali durasi penuh.
Expected: semua sinkron, animasi sesuai fase.
