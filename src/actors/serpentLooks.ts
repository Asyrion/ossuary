/* The jelly serpent built in code (docs/archive/M5-plan.md): the thing Dr. Jelly keeps coiled in the vat behind his
   laboratory's window. A long serpent of green jelly: its head a wyrm's skull seen through clear jelly (fantasyBosses.ts),
   a crest of jelly fins and a lower jaw that drops open; its body a chain of jelly rings round a darker core, drawn as instances (a few draw
   calls for the whole length) and laid each step along the trail its head leaves (actors/jellySerpent.ts, as the Pillar
   Dragon's body is). Its light is the laboratory's jelly green; it stands on y = 0 facing +Z. */
import * as THREE from 'three';
import { sphere, std } from '../render/arcane';
import { lay, neck, type P3 } from './dragonPath';
import type { BossBuilt } from './bossLooks';
import { serpentHeadFierce } from './fantasyBosses';

/** The serpent's colours: its jelly, the deeper green of its core, the pale green of its fins and glints. */
export const SERPENT = { jelly: 0x6ad868, deep: 0x1e6a34, pale: 0xc8ffb0, core: 0x2a7a3a, glint: 0xe8ffe0 };

/** The head (the boss's look): a wyrm of clear jelly, its skull seen through it (fantasyBosses.ts): `head`
    (sways, lunges), `jaw` (drops open to spit), `eye`, `ring` (bubbles turning round the crown) and `halo`; `fins` (the
    crest, raised as it rises). */
export const serpentHead = serpentHeadFierce;

/** The serpent's body: `n` rings of jelly round a darker core, drawn as instances, widest behind the head and thinning to a
    fin at the tail. `pose` lays them along the points given (head end first), each turned along the body. */
export interface SerpentBody {
  group: THREE.Group;
  n: number;
  spacing: number;
  mats: THREE.MeshStandardMaterial[];
  pose: (at: readonly (readonly [number, number, number])[]) => void;
}
export function serpentBody(n = 16, spacing = 0.22): SerpentBody {
  const g = new THREE.Group(),
    a = new THREE.Color(SERPENT.jelly),
    b = new THREE.Color(0x4cbc5a);
  const skin = std(0xffffff, { roughness: 0.28, emissive: SERPENT.deep, emissiveIntensity: 0.5 }),
    core = std(SERPENT.core, { roughness: 0.4, emissive: SERPENT.deep, emissiveIntensity: 0.35 });
  const fin = std(SERPENT.pale, { roughness: 0.3, emissive: 0x4a8a4a, emissiveIntensity: 0.5 });
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.42, 6, 12), skin, n),
    cores = new THREE.InstancedMesh(sphere(1, 8, 6), core, n);
  const tail = new THREE.InstancedMesh(new THREE.ConeGeometry(0.5, 1, 4).translate(0, -0.5, 0), fin, 2);
  for (let i = 0; i < n; i++) rings.setColorAt(i, i % 2 ? b : a);
  for (const m of [rings, cores, tail]) {
    m.frustumCulled = false;
    g.add(m);
  } // (the instances go wherever the body does)
  const radius = (i: number) => {
    const t = i / (n - 1);
    return t < 0.2 ? 0.2 + (0.04 * t) / 0.2 : 0.24 - 0.16 * Math.pow((t - 0.2) / 0.8, 1.1);
  };
  const m = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    rot = new THREE.Matrix4(),
    x = new THREE.Vector3(),
    y = new THREE.Vector3(),
    f = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    p = new THREE.Vector3(),
    q = new THREE.Vector3();
  const basis = (at: readonly (readonly [number, number, number])[], i: number, r: number) => {
    const s = at[Math.max(0, i - 1)],
      e = at[Math.min(at.length - 1, i + 1)];
    f.set(s[0] - e[0], s[1] - e[1], s[2] - e[2]);
    if (f.lengthSq() < 1e-8) f.set(0, 0, 1);
    f.normalize();
    x.crossVectors(up, f);
    if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
    x.normalize();
    y.crossVectors(f, x);
    p.set(at[i][0], at[i][1], at[i][2]);
    return m
      .makeBasis(x, y, f)
      .scale(q.set(r, r, r))
      .setPosition(p);
  };
  return {
    group: g,
    n,
    spacing,
    mats: [skin, core, fin],
    pose: (at) => {
      for (let i = 0; i < n; i++) {
        const r = radius(i);
        basis(at, i, r);
        rings.setMatrixAt(i, local.copy(m).multiply(rot.makeScale(0.8, 0.8, 0.55))); // (a ring round the body, its hole along it)
        cores.setMatrixAt(i, local.copy(m).multiply(rot.makeScale(0.62, 0.62, 0.9)));
      }
      basis(at, n - 1, radius(n - 1)); // (the tail's fin: two blades, one up and one down, pointing back)
      for (let k = 0; k < 2; k++)
        tail.setMatrixAt(
          k,
          local
            .copy(m)
            .multiply(rot.makeRotationX(Math.PI / 2 + (k ? -0.5 : 0.5)))
            .multiply(rot.makeScale(0.5, 3.2, 2)),
        );
      rings.instanceMatrix.needsUpdate = cores.instanceMatrix.needsUpdate = tail.instanceMatrix.needsUpdate = true;
    },
  };
}

/** The jelly serpent for the gallery: its head reared up, its body curled on the floor behind it. */
export function serpentLook(): BossBuilt {
  const L = serpentHead(),
    g = new THREE.Group(),
    B = serpentBody();
  L.group.position.y = 0.55;
  g.add(L.group, B.group);
  const coil: P3[] = [];
  for (let k = 0; k <= 40; k++) {
    const s = k / 40,
      a = Math.PI * 0.5 + s * Math.PI * 1.7,
      r = 0.5 + 0.55 * s;
    coil.push([Math.cos(a) * r * 1.2, 0.2, -0.6 + Math.sin(a) * r]);
  }
  B.pose(lay([...neck([0, 0.45, -0.1], coil[0], 0.15), ...coil], B.n, B.spacing, 0.1));
  return {
    ...L,
    group: g,
    shadow: 1.6,
    idle: (t) => {
      L.idle(t);
      L.group.position.y = 0.55 + Math.sin(t * 1.6) * 0.04;
    },
  };
}
