// THE WORLD TODAY — a newspaper front page summing up Wednesday 25 November 2026.
// Node 22, standard library only. Draws everything programmatically (no assets,
// no network) and writes one deterministic 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png.
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

const SKY: RGB = [168, 200, 222];
const SEA: RGB = [32, 85, 126];
const HULL: RGB = [28, 39, 51];
const ORANGE: RGB = [224, 122, 31];
const YELLOW: RGB = [240, 196, 64];

function drawLeadPicture(x: number, y: number, w: number, h: number): void {
  frameRect(x, y, w, h, 3, INK);
  const ix = x + 3;
  const iy = y + 3;
  const iw = w - 6;
  const ih = h - 6;
  const horizon = iy + Math.floor(ih * 0.42);
  // Sky, sun, clouds.
  fillRect(ix, iy, iw, horizon - iy, SKY);
  fillCircle(ix + iw - 42, iy + 34, 22, YELLOW);
  fillCircle(ix + 52, iy + 30, 12, WHITE);
  fillRect(ix + 40, iy + 26, 46, 10, WHITE);
  fillCircle(ix + 118, iy + 52, 9, WHITE);
  fillRect(ix + 108, iy + 49, 34, 8, WHITE);
  // Sea.
  fillRect(ix, horizon, iw, iy + ih - horizon, SEA);
  fillRect(ix + 18, horizon + 26, 64, 4, WHITE);
  fillRect(ix + iw - 96, horizon + 52, 72, 4, WHITE);
  fillRect(ix + 120, horizon + 78, 56, 4, WHITE);
  // Cargo ship: hull, containers, bridge, funnel.
  const shipY = horizon + 34;
  fillRect(ix + 62, shipY, 168, 34, HULL);
  fillTriangle(ix + 62, shipY, ix + 62, shipY + 34, ix + 30, shipY + 34, HULL);
  fillRect(ix + 74, shipY - 22, 34, 22, [178, 52, 44]);
  fillRect(ix + 112, shipY - 22, 34, 22, [43, 110, 138]);
  fillRect(ix + 150, shipY - 22, 34, 22, [201, 162, 39]);
  fillRect(ix + 196, shipY - 34, 26, 34, WHITE);
  fillRect(ix + 202, shipY - 28, 14, 6, INK);
  fillRect(ix + 202, shipY - 18, 14, 6, INK);
  fillRect(ix + 226, shipY - 44, 8, 44, HULL);
  // Drone above the ship.
  fillRect(ix + 128, iy + 78, 26, 8, INK);
  fillRect(ix + 122, iy + 74, 38, 3, INK);
  fillRect(ix + 138, iy + 86, 4, 12, INK);
  // Explosion burst at the bow.
  fillCircle(ix + 40, shipY - 8, 16, ORANGE);
  fillCircle(ix + 40, shipY - 8, 9, YELLOW);
  fillTriangle(ix + 40, shipY - 34, ix + 28, shipY - 12, ix + 52, shipY - 12, ORANGE);
  fillTriangle(ix + 14, shipY - 8, ix + 40, shipY - 20, ix + 40, shipY + 4, ORANGE);
  fillTriangle(ix + 66, shipY - 8, ix + 40, shipY - 20, ix + 40, shipY + 4, ORANGE);
  // Smoke.
  fillCircle(ix + 52, shipY - 34, 10, [120, 120, 118]);
  fillCircle(ix + 66, shipY - 46, 12, [140, 140, 138]);
}

function drawTanker(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + 30, w, h - 30, SEA);
  fillRect(x + 14, y + 18, 26, 3, WHITE);
  fillRect(x + 30, y + 34, 210, 16, [122, 31, 26]);
  fillRect(x + 30, y + 34, 210, 5, [160, 60, 48]);
  fillTriangle(x + 30, y + 34, x + 30, y + 50, x + 14, y + 50, [122, 31, 26]);
  fillRect(x + 196, y + 16, 26, 18, WHITE);
  fillRect(x + 202, y + 21, 14, 4, INK);
  fillCircle(x + 252, y + 22, 7, ORANGE);
  fillCircle(x + 262, y + 14, 5, YELLOW);
  fillRect(x + 8, y + 52, 30, 2, WHITE);
  fillRect(x + 240, y + 52, 30, 2, WHITE);
}

function drawTower(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [223, 233, 242]);
  fillRect(x + 128, y + 4, 34, 52, [58, 74, 90]);
  fillTriangle(x + 128, y + 4, x + 162, y + 4, x + 145, y - 2 < y ? y : y, [58, 74, 90]);
  fillTriangle(x + 128, y + 6, x + 162, y + 6, x + 145, y - 6, [58, 74, 90]);
  fillRect(x + 138, y + 12, 6, 5, YELLOW);
  fillRect(x + 146, y + 12, 6, 5, YELLOW);
  fillRect(x + 138, y + 22, 6, 5, YELLOW);
  fillRect(x + 146, y + 22, 6, 5, YELLOW);
  fillRect(x + 138, y + 32, 6, 5, YELLOW);
  fillRect(x + 146, y + 32, 6, 5, YELLOW);
  fillRect(x + 138, y + 42, 6, 5, YELLOW);
  fillRect(x + 146, y + 42, 6, 5, YELLOW);
  // Drone and smoke.
  fillRect(x + 196, y + 10, 18, 6, INK);
  fillRect(x + 192, y + 8, 26, 2, INK);
  fillCircle(x + 176, y + 16, 8, [150, 150, 148]);
  fillCircle(x + 168, y + 24, 10, [170, 170, 168]);
  fillRect(x + 40, y + 48, 210, 8, [58, 74, 90]);
}

function drawCourt(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [232, 226, 208]);
  fillTriangle(x + 60, y + 6, x + 230, y + 6, x + 145, y + 26, [74, 90, 106]);
  fillRect(x + 60, y + 26, 170, 6, [74, 90, 106]);
  fillRect(x + 76, y + 32, 14, 20, WHITE);
  fillRect(x + 118, y + 32, 14, 20, WHITE);
  fillRect(x + 160, y + 32, 14, 20, WHITE);
  fillRect(x + 202, y + 32, 14, 20, WHITE);
  fillRect(x + 60, y + 52, 170, 4, [74, 90, 106]);
  fillRect(x + 132, y + 38, 26, 14, [58, 74, 90]);
}

function drawMedal(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [242, 227, 179]);
  fillTriangle(x + 128, y + 2, x + 146, y + 2, x + 137, y + 22, [178, 52, 44]);
  fillTriangle(x + 146, y + 2, x + 164, y + 2, x + 155, y + 22, [43, 80, 140]);
  fillCircle(x + 145, y + 38, 15, [212, 160, 23]);
  fillCircle(x + 145, y + 38, 11, [240, 196, 64]);
  fillTriangle(x + 145, y + 29, x + 141, y + 40, x + 149, y + 40, [178, 52, 44]);
  fillTriangle(x + 141, y + 40, x + 149, y + 40, x + 145, y + 46, [178, 52, 44]);
}

function drawBreach(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [34, 48, 63]);
  fillRect(x + 96, y + 8, 98, 36, [223, 230, 238]);
  fillRect(x + 102, y + 14, 86, 24, [159, 195, 224]);
  fillRect(x + 138, y + 44, 14, 6, [223, 230, 238]);
  fillRect(x + 122, y + 50, 46, 3, [223, 230, 238]);
  // Warning triangle with exclamation mark.
  fillTriangle(x + 214, y + 12, x + 226, y + 12, x + 220, y + 28, YELLOW);
  fillRect(x + 219, y + 16, 2, 6, INK);
  fillRect(x + 219, y + 24, 2, 2, INK);
  // Padlock.
  fillRect(x + 56, y + 30, 26, 18, [240, 196, 64]);
  fillRect(x + 62, y + 22, 14, 10, [240, 196, 64]);
  fillRect(x + 62, y + 28, 14, 4, [34, 48, 63]);
  fillRect(x + 67, y + 36, 4, 6, INK);
}

function drawJets(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [188, 211, 230]);
  fillCircle(x + 40, y + 12, 9, WHITE);
  fillRect(x + 32, y + 10, 30, 7, WHITE);
  fillCircle(x + 250, y + 42, 8, WHITE);
  fillRect(x + 242, y + 40, 26, 6, WHITE);
  // Early-warning aircraft: fuselage, wings, tail, radar dome.
  fillRect(x + 108, y + 22, 84, 10, [51, 71, 94]);
  fillTriangle(x + 192, y + 22, x + 192, y + 32, x + 214, y + 27, [51, 71, 94]);
  fillTriangle(x + 128, y + 32, x + 168, y + 32, x + 148, y + 48, [51, 71, 94]);
  fillTriangle(x + 108, y + 22, x + 124, y + 22, x + 112, y + 10, [51, 71, 94]);
  fillCircle(x + 150, y + 18, 7, [120, 140, 160]);
  fillRect(x + 116, y + 24, 10, 6, [159, 195, 224]);
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface Story {
  kicker: string;
  headline: string[];
  deck: string;
  draw: (x: number, y: number, w: number, h: number) => void;
}

const STORIES: Story[] = [
  {
    kicker: 'IRAN',
    headline: ['MINES HIT THREE', 'OIL TANKERS'],
    deck: 'The Revolutionary Guard Navy says naval mines hit three oil tankers in the Strait of Hormuz.',
    draw: drawTanker,
  },
  {
    kicker: 'SAUDI ARABIA',
    headline: ['DRONE HITS', 'RIYADH TOWER'],
    deck: "Houthi drone hits Riyadh's tallest tower; Saudi civil defence says 11 were wounded.",
    draw: drawTower,
  },
  {
    kicker: 'TECH & LAW',
    headline: ['HUAWEI CONVICTED', 'IN US TRIAL'],
    deck: 'Convicted over its Iran business, including trade-secrets theft; cleared of racketeering.',
    draw: drawCourt,
  },
  {
    kicker: 'WASHINGTON',
    headline: ['MEDAL OF FREEDOM', 'FOR GIULIANI'],
    deck: 'Trump awards the honour to former New York mayor Rudy Giuliani.',
    draw: drawMedal,
  },
  {
    kicker: 'WASHINGTON',
    headline: ['BREACH HITS CIA', 'AND INTEL CHIEF'],
    deck: 'Breach hits the CIA and the Director of National Intelligence; some data unclassified.',
    draw: drawBreach,
  },
  {
    kicker: 'EUROPE',
    headline: ['NATO SENDS JETS', 'TO POLAND'],
    deck: 'Early-warning aircraft to deploy after missiles landed in Poland in an attack on Ukraine.',
    draw: drawJets,
  },
];

function drawFrontPage(): void {
  fillRect(0, 0, W, H, PAPER);
  frameRect(10, 10, W - 20, H - 20, 6, INK);

  // Masthead.
  fillRect(24, 24, W - 48, 102, INK);
  drawTextCentered('THE WORLD TODAY', W / 2, 46, 9, PAPER);
  fillRect(24, 132, W - 48, 5, GOLD);

  // Date band.
  drawTextCentered('WEDNESDAY, 25 NOVEMBER 2026', W / 2, 152, 4, RED);
  fillRect(150, 163, 10, 10, INK);
  fillRect(W - 160, 163, 10, 10, INK);
  fillRect(40, 198, W - 80, 2, INK);

  // Lead story.
  const leadX = 40;
  const leadW = 608;
  drawText('LEAD STORY - UKRAINE', leadX, 214, 3, RED);
  drawText('UKRAINE STRIKES', leadX, 244, 5, INK);
  drawText('RUSSIAN SHIPS AT SEA', leadX, 292, 5, INK);
  drawWrapped(
    'Zelenskiy confirmed Ukraine was behind a drone strike on a Russian cargo ship in the ' +
      'Gulf of Finland. Ukraine also says it sank a Russian warship in Benghazi harbour, Libya.',
    leadX,
    352,
    leadW,
    3,
    26,
    INK,
  );
  drawLeadPicture(668, 214, 316, 286);
  drawTextCentered(
    'INSIDE: IRAN • RIYADH • HUAWEI • GIULIANI • CIA • NATO',
    W / 2,
    516,
    2,
    MUTED,
  );

  // Divider.
  fillRect(40, 544, W - 80, 3, INK);
  fillRect(40, 551, W - 80, 1, INK);

  // Grid of six stories: 3 columns x 2 rows.
  const colX = [40, 358, 676];
  const colW = [306, 306, 308];
  const rowY = [560, 784];
  const cellH = 212;
  STORIES.forEach((story, i) => {
    const cx = colX[i % 3];
    const cy = rowY[Math.floor(i / 3)];
    const cw = colW[i % 3];
    fillRect(cx, cy, cw, cellH, CARD);
    frameRect(cx, cy, cw, cellH, 2, CARD_LINE);
    story.draw(cx + 6, cy + 6, cw - 12, 56);
    drawText(story.kicker, cx + 8, cy + 70, 2, RED);
    story.headline.forEach((line, j) => drawText(line, cx + 8, cy + 90 + j * 23, 3, INK));
    drawWrapped(story.deck, cx + 8, cy + 140, cw - 16, 2, 17, INK);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
drawFrontPage();
writeFileSync(join(outDir, 'entry.png'), encodePNG());
