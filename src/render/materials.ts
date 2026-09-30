import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FloorLook } from '../types';
import { brickTexture, glowTex, shadowTex } from './textures';
import { pixelBrickTexture } from './pixelTextures';

/** Box whose UVs are scaled by face size, so the brick texture tiles at 1 repeat per unit. */
export function boxUV(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d); const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
  return geo;
}

export const M = {
  wallTop: new THREE.MeshBasicMaterial({ color: 0x0d0a08 }),
  threshold: new THREE.MeshStandardMaterial({ color: 0x3a3129, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x6b625a, roughness: .9, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: 0x7c7268, roughness: .85 }),       // pillars
  tomb: new THREE.MeshStandardMaterial({ color: 0x5e5750, roughness: .9 }),
  clay: new THREE.MeshStandardMaterial({ color: 0x8a5436, roughness: .8, flatShading: true }),        // urns
  urnStone: new THREE.MeshStandardMaterial({ color: 0x4c4a54, roughness: .55, metalness: .3, flatShading: true }),
  urnLid: new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: .9 }),
  /** Wards: the pale blue of seals on urns, chests and vaults. */
  ward: new THREE.MeshBasicMaterial({ color: 0x8ab8ff }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2e2c2e, roughness: .5, metalness: .7 }),
  frame: {
    normal: new THREE.MeshStandardMaterial({ color: 0x2a2019, roughness: .9 }),
    treasure: new THREE.MeshStandardMaterial({ color: 0x6e5424, roughness: .45, metalness: .6, emissive: 0x2a1800 }),
    boss: new THREE.MeshStandardMaterial({ color: 0x4d1712, roughness: .7, emissive: 0x3a0804 }),
    ordeal: new THREE.MeshStandardMaterial({ color: 0x2c2b30, roughness: .45, metalness: .7, emissive: 0x0c0a10 }),
    altar: new THREE.MeshStandardMaterial({ color: 0xcfc2a6, roughness: .8, emissive: 0x1a1208 }),
    merchant: new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: .7, emissive: 0x141a14 }),
    vault: new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: .35, metalness: .85, emissive: 0x080a14 }),
    shrine: new THREE.MeshStandardMaterial({ color: 0x9a9282, roughness: .8, emissive: 0x16120a }),
    library: new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: .75, emissive: 0x1c1208 }),
  },
  bone: new THREE.MeshStandardMaterial({ color: 0xd8ccb2, roughness: .75, emissive: 0x15100a }),
  gate: new THREE.MeshStandardMaterial({ color: 0x6b5644, roughness: .55, metalness: .5, emissive: 0x1a0f07 }),
  hero: new THREE.MeshStandardMaterial({ color: 0xb9ae9c, roughness: .7, emissive: 0x120d08 }),
};
/** Flag a geometry or material as shared, so disposeTree leaves it alone. */
export function markShared<T extends { userData: Record<string, unknown> }>(o: T) { o.userData.shared = true; return o; }
for (const m of [M.wallTop, M.threshold, M.rock, M.stone, M.tomb, M.clay, M.urnStone, M.urnLid, M.ward, M.iron, M.gate, M.hero, M.bone, ...Object.values(M.frame)]) markShared(m);

const wallCache = new Map<string, THREE.Material[]>();
/** Box materials for walls in a floor's look (brick sides, dark tops), shared by every room of that look; `kit` for the
    room kit's pixel bricks. */
export function wallMaterials(wall: FloorLook['wall'], kit = false) {
  const key = JSON.stringify(wall) + kit; let mats = wallCache.get(key);
  if (!mats) {
    const brick = markShared(new THREE.MeshStandardMaterial({ map: kit ? pixelBrickTexture(wall) : brickTexture(wall), roughness: .95 }));
    mats = [brick, brick, M.wallTop, M.wallTop, brick, brick]; wallCache.set(key, mats);
  }
  return mats;
}

const cappedCache = new Map<string, THREE.Material[]>();
/** Walls carved inside a room (a partition, a pier, a cut corner): brick sides under a cap of dressed stone, so a
    low one reads as masonry rather than a hole in the floor. */
export function cappedWallMaterials(wall: FloorLook['wall'], kit = false) {
  const key = JSON.stringify(wall) + kit; let mats = cappedCache.get(key);
  if (!mats) {
    const [brick] = wallMaterials(wall, kit), [r, g, b] = wall.brick.map(v => Math.min(255, Math.round(v * .6)));
    const cap = markShared(new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${r},${g},${b})`), roughness: .9 }));
    mats = [brick, brick, cap, cap, brick, brick]; cappedCache.set(key, mats);
  }
  return mats;
}

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
/** The room kit's still surfaces (M3.5 step 3): one material for all of them, each piece's colour painted into its
    vertices (`paint`), so an object's still body draws in one call whatever it is made of. */
export const KIT_MAT = markShared(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .3, flatShading: true }));
/** A colour for the room kit's pieces: a material that only names the colour; `mergeStill` paints it into the vertices
    and draws the piece with `KIT_MAT`. */
export const paint = (color: number) => { const m = new THREE.MeshStandardMaterial({ color, flatShading: true }); m.userData.paint = true; return markShared(m); };

/** Fewer draw calls for an object built from many small meshes: its still meshes that share a material are joined into
    one mesh each, and those painted in the room kit's colours (`paint`) into one mesh together. The parts named in
    `root.userData.parts` (flames, glows, a bell's swing...) and everything under them stay as they are, and so do
    sprites. Build the object at the origin, then call this, then place it. */
export function mergeStill(root: THREE.Object3D) {
  const keep = new Set<THREE.Object3D>(Object.values((root.userData.parts ?? {}) as Record<string, THREE.Object3D>));
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), byMat = new Map<THREE.Material, THREE.Mesh[]>(), painted: THREE.Mesh[] = [];
  const walk = (o: THREE.Object3D) => {
    if (keep.has(o)) return;
    const m = o as THREE.Mesh;
    if (!o.visible) return; // (a hidden piece stays hidden)
    if (m.isMesh && !(o as THREE.Sprite).isSprite && !Array.isArray(m.material) && !o.children.length) { // (one material: a geometry's groups don't matter)
      if (m.material.userData.paint) painted.push(m);
      else { const list = byMat.get(m.material) ?? []; list.push(m); byMat.set(m.material, list); }
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  const place = (m: THREE.Mesh, g: THREE.BufferGeometry) => { g.clearGroups(); g.applyMatrix4(toRoot.clone().multiply(m.matrixWorld)); return g; };
  const retire = (meshes: THREE.Mesh[]) => { for (const m of meshes) { m.parent?.remove(m); if (!m.geometry.userData.shared) m.geometry.dispose(); } };
  for (const [mat, meshes] of byMat) {
    if (meshes.length < 2) continue;
    const geos = meshes.map(m => place(m, m.geometry.clone()));
    const attrs = (g: THREE.BufferGeometry) => Object.keys(g.attributes).sort().join();
    const alike = geos.every(g => attrs(g) === attrs(geos[0]) && !g.index === !geos[0].index);
    const merged = alike ? mergeGeometries(geos) : null;
    for (const g of geos) g.dispose();
    if (!merged) continue; // (attributes or indexing that don't match: leave them apart)
    const one = new THREE.Mesh(merged, mat); one.renderOrder = meshes[0].renderOrder; root.add(one);
    retire(meshes);
  }
  if (painted.length) { // every painted piece in one: positions and normals, and its colour in each vertex
    const geos = painted.map(m => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      const c = (m.material as THREE.MeshStandardMaterial).color, n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return place(m, g);
    });
    const one = new THREE.Mesh(mergeGeometries(geos)!, KIT_MAT); root.add(one);
    for (const g of geos) g.dispose();
    retire(painted);
  }
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
