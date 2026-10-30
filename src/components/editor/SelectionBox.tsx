'use client';

import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

export type StageRect = { x: number; y: number; w: number; h: number };
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];
const HIT = 24; // px layar; hit area handle

/**
 * Kotak seleksi di koordinat stage (rect = pusat x,y + lebar/tinggi). Ukuran
 * garis/handle dibagi scale supaya tampil konstan di layar. Handle sudut harus
 * anak langsung kotak ini (useLayoutEditor menghitung pusat dari parentElement).
 */
export function SelectionBox({
  rect,
  scale,
  resizable,
  onResizeStart,
}: {
  rect: StageRect;
  scale: number;
  resizable: boolean;
  onResizeStart?: (e: ReactPointerEvent, corner: Corner) => void;
}): ReactNode {
  const k = 1 / (scale || 1);
  return (
    <div
      data-testid="selection-box"
      className="m-sel-in pointer-events-none absolute border-accent"
      style={{
        left: rect.x - rect.w / 2,
        top: rect.y - rect.h / 2,
        width: rect.w,
        height: rect.h,
        borderWidth: 2 * k,
        borderStyle: 'solid',
        boxSizing: 'border-box',
      }}
    >
      {resizable &&
        CORNERS.map((c) => (
          <div
            key={c}
            data-handle={c}
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart?.(e, c);
            }}
            className="m-handle-in pointer-events-auto absolute flex items-center justify-center"
            style={{
              width: HIT * k,
              height: HIT * k,
              left: c.endsWith('l') ? -HIT * k / 2 - k : undefined,
              right: c.endsWith('r') ? -HIT * k / 2 - k : undefined,
              top: c.startsWith('t') ? -HIT * k / 2 - k : undefined,
              bottom: c.startsWith('b') ? -HIT * k / 2 - k : undefined,
              cursor: c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize',
              touchAction: 'none',
            }}
          >
            <span className="block bg-accent" style={{ width: 10 * k, height: 10 * k }} />
          </div>
        ))}
    </div>
  );
}

/** Tooltip posisi saat drag + garis bantu tengah stage. */
export function DragGuides({
  position,
  snap,
  rect,
  scale,
}: {
  position: { x: number; y: number } | null;
  snap: { x: boolean; y: boolean };
  rect: StageRect | null;
  scale: number;
}) {
  const k = 1 / (scale || 1);
  return (
    <>
      <div className="m-guide pointer-events-none absolute bg-accent" style={{ left: 960 - k, top: 0, width: 2 * k, height: 1080, opacity: snap.x ? 1 : 0 }} />
      <div className="m-guide pointer-events-none absolute bg-accent" style={{ left: 0, top: 540 - k, width: 1920, height: 2 * k, opacity: snap.y ? 1 : 0 }} />
      {position && rect && (
        <div
          className="pointer-events-none absolute whitespace-nowrap rounded-chip bg-accent px-2 py-1 font-ui text-xs font-medium text-on-accent"
          style={{
            left: rect.x,
            top: rect.y + rect.h / 2 + 6 * k,
            transform: `scale(${k}) translate(-50%, 0)`,
            transformOrigin: '0 0',
          }}
        >
          X {position.x} · Y {position.y}
        </div>
      )}
    </>
  );
}
