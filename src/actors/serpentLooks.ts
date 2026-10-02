/* The jelly serpent built in code (M5 step 7, docs/M5-plan.md): the thing Dr. Jelly keeps coiled in the vat behind his
   laboratory's window. A long serpent of green jelly: a blunt glossy head with two great pale eyes, a crest of jelly fins
   and a lower jaw that drops open; its body a chain of jelly rings round a darker core, drawn as instances (a few draw
   calls for the whole length) and laid each step along the trail its head leaves (actors/jellySerpent.ts, as the Pillar
   Dragon's body is). Its light is the laboratory's jelly green; it stands on y = 0 facing +Z. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { bigEyes, part, sphere, std } from '../render/arcane';
import { lay, neck, type P3 } from './dragonPath';
import type { BossBuilt } from './bossLooks';
import { dressedBoss } from './fantasyBosses';

/** The serpent's colours: its jelly, the deeper green of its core, the pale green of its fins and glints. */
export const SERPENT = { jelly: 0x6ad868, deep: 0x1e6a34, pale: 0xc8ffb0, core: 0x2a7a3a, glint: 0xe8ffe0 };

/** The head (the boss's look): `head` (sways, lunges), `jaw` (drops open to spit), `eye`, `ring` (bubbles turning round
    the crown) and `halo`; `fins` (the crest, raised as it rises). */
export function serpentHeadOld(): BossBuilt {
  const g = new THREE.Group(), jelly = std(SERPENT.jelly, { roughness: .28, emissive: SERPENT.deep, emissiveIntensity: .55 });
  const deep = std(SERPENT.deep, { roughness: .4, emissive: SERPENT.deep, emissiveIntensity: .3 }), pale = std(SERPENT.pale, { roughness: .3, emissive: 0x4a8a4a, emissiveIntensity: .5 });
  const head = new THREE.Group(); g.add(head);
  part(head, sphere(.34, 14, 10), jelly, [0, .04, .06], { scale: [1, .78, 1.15] }); // (the skull)
  part(head, sphere(.24, 12, 8), jelly, [0, -.02, .38], { scale: [.95, .62, 1.25] }); // (the snout)
  part(head, sphere(.2, 10, 8), deep, [0, .02, -.02], { scale: [.9, .7, 1] }); // (its core, seen as a darker heart)
  for (const [x, y, z, r] of [[.16, .2, .12, .045], [-.2, .14, -.05, .035], [.05, .26, -.12, .03], [-.08, .12, .34, .028]] as [number, number, number, number][]) part(head, sphere(r, 6, 5), pale, [x, y, z]); // (bubbles in the jelly)
  for (const s of [-1, 1]) part(head, sphere(.035, 5, 4), deep, [.07 * s, .06, .6]); // (nostrils)
  const jaw = new THREE.Group(); jaw.position.set(0, -.13, .14); head.add(jaw);
  part(jaw, sphere(.2, 10, 7), jelly, [0, -.02, .2], { scale: [.85, .4, 1.4] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) part(jaw, new THREE.ConeGeometry(.022, .07, 4), pale, [.09 * s, .06, .16 + i * .1]);
  const eye = new THREE.Group(); eye.position.set(0, .16, .3); head.add(eye);
  const eyes = bigEyes(eye, .15, 0, 0, .09, 0x0a2a14, .35);
  // the crest: fins of jelly down the top of the head and back
  const fins = new THREE.Group(); head.add(fins);
  for (let i = 0; i < 5; i++) part(fins, new THREE.ConeGeometry(.09 - i * .01, .34 - i * .04, 4), pale, [0, .3 - i * .02, .12 - i * .13], { rot: [-.6, 0, 0], scale: [.35, 1, 1] });
  for (const s of [-1, 1]) part(fins, new THREE.ConeGeometry(.07, .3, 4), pale, [.3 * s, .02, -.08], { rot: [-.4, 0, -s * 1.1], scale: [.35, 1, 1] }); // (gill fins)
  // bubbles turning slowly round its crown, and its glow
  const ring = new THREE.Group(); ring.position.set(0, .5, -.1); g.add(ring);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; part(ring, sphere(.035 + (i % 3) * .01, 6, 5), pale, [Math.cos(a) * .42, Math.sin(a * 2) * .04, Math.sin(a) * .42]); }
  const halo = glow(SERPENT.jelly, 2.2, .3); halo.position.set(0, .2, 0); g.add(halo);
  return { group: g, shadow: 1, school: 'frost', parts: { eye, ring, halo, head, jaw, fins }, idle: t => {
    head.rotation.z = Math.sin(t * 1.4) * .07; head.rotation.x = Math.sin(t * 1.1) * .05;
    const k = t % 4.1; for (const e of eyes) e.scale.y = k < .14 ? .12 : 1;
    ring.rotation.y = t * .6;
  } };
}

/** The serpent's body: `n` rings of jelly round a darker core, drawn as instances, widest behind the head and thinning to a
    fin at the tail. `pose` lays them along the points given (head end first), each turned along the body. */
export interface SerpentBody { group: THREE.Group; n: number; spacing: number; mats: THREE.MeshStandardMaterial[]; pose: (at: readonly (readonly [number, number, number])[]) => void }
export function serpentBody(n = 16, spacing = .22): SerpentBody {
  const g = new THREE.Group(), a = new THREE.Color(SERPENT.jelly), b = new THREE.Color(0x4cbc5a);
  const skin = std(0xffffff, { roughness: .28, emissive: SERPENT.deep, emissiveIntensity: .5 }), core = std(SERPENT.core, { roughness: .4, emissive: SERPENT.deep, emissiveIntensity: .35 });
  const fin = std(SERPENT.pale, { roughness: .3, emissive: 0x4a8a4a, emissiveIntensity: .5 });
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(1, .42, 6, 12), skin, n), cores = new THREE.InstancedMesh(sphere(1, 8, 6), core, n);
  const tail = new THREE.InstancedMesh(new THREE.ConeGeometry(.5, 1, 4).translate(0, -.5, 0), fin, 2);
  for (let i = 0; i < n; i++) rings.setColorAt(i, i % 2 ? b : a);
  for (const m of [rings, cores, tail]) { m.frustumCulled = false; g.add(m); } // (the instances go wherever the body does)
  const radius = (i: number) => { const t = i / (n - 1); return t < .2 ? .2 + .04 * t / .2 : .24 - .16 * Math.pow((t - .2) / .8, 1.1); };
  const m = new THREE.Matrix4(), local = new THREE.Matrix4(), rot = new THREE.Matrix4(), x = new THREE.Vector3(), y = new THREE.Vector3(), f = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), q = new THREE.Vector3();
  const basis = (at: readonly (readonly [number, number, number])[], i: number, r: number) => {
    const s = at[Math.max(0, i - 1)], e = at[Math.min(at.length - 1, i + 1)];
    f.set(s[0] - e[0], s[1] - e[1], s[2] - e[2]); if (f.lengthSq() < 1e-8) f.set(0, 0, 1); f.normalize();
    x.crossVectors(up, f); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); y.crossVectors(f, x);
    p.set(at[i][0], at[i][1], at[i][2]);
    return m.makeBasis(x, y, f).scale(q.set(r, r, r)).setPosition(p);
  };
  return { group: g, n, spacing, mats: [skin, core, fin], pose: at => {
    for (let i = 0; i < n; i++) {
      const r = radius(i); basis(at, i, r);
      rings.setMatrixAt(i, local.copy(m).multiply(rot.makeScale(.8, .8, .55))); // (a ring round the body, its hole along it)
      cores.setMatrixAt(i, local.copy(m).multiply(rot.makeScale(.62, .62, .9)));
    }
    basis(at, n - 1, radius(n - 1)); // (the tail's fin: two blades, one up and one down, pointing back)
    for (let k = 0; k < 2; k++) tail.setMatrixAt(k, local.copy(m).multiply(rot.makeRotationX(Math.PI / 2 + (k ? -.5 : .5))).multiply(rot.makeScale(.5, 3.2, 2)));
    rings.instanceMatrix.needsUpdate = cores.instanceMatrix.needsUpdate = tail.instanceMatrix.needsUpdate = true;
  } };
}

/** The jelly serpent's head as it is built now (M4.12: its new look once approved). */
export const serpentHead = dressedBoss('serpentHead', serpentHeadOld);

/** The jelly serpent for the gallery: its head reared up, its body curled on the floor behind it (`head` as the dragon's). */
export function serpentLook(head: () => BossBuilt = serpentHead): BossBuilt {
  const L = head(), g = new THREE.Group(), B = serpentBody();
  L.group.position.y = .55; g.add(L.group, B.group);
  const coil: P3[] = []; for (let k = 0; k <= 40; k++) { const s = k / 40, a = Math.PI * .5 + s * Math.PI * 1.7, r = .5 + .55 * s; coil.push([Math.cos(a) * r * 1.2, .2, -.6 + Math.sin(a) * r]); }
  B.pose(lay([...neck([0, .45, -.1], coil[0], .15), ...coil], B.n, B.spacing, .1));
  return { ...L, group: g, shadow: 1.6, idle: t => { L.idle(t); L.group.position.y = .55 + Math.sin(t * 1.6) * .04; } };
}
