/* The chained shades' looks (M7 step 6), built in code: a shade kneeling, pale and see-through in its own light, its head
   bowed under a hood (told apart from the Bound Shade, the merchant, who stands, dark-robed, over his wares), and the chains
   that hold it, each from a manacle or its waist down to a staple in the floor, a lock on it glowing in the school that
   wards it (iron grey for a plain chain). A bound shade walking with the mage is a small wisp of the same, at its shoulder. */
import * as THREE from 'three';
import { blob, glow } from '../render/materials';
import { SCHOOL_LIGHT } from '../render/arcane';
import { MAT, mesh } from '../world/kitParts';
import type { School } from '../magic/spellData';

const ghost = (light: string, opacity: number) => new THREE.MeshStandardMaterial({ color: new THREE.Color(light).lerp(new THREE.Color(0xeef2fa), .6), emissive: new THREE.Color(light).lerp(new THREE.Color(0xffffff), .3), emissiveIntensity: .9, roughness: 1, transparent: true, opacity, depthWrite: false });
const lathe = (pts: number[][], n = 10) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n);

/** A shade's figure: a hooded robe, its head bowed (`kneel`: kneeling, bound; else standing, a little above the floor). */
function figure(mat: THREE.Material, kneel: boolean) {
  const g = new THREE.Group(), h = kneel ? .72 : 1.05;
  mesh(g, lathe([[.3, 0], [.28, h * .25], [.2, h * .65], [.13, h * .9], [.05, h]]), mat);
  const head = new THREE.Group(); head.position.set(0, h + .06, kneel ? .07 : .02); head.rotation.x = kneel ? .55 : .15; g.add(head);
  mesh(head, new THREE.SphereGeometry(.14, 10, 8).scale(1, 1.1, 1.05), mat);
  mesh(head, new THREE.ConeGeometry(.1, .2, 8).rotateX(-.5), mat, 0, .12, -.07);
  mesh(head, new THREE.BoxGeometry(.15, .12, .03), MAT.socket, 0, -.01, .13);
  for (const s of [-1, 1]) { // the arms, reaching down and forward (to the manacles when kneeling)
    const arm = mesh(g, new THREE.CylinderGeometry(.045, .06, kneel ? .42 : .48, 6), mat, s * .2, h * .72, .1);
    arm.rotation.set(kneel ? -.9 : -.3, 0, s * .3);
  }
  return g;
}

export interface ChainLook { group: THREE.Group; lock: THREE.Mesh; anchor: THREE.Vector3 }
/** A chained shade in its light, kneeling, with a chain for each ward (`null`: plain): from a wrist or its waist down to a
    staple in the floor round it. */
export function chainedShadeLook(light: string, wards: (School | null)[]) {
  const g = new THREE.Group(), mat = ghost(light, .78), fig = figure(mat, true); fig.scale.setScalar(1.2); g.add(fig);
  const aura = glow(new THREE.Color(light).getHex(), 2.2, .6); aura.position.y = .6; g.add(aura);
  const iron = new THREE.MeshStandardMaterial({ color: 0xa8a6b4, roughness: .5, metalness: .6 }); // (pale iron: the links read against a dark floor)
  const link = new THREE.TorusGeometry(.05, .017, 4, 8);
  const from = [new THREE.Vector3(-.36, .46, .36), new THREE.Vector3(.36, .46, .36), new THREE.Vector3(0, .36, -.26)];
  const to = [new THREE.Vector3(-.85, .02, .6), new THREE.Vector3(.85, .02, .6), new THREE.Vector3(0, .02, -.8)];
  const chains: ChainLook[] = wards.map((ward, i) => {
    const c = new THREE.Group(), a = from[i % 3], b = to[i % 3], links = 9;
    for (let k = 0; k <= links; k++) { // links along a sagging line, each turned a quarter from the last
      const t = k / links, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * .1;
      const m = mesh(c, link, iron, p.x, p.y, p.z); m.lookAt(b); m.rotateY(Math.PI / 2); if (k % 2) m.rotateX(Math.PI / 2);
    }
    mesh(c, new THREE.TorusGeometry(.09, .026, 4, 10).rotateX(Math.PI / 2), iron, b.x, .03, b.z); // (the staple in the floor)
    const col = ward ? SCHOOL_LIGHT[ward] : 0x8a8692;
    const lock = mesh(c, new THREE.BoxGeometry(.15, .16, .08), new THREE.MeshStandardMaterial({ color: col, emissive: ward ? col : 0x000000, emissiveIntensity: ward ? .8 : 0, roughness: .6 }), (a.x + b.x) / 2, (a.y + b.y) / 2 - .05, (a.z + b.z) / 2);
    if (ward) { const gl = glow(col, .8, .85); gl.position.copy(lock.position); c.add(gl); }
    g.add(c); return { group: c, lock, anchor: b.clone() };
  });
  for (const s of [-1, 1]) mesh(g, new THREE.TorusGeometry(.07, .025, 4, 8), iron, s * .36, .46, .36); // (the manacles)
  g.add(blob(1.6));
  return { group: g, figure: fig, aura, chains, mat };
}

/** A bound shade walking with the mage: a small wisp of the same figure in its light, standing in the air. */
export function shadeWispLook(light: string) {
  const g = new THREE.Group(), fig = figure(ghost(light, .5), false); fig.scale.setScalar(.42); g.add(fig);
  const gl = glow(new THREE.Color(light).getHex(), .8, .5); gl.position.y = .3; g.add(gl);
  return g;
}
