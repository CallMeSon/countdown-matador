# Server Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operator bisa upload file gambar dari device lewat `/control`; file disimpan di server dan jadi background di `/timer` & `/matador`.

**Architecture:** Proses `server/ws-server.js` yang sudah melayani WebSocket diubah jadi HTTP server yang juga menangani `POST /upload` (body byte mentah, validasi magic bytes). Frontend (static export) mengirim `fetch('/upload')` same-origin dan menyimpan URL hasilnya ke `appearance.bgImage`. nginx mem-proxy `/upload` ke proses itu dan menyajikan `/uploads/` sebagai static.

**Tech Stack:** Node 20 (`http`, `crypto`, `fs`; tanpa dependensi baru), Next.js 14 static export, TypeScript, Vitest (frontend), `node --test` (server), nginx + systemd.

## Global Constraints

- App static export — **tidak boleh** menambah Next API route; endpoint di-host proses Node yang ada.
- **Tanpa dependensi npm baru.** File server tetap CommonJS murni (tanpa TS/import).
- Upload = body byte mentah (bukan multipart). Tipe ditentukan **magic bytes**; JPEG/PNG/WebP saja.
- Batas 8 MB; nama file dari `crypto.randomUUID()` (tanpa input user di path).
- `bgImage` tetap melewati `sanitizeImageUrl`; prefix `/uploads/` diizinkan (selain `http(s)` & `/backgrounds/`).
- Frontend test tetap via Vitest **hanya untuk `src/**`**; test server via `node --test server`.
- Default tampilan/font tidak berubah.
- Perubahan nginx/systemd **tidak** diterapkan oleh agent — hanya kode + instruksi (sudah ada di spec).
- Implementasi dilanjutkan di branch `feature/appearance` (fitur appearance belum di-merge).

---

### Task 1: Helper tipe gambar + batasi Vitest ke `src/`

**Files:**
- Modify: `vitest.config.mjs`
- Modify: `package.json`
- Create: `server/image-types.js`
- Test: `server/image-types.test.js`

**Interfaces:**
- Consumes: —
- Produces: `detectImageType(buf: Buffer): 'jpeg' | 'png' | 'webp' | null`, `extForType(type): 'jpg' | 'png' | 'webp' | null`, `EXT_BY_TYPE`. Semua CommonJS.

- [ ] **Step 1: Write the failing test**

Create `server/image-types.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EXT_BY_TYPE, detectImageType, extForType } = require('./image-types');

const jpeg = () =>
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const png = () =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
const webp = () => {
  const buf = Buffer.alloc(16);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(12, 4);
  buf.write('WEBP', 8, 'ascii');
  return buf;
};

test('detectImageType: JPEG/PNG/WebP valid', () => {
  assert.equal(detectImageType(jpeg()), 'jpeg');
  assert.equal(detectImageType(png()), 'png');
  assert.equal(detectImageType(webp()), 'webp');
});

test('detectImageType: buffer asing / terlalu pendek / kosong → null', () => {
  assert.equal(detectImageType(Buffer.from('hello world!')), null);
  assert.equal(detectImageType(Buffer.alloc(4)), null);
  assert.equal(detectImageType(Buffer.alloc(0)), null);
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff])), null); // <12 byte
});

test('extForType', () => {
  assert.equal(extForType('jpeg'), 'jpg');
  assert.equal(extForType('png'), 'png');
  assert.equal(extForType('webp'), 'webp');
  assert.equal(extForType('gif'), null);
  assert.deepEqual(EXT_BY_TYPE, { jpeg: 'jpg', png: 'png', webp: 'webp' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test server/image-types.test.js`
Expected: FAIL — `Cannot find module './image-types'`.

- [ ] **Step 3: Implement the helper**

Create `server/image-types.js`:

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
  ) {
    return 'png';
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
}

function extForType(type) {
  return EXT_BY_TYPE[type] || null;
}

module.exports = { EXT_BY_TYPE, detectImageType, extForType };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test server/image-types.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Restrict Vitest to `src/` and add a server test script**

Di `vitest.config.mjs`, di dalam `test: { ... }` tambahkan `include` (Vitest default akan ikut memungut `server/*.test.js` yang memakai `node:test`):

```js
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
```

Di `package.json`, tambahkan script (setelah `"test:watch"`):

```json
    "test:server": "node --test server",
```

- [ ] **Step 6: Verify existing frontend suite unaffected**

Run: `npm test`
Expected: PASS — 9 files / 128 tests (sama seperti sebelumnya; `server/` tidak ikut).

Run: `npm run test:server`
Expected: PASS (3 tests, image-types).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.mjs package.json server/image-types.js server/image-types.test.js
git commit -m "feat: add image type detection helper and server test runner"
```

---

### Task 2: Handler upload + prune

**Files:**
- Create: `server/upload-handler.js`
- Test: `server/upload-handler.test.js`

**Interfaces:**
- Consumes: `detectImageType`, `extForType` dari Task 1.
- Produces:
  - `createUploadHandler(options: { dir: string; maxBytes?: number; makeId?: () => string }): (req, res) => void`
  - `pruneUploads(options: { dir: string; maxAgeMs?: number; now?: number }): Promise<number>`
  - `DEFAULT_MAX_UPLOAD_BYTES`, `DEFAULT_MAX_AGE_MS`

- [ ] **Step 1: Write the failing test**

Create `server/upload-handler.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('node:stream');
const { createUploadHandler, pruneUploads } = require('./upload-handler');

const png = () =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);

function makeRes() {
  const state = { status: 0, body: '' };
  return {
    state,
    writeHead(status) { state.status = status; return this; },
    end(body) { state.body = body || ''; },
  };
}

function makeReq(method, buf) {
  const req = Readable.from(buf ? [buf] : []);
  req.method = method;
  req.destroy = () => {};
  return req;
}

function run(handler, req) {
  const res = makeRes();
  return new Promise((resolve) => {
    const originalEnd = res.end.bind(res);
    res.end = (body) => { originalEnd(body); resolve(res); };
    handler(req, res);
  });
}

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'upload-test-'));

test('menolak method selain POST', async () => {
  const res = await run(createUploadHandler({ dir: tmpDir() }), makeReq('GET'));
  assert.equal(res.state.status, 405);
});

test('menolak file yang bukan gambar', async () => {
  const res = await run(createUploadHandler({ dir: tmpDir() }), makeReq('POST', Buffer.from('not an image')));
  assert.equal(res.state.status, 400);
  assert.equal(JSON.parse(res.state.body).error, 'unsupported image type');
});

test('menyimpan PNG valid dan mengembalikan url', async () => {
  const dir = tmpDir();
  const res = await run(createUploadHandler({ dir, makeId: () => 'fixedid' }), makeReq('POST', png()));
  assert.equal(res.state.status, 200);
  assert.deepEqual(JSON.parse(res.state.body), { url: '/uploads/fixedid.png' });
  assert.ok(fs.existsSync(path.join(dir, 'fixedid.png')));
});

test('menolak file melebihi maxBytes', async () => {
  const res = await run(
    createUploadHandler({ dir: tmpDir(), maxBytes: 4 }),
    makeReq('POST', png()), // 12 byte > 4
  );
  assert.equal(res.state.status, 413);
});

test('pruneUploads menghapus file lebih tua dari maxAgeMs', async () => {
  const dir = tmpDir();
  const oldFile = path.join(dir, 'old.png');
  const newFile = path.join(dir, 'new.png');
  fs.writeFileSync(oldFile, png());
  fs.writeFileSync(newFile, png());
  const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  fs.utimesSync(oldFile, old, old);

  const removed = await pruneUploads({ dir, maxAgeMs: 30 * 24 * 60 * 60 * 1000 });
  assert.equal(removed, 1);
  assert.equal(fs.existsSync(oldFile), false);
  assert.equal(fs.existsSync(newFile), true);
});

test('pruneUploads pada folder yang belum ada → 0', async () => {
  assert.equal(await pruneUploads({ dir: path.join(tmpDir(), 'nope') }), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test server/upload-handler.test.js`
Expected: FAIL — `Cannot find module './upload-handler'`.

- [ ] **Step 3: Implement the handler**

Create `server/upload-handler.js`:

```js
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { detectImageType, extForType } = require('./image-types');

const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Handler HTTP untuk POST /upload. Body = byte gambar mentah; tipe dari magic
 * bytes (header Content-Type diabaikan). Nama file dibuat server.
 */
function createUploadHandler(options) {
  const dir = options.dir;
  const maxBytes = options.maxBytes || DEFAULT_MAX_UPLOAD_BYTES;
  const makeId = options.makeId || (() => crypto.randomUUID());

  return function handleUpload(req, res) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'method not allowed' });
      return;
    }

    const chunks = [];
    let size = 0;
    let done = false;

    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        done = true;
        sendJson(res, 413, { error: 'file too large' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('error', () => {
      if (done) return;
      done = true;
      sendJson(res, 400, { error: 'upload failed' });
    });

    req.on('end', () => {
      if (done) return;
      done = true;
      const buf = Buffer.concat(chunks);
      const type = detectImageType(buf);
      if (!type) {
        sendJson(res, 400, { error: 'unsupported image type' });
        return;
      }
      const name = `${makeId()}.${extForType(type)}`;
      fs.mkdir(dir, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          sendJson(res, 500, { error: 'storage unavailable' });
          return;
        }
        fs.writeFile(path.join(dir, name), buf, (writeErr) => {
          if (writeErr) {
            sendJson(res, 500, { error: 'write failed' });
            return;
          }
          sendJson(res, 200, { url: `/uploads/${name}` });
        });
      });
    });
  };
}

/** Hapus file di `dir` yang mtime-nya lebih tua dari `maxAgeMs`. Kembalikan jumlah terhapus. */
async function pruneUploads(options) {
  const dir = options.dir;
  const maxAgeMs = options.maxAgeMs || DEFAULT_MAX_AGE_MS;
  const now = options.now || Date.now();

  let entries;
  try {
    entries = await fs.promises.readdir(dir);
  } catch {
    return 0;
  }

  let removed = 0;
  for (const name of entries) {
    const filePath = path.join(dir, name);
    try {
      const stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) continue;
      if (now - stat.mtimeMs > maxAgeMs) {
        await fs.promises.unlink(filePath);
        removed += 1;
      }
    } catch {
      // file hilang / tidak bisa diakses — lewati
    }
  }
  return removed;
}

module.exports = {
  createUploadHandler,
  pruneUploads,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_MAX_AGE_MS,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test server/upload-handler.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/upload-handler.js server/upload-handler.test.js
git commit -m "feat: add upload handler and old-upload pruning"
```

---

### Task 3: Integrasi ke `server/ws-server.js`

**Files:**
- Modify: `server/ws-server.js`
- Test: `server/ws-server.integration.test.js`

**Interfaces:**
- Consumes: `createUploadHandler`, `pruneUploads` dari Task 2.
- Produces: server HTTP+WS pada `127.0.0.1:$PORT` yang melayani `POST /upload`; log startup memuat `listening on 127.0.0.1:<port-aktual>`.

- [ ] **Step 1: Write the failing test**

Create `server/ws-server.integration.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('node:child_process');

const REPO_ROOT = path.join(__dirname, '..');

function startServer() {
  const stateFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ws-state-')), 'state.json');
  const uploadDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ws-upload-')), 'uploads');
  const child = spawn(process.execPath, ['server/ws-server.js'], {
    cwd: REPO_ROOT,
    env: { ...process.env, PORT: '0', STATE_FILE: stateFile, UPLOAD_DIR: uploadDir },
  });

  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`server tidak start: ${output}`)), 10000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = output.match(/listening on 127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve({ child, port: Number(match[1]), uploadDir });
      }
    });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server keluar lebih awal (${code}): ${output}`));
    });
  });
}

const png = () =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);

test('POST /upload menyimpan gambar dan mengembalikan url', async () => {
  const { child, port, uploadDir } = await startServer();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/upload`, { method: 'POST', body: png() });
    assert.equal(res.status, 200);
    const { url } = await res.json();
    assert.match(url, /^\/uploads\/[0-9a-f-]+\.png$/);
    assert.ok(fs.existsSync(path.join(uploadDir, url.replace('/uploads/', ''))));
  } finally {
    child.kill();
  }
});

test('GET /upload → 405 dan path lain → 404', async () => {
  const { child, port } = await startServer();
  try {
    const notAllowed = await fetch(`http://127.0.0.1:${port}/upload`, { method: 'GET' });
    assert.equal(notAllowed.status, 405);
    const notFound = await fetch(`http://127.0.0.1:${port}/nope`);
    assert.equal(notFound.status, 404);
  } finally {
    child.kill();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test server/ws-server.integration.test.js`
Expected: FAIL — server tidak melayani `/upload` (kemungkinan `404`/`405`; test `POST /upload` gagal di `assert.equal(res.status, 200)`).

- [ ] **Step 3: Implement http server + route + prune**

Di `server/ws-server.js`, tambahkan require di bagian atas (setelah `const WebSocket = require('ws');`):

```js
const http = require('http');
const { createUploadHandler, pruneUploads } = require('./upload-handler');
```

Tambahkan konstanta setelah `const PRUNE_MS = ...`:

```js
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const UPLOAD_MAX_AGE_MS = Number(process.env.UPLOAD_MAX_AGE_DAYS || 30) * 24 * 60 * 60 * 1000;
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 8 * 1024 * 1024);
```

Ganti blok:

```js
const wss = new WebSocket.Server({ port: PORT, host: '127.0.0.1' });
console.log(`[timer-ws] listening on 127.0.0.1:${PORT}, state file: ${STATE_FILE}, rooms loaded: ${rooms.size}`);
```

menjadi:

```js
const handleUpload = createUploadHandler({ dir: UPLOAD_DIR, maxBytes: MAX_UPLOAD_BYTES });

const server = http.createServer((req, res) => {
  if (parseUrl(req.url, true).pathname === '/upload') {
    handleUpload(req, res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

const wss = new WebSocket.Server({ server });

server.listen(PORT, '127.0.0.1', () => {
  const address = server.address();
  const actualPort = address && typeof address === 'object' ? address.port : PORT;
  console.log(
    `[timer-ws] listening on 127.0.0.1:${actualPort}, state file: ${STATE_FILE}, uploads: ${UPLOAD_DIR}, rooms loaded: ${rooms.size}`,
  );
});

const pruneTimer = setInterval(() => {
  pruneUploads({ dir: UPLOAD_DIR, maxAgeMs: UPLOAD_MAX_AGE_MS })
    .then((removed) => {
      if (removed > 0) console.log(`[timer-ws] pruned ${removed} old upload(s)`);
    })
    .catch((err) => console.error('[timer-ws] prune failed:', err.message));
}, 24 * 60 * 60 * 1000);
pruneTimer.unref();

pruneUploads({ dir: UPLOAD_DIR, maxAgeMs: UPLOAD_MAX_AGE_MS }).catch(() => {});
```

Di handler `SIGTERM` yang sudah ada, tambahkan `clearInterval(pruneTimer);` tepat setelah `clearInterval(heartbeat);`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test server/ws-server.integration.test.js`
Expected: PASS (2 tests).

Run: `node --check server/ws-server.js`
Expected: tidak ada error.

- [ ] **Step 5: Run whole server suite**

Run: `npm run test:server`
Expected: PASS (image-types 3 + upload-handler 6 + integration 2 = 11 tests).

- [ ] **Step 6: Commit**

```bash
git add server/ws-server.js server/ws-server.integration.test.js
git commit -m "feat: serve POST /upload from the ws relay process"
```

---

### Task 4: `uploadImage` di frontend + izinkan URL `/uploads/`

**Files:**
- Create: `src/lib/upload.ts`
- Modify: `src/lib/appearance.ts`
- Test: `src/__tests__/upload.test.ts`
- Test: `src/__tests__/appearance.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `MAX_UPLOAD_BYTES: number`, `ALLOWED_UPLOAD_TYPES`, `UPLOAD_ENDPOINT: string`
  - `uploadImage(file: File, endpoint?: string): Promise<string>`
  - `sanitizeImageUrl` sekarang juga menerima prefix `/uploads/`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/upload.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_UPLOAD_BYTES, uploadImage } from '@/lib/upload';

const file = (type: string, size: number) => ({ type, size } as unknown as File);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('uploadImage', () => {
  it('menolak tipe yang tidak diizinkan tanpa memanggil fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadImage(file('image/gif', 10))).rejects.toThrow(/JPEG, PNG, atau WebP/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menolak file lebih dari 8 MB tanpa memanggil fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(uploadImage(file('image/png', MAX_UPLOAD_BYTES + 1))).rejects.toThrow(/maksimal 8 MB/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POST file dan mengembalikan url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: '/uploads/abc.png' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const f = file('image/png', 1024);

    await expect(uploadImage(f, '/upload')).resolves.toBe('/uploads/abc.png');
    expect(fetchMock).toHaveBeenCalledWith('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: f,
    });
  });

  it('413 / 400 / 500 → pesan error yang sesuai', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/terlalu besar/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/bukan gambar/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/Upload gagal/);
  });

  it('respons tanpa url → error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
    await expect(uploadImage(file('image/png', 10))).rejects.toThrow(/tidak valid/);
  });
});
```

Di `src/__tests__/appearance.test.ts`, tambahkan di dalam `describe('sanitizeImageUrl', ...)`:

```ts
  it('menerima path upload /uploads/', () => {
    expect(sanitizeImageUrl('/uploads/0f9a.png')).toBe('/uploads/0f9a.png');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/upload.test.ts src/__tests__/appearance.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/upload"`, dan test `/uploads/` gagal (ditolak jadi `''`).

- [ ] **Step 3: Create `src/lib/upload.ts`**

```ts
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UPLOAD_ENDPOINT = process.env.NEXT_PUBLIC_UPLOAD_URL ?? '/upload';

export async function uploadImage(file: File, endpoint: string = UPLOAD_ENDPOINT): Promise<string> {
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
      res.status === 413
        ? 'Ukuran file terlalu besar.'
        : res.status === 400
          ? 'File bukan gambar JPEG/PNG/WebP.'
          : 'Upload gagal. Coba lagi.';
    throw new Error(message);
  }

  const data = (await res.json()) as { url?: unknown };
  if (typeof data.url !== 'string' || !data.url) {
    throw new Error('Respons upload tidak valid.');
  }
  return data.url;
}
```

- [ ] **Step 4: Izinkan prefix `/uploads/` di `sanitizeImageUrl`**

Di `src/lib/appearance.ts`, ganti blok prefix galeri:

```ts
const GALLERY_PREFIX = '/backgrounds/';
const MAX_IMAGE_URL_LENGTH = 2048;
```

menjadi:

```ts
const ALLOWED_LOCAL_PREFIXES = ['/backgrounds/', '/uploads/'];
const MAX_IMAGE_URL_LENGTH = 2048;
```

Lalu di dalam `sanitizeImageUrl`, ganti:

```ts
  if (url.startsWith(GALLERY_PREFIX)) return url;
```

menjadi:

```ts
  if (ALLOWED_LOCAL_PREFIXES.some((prefix) => url.startsWith(prefix))) return url;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/upload.test.ts src/__tests__/appearance.test.ts`
Expected: PASS.

- [ ] **Step 6: Full frontend checks**

Run: `npm test`, `npm run lint`, `npm run typecheck`
Expected: semua PASS, output bersih.

- [ ] **Step 7: Commit**

```bash
git add src/lib/upload.ts src/lib/appearance.ts src/__tests__/upload.test.ts src/__tests__/appearance.test.ts
git commit -m "feat: add uploadImage client and allow /uploads/ background URLs"
```

---

### Task 5: Tombol upload di `/control`

**Files:**
- Modify: `src/app/control/page.tsx`
- Test: `src/__tests__/control-page.test.tsx`

**Interfaces:**
- Consumes: `uploadImage` (Task 4), `timerStore.setAppearance` (fitur appearance).
- Produces: tombol `UPLOAD GAMBAR` + `<input type="file" aria-label="Upload gambar">` di mode GAMBAR.

- [ ] **Step 1: Write the failing tests**

Di `src/__tests__/control-page.test.tsx`, ubah import RTL di baris pertama menjadi:

```ts
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
```

Di dalam `describe('tampilan', ...)` (sebelum penutupnya), tambahkan:

```tsx
    it('upload gambar sukses: bgImage jadi URL hasil upload', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ url: '/uploads/from-upload.png' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));

      const input = screen.getByLabelText('Upload gambar') as HTMLInputElement;
      const file = new File([new Uint8Array([1, 2, 3])], 'bg.png', { type: 'image/png' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);

      await waitFor(() =>
        expect(store.timerStore.getState().appearance.bgImage).toBe('/uploads/from-upload.png'),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        '/upload',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('upload gagal: pesan error tampil, bgImage tidak berubah', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
      );

      render(<ControlPage />);
      fireEvent.click(screen.getByRole('button', { name: 'GAMBAR' }));
      const before = store.timerStore.getState().appearance.bgImage;

      const input = screen.getByLabelText('Upload gambar') as HTMLInputElement;
      const file = new File([new Uint8Array([1, 2, 3])], 'bg.png', { type: 'image/png' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      fireEvent.change(input);

      expect(await screen.findByText(/Upload gagal/)).toBeTruthy();
      expect(store.timerStore.getState().appearance.bgImage).toBe(before);
    });
```

Tambahkan `afterEach` di scope luar `describe('ControlPage')` (mis. tepat setelah `beforeEach`):

```tsx
  afterEach(() => {
    vi.unstubAllGlobals();
  });
```

Dan tambahkan `afterEach` ke import vitest di baris 2, sehingga menjadi:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: Upload gambar`.

- [ ] **Step 3: Implement the upload control**

Di `src/app/control/page.tsx`, tambahkan import:

```tsx
import { uploadImage } from '@/lib/upload';
```

Di dalam `ControlBody`, tambahkan state upload setelah blok state `imageUrl`/`useEffect`:

```tsx
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      timerStore.setAppearance({ bgMode: 'image', bgImage: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload gagal.');
    } finally {
      setUploading(false);
    }
  };
```

Di dalam cabang mode `GAMBAR` (blok `appearance.bgMode === 'color' ? (...) : (...)`), tambahkan tombol upload di atas input URL:

```tsx
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl border border-emerald-700 bg-emerald-900/20 px-4 py-3 font-semibold tracking-widest text-emerald-400 transition-transform active:scale-95 hover:bg-emerald-900/40 disabled:opacity-40 disabled:active:scale-100"
              >
                {uploading ? 'MENGUNGGAH…' : 'UPLOAD GAMBAR'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Upload gambar"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
```

Di dalam `ControlBody`, tambahkan ref setelah state upload:

```tsx
  const fileInputRef = useRef<HTMLInputElement>(null);
```

Ubah import React di baris 3 dari:

```tsx
import { useEffect, useState } from 'react';
```

menjadi:

```tsx
import { useEffect, useRef, useState } from 'react';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/control-page.test.tsx`
Expected: PASS (termasuk test lama).

- [ ] **Step 5: Full verification**

Run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:server`
Expected: semua PASS, output bersih.

- [ ] **Step 6: Commit**

```bash
git add src/app/control/page.tsx src/__tests__/control-page.test.tsx
git commit -m "feat: add image upload button to control page"
```

---

## Verifikasi akhir (setelah semua task)

- [ ] `npm test` PASS (frontend, 9+ files)
- [ ] `npm run test:server` PASS (11 server tests)
- [ ] `npm run lint` PASS
- [ ] `npm run typecheck` PASS
- [ ] Smoke test manual (di server, setelah deploy): `curl -sS -X POST --data-binary @gambar.png http://127.0.0.1:8080/upload` → `{"url":"/uploads/...png"}`, lalu `curl -I` URL-nya → `200`.
- [ ] Risiko volume upload publik tanpa rate limit **diterima** (mitigasi: 8 MB/file, whitelist tipe, nama acak, prune 30 hari); dapat dikurangi via `limit_req`/`limit_conn` nginx bila perlu.

## Catatan urutan & dependency

- Task 1 → Task 2 → Task 3 (server berurutan).
- Task 4 → Task 5 (frontend berurutan).
- Task 1 (perubahan `vitest.config.mjs`) harus sebelum Task 4/5 supaya `npm test` tidak memungut test server.
- Deploy nginx/systemd memakai instruksi di spec `docs/superpowers/specs/2026-09-18-server-image-upload-design.md` (dijalankan user, bukan agent).
