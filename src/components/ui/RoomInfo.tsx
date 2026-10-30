'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './Button';

export function RoomInfo({ room }: { room: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  return (
    <>
      <span className="max-w-[7.5rem] truncate rounded-full bg-highlight px-3 py-1 text-sm font-medium text-ink sm:max-w-none">
        <span className="hidden sm:inline">Room </span>
        {room}
      </span>
      <Button variant="accent" onClick={copy} aria-label="Salin kode room" className="!min-h-[36px] !px-2.5 text-sm sm:!px-3">
        <span key={String(copied)} className="m-fade-in flex items-center gap-1.5">
          {copied ? <Check size={16} aria-hidden="true" className="sm:hidden" /> : <Copy size={16} aria-hidden="true" className="sm:hidden" />}
          <span className="sr-only sm:not-sr-only">{copied ? 'Tersalin!' : 'Salin kode'}</span>
        </span>
      </Button>
    </>
  );
}
