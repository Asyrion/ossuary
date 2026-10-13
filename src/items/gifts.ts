/* The transformations' gifts (M4.6; transformData.ts says which each brings, and they sit in `player.stats.effects`): what
   each does, called from the system it bends. A cantrip bolt that strikes a foe (`cantripStruck`, projectiles.ts) leaves
   the Pyromancer's embers, every fifth leaps on for the Stormcaller and lays the Runescribe's rune; a foe's touch
   (`touched`, enemies.ts) is chilled for the Frostborn; the Shadowstep blinks (`blink`, player.ts); the Pilgrim's floor is
   mapped as it begins (`pilgrimMap`); the Lightbearer floats over pits and water (player.ts, pools.ts, `floatLift` for the
   look). The Beastcaller's familiars are familiars.ts's. Each shows where it happens (GDD pillar: Nothing silent). */
import type { Enemy } from '../types';
import type { Effect } from './artifactData';
import { G, after, player } from '../state';
import { CFG } from '../config';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { blockers, collide } from '../world/collision';
import { layFire } from '../actors/foes';
import { inflict } from '../magic/statusFx';
import { ringFx, strikeFx } from '../magic/spellFx';
import { renderMinimap } from '../notify';
import { TRANSFORMS } from './transformData';
import { boonMul } from '../progression/boonHooks';

const T = CFG.transform,
  has = (e: Effect) => player.stats.effects.has(e);
const RUNE = TRANSFORMS.runescribe.light,
  SHADOW = TRANSFORMS.shadowstep.light;

/** Bolts struck since the Stormcaller's last leap. */
let struck = 0;
/** A cantrip bolt of `damage` struck foe `e` at (x, z): the Pyromancer's embers, the Stormcaller's leap, the Runescribe's rune. */
export function cantripStruck(e: Enemy, x: number, z: number, damage: number) {
  if (has('emberStrike')) layFire(G.current, x, z, T.ember.time * boonMul('bankedCoals', 'groundMul'), 'mage'); // (the mage's own: they burn foes, never the mage; M6: Banked Coals keeps them longer)
  if (has('stormLeap') && ++struck >= T.storm.every) {
    struck = 0;
    leap(e, damage * T.storm.share);
  }
  if (has('runeBurst')) layRune(x, z, damage * T.rune.share);
}

/** The Stormcaller's leap: lightning from the struck foe to the nearest other within reach. */
function leap(from: Enemy, damage: number) {
  let to: Enemy | undefined,
    best = T.storm.reach;
  for (const o of G.enemies) {
    if (o === from || o.dead || o.spawn > 0 || o.hidden) continue;
    const d = Math.hypot(o.x - from.x, o.z - from.z);
    if (d < best) {
      best = d;
      to = o;
    }
  }
  if (!to) return;
  const y = (e: Enemy) => (e.flying ? 0.85 : 0.55),
    light = SCHOOL_LIGHT.storm;
  strikeFx({ x: from.x, y: y(from), z: from.z }, { x: to.x, y: y(to), z: to.z }, light, CFG.spellFx.chain);
  ringFx(to.x, y(to), to.z, light, 0.1, 0.45, CFG.spellFx.flash);
  damageEnemy(to, damage, (to.x - from.x) / best, (to.z - from.z) / best, 0.4, 'cantrip', 'storm');
  burst(to.x, y(to), to.z, light, 8, 2.2, 0.04);
  Sfx.at(to.x, to.z).arc(1);
}

/** The Runescribe's rune: laid where the bolt struck, glowing, and bursting a moment later on the foes round it. */
function layRune(x: number, z: number, damage: number) {
  const room = G.current,
    R = T.rune;
  ringFx(x, 0.05, z, RUNE, 0.3, 0.36, R.delay, true, 0.9);
  after(R.delay, () => {
    if (G.current !== room) return;
    ringFx(x, 0.05, z, RUNE, 0.2, R.reach, CFG.spellFx.flash * 1.5, true);
    burst(x, 0.3, z, RUNE, 10, 2, 0.04);
    Sfx.at(x, z).runeBurst();
    for (const e of [...G.enemies]) {
      if (e.dead || e.spawn > 0 || e.hidden) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > R.reach + e.r) continue;
      damageEnemy(e, damage, (e.x - x) / (d || 1), (e.z - z) / (d || 1), 0.3, 'cantrip');
    }
  });
}

/** When each foe last felt the Frostborn's chill. */
const chilled = new WeakMap<Enemy, number>();
/** Foe `e` touched the mage: the Frostborn chills it (no more often than `every`). */
export function touched(e: Enemy) {
  if (!has('frostTouch') || e.dead || G.flow.clock - (chilled.get(e) ?? -Infinity) < T.frost.every) return;
  chilled.set(e, G.flow.clock);
  inflict(e, { chill: T.frost.chill });
  burst(e.x, 0.6, e.z, SCHOOL_LIGHT.frost, 8, 1.6, 0.035);
  Sfx.at(e.x, e.z).rimeTouch();
}

/** Seconds until the Shadowstep can blink again. */
let blinkCd = 0;
/** Each step: the blink's rest. */
export function updateGifts(dt: number) {
  if (blinkCd > 0) blinkCd -= dt;
}
/** A new run: the Stormcaller's count and the blink's rest start afresh. */
export function resetGifts() {
  struck = 0;
  blinkCd = 0;
}
/** The Shadowstep's blink (Shift, RT): a short step through the dark the way the mage moves (or aims, standing), stopping
    short of walls, rocks, pits and shut doors; for a moment nothing can strike the mage. Too soon, it fizzles. */
export function blink(move: { x: number; z: number }) {
  if (!has('blink')) return;
  if (blinkCd > 0) {
    burst(player.x, 0.5, player.z, SHADOW, 3, 0.8, 0.025);
    Sfx.spellFail();
    return;
  }
  const l = Math.hypot(move.x, move.z),
    dir = l > 0.3 ? { x: move.x / l, z: move.z / l } : player.aim;
  const solid = blockers(G.current, 'player', has('pitWalker')),
    B = T.blink,
    from = { x: player.x, z: player.z };
  const probe = { x: player.x, z: player.z, r: player.r };
  for (let s = 0.1; s <= B.dist + 1e-6; s += 0.1) {
    probe.x = from.x + dir.x * s;
    probe.z = from.z + dir.z * s;
    if (collide(probe, solid)) break; // (something in the way: stop short of it)
    player.x = probe.x;
    player.z = probe.z;
  }
  if (player.x === from.x && player.z === from.z) {
    Sfx.spellFail();
    return;
  }
  blinkCd = B.every;
  player.invuln = Math.max(player.invuln, B.invuln);
  burst(from.x, 0.8, from.z, SHADOW, 14, 1.8, 0.045);
  burst(player.x, 0.8, player.z, SHADOW, 14, 1.8, 0.045);
  strikeFx({ x: from.x, y: 0.7, z: from.z }, { x: player.x, y: 0.7, z: player.z }, SHADOW, CFG.spellFx.flash, true);
  Sfx.blink();
}
/** The blink's rest left (for the tests and the dev menu). */
export const blinkRest = () => Math.max(0, blinkCd);

/** The Pilgrim's map: every room of the floor on the map (not its secret: the cracked walls glow for that). */
export function pilgrimMap() {
  if (!has('pilgrimPath')) return;
  for (const r of G.floor.rooms) if (r.type !== 'secret') r.known = true;
  renderMinimap();
}

/** The Lightbearer's float: how high the mage hovers now (0 when not), bobbing. */
export const floatLift = (now: number) => (has('float') ? T.float.lift + Math.sin(now * 2.2) * T.float.bob : 0);
