'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { getSessionById } from '@/lib/session-registry';

export default function SyncStatusBar() {
  const { state, lockAdmin } = useApp();
  const { syncConnected, room, connectedDisplays } = state;

  const handleOpenDisplay = () => {
    const token = getSessionById(room.roomId || 'stage-1')?.token;
    const targetUrl = token ? `/timer/${token}/` : '/timer/';
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2.5 md:px-4 md:py-3 text-white font-inter shrink-0">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Brand + Room */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base md:text-lg font-black tracking-wider text-cyan-400 shrink-0">MATADOR</span>
          <span className="hidden sm:inline text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0">
            Pro Deck
          </span>

          {/* Room Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-zinc-800 rounded-lg text-xs shrink-0">
            <span className="text-zinc-500">Sesi:</span>
            <span className="font-mono font-bold text-amber-300 uppercase">{room.roomId || 'stage-1'}</span>
          </div>

          {/* Sync dot (always visible, compact on mobile) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-2 h-2 rounded-full ${
              connectedDisplays > 0 ? 'bg-emerald-400 animate-pulse' : syncConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            <span className="hidden sm:inline text-xs font-medium text-zinc-300">
              {connectedDisplays > 0 ? `${connectedDisplays} Perangkat (Cloud Sync)` : 'Siap'}
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href="/admin"
            className="px-2 md:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[11px] md:text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="hidden sm:inline">Hub</span>
          </a>
          <button
            onClick={handleOpenDisplay}
            className="px-2 md:px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-[11px] md:text-xs font-bold transition-all shadow flex items-center gap-1 uppercase tracking-wider text-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Display</span>
          </button>
          <button
            onClick={lockAdmin}
            title="Kunci Panel Admin"
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
