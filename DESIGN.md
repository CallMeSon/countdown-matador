# Design

Sumber: file Pencil `DigiOH Design System` (`/home/econ/Downloads/untitled/untitled.pen`), tema `brand: melius` (tema aktif). Deskripsi aslinya: pita ink dan canvas, satu aksen oranye, display serif tipis, UI grotesque yang tenang. Aplikasi mendukung mode terang dan gelap; gelap tetap cocok untuk ruang gelap.

## Warna

Tema: `melius` dari file Pencil (tema aktif yang tampil di desain). Nilai ada di `src/styles/tokens.css` sebagai tiga angka RGB; Tailwind memakai nama semantik. Mode terang dan gelap lewat `data-theme` di `<html>` (switch ikon di nav, default mengikuti sistem, pilihan disimpan di `localStorage`).

| Token Tailwind | Terang | Gelap | Dipakai untuk |
|---|---|---|---|
| `page` | `#E3E3E3` | `#0E0E0E` | Latar halaman |
| `card` | `#FFFFFF` | `#0E0E0E` | Kartu (di gelap hanya garis tipis) |
| `input` | `#FFFFFF` | `#1A1616` | Isi input, select, textarea |
| `control` | `#FAFAFA` | `#1A1616` | Isi tombol ghost |
| `fg` | `#0E0E0E` | `#FAFAFA` | Teks utama |
| `sub` | `#676767` | `#9C9996` | Teks sekunder dan label |
| `line` | hitam 8% | putih 8% | Garis tipis |
| `well` | `#D9D9D9` | `#100E0D` | Area kanvas editor |
| `nav` | `#1A1616` | `#1A1616` | Nav bar (selalu gelap) |
| `accent` / `accent-hover` | `#F04E23` / `#D9420F` | sama | Aksi utama, fokus, seleksi |
| `highlight` | `#FFF78B` | sama | PAUSE, chip room, pesan aktif |
| `on-accent` | `#FAFAFA` | sama | Teks di atas aksen |
| `danger` | `#E5484D` | sama | Error, hapus |

Catatan kontras: `on-accent` (`#FAFAFA`) di atas `accent` (`#F04E23`) sekitar 3.6:1, cukup untuk teks tombol 17px berat 500 tetapi bukan untuk teks kecil. Merah overtime di stage tetap `red-*` Tailwind karena bagian dari tayangan.

## Tipografi

- **Display:** Fraunces, berat ringan (300). Judul halaman, angka besar yang bukan timer. Hero 70/-0.7, Section 56/-0.5, Card 34/-0.3 (letter-spacing dalam px).
- **UI:** Geist. Lead 23.75, Body 17, caption 12.5. Tombol 17 dengan berat 500.
- **Label:** Jost, huruf besar, 13px, letter-spacing sekitar 1.5px. Judul section di panel, status, chip.
- **Timer stage:** tetap Anton (default) atau font pilihan operator (Bebas Neue, Oswald, Teko, Archivo Black, Orbitron, Roboto Mono). Itu bagian dari pengaturan tampilan, bukan UI kontrol.

## Bentuk dan jarak

- Radius: kartu 30, media 12, kontrol 7.5, chip 3, pil penuh. Di Tailwind: `rounded-card`, `rounded-media`, `rounded-control`, `rounded-chip`, `rounded-full`.
- Jarak: 10, 20, 35, 50, 80 (`space-1` sampai `space-5`).
- Garis tipis 1px menggantikan bayangan untuk memisahkan area.

## Komponen (dari file Pencil)

- **Button Accent:** tinggi 44, isi `accent`, teks `on-accent`, radius kontrol.
- **Button Light / Dark / Highlight:** isi `canvas` + garis, `ink`, atau `highlight`.
- **Button Link:** teks dengan garis bawah.
- **Chip Neutral / Accent:** radius 3, label Jost 12.5.
- **Segmented:** pil `ink-warm` dengan segmen aktif `canvas`.
- **Switch:** 56×28, knob `accent`.
- **Nav Bar:** tinggi 56, `ink-warm`, radius kontrol, merek tebal di kiri.
- **Input Field (terang):** lebar 300, tinggi 44, isi `surface`, garis `line-light` 1px, radius kontrol, padding horizontal 14, teks 15 Geist, placeholder `faint`. Varian: Filled (teks `ink`), Focus (garis `accent` 2px), Error (garis dan pesan `danger` 2px), Disabled (opasitas 0.5, isi `field`).
- **Input Field Dark:** sama, tetapi isi `ink-warm`, garis `line-dark`, teks `canvas`. Ini yang dipakai di panel kontrol. Varian Filled, Focus, Error, Disabled sama.
- **Field Group:** label Jost 13 huruf besar `faint`, kontrol 44, teks bantuan 12.5 `faint`, jarak 8.
- **Textarea:** seperti Input Field Dark, tinggi 96, padding 14.
- **Select:** seperti Input Field Dark dengan chevron `▾` di kanan.
- **Checkbox / Checkbox Checked:** kotak 20, radius chip; aktif berisi `accent` dengan centang `on-accent`.
- **FAQ Row / Service Card:** baris dengan garis `line-dark`, kartu radius 30 dengan garis tipis.

## Animasi

Hanya umpan balik (tekan, hover, fokus, buka/tutup), lewat `src/styles/motion.css`: transform, opacity, dan warna saja; ease-out `cubic-bezier(0.22,1,0.36,1)`, tekan 140ms, hover 180ms, UI 240ms. Tidak ada animasi masuk halaman atau loop tak berujung. `prefers-reduced-motion` menghilangkan perpindahan dan skala tetapi mempertahankan perubahan warna dan opacity. Animasi stage tampilan (`anim-*` di `globals.css`) terpisah dan tidak diubah.

## Penerapan di aplikasi

- Header `/control` memakai pola Nav Bar: nama halaman (Fraunces), chip status (Jost), kode room dengan tombol salin.
- Label section memakai gaya Label (Jost, huruf besar, `faint`).
- Aksi utama `accent`; pause dan pesan aktif `highlight`; overtime merah.
- Panel sekunder (tampilan, layout) memakai `ink-warm` dan garis `line-dark`, dilipat secara default.
- Fokus keyboard: outline `accent` 2px.
- Input, select, dan textarea di panel kontrol memakai Input Field Dark; fokus mengganti garis jadi `accent`.

## Catatan

- Nilai tema lain (`digioh`, `core`, `midnight`, `orange`, `slate`) ada di file Pencil, tapi tidak dipakai. Untuk ganti tema, ubah nilai di `src/styles/tokens.css`.
- Teks tombol utama masih huruf besar (START, RESET, PAUSE) karena tes memakai nama itu. Sistem desain sebenarnya memakai kapitalisasi kalimat.
