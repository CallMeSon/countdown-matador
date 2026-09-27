# Layout Editor Realtime (Matador & Timer) — countdown-matador

**Date:** 2026-09-27
**Status:** Approved (menunggu implementation plan)
**Base:** codebase `ba4397a`, pola sync room + appearance yang sudah ada
**Pendekatan:** B — offset-drag + overlay teks (disetujui user)

## Ringkasan

Operator bisa mengedit layout halaman display langsung dari `/control` lewat
popup canvas mini: menggeser elemen bawaan (drag) dan menambah/mengurangi blok
teks bebas (isi + posisi + ukuran). Layout **terpisah** untuk `/timer` dan
`/matador`, tersinkron realtime ke semua perangkat di room yang sama,
tersimpan per-room, dan bisa di-reset per halaman.

Posisi default kedua halaman **tidak berubah**. Drag hanya menyimpan *offset*
dari posisi default (diterapkan sebagai `translate`), sehingga layout,
animasi, dan scaling stage 1920×1080 yang sudah stabil tidak disentuh.

## Keputusan

| Keputusan | Nilai |
|---|---|
| Pendekatan | B: offset-drag + overlay teks (bukan absolut penuh, bukan preset) |
| Cakupan | Dua layout terpisah: `layoutTimer` untuk `/timer`, `layoutMatador` untuk `/matador` |
| Cara edit | Popup modal canvas mini 16:9 di `/control`, drag langsung (mouse + sentuh) |
| Elemen bawaan bisa digeser | `/timer`: digit utama. `/matador`: label, kolom ticker/badge tengah, timer kanan |
| Elemen fixed | PPT-space, kartu pesan stage (`/timer`), struktur header itu sendiri |
| Blok teks custom | Isi + posisi + ukuran saja; warna/font ikut `appearance` global |
| Batas blok custom | Max 5 per halaman, teks max 120 char, size 24–200 px stage |
| Sinkronisasi | Ikut room state (WS + BroadcastChannel), persisted `state.json` |
| Reset | Tombol RESET LAYOUT per halaman di dalam modal |
| Simpan | Tidak ada tombol simpan — semua perubahan live/broadcast langsung |

## Data model

`src/types/timer.ts` (tambahan baru):

```ts
export interface LayoutOffset {
  dx: number; // px dalam koordinat stage 1920x1080, clamp [-900, 900]
  dy: number; // px dalam koordinat stage 1920x1080, clamp [-500, 500]
}

export interface CustomTextBlock {
  id: string;   // random 8 char, unik per halaman
  text: string; // max 120 char, render sebagai text (bukan HTML)
  x: number;    // px stage 0..1920, clamp
  y: number;    // px stage 0..1080, clamp
  size: number; // font-size px stage, 24..200, clamp
}

export interface PageLayout {
  offsets: Record<string, LayoutOffset>;
  texts: CustomTextBlock[];
}

export const DEFAULT_PAGE_LAYOUT: PageLayout = { offsets: {}, texts: [] };
```

Kunci `offsets` yang dikenal:

- `/timer`: `digit`
- `/matador`: `label`, `ticker`, `clock`

Kunci tak dikenal dari peer lama/baru diabaikan saat render (tidak crash),
tapi dipertahankan di state agar tidak hilang saat broadcast ulang.

`TimerState` mendapat dua field baru:

```ts
layoutTimer: PageLayout;
layoutMatador: PageLayout;
```

Default keduanya `DEFAULT_PAGE_LAYOUT` (offset kosong = tampil identik
dengan sekarang, texts kosong).

## Editor popup di `/control`

Section baru `LAYOUT` di `ControlBody` (di bawah `TAMPILAN`) berisi dua tombol:

- `EDIT LAYOUT TIMER`
- `EDIT LAYOUT MATADOR`

Masing-masing membuka modal popup (`LayoutEditorModal`) untuk halaman itu:

1. **Mini canvas** 16:9 skematik (lebar penuh modal, max ~640px):
   - `/timer`: kotak berlabel `DIGIT` di tengah + placeholder kartu pesan
     (fixed, tidak bisa dipilih) + kotak tiap teks custom.
   - `/matador`: tiga kotak header berlabel (`LABEL`, `TICKER`, `TIMER`) +
     area `PPT` (fixed) + kotak tiap teks custom.
   - Kotak adalah representasi skematik (posisi proporsional terhadap stage),
     bukan render full-fidelity — cukup untuk drag presisi operator.
2. **Drag langsung** via Pointer Events (`pointerdown/move/up` +
   `setPointerCapture`, `touch-action: none`) sehingga bisa mouse maupun jari.
   Update posisi di-throttle dengan `requestAnimationFrame` dan langsung
   memanggil `timerStore` → broadcast realtime ke display.
3. **Seleksi**: klik/tap elemen → ring highlight + panel presisi:
   - slider X (`dx` / `x`) dan Y (`dy` / `y`) angka;
   - slider ukuran (hanya untuk teks custom).
4. **Aksi teks**: `TAMBAH TEKS` (buat blok baru di tengah canvas dengan teks
   default `TEKS BARU`, langsung terseleksi untuk diedit isinya),
   `HAPUS` (hapus blok terpilih). Teks kosong / whitespace-only ditolak.
5. **RESET LAYOUT** — kembalikan layout halaman ini ke default + broadcast.
6. Tidak ada tombol simpan; menutup modal = selesai. Modal mengunci scroll
   body selama terbuka.

Koordinat mini canvas ↔ stage: `stage = mini * (1920 / miniWidth)` untuk X
dan `stage = mini * (1080 / miniHeight)` untuk Y, dibulatkan ke integer.

## Render di display

### Prinsip

Offset bawaan diterapkan sebagai **wrapper `translate` di luar** elemen
existing — markup, kelas animasi (`anim-timesup-*`, `anim-badge-in`,
`animate-ticker-scroll`, scale-down saat pesan tampil), dan container-query
tidak diubah.

### `/timer` (`src/app/timer/page.tsx`)

- Wrapper digit: `<div style={{ transform: translate(dx,dy) }}>` membungkus
  div existing yang punya `scale-[0.3] -translate-y-[324px]` saat pesan tampil
  (transform berlapis, tidak saling menimpa).
- Overlay teks custom: layer absolut dalam `.timer-container` 1920×1080
  (ikut ke-scale otomatis via `useStageScale`), tiap blok:
  `position:absolute; left:x; top:y; transform:translate(-50%,-50%);
  fontSize:size`, kelas `appearanceClass(appearance)`,
  `style={{ color: appearance.fontColor }}`, `pointer-events-none`,
  `whitespace-nowrap`.
- Kartu pesan stage tetap fixed seperti sekarang.

### `/matador` (`src/app/matador/page.tsx`)

- Tiga wrapper translate: sekitar label kiri, kolom tengah (ticker/badge),
  dan timer kanan. Struktur flex header tidak diubah.
- Overlay teks custom: sama seperti `/timer`, layer absolut dalam stage
  container, `z-10`, di atas PPT-space, `pointer-events-none`.
- PPT-space (`data-testid="ppt-space"`) tetap fixed.

### Aturan umum

- Overlap antar elemen dibiarkan — tanggung jawab operator.
- Room lama / state tanpa layout → default → tampil identik dengan sekarang.
- Blok custom dirender sebagai text node React (otomatis escaped, anti-XSS).

## Sync & persistence

Store (`src/lib/timer-store.ts`), pola sama persis dengan `setAppearance`:

- `setLayoutOffset(page: 'timer' | 'matador', key: string, offset: LayoutOffset)`
- `addCustomText(page, text: string): id`
- `updateCustomText(page, id, patch: { text?; x?; y?; size? })`
- `removeCustomText(page, id)`
- `resetLayout(page)`

Semua no-op kalau belum `setRoom`; semua `setState(..., true)` → broadcast
WS + BroadcastChannel.

Normalisasi (`mergeIncomingState` di `src/lib/appearance.ts` atau
`src/lib/layout.ts` baru — diputuskan saat implementasi, satu lokasi saja):

- offset: clamp angka ke rentang, buang NaN → 0;
- texts: `text.slice(0,120)`, clamp x/y/size, cap max 5 (kelebihan dibuang
  dari belakang), id non-string → generate ulang;
- hilangkan kunci offset tak dikenal? Tidak — dipertahankan (forward-compat).

`server/ws-server.js` `DEFAULT_STATE` ditambah
`layoutTimer: { offsets:{}, texts:[] }` dan
`layoutMatador: { offsets:{}, texts:[] }` agar konsisten + merge defensif
seperti `appearance`. Karena ikut `TimerState`, layout otomatis persisted ke
`state.json`, dikirim ke newcomer saat connect — tanpa pesan/protokol baru.

Payload tetap kecil: 3 offset + max 5 blok pendek per halaman.

## Edge cases

- Drag keluar canvas → clamp ke rentang (elemen tidak bisa hilang).
- Teks kosong → tambah/update ditolak diam-diam (tombol disabled saat input kosong).
- Teks 1 baris (`whitespace-nowrap`); terlalu panjang → meluap visual, operator
  kecilkan size / pendekkan teks (tidak ada auto-shrink, YAGNI).
- Blok custom saat `stageMessage` tampil di `/timer`: overlay tetap di atas
  (z-order: overlay > kartu), bisa overlap — diterima.
- Modal dibuka tanpa room → tidak mungkin (ControlBody hanya render saat room ada).
- BroadcastChannel + WS ganda → state identik, double-apply aman (pola existing).

## Testing

- **Store** (`timer-store.test.ts` +): offset merge + broadcast; add/update/
  remove/reset custom text; no-op tanpa room; normalisasi state lama tanpa
  field layout.
- **lib** (`layout.test.ts` baru): clamp offset, sanitize text (slice 120,
  trim?), clamp x/y/size, cap 5 blok, id fallback.
- **Control** (`control-page.test.tsx` + / file baru): tombol edit buka modal;
  drag (mock pointer events) memanggil store dengan stage px benar; tambah/
  hapus teks; reset memanggil `resetLayout`.
- **Display** (`timer-page.test.tsx`, `matador-page.test.tsx` +): wrapper
  translate diterapkan dari offset; overlay custom ter-render dengan posisi +
  ukuran + warna global; tanpa layout = tidak ada transform/overlay.
- `npm run lint`, `npm run typecheck`, `npm run test` harus lolos.

## Di luar cakupan (YAGNI)

- Rotasi elemen, opacity/z-order manual per blok.
- Warna/font/bold-italic per blok (ikut global).
- Multi-select, snap guides/grid magnet, align tools.
- Undo history (hanya reset).
- Ukuran digit timer bawaan diubah via editor (digit `/timer` tetap px
  kalibrasi; yang bisa digeser hanya posisinya).
- Layout terpisah portrait/landscape; layout per-device.
- Import/export layout JSON.
