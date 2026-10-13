/* Creatures made in Tripo and animated in code (docs/creatures.md): a model whose clips tools/animate-creature.ts baked
   (public/assets/creatures/<id>.glb, data/creatures.json) shown in the room to look at: worn as pixel art made from its own
   texture (texturePixel.ts, baked by tools/texel-bake.ts), it walks a lap, stops, turns to the mage and roars, and rests,
   its sounds falling on its clips' events (a paw down, the roar) where it stands. Looks only for now: no fight, no
   collision. The dev menu's Galleries tab stands one ahead of the mage (`showCreature`). */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import data from '../../data/creatures.json';
import { CFG } from '../config';
import { G, player } from '../state';
import type { Room } from '../types';
import { blob, disposeTree } from '../render/materials';
import { wearTexel } from './texturePixel';
import { Sfx } from '../audio/sfx';
import { CREATURE_SOUNDS } from '../audio/creatureSounds';
import { preloadSamples } from '../audio/samples';
import { Rand } from '../audio/synth';

interface ClipInfo {
  duration: number;
  loop: boolean;
  events: { t: number; sound: string; at?: string; loud?: boolean }[];
}
interface CreatureInfo {
  file: string;
  height: number;
  fine?: boolean;
  modelHeight: number;
  modelLength: number;
  walkSpeed: number;
  clips: Record<string, ClipInfo>;
  texel: { file: string; glow: string; side: number }; // (every model has its bake: tests/unit/texelBake.test.ts)
}
export const CREATURES = Object.fromEntries(
  Object.entries(data).filter(([k]) => k !== '_comment'),
) as unknown as Record<string, CreatureInfo>;

type State = 'walk' | 'idle' | 'roar';
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
const loader = new GLTFLoader(),
  loaded = new Map<string, Promise<GLTF>>(),
  shown: Shown[] = [],
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
  const made = await madeModel(id, () => G.rooms.includes(room));
  if (!made) return null; // (the floor changed while it loaded)
  const { group, mixer, actions } = made;
  group.position.set(x - room.cx, 0, z - room.cz);
  room.group.add(group);
  const walks = !!actions.walk,
    roars = !!actions.roar; // (a figure with neither, a townsperson, stands and breathes)
  const s: Shown = {
    id,
    room,
    group,
    mixer,
    actions,
    state: 'idle',
    left: CFG.creatures.firstRest,
    next:
      walks || roars
        ? (['walk', 'idle', 'roar', 'idle'].filter((k) => k === 'idle' || (k === 'walk' ? walks : roars)) as State[])
        : ['idle'],
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

/** A made model ready to stand (the townspeople use it too, at the Vigil): loaded once and copied, worn as pixel art from
    its texture, scaled to its height, on a shadow, with its clips ready in a mixer (a clip that doesn't loop holds its last
    pose). Null when `still()` says it is no longer wanted once it has loaded. Its group stands at the origin. */
export async function madeModel(id: string, still: () => boolean = () => true) {
  const info = CREATURES[id];
  if (!info) return null;
  const file = info.file;
  if (!loaded.has(file))
    loaded.set(
      file,
      loader.loadAsync(`${import.meta.env.BASE_URL}${file}`).then((g) => {
        g.scene.traverse((o) => {
          const m = (o as THREE.Mesh).material;
          if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.userData.shared = true));
        });
        return g;
      }),
    ); // (its materials shared by every copy: taking one away leaves them)
  const gltf = await loaded.get(file)!;
  if (!still()) return null;
  const model = cloneSkinned(gltf.scene),
    scale = info.height / info.modelHeight;
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry = m.geometry.clone();
      m.frustumCulled = false;
    }
  }); // (its own geometry: the bake writes colours into it, and taking it away disposes it)
  // (pixel art from its texture, baked by tools/texel-bake.ts at the size the game draws it)
  const base = import.meta.env.BASE_URL;
  await wearTexel(model, id, { file: base + info.texel.file, glow: base + info.texel.glow });
  if (!still()) return null;
  model.scale.setScalar(scale);
  const group = new THREE.Group();
  group.add(model);
  group.add(blob(Math.max(info.modelLength, info.modelHeight * 0.45) * scale * CFG.creatures.shadow));
  const mixer = new THREE.AnimationMixer(model),
    actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    a.setLoop(info.clips[clip.name]?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    actions[clip.name] = a;
  }
  return { info, group, model, mixer, actions, gltf };
}
/** The loaded model of `id`, if it has loaded (for an icon drawn at once). */
export const loadedScene = (id: string) => {
  const info = CREATURES[id];
  return info ? loaded.get(info.file) : undefined;
};

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
export function updateCreatures(dt: number, current: Room) {
  const C = CFG.creatures;
  for (const s of shown) {
    if (s.room !== current) continue;
    const info = CREATURES[s.id],
      scale = info.height / info.modelHeight;
    s.left -= dt;
    if (s.left <= 0) {
      s.state = s.next[0];
      s.next.push(s.next.shift()!);
      s.left = s.state === 'walk' ? C.walkFor : s.state === 'roar' ? info.clips.roar.duration : C.restFor;
      play(s, s.state === 'walk' ? 'walk' : s.state === 'roar' ? 'roar' : 'idle');
    }
    if (s.state === 'walk') {
      // round a lap about where it was stood (it starts on the lap's south side), at the pace its paws set
      s.angle += ((info.walkSpeed * scale) / C.lap) * dt;
      const x = s.at.x + Math.sin(s.angle) * C.lap,
        z = s.at.z + Math.cos(s.angle) * C.lap;
      s.group.position.set(x - s.room.cx, 0, z - s.room.cz);
      s.heading = s.angle + Math.PI / 2;
    } else if (s.state === 'roar') {
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
/** Make every creature shown roar now (the dev menu). */
export function roarNow() {
  for (const s of shown) {
    if (!s.actions.roar) continue;
    s.state = 'roar';
    s.left = CREATURES[s.id].clips.roar.duration;
    s.next = ['idle', 'walk', 'idle', 'roar'];
    play(s, 'roar');
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
/** A new floor: its rooms are gone, and the creatures with them. */
export function clearCreatures() {
  shown.length = 0;
}
