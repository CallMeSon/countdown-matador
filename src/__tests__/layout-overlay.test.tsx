import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LayoutOverlay } from '@/components/LayoutOverlay';
import { DEFAULT_APPEARANCE } from '@/types/timer';

describe('LayoutOverlay', () => {
  it('render tiap blok pada posisi + ukuran + warna global', () => {
    render(
      <LayoutOverlay
        appearance={{ ...DEFAULT_APPEARANCE, fontColor: '#123456' }}
        texts={[{ id: 'abcd1234', text: 'SESI 1', x: 960, y: 200, size: 64 }]}
      />,
    );
    const el = screen.getByTestId('custom-text-abcd1234');
    expect(el.textContent).toBe('SESI 1');
    expect(el.style.left).toBe('960px');
    expect(el.style.top).toBe('200px');
    expect(el.style.fontSize).toBe('64px');
    expect(el.style.color).toBe('rgb(18, 52, 86)');
  });

  it('blok lama tanpa field baru: tampilan default tidak berubah', () => {
    render(<LayoutOverlay appearance={DEFAULT_APPEARANCE} texts={[{ id: 'abcd1234', text: 'A', x: 0, y: 0, size: 64 }]} />);
    const el = screen.getByTestId('custom-text-abcd1234');
    expect(el.style.fontWeight).toBe('');
    expect(el.className).toContain('font-extrabold');
    expect(el.style.textAlign).toBe('center');
  });

  it('menerapkan field gaya dan tidak merender blok hidden', () => {
    render(
      <LayoutOverlay
        appearance={DEFAULT_APPEARANCE}
        texts={[
          { id: 'abcd1234', text: 'A', x: 0, y: 0, size: 64, bold: false, italic: true, align: 'left', color: '#ff0000', spacing: 12, font: 'anton' },
          { id: 'efgh5678', text: 'B', x: 0, y: 0, size: 64, hidden: true },
        ]}
      />,
    );
    const el = screen.getByTestId('custom-text-abcd1234');
    expect(el.style.fontWeight).toBe('400');
    expect(el.style.fontStyle).toBe('italic');
    expect(el.style.textAlign).toBe('left');
    expect(el.style.color).toBe('rgb(255, 0, 0)');
    expect(el.style.letterSpacing).toBe('12px');
    expect(el.className).toContain('app-font-anton');
    expect(screen.queryByTestId('custom-text-efgh5678')).toBeNull();
  });

  it('align menjadi titik jangkar transform', () => {
    const t = (align?: 'left' | 'center' | 'right') => {
      const { unmount } = render(<LayoutOverlay appearance={DEFAULT_APPEARANCE} texts={[{ id: 'abcd1234', text: 'A', x: 0, y: 0, size: 64, align }]} />);
      const v = screen.getByTestId('custom-text-abcd1234').style.transform;
      unmount();
      return v;
    };
    expect(t()).toBe('translate(-50%, -50%)');
    expect(t('center')).toBe('translate(-50%, -50%)');
    expect(t('left')).toBe('translate(0, -50%)');
    expect(t('right')).toBe('translate(-100%, -50%)');
  });

  it('kosong → tidak render apa-apa', () => {
    const { container } = render(<LayoutOverlay appearance={DEFAULT_APPEARANCE} texts={[]} />);
    expect(container.textContent).toBe('');
  });
});
