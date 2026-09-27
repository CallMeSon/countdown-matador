'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { timerStore } from '@/lib/timer-store';
import type { LayoutPage } from '@/lib/timer-store';
import { LAYOUT_LIMITS, miniToStage } from '@/lib/layout';

export const TIMER_BASE: Record<string, { x: number; y: number }> = {
  digit: { x: 960, y: 540 },
};

export const MATADOR_BASE: Record<string, { x: number; y: number }> = {
  label: { x: 200, y: 54 },
  ticker: { x: 960, y: 54 },
  clock: { x: 1720, y: 54 },
};

export const BUILTIN_LABELS: Record<string, string> = {
  digit: 'DIGIT',
  label: 'LABEL',
  ticker: 'TICKER',
  clock: 'TIMER',
};

type Selection = { kind: 'builtin'; key: string } | { kind: 'text'; id: string } | null;

interface DragState {
  kind: 'builtin' | 'text';
  key: string;
  startClientX: number;
  startClientY: number;
  startDx: number;
  startDy: number;
  startX: number;
  startY: number;
}

interface PendingCoords {
  dx: number;
  dy: number;
  x: number;
  y: number;
}

export function LayoutEditorModal({ page, onClose }: { page: LayoutPage; onClose: () => void }) {
  const { state } = useTimer();
  const layout = (page === 'timer' ? state.layoutTimer : state.layoutMatador) ?? {
    offsets: {},
    texts: [],
  };
  const offsets = layout.offsets ?? {};
  const texts = layout.texts ?? [];
  const base = page === 'timer' ? TIMER_BASE : MATADOR_BASE;
  const builtinKeys = Object.keys(base);

  const [selected, setSelected] = useState<Selection>(null);
  const [textInput, setTextInput] = useState('');
  const dragging = useRef<DragState | null>(null);
  const pending = useRef<PendingCoords | null>(null);
  const raf = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const selectedText =
    selected?.kind === 'text' ? texts.find((t) => t.id === selected.id) : undefined;

  // Sinkron buffer teks saat ganti seleksi; pengetikan jalan via onChange ke store.
  useEffect(() => {
    if (selected?.kind === 'text') {
      const found = texts.find((t) => t.id === selected.id);
      setTextInput(found?.text ?? '');
    } else {
      setTextInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Kunci scroll body + Escape untuk tutup.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      if (raf.current !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(raf.current);
      }
      raf.current = null;
    };
  }, [onClose]);

  const applyPending = () => {
    const p = pending.current;
    pending.current = null;
    const d = dragging.current;
    if (!p || !d) return;
    if (d.kind === 'builtin') {
      timerStore.setLayoutOffset(page, d.key, { dx: p.dx, dy: p.dy });
    } else {
      timerStore.updateCustomText(page, d.key, { x: p.x, y: p.y });
    }
  };

  const queuePending = (p: PendingCoords) => {
    pending.current = p;
    if (typeof requestAnimationFrame === 'function') {
      // Throttle: bila sudah ada frame terjadwal, frame itu yang flush terbaru.
      if (raf.current !== null) return;
      // Update langsung untuk respons + kompatibilitas jsdom (tanpa flush test).
      applyPending();
      raf.current = requestAnimationFrame(() => {
        raf.current = null;
        applyPending();
      });
    } else {
      // Fallback bila rAF tak tersedia (jsdom minimal): update langsung.
      applyPending();
    }
  };

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, d: DragState, sel: Selection) => {
    setSelected(sel);
    dragging.current = d;
    pending.current = null;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // jsdom: pointer capture tidak tersedia, abaikan.
    }
  };

  const endDrag = () => {
    if (pending.current) applyPending();
    dragging.current = null;
    if (raf.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragging.current;
    const el = canvasRef.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    // Fallback jsdom: rect nol → anggap canvas 640×360.
    const mw = rect.width === 0 ? 640 : rect.width;
    const mh = rect.height === 0 ? 360 : rect.height;
    const cur = miniToStage(e.clientX - rect.left, e.clientY - rect.top, mw, mh);
    const start = miniToStage(d.startClientX - rect.left, d.startClientY - rect.top, mw, mh);
    const deltaX = cur.x - start.x;
    const deltaY = cur.y - start.y;
    if (d.kind === 'builtin') {
      queuePending({ dx: d.startDx + deltaX, dy: d.startDy + deltaY, x: 0, y: 0 });
    } else {
      queuePending({ dx: 0, dy: 0, x: d.startX + deltaX, y: d.startY + deltaY });
    }
  };

  const handleAddText = () => {
    const before = new Set(texts.map((t) => t.id));
    timerStore.addCustomText(page, 'TEKS BARU');
    const after =
      timerStore.getState()[page === 'timer' ? 'layoutTimer' : 'layoutMatador']?.texts ?? [];
    const created = after.find((t) => !before.has(t.id));
    if (created) setSelected({ kind: 'text', id: created.id });
  };

  const handleReset = () => {
    timerStore.resetLayout(page);
    setSelected(null);
  };

  const pageLabel = page === 'timer' ? 'TIMER' : 'MATADOR';

  return (
    <div
      data-testid="layout-editor-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div
        role="dialog"
        aria-label={`Atur layout ${pageLabel}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-widest">ATUR LAYOUT {pageLabel}</h2>
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold tracking-widest hover:bg-zinc-700"
          >
            TUTUP
          </button>
        </header>

        <div
          ref={canvasRef}
          data-testid="layout-canvas"
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
          style={{ touchAction: 'none' }}
        >
          {builtinKeys.map((key) => {
            const b = base[key];
            const off = offsets?.[key] ?? { dx: 0, dy: 0 };
            const x = b.x + (off.dx ?? 0);
            const y = b.y + (off.dy ?? 0);
            const isSel = selected?.kind === 'builtin' && selected.key === key;
            return (
              <div
                key={key}
                data-testid={`layout-box-${key}`}
                onPointerDown={(e) =>
                  startDrag(
                    e,
                    {
                      kind: 'builtin',
                      key,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startDx: off.dx ?? 0,
                      startDy: off.dy ?? 0,
                      startX: 0,
                      startY: 0,
                    },
                    { kind: 'builtin', key },
                  )
                }
                onClick={() => setSelected({ kind: 'builtin', key })}
                className={`absolute cursor-move select-none rounded border border-emerald-700 bg-emerald-900/30 px-2 py-1 text-[10px] font-bold tracking-widest text-emerald-300${isSel ? ' ring-2 ring-emerald-400' : ''}`}
                style={{
                  left: `${(x / 1920) * 100}%`,
                  top: `${(y / 1080) * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  touchAction: 'none',
                }}
              >
                {BUILTIN_LABELS[key] ?? key}
              </div>
            );
          })}

          {texts.map((t) => {
            const isSel = selected?.kind === 'text' && selected.id === t.id;
            return (
              <div
                key={t.id}
                data-testid={`layout-box-${t.id}`}
                onPointerDown={(e) =>
                  startDrag(
                    e,
                    {
                      kind: 'text',
                      key: t.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startDx: 0,
                      startDy: 0,
                      startX: t.x,
                      startY: t.y,
                    },
                    { kind: 'text', id: t.id },
                  )
                }
                onClick={() => setSelected({ kind: 'text', id: t.id })}
                className={`absolute cursor-move select-none rounded border border-amber-700 bg-amber-900/30 px-2 py-1 text-[10px] font-bold tracking-widest text-amber-300${isSel ? ' ring-2 ring-emerald-400' : ''}`}
                style={{
                  left: `${(t.x / 1920) * 100}%`,
                  top: `${(t.y / 1080) * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  touchAction: 'none',
                }}
              >
                {t.text}
              </div>
            );
          })}

          {page === 'timer' && (
            <div
              data-testid="layout-message-placeholder"
              className="pointer-events-none absolute rounded border border-dashed border-zinc-700 px-2 py-1 text-[10px] tracking-widest text-zinc-500"
              style={{
                left: '50%',
                top: '85%',
                transform: 'translate(-50%,-50%)',
              }}
            >
              KARTU PESAN
            </div>
          )}
        </div>

        {selected && (
          <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-bold tracking-widest text-zinc-400">ELEMEN TERPILIH</p>
            {selected.kind === 'builtin' ? (
              <>
                <label className="block text-xs font-semibold tracking-widest text-zinc-400">
                  POSISI X: {offsets?.[selected.key]?.dx ?? 0}
                  <input
                    aria-label="POSISI X"
                    type="range"
                    min={LAYOUT_LIMITS.DX_MIN}
                    max={LAYOUT_LIMITS.DX_MAX}
                    value={offsets?.[selected.key]?.dx ?? 0}
                    onChange={(e) =>
                      timerStore.setLayoutOffset(page, selected.key, {
                        dx: Number(e.target.value),
                        dy: offsets?.[selected.key]?.dy ?? 0,
                      })
                    }
                    className="mt-1 w-full accent-emerald-500"
                  />
                </label>
                <label className="block text-xs font-semibold tracking-widest text-zinc-400">
                  POSISI Y: {offsets?.[selected.key]?.dy ?? 0}
                  <input
                    aria-label="POSISI Y"
                    type="range"
                    min={LAYOUT_LIMITS.DY_MIN}
                    max={LAYOUT_LIMITS.DY_MAX}
                    value={offsets?.[selected.key]?.dy ?? 0}
                    onChange={(e) =>
                      timerStore.setLayoutOffset(page, selected.key, {
                        dx: offsets?.[selected.key]?.dx ?? 0,
                        dy: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full accent-emerald-500"
                  />
                </label>
              </>
            ) : (
              selectedText && (
                <>
                  <label className="block text-xs font-semibold tracking-widest text-zinc-400">
                    ISI TEKS
                    <input
                      aria-label="ISI TEKS"
                      type="text"
                      value={textInput}
                      maxLength={LAYOUT_LIMITS.TEXT_MAX}
                      onChange={(e) => {
                        setTextInput(e.target.value);
                        timerStore.updateCustomText(page, selected.id, { text: e.target.value });
                      }}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </label>
                  <label className="block text-xs font-semibold tracking-widest text-zinc-400">
                    POSISI X: {selectedText.x}
                    <input
                      aria-label="POSISI X"
                      type="range"
                      min={LAYOUT_LIMITS.X_MIN}
                      max={LAYOUT_LIMITS.X_MAX}
                      value={selectedText.x}
                      onChange={(e) =>
                        timerStore.updateCustomText(page, selected.id, {
                          x: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full accent-emerald-500"
                    />
                  </label>
                  <label className="block text-xs font-semibold tracking-widest text-zinc-400">
                    POSISI Y: {selectedText.y}
                    <input
                      aria-label="POSISI Y"
                      type="range"
                      min={LAYOUT_LIMITS.Y_MIN}
                      max={LAYOUT_LIMITS.Y_MAX}
                      value={selectedText.y}
                      onChange={(e) =>
                        timerStore.updateCustomText(page, selected.id, {
                          y: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full accent-emerald-500"
                    />
                  </label>
                  <label className="block text-xs font-semibold tracking-widest text-zinc-400">
                    UKURAN: {selectedText.size}
                    <input
                      aria-label="UKURAN"
                      type="range"
                      min={LAYOUT_LIMITS.SIZE_MIN}
                      max={LAYOUT_LIMITS.SIZE_MAX}
                      value={selectedText.size}
                      onChange={(e) =>
                        timerStore.updateCustomText(page, selected.id, {
                          size: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full accent-emerald-500"
                    />
                  </label>
                </>
              )
            )}
          </section>
        )}

        <footer className="flex flex-wrap gap-2">
          <button
            onClick={handleAddText}
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold tracking-widest text-black hover:bg-emerald-400"
          >
            TAMBAH TEKS
          </button>
          {selected?.kind === 'text' && selectedText && (
            <button
              onClick={() => {
                timerStore.removeCustomText(page, selected.id);
                setSelected(null);
              }}
              className="flex-1 rounded-xl border border-red-700 bg-red-900/20 px-4 py-3 text-xs font-bold tracking-widest text-red-400 hover:bg-red-900/40"
            >
              HAPUS
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-xs font-bold tracking-widest hover:bg-zinc-700"
          >
            RESET LAYOUT {pageLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
