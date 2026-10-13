/* The shapes spells take (GDD: Spells). Each spell's `shape` in data/spells.json is a cast function here, and
   whatever a cast leaves behind runs its course in `updateShapes`: a beam of fire fading, a seal waiting to
   erupt and the ground burning after it, a wall of ice, the storm wrapped around the mage, lightning. The
   numbers a shape reads are the spell's `params`; damage and statuses go through `damageEnemy` and `inflict`
   like everything else, and projectile spells through the bolt pipeline.
   M4.1 adds Hallow's and Umbral's: holy ground (zone, Consecrate), a pillar of light on the strongest foe (smite,
   Judgement), motes circling the mage that break shots (orbit, Wardlight), a slow hexing bolt (bolt, Hex Bolt), hands
   rising to hold foes (grasp, Grasp of the Grave) and a foe marked to pay in mana and obols (mark, the Ferryman's Toll). */
import * as THREE from 'three';
import { vigilHooks } from '../vigil/where';
import { CFG } from '../config';
import type { Bolt, Box, Enemy, RockBox, Room, Vec2 } from '../types';
import { G, player } from '../state';
import { renderHearts } from '../notify';
import { heroDrink } from '../actors/hero';
import { spawnPickup } from '../items/pickups';
import { freeSpotNear } from '../world/rooms';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { glowShared } from '../render/materials';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { fireSpellBolt, strikeSolid } from '../combat/projectiles';
import { detonateGlyph } from '../combat/glyphs';
import { blockers, boxAt, pointInBoxes } from '../world/collision';
import { fireAt, frostAt, poolAt, shockAt } from '../world/pools';
import { hallowAt, umbralAt } from '../world/mechanisms';
import { MAGIC, canAct, newStatus } from './status';
import type { Shape, SpellDef } from './spellData';
import { rune } from './runeData';
import { runeActs } from './runes';
import { flash, floatText, inflict, overloadAt, tileReaction } from './statusFx';
import { steamAt } from './steam';
import { weaveAt } from './weaveFx';
import { burningNear, layFire, litFire, mageFireNear } from '../actors/foes';
import {
  consecrateFx,
  graspFx,
  hideSpellFx,
  iceColumn,
  lanceFx,
  mantleFx,
  pollenFx,
  ringFx,
  sealFx,
  smiteFx,
  strikeFx,
  thornFx,
  tollFx,
  updateSpellFx,
  vigilLanternFx,
  wardFx,
  woodColumn,
} from './spellFx';
import { STR } from '../strings';
import { hearGround } from '../world/groundHooks';
import { SCHOOL_LIGHT } from '../render/arcane';
import { counter } from '../actors/counters';
import { boonActs, boonMul, boonParam } from '../progression/boonHooks';

const hex = (c: string) => parseInt(c.slice(1), 16);
const FIRE = 0xff7a2a,
  EMBER = 0xffc060,
  ICE = 0xbfe6ff,
  BLACKFIRE = 0xb070ff;

/** Cast a spell along `dir`; false when there is nothing for it to do (no foe in reach, no room for a wall). */
export type Cast = (def: SpellDef, dir: Vec2) => boolean;

/* ---------- targets ---------- */

const alive = (e: Enemy) => !e.dead && e.spawn <= 0 && !e.hidden;
const foeY = (e: Enemy) => (e.flying ? 0.85 : 0.55);
/** The foe a spell cast from (x, z) along `dir` should strike: near, and rather in front than behind. */
function pickTarget(x: number, z: number, dir: Vec2, range: number, skip: Set<Enemy> = new Set()) {
  let best: Enemy | null = null,
    bs = Infinity;
  for (const e of G.enemies) {
    if (!alive(e) || skip.has(e)) continue;
    const dx = e.x - x,
      dz = e.z - z,
      d = Math.hypot(dx, dz);
    if (d > range) continue;
    const facing = d > 0.01 ? (dx * dir.x + dz * dir.z) / d : 1;
    const score = d * (1.4 - 0.4 * facing);
    if (score < bs) {
      bs = score;
      best = e;
    }
  }
  return best;
}
/** From (x, z) towards a foe: the direction (any, when on top of it) and the distance. */
function away(e: Enemy, x: number, z: number) {
  const dx = e.x - x,
    dz = e.z - z,
    d = Math.hypot(dx, dz);
  return d > 0.01 ? { x: dx / d, z: dz / d, d } : { x: 1, z: 0, d };
}
/** Fire sets off the blast glyphs `touches` says it reached; `spareFeet` leaves the one the mage stands on, as
    bolts do. */
function igniteGlyphs(touches: (x: number, z: number) => boolean, spareFeet: boolean) {
  for (const gl of [...G.glyphs]) {
    if (gl.spent || (spareFeet && Math.hypot(gl.x - player.x, gl.z - player.z) < CFG.glyph.boltArm)) continue;
    if (touches(gl.x, gl.z)) detonateGlyph(gl);
  }
}

/* ---------- runes on the bolts (M6 step 7) ---------- */

/** Whether a spell's bolts seek (the Seeking rune: they turn towards foes as the Tome's do). */
const seeks = (def: SpellDef) => !!def.runes?.includes('seeking');
/** Fire a spell of bolts: once along `dir`, or with Thrice three times in a fan, each at the rune's share of the damage,
    only the middle one carrying the statuses (a foe struck by all three takes a little more than one). Seeking says so as
    its bolts leave. */
function thrice(def: SpellDef, dir: Vec2, fire: (d: Vec2, damage: number, status: SpellDef['status']) => void) {
  if (seeks(def)) runeActs('seeking', def.school);
  if (!def.runes?.includes('thrice')) {
    fire(dir, def.damage, def.status);
    return;
  }
  const T = rune('thrice').params,
    base = Math.atan2(dir.z, dir.x),
    mid = (T.copies - 1) / 2;
  for (let k = 0; k < T.copies; k++) {
    const a = base + (k - mid) * T.spread;
    fire(
      { x: Math.cos(a), z: Math.sin(a) },
      Math.round(def.damage * T.damageMul * 10) / 10,
      k === mid ? def.status : undefined,
    );
  }
  runeActs('thrice', def.school);
}

/* ---------- chain: Arc ---------- */

/** Strike the foe nearest in front, then leap to the nearest foe not yet struck, a few times, each strike a
    little weaker. */
const chain: Cast = (def, dir) => {
  const P = def.params,
    first = pickTarget(player.x, player.z, dir, P.range);
  if (!first) return false;
  const hit = new Set<Enemy>([first]),
    path: Enemy[] = [first],
    jumps = P.jumps + boonParam('forkingArc', 'jumps'); // (M6: Forking Arc leaps further)
  for (let i = 0; i < jumps; i++) {
    const last = path[path.length - 1],
      next = pickTarget(last.x, last.z, dir, P.jumpRange, hit);
    if (!next) break;
    hit.add(next);
    path.push(next);
  }
  const color = hex(def.color);
  let from = { x: player.x + dir.x * 0.3, y: 1.05, z: player.z + dir.z * 0.3 };
  path.forEach((e, i) => {
    const to = { x: e.x, y: foeY(e), z: e.z };
    strikeFx(from, to, color, CFG.spellFx.chain);
    ringFx(to.x, to.y, to.z, color, 0.1, 0.45, CFG.spellFx.flash);
    const dx = e.x - from.x,
      dz = e.z - from.z,
      d = Math.hypot(dx, dz) || 1;
    damageEnemy(e, def.damage * Math.pow(P.falloff, i), dx / d, dz / d, 0.4, 'spell', def.school);
    inflict(e, def.status, 'mage');
    burst(to.x, to.y, to.z, color, 8, 2.2, 0.04);
    from = to;
  });
  Sfx.at(first.x, first.z).arc(path.length);
  if (path.length > P.jumps + 1) boonActs('forkingArc', path[P.jumps + 1].x, path[P.jumps + 1].z); // (only once it forked past the spell's own)
  const swarm = path.filter((e) => e.foe?.behaviour === 'swarm');
  if (swarm.length > 1) counter(swarm[1], 'chained'); // (M4.7: it leapt through a swarm)
  chainWeaves(path);
  return true;
};
/** M4.10: what Arc's chain meets: a Glacial Wall a foe it struck stands at (Conductor), a Pyre Seal one stands in (Overload
    Seal), a foe marked by the Ferryman's Toll among those it leapt through (Toll Chain). */
function chainWeaves(path: Enemy[]) {
  const room = G.current,
    W = MAGIC.weaves;
  const wall = walls.find(
    (w) =>
      iceWall(w) &&
      w.room === room &&
      path.some((e) => w.boxes.some((b) => Math.hypot(e.x - b.x, e.z - b.z) < ICE_HALF + e.r + W.conductor.reach)),
  );
  if (wall) conductor(wall);
  const seal = seals.find((s) => path.some((e) => Math.hypot(e.x - s.x, e.z - s.z) < s.def.params.radius));
  if (seal) {
    seal.fx.drop();
    seals.splice(seals.indexOf(seal), 1);
    overloadAt(seal.x, seal.z, undefined, seal.def.params.radius * W.overloadSeal.radiusMul);
    weaveAt('overloadSeal', seal.x, seal.z);
  }
  const tolled = path.find((e) => e.toll),
    m = tolled && marks.find((m) => m.e === tolled);
  if (tolled && m && path.length > 1) {
    for (const o of path)
      if (o !== tolled && !o.dead && !o.toll) {
        o.toll = { ...tolled.toll! };
        marks.push({ def: m.def, e: o, t: 0, fx: tollFx(hex(m.def.color)) });
        burst(o.x, 1.2, o.z, hex(m.def.color), 6, 1.4, 0.04);
      }
    weaveAt('tollChain', tolled.x, tolled.z);
  }
}
/** Conductor (M4.10): the chain runs along the wall: every foe touching it is shocked and struck, and the wall bursts both
    ways across it in shards that chill. */
function conductor(w: (typeof walls)[number]) {
  const C = MAGIC.weaves.conductor,
    a = w.boxes[0],
    b = w.boxes[w.boxes.length - 1];
  for (const e of G.enemies)
    if (alive(e) && w.boxes.some((x) => Math.hypot(e.x - x.x, e.z - x.z) < ICE_HALF + e.r + C.reach)) {
      damageEnemy(e, C.damage, 0, 0, 0, 'spell', 'storm');
      inflict(e, { shock: 1 }, 'mage');
    }
  let ax = 0,
    az = 0;
  for (const x of w.boxes) {
    ax += x.x - a.x;
    az += x.z - a.z;
  } // (along the wall; one ice block alone: north and south)
  const l = Math.hypot(ax, az),
    px = l > 0.01 ? -az / l : 0,
    pz = l > 0.01 ? ax / l : 1;
  for (const x of w.boxes)
    for (const s of [-1, 1])
      fireSpellBolt(x.x + px * s * 0.35, x.z + pz * s * 0.35, px * s, pz * s, {
        damage: C.shardDamage,
        range: C.shardRange,
        speed: C.shardSpeed,
        color: ICE,
        status: { chill: C.chill },
        shard: true,
      });
  strikeFx({ x: a.x, y: 0.9, z: a.z }, { x: b.x, y: 0.9, z: b.z }, 0xf0e890, CFG.spellFx.chain);
  dropWall(w, true);
  walls.splice(walls.indexOf(w), 1);
  Sfx.at(a.x, a.z).wallShatter();
  weaveAt('conductor', (a.x + b.x) / 2, (a.z + b.z) / 2);
}

/* ---------- beam: Cinder Lance ---------- */

/** A beam from just ahead of the mage until a wall, closed door or rock stops it: every foe in its line is struck
    and set burning, whatever it ends on is struck like a bolt (an urn breaks), and glyphs it crosses go off. */
const beam: Cast = (def, dir) => {
  const P = def.params,
    room = G.current,
    solids = blockers(room, 'bolt'),
    color = hex(def.color);
  const sx = player.x + dir.x * 0.3,
    sz = player.z + dir.z * 0.3;
  let len = 0,
    stop: Box | undefined;
  while (len < P.range && !(stop = boxAt(sx + dir.x * len, sz + dir.z * len, solids))) len += 0.1;
  len = Math.min(len, P.range);
  if (stop) strikeSolid(room, stop, sx + dir.x * len, 0.6, sz + dir.z * len);
  if ((stop as RockBox | undefined)?.shade) vigilHooks.shadeStruck(sx + dir.x * len, sz + dir.z * len, def.school); // (M7 step 6: a beam carries its school to a chained shade)
  if ((stop as RockBox | undefined)?.bar)
    vigilHooks.barStruck(stop as RockBox, sx + dir.x * len, sz + dir.z * len, undefined, def.school); // (M7 step 9: and to a barred way at the Vigil)
  // how far along the beam, and how far to one side of it, a point is
  const along = (x: number, z: number) => (x - sx) * dir.x + (z - sz) * dir.z;
  const side = (x: number, z: number) => Math.abs((x - sx) * dir.z - (z - sz) * dir.x);
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    const t = along(e.x, e.z);
    if (t < -e.r || t > len + e.r || side(e.x, e.z) > e.r + P.width) continue;
    damageEnemy(e, def.damage, dir.x, dir.z, 0.5, 'spell', def.school);
    inflict(e, def.status);
    burst(e.x, foeY(e), e.z, color, 8, 2.4, 0.05);
  }
  igniteGlyphs((x, z) => {
    const t = along(x, z);
    return t > 0 && t < len && side(x, z) < CFG.glyph.boltReach;
  }, true);
  // (M4.10: through a Glacial Wall, the wall turns to a curtain of steam; through a Wardlight mote, every mote throws a beam)
  const wall = walls.find(
    (w) =>
      iceWall(w) &&
      w.room === room &&
      w.boxes.some((b) => {
        const t = along(b.x, b.z);
        return t > 0 && t < len && side(b.x, b.z) < ICE_HALF + P.width;
      }),
  );
  if (wall) steamCurtain(wall);
  const motes = wardMotes();
  if (
    motes.some((m) => {
      const t = along(m.x, m.z);
      return t > 0 && t < len && side(m.x, m.z) < MAGIC.weaves.lanternFan.catch;
    })
  )
    lanternFan(def, motes);
  for (let t = 0; t < len; t += 0.3) fireAt(sx + dir.x * t, sz + dir.z * t); // and oil along it
  lanceFx(sx, sz, dir, len, color);
  for (let t = 0.4; t < len; t += 0.6)
    burst(sx + dir.x * t, 0.6, sz + dir.z * t, t % 1.2 < 0.6 ? FIRE : EMBER, 2, 1.4, 0.045);
  Sfx.lance();
  return true;
};

/** Steam Curtain (M4.10): the wall turns to a curtain of steam for its time left. */
function steamCurtain(w: (typeof walls)[number]) {
  const left = Math.max(1, w.def.params.life - w.t),
    mid = w.boxes[0];
  for (const b of w.boxes) steamAt(b.x, b.z, MAGIC.weaves.steamCurtain.size, left);
  dropWall(w, true);
  walls.splice(walls.indexOf(w), 1);
  weaveAt('steamCurtain', mid.x, mid.z);
}
/** Lantern Fan (M4.10): every Wardlight mote throws a thinner beam outward from the mage, striking and setting burning. */
function lanternFan(def: SpellDef, motes: Vec2[]) {
  const L = MAGIC.weaves.lanternFan,
    color = hex(def.color);
  for (const m of motes) {
    const dx = m.x - player.x,
      dz = m.z - player.z,
      d = Math.hypot(dx, dz) || 1,
      ux = dx / d,
      uz = dz / d;
    for (const e of G.enemies) {
      if (!alive(e)) continue;
      const t = (e.x - m.x) * ux + (e.z - m.z) * uz,
        s = Math.abs((e.x - m.x) * uz - (e.z - m.z) * ux);
      if (t < -e.r || t > L.range + e.r || s > e.r + L.width) continue;
      damageEnemy(e, def.damage * L.damageMul, ux, uz, 0.3, 'spell', def.school);
      inflict(e, def.status);
    }
    strikeFx(
      { x: m.x, y: 0.6, z: m.z },
      { x: m.x + ux * L.range, y: 0.6, z: m.z + uz * L.range },
      0xfff0c8,
      CFG.spellFx.chain,
      true,
    );
    for (let t = 0.3; t < L.range; t += 0.45) burst(m.x + ux * t, 0.6, m.z + uz * t, color, 1, 0.5, 0.035);
  }
  weaveAt('lanternFan', player.x, player.z);
}

/* ---------- placed: Pyre Seal ---------- */

/** A seal chalked in fire at the mage's feet: it brightens and turns for a heartbeat, then erupts (a ring of
    flame that strikes, sets burning and throws back every foe in it, and sets off glyphs), and the ground in
    it burns for a while after, setting foes that walk on it burning again. Its look is `sealFx` (spellFx.ts). */
const seals: {
  def: SpellDef;
  x: number;
  z: number;
  t: number;
  fx: ReturnType<typeof sealFx>;
  erupted: boolean;
  tick: number;
  black?: boolean;
  /** Seconds its ground burns once erupted (M6: Banked Coals lengthens it, fixed as it erupts). */ ground: number;
}[] = [];
const placed: Cast = (def) => {
  const P = def.params,
    color = hex(def.color);
  seals.push({
    def,
    x: player.x,
    z: player.z,
    t: 0,
    fx: sealFx(player.x, player.z, P.radius, color),
    erupted: false,
    tick: 0,
    ground: P.ground,
  });
  burst(player.x, 0.1, player.z, color, 10, 1.6, 0.04);
  Sfx.sealPlace();
  return true;
};
function updateSeals(dt: number) {
  for (let i = seals.length - 1; i >= 0; i--) {
    const s = seals[i],
      P = s.def.params;
    s.t += dt;
    if (!s.erupted) {
      // brighter and faster as it's about to erupt
      const k = Math.min(1, s.t / P.delay);
      s.fx.charge(k, s.t);
      if (Math.random() < dt * 20) {
        const a = Math.random() * Math.PI * 2;
        flame(s.x + Math.cos(a) * P.radius * 0.92, s.z + Math.sin(a) * P.radius * 0.92, FIRE, 0.35);
      }
      if (s.t >= P.delay) erupt(s);
      continue;
    }
    const left = P.delay + s.ground - s.t;
    if (left <= 0) {
      s.fx.drop();
      seals.splice(i, 1);
      continue;
    }
    s.fx.burn(dt, left, s.t);
    // flames lick up from the burning ground, and it sets burning what walks on it (not what flies above)
    if (Math.random() < dt * 40 * Math.min(1, left)) {
      const a = Math.random() * Math.PI * 2,
        r = Math.sqrt(Math.random()) * P.radius;
      flame(
        s.x + Math.cos(a) * r,
        s.z + Math.sin(a) * r,
        s.black ? (Math.random() < 0.6 ? BLACKFIRE : 0x2a0a4a) : Math.random() < 0.6 ? FIRE : EMBER,
        0.4 + Math.random() * 0.35,
      );
    } // (Black Pyre's flames are violet: M4.10)
    s.tick -= dt;
    if (s.tick <= 0) {
      s.tick = 0.25;
      for (const e of G.enemies)
        if (alive(e) && !e.flying && Math.hypot(e.x - s.x, e.z - s.z) < P.radius + e.r * 0.5) {
          inflict(e, { burn: P.groundBurn });
          if (s.black && e.status && e.status.burn > 0) e.status.black = true;
        } // (Black Pyre: it burns black)
      fireAt(s.x, s.z, P.radius - 0.6);
      if (Math.random() < 0.4) Sfx.at(s.x, s.z).crackle();
    }
  }
}
function erupt(s: (typeof seals)[number]) {
  const def = s.def,
    P = def.params;
  s.erupted = true;
  s.fx.erupt();
  s.ground = P.ground * boonMul('bankedCoals', 'groundMul');
  if (s.ground > P.ground) boonActs('bankedCoals', s.x, s.z); // (M6: its ground burns longer)
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    const u = away(e, s.x, s.z);
    if (u.d > P.radius + e.r) continue;
    damageEnemy(e, def.damage, u.x, u.z, 0, 'spell', def.school);
    inflict(e, def.status);
    if (!e.isBoss) {
      e.kx += u.x * P.knockback;
      e.kz += u.z * P.knockback;
    }
  }
  igniteGlyphs((x, z) => Math.hypot(x - s.x, z - s.z) < P.radius, false);
  fireAt(s.x, s.z, P.radius - 0.4);
  for (let i = 0; i < 20; i++) {
    // a ring of flame, and a burst in the middle
    const a = (i / 20) * Math.PI * 2,
      x = s.x + Math.cos(a) * P.radius,
      z = s.z + Math.sin(a) * P.radius;
    flame(x, z, i % 2 ? FIRE : EMBER, 0.7);
    if (i % 2) burst(x, 0.2, z, FIRE, 2, 2.2, 0.06);
  }
  burst(s.x, 0.3, s.z, FIRE, 14, 3.2, 0.08);
  flash(s.x, s.z, 0xff8a3a, P.radius);
  ringFx(s.x, 0.05, s.z, FIRE, P.radius * 0.3, P.radius * 1.25, CFG.spellFx.shockwave, true);
  Sfx.at(s.x, s.z).sealErupt();
  G.fx.shake = Math.max(G.fx.shake, 0.25);
}

/** M6, Flamekeeper: the flames within `r` of (x, z), `most` at most: erupted Pyre Seals (their edge within reach), burning oil
    (a pool once), lit braziers and candle stands, and the mage's own burning ground (the Pyromancer's embers). */
const flamesHere: Vec2[] = [];
export function flamesNear(x: number, z: number, r: number, most: number) {
  // (one list kept, filled afresh: it's asked every step of a fight)
  const room = G.current;
  flamesHere.length = 0;
  for (const s of seals)
    if (flamesHere.length < most && s.erupted && Math.hypot(s.x - x, s.z - z) < r + s.def.params.radius)
      flamesHere.push(s);
  for (const p of room.pools ?? [])
    if (flamesHere.length < most && p.kind === 'oil' && p.state === 'burning')
      for (const t of p.tiles)
        if (Math.hypot(t.x - x, t.z - z) < r) {
          flamesHere.push(t);
          break;
        }
  for (const b of room.props ?? [])
    if (flamesHere.length < most && litFire(b) && Math.hypot(b.x - x, b.z - z) < r) flamesHere.push(b);
  mageFireNear(x, z, r, flamesHere, most);
  return flamesHere;
}

/** Tongues of flame, and motes: glows rising and shrinking away (shared materials, so nothing to free). */
const flames: { s: THREE.Sprite; t: number; size: number }[] = [];
const FLAME_LIFE = 0.55;
export function flame(x: number, z: number, color: number, size: number, y = 0.12) {
  const s = glowShared(color, size, 0.85);
  s.position.set(x, y, z);
  scene.add(s);
  flames.push({ s, t: 0, size });
}
/** A mote of light rising from (x, y, z) and fading (a grimoire page's whisper). */
export const riseMote = (x: number, y: number, z: number, color: number, size = 0.18) => flame(x, z, color, size, y);
function updateFlames(dt: number) {
  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i];
    f.t += dt;
    if (f.t >= FLAME_LIFE) {
      scene.remove(f.s);
      flames.splice(i, 1);
      continue;
    }
    f.s.position.y += dt * 1.1;
    f.s.scale.setScalar(f.size * (1 - f.t / FLAME_LIFE));
  }
}

/* ---------- shotgun: Rime Shards ---------- */

/** A fan of ice shards from the mage, each a spell bolt that chills what it strikes. */
const shotgun: Cast = (def, dir) => {
  const P = def.params,
    color = hex(def.color),
    seek = seeks(def);
  thrice(def, dir, (d, damage, status) => {
    // (M6: Thrice fires three volleys side by side, only the middle one chilling)
    const base = Math.atan2(d.z, d.x);
    for (let i = 0; i < P.count; i++) {
      const a = base + (i - (P.count - 1) / 2) * P.fan,
        dx = Math.cos(a),
        dz = Math.sin(a);
      fireSpellBolt(player.x + dx * 0.3, player.z + dz * 0.3, dx, dz, {
        damage,
        range: P.range,
        speed: P.speed,
        color,
        status,
        shard: true,
        seek,
      });
    }
  });
  burst(player.x + dir.x * 0.4, 0.7, player.z + dir.z * 0.4, color, 8, 2, 0.04);
  Sfx.shards();
  return true;
};

/* ---------- wall: Glacial Wall ---------- */

/** A wall of ice crystals across the cast direction, a little ahead of the mage (nearer when something is in the
    way), stopping at walls and rocks. It stops the mage, foes and their shots, not the mage's bolts; when its
    time is up it shatters, striking and chilling every foe near it. */
const walls: {
  def: SpellDef;
  room: Room;
  boxes: Box[];
  g: THREE.Group;
  columns: THREE.Group[];
  t: number;
  touch?: number;
}[] = [];
/** Only a wall of ice weaves (Conductor, the Steam Curtain, Refraction); M5's living wood burns instead. */
const iceWall = (w: { def: SpellDef }) => w.def.school !== 'verdant';
const LEAF = SCHOOL_LIGHT.verdant,
  BARK = 0x6a4a2a;
const ICE_HALF = 0.27;
const wall: Cast = (def, dir) => {
  const P = def.params,
    room = G.current,
    solids = blockers(room, 'bolt');
  const px = -dir.z,
    pz = dir.x; // across the cast direction
  let ahead = P.ahead;
  while (ahead > 0.9 && pointInBoxes(player.x + dir.x * ahead, player.z + dir.z * ahead, ICE_HALF, solids))
    ahead -= 0.1;
  const cx = player.x + dir.x * ahead,
    cz = player.z + dir.z * ahead;
  if (pointInBoxes(cx, cz, ICE_HALF, solids)) return false;
  // from the middle outwards on both sides, until a wall or rock is in the way
  const n = Math.max(1, Math.round(P.width / (ICE_HALF * 1.6))),
    step = P.width / n,
    spots = [{ x: cx, z: cz, k: 0 }]; // (k: steps from the middle)
  for (const s of [-1, 1])
    for (let k = 1; k <= n / 2; k++) {
      const x = cx + px * s * k * step,
        z = cz + pz * s * k * step;
      if (pointInBoxes(x, z, ICE_HALF * 0.5, solids)) break;
      spots.push({ x, z, k });
    }
  // (its look: a pillar of ice for each spot, rising from the middle outwards; iceColumn in spellFx.ts; M5's Living Wall, a
  // trunk of living wood, woodColumn)
  const g = new THREE.Group(),
    columns: THREE.Group[] = [],
    boxes: Box[] = [],
    wood = def.school === 'verdant';
  for (const p of spots) {
    const c = wood ? woodColumn(p.x, p.z, 0.75 + Math.random() * 0.4) : iceColumn(p.x, p.z, 0.8 + Math.random() * 0.45);
    c.rotation.set((Math.random() - 0.5) * 0.16, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.16);
    c.userData.delay = p.k * CFG.spellFx.wallStagger;
    c.scale.y = 0.01;
    g.add(c);
    columns.push(c);
    boxes.push({ x: p.x, z: p.z, hx: ICE_HALF, hz: ICE_HALF });
    if (wood) {
      burst(p.x, 0.3, p.z, LEAF, 3, 1.6, 0.045);
      vigilHooks.landed('verdant', p.x, p.z, 0.4);
    } else {
      burst(p.x, 0.3, p.z, ICE, 3, 1.8, 0.045);
      frostAt(p.x, p.z, 0.25);
    } // water it stands in freezes
  }
  scene.add(g);
  room.barriers = [...(room.barriers ?? []), ...boxes];
  walls.push({ def, room, boxes, g, columns, t: 0, touch: wood ? 0 : undefined });
  if (wood) Sfx.woodRise();
  else Sfx.wallRise();
  return true;
};
function updateWalls(dt: number) {
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i];
    w.t += dt;
    const left = w.def.params.life - w.t;
    for (const c of w.columns) {
      // up with a little overshoot, and sinking a little as it cracks before it goes
      const r = Math.min(1, Math.max(0, (w.t - c.userData.delay) / CFG.spellFx.wallRise)),
        up = r < 1 ? r * (1 + Math.sin(r * Math.PI) * 0.25) : 1;
      c.scale.y = Math.max(0.01, up * (left < 0.6 ? 0.85 + (left / 0.6) * 0.15 : 1));
    }
    const shiver = left < 0.6 ? (Math.random() - 0.5) * 0.05 : 0;
    w.g.position.set(shiver, 0, -shiver);
    if (w.touch !== undefined && (w.touch -= dt) <= 0) {
      // (M5: living wood overgrows the foes that touch it)
      w.touch = MAGIC.verdant.wallTouch;
      for (const e of G.enemies)
        if (
          alive(e) &&
          !e.flying &&
          w.boxes.some((b) => Math.abs(e.x - b.x) < b.hx + e.r + 0.15 && Math.abs(e.z - b.z) < b.hz + e.r + 0.15)
        ) {
          inflict(e, w.def.status);
          burst(e.x, 0.4, e.z, LEAF, 3, 1, 0.03);
        }
    }
    if (left <= 0) {
      dropWall(w);
      walls.splice(i, 1);
    }
  }
}
function dropWall(w: (typeof walls)[number], quiet = false) {
  scene.remove(w.g);
  w.room.barriers = (w.room.barriers ?? []).filter((b) => !w.boxes.includes(b));
  if (quiet) return;
  const def = w.def,
    P = def.params;
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    let near = w.boxes[0],
      nd = Infinity;
    for (const b of w.boxes) {
      const d = Math.hypot(e.x - b.x, e.z - b.z);
      if (d < nd) {
        nd = d;
        near = b;
      }
    }
    if (nd > P.burst + e.r) continue;
    const u = away(e, near.x, near.z);
    damageEnemy(e, def.damage, u.x, u.z, 0.6, 'spell', def.school);
    inflict(e, def.status);
  }
  const wood = def.school === 'verdant',
    c1 = wood ? LEAF : ICE,
    c2 = wood ? BARK : 0xffffff; // (M5: living wood withers into leaves and bark)
  for (const b of w.boxes) {
    burst(b.x, 0.5, b.z, c1, 6, 2.6, 0.06);
    burst(b.x, 0.8, b.z, c2, 2, 2, 0.04);
  }
  const mid = w.boxes[0];
  ringFx(mid.x, 0.05, mid.z, c1, 0.3, P.burst + 0.6, CFG.spellFx.shockwave, true); // (the first box is the middle)
  if (wood) Sfx.at(mid.x, mid.z).wallWither();
  else Sfx.at(mid.x, mid.z).wallShatter();
  G.fx.shake = Math.max(G.fx.shake, 0.12);
}
/* (M5: fire burns a wall of living wood down where it reaches it, at once and quietly but for the flames) */
hearGround((kind, x, z, r) => {
  if (kind !== 'fire') return;
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i];
    if (
      w.def.school !== 'verdant' ||
      w.room !== G.current ||
      !w.boxes.some((b) => Math.hypot(b.x - x, b.z - z) < r + 0.55)
    )
      continue;
    for (const b of w.boxes) {
      burst(b.x, 0.6, b.z, 0xff7a2a, 8, 2.2, 0.06);
      burst(b.x, 0.9, b.z, 0xffc060, 4, 1.6, 0.05);
    }
    Sfx.at(w.boxes[0].x, w.boxes[0].z).ignite();
    dropWall(w, true);
    walls.splice(i, 1);
  }
});

/* ---------- self: Static Mantle ---------- */

/** The storm wrapped around the mage for a while: sparks circling, small arcs crackling over the body, and any
    foe that touches it struck, shocked and thrown back (each foe at most every so often). */
let mantle: {
  def: SpellDef;
  t: number;
  fx: ReturnType<typeof mantleFx>;
  zapped: Map<Enemy, number>;
  arcT: number;
  wadeT?: number;
} | null = null;
const self: Cast = (def) => {
  endMantle(true);
  const color = hex(def.color),
    fx = mantleFx(color);
  mantle = { def, t: 0, fx, zapped: new Map(), arcT: 0 };
  fx.update(player.x, player.z, 0, 1);
  burst(player.x, 0.7, player.z, color, 14, 2.4, 0.04);
  Sfx.mantle();
  return true;
};
/** While the Static Mantle is up, a foe touching the mage doesn't hurt it: the storm throws it back first. A boss
    is too heavy to throw, so it still hurts, unless the shock stunned it. */
export const mantleShields = (e: Enemy) => !!mantle && (!e.isBoss || !canAct(e.status));
/** Seconds of the Static Mantle left (0 when it's down). */
export const mantleLeft = () => (mantle ? mantle.def.params.life - mantle.t : 0);
function updateMantle(dt: number, now: number) {
  const m = mantle;
  if (!m) return;
  const P = m.def.params,
    color = hex(m.def.color);
  m.t += dt;
  if (m.t >= P.life) {
    endMantle(false);
    return;
  }
  const fade = Math.min(1, (P.life - m.t) / 0.5);
  m.fx.update(player.x, player.z, m.t, fade);
  const pool = poolAt(player.x, player.z); // (M4.10, Live Wade: wading in its mantle, the mage shocks the water, itself spared)
  if (pool?.kind === 'water' && pool.state === 'still' && !pool.mud && (m.wadeT = (m.wadeT ?? 0) - dt) <= 0) {
    m.wadeT = MAGIC.weaves.liveWade.every;
    shockAt(player.x, player.z, undefined, true);
    weaveAt('liveWade', player.x, player.z);
  }
  m.arcT -= dt;
  if (m.arcT <= 0) {
    // a small arc crackles over the mage
    m.arcT = 0.15 + Math.random() * 0.15;
    const a = Math.random() * Math.PI * 2,
      b = a + 1 + Math.random() * 2;
    strikeFx(
      { x: player.x + Math.cos(a) * 0.45, y: 0.3 + Math.random() * 0.9, z: player.z + Math.sin(a) * 0.45 },
      { x: player.x + Math.cos(b) * 0.45, y: 0.3 + Math.random() * 0.9, z: player.z + Math.sin(b) * 0.45 },
      color,
      undefined,
      true,
    );
  }
  for (const e of G.enemies) {
    if (!alive(e) || (m.zapped.get(e) ?? 0) > now) continue;
    const u = away(e, player.x, player.z);
    if (u.d > player.r + e.r + P.reach) continue;
    m.zapped.set(e, now + P.every);
    strikeFx({ x: player.x, y: 0.8, z: player.z }, { x: e.x, y: foeY(e), z: e.z }, color);
    damageEnemy(e, m.def.damage, u.x, u.z, 0, 'spell', m.def.school);
    inflict(e, m.def.status, 'mage');
    if (!e.isBoss) {
      e.kx += u.x * P.knockback;
      e.kz += u.z * P.knockback;
    }
    burst(e.x, foeY(e), e.z, color, 8, 2.4, 0.035);
    Sfx.at(e.x, e.z).mantleZap();
  }
}
function endMantle(quiet: boolean) {
  if (!mantle) return;
  mantle.fx.drop();
  if (!quiet) {
    burst(player.x, 0.7, player.z, hex(mantle.def.color), 8, 1.6, 0.03);
    Sfx.mantleEnd();
  }
  mantle = null;
}

/* ---------- zone: Consecrate (M4.1) ---------- */

/** Holy ground at the mage's feet for a while: every few moments it strikes and sanctifies the foes standing in it (not
    what flies above), and the mage in it is healed once. */
const zones: {
  def: SpellDef;
  x: number;
  z: number;
  t: number;
  tick: number;
  healed: boolean;
  fx: ReturnType<typeof consecrateFx>;
}[] = [];
/** Only holy ground takes a hex (Eclipse) or sanctifies shards (Hallowed Hail); M5's pollen is no holy ground. */
const holyZone = (z: { def: SpellDef }) => z.def.school === 'hallow';
const zone: Cast = (def) => {
  const pollen = def.school === 'verdant'; // (M5: Verdant's Pollen Cloud is a zone of pollen, not holy ground)
  zones.push({
    def,
    x: player.x,
    z: player.z,
    t: 0,
    tick: 0,
    healed: false,
    fx: (pollen ? pollenFx : consecrateFx)(player.x, player.z, def.params.radius, hex(def.color)),
  });
  if (!pollen)
    hallowAt(player.x, player.z, def.params.radius); // holy ground kindles the candle stands on it
  else vigilHooks.landed('verdant', player.x, player.z, def.params.radius); // (M7 step 9)
  burst(player.x, 0.2, player.z, hex(def.color), 14, 2, 0.04);
  if (pollen) Sfx.pollenCloud();
  else Sfx.consecrate();
  return true;
};
function updateZones(dt: number) {
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i],
      P = z.def.params;
    z.t += dt;
    const left = P.life - z.t;
    if (left <= 0) {
      z.fx.drop();
      zones.splice(i, 1);
      continue;
    }
    z.fx.update(z.t, Math.min(1, left / 0.5, z.t / 0.25));
    if ((z.tick -= dt) <= 0) {
      z.tick = P.every;
      for (const e of G.enemies)
        if (alive(e) && !e.flying && Math.hypot(e.x - z.x, e.z - z.z) < P.radius + e.r * 0.5) {
          damageEnemy(e, z.def.damage, 0, 0, 0, 'spell', z.def.school);
          inflict(e, z.def.status);
          burst(e.x, 0.5, e.z, hex(z.def.color), 3, 1.2, 0.03);
        }
    }
    if (!z.healed && P.heal > 0 && player.hp < player.maxHp && Math.hypot(player.x - z.x, player.z - z.z) < P.radius) {
      // (a Reprise's ground mends nothing, M6)
      z.healed = true;
      player.hp = Math.min(player.maxHp, player.hp + P.heal);
      renderHearts();
      heroDrink();
      burst(player.x, 0.9, player.z, hex(z.def.color), 10, 1.4, 0.04);
    }
  }
}

/** Whether the Grasp's hands are setting their dark down now (M4.10: on holy ground that is Eclipse Ground). */
let graspHexing = false;
/** A hex lands on holy ground at (x, z) (M4.8's tile reaction, Hallow and Umbral): the ground goes dark at once, and
    every foe standing in it is taken under a black sun (an Eclipse each). Reached from `umbralAt`, a hexing bolt crossing
    it and a hex on a foe standing in it. */
export function hexGround(x: number, z: number) {
  const i = zones.findIndex((o) => holyZone(o) && Math.hypot(x - o.x, z - o.z) < o.def.params.radius);
  if (i < 0) return;
  const g = zones[i],
    P = g.def.params,
    woven = graspHexing;
  zones.splice(i, 1);
  g.fx.drop(); // (spent first: the hexes it lays below find no ground)
  if (woven) weaveAt('eclipseGround', g.x, g.z);
  else tileReaction('eclipse', g.x, g.z); // (M4.10: the Grasp's hands on holy ground weave Eclipse Ground)
  ringFx(g.x, 0.05, g.z, 0x6a3aa8, 0.3, P.radius, CFG.spellFx.shockwave, true);
  burst(g.x, 0.3, g.z, 0x2a0a4a, 20, 2.4, 0.06);
  burst(g.x, 0.3, g.z, hex(g.def.color), 10, 2, 0.04);
  for (const e of G.enemies)
    if (alive(e) && !e.flying && Math.hypot(e.x - g.x, e.z - g.z) < P.radius + e.r * 0.5) {
      const st = (e.status ??= newStatus());
      st.sanct = Math.max(st.sanct, 1); // (laid straight on, so a burning or frozen foe isn't seared or a prism instead)
      inflict(e, { hex: 1 });
      if (woven && (e.status?.eclipse ?? 0) > 0) e.eclipseMul = MAGIC.weaves.eclipseGround.damageMul;
    }
}

/** M4.10: a spell bolt crossing what spells left: a Hex Bolt across a seal's burning ground turns it black (Black Pyre);
    Rime Shards across holy ground are sanctified (Hallowed Hail); a Shatter's shard into fire falls there as molten glass,
    ground that burns walkers. Each step, from projectiles.ts. */
export function boltOverGround(b: Bolt) {
  const W = MAGIC.weaves;
  if (b.status?.hex)
    for (const s of seals)
      if (s.erupted && !s.black && Math.hypot(b.x - s.x, b.z - s.z) < s.def.params.radius + W.blackPyre.reach) {
        s.black = true;
        burst(s.x, 0.3, s.z, BLACKFIRE, 18, 2, 0.05);
        weaveAt('blackPyre', s.x, s.z);
      }
  if (b.shard && !b.shatter && !b.hallowed)
    for (const z of zones)
      if (holyZone(z) && Math.hypot(b.x - z.x, b.z - z.z) < z.def.params.radius) {
        b.hallowed = true;
        b.status = { ...b.status, sanct: W.hallowedHail.sanct };
        burst(b.x, 0.6, b.z, 0xffe6a0, 3, 1, 0.03);
        weaveAt('hallowedHail', b.x, b.z);
        break;
      }
  if (
    b.shatter &&
    (burningNear(b.x, b.z, W.moltenGlass.catch) ||
      poolAt(b.x, b.z)?.state === 'burning' ||
      seals.some((s) => s.erupted && Math.hypot(b.x - s.x, b.z - s.z) < s.def.params.radius))
  ) {
    layFire(G.current, b.x, b.z, W.moltenGlass.time, '');
    burst(b.x, 0.2, b.z, 0xffd8a0, 8, 1.4, 0.04);
    b.dist = b.range; // (it falls where the fire caught it)
    weaveAt('moltenGlass', b.x, b.z);
  }
}

/* ---------- smite: Judgement (M4.1) ---------- */

/** The strongest foe in reach is marked by a closing ring of gold; a moment later a pillar of light falls on it, striking
    and sanctifying everything in it. */
const smites: {
  def: SpellDef;
  target: Enemy;
  x: number;
  z: number;
  t: number;
  fell: boolean;
  fx: ReturnType<typeof smiteFx>;
}[] = [];
const smite: Cast = (def) => {
  const P = def.params;
  let best: Enemy | null = null;
  for (const e of G.enemies)
    if (alive(e) && Math.hypot(e.x - player.x, e.z - player.z) < P.range && (!best || e.hp > best.hp)) best = e;
  if (!best) return false;
  smites.push({ def, target: best, x: best.x, z: best.z, t: 0, fell: false, fx: smiteFx(hex(def.color), P.radius) });
  Sfx.judgementCall();
  return true;
};
function updateSmites(dt: number, now: number) {
  for (let i = smites.length - 1; i >= 0; i--) {
    const s = smites[i],
      P = s.def.params;
    s.t += dt;
    if (!s.fell) {
      if (!s.target.dead) {
        s.x = s.target.x;
        s.z = s.target.z;
      }
      s.fx.mark(s.x, s.z, Math.min(1, s.t / P.delay), now);
      if (s.t < P.delay) continue;
      s.fell = true;
      s.fx.fall();
      for (const e of G.enemies) {
        if (!alive(e) || Math.hypot(e.x - s.x, e.z - s.z) > P.radius + e.r) continue;
        damageEnemy(e, s.def.damage, 0, 0, 0, 'spell', s.def.school);
        inflict(e, s.def.status);
      }
      burst(s.x, 0.4, s.z, hex(s.def.color), 24, 3.4, 0.06);
      ringFx(s.x, 0.05, s.z, hex(s.def.color), 0.2, P.radius * 1.8, CFG.spellFx.shockwave, true);
      hallowAt(s.x, s.z, P.radius); // (and the pillar kindles candles where it falls)
      const wall = walls.find(
        (w) =>
          iceWall(w) &&
          w.room === G.current &&
          w.boxes.some((b) => Math.hypot(b.x - s.x, b.z - s.z) < P.radius + MAGIC.weaves.refraction.reach),
      );
      if (wall) refraction(s, wall); // (M4.10: by a Glacial Wall, it breaks into rays along it)
      Sfx.at(s.x, s.z).judgement();
      G.fx.shake = Math.max(G.fx.shake, 0.25);
      continue;
    }
    const k = (s.t - P.delay) / 0.5;
    if (k >= 1) {
      s.fx.drop();
      smites.splice(i, 1);
      continue;
    }
    s.fx.fade(k);
  }
}

/** Refraction (M4.10): Judgement's pillar breaks into rays along the wall: each block lights, and the foes at it are struck
    and sanctified. */
function refraction(s: (typeof smites)[number], w: (typeof walls)[number]) {
  const F = MAGIC.weaves.refraction,
    color = hex(s.def.color);
  for (const b of w.boxes) {
    strikeFx({ x: s.x, y: 2.4, z: s.z }, { x: b.x, y: 0.9, z: b.z }, color, CFG.spellFx.strike, true);
    burst(b.x, 0.9, b.z, color, 6, 1.6, 0.04);
  }
  for (const e of G.enemies)
    if (alive(e) && w.boxes.some((b) => Math.hypot(e.x - b.x, e.z - b.z) < ICE_HALF + e.r + F.reach)) {
      damageEnemy(e, F.damage, 0, 0, 0, 'spell', 'hallow');
      inflict(e, { sanct: F.sanct });
    }
  weaveAt('refraction', w.boxes[0].x, w.boxes[0].z);
}

/* ---------- orbit: Wardlight (M4.1) ---------- */

/** Motes of light circling the mage for a while: an enemy shot that meets one is broken, and a foe one touches is struck
    and sanctified (each foe at most every so often). It goes with the mage from room to room, as the mantle does. */
let ward: { def: SpellDef; t: number; fx: ReturnType<typeof wardFx>; touched: Map<Enemy, number> } | null = null;
const orbit: Cast = (def) => {
  endWard();
  ward = { def, t: 0, fx: wardFx(def.params.count, hex(def.color)), touched: new Map() };
  burst(player.x, 0.8, player.z, hex(def.color), 12, 2, 0.04);
  Sfx.wardlight();
  return true;
};
/** Seconds of Wardlight left (0 when it's down). */
export const wardLeft = () => (ward ? ward.def.params.life - ward.t : 0);
function updateWard(dt: number, now: number) {
  const w = ward;
  if (!w) return;
  const P = w.def.params,
    color = hex(w.def.color);
  w.t += dt;
  if (w.t >= P.life) {
    endWard();
    return;
  }
  for (let i = 0; i < P.count; i++) {
    const a = w.t * P.turn + (i / P.count) * Math.PI * 2,
      x = player.x + Math.cos(a) * P.radius,
      z = player.z + Math.sin(a) * P.radius;
    w.fx.place(i, x, 0.75 + Math.sin(w.t * 3 + i) * 0.08, z, w.t * 4 + i, true);
    for (let k = G.shots.length - 1; k >= 0; k--) {
      const s = G.shots[k];
      if (Math.hypot(s.x - x, s.z - z) < P.reach + s.r) {
        scene.remove(s.mesh);
        G.shots.splice(k, 1);
        burst(s.x, s.y, s.z, color, 5, 1.4, 0.03);
        Sfx.at(s.x, s.z).wardTink();
      }
    }
    for (const e of G.enemies) {
      if (!alive(e) || (w.touched.get(e) ?? 0) > now || Math.hypot(e.x - x, e.z - z) > P.reach + e.r) continue;
      w.touched.set(e, now + P.every);
      damageEnemy(
        e,
        w.def.damage,
        (e.x - player.x) / P.radius,
        (e.z - player.z) / P.radius,
        0.3,
        'spell',
        w.def.school,
      );
      inflict(e, w.def.status);
      burst(e.x, foeY(e), e.z, color, 5, 1.6, 0.03);
    }
  }
}
function endWard() {
  ward?.fx.drop();
  ward = null;
}
/** Where Wardlight's motes are now (M4.10: the lance through one makes a Lantern Fan); none while it's down. */
export function wardMotes(): Vec2[] {
  const w = ward;
  if (!w) return [];
  const P = w.def.params;
  return Array.from({ length: P.count }, (_, i) => {
    const a = w.t * P.turn + (i / P.count) * Math.PI * 2;
    return { x: player.x + Math.cos(a) * P.radius, z: player.z + Math.sin(a) * P.radius };
  });
}

/* ---------- bolt: Hex Bolt (M4.1) ---------- */

/** One slow dark bolt along the cast direction, hexing what it strikes. */
const boltShape: Cast = (def, dir) => {
  const P = def.params,
    color = hex(def.color),
    seek = seeks(def);
  thrice(def, dir, (d, damage, status) =>
    fireSpellBolt(player.x + d.x * 0.3, player.z + d.z * 0.3, d.x, d.z, {
      damage,
      range: P.range,
      speed: P.speed,
      color,
      scale: P.scale,
      status,
      seek,
    }),
  ); // (M6: Thrice, three in a fan)
  burst(player.x + dir.x * 0.4, 0.7, player.z + dir.z * 0.4, color, 8, 1.6, 0.04);
  Sfx.hexBolt();
  return true;
};

/* ---------- grasp: Grasp of the Grave (M4.1) ---------- */

/** Where the mage aims, a few tiles ahead (or on the foe there), dark hands rise out of the floor, then close: every foe
    in their ring is struck, held where it stands (Root) and hexed. They sink back when the hold is over. */
const grasps: { def: SpellDef; x: number; z: number; t: number; closed: boolean; fx: ReturnType<typeof graspFx> }[] =
  [];
const grasp: Cast = (def, dir) => {
  const P = def.params,
    reach = seeks(def) ? rune('seeking').params.reach : 0,
    near = pickTarget(player.x, player.z, dir, P.ahead + P.radius + reach); // (M6: Seeking's hands reach further for a foe)
  if (reach && near && Math.hypot(near.x - player.x, near.z - player.z) > P.ahead + P.radius)
    runeActs('seeking', def.school, near.x, near.z);
  const at = near
    ? { x: near.x, z: near.z }
    : freeSpotNear(G.current, player.x + dir.x * P.ahead, player.z + dir.z * P.ahead);
  const thorns = def.school === 'verdant'; // (M5: Verdant's Thorn Snare rises as thorns, not hands)
  grasps.push({
    def,
    x: at.x,
    z: at.z,
    t: 0,
    closed: false,
    fx: (thorns ? thornFx : graspFx)(at.x, at.z, P.radius, hex(def.color)),
  });
  if (thorns) Sfx.at(at.x, at.z).thornRise();
  else Sfx.at(at.x, at.z).graspRise();
  return true;
};
function updateGrasps(dt: number) {
  for (let i = grasps.length - 1; i >= 0; i--) {
    const g = grasps[i],
      P = g.def.params;
    g.t += dt;
    const hold = g.def.status?.root ?? 2,
      life = P.delay + hold;
    if (!g.closed && g.t >= P.delay) {
      const thorns = g.def.school === 'verdant';
      g.closed = true;
      graspHexing = !thorns; // (its hex, on a foe or on the ground, is the Grasp's: on holy ground, Eclipse Ground)
      for (const e of G.enemies) {
        if (!alive(e) || e.flying || Math.hypot(e.x - g.x, e.z - g.z) > P.radius + e.r) continue;
        damageEnemy(e, g.def.damage, 0, 0, 0, 'spell', g.def.school);
        inflict(e, g.def.status);
        burst(e.x, 0.3, e.z, hex(g.def.color), 6, 1.4, 0.03);
      }
      if (thorns) {
        Sfx.at(g.x, g.z).thornClose();
        vigilHooks.landed('verdant', g.x, g.z, P.radius);
      } // (M7 step 9: green landing, for a barred way and a chained shade)
      else {
        umbralAt(g.x, g.z, P.radius);
        Sfx.at(g.x, g.z).graspClose();
      } // (the dark blinds a watching statue, breaks an obelisk's umbral ward; on holy ground, Eclipse Ground: M4.10)
      graspHexing = false;
    }
    const k = g.t < P.delay ? g.t / P.delay : g.t < life ? 1 : 1 - (g.t - life) / 0.3;
    if (k <= 0 && g.t > life) {
      g.fx.drop();
      grasps.splice(i, 1);
      continue;
    }
    g.fx.set(k);
  }
}

/* ---------- mark: the Ferryman's Toll (M4.1) ---------- */

/** The nearest foe is struck and marked with a coin of shadow for a while: every blow the mage lands on it gives back
    mana (`toll` on the foe; damage.ts), and if it falls marked it pays in obols and its hex spreads to the foes round it
    (`payToll`). */
const marks: { def: SpellDef; e: Enemy; t: number; fx: ReturnType<typeof tollFx> }[] = [];
const mark: Cast = (def, dir) => {
  const P = def.params,
    e = pickTarget(player.x, player.z, dir, P.range, def.reprise ? new Set(marks.map((m) => m.e)) : undefined); // (M6: a Reprise's toll marks another foe)
  if (!e) return false;
  const had = marks.findIndex((m) => m.e === e);
  if (had >= 0) {
    marks[had].fx.drop();
    marks.splice(had, 1);
  }
  e.toll = { mana: P.mana, obols: P.obols, spread: P.spread, spreadRange: P.spreadRange };
  marks.push({ def, e, t: 0, fx: tollFx(hex(def.color)) });
  const u = away(e, player.x, player.z);
  damageEnemy(e, def.damage, u.x, u.z, 0.3, 'spell', def.school);
  inflict(e, def.status);
  strikeFx({ x: player.x, y: 1, z: player.z }, { x: e.x, y: foeY(e), z: e.z }, hex(def.color), CFG.spellFx.chain, true);
  Sfx.at(e.x, e.z).ferryToll();
  return true;
};
function updateMarks(now: number, dt: number) {
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i];
    m.t += dt;
    if (m.e.dead || m.t >= m.def.params.life) {
      if (!m.e.dead) m.e.toll = undefined;
      m.fx.drop();
      marks.splice(i, 1);
      continue;
    }
    m.fx.at(m.e.x, m.e.flying ? 1.75 : 1.35, m.e.z, now);
  }
}
/** A marked foe has fallen: it pays its toll in obols, and its hex spreads to the foes round it. */
export function payToll(e: Enemy) {
  const T = e.toll;
  if (!T) return;
  for (let i = 0; i < T.obols; i++) {
    const p = freeSpotNear(G.current, e.x + (i - (T.obols - 1) / 2) * 0.4, e.z);
    spawnPickup('coin', p.x, p.z);
  }
  for (const o of G.enemies)
    if (o !== e && alive(o) && Math.hypot(o.x - e.x, o.z - e.z) < T.spreadRange) {
      inflict(o, { hex: T.spread });
      sparkBetween(e, o);
    }
  burst(e.x, 0.8, e.z, 0xa266ff, 14, 2.2, 0.05);
}
const sparkBetween = (a: Enemy, b: Enemy) =>
  strikeFx({ x: a.x, y: 0.8, z: a.z }, { x: b.x, y: foeY(b), z: b.z }, 0xa266ff, CFG.spellFx.chain, true);

/* ---------- lantern: Lantern of Vigil (M7 step 8, the scribe's) ---------- */

/** A lantern lights at the mage's shoulder and goes with it, room to room, for a while: every so often it fires a small
    bolt of holy light at the nearest foe in reach (a spell's bolt, carrying the spell's statuses). */
let lamp: { def: SpellDef; t: number; next: number; fx: ReturnType<typeof vigilLanternFx> } | null = null;
const lantern: Cast = (def) => {
  endLantern();
  lamp = { def, t: 0, next: def.params.every * 0.5, fx: vigilLanternFx(hex(def.color)) };
  burst(player.x - 0.45, 1.3, player.z - 0.2, hex(def.color), 10, 1.6, 0.04);
  Sfx.vigilLantern();
  return true;
};
/** Seconds of the lantern left (0 when it's out). */
export const lanternLeft = () => (lamp ? lamp.def.params.life - lamp.t : 0);
function updateLantern(dt: number, now: number) {
  const l = lamp;
  if (!l) return;
  const P = l.def.params;
  l.t += dt;
  l.next -= dt;
  if (l.t >= P.life) {
    endLantern();
    return;
  }
  const x = player.x - 0.45,
    y = 1.3 + Math.sin(now * 2.1) * 0.06,
    z = player.z - 0.2;
  l.fx.place(x, y, z, now);
  if (l.next > 0) return;
  let best: Enemy | null = null,
    bd = P.range;
  for (const e of G.enemies)
    if (alive(e)) {
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
  if (!best) {
    l.next = 0.15;
    return;
  }
  l.next = P.every;
  l.fx.flare();
  fireSpellBolt(x, z, best.x - x, best.z - z, {
    damage: l.def.damage,
    range: P.range + 0.5,
    speed: P.speed,
    color: hex(l.def.color),
    scale: 0.5,
    status: l.def.status,
  });
  Sfx.at(x, z).lanternShot();
}
function endLantern() {
  lamp?.fx.drop();
  lamp = null;
}

/* ---------- harvest: Soul Harvest (M7 step 8, the novice's) ---------- */

/** Every hex in the room is reaped at once: each stack strikes its foe and comes back to the mage as mana. Nothing hexed:
    refused (it costs nothing, but its cooldown waits). */
const harvest: Cast = (def) => {
  const P = def.params,
    color = hex(def.color);
  const hexed = G.enemies.filter((e) => alive(e) && (e.status?.hex ?? 0) > 0);
  if (!hexed.length) return false;
  let stacks = 0;
  for (const e of hexed) {
    const n = e.status!.hex;
    stacks += n;
    e.status!.hex = 0;
    const u = away(e, player.x, player.z);
    damageEnemy(e, n * P.perStack, u.x * 0.2, u.z * 0.2, 0.2, 'spell', def.school);
    strikeFx({ x: e.x, y: foeY(e), z: e.z }, { x: player.x, y: 1, z: player.z }, color, CFG.spellFx.chain, true);
    burst(e.x, foeY(e), e.z, color, 6 + n * 2, 1.8, 0.04);
  }
  const mana = Math.round(stacks * P.mana);
  player.mana = Math.min(player.stats.maxMana, player.mana + mana);
  floatText(player.x, 1.5, player.z, STR.harvested(mana), color);
  Sfx.at(player.x, player.z).soulHarvest();
  return true;
};

/* ---------- every step ---------- */

export const CAST: Record<Shape, Cast> = {
  beam,
  placed,
  shotgun,
  wall,
  chain,
  self,
  zone,
  smite,
  orbit,
  bolt: boltShape,
  grasp,
  mark,
  lantern,
  harvest,
};

/** Effects fade every step; seals, walls and the mantle only run while the game does (`acting`). */
export function updateShapes(dt: number, acting: boolean) {
  updateSpellFx(dt);
  updateFlames(dt);
  if (!acting) return;
  updateSeals(dt);
  updateWalls(dt);
  updateMantle(dt, G.simClock);
  updateZones(dt);
  updateSmites(dt, G.simClock);
  updateWard(dt, G.simClock);
  updateLantern(dt, G.simClock);
  updateGrasps(dt);
  updateMarks(G.simClock, dt);
}

/** The mage leaves the room: what spells left in it goes quietly (the mantle goes with the mage). */
export function leaveRoomShapes() {
  hideSpellFx();
  for (const f of flames) scene.remove(f.s);
  flames.length = 0;
  for (const s of seals) s.fx.drop();
  seals.length = 0;
  for (const w of walls) dropWall(w, true);
  walls.length = 0;
  for (const z of zones) z.fx.drop();
  zones.length = 0;
  for (const s of smites) s.fx.drop();
  smites.length = 0;
  for (const g of grasps) g.fx.drop();
  grasps.length = 0;
  for (const m of marks) {
    m.e.toll = undefined;
    m.fx.drop();
  }
  marks.length = 0;
}
/** A new floor or run: nothing left at all. */
export function clearShapes() {
  leaveRoomShapes();
  endMantle(true);
  endWard();
  endLantern();
}
