'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeTextStyle } = require('./layout-style');

test('semua field gaya valid keluar utuh', () => {
  const style = { font: 'anton', bold: true, italic: false, align: 'right', color: '#aabbcc', spacing: 12, hidden: true };
  assert.deepEqual(sanitizeTextStyle(style), style);
});

test('color tidak valid dibuang, hex valid jadi huruf kecil', () => {
  assert.deepEqual(sanitizeTextStyle({ color: 'merah' }), {});
  assert.deepEqual(sanitizeTextStyle({ color: '#ABCDEF' }), { color: '#abcdef' });
});

test('spacing di-clamp dan dibulatkan', () => {
  assert.equal(sanitizeTextStyle({ spacing: 999 }).spacing, 40);
  assert.equal(sanitizeTextStyle({ spacing: -99 }).spacing, -10);
  assert.equal(sanitizeTextStyle({ spacing: 3.6 }).spacing, 4);
});

test('font dan align tidak valid dibuang', () => {
  assert.deepEqual(sanitizeTextStyle({ font: 'comic', align: 'justify' }), {});
});

test('blok lama tanpa field tidak mendapat field tambahan', () => {
  assert.deepEqual(sanitizeTextStyle({}), {});
});
