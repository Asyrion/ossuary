/* M4.12 step 8 (docs/M4.12-plan.md): the bosses' eight cute looks redone as creatures of fantasy, by the rules of
   fantasyFloor1.ts, approved by the owner (2026-10-03) and worn since: each keeps its fight, the parts the fight moves (by
   the old look's names: `eye`, `ring`, `halo` and a boss's own) and about its height; each faces +Z and stands on y = 0;
   no round googly eyes; the school in the body. The Hollow Warden's three are its `BOSS_LOOKS` (bossLooks.ts), which
   builds the rest through its own names (`hartLook`, `anglerLook`, `tigerLook`, `dragonHead`), as serpentLooks.ts does
   the serpent's head. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, circle, limb, lit, motes, part, rune, runeRing, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { gloss, joint, jointed, slitEyes, spike, thin, tube } from './beastParts';
import type { BossBuilt } from './bossLooks';

const { storm: S, umbral: U, hallow: H, frost: F, ember: E } = SCHOOL_LIGHT;

/** The ring of runes behind its head that the fight turns (as bossLooks.ts' own). */
function haloRing(g: THREE.Object3D, color: number, radius: number, y: number, z = -.35) {
  const ring = new THREE.Group(); ring.position.set(0, y, z); ring.rotation.x = -.35; g.add(ring);
  runeRing(ring, color, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0], lit(color, .9));
  return ring;
}
/** One slit eye in a group `eye` (the fight swells it), an almond of `color` with a dark slit across it, `r` long. */
function oneEye(parent: THREE.Object3D, at: V3, r: number, color: number, tip: V3 = [0, 0, 0]) {
  const eye = joint(parent, at, tip);
  part(eye, sphere(r, 12, 8), lit(new THREE.Color(color).lerp(new THREE.Color(0xffffff), .35).getHex()), [0, 0, 0], { scale: [1, .5, .3] });
  part(eye, sphere(r * .6, 8, 6), lit(0x08060c), [0, 0, r * .12], { scale: [.2, .9, .3] });
  return eye;
}

/** The Bell Warden (Storm): a great bronze bell, cracked and green with age, carried on eight long spider legs; under its
    rim a maw ringed with fangs and one slit eye looking out, storm-light crackling in the runes round its waist. */
export function bellWardenFierce(): BossBuilt {
  const g = new THREE.Group(), bronze = gloss(0x7a5226, .45, .6), verd = std(0x3e7a66, { roughness: .7 }), dark = gloss(0x16141c, .5, .2), fang = gloss(0xd8d0c0, .3, .2), body = joint(g, [0, 0, 0]);
  const bell = joint(body, [0, .62, -.12], [-.3, 0, 0]); // (tipped back: the maw and the eye look out from under the lip)
  const profile = [[.98, 0], [.96, .1], [.84, .2], [.72, .45], [.66, .8], [.6, 1.05], [.44, 1.2], [.2, 1.27], [0, 1.28]].map(([x, y]) => new THREE.Vector2(x, y));
  part(bell, new THREE.LatheGeometry(profile, 20), bronze, [0, 0, 0]);
  part(bell, new THREE.TorusGeometry(.97, .05, 5, 28), bronze, [0, .03, 0], { rot: [Math.PI / 2, 0, 0] });
  for (const [y, r] of [[.24, .82], [.9, .63]] as [number, number][]) part(bell, new THREE.TorusGeometry(r, .025, 4, 26), verd, [0, y, 0], { rot: [Math.PI / 2, 0, 0] });
  for (const [x, y, rz] of [[.35, .95, .5], [.44, .72, -.3], [.5, .52, .4]] as V3[]) part(bell, new THREE.BoxGeometry(.03, .22, .03), lit(S), [x, y, .54 + (1 - y) * .2], { rot: [0, .6, rz] }); // (the crack, storm-light in it)
  const runes = joint(bell, [0, 0, 0]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; rune(runes, S, [Math.sin(a) * .72, .5, Math.cos(a) * .72], .16, [0, a, 0]); }
  for (const s of [-1, 1]) tube(bell, [[.14 * s, 1.24, 0], [.3 * s, 1.44, -.1], [.36 * s, 1.62, -.3]], .06, .01, verd, 8, 5); // (horns where its rope once hung)
  // in its face: a maw split across the bronze, fangs above and below and storm-light inside, and one slit eye above it
  part(bell, sphere(.36, 14, 8), lit(0x0a080e), [0, .3, .7], { scale: [1, .32, .35] });
  part(bell, sphere(.24, 10, 6), lit(S), [0, .3, .72], { scale: [1, .14, .3] });
  for (let i = 0; i < 6; i++) { const x = (i / 5 - .5) * .5, z = Math.sqrt(.79 ** 2 - x * x); spike(bell, [x, .4, z], [x * .95, .28, z + .02], .035, fang); spike(bell, [x + .04, .2, z - .01], [(x + .04) * .95, .3, z + .01], .03, fang); }
  const eye = oneEye(bell, [0, .74, .66], .22, S, [-.15, 0, 0]);
  const lamp = glow(S, .9, .5); lamp.position.set(0, 0, .1); eye.add(lamp);
  // eight long legs, in two sets that step by turns
  const sets = [joint(body, [0, 0, 0]), joint(body, [0, 0, 0])];
  [-1, 1].forEach(s => [.55, .2, -.2, -.55].forEach((z, i) => {
    const l = joint(sets[(i + (s > 0 ? 1 : 0)) % 2], [.6 * s, .62, z]);
    jointed(l, [[0, 0, 0], [.55 * s, .5, z * .4], [1.05 * s, 0, z * .7]], .07, .03, dark, bronze);
  }));
  const ring = haloRing(g, S, .72, 2.25);
  const halo = glow(S, 3, .35); halo.position.set(0, 1.6, -.3); g.add(halo);
  return { group: g, shadow: 2.4, school: 'storm', parts: { eye, ring, halo }, idle: t => {
    sets.forEach((l, i) => { l.rotation.y = (i ? 1 : -1) * Math.sin(t * 2.4) * .05; l.position.y = Math.max(0, Math.sin(t * 2.4 + i * Math.PI)) * .04; });
    bell.rotation.z = Math.sin(t * 1.3) * .03; runes.visible = Math.floor(t * 7) % 5 !== 0;
  } };
}

/** The Mother of Spores (Umbral): a hunched fungal matriarch as tall as a door, a hood of shelf fungus gilled beneath
    over a face of slit eyes and a gilled maw, many long arms of root reaching out, sacs of spores glowing violet on her
    back, her young sprouting round her feet. */
export function sporeMatriarch(): BossBuilt {
  const g = new THREE.Group(), flesh = std(0x5e4a56, { roughness: .95 }), fleshDark = std(0x3a2c38, { roughness: .95 }), hoodM = std(0x7a3e9a, { roughness: .85 }), gill = std(0x2a1634), sac = lit(U), body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(.55, 14, 10), .03, 2), flesh, [0, .75, -.05], { scale: [1, 1.2, .9] });
  part(body, new THREE.ConeGeometry(.7, .6, 10, 1, true), fleshDark, [0, .3, 0]); // (a skirt of fungal folds)
  for (const [x, y, z, r] of [[-.3, 1.2, -.3, .14], [.32, 1.15, -.32, .12], [0, 1.35, -.4, .16], [-.1, .9, -.45, .1], [.22, .85, -.44, .09]]) part(body, sphere(r, 8, 6), sac, [x, y, z]); // (spore sacs on her back)
  // the hood: shelves of fungus stacked over her face, gilled beneath, tipped back so the face shows from above
  const hood = joint(body, [0, 1.42, -.16], [-.6, 0, 0]);
  for (const [y, z, r] of [[0, 0, .75], [.16, -.18, .6], [.3, -.34, .45]] as V3[]) {
    part(hood, new THREE.SphereGeometry(r, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2), hoodM, [0, y, z], { scale: [1.1, .4, 1] });
    part(hood, new THREE.CircleGeometry(r, 18), gill, [0, y - .003, z], { rot: [Math.PI / 2, 0, 0], scale: [1.1, 1, 1] });
    for (let i = 0; i < 9; i++) { const a = (i / 8 - .5) * 3.4, o: V3 = [Math.sin(a) * r * 1.05, y, z + Math.cos(a) * r * .95]; spike(hood, o, [o[0] * 1.2, y + .03, z + (o[2] - z) * 1.2], .05, hoodM); }
  }
  for (let i = 0; i < 6; i++) part(hood, sphere(.05, 6, 4), sac, [Math.sin(i * 2.4) * .4, .12, -.1 + Math.cos(i * 2.4) * .3], { scale: [1, .4, 1] });
  // the face under it: two slits of violet (the eye the fight swells) and a gilled maw
  const eye = joint(body, [0, 1.12, .48], [-.3, 0, 0]);
  slitEyes(eye, .16, 0, 0, .1, U, .45, .35); part(eye, sphere(.07, 8, 6), lit(U), [0, .13, -.02], { scale: [.38, 1, .5] }); // (a third, upright, above them)
  const eyeGlow = glow(U, .8, .5); eye.add(eyeGlow);
  part(body, new THREE.CircleGeometry(.16, 12), lit(0x12081a), [0, .9, .5], { rot: [-.3, 0, 0], scale: [1.2, .8, 1] });
  for (let i = 0; i < 7; i++) { const x = (i / 6 - .5) * .36; spike(body, [x, .98, .5], [x * .8, .86, .56], .02, gill); }
  // many arms of root: three pairs, reaching out and up, fingers like hooks
  const arms = joint(body, [0, 0, 0]);
  for (const s of [-1, 1]) for (const [y, reach, up] of [[1.15, .9, .4], [.9, 1.05, .1], [.65, .85, -.15]] as V3[]) {
    tube(arms, [[.4 * s, y, .1], [.7 * s, y + up * .5, .3], [reach * s, y + up, .4], [(reach + .15) * s, y + up - .1, .55]], .07, .02, fleshDark, 10, 5);
    for (const k of [-1, 0, 1]) spike(arms, [(reach + .15) * s, y + up - .1, .55], [(reach + .25) * s, y + up - .18 + k * .06, .62], .015, fleshDark);
  }
  // her young at her feet
  for (const [x, z, sc] of [[-.85, .45, .5], [.9, .35, .4], [-.5, -.7, .45], [.65, -.6, .55]] as V3[]) {
    const m = joint(g, [x, 0, z]); m.scale.setScalar(sc);
    part(m, sphere(.16, 8, 6), flesh, [0, .2, 0], { scale: [1, 1.2, 1] });
    part(m, new THREE.SphereGeometry(.28, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hoodM, [0, .36, 0], { scale: [1, .45, 1] });
    part(m, sphere(.05, 6, 4), sac, [0, .44, .15]);
  }
  const ring = haloRing(g, U, .8, 2.6);
  const halo = glow(U, 3.2, .35); halo.position.set(0, 1.6, -.3); g.add(halo);
  return { group: g, shadow: 2.4, school: 'umbral', parts: { eye, ring, halo }, idle: t => {
    const b = Math.sin(t * 1.6); body.scale.set(1 + b * .02, 1 - b * .025, 1 + b * .02); hood.rotation.z = Math.sin(t * 1.1) * .04;
    arms.rotation.y = Math.sin(t * .9) * .05; arms.position.y = Math.sin(t * 1.3) * .03; eyeGlow.material.opacity = .4 + Math.sin(t * 2.2) * .12;
  } };
}

/** The Owlbear (Hallow; was the Hollow Owl): a bear's great hunched body under an owl's head, a hooked beak, a disc of
    pale feathers round two slits of gold, ear tufts like horns, clawed forelimbs, a crown of candles burning in its light. */
export function owlbear(): BossBuilt {
  const g = new THREE.Group(), fur = std(0x4a3c30, { roughness: 1 }), furDark = std(0x2e241c, { roughness: 1 }), feather = std(0x8a7a66), disc = std(0xb8a888), beakM = gloss(0x3a2c18, .35, .3), claw = gloss(0xd8ccb0, .3, .2), wax = std(0xf0e2c6), body = joint(g, [0, 0, 0]);
  part(body, rough(sphere(.8, 16, 12), .03, 3), fur, [0, .95, -.08], { scale: [1.05, 1.05, 1] });
  part(body, sphere(.55, 12, 10), feather, [0, 1.05, .35], { scale: [1, 1.1, .55] }); // (a ruff of feathers at its breast)
  for (let i = 0; i < 12; i++) spike(body, [((i % 4) - 1.5) * .2, 1.3 - Math.floor(i / 4) * .22, .55], [((i % 4) - 1.5) * .22, 1.2 - Math.floor(i / 4) * .22, .64], .05, furDark); // (its feathers, in rows)
  // forelimbs: thick, clawed, planted before it
  for (const s of [-1, 1]) {
    jointed(body, [[.6 * s, 1.2, .2], [.75 * s, .7, .45], [.6 * s, .08, .6]], .2, .14, fur);
    for (const k of [-1, 0, 1]) spike(body, [.6 * s + k * .08, .06, .7], [.6 * s + k * .1, 0, .88], .04, claw);
    part(body, sphere(.22, 8, 6), furDark, [.42 * s, .2, -.4], { scale: [1, .8, 1.3] }); // (haunches)
  }
  // the head: an owl's, its face a disc of feathers, slit eyes of gold, a hooked beak, tufts like horns
  const head = joint(body, [0, 1.85, .2]);
  part(head, sphere(.58, 16, 12), feather, [0, 0, 0], { scale: [1.15, .9, 1] });
  const face = joint(head, [0, -.02, .6], [-.4, 0, 0]); // (tipped up to the camera)
  part(face, new THREE.CircleGeometry(.44, 20), disc, [0, 0, 0], { scale: [1.15, 1, 1] });
  for (const s of [-1, 1]) part(face, new THREE.TorusGeometry(.17, .035, 4, 14, Math.PI), furDark, [.2 * s, .0, .01], { rot: [0, 0, s * .3] }); // (dark brows over its eyes, low at the beak: a scowl)
  const eye = joint(face, [0, .05, .03]);
  slitEyes(eye, .2, 0, 0, .1, H, .2, .4);
  tube(face, [[0, -.04, .02], [0, -.14, .14], [0, -.28, .1]], .07, .01, beakM, 6, 5); // (the hooked beak)
  for (const s of [-1, 1]) tube(head, [[.32 * s, .34, -.02], [.46 * s, .56, -.08], [.52 * s, .72, -.2]], .09, .015, furDark, 8, 5); // (ear tufts like horns)
  // the crown of candles, their flames its school's light
  const crown = joint(head, [0, .45, -.05]);
  const flames = joint(crown, [0, 0, 0]);
  for (let i = 0; i < 5; i++) { const a = (i - 2) * .38, x = Math.sin(a) * .32, z = -Math.cos(a) * .1, h = .16 + (i % 2) * .07; part(crown, new THREE.CylinderGeometry(.04, .045, h, 7), wax, [x, h / 2, z]); part(flames, new THREE.ConeGeometry(.035, .1, 6), lit(H), [x, h + .05, z]); }
  const candleGlow = glow(H, 1.2, .55); candleGlow.position.y = .3; crown.add(candleGlow);
  circle(g, H, 1.3);
  const ring = haloRing(g, H, .8, 2.85);
  const halo = glow(H, 3, .35); halo.position.set(0, 2, -.3); g.add(halo);
  return { group: g, shadow: 2.2, school: 'hallow', parts: { eye, ring, halo }, idle: t => {
    head.rotation.y = Math.sin(t * .6) * .25; head.rotation.z = Math.sin(t * .9) * .06; body.position.y = Math.sin(t * 1.4) * .02;
    flames.scale.set(1, .85 + Math.sin(t * 13) * .15, 1); candleGlow.material.opacity = .5 + Math.sin(t * 9) * .08;
  } };
}

/** The Hallowed Hart (Hallow): a gaunt white stag, its ribs showing, a long silver mane down its neck, slit eyes of light
    and antlers that are light itself. Keeps its fight's parts: `body` (it rears), `head` (lowers its antlers), `antlers`
    and four legs in `legs` (it trots and charges). */
export function hartFierce(): BossBuilt {
  const g = new THREE.Group(), coat = std(0xd8d2c4), shade = std(0x9e968a), mane = std(0x8a8c98, { roughness: 1 }), hoof = gloss(0x1e1a18, .4, .3), antlerM = lit(H), muzzle = std(0x8a8072);
  const body = joint(g, [0, 0, 0]);
  part(body, sphere(.7, 16, 12), coat, [0, 1.05, -.05], { scale: [.62, .58, 1.1] });
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) part(body, new THREE.TorusGeometry(.42, .018, 3, 10, 1.5), shade, [.02 * s, 1.0, .25 - i * .14], { rot: [0, Math.PI / 2, s > 0 ? -.75 : Math.PI + .75] }); // (ribs showing)
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [[-.24, .45], [.24, .45], [-.24, -.55], [.24, -.55]] as [number, number][]) {
    const l = joint(legs, [x, .82, z]);
    jointed(l, [[0, 0, 0], [0, -.42, .03], [0, -.74, -.02]], .075, .05, coat);
    part(l, new THREE.CylinderGeometry(.05, .065, .1, 7), hoof, [0, -.78, -.02]);
  }
  tube(body, [[0, 1.25, .55], [0, 1.55, .72], [0, 1.82, .86]], .17, .12, coat, 8, 7); // (a long neck)
  for (let i = 0; i < 7; i++) { const y = 1.86 - i * .1, z = .78 - i * .05, s = i % 2 ? 1 : -1; tube(body, [[0, y + .05, z - .08], [.08 * s, y - .08, z - .14], [.12 * s, y - .24, z - .12]], .045, .008, mane, 6, 4); } // (the mane, long and lank)
  const head = joint(body, [0, 1.94, .9]);
  part(head, sphere(.24, 14, 10), coat, [0, 0, 0], { scale: [.85, .85, 1.1] });
  tube(head, [[0, -.03, .12], [0, -.08, .3], [0, -.1, .42]], .13, .08, coat, 6, 7); // (a long gaunt face)
  part(head, sphere(.07, 8, 6), muzzle, [0, -.1, .44]);
  for (const s of [-1, 1]) spike(head, [.18 * s, .12, -.04], [.36 * s, .18, -.12], .05, shade); // (ears, laid back)
  const eye = joint(head, [0, .06, .18]);
  slitEyes(eye, .13, 0, 0, .05, H, .55, .35);
  // the antlers: light itself, a beam each side and its tines
  const antlers = joint(head, [0, .2, -.05]);
  for (const s of [-1, 1]) {
    const beam: V3[] = [[.1 * s, 0, 0], [.34 * s, .3, -.05], [.5 * s, .62, -.12], [.56 * s, .96, -.05]];
    for (let i = 0; i < 3; i++) limb(antlers, beam[i], beam[i + 1], .04 - i * .008, antlerM, .034 - i * .008);
    for (const [from, tip] of [[beam[1], [.64 * s, .5, .1]], [beam[2], [.26 * s, .8, .02]], [beam[2], [.78 * s, .86, -.1]], [beam[3], [.66 * s, 1.08, -.12]]] as [V3, V3][]) limb(antlers, from, tip, .028, antlerM, .012);
  }
  const candleGlow = glow(H, 2, .5); candleGlow.position.set(0, .8, -.05); antlers.add(candleGlow);
  const tail = joint(body, [0, 1.2, -.85]);
  part(tail, new THREE.ConeGeometry(.08, .26, 6), coat, [0, 0, -.06], { rot: [-2.2, 0, 0] });
  circle(g, H, 1.45);
  const ring = haloRing(g, H, .9, 2.7, .5);
  const halo = glow(H, 3.4, .35); halo.position.set(0, 2.2, 0); g.add(halo);
  const dust = motes(g, H, 5, 1.3, 1.5, .03);
  return { group: g, shadow: 2.4, school: 'hallow', parts: { eye, ring, halo, body, head, antlers, legs }, idle: t => {
    head.position.y = 1.94 + Math.sin(t * 1.4) * .025; body.scale.y = 1 + Math.sin(t * 1.4) * .01; tail.rotation.x = Math.sin(t * 5) * .15;
    candleGlow.material.opacity = .45 + Math.sin(t * 3) * .1; dust(t, .45);
  } };
}

/** The Deep Angler (Umbral): a great anglerfish of black, its eyes small slits of cold light, needle teeth in a jaw that
    drops, ragged fins; the lure on its stalk is its only light. Keeps `body`, `jaw`, `lure` and `lureGlow`. */
export function anglerFierce(): BossBuilt {
  const g = new THREE.Group(), skin = gloss(0x0c0e16, .55, .2), belly = std(0x1a1c28), finM = thin(0x141624, { roughness: .9 }), mouthM = lit(0x14040e), tooth = gloss(0xe8e4f0, .3, .2), stalkM = std(0x10121c);
  const body = joint(g, [0, 1.25, 0]);
  part(body, rough(sphere(.95, 18, 14), .03, 4), skin, [0, 0, 0], { scale: [1, .88, 1] });
  part(body, sphere(.8, 14, 10), belly, [0, -.3, .12], { scale: [1, .66, .95] });
  part(body, new THREE.SphereGeometry(.6, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mouthM, [0, -.12, .52], { scale: [1.05, .5, .62] });
  for (let i = 0; i < 11; i++) { const a = (i / 10 - .5) * 2.4; part(body, new THREE.ConeGeometry(.045, .3, 5), tooth, [Math.sin(a) * .58, -.18, .62 + Math.cos(a) * .3], { rot: [Math.PI - .2, 0, 0] }); }
  const jaw = joint(body, [0, -.3, .2]);
  part(jaw, new THREE.SphereGeometry(.64, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin, [0, .02, .35], { scale: [1.04, .55, .75] });
  for (let i = 0; i < 12; i++) { const a = (i / 11 - .5) * 2.5; part(jaw, new THREE.ConeGeometry(.05, .3, 5), tooth, [Math.sin(a) * .62, .1, .35 + Math.cos(a) * .44], { rot: [.2, 0, 0] }); }
  const eye = joint(body, [0, .3, .72]);
  slitEyes(eye, .28, 0, 0, .06, 0x7fe8e0, .5, .3);
  // the lure: a stalk curving up and forward from its brow, a lamp of cold light at its end, its only light
  const stalk = joint(body, [0, .78, .25]);
  tube(stalk, [[0, 0, 0], [0, .55, .25], [0, .72, .7], [0, .55, 1.02]], .04, .02, stalkM, 12, 5);
  const lure = joint(stalk, [0, .45, 1.08]);
  part(lure, sphere(.14, 12, 10), lit(0xeee4ff), [0, 0, 0]);
  const lureGlow = glow(U, 1.7, .6); lure.add(lureGlow);
  // fins, ragged: two that beat, a ridge of spines along its back, a forked tail
  const fins = [-1, 1].map(s => { const f = joint(body, [.88 * s, -.05, -.1]); for (let k = 0; k < 3; k++) spike(f, [0, 0, -k * .1], [.6 * s, -.1 + k * .1, -.2 - k * .1], .06, finM); return f; });
  for (let i = 0; i < 5; i++) spike(body, [0, .8 - i * .08, -.1 - i * .2], [0, 1.2 - i * .1, -.3 - i * .22], .05, finM);
  const tail = joint(body, [0, 0, -.9]);
  for (const s of [-1, 1]) spike(tail, [0, 0, 0], [0, .5 * s, -.6], .12, finM);
  const ring = haloRing(g, U, .95, 2.55, -.6);
  const halo = glow(U, 3.6, .35); halo.position.set(0, 1.3, -.4); g.add(halo);
  return { group: g, shadow: 2.5, school: 'umbral', parts: { eye, ring, halo, body, jaw, lure, lureGlow }, idle: t => {
    body.position.y = 1.25 + Math.sin(t * 1.3) * .08; fins.forEach((f, i) => { f.rotation.y = Math.sin(t * 4 + i * Math.PI) * .45; });
    tail.rotation.y = Math.sin(t * 2.2) * .3; stalk.rotation.x = Math.sin(t * 1.7) * .08; jaw.rotation.x = .06 + Math.sin(t * 1.1) * .05;
  } };
}

/** The War-Tiger (Frost): a white-maned tiger snarling, its long face wrinkled back from great fangs, slit eyes of frost
    under a heavy brow, ears laid back; armoured in plates of bronze and stone, each with a rune of frost. Keeps its fight's
    parts: `body`, `head`, `jaw`, `legs` (the second its swiping forepaw), `tail`, `rime` and the plates `plate0` to `plate3`. */
export function tigerFierce(): BossBuilt {
  const g = new THREE.Group(), fur = std(0xd8d0c2), pale = std(0xeee8de), stripe = std(0x1e1e26), nose = std(0x3a2228), claw = gloss(0xe0d8c8, .3, .2), gum = lit(0x5a1a20);
  const bronze = gloss(0x9a6a32, .4, .6), verd = std(0x4a8a76, { roughness: .7 }), stone = std(0x6a665e, { roughness: .95 }), stoneDark = std(0x4a4640), runeM = lit(F, .95);
  const body = joint(g, [0, 0, 0]);
  part(body, sphere(.7, 16, 12), fur, [0, .84, -.05], { scale: [.8, .6, 1.25] });
  part(body, sphere(.5, 12, 10), pale, [0, .66, .12], { scale: [.9, .5, 1.3] });
  for (const dz of [-.66, -.42, -.18, .06, .28]) for (const s of [-1, 1]) { // (stripes, dark and jagged, from the spine down each flank)
    const f = Math.sqrt(Math.max(0, 1 - (dz / .88) ** 2)), pts: V3[] = [];
    for (let k = 0; k <= 5; k++) { const a = Math.PI / 2 - s * (.15 + k * .2); pts.push([Math.cos(a) * .58 * f, .84 + Math.sin(a) * .44 * f, -.05 + dz + (k % 2) * .05]); }
    tube(body, pts, .05, .012, stripe, 8, 4);
  }
  const legs = joint(body, [0, 0, 0]);
  for (const [x, z] of [[-.34, .5], [.34, .5], [-.32, -.58], [.32, -.58]] as [number, number][]) {
    const l = joint(legs, [x, .72, z]);
    jointed(l, [[0, 0, 0], [0, -.36, .04], [0, -.62, .02]], .14, .1, fur);
    part(l, sphere(.13, 10, 8), pale, [0, -.64, .07], { scale: [1, .55, 1.3] });
    for (let i = -1; i <= 1; i++) spike(l, [i * .055, -.64, .16], [i * .06, -.68, .28], .022, pale); // (in the paw's surface: each leg moves apart, a surface a call)
  }
  // the head: long, snarling, a heavy brow over slit eyes, the muzzle wrinkled back from its fangs, ears laid back
  const head = joint(body, [0, 1.1, .92]);
  part(head, sphere(.36, 14, 12), fur, [0, 0, 0], { scale: [1.05, .88, 1.1] });
  tube(head, [[0, -.06, .18], [0, -.1, .34], [0, -.12, .44]], .2, .15, pale, 6, 8); // (the long muzzle)
  part(head, sphere(.05, 7, 5), nose, [0, -.04, .48], { scale: [1.4, .8, 1] });
  for (let i = 0; i < 3; i++) part(head, new THREE.TorusGeometry(.12, .012, 3, 10, 2), stripe, [0, -.02 + i * .03, .32 - i * .04], { rot: [-.4, 0, Math.PI * .5 - 1], scale: [1, .5, 1] }); // (the snarl's wrinkles)
  part(head, new THREE.BoxGeometry(.5, .07, .14), fur, [0, .14, .18]); // (the heavy brow)
  for (const s of [-1, 1]) {
    spike(head, [.24 * s, .26, -.06], [.42 * s, .3, -.22], .08, fur); // (ears, laid back)
    for (let i = 0; i < 2; i++) part(head, new THREE.BoxGeometry(.035, .14, .03), stripe, [(.3 + i * .05) * s, .0 - i * .08, .16], { rot: [0, 0, s * (1.2 + i * .2)] });
    spike(head, [.08 * s, -.16, .4], [.07 * s, -.34, .43], .035, claw); // (the great upper fangs)
  }
  const jaw = joint(head, [0, -.2, .14]);
  part(jaw, sphere(.17, 10, 6), pale, [0, -.02, .22], { scale: [1.05, .45, 1] });
  part(jaw, new THREE.BoxGeometry(.2, .02, .16), gum, [0, .04, .22]);
  for (const s of [-1, 1]) spike(jaw, [.08 * s, .04, .34], [.07 * s, .14, .36], .025, claw);
  const eye = joint(head, [0, .08, .3]);
  slitEyes(eye, .14, 0, 0, .055, F, .45, .4);
  // the mane: a white ruff round the face, tufts pointing out
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = .42 + (i % 2) * .06; part(head, new THREE.ConeGeometry(.1, .34, 5), pale, [Math.cos(a) * r, Math.sin(a) * r * .9 - .02, -.16], { rot: [0, 0, a - Math.PI / 2] }); }
  const tail = joint(body, [0, .9, -.98]);
  const tp: V3[] = [[0, 0, 0], [0, -.12, -.36], [0, -.1, -.72], [0, .12, -.94]];
  tube(tail, tp, .07, .03, fur, 10, 6);
  for (let i = 1; i < 4; i++) part(tail, new THREE.TorusGeometry(.065 - i * .01, .02, 4, 10), stripe, tp[i], { rot: [Math.PI / 2 + i * .5, 0, 0] });
  // the plates: bronze pauldrons, a slab of carved stone on its back, a bronze brow plate
  const plates = [-1, 1].map(s => {
    const p = joint(body, [.4 * s, 1.02, .44], [0, 0, -s * .55]);
    part(p, new THREE.SphereGeometry(.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, [0, 0, 0], { scale: [1, .62, 1.2] });
    part(p, new THREE.TorusGeometry(.3, .03, 4, 20), verd, [0, 0, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, 1.2, 1] });
    for (let k = 0; k < 3; k++) spike(p, [.1 * s, .12, -.2 + k * .2], [.18 * s, .32, -.24 + k * .2], .04, bronze); // (spikes on the pauldron)
    rune(p, F, [0, .19, 0], .16, [-Math.PI / 2, 0, 0], runeM);
    return p;
  });
  const back = joint(body, [0, 1.28, -.2], [.06, 0, 0]);
  part(back, new THREE.BoxGeometry(.62, .1, .9), stone, [0, 0, 0]);
  for (const s of [-1, 1]) part(back, new THREE.BoxGeometry(.06, .12, .92), stoneDark, [.31 * s, -.01, 0]);
  for (const z of [-.25, .25]) rune(back, F, [0, .056, z], .2, [-Math.PI / 2, 0, 0], runeM);
  plates.push(back);
  const brow = joint(head, [0, .22, .1], [.45, 0, 0]);
  part(brow, new THREE.SphereGeometry(.4, 14, 6, 0, Math.PI * 2, 0, Math.PI * .26), bronze, [0, -.3, 0]);
  part(brow, new THREE.BoxGeometry(.05, .07, .36), bronze, [0, .1, 0]);
  rune(brow, F, [0, .115, .1], .12, [-Math.PI / 2, 0, 0], runeM);
  plates.push(brow);
  circle(g, F, 1.5);
  const ring = haloRing(g, F, .9, 2.35, -.2);
  const halo = glow(F, 3.4, .35); halo.position.set(0, 1.9, 0); g.add(halo);
  const rime = joint(g, [0, 0, 0]);
  const frost = motes(rime, F, 6, 1.3, 1.2, .03);
  return { group: g, shadow: 2.5, school: 'frost', parts: { eye, ring, halo, body, head, jaw, legs, tail, rime, plate0: plates[0], plate1: plates[1], plate2: plates[2], plate3: plates[3] }, idle: t => {
    const b = Math.sin(t * 1.8); body.scale.set(1, 1 + b * .015, 1); head.rotation.z = Math.sin(t * .7) * .05;
    tail.rotation.y = Math.sin(t * 1.9) * .35; tail.rotation.x = Math.sin(t * 1.3) * .1; frost(t, .5);
  } };
}

/** The Pillar Dragon's head (Ember and Frost): split orange and blue-grey as its body is, horns sweeping back, a brow of
    spines over slit eyes, a long jaw of fangs, a beard and whiskers; its maw glows as it breathes. Keeps `head`, `jaw` and
    `maw`. */
export function dragonHeadFierce(): BossBuilt {
  const g = new THREE.Group(), orange = gloss(0xb85a20, .55, .15), blue = gloss(0x4a5a70, .55, .15), cream = std(0xe0d2b2), horn = std(0xd8c4a0, { roughness: .5 }), dark = std(0x1a100c), fang = gloss(0xf4efe4, .3, .2);
  const head = joint(g, [0, 0, 0]);
  const halfBall = (r: number, side: 1 | -1) => new THREE.SphereGeometry(r, 12, 9, side > 0 ? 0 : Math.PI, Math.PI).rotateY(Math.PI / 2);
  const split = (r: number, at: V3, scale: V3) => { for (const s of [1, -1] as const) part(head, halfBall(r, s), s > 0 ? orange : blue, at, { scale }); };
  split(.28, [0, .06, .12], [1, .8, 1.15]); // (the skull)
  split(.19, [0, -.01, .5], [.85, .6, 1.7]); // (a long snout)
  part(head, sphere(.08, 8, 6), cream, [0, .02, .8], { scale: [1.2, .7, .9] });
  for (const s of [-1, 1]) part(head, sphere(.025, 5, 4), dark, [.05 * s, .06, .86]);
  for (const s of [-1, 1]) { part(head, new THREE.BoxGeometry(.14, .05, .24), s > 0 ? orange : blue, [.15 * s, .2, .32], { rot: [-.2, .2 * s, .25 * s] }); for (let k = 0; k < 3; k++) spike(head, [.16 * s, .22, .24 - k * .08], [.24 * s, .32, .16 - k * .1], .025, horn); } // (a brow of spines)
  const eye = joint(head, [0, .15, .4]);
  slitEyes(eye, .12, 0, 0, .05, E, .5, .35);
  for (const s of [-1, 1]) tube(head, [[.12 * s, .26, 0], [.24 * s, .42, -.18], [.3 * s, .44, -.42], [.26 * s, .3, -.6]], .055, .01, horn, 12, 6); // (horns sweeping back)
  for (let i = 0; i < 7; i++) { const a = -.3 + i / 6 * (Math.PI + .6); spike(head, [Math.cos(a) * .26, .06 + Math.sin(a) * .26, -.14], [Math.cos(a) * .44, .06 + Math.sin(a) * .44, -.36], .04, cream); } // (a mane of spikes)
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) spike(head, [.08 * s, -.08, .5 + i * .12], [.07 * s, -.18, .52 + i * .12], .018, fang);
  const jaw = joint(head, [0, -.12, .2]);
  part(jaw, sphere(.16, 10, 7), cream, [0, -.02, .3], { scale: [.8, .4, 1.8] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) spike(jaw, [.07 * s, .04, .3 + i * .12], [.065 * s, .12, .32 + i * .12], .016, fang);
  for (let i = 0; i < 5; i++) spike(jaw, [(i - 2) * .05, -.08, .28 - Math.abs(i - 2) * .03], [(i - 2) * .06, -.36 + Math.abs(i - 2) * .05, .2], .04, cream); // (the beard)
  for (const s of [-1, 1]) tube(head, [[.12 * s, 0, .66], [.4 * s, -.06, .78], [.68 * s, -.2, .66], [.86 * s, -.36, .44]], .014, .006, cream, 10, 4); // (whiskers)
  const maw = glow(0xe07a2c, 1.6, 0); maw.position.set(0, -.08, .8); head.add(maw);
  const ring = haloRing(g, E, .42, .82, -.5);
  const halo = glow(0xe07a2c, 2.6, .3); halo.position.set(0, .3, -.2); g.add(halo);
  return { group: g, shadow: 1.2, school: 'ember', parts: { eye, ring, halo, head, jaw, maw }, idle: t => {
    head.rotation.z = Math.sin(t * 1.2) * .06; head.rotation.x = Math.sin(t * .9) * .05;
  } };
}

/** The jelly serpent's head: a wyrm of clear jelly, its skull and jaw of green-white bone seen through it, small slits of
    light deep in the sockets, a crest of jelly fins. Keeps `head`, `jaw` and `fins`. */
export function serpentHeadFierce(): BossBuilt {
  const g = new THREE.Group(), jelly = std(0x6ad868, { roughness: .2, transparent: true, opacity: .55, emissive: 0x1e6a34, emissiveIntensity: .45, depthWrite: false });
  const bone = std(0xd8f0c8, { roughness: .5, emissive: 0x3a5a3a, emissiveIntensity: .3 }), fin = std(0xc8ffb0, { roughness: .3, transparent: true, opacity: .7, emissive: 0x4a8a4a, emissiveIntensity: .5 }), socket = lit(0x0a1a0e);
  const head = joint(g, [0, 0, 0]);
  // the skull, seen through the jelly: a long dome, the sockets, a ridge
  part(head, sphere(.2, 12, 9), bone, [0, .06, .08], { scale: [1, .7, 1.2] });
  tube(head, [[0, .02, .2], [0, -.01, .42], [0, -.03, .6]], .12, .07, bone, 6, 6);
  for (const s of [-1, 1]) part(head, sphere(.065, 8, 6), socket, [.11 * s, .12, .28], { scale: [1.1, .8, .6] });
  const eye = joint(head, [0, .12, .31]);
  slitEyes(eye, .11, 0, 0, .03, 0xc8ffb0, .5, .3);
  part(head, sphere(.34, 14, 10), jelly, [0, .04, .1], { scale: [1, .8, 1.25] }); // (the jelly round it)
  part(head, sphere(.24, 12, 8), jelly, [0, -.02, .42], { scale: [.95, .62, 1.3] });
  const jaw = joint(head, [0, -.13, .14]);
  tube(jaw, [[.1, -.02, 0], [.08, -.04, .25], [0, -.05, .48]], .03, .02, bone, 6, 4); tube(jaw, [[-.1, -.02, 0], [-.08, -.04, .25], [0, -.05, .48]], .03, .02, bone, 6, 4); // (the jawbone, seen through)
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) spike(jaw, [.08 * s - i * .015 * s, -.02, .1 + i * .1], [.075 * s - i * .015 * s, .06, .11 + i * .1], .015, bone);
  part(jaw, sphere(.2, 10, 7), jelly, [0, -.02, .22], { scale: [.85, .42, 1.45] });
  const fins = joint(head, [0, 0, 0]);
  for (let i = 0; i < 5; i++) part(fins, new THREE.ConeGeometry(.09 - i * .01, .36 - i * .04, 4), fin, [0, .3 - i * .02, .1 - i * .13], { rot: [-.6, 0, 0], scale: [.3, 1, 1] });
  for (const s of [-1, 1]) part(fins, new THREE.ConeGeometry(.07, .32, 4), fin, [.3 * s, .02, -.08], { rot: [-.4, 0, -s * 1.1], scale: [.3, 1, 1] });
  const ring = joint(g, [0, .5, -.1]);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; part(ring, sphere(.035 + (i % 3) * .01, 6, 5), fin, [Math.cos(a) * .42, Math.sin(a * 2) * .04, Math.sin(a) * .42]); }
  const halo = glow(0x6ad868, 2.2, .3); halo.position.set(0, .2, 0); g.add(halo);
  return { group: g, shadow: 1, school: 'frost', parts: { eye, ring, halo, head, jaw, fins }, idle: t => {
    head.rotation.z = Math.sin(t * 1.4) * .07; head.rotation.x = Math.sin(t * 1.1) * .05; ring.rotation.y = t * .6;
  } };
}
