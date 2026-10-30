import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { THEME_KEY, applyTheme, getStoredTheme } from '@/lib/theme';
import { ThemeSwitch } from '@/components/ui/ThemeSwitch';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('theme', () => {
  it('applyTheme("dark") mengisi data-theme dan localStorage', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('getStoredTheme mengembalikan null bila localStorage melempar error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getStoredTheme()).toBeNull();
  });

  it('getStoredTheme menolak nilai selain light/dark', () => {
    localStorage.setItem(THEME_KEY, 'neon');
    expect(getStoredTheme()).toBeNull();
  });

  it('ThemeSwitch mengikuti tema aktif dan membaliknya saat diklik', async () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeSwitch />);
    const sw = await screen.findByRole('switch', { name: 'Mode gelap' });
    expect(sw.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(sw);
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
