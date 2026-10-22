import * as THREE from 'three';
import type { FloorLook, RoomType } from '../types';
import { STR } from '../strings';
import { isTouch, mulberry } from '../util';
import { renderer } from './renderer';
import { CFG } from '../config';

type Ctx = CanvasRenderingContext2D;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}
function canvasTex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function rrect(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** A round fade in flat steps, as pixel art draws a glow or a shadow:
    `alpha(d)` the fade from the middle (d 0) to the rim (1), held in `steps` levels; drawn crisp up close. */
function stepped(rgb: string, alpha: (d: number) => number, steps: number) {
  const N = 64,
    [c, g] = makeCanvas(N, N),
    img = g.createImageData(N, N),
    [r, gr, b] = rgb.split(',').map(Number);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) / (N / 2),
        a = d >= 1 ? 0 : Math.ceil(alpha(d) * steps - 1e-6) / steps,
        k = (y * N + x) * 4;
      img.data[k] = r;
      img.data[k + 1] = gr;
      img.data[k + 2] = b;
      img.data[k + 3] = Math.round(a * 255);
    }
  g.putImageData(img, 0, 0);
  const t = canvasTex(c, true);
  t.magFilter = THREE.NearestFilter;
  return t;
}
const fade = (pts: [number, number][]) => (d: number) => {
  // (straight between the points given)
  for (let i = 1; i < pts.length; i++)
    if (d <= pts[i][0]) {
      const [d0, a0] = pts[i - 1],
        [d1, a1] = pts[i];
      return a0 + ((a1 - a0) * (d - d0)) / (d1 - d0);
    }
  return 0;
};
export const glowTex = stepped(
  '255,255,255',
  fade([
    [0, 1],
    [0.35, 0.45],
    [1, 0],
  ]),
  CFG.pixelLook.glowSteps,
);
/** A glow in a few hard bands, as pixel art draws a halo (a foe's telegraph, a foe's shot, a lantern's light): `rings`
    gives each band's outer edge (0 the middle, 1 the rim) and its strength, from the middle out; one texture a set of
    bands. A soft glow's faint outer steps read as a blur over a dark floor. */
const ringTexs = new Map<string, THREE.Texture>();
export function bandsTex(rings: readonly (readonly [number, number])[]) {
  const key = JSON.stringify(rings);
  let t = ringTexs.get(key);
  if (!t) ringTexs.set(key, (t = stepped('255,255,255', (d) => rings.find(([edge]) => d < edge)?.[1] ?? 0, 255)));
  return t;
}
/** Bands as `bandsTex` draws them in `inner`, then from `edge` (0 the middle, 1 the rim) out a band of `outer` at
    `outerAlpha`: a glow drawn, not added, standing on a dark edge (a pale floor's, CFG.paleFx). Its colours are in the
    texture, so its material is white; one texture a set. */
const edgedTexs = new Map<string, THREE.Texture>();
export function edgedBandsTex(
  rings: readonly (readonly [number, number])[],
  inner: number,
  edge: number,
  outer: number,
  outerAlpha: number,
) {
  const key = JSON.stringify([rings, inner, edge, outer, outerAlpha]);
  let t = edgedTexs.get(key);
  if (t) return t;
  const N = 64,
    [c, g] = makeCanvas(N, N),
    img = g.createImageData(N, N),
    rgb = (h: number) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) / (N / 2),
        out = d >= edge,
        a = d >= 1 ? 0 : out ? outerAlpha : (rings.find(([e]) => d < e)?.[1] ?? 0),
        k = (y * N + x) * 4;
      img.data.set([...rgb(out ? outer : inner), Math.round(a * 255)], k);
    }
  g.putImageData(img, 0, 0);
  t = canvasTex(c, true);
  t.magFilter = THREE.NearestFilter;
  edgedTexs.set(key, t);
  return t;
}
/** A puff of fog in hard bands (a miasma, a thrown Shadowstep Tincture's darkness): full inside `fogCore` of its radius,
    half outside, so where puffs overlap they make hard steps rather than a blur (art bible 3: no soft alpha). */
export const fogTex = stepped('255,255,255', (d) => (d < CFG.pixelLook.fogCore ? 1 : 0.5), 2);
/** A pool of light on the floor (a boss's halo): round, in `CFG.pixelLook.poolSteps` flat steps, brightest in the
    middle and gone at its rim, never a square. */
export const lightPoolTex = stepped(
  '255,255,255',
  fade([
    [0, 0.8],
    [0.45, 0.5],
    [1, 0],
  ]),
  CFG.pixelLook.poolSteps,
);
export const shadowTex = stepped(
  '0,0,0',
  fade([
    [0, 0.75],
    [0.6, 0.35],
    [1, 0],
  ]),
  CFG.pixelLook.shadowSteps,
);

/** The blast glyph's rune: two rings, a seven-pointed star and ticks between the rings, centred at (0, 0) and
    `r` in radius. */
function drawRune(g: Ctx, r: number) {
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  for (let i = 0; i <= 7; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 6) / 7,
      x = Math.cos(a) * r * 0.74,
      y = Math.sin(a) * r * 0.74;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  for (let i = 0; i < 14; i++) {
    const a = (i * Math.PI) / 7 + Math.PI / 14;
    g.beginPath();
    g.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    g.lineTo(Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94);
    g.stroke();
  }
}
let glyphTex: THREE.CanvasTexture | null = null,
  shrineTex: THREE.CanvasTexture | null = null;
/** The shrine's circle in white on transparent, tinted by the material: three rings, twelve small sigils
    between the outer two and a six-pointed star within. */
export function shrineCircleTexture() {
  if (shrineTex) return shrineTex;
  const [c, g] = makeCanvas(512, 512);
  g.translate(256, 256);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = '#fff';
  g.shadowBlur = 12;
  const ring = (r: number, w: number) => {
    g.lineWidth = w;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  };
  ring(240, 8);
  ring(206, 4);
  ring(118, 3);
  for (let i = 0; i < 12; i++) {
    const tilt = i % 2 ? 3 : -3;
    g.save();
    g.rotate((i * Math.PI) / 6);
    g.translate(0, -223);
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(0, 9);
    g.moveTo(-7, -tilt);
    g.lineTo(7, tilt);
    g.stroke();
    g.restore();
  }
  g.lineWidth = 3;
  for (const off of [0, Math.PI / 3]) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = off - Math.PI / 2 + (i * Math.PI * 2) / 3,
        x = Math.cos(a) * 200,
        y = Math.sin(a) * 200;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
  return (shrineTex = canvasTex(c));
}
/** The rune in white on transparent, tinted by the material (an inscribed glyph lying on the floor). */
export function glyphTexture() {
  if (glyphTex) return glyphTex;
  const [c, g] = makeCanvas(256, 256);
  g.translate(128, 128);
  g.strokeStyle = '#fff';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = '#fff';
  g.shadowBlur = 10;
  drawRune(g, 112);
  return (glyphTex = canvasTex(c));
}
/** A hairline crack across a stretch of wall, drawn in whole texels, `w` × `h` of them (as the walls' bricks:
    pixelTextures.ts), sampled nearest so they stay crisp: white on clear, tinted by the material (dark for the crack,
    pale blue for the glow once the cantrip has divined it). Kept per size. */
const crackTexels = new Map<string, THREE.CanvasTexture>();
export function crackTexelTexture(w: number, h: number) {
  const key = w + 'x' + h,
    hit = crackTexels.get(key);
  if (hit) return hit;
  const [c, g] = makeCanvas(w, h),
    R = mulberry(7);
  g.fillStyle = '#fff';
  const line = (x0: number, y0: number, x1: number, y1: number, thick: number) => {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
    for (let k = 0; k <= n; k++)
      g.fillRect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), thick, 1);
  };
  const step = h / 26;
  const branch = (x: number, y: number, a: number, len: number, thick: number, depth: number) => {
    for (let i = 0; i < len; i++) {
      a += (R() - 0.5) * 0.9;
      const nx = x + Math.cos(a) * step * 1.6,
        ny = y + Math.sin(a) * step;
      line(x, y, nx, ny, thick);
      x = nx;
      y = ny;
      if (depth && R() < 0.25) branch(x, y, a + (R() < 0.5 ? 0.8 : -0.8), len / 2, 1, depth - 1);
    }
  };
  branch(w / 2, 1, Math.PI / 2, 16, 2, 2);
  branch(w / 2, h / 2, 0.3, 7, 1, 1);
  branch(w / 2, h / 2, Math.PI - 0.3, 7, 1, 1);
  const t = canvasTex(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  crackTexels.set(key, t);
  return t;
}

const floorCache = new Map<string, THREE.Texture>();
/** A floor texture made elsewhere (the room kit's), kept and freed with the others. */
export const cachedFloor = (key: string) => floorCache.get(key);
export function cacheFloor<T extends THREE.Texture>(key: string, t: T) {
  floorCache.set(key, t);
  return t;
}
/** Floor textures are cached per room seed; call between floors to free them. */
export function clearFloorTextures() {
  for (const t of floorCache.values()) t.dispose();
  floorCache.clear();
  for (const t of floorOwned) t.dispose();
  floorOwned.length = 0;
}
const floorOwned: THREE.Texture[] = [];
/** A texture that belongs to this floor (a pool's outline): freed with the floor textures. */
export function floorOwnedTexture<T extends THREE.Texture>(t: T) {
  floorOwned.push(t);
  return t;
}
/** Room floor for a floor's look where a made floor tile (data/assets.json) paints it, over the room's inside
    `mask` (rows of tiles): the painted tile on every floor tile, then stains, bones and the rest drawn over it; boss rooms
    lean red, treasure rooms warmer. Large rooms use fewer pixels per tile to keep textures small. */
export function floorTexture(seed: number, kind: RoomType, look: FloorLook, mask: boolean[][], tile: HTMLImageElement) {
  const W = mask[0].length,
    H = mask.length;
  const key = seed + kind + look.name + W + 'x' + H + 'painted';
  const hit = floorCache.get(key);
  if (hit) return hit;
  const P = W * H > 13 * 7 ? 56 : 72,
    S = P / 72,
    cw = W * P,
    ch = H * P;
  const [c, g] = makeCanvas(cw, ch);
  const R = mulberry(seed);
  const inside = (col: number, r: number) => !!mask[r]?.[col];
  const area = mask.flat().filter(Boolean).length / (13 * 7),
    n = (count: number) => Math.round(count * area);
  g.fillStyle = look.floor.mortar;
  g.fillRect(0, 0, cw, ch);
  for (let r = 0; r < H; r++)
    for (let col = 0; col < W; col++) {
      if (!inside(col, r)) continue;
      // the painted tile, each a little lighter or darker (the room's kind leans it below)
      g.drawImage(tile, col * P, r * P, P, P);
      g.fillStyle = `rgba(0,0,0,${R() * 0.14})`;
      g.fillRect(col * P, r * P, P, P);
    }
  const lean = (
    {
      boss: 'rgba(70,0,0,.14)',
      treasure: 'rgba(255,190,110,.07)',
      secret: 'rgba(20,30,60,.12)',
      shrine: 'rgba(255,240,220,.07)',
    } as Record<string, string | undefined>
  )[kind];
  if (lean) {
    g.fillStyle = lean;
    g.fillRect(0, 0, cw, ch);
  } // (the floor leans with its room)
  for (let k = 0; k < n(7); k++) {
    const x = R() * cw,
      y = R() * ch,
      rad = (40 + R() * 100) * S;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const moss = kind === 'boss' ? '60,14,10' : look.floor.stain;
    gr.addColorStop(0, `rgba(${moss},.3)`);
    gr.addColorStop(1, `rgba(${moss},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // bones scattered in the cracks
  for (let k = 0; k < n(look.floor.bones); k++) {
    const x = R() * cw,
      y = R() * ch,
      a = R() * Math.PI;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.scale(S, S);
    g.fillStyle = 'rgba(214,202,176,.5)';
    rrect(g, -14, -2.5, 28, 5, 2.5);
    g.fill();
    g.beginPath();
    g.arc(-14, -2, 3.5, 0, 7);
    g.arc(-14, 3, 3.5, 0, 7);
    g.arc(14, -2, 3.5, 0, 7);
    g.arc(14, 3, 3.5, 0, 7);
    g.fill();
    g.restore();
  }
  if (look.floor.decor === 'puddles') {
    // standing water with a faint sheen along the rim
    for (let k = 0; k < n(6); k++) {
      const x = R() * cw,
        y = R() * ch,
        rx = (30 + R() * 70) * S,
        ry = (14 + R() * 30) * S,
        a = R() * 0.4 - 0.2;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = 'rgba(12,22,26,.55)';
      g.beginPath();
      g.ellipse(0, 0, rx, ry, 0, 0, 7);
      g.fill();
      g.strokeStyle = 'rgba(150,200,210,.2)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(0, 0, rx - 3, ry - 3, 0, 3.6, 5.6);
      g.stroke();
      g.fillStyle = 'rgba(190,230,235,.12)';
      g.beginPath();
      g.ellipse(-rx * 0.3, -ry * 0.3, rx * 0.25, ry * 0.15, 0, 0, 7);
      g.fill();
      g.restore();
    }
  } else if (look.floor.decor === 'ash') {
    // ash drifts and a few glowing embers
    for (let k = 0; k < n(9); k++) {
      const x = R() * cw,
        y = R() * ch,
        rad = (30 + R() * 70) * S;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(34,30,28,.55)');
      gr.addColorStop(1, 'rgba(34,30,28,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let k = 0; k < n(70); k++) {
      g.fillStyle = `rgba(255,${(90 + R() * 60) | 0},30,${0.25 + R() * 0.5})`;
      g.fillRect(R() * cw, R() * ch, 1 + R() * 2, 1 + R() * 2);
    }
  }
  // darken towards the walls: the outer edges, and the inner edges of shapes like the L
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,.55)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    return gr;
  };
  const e1 = 70 * S,
    e2 = 60 * S;
  g.fillStyle = edge(0, 0, 0, e1);
  g.fillRect(0, 0, cw, e1);
  g.fillStyle = edge(0, ch, 0, ch - e2);
  g.fillRect(0, ch - e2, cw, e2);
  g.fillStyle = edge(0, 0, e1, 0);
  g.fillRect(0, 0, e1, ch);
  g.fillStyle = edge(cw, 0, cw - e1, 0);
  g.fillRect(cw - e1, 0, e1, ch);
  for (let r = 0; r < H; r++)
    for (let col = 0; col < W; col++) {
      if (!inside(col, r)) continue;
      const x = col * P,
        y = r * P;
      if (r > 0 && !inside(col, r - 1)) {
        g.fillStyle = edge(0, y, 0, y + e1);
        g.fillRect(x, y, P, e1);
      }
      if (r < H - 1 && !inside(col, r + 1)) {
        g.fillStyle = edge(0, y + P, 0, y + P - e2);
        g.fillRect(x, y + P - e2, P, e2);
      }
      if (col > 0 && !inside(col - 1, r)) {
        g.fillStyle = edge(x, 0, x + e1, 0);
        g.fillRect(x, y, e1, P);
      }
      if (col < W - 1 && !inside(col + 1, r)) {
        g.fillStyle = edge(x + P, 0, x + P - e1, 0);
        g.fillRect(x + P - e1, y, e1, P);
      }
    }
  drawMarks(kind, cw, ch, P, R, (_rgb, _a, draw) => draw(g));
  const t = canvasTex(c);
  floorCache.set(key, t);
  return t;
}

/** How a floor's marks are laid down: `draw` strokes and fills in the colour `rgb` at `alpha` (a painted floor draws
    straight onto its canvas; the room kit's hardens every mark into whole texels). `dither` is for soft fills. */
export type Ink = (rgb: string, alpha: number, draw: (g: Ctx) => void, dither?: boolean) => void;
const inkIn = (g: Ctx, rgb: string, alpha: number) => {
  g.fillStyle = g.strokeStyle = `rgba(${rgb},${alpha})`;
};

/** The rooms whose floors carry marks (`drawMarks`). */
export const MARKED_ROOMS: ReadonlySet<RoomType> = new Set<RoomType>(['start', 'ordeal', 'altar', 'secret', 'boss']);
/** The marks on a special room's floor, over a canvas `cw` × `ch` with `P` to a tile: the controls chalked in the first
    room, the ordeal's square, the altar's circle, the forgotten mage's runes and pages, the boss's rings. */
export function drawMarks(kind: RoomType, cw: number, ch: number, P: number, R: () => number, ink: Ink) {
  const S = P / 72;
  if (kind === 'start') ink('230,220,200', 0.5, (g) => drawChalk(g, P));
  const at = (g: Ctx) => {
    g.translate(cw / 2, ch / 2);
    g.scale(S, S);
  };
  if (kind === 'ordeal') {
    // an engraved square with three notches, one per possible wave
    ink('10,8,8', 0.55, (g) => {
      g.save();
      at(g);
      inkIn(g, '10,8,8', 0.55);
      g.lineWidth = 5;
      g.strokeRect(-130, -110, 260, 220);
      g.restore();
    });
    ink('200,190,170', 0.12, (g) => {
      g.save();
      at(g);
      inkIn(g, '200,190,170', 0.12);
      g.lineWidth = 2;
      g.strokeRect(-124, -104, 248, 208);
      g.restore();
    });
    ink('10,8,8', 0.5, (g) => {
      g.save();
      at(g);
      inkIn(g, '10,8,8', 0.5);
      for (const x of [-40, 0, 40]) g.fillRect(x - 6, -128, 12, 22);
      g.restore();
    });
  }
  if (kind === 'altar') {
    // a bone-chalk circle stained dark at its heart
    ink(
      '60,8,6',
      0.5,
      (g) => {
        g.save();
        at(g);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 110);
        gr.addColorStop(0, 'rgba(60,8,6,.5)');
        gr.addColorStop(1, 'rgba(60,8,6,0)');
        g.fillStyle = gr;
        g.fillRect(-110, -110, 220, 220);
        g.restore();
      },
      true,
    );
    ink('225,212,188', 0.3, (g) => {
      g.save();
      at(g);
      inkIn(g, '225,212,188', 0.3);
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, 140, 0, 7);
      g.stroke();
      for (let i = 0; i < 6; i++) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.moveTo(0, -140);
        g.lineTo(0, -160);
        g.stroke();
      }
      g.restore();
    });
  }
  if (kind === 'secret') {
    // a forgotten mage's work: a faded circle of runes in pale blue chalk, and loose pages
    ink('150,190,255', 0.28, (g) => {
      g.save();
      at(g);
      inkIn(g, '150,190,255', 0.28);
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, 150, 0, 7);
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 128, 0, 7);
      g.stroke();
      g.save();
      g.scale(0.5, 0.5);
      drawRune(g, 200);
      g.restore();
      for (let i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6);
        g.beginPath();
        g.moveTo(-6, -139);
        g.lineTo(6, -139);
        g.moveTo(0, -145);
        g.lineTo(0, -133);
        g.stroke();
      }
      g.restore();
    });
    const pages = Array.from({ length: 7 }, () => {
      const x = (R() - 0.5) * 700,
        y = (R() - 0.5) * 380,
        a = R() * 6;
      return { x, y, a, lines: Array.from({ length: 5 }, () => 16 + R() * 4) };
    });
    ink('214,204,178', 0.32, (g) => {
      g.save();
      at(g);
      inkIn(g, '214,204,178', 0.32);
      for (const p of pages) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.a);
        g.fillRect(-14, -18, 28, 36);
        g.restore();
      }
      g.restore();
    });
    ink('40,34,30', 0.35, (g) => {
      g.save();
      at(g);
      inkIn(g, '40,34,30', 0.35);
      for (const p of pages) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.a);
        p.lines.forEach((w, l) => g.fillRect(-10, -12 + l * 6, w, 1.5));
        g.restore();
      }
      g.restore();
    });
  }
  if (kind === 'boss') {
    ink('140,30,20', 0.35, (g) => {
      g.save();
      at(g);
      inkIn(g, '140,30,20', 0.35);
      g.lineWidth = 4;
      g.beginPath();
      g.arc(0, 0, 150, 0, 7);
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 120, 0, 7);
      g.stroke();
      for (let i = 0; i < 8; i++) {
        g.rotate(Math.PI / 4);
        g.beginPath();
        g.moveTo(0, -120);
        g.lineTo(0, -150);
        g.stroke();
      }
      g.restore();
    });
  }
}

/** The controls chalked on the floor of the first room, in Cinzel capitals; arrows are drawn as strokes. */
function drawChalk(g: Ctx, P: number) {
  g.save();
  const chalk = 'rgba(230,220,200,.5)';
  g.fillStyle = chalk;
  g.strokeStyle = chalk;
  g.lineWidth = 3;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineCap = 'round';
  const arrows: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const key = (x: number, y: number, s: number, label: string) => {
    const w = label.length > 1 && !arrows[label] ? s * (0.55 + label.length * 0.32) : s; // a wider cap for ESC
    rrect(g, x - w / 2, y - s / 2, w, s, 7);
    g.stroke();
    const a = arrows[label];
    if (a) {
      // shaft and head, pointing along a
      const l = s * 0.26,
        [dx, dy] = a,
        px = -dy,
        py = dx;
      g.beginPath();
      g.moveTo(x - dx * l, y - dy * l);
      g.lineTo(x + dx * l, y + dy * l);
      g.moveTo(x + dx * l - dx * l * 0.7 + px * l * 0.6, y + dy * l - dy * l * 0.7 + py * l * 0.6);
      g.lineTo(x + dx * l, y + dy * l);
      g.lineTo(x + dx * l - dx * l * 0.7 - px * l * 0.6, y + dy * l - dy * l * 0.7 - py * l * 0.6);
      g.stroke();
    } else {
      g.font = `700 ${s * (label.length > 1 ? 0.34 : 0.5)}px "Cinzel", Georgia, serif`;
      g.fillText(label, x, y + 2);
    }
  };
  const lx = 3 * P,
    rx = 10 * P,
    cy = 3.2 * P,
    s = P * 0.62,
    gap = s * 1.12;
  if (isTouch) {
    g.lineWidth = 3;
    g.beginPath();
    g.arc(lx, cy, s * 0.9, 0, 7);
    g.stroke();
    g.beginPath();
    g.arc(lx, cy, s * 0.38, 0, 7);
    g.fill();
    g.beginPath();
    g.arc(rx, cy, s * 0.9, 0, 7);
    g.stroke();
    g.beginPath();
    g.arc(rx, cy, s * 0.38, 0, 7);
    g.fill();
  } else {
    key(lx, cy - gap / 2, s, 'W');
    key(lx - gap, cy + gap / 2, s, 'A');
    key(lx, cy + gap / 2, s, 'S');
    key(lx + gap, cy + gap / 2, s, 'D');
    key(rx, cy - gap / 2, s, 'up');
    key(rx - gap, cy + gap / 2, s, 'left');
    key(rx, cy + gap / 2, s, 'down');
    key(rx + gap, cy + gap / 2, s, 'right');
  }
  g.font = `600 ${P * 0.36}px "Cinzel", Georgia, serif`;
  if ('letterSpacing' in g) (g as Ctx & { letterSpacing: string }).letterSpacing = `${P * 0.04}px`;
  g.fillText(isTouch ? STR.chalk.touchMove : STR.chalk.walk, lx, cy + gap * 1.55);
  g.fillText(isTouch ? STR.chalk.touchShoot : STR.chalk.cast, rx, cy + gap * 1.55);
  if (!isTouch) {
    // the space bar chalks a blast glyph
    const w = P * 2.3,
      sy = 5.35 * P;
    rrect(g, 6.5 * P - w / 2, sy - s * 0.38, w, s * 0.76, 7);
    g.stroke();
    g.font = `700 ${s * 0.34}px "Cinzel", Georgia, serif`;
    g.fillText(STR.chalk.space, 6.5 * P, sy + 2);
    g.font = `600 ${P * 0.36}px "Cinzel", Georgia, serif`;
    g.fillText(STR.chalk.glyph, 6.5 * P, sy + s * 0.9);
    // Q and E cast the spells (top middle); I opens the inventory and Esc pauses (the bottom corners)
    const C = STR.chalk,
      label = (t: string, x: number, y: number) => {
        g.font = `600 ${P * 0.36}px "Cinzel", Georgia, serif`;
        g.fillText(t, x, y);
      };
    key(6.5 * P - gap / 2, 1.45 * P, s, C.q);
    key(6.5 * P + gap / 2, 1.45 * P, s, C.e);
    label(C.spells, 6.5 * P, 1.45 * P + s * 0.95);
    key(lx, sy, s, C.i);
    label(C.inventory, lx, sy + s * 0.9);
    key(rx, sy, s, C.esc);
    label(C.pause, rx, sy + s * 0.9);
  }
  g.restore();
}
