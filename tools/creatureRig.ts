/* Animating a rigged model in code (docs/creatures.md): a Tripo GLB's skeleton rebuilt in three.js math, so a creature's
   recipe (tools/creatures/*.ts) can pose it: turn and move bones in the creature's own frame (x its left-right, y up, z
   forward), and set each leg's paw where it should be with two-bone IK (the paw stays planted while the body moves).
   Each frame of a clip is posed from rest and its bones' local rotations recorded; `bake` writes them into the GLB as
   glTF animations any engine can play. `reskin` gives the mesh new weights from the bones' segments when the rig's own
   are unusable (Tripo's auto-rig bound each vertex to one bone, half of them to one that never moves). */
import * as THREE from 'three';
import type { Document, Node as GNode } from '@gltf-transform/core';

export type V3 = [number, number, number];
const v = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);

/** A leg for the IK: the joint it swings from, the knee or elbow, the ankle or wrist whose place is set, and the paw
    bones below it (kept flat to the ground unless the recipe tips them), and the toes under those (kept as they lay at
    rest, tipped only by their own pitch: a hind foot's toes stay flat while its upright foot is tipped). */
export interface LegDef {
  root: string;
  mid: string;
  end: string;
  paw?: string[];
  toes?: string[];
}

export class Rig {
  readonly root = new THREE.Object3D();
  readonly bones = new Map<string, THREE.Object3D>();
  private rest = new Map<string, { q: THREE.Quaternion; p: THREE.Vector3 }>();
  private legs = new Map<
    string,
    LegDef & { pole: THREE.Vector3; foot: THREE.Vector3; pawWorld: THREE.Quaternion[]; toesWorld: THREE.Quaternion[] }
  >();

  constructor(doc: Document) {
    const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
    const build = (n: GNode, parent: THREE.Object3D) => {
      const o = new THREE.Object3D();
      o.name = n.getName();
      o.position.fromArray(n.getTranslation());
      o.quaternion.fromArray(n.getRotation());
      o.scale.fromArray(n.getScale());
      parent.add(o);
      this.bones.set(o.name, o);
      this.rest.set(o.name, { q: o.quaternion.clone(), p: o.position.clone() });
      for (const c of n.listChildren()) build(c, o);
    };
    for (const n of scene.listChildren()) build(n, this.root);
    this.root.updateMatrixWorld(true);
  }
  bone(name: string) {
    const b = this.bones.get(name);
    if (!b) throw new Error(`no bone "${name}"`);
    return b;
  }
  /** Where a bone's joint is, in the creature's frame (world, the rest pose unmoved). */
  at(name: string) {
    return this.bone(name).getWorldPosition(new THREE.Vector3());
  }
  /** Back to the rest pose. */
  reset() {
    for (const [n, r] of this.rest) {
      const b = this.bones.get(n)!;
      b.quaternion.copy(r.q);
      b.position.copy(r.p);
    }
    this.root.updateMatrixWorld(true);
  }
  update() {
    this.root.updateMatrixWorld(true);
  }

  /** Turn a bone about an axis of the creature's frame, at its joint, by `deg`. */
  turn(name: string, axis: readonly number[], deg: number) {
    if (!deg) return;
    const b = this.bone(name),
      wq = b.getWorldQuaternion(new THREE.Quaternion());
    const turn = new THREE.Quaternion().setFromAxisAngle(v(axis).normalize(), THREE.MathUtils.degToRad(deg));
    this.setWorldQuat(b, turn.multiply(wq));
  }
  /** Move a bone (and all under it) by `d` in the creature's frame. */
  move(name: string, d: readonly number[]) {
    const b = this.bone(name),
      p = b.parent!;
    this.update();
    const world = b.getWorldPosition(new THREE.Vector3()).add(v(d));
    b.position.copy(p.worldToLocal(world));
    this.update();
  }
  private setWorldQuat(b: THREE.Object3D, wq: THREE.Quaternion) {
    const pq = b.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
    b.quaternion.copy(pq.multiply(wq));
    b.updateMatrixWorld(true);
  }
  /** Turn bone `name` so the joint of `child` (a bone or node under it) lies along `dir` from its own joint, the shortest
      way round from where it is (a wing's bones laid along the ways a pose gives them). */
  point(name: string, child: string, dir: readonly number[]) {
    this.update();
    const b = this.bone(name),
      o = this.at(name);
    this.aim(b, this.at(child), o.clone().add(v(dir).normalize()));
    this.update();
  }
  /** Turn a bone so the direction from its joint to `from` points at `to` (both in the creature's frame). */
  private aim(b: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
    const o = b.getWorldPosition(new THREE.Vector3());
    const q = new THREE.Quaternion().setFromUnitVectors(from.clone().sub(o).normalize(), to.clone().sub(o).normalize());
    this.setWorldQuat(b, q.multiply(b.getWorldQuaternion(new THREE.Quaternion())));
  }

  /** Register a leg for the IK (from the rest pose): its bend's side and where its paw stands. */
  leg(id: string, def: LegDef) {
    this.reset();
    const r = this.at(def.root),
      m = this.at(def.mid),
      e = this.at(def.end);
    const line = e.clone().sub(r).normalize(),
      pole = m.clone().sub(r);
    pole.sub(line.multiplyScalar(pole.dot(line))).normalize();
    // (the pole in the frame of the root's parent, so it turns with the body)
    const pinv = this.bone(def.root).parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
    this.legs.set(id, {
      ...def,
      pole: pole.applyQuaternion(pinv),
      foot: e,
      pawWorld: (def.paw ?? []).map((n) => this.bone(n).getWorldQuaternion(new THREE.Quaternion())),
      toesWorld: (def.toes ?? []).map((n) => this.bone(n).getWorldQuaternion(new THREE.Quaternion())),
    });
  }
  /** Where a leg's ankle or wrist stands at rest. */
  foot(id: string) {
    return this.legs.get(id)!.foot.clone();
  }
  /** Put a leg's ankle or wrist at its rest place moved by `d` (two-bone IK, bending the way it bends at rest), then lay
      its paw as it lay at rest, tipped by `pitch` degrees about the creature's left-right axis (toes up is positive), and its
      toes as they lay at rest, tipped by `toePitch`; both turned by `turn` degrees about the vertical (a body turned round
      on the spot, its feet turned with it). */
  place(id: string, d: readonly number[], pitch = 0, toePitch = 0, turn = 0) {
    const L = this.legs.get(id)!;
    this.update();
    const root = this.bone(L.root),
      mid = this.bone(L.mid);
    const R = this.at(L.root),
      M = this.at(L.mid),
      E = this.at(L.end),
      T = L.foot.clone().add(v(d));
    const a = M.distanceTo(R),
      b = E.distanceTo(M),
      want = T.clone().sub(R),
      dist = THREE.MathUtils.clamp(want.length(), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    const dir = want.normalize();
    const pole = L.pole.clone().applyQuaternion(root.parent!.getWorldQuaternion(new THREE.Quaternion()));
    pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const cosA = (a * a + dist * dist - b * b) / (2 * a * dist),
      sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const midTo = R.clone()
      .add(dir.clone().multiplyScalar(a * cosA))
      .add(pole.multiplyScalar(a * sinA));
    this.aim(root, M, midTo);
    this.update();
    this.aim(mid, this.at(L.end), R.clone().add(dir.multiplyScalar(dist)));
    this.update();
    const round = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(turn));
    const tip = round
      .clone()
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(-pitch)));
    (L.paw ?? []).forEach((n, i) => {
      this.setWorldQuat(this.bone(n), tip.clone().multiply(L.pawWorld[i]));
      this.update();
    });
    const toeTip = round
      .clone()
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(-toePitch)),
      );
    (L.toes ?? []).forEach((n, i) => {
      this.setWorldQuat(this.bone(n), toeTip.clone().multiply(L.toesWorld[i]));
      this.update();
    });
  }

  /** The local rotations (and positions) of `names` now. */
  snapshot(names: readonly string[]) {
    return names.map((n) => {
      const b = this.bone(n);
      return { q: b.quaternion.toArray(), p: b.position.toArray() };
    });
  }
}

/** Turn a model about the vertical by `deg` before anything reads it, so it faces +z as the recipes and the game expect
    (Tripo set the owlbear facing +z, the dragonling facing +x): its vertices and normals, the joints at the top of its
    skeleton (the rest follow them) and every inverse bind matrix, so the skin binds as before in the new frame. */
export function faceForward(doc: Document, deg: number) {
  if (!deg) return;
  // (what it can't turn rightly it refuses: a top joint under a node turned on its own, whose frame the turn would miss,
  // and tangents, which a normal map would need turned with the normals)
  for (const skin of doc.getRoot().listSkins())
    for (const j of skin.listJoints())
      for (const p of j.listParents()) {
        if (skin.listJoints().includes(p as never) || !('getRotation' in p)) continue;
        const n = p as unknown as GNode,
          q = n.getRotation(),
          t = n.getTranslation(),
          sc = n.getScale();
        if (q[3] < 0.99999 || t.some((x) => Math.abs(x) > 1e-6) || sc.some((x) => Math.abs(x - 1) > 1e-6))
          throw new Error(
            `faceForward: "${j.getName()}" hangs from "${n.getName()}", which is turned or moved itself; turn that node instead`,
          );
      }
  if (
    doc
      .getRoot()
      .listMeshes()
      .some((m) => m.listPrimitives().some((p) => p.getAttribute('TANGENT')))
  )
    throw new Error('faceForward: the model has tangents, which it does not turn');
  const R = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(deg)),
    Rinv = R.clone().invert(),
    rq = new THREE.Quaternion().setFromRotationMatrix(R);
  const done = new Set<unknown>(),
    p = new THREE.Vector3(),
    m = new THREE.Matrix4();
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives())
      for (const [sem, dir] of [
        ['POSITION', false],
        ['NORMAL', true],
      ] as const) {
        const a = prim.getAttribute(sem);
        if (!a || done.has(a)) continue;
        done.add(a);
        for (let i = 0, e = [0, 0, 0]; i < a.getCount(); i++) {
          a.getElement(i, e);
          p.fromArray(e);
          if (dir) p.transformDirection(R);
          else p.applyMatrix4(R);
          a.setElement(i, p.toArray());
        }
      }
  for (const skin of doc.getRoot().listSkins()) {
    const joints = new Set(skin.listJoints());
    for (const j of joints)
      if (!j.listParents().some((n) => joints.has(n as never))) {
        // (a joint whose parent is no joint: the skeleton's top)
        const t = new THREE.Vector3().fromArray(j.getTranslation()).applyMatrix4(R),
          q = rq.clone().multiply(new THREE.Quaternion().fromArray(j.getRotation()));
        j.setTranslation(t.toArray());
        j.setRotation(q.toArray());
      }
    const ibm = skin.getInverseBindMatrices();
    if (!ibm || done.has(ibm)) continue;
    done.add(ibm);
    for (let i = 0, e: number[] = []; i < ibm.getCount(); i++) {
      m.fromArray(ibm.getElement(i, e)).multiply(Rinv);
      ibm.setElement(i, m.toArray());
    }
  }
}

/** A skeleton whose rest pose was lost (three townspeople came through an FBX converter with every joint's
    transform zeroed, their inverse bind matrices kept) rebuilt from its bind: each joint's world matrix is the inverse of
    its inverse bind matrix, and its local transform that, seen from its parent. The converter had also turned the mesh a
    quarter round after it was rigged, so the skeleton is turned to the mesh: its left hip (`left`, against `right`) to
    +x, the way the mesh faces +z, and its hips over the mesh's middle; its bind is written again to match, for a skin that
    is then bound again from the bones. Returns how many joints were set; none when the joints already stand apart. */
export function restFromBind(doc: Document, left = 'mixamorig:LeftUpLeg', right = 'mixamorig:RightUpLeg') {
  let set = 0;
  for (const skin of doc.getRoot().listSkins()) {
    const joints = skin.listJoints(),
      ibm = skin.getInverseBindMatrices();
    if (!ibm) continue;
    if (!joints.every((j) => j.getTranslation().every((x) => Math.abs(x) < 1e-6))) continue;
    const world = new Map(joints.map((j, i) => [j, new THREE.Matrix4().fromArray(ibm.getElement(i, [])).invert()]));
    const pos = (name: string) => {
      const j = joints.find((n) => n.getName() === name);
      return j ? new THREE.Vector3().setFromMatrixPosition(world.get(j)!) : null;
    };
    const l = pos(left),
      r = pos(right);
    if (l && r) {
      const d = l.clone().sub(r),
        turn = new THREE.Matrix4().makeRotationY(Math.atan2(d.z, d.x)); // (left hip to +x)
      // the mesh's middle across, which the hips are moved over
      const lo = new THREE.Vector3(1e9, 1e9, 1e9),
        hi = new THREE.Vector3(-1e9, -1e9, -1e9),
        q = new THREE.Vector3();
      for (const m of doc.getRoot().listMeshes())
        for (const p of m.listPrimitives()) {
          const a = p.getAttribute('POSITION')!;
          for (let i = 0, e = [0, 0, 0]; i < a.getCount(); i++) {
            q.fromArray(a.getElement(i, e));
            lo.min(q);
            hi.max(q);
          }
        }
      const hips = new THREE.Vector3().setFromMatrixPosition(world.get(joints[0])!).applyMatrix4(turn);
      const shift = new THREE.Matrix4().makeTranslation((lo.x + hi.x) / 2 - hips.x, 0, (lo.z + hi.z) / 2 - hips.z);
      for (const [j, m] of world) world.set(j, shift.clone().multiply(turn).multiply(m));
      joints.forEach((j, i) => ibm.setElement(i, world.get(j)!.clone().invert().toArray()));
    }
    for (const j of joints) {
      const parent = j.listParents().find((p) => world.has(p as never)) as GNode | undefined;
      const local = parent ? world.get(parent)!.clone().invert().multiply(world.get(j)!) : world.get(j)!.clone();
      const t = new THREE.Vector3(),
        q = new THREE.Quaternion(),
        sc = new THREE.Vector3();
      local.decompose(t, q, sc);
      j.setTranslation(t.toArray());
      j.setRotation(q.toArray());
      j.setScale([1, 1, 1]);
      set++;
    }
  }
  return set;
}

/** Which way a Mixamo skeleton faces: the degrees `faceForward` turns it so its left side lies along +x (it then faces +z). */
export function mixamoFacing(rig: Rig) {
  // (the hips and the shoulders together: a figure caught mid-stride turns its hips, one holding a prop out its shoulders)
  const across = (l: string, r: string) => rig.at(l).sub(rig.at(r)).setY(0).normalize();
  const d = across('mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg').add(
    across('mixamorig:LeftShoulder', 'mixamorig:RightShoulder'),
  );
  return Math.round(THREE.MathUtils.radToDeg(Math.atan2(d.z, d.x)));
}

/** A clip: how long it lasts, whether it loops, and the pose at time `t` (from rest each frame); its events are when
    its sounds play (a paw down, the roar; `loud` ones at the creature's roar's loudness, CFG.creatures). */
export interface ClipDef {
  duration: number;
  loop: boolean;
  pose(rig: Rig, t: number): void;
  events: { t: number; sound: string; at?: string; loud?: boolean }[];
}

/** Sample every clip at `fps` and write them into the document as glTF animations (rotations of the bones that move,
    and the translations of `moving`, the bones whose place changes). */
export function bake(doc: Document, rig: Rig, clips: Record<string, ClipDef>, moving: readonly string[], fps = 30) {
  const root = doc.getRoot(),
    buffer = root.listBuffers()[0];
  const nodes = new Map(root.listNodes().map((n) => [n.getName(), n]));
  const names = [...rig.bones.keys()].filter((n) => nodes.has(n));
  for (const anim of root.listAnimations()) anim.dispose();
  for (const [id, clip] of Object.entries(clips)) {
    const n = Math.max(2, Math.round(clip.duration * fps) + 1),
      times = new Float32Array(n),
      frames: ReturnType<Rig['snapshot']>[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * clip.duration;
      times[i] = t;
      rig.reset();
      clip.pose(rig, clip.loop ? t % clip.duration : t);
      rig.update();
      frames.push(rig.snapshot(names));
    }
    const anim = doc.createAnimation(id),
      input = doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buffer);
    names.forEach((name, k) => {
      const q0 = frames[0][k].q,
        still = frames.every((f) => f[k].q.every((x, j) => Math.abs(x - q0[j]) < 1e-5));
      const rest = nodes.get(name)!.getRotation(),
        atRest = still && q0.every((x, j) => Math.abs(x - rest[j]) < 1e-5);
      if (!atRest) {
        const out = new Float32Array(n * 4);
        frames.forEach((f, i) => {
          // (each quaternion on the same side as the last, so it never spins the long way)
          const q = f[k].q;
          if (i && q[0] * out[i * 4 - 4] + q[1] * out[i * 4 - 3] + q[2] * out[i * 4 - 2] + q[3] * out[i * 4 - 1] < 0)
            out.set(
              q.map((x) => -x),
              i * 4,
            );
          else out.set(q, i * 4);
        });
        const s = doc
          .createAnimationSampler()
          .setInput(input)
          .setOutput(doc.createAccessor().setType('VEC4').setArray(out).setBuffer(buffer))
          .setInterpolation('LINEAR');
        anim
          .addSampler(s)
          .addChannel(
            doc.createAnimationChannel().setTargetNode(nodes.get(name)!).setTargetPath('rotation').setSampler(s),
          );
      }
      if (moving.includes(name)) {
        const out = new Float32Array(n * 3);
        frames.forEach((f, i) => out.set(f[k].p, i * 3));
        const s = doc
          .createAnimationSampler()
          .setInput(input)
          .setOutput(doc.createAccessor().setType('VEC3').setArray(out).setBuffer(buffer))
          .setInterpolation('LINEAR');
        anim
          .addSampler(s)
          .addChannel(
            doc.createAnimationChannel().setTargetNode(nodes.get(name)!).setTargetPath('translation').setSampler(s),
          );
      }
    });
  }
  rig.reset();
}

/** A bone that bends the mesh: the segment it owns (from `from` to `to`, each a bone's joint or a point in the creature's
    frame) and where it may reach (`side`: only vertices on that side of the middle; `below`, `above`, `ahead`, `behind`:
    a height or depth it stays within). */
export interface SkinBone {
  bone: string;
  from: string | V3;
  to: string | V3;
  side?: 1 | -1;
  below?: number;
  above?: number;
  ahead?: number;
  behind?: number;
  reach?: number;
}

/** New skin weights for every skinned mesh: each vertex blended over the (up to three) nearest bone segments that may
    reach it, by the inverse fourth power of the distance, so joints bend smoothly and limbs keep to themselves.
    `override` claims vertices outright (a jaw's lower beak). With no `bones` (a rig whose weights hold: a model the
    EDA-ModelWebViewer has named and mended, as the Chameleon Wyvern), each vertex keeps its weights, those on a bone of
    `remap` moved to the bone it names (a head smeared over its jaw's bones given to the skull), and `override` claims its
    own. */
export function reskin(
  doc: Document,
  rig: Rig,
  bones: SkinBone[] | null,
  override?: (p: THREE.Vector3) => string | null,
  remap: Record<string, string> = {},
) {
  const pt = (x: string | V3) => (typeof x === 'string' ? rig.at(x) : v(x));
  const segs = (bones ?? []).map((b) => ({ ...b, a: pt(b.from), b: pt(b.to) }));
  const seg = new THREE.Line3(),
    close = new THREE.Vector3();
  let moved = 0;
  for (const skin of doc.getRoot().listSkins()) {
    const joints = skin.listJoints().map((j) => j.getName());
    const index = (name: string) => {
      const i = joints.indexOf(name);
      if (i < 0) throw new Error(`"${name}" is no joint of the skin`);
      return i;
    };
    for (const node of doc.getRoot().listNodes()) {
      if (node.getSkin() !== skin || !node.getMesh()) continue;
      for (const prim of node.getMesh()!.listPrimitives()) {
        const pos = prim.getAttribute('POSITION')!,
          count = pos.getCount();
        const J = new Uint16Array(count * 4),
          W = new Float32Array(count * 4),
          p = [0, 0, 0],
          P = new THREE.Vector3();
        const J0 = prim.getAttribute('JOINTS_0')!,
          W0 = prim.getAttribute('WEIGHTS_0')!,
          j0 = [0, 0, 0, 0],
          w0 = [0, 0, 0, 0];
        for (let i = 0; i < count; i++) {
          pos.getElement(i, p);
          P.fromArray(p);
          const own = override?.(P);
          if (own) {
            J[i * 4] = index(own);
            W[i * 4] = 1;
            moved++;
            continue;
          }
          if (!bones) {
            // (its own weights kept, moved off the bones remapped)
            J0.getElement(i, j0);
            W0.getElement(i, w0);
            const by = new Map<number, number>();
            for (let k = 0; k < 4; k++)
              if (w0[k] > 0) {
                const to = remap[joints[j0[k]]],
                  j = to ? index(to) : j0[k];
                by.set(j, (by.get(j) ?? 0) + w0[k]);
              }
            [...by]
              .sort((x, y) => y[1] - x[1])
              .slice(0, 4)
              .forEach(([j, w], k) => {
                J[i * 4 + k] = j;
                W[i * 4 + k] = w;
              });
            if (j0.some((j, k) => w0[k] > 0 && remap[joints[j]])) moved++;
            continue;
          }
          const scored: [number, number][] = [];
          for (const s of segs) {
            if (s.side && P.x * s.side < -0.015) continue;
            if (s.below !== undefined && P.y > s.below) continue;
            if (s.above !== undefined && P.y < s.above) continue;
            if (s.ahead !== undefined && P.z < s.ahead) continue;
            if (s.behind !== undefined && P.z > s.behind) continue;
            seg.set(s.a, s.b);
            seg.closestPointToPoint(P, true, close);
            const d = close.distanceTo(P) / (s.reach ?? 1);
            scored.push([index(s.bone), 1 / (d ** 4 + 1e-7)]);
          }
          scored.sort((x, y) => y[1] - x[1]);
          // (one bone may own several segments: sum them before taking the three strongest)
          const by = new Map<number, number>();
          for (const [j, w] of scored) by.set(j, (by.get(j) ?? 0) + w);
          const top = [...by].sort((x, y) => y[1] - x[1]).slice(0, 3),
            sum = top.reduce((a, [, w]) => a + w, 0);
          top.forEach(([j, w], k) => {
            J[i * 4 + k] = j;
            W[i * 4 + k] = w / sum;
          });
          moved++;
        }
        prim.getAttribute('JOINTS_0')!.setArray(J);
        prim.getAttribute('WEIGHTS_0')!.setArray(W);
      }
    }
  }
  return moved;
}
