'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { timerStore } from '@/lib/timer-store';
import type { LayoutPage } from '@/lib/timer-store';
import { LAYOUT_LIMITS } from '@/lib/layout';
import type { PageLayout } from '@/types/timer';

export type Selection = { kind: 'builtin'; key: string } | { kind: 'text'; id: string } | null;
type Corner = 'tl' | 'tr' | 'bl' | 'br';

const SNAP = 8;
const CENTER_X = 960;
const CENTER_Y = 540;
const HISTORY_MAX = 50;
const COALESCE_MS = 500;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const snapshot = (page: LayoutPage): PageLayout => {
  const s = timerStore.getState();
  const l = page === 'timer' ? s.layoutTimer : s.layoutMatador;
  return JSON.parse(JSON.stringify(l ?? { styles: {}, texts: [] })) as PageLayout;
};

// Hanya teks tambahan yang bisa digeser/di-resize; elemen bawaan terkunci di layout bawaan.
type Gesture =
  | { type: 'move'; id: string; cx: number; cy: number; x0: number; y0: number; before: PageLayout }
  | { type: 'resize'; id: string; size0: number; cx: number; cy: number; dist0: number; before: PageLayout };

export function useLayoutEditor(page: LayoutPage, scale: number) {
  const { state } = useTimer();
  const layout = page === 'timer' ? state.layoutTimer : state.layoutMatador;

  const [selection, setSelection] = useState<Selection>(null);
  const [snapGuide, setSnapGuide] = useState({ x: false, y: false });
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [counts, setCounts] = useState({ past: 0, future: 0 });

  const past = useRef<PageLayout[]>([]);
  const future = useRef<PageLayout[]>([]);
  const gesture = useRef<Gesture | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const raf = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale || 1;
  }, [scale]);

  const lastEdit = useRef<{ key: string; at: number } | null>(null);

  const syncCounts = () => setCounts({ past: past.current.length, future: future.current.length });

  const record = (before: PageLayout) => {
    past.current.push(before);
    if (past.current.length > HISTORY_MAX) past.current.shift();
    future.current = [];
    lastEdit.current = null;
    syncCounts();
  };

  /**
   * Jalur mutasi tercatat: ambil snapshot, jalankan mutate, dorong ke past, kosongkan future.
   * Dengan `key`, panggilan beruntun (< 500ms) pada key yang sama digabung jadi satu entri.
   */
  const commit = (mutate: () => void, key?: string) => {
    const before = snapshot(page);
    const now = Date.now();
    const last = lastEdit.current;
    const merge = !!key && !!last && last.key === key && now - last.at < COALESCE_MS && past.current.length > 0;
    mutate();
    if (merge) {
      lastEdit.current = { key: key!, at: now };
      return;
    }
    if (JSON.stringify(before) === JSON.stringify(snapshot(page))) return;
    record(before);
    if (key) lastEdit.current = { key, at: now };
  };

  // Pola throttle dari modal lama: tulis langsung bila belum ada frame, sisanya digabung per frame.
  const flush = () => {
    const fn = pending.current;
    pending.current = null;
    fn?.();
  };
  const queue = (fn: () => void) => {
    pending.current = fn;
    if (typeof requestAnimationFrame !== 'function') return flush();
    if (raf.current !== null) return;
    flush();
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      flush();
    });
  };

  const stopGesture = useCallback(() => {
    flush();
    if (raf.current !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf.current);
    raf.current = null;
    cleanup.current?.();
    cleanup.current = null;
    const g = gesture.current;
    gesture.current = null;
    setDragPosition(null);
    setSnapGuide({ x: false, y: false });
    if (g && JSON.stringify(g.before) !== JSON.stringify(snapshot(page))) record(g.before);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const k = scaleRef.current;
    if (g.type === 'resize') {
      const dist = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      const size = clamp(Math.round((g.size0 * dist) / g.dist0), LAYOUT_LIMITS.SIZE_MIN, LAYOUT_LIMITS.SIZE_MAX);
      queue(() => timerStore.updateCustomText(page, g.id, { size }));
      return;
    }
    const ddx = (e.clientX - g.cx) / k;
    const ddy = (e.clientY - g.cy) / k;
    let x = clamp(Math.round(g.x0 + ddx), LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX);
    let y = clamp(Math.round(g.y0 + ddy), LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX);
    const snapX = Math.abs(x - CENTER_X) <= SNAP;
    const snapY = Math.abs(y - CENTER_Y) <= SNAP;
    if (snapX) x = CENTER_X;
    if (snapY) y = CENTER_Y;
    setSnapGuide((p) => (p.x === snapX && p.y === snapY ? p : { x: snapX, y: snapY }));
    setDragPosition({ x, y });
    queue(() => timerStore.updateCustomText(page, g.id, { x, y }));
  };

  const attach = () => {
    const move = (e: PointerEvent) => onMove(e);
    const up = () => stopGesture();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    cleanup.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  };

  const capture = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // jsdom: pointer capture tidak tersedia, abaikan.
    }
  };

  const beginDrag = (e: React.PointerEvent, s: NonNullable<Selection>) => {
    cleanup.current?.();
    setSelection(s);
    // Elemen bawaan: hanya dipilih (terkunci di layout bawaan).
    if (s.kind !== 'text') return;
    capture(e);
    const st = timerStore.getState();
    const l = page === 'timer' ? st.layoutTimer : st.layoutMatador;
    const t = l.texts.find((b) => b.id === s.id);
    if (!t) return;
    gesture.current = { type: 'move', id: s.id, cx: e.clientX, cy: e.clientY, x0: t.x, y0: t.y, before: snapshot(page) };
    attach();
  };

  const beginResize = (e: React.PointerEvent, id: string, corner: Corner) => {
    cleanup.current?.();
    setSelection({ kind: 'text', id });
    capture(e);
    const st = timerStore.getState();
    const l = page === 'timer' ? st.layoutTimer : st.layoutMatador;
    const t = l.texts.find((b) => b.id === id);
    if (!t) return;
    // Pusat teks di layar: dari kotak seleksi (induk handle); fallback tebakan dari arah sudut.
    const rect = (e.currentTarget as Element).parentElement?.getBoundingClientRect();
    let cx: number;
    let cy: number;
    if (rect && rect.width > 0) {
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    } else {
      const sx = corner.endsWith('l') ? -1 : 1;
      const sy = corner.startsWith('t') ? -1 : 1;
      cx = e.clientX - sx * 50 * scaleRef.current;
      cy = e.clientY - sy * 50 * scaleRef.current;
    }
    const dist0 = Math.max(1, Math.hypot(e.clientX - cx, e.clientY - cy));
    gesture.current = { type: 'resize', id, size0: t.size, cx, cy, dist0, before: snapshot(page) };
    attach();
  };

  useEffect(
    () => () => {
      cleanup.current?.();
      if (raf.current !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf.current);
    },
    [],
  );

  // Seleksi dibersihkan bila blok yang dipilih hilang dari store.
  useEffect(() => {
    if (!selection || !layout) return;
    if (selection.kind === 'text' && !layout.texts.some((t) => t.id === selection.id)) setSelection(null);
  }, [layout, selection]);

  const nudge = (dx: number, dy: number) => {
    if (selection?.kind !== 'text') return;
    const before = snapshot(page);
    const t = before.texts.find((b) => b.id === selection.id);
    if (!t) return;
    timerStore.updateCustomText(page, t.id, {
      x: clamp(t.x + dx, LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
      y: clamp(t.y + dy, LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
    });
    if (JSON.stringify(before) !== JSON.stringify(snapshot(page))) record(before);
  };

  const addText = (): string | null => {
    const before = snapshot(page);
    const id = timerStore.addCustomText(page, 'Teks baru');
    if (!id) return null;
    record(before);
    setSelection({ kind: 'text', id });
    return id;
  };

  const removeSelected = () => {
    if (selection?.kind !== 'text') return;
    const before = snapshot(page);
    timerStore.removeCustomText(page, selection.id);
    record(before);
    setSelection(null);
  };

  const duplicateSelected = (): string | null => {
    if (selection?.kind !== 'text') return null;
    const before = snapshot(page);
    const id = timerStore.duplicateCustomText(page, selection.id);
    if (!id) return null;
    record(before);
    setSelection({ kind: 'text', id });
    return id;
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    lastEdit.current = null;
    future.current.push(snapshot(page));
    timerStore.replaceLayout(page, prev);
    syncCounts();
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    lastEdit.current = null;
    past.current.push(snapshot(page));
    timerStore.replaceLayout(page, next);
    syncCounts();
  };

  return {
    selection,
    select: setSelection,
    beginDrag,
    beginResize,
    snapGuide,
    dragPosition,
    nudge,
    commit,
    addText,
    removeSelected,
    duplicateSelected,
    undo,
    redo,
    canUndo: counts.past > 0,
    canRedo: counts.future > 0,
  };
}
