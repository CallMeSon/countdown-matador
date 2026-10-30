'use client';

import { useEffect, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { useRoom } from '@/hooks/useRoom';
import { timerStore } from '@/lib/timer-store';
import { STAGE_HEIGHT, STAGE_WIDTH, useStageScale } from '@/hooks/useStageScale';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import { StageBackground } from '@/components/StageBackground';
import { MatadorStage } from '@/components/stage/MatadorStage';

export default function MatadorPage() {
  const { ready, room, lastUsedRoom, setRoom } = useRoom();

  // Read-only display: aman auto-join dari room terakhir, gak perlu klik.
  useEffect(() => {
    if (ready && !room && lastUsedRoom) setRoom(lastUsedRoom);
  }, [ready, room, lastUsedRoom, setRoom]);

  if (!ready) {
    return <main className="h-screen w-screen bg-black" />;
  }

  if (!room) {
    return <RoomEntryGate onSubmit={setRoom} />;
  }

  return <MatadorDisplay />;
}

function RoomEntryGate({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-black">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onSubmit(code);
        }}
        className="w-full max-w-xs space-y-4 px-6 text-center"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="KODE ROOM"
          aria-label="Kode room"
          autoFocus
          className="w-full rounded-control border border-line-dark bg-ink-warm px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] text-canvas uppercase focus:border-accent"
        />
        <button
          type="submit"
          className="btn w-full rounded-control bg-accent px-6 py-3 font-bold tracking-widest text-on-accent hover:bg-accent-hover"
        >
          TAMPILKAN
        </button>
      </form>
    </main>
  );
}

function MatadorDisplay() {
  const { state } = useTimer();
  const scale = useStageScale();
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;

  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <StageBackground appearance={appearance} />
      <div
        className="relative z-10"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        <MatadorStage state={state} />
      </div>
    </main>
  );
}
