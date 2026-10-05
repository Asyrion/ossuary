/* Kaelith, the Shadow Sentinel (M7 step 2; docs/M7-plan.md, decisions 5 and 6): the Seal's boss, the last of the descent.
   The owner chose two directions of four (2026-10-05) to be drawn up in code, each wearing the same fight (kaelith.ts),
   until the owner picks one: the Hooded Sentinel and the Winged Watcher. Both stand about twice the mage's height on
   y = 0 facing +Z, dark bodies with bright violet features (what reads at play distance), and carry the parts the fight
   moves: `eye`, `ring` and `halo` (every boss's), `body` (it sinks into shadow and kneels at the end), `blade` (the glaive
   or the sword: raised in the sweep's tell, swung through it), `mantle` (the cloak or the wings: spread in the sweep,
   folded in the step) and `hand` (the hand that holds the seal shut in the second phase). */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, circle, limb, lit, part, rune, runeRing, sphere, std } from '../render/arcane';
import { batWing, gloss, joint, jointed, slitEyes, spike, thin, tube } from './beastParts';
import type { BossBuilt } from './bossLooks';

const U = SCHOOL_LIGHT.umbral;
/** The two looks drawn up (the owner picks one; the other goes). */
export const KAELITH_LOOKS = ['hooded', 'winged'] as const;
export type KaelithLook = typeof KAELITH_LOOKS[number];

/** The rune ring the fight turns, behind and above the head, tipped back a little (as the other bosses'). */
function haloRing(g: THREE.Object3D, radius: number, y: number, z = -.35) {
  const ring = new THREE.Group(); ring.position.set(0, y, z); ring.rotation.x = -.35; g.add(ring);
  runeRing(ring, U, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0], lit(U, .9));
  return ring;
}

/** The Hooded Sentinel: a tall hooded Warden in plate gone dark, a robe falling to the floor and fraying into shadow, faceless
    under the cowl but for two violet slits; a great glaive held out to its right side; a cloak behind; three of the Wardens'
    glyphs turning over its head. */
export function hoodedSentinel(): BossBuilt {
  const g = new THREE.Group(), plate = gloss(0x3c3650, .4, .45), plateLit = gloss(0x5e5674, .35, .5), robe = std(0x2a2236, { roughness: 1 }), cloth = thin(0x221a2e, { roughness: 1 });
  const dark = std(0x08060c), haft = gloss(0x231c16, .6, .2), edge = lit(0xc8a8ff), body = joint(g, [0, 0, 0]);
  // the robe, to the floor, its hem frayed into tongues of shadow
  part(body, new THREE.ConeGeometry(.62, 1.5, 12, 1, true), robe, [0, .75, 0], { scale: [1, 1, .85] });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = .6 + (i % 3) * .04; spike(body, [Math.cos(a) * r, .1, Math.sin(a) * r * .85], [Math.cos(a) * (r + .14), -.02, Math.sin(a) * (r + .14) * .85], .07, robe); }
  // the breastplate, a belt, pauldrons
  part(body, sphere(.4, 12, 10), plate, [0, 1.5, .02], { scale: [1, 1.05, .75] });
  part(body, new THREE.TorusGeometry(.36, .05, 5, 14), plateLit, [0, 1.18, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, .85, 1] });
  for (const s of [-1, 1]) { part(body, sphere(.21, 10, 8), plateLit, [.42 * s, 1.78, 0], { scale: [1.15, .8, 1] }); spike(body, [.48 * s, 1.88, 0], [.62 * s, 2.05, -.02], .05, plate); }
  rune(body, U, [0, 1.5, .31], .14, [0, 0, 0], lit(U)); // (a Warden's glyph on its breast, still lit)
  // the hood: a cowl over a face of dark, two violet slits in it
  const head = joint(body, [0, 2.02, .04]);
  part(head, sphere(.3, 12, 10), robe, [0, .02, -.04], { scale: [1, 1.15, 1.05] });
  part(head, new THREE.ConeGeometry(.2, .3, 8), robe, [0, .3, -.12], { rot: [-.5, 0, 0] }); // (the hood's point, falling back)
  part(head, sphere(.2, 10, 8), dark, [0, -.02, .14], { scale: [1, 1.05, .6] });
  const eye = joint(head, [0, .02, .26]);
  slitEyes(eye, .09, 0, 0, .075, 0xc8a0ff, .25, .3);
  const eyeGlow = glow(U, .9, .7); eyeGlow.position.set(0, .02, .3); head.add(eyeGlow); // (the slits burn: they must read under the cowl)
  // the cloak behind, from the shoulders to the floor: the mantle the fight spreads
  const mantle = joint(body, [0, 1.85, -.22]);
  for (const s of [-1, 1]) part(mantle, new THREE.PlaneGeometry(.62, 1.9, 1, 3), cloth, [.27 * s, -.95, -.04 * Math.abs(s)], { rot: [.08, -s * .25, 0] });
  for (let i = 0; i < 5; i++) spike(mantle, [(i - 2) * .22, -1.8, -.1], [(i - 2) * .26, -2, -.2], .07, cloth);
  // the arms: the right holds the glaive out to its side; the left is the hand that holds the seal
  jointed(body, [[.5, 1.72, 0], [.68, 1.35, .1], [.74, 1.1, .2]], .09, .07, plate, plateLit);
  const hand = joint(body, [-.5, 1.72, 0]);
  jointed(hand, [[0, 0, 0], [-.16, -.38, .1], [-.14, -.68, .2]], .09, .07, plate, plateLit);
  part(hand, sphere(.08, 7, 5), plateLit, [-.14, -.74, .22]);
  // the glaive: a long haft, a curved blade at its head, its edge lit
  const blade = joint(body, [.76, 1.1, .22]);
  limb(blade, [0, -1, 0], [0, 1.45, 0], .035, haft);
  part(blade, new THREE.CylinderGeometry(.06, .06, .08, 8), plateLit, [0, 0, 0]);
  const head2 = joint(blade, [0, 1.45, 0]);
  part(head2, new THREE.ConeGeometry(.16, .75, 4, 1), plate, [.08, .34, 0], { rot: [0, 0, -.18], scale: [1, 1, .22] });
  tube(head2, [[.02, -.02, .02], [.2, .25, .02], [.16, .62, .02]], .025, .008, edge, 8, 4); // (its edge, lit)
  spike(head2, [-.02, .05, 0], [-.2, .2, 0], .04, plate); // (the back spike)
  // three Warden glyphs turning over the head, the halo behind, the ring the fight turns
  const glyphs = joint(g, [0, 2.75, 0]);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; rune(glyphs, U, [Math.cos(a) * .45, 0, Math.sin(a) * .45], .16, [0, -a + Math.PI / 2, 0], lit(U)); }
  circle(g, U, 1.25);
  const ring = haloRing(g, .75, 2.4);
  const halo = glow(U, 3, .35); halo.position.set(0, 1.9, -.3); g.add(halo);
  return { group: g, shadow: 1.9, school: 'umbral', parts: { eye, ring, halo, body, blade, mantle, hand, head }, idle: t => {
    body.position.y = Math.sin(t * 1.1) * .03; head.rotation.y = Math.sin(t * .5) * .2;
    mantle.rotation.x = Math.sin(t * .9) * .04; glyphs.rotation.y = t * .6; glyphs.position.y = 2.75 + Math.sin(t * 1.3) * .04;
  } };
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

/** Kaelith's look: the one named, built. */
export const kaelithLook = (look: KaelithLook): BossBuilt => look === 'winged' ? wingedWatcher() : hoodedSentinel();
/** Both on a stand for the galleries (the Look tab chooses which the fight wears). */
export const KAELITH_GALLERY: readonly { id: string; build: () => BossBuilt }[] = [{ id: 'kaelithHooded', build: hoodedSentinel }, { id: 'kaelithWinged', build: wingedWatcher }];

const KEY = 'ossuary.kaelithLook';
let chosen: KaelithLook | null = null;
/** The look Kaelith's fight wears until the owner chooses (the Look tab's switch, remembered in the browser). */
export function kaelithLookNow(): KaelithLook {
  if (chosen) return chosen;
  try { const v = localStorage.getItem(KEY) as KaelithLook | null; chosen = v && KAELITH_LOOKS.includes(v) ? v : 'hooded'; } catch { chosen = 'hooded'; }
  return chosen;
}
/** Wear another look from the next fight on. */
export function setKaelithLook(look: KaelithLook) { chosen = look; try { localStorage.setItem(KEY, look); } catch { /* this session only */ } }
