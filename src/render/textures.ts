import * as THREE from 'three';
import type { FloorLook, RoomType } from '../types';
import { STR } from '../strings';
import { isTouch, mulberry } from '../util';
import { renderer } from './renderer';

type Ctx = CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')!];
}
function canvasTex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function rrect(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function radial(stops: [number, string][], srgb: boolean) {
  const [c, g] = makeCanvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return canvasTex(c, srgb);
}

export const glowTex = radial([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']], true);
export const shadowTex = radial([[0, 'rgba(0,0,0,.75)'], [.6, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']], false);

/** The blast glyph's rune: two rings, a seven-pointed star and ticks between the rings, centred at (0, 0) and
    `r` in radius. */
function drawRune(g: Ctx, r: number) {
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(0, 0, r * .74, 0, Math.PI * 2); g.stroke();
  g.beginPath();
  for (let i = 0; i <= 7; i++) { const a = -Math.PI / 2 + i * Math.PI * 6 / 7, x = Math.cos(a) * r * .74, y = Math.sin(a) * r * .74; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7 + Math.PI / 14; g.beginPath(); g.moveTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8); g.lineTo(Math.cos(a) * r * .94, Math.sin(a) * r * .94); g.stroke(); }
}
let glyphTex: THREE.CanvasTexture | null = null, glyphStoneTex: THREE.CanvasTexture | null = null, shrineTex: THREE.CanvasTexture | null = null;
/** The shrine's circle in white on transparent, tinted by the material: three rings, twelve small sigils
    between the outer two and a six-pointed star within. */
export function shrineCircleTexture() {
  if (shrineTex) return shrineTex;
  const [c, g] = makeCanvas(512, 512); g.translate(256, 256);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 12;
  const ring = (r: number, w: number) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(240, 8); ring(206, 4); ring(118, 3);
  for (let i = 0; i < 12; i++) {
    const tilt = i % 2 ? 3 : -3; g.save(); g.rotate(i * Math.PI / 6); g.translate(0, -223); g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(0, 9); g.moveTo(-7, -tilt); g.lineTo(7, tilt); g.stroke(); g.restore();
  }
  g.lineWidth = 3;
  for (const off of [0, Math.PI / 3]) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) { const a = off - Math.PI / 2 + i * Math.PI * 2 / 3, x = Math.cos(a) * 200, y = Math.sin(a) * 200; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  return shrineTex = canvasTex(c);
}
/** The rune in white on transparent, tinted by the material (an inscribed glyph lying on the floor). */
export function glyphTexture() {
  if (glyphTex) return glyphTex;
  const [c, g] = makeCanvas(256, 256); g.translate(128, 128);
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 10;
  drawRune(g, 112);
  return glyphTex = canvasTex(c);
}
/** A glyph stone to pick up: a dark slate with the rune glowing amber. */
/** A hairline crack across a stretch of wall: white lines on clear, tinted by the material (dark for the
    crack, pale blue for the glow once the cantrip has divined it). */
let crackTex: THREE.CanvasTexture | null = null;
export function crackTexture() {
  if (crackTex) return crackTex;
  const [c, g] = makeCanvas(256, 256), R = mulberry(7);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  const branch = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < len; i++) { a += (R() - .5) * .9; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); if (depth && R() < .25) { g.stroke(); branch(x, y, a + (R() < .5 ? .8 : -.8), len / 2, w * .6, depth - 1); g.beginPath(); g.moveTo(x, y); } }
    g.stroke();
  };
  branch(128, 20, Math.PI / 2, 16, 4, 2); branch(128, 128, .3, 7, 2.5, 1); branch(128, 128, Math.PI - .3, 7, 2.5, 1);
  return crackTex = canvasTex(c);
}

export function glyphStoneTexture() {
  if (glyphStoneTex) return glyphStoneTex;
  const [c, g] = makeCanvas(128, 128); g.translate(64, 64);
  g.fillStyle = '#2b2622'; g.strokeStyle = '#6b6158'; g.lineWidth = 5;
  g.beginPath(); g.ellipse(0, 0, 54, 58, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.strokeStyle = '#ffb04a'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#ff8a2a'; g.shadowBlur = 8;
  drawRune(g, 40);
  return glyphStoneTex = canvasTex(c);
}

const brickCache = new Map<string, THREE.CanvasTexture>();
/** Tiling wall bricks in a floor's colours, with moss or soot stains. Kept for the whole session (one per look). */
export function brickTexture(wall: FloorLook['wall']) {
  const key = JSON.stringify(wall); const hit = brickCache.get(key); if (hit) return hit;
  const [c, g] = makeCanvas(256, 256); const R = mulberry(5); const [br, bg, bb] = wall.brick;
  g.fillStyle = wall.mortar; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) for (let i = -1; i < 3; i++) {
    const off = row % 2 ? 64 : 0, x = i * 128 + off, y = row * 64; const v = R() * 22 - 11;
    g.fillStyle = `rgb(${br + v | 0},${bg + v | 0},${bb + v * .8 | 0})`; rrect(g, x + 3, y + 3, 122, 58, 5); g.fill();
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${R() * .2})`; g.fillRect(x + R() * 128, y + R() * 64, 2 + R() * 3, 1 + R() * 2); }
    g.fillStyle = 'rgba(255,240,220,.05)'; g.fillRect(x + 4, y + 4, 120, 4);
  }
  const S = mulberry(9);
  const blotch = (rgb: string, a: number, r0: number, r1: number) => {
    const x = S() * 256, y = S() * 256, rad = r0 + S() * (r1 - r0); const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  if (wall.stains === 'moss') { // damp: green growth and dark drip lines
    for (let k = 0; k < 14; k++) blotch('46,84,62', .5, 10, 30);
    for (let k = 0; k < 12; k++) { g.fillStyle = `rgba(14,26,22,${.25 + S() * .3})`; g.fillRect(S() * 256, S() * 256, 1.5 + S() * 1.5, 20 + S() * 50); }
  } else if (wall.stains === 'soot') { // scorched: black smears
    for (let k = 0; k < 12; k++) blotch('6,4,3', .6, 16, 44);
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; brickCache.set(key, t); return t;
}

/** A hole in the floor: near-black centre with a crumbled rim, drawn over the floor texture. */
let pitTex: THREE.CanvasTexture | null = null;
export function pitTexture() {
  if (pitTex) return pitTex;
  const [c, g] = makeCanvas(64, 64); const R = mulberry(77);
  const gr = g.createRadialGradient(32, 32, 6, 32, 32, 34);
  gr.addColorStop(0, 'rgba(2,1,1,1)'); gr.addColorStop(.72, 'rgba(6,4,3,1)'); gr.addColorStop(.9, 'rgba(20,15,11,.9)'); gr.addColorStop(1, 'rgba(30,24,18,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  for (let k = 0; k < 40; k++) { const a = R() * Math.PI * 2, d = 24 + R() * 6; g.fillStyle = `rgba(60,52,44,${.3 + R() * .4})`; g.fillRect(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 1 + R() * 2, 1 + R() * 2); }
  pitTex = canvasTex(c); return pitTex;
}

const floorCache = new Map<string, THREE.CanvasTexture>();
/** Floor textures are cached per room seed; call between floors to free them. */
export function clearFloorTextures() { for (const t of floorCache.values()) t.dispose(); floorCache.clear(); for (const t of floorOwned) t.dispose(); floorOwned.length = 0; }
const floorOwned: THREE.Texture[] = [];
/** A texture that belongs to this floor (a pool's outline): freed with the floor textures. */
export function floorOwnedTexture<T extends THREE.Texture>(t: T) { floorOwned.push(t); return t; }
/** Room floor for a floor's look, drawn over the room's inside `mask` (rows of tiles); boss rooms lean red,
    treasure rooms warmer. Large rooms use fewer pixels per tile to keep textures small. */
export function floorTexture(seed: number, kind: RoomType, look: FloorLook, mask: boolean[][]) {
  const W = mask[0].length, H = mask.length;
  const key = seed + kind + look.name + W + 'x' + H; const hit = floorCache.get(key); if (hit) return hit;
  const P = W * H > 13 * 7 ? 56 : 72, S = P / 72, cw = W * P, ch = H * P;
  const [c, g] = makeCanvas(cw, ch); const R = mulberry(seed);
  const inside = (col: number, r: number) => !!mask[r]?.[col];
  const area = mask.flat().filter(Boolean).length / (13 * 7), n = (count: number) => Math.round(count * area);
  const [b0, b1, b2] = look.floor.base;
  const base = kind === 'boss' ? [b0 - 2, b1 - 10, b2 - 6] : kind === 'treasure' ? [b0 + 8, b1 + 6, b2] : kind === 'secret' ? [b0 - 8, b1 - 4, b2 + 6] : kind === 'shrine' ? [b0 + 10, b1 + 8, b2 + 4] : [b0, b1, b2];
  g.fillStyle = look.floor.mortar; g.fillRect(0, 0, cw, ch);
  for (let r = 0; r < H; r++) for (let col = 0; col < W; col++) {
    if (!inside(col, r)) continue;
    const x = col * P, y = r * P, v = R() * 18 - 9, ins = (2.5 + R() * 2) * S;
    g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v * .8 | 0})`;
    rrect(g, x + ins, y + ins, P - ins * 2, P - ins * 2, 7 * S); g.fill();
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(0,0,0,${R() * .2})`; g.fillRect(x + R() * P, y + R() * P, 1 + R() * 3, 1 + R() * 3); }
    for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(255,236,210,${R() * .07})`; g.fillRect(x + R() * P, y + R() * P, 1 + R() * 2, 1 + R() * 2); }
    if (R() < .22) {
      g.strokeStyle = 'rgba(8,6,4,.6)'; g.lineWidth = 1.3; g.beginPath();
      let px = x + R() * P, py = y + R() * P; g.moveTo(px, py);
      for (let s = 0; s < 4; s++) { px += (R() * 24 - 12) * S; py += (R() * 24 - 12) * S; g.lineTo(px, py); }
      g.stroke();
    }
  }
  for (let k = 0; k < n(7); k++) {
    const x = R() * cw, y = R() * ch, rad = (40 + R() * 100) * S; const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const moss = kind === 'boss' ? '60,14,10' : look.floor.stain;
    gr.addColorStop(0, `rgba(${moss},.3)`); gr.addColorStop(1, `rgba(${moss},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // bones scattered in the cracks
  for (let k = 0; k < n(look.floor.bones); k++) {
    const x = R() * cw, y = R() * ch, a = R() * Math.PI; g.save(); g.translate(x, y); g.rotate(a); g.scale(S, S);
    g.fillStyle = 'rgba(214,202,176,.5)'; rrect(g, -14, -2.5, 28, 5, 2.5); g.fill();
    g.beginPath(); g.arc(-14, -2, 3.5, 0, 7); g.arc(-14, 3, 3.5, 0, 7); g.arc(14, -2, 3.5, 0, 7); g.arc(14, 3, 3.5, 0, 7); g.fill(); g.restore();
  }
  if (look.floor.decor === 'puddles') { // standing water with a faint sheen along the rim
    for (let k = 0; k < n(6); k++) {
      const x = R() * cw, y = R() * ch, rx = (30 + R() * 70) * S, ry = (14 + R() * 30) * S, a = R() * .4 - .2;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = 'rgba(12,22,26,.55)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(150,200,210,.2)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, rx - 3, ry - 3, 0, 3.6, 5.6); g.stroke();
      g.fillStyle = 'rgba(190,230,235,.12)'; g.beginPath(); g.ellipse(-rx * .3, -ry * .3, rx * .25, ry * .15, 0, 0, 7); g.fill();
      g.restore();
    }
  } else if (look.floor.decor === 'ash') { // ash drifts and a few glowing embers
    for (let k = 0; k < n(9); k++) {
      const x = R() * cw, y = R() * ch, rad = (30 + R() * 70) * S; const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(34,30,28,.55)'); gr.addColorStop(1, 'rgba(34,30,28,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let k = 0; k < n(70); k++) { g.fillStyle = `rgba(255,${90 + R() * 60 | 0},30,${.25 + R() * .5})`; g.fillRect(R() * cw, R() * ch, 1 + R() * 2, 1 + R() * 2); }
  }
  // darken towards the walls: the outer edges, and the inner edges of shapes like the L
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); return gr;
  };
  const e1 = 70 * S, e2 = 60 * S;
  g.fillStyle = edge(0, 0, 0, e1); g.fillRect(0, 0, cw, e1); g.fillStyle = edge(0, ch, 0, ch - e2); g.fillRect(0, ch - e2, cw, e2);
  g.fillStyle = edge(0, 0, e1, 0); g.fillRect(0, 0, e1, ch); g.fillStyle = edge(cw, 0, cw - e1, 0); g.fillRect(cw - e1, 0, e1, ch);
  for (let r = 0; r < H; r++) for (let col = 0; col < W; col++) {
    if (!inside(col, r)) continue;
    const x = col * P, y = r * P;
    if (r > 0 && !inside(col, r - 1)) { g.fillStyle = edge(0, y, 0, y + e1); g.fillRect(x, y, P, e1); }
    if (r < H - 1 && !inside(col, r + 1)) { g.fillStyle = edge(0, y + P, 0, y + P - e2); g.fillRect(x, y + P - e2, P, e2); }
    if (col > 0 && !inside(col - 1, r)) { g.fillStyle = edge(x, 0, x + e1, 0); g.fillRect(x, y, e1, P); }
    if (col < W - 1 && !inside(col + 1, r)) { g.fillStyle = edge(x + P, 0, x + P - e1, 0); g.fillRect(x + P - e1, y, e1, P); }
  }
  if (kind === 'start') drawChalk(g, P);
  g.save(); g.translate(cw / 2, ch / 2); g.scale(S, S);
  if (kind === 'ordeal') { // an engraved square with three notches, one per possible wave
    g.strokeStyle = 'rgba(10,8,8,.55)'; g.lineWidth = 5;
    g.strokeRect(-130, -110, 260, 220); g.strokeStyle = 'rgba(200,190,170,.12)'; g.lineWidth = 2; g.strokeRect(-124, -104, 248, 208);
    for (const x of [-40, 0, 40]) { g.fillStyle = 'rgba(10,8,8,.5)'; g.fillRect(x - 6, -128, 12, 22); }
  }
  if (kind === 'altar') { // a bone-chalk circle stained dark at its heart
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 110); gr.addColorStop(0, 'rgba(60,8,6,.5)'); gr.addColorStop(1, 'rgba(60,8,6,0)');
    g.fillStyle = gr; g.fillRect(-110, -110, 220, 220);
    g.strokeStyle = 'rgba(225,212,188,.3)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 140, 0, 7); g.stroke();
    for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, -140); g.lineTo(0, -160); g.stroke(); }
  }
  if (kind === 'secret') { // a forgotten mage's work: a faded circle of runes in pale blue chalk, and loose pages
    g.strokeStyle = 'rgba(150,190,255,.28)'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 150, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 128, 0, 7); g.stroke();
    g.save(); g.scale(.5, .5); drawRune(g, 200); g.restore();
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(-6, -139); g.lineTo(6, -139); g.moveTo(0, -145); g.lineTo(0, -133); g.stroke(); }
    for (let k = 0; k < 7; k++) {
      g.save(); g.translate((R() - .5) * 700, (R() - .5) * 380); g.rotate(R() * 6);
      g.fillStyle = 'rgba(214,204,178,.32)'; g.fillRect(-14, -18, 28, 36);
      g.fillStyle = 'rgba(40,34,30,.35)'; for (let l = 0; l < 5; l++) g.fillRect(-10, -12 + l * 6, 16 + R() * 4, 1.5);
      g.restore();
    }
  }
  if (kind === 'boss') {
    g.strokeStyle = 'rgba(140,30,20,.35)'; g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 150, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 120, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, -120); g.lineTo(0, -150); g.stroke(); }
  }
  g.restore();
  const t = canvasTex(c); floorCache.set(key, t); return t;
}

/** The controls chalked on the floor of the first room, in Cinzel capitals; arrows are drawn as strokes. */
function drawChalk(g: Ctx, P: number) {
  g.save();
  const chalk = 'rgba(230,220,200,.5)';
  g.fillStyle = chalk; g.strokeStyle = chalk; g.lineWidth = 3; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineCap = 'round';
  const arrows: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const key = (x: number, y: number, s: number, label: string) => {
    const w = label.length > 1 && !arrows[label] ? s * (.55 + label.length * .32) : s; // a wider cap for ESC
    rrect(g, x - w / 2, y - s / 2, w, s, 7); g.stroke();
    const a = arrows[label];
    if (a) { // shaft and head, pointing along a
      const l = s * .26, [dx, dy] = a, px = -dy, py = dx;
      g.beginPath(); g.moveTo(x - dx * l, y - dy * l); g.lineTo(x + dx * l, y + dy * l);
      g.moveTo(x + dx * l - dx * l * .7 + px * l * .6, y + dy * l - dy * l * .7 + py * l * .6); g.lineTo(x + dx * l, y + dy * l);
      g.lineTo(x + dx * l - dx * l * .7 - px * l * .6, y + dy * l - dy * l * .7 - py * l * .6); g.stroke();
    } else { g.font = `700 ${s * (label.length > 1 ? .34 : .5)}px "Cinzel", Georgia, serif`; g.fillText(label, x, y + 2); }
  };
  const lx = 3 * P, rx = 10 * P, cy = 3.2 * P, s = P * .62, gap = s * 1.12;
  if (isTouch) {
    g.lineWidth = 3; g.beginPath(); g.arc(lx, cy, s * .9, 0, 7); g.stroke(); g.beginPath(); g.arc(lx, cy, s * .38, 0, 7); g.fill();
    g.beginPath(); g.arc(rx, cy, s * .9, 0, 7); g.stroke(); g.beginPath(); g.arc(rx, cy, s * .38, 0, 7); g.fill();
  } else {
    key(lx, cy - gap / 2, s, 'W'); key(lx - gap, cy + gap / 2, s, 'A'); key(lx, cy + gap / 2, s, 'S'); key(lx + gap, cy + gap / 2, s, 'D');
    key(rx, cy - gap / 2, s, 'up'); key(rx - gap, cy + gap / 2, s, 'left'); key(rx, cy + gap / 2, s, 'down'); key(rx + gap, cy + gap / 2, s, 'right');
  }
  g.font = `600 ${P * .36}px "Cinzel", Georgia, serif`;
  if ('letterSpacing' in g) (g as Ctx & { letterSpacing: string }).letterSpacing = `${P * .04}px`;
  g.fillText(isTouch ? STR.chalk.touchMove : STR.chalk.walk, lx, cy + gap * 1.55);
  g.fillText(isTouch ? STR.chalk.touchShoot : STR.chalk.cast, rx, cy + gap * 1.55);
  if (!isTouch) { // the space bar chalks a blast glyph
    const w = P * 2.3, sy = 5.35 * P;
    rrect(g, 6.5 * P - w / 2, sy - s * .38, w, s * .76, 7); g.stroke();
    g.font = `700 ${s * .34}px "Cinzel", Georgia, serif`; g.fillText(STR.chalk.space, 6.5 * P, sy + 2);
    g.font = `600 ${P * .36}px "Cinzel", Georgia, serif`; g.fillText(STR.chalk.glyph, 6.5 * P, sy + s * .9);
    // Q and E cast the spells (top middle); I opens the inventory and Esc pauses (the bottom corners)
    const C = STR.chalk, label = (t: string, x: number, y: number) => { g.font = `600 ${P * .36}px "Cinzel", Georgia, serif`; g.fillText(t, x, y); };
    key(6.5 * P - gap / 2, 1.45 * P, s, C.q); key(6.5 * P + gap / 2, 1.45 * P, s, C.e); label(C.spells, 6.5 * P, 1.45 * P + s * .95);
    key(lx, sy, s, C.i); label(C.inventory, lx, sy + s * .9);
    key(rx, sy, s, C.esc); label(C.pause, rx, sy + s * .9);
  }
  g.restore();
}
