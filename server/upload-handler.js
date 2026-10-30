'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { detectImageType, extForType } = require('./image-types');

const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_DIR_BYTES = 512 * 1024 * 1024;
const MAX_CONCURRENT_UPLOADS = 4;

// Endpoint ini tanpa autentikasi/kredensial, jadi origin boleh dibuka.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

/**
 * Handler HTTP untuk POST /upload. Body = byte gambar mentah; tipe dari magic
 * bytes (header Content-Type diabaikan). Nama file dibuat server.
 */
function createUploadHandler(options) {
  const dir = options.dir;
  const maxBytes = options.maxBytes || DEFAULT_MAX_UPLOAD_BYTES;
  const maxDirBytes = options.maxDirBytes || DEFAULT_MAX_DIR_BYTES;
  const maxConcurrent = options.maxConcurrent || MAX_CONCURRENT_UPLOADS;
  const makeId = options.makeId || (() => crypto.randomUUID());
  let active = 0;

  return function handleUpload(req, res) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'method not allowed' });
      return;
    }

    // Tolak lebih awal dari header sebelum ada byte yang dibaca/ditampung.
    const declared = Number(req.headers && req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      res.on('finish', () => req.destroy());
      sendJson(res, 413, { error: 'file too large' });
      return;
    }
    if (active >= maxConcurrent) {
      res.on('finish', () => req.destroy());
      sendJson(res, 429, { error: 'busy' });
      return;
    }
    active += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active -= 1;
    };
    res.on('close', release);

    const chunks = [];
    let size = 0;
    let done = false;

    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        done = true;
        res.on('finish', () => req.destroy());
        sendJson(res, 413, { error: 'file too large' });
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
        dirSize(dir).then((used) => {
          if (used + buf.length > maxDirBytes) {
            sendJson(res, 507, { error: 'storage full' });
            return;
          }
          writeFile();
        });
      });

      function writeFile() {
        fs.writeFile(path.join(dir, name), buf, (writeErr) => {
          if (writeErr) {
            sendJson(res, 500, { error: 'write failed' });
            return;
          }
          sendJson(res, 200, { url: `/uploads/${name}` });
        });
      }
    });
  };
}

/** Total ukuran file biasa di `dir` (tidak rekursif). Folder tak terbaca dihitung 0. */
async function dirSize(dir) {
  let total = 0;
  try {
    for (const name of await fs.promises.readdir(dir)) {
      try {
        const stat = await fs.promises.stat(path.join(dir, name));
        if (stat.isFile()) total += stat.size;
      } catch {
        // file hilang saat dihitung — lewati
      }
    }
  } catch {
    return 0;
  }
  return total;
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

/** Angka positif dari env/opsi; fallback kalau bukan angka finite > 0. */
function readPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

module.exports = {
  createUploadHandler,
  pruneUploads,
  readPositiveNumber,
  DEFAULT_MAX_UPLOAD_BYTES,
  DEFAULT_MAX_AGE_MS,
};
