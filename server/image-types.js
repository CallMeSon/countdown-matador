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
