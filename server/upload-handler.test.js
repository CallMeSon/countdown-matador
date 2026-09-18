'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { createUploadHandler, pruneUploads, readPositiveNumber } = require('./upload-handler');

const png = () =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);

function makeRes() {
  const res = new EventEmitter();
  const state = { status: 0, body: '', headers: {} };
  res.state = state;
  res.writeHead = function (status, headers) {
    state.status = status;
    Object.assign(state.headers, headers || {});
    return this;
  };
  res.end = function (body) { state.body = body || ''; };
  return res;
}

function makeReq(method, buf) {
  // autoDestroy:false → Node tidak memanggil destroy() sendiri saat stream 'end',
  // sehingga destroy yang teramati hanya berasal dari handler.
  const req = Readable.from(buf ? [buf] : [], { autoDestroy: false });
  req.method = method;
  req.destroyCalled = false;
  req.destroy = () => { req.destroyCalled = true; };
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

test('OPTIONS /upload → 204 dengan header CORS (preflight)', async () => {
  const res = await run(createUploadHandler({ dir: tmpDir() }), makeReq('OPTIONS'));
  assert.equal(res.state.status, 204);
  assert.equal(res.state.headers['Access-Control-Allow-Origin'], '*');
  assert.match(res.state.headers['Access-Control-Allow-Methods'], /POST/);
});

test('respons POST menyertakan header CORS', async () => {
  const res = await run(createUploadHandler({ dir: tmpDir(), makeId: () => 'c' }), makeReq('POST', png()));
  assert.equal(res.state.status, 200);
  assert.equal(res.state.headers['Access-Control-Allow-Origin'], '*');
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

test('413: destroy hanya setelah response finish, bukan saat end', async () => {
  const dir = tmpDir();
  let destroyed = false;

  const handler = createUploadHandler({ dir, maxBytes: 4, makeId: () => 'x' });
  const res = makeRes();
  const req = makeReq('POST', png()); // 12 byte > 4
  req.destroy = () => { destroyed = true; };

  const endCalled = new Promise((resolve) => {
    const originalEnd = res.end.bind(res);
    res.end = (body) => {
      originalEnd(body);
      // Saat respons selesai ditulis, 'finish' belum dipancarkan,
      // jadi destroy BELUM boleh dipanggil (kode lama akan gagal di sini).
      assert.equal(destroyed, false, 'destroy tidak boleh dipanggil sebelum finish');
      resolve();
    };
  });

  handler(req, res);
  await endCalled;

  assert.equal(destroyed, false, 'destroy harus menunggu finish');
  res.emit('finish');
  assert.equal(destroyed, true, 'destroy harus dipanggil setelah finish');
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

test('readPositiveNumber: angka valid lolos, sisanya fallback', () => {
  assert.equal(readPositiveNumber('30', 7), 30);
  assert.equal(readPositiveNumber(1024, 7), 1024);
  assert.equal(readPositiveNumber('0.5', 7), 0.5);
  assert.equal(readPositiveNumber('thirty', 7), 7);
  assert.equal(readPositiveNumber('', 7), 7);
  assert.equal(readPositiveNumber('0', 7), 7);
  assert.equal(readPositiveNumber(-1, 7), 7);
  assert.equal(readPositiveNumber(undefined, 7), 7);
  assert.equal(readPositiveNumber(NaN, 7), 7);
});
