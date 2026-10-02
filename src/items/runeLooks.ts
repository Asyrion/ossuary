/* M6 step 7: each rune as a stone with its glyph cut in it, glowing in the rune's colour (data/runes.json). Its 24 px icon
   is made through `iconUrlOf`, as the boons' sigils and the artifacts' icons are (one pixel for everything); the spell's
   panel, the inventory and the dev menu show it, and step 8's runes lying in a room are this look. Each glyph is a few
   strokes on a disc of radius 1 (render/emblem.ts), angular as runes are cut. */
import * as THREE from 'three';
import { iconUrlOf } from './artifactIcons';
import { A, C, L, emblem, poly, type Stroke } from '../render/emblem';
import { rune, type RuneId } from '../magic/runeData';

const PI = Math.PI;
const GLYPHS: Record<string, Stroke[]> = {
  thrice: [L(0, -.75, 0, .05), ...poly(-.45, .65, 0, .05, .45, .65), L(0, .05, 0, .75)], // (one stem, three heads)
  reprise: [...poly(-.35, .7, .25, .35, -.35, 0), ...poly(-.35, .15, .25, -.2, -.35, -.55)], // (the stroke cut twice)
  seeking: [A(0, 0, .55, PI * .3, PI * 1.75), ...poly(.2, -.62, .39, -.39, .55, -.58), C(0, 0, .12)], // (a turn ending in a point)
  wide: [L(-.7, 0, .7, 0), ...poly(-.42, .28, -.7, 0, -.42, -.28), ...poly(.42, .28, .7, 0, .42, -.28), L(0, .4, 0, -.4)], // (reaching both ways)
  quicken: [...poly(.32, .72, -.3, .18, .3, -.18, -.32, -.72)], // (a bolt)
  vein: [...poly(0, .72, -.38, -.05), ...poly(0, .72, .38, -.05), A(0, -.18, .38, PI * 1.05, PI * 1.95), L(0, .35, 0, -.3)], // (a drop)
  lasting: [L(-.45, .65, .45, .65), L(-.45, -.65, .45, -.65), ...poly(-.38, .65, .38, -.65), ...poly(.38, .65, -.38, -.65)], // (an hourglass)
};

/** Rune `id`: a flat stone, rough at the edges, its glyph glowing; facing +z. */
export function runeLook(id: RuneId) {
  const def = rune(id), col = new THREE.Color(def.color), g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x5a524a, roughness: .95, flatShading: true });
  const glowing = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: .5 });
  const slab = new THREE.CylinderGeometry(1, 1.06, .2, 7, 1); // (seven sides, a little wider at its foot: a stone, not a coin)
  const p = slab.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + Math.sin(a * 3 + 1.3) * .06 + Math.cos(a * 5) * .04; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * 1.12); }
  slab.computeVertexNormals();
  const body = new THREE.Mesh(slab, stone); body.rotation.x = PI / 2; g.add(body);
  emblem(g, GLYPHS[def.icon] ?? GLYPHS.quicken, glowing, .22, .12, .95); // (bold: a 24 px icon keeps it)
  return g;
}

/** Rune `id`'s 24 px icon, rendered once and kept. */
export const runeIconUrl = (id: RuneId) => iconUrlOf(`rune:${id}`, () => runeLook(id), rune(id).color);
/** The icon as an <img>, shown in whole pixels. */
export const runeIconImg = (id: RuneId) => `<img class="px" src="${runeIconUrl(id)}" alt="">`;
