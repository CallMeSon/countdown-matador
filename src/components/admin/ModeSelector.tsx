'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { TimerMode } from '@/types/timer';

interface ModeOption {
  id: TimerMode;
  label: string;
  sub: string;
  renderIcon: () => React.ReactNode;
}

const MODES: ModeOption[] = [
  {
    id: 'countdown',
    label: 'Countdown',
    sub: 'Hitung Mundur Durasi',
    renderIcon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'countdown-to-time',
    label: 'Target Time',
    sub: 'Countdown ke Jam Tertentu',
    renderIcon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'stopwatch',
    label: 'Stopwatch',
    sub: 'Hitung Maju 00:00',
    renderIcon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    id: 'realtime-wib',
    label: 'Jam Realtime WIB',
    sub: 'Jam Presisi Jakarta (GMT+7)',
    renderIcon: () => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
];

export default function ModeSelector() {
  const { state, setMode } = useApp();
  const currentMode = state.timer.mode;

  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl font-inter">
      {MODES.map((mode) => {
        const isSelected = currentMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => setMode(mode.id)}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left ${
              isSelected
                ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 shadow-md shadow-cyan-950/50'
                : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-zinc-800 text-zinc-400'}`}>
              {mode.renderIcon()}
            </div>
            <div>
              <span className="text-xs font-bold block uppercase tracking-wider text-white">
                {mode.label}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                {mode.sub}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
