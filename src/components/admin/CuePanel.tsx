'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';

export default function CuePanel() {
  const { state, sendCue } = useApp();
  const { activeCue } = state;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-4 text-white font-inter">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Isyarat Visual Panggung (Cue Signals)</span>
        {activeCue && (
          <span className="text-[10px] px-2 py-0.5 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded font-mono font-bold uppercase">
            Aktif: {activeCue}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button 
          onClick={() => sendCue('standby')}
          className={`p-4 rounded-xl font-bold text-amber-950 flex flex-col items-center justify-center transition-all ${
            activeCue === 'standby'
              ? 'bg-amber-400 ring-4 ring-amber-300/40 shadow-lg shadow-amber-400/30'
              : 'bg-amber-400/90 hover:bg-amber-400'
          }`}
        >
          <span className="text-base font-black tracking-widest uppercase">STANDBY</span>
          <span className="text-[11px] font-medium text-amber-950/80 mt-0.5">Beri aba-aba pembicara untuk bersiap</span>
        </button>

        <button 
          onClick={() => sendCue('go')}
          className={`p-4 rounded-xl font-bold text-white flex flex-col items-center justify-center transition-all ${
            activeCue === 'go'
              ? 'bg-emerald-500 ring-4 ring-emerald-300/40 shadow-lg shadow-emerald-500/30'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          <span className="text-base font-black tracking-widest uppercase">GO</span>
          <span className="text-[11px] font-medium text-emerald-100/80 mt-0.5">Sinyal pembicara untuk memulai bicara</span>
        </button>

        <button 
          onClick={() => sendCue('wrapup')}
          className={`p-4 rounded-xl font-bold text-white flex flex-col items-center justify-center transition-all ${
            activeCue === 'wrapup'
              ? 'bg-red-500 ring-4 ring-red-300/40 shadow-lg shadow-red-500/30'
              : 'bg-red-600 hover:bg-red-500'
          }`}
        >
          <span className="text-base font-black tracking-widest uppercase">WRAP UP</span>
          <span className="text-[11px] font-medium text-red-100/80 mt-0.5">Beri isyarat waktu hampir habis & segera tutup sesi</span>
        </button>
      </div>

      <button 
        onClick={() => sendCue(null)}
        className="w-full mt-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
      >
        Hapus Sinyal Isyarat (Clear)
      </button>
    </div>
  );
}
