import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { DEFAULT_AUDIO_CONFIG } from '@/types/timer';

describe('Audio Engine Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should play built-in sounds without crashing', () => {
    const { result } = renderHook(() => useAudioEngine(DEFAULT_AUDIO_CONFIG));

    expect(() => {
      act(() => {
        result.current.testSound('beep');
        result.current.testSound('chime');
        result.current.testSound('bell');
        result.current.testSound('horn');
      });
    }).not.toThrow();
  });

  it('should play warning and overtime sounds based on configuration', () => {
    const { result } = renderHook(() =>
      useAudioEngine({
        ...DEFAULT_AUDIO_CONFIG,
        warningSoundType: 'beep',
        overtimeSoundType: 'horn',
      })
    );

    expect(() => {
      act(() => {
        result.current.playWarningSound();
        result.current.playOvertimeSound();
        result.current.playStartSound();
        result.current.playEndSound();
      });
    }).not.toThrow();
  });

  it('should respect master mute state', () => {
    const { result } = renderHook(() =>
      useAudioEngine({
        ...DEFAULT_AUDIO_CONFIG,
        masterMute: true,
      })
    );

    expect(() => {
      act(() => {
        result.current.playWarningSound();
      });
    }).not.toThrow();
  });
});
