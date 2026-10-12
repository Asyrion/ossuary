/* The room kit's floors and walls (M3.5 step 3; the proof dresses the crypt): pixel art drawn texel by texel at the
   game's own pixel size, `CFG.roomKit.texel` texels to a unit across and down (the floor, seen from 45° above, is
   shorter down the screen than across it, so its texels are too; on screen they come out square, about 1.3 of the
   pixel look's pixels at 540 lines and one in the great halls). Bevelled slabs and bricks with cracks and chips,
   stains and damp in ordered dither, bones and skulls as little sprites, the room's edges darkened in dithered steps,
   and the special rooms' marks (textures.ts, `drawMarks`) hardened into whole texels. Seeded: a room looks the same
   every time. Sampled nearest up close, so the texels stay crisp; mipmapped when smaller (360 lines and below). */
import * as THREE from 'three';
import { CFG } from '../config';
import type { FloorLook, RoomType } from '../types';
import { mulberry } from '../util';
import type { FloorKind, WallKind } from '../world/kitData';
import { renderer } from './renderer';
import { MARKED_ROOMS, cacheFloor, cachedFloor, drawMarks } from './textures';

type RGB = [number, number, number];
const hex = (s: string): RGB => { const n = parseInt(s.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const csv = (s: string): RGB => s.split(',').map(Number) as RGB;
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

// ordered dither: a 4 × 4 Bayer matrix of thresholds
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];
/** A texel's own noise, 0 to 1, the same every time. */
const hash = (x: number, y: number, s: number) => { let h = Math.imul(x * 374761393 + y * 668265263 + s * 2246822519, 3266489917); h ^= h >>> 15; return (h >>> 0) / 4294967296; };

/** A picture made texel by texel; `wrap` for a tile that repeats. */
class Px {
  readonly d: Uint8ClampedArray<ArrayBuffer>;
  constructor(readonly w: number, readonly h: number, readonly wrap = false) { this.d = new Uint8ClampedArray(new ArrayBuffer(w * h * 4)); }
  private at(x: number, y: number) {
    if (this.wrap) { x = ((x % this.w) + this.w) % this.w; y = ((y % this.h) + this.h) % this.h; } else if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return (y * this.w + x) * 4;
  }
  set(x: number, y: number, c: RGB) { const i = this.at(x, y); if (i < 0) return; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; }
  get(x: number, y: number): RGB { const i = this.at(x, y); return i < 0 ? [0, 0, 0] : [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  /** Darken (k < 1) or lighten (k > 1). */
  mul(x: number, y: number, k: number) { this.set(x, y, scale(this.get(x, y), k)); }
  /** Move towards `c` by `a`. */
  mix(x: number, y: number, c: RGB, a: number) { const o = this.get(x, y); this.set(x, y, [o[0] + (c[0] - o[0]) * a, o[1] + (c[1] - o[1]) * a, o[2] + (c[2] - o[2]) * a]); }
  fill(c: RGB) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, c); }
  /** A soft patch in ordered dither: texels within `r` (`ry` down) of (cx, cy) move towards `c` by `a` where the
      patch is stronger than their threshold. */
  blotch(cx: number, cy: number, r: number, ry: number, strength: number, fn: (x: number, y: number) => void) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot((x - cx) / r, (y - cy) / ry); if (d >= 1) continue;
      if ((1 - d) * strength > bayer(x, y)) fn(x, y);
    }
  }
  canvas() { const c = document.createElement('canvas'); c.width = this.w; c.height = this.h; c.getContext('2d')!.putImageData(new ImageData(this.d, this.w, this.h), 0, 0); return c; }
}

function texture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}

/* ---------- walls ---------- */

/** A block of stone or brick from (x0, y0), `w` × `h` texels with its joint on the left and top: bevelled (lit along
    the top, shadowed below), pitted and gritty. `s` seeds its grain. */
function block(px: Px, x0: number, y0: number, w: number, h: number, c: RGB, s: number, lip = 1) {
  const fw = w - 1, fh = h - 1;
  for (let fy = 0; fy < fh; fy++) for (let fx = 0; fx < fw; fx++) {
    const x = x0 + 1 + fx, y = y0 + 1 + fy, n = hash(x, y, s);
    let k = fy < lip ? 1.22 : fy >= fh - lip ? .76 : fx === 0 ? 1.08 : fx === fw - 1 ? .84 : 1; // the bevel
    if (n < .07) k *= .8; else if (n > .96) k *= 1.12; // pits and grit
    px.set(x, y, scale(c, k));
  }
}
/** A chipped corner and, now and then, a crack down the block. */
function wear(px: Px, R: () => number, x0: number, y0: number, w: number, h: number, mortar: RGB, crack = .14) {
  const fw = w - 1;
  if (R() < .3) { const right = R() < .5, x = x0 + 1 + (right ? fw - 1 : 0), y = y0 + 1; px.set(x, y, mortar); px.mul(x + (right ? -1 : 1), y, .75); px.mul(x, y + 1, .75); }
  if (fw > 8 && R() < crack) { let x = x0 + 3 + Math.floor(R() * (fw - 6)); for (let y = y0 + 1; y < y0 + h - 1; y++) { px.mul(x, y, .6); if (R() < .5) x += R() < .5 ? -1 : 1; } }
}
/** Lengths that add up to `total`, each between `min` and `max` (a course of blocks that tiles across). */
function lengths(R: () => number, total: number, min: number, max: number) {
  const out: number[] = []; let left = total;
  while (left > 0) { let l = Math.round(min + R() * (max - min)); if (left - l < min) l = left; out.push(l); left -= l; }
  return out;
}
const tint = (base: readonly number[], v: number, k = 1): RGB => scale([base[0] + v, base[1] + v, base[2] + v * .8], k);

/** The Wardens' glyphs (M7, the Seal's stone): five texels across, cut into its walls and floors; some still hold the seal's
    violet light. */
const WARD_GLYPHS = [
  ['..X..', '.XXX.', 'X.X.X', '..X..', '..X..'], ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'], ['XXXXX', '..X..', '.XXX.', '..X..', 'XXXXX'],
  ['.X.X.', '.X.X.', 'XXXXX', '..X..', '.XXX.'], ['..X..', '.X.X.', 'X...X', '.X.X.', '..X..'], ['X.X.X', 'X.X.X', 'XXXXX', '..X..', '..X..'],
];
type WallArt = { px: Px; glow?: Px; units?: number }; // (units: how many units across it spans, 2 unless it says)
/** Each kind of wall, drawn over a tile two units across; the height is the kind's own (the texture repeats down). */
const WALLS: Record<WallKind, (wall: FloorLook['wall'], W: number) => WallArt> = {
  bricks(wall, W) { // courses of bricks in running bond
    const BH = 8, H = BH * 8, BW = W / 4, px = new Px(W, H, true), R = mulberry(5), mortar = hex(wall.mortar);
    px.fill(mortar);
    for (let row = 0; row < H / BH; row++) for (let i = 0; i < 4; i++) {
      const x0 = i * BW + (row % 2 ? BW / 2 : 0), y0 = row * BH;
      block(px, x0, y0, BW, BH, tint(wall.brick, R() * 24 - 12, R() < .1 ? .82 : 1), 5); wear(px, R, x0, y0, BW, BH, mortar);
    }
    return { px };
  },
  ashlar(wall, W) { // big dressed blocks in courses of two heights, some tooled with fine diagonal chisel marks
    const courses = [16, 12, 16, 20], H = 64, px = new Px(W, H, true), R = mulberry(15), mortar = hex(wall.mortar);
    px.fill(mortar);
    let y0 = 0;
    for (const ch of courses) {
      let x0 = Math.floor(R() * 20);
      for (const l of lengths(R, W, 22, 42)) {
        const c = tint(wall.brick, R() * 20 - 6, 1.05);
        block(px, x0, y0, l, ch, c, 15, 2); wear(px, R, x0, y0, l, ch, mortar, .1);
        if (R() < .45) for (let fy = 3; fy < ch - 3; fy++) for (let fx = 3; fx < l - 3; fx++) if ((fx + fy) % 4 === 0) px.mul(x0 + fx, y0 + fy, .93); // tooling
        x0 += l;
      }
      y0 += ch;
    }
    return { px };
  },
  bones(wall, W) { // an ossuary's wall: a row of skulls between rows of stacked bone ends, the dark behind them
    const H = 52, px = new Px(W, H, true), R = mulberry(25), dark: RGB = scale(hex(wall.mortar), .7), bone = tint(wall.brick, 0, 1).map((v, i) => v * .35 + [205, 192, 164][i] * .65) as RGB;
    px.fill(dark);
    const SK = ['..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'XOOXXXOOX', 'XOOXXXOOX', 'XXXXNXXXX', '.XXXXXXX.', '..XTXTX..'];
    const skulls = (y0: number, off: number) => {
      for (let i = 0; i < W / 12; i++) {
        const x0 = i * 12 + off, k = .8 + R() * .3;
        SK.forEach((row, v) => [...row].forEach((ch, u) => {
          if (ch === '.') return;
          const lit = v <= 1 || u <= 1 ? 1.15 : v >= 6 || u >= 7 ? .78 : 1;
          px.set(x0 + u + 1, y0 + v + 1, ch === 'X' || ch === 'T' ? scale(bone, k * lit) : scale(dark, .6));
        }));
      }
    };
    const ends = (y0: number, off: number) => { // the knuckle ends of long bones, stacked
      for (let i = 0; i < W / 6; i++) {
        const x0 = i * 6 + off, k = .75 + R() * .3;
        for (let v = 0; v < 4; v++) for (let u = 0; u < 5; u++) {
          if ((v === 0 || v === 3) && (u === 0 || u === 4)) continue;
          px.set(x0 + u, y0 + v, scale(bone, k * (v === 0 ? 1.15 : v === 3 ? .75 : u === 4 ? .85 : 1)));
        }
        if (R() < .3) px.set(x0 + 2, y0 + 1, scale(bone, .55)); // a marrow hole
      }
    };
    skulls(0, 0); for (let r = 0; r < 3; r++) ends(10 + r * 5, (r % 2) * 3);
    skulls(26, 6); for (let r = 0; r < 3; r++) ends(36 + r * 5, (r % 2) * 3 + 1);
    return { px };
  },
  tide(wall, W) { // big blocks with the drowned floor's water line: stained and furred below it, bright algae along it
    const H = 48, px = new Px(W, H, true), R = mulberry(35), mortar = hex(wall.mortar), line = H - 14; // (the line 0.4 units up)
    px.fill(mortar);
    let y0 = 0;
    for (const ch of [12, 12, 12, 12]) {
      let x0 = Math.floor(R() * 16);
      for (const l of lengths(R, W, 20, 36)) { block(px, x0, y0, l, ch, tint(wall.brick, R() * 18 - 9), 35, 1); wear(px, R, x0, y0, l, ch, mortar, .08); x0 += l; }
      y0 += ch;
    }
    const water: RGB = [22, 46, 40], algae: RGB = [120, 150, 70];
    for (let y = line; y < H; y++) for (let x = 0; x < W; x++) px.mix(x, y, water, .45 + (y - line) / (H - line) * .2);
    for (let x = 0; x < W; x++) { const wob = Math.round(Math.sin(x * .4) * .8); px.mix(x, line + wob, algae, .7); if (bayer(x, 0) < .5) px.mix(x, line + wob + 1, algae, .35); }
    for (let k = 0; k < 40; k++) { const x = Math.floor(R() * W), y = line + 2 + Math.floor(R() * (H - line - 3)); px.mix(x, y, [170, 175, 160], .6); px.mul(x, y + 1, .7); } // barnacles
    for (let k = 0; k < 8; k++) { const x = Math.floor(R() * W); for (let y = line - 1 - Math.floor(R() * 10); y < line; y++) px.mul(x, y, .8); } // drips
    return { px };
  },
  rubble(wall, W) { // rounded field stones of all sizes packed in mortar, moss in the joints
    const H = 48, px = new Px(W, H, true), R = mulberry(45), mortar = hex(wall.mortar);
    px.fill(mortar);
    for (let row = 0; row < 6; row++) {
      let x = Math.floor(R() * 8);
      while (x < W + 4) {
        const rx = 4 + R() * 4, ry = 3 + R() * 1.5, cx = x + rx, cy = row * 8 + 4 + (R() - .5) * 2, c = tint(wall.brick, R() * 26 - 13);
        for (let v = Math.floor(-ry); v <= ry; v++) for (let u = Math.floor(-rx); u <= rx; u++) {
          const d = (u / rx) ** 2 + (v / ry) ** 2; if (d > 1) continue;
          const lit = -u / rx * .25 - v / ry * .45, k = lit > .22 ? 1.2 : lit > 0 ? 1.05 : lit > -.25 ? .92 : .78; // (lit from above, in four bands)
          px.set(Math.round(cx + u), Math.round(cy + v), scale(c, k * (hash(Math.round(cx + u), Math.round(cy + v), 45) < .06 ? .82 : 1)));
        }
        x += rx * 2 + 1;
      }
    }
    const moss: RGB = [52, 90, 58], m = hex(wall.mortar);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = px.get(x, y); if (Math.abs(c[0] - m[0]) + Math.abs(c[1] - m[1]) < 6 && bayer(x, y) < .45) px.set(x, y, scale(moss, .6 + hash(x, y, 46) * .4)); }
    return { px };
  },
  basalt(wall, W2) { // columns of black basalt, their faces lit on one side, embers glowing in some of the seams (four units
    // across, so the seams' embers don't fall into a rhythm along a low wall)
    const W = W2 * 2, H = 48, px = new Px(W, H, true), glow = new Px(W, H, true), R = mulberry(55), seam: RGB = scale(hex(wall.mortar), .8);
    px.fill(seam); glow.fill([0, 0, 0]);
    const dark = tint(wall.brick, 0, .55).map((v, i) => v + [0, 2, 8][i]) as RGB;
    let x0 = 0;
    for (const cw of lengths(R, W, 9, 14)) {
      let y0 = Math.floor(R() * 10) - 10;
      while (y0 < H) {
        const sh = 10 + Math.floor(R() * 16), c = scale(dark, .85 + R() * .3);
        for (let y = y0 + 1; y < y0 + sh; y++) for (let x = x0 + 1; x < x0 + cw; x++) {
          const u = x - x0 - 1, k = u === 0 ? 1.45 : u === 1 ? 1.2 : u === cw - 2 ? .7 : y === y0 + 1 ? 1.15 : 1; // (a prism: lit on its left face)
          px.set(x, y, scale(c, k * (hash(x, y, 55) < .05 ? .8 : 1)));
        }
        y0 += sh;
      }
      if (R() < .4) { // an ember seam, smouldering in stretches
        const from = Math.floor(R() * H), len = 8 + Math.floor(R() * 16);
        for (let i = 0; i < len; i++) { const y = from + i, hot = Math.sin(i / len * Math.PI) * (.7 + .3 * Math.sin(i * 1.3)); px.set(x0, y, [120 + 110 * hot, 40 + 70 * hot, 16]); glow.set(x0, y, [255 * hot, 110 * hot, 20 * hot]); }
      }
      x0 += cw;
    }
    return { px, glow, units: 4 };
  },
  beams(wall, W) { // courses of sooty stone with a charred beam laid through them, embers smouldering in its cracks
    const H = 48, px = new Px(W, H, true), glow = new Px(W, H, true), R = mulberry(65), mortar = hex(wall.mortar);
    px.fill(mortar); glow.fill([0, 0, 0]);
    const stone = (y0: number, h: number) => { let x0 = Math.floor(R() * 12); for (const l of lengths(R, W, 14, 26)) { block(px, x0, y0, l, h, tint(wall.brick, R() * 20 - 10, .9), 65); wear(px, R, x0, y0, l, h, mortar); x0 += l; } };
    stone(0, 10); stone(10, 10); stone(30, 9); stone(39, 9); // (the beam between: rows 20 to 29)
    const wood: RGB = [78, 50, 32];
    for (let y = 20; y < 30; y++) for (let x = 0; x < W; x++) {
      const grain = Math.sin(x * .35 + y * 1.7 + Math.sin(x * .07) * 3), k = y === 20 ? 1.45 : y === 21 ? 1.2 : y === 29 ? .5 : grain > .6 ? .72 : 1;
      px.set(x, y, scale(wood, k * (.85 + hash(x, y, 66) * .3)));
    }
    for (let k = 0; k < 7; k++) { // cracks in the char, smouldering
      let x = Math.floor(R() * W); const y = 23 + Math.floor(R() * 5), len = 4 + Math.floor(R() * 8);
      for (let i = 0; i < len; i++, x++) { const hot = .5 + R() * .5; px.set(x, y, [150 + 90 * hot, 50 + 40 * hot, 10]); glow.set(x, y, [230 * hot, 90 * hot, 10]); }
    }
    return { px, glow };
  },
  marble(wall, W) { // the Reliquary's (M4.1): great slabs of veined marble, finely jointed and polished, a sheen along each top
    const H = 64, px = new Px(W, H, true), R = mulberry(75), joint = scale(hex(wall.mortar), 1.8), pale: RGB = [wall.brick[0] * .4 + 206 * .6, wall.brick[1] * .4 + 202 * .6, wall.brick[2] * .4 + 196 * .6]; // (pale and cool: marble, not sandstone, under the warm candles)
    px.fill(joint);
    let y0 = 0;
    for (const ch of [22, 20, 22]) {
      let x0 = Math.floor(R() * 24);
      for (const l of lengths(R, W, 30, 48)) {
        block(px, x0, y0, l, ch, scale(pale, .92 + R() * .14), 75, 1);
        for (let v = 0; v < 2; v++) { // veins wandering across it, one grey, one with a thread of gold
          let y = y0 + 3 + R() * (ch - 6); const drift = (R() - .5) * .7, vein: RGB = v ? [118, 110, 100] : [168, 132, 70];
          for (let x = x0 + 2; x < x0 + l - 1; x++) {
            y += drift + Math.sin(x * .31 + v * 3 + y0) * .45;
            const yy = Math.round(Math.min(y0 + ch - 2, Math.max(y0 + 1, y))); px.mix(x, yy, vein, .5); if (bayer(x, yy) < .3) px.mix(x, yy + 1, vein, .22);
          }
        }
        for (let fy = 2; fy < ch / 3; fy++) for (let fx = 2; fx < l - 2; fx++) if (bayer(x0 + fx, y0 + fy) < .2 * (1 - fy / (ch / 3))) px.mul(x0 + fx, y0 + fy, 1.08); // (polished)
        x0 += l;
      }
      y0 += ch;
    }
    return { px };
  },
  gilded(wall, W) { // the Reliquary's: panels of dark stone framed in gold between plain courses, a gilt rosette on each
    const H = 64, px = new Px(W, H, true), R = mulberry(85), mortar = hex(wall.mortar), gold: RGB = [196, 156, 74], panel = tint(wall.brick, -12, .6);
    px.fill(mortar);
    for (const [y0, ch] of [[0, 12], [50, 14]] as const) { let x0 = Math.floor(R() * 16); for (const l of lengths(R, W, 20, 32)) { block(px, x0, y0, l, ch, tint(wall.brick, R() * 14 - 7, 1.05), 85); wear(px, R, x0, y0, l, ch, mortar, .06); x0 += l; } }
    for (let p = 0; p < 2; p++) { // a panel a unit
      const x0 = p * W / 2 + 3, y0 = 14, w = W / 2 - 6, h = 34;
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const ex = Math.min(x - x0, x0 + w - 1 - x), ey = Math.min(y - y0, y0 + h - 1 - y);
        if (ex < 2 || ey < 2) px.set(x, y, scale(gold, (y - y0 < 2 || x - x0 < 2 ? 1.25 : .7) * (bayer(x, y) < .12 ? 1.18 : 1))); // the frame, lit from above and left
        else if (ex < 3 || ey < 3) px.set(x, y, scale(panel, .7)); // its shadow inside
        else px.set(x, y, scale(panel, .95 + hash(x, y, 86) * .1));
      }
      const cx = x0 + w / 2, cy = y0 + h / 2; // the rosette: a diamond of gold round a dark heart
      for (let v = -5; v <= 5; v++) for (let u = -5; u <= 5; u++) { const d = Math.abs(u) + Math.abs(v); if (d <= 5) px.set(Math.round(cx + u), Math.round(cy + v), d <= 1 ? scale(gold, .45) : scale(gold, u + v < 0 ? 1.25 : .9)); }
      for (let k = 0; k < 3; k++) px.blotch(x0 + R() * w, y0 + R() * h, 3 + R() * 3, 2 + R() * 2, .8, (x, y) => { const c = px.get(x, y); if (c[0] > 150) px.set(x, y, scale(panel, 1.3)); }); // (gold worn away)
    }
    return { px };
  },
  tracery(wall, W) { // the Reliquary's: blind arcading carved in pale ashlar, four pointed arches to two units, a roundel between each two
    const H = 64, px = new Px(W, H, true), R = mulberry(95), mortar = hex(wall.mortar), stone = tint(wall.brick, 10, 1.08), deep = scale(stone, .5);
    px.fill(mortar);
    let y0 = 0;
    for (const ch of [16, 16, 16, 16]) { let x0 = Math.floor(R() * 20); for (const l of lengths(R, W, 22, 40)) { block(px, x0, y0, l, ch, scale(stone, .92 + R() * .1), 95, 1); x0 += l; } y0 += ch; }
    const AW = W / 4, a = AW / 2 - 3, r = a * 1.6, spring = 30, sill = 58;
    for (let i = 0; i < 4; i++) {
      const cx = i * AW + AW / 2;
      for (let y = 8; y < sill; y++) for (let x = Math.floor(cx - a - 2); x <= cx + a + 2; x++) {
        const dx = Math.abs(x - cx), inArc = (grow: number) => y >= spring ? dx < a + grow : Math.hypot(x - (cx + (r - a)), y - spring) < r + grow && Math.hypot(x - (cx - (r - a)), y - spring) < r + grow; // (a pointed head: two arcs)
        if (inArc(0)) px.set(x, y, scale(deep, x < cx - a + 2 ? .75 : 1)); // the recess, shadowed on its left by the moulding
        else if (inArc(2)) px.set(x, y, scale(stone, x < cx ? 1.28 : .78)); // the moulding, lit on its left
      }
      for (let x = Math.floor(cx - a - 2); x <= cx + a + 2; x++) { px.set(x, sill, scale(stone, 1.3)); px.set(x, sill + 1, scale(stone, .7)); } // its sill
      if (i % 2) { const rx = i * AW, ry = 12; for (let v = -5; v <= 5; v++) for (let u = -5; u <= 5; u++) { const d = Math.hypot(u, v); if (d < 3.2) px.set(rx + u, ry + v, deep); else if (d < 5) px.set(rx + u, ry + v, scale(stone, u + v < 0 ? 1.25 : .8)); } } // a roundel
    }
    return { px };
  },
  slate(wall, W) { // the Shore's (M4.1): thin courses of split slate laid dry, dark and laminated, their top edges catching the light
    const H = 48, px = new Px(W, H, true), R = mulberry(105), slate = tint(wall.brick, 0, .85);
    px.fill(scale(hex(wall.mortar), .8));
    for (let y0 = 0; y0 < H;) {
      const ch = Math.min(3 + Math.floor(R() * 3), H - y0); let x0 = Math.floor(R() * 16);
      for (const l of lengths(R, W, 10, 30)) {
        const c = scale(slate, .8 + R() * .35);
        for (let y = y0; y < y0 + ch - 1; y++) for (let x = x0 + 1; x < x0 + l; x++) px.set(x, y, scale(c, (y === y0 ? 1.35 : y === y0 + ch - 2 && ch > 2 ? .75 : 1) * (hash(x, y, 105) < .05 ? .85 : 1)));
        x0 += l;
      }
      y0 += ch;
    }
    return { px };
  },
  drystone(wall, W) { // the Shore's: round river stones set dry, no mortar, the dark between them
    const H = 48, px = new Px(W, H, true), R = mulberry(115);
    px.fill(scale(hex(wall.mortar), .7));
    for (let row = 0; row < 5; row++) {
      let x = Math.floor(R() * 8) - 4;
      while (x < W + 6) {
        const rx = 5 + R() * 3.5, ry = 3.8 + R() * 1.4, cx = x + rx, cy = row * 9.6 + 5 + (R() - .5) * 2, v = R() * 24 - 12, c: RGB = [wall.brick[0] + v - 2, wall.brick[1] + v, wall.brick[2] + v + 4];
        for (let dv = Math.floor(-ry); dv <= ry; dv++) for (let u = Math.floor(-rx); u <= rx; u++) {
          const d = (u / rx) ** 2 + (dv / ry) ** 2; if (d > 1) continue;
          const lit = -u / rx * .25 - dv / ry * .5, k = lit > .25 ? 1.3 : lit > .02 ? 1.08 : lit > -.3 ? .9 : .7; // (lit from above, in four bands)
          px.set(Math.round(cx + u), Math.round(cy + dv), scale(c, k * (hash(Math.round(cx + u), Math.round(cy + dv), 115) < .05 ? .85 : 1)));
        }
        x += rx * 2 + .5;
      }
    }
    return { px };
  },
  pilings(wall, W) { // the Shore's: a landing's wall of tarred piles, iron-banded, weed and salt at their feet
    const H = 48, px = new Px(W, H, true), R = mulberry(125), tar: RGB = [44, 38, 34], weed: RGB = [44, 70, 54], iron: RGB = [58, 58, 62];
    px.fill(scale(hex(wall.mortar), .6));
    let x0 = 0;
    for (const pw of lengths(R, W, 11, 16)) {
      const c = scale(tar, .85 + R() * .35);
      for (let y = 0; y < H; y++) for (let x = x0 + 1; x < x0 + pw; x++) {
        const u = (x - x0 - 1) / (pw - 2), k = u < .2 ? 1.35 : u < .45 ? 1.1 : u > .82 ? .6 : 1; // (round: lit on its left)
        const grain = Math.sin(x * 1.7 + Math.sin(y * .23 + x0) * 2) > .8 ? .82 : 1;
        px.set(x, y, scale(c, k * grain * (hash(x, y, 125) < .05 ? .8 : 1)));
      }
      for (const by of [9, 33]) for (let x = x0 + 1; x < x0 + pw; x++) { px.set(x, by, scale(iron, 1.3)); px.set(x, by + 1, iron); px.set(x, by + 2, scale(iron, .6)); if ((x - x0) % 5 === 2) px.set(x, by + 1, scale(iron, 1.6)); } // bands and rivets
      for (let y = H - 9; y < H; y++) for (let x = x0 + 1; x < x0 + pw; x++) if (bayer(x, y) < (y - (H - 9)) / 9 * .9) px.mix(x, y, weed, .6); // weed at the foot
      x0 += pw;
    }
    return { px };
  },
  warded(wall, W) { // the Seal's (M7): great blocks of Uzulim's dark volcanic stone, and between every two courses a band of
    // the Wardens' glyphs cut into smoother stone, some still holding the seal's violet light (a glow map)
    const H = 48, px = new Px(W, H, true), glow = new Px(W, H, true), R = mulberry(135), mortar = hex(wall.mortar), stone = tint(wall.brick, 0, .9);
    px.fill(mortar); glow.fill([0, 0, 0]);
    const course = (y0: number, h: number) => { let x0 = Math.floor(R() * 24); for (const l of lengths(R, W, 26, 46)) { block(px, x0, y0, l, h, scale(stone, .82 + R() * .26), 135, 1); wear(px, R, x0, y0, l, h, mortar, .2); x0 += l; } };
    course(0, 18); course(26, 22); // (the band between: rows 18 to 25)
    const band = scale(stone, 1.12), cut = scale(stone, .42);
    for (let y = 18; y < 26; y++) for (let x = 0; x < W; x++) px.set(x, y, scale(band, y === 18 ? 1.25 : y === 25 ? .7 : hash(x, y, 136) < .05 ? .88 : 1));
    for (let gx = 2, i = 0; gx + 5 < W; gx += 8, i++) {
      const glyph = WARD_GLYPHS[Math.floor(hash(i, 0, 137) * WARD_GLYPHS.length)], lit = hash(i, 1, 138) < .45, k = .55 + hash(i, 2, 139) * .45;
      glyph.forEach((row, v) => [...row].forEach((ch, u) => {
        if (ch !== 'X') return;
        const x = gx + u, y = 19 + v;
        if (lit) { px.set(x, y, [120 + 70 * k, 90 + 40 * k, 200 + 50 * k]); glow.set(x, y, [150 * k, 100 * k, 255 * k]); } else px.set(x, y, cut);
        if (!glyph[v + 1]?.[u] || glyph[v + 1][u] !== 'X') px.mul(x, y + 1, 1.15); // (the cut's lower lip catches the light)
      }));
    }
    return { px, glow };
  },
  scoria(wall, W) { // the Seal's: rough blocks of scoria, the frothed black-red stone of an old flow, full of holes
    const H = 48, px = new Px(W, H, true), R = mulberry(145), mortar = hex(wall.mortar), stone = tint([wall.brick[0] + 10, wall.brick[1] - 4, wall.brick[2] - 6], 0, .85);
    px.fill(mortar);
    let y0 = 0;
    for (const ch of [12, 14, 10, 12]) { let x0 = Math.floor(R() * 14); for (const l of lengths(R, W, 12, 24)) { block(px, x0, y0, l, ch, scale(stone, .8 + R() * .32), 145, 1); wear(px, R, x0, y0, l, ch, mortar, .1); x0 += l; } y0 += ch; }
    for (let k = 0; k < W * H / 26; k++) { // the vesicles: small dark holes, lit along their lower rim
      const x = Math.floor(R() * W), y = Math.floor(R() * H); if (px.get(x, y)[0] <= mortar[0] + 4) continue;
      const big = R() < .25; px.mul(x, y, .38); if (big) { px.mul(x + 1, y, .45); px.mul(x, y - 1, .6); } px.mul(x, y + 1, 1.18);
    }
    return { px };
  },
  cryptstone(wall, W) { // the Vigil's (M7 step 5): warm grey ashlar worn smooth, in courses of two heights, soot darkening
    // the upper courses where the candles have burned for years, and now and then a small cross cut in a block
    const courses = [14, 10, 14, 10], H = 48, px = new Px(W, H, true), R = mulberry(155), mortar = hex(wall.mortar);
    px.fill(mortar);
    let y0 = 0;
    for (const ch of courses) {
      let x0 = Math.floor(R() * 18);
      for (const l of lengths(R, W, 18, 34)) {
        block(px, x0, y0, l, ch, tint(wall.brick, R() * 16 - 6, 1.04), 155, 1); wear(px, R, x0, y0, l, ch, mortar, .06);
        if (ch === 14 && l > 14 && R() < .22) { // a small cross, cut: dark, its lower lip lit
          const cx = x0 + Math.floor(l / 2), cy = y0 + 4;
          for (let v = 0; v < 6; v++) { px.mul(cx, cy + v, .62); px.mul(cx, cy + v + 1, 1.12); }
          for (let u = -2; u <= 2; u++) { px.mul(cx + u, cy + 2, .62); px.mul(cx + u, cy + 3, 1.1); }
        }
        x0 += l;
      }
      y0 += ch;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { // the soot: heaviest at the top, dithered down
      const k = Math.max(0, 1 - y / (H * .55)) * (.55 + .45 * Math.sin(x * .11 + Math.sin(x * .031) * 3) ** 2);
      if (bayer(x, y) < k * .7) px.mul(x, y, .8);
    }
    return { px };
  },
};

/** Stains over any wall in the look's kind: moss and drip lines (damp), black smears (scorched) or darker patches. */
function stainWall(px: Px, stains: FloorLook['wall']['stains']) {
  const S = mulberry(9), W = px.w, H = px.h;
  if (stains === 'moss') {
    for (let k = 0; k < 12; k++) px.blotch(S() * W, S() * H, 6 + S() * 10, 5 + S() * 8, .9, (x, y) => px.mix(x, y, [46, 84, 62], .5));
    for (let k = 0; k < 10; k++) { const x = Math.floor(S() * W), y0 = Math.floor(S() * H), len = 6 + Math.floor(S() * 16); for (let y = y0; y < y0 + len; y++) px.mul(x, y, .65); }
  } else if (stains === 'soot') {
    for (let k = 0; k < 10; k++) px.blotch(S() * W, S() * H, 8 + S() * 14, 6 + S() * 10, 1, (x, y) => px.mix(x, y, [6, 4, 3], .6));
  } else if (stains === 'salt') { // the Shore's (M4.1): a crust of salt dried white in patches, and pale runs down the stone
    for (let k = 0; k < 4; k++) px.blotch(S() * W, S() * H, 6 + S() * 8, 3 + S() * 4, .7, (x, y) => px.mix(x, y, [170, 178, 182], .28));
    for (let k = 0; k < 5; k++) { const x = Math.floor(S() * W), y0 = Math.floor(S() * H), len = 4 + Math.floor(S() * 8); for (let y = y0; y < y0 + len; y++) px.mix(x, y, [160, 170, 176], .2); }
  } else if (stains === 'gilt') { // the Reliquary's (M4.1): flecks of gold leaf caught on the stone, and candle smoke high up
    for (let k = 0; k < 40; k++) { const x = Math.floor(S() * W), y = Math.floor(S() * H); px.mix(x, y, [226, 186, 96], .7); if (S() < .5) px.mix(x + 1, y, [226, 186, 96], .4); }
    for (let k = 0; k < 5; k++) px.blotch(S() * W, S() * H * .4, 6 + S() * 8, 4 + S() * 5, .6, (x, y) => px.mul(x, y, .88));
  } else {
    for (let k = 0; k < 6; k++) px.blotch(S() * W, S() * H, 6 + S() * 10, 4 + S() * 6, .7, (x, y) => px.mul(x, y, .86));
  }
}

const wallCache = new Map<string, { map: THREE.CanvasTexture; glow?: THREE.CanvasTexture }>();
/** A wall of `kind` in a floor's colours, with the look's stains; its glow (ember seams) where the kind has one. Two units
    across, repeating down every few courses; kept per look and kind. The wall's UVs run a unit to 1. */
export function pixelWallTexture(wall: FloorLook['wall'], kind: WallKind = 'bricks') {
  const key = JSON.stringify(wall) + kind, hit = wallCache.get(key); if (hit) return hit;
  const [TX, TY] = CFG.roomKit.texel, art = WALLS[kind](wall, TX * 2);
  stainWall(art.px, wall.stains);
  const tile = (p: Px, srgb: boolean) => { const t = texture(p.canvas(), srgb); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / (art.units ?? 2), TY / p.h); return t; };
  const out = { map: tile(art.px, true), glow: art.glow && tile(art.glow, true) };
  wallCache.set(key, out); return out;
}

/* ---------- floors ---------- */

const BONE: RGB = [214, 202, 176];
/** A bone lying at (x, y) at angle `a`, `len` texels long: a shaft two texels thick with a knuckle at each end, and a
    shadow on the floor below it. */
function bone(px: Px, x: number, y: number, a: number, len: number, ry: number) {
  const on = new Set<number>(), put = (u: number, v: number) => on.add(Math.round(v) * 100000 + Math.round(u));
  const dx = Math.cos(a), dy = Math.sin(a) * ry;
  for (let s = -len / 2; s <= len / 2; s += .5) { put(x + dx * s, y + dy * s); put(x + dx * s, y + dy * s + 1); }
  for (const e of [-1, 1]) { const ex = x + dx * e * len / 2, ey = y + dy * e * len / 2; for (const [u, v] of [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 2], [-1, 1], [1, 1]]) put(ex + u - dy * .6, ey + v + dx * .3); }
  const cells = [...on].map(k => [k % 100000, Math.floor(k / 100000)]);
  for (const [u, v] of cells) if (!on.has((v + 1) * 100000 + u)) px.mul(u, v + 1, .55); // its shadow
  for (const [u, v] of cells) px.set(u, v, on.has((v + 1) * 100000 + u) ? BONE : scale(BONE, .74)); // lit above, darker along its underside
}
const SKULL = ['.XXXXX.', 'XXXXXXX', 'XOXXXOX', 'XOXXXOX', 'XXXNXXX', '.XXXXX.', '.X.X.X.'];
/** A skull, seven texels across, facing up out of the floor. */
function skull(px: Px, x: number, y: number) {
  SKULL.forEach((row, v) => [...row].forEach((ch, u) => {
    if (ch === '.') return;
    px.set(x + u, y + v, ch === 'X' ? (v >= 5 || u === 6 ? scale(BONE, .78) : BONE) : [30, 24, 20]);
  }));
  for (let u = 1; u < 6; u++) px.mul(x + u, y + 7, .55);
}

/** What paving and scattering a floor draws with: the picture (and its glow, for embers), the room's random stream, its
    size in texels, which tiles are inside, its colours. */
interface FloorCtx { px: Px; glow: Px | null; R: () => number; cw: number; ch: number; TX: number; TY: number; inside: (c: number, r: number) => boolean; base: RGB; mortar: RGB; look: FloorLook; n: (count: number) => number }

/** A slab of stone from (x0, y0), `sw` × `sh` texels (its joint on the right and below): bevelled, mottled, pitted,
    now and then cracked or chipped. */
function slab(f: FloorCtx, x0: number, y0: number, sw: number, sh: number, tone = 1) {
  const { px, R, base, mortar } = f;
  const v = R() * 22 - 11, c = scale([base[0] + v, base[1] + v, base[2] + v * .8], tone * (R() < .12 ? .88 : 1.06)), fw = sw - 2, fh = sh - 2, s = Math.floor(R() * 1e6);
  for (let fy = 0; fy < fh; fy++) for (let fx = 0; fx < fw; fx++) {
    if ((fx === 0 || fx === fw - 1) && (fy === 0 || fy === fh - 1)) continue; // rounded corners
    const x = x0 + 1 + fx, y = y0 + 1 + fy, cell = hash(Math.floor(fx / 5), Math.floor(fy / 4), s), n = hash(x, y, 11);
    let k = fy === 0 ? 1.3 : fy === fh - 1 || fy === fh - 2 && fx > 0 ? .72 : fx === 0 ? 1.12 : fx === fw - 1 ? .8 : 1; // the bevel (the lower lip two texels)
    if (cell > .5 && bayer(x, y) < (cell - .5) * 1.8) k *= .9; else if (cell < .18 && bayer(x, y) < (.18 - cell) * 3) k *= 1.07; // mottled
    if (n < .045) k *= .78; else if (n > .975) k *= 1.14; // pits and grit
    px.set(x, y, scale(c, k));
  }
  if (R() < .28) { // a crack from an edge, with a lit lip below it
    let x = x0 + 2 + Math.floor(R() * (fw - 4)), y = y0 + 1; const steps = 6 + Math.floor(R() * 12), drift = R() < .5 ? -1 : 1;
    for (let i = 0; i < steps && y < y0 + fh; i++) { px.mul(x, y, .55); px.mul(x, y + 1, 1.1); if (R() < .6) x += R() < .75 ? drift : -drift; else y++; }
  }
  if (R() < .2) { const x = x0 + 2 + Math.floor(R() * (fw - 4)), bottom = R() < .5, y = bottom ? y0 + fh - 1 : y0 + 1; px.set(x, y, mortar); px.set(x + 1, y, mortar); px.mul(x, y + (bottom ? -1 : 1), .75); } // a chip
}

/** Flagstones over the room's tiles: most a tile, some two tiles long or wide, a few four; `taken` tiles are left. */
function flags(f: FloorCtx, taken: boolean[][]) {
  const { R, inside, TX, TY } = f, H = taken.length, W = taken[0].length, free = (c: number, r: number) => inside(c, r) && !taken[r][c];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!free(c, r)) continue;
    let w = 1, h = 1; const roll = R();
    if (roll < .05 && free(c + 1, r) && free(c, r + 1) && free(c + 1, r + 1)) { w = 2; h = 2; }
    else if (roll < .2 && free(c + 1, r)) w = 2;
    else if (roll < .3 && free(c, r + 1)) h = 2;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) taken[r + j][c + i] = true;
    slab(f, c * TX, r * TY, w * TX, h * TY);
  }
}

/** Where four inlaid slabs meet: a small star of brass. */
function brassStar(px: Px, x: number, y: number, brass: RGB) {
  for (let v = -4; v <= 4; v++) for (let u = -5; u <= 5; u++) {
    const au = Math.abs(u), av = Math.abs(v) * 1.3, on = au + av <= 5 || Math.max(au, av) <= 2.5;
    if (on) px.set(x + u, y + v, scale(brass, u + v < 0 ? 1.25 : u + v > 2 ? .75 : 1));
  }
}

/** Each kind of floor's paving, over the whole room. */
const PAVING: Record<FloorKind, (f: FloorCtx, mask: boolean[][]) => void> = {
  flags(f, mask) { flags(f, mask.map(row => row.map(() => false))); },
  graves(f, mask) { // flagstones, with grave slabs set among them: an incised border, a cross at the head, lines of an inscription
    const { R, inside, TX, TY, px } = f, taken = mask.map(row => row.map(() => false)), H = mask.length, W = mask[0].length;
    for (let k = 0, tries = 0; k < Math.max(1, f.n(3)) && tries < 60; tries++) {
      const long = R() < .6, c = Math.floor(R() * W), r = Math.floor(R() * H), w = long ? 1 : 2, h = long ? 2 : 1;
      let ok = true; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) ok &&= inside(c + i, r + j) && !taken[r + j][c + i];
      if (!ok) continue;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) taken[r + j][c + i] = true;
      const x0 = c * TX, y0 = r * TY, sw = w * TX, sh = h * TY; slab(f, x0, y0, sw, sh, 1.12);
      const cut = (x: number, y: number) => { px.mul(x, y, .6); px.mul(x + 1, y + 1, 1.15); }; // incised: dark, with a lit edge below and right
      for (let x = x0 + 5; x < x0 + sw - 6; x++) { cut(x, y0 + 4); cut(x, y0 + sh - 6); }
      for (let y = y0 + 4; y < y0 + sh - 5; y++) { cut(x0 + 5, y); cut(x0 + sw - 7, y); }
      const [hx, hy, len] = long ? [x0 + sw / 2, y0 + 16, 12] : [x0 + 16, y0 + sh / 2, 10]; // the cross at its head
      for (let i = -len / 2; i <= len / 2; i++) cut(Math.round(hx), Math.round(hy + i - 2));
      for (let i = -len / 3; i <= len / 3; i++) cut(Math.round(hx + i), Math.round(hy - len / 4));
      for (let l = 0; l < 4; l++) { // the inscription, worn
        const [lx, ly, ll] = long ? [x0 + 10, y0 + 34 + l * 7, sw - 20] : [x0 + 30, y0 + 9 + l * 5, sw - 40];
        for (let i = 0; i < ll; i++) if (hash(lx + i, ly, 7) < .6) px.mul(lx + i, ly, .7);
      }
    }
    flags(f, taken);
  },
  cobbles(f) { // rounded setts of different sizes in loose rows, lit from above, with the look's growth in their joints
    const { px, R, cw, ch, base } = f, moss = csv(f.look.floor.stain);
    for (let y0 = 0; y0 < ch; y0 += 7) {
      let x0 = -Math.floor(R() * 8);
      while (x0 < cw) {
        const w = 6 + Math.floor(R() * 5), h = 5 + Math.floor(R() * 2), dy = Math.floor(R() * 2), v = R() * 28 - 14, c = scale([base[0] + v, base[1] + v, base[2] + v * .8], 1.3); // (lighter than the flagstones: the joints darken them)
        for (let fy = 0; fy < h; fy++) for (let fx = 0; fx < w - 1; fx++) {
          const ex = Math.min(fx, w - 2 - fx), ey = Math.min(fy, h - 1 - fy);
          if (ex + ey < 2 && !(ex === 1 && ey === 1)) continue; // (the corners rounded off)
          const k = fy === 0 || (fy === 1 && ex === 0) ? 1.28 : fy === h - 1 ? .7 : fx === w - 2 ? .82 : fx <= 1 && fy <= 2 ? 1.12 : 1;
          px.set(x0 + fx, y0 + dy + fy, scale(c, k * (hash(x0 + fx, y0 + fy, 21) < .05 ? .82 : 1)));
        }
        x0 += w;
      }
    }
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const c = px.get(x, y); if (c[0] === f.mortar[0] && c[1] === f.mortar[1] && hash(x, y, 22) < .35) px.set(x, y, scale(moss, .7)); } // growth in the joints
  },
  mosaic(f) { // a sunken mosaic, dulled by the water: medallions of rings and crosses on a lattice, tesserae missing, patches gone
    const { px, R, cw, ch, TX, TY, base } = f, T = 4;
    const dull = (c: RGB): RGB => [c[0] * .55 + base[0] * .45, c[1] * .55 + base[1] * .45, c[2] * .55 + base[2] * .45];
    const cream = dull([150, 144, 122]), teal = dull([46, 104, 100]), ochre = dull([140, 106, 60]), terracotta = dull([140, 72, 52]), pale = dull([176, 168, 144]);
    const bed: RGB = scale(base, .8);
    const holes: [number, number, number][] = Array.from({ length: f.n(4) }, () => [R() * cw, R() * ch, 10 + R() * 16]);
    for (let ty = 0; ty < ch; ty += T) for (let tx = 0; tx < cw; tx += T) {
      const u = (tx + 2) / TX, v = (ty + 2) / TY, cu = ((u % 4) + 4) % 4 - 2, cv = ((v % 4) + 4) % 4 - 2, r = Math.hypot(cu, cv);
      const lat = (a: number) => ((a % 1) + 1) % 1 < .1;
      // (round fields of teal or blue read as pools: the medallions are terracotta rings round pale stone, a cross of ochre)
      let c = Math.abs(r - 1.4) < .16 ? terracotta : r < 1.4 && (Math.abs(cu) < .12 || Math.abs(cv) < .12) ? ochre : r < 1.4 ? pale : lat(u + v) || lat(u - v) ? teal : cream;
      const gone = hash(tx, ty, 31) < .06 || holes.some(([hx, hy, hr]) => Math.hypot(tx - hx, (ty - hy) * TX / TY) < hr * (.7 + hash(tx, ty, 32) * .5));
      if (gone) { // the bed shows through: grey lime, never dark enough to read as a pit
        for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) px.set(tx + i, ty + j, scale(bed, .9 + hash(tx + i, ty + j, 34) * .2));
        continue;
      }
      c = scale(c, .85 + hash(tx, ty, 33) * .25);
      for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) px.set(tx + i, ty + j, scale(c, i === T - 1 || j === T - 1 ? .72 : j === 0 ? 1.1 : 1)); // (the grout a darker shade, not a black grid)
    }
  },
  basalt(f) { // plates of black basalt split along irregular seams, embers glowing in some of them
    const { px, glow, cw, ch, base } = f, G = 18, GY = G * .72, dark: RGB = scale([base[0], base[1] + 2, base[2] + 8], .66);
    // each plate's point, jittered but not so far that two crowd into a sliver of a plate; worked out once, into an array
    const cols = Math.ceil(cw / G) + 3, rows = Math.ceil(ch / GY) + 5, P = new Float32Array(cols * rows * 2);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const gi = i - 1, gj = j - 2, k = (j * cols + i) * 2; P[k] = (gi + .25 + hash(gi, gj, 41) * .5) * G; P[k + 1] = (gj + .25 + hash(gi, gj, 42) * .5) * GY; }
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i0 = Math.floor(x / G) + 1, j0 = Math.floor(y / GY) + 2;
      let d1 = 1e9, d2 = 1e9, ai = 0, aj = 0, bi = 0, bj = 0;
      for (let j = j0 - 2; j <= j0 + 2; j++) for (let i = i0 - 1; i <= i0 + 1; i++) { // (two rows each way: the rows are squeezed, so a nearer point can sit two away)
        const k = (j * cols + i) * 2, dx = x - P[k], dy = (y - P[k + 1]) * 1.3, d = dx * dx + dy * dy; // (squared: roots only for the two nearest)
        if (d < d1) { d2 = d1; bi = ai; bj = aj; d1 = d; ai = i; aj = j; } else if (d < d2) { d2 = d; bi = i; bj = j; }
      }
      const gap = Math.sqrt(d2) - Math.sqrt(d1);
      if (gap < 1.6) { // a seam
        const ka = ai * 97 + aj, kb = bi * 97 + bj, hot = hash(Math.min(ka, kb), Math.max(ka, kb), 43);
        if (hot < .09 && glow) { const k = .45 + .4 * hash(x, y, 44); px.set(x, y, [160 * k + 60, 60 * k + 20, 14]); glow.set(x, y, [255 * k, 100 * k, 16]); } else px.set(x, y, scale(f.mortar, .8));
        continue;
      }
      const k = (gap < 3.5 ? .85 : 1) * (.85 + hash(ai, aj, 45) * .3) * (hash(x, y, 46) < .05 ? .8 : 1); // (darker at its edges)
      px.set(x, y, scale(dark, k));
    }
  },
  slabs(f, mask) { // the Vigil's (M7 step 5): great worn slabs, two tiles a side where they fit, smoothed by feet; names cut
    // faintly in some (lines of a worn inscription under a cross)
    const { px, R, inside, TX, TY } = f, H = mask.length, W = mask[0].length, taken = mask.map(row => row.map(() => false));
    const free = (c: number, r: number) => inside(c, r) && !taken[r][c];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (!free(c, r)) continue;
      const big = free(c + 1, r) && free(c, r + 1) && free(c + 1, r + 1) && R() < .7, w = big ? 2 : 1, h = big ? 2 : 1;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) taken[r + j][c + i] = true;
      slab(f, c * TX, r * TY, w * TX, h * TY, 1.04);
      if (!big || R() > .3) continue;
      const cut = (x: number, y: number) => { if (hash(x, y, 157) < .25) return; px.mul(x, y, .72); px.mul(x, y + 1, 1.1); }; // (worn: some of each stroke gone)
      const x0 = c * TX, y0 = r * TY, sw = 2 * TX, hx = x0 + TX;
      for (let v = 0; v < 9; v++) cut(hx, y0 + 6 + v);
      for (let u = -3; u <= 3; u++) cut(hx + u, y0 + 9);
      for (let l = 0; l < 3; l++) { const ly = y0 + 20 + l * 6, ll = sw - 24 - Math.floor(R() * 10); for (let i = 0; i < ll; i++) if (hash(x0 + i, ly, 158) < .55) cut(x0 + 12 + i, ly); }
    }
  },
  sealstone(f, mask) { // the Seal's (M7): great slabs of dark stone, two tiles a side where they fit, a Warden's glyph cut in some
    // and a few of those still lit with the seal's violet (the glow map)
    const { px, glow, R, inside, TX, TY } = f, H = mask.length, W = mask[0].length, taken = mask.map(row => row.map(() => false));
    const free = (c: number, r: number) => inside(c, r) && !taken[r][c];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (!free(c, r)) continue;
      const big = free(c + 1, r) && free(c, r + 1) && free(c + 1, r + 1) && R() < .8, w = big ? 2 : 1, h = big ? 2 : 1;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) taken[r + j][c + i] = true;
      slab(f, c * TX, r * TY, w * TX, h * TY, .92);
      if (!big || R() > .45) continue;
      const glyph = WARD_GLYPHS[Math.floor(R() * WARD_GLYPHS.length)], lit = R() < .35, k = .5 + R() * .4;
      const x0 = c * TX + TX - 5, y0 = r * TY + TY - Math.round(5 * TY / TX); // (in the slab's middle, two texels a stroke across, squeezed down as the floor is)
      glyph.forEach((row, v) => [...row].forEach((ch, u) => {
        if (ch !== 'X') return;
        for (let dy = 0; dy < Math.max(1, Math.round(2 * TY / TX)); dy++) for (let dx = 0; dx < 2; dx++) {
          const x = x0 + u * 2 + dx, y = y0 + Math.round(v * 2 * TY / TX) + dy;
          if (lit) { px.set(x, y, [110 + 70 * k, 80 + 40 * k, 190 + 50 * k]); glow?.set(x, y, [140 * k, 90 * k, 240 * k]); } else px.mul(x, y, .5);
        }
      }));
    }
  },
  herringbone(f) { // bricks in herringbone, some charred black
    const { px, cw, ch, base } = f, C = 6, brick: RGB = [base[0] * .6 + 110 * .4, base[1] * .6 + 58 * .4, base[2] * .6 + 44 * .4];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = Math.floor(x / C), j = Math.floor(y / C), d = ((i - j) % 4 + 4) % 4;
      const [ai, aj, horiz] = d === 0 ? [i, j, true] : d === 1 ? [i - 1, j, true] : d === 3 ? [i, j, false] : [i, j - 1, false];
      const lx = x - ai * C, ly = y - aj * C, w = horiz ? 2 * C : C, h = horiz ? C : 2 * C;
      if (lx === 0 || ly === 0) continue; // (the joint: mortar)
      const n = hash(ai, aj, 51), c = n < .18 ? scale(brick, .45) : scale(brick, .85 + n * .3);
      const k = ly === 1 ? 1.22 : ly === h - 1 ? .74 : lx === 1 ? 1.08 : lx === w - 1 ? .84 : 1;
      px.set(x, y, scale(c, k * (hash(x, y, 52) < .05 ? .8 : 1)));
    }
  },
  boards(f) { // the Shore's (M4.1): a landing stage of weathered planks running across, gaps between, nail heads, some dark with wet
    const { px, R, cw, ch, base } = f, PH = 8, wood: RGB = [base[0] * .5 + 92 * .5, base[1] * .5 + 80 * .5, base[2] * .5 + 68 * .5];
    for (let y0 = 0; y0 < ch; y0 += PH) {
      let x0 = -Math.floor(R() * 40);
      while (x0 < cw) {
        const l = 40 + Math.floor(R() * 60), wet = R() < .2, c = scale(wood, (wet ? .62 : .85) + R() * .25), s = Math.floor(R() * 1e5);
        for (let y = y0 + 1; y < y0 + PH; y++) for (let x = Math.max(0, x0 + 1); x < Math.min(cw, x0 + l); x++) {
          const grain = Math.sin(x * .09 + (y - y0) * 1.9 + Math.sin(x * .03 + s) * 2.2) > .7 ? .85 : 1;
          px.set(x, y, scale(c, (y === y0 + 1 ? 1.25 : y === y0 + PH - 1 ? .7 : 1) * grain * (hash(x, y, 131) < .04 ? .8 : 1)));
        }
        for (const nx of [x0 + 3, x0 + l - 3]) if (nx > 0 && nx < cw) { px.set(nx, y0 + 3, [30, 28, 30]); px.set(nx, y0 + 5, [30, 28, 30]); } // nails at its ends
        x0 += l;
      }
    }
  },
  shingle(f) { // the Shore's: a beach of black shingle, a few pale pebbles among the dark, lit from above
    const { px, cw, ch, base } = f, G = 6;
    for (let gy = -1; gy < ch / G * 1.4 + 1; gy++) for (let gx = -1; gx < cw / G + 1; gx++) {
      const h1 = hash(gx, gy, 141), h2 = hash(gx, gy, 142), h3 = hash(gx, gy, 143);
      const cx = gx * G + h1 * G, cy = gy * G * .72 + h2 * G * .6, rx = 2 + h3 * 2.2, ry = rx * (.6 + h1 * .25);
      const pale = h2 > .985, v = h3 * 22 - 11, c: RGB = pale ? [128, 126, 122] : [base[0] * .8 + v, base[1] * .8 + v, base[2] * .8 + v + 3];
      for (let v2 = Math.floor(-ry); v2 <= ry; v2++) for (let u = Math.floor(-rx); u <= rx; u++) {
        const d = (u / rx) ** 2 + (v2 / ry) ** 2; if (d > 1) continue;
        const k = v2 / ry < -.4 ? 1.3 : v2 / ry > .45 ? .68 : 1;
        px.set(Math.round(cx + u), Math.round(cy + v2), scale(c, k));
      }
    }
  },
  checker(f) { // the Reliquary's (M4.1): polished marble in a chequer of pale and dark squares, half a tile each, veined
    const { px, cw, ch, TX, TY, base } = f, SX = TX / 2, SY = TY / 2;
    const pale: RGB = [base[0] * .6 + 206 * .4, base[1] * .6 + 196 * .4, base[2] * .6 + 176 * .4], dark: RGB = [base[0] * .6 + 50 * .4, base[1] * .6 + 46 * .4, base[2] * .6 + 48 * .4]; // (not too stark: foes and shots must read on it)
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = Math.floor(x / SX), j = Math.floor(y / SY), lx = x - i * SX, ly = y - j * SY, light = (i + j) % 2 === 0;
      if (lx === 0 || ly === 0) { px.set(x, y, scale(f.mortar, 1.4)); continue; }
      const n = hash(i, j, 61), vein = Math.sin((x + y * 1.3) * .21 + n * 9 + Math.sin(y * .17 + n * 5) * 2.4);
      let k = (ly === 1 ? 1.12 : ly === SY - 1 ? .86 : 1) * (.94 + n * .12);
      if (vein > .96) k *= light ? .84 : 1.28; // (veins: grey in the pale, pale in the dark)
      if (hash(x, y, 62) < .04) k *= .9;
      px.set(x, y, scale(light ? pale : dark, k));
    }
  },
  inlay(f, mask) { // the Reliquary's: great slabs a tile each, brass laid in every joint, a star of brass where four meet
    const { px, inside, TX, TY, cw, ch } = f, brass: RGB = [176, 138, 64];
    for (let r = 0; r < mask.length; r++) for (let c = 0; c < mask[0].length; c++) if (inside(c, r)) slab(f, c * TX, r * TY, TX, TY, 1.04);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const lx = x % TX, ly = y % TY, jx = lx === 0 || lx === TX - 1, jy = ly === 0 || ly === TY - 1;
      if (!jx && !jy) continue;
      if (hash(Math.floor(x / 6), Math.floor(y / 6), 71) < .12) continue; // (the brass worn through here and there)
      px.set(x, y, scale(brass, (jx ? lx === 0 : ly === 0) ? 1.2 : .72));
    }
    for (let r = 0; r <= mask.length; r += 2) for (let c = 0; c <= mask[0].length; c += 2) if (inside(c, r) || inside(c - 1, r - 1)) brassStar(px, c * TX, r * TY, brass);
  },
};

/** A room's floor in the room kit's style, over its `mask` (rows of tiles): paved in the room's kind of floor, stained in
    dither; puddles, ash and embers, or bones and a skull or two, as its look says; the edges darkened towards the walls,
    and the special room's marks. Boss rooms lean red, treasure rooms warmer. Embers glow (`glow`, an emissive map), but
    never under the `wet` tiles (water and oil): unlit oil must not look alight. */
export function pixelFloorTexture(seed: number, kind: RoomType, look: FloorLook, mask: boolean[][], wet: (c: number, r: number) => boolean = () => false): { map: THREE.Texture; glow?: THREE.Texture } {
  const W = mask[0].length, H = mask.length, [TX, TY] = CFG.roomKit.texel, paving = look.kinds?.floor ?? 'flags';
  const key = 'kit' + seed + kind + look.name + paving + JSON.stringify(look.floor) + W + 'x' + H + mask.map((row, r) => row.map((_, c) => wet(c, r) ? 1 : 0).join('')).join(''), hit = cachedFloor(key);
  if (hit) return { map: hit, glow: cachedFloor(key + '#glow') };
  const cw = W * TX, ch = H * TY, px = new Px(cw, ch), R = mulberry(seed);
  const inside = (c: number, r: number) => !!mask[r]?.[c];
  const area = mask.flat().filter(Boolean).length / (13 * 7), n = (count: number) => Math.round(count * area);
  const [b0, b1, b2] = look.floor.base;
  const base: RGB = kind === 'boss' ? [b0 - 2, b1 - 10, b2 - 6] : kind === 'treasure' ? [b0 + 8, b1 + 6, b2] : kind === 'secret' ? [b0 - 8, b1 - 4, b2 + 6] : kind === 'shrine' ? [b0 + 10, b1 + 8, b2 + 4] : [b0, b1, b2];
  const mortar = hex(look.floor.mortar), embers = paving === 'basalt' || paving === 'sealstone' || look.floor.decor === 'ash'; // (M7: the Seal's glyphs glow too)
  const glow = embers ? new Px(cw, ch) : null;
  px.fill(mortar); glow?.fill([0, 0, 0]);
  const f: FloorCtx = { px, glow, R, cw, ch, TX, TY, inside, base, mortar, look, n };
  PAVING[paving](f, mask);
  // stains in dither: moss, damp or blood
  const stain = csv(kind === 'boss' ? '60,14,10' : look.floor.stain);
  for (let k = 0; k < n(7); k++) { const r = (26 + R() * 60), x = R() * cw, y = R() * ch; px.blotch(x, y, r, r * TY / TX, .75, (u, v) => { if (inside(Math.floor(u / TX), Math.floor(v / TY))) px.mix(u, v, stain, .3); }); }
  if (look.floor.decor === 'puddles') for (let k = 0; k < n(6); k++) { // standing water: dark, a lit rim along its far edge, a streak of reflection
    const x = R() * cw, y = R() * ch, rx = 14 + R() * 30, ry = rx * (.35 + R() * .2);
    px.blotch(x, y, rx, ry, 1.6, (u, v) => px.mix(u, v, [12, 22, 26], paving === 'mosaic' ? .38 : .62)); // (lighter over the pale mosaic, or it reads as a hole)
    for (let u = Math.floor(x - rx * .7); u < x + rx * .7; u++) { const v = Math.round(y - ry * Math.sqrt(Math.max(0, 1 - ((u - x) / rx) ** 2)) + 1); if (bayer(u, v) < .7) px.mix(u, v, [150, 200, 210], .4); }
    for (let u = Math.floor(x - rx * .35); u < x - rx * .05; u++) px.mix(u, Math.round(y - ry * .3), [190, 230, 235], .25);
  } else if (look.floor.decor === 'wax') { // the Reliquary's (M4.1): candle wax spilt on the floor, and a burnt-down stub here and there
    const wax = hex(look.torch.wax ?? '#f0e2c6');
    for (let k = 0; k < n(16); k++) { const x = R() * cw, y = R() * ch, r = 2 + R() * 4; px.blotch(x, y, r, r * .7, 1.8, (u, v) => px.mix(u, v, wax, .75)); px.mul(Math.round(x), Math.round(y + r * .7), .72); }
    for (let k = 0; k < n(3); k++) {
      const x = Math.floor(R() * cw), y = Math.floor(R() * ch);
      if (!inside(Math.floor(x / TX), Math.floor((y + 8) / TY))) continue;
      for (let v = 0; v < 5; v++) for (let u = 0; u < 3; u++) px.set(x + u, y + v, scale(wax, v === 0 ? .85 : u === 2 ? .6 : .75)); // a stub, its wick burnt black (dull: not to pass for a pickup)
      px.set(x + 1, y - 1, [30, 24, 20]); for (let u = -1; u < 4; u++) px.mul(x + u, y + 5, .6);
    }
  } else if (look.floor.decor === 'ash') { // ash drifts, and embers glowing in them
    for (let k = 0; k < n(9); k++) { const r = 14 + R() * 34; px.blotch(R() * cw, R() * ch, r, r * .6, 1, (u, v) => px.mix(u, v, [34, 30, 28], .5)); }
    for (let k = 0; k < n(70); k++) { const x = Math.floor(R() * cw), y = Math.floor(R() * ch), hot = .5 + R() * .5; px.set(x, y, [200 + 55 * hot, 70 + 60 * hot, 20]); glow?.set(x, y, [255 * hot, 120 * hot, 20]); }
  }
  // the special room's marks, hardened into whole texels: drawn on a layer, each texel on or off (laid down last)
  const marks: { on: Uint8Array; c: RGB; alpha: number }[] = [], marked = new Uint8Array(cw * ch);
  if (MARKED_ROOMS.has(kind)) {
    const layer = document.createElement('canvas'); layer.width = cw; layer.height = ch;
    const lg = layer.getContext('2d', { willReadFrequently: true })!;
    drawMarks(kind, cw, ch * TX / TY, TX, R, (rgb, alpha, draw, dither) => { // (drawn a tile square, then squeezed down)
      lg.setTransform(1, 0, 0, TY / TX, 0, 0); lg.clearRect(0, 0, cw, ch * TX / TY); draw(lg); lg.setTransform(1, 0, 0, 1, 0, 0);
      const d = lg.getImageData(0, 0, cw, ch).data, on = new Uint8Array(cw * ch);
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const i = y * cw + x, cover = d[i * 4 + 3] / 255 / alpha;
        if (dither ? cover > bayer(x, y) : cover >= .3) on[i] = marked[i] = 1; // (a low threshold: thin strokes keep their texels)
      }
      marks.push({ on, c: csv(rgb), alpha: paving === 'flags' || paving === 'graves' ? alpha : Math.min(.9, alpha * 1.7) }); // (stronger over busy paving)
    });
  }
  /** Whether any mark lies within the box round (x, y): a bone or skull there would muddle it. */
  const nearMark = (x: number, y: number) => {
    for (let v = Math.max(0, Math.floor(y) - 6); v < Math.min(ch, y + 10); v++) for (let u = Math.max(0, Math.floor(x) - 10); u < Math.min(cw, x + 11); u++) if (marked[v * cw + u]) return true;
    return false;
  };
  // bones, and now and then a skull, kept clear of the marks
  for (let k = 0; k < n(look.floor.bones); k++) {
    const x = R() * cw, y = R() * ch, a = R() * Math.PI, sk = R() < .2;
    if (!inside(Math.floor(x / TX), Math.floor(y / TY)) || !inside(Math.floor((x + 8) / TX), Math.floor((y + 8) / TY)) || nearMark(x, y)) continue;
    if (sk) skull(px, Math.floor(x), Math.floor(y)); else bone(px, x, y, a, 10 + R() * 5, TY / TX);
  }
  // darker towards the walls, in dithered steps over a tile (the far wall's side a little deeper)
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!inside(c, r)) continue;
    const up = !inside(c, r - 1), down = !inside(c, r + 1), left = !inside(c - 1, r), right = !inside(c + 1, r);
    if (!(up || down || left || right)) continue;
    for (let fy = 0; fy < TY; fy++) for (let fx = 0; fx < TX; fx++) {
      const t = Math.max(up ? 1 - fy / (TY * .97) : 0, down ? 1 - (TY - 1 - fy) / (TY * .83) : 0, left ? 1 - fx / (TX * .97) : 0, right ? 1 - (TX - 1 - fx) / (TX * .97) : 0);
      if (t <= 0) continue;
      const x = c * TX + fx, y = r * TY + fy, step = Math.floor(t * 4 + bayer(x, y)) / 4; // four steps, dithered between
      if (step > 0) px.mul(x, y, 1 - .55 * step);
    }
  }
  for (const m of marks) for (let i = 0; i < m.on.length; i++) if (m.on[i]) px.mix(i % cw, Math.floor(i / cw), m.c, m.alpha); // the marks, last
  if (glow) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { // no embers under water or oil (a texel's margin round them too)
    if (!wet(c, r)) continue;
    for (let y = r * TY - 1; y <= (r + 1) * TY; y++) for (let x = c * TX - 1; x <= (c + 1) * TX; x++) {
      const g = glow.get(x, y); if (g[0] + g[1] + g[2] === 0) continue;
      glow.set(x, y, [0, 0, 0]); px.set(x, y, scale(mortar, .8));
    }
  }
  const map = cacheFloor(key, texture(px.canvas()));
  return { map, glow: glow ? cacheFloor(key + '#glow', texture(glow.canvas())) : undefined };
}
