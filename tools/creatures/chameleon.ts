/* The Chameleon Wyvern (the owner's model from Tripo, 2026-10-05, through their EDA-ModelWebViewer; docs/creatures.md): a
   feathered wyvern about the size of a pony, on two legs, its wings its arms (a clawed wrist, four fingers spanning the
   membrane), a beaked head with its mouth open and its tongue lolling, and a feathered tail ending in a spiked club. It
   came turned about 38 degrees to its left, so the tool turns it to face +z first (`face`); in that frame (x left-right,
   y up, z forward) it stands 0.72 high, its wings raised, and its middle runs at about x = 0.045. The owner's viewer named
   its bones (root, spine, head_01 to head_09, arm_L and arm_R with their fingers, leg_L and leg_R with their toes, tail_01
   to tail_07) and mended their weights, so its skin is kept (`SKIN` null), only the head's weights smeared over the chain
   under it (head_06 to head_09) given to the skull and its lower jaw to the jaw outright. The root stands on the ground
   under its middle, carrying the legs, the tail and the spine. Read with `npm run animate-creature -- --bones --face=-38`. */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';

/** Turned this many degrees about the vertical before anything reads it: its body from 38 degrees left of +z to +z. */
export const face = -38;

/** The legs, digitigrade: hip, knee and hock in the IK, the foot below the hock kept at its slope, its toes kept flat. */
export const LEGS: Record<string, LegDef> = {
  left: { root: 'leg_L_01', mid: 'leg_L_02', end: 'leg_L_03', paw: ['leg_L_03'], toes: ['leg_L_04'] },
  right: { root: 'leg_R_01', mid: 'leg_R_02', end: 'leg_R_03', paw: ['leg_R_03'], toes: ['leg_R_04'] },
};
const ROOT = 'root',
  BODY = 'spine_01',
  CHEST = 'spine_02';
const NECK = ['head_01', 'head_02', 'head_03', 'head_04'],
  SKULL = 'head_05',
  JAW = 'head_06';
const TAIL = ['tail_01', 'tail_02', 'tail_03', 'tail_04', 'tail_05', 'tail_06'];
/** Each wing: the shoulder (arm_X_02, from the collarbone arm_X_01), the elbow, the wrist, the tip of its long finger
    (Tripo's socket there), and the fingers that span it, the long one first and the one nearest the body last. */
const WINGS = {
  left: {
    side: 1,
    shoulder: 'arm_L_02',
    elbow: 'arm_L_03',
    wrist: 'arm_L_04',
    tip: 'socket_hand_L',
    fingers: ['arm_L_05', 'arm_L_aux_01', 'arm_L_aux_04', 'arm_L_aux_07'],
  },
  right: {
    side: -1,
    shoulder: 'arm_R_02',
    elbow: 'arm_R_03',
    wrist: 'arm_R_04',
    tip: 'socket_hand_R',
    fingers: ['arm_R_05', 'arm_R_aux_01', 'arm_R_aux_03', 'arm_R_aux_05', 'arm_R_aux_08'],
  },
} as const;
type Wing = (typeof WINGS)[keyof typeof WINGS];
/** A wing's pose: the way its upper arm, forearm and hand lie (the left wing's; the right's mirrored), and how far its
    fingers fan open from how Tripo left them (closed, below 0). Tripo left them raised in a V (`raised`); at rest they are
    folded along its flanks, the wrists forward by the shoulders and the fingers laid back over the hips (`folded`); for
    the screech they are thrown wide (`wide`). */
interface WingPose {
  upper: number[];
  fore: number[];
  hand: number[];
  fan: number;
}
const WING_POSES: Record<'raised' | 'folded' | 'wide', WingPose> = {
  raised: { upper: [0.49, 0.71, -0.51], fore: [0.37, 0.41, 0.83], hand: [0.63, 0.27, -0.72], fan: 0 },
  folded: { upper: [0.3, -0.3, -0.9], fore: [0.12, 0.6, 0.8], hand: [0.22, -0.12, -0.97], fan: -14 },
  wide: { upper: [0.72, 0.62, -0.2], fore: [0.7, 0.45, 0.55], hand: [0.8, 0.48, -0.36], fan: 10 },
};
const mix = (a: WingPose, b: WingPose, u: number): WingPose => {
  const l = (x: number[], y: number[]) => x.map((v, i) => v + (y[i] - v) * u);
  return {
    upper: l(a.upper, b.upper),
    fore: l(a.fore, b.fore),
    hand: l(a.hand, b.hand),
    fan: a.fan + (b.fan - a.fan) * u,
  };
};
/** A wing laid in pose `p`, its shoulder raised (or lowered) by `beat` degrees more: a wingbeat. */
function wing(rig: Rig, w: Wing, p: WingPose, beat = 0) {
  const m = (d: number[]) => [d[0] * w.side, d[1], d[2]];
  rig.point(w.shoulder, w.elbow, m(p.upper));
  if (beat) rig.turn(w.shoulder, [0, 0, 1], w.side * beat);
  rig.point(w.elbow, w.wrist, m(p.fore));
  rig.point(w.wrist, w.tip, m(p.hand));
  // (the fingers behind the long one fanned about the wing's own plane)
  const a = rig.at(w.elbow),
    b = rig.at(w.wrist),
    c = rig.at(w.tip),
    n = b.clone().sub(a).cross(c.clone().sub(b)).normalize();
  w.fingers.forEach((f, i) => {
    if (i) rig.turn(f, n.toArray(), ((p.fan * i) / (w.fingers.length - 1)) * w.side);
  });
}
const wings = (rig: Rig, p: WingPose, beat = 0) => {
  wing(rig, WINGS.left, p, beat);
  wing(rig, WINGS.right, p, beat);
};
/** At rest: folded, its shoulders raised or its fingers opened a little by `d`. */
const folded = (rig: Rig, raise = 0, fan = 0, beat = 0) =>
  wings(rig, { ...WING_POSES.folded, fan: WING_POSES.folded.fan + fan }, beat + raise);

/** Tripo's weights kept (see above). */
export const SKIN: SkinBone[] | null = null;
/** The head's weights on the bones under the skull (Tripo ran its head chain on down the lower jaw and out along the
    tongue, smearing the whole head over it) given to the skull, so a turn of the jaw moves the jaw alone. */
export const REMAP: Record<string, string> = { head_06: SKULL, head_07: SKULL, head_08: SKULL, head_09: SKULL };
/** The lower jaw and the lolling tongue: below the line of the mouth, ahead of its corners. The head looks 45 degrees to
    its right of the body (the clips turn it straight), so "ahead" is along that way from the corners. */
const CORNER = [-0.057, 0.446],
  AHEAD = [-0.68, 0.73];
export const jawOf = (p: { x: number; y: number; z: number }) =>
  p.y < 0.272 && p.y > 0.15 && (p.x - CORNER[0]) * AHEAD[0] + (p.z - CORNER[1]) * AHEAD[1] > -0.005 ? JAW : null;
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
// the creature's frame: nose up is a turn about +x by a negative angle, tail up by a positive one; a turn about +y swings
// the nose to +x (its left)
const pitchUp = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [1, 0, 0], -deg);
const yaw = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 1, 0], deg);
const roll = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 0, 1], deg);
/** The tail raised (or lowered, below 0) by `up` degrees, spread along its first bones; `lash` swings it to its left and
    `curl` bends its club further up. */
function tail(rig: Rig, up: number, lash = 0, curl = 0) {
  TAIL.forEach((b, i) => {
    const k = [0.35, 0.25, 0.18, 0.12, 0.06, 0.04][i];
    rig.turn(b, [1, 0, 0], up * k + curl * (i > 2 ? 0.3 : 0));
    yaw(rig, b, lash * k);
  });
}

/** The head brought straight (Tripo left it looking 45 degrees to its right): the turn spread down the neck. */
const straighten = (rig: Rig) => {
  yaw(rig, NECK[1], 14);
  yaw(rig, NECK[2], 14);
  yaw(rig, NECK[3], 12);
  yaw(rig, SKULL, 6);
};
/** The jaw opened (or shut, below 0) by `deg` from how Tripo left it, open. */
const jaw = (rig: Rig, deg: number) => rig.turn(JAW, [1, 0, 0], deg);

/** Where each foot stands when it stands square (its hock moved from where Tripo left it, the left a stride ahead). */
const STANCE: Record<string, [number, number, number]> = { left: [-0.01, 0, -0.05], right: [0.01, 0, 0.06] };
/** A foot at its stance moved by `d`, its foot tipped by `pitch` and its toes by `toes`. */
const stand = (rig: Rig, leg: string, d: readonly number[] = [0, 0, 0], pitch = 0, toes = 0, turn = 0) =>
  rig.place(leg, [STANCE[leg][0] + d[0], STANCE[leg][1] + d[1], STANCE[leg][2] + d[2]], pitch, toes, turn);
/** A foot carried round with the body turned `deg` about the root (and lifted by `lift`): where its stance turns to. */
function turned(rig: Rig, leg: string, deg: number, lift = 0) {
  const f = rig.foot(leg),
    a = (deg * Math.PI) / 180,
    x = f.x + STANCE[leg][0],
    z = f.z + STANCE[leg][2];
  const nx = x * Math.cos(a) + z * Math.sin(a),
    nz = -x * Math.sin(a) + z * Math.cos(a);
  const tuck = Math.min(1, lift / 0.04);
  stand(rig, leg, [nx - x, lift, nz - z], -20 * tuck, -25 * tuck, deg);
}

/** The walk: a bird's strut on two legs, each foot down for 60% of the cycle; the body drops onto each foot and swings
    over it, the head thrusts forward and draws back with each step as a bird's does, the wings folded with a small
    bounce, and the club of the tail swings against the body. */
const WALK = { cycle: 0.9, stance: 0.6, stride: 0.2, lift: 0.05 };
const PHASE: Record<string, number> = { left: 0, right: 0.5 };
function walk(rig: Rig, t: number) {
  const W = WALK,
    f = t / W.cycle,
    a = 2 * Math.PI * f;
  rig.move(ROOT, [0.012 * Math.sin(a), -0.016 + 0.01 * Math.cos(2 * a), 0]);
  roll(rig, ROOT, -2 * Math.sin(a));
  yaw(rig, ROOT, 3 * Math.sin(a + 0.5));
  rig.update();
  for (const [leg, off] of Object.entries(PHASE)) {
    const p = (((f - off) % 1) + 1) % 1;
    let z,
      y,
      pitch = 0,
      toes = 0;
    if (p < W.stance) {
      const u = p / W.stance;
      z = W.stride / 2 - W.stride * u;
      y = u > 0.85 ? 0.01 * ((u - 0.85) / 0.15) ** 2 : 0;
      pitch = u > 0.85 ? (-16 * (u - 0.85)) / 0.15 : 0;
    } else {
      const s = (p - W.stance) / (1 - W.stance);
      z = -W.stride / 2 + W.stride * (s - Math.sin(2 * Math.PI * s) / (2 * Math.PI));
      y = W.lift * Math.sin(Math.PI * s);
      pitch = -16 * (1 - s) - 18 * Math.sin(Math.PI * s);
      toes = -30 * Math.sin(Math.PI * s);
    }
    stand(rig, leg, [0, y, z], pitch, toes);
  }
  pitchUp(rig, BODY, -4 + 1.5 * Math.cos(2 * a));
  yaw(rig, CHEST, -3 * Math.sin(a + 0.8));
  tail(rig, 4 + 3 * Math.cos(2 * a + 1), -12 * Math.sin(a + 0.3));
  folded(rig, 0, 0, 4 * Math.sin(2 * a + 0.7));
  straighten(rig);
  // (the bird's head-bob: thrust forward through the step, drawn back as the next foot lands)
  const bob = Math.sin(2 * a - 0.6);
  pitchUp(rig, NECK[0], 6 * bob);
  pitchUp(rig, NECK[2], -7 * bob);
  pitchUp(rig, SKULL, 3 * bob);
  yaw(rig, NECK[1], 3 * Math.sin(a));
}

/** The showpiece (played as the roar), both of the owner's choice in turn: it crouches and growls, rears up throwing its
    wings wide and screeches with its jaw wide, shaking its head; then hops round, slams the club of its tail down where it
    was facing and again as it bounces, and hops back round to face where it began. */
const ROAR = {
  duration: 4.9,
  growlAt: 0.05,
  screechAt: 0.85,
  spin: 165,
  hopAt: 2.45,
  landAt: 2.85,
  slamAt: 3.0,
  bounceAt: 3.42,
  backAt: 3.75,
  backLand: 4.2,
};
function roar(rig: Rig, t: number) {
  const R = ROAR;
  // the turn round and back, in the air
  const spin = keys(t, [
    [0, 0],
    [R.hopAt, 0],
    [R.landAt, R.spin],
    [R.backAt, R.spin],
    [R.backLand, 0],
    [R.duration, 0],
  ]);
  const hop = Math.max(
    t > R.hopAt && t < R.landAt ? Math.sin((Math.PI * (t - R.hopAt)) / (R.landAt - R.hopAt)) : 0,
    t > R.backAt && t < R.backLand ? Math.sin((Math.PI * (t - R.backAt)) / (R.backLand - R.backAt)) : 0,
  );
  // the body: crouched as it growls, risen and rocked back as it screeches, crouched to hop, the hops, the slam's weight
  const low = keys(t, [
    [0, 0],
    [0.45, -0.035],
    [0.8, 0.01],
    [1.9, 0.01],
    [2.25, -0.03],
    [R.hopAt, -0.04],
    [R.landAt, -0.03],
    [R.slamAt, -0.045],
    [3.3, -0.03],
    [R.backAt, -0.035],
    [R.backLand, -0.025],
    [4.6, 0],
    [R.duration, 0],
  ]);
  rig.move(ROOT, [0, low + 0.07 * hop, 0]);
  // rearing: the body tipped up from the hips as it screeches, forward as the tail goes over
  pitchUp(
    rig,
    BODY,
    keys(t, [
      [0, 0],
      [0.45, -8],
      [0.85, 20],
      [1.9, 18],
      [2.25, -4],
      [R.landAt, -6],
      [R.slamAt, -14, 'in'],
      [3.3, -8],
      [R.backLand, -4],
      [4.6, 0],
      [R.duration, 0],
    ]),
  );
  // the tail: low as it rears, swung up over its back as it hops, slammed down, bounced, and slammed again
  tail(
    rig,
    keys(t, [
      [0, 0],
      [0.85, -10],
      [1.9, -8],
      [R.hopAt, 6],
      [R.landAt, 55],
      [R.slamAt, -38, 'in'],
      [3.25, 6],
      [R.bounceAt, -30, 'in'],
      [3.6, -12],
      [R.backLand, 0],
      [R.duration, 0],
    ]),
    keys(t, [
      [0, 0],
      [0.85, 0],
      [1.9, 0],
      [R.hopAt, -20],
      [R.landAt, 10],
      [R.slamAt, 0],
      [R.backAt, 0],
      [R.backLand, 14],
      [4.6, 0],
      [R.duration, 0],
    ]),
    keys(t, [
      [0, 0],
      [R.hopAt, 0],
      [R.landAt, 20],
      [R.slamAt, -10],
      [3.6, 0],
      [R.duration, 0],
    ]),
  );
  // the wings: half-raised as it growls, thrown wide and fanned for the screech, beating twice, half-spread for balance
  // through the hops, folded again
  const spread = keys(t, [
    [0, 0],
    [0.45, 0.35],
    [0.85, 1],
    [1.9, 1],
    [2.25, 0.4],
    [R.backLand, 0.4],
    [4.7, 0],
    [R.duration, 0],
  ]);
  const beat = t > 0.85 && t < 1.9 ? 12 * Math.sin(2 * Math.PI * 1.9 * (t - 0.85)) : 0;
  wings(rig, mix(WING_POSES.folded, WING_POSES.wide, spread), beat);
  // the head: low and drawn in as it growls, thrown up as it screeches and shaken, then watching the slam
  straighten(rig);
  pitchUp(
    rig,
    NECK[0],
    keys(t, [
      [0, 0],
      [0.45, -12],
      [0.85, 10],
      [1.9, 8],
      [2.25, -4],
      [R.slamAt, -10],
      [3.6, -6],
      [4.6, 0],
      [R.duration, 0],
    ]),
  );
  pitchUp(
    rig,
    NECK[2],
    keys(t, [
      [0, 0],
      [0.45, -8],
      [0.85, 14],
      [1.9, 12],
      [2.25, 0],
      [R.duration, 0],
    ]),
  );
  pitchUp(
    rig,
    SKULL,
    keys(t, [
      [0, 0],
      [0.45, 6],
      [0.85, 22],
      [1.75, 20],
      [2.1, 0],
      [R.slamAt, 8],
      [3.6, 0],
      [R.duration, 0],
    ]),
  );
  const shake = t > R.screechAt && t < 1.9 ? Math.sin((Math.PI * (t - R.screechAt)) / (1.9 - R.screechAt)) : 0;
  yaw(rig, SKULL, 7 * shake * Math.sin(2 * Math.PI * 7 * t));
  roll(rig, SKULL, 5 * shake * Math.sin(2 * Math.PI * 5.3 * t));
  // the jaw: half-shut as it growls, wide for the screech, snapping as the club lands
  jaw(
    rig,
    keys(t, [
      [0, 0],
      [0.4, -10],
      [0.75, -6],
      [0.95, 16],
      [1.8, 14],
      [2.1, 0],
      [R.slamAt, -8],
      [3.2, 4],
      [4.6, 0],
      [R.duration, 0],
    ]),
  );
  // turned round last, all it carries with it (each turn above is about the frame it stood in), then the feet: carried
  // round in the air, planted where they land
  yaw(rig, ROOT, spin);
  const inAir = (t > R.hopAt && t < R.landAt) || (t > R.backAt && t < R.backLand);
  for (const leg of Object.keys(LEGS)) turned(rig, leg, spin, inAir ? 0.05 * hop : 0);
}

/** At rest: it breathes, its tail club sways, its folded wings settle and ruffle once, and its head holds still and then
    cocks to a new way, a bird's. */
const IDLE = { duration: 4 };
function idle(rig: Rig, t: number) {
  const a = (2 * Math.PI * t) / IDLE.duration;
  rig.move(ROOT, [0.003 * Math.sin(a), 0.004 * Math.sin(2 * a) - 0.004, 0]);
  rig.update();
  for (const leg of Object.keys(LEGS)) stand(rig, leg);
  pitchUp(rig, BODY, 1.5 * Math.sin(2 * a));
  pitchUp(rig, CHEST, 1 * Math.sin(2 * a + 0.4));
  tail(rig, 3 * Math.sin(a + 0.6), 10 * Math.sin(a));
  const ruffle = t > 2.6 && t < 3.2 ? Math.sin((Math.PI * (t - 2.6)) / 0.6) : 0;
  folded(rig, 2 * Math.sin(2 * a) + 14 * ruffle, 12 * ruffle, 5 * ruffle * Math.sin(2 * Math.PI * 9 * t));
  straighten(rig);
  yaw(
    rig,
    NECK[2],
    keys(t, [
      [0, 0],
      [0.6, 0],
      [0.7, 14],
      [1.7, 14],
      [1.8, -10],
      [2.9, -10],
      [3.05, 0],
      [4, 0],
    ]),
  );
  roll(
    rig,
    SKULL,
    keys(t, [
      [0, 0],
      [0.9, 0],
      [1.0, 12],
      [1.6, 12],
      [1.7, 0],
      [4, 0],
    ]),
  );
  pitchUp(
    rig,
    SKULL,
    keys(t, [
      [0, 0],
      [1.8, 0],
      [1.9, -6],
      [2.9, -6],
      [3.05, 0],
      [4, 0],
    ]),
  );
  jaw(
    rig,
    keys(t, [
      [0, 0],
      [2.0, 0],
      [2.12, -8],
      [2.3, 0],
      [4, 0],
    ]),
  );
}

/** When each foot comes down in the walk (its stance begins), for the footsteps. */
const steps = Object.entries(PHASE).map(([leg, off]) => ({ t: (off % 1) * WALK.cycle, sound: 'clawRear', at: leg }));

export const CLIPS: Record<string, ClipDef> = {
  idle: { duration: IDLE.duration, loop: true, pose: idle, events: [{ t: 2.1, sound: 'chitter' }] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: steps },
  roar: {
    duration: ROAR.duration,
    loop: false,
    pose: roar,
    events: [
      { t: ROAR.growlAt, sound: 'chameleonGrowl' },
      { t: ROAR.screechAt, sound: 'chameleonScreech', loud: true },
      { t: ROAR.landAt, sound: 'clawRear' },
      { t: ROAR.slamAt, sound: 'clubSlam', loud: true },
      { t: ROAR.bounceAt, sound: 'clubSlam' },
      { t: ROAR.backLand, sound: 'clawRear' },
    ],
  },
};
/** How far the walk carries it each second (the stride over the time a foot is down), in the model's units. */
export const WALK_SPEED = WALK.stride / (WALK.stance * WALK.cycle);
