/* The pickups and containers in the room kit's style (M3.5 step 3; docs/M3.5-plan.md): hearts of blood with a glowing
   face (a half one broken down the middle), an obol stamped with a rune, a leather purse with a coin in its neck, a mana
   vial of blue grave-light, a bone key with a ward-blue stone in its bow, a glyph stone with its rune burning amber; an
   offering coffer (planks, iron bands, a slot for coins) and a reliquary chest (dark wood, bone or gilt bands, a lock
   plate) with its ward seal, a circle of runes. Built once each, merged (`mergeStill`), and cloned: what a pickup is and
   does is unchanged (pickups.ts). `DEV.roomKit` off keeps the old looks. */
import * as THREE from 'three';
import { TILT } from '../render/renderer';
import { blob, glow, glowShared, mergeStill } from '../render/materials';
import { glowTone, mesh, rough, runeStrokes, shade, shared, tone } from '../world/kitParts';
import { box, put } from '../world/objectLooks';
import { WARD_COLOR as WARD } from '../world/rooms';
import type { Item } from './loot';

const V = (x: number, y: number) => new THREE.Vector2(x, y);
/** A shape turned round the upright from its outline, given from the bottom up. */
const lathe = (pts: number[][], seg = 10) => new THREE.LatheGeometry(pts.map(([x, y]) => V(x, y)), seg);
const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);

const BLOOD = 0x8a1610, RUBY = 0xd83426, SHINE = 0xffb4a0, OBOL = 0xc89a44, LEATHER = 0x6e4a30, CORD = 0xc8a878, GLASS = 0x9ebed8, MANA = 0x4a8cff,
  CORK = 0x8a6a44, BONE = 0xe4d8bc, SLATE = 0x3a332c, SLATE_RIM = 0x5e554c, AMBER = 0xffae48, OAK = 0x6a4428, DARK_OAK = 0x563620, IRON = 0x6e6a72, GILT = 0xc49a4a, GOLD = 0xffd27a;
const metal = (c: number) => tone(c, .05, .45);

/** A heart's outline, .68 across: whole, or its left half broken off down the middle. */
function heartShape(half: boolean) {
  const s = new THREE.Shape();
  if (half) {
    s.moveTo(0, .18); s.bezierCurveTo(-.12, .34, -.34, .28, -.34, .1); s.bezierCurveTo(-.34, -.05, -.05, -.22, 0, -.3);
    for (const [x, y] of [[-.03, -.2], [.03, -.1], [-.02, 0], [.03, .09]]) s.lineTo(x, y); // (the break)
    s.lineTo(0, .18);
  } else {
    s.moveTo(0, -.3); s.bezierCurveTo(.05, -.22, .34, -.05, .34, .1); s.bezierCurveTo(.34, .28, .12, .34, 0, .18);
    s.bezierCurveTo(-.12, .34, -.34, .28, -.34, .1); s.bezierCurveTo(-.34, -.05, -.05, -.22, 0, -.3);
  }
  return s;
}
const extrude = (s: THREE.Shape, depth: number, bevel: number) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 7 }).translate(0, 0, -depth / 2);

/** A flat group facing the camera above (tipped back by the camera's tilt), inside `g`. */
function facing(g: THREE.Group) { const f = new THREE.Group(); f.rotation.x = -TILT; g.add(f); return f; }

type Build = (g: THREE.Group) => void;
const ITEMS: Record<Exclude<Item, 'potion' | 'reagent'>, Build> = { // (M5's potions and reagents: alchemyLooks.ts)
  heart: g => heart(g, false),
  halfHeart: g => heart(g, true),
  coin(g) { obol(g, 1); g.add(glowShared(GOLD, .8, .6)); },
  purse(g) { // a squat leather pouch drawn shut with cord, its mouth gathered in a frill, obols showing at it and one
    // sewn on each side
    mesh(g, rough(lathe([[0, -.18], [.11, -.175], [.18, -.14], [.215, -.08], [.22, -.02], [.195, .04], [.14, .09], [.075, .112], [.062, .13], [.1, .16], [.15, .2], [.125, .215], [.07, .19], [0, .18]], 11), .02, 5), tone(LEATHER, .16));
    put(mesh(g, new THREE.TorusGeometry(.07, .022, 4, 10), tone(CORD, .05), 0, .118, 0), Math.PI / 2);
    for (const s of [-1, 1]) put(mesh(g, cyl(.011, .009, .13, 4), tone(CORD), s * .06, .06, .1), .35, 0, s * .4);
    for (const [x, y, z, rx, rz] of [[.02, .2, .05, -.9, .2], [-.05, .205, -.03, -.3, -.5]]) { const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); obol(c, .55); g.add(c); }
    for (const z of [-1, 1]) { const c = new THREE.Group(); c.position.set(0, -.04, z * .21); c.rotation.set(-.15 * z, z < 0 ? Math.PI : 0, 0); obol(c, .45); g.add(c); }
    g.add(glowShared(GOLD, .7, .45));
  },
  mana(g) { // a vial of blue grave-light: the glowing draught in its belly, the glass shoulder and neck, a cork tied down
    mesh(g, lathe([[0, -.13], [.07, -.13], [.1, -.1], [.112, -.05], [.104, .01], [.086, .035], [0, .035]], 10), glowTone(MANA));
    mesh(g, lathe([[.088, .03], [.095, .045], [.07, .075], [.042, .09], [.036, .14], [.048, .15], [.046, .165], [0, .165]], 10), tone(GLASS, .04, .35));
    put(mesh(g, new THREE.TorusGeometry(.078, .012, 3, 12), tone(GLASS, 0, .35), 0, -.125, 0), Math.PI / 2);
    mesh(g, cyl(.034, .03, .06, 7), tone(CORK, .1), 0, .19, 0);
    put(mesh(g, new THREE.TorusGeometry(.04, .008, 3, 10), tone(CORD), 0, .135, 0), Math.PI / 2);
    put(mesh(g, cyl(.01, .01, .08, 4), glowTone(0xdcecff), -.045, -.045, .108), 0, 0, .15); // (a glint on the glass)
    g.add(glowShared(0x6fa8ff, .8, .6));
  },
  key(g) { // a bone key: its bow a ring round a ward-blue stone, a collar, the shaft, two bits
    const k = new THREE.Group(); k.scale.setScalar(1.15); g.add(k);
    const b = new THREE.Group(); b.position.x = -.19; k.add(b);
    mesh(b, new THREE.TorusGeometry(.078, .034, 5, 12), tone(BONE, .06));
    put(mesh(b, new THREE.OctahedronGeometry(.04, 0), glowTone(WARD)), 0, 0, 0, [1, 1.3, .7]);
    mesh(b, new THREE.SphereGeometry(.03, 5, 4), tone(BONE), 0, .11, 0);
    put(mesh(k, cyl(.032, .026, .3, 6), tone(BONE, .06), .03, 0, 0), 0, 0, Math.PI / 2);
    for (const x of [-.09, -.06]) put(mesh(k, cyl(.044, .044, .02, 7), tone(shade(BONE, .85)), x, 0, 0), 0, 0, Math.PI / 2);
    box(k, .055, .1, .055, tone(BONE, .06), .15, -.07, 0); box(k, .05, .075, .055, tone(BONE, .06), .075, -.06, 0);
    g.add(glowShared(0xf0e6cc, .6, .35));
  },
  glyph(g) { // a glyph stone: a slate, its rim worn pale, its rune burning amber
    const f = facing(g);
    put(mesh(f, rough(cyl(.2, .21, .06, 10), .012, 9), tone(SLATE, .12)), Math.PI / 2, 0, 0, [1, 1, 1.12]);
    put(mesh(f, new THREE.TorusGeometry(.19, .014, 3, 16), tone(SLATE_RIM, .06), 0, 0, .03), 0, 0, 0, [1, 1.12, 1]);
    mesh(f, GEO.rune, glowTone(AMBER), 0, 0, .04);
    g.add(glowShared(0xff9a3a, .75, .55));
  },
  paleSoul: g => soul(g, 0xa8c0f0, 0xe8f0ff), // (M4.1) a pale flame with a white heart
  blackSoul(g) { soul(g, 0x2a1640, 0xb07aff, true); put(mesh(g, new THREE.TorusGeometry(.12, .012, 3, 16), glowTone(0xa266ff), 0, -.15, 0), Math.PI / 2); },
  hallowedSoul(g) { soul(g, 0xffd878, 0xfffbe8); put(mesh(g, new THREE.TorusGeometry(.085, .013, 3, 18), glowTone(0xffe8a0), 0, .33, 0), Math.PI / 2 - .25); },
  shard(g) { // a splinter of lodestone: dark iron-grey, veined with the blue it pulls in, a chip beside it, filings at its foot
    const iron = tone(0x5c6478, .2, .55), vein = glowTone(0x8ab8ff);
    put(mesh(g, rough(new THREE.OctahedronGeometry(.17, 0), .025, 11), iron), .15, .3, .1, [.72, 1.55, .6]);
    put(mesh(g, rough(new THREE.OctahedronGeometry(.08, 0), .014, 12), iron, .17, -.14, .04), .5, 0, -.7, [.8, 1.4, .6]);
    for (const [x, y, rz, l] of [[-.03, .08, .35, .16], [.04, -.07, -.45, .13], [0, .22, .1, .1]]) put(mesh(g, cyl(.014, .014, l, 3), vein, x, y, .09), 0, 0, rz);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; box(g, .025, .014, .06, iron, Math.cos(a) * .19, -.24, Math.sin(a) * .19).rotation.y = -a; }
    g.add(glowShared(0x8ab8ff, .9, .6));
  },
};
/** A soul mote: a flame turned on the upright, its `body` colour round a brighter `core`; `dark`, the body unlit (a black
    mote's shadow, its light all in the core). */
function soul(g: THREE.Group, body: number, core: number, dark = false) {
  const flame = [[0, -.16], [.09, -.15], [.13, -.1], [.14, -.03], [.12, .04], [.085, .1], [.05, .16], [.02, .22], [0, .27]];
  mesh(g, lathe(flame, 10), dark ? tone(body, .1) : glowTone(body));
  put(mesh(g, lathe(flame.map(([x, y]) => [x * .5, y * .55 - .05]), 8), glowTone(core), 0, .035, .1), 0, 0, 0, [1, 1, .6]); // (its heart, showing at the front)
  for (const [x, y, r] of [[-.06, .33, .022], [.05, .4, .016]]) mesh(g, new THREE.SphereGeometry(r, 5, 4), glowTone(core), x, y, 0); // (sparks rising off it)
  g.add(glowShared(dark ? 0xa266ff : body, .75, .55));
}
const GEO = { rune: shared(runeStrokes(.26)), stamp: shared(runeStrokes(.13)) };

/** A heart of blood: its body dark, its face a glowing ruby, a glint on it; `half`, broken down the middle. */
function heart(g: THREE.Group, half: boolean) {
  const f = facing(g), s = heartShape(half);
  mesh(f, extrude(s, .08, .03), tone(BLOOD, .08, .15));
  put(mesh(f, extrude(s, .06, .012), glowTone(RUBY), 0, .01, .04), 0, 0, 0, [.74, .74, 1]);
  put(mesh(f, new THREE.SphereGeometry(.035, 6, 4), glowTone(SHINE), -.15, .12, .085), 0, 0, .6, [1.4, .7, .5]);
}
/** An obol `s` times full size: a disc with a raised rim, a rune stamped on both faces. */
function obol(g: THREE.Object3D, s: number) {
  const o = new THREE.Group(); o.scale.setScalar(s); g.add(o);
  put(mesh(o, cyl(.17, .17, .035, 16), metal(OBOL)), Math.PI / 2);
  mesh(o, new THREE.TorusGeometry(.165, .02, 4, 18), metal(shade(OBOL, 1.1)));
  for (const z of [-1, 1]) put(mesh(o, GEO.stamp, metal(shade(OBOL, .72)), 0, 0, z * .018), 0, z < 0 ? Math.PI : 0, 0);
}

const items = new Map<string, THREE.Object3D>();
/** A pickup's look (a copy: its merged geometry and its materials shared with every other of the kind). */
export function itemLook(kind: Exclude<Item, 'potion' | 'reagent'>) {
  let t = items.get(kind);
  if (!t) { const g = new THREE.Group(); ITEMS[kind](g); t = keep(g); items.set(kind, t); }
  return t.clone();
}

/** A coffer or a chest, merged, its lid on a hinge at the back (`lid`, turned to open) and a chest's ward seal on its
    front (`ward`: its first child, the circle of runes, turns; gold on a gilded chest). As in pickups.ts. */
export function containerLook(kind: 'coffer' | 'chest', gilded = false) {
  const key = kind + (gilded ? ':gilded' : ''); let t = boxes.get(key);
  if (!t) { t = kind === 'coffer' ? coffer() : chest(gilded); boxes.set(key, t); }
  const g = t.clone(), lid = g.getObjectByName('lid')!, ward = g.getObjectByName('ward');
  if (ward) { const gl = glow(gilded ? GOLD : WARD, gilded ? 1.3 : 1, .55); ward.add(gl); } // (its own: it is freed when the ward breaks)
  return { g, lid, ward };
}
const boxes = new Map<string, THREE.Object3D>();

/** An offering coffer: a box of planks, iron bands and corners, a lid with a slot for coins and a hasp. */
function coffer() {
  const g = new THREE.Group(), lid = new THREE.Group(), wood = tone(OAK, .12), dark = tone(0x16100c), iron = metal(IRON);
  box(g, .5, .28, .36, wood, 0, .14, 0);
  for (const x of [-.16, .16]) box(g, .05, .29, .372, iron, x, .145, 0);
  lid.name = 'lid'; lid.position.set(0, .28, -.18); g.add(lid);
  box(lid, .53, .07, .39, wood, 0, .035, .18); box(lid, .44, .025, .3, tone(shade(OAK, 1.1), .08), 0, .08, .18);
  for (const x of [-.16, .16]) box(lid, .055, .075, .4, iron, x, .037, .18);
  for (const x of [-1, 1]) for (const z of [-1, 1]) box(lid, .05, .076, .05, iron, x * .245, .037, .18 + z * .175);
  box(lid, .16, .012, .035, dark, 0, .093, .18); // (the slot for the coins)
  box(lid, .06, .09, .02, iron, 0, -.01, .38);
  g.add(blob(.8));
  return keep(g, [lid]);
}

/** A reliquary chest: dark wood on a plinth, a rounded lid, bands of bone (gilt on a gilded one) over box and lid, a lock
    plate, and the ward seal standing before it. */
function chest(gilded: boolean) {
  const g = new THREE.Group(), lid = new THREE.Group(), wood = tone(DARK_OAK, .14), band = gilded ? metal(GILT) : tone(BONE, .06), dark = tone(shade(DARK_OAK, .55));
  box(g, .76, .04, .5, tone(shade(DARK_OAK, .8), .08), 0, .02, 0); box(g, .72, .32, .46, wood, 0, .2, 0);
  for (const y of [.13, .25]) box(g, .72, .012, .004, dark, 0, y, .231);
  for (const x of [-.24, .24]) box(g, .06, .34, .48, band, x, .19, 0);
  for (const x of [-1, 1]) for (const z of [-1, 1]) box(g, .05, .07, .05, band, x * .35, .06, z * .22);
  box(g, .13, .13, .02, band, 0, .28, .238); box(g, .025, .05, .01, tone(0x16100c), 0, .27, .25); // (the lock plate, its keyhole)
  lid.name = 'lid'; lid.position.set(0, .36, -.23); g.add(lid);
  put(mesh(lid, new THREE.CylinderGeometry(.23, .23, .74, 12, 1, false, 0, Math.PI), tone(shade(DARK_OAK, 1.2), .14), 0, 0, .23), 0, 0, Math.PI / 2);
  for (const x of [-.24, .24]) put(mesh(lid, new THREE.TorusGeometry(.235, .03, 4, 12, Math.PI), band, x, 0, .23), 0, Math.PI / 2, 0);
  if (gilded) put(mesh(lid, new THREE.OctahedronGeometry(.05, 0), glowTone(GOLD), 0, .24, .23), 0, Math.PI / 4, 0, [1, .6, 1]);
  const ward = new THREE.Group(); ward.name = 'ward'; ward.position.set(0, .24, .26); ward.rotation.x = -.3; g.add(ward);
  const seal = new THREE.Group(), light = glowTone(gilded ? GOLD : WARD); ward.add(seal);
  mesh(seal, new THREE.TorusGeometry(.19, .012, 3, 28), light); mesh(seal, new THREE.TorusGeometry(.13, .007, 3, 24), light);
  mesh(seal, GEO.stamp, light);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; put(mesh(seal, SEAL_RUNE, light, Math.cos(a) * .16, Math.sin(a) * .16, 0), 0, 0, a - Math.PI / 2); }
  mergeStill(seal);
  g.add(blob(1));
  return keep(g, [lid], [ward]); // (the seal, merged above, turns on its own)
}
const SEAL_RUNE = shared(runeStrokes(.045));

/** A look merged (the parts that move, `moving` each merged on its own, `apart` left as they are) and kept to be copied: its geometry marked shared,
    so taking one copy away frees nothing the others use. */
export function keep(g: THREE.Group, moving: THREE.Object3D[] = [], apart: THREE.Object3D[] = []) {
  for (const m of moving) mergeStill(m);
  g.userData.parts = Object.fromEntries([...moving, ...apart].map((m, i) => [i, m]));
  mergeStill(g); delete g.userData.parts; // (a copy copies its userData through JSON: objects left in it would be written out every time)
  g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry) m.geometry.userData.shared = true; });
  return g;
}
