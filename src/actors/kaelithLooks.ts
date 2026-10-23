/* Kaelith, the Shadow Sentinel (docs/M7-plan.md, decisions 5 and 6): the Seal's boss, the last of the descent.
   Its look is the Winged Watcher. It stands
   about twice the mage's height on y = 0 facing +Z, a dark body with bright violet features (what reads at play distance),
   and carries the parts the fight (kaelith.ts) moves: `eye`, `ring` and `halo` (every boss's), `body` (it sinks into
   shadow and kneels at the end), `blade` (the sword: raised in the sweep's tell, swung through it), `mantle` (the wings:
   spread in the sweep, folded in the step) and `hand` (the hand that holds the seal shut in the second phase); `floor`
   (its circle) and `eyeGlow` named so a made look keeps them. Made in Tripo where a model is in (madeBosses.ts): standing,
   and kneeling at the end (its own model). */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, circle, limb, lit, part, rune, runeRing, sphere, std } from '../render/arcane';
import { batWing, gloss, joint, jointed, slitEyes, spike, thin } from './beastParts';
import type { BossBuilt } from './bossLooks';
import { madeBossLook } from './madeBosses';

const U = SCHOOL_LIGHT.umbral;

/** The rune ring the fight turns, behind and above the head, tipped back a little (as the other bosses'). */
function haloRing(g: THREE.Object3D, radius: number, y: number, z = -0.35) {
  const ring = new THREE.Group();
  ring.position.set(0, y, z);
  ring.rotation.x = -0.35;
  g.add(ring);
  runeRing(ring, U, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0], lit(U, 0.9));
  return ring;
}

/** The Winged Watcher: a gaunt armoured sentinel on long legs, great tattered wings of shadow spread from its back, its face
    the hooded stone mask of the Gate's watching statues with violet slits for eyes; a long two-handed sword in its right
    hand, held up and out. */
export function wingedWatcher(): BossBuilt {
  const g = new THREE.Group(),
    plate = gloss(0x3a3448, 0.4, 0.45),
    plateLit = gloss(0x5a5270, 0.35, 0.5),
    mask = std(0x9a94a4),
    hood = std(0x2a2236, { roughness: 1 });
  const skin = thin(0x1c1628, { roughness: 1 }),
    bone = gloss(0x3e3650, 0.5, 0.3),
    steel = gloss(0x3a3644, 0.3, 0.6),
    edge = lit(0xc8a8ff),
    body = joint(g, [0, 0, 0]);
  // long armoured legs, greaves and sabatons
  for (const s of [-1, 1]) {
    jointed(
      body,
      [
        [0.2 * s, 1.15, 0],
        [0.24 * s, 0.62, 0.1],
        [0.22 * s, 0.1, -0.02],
      ],
      0.1,
      0.07,
      plate,
      plateLit,
    );
    part(body, new THREE.BoxGeometry(0.14, 0.08, 0.3), plateLit, [0.22 * s, 0.04, 0.08]);
  }
  // a gaunt torso: a narrow waist under a breastplate, a tasset of plates
  part(body, new THREE.CylinderGeometry(0.18, 0.26, 0.4, 8), plate, [0, 1.25, 0]);
  part(body, sphere(0.36, 12, 10), plate, [0, 1.62, 0.02], { scale: [1, 1.05, 0.7] });
  for (let i = 0; i < 4; i++)
    part(
      body,
      new THREE.BoxGeometry(0.16, 0.3, 0.05),
      plateLit,
      [(i - 1.5) * 0.15, 1.0, 0.2 - Math.abs(i - 1.5) * 0.04],
      { rot: [-0.15, 0, (i - 1.5) * -0.12] },
    );
  for (const s of [-1, 1]) part(body, sphere(0.18, 10, 8), plateLit, [0.38 * s, 1.88, 0], { scale: [1.2, 0.75, 1] });
  rune(body, U, [0, 1.62, 0.27], 0.13, [0, 0, 0], lit(U));
  // the head: a hood, and over the face the stone mask of the Gate's watching statues, its eyes violet slits
  const head = joint(body, [0, 2.12, 0.04]);
  part(head, sphere(0.27, 12, 10), hood, [0, 0.02, -0.04], { scale: [1, 1.15, 1.1] });
  part(head, new THREE.SphereGeometry(0.21, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mask, [0, 0, 0.08], {
    rot: [Math.PI / 2 + 0.2, 0, 0],
    scale: [1, 0.55, 1.15],
  });
  part(head, new THREE.BoxGeometry(0.03, 0.14, 0.04), std(0x6a6474), [0, -0.04, 0.24]); // (the mask's nose)
  const eye = joint(head, [0, 0.04, 0.23]);
  slitEyes(eye, 0.085, 0, 0, 0.07, 0xc8a0ff, 0.2, 0.3);
  const eyeGlow = glow(U, 0.8, 0.6);
  eyeGlow.position.set(0, 0.04, 0.3);
  head.add(eyeGlow);
  // the wings: great and tattered, of shadow; the mantle the fight spreads and folds
  const mantle = joint(body, [0, 1.85, -0.2]);
  for (const s of [-1, 1] as const) {
    const w = batWing(mantle, s, [0.12 * s, 0, 0], 1.55, skin, bone);
    w.rotation.set(0.35, 0, s * 0.55); // (lifted and swept up behind it, so they read from above)
    for (let i = 0; i < 4; i++)
      spike(w, [(0.5 + i * 0.25) * s, 0, -0.5 - i * 0.08], [(0.55 + i * 0.25) * s, 0, -0.72 - i * 0.08], 0.05, skin); // (the tatters)
  }
  // the arms: the right holds the sword up and out; the left is the hand that holds the seal
  jointed(
    body,
    [
      [0.42, 1.82, 0],
      [0.62, 1.5, 0.14],
      [0.7, 1.25, 0.26],
    ],
    0.08,
    0.06,
    plate,
    plateLit,
  );
  const hand = joint(body, [-0.42, 1.82, 0]);
  jointed(
    hand,
    [
      [0, 0, 0],
      [-0.14, -0.36, 0.12],
      [-0.12, -0.64, 0.22],
    ],
    0.08,
    0.06,
    plate,
    plateLit,
  );
  part(hand, sphere(0.075, 7, 5), plateLit, [-0.12, -0.7, 0.24]);
  // the sword: a long blade, a cross-guard, its edges lit
  const blade = joint(body, [0.72, 1.25, 0.28], [0, 0, -0.25]);
  part(blade, new THREE.BoxGeometry(0.32, 0.05, 0.06), plateLit, [0, 0.05, 0]); // (the guard)
  limb(blade, [0, -0.25, 0], [0, 0.05, 0], 0.03, bone);
  part(blade, new THREE.BoxGeometry(0.11, 1.35, 0.025), steel, [0, 0.76, 0]);
  part(blade, new THREE.ConeGeometry(0.056, 0.2, 4), steel, [0, 1.53, 0], {
    rot: [0, Math.PI / 4, 0],
    scale: [1, 1, 0.3],
  });
  for (const s of [-1, 1]) part(blade, new THREE.BoxGeometry(0.012, 1.35, 0.028), edge, [0.055 * s, 0.76, 0]); // (its edges, lit)
  const floor = circle(g, U, 1.4);
  const ring = haloRing(g, 0.7, 2.55);
  const halo = glow(U, 3.2, 0.35);
  halo.position.set(0, 2, -0.3);
  g.add(halo);
  return {
    group: g,
    shadow: 2.1,
    school: 'umbral',
    parts: { eye, ring, halo, body, blade, mantle, hand, head, floor, eyeGlow },
    idle: (t) => {
      body.position.y = Math.sin(t * 1.1) * 0.03;
      head.rotation.y = Math.sin(t * 0.5) * 0.2;
      mantle.rotation.x = Math.sin(t * 0.8) * 0.06;
      mantle.scale.x = 1 + Math.sin(t * 0.8) * 0.04;
    },
  };
}

/** Kaelith's look: made in Tripo where a model is in, else built in code. */
export const kaelithMade = () => madeBossLook('kaelith', wingedWatcher);
export const kaelithLook = (): BossBuilt => (kaelithMade() ?? wingedWatcher)();
/** Kaelith kneeling at the end, still, its eyes dim and its ring gone: its own made model where one is in, else the look
    in code posed kneeling. */
export function kaelithKneeling(): BossBuilt {
  const made = madeBossLook('kaelith_kneel', wingedWatcher),
    L = (made ?? wingedWatcher)(),
    P = L.parts;
  L.idle(0);
  if (!made) {
    P.body.position.y = -0.5;
    P.body.rotation.x = 0.28;
    P.head.rotation.x = 0.55;
    P.blade.rotation.x = 0.9;
    P.hand.rotation.x = -0.6;
  }
  if (L.clip) {
    // (as its rigged creature: its kneel played through to the end, where it stays)
    L.clip('kneel');
    for (let t = 0.1; t < 3; t += 0.1) L.idle(t);
  }
  P.eye.scale.setScalar(0.35);
  P.ring.visible = false;
  P.halo.material.opacity = 0.12;
  return { ...L, idle: () => {} }; // (it stays as it knelt)
}
/** On a stand for the galleries, beside the other bosses: standing, and kneeling. */
export const KAELITH_GALLERY: readonly { id: string; build: () => BossBuilt }[] = [
  { id: 'kaelith', build: kaelithLook },
  { id: 'kaelith_kneel', build: kaelithKneeling },
];
