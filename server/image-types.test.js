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
