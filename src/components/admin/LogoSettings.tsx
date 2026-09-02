'use client';

import React, { useRef, useState } from 'react';
import { useApp } from '@/context/TimerContext';
import { LogoPosition } from '@/types/timer';

const LOGO_POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: 'top-left', label: 'Kiri Atas' },
  { id: 'top-right', label: 'Kanan Atas' },
  { id: 'bottom-left', label: 'Kiri Bawah' },
  { id: 'bottom-right', label: 'Kanan Bawah' },
];

export default function LogoSettings() {
  const { state, updateDisplayConfig } = useApp();
  const { logoEnabled, logoUrl, logoPosition, logoSize, logoOpacity } = state.display;
  const fileRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png');
          updateDisplayConfig({ logoUrl: compressed, logoEnabled: true });
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 font-inter">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-300 font-semibold uppercase tracking-wider">Tampilkan Logo Event / Sponsor</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={logoEnabled}
            onChange={(e) => updateDisplayConfig({ logoEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
        </label>
      </div>

      {logoEnabled && (
        <div className="space-y-4 pl-3 border-l-2 border-zinc-800">
          {/* Upload */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">Upload Logo</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="w-full text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-zinc-800 file:text-zinc-300 file:cursor-pointer"
            />
            {isProcessing && (
              <span className="text-[11px] text-cyan-400 mt-1 block animate-pulse">Mengoptimasi logo...</span>
            )}
          </div>

          {/* Preview */}
          {logoUrl && (
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden p-2">
                <img src={logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              </div>
              <button
                onClick={() => updateDisplayConfig({ logoUrl: null, logoEnabled: false })}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 rounded-lg text-xs uppercase tracking-wider font-semibold transition-colors"
              >
                Hapus Logo
              </button>
            </div>
          )}

          {/* Position */}
          <div>
            <label className="text-xs text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">Posisi Logo di Layar</label>
            <div className="grid grid-cols-2 gap-2">
              {LOGO_POSITIONS.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => updateDisplayConfig({ logoPosition: pos.id })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    logoPosition === pos.id
                      ? 'bg-cyan-600 text-white ring-2 ring-cyan-400 shadow-md'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block font-semibold uppercase tracking-wider">
              Ukuran Logo — <span className="text-cyan-400 font-bold">{logoSize}%</span>
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={logoSize}
              onChange={(e) => updateDisplayConfig({ logoSize: parseInt(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block font-semibold uppercase tracking-wider">
              Transparansi (Opacity) — <span className="text-cyan-400 font-bold">{logoOpacity}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={logoOpacity}
              onChange={(e) => updateDisplayConfig({ logoOpacity: parseInt(e.target.value) })}
              className="w-full accent-cyan-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
