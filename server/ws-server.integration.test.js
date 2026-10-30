'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');

const REPO_ROOT = path.join(__dirname, '..');

function startServer(extraEnv = {}) {
  const stateFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ws-state-')), 'state.json');
  const uploadDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ws-upload-')), 'uploads');
  const child = spawn(process.execPath, ['server/ws-server.js'], {
    cwd: REPO_ROOT,
    env: { ...process.env, PORT: '0', STATE_FILE: stateFile, UPLOAD_DIR: uploadDir, ...extraEnv },
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

test('OPTIONS /upload → 204 dengan header CORS', async () => {
  const { child, port } = await startServer();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/upload`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://app.example.com', 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  } finally {
    child.kill();
  }
});

test('POST cross-origin mengembalikan header CORS', async () => {
  const { child, port } = await startServer();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/upload`, {
      method: 'POST',
      headers: { Origin: 'https://app.example.com' },
      body: png(),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  } finally {
    child.kill();
  }
});

test('STATE layout bertahan per-room dan diterima newcomer', async () => {
  const { child, port } = await startServer();
  try {
    const ws1 = new WebSocket(`ws://127.0.0.1:${port}/ws?room=LAYOUT`);
    await new Promise((res) => ws1.once('open', res));
    const first = await new Promise((res) => ws1.once('message', (d) => res(JSON.parse(d.toString()))));
    assert.equal(first.type, 'STATE');
    assert.deepEqual(first.state.layoutTimer, { styles: {}, texts: [] });
    const layout = {
      styles: { digit: { color: '#ff0000', size: 120, hidden: true } },
      texts: [{ id: 'abcd1234', text: 'SESI 1', x: 960, y: 200, size: 64 }],
    };
    ws1.send(JSON.stringify({ type: 'STATE', state: { ...first.state, layoutTimer: layout } }));
    await new Promise((r) => setTimeout(r, 300));
    const ws2 = new WebSocket(`ws://127.0.0.1:${port}/ws?room=LAYOUT`);
    const second = await new Promise((res) => ws2.once('message', (d) => res(JSON.parse(d.toString()))));
    assert.deepEqual(second.state.layoutTimer, layout);
    ws1.close();
    ws2.close();
  } finally {
    child.kill();
  }
});

const connect = (port, room) =>
  new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${room}`);
    const closed = new Promise((r) => ws.once('close', (code) => r(code)));
    ws.once('open', () => resolve({ ws, closed }));
    ws.once('error', () => resolve({ ws, closed, failed: true }));
  });

test('pesan di atas 64 KiB memutus koneksi (1009)', async () => {
  const { child, port } = await startServer();
  try {
    const { ws, closed } = await connect(port, 'BIG');
    ws.send(JSON.stringify({ type: 'STATE', state: { status: 'idle', junk: 'x'.repeat(70 * 1024) } }));
    assert.equal(await closed, 1009);
  } finally {
    child.kill();
  }
});

test('room id tidak valid ditolak (1008)', async () => {
  const { child, port } = await startServer();
  try {
    for (const bad of ['a'.repeat(33), 'a%20b', 'a.b']) {
      const { closed } = await connect(port, bad);
      assert.equal(await closed, 1008, bad);
    }
  } finally {
    child.kill();
  }
});

test('room baru di atas MAX_ROOMS ditolak (1013), room lama tetap bisa', async () => {
  const { child, port } = await startServer({ MAX_ROOMS: '1' });
  try {
    const a = await connect(port, 'AAAAA');
    const b = await connect(port, 'BBBBB');
    assert.equal(await b.closed, 1013);
    const again = await connect(port, 'AAAAA');
    assert.equal(again.failed, undefined);
    a.ws.close();
    again.ws.close();
  } finally {
    child.kill();
  }
});

test('STATE disaring: field asing dibuang, tipe salah diganti default, pesan panggung dipotong', async () => {
  const { child, port } = await startServer();
  try {
    const a = await connect(port, 'SANITIZE');
    const b = await connect(port, 'SANITIZE');
    const received = new Promise((res) =>
      b.ws.on('message', (d) => {
        const m = JSON.parse(d.toString());
        if (m.state && m.state.status === 'running') res(m.state);
      }),
    );
    a.ws.send(JSON.stringify({
      type: 'STATE',
      state: {
        status: 'running', duration: 'abc', evil: { big: 1 }, displayMode: 'x',
        stageMessage: { text: 'y'.repeat(1000), sentAt: 1, showOnTimer: 'ya' },
        appearance: { bgColor: 'merah', bgImage: 'javascript:alert(1)' },
      },
    }));
    const state = await received;
    assert.equal('evil' in state, false);
    assert.equal(state.duration, 300);
    assert.equal(state.displayMode, 'timer');
    assert.equal(state.stageMessage.text.length, 255);
    assert.equal(state.stageMessage.showOnTimer, false);
    assert.equal(state.appearance.bgColor, '#000000');
    assert.equal(state.appearance.bgImage, '');
    a.ws.close();
    b.ws.close();
  } finally {
    child.kill();
  }
});
