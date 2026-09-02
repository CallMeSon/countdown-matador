'use client';

import React, { useRef, useState } from 'react';
import { useApp } from '@/context/TimerContext';
import { BackgroundType } from '@/types/timer';

export default function BackgroundSettings() {
  const { state, updateDisplayConfig } = useApp();
  const { backgroundColor, backgroundType, backgroundGradient, backgroundImage, backgroundOpacity } = state.display;
  const fileRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          updateDisplayConfig({
            backgroundImage: compressedDataUrl,
            backgroundType: 'image',
          });
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    updateDisplayConfig({
      backgroundImage: null,
      backgroundType: 'solid',
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-5 font-inter">
      {/* Type Selector */}
      <div>
        <label className="text-xs text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">Tipe Background</label>
        <div className="flex gap-2">
          {(
            [
              { id: 'solid' as BackgroundType, label: 'Solid Color' },
              { id: 'gradient' as BackgroundType, label: 'CSS Gradient' },
              { id: 'image' as BackgroundType, label: 'Gambar Kustom (WebRTC)' },
            ]
          ).map((type) => (
            <button
              key={type.id}
              onClick={() => updateDisplayConfig({ backgroundType: type.id })}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                backgroundType === type.id
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Solid Color */}
      {backgroundType === 'solid' && (
        <div>
          <label className="text-xs text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">Warna Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => updateDisplayConfig({ backgroundColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => updateDisplayConfig({ backgroundColor: e.target.value })}
              className="flex-1 bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Gradient */}
      {backgroundType === 'gradient' && (
        <div>
          <label className="text-xs text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">CSS Gradient</label>
          <input
            type="text"
            value={backgroundGradient}
            onChange={(e) => updateDisplayConfig({ backgroundGradient: e.target.value })}
            placeholder="linear-gradient(180deg, #000000, #111111)"
            className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
          />
          <p className="text-[10px] text-zinc-500 mt-1">Contoh: linear-gradient(180deg, #000, #1a1a2e)</p>
          <div 
            className="w-full h-12 rounded-lg mt-2 border border-zinc-800"
            style={{ background: backgroundGradient || 'linear-gradient(180deg, #000, #111)' }}
          />
        </div>
      )}

      {/* Image Upload with Auto WebRTC Sync Optimization */}
      {backgroundType === 'image' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block font-semibold uppercase tracking-wider">Upload Gambar Background</label>
            <p className="text-[11px] text-zinc-500 mb-2">Gambar otomatis dikompresi agar tersinkronisasi instan ke laptop panggung.</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 file:cursor-pointer"
          />

          {isProcessing && (
            <div className="text-xs text-cyan-400 font-semibold animate-pulse">
              Sedang mengoptimasi & menyinkronkan gambar...
            </div>
          )}

          {backgroundImage && (
            <div className="space-y-2">
              <div 
                className="w-full aspect-video rounded-xl border border-zinc-800 overflow-hidden bg-cover bg-center relative shadow-inner"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              >
                <div 
                  className="absolute inset-0 bg-black" 
                  style={{ opacity: 1 - backgroundOpacity / 100 }} 
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-xs bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20 uppercase tracking-wider font-semibold">
                    Gambar Tersinkronisasi ke Layar Panggung
                  </span>
                </div>
              </div>

              <button
                onClick={removeImage}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Hapus Gambar Background</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Opacity / Dark Tint Slider */}
      <div>
        <label className="text-xs text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
          Kejelasan Gambar / Kecerahan — <span className="text-cyan-400 font-bold">{backgroundOpacity}%</span>
        </label>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={backgroundOpacity}
          onChange={(e) => updateDisplayConfig({ backgroundOpacity: parseInt(e.target.value) })}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
          <span>Gelap (10%)</span>
          <span>Redup (50%)</span>
          <span>Terang Penuh (100%)</span>
        </div>
      </div>
    </div>
  );
}
