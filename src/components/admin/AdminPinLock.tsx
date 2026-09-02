'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/TimerContext';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limiter';

export default function AdminPinLock() {
  const { state, unlockAdmin } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const roomId = state.room.roomId || 'stage-1';
  const scopeKey = `room_${roomId}`;

  const [rateLimit, setRateLimit] = useState(() => checkRateLimit(scopeKey));

  // Cooldown countdown timer when locked
  useEffect(() => {
    const timer = setInterval(() => {
      const current = checkRateLimit(scopeKey);
      setRateLimit(current);
    }, 1000);
    return () => clearInterval(timer);
  }, [scopeKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimit.isLocked) return;

    const success = unlockAdmin(pin);
    if (success) {
      resetRateLimit(scopeKey);
      setError(null);
    } else {
      const updatedLimit = recordFailedAttempt(scopeKey);
      setRateLimit(updatedLimit);
      setPin('');
      if (updatedLimit.isLocked) {
        setError(`Terlalu banyak percobaan gagal. Akses terkunci selama ${updatedLimit.lockRemainingSeconds} detik.`);
      } else {
        setError(`PIN tidak valid. Sisa percobaan: ${updatedLimit.attemptsLeft}`);
      }
    }
  };

  const handleQuickKey = (num: string) => {
    if (rateLimit.isLocked) return;
    if (pin.length < 8) {
      setPin((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    if (rateLimit.isLocked) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (rateLimit.isLocked) return;
    setPin('');
    setError(null);
  };

  const formatLockTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none font-inter">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
        
        {/* Header */}
        <div className="space-y-2">
          <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center text-xl shadow-lg border ${
            rateLimit.isLocked
              ? 'bg-red-950/80 border-red-500/50 animate-pulse text-red-400'
              : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
          }`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight uppercase">Admin Security Lock</h2>
          <p className="text-xs text-zinc-400">
            Sesi Room: <span className="text-cyan-400 font-mono font-bold uppercase">{roomId}</span>
          </p>
        </div>

        {/* Lockout Warning Banner */}
        {rateLimit.isLocked ? (
          <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-5 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-bold uppercase tracking-wider">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Akses Ditangguhkan</span>
            </div>
            <p className="text-xs text-zinc-300">
              Terlalu banyak percobaan PIN yang salah. Silakan tunggu hingga hitungan mundur selesai:
            </p>
            <div className="text-3xl font-mono font-bold text-red-400 animate-pulse pt-1">
              {formatLockTime(rateLimit.lockRemainingSeconds)}
            </div>
          </div>
        ) : (
          /* PIN Dots Display */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    pin.length > idx
                      ? 'bg-cyan-400 border-cyan-300 scale-110 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-400 font-semibold animate-shake">
                {error}
              </p>
            )}

            {/* Virtual Numpad */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleQuickKey(k)}
                  className="h-11 rounded-xl text-base font-semibold bg-zinc-800/80 hover:bg-zinc-700 active:bg-cyan-600/30 text-white border border-zinc-700/60 transition-all active:scale-95 shadow-sm"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-11 rounded-xl text-xs font-semibold bg-zinc-800/40 hover:bg-zinc-700/60 text-zinc-400 border border-zinc-700/40 transition-all active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleQuickKey('0')}
                className="h-11 rounded-xl text-base font-semibold bg-zinc-800/80 hover:bg-zinc-700 active:bg-cyan-600/30 text-white border border-zinc-700/60 transition-all active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-11 rounded-xl text-sm font-semibold bg-zinc-800/40 hover:bg-zinc-700/60 text-zinc-400 border border-zinc-700/40 transition-all active:scale-95 flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-7.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={pin.length === 0}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider"
            >
              Buka Kunci Admin
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
