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
     again, taking half of any blow while shut.
   Floor 4 (M4.1): Scamper (the Wickmouse) runs from cover to cover a few tiles off the mage, peeps (its candle flares) and
     darts at the mage, lighting oil it runs through; its candle falls burning when it dies (`die`). Chimer (the Chime Bat)
     loops round the mage; its bell rings and the ground under the mage is marked with a closing ring, where a spark
     strikes a moment later (shocking water there). Gargoyle (the Gargoyle Whelp) sits as stone (bolts glance off it:
     `guard`) until the mage comes near or it has rested; then it wakes, pounces twice, landing in a ring of frost shots,
     and turns to stone again. Healer (the Moonstag Fawn) keeps away from the mage and near the other foes, and bows to
     heal the hurt ones round it.
   Floor 5 (M4.1): Burrower (the Rootling) toddles at the mage, then digs in and creeps after it as a mound, and bursts up
     under it (a ring warns first) in a spray of dark motes; burning, or on burning oil, it can't go under, and fire on
     its mound drives it up dazed. Glider (the Storm Ray) circles, then lines up and makes a long pass through where the
     mage stands, laying a line of sparks that crackle, then arm: they shock water and sting. Absorber (the Void Mote)
     keeps a few tiles off and swallows the cantrip's bolts (`struck`), growing with each; full, it swells and spills them
     as a ring of dark shots, and hangs open to harm for a moment; spells hurt it as ever. Shell (the Lantern Tortoise,
     the elite) plods at the mage, hides in its shell (bolts glance off) and spins across the room off the walls, throwing
     frost at each, then lies dizzy, open to harm. */
import * as THREE from 'three';
import type { Enemy, PropBox, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { mergeRig } from '../render/rig';
import { glow } from '../render/materials';
import { scene } from '../render/renderer';
import { glowTex } from '../render/textures';
import { burst } from '../combat/fx';
import { shotsBy, spawnShot } from '../combat/projectiles';
import { addSpores } from '../world/props';
import { addPool, fireAt, frostAt, poolAt, shockAt } from '../world/pools';
import { ringFx, strikeFx } from '../magic/spellFx';
import { updateBossBar } from '../ui/hud';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { freeSpotNear, randomSpot } from '../world/rooms';
import { flame } from '../magic/shapes';
import { inflict } from '../magic/statusFx';
import { canHeal } from '../magic/status';
import { lerp, mulberry, rand } from '../util';
import { MODEL_OPTIONS } from './modelOptions';
import { BESTIARY_OPTIONS, FOE_LOOKS } from './bestiaryLooks';
import { BESTIARY_BEHAVIOURS, clearGround, updateGround } from './bestiaryFoes';
import { light, num, span, type Aim, type Behaviour } from './foeKit';
import { metFoe } from './bestiary';
import type { FoeDef, School } from './foeData';
import type { SpellStatus } from '../magic/spellData';
import { CFG } from '../config';
import { MAGIC } from '../magic/status';
import { hearGround } from '../world/groundHooks';

export type { Aim } from './foeKit';

/** Build foe `def` into `e`: its model, merged, in `e.body`; its surfaces that a hit or a status lights. */
export function buildFoe(e: Enemy, def: FoeDef) {
  const look = def.look ?? def.id, build = MODEL_OPTIONS.find(o => o.id === look)?.build ?? BESTIARY_OPTIONS.find(o => o.id === look)?.build ?? FOE_LOOKS[look];
  if (!build) throw new Error(`foe ${def.id}: no look ${look}`); // (M4's model options, M4.5's bestiary, or a look of its own)
  const b = build();
  e.mats = mergeRig(b.group, b.idle, look, Object.values(b.parts ?? {}));
  for (const m of e.mats) m.userData.base = m.emissive.clone();
  e.foe = def; e.model = b.group; e.idle = b.idle; e.parts = b.parts; e.at = Math.random() * 4; e.tele = 0; e.shadow = b.shadow;
  e.flying = def.flying; e.contact = def.contact;
  e.body.add(b.group);
  // its telegraph's glow, in its school's light (a pale foe's body alone barely shows it)
  e.teleGlow = glow(SCHOOL_LIGHT[def.school], 1 + def.r * 2, 0); e.teleGlow.position.y = def.flying ? .7 : .4; e.teleGlow.visible = false; e.body.add(e.teleGlow);
  BEHAVIOURS[def.behaviour].init(e, def.params);
  metFoe(def.id);
}

/** One step of foe `e` (it can act): its behaviour, then its idle, then the parts its behaviour poses; returns where it
    faces. */
export function updateFoe(e: Enemy, dt: number, a: Aim) {
  const def = e.foe!, B = BEHAVIOURS[def.behaviour];
  shotsBy(e); const face = B.step(e, dt, a, def.params, G.current); shotsBy(); // (what it shoots carries its mantle, M4.7)
  e.at! += dt * (e.animRate ?? 1);
  e.idle!(e.at!); B.pose?.(e, def.params);
  return face;
}
/** A water foe comes up out of hiding (`driven`): spray, a cry, and, if steam drove it, a scald. */
export function drivenUp(e: Enemy, why: 'blast' | 'steam' | 'shock') {
  burst(e.x, .4, e.z, why === 'shock' ? 0xf0e890 : 0xd8f0ff, 16, 2.4, .06); Sfx.at(e.x, e.z).lurkerRise();
  if (why === 'steam') damageEnemy(e, MAGIC.reactions.steam.damage, 0, 0, 0, 'spell');
}
// a glyph's blast in a water foe's pool, or steam over it, drives it up (any build can bring one up: 2026-10-01)
hearGround((kind, x, z, r) => {
  if (kind !== 'blast' && kind !== 'steam') return;
  const there = poolAt(x, z);
  for (const e of G.enemies) {
    const B = !e.dead && e.hidden && e.foe ? BEHAVIOURS[e.foe.behaviour] : undefined, pool = B?.driven ? poolAt(e.x, e.z) : undefined;
    if (!pool || pool.kind !== 'water') continue;
    if (pool === there || Math.hypot(e.x - x, e.z - z) < r + CFG.surface.driveReach) B!.driven!(e, e.foe!.params, kind);
  }
});
/** A blow lands on a foe in code: how much of it its behaviour lets through (0: none, it was swallowed or turned). */
export function foeStruck(e: Enemy, dmg: number, by: Enemy['lastHit'], dx = 0, dz = 0, school?: School) { const B = e.foe && BEHAVIOURS[e.foe.behaviour]; return B?.struck ? B.struck(e, dmg, by, e.foe!.params, dx, dz, school) : dmg; }
/** A glyph's blast reaches a foe in code (M4.5: a rubble crab is flipped). */
export function foeBlasted(e: Enemy) { if (e.foe) BEHAVIOURS[e.foe.behaviour].blasted?.(e, e.foe.params); }
/** A status took hold on a foe in code (M4.5: a walking wave's ice shatters to a shock). */
export function foeAfflicted(e: Enemy, kind: SpellStatus) { if (e.foe && !e.dead) BEHAVIOURS[e.foe.behaviour].afflicted?.(e, kind, e.foe.params); }
/** A foe in code has fallen: what its behaviour leaves behind. */
export function foeDied(e: Enemy) { if (e.foe) BEHAVIOURS[e.foe.behaviour].die?.(e, e.foe.params); }
/** After it moved: whether it ran into a wall or a rock. */
export function bumpFoe(e: Enemy, hit: boolean) { BEHAVIOURS[e.foe!.behaviour].bump?.(e, hit, e.foe!.params); }

/** Every step, able to act or not: the swell of a telegraph and the squash of a hit, on the whole model. */
export function poseFoe(e: Enemy) {
  const t = e.tele ?? 0, hit = e.flash > 0 ? 1 : 0;
  e.model!.scale.set(1 + t * .22 + hit * .14, 1 + t * .14 - hit * .16, 1 + t * .22 + hit * .14);
  if (e.teleGlow) { e.teleGlow.visible = t > .02; e.teleGlow.material.opacity = t * .85; }
  e.model!.position.x = t > 0 ? Math.sin(e.t * 55) * .02 * t : 0;
}
/** The school's light a telegraphing foe glows with. */
const TELE = new Map<School, THREE.Color>();
/** A foe's telegraph colour: its school's light (one colour a school, shared: read, never changed). */
export const teleColor = (e: Enemy) => { const s = e.foe!.school; let c = TELE.get(s); if (!c) TELE.set(s, c = new THREE.Color(light(e))); return c; };

/** Where the `k`th Urn Mimic of a wave stands when it comes: beside one of the room's urns (on the room's seed, each its
    own while there are enough), else where it was. */
export function mimicSpot(room: Room, x: number, z: number, k: number, taken: { x: number; z: number }[] = []) {
  const urns = room.rocks.filter(r => r.urn && r.hp > 0);
  if (!urns.length) return { x, z };
  const R = mulberry(room.plan.seed ^ 0x3171c), first = Math.floor(R() * urns.length), side = R() < .5 ? -1 : 1;
  for (let i = 0; i < urns.length * 4; i++) { // (beside each urn in turn, one side then the other and further, not where one already waits)
    const u = urns[(first + k + i) % urns.length], s = side * (Math.floor(i / urns.length) % 2 ? -1 : 1), far = i >= urns.length * 2 ? 1.8 : .9;
    const p = freeSpotNear(room, u.x + s * far, u.z);
    if (!taken.some(t => Math.hypot(t.x - p.x, t.z - p.z) < .7)) return p;
  }
  return freeSpotNear(room, x, z);
}

/** The water in `room` a lurker can be in (not burnt-away oil: water, still or frozen), tile by tile. */
const waterTiles = (room: Room) => (room.pools ?? []).filter(p => p.kind === 'water').flatMap(p => p.tiles);
const nearestWater = (room: Room, x: number, z: number) => waterTiles(room).map(t => ({ ...t, d: Math.hypot(t.x - x, t.z - z) })).sort((p, q) => p.d - q.d)[0];

/* ---------- what foes leave on the floor: burning ground (a salamander's trail), sparks (a storm ray's line) ---------- */

type HazardKind = 'fire' | 'spark';
const hazards: { room: Room; x: number; z: number; t: number; life: number; kind: HazardKind; armed?: boolean }[] = [];
const MAX_HAZARDS = 96; // (of each kind)
/** Each kind's patches' glow on the floor, drawn at once (one instanced mesh a kind: a room of salamanders stays cheap). */
const hazardGlow: Record<HazardKind, THREE.InstancedMesh | null> = { fire: null, spark: null };
function hazardMesh(kind: HazardKind) {
  const had = hazardGlow[kind]; if (had) return had;
  const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat = new THREE.MeshBasicMaterial({ map: glowTex, color: kind === 'fire' ? 0xff6a20 : SCHOOL_LIGHT.storm, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX_HAZARDS); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 2; scene.add(mesh);
  return hazardGlow[kind] = mesh;
}
function lay(room: Room, x: number, z: number, time: number, kind: HazardKind) {
  const mine = hazards.filter(h => h.kind === kind); if (mine.length >= MAX_HAZARDS) hazards.splice(hazards.indexOf(mine[0]), 1);
  hazards.push({ room, x, z, t: time, life: time, kind });
}
/** A patch of burning ground at (x, z) for `time` seconds: it lights what burns there (oil, roots, braziers), and burns
    the mage who stands in it. */
export function layFire(room: Room, x: number, z: number, time: number) { lay(room, x, z, time, 'fire'); fireAt(x, z, .15); }
/** Whether ground is burning within `r` of (x, z) in the current room (M4.5: rime wolves scatter from it). */
export const burningNear = (x: number, z: number, r: number) => hazards.some(h => h.kind === 'fire' && h.room === G.current && Math.hypot(h.x - x, h.z - z) < r);
/** A patch of sparks at (x, z) for `time` seconds: crackling at first, then armed (`CFG.afflict.sparkArm`): it shocks the
    water there and hurts the mage who stands in it. */
export function laySpark(room: Room, x: number, z: number, time: number) { lay(room, x, z, time, 'spark'); }
const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
/** The foes round a fawn this step (reused, not made anew every frame). */
const company: Enemy[] = [];
/** Every step: burning ground glows, now and then a flame licks up, it burns the mage in it, and it goes out; sparks
    crackle, arm and sting. */
export function updateFoeHazards(dt: number) {
  updateGround(dt); // (M4.5: webs, ink and what is thrown in an arc)
  const A = CFG.afflict;
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i]; h.t -= dt;
    if (h.t <= 0 || h.room !== G.current) { hazards.splice(i, 1); continue; }
    const near = Math.hypot(player.x - h.x, player.z - h.z) < A.groundReach + player.r * .5;
    if (h.kind === 'fire') {
      if (Math.random() < dt * A.groundLicks * Math.min(1, h.t)) flame(h.x + (Math.random() - .5) * .3, h.z + (Math.random() - .5) * .3, Math.random() < .6 ? 0xff7a2a : 0xffc060, .3 + Math.random() * .2);
      if (near) hurtPlayer(1, h.x, h.z);
    } else {
      const armed = h.life - h.t >= A.sparkArm;
      if (armed && !h.armed) { h.armed = true; shockAt(h.x, h.z); }
      if (Math.random() < dt * (armed ? 3 : 10)) burst(h.x + (Math.random() - .5) * .3, .08, h.z + (Math.random() - .5) * .3, SCHOOL_LIGHT.storm, 1, 1.2, .025);
      if (armed && near) hurtPlayer(1, h.x, h.z);
    }
  }
  if (!hazards.length && !hazardGlow.fire?.count && !hazardGlow.spark?.count) return; // (none to draw)
  for (const kind of ['fire', 'spark'] as const) {
    const list = hazards.filter(h => h.kind === kind);
    if (!list.length && !hazardGlow[kind]?.count) continue;
    const mesh = hazardMesh(kind);
    list.forEach((h, i) => {
      const k = Math.min(1, h.t / .4) * (kind === 'fire' ? .85 + Math.sin(G.simClock * 11 + i) * .15 : h.armed ? .9 + Math.sin(G.simClock * 30 + i) * .1 : .45);
      mesh.setMatrixAt(i, m4.compose(v3.set(h.x, .04, h.z), q0, s3.setScalar((kind === 'fire' ? .75 : .6) * k)));
    });
    mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true;
  }
}
/** A new floor: the ground stops burning and sparking. */
export function clearFoeHazards() { hazards.length = 0; for (const m of Object.values(hazardGlow)) if (m) m.count = 0; clearGround(); }
/** The burning ground and the sparks in the current room (tests). */
export const burningGround = () => hazards.filter(h => h.kind === 'fire' && h.room === G.current).length;
export const sparkGround = () => hazards.filter(h => h.kind === 'spark' && h.room === G.current).length;

/** The lit braziers and candle stands in `room` (a moth is lured to them). */
const litFires = (room: Room) => (room.props ?? []).filter((b: PropBox) => (b.prop.kind === 'brazier' || b.prop.kind === 'candles' || b.prop.kind === 'wetCandles') && b.prop.lit);

/* ---------- behaviours ---------- */

const BEHAVIOURS: Record<string, Behaviour> = {
  ...BESTIARY_BEHAVIOURS, // (M4.5: actors/bestiaryFoes.ts)
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
        e.st = num(P.relure);
        const fire = litFires(room).map(b => ({ x: b.x, z: b.z, d: Math.hypot(b.x - e.x, b.z - e.z) })).sort((p, q) => p.d - q.d)[0];
        e.target = fire && fire.d < num(P.lureReach) && Math.random() < num(P.lure) ? { x: fire.x, z: fire.z } : undefined;
        if (e.target && e.state === 'flare') { e.state = 'loop'; e.tele = 0; }
      }
      const lured = e.target, cx = lured?.x ?? player.x, cz = lured?.z ?? player.z;
      if (e.state === 'loop') {
        const R = num(lured ? P.lureOrbit : P.orbit) * (1 + .4 * Math.sin((e.cycle ?? 0) * 2)); // (loops in and out: a figure of eight round it)
        e.cycle = (e.cycle ?? 0) + dt * num(P.orbitSpeed) * (2.4 / Math.max(.8, R));
        const tx = cx + Math.cos(e.cycle) * R, tz = cz + Math.sin(e.cycle) * R * .8, dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
        const sp = e.foe!.speed * e.speedMul * Math.min(1, d);
        e.vx = lerp(e.vx, dx / d * sp, Math.min(1, dt * 4)); e.vz = lerp(e.vz, dz / d * sp, Math.min(1, dt * 4));
        if (lured && Math.hypot(e.x - lured.x, e.z - lured.z) < num(P.flameReach) && Math.random() < dt * num(P.burnRate)) inflict(e, { burn: 1 }); // a moth to the flame
        if (!lured && (e.fireT! -= dt) <= 0 && a.dist < num(P.flareRange)) { e.state = 'flare'; e.fireT = num(P.flareTell); Sfx.at(e.x, e.z).mothFlare(); }
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
        const line = num(P.lineUp);
        if ((Math.abs(dz) < line || Math.abs(dx) < line) && a.dist < num(P.sight)) {
          e.dir = Math.abs(dz) < line ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
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
      p.halfL.rotation.z = -o * .85; p.halfR.rotation.z = o * .85;
      ((p.inner as THREE.Sprite).material).opacity = o * .9 + (e.tele ?? 0) * .6; p.inner.scale.setScalar(.8 + o * .9);
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

  leaper: {
    init(e, P) { e.state = 'sit'; e.st = span(P.sit); e.cycle = Math.round(span(P.leapsPerBreath)); },
    step(e, dt, a, P) {
      e.st -= dt;
      if (e.state === 'sit') {
        e.vx = e.vz = 0;
        if (e.st <= 0) {
          if (e.cycle! <= 0 && a.dist < num(P.breathRange)) { e.state = 'puff'; e.st = num(P.breathTell); Sfx.at(e.x, e.z).toadPuff(); }
          else { e.state = 'crouch'; e.st = num(P.crouch); }
        }
      } else if (e.state === 'crouch') { e.vx = e.vz = 0; if (e.st <= 0) {
        // a leap at the mage, no further than it can jump
        const d = Math.min(a.dist, num(P.reach)), T = num(P.leap);
        e.dir = { x: a.ux * d / T, z: a.uz * d / T }; e.state = 'leap'; e.st = T; e.cycle! -= 1; Sfx.at(e.x, e.z).toadLeap();
      } } else if (e.state === 'leap') {
        e.vx = e.dir!.x * e.speedMul; e.vz = e.dir!.z * e.speedMul;
        if (e.st <= 0) { e.state = 'sit'; e.st = span(P.sit); burst(e.x, .1, e.z, 0x6a8a8a, 6, 1.2, .05); Sfx.at(e.x, e.z).toadLand(); }
        return Math.atan2(e.dir!.x, e.dir!.z);
      } else if (e.state === 'puff') { // its throat swells with cold, then it breathes a cone of it
        e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.breathTell));
        if (e.st <= 0) {
          const n = num(P.shots), base = Math.atan2(a.uz, a.ux), cone = num(P.cone);
          for (let i = 0; i < n; i++) { const t = base + (i / (n - 1) - .5) * cone; spawnShot(e.x + Math.cos(t) * .35, e.z + Math.sin(t) * .35, Math.cos(t), Math.sin(t), num(P.shotSpeed) * (.85 + Math.random() * .3), light(e), .4, .8, { chill: num(P.chill) }); }
          frostAt(e.x + a.ux * 1.2, e.z + a.uz * 1.2, .8); // (the water before it freezes over)
          burst(e.x + a.ux * .4, .4, e.z + a.uz * .4, light(e), 14, 2.4, .05); Sfx.at(e.x, e.z).toadBreath();
          e.state = 'sit'; e.st = span(P.sit); e.tele = 0; e.cycle = Math.round(span(P.leapsPerBreath));
        }
      }
    },
    pose(e, P) { // up in an arc while it leaps, squat as it crouches
      const p = e.parts!, k = e.state === 'leap' ? 1 - e.st / num(P.leap) : 0;
      e.model!.position.y = Math.sin(k * Math.PI) * .55;
      if (e.state === 'crouch') p.body.scale.set(1.1, .82, 1.1);
      if (e.state === 'puff') p.throat.scale.multiplyScalar(1 + (e.tele ?? 0) * .6);
    },
  },

  lurker: {
    /** Up out of the water: it can be struck, and hurts to touch. */
    surface(e) { e.hidden = false; e.contact = e.foe!.contact; e.flying = false; },
    init(e, P) {
      // it lives in water: the room's, or a pool of its own it brings
      const room = G.current;
      if (!waterTiles(room).length) {
        const c = Math.floor(e.x - room.bounds.minX), r = Math.floor(e.z - room.bounds.minZ), n = num(P.poolSize);
        const tiles: { c: number; r: number }[] = [];
        for (let dr = -n; dr <= n; dr++) for (let dc = -n; dc <= n; dc++) if (Math.abs(dr) + Math.abs(dc) <= n && room.template.tiles[r + dr]?.[c + dc] === 'floor') tiles.push({ c: c + dc, r: r + dr });
        addPool(room, 'water', tiles);
      } else { const t = nearestWater(room, e.x, e.z); if (t) { e.x = t.x; e.z = t.z; } }
      e.state = 'under'; e.st = span(P.under) * .5; e.hidden = true; e.flying = true; e.contact = 0; e.target = { x: e.x, z: e.z };
    },
    /** Blasted, scalded or shocked up out of its water: it lies in the open a while (it still spits), then dives. */
    driven(e, P, why) {
      if (e.state !== 'under' && e.state !== 'dive') return;
      this.surface!(e, P); e.state = 'trapped'; e.st = num(P.stranded); e.open = 1; e.cycle = 1; e.fireT = .7; e.vx = e.vz = 0; e.tele = 0;
      drivenUp(e, why);
    },
    step(e, dt, a, P, room) {
      e.st -= dt; e.kx = e.kz = 0; // (anchored in its pool)
      const frozen = poolAt(e.x, e.z)?.state === 'frozen';
      if (e.state === 'under' && (poolAt(e.x, e.z)?.charged ?? 0) > 0) { this.driven!(e, P, 'shock'); return; } // (a shock through its water)
      if (e.state === 'under') { // out of reach, it slides beneath the water to somewhere else in it
        const t = e.target!, dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz);
        const sp = e.foe!.speed * e.speedMul; e.vx = d > .05 ? dx / d * sp : 0; e.vz = d > .05 ? dz / d * sp : 0;
        if (Math.random() < dt * 6) burst(e.x, .05, e.z, 0x9fe8ff, 1, .5, .03); // (ripples where it goes)
        if (frozen) { this.surface!(e, P); e.state = 'trapped'; e.st = num(P.trapped); Sfx.at(e.x, e.z).freeze(); return; }
        if (e.st <= 0 && d < .3) { e.state = 'rise'; e.st = num(P.rise); e.vx = e.vz = 0; Sfx.at(e.x, e.z).lurkerRise(); }
      } else if (e.state === 'rise') {
        e.vx = e.vz = 0; e.open = Math.min(1, 1 - e.st / num(P.rise)); e.tele = e.open;
        if (e.open > .5 && e.hidden) this.surface!(e, P);
        if (e.st <= 0) { e.state = 'up'; e.st = num(P.up); e.fireT = 0; e.cycle = num(P.volley); e.tele = 0; }
      } else if (e.state === 'up' || e.state === 'trapped') { // it spits sparks at the mage; trapped in ice, it can't dive
        e.vx = e.vz = 0; e.open = 1;
        if (frozen && e.state === 'up') { e.state = 'trapped'; e.st = Math.max(e.st, num(P.trapped)); }
        if ((e.cycle ?? 0) > 0 && (e.fireT! -= dt) <= 0) {
          spawnShot(e.x + a.ux * .3, e.z + a.uz * .3, a.ux, a.uz, num(P.shotSpeed), light(e), .7, .85);
          burst(e.x, .8, e.z, light(e), 6, 1.4, .03); Sfx.at(e.x, e.z).spark(); e.cycle! -= 1; e.fireT = num(P.volleyGap);
        }
        if (e.st <= 0 && !(e.state === 'trapped' && frozen)) { e.state = 'dive'; e.st = num(P.rise) * .7; Sfx.at(e.x, e.z).lurkerDive(); }
        if (e.state === 'trapped' && e.st <= 0 && frozen) e.cycle = Math.max(e.cycle ?? 0, 1); // (it spits while it waits for the thaw)
      } else if (e.state === 'dive') {
        e.vx = e.vz = 0; e.open = Math.max(0, e.st / (num(P.rise) * .7));
        if (e.open < .5 && !e.hidden) { e.hidden = true; e.contact = 0; e.flying = true; }
        if (e.st <= 0) { e.state = 'under'; e.st = span(P.under); const w = waterTiles(room); const t = w[Math.floor(Math.random() * w.length)]; e.target = t ? { x: t.x, z: t.z } : { x: e.x, z: e.z }; }
      }
    },
    pose(e) {
      const o = e.open ?? 0, p = e.parts!;
      p.disc.visible = poolAt(e.x, e.z)?.state !== 'frozen'; // (its dark water shows the ice when its pool freezes)
      p.rise.position.y = (o - 1) * 1.1; p.rise.visible = o > .02; // (below the floor, it can't be seen)
      for (const l of [p.lures, p.lures2]) (l as THREE.Sprite).material.opacity = e.hidden ? .35 + Math.sin(e.t * 6) * .2 : (l as THREE.Sprite).material.opacity;
    },
  },

  drifter: {
    init(e, P) { e.state = 'drift'; e.fireT = span(P.pulseEvery); },
    step(e, dt, a, P) {
      if (e.state === 'drift') { // slowly, bobbing, at the mage
        const sp = e.foe!.speed * e.speedMul * (a.dist > 1.2 ? 1 : .3);
        e.vx = lerp(e.vx, a.ux * sp, Math.min(1, dt * 2)); e.vz = lerp(e.vz, a.uz * sp, Math.min(1, dt * 2));
        if ((e.fireT! -= dt) <= 0 && a.dist < num(P.pulseRange)) { e.state = 'glow'; e.st = num(P.pulseTell); Sfx.at(e.x, e.z).jellyGlow(); }
      } else if (e.state === 'glow') { // its bell brightens, then it pulses a ring of light
        e.vx *= Math.exp(-4 * dt); e.vz *= Math.exp(-4 * dt); e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.pulseTell));
        if (e.st <= 0) {
          const R = num(P.pulseRadius);
          ringFx(e.x, .12, e.z, light(e), .2, R, .45, true); ringFx(e.x, .5, e.z, light(e), .1, R * .8, .35, true, .5);
          burst(e.x, .7, e.z, light(e), 16, 2.2, .04); Sfx.at(e.x, e.z).jellyPulse();
          if (a.dist < R + player.r) hurtPlayer(1, e.x, e.z);
          e.state = 'drift'; e.tele = 0; e.fireT = span(P.pulseEvery);
        }
      }
    },
    pose(e) { const p = e.parts!; (p.light as THREE.Sprite).material.opacity = .45 + (e.tele ?? 0) * .55; p.bell.scale.multiplyScalar(1 + (e.tele ?? 0) * .12); },
  },


  scurrier: {
    init(e, P) { e.state = 'run'; e.st = num(P.zig); e.fireT = span(P.pause); e.cycle = 1; e.tick = 0; },
    step(e, dt, a, P, room) {
      e.st -= dt;
      if (e.state === 'run') { // quick zigzags at the mage, laying fire as it goes
        if (e.st <= 0) { e.cycle = -(e.cycle ?? 1); e.st = num(P.zig); }
        const t = Math.atan2(a.uz, a.ux) + (e.cycle ?? 1) * num(P.angle), sp = e.foe!.speed * e.speedMul;
        e.vx = Math.cos(t) * sp; e.vz = Math.sin(t) * sp;
        if ((e.tick! -= dt) <= 0) { e.tick = num(P.trailEvery); layFire(room, e.x, e.z, num(P.trailTime)); }
        if ((e.fireT! -= dt) <= 0) { e.state = 'pause'; e.st = num(P.pauseTime); }
        return Math.atan2(e.vx, e.vz);
      }
      e.vx = e.vz = 0; // a moment's stillness, its crest flaring, then off again
      e.tele = Math.min(1, 1 - e.st / num(P.pauseTime)) * .6;
      if (e.st <= 0) { e.state = 'run'; e.st = num(P.zig); e.fireT = span(P.pause); e.tele = 0; Sfx.at(e.x, e.z).skitter(); }
    },
  },

  blinker: {
    init(e, P) { e.state = 'hover'; e.st = span(P.hover); e.hidden = false; },
    step(e, dt, a, P, room) {
      e.st -= dt; e.vx *= Math.exp(-3 * dt); e.vz *= Math.exp(-3 * dt);
      if (e.state === 'hover') {
        e.vx += Math.sin(e.t * 1.3) * dt * .8; e.vz += Math.cos(e.t * 1.1) * dt * .8; // (it hangs in the air, drifting)
        if (e.st <= 0) {
          const [lo, hi] = P.near as number[];
          let spot = randomSpot(room);
          for (let i = 0; i < 12; i++) { const s = randomSpot(room), d = Math.hypot(s.x - player.x, s.z - player.z); if (d > lo && d < hi) { spot = s; break; } }
          e.target = spot; e.state = 'vanish'; e.st = num(P.vanish); Sfx.at(e.x, e.z).impBlink();
          ringFx(spot.x, .08, spot.z, light(e), .1, .6, num(P.vanish) + num(P.gone), true); // (where it will appear flickers first)
        }
      } else if (e.state === 'vanish') {
        e.tele = Math.min(1, 1 - e.st / num(P.vanish));
        if (e.st <= 0) { e.state = 'gone'; e.st = num(P.gone); e.hidden = true; e.contact = 0; e.model!.visible = false; burst(e.x, .6, e.z, light(e), 10, 1.6, .04); }
      } else if (e.state === 'gone') {
        if (e.st <= 0) {
          e.x = e.target!.x; e.z = e.target!.z; e.vx = e.vz = 0;
          e.hidden = false; e.contact = e.foe!.contact; e.model!.visible = true; e.tele = 0; burst(e.x, .6, e.z, light(e), 12, 1.8, .04);
          e.state = 'raise'; e.st = num(P.raise); Sfx.at(e.x, e.z).impBlink();
        }
      } else if (e.state === 'raise') { // its violet flame held high, then thrown
        e.tele = Math.min(1, 1 - e.st / num(P.raise));
        if (e.st <= 0) {
          spawnShot(e.x + a.ux * .3, e.z + a.uz * .3, a.ux, a.uz, num(P.shotSpeed), light(e), .8, 1.15, { hex: num(P.hex) });
          Sfx.at(e.x, e.z).impThrow(); e.state = 'hover'; e.st = span(P.hover); e.tele = 0;
        }
      }
    },
  },

  drake: {
    init(e, P) { e.state = 'stalk'; e.st = span(P.act); e.cycle = 0; },
    step(e, dt, a, P) {
      e.st -= dt;
      if (e.state === 'stalk') {
        const sp = e.foe!.speed * e.speedMul; e.vx = a.ux * sp; e.vz = a.uz * sp;
        if (e.st <= 0) {
          e.cycle = (e.cycle ?? 0) + 1;
          if (a.dist < num(P.breathRange) && e.cycle % num(P.flyEvery)) { e.state = 'inhale'; e.st = num(P.inhale); Sfx.at(e.x, e.z).drakeInhale(); }
          else { e.state = 'takeoff'; e.st = num(P.takeoff); Sfx.at(e.x, e.z).drakeWings(); }
        }
      } else if (e.state === 'inhale') { // it draws in the cold, then breathes rime in a wide cone
        e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.inhale));
        if (e.st <= 0) {
          const n = num(P.shots), base = Math.atan2(a.uz, a.ux), cone = num(P.cone);
          for (let i = 0; i < n; i++) { const t = base + (i / (n - 1) - .5) * cone; spawnShot(e.x + Math.cos(t) * .5, e.z + Math.sin(t) * .5, Math.cos(t), Math.sin(t), num(P.shotSpeed) * (.85 + Math.random() * .3), light(e), .6, .9, { chill: num(P.chill) }); }
          frostAt(e.x + a.ux * 1.5, e.z + a.uz * 1.5, 1.2);
          burst(e.x + a.ux * .6, .6, e.z + a.uz * .6, light(e), 20, 2.8, .05); Sfx.at(e.x, e.z).toadBreath();
          e.state = 'stalk'; e.st = span(P.act); e.tele = 0;
        }
      } else if (e.state === 'takeoff') { e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.takeoff)) * .5; if (e.st <= 0) {
        // up on its wings, over what stands in the way, to a spot beside the mage
        const t = Math.random() * Math.PI * 2, d = span(P.landNear);
        e.target = { x: player.x + Math.cos(t) * d, z: player.z + Math.sin(t) * d }; e.state = 'fly'; e.flying = true; e.tele = 0;
      } } else if (e.state === 'fly') {
        const t = e.target!, dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz), sp = num(P.flySpeed) * e.speedMul;
        e.vx = d > .1 ? dx / d * sp : 0; e.vz = d > .1 ? dz / d * sp : 0;
        if (d < .25 || e.st < -num(P.flyMax)) { e.state = 'land'; e.st = num(P.landTime); }
        return Math.atan2(dx, dz);
      } else if (e.state === 'land') { e.vx = e.vz = 0; if (e.st <= 0) { // down with a ring of frost
        e.flying = false; const n = num(P.landRing);
        for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; spawnShot(e.x + Math.cos(t) * .5, e.z + Math.sin(t) * .5, Math.cos(t), Math.sin(t), num(P.shotSpeed) * .8, light(e), .4, .85, { chill: num(P.chill) }); }
        ringFx(e.x, .1, e.z, light(e), .3, 2.2, .5, true); frostAt(e.x, e.z, 1); burst(e.x, .3, e.z, 0xe8f6ff, 16, 2.4, .05);
        G.shake = Math.max(G.shake, .15); Sfx.at(e.x, e.z).drakeLand(); e.state = 'stalk'; e.st = span(P.act);
      } }
    },
    pose(e, P) { // up in the air while it flies
      const up = e.state === 'fly' ? 1 : e.state === 'land' ? Math.max(0, e.st / num(P.landTime)) : 0;
      e.model!.position.y = lerp(e.model!.position.y, up * .9, .2);
      e.parts!.ground.position.y = .015 - e.model!.position.y; // (its frost circle stays on the ground: it flies from it)
    },
  },

  /* floor 5 (M4.1) */

  burrower: {
    init(e, P) { e.state = 'up'; e.st = span(P.up); },
    surface(e) { e.hidden = false; e.contact = e.foe!.contact; },
    step(e, dt, a, P) {
      e.st -= dt;
      const burning = (e.status?.burn ?? 0) > 0 || poolAt(e.x, e.z)?.state === 'burning';
      if (e.state === 'up') { // it toddles at the mage; while it burns it can't go under
        const sp = e.foe!.speed * e.speedMul; e.vx = a.ux * sp; e.vz = a.uz * sp;
        if (e.st <= 0 && !burning) { e.state = 'dig'; e.st = num(P.dig); Sfx.at(e.x, e.z).dig(); }
      } else if (e.state === 'dig') {
        e.vx = e.vz = 0;
        if (burning) { e.state = 'up'; e.st = span(P.up); } // (set alight half in the ground, it climbs back out)
        else if (e.st <= 0) { e.state = 'under'; e.st = num(P.under); e.hidden = true; e.contact = 0; }
      } else if (e.state === 'under') { // a mound creeping after the mage
        const sp = num(P.burrowSpeed) * e.speedMul; e.vx = a.ux * sp; e.vz = a.uz * sp;
        if (Math.random() < dt * 8) burst(e.x, .05, e.z, 0x3a3028, 1, .6, .04); // (earth thrown up)
        if (burning) { this.surface!(e, P); e.state = 'dazed'; e.st = 1.2; burst(e.x, .4, e.z, 0xff9a3a, 10, 1.6, .05); Sfx.at(e.x, e.z).dig(); } // fire on its mound drives it up
        else if (a.dist < .5 || e.st <= 0) { e.state = 'rumble'; e.st = num(P.tell); e.vx = e.vz = 0; ringFx(e.x, .05, e.z, light(e), .8, .25, num(P.tell), true); Sfx.at(e.x, e.z).rumble(); }
      } else if (e.state === 'rumble') { // the ground shakes where it will come up
        e.vx = e.vz = 0;
        if (e.st <= 0) {
          this.surface!(e, P);
          if (a.dist < num(P.reach)) hurtPlayer(1, e.x, e.z);
          const n = num(P.motes), off = Math.random() * Math.PI;
          for (let i = 0; i < n; i++) { const t = off + i / n * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(t), Math.sin(t), num(P.shotSpeed), light(e), .4, .8); }
          burst(e.x, .3, e.z, 0x3a3028, 16, 2.4, .06); Sfx.at(e.x, e.z).rubble(); e.state = 'up'; e.st = span(P.up);
        }
      } else if (e.state === 'dazed') { e.vx = e.vz = 0; e.tele = .3; if (e.st <= 0) { e.state = 'up'; e.st = span(P.up); e.tele = 0; } }
    },
    pose(e, P) {
      const p = e.parts!, under = e.state === 'under' || e.state === 'rumble';
      p.mound.visible = under || e.state === 'dig'; p.body.visible = !under;
      if (e.state === 'dig') p.body.position.y = -(1 - Math.max(0, e.st) / num(P.dig)) * .5;
      p.mound.position.x = e.state === 'rumble' ? Math.sin(e.t * 50) * .04 : 0;
    },
  },

  glider: {
    init(e, P) { e.state = 'turn'; e.st = num(P.turn); e.cycle = Math.random() * 6; e.tick = 0; },
    step(e, dt, a, P, room) {
      e.st -= dt;
      if (e.state === 'turn') { // a slow circle; then it lines up on the mage
        e.cycle = (e.cycle ?? 0) + dt * 1.8; const sp = e.foe!.speed * e.speedMul;
        e.vx = lerp(e.vx, Math.cos(e.cycle) * sp, Math.min(1, dt * 3)); e.vz = lerp(e.vz, Math.sin(e.cycle) * sp, Math.min(1, dt * 3));
        e.tele = e.st < .45 ? 1 - e.st / .45 : 0;
        if (e.st <= 0) { // a pass through where the mage stands, and on past it
          const over = num(P.overshoot); e.target = freeSpotNear(room, player.x + a.ux * over, player.z + a.uz * over);
          e.state = 'pass'; e.st = 3; e.tele = 0; Sfx.at(e.x, e.z).rayPass();
        }
        return e.st < .45 ? Math.atan2(a.ux, a.uz) : Math.atan2(e.vx, e.vz);
      }
      // the pass: straight and quick, sparks laid on the floor behind it
      const t = e.target!, dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz), sp = num(P.passSpeed) * e.speedMul;
      e.vx = d > .1 ? dx / d * sp : 0; e.vz = d > .1 ? dz / d * sp : 0;
      if ((e.tick! -= dt) <= 0) { e.tick = num(P.sparkEvery); laySpark(room, e.x, e.z, num(P.sparkTime)); }
      if (d < .3 || e.st <= 0) { e.state = 'turn'; e.st = num(P.turn); }
      return Math.atan2(dx, dz);
    },
  },

  absorber: {
    init(e) { e.state = 'drift'; e.cycle = 0; },
    step(e, dt, a, P) {
      if (e.state === 'swell') { // full: it swells, then spills what it swallowed as a ring of dark shots
        e.vx = e.vz = 0; e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.tell));
        if (e.st <= 0) {
          const n = Math.max(4, (e.cycle ?? 0) * num(P.perBolt)), off = Math.random() * Math.PI;
          for (let i = 0; i < n; i++) { const t = off + i / n * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(t), Math.sin(t), num(P.shotSpeed), light(e), .9, .95); }
          burst(e.x, .9, e.z, light(e), 16, 2.4, .05); Sfx.at(e.x, e.z).spill();
          e.cycle = 0; e.state = 'spent'; e.st = num(P.spent); e.tele = 0;
        }
        return;
      }
      const keep = num(P.keep), want = a.dist > keep + .5 ? 1 : a.dist < keep - .5 ? -1 : 0, sp = e.foe!.speed * e.speedMul;
      e.vx = lerp(e.vx, (a.ux * want - a.uz * .4) * sp, Math.min(1, dt * 2)); e.vz = lerp(e.vz, (a.uz * want + a.ux * .4) * sp, Math.min(1, dt * 2));
      if (e.state === 'spent' && (e.st -= dt) <= 0) e.state = 'drift';
      if (e.state === 'drift' && (e.cycle ?? 0) >= num(P.hold)) { e.state = 'swell'; e.st = num(P.tell); Sfx.at(e.x, e.z).gulp(); }
    },
    struck(e, dmg, by, P) { // the cantrip's bolts are swallowed; just spilt, it is open to them
      if (e.state === 'spent') return dmg * num(P.open);
      if (by !== 'cantrip') return dmg;
      if (e.state === 'drift') { e.cycle = (e.cycle ?? 0) + 1; burst(e.x, .9, e.z, light(e), 5, 1, .03); Sfx.at(e.x, e.z).gulp(); }
      return 0;
    },
    pose(e) { e.parts!.body.scale.setScalar(1 + (e.cycle ?? 0) * .09); },
  },

  shell: {
    init(e, P) { e.state = 'walk'; e.st = span(P.walk); e.guard = 1; },
    step(e, dt, a, P) {
      e.st -= dt;
      if (e.state === 'walk') {
        const sp = e.foe!.speed * e.speedMul; e.vx = a.ux * sp; e.vz = a.uz * sp;
        if (e.st <= 0) { e.state = 'hide'; e.st = num(P.hide); e.guard = num(P.guard); Sfx.at(e.x, e.z).shellIn(); } // (shut from the first moment)
      } else if (e.state === 'hide') { // into its shell: bolts glance off
        e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.hide)); e.guard = num(P.guard);
        if (e.st <= 0) { e.state = 'spin'; e.st = num(P.spinTime); e.cycle = num(P.bounces); e.dir = { x: a.ux, z: a.uz }; e.tele = 0; Sfx.at(e.x, e.z).drakeWings(); }
      } else if (e.state === 'spin') { // across the room, off the walls, leaving frost
        const s = num(P.spinSpeed) * e.speedMul; e.vx = e.dir!.x * s; e.vz = e.dir!.z * s;
        if (Math.random() < dt * 6) frostAt(e.x, e.z, .3);
        if (e.st <= 0 || (e.cycle ?? 0) <= 0) { e.state = 'dizzy'; e.st = num(P.dizzy); e.guard = num(P.open); Sfx.at(e.x, e.z).beetleThud(); }
        return e.face;
      } else if (e.state === 'dizzy') { // out of its shell and giddy: open to harm
        e.vx = e.vz = 0;
        if (e.st <= 0) { e.state = 'walk'; e.st = span(P.walk); e.guard = 1; }
      }
    },
    bump(e, hit, P) {
      if (!hit || e.state !== 'spin') return;
      e.cycle = (e.cycle ?? 0) - 1; // off the wall, back into the room and towards the mage's side of it
      const tx = player.x - e.x, tz = player.z - e.z, l = Math.hypot(tx, tz) || 1, nx = -e.dir!.x * .45 + tx / l * .55, nz = -e.dir!.z * .45 + tz / l * .55, n = Math.hypot(nx, nz) || 1;
      e.dir = { x: nx / n, z: nz / n };
      const k = num(P.bounceShots), off = Math.random() * Math.PI;
      for (let i = 0; i < k; i++) { const t = off + i / k * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(t), Math.sin(t), num(P.shotSpeed), light(e), .4, .8, { chill: num(P.chill) }); }
      G.shake = Math.max(G.shake, .1); Sfx.at(e.x, e.z).stoneLand(); burst(e.x, .3, e.z, light(e), 8, 1.6, .04);
    },
    pose(e) {
      const p = e.parts!, shut = e.state === 'hide' || e.state === 'spin';
      p.head.scale.setScalar(shut ? .01 : 1); p.legs.scale.y = shut ? .2 : 1;
      e.model!.rotation.y = e.state === 'spin' ? e.model!.rotation.y + .5 : 0;
      if (e.state === 'dizzy') p.head.rotation.z = Math.sin(e.t * 9) * .3;
    },
  },

  /* floor 4 (M4.1) */

  scamper: {
    init(e, P) { e.state = 'hide'; e.st = span(P.hide) * .5; e.target = undefined; e.tick = 0; },
    step(e, dt, a, P, room) {
      e.st -= dt;
      const sp = e.foe!.speed * e.speedMul;
      const oil = () => { if ((e.tick! -= dt) <= 0) { e.tick = num(P.oilEvery); if (poolAt(e.x, e.z)?.kind === 'oil') fireAt(e.x, e.z, .1); } }; // (its candle lights the oil it runs through)
      if (e.state === 'hide') { // to cover a few tiles off the mage
        if (!e.target) {
          const [lo, hi] = P.near as number[]; let spot = freeSpotNear(room, e.x, e.z);
          for (let i = 0; i < 12; i++) { const s = randomSpot(room), d = Math.hypot(s.x - player.x, s.z - player.z); if (d > lo && d < hi) { spot = freeSpotNear(room, s.x, s.z); break; } }
          e.target = spot;
        }
        const t = e.target, dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz);
        e.vx = d > .15 ? dx / d * sp : 0; e.vz = d > .15 ? dz / d * sp : 0; oil();
        if (d < .25 || e.st <= 0) { e.state = 'peep'; e.st = num(P.peep); e.target = undefined; Sfx.at(e.x, e.z).squeak(); }
        return d > .15 ? Math.atan2(dx, dz) : undefined;
      } else if (e.state === 'peep') { // it stops, its candle flares: then it darts
        e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.peep));
        if (e.st <= 0) { e.state = 'dart'; e.st = num(P.dartTime); e.tele = 0; e.dir = { x: a.ux, z: a.uz }; }
      } else if (e.state === 'dart') { // straight at the mage, quick
        const s = num(P.dart) * e.speedMul; e.vx = e.dir!.x * s; e.vz = e.dir!.z * s; oil();
        if (e.st <= 0) { e.state = 'hide'; e.st = span(P.hide); }
        return Math.atan2(e.dir!.x, e.dir!.z);
      }
    },
    bump(e, hit, P) { if (hit && e.state === 'dart') { e.state = 'hide'; e.st = span(P.hide); } },
    die(e, P) { fireAt(e.x, e.z, num(P.dropFire)); flame(e.x, e.z, SCHOOL_LIGHT.ember, .6); }, // its candle falls, burning
    pose(e) { e.parts!.flame.scale.multiplyScalar(1 + (e.tele ?? 0) * .9); },
  },

  chimer: {
    init(e, P) { e.state = 'flit'; e.fireT = span(P.chimeEvery); e.cycle = Math.random() * Math.PI * 2; e.target = undefined; },
    step(e, dt, a, P) {
      // a quick, uneven loop round the mage
      const R = num(P.orbit) * (1 + .3 * Math.sin((e.cycle ?? 0) * 3));
      e.cycle = (e.cycle ?? 0) + dt * num(P.orbitSpeed);
      const tx = player.x + Math.cos(e.cycle) * R, tz = player.z + Math.sin(e.cycle) * R * .8, dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
      const sp = e.foe!.speed * e.speedMul * Math.min(1, d) * (e.state === 'chime' ? .3 : 1);
      e.vx = lerp(e.vx, dx / d * sp, Math.min(1, dt * 5)); e.vz = lerp(e.vz, dz / d * sp, Math.min(1, dt * 5));
      if (e.state === 'flit') {
        if ((e.fireT! -= dt) <= 0 && a.dist < num(P.range) && !e.target) { e.state = 'chime'; e.st = num(P.chimeTell); Sfx.at(e.x, e.z).chime(); }
      } else { // its bell rings; then the ground where the mage stands is marked
        e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.chimeTell));
        if (e.st <= 0) {
          e.target = { x: player.x, z: player.z }; e.tick = num(P.strikeDelay); e.state = 'flit'; e.tele = 0; e.fireT = span(P.chimeEvery);
          ringFx(e.target.x, .06, e.target.z, light(e), num(P.mark), .12, num(P.strikeDelay), true); // (the mark: a ring on the floor, closing on the spot)
        }
      }
      if (e.target && (e.tick! -= dt) <= 0) { // the spark strikes the mark
        const t = e.target; e.target = undefined;
        strikeFx({ x: t.x, y: 3, z: t.z }, { x: t.x, y: .05, z: t.z }, light(e));
        burst(t.x, .2, t.z, light(e), 10, 2, .04); Sfx.at(t.x, t.z).zap(); shockAt(t.x, t.z);
        if (Math.hypot(player.x - t.x, player.z - t.z) < num(P.mark) * .8 + player.r * .5) hurtPlayer(1, t.x, t.z);
      }
    },
    pose(e) { e.parts!.bell.rotation.z += (e.tele ?? 0) * Math.sin(e.t * 40) * .6; },
  },

  gargoyle: {
    init(e, P) { e.state = 'stone'; e.st = span(P.rest) * 1.5; e.guard = num(P.guard); e.contact = 0; e.animRate = 0; e.fireT = 0; },
    step(e, dt, a, P) {
      e.st -= dt;
      if (e.state === 'stone') { // a stone pup on its perch: bolts glance off it
        e.vx = e.vz = 0; e.kx = e.kz = 0; e.animRate = 0;
        const stillness = G.enemies.every(o => o.dead || o === e || o.state === 'stone' || o.state === 'hidden'); // (nothing awake: it stirs)
        e.fireT = stillness ? e.fireT! + dt : 0;
        if (a.dist < num(P.wake) || e.st <= 0 || e.fireT > num(P.lonely)) { e.state = 'wake'; e.st = num(P.tell); Sfx.at(e.x, e.z).grind(); }
        return e.face;
      }
      if (e.state === 'wake') { // its eyes light and it shakes the stone off
        e.vx = e.vz = 0; e.animRate = 1; e.tele = Math.min(1, 1 - e.st / num(P.tell));
        if (e.st <= 0) { e.state = 'crouch'; e.st = num(P.crouch); e.guard = 1; e.contact = e.foe!.contact; e.tele = 0; e.cycle = num(P.pounces); }
      } else if (e.state === 'crouch') {
        e.vx = e.vz = 0;
        if (e.st <= 0) { const d = Math.min(a.dist, num(P.reach)), T = num(P.leap); e.dir = { x: a.ux * d / T, z: a.uz * d / T }; e.state = 'leap'; e.st = T; e.flying = true; Sfx.at(e.x, e.z).drakeWings(); }
      } else if (e.state === 'leap') {
        e.vx = e.dir!.x * e.speedMul; e.vz = e.dir!.z * e.speedMul;
        if (e.st <= 0) { // down in a ring of frost
          e.flying = false; const n = num(P.ring), off = Math.random() * Math.PI;
          for (let i = 0; i < n; i++) { const t = off + i / n * Math.PI * 2; spawnShot(e.x + Math.cos(t) * .35, e.z + Math.sin(t) * .35, Math.cos(t), Math.sin(t), num(P.shotSpeed), light(e), .4, .8, { chill: num(P.chill) }); }
          ringFx(e.x, .08, e.z, light(e), .2, 1.4, .35, true); frostAt(e.x, e.z, .8); Sfx.at(e.x, e.z).stoneLand(); G.shake = Math.max(G.shake, .1);
          e.cycle! -= 1; if (e.cycle! > 0) { e.state = 'crouch'; e.st = num(P.crouch) + .25; } else { e.state = 'settle'; e.st = .6; }
        }
        return Math.atan2(e.dir!.x, e.dir!.z);
      } else if (e.state === 'settle') { // and back to stone
        e.vx = e.vz = 0;
        if (e.st <= 0) { e.state = 'stone'; e.st = span(P.rest); e.guard = num(P.guard); e.contact = 0; Sfx.at(e.x, e.z).grind(); }
      }
    },
    pose(e, P) {
      const p = e.parts!, stone = e.state === 'stone', k = e.state === 'leap' ? 1 - e.st / num(P.leap) : 0;
      e.model!.position.y = Math.sin(k * Math.PI) * .5;
      (p.shine as THREE.Sprite).material.opacity = stone ? 0 : .7; p.eyeL.scale.y = p.eyeR.scale.y = stone ? .12 : p.eyeL.scale.y; // (asleep in the stone)
      p.wings.rotation.z = e.state === 'leap' ? -.9 : 0; p.wings2.rotation.z = e.state === 'leap' ? .9 : 0;
    },
  },

  healer: {
    init(e, P) { e.state = 'wander'; e.fireT = span(P.healEvery); },
    step(e, dt, a, P) {
      const others = company; others.length = 0; for (const o of G.enemies) if (o !== e && !o.dead && o.spawn <= 0 && !o.hidden) others.push(o); // (one array, reused)
      if (e.state === 'wander') { // away from the mage, near the others, never quite still
        let tx = 0, tz = 0;
        if (a.dist < num(P.keep)) { tx = -a.ux; tz = -a.uz; }
        else if (others.length) {
          const cx = others.reduce((s, o) => s + o.x, 0) / others.length, cz = others.reduce((s, o) => s + o.z, 0) / others.length, dx = cx - e.x, dz = cz - e.z, d = Math.hypot(dx, dz);
          if (d > 1.5) { tx = dx / d; tz = dz / d; }
        }
        tx += Math.sin(e.t * 1.1 + e.x) * .35; tz += Math.cos(e.t * .9 + e.z) * .35;
        const l = Math.hypot(tx, tz) || 1, sp = e.foe!.speed * e.speedMul * Math.min(1, l);
        e.vx = lerp(e.vx, tx / l * sp, Math.min(1, dt * 4)); e.vz = lerp(e.vz, tz / l * sp, Math.min(1, dt * 4));
        if ((e.fireT! -= dt) <= 0) {
          if (others.some(o => o.hp < o.maxHp && Math.hypot(o.x - e.x, o.z - e.z) < num(P.healRange))) { e.state = 'bow'; e.st = num(P.healTell); Sfx.at(e.x, e.z).jellyGlow(); }
          else e.fireT = .5;
        }
        return Math.hypot(e.vx, e.vz) > .1 ? Math.atan2(e.vx, e.vz) : undefined;
      }
      // it bows, its antlers brighten; then their light heals the hurt foes round it
      e.vx = e.vz = 0; e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.healTell));
      if (e.st <= 0) {
        const R = num(P.healRange);
        for (const o of others) if (o.hp < o.maxHp && canHeal(o.status) && Math.hypot(o.x - e.x, o.z - e.z) < R) { // (not what Hallow has sanctified)
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * num(o.isBoss ? P.bossShare : P.healShare)); if (o.isBoss) updateBossBar(o); // (a boss takes only a little of it)
          burst(o.x, .8, o.z, light(e), 8, 1.2, .04);
        }
        ringFx(e.x, .1, e.z, light(e), .2, R, .5, true); Sfx.at(e.x, e.z).fawnHeal();
        e.state = 'wander'; e.tele = 0; e.fireT = span(P.healEvery);
      }
    },
    pose(e) {
      const p = e.parts!, moving = Math.hypot(e.vx, e.vz) > .1, tele = e.tele ?? 0;
      (p.aura as THREE.Sprite).material.opacity = .3 + tele * .65; p.head.rotation.x = tele * .5;
      p.legs.children.forEach((l, i) => { l.rotation.x = moving ? Math.sin(e.t * 13 + (i === 0 || i === 3 ? 0 : Math.PI)) * .5 : 0; });
    },
  },

  // M4.2: the Wardlings a drinking ward lets out
  wardling: {
    init(e, P) { e.state = 'float'; e.fireT = span(P.volleyEvery); e.cycle = Math.random() * Math.PI * 2; },
    step(e, dt, a, P) {
      // it keeps its distance, drifting round the mage
      e.cycle = (e.cycle ?? 0) + dt * num(P.orbitSpeed);
      const R = num(P.keep), tx = player.x + Math.cos(e.cycle) * R, tz = player.z + Math.sin(e.cycle) * R * .8, dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
      const sp = e.foe!.speed * e.speedMul * Math.min(1, d) * (e.state === 'swell' ? .25 : 1);
      e.vx = lerp(e.vx, dx / d * sp, Math.min(1, dt * 4)); e.vz = lerp(e.vz, dz / d * sp, Math.min(1, dt * 4));
      if (e.state === 'float') { if ((e.fireT! -= dt) <= 0) { e.state = 'swell'; e.st = num(P.tell); Sfx.at(e.x, e.z).wardlingSwell(); } return; }
      e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.tell)); // it swells with what it drank, then lets it go
      if (e.st > 0) return;
      const o = { fire: !!P.fire, chill: P.chill ? num(P.chill) : undefined, hex: P.hex ? num(P.hex) : undefined }, speed = num(P.shotSpeed);
      const n = num(P.shots), base = Math.atan2(a.uz, a.ux), spread = num(P.spread), ring = P.ring ? num(P.ring) : 0;
      for (let i = 0; i < n; i++) { const t = base + (n > 1 ? (i / (n - 1) - .5) * 2 * spread : 0); spawnShot(e.x, e.z, Math.cos(t), Math.sin(t), speed, light(e), .75, 1, o); }
      for (let i = 0; i < ring; i++) { const t = base + (i + .5) / ring * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(t), Math.sin(t), speed * .8, light(e), .75, .8, o); } // (Hallow's: a ring)
      burst(e.x, .85, e.z, light(e), 10, 1.8, .04); Sfx.at(e.x, e.z).wardlingShot();
      e.state = 'float'; e.tele = 0; e.fireT = span(P.volleyEvery);
    },
    pose(e) { const p = e.parts!; (p.light as THREE.Sprite).material.opacity = .45 + (e.tele ?? 0) * .5; p.body.scale.multiplyScalar(1 + (e.tele ?? 0) * .18); },
  },

};
