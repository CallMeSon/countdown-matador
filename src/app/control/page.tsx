'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTimer } from '@/hooks/useTimer';
import { useCountdownBeep } from '@/hooks/useCountdownBeep';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useRoom } from '@/hooks/useRoom';
import { timerStore } from '@/lib/timer-store';
import { generateRoomCode } from '@/lib/room-code';
import { DEFAULT_APPEARANCE, PRESET_DURATIONS } from '@/types/timer';
import { RoomGate } from '@/components/RoomGate';
import { NavLinkMenu } from '@/components/NavLinkMenu';
import { StagePreview } from '@/components/stage/StagePreview';
import { AppNav } from '@/components/ui/AppNav';
import { PageShell } from '@/components/ui/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Disclosure } from '@/components/ui/Disclosure';

const PRESET_LABELS: Record<number, string> = {
  60: '1 MENIT',
  180: '3 MENIT',
  300: '5 MENIT',
  600: '10 MENIT',
  900: '15 MENIT',
  1800: '30 MENIT',
};

const ADJUST_STEPS = [5, 15, 30, 60];

const sectionTitle = 'font-label text-[13px] font-medium uppercase tracking-[0.12em] text-sub';

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
    return <main className="min-h-screen bg-page" />;
  }

  if (!room) {
    return <RoomGate lastUsedRoom={lastUsedRoom} onSubmit={setRoom} />;
  }

  return <ControlBody room={room} />;
}

function ControlBody({ room }: { room: string }) {
  const { state, displayTime, isOvertime, secondsLeft } = useTimer();
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const [hh, setHh] = useState('00');
  const [mm, setMm] = useState('00');
  const [durationMode, setDurationMode] = useState<'normal' | 'target' | 'now'>('normal');
  const nowTime = useLiveClock(durationMode === 'now');
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

  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  // Mode JAM SAAT INI: preview menunjukkan apa yang tampil setelah START.
  const previewState = durationMode === 'now' ? { ...state, displayMode: 'clock' as const } : state;
  const statusLabel: Record<string, string> = {
    idle: 'SIAP',
    running: 'JALAN',
    paused: 'PAUSE',
    overtime: 'OVERTIME',
  };
  const statusColor: Record<string, string> = {
    idle: 'bg-well text-sub',
    running: 'bg-accent text-on-accent',
    paused: 'bg-highlight text-ink',
    overtime: 'bg-danger text-on-accent',
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
    setFlash({ id: Date.now() + Math.random(), delta });
  };

  return (
    <PageShell>
        <audio ref={beepRef} src="/beeps.mp3" data-testid="beep-audio" preload="auto" />
        <AppNav room={room} active="control" />

        <h1 className="sr-only">Control</h1>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_416px]">
          {/* Kolom kiri: timer */}
          <div className="space-y-8">
            {/* Preview layar TIMER dan MATADOR */}
            <section aria-label="Preview layar" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={sectionTitle}>PREVIEW LAYAR</span>
                <p
                  data-testid="status-label"
                  className={`rounded-chip px-2 py-0.5 font-label text-[12.5px] font-medium tracking-[0.12em] ${statusColor[state.status]}`}
                >
                  {statusLabel[state.status]}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <StagePreview page="timer" state={previewState} label="Layar Timer" testId="preview-timer">
                  {flash && (
                    <div
                      key={flash.id}
                      onAnimationEnd={() => setFlash(null)}
                      className={`anim-adjust-float pointer-events-none absolute right-3 top-3 z-10 text-xl font-bold tracking-wider ${
                        flash.delta > 0 ? 'text-accent' : 'text-red-400'
                      }`}
                    >
                      {flash.delta > 0 ? `+${flash.delta}` : flash.delta}
                    </div>
                  )}
                </StagePreview>
                <StagePreview page="matador" state={previewState} label="Layar Matador" testId="preview-matador" />
              </div>
            </section>

            {/* Kontrol utama */}
            <section className="space-y-2">
              <div className="flex gap-3">
                {durationMode === 'now' ? (
                  <Button variant="accent" size="lg" onClick={handleStart} className="flex-1 tracking-wide">
                    START
                  </Button>
                ) : isRun ? (
                  <Button variant="highlight" size="lg" onClick={() => timerStore.pause()} className="flex-1 tracking-wide">
                    PAUSE
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="lg"
                    onClick={handleStart}
                    disabled={state.status === 'idle' && state.duration <= 0}
                    className="flex-1 tracking-wide"
                  >
                    START
                  </Button>
                )}
                <Button variant="ghost" size="lg" onClick={handleReset} className="flex-1 tracking-wide">
                  RESET
                </Button>
              </div>
            </section>

            {/* Tambah / kurangi waktu saat timer jalan */}
            {isRun && (
              <section aria-label="Sesuaikan waktu" className="space-y-3">
                <span className={`block ${sectionTitle}`}>SESUAIKAN WAKTU</span>
                <div role="group" aria-label="Kurangi waktu" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ADJUST_STEPS.map((s) => (
                    <Button
                      key={`-${s}`}
                      variant="ghost"
                      onClick={() => handleAdjust(-s)}
                      aria-label={`-${s < 60 ? `${s}D` : '1M'}`}
                    >
                      -{s < 60 ? `${s} dtk` : '1 mnt'}
                    </Button>
                  ))}
                </div>
                <div role="group" aria-label="Tambah waktu" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ADJUST_STEPS.map((s) => (
                    <Button
                      key={`+${s}`}
                      variant="ghost"
                      onClick={() => handleAdjust(s)}
                      aria-label={`+${s < 60 ? `${s}D` : '1M'}`}
                      className="!border-2 !border-accent"
                    >
                      +{s < 60 ? `${s} dtk` : '1 mnt'}
                    </Button>
                  ))}
                </div>
              </section>
            )}

            {/* Mode durasi */}
            <section>
              <span className={`mb-2 block ${sectionTitle}`}>MODE DURASI</span>
              <Segmented
                ariaLabel="MODE DURASI"
                value={durationMode}
                onChange={selectDurationMode}
                options={[
                  { value: 'normal', label: 'Timer biasa' },
                  { value: 'target', label: 'Timer ke jam' },
                  { value: 'now', label: 'Jam saat ini' },
                ]}
              />
            </section>

            {durationMode === 'now' ? (
              <section className="text-center">
                <span className={`mb-2 block ${sectionTitle}`}>JAM SAAT INI</span>
                <div
                  data-testid="current-time"
                  className="timer-digits rounded-control border border-line bg-well py-4 font-anton text-5xl tracking-widest text-accent"
                >
                  {nowTime}
                </div>
              </section>
            ) : durationMode === 'normal' ? (
              <>
                {/* Preset */}
                <section>
                  <h2 className={`mb-3 ${sectionTitle}`}>DURASI</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {PRESET_DURATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => timerStore.setDuration(d)}
                        aria-pressed={state.duration === d}
                        className={`btn min-h-11 rounded-control border px-3 py-2 font-medium ${
                          state.duration === d
                            ? 'border-transparent bg-highlight text-ink'
                            : 'border-line bg-control text-fg hover:border-fg/30'
                        }`}
                      >
                        {PRESET_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Custom duration */}
                <section className="space-y-3">
                  <span className={`block ${sectionTitle}`}>DURASI CUSTOM</span>
                  <div className="flex items-end gap-3">
                    {[
                      { id: 'duration-hours', aria: 'JAM-DURASI', label: 'JAM', value: hours, set: setHours, max: 2 },
                      { id: 'duration-minutes', aria: 'MENIT', label: 'MENIT', value: minutes, set: setMinutes, max: 3 },
                      { id: 'duration-seconds', aria: 'DETIK', label: 'DETIK', value: seconds, set: setSeconds, max: 2 },
                    ].map((f) => (
                      <div key={f.id} className="min-w-0 flex-1 space-y-2">
                        <span aria-hidden="true" className={`block ${sectionTitle}`}>{f.label}</span>
                        <Field
                          data-testid={f.id}
                          aria-label={f.aria}
                          value={f.value}
                          onChange={(e) => f.set(sanitize(e.target.value, f.max))}
                          onBlur={() => f.set(pad2(f.value))}
                          inputMode="numeric"
                          className="w-full text-center text-lg tracking-widest"
                        />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
                        if (total > 0) timerStore.setDuration(total);
                      }}
                      className="min-h-[44px] w-20 shrink-0 tracking-wide sm:w-[110px]"
                    >
                      SET
                    </Button>
                  </div>
                </section>
              </>
            ) : (
              /* Countdown ke jam tertentu */
              <section className="flex items-end gap-3">
                <div className="flex-1">
                  <span className={`mb-2 block ${sectionTitle}`}>KE JAM (JAM : MENIT)</span>
                  <div className="flex items-center gap-2">
                    <Field
                      data-testid="target-hour"
                      aria-label="JAM"
                      value={hh}
                      onChange={(e) => setHh(sanitize(e.target.value, 2))}
                      onBlur={() => setHh(pad2(clamp(hh, 0, 23)))}
                      inputMode="numeric"
                      className="w-full text-center text-lg tracking-widest"
                    />
                    <span className="text-lg font-medium tracking-wide text-sub">:</span>
                    <Field
                      data-testid="target-minute"
                      aria-label="MENIT-JAM"
                      value={mm}
                      onChange={(e) => setMm(sanitize(e.target.value, 2))}
                      onBlur={() => setMm(pad2(clamp(mm, 0, 59)))}
                      inputMode="numeric"
                      className="w-full text-center text-lg tracking-widest"
                    />
                  </div>
                </div>
                <Button
                  variant="accent"
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
                  className="min-h-12 px-6 tracking-wide"
                >
                  MULAI KE JAM
                </Button>
              </section>
            )}
          </div>

          {/* Kolom kanan: layar, pesan, tampilan */}
          <div className="space-y-6">
            <Card title="Layar tampilan">
              <p className="mb-3 text-sm text-sub">
                Buka di monitor atau tab lain. Semua layar memakai kode room yang sama.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <NavLinkMenu label="Timer" path={`/timer?room=${room}`} />
                <NavLinkMenu label="Matador" path={`/matador?room=${room}`} />
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span id="sound-label" className="text-base text-fg">Suara hitung mundur</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundOn}
                  aria-labelledby="sound-label"
                  onClick={() => setSoundOn((v) => !v)}
                  className="relative h-7 w-14 shrink-0 rounded-full bg-ink"
                >
                  <span
                    aria-hidden="true"
                    className="theme-switch-knob absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-accent"
                    style={{ transform: soundOn ? 'translateX(28px)' : 'translateX(0)', opacity: soundOn ? 1 : 0.5 }}
                  />
                </button>
              </div>
            </Card>

            {/* Pesan ke panggung */}
            <Card title="Pesan ke panggung">
              {state.stageMessage ? (
                <div className="space-y-2 rounded-control border border-highlight/40 bg-highlight/10 p-4">
                  <p className="inline-block rounded-chip bg-highlight px-2 py-0.5 text-sm font-semibold tracking-wide text-ink">PESAN AKTIF</p>
                  <p className="break-words text-sm text-fg">{state.stageMessage.text}</p>
                  <Button variant="highlight" onClick={() => timerStore.hideStageMessage()} className="min-h-12 w-full tracking-wide">
                    DONE / HIDE
                  </Button>
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
                    className="w-full resize-none rounded-control border border-line bg-input px-4 py-3 text-sm text-fg focus:border-accent"
                  />
                  <p className="text-right text-xs text-sub">{stageText.length}/255</p>
                  <label className="flex min-h-9 items-center gap-2 text-sm text-fg">
                    <input
                      type="checkbox"
                      checked={showOnTimer}
                      onChange={(e) => setShowOnTimer(e.target.checked)}
                      className="h-5 w-5 rounded accent-accent"
                    />
                    TAMPILKAN JUGA DI LAYAR TIMER
                  </label>
                  <Button
                    variant="accent"
                    onClick={() => {
                      timerStore.sendStageMessage(stageText, showOnTimer);
                      setStageText('');
                    }}
                    disabled={stageText.trim().length === 0}
                    className="min-h-12 w-full tracking-wide"
                  >
                    KIRIM
                  </Button>
                </div>
              )}
            </Card>

            <Card title="Tampilan layar">
              <Disclosure title="Background, font, layout">
                <div className="space-y-4 pt-3">
                  <p className="text-sm text-sub">
                    Atur background, font, posisi jam, dan teks tambahan untuk layar TIMER dan MATADOR.
                  </p>
                  <Link
                    href={`/layar?room=${room}`}
                    className="btn inline-flex min-h-[44px] w-full items-center justify-center rounded-control border border-line bg-control px-4 font-medium text-fg"
                  >
                    Buka editor layar
                  </Link>
                </div>
              </Disclosure>
            </Card>
          </div>
        </div>

        {beepBlocked && (
          <button
            onClick={unlockBeep}
            className="fixed bottom-6 right-6 z-50 min-h-12 rounded-control bg-danger px-5 py-3 font-medium tracking-wide text-on-accent shadow-lg"
          >
            AKTIFKAN SUARA
          </button>
        )}
    </PageShell>
  );
}
