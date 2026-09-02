'use client';

import React, { useRef, useCallback } from 'react';
import { useApp } from '@/context/TimerContext';
import { FontFamily, PositionAnchor } from '@/types/timer';

const QUICK_PRESETS = [
  'SESI 1: OPENING & KEYNOTE',
  'SESI 2: PANEL DISCUSSION',
  'SESI 3: Q&A / TANYA JAWAB',
  'PITCHING & PRESENTASI',
  'ISTIRAHAT / COFFEE BREAK',
  'PENGUMUMAN & PENUTUPAN',
];

const COLOR_SWATCHES = [
  { label: 'Putih', color: '#ffffff' },
  { label: 'Kuning Emas', color: '#facc15' },
  { label: 'Cyan Terang', color: '#22d3ee' },
  { label: 'Hijau Zamrud', color: '#4ade80' },
  { label: 'Merah Menyala', color: '#f87171' },
  { label: 'Ungu / Violet', color: '#c084fc' },
];

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

export default function SessionInput() {
  const { state, setSessionLabel, updateDisplayConfig } = useApp();
  const { sessionLabel } = state.timer;
  const {
    sessionLabelVisible,
    sessionLabelPlacement,
    sessionLabelPosition,
    sessionLabelSize,
    sessionLabelScale,
    sessionLabelFontFamily,
    sessionLabelFontWeight,
    sessionLabelColor,
  } = state.display;

  const currentScale = sessionLabelScale || 100;
  const currentFont = sessionLabelFontFamily || 'inter';
  const currentWeight = sessionLabelFontWeight || 'black';
  const currentPlacement = sessionLabelPlacement || 'above-timer';

  const previewRef = useRef<HTMLDivElement>(null);

  // Position drag handling
  const updatePositionFromClientCoords = useCallback((clientX: number, clientY: number) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100));
    updateDisplayConfig({ 
      sessionLabelPlacement: 'custom',
      sessionLabelPosition: { x: Math.round(x), y: Math.round(y), anchor: 'custom' } 
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

  const labelPos = sessionLabelPosition?.anchor === 'custom'
    ? { x: sessionLabelPosition.x, y: sessionLabelPosition.y }
    : sessionLabelPlacement === 'below-timer'
    ? { x: 50, y: 70 }
    : sessionLabelPlacement === 'above-timer'
    ? { x: 50, y: 30 }
    : { x: sessionLabelPosition?.x ?? 50, y: sessionLabelPosition?.y ?? 30 };

  return (
    <div className="space-y-5 font-inter">
      {/* 1. Visibility Toggle & Main Text Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-zinc-300 font-semibold uppercase tracking-wider">
            Teks Label Sesi Acara:
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={sessionLabelVisible}
              onChange={(e) => updateDisplayConfig({ sessionLabelVisible: e.target.checked })}
              className="accent-cyan-500 w-4 h-4 rounded"
            />
            <span>Tampilkan di Layar Display</span>
          </label>
        </div>

        <div className="relative">
          <input
            type="text"
            value={sessionLabel}
            onChange={(e) => setSessionLabel(e.target.value)}
            placeholder="Contoh: SESI 1 — KEYNOTE SPEAKER"
            className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-white text-base font-bold placeholder-zinc-600 focus:outline-none transition-colors"
          />
          {sessionLabel && (
            <button
              onClick={() => setSessionLabel('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 text-xs"
              title="Hapus Teks"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 2. Quick Presets */}
      <div>
        <span className="text-[11px] text-zinc-400 block mb-1.5 font-semibold uppercase tracking-wider">
          Pilih Cepat Judul Rundown:
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setSessionLabel(preset)}
              className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-700 active:bg-cyan-600/30 border border-zinc-700/60 rounded-lg text-[11px] font-medium text-zinc-300 hover:text-white transition-all"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Posisi / Tata Letak Penempatan Teks Label */}
      <div className="space-y-3 pt-2 border-t border-zinc-800/80">
        <label className="text-xs text-zinc-300 font-semibold block uppercase tracking-wider">
          Posisi & Tata Letak Teks Label di Layar:
        </label>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'above-timer', label: 'Di Atas Jam' },
            { id: 'below-timer', label: 'Di Bawah Jam' },
            { id: 'custom', label: 'Bebas (Drag / Custom)' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                if (mode.id === 'above-timer') {
                  updateDisplayConfig({
                    sessionLabelPlacement: 'above-timer',
                    sessionLabelPosition: { x: 50, y: 30, anchor: 'top-center' },
                  });
                } else if (mode.id === 'below-timer') {
                  updateDisplayConfig({
                    sessionLabelPlacement: 'below-timer',
                    sessionLabelPosition: { x: 50, y: 70, anchor: 'bottom-center' },
                  });
                } else {
                  updateDisplayConfig({
                    sessionLabelPlacement: 'custom',
                    sessionLabelPosition: { x: labelPos.x, y: labelPos.y, anchor: 'custom' },
                  });
                }
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-center ${
                currentPlacement === mode.id
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Custom Drag Canvas if 'custom' is active */}
        {currentPlacement === 'custom' && (
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-2xl space-y-3 animate-fadeIn">
            {/* 3x3 Presets */}
            <div>
              <span className="text-[11px] text-zinc-400 block mb-1.5 font-semibold uppercase tracking-wider">
                Preset Posisi Cepat:
              </span>
              <div className="grid grid-cols-3 gap-1.5 w-fit">
                {POSITION_GRID.map((preset) => (
                  <button
                    key={preset.anchor}
                    onClick={() => updateDisplayConfig({
                      sessionLabelPlacement: 'custom',
                      sessionLabelPosition: { x: preset.x, y: preset.y, anchor: preset.anchor },
                    })}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                      sessionLabelPosition?.anchor === preset.anchor
                        ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Drag Canvas */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 block font-semibold uppercase tracking-wider">
                Sentuh / Geser Label di Canvas:
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

                {/* Session Label Tag Indicator */}
                <div
                  className="absolute px-2 py-0.5 bg-cyan-500 text-black text-[9px] font-black rounded-md -translate-x-1/2 -translate-y-1/2 shadow-lg border border-white pointer-events-none uppercase tracking-wider whitespace-nowrap"
                  style={{ left: `${labelPos.x}%`, top: `${labelPos.y}%` }}
                >
                  LABEL SESI
                </div>

                {/* Crosshairs */}
                <div
                  className="absolute w-px bg-cyan-400/40 h-full pointer-events-none"
                  style={{ left: `${labelPos.x}%` }}
                />
                <div
                  className="absolute h-px bg-cyan-400/40 w-full pointer-events-none"
                  style={{ top: `${labelPos.y}%` }}
                />
              </div>

              {/* Coordinates display */}
              <div className="flex gap-4 text-xs text-zinc-500 font-mono">
                <span>X: {labelPos.x}%</span>
                <span>Y: {labelPos.y}%</span>
                <span className="uppercase">Anchor: {sessionLabelPosition?.anchor || 'custom'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Typography: Font Family & Font Weight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
        {/* Font Family */}
        <div>
          <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
            Jenis Font Label:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'anton' as FontFamily, label: 'Anton' },
              { id: 'bebas' as FontFamily, label: 'Bebas' },
              { id: 'inter' as FontFamily, label: 'Inter' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => updateDisplayConfig({ sessionLabelFontFamily: f.id })}
                className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  currentFont === f.id
                    ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Weight */}
        <div>
          <label className="text-xs text-zinc-300 font-semibold block mb-1.5 uppercase tracking-wider">
            Ketebalan Font (Weight):
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'normal', label: 'Normal' },
              { id: 'semibold', label: 'Medium' },
              { id: 'bold', label: 'Bold' },
              { id: 'black', label: 'Black' },
            ].map((w) => (
              <button
                key={w.id}
                onClick={() => updateDisplayConfig({ sessionLabelFontWeight: w.id as any })}
                className={`py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                  currentWeight === w.id
                    ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Font Size Controls: Presets & Slider */}
      <div className="space-y-3 pt-2 border-t border-zinc-800/80">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-300 font-semibold uppercase tracking-wider">
              Ukuran Font Label:
            </label>
            <span className="text-xs font-mono font-bold text-cyan-400">
              Skala: {currentScale}%
            </span>
          </div>

          {/* Size Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
            {[
              { id: 'medium', label: 'Sedang', scale: 80 },
              { id: 'large', label: 'Besar', scale: 100 },
              { id: 'extra-large', label: 'Ekstra Besar', scale: 140 },
              { id: 'massive', label: 'Super Raksasa', scale: 200 },
            ].map((sz) => (
              <button
                key={sz.id}
                onClick={() => updateDisplayConfig({
                  sessionLabelSize: sz.id as any,
                  sessionLabelScale: sz.scale,
                })}
                className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  currentScale === sz.scale
                    ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>

          {/* Precision Scale Slider */}
          <input
            type="range"
            min={50}
            max={250}
            step={5}
            value={currentScale}
            onChange={(e) => updateDisplayConfig({
              sessionLabelScale: parseInt(e.target.value) || 100,
            })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
            <span>Kecil (50%)</span>
            <span>Standar (100%)</span>
            <span>Besar (150%)</span>
            <span>Raksasa (250%)</span>
          </div>
        </div>
      </div>

      {/* 6. Color Picker & Swatches */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <label className="text-xs text-zinc-300 font-semibold block uppercase tracking-wider">
          Warna Teks Label:
        </label>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Custom Color Input */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={sessionLabelColor || '#ffffff'}
              onChange={(e) => updateDisplayConfig({ sessionLabelColor: e.target.value })}
              className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={sessionLabelColor || '#ffffff'}
              onChange={(e) => updateDisplayConfig({ sessionLabelColor: e.target.value })}
              className="w-28 bg-black/60 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Swatches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.color}
                onClick={() => updateDisplayConfig({ sessionLabelColor: swatch.color })}
                style={{ backgroundColor: swatch.color }}
                className={`w-7 h-7 rounded-lg border transition-all ${
                  (sessionLabelColor || '#ffffff').toLowerCase() === swatch.color.toLowerCase()
                    ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.6)]'
                    : 'border-zinc-700 opacity-80 hover:opacity-100'
                }`}
                title={swatch.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 7. Live Preview Box inside Setting Tab */}
      <div className="p-4 bg-black rounded-2xl border border-zinc-800 space-y-1.5 text-center shadow-inner">
        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
          Preview Tampilan Label di Panggung:
        </span>
        <div className="py-2 overflow-hidden">
          <span
            className={`inline-block leading-tight uppercase transition-all drop-shadow-md ${
              currentFont === 'anton' ? 'font-anton' : currentFont === 'bebas' ? 'font-bebas' : 'font-inter'
            } ${
              currentWeight === 'normal' ? 'font-normal'
                : currentWeight === 'semibold' ? 'font-semibold'
                : currentWeight === 'bold' ? 'font-bold'
                : 'font-black'
            }`}
            style={{
              color: sessionLabelColor || '#ffffff',
              fontSize: `calc(1.25rem * ${currentScale / 100})`,
            }}
          >
            {sessionLabel || 'SESI 1 — KEYNOTE SPEAKER'}
          </span>
        </div>
      </div>
    </div>
  );
}
