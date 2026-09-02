'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import { isPausableMode } from '@/types/timer';

export default function MainControls() {
  const { state, startTimer, pauseTimer, resetTimer } = useApp();
  const { status, mode } = state.timer;
  const { remainingSeconds } = useTimerEngine();

  // Space/Escape are already handled globally by useKeyboardShortcuts (mounted
  // once per page) — no separate listener here, so key presses don't double-fire.
  const pausable = isPausableMode(mode);

  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex gap-3 font-inter">
      {pausable && (status === 'idle' || status === 'paused') && (
        <button
          onClick={startTimer}
          className="flex-1 flex flex-col items-center justify-center py-5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white transition-all shadow-lg shadow-emerald-950/40 active:scale-95"
        >
          <svg className="w-7 h-7 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="font-bold text-sm tracking-wider uppercase">MULAI</span>
          <span className="text-[10px] text-emerald-200 mt-0.5 tracking-wider uppercase font-mono">(SPASI)</span>
        </button>
      )}

      {pausable && (status === 'running' || status === 'overtime') && (
        <button
          onClick={() => pauseTimer(remainingSeconds)}
          className="flex-1 flex flex-col items-center justify-center py-5 bg-amber-600 hover:bg-amber-500 rounded-xl text-white transition-all shadow-lg shadow-amber-950/40 active:scale-95"
        >
          <svg className="w-7 h-7 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <span className="font-bold text-sm tracking-wider uppercase">JEDA</span>
          <span className="text-[10px] text-amber-200 mt-0.5 tracking-wider uppercase font-mono">(SPASI)</span>
        </button>
      )}

      {!pausable && (
        <div className="flex-1 flex flex-col items-center justify-center py-5 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mb-2" />
          <span className="font-bold text-sm tracking-wider uppercase">LIVE</span>
          <span className="text-[10px] text-zinc-500 mt-0.5 tracking-wider uppercase">Mengikuti jam, tidak bisa dijeda</span>
        </div>
      )}

      <button
        onClick={resetTimer}
        className="flex-1 flex flex-col items-center justify-center py-5 bg-zinc-800 hover:bg-red-950/60 hover:border-red-500/50 border border-zinc-700/50 rounded-xl text-zinc-300 hover:text-red-300 transition-all active:scale-95"
      >
        <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="font-bold text-sm tracking-wider uppercase">RESET</span>
        <span className="text-[10px] text-zinc-500 mt-0.5 tracking-wider uppercase font-mono">(ESC)</span>
      </button>
    </div>
  );
}
