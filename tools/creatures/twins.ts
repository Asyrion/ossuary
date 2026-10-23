/* The first Twin Guardian (a Tripo model; docs/creatures.md): floor 3's boss pair, a colossal bearded guardian of
   sandstone crouched on its knuckles like a great ape, on Tripo's biped rig with its preset clips (tools/creatures/
   biped.ts). Read with `npm run animate-creature -- --bones --face=-90`. From the presets: `idle` (Tripo's, crouched,
   15 s), `walk` (Tripo's knuckle walk, replayed in place) and `slam` (a window of Tripo's slash: both fists raised high
   and brought down on the floor, its blow at `at`). In code on top of them: `statue` (the idle's first moment, held: no
   muscle moving), `guard` (its left paw raised before it as a shield, held), `rear` (rearing up, chest out, to fix the
   mage with its gaze, held) and `hit` (a flinch of the head and shoulders, played over the others). Tripo's `hurt` has
   it curled on the floor, which the fight never asks for. (The second guardian's rig came out wrong: its head bone sits
   in its chest and its thighs at two heights, so its presets fold it onto the floor; it fights as its still model.) */
import type { ClipDef, Rig } from '../creatureRig';
import { keys, pitchUp, roll, yaw } from './moves';
import { HEAD, HIPS, NECK, SPINE1, SPINE2, play, plant, presets, square } from './biped';

export { face, LEGS, SKIN, MOVING } from './biped';

/** Tripo's presets, read when the tool takes this recipe up (`prepare`): they live in asset-previews/, not in the repo. */
let P: Awaited<ReturnType<typeof presets>>;

/** The slam's window of Tripo's slash (seconds): from its fists' rise to it hunched over the blow, and the blow. */
const SLAM = { from: 1.3, to: 2.7, blow: 2.05 };
let WALK = { cycle: 0, travel: 0 };

/** Its left arm raised before it from the shoulder (a shield held up), `k` of the way. */
function shieldUp(rig: Rig, k: number) {
  pitchUp(rig, 'L_Upperarm', 75 * k);
  roll(rig, 'L_Upperarm', -10 * k);
  pitchUp(rig, 'L_Forearm', 35 * k);
}

const GUARD = { duration: 0.6 };
function guard(rig: Rig, t: number) {
  play(rig, P.idle, t * 2);
  shieldUp(
    rig,
    keys(t, [
      [0, 0],
      [0.4, 1],
    ]),
  );
}
/** Rearing to fix the mage with its gaze: up off its knuckles, chest thrown out, head forward, held. */
const REAR = { duration: 0.7 };
function rear(rig: Rig, t: number) {
  play(rig, P.idle, 0);
  const k = keys(t, [
      [0, 0],
      [0.5, 1],
    ]),
    feet = plant(rig);
  rig.move(HIPS, [0, 0.03 * k, -0.02 * k]);
  pitchUp(rig, SPINE1, 16 * k);
  pitchUp(rig, SPINE2, 10 * k);
  feet();
  pitchUp(rig, NECK, -14 * k);
  pitchUp(rig, 'L_Upperarm', 20 * k);
  pitchUp(rig, 'R_Upperarm', 20 * k);
}
const STATUE = { duration: 0.5 };
function statue(rig: Rig) {
  play(rig, P.idle, 0);
}
/** The hit: its head and shoulders jerked back and aside, then shaken. It leaves the legs and the hips as they are and
    starts and ends at rest, so it plays over any other clip (madeBosses.ts makes it additive). */
const HIT = { duration: 0.5 };
function hit(rig: Rig, t: number) {
  const jolt = keys(t, [
      [0, 0],
      [0.06, 1],
      [0.22, 0.4],
      [0.5, 0],
    ]),
    shake = t > 0.1 ? Math.sin(Math.PI * Math.min(1, (t - 0.1) / 0.4)) : 0;
  pitchUp(rig, SPINE2, 8 * jolt);
  pitchUp(rig, NECK, 14 * jolt);
  yaw(rig, HEAD, 12 * jolt + 6 * shake * Math.sin(2 * Math.PI * 6 * t));
}

const steps = () => [
  { t: 0, sound: 'pawFront' },
  { t: WALK.cycle / 2, sound: 'pawFront' },
];
const clips = (): Record<string, ClipDef> => ({
  idle: { duration: P.idle.duration, loop: true, pose: (rig, t) => play(rig, P.idle, t), events: [] },
  walk: {
    duration: WALK.cycle,
    loop: true,
    pose: (rig, t) => play(rig, P.walk, t, { inPlace: true }),
    events: steps(),
  },
  slam: {
    duration: SLAM.to - SLAM.from,
    loop: false,
    pose: (rig, t) => {
      play(rig, P.slash, SLAM.from + t);
      square(rig); // (Tripo's slash swings it round as it comes down: it keeps facing the mage)
    },
    events: [{ t: SLAM.blow - SLAM.from, sound: 'slam', loud: true }],
    at: SLAM.blow - SLAM.from,
  },
  rear: { duration: REAR.duration, loop: false, pose: rear, events: [{ t: 0.1, sound: 'inhale' }] },
  guard: { duration: GUARD.duration, loop: false, pose: guard, events: [] },
  statue: { duration: STATUE.duration, loop: false, pose: statue, events: [] },
  hit: { duration: HIT.duration, loop: false, pose: hit, events: [] },
});

/** The clips and the walk's speed (Tripo's hips' travel over its cycle, in the model's units), once its presets are read. */
export const CLIPS: Record<string, ClipDef> = {};
export let WALK_SPEED = 0;
export async function prepare() {
  P = await presets('twins');
  WALK = { cycle: P.walk.duration, travel: P.walk.travel(HIPS) };
  WALK_SPEED = WALK.travel / WALK.cycle;
  return { CLIPS: clips(), WALK_SPEED };
}
