# Server Image Upload (background dari device) — countdown-matador

**Date:** 2026-09-18
**Status:** Draft (menunggu review user)
**Base:** branch `feature/appearance` (fitur appearance sudah ada: background warna/gambar, font, warna font)
**Bergantung pada:** `AppearanceConfig` + `bgImage` + `sanitizeImageUrl` + `StageBackground` (fitur appearance)

## Ringkasan

Menambah sumber gambar background baru: operator meng-upload file gambar dari device-nya lewat
halaman `/control`, file disimpan di server, dan background di `/timer` & `/matador` ikut berubah
(mekanisme appearance yang sudah ada — setting di control, tersinkron per-room). Font tidak berubah
di fitur ini.

Karena app adalah static export (tanpa API route), endpoint upload di-host oleh proses Node
`server/ws-server.js` yang sudah melayani WebSocket, dan nginx mem-proxy `/upload` ke proses itu
serta menyajikan `/uploads/` sebagai file statis.

## Keputusan

| Keputusan | Nilai |
|---|---|
| Lokasi UI | `/control`, mode `GAMBAR` (tombol `UPLOAD GAMBAR`) |
| Hasil | background di `/timer` & `/matador` (satu setting, sinkron per-room) |
| Interaksi | satu file → langsung jadi background saat itu |
| Transport | `POST /upload`, body = byte mentah (bukan multipart, tanpa dependensi baru) |
| Validasi tipe | magic bytes: JPEG / PNG / WebP (SVG & GIF ditolak) |
| Batas ukuran | 8 MB (dicek saat streaming; lebih → `413`) |
| Proteksi | terbuka + batas ketat; nama file acak dari server |
| Risiko volume | diterima untuk saat ini — publik tanpa rate limit (lihat catatan di bagian deploy) |
| Storage | `/var/lib/timer-ws/uploads` (env `UPLOAD_DIR`), owner `www-data` |
| Serving | nginx `location /uploads/` alias + `X-Content-Type-Options: nosniff` |
| Cleanup | auto-hapus file >30 hari (env `UPLOAD_MAX_AGE_DAYS`) |
| Kompresi | file dikirim apa adanya (tanpa downscale) |
| Penerapan server | hanya kode + instruksi deploy (user yang jalankan di server) |

## Kontrak endpoint

`POST /upload`

- Body: byte gambar mentah (`Content-Type` diabaikan; tipe ditentukan dari magic bytes).
- `200` → `{"url":"/uploads/<uuid>.<ext>"}` (`ext` = `jpg` | `png` | `webp`).
- `400` → tipe tak dikenal / body kosong `{"error":"unsupported image type"}`.
- `413` → body > `MAX_UPLOAD_BYTES` `{"error":"file too large"}`.
- `405` → method selain `POST` pada `/upload`.
- `404` → path lain.
- Semua respons `Content-Type: application/json`.

Gambar diakses di `/uploads/<file>` (disajikan nginx sebagai static).

## Server

### `server/image-types.js` (baru, CommonJS murni)

```js
'use strict';

const EXT_BY_TYPE = { jpeg: 'jpg', png: 'png', webp: 'webp' };

// JPEG: FF D8 FF
// PNG : 89 50 4E 47 0D 0A 1A 0A
// WebP: "RIFF" .... "WEBP"
function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'png';
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  return null;
}

function extForType(type) {
  return EXT_BY_TYPE[type] || null;
}

module.exports = { EXT_BY_TYPE, detectImageType, extForType };
```

### `server/ws-server.js` (ubah)

- Ganti `new WebSocket.Server({ port: PORT, host: '127.0.0.1' })` menjadi HTTP server:

```js
const http = require('http');
const crypto = require('crypto');
const { detectImageType, extForType } = require('./image-types');

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 8 * 1024 * 1024);
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const UPLOAD_MAX_AGE_MS = Number(process.env.UPLOAD_MAX_AGE_DAYS || 30) * 24 * 60 * 60 * 1000;

function handleUpload(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'method not allowed' }));
    return;
  }
  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (chunk) => {
    if (aborted) return;
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES) {
      aborted = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'file too large' }));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    if (aborted) return;
    const buf = Buffer.concat(chunks);
    const type = detectImageType(buf);
    if (!type) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unsupported image type' }));
      return;
    }
    const name = `${crypto.randomUUID()}.${extForType(type)}`;
    fs.mkdir(UPLOAD_DIR, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'storage unavailable' }));
        return;
      }
      fs.writeFile(path.join(UPLOAD_DIR, name), buf, (writeErr) => {
        if (writeErr) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'write failed' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: `/uploads/${name}` }));
      });
    });
  });
}

const server = http.createServer((req, res) => {
  const url = parseUrl(req.url, true);
  if (url.pathname === '/upload') {
    handleUpload(req, res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

const wss = new WebSocket.Server({ server });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[timer-ws] listening on 127.0.0.1:${PORT}, state: ${STATE_FILE}, uploads: ${UPLOAD_DIR}`);
});
```

- Tambah prune upload lama (saat start + interval harian, pakai `fs.readdir` + `fs.stat`),
  dengan fungsi `pruneUploads()` yang menghapus file `mtime` lebih tua dari `UPLOAD_MAX_AGE_MS`.
- Logika WS (rooms, persist, heartbeat, SIGTERM) tidak berubah; `wss` sekarang memakai `server`.

## Frontend

### `src/lib/upload.ts` (baru)

```ts
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UPLOAD_ENDPOINT = process.env.NEXT_PUBLIC_UPLOAD_URL ?? '/upload';

export async function uploadImage(file: File, endpoint = UPLOAD_ENDPOINT): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    throw new Error('Format harus JPEG, PNG, atau WebP.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran file maksimal 8 MB.');
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    const message =
      res.status === 413 ? 'Ukuran file terlalu besar.'
      : res.status === 400 ? 'File bukan gambar JPEG/PNG/WebP.'
      : 'Upload gagal. Coba lagi.';
    throw new Error(message);
  }
  const data = (await res.json()) as { url?: unknown };
  if (typeof data.url !== 'string' || !data.url) throw new Error('Respons upload tidak valid.');
  return data.url;
}
```

### `sanitizeImageUrl` (ubah di `src/lib/appearance.ts`)

Selain `http(s)` dan `/backgrounds/`, terima juga prefix `/uploads/`:

```ts
const ALLOWED_LOCAL_PREFIXES = ['/backgrounds/', '/uploads/'];
...
if (ALLOWED_LOCAL_PREFIXES.some((p) => url.startsWith(p))) return url;
```

### `/control` (ubah di `src/app/control/page.tsx`)

Di mode `GAMBAR`, di atas/bawah input URL tambahkan tombol `UPLOAD GAMBAR` + hidden
`<input type="file" accept="image/jpeg,image/png,image/webp">`:

- State lokal: `uploading` (bool) dan `uploadError` (string | null).
- Saat file dipilih: set `uploading`, panggil `uploadImage(file)`; sukses →
  `timerStore.setAppearance({ bgMode: 'image', bgImage: url })` dan bersihkan error;
  gagal → tampilkan `uploadError`.
- Tombol disabled + label "MENGUNGGAH…" saat `uploading`; reset `input.value` setelah selesai agar
  file yang sama bisa dipilih ulang.
- Error tampil sebagai teks kecil merah di bawah tombol.

## Perubahan nginx & systemd (instruksi deploy — user yang menjalankan)

`/etc/nginx/sites-available/timer.conf`:

```nginx
server {
    listen 127.0.0.1:8080;
    server_name timer.digioh.id;
    root /var/www/timer;
    index index.html;

    client_max_body_size 8m;

    location /upload {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        alias /var/lib/timer-ws/uploads/;
        add_header X-Content-Type-Options nosniff;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    error_page 404 /404.html;
}
```

`/etc/systemd/system/timer-ws.service` — tambah `Environment`:

```ini
Environment=PORT=8081
Environment=STATE_FILE=/var/lib/timer-ws/state.json
Environment=UPLOAD_DIR=/var/lib/timer-ws/uploads
Environment=UPLOAD_MAX_AGE_DAYS=30
```

Deploy dijalankan **di server `debian-gio`** (build juga di sana, sesuai setup sekarang; source di
`/home/debian-gio/apps/timer-src`, service `WorkingDirectory` menunjuk ke situ — jadi update file
`server/*.js` di folder itu langsung terpakai, tanpa `cp` tambahan):

```bash
# 1. siapkan storage (sekali)
sudo mkdir -p /var/lib/timer-ws/uploads
sudo chown www-data:www-data /var/lib/timer-ws/uploads

# 2. nginx: update /etc/nginx/sites-available/timer.conf sesuai blok di atas
sudo nginx -t && sudo systemctl reload nginx

# 3. systemd: update unit (tambah Environment UPLOAD_DIR/UPLOAD_MAX_AGE_DAYS)
sudo systemctl daemon-reload

# 4. ambil kode terbaru lalu build (di ~/apps/timer-src)
cd /home/debian-gio/apps/timer-src
git fetch && git checkout <branch-upload> && git pull
npm ci
npm run build

# 5. publish frontend + restart relay
sudo rsync -a --delete out/ /var/www/timer/
sudo chown -R www-data:www-data /var/www/timer
sudo chown www-data:www-data /home/debian-gio/apps/timer-src/server/*.js
sudo systemctl restart timer-ws
```

Verifikasi (di server):

```bash
curl -sS -X POST --data-binary @gambar.jpg http://127.0.0.1:8080/upload
curl -sS -I http://127.0.0.1:8080/uploads/<file>
```

### Risiko volume upload (diterima)

`/upload` bersifat publik dan saat ini **tanpa rate limit**; tidak ada yang membatasi laju upload
maupun total byte yang tersimpan. Mitigasi yang ada hanya batas 8 MB/file, whitelist tipe via magic
bytes, nama file acak dari server, dan prune otomatis 30 hari. **Risiko volume / disk exhaustion
diterima** untuk saat ini. Bila nanti perlu dikurangi, tambahkan `limit_req`/`limit_conn` di nginx —
`limit_req_zone` harus didefinisikan di blok `http` nginx.conf, bukan di dalam `server` block, baru
dipakai di `location /upload`.

## Edge cases

- File bukan gambar / ekstensi dipalsukan → magic bytes menolak, `400`.
- > 8 MB → `413`; frontend menampilkan "Ukuran file terlalu besar.".
- Endpoint tak tersedia (mis. `npm run dev` di localhost) → `fetch` gagal, pesan error, state tidak berubah.
- Upload gagal di tengah (storage penuh/izin) → `500`, pesan error.
- File lama di-prune; URL yang masih dirujuk → `<img>` gagal → `StageBackground` jatuh ke `bgColor`.
- Nama file dibuat server (`randomUUID`), jadi tidak ada path traversal / tabrakan.
- `bgImage` tetap melewati `sanitizeImageUrl` di UI, store, dan ingest; `/uploads/` sekarang diizinkan.

## Testing

- **`src/lib/upload.ts`** (`src/__tests__/upload.test.ts`): tolak tipe tak diizinkan & > 8 MB tanpa
  memanggil fetch; sukses → fetch dipanggil dengan method/body/headers benar dan mengembalikan `url`;
  `400/413/500` → throw dengan pesan yang sesuai; respons tanpa `url` → throw.
- **`sanitizeImageUrl`** (tambah di `src/__tests__/appearance.test.ts`): menerima `/uploads/<uuid>.jpg`,
  tetap menerima `/backgrounds/...` & `http(s)`, tetap menolak `javascript:`/`data:`/relatif.
- **`/control`** (`src/__tests__/control-page.test.tsx`): mock `fetch`; pilih file → `uploadImage`
  dipanggil dan `appearance.bgImage` jadi URL hasil; fetch gagal → muncul pesan error dan `bgImage`
  tidak berubah; tombol disabled saat uploading.
- **Server** (`server/image-types.test.js`, runner `node --test`): `detectImageType` untuk buffer
  JPEG/PNG/WebP valid + buffer acak/terlalu pendek → `null`; `extForType`.
- `npm run lint`, `npm run typecheck`, `npm test` harus lolos.

## Di luar cakupan (YAGNI)

- Crop/fit/posisi gambar (tetap `object-cover`).
- Library multi-gambar / hapus file dari UI.
- Downscale/kompresi di browser atau server.
- Auth/token untuk endpoint upload.
- Dukungan GIF/SVG.
- Namespace upload per-room (semua upload di satu folder; URL acak global).

## Catatan dependency

Fitur ini dibangun di atas `feature/appearance`. Implementasi dilanjutkan di branch yang sama
(appearance belum di-merge ke `origin/master`).
