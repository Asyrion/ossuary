/* What the recipes of the bosses that fight share (tools/creatures/tiger.ts, abbess.ts, ...): eased keys, turns in the
   creature's frame (x its left-right, y up, z forward), a step cycle, rearing about the hind hips, and clips taken from
   Tripo's own preset animations (a biped's idle, walk, slash, hurt) and replayed on the rig the recipe poses. */
import * as THREE from 'three';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import type { Rig } from '../creatureRig';

export const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
/** A value through keys [time, value], eased in and out between them, or only in (`'in'`: gathering speed, a blow). */
export function keys(t: number, ks: [number, number, 'in'?][]) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++)
    if (t <= ks[i][0]) {
      const [t0, a] = ks[i - 1],
        [t1, b, ease] = ks[i],
        u = (t - t0) / (t1 - t0);
      return a + (b - a) * (ease === 'in' ? u * u * u : smooth(u));
    }
  return ks[ks.length - 1][1];
}
// nose up is a turn about +x by a negative angle; a turn about +y swings the nose to +x
export const pitchUp = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [1, 0, 0], -deg);
export const yaw = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 1, 0], deg);
export const roll = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 0, 1], deg);

/** The whole body pitched nose up by `deg` about the point `hip` (it rears on its hind legs, which stay where they are):
    `bone` turned at its joint and moved back so `hip` stays put. */
export function rearAbout(rig: Rig, bone: string, hip: THREE.Vector3, deg: number) {
  if (!deg) return;
  const j = rig.at(bone);
  pitchUp(rig, bone, deg);
  rig.update();
  const a = (-deg * Math.PI) / 180,
    dy = hip.y - j.y,
    dz = hip.z - j.z;
  const ny = dy * Math.cos(a) - dz * Math.sin(a),
    nz = dy * Math.sin(a) + dz * Math.cos(a);
  rig.move(bone, [0, dy - ny, dz - nz]);
}

/** A step cycle: where a foot is (forward `z`, up `y`) and how its paw tips (`pitch`), a share `p` of the way round, down
    for `stance` of it while the body passes over, then lifted `lift` and swung forward. */
export function stepAt(p: number, stance: number, stride: number, lift: number, fold = 12) {
  if (p < stance) {
    const u = p / stance;
    return {
      z: stride / 2 - stride * u,
      y: u > 0.8 ? 0.012 * ((u - 0.8) / 0.2) ** 2 : 0,
      pitch: u > 0.8 ? (-fold * (u - 0.8)) / 0.2 : 0,
    };
  }
  const s = (p - stance) / (1 - stance);
  return {
    z: -stride / 2 + stride * (s - Math.sin(2 * Math.PI * s) / (2 * Math.PI)),
    y: lift * Math.sin(Math.PI * s),
    pitch: -fold * (1 - s) - fold * 1.5 * Math.sin(Math.PI * s),
  };
}
/** When each paw comes down in a step cycle (its stance begins), for the footsteps. */
export const pawfalls = (phase: Record<string, number>, cycle: number, front = 'pawFront', rear = 'pawRear') =>
  Object.entries(phase).map(([leg, off]) => ({
    t: (off % 1) * cycle,
    sound: leg.startsWith('front') ? front : rear,
    at: leg,
  }));

/** A Tripo preset animation (a biped's idle, walk, slash or hurt, fetched for the same rig as the model), read once: each
    bone's local rotation over time, and the hips' place. */
export interface Preset {
  duration: number;
  /** How far bone `bone` goes from the clip's start to its end (a walk's hips: its stride over the cycle). */
  travel(bone: string): number;
  sample(rig: Rig, t: number, o?: PresetUse): void;
}
/** How a preset is replayed: the bone at the top of the skeleton turned `face` degrees as the model was (faceForward), the
    hips' travel along the way it walks dropped (`inPlace`: the game moves it), and bones left out (`skip`). */
export interface PresetUse {
  face?: number;
  top?: string;
  hips?: string;
  inPlace?: boolean;
  skip?: (name: string) => boolean;
  weight?: number;
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
export async function preset(file: string): Promise<Preset> {
  const doc = await io.read(file),
    anim = doc.getRoot().listAnimations()[0];
  const tracks: { bone: string; path: string; times: Float32Array; values: Float32Array }[] = [];
  let duration = 0;
  for (const c of anim.listChannels()) {
    const s = c.getSampler()!,
      times = s.getInput()!.getArray() as Float32Array,
      values = s.getOutput()!.getArray() as Float32Array,
      path = c.getTargetPath()!;
    if (path === 'scale') continue;
    duration = Math.max(duration, times[times.length - 1]);
    tracks.push({ bone: c.getTargetNode()!.getName(), path, times, values });
  }
  const q = new THREE.Quaternion(),
    q2 = new THREE.Quaternion(),
    p = new THREE.Vector3(),
    p2 = new THREE.Vector3();
  type Track = (typeof tracks)[number];
  /** The keys either side of `t` and how far between them. */
  const span = ({ times }: Track, t: number) => {
    let i = 0;
    while (i < times.length - 1 && times[i + 1] < t) i++;
    const j = Math.min(i + 1, times.length - 1);
    return { i, j, u: j === i ? 0 : THREE.MathUtils.clamp((t - times[i]) / (times[j] - times[i]), 0, 1) };
  };
  const rotAt = (tr: Track, t: number) => {
    const { i, j, u } = span(tr, t);
    return q.fromArray(tr.values, i * 4).slerp(q2.fromArray(tr.values, j * 4), u);
  };
  const posAt = (tr: Track, t: number) => {
    const { i, j, u } = span(tr, t);
    return p.fromArray(tr.values, i * 3).lerp(p2.fromArray(tr.values, j * 3), u);
  };
  // the hips' travel over the whole clip, so a walk is replayed in place
  const first = new Map<string, THREE.Vector3>(),
    last = new Map<string, THREE.Vector3>();
  for (const tr of tracks)
    if (tr.path === 'translation') {
      first.set(tr.bone, posAt(tr, 0).clone());
      last.set(tr.bone, posAt(tr, duration).clone());
    }
  const turn = new THREE.Quaternion(),
    wq = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  return {
    duration,
    travel: (bone) => (first.has(bone) ? first.get(bone)!.distanceTo(last.get(bone)!) : 0),
    sample(rig, t, o = {}) {
      const w = o.weight ?? 1;
      turn.setFromAxisAngle(up, THREE.MathUtils.degToRad(o.face ?? 0));
      for (const tr of tracks) {
        if (o.skip?.(tr.bone) || !rig.bones.has(tr.bone)) continue;
        const b = rig.bone(tr.bone);
        if (tr.path === 'rotation') {
          wq.copy(rotAt(tr, t));
          if (tr.bone === o.top) wq.premultiply(turn);
          b.quaternion.slerp(wq, w);
        } else if (tr.bone === o.hips || tr.bone === o.top) {
          const v = posAt(tr, t).clone();
          if (o.inPlace && tr.bone === o.hips) {
            // (its travel along the clip taken out, a straight line from where it starts to where it ends)
            const a = first.get(tr.bone)!,
              z = last.get(tr.bone)!,
              k = t / Math.max(duration, 1e-3);
            v.addScaledVector(z.clone().sub(a), -k);
          }
          if (tr.bone === o.top) v.applyQuaternion(turn);
          b.position.lerp(v, w);
        }
      }
      rig.update();
    },
  };
}
