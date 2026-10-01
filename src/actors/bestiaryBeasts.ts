/* The bestiary's beasts (M4.5): animals of the dungeon, larger and stranger than life, each built to read at a glance as
   what it is (docs/M4.5-plan.md). Each stands on y = 0 facing +Z and idles; parts a foe's behaviour will move are named in
   `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, limb, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { beads, featherWing, gloss, joint, jointed, pincer, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { ember: E, frost: F, storm: S, hallow: H, umbral: U } = SCHOOL_LIGHT;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/** Floor 1, Umbral: a spider the size of a hound, black and bristling, a violet hourglass on its raised abdomen and a
    cluster of eyes over its fangs. */
export function cryptSpider(): Built {
  const g = new THREE.Group(), shell = gloss(0x1e1a26, .5, .2), hair = std(0x2c2434, { roughness: 1 }), band = std(0x5e3c70), fang = gloss(0x40181c, .3, .3), mark = lit(U);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(.2, 10, 8), .02, 1), shell, [0, .34, .12], { scale: [1, .62, 1.15] });
  const abdomen = joint(body, [0, .4, -.14], [.15, 0, 0]);
  part(abdomen, rough(sphere(.3, 12, 10), .035, 2), hair, [0, .06, -.24], { scale: [1, .85, 1.22] });
  for (const d of [1, -1]) part(abdomen, new THREE.ConeGeometry(.07, .13, 4), mark, [0, .31, -.2 - d * .065], { rot: [d * Math.PI / 2, 0, 0], scale: [1, 1, .3] });
  for (let i = 0; i < 6; i++) spike(abdomen, [Math.cos(i * 1.05) * .2, .12, -.24 + Math.sin(i * 1.05) * .22], [Math.cos(i * 1.05) * .27, .2, -.24 + Math.sin(i * 1.05) * .3], .015, hair);
  // eight legs: a knee high above the body, a long shin out to the floor
  const legs = [[.26, [.36, .62, .5], [.52, 0, .84]], [.16, [.48, .64, .26], [.82, 0, .4]], [.06, [.48, .6, -.04], [.82, 0, -.14]], [-.04, [.4, .58, -.32], [.62, 0, -.62]]] as const;
  const legGroups = [-1, 1].flatMap(s => legs.map(([hz, knee, foot]) => {
    const hip: V3 = [.14 * s, .32, hz], k: V3 = [knee[0] * s, knee[1], knee[2]], f: V3 = [foot[0] * s, foot[1], foot[2]];
    const ankle: V3 = [k[0] + (f[0] - k[0]) * .55, k[1] * .55, k[2] + (f[2] - k[2]) * .55];
    const l = joint(body, hip); jointed(l, [[0, 0, 0], sub(k, hip), sub(ankle, hip), sub(f, hip)], .042, .012, hair, band);
    return l;
  }));
  const palps = [-1, 1].map(s => { const p = joint(body, [.07 * s, .3, .3]); jointed(p, [[0, 0, 0], [.05 * s, .04, .1], [.03 * s, -.1, .17]], .022, .012, hair, band); return p; });
  for (const s of [-1, 1]) spike(body, [.05 * s, .27, .32], [.035 * s, .1, .4], .038, fang);
  const eyes = beads(body, [[-.055, .42, .3], [.055, .42, .3]], .036, 0xc58aff).concat(beads(body, [[-.12, .4, .26], [.12, .4, .26], [-.035, .465, .25], [.035, .465, .25], [-.15, .43, .18], [.15, .43, .18]], .022, 0xc58aff));
  return { group: g, shadow: 1.2, parts: { body, abdomen }, idle: t => {
    body.position.y = Math.sin(t * 2.2) * .012; abdomen.scale.setScalar(1 + Math.sin(t * 1.6) * .03);
    legGroups.forEach((l, i) => { const ph = (i + (i >= 4 ? 1 : 0)) % 2; l.rotation.x = Math.max(0, Math.sin(t * 3 + ph * Math.PI)) * -.06; });
    palps.forEach((p, i) => { p.rotation.x = Math.sin(t * 5 + i * 2) * .25; });
    const k = t % 4.2; for (const e of eyes) e.scale.setScalar(k < .1 ? .4 : 1);
  } };
}

/** Floor 1, Umbral: an octopus of living ink crawled out of the scriptorium's wells, a quill stuck in its mantle, slow
    violet sparks under its skin and ink pooling where it sits. */
export function inkOctopus(): Built {
  const g = new THREE.Group(), ink = gloss(0x2c1f4c, .22, .12), inner = gloss(0x4a2f70, .25, .1), spark = lit(0xb98cff);
  part(g, new THREE.CircleGeometry(.62, 16), gloss(0x0a0710, .08, .5), [0, .006, .02], { rot: [-Math.PI / 2, 0, 0], scale: [1, .8, 1] });
  for (const [x, z, r] of [[.7, .3, .07], [-.62, .45, .05], [.3, -.62, .06]] as V3[]) part(g, new THREE.CircleGeometry(r, 8), gloss(0x0a0710, .08, .5), [x, .007, z], { rot: [-Math.PI / 2, 0, 0] });
  const body = joint(g, [0, 0, 0]);
  const mantle = joint(body, [0, .52, -.1], [-.38, 0, 0]);
  part(mantle, sphere(.28, 12, 10), ink, [0, .1, 0], { scale: [1, 1.2, 1.05] });
  for (let i = 0; i < 7; i++) part(mantle, sphere(.018, 5, 4), spark, [Math.sin(i * 2.1) * .27, .02 + (i % 3) * .1, Math.cos(i * 2.1) * .24]);
  // a quill driven into it
  const quill = joint(mantle, [.08, .38, -.06], [-.5, 0, -.35]);
  limb(quill, [0, -.1, 0], [0, .36, 0], .01, std(0xe8dcc8), .006);
  part(quill, new THREE.ConeGeometry(.06, .3, 4), thin(0xf2ecdc), [0, .22, 0], { scale: [1, 1, .18] });
  // eyes with a bar for a pupil, under a heavy brow
  for (const s of [-1, 1]) {
    const e = joint(body, [.15 * s, .5, .16], [-.3, .35 * s, 0]);
    part(e, sphere(.1, 8, 6), ink, [0, 0, -.02]);
    part(e, sphere(.07, 8, 6), lit(0xe0c0ff), [0, 0, .05], { scale: [1.15, .75, .5] });
    part(e, new THREE.BoxGeometry(.1, .02, .02), lit(0x12081c), [0, 0, .09]);
    part(e, sphere(.085, 6, 5), ink, [0, .07, .03], { rot: [0, 0, -.45 * s], scale: [1.3, .45, .8] });
  }
  // eight arms, the front two raised to grasp, every tip curled
  const arms = Array.from({ length: 8 }, (_, i) => {
    const a = (i + .5) / 8 * Math.PI * 2, c = Math.sin(a), s = Math.cos(a), front = s > .7;
    const arm = joint(body, [0, 0, 0]);
    const pts: V3[] = front
      ? [[c * .1, .34, s * .12], [c * .32, .3, s * .4], [c * .44, .5, s * .62], [c * .4, .72, s * .66], [c * .3, .78, s * .56]]
      : [[c * .12, .34, s * .1], [c * .42, .1, s * .4], [c * .68, .03, s * .66], [c * .84, .12, s * .8], [c * .78, .24, s * .74]];
    tube(arm, pts, .08, .014, i % 2 ? ink : inner, 14, 6);
    return arm;
  });
  return { group: g, shadow: 1.1, parts: { body, mantle }, idle: t => {
    mantle.scale.set(1 + Math.sin(t * 1.8) * .04, 1 - Math.sin(t * 1.8) * .05, 1);
    arms.forEach((a, i) => { a.rotation.y = Math.sin(t * 1.3 + i * .9) * .07; a.rotation.x = Math.sin(t * 1.7 + i) * .03; });
    spark.color.setHex(0xb98cff).multiplyScalar(.6 + .4 * Math.sin(t * 2.5));
  } };
}

/** One lantern beetle as long as a hand, its tail glowing (a firefly swarm's member as a foe, and seven of them in the
    swarm's look). */
function beetle(parent: THREE.Object3D, M: { shell: THREE.Material; cap: THREE.Material; tail: THREE.Material; wing: THREE.Material }) {
  const b = joint(parent, [0, 0, 0]); b.scale.setScalar(1.35);
  part(b, sphere(.05, 8, 6), M.shell, [0, 0, .04], { scale: [1, .8, 1.1] });
  part(b, sphere(.032, 6, 5), M.shell, [0, -.005, .1]);
  for (const s of [-1, 1]) { limb(b, [.015 * s, .02, .12], [.06 * s, .06, .2], .004, M.shell); part(b, sphere(.042, 6, 5), M.cap, [.035 * s, .025, -.01], { rot: [0, 0, .5 * s], scale: [.7, .4, 1.5] }); }
  part(b, sphere(.06, 8, 6), M.tail, [0, -.01, -.07], { scale: [1, .85, 1.45] });
  const wings = [-1, 1].map(s => part(b, sphere(.06, 6, 4), M.wing, [.06 * s, .03, -.02], { rot: [0, .3 * s, 0], scale: [1.2, .1, .7] }));
  return { b, wings };
}
const beetleMats = () => ({ shell: gloss(0x2a2014, .4, .3), cap: gloss(0x4a3418, .35, .35), tail: lit(H), wing: shine(0xfff0c8, .35) });

/** Floor 1, Hallow: a swarm of lantern beetles as long as a hand, their glowing tails pulsing as one. */
export function fireflySwarm(): Built {
  const g = new THREE.Group(), cloud = joint(g, [0, .75, 0]), M = beetleMats();
  const halo = glow(H, 1.8, .22); cloud.add(halo);
  const bugs = Array.from({ length: 7 }, (_, i) => {
    const { b, wings } = beetle(cloud, M);
    const gl = glow(H, .38, .6); gl.position.set(0, 0, -.07); b.add(gl);
    return { b, wings, gl, i };
  });
  return { group: g, shadow: 1, idle: t => {
    halo.material.opacity = .14 + .1 * Math.sin(t * 2);
    bugs.forEach(({ b, wings, gl, i }) => {
      const a = t * (.7 + (i % 3) * .18) + i * 2.4, r = .25 + (i % 3) * .16;
      b.position.set(Math.cos(a) * r, Math.sin(t * 1.4 + i * 1.7) * .22, Math.sin(a) * r * .8); b.rotation.y = -a;
      for (const w of wings) w.rotation.z = Math.sin(t * 40 + i) * .5;
      gl.material.opacity = .35 + .35 * Math.max(0, Math.sin(t * 2.4 - i * .7));
    });
  } };
}
/** One beetle of the swarm, as the foe it is: it hovers, its wings a blur, its tail glowing. */
export function fireflyBeetle(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .75, 0]), M = beetleMats(), { b, wings } = beetle(body, M);
  b.scale.setScalar(1.7);
  const gl = glow(H, .6, .7); gl.position.set(0, -.01, -.12); body.add(gl);
  return { group: g, shadow: .35, parts: { body }, idle: t => {
    body.position.y = .75 + Math.sin(t * 3.1) * .06; for (const w of wings) w.rotation.z = Math.sin(t * 40) * .5;
    gl.material.opacity = .45 + .3 * Math.max(0, Math.sin(t * 2.4));
  } };
}

/** Floor 1, Hallow: a lark as big as a hawk, gold-feathered, a crest of light raised like a sunburst, singing with its beak
    wide; its notes hang glowing in the air. */
export function choirLark(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .95, 0]), gold = std(0xd9b866), breast = std(0xf6ead0), dark = std(0x3a2a16), tipM = std(0xf4e6bc), beak = gloss(0x2e2414, .35, .3), ray = lit(H);
  part(body, sphere(.17, 10, 8), gold, [0, 0, 0], { scale: [.95, .85, 1.55] });
  part(body, sphere(.14, 8, 6), breast, [0, -.04, .1], { scale: [.9, .85, 1.2] });
  const head = joint(body, [0, .1, .26]);
  part(head, sphere(.11, 10, 8), gold, [0, 0, 0], { scale: [.95, .9, 1.05] });
  for (const s of [-1, 1]) { part(head, new THREE.BoxGeometry(.08, .025, .04), dark, [.075 * s, .015, .04], { rot: [0, .7 * s, 0] }); beads(head, [[.083 * s, .02, .055]], .016, 0xfff3c4); }
  const upper = joint(head, [0, -.01, .09]); spike(upper, [0, 0, 0], [0, -.03, .17], .035, beak);
  const lower = joint(head, [0, -.035, .08], [.35, 0, 0]); spike(lower, [0, 0, 0], [0, -.02, .13], .028, beak);
  const crest = joint(head, [0, .08, -.02]);
  for (let i = 0; i < 7; i++) { const a = (i - 3) * .32; spike(crest, [0, 0, 0], [Math.sin(a) * .1, .2 + Math.cos(a) * .04, -.08 - Math.abs(a) * .05], .016, ray); }
  const wings = ([-1, 1] as const).map(s => featherWing(body, s, [.1 * s, .06, .02], .6, gold, tipM, 8, .5));
  const tail = joint(body, [0, .02, -.24]);
  for (const [x, len, r] of [[0, .62, 0], [-.07, .5, .25], [.07, .5, -.25]] as V3[]) { part(tail, new THREE.ConeGeometry(.05, len, 4), gold, [x, 0, -len * .48], { rot: [-Math.PI / 2, 0, r], scale: [1, 1, .2] }); part(tail, sphere(.035, 6, 4), ray, [x - Math.sin(-r) * len * .05, .005, -len * .95], { scale: [1, .3, 1.4] }); }
  for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) spike(body, [.05 * s, -.12, .02], [.06 * s + k * .03, -.22, .08], .01, beak);
  const notes = [0, 1, 2].map(() => part(g, new THREE.TorusGeometry(.12, .012, 4, 18), shine(H, .8), [0, 1.05, .45]));
  return { group: g, shadow: .9, parts: { body, head }, idle: t => {
    const f = Math.sin(t * 7); wings[0].rotation.z = -f * .55; wings[1].rotation.z = f * .55; body.position.y = .95 + Math.sin(t * 7 + 1) * .03;
    tail.rotation.x = Math.sin(t * 2) * .08; lower.rotation.x = .3 + Math.max(0, Math.sin(t * 6)) * .25; crest.scale.setScalar(1 + Math.sin(t * 3) * .08);
    notes.forEach((n, i) => { const k = (t * .8 + i / 3) % 1; n.position.set(0, body.position.y + .1, .5 + k * .7); n.scale.setScalar(.5 + k * 1.6); (n.material as THREE.MeshBasicMaterial).opacity = .8 * (1 - k); });
  } };
}

/** Floor 1, Storm: a praying mantis as tall as the mage's chest, scythes raised in guard, sparks jumping between their
    edges. */
export function stormMantis(): Built {
  const g = new THREE.Group(), chitin = gloss(0x67893a, .45, .15), pale = gloss(0xb2c272, .4, .15), edge = lit(S), wingM = thin(0x9aa878, { transparent: true, opacity: .7, roughness: .4 }), eyeM = lit(S);
  const body = joint(g, [0, 0, 0]); body.scale.setScalar(1.22);
  tube(body, [[0, .52, .02], [0, .48, -.2], [0, .4, -.45], [0, .32, -.66]], .13, .05, chitin, 10, 7);
  for (let i = 0; i < 4; i++) part(body, new THREE.TorusGeometry(.115 - i * .016, .012, 4, 10), pale, [0, .5 - i * .055, -.12 - i * .15], { rot: [Math.PI / 2 - .35, 0, 0] });
  for (const s of [-1, 1]) part(body, sphere(.26, 6, 4), wingM, [.05 * s, .56, -.3], { rot: [.32, .08 * s, .06 * s], scale: [.32, .05, 1.35] });
  const chest = joint(body, [0, .5, .02], [-.25, 0, 0]);
  tube(chest, [[0, 0, 0], [0, .25, .04], [0, .45, .03]], .07, .045, chitin, 6, 6);
  const head = joint(chest, [0, .5, .04]);
  part(head, new THREE.OctahedronGeometry(.1, 0), chitin, [0, 0, .02], { scale: [1.6, .9, .8] });
  for (const s of [-1, 1]) {
    part(head, new THREE.OctahedronGeometry(.055, 1), eyeM, [.14 * s, .02, .02], { scale: [.9, 1.2, .9] });
    tube(head, [[.03 * s, .07, .06], [.1 * s, .25, .02], [.22 * s, .38, -.1]], .008, .003, chitin, 6, 3);
  }
  spike(head, [0, -.04, .06], [0, -.14, .1], .03, pale);
  // the raptorial forelegs: a coxa down, a spined femur up, the tibia folded back as the blade
  const arms = ([-1, 1] as const).map(s => {
    const a = joint(chest, [.07 * s, .36, .06], [0, 0, -.35 * s]);
    jointed(a, [[0, 0, 0], [.05 * s, -.1, .14], [.09 * s, .2, .32]], .04, .03, chitin, pale);
    for (let i = 0; i < 4; i++) spike(a, [(.06 + i * .008) * s, -.06 + i * .07, .18 + i * .035], [(.05 + i * .008) * s, -.1 + i * .07, .24 + i * .035], .012, pale);
    const blade = joint(a, [.09 * s, .2, .32], [2.5, 0, 0]);
    part(blade, new THREE.ConeGeometry(.05, .46, 4), pale, [0, .23, 0], { scale: [1, 1, .35] });
    part(blade, new THREE.BoxGeometry(.014, .42, .014), edge, [0, .21, .02]);
    return { a, blade };
  });
  const spark = glow(S, .45, .6); spark.position.set(0, .2, .36); chest.add(spark);
  // four walking legs
  for (const s of [-1, 1]) for (const [hz, kz, fz] of [[.0, .18, .28], [-.12, -.3, -.5]]) jointed(body, [[.05 * s, .48, hz], [.3 * s, .5, kz], [.42 * s, 0, fz]], .024, .012, chitin, pale);
  return { group: g, shadow: 1, parts: { chest, head }, idle: t => {
    chest.rotation.z = Math.sin(t * 1.1) * .06; chest.rotation.x = -.25 + Math.sin(t * 1.1 + 1) * .03; head.rotation.y = Math.sin(t * .7) * .35;
    arms.forEach(({ a, blade }, i) => { a.rotation.x = Math.sin(t * 1.6 + i) * .05; blade.rotation.x = 2.5 + Math.sin(t * 2.3 + i * 2) * .08; });
    spark.material.opacity = Math.floor(t * 11) % 3 === 0 ? .85 : .2;
  } };
}

/** Floor 1, Storm: a crab as broad as a cart wheel under a crust of rubble, one great crusher claw, eyes on stalks and
    sparks snapping between its pincers. */
export function rubbleCrab(): Built {
  const g = new THREE.Group(), shell = gloss(0x7c3e28, .5, .2), under = std(0xb8744a), stone = [std(0x7a746c), std(0x8e877c), std(0x5e5a56)], tipM = gloss(0x241612, .35, .3);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(.38, 12, 8), .03, 3), shell, [0, .3, 0], { scale: [1.25, .5, .95] });
  part(body, sphere(.3, 10, 6), under, [0, .2, .02], { scale: [1.3, .35, .95] });
  for (let i = -2; i <= 2; i++) spike(body, [i * .13, .3, .34], [i * .15, .32, .42], .03, shell);
  for (const [x, z, r, k] of [[0, -.05, .17, 0], [-.22, .02, .12, 1], [.2, -.06, .14, 2], [.04, .16, .1, 1], [-.12, -.2, .11, 2], [.26, .14, .09, 0], [-.3, -.12, .08, 0]] as [number, number, number, number][]) {
    part(body, rough(new THREE.DodecahedronGeometry(r, 0), r * .2, x * 9), stone[k], [x, .42 + r * .3, z], { rot: [x * 7, z * 5, x * 3] });
  }
  const stalks = [-1, 1].map(s => { const e = joint(body, [.1 * s, .38, .3]); limb(e, [0, 0, 0], [.03 * s, .18, .04], .02, under); beads(e, [[.03 * s, .2, .05]], .035, S); return e; });
  const big = pincer(body, [.44, .3, .32], .68, shell, tipM, [0, -.35, 0]);
  const small = pincer(body, [-.38, .28, .34], .34, shell, tipM, [0, .3, 0]);
  jointed(body, [[.3, .28, .18], [.4, .32, .3]], .06, .05, shell); jointed(body, [[-.3, .28, .18], [-.38, .3, .3]], .05, .04, shell);
  const legs = [-1, 1].flatMap(s => [.08, -.08, -.22].map(z => {
    const l = joint(body, [.36 * s, .26, z]);
    jointed(l, [[0, 0, 0], [.26 * s, .14, z * .3], [.44 * s, -.12, z * .6]], .045, .022, shell);
    spike(l, [.44 * s, -.12, z * .6], [.48 * s, -.26, z * .7], .02, tipM);
    return l;
  }));
  const spark = glow(S, .55, .6); spark.position.set(0, .34, .66); body.add(spark);
  return { group: g, shadow: 1.4, parts: { body, big: big.claw, small: small.claw }, idle: t => {
    body.position.x = Math.sin(t * 1.4) * .04; body.position.y = Math.abs(Math.sin(t * 2.8)) * .01;
    big.finger.rotation.x = -Math.max(0, Math.sin(t * 2)) * .4; small.finger.rotation.x = -Math.max(0, Math.sin(t * 2.6 + 1)) * .4;
    stalks.forEach((e, i) => { e.rotation.z = Math.sin(t * 1.9 + i * 2) * .15; });
    legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 2.8 + i * 1.3) * .06; });
    spark.material.opacity = Math.floor(t * 9) % 4 === 0 ? .9 : .15;
  } };
}

/** Floor 2, Frost: a snail as long as the mage is tall, wet slate-blue, carrying a spiral shell of clear ice with frost
    crystals grown through it; rime lies where it has crawled. */
export function rimeSnail(): Built {
  const g = new THREE.Group(), skin = gloss(0x5d7088, .3, .1), belly = std(0x8a9cb0), ice = std(0x6cb8e8, { roughness: .1, metalness: .15, transparent: true, opacity: .9 });
  for (let i = 0; i < 4; i++) part(g, new THREE.CircleGeometry(.16 - i * .02, 8), shine(0xd8f0ff, .35 - i * .06), [Math.sin(i * 2) * .04, .006, -.62 - i * .2], { rot: [-Math.PI / 2, 0, 0], scale: [1, 1.5, 1] });
  const body = joint(g, [0, 0, 0]);
  const foot = joint(body, [0, 0, 0]);
  part(foot, sphere(.24, 10, 6), skin, [0, .08, -.08], { scale: [1.05, .42, 2.6] });
  part(foot, sphere(.24, 10, 6), belly, [0, .04, -.08], { scale: [1.2, .2, 2.7] });
  const head = joint(body, [0, .14, .32]);
  tube(head, [[0, 0, -.06], [0, .1, .1], [0, .18, .2]], .14, .1, skin, 6, 8);
  const stalks = [-1, 1].map(s => { const k = joint(head, [.06 * s, .22, .2]); tube(k, [[0, 0, 0], [.04 * s, .18, .04], [.1 * s, .36, .02]], .024, .012, skin, 6, 4); beads(k, [[.1 * s, .37, .02]], .035, F); return k; });
  for (const s of [-1, 1]) tube(head, [[.07 * s, .12, .26], [.12 * s, .06, .38]], .018, .008, skin, 4, 4);
  // the shell: a coil of ice turning in on itself, ribbed where each whorl meets the last
  // the shell: whorls of ice coiling up into a point, a line of frost-light along the seam between them
  const shell = joint(body, [0, .2, -.16], [-.25, 0, 0]);
  const coil: V3[] = [], seam: V3[] = [];
  for (let i = 0; i <= 48; i++) {
    const k = i / 48, a = k * Math.PI * 4.4, r = .32 * (1 - k * .9), y = .16 + k * .46;
    coil.push([Math.cos(a) * r, y, Math.sin(a) * r]); seam.push([Math.cos(a) * (r + .17 * (1 - k * .88)) * .96, y + .02, Math.sin(a) * (r + .17 * (1 - k * .88)) * .96]);
  }
  tube(shell, coil, .22, .03, ice, 90, 8);
  tube(shell, seam.slice(0, 44), .018, .006, lit(F), 90, 4);
  for (const [p, h, rot] of [[[.4, .3, .12], .24, [.3, 0, -.9]], [[-.36, .32, -.16], .22, [-.4, 0, .9]], [[.1, .44, .3], .18, [.8, 0, -.2]], [[-.12, .42, .3], .16, [.8, 0, .3]]] as [V3, number, V3][]) part(shell, new THREE.OctahedronGeometry(h / 2), lit(F), p, { rot, scale: [.45, 1, .45] });
  const breath = glow(F, .9, .3); breath.position.set(0, .35, 0); shell.add(breath);
  return { group: g, shadow: 1.1, parts: { body, head, shell }, idle: t => {
    const c = Math.sin(t * 1.3); foot.scale.z = 1 + c * .04; head.position.z = .32 + c * .03; shell.position.z = -.16 - c * .01;
    stalks.forEach((k, i) => { k.rotation.x = Math.sin(t * 1.7 + i * 1.3) * .2; k.rotation.z = Math.sin(t * 1.1 + i) * .12; });
    breath.material.opacity = .2 + .12 * Math.sin(t * 2);
  } };
}

/** Floor 2, Frost: a long newt of living glass, clear enough to see the cold light along its spine; ice grows in a ridge
    down its back. */
export function glassNewt(): Built {
  const g = new THREE.Group(), glass = std(0x6ec4f0, { transparent: true, opacity: .78, roughness: .06, metalness: .15 }), core = lit(F), rim = lit(0xd8f4ff);
  const body = joint(g, [0, 0, 0]);
  const spine: V3[] = [[0, .2, .34], [0, .19, .06], [0, .17, -.24], [.05, .12, -.52], [.14, .07, -.8], [.12, .05, -1.02]];
  tube(body, spine, .19, .025, glass, 16, 8);
  tube(body, spine.slice(0, 5).map(([x, y, z]) => [x, y + .02, z] as V3), .03, .01, core, 12, 4);
  const head = joint(body, [0, .2, .4]);
  part(head, sphere(.16, 10, 8), glass, [0, 0, .08], { scale: [1.05, .55, 1.45] });
  part(head, new THREE.BoxGeometry(.2, .012, .14), rim, [0, -.03, .16]);
  slitEyes(head, .075, .055, .13, .04, F, .7, .25);
  const heart = glow(F, .5, .65); heart.position.set(0, .2, .02); body.add(heart);
  part(body, sphere(.05, 6, 5), core, [0, .2, .02]);
  for (let i = 0; i < 8; i++) { const k = i / 8, p = [0, .37 - k * .2, .26 - k * .95] as V3; part(body, new THREE.OctahedronGeometry(.075 - k * .04), rim, [p[0] + k * .06, p[1], p[2]], { scale: [.5, 1.5, .8], rot: [-.4, 0, 0] }); }
  const legs = [-1, 1].flatMap(s => [[.2, .3], [-.22, -.32]].map(([hz, fz]) => {
    const l = joint(body, [.1 * s, .16, hz]);
    jointed(l, [[0, 0, 0], [.22 * s, .06, .02], [.32 * s, -.16, fz - hz]], .06, .035, glass);
    for (const k of [-1, 0, 1]) spike(l, [.3 * s, -.16, fz - hz], [.36 * s + k * .03, -.16, fz - hz + .06 + k * .02 * s], .012, rim);
    return l;
  }));
  return { group: g, shadow: 1.2, parts: { body, head }, idle: t => {
    body.rotation.y = Math.sin(t * 1.5) * .06; head.rotation.y = Math.sin(t * .9) * .25; head.rotation.x = Math.sin(t * 1.3) * .05;
    legs.forEach((l, i) => { l.rotation.y = Math.sin(t * 1.5 + i * Math.PI / 2) * .1; });
    heart.material.opacity = .45 + .25 * Math.sin(t * 3);
  } };
}

/** Floor 2, Storm: a dragonfly with a wingspan wider than the mage's arms, its body a gleaming storm-blue, lightning in its
    tail's joints and eyes that burn like lamps. */
export function stormDarter(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .85, 0]), sheen = gloss(0x2a6a86, .3, .45), dark = gloss(0x16303e, .3, .4), spark = lit(S), wingM = shine(0xdcecff, .32), vein = lit(0xf6f0a8);
  part(body, sphere(.1, 8, 6), sheen, [0, 0, 0], { scale: [.95, .9, 1.5] });
  part(body, sphere(.075, 8, 6), dark, [0, .01, .15]);
  for (const s of [-1, 1]) part(body, new THREE.OctahedronGeometry(.07, 1), spark, [.06 * s, .03, .19], { scale: [.9, 1, 1] });
  for (const s of [-1, 1]) spike(body, [.025 * s, -.03, .22], [.01 * s, -.07, .27], .018, dark);
  tube(body, [[0, 0, -.1], [0, -.01, -.4], [0, .02, -.7], [0, .08, -.88]], .05, .02, sheen, 12, 6);
  for (let i = 0; i < 6; i++) part(body, new THREE.TorusGeometry(.045 - i * .004, .008, 3, 8), spark, [0, -.005 + (i > 3 ? (i - 3) * .02 : 0), -.18 - i * .12], { rot: [0, 0, 0] });
  const tip = glow(S, .4, .7); tip.position.set(0, .08, -.88); body.add(tip);
  const wings = [-1, 1].flatMap(s => [[.06, .1], [-.05, -.1]].map(([z, sweep]) => {
    const w = joint(body, [.05 * s, .05, z]);
    part(w, sphere(.3, 8, 4), wingM, [.32 * s, 0, 0], { rot: [0, sweep * s, 0], scale: [1, .03, .17] });
    part(w, new THREE.BoxGeometry(.56, .006, .01), vein, [.32 * s, .005, .01], { rot: [0, sweep * s, 0] });
    return { w, s };
  }));
  for (const s of [-1, 1]) for (const z of [.08, 0, -.06]) jointed(body, [[.04 * s, -.06, z], [.1 * s, -.12, z + .04], [.08 * s, -.2, z + .1]], .012, .006, dark);
  return { group: g, shadow: .9, parts: { body }, idle: t => {
    body.position.y = .85 + Math.sin(t * 2.2) * .05; body.rotation.z = Math.sin(t * 1.4) * .06;
    wings.forEach(({ w, s }, i) => { w.rotation.z = Math.sin(t * 34 + (i % 2) * 1.6) * .35 * s; });
    tip.material.opacity = Math.floor(t * 10) % 3 === 0 ? .95 : .35;
  } };
}

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

/** Floor 3, Ember: a wasp as long as a forearm, banded amber and black, wings like fire-glass, a sting that glows. */
export function emberWasp(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .85, 0]), black = gloss(0x1a120c, .35, .35), amber = gloss(0xe08a1c, .4, .2), wingM = shine(0xffb060, .32), vein = lit(0xffc070), sting = lit(E);
  part(body, sphere(.11, 8, 6), black, [0, 0, 0], { scale: [1, .95, 1.25] });
  const head = joint(body, [0, .02, .16]);
  part(head, sphere(.085, 8, 6), amber, [0, 0, .02], { scale: [1.1, 1, .9] });
  for (const s of [-1, 1]) {
    part(head, new THREE.OctahedronGeometry(.05, 1), lit(E), [.065 * s, .02, .03], { scale: [.8, 1.2, .8] });
    spike(head, [.03 * s, -.05, .08], [.0, -.09, .13], .018, black);
    jointed(head, [[.025 * s, .06, .07], [.06 * s, .16, .12], [.12 * s, .2, .22]], .009, .005, black);
  }
  limb(body, [0, -.02, -.1], [0, -.05, -.16], .03, black);
  const tail = joint(body, [0, -.05, -.16], [.35, 0, 0]);
  [.13, .135, .12, .095, .065].forEach((r, i) => part(tail, sphere(r, 8, 6), i % 2 ? black : amber, [0, 0, -.06 - i * .1], { scale: [1, .9, .9] }));
  spike(tail, [0, 0, -.5], [0, -.02, -.66], .03, sting);
  const tipGlow = glow(E, .35, .7); tipGlow.position.set(0, -.02, -.64); tail.add(tipGlow);
  const wings = [-1, 1].flatMap(s => [[.04, .5], [-.02, .7]].map(([z, sweep], k) => {
    const w = joint(body, [.06 * s, .08, z]);
    part(w, sphere(.28 - k * .06, 8, 4), wingM, [.24 * s, .01, -.06], { rot: [0, sweep * s * .6, 0], scale: [1, .03, .26] });
    part(w, new THREE.BoxGeometry(.4 - k * .1, .006, .01), vein, [.22 * s, .02, -.05], { rot: [0, sweep * s * .6, 0] });
    return { w, s };
  }));
  for (const s of [-1, 1]) for (const z of [.07, 0, -.07]) jointed(body, [[.06 * s, -.07, z], [.12 * s, -.16, z + .03], [.1 * s, -.3, z + .02]], .014, .007, z > 0 ? amber : black);
  return { group: g, shadow: .8, parts: { body, tail }, idle: t => {
    body.position.y = .85 + Math.sin(t * 3) * .05; body.rotation.y = Math.sin(t * .9) * .2;
    wings.forEach(({ w, s }, i) => { w.rotation.z = Math.sin(t * 42 + (i % 2) * 1.2) * .45 * s; });
    tail.rotation.x = .35 + Math.sin(t * 2.4) * .12; tipGlow.material.opacity = .5 + .3 * Math.sin(t * 6);
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
