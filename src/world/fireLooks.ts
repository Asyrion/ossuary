/* The room kit's fire objects (M3.5 step 3, the proof; docs/M3.5-plan.md): the wall torch in each floor's style, the
   brazier and the candle stand, built in code in the style of the spell effects (docs/effects.md), with their fire from
   render/fire.ts. What they do is unchanged (rooms.ts, mechanisms.ts); only the look is new. Each returns its parts:
   what lights up (hidden while cold) and its glow. `DEV.roomKit` off keeps the old looks, to compare. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, markShared, paint } from '../render/materials';
import { EMBER_FIRE, firePalette, makeFire, type FirePalette, type FlameSpec } from '../render/fire';

const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
// Painted (materials.ts, `paint`): each object's still body draws in one call. Iron a little lighter than the
// placeholders' so its edges catch the torchlight in the pixel look; the glowing embers keep a material of their own.
const MAT = {
  iron: paint(0x4a4548), bronze: paint(0xa27a3e), wood: paint(0x563a26), pitch: paint(0x1e1611), coals: paint(0x241f1c), wax: paint(0xf0e2c6),
  ember: markShared(new THREE.MeshStandardMaterial({ color: 0x3a1a0e, emissive: 0x5a1e06, roughness: 1, flatShading: true })),
};
export const RUNE_COLD = 0x2a1d16, RUNE_LIT = 0xffa040;

/** A carved rune (three strokes), one geometry, facing +Z, `s` tall. */
function runeStrokes(s: number) {
  const box = (w: number, h: number) => new THREE.BoxGeometry(w * s, h * s, .02);
  const a = box(.16, 1), b = box(.14, .55).rotateZ(.7).translate(-s * .17, s * .16, 0), c = box(.14, .55).rotateZ(.7).translate(s * .17, -s * .12, 0);
  return joinAll([a, b, c]);
}
function joinAll(parts: THREE.BufferGeometry[]) {
  const flat = parts.map(p => { const x = p.index ? p.toNonIndexed() : p; for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); return x; });
  const out = new THREE.BufferGeometry(), n = flat.reduce((s, p) => s + p.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const p of flat) { pos.set(p.attributes.position.array as Float32Array, o * 3); nor.set(p.attributes.normal.array as Float32Array, o * 3); o += p.attributes.position.count; }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  for (const p of [...parts, ...flat]) p.dispose();
  return out;
}

const GEO = {
  plate: shared(new THREE.BoxGeometry(.17, .3, .03)), plateTop: shared(new THREE.ConeGeometry(.12, .1, 4).rotateY(Math.PI / 4).scale(1, 1, .25)),
  rivet: shared(new THREE.SphereGeometry(.024, 6, 4)), arm: shared(new THREE.BoxGeometry(.045, .045, .2)), ring: shared(new THREE.TorusGeometry(.05, .016, 4, 10).rotateX(Math.PI / 2)),
  haft: shared(new THREE.CylinderGeometry(.03, .022, .42, 6)), head: shared(new THREE.CylinderGeometry(.052, .038, .12, 7)), band: shared(new THREE.TorusGeometry(.05, .013, 4, 10).rotateX(Math.PI / 2)),
  rune: shared(runeStrokes(.11)),
  // the lantern: an arm, a cap, a cage of six bars round a pane of glass, a base
  lArm: shared(new THREE.BoxGeometry(.04, .04, .32)), lCap: shared(new THREE.ConeGeometry(.13, .12, 6)), lBar: shared(new THREE.BoxGeometry(.018, .24, .018)),
  lBase: shared(new THREE.CylinderGeometry(.11, .08, .045, 6)), lGlass: shared(new THREE.CylinderGeometry(.085, .085, .22, 6, 1, true)), lHook: shared(new THREE.TorusGeometry(.03, .01, 4, 8)),
  // a bowl of iron, turned: rim at the top
  bowl: shared(new THREE.LatheGeometry([[.08, 0], [.23, .03], [.3, .09], [.325, .17], [.335, .28]].map(([x, y]) => new THREE.Vector2(x, y)), 12)),
  coals: shared(new THREE.CylinderGeometry(.31, .31, .04, 12)), lump: shared(new THREE.DodecahedronGeometry(.075, 0)), ember: shared(new THREE.SphereGeometry(.04, 5, 3)),
  rim: shared(new THREE.TorusGeometry(.35, .028, 4, 18).rotateX(Math.PI / 2)), collar: shared(new THREE.TorusGeometry(.2, .02, 4, 12).rotateX(Math.PI / 2)),
  leg: shared(new THREE.CylinderGeometry(.026, .032, 1, 5)), claw: shared(new THREE.SphereGeometry(.05, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
  plaque: shared(new THREE.BoxGeometry(.17, .14, .02)),
  // the candle stand
  foot: shared(new THREE.CylinderGeometry(.16, .22, .05, 6)), pole: shared(new THREE.CylinderGeometry(.026, .034, .72, 6)), knop: shared(new THREE.SphereGeometry(.045, 7, 5)),
  dish: shared(new THREE.CylinderGeometry(.24, .17, .045, 12)), dishRim: shared(new THREE.TorusGeometry(.24, .014, 4, 16).rotateX(Math.PI / 2)),
  candle: shared(new THREE.CylinderGeometry(.038, .042, 1, 7)), drip: shared(new THREE.SphereGeometry(.022, 5, 4)), pool: shared(new THREE.SphereGeometry(.09, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .25, 1)),
};

const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
};
/** The wall torch's fire colours in a floor's look (the crypt's amber, the drowned's pale lanterns, the burning's red). */
export const torchPalette = (t: FloorLook['torch']) => firePalette(new THREE.Color(t.flame).getHex(), new THREE.Color(t.light).getHex());

/** A light on a wall in the floor's style, built facing south (+Z, into the room) from the wall's face: an iron bracket
    holding a pitch torch (crypt), a cage lantern on an arm (drowned) or a brazier on a bracket (burning). `lit` is what
    shows while it burns (its fire and a rune on the bracket); the glow is apart, for the flicker. */
export function torchLook(t: FloorLook['torch']) {
  const holder = new THREE.Group(), lit = new THREE.Group(), pal = torchPalette(t);
  lit.userData.fire = true; // (its fire moves by itself: no flicker from outside)
  let gl: THREE.Sprite;
  if (t.style === 'lantern') {
    mesh(holder, GEO.lArm, MAT.iron, 0, 1.4, .16); mesh(holder, GEO.lHook, MAT.iron, 0, 1.36, .31);
    mesh(holder, GEO.lCap, MAT.iron, 0, 1.28, .31); mesh(holder, GEO.lBase, MAT.iron, 0, .98, .31);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; mesh(holder, GEO.lBar, MAT.iron, Math.cos(a) * .095, 1.1, .31 + Math.sin(a) * .095); }
    mesh(lit, GEO.lGlass, glassFor(pal.body), 0, 1.1, .31).renderOrder = 2; // the pane glows with the flame
    lit.add(makeFire([{ x: 0, y: 1.0, z: .31, h: .17, w: .085 }], pal));
    gl = glow(pal.body, 1.1, .8); gl.position.set(0, 1.1, .33);
  } else if (t.style === 'brazier') {
    mesh(holder, GEO.plate, MAT.iron, 0, .66, .015).scale.set(.8, 1.2, 1);
    const strut = mesh(holder, GEO.arm, MAT.iron, 0, .72, .12); strut.rotation.x = -.5; strut.scale.z = 1.2;
    const bowl = mesh(holder, GEO.bowl, MAT.iron, 0, .8, .26); bowl.scale.setScalar(.62);
    mesh(holder, GEO.rim, MAT.bronze, 0, .94, .26).scale.setScalar(.62);
    mesh(holder, GEO.coals, MAT.coals, 0, .93, .26).scale.setScalar(.6);
    lit.add(makeFire([{ x: 0, y: .95, z: .26, h: .5, w: .26, tongues: 3 }], pal, 5, .6));
    gl = glow(pal.body, 1.5, .8); gl.position.set(0, 1.15, .28);
  } else { // (upright and close to the wall: seen from above at 45°, whatever leans out towards the camera drops down the screen)
    mesh(holder, GEO.plate, MAT.iron, 0, .86, .015); mesh(holder, GEO.plateTop, MAT.iron, 0, 1.06, .015);
    mesh(holder, GEO.rivet, MAT.bronze, 0, .97, .035); mesh(holder, GEO.rivet, MAT.bronze, 0, .74, .035);
    mesh(holder, GEO.arm, MAT.iron, 0, .8, .06).scale.z = .6; mesh(holder, GEO.ring, MAT.iron, 0, .82, .11);
    mesh(holder, GEO.ring, MAT.iron, 0, 1.0, .11).scale.setScalar(.85);
    mesh(holder, GEO.haft, MAT.wood, 0, .95, .11);
    mesh(holder, GEO.head, MAT.pitch, 0, 1.2, .115); mesh(holder, GEO.band, MAT.iron, 0, 1.15, .115);
    mesh(lit, GEO.rune, runeMat(pal.body), 0, .86, .032); // a warding rune on the bracket, glowing while the torch burns
    lit.add(makeFire([{ x: 0, y: 1.23, z: .12, h: .4, w: .13, tongues: 2 }], pal, 4, .45));
    gl = glow(pal.body, 1.1, .7); gl.position.set(0, 1.32, .14);
  }
  holder.add(lit, gl);
  return { holder, lit, glow: gl };
}
const glassCache = new Map<number, THREE.Material>(), runeCache = new Map<number, THREE.Material>();
const glassFor = (c: number) => glassCache.get(c) ?? (glassCache.set(c, markShared(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false }))), glassCache.get(c)!);
const runeMat = (c: number) => runeCache.get(c) ?? (runeCache.set(c, markShared(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).lerp(new THREE.Color(0xc02008), .35) }))), runeCache.get(c)!);

/** The brazier: an iron bowl of coals on three splayed legs with claw feet and a collar, a bronze rim, and three plaques
    with runes on the bowl that kindle with it. `flame` and `glow` show once lit; `runes` (their own material) turn
    from cold to lit. */
export function brazierLook() {
  const g = new THREE.Group(), pal: FirePalette = EMBER_FIRE;
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + Math.PI / 2, foot = new THREE.Vector3(Math.cos(a) * .3, .03, Math.sin(a) * .3), top = new THREE.Vector3(Math.cos(a) * .16, .6, Math.sin(a) * .16);
    const d = top.clone().sub(foot), leg = mesh(g, GEO.leg, MAT.iron); leg.scale.y = d.length();
    leg.position.copy(foot).addScaledVector(d, .5); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    mesh(g, GEO.claw, MAT.bronze, foot.x, 0, foot.z);
  }
  mesh(g, GEO.collar, MAT.iron, 0, .3, 0).scale.setScalar(1.05);
  mesh(g, GEO.bowl, MAT.iron, 0, .54, 0); mesh(g, GEO.rim, MAT.bronze, 0, .82, 0); mesh(g, GEO.coals, MAT.coals, 0, .78, 0);
  for (let i = 0; i < 9; i++) { // coals heaped in the bowl, a few still glowing
    const a = i * 2.4, r = i ? .1 + (i % 3) * .07 : 0, c = mesh(g, GEO.lump, i === 2 || i === 7 ? MAT.ember : MAT.coals, Math.cos(a) * r, .82 + (i ? .01 : .05), Math.sin(a) * r);
    c.rotation.set(i, i * 2, 0); c.scale.setScalar(c.material === MAT.ember ? .6 : .8 + (i % 4) * .15);
  }
  // three plaques on the bowl's sloping side, one turned to the camera, each with a rune
  const runeParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + Math.PI / 2, x = Math.cos(a) * .335, z = Math.sin(a) * .335;
    const p = mesh(g, GEO.plaque, MAT.bronze, x, .7, z); p.rotation.set(-.1, Math.PI / 2 - a, 0, 'YXZ');
    p.updateMatrix();
    runeParts.push(GEO.rune.clone().scale(1.05, 1.05, 1).translate(0, 0, .016).applyMatrix4(p.matrix));
  }
  const runes = new THREE.Mesh(joinAll(runeParts), new THREE.MeshBasicMaterial({ color: RUNE_COLD })); // (its own material: lit, it glows)
  const flame = makeFire([{ x: 0, y: .84, z: 0, h: .85, w: .3, tongues: 4 }, { x: .15, y: .84, z: .05, h: .48, w: .17, beat: 4.1 }, { x: -.13, y: .84, z: -.06, h: .55, w: .17, beat: 5.3 }], pal, 8, .9);
  const gl = glow(pal.body, 1.5, .55); gl.position.y = 1.1;
  flame.visible = gl.visible = false; g.add(runes, flame, gl, blob(.9));
  return { group: g, parts: { flame, glow: gl, runes } };
}

/** The candle stand: a pole on a clawed foot with two bronze knops, a dish with a bronze rim, and three to five candles
    of different heights with wax running down them. `flames` (every candle's flame and the glow) shows once lit. */
export function candleStandLook(R: () => number) {
  const g = new THREE.Group(), flames = new THREE.Group();
  mesh(g, GEO.foot, MAT.iron, 0, .025, 0);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 2; mesh(g, GEO.claw, MAT.iron, Math.cos(a) * .2, 0, Math.sin(a) * .2).scale.setScalar(.8); }
  mesh(g, GEO.pole, MAT.iron, 0, .41, 0); mesh(g, GEO.knop, MAT.bronze, 0, .3, 0); mesh(g, GEO.knop, MAT.bronze, 0, .62, 0).scale.setScalar(.8);
  mesh(g, GEO.dish, MAT.iron, 0, .78, 0); mesh(g, GEO.dishRim, MAT.bronze, 0, .8, 0); mesh(g, GEO.pool, MAT.wax, 0, .8, 0);
  const n = 3 + Math.floor(R() * 3), specs: FlameSpec[] = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + R(), r = i === 0 && n > 3 ? 0 : .12 + R() * .04, x = Math.cos(a) * r, z = Math.sin(a) * r, h = .1 + R() * .18;
    const c = mesh(g, GEO.candle, MAT.wax, x, .8 + h / 2, z); c.scale.y = h;
    for (let k = 0; k < 1 + (R() < .5 ? 1 : 0); k++) { const b = R() * Math.PI * 2; mesh(g, GEO.drip, MAT.wax, x + Math.cos(b) * .036, .8 + h * (.5 + R() * .45), z + Math.sin(b) * .036).scale.y = 1.6; }
    specs.push({ x, y: .8 + h, z, h: .12, w: .06 });
  }
  flames.add(makeFire(specs, EMBER_FIRE, 3, .3));
  const gl = glow(EMBER_FIRE.body, 1.1, .7); gl.position.y = 1.05; flames.add(gl);
  flames.visible = false; g.add(flames, blob(.6));
  return { group: g, parts: { flames } };
}
