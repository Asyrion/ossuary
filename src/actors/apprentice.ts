/* Asyrion the apprentice, built in code from the owner's picture (2026-10-01): messy golden hair with a cowlick, green
   eyes, a cream hooded shirt with its sleeves rolled up, brown suspenders, a belt with pouches, a leather satchel on a
   strap across the chest, leather gloves, olive trousers rolled below the knee and tall laced boots.

   A rig of bones named as Mixamo names them (so the hero's animation controller, heroAnim.ts, finds the hips, the upper
   body and the hands as it does in a Tripo model, and costumes hang from the head and chest), rigid parts on each bone
   (merged per bone: about twenty draw calls), and clips made in code from poses: idle, run, walk, cast, chalking a sigil,
   hit, two deaths, drinking and a snack from the satchel. The run and walk are timed to the mage's speed, so the feet
   don't slide (`ANIM_SPEEDS`). Stands 1.3 tall on y = 0 facing +Z, like any prepared hero. */
import * as THREE from 'three';
import { mergeRig } from '../render/rig';
import { limb, lit, part, sphere, std, type V3 } from '../render/arcane';
import { spike, tube } from './beastParts';

const P = 'mixamorig';
const C = {
  skin: 0xf0c6a0, skinShade: 0xd9a882, hair: 0xe8b94e, hairDark: 0xc8932e, shirt: 0xebe4cc, shirtShade: 0xcfc5a6,
  leather: 0x7a4a2a, leatherDark: 0x5a341c, bag: 0x8c5634, brass: 0xc9a046, trousers: 0x8f7442, trousersDark: 0x725a30,
  boot: 0x8a5a32, sole: 0x3a2618, lace: 0xc8a070, iris: 0x3fb05a,
};
type BoneKey = 'Hips' | 'Spine' | 'Spine1' | 'Spine2' | 'Neck' | 'Head'
  | 'LeftShoulder' | 'LeftArm' | 'LeftForeArm' | 'LeftHand' | 'RightShoulder' | 'RightArm' | 'RightForeArm' | 'RightHand'
  | 'LeftUpLeg' | 'LeftLeg' | 'LeftFoot' | 'LeftToeBase' | 'RightUpLeg' | 'RightLeg' | 'RightFoot' | 'RightToeBase';
const HIPS_Y = .52;

/** How fast the run and walk clips play at the mage's full speed (heroAnim's `runAnimSpeed` and `walkAnimSpeed` for this
    model): the run's stride covers 1.2 units a cycle of .84 s, the walk's .73 units a cycle of 1.1 s. */
export const ANIM_SPEEDS = { run: 3, walk: 6.5 };

/* ---------- the model ---------- */

function rig(root: THREE.Object3D) {
  const B = {} as Record<BoneKey, THREE.Bone>;
  const bone = (k: BoneKey, parent: THREE.Object3D, at: V3) => { const b = new THREE.Bone(); b.name = P + k; b.position.set(...at); parent.add(b); return B[k] = b; };
  bone('Hips', root, [0, HIPS_Y, 0]);
  bone('Spine', B.Hips, [0, .07, 0]); bone('Spine1', B.Spine, [0, .09, 0]); bone('Spine2', B.Spine1, [0, .09, 0]);
  bone('Neck', B.Spine2, [0, .09, 0]); bone('Head', B.Neck, [0, .05, 0]);
  for (const [s, side] of [[1, 'Left'], [-1, 'Right']] as const) {
    bone(`${side}Shoulder`, B.Spine2, [.05 * s, .06, 0]);
    bone(`${side}Arm`, B[`${side}Shoulder`], [.1 * s, -.01, 0]);
    bone(`${side}ForeArm`, B[`${side}Arm`], [0, -.18, 0]);
    bone(`${side}Hand`, B[`${side}ForeArm`], [0, -.16, 0]);
    bone(`${side}UpLeg`, B.Hips, [.075 * s, -.04, 0]);
    bone(`${side}Leg`, B[`${side}UpLeg`], [0, -.21, 0]);
    bone(`${side}Foot`, B[`${side}Leg`], [0, -.21, 0]);
    bone(`${side}ToeBase`, B[`${side}Foot`], [0, -.04, .08]);
  }
  return B;
}

const cyl = (rTop: number, rBot: number, h: number, n = 8) => new THREE.CylinderGeometry(rTop, rBot, h, n);

function dress(B: Record<BoneKey, THREE.Bone>) {
  const m = Object.fromEntries(Object.entries(C).map(([k, c]) => [k, std(c)])) as Record<keyof typeof C, THREE.MeshStandardMaterial>;
  const shine = std(C.brass, { metalness: .6, roughness: .35 });
  // hips: trousers round the seat, the belt and its buckle, a pouch, and the satchel at the left hip
  part(B.Hips, cyl(.132, .14, .15, 10), m.trousers, [0, -.02, 0], { scale: [1, 1, .78] });
  part(B.Hips, cyl(.142, .142, .045, 12), m.leather, [0, .06, 0], { scale: [1, 1, .8] });
  part(B.Hips, new THREE.BoxGeometry(.05, .04, .02), shine, [0, .06, .115]);
  part(B.Hips, new THREE.BoxGeometry(.06, .08, .05), m.leather, [-.11, -.01, .08], { rot: [0, -.5, 0] });
  part(B.Hips, new THREE.BoxGeometry(.065, .03, .055), m.leatherDark, [-.11, .03, .085], { rot: [0, -.5, 0] });
  const bag = new THREE.Group(); bag.position.set(.17, -.08, .06); bag.rotation.set(0, -.45, -.05); B.Hips.add(bag);
  part(bag, new THREE.BoxGeometry(.07, .17, .23), m.bag, [0, 0, 0]);
  part(bag, new THREE.BoxGeometry(.075, .09, .235), m.leatherDark, [.004, .045, 0]);
  part(bag, new THREE.BoxGeometry(.02, .035, .03), shine, [.04, .01, 0]);
  // the shirt, in three bands up the spine; the hood lying back round the neck, its drawstrings; the suspenders
  part(B.Spine, cyl(.13, .133, .1, 10), m.shirt, [0, .04, 0], { scale: [1, 1, .76] });
  part(B.Spine1, cyl(.142, .13, .1, 10), m.shirt, [0, .045, 0], { scale: [1, 1, .74] });
  part(B.Spine2, cyl(.16, .142, .1, 10), m.shirt, [0, .045, 0], { scale: [1, 1, .7] });
  part(B.Spine2, new THREE.TorusGeometry(.085, .035, 6, 12), m.shirtShade, [0, .1, -.01], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, .8] });
  part(B.Spine2, sphere(.09, 8, 6), m.shirtShade, [0, .08, -.1], { scale: [1.3, .65, .7] });
  for (const s of [-1, 1]) limb(B.Spine2, [.025 * s, .09, .085], [.03 * s, -.03, .105], .006, m.shirtShade);
  for (const s of [-1, 1]) {
    part(B.Spine1, new THREE.BoxGeometry(.03, .26, .012), m.leather, [.075 * s, .03, .102], { rot: [-.08, 0, .06 * s] });
    part(B.Spine1, new THREE.BoxGeometry(.03, .26, .012), m.leather, [.075 * s, .03, -.1], { rot: [.08, 0, .06 * s] });
    part(B.Spine1, new THREE.BoxGeometry(.02, .02, .018), shine, [.075 * s, -.06, .107]);
  }
  // the satchel's strap: over the right shoulder, across the chest, down to the bag at the left hip
  part(B.Spine1, new THREE.BoxGeometry(.034, .42, .014), m.leatherDark, [.02, .02, .112], { rot: [0, 0, -.62] });
  part(B.Spine2, new THREE.BoxGeometry(.04, .014, .16), m.leatherDark, [-.11, .108, 0]);
  // neck and head
  part(B.Neck, cyl(.042, .046, .07, 8), m.skin, [0, .02, 0]);
  const H = B.Head;
  part(H, sphere(.14, 14, 12), m.skin, [0, .13, 0], { scale: [1, 1.04, .98] });
  part(H, sphere(.1, 10, 8), m.skin, [0, .06, .035], { scale: [1, .82, 1.02] });
  for (const s of [-1, 1]) {
    part(H, sphere(.03, 6, 5), m.skinShade, [.135 * s, .1, -.005], { scale: [.6, 1, .9] });
    const eye = new THREE.Group(); eye.position.set(.05 * s, .11, .122); eye.rotation.y = .28 * s; H.add(eye);
    part(eye, sphere(.03, 10, 8), lit(0xf6f2ea), [0, 0, 0], { scale: [1, 1.15, .45] });
    part(eye, sphere(.021, 10, 8), lit(C.iris), [0, -.002, .008], { scale: [1, 1.15, .5] });
    part(eye, sphere(.01, 6, 5), lit(0x14200f), [0, -.003, .014]);
    part(eye, sphere(.006, 4, 3), lit(0xffffff), [.008 * s, .01, .017]);
  }
  spike(H, [0, .09, .136], [0, .075, .158], .014, m.skinShade);
  part(H, new THREE.BoxGeometry(.024, .006, .006), lit(0x8a4a3a), [0, .045, .132]);
  // the hair: a cap over the skull, a fringe falling over the brow, messy tufts all round, and the cowlick on top
  part(H, sphere(.158, 14, 10), m.hair, [0, .17, -.022], { scale: [1.07, .98, 1.06] });
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; part(H, sphere(.07, 8, 6), i % 3 ? m.hair : m.hairDark, [Math.sin(a) * .12, .23 + (i % 2) * .03, Math.cos(a) * .11 - .035], { scale: [1.25, .75, 1.2], rot: [0, a, 0] }); }
  const tufts: [V3, V3, number, boolean][] = [];
  for (let i = 0; i < 6; i++) { const x = (i - 2.5) * .046; tufts.push([[x, .25, .095], [x * 1.3 + (i % 2 ? .02 : -.015), .125 - Math.abs(x) * .25, .158], .046, i === 2]); }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12 - .5) * Math.PI * 1.45 + Math.PI, dx = Math.sin(a), dz = Math.cos(a), y = .2 - (i % 3) * .03;
    tufts.push([[dx * .12, y + .06, dz * .11 - .025], [dx * .195, y - .06 - (i % 2) * .03, dz * .18 - .04], .052, i % 4 === 1]);
  }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + .4; tufts.push([[Math.sin(a) * .07, .27, Math.cos(a) * .06 - .03], [Math.sin(a) * .15, .32, Math.cos(a) * .13 - .05], .045, i % 2 === 0]); }
  for (const [a, b, r, dark] of tufts) spike(H, a, b, r, dark ? m.hairDark : m.hair);
  tube(H, [[0, .3, -.03], [.01, .37, -.01], [.025, .39, .035], [.015, .365, .07]], .015, .004, m.hair, 8, 4);
  // arms: sleeves rolled to the elbow, bare forearms, leather gloves
  for (const side of ['Left', 'Right'] as const) {
    const s = side === 'Left' ? 1 : -1;
    part(B[`${side}Arm`], sphere(.058, 8, 6), m.shirt, [0, -.01, 0]);
    part(B[`${side}Arm`], cyl(.052, .047, .16, 8), m.shirt, [0, -.08, 0]);
    part(B[`${side}ForeArm`], new THREE.TorusGeometry(.046, .022, 5, 10), m.shirtShade, [0, -.005, 0], { rot: [Math.PI / 2, 0, 0] });
    part(B[`${side}ForeArm`], cyl(.036, .031, .13, 7), m.skin, [0, -.08, 0]);
    part(B[`${side}ForeArm`], cyl(.04, .038, .045, 8), m.leatherDark, [0, -.145, 0]);
    part(B[`${side}Hand`], new THREE.BoxGeometry(.062, .075, .045), m.leather, [0, -.035, .005]);
    part(B[`${side}Hand`], new THREE.BoxGeometry(.022, .045, .024), m.leather, [.034 * s, -.02, .02], { rot: [0, 0, .5 * s] });
    // legs: baggy trousers to below the knee, a rolled hem, a bare shin, tall laced boots
    part(B[`${side}UpLeg`], cyl(.074, .066, .22, 8), m.trousers, [0, -.1, 0]);
    part(B[`${side}Leg`], cyl(.066, .06, .07, 8), m.trousers, [0, -.02, 0]);
    part(B[`${side}Leg`], new THREE.TorusGeometry(.06, .02, 5, 10), m.trousersDark, [0, -.058, 0], { rot: [Math.PI / 2, 0, 0] });
    part(B[`${side}Leg`], cyl(.036, .034, .06, 7), m.skin, [0, -.09, 0]);
    part(B[`${side}Leg`], cyl(.056, .05, .1, 8), m.boot, [0, -.16, 0]);
    part(B[`${side}Leg`], new THREE.TorusGeometry(.055, .012, 4, 10), m.leatherDark, [0, -.11, 0], { rot: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 3; k++) part(B[`${side}Leg`], new THREE.BoxGeometry(.05, .008, .01), m.lace, [0, -.13 - k * .025, .05], { rot: [0, 0, (k % 2 ? .3 : -.3)] });
    part(B[`${side}Foot`], new THREE.BoxGeometry(.085, .07, .14), m.boot, [0, -.025, .03]);
    part(B[`${side}ToeBase`], sphere(.046, 8, 6), m.boot, [0, .005, .015], { scale: [1, .75, 1.1] });
    part(B[`${side}Foot`], new THREE.BoxGeometry(.094, .02, .2), m.sole, [0, -.055, .055]);
  }
}

/* ---------- the clips ---------- */

type Rot = [number, number, number];
/** A pose: each bone's turn from its rest (radians, about x, y, z), and the hips' place. */
type Pose = Partial<Record<BoneKey, Rot>> & { pos?: V3 };
const ALL = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'] as const satisfies readonly BoneKey[];
/** Standing at ease: arms a little out from the sides, elbows soft. */
const EASE: Pose = { LeftArm: [.05, 0, .14], RightArm: [.05, 0, -.14], LeftForeArm: [-.18, 0, 0], RightForeArm: [-.18, 0, 0], LeftUpLeg: [0, 0, .03], RightUpLeg: [0, 0, -.03] };
const add = (...ps: Pose[]): Pose => {
  const out: Pose = {};
  for (const p of ps) for (const [k, v] of Object.entries(p) as [keyof Pose, number[]][]) {
    const was = (out[k] ?? [0, 0, 0]) as number[]; (out as Record<string, number[]>)[k] = [was[0] + v[0], was[1] + v[1], was[2] + v[2]];
  }
  return out;
};

const q = new THREE.Quaternion(), eul = new THREE.Euler();
/** A clip of `dur` seconds from `at`, a pose for each moment, sampled 30 times a second: every bone has a track (so a
    layer fully covers its half of the body), and the hips their place. */
function makeClip(name: string, dur: number, at: (t: number) => Pose) {
  const n = Math.max(2, Math.round(dur * 30) + 1), times = Array.from({ length: n }, (_, i) => i / (n - 1) * dur);
  const poses = times.map(t => at(t));
  const tracks: THREE.KeyframeTrack[] = ALL.map(k => {
    const vals: number[] = [];
    for (const p of poses) { const r = p[k] ?? [0, 0, 0]; q.setFromEuler(eul.set(r[0], r[1], r[2])); vals.push(q.x, q.y, q.z, q.w); }
    return new THREE.QuaternionKeyframeTrack(`${P}${k}.quaternion`, times, vals);
  });
  tracks.push(new THREE.VectorKeyframeTrack(`${P}Hips.position`, times, poses.flatMap(p => { const o = p.pos ?? [0, 0, 0]; return [o[0], HIPS_Y + o[1], o[2]]; })));
  return new THREE.AnimationClip(name, dur, tracks);
}
const ease = (k: number) => k * k * (3 - 2 * k);
/** Poses at moments, eased from one to the next. */
const keyed = (keys: [number, Pose][]) => (t: number): Pose => {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1], k = ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))));
  const out: Pose = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose>) {
    const va = (a[key] ?? [0, 0, 0]) as number[], vb = (b[key] ?? [0, 0, 0]) as number[];
    (out as Record<string, number[]>)[key] = [0, 1, 2].map(j => va[j] + (vb[j] - va[j]) * k);
  }
  return out;
};

function clips() {
  const TAU = Math.PI * 2;
  const idle = makeClip('idle_breathe', 3.2, t => {
    const f = t / 3.2 * TAU;
    return add(EASE, {
      pos: [0, .004 * Math.sin(2 * f), 0], Hips: [0, 0, .015 * Math.sin(f)], Spine: [.03 + .015 * Math.sin(2 * f), 0, 0], Spine2: [.02 * Math.sin(2 * f + .5), 0, 0],
      Neck: [0, .08 * Math.sin(f), 0], Head: [-.04 + .03 * Math.sin(2 * f), .14 * Math.sin(f + .4), 0],
      LeftArm: [0, 0, .02 * Math.sin(2 * f)], RightArm: [0, 0, -.02 * Math.sin(2 * f)],
    });
  });
  const run = makeClip('run_cycle', .84, t => {
    const f = t / .84 * TAU, s = Math.sin(f), c = Math.cos(f);
    return add(EASE, {
      pos: [0, -.02 + .03 * (1 - Math.cos(2 * f)) / 2, 0], Hips: [0, .14 * s, 0], Spine: [.2, -.1 * s, 0], Spine2: [0, -.08 * s, 0], Head: [-.12, 0, 0],
      LeftUpLeg: [-.8 * s, 0, 0], RightUpLeg: [.8 * s, 0, 0], LeftLeg: [.3 + 1.1 * Math.max(0, c), 0, 0], RightLeg: [.3 + 1.1 * Math.max(0, -c), 0, 0],
      LeftFoot: [-.25 * Math.max(0, c), 0, 0], RightFoot: [-.25 * Math.max(0, -c), 0, 0],
      LeftArm: [.7 * s, 0, .05], RightArm: [-.7 * s, 0, -.05], LeftForeArm: [-1, 0, 0], RightForeArm: [-1, 0, 0],
    });
  });
  const walk = makeClip('walk_cycle', 1.1, t => {
    const f = t / 1.1 * TAU, s = Math.sin(f), c = Math.cos(f);
    return add(EASE, {
      pos: [0, -.006 + .012 * (1 - Math.cos(2 * f)) / 2, 0], Hips: [0, .06 * s, 0], Spine: [.05, -.04 * s, 0],
      LeftUpLeg: [-.45 * s, 0, 0], RightUpLeg: [.45 * s, 0, 0], LeftLeg: [.1 + .55 * Math.max(0, c), 0, 0], RightLeg: [.1 + .55 * Math.max(0, -c), 0, 0],
      LeftArm: [.35 * s, 0, 0], RightArm: [-.35 * s, 0, 0], LeftForeArm: [-.25, 0, 0], RightForeArm: [-.25, 0, 0],
    });
  });
  // casting: the right hand drawn back, then thrust forward, the body turning into it
  const windUp: Pose = add(EASE, { Spine: [0, .35, 0], Spine2: [0, .15, 0], RightArm: [.5, 0, -.5], RightForeArm: [-1.4, 0, 0], LeftArm: [-.4, 0, .1] });
  const thrust: Pose = add(EASE, { Spine: [.1, -.25, 0], Spine2: [0, -.1, 0], RightArm: [-1.5, 0, .1], RightForeArm: [-.1, 0, 0], RightHand: [-.25, 0, 0], LeftArm: [.35, 0, .1] });
  const cast = makeClip('cast_spell', 1, keyed([[0, EASE], [.3, windUp], [.45, thrust], [.62, add(thrust, { RightArm: [.1, 0, 0] })], [1, EASE]]));
  // chalking a sigil: bent low, the right hand tracing a circle on the floor
  const bent: Pose = add(EASE, { Spine: [.55, 0, 0], Spine1: [.35, 0, 0], Spine2: [.2, 0, 0], Neck: [.2, 0, 0], Head: [.3, 0, 0], RightArm: [-1.1, 0, -.1], RightForeArm: [-.3, 0, 0], LeftArm: [-.5, 0, .2], LeftForeArm: [-.9, 0, 0] });
  const sigilAt = keyed([[0, EASE], [.3, bent], [1, bent], [1.3, EASE]]);
  const sigil = makeClip('sigil_chalk', 1.3, t => {
    const p = sigilAt(t); if (t < .35 || t > .95) return p;
    const a = (t - .35) / .6 * Math.PI * 2;
    return add(p, { RightArm: [.18 * Math.cos(a), 0, .22 * Math.sin(a)] });
  });
  const hit = makeClip('hit_recoil', .55, keyed([[0, EASE], [.1, add(EASE, { Spine: [-.35, 0, 0], Spine2: [-.2, 0, 0], Head: [-.3, 0, 0], LeftArm: [.4, 0, .6], RightArm: [.4, 0, -.6] })], [.3, add(EASE, { Spine: [-.12, 0, 0], Head: [-.1, 0, 0] })], [.55, EASE]]));
  // two deaths: a stagger, then down to the knees and forward onto the floor; or back, knees giving way, onto the back
  const stagger: Pose = add(EASE, { Spine: [-.3, 0, 0], Head: [-.3, 0, 0], LeftArm: [-.4, 0, .6], RightArm: [-.4, 0, -.6] });
  const kneel: Pose = { pos: [0, -.21, 0], LeftLeg: [1.55, 0, 0], RightLeg: [1.55, 0, 0], LeftFoot: [.6, 0, 0], RightFoot: [.6, 0, 0], Spine: [.4, 0, 0], Head: [.4, 0, 0], LeftArm: [-.3, 0, .1], RightArm: [-.3, 0, -.1], LeftForeArm: [-.3, 0, 0], RightForeArm: [-.3, 0, 0] };
  const prone: Pose = { pos: [0, -.4, .35], Hips: [1.45, 0, 0], LeftLeg: [.1, 0, 0], RightLeg: [.15, 0, 0], Spine: [.05, 0, 0], Head: [-.3, .6, 0], LeftArm: [-1.5, 0, .5], RightArm: [-2, 0, -.3], LeftForeArm: [-.4, 0, 0], RightForeArm: [-.2, 0, 0] };
  const death = makeClip('death_fall', 1.8, keyed([[0, EASE], [.25, stagger], [.7, kneel], [1.15, add(kneel, { Hips: [.9, 0, 0], pos: [0, -.12, .15] })], [1.8, prone]]));
  const buckle: Pose = { pos: [0, -.07, 0], LeftUpLeg: [-.4, 0, .1], RightUpLeg: [-.4, 0, -.1], LeftLeg: [.6, 0, 0], RightLeg: [.6, 0, 0], Spine: [-.2, 0, 0], Head: [-.2, 0, 0], LeftArm: [0, 0, .8], RightArm: [0, 0, -.8] };
  const supine: Pose = { pos: [0, -.4, -.35], Hips: [-1.45, 0, 0], LeftUpLeg: [-.15, 0, .1], RightUpLeg: [-.3, 0, -.08], LeftLeg: [.25, 0, 0], RightLeg: [.5, 0, 0], Head: [.2, -.5, 0], LeftArm: [0, 0, 1.25], RightArm: [0, 0, -1.3], LeftForeArm: [-.3, 0, 0], RightForeArm: [-.5, 0, 0] };
  const deathAlt = makeClip('death_collapse', 1.5, keyed([[0, EASE], [.3, buckle], [1, add(supine, { pos: [0, .05, 0] })], [1.5, supine]]));
  // drinking: the flask raised to the mouth, the head tipped back; a snack: a hand into the satchel, then a bite, chewing
  const sip: Pose = add(EASE, { RightArm: [-1.05, 0, -.25], RightForeArm: [-2.1, 0, 0], RightHand: [.3, 0, 0], Head: [-.15, 0, 0] });
  const drink = makeClip('drink_potion', 1.8, keyed([[0, EASE], [.45, sip], [.9, add(sip, { RightArm: [-.4, 0, 0], Head: [-.25, 0, 0], Neck: [-.1, 0, 0] })], [1.35, add(sip, { RightArm: [-.4, 0, 0], Head: [-.25, 0, 0] })], [1.8, EASE]]));
  const rummage: Pose = add(EASE, { Spine: [.15, -.25, 0], RightArm: [-.3, 0, .3], RightForeArm: [-.7, 0, 0], Head: [.3, -.3, 0] });
  const bite: Pose = add(EASE, { RightArm: [-.9, 0, -.2], RightForeArm: [-2.2, 0, 0], Head: [.05, 0, 0] });
  const eatAt = keyed([[0, EASE], [.5, rummage], [.8, rummage], [1.2, bite], [2, bite], [2.6, EASE]]);
  const eat = makeClip('eat_snack', 2.6, t => t > 1.2 && t < 2 ? add(eatAt(t), { Head: [.06 * Math.sin((t - 1.2) * 18), 0, 0] }) : eatAt(t));
  return [idle, run, walk, cast, sigil, hit, death, deathAlt, drink, eat];
}

/** Asyrion, ready for setHero: the rigged model (still parts merged on each bone), how many triangles, and the clips. */
export function buildApprentice() {
  const model = new THREE.Group(); model.name = 'Asyrion';
  const B = rig(model); dress(B);
  mergeRig(model, () => {}, 'hero:apprentice', Object.values(B)); // (each bone keeps its own parts, merged)
  let tris = 0;
  model.traverse(o => { const g = (o as THREE.Mesh).geometry; if ((o as THREE.Mesh).isMesh && g) tris += (g.index ? g.index.count : g.attributes.position.count) / 3; });
  const holder = new THREE.Group(); holder.add(model);
  return { prep: { holder, skinned: true, stripped: false, tris: Math.round(tris), speeds: ANIM_SPEEDS }, clips: clips() };
}
