/* The Cinder Lance in the new effect style (the owner's proof of concept, 2026-09-30): the look the spell effect
   gallery tried (magic/effectOptions.ts), on the real spell. A white-hot core in a sheath of fire and a fainter
   outer glow, rune rings turning along it (turned to the camera, so they read whichever way the beam runs), embers
   spiralling down it, a rune ring flaring at the mage's hand and a glow where it ends. It is built once and shown
   for each cast (one lance at a time: the spell's cooldown is longer than the look); the gameplay is the beam's in
   shapes.ts. If the owner likes it, the other spells follow; the dev menu switches back to the old beam
   (`DEV.oldLance`) to compare. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Vec2 } from '../types';
import { scene } from '../render/renderer';
import { glow, mergeStill } from '../render/materials';
import { SCHOOL_LIGHT, box, lit, part, runeRing, shine } from '../render/arcane';

const Y = .6, MAX_RINGS = 6, EMBERS = 12, TILT: [number, number, number] = [Math.PI / 4, 0, 0]; // (the camera looks down at 45°)

interface Lance {
  root: THREE.Group; beam: THREE.Group; core: THREE.Mesh; sheath: THREE.Mesh; outer: THREE.Mesh;
  rings: THREE.Group[]; gather: THREE.Group; embers: THREE.Mesh[]; tip: THREE.Sprite;
  /** Every material that fades, with its full opacity; and those that take the spell's colour. */
  fades: { m: THREE.Material & { opacity: number }; full: number }[]; tinted: (THREE.Material & { color: THREE.Color })[];
  dir: Vec2; len: number; t: number; on: boolean;
}
let lance: Lance | null = null;

function build(): Lance {
  const E = SCHOOL_LIGHT.ember, root = new THREE.Group(), beam = new THREE.Group(); root.add(beam); root.visible = false;
  const coreMat = lit(0xfff0c0, .99), sheathMat = shine(E, .6), outerMat = shine(0xff4a14, .3), emberMat = lit(0xffc060, .99); // (white-hot, then fire, then a red edge)
  // (a unit long along +x, stretched to the beam's length)
  const core = part(beam, box(1, .045, .045), coreMat, [.5, 0, 0]);
  const sheath = part(beam, new THREE.CylinderGeometry(.1, .1, 1, 10, 1, true), sheathMat, [.5, 0, 0], { rot: [0, 0, Math.PI / 2] });
  const outer = part(beam, new THREE.CylinderGeometry(.2, .2, 1, 10, 1, true), outerMat, [.5, 0, 0], { rot: [0, 0, Math.PI / 2] });
  const rings = Array.from({ length: MAX_RINGS }, () => runeRing(root, E, .26, [0, Y, 0], 5, TILT));
  const gather = runeRing(root, E, .3, [0, Y, 0], 6, TILT);
  const embers = Array.from({ length: EMBERS }, () => part(beam, new THREE.OctahedronGeometry(.03), emberMat, [0, 0, 0]));
  const tip = glow(E, 1, .9); root.add(tip);
  const ringMats = [...rings, gather].map(r => (r.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial);
  for (const r of [...rings, gather]) mergeStill(r); // (a ring and its runes share one material: one draw each, turned as one)
  const fades = [...[coreMat, sheathMat, outerMat, emberMat, ...ringMats].map(m => ({ m, full: m.opacity })), { m: tip.material, full: .9 }];
  scene.add(root);
  return { root, beam, core, sheath, outer, rings, gather, embers, tip, fades, tinted: [sheathMat, ...ringMats, tip.material], dir: { x: 1, z: 0 }, len: 1, t: 0, on: false };
}

/** Show the lance from (sx, sz) along `dir` for `len` units, in the spell's colour. */
export function lanceFx(sx: number, sz: number, dir: Vec2, len: number, color: number) {
  const L = lance ??= build();
  L.root.position.set(sx, 0, sz); L.beam.position.y = Y; L.beam.rotation.y = Math.atan2(-dir.z, dir.x);
  L.dir = { x: dir.x, z: dir.z }; L.len = len; L.t = 0; L.on = true; L.root.visible = true;
  for (const m of L.tinted) m.color.setHex(color);
  for (const m of [L.core, L.sheath, L.outer]) { m.position.x = len / 2; }
  L.core.scale.x = len; L.sheath.scale.y = len; L.outer.scale.y = len;
  L.rings.forEach((r, i) => { const at = .55 + i * CFG.lanceFx.ringGap; r.visible = at < len - .2; r.position.set(dir.x * at, Y, dir.z * at); });
  L.tip.position.set(dir.x * len, Y, dir.z * len);
  step(L, 0);
}

function step(L: Lance, dt: number) {
  const C = CFG.lanceFx; L.t += dt;
  if (L.t >= C.life) { L.on = false; L.root.visible = false; return; }
  const t = L.t, rise = Math.min(1, t / C.rise), fade = Math.max(0, (t - C.fade) / (C.life - C.fade)), k = rise * (1 - fade);
  L.beam.scale.set(1, .4 + k * .6, .4 + k * .6);
  for (const f of L.fades) f.m.opacity = f.full * k;
  L.rings.forEach((r, i) => { r.rotation.y = t * (4 + i); r.scale.setScalar(.6 + rise * .4); });
  // the rune ring at the hand flares out as the lance leaves it
  const g = Math.min(1, t / C.flare); L.gather.visible = g < 1; L.gather.scale.setScalar(.5 + g * .8); L.gather.rotation.y = t * 10;
  L.embers.forEach((e, i) => { const u = (i / EMBERS + t * C.embers) % 1, a = u * 18 + i; e.position.set(u * L.len, Math.cos(a) * .17, Math.sin(a) * .17); });
  L.tip.scale.setScalar(.8 + k * .4);
}

/** Every step: the lance swells, turns its rings and fades. */
export function updateLanceFx(dt: number) { if (lance?.on) step(lance, dt); }
/** The mage leaves the room, or a new floor: no lance left showing. */
export function clearLanceFx() { if (lance) { lance.on = false; lance.root.visible = false; } }
/** Whether the lance shows now (for the tests). */
export const lanceShowing = () => !!lance?.on;
