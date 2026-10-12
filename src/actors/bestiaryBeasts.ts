/* The bestiary's beasts (M4.5): animals of the dungeon, larger and stranger than life, each built to read at a glance as
   what it is (docs/archive/M4.5-plan.md). Each stands on y = 0 facing +Z and idles; parts a foe's behaviour will move are named in
   `parts`. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, lit, part, shine, sphere, std, type V3 } from '../render/arcane';
import { joint, slitEyes, spike, tube, type Built } from './beastParts';

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
