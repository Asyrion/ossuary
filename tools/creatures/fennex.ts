/* Fen-Nex, the Rune Fox (a Tripo model; docs/creatures.md): the familiar of the Rune of Fen-Nex in stages 1 and 2, a slim
   indigo spirit fox with cyan eyes and paws, a periwinkle ruff and a great starry plume of a tail. Tripo's quadruped rig
   (`walk.glb` carried the armature), facing +z already; in that frame (x left-right, y up, z forward) its back stands
   about 0.38 high, the hind legs hanging from the loins (`Spine_1`, z 0.03) and the forelegs from the withers (`Spine_4`,
   z 0.22) by their shoulder blades (bone_16, bone_21); the neck `Head_0`, `Head_1` leads to the skull (`Head_2`), the plume
   on `Tail_0` to `Tail_3`. It has no jaw bone: its bite is a snap of the neck and head. Tripo bound the skin well enough to
   keep (`SKIN = null`). Read with `npm run animate-creature -- --bones`. Every clip is made in code, on a recipe shared with
   its full shape (fennex_full.ts): idle, trot (at the mage's heel), run (a gallop, its dart), bite and breathe (played over
   the others, so it bites and breathes on the run) and shake (a dog's shake, as it grows). */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';
import { keys, pawfalls, pitchUp, rearAbout, roll, stepAt, yaw } from './moves';

/** The bones a fox's clips move. */
export interface FoxBones {
  root: string;
  /** The loins, that carry the hind legs (and the rest of the spine). */
  pelvis: string;
  /** The withers, that carry the forelegs and the neck. */
  chest: string;
  /** The neck's bones, its base first; then the skull. */
  neck: readonly string[];
  head: string;
  tail: readonly string[];
  /** Feathered wings on its shoulders, left then right (the full shape's). */
  wings?: readonly [string, string];
  legs: Record<'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight', LegDef>;
}
/** How it moves: its trot and gallop (cycle, share of it a paw is down, stride and lift in the model's units). */
export interface FoxGaits {
  trot: { cycle: number; stance: number; stride: number; lift: number };
  run: { cycle: number; stance: number; stride: number; lift: number };
}

/** A fox's clips on its bones: what both stages of Fen-Nex play (combat/fennex.ts). `breathe` only when it breathes. */
export function foxClips(B: FoxBones, G: FoxGaits, breathes: boolean) {
  const hips = (rig: Rig) => rig.at(B.legs.rearLeft.root).add(rig.at(B.legs.rearRight.root)).multiplyScalar(0.5);
  const planted = (rig: Rig) => {
    for (const leg of Object.keys(B.legs)) rig.place(leg, [0, 0, 0]);
  };
  const tail = (rig: Rig, f: (k: number, i: number) => [number, number]) =>
    B.tail.forEach((b, i) => {
      const [p, y] = f(i / Math.max(1, B.tail.length - 1), i);
      pitchUp(rig, b, p);
      yaw(rig, b, y);
    });

  /** At rest: it breathes, looks about with its ears' head, and its plume sways slowly behind it. */
  const IDLE = 4;
  function idle(rig: Rig, t: number) {
    const a = (2 * Math.PI * t) / IDLE;
    rig.move(B.root, [0, 0.002 * Math.sin(2 * a), 0]);
    pitchUp(rig, B.chest, 1.2 * Math.sin(2 * a));
    roll(rig, B.pelvis, 0.8 * Math.sin(a));
    rig.update();
    planted(rig);
    yaw(rig, B.neck[0], 10 * Math.sin(a));
    pitchUp(rig, B.head, 4 * Math.sin(2 * a + 1));
    roll(rig, B.head, 5 * Math.max(0, Math.sin(a * 3 + 1)) ** 6); // (a cock of the head, now and then)
    tail(rig, (k) => [2 * Math.sin(a + 1 - k), (4 + 8 * k) * Math.sin(a + 0.4 - 1.4 * k)]);
    if (B.wings) for (const [i, w] of B.wings.entries()) roll(rig, w, (i ? -1 : 1) * 3 * Math.sin(2 * a));
  }

  /** The trot, at the mage's heel: diagonal pairs together, a light spring twice a cycle, head level, plume floating. */
  const TROT_PHASE: Record<string, number> = { frontLeft: 0, rearRight: 0.03, frontRight: 0.5, rearLeft: 0.53 };
  function trot(rig: Rig, t: number) {
    const W = G.trot,
      f = t / W.cycle,
      a = 2 * Math.PI * f;
    rig.move(B.root, [0, -0.006 + 0.008 * Math.cos(2 * a), 0]);
    roll(rig, B.pelvis, 2 * Math.sin(a));
    yaw(rig, B.chest, -2 * Math.sin(a + 0.5));
    rig.update();
    for (const [leg, off] of Object.entries(TROT_PHASE)) {
      const s = stepAt((((f - off) % 1) + 1) % 1, W.stance, W.stride, W.lift, 18);
      rig.place(leg, [0, s.y, s.z], s.pitch, s.pitch * 0.6);
    }
    pitchUp(rig, B.neck[0], -3 + 1.5 * Math.cos(2 * a + 1));
    pitchUp(rig, B.head, 3 - 1.5 * Math.cos(2 * a + 1));
    tail(rig, (k) => [4 + 3 * Math.cos(2 * a - 2 * k), 6 * k * Math.sin(a - 1.5 * k)]);
    if (B.wings) for (const [i, w] of B.wings.entries()) roll(rig, w, (i ? -1 : 1) * 4 * Math.cos(2 * a));
  }

  /** The run, its dart at a foe: a rotary gallop, hind feet then forefeet, the body stretching and gathering, head low
      and reaching, the plume streaming out behind. */
  const RUN_PHASE: Record<string, number> = { rearLeft: 0, rearRight: 0.1, frontLeft: 0.45, frontRight: 0.55 };
  function run(rig: Rig, t: number) {
    const W = G.run,
      f = t / W.cycle,
      a = 2 * Math.PI * f;
    rig.move(B.root, [0, -0.012 + 0.016 * Math.sin(a - 0.6), 0]);
    pitchUp(rig, B.pelvis, 6 * Math.sin(a + 0.4)); // (rump down as the hind feet drive, chest down as the front land)
    pitchUp(rig, B.chest, 3 * Math.sin(a + 1.4));
    rig.update();
    for (const [leg, off] of Object.entries(RUN_PHASE)) {
      const front = leg.startsWith('front'),
        s = stepAt((((f - off) % 1) + 1) % 1, W.stance, W.stride, W.lift, 24);
      rig.place(leg, [0, s.y, s.z + (front ? 0.015 : -0.01)], s.pitch * 0.6, s.pitch);
    }
    pitchUp(rig, B.neck[0], -10 - 3 * Math.sin(a + 1.8)); // (stretched out after its prey)
    pitchUp(rig, B.head, 8);
    tail(rig, (k) => [-6 - 4 * Math.sin(a - 2 * k), 4 * k * Math.sin(a - k)]); // (streaming back, level)
    if (B.wings) for (const [i, w] of B.wings.entries()) roll(rig, w, (i ? -1 : 1) * (-8 + 6 * Math.sin(a)));
  }

  /** The bite, played over whatever it does (it bites on the run): the head drawn back a hair, then snapped forward and
      down at `at`, a shake of the jaws, and back. Only the neck and head move, from rest to rest. */
  const BITE = { duration: 0.45, at: 0.16 };
  function bite(rig: Rig, t: number) {
    const snap = keys(t, [
      [0, 0],
      [0.08, -0.4],
      [BITE.at, 1, 'in'],
      [0.26, 0.8],
      [0.45, 0],
    ]);
    pitchUp(rig, B.neck[0], -24 * snap);
    for (const n of B.neck.slice(1)) pitchUp(rig, n, -6 * snap);
    pitchUp(rig, B.head, 10 * snap);
    const worry = t > BITE.at && t < 0.34 ? Math.sin((Math.PI * (t - BITE.at)) / 0.18) : 0;
    roll(rig, B.head, 14 * worry * Math.sin(2 * Math.PI * 9 * t)); // (it worries what it bit)
  }

  /** The breath (its full shape's Ember): it draws its head back and up, wings lifting, then throws it forward and low
      at `at` as the bolts go out, holding it there a beat. Only the neck, head and wings move, from rest to rest. */
  const BREATHE = { duration: 0.9, at: 0.32 };
  function breathe(rig: Rig, t: number) {
    const k = keys(t, [
      [0, 0],
      [0.24, -1],
      [BREATHE.at, 1, 'in'],
      [0.6, 0.9],
      [0.9, 0],
    ]);
    pitchUp(rig, B.neck[0], -30 * k);
    for (const n of B.neck.slice(1)) pitchUp(rig, n, -8 * k);
    pitchUp(rig, B.head, (k > 0 ? 18 : 6) * k); // (its muzzle thrown forward, level, as it breathes)
    if (B.wings) for (const [i, w] of B.wings.entries()) roll(rig, w, (i ? 1 : -1) * 14 * Math.max(0, -k)); // (lifted)
  }

  /** The shake, as it grows: a dog's shake from the head back to the plume, the feet planted, then a settle. */
  const SHAKE = 0.8;
  function shake(rig: Rig, t: number) {
    const env = Math.sin(Math.PI * Math.min(1, t / 0.65)) * (t < 0.65 ? 1 : 0),
      w = 2 * Math.PI * 7 * t;
    roll(rig, B.chest, 10 * env * Math.sin(w));
    roll(rig, B.pelvis, -7 * env * Math.sin(w - 0.9));
    rearAbout(rig, B.root, hips(rig), 3 * env);
    rig.update();
    planted(rig);
    roll(rig, B.head, 18 * env * Math.sin(w + 0.8));
    yaw(rig, B.neck[0], 8 * env * Math.sin(w + 0.4));
    tail(rig, (k) => [6 * env, 20 * env * Math.sin(w - 1.6 - 1.5 * k)]);
    if (B.wings) for (const [i, w2] of B.wings.entries()) roll(rig, w2, (i ? 1 : -1) * 12 * env * Math.sin(w));
  }

  const speed = (g: FoxGaits['trot']) => g.stride / (g.stance * g.cycle);
  const clips: Record<string, ClipDef> = {
    idle: { duration: IDLE, loop: true, pose: idle, events: [] },
    trot: {
      duration: G.trot.cycle,
      loop: true,
      pose: trot,
      events: pawfalls(TROT_PHASE, G.trot.cycle),
      speed: speed(G.trot),
    },
    run: {
      duration: G.run.cycle,
      loop: true,
      pose: run,
      events: pawfalls(RUN_PHASE, G.run.cycle),
      speed: speed(G.run),
    },
    bite: { duration: BITE.duration, loop: false, pose: bite, events: [{ t: BITE.at, sound: 'snap' }], at: BITE.at },
    shake: { duration: SHAKE, loop: false, pose: shake, events: [] },
  };
  if (breathes)
    clips.breathe = {
      duration: BREATHE.duration,
      loop: false,
      pose: breathe,
      events: [{ t: 0.04, sound: 'inhale' }],
      at: BREATHE.at,
    };
  return { CLIPS: clips, WALK_SPEED: speed(G.trot) };
}

/** Facing +z as Tripo set it. */
export const face = 0;

const BONES: FoxBones = {
  root: 'tripo::Root',
  pelvis: 'tripo::Spine_1',
  chest: 'tripo::Spine_4',
  neck: ['tripo::Head_0', 'tripo::Head_1'],
  head: 'tripo::Head_2',
  tail: ['tripo::Tail_0', 'tripo::Tail_1', 'tripo::Tail_2', 'tripo::Tail_3'],
  /* the forelegs shoulder, elbow and wrist in the IK, the paw below kept flat; the hind legs hip, stifle and hock, the
     foot below the hock (it has no bone of its own) kept at its slope */
  legs: {
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
  },
};
export const LEGS = BONES.legs;
/** Tripo's own weights, kept: its quadruped rig bound each leg to its own bones and the plume to its tail. */
export const SKIN: SkinBone[] | null = null;
/** The bones whose place (not only their turn) changes in a clip. */
export const MOVING = [BONES.root];
export const { CLIPS, WALK_SPEED } = foxClips(
  BONES,
  {
    trot: { cycle: 0.34, stance: 0.42, stride: 0.26, lift: 0.05 },
    run: { cycle: 0.3, stance: 0.3, stride: 0.34, lift: 0.07 },
  },
  false,
);
