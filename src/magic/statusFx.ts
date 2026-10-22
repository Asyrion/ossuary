/* Status effects on foes, in the game: applying them (the rules are in magic/status.ts), how each shows on any
   foe (flames licking up from a burning one, a blue tint deepening with each chill stack, a block of ice around
   a frozen one, sparks crackling on a shocked one), the burn's damage, the shock's leap to a neighbour, and the
   two reactions: Shatter bursts a frozen foe into ice shards that fly at its neighbours, Overload blows a
   burning foe apart and throws everything near it back. Hallow's and Umbral's: a sanctified foe glows gold,
   a hexed one violet, a rooted one is held by the shadow at its feet; Eclipse hangs a black sun over a foe it takes out
   of the fight and strikes it when it comes back, Blackfire burns violet and never goes out. Reactions name themselves
   in the air, so players learn them. The training dummy (dev menu) shows its statuses and every hit it takes.
   The full wheel: Searing cracks a foe gold (its guard burnt away, a War-Tiger's plate knocked off), a Prism glints
   every colour while it stays frozen (statusTint; projectiles.ts splits the bolts that strike it), Verdict strikes every
   sanctified foe in the room from above, Black Ice is laid under the foe (actors/bestiaryGround.ts), Void Spark leaps to
   the foes near, carrying a hex. Verdant: an overgrown foe is wound in green vines (leaves drift off it) and flowers
   when it falls (`flowerFell`: half a heart for the mage, once a room); its five reactions: Wildfire runs the burn along
   the vines to every overgrown foe, Frostbloom opens ice flowers that shatter a moment later, Pollen Spark leaves a cloud
   of pollen that shocks the foes inside it (`pollenClouds`), Bloom makes the foe a lily that mends the mage as it falls,
   and Blight rots the vines to thorns that hex it and creep to the nearest other foe. */
import * as THREE from 'three';
import type { Enemy } from '../types';
import { CFG } from '../config';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { renderHearts } from '../notify';
import { TILT, scene } from '../render/renderer';
import { disposeTree, glow, markShared } from '../render/materials';
import { floorShade } from '../render/pixelLook';
import { burst } from '../combat/fx';
import { damageEnemy, drink } from '../combat/damage';
import { drinksStatus } from '../actors/foeData';
import { fireSpellBolt } from '../combat/projectiles';
import { MAGIC, applyStatus, consumeShock, newStatus, tickStatus, type Reaction, type StatusState } from './status';
import { STATUS_KINDS, type SpellStatus, type StatusKind } from './spellData';
import { SCHOOL_LIGHT } from '../render/arcane';
import { poolAt, touchPools } from '../world/pools';
import { paleFx } from '../world/paleFx';
import { ringFx, strikeFx } from './spellFx';
import { breakPlate } from '../actors/bosses';
import { foeAfflicted, laySpark } from '../actors/foes';
import { chargeSteam, steamAt } from './steam';
import { weaveAt } from './weaveFx';
import { layGround } from '../actors/bestiaryGround';
import { foundReaction } from './memory';
import { mantleImmune, stripsMantle } from '../actors/mantleData';
import { shrugOff, unbind } from '../actors/mantles';
import { hexGround } from './shapes';
import { boonActs, boonParam, boonRank, boonStatusMul, magicNow } from '../progression/boonHooks';

const R = MAGIC.reactions;
const ICE = 0xbfe6ff,
  FIRE = 0xff7a2a,
  SPARK = 0xf0e890,
  GOLD = SCHOOL_LIGHT.hallow,
  VIOLET = SCHOOL_LIGHT.umbral,
  BLACKFIRE = 0x8a3ae0,
  STEAM = 0xe8f2f8,
  SEAR = 0xffb24a,
  BLACKICE = 0x5a3a9a;
const LEAF = SCHOOL_LIGHT.verdant,
  VINE = 0x3a7a2a,
  PETAL = 0xf8c8e0,
  POLLEN = 0xe8e070,
  THORN = 0x5a3a4a;
export const RAINBOW = [0xff6a6a, 0xffc06a, 0xf0f07a, 0x7ae88a, 0x7ac8ff, 0xb08aff];
/** Each reaction's colour, for its rising name. */
const REACT_COLOR: Record<Reaction, number> = {
  shatter: ICE,
  overload: 0xffc060,
  eclipse: 0xd8b0ff,
  blackfire: 0xb070ff,
  steam: STEAM,
  searing: SEAR,
  prism: 0xe8f8ff,
  verdict: 0xfff0a0,
  blackice: 0xb8a0ff,
  voidspark: 0xc890ff,
  wildfire: 0xffa040,
  frostbloom: 0xd8f4ff,
  pollenspark: POLLEN,
  bloom: PETAL,
  blight: 0xb890c8,
};

/** Apply a spell's statuses to a foe, and carry out what they set off. `from`: `'mage'` when the mage's own
    magic brings them (Spark Wake hears its stuns), `'snap'` for a thawing foe's breath (Cold Snap). The boons taken
    lengthen some (Banked Coals, Perennial, Laid Bare) and tune the rest (Deep Winter, Gathering Dark: `magicNow`). */
export function inflict(e: Enemy, status: Partial<Record<SpellStatus, number>> | undefined, from?: 'mage' | 'snap') {
  if (!status || e.dead || e.ward) return; // (a drinking ward keeps statuses off the foe inside it)
  for (const [kind, amount] of Object.entries(status) as [SpellStatus, number][]) {
    if (e.dead) return;
    if (e.mantle) {
      // (a champion's mantle keeps its own school's status off, and the school that strips it unbinds it)
      if (mantleImmune(e.mantle, kind)) {
        shrugOff(e);
        continue;
      }
      if (stripsMantle(e.mantle, kind)) unbind(e);
    }
    if (kind === 'shock' && e.plates && (e.status?.chill ?? 0) >= MAGIC.chill.bossMaxStacks) {
      e.status!.chill = 0;
      react(e, 'shatter');
      breakPlate(e);
      continue;
    } // (a shock on the War-Tiger's rimed plates shatters one)
    if (drinksStatus(e.foe, kind)) {
      // (an elemental drinks its own school's status; the ground under it still hears it)
      drink(e, amount * CFG.bestiary.statusHeal);
      foeAfflicted(e, kind);
      if ((STATUS_KINDS as string[]).includes(kind)) touchPools(e, kind as StatusKind);
      continue;
    }
    const garden = kind === 'grow' && G.room.current?.theme?.twist === 'garden';
    if (garden) gardenHolds(e); // (the garden grows; its vines hold longer)
    const st = (e.status ??= newStatus()),
      stacks = st.chill + amount,
      T = magicNow();
    const res = applyStatus(
      st,
      kind,
      amount * boonStatusMul(kind) * (garden ? CFG.themes.gardenGrow : 1),
      !!e.isBoss,
      T,
    );
    if (res.froze) {
      Sfx.at(e.x, e.z).freeze();
      burst(e.x, 0.6, e.z, ICE, 12, 1.6, 0.05);
      e.snapped = from === 'snap';
      if (kind === 'chill' && (stacks < MAGIC.chill.freezeAt || T.chill.freezeTime > MAGIC.chill.freezeTime))
        boonActs('deepWinter', e.x, e.z); // (frozen sooner, or longer, than it would have been)
    }
    if (res.stunned) {
      burst(e.x, 0.9, e.z, SPARK, 6, 2, 0.03);
      if (from === 'mage' && boonRank('sparkWake')) sparkWake(e);
    }
    if (kind === 'burn' && st.burn > 0 && boonRank('bankedCoals')) boonActs('bankedCoals', e.x, e.z); // (it burns longer)
    if (kind === 'hex' && st.hex > MAGIC.hex.max) boonActs('gatheringDark', e.x, e.z); // (deeper than a hex can gather without it)
    if (res.reaction) react(e, res.reaction);
    foeAfflicted(e, kind); // (what its behaviour does about it)
    if ((STATUS_KINDS as string[]).includes(kind)) touchPools(e, kind as StatusKind); // oil catches fire, water freezes or carries the shock
    if (kind === 'shock' || kind === 'sanct' || kind === 'hex')
      chargeSteam(e.x, e.z, kind === 'shock' ? 'storm' : kind === 'sanct' ? 'hallow' : 'umbral'); // (a school landing in steam charges it)
    if (kind === 'shock')
      for (const o of G.room.enemies)
        if (
          o !== e &&
          !o.dead &&
          !o.corona &&
          (o.status?.eclipse ?? 0) > 0 &&
          Math.hypot(o.x - e.x, o.z - e.z) < MAGIC.weaves.corona.reach
        ) {
          // (Corona)
          o.corona = true;
          sparkLine(e, o);
          weaveAt('corona', o.x, o.z);
        }
    if (kind === 'hex') {
      burst(e.x, 0.8, e.z, VIOLET, 4, 1.2, 0.03);
      if (!e.flying) hexGround(e.x, e.z);
    } else if (kind === 'sanct') burst(e.x, 0.8, e.z, GOLD, 4, 1.2, 0.03);
  }
}

/** A hit landed on a shocked foe: the mark leaps to the nearest other foe with part of the hit (Forking Arc, to the
    two or three nearest, each with that part; the list made first, as each blow may move or fell them). */
export function shockLeap(e: Enemy, dmg: number) {
  if (!consumeShock(e.status)) return;
  const R = MAGIC.shock.leapRange,
    near = G.room.enemies
      .filter((o) => o !== e && !o.dead && o.spawn <= 0 && !o.hidden && Math.hypot(o.x - e.x, o.z - e.z) < R)
      .sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))
      .slice(0, Math.max(1, boonParam('forkingArc', 'leaps')));
  for (const o of near) {
    if (o.dead) continue;
    const d = Math.hypot(o.x - e.x, o.z - e.z) || 1;
    sparkLine(e, o);
    damageEnemy(o, dmg * MAGIC.shock.leapShare, (o.x - e.x) / d, (o.z - e.z) / d, 0.3, 'spell', 'storm');
  }
  if (near.length > 1) boonActs('forkingArc', near[1].x, near[1].z);
}

function react(e: Enemy, r: Reaction) {
  floatText(e.x, 1.7, e.z, STR.reactions[r], REACT_COLOR[r], foundReaction(r) ? 52 : 44); // (bigger the first time ever, for the codex)
  if (r === 'searing') {
    // holy fire: its guard burns away a while (damageEnemy reads `seared`), a War-Tiger loses a plate
    burst(e.x, 0.8, e.z, SEAR, 18, 2.4, 0.05);
    burst(e.x, 1, e.z, GOLD, 10, 1.6, 0.04);
    ringFx(e.x, 0.8, e.z, SEAR, 0.2, 1.1, CFG.spellFx.flash);
    if (e.plates) breakPlate(e);
    Sfx.at(e.x, e.z).searing();
    damageEnemy(e, R.searing.damage, 0, 0, 0, 'spell', 'hallow');
    return;
  }
  if (r === 'prism') {
    burst(e.x, 0.8, e.z, 0xffffff, 10, 1.8, 0.04);
    for (const c of RAINBOW) burst(e.x, 0.9, e.z, c, 3, 2.2, 0.03);
    Sfx.at(e.x, e.z).prism();
    return;
  }
  if (r === 'verdict') {
    // lightning from above on every sanctified foe in the room, and on this one
    const V = R.verdict;
    for (const o of [
      e,
      ...G.room.enemies.filter((o) => o !== e && !o.dead && !o.hidden && (o.status?.sanct ?? 0) > 0),
    ]) {
      strikeFx({ x: o.x, y: 4.5, z: o.z }, { x: o.x, y: 0.1, z: o.z }, 0xfff0a0, CFG.spellFx.strike);
      flash(o.x, o.z, 0xfff0a0, 0.6);
      for (let y = 0.4; y < 4.4; y += 0.5) burst(o.x, y, o.z, y < 2 ? 0xfff0a0 : GOLD, 1, 0.35, 0.05); // (a pillar of light down to it, reading at any scale)
      burst(o.x, 0.3, o.z, GOLD, 12, 2.4, 0.05);
      ringFx(o.x, 0.05, o.z, SPARK, 0.2, 1, CFG.spellFx.shockwave, true);
      const st = (o.status ??= newStatus());
      st.sanct = 0;
      if (!o.isBoss) st.stun = Math.max(st.stun, V.stun); // (its holy light spent: one Verdict each; a boss isn't stunned)
      damageEnemy(o, V.damage, 0, 0, 0, 'spell', 'storm');
    }
    Sfx.at(e.x, e.z).verdict();
    G.fx.shake = Math.max(G.fx.shake, 0.25);
    return;
  }
  if (r === 'blackice') {
    // black ice under it: foes on it slide and can't stop (the mage crosses it as stone)
    layGround(G.room.current, 'blackice', e.x, e.z, R.blackice.size, R.blackice.time, '');
    burst(e.x, 0.2, e.z, BLACKICE, 16, 2, 0.05);
    burst(e.x, 0.3, e.z, ICE, 8, 1.6, 0.04);
    Sfx.at(e.x, e.z).blackice();
    return;
  }
  if (r === 'voidspark') {
    // the spark leaps to the foes near, each carrying a hex; each marked, and falling, gives mana
    const VS = R.voidspark,
      near = G.room.enemies
        .filter((o) => o !== e && !o.dead && !o.hidden && o.spawn <= 0 && Math.hypot(o.x - e.x, o.z - e.z) < VS.range)
        .sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))
        .slice(0, VS.leaps);
    let from = e;
    for (const o of near) {
      strikeFx({ x: from.x, y: 0.8, z: from.z }, { x: o.x, y: 0.8, z: o.z }, VIOLET, CFG.spellFx.chain, true);
      damageEnemy(o, VS.damage, 0, 0, 0, 'spell', 'storm');
      burst(o.x, 0.8, o.z, VIOLET, 6, 1.6, 0.04); // (struck first, so the blow doesn't spend the hex it carries)
      if (o.dead) continue;
      const st = (o.status ??= newStatus()),
        T = magicNow();
      st.hex = Math.min(T.hex.max, st.hex + 1);
      st.hexT = T.hex.time;
      st.voidT = Math.max(st.voidT, VS.time); // (a hex carried, laid straight on: no reaction of its own)
      from = o;
    }
    burst(e.x, 0.8, e.z, VIOLET, 14, 2.2, 0.05);
    burst(e.x, 0.8, e.z, SPARK, 8, 2, 0.04);
    Sfx.at(e.x, e.z).voidspark();
    return;
  }
  if (r === 'eclipse') {
    // taken out of the fight under a black sun (a boss only struck, at once)
    burst(e.x, 0.9, e.z, VIOLET, 18, 2.6, 0.05);
    burst(e.x, 0.9, e.z, GOLD, 12, 2.2, 0.04);
    ringFx(e.x, 0.9, e.z, GOLD, 0.2, 1.3, CFG.spellFx.flash);
    Sfx.at(e.x, e.z).eclipse();
    if (e.isBoss) {
      damageEnemy(e, R.eclipse.damage, 0, 0, 0, 'spell');
      return;
    }
    e.hidden = true;
    e.body.visible = false;
    e.sun = blackSun();
    e.sun.position.set(0, e.flying ? 0.95 : 0.75, 0);
    e.group.add(e.sun);
    return;
  }
  if (r === 'blackfire') {
    burst(e.x, 0.7, e.z, BLACKFIRE, 18, 2.4, 0.05);
    Sfx.at(e.x, e.z).blackfire();
    return;
  }
  if (verdantReact(e, r)) return; // (Verdant's five)
  if (r === 'steam') {
    // fire and cold go up together: a cloud round the foe (nothing inside can aim, no eye sees through it), the foe scalded
    removeIce(e);
    steamAt(e.x, e.z);
    burst(e.x, 0.6, e.z, STEAM, 20, 2.2, 0.07);
    ringFx(e.x, 0.1, e.z, STEAM, 0.3, R.steam.radius, CFG.spellFx.shockwave, true);
    Sfx.at(e.x, e.z).steam();
    damageEnemy(e, R.steam.damage, 0, 0, 0, 'spell');
    return;
  }
  if (r === 'shatter') {
    removeIce(e);
    const S = R.shatter;
    for (let i = 0; i < S.shards; i++) {
      const a = (i / S.shards) * Math.PI * 2 + 0.3,
        x = e.x + Math.cos(a) * (e.r + 0.25),
        z = e.z + Math.sin(a) * (e.r + 0.25);
      fireSpellBolt(x, z, Math.cos(a), Math.sin(a), {
        damage: S.shardDamage,
        range: S.shardRange,
        scale: 0.8,
        color: ICE,
        speed: 9,
        shard: true,
        shatter: true,
      });
    }
    burst(e.x, 0.6, e.z, ICE, 24, 3, 0.06);
    burst(e.x, 0.6, e.z, 0xffffff, 10, 2, 0.04);
    ringFx(e.x, 0.6, e.z, 0xffffff, 0.15, 1.1, CFG.spellFx.flash);
    ringFx(e.x, 0.05, e.z, ICE, 0.2, 1.5, CFG.spellFx.shockwave, true); // a flash, and frost thrown out over the floor
    Sfx.at(e.x, e.z).shatter();
    G.fx.shake = Math.max(G.fx.shake, 0.2);
    damageEnemy(e, S.damage, 0, 0, 0, 'spell');
  } else overloadAt(e.x, e.z, e);
}

/* ---------- Verdant's vines and their reactions ---------- */

const live = (o: Enemy) => !o.dead && !o.hidden && o.spawn <= 0;
/** Verdant's five reactions, set off on `e`; false for the others. */
function verdantReact(e: Enemy, r: Reaction) {
  if (r === 'wildfire') {
    // the fire runs along the vines to every overgrown foe in the room
    const W = R.wildfire;
    for (const o of G.room.enemies) {
      if (o === e || !live(o) || (o.status?.grow ?? 0) <= 0) continue;
      const st = o.status!;
      st.grow = 0;
      st.growHeld = 0;
      if (st.burn <= 0) st.burnTick = MAGIC.burn.tick;
      st.burn = Math.max(st.burn, W.burn * boonStatusMul('burn'));
      strikeFx({ x: e.x, y: 0.3, z: e.z }, { x: o.x, y: 0.3, z: o.z }, FIRE, CFG.spellFx.chain, true);
      burst(o.x, 0.5, o.z, FIRE, 10, 2, 0.05);
      damageEnemy(o, W.damage, 0, 0, 0, 'spell', 'ember');
    }
    burst(e.x, 0.5, e.z, FIRE, 16, 2.4, 0.06);
    burst(e.x, 0.3, e.z, LEAF, 8, 1.6, 0.04);
    Sfx.at(e.x, e.z).wildfire();
    damageEnemy(e, W.damage, 0, 0, 0, 'spell', 'ember');
    return true;
  }
  if (r === 'frostbloom') {
    // ice flowers open on it, and shatter a moment later, cutting and chilling the foes round it
    const F = R.frostbloom,
      x = e.x,
      z = e.z,
      room = G.room.current;
    burst(x, 0.7, z, ICE, 12, 1.2, 0.04);
    burst(x, 0.7, z, PETAL, 6, 1, 0.04);
    Sfx.at(x, z).frostbloom();
    after(F.delay, () => {
      if (G.room.current !== room) return; // (the mage has gone on)
      const at = e.dead ? { x, z } : e;
      burst(at.x, 0.6, at.z, ICE, 22, 3, 0.05);
      burst(at.x, 0.6, at.z, 0xffffff, 8, 2.4, 0.04);
      ringFx(at.x, 0.05, at.z, ICE, 0.2, F.radius, CFG.spellFx.shockwave, true);
      for (const o of [...G.room.enemies])
        if (live(o) && Math.hypot(o.x - at.x, o.z - at.z) < F.radius + o.r) {
          damageEnemy(o, F.damage, 0, 0, 0, 'spell', 'frost');
          if (!o.dead) inflict(o, { chill: F.chill });
        }
      Sfx.at(at.x, at.z).shatter();
    });
    return true;
  }
  if (r === 'pollenspark') {
    // a cloud of pollen round it that shocks the foes inside for a few seconds
    pollenClouds.push({ x: e.x, z: e.z, t: R.pollenspark.time, next: 0, room: G.room.current });
    burst(e.x, 0.6, e.z, POLLEN, 24, 1.6, 0.05);
    burst(e.x, 0.8, e.z, SPARK, 8, 2.2, 0.03);
    Sfx.at(e.x, e.z).pollenspark();
    return true;
  }
  if (r === 'bloom') {
    burst(e.x, 0.9, e.z, PETAL, 16, 1.6, 0.045);
    burst(e.x, 1, e.z, GOLD, 8, 1.4, 0.035);
    Sfx.at(e.x, e.z).bloom();
    return true;
  } // (it flowers: a lily as it falls)
  if (r === 'blight') {
    // the vines rot to thorns that hex it, and creep to the nearest other foe
    const B = R.blight,
      o = G.room.enemies
        .filter((f) => f !== e && live(f) && Math.hypot(f.x - e.x, f.z - e.z) < B.reach)
        .sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
    burst(e.x, 0.5, e.z, THORN, 14, 1.8, 0.05);
    burst(e.x, 0.7, e.z, VIOLET, 8, 1.4, 0.04);
    if (!e.flying) hexGround(e.x, e.z);
    Sfx.at(e.x, e.z).blight();
    if (o) {
      // (laid straight on: thorns and a hex, no reaction of their own)
      const st = (o.status ??= newStatus()),
        T = magicNow();
      st.hex = Math.min(T.hex.max, st.hex + B.hex);
      st.hexT = T.hex.time;
      if (st.grow <= 0) st.growHeld = 0;
      st.grow = Math.max(st.grow, B.grow * boonStatusMul('grow'));
      for (let k = 1; k <= 6; k++) {
        const t = k / 6;
        burst(e.x + (o.x - e.x) * t, 0.12, e.z + (o.z - e.z) * t, k % 2 ? THORN : VINE, 2, 0.5, 0.04);
      }
    }
    return true;
  }
  return false;
}

/** Spark Wake: a foe the mage's shock stunned leaves a spark on the floor that stings foes, never the mage. */
function sparkWake(e: Enemy) {
  laySpark(G.room.current, e.x, e.z, boonParam('sparkWake', 'seconds'), 'mage', boonParam('sparkWake', 'damage'));
  burst(e.x, 0.1, e.z, SPARK, 8, 1.6, 0.03);
  boonActs('sparkWake', e.x, e.z);
}
/** Cold Snap: a frozen foe thaws and breathes its cold onto the foes within reach (what that freezes breathes nothing). */
function coldBreath(e: Enemy) {
  const reach = boonParam('coldSnap', 'reach'),
    chill = boonParam('coldSnap', 'chill');
  const near = G.room.enemies.filter((o) => o !== e && live(o) && Math.hypot(o.x - e.x, o.z - e.z) < reach + o.r);
  burst(e.x, 0.6, e.z, ICE, 16, 2, 0.05);
  burst(e.x, 0.4, e.z, 0xffffff, 6, 1.4, 0.04);
  ringFx(e.x, 0.05, e.z, ICE, 0.2, reach, CFG.spellFx.shockwave, true);
  for (const o of near) {
    for (let k = 1; k <= 4; k++)
      burst(e.x + ((o.x - e.x) * k) / 5, 0.5, e.z + ((o.z - e.z) * k) / 5, ICE, 2, 0.6, 0.04);
    inflict(o, { chill }, 'snap');
  }
  Sfx.at(e.x, e.z).frostbloom();
  if (near.length) boonActs('coldSnap', e.x, e.z);
}

/** How long the vines must hold for their full slow (Perennial roots a foe then). */
const FULL_GROW = (MAGIC.grow.maxSlow - MAGIC.grow.slow) / MAGIC.grow.ramp;
/** Perennial: the vines root the foe a moment (laid straight on: Root is Umbral's, and this isn't Umbral's magic). */
function perennialRoot(e: Enemy, s: StatusState) {
  applyStatus(s, 'root', boonParam('perennial', 'root'), !!e.isBoss, magicNow());
  burst(e.x, 0.1, e.z, VINE, 14, 1.4, 0.05);
  burst(e.x, 0.3, e.z, LEAF, 10, 1.2, 0.04);
  ringFx(e.x, 0.05, e.z, LEAF, 0.2, e.r + 0.5, CFG.spellFx.shockwave, true);
  Sfx.at(e.x, e.z).bloom();
  boonActs('perennial', e.x, e.z);
}

/** The overgrown garden's twist: its vines hold longer; the first time in a room, a word over the foe says so. */
function gardenHolds(e: Enemy) {
  const room = G.room.current;
  if (room.gardenSaid) return;
  room.gardenSaid = true;
  floatText(e.x, 1.3, e.z, STR.grow.garden, LEAF, 40);
}

/** Pollen Spark's clouds: where each hangs, how long it has left, its next shock (and the room it is in). */
const pollenClouds: { x: number; z: number; t: number; next: number; room: object }[] = [];
function updatePollen(dt: number) {
  const P = R.pollenspark;
  for (let i = pollenClouds.length - 1; i >= 0; i--) {
    const c = pollenClouds[i];
    c.t -= dt;
    c.next -= dt;
    if (c.t <= 0 || c.room !== G.room.current) {
      pollenClouds.splice(i, 1);
      continue;
    }
    if (Math.random() < dt * 18) {
      const a = Math.random() * Math.PI * 2,
        d = Math.random() * P.radius;
      burst(
        c.x + Math.cos(a) * d,
        0.3 + Math.random() * 0.9,
        c.z + Math.sin(a) * d,
        Math.random() < 0.8 ? POLLEN : LEAF,
        1,
        0.3,
        0.04,
      );
    }
    if (c.next > 0) continue;
    c.next = P.every;
    for (const o of [...G.room.enemies])
      if (live(o) && Math.hypot(o.x - c.x, o.z - c.z) < P.radius + o.r) {
        strikeFx({ x: c.x, y: 1, z: c.z }, { x: o.x, y: 0.7, z: o.z }, SPARK, CFG.spellFx.crackle, true);
        damageEnemy(o, P.damage, 0, 0, 0, 'spell', 'storm');
        const st = (o.status ??= newStatus());
        st.shock = Math.max(st.shock, P.shock); // (marked, as a shock does; no reaction of its own)
      }
    Sfx.at(c.x, c.z).sizzle();
  }
}
/** Dev hook: the pollen clouds hanging in the room. */
export const pollenNow = () => pollenClouds.length;

/** A foe falls overgrown: it flowers. Its flower mends half a heart (once a room); a lily (Bloom) mends besides, every time. */
export function flowerFell(e: Enemy) {
  const s = e.status;
  if (!s || (s.grow <= 0 && !s.bloom)) return;
  const room = G.room.current,
    lily = s.bloom,
    first = !room.flowered;
  if (!lily && !first) {
    burst(e.x, 0.3, e.z, LEAF, 8, 1.2, 0.04);
    return;
  }
  if (!lily) room.flowered = true;
  const heal = lily ? R.bloom.heal : MAGIC.grow.flowerHeal;
  burst(e.x, 0.4, e.z, lily ? PETAL : LEAF, 18, 1.6, 0.05);
  burst(e.x, 0.6, e.z, lily ? 0xffffff : PETAL, 10, 1.2, 0.04);
  floatText(e.x, 1.2, e.z, lily ? STR.grow.lily : STR.grow.flower, lily ? PETAL : LEAF, 40);
  for (let k = 1; k <= 5; k++)
    after(k * 0.06, () => {
      const t = k / 5;
      burst(e.x + (player.x - e.x) * t, 0.7, e.z + (player.z - e.z) * t, PETAL, 2, 0.5, 0.04);
    });
  if (player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + heal);
    renderHearts();
    floatText(player.x, 1.8, player.z, '+', 0xff8a8a, 40);
  }
  Sfx.at(e.x, e.z).bloom();
}

/** An Overload's blast at (x, z): foes thrown out and struck, a shockwave and a flash. Set off by a burning foe shocked or
    a shocked one set burning (`e`, which it doesn't throw), and by a shock through burning oil (in `pools.ts`). */
export function overloadAt(x: number, z: number, e?: Enemy, radius = R.overload.radius) {
  const O = { ...R.overload, radius };
  flash(x, z, 0xffb050, O.radius);
  for (const o of G.room.enemies) {
    if (o.dead || o.spawn > 0 || o.hidden) continue;
    const dx = o.x - x,
      dz = o.z - z,
      d = Math.hypot(dx, dz);
    if (d > O.radius + o.r) continue;
    const ux = d > 0.01 ? dx / d : 1,
      uz = d > 0.01 ? dz / d : 0;
    damageEnemy(o, O.damage, ux, uz, 0, 'spell');
    if (!o.isBoss && o !== e) {
      o.kx += ux * O.knockback;
      o.kz += uz * O.knockback;
    }
  }
  burst(x, 0.6, z, FIRE, 22, 4, 0.07);
  burst(x, 0.8, z, SPARK, 14, 3.5, 0.04);
  ringFx(x, 0.05, z, FIRE, 0.3, O.radius, CFG.spellFx.shockwave, true);
  ringFx(x, 0.7, z, 0xffe080, 0.2, 1.2, CFG.spellFx.flash); // the shockwave, and a flash
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2,
      d = O.radius * (0.4 + Math.random() * 0.4);
    strikeFx(
      { x, y: 0.7, z },
      { x: x + Math.cos(a) * d, y: 0.2 + Math.random() * 0.6, z: z + Math.sin(a) * d },
      SPARK,
      CFG.spellFx.crackle,
      true,
    );
  }
  Sfx.at(x, z).overload();
  G.fx.shake = Math.max(G.fx.shake, 0.35);
  // (Hailburst: among chilled foes or ice, the blast throws out shards that chill)
  const cold =
    G.room.enemies.some(
      (o) =>
        o !== e &&
        !o.dead &&
        Math.hypot(o.x - x, o.z - z) < O.radius + o.r &&
        ((o.status?.chill ?? 0) > 0 || (o.status?.frozen ?? 0) > 0),
    ) ||
    (G.room.current.barriers ?? []).some((b) => Math.hypot(b.x - x, b.z - z) < O.radius) ||
    poolAt(x, z)?.state === 'frozen';
  if (cold) {
    const H = MAGIC.weaves.hailburst;
    for (let i = 0; i < H.shards; i++) {
      const a = (i / H.shards) * Math.PI * 2 + 0.2;
      fireSpellBolt(x + Math.cos(a) * 0.4, z + Math.sin(a) * 0.4, Math.cos(a), Math.sin(a), {
        damage: H.damage,
        range: H.range,
        speed: H.speed,
        color: ICE,
        status: { chill: H.chill },
        shard: true,
      });
    }
    weaveAt('hailburst', x, z);
  }
}

/** A reaction on the floor rather than on a foe (a shock through burning oil, a hex on holy ground): its name rises
    there, larger the first time ever, as on a foe. */
export function tileReaction(r: Reaction, x: number, z: number) {
  floatText(x, 1.3, z, STR.reactions[r], REACT_COLOR[r], foundReaction(r) ? 52 : 44);
}

/** Eclipse's black sun: a dark orb in a crown of gold light (Hallow round Umbral), made for each foe it takes. Its dark is
    a violet shadow in the floor's shadow colour (`floorShade`): a near-black disc read as a hole in the floor. */
function blackSun() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(sunGeo(), new THREE.MeshBasicMaterial({ color: floorShade(0x1a0830, CFG.pixelLook.sunShade) })));
  const crown = glow(GOLD, 1.6, 0.85);
  g.add(crown);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 24), new THREE.MeshBasicMaterial({ color: GOLD }));
  rim.rotation.x = -Math.PI / 4;
  g.add(rim);
  return g;
}
let sunGeoKept: THREE.SphereGeometry | null = null;
const sunGeo = () => (sunGeoKept ??= markShared(new THREE.SphereGeometry(0.27, 14, 10)));
/** The eclipse is over: the foe comes back, and is struck. */
function endEclipse(e: Enemy) {
  if (e.sun) {
    e.group.remove(e.sun);
    disposeTree(e.sun);
    e.sun = undefined;
  } // (the sphere is shared; sprites' geometry is everyone's)
  e.hidden = false;
  e.body.visible = true;
  burst(e.x, 0.8, e.z, 0x2a0a4a, 16, 2.4, 0.05);
  burst(e.x, 0.8, e.z, GOLD, 10, 2, 0.04);
  const blow = R.eclipse.damage * (e.eclipseMul ?? 1);
  e.eclipseMul = undefined; // (Eclipse Ground's strikes half again as hard)
  if (e.corona) {
    // (Corona: the blow leaps as lightning to each foe near)
    e.corona = false;
    for (const o of G.room.enemies)
      if (
        o !== e &&
        !o.dead &&
        !o.hidden &&
        o.spawn <= 0 &&
        Math.hypot(o.x - e.x, o.z - e.z) < MAGIC.weaves.corona.reach
      ) {
        sparkLine(e, o);
        damageEnemy(o, blow * MAGIC.weaves.corona.share, 0, 0, 0, 'spell', 'storm');
      }
    Sfx.at(e.x, e.z).overload();
  }
  damageEnemy(e, blow, 0, 0, 0, 'spell');
}

/* ---------- every step ---------- */

let ice: { geo: THREE.IcosahedronGeometry; mat: THREE.MeshStandardMaterial } | null = null;
function addIce(e: Enemy) {
  if (e.ice) return;
  ice ??= {
    geo: markShared(new THREE.IcosahedronGeometry(1, 0)),
    mat: markShared(
      new THREE.MeshStandardMaterial({
        color: 0xbfe6ff,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1,
        metalness: 0.1,
        emissive: 0x1a3a5a,
        flatShading: true,
        depthWrite: false,
      }),
    ),
  };
  const m = new THREE.Mesh(ice.geo, ice.mat),
    s = (e.r * 1.5) / e.scale;
  m.scale.set(s, s * 1.4, s);
  m.position.y = (e.flying ? 0.8 : 0.5) / e.scale;
  m.rotation.y = Math.random() * 3;
  e.group.add(m);
  e.ice = m;
}
function removeIce(e: Enemy) {
  if (e.ice) {
    e.group.remove(e.ice);
    e.ice = undefined;
    burst(e.x, 0.6, e.z, ICE, 10, 2, 0.05);
  }
}

/** Statuses run their course: burn damage, thawing, and the look of each on the foe. */
export function updateStatuses(dt: number, now: number) {
  for (const e of G.room.enemies) {
    const s = e.status;
    if (!s || e.dead) continue;
    const held = s.growHeld,
      { burnDamage, thawed, eclipsed } = tickStatus(s, dt);
    if (s.grow > 0 && held < FULL_GROW && s.growHeld >= FULL_GROW && boonRank('perennial')) perennialRoot(e, s); // (held at its full slow, it roots)
    if (eclipsed) endEclipse(e);
    if (s.eclipse > 0) {
      if (e.sun) e.sun.rotation.y += dt * 2;
      continue;
    } // (out of the fight: nothing shows but its sun)
    if (burnDamage > 0) damageEnemy(e, burnDamage, 0, 0, 0, e.lastHit ?? 'spell', 'ember'); // the fire is whoever lit it last
    if (e.dead) continue;
    if (s.burn > 0) touchPools(e, 'burn'); // a burning foe walking into oil sets it alight
    if (s.frozen > 0) addIce(e);
    else if (e.ice) {
      removeIce(e);
      if (thawed) Sfx.at(e.x, e.z).thaw();
    }
    if (thawed) {
      if (!e.snapped && boonRank('coldSnap')) coldBreath(e);
      e.snapped = false;
    } // (Cold Snap; a foe a breath froze breathes nothing)
    const y = e.flying ? 0.85 : 0.5;
    if (s.burn > 0 && Math.random() < dt * 14)
      burst(
        e.x + (Math.random() - 0.5) * e.r,
        y + 0.2,
        e.z + (Math.random() - 0.5) * e.r,
        s.black ? (Math.random() < 0.5 ? BLACKFIRE : 0x2a0a4a) : Math.random() < 0.5 ? FIRE : 0xffc060,
        1,
        0.7,
        0.05,
      );
    if (s.hex > 0 && Math.random() < dt * 3 * s.hex)
      burst(
        e.x + (Math.random() - 0.5) * e.r * 1.6,
        y + 0.35,
        e.z + (Math.random() - 0.5) * e.r * 1.6,
        VIOLET,
        1,
        0.5,
        0.03,
      );
    if (s.sanct > 0 && Math.random() < dt * 6)
      burst(
        e.x + (Math.random() - 0.5) * e.r * 1.6,
        y + 0.5,
        e.z + (Math.random() - 0.5) * e.r * 1.6,
        GOLD,
        1,
        0.8,
        0.03,
      );
    if (s.prism > 0 && Math.random() < dt * 10)
      burst(
        e.x + (Math.random() - 0.5) * e.r * 1.8,
        y + 0.2 + Math.random() * 0.5,
        e.z + (Math.random() - 0.5) * e.r * 1.8,
        RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
        1,
        0.9,
        0.035,
      ); // (a prism throws colours)
    if (s.root > 0 && Math.random() < dt * 5)
      burst(e.x + (Math.random() - 0.5) * e.r * 2, 0.08, e.z + (Math.random() - 0.5) * e.r * 2, 0x2a0a4a, 1, 0.4, 0.04);
    if (s.grow > 0 && Math.random() < dt * 7)
      burst(
        e.x + (Math.random() - 0.5) * e.r * 2,
        0.1 + Math.random() * y,
        e.z + (Math.random() - 0.5) * e.r * 2,
        Math.random() < 0.6 ? LEAF : VINE,
        1,
        0.35,
        0.04,
      ); // (vines, leaves drifting off)
    if (s.bloom && Math.random() < dt * 3)
      burst(e.x + (Math.random() - 0.5) * e.r, y + 0.45, e.z + (Math.random() - 0.5) * e.r, PETAL, 1, 0.4, 0.035);
    if ((s.shock > 0 || s.stun > 0) && Math.random() < dt * 8)
      burst(
        e.x + (Math.random() - 0.5) * e.r * 2,
        y + 0.3,
        e.z + (Math.random() - 0.5) * e.r * 2,
        SPARK,
        2,
        2.4,
        0.025,
      );
    if (e.type === 'dummy') dummyLabel(e, now);
  }
  updatePollen(dt);
  updateFloats(dt);
}

const tint = new THREE.Color();
/** The glow a foe's statuses give its body (the hit flash still wins), or null: icy blue while frozen, a bluer
    tint with each chill stack, a flickering ember glow while burning, a flicker of yellow while shocked. */
export function statusTint(e: Enemy, now: number): [THREE.Color, number] | null {
  if (e.statue) return [tint.setHex(0xa88a4a), 0.7]; // a treasury's guardian stands gilded, a statue until its gold is taken
  if (e.type === 'tiger' && e.state === 'statue') return [tint.setHex(0x8a94a4), 0.45]; // (the War-Tiger, stone until it wakes)
  if (e.foe && e.state === 'rock') return [tint.setHex(0x4a4440), 0.8]; // (a magma ooze frozen hard)
  const s = e.status;
  if (!s) return null;
  if (s.prism > 0) return [tint.setHSL((now * 0.7 + e.x * 0.1) % 1, 0.95, 0.58), 1]; // (frozen in holy light, it glints every colour)
  if (s.seared > 0) return [tint.setHex(0xffa030), 0.55 + Math.sin(now * 11) * 0.2]; // (its guard burnt away: cracked gold)
  if (s.voidT > 0) return [tint.setHex(Math.sin(now * 19) > 0.6 ? 0xf0e890 : 0x9a5ae0), 0.5]; // (a Void Spark's mark: violet, sparking; it pays mana as it falls)
  if (s.frozen > 0) return [tint.setHex(0x4a8ad8), 0.85];
  if (s.grow > 0) return [tint.setHex(s.bloom ? 0xd890b8 : 0x4aa83a), 0.35 + Math.min(0.3, s.growHeld * 0.08)]; // (green as the vines hold, deeper the longer; a lily pink)
  if (s.burn > 0 && s.black) return [tint.setHex(0x6a1ac0), 0.5 + Math.sin(now * 17 + e.x) * 0.2];
  if (s.burn > 0) return [tint.setHex(0xff5a10), 0.45 + Math.sin(now * 17 + e.x) * 0.2];
  if (s.sanct > 0) return [tint.setHex(0xc89a30), 0.45 + Math.sin(now * 6) * 0.1];
  if (s.hex > 0) return [tint.setHex(0x6a2ab0), Math.min(0.6, 0.2 + s.hex * 0.08)];
  if (s.stun > 0 || (s.shock > 0 && Math.sin(now * 40) > 0.6))
    return paleFx() ? [tint.setHex(CFG.paleFx.stun.color), CFG.paleFx.stun.strength] : [tint.setHex(0xe8e070), 0.6]; // (a pale floor's a deep storm gold: the pale yellow turned bodies cream)
  if (s.chill > 0) return [tint.setHex(0x3a6aa8), Math.min(0.7, 0.3 * s.chill)];
  return null;
}

/* ---------- floating words, sparks and flashes ---------- */

const floats: { s: THREE.Sprite; t: number; y: number; name: boolean }[] = [];
const textTex = new Map<string, THREE.CanvasTexture>();
function textTexture(text: string, color: number, size = 44) {
  const key = `${text}|${color}|${size}`;
  let tex = textTex.get(key);
  if (!tex) {
    const c = document.createElement('canvas'),
      font = `600 ${size}px Cinzel, Georgia, serif`;
    c.height = 64;
    let g = c.getContext('2d')!;
    g.font = font;
    c.width = Math.max(256, Math.ceil((g.measureText(text).width + 24) / 64) * 64); // (a long word gets a wider canvas, not cut off)
    g = c.getContext('2d')!;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(8,6,4,.9)';
    g.strokeText(text, c.width / 2, 34);
    g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    g.fillText(text, c.width / 2, 34);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.wide = c.width / 256;
    textTex.set(key, tex);
    if (textTex.size > 200) {
      const first = textTex.keys().next().value!;
      textTex.get(first)!.dispose();
      textTex.delete(first);
    }
  }
  return tex;
}
/** A word rising from a spot and fading: a reaction's name, a hit on the dummy. */
export function floatText(x: number, y: number, z: number, text: string, color: number, size = 44) {
  const map = textTexture(text, color, size),
    s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false }));
  const w = 1.6 * (map.userData.wide ?? 1),
    name = size >= 40; // (a name: a reaction's, a weave's, a weakness's, a boon's, a counter's or a flower's word; not a hit's number)
  if (name) y = clearOfNames(x, y, z, w);
  s.scale.set(w, 0.4, 1);
  s.position.set(x, y, z);
  s.renderOrder = 10;
  scene.add(s);
  floats.push({ s, t: 0, y, name });
}
/** How high (x, y, z) stands on the screen (the camera looks down at TILT). */
const onScreen = (y: number, z: number) => y * Math.cos(TILT) - z * Math.sin(TILT);
/** Names rising at once from the same spot stack rather than overlap (a weave over the reaction it came from): the
    height on screen for a name `w` wide at (x, y, z), lifted over any name just risen there. */
function clearOfNames(x: number, y: number, z: number, w: number) {
  const gap = CFG.spellFx.nameGap;
  for (let k = 0; k < 4; k++) {
    const at = onScreen(y, z),
      over = floats.find(
        (f) =>
          f.name &&
          f.t < CFG.spellFx.nameStack &&
          Math.abs(f.s.position.x - x) < (w + f.s.scale.x) * 0.45 &&
          Math.abs(onScreen(f.s.position.y, f.s.position.z) - at) < gap,
      );
    if (!over) break;
    y += (onScreen(over.s.position.y, over.s.position.z) + gap - at) / Math.cos(TILT);
  }
  return y;
}
function updateFloats(dt: number) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t += dt;
    if (f.t > 0.9) {
      scene.remove(f.s);
      f.s.material.dispose();
      floats.splice(i, 1);
      continue;
    }
    f.s.position.y = f.y + f.t * 0.8;
    f.s.material.opacity = Math.min(1, (0.9 - f.t) * 3);
  }
}

/** A quick spark between two foes (the shock leaping). */
function sparkLine(a: Enemy, b: Enemy) {
  const n = 5;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    burst(a.x + (b.x - a.x) * k, 0.8, a.z + (b.z - a.z) * k, SPARK, 1, 0.6, 0.03);
  }
  Sfx.at(b.x, b.z).arc(1);
}
const flashes: { s: THREE.Sprite; t: number; size: number }[] = [];
/** A bright flash on a spot, fading in a third of a second (Overload, Pyre Seal). */
export function flash(x: number, z: number, color: number, radius: number) {
  const s = glow(color, radius * 2.4, 0.95);
  s.position.set(x, 0.5, z);
  scene.add(s);
  flashes.push({ s, t: 0, size: radius * 2.4 });
}
function updateFlashes(dt: number) {
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    f.t += dt;
    const k = f.t / 0.35;
    if (k >= 1) {
      scene.remove(f.s);
      f.s.material.dispose();
      flashes.splice(i, 1);
      continue;
    }
    f.s.scale.setScalar(f.size * (0.6 + 0.4 * k));
    f.s.material.opacity = 0.95 * (1 - k);
  }
}

/** The training dummy's label: its statuses, redrawn when they change. */
function dummyLabel(e: Enemy, _now: number) {
  const s = e.status!,
    parts: string[] = [];
  if (s.burn > 0) parts.push(`${STR.statusNames.burn} ${s.burn.toFixed(1)}`);
  if (s.frozen > 0) parts.push(STR.statusNames.frozen);
  else if (s.chill > 0) parts.push(`${STR.statusNames.chill} ${s.chill}`);
  if (s.shock > 0) parts.push(STR.statusNames.shock);
  if (s.sanct > 0) parts.push(STR.statusNames.sanct);
  if (s.hex > 0) parts.push(`${STR.statusNames.hex} ${s.hex}`);
  if (s.root > 0) parts.push(STR.statusNames.root);
  if (s.grow > 0) parts.push(s.bloom ? STR.statusNames.bloom : STR.statusNames.grow);
  const text = parts.join(' · ');
  if (e.label?.userData.text === text) return;
  if (e.label) {
    e.group.remove(e.label);
    e.label.material.dispose();
    e.label = undefined;
  }
  if (!text) return;
  const map = textTexture(text, 0xe8dcc2, 26),
    lab = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false }));
  lab.scale.set(2.2 * (map.userData.wide ?? 1), 0.55, 1);
  lab.position.y = 2.1;
  lab.renderOrder = 10;
  lab.userData.text = text;
  e.group.add(lab);
  e.label = lab;
}

/** A hit on the training dummy: the damage rises from it. */
export function dummyHit(e: Enemy, dmg: number) {
  floatText(e.x + (Math.random() - 0.5) * 0.4, 1.5, e.z, dmg.toFixed(1), 0xf0d9b4, 34);
}

/** Every step, outside the enemy loop: flashes fade. */
export function updateStatusFx(dt: number) {
  updateFlashes(dt);
}

/** A new floor or run: no words or flashes left in the air. */
export function clearStatusFx() {
  for (const f of floats) {
    scene.remove(f.s);
    f.s.material.dispose();
  }
  floats.length = 0;
  for (const f of flashes) {
    scene.remove(f.s);
    f.s.material.dispose();
  }
  flashes.length = 0;
}
