/* The room kit's mechanisms (docs/archive/M3.5-plan.md): the rune stone, the lodestone, the bell, the hanging censer
   and the reliquary, built in code in the style of the spell effects (docs/effects.md). What they do is in mechanisms.ts;
   each keeps the parts mechanisms.ts moves or lights. Every one has a touch of magic that moves: runes orbit a charged
   stone, the lodestone's shard floats and turns, the reliquary's seal of candle-light turns round it (`updateMechLook`). */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, markShared, mergeStill } from '../render/materials';
import { SCHOOL_LIGHT, lit, shine, type School } from '../render/arcane';
import { MAT, joinAll, mesh, runeStrokes, shared, stoneOf, tone } from './kitParts';

const GOLD = 0xffd98a;
const GEO = {
  // the rune stone: a six-sided menhir, pointed, on rubble; a carved ring round its rune
  menhir: shared(
    new THREE.LatheGeometry(
      [
        [0.28, 0],
        [0.3, 0.3],
        [0.27, 0.75],
        [0.2, 1.02],
        [0.09, 1.14],
        [0, 1.17],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      6,
    ),
  ),
  rubble: shared(new THREE.DodecahedronGeometry(0.1, 0)),
  lichen: shared(new THREE.SphereGeometry(0.07, 6, 3).scale(1, 0.6, 0.25)),
  carving: shared(joinAll([new THREE.TorusGeometry(0.17, 0.02, 4, 20), runeStrokes(0.24)])),
  shard: shared(new THREE.OctahedronGeometry(0.075, 0).scale(0.8, 1.6, 0.8)),
  // the lodestone: a plinth, copper prongs, a floating shard banded in copper
  plinth: shared(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 6)),
  prong: shared(new THREE.CylinderGeometry(0.022, 0.03, 1, 5)),
  knob: shared(new THREE.SphereGeometry(0.045, 6, 4)),
  lode: shared(new THREE.OctahedronGeometry(0.19, 0).scale(0.8, 2.3, 0.8)),
  band: shared(new THREE.TorusGeometry(0.13, 0.02, 4, 6).rotateX(Math.PI / 2)),
  // the bell: posts, a beam under a little roof, a yoke, a flared bell, a clapper
  post: shared(new THREE.BoxGeometry(0.12, 1.72, 0.12)),
  footing: shared(new THREE.BoxGeometry(0.24, 0.12, 0.24)),
  beam: shared(new THREE.BoxGeometry(1.22, 0.14, 0.16)),
  roof: shared(new THREE.BoxGeometry(0.72, 0.04, 0.3)),
  yoke: shared(new THREE.BoxGeometry(0.3, 0.1, 0.13)),
  bell: shared(
    new THREE.LatheGeometry(
      [
        [0, 0.03],
        [0.33, 0],
        [0.37, 0],
        [0.36, 0.02],
        [0.27, 0.12],
        [0.22, 0.3],
        [0.2, 0.52],
        [0.12, 0.62],
        [0, 0.64],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      14,
    ),
  ), // (from the bottom up: turned from the top down, a lathe is inside out)
  bellBand: shared(new THREE.TorusGeometry(0.215, 0.018, 4, 16).rotateX(Math.PI / 2)),
  clapperRod: shared(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4)),
  clapper: shared(new THREE.SphereGeometry(0.05, 6, 4)),
  // the censer: a chain, a ring, three short chains, a pierced pot, a domed cap and a finial
  chain: shared(new THREE.CylinderGeometry(0.012, 0.012, 1, 4)),
  ring: shared(new THREE.TorusGeometry(0.05, 0.012, 4, 10).rotateX(Math.PI / 2)),
  pot: shared(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.08, 0.01],
        [0.15, 0.06],
        [0.17, 0.13],
        [0.16, 0.16],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      10,
    ),
  ),
  cap: shared(
    new THREE.LatheGeometry(
      [
        [0.16, 0],
        [0.15, 0.05],
        [0.1, 0.11],
        [0.04, 0.14],
        [0, 0.15],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      10,
    ),
  ),
  hole: shared(new THREE.SphereGeometry(0.018, 5, 3)),
  finial: shared(new THREE.ConeGeometry(0.025, 0.08, 5)),
  // the reliquary: a moulded plinth, a casket shaped like a little chapel, its roof, corner columns, a cross, a gem
  base: shared(new THREE.BoxGeometry(0.78, 0.42, 0.56)),
  moulding: shared(new THREE.BoxGeometry(0.84, 0.07, 0.62)),
  casket: shared(new THREE.BoxGeometry(0.54, 0.3, 0.36)),
  roofPrism: shared(
    new THREE.CylinderGeometry(0.22, 0.22, 0.6, 3)
      .rotateZ(Math.PI / 2)
      .rotateX(Math.PI / 6)
      .scale(1, 0.7, 1),
  ),
  column: shared(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 5)),
  crossV: shared(new THREE.BoxGeometry(0.035, 0.16, 0.035)),
  crossH: shared(new THREE.BoxGeometry(0.11, 0.035, 0.035)),
  gem: shared(new THREE.OctahedronGeometry(0.045, 0)),
};

/** A ring of runes, flat, `r` across: one geometry. */
function runeRingGeometry(r: number, count: number) {
  const parts: THREE.BufferGeometry[] = [new THREE.TorusGeometry(r, r * 0.035, 4, 32).rotateX(Math.PI / 2)];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    parts.push(
      runeStrokes(r * 0.32)
        .rotateY(-a + Math.PI / 2)
        .translate(Math.cos(a) * r, r * 0.06, Math.sin(a) * r),
    );
  }
  return joinAll(parts);
}
const SEAL_RING = shared(runeRingGeometry(0.52, 8));
const SEAL_MAT = markShared(shine(0xffb040, 0.5)); // (deeper than the glow's gold: added light over a lit floor goes white)

/** The rune stone: a menhir on rubble, lichen on it, a rune cut in a ring on the face turned to the camera. The carving
    (`rune`, its own material) takes the school's colour when a charge reaches it, and three runes (`aura`) circle it. */
export function runeStoneLook() {
  const g = new THREE.Group();
  const stone = mesh(g, GEO.menhir, MAT.stone);
  stone.rotation.y = Math.PI / 6; // (a face square to the camera)
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 0.4;
    mesh(g, GEO.rubble, MAT.darkStone, Math.cos(a) * 0.32, 0.05, Math.sin(a) * 0.3).scale.setScalar(
      0.7 + (i % 3) * 0.25,
    );
  }
  for (const [x, y, z] of [
    [-0.2, 0.35, 0.16],
    [0.18, 0.85, 0.1],
    [0.23, 0.2, -0.12],
  ])
    mesh(g, GEO.lichen, MAT.lichen, x, y, z).lookAt(x * 3, y, z * 3);
  const rune = mesh(
    g,
    GEO.carving,
    new THREE.MeshStandardMaterial({ color: 0x5a5660, emissive: 0x16141c, roughness: 0.8 }),
    0,
    0.58,
    0.275,
  ); // (its own material: a charge colours it; cold, a pale cut that still reads)
  rune.rotation.x = -0.05;
  const aura = new THREE.Group();
  aura.position.y = 0.7;
  const auraMat = lit(0xffffff);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    mesh(aura, GEO.shard, auraMat, Math.cos(a) * 0.42, (i - 1) * 0.12, Math.sin(a) * 0.42);
  }
  mergeStill(aura);
  aura.visible = false; // (joined while shown: mergeStill leaves hidden things; charge() colours its one material)
  const gl = glow(0xffffff, 1.4, 0.7);
  gl.position.set(0, 0.62, 0.36);
  gl.visible = false; // (charged: the stone shines its school's light)
  g.add(aura, gl, blob(0.9));
  return { group: g, parts: { rune, glow: gl, aura } };
}

/** The lodestone: a dark shard of iron-stone floating between three copper prongs over a plinth, banded in copper, turning
    slowly (`shard`); a spark gathers above it (`tip`) as it charges. */
export function lodestoneLook() {
  const g = new THREE.Group();
  mesh(g, GEO.plinth, MAT.darkStone, 0, 0.06, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2,
      foot = new THREE.Vector3(Math.cos(a) * 0.25, 0.1, Math.sin(a) * 0.25),
      top = new THREE.Vector3(Math.cos(a) * 0.19, 0.82, Math.sin(a) * 0.19);
    const d = top.clone().sub(foot),
      p = mesh(g, GEO.prong, MAT.copper);
    p.scale.y = d.length();
    p.position.copy(foot).addScaledVector(d, 0.5);
    p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    mesh(g, GEO.knob, MAT.copper, top.x, top.y, top.z);
  }
  const shard = new THREE.Group();
  shard.position.y = 0.98;
  mesh(shard, GEO.lode, MAT.lode);
  mesh(shard, GEO.band, MAT.copper, 0, 0.12, 0);
  mesh(shard, GEO.band, MAT.copper, 0, -0.14, 0).scale.setScalar(0.85);
  mergeStill(shard);
  const tip = glow(0xf0e890, 0.8, 0.6);
  tip.position.y = 1.5;
  g.add(shard, tip, blob(0.8));
  return { group: g, parts: { tip, shard } };
}

/** The bell: a bronze bell with a band of runes cut round its shoulder and a clapper, under a yoke that swings (`swing`),
    hung from a beam on two posts with a little roof over it. */
export function bellLook() {
  const g = new THREE.Group(),
    swing = new THREE.Group();
  swing.position.y = 1.62;
  for (const x of [-0.5, 0.5]) {
    mesh(g, GEO.footing, MAT.darkStone, x, 0.06, 0);
    mesh(g, GEO.post, MAT.wood, x, 0.92, 0);
  }
  mesh(g, GEO.beam, MAT.wood, 0, 1.74, 0);
  for (const s of [-1, 1]) {
    const r = mesh(g, GEO.roof, MAT.darkStone, 0, 1.86, s * 0.1);
    r.rotation.x = s * 0.5;
  }
  mesh(swing, GEO.yoke, MAT.iron, 0, 0, 0);
  mesh(swing, GEO.bell, MAT.bronze, 0, -0.7, 0);
  mesh(swing, GEO.bellBand, MAT.darkBronze, 0, -0.26, 0);
  mesh(swing, GEO.bellBand, MAT.darkBronze, 0, -0.62, 0).scale.setScalar(1.55);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i - 1) * 0.8,
      r = mesh(swing, runeGeo(), MAT.darkBronze, Math.cos(a) * 0.215, -0.4, Math.sin(a) * 0.215);
    r.rotation.set(-0.1, Math.PI / 2 - a, 0, 'YXZ');
  }
  mesh(swing, GEO.clapperRod, MAT.iron, 0, -0.6, 0);
  mesh(swing, GEO.clapper, MAT.iron, 0, -0.74, 0);
  mergeStill(swing); // (the bell and its yoke swing as one)
  g.add(swing, blob(1.1));
  return { group: g, parts: { swing } };
}
let runeG: THREE.BufferGeometry | null = null;
const runeGeo = () => (runeG ??= shared(runeStrokes(0.11)));

/** A censer's pot: bronze, pierced round its middle (the embers glowing through), a domed cap and a finial; hung from
    three short chains to a ring. Also what falls when its chain is cut. */
export function censerPot() {
  const pot = new THREE.Group();
  mesh(pot, GEO.pot, MAT.bronze, 0, -0.08, 0);
  mesh(pot, GEO.cap, MAT.bronze, 0, 0.08, 0);
  mesh(pot, GEO.finial, MAT.bronze, 0, 0.26, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    mesh(pot, GEO.hole, EMBER_GLOW, Math.cos(a) * 0.165, 0.05, Math.sin(a) * 0.165);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2,
      c = mesh(pot, GEO.chain, MAT.iron, Math.cos(a) * 0.08, 0.3, Math.sin(a) * 0.08);
    c.scale.y = 0.42;
    c.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
  }
  mesh(pot, GEO.ring, MAT.iron, 0, 0.5, 0);
  mergeStill(pot); // (its pieces joined: it swings as one)
  const gl = glow(0xffb060, 0.7, 0.5);
  pot.add(gl);
  return pot;
}
const EMBER_GLOW = markShared(lit(0xffa850));

/** The hanging censer: its pot swinging on a long chain from the dark above (`swing`; `pot` is the pot). */
export function censerLook(chain: number) {
  const g = new THREE.Group(),
    swing = new THREE.Group();
  swing.position.y = 1.5 + chain;
  const c = mesh(swing, GEO.chain, MAT.iron, 0, -(chain - 0.5) / 2, 0);
  c.scale.y = chain - 0.5;
  const pot = censerPot();
  pot.position.y = -chain;
  swing.add(pot);
  g.add(swing, blob(0.7));
  return { group: g, parts: { swing, pot } };
}

/** The reliquary: a gilded casket shaped like a little chapel (columns at its corners, a roof, a cross, a gem), on a
    moulded plinth, bound by a ring of golden runes turning round it (`seal`), candle-light held in a ward. */
export function reliquaryLook() {
  const g = new THREE.Group();
  mesh(g, GEO.base, MAT.darkStone, 0, 0.21, 0);
  mesh(g, GEO.moulding, MAT.stone, 0, 0.45, 0);
  mesh(g, GEO.casket, MAT.gilt, 0, 0.63, 0);
  for (const [x, z] of [
    [-0.27, -0.18],
    [0.27, -0.18],
    [-0.27, 0.18],
    [0.27, 0.18],
  ])
    mesh(g, GEO.column, MAT.gilt, x, 0.63, z);
  mesh(g, GEO.roofPrism, MAT.gilt, 0, 0.86, 0);
  mesh(g, GEO.crossV, MAT.gilt, 0, 1.08, 0);
  mesh(g, GEO.crossH, MAT.gilt, 0, 1.1, 0);
  mesh(g, GEO.gem, GEM, 0, 0.64, 0.19).scale.set(1, 1.3, 0.5);
  const seal = new THREE.Mesh(SEAL_RING, SEAL_MAT);
  seal.position.y = 0.65;
  const gl = glow(GOLD, 0.9, 0.6);
  gl.position.set(0, 0.75, 0.3);
  g.add(seal, gl, blob(1.1));
  return { group: g, parts: { seal } };
}
const GEM = markShared(lit(0xc03848));

/* ---------- from the Eda lore ---------- */

const STATUE = {
  plinth: shared(new THREE.BoxGeometry(0.72, 0.24, 0.62)),
  step: shared(new THREE.BoxGeometry(0.8, 0.06, 0.7)),
  robe: shared(
    new THREE.LatheGeometry(
      [
        [0.3, 0],
        [0.31, 0.08],
        [0.26, 0.5],
        [0.22, 0.9],
        [0.24, 1.08],
        [0.2, 1.2],
        [0.08, 1.26],
        [0, 1.27],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      8,
    ),
  ),
  fold: shared(new THREE.BoxGeometry(0.035, 0.86, 0.05)),
  hood: shared(new THREE.SphereGeometry(0.19, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.2, 1.05)),
  peak: shared(new THREE.ConeGeometry(0.08, 0.16, 6)),
  face: shared(new THREE.CircleGeometry(0.11, 10).scale(1, 1.25, 1)),
  eye: shared(new THREE.SphereGeometry(0.022, 5, 4)),
  blade: shared(new THREE.BoxGeometry(0.05, 0.84, 0.018)),
  guard: shared(new THREE.BoxGeometry(0.26, 0.04, 0.05)),
  grip: shared(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5)),
  pommel: shared(new THREE.SphereGeometry(0.035, 6, 4)),
  hands: shared(new THREE.SphereGeometry(0.07, 7, 5).scale(1.3, 0.8, 0.9)),
};

/** The watching statue: a hooded Warden of Uzulim in stone, hands on a sword point down, on a plinth. Its head
    (`head`) turns to follow the mage; its eyes (`eyes`, their own material) kindle as its gaze charges and go dark when a
    hex blinds it; the gaze itself (`gaze`, a line to the mage, its own geometry) shows while it charges. */
export function statueLook() {
  const g = new THREE.Group(),
    pale = tone(0xb2aa9c, 0.12),
    shadow = tone(0x7c7568, 0.1); // (pale limestone: it stands against the lit north wall)
  mesh(g, STATUE.step, MAT.darkStone, 0, 0.03, 0);
  mesh(g, STATUE.plinth, shadow, 0, 0.18, 0);
  const body = new THREE.Group();
  body.position.y = 0.3;
  g.add(body);
  mesh(body, STATUE.robe, pale);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i - 2) * 0.42;
    mesh(body, STATUE.fold, shadow, Math.cos(a) * 0.27, 0.44, Math.sin(a) * 0.27).rotation.set(
      0,
      -a + Math.PI / 2,
      -0.05 * (i - 2),
    );
  } // (the robe's folds)
  mesh(body, STATUE.blade, MAT.iron, 0, 0.5, 0.3).rotation.x = -0.08;
  mesh(body, STATUE.guard, MAT.iron, 0, 0.93, 0.27);
  mesh(body, STATUE.grip, MAT.darkBronze, 0, 1.02, 0.27);
  mesh(body, STATUE.pommel, MAT.darkBronze, 0, 1.1, 0.27);
  mesh(body, STATUE.hands, pale, 0, 1.0, 0.25);
  const head = new THREE.Group();
  head.position.y = 1.52;
  mesh(head, STATUE.hood, pale, 0, -0.06, 0);
  mesh(head, STATUE.peak, pale, 0, 0.19, -0.05).rotation.x = -0.35;
  mesh(head, STATUE.face, MAT.socket, 0, -0.04, 0.17);
  const eyeMat = new THREE.MeshBasicMaterial({ color: EYE_DIM }),
    eyes = new THREE.Group(); // (its own: the gaze kindles it)
  mesh(eyes, STATUE.eye, eyeMat, -0.045, -0.02, 0.18);
  mesh(eyes, STATUE.eye, eyeMat, 0.045, -0.02, 0.18);
  head.add(eyes);
  head.userData.parts = { eyes };
  mergeStill(head);
  head.userData.eyes = eyeMat;
  const gaze = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]),
    new THREE.LineBasicMaterial({
      color: GAZE,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  ); // (near white: it reads over gold floors too)
  gaze.frustumCulled = false;
  gaze.visible = false;
  g.add(head, gaze, blob(1));
  return { group: g, parts: { head, gaze } };
}
export const EYE_DIM = 0x5a4a2a,
  EYE_LIT = 0xffd878,
  EYE_BLIND = 0x3a2458,
  GAZE = 0xfff4e0;

const OBELISK = {
  base: shared(new THREE.BoxGeometry(0.64, 0.16, 0.64)),
  shaft: shared(new THREE.CylinderGeometry(0.12, 0.21, 1.7, 4).rotateY(Math.PI / 4)),
  cap: shared(new THREE.ConeGeometry(0.17, 0.26, 4).rotateY(Math.PI / 4)),
  // runes cut down the face turned to the camera, each set on the tapering face at its height (the shaft narrows from
  // .21 at its foot, y .16, to .12 at its point, y 1.86; a four-sided face lies at the radius times cos 45°)
  runes: shared(
    joinAll(
      [0, 1, 2].map((i) => {
        const y = 0.5 + i * 0.42,
          r = 0.21 - (0.09 * (y - 0.16)) / 1.7;
        return runeStrokes(0.2 - i * 0.025)
          .rotateX(-0.04)
          .translate(0, y, r * Math.SQRT1_2 + 0.012);
      }),
    ),
  ),
  field: shared(new THREE.RingGeometry(0.94, 1, 48).rotateX(-Math.PI / 2)),
};

/** Each school's sign, floating over an obelisk's point so its ward reads at a glance (Hallow's gold and Storm's yellow
    are close): a flame, a snowflake, a lightning bolt, a halo, a crescent; Verdant a leaf on its stem. */
const EMBLEM: Record<School, THREE.BufferGeometry> = {
  ember: shared(
    joinAll([
      new THREE.ConeGeometry(0.09, 0.26, 6),
      new THREE.ConeGeometry(0.05, 0.16, 5).translate(0.06, -0.04, 0),
      new THREE.ConeGeometry(0.05, 0.14, 5).translate(-0.06, -0.05, 0),
    ]),
  ),
  frost: shared(joinAll([0, 1, 2].map((i) => new THREE.BoxGeometry(0.03, 0.28, 0.03).rotateZ((i * Math.PI) / 3)))),
  storm: shared(
    joinAll([
      new THREE.BoxGeometry(0.04, 0.16, 0.03).rotateZ(-0.5).translate(0.02, 0.08, 0),
      new THREE.BoxGeometry(0.12, 0.035, 0.03).translate(0, 0, 0),
      new THREE.BoxGeometry(0.04, 0.16, 0.03).rotateZ(-0.5).translate(-0.02, -0.08, 0),
    ]),
  ),
  hallow: shared(
    joinAll([
      new THREE.TorusGeometry(0.11, 0.018, 4, 18).rotateX(Math.PI / 2).translate(0, 0.1, 0),
      new THREE.OctahedronGeometry(0.05, 0),
    ]),
  ),
  umbral: shared(new THREE.TorusGeometry(0.1, 0.032, 4, 12, Math.PI * 1.3).rotateZ(Math.PI * 0.85)),
  verdant: shared(
    joinAll([
      new THREE.SphereGeometry(0.1, 6, 4).scale(0.55, 1.3, 0.25).rotateZ(-0.5).translate(0.03, 0.05, 0),
      new THREE.BoxGeometry(0.025, 0.16, 0.025).rotateZ(0.3).translate(-0.02, -0.08, 0),
    ]),
  ),
};

/** The sapping obelisk: a black stone needle on a plinth, runes of its ward's school cut down its face (`runes`)
    and the school's sign floating over the point (`crystal`), and on the floor the edge of its field (`field`, `reach`
    across). The runes, the sign and the field have their own materials, dulled when the ward breaks. */
/** A ward's emblem (a ward pillar of Kaelith's wakes in a school of its own). */
export const emblemOf = (school: School) => EMBLEM[school];
export function obeliskLook(school: School, reach: number) {
  const g = new THREE.Group(),
    color = SCHOOL_LIGHT[school];
  mesh(g, OBELISK.base, MAT.darkStone, 0, 0.08, 0);
  mesh(g, OBELISK.shaft, MAT.lode, 0, 1.01, 0);
  mesh(g, OBELISK.cap, MAT.lode, 0, 1.99, 0);
  const runes = mesh(g, OBELISK.runes, lit(color));
  const crystal = mesh(g, EMBLEM[school], lit(color), 0, 2.3, 0);
  crystal.scale.setScalar(1.7); // (large enough to read from across the room)
  const field = mesh(
    g,
    OBELISK.field,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    0,
    0.03,
    0,
  );
  field.scale.setScalar(reach);
  const gl = glow(color, 1.2, 0.6);
  gl.position.y = 2.3;
  g.add(gl, blob(0.8));
  return { group: g, parts: { runes, crystal, field, glow: gl } };
}

/** Each step: the moving magic of the room kit's mechanisms (the charged stone's runes, the floating shard, the turning
    seal). `t` is the time; `x` sets each apart. */
export function updateMechLook(parts: Record<string, THREE.Object3D>, t: number, x: number) {
  if (parts.aura?.visible) parts.aura.rotation.y = t * 1.4 + x;
  if (parts.shard) {
    parts.shard.rotation.y = t * 0.5 + x;
    parts.shard.position.y = 0.98 + Math.sin(t * 1.6 + x) * 0.03;
  }
  if (parts.seal) {
    parts.seal.rotation.y = t * 0.35 + x;
    parts.seal.position.y = 0.65 + Math.sin(t * 1.1 + x) * 0.02;
  }
  if (parts.crystal) {
    parts.crystal.rotation.y = t * 0.8 + x;
    parts.crystal.position.y = 2.3 + Math.sin(t * 1.4 + x) * 0.05;
  }
}

const SLUICE = {
  post: shared(new THREE.BoxGeometry(0.24, 1.5, 0.32)),
  lintel: shared(new THREE.BoxGeometry(1.14, 0.22, 0.36)),
  sill: shared(new THREE.BoxGeometry(1.14, 0.1, 0.44)),
  bar: shared(new THREE.CylinderGeometry(0.026, 0.026, 1.1, 5)),
  rail: shared(new THREE.BoxGeometry(0.66, 0.055, 0.06)),
  wheel: shared(new THREE.TorusGeometry(0.14, 0.026, 4, 12)),
  spoke: shared(new THREE.BoxGeometry(0.26, 0.022, 0.022)),
  hub: shared(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 6).rotateX(Math.PI / 2)),
  fall: shared(new THREE.PlaneGeometry(0.6, 0.56)),
  foam: shared(new THREE.RingGeometry(0.08, 0.42, 16).rotateX(-Math.PI / 2)),
};
/** The sluice gate: an iron gate (`gate`) in a stone frame, a wheel on the lintel (`wheel`) that turns as it lifts,
    and, while it stands open, water falling through it (`fall`) into foam (`foam`), each with its own material. */
export function sluiceLook(look?: FloorLook) {
  const g = new THREE.Group(),
    stone = tone(stoneOf(look, 1.15), 0.16); // (the floor's own wall stone)
  mesh(g, SLUICE.post, stone, -0.44, 0.75, 0);
  mesh(g, SLUICE.post, stone, 0.44, 0.75, 0);
  mesh(g, SLUICE.lintel, stone, 0, 1.56, 0);
  mesh(g, SLUICE.sill, MAT.darkStone, 0, 0.05, 0);
  const gate = new THREE.Group();
  for (let i = 0; i < 5; i++) mesh(gate, SLUICE.bar, MAT.iron, -0.25 + i * 0.125, 0.62, 0);
  mesh(gate, SLUICE.rail, MAT.iron, 0, 0.26, 0);
  mesh(gate, SLUICE.rail, MAT.iron, 0, 0.98, 0);
  const wheel = new THREE.Group();
  wheel.position.set(0, 1.8, 0.08);
  mesh(wheel, SLUICE.wheel, MAT.iron);
  mesh(wheel, SLUICE.spoke, MAT.iron);
  mesh(wheel, SLUICE.spoke, MAT.iron).rotation.z = Math.PI / 2;
  mesh(wheel, SLUICE.hub, MAT.darkBronze);
  const fall = new THREE.Mesh(
    SLUICE.fall,
    new THREE.MeshBasicMaterial({
      color: 0x5aa8d0,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  ); // (light, not a grey panel)
  fall.position.set(0, 0.3, 0.22);
  fall.visible = false;
  const foam = new THREE.Mesh(
    SLUICE.foam,
    new THREE.MeshBasicMaterial({
      color: 0xd8f0ff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  ); // (white spray, never a dark ring)
  foam.position.set(0, 0.045, 0.5);
  foam.visible = false;
  g.add(gate, wheel, fall, foam, blob(1.1));
  return { group: g, parts: { gate, wheel, fall, foam } };
}

/* The waystone (docs/archive/M6-plan.md, decision 11): a tall menhir of the Wardens' grey stone, a hollow cut into its face
   for each rune socket (two, one above the other), rune strokes down it that kindle to a pale gold once it has risen, a
   glow over its point. Each hollow and the strokes have their own materials (a carved rune shows in its hollow in the
   rune's colour while the stone's screen is open). Its face is turned square to the camera; its stone is a cool grey of its
   own, which reads on every floor's. */
const WAYSTONE = {
  body: shared(
    new THREE.LatheGeometry(
      [
        [0.34, 0],
        [0.37, 0.35],
        [0.34, 1.05],
        [0.27, 1.55],
        [0.15, 1.8],
        [0, 1.88],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      6,
    ),
  ),
  hollow: shared(new THREE.CircleGeometry(0.1, 7)),
  lip: shared(new THREE.TorusGeometry(0.1, 0.018, 4, 7)),
  low: shared(runeStrokes(0.2)),
  high: shared(runeStrokes(0.15)),
};
const WAYSTONE_STONE = 0x8e929c;
/** The face of a six-sided lathe turned square to the camera lies at its radius times cos 30°. */
const faceAt = (y: number) => {
  const r =
    y < 0.35
      ? 0.34 + (0.03 * y) / 0.35
      : y < 1.05
        ? 0.37 - (0.03 * (y - 0.35)) / 0.7
        : 0.34 - (0.07 * (y - 1.05)) / 0.5;
  return r * Math.cos(Math.PI / 6) + 0.012;
};
export const WAYSTONE_RUNES = { cold: 0x2a1d16, lit: 0xffbe3a };
export function waystoneLook() {
  const g = new THREE.Group(),
    stone = tone(WAYSTONE_STONE, 0.16); // (a cool grey of its own: the Wardens' stone, apart from every floor's)
  const body = mesh(g, WAYSTONE.body, stone);
  body.rotation.y = Math.PI / 6;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + 0.4,
      r = mesh(g, GEO.rubble, MAT.stone, Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.42);
    r.scale.setScalar(0.8 + (i % 3) * 0.3);
  }
  const strokesMat = new THREE.MeshBasicMaterial({ color: WAYSTONE_RUNES.cold });
  const runes = new THREE.Group();
  g.add(runes); // (its strokes share one material: kindled, they glow)
  mesh(runes, WAYSTONE.low, strokesMat, 0, 0.4, faceAt(0.4));
  mesh(runes, WAYSTONE.high, strokesMat, 0, 1.44, faceAt(1.44));
  const hollows = [0.78, 1.12].map((y) => {
    const m = mesh(g, WAYSTONE.hollow, new THREE.MeshBasicMaterial({ color: 0x0c0806 }), 0, y, faceAt(y));
    mesh(g, WAYSTONE.lip, stone, 0, y, faceAt(y) - 0.004);
    return m;
  });
  const gl = glow(WAYSTONE_RUNES.lit, 1.4, 0.5);
  gl.position.y = 1.6;
  gl.visible = false;
  g.add(gl, blob(0.9));
  return { group: g, parts: { runes, hollows, glow: gl } };
}
