/* The Drowned Abbess (a Tripo model; docs/creatures.md): floor 2's boss, a great pale axolotl with fans of gills about its
   head and gill streamers hanging to the floor. Tripo set it facing +x, so the tool turns it to face +z (`face`); in that
   frame (x left-right, y up, z forward) it lies low, its back about 0.15 high, from the tail's tip (z -0.45) to the snout
   (z 0.42). Tripo's quadruped rig carries the front of the body on its root (`tripo::Root`), with the head (`Head_0`, the
   skull `Head_1`), the forelegs and the spine running back (`Spine_0` to `Spine_3`, the hips on `Spine_2`, the hind legs
   under them) into the tail (`Tail_0` to `Tail_2`). The gills hang from the skull: two fans a side (bone_3 and bone_7 its
   left, bone_5 and bone_9 its right) and a streamer a side (bone_17 its left, `Head_2` its right). It has no jaw bone; its
   chin (bone_45) drops a little. Tripo bound the skin well enough to keep (`SKIN = null`). Read with
   `npm run animate-creature -- --bones --face=-90`. Every clip is made in code: idle, walk (it swims over the floor,
   its body and tail weaving), wail (it rears up with its gills flung wide), dive (it ducks under) and hit (a flinch,
   played over the others). */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';
import { keys, pitchUp, rearAbout, roll, stepAt, yaw } from './moves';

/** Turned this many degrees about the vertical before anything reads it: its snout from +x to +z. */
export const face = -90;

const ROOT = 'tripo::Root',
  NECK = 'tripo::Head_0',
  HEAD = 'tripo::Head_1',
  CHIN = 'bone_45',
  SPINE = ['tripo::Spine_0', 'tripo::Spine_1', 'tripo::Spine_2', 'tripo::Spine_3'],
  HIPS = 'tripo::Spine_2',
  TAIL = ['tripo::Tail_0', 'tripo::Tail_1', 'tripo::Tail_2'];
/** The gills: its fans (bone, side: +1 its left) and streamers. */
const FANS: [string, number][] = [
  ['bone_3', 1],
  ['bone_7', 1],
  ['bone_5', -1],
  ['bone_9', -1],
];
const TIPS: [string, number][] = [
  ['bone_4', 1],
  ['bone_8', 1],
  ['bone_6', -1],
  ['bone_10', -1],
];
const STREAMERS: [string, number][] = [
  ['bone_17', 1],
  ['tripo::Head_2', -1],
];

export const LEGS: Record<string, LegDef> = {
  frontLeft: { root: 'tripo::0_Left_Limb_0', mid: 'tripo::0_Left_Limb_1', end: 'tripo::0_Left_Limb_2' },
  frontRight: { root: 'tripo::0_Right_Limb_0', mid: 'tripo::0_Right_Limb_1', end: 'tripo::0_Right_Limb_2' },
  rearLeft: { root: 'tripo::1_Left_Limb_0', mid: 'tripo::1_Left_Limb_1', end: 'tripo::1_Left_Limb_2' },
  rearRight: { root: 'tripo::1_Right_Limb_0', mid: 'tripo::1_Right_Limb_1', end: 'tripo::1_Right_Limb_2' },
};
/** Tripo's own weights, kept: each gill and leg on its own bones. */
export const SKIN: SkinBone[] | null = null;
export const MOVING = [ROOT];

/** Its gills: the fans spread out (`flare`, degrees) and swept back (`sweep`), rippling (`flutter`); the streamers swung
    out (`swing`) and back (`trail`). */
function gills(rig: Rig, flare: number, sweep: number, flutter: number, t: number, swing = 0, trail = 0) {
  FANS.forEach(([b, side], i) => {
    roll(rig, b, -side * (flare + flutter * Math.sin(2 * Math.PI * 1.7 * t + i)));
    pitchUp(rig, b, -sweep);
  });
  TIPS.forEach(([b, side], i) =>
    roll(rig, b, -side * (flare * 0.5 + flutter * Math.sin(2 * Math.PI * 1.7 * t + i + 1))),
  );
  for (const [b, side] of STREAMERS) {
    roll(rig, b, -side * swing);
    pitchUp(rig, b, -trail);
  }
}
/** A wave along the spine and tail, `amp` degrees, `phase` round, growing to the tail's tip. */
function weave(rig: Rig, amp: number, a: number) {
  SPINE.forEach((b, i) => yaw(rig, b, amp * 0.25 * Math.sin(a - i * 0.7)));
  TAIL.forEach((b, i) => yaw(rig, b, amp * (0.6 + 0.3 * i) * Math.sin(a - 2.8 - i * 0.8)));
}

/** The walk: it swims over the floor, a slow salamander's trot (each foreleg with the hind leg across from it), its
    body bending side to side and the wave running out down its tail, its head steadied against it, its gills streaming. */
const WALK = { cycle: 1.2, stance: 0.55, stride: 0.11, lift: 0.035 };
const PHASE: Record<string, number> = { frontLeft: 0, rearRight: 0, frontRight: 0.5, rearLeft: 0.5 };
function walk(rig: Rig, t: number) {
  const W = WALK,
    f = t / W.cycle,
    a = 2 * Math.PI * f;
  rig.move(ROOT, [0, 0.004 * Math.cos(2 * a), 0]);
  yaw(rig, ROOT, 4 * Math.sin(a));
  weave(rig, 9, a);
  rig.update();
  for (const [leg, off] of Object.entries(PHASE)) {
    const s = stepAt((((f - off) % 1) + 1) % 1, W.stance, W.stride, W.lift, 0);
    rig.place(leg, [0, s.y, s.z]);
  }
  yaw(rig, NECK, -4 * Math.sin(a));
  pitchUp(rig, HEAD, 2 * Math.sin(2 * a));
  gills(rig, 4, 14, 6, t, 4, 16);
}

/** At rest: it breathes, its gills fanning slowly, its head turning, its tail curling. */
const IDLE = { duration: 4 };
function idle(rig: Rig, t: number) {
  const a = (2 * Math.PI * t) / IDLE.duration;
  rig.move(ROOT, [0, 0.003 * Math.sin(2 * a), 0]);
  weave(rig, 4, a);
  rig.update();
  for (const leg of Object.keys(LEGS)) rig.place(leg, [0, 0, 0]);
  yaw(rig, NECK, 9 * Math.sin(a));
  pitchUp(rig, HEAD, 3 * Math.sin(2 * a + 1));
  gills(rig, 3 + 3 * Math.sin(2 * a), 0, 5, t * 0.5, 4 * Math.sin(a), 0);
}

/** The wail: it draws back, rears up on its hind legs with its forelegs lifted, its head thrown back and its chin
    dropped, its gill fans flung wide and its streamers swung out, and trembles; risen by `at` (its shots go out then) and
    held there (the fight's volleys follow). */
const WAIL = { duration: 1, at: 0.6 };
function wail(rig: Rig, t: number) {
  const up = keys(t, [
      [0, 0],
      [0.15, -0.15],
      [0.6, 1],
    ]),
    shake = t > 0.45 ? Math.min(1, (t - 0.45) / 0.15) : 0;
  const hip = rig.at(HIPS);
  rearAbout(rig, ROOT, hip, 24 * up);
  rig.update();
  pitchUp(rig, HIPS, -24 * Math.max(0, up)); // (its hips and tail stay on the floor)
  rig.update();
  for (const leg of ['rearLeft', 'rearRight']) rig.place(leg, [0, 0, 0]);
  const lift = Math.max(0, up);
  for (const leg of ['frontLeft', 'frontRight']) rig.place(leg, [0, 0.06 * lift, 0.03 * lift]);
  pitchUp(rig, NECK, 18 * up + 2 * shake * Math.sin(2 * Math.PI * 9 * t));
  pitchUp(rig, CHIN, -18 * lift);
  yaw(rig, HEAD, 3 * shake * Math.sin(2 * Math.PI * 7 * t));
  gills(rig, 34 * lift, -10 * lift, 4 * shake, t * 4, 30 * lift, -10 * lift);
  TAIL.forEach((b, i) => yaw(rig, b, (6 + 4 * i) * lift * Math.sin(2 * Math.PI * 2 * t - i)));
}

/** The dive: it ducks its head and drives down nose first, its tail flicking up behind it (the fight sinks it). */
const DIVE = { duration: 0.7 };
function dive(rig: Rig, t: number) {
  const k = keys(t, [
    [0, 0],
    [0.45, 1],
  ]);
  pitchUp(rig, ROOT, -10 * k);
  rig.update();
  pitchUp(rig, NECK, -16 * k);
  TAIL.forEach((b, i) => pitchUp(rig, b, -(8 + 6 * i) * k));
  gills(rig, -4 * k, 30 * k, 0, t, -6 * k, 24 * k);
}

/** The hit: a flinch, its head jerked back and aside and its gills clapped shut, then shaken out. It leaves the legs and
    the root as they are and starts and ends at rest, so it plays over any other clip (madeBosses.ts makes it additive). */
const HIT = { duration: 0.5 };
function hit(rig: Rig, t: number) {
  const jolt = keys(t, [
      [0, 0],
      [0.06, 1],
      [0.22, 0.4],
      [0.5, 0],
    ]),
    shake = t > 0.1 ? Math.sin(Math.PI * Math.min(1, (t - 0.1) / 0.4)) : 0;
  pitchUp(rig, NECK, 16 * jolt);
  yaw(rig, NECK, 12 * jolt + 6 * shake * Math.sin(2 * Math.PI * 6 * t));
  gills(rig, -10 * jolt + 6 * shake * Math.sin(2 * Math.PI * 5 * t), 12 * jolt, 0, t);
}

export const CLIPS: Record<string, ClipDef> = {
  idle: { duration: IDLE.duration, loop: true, pose: idle, events: [] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: [] },
  wail: {
    duration: WAIL.duration,
    loop: false,
    pose: wail,
    events: [
      { t: 0.05, sound: 'inhale' },
      { t: 0.4, sound: 'roar', loud: true },
    ],
    at: WAIL.at,
  },
  dive: { duration: DIVE.duration, loop: false, pose: dive, events: [] },
  hit: { duration: HIT.duration, loop: false, pose: hit, events: [] },
};
/** How far the walk carries it each second, in the model's units. */
export const WALK_SPEED = WALK.stride / (WALK.stance * WALK.cycle);
