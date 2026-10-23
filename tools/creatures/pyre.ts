/* The Pyre Knight (a Tripo model; docs/creatures.md): floor 2's boss pool, a black-armoured knight with a burning helm and a
   long blade in his right hand, on Tripo's biped rig with its preset clips (tools/creatures/biped.ts). Read with
   `npm run animate-creature -- --bones --face=-90`. From the presets: `idle` (Tripo's, 15 s, the blade held low), `walk`
   (Tripo's, replayed in place), `slash` (a window of Tripo's: the blade raised overhead and driven down, its blow at
   `at`). In code on top of them: `aim` (squared up, leaning in behind the blade, trembling), `charge` (the walk at a run,
   bent forward), `crouch` (sunk low to leap, held through the leap) and `hit` (dazed, reeling: Tripo's `hurt` has him
   already sat on the floor for 14 s, which a 1.1 s stun can't use). */
import type { ClipDef, Rig } from '../creatureRig';
import { keys, pitchUp, roll, yaw } from './moves';
import { HIPS, NECK, SPINE1, SPINE2, play, plant, presets } from './biped';

export { face, LEGS, SKIN, MOVING } from './biped';

/** Tripo's presets, read when the tool takes this recipe up (`prepare`): they live in asset-previews/, not in the repo. */
let P: Awaited<ReturnType<typeof presets>>;

/** The slash's window of Tripo's clip (seconds): from the blade's rise to the knight crouched over it, and its blow. */
const SLASH = { from: 1.2, to: 2.75, blow: 2.05 };
/** The walk: Tripo's cycle, and how far its hips go in it (its stride, measured off the preset), in the model's units. */
let WALK = { cycle: 0, travel: 0 };

function idle(rig: Rig, t: number) {
  play(rig, P.idle, t);
}
function walk(rig: Rig, t: number) {
  play(rig, P.walk, t, { inPlace: true });
}
function slash(rig: Rig, t: number) {
  play(rig, P.slash, SLASH.from + t);
}
/** Squared up to charge: the idle's stance, sunk a little, bent forward behind the blade, trembling. */
const AIM = { duration: 0.6 };
function aim(rig: Rig, t: number) {
  play(rig, P.idle, 0);
  const k = keys(t, [
      [0, 0],
      [0.3, 1],
    ]),
    feet = plant(rig);
  rig.move(HIPS, [0, -0.025 * k, 0]);
  pitchUp(rig, SPINE1, -10 * k);
  pitchUp(rig, SPINE2, -6 * k + 1.2 * k * Math.sin(2 * Math.PI * 9 * t));
  feet();
  pitchUp(rig, NECK, 8 * k);
}
/** The charge: the walk at twice its pace, bent forward into it. */
function charge(rig: Rig, t: number) {
  play(rig, P.walk, (t * 2) % WALK.cycle, { inPlace: true });
  pitchUp(rig, SPINE1, -14);
  pitchUp(rig, NECK, 10);
}
/** The crouch: he sinks onto bent knees, bowed over his blade, gathering to leap; deepest at `at`, held through the air. */
const CROUCH = { duration: 0.55, at: 0.55 };
function crouch(rig: Rig, t: number) {
  play(rig, P.idle, 0);
  const k = keys(t, [
      [0, 0],
      [0.45, 1],
    ]),
    feet = plant(rig);
  rig.move(HIPS, [0, -0.16 * k, -0.04 * k]);
  pitchUp(rig, SPINE1, -24 * k);
  pitchUp(rig, SPINE2, -8 * k);
  feet();
  pitchUp(rig, NECK, 14 * k);
}
/** Dazed (he ran into a wall): knocked back on his heels, then reeling, his helm rolling. */
const HIT = { duration: 1.1 };
function hit(rig: Rig, t: number) {
  play(rig, P.idle, 0);
  const jolt = keys(t, [
      [0, 0],
      [0.08, 1],
      [0.4, 0.35],
      [1.1, 0],
    ]),
    reel = Math.sin(Math.PI * Math.min(1, t / 1.1)),
    feet = plant(rig);
  rig.move(HIPS, [0, -0.02 * jolt, -0.03 * jolt]);
  pitchUp(rig, SPINE1, 10 * jolt);
  roll(rig, SPINE2, 6 * reel * Math.sin(2 * Math.PI * 1.8 * t));
  feet();
  pitchUp(rig, NECK, 12 * jolt);
  roll(rig, NECK, 10 * reel * Math.sin(2 * Math.PI * 2.2 * t + 0.6));
  yaw(rig, NECK, 8 * reel * Math.sin(2 * Math.PI * 1.4 * t));
}

const steps = () => [
  { t: 0, sound: 'pawRear' },
  { t: WALK.cycle / 2, sound: 'pawRear' },
];
const clips = (): Record<string, ClipDef> => ({
  idle: { duration: P.idle.duration, loop: true, pose: idle, events: [] },
  walk: { duration: WALK.cycle, loop: true, pose: walk, events: steps() },
  slash: {
    duration: SLASH.to - SLASH.from,
    loop: false,
    pose: slash,
    events: [{ t: SLASH.blow - SLASH.from, sound: 'slam', loud: true }],
    at: SLASH.blow - SLASH.from,
  },
  aim: { duration: AIM.duration, loop: false, pose: aim, events: [] },
  charge: {
    duration: WALK.cycle / 2,
    loop: true,
    pose: charge,
    events: steps().map((s) => ({ ...s, t: s.t / 2 })),
    speed: (WALK.travel * 2) / WALK.cycle,
  },
  crouch: { duration: CROUCH.duration, loop: false, pose: crouch, events: [], at: CROUCH.at },
  hit: { duration: HIT.duration, loop: false, pose: hit, events: [] },
});

/** The clips and the walk's speed (Tripo's hips' travel over its cycle, in the model's units), once its presets are read. */
export const CLIPS: Record<string, ClipDef> = {};
export let WALK_SPEED = 0;
export async function prepare() {
  P = await presets('pyre');
  WALK = { cycle: P.walk.duration, travel: P.walk.travel(HIPS) };
  WALK_SPEED = WALK.travel / WALK.cycle;
  return { CLIPS: clips(), WALK_SPEED };
}
