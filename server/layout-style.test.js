'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeTextStyle, normalizePageLayout, normalizeState } = require('./layout-style');

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

test('normalizePageLayout: nilai sampah di-clamp, bukan dikembalikan ke posisi tengah', () => {
  const out = normalizePageLayout({ texts: [{ id: 'abcd1234', text: ' hi ', x: 'abc', y: null, size: 'zzz' }] });
  assert.deepEqual(out.texts, [{ id: 'abcd1234', text: 'hi', x: 0, y: 0, size: 24 }]);
});

test('normalizePageLayout: batas jumlah blok, id salah, dan offsets lama', () => {
  const texts = Array.from({ length: 8 }, (_, i) => ({ id: `abcd123${i}`, text: 't' }));
  texts.push({ id: 'BAD', text: 'x' });
  const out = normalizePageLayout({ offsets: { digit: { x: 1 } }, styles: { digit: { size: 100, bold: true } }, texts });
  assert.equal(out.texts.length, 5);
  assert.deepEqual(out.styles, { digit: { bold: true } });
  assert.equal('offsets' in out, false);
});

test('normalizeState: allowlist field, default untuk nilai buruk, appearance lama dipertahankan', () => {
  const keep = { bgMode: 'color', bgColor: '#112233', bgImage: '', fontFamily: 'anton', bold: true, italic: false, fontColor: '#ffffff' };
  const out = normalizeState({ status: 'hack', duration: NaN, startedAt: 'x', extra: 1 }, keep);
  assert.equal(out.status, 'idle');
  assert.equal(out.duration, 300);
  assert.equal(out.startedAt, null);
  assert.equal('extra' in out, false);
  assert.deepEqual(out.appearance, keep);
  assert.equal(normalizeState({ duration: 1e12 }).duration, 8640000);
  assert.equal(normalizeState({ stageMessage: { text: '   ' } }).stageMessage, null);
});
