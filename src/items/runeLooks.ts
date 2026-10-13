/* M6 step 7: each rune as a stone with its glyph cut in it, glowing in the rune's colour (data/runes.json). Its 24 px icon
   is made through `iconUrlOf`, as the boons' sigils and the artifacts' icons are (one pixel for everything); the spell's
   panel, the inventory and the dev menu show it, and step 8's runes lying in a room or over a ward circle are this look
   made small (`runePickupLook`). Each glyph is a few strokes on a disc of radius 1 (render/emblem.ts), angular as runes are
   cut. */
import * as THREE from 'three';
import { iconUrlOf } from './artifactIcons';
import { CFG } from '../config';
import { TILT } from '../render/renderer';
import { glowShared } from '../render/materials';
import { glowTone, tone } from '../world/kitParts';
import { keep } from './pickupLooks';
import { A, C, L, emblem, poly, type Stroke } from '../render/emblem';
import { rune, type RuneId } from '../magic/runeData';

const PI = Math.PI;
const GLYPHS: Record<string, Stroke[]> = {
  thrice: [L(0, -0.75, 0, 0.05), ...poly(-0.45, 0.65, 0, 0.05, 0.45, 0.65), L(0, 0.05, 0, 0.75)], // (one stem, three heads)
  reprise: [...poly(-0.35, 0.7, 0.25, 0.35, -0.35, 0), ...poly(-0.35, 0.15, 0.25, -0.2, -0.35, -0.55)], // (the stroke cut twice)
  seeking: [A(0, 0, 0.55, PI * 0.3, PI * 1.75), ...poly(0.2, -0.62, 0.39, -0.39, 0.55, -0.58), C(0, 0, 0.12)], // (a turn ending in a point)
  wide: [
    L(-0.7, 0, 0.7, 0),
    ...poly(-0.42, 0.28, -0.7, 0, -0.42, -0.28),
    ...poly(0.42, 0.28, 0.7, 0, 0.42, -0.28),
    L(0, 0.4, 0, -0.4),
  ], // (reaching both ways)
  quicken: [...poly(0.32, 0.72, -0.3, 0.18, 0.3, -0.18, -0.32, -0.72)], // (a bolt)
  vein: [
    ...poly(0, 0.72, -0.38, -0.05),
    ...poly(0, 0.72, 0.38, -0.05),
    A(0, -0.18, 0.38, PI * 1.05, PI * 1.95),
    L(0, 0.35, 0, -0.3),
  ], // (a drop)
  lasting: [
    L(-0.45, 0.65, 0.45, 0.65),
    L(-0.45, -0.65, 0.45, -0.65),
    ...poly(-0.38, 0.65, 0.38, -0.65),
    ...poly(0.38, 0.65, -0.38, -0.65),
  ], // (an hourglass)
};

/** Rune `id`: a flat stone, rough at the edges, its glyph glowing; facing +z. */
export function runeLook(id: RuneId) {
  const def = rune(id),
    col = new THREE.Color(def.color),
    g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5a524a, roughness: 0.95, flatShading: true });
  const glowing = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: 0.5 });
  const slab = new THREE.CylinderGeometry(1, 1.06, 0.2, 7, 1); // (seven sides, a little wider at its foot: a stone, not a coin)
  const p = slab.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)),
      k = 1 + Math.sin(a * 3 + 1.3) * 0.06 + Math.cos(a * 5) * 0.04;
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k * 1.12);
  }
  slab.computeVertexNormals();
  const body = new THREE.Mesh(slab, stone);
  body.rotation.x = PI / 2;
  g.add(body);
  emblem(g, GLYPHS[def.icon] ?? GLYPHS.quicken, glowing, 0.22, 0.12, 0.95); // (bold: a 24 px icon keeps it)
  return g;
}

/** Rune `id`'s 24 px icon, rendered once and kept. */
export const runeIconUrl = (id: RuneId) => iconUrlOf(`rune:${id}`, () => runeLook(id), rune(id).color);
/** The icon as an <img>, shown in whole pixels. */
export const runeIconImg = (id: RuneId) => `<img class="px" src="${runeIconUrl(id)}" alt="">`;

const chips = new Map<RuneId, THREE.Object3D>();
/** Rune `id` lying in a room (M6 step 8): its stone made a chip, tipped to the camera as the flat pickups are, painted as the
    room kit's pieces are (the stone and its glowing glyph in the vertices, merged), a stepped glow in its colour behind it.
    Built once a rune and copied. */
export function runePickupLook(id: RuneId) {
  let t = chips.get(id);
  if (!t) {
    const g = new THREE.Group(),
      f = new THREE.Group();
    f.rotation.x = -TILT;
    g.add(f);
    const stone = runeLook(id),
      col = new THREE.Color(rune(id).color).getHex();
    stone.scale.setScalar(CFG.runeDrops.chip);
    f.add(stone);
    stone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const was = m.material as THREE.MeshStandardMaterial;
      m.material = was.emissiveIntensity > 1 ? glowTone(col) : tone(0x5a524a, 0.2);
      was.dispose();
    });
    g.add(glowShared(col, 0.75, 0.45));
    chips.set(id, (t = keep(g)));
  }
  return t.clone();
}
