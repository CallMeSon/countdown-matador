# Layout Editor Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operator dapat menggeser elemen display dan menambah/mengurangi blok teks bebas dari popup canvas di `/control`, tersinkron realtime ke `/timer` dan `/matador`.

**Architecture:** Pendekatan B (offset-drag + overlay teks, sesuai spec). Posisi default display tidak diubah; drag menyimpan offset `translate`, teks custom menjadi overlay absolut dalam stage 1920×1080. Sync ikut room state via `timerStore` (WS + BroadcastChannel), pola sama seperti `appearance`.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Pointer Events native (tanpa library drag baru), vitest + testing-library, `node --test` untuk server.

## Global Constraints

- Stage display fixed 1920×1080, di-scale via `useStageScale`; semua koordinat layout dalam px stage.
- Clamp: offset `dx` −900..900, `dy` −500..500; teks `x` 0..1920, `y` 0..1080, `size` 24..200, `text` max 120 char (trim, tolak kosong), max 5 blok per halaman.
- Blok teks baru default: `x:960, y:540, size:64, text:'TEKS BARU'`.
- Kunci offset dikenal: `/timer` = `digit`; `/matador` = `label`, `ticker`, `clock`.
- Warna/font blok custom ikut `appearance` global; render teks sebagai text node (anti-XSS).
- Semua perubahan live/broadcast langsung, tanpa tombol simpan; ada RESET LAYOUT per halaman.
- Copy UI Bahasa Indonesia. Tanpa dependensi baru. `npm run lint`, `npm run typecheck`, `npm run test` harus lolos. Jangan `git push`.

---

## File Structure

| File | Peran |
|---|---|
| Modify `src/types/timer.ts` | Tambah `LayoutOffset`, `CustomTextBlock`, `PageLayout`, `DEFAULT_PAGE_LAYOUT`; `TimerState` += `layoutTimer`, `layoutMatador` |
| Create `src/lib/layout.ts` | Konstanta batas, `normalizeOffset`, `sanitizeCustomText`, `normalizePageLayout`, `generateBlockId`, `miniToStage` |
| Create `src/__tests__/layout.test.ts` | Test unit lib layout |
| Modify `src/lib/appearance.ts` | `mergeIncomingState` ikut normalisasi kedua layout (import dari `./layout`) |
| Modify `src/lib/timer-store.ts` | 5 method layout: `setLayoutOffset`, `addCustomText`, `updateCustomText`, `removeCustomText`, `resetLayout` |
| Modify `src/__tests__/timer-store.test.ts` | Append test store layout (tidak ubah test existing) |
| Modify `server/ws-server.js` | `DEFAULT_STATE` += layout default; normalisasi layout saat terima `STATE` |
| Modify `server/ws-server.integration.test.js` | Append test persist + newcomer layout |
| Create `src/components/LayoutOverlay.tsx` | Overlay absolut blok teks custom (dipakai `/timer` + `/matador`) |
| Create `src/__tests__/layout-overlay.test.tsx` | Test overlay |
| Modify `src/app/timer/page.tsx` | Wrapper translate digit + pasang overlay |
| Modify `src/__tests__/timer-page.test.tsx` | Append test layout timer |
| Modify `src/app/matador/page.tsx` | 3 wrapper translate header + pasang overlay |
| Modify `src/__tests__/matador-page.test.tsx` | Append test layout matador |
| Create `src/components/LayoutEditorModal.tsx` | Modal popup mini canvas drag + panel presisi + tambah/hapus/reset |
| Create `src/__tests__/layout-editor-modal.test.tsx` | Test modal |
| Modify `src/app/control/page.tsx` | Section `LAYOUT` + state buka modal |
| Modify `src/__tests__/control-page.test.tsx` | Append test section layout |

---

### Task 1: Tipe + lib layout

**Files:**
- Modify: `src/types/timer.ts` (append setelah `DEFAULT_TIMER_STATE`, sebelum `CHANNEL_NAME`)
- Create: `src/lib/layout.ts`
- Test: `src/__tests__/layout.test.ts`

**Interfaces:**
- Consumes: `TimerState` existing di `src/types/timer.ts`.
- Produces: `LayoutOffset {dx,dy}`, `CustomTextBlock {id,text,x,y,size}`, `PageLayout {offsets,texts}`, `DEFAULT_PAGE_LAYOUT`, `TimerState.layoutTimer/layoutMatador`, serta `LAYOUT_LIMITS`, `normalizeOffset(raw)`, `sanitizeCustomText(raw): CustomTextBlock|null`, `normalizePageLayout(raw): PageLayout`, `generateBlockId(): string`, `miniToStage(mx,my,mw,mh): {x,y}` untuk dipakai Task 2–8.

- [ ] **Step 1: Tambah tipe layout ke `src/types/timer.ts`**

Append setelah blok `DEFAULT_TIMER_STATE` (sebelum `export const CHANNEL_NAME`):

```ts
export interface LayoutOffset {
  dx: number; // px stage 1920x1080, clamp -900..900
  dy: number; // px stage 1920x1080, clamp -500..500
}

export interface CustomTextBlock {
  id: string;   // 8 char alnum
  text: string; // max 120 char, sudah di-trim
  x: number;    // px stage 0..1920
  y: number;    // px stage 0..1080
  size: number; // font-size px stage 24..200
}

export interface PageLayout {
  offsets: Record<string, LayoutOffset>;
  texts: CustomTextBlock[];
}

export const DEFAULT_PAGE_LAYOUT: PageLayout = { offsets: {}, texts: [] };
```

Dan pada `TimerState` tambah dua field setelah `appearance`:

```ts
  layoutTimer: PageLayout;   // layout halaman /timer
  layoutMatador: PageLayout; // layout halaman /matador
```

Serta pada `DEFAULT_TIMER_STATE` tambah:

```ts
  layoutTimer: DEFAULT_PAGE_LAYOUT,
  layoutMatador: DEFAULT_PAGE_LAYOUT,
```

CATATAN: `DEFAULT_PAGE_LAYOUT` dipakai dua kali sebagai referensi shared yang tidak pernah dimutasi (store selalu mengganti objek, tidak memutasi). Ini aman dan disengaja.

- [ ] **Step 2: Tulis test gagal `src/__tests__/layout.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  miniToStage,
  normalizeOffset,
  normalizePageLayout,
  sanitizeCustomText,
} from '@/lib/layout';

describe('normalizeOffset', () => {
  it('clamp dx/dy dan buang NaN ke 0', () => {
    expect(normalizeOffset({ dx: 2000, dy: -9999 })).toEqual({ dx: 900, dy: -500 });
    expect(normalizeOffset({ dx: NaN, dy: 'a' })).toEqual({ dx: 0, dy: 0 });
    expect(normalizeOffset(null)).toEqual({ dx: 0, dy: 0 });
  });
});

describe('sanitizeCustomText', () => {
  it('trim + slice 120 + clamp posisi/ukuran', () => {
    const b = sanitizeCustomText({ id: 'abcd1234', text: '  SESI 1  ', x: 5000, y: -10, size: 999 });
    expect(b).toEqual({ id: 'abcd1234', text: 'SESI 1', x: 1920, y: 0, size: 200 });
  });

  it('menolak teks kosong dan id tak valid', () => {
    expect(sanitizeCustomText({ id: 'abcd1234', text: '   ', x: 0, y: 0, size: 64 })).toBeNull();
    expect(sanitizeCustomText({ id: 42, text: 'HI', x: 0, y: 0, size: 64 })).toBeNull();
  });
});

describe('normalizePageLayout', () => {
  it('default untuk undefined dan cap 5 blok', () => {
    expect(normalizePageLayout(undefined)).toEqual({ offsets: {}, texts: [] });
    const texts = Array.from({ length: 7 }, (_, i) => ({ id: `id00000${i}`, text: `T${i}`, x: 0, y: 0, size: 64 }));
    const norm = normalizePageLayout({ offsets: { digit: { dx: 10, dy: 20 } }, texts });
    expect(norm.texts).toHaveLength(5);
    expect(norm.offsets).toEqual({ digit: { dx: 10, dy: 20 } });
  });
});

describe('miniToStage', () => {
  it('konversi proporsional mini canvas ke stage', () => {
    expect(miniToStage(320, 180, 640, 360)).toEqual({ x: 960, y: 540 });
    expect(miniToStage(0, 0, 640, 360)).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `npx vitest run src/__tests__/layout.test.ts`
Expected: FAIL dengan "Cannot find module '@/lib/layout'".

- [ ] **Step 4: Tulis implementasi minimal `src/lib/layout.ts`**

```ts
import type { CustomTextBlock, LayoutOffset, PageLayout } from '@/types/timer';
import { DEFAULT_PAGE_LAYOUT } from '@/types/timer';

export const LAYOUT_LIMITS = {
  DX_MIN: -900, DX_MAX: 900,
  DY_MIN: -500, DY_MAX: 500,
  X_MIN: 0, X_MAX: 1920,
  Y_MIN: 0, Y_MAX: 1080,
  SIZE_MIN: 24, SIZE_MAX: 200,
  TEXT_MAX: 120,
  BLOCKS_MAX: 5,
} as const;

const clampInt = (v: number, min: number, max: number): number => {
  if (!Number.isFinite(v)) return 0;
  return Math.min(max, Math.max(min, Math.round(v)));
};

export function normalizeOffset(raw: unknown): LayoutOffset {
  const o = (raw ?? {}) as Partial<LayoutOffset>;
  return {
    dx: clampInt(Number(o.dx), LAYOUT_LIMITS.DX_MIN, LAYOUT_LIMITS.DX_MAX) || 0,
    dy: clampInt(Number(o.dy), LAYOUT_LIMITS.DY_MIN, LAYOUT_LIMITS.DY_MAX) || 0,
  };
}
```

CATATAN: `clampInt` mengembalikan 0 untuk NaN; `|| 0` tambahan menjaga `-0` menjadi `0` agar `toEqual` tidak gagal (`-0` vs `0`).

```ts
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateBlockId(): string {
  let id = '';
  for (let i = 0; i < 8; i++) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return id;
}

export function sanitizeCustomText(raw: unknown): CustomTextBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Partial<CustomTextBlock>;
  if (typeof b.id !== 'string' || !/^[a-z0-9]{8}$/.test(b.id)) return null;
  const text = typeof b.text === 'string' ? b.text.trim().slice(0, LAYOUT_LIMITS.TEXT_MAX) : '';
  if (!text) return null;
  return {
    id: b.id,
    text,
    x: clampInt(Number(b.x), LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
    y: clampInt(Number(b.y), LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
    size: clampInt(Number(b.size), LAYOUT_LIMITS.SIZE_MIN, LAYOUT_LIMITS.SIZE_MAX) || LAYOUT_LIMITS.SIZE_MIN,
  };
}

export function normalizePageLayout(raw: unknown): PageLayout {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PAGE_LAYOUT, texts: [] };
  const p = raw as Partial<PageLayout>;
  const offsets: Record<string, LayoutOffset> = {};
  if (p.offsets && typeof p.offsets === 'object') {
    for (const [k, v] of Object.entries(p.offsets)) offsets[k] = normalizeOffset(v);
  }
  const texts: CustomTextBlock[] = [];
  if (Array.isArray(p.texts)) {
    for (const t of p.texts) {
      if (texts.length >= LAYOUT_LIMITS.BLOCKS_MAX) break;
      const clean = sanitizeCustomText(t);
      if (clean) texts.push(clean);
    }
  }
  return { offsets, texts };
}

export function miniToStage(mx: number, my: number, mw: number, mh: number): { x: number; y: number } {
  return {
    x: clampInt((mx / mw) * 1920, LAYOUT_LIMITS.X_MIN, LAYOUT_LIMITS.X_MAX),
    y: clampInt((my / mh) * 1080, LAYOUT_LIMITS.Y_MIN, LAYOUT_LIMITS.Y_MAX),
  };
}
```

CATATAN: `normalizePageLayout` selalu membuat objek baru (`{...}` + array baru) supaya tidak pernah memutasi shared `DEFAULT_PAGE_LAYOUT`.

- [ ] **Step 5: Jalankan test, pastikan lolos**

Run: `npx vitest run src/__tests__/layout.test.ts`
Expected: PASS (4 test).

- [ ] **Step 6: Typecheck cepat**

Run: `npm run typecheck`
Expected: PASS (test lain mungkin gagal kompilasi karena `TimerState` baru belum dinormalisasi di `mergeIncomingState` — itu dikerjakan Task 2; yang penting tidak ada error di `types/timer.ts`, `lib/layout.ts`, `layout.test.ts`).

- [ ] **Step 7: Commit**

```bash
git add src/types/timer.ts src/lib/layout.ts src/__tests__/layout.test.ts
git commit -m "feat: add layout types and normalization lib"
```

---

### Task 2: Store layout + mergeIncomingState

**Files:**
- Modify: `src/lib/timer-store.ts` (tambah 5 method setelah `hideStageMessage`, sebelum `computeRemaining`)
- Modify: `src/lib/appearance.ts` (import `normalizePageLayout`, perluas `mergeIncomingState`)
- Test: append ke `src/__tests__/timer-store.test.ts` + `src/__tests__/appearance.test.ts` (blok `describe` baru di akhir file, tidak ubah test existing)

**Interfaces:**
- Consumes: `normalizePageLayout`, `generateBlockId`, `sanitizeCustomText` dari Task 1.
- Produces: `timerStore.setLayoutOffset(page,key,offset)`, `addCustomText(page,text): string|null`, `updateCustomText(page,id,patch)`, `removeCustomText(page,id)`, `resetLayout(page)`; `mergeIncomingState` menormalisasi layout — dipakai Task 3–8.

- [ ] **Step 1: Tulis test store gagal (append di akhir `src/__tests__/timer-store.test.ts`)**

```ts
describe('timerStore layout', () => {
  it('setLayoutOffset menyimpan offset per halaman + broadcast', () => {
    store.timerStore.setLayoutOffset('matador', 'clock', { dx: 100, dy: -50 });
    expect(store.timerStore.getState().layoutMatador.offsets.clock).toEqual({ dx: 100, dy: -50 });
    expect(store.timerStore.getState().layoutTimer.offsets).toEqual({});
  });

  it('add/update/remove custom text', () => {
    const id = store.timerStore.addCustomText('timer', '  SESI 1  ');
    expect(id).toMatch(/^[a-z0-9]{8}$/);
    expect(store.timerStore.getState().layoutTimer.texts[0]).toMatchObject({ text: 'SESI 1' });
    store.timerStore.updateCustomText('timer', id as string, { x: 100, size: 80 });
    expect(store.timerStore.getState().layoutTimer.texts[0]).toMatchObject({ x: 100, size: 80 });
    store.timerStore.removeCustomText('timer', id as string);
    expect(store.timerStore.getState().layoutTimer.texts).toEqual([]);
  });

  it('teks kosong ditolak dan max 5 blok', () => {
    expect(store.timerStore.addCustomText('timer', '   ')).toBeNull();
    for (let i = 0; i < 6; i++) store.timerStore.addCustomText('timer', `T${i}`);
    expect(store.timerStore.getState().layoutTimer.texts).toHaveLength(5);
  });

  it('resetLayout mengembalikan default halaman itu saja', () => {
    store.timerStore.setLayoutOffset('timer', 'digit', { dx: 50, dy: 50 });
    store.timerStore.setLayoutOffset('matador', 'clock', { dx: 50, dy: 50 });
    store.timerStore.resetLayout('timer');
    expect(store.timerStore.getState().layoutTimer).toEqual({ offsets: {}, texts: [] });
    expect(store.timerStore.getState().layoutMatador.offsets.clock).toEqual({ dx: 50, dy: 50 });
  });

  it('tanpa room semua method no-op', () => {
    (store.timerStore as unknown as { room: null }).room = null;
    store.timerStore.setLayoutOffset('timer', 'digit', { dx: 9, dy: 9 });
    expect(store.timerStore.addCustomText('timer', 'X')).toBeNull();
  });
});
```

CATATAN: baris `(store.timerStore as unknown as { room: null }).room = null` mengakses private `room` khusus untuk test no-op; pola ini hanya dipakai di test ini.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/__tests__/timer-store.test.ts`
Expected: FAIL dengan "setLayoutOffset is not a function".

- [ ] **Step 3: Implementasi 5 method di `src/lib/timer-store.ts`**

Import di atas file (gabung dengan import existing dari `@/lib/appearance` — cukup tambah import layout):

```ts
import { generateBlockId, normalizeOffset } from '@/lib/layout';
import { LAYOUT_LIMITS } from '@/lib/layout';
```

Tambah tipe halaman di dekat `type Listener`:

```ts
export type LayoutPage = 'timer' | 'matador';
```

Sisipkan setelah method `hideStageMessage` (sebelum `computeRemaining`):

```ts
private layoutKey(page: LayoutPage): 'layoutTimer' | 'layoutMatador' {
  return page === 'timer' ? 'layoutTimer' : 'layoutMatador';
}

setLayoutOffset(page: LayoutPage, key: string, offset: { dx: number; dy: number }): void {
  if (!this.room) return;
  const k = this.layoutKey(page);
  this.setState(
    { ...this.state, [k]: { ...this.state[k], offsets: { ...this.state[k].offsets, [key]: normalizeOffset(offset) } } },
    true,
  );
}

addCustomText(page: LayoutPage, text: string): string | null {
  if (!this.room) return null;
  const k = this.layoutKey(page);
  if (this.state[k].texts.length >= LAYOUT_LIMITS.BLOCKS_MAX) return null;
  const trimmed = text.trim().slice(0, LAYOUT_LIMITS.TEXT_MAX);
  if (!trimmed) return null;
  const block = { id: generateBlockId(), text: trimmed, x: 960, y: 540, size: 64 };
  this.setState({ ...this.state, [k]: { ...this.state[k], texts: [...this.state[k].texts, block] } }, true);
  return block.id;
}

updateCustomText(page: LayoutPage, id: string, patch: { text?: string; x?: number; y?: number; size?: number }): void {
  if (!this.room) return;
  const k = this.layoutKey(page);
  const texts = this.state[k].texts.map((b) => {
    if (b.id !== id) return b;
    const next = { ...b };
    if (patch.text !== undefined) {
      const t = patch.text.trim().slice(0, LAYOUT_LIMITS.TEXT_MAX);
      if (!t) return b;
      next.text = t;
    }
    if (patch.x !== undefined) next.x = Math.min(1920, Math.max(0, Math.round(patch.x)));
    if (patch.y !== undefined) next.y = Math.min(1080, Math.max(0, Math.round(patch.y)));
    if (patch.size !== undefined) next.size = Math.min(200, Math.max(24, Math.round(patch.size)));
    return next;
  });
  this.setState({ ...this.state, [k]: { ...this.state[k], texts } }, true);
}

removeCustomText(page: LayoutPage, id: string): void {
  if (!this.room) return;
  const k = this.layoutKey(page);
  if (!this.state[k].texts.some((b) => b.id === id)) return;
  this.setState({ ...this.state, [k]: { ...this.state[k], texts: this.state[k].texts.filter((b) => b.id !== id) } }, true);
}

resetLayout(page: LayoutPage): void {
  if (!this.room) return;
  const k = this.layoutKey(page);
  this.setState({ ...this.state, [k]: { offsets: {}, texts: [] } }, true);
}
```

- [ ] **Step 4: Perluas `mergeIncomingState` di `src/lib/appearance.ts`**

Tambah import:

```ts
import { normalizePageLayout } from './layout';
```

Ubah return menjadi:

```ts
export function mergeIncomingState(state: Partial<TimerState>): TimerState {
  const appearance = normalizeAppearance(state.appearance);
  return {
    ...DEFAULT_TIMER_STATE,
    ...state,
    appearance: {
      ...appearance,
      bgImage: sanitizeImageUrl(typeof appearance.bgImage === 'string' ? appearance.bgImage : ''),
    },
    layoutTimer: normalizePageLayout(state.layoutTimer),
    layoutMatador: normalizePageLayout(state.layoutMatador),
  };
}
```

- [ ] **Step 5: Tambah test merge layout (append di akhir `src/__tests__/appearance.test.ts`)**

```ts
describe('mergeIncomingState layout', () => {
  it('mengisi layout yang hilang dari state lama', () => {
    const merged = mergeIncomingState({ ...DEFAULT_TIMER_STATE, layoutTimer: undefined, layoutMatador: undefined });
    expect(merged.layoutTimer).toEqual({ offsets: {}, texts: [] });
    expect(merged.layoutMatador).toEqual({ offsets: {}, texts: [] });
  });

  it('menormalisasi offset dan cap teks berlebih', () => {
    const merged = mergeIncomingState({
      ...DEFAULT_TIMER_STATE,
      layoutTimer: {
        offsets: { digit: { dx: 5000, dy: 0 } },
        texts: Array.from({ length: 7 }, (_, i) => ({ id: `id00000${i}`, text: 'X', x: 0, y: 0, size: 64 })),
      },
    });
    expect(merged.layoutTimer.offsets.digit).toEqual({ dx: 900, dy: 0 });
    expect(merged.layoutTimer.texts).toHaveLength(5);
  });
});
```

- [ ] **Step 6: Jalankan test, pastikan lolos**

Run: `npx vitest run src/__tests__/timer-store.test.ts src/__tests__/appearance.test.ts src/__tests__/layout.test.ts`
Expected: PASS semua.

- [ ] **Step 7: Commit**

```bash
git add src/lib/timer-store.ts src/lib/appearance.ts src/__tests__/timer-store.test.ts src/__tests__/appearance.test.ts
git commit -m "feat: add layout store methods and incoming-state normalization"
```

---

### Task 3: Default + normalisasi server

**Files:**
- Modify: `server/ws-server.js` (`DEFAULT_STATE` ~baris 25-41, handler `STATE` ~baris 171-181)
- Test: append ke `server/ws-server.integration.test.js`

**Interfaces:**
- Consumes: bentuk `PageLayout` Task 1 (offset clamp, texts cap 5 — diimplementasi ulang minimal dalam JS karena server CommonJS tanpa build).
- Produces: relay menyimpan/meneruskan `layoutTimer`/`layoutMatador` + default untuk room baru/lama — dipakai Task 5–6 saat display connect.

- [ ] **Step 1: Tambah default layout di `DEFAULT_STATE`**

```js
  layoutTimer: { offsets: {}, texts: [] },
  layoutMatador: { offsets: {}, texts: [] },
```

- [ ] **Step 2: Tambah fungsi normalisasi minimal + pakai di handler**

Letakkan di atas `wss.on('connection', ...)`:

```js
function normalizeLayout(raw) {
  const out = { offsets: {}, texts: [] };
  if (!raw || typeof raw !== 'object') return out;
  if (raw.offsets && typeof raw.offsets === 'object') {
    for (const [k, v] of Object.entries(raw.offsets)) {
      const dx = Number(v && v.dx);
      const dy = Number(v && v.dy);
      out.offsets[k] = {
        dx: !Number.isFinite(dx) ? 0 : Math.min(900, Math.max(-900, Math.round(dx))),
        dy: !Number.isFinite(dy) ? 0 : Math.min(500, Math.max(-500, Math.round(dy))),
      };
    }
  }
  if (Array.isArray(raw.texts)) {
    for (const t of raw.texts) {
      if (out.texts.length >= 5) break;
      if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !/^[a-z0-9]{8}$/.test(t.id)) continue;
      const text = typeof t.text === 'string' ? t.text.trim().slice(0, 120) : '';
      if (!text) continue;
      const cx = (v, lo, hi, fb) => { const n = Number(v); return !Number.isFinite(n) ? fb : Math.min(hi, Math.max(lo, Math.round(n))); };
      out.texts.push({ id: t.id, text, x: cx(t.x, 0, 1920, 960), y: cx(t.y, 0, 1080, 540), size: cx(t.size, 24, 200, 64) });
    }
  }
  return out;
}
```

Ubah konstruksi `currentRoom.state` di handler menjadi:

```js
      currentRoom.state = {
        ...DEFAULT_STATE,
        ...msg.state,
        appearance: { ...DEFAULT_STATE.appearance, ...(msg.state.appearance || baseAppearance) },
        layoutTimer: normalizeLayout(msg.state.layoutTimer),
        layoutMatador: normalizeLayout(msg.state.layoutMatador),
      };
```

CATATAN: pesan client lama tanpa field layout → `normalizeLayout(undefined)` → default kosong; pesan client baru ke server lama (belum update) → field diteruskan apa adanya via `...msg.state` lalu ditimpa hasil normalisasi — konsisten dua arah.

- [ ] **Step 3: Tulis test integrasi (append di akhir `server/ws-server.integration.test.js`)**

```js
const WebSocket = require('ws');

test('STATE layout bertahan per-room dan diterima newcomer', async () => {
  const { child, port } = await startServer();
  try {
    const ws1 = new WebSocket(`ws://127.0.0.1:${port}/ws?room=LAYOUT`);
    await new Promise((res) => ws1.once('open', res));
    const first = await new Promise((res) => ws1.once('message', (d) => res(JSON.parse(d.toString()))));
    assert.equal(first.type, 'STATE');
    assert.deepEqual(first.state.layoutTimer, { offsets: {}, texts: [] });
    const layout = {
      offsets: { digit: { dx: 100, dy: -50 } },
      texts: [{ id: 'abcd1234', text: 'SESI 1', x: 960, y: 200, size: 64 }],
    };
    ws1.send(JSON.stringify({ type: 'STATE', state: { ...first.state, layoutTimer: layout } }));
    await new Promise((r) => setTimeout(r, 300));
    const ws2 = new WebSocket(`ws://127.0.0.1:${port}/ws?room=LAYOUT`);
    const second = await new Promise((res) => ws2.once('message', (d) => res(JSON.parse(d.toString()))));
    assert.deepEqual(second.state.layoutTimer, layout);
    ws1.close();
    ws2.close();
  } finally {
    child.kill();
  }
});
```

- [ ] **Step 4: Jalankan test server file ini**

Run: `node --test server/ws-server.integration.test.js`
Expected: PASS semua (termasuk 3 test existing + 1 baru).

- [ ] **Step 5: Commit**

```bash
git add server/ws-server.js server/ws-server.integration.test.js
git commit -m "feat: persist and relay per-room display layouts"
```

---

### Task 4: Komponen overlay teks custom

**Files:**
- Create: `src/components/LayoutOverlay.tsx`
- Test: `src/__tests__/layout-overlay.test.tsx`

**Interfaces:**
- Consumes: `CustomTextBlock`, `AppearanceConfig`, `appearanceClass` (existing).
- Produces: `<LayoutOverlay texts={...} appearance={...} />` — me-render nol atau lebih blok absolut; dipakai Task 5 (`/timer`) dan Task 6 (`/matador`).

- [ ] **Step 1: Tulis test gagal**

```tsx
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
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/__tests__/layout-overlay.test.tsx`
Expected: FAIL "Cannot find module '@/components/LayoutOverlay'".

- [ ] **Step 3: Implementasi `src/components/LayoutOverlay.tsx`**

```tsx
'use client';

import type { AppearanceConfig, CustomTextBlock } from '@/types/timer';
import { appearanceClass } from '@/lib/appearance';

export function LayoutOverlay({
  texts,
  appearance,
}: {
  texts: CustomTextBlock[];
  appearance: AppearanceConfig;
}) {
  if (texts.length === 0) return null;
  const appClass = appearanceClass(appearance);
  return (
    <>
      {texts.map((b) => (
        <div
          key={b.id}
          data-testid={`custom-text-${b.id}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            transform: 'translate(-50%, -50%)',
            fontSize: b.size,
            color: appearance.fontColor,
          }}
          className={`pointer-events-none z-10 whitespace-nowrap text-center font-inter font-extrabold uppercase leading-none${appClass ? ` ${appClass}` : ''}`}
        >
          {b.text}
        </div>
      ))}
    </>
  );
}
```

CATATAN: `left/top/fontSize` angka → React otomatis jadi `px`. Parent (stage container 1920×1080 di kedua display) wajib `relative` — sudah `relative` di keduanya (`timer-container relative`).

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run src/__tests__/layout-overlay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LayoutOverlay.tsx src/__tests__/layout-overlay.test.tsx
git commit -m "feat: add custom-text overlay for display stages"
```

---

### Task 5: Render layout di `/timer`

**Files:**
- Modify: `src/app/timer/page.tsx` (import overlay; wrapper digit ~baris 226-231; overlay dalam stage container ~baris 241)
- Test: append ke `src/__tests__/timer-page.test.tsx`

**Interfaces:**
- Consumes: `LayoutOverlay` (Task 4), `state.layoutTimer` (Task 2).
- Produces: `/timer` menghormati offset digit + overlay teks; dipakai Task 8 (eatatan: tidak ada dependensi ke modal).

- [ ] **Step 1: Tulis test gagal (append di akhir `src/__tests__/timer-page.test.tsx`)**

Lihat pola render existing di file itu (push `?room=` lalu render + `timerStore.setRoom`) dan ikuti. Test baru:

```tsx
it('offset digit diterapkan sebagai translate dan teks custom tampil', async () => {
  window.history.pushState({}, '', '/timer?room=TEST');
  const { default: TimerPage } = await import('@/app/timer/page');
  const { timerStore } = await import('@/lib/timer-store');
  timerStore.setRoom('TEST');
  timerStore.setLayoutOffset('timer', 'digit', { dx: 100, dy: -50 });
  timerStore.addCustomText('timer', 'SESI 1');
  render(<TimerPage />);
  const digit = screen.getByTestId('countdown-main').parentElement?.parentElement as HTMLElement;
  expect(digit.style.transform).toBe('translate(100px, -50px)');
  expect(screen.getByText('SESI 1').getAttribute('data-testid')).toMatch(/^custom-text-/);
});
```

CATATAN: `countdown-main` → parent = div scale/translate existing → parent lagi = wrapper offset baru. Jika struktur berbeda saat implementasi, sesuaikan traversal (pertahankan assertion `translate(100px, -50px)` pada wrapper terdekat yang memilikinya).

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/__tests__/timer-page.test.tsx`
Expected: FAIL (tidak ada transform / teks custom).

- [ ] **Step 3: Implementasi di `src/app/timer/page.tsx`**

Tambah import:

```tsx
import { LayoutOverlay } from '@/components/LayoutOverlay';
```

Di `TimerDisplay`, setelah `const appClass = ...` tambah:

```tsx
const digitOffset = state.layoutTimer?.offsets.digit ?? { dx: 0, dy: 0 };
```

Ubah blok digit (yang sekarang `<div className={relative z-10 transition-transform ...}>`) menjadi berlapis:

```tsx
<div style={{ transform: `translate(${digitOffset.dx}px, ${digitOffset.dy}px)` }}>
  <div
    className={`relative z-10 transition-transform duration-500 ease-out ${
      hasStageMessage ? 'scale-[0.3] -translate-y-[324px]' : ''
    }`}
  >
    {digitContent}
  </div>
</div>
```

Dan dalam `.timer-container`, setelah blok `{hasStageMessage && (...)}` tambah:

```tsx
<LayoutOverlay texts={state.layoutTimer?.texts ?? []} appearance={appearance} />
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run src/__tests__/timer-page.test.tsx src/__tests__/layout-overlay.test.tsx`
Expected: PASS (termasuk semua test existing timer-page).

- [ ] **Step 5: Commit**

```bash
git add src/app/timer/page.tsx src/__tests__/timer-page.test.tsx
git commit -m "feat: apply editable layout on timer display"
```

---

### Task 6: Render layout di `/matador`

**Files:**
- Modify: `src/app/matador/page.tsx` (3 wrapper header ~baris 117-183; overlay setelah `ppt-space` ~baris 186)
- Test: append ke `src/__tests__/matador-page.test.tsx`

**Interfaces:**
- Consumes: `LayoutOverlay` (Task 4), `state.layoutMatador` (Task 2).
- Produces: `/matador` menghormati offset label/ticker/clock + overlay teks.

- [ ] **Step 1: Tulis test gagal (append di akhir `src/__tests__/matador-page.test.tsx`)**

```tsx
it('offset matador diterapkan dan teks custom tampil', async () => {
  window.history.pushState({}, '', '/matador?room=TEST');
  const { default: MatadorPage } = await import('@/app/matador/page');
  const { timerStore } = await import('@/lib/timer-store');
  timerStore.setRoom('TEST');
  timerStore.setLayoutOffset('matador', 'clock', { dx: -80, dy: 40 });
  timerStore.addCustomText('matador', 'KEYNOTE');
  render(<MatadorPage />);
  const clock = screen.getByTestId('matador-timer');
  expect((clock.parentElement as HTMLElement).style.transform).toBe('translate(-80px, 40px)');
  expect(screen.getByText('KEYNOTE').getAttribute('data-testid')).toMatch(/^custom-text-/);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/__tests__/matador-page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasi di `src/app/matador/page.tsx`**

Tambah import `LayoutOverlay`. Di `MatadorDisplay`:

```tsx
const layout = state.layoutMatador ?? { offsets: {}, texts: [] };
const off = (k: string) => layout.offsets[k] ?? { dx: 0, dy: 0 };
const t = (k: string) => `translate(${off(k).dx}px, ${off(k).dy}px)`;
```

Bungkus tiga anak header:
- span `matador-label` → `<div style={{ transform: t('label') }} className="shrink-0">` membungkusnya (pindahkan `shrink-0` dari span ke wrapper bila perlu agar flex tidak berubah; span tetap `whitespace-nowrap ...`).
- div tengah (`flex min-w-0 flex-1 justify-center`) → bungkus dengan `<div className="flex min-w-0 flex-1 justify-center" style={{ transform: t('ticker') }}>` — ganti div existing menjadi membawa style (satu elemen, bukan tambah lapis, karena div ini tidak punya animasi transform sendiri; anak ticker membawa animasi entrance sendiri).
- timer kanan (`matador-clock` / `matador-overtime` / `matador-timer`) → bungkus tiap cabang dalam `<div style={{ transform: t('clock') }} className="shrink-0">`.

CATATAN: `anim-badge-in`/`anim-glow` ada pada elemen dalam, bukan wrapper — tidak tertimpa.

Setelah `<div data-testid="ppt-space" ... />` tambah:

```tsx
<LayoutOverlay texts={layout.texts} appearance={appearance} />
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run src/__tests__/matador-page.test.tsx src/__tests__/layout-overlay.test.tsx`
Expected: PASS (termasuk test existing).

- [ ] **Step 5: Commit**

```bash
git add src/app/matador/page.tsx src/__tests__/matador-page.test.tsx
git commit -m "feat: apply editable layout on matador display"
```

---

### Task 7: Modal editor popup

**Files:**
- Create: `src/components/LayoutEditorModal.tsx`
- Test: `src/__tests__/layout-editor-modal.test.tsx`

**Interfaces:**
- Consumes: `timerStore` method Task 2, `miniToStage` + `LAYOUT_LIMITS` Task 1, `useTimer` untuk baca state (pola existing).
- Produces: `<LayoutEditorModal page="timer"|"matador" onClose={() => void} />` — dipakai Task 8. Mengekspos posisi skematik: `TIMER_BASE = { digit:{x:960,y:540} }`, `MATADOR_BASE = { label:{x:200,y:54}, ticker:{x:960,y:54}, clock:{x:1720,y:54} }` (skematik mini canvas saja, tidak dipakai display).

- [ ] **Step 1: Tulis test gagal**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('LayoutEditorModal', () => {
  let Modal: typeof import('@/components/LayoutEditorModal').LayoutEditorModal;
  let store: typeof import('@/lib/timer-store');

  beforeEach(async () => {
    vi.resetModules();
    store = await import('@/lib/timer-store');
    store.timerStore.setRoom('TEST');
    ({ LayoutEditorModal: Modal } = await import('@/components/LayoutEditorModal'));
  });

  it('render kotak skematik + tambah/hapus/reset', () => {
    render(<Modal page="matador" onClose={() => {}} />);
    expect(screen.getByTestId('layout-box-label')).toBeTruthy();
    expect(screen.getByTestId('layout-box-ticker')).toBeTruthy();
    expect(screen.getByTestId('layout-box-clock')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'TAMBAH TEKS' }));
    expect(store.timerStore.getState().layoutMatador.texts).toHaveLength(1);
    const id = store.timerStore.getState().layoutMatador.texts[0].id;
    fireEvent.click(screen.getByTestId(`layout-box-${id}`));
    fireEvent.click(screen.getByRole('button', { name: 'HAPUS' }));
    expect(store.timerStore.getState().layoutMatador.texts).toHaveLength(0);
  });

  it('slider X menggeser elemen terpilih dan RESET mengembalikan default', () => {
    render(<Modal page="timer" onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('layout-box-digit'));
    fireEvent.change(screen.getByLabelText('POSISI X'), { target: { value: '200' } });
    expect(store.timerStore.getState().layoutTimer.offsets.digit).toEqual({ dx: 200, dy: 0 });
    fireEvent.click(screen.getByRole('button', { name: /RESET LAYOUT/ }));
    expect(store.timerStore.getState().layoutTimer).toEqual({ offsets: {}, texts: [] });
  });

  it('drag box memanggil setLayoutOffset dengan koordinat stage', () => {
    render(<Modal page="timer" onClose={() => {}} />);
    const box = screen.getByTestId('layout-box-digit');
    fireEvent.pointerDown(box, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(box, { clientX: 150, clientY: 120 });
    fireEvent.pointerUp(box);
    expect(store.timerStore.getState().layoutTimer.offsets.digit.dx).toBeGreaterThan(0);
  });
});
```

CATATAN test drag: jsdom `getBoundingClientRect` mengembalikan nol — komponen harus memakai fallback ukuran container (`clientWidth/clientHeight` atau prop `canvasSize` default 640×360 saat rect nol) sehingga test tetap deterministik. Lihat Step 3.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/__tests__/layout-editor-modal.test.tsx`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implementasi `src/components/LayoutEditorModal.tsx`**

Struktur (wajib, test mengandalkan testid/label ini):

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTimer } from '@/hooks/useTimer';
import { timerStore, type LayoutPage } from '@/lib/timer-store';
import { LAYOUT_LIMITS, miniToStage } from '@/lib/layout';

export const TIMER_BASE = { digit: { x: 960, y: 540 } };
export const MATADOR_BASE = {
  label: { x: 200, y: 54 },
  ticker: { x: 960, y: 54 },
  clock: { x: 1720, y: 54 },
};
const BUILTIN_LABELS: Record<string, string> = { digit: 'DIGIT', label: 'LABEL', ticker: 'TICKER', clock: 'TIMER' };
```

- Props: `{ page: LayoutPage; onClose: () => void }`.
- State lokal: `selected: { kind: 'builtin'; key: string } | { kind: 'text'; id: string } | null`, `textInput: string` (isi editor teks terpilih), `dragging` ref.
- Baca layout: `const { state } = useTimer(); const layout = page === 'timer' ? state.layoutTimer : state.layoutMatador;` dengan fallback `?? { offsets: {}, texts: [] }`.
- Posisi skematik kotak (% dari stage): builtin → `base + offset`; custom → `x,y` langsung. Render kotak sebagai `<div data-testid={layout-box-<key|id>} style={{ left: `${x/1920*100}%`, top: `${y/1080*100}%` }}>` absolut + `translate(-50%,-50%)`, kotak terpilih `ring-2 ring-emerald-400`.
- Mini canvas: `<div data-testid="layout-canvas" className="relative aspect-video w-full ..." style={{ touchAction: 'none' }}>` + ref untuk ukur rect.
- Drag: tiap kotak `onPointerDown` → `setPointerCapture`, simpan `dragging={sel}`; `onPointerMove` di canvas → hitung posisi pointer relatif container (`clientX - rect.left`, fallback `canvasSize` 640×360 bila `rect.width===0`), `miniToStage` → builtin: `setLayoutOffset(page, key, { dx: stageX - base.x, dy: stageY - base.y })` (throttle via `requestAnimationFrame` flag); custom: `updateCustomText(page, id, { x: stageX, y: stageY })`. `onPointerUp/Cancel` → lepas.
- Panel presisi (render saat `selected`): slider `POSISI X` (`aria-label="POSISI X"`, min/max sesuai jenis: builtin −900..900 / teks 0..1920), `POSISI Y` (builtin −500..500 / teks 0..1080), dan untuk teks: input teks (`aria-label="ISI TEKS"`, maxLength 120) + slider `UKURAN` (24..200). `onChange` langsung ke store.
- Tombol: `TAMBAH TEKS` → `addCustomText(page, 'TEKS BARU')` lalu seleksi id baru (cari id yang belum ada sebelum tambah); `HAPUS` (hanya saat teks terpilih) → `removeCustomText`; `RESET LAYOUT` (`name=/RESET LAYOUT/`) → `resetLayout(page)` + clear seleksi; `TUTUP` → `onClose()`.
- Modal wrapper: fixed inset overlay + panel; `useEffect` kunci `document.body.style.overflow` selama mount; Escape → `onClose`.
- Semua teks UI Bahasa Indonesia.

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run src/__tests__/layout-editor-modal.test.tsx`
Expected: PASS. Jika test drag gagal karena rAF di jsdom, sediakan fallback di komponen: bila `requestAnimationFrame` tidak tersedia pakai update langsung (jsdom punya rAF modern — biasanya lolos; kalau tidak, flush dengan `await new Promise(r => setTimeout(r, 0))` di test sebelum assertion — JANGAN ubah assertion, tambah wait di test).

- [ ] **Step 5: Commit**

```bash
git add src/components/LayoutEditorModal.tsx src/__tests__/layout-editor-modal.test.tsx
git commit -m "feat: add popup layout editor with drag canvas"
```

---

### Task 8: Section LAYOUT di `/control`

**Files:**
- Modify: `src/app/control/page.tsx` (section baru setelah section `TAMPILAN`, sebelum navigasi ~baris 676)
- Test: append ke `src/__tests__/control-page.test.tsx`

**Interfaces:**
- Consumes: `LayoutEditorModal` (Task 7).
- Produces: operator membuka editor per halaman dari `/control`. Tidak ada API baru.

- [ ] **Step 1: Tulis test gagal (append di akhir `src/__tests__/control-page.test.tsx`)**

```tsx
it('section LAYOUT membuka modal editor per halaman', async () => {
  render(<ControlPage />);
  fireEvent.click(screen.getByRole('button', { name: 'EDIT LAYOUT TIMER' }));
  expect(screen.getByTestId('layout-canvas')).toBeTruthy();
  expect(screen.getByTestId('layout-box-digit')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'TUTUP' }));
  expect(screen.queryByTestId('layout-canvas')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'EDIT LAYOUT MATADOR' }));
  expect(screen.getByTestId('layout-box-clock')).toBeTruthy();
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: FAIL (tombol tidak ditemukan).

- [ ] **Step 3: Implementasi di `src/app/control/page.tsx`**

Di `ControlBody`: tambah state + import:

```tsx
import { LayoutEditorModal } from '@/components/LayoutEditorModal';
const [layoutEditor, setLayoutEditor] = useState<'timer' | 'matador' | null>(null);
```

Sisipkan section setelah penutup `</section>` TAMPILAN (sebelum `{/* Navigasi halaman */}`):

```tsx
{/* Layout display */}
<section>
  <h2 className="mb-3 text-xs font-semibold tracking-widest text-zinc-400">LAYOUT</h2>
  <div className="flex gap-3">
    <button
      onClick={() => setLayoutEditor('timer')}
      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-semibold tracking-wider transition-all active:scale-95 hover:border-zinc-600"
    >
      EDIT LAYOUT TIMER
    </button>
    <button
      onClick={() => setLayoutEditor('matador')}
      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-semibold tracking-wider transition-all active:scale-95 hover:border-zinc-600"
    >
      EDIT LAYOUT MATADOR
    </button>
  </div>
</section>

{layoutEditor && (
  <LayoutEditorModal page={layoutEditor} onClose={() => setLayoutEditor(null)} />
)}
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: PASS (termasuk semua test existing).

- [ ] **Step 5: Commit**

```bash
git add src/app/control/page.tsx src/__tests__/control-page.test.tsx
git commit -m "feat: add layout editor entry in control page"
```

---

### Task 9: Verifikasi akhir

**Files:** tidak ada (hanya perbaikan bila ditemukan).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: PASS, nol error.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS, nol error/warning baru (warning pre-existing pada file tak tersentuh diabaikan).

- [ ] **Step 3: Full test client**

Run: `npm run test`
Expected: PASS semua file (10 existing + 3 baru: `layout`, `layout-overlay`, `layout-editor-modal`).

- [ ] **Step 4: Full test server**

Run: `npm run test:server`
Expected: PASS semua (`upload-handler`, `image-types`, `ws-server.integration`).

- [ ] **Step 5: Uji manual dua perangkat (checklist, tanpa commit)**

1. `npm run dev`, buka `/control?room=UJI`, `/timer?room=UJI`, `/matador?room=UJI`.
2. EDIT LAYOUT MATADOR → drag TIMER → tab matador bergerak realtime.
3. TAMBAH TEKS `SESI 1` di kedua halaman → muncul di kedua display.
4. Reload display → layout tetap (persist).
5. RESET LAYOUT → kembali default.
6. Jika ada yang gagal, perbaiki sebagai task lanjutan (commit terpisah `fix: ...`), JANGAN ubah plan ini.

---

## Self-Review

**1. Spec coverage:** Data model → Task 1. Editor popup (mini canvas drag, panel presisi X/Y/ukuran, tambah/hapus/reset, tutup=live) → Task 7–8. Render display wrapper + overlay, warna/font global, overlap dibiarkan, room lama identik → Task 4–6. Sync (5 method, merge, server default, persist tanpa protokol baru) → Task 2–3. Edge (clamp, tolak kosong, text-node anti-XSS) → Task 1–4. Testing + lint/typecheck/test → tiap task + Task 9. YAGNI (tanpa rotasi/warna per-blok/z-order/multi-select/snap/undo) → tidak ada task — benar.

**2. Placeholder scan:** Tidak ada TBD/TODO/"nanti". Semua rentang angka, nama tombol, testid, dan perintah run konkret. Satu titik yang disengaja fleksibel: traversal parent di test Task 5 ("sesuaikan traversal") — assertion transform tetap eksak.

**3. Type consistency:** `LayoutOffset/CustomTextBlock/PageLayout/LayoutPage` didefinisikan Task 1–2 dan dipakai dengan nama sama di Task 3 (JS mirror), 4 (`texts/appearance`), 5–6 (`layoutTimer/layoutMatador.offsets/texts`), 7–8 (`page`, method store). `generateBlockId` 8-char `[a-z0-9]` cocok dengan regex validasi server + test (`/^[a-z0-9]{8}$/`). `miniToStage` dipakai modal + di-test unit.
