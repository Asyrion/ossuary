/* The arcane building blocks the code-built models and effects share (foes, bosses, Fen-Nex, the spells, the dev
   galleries): plain and glowing materials, parts placed in one call, rods between two points, and the pieces that make
   a thing look magical in the pixel look: runes, rune rings, magic circles, crystals, motes, lightning, expanding
   rings. */
import * as THREE from 'three';

export type V3 = [number, number, number];

/** Each school's light: the rune, crystal, mote and spell colour (M5: Verdant's spring green). */
export const SCHOOL_LIGHT = {
  ember: 0xff7a2a,
  frost: 0x7fd4ff,
  storm: 0xf0e070,
  hallow: 0xffd878,
  umbral: 0xa266ff,
  verdant: 0x9ae04a,
} as const;
export type School = keyof typeof SCHOOL_LIGHT;

/** A flat-shaded surface, as the placeholder foes have. */
export const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
/** Its own light: eyes, runes, flames (unlit by the room). */
export const lit = (color: number, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
/** Added light: glows, beams, rings, smoke of fire (brightens what is behind it). */
export const shine = (color: number, opacity = 0.6) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

export function part(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  at: V3,
  o: { rot?: V3; scale?: V3 | number } = {},
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...at);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale !== undefined) {
    if (typeof o.scale === 'number') m.scale.setScalar(o.scale);
    else m.scale.set(...o.scale);
  }
  parent.add(m);
  return m;
}
const Y = new THREE.Vector3(0, 1, 0);
/** A rod of radius `r` from a to b (a bone, an arm, a leg, a handle). */
export function limb(parent: THREE.Object3D, a: V3, b: V3, r: number, mat: THREE.Material, r2 = r) {
  const va = new THREE.Vector3(...a),
    d = new THREE.Vector3(...b).sub(va),
    len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, 6), mat);
  m.position.copy(va).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(Y, d.normalize());
  parent.add(m);
  return m;
}
export const sphere = (r: number, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const eyes = (parent: THREE.Object3D, color: number, x: number, y: number, z: number, r = 0.035) => {
  const m = lit(color);
  part(parent, sphere(r, 6, 5), m, [-x, y, z]);
  part(parent, sphere(r, 6, 5), m, [x, y, z]);
};
/** Big round eyes that read at a glance even on something small (the critters'): white, a large pupil turned a little up
    towards the camera, and a glint; placed at (±x, y, z), turned outwards by `yaw`. Returns the two, to blink (scale.y). */
export function bigEyes(parent: THREE.Object3D, x: number, y: number, z: number, r = 0.06, pupil = 0x1a1224, yaw = 0) {
  const white = lit(0xf4f0e6),
    dark = lit(pupil),
    glint = lit(0xffffff);
  return [-1, 1].map((s) => {
    const e = new THREE.Group();
    e.position.set(x * s, y, z);
    e.rotation.y = yaw * s;
    parent.add(e);
    part(e, sphere(r, 10, 8), white, [0, 0, 0]);
    part(e, sphere(r * 0.64, 8, 6), dark, [0, r * 0.22, r * 0.48]);
    part(e, sphere(r * 0.2, 5, 4), glint, [r * 0.2, r * 0.5, r * 0.9]);
    return e;
  });
}

/** A glowing rune: three strokes, facing +Z, `s` tall. */
export function rune(
  parent: THREE.Object3D,
  color: number,
  at: V3,
  s = 0.1,
  rot: V3 = [0, 0, 0],
  mat: THREE.Material = lit(color),
) {
  const g = new THREE.Group();
  g.position.set(...at);
  g.rotation.set(...rot);
  parent.add(g);
  part(g, box(s * 0.14, s, s * 0.1), mat, [0, 0, 0]);
  part(g, box(s * 0.12, s * 0.55, s * 0.1), mat, [-s * 0.16, s * 0.16, 0], { rot: [0, 0, 0.7] });
  part(g, box(s * 0.12, s * 0.55, s * 0.1), mat, [s * 0.16, -s * 0.12, 0], { rot: [0, 0, 0.7] });
  return g;
}
/** A thin ring with runes standing round it (turn it with `rot`; spin it as it plays). Lies flat (in XZ) unless turned. */
export function runeRing(
  parent: THREE.Object3D,
  color: number,
  radius: number,
  at: V3,
  count = 6,
  rot: V3 = [0, 0, 0],
  m: THREE.MeshBasicMaterial = shine(color, 0.8),
) {
  const g = new THREE.Group();
  g.position.set(...at);
  g.rotation.set(...rot);
  parent.add(g);
  part(g, new THREE.TorusGeometry(radius, radius * 0.035, 4, 28), m, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    rune(g, color, [Math.cos(a) * radius, 0, Math.sin(a) * radius], radius * 0.3, [0, -a + Math.PI / 2, 0], m);
  }
  return g;
}
/** A magic circle on the floor: two rings and ticks between them; `mat` shared so it can fade as one. */
export function circle(
  parent: THREE.Object3D,
  color: number,
  radius: number,
  mat: THREE.MeshBasicMaterial = shine(color, 0.35),
) {
  const g = new THREE.Group();
  g.position.y = 0.015;
  parent.add(g);
  part(g, new THREE.RingGeometry(radius * 0.92, radius, 40), mat, [0, 0, 0], { rot: [-Math.PI / 2, 0, 0] });
  part(g, new THREE.RingGeometry(radius * 0.62, radius * 0.66, 32), mat, [0, 0, 0], { rot: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(
      g,
      box(radius * 0.05, 0.002, radius * 0.22),
      mat,
      [Math.cos(a) * radius * 0.79, 0, Math.sin(a) * radius * 0.79],
      { rot: [0, -a + Math.PI / 2, 0] },
    );
  }
  return g;
}
/** A glowing crystal, `h` tall. */
export const crystal = (
  parent: THREE.Object3D,
  color: number,
  at: V3,
  h = 0.2,
  rot: V3 = [0, 0, 0],
  mat: THREE.Material = lit(color),
) => part(parent, new THREE.OctahedronGeometry(h / 2), mat, at, { rot, scale: [0.45, 1, 0.45] });
/** `n` motes of light round a centre; the returned function moves them (orbit, and a slow rise and fall). */
export function motes(parent: THREE.Object3D, color: number, n: number, radius: number, y: number, size = 0.025) {
  const m = lit(color),
    list = Array.from({ length: n }, () => part(parent, new THREE.OctahedronGeometry(size), m, [0, y, 0]));
  return (t: number, speed = 1) =>
    list.forEach((o, i) => {
      const a = t * speed + (i / n) * Math.PI * 2;
      o.position.set(Math.cos(a) * radius, y + Math.sin(t * 1.7 + i * 2.1) * radius * 0.3, Math.sin(a) * radius);
    });
}

/** A jagged bolt of lightning of `n` segments, a bright core in a coloured sheath; `set` draws it from a to b, jittered
    by `seed` (a new seed each flicker). */
export function lightningBolt(parent: THREE.Object3D, color: number, n = 8, width = 0.03) {
  // (the core adds light, so it reads white over anything; segments overlap a little, so the bolt has no gaps)
  const core = shine(0xffffff, 1),
    sheath = shine(color, 0.55),
    segs = Array.from({ length: n }, () => [
      part(parent, box(width, 1, width), core, [0, 0, 0]),
      part(parent, box(width * 2.2, 1, width * 2.2), sheath, [0, 0, 0]),
    ]);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    p = new THREE.Vector3(),
    q = new THREE.Vector3(),
    d = new THREE.Vector3(),
    side = new THREE.Vector3(),
    mid = new THREE.Vector3(),
    turn = new THREE.Quaternion();
  let rnd = 1;
  const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647 - 0.5;
  return {
    /** Its two materials: recolour the sheath, fade both. */
    core,
    sheath,
    set(from: V3, to: V3, seed: number, jitter = 0.12, visible = true) {
      rnd = 1 + ((Math.floor(seed) * 7919) % 2147483646);
      a.set(...from);
      b.set(...to);
      side.subVectors(b, a).cross(Y).normalize();
      p.copy(a);
      for (let i = 0; i < n; i++) {
        const k = (i + 1) / n;
        q.lerpVectors(a, b, k);
        if (i < n - 1) q.addScaledVector(side, r() * jitter * 2).y += r() * jitter * 2;
        d.subVectors(q, p);
        const len = d.length();
        mid.copy(p).addScaledVector(d, 0.5);
        turn.setFromUnitVectors(Y, d.normalize());
        for (const m of segs[i]) {
          m.visible = visible;
          m.position.copy(mid);
          m.quaternion.copy(turn);
          m.scale.y = len * 1.12;
        }
        p.copy(q);
      }
    },
  };
}
/** Many jagged bolts at once, drawn as instances (two draw calls whatever their number, up to `max` segments): crackling
    electricity round a Stormcharged champion (M4.7). Each flicker: `begin`, a `bolt` per bolt (from a to b in `segs`
    segments, jittered by `rnd`), `end`. */
export function lightningField(parent: THREE.Object3D, color: number, max = 64, width = 0.024) {
  const geo = box(1, 1, 1),
    core = new THREE.InstancedMesh(geo, shine(0xffffff, 1), max),
    sheath = new THREE.InstancedMesh(geo, shine(color, 0.55), max);
  for (const m of [core, sheath]) {
    m.count = 0;
    m.frustumCulled = false;
    m.renderOrder = 7;
    parent.add(m);
  }
  const mat = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    d = new THREE.Vector3(),
    side = new THREE.Vector3(),
    mid = new THREE.Vector3(),
    sc = new THREE.Vector3(),
    next = new THREE.Vector3();
  let n = 0;
  return {
    begin() {
      n = 0;
    },
    bolt(from: V3, to: V3, segs: number, jitter: number, rnd: () => number) {
      a.set(...from);
      b.set(...to);
      side.subVectors(b, a).cross(Y);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize();
      p.copy(a);
      for (let i = 0; i < segs && n < max; i++) {
        next.lerpVectors(a, b, (i + 1) / segs);
        if (i < segs - 1) {
          next.addScaledVector(side, (rnd() - 0.5) * jitter * 2);
          next.y += (rnd() - 0.5) * jitter * 2;
        }
        d.subVectors(next, p);
        const len = d.length();
        mid.copy(p).addScaledVector(d, 0.5);
        q.setFromUnitVectors(Y, d.normalize());
        core.setMatrixAt(n, mat.compose(mid, q, sc.set(width, len * 1.12, width)));
        sheath.setMatrixAt(n, mat.compose(mid, q, sc.set(width * 2.4, len * 1.12, width * 2.4)));
        n++;
        p.copy(next);
      }
    },
    end() {
      core.count = sheath.count = n;
      core.instanceMatrix.needsUpdate = sheath.instanceMatrix.needsUpdate = true;
    },
  };
}
/** A flat ring of light on the floor (or turned by `rot`), for waves and shocks: grow it with scale, fade its opacity. */
export const wave = (parent: THREE.Object3D, color: number, at: V3, rot: V3 = [-Math.PI / 2, 0, 0]) =>
  part(parent, new THREE.RingGeometry(0.85, 1, 40), shine(color, 0.8), at, { rot });
