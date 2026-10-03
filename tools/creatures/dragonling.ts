/* The dragonling (the owner's Tripo model, 2026-10-03; docs/creatures.md): a four-legged dragonling about the size of a
   medium dog, its long neck carrying a crested, fanged head. Tripo set it facing +x, so the tool turns it to face +z first
   (`face`); in that frame (x left-right, y up, z forward) it stands 0.98 high and 0.82 long. Tripo rigged it with a
   two-legged skeleton (bone_0 to bone_68): the spine runs up from the hips (bone_1) to the skull (bone_7), the forelegs
   hang from the chest (bone_4) as arms, the hind legs and the short tail from the root (bone_0). Its rest pose is caught
   mid-stride: the right hind leg stretched back with its foot upright, the head turned a little to its left; the clips
   bring both hind feet to one stance and the head straight. What each bone is was read from where it sits and what it
   carries (`npm run animate-creature -- --bones --face=-90`). */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';

/** Turned this many degrees about the vertical before anything reads it: its snout from +x to +z. */
export const face = -90;

/** The legs: the forelegs' shoulder, elbow and wrist, the hand kept as it lay; the hind legs digitigrade, hip, knee and
    hock, the upright foot below the hock kept at its angle and its toes kept flat. */
export const LEGS: Record<string, LegDef> = {
  frontLeft: { root: 'bone_16', mid: 'bone_17', end: 'bone_18', paw: ['bone_18'] },
  frontRight: { root: 'bone_32', mid: 'bone_33', end: 'bone_34', paw: ['bone_34'] },
  rearLeft: { root: 'bone_47', mid: 'bone_48', end: 'bone_50', paw: ['bone_50'], toes: ['bone_51'] },
  rearRight: { root: 'bone_56', mid: 'bone_57', end: 'bone_58', paw: ['bone_58'], toes: ['bone_60'] },
};
const ROOT = 'bone_0', HIPS = 'bone_1', BACK = 'bone_3', CHEST = 'bone_4', NECK = 'bone_5', NECK2 = 'bone_6', HEAD = 'bone_7', JAW = 'bone_9';
const TAIL = 'bone_67', TAIL2 = 'bone_68';

/** The skin bound again: the spine wide, so its bones reach far; the neck and head; each leg's segments kept to their own
    side and height; the short tail kept to the rump; the lower jaw given to the jaw outright. */
const SPINE = 2.6, LIMB = 1;
export const SKIN: SkinBone[] = [
  { bone: ROOT, from: [0.01, 0.33, -0.3], to: [0.01, 0.36, -0.15], reach: SPINE },
  { bone: HIPS, from: 'bone_1', to: 'bone_2', reach: SPINE },
  { bone: 'bone_2', from: 'bone_2', to: 'bone_3', reach: SPINE },
  { bone: BACK, from: 'bone_3', to: [0.02, 0.5, 0.16], reach: SPINE },
  { bone: CHEST, from: [0.02, 0.5, 0.16], to: 'bone_5', reach: SPINE },
  { bone: NECK, from: 'bone_5', to: 'bone_6', reach: 1.8 },
  { bone: NECK2, from: 'bone_6', to: 'bone_7', reach: 1.8 },
  { bone: HEAD, from: 'bone_7', to: [-0.06, 0.8, 0.36], reach: 1.9, above: 0.7 },
  { bone: TAIL, from: 'bone_67', to: 'bone_68', reach: 1.2, behind: -0.24, above: 0.2 },
  { bone: TAIL2, from: 'bone_68', to: [-0.03, 0.25, -0.37], reach: 1.2, behind: -0.27, above: 0.2 },
  { bone: 'bone_16', from: 'bone_16', to: 'bone_17', side: -1, below: 0.56, reach: LIMB },
  { bone: 'bone_17', from: 'bone_17', to: 'bone_18', side: -1, below: 0.4, reach: LIMB },
  { bone: 'bone_18', from: 'bone_18', to: [-0.19, 0.03, 0.33], side: -1, below: 0.2, reach: LIMB },
  { bone: 'bone_32', from: 'bone_32', to: 'bone_33', side: 1, below: 0.56, reach: LIMB },
  { bone: 'bone_33', from: 'bone_33', to: 'bone_34', side: 1, below: 0.42, reach: LIMB },
  { bone: 'bone_34', from: 'bone_34', to: [0.17, 0.03, 0.22], side: 1, below: 0.25, reach: LIMB },
  { bone: 'bone_47', from: 'bone_47', to: 'bone_48', side: -1, below: 0.45, reach: LIMB },
  { bone: 'bone_48', from: 'bone_48', to: 'bone_50', side: -1, below: 0.3, reach: LIMB },
  { bone: 'bone_50', from: 'bone_50', to: 'bone_51', side: -1, below: 0.18, reach: LIMB },
  { bone: 'bone_51', from: 'bone_51', to: [-0.15, 0.015, -0.03], side: -1, below: 0.07, reach: LIMB },
  { bone: 'bone_56', from: 'bone_56', to: 'bone_57', side: 1, below: 0.45, reach: LIMB },
  { bone: 'bone_57', from: 'bone_57', to: 'bone_58', side: 1, below: 0.3, reach: LIMB },
  { bone: 'bone_58', from: 'bone_58', to: 'bone_60', side: 1, below: 0.2, reach: LIMB },
  { bone: 'bone_60', from: 'bone_60', to: [0.18, 0.017, -0.32], side: 1, below: 0.06, reach: LIMB },
];
/** The lower jaw: below the line of the mouth (the upper teeth stay with the head), in front of the throat, the head
    turned a little to its left. */
export const jawOf = (p: { x: number; y: number; z: number }) => p.z > 0.31 && p.y > 0.64 && p.y < 0.74 && p.x > -0.16 && p.x < 0.04 ? JAW : null;
/** The bones whose place (not only their turn) changes in a clip. */
export const MOVING = [ROOT];

const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
/** A value through keys [time, value], eased in and out between them, or only in (`'in'`: gathering speed, a snap). */
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

/** Where each foot stands when it stands square (its ankle or hock moved from where Tripo left it) and how its upright
    hind foot is tipped: the right hind leg was stretched back with its foot straight up, so both hocks come under the hips
    and the right foot is tipped forward to the left one's slope (about 40 degrees from upright). */
const STANCE: Record<string, { d: [number, number, number]; pitch: number }> = {
  frontLeft: { d: [0, 0, 0], pitch: 0 },
  frontRight: { d: [0, 0, 0], pitch: 0 },
  rearLeft: { d: [0.004, 0, -0.08], pitch: 0 },
  rearRight: { d: [0, -0.025, 0.09], pitch: 37 },
};
/** Every foot square under it, moved by `d` (and its hand or foot tipped by `pitch`, its toes by `toes`). */
function stand(rig: Rig, leg: string, d: readonly number[] = [0, 0, 0], pitch = 0, toes = 0) {
  const S = STANCE[leg];
  rig.place(leg, [S.d[0] + d[0], S.d[1] + d[1], S.d[2] + d[2]], S.pitch + pitch, toes);
}
/** The head brought straight (Tripo left it turned a little to its left). */
const straighten = (rig: Rig) => yaw(rig, NECK, 7);

/** The walk: a quick, prowling lateral-sequence walk (hind then fore on one side, then the other), low and stalking, each
    foot down for 60% of the cycle; the body bobs twice a cycle and swings over the planted side, the tail sways against
    it, and the head is held level and still, a hunter's, with a small nod. */
const WALK = { cycle: 0.8, stance: 0.6, stride: 0.2, lift: { front: 0.055, rear: 0.045 } };
const PHASE: Record<string, number> = { rearLeft: 0, frontLeft: 0.25, rearRight: 0.5, frontRight: 0.75 };
function walk(rig: Rig, t: number) {
  const W = WALK, f = t / W.cycle, a = 2 * Math.PI * f;
  rig.move(ROOT, [0, -0.014 + 0.006 * Math.cos(2 * a), 0]);
  roll(rig, HIPS, 2.5 * Math.sin(a)); yaw(rig, HIPS, 2.5 * Math.sin(a + 0.6));
  yaw(rig, CHEST, -3.5 * Math.sin(a + 0.9)); roll(rig, CHEST, -2 * Math.sin(a + 1.2)); pitchUp(rig, CHEST, 1.2 * Math.cos(2 * a + 0.6));
  rig.update();
  for (const [leg, off] of Object.entries(PHASE)) {
    const p = ((f - off) % 1 + 1) % 1, front = leg.startsWith('front'), lift = front ? W.lift.front : W.lift.rear;
    let z, y, pitch, toes = 0;
    if (p < W.stance) { const u = p / W.stance; z = W.stride / 2 - W.stride * u; y = u > 0.8 ? 0.012 * ((u - 0.8) / 0.2) ** 2 : 0; pitch = u > 0.8 ? -14 * (u - 0.8) / 0.2 : 0; }
    else { const s = (p - W.stance) / (1 - W.stance); z = -W.stride / 2 + W.stride * (s - Math.sin(2 * Math.PI * s) / (2 * Math.PI)); y = lift * Math.sin(Math.PI * s); pitch = -14 * (1 - s) - 20 * Math.sin(Math.PI * s); toes = -25 * Math.sin(Math.PI * s); }
    stand(rig, leg, [0, y, z], pitch, front ? 0 : toes);
  }
  yaw(rig, TAIL, -9 * Math.sin(a + 0.4)); yaw(rig, TAIL2, -14 * Math.sin(a - 0.4));
  straighten(rig);
  yaw(rig, NECK, 3.5 * Math.sin(a + 0.9)); pitchUp(rig, NECK2, -2 * Math.sin(2 * a + 0.8)); pitchUp(rig, HEAD, 2.5 * Math.sin(2 * a + 1.4)); yaw(rig, HEAD, -2 * Math.sin(a));
}

/** The showpiece (played as the roar): it sinks low and draws its neck back into an S, hissing with its jaw ajar; strikes
    forward and snaps twice; then throws its head up and shrieks with its jaw wide, shaking it, and settles. */
const ROAR = { duration: 3.1, hissAt: 0.1, snapAt: 0.74, snap2At: 0.98, shriekAt: 1.4 };
function roar(rig: Rig, t: number) {
  const R = ROAR;
  // the body: sinks and draws back, lunges, rocks back as the head goes up, settles
  rig.move(ROOT, [0, keys(t, [[0, 0], [0.5, -0.035], [0.7, -0.02], [1.1, -0.02], [1.45, -0.005], [2.4, -0.005], [3.1, 0]]), keys(t, [[0, 0], [0.5, -0.03], [R.snapAt, 0.05, 'in'], [1.1, 0.04], [1.45, -0.01], [2.4, -0.01], [3.1, 0]])]);
  pitchUp(rig, HIPS, keys(t, [[0, 0], [0.5, -5], [R.snapAt, -9], [1.1, -6], [1.5, 7], [2.3, 6], [3.1, 0]]));
  pitchUp(rig, CHEST, keys(t, [[0, 0], [0.5, -4], [R.snapAt, -6], [1.5, 4], [2.3, 3], [3.1, 0]]));
  rig.update();
  for (const leg of Object.keys(LEGS)) stand(rig, leg);
  // the tail: lashes as it strikes, held up as it shrieks
  yaw(rig, TAIL, keys(t, [[0, 0], [0.5, -10], [R.snapAt, 14], [1.1, -8], [1.5, 0], [3.1, 0]]));
  pitchUp(rig, TAIL, keys(t, [[0, 0], [0.5, 6], [1.5, 14], [2.3, 12], [3.1, 0]])); yaw(rig, TAIL2, keys(t, [[0, 0], [0.55, -14], [R.snapAt, 18], [1.15, -10], [1.6, 0], [3.1, 0]]));
  // the neck: drawn back into an S, thrown forward, drawn up for the shriek
  straighten(rig);
  pitchUp(rig, NECK, keys(t, [[0, 0], [0.5, 22], [R.snapAt, -26, 'in'], [0.86, -20], [R.snap2At, -28, 'in'], [1.15, -10], [1.5, 8], [2.3, 6], [3.1, 0]]));
  pitchUp(rig, NECK2, keys(t, [[0, 0], [0.5, 10], [R.snapAt, -8, 'in'], [1.15, -2], [1.5, 6], [2.3, 4], [3.1, 0]]));
  pitchUp(rig, HEAD, keys(t, [[0, 0], [0.5, -26], [R.snapAt, 6, 'in'], [0.86, 2], [R.snap2At, 8, 'in'], [1.15, 4], [1.5, 34], [2.25, 30], [2.6, -4], [3.1, 0]]));
  const shake = t > R.shriekAt && t < 2.3 ? Math.sin(Math.PI * (t - R.shriekAt) / (2.3 - R.shriekAt)) : 0;
  yaw(rig, HEAD, 6 * shake * Math.sin(2 * Math.PI * 8 * t)); roll(rig, HEAD, 4 * shake * Math.sin(2 * Math.PI * 6.1 * t) + keys(t, [[0, 0], [0.5, 8], [R.snapAt, 0], [3.1, 0]]));
  // the jaw: ajar as it hisses, wide before each snap and shut at it, wide for the shriek
  rig.turn(JAW, [1, 0, 0], keys(t, [[0, 0], [0.1, 0], [0.4, 12], [0.62, 30], [R.snapAt, 0, 'in'], [0.88, 26], [R.snap2At, 0, 'in'], [1.25, 4], [1.45, 34], [2.15, 30], [2.45, 0], [3.1, 0]]));
}

/** At rest: it breathes, its tail sways, and its head holds still then snaps to a new way, as a lizard's does. */
const IDLE = { duration: 4 };
function idle(rig: Rig, t: number) {
  const a = 2 * Math.PI * t / IDLE.duration;
  rig.move(ROOT, [0.003 * Math.sin(a), 0.003 * Math.sin(2 * a), 0]);
  pitchUp(rig, CHEST, 1.5 * Math.sin(2 * a)); roll(rig, HIPS, 1 * Math.sin(a));
  rig.update();
  for (const leg of Object.keys(LEGS)) stand(rig, leg);
  yaw(rig, TAIL, 7 * Math.sin(a)); yaw(rig, TAIL2, 11 * Math.sin(a - 0.8));
  straighten(rig);
  yaw(rig, NECK, keys(t, [[0, 0], [0.7, 0], [0.82, 13], [1.9, 13], [2.02, -10], [3.1, -10], [3.3, 0], [4, 0]]));
  pitchUp(rig, HEAD, keys(t, [[0, 0], [0.7, 0], [0.82, -6], [1.9, -6], [2.02, 4], [3.1, 4], [3.3, 0], [4, 0]]));
  roll(rig, HEAD, keys(t, [[0, 0], [1.2, 0], [1.3, 9], [1.75, 9], [1.85, 0], [4, 0]]));
  rig.turn(JAW, [1, 0, 0], keys(t, [[0, 0], [2.4, 0], [2.55, 7], [2.75, 0], [4, 0]]));
}

/** When each foot comes down in the walk (its stance begins), for the footsteps. */
const steps = Object.entries(PHASE).map(([leg, off]) => ({ t: (off % 1) * WALK.cycle, sound: leg.startsWith('front') ? 'clawFront' : 'clawRear', at: leg }));

export const CLIPS: Record<string, ClipDef> = {
  idle: { duration: IDLE.duration, loop: true, pose: idle, events: [{ t: 2.5, sound: 'chitter' }] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: steps },
  roar: { duration: ROAR.duration, loop: false, pose: roar, events: [{ t: ROAR.hissAt, sound: 'hiss' }, { t: ROAR.snapAt, sound: 'snap', loud: true }, { t: ROAR.snap2At, sound: 'snap', loud: true }, { t: ROAR.shriekAt, sound: 'shriek', loud: true }] },
};
/** How far the walk carries it each second (the stride over the time a foot is down), in the model's units. */
export const WALK_SPEED = WALK.stride / (WALK.stance * WALK.cycle);
