// ============================================================
// Matador Timer — Core Types & Interfaces
// ============================================================

export type TimerMode = 'countdown' | 'realtime-wib' | 'stopwatch' | 'countdown-to-time';

// realtime-wib and countdown-to-time are anchored to the real clock and are
// always "live" (see useTimerEngine's isRunning) — Start/Pause has no effect
// on them, so any control offering to pause must check this first.
export function isPausableMode(mode: TimerMode): boolean {
  return mode !== 'realtime-wib' && mode !== 'countdown-to-time';
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'overtime';

export type CueType = 'standby' | 'go' | 'wrapup' | null;

export type TallyStatus = 'on-air' | 'standby' | 'off';

export type PositionAnchor = 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'custom';

export type TimerFormat = 'HH:MM:SS' | 'MM:SS' | 'H:MM:SS' | 'MM:SS.ms' | 'HH:MM:SS.ms';

export type FontFamily = 'anton' | 'bebas' | 'inter';

export type BackgroundType = 'solid' | 'image' | 'gradient';

export type MessageStyle = 'static' | 'scroll-ticker';

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Warning threshold config
export interface WarningThreshold {
  id: string;
  seconds: number;       // trigger when remaining <= this
  color: string;          // hex color
  flash: boolean;         // enable flashing at this threshold
  soundEnabled: boolean;  // play sound at this threshold
}

// Position for draggable elements
export interface DisplayPosition {
  x: number;  // percentage 0-100
  y: number;  // percentage 0-100
  anchor: PositionAnchor;
}

// Timer state (synced across tabs)
export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  totalDuration: number;         // total in seconds
  startedAt: number | null;      // Date.now() when started
  pausedRemaining: number | null; // remaining seconds when paused
  countdownTarget: string | null; // HH:MM for countdown-to-time mode
  sessionLabel: string;
  isOvertime: boolean;
}

// Display configuration (synced across tabs)
export interface DisplayConfig {
  // Position
  position: DisplayPosition;

  // Typography
  timerFormat: TimerFormat;
  fontSize: number;          // scale 50-200
  fontFamily: FontFamily;
  fontWeight: 'normal' | 'semibold' | 'bold' | 'black';
  showMilliseconds: boolean;

  // Colors
  normalColor: string;
  overtimeColor: string;
  warningColor: string;
  wibColor: string;

  // Background
  backgroundColor: string;
  backgroundType: BackgroundType;
  backgroundImage: string | null;
  backgroundGradient: string;
  backgroundOpacity: number;    // 0-100

  // Logo
  logoEnabled: boolean;
  logoUrl: string | null;
  logoPosition: LogoPosition;
  logoSize: number;            // 5-50 percentage
  logoOpacity: number;         // 0-100

  // Progress Bar
  progressBarEnabled: boolean;
  progressBarPosition: 'top' | 'bottom';
  progressBarColor: string;
  progressBarHeight: number;   // 2-20 px

  // Message/Ticker
  messageEnabled: boolean;
  messageText: string;
  messagePosition: 'top' | 'bottom';
  messageStyle: MessageStyle;
  messageColor: string;
  messageBgColor: string;

  // Session Label
  sessionLabelVisible: boolean;
  sessionLabelPlacement: 'above-timer' | 'below-timer' | 'custom';
  sessionLabelPosition: DisplayPosition;
  sessionLabelSize: 'small' | 'medium' | 'large' | 'extra-large' | 'massive';
  sessionLabelScale: number; // 50-250 percentage
  sessionLabelFontFamily: FontFamily;
  sessionLabelFontWeight: 'normal' | 'semibold' | 'bold' | 'black';
  sessionLabelColor: string;

  // Tally Light
  tallyLightEnabled: boolean;
  tallyStatus: TallyStatus;

  // Warning Thresholds
  warningThresholds: WarningThreshold[];
}

// Audio configuration
export interface AudioConfig {
  warningSoundType: 'beep' | 'chime' | 'bell' | 'horn' | 'custom' | 'none';
  warningSoundVolume: number;  // 0-100
  overtimeSoundType: 'beep' | 'chime' | 'bell' | 'horn' | 'custom' | 'none';
  overtimeSoundVolume: number;
  startSoundEnabled: boolean;
  endSoundEnabled: boolean;
  // Pre-start Lead-in Countdown (3..2..1..GO)
  preStartCountdownEnabled: boolean;
  preStartCountdownDuration: number; // 3, 5, 10
  // Final seconds continuous beeping (10..9..8..1)
  lastSecondsBeepEnabled: boolean;
  lastSecondsBeepDuration: number;   // 10, 5, 3
  // 00:00 Finish buzzer
  endBuzzerSoundType: 'buzzer' | 'horn' | 'bell' | 'chime' | 'none';
  endBuzzerVolume: number;
  // Background music & master
  bgMusicEnabled: boolean;
  bgMusicUrl: string | null;
  bgMusicVolume: number;       // 0-100
  bgMusicLoop: boolean;
  masterVolume: number;        // 0-100
  masterMute: boolean;
}

// Room & Security configuration
export interface RoomConfig {
  roomId: string;
  adminPin: string;
  isUnlocked: boolean;
  connectedPeersCount: number;
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  roomId: 'default-stage',
  adminPin: '1234',
  isUnlocked: false,
  connectedPeersCount: 0,
};

// Full sync state (sent between tabs and remote laptops)
export interface SyncState {
  timer: TimerState;
  display: DisplayConfig;
  audio: AudioConfig;
  activeCue: CueType;
  quickMessage: string | null;
  quickMessageExpiry: number | null;
  preStartRemaining: number | null;
  roomId?: string;
}

// Sync channel message types
export type SyncMessageType =
  | 'STATE_UPDATE'
  | 'REQUEST_SYNC'
  | 'STATE_SYNC_RESPONSE'
  | 'TIMER_COMMAND'
  | 'CUE_SIGNAL'
  | 'QUICK_MESSAGE'
  | 'PRE_START_TICK'
  | 'AUTH_CHALLENGE'
  | 'AUTH_SUCCESS';

export interface SyncMessage {
  type: SyncMessageType;
  payload: unknown;
  timestamp: number;
  source: 'admin' | 'display';
  roomId?: string;
  authPin?: string;
}

export type TimerCommand =
  | { action: 'start' }
  | { action: 'pause' }
  | { action: 'reset' }
  | { action: 'setDuration'; duration: number }
  | { action: 'setMode'; mode: TimerMode }
  | { action: 'setCountdownTarget'; target: string };

// Event log entry
export interface EventLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'action' | 'system';
}

// Default values
export const DEFAULT_TIMER_STATE: TimerState = {
  mode: 'countdown',
  status: 'idle',
  totalDuration: 300, // 5 minutes
  startedAt: null,
  pausedRemaining: null,
  countdownTarget: null,
  sessionLabel: '',
  isOvertime: false,
};

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  position: { x: 50, y: 50, anchor: 'center' },
  timerFormat: 'MM:SS',
  fontSize: 100,
  fontFamily: 'anton',
  fontWeight: 'bold',
  showMilliseconds: false,
  normalColor: '#10b981',
  overtimeColor: '#ef4444',
  warningColor: '#eab308',
  wibColor: '#06b6d4',
  backgroundColor: '#000000',
  backgroundType: 'solid',
  backgroundImage: null,
  backgroundGradient: 'linear-gradient(180deg, #000000, #111111)',
  backgroundOpacity: 100,
  logoEnabled: false,
  logoUrl: null,
  logoPosition: 'top-right',
  logoSize: 15,
  logoOpacity: 80,
  progressBarEnabled: false,
  progressBarPosition: 'bottom',
  progressBarColor: '#10b981',
  progressBarHeight: 6,
  messageEnabled: false,
  messageText: '',
  messagePosition: 'bottom',
  messageStyle: 'static',
  messageColor: '#ffffff',
  messageBgColor: '#000000cc',
  sessionLabelVisible: true,
  sessionLabelPlacement: 'above-timer',
  sessionLabelPosition: { x: 50, y: 30, anchor: 'top-center' },
  sessionLabelSize: 'large',
  sessionLabelScale: 100,
  sessionLabelFontFamily: 'inter',
  sessionLabelFontWeight: 'black',
  sessionLabelColor: '#ffffff',
  tallyLightEnabled: false,
  tallyStatus: 'off',
  warningThresholds: [
    { id: 'w1', seconds: 300, color: '#10b981', flash: false, soundEnabled: false },
    { id: 'w2', seconds: 60, color: '#eab308', flash: false, soundEnabled: true },
    { id: 'w3', seconds: 30, color: '#f97316', flash: false, soundEnabled: false },
    { id: 'w4', seconds: 10, color: '#ef4444', flash: true, soundEnabled: true },
  ],
};

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  warningSoundType: 'beep',
  warningSoundVolume: 70,
  overtimeSoundType: 'horn',
  overtimeSoundVolume: 80,
  startSoundEnabled: true,
  endSoundEnabled: true,
  preStartCountdownEnabled: false,
  preStartCountdownDuration: 3,
  lastSecondsBeepEnabled: true,
  lastSecondsBeepDuration: 10,
  endBuzzerSoundType: 'buzzer',
  endBuzzerVolume: 85,
  bgMusicEnabled: false,
  bgMusicUrl: null,
  bgMusicVolume: 30,
  bgMusicLoop: true,
  masterVolume: 80,
  masterMute: false,
};

export const PRESET_DURATIONS = [1, 3, 5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

export const CHANNEL_NAME = 'matador_timer_sync_channel';
