import * as THREE from 'three';
import { CFG } from '../config';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FloorLook } from '../types';
import { glowTex, shadowTex } from './textures';
import { pixelWallTexture } from './pixelTextures';
import { wallTile } from '../assets/models';
import type { WallKind } from '../world/kitData';

/** Box whose UVs are scaled by face size, so the brick texture tiles at 1 repeat per unit. */
export function boxUV(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]);
    }
  return geo;
}

export const M = {
  wallTop: new THREE.MeshBasicMaterial({ color: 0x0d0a08 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x6b625a, roughness: 0.9, flatShading: true }),
  /** Wards: the pale blue of seals on urns, chests and vaults. */
  ward: new THREE.MeshBasicMaterial({ color: 0x8ab8ff }),
  bone: new THREE.MeshStandardMaterial({ color: 0xd8ccb2, roughness: 0.75, emissive: 0x15100a }),
  hero: new THREE.MeshStandardMaterial({ color: 0xb9ae9c, roughness: 0.7, emissive: 0x120d08 }),
};
/** Flag a geometry or material as shared, so disposeTree leaves it alone. */
export function markShared<T extends { userData: Record<string, unknown> }>(o: T) {
  o.userData.shared = true;
  return o;
}
for (const m of Object.values(M)) markShared(m);

const wallCache = new Map<string, THREE.Material[]>();
/** Box materials for walls in a floor's look and the room kit's `kind` of wall: its pixel bricks on the sides (glowing
    where the kind has embers in it), dark tops; shared by every room of that look and kind. */
export function wallMaterials(look: Pick<FloorLook, 'name' | 'wall'>, kind: WallKind) {
  const made = wallTile(look.name, kind), // (the floor's own made face for the kind, data/assets.json, else the kit's)
    key = JSON.stringify(look.wall) + kind + (made?.src ?? '');
  let mats = wallCache.get(key);
  if (!mats) {
    const art = pixelWallTexture(look.wall, kind, made);
    const brick = markShared(
      new THREE.MeshStandardMaterial({
        map: art.map,
        roughness: 0.95,
        ...(art.glow && { emissive: 0xffffff, emissiveMap: art.glow, emissiveIntensity: CFG.roomKit.glow }),
      }),
    );
    mats = [brick, brick, M.wallTop, M.wallTop, brick, brick];
    wallCache.set(key, mats);
  }
  return mats;
}

const cappedCache = new Map<string, THREE.Material[]>();
/** Walls carved inside a room (a partition, a pier, a cut corner): brick sides under a cap of dressed stone, so a
    low one reads as masonry rather than a hole in the floor. */
export function cappedWallMaterials(look: Pick<FloorLook, 'name' | 'wall'>, kind: WallKind) {
  const key = JSON.stringify(look.wall) + kind + (wallTile(look.name, kind)?.src ?? '');
  let mats = cappedCache.get(key);
  if (!mats) {
    const [brick] = wallMaterials(look, kind),
      [r, g, b] = look.wall.brick.map((v) => Math.min(255, Math.round(v * 0.6)));
    const cap = markShared(
      new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${r},${g},${b})`), roughness: 0.9 }),
    );
    mats = [brick, brick, cap, cap, brick, brick];
    cappedCache.set(key, mats);
  }
  return mats;
}

// Geometries flagged userData.shared are never disposed by disposeTree.
const shadowGeo = new THREE.PlaneGeometry(1, 1);
shadowGeo.rotateX(-Math.PI / 2);
shadowGeo.userData.shared = true;
const shadowMat = markShared(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
/** Soft blob shadow on the floor. */
export function blob(size: number) {
  const m = new THREE.Mesh(shadowGeo, shadowMat);
  m.scale.set(size, 1, size);
  m.position.y = 0.012;
  m.renderOrder = 1;
  m.userData.blob = true;
  return m;
}

const cache = new Map<string, { userData: Record<string, unknown> }>();
function cached<T extends { userData: Record<string, unknown> }>(key: string, make: () => T): T {
  let v = cache.get(key);
  if (!v) {
    v = make();
    v.userData.shared = true;
    cache.set(key, v);
  }
  return v as T;
}
export const sphereGeo = (r: number) => cached('sph' + r.toFixed(3), () => new THREE.SphereGeometry(r, 8, 6));
export const basicMat = (c: number) => cached('bas' + c, () => new THREE.MeshBasicMaterial({ color: c }));
/** Additive glow sprite with a shared material (for projectiles). */
export function glowShared(color: number, size: number, opacity: number) {
  const mat = cached(
    'glw' + color + '_' + opacity,
    () =>
      new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
  );
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}
/** Additive glow sprite with its own material (opacity can be animated). */
export function glow(color: number, size: number, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  s.scale.set(size, size, 1);
  return s;
}
/** The room kit's still surfaces: one material for all of them, each piece's colour painted into its
    vertices (`paint`), so an object's still body draws in one call whatever it is made of. How metallic each piece is
    goes in its vertices too (`metal`): iron and bronze shine a little, stone, wood and bone are matte (and so lighter). */
export const KIT_MAT = markShared(
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.3, flatShading: true }),
);
KIT_MAT.onBeforeCompile = (s) => {
  s.vertexShader =
    'attribute float metal;\nvarying float vMetal;\n' +
    s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMetal = metal;');
  s.fragmentShader =
    'varying float vMetal;\n' +
    s.fragmentShader
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMetal;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = 1. - vMetal;');
};
KIT_MAT.customProgramCacheKey = () => 'kit-metal';
/** The room kit's glowing pieces (a glowcap's cap, a rune that shines): unlit, their colours in the vertices. */
export const KIT_GLOW = markShared(new THREE.MeshBasicMaterial({ vertexColors: true }));
/** A colour for the room kit's pieces: a material that only names the colour; `mergeStill` paints it into the vertices
    and draws the piece with `KIT_MAT`. With `mottle`, each flat face of the piece is a shade lighter or darker (up to that
    much), so stone, wood and bark look hewn and worn; `metal` is how metallic it is (0 matte, .3 the kit's iron). */
export const paint = (color: number, mottle = 0, metal = 0.3) => {
  const m = new THREE.MeshStandardMaterial({ color, flatShading: true });
  m.userData.paint = true;
  m.userData.mottle = mottle;
  m.userData.metal = metal;
  return markShared(m);
};
/** A glowing colour for the room kit's pieces: `mergeStill` paints it into one unlit mesh (`KIT_GLOW`) with the others. */
export const glowPaint = (color: number) => {
  const m = new THREE.MeshBasicMaterial({ color });
  m.userData.paint = 'glow';
  return markShared(m);
};
/** A face's shade, the same every time for the same face of the same piece: from its normal and the piece's number. */
const fa = new THREE.Vector3(),
  fb = new THREE.Vector3(),
  fc = new THREE.Vector3();
function faceShade(
  pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  i: number,
  piece: number,
  mottle: number,
) {
  fa.fromBufferAttribute(pos, i);
  fb.fromBufferAttribute(pos, i + 1);
  fc.fromBufferAttribute(pos, i + 2);
  const n = fb.sub(fa).cross(fc.sub(fa)).normalize(),
    k = Math.round(n.x * 40) * 7.13 + Math.round(n.y * 40) * 13.7 + Math.round(n.z * 40) * 3.31 + piece * 41.9; // (a face with no area: a zero normal, one shade)
  const h = Math.sin(k) * 43758.5453;
  return 1 + (h - Math.floor(h) - 0.5) * 2 * mottle;
}

/** Fewer draw calls for an object built from many small meshes: its still meshes that share a material are joined into
    one mesh each, and those painted in the room kit's colours (`paint`) into one mesh together. The parts named in
    `root.userData.parts` (flames, glows, a bell's swing...) and everything under them stay as they are, and so do
    sprites. Build the object at the origin, then call this, then place it. */
export function mergeStill(root: THREE.Object3D) {
  const keep = new Set<THREE.Object3D>(Object.values((root.userData.parts ?? {}) as Record<string, THREE.Object3D>));
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(),
    byMat = new Map<THREE.Material, THREE.Mesh[]>(),
    painted: THREE.Mesh[] = [],
    glowing: THREE.Mesh[] = [];
  const walk = (o: THREE.Object3D) => {
    if (keep.has(o)) return;
    const m = o as THREE.Mesh;
    if (!o.visible) return; // (a hidden piece stays hidden)
    if (m.isMesh && !(o as THREE.Sprite).isSprite && !Array.isArray(m.material) && !o.children.length) {
      // (one material: a geometry's groups don't matter)
      if (m.material.userData.paint === 'glow') glowing.push(m);
      else if (m.material.userData.paint) painted.push(m);
      else {
        const list = byMat.get(m.material) ?? [];
        list.push(m);
        byMat.set(m.material, list);
      }
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  const place = (m: THREE.Mesh, g: THREE.BufferGeometry) => {
    g.clearGroups();
    g.applyMatrix4(toRoot.clone().multiply(m.matrixWorld));
    return g;
  };
  const retire = (meshes: THREE.Mesh[]) => {
    for (const m of meshes) {
      m.parent?.remove(m);
      if (!m.geometry.userData.shared) m.geometry.dispose();
    }
  };
  for (const [mat, meshes] of byMat) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => place(m, m.geometry.clone()));
    const attrs = (g: THREE.BufferGeometry) => Object.keys(g.attributes).sort().join();
    const alike = geos.every((g) => attrs(g) === attrs(geos[0]) && !g.index === !geos[0].index);
    const merged = alike ? mergeGeometries(geos) : null;
    for (const g of geos) g.dispose();
    if (!merged) continue; // (attributes or indexing that don't match: leave them apart)
    const one = new THREE.Mesh(merged, mat);
    one.renderOrder = meshes[0].renderOrder;
    root.add(one);
    retire(meshes);
  }
  for (const [list, mat] of [
    [painted, KIT_MAT],
    [glowing, KIT_GLOW],
  ] as const) {
    // every painted piece in one: positions and normals, and its colour in each vertex
    if (!list.length) continue;
    const geos = list.map((m, piece) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      const c = (m.material as THREE.MeshStandardMaterial).color,
        n = g.attributes.position.count,
        col = new Float32Array(n * 3),
        mottle = (m.material as THREE.Material).userData.mottle as number;
      for (let i = 0; i < n; i += 3) {
        const f = mottle ? faceShade(g.attributes.position, i, piece, mottle) : 1;
        for (let k = i; k < Math.min(n, i + 3); k++) col.set([c.r * f, c.g * f, c.b * f], k * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      if (mat === KIT_MAT)
        g.setAttribute(
          'metal',
          new THREE.BufferAttribute(
            new Float32Array(n).fill(((m.material as THREE.Material).userData.metal ?? 0.3) as number),
            1,
          ),
        );
      return place(m, g);
    });
    const one = new THREE.Mesh(mergeGeometries(geos), mat);
    root.add(one);
    for (const g of geos) g.dispose();
    retire(list);
  }
}

/** Free the GPU resources of a removed object tree: every geometry and material not flagged shared.
    Textures are left alone (they are shared or cached elsewhere). */
export function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!(o as THREE.Sprite).isSprite && m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); // sprites share one internal geometry
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of mats) if (!mat.userData.shared) mat.dispose();
  });
}
