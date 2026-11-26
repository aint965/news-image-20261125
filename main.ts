// THE WORLD TODAY — Wednesday 25 November 2026.
// A newspaper front page summing up 25 November 2026's world news in one
// 1024x1024 image, for the make.fun competition news-image-20261125.
// 30 verified stories, 7 regions, built on the anatomy of the 22 Nov
// 1st-place winner: giant serif date, three illustrated leads, a dark
// numbers panel, illustrated cards, an "also on" list, a dotted world map
// with numbered pins, and an honest DATE CHECK footer.
// Node 22, standard library only. No assets, no network. Deterministic:
// two runs write byte-identical output.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER = [246, 241, 227];
const INK = [22, 22, 22];
const RED = [193, 39, 45];
const NAVY = [20, 38, 74];
const NAVY2 = [28, 52, 96];
const GRAY = [107, 107, 102];
const LINE = [60, 60, 58];
const WHITE = [255, 255, 255];
const SKY = [168, 205, 226];
const SEA = [38, 84, 110];
const GOLD = [214, 164, 32];

// region colours: Asia, Europe, N.America, LatAm, MidEast, Africa, Pacific
const RC = {
  ASIA: [194, 94, 30],
  EUROPE: [47, 95, 208],
  NAMER: [14, 124, 107],
  LATAM: [123, 75, 166],
  MIDEAST: [166, 124, 0],
  AFRICA: [46, 125, 50],
  PACIFIC: [2, 132, 199],
};

// ---------- image buffer ----------
const buf = new Uint8Array(W * H * 3);
function px(x: number, y: number, c: number[]): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const o = (yi * W + xi) * 3;
  buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 3;
      buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2];
    }
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) px(x0 + (dx * i) / n, y0 + (dy * i) / n, c);
}
function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) px(cx + x, cy + y, c);
    }
  }
}
function ring(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    px(cx + Math.cos(t) * r, cy + Math.sin(t) * r, c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  line(x0, y0, x1, y1, c);
  line(x1, y1, x2, y2, c);
  line(x2, y2, x0, y0, c);
  const minY = Math.ceil(Math.min(y0, y1, y2));
  const maxY = Math.floor(Math.max(y0, y1, y2));
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: [number, number, number, number][] = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      xs.sort((a, b) => a - b);
      for (let x = Math.ceil(xs[0]); x <= Math.floor(xs[xs.length - 1]); x++) px(x, y, c);
    }
  }
}
function outline(x: number, y: number, w: number, h: number, c: number[], t = 1): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}

// ---------- PNG encode ----------
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- real serif glyphs (Liberation Serif, embedded bitmaps) ----------
// Glyph bitmaps rendered from Liberation Serif (Times-metric, public
// domain-style free font) with PIL at exact cap heights, thresholded and
// hex-packed. Tuple: [advance, leftBearing, topOffset, inkW, inkH, hex]
// topOffset is relative to the cap-height top (negative = overshoot).
// SERIF35B: Bold, cap height 35px — the giant date only.
const SERIF35B: Record<string, [number, number, number, number, number, string]> = {
  'A': [38,0,-1,38,36,'0001fe00000001ff00000001ff00000003ff00000003ff80000007ff800000077f800000077fc000000e3fc000000e3fc000000e3fe000001c1fe000001c1ff000003c0ff00000380ff00000380ff800007807f800007007f800007007fc0000e003fc0000e003fc0000fffffe0001fffffe0001ffffff0003c001ff00038000ff00038000ff80078000ff800700007f800700007fc00f00007fc00e00003fe01e00003fe01e00003ff07fe003fffc7fe003fffc'],
  'B': [35,0,0,34,36,'7fffff0007fffffe0007fffff8007fc0ffc007fc03fc007fc03fe007fc03fe007fc01fe007fc01fe007fc01fe007fc01fe007fc03fc007fc03fc007fc07f8007fc0ff0007ffffc0007ffffc0007fffff8007fc03fe007fc01ff007fc00ff807fc007f807fc007fc07fc007fc07fc007fc07fc007fc07fc007fc07fc007fc07fc007f807fc00ff807fc00ff007fc01fe007fffffc07ffffff007fffffc00000000000'],
  'D': [38,0,0,36,36,'7ffffe0007fffffe0007fffff8007fc0ffc007fc03fe007fc01ff007fc00ff807fc007fc07fc003fc07fc003fc07fc003fe07fc003fe07fc001fe07fc001fe07fc001ff07fc001ff07fc001ff07fc001ff07fc001ff07fc001ff07fc001ff07fc001fe07fc001fe07fc001fe07fc001fe07fc003fc07fc003fc07fc003fc07fc007f807fc007f007fc00ff007fc03fe007fffff807fffffe007fffff000000000000'],
  'E': [35,0,0,33,35,'7ffffffc07ffffffc007fffffc007fc001c007fc001c007fc000c007fc000c007fc000c007fc000c007fc0000007fc0000007fc0000007fc01c0007fc01c0007fc01c0007fc01c0007ffffc0007ffffc0007ffffc0007fc01c0007fc01c0007fc01c0007fc01c0007fc0000007fc0000007fc0003007fc0003807fc0003807fc0003007fc0007007fc0007007fc0007007ffffff07fffffff07fffffff0'],
  'M': [50,0,0,49,35,'7ffe00003fff87ffe00003fff007ff00007ff8007ff00007ff0007ff00007ff0007ff8000fff0007ff8000fff0007bfc001eff0007bfc001eff0007bfe003cff00079fe003cff00079fe0038ff00078ff0078ff00078ff0070ff000787f80f0ff000787f80e0ff000787fc1e0ff000783fc1e0ff000783fe3c0ff000781fe3c0ff000781fe380ff000780ff780ff000780fff00ff000780fff00ff0007807fe00ff0007807fe00ff0007803fe00ff0007803fc00ff0007801fc00ff0007801f800ff0007801f800ff0007800f000ff0007800f001ff807ff80601ffff07ff80601ffff8'],
  'N': [38,1,0,37,35,'fff000fff8fff800fff80ffc000f800ffe0007000ffe0007000fff0007000fff8007000fffc007000f7fc007000f3fe007000f3ff007000f1ff807000f0ff807000f07fc07000f03fe07000f03ff07000f01ff07000f00ff87000f007fc7000f007fe7000f003fe7000f001ff7000f000fff000f000fff000f0007ff000f0003ff000f0001ff000f0001ff000f0000ff000f00007f000f00003f000f00003f000f00001f00fff0000f00fff0000700'],
  'O': [41,2,-1,37,37,'0007ff0000003fffe00000fffff80003fc01fe0007f800ff000ff0007f800fe0003fc01fe0003fc03fc0001fe03fc0001fe03fc0001ff07fc0000ff07fc0000ff07f80000ff07f80000ff07f80000ff07f80000ff87f80000ff87f80000ff87f80000ff87f80000ff87f80000ff07f80000ff07f80000ff07fc0000ff07fc0000ff03fc0001fe03fc0001fe01fc0001fe01fe0003fc00fe0003f8007f0007f8007f800ff0001fc01fe0000fffff800003fffe0000007ff0000'],
  'R': [38,0,0,39,35,'7fffff00007fffffe00007fffff80007fc03fc0007fc01fe0007fc00ff0007fc00ff0007fc00ff0007fc007f8007fc007f8007fc007f8007fc007f8007fc00ff0007fc00ff0007fc00ff0007fc01fe0007fc07fc0007fffff80007ffffe00007ffffc00007fc3fe00007fc1fe00007fc0ff00007fc0ff80007fc07f80007fc07fc0007fc03fe0007fc01ff0007fc01ff0007fc00ff8007fc007fc007fc007fc007fc003fe07fffc01ffe7fffc01ffe'],
  'S': [29,2,-1,26,37,'007fe0003fffe00ffffe01f807e03f001e03e000e03e000e07e000e07e000e07e000007f000007f800007fe00003ffc0003fff0001fffe001ffff000ffffc007fffe001ffff0007fff0000fff80001ff800007f800003f800001f860001f860001f870001f870001f870001f070001f07c003e07e007e07ffff803ffff0003ff800'],
  'V': [38,0,0,38,36,'7fff001ffc7fff001ffc1ff80003e00ff00001c00ff80003c007f800038007fc00078003fc00070003fe00070003fe000f0001fe000e0001ff001e0000ff001c0000ff801c0000ff803c00007fc03800007fc07800003fc07000003fe07000001fe0f000001ff0e000001ff0e000000ff1c000000ff9c0000007fbc0000007ff80000003ff80000003ff00000003ff00000001ff00000001fe00000000fe00000000fc00000000fc000000007c00000000780000'],
  'W': [53,0,0,53,36,'7fff0000007ff07fff0000007ff01ff800000007c00ff8000e0007800ff8001f00078007f8001f000f0007fc003f000f0007fc003f800f0003fc003f800e0003fe007fc01e0001fe007fc01e0001fe00ffc01c0001ff00ffe03c0000ff00ffe03c0000ff01fff0380000ff81cff03800007f81cff07800007f83cff87800007fc387f87000003fc787fcf000003fe783fcf000003fe703fce000001fef03fee000001ffe01ffe000001ffe01ffc000000ffe00ffc000000ffc00ffc000000ffc00ff80000007f8007f80000007f8007f80000007f8007f80000003f0003f00000003f0003f00000003e0001f00000001e0001e00000001e0001e0000'],
  'Y': [38,0,0,38,35,'7fffe07ff87fffe03ff80ffe0007c007fe00078003fe00078003ff000f0001ff000e0000ff801e0000ff801c00007fc03c00007fc03800003fe07800003fe07000001ff0f000000ff9e000000ff9e0000007ffc0000007ffc0000003ff80000003ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff00000001ff0000003ffff800003ffff800'],
  '2': [26,2,-1,23,36,'07fc007fff807fffe0780ff07807f07007f87003f87003f87003f80003fc0003f80003f80003f80003f80007f80007f00007f0000fe0000fc0001f80003f00007e0000fc0001f80003f00003c0000780000f00001e00003c00007ffffcfffffcfffffcfffffcfffffcfffffc'],
  '5': [26,2,0,23,36,'3ffff03ffff03ffff03ffff03ffff03ffff03800003800003800003800003800003800003800003800003bfe003fffc03fffe0380ff00007f80003fc0003fc0001fc0001fc0001fc0001fe0001fc0001fce001fce001fce003fce003f8f007f8f80ff0ffffe0ffff801ffc00'],
  '6': [26,1,-1,24,37,'001fe000fffc01fffc03f03c07e01c0fe01c0fc01c1fc01c1fc01c3f80003f80003f80007f80007f80007f80007f9fc07ffff07ffff87fc3fc7f01fe7f01fe7f00fe7f00ff7f80ff7f80ff7f80ff3f80ff3f80ff3f80ff1f80fe1fc0fe0fc0fe0fc0fc07e1fc03fff801ffe0003f80'],
  '0': [26,2,-1,23,37,'00fe0003ff8007ffc00fc7e01f87f03f83f03f03f83f03f87f03f87f01fc7f01fc7f01fcff01fcff01fcff01fcff01fcff01fcff01fcff01fcff01fcff01fcff01fcff01fcff01fcff01fc7f01fc7f01fc7f01fc7f03f83f03f83f03f83f83f01f87f00fc7e007ffc003ff8000fc00'],
  ' ': [13,0,0,0,0,''],
};
// SERIF14B: Liberation Serif Bold, cap height 14px (font size 21) — masthead,
// sub-headline, numbers panel, ALSO heading.
const SERIF14B: Record<string, [number, number, number, number, number, string]> = {
  'A': [15,0,0,16,14,'038003c007c005c00de008e008f018701ff0107820382038603cf07e'],
  'B': [14,0,0,14,15,'ffc038f038703870387038e03fc0387038383838383838383870ffe00000'],
  'C': [15,1,0,13,14,'0fe03c3078107010f000f000e000e000f000f000700878183c380fe0'],
  'D': [15,0,0,15,15,'7fc038f03838383c383c381c381c381c381c381c383c383838707fe00000'],
  'E': [14,0,0,13,14,'fff0381038103800380038403fc0384038403800380838083818fff8'],
  'F': [13,0,0,12,14,'fff3833813813803843843fc3843843803803807f0'],
  'G': [16,1,0,15,14,'0ff03c3878087008f000f000e000e000f07ef038703878383c380ff0'],
  'H': [16,0,0,16,14,'fe7f381c381c381c381c381c3ffc381c381c381c381c381c381cfe7f'],
  'I': [8,0,0,8,14,'7e3c3c3c3c3c3c3c3c3c3c3c3c7e'],
  'J': [10,0,0,10,14,'0fc0700700700700700700700700700704704e07c0'],
  'K': [16,0,0,17,14,'fe3e038180383003860038c00398003fc003fe0039e0038f0038780383c0381e0fe1f0'],
  'L': [14,0,0,14,14,'7e00380038003800380038003800380038003800380838083818fff8'],
  'M': [20,0,0,20,14,'fc07e3c0783e0782e0f82f0b8271b82793823b3823a3821e3821e3821c3820c38f887e'],
  'N': [15,0,0,15,14,'783e3c083e083f082708238823c821e820f820782078203820187808'],
  'O': [16,1,0,15,14,'0fc038707038703cf01ce01ce01ce01cf01cf01c703c703838700fc0'],
  'P': [13,0,0,13,14,'ffc038e03870387038703870387038e03fc038003800380038007f00'],
  'Q': [16,1,0,15,17,'0fc038707038703cf01ce01ce01ce01cf01cf01c703c703838700fe001e000f8003c'],
  'R': [15,0,0,16,14,'ffc03870383838383838383838703fe039e038e038703878383c7e1e'],
  'S': [12,1,0,10,14,'3f8618e08e08f007c07f01f803c01c81c818e387e0'],
  'T': [14,0,0,14,14,'fffcc78c878487840780078007800780078007800780078007801fe0'],
  'U': [15,0,0,15,14,'7e3e3808380838083808380838083808380838083c081c181f7007c0'],
  'V': [15,0,0,15,14,'fc1e380838083c181c101e300e200f20076007c007c0038003800180'],
  'W': [21,0,0,21,14,'fc00f83810203838203c38601c3c401c7c401e5cc00ece800f8f800f8f80078700070700030300030300'],
  'X': [15,0,0,15,14,'7e3c1c101e200e6007c00780038003c007e004e008f01870303878fe'],
  'Y': [15,0,0,15,14,'fe3e3c081c181e300e200f6007c003c0038003800380038003800fe0'],
  'Z': [14,1,0,12,14,'7fe41e41c03c0780700f01e01c03c0381781f03fff'],
  '0': [10,0,0,10,14,'1e03b033871871c71c71c71c71c7187183383b01e0'],
  '1': [10,1,0,9,14,'0c03c05c01c01c01c01c01c01c01c01c01c01c07f0'],
  '2': [10,0,0,10,14,'3e06784380380380380300700e01803006007fc7fc'],
  '3': [10,0,0,10,14,'3e06784380380380701e007803801c41c43c6387e0'],
  '4': [10,0,0,11,14,'0380780780f81b8138338638438ffcffc038038038'],
  '5': [10,0,0,10,14,'3f83f82002002002003f003803c01c41c4386387e0'],
  '6': [10,0,0,10,14,'0f81983087087007f073871c71c71c71c31c3b81f0'],
  '7': [10,1,0,9,14,'ff8ff8c108300200600600c00c0180180380300700'],
  '8': [10,0,0,10,14,'1f03387387187383381f033871871c71c71c7381f0'],
  '9': [10,0,0,10,14,'1e073073871871c71c73c3fc01c0184384386707e0'],
  ' ': [5,0,0,0,0,''],
  '•': [7,0,4,7,6,'387c7c7c7c38'],
  '-': [7,0,8,7,2,'7c7c'],
  '.': [5,0,11,5,3,'707070'],
  '%': [21,2,0,18,14,'380c06c080c6180c6300c6200ce4006cce0389b0011980339806398041980c1b0180e0'],
};
// SERIF14R: Liberation Serif Regular, cap height 14px (font size 21) — lead headlines.
const SERIF14R: Record<string, [number, number, number, number, number, string]> = {
  'A': [15,0,0,16,14,'03800380038004c004c008c0086008601ff01030103020182018703e'],
  'B': [14,0,0,13,14,'7fc0306030303030303030603fc03030301830183018303830307fe0'],
  'C': [14,0,0,13,14,'07f018183008300860006000600060006000600030083008181807f0'],
  'D': [15,0,0,15,14,'7fc030703018301c300c300c300c300c300c300c300c301830307fc0'],
  'E': [13,0,0,12,14,'7fe3023023003003083f83083003003003013017ff'],
  'F': [12,0,0,11,14,'7fe3023023003003003083f83003003003003007c0'],
  'G': [15,0,0,15,14,'07f01818300830006000600060006000603c601830183018181807f0'],
  'H': [15,0,0,15,14,'7c7c301830183018301830183ff83018301830183018301830187c7c'],
  'I': [7,0,0,7,14,'7c1010101010101010101010107c'],
  'J': [8,0,0,8,14,'1e0c0c0c0c0c0c0c0c0c0c8cc870'],
  'K': [15,0,0,15,14,'7c3c3030306030c0318033003700398031c030e03060303030387c1e'],
  'L': [13,0,0,12,14,'7c03003003003003003003003003003013003027fe'],
  'M': [19,0,0,19,14,'7803c380703c0702c070260b0260b026130231302323021a3021c3021c3020c307887c'],
  'N': [15,0,0,15,14,'783c3c082c08260823082308218820c820e820682038203820187808'],
  'O': [15,0,0,15,14,'07e018303018600c600c600c600c600c600c600c700c3018183007e0'],
  'P': [12,0,0,11,14,'7f830c30e30630630630c30c3f03003003003007c0'],
  'Q': [15,0,0,15,17,'07e018303018600c600c600c600c600c600c600c600c3018183007e000700038001e'],
  'R': [14,0,0,14,14,'7fc03060306030703060306030e03f80318030c030e0306030307c3c'],
  'S': [12,1,0,10,14,'1f0618408c006007803e00f8018018808818c187e0'],
  'T': [13,0,0,13,14,'fff08600860006000600060006000600060006000600060006000f80'],
  'U': [15,0,0,15,14,'7c3c300830083008300830083008300830083008300818101c3007c0'],
  'V': [15,0,0,15,14,'781e30083808181018100c200c200660064007400380038001800100'],
  'W': [20,0,0,20,14,'f800e6020430204307043070818f08189880c9900d1d00d0d0070e0060600606002040'],
  'X': [15,0,0,15,14,'7c3c18100c200e4006c003800380038006c004e0086010303038787c'],
  'Y': [15,0,0,15,14,'7c3c380818101c300c200640074003800180018001800180018007c0'],
  'Z': [13,1,0,11,14,'7fc41c0180300700600c00c0180380302602e04ffc'],
  '0': [10,0,0,10,14,'1e031021860860c60c60c60c60c6086082183101e0'],
  '1': [10,1,0,9,14,'0803804800800800800800800800800800800807f0'],
  '2': [10,0,0,10,14,'3e06304180180180180100300600c01002007f87f8'],
  '3': [10,1,0,9,14,'7c0c708300300300601c0030010018018830830fc0'],
  '4': [10,0,0,11,14,'010030070050090110110210410438ffc010010010'],
  '5': [10,1,0,9,14,'7f07e04004004004007e00300100180188108307c0'],
  '6': [10,0,0,10,14,'0f81083086006006006f061860c60c60c20c3180f0'],
  '7': [10,1,0,9,14,'ff8ff8810010020020040040080080100100200200'],
  '8': [10,0,0,10,14,'1e03186186186183181f021860860c60c6086181f0'],
  '9': [10,0,0,10,14,'1e061061860860860c61c3ec00c0180184184307e0'],
  ' ': [5,0,0,0,0,''],
  '-': [7,0,8,7,2,'7c7c'],
  '.': [5,1,12,3,2,'66'],
  ':': [6,1,4,4,10,'6600000066'],
  '%': [18,0,0,17,14,'3c0406608042180421004220042400664e03c910013180131802318043180c110080e0'],
};

// ---------- 5x7 bitmap font ----------
// Each glyph: 7 rows of 5 bits, packed as 7 chars; char value v: '0'-'9' = 0-9, 'a'-'v' = 10-31.
const FONT: Record<string, string> = {
  A: 'ehhvhhh', B: 'uhhuhhu', C: 'ehggghe', D: 'uhhhhhu', E: 'vgguggv',
  F: 'vgguggg', G: 'ehgnhhf', H: 'hhhvhhh', I: 'e44444e', J: '72222ic',
  K: 'hikokih', L: 'ggggggv', M: 'hrllhhh', N: 'hpljhhh', O: 'ehhhhhe',
  P: 'uhhuggg', Q: 'ehhhlid', R: 'uhhukih', S: 'fgge11u', T: 'v444444',
  U: 'hhhhhhe', V: 'hhhhha4', W: 'hhhllla', X: 'hha4ahh', Y: 'hha4444',
  Z: 'v1248gv',
  '0': 'ehjlphe', '1': '4c4444e', '2': 'eh168gv', '3': 'v2421he',
  '4': '26aiv22', '5': 'vgu11he', '6': '68guhhe', '7': 'v124888',
  '8': 'ehhehhe', '9': 'ehhf12c',
  ' ': '0000000', '.': '00000cc', ',': '0000c48', '-': '000v000',
  "'": '4480000', ':': '0cc0cc0', ';': '0cc0c48', '(': '2488842',
  ')': '8422248', '/': '11248gg', '+': '044v440', '%': 'pp248jj',
  '&': 'cik8lid', '!': '4444404', '?': 'eh12404', '=': '00v0v00',
  '•': '004ee40', '—': '000vv00', '"': 'aaa0000', '$': '4fke5u4',
  _: '000000v', '[': 'e88888e', ']': 'e22222e', '*': '04lel40',
};
function glyphVal(ch: string): number {
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48;
  return ch.charCodeAt(0) - 87; // 'a' -> 10
}
function charW(scale: number, bold: boolean): number {
  return 6 * scale + (bold ? 1 : 0);
}
// ---------- serif text engine ----------
// Scale >= 2 text uses the embedded Liberation Serif bitmaps (a real serif
// face); scale 1 keeps the 5x7 bitmap font, which stays legible at 7px.
type SerifGlyph = [number, number, number, number, number, string];
function serifSet(scale: number, bold: boolean): Record<string, SerifGlyph> {
  if (scale >= 5) return SERIF35B;
  return bold ? SERIF14B : SERIF14R;
}
function drawSerifGlyph(g: SerifGlyph, x: number, y: number, c: number[]): void {
  const [, left, top, w, h, hex] = g;
  if (w === 0 || h === 0) return;
  const nibPerRow = Math.ceil(w / 4);
  for (let r = 0; r < h; r++) {
    for (let col = 0; col < w; col++) {
      const nib = parseInt(hex[r * nibPerRow + (col >> 2)], 16);
      if (nib & (8 >> (col & 3))) px(x + left + col, y + top + r, c);
    }
  }
}
function textW(s: string, scale: number, bold = false): number {
  if (scale >= 2) {
    const set = serifSet(scale, bold);
    let w = 0;
    for (const ch of s) {
      const g = set[ch];
      w += g ? g[0] : charW(scale, bold);
    }
    return w;
  }
  let w = 0;
  for (const ch of s) w += charW(scale, bold);
  return w - (bold ? 1 : 0);
}
function drawGlyph(ch: string, x: number, y: number, scale: number, c: number[], bold: boolean): void {
  const g = FONT[ch] ?? FONT[' '];
  const dx = bold ? 1 : 0;
  for (let pass = 0; pass <= dx; pass++) {
    for (let r = 0; r < 7; r++) {
      const bits = glyphVal(g[r]);
      for (let col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          rect(x + pass + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}
function drawText(s: string, x: number, y: number, scale: number, c: number[], opts: { bold?: boolean; align?: 'left' | 'center' | 'right' } = {}): number {
  const bold = opts.bold ?? false;
  let x0 = x;
  const w = textW(s, scale, bold);
  if (opts.align === 'center') x0 = x - Math.floor(w / 2);
  if (opts.align === 'right') x0 = x - w;
  let cx = x0;
  if (scale >= 2) {
    const set = serifSet(scale, bold);
    for (const ch of s) {
      const g = set[ch];
      if (g) drawSerifGlyph(g, cx, y, c);
      cx += g ? g[0] : charW(scale, bold);
    }
  } else {
    for (const ch of s) {
      drawGlyph(ch, cx, y, scale, c, bold);
      cx += charW(scale, bold);
    }
  }
  return w;
}
// Greedy wrap; avoids a lone short word on the last line.
function wrapText(s: string, maxW: number, scale: number, bold = false): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textW(trial, scale, bold) <= maxW || !cur) cur = trial;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length >= 2) {
    const last = lines[lines.length - 1];
    if (last.split(' ').length === 1) {
      const prev = lines[lines.length - 2].split(' ');
      if (prev.length > 1) {
        const moved = prev.pop()!;
        lines[lines.length - 2] = prev.join(' ');
        lines[lines.length - 1] = moved + ' ' + last;
      }
    }
  }
  return lines;
}

// ---------- scene painters ----------
// Every painter draws inside (x, y, w, h) with relative coordinates.
function skyBands(x: number, y: number, w: number, h: number, top: number[], bot: number[]): void {
  rect(x, y, w, Math.ceil(h * 0.55), top);
  rect(x, y + Math.ceil(h * 0.55), w, h - Math.ceil(h * 0.55), bot);
}
function flame(fx: number, fy: number, s: number): void {
  tri(fx, fy - s * 2, fx - s, fy, fx + s, fy, [255, 140, 0]);
  tri(fx, fy - s * 1.2, fx - s * 0.6, fy, fx + s * 0.6, fy, [255, 210, 60]);
}
function smokePuff(sx: number, sy: number, s: number): void {
  circle(sx, sy, s, [120, 120, 118]);
  circle(sx + s, sy - s * 0.5, s * 0.8, [140, 140, 136]);
  circle(sx - s, sy - s * 0.6, s * 0.7, [100, 100, 98]);
}
function windows(bx: number, by: number, bw: number, bh: number, cols: number, rows: number, c: number[]): void {
  const cw = bw / cols;
  const ch = bh / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if ((r * 7 + col * 3) % 4 !== 0) rect(bx + col * cw + cw * 0.2, by + r * ch + ch * 0.25, cw * 0.55, ch * 0.5, c);
    }
  }
}
// Cargo ship (tariffs) / oil tanker (Hormuz) — kind 'cargo' | 'tanker'
function sceneShip(x: number, y: number, w: number, h: number, kind: 'cargo' | 'tanker'): void {
  skyBands(x, y, w, h, [140, 190, 215], SEA);
  const seaY = y + h * 0.62;
  rect(x, seaY, w, h - (seaY - y), SEA);
  const hullY = seaY - h * 0.16;
  // hull
  tri(x + w * 0.06, hullY, x + w * 0.94, hullY, x + w * 0.86, seaY + h * 0.12, [30, 30, 34]);
  rect(x + w * 0.06, hullY, w * 0.8, h * 0.1, [30, 30, 34]);
  if (kind === 'cargo') {
    const cols = [[193, 39, 45], [214, 164, 32], [47, 95, 208], [46, 125, 50]];
    for (let i = 0; i < 4; i++) {
      rect(x + w * (0.12 + i * 0.19), hullY - h * 0.34, w * 0.16, h * 0.32, cols[i]);
      rect(x + w * (0.12 + i * 0.19), hullY - h * 0.34, w * 0.16, 2, WHITE);
    }
    // bridge
    rect(x + w * 0.86, hullY - h * 0.42, w * 0.08, h * 0.4, WHITE);
    windows(x + w * 0.86, hullY - h * 0.4, w * 0.08, h * 0.16, 2, 2, INK);
  } else {
    // tanker tanks
    for (let i = 0; i < 3; i++) {
      circle(x + w * (0.22 + i * 0.26), hullY - h * 0.1, h * 0.17, [200, 200, 196]);
      rect(x + w * (0.22 + i * 0.26) - h * 0.17, hullY - h * 0.1, h * 0.34, h * 0.1, [200, 200, 196]);
    }
    rect(x + w * 0.86, hullY - h * 0.3, w * 0.06, h * 0.28, [160, 40, 40]);
    flame(x + w * 0.55, hullY - h * 0.28, Math.max(4, h * 0.1));
    smokePuff(x + w * 0.55, hullY - h * 0.48, Math.max(3, h * 0.07));
    flame(x + w * 0.3, hullY - h * 0.2, Math.max(3, h * 0.07));
  }
  // wake
  line(x + w * 0.1, seaY + h * 0.2, x + w * 0.5, seaY + h * 0.2, WHITE);
  line(x + w * 0.55, seaY + h * 0.28, x + w * 0.9, seaY + h * 0.28, WHITE);
}
function sceneRefinery(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, [232, 180, 120], [120, 90, 70]);
  const gy = y + h * 0.72;
  rect(x, gy, w, h - (gy - y), [60, 52, 44]);
  // towers
  for (let i = 0; i < 3; i++) {
    const tx = x + w * (0.12 + i * 0.28);
    rect(tx, gy - h * 0.5, w * 0.09, h * 0.5, [90, 88, 84]);
    rect(tx - w * 0.02, gy - h * 0.58, w * 0.13, h * 0.08, [70, 68, 64]);
  }
  // pipes
  rect(x + w * 0.1, gy - h * 0.12, w * 0.8, h * 0.06, [110, 108, 100]);
  // flare stack
  rect(x + w * 0.82, gy - h * 0.62, w * 0.05, h * 0.62, [80, 78, 72]);
  flame(x + w * 0.845, gy - h * 0.62, Math.max(4, h * 0.09));
  smokePuff(x + w * 0.3, gy - h * 0.62, Math.max(3, h * 0.07));
  smokePuff(x + w * 0.55, gy - h * 0.55, Math.max(3, h * 0.06));
  // drone dots
  circle(x + w * 0.7, y + h * 0.18, 2, INK);
  line(x + w * 0.7 - 4, y + h * 0.18, x + w * 0.7 + 4, y + h * 0.18, INK);
}
function sceneRocket(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, [16, 24, 48]);
  for (let i = 0; i < 14; i++) {
    const sx = x + ((i * 37) % Math.max(10, w - 6)) + 3;
    const sy = y + ((i * 23) % Math.max(10, h - 6)) + 3;
    px(sx, sy, WHITE);
    if (i % 3 === 0) px(sx + 1, sy, WHITE);
  }
  // station ring
  ring(x + w * 0.72, y + h * 0.3, Math.max(6, h * 0.12), GOLD);
  rect(x + w * 0.6, y + h * 0.28, w * 0.24, 2, GOLD);
  // rocket
  const rx = x + w * 0.32;
  const ry = y + h * 0.18;
  rect(rx, ry, w * 0.1, h * 0.5, WHITE);
  tri(rx, ry, rx + w * 0.05, ry - h * 0.16, rx + w * 0.1, ry, RED);
  rect(rx - w * 0.04, ry + h * 0.36, w * 0.03, h * 0.14, RED);
  rect(rx + w * 0.11, ry + h * 0.36, w * 0.03, h * 0.14, RED);
  flame(rx + w * 0.05, ry + h * 0.52, Math.max(4, h * 0.08));
  circle(x + w * 0.85, y + h * 0.75, Math.max(5, h * 0.1), [200, 200, 190]);
}
function sceneChart(x: number, y: number, w: number, h: number, down: boolean, col: number[]): void {
  rect(x, y, w, h, PAPER);
  const gy = y + h * 0.8;
  line(x + w * 0.08, y + h * 0.1, x + w * 0.08, gy, INK);
  line(x + w * 0.08, gy, x + w * 0.95, gy, INK);
  const pts: [number, number][] = down
    ? [[0.12, 0.25], [0.3, 0.3], [0.48, 0.5], [0.66, 0.45], [0.82, 0.72]]
    : [[0.12, 0.7], [0.3, 0.6], [0.48, 0.4], [0.66, 0.45], [0.82, 0.2]];
  for (let i = 0; i < pts.length - 1; i++) {
    line(x + w * pts[i][0], y + h * pts[i][1], x + w * pts[i + 1][0], y + h * pts[i + 1][1], col);
    line(x + w * pts[i][0], y + h * pts[i][1] + 1, x + w * pts[i + 1][0], y + h * pts[i + 1][1] + 1, col);
  }
  for (let i = 0; i < pts.length; i++) circle(x + w * pts[i][0], y + h * pts[i][1], 2, col);
  // bars
  for (let i = 0; i < 5; i++) {
    const bh = h * (down ? 0.12 + i * 0.1 : 0.5 - i * 0.07);
    rect(x + w * (0.16 + i * 0.16), gy - bh, w * 0.07, bh, i % 2 ? [180, 180, 175] : col);
  }
}
function sceneMine(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, [40, 32, 26]);
  // shaft
  rect(x + w * 0.3, y, w * 0.4, h, [24, 18, 14]);
  rect(x + w * 0.3, y, 2, h, [90, 70, 50]);
  rect(x + w * 0.7 - 2, y, 2, h, [90, 70, 50]);
  // water at bottom
  rect(x, y + h * 0.78, w, h * 0.22, [30, 70, 110]);
  line(x, y + h * 0.78, x + w, y + h * 0.78, [120, 180, 220]);
  // helmet lamp
  circle(x + w * 0.5, y + h * 0.45, Math.max(3, h * 0.06), GOLD);
  circle(x + w * 0.5, y + h * 0.45, Math.max(6, h * 0.12), [214, 164, 32]);
  // rope
  line(x + w * 0.5, y, x + w * 0.5, y + h * 0.4, [180, 160, 120]);
  // surface: trees + rescuer
  rect(x, y, w, h * 0.08, [60, 110, 60]);
  tri(x + w * 0.15, y + h * 0.3, x + w * 0.1, y + h * 0.45, x + w * 0.2, y + h * 0.45, [240, 120, 30]);
}
function sceneCrowd(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, SKY, [120, 140, 120]);
  const gy = y + h * 0.7;
  rect(x, gy, w, h - (gy - y), [90, 90, 84]);
  // banner
  rect(x + w * 0.15, y + h * 0.12, w * 0.7, h * 0.22, WHITE);
  outline(x + w * 0.15, y + h * 0.12, w * 0.7, h * 0.22, RED, 2);
  // heads
  for (let i = 0; i < 7; i++) {
    const hx = x + w * (0.08 + i * 0.13);
    circle(hx, gy - h * 0.08, Math.max(3, h * 0.07), [60 + (i % 3) * 30, 50, 45]);
    rect(hx - w * 0.05, gy, w * 0.1, h * 0.3, [40 + (i % 4) * 40, 60, 90]);
  }
  // raised placards
  rect(x + w * 0.3, gy - h * 0.3, w * 0.12, h * 0.14, RED);
  rect(x + w * 0.62, gy - h * 0.34, w * 0.12, h * 0.14, GOLD);
}
function sceneJets(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, [60, 80, 120], [90, 100, 130]);
  const gy = y + h * 0.72;
  rect(x, gy, w, h - (gy - y), [70, 70, 66]);
  line(x, gy, x + w, gy, WHITE);
  for (let i = 0; i < 2; i++) {
    const jx = x + w * (0.2 + i * 0.42);
    const jy = y + h * (0.3 + i * 0.12);
    // fuselage + wings
    rect(jx, jy, w * 0.22, h * 0.07, [200, 200, 195]);
    tri(jx + w * 0.22, jy, jx + w * 0.3, jy + h * 0.035, jx + w * 0.22, jy + h * 0.07, [200, 200, 195]);
    rect(jx + w * 0.08, jy - h * 0.08, w * 0.06, h * 0.08, [180, 180, 175]);
    rect(jx + w * 0.08, jy + h * 0.07, w * 0.06, h * 0.08, [180, 180, 175]);
    flame(jx - 2, jy + h * 0.035, Math.max(3, h * 0.05));
  }
  smokePuff(x + w * 0.75, y + h * 0.5, Math.max(3, h * 0.06));
}
function sceneCity(x: number, y: number, w: number, h: number, smoke: boolean): void {
  skyBands(x, y, w, h, [200, 170, 140], [140, 130, 120]);
  const gy = y + h * 0.75;
  rect(x, gy, w, h - (gy - y), [80, 76, 70]);
  const bw = w / 5;
  const hs = [0.45, 0.6, 0.35, 0.55, 0.4];
  for (let i = 0; i < 5; i++) {
    const bx = x + i * bw;
    const bh = h * hs[i];
    rect(bx + 1, gy - bh, bw - 2, bh, [50, 48, 52]);
    windows(bx + 2, gy - bh + 2, bw - 4, bh - 4, 2, 3, GOLD);
  }
  if (smoke) {
    smokePuff(x + w * 0.3, gy - h * 0.55, Math.max(3, h * 0.07));
    flame(x + w * 0.3, gy - h * 0.3, Math.max(3, h * 0.06));
  }
}
function sceneFlags(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, [232, 226, 210]);
  const cols = [[193, 39, 45], [47, 95, 208], [214, 164, 32], [46, 125, 50], [123, 75, 166], [14, 124, 107]];
  for (let i = 0; i < 6; i++) {
    const fx = x + w * (0.06 + i * 0.16);
    rect(fx, y + h * 0.2, w * 0.11, h * 0.4, cols[i]);
    rect(fx, y + h * 0.2, w * 0.11, 2, WHITE);
    line(fx + w * 0.055, y + h * 0.2, fx + w * 0.055, y + h * 0.85, INK);
  }
  // document
  rect(x + w * 0.62, y + h * 0.55, w * 0.3, h * 0.35, WHITE);
  outline(x + w * 0.62, y + h * 0.55, w * 0.3, h * 0.35, INK, 1);
  line(x + w * 0.66, y + h * 0.65, x + w * 0.88, y + h * 0.65, INK);
  line(x + w * 0.66, y + h * 0.75, x + w * 0.88, y + h * 0.75, INK);
}
function sceneParliament(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, SKY, [150, 160, 150]);
  const gy = y + h * 0.75;
  rect(x, gy, w, h - (gy - y), [100, 96, 88]);
  // columns
  for (let i = 0; i < 4; i++) {
    rect(x + w * (0.1 + i * 0.22), gy - h * 0.45, w * 0.07, h * 0.45, [220, 215, 200]);
  }
  tri(x + w * 0.05, gy - h * 0.45, x + w * 0.5, gy - h * 0.68, x + w * 0.95, gy - h * 0.45, [200, 195, 180]);
  rect(x, gy - h * 0.06, w, h * 0.06, [220, 215, 200]);
  // flag
  line(x + w * 0.5, gy - h * 0.95, x + w * 0.5, gy - h * 0.68, INK);
  rect(x + w * 0.5, gy - h * 0.95, w * 0.14, h * 0.12, [193, 39, 45]);
}
function sceneTree(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, SKY, [140, 170, 120]);
  const gy = y + h * 0.75;
  rect(x, gy, w, h - (gy - y), [110, 140, 90]);
  circle(x + w * 0.35, gy - h * 0.3, Math.max(5, h * 0.16), [46, 125, 50]);
  circle(x + w * 0.55, gy - h * 0.42, Math.max(4, h * 0.13), [60, 150, 60]);
  rect(x + w * 0.42, gy - h * 0.18, w * 0.05, h * 0.18, [120, 90, 50]);
  // gavel
  line(x + w * 0.7, gy - h * 0.1, x + w * 0.88, gy - h * 0.28, [120, 90, 50]);
  rect(x + w * 0.82, gy - h * 0.36, w * 0.1, h * 0.08, [90, 60, 30]);
}
function scenePlane(x: number, y: number, w: number, h: number, crash: boolean): void {
  skyBands(x, y, w, h, SKY, crash ? SEA : [180, 190, 200]);
  if (crash) {
    const wy = y + h * 0.68;
    rect(x, wy, w, h - (wy - y), SEA);
    // plane nose-down into water
    tri(x + w * 0.55, wy - h * 0.3, x + w * 0.75, wy, x + w * 0.5, wy, [220, 220, 215]);
    rect(x + w * 0.52, wy - h * 0.42, w * 0.06, h * 0.14, [200, 200, 195]);
    circle(x + w * 0.62, wy + h * 0.05, Math.max(3, h * 0.06), WHITE);
    circle(x + w * 0.7, wy + h * 0.1, Math.max(2, h * 0.05), WHITE);
    line(x + w * 0.1, wy + h * 0.12, x + w * 0.45, wy + h * 0.12, WHITE);
  } else {
    const py = y + h * 0.4;
    rect(x + w * 0.15, py, w * 0.6, h * 0.09, WHITE);
    tri(x + w * 0.75, py, x + w * 0.88, py + h * 0.045, x + w * 0.75, py + h * 0.09, WHITE);
    rect(x + w * 0.35, py - h * 0.12, w * 0.1, h * 0.12, [200, 200, 195]);
    rect(x + w * 0.35, py + h * 0.09, w * 0.1, h * 0.12, [200, 200, 195]);
    circle(x + w * 0.2, py + h * 0.045, 2, INK);
    // runway
    rect(x, y + h * 0.78, w, h * 0.1, [60, 60, 60]);
    for (let i = 0; i < 5; i++) rect(x + w * (0.1 + i * 0.18), y + h * 0.81, w * 0.08, 2, WHITE);
  }
}
function sceneChip(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, [24, 28, 40]);
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const s = Math.min(w, h) * 0.34;
  rect(cx - s, cy - s, s * 2, s * 2, [30, 60, 90]);
  outline(cx - s, cy - s, s * 2, s * 2, GOLD, 2);
  rect(cx - s * 0.5, cy - s * 0.5, s, s, [60, 120, 160]);
  for (let i = -1; i <= 1; i++) {
    line(cx + i * s * 0.7, cy - s, cx + i * s * 0.7, cy - s - h * 0.12, GOLD);
    line(cx + i * s * 0.7, cy + s, cx + i * s * 0.7, cy + s + h * 0.12, GOLD);
  }
  circle(cx + w * 0.32, cy - h * 0.3, 2, [255, 80, 80]);
}
function sceneHostage(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, [190, 170, 150], [150, 140, 130]);
  const gy = y + h * 0.72;
  rect(x, gy, w, h - (gy - y), [90, 86, 80]);
  // store
  rect(x + w * 0.1, gy - h * 0.5, w * 0.8, h * 0.5, [200, 60, 60]);
  rect(x + w * 0.1, gy - h * 0.5, w * 0.8, h * 0.1, WHITE);
  windows(x + w * 0.14, gy - h * 0.36, w * 0.72, h * 0.3, 5, 2, [255, 220, 150]);
  // shield
  circle(x + w * 0.5, gy - h * 0.62, Math.max(4, h * 0.09), [47, 95, 208]);
  rect(x + w * 0.48, gy - h * 0.66, w * 0.04, h * 0.08, WHITE);
}
function sceneFactory(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, SKY, [160, 160, 150]);
  const gy = y + h * 0.7;
  rect(x, gy, w, h - (gy - y), [100, 96, 88]);
  rect(x + w * 0.12, gy - h * 0.35, w * 0.5, h * 0.35, [150, 60, 60]);
  tri(x + w * 0.12, gy - h * 0.35, x + w * 0.37, gy - h * 0.55, x + w * 0.62, gy - h * 0.35, [120, 50, 50]);
  rect(x + w * 0.68, gy - h * 0.55, w * 0.08, h * 0.55, [120, 115, 105]);
  smokePuff(x + w * 0.72, gy - h * 0.62, Math.max(3, h * 0.06));
  // gear
  circle(x + w * 0.82, gy - h * 0.2, Math.max(4, h * 0.09), GOLD);
  circle(x + w * 0.82, gy - h * 0.2, Math.max(2, h * 0.04), INK);
}
function sceneReport(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, [232, 226, 210]);
  rect(x + w * 0.18, y + h * 0.08, w * 0.5, h * 0.84, WHITE);
  outline(x + w * 0.18, y + h * 0.08, w * 0.5, h * 0.84, INK, 1);
  for (let i = 0; i < 5; i++) {
    line(x + w * 0.24, y + h * (0.22 + i * 0.13), x + w * (0.62 - (i % 2) * 0.1), y + h * (0.22 + i * 0.13), INK);
  }
  // people silhouettes
  for (let i = 0; i < 3; i++) {
    const hx = x + w * (0.76 + i * 0.08);
    circle(hx, y + h * 0.3, Math.max(3, h * 0.06), [90, 50, 60]);
    rect(hx - w * 0.04, y + h * 0.38, w * 0.08, h * 0.4, [90, 50, 60]);
  }
}
function scenePort(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, [220, 170, 130], SEA);
  const gy = y + h * 0.7;
  rect(x, gy, w, h - (gy - y), [80, 76, 70]);
  // cranes
  for (let i = 0; i < 2; i++) {
    const cx = x + w * (0.15 + i * 0.4);
    rect(cx, gy - h * 0.5, w * 0.04, h * 0.5, [60, 60, 58]);
    line(cx, gy - h * 0.5, cx + w * 0.3, gy - h * 0.28, [60, 60, 58]);
    line(cx + w * 0.3, gy - h * 0.28, cx + w * 0.3, gy - h * 0.12, [60, 60, 58]);
  }
  // containers + blast
  rect(x + w * 0.55, gy - h * 0.18, w * 0.16, h * 0.18, [193, 39, 45]);
  rect(x + w * 0.73, gy - h * 0.12, w * 0.16, h * 0.12, [214, 164, 32]);
  flame(x + w * 0.63, gy - h * 0.2, Math.max(4, h * 0.09));
  smokePuff(x + w * 0.63, gy - h * 0.42, Math.max(3, h * 0.07));
}
function sceneDrone(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, [90, 110, 150], [140, 150, 170]);
  const cx = x + w * 0.5;
  const cy = y + h * 0.42;
  rect(cx - w * 0.14, cy - h * 0.04, w * 0.28, h * 0.08, INK);
  line(cx - w * 0.2, cy - h * 0.12, cx + w * 0.2, cy - h * 0.12, INK);
  line(cx - w * 0.2, cy + h * 0.12, cx + w * 0.2, cy + h * 0.12, INK);
  circle(cx - w * 0.2, cy - h * 0.12, Math.max(3, h * 0.05), [80, 80, 78]);
  circle(cx + w * 0.2, cy - h * 0.12, Math.max(3, h * 0.05), [80, 80, 78]);
  circle(cx - w * 0.2, cy + h * 0.12, Math.max(3, h * 0.05), [80, 80, 78]);
  circle(cx + w * 0.2, cy + h * 0.12, Math.max(3, h * 0.05), [80, 80, 78]);
  circle(cx, cy, Math.max(2, h * 0.04), RED);
  // ground
  rect(x, y + h * 0.78, w, h * 0.22, [120, 110, 90]);
}
function sceneFire(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, [40, 36, 40], [90, 70, 60]);
  const gy = y + h * 0.75;
  rect(x, gy, w, h - (gy - y), [50, 48, 46]);
  // road
  rect(x, gy - h * 0.05, w, h * 0.08, [70, 70, 68]);
  // burning tanker
  rect(x + w * 0.15, gy - h * 0.28, w * 0.5, h * 0.2, [200, 200, 195]);
  circle(x + w * 0.25, gy - h * 0.08, Math.max(3, h * 0.05), INK);
  circle(x + w * 0.55, gy - h * 0.08, Math.max(3, h * 0.05), INK);
  flame(x + w * 0.4, gy - h * 0.3, Math.max(5, h * 0.12));
  flame(x + w * 0.6, gy - h * 0.26, Math.max(4, h * 0.09));
  smokePuff(x + w * 0.4, gy - h * 0.55, Math.max(4, h * 0.08));
  // fire truck
  rect(x + w * 0.72, gy - h * 0.2, w * 0.2, h * 0.14, RED);
  rect(x + w * 0.88, gy - h * 0.28, w * 0.08, h * 0.22, RED);
}
function sceneDesert(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, [230, 200, 150], [210, 170, 110]);
  const gy = y + h * 0.65;
  rect(x, gy, w, h - (gy - y), [200, 165, 105]);
  // huts
  for (let i = 0; i < 3; i++) {
    const hx = x + w * (0.1 + i * 0.28);
    rect(hx, gy - h * 0.14, w * 0.16, h * 0.14, [150, 120, 80]);
    tri(hx - w * 0.02, gy - h * 0.14, hx + w * 0.08, gy - h * 0.3, hx + w * 0.18, gy - h * 0.14, [120, 90, 55]);
  }
  // drone above
  const dx = x + w * 0.7;
  const dy = y + h * 0.25;
  rect(dx - w * 0.08, dy, w * 0.16, 3, INK);
  circle(dx - w * 0.08, dy, 2, INK);
  circle(dx + w * 0.08, dy, 2, INK);
}
function sceneCourt(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, SKY, [160, 160, 150]);
  const gy = y + h * 0.75;
  rect(x, gy, w, h - (gy - y), [100, 96, 88]);
  for (let i = 0; i < 3; i++) {
    rect(x + w * (0.14 + i * 0.3), gy - h * 0.45, w * 0.09, h * 0.45, [220, 215, 200]);
  }
  tri(x + w * 0.08, gy - h * 0.45, x + w * 0.5, gy - h * 0.66, x + w * 0.92, gy - h * 0.45, [200, 195, 180]);
  // gavel
  line(x + w * 0.68, gy - h * 0.12, x + w * 0.86, gy - h * 0.3, [120, 90, 50]);
  rect(x + w * 0.8, gy - h * 0.38, w * 0.12, h * 0.08, [90, 60, 30]);
}
function sceneTreaty(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, SKY, [150, 170, 160]);
  const gy = y + h * 0.72;
  rect(x, gy, w, h - (gy - y), [110, 130, 110]);
  // two flags
  line(x + w * 0.3, gy - h * 0.55, x + w * 0.3, gy - h * 0.1, INK);
  rect(x + w * 0.3, gy - h * 0.55, w * 0.2, h * 0.16, [0, 60, 140]);
  line(x + w * 0.66, gy - h * 0.55, x + w * 0.66, gy - h * 0.1, INK);
  rect(x + w * 0.66, gy - h * 0.55, w * 0.2, h * 0.16, [0, 120, 90]);
  // document between
  rect(x + w * 0.42, gy - h * 0.3, w * 0.16, h * 0.22, WHITE);
  outline(x + w * 0.42, gy - h * 0.3, w * 0.16, h * 0.22, INK, 1);
}
function scenePersonPlane(x: number, y: number, w: number, h: number): void {
  skyBands(x, y, w, h, SKY, [170, 180, 190]);
  const gy = y + h * 0.75;
  rect(x, gy, w, h - (gy - y), [100, 100, 96]);
  // plane
  const py = y + h * 0.3;
  rect(x + w * 0.15, py, w * 0.6, h * 0.08, WHITE);
  tri(x + w * 0.75, py, x + w * 0.88, py + h * 0.04, x + w * 0.75, py + h * 0.08, WHITE);
  rect(x + w * 0.35, py - h * 0.1, w * 0.08, h * 0.1, [200, 200, 195]);
  // walking figure
  circle(x + w * 0.5, gy - h * 0.22, Math.max(3, h * 0.06), INK);
  rect(x + w * 0.47, gy - h * 0.16, w * 0.06, h * 0.16, INK);
  line(x + w * 0.47, gy, x + w * 0.44, gy + h * 0.14, INK);
  line(x + w * 0.53, gy, x + w * 0.56, gy + h * 0.14, INK);
}
// dispatch by scene key
type SceneKey = 'ship' | 'tanker' | 'refinery' | 'rocket' | 'chartDown' | 'mine' | 'crowd' | 'jets' | 'city' | 'flags' | 'parliament' | 'tree' | 'planeCrash' | 'plane' | 'chip' | 'hostage' | 'factory' | 'report' | 'port' | 'drone' | 'fire' | 'desert' | 'court' | 'treaty' | 'personPlane';
function paintScene(key: SceneKey, x: number, y: number, w: number, h: number): void {
  switch (key) {
    case 'ship': sceneShip(x, y, w, h, 'cargo'); break;
    case 'tanker': sceneShip(x, y, w, h, 'tanker'); break;
    case 'refinery': sceneRefinery(x, y, w, h); break;
    case 'rocket': sceneRocket(x, y, w, h); break;
    case 'chartDown': sceneChart(x, y, w, h, true, RED); break;
    case 'mine': sceneMine(x, y, w, h); break;
    case 'crowd': sceneCrowd(x, y, w, h); break;
    case 'jets': sceneJets(x, y, w, h); break;
    case 'city': sceneCity(x, y, w, h, true); break;
    case 'flags': sceneFlags(x, y, w, h); break;
    case 'parliament': sceneParliament(x, y, w, h); break;
    case 'tree': sceneTree(x, y, w, h); break;
    case 'planeCrash': scenePlane(x, y, w, h, true); break;
    case 'plane': scenePlane(x, y, w, h, false); break;
    case 'chip': sceneChip(x, y, w, h); break;
    case 'hostage': sceneHostage(x, y, w, h); break;
    case 'factory': sceneFactory(x, y, w, h); break;
    case 'report': sceneReport(x, y, w, h); break;
    case 'port': scenePort(x, y, w, h); break;
    case 'drone': sceneDrone(x, y, w, h); break;
    case 'fire': sceneFire(x, y, w, h); break;
    case 'desert': sceneDesert(x, y, w, h); break;
    case 'court': sceneCourt(x, y, w, h); break;
    case 'treaty': sceneTreaty(x, y, w, h); break;
    case 'personPlane': scenePersonPlane(x, y, w, h); break;
  }
}

// ---------- story data ----------
// All 30 stories verified first reported on Wed 25 Nov 2026 (or a genuine
// 25 Nov development, labelled honestly). Claims are labelled CLAIM.
type Region = keyof typeof RC;
type Badge = 'REPORTED' | 'CLAIM' | 'ONGOING';
type Story = {
  n: number; region: Region; loc: string; kicker: string;
  headline: string; deck: string; src: string; badge: Badge;
  scene: SceneKey; lon: number; lat: number; cc: string; also: string;
};
const BADGE_C: Record<Badge, number[]> = {
  REPORTED: [27, 122, 61],
  CLAIM: [196, 127, 0],
  ONGOING: [31, 95, 196],
};
const STORIES: Story[] = [
  { n: 1, region: 'NAMER', loc: 'WASHINGTON, USA', kicker: 'TRADE • WASHINGTON',
    headline: 'US HITS 14 PARTNERS WITH NEW TARIFFS',
    deck: 'CHINA +20%, EU 15% — MARKETS FALL',
    src: 'REUTERS, USTR', badge: 'REPORTED', scene: 'ship', lon: -77, lat: 39, cc: 'US', also: '' },
  { n: 2, region: 'MIDEAST', loc: 'STRAIT OF HORMUZ', kicker: 'ENERGY • STRAIT OF HORMUZ',
    headline: 'IRGC SAYS 2 TANKERS HIT MINES IN HORMUZ',
    deck: 'BLASTS AND FIRE AT SEA — CLAIM UNVERIFIED',
    src: 'IRGC, JUST SECURITY', badge: 'CLAIM', scene: 'tanker', lon: 60, lat: 24, cc: 'IR', also: '' },
  { n: 3, region: 'MIDEAST', loc: 'RAS TANURA & HODEIDAH', kicker: 'WAR • RAS TANURA & HODEIDAH',
    headline: 'HOUTHIS CLAIM RAS TANURA STRIKE',
    deck: 'SAUDI COALITION HITS HODEIDAH IN REPLY',
    src: 'JUST SECURITY, OILPRICE', badge: 'CLAIM', scene: 'refinery', lon: 48, lat: 17, cc: 'SA', also: '' },
  { n: 4, region: 'ASIA', loc: 'JIUQUAN, CHINA', kicker: 'SPACE • JIUQUAN',
    headline: 'SHENZHOU-24 DOCKS AT TIANGONG',
    deck: 'FIRST PAKISTANI IN ORBIT',
    src: 'XINHUA', badge: 'REPORTED', scene: 'rocket', lon: 100.3, lat: 39.8, cc: 'CN', also: '' },
  { n: 5, region: 'ASIA', loc: 'BOGOR, INDONESIA', kicker: 'DISASTER • BOGOR',
    headline: 'MINE FLOOD: 9 DEAD, 17 TRAPPED',
    deck: 'FIRST REPORTED WEDNESDAY',
    src: 'REUTERS', badge: 'REPORTED', scene: 'mine', lon: 106.8, lat: -6.6, cc: 'ID', also: '' },
  { n: 6, region: 'EUROPE', loc: 'SAVASLEYKA, RUSSIA', kicker: 'WAR • SAVASLEYKA',
    headline: 'UKRAINE SAYS 5 PLANES HIT AT AIR BASE',
    deck: '3 MIG-31S, 2 SU-34S — CLAIM',
    src: 'REUTERS', badge: 'CLAIM', scene: 'jets', lon: 48, lat: 58, cc: 'RU', also: '' },
  { n: 7, region: 'EUROPE', loc: 'ODESA, UKRAINE', kicker: 'WAR • ODESA',
    headline: 'RUSSIAN STRIKE KILLS 2 IN ODESA',
    deck: '9,000 HOMES LOSE POWER',
    src: 'REUTERS', badge: 'REPORTED', scene: 'city', lon: 28, lat: 44, cc: 'UA', also: '' },
  { n: 8, region: 'NAMER', loc: 'WASHINGTON, USA', kicker: 'ECONOMY • WASHINGTON',
    headline: 'INFLATION HOT: PCE 3.8%',
    deck: 'S&P 500 CLOSES 7,182.78, -0.25%',
    src: 'INVESTINGLIVE', badge: 'REPORTED', scene: 'chartDown', lon: -77, lat: 39, cc: 'US', also: '' },
  { n: 9, region: 'NAMER', loc: 'GULF OF MEXICO', kicker: 'FOUND • GULF OF MEXICO',
    headline: 'CESSNA WRECK FOUND: 6 DEAD',
    deck: 'CRASH TUESDAY; FOUND WED.',
    src: 'USA TODAY', badge: 'REPORTED', scene: 'planeCrash', lon: -89, lat: 30.2, cc: 'US', also: '' },
  { n: 10, region: 'LATAM', loc: 'CARTAGENA, COLOMBIA', kicker: 'FREED • CARTAGENA',
    headline: 'ALL HOSTAGES FREED AFTER 17 HOURS',
    deck: '1 GUNMAN KILLED, 4 HELD',
    src: 'AP', badge: 'REPORTED', scene: 'hostage', lon: -75.5, lat: 10.4, cc: 'CO', also: '' },
  { n: 11, region: 'MIDEAST', loc: 'GAZA', kicker: 'WAR • GAZA',
    headline: 'ISRAELI STRIKE KILLS HAMAS COLONEL',
    deck: 'WIFE, 2 CHILDREN KILLED',
    src: 'JUST SECURITY', badge: 'REPORTED', scene: 'city', lon: 30, lat: 32, cc: 'PS', also: '' },
  { n: 12, region: 'AFRICA', loc: 'CAIRO, EGYPT', kicker: 'DISASTER • CAIRO',
    headline: 'TANKER FIRE KILLS 31 IN CAIRO',
    deck: '21 HURT; CARS BURNED',
    src: 'REUTERS, AP', badge: 'REPORTED', scene: 'fire', lon: 31.2, lat: 30, cc: 'EG', also: '' },
  { n: 13, region: 'PACIFIC', loc: 'CANBERRA, AUSTRALIA', kicker: 'TREATY • CANBERRA',
    headline: 'AUSTRALIA-SOLOMON SIGN SECURITY PACT',
    deck: '$740M OVER A DECADE',
    src: 'DFAT', badge: 'REPORTED', scene: 'treaty', lon: 149.1, lat: -35.3, cc: 'AU', also: '' },
  { n: 14, region: 'ASIA', loc: 'SEOUL', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'chartDown', lon: 127, lat: 37.5, cc: 'KR',
    also: 'KOSPI -6.2% AS AI DOUBTS HIT CHIP STOCKS' },
  { n: 15, region: 'ASIA', loc: 'GAZIPUR', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'crowd', lon: 90.4, lat: 24, cc: 'BD',
    also: 'WORKERS REJECT 36% PAY RISE IN GAZIPUR' },
  { n: 16, region: 'ASIA', loc: 'PYONGYANG', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'flags', lon: 125.8, lat: 39, cc: 'KP',
    also: 'NORTH KOREA EXPELS SWISS DIPLOMAT' },
  { n: 17, region: 'ASIA', loc: 'FUKUOKA', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'city', lon: 130.4, lat: 33.6, cc: 'JP',
    also: 'PARKING ATTENDANT STABBED DEAD IN FUKUOKA' },
  { n: 18, region: 'EUROPE', loc: 'THE HAGUE', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'flags', lon: -2, lat: 56, cc: 'NL',
    also: '34 NATIONS: HALT TEAR GAS IN UKRAINE WAR' },
  { n: 19, region: 'EUROPE', loc: 'BERLIN', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'parliament', lon: 16, lat: 54, cc: 'DE',
    also: 'MERZ DEFENDS UKRAINE AID IN BERLIN' },
  { n: 20, region: 'EUROPE', loc: 'STRASBOURG', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'tree', lon: 8, lat: 46, cc: 'EU',
    also: 'EU VOTES 376-268 TO WEAKEN NATURE LAW' },
  { n: 21, region: 'NAMER', loc: 'SANTA CLARA', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'chip', lon: -122, lat: 37.4, cc: 'US',
    also: 'NVIDIA BOSS APOLOGISES — REPORTED WED.' },
  { n: 22, region: 'NAMER', loc: 'MADRID', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'personPlane', lon: -8, lat: 39, cc: 'ES',
    also: 'ABREGO GARCIA LANDS IN MADRID, FREE' },
  { n: 23, region: 'LATAM', loc: 'CORDOBA', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'factory', lon: -64.2, lat: -31.4, cc: 'AR',
    also: 'STELLANTIS OPENS FIRST ENGINE PLANT' },
  { n: 24, region: 'LATAM', loc: 'SAO PAULO', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'plane', lon: -46.6, lat: -23.5, cc: 'BR',
    also: 'US PROPOSES 10% DUTY ON EMBRAER JETS' },
  { n: 25, region: 'MIDEAST', loc: 'GAZA', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'report', lon: 44, lat: 40, cc: 'PS',
    also: 'AMNESTY: WOMEN BEAR CRUSHING TOLL IN GAZA' },
  { n: 26, region: 'MIDEAST', loc: 'HODEIDAH', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'port', lon: 40, lat: 11, cc: 'YE',
    also: 'SAUDI COALITION STRIKES HODEIDAH PORT' },
  { n: 27, region: 'MIDEAST', loc: 'HORMUZ', kicker: '', headline: '', deck: '', src: '', badge: 'CLAIM', scene: 'drone', lon: 63, lat: 32, cc: 'IR',
    also: 'IRAN CLAIMS 2 US DRONES DOWNED' },
  { n: 28, region: 'AFRICA', loc: 'BLUE NILE', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'desert', lon: 34.4, lat: 11.2, cc: 'SD',
    also: 'RSF DRONE STRIKE KILLS 19 IN SUDAN' },
  { n: 29, region: 'AFRICA', loc: 'CAPE TOWN', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'court', lon: 18.4, lat: -33.9, cc: 'ZA',
    also: 'RAMAPHOSA WINS; IMPEACHMENT CASE DIES' },
  { n: 30, region: 'AFRICA', loc: 'MOMBASA', kicker: '', headline: '', deck: '', src: '', badge: 'REPORTED', scene: 'court', lon: 39.7, lat: -4.05, cc: 'KE',
    also: 'CULT LEADER CONVICTED ON NEW CHARGES' },
];

// ---------- badges ----------
function badge(b: Badge, x: number, y: number): number {
  const w = textW(b, 1, true) + 8;
  rect(x, y, w, 12, BADGE_C[b]);
  drawText(b, x + 4, y + 3, 1, WHITE, { bold: true });
  return w;
}
function numBadge(n: number, cx: number, cy: number, r = 8): void {
  circle(cx, cy, r, RED);
  ring(cx, cy, r, WHITE);
  const s = String(n);
  drawText(s, cx - Math.floor(textW(s, 1, true) / 2), cy - 3, 1, WHITE, { bold: true });
}

// ---------- masthead ----------
function drawMasthead(): void {
  rect(10, 8, 1004, 26, NAVY);
  drawText('THE WORLD TODAY', 22, 15, 2, WHITE, { bold: true });
  drawText('30 STORIES • 7 REGIONS • ALL FROM THIS ONE DAY', 1002, 15, 1, GOLD, { bold: true, align: 'right' });
  // giant serif date
  drawText('WEDNESDAY 25 NOVEMBER 2026', 512, 42, 5, INK, { bold: true, align: 'center' });
  line(10, 84, 1014, 84, INK);
  drawText('TARIFFS HIT 14 PARTNERS • 2 TANKERS HIT • HOUTHIS CLAIM RAS TANURA', 512, 90, 2, RED, { bold: true, align: 'center' });
  // region chips
  const chips: [Region, string][] = [
    ['ASIA', 'ASIA 6'], ['EUROPE', 'EUROPE 5'], ['NAMER', 'N. AMER 5'],
    ['LATAM', 'LATAM 3'], ['MIDEAST', 'MIDEAST 6'], ['AFRICA', 'AFRICA 4'], ['PACIFIC', 'PACIFIC 1'],
  ];
  let cx = 512 - 0;
  let total = 0;
  for (const [, label] of chips) total += textW(label, 1, true) + 16;
  total += 6 * 8;
  cx = 512 - Math.floor(total / 2);
  for (const [reg, label] of chips) {
    const w = textW(label, 1, true) + 16;
    rect(cx, 108, w, 16, RC[reg]);
    drawText(label, cx + 8, 112, 1, WHITE, { bold: true });
    cx += w + 8;
  }
}

// ---------- lead card ----------
function drawLead(s: Story, x: number, y: number, w: number, h: number): void {
  outline(x, y, w, h, LINE, 1);
  // location bar
  rect(x, y, w, 18, NAVY);
  numBadge(s.n, x + 11, y + 9, 7);
  drawText(s.loc, x + 22, y + 6, 1, WHITE, { bold: true });
  const bw = badge(s.badge, x + w - 8 - (textW(s.badge, 1, true) + 8), y + 3);
  void bw;
  // scene
  paintScene(s.scene, x + 1, y + 19, w - 2, 88);
  let ty = y + 19 + 88 + 6;
  drawText(s.kicker, x + 6, ty, 1, RED, { bold: true });
  ty += 10;
  const hl = wrapText(s.headline, w - 12, 2, false);
  for (const ln of hl.slice(0, 3)) {
    drawText(ln, x + 6, ty, 2, INK, {});
    ty += 16;
  }
  const dk = wrapText(s.deck, w - 12, 1, false);
  for (const ln of dk.slice(0, 2)) {
    drawText(ln, x + 6, ty, 1, INK, {});
    ty += 9;
  }
  drawText(s.src, x + 6, y + h - 10, 1, GRAY, {});
}

// ---------- numbers panel ----------
function drawNumbers(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, NAVY);
  drawText('THE DAY IN NUMBERS', x + w / 2, y + 8, 1, WHITE, { bold: true, align: 'center' });
  line(x + 8, y + 22, x + w - 8, y + 22, NAVY2);
  const rows: [string, string][] = [
    ['14', 'TARIFFS'], ['2', 'TANKERS'], ['31', 'DEAD IN CAIRO'],
    ['19', 'KILLED IN SUDAN'], ['9', 'MINERS IN BOGOR'], ['5', 'PLANES HIT'],
    ['36%', 'PAY RISE, REJECTED'], ['-6.2%', 'KOSPI'],
  ];
  let ry = y + 20;
  for (const [num, label] of rows) {
    drawText(num, x + 10, ry, 2, GOLD, { bold: true });
    drawText(label, x + 108, ry + 4, 1, WHITE, { bold: true });
    ry += 23;
  }
}

// ---------- medium card ----------
function drawMedium(s: Story, x: number, y: number, w: number, h: number): void {
  outline(x, y, w, h, LINE, 1);
  paintScene(s.scene, x + 1, y + 1, w - 2, 40);
  numBadge(s.n, x + 11, y + 11, 7);
  badge(s.badge, x + w - 8 - (textW(s.badge, 1, true) + 8), y + 4);
  drawText(s.kicker, x + 6, y + 45, 1, RED, { bold: true });
  const hl = wrapText(s.headline, w - 12, 1, true);
  let ty = y + 57;
  for (const ln of hl.slice(0, 2)) {
    drawText(ln, x + 6, ty, 1, INK, { bold: true });
    ty += 9;
  }
  const dk = wrapText(s.deck, w - 12, 1, false);
  if (dk.length > 0) drawText(dk[0], x + 6, y + 77, 1, INK, {});
  drawText(s.src, x + 6, y + h - 9, 1, GRAY, {});
}

// ---------- ALSO list ----------
function drawAlso(): void {
  drawText('ALSO ON WEDNESDAY 25 NOVEMBER', 10, 562, 2, INK, { bold: true });
  // legend on the right
  let lx = 1014;
  const lg: [Badge, string][] = [['REPORTED', 'REPORTED'], ['CLAIM', 'CLAIM'], ['ONGOING', 'ONGOING']];
  for (let i = lg.length - 1; i >= 0; i--) {
    const [b, label] = lg[i];
    const w = textW(label, 1, true) + 8;
    lx -= w;
    rect(lx, 560, w, 12, BADGE_C[b]);
    drawText(label, lx + 4, 563, 1, WHITE, { bold: true });
    lx -= 8;
  }
  const cols: [number, number][] = [[10, 6], [226, 6], [442, 5]];
  let idx = 14;
  for (const [cx, count] of cols) {
    let cy = 586;
    for (let i = 0; i < count; i++) {
      const s = STORIES[idx - 1];
      idx++;
      // flag with country code
      rect(cx, cy + 1, 16, 10, RC[s.region]);
      drawText(s.cc, cx + 1, cy + 3, 1, WHITE, { bold: true });
      drawText(String(s.n), cx + 20, cy + 2, 1, RED, { bold: true });
      const lines = wrapText(s.also, 210 - 38, 1, false);
      let ty = cy + 1;
      for (const ln of lines.slice(0, 2)) {
        drawText(ln, cx + 38, ty, 1, INK, { bold: true });
        ty += 9;
      }
      drawText(s.loc, cx + 38, cy + 21, 1, GRAY, {});
      cy += 46;
    }
  }
}

// ---------- world map ----------
const LAND: [number, number, number, number][] = [
  [98, 41, 90, 30], [152, 80, 25, 10], [142, 11, 23, 11], [222, 98, 44, 36],
  [188, 30, 31, 17], [173, 20, 9, 9], [189, 86, 38, 39], [212, 123, 7, 11],
  [276, 43, 76, 34], [245, 77, 16, 18], [265, 82, 21, 14], [296, 100, 46, 8],
  [318, 55, 9, 16], [300, 116, 26, 12], [326, 134, 7, 11],
];
function inLand(px: number, py: number): boolean {
  for (const [cx, cy, rx, ry] of LAND) {
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}
function drawMap(x: number, y: number, w: number, h: number): void {
  outline(x, y, w, h, LINE, 1);
  drawText('WHERE IT HAPPENED', x + 8, y + 6, 1, INK, { bold: true });
  drawText('pins = story numbers', x + w - 8, y + 6, 1, GRAY, { align: 'right' });
  const mx = x + 2;
  const my = y + 22;
  const mw = w - 4;
  const mh = 150;
  // dotted land
  for (let gy = 0; gy < mh; gy += 5) {
    for (let gx = 0; gx < mw; gx += 5) {
      if (inLand(gx, gy)) rect(mx + gx, my + gy, 2, 2, [120, 130, 140]);
    }
  }
  // region labels
  drawText('N. AMERICA', mx + 30, my + 8, 1, INK, {});
  drawText('S. AMERICA', mx + 150, my + 92, 1, INK, {});
  drawText('EUROPE', mx + 165, my + 8, 1, INK, {});
  drawText('AFRICA', mx + 165, my + 76, 1, INK, {});
  drawText('ASIA', mx + 255, my + 14, 1, INK, {});
  drawText('PACIFIC', mx + 240, my + 132, 1, INK, {});
  // pins
  for (const s of STORIES) {
    const px = mx + ((s.lon + 180) / 360) * mw;
    const py = my + ((85 - s.lat) / 145) * mh;
    circle(px, py, 6, RED);
    ring(px, py, 6, WHITE);
    const t = String(s.n);
    drawText(t, px - Math.floor(textW(t, 1, true) / 2), py - 3, 1, WHITE, { bold: true });
  }
  // region tally
  let ty = y + 180;
  drawText('BY REGION', x + 8, ty, 1, RED, { bold: true });
  ty += 12;
  const tally: [Region, string, string][] = [
    ['ASIA', 'ASIA 6', '4, 5, 14, 15, 16, 17'],
    ['EUROPE', 'EUROPE 5', '6, 7, 18, 19, 20'],
    ['NAMER', 'N. AMER 5', '1, 8, 9, 21, 22'],
    ['LATAM', 'LATAM 3', '10, 23, 24'],
    ['MIDEAST', 'MIDEAST 6', '2, 3, 11, 25, 26, 27'],
    ['AFRICA', 'AFRICA 4', '12, 28, 29, 30'],
    ['PACIFIC', 'PACIFIC 1', '13'],
  ];
  for (const [reg, label, nums] of tally) {
    rect(x + 8, ty + 1, 10, 8, RC[reg]);
    drawText(label, x + 22, ty, 1, INK, { bold: true });
    drawText(nums, x + 110, ty, 1, GRAY, {});
    ty += 13;
  }
}

// ---------- footer ----------
function drawFooter(): void {
  // DATE CHECK box
  outline(10, 880, 1004, 70, RED, 2);
  drawText('DATE CHECK —', 22, 890, 1, RED, { bold: true });
  drawText('EVERY STORY HERE HAPPENED OR WAS FIRST REPORTED ON WED 25 NOV 2026, IN ANY TIME ZONE.', 22 + textW('DATE CHECK — ', 1, true), 890, 1, INK, {});
  drawText('STORIES FIRST REPORTED WEDNESDAY ARE LABELLED FOUND / FREED / REPORTED.', 22, 904, 1, INK, {});
  drawText('LEFT OUT:', 22, 920, 1, RED, { bold: true });
  drawText('HUAWEI VERDICT (24 NOV) • RIYADH TOWER (24 NOV) • BENGHAZI SHIP (23 NOV) • CIA BREACH (24 NOV) • GIULIANI MEDAL (24 NOV)', 22 + textW('LEFT OUT: ', 1, true), 920, 1, INK, {});
  drawText('SOURCES: REUTERS • AP • JUST SECURITY • XINHUA • BBC • HOW SURE: REPORTED = DAY\'S WIRES OR OFFICIALS • CLAIM = ONE SIDE\'S ACCOUNT • ONGOING = STILL UNFOLDING', 512, 958, 1, GRAY, { align: 'center' });
  drawText('SCENES ARE DRAWN ILLUSTRATIONS, NOT PHOTOGRAPHS.', 512, 970, 1, GRAY, { align: 'center' });
  outline(4, 4, 1016, 1016, INK, 2);
}

// ---------- main ----------
function main(): void {
  rect(0, 0, W, H, PAPER);
  drawMasthead();
  // leads row
  const leads = [STORIES[0], STORIES[1], STORIES[2]];
  const lx = [10, 261, 512];
  for (let i = 0; i < 3; i++) drawLead(leads[i], lx[i], 134, 244, 202);
  drawNumbers(762, 134, 252, 202);
  // medium cards, 2 rows of 5
  const med = STORIES.slice(3, 13);
  const mx = [10, 212, 414, 616, 818];
  for (let i = 0; i < 5; i++) drawMedium(med[i], mx[i], 344, 196, 100);
  for (let i = 0; i < 5; i++) drawMedium(med[i + 5], mx[i], 452, 196, 100);
  // also + map
  drawAlso();
  drawMap(660, 584, 354, 288);
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}
main();
