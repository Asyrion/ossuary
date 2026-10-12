/* M4.12 step 6 (docs/archive/M4.12-plan.md): floor 5's seven foes redone as creatures of fantasy, by the rules of fantasyFloor1.ts:
   each keeps its fight, the parts its behaviour moves (by the old look's names) and about its height; each faces +Z,
   stands on y = 0 and idles; no round googly eyes; the school in the body. Small repeated parts that move move together,
   so each look draws in about as many calls as the old one did. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, limb, lit, part, runeRing, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { beads, featherWing, gloss, joint, slitEyes, spike, thin, tube, type Built } from './beastParts';

const { frost: F, storm: S, umbral: U } = SCHOOL_LIGHT;

/** A crackle of lightning from `a` to `b` in `n` straight strokes, each bend thrown `jag` aside (one joint, to flicker). */
function zigzag(parent: THREE.Object3D, a: V3, b: V3, n: number, jag: number, mat: THREE.Material, r = .01) {
  const g = joint(parent, [0, 0, 0]);
  const pts: V3[] = Array.from({ length: n + 1 }, (_, i) => { const k = i / n, off = i && i < n ? jag * (i % 2 ? 1 : -1) : 0; return [a[0] + (b[0] - a[0]) * k + off, a[1] + (b[1] - a[1]) * k + off * .5, a[2] + (b[2] - a[2]) * k]; });
  for (let i = 0; i < n; i++) limb(g, pts[i], pts[i + 1], r, mat);
  return g;
}

/** The Mandrake (was the Rootling; a mound under the floor that bursts up under the mage): a gnarled root beast of black
    bark, root legs splayed and root arms flung up, its bark face split by a screaming mouth with violet light in its
    throat, slit eyes sunk deep, a crown of dark leaves veined with violet. */
export function mandrake(): Built {
  const g = new THREE.Group(), bark = std(0x3a2a20, { roughness: 1 }), barkDark = std(0x241a14, { roughness: 1 }), leafM = std(0x24402a), vein = lit(U), soil = std(0x2a2420);
  const body = joint(g, [0, 0, 0]);
  part(body, rough(new THREE.SphereGeometry(.2, 10, 8), .035, 4), bark, [0, .3, 0], { scale: [1, 1.25, .95] }); // (the gnarled tuber of its body)
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; tube(body, [[Math.cos(a) * .12, .2, Math.sin(a) * .12], [Math.cos(a) * .2, .1, Math.sin(a) * .2], [Math.cos(a + .3) * .3, 0, Math.sin(a + .3) * .3]], .045, .01, barkDark, 6, 5); } // (root legs)
  // the face, tipped back to the camera: a screaming mouth with violet light in its throat, slit eyes sunk under a brow
  const face = joint(body, [0, .36, .17], [-.5, 0, 0]);
  part(face, new THREE.CircleGeometry(.075, 12), lit(0x0c0610), [0, -.03, .02], { scale: [.8, 1.25, 1] });
  part(face, new THREE.CircleGeometry(.035, 10), vein, [0, -.035, .025], { scale: [.8, 1.2, 1] });
  part(face, new THREE.TorusGeometry(.075, .02, 4, 12), barkDark, [0, -.03, .02], { scale: [.8, 1.25, 1] });
  part(face, new THREE.BoxGeometry(.2, .03, .05), barkDark, [0, .07, .02]);
  slitEyes(face, .055, .05, .04, .028, U, .5, .45);
  const scream = glow(U, .4, .5); scream.position.set(0, -.03, .06); face.add(scream);
  // root arms flung up and out, twigs for fingers
  const arms = joint(body, [0, .38, 0]);
  for (const s of [-1, 1]) {
    tube(arms, [[.14 * s, 0, 0], [.26 * s, .12, .02], [.32 * s, .3, -.02], [.3 * s, .42, .02]], .04, .015, bark, 8, 5);
    for (const k of [-1, 0, 1]) spike(arms, [.3 * s, .42, .02], [(.3 + k * .05) * s, .52, .02 + k * .04], .01, barkDark);
  }
  // a crown of dark leaves with violet veins
  const sprout = joint(body, [0, .54, -.02]);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(sprout, sphere(.08, 8, 5), leafM, [Math.cos(a) * .07, .06, Math.sin(a) * .07], { scale: [.4, .2, 1.3], rot: [.6 * Math.sin(a), -a + Math.PI / 2, .6 * Math.cos(a)] }); limb(sprout, [0, .02, 0], [Math.cos(a) * .12, .09, Math.sin(a) * .12], .006, vein); }
  // the mound it hides under, shown by its fight
  const mound = joint(g, [0, 0, 0]);
  part(mound, rough(sphere(.3, 10, 6), .02, 3), soil, [0, 0, 0], { scale: [1, .28, 1] });
  for (let i = 0; i < 5; i++) { const a = i * 1.3; part(mound, sphere(.07, 6, 4), soil, [Math.cos(a) * .24, .03, Math.sin(a) * .24], { scale: [1, .5, 1] }); }
  for (let i = 0; i < 4; i++) { const a = i * 1.6 + .4; part(mound, sphere(.012, 4, 3), vein, [Math.cos(a) * .16, .07, Math.sin(a) * .16]); } // (violet glints in the soil)
  mound.visible = false;
  return { group: g, shadow: .55, parts: { body, mound }, idle: t => {
    body.position.y = Math.abs(Math.sin(t * 6)) * .025; sprout.rotation.z = Math.sin(t * 2.2) * .12; arms.rotation.z = Math.sin(t * 3) * .06;
    scream.material.opacity = .35 + Math.sin(t * 5) * .15;
  } };
}

/** The Sky Ray (was the Storm Ray; glides, laying sparks): a ray that swims the air, slate-dark, its head lobes curled
    forward like horns, sparks along the edges of its wings and a long barbed tail crackling. */
export function skyRay(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 1.05, 0]), skin = gloss(0x1e2a3a, .4, .2), under = std(0x3a4a5e), horn = std(0xb8c4d0), edge = lit(S), bolt = lit(0xf4f0a0);
  part(body, sphere(.2, 12, 8), skin, [0, 0, 0], { scale: [1, .4, 1.2] });
  part(body, sphere(.16, 10, 6), under, [0, -.04, .02], { scale: [1, .3, 1] });
  slitEyes(body, .08, .06, .16, .03, S, .5, .3);
  for (const s of [-1, 1]) tube(body, [[.08 * s, 0, .2], [.13 * s, .02, .32], [.1 * s, .06, .4], [.05 * s, .07, .38]], .035, .008, horn, 8, 4); // (head lobes curled forward)
  const wing = (s: number) => {
    const w = joint(body, [.16 * s, 0, 0]);
    const shape = new THREE.Shape([[0, .16], [.18, .12], [.42, -.02], [.48, -.08], [.3, -.12], [.08, -.2], [0, -.18]].map(([x, z]) => new THREE.Vector2(x * s, -z)));
    const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2);
    part(w, geo, thin(0x1e2a3a, { roughness: .5, metalness: .2 }), [0, .005, 0]);
    tube(w, [[0, .01, .16], [.18 * s, .01, .12], [.42 * s, .01, -.02], [.48 * s, .01, -.08]], .012, .006, edge, 10, 3); // (the leading edge, lit)
    for (let i = 0; i < 4; i++) part(w, new THREE.OctahedronGeometry(.02), edge, [(.12 + i * .1) * s, .02, .1 - i * .05]); // (sparks along it)
    return w;
  };
  const wings = [wing(-1), wing(1)];
  const tail = joint(body, [0, 0, -.22]);
  tube(tail, [[0, 0, 0], [0, -.01, -.2], [.02, -.02, -.4], [0, -.02, -.52]], .025, .006, skin, 8, 4);
  spike(tail, [0, -.02, -.5], [0, -.02, -.62], .02, horn); for (const s of [-1, 1]) spike(tail, [0, -.02, -.5], [.04 * s, -.02, -.46], .01, horn); // (the barb)
  const crackle = zigzag(tail, [0, -.01, -.1], [0, -.02, -.56], 6, .025, bolt, .007);
  const spark = glow(S, .45, .6); spark.position.set(0, -.02, -.6); tail.add(spark);
  return { group: g, shadow: .65, idle: t => {
    wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 3.2) * .35; }); body.position.y = 1.05 + Math.sin(t * 1.6) * .06;
    tail.rotation.y = Math.sin(t * 2.4) * .3; const on = Math.floor(t * 9) % 3 !== 0; crackle.visible = on; spark.material.opacity = on ? .8 : .3;
  } };
}

/** The Void Maw (was the Void Mote; swallows the cantrip and spills it back): a floating sphere of dark, its mouth a ring
    of pale teeth round violet light, turned to the camera; three slits of eyes over it; a ring of violet turning about it. */
export function voidMaw(): Built {
  const g = new THREE.Group(), dark = std(0x0c0814, { roughness: .4 }), tooth = gloss(0xe0d8e8, .3, .2), maw = lit(U);
  const body = joint(g, [0, .9, 0]);
  part(body, rough(sphere(.22, 14, 10), .01, 3), dark, [0, 0, 0]);
  const mouth = joint(body, [0, .02, .17], [-.75, 0, 0]); // (turned up to the camera)
  part(mouth, new THREE.CircleGeometry(.13, 16), lit(0x05030a), [0, 0, .005]);
  part(mouth, new THREE.CircleGeometry(.06, 12), maw, [0, 0, .008]);
  const teeth = joint(mouth, [0, 0, .01]); // (they open and close as one)
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; spike(teeth, [Math.cos(a) * .13, Math.sin(a) * .13, 0], [Math.cos(a) * .07, Math.sin(a) * .07, .03], .018, tooth); }
  const throat = glow(U, .5, .6); throat.position.set(0, 0, .04); mouth.add(throat);
  beads(body, [[-.06, .14, .14], [0, .17, .12], [.06, .14, .14]], .016, 0xd7b0ff);
  const ring = runeRing(body, U, .34, [0, 0, 0], 6, [1.2, 0, 0]);
  const core = glow(U, 1.1, .4); body.add(core);
  return { group: g, shadow: .45, parts: { body }, idle: t => {
    ring.rotation.z = t * 2.2; body.position.y = .9 + Math.sin(t * 1.9) * .05; core.material.opacity = .3 + Math.sin(t * 4) * .1;
    teeth.scale.setScalar(.9 + Math.max(0, Math.sin(t * 1.4)) * .2); throat.material.opacity = .45 + Math.sin(t * 3) * .15;
  } };
}

/** The Dragon Turtle (was the Lantern Tortoise, the elite: hides, spins off the walls, lies dizzy): a dragon's head and
    clawed legs under a dark shell ridged with spikes, an ice lantern burning in a little stone shrine on its back. */
export function dragonTurtle(): Built {
  const g = new THREE.Group(), shellM = gloss(0x24343a, .5, .2), plate = std(0x3a4c50), spikeM = std(0xcfc6b0), skin = gloss(0x3a4a48, .5, .15), stone = std(0x6a7074), horn = std(0xb8d8f0, { emissive: 0x204a6a }), ice = lit(F), body = joint(g, [0, 0, 0]);
  part(body, new THREE.SphereGeometry(.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), shellM, [0, .16, 0], { scale: [1, .8, 1.1] });
  part(body, new THREE.CylinderGeometry(.54, .54, .06, 16), plate, [0, .15, 0], { scale: [1, 1, 1.1] }); // (the shell's rim)
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; spike(body, [Math.cos(a) * .52, .16, Math.sin(a) * .57], [Math.cos(a) * .64, .2, Math.sin(a) * .7], .04, spikeM); } // (spikes round the rim)
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .5; const p: V3 = [Math.cos(a) * .3, .48, Math.sin(a) * .33]; part(body, new THREE.CylinderGeometry(.11, .12, .04, 6), plate, p, { rot: [Math.sin(a) * .5, 0, -Math.cos(a) * .5] }); spike(body, p, [p[0] * 1.15, p[1] + .16, p[2] * 1.15], .035, spikeM); }
  // the dragon's head: a long snout, horns swept back, slit eyes, a jaw of teeth
  const head = joint(body, [0, .24, .6]);
  part(head, sphere(.13, 10, 8), skin, [0, 0, 0], { scale: [1, .85, 1.1] });
  tube(head, [[0, -.01, .06], [0, -.03, .18], [0, -.05, .28]], .09, .055, skin, 6, 7);
  part(head, new THREE.BoxGeometry(.2, .03, .1), skin, [0, .07, .04]);
  slitEyes(head, .07, .05, .1, .03, F, .5, .35);
  for (const s of [-1, 1]) {
    tube(head, [[.06 * s, .08, -.02], [.12 * s, .16, -.12], [.14 * s, .18, -.26]], .03, .006, horn, 8, 5);
    for (const z of [.16, .24]) spike(head, [.04 * s, -.08, z], [.035 * s, -.13, z + .01], .012, spikeM);
  }
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [[-.36, .3], [.36, .3], [-.36, -.3], [.36, -.3]] as [number, number][]) {
    part(legs, sphere(.11, 8, 6), skin, [x, .07, z], { scale: [1, .75, 1.1] });
    for (const k of [-1, 0, 1]) spike(legs, [x * 1.05, .02, z + .08], [x * 1.05 + k * .04, 0, z + .17], .015, spikeM);
  }
  tube(body, [[0, .12, -.55], [.04, .08, -.72], [-.02, .06, -.86]], .07, .015, skin, 8, 5); // (a spiked tail)
  for (let i = 0; i < 3; i++) spike(body, [0, .16 - i * .02, -.6 - i * .1], [0, .24 - i * .03, -.62 - i * .1], .02, spikeM);
  // the shrine on its back: a stone arch over an ice lantern, burning pale
  const shrine = joint(body, [0, .5, -.02]);
  for (const s of [-1, 1]) part(shrine, new THREE.BoxGeometry(.05, .24, .05), stone, [.11 * s, .12, 0]);
  part(shrine, new THREE.TorusGeometry(.11, .028, 4, 10, Math.PI), stone, [0, .24, 0]);
  for (const [x, h, r] of [[0, .16, 0], [-.04, .11, .4], [.045, .1, -.4]] as [number, number, number][]) crystal(shrine, F, [x, h / 2 + .01, 0], h, [0, 0, r], ice);
  const light = glow(F, 1, .6); light.position.y = .12; shrine.add(light);
  return { group: g, shadow: 1.05, parts: { head, legs, light }, idle: t => {
    head.rotation.y = Math.sin(t * .8) * .2; head.rotation.z = 0; head.position.y = .24 + Math.sin(t * 1.3) * .015;
    light.material.opacity = .5 + Math.sin(t * 2.6) * .12;
  } };
}

/** The Gloom Raven (dims the sight; lights drive it off): a raven with wings wider than the mage is tall, black with a violet
    sheen, three slit eyes (the third in its brow), a crest of black spines raised, smoke trailing from its wing tips. */
export function gloomRavenFierce(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .95, 0]), black = gloss(0x1a1628, .4, .25), sheen = gloss(0x3a2a68, .3, .3), beak = gloss(0x0e0c10, .3, .4), smokeM = std(0x0a0810, { transparent: true, opacity: .4, depthWrite: false }), edge = lit(0x8a5ad8);
  part(body, sphere(.2, 10, 8), black, [0, 0, 0], { scale: [.9, .85, 1.6] });
  part(body, sphere(.15, 8, 6), sheen, [0, .06, .05], { scale: [1, .8, 1.3] });
  const head = joint(body, [0, .08, .32]);
  part(head, sphere(.13, 10, 8), black, [0, 0, 0], { scale: [.9, .95, 1.1] });
  tube(head, [[0, .02, .08], [0, .0, .22], [0, -.05, .32]], .06, .01, beak, 6, 6);
  slitEyes(head, .065, .03, .08, .036, 0xd7b0ff, .8, .3);
  part(head, sphere(.03, 8, 6), lit(0xd7b0ff), [0, .09, .07], { scale: [.4, 1, .5] }); // (the third eye, upright in its brow)
  const eyeGlow = glow(U, .5, .7); eyeGlow.position.set(0, .06, .1); head.add(eyeGlow);
  for (let i = 0; i < 6; i++) { const x = (i % 2 ? 1 : -1) * (.015 + Math.floor(i / 2) * .02), z = .02 - Math.floor(i / 2) * .07; spike(head, [x, .1, z], [x * 2.2, .3 - Math.floor(i / 2) * .04, z - .16], .025, black); } // (the crest, raised)
  const wings = ([-1, 1] as const).map(s => {
    const w = featherWing(body, s, [.12 * s, .08, .03], .78, black, sheen, 9, .55);
    for (let i = 0; i < 4; i++) part(w, new THREE.ConeGeometry(.04, .45 + (i % 2) * .15, 4), i % 2 ? edge : black, [(.55 + i * .07) * s, -.01, -.3 - (i % 2) * .08], { rot: [-Math.PI / 2, 0, -(.4 + i * .12) * s], scale: [1, 1, .2] });
    for (let i = 0; i < 3; i++) tube(w, [[(.62 + i * .06) * s, 0, -.3], [(.66 + i * .06) * s, -.04, -.5], [(.6 + i * .08) * s, -.06, -.72]], .05, .01, smokeM, 6, 5); // (smoke trailing from its wing tips)
    return w;
  });
  const tail = joint(body, [0, .01, -.3]);
  for (let i = 0; i < 5; i++) { const a = (i - 2) * .16; part(tail, new THREE.ConeGeometry(.06, .42, 4), i % 2 ? sheen : black, [Math.sin(a) * .2, 0, -.2], { rot: [-Math.PI / 2, 0, -a], scale: [1, 1, .2] }); }
  for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) spike(body, [.06 * s, -.16, .05], [.07 * s + k * .03, -.3, .12], .012, beak);
  const smoke = joint(g, [0, .95, -.4]); // (a drift of smoke behind it, turning as one)
  for (let i = 0; i < 5; i++) part(smoke, sphere(.12 + i * .03, 6, 5), smokeM, [Math.sin(i * 2.2) * .25, -i * .12, -i * .1]);
  part(g, new THREE.CircleGeometry(.75, 16), std(0x000000, { transparent: true, opacity: .4 }), [0, .007, 0], { rot: [-Math.PI / 2, 0, 0] });
  return { group: g, shadow: 0, parts: { body, head }, idle: t => {
    const f = Math.sin(t * 2.4); wings[0].rotation.z = -.3 - f * .55; wings[1].rotation.z = .3 + f * .55; body.position.y = .95 + Math.sin(t * 2.4 + 1.2) * .06;
    head.rotation.y = Math.sin(t * .8) * .35; tail.rotation.x = Math.sin(t * 2.4) * .06;
    smoke.rotation.y = t * .5; smoke.position.y = .95 + Math.sin(t * 1.2) * .05; eyeGlow.material.opacity = .55 + Math.sin(t * 3) * .15;
  } };
}

/** The Rime Warg (was the Rime Wolf; a pack that rings the mage): a hunched warg, dark-furred, high at the shoulder and low
    at the hip, a mane of frost crystals round its neck, ice spines down its back, a heavy jaw and slit eyes of ice. */
export function rimeWarg(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), fur = std(0x3a4452, { roughness: 1 }), back = std(0x232a36, { roughness: 1 }), belly = std(0x56606c), nose = gloss(0x0e1014, .3, .3), tooth = std(0xf4f0e6), ice = lit(0xbfe8ff);
  body.scale.setScalar(1.15);
  tube(body, [[0, .5, -.42], [0, .58, -.15], [0, .68, .12], [0, .66, .26]], .15, .2, fur, 10, 8); // (hunched: high at the shoulder)
  part(body, rough(sphere(.2, 10, 8), .02, 6), back, [0, .74, -.06], { scale: [.85, .5, 1.8] });
  part(body, sphere(.16, 8, 6), belly, [0, .52, .18], { scale: [.85, 1.05, 1] });
  for (let i = 0; i < 9; i++) { const k = i / 9; spike(body, [(i % 2 ? .04 : -.04), .8 - k * .14, .26 - k * .7], [(i % 2 ? .1 : -.1), 1.04 - k * .2, .16 - k * .8], .035 - k * .014, ice); } // (ice spines down its back)
  for (let i = 0; i < 8; i++) { const a = (i / 7 - .5) * 2.6; crystal(body, F, [Math.sin(a) * .17, .68 + Math.cos(a) * .06, .3 - Math.abs(Math.sin(a)) * .06], .12, [-.5, 0, -a * .8], ice); } // (a mane of frost round its neck)
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])]; // (the legs in two diagonal pairs that step together)
  [-1, 1].forEach(s => [[.18, 0], [-.36, 1]].forEach(([z, hind], j) => {
    const l = joint(sets[(j + (s > 0 ? 1 : 0)) % 2], [.11 * s, hind ? .5 : .6, z]);
    const pts: V3[] = hind ? [[0, 0, 0], [.02 * s, -.16, .1], [.02 * s, -.34, -.06], [.02 * s, -.5, .0]] : [[0, 0, 0], [.02 * s, -.28, .02], [.02 * s, -.6, .04]];
    tube(l, pts, hind ? .085 : .07, .035, fur, 8, 6);
    part(l, sphere(.05, 6, 4), back, [.02 * s, hind ? -.5 : -.6, hind ? .04 : .08], { scale: [1, .55, 1.5] });
    for (const k of [-1, 1]) spike(l, [.02 * s, hind ? -.5 : -.6, hind ? .07 : .11], [(.02 + k * .02) * s, hind ? -.52 : -.62, hind ? .12 : .16], .01, tooth);
  }));
  const head = joint(body, [0, .64, .42], [.25, 0, 0]);
  part(head, sphere(.14, 10, 8), fur, [0, 0, 0], { scale: [1, .9, 1.05] });
  part(head, new THREE.ConeGeometry(.09, .28, 6), fur, [0, -.03, .19], { rot: [Math.PI / 2 + .08, 0, 0], scale: [1, 1, .8] });
  part(head, new THREE.BoxGeometry(.2, .03, .08), back, [0, .07, .06]); // (a heavy brow)
  part(head, sphere(.025, 6, 4), nose, [0, -.02, .33]);
  for (const s of [-1, 1]) {
    part(head, new THREE.ConeGeometry(.055, .16, 4), back, [.08 * s, .13, -.04], { rot: [-.5, 0, -.3 * s], scale: [1, 1, .5] });
    for (const z of [.12, .2, .27]) spike(head, [.04 * s, -.08, z], [.037 * s, -.15, z + .01], .013, tooth);
  }
  slitEyes(head, .065, .045, .11, .035, 0xbfe8ff, .55, .4);
  const tail = joint(body, [0, .52, -.48]);
  tube(tail, [[0, 0, 0], [0, -.12, -.16], [.04, -.3, -.24], [.06, -.42, -.22]], .07, .02, fur, 8, 6);
  return { group: g, shadow: 1.2, parts: { body, head, tail }, idle: t => {
    body.position.y = Math.sin(t * 2) * .01; head.rotation.y = Math.sin(t * .9) * .25; head.rotation.x = .25 + Math.sin(t * 1.7) * .05;
    tail.rotation.y = Math.sin(t * 1.4) * .2; sets.forEach((l, i) => { l.rotation.x = (i ? 1 : -1) * Math.sin(t * 2) * .03; });
  } };
}

/** The Tarasque (was the Dust Pangolin; rolls up and glances the cantrip off, dazed by a wall): the armoured beast of the
    old tales, a lion-like head in a shaggy mane, violet slit eyes and fangs, a dark shell ridged with great spikes it rolls
    up in, violet light between its plates, a spiked club of a tail. */
export function tarasque(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), shellM = gloss(0x3a2e2a, .5, .2), plate = std(0x54443c), spikeM = std(0xd8ccb0), skin = std(0x5a4636), mane = std(0x6a3a20, { roughness: 1 }), claw = gloss(0x1a1414, .3, .3), seam = lit(U);
  part(body, rough(new THREE.SphereGeometry(.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), .02, 5), shellM, [0, .2, -.12], { scale: [1, 1, 1.4] });
  part(body, new THREE.CylinderGeometry(.4, .4, .05, 14), plate, [0, .2, -.12], { scale: [1, 1, 1.4] }); // (the shell's rim)
  for (let i = 0; i < 3; i++) part(body, new THREE.TorusGeometry(.3 - i * .06, .012, 3, 16, Math.PI), seam, [0, .24 + i * .06, -.12], { rot: [0, Math.PI / 2, 0], scale: [1, 1 - i * .1, 1.4] }); // (violet light between its plates)
  for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { // (rows of great spikes)
    const z = -.5 + i * .19, x = (r - 1) * .17, y = .2 + Math.sqrt(Math.max(0, 1 - (x / .38) ** 2 - (((z + .12) / .53) ** 2))) * .38;
    spike(body, [x, y - .02, z], [x * 1.4, y + .2 - Math.abs(r - 1) * .05, z - .04], .045 - Math.abs(r - 1) * .01, spikeM);
  }
  // legs: thick, clawed, in two pairs that step together
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])];
  [-1, 1].forEach(s => [[.18, 0], [-.4, 1]].forEach(([z], j) => {
    const l = joint(sets[(j + (s > 0 ? 1 : 0)) % 2], [.24 * s, .26, z]);
    tube(l, [[0, 0, 0], [.04 * s, -.14, .03], [.05 * s, -.26, .05]], .08, .06, skin, 6, 6);
    for (const k of [-1, 0, 1]) spike(l, [.05 * s, -.26, .07], [.05 * s + k * .035, -.27, .15], .018, claw);
  }));
  // the tail, ending in a spiked club
  tube(body, [[0, .16, -.66], [.04, .12, -.82], [-.02, .1, -.96]], .08, .05, skin, 8, 6);
  part(body, sphere(.08, 8, 6), plate, [-.02, .1, -1]);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; spike(body, [-.02, .1, -1], [-.02 + Math.cos(a) * .14, .1 + Math.sin(a) * .14, -1.02], .025, spikeM); }
  // the head: lion-like, in a shaggy mane, fangs, violet slit eyes
  const head = joint(body, [0, .26, .3]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; tube(head, [[Math.cos(a) * .08, Math.sin(a) * .08 + .02, -.02], [Math.cos(a) * .18, Math.sin(a) * .16 + .02, -.08], [Math.cos(a) * .24, Math.sin(a) * .2 - .02, -.14]], .04, .01, mane, 5, 4); }
  part(head, sphere(.12, 10, 8), skin, [0, 0, .04], { scale: [1, .9, 1] });
  tube(head, [[0, -.02, .1], [0, -.04, .18], [0, -.05, .22]], .08, .06, skin, 5, 6);
  part(head, new THREE.BoxGeometry(.18, .03, .08), plate, [0, .07, .08]);
  slitEyes(head, .06, .04, .13, .03, U, .5, .4);
  for (const s of [-1, 1]) { spike(head, [.035 * s, -.07, .2], [.03 * s, -.14, .21], .015, spikeM); spike(head, [.08 * s, .08, 0], [.14 * s, .16, -.08], .025, spikeM); }
  const eyes = glow(U, .35, .5); eyes.position.set(0, .05, .16); head.add(eyes);
  return { group: g, shadow: 1.3, parts: { body, head }, idle: t => {
    body.position.y = Math.abs(Math.sin(t * 2)) * .01; head.rotation.y = Math.sin(t * 1.1) * .3; head.rotation.x = Math.sin(t * 1.7) * .1;
    sets.forEach((l, i) => { l.rotation.x = (i ? 1 : -1) * Math.sin(t * 2) * .05; }); eyes.material.opacity = .4 + Math.sin(t * 3) * .15;
  } };
}

/** Floor 5's new looks, by the look id each replaces. */
export const FLOOR5_LOOKS: Record<string, () => Built> = {
  rootling: mandrake, stormRay: skyRay, voidMote: voidMaw, lanternTortoise: dragonTurtle, gloomRaven: gloomRavenFierce, rimeWolf: rimeWarg, dustPangolin: tarasque,
};
