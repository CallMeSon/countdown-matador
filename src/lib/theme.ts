export type Theme = 'light' | 'dark';

export const THEME_KEY = 'matador-timer:theme';

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage tidak tersedia — tema tetap berlaku untuk sesi ini
  }
}

/** Dijalankan inline di <head> sebelum render pertama supaya tidak ada kilatan tema. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;
