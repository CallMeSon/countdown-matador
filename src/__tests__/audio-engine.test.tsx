import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { DEFAULT_AUDIO_CONFIG } from '@/types/timer';

describe('Web Audio Synthesizer Audio Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes and provides all audio playback methods', () => {
    const { result } = renderHook(() => useAudioEngine(DEFAULT_AUDIO_CONFIG));
    expect(typeof result.current.playStartSound).toBe('function');
    expect(typeof result.current.playWarningSound).toBe('function');
    expect(typeof result.current.playCountdownTick).toBe('function');
    expect(typeof result.current.playGoSound).toBe('function');
    expect(typeof result.current.playBuzzerSound).toBe('function');
    expect(typeof result.current.playOvertimeSound).toBe('function');
  });

  it('triggers start sound without error', () => {
    const { result } = renderHook(() => useAudioEngine(DEFAULT_AUDIO_CONFIG));
    expect(() => {
      act(() => {
        result.current.playStartSound();
      });
    }).not.toThrow();
  });

  it('triggers countdown tick and go sounds', () => {
    const { result } = renderHook(() => useAudioEngine(DEFAULT_AUDIO_CONFIG));
    expect(() => {
      act(() => {
        result.current.playCountdownTick(880, 80);
        result.current.playGoSound(90);
      });
    }).not.toThrow();
  });

  it('triggers buzzer and overtime alerts', () => {
    const { result } = renderHook(() => useAudioEngine(DEFAULT_AUDIO_CONFIG));
    expect(() => {
      act(() => {
        result.current.playBuzzerSound(80);
        result.current.playOvertimeSound();
        result.current.testSound('beep');
        result.current.testSound('horn');
      });
    }).not.toThrow();
  });

  it('handles mute configuration gracefully without throwing', () => {
    const mutedConfig = { ...DEFAULT_AUDIO_CONFIG, masterMute: true };
    const { result } = renderHook(() => useAudioEngine(mutedConfig));

    expect(() => {
      act(() => {
        result.current.playStartSound();
        result.current.playBuzzerSound(100);
      });
    }).not.toThrow();
  });
});
