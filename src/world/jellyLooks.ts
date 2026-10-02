/* Dr. Jelly redone from the owner's pictures (2026-10-02: sheets of pixel-art alchemists): a figure, not a coat with a
   head, in three looks for the owner to choose from (the dev menu's Galleries tab stands them; the Look tab's switch
   dresses him, kept in the browser as `ossuary.jellyLook`):
   - the alchemist: a bottle-green coat with brass buttons and a stained leather apron, a white beard, brass goggles pushed
     up on a bald crown, a flask of jelly raised in one hand;
   - the plague doctor: a long grey greatcoat, a wide hat over a hood, a beaked mask with glass eyes glowing jelly-green, a
     flask with a coil of glass tube;
   - the hedge wizard: a brown robe tied with rope, a pointed hat with a wide brim, a beard down to his belt.
   Each wears a belt with pouches and his familiar, a small jelly in a jar at his hip. Built as the room kit is (painted
   pieces merged, the jelly glowing) on pivots that move: `body` (bobs, leans, turns to the mage), `head`, and each arm's
   `shoulder`, `elbow` and `hand`; the right hand holds `gift`, where what he hands over is put (world/jellyGives.ts). Faces
   +z, feet on the floor, about the mage's height. */
import * as THREE from 'three';
import { blob, glowShared, mergeStill } from '../render/materials';
import { curve, glowTone, mesh, taperTube, tone } from './kitParts';
import { put } from './objectLooks';
import { JELLY, JELLY_PALE } from './labLooks';

export const JELLY_LOOKS = ['alchemist', 'plague', 'hatted'] as const;
export type JellyLook = typeof JELLY_LOOKS[number];
const KEY = 'ossuary.jellyLook';
let chosen: JellyLook | null = null;
/** The look Dr. Jelly wears (the owner's choice, kept in this browser; the alchemist until one is chosen). */
export function jellyLook(): JellyLook {
  if (chosen) return chosen;
  let v: string | null = null; try { v = localStorage.getItem(KEY); } catch { /* not kept */ }
  return chosen = (JELLY_LOOKS as readonly string[]).includes(v ?? '') ? v as JellyLook : 'alchemist';
}
export function setJellyLook(id: JellyLook) { chosen = id; try { localStorage.setItem(KEY, id); } catch { /* not kept */ } }

const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);
const sph = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const blk = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const tube = (g: THREE.Object3D, pts: number[][], r0: number, r1: number, mat: THREE.Material, segs = 8) => mesh(g, taperTube(curve(pts), segs, r0, r1, 6), mat);
const metal = (c: number) => tone(c, .05, .5);

const SKIN = 0xd8b496, SKIN_D = 0xb08a68, BRASS = 0xc9a046, COPPER = 0xa8683a, GLASS = 0x9ebed8, LEATHER = 0x6a4428, LEATHER_D = 0x4a2e1a, WHITE = 0xe8e4da;
interface Palette { coat: number; coatDark: number; trim: number; trousers: number; boot: number; glove: number; belt: number }
const PALETTES: Record<JellyLook, Palette> = {
  alchemist: { coat: 0x2f5a3a, coatDark: 0x22422a, trim: 0xb89a4a, trousers: 0x4a3a2a, boot: 0x4a2e1a, glove: 0x7a5232, belt: LEATHER_D },
  plague: { coat: 0x55565c, coatDark: 0x3c3d42, trim: 0x2a2a2e, trousers: 0x3a3430, boot: 0x2e2420, glove: 0x4a3a2c, belt: 0x2a2018 },
  hatted: { coat: 0x6a4a2e, coatDark: 0x4e361f, trim: 0x8a6a40, trousers: 0x4a3a2a, boot: 0x3e2a1a, glove: SKIN, belt: 0xb89a6a },
};

export interface JellyParts { body: THREE.Group; head: THREE.Group; arms: { shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group }[]; gift: THREE.Group; jelly: THREE.Object3D }

/** An arm hung from the shoulder at side `s` (1: his left, +x; -1: his right): upper arm, elbow, forearm and cuff, a
    hand. Each a pivot, so it can be posed. */
function arm(body: THREE.Group, s: 1 | -1, P: Palette, wide: boolean) {
  const sleeve = tone(P.coat, .1), cuff = tone(P.trim, .08), glove = tone(P.glove, .08);
  const shoulder = new THREE.Group(); shoulder.position.set(.215 * s, .92, 0); body.add(shoulder);
  mesh(shoulder, sph(.07), sleeve, 0, -.01, 0);
  mesh(shoulder, cyl(.064, .058, .24, 8), sleeve, 0, -.12, 0);
  const elbow = new THREE.Group(); elbow.position.set(0, -.24, 0); shoulder.add(elbow);
  mesh(elbow, sph(.058), sleeve, 0, 0, 0);
  mesh(elbow, cyl(.057, wide ? .075 : .052, .19, 8), sleeve, 0, -.095, 0); // (a robe's sleeve flares at the wrist)
  put(mesh(elbow, new THREE.TorusGeometry(wide ? .07 : .05, .016, 4, 10), cuff, 0, -.18, 0), Math.PI / 2);
  const hand = new THREE.Group(); hand.position.set(0, -.21, 0); elbow.add(hand);
  mesh(hand, blk(.06, .075, .055), glove, 0, -.03, .005);
  put(mesh(hand, blk(.022, .045, .024), glove, -.034 * s, -.02, .02), 0, 0, -.5 * s);
  return { shoulder, elbow, hand };
}

/** A round-bottomed flask of glowing jelly, its neck and cork (in a hand's space, the hand round its neck). */
function flask(g: THREE.Object3D, color = JELLY, coil = false) {
  mesh(g, sph(.065, 10, 8), glowTone(color), 0, -.1, .03);
  mesh(g, cyl(.02, .024, .07, 6), tone(GLASS, .04, .3), 0, -.025, .03);
  mesh(g, cyl(.018, .016, .025, 6), tone(0x8a6a44, .1), 0, .018, .03);
  if (coil) tube(g, [[0, -.02, .03], [.06, .02, .05], [.1, -.05, .06], [.07, -.12, .04], [.1, -.18, .02]], .008, .008, tone(GLASS, .04, .3), 12); // (a coil of glass tube)
  const gl = glowShared(color, .32, .45); gl.position.set(0, -.1, .03); g.add(gl);
}

/** Dr. Jelly in look `id` (his choice now unless one is named). */
export function drJellyLook(id: JellyLook = jellyLook()) {
  const P = PALETTES[id], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const coat = tone(P.coat, .12), dark = tone(P.coatDark, .1), trim = tone(P.trim, .08), skin = tone(SKIN, .08), skinD = tone(SKIN_D, .08);
  const boot = tone(P.boot, .08), trousers = tone(P.trousers, .1), belt = tone(P.belt, .08), brass = metal(BRASS), white = tone(WHITE, .06);
  const robe = id === 'hatted';
  // legs and boots under the hem
  for (const x of [-.08, .08]) {
    mesh(body, cyl(.055, .05, .2, 7), trousers, x, .2, 0);
    mesh(body, blk(.09, .08, .15), boot, x, .04, .025); put(mesh(body, sph(.045, 6, 5), boot, x, .03, .1), 0, 0, 0, [1, .7, 1.1]);
    mesh(body, blk(.1, .018, .18), tone(0x24180e, .05), x, .009, .03);
  }
  // the coat's skirt (a robe's falls to the boots), the body, the shoulders and the collar
  const hem = robe ? .07 : .2;
  put(mesh(body, new THREE.LatheGeometry([[.25, hem], [.235, .35], [.215, .5], [.2, .6]].map(([r, y]) => new THREE.Vector2(r, y)), 12), coat), 0, 0, 0, [1, 1, .8]);
  put(mesh(body, new THREE.TorusGeometry(.25, .014, 4, 16), trim, 0, hem + .01, 0), Math.PI / 2, 0, 0, [1, .8, 1]); // (the hem's edge)
  put(mesh(body, cyl(.205, .195, .36, 12), coat, 0, .77, 0), 0, 0, 0, [1, 1, .74]);
  put(mesh(body, sph(.205, 12, 6, ), coat, 0, .93, 0), 0, 0, 0, [1.12, .42, .76]); // (the shoulders' slope)
  put(mesh(body, new THREE.TorusGeometry(.085, .03, 5, 12), id === 'plague' ? dark : trim, 0, .985, 0), Math.PI / 2, 0, 0, [1, .85, 1]);
  mesh(body, cyl(.05, .055, .06, 8), skin, 0, 1.0, 0);
  // the front: buttons and an apron (the alchemist), a coat's lapels (the plague doctor), a robe's panel (the hedge wizard)
  if (id === 'alchemist') {
    for (let k = 0; k < 4; k++) mesh(body, sph(.014, 5, 4), brass, -.055, .9 - k * .075, .145);
    const apron = tone(LEATHER, .14);
    mesh(body, blk(.2, .5, .012), apron, .02, .55, .162); mesh(body, blk(.012, .32, .01), apron, -.06, .83, .148); mesh(body, blk(.012, .32, .01), apron, .1, .83, .148);
    for (const [x, y, r] of [[.05, .45, .03], [-.02, .62, .022], [.07, .7, .018]]) put(mesh(body, sph(r, 6, 4), tone(0x4e8a3a, .1), x, y, .17), 0, 0, 0, [1, 1, .3]); // (jelly stains)
  } else if (id === 'plague') {
    for (const s of [-1, 1]) put(mesh(body, blk(.07, .3, .012), dark, .06 * s, .82, .15), 0, 0, -.18 * s);
    for (let k = 0; k < 3; k++) mesh(body, sph(.013, 5, 4), tone(0x2a2a2e, .05), .07, .86 - k * .1, .15);
    mesh(body, blk(.06, .4, .012), dark, 0, .4, .2); // (the coat's front opening)
  } else {
    mesh(body, blk(.11, .82, .012), trim, 0, .5, .2); // (the robe's panel down the front)
    for (const y of [.3, .55, .8]) mesh(body, blk(.05, .01, .014), tone(JELLY, .05), 0, y, .207); // (a jelly-green stitch)
  }
  // the belt: its buckle, pouches, a row of vials, and the familiar in its jar at the left hip
  put(mesh(body, cyl(.208, .208, .05, 12), robe ? tone(P.belt, .12) : belt, 0, .6, 0), 0, 0, 0, [1, 1, .76]);
  if (robe) { for (const s of [-1, 1]) tube(body, [[.03 * s, .59, .16], [.05 * s, .48, .17], [.04 * s, .4, .17]], .012, .01, tone(P.belt, .12), 5); } // (the rope's ends)
  else mesh(body, blk(.055, .045, .02), brass, 0, .6, .158);
  mesh(body, blk(.07, .08, .05), tone(LEATHER, .1), -.17, .55, .08); mesh(body, blk(.075, .025, .055), tone(LEATHER_D, .1), -.17, .59, .08);
  for (let k = 0; k < 3; k++) { const a = -.6 + k * .22, x = Math.sin(a) * .21, z = Math.cos(a) * .16; mesh(body, cyl(.012, .012, .055, 5), glowTone([0xd05050, 0x50a0e0, 0xe0c040][k]), x, .56, z); }
  const jar = new THREE.Group(); jar.position.set(.2, .5, .06); body.add(jar);
  mesh(jar, cyl(.045, .045, .09, 8), tone(GLASS, .04, .35), 0, 0, 0); mesh(jar, cyl(.048, .048, .015, 8), metal(COPPER), 0, .05, 0);
  const jelly = mesh(jar, sph(.035, 8, 6), glowTone(JELLY), 0, -.01, .005);
  const jg = glowShared(JELLY, .22, .35); jg.position.y = 0; jar.add(jg);
  // the head: a face, a brow, a nose, ears; then each look's hair, beard, goggles, mask or hat
  const head = new THREE.Group(); head.position.set(0, 1.02, 0); body.add(head);
  if (id !== 'plague') {
    put(mesh(head, sph(.14, 12, 10), skin, 0, .13, 0), 0, 0, 0, [1, 1.05, 1]);
    mesh(head, blk(.17, .025, .03), skinD, 0, .155, .125); // (the brow)
    for (const s of [-1, 1]) { mesh(head, blk(.026, .014, .01), tone(0x1a1410, .02), .045 * s, .135, .136); put(mesh(head, sph(.03, 5, 4), skinD, .14 * s, .12, 0), 0, 0, 0, [.5, 1, .8]); }
    put(mesh(head, sph(.028, 6, 5), skinD, 0, .1, .145), 0, 0, 0, [1, 1, 1.2]); // (a nose)
  }
  if (id === 'alchemist') {
    for (let i = 0; i < 7; i++) { const a = Math.PI * (.25 + i * .25); put(mesh(head, sph(.05, 6, 5), white, Math.cos(a) * .13, .14, -Math.abs(Math.sin(a)) * .08 - .02), 0, 0, 0, [.9, 1.2, .9]); } // (white hair round a bald crown)
    for (const s of [-1, 1]) put(mesh(head, blk(.06, .022, .025), white, .05 * s, .17, .132), 0, 0, -.2 * s); // (bushy brows)
    put(mesh(head, sph(.11, 8, 6), white, 0, .03, .07), 0, 0, 0, [1.15, 1.15, .85]); // (the beard)
    put(mesh(head, new THREE.ConeGeometry(.08, .14, 6), white, 0, -.07, .08), Math.PI, 0, 0);
    for (const s of [-1, 1]) put(mesh(head, sph(.035, 6, 4), white, .035 * s, .075, .138), 0, 0, 0, [1.4, .7, .8]); // (the moustache)
    put(mesh(head, new THREE.TorusGeometry(.142, .014, 4, 16), tone(LEATHER_D, .08), 0, .22, -.01), Math.PI / 2 - .35, 0, 0); // (the goggles' strap, over the crown)
    for (const s of [-1, 1]) { put(mesh(head, cyl(.035, .035, .03, 10), metal(BRASS), .045 * s, .245, .1), Math.PI / 2 - .45); put(mesh(head, cyl(.027, .027, .01, 10), glowTone(JELLY_PALE), .045 * s, .251, .114), Math.PI / 2 - .45); }
  } else if (id === 'plague') {
    put(mesh(head, sph(.16, 12, 10), dark, 0, .14, -.01), 0, 0, 0, [1, 1.05, 1.05]); // (the hood)
    put(mesh(head, new THREE.TorusGeometry(.105, .025, 5, 14), tone(P.coat, .1), 0, .12, .1), 0, 0, 0, [1, 1.1, 1]); // (the hood's opening)
    put(mesh(head, sph(.11, 10, 8), tone(0x2a221c, .08), 0, .12, .07), 0, 0, 0, [1, 1, .7]); // (the leather mask)
    put(mesh(head, new THREE.ConeGeometry(.058, .28, 8), tone(0xd8ccb0, .08), 0, .04, .25), Math.PI / 2 + .55); // (the beak, long and curving down, out from under the hat)
    for (const s of [-1, 1]) { put(mesh(head, cyl(.034, .034, .03, 10), metal(BRASS), .055 * s, .155, .135), Math.PI / 2); put(mesh(head, cyl(.026, .026, .01, 10), glowTone(JELLY), .055 * s, .155, .152), Math.PI / 2); }
    const hat = new THREE.Group(); hat.position.set(0, .27, -.04); hat.rotation.x = -.45; head.add(hat); // (tipped back: the mask shows under it)
    mesh(hat, cyl(.2, .2, .016, 18), tone(0x24242a, .06), 0, 0, 0); // (the hat's brim)
    mesh(hat, cyl(.115, .125, .12, 14), tone(0x24242a, .06), 0, .07, 0);
    mesh(hat, cyl(.127, .127, .02, 14), tone(0x4a3a2a, .06), 0, .025, 0); // (its band)
  } else {
    for (const s of [-1, 1]) put(mesh(head, blk(.06, .022, .025), white, .05 * s, .17, .132), 0, 0, -.15 * s);
    put(mesh(head, sph(.11, 8, 6), white, 0, .04, .07), 0, 0, 0, [1.1, 1, .8]);
    put(mesh(head, new THREE.ConeGeometry(.1, .42, 7), white, 0, -.16, .1), Math.PI - .12, 0, 0); // (the long beard, down to the belt)
    for (const s of [-1, 1]) put(mesh(head, sph(.035, 6, 4), white, .035 * s, .075, .138), 0, 0, 0, [1.5, .7, .8]);
    const hat = new THREE.Group(); hat.position.set(0, .25, -.05); hat.rotation.x = -.5; head.add(hat); // (tipped back: the face shows under it)
    mesh(hat, cyl(.22, .22, .016, 18), tone(P.coatDark, .1), 0, 0, 0); // (the hat's wide brim)
    put(mesh(hat, new THREE.ConeGeometry(.14, .38, 12), tone(P.coatDark, .1), 0, .19, -.02), -.3, 0, 0); // (its crown, bending back)
    mesh(hat, cyl(.142, .142, .03, 14), tone(P.trim, .08), 0, .025, 0); // (its band)
  }
  // the arms: the left raises a flask of jelly, the right is free to give (its hand holds `gift`)
  const arms = [arm(body, -1, P, robe), arm(body, 1, P, robe)]; // (0: his right, the giving hand; 1: his left)
  flask(arms[1].hand, id === 'plague' ? 0x7ae0c8 : JELLY, id === 'plague');
  const gift = new THREE.Group(); gift.position.set(0, .03, .03); arms[0].hand.add(gift); // (on the palm, once it is turned up)
  // pivots apart, each merged on its own
  body.userData.parts = { head, s0: arms[0].shoulder, s1: arms[1].shoulder, jar };
  for (const a of arms) { a.shoulder.userData.parts = { elbow: a.elbow }; a.elbow.userData.parts = { hand: a.hand }; a.hand.userData.parts = { gift }; }
  jar.userData.parts = { jelly };
  for (const o of [body, head, jar, ...arms.flatMap(a => [a.shoulder, a.elbow, a.hand])]) mergeStill(o);
  g.add(blob(.9));
  const parts: JellyParts = { body, head, arms, gift, jelly };
  g.userData = { body, jelly, parts, look: id };
  restPose(parts);
  return g;
}

/** How each pivot rests: the left arm raising its flask before the chest, the right hanging a little out and forward. */
export function restPose(P: JellyParts) {
  P.arms[1].shoulder.rotation.set(-.55, 0, .22); P.arms[1].elbow.rotation.set(-1.45, 0, 0); P.arms[1].hand.rotation.set(2, 0, 0); // (the hand level again: the flask hangs from its neck)
  P.arms[0].shoulder.rotation.set(-.12, 0, -.14); P.arms[0].elbow.rotation.set(-.3, 0, 0); P.arms[0].hand.rotation.set(0, 0, 0);
  P.head.rotation.set(0, 0, 0); P.body.rotation.x = 0;
}
