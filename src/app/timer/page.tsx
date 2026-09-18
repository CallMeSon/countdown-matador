'use client';

import { useEffect, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useBlinkWindow } from '@/hooks/useBlinkWindow';
import { useFitText } from '@/hooks/useFitText';
import { useRoom } from '@/hooks/useRoom';
import { STAGE_HEIGHT, STAGE_WIDTH, useStageScale } from '@/hooks/useStageScale';
import { timerStore } from '@/lib/timer-store';
import { timesUpPhase } from '@/lib/timer-phase';
import { StageBackground } from '@/components/StageBackground';
import { appearanceClass } from '@/lib/appearance';
import { DEFAULT_APPEARANCE } from '@/types/timer';

export default function TimerPage() {
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

  return <TimerDisplay />;
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

/**
 * Digit utama (jam/countdown/overtime/TIME'S UP) — kanvas stage-nya SELALU
 * fixed 1920x1080 (lihat useStageScale: seluruh stage di-scale sebagai satu
 * kesatuan, internalnya sendiri gak pernah berubah ukuran), jadi font-size
 * gak perlu dihitung ulang di runtime via JS lagi — 2x percobaan auto-fit
 * (useFitText berbasis clientWidth) berujung ke ukuran kekecilan karena
 * pengukuran layout-nya gak reliable di kombinasi container-query +
 * transform-scale ini. Diganti angka px tetap per jenis string, dikalibrasi
 * dari rasio lebar-teks-vs-font-size yang diamati langsung (bukan tebakan),
 * dengan margin aman biar gak kepotong walau meleset dikit.
 */
const DIGIT_SAFE_WIDTH = 1600; // ruang aman di dalam stage 1920px (160px margin tiap sisi)

const DIGIT_FONT_SIZE = {
  clock: 300, // "14:22:33" (8 char)
  countdown: 480, // "05:00" (5 char)
  overtime: 400, // "-00:06" (6 char)
  timesUp: 260, // "TIME'S UP" (9 char)
} as const;

function DigitText({
  text,
  testId,
  colorClass,
  animClass,
  fontSize,
  textClass,
  color,
}: {
  text: string;
  testId: string;
  colorClass: string;
  animClass?: string;
  fontSize: number;
  textClass?: string;
  color?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{ fontSize, width: DIGIT_SAFE_WIDTH, ...(color ? { color } : {}) }}
      className={`timer-digits whitespace-nowrap text-center font-anton font-bold leading-none ${colorClass}${
        animClass ? ` ${animClass}` : ''
      }${textClass ? ` ${textClass}` : ''}`}
    >
      {text}
    </div>
  );
}

function StageMessageCard({
  text,
  sentAt,
  textClass,
}: {
  text: string;
  sentAt: number;
  textClass?: string;
}) {
  const blinking = useBlinkWindow(sentAt);
  const { ref, fontSize } = useFitText<HTMLParagraphElement>(text, 80, 1280);

  return (
    <div className="anim-timesup-in flex h-full w-full max-w-[92cqw] items-center justify-center overflow-hidden rounded-3xl border-4 border-white/10 shadow-2xl">
      {/* Class blink & entrance dipisah 2 elemen — keduanya nyetel properti CSS
          `animation`, kalau digabung di 1 elemen yang belakangan di stylesheet
          menang total dan nge-cancel animasi yang lain. */}
      <div
        data-testid="stage-card"
        className={`flex h-full w-full items-center justify-center p-8 ${blinking ? 'anim-ticker-blink' : 'bg-red-700'}`}
      >
        <p
          ref={ref}
          data-testid="stage-card-text"
          style={{ fontSize }}
          className={`w-full whitespace-normal break-words text-center font-inter font-extrabold uppercase leading-tight text-white${
            textClass ? ` ${textClass}` : ''
          }`}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function TimerDisplay() {
  const { state, displayTime, overtimeTime, remaining, secondsLeft, isOvertime } = useTimer();
  const [mounted, setMounted] = useState(false);
  const nowTime = useLiveClock(state.displayMode === 'clock');
  const hasStageMessage = state.stageMessage !== null && state.stageMessage.showOnTimer;
  const scale = useStageScale();
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const appClass = appearanceClass(appearance);

  useEffect(() => {
    setMounted(true);
  }, []);

  const phase = timesUpPhase(remaining);
  const showTimesUp = isOvertime && phase !== 'counter';

  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const mainColor = critical
    ? secondsLeft <= 5
      ? 'text-red-500'
      : 'text-amber-400'
    : '';

  const digitContent =
    state.displayMode === 'clock' ? (
      <DigitText
        testId="clock-main"
        text={nowTime}
        colorClass="text-emerald-400"
        fontSize={DIGIT_FONT_SIZE.clock}
        textClass={appClass}
      />
    ) : mounted && isOvertime ? (
      showTimesUp ? (
        <DigitText
          testId="timesup"
          text="TIME'S UP"
          colorClass="text-red-500"
          animClass={phase === 'timesup-exit' ? 'anim-timesup-out' : 'anim-timesup-in'}
          fontSize={DIGIT_FONT_SIZE.timesUp}
          textClass={appClass}
        />
      ) : (
        <DigitText
          testId="overtime-counter"
          text={overtimeTime}
          colorClass="text-red-500"
          animClass="anim-swap-in"
          fontSize={DIGIT_FONT_SIZE.overtime}
          textClass={appClass}
        />
      )
    ) : (
      <DigitText
        testId="countdown-main"
        text={displayTime}
        colorClass={mainColor}
        fontSize={DIGIT_FONT_SIZE.countdown}
        textClass={appClass}
        color={critical ? undefined : appearance.fontColor}
      />
    );

  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="timer-container relative flex items-center justify-center overflow-hidden bg-black"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        <StageBackground appearance={appearance} />
        <div
          className={`relative z-10 transition-transform duration-500 ease-out ${
            hasStageMessage ? 'scale-[0.3] -translate-y-[324px]' : ''
          }`}
        >
          {digitContent}
        </div>
        {hasStageMessage && (
          <div className="absolute inset-x-0 bottom-0 top-[454px] z-10 flex items-center justify-center p-6 md:p-10">
            <StageMessageCard
              text={state.stageMessage!.text}
              sentAt={state.stageMessage!.sentAt}
              textClass={appClass}
            />
          </div>
        )}
      </div>
    </main>
  );
}
