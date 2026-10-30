'use client';

import { useState } from 'react';
import { generateRoomCode } from '@/lib/room-code';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { PageShell } from '@/components/ui/PageShell';
import { ThemeSwitch } from '@/components/ui/ThemeSwitch';

export function RoomGate({
  lastUsedRoom,
  onSubmit,
  title = 'Control',
}: {
  lastUsedRoom: string | null;
  onSubmit: (code: string) => void;
  title?: string;
}) {
  const [joinCode, setJoinCode] = useState(lastUsedRoom ?? '');

  return (
    <PageShell contentClassName="items-center justify-center">
      <Card className="w-full max-w-[480px] space-y-8 text-center sm:p-10">
        <div className="flex justify-end">
          <ThemeSwitch />
        </div>

        <header className="space-y-3">
          <h1 className="font-display text-5xl font-light tracking-tight sm:text-6xl">{title}</h1>
          <p className="text-base text-sub">Buat room baru atau gabung ke room yang sudah ada.</p>
        </header>

        <Button variant="accent" size="lg" onClick={() => onSubmit(generateRoomCode())} className="w-full tracking-wide">
          BUAT ROOM BARU
        </Button>

        <div className="flex items-center gap-4 text-xs font-medium tracking-wide text-sub">
          <div className="h-px flex-1 bg-line" />
          ATAU
          <div className="h-px flex-1 bg-line" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) onSubmit(joinCode);
          }}
          className="space-y-3"
        >
          <Field
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="KODE ROOM"
            aria-label="Kode room"
            className="w-full text-center text-lg font-semibold uppercase tracking-[0.3em]"
          />
          <Button type="submit" variant="ghost" className="w-full tracking-wide">
            GABUNG ROOM
          </Button>
        </form>

        {lastUsedRoom && (
          <button
            onClick={() => onSubmit(lastUsedRoom)}
            className="btn min-h-11 w-full rounded-control px-4 py-2 text-sm text-sub hover:text-fg"
          >
            Lanjutkan room terakhir: {lastUsedRoom} →
          </button>
        )}
      </Card>
    </PageShell>
  );
}
