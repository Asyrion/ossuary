/* The foes built in code (M4, docs/M4-plan.md): each is its model option (modelOptions.ts) made a foe. Its still parts
   are merged (render/rig.ts), its idle plays on its own clock (`at`: a frozen foe stops, a swelling one holds still), and
   its behaviour, by kind, moves it, telegraphs and attacks; a behaviour may pose the model's parts after the idle (a
   beetle's wing-cases, a mimic's lid). What every foe shares is here: the telegraph (its body glows in its school's
   light and swells, and a sound warns), squashing when hit, and the shots and clouds it attacks with. What each is
   (health, school, affinities, parameters) is data (foeData.ts, data/foes.json).

   Hopper (the Sporeling): hops at the mage, moving only while in the air; now and then, landed and near enough, it holds
     still and swells, then puffs a cloud of spores that stings and dims the mage's sight (props.ts: fire makes it flash).
   Flutter (the Vesper Moth): flies in loops round the mage, or round a lit brazier or candle stand it is lured to (and
     dipping into the flame, it burns); circling the mage, its wings flare and it scatters a ring of slow light motes.
   Charger (the Rune Beetle): wanders; lined up with the mage, its runes flash and it charges until something stops it;
     stunned, its wing-cases part and it throws a spark at the mage.
   Mimic (the Urn Mimic): stands among the urns as an urn, and does nothing until the mage comes close, it is struck, or
     no foe in the room has been awake for a while (so a room is never left locked on a hidden one); then it peeks, spits a fan of embers (they light what burns), hops after the mage and shuts
     again, taking half of any blow while shut. */
import * as THREE from 'three';
import type { Enemy, PropBox, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { mergeRig } from '../render/rig';
import { burst } from '../combat/fx';
import { spawnShot } from '../combat/projectiles';
import { addSpores } from '../world/props';
import { freeSpotNear } from '../world/rooms';
import { inflict } from '../magic/statusFx';
import { lerp, mulberry, rand } from '../util';
import { MODEL_OPTIONS } from './modelOptions';
import { metFoe } from './bestiary';
import type { FoeDef } from './foeData';

/** Where the mage is from the foe: the unit direction and the distance. */
export interface Aim { ux: number; uz: number; dist: number }
type Params = FoeDef['params'];
interface Behaviour {
  /** Its first state and timers. */ init(e: Enemy, P: Params): void;
  /** One step: sets its velocity (and its state); returns the way it should face, if not at the mage. */
  step(e: Enemy, dt: number, a: Aim, P: Params, room: Room): number | void;
  /** After its idle: the parts it moves itself. */ pose?(e: Enemy, P: Params): void;
  /** It ran into a wall or a rock this step (`hit`), or didn't. */ bump?(e: Enemy, hit: boolean, P: Params): void;
}
const num = (v: number | number[]) => v as number, span = (v: number | number[]) => rand(...(v as [number, number]));
const light = (e: Enemy) => SCHOOL_LIGHT[e.foe!.school];

/** Build foe `def` into `e`: its model, merged, in `e.body`; its surfaces that a hit or a status lights. */
export function buildFoe(e: Enemy, def: FoeDef) {
  const opt = MODEL_OPTIONS.find(o => o.id === def.id);
  if (!opt) throw new Error(`foe ${def.id}: no model option of that id`);
  const b = opt.build();
  e.mats = mergeRig(b.group, b.idle, def.id);
  for (const m of e.mats) m.userData.base = m.emissive.clone();
  e.foe = def; e.model = b.group; e.idle = b.idle; e.parts = b.parts; e.at = Math.random() * 4; e.tele = 0; e.shadow = b.shadow;
  e.flying = def.flying; e.contact = def.contact;
  e.body.add(b.group);
  BEHAVIOURS[def.behaviour].init(e, def.params);
  metFoe(def.id);
}

/** One step of foe `e` (it can act): its behaviour, then its idle, then the parts its behaviour poses; returns where it
    faces. */
export function updateFoe(e: Enemy, dt: number, a: Aim) {
  const def = e.foe!, B = BEHAVIOURS[def.behaviour], face = B.step(e, dt, a, def.params, G.current);
  e.at! += dt * (e.animRate ?? 1);
  e.idle!(e.at!); B.pose?.(e, def.params);
  return face;
}
/** After it moved: whether it ran into a wall or a rock. */
export function bumpFoe(e: Enemy, hit: boolean) { BEHAVIOURS[e.foe!.behaviour].bump?.(e, hit, e.foe!.params); }

/** Every step, able to act or not: the swell of a telegraph and the squash of a hit, on the whole model. */
export function poseFoe(e: Enemy) {
  const t = e.tele ?? 0, hit = e.flash > 0 ? 1 : 0;
  e.model!.scale.set(1 + t * .22 + hit * .14, 1 + t * .14 - hit * .16, 1 + t * .22 + hit * .14);
  e.model!.position.x = t > 0 ? Math.sin(e.t * 55) * .02 * t : 0;
}
/** The school's light a telegraphing foe glows with. */
export const teleColor = (e: Enemy) => new THREE.Color(light(e));

/** Where the `k`th Urn Mimic of a wave stands when it comes: beside one of the room's urns (on the room's seed, each its
    own while there are enough), else where it was. */
export function mimicSpot(room: Room, x: number, z: number, k: number) {
  const urns = room.rocks.filter(r => r.urn && r.hp > 0);
  if (!urns.length) return { x, z };
  const R = mulberry(room.plan.seed ^ 0x3171c), first = Math.floor(R() * urns.length), u = urns[(first + k) % urns.length], side = (R() < .5 ? -1 : 1) * (k >= urns.length ? -1 : 1);
  return freeSpotNear(room, u.x + side * .9, u.z);
}

/** The lit braziers and candle stands in `room` (a moth is lured to them). */
const litFires = (room: Room) => (room.props ?? []).filter((b: PropBox) => (b.prop.kind === 'brazier' || b.prop.kind === 'candles') && b.prop.lit);

/* ---------- behaviours ---------- */

const BEHAVIOURS: Record<string, Behaviour> = {
  hopper: {
    init(e, P) { e.state = 'hop'; e.fireT = span(P.puffEvery) * .6; },
    step(e, dt, a, P, room) {
      if (e.state === 'hop') {
        e.animRate = 1;
        const k = ((e.at ?? 0) * num(P.hopRate)) % 1, air = k < .55, sp = air ? e.foe!.speed * e.speedMul : 0;
        const wob = Math.sin(e.t * 1.7 + e.x * 3) * .4; // (a crowd doesn't queue in one line)
        e.vx = (a.ux - a.uz * wob) * sp; e.vz = (a.uz + a.ux * wob) * sp;
        e.fireT! -= dt;
        if (e.fireT! <= 0 && !air && k > .75 && a.dist < num(P.puffRange)) { e.state = 'swell'; e.st = num(P.puffTell); Sfx.at(e.x, e.z).sporeSwell(); }
      } else if (e.state === 'swell') {
        e.vx = e.vz = 0; e.animRate = 0; e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.puffTell));
        if (e.st <= 0) {
          e.tele = 0; e.state = 'hop'; e.fireT = span(P.puffEvery);
          addSpores(room, e.x, e.z, { color: SCHOOL_LIGHT.umbral, sting: num(P.dim) });
          burst(e.x, .5, e.z, SCHOOL_LIGHT.umbral, 12, 1.8, .05); Sfx.at(e.x, e.z).sporePuff();
        }
      }
    },
  },

  flutter: {
    init(e, P) { e.state = 'loop'; e.fireT = span(P.flareEvery); e.cycle = Math.random() * Math.PI * 2; e.st = 0; },
    step(e, dt, a, P, room) {
      // every so often it chooses what to circle: a lit fire near it (most of the time), else the mage
      if ((e.st -= dt) <= 0) {
        e.st = 2.5;
        const fire = litFires(room).map(b => ({ x: b.x, z: b.z, d: Math.hypot(b.x - e.x, b.z - e.z) })).sort((p, q) => p.d - q.d)[0];
        e.target = fire && fire.d < 7 && Math.random() < num(P.lure) ? { x: fire.x, z: fire.z } : undefined;
        if (e.target && e.state === 'flare') { e.state = 'loop'; e.tele = 0; }
      }
      const lured = e.target, cx = lured?.x ?? player.x, cz = lured?.z ?? player.z;
      if (e.state === 'loop') {
        const R = (lured ? .7 : num(P.orbit)) * (1 + .4 * Math.sin((e.cycle ?? 0) * 2)); // (loops in and out: a figure of eight round it)
        e.cycle = (e.cycle ?? 0) + dt * num(P.orbitSpeed) * (2.4 / Math.max(.8, R));
        const tx = cx + Math.cos(e.cycle) * R, tz = cz + Math.sin(e.cycle) * R * .8, dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
        const sp = e.foe!.speed * e.speedMul * Math.min(1, d);
        e.vx = lerp(e.vx, dx / d * sp, Math.min(1, dt * 4)); e.vz = lerp(e.vz, dz / d * sp, Math.min(1, dt * 4));
        if (lured && Math.hypot(e.x - lured.x, e.z - lured.z) < .45 && Math.random() < dt * 1.5) inflict(e, { burn: 1 }); // a moth to the flame
        if (!lured && (e.fireT! -= dt) <= 0 && a.dist < 5.5) { e.state = 'flare'; e.fireT = num(P.flareTell); Sfx.at(e.x, e.z).mothFlare(); }
      } else if (e.state === 'flare') { // it hangs still, its wings glowing, then scatters its dust
        e.vx *= Math.exp(-6 * dt); e.vz *= Math.exp(-6 * dt);
        e.tele = Math.min(1, 1 - e.fireT! / num(P.flareTell));
        if ((e.fireT! -= dt) <= 0) {
          const n = num(P.motes), a0 = Math.random() * Math.PI;
          for (let i = 0; i < n; i++) { const t = a0 + i / n * Math.PI * 2; spawnShot(e.x + Math.cos(t) * .25, e.z + Math.sin(t) * .25, Math.cos(t), Math.sin(t), num(P.moteSpeed), light(e), .7, .75); }
          burst(e.x, .7, e.z, light(e), 10, 1.6, .03); Sfx.at(e.x, e.z).mothDust();
          e.state = 'loop'; e.tele = 0; e.fireT = span(P.flareEvery);
        }
      }
    },
  },

  charger: {
    init(e) { e.state = 'wander'; e.st = rand(.5, 1.5); e.dir = { x: 1, z: 0 }; e.open = 0; },
    step(e, dt, a, P) {
      const dir = e.dir!, sp = e.foe!.speed * e.speedMul; e.st -= dt;
      if (e.state === 'wander') {
        e.vx = dir.x * sp; e.vz = dir.z * sp;
        if (e.st <= 0) { // a new way: half the time the mage's way along its longer axis
          const to = Math.abs(a.ux) > Math.abs(a.uz) ? [Math.sign(a.ux), 0] : [0, Math.sign(a.uz)];
          const d = Math.random() < .5 ? to : [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.random() * 4 | 0];
          e.dir = { x: d[0], z: d[1] }; e.st = rand(.8, 1.8);
        }
        const dx = player.x - e.x, dz = player.z - e.z;
        if ((Math.abs(dz) < .45 || Math.abs(dx) < .45) && a.dist < num(P.sight)) {
          e.dir = Math.abs(dz) < .45 ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
          e.state = 'tell'; e.st = num(P.tell); Sfx.at(e.x, e.z).beetleTell();
        }
      } else if (e.state === 'tell') {
        e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.tell));
        if (e.st <= 0) { e.state = 'charge'; e.tele = 0; }
      } else if (e.state === 'charge') {
        e.vx = dir.x * num(P.charge) * e.speedMul; e.vz = dir.z * num(P.charge) * e.speedMul;
        if (Math.random() < dt * 20) burst(e.x - dir.x * .2, .15, e.z - dir.z * .2, 0x6a5a4a, 1, .6, .04); // (dust thrown up)
      } else if (e.state === 'stun') { // dazed: its wing-cases part, and it throws a spark
        e.vx = e.vz = 0; e.open = Math.min(1, (e.open ?? 0) + dt * 4);
        if (!e.fireT && e.st < num(P.stun) * .55) {
          e.fireT = 1; // (thrown once a stun)
          spawnShot(e.x + a.ux * .3, e.z + a.uz * .3, a.ux, a.uz, num(P.sparkSpeed), light(e), .5, .9);
          burst(e.x, .45, e.z, light(e), 8, 1.8, .03); Sfx.at(e.x, e.z).spark();
        }
        if (e.st <= 0) { e.state = 'wander'; e.st = rand(.6, 1.2); }
        return;
      }
      if (e.state !== 'stun') e.open = Math.max(0, (e.open ?? 0) - dt * 3);
      return Math.atan2(dir.x, dir.z);
    },
    bump(e, hit, P) {
      if (!hit) return;
      if (e.state === 'charge') { e.state = 'stun'; e.st = num(P.stun); e.fireT = 0; G.shake = Math.max(G.shake, .12); Sfx.at(e.x, e.z).beetleThud(); burst(e.x, .3, e.z, 0x8a7a6a, 8, 1.4, .05); }
      else if (e.state === 'wander') e.dir = { x: -e.dir!.x, z: -e.dir!.z };
    },
    pose(e) {
      const o = e.open ?? 0, p = e.parts!;
      p.halfL.rotation.z = -o * .5; p.halfR.rotation.z = o * .5;
      ((p.inner as THREE.Sprite).material).opacity = o * .9 + (e.tele ?? 0) * .6;
    },
  },

  mimic: {
    init(e) { e.state = 'hidden'; e.contact = 0; e.animRate = 0; e.at = 0; e.open = 0; e.st = 0; e.spawn = .01; }, // (an urn doesn't rise out of the floor)
    step(e, dt, a, P) {
      e.st -= dt;
      if (e.state === 'hidden') {
        e.vx = e.vz = 0; e.animRate = 0;
        const stillness = G.enemies.every(o => o.dead || o.state === 'hidden'); // (nothing awake: one of them stirs)
        e.fireT = stillness ? (e.fireT ?? 0) + dt : 0;
        if (a.dist < num(P.wake) || e.hp < e.maxHp || e.fireT > num(P.lonely) * (1 + (e.x * 7.3 % 1 + 1) % 1 * .6)) {
          e.state = 'peek'; e.st = num(P.tell); e.contact = e.foe!.contact; e.animRate = 1;
          burst(e.x, .45, e.z, 0xb0603c, 8, 1.6, .05); Sfx.at(e.x, e.z).mimicWake();
        }
        return e.face;
      }
      if (e.state === 'peek') { // the lid lifts, the eyes look out, the fire inside swells
        e.vx = e.vz = 0; e.guard = 1;
        e.open = Math.min(1, 1 - e.st / num(P.tell)); e.tele = e.open;
        if (e.st <= 0) {
          const n = num(P.shots), base = Math.atan2(a.uz, a.ux);
          for (let i = 0; i < n; i++) { const t = base + (i - (n - 1) / 2) * num(P.spread); spawnShot(e.x + Math.cos(t) * .3, e.z + Math.sin(t) * .3, Math.cos(t), Math.sin(t), num(P.shotSpeed), light(e), .5, .85, { fire: true }); }
          burst(e.x, .6, e.z, light(e), 10, 1.8, .04); Sfx.at(e.x, e.z).mimicSpit();
          e.state = 'hop'; e.st = num(P.hop); e.tele = 0;
        }
      } else if (e.state === 'hop') { // after the mage, lid up, a little way
        const sp = e.foe!.speed * e.speedMul; e.vx = a.ux * sp; e.vz = a.uz * sp; e.open = 1;
        if (e.st <= 0) { e.state = 'shut'; e.st = num(P.shut); e.guard = num(P.guard); Sfx.at(e.x, e.z).mimicShut(); }
      } else if (e.state === 'shut') { // it hides in its clay again
        e.vx = e.vz = 0; e.open = Math.max(0, (e.open ?? 0) - dt * 5);
        if (e.st <= 0) { e.state = 'peek'; e.st = num(P.tell); }
      }
    },
    pose(e) {
      const o = e.open ?? 0, p = e.parts!;
      p.lid.rotation.x = -o * .8; p.peek.position.y = .42 + o * .085;
      ((p.inside as THREE.Sprite).material).opacity = .15 + o * .6;
    },
  },
};
