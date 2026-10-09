/* The Vigil's pieces (M7 step 5; docs/M7-plan.md, decision 9), built in code from the room kit's parts in the warm candlelit
   crypt the owner chose: the bier the mage wakes on, the candle wall (a candle for each one lit), the wall of skulls, the
   echoes' plinths, the Great Circle cut in the Nave's floor, the Ferryman standing in his boat, and the six ways barred by
   a school. Each is built facing +z (into the room) from the wall's face or its own middle, and its still body merged
   (`mergeStill`); what moves is kept apart in `userData.parts` (the Ferryman's head and lantern, the veil). */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import type { School } from '../actors/foeData';
import { blob, glow, glowShared, markShared, mergeStill } from '../render/materials';
import { firePalette, makeFire, type FlameSpec } from '../render/fire';
import { MAT, curve, mesh, rough, runeStrokes, shade, stoneOf, taperTube, tone } from '../world/kitParts';
import { lecternLook } from '../world/specialLooks';
import { mulberry } from '../rng';
import type { PieceKind } from './vigilMap';

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (r0: number, r1: number, h: number, n = 8) => new THREE.CylinderGeometry(r0, r1, h, n);
const candlePal = (look: FloorLook) => { const [a, b] = look.torch.candle ?? [look.torch.flame, look.torch.light]; return firePalette(new THREE.Color(a).getHex(), new THREE.Color(b).getHex()); };
const waxOf = (look: FloorLook) => tone(new THREE.Color(look.torch.wax ?? '#f0e2c6').getHex(), .05);
const SHROUD = 0xb4a68c, WOOD = 0x3e2c1e, HULL = 0x2a2018, ROBE = 0x2a2420, HOOD = 0x1e1a18;

/** A stone bier two tiles long (along x): a plinth, its slab, a stone pillow at the head (west) and a shroud folded at its
    foot, a short candle burning at each corner. */
function bierLook(look: FloorLook) {
  const g = new THREE.Group(), stone = tone(stoneOf(look, 1.15), .12), dark = tone(stoneOf(look, .85), .1), wax = waxOf(look);
  mesh(g, box(1.7, .36, .7), dark, 0, .18, 0); mesh(g, box(1.86, .1, .82), stone, 0, .41, 0);
  mesh(g, box(1.6, .05, .1), stone, 0, .06, .4);
  mesh(g, rough(box(.28, .1, .5), .02, 3), stone, -.72, .51, 0);
  mesh(g, box(.46, .08, .66), tone(SHROUD, .1), .66, .5, 0); mesh(g, box(.4, .06, .6), tone(shade(SHROUD, .85), .1), .64, .57, .02);
  const specs: FlameSpec[] = [];
  for (const [x, z] of [[-.84, -.32], [-.84, .32], [.84, -.32], [.84, .32]]) { mesh(g, cyl(.035, .04, .12, 6), wax, x, .52, z); specs.push({ x, y: .58, z, h: .1, w: .045 }); }
  const fire = makeFire(specs, candlePal(look), 2, .2); g.add(fire);
  const light = glow(0xffb860, 1.1, .5); light.position.set(0, .7, 0); g.add(light);
  g.add(blob(2.2)); g.userData.parts = { fire, light }; mergeStill(g);
  return g;
}

/** The candle wall (five tiles along the north wall): three stepped tiers of stone crowded with candles, each a name's; one
    burns for each candle lit (`setLit`), the first in the middle of the middle tier. Built from the wall's face, facing +z. */
export function candleWallLook(look: FloorLook) {
  const g = new THREE.Group(), stone = tone(stoneOf(look, 1.1), .12), lip = tone(stoneOf(look, 1.3), .08), wax = waxOf(look), R = mulberry(71);
  const tiers = [{ y: .3, d: .56, n: 7 }, { y: .6, d: .38, n: 6 }, { y: .9, d: .2, n: 5 }];
  const spots: { x: number; y: number; z: number; h: number }[] = [];
  for (const t of tiers) {
    mesh(g, box(4.6, t.y, t.d), stone, 0, t.y / 2, t.d / 2); mesh(g, box(4.66, .04, t.d + .04), lip, 0, t.y, t.d / 2);
    for (let i = 0; i < t.n; i++) {
      const x = (i - (t.n - 1) / 2) * 4.2 / t.n + (R() - .5) * .12, z = t.d - .1 - R() * .05, h = .1 + R() * .2;
      mesh(g, cyl(.034, .04, 1, 6), wax, x, t.y + h / 2, z).scale.y = h;
      mesh(g, new THREE.SphereGeometry(.07, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), wax, x, t.y, z).scale.y = .3; // (its wax pooled)
      spots.push({ x, y: t.y + h, z, h });
    }
  }
  // the order they light: the middle tier's middle first, then outward, tier by tier
  const order = spots.map((_, i) => i).sort((a, b) => {
    const tier = (i: number) => i < 7 ? 1 : i < 13 ? 0 : 2, ta = tier(a), tb = tier(b);
    return ta - tb || Math.abs(spots[a].x) - Math.abs(spots[b].x);
  });
  const light = glow(0xffb860, 1.6, .7); light.position.set(0, .95, .5); g.add(light);
  g.add(blob(5)); g.userData.parts = { light }; mergeStill(g);
  let fire: THREE.Object3D | null = null, now = -1;
  const setLit = (n: number) => {
    n = Math.max(0, Math.min(order.length, n)); if (n === now) return; now = n;
    if (fire) { g.remove(fire); fire.traverse(o => (o as THREE.Mesh).geometry?.dispose()); }
    const specs: FlameSpec[] = order.slice(0, n).map(i => ({ x: spots[i].x, y: spots[i].y, z: spots[i].z, h: .12, w: .05 }));
    fire = specs.length ? makeFire(specs, candlePal(look), Math.min(4, specs.length), .3) : null;
    if (fire) g.add(fire);
    light.visible = n > 0; light.material.opacity = Math.min(.85, .35 + n * .05);
  };
  return { group: g, setLit, get lit() { return now; }, count: spots.length, light };
}

/** The wall of skulls (two tiles along the north wall): a rack of niches, two rows of three, a skull in each, its eyes dark
    (they watch in step 12). */
function skullsLook(look: FloorLook) {
  const g = new THREE.Group(), stone = tone(stoneOf(look, 1.05), .12), dark = MAT.socket;
  mesh(g, box(1.9, 1.5, .34), stone, 0, .75, .17);
  for (const row of [0, 1]) for (const col of [-1, 0, 1]) {
    const x = col * .6, y = .45 + row * .62;
    mesh(g, box(.46, .42, .04), dark, x, y, .345);
    mesh(g, new THREE.SphereGeometry(.13, 9, 7).scale(1, .92, 1.05), MAT.skull, x, y - .04, .36);
    mesh(g, box(.15, .05, .1), MAT.skull, x, y - .15, .4);
    for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(.035, 6, 4), dark, x + s * .05, y - .03, .47);
  }
  mesh(g, box(2, .08, .4), tone(stoneOf(look, 1.3), .08), 0, 1.52, .18);
  g.add(blob(2.2)); mergeStill(g); return g;
}

/** An echo's plinth in the Nave: a low drum of stone with a ring of runes cut round it, empty until step 11. */
function plinthLook(look: FloorLook) {
  const g = new THREE.Group(), stone = tone(stoneOf(look, 1.1), .1);
  mesh(g, cyl(.4, .44, .3, 10), stone, 0, .15, 0); mesh(g, cyl(.46, .46, .06, 10), tone(stoneOf(look, 1.3), .08), 0, .33, 0);
  const rune = runeStrokes(.14);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, m = mesh(g, rune, MAT.socket, Math.sin(a) * .445, .16, Math.cos(a) * .445); m.rotation.y = a; }
  g.add(blob(1.1)); mergeStill(g); return g;
}

/** The Great Circle cut in the Nave's floor: three rings (the vows, the gifts, the omens of step 10), each with its sigils'
    places as small rings, and spokes between them; dark, as cut stone is, until the circle is cast. One mesh. */
export function circleLook(radius: number) {
  const parts: THREE.BufferGeometry[] = [], flat = (geo: THREE.BufferGeometry, x = 0, z = 0) => parts.push(geo.rotateX(-Math.PI / 2).translate(x, .006, z));
  const rings = [radius, radius * .72, radius * .44];
  rings.forEach((r, k) => {
    flat(new THREE.RingGeometry(r - .07, r, 64));
    const n = [6, 6, 3][k];
    for (let i = 0; i < n; i++) { const a = (i + (k === 1 ? .5 : 0)) / n * Math.PI * 2, rr = k === 0 ? r - .38 : r; flat(new THREE.RingGeometry(.15, .2, 16), Math.cos(a) * rr, Math.sin(a) * rr); }
  });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6, l = rings[0] - rings[2] - .12, mid = (rings[0] + rings[2]) / 2; flat(new THREE.PlaneGeometry(l, .05).rotateZ(-a), Math.cos(a) * mid, Math.sin(a) * mid); }
  const geo = new THREE.BufferGeometry(), all = parts.map(p => p.index ? p.toNonIndexed() : p);
  const n = all.reduce((s, p) => s + p.attributes.position.count, 0), pos = new Float32Array(n * 3); let o = 0;
  for (const p of all) { pos.set(p.attributes.position.array as Float32Array, o * 3); o += p.attributes.position.count; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.computeVertexNormals();
  for (const p of [...parts, ...all]) if (p !== geo) p.dispose();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 1, transparent: true, opacity: .75, depthWrite: false }));
  m.renderOrder = 1; return m;
}

/** The Ferryman in his boat (three tiles along x, two across, on the Landing's water): a long dark hull, its prow curling
    up to the west, a bench, and at the stern the Ferryman, tall and hooded, leaning on his pole, a lantern hanging from its
    crook. His head turns to the mage (`head`); the lantern sways (`lantern`). */
/** The boat, with the Ferryman at its stern built in code, or (`ferryman` false) without him: his made model stands there
    instead (vigil/town.ts's `standFerryman`). */
function boatLook(ferryman = true) {
  const g = new THREE.Group(), wood = tone(HULL, .12), plank = tone(WOOD, .12), iron = MAT.iron;
  const hull = new THREE.SphereGeometry(.5, 14, 8).scale(2.7, .5, .82);
  mesh(g, hull, wood, 0, .12, 0); mesh(g, box(2.2, .04, .5), tone(shade(WOOD, .7), .1), 0, .3, 0); // (its hull, and the boards inside)
  mesh(g, new THREE.TorusGeometry(1, .035, 4, 28).rotateX(Math.PI / 2).scale(1.35, 1, .41), plank, 0, .3, 0);
  mesh(g, taperTube(curve([[-1.25, .2, 0], [-1.5, .4, 0], [-1.55, .66, 0], [-1.42, .78, 0]]), 8, .09, .04), wood);
  mesh(g, box(.12, .06, .74), plank, -.3, .3, 0); mesh(g, box(.12, .06, .7), plank, .5, .3, 0);
  mesh(g, taperTube(curve([[-1.3, .3, 0], [-1.7, .2, -.05], [-2.05, .32, -.1]]), 6, .018, .018, 4), tone(0x8a7a5a, .1)); // (the mooring rope, to the jetty's post)
  mesh(g, cyl(.07, .08, .7, 6), plank, -2.12, .35, -.1);
  // the Ferryman, standing at the stern
  if (ferryman) { const { F, head, lantern } = ferrymanFigure(plank, iron); F.position.set(.88, .26, 0); g.add(F); g.userData.parts = { head, lantern }; }
  g.add(blob(3)); mergeStill(g);
  return g;
}
/** The Ferryman himself, his pole in hand and its lantern lit (M7 step 7: alone, for the talk panel's icon). */
export function ferrymanLook() { const g = new THREE.Group(); g.add(ferrymanFigure(tone(WOOD, .12), MAT.iron).F); return g; }
function ferrymanFigure(plank: THREE.Material, iron: THREE.Material) {
  const robe = tone(ROBE, .1), F = new THREE.Group();
  mesh(F, new THREE.LatheGeometry([[.3, 0], [.28, .2], [.22, .7], [.17, 1.05], [.14, 1.25], [.05, 1.32]].map(([x, y]) => new THREE.Vector2(x, y)), 10), robe);
  mesh(F, box(.5, .14, .16), robe, 0, 1.12, .02).rotation.z = .05; // (the shoulders)
  for (const s of [-1, 1]) { const arm = mesh(F, cyl(.06, .08, .5, 6), robe, s * .2, .92, .08); arm.rotation.set(-.5, 0, s * .25); }
  const head = new THREE.Group(); head.position.set(0, 1.32, 0); F.add(head);
  mesh(head, new THREE.SphereGeometry(.16, 10, 8).scale(1, 1.1, 1.05), tone(HOOD, .08), 0, .06, 0);
  mesh(head, new THREE.ConeGeometry(.12, .22, 8).rotateX(-.5), tone(HOOD, .08), 0, .16, -.08);
  mesh(head, box(.18, .16, .04), MAT.socket, 0, .02, .15);
  for (const s of [-1, 1]) mesh(head, new THREE.SphereGeometry(.018, 5, 4), tone(0xd8c8a0), s * .045, .04, .17);
  // the pole, its crook and the lantern
  const pole = new THREE.Group(); pole.position.set(.32, 0, .12); pole.rotation.z = -.12; F.add(pole);
  mesh(pole, cyl(.025, .03, 2.1, 6), plank, 0, .95, 0);
  mesh(pole, new THREE.TorusGeometry(.12, .02, 4, 10, Math.PI), plank, -.12, 2.0, 0);
  const lantern = new THREE.Group(); lantern.position.set(-.24, 1.98, 0); pole.add(lantern);
  mesh(lantern, cyl(.004, .004, .14, 3), iron, 0, -.07, 0);
  mesh(lantern, new THREE.ConeGeometry(.08, .07, 6), iron, 0, -.15, 0); mesh(lantern, cyl(.07, .06, .03, 6), iron, 0, -.32, 0);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; mesh(lantern, box(.012, .14, .012), iron, Math.cos(a) * .06, -.25, Math.sin(a) * .06); }
  lantern.add(makeFire([{ x: 0, y: -.3, z: 0, h: .1, w: .05 }], firePalette(0xffe0a0, 0xffa040), 1, .1));
  const lit = glowShared(0xffc070, 1.0, .75); lit.position.set(0, -.24, 0); lantern.add(lit);
  return { F, head, lantern };
}

/** A piece of the Vigil, by kind. */
export function pieceLook(kind: PieceKind, look: FloorLook, o: { ferryman?: boolean } = {}) {
  switch (kind) {
    case 'bier': return bierLook(look);
    case 'skulls': return skullsLook(look);
    case 'lectern': return lecternLook(look);
    case 'plinth': return plinthLook(look);
    case 'boat': return boatLook(o.ferryman ?? true);
    case 'candleWall': return candleWallLook(look).group;
  }
}

/* ---------- the six barred ways ---------- */

const ICE = markShared(new THREE.MeshStandardMaterial({ color: 0xa8d8f0, emissive: 0x1a3a50, roughness: .25, transparent: true, opacity: .82 }));
const VEIL = markShared(new THREE.MeshStandardMaterial({ color: 0x1a1024, emissive: 0x140820, roughness: 1, transparent: true, opacity: .92, side: THREE.DoubleSide }));
const WATER = markShared(new THREE.MeshStandardMaterial({ color: 0x0c161c, roughness: .15, metalness: .2 }));
/** A doorway's frame of stone `w` wide, standing out from the wall's face: two posts and a lintel; a pointed head for the
    chapel. */
function frame(g: THREE.Group, w: number, look: FloorLook, pointed = false) {
  const stone = tone(stoneOf(look, .95), .12), top = tone(stoneOf(look, 1.2), .1);
  for (const s of [-1, 1]) { mesh(g, box(.3, 1.62, .34), stone, s * (w / 2 - .15), .81, .17); mesh(g, box(.38, .1, .4), top, s * (w / 2 - .15), .05, .18); }
  mesh(g, box(w + .1, .26, .38), top, 0, 1.68, .19);
  if (pointed) mesh(g, new THREE.ConeGeometry(w / 2, .5, 4, 1).rotateY(Math.PI / 4).scale(1, 1, .3), stone, 0, 2.04, .15);
}

/** One way barred by a school, `w` tiles along its wall, built from the wall's face facing +z. */
export function barLook(school: School, w: number, look: FloorLook) {
  const g = new THREE.Group(), R = mulberry(school.length * 31), inner = w - .6;
  const parts: Record<string, THREE.Object3D> = {};
  if (school === 'ember') { // a stair going up into the rock, frozen solid to the arch
    frame(g, w, look);
    for (let k = 0; k < 5; k++) mesh(g, box(inner, .3, .3), tone(stoneOf(look, .9 - k * .04), .1), 0, .15 + k * .3, .25 - k * .05);
    mesh(g, rough(box(inner, 1.5, .3), .08, 5), ICE, 0, .76, .2);
    for (let k = 0; k < 6; k++) mesh(g, new THREE.ConeGeometry(.05 + R() * .04, .2 + R() * .25, 5).rotateX(Math.PI), ICE, (k / 5 - .5) * (inner - .1), 1.45, .38);
    for (let k = 0; k < 4; k++) mesh(g, rough(new THREE.DodecahedronGeometry(.16 + R() * .1, 0), .03, k), ICE, (R() - .5) * inner, .1, .42 + R() * .1);
  } else if (school === 'storm') { // a door of stone set with three dark rune stones
    frame(g, w, look);
    mesh(g, box(inner, 1.52, .16), tone(0x3e4450, .12), 0, .76, .1);
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * inner / 3.2, y = k === 1 ? 1.05 : .7;
      mesh(g, cyl(.22, .24, .12, 10).rotateX(Math.PI / 2), tone(0x5a606c, .1), x, y, .22);
      mesh(g, runeStrokes(.26), MAT.socket, x, y, .29);
    }
    mesh(g, box(inner - .2, .05, .05), MAT.iron, 0, .42, .2); mesh(g, box(inner - .2, .05, .05), MAT.iron, 0, 1.3, .2);
  } else if (school === 'umbral') { // a veil of shadow hanging in the arch, stirring
    frame(g, w, look);
    mesh(g, box(inner, 1.5, .04), MAT.socket, 0, .76, .02);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(inner, 1.5, 10, 4), VEIL); veil.position.set(0, .78, .14); g.add(veil); parts.veil = veil;
    mesh(g, cyl(.025, .025, inner + .1, 5).rotateZ(Math.PI / 2), MAT.blackIron, 0, 1.53, .14);
  } else if (school === 'hallow') { // a dark chapel's pointed arch, its candles cold, a dull sun over it
    frame(g, w, look, true);
    mesh(g, box(inner, 1.55, .04), MAT.socket, 0, .78, .02);
    mesh(g, box(inner * .6, .36, .3), tone(stoneOf(look, 1.15), .1), 0, .18, .2);
    for (const s of [-1, 1]) { mesh(g, cyl(.035, .04, .18, 6), MAT.wax, s * .3, .45, .22); mesh(g, cyl(.004, .004, .03, 3), MAT.pitch, s * .3, .555, .22); }
    mesh(g, new THREE.TorusGeometry(.16, .025, 4, 14), MAT.darkBronze, 0, 2.1, .36);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; mesh(g, box(.03, .1, .02), MAT.darkBronze, Math.cos(a) * .25, 2.1 + Math.sin(a) * .25, .36).rotation.z = a - Math.PI / 2; }
  } else if (school === 'verdant') { // a dead root broken through the wall, its arms splayed down the stone and into the floor
    const root = tone(0x5c4c3c, .15), dark = tone(0x3e3228, .12);
    mesh(g, rough(box(.8, .5, .08), .08, 2), MAT.socket, 0, 1.0, .03); // (the hole it broke, below the wall's top)
    mesh(g, taperTube(curve([[0, 1.02, .02], [.05, .95, .3], [.12, .6, .5], [.18, .22, .58], [.22, 0, .55]]), 14, .24, .13), root);
    mesh(g, taperTube(curve([[-.1, 1.0, .05], [-.35, .82, .12], [-.55, .5, .14], [-.68, .15, .2], [-.72, 0, .26]]), 12, .13, .06), root);
    mesh(g, taperTube(curve([[.12, .98, .06], [.4, .8, .1], [.62, .45, .12], [.72, .1, .2], [.75, 0, .24]]), 12, .12, .05), root);
    for (let k = 0; k < 7; k++) { const sx = (R() - .5) * 1.2, y = .2 + R() * .6; mesh(g, taperTube(curve([[sx * .6, y + .15, .12], [sx, y, .2], [sx * 1.15, y - .2, .16]]), 4, .03, .008, 3), dark); }
    for (const x of [-.72, .22, .75]) mesh(g, rough(new THREE.DodecahedronGeometry(.12, 0), .03, x * 10), dark, x, .04, .3).scale.y = .4; // (where each digs into the floor)
  } else { // frost: a cellar stair going down into black water, filled to halfway up the arch
    frame(g, w, look);
    mesh(g, box(inner, 1.5, .04), MAT.socket, 0, .78, .02);
    for (let k = 0; k < 4; k++) { // (the steps, coming down toward the room and under the water)
      const y = 1.18 - k * .15, z = .07 + k * .06;
      mesh(g, box(inner, .07, .1), tone(stoneOf(look, 1.05 - k * .08), .1), 0, y, z); mesh(g, box(inner, .015, .1), tone(stoneOf(look, 1.35), .05), 0, y + .04, z);
    }
    mesh(g, box(inner, .68, .05), WATER, 0, .34, .3); // (the water standing in the arch)
    mesh(g, box(inner, .025, .06), tone(0x5a8aa0, .05), 0, .69, .31); // (its surface catching the light)
    for (let k = 0; k < 3; k++) mesh(g, box(.18 + R() * .2, .012, .01), tone(0x4a7488, .05), (R() - .5) * (inner - .4), .5 - k * .14, .335);
    for (let k = 0; k < 7; k++) { const m = mesh(g, cyl(.02, .02, .09, 4).rotateZ(Math.PI / 2), MAT.iron, (k / 6 - .5) * (inner - .1), 1.0 - Math.abs(k - 3) * .06, .37); m.rotation.y = .2; } // (a chain across)
  }
  g.add(blob(w + .4)); g.userData.parts = parts; mergeStill(g);
  return { group: g, veil: parts.veil as THREE.Mesh | undefined };
}

/** How a piece or bar built facing +z is turned to face into the room from each wall. */
export const FACE_TURN = { n: 0, s: Math.PI, w: Math.PI / 2, e: -Math.PI / 2 } as const;

/** The veil stirs; the lantern sways; the Ferryman's head turns toward (dx, dz), the mage seen from his boat. */
export function moveVeil(veil: THREE.Mesh, t: number) {
  const pos = veil.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, Math.sin(t * 1.3 + x * 2.6 + y * .8) * .045 * (.75 - y / 2)); }
  pos.needsUpdate = true;
}
export function moveFerryman(boat: THREE.Object3D, t: number, toMage: number | null) {
  const parts = boat.userData.parts as { head: THREE.Object3D; lantern: THREE.Object3D } | undefined; if (!parts) return; // (his made model moves itself)
  const { head, lantern } = parts;
  lantern.rotation.z = Math.sin(t * 1.4) * .12; lantern.rotation.x = Math.sin(t * 1.1 + 1) * .06;
  const want = toMage === null ? 0 : Math.max(-1.1, Math.min(1.1, toMage));
  head.rotation.y += (want - head.rotation.y) * .05;
}
