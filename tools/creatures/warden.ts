/* The Hollow Warden (a Tripo model; docs/creatures.md): floor 1's boss, a brown owlbear under a crown of five candles, the
   second creature made in Tripo that fights (actors/madeBosses.ts plays its clips by the fight's states). Tripo set it
   facing +x, so the tool turns it to face +z first (`face`); in that frame (x left-right, y up, z forward) its back stands
   about 0.6 high and its body runs from the rump (the hips at z -0.37) to the shoulders (z 0.17), the neck (Tripo's
   `Head_0`) hanging forward and down to the head (bone_5, at 0.48 high), which carries the candle crown. Tripo's quadruped
   rig named its bones (`tripo::Root` to the legs' `Limb`s) and bound the skin well enough to keep (`SKIN = null`): the
   root carries the spine and the hind legs, the chest (`Spine_2`) the neck and the forelegs. Read with
   `npm run animate-creature -- --bones --face=-90`. Tripo offers only a walk for a quadruped, so every clip here is made in
   code, after the owlbear's (tools/creatures/owlbear.ts): idle, walk (heavy), rear (a rearing roar, its forepaws slammed
   down as its shots go out) and hit (a flinch, played over the others: madeBosses.ts `over`). */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';

/** Turned this many degrees about the vertical before anything reads it: its beak from +x to +z. */
export const face = -90;

const ROOT = 'tripo::Root',
  MIDBACK = 'tripo::Spine_1',
  CHEST = 'tripo::Spine_2',
  NECK = 'tripo::Head_0',
  HEAD = 'bone_5';

/** The legs: the forelegs shoulder, elbow and wrist in the IK, the paw below kept flat; the hind legs hip, knee and ankle,
    the foot under the ankle (Tripo gave it no bone of its own) kept flat with it. */
export const LEGS: Record<string, LegDef> = {
  frontLeft: {
    root: 'tripo::0_Left_Limb_0',
    mid: 'tripo::0_Left_Limb_1',
    end: 'tripo::0_Left_Limb_2',
    paw: ['tripo::0_Left_Limb_2'],
    toes: ['tripo::0_Left_Limb_3'],
  },
  frontRight: {
    root: 'tripo::0_Right_Limb_0',
    mid: 'tripo::0_Right_Limb_1',
    end: 'tripo::0_Right_Limb_2',
    paw: ['tripo::0_Right_Limb_2'],
    toes: ['tripo::0_Right_Limb_3'],
  },
  rearLeft: {
    root: 'tripo::1_Left_Limb_0',
    mid: 'tripo::1_Left_Limb_1',
    end: 'tripo::1_Left_Limb_2',
    paw: ['tripo::1_Left_Limb_2'],
  },
  rearRight: {
    root: 'tripo::1_Right_Limb_0',
    mid: 'tripo::1_Right_Limb_1',
    end: 'tripo::1_Right_Limb_2',
    paw: ['tripo::1_Right_Limb_2'],
  },
};
/** Tripo's own weights, kept: its quadruped rig bound each leg to its own bones and the candle crown to the head. */
export const SKIN: SkinBone[] | null = null;
/** The bones whose place (not only their turn) changes in a clip. */
export const MOVING = [ROOT];

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
/** A value through keys [time, value], eased in and out between them, or only in (`'in'`: gathering speed, a slam). */
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
    j = rig.at(ROOT);
  pitchUp(rig, ROOT, deg);
  rig.update();
  const a = (-deg * Math.PI) / 180,
    dy = hip.y - j.y,
    dz = hip.z - j.z;
  // (where the hips went under the turn about the root's joint, brought back)
  const ny = dy * Math.cos(a) - dz * Math.sin(a),
    nz = dy * Math.sin(a) + dz * Math.cos(a);
  rig.move(ROOT, [0, dy - ny, dz - nz]);
}

/** A step cycle: where a foot is (forward `z`, up `y`) and how its paw tips (`pitch`), a share `p` of the way round, down
    for `stance` of it while the body passes over, then lifted `lift` and swung forward. */
function stepAt(p: number, stance: number, stride: number, lift: number) {
  if (p < stance) {
    const u = p / stance;
    return {
      z: stride / 2 - stride * u,
      y: u > 0.8 ? 0.015 * ((u - 0.8) / 0.2) ** 2 : 0,
      pitch: u > 0.8 ? (-12 * (u - 0.8)) / 0.2 : 0,
    };
  }
  const s = (p - stance) / (1 - stance);
  return {
    z: -stride / 2 + stride * (s - Math.sin(2 * Math.PI * s) / (2 * Math.PI)),
    y: lift * Math.sin(Math.PI * s),
    pitch: -12 * (1 - s) - 18 * Math.sin(Math.PI * s),
  };
}

/** The walk: a heavy lateral-sequence walk (hind then fore on one side, then the other), each paw planted for 62% of the
    cycle; the body sinks twice a cycle and sways over the planted side, the shoulders rolling against the hips, the head
    low and steadied, nodding with the forepaws so the candles bob. */
const WALK = { cycle: 1.1, stance: 0.62, stride: 0.24, lift: { front: 0.07, rear: 0.05 } };
const PHASE: Record<string, number> = { rearLeft: 0, frontLeft: 0.25, rearRight: 0.5, frontRight: 0.75 };
function walk(rig: Rig, t: number) {
  const W = WALK,
    f = t / W.cycle,
    a = 2 * Math.PI * f;
  rig.move(ROOT, [0, -0.014 + 0.009 * Math.cos(2 * a), 0]);
  roll(rig, ROOT, 2.2 * Math.sin(a));
  yaw(rig, ROOT, 1.8 * Math.sin(a + 0.6));
  yaw(rig, MIDBACK, -2.5 * Math.sin(a + 0.9));
  roll(rig, CHEST, -2 * Math.sin(a + 1.2));
  pitchUp(rig, CHEST, 1.5 * Math.cos(2 * a + 0.6));
  rig.update();
  for (const [leg, off] of Object.entries(PHASE)) {
    const front = leg.startsWith('front'),
      s = stepAt((((f - off) % 1) + 1) % 1, W.stance, W.stride, front ? W.lift.front : W.lift.rear);
    rig.place(leg, [0, s.y, s.z], s.pitch, s.pitch * 0.5);
  }
  yaw(rig, NECK, 2.5 * Math.sin(a + 0.6));
  pitchUp(rig, HEAD, 3 * Math.sin(2 * a + 1.2));
  yaw(rig, HEAD, -2 * Math.sin(a));
}

/** The rear: it crouches, heaves up onto its hind legs with its forelegs raised and its claws out, throws its crowned head
    back and roars, then slams both forepaws down at `slamAt` (when the fight's shots go out) and settles. */
const REAR = { duration: 1.35, roarAt: 0.38, slamAt: 0.75 };
function rearing(rig: Rig, t: number) {
  const S = REAR.slamAt;
  const up = keys(t, [
    [0, 0],
    [0.16, -4],
    [0.52, 32],
    [0.64, 33],
    [S, 0, 'in'],
    [0.86, -3],
    [1.35, 0],
  ]);
  rear(rig, up);
  rig.move(ROOT, [
    0,
    keys(t, [
      [0, 0],
      [0.16, -0.022],
      [0.52, 0.006],
      [0.64, 0.008],
      [S, -0.026, 'in'],
      [1.05, 0],
    ]),
    0,
  ]);
  pitchUp(rig, MIDBACK, up * 0.12);
  pitchUp(rig, CHEST, up * 0.1);
  rig.update();
  // the forelegs raised ahead of its chest, claws out, as it rears (reaching from the shoulder, not the floor)
  const fold = Math.max(0, up / 33);
  for (const [leg, side] of [
    ['frontLeft', 1],
    ['frontRight', -1],
  ] as const) {
    const sh = rig.at(LEGS[leg].root),
      want = sh.set(sh.x + side * 0.05, sh.y - 0.17, sh.z + 0.2).sub(rig.foot(leg));
    rig.place(leg, [want.x * fold, want.y * fold, want.z * fold], -35 * fold, 25 * fold);
  }
  rig.place('rearLeft', [0, 0, 0]);
  rig.place('rearRight', [0, 0, 0]);
  const shake = t > REAR.roarAt && t < 0.68 ? Math.sin((Math.PI * (t - REAR.roarAt)) / (0.68 - REAR.roarAt)) : 0;
  pitchUp(
    rig,
    NECK,
    keys(t, [
      [0, 0],
      [0.16, -8],
      [0.5, 20],
      [0.66, 16],
      [S, -10, 'in'],
      [1.0, -3],
      [1.35, 0],
    ]),
  );
  pitchUp(
    rig,
    HEAD,
    keys(t, [
      [0, 0],
      [0.16, -4],
      [0.5, 14],
      [0.66, 10],
      [S, -6, 'in'],
      [1.35, 0],
    ]),
  );
  yaw(rig, HEAD, 6 * shake * Math.sin(2 * Math.PI * 7 * t));
  roll(rig, HEAD, 4 * shake * Math.sin(2 * Math.PI * 5.3 * t));
}

/** The hit: a flinch, its head and shoulders jerked back and aside, then a shake of its crown. It leaves the legs and the
    root as they are and starts and ends at rest, so it plays over any other clip (madeBosses.ts makes it additive). */
const HIT = { duration: 0.55 };
function hit(rig: Rig, t: number) {
  const jolt = keys(t, [
    [0, 0],
    [0.07, 1],
    [0.24, 0.45],
    [0.55, 0],
  ]);
  pitchUp(rig, MIDBACK, 4 * jolt);
  pitchUp(rig, CHEST, 4 * jolt);
  rig.update();
  const shake = t > 0.12 ? Math.sin(Math.PI * Math.min(1, (t - 0.12) / 0.43)) : 0;
  pitchUp(rig, NECK, 24 * jolt);
  yaw(rig, NECK, 16 * jolt + 6 * shake * Math.sin(2 * Math.PI * 5 * t));
  roll(rig, HEAD, 12 * jolt + 7 * shake * Math.sin(2 * Math.PI * 5 * t + 0.8));
}

/** At rest: it breathes (the chest rising), shifts its weight and looks about under its candles. */
const IDLE = { duration: 4 };
function idle(rig: Rig, t: number) {
  const a = (2 * Math.PI * t) / IDLE.duration;
  rig.move(ROOT, [0.004 * Math.sin(a), 0.003 * Math.sin(2 * a), 0]);
  pitchUp(rig, CHEST, 1.4 * Math.sin(2 * a));
  roll(rig, ROOT, 1 * Math.sin(a));
  rig.update();
  for (const leg of Object.keys(LEGS)) rig.place(leg, [0, 0, 0]);
  yaw(rig, NECK, 9 * Math.sin(a));
  pitchUp(rig, HEAD, 3 * Math.sin(2 * a + 1));
  roll(rig, HEAD, 2 * Math.sin(a + 0.7));
}

/** When each paw comes down in the walk (its stance begins), for the footsteps. */
const steps = Object.entries(PHASE).map(([leg, off]) => ({
  t: (off % 1) * WALK.cycle,
  sound: leg.startsWith('front') ? 'pawFront' : 'pawRear',
  at: leg,
}));

export const CLIPS: Record<string, ClipDef> = {
  idle: { duration: IDLE.duration, loop: true, pose: idle, events: [] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: steps },
  rear: {
    duration: REAR.duration,
    loop: false,
    pose: rearing,
    events: [
      { t: 0.05, sound: 'inhale' },
      { t: REAR.roarAt, sound: 'roar', loud: true },
      { t: REAR.slamAt, sound: 'slam', loud: true },
    ],
    at: REAR.slamAt,
  },
  hit: { duration: HIT.duration, loop: false, pose: hit, events: [] },
};
/** How far the walk carries it each second (the stride over the time a paw is down), in the model's units. */
export const WALK_SPEED = WALK.stride / (WALK.stance * WALK.cycle);
