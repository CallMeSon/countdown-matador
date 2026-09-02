# Simple Timer Redesign — countdown-matador

**Date:** 2026-09-02
**Status:** Approved (design walkthrough complete)

## Ringkasan

Sistem timer panggung disederhanakan total menjadi 3 tampilan (control, timer, matador) dengan sinkronisasi antar-tab lokal via BroadcastChannel. Semua fitur lama (Supabase, audio, cue, PIN, session registry, warning threshold config, admin hub) dihapus. Timer tidak berhenti di 00:00 — berlanjut ke overtime minus sampai dihentikan manual.

## Keputusan

| Keputusan | Nilai |
|---|---|
| Sync | BroadcastChannel lokal (antartab browser), Supabase dibuang total |
| Kontrol | Start/Pause toggle + Reset + set durasi |
| Set durasi | Tombol preset (1/3/5/10/15/30 menit) + input custom MM:SS |
| Fitur lama | Dihapus semua, diganti 3 page simple |
| Animasi | Campuran — halus saat normal, dramatis di momen kritis |
| Perilaku 00:00 | Tidak berhenti; lanjut minus sampai Pause/Reset manual |

## Arsitektur

### File structure (baru — ganti total isi `src/` lama)

```
src/
  types/timer.ts          — 1 interface TimerState
  lib/timer-store.ts      — store inti + BroadcastChannel sync
  hooks/useTimer.ts       — subscribe store + hitung remaining via rAF
  app/control/page.tsx    — halaman kontrol
  app/timer/page.tsx      — countdown penuh
  app/matador/page.tsx    — tampilan matador
  app/page.tsx            — redirect / pilih tampilan
  app/layout.tsx          — layout dasar (dipertahankan, disesuaikan)
  app/globals.css         — styling + animasi (Tailwind dipertahankan)
```

### State model

```ts
interface TimerState {
  status: 'idle' | 'running' | 'paused' | 'overtime'
  duration: number          // detik
  startedAt: number | null // Date.now() saat start
  pausedRemaining: number | null // sisa detik saat pause
}
```

### Mekanisme sync

- Store simpan state di memori + BroadcastChannel (`matador-timer-sync`).
- Pesan hanya dikirim saat state berubah (klik tombol) — bukan per-detik.
- Setiap layar hitung sendiri: `remaining = duration - (now - startedAt) / 1000` via `requestAnimationFrame`. Semua tab identik karena sumber timestamp sama → nol drift.
- Tab tampilan yang baru dibuka/refresh kirim `REQUEST_STATE`; store control (atau tab mana pun punya state) menjawab `STATE`. Semua instance store menyebar state ke subscriber lokalnya.
- Fallback localStorage tidak diperlukan (BroadcastChannel support universal di browser modern).

### Perilaku tombol

| Aksi | Efek state |
|---|---|
| Set durasi (preset/input) | `idle`, durasi baru, tampilan menampilkan durasi penuh |
| Start (dari idle) | `running`, `startedAt = now` |
| Pause (dari running/overtime) | `paused`, `pausedRemaining` disimpan (angka minus jika overtime) |
| Start (dari paused) | `running`/`overtime` lanjut dari `pausedRemaining` |
| Reset | `idle`, kembali ke durasi penuh |
| Overtime tercapai | status lokal jadi `overtime`, hitungan lanjut minus |

Catatan: transisi `running` → `overtime` dideteksi masing-masing tab dari perhitungan remaining (remaining < 0), tanpa perlu broadcast — status overtime di state adalah turunan lokal. `paused` di overtime: freeze angka minus; resume melanjutkan overtime dari angka minus itu.

## Halaman

### Control (`/control`)

Satu layar, 3 kelompok:

1. **Set durasi** — tombol preset 1/3/5/10/15/30 menit + input custom `MM:SS`
2. **Tombol** — Start/Pause toggle, Reset
3. **Preview kecil** timer + indikator status (idle/running/paused/overtime)

Behavior tambahan:
- Saat overtime: tombol Pause tersedia (freeze angka overtime), Reset tersedia langsung (tanpa pause dulu).

### Timer (`/timer`)

Layar hitam, angka raksasa tengah, format `MM:SS` (jam muncul otomatis jika > 60 menit; millidetik tidak ditampilkan).

Fase animasi (campuran — halus normal, dramatis kritis):
- **Normal:** angka putih besar, transisi detik halus (fade/slide subtle).
- **≤ 10 detik:** scale pop per detik, warna kuning → merah.
- **00:00 (TIME'S UP):** angka utama ganti jadi "TIME'S UP" merah besar + glow merah berdenyut. Di bawahnya layer kecil counter overtime `-00:01`, `-00:02`, ... merah, terus jalan.
- **Pause/idle:** angka saja tanpa efek.

### Matador (`/matador`)

Template presentasi, 3 elemen:

```
┌────────────────────────────────┐
│ COUNTDOWN          05:32       │ ← bar atas: label kiri, timer kanan
│                                │
│         (space kosong          │ ← ruang PPT, placeholder
│          untuk PPT)            │    hitam, tidak ada elemen
│                                │
└────────────────────────────────┘
```

- Bar atas tipis: label "COUNTDOWN" kecil kiri, timer besar kanan.
- Timer ikut semua fase animasi (kuning/merah ≤10 detik, TIME'S UP + overtime counter).
- Space PPT kosong total — tidak ada fitur memasukkan PPT.

### Root (`/`)

Redirect ke `/control` (atau daftar link 3 tampilan).

## Edge Cases

- Tab control ditutup → tampilan tetap jalan (state sudah di masing-masing tab).
- Semua tab ditutup → state hilang, default 5 menit idle. Tidak perlu persist.
- Overtime tidak pernah berhenti sendiri — hanya Pause/Reset manual.
- Pause saat overtime → freeze angka minus; resume lanjut overtime dari angka itu.

## Testing

- Unit test store: set durasi, start, pause, reset, overtime pause/resume, perhitungan remaining (termasuk nilai minus).
- Page test: render dasar control/timer/matador, render "TIME'S UP" + counter overtime saat remaining < 0.
- `npm run lint`, `npm run typecheck`, `npm run test` harus lolos.

## Yang Dihapus

- Supabase (client, sync engine, session registry, room_state)
- Semua komponen admin lama (PIN lock, audio manager, cue panel, dll)
- Audio engine & triggers
- Keyboard shortcuts, rate limiter, universal gateway
- Semua test lama yang target fitur di atas
- `qrcode.react` dependency (tidak dipakai lagi); `@supabase/supabase-js` di-uninstall
