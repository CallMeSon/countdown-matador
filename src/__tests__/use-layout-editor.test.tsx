import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { timerStore } from '@/lib/timer-store';
import { useLayoutEditor } from '@/hooks/useLayoutEditor';

const down = (x: number, y: number) =>
  ({ clientX: x, clientY: y, pointerId: 1, currentTarget: document.createElement('div') }) as unknown as React.PointerEvent;
const fire = (type: string, x: number, y: number) =>
  window.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }));

const texts = () => timerStore.getState().layoutTimer.texts;

describe('useLayoutEditor', () => {
  let id: string;
  beforeEach(() => {
    timerStore.setRoom('TEST');
    timerStore.resetLayout('timer');
    id = timerStore.addCustomText('timer', 'Halo')!;
    timerStore.updateCustomText('timer', id, { x: 300, y: 300 });
  });

  const drag = (result: { current: ReturnType<typeof useLayoutEditor> }, dx: number, dy: number) => {
    act(() => result.current.beginDrag(down(0, 0), { kind: 'text', id }));
    act(() => fire('pointermove', dx, dy));
    act(() => fire('pointerup', dx, dy));
  };

  it('elemen bawaan hanya terpilih: tidak ada gesture, layout tidak berubah, undo tetap kosong', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    const before = JSON.stringify(timerStore.getState().layoutTimer);
    act(() => result.current.beginDrag(down(0, 0), { kind: 'builtin', key: 'digit' }));
    expect(result.current.selection).toEqual({ kind: 'builtin', key: 'digit' });
    act(() => fire('pointermove', 400, 300));
    act(() => fire('pointerup', 400, 300));
    expect(JSON.stringify(timerStore.getState().layoutTimer)).toBe(before);
    act(() => result.current.nudge(10, 10));
    expect(JSON.stringify(timerStore.getState().layoutTimer)).toBe(before);
    expect(result.current.canUndo).toBe(false);
  });

  it('px layar dibagi scale jadi px stage', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 0.5));
    drag(result, 100, 0);
    expect(texts()[0].x).toBe(500);
  });

  it('snap ke tengah stage', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    act(() => result.current.beginDrag(down(0, 0), { kind: 'text', id }));
    act(() => fire('pointermove', 665, 0)); // x=965, dalam 8px dari 960
    expect(result.current.snapGuide.x).toBe(true);
    expect(result.current.dragPosition?.x).toBe(960);
    act(() => fire('pointerup', 665, 0));
    expect(texts()[0].x).toBe(960);
    expect(result.current.dragPosition).toBeNull();
  });

  it('clamp di tepi', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    drag(result, 5000, -5000);
    expect(texts()[0]).toMatchObject({ x: 1920, y: 0 });
  });

  it('satu drag = satu entri undo', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    act(() => result.current.beginDrag(down(0, 0), { kind: 'text', id }));
    act(() => fire('pointermove', 10, 10));
    act(() => fire('pointermove', 50, 50));
    act(() => fire('pointerup', 50, 50));
    expect(texts()[0].x).toBe(350);
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(texts()[0]).toMatchObject({ x: 300, y: 300 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('update remote saat drag tidak mengubah dragPosition', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    act(() => result.current.beginDrag(down(0, 0), { kind: 'text', id }));
    act(() => fire('pointermove', 100, 0));
    expect(result.current.dragPosition).toEqual({ x: 400, y: 300 });
    act(() => timerStore.updateCustomText('timer', id, { x: 1000, y: 1000 }));
    expect(result.current.dragPosition).toEqual({ x: 400, y: 300 });
    act(() => fire('pointerup', 100, 0));
  });

  it('addText ke-6 mengembalikan null', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    for (let i = 0; i < 4; i++) act(() => void result.current.addText());
    expect(texts()).toHaveLength(5);
    let r: string | null = 'x';
    act(() => {
      r = result.current.addText();
    });
    expect(r).toBeNull();
  });

  it('commit: undo membatalkan hanya edit itu, bukan perubahan sebelumnya', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    drag(result, 100, 0); // x=400
    act(() => result.current.commit(() => timerStore.updateCustomText('timer', id, { color: '#ff0000' })));
    expect(texts()[0].color).toBe('#ff0000');
    act(() => result.current.undo());
    expect(texts()[0].color).toBeUndefined();
    expect(texts()[0].x).toBe(400);
  });

  it('commit setelah undo mengosongkan redo', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    drag(result, 100, 0);
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.commit(() => timerStore.updateCustomText('timer', id, { bold: false })));
    expect(result.current.canRedo).toBe(false);
  });

  it('commit dengan key sama dalam jendela singkat digabung jadi satu entri', () => {
    const { result } = renderHook(() => useLayoutEditor('timer', 1));
    for (const size of [90, 100, 110]) {
      act(() => result.current.commit(() => timerStore.updateCustomText('timer', id, { size }), `${id}:size`));
    }
    const after = texts()[0].size;
    expect(after).toBe(110);
    act(() => result.current.undo());
    expect(texts()[0].size).not.toBe(110);
    expect(texts()[0].size).not.toBe(100);
    expect(result.current.canUndo).toBe(false);
  });
});
