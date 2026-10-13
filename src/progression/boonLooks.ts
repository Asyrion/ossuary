/* M6 step 4: each boon's sigil, built in code (docs/archive/M6-plan.md): a dark stone medallion with a rim and an emblem drawn in
   strokes of the boon's colour, glowing; a second rank wears a second ring. Its 24 px icon is made through `iconUrlOf`, as
   the artifacts', bottles' and reagents' are (one pixel for everything). Each emblem is a few strokes on a disc of radius
   1 (y up): lines, circles and arcs (render/emblem.ts, shared with the runes' glyphs). */
import * as THREE from 'three';
import { iconUrlOf } from '../items/artifactIcons';
import { A, C, L, emblem, poly, type Stroke } from '../render/emblem';
import { boon } from './boonData';

const PI = Math.PI;

const SIGILS: Record<string, Stroke[]> = {
  coals: [C(-0.32, -0.3, 0.2), C(0.32, -0.3, 0.2), C(0, 0.08, 0.2), ...poly(0, 0.36, 0.1, 0.62, 0, 0.78)],
  flame: [
    ...poly(0, 0.75, 0.38, 0.05, 0.22, -0.5, -0.22, -0.5, -0.38, 0.05, 0, 0.75),
    ...poly(0, 0.2, 0.12, -0.15, 0, -0.35, -0.12, -0.15, 0, 0.2),
  ],
  snowflake: [
    L(0, -0.75, 0, 0.75),
    L(-0.65, -0.38, 0.65, 0.38),
    L(-0.65, 0.38, 0.65, -0.38),
    ...poly(-0.15, 0.55, 0, 0.4, 0.15, 0.55),
    ...poly(-0.15, -0.55, 0, -0.4, 0.15, -0.55),
  ],
  breath: [
    A(-0.25, 0.35, 0.3, 0, PI),
    A(0.25, 0.35, 0.3, PI, 2 * PI),
    A(-0.25, -0.15, 0.3, 0, PI),
    A(0.25, -0.15, 0.3, PI, 2 * PI),
    L(-0.55, -0.55, 0.55, -0.55),
  ],
  fork: [...poly(0.05, 0.8, -0.2, 0.15, 0.15, 0.1, -0.1, -0.75), L(0.15, 0.1, 0.55, -0.45)],
  sparks: [
    L(-0.5, 0.35, -0.2, 0.35),
    L(-0.35, 0.5, -0.35, 0.2),
    L(0.2, 0.5, 0.5, 0.5),
    L(0.35, 0.65, 0.35, 0.35),
    L(-0.2, -0.35, 0.1, -0.35),
    L(-0.05, -0.2, -0.05, -0.5),
    C(0.4, -0.3, 0.1),
  ],
  votive: [
    A(-0.22, 0.05, 0.24, 0, PI),
    A(0.22, 0.05, 0.24, 0, PI),
    ...poly(-0.46, 0.05, 0, -0.55, 0.46, 0.05),
    ...poly(0, 0.45, 0.08, 0.65, 0, 0.8, -0.08, 0.65, 0, 0.45),
  ],
  eye: [A(0, -0.5, 0.85, PI * 0.2, PI * 0.8), A(0, 0.5, 0.85, PI * 1.2, PI * 1.8), C(0, 0, 0.2)],
  chalice: [A(0, 0.35, 0.45, PI, 2 * PI), L(-0.45, 0.35, 0.45, 0.35), L(0, -0.1, 0, -0.5), L(-0.3, -0.55, 0.3, -0.55)],
  moon: [A(0, 0, 0.6, PI * 0.4, PI * 1.6), A(0.22, 0, 0.48, PI * 0.55, PI * 1.45)],
  seed: [
    C(0, -0.25, 0.3),
    ...poly(0, 0.05, 0, 0.5),
    ...poly(0, 0.35, -0.3, 0.6, -0.05, 0.55),
    ...poly(0, 0.45, 0.3, 0.7, 0.05, 0.65),
  ],
  vine: [
    A(0, 0, 0.55, 0, PI * 1.5),
    A(0, 0, 0.3, PI * 0.5, PI * 2),
    ...poly(0.55, 0, 0.75, 0.25),
    ...poly(-0.3, 0, -0.5, -0.2),
  ],
  anvil: [
    L(-0.65, 0.3, 0.55, 0.3),
    ...poly(0.55, 0.3, 0.7, 0.15),
    L(-0.35, 0.3, -0.2, -0.1),
    L(0.25, 0.3, 0.1, -0.1),
    L(-0.2, -0.1, 0.1, -0.1),
    L(-0.45, -0.5, 0.45, -0.5),
    L(-0.2, -0.1, -0.3, -0.5),
    L(0.1, -0.1, 0.2, -0.5),
  ],
  socket: [C(0, 0, 0.6), C(0, 0, 0.3), ...poly(0, 0.15, 0.13, 0, 0, -0.15, -0.13, 0, 0, 0.15)],
  nose: [
    ...poly(-0.15, 0.1, -0.15, -0.25),
    ...poly(0.15, 0.1, 0.15, -0.25),
    A(0, -0.4, 0.3, PI, 2 * PI),
    L(-0.3, -0.4, 0.3, -0.4),
    A(-0.15, 0.45, 0.12, 0, PI),
    A(0.1, 0.45, 0.12, PI, 2 * PI),
    A(0.15, 0.7, 0.1, 0, PI),
  ],
  pouch: [
    A(0, -0.15, 0.5, PI * 1.05, PI * 1.95),
    L(-0.48, -0.3, -0.25, 0.3),
    L(0.48, -0.3, 0.25, 0.3),
    L(-0.3, 0.3, 0.3, 0.3),
    ...poly(-0.15, 0.3, 0, 0.5, 0.15, 0.3),
  ],
  flask: [C(0, -0.25, 0.4), L(-0.12, 0.15, -0.12, 0.55), L(0.12, 0.15, 0.12, 0.55), L(-0.2, 0.58, 0.2, 0.58)],
  glow: [
    C(0, 0, 0.25),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
      const a = (k * PI) / 4;
      return L(Math.cos(a) * 0.42, Math.sin(a) * 0.42, Math.cos(a) * 0.72, Math.sin(a) * 0.72);
    }),
  ],
};

const W = 0.1; // (a stroke's width on the disc)
/** Boon `id`'s sigil (a second ring at `rank` 2): a disc facing +z. */
export function boonLook(id: string, rank = 1) {
  const def = boon(id),
    col = new THREE.Color(def.color),
    g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9, flatShading: true });
  const glowing = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.5 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 28), stone);
  disc.rotation.x = PI / 2;
  g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 6, 36), glowing);
  g.add(rim);
  if (rank >= 2) {
    const outer = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.07, 6, 36), glowing);
    g.add(outer);
  }
  emblem(g, SIGILS[def.icon] ?? SIGILS.glow, glowing, W);
  return g;
}

/** Boon `id`'s 24 px icon at `rank`, rendered once and kept. */
export const boonIconUrl = (id: string, rank = 1) =>
  iconUrlOf(`boon:${id}:${rank >= 2 ? 2 : 1}`, () => boonLook(id, rank), boon(id).color);
/** The icon as an <img>, shown in whole pixels. */
export const boonIconImg = (id: string, rank = 1) => `<img class="px" src="${boonIconUrl(id, rank)}" alt="">`;
