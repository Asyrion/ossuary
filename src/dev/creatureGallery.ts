/* The Galleries tab's creatures made in Tripo (docs/creatures.md): one stood in the room to look at, worn as pixel art,
   walking a lap, stopping, turning to the mage and roaring (or playing each of its other clips in turn: the Hallowed
   Hart's charge, stamp and hit), and resting, its sounds falling on its clips' events (a paw down, the roar) where it
   stands. Looks only: no fight, no collision. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import type { Room } from '../types';
import { disposeTree } from '../render/materials';
import { Sfx } from '../audio/sfx';
import { CREATURE_SOUNDS } from '../audio/creatureSounds';
import { preloadSamples } from '../audio/samples';
import { Rand } from '../audio/synth';
import { CREATURES, madeModel } from '../actors/madeCreatures';
import { onDevClear, onDevStep } from '../devDoor';

/** Walking its lap, resting, or playing one of its other clips (its roar, a boss's charge or stamp) at the mage. */
type State = string;
interface Shown {
  id: string;
  room: Room;
  group: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  state: State;
  left: number;
  next: State[];
  at: { x: number; z: number };
  angle: number;
  last: number;
  fresh: boolean;
  clip: string;
  heading: number;
}
const shown: Shown[] = [],
  r = new Rand(31);

/** Stand creature `id` in `room` at world (x, z), the south side of the lap it walks: loaded once, a copy each time.
    Resolves once it stands there. */
export async function showCreature(id: string, room: Room, x: number, z: number) {
  const info = CREATURES[id];
  if (!info) throw new Error(`no creature "${id}"`);
  const ctx = Sfx.buses?.ctx;
  if (ctx)
    void preloadSamples(
      ctx,
      Object.values(info.clips).flatMap((c) => c.events.map((e) => e.sound)),
    ); // (its sounds from files ready before it roars)
  const made = await madeModel(id, () => G.floor.rooms.includes(room));
  if (!made) return null; // (the floor changed while it loaded)
  const { group, mixer, actions } = made;
  group.position.set(x - room.cx, 0, z - room.cz);
  room.group.add(group);
  const walks = !!actions.walk,
    acts = actsOf(actions); // (a figure with neither, a townsperson, stands and breathes)
  const s: Shown = {
    id,
    room,
    group,
    mixer,
    actions,
    state: 'idle',
    left: CFG.creatures.firstRest,
    next: walks || acts.length ? [...(walks ? ['walk', 'idle'] : []), ...acts.flatMap((a) => [a, 'idle'])] : ['idle'],
    at: { x, z: z - CFG.creatures.lap },
    angle: 0,
    last: 0,
    fresh: true,
    clip: '',
    heading: walks ? Math.PI / 2 : 0,
  };
  play(s, 'idle');
  shown.push(s);
  return s;
}

/** Its clips besides its idle and walk, its roar first (the talk of a townsperson is its own: town.ts plays it). */
const actsOf = (actions: Record<string, THREE.AnimationAction>) =>
  Object.keys(actions)
    .filter((k) => k !== 'idle' && k !== 'walk' && k !== 'talk')
    .sort((a, b) => +(b === 'roar') - +(a === 'roar'));

function play(s: Shown, clip: string) {
  const a = s.actions[clip];
  if (!a) return;
  const was = s.actions[s.clip];
  a.reset().play();
  if (was && was !== a) was.crossFadeTo(a, CFG.creatures.blend, false);
  s.clip = clip;
  s.last = 0;
  s.fresh = true;
}

/** Each step: the creature's routine (a lap walked, a rest, a roar at the mage, a rest), its clip played on, and the
    sounds of the events its clip passed. */
function updateCreatures(dt: number, current: Room) {
  const C = CFG.creatures;
  for (const s of shown) {
    if (s.room !== current) continue;
    const info = CREATURES[s.id],
      scale = info.height / info.modelHeight;
    s.left -= dt;
    if (s.left <= 0) {
      s.state = s.next[0];
      s.next.push(s.next.shift()!);
      s.left = s.state === 'walk' ? C.walkFor : s.state === 'idle' ? C.restFor : info.clips[s.state].duration;
      play(s, s.state);
    }
    if (s.state === 'walk') {
      // round a lap about where it was stood (it starts on the lap's south side), at the pace its paws set
      s.angle += ((info.walkSpeed * scale) / C.lap) * dt;
      const x = s.at.x + Math.sin(s.angle) * C.lap,
        z = s.at.z + Math.cos(s.angle) * C.lap;
      s.group.position.set(x - s.room.cx, 0, z - s.room.cz);
      s.heading = s.angle + Math.PI / 2;
    } else if (s.state !== 'idle') {
      // turned on the mage
      const wx = s.group.position.x + s.room.cx,
        wz = s.group.position.z + s.room.cz,
        want = Math.atan2(player.x - wx, player.z - wz);
      const d = Math.atan2(Math.sin(want - s.heading), Math.cos(want - s.heading));
      s.heading += d * Math.min(1, dt * C.turn);
    }
    s.group.rotation.y = s.heading;
    s.mixer.update(dt);
    // the sounds of the events passed this step (a looping clip wraps)
    const a = s.actions[s.clip],
      clip = info.clips[s.clip];
    if (!a || !clip) continue;
    const now = a.time,
      prev = s.last,
      fresh = s.fresh;
    s.last = now;
    s.fresh = false;
    const wx = s.group.position.x + s.room.cx,
      wz = s.group.position.z + s.room.cz;
    for (const e of clip.events) {
      const passed = now >= prev ? (e.t > prev || (fresh && e.t === prev)) && e.t <= now : e.t > prev || e.t <= now; // (a clip just begun hears an event at its start)
      if (!passed) continue;
      const place = Sfx.place(wx, wz),
        make = CREATURE_SOUNDS[e.sound];
      if (place && make)
        make({ ctx: place.ctx, t: place.ctx.currentTime, out: place.out, r, gain: e.loud ? C.roarGain : C.stepGain });
    }
  }
}

const textureOf = (s: Shown) => {
  let w = 0;
  s.group.traverse((o) => {
    if (!(o as THREE.SkinnedMesh).isSkinnedMesh) return;
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    const img = m?.map?.image as { width?: number } | undefined;
    if (img?.width) w = img.width;
  });
  return w;
};
/** What stands in the room, for the dev hooks: each creature's texture's size, routine, clip and place. */
export const creaturesNow = () =>
  shown.map((s) => ({
    id: s.id,
    texture: textureOf(s),
    state: s.state,
    clip: s.clip,
    time: +(s.actions[s.clip]?.time ?? 0).toFixed(2),
    x: +(s.group.position.x + s.room.cx).toFixed(2),
    z: +(s.group.position.z + s.room.cz).toFixed(2),
  }));
/** Make every creature shown roar now (the dev menu), or play its first other clip (the Hart's charge). */
export function roarNow() {
  for (const s of shown) {
    const act = actsOf(s.actions)[0];
    if (!act) continue;
    s.state = act;
    s.left = CREATURES[s.id].clips[act].duration;
    play(s, act);
  }
}
/** Take the creatures shown in `room` away. */
export function takeCreatures(room: Room) {
  for (let i = shown.length - 1; i >= 0; i--)
    if (shown[i].room === room) {
      const s = shown[i];
      s.mixer.stopAllAction();
      room.group.remove(s.group);
      disposeTree(s.group);
      shown.splice(i, 1); // (its own geometry and pixel-art material go; the loaded model's materials stay)
    }
}
onDevStep((dt, room, playing) => {
  if (playing) updateCreatures(dt, room);
});
/** A new floor: its rooms are gone, and the creatures with them. */
onDevClear(() => {
  shown.length = 0;
});
