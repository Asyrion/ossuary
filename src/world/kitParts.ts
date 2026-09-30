/* The room kit's shared parts (M3.5 step 3): the painted materials every piece is built from (`paint` in
   render/materials.ts: an object's still body draws in one call), placing a mesh, joining geometries into one, and a
   carved rune. fireLooks.ts (the fire objects) and mechLooks.ts (the other mechanisms) build from them. */
import * as THREE from 'three';
import { markShared, paint } from '../render/materials';

export const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
// Iron a little lighter than the placeholders' so its edges catch the torchlight in the pixel look; the glowing embers
// keep a material of their own.
export const MAT = {
  iron: paint(0x4a4548), bronze: paint(0xa27a3e), wood: paint(0x563a26), pitch: paint(0x1e1611), coals: paint(0x241f1c), wax: paint(0xf0e2c6),
  bone: paint(0xd6cab0), skull: paint(0xa89c84), stone: paint(0x77716a), darkStone: paint(0x4a4440), verdigris: paint(0x4f8a76), blackIron: paint(0x2c2a2c), socket: paint(0x16100c),
  copper: paint(0xb06a40), lode: paint(0x3a3842), gilt: paint(0xc49a4a), lichen: paint(0x6a7a52), darkBronze: paint(0x6e5028),
  ember: markShared(new THREE.MeshStandardMaterial({ color: 0x3a1a0e, emissive: 0x5a1e06, roughness: 1, flatShading: true })),
};

/** A mesh of `geo` in `mat` at (x, y, z), added to `parent`. */
export const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
};

/** Geometries joined into one (positions and normals), the parts disposed: many pieces, one draw call. */
export function joinAll(parts: THREE.BufferGeometry[]) {
  const flat = parts.map(p => { const x = p.index ? p.toNonIndexed() : p; for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; });
  const out = new THREE.BufferGeometry(), n = flat.reduce((s, p) => s + p.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const p of flat) { pos.set(p.attributes.position.array as Float32Array, o * 3); nor.set(p.attributes.normal.array as Float32Array, o * 3); o += p.attributes.position.count; }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  for (const p of [...parts, ...flat]) p.dispose();
  return out;
}

/** A carved rune (three strokes), one geometry, facing +Z, `s` tall. */
export function runeStrokes(s: number) {
  const box = (w: number, h: number) => new THREE.BoxGeometry(w * s, h * s, .02);
  const a = box(.16, 1), b = box(.14, .55).rotateZ(.7).translate(-s * .17, s * .16, 0), c = box(.14, .55).rotateZ(.7).translate(s * .17, -s * .12, 0);
  return joinAll([a, b, c]);
}
