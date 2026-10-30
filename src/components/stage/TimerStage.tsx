'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useBlinkWindow } from '@/hooks/useBlinkWindow';
import { useFitText } from '@/hooks/useFitText';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@/hooks/useStageScale';
import { timerStore } from '@/lib/timer-store';
import { timesUpPhase } from '@/lib/timer-phase';
import { LayoutOverlay } from '@/components/LayoutOverlay';
import { appearanceClass } from '@/lib/appearance';
import { resolveElementStyle } from '@/lib/element-style';
import { DEFAULT_APPEARANCE, formatTime, type TimerState } from '@/types/timer';

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
  extraStyle,
}: {
  text: string;
  testId: string;
  colorClass: string;
  animClass?: string;
  fontSize: number;
  textClass?: string;
  color?: string;
  extraStyle?: CSSProperties;
}) {
  return (
    <div
      data-testid={testId}
      style={{ fontSize, width: DIGIT_SAFE_WIDTH, ...extraStyle, ...(color ? { color } : {}) }}
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

/**
 * Kanvas stage /timer (1920x1080, tanpa penskalaan). Presentasional: nilai
 * turunan dihitung dari `state` + `now` (default Date.now()); penskalaan,
 * room gate, dan hook store dipegang halaman.
 */
/**
 * `editing`: dipakai editor /layar — elemen yang disembunyikan tampil redup (bukan hilang) supaya
 * masih bisa dipilih dan terlihat posisinya.
 */
export function TimerStage({ state, now, editing = false }: { state: TimerState; now?: number; editing?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const nowTime = useLiveClock(state.displayMode === 'clock');
  const hasStageMessage = state.stageMessage !== null && state.stageMessage.showOnTimer;
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const appClass = appearanceClass(appearance);
  const digit = resolveElementStyle(state.layoutTimer?.styles?.digit, appearance);

  useEffect(() => {
    setMounted(true);
  }, []);

  const remaining = timerStore.computeRemaining(state, now ?? Date.now());
  const isOvertime = remaining < 0;
  const secondsLeft = Math.ceil(remaining);
  const displayTime = formatTime(remaining);
  const overtimeTime = displayTime;

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
        fontSize={Math.round(DIGIT_FONT_SIZE.clock * digit.scale)}
        extraStyle={digit.css}
        textClass={digit.className}
      />
    ) : mounted && isOvertime ? (
      showTimesUp ? (
        <DigitText
          testId="timesup"
          text="TIME'S UP"
          colorClass="text-red-500"
          animClass={phase === 'timesup-exit' ? 'anim-timesup-out' : 'anim-timesup-in'}
          fontSize={Math.round(DIGIT_FONT_SIZE.timesUp * digit.scale)}
        extraStyle={digit.css}
          textClass={digit.className}
        />
      ) : (
        <DigitText
          testId="overtime-counter"
          text={overtimeTime}
          colorClass="text-red-500"
          animClass="anim-swap-in"
          fontSize={Math.round(DIGIT_FONT_SIZE.overtime * digit.scale)}
        extraStyle={digit.css}
          textClass={digit.className}
        />
      )
    ) : (
      <DigitText
        testId="countdown-main"
        text={displayTime}
        colorClass={mainColor}
        fontSize={Math.round(DIGIT_FONT_SIZE.countdown * digit.scale)}
        extraStyle={digit.css}
        textClass={digit.className}
        color={critical ? undefined : digit.color}
      />
    );

  return (
    <div
      className="timer-container relative z-10 flex items-center justify-center overflow-hidden"
      style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
    >
      <div
        data-layout-key="digit"
        className={digit.hidden ? (editing ? 'opacity-25' : 'invisible') : undefined}
      >
        <div
          className={`relative z-10 transition-transform duration-500 ease-out ${
            hasStageMessage ? 'scale-[0.3] -translate-y-[324px]' : ''
          }`}
        >
          {digitContent}
        </div>
      </div>
      {hasStageMessage && (
        <div className="absolute inset-x-0 bottom-0 top-[454px] z-10 flex items-center justify-center p-6 md:p-10">
          <StageMessageCard
            text={state.stageMessage!.text}
            sentAt={state.stageMessage!.sentAt}
            textClass={digit.className}
          />
        </div>
      )}
      <LayoutOverlay texts={state.layoutTimer?.texts ?? []} appearance={appearance} />
    </div>
  );
}
