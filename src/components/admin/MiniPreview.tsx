'use client';

import React from 'react';
import { useApp } from '@/context/TimerContext';
import { useTimerEngine } from '@/hooks/useTimerEngine';

export default function MiniPreview() {
  const { state } = useApp();
  const { display, timer, activeCue } = state;
  const { displayTime, isOvertime, currentWarning } = useTimerEngine();

  // Determine text color
  let textColor = display.normalColor;
  if (isOvertime) textColor = display.overtimeColor;
  else if (currentWarning) textColor = currentWarning.color;
  else if (timer.mode === 'realtime-wib') textColor = display.wibColor;

  // Background style
  const bgStyle: React.CSSProperties = {
    backgroundColor: display.backgroundColor,
    ...(display.backgroundType === 'gradient' && display.backgroundGradient
      ? { background: display.backgroundGradient }
      : {}),
    ...(display.backgroundType === 'image' && display.backgroundImage
      ? {
          backgroundImage: `url(${display.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {}),
  };

  // Font family & weight classes
  const fontClass = display.fontFamily === 'anton' ? 'font-anton' 
    : display.fontFamily === 'bebas' ? 'font-bebas' 
    : 'font-inter';

  const weightClass = display.fontWeight === 'normal' ? 'font-normal'
    : display.fontWeight === 'semibold' ? 'font-semibold'
    : display.fontWeight === 'black' ? 'font-black'
    : 'font-bold';

  // Position calculation for preview
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
    'custom': { x: display.position?.x ?? 50, y: display.position?.y ?? 50 },
  };
  const pos = anchorMap[display.position?.anchor] || anchorMap['center'];

  return (
    <div className="bg-matador-card border border-matador-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Preview</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-gray-500">LIVE</span>
        </div>
      </div>
      <div
        className="w-full aspect-video rounded-lg overflow-hidden relative border border-matador-border/50 select-none"
        style={bgStyle}
      >
        {/* Background opacity overlay */}
        {display.backgroundType === 'image' && display.backgroundImage && (
          <div className="absolute inset-0 bg-black" style={{ opacity: 1 - display.backgroundOpacity / 100 }} />
        )}

        {/* Logo */}
        {display.logoEnabled && display.logoUrl && (
          <div className={`absolute z-10 ${
            display.logoPosition.includes('top') ? 'top-1' : 'bottom-1'
          } ${
            display.logoPosition.includes('left') ? 'left-1' : 'right-1'
          }`}>
            <img 
              src={display.logoUrl} 
              alt="Logo" 
              className="h-3 w-auto"
              style={{ opacity: display.logoOpacity / 100 }}
            />
          </div>
        )}

        {/* Tally Light */}
        {display.tallyLightEnabled && display.tallyStatus !== 'off' && (
          <div className={`absolute top-1 left-1 z-10 px-1 rounded text-[5px] font-bold ${
            display.tallyStatus === 'on-air' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'
          }`}>
            {display.tallyStatus === 'on-air' ? 'ON AIR' : 'STANDBY'}
          </div>
        )}

        {/* Custom Positioned Session Label in Preview */}
        {display.sessionLabelPlacement === 'custom' && display.sessionLabelVisible && timer.sessionLabel && (
          <div 
            style={{
              position: 'absolute',
              left: `${display.sessionLabelPosition?.x ?? 50}%`,
              top: `${display.sessionLabelPosition?.y ?? 30}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="z-10 text-center select-none pointer-events-none"
          >
            <span 
              className={`block leading-tight uppercase tracking-wider ${
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
                fontSize: `calc(7px * ${((display.sessionLabelScale || 100) / 100)})`,
              }}
            >
              {timer.sessionLabel}
            </span>
          </div>
        )}

        {/* Positioned Timer Block (Respects Position X/Y and Font Size) */}
        <div 
          style={{
            position: 'absolute',
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className="z-10 flex flex-col items-center justify-center text-center select-none pointer-events-none"
        >
          {state.preStartRemaining !== null ? (
            <div className="flex flex-col items-center justify-center">
              <span className={`font-anton text-4xl leading-none ${
                state.preStartRemaining > 0 ? 'text-yellow-400 animate-bounce' : 'text-green-400 animate-pulse'
              }`}>
                {state.preStartRemaining > 0 ? state.preStartRemaining : 'GO!'}
              </span>
            </div>
          ) : (
            <>
              {/* WIB Badge in Preview */}
              {timer.mode === 'realtime-wib' && (
                <div className="mb-0.5">
                  <span className="text-[5px] bg-cyan-900/80 text-cyan-300 px-1 py-0.5 rounded font-bold uppercase">
                    WIB
                  </span>
                </div>
              )}

              {/* Session Label in Preview — Above Timer */}
              {display.sessionLabelPlacement !== 'custom' && display.sessionLabelPlacement !== 'below-timer' && display.sessionLabelVisible && timer.sessionLabel && (
                <div className="mb-0.5">
                  <span 
                    className={`block leading-tight uppercase tracking-wider ${
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
                      fontSize: `calc(7px * ${((display.sessionLabelScale || 100) / 100)})`,
                    }}
                  >
                    {timer.sessionLabel}
                  </span>
                </div>
              )}

              {/* Overtime Banner in Preview */}
              {isOvertime && (
                <div className="mb-0.5">
                  <span className="text-[5px] bg-red-600/90 text-white px-1 py-0.2 rounded font-bold uppercase tracking-wider animate-overtime-pulse">
                    OVERTIME
                  </span>
                </div>
              )}

              {/* Timer Digits */}
              <span 
                className={`${fontClass} ${weightClass} timer-digits block drop-shadow-lg transition-all duration-150 leading-[0.88]`}
                style={{ 
                  color: textColor,
                  fontSize: `calc(${displayTime.replace(/^-/, '').length > 5 ? '1.7rem' : '2.5rem'} * ${(display.fontSize || 100) / 100})`,
                }}
              >
                {displayTime}
              </span>

              {/* Session Label in Preview — Below Timer */}
              {display.sessionLabelPlacement === 'below-timer' && display.sessionLabelVisible && timer.sessionLabel && (
                <div className="mt-0.5">
                  <span 
                    className={`block leading-tight uppercase tracking-wider ${
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
                      fontSize: `calc(7px * ${((display.sessionLabelScale || 100) / 100)})`,
                    }}
                  >
                    {timer.sessionLabel}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress Bar */}
        {display.progressBarEnabled && timer.mode !== 'realtime-wib' && state.preStartRemaining === null && (
          <div 
            className={`absolute left-0 right-0 z-10 ${display.progressBarPosition === 'top' ? 'top-0' : 'bottom-0'}`}
            style={{ height: '2px' }}
          >
            <div 
              className="h-full transition-all duration-300" 
              style={{ 
                width: `${Math.min(100, (useTimerEngine().progress || 0) * 100)}%`,
                backgroundColor: isOvertime ? display.overtimeColor : display.progressBarColor,
              }} 
            />
          </div>
        )}

        {/* Message */}
        {display.messageEnabled && display.messageText && (
          <div 
            className={`absolute left-0 right-0 z-10 ${display.messagePosition === 'top' ? 'top-0' : 'bottom-0'}`}
            style={{ backgroundColor: display.messageBgColor }}
          >
            <div className="text-[5px] px-1 py-0.5 text-center" style={{ color: display.messageColor }}>
              {display.messageText}
            </div>
          </div>
        )}

        {/* Cue indicator */}
        {activeCue && (
          <div className={`absolute inset-0 z-20 border-2 pointer-events-none rounded-lg ${
            activeCue === 'standby' ? 'border-yellow-400 bg-yellow-500/20' : 
            activeCue === 'go' ? 'border-green-400 bg-green-500/20' : 'border-red-400 bg-red-500/20'
          }`} />
        )}
      </div>
    </div>
  );
}
