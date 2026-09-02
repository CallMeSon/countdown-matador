'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { WarningThreshold } from '@/types/timer';

export default function WarningThresholds() {
  const { state, updateDisplayConfig } = useApp();
  const thresholds = state.display.warningThresholds || [];

  const updateThresholds = (newThresholds: WarningThreshold[]) => {
    const sorted = [...newThresholds].sort((a, b) => a.seconds - b.seconds);
    updateDisplayConfig({ warningThresholds: sorted });
  };

  const addThreshold = () => {
    updateThresholds([
      ...thresholds,
      { id: Date.now().toString(), seconds: 60, color: '#ffcc00', flash: false, soundEnabled: false }
    ]);
  };

  const updateItem = (id: string, updates: Partial<WarningThreshold>) => {
    updateThresholds(thresholds.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeItem = (id: string) => {
    updateThresholds(thresholds.filter(t => t.id !== id));
  };

  return (
    <div className="p-4 bg-[#1a1a1a] border border-[#333333] rounded-lg font-inter text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Warning Thresholds</h3>
        <button 
          onClick={addThreshold}
          className="px-3 py-1 bg-[#333333] hover:bg-[#444444] rounded text-xs font-medium transition-colors"
        >
          + Tambah
        </button>
      </div>

      <div className="space-y-3">
        {thresholds.map((threshold) => (
          <div key={threshold.id} className="flex items-center space-x-3 bg-[#111111] p-2 rounded border border-[#333333]">
            <div className="flex items-center space-x-1">
              <input 
                type="number" 
                value={threshold.seconds}
                onChange={(e) => updateItem(threshold.id, { seconds: parseInt(e.target.value) || 0 })}
                className="w-16 bg-[#222222] border border-[#444444] rounded px-2 py-1 text-xs"
              />
              <span className="text-xs text-gray-400">detik</span>
            </div>
            
            <input 
              type="color" 
              value={threshold.color}
              onChange={(e) => updateItem(threshold.id, { color: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
            />
            
            <label className="flex items-center space-x-1 text-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={threshold.flash}
                onChange={(e) => updateItem(threshold.id, { flash: e.target.checked })}
                className="accent-blue-500"
              />
              <span>Flash</span>
            </label>
            
            <label className="flex items-center space-x-1 text-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={threshold.soundEnabled}
                onChange={(e) => updateItem(threshold.id, { soundEnabled: e.target.checked })}
                className="accent-blue-500"
              />
              <span>Sound</span>
            </label>

            <button 
              onClick={() => removeItem(threshold.id)}
              className="ml-auto text-red-500 hover:text-red-400 p-1"
            >
              ✕
            </button>
          </div>
        ))}
        {thresholds.length === 0 && (
          <div className="text-center text-xs text-gray-500 py-4">
            Belum ada warning threshold.
          </div>
        )}
      </div>
    </div>
  );
}
