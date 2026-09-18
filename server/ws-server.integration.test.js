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
