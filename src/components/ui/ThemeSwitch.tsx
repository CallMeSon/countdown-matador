'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme } from '@/lib/theme';

export function ThemeSwitch({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-transition');
    applyTheme(next);
    window.setTimeout(() => root.classList.remove('theme-transition'), 250);
    setDark(next === 'dark');
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Mode gelap"
      onClick={toggle}
      className={`theme-switch relative before:absolute before:-inset-[5px] before:content-[''] h-[34px] w-[68px] shrink-0 rounded-full bg-ink ${className}`}
    >
      <span
        aria-hidden="true"
        className="theme-switch-knob absolute left-[3px] top-[3px] h-7 w-7 rounded-full bg-accent"
        style={{ transform: dark ? 'translateX(34px)' : 'translateX(0)' }}
      />
      <Sun
        aria-hidden="true"
        size={16}
        className={`theme-switch-icon absolute left-[9px] top-[8px] ${dark ? 'text-white/70' : 'text-on-accent'}`}
      />
      <Moon
        aria-hidden="true"
        size={16}
        className={`theme-switch-icon absolute right-[9px] top-[8px] ${dark ? 'text-on-accent' : 'text-white/70'}`}
      />
    </button>
  );
}
