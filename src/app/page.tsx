'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSessionByPin, EventSession } from '@/lib/session-registry';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limiter';
import { getSyncChannel } from '@/lib/sync-channel';

// ============================================================
// Universal PIN Gateway — the only route at `/`
//
// A matching PIN goes straight to the stage display at /timer/<token>.
// Operators don't come through here: they open /control?room=<id> directly
// and unlock it with the same session PIN. Session/room management lives
// behind /admin only.
// ============================================================

function goToDisplay(token: string) {
  // /timer/<token> isn't a route Next's client router knows about (the token
  // is created at runtime, not at build time) — a hard navigation lets
  // Netlify's rewrite rule resolve it instead of Next's router 404-ing.
  window.location.href = `/timer/${token}/`;
}

function UniversalPinGate() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [matchedSession, setMatchedSession] = useState<EventSession | null>(null);

  const scopeKey = 'universal_gateway';
  const [rateLimit, setRateLimit] = useState(() => checkRateLimit(scopeKey));

  useEffect(() => {
    const ch = getSyncChannel('global', false);
    ch.getSupabaseSync()?.requestSessionRegistry();

    const handleUpdated = () => {
      if (pin.length >= 4) {
        checkPin(pin);
      }
    };
    window.addEventListener('matador_sessions_updated', handleUpdated);

    const timer = setInterval(() => {
      const current = checkRateLimit(scopeKey);
      setRateLimit(current);
    }, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('matador_sessions_updated', handleUpdated);
    };
  }, [pin]);

  const handleKeyPress = (num: string) => {
    if (rateLimit.isLocked) return;
    if (pin.length < 8) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);
      checkPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (rateLimit.isLocked) return;
    const newPin = pin.slice(0, -1);
    setPin(newPin);
    setError(null);
    setMatchedSession(null);
  };

  const checkPin = (currentPin: string) => {
    if (currentPin.length >= 4) {
      const session = getSessionByPin(currentPin);
      if (session) {
        setMatchedSession(session);
        resetRateLimit(scopeKey);
      } else if (currentPin.length >= 4) {
        const updated = recordFailedAttempt(scopeKey);
        setRateLimit(updated);
        if (updated.isLocked) {
          setError(`Terlalu banyak percobaan gagal. Akses ditangguhkan selama ${updated.lockRemainingSeconds} detik.`);
          setPin('');
        } else {
          setError(`PIN tidak valid. Sisa percobaan: ${updated.attemptsLeft}`);
        }
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimit.isLocked || !pin) return;
    const session = getSessionByPin(pin);
    if (session) {
      resetRateLimit(scopeKey);
      goToDisplay(session.token);
    } else {
      const updated = recordFailedAttempt(scopeKey);
      setRateLimit(updated);
      setPin('');
      if (updated.isLocked) {
        setError(`Terlalu banyak percobaan gagal. Akses ditangguhkan selama ${updated.lockRemainingSeconds} detik.`);
      } else {
        setError(`PIN tidak valid. Sisa percobaan: ${updated.attemptsLeft}`);
      }
    }
  };

  const formatLockTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-zinc-900 to-black text-white font-inter flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      <div className="max-w-sm w-full bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">

        {/* Header Badge */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto shadow-inner">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">
              Matador Broadcast Terminal
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Masukkan PIN untuk membuka layar panggung sesi Anda
            </p>
          </div>
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
              Terlalu banyak percobaan yang salah. Silakan coba kembali dalam:
            </p>
            <div className="text-4xl font-mono font-bold text-red-400 pt-1 tracking-tight">
              {formatLockTime(rateLimit.lockRemainingSeconds)}
            </div>
          </div>
        ) : matchedSession ? (
          /* Matched Session Unlocked Card */
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 space-y-4 animate-fadeIn text-left">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                Sesi Terverifikasi
              </span>
            </div>

            <div>
              <span className="text-lg font-bold text-white block leading-snug">
                {matchedSession.title}
              </span>
            </div>

            <button
              onClick={() => goToDisplay(matchedSession.token)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Buka Layar Panggung</span>
            </button>
          </div>
        ) : (
          /* Modern PIN Keypad Form */
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* PIN Dots Indicator */}
            <div className="flex justify-center gap-3 py-1">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                    pin.length > idx
                      ? 'bg-cyan-400 border-cyan-300 scale-110 shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="text-xs text-red-400 font-semibold animate-shake">
                {error}
              </div>
            )}

            {/* Virtual Numpad */}
            <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="h-12 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 active:bg-cyan-600/30 border border-zinc-700/60 text-lg font-semibold text-white transition-all active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="h-12 rounded-xl bg-zinc-800/40 hover:bg-zinc-700/60 border border-zinc-700/40 text-xs font-semibold text-zinc-400 transition-all active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-12 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 active:bg-cyan-600/30 border border-zinc-700/60 text-lg font-semibold text-white transition-all active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-xl bg-zinc-800/40 hover:bg-zinc-700/60 border border-zinc-700/40 text-sm font-semibold text-zinc-400 transition-all active:scale-95 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-7.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>
          </form>
        )}

        {/* Minimalist Footer Link */}
        <div className="pt-2 border-t border-zinc-800/80">
          <Link
            href="/admin"
            className="text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors uppercase tracking-wider font-semibold"
          >
            Akses Master Admin Hub (/admin)
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function RootPage() {
  return <UniversalPinGate />;
}
