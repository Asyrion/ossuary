/* A creature built from many small parts (the bestiary's critters, about fifty meshes each) made cheap
   to draw as a foe. Which parts its idle moves is found by playing the idle at many moments and noting what
   changes (a transform, whether it shows, a material's colour or opacity); then, within each part that moves and within
   the creature itself, every still mesh is merged with the others of the same kind of surface into one mesh, each
   piece's colour in its vertices. The moving parts keep their places, so the idle goes on moving them. What moves is
   worked out once for each kind of creature (`key`) and reused: the builders make the same parts in the same order. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Idle = (t: number) => void;
interface Plan {
  moving: Set<number>;
  live: Set<number>;
}
const plans = new Map<string, Plan>();
const SAMPLES = 320,
  STEP = 0.043; // (about 14 s: every blink, peek and flicker comes round at least once)

/** Merge the still parts of `root` (see above); `keep` are parts moved by something else than the idle (a foe's behaviour),
    kept apart as if they moved. Returns its lit surfaces after the merge, whose emissive a hit flash or a status glow may
    light (each creature has its own). */
export function mergeRig(root: THREE.Object3D, idle: Idle, key: string, keep: THREE.Object3D[] = []) {
  const nodes: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o !== root) nodes.push(o);
  });
  const studied = plans.get(key) ?? study(nodes, idle);
  plans.set(key, studied);
  const index = new Map(nodes.map((o, i) => [o, i]));
  const plan = { moving: new Set([...studied.moving, ...keep.map((o) => index.get(o)!)]), live: studied.live };
  idle(0);
  root.updateMatrixWorld(true);
  const owner = (o: THREE.Object3D) => {
    let p = o.parent!;
    while (p !== root && !plan.moving.has(index.get(p)!)) p = p.parent!;
    return p;
  };
  const groups = new Map<THREE.Object3D, Map<string, THREE.Mesh[]>>(),
    dropped = new Set<THREE.Material>();
  nodes.forEach((o, i) => {
    const m = o as THREE.Mesh;
    if (
      !m.isMesh ||
      (o as unknown as THREE.Sprite).isSprite ||
      plan.moving.has(i) ||
      plan.live.has(i) ||
      !o.visible ||
      Array.isArray(m.material)
    )
      return;
    const sig = signature(m.material);
    if (!sig) return;
    const own = owner(o),
      byOwner = groups.get(own) ?? new Map<string, THREE.Mesh[]>();
    groups.set(own, byOwner);
    const list = byOwner.get(sig) ?? [];
    list.push(m);
    byOwner.set(sig, list);
  });
  for (const [own, bySig] of groups)
    for (const list of bySig.values()) {
      if (list.length < 2) continue;
      const toOwner = own.matrixWorld.clone().invert();
      const geos = list.map((m) => {
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
        if (!g.attributes.normal) g.computeVertexNormals();
        g.applyMatrix4(toOwner.clone().multiply(m.matrixWorld));
        const c = (m.material as THREE.MeshBasicMaterial).color,
          n = g.attributes.position.count,
          col = new Float32Array(n * 3);
        for (let k = 0; k < n; k++) col.set([c.r, c.g, c.b], k * 3);
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.clearGroups();
        return g;
      });
      const merged = mergeGeometries(geos);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      const one = new THREE.Mesh(
        merged,
        painted(list[0].material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial),
      );
      one.renderOrder = list[0].renderOrder;
      own.add(one);
      for (const m of list) {
        m.parent!.remove(m);
        m.geometry.dispose();
        dropped.add(m.material as THREE.Material);
      }
    }
  // (the surfaces no mesh uses any more)
  const kept = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (m) for (const x of [m].flat()) kept.add(x);
  });
  for (const m of dropped) if (!kept.has(m)) m.dispose();
  const lit: THREE.MeshStandardMaterial[] = [];
  for (const m of kept)
    if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial && !lit.includes(m as THREE.MeshStandardMaterial))
      lit.push(m as THREE.MeshStandardMaterial);
  return lit;
}

/** What the idle moves: every part whose place, turn, size or showing changes, and every mesh whose surface changes. */
function study(nodes: THREE.Object3D[], idle: Idle): Plan {
  const snap = () =>
    nodes.map((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined,
        mat = m && !Array.isArray(m) ? m : undefined;
      return [
        ...o.position.toArray(),
        ...o.quaternion.toArray(),
        ...o.scale.toArray(),
        o.visible ? 1 : 0,
        mat?.opacity ?? 1,
        mat?.color?.getHex() ?? 0,
        (mat as unknown as THREE.MeshStandardMaterial | undefined)?.emissive?.getHex() ?? 0,
      ];
    });
  idle(0);
  const base = snap(),
    moving = new Set<number>(),
    live = new Set<number>();
  for (let s = 1; s <= SAMPLES; s++) {
    idle(s * STEP);
    const now = snap();
    now.forEach((vals, i) => {
      for (let k = 0; k < 11; k++)
        if (Math.abs(vals[k] - base[i][k]) > 1e-5) {
          moving.add(i);
          break;
        }
      for (let k = 11; k < 14; k++)
        if (Math.abs(vals[k] - base[i][k]) > 1e-5) {
          live.add(i);
          break;
        }
    });
  }
  // a surface that changes is live wherever it is used
  const liveMats = new Set([...live].map((i) => (nodes[i] as THREE.Mesh).material));
  nodes.forEach((o, i) => {
    if (liveMats.has((o as THREE.Mesh).material)) live.add(i);
  });
  return { moving, live };
}

/** Meshes that may share one merged mesh: the same kind of surface, lit the same way; `null` for what never merges. */
function signature(m: THREE.Material) {
  const b = m as THREE.MeshBasicMaterial;
  if (b.map || b.vertexColors) return null;
  const common = [m.transparent, m.opacity.toFixed(3), m.side, m.depthWrite, m.blending].join('|');
  if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
    const s = m as THREE.MeshStandardMaterial;
    return ['S', s.roughness, s.metalness, s.flatShading, s.emissive.getHex(), common].join('|');
  }
  if (b.isMeshBasicMaterial) return ['B', common].join('|');
  return null;
}

/** A merged mesh's surface: `like`, its colour taken from the vertices. */
function painted(like: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial) {
  const m = like.clone();
  m.vertexColors = true;
  m.color.set(0xffffff);
  return m;
}
