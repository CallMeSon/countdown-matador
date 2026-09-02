'use client';

import { useEffect, useCallback } from 'react';
import { useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import { isPausableMode } from '@/types/timer';

export function useKeyboardShortcuts(isDisplayView: boolean = false) {
  const { state, startTimer, pauseTimer, resetTimer, updateAudioConfig } = useApp();
  const engine = useTimerEngine();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    switch (e.code) {
      case 'Space': {
        e.preventDefault();
        if (!isPausableMode(state.timer.mode)) return;
        if (state.timer.status === 'running' || state.timer.status === 'overtime') {
          pauseTimer(engine.remainingSeconds);
        } else {
          startTimer();
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        resetTimer();
        break;
      }
      case 'KeyS': {
        if (isDisplayView) {
          e.preventDefault();
          const r = state.room.roomId ? `?room=${state.room.roomId}` : '';
          window.location.href = `/control/${r}`;
        }
        break;
      }
      case 'F11': {
        if (isDisplayView) {
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        }
        break;
      }
      case 'KeyM': {
        if (!isDisplayView) {
          e.preventDefault();
          updateAudioConfig({ masterMute: !state.audio.masterMute });
        }
        break;
      }
    }
  }, [state.timer.mode, state.timer.status, state.audio.masterMute, state.room.roomId, startTimer, pauseTimer, resetTimer, updateAudioConfig, engine.remainingSeconds, isDisplayView]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
