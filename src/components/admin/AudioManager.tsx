'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { useAudioEngine } from '@/hooks/useAudioEngine';

type SoundType = 'beep' | 'chime' | 'bell' | 'horn' | 'none';
const SOUND_OPTIONS: { id: SoundType; label: string }[] = [
  { id: 'none', label: '🔇 Tidak Ada' },
  { id: 'beep', label: '🔔 Beep' },
  { id: 'chime', label: '🎵 Chime' },
  { id: 'bell', label: '🔔 Bell' },
  { id: 'horn', label: '📯 Horn' },
];

const BUZZER_OPTIONS: { id: 'buzzer' | 'horn' | 'bell' | 'chime' | 'none'; label: string }[] = [
  { id: 'buzzer', label: '🚨 Buzzer Arena' },
  { id: 'horn', label: '📯 Horn' },
  { id: 'bell', label: '🔔 Bell' },
  { id: 'chime', label: '🎵 Chime' },
  { id: 'none', label: '🔇 Tidak Ada' },
];

export default function AudioManager() {
  const { state, updateAudioConfig } = useApp();
  const { audio } = state;
  const audioEngine = useAudioEngine(audio);

  return (
    <div className="space-y-6">
      {/* 1. Pre-Start Lead-in Countdown (3..2..1..GO) */}
      <div className="bg-matador-card rounded-xl border border-matador-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-200">⏳ Hitung Mundur Sebelum Mulai (Lead-in)</h4>
            <p className="text-[11px] text-gray-400">Menampilkan hitungan mundur 3..2..1..GO! dengan bunyi beep sebelum timer utama berdetik.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={audio.preStartCountdownEnabled}
              onChange={(e) => updateAudioConfig({ preStartCountdownEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>

        {audio.preStartCountdownEnabled && (
          <div className="pt-2 border-t border-matador-border/50 flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-400">Durasi Lead-in:</span>
            {[3, 5, 10].map((dur) => (
              <button
                key={dur}
                onClick={() => updateAudioConfig({ preStartCountdownDuration: dur })}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  audio.preStartCountdownDuration === dur
                    ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                    : 'bg-matador-border text-gray-400 hover:bg-gray-600'
                }`}
              >
                {dur} Detik
              </button>
            ))}
            <button
              onClick={() => {
                audioEngine.playCountdownTick(880, 85);
                setTimeout(() => audioEngine.playCountdownTick(880, 85), 1000);
                setTimeout(() => audioEngine.playCountdownTick(880, 85), 2000);
                setTimeout(() => audioEngine.playGoSound(90), 3000);
              }}
              className="px-3 py-1.5 bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-300 rounded text-xs transition-colors"
            >
              ▶ Test Suara Lead-in
            </button>
          </div>
        )}
      </div>

      {/* 2. Final Seconds Beep (10..9..8..1) */}
      <div className="bg-matador-card rounded-xl border border-matador-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-200">⏱️ Suara Beep Detik Terakhir (Final Countdown)</h4>
            <p className="text-[11px] text-gray-400">Bunyi beep setiap detik pada sisa detik terakhir (10..9..8..1) menjelang waktu habis.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={audio.lastSecondsBeepEnabled}
              onChange={(e) => updateAudioConfig({ lastSecondsBeepEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>

        {audio.lastSecondsBeepEnabled && (
          <div className="pt-2 border-t border-matador-border/50 flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-400">Bunyi di sisa:</span>
            {[10, 5, 3].map((dur) => (
              <button
                key={dur}
                onClick={() => updateAudioConfig({ lastSecondsBeepDuration: dur })}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  audio.lastSecondsBeepDuration === dur
                    ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                    : 'bg-matador-border text-gray-400 hover:bg-gray-600'
                }`}
              >
                {dur} Detik Terakhir
              </button>
            ))}
            <button
              onClick={() => {
                audioEngine.playCountdownTick(880, 80);
                setTimeout(() => audioEngine.playCountdownTick(880, 80), 300);
                setTimeout(() => audioEngine.playCountdownTick(1200, 85), 600);
              }}
              className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded text-xs transition-colors"
            >
              ▶ Test Beep
            </button>
          </div>
        )}
      </div>

      {/* 3. Waktu Habis 00:00 (Finish Buzzer) */}
      <div className="bg-matador-card rounded-xl border border-matador-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-200">🚨 Suara Saat Waktu Tepat 00:00 (Habis)</h4>
        <div className="flex gap-2 flex-wrap">
          {BUZZER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => updateAudioConfig({ endBuzzerSoundType: opt.id })}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                audio.endBuzzerSoundType === opt.id
                  ? 'bg-red-600 text-white ring-2 ring-red-400'
                  : 'bg-matador-border text-gray-400 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {audio.endBuzzerSoundType !== 'none' && (
            <button
              onClick={() => audioEngine.playBuzzerSound(85)}
              className="px-3 py-1.5 bg-matador-border hover:bg-gray-600 rounded text-xs transition-colors"
            >
              ▶ Test Suara 00:00
            </button>
          )}
        </div>
        {audio.endBuzzerSoundType !== 'none' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={audio.endBuzzerVolume || 85}
              onChange={(e) => updateAudioConfig({ endBuzzerVolume: parseInt(e.target.value) })}
              className="flex-1 accent-cyan-500"
            />
            <span className="text-xs text-gray-400 w-8">{audio.endBuzzerVolume || 85}%</span>
          </div>
        )}
      </div>

      {/* 4. Warning Sound di Detik Tertentu */}
      <div className="bg-matador-card rounded-xl border border-matador-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-200">⚠️ Suara Peringatan / Warning Threshold</h4>
        <div className="flex gap-2 flex-wrap">
          {SOUND_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => updateAudioConfig({ warningSoundType: opt.id })}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                audio.warningSoundType === opt.id
                  ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                  : 'bg-matador-border text-gray-400 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {audio.warningSoundType !== 'none' && (
            <button
              onClick={() => audioEngine.testSound(audio.warningSoundType as 'beep' | 'chime' | 'bell' | 'horn')}
              className="px-3 py-1.5 bg-matador-border hover:bg-gray-600 rounded text-xs transition-colors"
            >
              ▶ Test
            </button>
          )}
        </div>
        {audio.warningSoundType !== 'none' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={audio.warningSoundVolume}
              onChange={(e) => updateAudioConfig({ warningSoundVolume: parseInt(e.target.value) })}
              className="flex-1 accent-cyan-500"
            />
            <span className="text-xs text-gray-400 w-8">{audio.warningSoundVolume}%</span>
          </div>
        )}
      </div>

      {/* 5. Start / End Melodi */}
      <div className="bg-matador-card rounded-xl border border-matador-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-200">🎵 Melodi Nada Start</h4>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={audio.startSoundEnabled}
              onChange={(e) => updateAudioConfig({ startSoundEnabled: e.target.checked })}
              className="accent-cyan-500"
            />
            <span className="text-sm text-gray-300">Bunyi Fanfare saat Start</span>
          </label>
        </div>
      </div>

      {/* 6. Background Music */}
      <div className="bg-matador-card rounded-xl border border-matador-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-200">🎶 Background Music (MP3)</h4>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={audio.bgMusicEnabled}
              onChange={(e) => updateAudioConfig({ bgMusicEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-matador-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-cyan-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>
        {audio.bgMusicEnabled && (
          <div className="space-y-2">
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  updateAudioConfig({ bgMusicUrl: url });
                  audioEngine.setBgMusicUrl(url);
                }
              }}
              className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-matador-border file:text-gray-300 file:cursor-pointer"
            />
            <div className="flex gap-2">
              <button onClick={audioEngine.playBgMusic} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors">▶ Play</button>
              <button onClick={audioEngine.pauseBgMusic} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs transition-colors">⏸ Pause</button>
              <button onClick={audioEngine.stopBgMusic} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors">⏹ Stop</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={audio.bgMusicVolume}
                onChange={(e) => updateAudioConfig({ bgMusicVolume: parseInt(e.target.value) })}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-xs text-gray-400 w-8">{audio.bgMusicVolume}%</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={audio.bgMusicLoop}
                onChange={(e) => updateAudioConfig({ bgMusicLoop: e.target.checked })}
                className="accent-cyan-500"
              />
              <span className="text-xs text-gray-300">Loop Otomatis</span>
            </label>
          </div>
        )}
      </div>

      {/* 7. Master Controls */}
      <div className="bg-matador-card rounded-xl border border-matador-border p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-200">🔊 Master Audio</h4>
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateAudioConfig({ masterMute: !audio.masterMute })}
            className={`px-3 py-2 rounded text-lg transition-all ${
              audio.masterMute ? 'bg-red-600 text-white' : 'bg-matador-border text-gray-300 hover:bg-gray-600'
            }`}
          >
            {audio.masterMute ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={audio.masterVolume}
            onChange={(e) => updateAudioConfig({ masterVolume: parseInt(e.target.value) })}
            className="flex-1 accent-cyan-500"
            disabled={audio.masterMute}
          />
          <span className="text-sm text-gray-400 w-10">{audio.masterMute ? 'MUTE' : `${audio.masterVolume}%`}</span>
        </div>
      </div>
    </div>
  );
}
