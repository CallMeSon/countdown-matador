import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePresence } from '@/hooks/usePresence';

const mockReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

describe('usePresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => vi.useRealTimers());

  it('tetap mounted selama animasi keluar lalu dilepas', () => {
    const { result, rerender } = renderHook(({ open }) => usePresence(open, 100), {
      initialProps: { open: true },
    });
    expect(result.current).toEqual({ mounted: true, state: 'enter' });
    rerender({ open: false });
    expect(result.current).toEqual({ mounted: true, state: 'exit' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.mounted).toBe(false);
  });

  it('langsung dilepas bila reduced motion aktif', () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(({ open }) => usePresence(open, 100), {
      initialProps: { open: true },
    });
    rerender({ open: false });
    expect(result.current.mounted).toBe(false);
  });

  it('membuka lagi sebelum selesai membatalkan pelepasan', () => {
    const { result, rerender } = renderHook(({ open }) => usePresence(open, 100), {
      initialProps: { open: true },
    });
    rerender({ open: false });
    rerender({ open: true });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toEqual({ mounted: true, state: 'enter' });
  });
});
