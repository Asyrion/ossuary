/* The shapes spells take (GDD: Spells). Each spell's `shape` in data/spells.json is a cast function here, and
   whatever a cast leaves behind runs its course in `updateShapes`: a beam of fire fading, a seal waiting to
   erupt and the ground burning after it, a wall of ice, the storm wrapped around the mage, lightning. The
   numbers a shape reads are the spell's `params`; damage and statuses go through `damageEnemy` and `inflict`
   like everything else, and projectile spells through the bolt pipeline.
   M4.1 adds Hallow's and Umbral's: holy ground (zone, Consecrate), a pillar of light on the strongest foe (smite,
   Judgement), motes circling the mage that break shots (orbit, Wardlight), a slow hexing bolt (bolt, Hex Bolt), hands
   rising to hold foes (grasp, Grasp of the Grave) and a foe marked to pay in mana and obols (mark, the Ferryman's Toll). */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Box, Enemy, Room, Vec2 } from '../types';
import { G, player } from '../state';
import { renderHearts } from '../ui/hud';
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
import { fireAt, frostAt } from '../world/pools';
import { hallowAt, umbralAt } from '../world/mechanisms';
import { canAct } from './status';
import type { Shape, SpellDef } from './spellData';
import { flash, inflict } from './statusFx';
import { consecrateFx, graspFx, hideSpellFx, iceColumn, lanceFx, mantleFx, ringFx, sealFx, smiteFx, strikeFx, tollFx, updateSpellFx, wardFx } from './spellFx';
import { counter } from '../actors/counters';

const hex = (c: string) => parseInt(c.slice(1), 16);
const FIRE = 0xff7a2a, EMBER = 0xffc060, ICE = 0xbfe6ff;

/** Cast a spell along `dir`; false when there is nothing for it to do (no foe in reach, no room for a wall). */
export type Cast = (def: SpellDef, dir: Vec2) => boolean;

/* ---------- targets ---------- */

const alive = (e: Enemy) => !e.dead && e.spawn <= 0 && !e.hidden;
const foeY = (e: Enemy) => e.flying ? .85 : .55;
/** The foe a spell cast from (x, z) along `dir` should strike: near, and rather in front than behind. */
function pickTarget(x: number, z: number, dir: Vec2, range: number, skip: Set<Enemy> = new Set()) {
  let best: Enemy | null = null, bs = Infinity;
  for (const e of G.enemies) {
    if (!alive(e) || skip.has(e)) continue;
    const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
    if (d > range) continue;
    const facing = d > .01 ? (dx * dir.x + dz * dir.z) / d : 1;
    const score = d * (1.4 - .4 * facing);
    if (score < bs) { bs = score; best = e; }
  }
  return best;
}
/** From (x, z) towards a foe: the direction (any, when on top of it) and the distance. */
function away(e: Enemy, x: number, z: number) {
  const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
  return d > .01 ? { x: dx / d, z: dz / d, d } : { x: 1, z: 0, d };
}
/** Fire sets off the blast glyphs `touches` says it reached; `spareFeet` leaves the one the mage stands on, as
    bolts do. */
function igniteGlyphs(touches: (x: number, z: number) => boolean, spareFeet: boolean) {
  for (const gl of [...G.glyphs]) {
    if (gl.spent || (spareFeet && Math.hypot(gl.x - player.x, gl.z - player.z) < CFG.glyph.boltArm)) continue;
    if (touches(gl.x, gl.z)) detonateGlyph(gl);
  }
}

/* ---------- chain: Arc ---------- */

/** Strike the foe nearest in front, then leap to the nearest foe not yet struck, a few times, each strike a
    little weaker. */
const chain: Cast = (def, dir) => {
  const P = def.params, first = pickTarget(player.x, player.z, dir, P.range);
  if (!first) return false;
  const hit = new Set<Enemy>([first]), path: Enemy[] = [first];
  for (let i = 0; i < P.jumps; i++) {
    const last = path[path.length - 1], next = pickTarget(last.x, last.z, dir, P.jumpRange, hit);
    if (!next) break;
    hit.add(next); path.push(next);
  }
  const color = hex(def.color);
  let from = { x: player.x + dir.x * .3, y: 1.05, z: player.z + dir.z * .3 };
  path.forEach((e, i) => {
    const to = { x: e.x, y: foeY(e), z: e.z };
    strikeFx(from, to, color, CFG.spellFx.chain); ringFx(to.x, to.y, to.z, color, .1, .45, CFG.spellFx.flash);
    const dx = e.x - from.x, dz = e.z - from.z, d = Math.hypot(dx, dz) || 1;
    damageEnemy(e, def.damage * Math.pow(P.falloff, i), dx / d, dz / d, .4, 'spell', def.school);
    inflict(e, def.status);
    burst(to.x, to.y, to.z, color, 8, 2.2, .04);
    from = to;
  });
  Sfx.at(first.x, first.z).arc(path.length);
  const swarm = path.filter(e => e.foe?.behaviour === 'swarm'); if (swarm.length > 1) counter(swarm[1], 'chained'); // (M4.7: it leapt through a swarm)
  return true;
};

/* ---------- beam: Cinder Lance ---------- */

/** A beam from just ahead of the mage until a wall, closed door or rock stops it: every foe in its line is struck
    and set burning, whatever it ends on is struck like a bolt (an urn breaks), and glyphs it crosses go off. */
const beam: Cast = (def, dir) => {
  const P = def.params, room = G.current, solids = blockers(room, 'bolt'), color = hex(def.color);
  const sx = player.x + dir.x * .3, sz = player.z + dir.z * .3;
  let len = 0, stop: Box | undefined;
  while (len < P.range && !(stop = boxAt(sx + dir.x * len, sz + dir.z * len, solids))) len += .1;
  len = Math.min(len, P.range);
  if (stop) strikeSolid(room, stop, sx + dir.x * len, .6, sz + dir.z * len);
  // how far along the beam, and how far to one side of it, a point is
  const along = (x: number, z: number) => (x - sx) * dir.x + (z - sz) * dir.z;
  const side = (x: number, z: number) => Math.abs((x - sx) * dir.z - (z - sz) * dir.x);
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    const t = along(e.x, e.z);
    if (t < -e.r || t > len + e.r || side(e.x, e.z) > e.r + P.width) continue;
    damageEnemy(e, def.damage, dir.x, dir.z, .5, 'spell', def.school);
    inflict(e, def.status);
    burst(e.x, foeY(e), e.z, color, 8, 2.4, .05);
  }
  igniteGlyphs((x, z) => { const t = along(x, z); return t > 0 && t < len && side(x, z) < CFG.glyph.boltReach; }, true);
  for (let t = 0; t < len; t += .3) fireAt(sx + dir.x * t, sz + dir.z * t); // and oil along it
  lanceFx(sx, sz, dir, len, color);
  for (let t = .4; t < len; t += .6) burst(sx + dir.x * t, .6, sz + dir.z * t, t % 1.2 < .6 ? FIRE : EMBER, 2, 1.4, .045);
  Sfx.lance();
  return true;
};

/* ---------- placed: Pyre Seal ---------- */

/** A seal chalked in fire at the mage's feet: it brightens and turns for a heartbeat, then erupts (a ring of
    flame that strikes, sets burning and throws back every foe in it, and sets off glyphs), and the ground in
    it burns for a while after, setting foes that walk on it burning again. Its look is `sealFx` (spellFx.ts). */
const seals: { def: SpellDef; x: number; z: number; t: number; fx: ReturnType<typeof sealFx>; erupted: boolean; tick: number }[] = [];
const placed: Cast = def => {
  const P = def.params, color = hex(def.color);
  seals.push({ def, x: player.x, z: player.z, t: 0, fx: sealFx(player.x, player.z, P.radius, color), erupted: false, tick: 0 });
  burst(player.x, .1, player.z, color, 10, 1.6, .04); Sfx.sealPlace();
  return true;
};
function updateSeals(dt: number) {
  for (let i = seals.length - 1; i >= 0; i--) {
    const s = seals[i], P = s.def.params; s.t += dt;
    if (!s.erupted) { // brighter and faster as it's about to erupt
      const k = Math.min(1, s.t / P.delay);
      s.fx.charge(k, s.t);
      if (Math.random() < dt * 20) { const a = Math.random() * Math.PI * 2; flame(s.x + Math.cos(a) * P.radius * .92, s.z + Math.sin(a) * P.radius * .92, FIRE, .35); }
      if (s.t >= P.delay) erupt(s);
      continue;
    }
    const left = P.delay + P.ground - s.t;
    if (left <= 0) { s.fx.drop(); seals.splice(i, 1); continue; }
    s.fx.burn(dt, left, s.t);
    // flames lick up from the burning ground, and it sets burning what walks on it (not what flies above)
    if (Math.random() < dt * 40 * Math.min(1, left)) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * P.radius; flame(s.x + Math.cos(a) * r, s.z + Math.sin(a) * r, Math.random() < .6 ? FIRE : EMBER, .4 + Math.random() * .35); }
    s.tick -= dt;
    if (s.tick <= 0) {
      s.tick = .25;
      for (const e of G.enemies) if (alive(e) && !e.flying && Math.hypot(e.x - s.x, e.z - s.z) < P.radius + e.r * .5) inflict(e, { burn: P.groundBurn });
      fireAt(s.x, s.z, P.radius - .6);
      if (Math.random() < .4) Sfx.at(s.x, s.z).crackle();
    }
  }
}
function erupt(s: (typeof seals)[number]) {
  const def = s.def, P = def.params;
  s.erupted = true; s.fx.erupt();
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    const u = away(e, s.x, s.z);
    if (u.d > P.radius + e.r) continue;
    damageEnemy(e, def.damage, u.x, u.z, 0, 'spell', def.school);
    inflict(e, def.status);
    if (!e.isBoss) { e.kx += u.x * P.knockback; e.kz += u.z * P.knockback; }
  }
  igniteGlyphs((x, z) => Math.hypot(x - s.x, z - s.z) < P.radius, false);
  fireAt(s.x, s.z, P.radius - .4);
  for (let i = 0; i < 20; i++) { // a ring of flame, and a burst in the middle
    const a = i / 20 * Math.PI * 2, x = s.x + Math.cos(a) * P.radius, z = s.z + Math.sin(a) * P.radius;
    flame(x, z, i % 2 ? FIRE : EMBER, .7); if (i % 2) burst(x, .2, z, FIRE, 2, 2.2, .06);
  }
  burst(s.x, .3, s.z, FIRE, 14, 3.2, .08);
  flash(s.x, s.z, 0xff8a3a, P.radius); ringFx(s.x, .05, s.z, FIRE, P.radius * .3, P.radius * 1.25, CFG.spellFx.shockwave, true);
  Sfx.at(s.x, s.z).sealErupt(); G.shake = Math.max(G.shake, .25);
}

/** Tongues of flame, and motes: glows rising and shrinking away (shared materials, so nothing to free). */
const flames: { s: THREE.Sprite; t: number; size: number }[] = [];
const FLAME_LIFE = .55;
export function flame(x: number, z: number, color: number, size: number, y = .12) {
  const s = glowShared(color, size, .85); s.position.set(x, y, z); scene.add(s); flames.push({ s, t: 0, size });
}
/** A mote of light rising from (x, y, z) and fading (a grimoire page's whisper). */
export const riseMote = (x: number, y: number, z: number, color: number, size = .18) => flame(x, z, color, size, y);
function updateFlames(dt: number) {
  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i]; f.t += dt;
    if (f.t >= FLAME_LIFE) { scene.remove(f.s); flames.splice(i, 1); continue; }
    f.s.position.y += dt * 1.1; f.s.scale.setScalar(f.size * (1 - f.t / FLAME_LIFE));
  }
}

/* ---------- shotgun: Rime Shards ---------- */

/** A fan of ice shards from the mage, each a spell bolt that chills what it strikes. */
const shotgun: Cast = (def, dir) => {
  const P = def.params, color = hex(def.color), base = Math.atan2(dir.z, dir.x);
  for (let i = 0; i < P.count; i++) {
    const a = base + (i - (P.count - 1) / 2) * P.fan, dx = Math.cos(a), dz = Math.sin(a);
    fireSpellBolt(player.x + dx * .3, player.z + dz * .3, dx, dz, { damage: def.damage, range: P.range, speed: P.speed, color, status: def.status, shard: true });
  }
  burst(player.x + dir.x * .4, .7, player.z + dir.z * .4, color, 8, 2, .04);
  Sfx.shards();
  return true;
};

/* ---------- wall: Glacial Wall ---------- */

/** A wall of ice crystals across the cast direction, a little ahead of the mage (nearer when something is in the
    way), stopping at walls and rocks. It stops the mage, foes and their shots, not the mage's bolts; when its
    time is up it shatters, striking and chilling every foe near it. */
const walls: { def: SpellDef; room: Room; boxes: Box[]; g: THREE.Group; columns: THREE.Group[]; t: number }[] = [];
const ICE_HALF = .27;
const wall: Cast = (def, dir) => {
  const P = def.params, room = G.current, solids = blockers(room, 'bolt');
  const px = -dir.z, pz = dir.x; // across the cast direction
  let ahead = P.ahead;
  while (ahead > .9 && pointInBoxes(player.x + dir.x * ahead, player.z + dir.z * ahead, ICE_HALF, solids)) ahead -= .1;
  const cx = player.x + dir.x * ahead, cz = player.z + dir.z * ahead;
  if (pointInBoxes(cx, cz, ICE_HALF, solids)) return false;
  // from the middle outwards on both sides, until a wall or rock is in the way
  const n = Math.max(1, Math.round(P.width / (ICE_HALF * 1.6))), step = P.width / n, spots = [{ x: cx, z: cz, k: 0 }]; // (k: steps from the middle)
  for (const s of [-1, 1]) for (let k = 1; k <= n / 2; k++) {
    const x = cx + px * s * k * step, z = cz + pz * s * k * step;
    if (pointInBoxes(x, z, ICE_HALF * .5, solids)) break;
    spots.push({ x, z, k });
  }
  // (its look: a pillar of ice for each spot, rising from the middle outwards; iceColumn in spellFx.ts)
  const g = new THREE.Group(), columns: THREE.Group[] = [], boxes: Box[] = [];
  for (const p of spots) {
    const c = iceColumn(p.x, p.z, .8 + Math.random() * .45); c.rotation.set((Math.random() - .5) * .16, Math.random() * Math.PI * 2, (Math.random() - .5) * .16);
    c.userData.delay = p.k * CFG.spellFx.wallStagger; c.scale.y = .01; g.add(c); columns.push(c);
    boxes.push({ x: p.x, z: p.z, hx: ICE_HALF, hz: ICE_HALF });
    burst(p.x, .3, p.z, ICE, 3, 1.8, .045); frostAt(p.x, p.z, .25); // water it stands in freezes
  }
  scene.add(g);
  room.barriers = [...(room.barriers ?? []), ...boxes];
  walls.push({ def, room, boxes, g, columns, t: 0 });
  Sfx.wallRise();
  return true;
};
function updateWalls(dt: number) {
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i]; w.t += dt;
    const left = w.def.params.life - w.t;
    for (const c of w.columns) { // up with a little overshoot, and sinking a little as it cracks before it goes
      const r = Math.min(1, Math.max(0, (w.t - c.userData.delay) / CFG.spellFx.wallRise)), up = r < 1 ? r * (1 + Math.sin(r * Math.PI) * .25) : 1;
      c.scale.y = Math.max(.01, up * (left < .6 ? .85 + left / .6 * .15 : 1));
    }
    const shiver = left < .6 ? (Math.random() - .5) * .05 : 0; w.g.position.set(shiver, 0, -shiver);
    if (left <= 0) { dropWall(w); walls.splice(i, 1); }
  }
}
function dropWall(w: (typeof walls)[number], quiet = false) {
  scene.remove(w.g);
  w.room.barriers = (w.room.barriers ?? []).filter(b => !w.boxes.includes(b));
  if (quiet) return;
  const def = w.def, P = def.params;
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    let near = w.boxes[0], nd = Infinity;
    for (const b of w.boxes) { const d = Math.hypot(e.x - b.x, e.z - b.z); if (d < nd) { nd = d; near = b; } }
    if (nd > P.burst + e.r) continue;
    const u = away(e, near.x, near.z);
    damageEnemy(e, def.damage, u.x, u.z, .6, 'spell', def.school);
    inflict(e, def.status);
  }
  for (const b of w.boxes) { burst(b.x, .5, b.z, ICE, 6, 2.6, .06); burst(b.x, .8, b.z, 0xffffff, 2, 2, .04); }
  const mid = w.boxes[0]; ringFx(mid.x, .05, mid.z, ICE, .3, P.burst + .6, CFG.spellFx.shockwave, true); // (the first box is the middle)
  Sfx.at(w.boxes[0].x, w.boxes[0].z).wallShatter(); G.shake = Math.max(G.shake, .12);
}

/* ---------- self: Static Mantle ---------- */

/** The storm wrapped around the mage for a while: sparks circling, small arcs crackling over the body, and any
    foe that touches it struck, shocked and thrown back (each foe at most every so often). */
let mantle: { def: SpellDef; t: number; fx: ReturnType<typeof mantleFx>; zapped: Map<Enemy, number>; arcT: number } | null = null;
const self: Cast = def => {
  endMantle(true);
  const color = hex(def.color), fx = mantleFx(color);
  mantle = { def, t: 0, fx, zapped: new Map(), arcT: 0 }; fx.update(player.x, player.z, 0, 1);
  burst(player.x, .7, player.z, color, 14, 2.4, .04); Sfx.mantle();
  return true;
};
/** While the Static Mantle is up, a foe touching the mage doesn't hurt it: the storm throws it back first. A boss
    is too heavy to throw, so it still hurts, unless the shock stunned it. */
export const mantleShields = (e: Enemy) => !!mantle && (!e.isBoss || !canAct(e.status));
/** Seconds of the Static Mantle left (0 when it's down). */
export const mantleLeft = () => mantle ? mantle.def.params.life - mantle.t : 0;
function updateMantle(dt: number, now: number) {
  const m = mantle; if (!m) return;
  const P = m.def.params, color = hex(m.def.color); m.t += dt;
  if (m.t >= P.life) { endMantle(false); return; }
  const fade = Math.min(1, (P.life - m.t) / .5);
  m.fx.update(player.x, player.z, m.t, fade);
  m.arcT -= dt;
  if (m.arcT <= 0) { // a small arc crackles over the mage
    m.arcT = .15 + Math.random() * .15;
    const a = Math.random() * Math.PI * 2, b = a + 1 + Math.random() * 2;
    strikeFx({ x: player.x + Math.cos(a) * .45, y: .3 + Math.random() * .9, z: player.z + Math.sin(a) * .45 }, { x: player.x + Math.cos(b) * .45, y: .3 + Math.random() * .9, z: player.z + Math.sin(b) * .45 }, color, undefined, true);
  }
  for (const e of G.enemies) {
    if (!alive(e) || (m.zapped.get(e) ?? 0) > now) continue;
    const u = away(e, player.x, player.z);
    if (u.d > player.r + e.r + P.reach) continue;
    m.zapped.set(e, now + P.every);
    strikeFx({ x: player.x, y: .8, z: player.z }, { x: e.x, y: foeY(e), z: e.z }, color);
    damageEnemy(e, m.def.damage, u.x, u.z, 0, 'spell', m.def.school);
    inflict(e, m.def.status);
    if (!e.isBoss) { e.kx += u.x * P.knockback; e.kz += u.z * P.knockback; }
    burst(e.x, foeY(e), e.z, color, 8, 2.4, .035); Sfx.at(e.x, e.z).mantleZap();
  }
}
function endMantle(quiet: boolean) {
  if (!mantle) return;
  mantle.fx.drop();
  if (!quiet) { burst(player.x, .7, player.z, hex(mantle.def.color), 8, 1.6, .03); Sfx.mantleEnd(); }
  mantle = null;
}

/* ---------- zone: Consecrate (M4.1) ---------- */

/** Holy ground at the mage's feet for a while: every few moments it strikes and sanctifies the foes standing in it (not
    what flies above), and the mage in it is healed once. */
const zones: { def: SpellDef; x: number; z: number; t: number; tick: number; healed: boolean; fx: ReturnType<typeof consecrateFx> }[] = [];
const zone: Cast = def => {
  zones.push({ def, x: player.x, z: player.z, t: 0, tick: 0, healed: false, fx: consecrateFx(player.x, player.z, def.params.radius, hex(def.color)) });
  hallowAt(player.x, player.z, def.params.radius); // holy ground kindles the candle stands on it
  burst(player.x, .2, player.z, hex(def.color), 14, 2, .04); Sfx.consecrate();
  return true;
};
function updateZones(dt: number) {
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i], P = z.def.params; z.t += dt;
    const left = P.life - z.t;
    if (left <= 0) { z.fx.drop(); zones.splice(i, 1); continue; }
    z.fx.update(z.t, Math.min(1, left / .5, z.t / .25));
    if ((z.tick -= dt) <= 0) {
      z.tick = P.every;
      for (const e of G.enemies) if (alive(e) && !e.flying && Math.hypot(e.x - z.x, e.z - z.z) < P.radius + e.r * .5) {
        damageEnemy(e, z.def.damage, 0, 0, 0, 'spell', z.def.school); inflict(e, z.def.status); burst(e.x, .5, e.z, hex(z.def.color), 3, 1.2, .03);
      }
    }
    if (!z.healed && player.hp < player.maxHp && Math.hypot(player.x - z.x, player.z - z.z) < P.radius) {
      z.healed = true; player.hp = Math.min(player.maxHp, player.hp + P.heal); renderHearts(); heroDrink(); burst(player.x, .9, player.z, hex(z.def.color), 10, 1.4, .04);
    }
  }
}

/* ---------- smite: Judgement (M4.1) ---------- */

/** The strongest foe in reach is marked by a closing ring of gold; a moment later a pillar of light falls on it, striking
    and sanctifying everything in it. */
const smites: { def: SpellDef; target: Enemy; x: number; z: number; t: number; fell: boolean; fx: ReturnType<typeof smiteFx> }[] = [];
const smite: Cast = def => {
  const P = def.params; let best: Enemy | null = null;
  for (const e of G.enemies) if (alive(e) && Math.hypot(e.x - player.x, e.z - player.z) < P.range && (!best || e.hp > best.hp)) best = e;
  if (!best) return false;
  smites.push({ def, target: best, x: best.x, z: best.z, t: 0, fell: false, fx: smiteFx(hex(def.color), P.radius) });
  Sfx.judgementCall();
  return true;
};
function updateSmites(dt: number, now: number) {
  for (let i = smites.length - 1; i >= 0; i--) {
    const s = smites[i], P = s.def.params; s.t += dt;
    if (!s.fell) {
      if (!s.target.dead) { s.x = s.target.x; s.z = s.target.z; }
      s.fx.mark(s.x, s.z, Math.min(1, s.t / P.delay), now);
      if (s.t < P.delay) continue;
      s.fell = true; s.fx.fall();
      for (const e of G.enemies) {
        if (!alive(e) || Math.hypot(e.x - s.x, e.z - s.z) > P.radius + e.r) continue;
        damageEnemy(e, s.def.damage, 0, 0, 0, 'spell', s.def.school); inflict(e, s.def.status);
      }
      burst(s.x, .4, s.z, hex(s.def.color), 24, 3.4, .06); ringFx(s.x, .05, s.z, hex(s.def.color), .2, P.radius * 1.8, CFG.spellFx.shockwave, true);
      hallowAt(s.x, s.z, P.radius); // (and the pillar kindles candles where it falls)
      Sfx.at(s.x, s.z).judgement(); G.shake = Math.max(G.shake, .25);
      continue;
    }
    const k = (s.t - P.delay) / .5;
    if (k >= 1) { s.fx.drop(); smites.splice(i, 1); continue; }
    s.fx.fade(k);
  }
}

/* ---------- orbit: Wardlight (M4.1) ---------- */

/** Motes of light circling the mage for a while: an enemy shot that meets one is broken, and a foe one touches is struck
    and sanctified (each foe at most every so often). It goes with the mage from room to room, as the mantle does. */
let ward: { def: SpellDef; t: number; fx: ReturnType<typeof wardFx>; touched: Map<Enemy, number> } | null = null;
const orbit: Cast = def => {
  endWard();
  ward = { def, t: 0, fx: wardFx(def.params.count, hex(def.color)), touched: new Map() };
  burst(player.x, .8, player.z, hex(def.color), 12, 2, .04); Sfx.wardlight();
  return true;
};
/** Seconds of Wardlight left (0 when it's down). */
export const wardLeft = () => ward ? ward.def.params.life - ward.t : 0;
function updateWard(dt: number, now: number) {
  const w = ward; if (!w) return;
  const P = w.def.params, color = hex(w.def.color); w.t += dt;
  if (w.t >= P.life) { endWard(); return; }
  for (let i = 0; i < P.count; i++) {
    const a = w.t * P.turn + i / P.count * Math.PI * 2, x = player.x + Math.cos(a) * P.radius, z = player.z + Math.sin(a) * P.radius;
    w.fx.place(i, x, .75 + Math.sin(w.t * 3 + i) * .08, z, w.t * 4 + i, true);
    for (let k = G.shots.length - 1; k >= 0; k--) { const s = G.shots[k]; if (Math.hypot(s.x - x, s.z - z) < P.reach + s.r) { scene.remove(s.mesh); G.shots.splice(k, 1); burst(s.x, s.y, s.z, color, 5, 1.4, .03); Sfx.at(s.x, s.z).wardTink(); } }
    for (const e of G.enemies) {
      if (!alive(e) || (w.touched.get(e) ?? 0) > now || Math.hypot(e.x - x, e.z - z) > P.reach + e.r) continue;
      w.touched.set(e, now + P.every);
      damageEnemy(e, w.def.damage, (e.x - player.x) / P.radius, (e.z - player.z) / P.radius, .3, 'spell', w.def.school); inflict(e, w.def.status);
      burst(e.x, foeY(e), e.z, color, 5, 1.6, .03);
    }
  }
}
function endWard() { ward?.fx.drop(); ward = null; }

/* ---------- bolt: Hex Bolt (M4.1) ---------- */

/** One slow dark bolt along the cast direction, hexing what it strikes. */
const boltShape: Cast = (def, dir) => {
  const P = def.params, color = hex(def.color);
  fireSpellBolt(player.x + dir.x * .3, player.z + dir.z * .3, dir.x, dir.z, { damage: def.damage, range: P.range, speed: P.speed, color, scale: P.scale, status: def.status });
  burst(player.x + dir.x * .4, .7, player.z + dir.z * .4, color, 8, 1.6, .04); Sfx.hexBolt();
  return true;
};

/* ---------- grasp: Grasp of the Grave (M4.1) ---------- */

/** Where the mage aims, a few tiles ahead (or on the foe there), dark hands rise out of the floor, then close: every foe
    in their ring is struck, held where it stands (Root) and hexed. They sink back when the hold is over. */
const grasps: { def: SpellDef; x: number; z: number; t: number; closed: boolean; fx: ReturnType<typeof graspFx> }[] = [];
const grasp: Cast = (def, dir) => {
  const P = def.params, near = pickTarget(player.x, player.z, dir, P.ahead + P.radius);
  const at = near ? { x: near.x, z: near.z } : freeSpotNear(G.current, player.x + dir.x * P.ahead, player.z + dir.z * P.ahead);
  grasps.push({ def, x: at.x, z: at.z, t: 0, closed: false, fx: graspFx(at.x, at.z, P.radius, hex(def.color)) });
  Sfx.at(at.x, at.z).graspRise();
  return true;
};
function updateGrasps(dt: number) {
  for (let i = grasps.length - 1; i >= 0; i--) {
    const g = grasps[i], P = g.def.params; g.t += dt;
    const hold = g.def.status?.root ?? 2, life = P.delay + hold;
    if (!g.closed && g.t >= P.delay) {
      g.closed = true;
      for (const e of G.enemies) {
        if (!alive(e) || e.flying || Math.hypot(e.x - g.x, e.z - g.z) > P.radius + e.r) continue;
        damageEnemy(e, g.def.damage, 0, 0, 0, 'spell', g.def.school); inflict(e, g.def.status); burst(e.x, .3, e.z, hex(g.def.color), 6, 1.4, .03);
      }
      umbralAt(g.x, g.z, P.radius); // (the dark blinds a watching statue, breaks an obelisk's umbral ward)
      Sfx.at(g.x, g.z).graspClose();
    }
    const k = g.t < P.delay ? g.t / P.delay : g.t < life ? 1 : 1 - (g.t - life) / .3;
    if (k <= 0 && g.t > life) { g.fx.drop(); grasps.splice(i, 1); continue; }
    g.fx.set(k);
  }
}

/* ---------- mark: the Ferryman's Toll (M4.1) ---------- */

/** The nearest foe is struck and marked with a coin of shadow for a while: every blow the mage lands on it gives back
    mana (`toll` on the foe; damage.ts), and if it falls marked it pays in obols and its hex spreads to the foes round it
    (`payToll`). */
const marks: { def: SpellDef; e: Enemy; t: number; fx: ReturnType<typeof tollFx> }[] = [];
const mark: Cast = (def, dir) => {
  const P = def.params, e = pickTarget(player.x, player.z, dir, P.range);
  if (!e) return false;
  const had = marks.findIndex(m => m.e === e); if (had >= 0) { marks[had].fx.drop(); marks.splice(had, 1); }
  e.toll = { mana: P.mana, obols: P.obols, spread: P.spread, spreadRange: P.spreadRange };
  marks.push({ def, e, t: 0, fx: tollFx(hex(def.color)) });
  const u = away(e, player.x, player.z);
  damageEnemy(e, def.damage, u.x, u.z, .3, 'spell', def.school); inflict(e, def.status);
  strikeFx({ x: player.x, y: 1, z: player.z }, { x: e.x, y: foeY(e), z: e.z }, hex(def.color), CFG.spellFx.chain, true);
  Sfx.at(e.x, e.z).ferryToll();
  return true;
};
function updateMarks(now: number, dt: number) {
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i]; m.t += dt;
    if (m.e.dead || m.t >= m.def.params.life) { if (!m.e.dead) m.e.toll = undefined; m.fx.drop(); marks.splice(i, 1); continue; }
    m.fx.at(m.e.x, m.e.flying ? 1.75 : 1.35, m.e.z, now);
  }
}
/** A marked foe has fallen: it pays its toll in obols, and its hex spreads to the foes round it. */
export function payToll(e: Enemy) {
  const T = e.toll; if (!T) return;
  for (let i = 0; i < T.obols; i++) { const p = freeSpotNear(G.current, e.x + (i - (T.obols - 1) / 2) * .4, e.z); spawnPickup('coin', p.x, p.z); }
  for (const o of G.enemies) if (o !== e && alive(o) && Math.hypot(o.x - e.x, o.z - e.z) < T.spreadRange) { inflict(o, { hex: T.spread }); sparkBetween(e, o); }
  burst(e.x, .8, e.z, 0xa266ff, 14, 2.2, .05);
}
const sparkBetween = (a: Enemy, b: Enemy) => strikeFx({ x: a.x, y: .8, z: a.z }, { x: b.x, y: foeY(b), z: b.z }, 0xa266ff, CFG.spellFx.chain, true);

/* ---------- every step ---------- */

export const CAST: Record<Shape, Cast> = { beam, placed, shotgun, wall, chain, self, zone, smite, orbit, bolt: boltShape, grasp, mark };

/** Effects fade every step; seals, walls and the mantle only run while the game does (`acting`). */
export function updateShapes(dt: number, acting: boolean) {
  updateSpellFx(dt); updateFlames(dt);
  if (!acting) return;
  updateSeals(dt); updateWalls(dt); updateMantle(dt, G.simClock);
  updateZones(dt); updateSmites(dt, G.simClock); updateWard(dt, G.simClock); updateGrasps(dt); updateMarks(G.simClock, dt);
}

/** The mage leaves the room: what spells left in it goes quietly (the mantle goes with the mage). */
export function leaveRoomShapes() {
  hideSpellFx();
  for (const f of flames) scene.remove(f.s); flames.length = 0;
  for (const s of seals) s.fx.drop(); seals.length = 0;
  for (const w of walls) dropWall(w, true); walls.length = 0;
  for (const z of zones) z.fx.drop(); zones.length = 0;
  for (const s of smites) s.fx.drop(); smites.length = 0;
  for (const g of grasps) g.fx.drop(); grasps.length = 0;
  for (const m of marks) { m.e.toll = undefined; m.fx.drop(); } marks.length = 0;
}
/** A new floor or run: nothing left at all. */
export function clearShapes() { leaveRoomShapes(); endMantle(true); endWard(); }
