# Terapkan Desain Pencil + Editor Layar `/layar` + Animasi Minimalis

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan desain Pencil (panel kontrol, room gate, editor layar `/layar`, mode terang/gelap dengan switch ikon) ke kode, lalu menambah lapisan animasi minimalis yang hanya berfungsi sebagai umpan balik.

**Architecture:** Token desain jadi CSS variable (`:root` terang, `[data-theme="dark"]` gelap) yang dipetakan ke Tailwind. Komponen UI kecil dipakai bersama (`src/components/ui/`). Layar stage (`/timer`, `/matador`) diekstrak jadi komponen presentasional supaya editor `/layar` memakai render yang sama (WYSIWYG, real-time lewat `timerStore` yang sudah ada). Animasi: token durasi/easing di CSS, hanya `transform`/`opacity`/warna.

**Tech Stack:** Next 16 (static export), React 18, Tailwind 3, Vitest + Testing Library, lucide-react (ikon, baru).

**Spec:** `DESIGN.md`; file Pencil `/home/econ/Downloads/untitled/untitled.pen`. Frame acuan:
- Control: `Control Desktop` gb205, `Control Desktop Light` o3aJGp, `Control Mobile` hCg4A, `Control Mobile Light` XeBgV
- Gate: `Room Gate` wwCXs, `Room Gate Light` IcPwq
- Editor: `Editor Layar Desktop Dark` R6qH2, `Desktop Light` dRmKI, `Mobile Dark` y4MVvR, `Mobile Light` w1Dr9t
- Tampilan layar (panel background): `Tampilan Layar Desktop Dark` Q1JWnl, `Desktop Light` cDOyt

## Global Constraints

- Tema aktif di Pencil adalah `melius` (ink `#0E0E0E`, canvas `#FAFAFA`, aksen `#F04E23`). `DESIGN.md` dan `tailwind.config.ts` sekarang masih memakai nilai `digioh`. **Task 1 menyamakan token ke tema yang dikonfirmasi pemilik.**
- Mode terang dan gelap sama-sama didukung; switch ikon (matahari/bulan) di kanan atas nav. Default mengikuti `prefers-color-scheme`, pilihan disimpan di `localStorage` (bungkus try/catch).
- Radius: kartu 30, media 12, kontrol 7.5, chip 3, pil penuh. Font: Fraunces (judul), Geist (UI), Jost (label).
- Salin UI berbahasa Indonesia. Nama tombol yang dipakai tes tidak boleh berubah: `START`, `RESET`, `PAUSE`, `SET`, `+5D`/`-5D`/`+15D`/`-30D`/`+1M`/`-1M` (sebagai `aria-label`), `MODE DURASI`, `MULAI KE JAM`, `KIRIM`, `DONE / HIDE`, `GAMBAR`, `WARNA`, `RESET TAMPILAN`, `TIMER`, `MATADOR`, `Buka Tab Baru`, `Salin Link`, `Tersalin!`.
- Static export (`output: 'export'` saat produksi); halaman baru harus client-side saja (tanpa server component yang bergantung data).
- Relay `server/ws-server.js` menyimpan `TimerState` apa adanya. `DEFAULT_TIMER_STATE` ada di dua tempat (`server/ws-server.js`, `src/types/timer.ts`); ubah keduanya bila bentuk state default berubah.
- Animasi: hanya `transform`, `opacity`, warna. Setiap gerak punya fallback `prefers-reduced-motion` (hilangkan perpindahan, pertahankan opacity/warna). Tanpa animasi masuk halaman, tanpa stagger, tanpa loop tak berujung, tanpa bounce/elastic.
- Commit hanya jika pemilik meminta; langkah "Checkpoint" di bawah cukup menjalankan verifikasi.

## Review Focus

1. **Teks dikosongkan saat mengetik inline** → `sanitizeCustomText` membuang blok kosong, sehingga blok hilang di tengah pengetikan. Harapan: draft lokal, blok baru dihapus/dikembalikan saat blur.
2. **State lama dari relay tanpa field baru** (font, bold, italic, align, color, spacing, hidden) → harus jatuh ke nilai default, tidak crash.
3. **Pembaruan remote datang saat sedang drag** → elemen yang sedang di-drag tidak boleh loncat; seleksi tidak boleh hilang.
4. **Drag/resize di luar stage atau di layar sentuh** → nilai di-clamp ke batas `LAYOUT_LIMITS`; geser jari di kanvas tidak men-scroll halaman, tapi di luar kanvas tetap scroll.
5. **Batas 5 teks** → tombol tambah/duplikat nonaktif dengan alasan terbaca; tidak ada blok ke-6.
6. **Kilatan tema saat load** (static export) → tema terpasang sebelum render pertama tanpa mismatch hydration.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `src/styles/tokens.css` (baru) | Token warna/radius/durasi/easing, tema terang dan gelap |
| `tailwind.config.ts` (ubah) | Petakan warna ke `rgb(var(--x) / <alpha-value>)` |
| `src/lib/theme.ts` (baru) | `getStoredTheme`, `applyTheme`, `THEME_INIT_SCRIPT` |
| `src/components/ui/*.tsx` (baru) | `Button`, `Field`, `Segmented`, `Disclosure`, `ThemeSwitch`, `AppNav`, `Card` |
| `src/components/stage/TimerStage.tsx`, `MatadorStage.tsx` (baru) | Render stage dipakai `/timer`, `/matador`, dan editor |
| `src/lib/layout.ts`, `src/types/timer.ts` (ubah) | Field teks baru + normalisasi |
| `src/lib/timer-store.ts` (ubah) | `replaceLayout`, `duplicateCustomText`, patch teks diperluas |
| `src/hooks/useLayoutEditor.ts` (baru) | Seleksi, drag, snap, resize, undo/redo |
| `src/app/layar/page.tsx` (baru) | Halaman editor |
| `src/components/editor/*.tsx` (baru) | `EditorCanvas`, `SelectionBox`, `FloatingToolbar`, `ElementList`, `PropertiesPanel`, `BackgroundPanel` |
| `src/app/control/page.tsx` (ubah) | Pakai primitif baru, tautan ke `/layar` |
| `src/components/LayoutEditorModal.tsx` + tesnya (hapus) | Digantikan `/layar` |
| `src/styles/motion.css` (baru) | Kelas dan keyframe animasi |

---

### Task 1: Token desain dan tema terang/gelap

**Files:**
- Create: `src/styles/tokens.css`, `src/lib/theme.ts`, `src/components/ui/ThemeSwitch.tsx`
- Modify: `tailwind.config.ts`, `src/app/globals.css` (import tokens), `src/app/layout.tsx` (script init tema)
- Test: `src/__tests__/theme.test.tsx`

**Interfaces:**
- Produces: `type Theme = 'light' | 'dark'`; `getStoredTheme(): Theme | null`; `applyTheme(theme: Theme): void` (set `document.documentElement.dataset.theme` + simpan); `THEME_INIT_SCRIPT: string`; `<ThemeSwitch />` (tombol `role="switch"`, `aria-checked` = mode gelap, `aria-label="Mode gelap"`, tanpa teks).

- [ ] **Step 1: Konfirmasi tema dengan pemilik** (melius vs digioh); salin nilai hex tema terpilih ke `tokens.css` (nama token: `--ink`, `--ink-warm`, `--ink-deep`, `--canvas`, `--field`, `--surface`, `--accent`, `--accent-hover`, `--highlight`, `--muted`, `--faint`, `--chip`, `--on-accent`, `--line`, `--danger`). Mode terang: halaman `--field`, kartu `--surface`, teks `--ink`. Mode gelap: halaman `--ink`, permukaan `--ink-warm`, teks `--canvas`.
- [ ] **Step 2: Tulis tes gagal** di `theme.test.tsx`: `applyTheme('dark')` mengisi `data-theme="dark"` dan `localStorage`; `getStoredTheme()` mengembalikan `null` bila `localStorage` melempar error; klik `ThemeSwitch` membalik `aria-checked`.
- [ ] **Step 3: Implementasi** fungsi di atas; `THEME_INIT_SCRIPT` dijalankan inline di `<head>` (`dangerouslySetInnerHTML`) membaca penyimpanan atau `matchMedia('(prefers-color-scheme: dark)')`; tambahkan `suppressHydrationWarning` pada `<html>`.
- [ ] **Step 4: Petakan warna Tailwind** ke variabel dengan format `rgb(var(--ink) / <alpha-value>)` (simpan variabel sebagai tiga angka RGB) agar `bg-accent/10` tetap jalan.
- [ ] **Step 5: Checkpoint:** `npx vitest run src/__tests__/theme.test.tsx`; `npm run typecheck` → lulus.

### Task 2: Primitif UI bersama

**Files:**
- Create: `src/components/ui/Button.tsx`, `Field.tsx`, `Segmented.tsx`, `Disclosure.tsx`, `Card.tsx`, `AppNav.tsx`
- Test: `src/__tests__/ui-primitives.test.tsx`

**Interfaces:**
- Produces:
  - `Button({ variant: 'accent' | 'highlight' | 'ghost' | 'danger', size?: 'md' | 'lg', ...buttonProps })`
  - `Field({ label?: string, hint?: string, error?: string, ...inputProps })` (menghubungkan `aria-describedby`, `aria-invalid`)
  - `Segmented<T extends string>({ value: T, options: { value: T; label: string }[], onChange: (v: T) => void, ariaLabel: string })` (`role="radiogroup"`, panah kiri/kanan)
  - `Disclosure({ title: string, defaultOpen?: boolean, children })` (berbasis `<details>`/state, `aria-expanded`)
  - `AppNav({ room: string, active: 'control' | 'layar' })` (tautan Control dan Layar membawa `?room=`, chip room, tombol salin, `ThemeSwitch`)

- [ ] **Step 1: Tulis tes gagal:** `Segmented` memanggil `onChange` saat klik dan saat `ArrowRight`; `Field` dengan `error` memberi `aria-invalid="true"`; `AppNav` menghasilkan `href="/layar?room=AB12CD"` untuk room itu.
- [ ] **Step 2: Implementasi** mengikuti spesifikasi komponen di `DESIGN.md` (tinggi tombol 44, radius kontrol 7.5, fokus outline aksen 2px).
- [ ] **Step 3: Checkpoint:** jalankan tes file ini → lulus.

### Task 3: Terapkan desain ke `/control` dan room gate

**Files:**
- Modify: `src/app/control/page.tsx`, `src/components/NavLinkMenu.tsx`, `src/app/timer/page.tsx` dan `src/app/matador/page.tsx` (hanya `RoomEntryGate`)
- Test: `src/__tests__/control-page.test.tsx` (sesuaikan hanya bila selector berubah)

**Interfaces:**
- Consumes: `AppNav`, `Button`, `Field`, `Segmented`, `Card`, `Disclosure` (Task 2).

- [ ] **Step 1:** Susun ulang `ControlBody` sesuai frame `Control Desktop`/`Mobile`: kolom kiri (preview, PAUSE/START + RESET, tambah/kurangi waktu, mode durasi, preset, durasi custom), kolom kanan (kartu Layar tampilan, Pesan ke panggung, kartu Tampilan layar berisi tautan "Buka editor layar" ke `/layar?room=`).
- [ ] **Step 2:** Mode durasi memakai `Segmented` (pertahankan `aria-label="MODE DURASI"` dan nilai `normal`/`target`/`now`); tes lama memakai `getByLabelText('MODE DURASI')` dengan `fireEvent.change` pada select, jadi **perbarui tes itu** ke interaksi klik segmen. Ini satu-satunya perubahan tes yang disengaja.
- [ ] **Step 3:** Room gate (`RoomGate`) mengikuti frame `Room Gate`; kartu "Tampilan layar" di control **tidak** lagi memuat pengaturan background/font (pindah ke `/layar`, Task 7).
- [ ] **Step 4: Checkpoint:** `npx vitest run src/__tests__/control-page.test.tsx` → lulus; `npm run typecheck`.

### Task 4: Model data teks yang bisa disesuaikan

**Files:**
- Modify: `src/types/timer.ts`, `src/lib/layout.ts`, `src/lib/timer-store.ts`, `src/components/LayoutOverlay.tsx`
- Test: `src/__tests__/layout.test.ts`, `src/__tests__/timer-store.test.ts`, `src/__tests__/layout-overlay.test.tsx`

**Interfaces:**
- Produces:
  - `CustomTextBlock` ditambah: `font?: FontKey`, `bold?: boolean`, `italic?: boolean`, `align?: 'left' | 'center' | 'right'`, `color?: string` (hex `#RRGGBB`), `spacing?: number` (−10..40, px stage), `hidden?: boolean`. Semua opsional; default: font = font global, bold = true, italic = false, align = `center`, color = `appearance.fontColor`, spacing = 0, hidden = false.
  - `TimerStore.updateCustomText(page, id, patch: Partial<Omit<CustomTextBlock,'id'>>): void`
  - `TimerStore.duplicateCustomText(page, id): string | null` (geser +40,+40; `null` bila sudah 5 blok)
  - `TimerStore.replaceLayout(page, layout: PageLayout): void` (untuk undo/redo; lewat `normalizePageLayout`)
  - `LAYOUT_LIMITS` ditambah `SPACING_MIN: -10`, `SPACING_MAX: 40`

- [ ] **Step 1: Tes gagal:** (a) `normalizePageLayout` pada blok tanpa field baru mengembalikan blok yang sama tanpa field tambahan dan tidak error; (b) `color: 'merah'` ditolak (jatuh ke default), `spacing: 999` di-clamp ke 40; (c) `duplicateCustomText` ke-6 mengembalikan `null`; (d) `LayoutOverlay` mengeluarkan `style.fontWeight`, `fontStyle`, `textAlign`, `color`, `letterSpacing`, dan tidak merender blok `hidden`.
- [ ] **Step 2: Implementasi** di `layout.ts` (sanitasi tiap field baru) dan `timer-store.ts`; `LayoutOverlay` menerjemahkan field ke gaya. Biarkan `server/ws-server.js` apa adanya (menyimpan state utuh); tidak ada migrasi data.
- [ ] **Step 3: Checkpoint:** jalankan ketiga file tes → lulus.

### Task 5: Ekstrak stage jadi komponen bersama

**Files:**
- Create: `src/components/stage/TimerStage.tsx`, `src/components/stage/MatadorStage.tsx`
- Modify: `src/app/timer/page.tsx`, `src/app/matador/page.tsx`
- Test: `src/__tests__/timer-page.test.tsx`, `src/__tests__/matador-page.test.tsx` (harus tetap lulus tanpa diubah)

**Interfaces:**
- Produces: `TimerStage({ state: TimerState, now?: number, interactive?: false })` dan `MatadorStage({ state: TimerState, now?: number })`; keduanya merender kanvas 1920×1080 (tanpa penskalaan) dan memberi atribut `data-layout-key="digit" | "label" | "ticker" | "clock"` pada elemen bawaan agar editor bisa menempelkan seleksi.

- [ ] **Step 1:** Pindahkan JSX stage dari `timer/page.tsx` dan `matador/page.tsx` ke komponen baru tanpa mengubah perilaku; halaman hanya menambah `useStageScale`, room gate, dan beep.
- [ ] **Step 2: Checkpoint:** `npx vitest run src/__tests__/timer-page.test.tsx src/__tests__/matador-page.test.tsx` → tetap lulus (bukti tidak ada regresi).

### Task 6: Mesin editor (seleksi, drag, snap, resize, undo/redo)

**Files:**
- Create: `src/hooks/useLayoutEditor.ts`
- Test: `src/__tests__/use-layout-editor.test.tsx`

**Interfaces:**
- Consumes: `timerStore` (Task 4), `LAYOUT_LIMITS`.
- Produces:
  ```ts
  type Selection = { kind: 'builtin'; key: string } | { kind: 'text'; id: string } | null;
  function useLayoutEditor(page: LayoutPage, scale: number): {
    selection: Selection; select(s: Selection): void;
    beginDrag(e: React.PointerEvent, s: NonNullable<Selection>): void;
    beginResize(e: React.PointerEvent, id: string, corner: 'tl'|'tr'|'bl'|'br'): void;
    snapGuide: { x: boolean; y: boolean };
    dragPosition: { x: number; y: number } | null;
    nudge(dx: number, dy: number): void;       // tombol panah, Shift = 10px
    addText(): string | null; removeSelected(): void; duplicateSelected(): string | null;
    undo(): void; redo(): void; canUndo: boolean; canRedo: boolean;
  }
  ```

- [ ] **Step 1: Tes gagal:** (a) drag +100px layar pada `scale=0.5` menggeser teks +200px stage; (b) posisi dalam 8px stage dari tengah (960/540) menempel (snap) dan `snapGuide.x === true`; (c) posisi di-clamp ke 0..1920 / 0..1080; (d) satu gerakan drag = satu entri undo, `undo()` mengembalikan posisi awal; (e) update remote untuk id yang sedang di-drag tidak mengubah `dragPosition`; (f) `addText()` ke-6 mengembalikan `null`.
- [ ] **Step 2: Implementasi** memakai pola `requestAnimationFrame` yang sudah ada di `LayoutEditorModal` (salin logika throttle), `setPointerCapture`, dan riwayat berupa `PageLayout[]` dibatasi 50 entri.
- [ ] **Step 3: Checkpoint:** jalankan tes ini → lulus.

### Task 7: Halaman `/layar`

**Files:**
- Create: `src/app/layar/page.tsx`, `src/components/editor/EditorCanvas.tsx`, `SelectionBox.tsx`, `FloatingToolbar.tsx`, `ElementList.tsx`, `PropertiesPanel.tsx`, `BackgroundPanel.tsx`
- Delete: `src/components/LayoutEditorModal.tsx`, `src/__tests__/layout-editor-modal.test.tsx`
- Modify: `src/app/control/page.tsx` (hapus impor modal dan tombol `EDIT LAYOUT *`; tautan ke `/layar`)
- Test: `src/__tests__/layar-page.test.tsx`

**Interfaces:**
- Consumes: `useLayoutEditor` (Task 6), `TimerStage`/`MatadorStage` (Task 5), `AppNav`, primitif UI.

- [ ] **Step 1: Tes gagal:** (a) tanpa `?room=` halaman menampilkan room gate; (b) klik "Tambah teks" menambah blok di store dan memilihnya; (c) mengetik di input "Isi teks" mengubah teks di kanvas segera (tanpa tombol simpan); (d) `Segmented` "Layar Matador" mengganti halaman yang diedit; (e) edit teks inline: dikosongkan lalu blur → blok dihapus, tidak hilang di tengah pengetikan (Review Focus 1); (f) tombol "Tambah teks" nonaktif pada 5 teks dengan teks bantuan "Maksimal 5 teks".
- [ ] **Step 2: Implementasi tata letak** sesuai frame editor: toolbar (segmented halaman, status Live, undo/redo), kanvas (stage diskalakan dengan `useStageScale`-setara berbasis lebar kontainer), kolom samping (kartu Elemen, kartu Properti). Di mobile kolom samping jadi di bawah kanvas.
- [ ] **Step 3:** Properti: isi teks, X/Y (input angka + clamp), ukuran, jarak huruf, font, bold/italic, rata teks, warna, Duplikat, Hapus. Tab "Latar" di kartu samping memuat `BackgroundPanel` (pindahan pengaturan background/font/upload dari control, perilaku dan nama aksesibel tetap: `GAMBAR`, `WARNA`, `Upload gambar`, `URL gambar`, `RESET TAMPILAN`). Pindahkan juga tes background dari `control-page.test.tsx` ke `layar-page.test.tsx`.
- [ ] **Step 4:** Keyboard: panah menggeser 1px (Shift 10px), `Delete` menghapus teks terpilih, `Escape` batal seleksi, `Cmd/Ctrl+Z` undo, `Shift+Cmd/Ctrl+Z` redo. Hit-area handle minimal 24px (44px di layar sentuh); `touch-action: none` hanya pada elemen yang bisa di-drag.
- [ ] **Step 5: Checkpoint:** `npx vitest run`; `npm run typecheck`; `npm run build` → semua lulus; buka `/layar?room=...` di dua tab dan pastikan perubahan tampil real-time di `/timer`.

### Task 8: Lapisan animasi minimalis

**Files:**
- Create: `src/styles/motion.css`, `src/hooks/usePresence.ts`
- Modify: komponen di `src/components/ui/`, `editor/`, `NavLinkMenu.tsx`, `src/app/control/page.tsx`
- Test: `src/__tests__/motion.test.tsx`

**Interfaces:**
- Produces: `usePresence(open: boolean, exitMs: number): { mounted: boolean; state: 'enter' | 'exit' }` (menunda unmount sampai animasi keluar selesai; di reduced-motion `exitMs` dianggap 0).

Token di `motion.css`: `--ease-out: cubic-bezier(0.22,1,0.36,1)`, `--ease-exit: cubic-bezier(0.55,0.055,0.675,0.19)`, `--t-press: 140ms`, `--t-hover: 180ms`, `--t-ui: 240ms`.

Daftar gerak (satu baris = satu keputusan; tidak ada yang lain):

| Elemen | Gerak | Durasi / easing |
|---|---|---|
| Semua tombol | Tekan: `scale(0.97)`; hover: warna/garis | 140ms / 180ms, ease-out |
| Fokus keyboard | Outline aksen muncul dengan offset 2→3px | 120ms |
| `Segmented` | Pil aktif meluncur ke segmen baru (`translateX`) | 240ms, ease-out |
| `ThemeSwitch` | Knob meluncur; ikon aktif crossfade; warna halaman bertransisi hanya saat toggle (kelas `theme-transition` dipasang 250ms lalu dilepas, jadi tidak ada transisi saat load) | 240ms |
| Preset durasi | Garis/teks aktif berganti warna | 180ms |
| Angka preview | Ganti angka memakai `anim-tick` yang sudah ada; badge `+/-` tetap `anim-adjust-float` | tetap |
| Overtime | Warna angka berubah ke merah | 300ms warna, tanpa denyut |
| `Disclosure` | Isi membuka dengan `grid-template-rows` 0fr→1fr + opacity | 240ms |
| Dropdown `NavLinkMenu` | Muncul: opacity + `translateY(4px→0)` dari tombol; tutup lebih singkat | 160ms masuk / 100ms keluar (ease-exit) |
| Salin kode / Salin link | Label berganti "Tersalin!" dengan crossfade | 160ms |
| Pesan panggung | Form ↔ kartu "Pesan aktif" crossfade | 180ms |
| Editor: kotak seleksi | Opacity 0→1, handle `scale(0.6→1)` | 120ms |
| Editor: toolbar mengambang | Opacity + `translateY(6px→0)` | 140ms |
| Editor: drag | Tanpa animasi saat menyeret (langsung mengikuti pointer); saat lepas dan snap ke tengah, posisi menetap | 120ms, ease-out |
| Editor: garis bantu tengah | Fade in saat dalam jarak snap, fade out saat keluar | 100ms |
| Editor: tambah teks | Teks baru muncul di tengah (`scale 0.96→1`, opacity), langsung terpilih dan input "Isi teks" fokus dengan isi terpilih semua | 180ms |
| Editor: hapus teks | Fade keluar lalu dilepas dari store | 120ms, ease-exit |
| Editor: undo/redo | Posisi berpindah halus (hanya bila tidak sedang drag) | 160ms |
| Editor: baris daftar elemen | Sorotan baris terpilih sinkron dengan seleksi kanvas | 180ms |
| Status Live | Satu denyut cincin tiap perubahan terkirim; teks "Menyimpan…" → "Live" crossfade. Tidak ada denyut tak berujung | 600ms sekali |

- [ ] **Step 1: Tes gagal:** `usePresence(false, 100)` tetap `mounted === true` sampai 100ms lalu `false`; dengan `matchMedia('(prefers-reduced-motion: reduce)')` bernilai true, ia langsung `mounted === false`; `Disclosure` menjaga `aria-expanded` benar selama transisi.
- [ ] **Step 2: Implementasi** `motion.css` (semua deklarasi di blok `@media (prefers-reduced-motion: no-preference)` kecuali crossfade opacity/warna yang tetap jalan di reduced-motion) dan `usePresence`; hubungkan kelas ke komponen di tabel.
- [ ] **Step 3: Jangan** menyentuh animasi stage tampilan (`anim-tick`, `anim-glow`, ticker, overtime pulse di `/timer` dan `/matador`); itu bagian tayangan, bukan UI kontrol.
- [ ] **Step 4: Checkpoint:** `npx vitest run src/__tests__/motion.test.tsx`; cek manual: nyalakan "Reduce motion" di OS dan pastikan tidak ada perpindahan/skala tersisa selain perubahan warna dan opacity.

### Task 9: Verifikasi akhir

- [ ] **Step 1:** `npm run lint && npm run typecheck && npx vitest run && npm run test:server && npm run build` → lulus (peringatan lint lama boleh tetap).
- [ ] **Step 2:** `impeccable detect --json src` pada file yang berubah; selesaikan temuan yang valid.
- [ ] **Step 3: Cek manual** terang/gelap pada: `/control` (desktop dan lebar 390), room gate, `/layar` (drag, snap, tambah teks, edit inline, undo/redo, tab Latar), dan `/timer` + `/matador` di tab lain untuk memastikan sinkron real-time. Bandingkan dengan frame Pencil yang tercantum di Spec.
- [ ] **Step 4:** Perbarui `DESIGN.md` agar sama dengan token final dan catat perubahan jalur (`/layar`) di `CLAUDE.md`.

---

## Self-review

- **Cakupan spec:** token + tema (T1), komponen (T2), control + gate (T3), data teks (T4), stage bersama (T5), mesin editor (T6), `/layar` termasuk background (T7), animasi (T8), verifikasi (T9). Dari desain Pencil semuanya punya tugas.
- **Penyimpangan disengaja dari desain:** ikon mata hanya untuk teks, tidak untuk digit timer (menyembunyikan timer merusak fungsi). Direncanakan: baris "Digit timer" tanpa ikon mata.
- **Konsistensi tipe:** `Selection`, `LayoutPage`, dan `CustomTextBlock` dipakai sama di T4, T6, T7; `usePresence` hanya didefinisikan di T8.
- **Proporsi:** kode hanya muncul sebagai tanda tangan dan nilai yang ditetapkan spec.
