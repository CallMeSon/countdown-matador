'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { FontFamily, TimerFormat } from '@/types/timer';

const FONT_OPTIONS: { id: FontFamily; label: string }[] = [
  { id: 'anton', label: 'Anton' },
  { id: 'bebas', label: 'Bebas Neue' },
  { id: 'inter', label: 'Inter' },
];

const WEIGHT_OPTIONS: { id: 'normal' | 'semibold' | 'bold' | 'black'; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'semibold', label: 'Semi Bold' },
  { id: 'bold', label: 'Bold' },
  { id: 'black', label: 'Extra Bold' },
];

const FORMAT_OPTIONS: { id: TimerFormat; label: string }[] = [
  { id: 'MM:SS', label: 'MM:SS (05:00)' },
  { id: 'MM:SS.ms', label: 'MM:SS.ms (05:00.00)' },
  { id: 'HH:MM:SS', label: 'HH:MM:SS (00:05:00)' },
  { id: 'HH:MM:SS.ms', label: 'HH:MM:SS.ms (00:05:00.00)' },
  { id: 'H:MM:SS', label: 'H:MM:SS (0:05:00)' },
];

const COLOR_FIELDS = [
  { key: 'normalColor' as const, label: 'Normal (Countdown)' },
  { key: 'warningColor' as const, label: 'Warning' },
  { key: 'overtimeColor' as const, label: 'Overtime' },
  { key: 'wibColor' as const, label: 'Jam WIB' },
];

export default function AppearanceSettings() {
  const { state, updateDisplayConfig } = useApp();
  const { fontFamily, fontWeight = 'bold', timerFormat, showMilliseconds, fontSize, normalColor, overtimeColor, warningColor, wibColor } = state.display;

  const colorValues: Record<string, string> = { normalColor, overtimeColor, warningColor, wibColor };

  return (
    <div className="space-y-5">
      {/* Font Family */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Font Family</label>
        <div className="flex gap-3">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.id}
              onClick={() => updateDisplayConfig({ fontFamily: font.id })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                fontFamily === font.id
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                  : 'bg-matador-border text-gray-300 hover:bg-gray-600'
              }`}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Weight (Bold Controls) */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Ketebalan Font (Bold)</label>
        <div className="flex gap-2">
          {WEIGHT_OPTIONS.map((weight) => (
            <button
              key={weight.id}
              onClick={() => updateDisplayConfig({ fontWeight: weight.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                fontWeight === weight.id
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                  : 'bg-matador-border text-gray-300 hover:bg-gray-600'
              }`}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timer Format */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Format Waktu</label>
        <div className="flex gap-2 flex-wrap">
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => updateDisplayConfig({ timerFormat: fmt.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                timerFormat === fmt.id
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                  : 'bg-matador-border text-gray-300 hover:bg-gray-600'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Milliseconds Toggle */}
      <div className="bg-matador-panel p-3 rounded-lg border border-matador-border flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-gray-200 block">⚡ Tampilkan Milidetik (.ms / 00–99)</span>
          <span className="text-[10px] text-gray-400">Angka milidetik berputar cepat (60 FPS) di sebelah detik untuk efek dinamis.</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showMilliseconds || timerFormat.includes('.ms')}
            onChange={(e) => updateDisplayConfig({ showMilliseconds: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
        </label>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">
          Ukuran Font — <span className="text-cyan-400 font-bold">{fontSize}%</span>
        </label>
        <input
          type="range"
          min={50}
          max={200}
          step={5}
          value={fontSize}
          onChange={(e) => updateDisplayConfig({ fontSize: parseInt(e.target.value) })}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>50%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      {/* Colors */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Warna Tampilan</label>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <span className="text-[10px] text-gray-500">{field.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorValues[field.key]}
                  onChange={(e) => updateDisplayConfig({ [field.key]: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={colorValues[field.key]}
                  onChange={(e) => updateDisplayConfig({ [field.key]: e.target.value })}
                  className="flex-1 bg-matador-panel border border-matador-border rounded px-2 py-1 text-xs font-mono uppercase"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
