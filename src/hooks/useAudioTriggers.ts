'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import { useAudioEngine } from '@/hooks/useAudioEngine';

// Watches timer/audio state and fires the matching sound cues. Originally
// lived inside DisplayView only — extracted so /control can mount it too and
// let the operator hear their own cues, not just whatever's plugged into the
// stage display.
export function useAudioTriggers(audioEngine: ReturnType<typeof useAudioEngine>) {
  const { state } = useApp();
  const engine = useTimerEngine();
  const { timer, audio, preStartRemaining } = state;

  const prevWarningRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string>(timer.status);
  const prevOvertimeRef = useRef<boolean>(false);
  const prevPreStartRef = useRef<number | null>(null);
  const lastBeepedSecRef = useRef<number | null>(null);

  // Pre-Start Countdown Audio Trigger (3..2..1..GO)
  useEffect(() => {
    if (preStartRemaining !== null && preStartRemaining !== prevPreStartRef.current) {
      if (preStartRemaining > 0) {
        audioEngine.playCountdownTick(880, 85);
      } else if (preStartRemaining === 0) {
        audioEngine.playGoSound(90);
      }
    }
    prevPreStartRef.current = preStartRemaining;
  }, [preStartRemaining, audioEngine]);

  // Audio Triggers for Timer Start
  useEffect(() => {
    if (timer.status === 'running' && prevStatusRef.current !== 'running' && !audio.preStartCountdownEnabled) {
      audioEngine.playStartSound();
    }
    prevStatusRef.current = timer.status;
  }, [timer.status, audio.preStartCountdownEnabled, audioEngine]);

  // Warning Threshold Sound Triggers (Multi-Point Custom Seconds)
  useEffect(() => {
    if (engine.currentWarning && engine.currentWarning.id !== prevWarningRef.current) {
      if (engine.currentWarning.soundEnabled !== false && timer.status === 'running') {
        audioEngine.playWarningSound();
      }
      prevWarningRef.current = engine.currentWarning.id;
    } else if (!engine.currentWarning) {
      prevWarningRef.current = null;
    }
  }, [engine.currentWarning, timer.status, audioEngine]);

  // Final Seconds Continuous Beeping (10..9..8..1)
  useEffect(() => {
    if (
      audio.lastSecondsBeepEnabled &&
      (timer.status === 'running' || timer.status === 'overtime') &&
      timer.mode === 'countdown' &&
      engine.remainingSeconds > 0 &&
      engine.remainingSeconds <= (audio.lastSecondsBeepDuration || 10)
    ) {
      const currentSec = Math.ceil(engine.remainingSeconds);
      if (currentSec !== lastBeepedSecRef.current && currentSec <= (audio.lastSecondsBeepDuration || 10)) {
        lastBeepedSecRef.current = currentSec;
        const pitch = currentSec <= 3 ? 1200 : 880;
        audioEngine.playCountdownTick(pitch, 80);
      }
    } else if (engine.remainingSeconds <= 0 || timer.status === 'idle') {
      lastBeepedSecRef.current = null;
    }
  }, [engine.remainingSeconds, timer.status, timer.mode, audio.lastSecondsBeepEnabled, audio.lastSecondsBeepDuration, audioEngine]);

  // End of Time / 00:00 Finish Buzzer & Overtime Triggers
  useEffect(() => {
    if (engine.isOvertime && !prevOvertimeRef.current && (timer.status === 'running' || timer.status === 'overtime')) {
      audioEngine.playBuzzerSound();
      audioEngine.playOvertimeSound();
    }
    prevOvertimeRef.current = engine.isOvertime;
  }, [engine.isOvertime, timer.status, audioEngine]);
}
