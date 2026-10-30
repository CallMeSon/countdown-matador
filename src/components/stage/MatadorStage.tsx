'use client';

import { useEffect, useState } from 'react';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useBlinkWindow } from '@/hooks/useBlinkWindow';
import { useExitTransition } from '@/hooks/useExitTransition';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@/hooks/useStageScale';
import { timerStore } from '@/lib/timer-store';
import { DEFAULT_APPEARANCE, formatTime, type StageMessage, type TimerState } from '@/types/timer';
import { LayoutOverlay } from '@/components/LayoutOverlay';
import { appearanceClass } from '@/lib/appearance';
import { resolveElementStyle } from '@/lib/element-style';

const TICKER_EXIT_MS = 400;

/**
 * Kanvas stage /matador (1920x1080, tanpa penskalaan). Presentasional: nilai
 * turunan dihitung dari `state` + `now` (default Date.now()); penskalaan,
 * room gate, dan hook store dipegang halaman.
 */
const TICKER_SAMPLE = 'Contoh pesan ke panggung akan berjalan di sini';

/**
 * `editing`: dipakai editor /layar — ticker menampilkan teks contoh (hanya di editor) saat tidak ada
 * pesan aktif, dan elemen yang disembunyikan tampil redup (bukan hilang) supaya masih bisa dipilih.
 */
export function MatadorStage({ state, now, editing = false }: { state: TimerState; now?: number; editing?: boolean }) {
  const remaining = timerStore.computeRemaining(state, now ?? Date.now());
  const isOvertime = remaining < 0;
  const secondsLeft = Math.ceil(remaining);
  const displayTime = formatTime(remaining);
  const overtimeTime = displayTime;
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
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const appClass = appearanceClass(appearance);
  const layout = state.layoutMatador ?? { styles: {}, texts: [] };
  const label = resolveElementStyle(layout.styles?.label, appearance);
  const ticker = resolveElementStyle(layout.styles?.ticker, appearance);
  const clock = resolveElementStyle(layout.styles?.clock, appearance);
  const hideClass = (r: { hidden: boolean }) => (r.hidden ? (editing ? 'opacity-25' : 'invisible') : '');
  // Ukuran bawaan (clamp) dikalikan skala elemen; tetap di aliran flex sehingga ticker menyempit sendiri.
  const size = (base: string, scale: number) => `calc(${base} * ${scale})`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const timerColor =
    isOvertime || (critical && secondsLeft <= 5)
      ? 'text-red-500'
      : critical
        ? 'text-amber-400'
        : '';
  const CLOCK_SIZE = 'clamp(2.5rem,8cqw,7rem)';
  const digitStyle = {
    fontSize: size(CLOCK_SIZE, clock.scale),
    ...clock.css,
    ...(isOvertime || critical ? {} : { color: clock.color }),
  };

  const digitClass = `timer-digits shrink-0 font-anton text-[clamp(2.5rem,8cqw,7rem)] font-bold leading-none ${timerColor}${
    clock.className ? ` ${clock.className}` : ''
  }`;

  const liveMessage = tickerMounted && lastMessage;
  const showOvertimeBadge = mounted && isOvertime && !isClockMode;
  const tickerText = liveMessage ? lastMessage.text : editing && !showOvertimeBadge ? TICKER_SAMPLE : null;

  return (
    <div
        className="timer-container relative z-10 flex flex-col overflow-hidden"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      >
        {/* Bar atas: label kiri, badge overtime di tengah, timer kanan */}
        <header className="relative z-10 flex items-center gap-4 border-b border-zinc-800/60 px-6 py-2">
          {!tickerMounted && (
            <div data-layout-key="label" className={`shrink-0 ${hideClass(label)}`}>
            <span
              data-testid="matador-label"
              style={{ color: label.color, fontSize: size('clamp(1.25rem,4cqw,4.25rem)', label.scale), ...label.css }}
              className={`whitespace-nowrap font-inter text-[clamp(1.25rem,4cqw,4.25rem)] font-black uppercase leading-none tracking-tight text-white${
                label.className ? ` ${label.className}` : ''
              }`}
            >
              {isClockMode ? 'CURRENT TIME' : 'COUNTDOWN TIMER'}
            </span>
            </div>
          )}

          {/* Kolom tengah: ticker pesan panggung (prioritas, dapat lebar penuh
              waktu label disembunyikan) / badge overtime / kosong */}
          <div data-layout-key="ticker" className={`flex min-w-0 flex-1 justify-center ${hideClass(ticker)}`}>
            {tickerText !== null ? (
              <div className={`w-full max-w-full overflow-hidden rounded-lg ${tickerExiting ? 'anim-timesup-out' : 'anim-badge-in'}`}>
                {/* Class blink & entrance/exit dipisah 2 elemen — keduanya nyetel properti CSS
                    `animation`, kalau digabung di 1 elemen yang belakangan di stylesheet
                    menang total dan nge-cancel animasi yang lain. */}
                <div
                  data-testid="stage-ticker"
                  className={`overflow-hidden rounded-lg py-2 ${liveMessage && stageBlinking ? 'anim-ticker-blink' : 'bg-red-700'}`}
                >
                  <div
                    data-testid="stage-ticker-text"
                    style={{ color: ticker.color, fontSize: size('clamp(0.9rem,2.2cqw,2.25rem)', ticker.scale), ...ticker.css }}
                    className={`animate-ticker-scroll inline-block whitespace-nowrap pl-[100%] font-inter text-[clamp(0.9rem,2.2cqw,2.25rem)] font-extrabold uppercase leading-none tracking-wide text-white${
                      ticker.className ? ` ${ticker.className}` : ''
                    }`}
                  >
                    {tickerText}
                  </div>
                </div>
              </div>
            ) : showOvertimeBadge ? (
              <span
                data-testid="matador-timesup"
                style={ticker.css}
                className={`anim-badge-in flex min-w-0 max-w-full items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 font-inter text-[clamp(0.7rem,1.6cqw,1.75rem)] font-extrabold uppercase leading-none tracking-wider text-white${
                  ticker.className ? ` ${ticker.className}` : ''
                }`}
              >
                <span aria-hidden="true" className="shrink-0">⚠️</span>
                <span className="min-w-0 truncate">OVERTIME / KELEBIHAN WAKTU</span>
                <span aria-hidden="true" className="shrink-0">⚠️</span>
              </span>
            ) : null}
          </div>

          {isClockMode ? (
            <div data-layout-key="clock" className={`shrink-0 ${hideClass(clock)}`}>
            <span
              data-testid="matador-clock"
              style={{ fontSize: digitStyle.fontSize, ...clock.css }}
              className={`timer-digits shrink-0 font-anton text-[clamp(2.5rem,8cqw,7rem)] font-bold leading-none text-emerald-400${
                clock.className ? ` ${clock.className}` : ''
              }`}
            >
              {nowTime}
            </span>
            </div>
          ) : mounted && isOvertime ? (
            <div data-layout-key="clock" className={`shrink-0 ${hideClass(clock)}`}>
            <span data-testid="matador-overtime" style={digitStyle} className={`anim-glow ${digitClass}`}>
              {overtimeTime}
            </span>
            </div>
          ) : (
            <div data-layout-key="clock" className={`shrink-0 ${hideClass(clock)}`}>
            <span data-testid="matador-timer" style={digitStyle} className={digitClass}>
              {displayTime}
            </span>
            </div>
          )}
        </header>

        {/* Space kosong untuk PPT */}
        <div data-testid="ppt-space" className="relative z-10 flex-1" aria-label="ruang presentasi" />
        <LayoutOverlay texts={layout.texts ?? []} appearance={appearance} />
      </div>
  );
}
