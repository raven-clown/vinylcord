// Draws a simple flat icon (red rounded square, white play triangle)
// straight to a PNG file with no image-processing dependencies.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const OUT = path.join(__dirname, '..', 'assets', 'icon.png');

const RED = [237, 66, 69, 255]; // Discord "red" (#ED4245)
const TRANSPARENT = [0, 0, 0, 0];
const WHITE = [255, 255, 255, 255];

function inRoundedSquare(x, y) {
  const r = SIZE * 0.22; // corner radius
  const cx = Math.min(Math.max(x, r), SIZE - r);
  const cy = Math.min(Math.max(y, r), SIZE - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inTriangle(x, y) {
  // Equilateral-ish play triangle, pointing right, centered with a slight offset.
  const cx = SIZE * 0.46;
  const cy = SIZE * 0.5;
  const s = SIZE * 0.32;
  const ax = cx - s * 0.5, ay = cy - s * 0.6;
  const bx = cx - s * 0.5, by = cy + s * 0.6;
  const cxp = cx + s * 0.7, cyp = cy;

  const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(x, y, ax, ay, bx, by);
  const d2 = sign(x, y, bx, by, cxp, cyp);
  const d3 = sign(x, y, cxp, cyp, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function pixelAt(x, y) {
  if (!inRoundedSquare(x, y)) return TRANSPARENT;
  if (inTriangle(x, y)) return WHITE;
  return RED;
}

function buildRawImage() {
  const stride = SIZE * 4 + 1;
  const raw = Buffer.alloc(stride * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const px = rowStart + 1 + x * 4;
      raw[px] = r; raw[px + 1] = g; raw[px + 2] = b; raw[px + 3] = a;
    }
  }
  return raw;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function buildPng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(SIZE, 0);
  ihdrData.writeUInt32BE(SIZE, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const idatData = zlib.deflateSync(buildRawImage());

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buildPng());
console.log('Wrote', OUT);
