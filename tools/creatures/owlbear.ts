/* The owlbear (the owner's Tripo model, 2026-10-03; docs/creatures.md): which of Tripo's bones is which, how its skin is
   bound again, and its three clips. Its frame: x left-right, y up, z forward (the beak at +z); it stands 0.71 high and
   0.98 long in the model's units. Tripo named the bones bone_0 to bone_38; what each is was read from where it sits and
   what it carries (tools/creatureRig.ts, docs/creatures.md, step 2). */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';

/** The legs: shoulder or hip, elbow or knee, wrist or ankle, and the paw under it. */
export const LEGS: Record<string, LegDef> = {
  frontRight: { root: 'bone_15', mid: 'bone_16', end: 'bone_17', paw: ['bone_18'] },
  frontLeft: { root: 'bone_22', mid: 'bone_23', end: 'bone_24', paw: ['bone_25'] },
  rearLeft: { root: 'bone_2', mid: 'bone_3', end: 'bone_4' },
  rearRight: { root: 'bone_30', mid: 'bone_31', end: 'bone_32' },
};
const PELVIS = 'bone_1', MIDBACK = 'bone_6', CHEST = 'bone_7', NECK = 'bone_8', HEAD = 'bone_9', JAW = 'bone_10';

/** The skin bound again: the body's spine (wide, so its bones reach far), the head, each leg's three or four segments
    kept to their own side and height, and the lower beak given to the jaw outright. */
const SPINE = 2.6, LIMB = 1;
export const SKIN: SkinBone[] = [
  { bone: PELVIS, from: [0.01, 0.44, -0.42], to: [0.01, 0.45, -0.2], reach: SPINE },
  { bone: MIDBACK, from: 'bone_6', to: 'bone_7', reach: SPINE },
  { bone: CHEST, from: 'bone_7', to: [0.01, 0.48, 0.24], reach: SPINE },
  { bone: HEAD, from: [0.01, 0.46, 0.27], to: [0.01, 0.48, 0.42], reach: 1.9, ahead: 0.2 },
  { bone: 'bone_15', from: 'bone_15', to: 'bone_16', side: 1, below: 0.56, reach: LIMB },
  { bone: 'bone_16', from: 'bone_16', to: 'bone_17', side: 1, below: 0.42, reach: LIMB },
  { bone: 'bone_17', from: 'bone_17', to: 'bone_18', side: 1, below: 0.26, reach: LIMB },
  { bone: 'bone_18', from: 'bone_18', to: [0.2, 0.04, 0.33], side: 1, below: 0.15, reach: LIMB },
  { bone: 'bone_22', from: 'bone_22', to: 'bone_23', side: -1, below: 0.56, reach: LIMB },
  { bone: 'bone_23', from: 'bone_23', to: 'bone_24', side: -1, below: 0.42, reach: LIMB },
  { bone: 'bone_24', from: 'bone_24', to: 'bone_25', side: -1, below: 0.26, reach: LIMB },
  { bone: 'bone_25', from: 'bone_25', to: [-0.19, 0.04, 0.22], side: -1, below: 0.15, reach: LIMB },
  { bone: 'bone_2', from: 'bone_2', to: 'bone_3', side: -1, below: 0.48, reach: LIMB },
  { bone: 'bone_3', from: 'bone_3', to: 'bone_4', side: -1, below: 0.3, reach: LIMB },
  { bone: 'bone_4', from: 'bone_4', to: [-0.15, 0.03, -0.26], side: -1, below: 0.15, reach: LIMB },
  { bone: 'bone_30', from: 'bone_30', to: 'bone_31', side: 1, below: 0.48, reach: LIMB },
  { bone: 'bone_31', from: 'bone_31', to: 'bone_32', side: 1, below: 0.3, reach: LIMB },
  { bone: 'bone_32', from: 'bone_32', to: [0.19, 0.03, -0.27], side: 1, below: 0.15, reach: LIMB },
];
/** The lower beak: under the hooked upper beak, in front of the face. */
export const jawOf = (p: { x: number; y: number; z: number }) => p.z > 0.385 && Math.abs(p.x - 0.01) < 0.075 && p.y > 0.33 && p.y < 0.405 ? JAW : null;
/** The bones whose place (not only their turn) changes in a clip. */
export const MOVING = [PELVIS];

const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
/** A value through keys [time, value], eased in and out between them, or only in (`'in'`: gathering speed, a slam). */
function keys(t: number, ks: [number, number, 'in'?][]) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
    const [t0, a] = ks[i - 1], [t1, b, ease] = ks[i], u = (t - t0) / (t1 - t0);
    return a + (b - a) * (ease === 'in' ? u * u * u : smooth(u));
  }
  return ks[ks.length - 1][1];
}
// the creature's frame: nose up is a turn about +x by a negative angle; a turn about +y swings the nose to +x
const pitchUp = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [1, 0, 0], -deg);
const yaw = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 1, 0], deg);
const roll = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 0, 1], deg);

/** The walk: a heavy lateral-sequence walk (hind then fore on one side, then the other), each paw planted on the ground
    for 62% of the cycle while the body passes over it, then lifted and swung forward; the body bobs twice a cycle,
    rolls and swings over the planted side, the head steadied against it and nodding with the forefeet. */
const WALK = { cycle: 1.25, stance: 0.62, stride: 0.2, lift: { front: 0.06, rear: 0.045 } };
const PHASE: Record<string, number> = { rearLeft: 0, frontLeft: 0.25, rearRight: 0.5, frontRight: 0.75 };
function walk(rig: Rig, t: number) {
  const W = WALK, f = t / W.cycle, a = 2 * Math.PI * f;
  rig.move(PELVIS, [0, -0.012 + 0.007 * Math.cos(2 * a), 0]);
  roll(rig, PELVIS, 2.4 * Math.sin(a)); yaw(rig, PELVIS, 2 * Math.sin(a + 0.6));
  yaw(rig, CHEST, -3 * Math.sin(a + 0.9)); roll(rig, CHEST, -1.6 * Math.sin(a + 1.2)); pitchUp(rig, CHEST, 1.2 * Math.cos(2 * a + 0.6));
  rig.update();
  for (const [leg, off] of Object.entries(PHASE)) {
    const p = ((f - off) % 1 + 1) % 1, front = leg.startsWith('front'), lift = front ? W.lift.front : W.lift.rear;
    let z, y, pitch;
    if (p < W.stance) { const u = p / W.stance; z = W.stride / 2 - W.stride * u; y = u > 0.8 ? 0.015 * ((u - 0.8) / 0.2) ** 2 : 0; pitch = u > 0.8 ? -12 * (u - 0.8) / 0.2 : 0; }
    else { const s = (p - W.stance) / (1 - W.stance); z = -W.stride / 2 + W.stride * (s - Math.sin(2 * Math.PI * s) / (2 * Math.PI)); y = lift * Math.sin(Math.PI * s); pitch = -12 * (1 - s) - 18 * Math.sin(Math.PI * s); }
    rig.place(leg, [0, y, z], pitch);
  }
  yaw(rig, NECK, 2 * Math.sin(a + 0.6)); pitchUp(rig, HEAD, 3 * Math.sin(2 * a + 1.2)); yaw(rig, HEAD, -1.5 * Math.sin(a));
}

/** The roar: it crouches with its head low, rears up on its hind legs with its forepaws off the ground, throws its head
    up with its beak wide and shakes it as it roars, then slams its forepaws down. */
const ROAR = { duration: 3.2, roarAt: 0.8, slamAt: 2.15 };
function roar(rig: Rig, t: number) {
  const S = ROAR.slamAt;
  const rear = keys(t, [[0, 0], [0.45, -6], [0.9, 30], [1.85, 32], [S, 2, 'in'], [2.55, -2], [3.2, 0]]);
  rig.move(PELVIS, [0, keys(t, [[0, 0], [0.45, -0.03], [0.9, 0.005], [1.85, 0.008], [S, -0.025, 'in'], [3.2, 0]]), keys(t, [[0, 0], [0.45, -0.015], [0.9, -0.04], [1.85, -0.04], [S, 0, 'in'], [3.2, 0]])]);
  pitchUp(rig, PELVIS, rear * 0.6); pitchUp(rig, MIDBACK, rear * 0.25); pitchUp(rig, CHEST, rear * 0.15);
  rig.update();
  const paw = keys(t, [[0, 0], [0.45, 0], [0.9, 0.2], [1.85, 0.22], [S, 0, 'in'], [3.2, 0]]), reach = keys(t, [[0, 0], [0.45, -0.02], [0.9, 0.05], [1.85, 0.06], [S, 0, 'in'], [3.2, 0]]);
  const spread = keys(t, [[0.45, 0], [0.9, 0.05], [1.85, 0.06], [S, 0, 'in']]), curl = paw > 0.01 ? -35 * paw / 0.22 : 0;
  rig.place('frontRight', [spread, paw, reach], curl);
  rig.place('frontLeft', [-spread, paw, reach], curl);
  rig.place('rearLeft', [0, 0, 0]); rig.place('rearRight', [0, 0, 0]);
  const shake = t > ROAR.roarAt && t < 1.9 ? Math.sin(Math.PI * (t - ROAR.roarAt) / (1.9 - ROAR.roarAt)) : 0;
  pitchUp(rig, NECK, keys(t, [[0, 0], [0.45, -14], [0.9, 2], [1.85, 0], [S, -8, 'in'], [3.2, 0]]));
  pitchUp(rig, HEAD, keys(t, [[0, 0], [0.45, -8], [0.95, 14], [1.85, 10], [2.2, -5], [3.2, 0]]));
  yaw(rig, HEAD, 5 * shake * Math.sin(2 * Math.PI * 7 * t)); roll(rig, HEAD, 3.5 * shake * Math.sin(2 * Math.PI * 5.3 * t));
  rig.turn(JAW, [1, 0, 0], keys(t, [[0, 0], [0.55, 4], [0.95, 42], [1.75, 36], [2.05, 0], [3.2, 0]]));
}

/** At rest: it breathes (the chest rising), shifts its weight and looks about. */
const IDLE = { duration: 4 };
function idle(rig: Rig, t: number) {
  const a = 2 * Math.PI * t / IDLE.duration;
  rig.move(PELVIS, [0.004 * Math.sin(a), 0.003 * Math.sin(2 * a), 0]);
  pitchUp(rig, CHEST, 1.2 * Math.sin(2 * a)); roll(rig, PELVIS, 1 * Math.sin(a));
  rig.update();
  for (const leg of Object.keys(LEGS)) rig.place(leg, [0, 0, 0]);
  yaw(rig, NECK, 9 * Math.sin(a)); pitchUp(rig, HEAD, 3 * Math.sin(2 * a + 1)); rig.turn(JAW, [1, 0, 0], 3 * Math.max(0, Math.sin(2 * a)));
}

/** When each paw comes down in the walk (its stance begins), for the footsteps. */
const steps = Object.entries(PHASE).map(([leg, off]) => ({ t: (off % 1) * WALK.cycle, sound: leg.startsWith('front') ? 'pawFront' : 'pawRear', at: leg }));

export const CLIPS: Record<string, ClipDef> = {
  idle: { duration: IDLE.duration, loop: true, pose: idle, events: [] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: steps },
  roar: { duration: ROAR.duration, loop: false, pose: roar, events: [{ t: 0.15, sound: 'inhale' }, { t: ROAR.roarAt, sound: 'roar', loud: true }, { t: ROAR.slamAt, sound: 'slam', loud: true }] },
};
/** How far the walk carries it each second (the stride over the time a paw is down), in the model's units. */
export const WALK_SPEED = WALK.stride / (WALK.stance * WALK.cycle);
