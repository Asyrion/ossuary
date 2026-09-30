/* The room kit's objects and piles (M3.5 step 3; docs/M3.5-plan.md): bone piles, skull heaps, grave sacks, oil casks,
   rubble, grave roots, thorn briars, cobwebs, glowcaps, scribes' desks, scroll heaps, pews and the dead tree, and the
   room's larger pieces: rocks (and a grotto's dripstone), pillars, tombs (and the embalmers' slabs), urns, the artifacts'
   pedestals and the bone altar. Built in code in the style of the spell effects (docs/effects.md): painted pieces merged
   into one mesh each (`mergeStill`), faces of stone, wood and bark shaded apart (`paint`'s mottle), and a touch of magic
   where it fits: a glowcap's spores rising, a rune glowing on a scribe's page, a sealed urn's ward of runes, the
   pedestal's ring of golden runes, the altar's runes of blood.
   Stone takes the colour of the floor's walls (`stoneOf`), an urn the floor's clay (`urn` in each look), a candle the
   floor's wax; a rock is mossy on the drowned floor and sooty on the burning one. What each does (blocking, breaking,
   burning) is unchanged (props.ts, rooms.ts, mechanisms.ts, items/artifacts.ts); `DEV.roomKit` off keeps the old looks. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, glowShared, markShared } from '../render/materials';
import { EMBER_FIRE, firePalette, makeFire, makeMotes, type FlameSpec } from '../render/fire';
import { MAT, curve, glowTone, joinAll, mesh, rough, runeStrokes, shade, shared, stoneOf, taperTube, tone } from './kitParts';
import { torchPalette, waxFor } from './fireLooks';

type R = () => number;
const V = (x: number, y: number) => new THREE.Vector2(x, y);
/** A shape turned round the upright from its outline, given from the bottom up (from the top down, it turns inside out). */
const lathe = (pts: number[][], seg: number) => new THREE.LatheGeometry(pts.map(([x, y]) => V(x, y)), seg);
const hex = (c: string) => new THREE.Color(c).getHex();
/** What rocks are mixed towards from the floor's stone, so they stand out on it. */
const ROCK_GREY = 0x8a8680;

export const C = {
  bone: 0xd6cab0, boneOld: 0xbcae92, dust: 0x3a322a, socket: 0x16100c,
  burlap: 0x9a8460, burlapDark: 0x857050, burlapLight: 0xa89070, rope: 0xd0b888, ropeDark: 0x8a6e48, patch: 0x5a4a3c, grain: 0xc8b890,
  oak: 0x6a4a2c, oakDark: 0x4a3220, iron: 0x46424a, oil: 0x17110c, warn: 0xb04a22,
  bark: 0x5e4834, barkDark: 0x4a3828, earth: 0x2a221a, lichen: 0x7a8466, moss: 0x3a4a2a, hanging: 0x5a6a50,
  cane: 0x847a4c, thorn: 0xe0d0a8, berry: 0x8a1818, leaf: 0x4e4a26,
  stem: 0xd4dcc4, cap: 0x3fb896, capRim: 0x1e6e58, spot: 0xe0fff4, gill: 0x6a8a78, spore: 0x9fe8b0,
  wood: 0x6e4c30, woodDark: 0x4e3622, woodLight: 0x82603c, pew: 0xa27450, pewDark: 0x80583a, pewLight: 0xb88a5c, paper: 0xd8cbaa, paperOld: 0xbfae88, leather: 0x5e2620, ink: 0x1a1a24, quill: 0xe8e4d8,
  soot: 0x241e1c, seal: 0x9a1e18, ribbon: 0x7a2a2a, rune: 0x8fd0ff, gold: 0xffd98a, blood: 0xb02a1a, shroud: 0xcfc6b0, linen: 0xa89c84,
};

/* ---------- shared pieces ---------- */

const GEO = {
  // a skull: the head, the face and the jaw in bone; the sockets and the nose in the dark
  skull: shared(joinAll([new THREE.SphereGeometry(.12, 8, 6).scale(1, .9, 1.08).translate(0, .02, 0), new THREE.BoxGeometry(.15, .07, .08).translate(0, -.045, .06), new THREE.BoxGeometry(.11, .04, .08).translate(0, -.095, .05)])),
  sockets: shared(joinAll([new THREE.SphereGeometry(.034, 6, 4).translate(-.046, 0, .107), new THREE.SphereGeometry(.034, 6, 4).translate(.046, 0, .107), new THREE.ConeGeometry(.018, .04, 3).rotateX(Math.PI).translate(0, -.045, .115)])),
  bone: shared(longBone(.4)), boneShort: shared(longBone(.27)),
  rib: shared(new THREE.TorusGeometry(.12, .013, 3, 8, Math.PI * .85).rotateY(Math.PI / 2)), spine: shared(new THREE.CylinderGeometry(.018, .018, .34, 5).rotateZ(Math.PI / 2)),
  mound: shared(new THREE.SphereGeometry(.42, 9, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .22, .9)),
  // a grave sack, its neck tied and its top ruffled
  sack: shared(rough(lathe([[0, 0], [.15, .01], [.21, .07], [.225, .15], [.2, .25], [.13, .33], [.065, .37], [.07, .4], [.13, .47], [.16, .53], [.1, .5], [0, .47]], 9), .018, 3)),
  tie: shared(new THREE.TorusGeometry(.075, .026, 4, 10).rotateX(Math.PI / 2)), sackPatch: shared(new THREE.BoxGeometry(.1, .1, .02)), grain: shared(new THREE.SphereGeometry(.018, 4, 3)),
  // an oil cask: bulging staves, hoops, a lid with its bung
  cask: shared(lathe([[0, 0], [.225, 0], [.25, .06], [.285, .2], [.29, .31], [.285, .42], [.25, .56], [.225, .62], [0, .62]], 12)),
  lid: shared(new THREE.CylinderGeometry(.2, .2, .02, 12)), bung: shared(new THREE.CylinderGeometry(.03, .03, .04, 6)), stain: shared(new THREE.BoxGeometry(.035, .22, .01)),
  puddle: shared(new THREE.CylinderGeometry(.16, .17, .012, 9)), warnRune: shared(runeStrokes(.16)),
  block: shared(new THREE.BoxGeometry(1, 1, 1)), chip: shared(new THREE.DodecahedronGeometry(.07, 0)), drum: shared(new THREE.CylinderGeometry(.14, .14, .26, 9).rotateZ(Math.PI / 2)),
  thorn: shared(new THREE.ConeGeometry(.016, .06, 4)), berry: shared(new THREE.SphereGeometry(.026, 5, 4)), leaf: shared(new THREE.TetrahedronGeometry(.045).scale(1, .3, 1.4)),
  // a glowcap's stem with its bulb, the underside of its cap
  stem: shared(new THREE.CylinderGeometry(.022, .032, 1, 6).translate(0, .5, 0)), bulb: shared(new THREE.SphereGeometry(.04, 6, 4).scale(1, .7, 1)),
  patch: shared(new THREE.SphereGeometry(.07, 6, 3).scale(1, .6, .25)),
  gills: shared(new THREE.CircleGeometry(1, 9).rotateX(Math.PI / 2)), spot: shared(new THREE.SphereGeometry(.014, 4, 3)),
  // a scroll (rolled paper), its knobs, a ribbon, a seal; a loose sheet
  scroll: shared(new THREE.CylinderGeometry(1, 1, 1, 8)), knob: shared(new THREE.CylinderGeometry(.018, .018, .05, 5)), ribbon: shared(new THREE.TorusGeometry(1, .08, 3, 10).rotateY(Math.PI / 2)),
  sealDisc: shared(new THREE.CylinderGeometry(.03, .03, .012, 7)), sheet: shared(new THREE.BoxGeometry(.26, .008, .32)),
  rune: shared(runeStrokes(.09)), smallRune: shared(runeStrokes(.07)), candle: shared(new THREE.CylinderGeometry(.03, .034, 1, 7).translate(0, .5, 0)), drip: shared(new THREE.SphereGeometry(.018, 5, 4).scale(1, 1.6, 1)),
};
function longBone(len: number) {
  const knobs = [-1, 1].flatMap(e => [-1, 1].map(s => new THREE.SphereGeometry(.033, 5, 4).translate(s * .022, e * len / 2, 0)));
  return joinAll([new THREE.CylinderGeometry(.022, .026, len, 5), ...knobs]);
}
export const put = (m: THREE.Object3D, rx = 0, ry = 0, rz = 0, s: number | [number, number, number] = 1) => {
  m.rotation.set(rx, ry, rz); if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s); return m;
};
/** A skull at (x, y, z), turned `ry` (0 faces the camera) and tipped `rx`. */
export function skull(g: THREE.Object3D, x: number, y: number, z: number, ry: number, rx = 0, s = 1, color = C.bone) {
  const k = new THREE.Group(); k.position.set(x, y, z); put(k, rx, ry, 0, s);
  mesh(k, GEO.skull, tone(color, .05)); mesh(k, GEO.sockets, tone(C.socket)); g.add(k); return k;
}
/** A long bone lying down at (x, y, z), turned `ry` about the upright. */
export const bone = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, tilt = 0, short = false, color = C.bone) =>
  put(mesh(g, short ? GEO.boneShort : GEO.bone, tone(color, .05), x, y, z), 0, ry, Math.PI / 2 + tilt);
/** A box `w` × `h` × `d` at (x, y, z). */
export const box = (g: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => put(mesh(g, GEO.block, mat, x, y, z), 0, 0, 0, [w, h, d]);

/* ---------- the objects (props.ts) ---------- */

export type ObjectLook = (R: R, len: number, look?: FloorLook) => THREE.Group;
export const OBJECT_LOOKS = {
  /** Long bones and short, a ribcage and a skull on a mound of grave dust. */
  bones(R) {
    const g = new THREE.Group();
    mesh(g, GEO.mound, tone(C.dust, .1), 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + R() * .6, r = .08 + R() * .2;
      bone(g, Math.cos(a) * r, .05 + (i % 3) * .035, Math.sin(a) * r * .8, R() * Math.PI, (R() - .5) * .4, i % 3 === 2, i % 2 ? C.bone : C.boneOld);
    }
    const cage = new THREE.Group(); cage.position.set(-.12 + R() * .1, .1, -.1); put(cage, .3, R() * 2 - 1, .35);
    mesh(cage, GEO.spine, tone(C.boneOld, .05), 0, .1, 0);
    for (let i = 0; i < 4; i++) put(mesh(cage, GEO.rib, tone(C.bone, .05), -.12 + i * .075, .1, 0), 0, 0, 0, 1 - i * .08);
    g.add(cage);
    skull(g, .14 + (R() - .5) * .1, .15, .1, (R() - .5) * 1.2, -.2);
    g.add(blob(.95)); return g;
  },
  /** Nine skulls heaped in a cairn, bones poking out at its foot. */
  skulls(R) {
    const g = new THREE.Group(), spots = [[-.16, .1, -.1], [.16, .1, -.08], [0, .1, .15], [-.15, .1, .16], [.15, .1, .17], [0, .3, 0], [-.08, .3, .1], [.1, .3, .05], [0, .48, .04]];
    mesh(g, GEO.mound, tone(C.dust, .1), 0, 0, 0).scale.set(.9, .7, .9);
    for (const [x, y, z] of spots) skull(g, x + (R() - .5) * .04, y, z, (R() - .5) * 1.1, (R() - .5) * .4, .95 + R() * .1, R() < .5 ? C.bone : C.boneOld);
    for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i - 1) * 1.1; bone(g, Math.cos(a) * .28, .04, Math.sin(a) * .26, a + Math.PI / 2 + (R() - .5) * .5, 0, true); }
    g.add(blob(1)); return g;
  },
  /** Three grave sacks of burlap, tied at the neck, one patched, one slumped over, grain spilling from it. */
  sacks(R) {
    const g = new THREE.Group(), cloth = [C.burlap, C.burlapDark, C.burlapLight];
    [[-.15, -.08, 1, 0], [.16, -.02, .9, 0], [0, .2, .78, 1]].forEach(([x, z, sc, down], i) => {
      const s = new THREE.Group(); s.position.set(x, 0, z); put(s, 0, R() * 6, 0, sc);
      if (down) { s.rotation.set(0, R() * .6 - .3 + Math.PI / 2, -1.3); s.position.y = .17 * sc; }
      mesh(s, GEO.sack, tone(cloth[i], .1)); mesh(s, GEO.tie, tone(C.rope, .08), 0, .375, 0);
      put(mesh(s, GEO.knob, tone(C.ropeDark), .06, .33, .06), .5, 0, .6, [1, 2.2, 1]); // (the rope's end)
      if (i === 0) put(mesh(s, GEO.sackPatch, tone(C.patch, .1), 0, .2, .205), -.15);
      g.add(s);
    });
    for (let i = 0; i < 6; i++) mesh(g, GEO.grain, tone(C.grain), .3 + R() * .15 - (i % 3) * .05, .015, .25 + R() * .15);
    g.add(blob(1)); return g;
  },
  /** An oil cask: bulging staves, iron hoops, a bunged lid, oil run down its side and pooled at its foot, and a rune of
      fire daubed on it in red (it burns: a bolt spills it). */
  cask(R) {
    const g = new THREE.Group();
    mesh(g, GEO.cask, tone(C.oak, .14)); mesh(g, GEO.lid, tone(C.oakDark, .1), 0, .615, 0); mesh(g, GEO.bung, tone(C.oakDark), .09, .64, .05);
    for (const [y, r] of [[.06, .252], [.2, .287], [.42, .287], [.56, .252]]) put(mesh(g, new THREE.TorusGeometry(r, .016, 4, 16), tone(C.iron, 0, .4), 0, y, 0), Math.PI / 2);
    put(mesh(g, GEO.warnRune, tone(C.warn), 0, .31, .292), -.05);
    mesh(g, GEO.stain, tone(C.oil), .16, .5, .22).lookAt(.16 * 3, .5, .22 * 3);
    mesh(g, GEO.puddle, tone(C.oil), .12, .006, .28);
    g.rotation.y = (R() - .5) * .8; g.add(blob(.9)); return g;
  },
  /** Fallen stones of the walls: dressed blocks tumbled over each other, chips, now and then a column's drum, dust. */
  rubble(R, _len, look) {
    const g = new THREE.Group(), st = stoneOf(look, 1.15);
    mesh(g, GEO.mound, tone(C.dust, .1), 0, 0, 0).scale.set(1.1, .6, 1);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + R(), r = i === 4 ? .02 : .16 + R() * .22, w = .2 + R() * .14, h = .08 + R() * .05, d = w * (.6 + R() * .4);
      put(box(g, w, h, d, tone(shade(st, .95 + R() * .35), .1), Math.cos(a) * r, i === 4 ? .12 : .05, Math.sin(a) * r), (R() - .5) * .4, R() * 3, (R() - .5) * .4, [w, h, d]); // (low: rubble is walked round, not a rock)
    }
    if (R() < .4) put(mesh(g, GEO.drum, tone(shade(st, 1.3), .08), .2, .14, .18), 0, R() * 3, 0);
    for (let i = 0; i < 7; i++) put(mesh(g, GEO.chip, tone(shade(st, .8 + R() * .3), .1), (R() - .5) * .8, .03, (R() - .5) * .75), R() * 3, R() * 3, 0, .6 + R() * .7);
    g.add(blob(1.1)); return g;
  },
  /** Grave roots: thick roots come down out of the ceiling's dark, gnarled and tapering, and burrow into the floor
      through broken flags and earth; thin rootlets hang from them. */
  roots(R, _len, look) {
    const g = new THREE.Group();
    mesh(g, GEO.mound, tone(C.earth, .1), 0, 0, 0).scale.set(1, .5, 1);
    for (let i = 0; i < 3; i++) { const a = R() * 6; put(box(g, .26, .05, .2, tone(stoneOf(look, 1.1), .1), Math.cos(a) * .32, .04, Math.sin(a) * .3), .3, a, .2, [.26, .05, .2]); }
    for (let i = 0; i < 4; i++) { // (each root's own curve: built here, joined into the one mesh by mergeStill)
      const a = i / 4 * Math.PI * 2 + R() * .8, r0 = .08 + R() * .18, x0 = Math.cos(a) * r0, z0 = Math.sin(a) * r0;
      const c = curve([[x0 * .3, 1.6, z0 * .3], [x0 * 1.3, 1.05, z0 * 1.3], [x0 * 1.1 + .05, .45, z0 * 1.1], [x0 * 1.9, .02, z0 * 1.9], [x0 * 2.2, -.05, z0 * 2.2]]);
      mesh(g, taperTube(c, 12, .1 + R() * .04, .03), tone(i % 2 ? C.bark : C.barkDark, .14));
      const p = c.getPointAt(.35 + R() * .2), d = new THREE.Vector3(Math.cos(a + 1.2) * .2, -.35, Math.sin(a + 1.2) * .2);
      mesh(g, taperTube(curve([[p.x, p.y, p.z], [p.x + d.x * .5, p.y + d.y * .4, p.z + d.z * .5], [p.x + d.x, p.y + d.y, p.z + d.z]]), 5, .025, .006, 4), tone(C.bark, .1));
    }
    g.add(blob(1)); return g;
  },
  /** A thorn briar: arching canes, pale thorns along them, a few withered leaves and dark red berries (it stings). */
  briar(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = R() * Math.PI * 2, b = a + 1.5 + R() * 1.5, h = .22 + R() * .2;
      const c = curve([[Math.cos(a) * .42, .02, Math.sin(a) * .4], [Math.cos(a) * .15, h, Math.sin(a) * .15], [Math.cos(b) * .15, h * .9, Math.sin(b) * .15], [Math.cos(b) * .44, .03, Math.sin(b) * .4]]);
      mesh(g, taperTube(c, 10, .026, .012, 4), tone(C.cane, .12));
      for (let k = 0; k < 5; k++) { const p = c.getPointAt(.1 + k * .2); put(mesh(g, GEO.thorn, tone(C.thorn), p.x, p.y, p.z), R() * 3, R() * 3, R() * 3); }
      const q = c.getPointAt(.3 + R() * .4); mesh(g, GEO.leaf, tone(C.leaf, .1), q.x, q.y + .02, q.z).rotation.y = R() * 6;
    }
    for (let i = 0; i < 6; i++) { const a = R() * 6, r = .1 + R() * .25; mesh(g, GEO.berry, tone(C.berry), Math.cos(a) * r, .12 + R() * .15, Math.sin(a) * r); }
    g.add(blob(.9)); return g;
  },
  /** A cobweb: an orb web drawn in single threads (pixel art), strung to the floor by its guy lines, facing the camera,
      its spider at the hub. */
  web() {
    const g = new THREE.Group(), m = new THREE.Mesh(WEB_PLANE, webMaterial()); m.position.y = .5; m.rotation.x = -Math.PI / 4;
    g.add(m); return g;
  },
  /** Glowcaps: pale stems, caps that glow sea-green, their rims darker, pale spots on them, and spores rising slowly. */
  glowcap(R) {
    const g = new THREE.Group(), specs: FlameSpec[] = [];
    const sizes = [[.24, .16], [.15, .11], [.13, .095], [.06, .06], [.05, .05]], spots = [[0, 0], [.2, .1], [-.18, .12], [.12, -.16], [-.1, -.14]];
    for (let i = 0; i < 5; i++) {
      const [h, r] = sizes[i].map(v => v * (.9 + R() * .2)), x = spots[i][0] + (R() - .5) * .06, z = spots[i][1] + (R() - .5) * .06, lean = i ? (R() - .5) * .5 : 0;
      const one = new THREE.Group(); one.position.set(x, 0, z); one.rotation.z = lean;
      put(mesh(one, GEO.stem, tone(C.stem, .06)), 0, 0, 0, [1.5, h, 1.5]); mesh(one, GEO.bulb, tone(C.stem, .06), 0, .02, 0);
      mesh(one, capTop(r), glowTone(C.cap), 0, h, 0); mesh(one, capRim(r), glowTone(C.capRim), 0, h, 0);
      put(mesh(one, GEO.gills, tone(C.gill), 0, h + .002, 0), 0, 0, 0, [r * .92, 1, r * .92]);
      for (let k = 0; k < 3; k++) { const b = R() * 6, d = r * (.2 + R() * .35); mesh(one, GEO.spot, glowTone(C.spot), Math.cos(b) * d, h + r * .58 - d * .2, Math.sin(b) * d); }
      g.add(one); specs.push({ x, y: h + r * .5, z, h: r, w: r * 2 });
    }
    const spores = makeMotes(specs, C.spore, 10, .7, .3), gl = glow(0x6fe8c0, 1.2, .55); gl.position.y = .3;
    g.add(spores, gl);
    g.userData.parts = { spores }; // (kept apart: it moves by itself)
    return g;
  },
  /** A scribe's sloped desk: legs and stretchers, a ledge along its foot, an open book on it with a rune glowing on its
      page, a shelf at its head with an inkpot, a quill and a candle stub, and scrolls on a board below. */
  desk(R, _len, look) {
    const g = new THREE.Group(), wood = tone(C.wood, .08), dark = tone(C.woodDark, .08);
    const top = new THREE.Group(); top.position.y = .64; top.rotation.x = .3; g.add(top);
    box(top, .82, .04, .5, tone(C.woodLight, .08), 0, 0, 0); box(top, .82, .05, .03, dark, 0, .03, .25);
    const book = new THREE.Group(); book.position.set(-.06, .03, .02); top.add(book);
    box(book, .46, .012, .31, tone(C.leather, .08), 0, 0, 0);
    put(box(book, .2, .025, .28, tone(C.paper, .04), -.11, .016, 0), 0, 0, .06, [.2, .025, .28]); put(box(book, .2, .025, .28, tone(C.paper, .04), .11, .016, 0), 0, 0, -.06, [.2, .025, .28]);
    put(mesh(book, GEO.rune, glowTone(C.rune), .11, .033, 0), -Math.PI / 2, 0, -.06);
    for (const [x, z, h] of [[-.36, .2, .57], [.36, .2, .57], [-.36, -.2, .72], [.36, -.2, .72]]) box(g, .05, h, .05, dark, x, h / 2, z);
    box(g, .86, .03, .15, wood, 0, .74, -.3);
    for (const z of [-.2, .2]) box(g, .72, .04, .04, dark, 0, .12, z);
    box(g, .72, .02, .4, wood, 0, .15, 0);
    for (const x of [-.12, .12]) put(mesh(g, GEO.scroll, tone(C.paperOld, .06), x, .19, (R() - .5) * .1), 0, R() - .5, Math.PI / 2, [.04, .34, .04]);
    mesh(g, GEO.scroll, tone(C.ink), .26, .785, -.3).scale.set(.04, .06, .04);
    put(mesh(g, GEO.thorn, tone(C.quill), .24, .88, -.3), 0, 0, .35, [1.2, 3.4, .5]);
    const wax = look?.torch.wax ? waxFor(look.torch.wax) : MAT.wax;
    put(mesh(g, GEO.candle, wax, -.28, .755, -.3), 0, 0, 0, [1, .08, 1]); mesh(g, GEO.drip, wax, -.25, .79, -.28);
    g.add(blob(1)); g.rotation.y = (R() - .5) * .3; return g;
  },
  /** A heap of scrolls: rolled ones, some on knobbed rods, some tied with ribbon or sealed in red wax, loose sheets. */
  scrolls(R) {
    const g = new THREE.Group();
    for (const [x, z, a] of [[-.08, .02, .3], [.1, -.06, -.4]]) put(box(g, .3, .07, .22, tone(C.leather, .08), x, .035, z), 0, a, 0, [.3, .07, .22]); // (books under the heap)
    for (let i = 0; i < 9; i++) {
      const r = .038 + R() * .014, len = .28 + R() * .1, s = new THREE.Group();
      s.position.set((R() - .5) * (.42 - Math.floor(i / 4) * .12), .08 + Math.floor(i / 3) * .065 + (i % 2) * .01, (R() - .5) * (.42 - Math.floor(i / 4) * .12)); put(s, 0, R() * 6, Math.PI / 2);
      put(mesh(s, GEO.scroll, tone(i % 3 ? C.paper : C.paperOld, .06)), 0, 0, 0, [r, len, r]);
      if (R() < .4) for (const e of [-1, 1]) mesh(s, GEO.knob, tone(C.woodDark), 0, e * (len / 2 + .02), 0);
      if (R() < .4) put(mesh(s, GEO.ribbon, tone(C.ribbon)), 0, 0, Math.PI / 2, r + .004);
      else if (R() < .3) put(mesh(s, GEO.sealDisc, tone(C.seal), r, 0, 0), 0, 0, Math.PI / 2);
      g.add(s);
    }
    for (let i = 0; i < 3; i++) { const a = R() * 6; put(mesh(g, GEO.sheet, tone(C.paperOld, .05), Math.cos(a) * .36, .006 + i * .003, Math.sin(a) * .34), (R() - .5) * .1, R() * 6, (R() - .5) * .1); }
    g.add(blob(.9)); return g;
  },
  /** A pew facing north, towards where a chapel's altar would stand: a seat on carved ends (a finial on each), a back
      with a rail and a ledge behind it for books, a kneeler in front. `len` tiles long. */
  pew(R, len) {
    const g = new THREE.Group(), L = len - .12, wood = tone(C.pew, .08), dark = tone(C.pewDark, .08);
    box(g, L, .05, .42, tone(C.pewLight, .08), 0, .38, -.03); box(g, L, .06, .02, dark, 0, .33, -.24);
    box(g, L, .34, .035, wood, 0, .62, .19); box(g, L + .02, .05, .09, dark, 0, .81, .19); box(g, L, .02, .08, wood, 0, .66, .25);
    box(g, L, .06, .1, dark, 0, .07, -.36);
    for (const x of [-L / 2 + .03, L / 2 - .03]) mesh(g, PEW_END, tone(C.pewDark, .1), x, 0, 0);
    for (let i = 0; i < len; i++) if (R() < .5) { const x = -L / 2 + .3 + i * (L - .6) / Math.max(1, len - 1) + (R() - .5) * .2; box(g, .07, .12, .1, tone(R() < .5 ? C.leather : C.woodDark, .06), x, .73, .26); }
    const sh = blob(1); sh.scale.set(len, 1, .9); g.add(sh);
    return g;
  },
  /** A heap of old offerings (M4.1, the Gilded Treasury): obols in a spill, a cup, a dish on its edge, a candlestick
      lying down, a little casket; a glyph's blast scatters it into obols. */
  hoard(R) {
    const g = new THREE.Group(), gold = tone(0xc8a04a, .12, .55), dark = tone(0x8a6a2a, .1, .5), coin = tone(0xd8b050, .08, .6);
    mesh(g, new THREE.ConeGeometry(.36, .2, 9), dark, 0, .1, 0);
    for (let i = 0; i < 16; i++) { const a = R() * Math.PI * 2, r = R() * .34; put(mesh(g, GEO.sealDisc, coin, Math.cos(a) * r, .2 - r * .5 + R() * .03, Math.sin(a) * r), R() * .8 - .4, 0, R() * .8 - .4, [2.6, 1.4, 2.6]); }
    mesh(g, new THREE.CylinderGeometry(.07, .04, .12, 8), gold, .12, .26, -.05); mesh(g, new THREE.CylinderGeometry(.015, .015, .08, 5), gold, .12, .16, -.05);
    put(mesh(g, new THREE.CylinderGeometry(.14, .14, .02, 12), gold, -.14, .2, -.06), 1.1, 0, .2);
    put(mesh(g, new THREE.CylinderGeometry(.02, .03, .3, 6), gold, .05, .1, .22), 0, .4, Math.PI / 2 - .2);
    box(g, .16, .1, .11, tone(0x5a2a1a, .1), -.2, .08, .16); box(g, .17, .02, .12, gold, -.2, .14, .16);
    put(mesh(g, new THREE.OctahedronGeometry(.03, 0), glowTone(0xff5a4a)), 0, 0, 0).position.set(-.2, .17, .16);
    g.add(glowShared(0xffd27a, .7, .28)); g.children[g.children.length - 1].position.y = .3;
    const sh = blob(.9); g.add(sh);
    return g;
  },
  /** A ferry skiff moored along the floor (M4.1, the Ferry Landing), `len` tiles long: a tarred hull, its thwarts, an oar
      shipped along it, its rope to the landing. It burns. */
  boat(_R, len) {
    const g = new THREE.Group(), L = len - .05, W = .62, tar = tone(0x1a1410, .1), plank = tone(0x7a6040, .1), rim = tone(0x8a6a44, .08), hold = tone(0x0e0a08), rope = tone(C.rope, .06);
    mesh(g, boatHull(L, W, .12), tar, 0, .02, 0);                  // the tarred hull's bottom, pointed at both ends
    mesh(g, boatHull(L, W, .2, .07), tar, 0, .14, 0);              // its sides, open above
    mesh(g, boatHull(L * 1.01, W * 1.02, .03, .06), rim, 0, .34, 0); // its gunwale, pale against the tar
    mesh(g, boatHull(L * .96, W * .9, .01), hold, 0, .14, 0);      // the dark of the hold inside it
    mesh(g, boatHull(L * .72, W * .5, .02), plank, 0, .15, 0);     // the boards down in its bottom
    for (let i = 0; i < Math.max(1, len); i++) box(g, .07, .04, W * .82, plank, -L / 2 + (i + .5) * L / Math.max(1, len) * .8 + L * .1, .3, 0); // thwarts across
    put(mesh(g, new THREE.CylinderGeometry(.018, .018, L * .75, 5), tone(C.woodLight, .08), 0, .36, .12), 0, 0, Math.PI / 2 + .05);
    put(mesh(g, new THREE.TorusGeometry(.06, .015, 4, 10), rope, L / 2 + .02, .2, 0), Math.PI / 2 - .3, 0, 0);
    const sh = blob(1); sh.scale.set(len * .9, 1, .8); g.add(sh);
    return g;
  },
  /** A rope bridge over a chasm (M4.2, from the Eda lore), `len` tiles long along x: planks laid across two ropes, a rope
      rail each side sagging between posts that stand on the ledges at its ends, hangers down to the deck. It burns. */
  bridge(R, len) {
    const g = new THREE.Group(), L = len, plank = tone(0x735a3c, .12), old = tone(0x5a4630, .12), rope = tone(C.rope, .06), post = tone(0x4e3a28, .1);
    const n = Math.max(3, Math.round(L / .21));
    for (let i = 0; i < n; i++) { // the planks, a little uneven, now and then a dark old one
      const x = -L / 2 + (i + .5) * L / n;
      put(box(g, .15, .04, .84 + (R() - .5) * .08, R() < .25 ? old : plank, x, .045, (R() - .5) * .04), 0, (R() - .5) * .1, (R() - .5) * .05, [.15, .04, .84]);
    }
    for (const z of [-.3, .3]) put(mesh(g, GEO.scroll, rope, 0, .02, z), 0, 0, Math.PI / 2, [.018, L + .1, .018]); // (the ropes under the deck)
    for (const z of [-.45, .45]) {
      for (const x of [-L / 2 - .04, L / 2 + .04]) { mesh(g, GEO.stem, post, x, 0, z).scale.set(1.6, .72, 1.6); mesh(g, GEO.knob, post, x, .74, z).scale.setScalar(1.8); }
      g.add(new THREE.Mesh(taperTube(curve([[-L / 2 - .04, .66, z], [-L / 4, .5, z], [0, .45, z], [L / 4, .5, z], [L / 2 + .04, .66, z]]), 12, .017, .017, 4), rope));
      for (let x = -L / 2 + .45; x < L / 2 - .3; x += .5) { const y = .45 + .21 * (2 * x / L) ** 2; put(mesh(g, GEO.scroll, rope, x, (y + .06) / 2, z), 0, 0, 0, [.008, y - .06, .008]); } // (hangers, rail to deck)
    }
    return g;
  },
} satisfies Record<string, ObjectLook>;

/** A boat's hull `l` long and `w` wide, pointed at both ends, `h` deep, lying on the floor (its top at `h`); with `wall`,
    only a ring that thick, open in the middle. */
function boatHull(l: number, w: number, h: number, wall = 0) {
  const lens = <T extends THREE.Path>(o: T, l: number, w: number) => {
    o.moveTo(-l / 2, 0);
    o.quadraticCurveTo(-l * .32, w / 2, 0, w / 2); o.quadraticCurveTo(l * .32, w / 2, l / 2, 0);
    o.quadraticCurveTo(l * .32, -w / 2, 0, -w / 2); o.quadraticCurveTo(-l * .32, -w / 2, -l / 2, 0);
    return o;
  };
  const o = lens(new THREE.Shape(), l, w);
  if (wall) o.holes.push(lens(new THREE.Path(), l - wall * 4, w - wall * 2));
  return new THREE.ExtrudeGeometry(o, { depth: h, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2);
}

/** A cap's top and its rim, `r` across: two glowing colours. */
const capTop = (r: number) => lathe([[r * .76, r * .4], [r * .45, r * .56], [0, r * .62]], 8);
const capRim = (r: number) => lathe([[r * .92, 0], [r, r * .12], [r * .76, r * .4]], 8);

/** A pew's end: a board with a rounded arm to the north and a post rising to a finial at its back (south). */
const PEW_END = shared((() => {
  const s = new THREE.Shape(); // (x is -z, y is up: the back, to the south, at x = -.25)
  s.moveTo(-.25, 0); s.lineTo(.25, 0); s.lineTo(.25, .42); s.quadraticCurveTo(.25, .5, .17, .5); s.lineTo(-.15, .58); s.lineTo(-.15, .84);
  s.lineTo(-.2, .92); s.lineTo(-.25, .84); s.lineTo(-.25, 0);
  return new THREE.ExtrudeGeometry(s, { depth: .06, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-.03, 0, 0);
})());

const WEB_PLANE = shared(new THREE.PlaneGeometry(1.3, 1.3));
let webMat: THREE.MeshBasicMaterial | null = null;
/** The cobweb, drawn texel by texel at the room kit's size: spokes from a hub, a spiral sagging between them, guy lines
    to the floor, dew on a few threads and the spider. */
function webMaterial() {
  if (webMat) return webMat;
  const N = 64, img = new ImageData(N, N), d = img.data;
  const px = (x: number, y: number, c: number[], a: number) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.max(d[i + 3], a); };
  const line = (x0: number, y0: number, x1: number, y1: number, a: number) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) px(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, THREAD, a); };
  const THREAD = [232, 232, 240], cx = 32, cy = 28, spokes = 12, ang: number[] = [], len: number[] = [];
  for (let i = 0; i < spokes; i++) { ang.push(i / spokes * Math.PI * 2 + Math.sin(i * 3.1) * .12); len.push(22 + Math.sin(i * 1.7) * 3); }
  for (let i = 0; i < spokes; i++) line(cx, cy, cx + Math.cos(ang[i]) * len[i], cy + Math.sin(ang[i]) * len[i], 210);
  for (let r = 4; r < 22; r += 3.3) for (let i = 0; i < spokes; i++) { // the spiral: a sag between each pair of spokes
    const j = (i + 1) % spokes, a = Math.min(r, len[i]), b = Math.min(r, len[j]);
    const x0 = cx + Math.cos(ang[i]) * a, y0 = cy + Math.sin(ang[i]) * a, x1 = cx + Math.cos(ang[j]) * b, y1 = cy + Math.sin(ang[j]) * b;
    const mx = (x0 + x1) / 2 - (x0 + x1 - 2 * cx) * .06, my = (y0 + y1) / 2 - (y0 + y1 - 2 * cy) * .06;
    line(x0, y0, mx, my, 170); line(mx, my, x1, y1, 170);
  }
  for (const [i, x, y] of [[2, 58, 63], [5, 6, 63], [8, 4, 2], [10, 60, 3]]) line(cx + Math.cos(ang[i]) * len[i], cy + Math.sin(ang[i]) * len[i], x, y, 150); // guy lines
  for (const [x, y] of [[20, 20], [43, 33], [27, 41], [40, 16], [15, 32]]) { px(x, y, [255, 255, 255], 255); px(x + 1, y, [200, 220, 235], 230); } // dew
  const body = [40, 28, 26], mark = [170, 40, 30];
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, -1], [1, -1], [-1, 0], [2, 0], [0, 2], [1, 2], [0, -2], [1, -2]]) px(cx + x, cy + 2 + y, body, 255);
  px(cx, cy + 2, mark, 255); px(cx + 1, cy + 3, mark, 255);
  for (const [dx, dy] of [[-3, -3], [4, -3], [-3, 1], [4, 1], [-3, 4], [4, 4], [-2, -4], [3, -4]]) { // its legs
    const n = Math.max(Math.abs(dx), Math.abs(dy)), x0 = cx + (dx > 0 ? 1 : 0);
    for (let k = 1; k <= n; k++) px(x0 + (cx + dx - x0) * k / n, cy + 2 + dy * k / n, body, 255);
  }
  const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d')!.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.magFilter = map.minFilter = THREE.NearestFilter; map.generateMipmaps = false;
  return webMat = markShared(new THREE.MeshBasicMaterial({ map, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
}

/** The dead tree (a mechanism: it burns, long): a gnarled trunk flaring into roots that grip the floor, branches forking
    into twigs, lichen on the bark and grey moss hanging from the boughs. */
export function treeLook(R: R) {
  const g = new THREE.Group(), bark = tone(C.bark, .14), dark = tone(C.barkDark, .14);
  mesh(g, rough(lathe([[.3, 0], [.22, .1], [.17, .3], [.15, .7], [.13, 1.1], [.1, 1.45], [.07, 1.7], [0, 1.76]], 7), .035, R() * 9), bark);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + R() * .5;
    mesh(g, taperTube(curve([[Math.cos(a) * .1, .28, Math.sin(a) * .1], [Math.cos(a) * .32, .08, Math.sin(a) * .3], [Math.cos(a) * .55, -.02, Math.sin(a) * .5]]), 6, .08, .02, 5), dark);
  }
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + R() * .8, h = .85 + i * .15 + R() * .1, len = .45 + R() * .45;
    const c = curve([[Math.cos(a) * .06, h, Math.sin(a) * .06], [Math.cos(a) * len * .5, h + .22, Math.sin(a) * len * .5], [Math.cos(a) * len, h + .3 + R() * .3, Math.sin(a) * len]]);
    mesh(g, taperTube(c, 7, .065, .012, 5), i % 2 ? bark : dark);
    const p = c.getPointAt(.55), b = a + (R() < .5 ? .9 : -.9);
    mesh(g, taperTube(curve([[p.x, p.y, p.z], [p.x + Math.cos(b) * .15, p.y + .15, p.z + Math.sin(b) * .15], [p.x + Math.cos(b) * .28, p.y + .32, p.z + Math.sin(b) * .28]]), 4, .025, .006, 4), bark);
    if (i % 2 === 0) put(mesh(g, GEO.thorn, tone(C.hanging, .1), p.x, p.y - .18, p.z), Math.PI, 0, 0, [1.6, 5, 1.2]);
  }
  for (const [y, a, r] of [[.4, .9, .17], [.95, 2.2, .145], [1.3, 1.4, .115]]) mesh(g, GEO.patch, tone(C.lichen, .1), Math.cos(a) * r, y, Math.sin(a) * r).lookAt(Math.cos(a) * 3, y, Math.sin(a) * 3);
  g.add(blob(1.2)); g.userData.kit = true; return g;
}

/* ---------- the room's pieces (rooms.ts, items/artifacts.ts) ---------- */

/** A rock (`#`): a rough boulder and a stone or two beside it, in the floor's stone: mossy on the drowned floor, sooty
    on the burning one, lichen now and then in the crypt. A fungal grotto's are dripstone: stalagmites, wet at the tip. */
export function rockLook(R: R, look: FloorLook | undefined, dripstone: boolean) {
  const g = new THREE.Group(), stains = look?.wall.stains ?? 'none';
  const st = new THREE.Color(stoneOf(look, 1.3)).lerp(new THREE.Color(ROCK_GREY), stains === 'soot' ? .75 : .4).getHex(); // (greyer than the floor, so a rock stands out on it; ash-grey where it burns)
  if (dripstone) {
    [[0, 0, 1 + R() * .5, .3], [R() * .4 - .2, .25, .45 + R() * .3, .16], [.25, R() * .3 - .2, .3 + R() * .2, .12]].forEach(([x, z, h, r], i) => {
      mesh(g, rough(lathe([[r, 0], [r * .85, h * .18], [r * .62, h * .42], [r * .48, h * .6], [r * .28, h * .82], [r * .08, h], [0, h]], 7), .02, i + R()), tone(shade(st, 1.15), .12), x, 0, z);
      if (i === 0) mesh(g, GEO.spot, glowTone(0x8fe8d0), x, h + .01, z).scale.setScalar(1.6);
    });
    g.add(blob(1.2)); return g;
  }
  put(mesh(g, rough(new THREE.IcosahedronGeometry(.42, 0), .1, R() * 9), tone(st, .14), 0, .25, 0), 0, R() * 6, 0, [1.05, .7 + R() * .15, .95]);
  put(mesh(g, rough(new THREE.IcosahedronGeometry(.2, 0), .05, R() * 9), tone(shade(st, 1.12), .14), (R() - .5) * .2, .5, (R() - .5) * .15), R() * 3, R() * 3, 0, [1, .75, 1]);
  put(mesh(g, rough(new THREE.IcosahedronGeometry(.16, 0), .03, R() * 9), tone(shade(st, .9), .12), R() * .5 - .25, .1, .32), R() * 3, R() * 3, 0);
  if (R() < .5) put(mesh(g, rough(new THREE.IcosahedronGeometry(.1, 0), .02, R() * 9), tone(shade(st, 1.1), .12), .34, .06, R() * .3 - .1), R() * 3, R() * 3, 0);
  const patches = stains === 'moss' || stains === 'soot' ? 4 : R() < .5 ? 2 : 0, color = stains === 'moss' ? C.moss : stains === 'soot' ? C.soot : C.lichen;
  for (let i = 0; i < patches; i++) { const a = R() * 6, r = .1 + R() * .15; put(mesh(g, GEO.mound, tone(color, .1), Math.cos(a) * r, .44 - r * .6, Math.sin(a) * r), 0, 0, 0, [.25 + R() * .15, .15, .22]); }
  g.add(blob(1.3)); return g;
}

/** A pillar (`i`): a stepped plinth, a shaft of ten faces with a band of runes carved round it, a cushion capital; or
    broken off partway, its top jagged and a drum fallen beside it (`broken`). In the floor's stone: a water line of algae
    on the drowned floor, the shaft blackened by soot above on the burning one. */
export function pillarLook(R: R, look: FloorLook | undefined, broken: boolean, shaft: number) {
  const g = new THREE.Group(), st = stoneOf(look, 1.7), dark = tone(shade(st, .75), .1), light = tone(shade(st, 1.12), .08), stains = look?.wall.stains ?? 'none';
  box(g, .86, .12, .86, dark, 0, .06, 0); box(g, .72, .1, .72, tone(st, .08), 0, .17, 0);
  mesh(g, new THREE.CylinderGeometry(.31, .34, .07, 10), light, 0, .255, 0);
  mesh(g, new THREE.CylinderGeometry(.25, .28, shaft, 10), tone(st, .1), 0, .29 + shaft / 2, 0);
  const band = .29 + Math.min(shaft * .55, .78), carve = tone(shade(st, .5));
  for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i - 1) * .7, r = .27 - .03 * (band - .29) / shaft; put(mesh(g, GEO.smallRune, carve, Math.cos(a) * r, band, Math.sin(a) * r), 0, Math.PI / 2 - a, 0, 1.3); }
  for (const y of [band - .1, band + .1]) mesh(g, new THREE.TorusGeometry(.27 - .03 * (y - .29) / shaft, .012, 3, 20).rotateX(Math.PI / 2), carve, 0, y, 0);
  const top = .29 + shaft;
  if (broken) {
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + R(); put(mesh(g, GEO.chip, tone(st, .12), Math.cos(a) * .15, top + .02, Math.sin(a) * .15), R() * 3, R() * 3, 0, 1.3 + R()); }
    const a = R() * Math.PI * 2; put(mesh(g, GEO.drum, tone(st, .1), Math.cos(a) * .52, .14, Math.sin(a) * .5), 0, a + Math.PI / 2, 0, [1, 1, 1]);
    for (let i = 0; i < 3; i++) put(mesh(g, GEO.chip, tone(shade(st, .9), .1), Math.cos(a + i) * .45, .03, Math.sin(a + i) * .42), R() * 3, R() * 3, 0, .7);
  } else {
    mesh(g, new THREE.CylinderGeometry(.34, .26, .1, 10), light, 0, top + .05, 0);
    put(mesh(g, new THREE.CylinderGeometry(.34, .5, .12, 4), tone(st, .08), 0, top + .16, 0), 0, Math.PI / 4, 0); // (bevelled: its faces catch the light from above)
  }
  if (stains === 'moss') { mesh(g, new THREE.CylinderGeometry(.285, .292, .24, 10), tone(C.moss, .12), 0, .41, 0); for (let i = 0; i < 2; i++) { const a = R() * 6; put(mesh(g, GEO.mound, tone(C.moss, .1), Math.cos(a) * .36, .22, Math.sin(a) * .36), 0, 0, 0, [.25, .2, .2]); } }
  if (stains === 'soot' && shaft > .9) mesh(g, new THREE.CylinderGeometry(.254, .262, shaft * .4, 10), tone(0x2a2220, .1), 0, top - shaft * .2, 0);
  g.add(blob(1.25)); return g;
}

/** A tomb (`=`) `long` along x and `wide` across, standing on the floor: a plinth, a chest with panels along its sides,
    a bevelled lid, and on the longer ones an effigy lying on the lid (head on a pillow, hands folded on a sword), on the
    others a sword carved on it; cold candle stubs at its head now and then. An embalmers' slab (`slab`) is a stone table
    with someone under a shroud on it, bound in linen, a bowl and a jar at its foot. */
export function tombLook(R: R, long: number, wide: number, look: FloorLook | undefined, slab: boolean) {
  const g = new THREE.Group(), st = stoneOf(look, 1.25), lidC = stoneOf(look, 1.45), fig = tone(stoneOf(look, 2.1), .06), dark = tone(shade(st, .7), .1);
  const wax = look?.torch.wax ? waxFor(look.torch.wax) : MAT.wax;
  if (slab) {
    box(g, long, .08, wide, tone(lidC, .08), 0, .5, 0);
    for (const x of [-long / 2 + .25, long / 2 - .25]) box(g, .3, .46, wide - .2, dark, x, .23, 0);
    for (let n = Math.max(1, Math.floor(long / 1.6)), i = 0; i < n; i++) { // one under each shroud, a body's length apart
      const body = Math.max(.2, Math.min(1, long / n - .7)), x = -long / 2 + (i + .5) * long / n;
      put(mesh(g, new THREE.CapsuleGeometry(.17, body, 4, 8), tone(C.shroud, .05), x, .66, 0), 0, 0, Math.PI / 2, [1, 1, .75]);
      mesh(g, new THREE.SphereGeometry(.14, 7, 5), tone(C.shroud, .05), x - body / 2 - .08, .7, 0).scale.set(1, .9, .8);
      for (const k of [-.3, 0, .3]) put(mesh(g, new THREE.TorusGeometry(.175, .014, 3, 12), tone(C.linen), x + k * body, .66, 0), 0, Math.PI / 2, 0, [.78, 1, 1]); // (squashed across, as the body is)
    }
    const fx = long / 2 - .14;
    mesh(g, lathe([[0, 0], [.07, .005], [.09, .04], [.085, .05]], 8), tone(0x7a6a58, .06), fx, .54, wide / 2 - .14);
    mesh(g, GEO.scroll, tone(0x6a5a48, .06), fx - .02, .6, -wide / 2 + .14).scale.set(.05, .12, .05);
    mesh(g, GEO.puddle, tone(0x3a1a14), -fx + .1, .545, wide / 2 - .16).scale.set(.6, 1, .5);
    const shadow = blob(1); shadow.scale.set(long + .6, 1, wide + .6); g.add(shadow); return g;
  }
  box(g, long + .08, .1, wide + .08, dark, 0, .05, 0);
  box(g, long, .34, wide, tone(st, .1), 0, .27, 0);
  const n = Math.max(1, Math.round(long / .5)), pw = long / n - .1, panel = tone(shade(st, .82), .06);
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) box(g, pw, .2, .02, panel, -long / 2 + (i + .5) * long / n, .28, s * (wide / 2 + .005));
  box(g, long + .06, .07, wide + .06, tone(lidC, .08), 0, .475, 0); box(g, long - .06, .04, wide - .12, tone(lidC, .08), 0, .53, 0);
  const hx = -long / 2 + .24;
  if (long >= 1.6 && R() < .7) for (let n = Math.floor((long + .1) / 1.75), i = 0; i < n; i++) { // effigies, heads to the tomb's head end
    const Lb = Math.min(long / n - .62, 1.2), x0 = hx + i * long / n;
    box(g, .16, .05, .3, fig, x0, .575, 0); mesh(g, new THREE.SphereGeometry(.1, 7, 5), fig, x0 + .04, .65, 0);
    put(mesh(g, new THREE.CylinderGeometry(.17, .08, Lb, 6), fig, x0 + .12 + Lb / 2, .61, 0), 0, 0, Math.PI / 2, [.7, 1, 1]); // (flattened: lying down, broad at the shoulders)
    box(g, .1, .08, .38, fig, x0 + .2, .62, 0); // (the shoulders)
    mesh(g, new THREE.SphereGeometry(.045, 5, 4), fig, x0 + .34, .68, 0);
    box(g, Lb * .55, .014, .035, fig, x0 + .34 + Lb * .28, .675, 0); box(g, .025, .014, .15, fig, x0 + .36, .68, 0);
    for (const z of [-.05, .05]) box(g, .05, .09, .06, fig, x0 + .14 + Lb, .66, z);
  } else { // a sword carved on the lid
    const Ls = long * .5; box(g, Ls, .015, .04, fig, hx + .12 + Ls / 2, .557, 0); box(g, .03, .015, .16, fig, hx + .12, .557, 0); box(g, .07, .015, .03, fig, hx + .06, .557, 0);
  }
  if (R() < .4) for (const s of [-1, 1]) { mesh(g, GEO.candle, wax, -long / 2 + .09, .555, s * (wide / 2 - .07)).scale.set(1, .1, 1); mesh(g, GEO.drip, wax, -long / 2 + .12, .58, s * (wide / 2 - .05)); }
  if (look?.wall.stains === 'moss') for (let i = 0; i < 3; i++) put(mesh(g, GEO.mound, tone(C.moss, .1), (R() - .5) * long, .5, (R() - .5) * wide * .8), 0, R() * 3, 0, [.3 + R() * .2, .08, .2]);
  const shadow = blob(1); shadow.scale.set(long + .6, 1, wide + .6); g.add(shadow);
  return g;
}

/** A funerary urn: foot, belly, shoulder, neck and lip turned in the floor's clay (`urn` in the look), painted bands,
    two small handles, a lid with a knob. A rune-sealed one is dark stone, bound by a band of ward light with runes
    shining in it (`ward`, its colour). */
export function urnLook(R: R, look: FloorLook, sealed: boolean, ward: number) {
  const g = new THREE.Group(), clay = sealed ? 0x4c4a54 : hex(look.urn.clay), band = sealed ? 0x2e2c34 : hex(look.urn.band);
  mesh(g, URN_BODY, tone(clay, .07)); mesh(g, URN_LID, tone(shade(clay, .72), .06)); mesh(g, GEO.spot, tone(shade(clay, .72)), 0, .635, 0).scale.setScalar(2.4);
  for (const [y, r, t] of [[.3, .252, .012], [.17, .2, .009], [.5, .104, .009]]) put(mesh(g, new THREE.TorusGeometry(r, t, 3, 16), tone(band), 0, y, 0), Math.PI / 2);
  for (const s of [-1, 1]) put(mesh(g, URN_HANDLE, tone(clay, .07), s * .2, .41, 0), 0, 0, -s * Math.PI / 2);
  if (sealed) {
    const light = glowTone(ward);
    put(mesh(g, new THREE.TorusGeometry(.262, .016, 4, 24), light, 0, .3, 0), Math.PI / 2);
    for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * .55; put(mesh(g, GEO.smallRune, light, Math.cos(a) * .262, .3, Math.sin(a) * .262), 0, Math.PI / 2 - a, 0, .8); }
    const gl = glow(ward, .9, .45); gl.position.y = .33; g.add(gl);
  }
  g.rotation.y = R() * .6 - .3; // (the ward's runes face the camera)
  g.add(blob(.8)); return g;
}
export const URN_BODY = shared(lathe([[0, 0], [.1, 0], [.115, .025], [.095, .05], [.17, .12], [.235, .24], [.25, .3], [.225, .38], [.16, .45], [.105, .49], [.1, .52], [.13, .545], [.12, .56], [0, .56]], 12));
export const URN_LID = shared(lathe([[.118, .56], [.1, .585], [.05, .62], [0, .625]], 12));
const URN_HANDLE = shared(new THREE.TorusGeometry(.05, .014, 4, 8, Math.PI));

/** An artifact's pedestal: a stepped base, a turned column, a round top with golden runes glowing round its rim. */
export function pedestalLook(look: FloorLook | undefined) {
  const g = new THREE.Group(), st = stoneOf(look, 1.45);
  box(g, .78, .08, .78, tone(shade(st, .75), .1), 0, .04, 0); box(g, .64, .06, .64, tone(st, .08), 0, .11, 0);
  mesh(g, lathe([[.27, .14], [.25, .18], [.21, .23], [.19, .5], [.21, .54], [.3, .59], [.3, .6]], 8), tone(st, .1));
  mesh(g, new THREE.CylinderGeometry(.4, .38, .08, 12), tone(shade(st, 1.1), .08), 0, .64, 0);
  const gold = glowTone(C.gold);
  for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + (i - 2) * .5; put(mesh(g, GEO.smallRune, gold, Math.cos(a) * .402, .64, Math.sin(a) * .402), 0, Math.PI / 2 - a, 0, .75); }
  g.add(blob(1.3)); return g;
}

/** The bone altar: a dark slab with runes of blood on its face, a top of bone, bones and a skull heaped at its foot,
    and two red candles burning (`fire`). */
export function altarLook(look: FloorLook | undefined) {
  const g = new THREE.Group(), st = stoneOf(look, .9), blood = glowTone(C.blood), red = tone(0x7a1410, .05);
  box(g, 1, .5, .6, tone(st, .1), 0, .25, 0);
  for (const x of [-.3, 0, .3]) mesh(g, GEO.warnRune, blood, x, .27, .305);
  box(g, 1.08, .08, .68, tone(C.bone, .06), 0, .54, 0);
  for (let i = 0; i < 3; i++) bone(g, -.3 + i * .3, .05, .38, .4 - i * .4 + Math.PI / 2, 0, i === 1);
  skull(g, .12, .1, .42, -.3, -.2, .9);
  const specs: FlameSpec[] = [];
  for (const x of [-.4, .4]) { mesh(g, GEO.candle, red, x, .58, -.18).scale.set(1.3, .18, 1.3); mesh(g, GEO.drip, red, x + .04, .68, -.15); specs.push({ x, y: .76, z: -.18, h: .2, w: .085 }); }
  const fire = new THREE.Group(); fire.add(makeFire(specs, ALTAR_FIRE, 4, .3));
  for (const x of [-.4, .4]) { const gl = glow(0xff7a3a, .45, .9); gl.position.set(x, .88, -.18); fire.add(gl); }
  g.add(fire, blob(1.6));
  g.userData.parts = { fire };
  return g;
}
const ALTAR_FIRE = firePalette(0xffb080, 0xff4a28);

/* ---------- fire ---------- */

/** The fire on a burning object (props.ts): flames along its tiles, taller on roots and up a dead tree's boughs. */
export function burningFire(kind: string, len: number) {
  const specs: FlameSpec[] = kind === 'tree'
    ? [{ x: 0, y: .15, z: 0, h: .9, w: .32, tongues: 3 }, { x: .22, y: .95, z: .05, h: .6, w: .2, beat: 1.4 }, { x: -.2, y: 1.15, z: -.05, h: .55, w: .18, beat: 3.3 }, { x: 0, y: 1.5, z: 0, h: .5, w: .16, beat: 5.1 }]
    : kind === 'roots' ? [{ x: 0, y: .05, z: 0, h: .7, w: .28, tongues: 3 }, { x: .15, y: .6, z: .05, h: .5, w: .18, beat: 2.2 }, { x: -.1, y: 1, z: 0, h: .45, w: .15, beat: 4.4 }]
    : Array.from({ length: len }, (_, i) => [{ x: i - (len - 1) / 2, y: .05, z: 0, h: .55, w: .3, tongues: 3, beat: i * 1.9 }, { x: i - (len - 1) / 2 + .2, y: .05, z: .1, h: .35, w: .18, beat: i * 1.9 + 2.7 }]).flat();
  return makeFire(specs, EMBER_FIRE, 6 * len, .7);
}

/** Candle flames in a floor's light (a niche's candles, a themed room's): one fire for all of `specs`. */
export const candleFire = (specs: FlameSpec[], look: FloorLook) => makeFire(specs, torchPalette(look.torch), 0);
