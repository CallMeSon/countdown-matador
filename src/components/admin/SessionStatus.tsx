'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';

export default function SessionStatus() {
  const { state } = useApp();
  const { status, mode } = state.timer;
  const engine = useTimerEngine();

  const statusConfig = {
    'idle': { icon: '🟢', label: 'SIAP SEDIA', color: 'text-emerald-400' },
    'running': { icon: '🔵', label: 'BERJALAN', color: 'text-cyan-400' },
    'paused': { icon: '🟡', label: 'DIJEDA', color: 'text-yellow-400' },
    'overtime': { icon: '🔴', label: 'OVERTIME', color: 'text-red-500 animate-pulse' },
  };

  const currentConfig = engine.isOvertime 
    ? statusConfig['overtime'] 
    : (statusConfig[status] || statusConfig['idle']);

  return (
    <div className="p-3 bg-matador-card border border-matador-border rounded-lg flex flex-col items-center justify-center font-inter text-white min-h-[90px]">
      <div className={`text-xs font-bold flex items-center gap-1.5 mb-1 ${currentConfig.color}`}>
        <span>{currentConfig.icon}</span>
        <span className="tracking-wider">{currentConfig.label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono tracking-wider tabular-nums ${
        engine.isOvertime ? 'text-red-400' : 'text-white'
      }`}>
        {engine.displayTime}
      </div>
      <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
        {mode === 'countdown' ? 'Countdown' : mode === 'realtime-wib' ? 'Jam WIB' : mode === 'stopwatch' ? 'Stopwatch' : 'Target'}
      </span>
    </div>
  );
}
