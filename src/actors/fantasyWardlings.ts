/* The six Wardlings (docs/archive/M4.12-plan.md; let out of a drinking ward, one for each school) as ward
   cores: a faceted crystal heart with one slit eye, in a cage of turning runes, in its school's light. Each has the parts
   its fight moves (`body`, which the fight swells, and `light`) and about its height. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { SCHOOL_LIGHT, crystal, lit, part, runeRing, sphere, std, type School } from '../render/arcane';
import { joint, type Built } from './beastParts';

/** A ward core of `school`: a heart of faceted crystal in the school's light, darker at its faces and bright in its
    heart, one slit eye open in it, two rings of runes turning about it like a cage, shards of it hanging below. */
export function wardCore(school: School): Built {
  const L = SCHOOL_LIGHT[school],
    g = new THREE.Group(),
    body = joint(g, [0, 0.85, 0]);
  const face = school === 'storm' ? 0x3a4a98 : new THREE.Color(L).multiplyScalar(0.45).getHex(); // (Storm's yellow is too near Hallow's gold: its faces are a thundercloud)
  const crystalM = std(face, {
    emissive: school === 'storm' ? 0x2a3470 : L,
    emissiveIntensity: 0.3,
    roughness: 0.15,
    metalness: 0.35,
    flatShading: true,
  });
  const pale = lit(new THREE.Color(L).lerp(new THREE.Color(0xffffff), 0.55).getHex());
  part(body, new THREE.OctahedronGeometry(0.2, 0), crystalM, [0, 0, 0], { scale: [1, 1.4, 1] });
  part(body, new THREE.OctahedronGeometry(0.1, 0), lit(L), [0, 0, 0], { scale: [1, 1.4, 1] }); // (its heart, seen through the facets)
  for (const [x, y, z, h, r] of [
    [-0.14, -0.16, 0.04, 0.1, 0.5],
    [0.13, -0.18, -0.05, 0.12, -0.4],
    [0.02, -0.24, 0.1, 0.09, 0.1],
  ] as const)
    crystal(body, L, [x, y, z], h, [0, 0, r], crystalM); // (shards hanging below)
  // one slit eye, open in its front face
  const eye = joint(body, [0, 0.03, 0.17], [-0.45, 0, 0]); // (on the front face, tipped up to the camera)
  part(eye, sphere(0.085, 10, 6), pale, [0, 0, 0], { scale: [1, 0.55, 0.3] });
  part(eye, sphere(0.055, 8, 6), lit(0x0a0610), [0, 0, 0.016], { scale: [0.22, 1, 0.3] });
  // the cage: two rings of runes turning about it
  const cageA = joint(body, [0, 0, 0], [1.25, 0, 0]),
    cageB = joint(body, [0, 0, 0], [0, 0, 1.15]);
  runeRing(cageA, L, 0.36, [0, 0, 0], 5);
  runeRing(cageB, L, 0.32, [0, 0, 0], 4);
  const light = glow(L, 1.1, 0.5);
  body.add(light);
  return {
    group: g,
    shadow: 0.5,
    parts: { body, light },
    idle: (t) => {
      cageA.rotation.z = t * 1.6;
      cageB.rotation.y = -t * 1.1;
      body.position.y = 0.85 + Math.sin(t * 2.1) * 0.05;
      body.scale.setScalar(1);
      body.rotation.y = Math.sin(t * 0.9) * 0.25;
      const k = t % 3.6;
      eye.scale.y = k < 0.12 ? 0.15 : 1;
    },
  };
}

/** The Wardlings' looks, by the look id each replaces. */
export const WARDLING_LOOKS: Record<string, () => Built> = {
  wardEmber: () => wardCore('ember'),
  wardFrost: () => wardCore('frost'),
  wardStorm: () => wardCore('storm'),
  wardHallow: () => wardCore('hallow'),
  wardUmbral: () => wardCore('umbral'),
  wardVerdant: () => wardCore('verdant'),
};
