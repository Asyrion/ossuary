/* M4.12 step 4 (docs/M4.12-plan.md): floor 3's four foes and the wasps' nest redone as creatures of fantasy, by the rules of
   fantasyFloor1.ts: each keeps its fight, the parts its behaviour moves (by the old look's names) and about its height;
   each faces +Z, stands on y = 0 and idles; no round googly eyes; the school in the body. Small repeated parts that move
   move together, so each look draws in about as many calls as the old one did. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, circle, crystal, limb, lit, part, rune, shine, sphere, std, type V3 } from '../render/arcane';
import { rough } from '../world/kitParts';
import { batWing, gloss, joint, jointed, slitEyes, spike, tube, type Built } from './beastParts';

const { ember: E, frost: F, umbral: U } = SCHOOL_LIGHT;

/** A tongue of flame `h` tall at `at`: an outer cone and a hot core (both on `parent`, to flicker with it). */
function flameTongue(parent: THREE.Object3D, at: V3, h: number, outer: THREE.Material, core: THREE.Material, rot: V3 = [0, 0, 0]) {
  part(parent, new THREE.ConeGeometry(h * .28, h, 6), outer, [at[0], at[1] + h / 2, at[2]], { rot });
  part(parent, new THREE.ConeGeometry(h * .14, h * .55, 5), core, [at[0], at[1] + h * .3, at[2] + .005], { rot });
}

/** The Salamander (was the Cinder Salamander; lays burning ground): the alchemists' fire beast, a lean lizard of black
    stone cracked with lava, a crest of fire down its back, flames licking its flanks, ember slits for eyes and a tail
    that ends in flame. */
export function salamander(): Built {
  const g = new THREE.Group(), hide = gloss(0x1c1210, .55, .15), belly = std(0x3a1e14), lava = lit(0xff7a1c), flameM = lit(E), core = lit(0xffd060), body = joint(g, [0, 0, 0]);
  body.rotation.y = .6; // (turned a little, so its length shows; the head looks back at the camera)
  tube(body, [[0, .13, .3], [0, .15, .12], [0, .14, -.08], [0, .12, -.22]], .13, .1, hide, 10, 8);
  part(body, sphere(.11, 10, 8), belly, [0, .07, .04], { scale: [.95, .45, 1.8] });
  for (let i = 0; i < 6; i++) { const z = .24 - i * .09, s = i % 2 ? 1 : -1; limb(body, [.03 * s, .25, z], [.11 * s, .2, z - .05], .012, lava); limb(body, [.11 * s, .2, z - .05], [.13 * s, .12, z - .02], .01, lava); } // (lava in the cracks of its hide)
  const head = joint(body, [0, .16, .34]);
  part(head, rough(sphere(.11, 10, 8), .012, 3), hide, [0, 0, .04], { scale: [1.05, .7, 1.4] });
  part(head, new THREE.BoxGeometry(.18, .025, .12), hide, [0, .06, .04]); // (a heavy brow)
  slitEyes(head, .065, .045, .1, .03, E, .5, .35);
  for (const s of [-1, 1]) spike(head, [.06 * s, .06, -.02], [.12 * s, .1, -.1], .022, hide); // (horns of its brow, swept back)
  part(head, new THREE.BoxGeometry(.14, .01, .1), lava, [0, -.035, .14]); // (the glow of its mouth)
  const crest = joint(body, [0, .26, 0]); // (the crest of fire flickers as one)
  for (const [z, h] of [[.24, .14], [.12, .2], [0, .22], [-.12, .18], [-.22, .13]]) flameTongue(crest, [0, 0, z], h, flameM, core, [-.3, 0, 0]);
  for (const s of [-1, 1]) for (const z of [.12, -.08]) flameTongue(crest, [.1 * s, -.08, z], .1, flameM, core, [-.2, 0, -.8 * s]); // (flames licking its flanks)
  for (const [s, z] of [[-1, .2], [1, .2], [-1, -.14], [1, -.14]]) { jointed(body, [[.09 * s, .12, z], [.2 * s, .1, z + .03], [.22 * s, 0, z + .08]], .035, .022, hide); for (const k of [-1, 0, 1]) spike(body, [.22 * s, .01, z + .08], [.24 * s + k * .03, .005, z + .14], .01, lava); }
  const tail = joint(body, [0, .12, -.22]);
  tube(tail, [[0, 0, 0], [.04, -.03, -.16], [-.02, -.06, -.32], [.06, -.06, -.46]], .09, .02, hide, 10, 6);
  flameTongue(tail, [.06, -.07, -.48], .16, flameM, core, [-1.1, 0, 0]);
  const tipGlow = glow(E, .5, .7); tipGlow.position.set(.06, -.04, -.54); tail.add(tipGlow);
  const heat = glow(E, 1.1, .35); heat.position.y = .25; body.add(heat);
  return { group: g, shadow: .75, idle: t => {
    crest.scale.set(1, .85 + Math.sin(t * 11) * .2, 1); tail.rotation.y = Math.sin(t * 2.5) * .3;
    head.rotation.y = -.5 + Math.sin(t * .9) * .2; head.position.y = .16 + Math.sin(t * 1.8) * .01;
    heat.material.opacity = .3 + Math.sin(t * 3) * .08; tipGlow.material.opacity = .5 + .25 * Math.sin(t * 9);
  } };
}

/** The Hex Imp (blinks about, its hex drains mana): horned, bat-winged and long-limbed, dark as a bruise, a barbed tail, and
    hexing runes burning on its palms, one raised to throw; a hex circle turns under it. */
export function hexImpFierce(): Built {
  const g = new THREE.Group(), skin = gloss(0x3a2452, .5, .15), dark = gloss(0x140c1c, .4, .3), horn = std(0xb8a8c8), wingM = std(0x3a1e4a, { side: THREE.DoubleSide, roughness: .8 }), hex = lit(U), float = joint(g, [0, 0, 0]);
  const ring = circle(g, U, .38);
  const body = joint(float, [0, .5, 0]);
  tube(body, [[0, -.12, -.02], [0, 0, 0], [0, .12, .02]], .07, .1, skin, 6, 7); // (a narrow waist up to broad shoulders)
  // the head: long-chinned, slit eyes under a brow, horns curving up and out, long pointed ears
  const head = joint(body, [0, .22, .03]);
  part(head, sphere(.09, 10, 8), skin, [0, 0, 0], { scale: [.95, 1.1, .95] });
  spike(head, [0, -.05, .04], [0, -.13, .06], .04, skin);
  slitEyes(head, .04, .02, .075, .032, U, .5, .45);
  for (const s of [-1, 1]) {
    tube(head, [[.05 * s, .06, 0], [.1 * s, .16, -.02], [.17 * s, .22, -.07], [.2 * s, .18, -.12]], .026, .005, horn, 10, 5);
    spike(head, [.08 * s, 0, -.01], [.2 * s, .05, -.04], .025, skin);
  }
  // long arms: one hand raised with a hex burning in it, the other low with a rune on its palm
  jointed(body, [[.09, .1, 0], [.2, .2, .06], [.24, .34, .12]], .025, .016, skin);
  for (const k of [-1, 0, 1]) spike(body, [.24, .34, .12], [.25 + k * .03, .42, .14], .007, dark);
  jointed(body, [[-.09, .1, 0], [-.18, -.04, .06], [-.2, -.18, .1]], .025, .016, skin);
  rune(body, U, [-.2, -.2, .13], .07, [-.3, 0, 0], hex);
  rune(body, U, [0, .04, .1], .12, [-.2, 0, 0], hex); const chestGlow = glow(U, .35, .5); chestGlow.position.set(0, .04, .12); body.add(chestGlow); // (a hex burning on its chest)
  const flame = joint(body, [.25, .4, .14]);
  part(flame, sphere(.045, 8, 6), hex, [0, 0, 0]); rune(flame, U, [0, 0, .05], .1, [0, 0, 0], hex);
  const fire = glow(U, .5, .7); flame.add(fire);
  for (const s of [-1, 1]) { jointed(body, [[.05 * s, -.12, 0], [.09 * s, -.24, .06], [.07 * s, -.38, -.02]], .028, .012, skin); spike(body, [.07 * s, -.38, -.02], [.08 * s, -.4, .06], .012, dark); }
  // bat wings, wide, and a barbed tail curling behind
  const wings = ([-1, 1] as const).map(s => batWing(body, s, [.06 * s, .1, -.05], .52, wingM, dark));
  const tail = joint(body, [0, -.12, -.04]);
  tube(tail, [[0, 0, 0], [.06, -.12, -.12], [-.04, -.2, -.24], [.04, -.16, -.36]], .025, .008, skin, 10, 5);
  part(tail, new THREE.OctahedronGeometry(.05), dark, [.05, -.14, -.4], { scale: [1, .35, 1.3] });
  return { group: g, shadow: .5, idle: t => {
    float.position.y = Math.sin(t * 2.6) * .06; head.rotation.z = Math.sin(t * 1.1) * .1; ring.rotation.y = t * .3;
    wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (.2 + Math.sin(t * 9) * .35); w.rotation.y = (i ? -1 : 1) * .3; });
    flame.scale.setScalar(.85 + Math.sin(t * 12) * .15); fire.material.opacity = .55 + Math.sin(t * 9) * .12; tail.rotation.y = Math.sin(t * 2) * .3;
  } };
}

/** The Rime Drake (was the Rime Drakeling, the elite: breath, flight, a frost ring): a young wyvern as long as the mage is
    tall, steel-blue scales, crests and horns of frost, membrane wings on its arms and slit eyes; a frost circle under it. */
export function rimeDrake(): Built {
  const g = new THREE.Group(), scaleM = gloss(0x2c4462, .45, .25), belly = std(0x6a88a8, { emissive: 0x10283c }), bone = std(0xa8d4f0, { emissive: 0x2a5a80 }), wingM = std(0x3a6a98, { side: THREE.DoubleSide, roughness: .6, transparent: true, opacity: .85, emissive: 0x0e2a44 }), horn = std(0xb8d8f0, { roughness: .3, emissive: 0x204a6a }), ice = lit(F), body = joint(g, [0, 0, 0]);
  const ground = circle(g, F, .66);
  part(body, rough(sphere(.2, 12, 10), .015, 2), scaleM, [0, .34, -.04], { scale: [.9, .95, 1.35] });
  part(body, sphere(.14, 10, 8), belly, [0, .3, .1], { scale: [.95, 1.1, .8] });
  tube(body, [[0, .44, .1], [0, .56, .2], [0, .64, .28]], .09, .07, scaleM, 6, 7); // (the neck, raised)
  const head = joint(body, [0, .68, .32]);
  part(head, sphere(.1, 10, 8), scaleM, [0, 0, 0], { scale: [1, .85, 1.1] });
  tube(head, [[0, -.01, .06], [0, -.03, .16], [0, -.05, .24]], .07, .04, scaleM, 6, 6); // (a long snout)
  part(head, new THREE.BoxGeometry(.15, .03, .08), scaleM, [0, .06, .04]); // (the brow)
  slitEyes(head, .06, .04, .09, .03, F, .5, .35);
  for (const s of [-1, 1]) {
    tube(head, [[.05 * s, .07, -.02], [.1 * s, .16, -.1], [.12 * s, .2, -.22]], .03, .006, horn, 8, 5);
    crystal(head, F, [.1 * s, .02, -.04], .1, [-.4, 0, -1.2 * s], ice); // (frost crests behind the jaw)
    for (const z of [.12, .18]) spike(head, [.035 * s, -.07, z], [.033 * s, -.11, z + .01], .01, horn);
  }
  for (const [y, z, h] of [[.6, .02, .22], [.54, -.12, .2], [.48, -.26, .17], [.38, -.4, .14]]) crystal(body, F, [0, y, z], h, [-.5, 0, 0], ice);
  for (let i = 0; i < 4; i++) part(body, new THREE.BoxGeometry(.13 - i * .015, .012, .05), ice, [0, .42 - i * .07, .2 - i * .015], { rot: [-.9, 0, 0] }); // (frost-light between the plates of its breast) // (a crest of frost down its back)
  const breath = glow(F, .5, 0); breath.position.set(0, -.05, .32); head.add(breath);
  // wings on its arms, membrane between bone; two strong legs
  const wings = ([-1, 1] as const).map(s => batWing(body, s, [.13 * s, .46, -.04], .5, wingM, bone));
  for (const s of [-1, 1]) {
    part(body, sphere(.1, 8, 6), scaleM, [.15 * s, .22, -.1], { scale: [.8, 1.1, 1.2] });
    jointed(body, [[.16 * s, .18, -.08], [.18 * s, .08, .02], [.17 * s, 0, .06]], .05, .03, scaleM);
    for (const k of [-1, 0, 1]) spike(body, [.17 * s, .01, .06], [.17 * s + k * .04, 0, .13], .014, horn);
  }
  const tail = joint(body, [0, .26, -.28]);
  tube(tail, [[0, 0, 0], [.06, -.08, -.18], [-.04, -.16, -.38], [.08, -.2, -.56]], .1, .02, scaleM, 12, 6);
  crystal(tail, F, [.09, -.2, -.6], .14, [-1.3, 0, 0], ice);
  const snow = glow(F, 1.2, .25); snow.position.y = .45; body.add(snow);
  return { group: g, shadow: .95, parts: { ground }, idle: t => {
    body.scale.set(1, 1 + Math.sin(t * 1.8) * .02, 1); head.rotation.set(Math.sin(t * 1.1) * .08, Math.sin(t * .7) * .25, Math.sin(t * .9) * .06);
    wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (.25 + Math.sin(t * 3) * .25); w.rotation.x = -.25; });
    tail.rotation.y = Math.sin(t * 1.5) * .35; breath.material.opacity = Math.max(0, Math.sin(t * .9)) ** 3 * .6; snow.material.opacity = .2 + Math.sin(t * 2) * .06;
  } };
}

/** A Cinder Hornet (was an Ember Wasp, let out of its nest): a hornet of obsidian banded with lava, wings of flame, ember
    slits for eyes and a stinger glowing white-hot. */
export function cinderHornet(): Built {
  const g = new THREE.Group(), body = joint(g, [0, .85, 0]), black = gloss(0x120c0a, .25, .5), lava = lit(0xff5a10), sting = lit(0xfff0c0);
  part(body, sphere(.11, 8, 6), black, [0, 0, 0], { scale: [1, .95, 1.25] });
  const head = joint(body, [0, .02, .16]);
  part(head, sphere(.085, 8, 6), black, [0, 0, .02], { scale: [1.1, 1, .9] });
  slitEyes(head, .055, .03, .06, .04, E, .9, .25);
  for (const s of [-1, 1]) {
    spike(head, [.03 * s, -.05, .08], [-.01 * s, -.1, .14], .02, black); // (mandibles)
    tube(head, [[.025 * s, .06, .06], [.07 * s, .16, .08], [.13 * s, .2, .02]], .01, .004, black, 6, 3); // (feelers, swept back like horns)
  }
  limb(body, [0, -.02, -.1], [0, -.05, -.16], .03, black);
  const tail = joint(body, [0, -.05, -.16], [.35, 0, 0]);
  [.13, .135, .12, .095, .065].forEach((r, i) => part(tail, sphere(r, 8, 6), i % 2 ? lava : black, [0, 0, -.06 - i * .1], { scale: i % 2 ? [1.02, .92, .5] : [1, .9, .9] }));
  spike(tail, [0, 0, -.5], [0, -.02, -.66], .03, sting);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) spike(tail, [.1 * s, .02, -.08 - i * .1], [.17 * s, .07, -.12 - i * .1], .018, black); // (obsidian barbs along it)
  const tipGlow = glow(E, .4, .8); tipGlow.position.set(0, -.02, -.64); tail.add(tipGlow);
  // wings of flame: tongues of fire fanned out to each side, a side's beating as one
  const flameM = shine(0xff6a18, .75), core = shine(0xffd060, .7);
  const wings = ([-1, 1] as const).map(s => {
    const w = joint(body, [.06 * s, .08, 0]);
    for (const [a, len] of [[.4, .44], [.08, .52], [-.26, .4], [-.55, .28]]) {
      const dir: V3 = [Math.cos(a) * s, 0, Math.sin(a)];
      for (const [m, r, l, y] of [[flameM, .07, len, 0], [core, .03, len * .6, .005]] as const) {
        const geo = new THREE.ConeGeometry(r, l, 5); geo.rotateX(Math.PI / 2); // (its point along +Z, then turned out along `dir`)
        part(w, geo, m, [dir[0] * l / 2, y, dir[2] * l / 2], { rot: [0, Math.atan2(dir[0], dir[2]), 0], scale: [1, .25, 1] });
      }
    }
    return w;
  });
  for (let i = 0; i < 3; i++) spike(body, [0, .09, .06 - i * .07], [0, .17 - i * .015, .02 - i * .08], .025, black); // (a crest of obsidian points)
  for (const s of [-1, 1]) for (const z of [.07, 0, -.07]) jointed(body, [[.06 * s, -.07, z], [.12 * s, -.16, z + .03], [.1 * s, -.3, z + .02]], .014, .007, black);
  return { group: g, shadow: .8, parts: { body, tail }, idle: t => {
    body.position.y = .85 + Math.sin(t * 3) * .05; body.rotation.y = Math.sin(t * .9) * .2;
    wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 42) * .45 * (i ? 1 : -1); });
    tail.rotation.x = .35 + Math.sin(t * 2.4) * .12; tipGlow.material.opacity = .55 + .3 * Math.sin(t * 6);
  } };
}

/** The Cinder Hornets' nest (only fire harms it): a nest of cooled lava set in the wall, black stone in ridged layers, lava
    glowing in its cracks and at its mouth, where the brood stirs. */
export function lavaNest(): Built {
  const g = new THREE.Group(), body = joint(g, [0, 0, 0]), stone = std(0x2a2220, { roughness: 1 }), ridge = std(0x3c302a, { roughness: 1 }), lava = lit(0xff7a1c), mouth = lit(0x2a0a04);
  const profile = [[0, .05], [.3, .12], [.44, .4], [.46, .7], [.4, 1], [.26, 1.22], [.1, 1.32], [0, 1.34]].map(([r, y]) => new THREE.Vector2(r, y));
  part(body, rough(new THREE.LatheGeometry(profile, 12), .03, 6), stone, [0, 0, 0], { scale: [1, 1, .8] });
  for (let i = 0; i < 5; i++) { const y = .25 + i * .22, r = [.37, .45, .47, .43, .31][i]; part(body, rough(new THREE.TorusGeometry(r, .045, 4, 14), .02, i), ridge, [0, y, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, .8, 1] }); }
  // lava in its cracks: runs down the face between the ridges
  for (const [x, y0, y1] of [[-.24, 1.05, .7], [.2, .95, .52], [-.12, .5, .2], [.3, .6, .32], [.05, 1.2, .9]]) {
    const z = Math.sqrt(Math.max(0, .2 - x * x)) * .8 + .1;
    limb(body, [x, y0, z], [x + .05, (y0 + y1) / 2, z + .02], .018, lava); limb(body, [x + .05, (y0 + y1) / 2, z + .02], [x - .02, y1, z], .016, lava);
  }
  part(body, sphere(.14, 8, 6), mouth, [0, .55, .33], { scale: [1, .8, .45] });
  part(body, new THREE.TorusGeometry(.14, .025, 4, 14), lava, [0, .55, .35], { scale: [1, .8, 1] });
  for (const [x, y] of [[-.22, .85], [.24, .78], [.1, 1.08]]) part(body, sphere(.045, 6, 5), lava, [x, y, Math.sqrt(Math.max(0, .2 - x * x)) * .8 + .12], { scale: [1, .8, .4] }); // (the smaller holes, glowing)
  const brood = glow(E, .7, .7); brood.position.set(0, .55, .38); body.add(brood);
  part(body, new THREE.CylinderGeometry(.06, .1, .3, 6), ridge, [0, 1.42, -.05]); // (where it hangs from the stone)
  return { group: g, shadow: .9, parts: { body }, idle: t => {
    body.scale.set(1 + Math.sin(t * 1.4) * .015, 1, 1); brood.material.opacity = .45 + .3 * Math.max(0, Math.sin(t * 3.1));
  } };
}

/** Floor 3's new looks, by the look id each replaces. */
export const FLOOR3_LOOKS: Record<string, () => Built> = {
  cinderSalamander: salamander, hexImp: hexImpFierce, rimeDrakeling: rimeDrake, emberWasp: cinderHornet, waspNest: lavaNest,
};
