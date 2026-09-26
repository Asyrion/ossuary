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
export function clearFloorTextures() { for (const t of floorCache.values()) t.dispose(); floorCache.clear(); }
/** Room floor for a floor's look; boss rooms lean red, treasure rooms warmer. */
export function floorTexture(seed: number, kind: RoomType, look: FloorLook) {
  const key = seed + kind + look.name; const hit = floorCache.get(key); if (hit) return hit;
  const P = 72, cw = 13 * P, ch = 7 * P;
  const [c, g] = makeCanvas(cw, ch); const R = mulberry(seed);
  const [b0, b1, b2] = look.floor.base;
  const base = kind === 'boss' ? [b0 - 2, b1 - 10, b2 - 6] : kind === 'treasure' ? [b0 + 8, b1 + 6, b2] : [b0, b1, b2];
  g.fillStyle = look.floor.mortar; g.fillRect(0, 0, cw, ch);
  for (let r = 0; r < 7; r++) for (let col = 0; col < 13; col++) {
    const x = col * P, y = r * P, v = R() * 18 - 9, ins = 2.5 + R() * 2;
    g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v * .8 | 0})`;
    rrect(g, x + ins, y + ins, P - ins * 2, P - ins * 2, 7); g.fill();
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(0,0,0,${R() * .2})`; g.fillRect(x + R() * P, y + R() * P, 1 + R() * 3, 1 + R() * 3); }
    for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(255,236,210,${R() * .07})`; g.fillRect(x + R() * P, y + R() * P, 1 + R() * 2, 1 + R() * 2); }
    if (R() < .22) {
      g.strokeStyle = 'rgba(8,6,4,.6)'; g.lineWidth = 1.3; g.beginPath();
      let px = x + R() * P, py = y + R() * P; g.moveTo(px, py);
      for (let s = 0; s < 4; s++) { px += R() * 24 - 12; py += R() * 24 - 12; g.lineTo(px, py); }
      g.stroke();
    }
  }
  for (let k = 0; k < 7; k++) {
    const x = R() * cw, y = R() * ch, rad = 40 + R() * 100; const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const moss = kind === 'boss' ? '60,14,10' : look.floor.stain;
    gr.addColorStop(0, `rgba(${moss},.3)`); gr.addColorStop(1, `rgba(${moss},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // bones scattered in the cracks
  for (let k = 0; k < look.floor.bones; k++) {
    const x = R() * cw, y = R() * ch, a = R() * Math.PI; g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(214,202,176,.5)'; rrect(g, -14, -2.5, 28, 5, 2.5); g.fill();
    g.beginPath(); g.arc(-14, -2, 3.5, 0, 7); g.arc(-14, 3, 3.5, 0, 7); g.arc(14, -2, 3.5, 0, 7); g.arc(14, 3, 3.5, 0, 7); g.fill(); g.restore();
  }
  if (look.floor.decor === 'puddles') { // standing water with a faint sheen along the rim
    for (let k = 0; k < 6; k++) {
      const x = R() * cw, y = R() * ch, rx = 30 + R() * 70, ry = 14 + R() * 30, a = R() * .4 - .2;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = 'rgba(12,22,26,.55)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(150,200,210,.2)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, rx - 3, ry - 3, 0, 3.6, 5.6); g.stroke();
      g.fillStyle = 'rgba(190,230,235,.12)'; g.beginPath(); g.ellipse(-rx * .3, -ry * .3, rx * .25, ry * .15, 0, 0, 7); g.fill();
      g.restore();
    }
  } else if (look.floor.decor === 'ash') { // ash drifts and a few glowing embers
    for (let k = 0; k < 9; k++) {
      const x = R() * cw, y = R() * ch, rad = 30 + R() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(34,30,28,.55)'); gr.addColorStop(1, 'rgba(34,30,28,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,${90 + R() * 60 | 0},30,${.25 + R() * .5})`; g.fillRect(R() * cw, R() * ch, 1 + R() * 2, 1 + R() * 2); }
  }
  // darken towards the walls
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); return gr;
  };
  g.fillStyle = edge(0, 0, 0, 70); g.fillRect(0, 0, cw, 70); g.fillStyle = edge(0, ch, 0, ch - 60); g.fillRect(0, ch - 60, cw, 60);
  g.fillStyle = edge(0, 0, 70, 0); g.fillRect(0, 0, 70, ch); g.fillStyle = edge(cw, 0, cw - 70, 0); g.fillRect(cw - 70, 0, 70, ch);
  if (kind === 'start') drawChalk(g, P);
  if (kind === 'ordeal') { // an engraved square with three notches, one per possible wave
    g.save(); g.translate(cw / 2, ch / 2); g.strokeStyle = 'rgba(10,8,8,.55)'; g.lineWidth = 5;
    g.strokeRect(-130, -110, 260, 220); g.strokeStyle = 'rgba(200,190,170,.12)'; g.lineWidth = 2; g.strokeRect(-124, -104, 248, 208);
    for (const x of [-40, 0, 40]) { g.fillStyle = 'rgba(10,8,8,.5)'; g.fillRect(x - 6, -128, 12, 22); }
    g.restore();
  }
  if (kind === 'altar') { // a bone-chalk circle stained dark at its heart
    g.save(); g.translate(cw / 2, ch / 2);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 110); gr.addColorStop(0, 'rgba(60,8,6,.5)'); gr.addColorStop(1, 'rgba(60,8,6,0)');
    g.fillStyle = gr; g.fillRect(-110, -110, 220, 220);
    g.strokeStyle = 'rgba(225,212,188,.3)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 140, 0, 7); g.stroke();
    for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, -140); g.lineTo(0, -160); g.stroke(); }
    g.restore();
  }
  if (kind === 'boss') {
    g.save(); g.translate(cw / 2, ch / 2); g.strokeStyle = 'rgba(140,30,20,.35)'; g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 150, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 120, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, -120); g.lineTo(0, -150); g.stroke(); }
    g.restore();
  }
  const t = canvasTex(c); floorCache.set(key, t); return t;
}

/** The controls chalked on the floor of the first room, in Cinzel capitals; arrows are drawn as strokes. */
function drawChalk(g: Ctx, P: number) {
  g.save();
  const chalk = 'rgba(230,220,200,.5)';
  g.fillStyle = chalk; g.strokeStyle = chalk; g.lineWidth = 3; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineCap = 'round';
  const arrows: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const key = (x: number, y: number, s: number, label: string) => {
    rrect(g, x - s / 2, y - s / 2, s, s, 7); g.stroke();
    const a = arrows[label];
    if (a) { // shaft and head, pointing along a
      const l = s * .26, [dx, dy] = a, px = -dy, py = dx;
      g.beginPath(); g.moveTo(x - dx * l, y - dy * l); g.lineTo(x + dx * l, y + dy * l);
      g.moveTo(x + dx * l - dx * l * .7 + px * l * .6, y + dy * l - dy * l * .7 + py * l * .6); g.lineTo(x + dx * l, y + dy * l);
      g.lineTo(x + dx * l - dx * l * .7 - px * l * .6, y + dy * l - dy * l * .7 - py * l * .6); g.stroke();
    } else { g.font = `700 ${s * .5}px "Cinzel", Georgia, serif`; g.fillText(label, x, y + 2); }
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
  g.restore();
}
