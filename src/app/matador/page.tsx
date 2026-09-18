'use client';

import { useEffect, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useBlinkWindow } from '@/hooks/useBlinkWindow';
import { useExitTransition } from '@/hooks/useExitTransition';
import { useRoom } from '@/hooks/useRoom';
import { timerStore } from '@/lib/timer-store';
import { STAGE_HEIGHT, STAGE_WIDTH, useStageScale } from '@/hooks/useStageScale';
import type { StageMessage } from '@/types/timer';

const TICKER_EXIT_MS = 400;

export default function MatadorPage() {
  const { ready, room, lastUsedRoom, setRoom } = useRoom();

  // Read-only display: aman auto-join dari room terakhir, gak perlu klik.
  useEffect(() => {
    if (ready && !room && lastUsedRoom) setRoom(lastUsedRoom);
  }, [ready, room, lastUsedRoom, setRoom]);

  useEffect(() => {
    if (room) timerStore.setRoom(room);
  }, [room]);

  if (!ready) {
    return <main className="h-screen w-screen bg-black" />;
  }

  if (!room) {
    return <RoomEntryGate onSubmit={setRoom} />;
  }

  return <MatadorDisplay />;
}

function RoomEntryGate({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-black">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onSubmit(code);
        }}
        className="w-full max-w-xs space-y-4 px-6 text-center"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="KODE ROOM"
          aria-label="Kode room"
          autoFocus
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] text-white uppercase focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-500 px-6 py-3 font-bold tracking-widest text-black hover:bg-emerald-400"
        >
          TAMPILKAN
        </button>
      </form>
    </main>
  );
}

function MatadorDisplay() {
  const { state, displayTime, overtimeTime, secondsLeft, isOvertime } = useTimer();
  const [mounted, setMounted] = useState(false);
  const isClockMode = state.displayMode === 'clock';
  const nowTime = useLiveClock(isClockMode);
  const hasStageMessage = state.stageMessage !== null;
  const { mounted: tickerMounted, exiting: tickerExiting } = useExitTransition(hasStageMessage, TICKER_EXIT_MS);

  // Tetap ingat pesan terakhir supaya teks & blink-nya nggak hilang duluan
  // selama animasi exit main (state.stageMessage sendiri udah null saat itu).
  const [lastMessage, setLastMessage] = useState<StageMessage | null>(null);
  useEffect(() => {
    if (state.stageMessage) setLastMessage(state.stageMessage);
  }, [state.stageMessage]);

  const stageBlinking = useBlinkWindow(lastMessage?.sentAt ?? null);
  const scale = useStageScale();

  useEffect(() => {
    setMounted(true);
  }, []);

  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const timerColor =
    isOvertime || (critical && secondsLeft <= 5)
      ? 'text-red-500'
      : critical
        ? 'text-amber-400'
        : 'text-white';

  const digitClass = `timer-digits shrink-0 font-anton text-[clamp(2.5rem,8cqw,7rem)] font-bold leading-none ${timerColor}`;

  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="timer-container flex flex-col overflow-hidden bg-black"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        {/* Bar atas: label kiri, badge overtime di tengah, timer kanan */}
        <header className="flex items-center gap-4 border-b border-zinc-800/60 px-6 py-2">
          {!tickerMounted && (
            <span
              data-testid="matador-label"
              className="shrink-0 whitespace-nowrap font-inter text-[clamp(1.25rem,4cqw,4.25rem)] font-black uppercase leading-none tracking-tight text-white"
            >
              {isClockMode ? 'CURRENT TIME' : 'COUNTDOWN TIMER'}
            </span>
          )}

          {/* Kolom tengah: ticker pesan panggung (prioritas, dapat lebar penuh
              waktu label disembunyikan) / badge overtime / kosong */}
          <div className="flex min-w-0 flex-1 justify-center">
            {tickerMounted && lastMessage ? (
              <div className={`w-full max-w-full overflow-hidden rounded-lg ${tickerExiting ? 'anim-timesup-out' : 'anim-badge-in'}`}>
                {/* Class blink & entrance/exit dipisah 2 elemen — keduanya nyetel properti CSS
                    `animation`, kalau digabung di 1 elemen yang belakangan di stylesheet
                    menang total dan nge-cancel animasi yang lain. */}
                <div
                  data-testid="stage-ticker"
                  className={`overflow-hidden rounded-lg py-2 ${stageBlinking ? 'anim-ticker-blink' : 'bg-red-700'}`}
                >
                  <div
                    data-testid="stage-ticker-text"
                    className="animate-ticker-scroll inline-block whitespace-nowrap pl-[100%] font-inter text-[clamp(0.9rem,2.2cqw,2.25rem)] font-extrabold uppercase leading-none tracking-wide text-white"
                  >
                    {lastMessage.text}
                  </div>
                </div>
              </div>
            ) : mounted && isOvertime && !isClockMode ? (
              <span
                data-testid="matador-timesup"
                className="anim-badge-in flex items-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 font-inter text-[clamp(0.7rem,1.6cqw,1.75rem)] font-extrabold uppercase leading-none tracking-wider text-white"
              >
                <span aria-hidden="true">⚠️</span>
                OVERTIME / KELEBIHAN WAKTU
                <span aria-hidden="true">⚠️</span>
              </span>
            ) : null}
          </div>

          {isClockMode ? (
            <span data-testid="matador-clock" className="timer-digits shrink-0 font-anton text-[clamp(2.5rem,8cqw,7rem)] font-bold leading-none text-emerald-400">
              {nowTime}
            </span>
          ) : mounted && isOvertime ? (
            <span data-testid="matador-overtime" className={`anim-glow ${digitClass}`}>
              {overtimeTime}
            </span>
          ) : (
            <span data-testid="matador-timer" className={digitClass}>
              {displayTime}
            </span>
          )}
        </header>

        {/* Space kosong untuk PPT */}
        <div data-testid="ppt-space" className="flex-1" aria-label="ruang presentasi" />
      </div>
    </main>
  );
}
