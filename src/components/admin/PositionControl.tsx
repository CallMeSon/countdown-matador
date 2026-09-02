'use client';

import React, { useRef, useCallback } from 'react';
import { useApp } from '@/context/TimerContext';
import { PositionAnchor } from '@/types/timer';

const POSITION_GRID: { anchor: PositionAnchor; label: string; x: number; y: number }[] = [
  { anchor: 'top-left', label: '↖', x: 15, y: 15 },
  { anchor: 'top-center', label: '↑', x: 50, y: 15 },
  { anchor: 'top-right', label: '↗', x: 85, y: 15 },
  { anchor: 'center-left', label: '←', x: 15, y: 50 },
  { anchor: 'center', label: '⊕', x: 50, y: 50 },
  { anchor: 'center-right', label: '→', x: 85, y: 50 },
  { anchor: 'bottom-left', label: '↙', x: 15, y: 85 },
  { anchor: 'bottom-center', label: '↓', x: 50, y: 85 },
  { anchor: 'bottom-right', label: '↘', x: 85, y: 85 },
];

export default function PositionControl() {
  const { state, updateDisplayConfig } = useApp();
  const { position } = state.display;
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePresetClick = (preset: typeof POSITION_GRID[0]) => {
    updateDisplayConfig({ 
      position: { x: preset.x, y: preset.y, anchor: preset.anchor } 
    });
  };

  const updatePositionFromClientCoords = useCallback((clientX: number, clientY: number) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    updateDisplayConfig({ 
      position: { x: Math.round(x), y: Math.round(y), anchor: 'custom' } 
    });
  }, [updateDisplayConfig]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    updatePositionFromClientCoords(e.clientX, e.clientY);
    
    const startDrag = (moveEvent: MouseEvent) => {
      updatePositionFromClientCoords(moveEvent.clientX, moveEvent.clientY);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', startDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', startDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  }, [updatePositionFromClientCoords]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updatePositionFromClientCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [updatePositionFromClientCoords]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updatePositionFromClientCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [updatePositionFromClientCoords]);

  // Calculate the display position of the dot
  const anchorMap: Record<string, { x: number; y: number }> = {};
  POSITION_GRID.forEach(p => { anchorMap[p.anchor] = { x: p.x, y: p.y }; });
  const dotPos = position.anchor === 'custom' 
    ? { x: position.x, y: position.y }
    : (anchorMap[position.anchor] || { x: 50, y: 50 });

  return (
    <div className="space-y-4 font-inter">
      {/* 3x3 Grid Presets */}
      <div className="grid grid-cols-3 gap-2 w-fit">
        {POSITION_GRID.map((preset) => (
          <button
            key={preset.anchor}
            onClick={() => handlePresetClick(preset)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
              position.anchor === preset.anchor
                ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
            title={preset.anchor}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Mini Preview Canvas (16:9) with Touch Support */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400 block font-semibold uppercase tracking-wider">
          Sentuh / Drag pada Canvas untuk Posisi Kustom:
        </label>
        <div 
          ref={previewRef}
          className="w-full aspect-video bg-black rounded-xl border border-zinc-800 relative cursor-crosshair overflow-hidden touch-none select-none shadow-inner"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="border border-zinc-700" />
            ))}
          </div>
          
          {/* Position dot */}
          <div 
            className="absolute w-5 h-5 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-cyan-400/50 border-2 border-white pointer-events-none transition-transform"
            style={{ left: `${dotPos.x}%`, top: `${dotPos.y}%` }}
          />
          
          {/* Crosshair lines */}
          <div 
            className="absolute w-px bg-cyan-400/30 h-full pointer-events-none"
            style={{ left: `${dotPos.x}%` }}
          />
          <div 
            className="absolute h-px bg-cyan-400/30 w-full pointer-events-none"
            style={{ top: `${dotPos.y}%` }}
          />
        </div>
      </div>

      {/* Coordinates display */}
      <div className="flex gap-4 text-xs text-zinc-500 font-mono">
        <span>X: {dotPos.x}%</span>
        <span>Y: {dotPos.y}%</span>
        <span className="uppercase">Anchor: {position.anchor}</span>
      </div>

      {/* Reset button */}
      <button
        onClick={() => updateDisplayConfig({ position: { x: 50, y: 50, anchor: 'center' } })}
        className="text-xs text-zinc-400 hover:text-cyan-400 transition-colors uppercase tracking-wider font-semibold flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Reset ke Posisi Tengah</span>
      </button>
    </div>
  );
}
