/* Costumes: pieces that artifacts put on the mage (costumeData.ts says which show), fitted to whatever model is
   loaded. Each part hangs from a bone of the rig, so it follows every clip; it is fitted once, in the rig's rest
   pose, to the part of the body it covers (the head and hair that the head bone moves, the chest and shoulders).
   A static model (no rig) wears its pieces on the model itself, fitted to the top of its silhouette.
   Placeholder shapes until costume pieces come from Tripo (docs/assets.md). */
import * as THREE from 'three';
import { player } from '../state';
import { artifact } from '../items/artifactData';
import { wornPieces, type CostumeId } from './costumeData';

/** Where a part hangs: a bone (or the model itself) and that bone's rest pose in the model's frame. */
interface Anchor { parent: THREE.Object3D; rest: THREE.Matrix4 }
/** A model measured in its rest pose, in the frame of the holder that prepareHero made (hero units, feet at 0,
    facing +z). */
interface Fit {
  head: { box: THREE.Box3; centre: THREE.Vector3; radii: THREE.Vector3 }; headAt: Anchor;
  chest: THREE.Box3; chestAt: Anchor;
}

const wool = new THREE.MeshStandardMaterial({ color: 0x4e1a25, roughness: 1, emissive: 0x140508 });
const lining = new THREE.MeshStandardMaterial({ color: 0x2a1014, roughness: 1, side: THREE.BackSide });
const trim = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .8, emissive: 0x140e06 });

let model: THREE.Object3D | null = null, fit: Fit | null = null;
const worn = new Map<CostumeId, THREE.Object3D[]>();

/** A new model: measure it (in its rest pose, so before any clip plays) and put on what the mage wears. */
export function fitCostumes(holder: THREE.Object3D) {
  for (const id of [...worn.keys()]) takeOff(id);
  model = holder; fit = measure(holder); dress();
}

/** Put on the pieces the mage's artifacts call for, and take off those they no longer do. */
export function dress() {
  if (!model || !fit) return;
  const want = wornPieces([player.focus, ...player.items].map(id => artifact(id).costume));
  for (const id of [...worn.keys()]) if (!want.includes(id)) takeOff(id);
  for (const id of want) if (!worn.has(id)) worn.set(id, BUILD[id](fit));
}

/** The pieces the mage wears now (for the dev hooks and tests). */
export const wornNow = () => [...worn.keys()];

function takeOff(id: CostumeId) {
  for (const part of worn.get(id) ?? []) {
    part.removeFromParent();
    part.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
  }
  worn.delete(id);
}

/* ---------- measuring ---------- */

const boneNamed = (root: THREE.Object3D, re: RegExp) => {
  let found: THREE.Object3D | null = null;
  root.traverse(o => { if (!found && (o as THREE.Bone).isBone && re.test(o.name)) found = o; });
  return found as THREE.Object3D | null;
};

function measure(holder: THREE.Object3D): Fit {
  holder.updateMatrixWorld(true);
  const toHolder = holder.matrixWorld.clone().invert();
  const headBone = boneNamed(holder, /head$/i);
  const chestBone = boneNamed(holder, /(spine2|upperchest|chest)$/i) ?? headBone?.parent?.parent ?? null;
  const anchor = (bone: THREE.Object3D | null): Anchor => bone
    ? { parent: bone, rest: toHolder.clone().multiply(bone.matrixWorld) }
    : { parent: holder, rest: new THREE.Matrix4() };
  // the bones whose vertices make up the head (and hair), and the chest and shoulders
  const headSet = new Set<THREE.Object3D>(), chestSet = new Set<THREE.Object3D>();
  headBone?.traverse(o => headSet.add(o));
  if (chestBone) { chestSet.add(chestBone); for (const c of chestBone.children) if (/neck|shoulder|clavicle/i.test(c.name)) chestSet.add(c); }
  const headPts: THREE.Vector3[] = [], chest = new THREE.Box3(), all = new THREE.Box3();
  const v = new THREE.Vector3();
  holder.traverse(o => {
    const mesh = o as THREE.SkinnedMesh; if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
    const bones = mesh.isSkinnedMesh ? mesh.skeleton.bones : null;
    for (let i = 0; i < pos.count; i++) {
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld).applyMatrix4(toHolder); all.expandByPoint(v);
      if (!bones || !si || !sw) continue;
      let best = 0; for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
      const bone = bones[si.getComponent(i, best)];
      if (headSet.has(bone)) headPts.push(v.clone()); else if (chestSet.has(bone)) chest.expandByPoint(v);
    }
  });
  const size = all.getSize(new THREE.Vector3());
  if (headPts.length < 20) { // no rig, or no head bone: the head is the top of the silhouette (chibi heads are big)
    headPts.length = 0;
    const top = all.clone(); top.min.y = all.max.y - size.y * .38;
    const c = top.getCenter(new THREE.Vector3()), h = top.getSize(new THREE.Vector3()).multiplyScalar(.5);
    for (let k = 0; k < 64; k++) headPts.push(new THREE.Vector3(c.x + h.x * Math.cos(k * .7), c.y + h.y * Math.sin(k * 1.3), c.z + h.z * Math.sin(k * .7)));
  }
  if (chest.isEmpty()) { chest.copy(all); chest.max.y = all.max.y - size.y * .38; chest.min.y = chest.max.y - size.y * .2; }
  const box = new THREE.Box3().setFromPoints(headPts), centre = box.getCenter(new THREE.Vector3());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(.5);
  // grow the ellipsoid inside the head's box until nearly all of the head (spiky hair too) is inside it
  const d = headPts.map(p => Math.hypot((p.x - centre.x) / half.x, (p.y - centre.y) / half.y, (p.z - centre.z) / half.z)).sort((a, b) => a - b);
  const k = Math.max(1, d[Math.floor(d.length * .96)]) * 1.04;
  return { head: { box, centre, radii: half.multiplyScalar(k) }, headAt: anchor(headBone), chest, chestAt: anchor(chestBone) };
}

/* ---------- pieces ---------- */

/** Hang a part built in the model's frame from an anchor, so that it sits where it was built in the rest pose. */
function hang(at: Anchor, part: THREE.Object3D) {
  at.rest.clone().invert().decompose(part.position, part.quaternion, part.scale);
  at.parent.add(part); return part;
}

const shell = (geo: THREE.BufferGeometry) => {
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, wool), new THREE.Mesh(geo, lining)); return g;
};

/** Geometry in the unit sphere's frame, moved onto the head's ellipsoid. */
const onHead = (geo: THREE.BufferGeometry, f: Fit) => {
  const { centre, radii } = f.head;
  geo.scale(radii.x, radii.y, radii.z); geo.translate(centre.x, centre.y, centre.z); geo.computeVertexNormals(); return geo;
};

const BUILD: Record<CostumeId, (f: Fit) => THREE.Object3D[]> = {
  /** A pilgrim's hood: a cowl round the head, open at the face, with a long tail down the back (a liripipe),
      and a short dagged mantle over the shoulders. */
  hood(f) {
    const open = .8 * Math.PI, edge = .4 * Math.PI, low = .8 * Math.PI; // face opening; where the cap ends; the cowl's hem
    // the cowl: a cap and a skirt round the head, drawn up into a soft peak at the back and falling in folds
    const peak = new THREE.Vector3(0, .75, -.66).normalize(), n = new THREE.Vector3();
    const drape = (geo: THREE.BufferGeometry) => {
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        n.fromBufferAttribute(pos, k).normalize();
        const theta = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1));
        const fold = theta > edge ? .045 * Math.sin(Math.atan2(n.z, n.x) * 9) * Math.min(1, (theta - edge) / .3) : 0;
        n.multiplyScalar(1 + .45 * Math.max(0, n.dot(peak)) ** 6 + fold);
        pos.setXYZ(k, n.x, n.y, n.z);
      }
      return geo;
    };
    const cowl = new THREE.Group();
    cowl.add(shell(onHead(drape(new THREE.SphereGeometry(1, 32, 10, 0, Math.PI * 2, 0, edge)), f)));
    cowl.add(shell(onHead(drape(new THREE.SphereGeometry(1, 32, 8, Math.PI / 2 + open / 2, Math.PI * 2 - open, edge, low - edge)), f)));
    // a rolled edge round the face opening: up one side, across the brow, down the other
    const onSphere = (phi: number, theta: number) => new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
    const a0 = Math.PI / 2 - open / 2, a1 = Math.PI / 2 + open / 2, rimPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 4; i++) rimPts.push(onSphere(a0, low - (low - edge) * i / 4));
    for (let i = 1; i < 8; i++) rimPts.push(onSphere(a0 + (a1 - a0) * i / 8, edge));
    for (let i = 0; i <= 4; i++) rimPts.push(onSphere(a1, edge + (low - edge) * i / 4));
    cowl.add(new THREE.Mesh(onHead(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts), 40, .06, 5, false), f), trim));
    // the tail (a liripipe), hanging down the back and tapering
    const path = new THREE.CatmullRomCurve3([[0, .55, -.8], [0, .1, -1.06], [0, -.4, -1.12], [0, -.95, -1.02]].map(p => new THREE.Vector3(...p)));
    const tail = new THREE.TubeGeometry(path, 12, .22, 8, false);
    const tp = tail.attributes.position, c = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i <= 12; i++) {
      path.getPointAt(i / 12, c);
      for (let j = 0; j <= 8; j++) { const k = i * 9 + j; p.fromBufferAttribute(tp, k).sub(c).multiplyScalar(1 - .85 * i / 12).add(c); tp.setXYZ(k, p.x, p.y, p.z); }
    }
    cowl.add(shell(onHead(tail, f)));
    // the mantle: a cone round the neck, flaring over the shoulders, with a dagged hem
    const { box } = f.head, ch = f.chest, cc = ch.getCenter(new THREE.Vector3()), cs = ch.getSize(new THREE.Vector3());
    const top = box.min.y + (box.max.y - box.min.y) * .12, bottom = Math.min(top - .12, cc.y - cs.y * .15);
    const mantle = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), mp = mantle.attributes.position;
    for (let k = 0; k < mp.count; k++) {
      const up = mp.getY(k) > 0, a = Math.atan2(mp.getZ(k), mp.getX(k)), tooth = (k % 2) * .05;
      const rx = up ? f.head.radii.x * .55 : Math.max(cs.x * .5, f.head.radii.x * .8) * 1.08, rz = up ? f.head.radii.z * .5 : Math.max(cs.z * .5, f.head.radii.z * .6) * 1.25;
      mp.setXYZ(k, cc.x + rx * Math.cos(a), up ? top : bottom - tooth, cc.z + rz * Math.sin(a));
    }
    mantle.computeVertexNormals();
    return [hang(f.headAt, cowl), hang(f.chestAt, shell(mantle))];
  },
};
