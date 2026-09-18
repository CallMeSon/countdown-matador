# Appearance Settings (Background, Font, Font Color) — countdown-matador

**Date:** 2026-09-18
**Status:** Draft (menunggu review user)
**Base:** codebase server `a4e9586` (branch `feature/appearance`), websocket room sync

## Ringkasan

Operator bisa mengatur tampilan halaman display (`/timer` dan `/matador`) dari `/control`:
background (warna solid **atau** gambar), pilihan font, bold/italic, dan warna font.
Setting disimpan di room state sehingga tersinkron otomatis ke semua perangkat di room yang
sama dan tersimpan di `state.json` server.

## Keputusan

| Keputusan | Nilai |
|---|---|
| Lokasi pengaturan | Section baru di `/control` |
| Sinkronisasi | Ikut room state (WebSocket), sinkron semua perangkat + persisted |
| Halaman yang kena | `/timer` dan `/matador`, satu set setting sama |
| Sumber gambar | URL yang di-paste + galeri bawaan (SVG di `/public/backgrounds/`) |
| Warna vs gambar | Pemilih mode: `WARNA` atau `GAMBAR` (warna jadi fallback di mode gambar) |
| Cakupan font | Semua teks display (digit, label, ticker, kartu pesan) |
| Bold/italic | Toggle, berlaku ke semua teks display |
| Warna font | Berlaku ke digit countdown + label saat tidak peringatan. Digit jam tetap emerald, peringatan tetap override |
| Teks ticker/kartu pesan | Tetap putih (dibaca di atas background merah) |

## Data model

`src/types/timer.ts`:

```ts
export type BackgroundMode = 'color' | 'image';

export type FontKey =
  | 'default' | 'anton' | 'bebas' | 'oswald'
  | 'teko' | 'archivo' | 'orbitron' | 'robotoMono';

export interface AppearanceConfig {
  bgMode: BackgroundMode;
  bgColor: string;     // '#rrggbb'
  bgImage: string;     // URL absolut http(s) ATAU path galeri '/backgrounds/*.svg'; '' = kosong
  fontFamily: FontKey;
  bold: boolean;
  italic: boolean;
  fontColor: string;   // '#rrggbb'
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

- `TimerState` mendapat field baru `appearance: AppearanceConfig`.
- `DEFAULT_TIMER_STATE.appearance = DEFAULT_APPEARANCE`.
- Nilai default sengaja mereproduksi tampilan sekarang persis: background hitam, digit Anton,
  label Inter, teks putih, tidak italic.

### Opsi font

`src/lib/fonts.ts` — daftar kurasi (dimuat lewat satu `@import` Google Fonts di `globals.css`):

| Key | Label | Font stack |
|---|---|---|
| `default` | Default (Anton + Inter) | digit Anton, teks Inter — perilaku sekarang |
| `anton` | Anton | `'Anton', sans-serif` |
| `bebas` | Bebas Neue | `'Bebas Neue', sans-serif` |
| `oswald` | Oswald | `'Oswald', sans-serif` |
| `teko` | Teko | `'Teko', sans-serif` |
| `archivo` | Archivo Black | `'Archivo Black', sans-serif` |
| `orbitron` | Orbitron | `'Orbitron', sans-serif` |
| `robotoMono` | Roboto Mono | `'Roboto Mono', monospace` |

Bold/italic diterapkan sebagai `font-weight: 900` / `font-style: italic`. Weight 900 dipakai (bukan 700) supaya teks yang sudah `font-black`/`font-extrabold` tidak jadi lebih tipis saat BOLD diaktifkan. Kalau font tidak punya
varian tersebut, browser melakukan sintesis (faux bold/italic) — dapat diterima.

### Galeri bawaan

`/public/backgrounds/*.svg` — beberapa background SVG (gradien/pattern) yang di-ship bersama app.
Tidak ada aset biner baru; field `bgImage` menerima path `/backgrounds/...` maupun URL `http(s)`.

## Sync & persistence

- `timer-store.ts` menambah `setAppearance(patch: Partial<AppearanceConfig>)`:
  merge `{ ...this.state.appearance, ...patch }` lalu `setState(..., true)` (broadcast) — pola sama
  persis seperti `setDisplayMode`.
- Normalisasi saat menerima state dari WebSocket (dan saat load room lama):
  `appearance: { ...DEFAULT_APPEARANCE, ...(msg.state.appearance ?? {}) }`, supaya room yang
  sudah tersimpan di `state.json` sebelum fitur ini ada tidak menghasilkan `undefined`.
- `server/ws-server.js` `DEFAULT_STATE` ditambah `appearance: DEFAULT_APPEARANCE` agar konsisten.
- Karena appearance ikut `TimerState`, ia otomatis persisted ke `state.json` dan dikirim ke
  newcomer saat connect — tidak perlu pesan/protokol baru.

## UI di `/control` (section `TAMPILAN`)

Section baru di `ControlBody`, di bawah section "PESAN KE PANGGUNG":

1. **Background**
   - Toggle `WARNA` / `GAMBAR` (`bgMode`).
   - Mode `WARNA`: `<input type="color" value={bgColor}>`.
   - Mode `GAMBAR`: input URL, baris thumbnail galeri bawaan (klik = set `bgImage`), tombol
     "KOSONGKAN". Warna tetap dipakai sebagai fallback di belakang gambar.
2. **Font** — `<select>` dari `FONT_OPTIONS`.
3. **Bold** dan **Italic** — dua checkbox.
4. **Warna font** — `<input type="color" value={fontColor}>`.
5. **RESET TAMPILAN** — set ulang ke `DEFAULT_APPEARANCE`.
6. **Preview live** — kotak preview timer yang sudah ada di `/control` memakai background, font,
   bold/italic, dan warna font terpilih, jadi operator melihat hasilnya tanpa pindah tab.
   (Kontrol UI sisanya tetap tema gelap seperti sekarang.)

Semua perubahan langsung memanggil `timerStore.setAppearance(...)` (broadcast tiap perubahan).

## Render di display

### Background

Komponen baru `src/components/StageBackground.tsx`:

- Mode `color`: elemen `absolute inset-0` dengan `backgroundColor: bgColor`.
- Mode `image`:
  - Render `<img src={bgImage}>` `absolute inset-0 h-full w-full object-cover`
    (**bukan** CSS `url()` inline, supaya URL dari user tidak bisa jadi CSS injection).
  - Anggota `<img>` diberi `onError` → sembunyikan gambar, sehingga lapisan `bgColor` di
    belakangnya terlihat (fallback).
  - Kalau `bgImage` kosong, langsung pakai `bgColor`.
- Dipasang di root stage `/timer` dan `/matador`; `bg-black` statis diganti komponen ini.

### Font, bold/italic, warna

Helper `src/lib/appearance.ts` (dipakai `/control` preview, `/timer`, `/matador`):

- `appearanceTextClass(a)` → string kelas font/weight/style:
  - `fontFamily !== 'default'` → `app-font-<key>`;
  - `bold` → `app-bold`; `italic` → `app-italic`.
- `FONT_OPTIONS`, `normalizeAppearance`, `sanitizeImageUrl`, `DEFAULT_APPEARANCE`.

`globals.css` menambah kelas kecil (default tampilan tidak berubah):

- `.app-font-oswald { font-family: 'Oswald', sans-serif !important; }` dst. untuk tiap font.
- `.app-bold { font-weight: 900 !important; }`
- `.app-italic { font-style: italic !important; }`

Kelas ini ditempel ke semua elemen teks display (digit, label, ticker, kartu pesan). Selama
`fontFamily === 'default'` dan bold/italic off, tidak ada kelas tambahan, sehingga
`font-anton`/`font-inter` yang lama tetap dipakai dan tampilan default identik dengan sekarang.

Warna font:

- Untuk digit countdown dan label, kalau **tidak** dalam keadaan peringatan, pakai inline
  `style={{ color: appearance.fontColor }}` (inline menang atas kelas `text-white`).
- Keadaan peringatan tetap seperti sekarang: `text-amber-400` (≤10 dtk) dan `text-red-500`
  (≤5 dtk / overtime) — override warna kustom.
- Digit jam (`displayMode === 'clock'`) tetap emerald (warna penanda mode, sama seperti peringatan).
- Badge overtime dan teks ticker/kartu pesan tetap putih.

## Edge cases

- Room lama tanpa `appearance` → dinormalisasi ke `DEFAULT_APPEARANCE`, tidak crash.
- Gambar gagal dimuat (404 / diblokir / offline) → `onError` jatuh ke `bgColor`.
- Mode `image` tapi `bgImage` kosong → langsung `bgColor`.
- URL tidak valid atau skema berbahaya (`javascript:`, `data:`) → ditolak `sanitizeImageUrl`,
  jatuh ke `bgColor`. Hanya `http(s)://` dan path yang diawali `/backgrounds/` yang diterima,
  panjang maksimum 2048 karakter.
- `RESET TAMPILAN` mengembalikan seluruh field ke `DEFAULT_APPEARANCE` dan broadcast.

## Testing

- **Store** (`timer-store.test.ts`): `setAppearance` merge sebagian field + broadcast; normalisasi
  state lama tanpa `appearance`.
- **lib** (`appearance.test.ts`): `sanitizeImageUrl` menolak `javascript:`/`data:`/kosong dan
  menerima `http(s)` + `/backgrounds/`; `normalizeAppearance` mengisi field hilang.
- **Control** (`control-page.test.tsx`): section `TAMPILAN` ter-render; ganti mode, pilih font,
  toggle bold/italic, dan ubah warna memanggil store dengan nilai benar; `RESET TAMPILAN`.
- **Display** (`timer-page.test.tsx`, `matador-page.test.tsx`): background warna diterapkan; mode
  gambar merender `<img>`; `onError` jatuh ke warna; font/weight/style/warna diterapkan; warna
  peringatan tetap menang saat critical/overtime.
- `npm run lint`, `npm run typecheck`, `npm run test` harus lolos.

## Di luar cakupan (YAGNI)

- Upload file gambar dari device / endpoint upload di server.
- Overlay tint gambar + slider opacity (teks di atas gambar terang jadi tanggung jawab operator).
- Opsi `object-fit: contain` atau posisi gambar (selalu `cover`).
- Setting terpisah per halaman (`/timer` beda dengan `/matador`).
- Input nama Google Font bebas / load font dinamis.
- Animasi atau slideshow background.
