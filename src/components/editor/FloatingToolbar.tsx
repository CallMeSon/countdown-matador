'use client';

import { useRef } from 'react';
import type { useLayoutEditor } from '@/hooks/useLayoutEditor';
import { Bold, Minus, Palette, Plus, Trash2 } from 'lucide-react';
import { timerStore } from '@/lib/timer-store';
import type { LayoutPage } from '@/lib/timer-store';
import { LAYOUT_LIMITS } from '@/lib/layout';
import { DEFAULT_APPEARANCE } from '@/types/timer';
import type { CustomTextBlock } from '@/types/timer';
import type { StageRect } from './SelectionBox';

type Editor = ReturnType<typeof useLayoutEditor>;

const STEP = 8;
const btn =
  'btn flex h-9 w-9 items-center justify-center rounded-control text-white hover:bg-white/15 aria-pressed:bg-white/25';

/** Toolbar mengambang di atas teks terpilih; ukurannya dikompensasi scale agar konstan di layar. */
export function FloatingToolbar({
  page,
  block,
  rect,
  scale,
  fontColor,
  editor,
  onRemove,
}: {
  page: LayoutPage;
  block: CustomTextBlock;
  rect: StageRect;
  scale: number;
  fontColor: string;
  editor: Editor;
  onRemove: () => void;
}) {
  const update = (patch: Partial<Omit<CustomTextBlock, 'id'>>) =>
    editor.commit(() => timerStore.updateCustomText(page, block.id, patch), `${block.id}:${Object.keys(patch).join(',')}`);
  const colorRef = useRef<HTMLInputElement>(null);
  const k = 1 / (scale || 1);
  const bold = block.bold ?? true;
  const color = block.color ?? fontColor ?? DEFAULT_APPEARANCE.fontColor;
  // Bila tidak muat di atas stage, taruh di bawah kotak.
  const above = rect.y - rect.h / 2 > 64 * k;
  const top = above ? rect.y - rect.h / 2 - 8 * k : rect.y + rect.h / 2 + 8 * k;

  return (
    // Wrapper luar memegang posisi + kompensasi scale; animasi masuk ada di elemen dalam
    // karena keyframe `transform` akan menimpa transform inline bila dipasang di elemen yang sama.
    <div
      className="absolute"
      style={{
        left: Math.min(1920 - 90 * k, Math.max(90 * k, rect.x)),
        top,
        transform: `scale(${k}) translate(-50%, ${above ? '-100%' : '0'})`,
        transformOrigin: '0 0',
        touchAction: 'none',
      }}
    >
    <div
      role="toolbar"
      aria-label="Format teks"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="m-toolbar-in flex items-center gap-0.5 whitespace-nowrap rounded-control bg-nav p-1"
    >
      <button
        type="button"
        aria-label="Kecilkan teks"
        className={btn}
        onClick={() =>
          update({ size: Math.max(LAYOUT_LIMITS.SIZE_MIN, block.size - STEP) })
        }
      >
        <Minus size={18} />
      </button>
      <button
        type="button"
        aria-label="Besarkan teks"
        className={btn}
        onClick={() =>
          update({ size: Math.min(LAYOUT_LIMITS.SIZE_MAX, block.size + STEP) })
        }
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        aria-label="Tebal"
        aria-pressed={bold}
        className={btn}
        onClick={() => update({ bold: !bold })}
      >
        <Bold size={18} />
      </button>
      <button type="button" aria-label="Warna teks" className={btn} onClick={() => colorRef.current?.click()}>
        <Palette size={18} />
      </button>
      <input
        ref={colorRef}
        type="color"
        tabIndex={-1}
        aria-hidden="true"
        value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#ffffff'}
        onChange={(e) => update({ color: e.target.value })}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
      <button type="button" aria-label="Hapus teks" className={btn} onClick={onRemove}>
        <Trash2 size={18} />
      </button>
    </div>
    </div>
  );
}
