/* Kaelith, the Shadow Sentinel (M7 step 2; docs/M7-plan.md, decisions 5 and 6): the Seal's boss, the last of the descent.
   Its look is the Winged Watcher, the owner's choice of the two drawn up (2026-10-06; the Hooded Sentinel went). It stands
   about twice the mage's height on y = 0 facing +Z, a dark body with bright violet features (what reads at play distance),
   and carries the parts the fight (kaelith.ts) moves: `eye`, `ring` and `halo` (every boss's), `body` (it sinks into
   shadow and kneels at the end), `blade` (the sword: raised in the sweep's tell, swung through it), `mantle` (the wings:
   spread in the sweep, folded in the step) and `hand` (the hand that holds the seal shut in the second phase). */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, circle, limb, lit, part, rune, runeRing, sphere, std } from '../render/arcane';
import { batWing, gloss, joint, jointed, slitEyes, spike, thin } from './beastParts';
import type { BossBuilt } from './bossLooks';

const U = SCHOOL_LIGHT.umbral;

/** The rune ring the fight turns, behind and above the head, tipped back a little (as the other bosses'). */
function haloRing(g: THREE.Object3D, radius: number, y: number, z = -.35) {
  const ring = new THREE.Group(); ring.position.set(0, y, z); ring.rotation.x = -.35; g.add(ring);
  runeRing(ring, U, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0], lit(U, .9));
  return ring;
}

/** The Winged Watcher: a gaunt armoured sentinel on long legs, great tattered wings of shadow spread from its back, its face
    the hooded stone mask of the Gate's watching statues with violet slits for eyes; a long two-handed sword in its right
    hand, held up and out. */
export function wingedWatcher(): BossBuilt {
  const g = new THREE.Group(), plate = gloss(0x3a3448, .4, .45), plateLit = gloss(0x5a5270, .35, .5), mask = std(0x9a94a4), hood = std(0x2a2236, { roughness: 1 });
  const skin = thin(0x1c1628, { roughness: 1 }), bone = gloss(0x3e3650, .5, .3), steel = gloss(0x3a3644, .3, .6), edge = lit(0xc8a8ff), body = joint(g, [0, 0, 0]);
  // long armoured legs, greaves and sabatons
  for (const s of [-1, 1]) {
    jointed(body, [[.2 * s, 1.15, 0], [.24 * s, .62, .1], [.22 * s, .1, -.02]], .1, .07, plate, plateLit);
    part(body, new THREE.BoxGeometry(.14, .08, .3), plateLit, [.22 * s, .04, .08]);
  }
  // a gaunt torso: a narrow waist under a breastplate, a tasset of plates
  part(body, new THREE.CylinderGeometry(.18, .26, .4, 8), plate, [0, 1.25, 0]);
  part(body, sphere(.36, 12, 10), plate, [0, 1.62, .02], { scale: [1, 1.05, .7] });
  for (let i = 0; i < 4; i++) part(body, new THREE.BoxGeometry(.16, .3, .05), plateLit, [(i - 1.5) * .15, 1.0, .2 - Math.abs(i - 1.5) * .04], { rot: [-.15, 0, (i - 1.5) * -.12] });
  for (const s of [-1, 1]) part(body, sphere(.18, 10, 8), plateLit, [.38 * s, 1.88, 0], { scale: [1.2, .75, 1] });
  rune(body, U, [0, 1.62, .27], .13, [0, 0, 0], lit(U));
  // the head: a hood, and over the face the stone mask of the Gate's watching statues, its eyes violet slits
  const head = joint(body, [0, 2.12, .04]);
  part(head, sphere(.27, 12, 10), hood, [0, .02, -.04], { scale: [1, 1.15, 1.1] });
  part(head, new THREE.SphereGeometry(.21, 12, 10, 0, Math.PI * 2, 0, Math.PI * .6), mask, [0, 0, .08], { rot: [Math.PI / 2 + .2, 0, 0], scale: [1, .55, 1.15] });
  part(head, new THREE.BoxGeometry(.03, .14, .04), std(0x6a6474), [0, -.04, .24]); // (the mask's nose)
  const eye = joint(head, [0, .04, .23]);
  slitEyes(eye, .085, 0, 0, .07, 0xc8a0ff, .2, .3);
  const eyeGlow = glow(U, .8, .6); eyeGlow.position.set(0, .04, .3); head.add(eyeGlow);
  // the wings: great and tattered, of shadow; the mantle the fight spreads and folds
  const mantle = joint(body, [0, 1.85, -.2]);
  for (const s of [-1, 1] as const) {
    const w = batWing(mantle, s, [.12 * s, 0, 0], 1.55, skin, bone);
    w.rotation.set(.35, 0, s * .55); // (lifted and swept up behind it, so they read from above)
    for (let i = 0; i < 4; i++) spike(w, [(.5 + i * .25) * s, 0, -.5 - i * .08], [(.55 + i * .25) * s, 0, -.72 - i * .08], .05, skin); // (the tatters)
  }
  // the arms: the right holds the sword up and out; the left is the hand that holds the seal
  jointed(body, [[.42, 1.82, 0], [.62, 1.5, .14], [.7, 1.25, .26]], .08, .06, plate, plateLit);
  const hand = joint(body, [-.42, 1.82, 0]);
  jointed(hand, [[0, 0, 0], [-.14, -.36, .12], [-.12, -.64, .22]], .08, .06, plate, plateLit);
  part(hand, sphere(.075, 7, 5), plateLit, [-.12, -.7, .24]);
  // the sword: a long blade, a cross-guard, its edges lit
  const blade = joint(body, [.72, 1.25, .28], [0, 0, -.25]);
  part(blade, new THREE.BoxGeometry(.32, .05, .06), plateLit, [0, .05, 0]); // (the guard)
  limb(blade, [0, -.25, 0], [0, .05, 0], .03, bone);
  part(blade, new THREE.BoxGeometry(.11, 1.35, .025), steel, [0, .76, 0]);
  part(blade, new THREE.ConeGeometry(.056, .2, 4), steel, [0, 1.53, 0], { rot: [0, Math.PI / 4, 0], scale: [1, 1, .3] });
  for (const s of [-1, 1]) part(blade, new THREE.BoxGeometry(.012, 1.35, .028), edge, [.055 * s, .76, 0]); // (its edges, lit)
  circle(g, U, 1.4);
  const ring = haloRing(g, .7, 2.55);
  const halo = glow(U, 3.2, .35); halo.position.set(0, 2, -.3); g.add(halo);
  return { group: g, shadow: 2.1, school: 'umbral', parts: { eye, ring, halo, body, blade, mantle, hand, head }, idle: t => {
    body.position.y = Math.sin(t * 1.1) * .03; head.rotation.y = Math.sin(t * .5) * .2;
    mantle.rotation.x = Math.sin(t * .8) * .06; mantle.scale.x = 1 + Math.sin(t * .8) * .04;
  } };
}

/** Kaelith's look. */
export const kaelithLook = (): BossBuilt => wingedWatcher();
/** On a stand for the galleries, beside the other bosses. */
export const KAELITH_GALLERY: readonly { id: string; build: () => BossBuilt }[] = [{ id: 'kaelith', build: wingedWatcher }];
