/* The bestiary's beasts (M4.5): animals of the dungeon, larger and stranger than life, each built to read at a glance as
   what it is (docs/M4.5-plan.md). Each stands on y = 0 facing +Z and idles; parts a foe's behaviour will move are named in
   `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { featherWing, gloss, joint, jointed, slitEyes, spike, tube, type Built } from './beastParts';

const { frost: F, umbral: U } = SCHOOL_LIGHT;

/** Floor 2, Umbral: a puffball fungus the height of a child, walking on roots; its cap is warted and split by a gill-lined
    maw, and spores glow in its vents as it swells. */
export function puffcap(): Built {
  const g = new THREE.Group(), cap = std(0x6c4a86, { roughness: .95 }), wart = std(0xcab8da), stem = std(0xd6c8aa), root = std(0x8a7656), gill = std(0xe8d0e8), vent = lit(U);
  const body = joint(g, [0, 0, 0]);
  const legs = [0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 + Math.PI / 4, c = Math.sin(a), s = Math.cos(a), l = joint(body, [0, .3, 0]); tube(l, [[c * .08, 0, s * .08], [c * .26, -.1, s * .26], [c * .36, -.29, s * .36], [c * .46, -.3, s * .44]], .07, .015, root, 8, 5); return l; });
  part(body, new THREE.CylinderGeometry(.16, .22, .36, 8), stem, [0, .44, 0]);
  const ball = joint(body, [0, .78, 0]);
  part(ball, sphere(.38, 14, 10), cap, [0, 0, 0], { scale: [1, .86, 1] });
  for (let i = 0; i < 16; i++) { const a = i * 2.4, b = .3 + (i % 4) * .28; part(ball, sphere(.035 + (i % 3) * .01, 5, 4), wart, [Math.cos(a) * Math.sin(b) * .37, Math.cos(b) * .32, Math.sin(a) * Math.sin(b) * .37]); }
  const vents = [[-.2, .24, .1], [.22, .2, -.08], [.02, .3, -.2], [-.12, .1, -.3], [.28, .02, .14]].map(p => part(ball, sphere(.045, 6, 4), vent, p as V3, { scale: [1, .5, 1] }));
  const maw = joint(ball, [0, -.06, .3]);
  part(maw, sphere(.2, 10, 4), lit(0x12081a), [0, 0, 0], { scale: [1.25, .3, .35] });
  for (let i = 0; i < 9; i++) spike(maw, [-.2 + i * .05, .06, .04], [-.2 + i * .05, .0, .06], .016, gill);
  for (let i = 0; i < 8; i++) spike(maw, [-.17 + i * .05, -.06, .04], [-.17 + i * .05, -.005, .06], .014, gill);
  slitEyes(ball, .13, .1, .31, .045, U, .4, .4);
  const puff = [0, 1, 2, 3].map(i => part(g, sphere(.06 + i * .02, 6, 5), shine(U, .3), [0, 1.2, 0]));
  return { group: g, shadow: 1, parts: { body, ball }, idle: t => {
    const sw = (Math.sin(t * 1.6) + 1) / 2; ball.scale.setScalar(1 + sw * .12); body.position.y = Math.abs(Math.sin(t * 2.4)) * .015;
    vents.forEach((v, i) => { v.scale.set(1 + sw * .5, .5, 1 + sw * .5); v.visible = true; void i; });
    legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 2.4 + i) * .08; });
    puff.forEach((p, i) => { const k = (t * .35 + i / 4) % 1; p.position.set(Math.sin(i * 2 + t) * .15, 1.1 + k * .6, Math.cos(i * 2) * .1); (p.material as THREE.MeshBasicMaterial).opacity = .3 * (1 - k); });
  } };
}

/** Floor 4, Frost: a scarab as big as a shield, its shell rimed blue, a forked horn and spiked legs, rolling a ball of
    snow and ice that grows as it goes. */
export function rimeScarab(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), shell = gloss(0x3a6a9a, .3, .55), dark = gloss(0x16243a, .35, .45), rime = std(0xe6f4ff), snow = std(0xf4f8ff, { roughness: 1 }), ice = lit(F);
  part(body, sphere(.3, 12, 8), shell, [0, .3, -.12], { scale: [1, .62, 1.25] });
  part(body, new THREE.BoxGeometry(.012, .2, .7), dark, [0, .45, -.12]);
  for (let i = 0; i < 5; i++) part(body, sphere(.04, 5, 4), rime, [(i % 2 ? .1 : -.12) + i * .01, .46, -.3 + i * .1], { scale: [1.5, .3, 1] });
  part(body, sphere(.19, 10, 8), dark, [0, .3, .22], { scale: [1.15, .7, .8] });
  const head = joint(body, [0, .27, .36]);
  part(head, sphere(.1, 8, 6), dark, [0, 0, .02], { scale: [1.2, .6, 1] });
  tube(head, [[0, .03, .06], [0, .14, .14], [0, .3, .12], [0, .36, .04]], .04, .01, shell, 8, 5);
  for (const s of [-1, 1]) { spike(head, [0, .27, .12], [.08 * s, .36, .16], .015, shell); spike(head, [.05 * s, -.03, .1], [.02 * s, -.05, .18], .02, dark); }
  slitEyes(head, .07, .02, .08, .025, F, .7, .2);
  const legs = [-1, 1].flatMap(s => [[.2, [.28, .4, .38], [.24, .3, .58]], [0, [.38, .28, .02], [.46, 0, .02]], [-.22, [.36, .26, -.34], [.42, 0, -.54]]].map(([z, k, f]) => {
    const l = joint(body, [.18 * s, .26, z as number]); const kn = k as number[], ft = f as number[];
    jointed(l, [[0, 0, 0], [(kn[0] - .18) * s, kn[1] - .26, kn[2] - (z as number)], [(ft[0] - .18) * s, ft[1] - .26, ft[2] - (z as number)]], .035, .018, dark, shell);
    for (let i = 0; i < 2; i++) spike(l, [(kn[0] - .14) * s, kn[1] - .3 - i * .06, kn[2] - (z as number)], [(kn[0] - .08) * s, kn[1] - .3 - i * .06, kn[2] - (z as number)], .012, shell);
    return l;
  }));
  const ball = joint(g, [0, .36, .92]);
  part(ball, rough(new THREE.IcosahedronGeometry(.36, 1), .04, 5), snow, [0, 0, 0]);
  for (let i = 0; i < 8; i++) { const a = i * 2.4, b = .4 + (i % 4) * .6, p: V3 = [Math.cos(a) * Math.sin(b) * .36, Math.cos(b) * .36, Math.sin(a) * Math.sin(b) * .36]; part(ball, new THREE.OctahedronGeometry(.06), ice, p, { scale: [.5, 1.2, .5], rot: [a, b, 0] }); }
  const chill = glow(F, .9, .3); ball.add(chill);
  return { group: g, shadow: 1.5, parts: { body, ball }, idle: t => {
    ball.rotation.x = t * .8; body.position.z = Math.sin(t * 1.6) * .03; head.rotation.x = Math.sin(t * 1.6) * .06;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 3.2 + i * 1.7) * .08; }); chill.material.opacity = .22 + .1 * Math.sin(t * 2);
  } };
}

/** Floor 5, Umbral: a raven with wings wider than the mage is tall, black with a violet sheen, ragged at the edges, a
    heavy beak and violet eyes; darkness trails off it like smoke. */
export function gloomRaven(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .95, 0]), black = gloss(0x24203a, .4, .25), sheen = gloss(0x4a3a78, .3, .3), beak = gloss(0x0e0c10, .3, .4), dark = std(0x0a0810, { transparent: true, opacity: .45 }), edge = lit(0x8a5ad8);
  part(body, sphere(.2, 10, 8), black, [0, 0, 0], { scale: [.9, .85, 1.6] });
  part(body, sphere(.15, 8, 6), sheen, [0, .06, .05], { scale: [1, .8, 1.3] });
  const head = joint(body, [0, .08, .32]);
  part(head, sphere(.13, 10, 8), black, [0, 0, 0], { scale: [.9, .95, 1.1] });
  tube(head, [[0, .02, .08], [0, .0, .22], [0, -.05, .32]], .06, .01, beak, 6, 6);
  for (let i = 0; i < 5; i++) spike(head, [(i - 2) * .03, -.06, .02], [(i - 2) * .045, -.16, -.02], .02, black);
  slitEyes(head, .065, .03, .08, .036, 0xd7b0ff, .8, .3);
  const eyeGlow = glow(U, .45, .7); eyeGlow.position.set(0, .03, .1); head.add(eyeGlow);
  const wings = ([-1, 1] as const).map(s => {
    const w = featherWing(body, s, [.12 * s, .08, .03], .78, black, sheen, 9, .55);
    for (let i = 0; i < 4; i++) part(w, new THREE.ConeGeometry(.04, .45 + (i % 2) * .15, 4), i % 2 ? edge : black, [(.55 + i * .07) * s, -.01, -.3 - (i % 2) * .08], { rot: [-Math.PI / 2, 0, -(.4 + i * .12) * s], scale: [1, 1, .2] });
    return w;
  });
  const tail = joint(body, [0, .01, -.3]);
  for (let i = 0; i < 5; i++) { const a = (i - 2) * .16; part(tail, new THREE.ConeGeometry(.06, .42, 4), i % 2 ? sheen : black, [Math.sin(a) * .2, 0, -.2], { rot: [-Math.PI / 2, 0, -a], scale: [1, 1, .2] }); }
  for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) spike(body, [.06 * s, -.16, .05], [.07 * s + k * .03, -.3, .12], .012, beak);
  const smoke = [0, 1, 2, 3, 4].map(() => part(g, sphere(.14, 6, 5), dark, [0, 0, 0]));
  part(g, new THREE.CircleGeometry(.75, 16), std(0x000000, { transparent: true, opacity: .4 }), [0, .007, 0], { rot: [-Math.PI / 2, 0, 0] });
  return { group: g, shadow: 0, parts: { body, head }, idle: t => {
    const f = Math.sin(t * 2.4); wings[0].rotation.z = -.3 - f * .55; wings[1].rotation.z = .3 + f * .55; body.position.y = .95 + Math.sin(t * 2.4 + 1.2) * .06;
    head.rotation.y = Math.sin(t * .8) * .35; tail.rotation.x = Math.sin(t * 2.4) * .06;
    smoke.forEach((p, i) => { const k = (t * .35 + i / 5) % 1; p.position.set(Math.sin(i * 2.2) * .3, .95 - k * .6, -.4 - k * .5); p.scale.setScalar(.6 + k * 1.4); (p.material as THREE.MeshStandardMaterial).opacity = .45 * (1 - k); });
  } };
}

/** Floor 5, Frost: a lean wolf of the grey shore, a ruff of frost crystals raised along its neck and back, head low and
    fangs bared, pale eyes. They hunt in packs. */
export function rimeWolf(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), fur = std(0x98a4b4), back = std(0x5a6474), belly = std(0xd6dee8), nose = gloss(0x16181c, .3, .3), tooth = std(0xf4f0e6), ice = lit(0xbfe8ff);
  body.scale.setScalar(1.15);
  tube(body, [[0, .56, -.42], [0, .6, -.15], [0, .62, .14], [0, .6, .26]], .15, .18, fur, 10, 8);
  part(body, sphere(.2, 10, 8), back, [0, .68, -.1], { scale: [.8, .45, 1.8] });
  part(body, sphere(.16, 8, 6), belly, [0, .5, .18], { scale: [.85, 1.05, 1] });
  for (let i = 0; i < 9; i++) { const k = i / 9; spike(body, [(i % 2 ? .04 : -.04), .72 - k * .04, .3 - k * .7], [(i % 2 ? .08 : -.08), .9 - k * .1, .22 - k * .78], .03 - k * .012, ice); }
  const legs = [-1, 1].flatMap(s => [[.18, 0], [-.36, 1]].map(([z, hind]) => {
    const l = joint(body, [.1 * s, .55, z]);
    const pts: V3[] = hind ? [[0, 0, 0], [.02 * s, -.18, .1], [.02 * s, -.38, -.06], [.02 * s, -.54, .0]] : [[0, 0, 0], [.02 * s, -.24, .02], [.02 * s, -.54, .04]];
    tube(l, pts, hind ? .085 : .06, .035, fur, 8, 6);
    part(l, sphere(.045, 6, 4), back, [.02 * s, -.54, hind ? .04 : .08], { scale: [1, .55, 1.5] });
    return l;
  }));
  const head = joint(body, [0, .62, .4], [.25, 0, 0]);
  part(head, sphere(.13, 10, 8), fur, [0, 0, 0], { scale: [.95, .9, 1.05] });
  part(head, new THREE.ConeGeometry(.08, .26, 6), fur, [0, -.03, .18], { rot: [Math.PI / 2 + .08, 0, 0], scale: [1, 1, .75] });
  part(head, sphere(.025, 6, 4), nose, [0, -.02, .31]);
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(.055, .16, 4), back, [.075 * s, .13, -.03], { rot: [-.3, 0, -.25 * s], scale: [1, 1, .5] });
    for (const z of [.14, .22]) spike(head, [.035 * s, -.08, z], [.033 * s, -.14, z + .01], .012, tooth);
  }
  slitEyes(head, .06, .04, .1, .03, 0xbfe8ff, .55, .4);
  const tail = joint(body, [0, .58, -.48]);
  tube(tail, [[0, 0, 0], [0, -.12, -.16], [.04, -.3, -.24], [.06, -.42, -.22]], .07, .02, fur, 8, 6);
  return { group: g, shadow: 1.2, parts: { body, head, tail }, idle: t => {
    body.position.y = Math.sin(t * 2) * .01; head.rotation.y = Math.sin(t * .9) * .25; head.rotation.x = .25 + Math.sin(t * 1.7) * .05;
    tail.rotation.y = Math.sin(t * 1.4) * .2; legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 2 + i * 1.6) * .04; });
  } };
}

/** Floor 5, Umbral: a pangolin as long as the mage is tall, armoured in rows of dark scales edged with violet, clawed
    forefeet and a heavy scaled tail; dust sheds from it as it moves. */
export function dustPangolin(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), scaleM = gloss(0x4a3e44, .45, .25), edge = gloss(0x6a5a6a, .4, .25), skin = std(0x8a7a72), claw = gloss(0x1a1414, .3, .3), dust = shine(0x5a4a60, .3);
  const spine: V3[] = [[0, .28, .42], [0, .5, .15], [0, .54, -.2], [0, .42, -.5], [.05, .22, -.82], [.12, .06, -1.05]];
  tube(body, spine, .2, .04, skin, 14, 7);
  const c = new THREE.CatmullRomCurve3(spine.map(p => new THREE.Vector3(...p))), at = new THREE.Vector3(), tan = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let i = 0; i < 13; i++) {
    const u = .04 + i / 13 * .9, r = .27 * (1 - u * .8);
    c.getPointAt(u, at); c.getTangentAt(u, tan); side.crossVectors(tan, Y).normalize();
    for (let j = -3; j <= 3; j++) {
      const a = j / 3 * 1.35; nrm.copy(Y).multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
      const m = part(body, sphere(r * .55, 6, 4), i % 2 ? edge : scaleM, [at.x + nrm.x * r * .8, at.y + nrm.y * r * .8, at.z + nrm.z * r * .8], { scale: [1, .3, 1.3] });
      m.quaternion.setFromUnitVectors(Y, nrm); m.rotateX(-.35);
    }
  }
  const head = joint(body, [0, .28, .48]);
  part(head, new THREE.ConeGeometry(.1, .3, 7), skin, [0, -.02, .1], { rot: [Math.PI / 2 + .25, 0, 0] });
  for (let k = 0; k < 3; k++) part(head, sphere(.09 - k * .02, 6, 4), scaleM, [0, .05 - k * .01, -.02 + k * .08], { scale: [1, .35, 1.2] });
  slitEyes(head, .06, .02, .06, .022, 0xc58aff, .7, .3);
  const legs = [-1, 1].flatMap(s => [[.25, 0], [-.42, 1]].map(([z, hind]) => {
    const l = joint(body, [.16 * s, .34, z]);
    tube(l, [[0, 0, 0], [.06 * s, -.16, .04], [.07 * s, -.33, .06]], .07, .05, skin, 6, 5);
    for (const k of [-1, 0, 1]) spike(l, [.07 * s, -.33, .06], [.07 * s + k * .035, -.34, hind ? .14 : .22], hind ? .015 : .022, claw);
    return l;
  }));
  const puffs = [0, 1, 2, 3].map(() => part(g, sphere(.12, 6, 5), dust, [0, 0, 0]));
  return { group: g, shadow: 1.3, parts: { body, head }, idle: t => {
    body.position.y = Math.abs(Math.sin(t * 2)) * .01; head.rotation.y = Math.sin(t * 1.1) * .3; head.rotation.x = Math.sin(t * 1.7) * .1;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 2 + i * 1.5) * .06; });
    puffs.forEach((p, i) => { const k = (t * .4 + i / 4) % 1; p.position.set(Math.sin(i * 2.4) * .35, .06 + k * .25, -.2 + Math.cos(i * 1.7) * .4); p.scale.setScalar(.6 + k); (p.material as THREE.MeshBasicMaterial).opacity = .3 * (1 - k); });
  } };
}

/** Floor 5, Frost: a hare as tall as the mage's hip on long hind legs, frost-white, crowned with antlers of ice, pale eyes
    and ears laid back. */
export function frostJackalope(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), fur = std(0xdfe6ee), shade = std(0x9aa8b8), inner = std(0x8a7a88), ice = std(0x9cdcff, { transparent: true, opacity: .9, roughness: .1, metalness: .15 }), tip = lit(F);
  body.scale.setScalar(1.3);
  tube(body, [[0, .36, -.3], [0, .44, -.08], [0, .46, .12], [0, .5, .2]], .17, .13, fur, 10, 8);
  part(body, sphere(.13, 8, 6), shade, [0, .5, -.12], { scale: [.9, .5, 1.8] });
  for (const s of [-1, 1]) {
    tube(body, [[.11 * s, .38, -.26], [.13 * s, .26, -.14], [.12 * s, .1, -.34], [.12 * s, .02, -.2], [.12 * s, .01, .02]], .1, .03, fur, 10, 6);
    tube(body, [[.08 * s, .38, .16], [.09 * s, .2, .22], [.09 * s, .02, .24]], .04, .025, fur, 6, 5);
  }
  part(body, sphere(.06, 6, 5), fur, [0, .42, -.4]);
  const head = joint(body, [0, .6, .26], [.2, 0, 0]);
  part(head, sphere(.1, 10, 8), fur, [0, 0, 0], { scale: [.85, .9, 1.3] });
  part(head, sphere(.04, 6, 5), shade, [0, -.04, .13]);
  for (const s of [-1, 1]) part(head, new THREE.BoxGeometry(.06, .02, .05), shade, [.05 * s, .05, .05], { rot: [0, -.3 * s, -.35 * s] });
  slitEyes(head, .06, .02, .07, .028, 0xbfe8ff, .9, .35);
  const ears = [-1, 1].map(s => { const e = joint(head, [.045 * s, .06, -.06], [-1.15, 0, -.35 * s]); part(e, sphere(.04, 8, 6), fur, [0, .13, 0], { scale: [1, 3.2, .45] }); part(e, sphere(.025, 6, 5), inner, [0, .13, .016], { scale: [1, 3, .3] }); return e; });
  // antlers of ice: a beam swept up and back with tines, glowing at the tips
  for (const s of [-1, 1]) {
    const beam: V3[] = [[.04 * s, .08, .0], [.12 * s, .22, -.02], [.2 * s, .38, -.1], [.24 * s, .52, -.2]];
    tube(head, beam, .028, .012, ice, 8, 5);
    for (const [k, len, out] of [[1, .14, .02], [2, .16, .06], [3, .1, .02]]) { const p = beam[k]; spike(head, p, [p[0] + out * s, p[1] + len, p[2] + .06], .014, ice); part(head, sphere(.014, 4, 3), tip, [p[0] + out * s, p[1] + len, p[2] + .06]); }
    part(head, sphere(.018, 4, 3), tip, beam[3]);
  }
  const breath = glow(F, .55, .25); breath.position.set(0, .3, -.05); head.add(breath);
  return { group: g, shadow: 1, parts: { body, head }, idle: t => {
    const k = t * .7 % 1, hop = k < .25 ? Math.sin(k / .25 * Math.PI) : 0; body.position.y = hop * .12;
    head.rotation.y = Math.sin(t * 1.3) * .35; ears.forEach((e, i) => { e.rotation.x = -1.15 + Math.sin(t * 2.6 + i) * .08; });
    breath.material.opacity = .15 + .1 * Math.sin(t * 2);
  } };
}
