/* The War-Tiger (a Tripo model; docs/creatures.md): floor 3's boss, an armoured tiger with a stone mane, a statue in its
   hall until the mage comes near. Tripo set it facing -z, so the tool turns it round first (`face`); in that frame (x
   left-right, y up, z forward) its back stands about 0.42 high and its body runs from the rump (the pelvis `Spine_0`, z
   -0.13) to the shoulders (z 0.22), the neck (`Head_0`) leading to the head (bone_19, which carries the mane), the jaw
   (bone_20) the low bone at the front, the tail bone_35 and bone_36. Tripo's quadruped rig bound the skin well enough to
   keep (`SKIN = null`). Read with `npm run animate-creature -- --bones --face=180`. Tripo offers only a walk for a
   quadruped, so every clip is made in code: idle, statue (still as stone), walk (a low prowl), crouch (sinking to spring,
   tail lashing), pounce (a bound, forelegs reaching), swipe (a forepaw raised and raked down), roar and hit (dazed). */
import * as THREE from 'three';
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';
import { keys, pawfalls, pitchUp, rearAbout, roll, stepAt, yaw } from './moves';

/** Turned this many degrees about the vertical before anything reads it: its muzzle from -z to +z. */
export const face = 180;

const ROOT = 'tripo::Root',
  PELVIS = 'tripo::Spine_0',
  MIDBACK = 'tripo::Spine_1',
  CHEST = 'tripo::Spine_2',
  NECK = 'tripo::Head_0',
  HEAD = 'bone_19',
  JAW = 'bone_20',
  TAIL = 'bone_35',
  TAIL2 = 'bone_36';

/** The legs, a cat's: the forelegs shoulder, elbow and wrist in the IK, the paw below kept flat; the hind legs hip, knee
    and hock, the long foot below the hock kept at its slope and the toes flat. */
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
    toes: ['tripo::1_Left_Limb_3'],
  },
  rearRight: {
    root: 'tripo::1_Right_Limb_0',
    mid: 'tripo::1_Right_Limb_1',
    end: 'tripo::1_Right_Limb_2',
    paw: ['tripo::1_Right_Limb_2'],
    toes: ['tripo::1_Right_Limb_3'],
  },
};
/** Tripo's own weights, kept: its quadruped rig bound each leg to its own bones and the mane to the head. */
export const SKIN: SkinBone[] | null = null;
/** The bones whose place (not only their turn) changes in a clip. */
export const MOVING = [ROOT];

const hips = (rig: Rig) => rig.at(LEGS.rearLeft.root).add(rig.at(LEGS.rearRight.root)).multiplyScalar(0.5);
const shoulders = (rig: Rig) => rig.at(LEGS.frontLeft.root).add(rig.at(LEGS.frontRight.root)).multiplyScalar(0.5);
const planted = (rig: Rig) => {
  for (const leg of Object.keys(LEGS)) rig.place(leg, [0, 0, 0]);
};

/** The walk: a low, rolling prowl (lateral sequence), shoulders working over the planted forepaw, head low and level,
    the tail's tip swaying. */
const WALK = { cycle: 0.9, stance: 0.6, stride: 0.2, lift: { front: 0.05, rear: 0.045 } };
const PHASE: Record<string, number> = { rearLeft: 0, frontLeft: 0.25, rearRight: 0.5, frontRight: 0.75 };
function walk(rig: Rig, t: number) {
  const W = WALK,
    f = t / W.cycle,
    a = 2 * Math.PI * f;
  rig.move(ROOT, [0, -0.012 + 0.005 * Math.cos(2 * a), 0]);
  roll(rig, PELVIS, 2.5 * Math.sin(a));
  yaw(rig, PELVIS, 2 * Math.sin(a + 0.6));
  yaw(rig, CHEST, -3 * Math.sin(a + 0.9));
  roll(rig, CHEST, -2.5 * Math.sin(a + 1.2));
  rig.update();
  for (const [leg, off] of Object.entries(PHASE)) {
    const s = stepAt(
      (((f - off) % 1) + 1) % 1,
      W.stance,
      W.stride,
      leg.startsWith('front') ? W.lift.front : W.lift.rear,
    );
    rig.place(leg, [0, s.y, s.z], s.pitch, s.pitch * 0.5);
  }
  pitchUp(rig, NECK, -4 + 1.5 * Math.cos(2 * a + 1)); // (the head carried low, a hunter's)
  pitchUp(rig, HEAD, 4 - 1.5 * Math.cos(2 * a + 1));
  yaw(rig, HEAD, -2 * Math.sin(a));
  yaw(rig, TAIL, 8 * Math.sin(a + 1));
  yaw(rig, TAIL2, 14 * Math.sin(a + 0.4));
}

/** At rest: it breathes, shifts its weight, looks about and flicks its tail. */
const IDLE = { duration: 4 };
function idle(rig: Rig, t: number) {
  const a = (2 * Math.PI * t) / IDLE.duration;
  rig.move(ROOT, [0.003 * Math.sin(a), 0.003 * Math.sin(2 * a), 0]);
  pitchUp(rig, CHEST, 1.5 * Math.sin(2 * a));
  roll(rig, PELVIS, 1 * Math.sin(a));
  rig.update();
  planted(rig);
  yaw(rig, NECK, 8 * Math.sin(a));
  pitchUp(rig, HEAD, 3 * Math.sin(2 * a + 1));
  yaw(rig, TAIL, 10 * Math.sin(a + 0.5));
  yaw(rig, TAIL2, 18 * Math.max(0, Math.sin(3 * a)) ** 3);
}

/** As stone: square on its feet, its head held high and its tail laid down, not a muscle moving (the fight's statue). */
const STATUE = { duration: 0.5 };
function statue(rig: Rig) {
  pitchUp(rig, MIDBACK, 2);
  rig.update();
  planted(rig);
  pitchUp(rig, NECK, 9);
  pitchUp(rig, HEAD, -4);
  pitchUp(rig, TAIL, -18);
}

/** The crouch: it sinks onto its haunches and shoulders, head low and stretched at its mark, rump wriggling, tail
    lashing; deepest at `at`, when it springs. */
const CROUCH = { duration: 0.6, at: 0.6 };
function crouch(rig: Rig, t: number) {
  const k = keys(t, [
    [0, 0],
    [0.35, 1],
  ]);
  rig.move(ROOT, [0, -0.07 * k, -0.01 * k]);
  pitchUp(rig, PELVIS, -3 * k);
  yaw(rig, PELVIS, 3 * k * Math.sin(2 * Math.PI * 4 * t)); // (the wriggle before a spring)
  pitchUp(rig, CHEST, 2 * k);
  rig.update();
  planted(rig);
  pitchUp(rig, NECK, -12 * k);
  pitchUp(rig, HEAD, 10 * k);
  yaw(rig, TAIL, 30 * Math.sin(2 * Math.PI * 3.6 * t));
  yaw(rig, TAIL2, 40 * Math.sin(2 * Math.PI * 3.6 * t - 0.8));
}

/** The pounce: from the crouch it drives off its hind legs and flies stretched long, forelegs reaching ahead with claws
    out and hind legs trailing; its forepaws come down at `at` (the fight lifts it through the air and sets it down there),
    and it takes the landing low. */
const POUNCE = { duration: 0.75, at: 0.5 };
function pounce(rig: Rig, t: number) {
  const fly = keys(t, [
      [0, 0],
      [0.12, 1],
      [0.42, 1],
      [0.5, 0.2, 'in'],
      [0.62, 0],
    ]),
    low = keys(t, [
      [0, 1],
      [0.1, 0],
      [0.5, 0],
      [0.58, 1],
      [0.75, 0],
    ]);
  rig.move(ROOT, [0, -0.06 * low, 0]);
  pitchUp(rig, PELVIS, 6 * fly);
  pitchUp(rig, CHEST, -4 * fly);
  rig.update();
  const sh = shoulders(rig),
    hp = hips(rig);
  for (const [leg, side] of [
    ['frontLeft', 1],
    ['frontRight', -1],
  ] as const) {
    // (reaching ahead and up from the shoulder, claws out)
    const want = new THREE.Vector3(sh.x + side * 0.03, sh.y - 0.16, sh.z + 0.2).sub(rig.foot(leg));
    rig.place(leg, [want.x * fly, want.y * fly, want.z * fly], -40 * fly, 30 * fly);
  }
  for (const leg of ['rearLeft', 'rearRight']) {
    // (stretched out behind)
    const want = new THREE.Vector3(rig.foot(leg).x, hp.y - 0.2, hp.z - 0.2).sub(rig.foot(leg));
    rig.place(leg, [want.x * fly, want.y * fly, want.z * fly], 50 * fly, 20 * fly);
  }
  pitchUp(rig, NECK, -6 * fly - 8 * low);
  pitchUp(rig, HEAD, 6 * fly);
  pitchUp(rig, JAW, -14 * fly); // (its jaws open as it flies)
  pitchUp(rig, TAIL, 10 * fly);
  pitchUp(rig, TAIL2, -10 * fly);
}

/** The swipe: it rocks back onto its haunches, raises its right forepaw high with its claws out, head drawn back and
    snarling, and rakes it down and across at `at` (the fan of shards going out), then sets the paw down. */
const SWIPE = { duration: 0.8, at: 0.5 };
function swipe(rig: Rig, t: number) {
  const up = keys(t, [
      [0, 0],
      [0.38, 1],
      [0.5, 0, 'in'],
      [0.8, 0],
    ]),
    back = keys(t, [
      [0, 0],
      [0.38, 1],
      [0.5, -0.4, 'in'],
      [0.8, 0],
    ]);
  rearAbout(rig, ROOT, hips(rig), 14 * back);
  roll(rig, CHEST, -6 * up);
  rig.update();
  rig.place('frontLeft', [0, 0, 0]);
  const sh = rig.at(LEGS.frontRight.root),
    raised = new THREE.Vector3(sh.x - 0.04, sh.y - 0.02, sh.z + 0.19).sub(rig.foot('frontRight')),
    across = keys(t, [
      [0.38, 0],
      [0.5, 1, 'in'],
      [0.62, 1],
      [0.8, 0],
    ]);
  rig.place(
    'frontRight',
    [raised.x * up + 0.08 * across, raised.y * up, raised.z * up + 0.08 * across],
    -60 * up,
    40 * up,
  );
  rig.place('rearLeft', [0, 0, 0]);
  rig.place('rearRight', [0, 0, 0]);
  pitchUp(rig, NECK, 6 * up - 6 * across);
  yaw(rig, HEAD, -10 * up + 12 * across);
  pitchUp(rig, JAW, -18 * Math.max(up, across * 0.6));
  yaw(rig, TAIL, 25 * Math.sin(2 * Math.PI * 1.5 * t));
}

/** The roar: it plants its forepaws, draws its head down, then throws it up with its jaws wide and shakes its stone mane
    as the ring of shards goes out at `at`, and settles. */
const ROAR = { duration: 1.1, at: 0.65 };
function roar(rig: Rig, t: number) {
  const up = keys(t, [
      [0, 0],
      [0.15, -0.4],
      [0.5, 1],
      [0.85, 1],
      [1.1, 0],
    ]),
    shake = t > 0.5 && t < 0.95 ? Math.sin((Math.PI * (t - 0.5)) / 0.45) : 0;
  rearAbout(rig, ROOT, hips(rig), 7 * Math.max(0, up));
  rig.move(ROOT, [0, -0.01 * Math.max(0, -up * 2.5), 0]);
  pitchUp(rig, CHEST, 4 * up);
  rig.update();
  planted(rig);
  pitchUp(rig, NECK, 22 * up);
  pitchUp(rig, HEAD, 10 * up);
  pitchUp(rig, JAW, -30 * Math.max(0, up));
  yaw(rig, HEAD, 8 * shake * Math.sin(2 * Math.PI * 6 * t));
  roll(rig, HEAD, 6 * shake * Math.sin(2 * Math.PI * 5 * t + 0.7));
  pitchUp(rig, TAIL, 20 * Math.max(0, up));
}

/** Dazed (it ran into a wall): its head knocked back and aside, then shaken slowly as it reels on its feet. */
const HIT = { duration: 1.2 };
function hit(rig: Rig, t: number) {
  const jolt = keys(t, [
      [0, 0],
      [0.08, 1],
      [0.4, 0.4],
      [1.2, 0],
    ]),
    reel = Math.sin(Math.PI * Math.min(1, t / 1.2));
  rig.move(ROOT, [0.01 * reel * Math.sin(2 * Math.PI * 1.6 * t), -0.008 * jolt, -0.02 * jolt]);
  rearAbout(rig, ROOT, hips(rig), 6 * jolt);
  rig.update();
  planted(rig);
  pitchUp(rig, NECK, 16 * jolt - 6 * reel);
  yaw(rig, NECK, 10 * reel * Math.sin(2 * Math.PI * 1.6 * t));
  roll(rig, HEAD, 12 * reel * Math.sin(2 * Math.PI * 2.4 * t + 0.6));
  pitchUp(rig, JAW, -10 * jolt);
  pitchUp(rig, TAIL, -12 * reel);
}

export const CLIPS: Record<string, ClipDef> = {
  idle: { duration: IDLE.duration, loop: true, pose: idle, events: [] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: pawfalls(PHASE, WALK.cycle) },
  roar: {
    duration: ROAR.duration,
    loop: false,
    pose: roar,
    events: [
      { t: 0.05, sound: 'inhale' },
      { t: 0.45, sound: 'roar', loud: true },
    ],
    at: ROAR.at,
  },
  statue: { duration: STATUE.duration, loop: false, pose: statue, events: [] },
  crouch: { duration: CROUCH.duration, loop: false, pose: crouch, events: [], at: CROUCH.at },
  pounce: {
    duration: POUNCE.duration,
    loop: false,
    pose: pounce,
    events: [{ t: POUNCE.at, sound: 'slam', loud: true }],
    at: POUNCE.at,
  },
  swipe: {
    duration: SWIPE.duration,
    loop: false,
    pose: swipe,
    events: [{ t: SWIPE.at, sound: 'clawFront', at: 'frontRight' }],
    at: SWIPE.at,
  },
  hit: { duration: HIT.duration, loop: false, pose: hit, events: [] },
};
/** How far the walk carries it each second (the stride over the time a paw is down), in the model's units. */
export const WALK_SPEED = WALK.stride / (WALK.stance * WALK.cycle);
