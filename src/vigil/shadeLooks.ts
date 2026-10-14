/* The chained shades' looks, built in code: a shade kneeling, pale and see-through in its own light, its head
   bowed under a hood (told apart from the Bound Shade, the merchant, who stands, dark-robed, over his wares), and the chains
   that hold it, each from a manacle or its waist down to a staple in the floor, a lock on it glowing in the school that
   wards it (iron grey for a plain chain). A bound shade walking with the mage is a small wisp of the same, at its shoulder. */
import * as THREE from 'three';
import { blob, glow } from '../render/materials';
import { SCHOOL_LIGHT } from '../render/arcane';
import { MAT, mesh } from '../world/kitParts';
import type { School } from '../magic/spellData';

const ghost = (light: string, opacity: number) =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(light).lerp(new THREE.Color(0xeef2fa), 0.6),
    emissive: new THREE.Color(light).lerp(new THREE.Color(0xffffff), 0.3),
    emissiveIntensity: 0.9,
    roughness: 1,
    transparent: true,
    opacity,
    depthWrite: false,
  });
const lathe = (pts: number[][], n = 10) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    n,
  );

/** A shade's figure: a hooded robe, its head bowed (`kneel`: kneeling, bound; else standing, a little above the floor). */
function figure(mat: THREE.Material, kneel: boolean) {
  const g = new THREE.Group(),
    h = kneel ? 0.72 : 1.05;
  mesh(
    g,
    lathe([
      [0.3, 0],
      [0.28, h * 0.25],
      [0.2, h * 0.65],
      [0.13, h * 0.9],
      [0.05, h],
    ]),
    mat,
  );
  const head = new THREE.Group();
  head.position.set(0, h + 0.06, kneel ? 0.07 : 0.02);
  head.rotation.x = kneel ? 0.55 : 0.15;
  g.add(head);
  mesh(head, new THREE.SphereGeometry(0.14, 10, 8).scale(1, 1.1, 1.05), mat);
  mesh(head, new THREE.ConeGeometry(0.1, 0.2, 8).rotateX(-0.5), mat, 0, 0.12, -0.07);
  mesh(head, new THREE.BoxGeometry(0.15, 0.12, 0.03), MAT.socket, 0, -0.01, 0.13);
  for (const s of [-1, 1]) {
    // the arms, reaching down and forward (to the manacles when kneeling)
    const arm = mesh(g, new THREE.CylinderGeometry(0.045, 0.06, kneel ? 0.42 : 0.48, 6), mat, s * 0.2, h * 0.72, 0.1);
    arm.rotation.set(kneel ? -0.9 : -0.3, 0, s * 0.3);
  }
  return g;
}

export interface ChainLook {
  group: THREE.Group;
  lock: THREE.Mesh;
  anchor: THREE.Vector3;
}
/** A chained shade in its light, kneeling, with a chain for each ward (`null`: plain): from a wrist or its waist down to a
    staple in the floor round it. */
export function chainedShadeLook(light: string, wards: (School | null)[]) {
  const g = new THREE.Group(),
    mat = ghost(light, 0.78),
    fig = figure(mat, true);
  fig.scale.setScalar(1.2);
  g.add(fig);
  const aura = glow(new THREE.Color(light).getHex(), 2.2, 0.6);
  aura.position.y = 0.6;
  g.add(aura);
  const iron = new THREE.MeshStandardMaterial({ color: 0xa8a6b4, roughness: 0.5, metalness: 0.6 }); // (pale iron: the links read against a dark floor)
  const link = new THREE.TorusGeometry(0.05, 0.017, 4, 8);
  const from = [
    new THREE.Vector3(-0.36, 0.46, 0.36),
    new THREE.Vector3(0.36, 0.46, 0.36),
    new THREE.Vector3(0, 0.36, -0.26),
  ];
  const to = [
    new THREE.Vector3(-0.85, 0.02, 0.6),
    new THREE.Vector3(0.85, 0.02, 0.6),
    new THREE.Vector3(0, 0.02, -0.8),
  ];
  const chains: ChainLook[] = wards.map((ward, i) => {
    const c = new THREE.Group(),
      a = from[i % 3],
      b = to[i % 3],
      links = 9;
    for (let k = 0; k <= links; k++) {
      // links along a sagging line, each turned a quarter from the last
      const t = k / links,
        p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * 0.1;
      const m = mesh(c, link, iron, p.x, p.y, p.z);
      m.lookAt(b);
      m.rotateY(Math.PI / 2);
      if (k % 2) m.rotateX(Math.PI / 2);
    }
    mesh(c, new THREE.TorusGeometry(0.09, 0.026, 4, 10).rotateX(Math.PI / 2), iron, b.x, 0.03, b.z); // (the staple in the floor)
    const col = ward ? SCHOOL_LIGHT[ward] : 0x8a8692;
    const lock = mesh(
      c,
      new THREE.BoxGeometry(0.15, 0.16, 0.08),
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: ward ? col : 0x000000,
        emissiveIntensity: ward ? 0.8 : 0,
        roughness: 0.6,
      }),
      (a.x + b.x) / 2,
      (a.y + b.y) / 2 - 0.05,
      (a.z + b.z) / 2,
    );
    if (ward) {
      const gl = glow(col, 0.8, 0.85);
      gl.position.copy(lock.position);
      c.add(gl);
    }
    g.add(c);
    return { group: c, lock, anchor: b.clone() };
  });
  for (const s of [-1, 1]) mesh(g, new THREE.TorusGeometry(0.07, 0.025, 4, 8), iron, s * 0.36, 0.46, 0.36); // (the manacles)
  g.add(blob(1.6));
  return { group: g, figure: fig, aura, chains, mat };
}

/** A bound shade walking with the mage: a small wisp of the same figure in its light, standing in the air. */
export function shadeWispLook(light: string) {
  const g = new THREE.Group(),
    fig = figure(ghost(light, 0.5), false);
  fig.scale.setScalar(0.42);
  g.add(fig);
  const gl = glow(new THREE.Color(light).getHex(), 0.8, 0.5);
  gl.position.y = 0.3;
  g.add(gl);
  return g;
}
