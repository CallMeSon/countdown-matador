'use client';

import { useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { timerStore } from '@/lib/timer-store';
import { PRESET_DURATIONS } from '@/types/timer';

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
