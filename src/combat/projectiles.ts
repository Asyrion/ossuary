/* Bolts (the mage's cantrip) and enemy shots.

   The cantrip is a small pipeline: the focus decides how many bolts leave per cast, side by side or in a
   fan, and which path they take (straight, bounce off walls, boomerang back to the mage, weave like a
   serpent); every modifier from the other artifacts (damage, size, colour, speed, range, piercing,
   knockback, rock breaking, the Raven's Eye's strong bolts, the Cracked Mirror's split) applies to every
   bolt, whatever the path. Spells fire bolts through the same pipeline (Rime Shards, Shatter's shards): their
   hits are spell hits and carry the spell's statuses. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Bolt, Box, Enemy, RockBox, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { basicMat, blob, glowShared, sphereGeo } from '../render/materials';
import { blockers, boxAt } from '../world/collision';
import { WARD_COLOR, hitRock, strikeUrn } from '../world/rooms';
import { strikeProp } from '../world/props';
import { boltThrough } from '../world/mechanisms';
import { hollowRing } from '../world/secret';
import { strikeWisp } from '../world/shrine';
import { shootDir } from '../input';
import { heroCast } from '../actors/hero';
import { schoolOf } from '../actors/foeData';
import { damageEnemy, hurtPlayer } from './damage';
import { detonateGlyph, glyphNear } from './glyphs';
import { burst } from './fx';
import { GILT_COLOR, type BoltPath } from '../items/artifactData';
import type { StatusKind } from '../magic/spellData';
import { inflict } from '../magic/statusFx';
import { fireAt, frostAt } from '../world/pools';
import { animateBolt, boltLook, impactFx } from '../magic/spellFx';

const BLESSED = 0xfff0b0; // a blessed cast's gold

interface BoltSpec {
  x: number; z: number; vx: number; vz: number; damage: number; range: number; scale: number; color: number; path: BoltPath; pierce: number; bounces: number; secondary: boolean; crit?: boolean;
  /** A spell's bolt, with the spell's statuses; `shard` makes it a splinter of ice instead of an orb. */ spell?: boolean; status?: Partial<Record<StatusKind, number>>; shard?: boolean;
}

function makeBolt(s: BoltSpec) {
  const mesh = new THREE.Group(); const y = .6;
  const shadow = blob(.35 * Math.min(1.4, s.scale)); shadow.position.y = -y + .015;
  // (its look, from spellFx.ts: the core, then its glow and shadow at 1 and 2, then rings, runes or a trail)
  const look = boltLook(s.color, s.scale, !!s.shard);
  mesh.add(look.core, glowShared(s.color, .75 * s.scale, .9), shadow, ...look.extras);
  mesh.rotation.y = Math.atan2(s.vx, s.vz); animateBolt(mesh, 0, 0, 0);
  mesh.position.set(s.x, y, s.z); scene.add(mesh);
  const b: Bolt = {
    x: s.x, z: s.z, y, vx: s.vx, vz: s.vz, speed: Math.hypot(s.vx, s.vz), dist: 0, range: s.range, r: .12 * s.scale, mesh,
    damage: s.damage, color: s.color, path: s.path, pierce: s.pierce, bounces: s.bounces, returning: false, hit: new Set(), secondary: s.secondary, crit: s.crit,
    spell: s.spell, status: s.status,
  };
  if (s.path === 'wave') { const v = Math.hypot(s.vx, s.vz) || 1; b.wave = { ox: s.x, oz: s.z, px: -s.vz / v, pz: s.vx / v }; }
  G.bolts.push(b);
  return b;
}

let casts = 0; // for the Frostbitten Ring's every fifth cast
/** Cast the cantrip in the current shooting direction, in the focus's pattern. */
export function spawnBolt() {
  const dir = shootDir(); if (!dir) return;
  const st = player.stats, p = st.pattern, A = CFG.artifacts;
  const px = -dir.z, pz = dir.x; // sideways
  const ix = player.vx * CFG.hero.shotInherit, iz = player.vz * CFG.hero.shotInherit;
  // one bolt alternates between two "eyes"; several bolts fly side by side, or fan out
  player.eye *= -1;
  const slots = p.count === 1 ? [0] : Array.from({ length: p.count }, (_, i) => i - (p.count - 1) / 2);
  // Raven's Eye: now and then the whole cast strikes thrice as hard, bigger and white-hot
  const crit = st.effects.has('crit') && Math.random() < A.crit.chance;
  // the Emberwood Wand sets foes burning; the Frostbitten Ring chills with every fifth cast
  const frost = st.effects.has('frostbite') && ++casts % A.frostbite.every === 0;
  // a chapel's blessing: the next few casts strike harder, in gold
  const blessed = player.blessed > 0; if (blessed) player.blessed--;
  const status = st.effects.has('emberBolts') || frost ? { ...(st.effects.has('emberBolts') ? { burn: A.emberwood.burn } : {}), ...(frost ? { chill: A.frostbite.chill } : {}) } : undefined;
  for (const k of slots) {
    const a = k * p.fan, c = Math.cos(a), s = Math.sin(a);
    const dx = dir.x * c - dir.z * s, dz = dir.z * c + dir.x * s, off = p.count === 1 ? .1 * player.eye : p.fan ? 0 : k * p.spread;
    makeBolt({
      x: player.x + dx * .3 + px * off, z: player.z + dz * .3 + pz * off, vx: dx * st.shotSpeed + ix, vz: dz * st.shotSpeed + iz,
      damage: st.damage * (crit ? A.crit.damageMul : 1) * (blessed ? CFG.mech.blessMul : 1), range: st.range, scale: st.boltScale * (crit ? A.crit.scale : 1) * (blessed ? CFG.mech.blessScale : 1),
      color: crit ? A.crit.color : frost ? A.frostbite.color : blessed ? BLESSED : st.boltColor, path: p.path, pierce: st.pierce, bounces: p.bounces, secondary: false, crit, status,
    });
  }
  // the Miser's Purse: gold glints off the cast, more of them the more obols are hoarded
  if (st.gilt > 0) burst(player.x + dir.x * .45, .75, player.z + dir.z * .45, GILT_COLOR, 1 + Math.round(st.gilt * 4), 1.4, .03);
  player.squash = 1; heroCast(); Sfx.shoot(); if (crit) Sfx.crit();
}

/** A ring of small burst bolts (Saint's Knucklebone on a death, Mourning Bell when hit). */
export function spawnBurst(x: number, z: number, count: number, offsetAngle = 0) {
  const B = CFG.artifacts.burst, st = player.stats;
  for (let i = 0; i < count; i++) {
    const a = offsetAngle + i / count * Math.PI * 2;
    makeBolt({
      x: x + Math.cos(a) * .3, z: z + Math.sin(a) * .3, vx: Math.cos(a) * B.speed, vz: Math.sin(a) * B.speed,
      damage: st.damage * B.damageMul, range: B.range, scale: B.scale, color: st.boltColor,
      path: 'straight', pierce: 0, bounces: 0, secondary: true,
    });
  }
}

/** A single lesser bolt from (x, z) along (dx, dz): the Cracked Mirror's halves, the Candle Moth's sting. */
export function fireSecondary(x: number, z: number, dx: number, dz: number, o: { damage: number; range: number; scale: number; color: number; speed?: number }) {
  const l = Math.hypot(dx, dz) || 1, v = o.speed ?? player.stats.shotSpeed;
  makeBolt({ x, z, vx: dx / l * v, vz: dz / l * v, damage: o.damage, range: o.range, scale: o.scale, color: o.color, path: 'straight', pierce: 0, bounces: 0, secondary: true });
}

/** A spell's bolt from (x, z) along (dx, dz): Rime Shards' splinters, Shatter's shards. It strikes as a spell
    (no mana back for the kill) and puts the spell's statuses on what it hits. */
export function fireSpellBolt(x: number, z: number, dx: number, dz: number, o: { damage: number; range: number; speed: number; color: number; scale?: number; status?: Partial<Record<StatusKind, number>>; shard?: boolean }) {
  const l = Math.hypot(dx, dz) || 1;
  makeBolt({ x, z, vx: dx / l * o.speed, vz: dz / l * o.speed, damage: o.damage, range: o.range, scale: o.scale ?? .8, color: o.color, path: 'straight', pierce: 0, bounces: 0, secondary: true, spell: true, status: o.status, shard: o.shard });
}

/** Enemy projectile. */
export function spawnShot(x: number, z: number, dx: number, dz: number, speed: number, color: number, y = .55, size = 1, o: { fire?: boolean } = {}) {
  const mesh = new THREE.Group();
  const sh = blob(.4); sh.position.y = -y + .015;
  mesh.add(new THREE.Mesh(sphereGeo(.13 * size), basicMat(color)), glowShared(color, .9 * size, .9), sh);
  scene.add(mesh); G.shots.push({ x, z, y, vx: dx * speed, vz: dz * speed, r: .14 * size, color, mesh, fire: o.fire, fireT: 0 });
}

export function clearProjectiles() {
  for (const b of G.bolts) scene.remove(b.mesh); G.bolts.length = 0;
  for (const s of G.shots) scene.remove(s.mesh); G.shots.length = 0;
}

/** Something of the mage's (a bolt, a beam) reaches a wall, door or rock at (x, y, z): a vault's ward glances it off,
    a cracked wall rings hollow, an urn breaks. Returns the box as a rock, to check for more. */
export function strikeSolid(room: Room, box: Box, x: number, y: number, z: number, status?: Partial<Record<StatusKind, number>>) {
  const door = room.doors.find(d => d.box === box);
  if (door?.seal?.sealed) { burst(x, y, z, WARD_COLOR, 5, 1.6, .035); Sfx.at(x, z).wardTink(); } // glances off a vault's ward
  if (door?.secret) hollowRing(door, x, z);                                               // a cracked wall rings hollow
  const rock = box as RockBox;
  if (rock.urn) strikeUrn(room, rock, false);                                             // any bolt breaks an urn
  else if (rock.prop) strikeProp(room, rock, false, status);                              // piles break, bells ring, runes charge
  return rock;
}

function removeBolt(i: number, fizzle = true) {
  const b = G.bolts[i]; scene.remove(b.mesh); G.bolts.splice(i, 1);
  if (fizzle) { burst(b.x, Math.max(.1, b.y), b.z, b.color, b.secondary ? 3 : 5, 1.6, .05); impactFx(b.x, Math.max(.15, b.y), b.z, b.color, b.secondary ? .7 : 1); Sfx.at(b.x, b.z).splash(); }
}

export function updateBolts(dt: number) {
  const room = G.current, solids = blockers(room, 'bolt');
  const breaker = player.stats.effects.has('rockBreaker');
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    const b = G.bolts[i];
    if (b.path === 'boomerang' && b.returning) { // fly home to the mage, through everything
      const dx = player.x - b.x, dz = player.z - b.z, d = Math.hypot(dx, dz);
      if (d < .45) { removeBolt(i, false); continue; } // caught
      b.vx = dx / d * b.speed; b.vz = dz / d * b.speed;
    }
    if (b.path === 'homing') steer(b, dt);
    const ox = b.x, oz = b.z;
    b.dist += b.speed * dt;
    if (b.wave) { // the Serpent Rod: along a straight line, swinging from side to side
      const W = CFG.artifacts.wave, w = b.wave; w.ox += b.vx * dt; w.oz += b.vz * dt;
      const off = Math.sin(b.dist * W.freq) * W.amp * Math.min(1, b.dist * 2);
      b.x = w.ox + w.px * off; b.z = w.oz + w.pz * off;
    } else { b.x += b.vx * dt; b.z += b.vz * dt; }
    let kill = false;
    if (b.path === 'boomerang') {
      b.y = .6;
      if (!b.returning && b.dist >= b.range) { b.returning = true; b.hit.clear(); }
      if (b.dist > b.range * 4) kill = true; // safety: never fly forever
    } else { // straight, bounce and wave: drop to the floor over the last 30% of the range
      const R = b.range, fall = b.dist > R * .7 ? (b.dist - R * .7) / (R * .3) : 0;
      b.y = .6 * (1 - fall * fall);
      kill = b.dist >= R || b.y <= .05;
    }
    // the merchant's shop is warded: bolts fizzle just after leaving the mage
    if (!kill && room.type === 'merchant' && b.dist > CFG.merchant.boltFizzle) {
      burst(b.x, b.y, b.z, WARD_COLOR, 5, 1.3, .04); Sfx.at(b.x, b.z).wardTink(); removeBolt(i, false); continue;
    }
    // braziers set it alight, a censer's chain is cut (mechanisms, M3.6)
    if (!kill && !(b.path === 'boomerang' && b.returning)) boltThrough(b);
    // walls, doors and rocks
    const box = !kill && !(b.path === 'boomerang' && b.returning) ? boxAt(b.x, b.z, solids) : undefined;
    if (box) {
      const rock = strikeSolid(room, box, b.x, b.y, b.z, b.status);
      if (!rock.urn && !rock.prop && breaker && !b.spell && room.rocks.includes(rock)) hitRock(room, rock); // Mason's Chisel cracks rocks
      if (b.path === 'bounce' && b.bounces > 0) {
        // reflect on the axis that ran into the box, from the last free position
        const hitX = !!boxAt(b.x, oz, solids), hitZ = !!boxAt(ox, b.z, solids);
        if (hitX || !hitZ) b.vx = -b.vx;
        if (hitZ || !hitX) b.vz = -b.vz;
        b.x = ox; b.z = oz; b.bounces--; b.hit.clear(); Sfx.at(b.x, b.z).splash();
      } else if (b.path === 'boomerang') { b.x = ox; b.z = oz; b.returning = true; b.hit.clear(); }
      else kill = true;
    }
    // enemies: each is hit at most once per pass; piercing and boomerangs carry on
    if (!kill) for (const e of G.enemies) {
      if (e.dead || e.spawn > 0 || e.hidden || b.hit.has(e)) continue;
      const ey = e.flying ? .8 : .5;
      if (Math.hypot(b.x - e.x, b.z - e.z) >= e.r + b.r || Math.abs(b.y - ey) >= 1.4) continue;
      // the Stormglass Pendant: the cantrip strikes a shocked foe harder
      const glass = !b.spell && player.stats.effects.has('stormglass') && (e.status?.shock ?? 0) > 0;
      damageEnemy(e, b.damage * (glass ? CFG.artifacts.stormglass.mul : 1), b.vx / b.speed, b.vz / b.speed, b.spell ? .3 : player.stats.knockback, b.spell ? 'spell' : 'cantrip', schoolOf(b.status));
      if (glass) burst(e.x, .8, e.z, 0xf0e890, 6, 2.2, .03);
      b.hit.add(e);
      if (b.status) inflict(e, b.status);
      if (b.crit) burst(e.x, .7, e.z, CFG.artifacts.crit.color, 8, 2.4, .05);
      // the Cracked Mirror: a cast bolt splits into two halves that fly on either side of it
      if (!b.secondary && player.stats.effects.has('split')) {
        const S = CFG.artifacts.split, base = Math.atan2(b.vz, b.vx);
        for (const sgn of [-1, 1]) {
          const a = base + sgn * S.angle, sx = e.x + Math.cos(a) * (e.r + .2), sz = e.z + Math.sin(a) * (e.r + .2);
          fireSecondary(sx, sz, Math.cos(a), Math.sin(a), { damage: b.damage * S.damageMul, range: S.range, scale: player.stats.boltScale * .7, color: b.color });
        }
        burst(e.x, .6, e.z, 0xc8e0e8, 5, 1.6, .03);
      }
      if (b.path === 'boomerang') continue;
      if (b.pierce > 0) { b.pierce--; continue; }
      kill = true; break;
    }
    // a shrine's curse drawn out as a wisp: inside the circle a bolt strikes it, outside it passes through
    if (!kill && strikeWisp(b) && b.path !== 'boomerang') { if (b.pierce > 0) b.pierce--; else kill = true; }
    // the mage's bolts set off blast glyphs they cross (not the one at the mage's feet as the bolt leaves)
    if (!kill && b.dist > CFG.glyph.boltArm) {
      const gl = glyphNear(b.x, b.z);
      if (gl) { detonateGlyph(gl); if (b.path !== 'boomerang') kill = true; }
    }
    if (b.status?.chill) frostAt(b.x, b.z); // a frost bolt freezes the water it flies over
    b.mesh.position.set(b.x, b.y, b.z); b.mesh.children[2].position.y = -b.y + .015; animateBolt(b.mesh, b.x - ox, b.z - oz, dt);
    if (kill) removeBolt(i);
  }
}

/** The Tome of Whispers: a bolt turns, a little each moment, towards the nearest foe ahead of it. */
function steer(b: Bolt, dt: number) {
  const H = CFG.artifacts.homing;
  let best: Enemy | null = null, bd = H.reach;
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden || b.hit.has(e)) continue;
    const dx = e.x - b.x, dz = e.z - b.z, d = Math.hypot(dx, dz);
    if (d < bd && dx * b.vx + dz * b.vz > 0) { bd = d; best = e; }
  }
  if (!best) return;
  const cur = Math.atan2(b.vz, b.vx), want = Math.atan2(best.z - b.z, best.x - b.x);
  const da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)), a = cur + Math.max(-H.turn * dt, Math.min(H.turn * dt, da));
  b.vx = Math.cos(a) * b.speed; b.vz = Math.sin(a) * b.speed;
}

export function updateShots(dt: number) {
  const room = G.current, solids = blockers(room, 'bolt'), ice = room.barriers ?? [];
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i]; s.x += s.vx * dt; s.z += s.vz * dt; s.mesh.position.set(s.x, s.y, s.z);
    if (s.fire && (s.fireT = (s.fireT ?? 0) - dt) <= 0) { s.fireT = .1; fireAt(s.x, s.z, .2); } // an ember lights what it passes
    let kill = !!boxAt(s.x, s.z, solids);
    if (!kill && boxAt(s.x, s.z, ice)) { kill = true; burst(s.x, s.y, s.z, 0xbfe6ff, 5, 1.4, .04); Sfx.at(s.x, s.z).wardTink(); } // a wall of ice stops foes' shots
    if (!kill && Math.hypot(player.x - s.x, player.z - s.z) < player.r + s.r) { hurtPlayer(1, s.x - s.vx, s.z - s.vz); kill = true; }
    if (kill) { scene.remove(s.mesh); G.shots.splice(i, 1); burst(s.x, s.y, s.z, s.color, 4, 1.2, .05); }
  }
}
