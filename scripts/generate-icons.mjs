/**
 * PWA 用アイコンを生成する（依存パッケージなし）。
 * "ascolto"（＝聞く）にちなんで、音が広がるマークを描く。
 *
 *   npm run icons
 */

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'icons',
);

const BG = [14, 17, 22]; // --bg
const FG = [109, 179, 255]; // --accent

// ------------------------------------------------------------- PNG 書き出し

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixelAt) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // フィルタなし
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- 図形

/**
 * 音が広がるマーク。点と、右に開く3本の弧。
 * @param {number} size 画像サイズ
 * @param {number} scale マーク全体の大きさ（maskable では小さくする）
 * @returns {(x:number, y:number) => number} 0〜1 の被覆率
 */
function makeGlyph(size, scale) {
  const cx = size * (0.5 - 0.16 * scale);
  const cy = size * 0.5;
  const unit = size * scale;

  const dotR = unit * 0.085;
  const arcs = [0.2, 0.31, 0.42];
  const half = unit * 0.032; // 弧の太さの半分
  const spread = 0.95; // 弧の開き（ラジアン）

  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist <= dotR) return 1;

    const angle = Math.atan2(dy, dx);
    if (Math.abs(angle) > spread) return 0;

    for (const ratio of arcs) {
      if (Math.abs(dist - unit * ratio) <= half) return 1;
    }
    return 0;
  };
}

function render(size, scale) {
  const glyph = makeGlyph(size, scale);
  const SS = 3; // 3x3 スーパーサンプリングで縁をなめらかにする

  return (x, y) => {
    let hits = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        hits += glyph(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
      }
    }
    const a = hits / (SS * SS);
    return [
      Math.round(BG[0] + (FG[0] - BG[0]) * a),
      Math.round(BG[1] + (FG[1] - BG[1]) * a),
      Math.round(BG[2] + (FG[2] - BG[2]) * a),
    ];
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  // maskable は外周が切り取られるので、安全領域（中央80%）に収める
  ['icon-maskable-512.png', 512, 0.72],
];

for (const [name, size, scale] of targets) {
  fs.writeFileSync(path.join(OUT_DIR, name), encodePng(size, render(size, scale)));
  console.log(`generated ${name} (${size}x${size})`);
}
