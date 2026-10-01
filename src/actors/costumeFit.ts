/* Fitting costumes to a model (M4.6, actors/costume.ts): the model measured once in its rig's rest pose (the head and its
   ellipsoid, the chest, the hips, the hands and forearms, the feet), the anchors parts hang from, and which hand casts. */
import * as THREE from 'three';
import { castHandName } from './heroAnim';

/** Where a part hangs: a bone (or the model itself) and that bone's rest pose in the model's frame. */
export interface Anchor { parent: THREE.Object3D; rest: THREE.Matrix4 }
export type Side = 'L' | 'R';
/** A model measured in its rest pose, in the frame of the holder that prepareHero made (hero units, feet at 0, facing +z;
    the mage's left is +x). */
export interface Fit {
  head: { box: THREE.Box3; centre: THREE.Vector3; radii: THREE.Vector3 }; headAt: Anchor;
  chest: THREE.Box3; chestAt: Anchor;
  hips: THREE.Box3; hipsAt: Anchor;
  /** Each hand: its anchor, where it is at rest, its bone (the focus follows it), and where its forearm is (a wrist's axis). */
  hand: Record<Side, { at: Anchor; pos: THREE.Vector3; bone: THREE.Object3D | null; fore: THREE.Vector3 }>;
  foot: Record<Side, { at: Anchor; pos: THREE.Vector3; box: THREE.Box3 }>;
  all: THREE.Box3;
}

/** The side of the hand the cast clip thrusts (the right if it can't tell). */
export const castSide = (): Side => /left/i.test(castHandName()) ? 'L' : 'R';
/** The other hand: wrists and rings go there, and the belt hangs on that side. */
export const offSide = (): Side => castSide() === 'R' ? 'L' : 'R';
export const sideX = (s: Side) => s === 'L' ? 1 : -1;

/* ---------- measuring ---------- */

const boneNamed = (root: THREE.Object3D, re: RegExp) => {
  let found: THREE.Object3D | null = null;
  root.traverse(o => { if (!found && (o as THREE.Bone).isBone && re.test(o.name)) found = o; });
  return found as THREE.Object3D | null;
};

export function measure(holder: THREE.Object3D): Fit {
  holder.updateMatrixWorld(true);
  const toHolder = holder.matrixWorld.clone().invert();
  const headBone = boneNamed(holder, /head$/i);
  const chestBone = boneNamed(holder, /(spine2|upperchest|chest)$/i) ?? headBone?.parent?.parent ?? null;
  const hipsBone = boneNamed(holder, /hips$/i);
  const handBone = { L: boneNamed(holder, /lefthand$/i), R: boneNamed(holder, /righthand$/i) };
  const foreBone = { L: boneNamed(holder, /leftforearm$/i), R: boneNamed(holder, /rightforearm$/i) };
  const footBone = { L: boneNamed(holder, /leftfoot$/i), R: boneNamed(holder, /rightfoot$/i) };
  const anchor = (bone: THREE.Object3D | null): Anchor => bone
    ? { parent: bone, rest: toHolder.clone().multiply(bone.matrixWorld) }
    : { parent: holder, rest: new THREE.Matrix4() };
  const restPos = (bone: THREE.Object3D | null, fallback: THREE.Vector3) => bone ? bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(toHolder) : fallback;
  // the bones whose vertices make up the head (and hair), the chest and shoulders, the hips, and each foot
  const headSet = new Set<THREE.Object3D>(), chestSet = new Set<THREE.Object3D>(), hipSet = new Set<THREE.Object3D>();
  const footSet = { L: new Set<THREE.Object3D>(), R: new Set<THREE.Object3D>() };
  headBone?.traverse(o => headSet.add(o));
  if (chestBone) { chestSet.add(chestBone); for (const c of chestBone.children) if (/neck|shoulder|clavicle/i.test(c.name)) chestSet.add(c); }
  if (hipsBone) { hipSet.add(hipsBone); for (const c of hipsBone.children) if (/spine$/i.test(c.name)) hipSet.add(c); }
  for (const s of ['L', 'R'] as Side[]) footBone[s]?.traverse(o => footSet[s].add(o));
  const headPts: THREE.Vector3[] = [], chest = new THREE.Box3(), hips = new THREE.Box3(), all = new THREE.Box3();
  const feet = { L: new THREE.Box3(), R: new THREE.Box3() };
  const p = new THREE.Vector3();
  holder.traverse(o => {
    const mesh = o as THREE.SkinnedMesh; if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
    const bones = mesh.isSkinnedMesh ? mesh.skeleton.bones : null;
    for (let i = 0; i < pos.count; i++) {
      mesh.getVertexPosition(i, p); p.applyMatrix4(mesh.matrixWorld).applyMatrix4(toHolder); all.expandByPoint(p);
      if (!bones || !si || !sw) continue;
      let best = 0; for (let k = 1; k < 4; k++) if (sw.getComponent(i, k) > sw.getComponent(i, best)) best = k;
      const bone = bones[si.getComponent(i, best)];
      if (headSet.has(bone)) headPts.push(p.clone()); else if (chestSet.has(bone)) chest.expandByPoint(p);
      else if (hipSet.has(bone)) hips.expandByPoint(p);
      else if (footSet.L.has(bone)) feet.L.expandByPoint(p); else if (footSet.R.has(bone)) feet.R.expandByPoint(p);
    }
  });
  const size = all.getSize(new THREE.Vector3()), mid = all.getCenter(new THREE.Vector3());
  if (headPts.length < 20) { // no rig, or no head bone: the head is the top of the silhouette (chibi heads are big)
    headPts.length = 0;
    const top = all.clone(); top.min.y = all.max.y - size.y * .38;
    const c = top.getCenter(new THREE.Vector3()), h = top.getSize(new THREE.Vector3()).multiplyScalar(.5);
    for (let k = 0; k < 64; k++) headPts.push(new THREE.Vector3(c.x + h.x * Math.cos(k * .7), c.y + h.y * Math.sin(k * 1.3), c.z + h.z * Math.sin(k * .7)));
  }
  if (chest.isEmpty()) { chest.copy(all); chest.max.y = all.max.y - size.y * .38; chest.min.y = chest.max.y - size.y * .2; }
  if (hips.isEmpty()) { hips.copy(all); hips.max.y = all.min.y + size.y * .52; hips.min.y = all.min.y + size.y * .36; hips.min.x = mid.x - size.x * .2; hips.max.x = mid.x + size.x * .2; }
  for (const s of ['L', 'R'] as Side[]) if (feet[s].isEmpty()) feet[s].setFromCenterAndSize(new THREE.Vector3(mid.x + sideX(s) * size.x * .12, all.min.y + .05, mid.z), new THREE.Vector3(.14, .1, .24));
  const box = new THREE.Box3().setFromPoints(headPts), centre = box.getCenter(new THREE.Vector3());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(.5);
  // grow the ellipsoid inside the head's box until nearly all of the head (spiky hair too) is inside it
  const d = headPts.map(q => Math.hypot((q.x - centre.x) / half.x, (q.y - centre.y) / half.y, (q.z - centre.z) / half.z)).sort((a, b) => a - b);
  const k = Math.max(1, d[Math.floor(d.length * .96)]) * 1.04;
  const handGuess = (s: Side) => new THREE.Vector3(mid.x + sideX(s) * size.x * .3, all.min.y + size.y * .45, mid.z + .05);
  return {
    head: { box, centre, radii: half.multiplyScalar(k) }, headAt: anchor(headBone), chest, chestAt: anchor(chestBone), hips, hipsAt: anchor(hipsBone ?? chestBone),
    hand: Object.fromEntries((['L', 'R'] as Side[]).map(s => { const pos = restPos(handBone[s], handGuess(s)); return [s, { at: anchor(handBone[s]), pos, bone: handBone[s], fore: restPos(foreBone[s], pos.clone().add(new THREE.Vector3(0, .2, 0))) }]; })) as Fit['hand'],
    foot: { L: { at: anchor(footBone.L), pos: restPos(footBone.L, feet.L.getCenter(new THREE.Vector3())), box: feet.L }, R: { at: anchor(footBone.R), pos: restPos(footBone.R, feet.R.getCenter(new THREE.Vector3())), box: feet.R } },
    all,
  };
}

/** Hang a part built in the model's frame from an anchor, so that it sits where it was built in the rest pose. */
export function hang(at: Anchor, part: THREE.Object3D) {
  at.rest.clone().invert().decompose(part.position, part.quaternion, part.scale);
  at.parent.add(part); return part;
}

/** Geometry in the unit sphere's frame, moved onto the head's ellipsoid. */
export const onHead = (geo: THREE.BufferGeometry, f: Fit) => {
  const { centre, radii } = f.head;
  geo.scale(radii.x, radii.y, radii.z); geo.translate(centre.x, centre.y, centre.z); geo.computeVertexNormals(); return geo;
};
