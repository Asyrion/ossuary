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
import { renderer } from './renderer';
import { cacheFloor, cachedFloor, drawMarks } from './textures';

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

function texture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}

/* ---------- walls ---------- */

const brickCache = new Map<string, THREE.CanvasTexture>();
/** Bricks in a floor's colours, bevelled (lit along the top, shadowed below), with chips, cracks and darker stones;
    damp in the crypt, moss or soot where the look says. Two units across, eight courses down; kept per look. The wall's
    UVs run a unit to 1, so the texture repeats every 2 units across and every `8 × 8 / texel[1]` down. */
export function pixelBrickTexture(wall: FloorLook['wall']) {
  const key = JSON.stringify(wall), hit = brickCache.get(key); if (hit) return hit;
  const [TX, TY] = CFG.roomKit.texel, W = TX * 2, BH = 8, H = BH * 8, BW = W / 4;
  const px = new Px(W, H, true), R = mulberry(5), mortar = hex(wall.mortar), base = wall.brick as RGB;
  px.fill(mortar);
  for (let row = 0; row < H / BH; row++) for (let i = 0; i < 4; i++) {
    const x0 = i * BW + (row % 2 ? BW / 2 : 0), y0 = row * BH, fw = BW - 1, fh = BH - 1, v = R() * 24 - 12, dark = R() < .1 ? .82 : 1;
    const c = scale([base[0] + v, base[1] + v, base[2] + v * .8], dark);
    for (let fy = 0; fy < fh; fy++) for (let fx = 0; fx < fw; fx++) {
      const x = x0 + 1 + fx, y = y0 + 1 + fy, n = hash(x, y, 5);
      let k = fy === 0 ? 1.22 : fy === fh - 1 ? .76 : fx === 0 ? 1.08 : fx === fw - 1 ? .84 : 1; // the bevel
      if (n < .07) k *= .8; else if (n > .96) k *= 1.12; // pits and grit
      px.set(x, y, scale(c, k));
    }
    if (R() < .3) { const right = R() < .5, x = x0 + 1 + (right ? fw - 1 : 0), y = y0 + 1; px.set(x, y, mortar); px.mul(x + (right ? -1 : 1), y, .75); px.mul(x, y + 1, .75); } // a chipped corner
    if (R() < .14) { let x = x0 + 3 + Math.floor(R() * (fw - 6)); for (let y = y0 + 1; y < y0 + BH - 1; y++) { px.mul(x, y, .6); if (R() < .5) x += R() < .5 ? -1 : 1; } } // a crack
  }
  const S = mulberry(9);
  if (wall.stains === 'moss') { // green growth in dither, and dark drip lines
    const moss: RGB = [46, 84, 62];
    for (let k = 0; k < 12; k++) px.blotch(S() * W, S() * H, 6 + S() * 10, 5 + S() * 8, .9, (x, y) => px.mix(x, y, moss, .5));
    for (let k = 0; k < 10; k++) { const x = Math.floor(S() * W), y0 = Math.floor(S() * H), len = 6 + Math.floor(S() * 16); for (let y = y0; y < y0 + len; y++) px.mul(x, y, .65); }
  } else if (wall.stains === 'soot') { // scorched: black smears
    for (let k = 0; k < 10; k++) px.blotch(S() * W, S() * H, 8 + S() * 14, 6 + S() * 10, 1, (x, y) => px.mix(x, y, [6, 4, 3], .6));
  } else { // damp: a few darker patches
    for (let k = 0; k < 6; k++) px.blotch(S() * W, S() * H, 6 + S() * 10, 4 + S() * 6, .7, (x, y) => px.mul(x, y, .86));
  }
  const t = texture(px.canvas()); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2, TY / H);
  brickCache.set(key, t); return t;
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

/** A room's floor in the room kit's style, over its `mask` (rows of tiles): slabs of stone (most a tile, some two or
    four), bevelled and mottled, cracked and chipped here and there; stains in dither, bones and a skull or two, the
    edges darkened towards the walls, and the special room's marks. Boss rooms lean red, treasure rooms warmer. */
export function pixelFloorTexture(seed: number, kind: RoomType, look: FloorLook, mask: boolean[][]) {
  const W = mask[0].length, H = mask.length, [TX, TY] = CFG.roomKit.texel;
  const key = 'kit' + seed + kind + look.name + JSON.stringify(look.floor) + W + 'x' + H, hit = cachedFloor(key); if (hit) return hit;
  const cw = W * TX, ch = H * TY, px = new Px(cw, ch), R = mulberry(seed);
  const inside = (c: number, r: number) => !!mask[r]?.[c];
  const area = mask.flat().filter(Boolean).length / (13 * 7), n = (count: number) => Math.round(count * area);
  const [b0, b1, b2] = look.floor.base;
  const base: RGB = kind === 'boss' ? [b0 - 2, b1 - 10, b2 - 6] : kind === 'treasure' ? [b0 + 8, b1 + 6, b2] : kind === 'secret' ? [b0 - 8, b1 - 4, b2 + 6] : kind === 'shrine' ? [b0 + 10, b1 + 8, b2 + 4] : [b0, b1, b2];
  const mortar = hex(look.floor.mortar);
  px.fill(mortar);
  // the slabs: most a tile, some two tiles long or wide, a few four
  const taken = mask.map(row => row.map(() => false)), free = (c: number, r: number) => inside(c, r) && !taken[r][c];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!free(c, r)) continue;
    let w = 1, h = 1; const roll = R();
    if (roll < .05 && free(c + 1, r) && free(c, r + 1) && free(c + 1, r + 1)) { w = 2; h = 2; }
    else if (roll < .2 && free(c + 1, r)) w = 2;
    else if (roll < .3 && free(c, r + 1)) h = 2;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) taken[r + j][c + i] = true;
    slab(c * TX, r * TY, w * TX, h * TY);
  }
  function slab(x0: number, y0: number, sw: number, sh: number) {
    const v = R() * 22 - 11, tone = R() < .12 ? .88 : 1.06, c = scale([base[0] + v, base[1] + v, base[2] + v * .8], tone), fw = sw - 2, fh = sh - 2, s = Math.floor(R() * 1e6);
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
  // stains in dither: moss, damp or blood
  const stain = csv(kind === 'boss' ? '60,14,10' : look.floor.stain);
  for (let k = 0; k < n(7); k++) { const r = (26 + R() * 60), x = R() * cw, y = R() * ch; px.blotch(x, y, r, r * TY / TX, .75, (u, v) => { if (inside(Math.floor(u / TX), Math.floor(v / TY))) px.mix(u, v, stain, .3); }); }
  // bones, and now and then a skull
  for (let k = 0; k < n(look.floor.bones); k++) {
    const x = R() * cw, y = R() * ch, a = R() * Math.PI, sk = R() < .2;
    if (!inside(Math.floor(x / TX), Math.floor(y / TY)) || !inside(Math.floor((x + 8) / TX), Math.floor((y + 8) / TY))) continue;
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
  // the special room's marks, hardened into whole texels: drawn on a layer, then each texel on or off
  const layer = document.createElement('canvas'); layer.width = cw; layer.height = ch;
  const lg = layer.getContext('2d', { willReadFrequently: true })!;
  drawMarks(kind, cw, ch * TX / TY, TX, R, (rgb, alpha, draw, dither) => { // (drawn a tile square, then squeezed down)
    lg.setTransform(1, 0, 0, TY / TX, 0, 0); lg.clearRect(0, 0, cw, ch * TX / TY); draw(lg); lg.setTransform(1, 0, 0, 1, 0, 0);
    const d = lg.getImageData(0, 0, cw, ch).data, c = csv(rgb);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const cover = d[(y * cw + x) * 4 + 3] / 255 / alpha;
      if (dither ? cover > bayer(x, y) : cover >= .3) px.mix(x, y, c, alpha); // (a low threshold: thin strokes keep their texels)
    }
  });
  const t = texture(px.canvas());
  return cacheFloor(key, t);
}
