/* Bosses made in Tripo (R3): a still model, worn as pixel art from its own texture, in place of the boss's look built in
   code (`props/foe_<id>.glb`, the way madeFoes.ts dresses the foes). The look in code is still built for what its fight
   reads: the rune ring and the halo stay as built (lifted to the model's height), and the eye's glow is set on the
   model's face. The parts the fight moves (a jaw, gills, a sword arm, legs) become empty places, and what the fight did
   to them shows on the model as a whole a frame later: the Abbess rears and swells as she wails, the Pyre Knight leans
   into his blade and bobs as he strides. Its size is the look in code's (`CFG.madeBosses`: `size` times it). A boss whose
   look is a head alone (the Pillar Dragon's, the jelly serpent's: their bodies are chains built in code) is `centre`d on
   its look in code rather than stood on the floor, and its glows set `at` points of the model (its eyes, its maw).
   A boss with a `creature` (the Hallowed Hart, the Hollow Warden: docs/creatures.md) fights as that animated creature
   once it has loaded (`preloadBossCreatures`, as its floor is built; the title waits for none): the same fit and kept
   parts, its body a skinned mesh whose clips the fight plays by its states (`clip`, cross-faded), a flinch played over them (`over`), the head the fight lowers
   bowing its neck's bones on top of the clip, the eye's glow riding its head bone. Without it the still model stands, and
   without that the look in code. */
import * as THREE from 'three';
import type { BossBuilt, ClipAsk } from './bossLooks';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { assetsOn, modelFor } from '../assets/models';
import { disposeTree } from '../render/materials';
import { CFG } from '../config';
import { madeSurface, type MadeSurface } from './madeFoes';
import { CREATURES, keepMixer, overClip, preloadCreature, readyCreature } from './madeCreatures';

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
  bow?: Readonly<Record<string, number>>;
  look?: Readonly<Record<string, number>>; // (its neck's bones turned by these shares of the fight's head turning)
  blend: number;
  pace: readonly number[]; // (its slowest and fastest)
  over?: Readonly<Record<string, number>>; // (a clip played over the others, and the seconds it rests before it plays again)
  moves?: string; // (the part whose place the fight moves: a leap lifts the creature, a shake shakes it; a crouch is the clip's)
  under?: boolean; // (and it may take it below the floor: Kaelith sinking into shadow)
  fire?: string; // (the bone its fire rides: the Pyre Knight's helm)
  tint?: number; // (its own texture's tint, where it isn't the still's: the still's texture was darker or lighter)
}

const BOSS_CREATURES_KEY = 'ossuary.bossCreatures';
let creaturesOn = (() => {
  try {
    return localStorage.getItem(BOSS_CREATURES_KEY) !== 'off';
  } catch {
    return true;
  }
})();
/** The creatures bosses fight as, by boss (the dev menu names them on its switch). */
export const bossCreatureIds = () =>
  Object.entries(CFG.madeBosses as Record<string, MadeBoss>).flatMap(([boss, h]) =>
    h.creature ? [{ boss, creature: h.creature.id }] : [],
  );
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
/** Start loading the creatures boss `boss` fights as (as its floor is built, flow.ts; none while the assets are off): its
    own, and those of the looks named after it (the second Twin Guardian's `twins2`, Kaelith kneeling's
    `kaelith_kneel`). Never rejects. */
export async function preloadBossCreatures(boss: string) {
  if (!assetsOn()) return;
  const all = Object.entries(CFG.madeBosses as Record<string, MadeBoss>);
  await Promise.all(
    all.flatMap(([k, h]) => (h.creature && k.startsWith(boss) ? [preloadCreature(h.creature.id)] : [])),
  );
}

const P = CFG.bossPose;
/** How the fight's parts move the model as a whole, by boss: from the empty places it moves (`p`) onto the body
    (`CFG.bossPose`). */
const POSE: Record<string, (body: THREE.Object3D, p: Record<string, THREE.Object3D>, t: number) => void> = {
  abbess(body, p) {
    const A = P.abbess,
      wail = Math.max(0, p.jaw.rotation.x),
      flare = Math.abs(p.gillL.rotation.z);
    body.rotation.x = -wail * A.rear; // (her head comes up as her jaw opens)
    body.scale.set(1 + flare * A.flare, 1 + wail * A.wail, 1);
  },
  pyre(body, p) {
    const K = P.pyre,
      stride = p.legL.rotation.x;
    body.rotation.x = Math.max(-K.leanMost, Math.min(K.leanMost, p.arms.rotation.x * K.lean)); // (leaning into the blade, back to raise it)
    body.position.y = Math.abs(Math.sin(stride)) * K.bob;
    body.rotation.z = stride * K.roll;
  },
  tiger(body, p) {
    const T = P.tiger;
    moved(body, p.body); // (its crouch, its pounce's arc, its shake when stunned)
    const stride = p.legs.children[0]?.rotation.x ?? 0;
    body.position.y += Math.abs(Math.sin(stride)) * T.bob;
    body.rotation.x = -p.head.rotation.x * T.nod; // (its head comes up as it roars, down as it lunges)
    body.rotation.z = p.head.rotation.z * T.roll;
    body.rotation.y += (p.legs.children[1]?.rotation.x ?? 0) * T.swipe; // (a paw swiped)
  },
  twins(body, p) {
    moved(body, p.body); // (its bob and its shake)
    body.rotation.x = p.body.rotation.x + Math.min(0, p.armR.rotation.x) * P.twins.rear; // (rearing, and leaning back to raise a paw)
    body.rotation.y += p.head.rotation.y * P.twins.gaze; // (its gaze following the mage)
  },
};
POSE.twins2 = POSE.twins; // (the second guardian fights as the first)
POSE.hart = (body, p) => {
  const H = P.hart;
  moved(body, p.body);
  const stride = p.legs.children[0]?.rotation.x ?? 0;
  body.position.y += Math.abs(Math.sin(stride)) * H.bob;
  const charge = Math.max(0, Math.abs(stride) - H.stride) * H.charge; // (a wide stride is its charge: it lowers its antlers)
  body.rotation.x = p.body.rotation.x + p.head.rotation.x * H.nod + charge;
};
POSE.warden = (body, p) => {
  const W = P.warden,
    k = p.eye.scale.x - 1; // (its eye swells as its shots come due: it rears back and puffs up)
  body.rotation.x = -k * W.rear;
  body.scale.set(1 + k * W.puff[0], 1 + k * W.puff[1], 1 + k * W.puff[0]);
};
POSE.dragon = (body, p, t) => {
  const D = P.dragon,
    gape = Math.max(0, p.jaw.rotation.x); // (a still can't open its jaw: it rears a little and swells as it would)
  body.rotation.x = p.head.rotation.x - gape * D.rear + Math.sin(t * D.breathe[0]) * D.breathe[1]; // (its head dropping to breathe, as built)
  body.rotation.z = p.head.rotation.z + Math.sin(t * D.thrash[0]) * D.thrash[1]; // (its thrash when knocked down)
  body.scale.set(1 + gape * D.swell[0], 1 + gape * D.swell[1], 1);
};
POSE.serpent = (body, p, t) => {
  const S = P.serpent;
  moved(body, p.head); // (drawn back before its lunge)
  const gape = Math.max(0, p.jaw.rotation.x);
  body.rotation.x = -gape * S.rear + Math.sin(t * S.sway[0]) * S.sway[1]; // (it rears as its jaw drops to spit or bite)
  body.rotation.z = p.head.rotation.z + Math.sin(t * S.twitch[0]) * S.twitch[1]; // (its twitch when trapped)
  const fin = p.fins.scale.y - 1; // (its crest raised as it winds up, lowered as it dives)
  body.scale.set(1 + gape * S.swell[0], 1 + gape * S.swell[1] + fin * S.crest, 1);
};
POSE.kaelith = (body, p) => {
  const K = P.kaelith;
  moved(body, p.body); // (it sinks into shadow and rises; it shakes as it reels; it bows to hold the seal)
  const spread = p.mantle.scale.x - 1;
  // (leaning back to raise its blade, then into the sweep; bowed forward over the seal its hand holds)
  body.rotation.x = p.blade.rotation.x * K.lean - p.hand.rotation.x * K.bow;
  body.scale.set(1 + spread * K.spread[0], 1, 1 + spread * K.spread[1]); // (its wings spread in the sweep's tell, folded as it sinks)
  // (the code look's idle put these back each step, so a state that stops setting them lets them go; so does this)
  const rest = p.body.userData.rest as THREE.Vector3;
  p.body.position.y = rest.y;
  p.mantle.scale.x = 1;
};
POSE.angler = (body, p, t) => {
  const A = P.angler;
  moved(body, p.body); // (its flinch's shake)
  body.position.y += CFG.madeBosses.angler.hover + Math.sin(t * A.swim[0]) * A.swim[1]; // (it swims above the floor, as its look in code)
  body.scale.copy(p.body.scale); // (it swells as it calls its ring of shots)
  const gape = Math.max(0, p.jaw.rotation.x);
  body.rotation.x = -gape * A.rear; // (it rears as its jaw drops to pull or bite)
  body.scale.y *= 1 + gape * A.swell;
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
  const mixer = keepMixer(model),
    actions: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    const over = c.over?.[clip.name] !== undefined,
      a = mixer.clipAction(over ? overClip(c.id, clip) : clip);
    a.setLoop(over || info.clips[clip.name]?.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = !over; // (a flinch played over the others lets go when it ends)
    actions[clip.name] = a;
  }
  return { model, creature: c, mixer, actions };
}

/** The clip a boss made as a creature plays now, its time and pace (the dev hooks), or null. */
export const bossClipNow = (e: { model?: THREE.Object3D }) =>
  (
    e.model?.userData.clipNow as (() => { clip: string; time: number; rate?: number; over: string[] }) | undefined
  )?.() ?? null;

const bowAxis = new THREE.Vector3(),
  bowQ = new THREE.Quaternion(),
  upQ = new THREE.Quaternion();

function build(id: string, made: BossBuilt, how: MadeBoss, worn: Worn): BossBuilt {
  const { size: scale, keep, fire, eye = P.eye, centre = false, at = {} } = how;
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
    // (`tint` darkens a pale one off a pale floor; a creature's own baked texture, with a tint of its own if it has one)
    const tint = worn.creature?.tint;
    m.material = madeSurface(map, tint === undefined ? how : { ...how, tint });
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
      : new THREE.Vector3(0, centre ? THREE.MathUtils.lerp(box.min.y, box.max.y, eye) : tall * eye, box.max.z * P.face); // (its eyes' height: eye of its own)
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
      if (parts.eye) p.position.set(0, 0, P.glowOut);
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
      body.rotation.set(0, Math.sin(t * P.sway[0]) * P.sway[1], 0);
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
  // (a bone by its name in the file: the loader strips the characters a track path reserves, Tripo's `tripo::Head_1`
  // comes as `tripoHead_1`)
  const boneOf = (name: string) => model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name));
  const head = boneOf(c.head);
  /** `o` (on the body) made to ride bone `b` where it stands; a holder keeps the model's scale off it. */
  const ride = (o: THREE.Object3D, b: THREE.Object3D) => {
    const holder = new THREE.Object3D();
    holder.position.copy(o.position);
    body.add(holder);
    body.updateMatrixWorld(true);
    b.attach(holder);
    o.removeFromParent();
    o.position.set(0, 0, 0);
    holder.add(o);
  };
  // (the eye's place rides the head, so its glow goes where the antlers go)
  if (head && parts.eye) ride(parts.eye, head);
  // (its fire rides its bone, as it rode its part of the look in code: the Pyre Knight's helm)
  const fireBone = c.fire ? boneOf(c.fire) : undefined;
  if (fireBone) for (const f of body.children.filter((o) => o.userData.fire)) ride(f, fireBone);
  const mover = c.moves ? parts[c.moves] : undefined;
  const bonesOf = (by: Readonly<Record<string, number>> = {}) =>
    Object.entries(by).flatMap(([name, k]) => {
      const b = boneOf(name);
      return b ? [{ b, k, rest: b.quaternion.clone() }] : [];
    });
  const bows = bonesOf(c.bow),
    looks = bonesOf(c.look),
    turned = [...bows, ...looks];
  /** Bones `ws` turned by `angle` times each one's share about the creature's own axis `x, y, z`. */
  const bend = (ws: typeof bows, angle: number, x: number, y: number, z: number) => {
    for (const w of ws) {
      upQ.identity();
      for (let p = w.b.parent; p && p !== model; p = p.parent) upQ.premultiply(p.quaternion);
      bowAxis.set(x, y, z).applyQuaternion(upQ.invert());
      w.b.quaternion.premultiply(bowQ.setFromAxisAngle(bowAxis, angle * w.k));
    }
  };
  const scale = model.scale.x; // (the model's units to the room's)
  let clip = '',
    last = 0;
  const overAt: Record<string, number> = {};
  const play = (name: string, o?: Readonly<ClipAsk>) => {
    const a = actions[name],
      ci = info.clips[name],
      speed = o?.speed,
      beat = o?.beat;
    if (!a || !ci || (name === clip && beat !== undefined)) return; // (a blow's timing is set once, as it starts)
    const rest = c.over?.[name];
    if (rest !== undefined) {
      // (a flinch, over whatever plays: once it has played and rested)
      if (last - (overAt[name] ?? -Infinity) < ci.duration + rest) return;
      overAt[name] = last;
      a.reset().play();
      return;
    }
    // (asked to follow a blow: once that has played out)
    if (o?.after && name !== clip && info.clips[clip]?.loop === false && actions[clip]?.isRunning()) return;
    // its pace: a walk or gallop at the speed it covers, a stamp timed so its hooves fall as the fight's blow does
    const per = name === 'walk' ? info.walkSpeed : ci.speed;
    let rate = 1;
    if (speed !== undefined && per) rate = speed / (per * scale);
    else if (beat !== undefined && (ci.at ?? ci.events[0]?.t)) rate = (ci.at ?? ci.events[0].t) / Math.max(beat, 1e-3); // (a clip with no `at` falls on its first sound: Kaelith's sweep)
    a.timeScale = THREE.MathUtils.clamp(rate, c.pace[0], c.pace[1]);
    if (name === clip) return;
    const was = actions[clip];
    a.reset().play();
    if (was) was.crossFadeTo(a, c.blend, false);
    clip = name;
  };
  play('idle');
  g.userData.clipNow = () => ({
    clip,
    time: +(actions[clip]?.time ?? 0).toFixed(2),
    rate: actions[clip]?.timeScale,
    over: Object.keys(c.over ?? {}).filter((k) => actions[k]?.isRunning()),
  });
  return {
    group: g,
    shadow: made.shadow,
    openShadow: true,
    school: made.school,
    parts: parts as BossBuilt['parts'],
    clip: play,
    idle(t) {
      const dt = THREE.MathUtils.clamp(t - last, 0, P.stepMost);
      last = t;
      for (const w of turned) w.b.quaternion.copy(w.rest); // (a bone no clip turns would keep the last bow)
      mixer.update(dt);
      if (mover) {
        // (what the fight did to its moving part: a leap's arc lifts it, a shake shakes it; it never sinks through the floor)
        const rest = mover.userData.rest as THREE.Vector3;
        const y = mover.position.y - rest.y;
        body.position.set(mover.position.x - rest.x, c.under ? y : Math.max(0, y), mover.position.z - rest.z);
      }
      // the fight's head (lowered as it aims, shaken when stunned): the neck bowed about the creature's own left-right axis
      const lower = parts.head?.rotation.x ?? 0;
      if (lower) bend(bows, lower, 1, 0, 0);
      // and its gaze, as the fight turns its head after the mage (the Twin Guardians, even as stone): about its own up
      const gaze = parts.head?.rotation.y ?? 0;
      if (gaze) bend(looks, gaze, 0, 1, 0);
    },
  };
}
