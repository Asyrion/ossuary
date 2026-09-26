import * as THREE from 'three';
import type { RoomType } from '../types';
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

export const brickTex = (() => {
  const [c, g] = makeCanvas(256, 256); const R = mulberry(5);
  g.fillStyle = '#1e1813'; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) for (let i = -1; i < 3; i++) {
    const off = row % 2 ? 64 : 0, x = i * 128 + off, y = row * 64; const v = R() * 22 - 11;
    g.fillStyle = `rgb(${76 + v | 0},${68 + v | 0},${60 + v * .8 | 0})`; rrect(g, x + 3, y + 3, 122, 58, 5); g.fill();
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${R() * .2})`; g.fillRect(x + R() * 128, y + R() * 64, 2 + R() * 3, 1 + R() * 2); }
    g.fillStyle = 'rgba(255,240,220,.05)'; g.fillRect(x + 4, y + 4, 120, 4);
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();

const floorCache = new Map<string, THREE.CanvasTexture>();
export function floorTexture(seed: number, kind: RoomType) {
  const key = seed + kind; const hit = floorCache.get(key); if (hit) return hit;
  const P = 72, cw = 13 * P, ch = 7 * P;
  const [c, g] = makeCanvas(cw, ch); const R = mulberry(seed);
  const base = kind === 'boss' ? [70, 56, 52] : kind === 'treasure' ? [80, 72, 58] : [72, 66, 58];
  g.fillStyle = '#17120e'; g.fillRect(0, 0, cw, ch);
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
    const moss = kind === 'boss' ? '60,14,10' : '38,54,30';
    gr.addColorStop(0, `rgba(${moss},.3)`); gr.addColorStop(1, `rgba(${moss},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // bones scattered in the cracks
  for (let k = 0; k < 5; k++) {
    const x = R() * cw, y = R() * ch, a = R() * Math.PI; g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(214,202,176,.5)'; rrect(g, -14, -2.5, 28, 5, 2.5); g.fill();
    g.beginPath(); g.arc(-14, -2, 3.5, 0, 7); g.arc(-14, 3, 3.5, 0, 7); g.arc(14, -2, 3.5, 0, 7); g.arc(14, 3, 3.5, 0, 7); g.fill(); g.restore();
  }
  // darken towards the walls
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); return gr;
  };
  g.fillStyle = edge(0, 0, 0, 70); g.fillRect(0, 0, cw, 70); g.fillStyle = edge(0, ch, 0, ch - 60); g.fillRect(0, ch - 60, cw, 60);
  g.fillStyle = edge(0, 0, 70, 0); g.fillRect(0, 0, 70, ch); g.fillStyle = edge(cw, 0, cw - 70, 0); g.fillRect(cw - 70, 0, 70, ch);
  if (kind === 'start') drawChalk(g, P);
  if (kind === 'boss') {
    g.save(); g.translate(cw / 2, ch / 2); g.strokeStyle = 'rgba(140,30,20,.35)'; g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 150, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 120, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, -120); g.lineTo(0, -150); g.stroke(); }
    g.restore();
  }
  const t = canvasTex(c); floorCache.set(key, t); return t;
}

function drawChalk(g: Ctx, P: number) {
  g.save();
  const chalk = 'rgba(230,220,200,.5)';
  g.fillStyle = chalk; g.strokeStyle = chalk; g.lineWidth = 3; g.textAlign = 'center'; g.textBaseline = 'middle';
  const key = (x: number, y: number, s: number, label: string) => {
    rrect(g, x - s / 2, y - s / 2, s, s, 7); g.stroke(); g.font = `${s * .55}px "IM Fell English", Georgia, serif`; g.fillText(label, x, y + 2);
  };
  const lx = 3 * P, rx = 10 * P, cy = 3.2 * P, s = P * .62, gap = s * 1.12;
  if (isTouch) {
    g.lineWidth = 3; g.beginPath(); g.arc(lx, cy, s * .9, 0, 7); g.stroke(); g.beginPath(); g.arc(lx, cy, s * .38, 0, 7); g.fill();
    g.beginPath(); g.arc(rx, cy, s * .9, 0, 7); g.stroke(); g.beginPath(); g.arc(rx, cy, s * .38, 0, 7); g.fill();
  } else {
    key(lx, cy - gap / 2, s, 'W'); key(lx - gap, cy + gap / 2, s, 'A'); key(lx, cy + gap / 2, s, 'S'); key(lx + gap, cy + gap / 2, s, 'D');
    key(rx, cy - gap / 2, s, '↑'); key(rx - gap, cy + gap / 2, s, '←'); key(rx, cy + gap / 2, s, '↓'); key(rx + gap, cy + gap / 2, s, '→');
  }
  g.font = `italic ${P * .42}px "IM Fell English", Georgia, serif`;
  g.fillText(isTouch ? STR.chalk.touchMove : STR.chalk.walk, lx, cy + gap * 1.55);
  g.fillText(isTouch ? STR.chalk.touchShoot : STR.chalk.cast, rx, cy + gap * 1.55);
  g.restore();
}
