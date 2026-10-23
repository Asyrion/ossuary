/* Bosses made in Tripo (R3): a still model, worn as pixel art from its own texture, in place of the boss's look built in
   code (`props/foe_<id>.glb`, the way madeFoes.ts dresses the foes). The look in code is still built for what its fight
   reads: the rune ring and the halo stay as built (lifted to the model's height), and the eye's glow is set on the
   model's face. The parts the fight moves (a jaw, gills, a sword arm, legs) become empty places, and what the fight did
   to them shows on the model as a whole a frame later: the Abbess rears and swells as she wails, the Pyre Knight leans
   into his blade and bobs as he strides. Its size is the look in code's (`CFG.madeBosses`: `size` times it). A boss whose
   look is a head alone (the Pillar Dragon's, the jelly serpent's: their bodies are chains built in code) is `centre`d on
   its look in code rather than stood on the floor, and its glows set `at` points of the model (its eyes, its maw).
   A boss with a `creature` (the Hallowed Hart, docs/creatures.md) fights as that animated creature once it has loaded
   (`preloadBossCreatures`, at boot): the same fit and kept parts, its body a skinned mesh whose clips the fight plays by
   its states (`clip`, cross-faded), the head the fight lowers bowing its neck's bones on top of the clip, the eye's glow
   riding its head bone. Without it the still model stands, and without that the look in code. */
import * as THREE from 'three';
import type { BossBuilt } from './bossLooks';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { assetsOn, modelFor } from '../assets/models';
import { disposeTree } from '../render/materials';
import { CFG } from '../config';
import { madeSurface, type MadeSurface } from './madeFoes';
import { CREATURES, preloadCreature, readyCreature } from './madeCreatures';

const box = new THREE.Box3(),
  size = new THREE.Vector3(),
  had = new THREE.Vector3(),
  mid = new THREE.Vector3(),
  off = new THREE.Vector3();

/** How a boss's made look is fitted (`CFG.madeBosses`): see the config's note. */
interface MadeBoss extends MadeSurface {
  size: number;
  keep: readonly string[];
  fire?: string;
  eye?: number;
  centre?: boolean;
  at?: Readonly<Record<string, readonly number[]>>; // (x, y, z: 0 to 1 across its box)
  creature?: Creature;
}
/** A boss that fights as an animated creature (`CFG.madeBosses`, see the config's note). */
interface Creature {
  id: string;
  head: string;
  bow: Readonly<Record<string, number>>;
  blend: number;
  pace: readonly number[]; // (its slowest and fastest)
}

const BOSS_CREATURES_KEY = 'ossuary.bossCreatures';
let creaturesOn = (() => {
  try {
    return localStorage.getItem(BOSS_CREATURES_KEY) !== 'off';
  } catch {
    return true;
  }
})();
/** Whether a boss with a creature fights as it (the dev menu turns it off to compare with the still model). */
export const bossCreatures = () => creaturesOn;
/** Set it (from the next boss built on), remembered in this browser. */
export function setBossCreatures(on: boolean) {
  creaturesOn = on;
  try {
    localStorage.setItem(BOSS_CREATURES_KEY, on ? 'on' : 'off');
  } catch {
    /* kept for this session */
  }
}
/** Load the creatures bosses fight as (at boot, after the assets: none while they are off). Never rejects. */
export async function preloadBossCreatures() {
  if (!assetsOn()) return;
  const all = Object.values(CFG.madeBosses as Record<string, MadeBoss>);
  await Promise.all(all.flatMap((h) => (h.creature ? [preloadCreature(h.creature.id)] : [])));
}

/** How the fight's parts move the model as a whole, by boss: from the empty places it moves (`p`) onto the body. */
const POSE: Record<string, (body: THREE.Object3D, p: Record<string, THREE.Object3D>, t: number) => void> = {
  abbess(body, p) {
    const wail = Math.max(0, p.jaw.rotation.x),
      flare = Math.abs(p.gillL.rotation.z);
    body.rotation.x = -wail * 0.45; // (her head comes up as her jaw opens)
    body.scale.set(1 + flare * 0.12, 1 + wail * 0.1, 1);
  },
  pyre(body, p) {
    const stride = p.legL.rotation.x;
    body.rotation.x = Math.max(-0.35, Math.min(0.35, p.arms.rotation.x * 0.2)); // (leaning into the blade, back to raise it)
    body.position.y = Math.abs(Math.sin(stride)) * 0.06;
    body.rotation.z = stride * 0.08;
  },
  tiger(body, p) {
    moved(body, p.body); // (its crouch, its pounce's arc, its shake when stunned)
    const stride = p.legs.children[0]?.rotation.x ?? 0;
    body.position.y += Math.abs(Math.sin(stride)) * 0.04;
    body.rotation.x = -p.head.rotation.x * 0.25; // (its head comes up as it roars, down as it lunges)
    body.rotation.z = p.head.rotation.z * 0.5;
    body.rotation.y += (p.legs.children[1]?.rotation.x ?? 0) * 0.08; // (a paw swiped)
  },
  twins(body, p) {
    moved(body, p.body); // (its bob and its shake)
    body.rotation.x = p.body.rotation.x + Math.min(0, p.armR.rotation.x) * 0.1; // (rearing, and leaning back to raise a paw)
    body.rotation.y += p.head.rotation.y * 0.35; // (its gaze following the mage)
  },
};
POSE.twins2 = POSE.twins; // (the second guardian fights as the first)
POSE.hart = (body, p) => {
  moved(body, p.body);
  const stride = p.legs.children[0]?.rotation.x ?? 0;
  body.position.y += Math.abs(Math.sin(stride)) * 0.05;
  const charge = Math.max(0, Math.abs(stride) - 0.45) * 0.4; // (a wide stride is its charge: it lowers its antlers)
  body.rotation.x = p.body.rotation.x + p.head.rotation.x * 0.25 + charge;
};
POSE.warden = (body, p) => {
  const k = p.eye.scale.x - 1; // (its eye swells as its shots come due: it rears back and puffs up)
  body.rotation.x = -k * 0.35;
  body.scale.set(1 + k * 0.12, 1 + k * 0.08, 1 + k * 0.12);
};
POSE.dragon = (body, p, t) => {
  const gape = Math.max(0, p.jaw.rotation.x); // (a still can't open its jaw: it rears a little and swells as it would)
  body.rotation.x = p.head.rotation.x - gape * 0.25 + Math.sin(t * 0.9) * 0.05; // (its head dropping to breathe, as built)
  body.rotation.z = p.head.rotation.z + Math.sin(t * 1.2) * 0.06; // (its thrash when knocked down)
  body.scale.set(1 + gape * 0.06, 1 + gape * 0.14, 1);
};
POSE.serpent = (body, p, t) => {
  moved(body, p.head); // (drawn back before its lunge)
  const gape = Math.max(0, p.jaw.rotation.x);
  body.rotation.x = -gape * 0.3 + Math.sin(t * 1.1) * 0.05; // (it rears as its jaw drops to spit or bite)
  body.rotation.z = p.head.rotation.z + Math.sin(t * 1.4) * 0.07; // (its twitch when trapped)
  const fin = p.fins.scale.y - 1; // (its crest raised as it winds up, lowered as it dives)
  body.scale.set(1 + gape * 0.05, 1 + gape * 0.1 + fin * 0.12, 1);
};
POSE.kaelith = (body, p) => {
  moved(body, p.body); // (it sinks into shadow and rises; it shakes as it reels; it bows to hold the seal)
  const spread = p.mantle.scale.x - 1;
  // (leaning back to raise its blade, then into the sweep; bowed forward over the seal its hand holds)
  body.rotation.x = p.blade.rotation.x * 0.12 - p.hand.rotation.x * 0.2;
  body.scale.set(1 + spread * 0.25, 1, 1 + spread * 0.1); // (its wings spread in the sweep's tell, folded as it sinks)
  // (the code look's idle put these back each step, so a state that stops setting them lets them go; so does this)
  const rest = p.body.userData.rest as THREE.Vector3;
  p.body.position.y = rest.y;
  p.mantle.scale.x = 1;
};
POSE.angler = (body, p, t) => {
  moved(body, p.body); // (its flinch's shake)
  body.position.y += CFG.madeBosses.angler.hover + Math.sin(t * 1.3) * 0.08; // (it swims above the floor, as its look in code)
  body.scale.copy(p.body.scale); // (it swells as it calls its ring of shots)
  const gape = Math.max(0, p.jaw.rotation.x);
  body.rotation.x = -gape * 0.35; // (it rears as its jaw drops to pull or bite)
  body.scale.y *= 1 + gape * 0.08;
};
/** The body moved as the fight moved its empty place, from that place's rest. */
function moved(body: THREE.Object3D, place: THREE.Object3D) {
  const rest = place.userData.rest as THREE.Vector3;
  body.position.set(place.position.x - rest.x, place.position.y - rest.y, place.position.z - rest.z);
}

/** The made look of boss `id`, wrapping its look in code `code`, or undefined while it has none. */
export function madeBossLook(id: string, code: () => BossBuilt): (() => BossBuilt) | undefined {
  const how = (CFG.madeBosses as Record<string, MadeBoss>)[id];
  if (!how) return undefined;
  const c = how.creature;
  if (c && creaturesOn && assetsOn() && readyCreature(c.id)) return () => build(id, code(), how, animated(c));
  if (!modelFor('props', `foe_${id}`)) return undefined;
  return () => build(id, code(), how, { model: modelFor('props', `foe_${id}`)! });
}

/** What a made look is: its model, and when it is an animated creature, its mixer and clips. */
interface Worn {
  model: THREE.Object3D;
  creature?: Creature;
  mixer?: THREE.AnimationMixer;
  actions?: Record<string, THREE.AnimationAction>;
}
/** A copy of an animated creature loaded ahead: its own geometry (disposed with it) and skeleton, its clips in a mixer. */
function animated(c: Creature): Worn {
  const { gltf } = readyCreature(c.id)!,
    info = CREATURES[c.id],
    model = cloneSkinned(gltf.scene);
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry = m.geometry.clone();
      m.frustumCulled = false; // (its bones carry it beyond the box of its rest)
    }
  });
  const mixer = new THREE.AnimationMixer(model),
    actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    a.setLoop(info.clips[clip.name]?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = true;
    actions[clip.name] = a;
  }
  return { model, creature: c, mixer, actions };
}

/** The clip a boss made as a creature plays now, its time and pace (the dev hooks), or null. */
export const bossClipNow = (e: { model?: THREE.Object3D }) =>
  (e.model?.userData.clipNow as (() => { clip: string; time: number; rate?: number }) | undefined)?.() ?? null;

const bowAxis = new THREE.Vector3(),
  bowQ = new THREE.Quaternion(),
  upQ = new THREE.Quaternion();

function build(id: string, made: BossBuilt, how: MadeBoss, worn: Worn): BossBuilt {
  const { size: scale, keep, fire, eye = 0.55, centre = false, at = {} } = how;
  made.idle(0);
  made.group.updateMatrixWorld(true);
  // (its solid body only, as madeFoes.ts measures it)
  box.makeEmpty();
  made.group.traverse((o) => {
    const m = o as THREE.Mesh,
      mat = m.material as THREE.Material | undefined;
    if (m.isMesh && mat && !Array.isArray(mat) && !mat.transparent && mat.visible && m.visible)
      box.expandByObject(m, true);
  });
  box.getSize(had);
  box.getCenter(mid);
  const g = new THREE.Group(),
    body = new THREE.Group(),
    { model } = worn;
  model.updateMatrixWorld(true);
  box.setFromObject(model, true).getSize(size);
  model.scale.multiplyScalar((scale * Math.max(had.x, had.y, had.z)) / Math.max(size.x, size.y, size.z, 1e-3));
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const map = worn.creature ? readyCreature(worn.creature.id)!.map : (m.material as THREE.MeshToonMaterial).map;
    m.material = madeSurface(map, how); // (`tint` darkens a pale one off a pale floor; a creature's own baked texture)
  });
  body.add(model);
  g.add(body);
  box.setFromObject(model, true);
  if (centre) {
    // (a head: on the look in code's middle, where its body's chain meets it, not on the floor)
    model.position.add(off.copy(mid).sub(box.getCenter(off)));
    box.setFromObject(model, true);
  }
  // its kept parts' heights are scaled from the floor, or from its middle when centred
  const base = centre ? mid.y : 0,
    tall = box.max.y,
    lift = (centre ? box.max.y - box.min.y : tall) / Math.max(had.y, 1e-3),
    spot = (f: readonly number[]) =>
      new THREE.Vector3(
        THREE.MathUtils.lerp(box.min.x, box.max.x, f[0]),
        THREE.MathUtils.lerp(box.min.y, box.max.y, f[1]),
        THREE.MathUtils.lerp(box.min.z, box.max.z, f[2]),
      ),
    face = at.eye
      ? spot(at.eye)
      : new THREE.Vector3(0, centre ? THREE.MathUtils.lerp(box.min.y, box.max.y, eye) : tall * eye, box.max.z * 0.9); // (its eyes' height: eye of its own)
  // the fire of its part `fire` (a texture's painted flames don't light, the code's do): at the same height on the model
  const flames: THREE.Object3D[] = [];
  made.parts[fire ?? '']?.traverse((o) => {
    if (o.userData.fire) flames.push(o);
  });
  for (const f of flames) {
    f.getWorldPosition(f.position);
    f.position.multiplyScalar(lift);
    f.scale.multiplyScalar(lift);
    f.removeFromParent();
    body.add(f);
  }
  // the parts its fight reads: the kept ones as built, at the model's height; the eye's glow on its face; empty places
  const parts: Record<string, THREE.Object3D> = {},
    kept = keep.map((k) => made.parts[k]).filter(Boolean);
  for (const [name, p] of Object.entries(made.parts)) {
    let under: THREE.Object3D | null = p.parent;
    while (under && !kept.includes(under)) under = under.parent;
    if (under) {
      parts[name] = p; // (inside a kept part, it goes with it: the Angler's lure keeps its glow)
      continue;
    }
    if (keep.includes(name)) {
      p.getWorldPosition(p.position);
      p.position.y = base + (p.position.y - base) * lift;
      p.removeFromParent();
      g.add(p);
      parts[name] = p;
    } else if ((p as THREE.Sprite).isSprite && at[name]) {
      // (a glow of its own place on the model: the dragon's maw at its mouth, not its eyes)
      p.removeFromParent();
      p.position.copy(spot(at[name]));
      body.add(p);
      parts[name] = p;
    } else if ((p as THREE.Sprite).isSprite) {
      // (on the eye's place when there is one, so what the fight does to the eye shows in its glow)
      p.removeFromParent();
      if (parts.eye) p.position.set(0, 0, 0.02);
      else p.position.copy(face);
      (parts.eye ?? body).add(p);
      parts[name] = p;
    } else {
      const o = new THREE.Object3D();
      o.position.copy(name === 'eye' ? face : p.getWorldPosition(o.position));
      o.userData.rest = o.position.clone(); // (what a fight sets is measured from here: `moved`)
      for (let i = 0; i < p.children.length; i++) o.add(new THREE.Object3D()); // (a fight that reaches for a child finds one)
      body.add(o);
      parts[name] = o;
    }
  }
  disposeTree(made.group);
  if (worn.creature) return fights(made, g, body, parts, worn);
  const pose = POSE[id];
  return {
    group: g,
    shadow: made.shadow,
    openShadow: true,
    school: made.school,
    parts: parts as BossBuilt['parts'],
    idle(t) {
      body.position.set(0, 0, 0);
      body.rotation.set(0, Math.sin(t * 0.6) * 0.05, 0);
      body.scale.setScalar(1);
      pose?.(body, parts, t);
    },
  };
}

/** The made look of a boss that fights as an animated creature: its clips played by `clip` (the fight's states), on the
    boss's own clock (`idle(t)`), the fight's lowered head bowing its neck on top of the clip, its eye's glow on its head. */
function fights(
  made: BossBuilt,
  g: THREE.Group,
  body: THREE.Group,
  parts: Record<string, THREE.Object3D>,
  worn: Worn,
): BossBuilt {
  const { model, mixer, actions } = worn as Required<Worn>,
    c = worn.creature!,
    info = CREATURES[c.id];
  model.updateMatrixWorld(true);
  const head = model.getObjectByName(c.head);
  if (head && parts.eye) {
    // (the eye's place rides the head, so its glow goes where the antlers go; a holder keeps the model's scale off it)
    const eye = parts.eye,
      holder = new THREE.Object3D();
    holder.position.copy(eye.position);
    body.add(holder);
    body.updateMatrixWorld(true);
    head.attach(holder);
    eye.removeFromParent();
    eye.position.set(0, 0, 0);
    holder.add(eye);
  }
  const bows = Object.entries(c.bow).flatMap(([name, k]) => {
    const b = model.getObjectByName(name);
    return b ? [{ b, k, rest: b.quaternion.clone() }] : [];
  });
  const scale = model.scale.x; // (the model's units to the room's)
  let clip = '',
    last = 0;
  const play = (name: string, o: { speed?: number; beat?: number } = {}) => {
    const a = actions[name],
      ci = info.clips[name];
    if (!a || !ci || (name === clip && o.beat !== undefined)) return; // (a blow's timing is set once, as it starts)
    // its pace: a walk or gallop at the speed it covers, a stamp timed so its hooves fall as the fight's blow does
    const per = name === 'walk' ? info.walkSpeed : ci.speed;
    let rate = 1;
    if (o.speed !== undefined && per) rate = o.speed / (per * scale);
    else if (o.beat !== undefined && ci.at) rate = ci.at / Math.max(o.beat, 1e-3);
    a.timeScale = THREE.MathUtils.clamp(rate, c.pace[0], c.pace[1]);
    if (name === clip) return;
    const was = actions[clip];
    a.reset().play();
    if (was) was.crossFadeTo(a, c.blend, false);
    clip = name;
  };
  play('idle');
  g.userData.clipNow = () => ({ clip, time: +(actions[clip]?.time ?? 0).toFixed(2), rate: actions[clip]?.timeScale });
  return {
    group: g,
    shadow: made.shadow,
    openShadow: true,
    school: made.school,
    parts: parts as BossBuilt['parts'],
    clip: play,
    idle(t) {
      const dt = THREE.MathUtils.clamp(t - last, 0, 0.1);
      last = t;
      for (const w of bows) w.b.quaternion.copy(w.rest); // (a bone no clip turns would keep the last bow)
      mixer.update(dt);
      // the fight's head (lowered as it aims, shaken when stunned): the neck bowed about the creature's own left-right axis
      const lower = parts.head?.rotation.x ?? 0;
      if (lower)
        for (const w of bows) {
          upQ.identity();
          for (let p = w.b.parent; p && p !== model; p = p.parent) upQ.premultiply(p.quaternion);
          bowAxis.set(1, 0, 0).applyQuaternion(upQ.invert());
          w.b.quaternion.premultiply(bowQ.setFromAxisAngle(bowAxis, lower * w.k));
        }
    },
  };
}
