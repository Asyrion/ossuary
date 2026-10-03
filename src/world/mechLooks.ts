/* The room kit's mechanisms (M3.5 step 3; docs/M3.5-plan.md): the rune stone, the lodestone, the bell, the hanging censer
   and the reliquary, built in code in the style of the spell effects (docs/effects.md). What they do is unchanged
   (mechanisms.ts); only the look is new, and each keeps the parts mechanisms.ts moves or lights. Every one has a touch of
   magic that moves: runes orbit a charged stone, the lodestone's shard floats and turns, the reliquary's seal of
   candle-light turns round it (`updateMechLook`). `DEV.roomKit` off keeps the old looks. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, markShared, mergeStill } from '../render/materials';
import { SCHOOL_LIGHT, lit, shine, type School } from '../render/arcane';
import { MAT, joinAll, mesh, runeStrokes, shared, stoneOf, tone } from './kitParts';

const GOLD = 0xffd98a;
const GEO = {
  // the rune stone: a six-sided menhir, pointed, on rubble; a carved ring round its rune
  menhir: shared(new THREE.LatheGeometry([[.28, 0], [.3, .3], [.27, .75], [.2, 1.02], [.09, 1.14], [0, 1.17]].map(([x, y]) => new THREE.Vector2(x, y)), 6)),
  rubble: shared(new THREE.DodecahedronGeometry(.1, 0)), lichen: shared(new THREE.SphereGeometry(.07, 6, 3).scale(1, .6, .25)),
  carving: shared(joinAll([new THREE.TorusGeometry(.17, .02, 4, 20), runeStrokes(.24)])), shard: shared(new THREE.OctahedronGeometry(.075, 0).scale(.8, 1.6, .8)),
  // the lodestone: a plinth, copper prongs, a floating shard banded in copper
  plinth: shared(new THREE.CylinderGeometry(.3, .34, .12, 6)), prong: shared(new THREE.CylinderGeometry(.022, .03, 1, 5)), knob: shared(new THREE.SphereGeometry(.045, 6, 4)),
  lode: shared(new THREE.OctahedronGeometry(.19, 0).scale(.8, 2.3, .8)), band: shared(new THREE.TorusGeometry(.13, .02, 4, 6).rotateX(Math.PI / 2)),
  // the bell: posts, a beam under a little roof, a yoke, a flared bell, a clapper
  post: shared(new THREE.BoxGeometry(.12, 1.72, .12)), footing: shared(new THREE.BoxGeometry(.24, .12, .24)), beam: shared(new THREE.BoxGeometry(1.22, .14, .16)),
  roof: shared(new THREE.BoxGeometry(.72, .04, .3)), yoke: shared(new THREE.BoxGeometry(.3, .1, .13)),
  bell: shared(new THREE.LatheGeometry([[0, .03], [.33, 0], [.37, 0], [.36, .02], [.27, .12], [.22, .3], [.2, .52], [.12, .62], [0, .64]].map(([x, y]) => new THREE.Vector2(x, y)), 14)), // (from the bottom up: turned from the top down, a lathe is inside out)
  bellBand: shared(new THREE.TorusGeometry(.215, .018, 4, 16).rotateX(Math.PI / 2)), clapperRod: shared(new THREE.CylinderGeometry(.012, .012, .3, 4)), clapper: shared(new THREE.SphereGeometry(.05, 6, 4)),
  // the censer: a chain, a ring, three short chains, a pierced pot, a domed cap and a finial
  chain: shared(new THREE.CylinderGeometry(.012, .012, 1, 4)), ring: shared(new THREE.TorusGeometry(.05, .012, 4, 10).rotateX(Math.PI / 2)),
  pot: shared(new THREE.LatheGeometry([[0, 0], [.08, .01], [.15, .06], [.17, .13], [.16, .16]].map(([x, y]) => new THREE.Vector2(x, y)), 10)),
  cap: shared(new THREE.LatheGeometry([[.16, 0], [.15, .05], [.1, .11], [.04, .14], [0, .15]].map(([x, y]) => new THREE.Vector2(x, y)), 10)),
  hole: shared(new THREE.SphereGeometry(.018, 5, 3)), finial: shared(new THREE.ConeGeometry(.025, .08, 5)),
  // the reliquary: a moulded plinth, a casket shaped like a little chapel, its roof, corner columns, a cross, a gem
  base: shared(new THREE.BoxGeometry(.78, .42, .56)), moulding: shared(new THREE.BoxGeometry(.84, .07, .62)),
  casket: shared(new THREE.BoxGeometry(.54, .3, .36)), roofPrism: shared(new THREE.CylinderGeometry(.22, .22, .6, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).scale(1, .7, 1)),
  column: shared(new THREE.CylinderGeometry(.022, .022, .3, 5)), crossV: shared(new THREE.BoxGeometry(.035, .16, .035)), crossH: shared(new THREE.BoxGeometry(.11, .035, .035)),
  gem: shared(new THREE.OctahedronGeometry(.045, 0)),
};

/** A ring of runes, flat, `r` across: one geometry. */
function runeRingGeometry(r: number, count: number) {
  const parts: THREE.BufferGeometry[] = [new THREE.TorusGeometry(r, r * .035, 4, 32).rotateX(Math.PI / 2)];
  for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2; parts.push(runeStrokes(r * .32).rotateY(-a + Math.PI / 2).translate(Math.cos(a) * r, r * .06, Math.sin(a) * r)); }
  return joinAll(parts);
}
const SEAL_RING = shared(runeRingGeometry(.52, 8));
const SEAL_MAT = markShared(shine(0xffb040, .5)); // (deeper than the glow's gold: added light over a lit floor goes white)

/** The rune stone: a menhir on rubble, lichen on it, a rune cut in a ring on the face turned to the camera. The carving
    (`rune`, its own material) takes the school's colour when a charge reaches it, and three runes (`aura`) circle it. */
export function runeStoneLook() {
  const g = new THREE.Group();
  const stone = mesh(g, GEO.menhir, MAT.stone); stone.rotation.y = Math.PI / 6; // (a face square to the camera)
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + .4; mesh(g, GEO.rubble, MAT.darkStone, Math.cos(a) * .32, .05, Math.sin(a) * .3).scale.setScalar(.7 + (i % 3) * .25); }
  for (const [x, y, z] of [[-.2, .35, .16], [.18, .85, .1], [.23, .2, -.12]]) mesh(g, GEO.lichen, MAT.lichen, x, y, z).lookAt(x * 3, y, z * 3);
  const rune = mesh(g, GEO.carving, new THREE.MeshStandardMaterial({ color: 0x5a5660, emissive: 0x16141c, roughness: .8 }), 0, .58, .275); // (its own material: a charge colours it; cold, a pale cut that still reads)
  rune.rotation.x = -.05;
  const aura = new THREE.Group(); aura.position.y = .7;
  const auraMat = lit(0xffffff);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; mesh(aura, GEO.shard, auraMat, Math.cos(a) * .42, (i - 1) * .12, Math.sin(a) * .42); }
  mergeStill(aura); aura.visible = false; // (joined while shown: mergeStill leaves hidden things; charge() colours its one material)
  const gl = glow(0xffffff, 1.4, .7); gl.position.set(0, .62, .36); gl.visible = false; // (charged: the stone shines its school's light)
  g.add(aura, gl, blob(.9));
  return { group: g, parts: { rune, glow: gl, aura } };
}

/** The lodestone: a dark shard of iron-stone floating between three copper prongs over a plinth, banded in copper, turning
    slowly (`shard`); a spark gathers above it (`tip`) as it charges. */
export function lodestoneLook() {
  const g = new THREE.Group();
  mesh(g, GEO.plinth, MAT.darkStone, 0, .06, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + Math.PI / 2, foot = new THREE.Vector3(Math.cos(a) * .25, .1, Math.sin(a) * .25), top = new THREE.Vector3(Math.cos(a) * .19, .82, Math.sin(a) * .19);
    const d = top.clone().sub(foot), p = mesh(g, GEO.prong, MAT.copper); p.scale.y = d.length();
    p.position.copy(foot).addScaledVector(d, .5); p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    mesh(g, GEO.knob, MAT.copper, top.x, top.y, top.z);
  }
  const shard = new THREE.Group(); shard.position.y = .98;
  mesh(shard, GEO.lode, MAT.lode); mesh(shard, GEO.band, MAT.copper, 0, .12, 0); mesh(shard, GEO.band, MAT.copper, 0, -.14, 0).scale.setScalar(.85);
  mergeStill(shard);
  const tip = glow(0xf0e890, .8, .6); tip.position.y = 1.5;
  g.add(shard, tip, blob(.8));
  return { group: g, parts: { tip, shard } };
}

/** The bell: a bronze bell with a band of runes cut round its shoulder and a clapper, under a yoke that swings (`swing`),
    hung from a beam on two posts with a little roof over it. */
export function bellLook() {
  const g = new THREE.Group(), swing = new THREE.Group(); swing.position.y = 1.62;
  for (const x of [-.5, .5]) { mesh(g, GEO.footing, MAT.darkStone, x, .06, 0); mesh(g, GEO.post, MAT.wood, x, .92, 0); }
  mesh(g, GEO.beam, MAT.wood, 0, 1.74, 0);
  for (const s of [-1, 1]) { const r = mesh(g, GEO.roof, MAT.darkStone, 0, 1.86, s * .1); r.rotation.x = s * .5; }
  mesh(swing, GEO.yoke, MAT.iron, 0, 0, 0);
  mesh(swing, GEO.bell, MAT.bronze, 0, -.7, 0); mesh(swing, GEO.bellBand, MAT.darkBronze, 0, -.26, 0); mesh(swing, GEO.bellBand, MAT.darkBronze, 0, -.62, 0).scale.setScalar(1.55);
  for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i - 1) * .8, r = mesh(swing, runeGeo(), MAT.darkBronze, Math.cos(a) * .215, -.4, Math.sin(a) * .215); r.rotation.set(-.1, Math.PI / 2 - a, 0, 'YXZ'); }
  mesh(swing, GEO.clapperRod, MAT.iron, 0, -.6, 0); mesh(swing, GEO.clapper, MAT.iron, 0, -.74, 0);
  mergeStill(swing); // (the bell and its yoke swing as one)
  g.add(swing, blob(1.1));
  return { group: g, parts: { swing } };
}
let runeG: THREE.BufferGeometry | null = null;
const runeGeo = () => runeG ??= shared(runeStrokes(.11));

/** A censer's pot: bronze, pierced round its middle (the embers glowing through), a domed cap and a finial; hung from
    three short chains to a ring. Also what falls when its chain is cut. */
export function censerPot() {
  const pot = new THREE.Group();
  mesh(pot, GEO.pot, MAT.bronze, 0, -.08, 0); mesh(pot, GEO.cap, MAT.bronze, 0, .08, 0); mesh(pot, GEO.finial, MAT.bronze, 0, .26, 0);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(pot, GEO.hole, EMBER_GLOW, Math.cos(a) * .165, .05, Math.sin(a) * .165); }
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, c = mesh(pot, GEO.chain, MAT.iron, Math.cos(a) * .08, .3, Math.sin(a) * .08); c.scale.y = .42; c.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); }
  mesh(pot, GEO.ring, MAT.iron, 0, .5, 0);
  mergeStill(pot); // (its pieces joined: it swings as one)
  const gl = glow(0xffb060, .7, .5); pot.add(gl);
  return pot;
}
const EMBER_GLOW = markShared(lit(0xffa850));

/** The hanging censer: its pot swinging on a long chain from the dark above (`swing`; `pot` is the pot). */
export function censerLook(chain: number) {
  const g = new THREE.Group(), swing = new THREE.Group(); swing.position.y = 1.5 + chain;
  const c = mesh(swing, GEO.chain, MAT.iron, 0, -(chain - .5) / 2, 0); c.scale.y = chain - .5;
  const pot = censerPot(); pot.position.y = -chain; swing.add(pot);
  g.add(swing, blob(.7));
  return { group: g, parts: { swing, pot } };
}

/** The reliquary: a gilded casket shaped like a little chapel (columns at its corners, a roof, a cross, a gem), on a
    moulded plinth, bound by a ring of golden runes turning round it (`seal`), candle-light held in a ward. */
export function reliquaryLook() {
  const g = new THREE.Group();
  mesh(g, GEO.base, MAT.darkStone, 0, .21, 0); mesh(g, GEO.moulding, MAT.stone, 0, .45, 0);
  mesh(g, GEO.casket, MAT.gilt, 0, .63, 0);
  for (const [x, z] of [[-.27, -.18], [.27, -.18], [-.27, .18], [.27, .18]]) mesh(g, GEO.column, MAT.gilt, x, .63, z);
  mesh(g, GEO.roofPrism, MAT.gilt, 0, .86, 0);
  mesh(g, GEO.crossV, MAT.gilt, 0, 1.08, 0); mesh(g, GEO.crossH, MAT.gilt, 0, 1.1, 0);
  mesh(g, GEO.gem, GEM, 0, .64, .19).scale.set(1, 1.3, .5);
  const seal = new THREE.Mesh(SEAL_RING, SEAL_MAT); seal.position.y = .65;
  const gl = glow(GOLD, .9, .6); gl.position.set(0, .75, .3);
  g.add(seal, gl, blob(1.1));
  return { group: g, parts: { seal } };
}
const GEM = markShared(lit(0xc03848));

/* ---------- M4.2, from the Eda lore ---------- */

const STATUE = {
  plinth: shared(new THREE.BoxGeometry(.72, .24, .62)), step: shared(new THREE.BoxGeometry(.8, .06, .7)),
  robe: shared(new THREE.LatheGeometry([[.3, 0], [.31, .08], [.26, .5], [.22, .9], [.24, 1.08], [.2, 1.2], [.08, 1.26], [0, 1.27]].map(([x, y]) => new THREE.Vector2(x, y)), 8)),
  fold: shared(new THREE.BoxGeometry(.035, .86, .05)),
  hood: shared(new THREE.SphereGeometry(.19, 10, 7, 0, Math.PI * 2, 0, Math.PI * .62).scale(1, 1.2, 1.05)), peak: shared(new THREE.ConeGeometry(.08, .16, 6)),
  face: shared(new THREE.CircleGeometry(.11, 10).scale(1, 1.25, 1)), eye: shared(new THREE.SphereGeometry(.022, 5, 4)),
  blade: shared(new THREE.BoxGeometry(.05, .84, .018)), guard: shared(new THREE.BoxGeometry(.26, .04, .05)), grip: shared(new THREE.CylinderGeometry(.018, .018, .14, 5)),
  pommel: shared(new THREE.SphereGeometry(.035, 6, 4)), hands: shared(new THREE.SphereGeometry(.07, 7, 5).scale(1.3, .8, .9)),
};

/** The watching statue (M4.2): a hooded Warden of Uzulim in stone, hands on a sword point down, on a plinth. Its head
    (`head`) turns to follow the mage; its eyes (`eyes`, their own material) kindle as its gaze charges and go dark when a
    hex blinds it; the gaze itself (`gaze`, a line to the mage, its own geometry) shows while it charges. */
export function statueLook() {
  const g = new THREE.Group(), pale = tone(0xb2aa9c, .12), shadow = tone(0x7c7568, .1); // (pale limestone: it stands against the lit north wall)
  mesh(g, STATUE.step, MAT.darkStone, 0, .03, 0); mesh(g, STATUE.plinth, shadow, 0, .18, 0);
  const body = new THREE.Group(); body.position.y = .3; g.add(body);
  mesh(body, STATUE.robe, pale);
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * .42; mesh(body, STATUE.fold, shadow, Math.cos(a) * .27, .44, Math.sin(a) * .27).rotation.set(0, -a + Math.PI / 2, -.05 * (i - 2)); } // (the robe's folds)
  mesh(body, STATUE.blade, MAT.iron, 0, .5, .3).rotation.x = -.08; mesh(body, STATUE.guard, MAT.iron, 0, .93, .27);
  mesh(body, STATUE.grip, MAT.darkBronze, 0, 1.02, .27); mesh(body, STATUE.pommel, MAT.darkBronze, 0, 1.1, .27); mesh(body, STATUE.hands, pale, 0, 1.0, .25);
  const head = new THREE.Group(); head.position.y = 1.52;
  mesh(head, STATUE.hood, pale, 0, -.06, 0); mesh(head, STATUE.peak, pale, 0, .19, -.05).rotation.x = -.35;
  mesh(head, STATUE.face, MAT.socket, 0, -.04, .17);
  const eyeMat = new THREE.MeshBasicMaterial({ color: EYE_DIM }), eyes = new THREE.Group(); // (its own: the gaze kindles it)
  mesh(eyes, STATUE.eye, eyeMat, -.045, -.02, .18); mesh(eyes, STATUE.eye, eyeMat, .045, -.02, .18);
  head.add(eyes); head.userData.parts = { eyes }; mergeStill(head); head.userData.eyes = eyeMat;
  const gaze = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]),
    new THREE.LineBasicMaterial({ color: GAZE, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); // (near white: it reads over gold floors too)
  gaze.frustumCulled = false; gaze.visible = false;
  g.add(head, gaze, blob(1));
  return { group: g, parts: { head, gaze } };
}
export const EYE_DIM = 0x5a4a2a, EYE_LIT = 0xffd878, EYE_BLIND = 0x3a2458, GAZE = 0xfff4e0;

const OBELISK = {
  base: shared(new THREE.BoxGeometry(.64, .16, .64)), shaft: shared(new THREE.CylinderGeometry(.12, .21, 1.7, 4).rotateY(Math.PI / 4)),
  cap: shared(new THREE.ConeGeometry(.17, .26, 4).rotateY(Math.PI / 4)),
  // runes cut down the face turned to the camera, each set on the tapering face at its height (the shaft narrows from
  // .21 at its foot, y .16, to .12 at its point, y 1.86; a four-sided face lies at the radius times cos 45°)
  runes: shared(joinAll([0, 1, 2].map(i => { const y = .5 + i * .42, r = .21 - .09 * (y - .16) / 1.7; return runeStrokes(.2 - i * .025).rotateX(-.04).translate(0, y, r * Math.SQRT1_2 + .012); }))),
  field: shared(new THREE.RingGeometry(.94, 1, 48).rotateX(-Math.PI / 2)),
};

/** Each school's sign, floating over an obelisk's point so its ward reads at a glance (Hallow's gold and Storm's yellow
    are close): a flame, a snowflake, a lightning bolt, a halo, a crescent; M5's Verdant a leaf on its stem. */
const EMBLEM: Record<School, THREE.BufferGeometry> = {
  ember: shared(joinAll([new THREE.ConeGeometry(.09, .26, 6), new THREE.ConeGeometry(.05, .16, 5).translate(.06, -.04, 0), new THREE.ConeGeometry(.05, .14, 5).translate(-.06, -.05, 0)])),
  frost: shared(joinAll([0, 1, 2].map(i => new THREE.BoxGeometry(.03, .28, .03).rotateZ(i * Math.PI / 3)))),
  storm: shared(joinAll([new THREE.BoxGeometry(.04, .16, .03).rotateZ(-.5).translate(.02, .08, 0), new THREE.BoxGeometry(.12, .035, .03).translate(0, 0, 0), new THREE.BoxGeometry(.04, .16, .03).rotateZ(-.5).translate(-.02, -.08, 0)])),
  hallow: shared(joinAll([new THREE.TorusGeometry(.11, .018, 4, 18).rotateX(Math.PI / 2).translate(0, .1, 0), new THREE.OctahedronGeometry(.05, 0)])),
  umbral: shared(new THREE.TorusGeometry(.1, .032, 4, 12, Math.PI * 1.3).rotateZ(Math.PI * .85)),
  verdant: shared(joinAll([new THREE.SphereGeometry(.1, 6, 4).scale(.55, 1.3, .25).rotateZ(-.5).translate(.03, .05, 0), new THREE.BoxGeometry(.025, .16, .025).rotateZ(.3).translate(-.02, -.08, 0)])),
};

/** The sapping obelisk (M4.2): a black stone needle on a plinth, runes of its ward's school cut down its face (`runes`)
    and the school's sign floating over the point (`crystal`), and on the floor the edge of its field (`field`, `reach`
    across). The runes, the sign and the field have their own materials, dulled when the ward breaks. */
export function obeliskLook(school: School, reach: number) {
  const g = new THREE.Group(), color = SCHOOL_LIGHT[school];
  mesh(g, OBELISK.base, MAT.darkStone, 0, .08, 0); mesh(g, OBELISK.shaft, MAT.lode, 0, 1.01, 0); mesh(g, OBELISK.cap, MAT.lode, 0, 1.99, 0);
  const runes = mesh(g, OBELISK.runes, lit(color));
  const crystal = mesh(g, EMBLEM[school], lit(color), 0, 2.3, 0); crystal.scale.setScalar(1.7); // (large enough to read from across the room)
  const field = mesh(g, OBELISK.field, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false }), 0, .03, 0);
  field.scale.setScalar(reach);
  const gl = glow(color, 1.2, .6); gl.position.y = 2.3;
  g.add(gl, blob(.8));
  return { group: g, parts: { runes, crystal, field, glow: gl } };
}

/** Each step: the moving magic of the room kit's mechanisms (the charged stone's runes, the floating shard, the turning
    seal). `t` is the time; `x` sets each apart. */
export function updateMechLook(parts: Record<string, THREE.Object3D>, t: number, x: number) {
  if (parts.aura?.visible) parts.aura.rotation.y = t * 1.4 + x;
  if (parts.shard) { parts.shard.rotation.y = t * .5 + x; parts.shard.position.y = .98 + Math.sin(t * 1.6 + x) * .03; }
  if (parts.seal) { parts.seal.rotation.y = t * .35 + x; parts.seal.position.y = .65 + Math.sin(t * 1.1 + x) * .02; }
  if (parts.crystal) { parts.crystal.rotation.y = t * .8 + x; parts.crystal.position.y = 2.3 + Math.sin(t * 1.4 + x) * .05; }
}

const SLUICE = {
  post: shared(new THREE.BoxGeometry(.24, 1.5, .32)), lintel: shared(new THREE.BoxGeometry(1.14, .22, .36)), sill: shared(new THREE.BoxGeometry(1.14, .1, .44)),
  bar: shared(new THREE.CylinderGeometry(.026, .026, 1.1, 5)), rail: shared(new THREE.BoxGeometry(.66, .055, .06)),
  wheel: shared(new THREE.TorusGeometry(.14, .026, 4, 12)), spoke: shared(new THREE.BoxGeometry(.26, .022, .022)), hub: shared(new THREE.CylinderGeometry(.035, .035, .1, 6).rotateX(Math.PI / 2)),
  fall: shared(new THREE.PlaneGeometry(.6, .56)), foam: shared(new THREE.RingGeometry(.08, .42, 16).rotateX(-Math.PI / 2)),
};
/** The sluice gate (M4.9): an iron gate (`gate`) in a stone frame, a wheel on the lintel (`wheel`) that turns as it lifts,
    and, while it stands open, water falling through it (`fall`) into foam (`foam`), each with its own material. */
export function sluiceLook(look?: FloorLook) {
  const g = new THREE.Group(), stone = tone(stoneOf(look, 1.15), .16); // (the floor's own wall stone)
  mesh(g, SLUICE.post, stone, -.44, .75, 0); mesh(g, SLUICE.post, stone, .44, .75, 0); mesh(g, SLUICE.lintel, stone, 0, 1.56, 0); mesh(g, SLUICE.sill, MAT.darkStone, 0, .05, 0);
  const gate = new THREE.Group();
  for (let i = 0; i < 5; i++) mesh(gate, SLUICE.bar, MAT.iron, -.25 + i * .125, .62, 0);
  mesh(gate, SLUICE.rail, MAT.iron, 0, .26, 0); mesh(gate, SLUICE.rail, MAT.iron, 0, .98, 0);
  const wheel = new THREE.Group(); wheel.position.set(0, 1.8, .08);
  mesh(wheel, SLUICE.wheel, MAT.iron); mesh(wheel, SLUICE.spoke, MAT.iron); mesh(wheel, SLUICE.spoke, MAT.iron).rotation.z = Math.PI / 2; mesh(wheel, SLUICE.hub, MAT.darkBronze);
  const fall = new THREE.Mesh(SLUICE.fall, new THREE.MeshBasicMaterial({ color: 0x5aa8d0, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); // (light, not a grey panel)
  fall.position.set(0, .3, .22); fall.visible = false;
  const foam = new THREE.Mesh(SLUICE.foam, new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending })); // (white spray, never a dark ring)
  foam.position.set(0, .045, .5); foam.visible = false;
  g.add(gate, wheel, fall, foam, blob(1.1));
  return { group: g, parts: { gate, wheel, fall, foam } };
}

/* M6 step 9: the waystone (docs/M6-plan.md, decision 11): a tall menhir of the Wardens' grey stone, a hollow cut into its face
   for each rune socket (two, one above the other), rune strokes down it that kindle to a pale gold once it has risen, a
   glow over its point. Each hollow and the strokes have their own materials (a carved rune shows in its hollow in the
   rune's colour while the stone's screen is open). Its face is turned square to the camera; its stone is a cool grey of its
   own, which reads on every floor's. */
const WAYSTONE = {
  body: shared(new THREE.LatheGeometry([[.34, 0], [.37, .35], [.34, 1.05], [.27, 1.55], [.15, 1.8], [0, 1.88]].map(([x, y]) => new THREE.Vector2(x, y)), 6)),
  hollow: shared(new THREE.CircleGeometry(.1, 7)), lip: shared(new THREE.TorusGeometry(.1, .018, 4, 7)),
  low: shared(runeStrokes(.2)), high: shared(runeStrokes(.15)),
};
const WAYSTONE_STONE = 0x8e929c;
/** The face of a six-sided lathe turned square to the camera lies at its radius times cos 30°. */
const faceAt = (y: number) => { const r = y < .35 ? .34 + .03 * y / .35 : y < 1.05 ? .37 - .03 * (y - .35) / .7 : .34 - .07 * (y - 1.05) / .5; return r * Math.cos(Math.PI / 6) + .012; };
export const WAYSTONE_RUNES = { cold: 0x2a1d16, lit: 0xffbe3a };
export function waystoneLook() {
  const g = new THREE.Group(), stone = tone(WAYSTONE_STONE, .16); // (a cool grey of its own: the Wardens' stone, apart from every floor's)
  const body = mesh(g, WAYSTONE.body, stone); body.rotation.y = Math.PI / 6;
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + .4, r = mesh(g, GEO.rubble, MAT.stone, Math.cos(a) * .45, .05, Math.sin(a) * .42); r.scale.setScalar(.8 + (i % 3) * .3); }
  const strokesMat = new THREE.MeshBasicMaterial({ color: WAYSTONE_RUNES.cold });
  const runes = new THREE.Group(); g.add(runes); // (its strokes share one material: kindled, they glow)
  mesh(runes, WAYSTONE.low, strokesMat, 0, .4, faceAt(.4)); mesh(runes, WAYSTONE.high, strokesMat, 0, 1.44, faceAt(1.44));
  const hollows = [.78, 1.12].map(y => {
    const m = mesh(g, WAYSTONE.hollow, new THREE.MeshBasicMaterial({ color: 0x0c0806 }), 0, y, faceAt(y));
    mesh(g, WAYSTONE.lip, stone, 0, y, faceAt(y) - .004);
    return m;
  });
  const gl = glow(WAYSTONE_RUNES.lit, 1.4, .5); gl.position.y = 1.6; gl.visible = false;
  g.add(gl, blob(.9));
  return { group: g, parts: { runes, hollows, glow: gl } };
}
