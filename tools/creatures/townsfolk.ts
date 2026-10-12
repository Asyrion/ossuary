/* The townspeople, the Ferryman, Dr. Jelly and Kaelith as made models (the owner's Tripo models, 2026-10-09, each rigged in
   Tripo with its Mixamo skeleton and no clips; docs/creatures.md, docs/tripo-prompts.md): one recipe for all thirteen, since
   they share the skeleton. Each is turned to face +z from its hips (`mixamoFacing`); three came through an FBX converter
   with their rest pose lost and every vertex on the hips, so their rest is rebuilt from the bind (creatureRig.ts's
   `restFromBind`) and their skin bound again from the Mixamo bones' segments (`MIXAMO_SKIN`); the other ten keep Tripo's
   weights. Their clips are animated here from each one's rest pose, whatever it is (each stands as Tripo left it, a prop
   in hand): `idle`, breathing and settling; `talk`, nodding and a gesture of the free hand, while it speaks at the Vigil;
   Dr. Jelly's `give`, the flask held out; Kaelith's `sweep` (its sword arm swung) and `kneel` (down on its knees, the feet
   kept where they stand by the legs' IK). The head's turn to the mage is the game's, on the head bone after the clip. */
import type { ClipDef, LegDef, Rig, SkinBone } from '../creatureRig';

const B = (n: string) => 'mixamorig:' + n;
const HIPS = B('Hips'), SPINE = B('Spine'), SPINE1 = B('Spine1'), SPINE2 = B('Spine2'), NECK = B('Neck'), HEAD = B('Head');
const arm = (s: 'Left' | 'Right') => ({ shoulder: B(s + 'Shoulder'), upper: B(s + 'Arm'), fore: B(s + 'ForeArm'), hand: B(s + 'Hand') });
const L = arm('Left'), R = arm('Right');

/** The legs for the IK (Kaelith's kneel): hip, knee, ankle, and the toes kept flat. */
export const MIXAMO_LEGS: Record<string, LegDef> = {
  left: { root: B('LeftUpLeg'), mid: B('LeftLeg'), end: B('LeftFoot'), paw: [B('LeftToeBase')] },
  right: { root: B('RightUpLeg'), mid: B('RightLeg'), end: B('RightFoot'), paw: [B('RightToeBase')] },
};

/** The skin bound again for a rig that lost its weights: the spine wide (robes hang from it), the head reaching far (hoods
    and hats), each limb kept to its own side, the hands to the middle finger's root. In the frame the model faces +z in,
    its left at +x. */
const LIMB = 1, BODY = 2.4;
export const MIXAMO_SKIN: SkinBone[] = [
  { bone: HIPS, from: HIPS, to: SPINE, reach: BODY },
  { bone: SPINE, from: SPINE, to: SPINE1, reach: BODY },
  { bone: SPINE1, from: SPINE1, to: SPINE2, reach: BODY },
  { bone: SPINE2, from: SPINE2, to: NECK, reach: BODY },
  { bone: NECK, from: NECK, to: HEAD, reach: 1.2 },
  { bone: HEAD, from: HEAD, to: B('HeadTop_End'), reach: 2.2 },
  ...(['Left', 'Right'] as const).flatMap((s): SkinBone[] => {
    const side = s === 'Left' ? 1 : -1, a = arm(s);
    return [
      { bone: a.shoulder, from: a.shoulder, to: a.upper, side, reach: LIMB },
      { bone: a.upper, from: a.upper, to: a.fore, side, reach: LIMB },
      { bone: a.fore, from: a.fore, to: a.hand, side, reach: LIMB },
      { bone: a.hand, from: a.hand, to: B(s + 'HandMiddle1'), side, reach: 1.3 },
      { bone: B(s + 'UpLeg'), from: B(s + 'UpLeg'), to: B(s + 'Leg'), side, reach: LIMB },
      { bone: B(s + 'Leg'), from: B(s + 'Leg'), to: B(s + 'Foot'), side, reach: LIMB },
      { bone: B(s + 'Foot'), from: B(s + 'Foot'), to: B(s + 'ToeBase'), side, reach: LIMB },
      { bone: B(s + 'ToeBase'), from: B(s + 'ToeBase'), to: B(s + 'Toe_End'), side, reach: LIMB },
    ];
  }),
];

const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
/** A value through keys [time, value], eased in and out between them. */
function keys(t: number, ks: [number, number][]) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const [t0, a] = ks[i - 1], [t1, b] = ks[i]; return a + (b - a) * smooth((t - t0) / (t1 - t0)); }
  return ks[ks.length - 1][1];
}
const TAU = Math.PI * 2;
// the frame: x the figure's left, y up, z forward. A turn about +x by a positive angle tips the top forward (a nod, a
// bow); about +y by a positive angle swings the face to its left; about +z by a positive angle lifts its left arm out
// sideways and lowers its right.
const nod = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [1, 0, 0], deg);
const look = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 1, 0], deg);
const lean = (rig: Rig, bone: string, deg: number) => rig.turn(bone, [0, 0, 1], deg);
/** An arm lifted out to its side by `out` degrees and swung forward by `fwd` at the shoulder, its forearm bent up by `bend`. */
function armPose(rig: Rig, a: typeof L, side: 1 | -1, out: number, fwd: number, bend: number) {
  rig.turn(a.upper, [0, 0, 1], side * out);
  rig.turn(a.upper, [1, 0, 0], -fwd);
  rig.turn(a.fore, [1, 0, 0], -bend);
}

/** Breathing and settling, from its rest: the chest rises, the shoulders lift with it, the head drifts, the arms sway a
    little out of step. `size` scales it (a big figure moves less). */
function breathe(rig: Rig, t: number, period: number, size = 1) {
  const b = Math.sin(t / period * TAU), d = Math.sin(t / period * TAU * .5 + .7);
  nod(rig, SPINE1, -1.4 * b * size); nod(rig, SPINE2, -1 * b * size);
  lean(rig, SPINE, .8 * d * size);
  rig.turn(L.shoulder, [0, 0, 1], 1.6 * b * size); rig.turn(R.shoulder, [0, 0, 1], -1.6 * b * size);
  nod(rig, HEAD, 1.2 * Math.sin(t / period * TAU + 1.2) * size); look(rig, HEAD, 2.5 * d * size);
  rig.turn(L.upper, [0, 0, 1], 1.5 * Math.sin(t / period * TAU + .4) * size); rig.turn(R.upper, [0, 0, 1], -1.5 * Math.sin(t / period * TAU + 1.1) * size);
}

/** Idle: a slow breath, four seconds round. */
const idle = (size = 1): ClipDef => ({ duration: 4, loop: true, events: [], pose: (rig, t) => breathe(rig, t, 4, size) });
/** Talk: the breath, the head nodding twice and tilting, the body leaning in, and the free hand (`hand`) opened out in a
    gesture that rises and falls, two and a half seconds round. */
const talk = (hand: 'left' | 'right'): ClipDef => ({
  duration: 2.5, loop: true, events: [],
  pose: (rig, t) => {
    breathe(rig, t, 2.5, .6);
    const u = t / 2.5;
    nod(rig, NECK, 4 * Math.sin(u * TAU * 2)); lean(rig, HEAD, 3 * Math.sin(u * TAU));
    nod(rig, SPINE2, 2.5);
    const g = keys(u, [[0, 0], [.2, 1], [.45, .55], [.65, 1], [.9, 0], [1, 0]]);
    if (hand === 'left') armPose(rig, L, 1, 14 * g, 22 * g, 28 * g); else armPose(rig, R, -1, 14 * g, 22 * g, 28 * g);
  },
});
/** Dr. Jelly's give: the flask in its right hand held out to the mage and drawn back, a little bow. */
const give: ClipDef = {
  duration: 2.2, loop: false, events: [],
  pose: (rig, t) => {
    breathe(rig, t, 2.2, .5);
    const g = keys(t, [[0, 0], [.6, 1], [1.5, 1], [2.2, 0]]);
    armPose(rig, R, -1, 6 * g, 48 * g, 18 * g); nod(rig, SPINE2, 6 * g); nod(rig, HEAD, 4 * g);
  },
};
/** Kaelith's sweep: the sword arm (its right) drawn back across the body and swung through in an arc, the body turning
    with it, a second and a half. */
const sweep: ClipDef = {
  duration: 1.5, loop: false, events: [{ t: .62, sound: 'swing' }],
  pose: (rig, t) => {
    const back = keys(t, [[0, 0], [.45, 1], [.62, -1], [1, -1], [1.5, 0]]);
    look(rig, SPINE1, -24 * back); look(rig, SPINE2, -12 * back);
    rig.turn(R.upper, [0, 1, 0], -55 * back); rig.turn(R.upper, [0, 0, 1], -20 * Math.abs(back));
    rig.turn(R.fore, [1, 0, 0], -30 * Math.max(0, back));
  },
};
/** Kaelith's kneel: it sinks onto one knee and bows its head, its feet kept where they stand, and stays. */
const kneel: ClipDef = {
  duration: 2.4, loop: false, events: [{ t: 1.2, sound: 'kneel', loud: true }],
  pose: (rig, t) => {
    const k = keys(t, [[0, 0], [1.2, 1], [2.4, 1]]);
    rig.move(HIPS, [0, -.12 * k, -.05 * k]);
    rig.place('left', [0, 0, .04 * k]); // (its left foot planted a little ahead, the knee up)
    rig.place('right', [0, .02 * k, -.2 * k], 0, 0); // (its right foot drawn back, so the knee comes down to the floor)
    rig.turn(B('RightFoot'), [1, 0, 0], 50 * k); // (the toes curled under it)
    nod(rig, SPINE1, 10 * k); nod(rig, SPINE2, 8 * k); nod(rig, HEAD, 22 * k);
    armPose(rig, L, 1, -4 * k, 18 * k, 30 * k);
  },
};

/** What each made figure is: its height in the game, its budget, the hand it gestures with (the other holds its prop),
    and any clips beyond idle and talk. */
/** `fine`: drawn on the pixel look's fine layer (half-size pixels, the owner's ask of 2026-10-09: the townspeople read at the Vigil), its texture baked at that pixel. */
interface Made { height: number; budget: 'enemy' | 'boss'; hand: 'left' | 'right'; size?: number; extra?: Record<string, ClipDef>; triangles?: number; armsDown?: number; fine?: boolean }
const FIGURES: Record<string, Made> = {
  stormcaller: { height: 1.443, fine: true, budget: 'enemy', hand: 'left' },
  wizard: { height: 1.485, fine: true, budget: 'enemy', hand: 'right', triangles: 10000, armsDown: 62 }, // (it came in a T-pose: its arms held down in every clip) // (its beard and robe's fringes stop the simplifier short of 8,000)
  forager: { height: 1.375, fine: true, budget: 'enemy', hand: 'right' },
  scribe: { height: 1.348, fine: true, budget: 'enemy', hand: 'right' }, // (its quill hand; the book is in its left)
  sexton: { height: 1.375, fine: true, budget: 'enemy', hand: 'left' },
  chorister: { height: 1.348, fine: true, budget: 'enemy', hand: 'right' },
  bellringer: { height: 1.375, fine: true, budget: 'enemy', hand: 'left' },
  novice: { height: 1.168, fine: true, budget: 'enemy', hand: 'right' }, // (the candle is in its left)
  embalmer: { height: 1.403, fine: true, budget: 'enemy', hand: 'right' },
  pilgrim: { height: 1.403, fine: true, budget: 'enemy', hand: 'right' },
  ferryman: { height: 1.75, fine: true, budget: 'enemy', hand: 'left', size: .7 },
  jelly: { height: 1.3, budget: 'enemy', hand: 'right', extra: { give }, triangles: 10000 }, // (so do his straps and vials)
  kaelith: { height: 2.5, budget: 'boss', hand: 'left', size: .6, extra: { sweep, kneel } },
};

/** Each figure's recipe for tools/animate-creature.ts: Mixamo legs for the IK, its own weights kept (or bound again from
    `MIXAMO_SKIN` when the rig came without them: the tool decides), the clips, the hips the only bone that moves, no walk,
    and no copy as imported (`full: false`: thirteen of them would weigh the repository down). Its facing is read from its
    hips. */
export const TOWNSFOLK_RECIPES = Object.fromEntries(Object.entries(FIGURES).map(([id, f]) => [id, {
  LEGS: MIXAMO_LEGS, SKIN: null as SkinBone[] | null, rebind: MIXAMO_SKIN, jawOf: () => null, MOVING: [HIPS], WALK_SPEED: 0,
  face: 'mixamo' as const, height: f.height, budget: f.budget, full: false, triangles: f.triangles, fine: f.fine,
  CLIPS: Object.fromEntries(Object.entries({ idle: idle(f.size), talk: talk(f.hand), ...f.extra }).map(([k, c]) => [k, f.armsDown ? lowered(c, f.armsDown) : c])) as Record<string, ClipDef>,
}]));
/** A clip with the arms first brought down by `deg` from a rest held out (a T-pose). */
function lowered(c: ClipDef, deg: number): ClipDef {
  return { ...c, pose: (rig, t) => { rig.turn(L.upper, [0, 0, 1], -deg); rig.turn(R.upper, [0, 0, 1], deg); c.pose(rig, t); } };
}
