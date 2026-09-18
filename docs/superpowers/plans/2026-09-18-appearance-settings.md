# Appearance Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operator bisa mengatur background (warna atau gambar), font, bold/italic, dan warna font halaman display `/timer` & `/matador` dari `/control`, tersinkron per-room.

**Architecture:** Perluas `TimerState` dengan objek `appearance` sehingga ikut tersinkron & tersimpan otomatis lewat relay WebSocket + `state.json` yang sudah ada. Render memakai komponen `StageBackground` dan kelas CSS kecil dari helper `appearanceClass()`; nilai default sengaja tidak menambah kelas/efek apa pun supaya tampilan lama tetap identik.

**Tech Stack:** Next.js 14 (static export), React 18, TypeScript, Tailwind, Vitest + Testing Library, `ws` relay (`server/ws-server.js`).

## Global Constraints

- App adalah **static export** (`next.config.mjs: output: 'export'`) — tidak boleh menambah API route/endpoint server.
- Setting appearance disimpan di `TimerState` dan disinkronkan lewat protokol WS yang ada; tidak ada pesan/tipe protokol baru.
- Default appearance HARUS mereproduksi tampilan sekarang persis (background hitam, digit Anton, label Inter, teks putih, tidak italic, tidak bold).
- Warna peringatan tetap override warna font kustom: `text-amber-400` (≤10 dtk), `text-red-500` (≤5 dtk/overtime).
- Digit jam (`displayMode === 'clock'`) tetap emerald; badge overtime & teks ticker/kartu pesan tetap putih.
- URL gambar hanya menerima `http(s)://` atau path diawali `/backgrounds/`, panjang ≤ 2048 karakter.
- Semua perintah test/lint/typecheck yang dipakai: `npx vitest run <path>`, `npm run lint`, `npm run typecheck`, `npm test`.
- Commit message mengikuti gaya repo (conventional commit, bahasa Inggris).

---

### Task 1: Tipe appearance + helper murni

**Files:**
- Modify: `src/types/timer.ts`
- Create: `src/lib/appearance.ts`
- Test: `src/__tests__/appearance.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `AppearanceConfig`, `BackgroundMode`, `FontKey`, `DEFAULT_APPEARANCE` dari `@/types/timer`
  - `TimerState.appearance: AppearanceConfig`
  - `FONT_OPTIONS: { key: FontKey; label: string }[]`
  - `GALLERY_BACKGROUNDS: string[]`
  - `normalizeAppearance(partial: Partial<AppearanceConfig> | null | undefined): AppearanceConfig`
  - `sanitizeImageUrl(raw: string): string`
  - `appearanceClass(a: AppearanceConfig): string`
  - `mergeIncomingState(state: Partial<TimerState>): TimerState`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/appearance.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  FONT_OPTIONS,
  GALLERY_BACKGROUNDS,
  appearanceClass,
  mergeIncomingState,
  normalizeAppearance,
  sanitizeImageUrl,
} from '@/lib/appearance';
import { DEFAULT_APPEARANCE, DEFAULT_TIMER_STATE } from '@/types/timer';

describe('normalizeAppearance', () => {
  it('mengisi field yang hilang dari default', () => {
    expect(normalizeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ bold: true })).toEqual({ ...DEFAULT_APPEARANCE, bold: true });
  });
});

describe('sanitizeImageUrl', () => {
  it('menerima http dan https (di-trim)', () => {
    expect(sanitizeImageUrl(' https://example.com/a.png ')).toBe('https://example.com/a.png');
    expect(sanitizeImageUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
  });

  it('menerima path galeri /backgrounds/', () => {
    expect(sanitizeImageUrl('/backgrounds/grid-dark.svg')).toBe('/backgrounds/grid-dark.svg');
  });

  it('menolak skema berbahaya, relatif, dan kosong', () => {
    expect(sanitizeImageUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeImageUrl('data:image/png;base64,AAAA')).toBe('');
    expect(sanitizeImageUrl('ftp://example.com/a.png')).toBe('');
    expect(sanitizeImageUrl('example.com/a.png')).toBe('');
    expect(sanitizeImageUrl('')).toBe('');
    expect(sanitizeImageUrl('   ')).toBe('');
  });

  it('menolak URL lebih dari 2048 karakter', () => {
    expect(sanitizeImageUrl(`https://example.com/${'a'.repeat(2100)}`)).toBe('');
  });
});

describe('appearanceClass', () => {
  it('default tidak menambah kelas', () => {
    expect(appearanceClass(DEFAULT_APPEARANCE)).toBe('');
  });

  it('menghasilkan kelas font + bold + italic', () => {
    expect(
      appearanceClass({ ...DEFAULT_APPEARANCE, fontFamily: 'oswald', bold: true, italic: true }),
    ).toBe('app-font-oswald app-bold app-italic');
  });
});

describe('mergeIncomingState', () => {
  it('mengisi appearance yang hilang dari state lama', () => {
    const merged = mergeIncomingState({ ...DEFAULT_TIMER_STATE, appearance: undefined });
    expect(merged.appearance).toEqual(DEFAULT_APPEARANCE);
  });

  it('mempertahankan appearance yang sudah ada', () => {
    const appearance = { ...DEFAULT_APPEARANCE, fontFamily: 'teko' as const, bold: true };
    expect(mergeIncomingState({ ...DEFAULT_TIMER_STATE, appearance }).appearance).toEqual(appearance);
  });
});

describe('FONT_OPTIONS / GALLERY_BACKGROUNDS', () => {
  it('memuat default + 7 font dan galeri tidak kosong', () => {
    expect(FONT_OPTIONS.map((f) => f.key)).toEqual([
      'default',
      'anton',
      'bebas',
      'oswald',
      'teko',
      'archivo',
      'orbitron',
      'robotoMono',
    ]);
    expect(GALLERY_BACKGROUNDS.length).toBeGreaterThan(0);
    expect(GALLERY_BACKGROUNDS.every((p) => p.startsWith('/backgrounds/'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/appearance.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/appearance"` dan/atau `DEFAULT_APPEARANCE` tidak ada.

- [ ] **Step 3: Add types and defaults**

Di `src/types/timer.ts`, tambahkan setelah `export type DisplayMode = 'timer' | 'clock';`:

```ts
export type BackgroundMode = 'color' | 'image';

export type FontKey =
  | 'default'
  | 'anton'
  | 'bebas'
  | 'oswald'
  | 'teko'
  | 'archivo'
  | 'orbitron'
  | 'robotoMono';

export interface AppearanceConfig {
  bgMode: BackgroundMode;
  bgColor: string;   // '#rrggbb'
  bgImage: string;   // URL http(s) atau '/backgrounds/*.svg'; '' = kosong
  fontFamily: FontKey;
  bold: boolean;
  italic: boolean;
  fontColor: string; // '#rrggbb'
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  bgMode: 'color',
  bgColor: '#000000',
  bgImage: '',
  fontFamily: 'default',
  bold: false,
  italic: false,
  fontColor: '#ffffff',
};
```

Di `interface TimerState`, tambahkan field terakhir:

```ts
  appearance: AppearanceConfig; // tampilan display (background/font), tersinkron per-room
```

Di `DEFAULT_TIMER_STATE`, tambahkan:

```ts
  appearance: DEFAULT_APPEARANCE,
```

- [ ] **Step 4: Create the appearance helper**

Create `src/lib/appearance.ts`:

```ts
import {
  AppearanceConfig,
  DEFAULT_APPEARANCE,
  DEFAULT_TIMER_STATE,
  FontKey,
  TimerState,
} from '@/types/timer';

export interface FontOption {
  key: FontKey;
  label: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'default', label: 'Default (Anton + Inter)' },
  { key: 'anton', label: 'Anton' },
  { key: 'bebas', label: 'Bebas Neue' },
  { key: 'oswald', label: 'Oswald' },
  { key: 'teko', label: 'Teko' },
  { key: 'archivo', label: 'Archivo Black' },
  { key: 'orbitron', label: 'Orbitron' },
  { key: 'robotoMono', label: 'Roboto Mono' },
];

export const GALLERY_BACKGROUNDS: string[] = [
  '/backgrounds/gradient-slate.svg',
  '/backgrounds/gradient-emerald.svg',
  '/backgrounds/gradient-royal.svg',
  '/backgrounds/gradient-sunset.svg',
  '/backgrounds/grid-dark.svg',
  '/backgrounds/dots-dark.svg',
];

const GALLERY_PREFIX = '/backgrounds/';
const MAX_IMAGE_URL_LENGTH = 2048;

export function normalizeAppearance(
  partial: Partial<AppearanceConfig> | null | undefined,
): AppearanceConfig {
  return { ...DEFAULT_APPEARANCE, ...(partial ?? {}) };
}

export function sanitizeImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url || url.length > MAX_IMAGE_URL_LENGTH) return '';
  if (url.startsWith(GALLERY_PREFIX)) return url;
  try {
    const { protocol } = new URL(url);
    if (protocol === 'http:' || protocol === 'https:') return url;
  } catch {
    return '';
  }
  return '';
}

export function appearanceClass(a: AppearanceConfig): string {
  const classes: string[] = [];
  if (a.fontFamily !== 'default') classes.push(`app-font-${a.fontFamily}`);
  if (a.bold) classes.push('app-bold');
  if (a.italic) classes.push('app-italic');
  return classes.join(' ');
}

export function mergeIncomingState(state: Partial<TimerState>): TimerState {
  return {
    ...DEFAULT_TIMER_STATE,
    ...state,
    appearance: normalizeAppearance(state.appearance),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/appearance.test.ts`
Expected: PASS (semua test hijau).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS (tidak ada error).

- [ ] **Step 7: Commit**

```bash
git add src/types/timer.ts src/lib/appearance.ts src/__tests__/appearance.test.ts
git commit -m "feat: add appearance config types and helpers"
```

---

### Task 2: Store `setAppearance` + normalisasi state masuk + server default

**Files:**
- Modify: `src/lib/timer-store.ts`
- Modify: `server/ws-server.js`
- Test: `src/__tests__/timer-store.test.ts`

**Interfaces:**
- Consumes: `mergeIncomingState` dari Task 1; `TimerState['appearance']` dari Task 1.
- Produces: `timerStore.setAppearance(patch: Partial<AppearanceConfig>): void`

- [ ] **Step 1: Write the failing test**

Di `src/__tests__/timer-store.test.ts`, ubah baris import pertama menjadi:

```ts
import { DEFAULT_APPEARANCE, DEFAULT_TIMER_STATE } from '@/types/timer';
```

Lalu tambahkan `describe` baru sebelum penutup `});` terakhir file:

```ts
  describe('appearance', () => {
    it('default appearance sama dengan DEFAULT_APPEARANCE', () => {
      expect(store.timerStore.getState().appearance).toEqual(DEFAULT_APPEARANCE);
    });

    it('setAppearance merge sebagian field, field lain tetap', () => {
      store.timerStore.setAppearance({ bgMode: 'image', bgImage: 'https://example.com/a.png' });
      const a = store.timerStore.getState().appearance;
      expect(a.bgMode).toBe('image');
      expect(a.bgImage).toBe('https://example.com/a.png');
      expect(a.fontFamily).toBe('default');
      expect(a.fontColor).toBe('#ffffff');
    });

    it('setAppearance tidak mengganggu status/durasi timer', () => {
      store.timerStore.setDuration(120);
      store.timerStore.start();
      store.timerStore.setAppearance({ bold: true });
      expect(store.timerStore.getState().status).toBe('running');
      expect(store.timerStore.getState().duration).toBe(120);
      expect(store.timerStore.getState().appearance.bold).toBe(true);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/timer-store.test.ts`
Expected: FAIL — `store.timerStore.setAppearance is not a function` (default appearance test bisa sudah lulus).

- [ ] **Step 3: Implement store method + normalization**

Di `src/lib/timer-store.ts`, tambahkan import:

```ts
import { mergeIncomingState } from '@/lib/appearance';
```

Ganti baris di `socket.onmessage` dari:

```ts
        this.setState({ ...DEFAULT_TIMER_STATE, ...msg.state }, false);
```

menjadi:

```ts
        this.setState(mergeIncomingState(msg.state), false);
```

Tambahkan method baru setelah `setDisplayMode`:

```ts
  setAppearance(patch: Partial<TimerState['appearance']>): void {
    if (!this.room) return;
    this.setState({ ...this.state, appearance: { ...this.state.appearance, ...patch } }, true);
  }
```

- [ ] **Step 4: Add appearance to server default state**

Di `server/ws-server.js`, ganti konstanta `DEFAULT_STATE`:

```js
const DEFAULT_STATE = {
  status: 'idle',
  duration: 300,
  startedAt: null,
  pausedRemaining: null,
  displayMode: 'timer',
  stageMessage: null,
  appearance: {
    bgMode: 'color',
    bgColor: '#000000',
    bgImage: '',
    fontFamily: 'default',
    bold: false,
    italic: false,
    fontColor: '#ffffff',
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/timer-store.test.ts`
Expected: PASS.

- [ ] **Step 6: Run full test + lint + typecheck**

Run: `npm test` lalu `npm run lint` lalu `npm run typecheck`
Expected: semua PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/timer-store.ts server/ws-server.js src/__tests__/timer-store.test.ts
git commit -m "feat: sync appearance through timer store and ws server"
```

---

### Task 3: `StageBackground` + kelas CSS + galeri SVG

**Files:**
- Create: `src/components/StageBackground.tsx`
- Create: `public/backgrounds/gradient-slate.svg`
- Create: `public/backgrounds/gradient-emerald.svg`
- Create: `public/backgrounds/gradient-royal.svg`
- Create: `public/backgrounds/gradient-sunset.svg`
- Create: `public/backgrounds/grid-dark.svg`
- Create: `public/backgrounds/dots-dark.svg`
- Modify: `src/app/globals.css`
- Test: `src/__tests__/stage-background.test.tsx`

**Interfaces:**
- Consumes: `AppearanceConfig`, `DEFAULT_APPEARANCE` dari Task 1.
- Produces: `<StageBackground appearance={AppearanceConfig} />` dengan `data-testid="stage-background"` dan, saat mode gambar aktif, `data-testid="stage-background-image"`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/stage-background.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StageBackground } from '@/components/StageBackground';
import { DEFAULT_APPEARANCE } from '@/types/timer';

describe('StageBackground', () => {
  it('mode color: menerapkan backgroundColor, tanpa img', () => {
    render(
      <StageBackground appearance={{ ...DEFAULT_APPEARANCE, bgMode: 'color', bgColor: '#123456' }} />,
    );
    const bg = screen.getByTestId('stage-background');
    expect(bg.getAttribute('style')).toContain('background-color');
    expect(bg.style.backgroundColor).toContain('18');
    expect(screen.queryByTestId('stage-background-image')).toBeNull();
  });

  it('mode image: merender img dengan src', () => {
    render(
      <StageBackground
        appearance={{ ...DEFAULT_APPEARANCE, bgMode: 'image', bgImage: '/backgrounds/grid-dark.svg' }}
      />,
    );
    const img = screen.getByTestId('stage-background-image');
    expect(img.getAttribute('src')).toBe('/backgrounds/grid-dark.svg');
  });

  it('mode image tanpa url: fallback ke warna, tanpa img', () => {
    render(
      <StageBackground appearance={{ ...DEFAULT_APPEARANCE, bgMode: 'image', bgImage: '' }} />,
    );
    expect(screen.queryByTestId('stage-background-image')).toBeNull();
  });

  it('gambar gagal dimuat: img hilang, warna tetap jadi fallback', () => {
    render(
      <StageBackground
        appearance={{ ...DEFAULT_APPEARANCE, bgMode: 'image', bgImage: 'https://example.com/broken.png' }}
      />,
    );
    fireEvent.error(screen.getByTestId('stage-background-image'));
    expect(screen.queryByTestId('stage-background-image')).toBeNull();
    expect(screen.getByTestId('stage-background')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/stage-background.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/StageBackground"`.

- [ ] **Step 3: Create the component**

Create `src/components/StageBackground.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { AppearanceConfig } from '@/types/timer';

/**
 * Lapisan background halaman display. Mode warna = solid; mode gambar = <img>
 * (bukan CSS url() inline) supaya URL dari user tidak bisa jadi CSS injection,
 * dengan bgColor sebagai fallback saat gambar gagal dimuat.
 */
export function StageBackground({ appearance }: { appearance: AppearanceConfig }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [appearance.bgImage]);

  const showImage = appearance.bgMode === 'image' && appearance.bgImage !== '' && !imageFailed;

  return (
    <div
      data-testid="stage-background"
      className="absolute inset-0"
      style={{ backgroundColor: appearance.bgColor }}
    >
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="stage-background-image"
          src={appearance.bgImage}
          alt=""
          aria-hidden="true"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Expand the Google Fonts import and add appearance classes**

Di `src/app/globals.css`, ganti baris `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800;900&display=swap');` menjadi:

```css
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Orbitron:wght@400..900&family=Oswald:wght@200..700&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Teko:wght@300..700&display=swap');
```

Tambahkan di akhir `src/app/globals.css`:

```css
/* ============================================================
   Appearance (background / font) — kelas dari appearanceClass().
   Default tidak menambah kelas apa pun, jadi tampilan lama tetap
   identik; kelas ini hanya muncul saat user mengubah setting.
   ============================================================ */
.app-font-anton { font-family: 'Anton', sans-serif !important; }
.app-font-bebas { font-family: 'Bebas Neue', sans-serif !important; }
.app-font-oswald { font-family: 'Oswald', sans-serif !important; }
.app-font-teko { font-family: 'Teko', sans-serif !important; }
.app-font-archivo { font-family: 'Archivo Black', sans-serif !important; }
.app-font-orbitron { font-family: 'Orbitron', sans-serif !important; }
.app-font-robotoMono { font-family: 'Roboto Mono', monospace !important; }
.app-bold { font-weight: 700 !important; }
.app-italic { font-style: italic !important; }
```

- [ ] **Step 5: Create the gallery SVG files**

Create `public/backgrounds/gradient-slate.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
</svg>
```

Create `public/backgrounds/gradient-emerald.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#022c22"/>
      <stop offset="1" stop-color="#10b981"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
</svg>
```

Create `public/backgrounds/gradient-royal.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e1b4b"/>
      <stop offset="1" stop-color="#4338ca"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
</svg>
```

Create `public/backgrounds/gradient-sunset.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c2d12"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
</svg>
```

Create `public/backgrounds/grid-dark.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#1f2937" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="1920" height="1080" fill="#020617"/>
  <rect width="1920" height="1080" fill="url(#grid)"/>
</svg>
```

Create `public/backgrounds/dots-dark.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <pattern id="dots" width="60" height="60" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="3" fill="#334155"/>
    </pattern>
  </defs>
  <rect width="1920" height="1080" fill="#020617"/>
  <rect width="1920" height="1080" fill="url(#dots)"/>
</svg>
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/__tests__/stage-background.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/StageBackground.tsx src/app/globals.css public/backgrounds src/__tests__/stage-background.test.tsx
git commit -m "feat: add StageBackground, appearance css classes, and gallery assets"
```

---

### Task 4: Terapkan appearance di `/timer`

**Files:**
- Modify: `src/app/timer/page.tsx`
- Test: `src/__tests__/timer-page.test.tsx`

**Interfaces:**
- Consumes: `StageBackground` (Task 3), `appearanceClass` (Task 1), `DEFAULT_APPEARANCE` (Task 1), `state.appearance` (Task 2).
- Produces: — (perilaku UI)

- [ ] **Step 1: Write the failing test**

Di `src/__tests__/timer-page.test.tsx`, tambahkan import di atas:

```ts
import { DEFAULT_APPEARANCE } from '@/types/timer';
```

Tambahkan `describe` baru sebelum penutup `});` terakhir:

```tsx
  describe('appearance', () => {
    it('background color diterapkan', () => {
      store.timerStore.setAppearance({ bgMode: 'color', bgColor: '#123456' });
      render(<TimerPage />);
      expect(screen.getByTestId('stage-background').style.backgroundColor).toContain('18');
    });

    it('background image dirender saat mode image', () => {
      store.timerStore.setAppearance({ bgMode: 'image', bgImage: '/backgrounds/grid-dark.svg' });
      render(<TimerPage />);
      expect(screen.getByTestId('stage-background-image').getAttribute('src')).toBe(
        '/backgrounds/grid-dark.svg',
      );
    });

    it('font & warna font kustom diterapkan ke digit countdown', () => {
      store.timerStore.setAppearance({ fontFamily: 'oswald', fontColor: '#ff0000' });
      render(<TimerPage />);
      const digit = screen.getByTestId('countdown-main');
      expect(digit.className).toContain('app-font-oswald');
      expect(digit.style.color).toMatch(/255|#ff0000/i);
    });

    it('saat peringatan, warna font kustom tidak menang', async () => {
      store.timerStore.setAppearance({ fontColor: '#ff0000' });
      render(<TimerPage />);
      act(() => {
        store.timerStore.setDuration(5);
        store.timerStore.start();
      });
      await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
      const digit = screen.getByTestId('countdown-main');
      expect(digit.className).toContain('text-red-500');
      expect(digit.style.color).toBe('');
    });

    it('digit jam tetap emerald walau fontColor diubah', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 14, 22, 33));
      store.timerStore.setAppearance({ fontColor: '#ff0000' });
      store.timerStore.setDisplayMode('clock');
      render(<TimerPage />);
      expect(screen.getByTestId('clock-main').className).toContain('text-emerald-400');
      vi.useRealTimers();
    });

    it('teks kartu pesan panggung tetap putih', () => {
      store.timerStore.setAppearance({ fontFamily: 'teko', fontColor: '#ff0000' });
      store.timerStore.sendStageMessage('Halo', true);
      render(<TimerPage />);
      const text = screen.getByTestId('stage-card-text');
      expect(text.className).toContain('app-font-teko');
      expect(text.className).toContain('text-white');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/timer-page.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="stage-background"]`.

- [ ] **Step 3: Implement appearance in the timer page**

Di `src/app/timer/page.tsx`, ubah import:

```tsx
import { useRoom } from '@/hooks/useRoom';
import { STAGE_HEIGHT, STAGE_WIDTH, useStageScale } from '@/hooks/useStageScale';
import { timerStore } from '@/lib/timer-store';
import { timesUpPhase } from '@/lib/timer-phase';
import { StageBackground } from '@/components/StageBackground';
import { appearanceClass } from '@/lib/appearance';
import { DEFAULT_APPEARANCE } from '@/types/timer';
```

Ganti komponen `DigitText` seluruhnya menjadi:

```tsx
function DigitText({
  text,
  testId,
  colorClass,
  animClass,
  fontSize,
  textClass,
  color,
}: {
  text: string;
  testId: string;
  colorClass: string;
  animClass?: string;
  fontSize: number;
  textClass?: string;
  color?: string;
}) {
  return (
    <div
      data-testid={testId}
      style={{ fontSize, width: DIGIT_SAFE_WIDTH, ...(color ? { color } : {}) }}
      className={`timer-digits whitespace-nowrap text-center font-anton font-bold leading-none ${colorClass}${
        animClass ? ` ${animClass}` : ''
      }${textClass ? ` ${textClass}` : ''}`}
    >
      {text}
    </div>
  );
}
```

Ganti signature + `<p>` di `StageMessageCard` menjadi:

```tsx
function StageMessageCard({
  text,
  sentAt,
  textClass,
}: {
  text: string;
  sentAt: number;
  textClass?: string;
}) {
  const blinking = useBlinkWindow(sentAt);
  const { ref, fontSize } = useFitText<HTMLParagraphElement>(text, 80, 1280);

  return (
    <div className="anim-timesup-in flex h-full w-full max-w-[92cqw] items-center justify-center overflow-hidden rounded-3xl border-4 border-white/10 shadow-2xl">
      <div
        data-testid="stage-card"
        className={`flex h-full w-full items-center justify-center p-8 ${blinking ? 'anim-ticker-blink' : 'bg-red-700'}`}
      >
        <p
          ref={ref}
          data-testid="stage-card-text"
          style={{ fontSize }}
          className={`w-full whitespace-normal break-words text-center font-inter font-extrabold uppercase leading-tight text-white${
            textClass ? ` ${textClass}` : ''
          }`}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
```

Di dalam `TimerDisplay`, setelah baris `const scale = useStageScale();` tambahkan:

```tsx
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const appClass = appearanceClass(appearance);
```

Ganti blok perhitungan warna:

```tsx
  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const mainColor = critical
    ? secondsLeft <= 5
      ? 'text-red-500'
      : 'text-amber-400'
    : '';
```

Ganti blok `digitContent` menjadi:

```tsx
  const digitContent =
    state.displayMode === 'clock' ? (
      <DigitText
        testId="clock-main"
        text={nowTime}
        colorClass="text-emerald-400"
        fontSize={DIGIT_FONT_SIZE.clock}
        textClass={appClass}
      />
    ) : mounted && isOvertime ? (
      showTimesUp ? (
        <DigitText
          testId="timesup"
          text="TIME'S UP"
          colorClass="text-red-500"
          animClass={phase === 'timesup-exit' ? 'anim-timesup-out' : 'anim-timesup-in'}
          fontSize={DIGIT_FONT_SIZE.timesUp}
          textClass={appClass}
        />
      ) : (
        <DigitText
          testId="overtime-counter"
          text={overtimeTime}
          colorClass="text-red-500"
          animClass="anim-swap-in"
          fontSize={DIGIT_FONT_SIZE.overtime}
          textClass={appClass}
        />
      )
    ) : (
      <DigitText
        testId="countdown-main"
        text={displayTime}
        colorClass={mainColor}
        fontSize={DIGIT_FONT_SIZE.countdown}
        textClass={appClass}
        color={critical ? undefined : appearance.fontColor}
      />
    );
```

Ganti blok `return` `TimerDisplay` menjadi:

```tsx
  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="timer-container relative flex items-center justify-center overflow-hidden bg-black"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        <StageBackground appearance={appearance} />
        <div
          className={`relative z-10 transition-transform duration-500 ease-out ${
            hasStageMessage ? 'scale-[0.3] -translate-y-[324px]' : ''
          }`}
        >
          {digitContent}
        </div>
        {hasStageMessage && (
          <div className="absolute inset-x-0 bottom-0 top-[454px] z-10 flex items-center justify-center p-6 md:p-10">
            <StageMessageCard
              text={state.stageMessage!.text}
              sentAt={state.stageMessage!.sentAt}
              textClass={appClass}
            />
          </div>
        )}
      </div>
    </main>
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/timer-page.test.tsx`
Expected: PASS (termasuk test lama yang sudah ada).

- [ ] **Step 5: Commit**

```bash
git add src/app/timer/page.tsx src/__tests__/timer-page.test.tsx
git commit -m "feat: apply appearance settings on timer display"
```

---

### Task 5: Terapkan appearance di `/matador`

**Files:**
- Modify: `src/app/matador/page.tsx`
- Test: `src/__tests__/matador-page.test.tsx`

**Interfaces:**
- Consumes: `StageBackground` (Task 3), `appearanceClass` (Task 1), `DEFAULT_APPEARANCE` (Task 1), `state.appearance` (Task 2).
- Produces: — (perilaku UI)

- [ ] **Step 1: Write the failing test**

Di `src/__tests__/matador-page.test.tsx`, tambahkan `describe` baru sebelum penutup `});` terakhir:

```tsx
  describe('appearance', () => {
    it('background color diterapkan', () => {
      store.timerStore.setAppearance({ bgMode: 'color', bgColor: '#123456' });
      render(<MatadorPage />);
      expect(screen.getByTestId('stage-background').style.backgroundColor).toContain('18');
    });

    it('background image dirender saat mode image', () => {
      store.timerStore.setAppearance({ bgMode: 'image', bgImage: '/backgrounds/grid-dark.svg' });
      render(<MatadorPage />);
      expect(screen.getByTestId('stage-background-image').getAttribute('src')).toBe(
        '/backgrounds/grid-dark.svg',
      );
    });

    it('font & warna font kustom diterapkan ke label dan digit', () => {
      store.timerStore.setAppearance({ fontFamily: 'oswald', fontColor: '#ff0000' });
      render(<MatadorPage />);
      const label = screen.getByTestId('matador-label');
      const digit = screen.getByTestId('matador-timer');
      expect(label.className).toContain('app-font-oswald');
      expect(label.style.color).toMatch(/255|#ff0000/i);
      expect(digit.className).toContain('app-font-oswald');
      expect(digit.style.color).toMatch(/255|#ff0000/i);
    });

    it('saat overtime, digit tetap merah walau fontColor diubah', async () => {
      store.timerStore.setAppearance({ fontColor: '#ff0000' });
      render(<MatadorPage />);
      const timerStore = store.timerStore;
      act(() => {
        timerStore.setDuration(5);
        timerStore.start();
        timerStore.getState().startedAt = Date.now() - 8_000;
      });
      await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
      const overtime = screen.getByTestId('matador-overtime');
      expect(overtime.className).toContain('text-red-500');
      expect(overtime.style.color).toBe('');
    });

    it('digit jam tetap emerald walau fontColor diubah', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 8, 5, 9));
      store.timerStore.setAppearance({ fontColor: '#ff0000' });
      store.timerStore.setDisplayMode('clock');
      render(<MatadorPage />);
      expect(screen.getByTestId('matador-clock').className).toContain('text-emerald-400');
      vi.useRealTimers();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/matador-page.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="stage-background"]`.

- [ ] **Step 3: Implement appearance in the matador page**

Di `src/app/matador/page.tsx`, ubah import:

```tsx
import { timerStore } from '@/lib/timer-store';
import { STAGE_HEIGHT, STAGE_WIDTH, useStageScale } from '@/hooks/useStageScale';
import { DEFAULT_APPEARANCE, type StageMessage } from '@/types/timer';
import { StageBackground } from '@/components/StageBackground';
import { appearanceClass } from '@/lib/appearance';
```

Di dalam `MatadorDisplay`, setelah baris `const scale = useStageScale();` tambahkan:

```tsx
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const appClass = appearanceClass(appearance);
```

Ganti blok `critical`/`timerColor`/`digitClass` menjadi:

```tsx
  const critical = !isOvertime && secondsLeft <= 10 && secondsLeft > 0;
  const timerColor =
    isOvertime || (critical && secondsLeft <= 5)
      ? 'text-red-500'
      : critical
        ? 'text-amber-400'
        : '';
  const timerColorStyle = isOvertime || critical ? undefined : { color: appearance.fontColor };

  const digitClass = `timer-digits shrink-0 font-anton text-[clamp(2.5rem,8cqw,7rem)] font-bold leading-none ${timerColor}${
    appClass ? ` ${appClass}` : ''
  }`;
```

Ganti baris pembuka stage div (tambah `<StageBackground />` + `relative z-10` pada konten) dan elemen-elemen teks:

```tsx
  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="timer-container flex flex-col overflow-hidden bg-black"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        <StageBackground appearance={appearance} />

        {/* Bar atas: label kiri, badge overtime di tengah, timer kanan */}
        <header className="relative z-10 flex items-center gap-4 border-b border-zinc-800/60 px-6 py-2">
          {!tickerMounted && (
            <span
              data-testid="matador-label"
              style={{ color: appearance.fontColor }}
              className={`shrink-0 whitespace-nowrap font-inter text-[clamp(1.25rem,4cqw,4.25rem)] font-black uppercase leading-none tracking-tight text-white${
                appClass ? ` ${appClass}` : ''
              }`}
            >
              {isClockMode ? 'CURRENT TIME' : 'COUNTDOWN TIMER'}
            </span>
          )}

          <div className="flex min-w-0 flex-1 justify-center">
            {tickerMounted && lastMessage ? (
              <div className={`w-full max-w-full overflow-hidden rounded-lg ${tickerExiting ? 'anim-timesup-out' : 'anim-badge-in'}`}>
                <div
                  data-testid="stage-ticker"
                  className={`overflow-hidden rounded-lg py-2 ${stageBlinking ? 'anim-ticker-blink' : 'bg-red-700'}`}
                >
                  <div
                    data-testid="stage-ticker-text"
                    className={`animate-ticker-scroll inline-block whitespace-nowrap pl-[100%] font-inter text-[clamp(0.9rem,2.2cqw,2.25rem)] font-extrabold uppercase leading-none tracking-wide text-white${
                      appClass ? ` ${appClass}` : ''
                    }`}
                  >
                    {lastMessage.text}
                  </div>
                </div>
              </div>
            ) : mounted && isOvertime && !isClockMode ? (
              <span
                data-testid="matador-timesup"
                className={`anim-badge-in flex items-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 font-inter text-[clamp(0.7rem,1.6cqw,1.75rem)] font-extrabold uppercase leading-none tracking-wider text-white${
                  appClass ? ` ${appClass}` : ''
                }`}
              >
                <span aria-hidden="true">⚠️</span>
                OVERTIME / KELEBIHAN WAKTU
                <span aria-hidden="true">⚠️</span>
              </span>
            ) : null}
          </div>

          {isClockMode ? (
            <span
              data-testid="matador-clock"
              className={`timer-digits shrink-0 font-anton text-[clamp(2.5rem,8cqw,7rem)] font-bold leading-none text-emerald-400${
                appClass ? ` ${appClass}` : ''
              }`}
            >
              {nowTime}
            </span>
          ) : mounted && isOvertime ? (
            <span data-testid="matador-overtime" className={`anim-glow ${digitClass}`}>
              {overtimeTime}
            </span>
          ) : (
            <span data-testid="matador-timer" style={timerColorStyle} className={digitClass}>
              {displayTime}
            </span>
          )}
        </header>

        {/* Space kosong untuk PPT */}
        <div data-testid="ppt-space" className="relative z-10 flex-1" aria-label="ruang presentasi" />
      </div>
    </main>
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/matador-page.test.tsx`
Expected: PASS (termasuk test lama).

- [ ] **Step 5: Commit**

```bash
git add src/app/matador/page.tsx src/__tests__/matador-page.test.tsx
git commit -m "feat: apply appearance settings on matador display"
```

---

### Task 6: Section `TAMPILAN` di `/control` + preview live

**Files:**
- Modify: `src/app/control/page.tsx`
- Test: `src/__tests__/control-page.test.tsx`

**Interfaces:**
- Consumes: `FONT_OPTIONS`, `GALLERY_BACKGROUNDS`, `sanitizeImageUrl`, `appearanceClass` (Task 1); `StageBackground` (Task 3); `DEFAULT_APPEARANCE` (Task 1); `timerStore.setAppearance` (Task 2).
- Produces: — (perilaku UI)

- [ ] **Step 1: Write the failing test**

Di `src/__tests__/control-page.test.tsx`, tambahkan import di atas:

```ts
import { DEFAULT_APPEARANCE } from '@/types/timer';
import { GALLERY_BACKGROUNDS } from '@/lib/appearance';
```

Tambahkan `describe` baru sebelum penutup `});` terakhir:

```tsx
  describe('tampilan', () => {
    it('default: mode WARNA aktif, kontrol warna tampil, input URL tidak', () => {
      render(<ControlPage />);
      expect(screen.getByLabelText('Warna background')).toBeTruthy();
      expect(screen.queryByLabelText('URL gambar')).toBeNull();
    });

    it('ganti mode ke GAMBAR → bgMode image, input URL + galeri muncul', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      expect(store.timerStore.getState().appearance.bgMode).toBe('image');
      expect(screen.getByLabelText('URL gambar')).toBeTruthy();
    });

    it('ubah warna background', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('Warna background'), { target: { value: '#ff0000' } });
      expect(store.timerStore.getState().appearance.bgColor).toBe('#ff0000');
    });

    it('klik thumbnail galeri menetapkan bgImage (setelah validasi)', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      fireEvent.click(
        screen.getByRole('button', { name: `Pilih background ${GALLERY_BACKGROUNDS[0]}` }),
      );
      expect(store.timerStore.getState().appearance.bgImage).toBe(GALLERY_BACKGROUNDS[0]);
    });

    it('input URL valid diterapkan saat blur, yang invalid diabaikan', () => {
      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      const input = screen.getByLabelText('URL gambar');
      fireEvent.change(input, { target: { value: 'https://example.com/a.png' } });
      fireEvent.blur(input);
      expect(store.timerStore.getState().appearance.bgImage).toBe('https://example.com/a.png');

      fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
      fireEvent.blur(input);
      expect(store.timerStore.getState().appearance.bgImage).toBe('');
    });

    it('pilih font, bold, italic, warna font', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('Font'), { target: { value: 'oswald' } });
      expect(store.timerStore.getState().appearance.fontFamily).toBe('oswald');
      fireEvent.click(screen.getByLabelText('BOLD'));
      expect(store.timerStore.getState().appearance.bold).toBe(true);
      fireEvent.click(screen.getByLabelText('ITALIC'));
      expect(store.timerStore.getState().appearance.italic).toBe(true);
      fireEvent.change(screen.getByLabelText('Warna font'), { target: { value: '#00ff00' } });
      expect(store.timerStore.getState().appearance.fontColor).toBe('#00ff00');
    });

    it('preview memakai font terpilih', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('Font'), { target: { value: 'teko' } });
      expect(screen.getByTestId('preview-time').className).toContain('app-font-teko');
    });

    it('RESET TAMPILAN mengembalikan semua ke default', () => {
      render(<ControlPage />);
      fireEvent.change(screen.getByLabelText('Warna font'), { target: { value: '#00ff00' } });
      fireEvent.click(screen.getByRole('button', { name: 'RESET TAMPILAN' }));
      expect(store.timerStore.getState().appearance).toEqual(DEFAULT_APPEARANCE);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: Warna background`.

- [ ] **Step 3: Implement the control UI**

Di `src/app/control/page.tsx`, ubah import:

```tsx
import { generateRoomCode } from '@/lib/room-code';
import { FONT_OPTIONS, GALLERY_BACKGROUNDS, appearanceClass, sanitizeImageUrl } from '@/lib/appearance';
import { DEFAULT_APPEARANCE, PRESET_DURATIONS } from '@/types/timer';
import { NavLinkMenu } from '@/components/NavLinkMenu';
import { StageBackground } from '@/components/StageBackground';
```

Di dalam `ControlBody`, setelah blok `const { beepRef, beepBlocked, unlockBeep } = ...`, tambahkan:

```tsx
  const appearance = state.appearance ?? DEFAULT_APPEARANCE;
  const appClass = appearanceClass(appearance);
  const [imageUrl, setImageUrl] = useState(appearance.bgImage);

  useEffect(() => {
    setImageUrl(appearance.bgImage);
  }, [appearance.bgImage]);
```

Ganti kotak preview (blok `<div className="relative flex-1 rounded-2xl border border-zinc-800 bg-black p-10 ...">` beserta isinya) menjadi:

```tsx
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 p-10 text-center shadow-[0_0_40px_-15px_rgba(0,0,0,0.8)]">
            <StageBackground appearance={appearance} />
            <div
              key={adjustPulse}
              data-testid="preview-time"
              style={isOvertime ? undefined : { color: appearance.fontColor }}
              className={`relative z-10 timer-digits font-anton text-8xl md:text-9xl ${
                isOvertime ? 'text-red-500' : ''
              } ${adjustPulse > 0 ? 'anim-pop' : ''}${appClass ? ` ${appClass}` : ''}`}
            >
              {displayTime}
            </div>
            {flash && (
              <div
                key={flash.id}
                onAnimationEnd={() => setFlash(null)}
                className={`anim-adjust-float pointer-events-none absolute right-6 top-6 z-10 text-2xl font-bold tracking-wider ${
                  flash.delta > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {flash.delta > 0 ? `+${flash.delta}` : flash.delta}
              </div>
            )}
          </div>
```

Tambahkan section `TAMPILAN` baru tepat sebelum section "Navigasi halaman" (`{/* Navigasi halaman */}`):

```tsx
        {/* Tampilan display: background, font, warna font */}
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-zinc-400">TAMPILAN</h2>

          <div className="mb-3 flex gap-3">
            <button
              onClick={() => timerStore.setAppearance({ bgMode: 'color' })}
              className={`flex-1 rounded-xl border px-4 py-3 font-semibold tracking-wider transition-all active:scale-95 ${
                appearance.bgMode === 'color'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              WARNA
            </button>
            <button
              onClick={() => timerStore.setAppearance({ bgMode: 'image' })}
              className={`flex-1 rounded-xl border px-4 py-3 font-semibold tracking-wider transition-all active:scale-95 ${
                appearance.bgMode === 'image'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
              }`}
            >
              GAMBAR
            </button>
          </div>

          {appearance.bgMode === 'color' ? (
            <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-semibold tracking-widest text-zinc-400">
              WARNA BACKGROUND
              <input
                type="color"
                aria-label="Warna background"
                value={appearance.bgColor}
                onChange={(e) => timerStore.setAppearance({ bgColor: e.target.value })}
                className="h-8 w-12 rounded"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <input
                aria-label="URL gambar"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onBlur={() => timerStore.setAppearance({ bgImage: sanitizeImageUrl(imageUrl) })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') timerStore.setAppearance({ bgImage: sanitizeImageUrl(imageUrl) });
                }}
                placeholder="https://... atau /backgrounds/..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <div className="grid grid-cols-6 gap-2">
                {GALLERY_BACKGROUNDS.map((path) => (
                  <button
                    key={path}
                    aria-label={`Pilih background ${path}`}
                    onClick={() => timerStore.setAppearance({ bgImage: path })}
                    className={`h-12 overflow-hidden rounded-lg border ${
                      appearance.bgImage === path ? 'border-emerald-500' : 'border-zinc-800'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={path} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => timerStore.setAppearance({ bgImage: '' })}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold tracking-widest hover:bg-zinc-700"
              >
                KOSONGKAN GAMBAR
              </button>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold tracking-widest text-zinc-400">
              FONT
              <select
                aria-label="Font"
                value={appearance.fontFamily}
                onChange={(e) =>
                  timerStore.setAppearance({ fontFamily: e.target.value as typeof appearance.fontFamily })
                }
                className="mt-1 w-full cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold tracking-widest text-white focus:border-emerald-500 focus:outline-none"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-400">
                <input
                  type="checkbox"
                  aria-label="BOLD"
                  checked={appearance.bold}
                  onChange={(e) => timerStore.setAppearance({ bold: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
                />
                BOLD
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-400">
                <input
                  type="checkbox"
                  aria-label="ITALIC"
                  checked={appearance.italic}
                  onChange={(e) => timerStore.setAppearance({ italic: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
                />
                ITALIC
              </label>
              <label className="ml-auto flex items-center gap-2 text-xs font-semibold tracking-widest text-zinc-400">
                WARNA FONT
                <input
                  type="color"
                  aria-label="Warna font"
                  value={appearance.fontColor}
                  onChange={(e) => timerStore.setAppearance({ fontColor: e.target.value })}
                  className="h-8 w-12 rounded"
                />
              </label>
            </div>

            <button
              onClick={() => timerStore.setAppearance(DEFAULT_APPEARANCE)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3 font-semibold tracking-widest transition-transform active:scale-95 hover:bg-zinc-700"
            >
              RESET TAMPILAN
            </button>
          </div>
        </section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: PASS (termasuk test lama).

- [ ] **Step 5: Full verification**

Run: `npm run lint` lalu `npm run typecheck` lalu `npm test`
Expected: semua PASS. Kalau lint complain `<img>` di galeri, pastikan komentar `// eslint-disable-next-line @next/next/no-img-element` tepat satu baris di atas elemen `<img>`.

- [ ] **Step 6: Commit**

```bash
git add src/app/control/page.tsx src/__tests__/control-page.test.tsx
git commit -m "feat: add appearance controls and live preview to control page"
```

---

## Verifikasi akhir (setelah semua task)

- [ ] `npm run lint` PASS
- [ ] `npm run typecheck` PASS
- [ ] `npm test` PASS
- [ ] Manual: `npm run dev`, buka `/control?room=TEST`, ubah background/font/warna, lalu buka `/timer?room=TEST` dan `/matador?room=TEST` di tab lain — perubahan harus ikut ter-apply.
- [ ] Manual: set gambar URL rusak → display tetap tampil warna fallback (tidak blank/crash).

## Catatan urutan & dependency

- Task 1 harus selesai sebelum Task 2–6 (tipe + helper).
- Task 2 (store) harus selesai sebelum Task 4–6 (komponen membaca `state.appearance`).
- Task 3 (komponen + CSS) harus selesai sebelum Task 4–6.
- Task 4, 5, 6 independen satu sama lain setelah Task 1–3 selesai.
