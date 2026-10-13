/* The looks of what fills the Vigil's rooms behind its barred ways (M7 step 9; docs/M7-plan.md, decision 9), built in code
   from the room kit's parts: what the freed raise at the Cave Mouth, as the Huruhui's cave cities are built (a house of
   drystone under a roof of turf, a terrace stepped into the rock, a garden bed, a fall of water into a basin), the candle
   chapel's altar, and the garden of the dead's beds, one for each reagent. Each is built standing on its tile's middle, its
   still body merged (`mergeStill`); what moves is kept in `userData.parts`. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, mergeStill } from '../render/materials';
import { firePalette, makeFire } from '../render/fire';
import { MAT, curve, mesh, rough, stoneOf, taperTube, tone } from '../world/kitParts';
import { mulberry } from '../rng';
import type { CaveKind } from './vigilMap';

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (r0: number, r1: number, h: number, n = 8) => new THREE.CylinderGeometry(r0, r1, h, n);
const TURF = 0x5e7a42,
  SOIL = 0x4a3426,
  THATCH = 0x8a7448,
  LEAF = 0x5c8a44;

/** A small house of drystone, a turf roof, a door of planks and a window lit warm from inside. */
function houseLook(look: FloorLook, R: () => number) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.05), 0.16),
    dark = tone(stoneOf(look, 0.8), 0.12);
  mesh(g, rough(box(1.1, 0.62, 0.8), 0.03, 4), stone, 0, 0.31, 0);
  for (let k = 0; k < 6; k++)
    mesh(g, box(0.18 + R() * 0.1, 0.06, 0.02), dark, (R() - 0.5) * 0.9, 0.1 + R() * 0.45, 0.41); // (the stones' courses)
  const roof = mesh(
    g,
    new THREE.ConeGeometry(0.82, 0.5, 4, 1).rotateY(Math.PI / 4).scale(1.05, 1, 0.8),
    tone(THATCH, 0.12),
    0,
    0.87,
    0,
  );
  roof.userData.k = 1;
  mesh(
    g,
    new THREE.ConeGeometry(0.84, 0.2, 4, 1).rotateY(Math.PI / 4).scale(1.05, 1, 0.8),
    tone(TURF, 0.1),
    0,
    1.05,
    0,
  );
  mesh(g, box(0.24, 0.38, 0.03), MAT.wood, -0.22, 0.19, 0.41);
  mesh(g, box(0.2, 0.16, 0.03), new THREE.MeshBasicMaterial({ color: 0xffc070 }), 0.25, 0.38, 0.41);
  const w = glow(0xffb050, 0.7, 0.5);
  w.position.set(0.25, 0.38, 0.5);
  g.add(w);
  mesh(g, cyl(0.06, 0.07, 0.3, 6), dark, 0.38, 1.1, -0.1); // (a chimney)
  g.add(blob(1.4));
  return g;
}
/** A terrace stepped into the rock: two ledges of drystone, grass along their tops, a few flowers. */
function terraceLook(look: FloorLook, R: () => number) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 0.95), 0.16),
    grass = tone(TURF, 0.12);
  mesh(g, rough(box(1.2, 0.42, 0.9), 0.03, 7), stone, 0, 0.21, -0.05);
  mesh(g, box(1.22, 0.05, 0.92), grass, 0, 0.44, -0.05);
  mesh(g, rough(box(0.8, 0.36, 0.5), 0.03, 8), stone, 0, 0.62, -0.25);
  mesh(g, box(0.82, 0.05, 0.52), grass, 0, 0.82, -0.25);
  for (let k = 0; k < 6; k++)
    mesh(
      g,
      new THREE.SphereGeometry(0.04, 5, 3),
      tone(k % 2 ? 0xf2d27a : 0xe89ab0, 0.05),
      (R() - 0.5) * 1,
      0.48,
      0.2 + R() * 0.15,
    );
  g.add(blob(1.5));
  return g;
}
/** A garden bed: a frame of stones round dark soil, rows of green, here and there in flower. */
function bedLook(_look: FloorLook, R: () => number) {
  const g = new THREE.Group();
  mesh(g, box(1.1, 0.12, 0.8), tone(SOIL, 0.12), 0, 0.06, 0);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    mesh(
      g,
      rough(new THREE.DodecahedronGeometry(0.07, 0), 0.02, k),
      tone(0x7a746a, 0.12),
      Math.cos(a) * 0.58,
      0.06,
      Math.sin(a) * 0.42,
    );
  }
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const x = (c - 1.5) * 0.24 + (R() - 0.5) * 0.05,
        z = (r - 1) * 0.22;
      mesh(g, new THREE.ConeGeometry(0.06, 0.2 + R() * 0.1, 5), tone(LEAF, 0.12), x, 0.2, z);
      if (R() < 0.35)
        mesh(g, new THREE.SphereGeometry(0.04, 5, 3), tone(R() < 0.5 ? 0xf6e08a : 0xc8a0e8, 0.05), x, 0.32, z);
    }
  g.add(blob(1.3));
  return g;
}
/** A fall of water: a mossy outcrop with water pouring over its lip in a broad white strip, foam at its foot, into a
    round basin of bright water. `parts.fall` scrolls. */
function fallLook(look: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.1), 0.16),
    moss = tone(TURF, 0.12);
  mesh(g, rough(box(1, 1.3, 0.45), 0.1, 3), stone, 0, 0.65, -0.3);
  mesh(g, rough(box(0.9, 0.14, 0.5), 0.05, 4), moss, 0, 1.33, -0.3);
  for (const s of [-1, 1])
    mesh(g, rough(new THREE.DodecahedronGeometry(0.18, 0), 0.04, s + 5), moss, s * 0.42, 0.9, -0.08);
  const tex = fallTexture();
  const fall = mesh(g, new THREE.PlaneGeometry(0.46, 1.25), new THREE.MeshBasicMaterial({ map: tex }), 0, 0.72, -0.06);
  mesh(g, cyl(0.52, 0.56, 0.14, 14), stone, 0, 0.07, 0.28);
  mesh(g, cyl(0.46, 0.46, 0.02, 14), new THREE.MeshBasicMaterial({ color: 0x7cc4e0 }), 0, 0.14, 0.28);
  for (let k = 0; k < 5; k++)
    mesh(
      g,
      new THREE.SphereGeometry(0.07, 6, 4),
      new THREE.MeshBasicMaterial({ color: 0xf2fbff }),
      (k - 2) * 0.1,
      0.16,
      0.06 + (k % 2) * 0.05,
    ); // (foam where it lands)
  g.add(blob(1.3));
  g.userData.parts = { fall, tex };
  return g;
}
let fallTex: THREE.Texture | null = null;
/** Falling water: streaks of white and pale blue, repeating (one texture for every fall, scrolled by the Vigil). */
function fallTexture() {
  if (fallTex) return fallTex;
  const w = 4,
    h = 32,
    d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = (x * 5 + Math.floor(y / 4) * 3) % 4 === 0 ? 255 : 170 + ((x * 7 + y * 13) % 5) * 12,
        i = (y * w + x) * 4;
      d.set([v - 40, v - 10, 255, 255], i);
    }
  fallTex = new THREE.DataTexture(d, w, h);
  fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping;
  fallTex.magFilter = fallTex.minFilter = THREE.NearestFilter;
  fallTex.colorSpace = THREE.SRGBColorSpace;
  fallTex.repeat.set(1, 2);
  fallTex.needsUpdate = true;
  fallTex.userData.shared = true;
  return fallTex;
}

/** What one of the freed raises at the Cave Mouth. */
export function caveLook(kind: CaveKind, look: FloorLook, seed: number) {
  const R = mulberry(seed * 977 + 13);
  const g =
    kind === 'house'
      ? houseLook(look, R)
      : kind === 'terrace'
        ? terraceLook(look, R)
        : kind === 'bed'
          ? bedLook(look, R)
          : fallLook(look);
  const parts: unknown = g.userData.parts;
  mergeStill(g);
  if (parts) g.userData.parts = parts;
  return g;
}

/** The candle chapel's altar (three tiles along the north wall): a stone table under a cloth, a gilded sun over it. */
export function altarLook(look: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.15), 0.12),
    dark = tone(stoneOf(look, 0.9), 0.1);
  mesh(g, box(2.2, 0.7, 0.6), dark, 0, 0.35, 0.35);
  mesh(g, box(2.36, 0.08, 0.7), stone, 0, 0.74, 0.35);
  mesh(g, box(1.6, 0.02, 0.72), tone(0xe8dcc0, 0.06), 0, 0.785, 0.35);
  mesh(g, box(0.3, 0.5, 0.02), tone(0x9a2a2a, 0.06), 0, 0.52, 0.71);
  mesh(g, new THREE.TorusGeometry(0.26, 0.035, 4, 16), MAT.gilt, 0, 1.6, 0.06);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    mesh(g, box(0.04, 0.14, 0.02), MAT.gilt, Math.cos(a) * 0.38, 1.6 + Math.sin(a) * 0.38, 0.06).rotation.z =
      a - Math.PI / 2;
  }
  const fire = makeFire(
    [-0.8, 0.8].map((x) => ({ x, y: 0.98, z: 0.35, h: 0.14, w: 0.05 })),
    firePalette(0xffe0a0, 0xffa040),
    2,
    0.25,
  );
  g.add(fire);
  for (const x of [-0.8, 0.8]) mesh(g, cyl(0.04, 0.045, 0.2, 6), MAT.wax, x, 0.88, 0.35);
  const l = glow(0xffe0a0, 1.6, 0.5);
  l.position.set(0, 1.2, 0.5);
  g.add(l);
  g.add(blob(2.6));
  mergeStill(g);
  return g;
}
/** A cold place for a candle whose townsperson is still in chains: a small stone holder, a stub of black wick. */
export function coldHolderLook(look: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 0.95), 0.12);
  mesh(g, cyl(0.14, 0.18, 0.5, 8), stone, 0, 0.25, 0);
  mesh(g, cyl(0.18, 0.18, 0.05, 8), tone(stoneOf(look, 1.2), 0.08), 0, 0.52, 0);
  mesh(g, cyl(0.01, 0.01, 0.04, 3), MAT.pitch, 0, 0.56, 0);
  g.add(blob(0.5));
  mergeStill(g);
  return g;
}

/** A bed of the garden of the dead, sown with one reagent's plant (its colour); `lush` when someone tends it. */
export function gardenBedLook(color: string, lush: boolean, seed: number) {
  const g = new THREE.Group(),
    R = mulberry(seed),
    c = new THREE.Color(color).getHex();
  mesh(g, box(0.86, 0.1, 0.86), tone(SOIL, 0.12), 0, 0.05, 0);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    mesh(
      g,
      rough(new THREE.DodecahedronGeometry(0.06, 0), 0.02, k),
      tone(0x6e685e, 0.12),
      Math.cos(a) * 0.44,
      0.05,
      Math.sin(a) * 0.44,
    );
  }
  for (let k = 0; k < 5; k++) {
    const x = (R() - 0.5) * 0.55,
      z = (R() - 0.5) * 0.55,
      h = lush ? 0.3 + R() * 0.2 : 0.12;
    mesh(
      g,
      taperTube(
        curve([
          [x, 0.08, z],
          [x + (R() - 0.5) * 0.08, 0.08 + h * 0.6, z],
          [x, 0.08 + h, z],
        ]),
        4,
        0.025,
        0.01,
        3,
      ),
      tone(lush ? LEAF : 0x5a5040, 0.12),
    );
    if (lush) mesh(g, new THREE.SphereGeometry(0.07, 6, 4), tone(c, 0.08), x, 0.1 + h, z);
  }
  const mark = glow(c, 0.9, lush ? 0.4 : 0);
  mark.position.y = 0.4;
  g.add(mark);
  g.add(blob(0.9));
  mergeStill(g);
  g.userData.parts = { mark };
  return g;
}
