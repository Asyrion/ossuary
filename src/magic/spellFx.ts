/* The spells' looks, and the cantrip's (every spell in the style the effect gallery
   tried, dev/effectOptions.ts; docs/effects.md is the guide for the ones to come). What a spell does stays where it
   was (magic/shapes.ts, combat/projectiles.ts, magic/statusFx.ts); those call these for how it looks:

   - bolts: `boltLook` dresses a cantrip bolt (a white-hot crystal, a rune ring turning round it, two runes trailing) or
     a spell's shard of ice (a splinter with a frost trail); `animateBolt` turns them as they fly; `impactFx` flares
     where one ends;
   - rings of light (`ringFx`): shockwaves on the floor and flashes turned to the camera;
   - lightning (`strikeFx`): a jagged bolt, a thin white core in a sheath of its colour, re-jagged every step and flickering;
   - the Cinder Lance (`lanceFx`), the Pyre Seal (`sealFx`), the Glacial Wall's pillars (`iceColumn`) and the Static
     Mantle (`mantleFx`).

   What plays often is built once and kept: rings, lightning and the lances are pooled (hidden when idle, shown again),
   and bolts share their geometries and, by colour, their materials. Timings in CFG.spellFx. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CFG } from '../config';
import type { Vec2 } from '../types';
import { camera, scene } from '../render/renderer';
import { bandGlow, basicMat, disposeTree, glow, markShared, mergeStill, sphereGeo } from '../render/materials';
import { modelFor } from '../assets/models';
import { floorShade, markThing } from '../render/pixelLook';
import { paleFx, paleShadow, paleTone } from '../world/paleFx';
import {
  SCHOOL_LIGHT,
  box,
  circle,
  deepen,
  lightningBolt,
  lit,
  part,
  rune,
  runeRing,
  shine,
  std,
  type V3,
} from '../render/arcane';

type P3 = { x: number; y: number; z: number };
/** A flat thing facing +Z, turned by this about X, faces the camera (which looks down at 45°). */
const TILT = -Math.PI / 4;

/* ---------- shared pieces ---------- */

const kept = new Map<string, unknown>();
/** One of a kind, made once and kept (marked shared, so nothing disposes it). */
function keep<T extends { userData: Record<string, unknown> }>(key: string, make: () => T): T {
  let v = kept.get(key) as T | undefined;
  if (!v) {
    v = markShared(make());
    kept.set(key, v);
  }
  return v;
}
/** A many-part piece as one geometry (what `build` puts in a group, in the group's space), so it draws in one call. */
function oneGeometry(build: (g: THREE.Group) => void) {
  const g = new THREE.Group(),
    geos: THREE.BufferGeometry[] = [],
    mats = new Set<THREE.Material>();
  build(g);
  g.updateMatrixWorld(true);
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const x = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
    x.applyMatrix4(m.matrixWorld);
    geos.push(x);
    m.geometry.dispose();
    mats.add(m.material as THREE.Material);
  });
  for (const m of mats) m.dispose();
  const out = mergeGeometries(geos);
  for (const x of geos) x.dispose();
  return out;
}
const octa = () => keep('fx.octa', () => new THREE.OctahedronGeometry(1, 0));
const cube = () => keep('fx.cube', () => new THREE.BoxGeometry(1, 1, 1));
/** A rune ring facing +Z (a thin ring with four runes round it), a unit in radius. */
const ringGeo = () =>
  keep('fx.runeRing', () => oneGeometry((g) => runeRing(g, 0xffffff, 1, [0, 0, 0], 4, [Math.PI / 2, 0, 0])));
/** One rune facing +Z, a unit tall. */
const runeGeo = () => keep('fx.rune', () => oneGeometry((g) => rune(g, 0xffffff, [0, 0, 0], 1)));
/** Added light in `color`, kept for everything of that `use` and colour. */
const shineOf = (use: string, color: number, opacity: number) =>
  keep(`fx.${use}.${color}`, () => shine(color, opacity));
/** A circle of magic drawn as pixel art (public/assets/textures/spells/<id>.png, made by tools/art/sigil.py from a
    made picture: white lines, the rest clear), sampled sharp; loaded once and kept. */
const sigilTex = (id: string) =>
  keep(`fx.sigil.${id}`, () => {
    const t = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/textures/spells/${id}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  });
/** The sigil `id` as a disc `radius` round, lying on the floor in added light of `color` (its material, to fade); or
    `drawn` in `color`, not added, and edged a game pixel round in a dark (`rimmed`, turned with it by `set`). */
function sigil(parent: THREE.Object3D, id: string, radius: number, color: number, drawn = false) {
  const mat = new THREE.MeshBasicMaterial({
    map: sigilTex(id),
    color,
    transparent: true,
    opacity: 0,
    blending: drawn ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
  });
  const m = new THREE.Mesh(
    keep('fx.sigilDisc', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)),
    mat,
  );
  m.scale.setScalar(radius);
  m.position.y = 0.02;
  parent.add(m);
  const rimMat = drawn
      ? new THREE.MeshBasicMaterial({
          map: sigilTex(id),
          color: hexOf(CFG.spellFx.hallow.edge),
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      : null,
    rims = rimMat ? rimmed(parent, m, rimMat) : [];
  return {
    m,
    mat,
    /** Turn it (and its edge) by `a` about Y, at `opacity` (its edge at its share of that). */
    set(a: number, opacity: number) {
      m.rotation.y = a;
      mat.opacity = opacity;
      for (const e of rims) e.rotation.y = a;
      if (rimMat) rimMat.opacity = opacity * CFG.spellFx.hallow.edgeOpacity;
    },
  };
}
/** A dark edge round the lines of `src` (a ring or a sigil lying on the floor): copies of it in `mat`, a game pixel to
    each side and drawn before it, added to `parent` beside it (a ring of light with no dark edge washed into a bright
    floor). */
function rimmed(parent: THREE.Object3D, src: THREE.Object3D, mat: THREE.Material) {
  const [px, pz] = CFG.roomKit.texel;
  return [
    [1 / px, 0],
    [-1 / px, 0],
    [0, 1 / pz],
    [0, -1 / pz],
  ].map(([dx, dz]) => {
    const e = src.clone();
    e.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = mat;
      m.renderOrder = -1; // (under the lines it edges, wherever the camera sorts it)
    });
    e.position.x += dx;
    e.position.z += dz;
    e.position.y -= 0.001;
    parent.add(e);
    return e;
  });
}
const hexOf = (c: string) => parseInt(c.slice(1), 16);
/** Hallow's gold, drawn (art bible 4.15: its light added over a bright floor came out cream-white, its gold lost). */
const hallowGold = () => hexOf(CFG.spellFx.hallow.gold);
/** A spell's made part (data/assets.json `props`: the ice, the bone hands, the thorns, the sword, the lantern; Tripo
    models worn as pixel art), or null while it isn't in: the spell then builds its own from code. */
const made = (id: string) => modelFor('props', id);
/** `c` taken towards white (a colour made white-hot). */
const whiter = (c: number, k = 0.6) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
/** Turn `o` (a flat thing facing +Z, in a parent turned by `yaw` about Y) to the camera, spun about itself by `spin`. */
function faceCamera(o: THREE.Object3D, yaw: number, spin: number) {
  o.rotation.order = 'YXZ';
  o.rotation.set(TILT, -yaw, spin);
}

/* ---------- bolts ---------- */

/** How a bolt looks: its core (first in the bolt's group), what it carries besides its glow and shadow (added after
    them), and how strong its glow is when not the usual. The cantrip: a crystal of its colour made white-hot, a rune ring
    turning round it and two runes trailing. A spell's shard (Rime Shards, Shatter): a splinter of ice with a frost trail.
    Pointing along +Z, where it flies. */
export function boltLook(
  color: number,
  scale: number,
  shard: boolean,
  sheathed = false,
): { core: THREE.Mesh; extras: THREE.Object3D[]; glow?: number } {
  if (shard) {
    // (its school's colour drawn deep along the splinter and its trail, white only as a thin core along its top, two game
    // pixels thick at least: a white splinter in a white halo was lost on a bright floor)
    const deep = deepen(color),
      core = new THREE.Mesh(octa(), basicMat(deep));
    core.scale.set(0.085 * scale, 0.085 * scale, 0.3 * scale);
    const heart = new THREE.Mesh(octa(), basicMat(0xffffff));
    heart.scale.set(0.03 * scale, 0.03 * scale, 0.2 * scale);
    heart.position.y = 0.07 * scale; // (on its top, where the camera sees it)
    const trail = new THREE.Mesh(
      cube(),
      keep(`fx.shardTrail.${deep}`, () => lit(deep, 0.6)),
    );
    trail.scale.set(0.06 * scale, 0.06 * scale, 0.5 * scale);
    trail.position.z = -0.3 * scale;
    return { core, extras: [heart, trail], glow: CFG.spellFx.shardGlow };
  }
  const core = new THREE.Mesh(octa(), basicMat(whiter(color)));
  core.scale.set(0.075 * scale, 0.075 * scale, 0.15 * scale);
  const sheath: THREE.Object3D[] = [];
  if (sheathed) {
    // (a dark school's orb, as a foe's shot is drawn (art bible 4.15, F3) but in the mage's rune ring: its colour drawn
    // deep round the core, ringed in dark, the core out on its top where the camera sees it; a thin ring of added violet
    // was lost on floor 3's maroon)
    const S = CFG.spellFx.sheath,
      deep = new THREE.Mesh(sphereGeo(S.size * scale), basicMat(deepen(color, S.deep))),
      edge = new THREE.Mesh(
        sphereGeo(S.edge * scale),
        keep('fx.sheathEdge', () => new THREE.MeshBasicMaterial({ color: hexOf(S.edgeColor), side: THREE.BackSide })),
      );
    core.scale.multiplyScalar(S.core);
    core.position.y = S.lift * scale;
    sheath.push(deep, edge);
  }
  const ring = new THREE.Mesh(ringGeo(), shineOf('ring', color, 0.85));
  ring.scale.setScalar(0.17 * scale);
  ring.userData.spin = 9;
  const trail = [0, 1].map((i) => {
    const m = new THREE.Mesh(runeGeo(), shineOf(`rune${i}`, color, 0.7 - i * 0.3));
    m.scale.setScalar((0.13 - i * 0.035) * scale);
    m.position.z = -(0.22 + i * 0.17) * scale;
    m.userData.spin = i ? -5 : 5;
    return m;
  });
  return { core, extras: [...sheath, ring, ...trail], glow: sheathed ? CFG.spellFx.sheath.glow : undefined };
}
/** Every step, as a bolt moves by (dx, dz): it turns to where it flies, and its ring and runes turn to the camera,
    spinning. */
export function animateBolt(mesh: THREE.Object3D, dx: number, dz: number, dt: number) {
  if (dx || dz) mesh.rotation.y = Math.atan2(dx, dz);
  for (const c of mesh.children)
    if (c.userData.spin) {
      const a = ((c.userData.a as number | undefined) ?? 0) + dt * (c.userData.spin as number);
      c.userData.a = a;
      faceCamera(c, mesh.rotation.y, a);
    }
}
/** Where a bolt ends: a small ring of its light flares and fades. */
export const impactFx = (x: number, y: number, z: number, color: number, size = 1) =>
  ringFx(x, y, z, color, 0.05, 0.32 * size, CFG.spellFx.impact);

/* ---------- rings of light ---------- */

interface Ring {
  m: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  life: number;
  from: number;
  to: number;
  opacity: number;
  /** Drawn rather than added, over a dark ring under it (a pale floor's: `CFG.paleFx.ring`). */ under?: THREE.Mesh;
}
const rings: Ring[] = [],
  idleRings: Ring[] = [],
  idleDrawn: Ring[] = [];
/** A ring of light at (x, y, z) growing from radius `from` to `to` and fading over `life` seconds: flat on the floor
    (a shockwave) or turned to the camera (a flash); `drawn` (a foe's on a pale floor, `CFG.paleFx.ring`), in the colour's
    deepened light laid over the floor rather than added, on a wider ring of the floor's shadow colour, fading in steps
    (added, a pale ring burnt white on floor 4's ivory). */
export function ringFx(
  x: number,
  y: number,
  z: number,
  color: number,
  from: number,
  to: number,
  life = CFG.spellFx.ring,
  flat = false,
  opacity = 0.85,
  drawn = false,
) {
  let r = (drawn ? idleDrawn : idleRings).pop();
  if (!r) {
    const mat = drawn
        ? new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })
        : shine(color, opacity),
      m = new THREE.Mesh(
        keep('fx.ringGeo', () => new THREE.RingGeometry(0.84, 1, 40)),
        mat,
      );
    let under: THREE.Mesh | undefined;
    if (drawn) {
      const [a, b] = CFG.paleFx.ring.under;
      under = new THREE.Mesh(
        keep('fx.ringUnder', () => new THREE.RingGeometry(a, b, 40)),
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      under.position.z = -0.002; // (below the ring, whichever way it is turned)
      under.renderOrder = 2;
      m.renderOrder = 3;
      m.add(under);
    }
    scene.add(m);
    r = { m, mat, t: 0, life, from, to, opacity, under };
  }
  r.mat.color.setHex(r.under ? paleTone(color) : color);
  if (r.under) (r.under.material as THREE.MeshBasicMaterial).color.setHex(paleShadow());
  r.m.position.set(x, y, z);
  r.m.rotation.set(flat ? -Math.PI / 2 : TILT, 0, 0);
  r.m.visible = true;
  Object.assign(r, { t: 0, life, from, to, opacity });
  stepRing(r, 0);
  rings.push(r);
}
function stepRing(r: Ring, dt: number) {
  r.t += dt;
  const k = Math.min(1, r.t / r.life);
  r.m.scale.setScalar(r.from + (r.to - r.from) * (1 - (1 - k) ** 3));
  if (r.under) {
    const R = CFG.paleFx.ring;
    r.mat.opacity = (r.opacity * Math.ceil((1 - k) * R.steps)) / R.steps;
    (r.under.material as THREE.MeshBasicMaterial).opacity = r.mat.opacity * R.underAlpha;
  } else r.mat.opacity = r.opacity * (1 - k);
  return k >= 1;
}

/* ---------- lightning ---------- */

interface Strike {
  root: THREE.Group;
  bolt: ReturnType<typeof lightningBolt>;
  ends: THREE.Sprite[];
  a: V3;
  b: V3;
  t: number;
  life: number;
  thin: boolean;
}
const strikes: Strike[] = [],
  idleStrikes: Strike[] = [];
let jag = 1;
/** Lightning from a to b in `color`, re-jagged every step and flickering, gone in `life` seconds, with a spark of
    light at both ends; `thin` for small arcs (the Static Mantle crackling). */
export function strikeFx(a: P3, b: P3, color: number, life: number = CFG.spellFx.strike, thin = false) {
  const i = idleStrikes.findIndex((s) => s.thin === thin);
  let s = i >= 0 ? idleStrikes.splice(i, 1)[0] : undefined;
  if (!s) {
    const root = new THREE.Group(),
      bolt = lightningBolt(root, color, thin ? 5 : 8, thin ? 0.02 : 0.045); // (two game pixels: one flickered away)
    const ends = [0, 1].map(() => {
      const e = glow(color, thin ? 0.3 : 0.55, 0.85);
      root.add(e);
      return e;
    });
    scene.add(root);
    s = { root, bolt, ends, a: [0, 0, 0], b: [0, 0, 0], t: 0, life, thin };
  }
  s.bolt.sheath.color.setHex(deepen(color));
  for (const e of s.ends) e.material.color.setHex(deepen(color));
  s.a = [a.x, a.y, a.z];
  s.b = [b.x, b.y, b.z];
  s.t = 0;
  s.life = life;
  s.root.visible = true;
  s.ends[0].position.set(a.x, a.y, a.z);
  s.ends[1].position.set(b.x, b.y, b.z);
  stepStrike(s, 0);
  strikes.push(s);
}
function stepStrike(s: Strike, dt: number) {
  s.t += dt;
  if (s.t >= s.life) return true;
  const k = 1 - s.t / s.life,
    len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]);
  s.bolt.set(s.a, s.b, jag++, len * 0.09 + 0.03, Math.random() > 0.15);
  s.bolt.core.opacity = k;
  s.bolt.sheath.opacity = CFG.spellFx.lightning.sheathOpacity * k;
  for (const e of s.ends) e.material.opacity = 0.85 * k;
  return false;
}

/* ---------- a drawn ray ---------- */

interface Beam {
  root: THREE.Group;
  core: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  edge: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  t: number;
  life: number;
}
const beams: Beam[] = [],
  idleBeams: Beam[] = [],
  bY = new THREE.Vector3(),
  bX = new THREE.Vector3(),
  bZ = new THREE.Vector3(),
  toCam = new THREE.Vector3(),
  bM = new THREE.Matrix4();
/** A ray from a to b on a pale floor (the radiant eye's, `CFG.paleFx.beam`): straight, in `color`'s deep tone inside an
    edge of the floor's shadow colour, drawn rather than added and turned flat to the camera, fading in steps over
    `life` seconds (lightning there read as a storm's bolt, and its added light burnt white). */
export function beamFx(a: P3, b: P3, color: number, life: number = CFG.spellFx.strike) {
  let s = idleBeams.pop();
  if (!s) {
    const plane = keep('fx.beam', () => new THREE.PlaneGeometry(1, 1)),
      mat = () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      root = new THREE.Group(),
      edge = new THREE.Mesh(plane, mat()),
      core = new THREE.Mesh(plane, mat());
    edge.renderOrder = 4;
    core.renderOrder = 5;
    core.position.z = 0.002;
    root.add(edge, core);
    scene.add(root);
    s = { root, core, edge, t: 0, life };
  }
  const B = CFG.paleFx.beam,
    px = 1 / Math.min(...CFG.roomKit.texel),
    len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  s.core.material.color.setHex(paleTone(color));
  s.edge.material.color.setHex(paleShadow());
  s.core.scale.set(B.width * px, len, 1);
  s.edge.scale.set((B.width + 2 * B.edge) * px, len + 2 * B.edge * px, 1);
  // its length along a to b, its face turned as near the camera as that lets it
  bY.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
  camera.getWorldDirection(toCam).negate();
  bX.crossVectors(bY, toCam).normalize();
  bZ.crossVectors(bX, bY);
  s.root.quaternion.setFromRotationMatrix(bM.makeBasis(bX, bY, bZ));
  s.root.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  Object.assign(s, { t: 0, life });
  s.root.visible = true;
  stepBeam(s, 0);
  beams.push(s);
}
function stepBeam(s: Beam, dt: number) {
  s.t += dt;
  const B = CFG.paleFx.beam,
    k = Math.ceil((1 - Math.min(1, s.t / s.life)) * B.steps) / B.steps;
  s.core.material.opacity = s.edge.material.opacity = B.alpha * k;
  return s.t >= s.life;
}

/* ---------- the Cinder Lance ---------- */

interface Lance {
  root: THREE.Group;
  beam: THREE.Group;
  core: THREE.Mesh;
  sheath: THREE.Mesh;
  outer: THREE.Mesh;
  rings: THREE.Group[];
  gather: THREE.Group;
  embers: THREE.Mesh[];
  tip: THREE.Sprite;
  /** Every material that fades, with its full opacity; and those that take the spell's colour. */
  fades: { m: THREE.Material & { opacity: number }; full: number }[];
  tinted: (THREE.Material & { color: THREE.Color })[];
  len: number;
  t: number;
  on: boolean;
}
const LANCE_Y = 0.6,
  LANCE_RINGS = 6,
  EMBERS = 12,
  RING_TILT: V3 = [Math.PI / 4, 0, 0]; // (a rune ring lies flat: this turns it to the camera)
/** The lances built so far (a pool: an echo or a reprise can show a second while the first still burns). */
const lances: Lance[] = [];
function buildLance(): Lance {
  const E = SCHOOL_LIGHT.ember,
    root = new THREE.Group(),
    beam = new THREE.Group();
  root.add(beam);
  root.visible = false;
  const coreMat = lit(0xfff0c0, 0.99),
    sheathMat = shine(E, 0.6),
    outerMat = shine(0xff4a14, 0.3),
    emberMat = lit(0xffc060, 0.99); // (white-hot, then fire, then a red edge)
  // (a unit long along +x, stretched to the beam's length)
  const core = part(beam, box(1, 0.045, 0.045), coreMat, [0.5, 0, 0]);
  const sheath = part(beam, new THREE.CylinderGeometry(0.1, 0.1, 1, 10, 1, true), sheathMat, [0.5, 0, 0], {
    rot: [0, 0, Math.PI / 2],
  });
  const outer = part(beam, new THREE.CylinderGeometry(0.2, 0.2, 1, 10, 1, true), outerMat, [0.5, 0, 0], {
    rot: [0, 0, Math.PI / 2],
  });
  const rings = Array.from({ length: LANCE_RINGS }, () => runeRing(root, E, 0.26, [0, LANCE_Y, 0], 5, RING_TILT));
  const gather = runeRing(root, E, 0.3, [0, LANCE_Y, 0], 6, RING_TILT);
  const embers = Array.from({ length: EMBERS }, () =>
    part(beam, new THREE.OctahedronGeometry(0.03), emberMat, [0, 0, 0]),
  );
  const tip = glow(E, 1, 0.9);
  root.add(tip);
  const ringMats = [...rings, gather].map((r) => (r.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial);
  for (const r of [...rings, gather]) mergeStill(r); // (a ring and its runes share one material: one draw each, turned as one)
  const fades = [
    ...[coreMat, sheathMat, outerMat, emberMat, ...ringMats].map((m) => ({ m, full: m.opacity })),
    { m: tip.material, full: 0.9 },
  ];
  scene.add(root);
  return {
    root,
    beam,
    core,
    sheath,
    outer,
    rings,
    gather,
    embers,
    tip,
    fades,
    tinted: [sheathMat, ...ringMats, tip.material],
    len: 1,
    t: 0,
    on: false,
  };
}
/** The Cinder Lance from (sx, sz) along `dir` for `len` units, in the spell's colour: a white-hot core in a sheath of
    fire and a red edge, rune rings turning along it, embers spiralling down it, a rune ring flaring at the hand. */
export function lanceFx(sx: number, sz: number, dir: Vec2, len: number, color: number) {
  let L = lances.find((l) => !l.on);
  if (!L) lances.push((L = buildLance()));
  L.root.position.set(sx, 0, sz);
  L.beam.position.y = LANCE_Y;
  L.beam.rotation.y = Math.atan2(-dir.z, dir.x);
  L.len = len;
  L.t = 0;
  L.on = true;
  L.root.visible = true;
  for (const m of L.tinted) m.color.setHex(color);
  for (const m of [L.core, L.sheath, L.outer]) m.position.x = len / 2;
  L.core.scale.x = len;
  L.sheath.scale.y = len;
  L.outer.scale.y = len;
  L.rings.forEach((r, i) => {
    const at = 0.55 + i * CFG.spellFx.lance.ringGap;
    r.visible = at < len - 0.2;
    r.position.set(dir.x * at, LANCE_Y, dir.z * at);
  });
  L.tip.position.set(dir.x * len, LANCE_Y, dir.z * len);
  stepLance(L, 0);
}
function stepLance(L: Lance, dt: number) {
  const C = CFG.spellFx.lance;
  L.t += dt;
  if (L.t >= C.life) {
    L.on = false;
    L.root.visible = false;
    return;
  }
  const t = L.t,
    rise = Math.min(1, t / C.rise),
    fade = Math.max(0, (t - C.fade) / (C.life - C.fade)),
    k = rise * (1 - fade);
  L.beam.scale.set(1, 0.4 + k * 0.6, 0.4 + k * 0.6);
  for (const f of L.fades) f.m.opacity = f.full * k;
  L.rings.forEach((r, i) => {
    r.rotation.y = t * (4 + i);
    r.scale.setScalar(0.6 + rise * 0.4);
  });
  const g = Math.min(1, t / C.flare);
  L.gather.visible = g < 1;
  L.gather.scale.setScalar(0.5 + g * 0.8);
  L.gather.rotation.y = t * 10;
  L.embers.forEach((e, i) => {
    const u = (i / EMBERS + t * C.embers) % 1,
      a = u * 18 + i;
    e.position.set(u * L.len, Math.cos(a) * 0.17, Math.sin(a) * 0.17);
  });
  L.tip.scale.setScalar(0.8 + k * 0.4);
}

/* ---------- the Pyre Seal ---------- */

/** The Pyre Seal's look at (x, z): a circle drawn in fire, with a rune ring and a six-pointed star turning in it,
    brightening while it waits (`charge`, k from 0 to 1); a crown of flame and a pillar when it erupts (`erupt`); the
    circle smouldering and the flames lower while the ground burns (`burn`). `drop` takes it away. */
export function sealFx(x: number, z: number, radius: number, color: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const { m: seal, mat: sealMat } = sigil(g, 'pyre_seal', radius * 1.08, color);
  const flameMat = shine(color, 0.8),
    flameCore = lit(0xffe0a0, 0.95);
  const flames = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2,
      f = new THREE.Group();
    f.position.set(Math.cos(a) * radius * 0.9, 0, Math.sin(a) * radius * 0.9);
    f.visible = false;
    g.add(f);
    f.add(
      new THREE.Mesh(
        keep('fx.flame', () => new THREE.ConeGeometry(0.13, 0.6, 6).translate(0, 0.3, 0)),
        flameMat,
      ),
    );
    f.add(
      new THREE.Mesh(
        keep('fx.flameCore', () => new THREE.ConeGeometry(0.06, 0.36, 5).translate(0, 0.18, 0)),
        flameCore,
      ),
    );
    return f;
  });
  const pillarMat = shine(0xffa040, 0.45),
    pillar = part(g, new THREE.CylinderGeometry(radius * 0.3, radius * 0.42, 2.2, 14, 1, true), pillarMat, [0, 1.1, 0]);
  pillar.visible = false;
  const heat = glow(color, radius * 1.6, 0);
  heat.position.y = 0.5;
  g.add(heat);
  let erupted = -1;
  return {
    charge(k: number, t: number) {
      const d = Math.min(1, k * 1.6),
        s = d * d * (3 - 2 * d);
      seal.scale.setScalar(radius * 1.08 * Math.max(0.01, 0.3 + 0.7 * s));
      sealMat.opacity = (0.6 + 0.4 * k) * s + Math.sin(t * 30) * 0.08 * k;
      seal.rotation.y = -t * (0.6 + 2.5 * k);
      heat.material.opacity = 0.25 * k;
    },
    erupt() {
      erupted = 0;
      for (const f of flames) f.visible = true;
      pillar.visible = true;
    },
    burn(dt: number, left: number, t: number) {
      erupted += dt;
      const C = CFG.spellFx.seal,
        rise = Math.min(1, erupted / C.rise),
        p = Math.min(1, erupted / C.pillar),
        fade = Math.min(1, left);
      flames.forEach((f, i) => {
        const h = rise * (erupted < C.crown ? 1 : 0.45) * (0.8 + Math.sin(t * 13 + i * 2) * 0.25) * fade;
        f.scale.set(1, Math.max(0.01, h), 1);
      });
      pillar.visible = p < 1;
      pillar.scale.set(1 - p * 0.4, Math.min(1, erupted / C.rise), 1 - p * 0.4);
      pillarMat.opacity = 0.45 * (1 - p);
      sealMat.opacity = fade * (0.8 + Math.sin(t * 13) * 0.1);
      heat.material.opacity = 0.5 * (1 - p * 0.5) * fade;
      seal.rotation.y = -t * 0.6;
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/* ---------- the Glacial Wall ---------- */

/** A pillar of the Glacial Wall at (x, z), `h` tall: a six-sided column of ice, its cap and a crystal glinting inside,
    over a patch of frost. Raise it by its group's y scale (0 to 1). */
export function iceColumn(x: number, z: number, h: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const model = made('ice_column');
  if (model) {
    // (the made column, a unit tall, h tall here; tinted a deeper blue than its pale ice, which washed out on the floor)
    model.scale.y = h;
    model.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshToonMaterial | undefined;
      if (m && !m.userData.iced) {
        m.color.setHex(0x8cc4ff);
        m.userData.iced = true;
      }
    });
    g.add(model);
    g.add(frostPatch());
    return g;
  }
  const ice = keep('fx.ice', () =>
    std(0xbfe6ff, { transparent: true, opacity: 0.82, emissive: 0x1e5a8a, roughness: 0.2 }),
  );
  const col = new THREE.Mesh(
    keep('fx.iceCol', () => new THREE.CylinderGeometry(0.15, 0.2, 1, 6).translate(0, 0.5, 0)),
    ice,
  );
  col.scale.y = h;
  g.add(col);
  const cap = new THREE.Mesh(
    keep('fx.iceCap', () => new THREE.ConeGeometry(0.15, 0.28, 6).translate(0, 0.14, 0)),
    ice,
  );
  cap.position.y = h;
  g.add(cap);
  const glint = new THREE.Mesh(
    octa(),
    keep('fx.iceGlint', () => lit(0xe8f8ff)),
  );
  glint.scale.set(0.06, 0.15, 0.06);
  glint.position.set(0, h * 0.55, 0.13);
  g.add(glint);
  g.add(frostPatch());
  return g;
}
/** The patch of frost at a pillar's foot. */
function frostPatch() {
  const frost = new THREE.Mesh(
    keep('fx.frostPatch', () => new THREE.CircleGeometry(0.34, 12).rotateX(-Math.PI / 2)),
    keep('fx.frost', () => shine(SCHOOL_LIGHT.frost, 0.35)),
  );
  frost.position.y = 0.02;
  return frost;
}

/* ---------- the Static Mantle ---------- */

/** The Static Mantle round the mage: three rings of lightning turning about it, a glow at its heart and sparks
    jumping between the rings. `update` follows the mage and fades it by `fade`; `drop` takes it away. */
export function mantleFx(color: number) {
  const g = new THREE.Group(),
    c = 0.7,
    R = 0.55,
    ringMat = lit(color, 0.85); // (drawn, not added: added yellow over the lit floor came out white)
  scene.add(g);
  const rings = [0, 1, 2].map(() =>
    part(
      g,
      keep('fx.mantleRing', () => new THREE.TorusGeometry(R, 0.024, 4, 36)),
      ringMat,
      [0, c, 0],
    ),
  );
  const core = glow(color, 1.5, 0.4);
  core.position.y = c;
  g.add(core);
  const jumps = [lightningBolt(g, color, 4, 0.018), lightningBolt(g, color, 4, 0.018)];
  const pt = (a: number, b: number): V3 => [
    Math.cos(a) * Math.cos(b) * R,
    c + Math.sin(b) * R,
    Math.sin(a) * Math.cos(b) * R,
  ];
  let seed = 1;
  return {
    update(x: number, z: number, t: number, fade: number) {
      g.position.set(x, 0, z);
      rings[0].rotation.set(0, t * 2, 0);
      rings[1].rotation.set(1.1 + t * 1.5, 0, 0);
      rings[2].rotation.set(0, t * 1.2, 1.1 + t);
      ringMat.opacity = 0.85 * fade;
      core.material.opacity = (0.3 + Math.abs(Math.sin(t * 9)) * 0.2) * fade;
      const f = Math.floor(t * 14);
      jumps.forEach((j, i) => {
        const a = (f * 1.7 + i * 2.1) % 6.28,
          b = (((f + i) % 5) - 2) * 0.4;
        j.set(pt(a, b), pt(a + 1.1, -b), seed++, 0.07, (f + i) % 3 !== 0 && fade > 0.2);
        j.core.opacity = fade;
        j.sheath.opacity = CFG.spellFx.lightning.sheathOpacity * fade;
      });
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/* ---------- Hallow and Umbral ---------- */

/** Consecrate's holy ground at (x, z): a circle drawn in Hallow's gold (whatever the spell's pale colour) and edged in
    dark, with a rune ring turning in it, a soft glow and motes rising. `update` fades it by `fade`; `drop` takes it away. */
export function consecrateFx(x: number, z: number, radius: number, _color?: number) {
  const g = new THREE.Group(),
    H = CFG.spellFx.hallow,
    gold = hallowGold();
  g.position.set(x, 0, z);
  scene.add(g);
  const holy = sigil(g, 'consecrate', radius, gold, true);
  const fill = new THREE.Mesh(
    keep('fx.disc', () => new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2)),
    lit(gold, H.fill),
  );
  fill.scale.setScalar(radius);
  fill.position.y = 0.012;
  g.add(fill);
  const warm = glow(gold, radius * 2.2, H.glow);
  warm.position.y = 0.4;
  g.add(warm);
  const moteMat = lit(whiter(gold, 0.35)),
    motes = Array.from({ length: 10 }, (_, i) => {
      const m = new THREE.Mesh(octa(), moteMat);
      m.scale.setScalar(0.035);
      m.userData.a = i * 2.4;
      m.userData.r = Math.sqrt((i + 0.5) / 10) * radius * 0.9;
      g.add(m);
      return m;
    });
  return {
    update(t: number, fade: number) {
      holy.set(t * 0.3, (0.85 + Math.sin(t * 4) * 0.1) * fade);
      fill.material.opacity = H.fill * fade;
      warm.material.opacity = H.glow * fade;
      motes.forEach((m, i) => {
        const u = (t * 0.45 + i / 10) % 1,
          a = m.userData.a as number,
          r = m.userData.r as number;
        m.position.set(Math.cos(a) * r, u * 1.6, Math.sin(a) * r);
        m.scale.setScalar(0.035 * (1 - u) * fade + 0.001);
      });
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/** Judgement: a closing ring of gold under the foe it has chosen while it waits (`mark`, k from 0 to 1), then a pillar of
    light falls on it (`fall`), bright and narrowing (`fade`, from 0 to 1 over its life). */
export function smiteFx(color: number, radius: number) {
  const g = new THREE.Group(),
    H = CFG.spellFx.hallow,
    gold = hallowGold();
  scene.add(g);
  // (its ring drawn in Hallow's gold and edged in dark, not added: added over a bright floor it came out cream-white)
  const mark = new THREE.Group(),
    markMat = lit(gold, 0.7),
    rimMat = lit(hexOf(H.edge), 0.7 * H.edgeOpacity),
    ring = circle(mark, gold, radius, markMat);
  g.add(mark);
  mergeStill(ring);
  rimmed(mark, ring, rimMat);
  // (the pillar's light stays under 0.6 all told, so it lights the foe rather than whiting it out: docs/effects.md)
  const beamMat = shine(whiter(color, 0.4), 0.22),
    beam = part(g, new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 4, 14, 1, true), beamMat, [0, 2, 0]);
  const coreMat = shine(0xffffff, 0.16),
    core = part(g, new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, 4, 10, 1, true), coreMat, [0, 2, 0]);
  const halo = glow(gold, radius * 3.2, 0);
  halo.position.y = 0.6;
  g.add(halo);
  beam.visible = core.visible = false;
  // the made sword, falling point first out of the light and driven into the floor at the foe's feet
  const sword = made('judgement_sword');
  if (sword) {
    sword.visible = false;
    sword.position.z = radius * 0.45; // (just before the foe, toward the camera, so the foe doesn't hide it)
    g.add(sword);
  }
  return {
    mark(x: number, z: number, k: number, t: number) {
      g.position.set(x, 0, z);
      mark.scale.setScalar(1.6 - k * 0.6);
      mark.rotation.y = t * 2;
      markMat.opacity = 0.35 + k * 0.5 + Math.sin(t * 25) * 0.1 * k;
      rimMat.opacity = markMat.opacity * H.edgeOpacity;
    },
    fall() {
      beam.visible = core.visible = true;
      if (sword) sword.visible = true;
    },
    fade(k: number) {
      if (sword) {
        const drop = Math.min(1, k / 0.12); // (it falls in the first eighth of the light's life, then stands)
        sword.position.y = 2.6 * (1 - drop * drop) - 0.25 * drop;
        sword.scale.setScalar(Math.max(0.01, 1 - Math.max(0, (k - 0.75) / 0.25)));
      }
      beam.scale.set(1 - k * 0.7, 1, 1 - k * 0.7);
      core.scale.set(1 - k * 0.7, 1, 1 - k * 0.7);
      beamMat.opacity = 0.22 * (1 - k);
      coreMat.opacity = 0.16 * (1 - k);
      halo.material.opacity = 0.3 * (1 - k);
      markMat.opacity = 0.8 * (1 - k);
      rimMat.opacity = markMat.opacity * H.edgeOpacity;
      mark.scale.setScalar(1 + k * 0.6);
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/** Wardlight: `count` motes of Hallow's gold circling the mage, each a gold crystal in a glow. `place` puts mote `i` at
    (x, y, z); `drop` takes them away. */
export function wardFx(count: number) {
  const g = new THREE.Group();
  scene.add(g);
  // (gold crystals in a gold glow, closed in an outline: white-hot ones in added light came out cream-white on a bright
  // floor)
  // Each edged in Hallow's dark edge and lit by a pale heart, its glow in hard bands (floor 3's orange cracks swallowed a
  // plain gold diamond)
  const W = CFG.spellFx.wardMote,
    gold = hallowGold(),
    crystalMat = lit(gold),
    heartMat = lit(whiter(gold, W.heart)),
    edgeMat = keep(
      'fx.wardEdge',
      () => new THREE.MeshBasicMaterial({ color: hexOf(CFG.spellFx.hallow.edge), side: THREE.BackSide }),
    );
  const motes = Array.from({ length: count }, () => {
    const m = new THREE.Group();
    g.add(m);
    const c = new THREE.Mesh(octa(), crystalMat);
    c.scale.set(W.size[0], W.size[1], W.size[0]);
    const edge = new THREE.Mesh(octa(), edgeMat);
    edge.scale.copy(c.scale).multiplyScalar(W.edge);
    const heart = new THREE.Mesh(octa(), heartMat);
    heart.scale.copy(c.scale).multiplyScalar(0.45);
    heart.position.set(0, W.size[1] * 0.25, W.size[0] * 0.5); // (toward the camera's side and up, where it shows)
    c.add(heart);
    m.add(c, edge);
    m.add(bandGlow(gold, W.glow, CFG.spellFx.hallow.orbGlow, W.rings));
    return m;
  });
  markThing(g);
  return {
    place(i: number, x: number, y: number, z: number, spin: number, on: boolean) {
      const m = motes[i];
      m.visible = on;
      m.position.set(x, y, z);
      m.children[0].rotation.y = spin;
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/** Lantern of Vigil: a small iron lantern, its flame white-gold, hanging in the air; `place` puts it at (x, y, z)
    and swings it, `flare` brightens it as it fires, `drop` takes it away. */
export function vigilLanternFx(color: number) {
  const g = new THREE.Group();
  scene.add(g);
  const model = made('vigil_lantern'); // (the made lantern of wrought iron; else one built in code)
  const L = CFG.spellFx.lantern;
  if (model) {
    // (larger, its iron lit warm by its own texture, outlined: a tiny lantern in a soft white halo was lost on floor 3)
    model.scale.setScalar(L.scale);
    model.position.y = -0.22 * (L.scale / 1.4);
    livingLight(model, L);
    markThing(model);
    g.add(model);
  } else ironLantern(g);
  const flameMat = lit(whiter(color, 0.5)),
    flame = part(g, octa(), flameMat, [0, model ? -0.04 : 0, 0]);
  flame.scale.set(0.045 * L.flame, 0.08 * L.flame, 0.045 * L.flame);
  const halo = bandGlow(deepen(color, L.deep), L.halo, L.haloOpacity, L.rings); // (in hard bands, its gold drawn deep)
  g.add(halo);
  let flare = 0;
  return {
    place(x: number, y: number, z: number, t: number) {
      g.position.set(x, y, z);
      g.rotation.z = Math.sin(t * 2.3) * 0.12;
      flame.rotation.y = t * 3;
      flare = Math.max(0, flare - 0.05);
      halo.scale.setScalar(L.halo * (1 + flare * 0.7) + (Math.sin(t * 9) > 0 ? 0.05 : 0)); // (its flicker a step)
    },
    flare() {
      flare = 1;
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}
/** A small iron lantern built in code (while the made one isn't in). */
function ironLantern(g: THREE.Group) {
  const iron = std(0x2a2620, { metalness: 0.6, roughness: 0.5 });
  part(
    g,
    keep('fx.lanternCap', () => new THREE.ConeGeometry(0.11, 0.09, 6)),
    iron,
    [0, 0.14, 0],
  );
  part(
    g,
    keep('fx.lanternBase', () => new THREE.CylinderGeometry(0.1, 0.08, 0.04, 6)),
    iron,
    [0, -0.11, 0],
  );
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    part(
      g,
      keep('fx.lanternBar', () => new THREE.BoxGeometry(0.016, 0.22, 0.016)),
      iron,
      [Math.cos(a) * 0.085, 0, Math.sin(a) * 0.085],
    );
  }
  part(
    g,
    keep('fx.lanternRing', () => new THREE.TorusGeometry(0.04, 0.012, 4, 10)),
    iron,
    [0, 0.21, 0],
  );
}

/** Grasp of the Grave at (x, z): a ring of shadow on the floor and dark hands rising out of it, violet at the fingertips;
    `set(k)` raises them (0 to 1), `drop` takes them away. */
export function graspFx(x: number, z: number, radius: number, color: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const pool = new THREE.Mesh(
    keep('fx.disc', () => new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2)),
    // (its dark a shadow in the floor's shadow colour, the floor showing through: a near-black one read as a pit)
    new THREE.MeshBasicMaterial({ color: floorShade(0x0c0614), transparent: true, opacity: 0, depthWrite: false }),
  );
  pool.scale.setScalar(radius);
  pool.position.y = 0.013;
  g.add(pool);
  const rimMat = shine(color, 0.7),
    rim = part(
      g,
      keep('fx.graspRim', () => new THREE.RingGeometry(0.92, 1, 36).rotateX(-Math.PI / 2)),
      rimMat,
      [0, 0.016, 0],
    );
  rim.scale.setScalar(radius);
  const flesh = std(0x1c1426, { emissive: 0x12061e }),
    tipMat = lit(color);
  const hands = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.3,
      r = i % 2 ? radius * 0.55 : radius * 0.25,
      h = new THREE.Group();
    h.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    h.rotation.y = -a;
    g.add(h);
    const bone = made('bone_hand'); // (the made hand of bone, clawing up; else one built in code)
    if (bone) {
      bone.rotation.y = a + Math.PI / 2 + (i % 2 ? 0.4 : -0.4);
      bone.scale.setScalar(1.7); // (half a unit made was some ten pixels: lost in the pool's dark)
      h.add(bone);
      return h;
    }
    part(
      h,
      keep('fx.palm', () => new THREE.CylinderGeometry(0.07, 0.09, 0.28, 6).translate(0, 0.14, 0)),
      flesh,
      [0, 0, 0],
    );
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.045;
      part(
        h,
        keep('fx.finger', () => new THREE.ConeGeometry(0.022, 0.22, 5).translate(0, 0.11, 0)),
        flesh,
        [fx, 0.26, 0],
        { rot: [0, 0, (f - 1.5) * 0.15] },
      );
      part(h, octa(), tipMat, [fx + (f - 1.5) * 0.03, 0.47, 0], { scale: 0.02 });
    }
    return h;
  });
  return {
    set(k: number) {
      hands.forEach((h, i) => {
        h.position.y = -0.5 + Math.min(1, k * (1.1 + (i % 3) * 0.1)) * 0.5;
        h.scale.setScalar(Math.max(0.01, k));
      });
      rimMat.opacity = 0.7 * Math.min(1, k * 2);
      pool.material.opacity = CFG.spellFx.groundShade * Math.min(1, k * 2);
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/* ---------- Verdant ---------- */

/** The Thorn Snare at (x, z): a ring of turned earth on the floor and thorny vines bursting out of it, green at the tips;
    `set(k)` raises them (0 to 1), `drop` takes them away (graspFx's way). */
export function thornFx(x: number, z: number, radius: number, color: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  const earth = new THREE.Mesh(
    keep('fx.disc', () => new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2)),
    // (turned earth in the floor's shadow colour, the floor showing through: a near-black one read as a pit)
    new THREE.MeshBasicMaterial({ color: floorShade(0x1e160c), transparent: true, opacity: 0, depthWrite: false }),
  );
  earth.scale.setScalar(radius);
  earth.position.y = 0.013;
  g.add(earth);
  const rimMat = shine(color, 0.6),
    rim = part(
      g,
      keep('fx.graspRim', () => new THREE.RingGeometry(0.92, 1, 36).rotateX(-Math.PI / 2)),
      rimMat,
      [0, 0.016, 0],
    );
  rim.scale.setScalar(radius);
  const vine = std(0x2e5a22, { emissive: 0x0c2208 }),
    thorn = std(0x8a7a5a),
    tipMat = lit(color);
  const vines = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.4,
      r = i % 2 ? radius * 0.6 : radius * 0.3,
      v = new THREE.Group();
    v.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    v.rotation.y = -a;
    g.add(v);
    const thorns = made('thorn_vines'); // (the made cluster of thorny tendrils; else vines built in code)
    if (thorns) {
      livingLight(thorns, CFG.spellFx.thorns); // (near-black brambles were lost on a dark floor: lime highlights)
      thorns.rotation.y = i * 2.1;
      thorns.scale.setScalar(1.5 + (i % 3) * 0.2);
      v.add(thorns);
      return v;
    }
    const lean = ((i % 3) - 1) * 0.35;
    part(
      v,
      keep('fx.vine', () => new THREE.CylinderGeometry(0.025, 0.06, 0.55, 5).translate(0, 0.27, 0)),
      vine,
      [0, 0, 0],
      { rot: [0, 0, lean] },
    );
    for (let k = 0; k < 3; k++)
      part(
        v,
        keep('fx.thorn', () => new THREE.ConeGeometry(0.02, 0.09, 4).rotateZ(-Math.PI / 2)),
        thorn,
        [Math.sin(lean) * -0.15 * (k + 1) + 0.03 * (k % 2 ? 1 : -1), 0.12 + k * 0.14, 0],
        { rot: [0, k * 1.9, 0] },
      );
    part(
      v,
      keep('fx.leaf', () => new THREE.SphereGeometry(1, 5, 3).scale(0.035, 0.06, 0.012)),
      tipMat,
      [-Math.sin(lean) * 0.55, 0.55, 0],
    );
    return v;
  });
  return {
    set(k: number) {
      vines.forEach((v, i) => {
        v.position.y = -0.55 + Math.min(1, k * (1.1 + (i % 3) * 0.1)) * 0.55;
        v.scale.setScalar(Math.max(0.01, k));
      });
      rimMat.opacity = 0.6 * Math.min(1, k * 2);
      earth.material.opacity = CFG.spellFx.groundShade * Math.min(1, k * 2);
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/** The Pollen Cloud round (x, z): a soft golden-green haze on the floor and grains of pollen drifting and turning up
    through it, a petal now and then; `update` fades it by `fade`, `drop` takes it away (consecrateFx's way). */
export function pollenFx(x: number, z: number, radius: number, color: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  // (on a pale floor drawn, not added: its circle in a deep Verdant green on a dark edge, its haze laid over the floor,
  // no glow; added, its lime washed into floor 4's ivory)
  const P = CFG.paleFx.pollen,
    pale = paleFx(),
    hazeColor = 0x8ac840; // (green-gold, the Verdant's: a cream haze read as Hallow)
  const haze = new THREE.Mesh(
    keep('fx.disc', () => new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2)),
    pale
      ? new THREE.MeshBasicMaterial({ color: P.tone, transparent: true, opacity: P.haze, depthWrite: false })
      : shine(hazeColor, 0.16),
  );
  haze.scale.setScalar(radius);
  haze.position.y = 0.012;
  g.add(haze);
  const lineMat = pale
      ? new THREE.MeshBasicMaterial({ color: P.tone, transparent: true, depthWrite: false })
      : lit(SCHOOL_LIGHT.verdant, 0.7),
    line = pale ? P.line : 0.7,
    circ = circle(g, color, radius, lineMat);
  mergeStill(circ);
  const edgeMat = pale
      ? new THREE.MeshBasicMaterial({ color: paleShadow(), transparent: true, depthWrite: false })
      : null,
    rims = edgeMat ? rimmed(g, circ, edgeMat) : [];
  const warm = glow(0xa8d850, radius * 2.4, 0.28);
  warm.position.y = 0.5;
  warm.visible = !pale;
  g.add(warm);
  const grainMat = lit(0xf0e890),
    petalMat = lit(0xf8c8e0);
  const grains = Array.from({ length: 16 }, (_, i) => {
    const m = new THREE.Mesh(octa(), i % 5 ? grainMat : petalMat);
    m.scale.setScalar(i % 5 ? 0.03 : 0.045);
    m.userData.a = i * 2.4;
    m.userData.r = Math.sqrt((i + 0.5) / 16) * radius * 0.95;
    g.add(m);
    return m;
  });
  return {
    update(t: number, fade: number) {
      lineMat.opacity = line * fade;
      if (edgeMat) edgeMat.opacity = line * P.edge * fade;
      haze.material.opacity = (pale ? P.haze : 0.12 + Math.sin(t * 3) * 0.03) * fade;
      warm.material.opacity = 0.28 * fade;
      circ.rotation.y = t * 0.25;
      for (const e of rims) e.rotation.y = circ.rotation.y;
      grains.forEach((m, i) => {
        const u = (t * 0.3 + i / 16) % 1,
          a = (m.userData.a as number) + t * 0.6,
          r = m.userData.r as number;
        m.position.set(Math.cos(a) * r, 0.1 + u * 1.3 + Math.sin(t * 2 + i) * 0.05, Math.sin(a) * r);
        m.rotation.set(t * 2 + i, t * 3, 0);
        m.visible = fade > 0.05;
      });
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/** A made part's surface (shared by every copy, so once) tinted `tint` and lit from within by its own texture in `glow`:
    its lighter strands shine, its darks stay dark (the Living Wall's hedge, the Thorn Snare's brambles, the lantern). */
function livingLight(model: THREE.Object3D, how: { tint: string; glow: string }) {
  model.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && !m.userData.living) {
      m.color.setHex(hexOf(how.tint));
      if (m.emissive) {
        m.emissive.setHex(hexOf(how.glow));
        m.emissiveMap = m.map;
      }
      m.needsUpdate = true;
      m.userData.living = true;
    }
  });
}

/** A trunk of living wood for the Living Wall at (x, z), `h` tall: bark round a paler heart, roots spread at its foot and
    leaves bursting from its crown (iceColumn's way). */
export function woodColumn(x: number, z: number, h: number, hedge = true) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const model = made('thorn_hedge');
  if (model) {
    // (the made hedge: a length of woven thorn two of the wall's spots long, on every other spot, turned along the
    // wall by the caller; the spots between keep only their moss)
    if (hedge) {
      model.scale.set(0.6, h / 0.75, 1); // (its length cut to two spots, its height the trunk's)
      // (its grey weave tinted living green, the Verdant's, and its strands lit lime from within by the weave itself:
      // tinted only, it was a near-black slab on a dark floor)
      livingLight(model, CFG.spellFx.hedge);
      markThing(model); // (its closed outline, as a discrete thing's: art bible 4.4)
      g.add(model);
    }
    g.add(mossPatch());
    return g;
  }
  const bark = keep('fx.bark', () => std(0x5a3e24, { roughness: 0.95 })),
    leaf = keep('fx.leafMat', () => std(0x5aa83a, { emissive: 0x1a4a10, roughness: 0.8 }));
  const trunk = new THREE.Mesh(
    keep('fx.trunk', () => new THREE.CylinderGeometry(0.13, 0.2, 1, 7).translate(0, 0.5, 0)),
    bark,
  );
  trunk.scale.y = h;
  g.add(trunk);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4,
      r = new THREE.Mesh(
        keep('fx.root', () => new THREE.ConeGeometry(0.06, 0.34, 4).rotateZ(Math.PI / 2).translate(0.17, 0.03, 0)),
        bark,
      );
    r.rotation.y = a;
    g.add(r);
  }
  for (const [dx, dy, dz, s] of [
    [0, 0, 0, 0.2],
    [0.1, -0.08, 0.06, 0.14],
    [-0.1, -0.06, -0.04, 0.15],
  ] as V3[] | number[][]) {
    const c = new THREE.Mesh(
      keep('fx.crown', () => new THREE.IcosahedronGeometry(1, 0)),
      leaf,
    );
    c.scale.setScalar(s);
    c.position.set(dx, h + dy, dz);
    g.add(c);
  }
  const bud = new THREE.Mesh(
    octa(),
    keep('fx.bud', () => lit(0xd8f8a0)),
  );
  bud.scale.set(0.04, 0.07, 0.04);
  bud.position.set(0.08, h * 0.6, 0.15);
  g.add(bud);
  g.add(mossPatch());
  return g;
}
/** The patch of moss at a trunk's foot. */
function mossPatch() {
  const moss = new THREE.Mesh(
    keep('fx.frostPatch', () => new THREE.CircleGeometry(0.34, 12).rotateX(-Math.PI / 2)),
    keep('fx.moss', () => shine(SCHOOL_LIGHT.verdant, 0.3)),
  );
  moss.position.y = 0.02;
  return moss;
}

/** The Ferryman's Toll: a coin of shadow with a violet rim turning over the foe it marks; `at` moves it, `drop` takes it. */
export function tollFx(color: number) {
  const g = new THREE.Group();
  scene.add(g);
  // the obol's face (an oar over a boat's prow, tools/art/sigil.py) drawn in its light over a disc of shadow, turned to the
  // camera, a game pixel a texel
  const coin = new THREE.Group();
  g.add(coin);
  part(
    coin,
    keep('fx.coinBack', () => new THREE.CircleGeometry(0.47, 20)),
    lit(0x100a18),
    [0, 0, -0.01],
  );
  part(
    coin,
    keep('fx.coinFace', () => new THREE.PlaneGeometry(1, 1)),
    new THREE.MeshBasicMaterial({ map: sigilTex('ferrymans_toll'), color, transparent: true, depthWrite: false }),
    [0, 0, 0],
  );
  const aura = glow(color, 0.8, 0.5);
  g.add(aura);
  return {
    at(x: number, y: number, z: number, t: number) {
      g.position.set(x, y, z);
      faceCamera(coin, 0, Math.sin(t * 2) * 0.25);
      aura.material.opacity = 0.4 + Math.sin(t * 5) * 0.1;
    },
    drop() {
      scene.remove(g);
      disposeTree(g);
    },
  };
}

/* ---------- a soul flying home ---------- */

interface Soul {
  g: THREE.Group;
  from: P3;
  to: () => P3;
  t: number;
}
const souls: Soul[] = [];
/** A spark of a soul in `color` flying from `from` to where `to` says (the mage, as it moves), in an arc, over
    CFG.spellFx.soul seconds; a small ring flares where it arrives (Soul Harvest's stacks coming home). */
export function soulFx(from: P3, to: () => P3, color: number) {
  const g = new THREE.Group(),
    c = new THREE.Mesh(octa(), basicMat(whiter(color, 0.5)));
  c.scale.set(0.06, 0.09, 0.06);
  g.add(c, glow(color, 0.55, 0.8));
  g.position.set(from.x, from.y, from.z);
  scene.add(g);
  souls.push({ g, from, to, t: 0 });
}
function stepSoul(s: Soul, dt: number) {
  s.t += dt;
  const k = Math.min(1, s.t / CFG.spellFx.soul),
    e = k * k * (3 - 2 * k),
    b = s.to();
  s.g.position.set(
    s.from.x + (b.x - s.from.x) * e,
    s.from.y + (b.y - s.from.y) * e + Math.sin(k * Math.PI) * 0.8,
    s.from.z + (b.z - s.from.z) * e,
  );
  s.g.children[0].rotation.y += dt * 9;
  if (k < 1) return false;
  ringFx(b.x, b.y, b.z, (s.g.children[1] as THREE.Sprite).material.color.getHex(), 0.1, 0.4, CFG.spellFx.flash);
  return true;
}

/* ---------- every step ---------- */

/** Every step: rings grow and fade, lightning flickers and goes, the lance fades; what's done goes back to its pool. */
export function updateSpellFx(dt: number) {
  for (let i = rings.length - 1; i >= 0; i--)
    if (stepRing(rings[i], dt)) {
      rings[i].m.visible = false;
      (rings[i].under ? idleDrawn : idleRings).push(rings.splice(i, 1)[0]);
    }
  for (let i = strikes.length - 1; i >= 0; i--)
    if (stepStrike(strikes[i], dt)) {
      strikes[i].root.visible = false;
      idleStrikes.push(strikes.splice(i, 1)[0]);
    }
  for (let i = beams.length - 1; i >= 0; i--)
    if (stepBeam(beams[i], dt)) {
      beams[i].root.visible = false;
      idleBeams.push(beams.splice(i, 1)[0]);
    }
  for (const l of lances) if (l.on) stepLance(l, dt);
  for (let i = souls.length - 1; i >= 0; i--)
    if (stepSoul(souls[i], dt)) {
      scene.remove(souls[i].g);
      disposeTree(souls[i].g);
      souls.splice(i, 1);
    }
}
/** The mage leaves the room, or a new floor: nothing left showing (all of it back in its pool). */
export function hideSpellFx() {
  for (const r of rings) {
    r.m.visible = false;
    (r.under ? idleDrawn : idleRings).push(r);
  }
  rings.length = 0;
  for (const s of strikes) {
    s.root.visible = false;
    idleStrikes.push(s);
  }
  strikes.length = 0;
  for (const s of beams) {
    s.root.visible = false;
    idleBeams.push(s);
  }
  beams.length = 0;
  for (const l of lances) {
    l.on = false;
    l.root.visible = false;
  }
  for (const s of souls) {
    scene.remove(s.g);
    disposeTree(s.g);
  }
  souls.length = 0;
}
/** What shows now (for the tests): the lance, and how many rings and bolts of lightning. */
export const fxShowing = () => ({
  lance: lances.some((l) => l.on),
  lances: lances.filter((l) => l.on).length,
  rings: rings.length,
  strikes: strikes.length,
  beams: beams.length,
});
