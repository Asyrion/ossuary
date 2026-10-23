/* The Hallowed Hart (a Tripo model; docs/creatures.md): floor 4's boss, a great white stag under a crown of antlers, the
   first creature made in Tripo that fights (actors/madeBosses.ts plays its clips by the fight's states). Tripo set it
   facing +x, so the tool turns it to face +z first (`face`); in that frame (x left-right, y up, z forward) its back stands
   about 0.46 high and its body runs from the rump (z -0.36) to the chest (z 0.14), the neck rising forward to the head
   (bone_5, at 0.59 high), which carries the antlers. Tripo's quadruped rig named most of its bones (`tripo::Spine_0`, the
   legs' `Limb`s) and bound the skin well enough to keep (`SKIN = null`): the spine (`Spine_0`) carries everything, the
   chest (`Head_0`, as Tripo named it) the neck and the forelegs, the pelvis (`1_Left_Limb_0`) the hind legs and the short
   tail. Read with `npm run animate-creature -- --bones --face=-90`. Tripo offers only a walk for a quadruped, so every clip
   here is made in code: idle, walk, charge (a gallop, antlers low), stamp (rearing and stamping down) and hit. */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';

/** Turned this many degrees about the vertical before anything reads it: its muzzle from +x to +z. */
export const face = -90;

const SPINE = 'tripo::Spine_0',
  CHEST = 'tripo::Head_0',
  PELVIS = 'tripo::1_Left_Limb_0',
  NECK = 'bone_3',
  NECK2 = 'bone_4',
  HEAD = 'bone_5',
  TAIL = 'bone_29',
  TAIL2 = 'bone_30';

/** The legs, as a deer's: the forelegs shoulder, elbow and knee (the carpus) in the IK, the cannon below the knee kept
    upright and the pastern below the fetlock kept at its slope; the hind legs hip, stifle and hock, the cannon below the
    hock kept upright, the pastern at its slope. */
export const LEGS: Record<string, LegDef> = {
  frontLeft: {
    root: 'tripo::0_Left_Limb_0',
    mid: 'tripo::0_Left_Limb_1',
    end: 'tripo::0_Left_Limb_2',
    paw: ['tripo::0_Left_Limb_2'],
    toes: ['tripo::0_Left_Limb_3'],
  },
  frontRight: {
    root: 'bone_11',
    mid: 'tripo::0_Right_Limb_0',
    end: 'tripo::0_Right_Limb_1',
    paw: ['tripo::0_Right_Limb_1'],
    toes: ['tripo::0_Right_Limb_2'],
  },
  rearLeft: {
    root: 'tripo::1_Left_Limb_1',
    mid: 'tripo::1_Left_Limb_2',
    end: 'tripo::1_Left_Limb_3',
    paw: ['tripo::1_Left_Limb_3'],
    toes: ['tripo::1_Left_Limb_4'],
  },
  rearRight: { root: 'bone_22', mid: 'bone_23', end: 'bone_24', paw: ['bone_24'], toes: ['bone_25'] },
};
/** Tripo's own weights, kept: its quadruped rig bound each leg to its own bones and the antlers to the head. */
export const SKIN: SkinBone[] | null = null;
/** The bones whose place (not only their turn) changes in a clip. */
export const MOVING = [SPINE];

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
/** A value through keys [time, value], eased in and out between them, or only in (`'in'`: gathering speed, a stamp). */
function keys(t: number, ks: [number, number, 'in'?][]) {
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
// the creature's frame: nose up is a turn about +x by a negative angle; a turn about +y swings the nose to +x
const pitchUp = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [1, 0, 0], -deg);
const yaw = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 1, 0], deg);
const roll = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 0, 1], deg);

/** The whole body pitched nose up by `deg` about its hind hips (they stay where they are: it rears on its hind legs). */
function rear(rig: Rig, deg: number) {
  if (!deg) return;
  const hip = rig.at(LEGS.rearLeft.root).add(rig.at(LEGS.rearRight.root)).multiplyScalar(0.5),
    j = rig.at(SPINE);
  pitchUp(rig, SPINE, deg);
  rig.update();
  const a = (-deg * Math.PI) / 180,
    dy = hip.y - j.y,
    dz = hip.z - j.z;
  // (where the hips went under the turn about the spine's joint, brought back)
  const ny = dy * Math.cos(a) - dz * Math.sin(a),
    nz = dy * Math.sin(a) + dz * Math.cos(a);
  rig.move(SPINE, [0, dy - ny, dz - nz]);
}

/** A step cycle: where a foot is (forward `z`, up `y`) and how its pastern tips (`pitch`), a share `p` of the way round,
    down for `stance` of it while the body passes over, then lifted `lift` and swung forward. */
function stepAt(p: number, stance: number, stride: number, lift: number) {
  if (p < stance) {
    const u = p / stance;
    return {
      z: stride / 2 - stride * u,
      y: u > 0.8 ? 0.012 * ((u - 0.8) / 0.2) ** 2 : 0,
      pitch: u > 0.8 ? (-20 * (u - 0.8)) / 0.2 : 0,
    };
  }
  const s = (p - stance) / (1 - stance);
  return {
    z: -stride / 2 + stride * (s - Math.sin(2 * Math.PI * s) / (2 * Math.PI)),
    y: lift * Math.sin(Math.PI * s),
    pitch: -20 * (1 - s) - 40 * Math.sin(Math.PI * s), // (the hoof folded back under it as it swings)
  };
}

/** The walk: a stately lateral-sequence walk (hind then fore on one side, then the other), each hoof down for 60% of the
    cycle; high, clean steps, the body bobbing twice a cycle, the neck nodding with the forefeet and the crown held high. */
const WALK = { cycle: 0.95, stance: 0.6, stride: 0.2, lift: { front: 0.07, rear: 0.055 } };
const PHASE: Record<string, number> = { rearLeft: 0, frontLeft: 0.25, rearRight: 0.5, frontRight: 0.75 };
function walk(rig: Rig, t: number) {
  const W = WALK,
    f = t / W.cycle,
    a = 2 * Math.PI * f;
  rig.move(SPINE, [0, -0.008 + 0.006 * Math.cos(2 * a), 0]);
  roll(rig, PELVIS, 2 * Math.sin(a));
  yaw(rig, PELVIS, 2 * Math.sin(a + 0.6));
  yaw(rig, CHEST, -2.5 * Math.sin(a + 0.9));
  roll(rig, CHEST, -1.5 * Math.sin(a + 1.2));
  rig.update();
  for (const [leg, off] of Object.entries(PHASE)) {
    const s = stepAt(
      (((f - off) % 1) + 1) % 1,
      W.stance,
      W.stride,
      leg.startsWith('front') ? W.lift.front : W.lift.rear,
    );
    rig.place(leg, [0, s.y, s.z], s.pitch * 0.3, s.pitch);
  }
  pitchUp(rig, NECK, 3 * Math.cos(2 * a + 1.2)); // (the deer's nod, twice a cycle)
  pitchUp(rig, HEAD, -2 * Math.cos(2 * a + 1.2));
  yaw(rig, NECK2, 1.5 * Math.sin(a));
  yaw(rig, TAIL, 6 * Math.sin(a + 1));
}

/** The charge: a rotary gallop, hind feet then forefeet close together, its body rocking with each bound, its neck
    stretched low so the antlers lead (the fight lowers the head further, as it aims). */
const GALLOP = { cycle: 0.42, stance: 0.36, stride: 0.34, lift: { front: 0.1, rear: 0.08 } };
const GALLOP_PHASE: Record<string, number> = { rearLeft: 0, rearRight: 0.1, frontLeft: 0.45, frontRight: 0.55 };
function charge(rig: Rig, t: number) {
  const G = GALLOP,
    f = t / G.cycle,
    a = 2 * Math.PI * f;
  rig.move(SPINE, [0, -0.02 + 0.018 * Math.sin(a - 0.6), 0.005 * Math.cos(a)]);
  pitchUp(rig, SPINE, 5 * Math.sin(a + 0.4)); // (rocking: rump down as the hind feet drive, chest down as the front land)
  pitchUp(rig, CHEST, 2 * Math.sin(a + 1.4));
  rig.update();
  for (const [leg, off] of Object.entries(GALLOP_PHASE)) {
    const front = leg.startsWith('front'),
      s = stepAt((((f - off) % 1) + 1) % 1, G.stance, G.stride, front ? G.lift.front : G.lift.rear);
    rig.place(leg, [0, s.y, s.z + (front ? 0.02 : -0.01)], s.pitch * 0.4, s.pitch * 1.2);
  }
  pitchUp(rig, NECK, -14 - 3 * Math.sin(a + 1.8)); // (neck stretched forward and low)
  pitchUp(rig, HEAD, -6);
  pitchUp(rig, TAIL, 12);
}

/** The stamp: it rises on its hind legs, forelegs folded high, its crown thrown back, holds a beat, and drives both
    forefeet down at `downAt` (when the fight's ring of light goes out), then settles. */
const STAMP = { duration: 1.15, downAt: 0.55 };
function stamp(rig: Rig, t: number) {
  const D = STAMP.downAt;
  const up = keys(t, [
    [0, 0],
    [0.38, 26],
    [0.46, 27],
    [D, 0, 'in'],
    [0.68, -3],
    [1.15, 0],
  ]);
  rear(rig, up);
  rig.move(SPINE, [
    0,
    keys(t, [
      [0, 0],
      [0.15, -0.012],
      [0.38, 0],
      [D, -0.02, 'in'],
      [0.8, 0],
    ]),
    0,
  ]);
  rig.update();
  const k = up / 27,
    fold = Math.max(0, k);
  for (const leg of ['frontLeft', 'frontRight']) rig.place(leg, [0, 0.03 * fold, 0.04 * fold], -30 * fold, -60 * fold);
  rig.place('rearLeft', [0, 0, 0]);
  rig.place('rearRight', [0, 0, 0]);
  pitchUp(
    rig,
    NECK,
    keys(t, [
      [0, 0],
      [0.38, 12],
      [D, -18, 'in'],
      [0.75, -6],
      [1.15, 0],
    ]),
  );
  pitchUp(
    rig,
    HEAD,
    keys(t, [
      [0, 0],
      [0.38, 6],
      [D, -10, 'in'],
      [1.15, 0],
    ]),
  );
  pitchUp(rig, TAIL, 20 * fold);
}

/** The hit: it flinches back from the blow, its head thrown up and aside, then shakes its crown as if dazed and settles. */
const HIT = { duration: 0.9 };
function hit(rig: Rig, t: number) {
  const jolt = keys(t, [
    [0, 0],
    [0.08, 1],
    [0.35, 0.4],
    [0.9, 0],
  ]);
  rig.move(SPINE, [0, -0.01 * jolt, -0.03 * jolt]);
  rear(rig, 5 * jolt);
  rig.update();
  for (const leg of Object.keys(LEGS)) rig.place(leg, [0, 0, 0]);
  const shake = t > 0.2 ? Math.sin(Math.PI * Math.min(1, (t - 0.2) / 0.6)) : 0;
  pitchUp(rig, NECK, 14 * jolt);
  yaw(rig, NECK, 10 * jolt + 6 * shake * Math.sin(2 * Math.PI * 4.5 * t));
  roll(rig, HEAD, 8 * shake * Math.sin(2 * Math.PI * 4.5 * t + 0.8));
}

/** At rest: it breathes (the chest rising), shifts its weight, turns its crown to look about and flicks its tail. */
const IDLE = { duration: 4 };
function idle(rig: Rig, t: number) {
  const a = (2 * Math.PI * t) / IDLE.duration;
  rig.move(SPINE, [0.003 * Math.sin(a), 0.003 * Math.sin(2 * a), 0]);
  pitchUp(rig, CHEST, 1 * Math.sin(2 * a));
  roll(rig, PELVIS, 0.8 * Math.sin(a));
  rig.update();
  for (const leg of Object.keys(LEGS)) rig.place(leg, [0, 0, 0]);
  yaw(rig, NECK, 7 * Math.sin(a));
  yaw(rig, HEAD, 3 * Math.sin(a + 0.5));
  pitchUp(rig, NECK2, 2.5 * Math.sin(2 * a + 1));
  yaw(rig, TAIL, 14 * Math.max(0, Math.sin(4 * a)) ** 4);
  yaw(rig, TAIL2, 10 * Math.max(0, Math.sin(4 * a - 0.4)) ** 4);
}

/** When each hoof comes down in a step cycle (its stance begins), for the footsteps. */
const hooves = (phase: Record<string, number>, cycle: number) =>
  Object.entries(phase).map(([leg, off]) => ({
    t: (off % 1) * cycle,
    sound: leg.startsWith('front') ? 'clawFront' : 'clawRear',
    at: leg,
  }));

export const CLIPS: Record<string, ClipDef> = {
  idle: { duration: IDLE.duration, loop: true, pose: idle, events: [] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: hooves(PHASE, WALK.cycle) },
  charge: {
    duration: GALLOP.cycle,
    loop: true,
    pose: charge,
    events: hooves(GALLOP_PHASE, GALLOP.cycle),
    speed: GALLOP.stride / (GALLOP.stance * GALLOP.cycle),
  },
  stamp: {
    duration: STAMP.duration,
    loop: false,
    pose: stamp,
    events: [
      { t: 0.05, sound: 'inhale' },
      { t: STAMP.downAt, sound: 'slam', loud: true },
    ],
    at: STAMP.downAt,
  },
  hit: { duration: HIT.duration, loop: false, pose: hit, events: [] },
};
/** How far the walk carries it each second (the stride over the time a hoof is down), in the model's units. */
export const WALK_SPEED = WALK.stride / (WALK.stance * WALK.cycle);
