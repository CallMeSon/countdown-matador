# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Operator acara: orang di meja kontrol atau backstage yang menjalankan timer dan mengirim pesan ke panggung saat acara berlangsung. Situasinya terburu-buru dan penuh tekanan, di ruang gelap, memakai laptop atau HP. Pembicara dan penonton hanya melihat layar tampilan, tidak memakai panel kontrol.

## Product Purpose
Timer hitung mundur real-time untuk acara. Satu panel kontrol (`/control`) mengatur beberapa layar tampilan (`/timer` untuk pembicara, `/matador` untuk siaran) yang tersinkron lewat kode room. Sukses berarti operator bisa menjalankan, menyesuaikan, dan menghentikan waktu tanpa ragu atau salah tekan.

## Positioning
Tanpa akun dan tanpa instalasi: cukup buat room, bagikan kode atau link, dan semua layar langsung sinkron. Dilengkapi pesan ke panggung dan layout layar yang bisa diatur.

## Operating Context
Dipakai selama acara live, dengan layar tampilan di monitor atau proyektor lain. Operator bisa mengontrol dari laptop atau HP. Relay WebSocket menyimpan state per room; tab dalam satu browser tetap sinkron lewat BroadcastChannel jika relay mati.

## Capabilities and Constraints
- Mode durasi: timer biasa (preset dan kustom jam:menit:detik), timer ke jam tertentu, dan jam saat ini.
- Start, pause, reset, dan tambah/kurangi waktu saat berjalan; beep hitung mundur.
- Pesan ke panggung, opsional tampil juga di layar TIMER.
- Tampilan layar: background warna atau gambar (upload), font, warna font, dan editor layout drag.
- Tanpa akun atau login; akses lewat kode room.
- Antarmuka berbahasa Indonesia (label START/RESET/PAUSE tetap bahasa Inggris untuk saat ini).
- Harus nyaman dipakai di HP.

## Brand Commitments
Tema gelap tetap (dipakai di ruang gelap atau backstage). Sistem desain visual saat ini bukan komitmen: pemilik berencana menggantinya.

## Product Principles
- Aksi yang dipakai tiap detik (start, pause, reset, ±waktu) harus paling mudah dijangkau dan tidak ambigu.
- Efek tiap tombol terhadap layar lain harus jelas sebelum ditekan.
- Pengaturan yang jarang dipakai tidak boleh menghalangi kontrol utama.
- Aman dipakai di bawah tekanan dan layar kecil.

## Accessibility & Inclusion
Kontras tinggi di ruang gelap, target sentuh minimal 44px, fokus keyboard terlihat, dan tidak mengandalkan warna saja.
