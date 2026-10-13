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
import { vigilHooks } from '../vigil/where';
import { scene } from '../render/renderer';
import { basicMat, blob, glowShared, sphereGeo } from '../render/materials';
import { blockers, boxAt } from '../world/collision';
import { WARD_COLOR, hitRock, strikeUrn } from '../world/rooms';
import { vatStruck } from '../world/laboratory';
import { strikeProp } from '../world/props';
import { boltThrough, sapMul } from '../world/mechanisms';
import { hollowRing } from '../world/secret';
import { strikeWisp } from '../world/shrine';
import { shootDir } from '../input';
import { emberCantrip, unseen } from '../items/potionFx';
import { heroCast } from '../actors/hero';
import { schoolOf } from '../actors/foeData';
import { damageEnemy, hurtPlayer, strikeFrom, strikerKind } from './damage';
import { detonateGlyph, glyphNear } from './glyphs';
import { burst } from './fx';
import { GILT_COLOR, type BoltPath } from '../items/artifactData';
import type { SpellStatus } from '../magic/spellData';
import { RAINBOW, inflict } from '../magic/statusFx';
import { cantripStruck } from '../items/gifts';
import { fireAt, frostAt } from '../world/pools';
import { animateBolt, boltLook, impactFx } from '../magic/spellFx';
import { gainMana } from '../magic/spells';
import { hexDrained } from '../magic/hex';
import { inSteam } from '../magic/steam';
import { MAGIC } from '../magic/status';
import { boltOverGround, hexGround } from '../magic/shapes';
import { actor } from '../actors/acting';
import { takeAfterglow } from '../progression/boonHooks';

const BLESSED = 0xfff0b0; // a blessed cast's gold

interface BoltSpec {
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  range: number;
  scale: number;
  color: number;
  path: BoltPath;
  pierce: number;
  bounces: number;
  secondary: boolean;
  crit?: boolean;
  /** A spell's bolt, with the spell's statuses; `shard` makes it a splinter of ice instead of an orb. */ spell?: boolean;
  status?: Partial<Record<SpellStatus, number>>;
  shard?: boolean;
  /** The Pendulum of Hours: which side the bolt swings out to (1 or -1). */ swing?: number;
}

function makeBolt(s: BoltSpec) {
  const mesh = new THREE.Group();
  const y = 0.6;
  const shadow = blob(0.35 * Math.min(1.4, s.scale));
  shadow.position.y = -y + 0.015;
  // (its look, from spellFx.ts: the core, then its glow and shadow at 1 and 2, then rings, runes or a trail)
  const look = boltLook(s.color, s.scale, !!s.shard);
  mesh.add(look.core, glowShared(s.color, 0.75 * s.scale, 0.9), shadow, ...look.extras);
  mesh.rotation.y = Math.atan2(s.vx, s.vz);
  animateBolt(mesh, 0, 0, 0);
  mesh.position.set(s.x, y, s.z);
  scene.add(mesh);
  const b: Bolt = {
    x: s.x,
    z: s.z,
    y,
    vx: s.vx,
    vz: s.vz,
    speed: Math.hypot(s.vx, s.vz),
    dist: 0,
    range: s.range,
    r: 0.12 * s.scale,
    mesh,
    damage: s.damage,
    color: s.color,
    path: s.path,
    pierce: s.pierce,
    bounces: s.bounces,
    returning: false,
    hit: new Set(),
    secondary: s.secondary,
    crit: s.crit,
    spell: s.spell,
    status: s.status,
    shard: s.shard,
  };
  if (s.path === 'wave') {
    const v = Math.hypot(s.vx, s.vz) || 1;
    b.wave = { ox: s.x, oz: s.z, px: -s.vz / v, pz: s.vx / v };
  }
  if (s.path === 'swing' && s.swing) {
    // the Pendulum of Hours: out to one side, turning evenly to meet the aim again where its range ends
    const out = CFG.artifacts.swing.out * s.swing,
      c = Math.cos(out),
      n = Math.sin(out);
    [b.vx, b.vz] = [b.vx * c - b.vz * n, b.vz * c + b.vx * n];
    b.curve = (-2 * out * b.speed) / Math.max(1, b.range);
  }
  G.bolts.push(b);
  return b;
}

let casts = 0,
  antlerCasts = 0; // for the Frostbitten Ring's every fifth cast, and the Hart's Antler's every sixth
/** The Blood Moon Pendant's hour: at half health or below, bolts fly faster and come quicker (M4.1). */
export const bloodMoon = () => player.stats.effects.has('bloodMoon') && player.hp * 2 <= player.maxHp;
/** Cast the cantrip in the current shooting direction, in the focus's pattern. */
export function spawnBolt() {
  const dir = shootDir();
  if (!dir) return;
  const st = player.stats,
    p = st.pattern,
    A = CFG.artifacts;
  const px = -dir.z,
    pz = dir.x; // sideways
  const ix = player.vx * CFG.hero.shotInherit,
    iz = player.vz * CFG.hero.shotInherit;
  // one bolt alternates between two "eyes"; several bolts fly side by side, or fan out
  player.eye *= -1;
  const slots = p.count === 1 ? [0] : Array.from({ length: p.count }, (_, i) => i - (p.count - 1) / 2);
  // Raven's Eye: now and then the whole cast strikes thrice as hard, bigger and white-hot
  const crit = st.effects.has('crit') && Math.random() < A.crit.chance;
  // the Emberwood Wand (or Liquid Ember, drunk: M5) sets foes burning; the Frostbitten Ring chills with every fifth cast
  const frost = st.effects.has('frostbite') && ++casts % A.frostbite.every === 0;
  // a chapel's blessing: the next few casts strike harder, in gold
  const blessed = player.blessed > 0;
  if (blessed) player.blessed--;
  // M4.1: the Hart's Antler makes every sixth cast a lance of light; the Twin Vigil Candles steady a still hand; the Blood
  // Moon Pendant quickens a hurt one
  const lance = st.effects.has('antler') && ++antlerCasts % A.antler.every === 0;
  const steady = st.effects.has('stillCandles') && player.still >= A.still.after,
    moon = bloodMoon();
  const glow = takeAfterglow(); // (M6, Afterglow: the last spell's light still in the hand, its statuses carried in part)
  const statusOf = {
    ...glow?.status,
    ...(st.effects.has('emberBolts') || emberCantrip() ? { burn: A.emberwood.burn } : {}),
    ...(frost ? { chill: A.frostbite.chill } : {}),
    ...(lance ? { sanct: A.antler.sanct } : {}),
  };
  const status = Object.keys(statusOf).length ? statusOf : undefined;
  const dmgMul = (steady ? A.candles.damageMul : 1) * (lance ? A.antler.damageMul : 1) * sapMul(),
    speedMul = moon ? A.bloodMoon.shotSpeedMul : 1;
  for (const k of slots) {
    const a = k * p.fan,
      c = Math.cos(a),
      s = Math.sin(a);
    const dx = dir.x * c - dir.z * s,
      dz = dir.z * c + dir.x * s,
      off = p.count === 1 ? 0.1 * player.eye : p.fan ? 0 : k * p.spread;
    makeBolt({
      x: player.x + dx * 0.3 + px * off,
      z: player.z + dz * 0.3 + pz * off,
      vx: dx * st.shotSpeed * speedMul + ix,
      vz: dz * st.shotSpeed * speedMul + iz,
      damage: st.damage * (crit ? A.crit.damageMul : 1) * (blessed ? CFG.mech.blessMul : 1) * dmgMul,
      range: st.range,
      scale:
        st.boltScale * (crit ? A.crit.scale : 1) * (blessed ? CFG.mech.blessScale : 1) * (lance ? A.antler.scale : 1),
      color: crit
        ? A.crit.color
        : lance
          ? A.antler.color
          : glow
            ? glow.color
            : frost
              ? A.frostbite.color
              : blessed
                ? BLESSED
                : moon
                  ? A.bloodMoon.color
                  : st.boltColor,
      path: p.path,
      pierce: st.pierce + (lance ? 99 : 0),
      bounces: p.bounces,
      secondary: false,
      crit,
      status,
      swing: player.eye,
    });
  }
  // the Miser's Purse: gold glints off the cast, more of them the more obols are hoarded
  if (st.gilt > 0)
    burst(player.x + dir.x * 0.45, 0.75, player.z + dir.z * 0.45, GILT_COLOR, 1 + Math.round(st.gilt * 4), 1.4, 0.03);
  if (lance) {
    burst(player.x + dir.x * 0.5, 0.8, player.z + dir.z * 0.5, A.antler.color, 8, 2, 0.04);
    Sfx.antlerLance();
  }
  player.squash = 1;
  heroCast();
  Sfx.shoot();
  if (crit) Sfx.crit();
}

/** A ring of small burst bolts (Saint's Knucklebone on a death, Mourning Bell when hit). */
export function spawnBurst(x: number, z: number, count: number, offsetAngle = 0) {
  const B = CFG.artifacts.burst,
    st = player.stats;
  for (let i = 0; i < count; i++) {
    const a = offsetAngle + (i / count) * Math.PI * 2;
    makeBolt({
      x: x + Math.cos(a) * 0.3,
      z: z + Math.sin(a) * 0.3,
      vx: Math.cos(a) * B.speed,
      vz: Math.sin(a) * B.speed,
      damage: st.damage * B.damageMul,
      range: B.range,
      scale: B.scale,
      color: st.boltColor,
      path: 'straight',
      pierce: 0,
      bounces: 0,
      secondary: true,
    });
  }
}

/** A single lesser bolt from (x, z) along (dx, dz): the Cracked Mirror's halves, the Candle Moth's sting. */
export function fireSecondary(
  x: number,
  z: number,
  dx: number,
  dz: number,
  o: { damage: number; range: number; scale: number; color: number; speed?: number },
) {
  const l = Math.hypot(dx, dz) || 1,
    v = o.speed ?? player.stats.shotSpeed;
  return makeBolt({
    x,
    z,
    vx: (dx / l) * v,
    vz: (dz / l) * v,
    damage: o.damage,
    range: o.range,
    scale: o.scale,
    color: o.color,
    path: 'straight',
    pierce: 0,
    bounces: 0,
    secondary: true,
  });
}

/** A spell's bolt from (x, z) along (dx, dz): Rime Shards' splinters, Shatter's shards. It strikes as a spell
    (no mana back for the kill) and puts the spell's statuses on what it hits. */
export function fireSpellBolt(
  x: number,
  z: number,
  dx: number,
  dz: number,
  o: {
    damage: number;
    range: number;
    speed: number;
    color: number;
    scale?: number;
    status?: Partial<Record<SpellStatus, number>>;
    shard?: boolean;
    shatter?: boolean;
    seek?: boolean;
  },
) {
  const l = Math.hypot(dx, dz) || 1;
  makeBolt({
    x,
    z,
    vx: (dx / l) * o.speed,
    vz: (dz / l) * o.speed,
    damage: o.damage,
    range: o.range,
    scale: o.scale ?? 0.8,
    color: o.color,
    path: o.seek ? 'homing' : 'straight' /* (M6: Seeking's bolts turn as the Tome's do) */,
    pierce: 0,
    bounces: 0,
    secondary: true,
    spell: true,
    status: o.status,
    shard: o.shard,
  });
  if (o.shatter) G.bolts[G.bolts.length - 1].shatter = true; // (M4.10: fire catches these as molten glass)
}

/** Enemy projectile. */
export function spawnShot(
  x: number,
  z: number,
  dx: number,
  dz: number,
  speed: number,
  color: number,
  y = 0.55,
  size = 1,
  o: { fire?: boolean; chill?: number; hex?: number } = {},
) {
  const m = actor()?.mantle; // (M4.7: a Rimebound champion's shots chill, a Hexbound one's drink mana)
  if (m === 'rimebound') o = { ...o, chill: Math.max(o.chill ?? 0, MAGIC.mantles.rimebound.chill) };
  else if (m === 'hexbound') o = { ...o, hex: Math.max(o.hex ?? 0, MAGIC.mantles.hexbound.hex) };
  if (inSteam(x, z) || unseen()) {
    const a = (Math.random() - 0.5) * 2 * MAGIC.reactions.steam.spread,
      c = Math.cos(a),
      n = Math.sin(a);
    [dx, dz] = [dx * c - dz * n, dz * c + dx * n];
  } // (thrown out of steam, or at a mage unseen under the Shadowstep Tincture: M5, it can't be aimed)
  const mesh = new THREE.Group();
  const sh = blob(0.4);
  sh.position.y = -y + 0.015;
  mesh.add(new THREE.Mesh(sphereGeo(0.13 * size), basicMat(color)), glowShared(color, 0.9 * size, 0.9), sh);
  scene.add(mesh);
  G.shots.push({
    x,
    z,
    y,
    vx: dx * speed,
    vz: dz * speed,
    r: 0.14 * size,
    color,
    mesh,
    fire: o.fire,
    fireT: 0,
    chill: o.chill,
    hex: o.hex,
    from: actor(),
  });
}

export function clearProjectiles() {
  for (const b of G.bolts) scene.remove(b.mesh);
  G.bolts.length = 0;
  for (const s of G.shots) scene.remove(s.mesh);
  G.shots.length = 0;
}

/** Something of the mage's (a bolt, a beam) reaches a wall, door or rock at (x, y, z): a vault's ward glances it off,
    a cracked wall rings hollow, an urn breaks. Returns the box as a rock, to check for more. */
export function strikeSolid(
  room: Room,
  box: Box,
  x: number,
  y: number,
  z: number,
  status?: Partial<Record<SpellStatus, number>>,
) {
  const door = room.doors.find((d) => d.box === box);
  if (door?.seal?.sealed) {
    burst(x, y, z, WARD_COLOR, 5, 1.6, 0.035);
    Sfx.at(x, z).wardTink();
  } // glances off a vault's ward
  if (door?.secret) hollowRing(door, x, z); // a cracked wall rings hollow
  const rock = box as RockBox;
  if (rock.urn)
    strikeUrn(room, rock, false); // any bolt breaks an urn
  else if (rock.prop)
    strikeProp(room, rock, false, status); // piles break, bells ring, runes charge
  else if (room.lab && !door)
    vatStruck(room, x, z); // (M5: the jelly serpent's vat window cracks)
  else if (rock.bar)
    vigilHooks.barStruck(rock, x, z, status); // (M7 step 5: a way barred at the Vigil stirs)
  else if (rock.shade) vigilHooks.shadeStruck(x, z, schoolOf(status)); // (M7 step 6: a chained shade's chains)
  return rock;
}

function removeBolt(i: number, fizzle = true) {
  const b = G.bolts[i];
  scene.remove(b.mesh);
  G.bolts.splice(i, 1);
  if (fizzle) {
    burst(b.x, Math.max(0.1, b.y), b.z, b.color, b.secondary ? 3 : 5, 1.6, 0.05);
    impactFx(b.x, Math.max(0.15, b.y), b.z, b.color, b.secondary ? 0.7 : 1);
    Sfx.at(b.x, b.z).splash();
  }
}

export function updateBolts(dt: number) {
  const room = G.current,
    solids = blockers(room, 'bolt');
  const breaker = player.stats.effects.has('rockBreaker');
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    const b = G.bolts[i];
    if (b.path === 'boomerang' && b.returning) {
      // fly home to the mage, through everything
      const dx = player.x - b.x,
        dz = player.z - b.z,
        d = Math.hypot(dx, dz);
      if (d < 0.45) {
        removeBolt(i, false);
        continue;
      } // caught
      b.vx = (dx / d) * b.speed;
      b.vz = (dz / d) * b.speed;
    }
    if (b.path === 'homing') steer(b, dt);
    if (b.curve && b.star === undefined) {
      const a = b.curve * dt,
        c = Math.cos(a),
        n = Math.sin(a);
      [b.vx, b.vz] = [b.vx * c - b.vz * n, b.vz * c + b.vx * n];
    } // (the Pendulum's swing)
    const ox = b.x,
      oz = b.z;
    b.dist += b.speed * dt;
    if (b.wave) {
      // the Serpent Rod: along a straight line, swinging from side to side
      const W = CFG.artifacts.wave,
        w = b.wave;
      w.ox += b.vx * dt;
      w.oz += b.vz * dt;
      const off = Math.sin(b.dist * W.freq) * W.amp * Math.min(1, b.dist * 2);
      b.x = w.ox + w.px * off;
      b.z = w.oz + w.pz * off;
    } else {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
    }
    let kill = false;
    if (b.path === 'boomerang') {
      b.y = 0.6;
      if (!b.returning && b.dist >= b.range) {
        b.returning = true;
        b.hit.clear();
      }
      if (b.dist > b.range * 4) kill = true; // safety: never fly forever
    } else if (b.star !== undefined) {
      // a Lodestar Wand's star, hanging where its range ran out, twinkling
      b.star -= dt;
      b.y = 0.6;
      kill = b.star <= 0;
      b.mesh.scale.setScalar(1 + Math.sin(b.star * CFG.artifacts.lodestar.pulse) * 0.25);
    } else if (!b.spell && !b.secondary && player.stats.effects.has('lodestar')) {
      // the Lodestar Wand: no fall; at its range's end it stops
      b.y = 0.6;
      if (b.dist >= b.range) {
        b.star = CFG.artifacts.lodestar.hang;
        b.vx = b.vz = 0;
        b.curve = 0;
        burst(b.x, b.y, b.z, b.color, 4, 1, 0.03);
      }
    } else {
      // straight, bounce and wave: drop to the floor over the last 30% of the range
      const R = b.range,
        fall = b.dist > R * 0.7 ? (b.dist - R * 0.7) / (R * 0.3) : 0;
      b.y = 0.6 * (1 - fall * fall);
      kill = b.dist >= R || b.y <= 0.05;
    }
    // the merchant's shop is warded: bolts fizzle just after leaving the mage
    if (!kill && room.type === 'merchant' && b.dist > CFG.merchant.boltFizzle) {
      burst(b.x, b.y, b.z, WARD_COLOR, 5, 1.3, 0.04);
      Sfx.at(b.x, b.z).wardTink();
      removeBolt(i, false);
      continue;
    }
    // braziers set it alight, a censer's chain is cut (mechanisms, M3.6)
    if (!kill && !(b.path === 'boomerang' && b.returning)) boltThrough(b);
    // walls, doors and rocks
    const box = !kill && !(b.path === 'boomerang' && b.returning) ? boxAt(b.x, b.z, solids) : undefined;
    if (box) {
      const rock = strikeSolid(room, box, b.x, b.y, b.z, b.status); // (every status: a statue hears a hex, an obelisk its ward's school)
      if (!rock.urn && !rock.prop && breaker && !b.spell && room.rocks.includes(rock)) hitRock(room, rock); // Mason's Chisel cracks rocks
      if (b.path === 'bounce' && b.bounces > 0) {
        // reflect on the axis that ran into the box, from the last free position
        const hitX = !!boxAt(b.x, oz, solids),
          hitZ = !!boxAt(ox, b.z, solids);
        if (hitX || !hitZ) b.vx = -b.vx;
        if (hitZ || !hitX) b.vz = -b.vz;
        b.x = ox;
        b.z = oz;
        b.bounces--;
        b.hit.clear();
        Sfx.at(b.x, b.z).splash();
      } else if (b.path === 'boomerang') {
        b.x = ox;
        b.z = oz;
        b.returning = true;
        b.hit.clear();
      } else if (!b.echoed && !b.spell && player.stats.effects.has('echo')) {
        // the Echo Stone: back the way it came, once, a little fainter
        const E = CFG.artifacts.echo;
        b.echoed = true;
        b.x = ox;
        b.z = oz;
        b.vx = -b.vx;
        b.vz = -b.vz;
        b.range = Math.max(E.least, b.dist);
        b.dist = 0;
        b.damage *= E.damageMul;
        b.hit.clear();
        if (b.wave) {
          b.wave.ox = b.x;
          b.wave.oz = b.z;
        }
        burst(b.x, b.y, b.z, b.color, 5, 1.4, 0.03);
        Sfx.at(b.x, b.z).echo();
      } else kill = true;
    }
    // enemies: each is hit at most once per pass; piercing and boomerangs carry on
    if (!kill)
      for (const e of G.enemies) {
        if (e.dead || e.spawn > 0 || e.hidden || b.hit.has(e)) continue;
        const ey = e.flying ? 0.8 : 0.5;
        if (Math.hypot(b.x - e.x, b.z - e.z) >= e.r + b.r || Math.abs(b.y - ey) >= 1.4) continue;
        // the Stormglass Pendant: the cantrip strikes a shocked foe harder
        const glass = !b.spell && player.stats.effects.has('stormglass') && (e.status?.shock ?? 0) > 0;
        const prism = !b.spell && !b.secondary && (e.status?.prism ?? 0) > 0; // (M4.8: a foe frozen in holy light, before the blow cracks it)
        damageEnemy(
          e,
          b.damage * (glass ? CFG.artifacts.stormglass.mul : 1),
          b.vx / b.speed,
          b.vz / b.speed,
          b.spell ? 0.3 : player.stats.knockback,
          b.spell ? 'spell' : 'cantrip',
          schoolOf(b.status),
        );
        if (glass) burst(e.x, 0.8, e.z, 0xf0e890, 6, 2.2, 0.03);
        b.hit.add(e);
        if (!b.spell && !b.secondary) cantripStruck(e, e.x, e.z, b.damage); // (M4.6: the transformations' gifts)
        if (b.status) inflict(e, b.status, 'mage');
        if (!b.spell && !e.haloed && !e.dead && player.stats.effects.has('halo')) {
          e.haloed = true;
          inflict(e, { sanct: CFG.artifacts.halo.sanct });
        } // the Gilded Halo: the first bolt sanctifies
        if (b.crit) burst(e.x, 0.7, e.z, CFG.artifacts.crit.color, 8, 2.4, 0.05);
        // the Cracked Mirror: a cast bolt splits into two halves that fly on either side of it
        if (!b.secondary && player.stats.effects.has('split')) {
          const S = CFG.artifacts.split,
            base = Math.atan2(b.vz, b.vx);
          for (const sgn of [-1, 1]) {
            const a = base + sgn * S.angle,
              sx = e.x + Math.cos(a) * (e.r + 0.2),
              sz = e.z + Math.sin(a) * (e.r + 0.2);
            fireSecondary(sx, sz, Math.cos(a), Math.sin(a), {
              damage: b.damage * S.damageMul,
              range: S.range,
              scale: player.stats.boltScale * 0.7,
              color: b.color,
            }).hit.add(e); // (not the foe it split from, knocked into them)
          }
          burst(e.x, 0.6, e.z, 0xc8e0e8, 5, 1.6, 0.03);
        }
        // a Prism (M4.8, Frost and Hallow) breaks the cantrip into three, one each way and one on, in the colours of the rainbow
        if (prism) {
          const P = MAGIC.reactions.prism,
            base = Math.atan2(b.vz, b.vx);
          [-P.angle, 0, P.angle].forEach((d, i) => {
            const a = base + d,
              sx = e.x + Math.cos(a) * (e.r + 0.2),
              sz = e.z + Math.sin(a) * (e.r + 0.2);
            fireSecondary(sx, sz, Math.cos(a), Math.sin(a), {
              damage: b.damage * P.damageMul,
              range: P.range,
              scale: player.stats.boltScale * 0.75,
              color: RAINBOW[i * 2],
            }).hit.add(e);
          });
          burst(e.x, 0.8, e.z, 0xffffff, 6, 1.8, 0.03);
          Sfx.at(e.x, e.z).prism();
        }
        if (b.path === 'boomerang') continue;
        if (b.pierce > 0) {
          b.pierce--;
          continue;
        }
        kill = true;
        break;
      }
    // a shrine's curse drawn out as a wisp: inside the circle a bolt strikes it, outside it passes through
    if (!kill && strikeWisp(b) && b.path !== 'boomerang') {
      if (b.pierce > 0) b.pierce--;
      else kill = true;
    }
    // the mage's bolts set off blast glyphs they cross (not the one at the mage's feet as the bolt leaves)
    if (!kill && b.dist > CFG.glyph.boltArm) {
      const gl = glyphNear(b.x, b.z);
      if (gl) {
        detonateGlyph(gl);
        if (b.path !== 'boomerang') kill = true;
      }
    }
    if (b.status?.chill) frostAt(b.x, b.z); // a frost bolt freezes the water it flies over
    if (b.status?.hex) hexGround(b.x, b.z); // a hexing bolt over Consecrate's holy ground darkens it (M4.8)
    if (b.spell) boltOverGround(b); // (M4.10: a Hex Bolt across a seal, shards across holy ground or into fire)
    b.mesh.position.set(b.x, b.y, b.z);
    b.mesh.children[2].position.y = -b.y + 0.015;
    animateBolt(b.mesh, b.x - ox, b.z - oz, dt);
    if (kill) removeBolt(i);
  }
}

/** The Tome of Whispers: a bolt turns, a little each moment, towards the nearest foe ahead of it. */
function steer(b: Bolt, dt: number) {
  const H = CFG.artifacts.homing;
  let best: Enemy | null = null,
    bd = H.reach;
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden || b.hit.has(e)) continue;
    const dx = e.x - b.x,
      dz = e.z - b.z,
      d = Math.hypot(dx, dz);
    if (d < bd && dx * b.vx + dz * b.vz > 0) {
      bd = d;
      best = e;
    }
  }
  if (!best) return;
  const cur = Math.atan2(b.vz, b.vx),
    want = Math.atan2(best.z - b.z, best.x - b.x);
  const da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)),
    a = cur + Math.max(-H.turn * dt, Math.min(H.turn * dt, da));
  b.vx = Math.cos(a) * b.speed;
  b.vz = Math.sin(a) * b.speed;
}

export function updateShots(dt: number) {
  const room = G.current,
    solids = blockers(room, 'bolt'),
    ice = room.barriers ?? [];
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    s.mesh.position.set(s.x, s.y, s.z);
    if ((s.fire || s.chill) && (s.fireT = (s.fireT ?? 0) - dt) <= 0) {
      const A = CFG.afflict;
      s.fireT = A.touchEvery;
      if (s.fire) fireAt(s.x, s.z, A.emberReach);
      else frostAt(s.x, s.z, A.coldReach);
    } // an ember lights what it passes, cold freezes it
    let kill = !!boxAt(s.x, s.z, solids);
    if (!kill && boxAt(s.x, s.z, ice)) {
      kill = true;
      burst(s.x, s.y, s.z, 0xbfe6ff, 5, 1.4, 0.04);
      Sfx.at(s.x, s.z).wardTink();
    } // a wall of ice stops foes' shots
    if (!kill && Math.hypot(player.x - s.x, player.z - s.z) < player.r + s.r) {
      strikeFrom(strikerKind(s.from));
      if (hurtPlayer(1, s.x - s.vx, s.z - s.vz)) {
        if (s.chill) player.chill = Math.max(player.chill, s.chill);
        if (s.hex) {
          const took = Math.min(player.mana, s.hex);
          gainMana(-s.hex);
          hexDrained(took, s.from);
          burst(player.x, 0.9, player.z, 0x8a5acf, 10, 1.8, 0.04);
        }
      }
      kill = true;
    } // (a blow the mage shrugs off brings no cold nor hex)
    if (kill) {
      scene.remove(s.mesh);
      G.shots.splice(i, 1);
      burst(s.x, s.y, s.z, s.color, 4, 1.2, 0.05);
    }
  }
}
