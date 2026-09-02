'use client';

import React, { useCallback, useState } from 'react';
import { AppProvider, useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioTriggers } from '@/hooks/useAudioTriggers';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRouter } from 'next/navigation';

export function DisplayContent() {
  const { state } = useApp();
  const engine = useTimerEngine();
  const router = useRouter();
  const [showSettingsHint, setShowSettingsHint] = useState(false);

  useKeyboardShortcuts(true);

  const { timer, display, activeCue, quickMessage, quickMessageExpiry, preStartRemaining, room } = state;
  const audioEngine = useAudioEngine(state.audio);
  useAudioTriggers(audioEngine);

  // Navigate to settings
  const goToSettings = useCallback(() => {
    const r = room.roomId ? `?room=${room.roomId}` : '';
    router.push(`/control${r}`);
  }, [router, room.roomId]);

  // Determine timer color
  const getTimerColor = (): string => {
    if (engine.isOvertime) return display.overtimeColor;
    if (timer.mode === 'realtime-wib') return display.wibColor;
    if (engine.currentWarning) return engine.currentWarning.color;
    return display.normalColor;
  };

  // Position styles (Center 50%, 50% default)
  const getPositionStyles = (): React.CSSProperties => {
    const { position } = display;
    const anchorMap: Record<string, { x: number; y: number }> = {
      'top-left': { x: 15, y: 15 },
      'top-center': { x: 50, y: 15 },
      'top-right': { x: 85, y: 15 },
      'center-left': { x: 15, y: 50 },
      'center': { x: 50, y: 50 },
      'center-right': { x: 85, y: 50 },
      'bottom-left': { x: 15, y: 85 },
      'bottom-center': { x: 50, y: 85 },
      'bottom-right': { x: 85, y: 85 },
      'custom': { x: position?.x ?? 50, y: position?.y ?? 50 },
    };
    const pos = anchorMap[position?.anchor] || anchorMap['center'];
    return {
      position: 'absolute',
      left: `${pos.x}%`,
      top: `${pos.y}%`,
      transform: 'translate(-50%, -50%)',
      width: '100%',
      maxWidth: '96vw',
    };
  };

  // Font family & weight classes
  const fontClass = display.fontFamily === 'anton' 
    ? 'font-anton' 
    : display.fontFamily === 'bebas' 
      ? 'font-bebas' 
      : 'font-inter';

  const weightClass = display.fontWeight === 'normal' ? 'font-normal'
    : display.fontWeight === 'semibold' ? 'font-semibold'
    : display.fontWeight === 'black' ? 'font-black'
    : 'font-bold';

  // Check if quick message is still valid
  const isQuickMessageActive = quickMessage && quickMessageExpiry && Date.now() < quickMessageExpiry;

  // Background style
  const bgStyle: React.CSSProperties = (() => {
    if (display.backgroundType === 'gradient') {
      return { background: display.backgroundGradient };
    }
    if (display.backgroundType === 'image' && display.backgroundImage) {
      return {
        backgroundColor: display.backgroundColor,
        backgroundImage: `url(${display.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { backgroundColor: display.backgroundColor };
  })();

  // Dynamic Fullscreen Font Size Formula (ignoring leading minus sign so Overtime does NOT shrink)
  const cleanDigits = engine.displayTime.replace(/^-/, '');
  const isLongFormat = cleanDigits.length > 5;
  const baseVw = isLongFormat ? 18 : 28;
  const maxVh = isLongFormat ? 46 : 56;
  const userScale = (display.fontSize || 100) / 100;
  const fontSizeStyle = `clamp(3rem, min(calc(${baseVw}vw * ${userScale}), calc(${maxVh}vh * ${userScale})), 60rem)`;

  return (
    <div 
      className="w-screen h-screen overflow-hidden relative select-none bg-black"
      style={bgStyle}
    >
      {/* Background image overlay for opacity */}
      {display.backgroundType === 'image' && display.backgroundImage && display.backgroundOpacity < 100 && (
        <div 
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: 1 - display.backgroundOpacity / 100 }}
        />
      )}

      {/* Main Full-Screen Layout */}
      <div className="relative w-full h-full">
        
        {/* Tally Light */}
        {display.tallyLightEnabled && display.tallyStatus !== 'off' && (
          <div className={`absolute top-5 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-full ${
            display.tallyStatus === 'on-air' 
              ? 'bg-red-600/90 animate-tally-blink' 
              : 'bg-yellow-600/90'
          }`}>
            <div className={`w-3.5 h-3.5 rounded-full ${
              display.tallyStatus === 'on-air' ? 'bg-red-300' : 'bg-yellow-300'
            }`} />
            <span className="text-white text-sm font-bold tracking-wider uppercase font-inter">
              {display.tallyStatus === 'on-air' ? 'ON AIR' : 'STANDBY'}
            </span>
          </div>
        )}

        {/* Logo Overlay */}
        {display.logoEnabled && display.logoUrl && (
          <div className={`absolute z-20 ${
            display.logoPosition === 'top-left' ? 'top-6 left-6' :
            display.logoPosition === 'top-right' ? 'top-6 right-6' :
            display.logoPosition === 'bottom-left' ? 'bottom-6 left-6' :
            'bottom-6 right-6'
          }`}>
            <img 
              src={display.logoUrl} 
              alt="Logo" 
              className="object-contain"
              style={{ 
                width: `${display.logoSize}%`,
                maxWidth: `${display.logoSize * 4}px`,
                opacity: display.logoOpacity / 100,
              }} 
            />
          </div>
        )}

        {/* Progress Bar */}
        {display.progressBarEnabled && timer.mode !== 'realtime-wib' && preStartRemaining === null && (
          <div 
            className={`absolute left-0 right-0 z-20 ${
              display.progressBarPosition === 'top' ? 'top-0' : 'bottom-0'
            }`}
            style={{ height: `${display.progressBarHeight}px` }}
          >
            <div 
              className="h-full transition-all duration-300 ease-linear"
              style={{ 
                width: `${engine.progress * 100}%`,
                backgroundColor: engine.isOvertime ? display.overtimeColor : display.progressBarColor,
              }} 
            />
          </div>
        )}

        {/* Message / Ticker — Top */}
        {((display.messageEnabled && display.messageText && display.messagePosition === 'top') || 
          (isQuickMessageActive && display.messagePosition === 'top')) && (
          <div 
            className="absolute top-0 left-0 right-0 z-20 overflow-hidden"
            style={{ 
              backgroundColor: display.messageBgColor,
              color: display.messageColor,
            }}
          >
            <div className={`py-3 px-6 text-base font-inter font-medium ${
              display.messageStyle === 'scroll-ticker' ? 'animate-ticker-scroll whitespace-nowrap' : 'text-center'
            }`}>
              {isQuickMessageActive ? quickMessage : display.messageText}
            </div>
          </div>
        )}

        {/* Custom Positioned Session Label (Independent Drag & Drop) */}
        {display.sessionLabelPlacement === 'custom' && display.sessionLabelVisible && timer.sessionLabel && (
          <div 
            style={{
              position: 'absolute',
              left: `${display.sessionLabelPosition?.x ?? 50}%`,
              top: `${display.sessionLabelPosition?.y ?? 30}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="z-10 max-w-6xl px-4 text-center pointer-events-none select-none"
          >
            <span 
              className={`inline-block tracking-[0.15em] uppercase drop-shadow-2xl text-center leading-tight transition-all ${
                display.sessionLabelFontFamily === 'anton' ? 'font-anton'
                  : display.sessionLabelFontFamily === 'bebas' ? 'font-bebas'
                  : 'font-inter'
              } ${
                display.sessionLabelFontWeight === 'normal' ? 'font-normal'
                  : display.sessionLabelFontWeight === 'semibold' ? 'font-semibold'
                  : display.sessionLabelFontWeight === 'bold' ? 'font-bold'
                  : 'font-black'
              }`}
              style={{
                color: display.sessionLabelColor || '#ffffff',
                fontSize: `clamp(1.5rem, calc(min(4.5vw, 6.5vh) * ${((display.sessionLabelScale || 100) / 100)}), 12rem)`,
              }}
            >
              {timer.sessionLabel}
            </span>
          </div>
        )}

        {/* Main Giant Center Display */}
        <div style={getPositionStyles()} className="z-10 flex flex-col items-center justify-center text-center">
          
          {preStartRemaining !== null ? (
            /* PRE-START LEAD-IN (3.. 2.. 1.. GO!) */
            <div className="flex flex-col items-center justify-center animate-fadeIn py-6">
              {preStartRemaining > 0 ? (
                <>
                  <span className="text-white/60 font-inter text-2xl md:text-4xl font-bold uppercase tracking-[0.25em] mb-4">
                    STARTING IN
                  </span>
                  <span className="text-yellow-400 font-anton text-[14rem] md:text-[22rem] leading-none animate-bounce drop-shadow-[0_0_60px_rgba(250,204,21,0.8)]">
                    {preStartRemaining}
                  </span>
                </>
              ) : (
                <div className="animate-pulse">
                  <span className="text-green-400 font-anton text-[15rem] md:text-[22rem] leading-none drop-shadow-[0_0_80px_rgba(74,222,128,0.9)]">
                    GO!
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* REGULAR BROADCAST TIMER */
            <>
              {/* Overtime Banner */}
              {engine.isOvertime && (
                <div className="mb-3 md:mb-5 animate-overtime-pulse">
                  <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 text-white font-inter font-bold text-lg md:text-2xl tracking-widest shadow-2xl uppercase">
                    <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>OVERTIME</span>
                  </span>
                </div>
              )}

              {/* WIB Badge */}
              {timer.mode === 'realtime-wib' && (
                <div className="mb-3 md:mb-5">
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-inter font-bold text-sm md:text-lg tracking-widest uppercase shadow-xl">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>JAKARTA TIME (WIB / GMT+7)</span>
                  </span>
                </div>
              )}

              {/* Session Label — Above Timer */}
              {display.sessionLabelPlacement !== 'custom' && display.sessionLabelPlacement !== 'below-timer' && display.sessionLabelVisible && timer.sessionLabel && (
                <div className="mb-4 md:mb-6 max-w-6xl px-4 text-center">
                  <span 
                    className={`inline-block tracking-[0.15em] uppercase drop-shadow-2xl text-center leading-tight transition-all ${
                      display.sessionLabelFontFamily === 'anton' ? 'font-anton'
                        : display.sessionLabelFontFamily === 'bebas' ? 'font-bebas'
                        : 'font-inter'
                    } ${
                      display.sessionLabelFontWeight === 'normal' ? 'font-normal'
                        : display.sessionLabelFontWeight === 'semibold' ? 'font-semibold'
                        : display.sessionLabelFontWeight === 'bold' ? 'font-bold'
                        : 'font-black'
                    }`}
                    style={{
                      color: display.sessionLabelColor || '#ffffff',
                      fontSize: `clamp(1.5rem, calc(min(4.5vw, 6.5vh) * ${((display.sessionLabelScale || 100) / 100)}), 12rem)`,
                    }}
                  >
                    {timer.sessionLabel}
                  </span>
                </div>
              )}

              {/* Giant Timer Digits */}
              <div 
                className={`timer-digits ${fontClass} ${weightClass} transition-all duration-150 leading-[0.88] tracking-[0.04em] drop-shadow-2xl ${
                  engine.shouldFlash ? 'animate-warning-flash' : ''
                }`}
                style={{ 
                  color: getTimerColor(),
                  fontSize: fontSizeStyle,
                }}
              >
                {engine.displayTime}
              </div>

              {/* Session Label — Below Timer */}
              {display.sessionLabelPlacement === 'below-timer' && display.sessionLabelVisible && timer.sessionLabel && (
                <div className="mt-4 md:mt-6 max-w-6xl px-4 text-center">
                  <span 
                    className={`inline-block tracking-[0.15em] uppercase drop-shadow-2xl text-center leading-tight transition-all ${
                      display.sessionLabelFontFamily === 'anton' ? 'font-anton'
                        : display.sessionLabelFontFamily === 'bebas' ? 'font-bebas'
                        : 'font-inter'
                    } ${
                      display.sessionLabelFontWeight === 'normal' ? 'font-normal'
                        : display.sessionLabelFontWeight === 'semibold' ? 'font-semibold'
                        : display.sessionLabelFontWeight === 'bold' ? 'font-bold'
                        : 'font-black'
                    }`}
                    style={{
                      color: display.sessionLabelColor || '#ffffff',
                      fontSize: `clamp(1.5rem, calc(min(4.5vw, 6.5vh) * ${((display.sessionLabelScale || 100) / 100)}), 12rem)`,
                    }}
                  >
                    {timer.sessionLabel}
                  </span>
                </div>
              )}

              {/* Status indicator for idle */}
              {timer.status === 'idle' && timer.mode === 'countdown' && (
                <div className="mt-3 md:mt-5">
                  <span className="text-white/40 font-inter font-semibold text-xs md:text-base tracking-[0.25em] uppercase">
                    READY
                  </span>
                </div>
              )}

              {/* Paused indicator */}
              {timer.status === 'paused' && (
                <div className="mt-3 md:mt-5 animate-overtime-pulse">
                  <span className="inline-flex items-center gap-2 text-yellow-400 font-inter font-bold text-sm md:text-lg tracking-[0.25em] uppercase">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    <span>PAUSED</span>
                  </span>
                </div>
              )}

              {/* Stopwatch mode label */}
              {timer.mode === 'stopwatch' && (
                <div className="mt-3 md:mt-5">
                  <span className="inline-flex items-center gap-2 text-white/50 font-inter font-semibold text-xs md:text-base tracking-[0.25em] uppercase">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>STOPWATCH</span>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message / Ticker — Bottom */}
        {((display.messageEnabled && display.messageText && display.messagePosition === 'bottom') || 
          (isQuickMessageActive && display.messagePosition === 'bottom')) && (
          <div 
            className="absolute bottom-0 left-0 right-0 z-20 overflow-hidden"
            style={{ 
              backgroundColor: display.messageBgColor,
              color: display.messageColor,
            }}
          >
            <div className={`py-3 px-6 text-base font-inter font-medium ${
              display.messageStyle === 'scroll-ticker' ? 'animate-ticker-scroll whitespace-nowrap' : 'text-center'
            }`}>
              {isQuickMessageActive ? quickMessage : display.messageText}
            </div>
          </div>
        )}

        {/* Quick Message Overlay */}
        {isQuickMessageActive && !display.messageEnabled && (
          <div className="absolute bottom-10 left-0 right-0 z-25 flex justify-center">
            <div className="bg-black/90 border border-white/20 rounded-xl px-10 py-4 shadow-2xl">
              <span className="text-white font-inter font-bold text-xl md:text-2xl">
                {quickMessage}
              </span>
            </div>
          </div>
        )}

        {/* Stage Cue Flash Overlay */}
        {activeCue && (
          <div className={`absolute inset-0 z-50 flex items-center justify-center animate-cue-flash ${
            activeCue === 'standby' ? 'bg-yellow-500/90' :
            activeCue === 'go' ? 'bg-green-600/90' :
            'bg-red-600/90'
          }`}>
            <div className="text-white text-center">
              <div className="text-7xl md:text-9xl font-black font-inter tracking-widest uppercase">
                {activeCue === 'standby' ? 'STANDBY' : activeCue === 'go' ? 'GO' : 'WRAP UP'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Settings Button — Top Right */}
      <div 
        className="absolute top-0 right-0 w-24 h-24 z-40 cursor-pointer group"
        onMouseEnter={() => setShowSettingsHint(true)}
        onMouseLeave={() => setShowSettingsHint(false)}
        onClick={goToSettings}
      >
        <div className={`absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
          showSettingsHint ? 'opacity-80 bg-white/20 scale-110 shadow-lg text-white' : 'opacity-0'
        }`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function DisplayView() {
  return (
    <AppProvider isAdmin={false}>
      <DisplayContent />
    </AppProvider>
  );
}
