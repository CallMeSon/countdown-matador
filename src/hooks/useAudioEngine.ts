'use client';

import { useCallback, useRef } from 'react';
import { AudioConfig } from '@/types/timer';

type SoundType = 'beep' | 'chime' | 'bell' | 'horn' | 'buzzer';

export function useAudioEngine(config: AudioConfig) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const getVolume = useCallback((localVol: number) => {
    if (config.masterMute) return 0;
    return (localVol / 100) * (config.masterVolume / 100);
  }, [config.masterMute, config.masterVolume]);

  // Generate simple tones using Web Audio API
  const playTone = useCallback((frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {
      // audio context may not be available
    }
  }, [getAudioCtx]);

  const playBuiltInSound = useCallback((soundType: SoundType, volume: number) => {
    const vol = getVolume(volume);
    if (vol <= 0) return;

    switch (soundType) {
      case 'beep':
        playTone(880, 0.2, vol, 'sine');
        setTimeout(() => playTone(880, 0.2, vol, 'sine'), 250);
        break;
      case 'chime':
        playTone(523, 0.4, vol, 'sine');
        setTimeout(() => playTone(659, 0.4, vol, 'sine'), 180);
        setTimeout(() => playTone(784, 0.6, vol, 'sine'), 360);
        break;
      case 'bell':
        playTone(800, 0.8, vol, 'triangle');
        break;
      case 'horn':
        playTone(220, 0.8, vol, 'sawtooth');
        setTimeout(() => playTone(220, 0.8, vol * 0.8, 'sawtooth'), 450);
        break;
      case 'buzzer':
        // Arena Buzzer (150Hz harsh buzz)
        playTone(150, 0.9, vol, 'sawtooth');
        break;
    }
  }, [playTone, getVolume]);

  // Single short countdown tick (3..2..1 or 10..9..8..1)
  const playCountdownTick = useCallback((freq = 880, volume = 75) => {
    const vol = getVolume(volume);
    if (vol <= 0) return;
    playTone(freq, 0.12, vol, 'sine');
  }, [getVolume, playTone]);

  // Go / Start fanfare
  const playGoSound = useCallback((volume = 80) => {
    const vol = getVolume(volume);
    if (vol <= 0) return;
    playTone(523, 0.12, vol, 'sine');
    setTimeout(() => playTone(659, 0.12, vol, 'sine'), 100);
    setTimeout(() => playTone(784, 0.12, vol, 'sine'), 200);
    setTimeout(() => playTone(1046, 0.35, vol, 'sine'), 300);
  }, [getVolume, playTone]);

  // Finish 00:00 Buzzer
  const playBuzzerSound = useCallback((volume = 85) => {
    const vol = getVolume(volume);
    if (vol <= 0) return;
    if (config.endBuzzerSoundType === 'none') return;
    playBuiltInSound((config.endBuzzerSoundType || 'buzzer') as SoundType, config.endBuzzerVolume || volume);
  }, [config.endBuzzerSoundType, config.endBuzzerVolume, getVolume, playBuiltInSound]);

  const playWarningSound = useCallback(() => {
    if (config.warningSoundType === 'none') return;
    if (config.warningSoundType === 'custom') return;
    playBuiltInSound(config.warningSoundType as SoundType, config.warningSoundVolume);
  }, [config.warningSoundType, config.warningSoundVolume, playBuiltInSound]);

  const playOvertimeSound = useCallback(() => {
    if (config.overtimeSoundType === 'none') return;
    if (config.overtimeSoundType === 'custom') return;
    playBuiltInSound(config.overtimeSoundType as SoundType, config.overtimeSoundVolume);
  }, [config.overtimeSoundType, config.overtimeSoundVolume, playBuiltInSound]);

  const playStartSound = useCallback(() => {
    if (!config.startSoundEnabled) return;
    const vol = getVolume(70);
    if (vol <= 0) return;
    playTone(523, 0.15, vol, 'sine');
    setTimeout(() => playTone(659, 0.15, vol, 'sine'), 150);
    setTimeout(() => playTone(784, 0.2, vol, 'sine'), 300);
  }, [config.startSoundEnabled, playTone, getVolume]);

  const playEndSound = useCallback(() => {
    if (!config.endSoundEnabled) return;
    const vol = getVolume(80);
    if (vol <= 0) return;
    playTone(784, 0.2, vol, 'sine');
    setTimeout(() => playTone(659, 0.2, vol, 'sine'), 200);
    setTimeout(() => playTone(523, 0.3, vol, 'sine'), 400);
  }, [config.endSoundEnabled, playTone, getVolume]);

  // Background music controls
  const playBgMusic = useCallback(() => {
    if (!config.bgMusicUrl || !config.bgMusicEnabled) return;
    try {
      if (!bgMusicRef.current) {
        bgMusicRef.current = new Audio(config.bgMusicUrl);
        bgMusicRef.current.loop = config.bgMusicLoop;
      }
      bgMusicRef.current.volume = getVolume(config.bgMusicVolume);
      bgMusicRef.current.play();
    } catch {
      // ignore
    }
  }, [config, getVolume]);

  const pauseBgMusic = useCallback(() => {
    bgMusicRef.current?.pause();
  }, []);

  const stopBgMusic = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
  }, []);

  const setBgMusicUrl = useCallback((url: string) => {
    stopBgMusic();
    bgMusicRef.current = new Audio(url);
    bgMusicRef.current.loop = config.bgMusicLoop;
  }, [config.bgMusicLoop, stopBgMusic]);

  // Test/preview a sound
  const testSound = useCallback((soundType: SoundType) => {
    playBuiltInSound(soundType, 75);
  }, [playBuiltInSound]);

  return {
    playWarningSound,
    playOvertimeSound,
    playStartSound,
    playEndSound,
    playCountdownTick,
    playGoSound,
    playBuzzerSound,
    playBgMusic,
    pauseBgMusic,
    stopBgMusic,
    setBgMusicUrl,
    testSound,
    playTone,
  };
}
