'use client';

import Link from 'next/link';
import { RoomInfo } from './RoomInfo';
import { ThemeSwitch } from './ThemeSwitch';

export function AppNav({ room, active }: { room?: string; active?: 'control' | 'layar' }) {
  const link = (key: 'control' | 'layar', label: string) => (
    <Link
      href={`/${key}?room=${room}`}
      aria-current={active === key ? 'page' : undefined}
      className={`rounded-control px-2 py-2 text-sm font-medium sm:px-3 ${active === key ? 'bg-canvas/15 text-canvas' : 'text-canvas/70'}`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex min-h-14 w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-nav px-3 py-2 text-canvas sm:gap-x-4 sm:px-4">
      <span className="order-1 font-bold">Matador</span>
      {room && (
        <div className="order-3 flex w-full items-center gap-1 sm:order-2 sm:w-auto">
          {link('control', 'Control')}
          {link('layar', 'Layar')}
        </div>
      )}
      <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:gap-3">
        {room && <RoomInfo room={room} />}
        <ThemeSwitch />
      </div>
    </nav>
  );
}
