/* The bestiary's elementals (M4.5): golems and living elements, each made of what it is and touching the room as its
   element does (docs/archive/M4.5-plan.md). Each stands (or hovers) over y = 0 facing +Z and idles; parts a foe's behaviour will
   move are named in `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { gloss, joint, jointed, slitEyes, spike, tube, type Built } from './beastParts';

const { ember: E, frost: F, storm: S } = SCHOOL_LIGHT;

/** Floor 2, water: a figure of water risen out of its own pool, a churning crest for a head, arms that pour back into the
    pool and a cold light at its heart. */
export function puddleElemental(): Built {
  const g = new THREE.Group(), water = std(0x3f8eb8, { transparent: true, opacity: .72, roughness: .06, metalness: .25 }), foam = std(0xe4f6ff, { transparent: true, opacity: .85, roughness: .2 }), heartM = lit(F);
  part(g, new THREE.CircleGeometry(.7, 18), std(0x1a4a60, { roughness: .08, metalness: .3, transparent: true, opacity: .9 }), [0, .008, 0], { rot: [-Math.PI / 2, 0, 0] });
  const ripples = [0, 1].map(() => part(g, new THREE.RingGeometry(.9, 1, 24), shine(0xbfeaff, .4), [0, .012, 0], { rot: [-Math.PI / 2, 0, 0] }));
  const body = joint(g, [0, 0, 0]);
  // a swirl rising out of the pool into a chest and shoulders, a head on top
  const profile = [[.48, 0], [.36, .08], [.22, .24], [.17, .42], [.24, .6], [.36, .74], [.4, .84], [.3, .92], [.14, .96], [0, .97]].map(([r, y]) => new THREE.Vector2(r, y));
  part(body, new THREE.LatheGeometry(profile, 12), water, [0, 0, 0], { scale: [1.15, 1, .8] });
  for (let i = 0; i < 3; i++) part(body, new THREE.TorusGeometry(.28 - i * .05, .022, 4, 14), foam, [0, .1 + i * .14, 0], { rot: [Math.PI / 2 + .2, .1 * i, 0], scale: [1, .8, 1] });
  const heart = part(body, sphere(.1, 8, 6), heartM, [0, .7, .06]);
  const shine1 = glow(F, .7, .45); shine1.position.set(0, .7, .06); body.add(shine1);
  const headG = joint(body, [0, 1.1, .04]);
  part(headG, sphere(.19, 10, 8), water, [0, 0, 0], { scale: [1, 1.05, .95] });
  slitEyes(headG, .08, .02, .15, .05, 0xe8faff, .45, .3);
  const crest = joint(headG, [0, .12, -.04]);
  for (let i = 0; i < 7; i++) { const a = (i - 3) * .35; spike(crest, [Math.sin(a) * .1, 0, -.04], [Math.sin(a) * .22, .2 + (i % 2) * .1, -.2], .05, i % 2 ? foam : water); }
  const arms = ([-1, 1] as const).map(s => { const a = joint(body, [.38 * s, .84, 0]); tube(a, [[0, 0, 0], [.16 * s, -.06, .06], [.28 * s, -.3, .14], [.3 * s, -.52, .18]], .13, .1, water, 12, 7); part(a, sphere(.15, 8, 6), foam, [.3 * s, -.6, .18], { scale: [1, .9, 1] }); return a; });
  const bubbles = [0, 1, 2, 3, 4].map(i => part(body, sphere(.025 + (i % 2) * .015, 5, 4), foam, [0, 0, 0]));
  return { group: g, shadow: 0, parts: { body, crest }, idle: t => {
    body.scale.set(1 + Math.sin(t * 2) * .03, 1 + Math.sin(t * 2 + 1) * .03, 1); crest.rotation.y = t * .8;
    arms.forEach((a, i) => { a.rotation.z = Math.sin(t * 1.5 + i * Math.PI) * .08; });
    bubbles.forEach((b, i) => { const k = (t * .3 + i / 5) % 1; b.position.set(Math.sin(i * 2.3) * .14, .1 + k * .85, Math.cos(i * 1.7) * .12); });
    ripples.forEach((r, i) => { const k = (t * .45 + i / 2) % 1; r.scale.setScalar(.45 + k * .5); (r.material as THREE.MeshBasicMaterial).opacity = .4 * (1 - k); });
    heart.scale.setScalar(1 + Math.sin(t * 3) * .12);
  } };
}

/** Floor 2, Storm: a thunderhead as wide as a cart, dark and heavy-browed, lightning for eyes and a mouth of it; sparks
    rain from its underside onto the floor its shadow covers. */
export function thunderhead(): Built {
  const g = new THREE.Group(), cloud = joint(g, [0, 1.25, 0]), dark = std(0x34384a, { roughness: 1 }), mid = std(0x4c5266, { roughness: 1 }), top = std(0x6a7086, { roughness: 1 }), bolt = lit(S);
  part(g, new THREE.CircleGeometry(.7, 18), std(0x000000, { transparent: true, opacity: .35 }), [0, .006, 0], { rot: [-Math.PI / 2, 0, 0], scale: [1.2, .9, 1] });
  const glowFloor = part(g, new THREE.CircleGeometry(.6, 16), shine(S, .12), [0, .009, 0], { rot: [-Math.PI / 2, 0, 0] });
  for (const [x, y, z, r, m] of [[0, 0, 0, .38, 0], [-.4, -.06, .02, .3, 0], [.42, -.05, -.02, .32, 0], [-.18, .2, -.1, .3, 1], [.2, .22, -.08, .32, 1], [0, .32, -.22, .26, 2], [-.5, .12, -.18, .22, 2], [.55, .1, -.2, .22, 2], [0, -.1, .18, .28, 1], [-.25, -.12, -.25, .25, 0], [.28, -.1, -.3, .24, 0]] as [number, number, number, number, number][]) {
    part(cloud, sphere(r, 8, 6), [dark, mid, top][m], [x, y, z], { scale: [1.1, .8, 1] });
  }
  // the face: a brow of cloud over two eyes of lightning and a jagged mouth
  for (const s of [-1, 1]) part(cloud, sphere(.16, 6, 5), mid, [.17 * s, .12, .32], { rot: [0, 0, -.5 * s], scale: [1.5, .5, .7] });
  const eyes = slitEyes(cloud, .16, .04, .38, .075, S, .25, .35);
  const mouth = joint(cloud, [0, -.13, .38]);
  for (let i = 0; i < 5; i++) part(mouth, new THREE.BoxGeometry(.09, .022, .02), bolt, [-.18 + i * .09, (i % 2 ? .03 : -.03), 0], { rot: [0, 0, i % 2 ? -.6 : .6] });
  const bolts = [[-.3, .1], [.25, -.15]].map(([x, z]) => {
    const b = joint(g, [x, 0, z]); let y = 1.05, px = 0;
    for (let k = 0; k < 5; k++) { const ny = y - .21, nx = (k % 2 ? .08 : -.08); part(b, new THREE.BoxGeometry(.025, Math.hypot(.21, nx - px), .025), bolt, [(px + nx) / 2, (y + ny) / 2, 0], { rot: [0, 0, Math.atan2(nx - px, .21)] }); y = ny; px = nx; }
    return b;
  });
  const rain = joint(g, [0, 0, 0]);
  for (let i = 0; i < 12; i++) part(rain, new THREE.BoxGeometry(.012, .12, .012), shine(S, .8), [Math.sin(i * 2.4) * .5, (i * .37) % 1.1, Math.cos(i * 1.9) * .35]);
  return { group: g, shadow: 0, parts: { cloud }, idle: t => {
    cloud.position.y = 1.25 + Math.sin(t * 1.2) * .05; cloud.rotation.y = Math.sin(t * .5) * .1;
    const flash = Math.floor(t * 7) % 9; bolts.forEach((b, i) => { b.visible = flash === i * 4; });
    rain.position.y = -((t * 1.6) % 1.1) + .05; glowFloor.material.opacity = .08 + (flash < 2 ? .12 : 0);
    for (const e of eyes) e.scale.y = .38 * (flash === 6 ? .3 : 1);
  } };
}

/** Floor 3, Ember: a djinn of living fire, a chest and horned head of coal split by cracks of flame, arms ending in fire
    and a fireball held ready; below the waist it is all flame, curling to a tip. */
export function cinderDjinn(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .3, 0]), coal = std(0x3a2418, { roughness: 1 }), crack = lit(E), hot = lit(0xffd36a), flameM = lit(0xff8a2a), sheath = shine(E, .5);
  const tail = joint(body, [0, .35, 0]);
  const flow: V3[] = [[0, .1, 0], [0, -.1, -.06], [.05, -.25, -.18], [.17, -.3, -.3], [.23, -.18, -.36]];
  tube(tail, flow, .2, .02, flameM, 14, 7);
  tube(tail, flow.map(([x, y, z]) => [x * 1.05, y, z * 1.05 - .01] as V3), .27, .04, sheath, 14, 7);
  part(body, sphere(.22, 10, 8), coal, [0, .58, 0], { scale: [1.2, 1, .8] });
  for (const [x, y, r, len] of [[-.08, .62, .5, .16], [.07, .55, -.6, .14], [0, .48, .1, .12], [.12, .68, .9, .1]]) part(body, new THREE.BoxGeometry(.02, len, .02), crack, [x, y, .17], { rot: [0, 0, r] });
  const core = glow(E, 1.1, .5); core.position.set(0, .55, .05); body.add(core);
  for (const s of [-1, 1]) part(body, sphere(.12, 8, 6), coal, [.27 * s, .7, 0]);
  const head = joint(body, [0, .92, .03]);
  part(head, sphere(.14, 10, 8), coal, [0, 0, 0], { scale: [.95, 1.05, .9] });
  for (const s of [-1, 1]) tube(head, [[.08 * s, .07, -.02], [.17 * s, .17, -.05], [.2 * s, .3, -.15], [.15 * s, .38, -.24]], .035, .005, coal, 8, 5);
  slitEyes(head, .055, .02, .12, .035, 0xfff0a0, .5, .4);
  part(head, new THREE.BoxGeometry(.08, .014, .02), hot, [0, -.06, .13]);
  for (let i = 0; i < 6; i++) { const a = (i - 2.5) * .35; spike(head, [Math.sin(a) * .07, .08, -.06], [Math.sin(a) * .14, .26 + (i % 2) * .08, -.22], .04, i % 2 ? hot : flameM); }
  const arms = ([-1, 1] as const).map(s => {
    const a = joint(body, [.3 * s, .7, 0]);
    const hand: V3 = s > 0 ? [.24, .3, .18] : [.2, -.2, .14];
    const handAt: V3 = [hand[0] * s, hand[1], hand[2]];
    jointed(a, [[0, 0, 0], [.16 * s, -.16, .02], handAt], .06, .04, coal);
    for (let k = 0; k < 4; k++) spike(a, handAt, [handAt[0] + (k - 1.5) * .03, handAt[1] + .1, handAt[2] + .03], .02, flameM);
    return { a, handAt };
  });
  const ball = joint(arms[1].a, [arms[1].handAt[0], arms[1].handAt[1] + .14, arms[1].handAt[2]]);
  part(ball, sphere(.09, 8, 6), hot, [0, 0, 0]); const ballGlow = glow(E, .6, .7); ball.add(ballGlow);
  return { group: g, shadow: .8, parts: { body, head, tail }, idle: t => {
    body.position.y = .3 + Math.sin(t * 2) * .05; body.scale.setScalar(1.2); tail.rotation.y = Math.sin(t * 1.5) * .3; tail.scale.setScalar(1 + Math.sin(t * 7) * .05);
    arms.forEach(({ a }, i) => { a.rotation.z = Math.sin(t * 1.6 + i) * .1; }); head.rotation.y = Math.sin(t * .9) * .2;
    ball.scale.setScalar(1 + Math.sin(t * 5) * .15); core.material.opacity = .4 + .15 * Math.sin(t * 6); ballGlow.material.opacity = .5 + .3 * Math.sin(t * 5);
  } };
}

/** Floor 3, Ember: an ooze of molten rock heaving under plates of black crust, eyes of white heat looking out between them;
    the floor round it burns. */
export function magmaOoze(): Built {
  const g = new THREE.Group(), lava = std(0x9a2a08, { emissive: 0xff4a08, emissiveIntensity: .7, roughness: .55 }), crust = std(0x2e2522, { roughness: 1 }), hot = lit(0xffd36a);
  part(g, new THREE.CircleGeometry(.85, 16), shine(E, .22), [0, .008, 0], { rot: [-Math.PI / 2, 0, 0] });
  const body = joint(g, [0, 0, 0]);
  const blob = joint(body, [0, 0, 0]);
  part(blob, sphere(.45, 12, 8), lava, [0, .22, 0], { scale: [1.25, .62, 1.1] });
  for (const [x, z, r] of [[.5, .2, .16], [-.48, .16, .14], [.2, -.48, .13], [-.3, -.4, .12]] as V3[]) part(blob, sphere(r, 8, 6), lava, [x, r * .5, z], { scale: [1.2, .7, 1.2] });
  // plates of black crust over the whole top, the lava showing only in the cracks between them
  const Y = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
  for (let i = 0; i < 26; i++) {
    const y = 1 - (i + .5) / 26 * .95, rr = Math.sqrt(1 - y * y), a = i * 2.39996, nx = Math.cos(a) * rr, nz = Math.sin(a) * rr;
    if (nz > .55 && Math.abs(nx) < .5 && y < .7) continue;
    const plate = part(blob, rough(new THREE.DodecahedronGeometry(.15, 0), .03, i), crust, [nx * .56, .22 + y * .27, nz * .5], { scale: [1.15, .38, 1.15] });
    plate.quaternion.setFromUnitVectors(Y, n.set(nx / 1.25, y / .62, nz / 1.1).normalize());
  }
  slitEyes(blob, .12, .4, .38, .055, 0xfff0a0, .4, .35);
  part(blob, new THREE.BoxGeometry(.2, .03, .02), hot, [0, .3, .45], { rot: [0, 0, 0] });
  const bubbles = [0, 1, 2, 3].map(i => part(blob, sphere(.05, 6, 5), hot, [Math.sin(i * 2.2) * .3, .4, Math.cos(i * 2.2) * .25 + .05]));
  const heat = glow(E, 1.4, .35); heat.position.y = .3; body.add(heat);
  return { group: g, shadow: 0, parts: { body, blob }, idle: t => {
    blob.scale.set(1 + Math.sin(t * 1.7) * .05, 1 - Math.sin(t * 1.7) * .06, 1 + Math.sin(t * 1.7 + 1) * .04);
    bubbles.forEach((b, i) => { const k = (t * .6 + i / 4) % 1; b.scale.setScalar(k < .8 ? k * 1.2 : (1 - k) * 4); });
    heat.material.opacity = .28 + .1 * Math.sin(t * 3);
  } };
}

/** A golem's block of `w`, `h`, `d` at `at`, a little out of true. */
const block = (parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, at: V3, rot: V3 = [0, 0, 0], seed = 0) => part(parent, rough(new THREE.BoxGeometry(w, h, d, 2, 2, 2), Math.min(w, h, d) * .08, seed), mat, at, { rot });

/** Floor 3, Frost: a hulking golem of salt cut in blocks, candles burning on its shoulders and head and their wax running
    down it, a single cold slit of an eye. */
export function saltGolem(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), salt = std(0xf2f0ec, { roughness: .6 }), shade = std(0xd2d4d8, { roughness: .7 }), crystal = std(0xe8f4ff, { roughness: .15, metalness: .15 }), wax = std(0xf0e2c6), flame = lit(0xffd36a);
  for (const s of [-1, 1]) block(body, .2, .4, .22, shade, [.15 * s, .2, 0], [0, .1 * s, 0], s + 2);
  block(body, .46, .22, .32, shade, [0, .44, 0], [0, .05, 0], 1);
  const torso = joint(body, [0, .55, 0]);
  block(torso, .6, .48, .4, salt, [0, .28, 0], [.05, -.06, .03], 2);
  block(torso, .3, .2, .26, salt, [0, .6, .08], [.1, .1, 0], 3);
  part(torso, new THREE.BoxGeometry(.2, .03, .02), lit(F), [0, .62, .22]);
  for (const s of [-1, 1]) block(torso, .26, .22, .3, salt, [.4 * s, .44, 0], [0, 0, .2 * s], 4 + s);
  for (const [p, h, r] of [[[-.18, .58, -.15], .22, [-.4, 0, .3]], [[.12, .55, -.18], .18, [-.5, 0, -.4]], [[.3, .62, -.05], .16, [0, 0, -.7]], [[-.42, .58, .05], .14, [0, 0, .6]]] as [V3, number, V3][]) part(torso, new THREE.OctahedronGeometry(h / 2), crystal, p, { rot: r, scale: [.45, 1, .45] });
  const candles: THREE.Sprite[] = [];
  for (const [x, y, z, h] of [[-.44, .58, .05, .2], [-.34, .58, -.06, .14], [.08, .72, .02, .16], [.42, .58, .08, .12]]) {
    part(torso, new THREE.CylinderGeometry(.035, .04, h, 6), wax, [x, y + h / 2, z]);
    part(torso, new THREE.ConeGeometry(.025, .07, 5), flame, [x, y + h + .04, z]);
    const gl = glow(0xffb050, .3, .6); gl.position.set(x, y + h + .05, z); torso.add(gl); candles.push(gl);
    part(torso, sphere(.03, 5, 4), wax, [x + .02, y - .06, z + .1], { scale: [.8, 2.2, .8] });
  }
  const arms = ([-1, 1] as const).map(s => {
    const a = joint(torso, [.42 * s, .42, 0]);
    block(a, .18, .3, .18, shade, [.04 * s, -.2, 0], [0, 0, .1 * s], 6);
    block(a, .16, .26, .16, salt, [.07 * s, -.46, .03], [0, 0, 0], 7);
    block(a, .24, .22, .24, salt, [.08 * s, -.68, .05], [.2, .3, 0], 8);
    return a;
  });
  return { group: g, shadow: 1.1, parts: { body, torso }, idle: t => {
    torso.rotation.y = Math.sin(t * .8) * .06; torso.position.y = .55 + Math.sin(t * 1.6) * .01;
    arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 1.2 + i * Math.PI) * .08; });
    candles.forEach((c, i) => { c.material.opacity = .45 + .2 * Math.sin(t * 9 + i * 2); });
  } };
}

/** Floor 3, earth: a golem of rubble and broken masonry, hunched on its knuckles, a seam of light splitting its chest. */
export function rubbleGolem(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), stone = std(0x7a746a, { roughness: 1 }), dressed = std(0x9a9284, { roughness: .9 }), dark = std(0x55504a, { roughness: 1 }), moss = std(0x5a6a3a), seam = lit(0xffd890);
  for (const s of [-1, 1]) { part(body, rough(new THREE.DodecahedronGeometry(.17, 0), .03, s), dark, [.18 * s, .17, -.05]); part(body, rough(new THREE.DodecahedronGeometry(.14, 0), .03, s + 3), stone, [.2 * s, .38, -.04]); }
  const torso = joint(body, [0, .5, 0], [.25, 0, 0]);
  part(torso, rough(new THREE.DodecahedronGeometry(.4, 1), .05, 1), stone, [0, .36, 0], { scale: [1.2, 1, .85] });
  block(torso, .3, .22, .2, dressed, [-.18, .52, .22], [.2, .3, .1], 2); block(torso, .24, .18, .2, dressed, [.22, .3, .24], [-.1, -.3, .2], 3);
  let y = .62, x = 0; for (let i = 0; i < 6; i++) { const ny = y - .1, nx = i % 2 ? .05 : -.04; part(torso, new THREE.BoxGeometry(.035, .12, .03), seam, [(x + nx) / 2, (y + ny) / 2, .34 - Math.abs(.36 - y) * .1], { rot: [0, 0, Math.atan2(nx - x, .1)] }); y = ny; x = nx; }
  const heart = glow(0xffd890, .7, .55); heart.position.set(0, .4, .3); torso.add(heart);
  for (const [p, r] of [[[.24, .62, -.1], .12], [[-.28, .5, -.15], .1]] as [V3, number][]) part(torso, sphere(r, 6, 4), moss, p, { scale: [1.2, .4, 1] });
  const head = joint(torso, [0, .76, .2]);
  block(head, .24, .2, .22, dressed, [0, 0, 0], [0, 0, 0], 5);
  for (const s of [-1, 1]) part(head, new THREE.BoxGeometry(.05, .03, .02), seam, [.06 * s, .01, .115]);
  const arms = ([-1, 1] as const).map(s => {
    const a = joint(torso, [.5 * s, .6, 0]);
    part(a, rough(new THREE.DodecahedronGeometry(.2, 0), .03, s * 2), stone, [0, 0, 0]);
    part(a, rough(new THREE.DodecahedronGeometry(.13, 0), .03, s * 3), dark, [.08 * s, -.26, .1]);
    part(a, rough(new THREE.DodecahedronGeometry(.11, 0), .03, s * 4), stone, [.1 * s, -.48, .18]);
    block(a, .3, .26, .3, dressed, [.1 * s, -.72, .24], [.2, .3 * s, 0], s + 6);
    return a;
  });
  return { group: g, shadow: 1.3, parts: { body, torso, head }, idle: t => {
    torso.rotation.x = .25 + Math.sin(t * 1.1) * .04; head.rotation.y = Math.sin(t * .7) * .25;
    arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 1.1 + i * Math.PI) * .06; });
    heart.material.opacity = .4 + .2 * Math.sin(t * 2.2);
  } };
}

/** Floor 4, Storm: a golem of dark lodestone bound in iron bands, its forearms and fists hanging apart from it, held only
    by its pull; iron filings bristle on its shoulders and stones circle it; a storm-lit core shows in its chest. */
export function lodestoneGolem(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), lode = gloss(0x5c5a72, .5, .3), iron = gloss(0x9a9aa6, .35, .6), filing = std(0xb0b0b8, { metalness: .5, roughness: .5 }), coreM = lit(S), field = shine(S, .35);
  for (const s of [-1, 1]) { part(body, rough(new THREE.DodecahedronGeometry(.15, 0), .03, s), lode, [.17 * s, .16, 0]); part(body, new THREE.TorusGeometry(.13, .025, 4, 10), iron, [.17 * s, .26, 0], { rot: [Math.PI / 2, 0, 0] }); }
  const torso = joint(body, [0, .5, 0]);
  part(torso, rough(new THREE.DodecahedronGeometry(.36, 1), .04, 2), lode, [0, .32, 0], { scale: [1.15, 1, .8] });
  for (const [y, r] of [[.18, .36], [.46, .38]]) part(torso, new THREE.TorusGeometry(r, .03, 4, 14), iron, [0, y, 0], { rot: [Math.PI / 2, 0, 0], scale: [1.1, .78, 1] });
  part(torso, sphere(.1, 8, 6), coreM, [0, .34, .26]);
  const coreGlow = glow(S, .8, .6); coreGlow.position.set(0, .34, .28); torso.add(coreGlow);
  const arcs = [0, 1].map(i => part(torso, new THREE.TorusGeometry(.2 + i * .08, .008, 3, 20, Math.PI * 1.2), field, [0, .34, .28], { rot: [0, 0, i * 1.4] }));
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) spike(torso, [.28 * s + (i % 3 - 1) * .06, .58, (Math.floor(i / 3) - 1) * .07], [.3 * s + (i % 3 - 1) * .08, .72 + (i % 2) * .04, (Math.floor(i / 3) - 1) * .09], .012, filing);
  const head = joint(torso, [0, .7, .1]);
  part(head, rough(new THREE.BoxGeometry(.22, .17, .2, 2, 2, 2), .02, 4), lode, [0, 0, 0]);
  part(head, new THREE.BoxGeometry(.14, .025, .02), coreM, [0, .01, .105]);
  const arms = ([-1, 1] as const).map(s => {
    part(torso, rough(new THREE.DodecahedronGeometry(.16, 0), .03, s * 5), lode, [.44 * s, .5, 0]);
    const a = joint(torso, [.5 * s, .2, .05]);
    part(a, rough(new THREE.BoxGeometry(.16, .26, .16, 2, 2, 2), .02, s * 6), lode, [0, 0, 0]);
    part(a, new THREE.TorusGeometry(.11, .02, 4, 10), iron, [0, -.06, 0], { rot: [Math.PI / 2, 0, 0] });
    const fist = joint(a, [0, -.3, .06]);
    part(fist, rough(new THREE.BoxGeometry(.24, .22, .24, 2, 2, 2), .02, s * 7), iron, [0, 0, 0]);
    return { a, fist };
  });
  const stones = [0, 1, 2, 3].map(i => part(g, rough(new THREE.DodecahedronGeometry(.07 + (i % 2) * .03, 0), .015, i), lode, [0, 0, 0]));
  return { group: g, shadow: 1.1, parts: { body, torso }, idle: t => {
    torso.position.y = .5 + Math.sin(t * 1.4) * .015;
    arms.forEach(({ a, fist }, i) => { a.position.y = .2 + Math.sin(t * 1.8 + i * 2) * .03; fist.position.y = -.3 + Math.sin(t * 2.1 + i) * .03; });
    stones.forEach((st, i) => { const a = t * .9 + i * Math.PI / 2; st.position.set(Math.cos(a) * .75, .9 + Math.sin(t * 1.3 + i) * .15, Math.sin(a) * .6); st.rotation.set(t + i, t * .7, 0); });
    arcs.forEach((ar, i) => { ar.rotation.z = t * (i ? -2 : 1.6); }); coreGlow.material.opacity = .45 + .25 * Math.sin(t * 5);
  } };
}

/** Floor 4, Ember (elite): a walking brazier taller than the mage, a cage of black iron with fire roaring inside it, its
    bowl for a head and a grate for a face, heavy stone arms bound in iron. */
export function hearthGolem(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), iron = gloss(0x2e2a2c, .45, .6), stone = std(0x6a625a, { roughness: 1 }), coals = std(0x3a1a0e, { emissive: 0xff4a10, emissiveIntensity: .9 }), flame = lit(0xff9a3a), hot = lit(0xffd36a);
  for (const s of [-1, 1]) { tube(body, [[.16 * s, .62, 0], [.2 * s, .32, .06], [.18 * s, .05, .02]], .07, .06, iron, 6, 6); part(body, new THREE.BoxGeometry(.18, .07, .26), iron, [.18 * s, .035, .05]); }
  const torso = joint(body, [0, .62, 0]);
  part(torso, new THREE.CylinderGeometry(.3, .24, .08, 10), iron, [0, 0, 0]);
  part(torso, new THREE.CylinderGeometry(.26, .22, .5, 10), coals, [0, .3, 0]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; part(torso, new THREE.CylinderGeometry(.018, .018, .62, 4), iron, [Math.cos(a) * .31, .32, Math.sin(a) * .31]); }
  for (const y of [.18, .46]) part(torso, new THREE.TorusGeometry(.31, .022, 4, 16), iron, [0, y, 0], { rot: [Math.PI / 2, 0, 0] });
  const fireIn = joint(torso, [0, .32, 0]);
  for (let i = 0; i < 7; i++) { const a = i * 2.4; part(fireIn, new THREE.ConeGeometry(.07, .3, 5), i % 2 ? flame : hot, [Math.cos(a) * .14, 0, Math.sin(a) * .14]); }
  const heat = glow(E, 1.4, .55); heat.position.y = .3; torso.add(heat);
  // the bowl it wears for a head, flames leaping out of it, the grate of its face
  const head = joint(torso, [0, .66, 0]);
  part(head, new THREE.LatheGeometry([[.1, -.08], [.26, -.02], [.36, .1], [.38, .16]].map(([r, y]) => new THREE.Vector2(r, y)), 12), iron, [0, 0, 0]);
  part(head, new THREE.CylinderGeometry(.34, .34, .02, 12), coals, [0, .12, 0]);
  for (let i = 0; i < 5; i++) part(head, new THREE.BoxGeometry(.025, .2, .025), iron, [-.12 + i * .06, .02, .3], { rot: [-.4, 0, 0] });
  for (const s of [-1, 1]) part(head, sphere(.04, 6, 5), hot, [.08 * s, .04, .26], { scale: [1.3, .7, .5] });
  const flames = joint(head, [0, .16, 0]);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i ? .2 : 0; part(flames, new THREE.ConeGeometry(.09 - r * .15, .5 - r * .6, 5), i % 2 ? flame : hot, [Math.cos(a) * r, .2 - r * .25, Math.sin(a) * r]); }
  const crown = glow(E, 1.2, .55); crown.position.y = .35; head.add(crown);
  for (const s of [-1, 1]) for (const z of [-.1, .1]) part(head, new THREE.TorusGeometry(.03, .008, 3, 6), iron, [.37 * s, .05, z], { rot: [0, Math.PI / 2, 0] });
  const arms = ([-1, 1] as const).map(s => {
    const a = joint(torso, [.36 * s, .42, 0]);
    part(a, rough(new THREE.DodecahedronGeometry(.17, 0), .03, s), stone, [.04 * s, 0, 0]);
    tube(a, [[.06 * s, -.1, 0], [.12 * s, -.36, .06], [.14 * s, -.6, .1]], .1, .085, stone, 6, 6);
    part(a, new THREE.TorusGeometry(.1, .025, 4, 10), iron, [.12 * s, -.4, .07], { rot: [Math.PI / 2, 0, 0] });
    part(a, rough(new THREE.BoxGeometry(.24, .22, .26, 2, 2, 2), .03, s + 3), stone, [.15 * s, -.74, .12]);
    return a;
  });
  return { group: g, shadow: 1.4, parts: { body, torso, head, flames, fireIn, heat, crown }, idle: t => {
    torso.rotation.y = Math.sin(t * .7) * .08; arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 1.1 + i * Math.PI) * .1; });
    flames.scale.set(1, 1 + Math.sin(t * 7) * .12, 1); fireIn.scale.y = 1 + Math.sin(t * 8 + 1) * .15;
    heat.material.opacity = .45 + .12 * Math.sin(t * 5); crown.material.opacity = .45 + .15 * Math.sin(t * 6 + 2);
  } };
}

/** Floor 5, Frost (elite): a golem of glacier ice taller than any door, a dark frozen heart showing through its chest, a
    mantle of jagged shoulder crystals and fists like boulders of ice. */
export function glacierGolem(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), ice = std(0x9ad0f0, { roughness: .1, metalness: .15, transparent: true, opacity: .9 }), deep = std(0x5a9ccc, { roughness: .15, metalness: .15 }), snow = std(0xeef6ff, { roughness: 1 }), heartM = std(0x10284a, { roughness: .3 }), eye = lit(F);
  for (const s of [-1, 1]) { part(body, rough(new THREE.BoxGeometry(.26, .5, .3, 2, 3, 2), .03, s), deep, [.2 * s, .25, 0]); part(body, rough(new THREE.BoxGeometry(.32, .14, .4, 2, 2, 2), .03, s + 4), ice, [.2 * s, .07, .05]); }
  const torso = joint(body, [0, .55, 0]);
  part(torso, rough(new THREE.IcosahedronGeometry(.45, 1), .06, 2), ice, [0, .5, 0], { scale: [1.2, 1.05, .85] });
  part(torso, rough(new THREE.IcosahedronGeometry(.3, 1), .04, 3), deep, [0, .1, 0], { scale: [1.1, .8, .9] });
  part(torso, sphere(.16, 8, 6), heartM, [0, .5, .18]);
  const heart = glow(F, .9, .5); heart.position.set(0, .5, .3); torso.add(heart);
  part(torso, rough(new THREE.IcosahedronGeometry(.4, 1), .03, 6), snow, [0, .9, -.05], { scale: [1.1, .25, .75] });
  for (const [p, h, rot] of [[[-.5, .9, 0], .55, [0, 0, .6]], [[.5, .9, 0], .55, [0, 0, -.6]], [[-.3, 1.0, -.15], .45, [-.3, 0, .3]], [[.32, 1.0, -.12], .5, [-.3, 0, -.3]], [[0, 1.0, -.25], .4, [-.6, 0, 0]], [[-.58, .78, .1], .3, [.3, 0, 1]], [[.6, .78, .1], .3, [.3, 0, -1]]] as [V3, number, V3][]) part(torso, new THREE.OctahedronGeometry(h / 2), ice, p, { rot, scale: [.42, 1, .42] });
  const head = joint(torso, [0, .92, .22]);
  part(head, rough(new THREE.IcosahedronGeometry(.15, 0), .02, 7), deep, [0, 0, 0], { scale: [1.2, .8, 1] });
  part(head, new THREE.BoxGeometry(.18, .03, .02), eye, [0, 0, .14]);
  const arms = ([-1, 1] as const).map(s => {
    const a = joint(torso, [.55 * s, .7, 0]);
    tube(a, [[0, 0, 0], [.12 * s, -.3, .04], [.14 * s, -.62, .1]], .16, .13, ice, 6, 7);
    part(a, rough(new THREE.IcosahedronGeometry(.25, 1), .04, s + 9), deep, [.15 * s, -.82, .14]);
    for (let k = 0; k < 3; k++) part(a, new THREE.OctahedronGeometry(.07), ice, [.15 * s + (k - 1) * .1, -.68, .3], { scale: [.5, 1.3, .5], rot: [.8, 0, (k - 1) * .4] });
    return a;
  });
  const mist = [0, 1, 2].map(() => part(g, sphere(.2, 6, 5), shine(0xd8f0ff, .12), [0, .1, 0]));
  return { group: g, shadow: 1.6, parts: { body, torso, head }, idle: t => {
    torso.rotation.y = Math.sin(t * .6) * .06; torso.position.y = .55 + Math.sin(t * 1.2) * .01;
    arms.forEach((a, i) => { a.rotation.x = Math.sin(t * .9 + i * Math.PI) * .07; });
    heart.material.opacity = .35 + .2 * Math.sin(t * 1.8);
    mist.forEach((m, i) => { const k = (t * .25 + i / 3) % 1; m.position.set(Math.sin(i * 2.1) * .5, .08 + k * .2, Math.cos(i * 2.1) * .4); m.scale.setScalar(1 + k * 1.5); (m.material as THREE.MeshBasicMaterial).opacity = .12 * (1 - k); });
  } };
}

/** One of the stones a rubble golem breaks into (floor 3): a boulder rolling on its own, a seam of storm light across it. */
export function rubbleStone(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .26, 0]), stone = std(0x7a746a, { roughness: 1 }), seam = lit(0xffd890);
  part(body, rough(new THREE.DodecahedronGeometry(.27, 1), .04, 7), stone, [0, 0, 0]);
  part(body, new THREE.TorusGeometry(.27, .018, 4, 16), seam, [0, 0, 0], { rot: [0, Math.PI / 2, .3] });
  return { group: g, shadow: .6, parts: { body }, idle: () => { /* (it rolls as it goes: its behaviour turns it) */ } };
}
