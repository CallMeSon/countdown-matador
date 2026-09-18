'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const { createUploadHandler, pruneUploads } = require('./upload-handler');

const png = () =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);

function makeRes() {
  const res = new EventEmitter();
  const state = { status: 0, body: '' };
  res.state = state;
  res.writeHead = function (status) { state.status = status; return this; };
  res.end = function (body) { state.body = body || ''; };
  return res;
}

function makeReq(method, buf) {
  const req = Readable.from(buf ? [buf] : []);
  req.method = method;
  req.destroyCalled = false;
  req.destroy = () => { req.destroyCalled = true; };
  return req;
}

function run(handler, req) {
  const res = makeRes();
  return new Promise((resolve) => {
    const originalEnd = res.end.bind(res);
    res.end = (body) => { originalEnd(body); res.emit('finish'); resolve(res); };
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

test('413: response flush (finish) mendahului req.destroy', async () => {
  const dir = tmpDir();
  const req = makeReq('POST', png()); // 12 byte > 4
  const res = makeRes();
  let finishEmitted = false;

  await new Promise((resolve) => {
    const originalEnd = res.end.bind(res);
    res.end = (body) => {
      originalEnd(body);
      // finish belum di-emit: destroy harus belum dipanggil saat response di-flush.
      assert.equal(req.destroyCalled, false, 'req.destroy dipanggil sebelum finish');
      finishEmitted = true;
      res.emit('finish');
      resolve();
    };
    createUploadHandler({ dir, maxBytes: 4 })(req, res);
  });

  assert.equal(res.state.status, 413);
  assert.equal(finishEmitted, true);
  assert.equal(req.destroyCalled, true, 'req.destroy tidak dipanggil setelah finish');
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
