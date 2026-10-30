'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { useLayoutEditor } from '@/hooks/useLayoutEditor';
import { timerStore } from '@/lib/timer-store';
import type { LayoutPage } from '@/lib/timer-store';
import { LAYOUT_LIMITS } from '@/lib/layout';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import type { CustomTextBlock, TimerState } from '@/types/timer';
import { DragGuides, SelectionBox } from './SelectionBox';
import type { StageRect } from './SelectionBox';
import { FloatingToolbar } from './FloatingToolbar';

type Editor = ReturnType<typeof useLayoutEditor>;

const DEFAULT_NEW_TEXT = 'Teks baru';

// Perkiraan kotak teks bila elemen DOM belum/tidak terukur (mis. jsdom).
const approxRect = (b: CustomTextBlock): StageRect => ({
  x: b.x,
  y: b.y,
  w: Math.max(40, b.text.length * b.size * 0.6),
  h: b.size * 1.2,
});

const same = (a: Record<string, StageRect>, b: Record<string, StageRect>): boolean => {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => {
    const p = a[k];
    const q = b[k];
    return q && Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5 && Math.abs(p.w - q.w) < 0.5 && Math.abs(p.h - q.h) < 0.5;
  });
};

/**
 * Lapisan interaksi di atas stage, dalam koordinat stage (induknya sudah ditransform scale yang sama).
 * Posisi diukur dari DOM stage tiap render supaya kotak seleksi selalu mengikuti tampilan nyata.
 */
export function EditorCanvas({
  page,
  state,
  editor,
  scale,
  builtinKeys,
}: {
  page: LayoutPage;
  state: TimerState;
  editor: Editor;
  scale: number;
  builtinKeys: string[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Record<string, StageRect>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const layout = page === 'timer' ? state.layoutTimer : state.layoutMatador;
  const texts = layout?.texts ?? [];
  const fontColor = (state.appearance ?? DEFAULT_APPEARANCE).fontColor;

  // Ukur ulang setelah render/perubahan state (dibanding dulu agar tidak berulang tanpa akhir).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const s = root.getBoundingClientRect();
    const sc = scale || 1;
    const next: Record<string, StageRect> = {};
    const measure = (key: string, el: Element | null) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      next[key] = {
        x: (r.left + r.width / 2 - s.left) / sc,
        y: (r.top + r.height / 2 - s.top) / sc,
        w: r.width / sc,
        h: r.height / sc,
      };
    };
    const stage = root.parentElement;
    for (const key of builtinKeys) measure(`builtin:${key}`, stage?.querySelector(`[data-layout-key="${key}"]`) ?? null);
    for (const t of texts) measure(`text:${t.id}`, stage?.querySelector(`[data-testid="custom-text-${t.id}"]`) ?? null);
    setMeasured((prev) => (same(prev, next) ? prev : next));
  });

  const textRect = (t: CustomTextBlock): StageRect => measured[`text:${t.id}`] ?? approxRect(t);
  const sel = editor.selection;
  const selBlock = sel?.kind === 'text' ? texts.find((t) => t.id === sel.id) : undefined;
  const selRect: StageRect | null = selBlock
    ? selBlock.hidden
      ? null
      : textRect(selBlock)
    : sel?.kind === 'builtin'
      ? (measured[`builtin:${sel.key}`] ?? null)
      : null;
  const editing = editingId ? texts.find((t) => t.id === editingId) : undefined;

  const removeBlock = (id: string) => {
    if (editor.selection?.kind === 'text' && editor.selection.id === id) editor.removeSelected();
    else editor.commit(() => timerStore.removeCustomText(page, id));
  };

  const hit = 'absolute cursor-move';
  const hitBuiltin = 'absolute cursor-pointer';
  return (
    <div
      ref={rootRef}
      data-testid="editor-canvas"
      className="absolute inset-0 z-20"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          setEditingId(null);
          editor.select(null);
        }
      }}
    >
      {builtinKeys.map((key) => {
        const r = measured[`builtin:${key}`];
        if (!r) return null;
        return (
          <div
            key={key}
            data-testid={`hit-builtin-${key}`}
            className={hitBuiltin}
            style={{ left: r.x - r.w / 2, top: r.y - r.h / 2, width: r.w, height: r.h, touchAction: 'none' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setEditingId(null);
              editor.beginDrag(e, { kind: 'builtin', key });
            }}
            onClick={() => editor.select({ kind: 'builtin', key })}
          />
        );
      })}

      {texts.map((t) => {
        if (t.hidden || t.id === editingId) return null;
        const r = textRect(t);
        return (
          <div
            key={t.id}
            data-testid={`hit-text-${t.id}`}
            className={hit}
            style={{ left: r.x - r.w / 2, top: r.y - r.h / 2, width: r.w, height: r.h, touchAction: 'none' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setEditingId(null);
              editor.beginDrag(e, { kind: 'text', id: t.id });
            }}
            onClick={() => editor.select({ kind: 'text', id: t.id })}
            onDoubleClick={() => {
              editor.select({ kind: 'text', id: t.id });
              setEditingId(t.id);
            }}
          />
        );
      })}

      {selRect && (
        <SelectionBox
          rect={selRect}
          scale={scale}
          resizable={!!selBlock}
          onResizeStart={(e, corner) => selBlock && editor.beginResize(e, selBlock.id, corner)}
        />
      )}
      {selBlock && selRect && !editing && (
        <FloatingToolbar
          page={page}
          block={selBlock}
          rect={selRect}
          scale={scale}
          fontColor={fontColor}
          editor={editor}
          onRemove={() => editor.removeSelected()}
        />
      )}
      <DragGuides position={editor.dragPosition} snap={editor.snapGuide} rect={selRect} scale={scale} />

      {editing && (
        <InlineEditor
          key={editing.id}
          block={editing}
          page={page}
          editor={editor}
          scale={scale}
          rect={textRect(editing)}
          onDone={(removeIt) => {
            if (removeIt) removeBlock(editing.id);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Input teks inline. Draft lokal: store hanya diperbarui bila isi tidak kosong
 * (sanitize di store membuang blok kosong), dan blok baru dihapus saat blur dengan isi kosong.
 */
function InlineEditor({
  block,
  page,
  editor,
  scale,
  rect,
  onDone,
}: {
  block: CustomTextBlock;
  page: LayoutPage;
  editor: Editor;
  scale: number;
  rect: StageRect;
  onDone: (empty: boolean) => void;
}) {
  const [draft, setDraft] = useState(block.text);
  const original = useRef(block.text);
  const finished = useRef(false);
  const cancelled = useRef(false);
  const k = 1 / (scale || 1);
  const key = `${block.id}:text`;

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const empty = draft.trim() === '';
    const restore = () =>
      editor.commit(() => timerStore.updateCustomText(page, block.id, { text: original.current }), key);
    if (cancelled.current) {
      restore();
      onDone(false);
    } else if (empty) {
      // Hanya blok baru yang masih berisi teks bawaan yang dihapus; blok lama dikembalikan.
      if (original.current === DEFAULT_NEW_TEXT) onDone(true);
      else {
        restore();
        onDone(false);
      }
    } else onDone(false);
  };

  return (
    <input
      autoFocus
      aria-label="Edit teks"
      maxLength={LAYOUT_LIMITS.TEXT_MAX}
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        if (v.trim()) editor.commit(() => timerStore.updateCustomText(page, block.id, { text: v }), key);
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          if (e.key === 'Escape') cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute rounded-chip bg-black/70 font-inter font-extrabold uppercase leading-none text-white"
      style={{
        left: rect.x,
        top: rect.y,
        transform: 'translate(-50%, -50%)',
        width: Math.max(rect.w + 80, 320),
        fontSize: block.size,
        textAlign: block.align ?? 'center',
        outline: `${2 * k}px solid rgb(var(--accent))`,
      }}
    />
  );
}
