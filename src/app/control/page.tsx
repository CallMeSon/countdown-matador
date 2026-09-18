'use client';

import { useEffect, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useCountdownBeep } from '@/hooks/useCountdownBeep';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useRoom } from '@/hooks/useRoom';
import { timerStore } from '@/lib/timer-store';
import { generateRoomCode } from '@/lib/room-code';
import { PRESET_DURATIONS } from '@/types/timer';
import { NavLinkMenu } from '@/components/NavLinkMenu';

const PRESET_LABELS: Record<number, string> = {
  60: '1 MENIT',
  180: '3 MENIT',
  300: '5 MENIT',
  600: '10 MENIT',
  900: '15 MENIT',
  1800: '30 MENIT',
};

const sanitize = (raw: string, max: number): string =>
  raw.replace(/\D/g, '').slice(0, max);

const pad2 = (raw: string): string => raw.padStart(2, '0');

const clamp = (raw: string, min: number, max: number): string => {
  if (raw === '') return raw;
  return String(Math.min(max, Math.max(min, Number(raw))));
};

export default function ControlPage() {
  const { ready, room, lastUsedRoom, setRoom } = useRoom();

  useEffect(() => {
    if (room) timerStore.setRoom(room);
  }, [room]);

  if (!ready) {
    return <main className="min-h-screen bg-zinc-950" />;
  }

  if (!room) {
    return <RoomGate lastUsedRoom={lastUsedRoom} onSubmit={setRoom} />;
  }

  return <ControlBody room={room} />;
}

function RoomGate({
  lastUsedRoom,
  onSubmit,
}: {
  lastUsedRoom: string | null;
  onSubmit: (code: string) => void;
}) {
  const [joinCode, setJoinCode] = useState(lastUsedRoom ?? '');

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <header>
          <h1 className="text-2xl font-bold tracking-widest">CONTROL</h1>
          <p className="mt-1 text-sm text-zinc-400">Buat room baru atau gabung ke room yang sudah ada</p>
        </header>

        <button
          onClick={() => onSubmit(generateRoomCode())}
          className="w-full rounded-xl bg-emerald-500 px-6 py-4 text-lg font-bold tracking-widest text-black hover:bg-emerald-400"
        >
          BUAT ROOM BARU
        </button>

        <div className="flex items-center gap-3 text-xs font-semibold tracking-widest text-zinc-500">
          <div className="h-px flex-1 bg-zinc-800" />
          ATAU
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) onSubmit(joinCode);
          }}
          className="space-y-3"
        >
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="KODE ROOM"
            aria-label="Kode room"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] uppercase focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold tracking-widest hover:bg-zinc-700"
          >
            GABUNG ROOM
          </button>
        </form>

        {lastUsedRoom && (
          <button
            onClick={() => onSubmit(lastUsedRoom)}
            className="w-full rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            Lanjutkan room terakhir: {lastUsedRoom}
          </button>
        )}
      </div>
    </main>
  );
}

function ControlBody({ room }: { room: string }) {
  const { state, displayTime, isOvertime, secondsLeft } = useTimer();
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const [hh, setHh] = useState('00');
  const [mm, setMm] = useState('00');
  const [durationMode, setDurationMode] = useState<'normal' | 'target' | 'now'>('normal');
  const nowTime = useLiveClock(durationMode === 'now');
  const [adjustPulse, setAdjustPulse] = useState(0);
  const [flash, setFlash] = useState<{ id: number; delta: number } | null>(null);
  const [stageText, setStageText] = useState('');
  const [showOnTimer, setShowOnTimer] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const { beepRef, beepBlocked, unlockBeep } = useCountdownBeep(
    secondsLeft,
    isOvertime,
    state,
    soundOn,
  );

  const statusLabel: Record<string, string> = {
    idle: 'SIAP',
    running: 'JALAN',
    paused: 'PAUSE',
    overtime: 'OVERTIME',
  };
  const statusColor: Record<string, string> = {
    idle: 'text-zinc-400',
    running: 'text-emerald-400',
    paused: 'text-amber-400',
    overtime: 'text-red-500',
  };

  const isRun = state.status === 'running' || state.status === 'overtime';

  const selectDurationMode = (mode: 'normal' | 'target' | 'now') => {
    setDurationMode(mode);
  };

  // START & RESET adalah pemicu yang benar-benar menyiarkan mode ke /timer & /matador.
  // Ganti dropdown doang cuma preview lokal — timer/jam yang lagi tayang di layar lain
  // tetap yang sebelumnya sampai salah satu tombol ini ditekan.
  const triggerDisplayMode = () => {
    timerStore.setDisplayMode(durationMode === 'now' ? 'clock' : 'timer');
  };

  const handleStart = () => {
    triggerDisplayMode();
    if (durationMode !== 'now') {
      timerStore.start();
    }
  };

  const handleReset = () => {
    triggerDisplayMode();
    timerStore.reset();
  };

  const handleAdjust = (delta: number) => {
    timerStore.addSeconds(delta);
    setAdjustPulse((p) => p + 1);
    setFlash({ id: Date.now() + Math.random(), delta });
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        <audio ref={beepRef} src="/beeps.mp3" data-testid="beep-audio" preload="auto" />
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-widest">CONTROL</h1>
          <p data-testid="status-label" className={`text-sm font-semibold tracking-widest ${statusColor[state.status]}`}>
            {statusLabel[state.status]}
          </p>
          <p className="mt-2 text-xs tracking-widest text-zinc-500">
            ROOM: <span className="font-semibold text-zinc-300">{room}</span>
          </p>
        </header>

        {/* Preview timer + penyesuaian waktu (ala YouTube: kiri kurangi, kanan tambah) */}
        <div className="flex items-stretch gap-2">
          {isRun && (
            <div className="flex flex-col justify-center gap-2">
              {[5, 15, 30, 60].map((s) => (
                <button
                  key={`-${s}`}
                  onClick={() => handleAdjust(-s)}
                  className="w-14 shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-2 text-xs font-bold tracking-wide text-zinc-300 transition-transform active:scale-90 hover:border-red-600 hover:bg-red-950/40 hover:text-red-400"
                >
                  -{s < 60 ? `${s}D` : '1M'}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 rounded-2xl border border-zinc-800 bg-black p-10 text-center shadow-[0_0_40px_-15px_rgba(0,0,0,0.8)]">
            <div
              key={adjustPulse}
              data-testid="preview-time"
              className={`timer-digits font-anton text-8xl md:text-9xl ${
                isOvertime ? 'text-red-500' : 'text-white'
              } ${adjustPulse > 0 ? 'anim-pop' : ''}`}
            >
              {displayTime}
            </div>
            {flash && (
              <div
                key={flash.id}
                onAnimationEnd={() => setFlash(null)}
                className={`anim-adjust-float pointer-events-none absolute right-6 top-6 text-2xl font-bold tracking-wider ${
                  flash.delta > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {flash.delta > 0 ? `+${flash.delta}` : flash.delta}
              </div>
            )}
          </div>

          {isRun && (
            <div className="flex flex-col justify-center gap-2">
              {[5, 15, 30, 60].map((s) => (
                <button
                  key={`+${s}`}
                  onClick={() => handleAdjust(s)}
                  className="w-14 shrink-0 rounded-lg border border-emerald-700 bg-emerald-900/20 px-1 py-2 text-xs font-bold tracking-wide text-emerald-400 transition-transform active:scale-90 hover:bg-emerald-900/40"
                >
                  +{s < 60 ? `${s}D` : '1M'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode durasi */}
        <section>
          <label
            htmlFor="duration-mode"
            className="mb-1 block text-xs font-semibold tracking-widest text-zinc-400"
          >
            MODE DURASI
          </label>
          <select
            id="duration-mode"
            value={durationMode}
            onChange={(e) => selectDurationMode(e.target.value as 'normal' | 'target' | 'now')}
            className="w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold tracking-widest text-white transition-colors hover:border-zinc-600 focus:border-emerald-500 focus:outline-none"
          >
            <option value="normal">TIMER BIASA</option>
            <option value="target">TIMER KE JAM</option>
            <option value="now">JAM SAAT INI</option>
          </select>
        </section>

        {durationMode === 'now' ? (
          <section className="text-center">
            <span className="mb-1 block text-xs font-semibold tracking-widest text-zinc-400">
              JAM SAAT INI
            </span>
            <div
              data-testid="current-time"
              className="timer-digits rounded-xl border border-zinc-800 bg-zinc-900 py-4 font-anton text-5xl tracking-widest text-emerald-400"
            >
              {nowTime}
            </div>
          </section>
        ) : durationMode === 'normal' ? (
          <>
            {/* Preset */}
            <section>
              <h2 className="mb-3 text-xs font-semibold tracking-widest text-zinc-400">DURASI</h2>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => timerStore.setDuration(d)}
                    className={`rounded-xl border px-4 py-3 font-semibold tracking-wider transition-all active:scale-95 ${
                      state.duration === d
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                    }`}
                  >
                    {PRESET_LABELS[d]}
                  </button>
                ))}
              </div>
            </section>

            {/* Custom duration */}
            <section className="flex items-end gap-3">
              <div className="flex-1">
                <span className="mb-1 block text-xs font-semibold tracking-widest text-zinc-400">
                  DURASI CUSTOM (MM:SS)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    data-testid="duration-minutes"
                    aria-label="MENIT"
                    value={minutes}
                    onChange={(e) => setMinutes(sanitize(e.target.value, 3))}
                    onBlur={() => setMinutes(pad2(minutes))}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-lg tracking-widest focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="pb-1 text-lg font-semibold tracking-widest text-zinc-400">:</span>
                  <input
                    data-testid="duration-seconds"
                    aria-label="DETIK"
                    value={seconds}
                    onChange={(e) => setSeconds(sanitize(e.target.value, 2))}
                    onBlur={() => setSeconds(pad2(seconds))}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-lg tracking-widest focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const total = Number(minutes) * 60 + Number(seconds);
                  if (total > 0) timerStore.setDuration(total);
                }}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold tracking-widest transition-transform active:scale-95 hover:bg-zinc-700"
              >
                SET
              </button>
            </section>
          </>
        ) : (
          /* Countdown ke jam tertentu */
          <section className="flex items-end gap-3">
            <div className="flex-1">
              <span className="mb-1 block text-xs font-semibold tracking-widest text-zinc-400">
                KE JAM (HH:MM)
              </span>
              <div className="flex items-center gap-2">
                <input
                  data-testid="target-hour"
                  aria-label="JAM"
                  value={hh}
                  onChange={(e) => setHh(sanitize(e.target.value, 2))}
                  onBlur={() => setHh(pad2(clamp(hh, 0, 23)))}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-lg tracking-widest focus:border-emerald-500 focus:outline-none"
                />
                <span className="pb-1 text-lg font-semibold tracking-widest text-zinc-400">:</span>
                <input
                  data-testid="target-minute"
                  aria-label="MENIT-JAM"
                  value={mm}
                  onChange={(e) => setMm(sanitize(e.target.value, 2))}
                  onBlur={() => setMm(pad2(clamp(mm, 0, 59)))}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-lg tracking-widest focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => {
                const now = new Date();
                const targetHH = Math.min(23, Math.max(0, Number(hh) || 0));
                const targetMM = Math.min(59, Math.max(0, Number(mm) || 0));
                const target = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                  targetHH,
                  targetMM,
                  0,
                  0,
                );
                if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
                const diffSeconds = Math.round((target.getTime() - Date.now()) / 1000);
                if (diffSeconds > 0) {
                  timerStore.setDisplayMode('timer');
                  timerStore.setDuration(diffSeconds);
                  timerStore.start();
                }
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold tracking-widest transition-transform active:scale-95 hover:bg-zinc-700"
            >
              MULAI KE JAM
            </button>
          </section>
        )}

        {/* Kontrol utama */}
        <section className="flex gap-3">
          {durationMode === 'now' ? (
            <button
              onClick={handleStart}
              className="flex-1 rounded-xl bg-emerald-500 px-6 py-4 text-xl font-bold tracking-widest text-black transition-transform active:scale-95 hover:bg-emerald-400"
            >
              START
            </button>
          ) : isRun ? (
            <button
              onClick={() => timerStore.pause()}
              className="flex-1 rounded-xl bg-amber-500 px-6 py-4 text-xl font-bold tracking-widest text-black transition-transform active:scale-95 hover:bg-amber-400"
            >
              PAUSE
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={state.status === 'idle' && state.duration <= 0}
              className="flex-1 rounded-xl bg-emerald-500 px-6 py-4 text-xl font-bold tracking-widest text-black transition-transform active:scale-95 hover:bg-emerald-400 disabled:active:scale-100"
            >
              START
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-4 text-xl font-bold tracking-widest transition-transform active:scale-95 hover:bg-zinc-800"
          >
            RESET
          </button>
        </section>

        {/* Pesan ke panggung */}
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-zinc-400">PESAN KE PANGGUNG</h2>
          {state.stageMessage ? (
            <div className="space-y-2 rounded-xl border border-amber-700/60 bg-amber-900/10 p-4">
              <p className="text-xs font-semibold tracking-widest text-amber-400">PESAN AKTIF</p>
              <p className="break-words text-sm text-zinc-200">{state.stageMessage.text}</p>
              <button
                onClick={() => timerStore.hideStageMessage()}
                className="w-full rounded-xl bg-amber-500 px-6 py-3 font-bold tracking-widest text-black transition-transform active:scale-95 hover:bg-amber-400"
              >
                DONE / HIDE
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                data-testid="stage-text"
                aria-label="Pesan ke panggung"
                value={stageText}
                onChange={(e) => setStageText(e.target.value.slice(0, 255))}
                placeholder="Pesan ke panggung..."
                rows={2}
                maxLength={255}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-right text-[11px] text-zinc-500">{stageText.length}/255</p>
              <label className="flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-400">
                <input
                  type="checkbox"
                  checked={showOnTimer}
                  onChange={(e) => setShowOnTimer(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
                />
                TAMPILKAN JUGA DI LAYAR TIMER
              </label>
              <button
                onClick={() => {
                  timerStore.sendStageMessage(stageText, showOnTimer);
                  setStageText('');
                }}
                disabled={stageText.trim().length === 0}
                className="w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold tracking-widest text-black transition-transform active:scale-95 hover:bg-emerald-400 disabled:opacity-40 disabled:active:scale-100"
              >
                KIRIM
              </button>
            </div>
          )}
        </section>

        {/* Navigasi halaman */}
        <section className="flex gap-3">
          <NavLinkMenu label="TIMER" path={`/timer?room=${room}`} className="flex-1" />
          <NavLinkMenu label="MATADOR" path={`/matador?room=${room}`} className="flex-1" />
          <button
            onClick={() => setSoundOn((v) => !v)}
            className={`rounded-xl border px-6 py-4 text-xl font-bold tracking-widest transition-colors ${
              soundOn
                ? 'border-emerald-600 bg-emerald-600/10 text-emerald-400'
                : 'border-zinc-700 bg-zinc-900 text-zinc-500'
            }`}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
        </section>
        {beepBlocked && (
          <button
            onClick={unlockBeep}
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-red-600 px-5 py-3 font-bold tracking-widest text-white shadow-lg"
          >
            🔊 KLIK UNTUK SUARA
          </button>
        )}
      </div>
    </main>
  );
}

