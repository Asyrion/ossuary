/* Dr. Jelly as a plague doctor: a long grey greatcoat with its lapels and a dark front, a wide hat tipped back over a hood, a
   beaked mask with brass-rimmed glass eyes glowing jelly-green, gloves, a belt with pouches and a row of vials, his
   familiar (a small jelly in a jar) at the hip, and a flask of jelly with a coil of glass tube raised in one hand. A figure,
   not a coat with a head, built as the room kit is (painted pieces merged, the jelly glowing) on pivots that move: `body`
   (bobs, leans, turns to the mage), `head`, and each arm's `shoulder`, `elbow` and `hand`; the right hand holds `gift`,
   where what he hands over is put (world/jellyGives.ts). Faces +z, feet on the floor, about the mage's height. */
import * as THREE from 'three';
import { blob, glowShared, mergeStill } from '../render/materials';
import { curve, glowTone, mesh, taperTube, tone } from './kitParts';
import { put } from './objectLooks';
import { JELLY } from './labLooks';

const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);
const sph = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const blk = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const tube = (g: THREE.Object3D, pts: number[][], r0: number, r1: number, mat: THREE.Material, segs = 8) =>
  mesh(g, taperTube(curve(pts), segs, r0, r1, 6), mat);
const metal = (c: number) => tone(c, 0.05, 0.5);

/** His colours: the greatcoat and its darker front, the hat, the mask's leather and its beak, gloves, boots, the belt. */
const C = {
  coat: 0x55565c,
  dark: 0x3c3d42,
  hat: 0x24242a,
  band: 0x4a3a2a,
  mask: 0x2a221c,
  beak: 0xd8ccb0,
  trousers: 0x3a3430,
  boot: 0x2e2420,
  glove: 0x4a3a2c,
  belt: 0x2a2018,
  brass: 0xc9a046,
  copper: 0xa8683a,
  glass: 0x9ebed8,
  leather: 0x6a4428,
  leatherDark: 0x4a2e1a,
  flask: 0x7ae0c8,
};

export interface JellyParts {
  body: THREE.Group;
  head: THREE.Group;
  arms: { shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group }[];
  gift: THREE.Group;
  jelly: THREE.Object3D;
}

/** An arm hung from the shoulder at side `s` (1: his left, +x; -1: his right): upper arm, elbow, forearm and cuff, a
    gloved hand. Each a pivot, so it can be posed. */
function arm(body: THREE.Group, s: 1 | -1) {
  const sleeve = tone(C.coat, 0.1),
    cuff = tone(C.dark, 0.08),
    glove = tone(C.glove, 0.08);
  const shoulder = new THREE.Group();
  shoulder.position.set(0.215 * s, 0.92, 0);
  body.add(shoulder);
  mesh(shoulder, sph(0.07), sleeve, 0, -0.01, 0);
  mesh(shoulder, cyl(0.064, 0.058, 0.24, 8), sleeve, 0, -0.12, 0);
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.24, 0);
  shoulder.add(elbow);
  mesh(elbow, sph(0.058), sleeve, 0, 0, 0);
  mesh(elbow, cyl(0.057, 0.052, 0.19, 8), sleeve, 0, -0.095, 0);
  put(mesh(elbow, new THREE.TorusGeometry(0.05, 0.016, 4, 10), cuff, 0, -0.18, 0), Math.PI / 2);
  const hand = new THREE.Group();
  hand.position.set(0, -0.21, 0);
  elbow.add(hand);
  mesh(hand, blk(0.06, 0.075, 0.055), glove, 0, -0.03, 0.005);
  put(mesh(hand, blk(0.022, 0.045, 0.024), glove, -0.034 * s, -0.02, 0.02), 0, 0, -0.5 * s);
  return { shoulder, elbow, hand };
}

/** A round-bottomed flask of glowing jelly, its neck, cork and a coil of glass tube (in a hand's space, the hand round its
    neck). */
function flask(g: THREE.Object3D) {
  mesh(g, sph(0.065, 10, 8), glowTone(C.flask), 0, -0.1, 0.03);
  mesh(g, cyl(0.02, 0.024, 0.07, 6), tone(C.glass, 0.04, 0.3), 0, -0.025, 0.03);
  mesh(g, cyl(0.018, 0.016, 0.025, 6), tone(0x8a6a44, 0.1), 0, 0.018, 0.03);
  tube(
    g,
    [
      [0, -0.02, 0.03],
      [0.06, 0.02, 0.05],
      [0.1, -0.05, 0.06],
      [0.07, -0.12, 0.04],
      [0.1, -0.18, 0.02],
    ],
    0.008,
    0.008,
    tone(C.glass, 0.04, 0.3),
    12,
  );
  const gl = glowShared(C.flask, 0.32, 0.45);
  gl.position.set(0, -0.1, 0.03);
  g.add(gl);
}

/** Dr. Jelly, the plague doctor. */
export function drJellyLook() {
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const coat = tone(C.coat, 0.12),
    dark = tone(C.dark, 0.1),
    boot = tone(C.boot, 0.08),
    trousers = tone(C.trousers, 0.1),
    belt = tone(C.belt, 0.08),
    brass = metal(C.brass);
  // legs and boots under the hem
  for (const x of [-0.08, 0.08]) {
    mesh(body, cyl(0.055, 0.05, 0.2, 7), trousers, x, 0.2, 0);
    mesh(body, blk(0.09, 0.08, 0.15), boot, x, 0.04, 0.025);
    put(mesh(body, sph(0.045, 6, 5), boot, x, 0.03, 0.1), 0, 0, 0, [1, 0.7, 1.1]);
    mesh(body, blk(0.1, 0.018, 0.18), tone(0x24180e, 0.05), x, 0.009, 0.03);
  }
  // the greatcoat's skirt, the body, the shoulders and the collar; its lapels, buttons and dark front
  put(
    mesh(
      body,
      new THREE.LatheGeometry(
        [
          [0.25, 0.2],
          [0.235, 0.35],
          [0.215, 0.5],
          [0.2, 0.6],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        12,
      ),
      coat,
    ),
    0,
    0,
    0,
    [1, 1, 0.8],
  );
  put(mesh(body, new THREE.TorusGeometry(0.25, 0.014, 4, 16), dark, 0, 0.21, 0), Math.PI / 2, 0, 0, [1, 0.8, 1]); // (the hem's edge)
  put(mesh(body, cyl(0.205, 0.195, 0.36, 12), coat, 0, 0.77, 0), 0, 0, 0, [1, 1, 0.74]);
  put(mesh(body, sph(0.205, 12, 6), coat, 0, 0.93, 0), 0, 0, 0, [1.12, 0.42, 0.76]); // (the shoulders' slope)
  put(mesh(body, new THREE.TorusGeometry(0.085, 0.03, 5, 12), dark, 0, 0.985, 0), Math.PI / 2, 0, 0, [1, 0.85, 1]);
  mesh(body, cyl(0.05, 0.055, 0.06, 8), dark, 0, 1.0, 0);
  for (const s of [-1, 1]) put(mesh(body, blk(0.07, 0.3, 0.012), dark, 0.06 * s, 0.82, 0.15), 0, 0, -0.18 * s);
  for (let k = 0; k < 3; k++) mesh(body, sph(0.013, 5, 4), tone(C.hat, 0.05), 0.07, 0.86 - k * 0.1, 0.15);
  mesh(body, blk(0.06, 0.4, 0.012), dark, 0, 0.4, 0.2); // (the coat's front opening)
  // the belt: its buckle, a pouch, a row of vials, and the familiar in its jar at the left hip
  put(mesh(body, cyl(0.208, 0.208, 0.05, 12), belt, 0, 0.6, 0), 0, 0, 0, [1, 1, 0.76]);
  mesh(body, blk(0.055, 0.045, 0.02), brass, 0, 0.6, 0.158);
  mesh(body, blk(0.07, 0.08, 0.05), tone(C.leather, 0.1), -0.17, 0.55, 0.08);
  mesh(body, blk(0.075, 0.025, 0.055), tone(C.leatherDark, 0.1), -0.17, 0.59, 0.08);
  for (let k = 0; k < 3; k++) {
    const a = -0.6 + k * 0.22,
      x = Math.sin(a) * 0.21,
      z = Math.cos(a) * 0.16;
    mesh(body, cyl(0.012, 0.012, 0.055, 5), glowTone([0xd05050, 0x50a0e0, 0xe0c040][k]), x, 0.56, z);
  }
  const jar = new THREE.Group();
  jar.position.set(0.2, 0.5, 0.06);
  body.add(jar);
  mesh(jar, cyl(0.045, 0.045, 0.09, 8), tone(C.glass, 0.04, 0.35), 0, 0, 0);
  mesh(jar, cyl(0.048, 0.048, 0.015, 8), metal(C.copper), 0, 0.05, 0);
  const jelly = mesh(jar, sph(0.035, 8, 6), glowTone(JELLY), 0, -0.01, 0.005);
  const jg = glowShared(JELLY, 0.22, 0.35);
  jg.position.y = 0;
  jar.add(jg);
  // the head: the hood, the leather mask and its long beak, glass eyes glowing jelly-green, the wide hat tipped back
  const head = new THREE.Group();
  head.position.set(0, 1.02, 0);
  body.add(head);
  put(mesh(head, sph(0.16, 12, 10), dark, 0, 0.14, -0.01), 0, 0, 0, [1, 1.05, 1.05]); // (the hood)
  put(mesh(head, new THREE.TorusGeometry(0.105, 0.025, 5, 14), coat, 0, 0.12, 0.1), 0, 0, 0, [1, 1.1, 1]); // (the hood's opening)
  put(mesh(head, sph(0.11, 10, 8), tone(C.mask, 0.08), 0, 0.12, 0.07), 0, 0, 0, [1, 1, 0.7]); // (the leather mask)
  put(mesh(head, new THREE.ConeGeometry(0.058, 0.28, 8), tone(C.beak, 0.08), 0, 0.04, 0.25), Math.PI / 2 + 0.55); // (the beak, long and curving down, out from under the hat)
  for (const s of [-1, 1]) {
    put(mesh(head, cyl(0.034, 0.034, 0.03, 10), brass, 0.055 * s, 0.155, 0.135), Math.PI / 2);
    put(mesh(head, cyl(0.026, 0.026, 0.01, 10), glowTone(JELLY), 0.055 * s, 0.155, 0.152), Math.PI / 2);
  }
  const hat = new THREE.Group();
  hat.position.set(0, 0.27, -0.04);
  hat.rotation.x = -0.45;
  head.add(hat); // (tipped back: the mask shows under it)
  mesh(hat, cyl(0.2, 0.2, 0.016, 18), tone(C.hat, 0.06), 0, 0, 0); // (the hat's brim)
  mesh(hat, cyl(0.115, 0.125, 0.12, 14), tone(C.hat, 0.06), 0, 0.07, 0);
  mesh(hat, cyl(0.127, 0.127, 0.02, 14), tone(C.band, 0.06), 0, 0.025, 0); // (its band)
  // the arms: the left raises a flask of jelly, the right is free to give (its hand holds `gift`)
  const arms = [arm(body, -1), arm(body, 1)]; // (0: his right, the giving hand; 1: his left)
  flask(arms[1].hand);
  const gift = new THREE.Group();
  gift.position.set(0, 0.03, 0.03);
  arms[0].hand.add(gift); // (on the palm, once it is turned up)
  // pivots apart, each merged on its own
  body.userData.parts = { head, s0: arms[0].shoulder, s1: arms[1].shoulder, jar };
  for (const a of arms) {
    a.shoulder.userData.parts = { elbow: a.elbow };
    a.elbow.userData.parts = { hand: a.hand };
    a.hand.userData.parts = { gift };
  }
  jar.userData.parts = { jelly };
  for (const o of [body, head, jar, ...arms.flatMap((a) => [a.shoulder, a.elbow, a.hand])]) mergeStill(o);
  g.add(blob(0.9));
  const parts: JellyParts = { body, head, arms, gift, jelly };
  g.userData = { body, jelly, parts };
  restPose(parts);
  return g;
}

/** How each pivot rests: the left arm raising its flask before the chest, the right hanging a little out and forward. */
export function restPose(P: JellyParts) {
  P.arms[1].shoulder.rotation.set(-0.55, 0, 0.22);
  P.arms[1].elbow.rotation.set(-1.45, 0, 0);
  P.arms[1].hand.rotation.set(2, 0, 0); // (the hand level again: the flask hangs from its neck)
  P.arms[0].shoulder.rotation.set(-0.12, 0, -0.14);
  P.arms[0].elbow.rotation.set(-0.3, 0, 0);
  P.arms[0].hand.rotation.set(0, 0, 0);
  P.head.rotation.set(0, 0, 0);
  P.body.rotation.x = 0;
}
