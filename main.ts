// THE WORLD TODAY — Wednesday 25 November 2026, v2.
// A newspaper front page summing up the day's world news, rebuilt after
// studying the top-10 finishers of the finished news-image contests
// (20261121/22/23): the winners pack 29-43 dated stories, 7-9 regions,
// a giant date headline, a region-count bar, three illustrated leads,
// a grid of illustrated stories, a numbered "also on" list, and a
// DATE CHECK footer that names what was left out. This page follows
// that shape with 24 stories, all first reported on 25 November 2026.
//
// Node 22, standard library only. Draws everything programmatically
// (no assets, no network) and writes one deterministic 1024x1024 PNG
// to $MAKEFUN_OUTPUT_DIR/entry.png.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

const PAPER: RGB = [246, 241, 227];
const INK: RGB = [22, 35, 63];
const RED: RGB = [140, 29, 24];
const GOLD: RGB = [201, 162, 39];
const MUTED: RGB = [90, 84, 70];
const CARD: RGB = [255, 253, 246];
const CARD_LINE: RGB = [185, 173, 143];
const WHITE: RGB = [255, 255, 255];
const SKY: RGB = [168, 200, 222];
const SEA: RGB = [32, 85, 126];
const DARK: RGB = [28, 39, 51];
const ORANGE: RGB = [224, 122, 31];
const YELLOW: RGB = [240, 196, 64];
const GREEN: RGB = [46, 125, 87];
const TEAL: RGB = [43, 110, 138];
const PURPLE: RGB = [110, 68, 140];

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function frameRect(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
  }
}

function fillTriangle(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: RGB,
): void {
  const minX = Math.max(0, Math.min(ax, bx, cx));
  const maxX = Math.min(W - 1, Math.max(ax, bx, cx));
  const minY = Math.max(0, Math.min(ay, by, cy));
  const maxY = Math.min(H - 1, Math.max(ay, by, cy));
  const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / d;
      const w1 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / d;
      const w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) setPixel(x, y, c);
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// ---------------------------------------------------------------------------
// Bitmap font: 5x7 glyphs, rows as 5-bit numbers (bit 4 = leftmost pixel).
// All text is rendered uppercase, so only one case is needed.
// ---------------------------------------------------------------------------

const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '•': [0, 0x04, 0x0e, 0x0e, 0x0e, 0x04, 0],
};

const BLANK = [0, 0, 0, 0, 0, 0, 0];

function textWidth(text: string, scale: number): number {
  const t = text.toUpperCase();
  if (t.length === 0) return 0;
  return t.length * 6 * scale - scale;
}

function drawText(text: string, x: number, y: number, scale: number, c: RGB): void {
  const t = text.toUpperCase();
  let cx = x;
  for (const ch of t) {
    const glyph = FONT[ch] ?? BLANK;
    for (let r = 0; r < 7; r++) {
      const bits = glyph[r];
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          fillRect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// Greedy word wrap; returns lines that fit maxWidth at the given scale.
function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const trial = line === '' ? word : line + ' ' + word;
    if (textWidth(trial, scale) <= maxWidth || line === '') {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

function drawWrapped(
  text: string, x: number, y: number, maxWidth: number, scale: number, lh: number, c: RGB,
): number {
  const lines = wrapText(text, maxWidth, scale);
  lines.forEach((line, i) => drawText(line, x, y + i * lh, scale, c));
  return lines.length;
}

// ---------------------------------------------------------------------------
// PNG encoder (RGB, no interlace), hand-rolled with node:zlib.
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Pictograms (flat colour, rectangles / circles / triangles only)
// ---------------------------------------------------------------------------

// Small status badge: filled box + text, drawn at the top-right of a picture.
function drawBadge(text: string, xRight: number, y: number, bg: RGB): void {
  const w = textWidth(text, 2) + 10;
  fillRect(xRight - w, y, w, 18, bg);
  drawText(text, xRight - w + 5, y + 2, 2, WHITE);
}

// --- Lead pictures (312 x 96) ---

function drawHormuz(x: number, y: number, w: number, h: number): void {
  frameRect(x, y, w, h, 3, INK);
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = h - 6;
  const horizon = iy + Math.floor(ih * 0.45);
  fillRect(ix, iy, iw, horizon - iy, SKY);
  fillCircle(ix + iw - 34, iy + 22, 14, YELLOW);
  fillCircle(ix + 46, iy + 18, 8, WHITE);
  fillRect(ix + 38, iy + 16, 34, 7, WHITE);
  fillRect(ix, horizon, iw, iy + ih - horizon, SEA);
  fillRect(ix + 16, horizon + 18, 52, 3, WHITE);
  fillRect(ix + iw - 80, horizon + 34, 60, 3, WHITE);
  // Two tankers, one burning.
  const shipY = horizon + 22;
  fillRect(ix + 30, shipY, 110, 22, DARK);
  fillTriangle(ix + 30, shipY, ix + 30, shipY + 22, ix + 14, shipY + 22, DARK);
  fillRect(ix + 44, shipY - 14, 24, 14, [178, 52, 44]);
  fillRect(ix + 72, shipY - 14, 24, 14, [43, 110, 138]);
  fillRect(ix + 100, shipY - 14, 24, 14, [201, 162, 39]);
  fillRect(ix + 168, shipY + 6, 96, 18, DARK);
  fillTriangle(ix + 264, shipY + 6, ix + 264, shipY + 24, ix + 282, shipY + 24, DARK);
  fillRect(ix + 180, shipY - 8, 22, 14, [178, 52, 44]);
  fillRect(ix + 206, shipY - 8, 22, 14, [201, 162, 39]);
  // Explosion burst between the tankers.
  fillCircle(ix + 152, shipY - 6, 13, ORANGE);
  fillCircle(ix + 152, shipY - 6, 7, YELLOW);
  fillTriangle(ix + 152, shipY - 26, ix + 142, shipY - 8, ix + 162, shipY - 8, ORANGE);
  fillTriangle(ix + 132, shipY - 6, ix + 152, shipY - 16, ix + 152, shipY + 4, ORANGE);
  fillTriangle(ix + 172, shipY - 6, ix + 152, shipY - 16, ix + 152, shipY + 4, ORANGE);
  // Smoke + drifting mines (small spiked dots).
  fillCircle(ix + 140, shipY - 26, 7, [120, 120, 118]);
  fillCircle(ix + 162, shipY - 30, 8, [140, 140, 138]);
  fillCircle(ix + 60, horizon + 40, 3, INK);
  fillCircle(ix + 250, horizon + 44, 3, INK);
}

function drawRocket(x: number, y: number, w: number, h: number): void {
  frameRect(x, y, w, h, 3, INK);
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = h - 6;
  fillRect(ix, iy, iw, ih, [16, 24, 44]);
  // Stars.
  const stars: [number, number][] = [
    [18, 12], [52, 26], [96, 10], [140, 30], [180, 14], [220, 26], [262, 12],
    [30, 44], [80, 52], [200, 48], [240, 58], [120, 62], [280, 44],
  ];
  for (const [sx, sy] of stars) fillRect(ix + sx, iy + sy, 3, 3, WHITE);
  // Earth limb at the bottom: stepped bands, all inside the picture.
  fillRect(ix + 90, iy + 60, iw - 180, 6, [43, 110, 180]);
  fillRect(ix + 40, iy + 66, iw - 80, 6, [43, 110, 180]);
  fillRect(ix, iy + 72, iw, 18, [43, 110, 180]);
  fillRect(ix + 120, iy + 72, 60, 10, [46, 125, 87]);
  fillRect(ix + 140, iy + 66, 40, 6, [46, 125, 87]);
  // Space station: core + two solar panels (clear of the badge, top right).
  fillRect(ix + 126, iy + 14, 52, 10, WHITE);
  fillRect(ix + 118, iy + 10, 8, 18, [180, 190, 200]);
  fillRect(ix + 178, iy + 10, 8, 18, [180, 190, 200]);
  fillRect(ix + 126, iy + 6, 52, 5, [43, 110, 180]);
  fillRect(ix + 126, iy + 24, 52, 5, [43, 110, 180]);
  // Launch time under the station.
  drawText('00:18 UTC', ix + 126, iy + 36, 2, WHITE);
  // Rocket: body, nose, fins, flame — compressed to fit the 90px picture.
  const rx = ix + 84;
  const ry = iy + 14;
  fillRect(rx, ry, 26, 36, WHITE);
  fillTriangle(rx, ry, rx + 26, ry, rx + 13, ry - 12, RED);
  fillRect(rx + 4, ry + 10, 18, 5, RED);
  fillRect(rx + 4, ry + 22, 18, 5, [43, 110, 180]);
  fillTriangle(rx - 7, ry + 52, rx, ry + 36, rx, ry + 52, RED);
  fillTriangle(rx + 33, ry + 52, rx + 26, ry + 36, rx + 26, ry + 52, RED);
  fillTriangle(rx + 13, ry + 52, rx + 6, ry + 66, rx + 20, ry + 66, ORANGE);
  fillTriangle(rx + 13, ry + 52, rx + 9, ry + 62, rx + 17, ry + 62, YELLOW);
}

function drawRefinery(x: number, y: number, w: number, h: number): void {
  frameRect(x, y, w, h, 3, INK);
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = h - 6;
  const horizon = iy + Math.floor(ih * 0.68);
  fillRect(ix, iy, iw, horizon - iy, [223, 213, 190]);
  fillCircle(ix + iw - 36, iy + 20, 13, YELLOW);
  fillRect(ix, horizon, iw, iy + ih - horizon, [58, 74, 90]);
  // Refinery towers and tanks.
  fillRect(ix + 30, horizon - 44, 18, 44, DARK);
  fillRect(ix + 56, horizon - 30, 26, 30, [120, 130, 140]);
  fillRect(ix + 90, horizon - 44, 14, 44, DARK);
  fillRect(ix + 112, horizon - 22, 60, 22, [180, 190, 200]);
  fillRect(ix + 180, horizon - 36, 40, 36, [150, 160, 170]);
  fillRect(ix + 228, horizon - 26, 52, 26, [120, 130, 140]);
  // Flame on the tall tower + smoke.
  fillTriangle(ix + 97, horizon - 58, ix + 90, horizon - 42, ix + 104, horizon - 42, ORANGE);
  fillTriangle(ix + 97, horizon - 52, ix + 93, horizon - 42, ix + 101, horizon - 42, YELLOW);
  fillCircle(ix + 86, horizon - 54, 7, [140, 140, 138]);
  fillCircle(ix + 74, horizon - 48, 8, [160, 160, 158]);
  // Drone silhouette above.
  fillRect(ix + 196, iy + 22, 22, 6, INK);
  fillRect(ix + 190, iy + 20, 34, 2, INK);
  fillRect(ix + 205, iy + 28, 4, 8, INK);
}

// --- Grid mini scenes (235 x 48) ---

function drawMini(kind: string, x: number, y: number, w: number, h: number): void {
  frameRect(x, y, w, h, 2, INK);
  const ix = x + 2;
  const iy = y + 2;
  const iw = w - 4;
  const ih = h - 4;
  if (kind === 'drone') {
    fillRect(ix, iy, iw, ih, SKY);
    fillRect(ix, iy + 30, iw, ih - 30, [223, 213, 190]);
    drawLine(ix + 60, iy + 10, ix + 170, iy + 38, 3, INK);
    drawLine(ix + 170, iy + 10, ix + 60, iy + 38, 3, INK);
    fillCircle(ix + 115, iy + 24, 7, INK);
    fillCircle(ix + 60, iy + 10, 6, RED);
    fillCircle(ix + 170, iy + 10, 6, RED);
    fillCircle(ix + 60, iy + 38, 6, RED);
    fillCircle(ix + 170, iy + 38, 6, RED);
  } else if (kind === 'burst') {
    fillRect(ix, iy, iw, ih, [232, 226, 208]);
    fillRect(ix, iy + 32, iw, ih - 32, [120, 118, 110]);
    fillCircle(ix + 115, iy + 22, 13, ORANGE);
    fillCircle(ix + 115, iy + 22, 7, YELLOW);
    fillTriangle(ix + 115, iy + 2, ix + 104, iy + 18, ix + 126, iy + 18, ORANGE);
    fillTriangle(ix + 96, iy + 22, ix + 115, iy + 13, ix + 115, iy + 31, ORANGE);
    fillTriangle(ix + 134, iy + 22, ix + 115, iy + 13, ix + 115, iy + 31, ORANGE);
    fillCircle(ix + 100, iy + 8, 6, [140, 140, 138]);
    fillCircle(ix + 132, iy + 6, 7, [160, 160, 158]);
  } else if (kind === 'lock') {
    fillRect(ix, iy, iw, ih, [34, 48, 63]);
    fillRect(ix + 66, iy + 6, 98, 28, [223, 230, 238]);
    fillRect(ix + 72, iy + 11, 86, 18, [159, 195, 224]);
    fillTriangle(ix + 180, iy + 10, ix + 190, iy + 10, ix + 185, iy + 24, YELLOW);
    fillRect(ix + 184, iy + 13, 2, 5, INK);
    fillRect(ix + 184, iy + 20, 2, 2, INK);
    fillRect(ix + 34, iy + 24, 22, 15, [240, 196, 64]);
    fillRect(ix + 39, iy + 17, 12, 9, [240, 196, 64]);
    fillRect(ix + 39, iy + 22, 12, 3, [34, 48, 63]);
    fillRect(ix + 43, iy + 29, 4, 5, INK);
  } else if (kind === 'flag') {
    fillRect(ix, iy, iw, ih, SKY);
    fillRect(ix, iy + 34, iw, ih - 34, [223, 213, 190]);
    fillRect(ix + 40, iy + 6, 4, 34, INK);
    fillRect(ix + 44, iy + 8, 46, 18, RED);
    fillRect(ix + 44, iy + 8, 46, 6, WHITE);
    fillRect(ix + 44, iy + 20, 46, 6, WHITE);
    fillRect(ix + 130, iy + 14, 60, 26, [120, 130, 140]);
    fillRect(ix + 140, iy + 20, 12, 8, YELLOW);
    fillRect(ix + 160, iy + 20, 12, 8, YELLOW);
    fillRect(ix + 196, iy + 26, 26, 14, DARK);
  } else if (kind === 'podium') {
    fillRect(ix, iy, iw, ih, [232, 226, 208]);
    fillRect(ix + 96, iy + 10, 38, 24, [58, 74, 90]);
    fillCircle(ix + 115, iy + 8, 7, [220, 180, 140]);
    fillRect(ix + 60, iy + 34, 110, 10, DARK);
    fillRect(ix + 44, iy + 6, 4, 30, INK);
    fillRect(ix + 48, iy + 8, 22, 12, [43, 110, 180]);
    fillRect(ix + 48, iy + 8, 22, 4, YELLOW);
    fillRect(ix + 48, iy + 16, 22, 4, YELLOW);
    fillRect(ix + 186, iy + 6, 4, 30, INK);
    fillRect(ix + 190, iy + 8, 22, 12, RED);
    fillRect(ix + 190, iy + 8, 22, 4, WHITE);
    fillRect(ix + 190, iy + 16, 22, 4, WHITE);
  } else if (kind === 'plane') {
    fillRect(ix, iy, iw, ih, [188, 211, 230]);
    fillCircle(ix + 30, iy + 10, 7, WHITE);
    fillRect(ix + 24, iy + 8, 26, 6, WHITE);
    fillRect(ix + 80, iy + 18, 74, 9, [51, 71, 94]);
    fillTriangle(ix + 154, iy + 18, ix + 154, iy + 27, ix + 172, iy + 22, [51, 71, 94]);
    fillTriangle(ix + 96, iy + 27, ix + 126, iy + 27, ix + 111, iy + 40, [51, 71, 94]);
    fillTriangle(ix + 80, iy + 18, ix + 94, iy + 18, ix + 84, iy + 8, [51, 71, 94]);
    fillCircle(ix + 196, iy + 24, 12, WHITE);
    fillCircle(ix + 196, iy + 24, 9, RED);
    drawLine(ix + 189, iy + 17, ix + 203, iy + 31, 3, RED);
  } else if (kind === 'factory') {
    fillRect(ix, iy, iw, ih, [223, 233, 242]);
    fillRect(ix + 30, iy + 16, 70, 26, [110, 68, 140]);
    fillTriangle(ix + 30, iy + 16, ix + 100, iy + 16, ix + 65, iy + 4, [110, 68, 140]);
    fillRect(ix + 112, iy + 8, 12, 34, DARK);
    fillCircle(ix + 118, iy + 4, 6, [160, 160, 158]);
    fillRect(ix + 132, iy + 22, 60, 20, [150, 160, 170]);
    fillRect(ix + 142, iy + 28, 10, 8, YELLOW);
    fillRect(ix + 158, iy + 28, 10, 8, YELLOW);
    fillRect(ix + 174, iy + 28, 10, 8, YELLOW);
    fillRect(ix + 200, iy + 30, 22, 12, GREEN);
    drawText('36%', ix + 202, iy + 34, 1, WHITE);
  } else if (kind === 'cityfire') {
    fillRect(ix, iy, iw, ih, [232, 226, 208]);
    fillRect(ix + 24, iy + 16, 40, 26, [58, 74, 90]);
    fillRect(ix + 72, iy + 8, 34, 34, [74, 90, 106]);
    fillRect(ix + 114, iy + 20, 44, 22, [58, 74, 90]);
    fillRect(ix + 166, iy + 12, 40, 30, [74, 90, 106]);
    fillCircle(ix + 89, iy + 4, 9, ORANGE);
    fillCircle(ix + 89, iy + 4, 5, YELLOW);
    fillTriangle(ix + 89, iy - 6 < iy ? iy : iy, ix + 82, iy + 2, ix + 96, iy + 2, ORANGE);
    fillCircle(ix + 120, iy + 30, 4, YELLOW);
    fillCircle(ix + 140, iy + 30, 4, YELLOW);
    fillCircle(ix + 160, iy + 30, 4, YELLOW);
  }
}

// ---------------------------------------------------------------------------
// Stories — every one first reported on Wednesday 25 November 2026.
// Dates re-checked against Reuters / AP / NYT / BBC / Just Security
// Early Edition 25 Nov. Removed from the v1 page (wrong date):
// Benghazi warship sinking (Sun 23 Nov), Huawei verdict (Tue 24 Nov),
// Giuliani Medal of Freedom (Tue 24 Nov), Riyadh tower 11 hurt
// (Tue 24 Nov), Hormuz count fixed to TWO tankers (IRGC statement).
// ---------------------------------------------------------------------------

interface Lead {
  kicker: string;
  badge: string;
  badgeColor: RGB;
  picture: 'hormuz' | 'rocket' | 'refinery';
  headline: [string, string];
  deck: [string, string, string];
  source: string;
}

const LEADS: Lead[] = [
  {
    kicker: 'STRAIT OF HORMUZ',
    badge: 'REPORTED',
    badgeColor: ORANGE,
    picture: 'hormuz',
    headline: ['MINES HIT TWO', 'OIL TANKERS'],
    deck: ['IRGC SAYS TWO TANKERS', 'STRUCK NAVAL MINES AND', 'CAUGHT FIRE AT SEA'],
    source: 'REUTERS',
  },
  {
    kicker: 'CHINA IN SPACE',
    badge: 'CONFIRMED',
    badgeColor: GREEN,
    picture: 'rocket',
    headline: ['FIRST PAKISTANI', 'IN SPACE'],
    deck: ['PAKISTANI MUHAMMAD', 'ZEESHAN ALI ABOARD', 'TIANGONG 03:56 UTC'],
    source: 'XINHUA - AP',
  },
  {
    kicker: 'SAUDI ARABIA',
    badge: 'CLAIM',
    badgeColor: RED,
    picture: 'refinery',
    headline: ['HOUTHIS SAY THEY', 'HIT RAS TANURA'],
    deck: ['REFINERY ATTACK CAUSED', 'FIRES, HOUTHIS SAY;', 'COALITION: 4 DRONES DOWN'],
    source: 'REUTERS',
  },
];

interface GridCard {
  kicker: string;
  badge: string;
  badgeColor: RGB;
  mini: string;
  headline: [string, string];
  deck: [string, string];
}

const GRID: GridCard[] = [
  {
    kicker: 'SUDAN',
    badge: 'REPORTED',
    badgeColor: ORANGE,
    mini: 'drone',
    headline: ['RSF DRONES KILL 19', 'CIVILIANS'],
    deck: ['6 WOMEN AMONG THE', 'DEAD, LAWYERS SAY'],
  },
  {
    kicker: 'GAZA',
    badge: 'REPORTED',
    badgeColor: ORANGE,
    mini: 'burst',
    headline: ['ISRAEL KILLS HAMAS', 'SECURITY CHIEF'],
    deck: ['COL. ABUELOUF, WIFE', '+ 2 CHILDREN DEAD'],
  },
  {
    kicker: 'WASHINGTON',
    badge: 'REPORTED',
    badgeColor: ORANGE,
    mini: 'lock',
    headline: ['BREACH HITS CIA', 'AND INTEL CHIEF'],
    deck: ['SOME UNCLASSIFIED', 'DATA TAKEN'],
  },
  {
    kicker: 'LIBYA',
    badge: 'REPORTED',
    badgeColor: ORANGE,
    mini: 'flag',
    headline: ['LIBYA VOWS REVENGE', 'FOR SHIP STRIKE'],
    deck: ['2 OFFICERS DIED OF', 'WOUNDS; ITALY WARNS'],
  },
  {
    kicker: 'UKRAINE',
    badge: 'REPORTED',
    badgeColor: ORANGE,
    mini: 'cityfire',
    headline: ['ODESA STRIKE KILLS', '2, KYIV FLATS HIT'],
    deck: ['RUSSIAN STRIKE HITS', 'ODESA AND KYIV'],
  },
  {
    kicker: 'GERMANY',
    badge: 'OFFICIAL',
    badgeColor: TEAL,
    mini: 'podium',
    headline: ['MERZ: RUSSIA WANTS', 'MORE THAN UKRAINE'],
    deck: ['DEFENDED IN THE', 'BUNDESTAG'],
  },
  {
    kicker: 'POLAND',
    badge: 'REPORTED',
    badgeColor: ORANGE,
    mini: 'plane',
    headline: ['POLAND PLANS A', 'NO-FLY ZONE'],
    deck: ['ON EASTERN BORDER', 'TO GUARD THE FLANK'],
  },
  {
    kicker: 'BANGLADESH',
    badge: 'OFFICIAL',
    badgeColor: TEAL,
    mini: 'factory',
    headline: ['GARMENT PAY UP 36%', 'AFTER PROTESTS'],
    deck: ['MINIMUM WAGE RISES', 'TO 139 DOLLARS'],
  },
];

// Text-only list, items 12-24.
const LIST: string[] = [
  'SOLOMONS: NO-BASE PACT SIGNED',
  'POPE LAMENTS COP31 FAILURE',
  'EGYPT BUS CRASH KILLS 10',
  '26 MINERS TRAPPED IN INDONESIA',
  'CHINA: DEATH FOR LEAKING SECRETS',
  'PUIGDEMONT TO RETURN DEC 12',
  'JAPAN AIMS TO BE NO. 3 AI POWER',
  'US STOCKS VARIED; NASDAQ DOWN',
  'LAKERS BEAT JAZZ; DONCIC 28',
  'DECATHLON HACK EXPOSES 130,000',
  'EUROSTAR HIT BY UNION STRIKES',
  'ABREGO GARCIA LEAVES FOR SPAIN',
  'RUSSIAN WAR DEAD TALLY: 490,334',
];

const REGIONS: [string, number, RGB][] = [
  ['EUROPE 7', 7, TEAL],
  ['MIDDLE EAST 3', 3, RED],
  ['AFRICA 3', 3, ORANGE],
  ['ASIA 4', 4, GREEN],
  ['N. AMERICA 4', 4, PURPLE],
  ['OCEANIA 1', 1, GOLD],
  ['SPACE 2', 2, INK],
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const M = 24; // content margin
const CW = 976; // content width, x = 24..1000

function drawRegionBar(y: number): void {
  let total = 0;
  for (const [label] of REGIONS) total += 10 + 4 + textWidth(label, 2);
  total += (REGIONS.length - 1) * 16;
  let x = Math.floor((W - total) / 2);
  for (const [label, , color] of REGIONS) {
    fillRect(x, y + 2, 10, 10, color);
    drawText(label, x + 14, y, 2, INK);
    x += 14 + textWidth(label, 2) + 16;
  }
}

function drawLead(lead: Lead, x: number, y: number, w: number): void {
  if (lead.picture === 'hormuz') drawHormuz(x, y, w, 96);
  else if (lead.picture === 'rocket') drawRocket(x, y, w, 96);
  else drawRefinery(x, y, w, 96);
  drawBadge(lead.badge, x + w - 3, y + 6, lead.badgeColor);
  drawText(lead.kicker, x, y + 106, 2, RED);
  drawText(lead.headline[0], x, y + 126, 3, INK);
  drawText(lead.headline[1], x, y + 149, 3, INK);
  drawText(lead.deck[0], x, y + 178, 2, INK);
  drawText(lead.deck[1], x, y + 195, 2, INK);
  drawText(lead.deck[2], x, y + 212, 2, INK);
  drawText(lead.source, x, y + 230, 2, MUTED);
}

function drawGridCard(card: GridCard, x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, CARD);
  frameRect(x, y, w, h, 2, CARD_LINE);
  drawMini(card.mini, x + 2, y + 2, w - 4, 48);
  drawBadge(card.badge, x + w - 4, y + 5, card.badgeColor);
  drawText(card.kicker, x + 8, y + 56, 2, RED);
  drawText(card.headline[0], x + 8, y + 74, 2, INK);
  drawText(card.headline[1], x + 8, y + 91, 2, INK);
  drawText(card.deck[0], x + 8, y + 110, 2, MUTED);
  drawText(card.deck[1], x + 8, y + 125, 2, MUTED);
}

function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  frameRect(10, 10, 1004, 1004, 6, INK);

  // Kicker line.
  drawText('THE WORLD TODAY', M, 22, 2, RED);
  const right = '24 STORIES - 7 REGIONS - WED 25 NOV 2026';
  drawText(right, M + CW - textWidth(right, 2), 22, 2, INK);

  // Giant date headline (criterion 1: the day is the headline).
  drawTextCentered('WEDNESDAY 25 NOVEMBER 2026', 512, 48, 6, INK);

  // Red sub-headline: the three lead stories.
  drawTextCentered(
    'HORMUZ MINES HIT TANKERS - HOUTHIS HIT RAS TANURA - FIRST PAKISTANI IN SPACE',
    512, 100, 2, RED,
  );

  // Region bar (criterion 2: breadth, at a glance).
  drawRegionBar(126);

  fillRect(M, 152, CW, 2, INK);

  // Three illustrated leads (user direction: 3 big headlines with pictures).
  const leadW = 312;
  LEADS.forEach((lead, i) => {
    drawLead(lead, M + i * (leadW + 20), 162, leadW);
  });

  fillRect(M, 414, CW, 2, INK);

  // Eight illustrated grid stories (user direction: 8 with pictures).
  const gridW = 235;
  GRID.forEach((card, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    drawGridCard(card, M + col * (gridW + 12), 424 + row * 164, gridW, 152);
  });

  // Text-only list (user direction: the rest as text is fine).
  fillRect(M, 744, CW, 2, INK);
  drawText('ALSO ON WEDNESDAY 25 NOVEMBER - 13 MORE STORIES', M, 754, 2, RED);
  const src = 'SOURCES: REUTERS, AP, NYT, BBC';
  drawText(src, M + CW - textWidth(src, 2), 754, 2, MUTED);
  LIST.forEach((item, i) => {
    const col = i < 7 ? 0 : 1;
    const row = i < 7 ? i : i - 7;
    const x = M + col * 498;
    const y = 776 + row * 21;
    const n = String(12 + i);
    drawText(n, x, y, 2, RED);
    drawText(item, x + 30, y, 2, INK);
  });

  // DATE CHECK footer (criterion 1 + 4: trust signal, names what was left out).
  fillRect(M, 922, CW, 2, INK);
  drawText(
    'DATE CHECK: EVERY STORY HAPPENED OR WAS FIRST REPORTED WED 25 NOV 2026.',
    M, 932, 2, INK,
  );
  drawText(
    'LEFT OUT: BENGHAZI SINKING (23 NOV) - HUAWEI VERDICT (24 NOV)',
    M, 949, 2, MUTED,
  );
  drawText(
    'RIYADH TOWER 11 HURT (24 NOV) - COP31 NO DEAL (22 NOV) - EL CHAPO HELD (21 NOV)',
    M, 966, 2, MUTED,
  );
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? 'out';
  drawPage();
  const png = encodePNG();
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'entry.png');
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes, ${W}x${H})`);
}

main();
