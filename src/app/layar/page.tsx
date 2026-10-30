'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Redo2, Undo2 } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useRoom } from '@/hooks/useRoom';
import { useLayoutEditor } from '@/hooks/useLayoutEditor';
import { STAGE_HEIGHT, STAGE_WIDTH } from '@/hooks/useStageScale';
import { timerStore } from '@/lib/timer-store';
import type { LayoutPage } from '@/lib/timer-store';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import { RoomGate } from '@/components/RoomGate';
import { StageBackground } from '@/components/StageBackground';
import { TimerStage } from '@/components/stage/TimerStage';
import { MatadorStage } from '@/components/stage/MatadorStage';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { ElementList, BUILTIN_KEYS } from '@/components/editor/ElementList';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { BackgroundPanel } from '@/components/editor/BackgroundPanel';
import { AppNav } from '@/components/ui/AppNav';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';

const FALLBACK_SCALE = 0.4; // dipakai bila lebar kontainer belum terukur (mis. jsdom)

export default function LayarPage() {
  const { ready, room, lastUsedRoom, setRoom } = useRoom();

  useEffect(() => {
    if (room) timerStore.setRoom(room);
  }, [room]);

  if (!ready) {
    return <main className="min-h-screen bg-page" />;
  }

  if (!room) {
    return <RoomGate title="Layar" lastUsedRoom={lastUsedRoom} onSubmit={setRoom} />;
  }

  return <LayarBody room={room} />;
}

function LayarBody({ room }: { room: string }) {
  const [page, setPage] = useState<LayoutPage>('timer');
  // key={page}: riwayat undo/redo dan seleksi dimulai ulang tiap ganti halaman.
  return <Editor key={page} room={room} page={page} onPageChange={setPage} />;
}

function Editor({
  room,
  page,
  onPageChange,
}: {
  room: string;
  page: LayoutPage;
  onPageChange: (p: LayoutPage) => void;
}) {
  const { state, displayTime } = useTimer();
  const [syncTick, setSyncTick] = useState(0);
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }
    // Satu denyut tiap perubahan layout tersinkron (bukan loop).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncTick((t) => t + 1);
  }, [state.layoutTimer, state.layoutMatador]);
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(FALLBACK_SCALE);
  const [tab, setTab] = useState<'elemen' | 'latar'>('elemen');
  const editor = useLayoutEditor(page, scale);

  // Skala stage = lebar kontainer / 1920 (tanpa ResizeObserver, mis. jsdom: pakai fallback).
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / STAGE_WIDTH);
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard: aktif hanya saat fokus tidak di kolom isian.
  const ed = useRef(editor);
  useEffect(() => {
    ed.current = editor;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.defaultPrevented) return;
      const cur = ed.current;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) cur.redo();
        else cur.undo();
        return;
      }
      if (mod || e.altKey) return;
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowLeft':
          if (cur.selection?.kind === 'text') { e.preventDefault(); cur.nudge(-step, 0); }
          break;
        case 'ArrowRight':
          if (cur.selection?.kind === 'text') { e.preventDefault(); cur.nudge(step, 0); }
          break;
        case 'ArrowUp':
          if (cur.selection?.kind === 'text') { e.preventDefault(); cur.nudge(0, -step); }
          break;
        case 'ArrowDown':
          if (cur.selection?.kind === 'text') { e.preventDefault(); cur.nudge(0, step); }
          break;
        case 'Delete':
        case 'Backspace':
          if (cur.selection?.kind === 'text') { e.preventDefault(); cur.removeSelected(); }
          break;
        case 'Escape':
          cur.select(null);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const iconBtn =
    'btn flex h-11 w-11 items-center justify-center rounded-control border border-line bg-control text-fg disabled:opacity-40';

  return (
    <PageShell>
        <AppNav room={room} active="layar" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            ariaLabel="Halaman yang diedit"
            value={page}
            onChange={onPageChange}
            options={[
              { value: 'timer', label: 'Layar Timer' },
              { value: 'matador', label: 'Layar Matador' },
            ]}
          />
          <div className="flex items-center gap-2">
            <span className="flex h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm text-fg">
              <span className="relative h-2 w-2" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-accent" />
                <span key={syncTick} className="m-ping absolute inset-0 rounded-full bg-accent" />
              </span>
              Live
            </span>
            <button type="button" aria-label="Urungkan" disabled={!editor.canUndo} onClick={editor.undo} className={iconBtn}>
              <Undo2 size={18} />
            </button>
            <button type="button" aria-label="Ulangi" disabled={!editor.canRedo} onClick={editor.redo} className={iconBtn}>
              <Redo2 size={18} />
            </button>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="lg:sticky lg:top-6">
            <div className="rounded-card border border-line bg-well p-5">
              <div
                ref={frameRef}
                data-testid="stage-frame"
                className="relative w-full overflow-hidden rounded-media bg-black"
                style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}
              >
                <div
                  className="absolute left-0 top-0"
                  style={{
                    width: STAGE_WIDTH,
                    height: STAGE_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <StageBackground appearance={appearance} />
                  {page === 'timer' ? <TimerStage state={state} editing /> : <MatadorStage state={state} editing />}
                  <EditorCanvas
                    page={page}
                    state={state}
                    editor={editor}
                    scale={scale}
                    builtinKeys={BUILTIN_KEYS[page]}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-sub">
                <span>Stage 1920 × 1080</span>
                <span>Fit {Math.round(scale * 100)}%</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-sub">
Klik elemen di layar atau di daftar untuk mengubah tampilannya. Posisi elemen bawaan terkunci; hanya teks
              tambahan yang bisa digeser (seret), diubah isinya (klik dua kali), dan diubah ukurannya (tarik sudut).
            </p>
          </div>

          <aside className="space-y-5">
            <Segmented
              ariaLabel="Panel samping"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'elemen', label: 'Elemen' },
                { value: 'latar', label: 'Latar' },
              ]}
            />
            {tab === 'elemen' ? (
              <>
                <ElementList page={page} state={state} editor={editor} digitTime={displayTime} />
                <PropertiesPanel page={page} state={state} editor={editor} />
              </>
            ) : (
              <Card title="Latar" className="!p-6">
                <BackgroundPanel />
              </Card>
            )}
          </aside>
        </div>
    </PageShell>
  );
}
