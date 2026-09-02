'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/TimerContext';

export default function OverlaySettings() {
  const { state, updateDisplayConfig, sendQuickMessage } = useApp();
  const { display } = state;
  const [qmText, setQmText] = useState('');
  const [qmDuration, setQmDuration] = useState(10);

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-300">📊 Progress Bar</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={display.progressBarEnabled}
              onChange={(e) => updateDisplayConfig({ progressBarEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>
        {display.progressBarEnabled && (
          <div className="pl-3 space-y-2 border-l-2 border-matador-border">
            <div className="flex gap-3">
              {(['top', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateDisplayConfig({ progressBarPosition: pos })}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    display.progressBarPosition === pos
                      ? 'bg-cyan-600 text-white'
                      : 'bg-matador-border text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {pos === 'top' ? '⬆ Atas' : '⬇ Bawah'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={display.progressBarColor}
                onChange={(e) => updateDisplayConfig({ progressBarColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-500">Warna</span>
              <input
                type="range"
                min={2}
                max={20}
                value={display.progressBarHeight}
                onChange={(e) => updateDisplayConfig({ progressBarHeight: parseInt(e.target.value) })}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-xs text-gray-500">{display.progressBarHeight}px</span>
            </div>
          </div>
        )}
      </div>

      {/* Message / Ticker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-300">📢 Message / Ticker</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={display.messageEnabled}
              onChange={(e) => updateDisplayConfig({ messageEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>
        {display.messageEnabled && (
          <div className="pl-3 space-y-2 border-l-2 border-matador-border">
            <input
              type="text"
              value={display.messageText}
              onChange={(e) => updateDisplayConfig({ messageText: e.target.value })}
              placeholder="Teks pesan / ticker..."
              className="w-full bg-matador-panel border border-matador-border rounded px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              {(['top', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => updateDisplayConfig({ messagePosition: pos })}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    display.messagePosition === pos ? 'bg-cyan-600 text-white' : 'bg-matador-border text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {pos === 'top' ? '⬆ Atas' : '⬇ Bawah'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['static', 'scroll-ticker'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => updateDisplayConfig({ messageStyle: style })}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    display.messageStyle === style ? 'bg-cyan-600 text-white' : 'bg-matador-border text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {style === 'static' ? '■ Statis' : '◀▶ Scroll'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={display.messageColor} onChange={(e) => updateDisplayConfig({ messageColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
              <span className="text-[10px] text-gray-500">Teks</span>
              <input type="color" value={display.messageBgColor} onChange={(e) => updateDisplayConfig({ messageBgColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
              <span className="text-[10px] text-gray-500">Background</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Message */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-300">⚡ Pesan Cepat</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={qmText}
            onChange={(e) => setQmText(e.target.value)}
            placeholder="BREAK 15 MENIT"
            className="flex-1 bg-matador-panel border border-matador-border rounded px-3 py-2 text-sm"
          />
          <select
            value={qmDuration}
            onChange={(e) => setQmDuration(parseInt(e.target.value))}
            className="bg-matador-panel border border-matador-border rounded px-2 py-2 text-xs"
          >
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
          <button
            onClick={() => { if (qmText.trim()) { sendQuickMessage(qmText, qmDuration); setQmText(''); } }}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-sm font-medium transition-colors"
          >
            Kirim
          </button>
        </div>
      </div>

      {/* Session Label Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-300">🏷️ Label Sesi</h4>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={display.sessionLabelVisible}
            onChange={(e) => updateDisplayConfig({ sessionLabelVisible: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
        </label>
      </div>

      {/* Tally Light */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-300">🔴 Tally Light</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={display.tallyLightEnabled}
              onChange={(e) => updateDisplayConfig({ tallyLightEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>
        {display.tallyLightEnabled && (
          <div className="flex gap-2 pl-3 border-l-2 border-matador-border">
            {(['on-air', 'standby', 'off'] as const).map((status) => (
              <button
                key={status}
                onClick={() => updateDisplayConfig({ tallyStatus: status })}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  display.tallyStatus === status
                    ? status === 'on-air' ? 'bg-red-600 text-white ring-2 ring-red-400'
                      : status === 'standby' ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                      : 'bg-gray-600 text-white ring-2 ring-gray-400'
                    : 'bg-matador-border text-gray-400 hover:bg-gray-600'
                }`}
              >
                {status === 'on-air' ? '🔴 ON AIR' : status === 'standby' ? '🟡 STANDBY' : '⬛ OFF'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
