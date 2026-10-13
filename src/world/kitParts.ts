/* The room kit's shared parts (M3.5 step 3): the painted materials every piece is built from (`paint` in
   render/materials.ts: an object's still body draws in one call), placing a mesh, joining geometries into one, and a
   carved rune, tapered tubes (roots, branches, canes), rough stone, and the colours of a floor's stone. fireLooks.ts (the
   fire objects), mechLooks.ts (the other mechanisms) and objectLooks.ts (the objects and piles) build from them. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { glowPaint, markShared, paint } from '../render/materials';

export const shared = <T extends THREE.BufferGeometry>(g: T) => {
  g.userData.shared = true;
  return g;
};
// Iron a little lighter than the placeholders' so its edges catch the torchlight in the pixel look; the glowing embers
// keep a material of their own.
export const MAT = {
  iron: paint(0x4a4548),
  bronze: paint(0xa27a3e),
  wood: paint(0x563a26),
  pitch: paint(0x1e1611),
  coals: paint(0x241f1c),
  wax: paint(0xf0e2c6),
  bone: paint(0xd6cab0),
  skull: paint(0xa89c84),
  stone: paint(0x77716a),
  darkStone: paint(0x4a4440),
  verdigris: paint(0x4f8a76),
  blackIron: paint(0x2c2a2c),
  socket: paint(0x16100c),
  copper: paint(0xb06a40),
  lode: paint(0x3a3842),
  gilt: paint(0xc49a4a),
  lichen: paint(0x6a7a52),
  darkBronze: paint(0x6e5028),
  ember: markShared(
    new THREE.MeshStandardMaterial({ color: 0x3a1a0e, emissive: 0x5a1e06, roughness: 1, flatShading: true }),
  ),
};

/** A mesh of `geo` in `mat` at (x, y, z), added to `parent`. */
export const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};

/** Geometries joined into one (positions and normals), the parts disposed: many pieces, one draw call. */
export function joinAll(parts: THREE.BufferGeometry[]) {
  const flat = parts.map((p) => {
    const x = p.index ? p.toNonIndexed() : p;
    for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
    return x;
  });
  const out = new THREE.BufferGeometry(),
    n = flat.reduce((s, p) => s + p.attributes.position.count, 0);
  const pos = new Float32Array(n * 3),
    nor = new Float32Array(n * 3);
  let o = 0;
  for (const p of flat) {
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    o += p.attributes.position.count;
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  for (const p of [...parts, ...flat]) p.dispose();
  return out;
}

/** A carved rune (three strokes), one geometry, facing +Z, `s` tall. */
export function runeStrokes(s: number) {
  const box = (w: number, h: number) => new THREE.BoxGeometry(w * s, h * s, 0.02);
  const a = box(0.16, 1),
    b = box(0.14, 0.55)
      .rotateZ(0.7)
      .translate(-s * 0.17, s * 0.16, 0),
    c = box(0.14, 0.55)
      .rotateZ(0.7)
      .translate(s * 0.17, -s * 0.12, 0);
  return joinAll([a, b, c]);
}

const tones = new Map<string, THREE.Material>();
/** A painted colour, shared by every piece of that colour (`mottle`, `metal`: see `paint`; matte unless said). */
export const tone = (color: number, mottle = 0, metal = 0) => {
  const k = color + ':' + mottle + ':' + metal;
  let m = tones.get(k);
  if (!m) tones.set(k, (m = paint(color, mottle, metal)));
  return m;
};
/** A glowing painted colour, shared. */
export const glowTone = (color: number) => {
  const k = 'g' + color;
  let m = tones.get(k);
  if (!m) tones.set(k, (m = glowPaint(color)));
  return m;
};
/** A colour a little lighter (`k` > 1) or darker. */
export const shade = (color: number, k: number) => new THREE.Color(color).multiplyScalar(k).getHex();

/** The stone of a floor's rooms, from its walls' brick (`k` lighter): pillars, tombs, rocks and rubble match the walls. */
export function stoneOf(look: FloorLook | undefined, k = 1.3) {
  const [r, g, b] = (look?.wall.brick ?? [76, 68, 60]).map((v) => Math.min(255, Math.round(v * k)));
  return new THREE.Color(`rgb(${r},${g},${b})`).getHex();
}

/** A tube along `curve` from radius `r0` to `r1`: roots, branches, canes. */
export function taperTube(curve: THREE.Curve<THREE.Vector3>, segs: number, r0: number, r1: number, radial = 5) {
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false),
    pos = g.attributes.position,
    c = new THREE.Vector3(),
    v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const r = r0 + ((r1 - r0) * i) / segs;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}
/** A curve through points given as [x, y, z]. */
export const curve = (pts: number[][]) =>
  new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));

/** A geometry made rough: every corner pushed in or out by up to `amount`, the same corner always the same way, so
    faces stay joined. */
export function rough(geo: THREE.BufferGeometry, amount: number, seed = 0) {
  const pos = geo.attributes.position,
    v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = (n: number) => {
      const x =
        Math.sin(
          Math.round(v.x * 997) * 1.37 + Math.round(v.y * 997) * 2.71 + Math.round(v.z * 997) * 3.93 + seed * 7.1 + n,
        ) * 43758.5453;
      return x - Math.floor(x) - 0.5;
    };
    pos.setXYZ(i, v.x + h(1) * amount, v.y + h(2) * amount, v.z + h(3) * amount);
  }
  geo.computeVertexNormals();
  return geo;
}
