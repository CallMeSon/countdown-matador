'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { PRESET_DURATIONS } from '@/types/timer';

export default function PresetButtons() {
  const { state, setDuration } = useApp();
  const { totalDuration } = state.timer;

  return (
    <div className="grid grid-cols-4 gap-2">
      {PRESET_DURATIONS.map((min) => {
        const secs = min * 60;
        const isActive = totalDuration === secs;
        return (
          <button
            key={min}
            onClick={() => setDuration(secs)}
            className={`py-3 rounded-lg font-semibold text-sm transition-all ${
              isActive
                ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-lg shadow-cyan-600/30'
                : 'bg-matador-border text-gray-300 hover:bg-gray-600 hover:text-white'
            }`}
          >
            <div className="text-lg font-bold">{min}</div>
            <div className="text-[10px] opacity-70 uppercase">min</div>
          </button>
        );
      })}
    </div>
  );
}
