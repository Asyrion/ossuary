/* M4.12 step 7 (docs/archive/M4.12-plan.md): the six Wardlings (let out of a drinking ward, one for each school) redone as ward
   cores: a faceted crystal heart with one slit eye, in a cage of turning runes, in its school's light. Each keeps the old
   look's parts (`body`, which its fight swells, and `light`) and about its height. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, lit, part, runeRing, sphere, std, type School } from '../render/arcane';
import { joint, type Built } from './beastParts';

/** A ward core of `school`: a heart of faceted crystal in the school's light, darker at its faces and bright in its
    heart, one slit eye open in it, two rings of runes turning about it like a cage, shards of it hanging below. */
export function wardCore(school: School): Built {
  const L = SCHOOL_LIGHT[school], g = new THREE.Group(), body = joint(g, [0, .85, 0]);
  const face = school === 'storm' ? 0x3a4a98 : new THREE.Color(L).multiplyScalar(.45).getHex(); // (Storm's yellow is too near Hallow's gold: its faces are a thundercloud)
  const crystalM = std(face, { emissive: school === 'storm' ? 0x2a3470 : L, emissiveIntensity: .3, roughness: .15, metalness: .35, flatShading: true });
  const pale = lit(new THREE.Color(L).lerp(new THREE.Color(0xffffff), .55).getHex());
  part(body, new THREE.OctahedronGeometry(.2, 0), crystalM, [0, 0, 0], { scale: [1, 1.4, 1] });
  part(body, new THREE.OctahedronGeometry(.1, 0), lit(L), [0, 0, 0], { scale: [1, 1.4, 1] }); // (its heart, seen through the facets)
  for (const [x, y, z, h, r] of [[-.14, -.16, .04, .1, .5], [.13, -.18, -.05, .12, -.4], [.02, -.24, .1, .09, .1]] as const) crystal(body, L, [x, y, z], h, [0, 0, r], crystalM); // (shards hanging below)
  // one slit eye, open in its front face
  const eye = joint(body, [0, .03, .17], [-.45, 0, 0]); // (on the front face, tipped up to the camera)
  part(eye, sphere(.085, 10, 6), pale, [0, 0, 0], { scale: [1, .55, .3] });
  part(eye, sphere(.055, 8, 6), lit(0x0a0610), [0, 0, .016], { scale: [.22, 1, .3] });
  // the cage: two rings of runes turning about it
  const cageA = joint(body, [0, 0, 0], [1.25, 0, 0]), cageB = joint(body, [0, 0, 0], [0, 0, 1.15]);
  runeRing(cageA, L, .36, [0, 0, 0], 5); runeRing(cageB, L, .32, [0, 0, 0], 4);
  const light = glow(L, 1.1, .5); body.add(light);
  return { group: g, shadow: .5, parts: { body, light }, idle: t => {
    cageA.rotation.z = t * 1.6; cageB.rotation.y = -t * 1.1; body.position.y = .85 + Math.sin(t * 2.1) * .05; body.scale.setScalar(1);
    body.rotation.y = Math.sin(t * .9) * .25; const k = t % 3.6; eye.scale.y = k < .12 ? .15 : 1;
  } };
}

/** The Wardlings' new looks, by the look id each replaces. */
export const WARDLING_LOOKS: Record<string, () => Built> = {
  wardEmber: () => wardCore('ember'), wardFrost: () => wardCore('frost'), wardStorm: () => wardCore('storm'),
  wardHallow: () => wardCore('hallow'), wardUmbral: () => wardCore('umbral'), wardVerdant: () => wardCore('verdant'),
};
