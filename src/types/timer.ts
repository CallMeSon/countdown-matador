// ============================================================
// Matador Timer — Simple Timer Types
// ============================================================

export type TimerStatus = 'idle' | 'running' | 'paused' | 'overtime';

export type DisplayMode = 'timer' | 'clock';

export type BackgroundMode = 'color' | 'image';

export type FontKey =
  | 'default'
  | 'anton'
  | 'bebas'
  | 'oswald'
  | 'teko'
  | 'archivo'
  | 'orbitron'
  | 'robotoMono';

export interface AppearanceConfig {
  bgMode: BackgroundMode;
  bgColor: string;   // '#rrggbb'
  bgImage: string;   // URL http(s) atau '/backgrounds/*.svg'; '' = kosong
  fontFamily: FontKey;
  bold: boolean;
  italic: boolean;
  fontColor: string; // '#rrggbb'
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  bgMode: 'color',
  bgColor: '#000000',
  bgImage: '',
  fontFamily: 'default',
  bold: false,
  italic: false,
  fontColor: '#ffffff',
};

export interface StageMessage {
  text: string;
  sentAt: number;       // Date.now() saat dikirim — basis hitung window blink 15s
  showOnTimer: boolean; // ikut tampil di /timer, atau matador-only
}

export interface LayoutOffset {
  dx: number; // px stage 1920x1080, clamp -900..900
  dy: number; // px stage 1920x1080, clamp -500..500
}

export interface CustomTextBlock {
  id: string;   // 8 char alnum
  text: string; // max 120 char, sudah di-trim
  x: number;    // px stage 0..1920
  y: number;    // px stage 0..1080
  size: number; // font-size px stage 24..200
}

export interface PageLayout {
  offsets: Record<string, LayoutOffset>;
  texts: CustomTextBlock[];
}

export const DEFAULT_PAGE_LAYOUT: PageLayout = { offsets: {}, texts: [] };

export interface TimerState {
  status: TimerStatus;
  duration: number;            // total detik
  startedAt: number | null;   // Date.now() saat start
  pausedRemaining: number | null; // sisa detik saat pause (negatif = overtime)
  displayMode: DisplayMode;    // 'timer' = countdown biasa, 'clock' = tampilkan jam saat ini
  stageMessage: StageMessage | null; // pesan ke layar panggung, null = tidak ada yang aktif
  appearance: AppearanceConfig; // tampilan display (background/font), tersinkron per-room
  layoutTimer: PageLayout;   // layout halaman /timer
  layoutMatador: PageLayout; // layout halaman /matador
}

export const DEFAULT_TIMER_STATE: TimerState = {
  status: 'idle',
  duration: 300,
  startedAt: null,
  pausedRemaining: null,
  displayMode: 'timer',
  stageMessage: null,
  appearance: DEFAULT_APPEARANCE,
  layoutTimer: DEFAULT_PAGE_LAYOUT,
  layoutMatador: DEFAULT_PAGE_LAYOUT,
};

export const CHANNEL_NAME = 'matador-timer-sync';

export const PRESET_DURATIONS = [60, 180, 300, 600, 900, 1800] as const;

/** Format detik → "MM:SS" atau "HH:MM:SS" jika > 60 menit. Negatif → "-MM:SS". */
export function formatTime(totalSeconds: number): string {
  const isNeg = totalSeconds < 0;
  const abs = Math.floor(Math.abs(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  const core = h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  return isNeg ? `-${core}` : core;
}
