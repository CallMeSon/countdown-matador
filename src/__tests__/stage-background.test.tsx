import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StageBackground } from '@/components/StageBackground';
import type { BackgroundConfig } from '@/types/timer';

describe('StageBackground', () => {
  it('mode color: menerapkan backgroundColor, tanpa img', () => {
    const background: BackgroundConfig = { bgMode: 'color', bgColor: '#123456', bgImage: '' };
    render(<StageBackground background={background} />);
    const bg = screen.getByTestId('stage-background');
    expect(bg.getAttribute('style')).toContain('background-color');
    expect(bg.style.backgroundColor).toContain('18');
    expect(screen.queryByTestId('stage-background-image')).toBeNull();
  });

  it('mode image: merender img dengan src', () => {
    render(
      <StageBackground
        background={{ bgMode: 'image', bgColor: '#000000', bgImage: '/backgrounds/grid-dark.svg' }}
      />,
    );
    const img = screen.getByTestId('stage-background-image');
    expect(img.getAttribute('src')).toBe('/backgrounds/grid-dark.svg');
  });

  it('mode image tanpa url: fallback ke warna, tanpa img', () => {
    render(<StageBackground background={{ bgMode: 'image', bgColor: '#000000', bgImage: '' }} />);
    expect(screen.queryByTestId('stage-background-image')).toBeNull();
  });

  it('gambar gagal dimuat: img hilang, warna tetap jadi fallback', () => {
    render(
      <StageBackground
        background={{ bgMode: 'image', bgColor: '#000000', bgImage: 'https://example.com/broken.png' }}
      />,
    );
    fireEvent.error(screen.getByTestId('stage-background-image'));
    expect(screen.queryByTestId('stage-background-image')).toBeNull();
    expect(screen.getByTestId('stage-background')).toBeTruthy();
  });
});
