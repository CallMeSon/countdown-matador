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

  it('kosong → tidak render apa-apa', () => {
    const { container } = render(<LayoutOverlay appearance={DEFAULT_APPEARANCE} texts={[]} />);
    expect(container.textContent).toBe('');
  });
});
