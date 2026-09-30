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

type WallArt = { px: Px; glow?: Px };
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
  basalt(wall, W) { // columns of black basalt, their faces lit on one side, embers glowing in some of the seams
    const H = 48, px = new Px(W, H, true), glow = new Px(W, H, true), R = mulberry(55), seam: RGB = scale(hex(wall.mortar), .8);
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
    return { px, glow };
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
};

/** Stains over any wall in the look's kind: moss and drip lines (damp), black smears (scorched) or darker patches. */
function stainWall(px: Px, stains: FloorLook['wall']['stains']) {
  const S = mulberry(9), W = px.w, H = px.h;
  if (stains === 'moss') {
    for (let k = 0; k < 12; k++) px.blotch(S() * W, S() * H, 6 + S() * 10, 5 + S() * 8, .9, (x, y) => px.mix(x, y, [46, 84, 62], .5));
    for (let k = 0; k < 10; k++) { const x = Math.floor(S() * W), y0 = Math.floor(S() * H), len = 6 + Math.floor(S() * 16); for (let y = y0; y < y0 + len; y++) px.mul(x, y, .65); }
  } else if (stains === 'soot') {
    for (let k = 0; k < 10; k++) px.blotch(S() * W, S() * H, 8 + S() * 14, 6 + S() * 10, 1, (x, y) => px.mix(x, y, [6, 4, 3], .6));
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
  const tile = (p: Px, srgb: boolean) => { const t = texture(p.canvas(), srgb); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2, TY / p.h); return t; };
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
        const w = 6 + Math.floor(R() * 5), h = 5 + Math.floor(R() * 2), dy = Math.floor(R() * 2), v = R() * 28 - 14, c: RGB = [base[0] + v, base[1] + v, base[2] + v * .8];
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
    const cream = dull([150, 144, 122]), teal = dull([46, 104, 100]), ochre = dull([140, 106, 60]), blue = dull([40, 60, 86]);
    const holes: [number, number, number][] = Array.from({ length: f.n(4) }, () => [R() * cw, R() * ch, 10 + R() * 16]);
    for (let ty = 0; ty < ch; ty += T) for (let tx = 0; tx < cw; tx += T) {
      const u = (tx + 2) / TX, v = (ty + 2) / TY, cu = ((u % 4) + 4) % 4 - 2, cv = ((v % 4) + 4) % 4 - 2, r = Math.hypot(cu, cv);
      const lat = (a: number) => ((a % 1) + 1) % 1 < .1;
      let c = Math.abs(r - 1.4) < .16 ? ochre : r < 1.4 && (Math.abs(cu) < .12 || Math.abs(cv) < .12) ? blue : r < 1.4 ? teal : lat(u + v) || lat(u - v) ? teal : cream;
      const gone = hash(tx, ty, 31) < .06 || holes.some(([hx, hy, hr]) => Math.hypot(tx - hx, (ty - hy) * TX / TY) < hr * (.7 + hash(tx, ty, 32) * .5));
      if (gone) continue; // (the bed shows through: the mortar)
      c = scale(c, .85 + hash(tx, ty, 33) * .25);
      for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) px.set(tx + i, ty + j, scale(c, i === T - 1 || j === T - 1 ? .72 : j === 0 ? 1.1 : 1)); // (the grout a darker shade, not a black grid)
    }
  },
  basalt(f) { // plates of black basalt split along irregular seams, embers glowing in some of them
    const { px, glow, cw, ch, base } = f, G = 18, cells = new Map<string, [number, number]>(), dark: RGB = scale([base[0], base[1] + 2, base[2] + 8], .5);
    // each plate's point, jittered but not so far that two crowd into a sliver of a plate
    const pt = (i: number, j: number) => { const k = i + ',' + j; let p = cells.get(k); if (!p) { p = [(i + .25 + hash(i, j, 41) * .5) * G, (j + .25 + hash(i, j, 42) * .5) * G * .72]; cells.set(k, p); } return p; };
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i0 = Math.floor(x / G), j0 = Math.floor(y / (G * .72));
      let d1 = 1e9, d2 = 1e9, a = [0, 0], b = [0, 0];
      for (let j = j0 - 2; j <= j0 + 2; j++) for (let i = i0 - 1; i <= i0 + 1; i++) { // (two rows each way: the rows are squeezed, so a nearer point can sit two away)
        const p = pt(i, j), d = Math.hypot(x - p[0], (y - p[1]) * 1.3);
        if (d < d1) { d2 = d1; b = a; d1 = d; a = [i, j]; } else if (d < d2) { d2 = d; b = [i, j]; }
      }
      if (d2 - d1 < 1.6) { // a seam
        const hot = hash(Math.min(a[0] * 97 + a[1], b[0] * 97 + b[1]), Math.max(a[0] * 97 + a[1], b[0] * 97 + b[1]), 43);
        if (hot < .14 && glow) { const k = .45 + .4 * hash(x, y, 44); px.set(x, y, [160 * k + 60, 60 * k + 20, 14]); glow.set(x, y, [255 * k, 100 * k, 16]); } else px.set(x, y, scale(f.mortar, .8));
        continue;
      }
      const k = (d2 - d1 < 3.5 ? .85 : 1) * (.85 + hash(a[0], a[1], 45) * .3) * (hash(x, y, 46) < .05 ? .8 : 1); // (darker at its edges)
      px.set(x, y, scale(dark, k));
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
};

/** A room's floor in the room kit's style, over its `mask` (rows of tiles): paved in the room's kind of floor, stained in
    dither; puddles, ash and embers, or bones and a skull or two, as its look says; the edges darkened towards the walls,
    and the special room's marks. Boss rooms lean red, treasure rooms warmer. Embers glow (`glow`, an emissive map). */
export function pixelFloorTexture(seed: number, kind: RoomType, look: FloorLook, mask: boolean[][]): { map: THREE.Texture; glow?: THREE.Texture } {
  const W = mask[0].length, H = mask.length, [TX, TY] = CFG.roomKit.texel, paving = look.kinds?.floor ?? 'flags';
  const key = 'kit' + seed + kind + look.name + paving + JSON.stringify(look.floor) + W + 'x' + H, hit = cachedFloor(key);
  if (hit) return { map: hit, glow: cachedFloor(key + '#glow') };
  const cw = W * TX, ch = H * TY, px = new Px(cw, ch), R = mulberry(seed);
  const inside = (c: number, r: number) => !!mask[r]?.[c];
  const area = mask.flat().filter(Boolean).length / (13 * 7), n = (count: number) => Math.round(count * area);
  const [b0, b1, b2] = look.floor.base;
  const base: RGB = kind === 'boss' ? [b0 - 2, b1 - 10, b2 - 6] : kind === 'treasure' ? [b0 + 8, b1 + 6, b2] : kind === 'secret' ? [b0 - 8, b1 - 4, b2 + 6] : kind === 'shrine' ? [b0 + 10, b1 + 8, b2 + 4] : [b0, b1, b2];
  const mortar = hex(look.floor.mortar), embers = paving === 'basalt' || look.floor.decor === 'ash';
  const glow = embers ? new Px(cw, ch) : null;
  px.fill(mortar); glow?.fill([0, 0, 0]);
  const f: FloorCtx = { px, glow, R, cw, ch, TX, TY, inside, base, mortar, look, n };
  PAVING[paving](f, mask);
  // stains in dither: moss, damp or blood
  const stain = csv(kind === 'boss' ? '60,14,10' : look.floor.stain);
  for (let k = 0; k < n(7); k++) { const r = (26 + R() * 60), x = R() * cw, y = R() * ch; px.blotch(x, y, r, r * TY / TX, .75, (u, v) => { if (inside(Math.floor(u / TX), Math.floor(v / TY))) px.mix(u, v, stain, .3); }); }
  if (look.floor.decor === 'puddles') for (let k = 0; k < n(6); k++) { // standing water: dark, a lit rim along its far edge, a streak of reflection
    const x = R() * cw, y = R() * ch, rx = 14 + R() * 30, ry = rx * (.35 + R() * .2);
    px.blotch(x, y, rx, ry, 1.6, (u, v) => px.mix(u, v, [12, 22, 26], .62));
    for (let u = Math.floor(x - rx * .7); u < x + rx * .7; u++) { const v = Math.round(y - ry * Math.sqrt(Math.max(0, 1 - ((u - x) / rx) ** 2)) + 1); if (bayer(u, v) < .7) px.mix(u, v, [150, 200, 210], .4); }
    for (let u = Math.floor(x - rx * .35); u < x - rx * .05; u++) px.mix(u, Math.round(y - ry * .3), [190, 230, 235], .25);
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
      marks.push({ on, c: csv(rgb), alpha });
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
  const map = cacheFloor(key, texture(px.canvas()));
  return { map, glow: glow ? cacheFloor(key + '#glow', texture(glow.canvas())) : undefined };
}
