'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/TimerContext';

type InputModeTab = 'direct' | 'quick-add' | 'keypad';

export default function DurationInput() {
  const { state, setDuration, setCountdownTarget, startTimer } = useApp();
  const { mode, totalDuration, countdownTarget } = state.timer;
  
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [inputTab, setInputTab] = useState<InputModeTab>('direct');
  const [targetTime, setTargetTime] = useState(countdownTarget || '14:00');
  const [keypadBuffer, setKeypadBuffer] = useState('0500'); // MMSS or HHMMSS buffer

  useEffect(() => {
    if (totalDuration >= 0) {
      const h = Math.floor(totalDuration / 3600);
      const m = Math.floor((totalDuration % 3600) / 60);
      const s = totalDuration % 60;
      setHours(h);
      setMinutes(m);
      setSeconds(s);
      const padded = `${h > 0 ? h.toString().padStart(2, '0') : ''}${m.toString().padStart(2, '0')}${s.toString().padStart(2, '0')}`;
      setKeypadBuffer(padded || '0000');
    }
  }, [totalDuration]);

  // Apply duration to context
  const handleApply = (shouldStart = false) => {
    const total = hours * 3600 + minutes * 60 + seconds;
    if (total > 0) {
      setDuration(total);
      if (shouldStart) {
        setTimeout(() => startTimer(), 50);
      }
    }
  };

  // Quick adjust helper
  const addSeconds = (secToAdd: number) => {
    const current = hours * 3600 + minutes * 60 + seconds;
    const newTotal = Math.max(0, current + secToAdd);
    setHours(Math.floor(newTotal / 3600));
    setMinutes(Math.floor((newTotal % 3600) / 60));
    setSeconds(newTotal % 60);
  };

  const clearAll = () => {
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setKeypadBuffer('');
  };

  // Keypad number entry handler
  const handleKeypadPress = (digit: string) => {
    if (digit === 'C') {
      clearAll();
      return;
    }
    if (digit === 'BACK') {
      const newBuf = keypadBuffer.slice(0, -1);
      setKeypadBuffer(newBuf);
      parseKeypadBuffer(newBuf);
      return;
    }
    if (keypadBuffer.length >= 6) return;
    const newBuf = (keypadBuffer + digit).replace(/^0+/, '');
    setKeypadBuffer(newBuf);
    parseKeypadBuffer(newBuf);
  };

  const parseKeypadBuffer = (buf: string) => {
    const padded = buf.padStart(4, '0');
    if (padded.length <= 4) {
      const m = parseInt(padded.slice(-4, -2)) || 0;
      const s = parseInt(padded.slice(-2)) || 0;
      setHours(0);
      setMinutes(m);
      setSeconds(s);
    } else {
      const h = parseInt(padded.slice(0, -4)) || 0;
      const m = parseInt(padded.slice(-4, -2)) || 0;
      const s = parseInt(padded.slice(-2)) || 0;
      setHours(h);
      setMinutes(m);
      setSeconds(s);
    }
  };

  if (mode === 'countdown-to-time') {
    return (
      <div className="space-y-4">
        <label className="text-xs text-gray-400 block">Pilih Waktu Target (WIB - Asia/Jakarta):</label>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            className="flex-1 bg-matador-panel border border-matador-border rounded-lg px-4 py-3 text-2xl font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500 text-center"
          />
          <button
            onClick={() => { if (targetTime) setCountdownTarget(targetTime); }}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
          >
            Terapkan Target
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Timer akan otomatis menghitung mundur ke jam {targetTime} WIB hari ini.
        </p>
      </div>
    );
  }

  if (mode === 'stopwatch') {
    return (
      <div className="p-4 bg-matador-panel rounded-lg border border-matador-border text-center text-sm text-gray-400">
        ⏱️ Mode <strong>Stopwatch</strong> siap. Tekan <strong>MULAI (SPASI)</strong> untuk mulai menghitung maju dari 00:00:00.
      </div>
    );
  }

  if (mode === 'realtime-wib') {
    return (
      <div className="p-4 bg-matador-panel rounded-lg border border-matador-border text-center text-sm text-cyan-400">
        🕒 Mode <strong>Jam WIB Realtime (Asia/Jakarta)</strong> aktif dan berjalan otomatis.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Input Mode Selector Tabs */}
      <div className="flex gap-1.5 p-1 bg-black/40 border border-matador-border rounded-lg">
        <button
          onClick={() => setInputTab('direct')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
            inputTab === 'direct' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Ketik Langsung
        </button>
        <button
          onClick={() => setInputTab('quick-add')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
            inputTab === 'quick-add' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Tambah Cepat
        </button>
        <button
          onClick={() => setInputTab('keypad')}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
            inputTab === 'keypad' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Keypad
        </button>
      </div>

      {/* 1. DIRECT DIGITAL TIME BOX */}
      {inputTab === 'direct' && (
        <div className="space-y-3">
          <div className="bg-black/60 border border-matador-border rounded-xl p-4 flex items-center justify-center gap-2 sm:gap-4 shadow-inner">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-bold">Jam</span>
              <input
                type="number"
                min={0}
                max={99}
                value={hours.toString().padStart(2, '0')}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 sm:w-20 py-2 bg-matador-panel border border-matador-border focus:border-cyan-400 rounded-lg text-center text-2xl sm:text-3xl font-bold font-mono text-cyan-300 focus:outline-none"
              />
            </div>

            <span className="text-2xl font-bold text-zinc-600 mt-4">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-bold">Menit</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minutes.toString().padStart(2, '0')}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-16 sm:w-20 py-2 bg-matador-panel border border-matador-border focus:border-cyan-400 rounded-lg text-center text-2xl sm:text-3xl font-bold font-mono text-cyan-300 focus:outline-none"
              />
            </div>

            <span className="text-2xl font-bold text-zinc-600 mt-4">:</span>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-bold">Detik</span>
              <input
                type="number"
                min={0}
                max={59}
                value={seconds.toString().padStart(2, '0')}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-16 sm:w-20 py-2 bg-matador-panel border border-matador-border focus:border-cyan-400 rounded-lg text-center text-2xl sm:text-3xl font-bold font-mono text-cyan-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. QUICK ADD MODIFIERS */}
      {inputTab === 'quick-add' && (
        <div className="space-y-3">
          <div className="bg-black/60 border border-matador-border rounded-xl p-3 text-center">
            <span className="text-xs text-zinc-400 block mb-1 font-medium">Durasi Saat Ini:</span>
            <span className="text-3xl font-mono font-bold text-cyan-300">
              {hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''}
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => addSeconds(60)} className="py-2.5 bg-matador-border hover:bg-zinc-700 rounded-lg text-xs font-bold text-emerald-300 transition-colors">
              +1 Menit
            </button>
            <button onClick={() => addSeconds(300)} className="py-2.5 bg-matador-border hover:bg-zinc-700 rounded-lg text-xs font-bold text-emerald-300 transition-colors">
              +5 Menit
            </button>
            <button onClick={() => addSeconds(600)} className="py-2.5 bg-matador-border hover:bg-zinc-700 rounded-lg text-xs font-bold text-emerald-300 transition-colors">
              +10 Menit
            </button>
            <button onClick={() => addSeconds(900)} className="py-2.5 bg-matador-border hover:bg-zinc-700 rounded-lg text-xs font-bold text-emerald-300 transition-colors">
              +15 Menit
            </button>
            <button onClick={() => addSeconds(30)} className="py-2.5 bg-matador-border hover:bg-zinc-700 rounded-lg text-xs font-bold text-cyan-300 transition-colors">
              +30 Detik
            </button>
            <button onClick={() => addSeconds(-60)} className="py-2.5 bg-matador-border hover:bg-zinc-700 rounded-lg text-xs font-bold text-red-300 transition-colors">
              -1 Menit
            </button>
            <button onClick={() => addSeconds(-30)} className="py-2.5 bg-matador-border hover:bg-zinc-700 rounded-lg text-xs font-bold text-red-300 transition-colors">
              -30 Detik
            </button>
            <button onClick={clearAll} className="py-2.5 bg-red-900/40 hover:bg-red-800/60 rounded-lg text-xs font-bold text-red-300 transition-colors">
              Reset 00:00
            </button>
          </div>
        </div>
      )}

      {/* 3. KEYPAD NUMPAD MODE */}
      {inputTab === 'keypad' && (
        <div className="space-y-3">
          <div className="bg-black/60 border border-matador-border rounded-xl p-3 text-center">
            <span className="text-xs text-zinc-400 block mb-1 font-medium">Preview Angka:</span>
            <span className="text-3xl font-mono font-bold text-cyan-300">
              {hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''}
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BACK'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeypadPress(key)}
                className={`py-3 rounded-lg text-base font-bold transition-colors ${
                  key === 'C' ? 'bg-red-900/40 hover:bg-red-800 text-red-300' :
                  key === 'BACK' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center' :
                  'bg-matador-panel hover:bg-zinc-700 border border-matador-border text-white'
                }`}
              >
                {key === 'BACK' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-7.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                ) : key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS: Terapkan & Terapkan + Mulai */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleApply(false)}
          className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Terapkan Durasi</span>
        </button>
        <button
          onClick={() => handleApply(true)}
          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Terapkan & Mulai</span>
        </button>
      </div>
    </div>
  );
}
