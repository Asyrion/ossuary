/* Emblems drawn in strokes: the boons' sigils (progression/boonLooks.ts) and the runes' glyphs (items/runeLooks.ts).
   A stroke is a line, a circle or an arc on a disc of radius 1 (y up); `emblem` builds them as thin glowing pieces facing
   +z, in front of whatever they are carved on. */
import * as THREE from 'three';

/** A stroke: a line from (x0, y0) to (x1, y1), a circle at (x, y) of radius r, or an arc of it from angle a0 to a1. */
export type Stroke =
  | { l: [number, number, number, number] }
  | { c: [number, number, number] }
  | { a: [number, number, number, number, number] };
export const L = (x0: number, y0: number, x1: number, y1: number): Stroke => ({ l: [x0, y0, x1, y1] });
export const C = (x: number, y: number, r: number): Stroke => ({ c: [x, y, r] });
export const A = (x: number, y: number, r: number, a0: number, a1: number): Stroke => ({ a: [x, y, r, a0, a1] });
/** Lines joining the points (x, y pairs) in turn. */
export const poly = (...p: number[]) => {
  const out: Stroke[] = [];
  for (let i = 0; i + 3 < p.length; i += 2) out.push(L(p[i], p[i + 1], p[i + 2], p[i + 3]));
  return out;
};

/** The strokes as meshes of `mat` in `g`, `w` wide, at depth `z`, the disc's radius 1 scaled by `scale`. */
export function emblem(g: THREE.Group, strokes: readonly Stroke[], mat: THREE.Material, w = 0.1, z = 0.06, scale = 1) {
  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x * scale, y * scale, z);
    o.rotation.z = rz;
    o.scale.setScalar(scale);
    g.add(o);
  };
  for (const s of strokes) {
    if ('l' in s) {
      const [x0, y0, x1, y1] = s.l,
        len = Math.hypot(x1 - x0, y1 - y0);
      add(new THREE.BoxGeometry(len + w, w, w), (x0 + x1) / 2, (y0 + y1) / 2, Math.atan2(y1 - y0, x1 - x0));
    } else if ('c' in s) {
      const [x, y, r] = s.c;
      add(new THREE.TorusGeometry(r, w / 2, 4, 24), x, y);
    } else {
      const [x, y, r, a0, a1] = s.a;
      add(new THREE.TorusGeometry(r, w / 2, 4, 20, a1 - a0), x, y, a0);
    }
  }
}
