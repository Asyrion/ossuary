import * as THREE from 'three';
import { brickTex, glowTex, shadowTex } from './textures';

/** Box whose UVs are scaled by face size, so the brick texture tiles at 1 repeat per unit. */
export function boxUV(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
  return geo;
}

export const M = {
  wall: new THREE.MeshStandardMaterial({ map: brickTex, roughness: .95 }),
  wallTop: new THREE.MeshBasicMaterial({ color: 0x0d0a08 }),
  threshold: new THREE.MeshStandardMaterial({ color: 0x3a3129, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x6b625a, roughness: .9, flatShading: true }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2e2c2e, roughness: .5, metalness: .7 }),
  frame: {
    normal: new THREE.MeshStandardMaterial({ color: 0x2a2019, roughness: .9 }),
    treasure: new THREE.MeshStandardMaterial({ color: 0x6e5424, roughness: .45, metalness: .6, emissive: 0x2a1800 }),
    boss: new THREE.MeshStandardMaterial({ color: 0x4d1712, roughness: .7, emissive: 0x3a0804 }),
  },
  flame: new THREE.MeshBasicMaterial({ color: 0xffc36a }),
  gate: new THREE.MeshStandardMaterial({ color: 0x6b5644, roughness: .55, metalness: .5, emissive: 0x1a0f07 }),
  hero: new THREE.MeshStandardMaterial({ color: 0xb9ae9c, roughness: .7, emissive: 0x120d08 }),
};
export const WALL_MATS = [M.wall, M.wall, M.wallTop, M.wallTop, M.wall, M.wall];

/** Flag a geometry or material as shared, so disposeTree leaves it alone. */
export function markShared<T extends { userData: Record<string, unknown> }>(o: T) { o.userData.shared = true; return o; }
for (const m of [M.wall, M.wallTop, M.threshold, M.rock, M.iron, M.flame, M.gate, M.hero, ...Object.values(M.frame)]) markShared(m);

// Geometries flagged userData.shared are never disposed by disposeTree.
const shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2); shadowGeo.userData.shared = true;
const shadowMat = markShared(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
/** Soft blob shadow on the floor. */
export function blob(size: number) {
  const m = new THREE.Mesh(shadowGeo, shadowMat); m.scale.set(size, 1, size); m.position.y = 0.012; m.renderOrder = 1; return m;
}

const cache = new Map<string, { userData: Record<string, unknown> }>();
function cached<T extends { userData: Record<string, unknown> }>(key: string, make: () => T): T {
  let v = cache.get(key);
  if (!v) { v = make(); v.userData.shared = true; cache.set(key, v); }
  return v as T;
}
export const sphereGeo = (r: number) => cached('sph' + r.toFixed(3), () => new THREE.SphereGeometry(r, 8, 6));
export const basicMat = (c: number) => cached('bas' + c, () => new THREE.MeshBasicMaterial({ color: c }));
/** Additive glow sprite with a shared material (for projectiles). */
export function glowShared(color: number, size: number, opacity: number) {
  const mat = cached('glw' + color + '_' + opacity, () => new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  const s = new THREE.Sprite(mat); s.scale.set(size, size, 1); return s;
}
/** Additive glow sprite with its own material (opacity can be animated). */
export function glow(color: number, size: number, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); return s;
}
/** Free the GPU resources of a removed object tree: every geometry and material not flagged shared.
    Textures are left alone (they are shared or cached elsewhere). */
export function disposeTree(obj: THREE.Object3D) {
  obj.traverse(o => {
    const m = o as THREE.Mesh;
    if (!(o as THREE.Sprite).isSprite && m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); // sprites share one internal geometry
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) if (!mat.userData.shared) mat.dispose();
  });
}
