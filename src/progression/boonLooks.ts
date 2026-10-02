/* M6 step 4: each boon's sigil, built in code (docs/M6-plan.md): a dark stone medallion with a rim and an emblem drawn in
   strokes of the boon's colour, glowing; a second rank wears a second ring. Its 24 px icon is made through `iconUrlOf`, as
   the artifacts', bottles' and reagents' are (one pixel for everything). Each emblem is a few strokes on a disc of radius
   1 (y up): lines, circles and arcs (render/emblem.ts, shared with the runes' glyphs). */
import * as THREE from 'three';
import { iconUrlOf } from '../items/artifactIcons';
import { A, C, L, emblem, poly, type Stroke } from '../render/emblem';
import { boon } from './boonData';

const PI = Math.PI;

const SIGILS: Record<string, Stroke[]> = {
  coals: [C(-.32, -.3, .2), C(.32, -.3, .2), C(0, .08, .2), ...poly(0, .36, .1, .62, 0, .78)],
  flame: [...poly(0, .75, .38, .05, .22, -.5, -.22, -.5, -.38, .05, 0, .75), ...poly(0, .2, .12, -.15, 0, -.35, -.12, -.15, 0, .2)],
  snowflake: [L(0, -.75, 0, .75), L(-.65, -.38, .65, .38), L(-.65, .38, .65, -.38), ...poly(-.15, .55, 0, .4, .15, .55), ...poly(-.15, -.55, 0, -.4, .15, -.55)],
  breath: [A(-.25, .35, .3, 0, PI), A(.25, .35, .3, PI, 2 * PI), A(-.25, -.15, .3, 0, PI), A(.25, -.15, .3, PI, 2 * PI), L(-.55, -.55, .55, -.55)],
  fork: [...poly(.05, .8, -.2, .15, .15, .1, -.1, -.75), L(.15, .1, .55, -.45)],
  sparks: [L(-.5, .35, -.2, .35), L(-.35, .5, -.35, .2), L(.2, .5, .5, .5), L(.35, .65, .35, .35), L(-.2, -.35, .1, -.35), L(-.05, -.2, -.05, -.5), C(.4, -.3, .1)],
  votive: [A(-.22, .05, .24, 0, PI), A(.22, .05, .24, 0, PI), ...poly(-.46, .05, 0, -.55, .46, .05), ...poly(0, .45, .08, .65, 0, .8, -.08, .65, 0, .45)],
  eye: [A(0, -.5, .85, PI * .2, PI * .8), A(0, .5, .85, PI * 1.2, PI * 1.8), C(0, 0, .2)],
  chalice: [A(0, .35, .45, PI, 2 * PI), L(-.45, .35, .45, .35), L(0, -.1, 0, -.5), L(-.3, -.55, .3, -.55)],
  moon: [A(0, 0, .6, PI * .4, PI * 1.6), A(.22, 0, .48, PI * .55, PI * 1.45)],
  seed: [C(0, -.25, .3), ...poly(0, .05, 0, .5), ...poly(0, .35, -.3, .6, -.05, .55), ...poly(0, .45, .3, .7, .05, .65)],
  vine: [A(0, 0, .55, 0, PI * 1.5), A(0, 0, .3, PI * .5, PI * 2), ...poly(.55, 0, .75, .25), ...poly(-.3, 0, -.5, -.2)],
  anvil: [L(-.65, .3, .55, .3), ...poly(.55, .3, .7, .15), L(-.35, .3, -.2, -.1), L(.25, .3, .1, -.1), L(-.2, -.1, .1, -.1), L(-.45, -.5, .45, -.5), L(-.2, -.1, -.3, -.5), L(.1, -.1, .2, -.5)],
  socket: [C(0, 0, .6), C(0, 0, .3), ...poly(0, .15, .13, 0, 0, -.15, -.13, 0, 0, .15)],
  nose: [...poly(-.15, .1, -.15, -.25), ...poly(.15, .1, .15, -.25), A(0, -.4, .3, PI, 2 * PI), L(-.3, -.4, .3, -.4), A(-.15, .45, .12, 0, PI), A(.1, .45, .12, PI, 2 * PI), A(.15, .7, .1, 0, PI)],
  pouch: [A(0, -.15, .5, PI * 1.05, PI * 1.95), L(-.48, -.3, -.25, .3), L(.48, -.3, .25, .3), L(-.3, .3, .3, .3), ...poly(-.15, .3, 0, .5, .15, .3)],
  flask: [C(0, -.25, .4), L(-.12, .15, -.12, .55), L(.12, .15, .12, .55), L(-.2, .58, .2, .58)],
  glow: [C(0, 0, .25), ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * PI / 4; return L(Math.cos(a) * .42, Math.sin(a) * .42, Math.cos(a) * .72, Math.sin(a) * .72); })],
};

const W = .1; // (a stroke's width on the disc)
/** Boon `id`'s sigil (a second ring at `rank` 2): a disc facing +z. */
export function boonLook(id: string, rank = 1) {
  const def = boon(id), col = new THREE.Color(def.color), g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: .9, flatShading: true });
  const glowing = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .8, roughness: .5 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, .12, 28), stone); disc.rotation.x = PI / 2; g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, .07, 6, 36), glowing); g.add(rim);
  if (rank >= 2) { const outer = new THREE.Mesh(new THREE.TorusGeometry(1.24, .07, 6, 36), glowing); g.add(outer); }
  emblem(g, SIGILS[def.icon] ?? SIGILS.glow, glowing, W);
  return g;
}

/** Boon `id`'s 24 px icon at `rank`, rendered once and kept. */
export const boonIconUrl = (id: string, rank = 1) => iconUrlOf(`boon:${id}:${rank >= 2 ? 2 : 1}`, () => boonLook(id, rank), boon(id).color);
/** The icon as an <img>, shown in whole pixels. */
export const boonIconImg = (id: string, rank = 1) => `<img class="px" src="${boonIconUrl(id, rank)}" alt="">`;
