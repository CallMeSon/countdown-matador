'use client';

import type { KeyboardEvent } from 'react';

export interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: SegmentedProps<T>) {
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative inline-grid gap-1 rounded-full bg-nav p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="m-seg-indicator pointer-events-none absolute left-1 top-1 bottom-1 rounded-full bg-canvas"
        style={{
          width: `calc((100% - 8px - ${(options.length - 1) * 4}px) / ${options.length})`,
          transform: `translateX(calc(${Math.max(0, options.findIndex((o) => o.value === value))} * (100% + 4px)))`,
        }}
      />
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`btn relative min-h-[40px] rounded-full px-4 text-sm font-medium ${
              active ? 'text-ink' : 'text-faint'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
