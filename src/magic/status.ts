/* Status effects and reactions (GDD: Magic system), as rules on plain numbers: pure (no three.js), shared by the
   game and the unit tests. Tuning is in data/magic.json. The game side (magic/statusFx.ts) shows them and carries
   out what the rules return.

   Burn: damage over time; a new burn lasts at least as long as the old.
   Chill: stacks that slow; the third freezes for a while (then a short guard against freezing again) and a frozen
          foe takes more damage. Bosses are slowed but never frozen.
   Shock: a mark that stuns briefly (bosses only now and then); the next hit on a marked foe leaps to a neighbour.
   Sanctified (Hallow, M4.1): for a while the foe takes more damage from everything, and nothing heals it.
   Hex (Umbral, M4.1): stacks that fade a while after the last; each hit the mage lands on a hexed foe spends a stack and
          gives back mana (statusFx.ts), and one that falls with enough of them leaves a soul mote.
   Root (Umbral, M4.1): held where it stands (it can still strike and shoot); bosses only for a moment.
   Reactions: Shatter (Frost + Storm) when a frozen foe is shocked or a shocked foe freezes; Overload (Ember + Storm)
          when a burning foe is shocked or a shocked foe catches fire; Eclipse (Hallow + Umbral) when a sanctified foe is
          hexed or a hexed one sanctified: it is taken out of the fight for a moment under a black sun, then struck
          (a boss only struck); Blackfire (Umbral + Ember) when a hexed foe catches fire or a burning one is hexed: a
          burn that never goes out while the foe lives; Steam (Ember + Frost, 2026-10-01) when a chilled or frozen foe
          catches fire or a burning one is chilled: the fire and the cold go up as a cloud of steam round it (foes inside
          can't aim, eyes can't see through it; statusFx.ts and magic/steam.ts), the foe scalded.
   M4.8, the full wheel (every pair of the five schools reacts): Searing (Ember + Hallow) when a sanctified foe catches fire
          or a burning one is sanctified: holy fire burns its guard away a while (`seared`: every blow lands whole);
          Prism (Frost + Hallow) when a frozen foe is sanctified or a sanctified one freezes: while it stays frozen, the
          cantrip's bolts that strike it split in three (`prism`); Verdict (Storm + Hallow) when a sanctified foe is
          shocked or a shocked one sanctified: lightning from above strikes every sanctified foe in the room; Black Ice
          (Frost + Umbral) when a hexed foe is chilled or a chilled one hexed: black ice under it, where foes slide and
          can't stop; Void Spark (Storm + Umbral) when a hexed foe is shocked or a shocked one hexed: the spark leaps to
          the foes near, carrying a hex to each, and each that falls marked (`voidT`) gives the mage mana.
   M5, Verdant: Overgrown (`grow`, seconds): vines that slow a foe more the longer they hold (a boss half as much); a foe
          that falls overgrown flowers (statusFx.ts). Its five reactions make the wheel whole (every pair of the six
          schools reacts): Wildfire (Verdant + Ember) when an overgrown foe catches fire or a burning one is overgrown: the
          burn runs along the vines to every overgrown foe; Frostbloom (Verdant + Frost) when an overgrown foe is chilled
          or a chilled one overgrown: ice flowers open on it and shatter a moment later; Pollen Spark (Verdant + Storm)
          when an overgrown foe is shocked or a shocked one overgrown: a cloud of pollen round it that shocks the foes
          inside; Bloom (Verdant + Hallow) when an overgrown foe is sanctified or a sanctified one overgrown: it flowers
          (`bloom`), and falling, its lily mends the mage; Blight (Verdant + Umbral) when an overgrown foe is hexed or a
          hexed one overgrown: the vines rot to thorns that hex it and creep to the nearest other foe.
   Each uses up the statuses that met (Prism keeps the ice, which it is; Bloom keeps both). */
import magicData from '../../data/magic.json';
import type { SpellStatus } from './spellData';

export const MAGIC = magicData;
export type MagicTuning = typeof magicData;
export type Reaction = 'shatter' | 'overload' | 'eclipse' | 'blackfire' | 'steam' | 'searing' | 'prism' | 'verdict' | 'blackice' | 'voidspark'
  | 'wildfire' | 'frostbloom' | 'pollenspark' | 'bloom' | 'blight';
/** Every reaction, and the two statuses that set it off (the wheel: each pair of the five schools, M4.8; Verdant's five,
    M5, make it every pair of six). */
export const REACTIONS: Record<Reaction, [SpellStatus, SpellStatus]> = { shatter: ['chill', 'shock'], overload: ['burn', 'shock'], eclipse: ['sanct', 'hex'], blackfire: ['burn', 'hex'], steam: ['burn', 'chill'], searing: ['burn', 'sanct'], prism: ['chill', 'sanct'], verdict: ['shock', 'sanct'], blackice: ['chill', 'hex'], voidspark: ['shock', 'hex'],
  wildfire: ['burn', 'grow'], frostbloom: ['chill', 'grow'], pollenspark: ['shock', 'grow'], bloom: ['sanct', 'grow'], blight: ['hex', 'grow'] };

export interface StatusState {
  /** Seconds left burning, and until the next burn tick. */ burn: number; burnTick: number;
  /** Chill stacks, and seconds before they thaw. */ chill: number; chillT: number;
  /** Seconds left frozen, and of the guard against freezing again. */ frozen: number; guard: number;
  /** Seconds left marked by Shock, left stunned, and (bosses) before a stun can land again. */ shock: number; stun: number; stunGuard: number;
  /** Seconds left sanctified. */ sanct: number;
  /** Hex stacks, and seconds before they fade. */ hex: number; hexT: number;
  /** Seconds left rooted. */ root: number;
  /** Seconds left eclipsed (out of the fight), and whether its burn is blackfire (it never goes out). */ eclipse: number; black: boolean;
  /** M4.8: seconds left seared (no guard), a prism (frozen and holy), and marked by a void spark. */ seared: number; prism: number; voidT: number;
  /** M5: seconds left overgrown, how long the vines have held (they slow more), and whether it has flowered (Bloom). */ grow: number; growHeld: number; bloom: boolean;
}
export const newStatus = (): StatusState => ({ burn: 0, burnTick: 0, chill: 0, chillT: 0, frozen: 0, guard: 0, shock: 0, stun: 0, stunGuard: 0, sanct: 0, hex: 0, hexT: 0, root: 0, eclipse: 0, black: false, seared: 0, prism: 0, voidT: 0, grow: 0, growHeld: 0, bloom: false });

/** What applying a status did. */
export interface Applied { froze?: boolean; stunned?: boolean; reaction?: Reaction }

/** Apply `amount` of a status (Burn, Shock, Sanctified and Root: seconds; Chill and Hex: stacks). */
export function applyStatus(s: StatusState, kind: SpellStatus, amount: number, boss: boolean, T: MagicTuning = MAGIC): Applied {
  if (s.eclipse > 0) return {}; // (out of the fight: nothing reaches it)
  if (kind === 'burn') {
    if (s.shock > 0) { s.shock = 0; return { reaction: 'overload' }; }
    if (s.hex > 0 && !s.black) { s.hex = 0; s.black = true; s.burn = Math.max(s.burn, amount); s.burnTick = T.burn.tick; return { reaction: 'blackfire' }; }
    if (s.chill > 0 || s.frozen > 0) { // fire on cold: both go up as steam (a frozen foe thaws, guarded a while from freezing again)
      if (s.frozen > 0) s.guard = T.chill.refreezeGuard;
      s.chill = 0; s.chillT = 0; s.frozen = 0; return { reaction: 'steam' };
    }
    if (s.sanct > 0) { s.sanct = 0; s.seared = T.reactions.searing.time; return { reaction: 'searing' }; } // fire on holy light: its guard burns away
    if (s.burn <= 0) s.burnTick = T.burn.tick;
    s.burn = Math.max(s.burn, amount);
    if (s.grow > 0) { unGrow(s); return { reaction: 'wildfire' }; } // (M5: fire on the vines runs along them; this foe burns too)
    return {};
  }
  if (kind === 'chill') {
    if (s.frozen > 0) return {};
    if (s.burn > 0 && !s.black) { s.burn = 0; s.burnTick = 0; return { reaction: 'steam' }; } // cold on fire: steam (blackfire never goes out)
    if (s.hex > 0) { s.hex = 0; s.hexT = 0; return { reaction: 'blackice' }; } // cold on a hex: black ice under it
    if (s.grow > 0) { unGrow(s); return { reaction: 'frostbloom' }; } // (M5: cold on the vines: ice flowers)
    s.chill += amount; s.chillT = T.chill.stackTime;
    if (boss) { s.chill = Math.min(s.chill, T.chill.bossMaxStacks); return {}; }
    if (s.chill < T.chill.freezeAt || s.guard > 0) { s.chill = Math.min(s.chill, T.chill.freezeAt - 1); return {}; }
    s.chill = 0;
    if (s.shock > 0) { s.shock = 0; return { reaction: 'shatter' }; } // frozen while shocked: it shatters at once
    s.frozen = T.chill.freezeTime;
    if (s.sanct > 0) { s.sanct = 0; s.prism = s.frozen; return { froze: true, reaction: 'prism' }; } // frozen in holy light: a prism
    return { froze: true };
  }
  if (kind === 'sanct') {
    if (s.hex > 0) { s.hex = 0; return eclipse(s, boss, T); }
    if (s.burn > 0 && !s.black) { s.burn = 0; s.burnTick = 0; s.seared = T.reactions.searing.time; return { reaction: 'searing' }; }
    if (s.frozen > 0) { const was = s.prism > 0; s.prism = s.frozen; return was ? {} : { reaction: 'prism' }; } // (a prism already: it stays one, quietly)
    if (s.shock > 0) { s.shock = 0; return { reaction: 'verdict' }; }
    s.sanct = Math.max(s.sanct, amount);
    if (s.grow > 0 && !s.bloom) { s.bloom = true; return { reaction: 'bloom' }; } // (M5: holy light on the vines: it flowers)
    return {};
  }
  if (kind === 'hex') {
    if (s.sanct > 0) { s.sanct = 0; return eclipse(s, boss, T); }
    if (s.burn > 0 && !s.black) { s.black = true; return { reaction: 'blackfire' }; }
    if (s.chill > 0 || s.frozen > 0) { s.chill = 0; s.chillT = 0; return { reaction: 'blackice' }; } // (a frozen foe keeps its ice)
    if (s.shock > 0) { s.shock = 0; s.voidT = T.reactions.voidspark.time; return { reaction: 'voidspark' }; }
    s.hex = Math.min(T.hex.max, s.hex + amount); s.hexT = T.hex.time;
    if (s.grow > 0) { unGrow(s); s.hex = Math.min(T.hex.max, s.hex + T.reactions.blight.hex); return { reaction: 'blight' }; } // (M5: the vines rot to thorns)
    return {};
  }
  if (kind === 'root') {
    s.root = Math.max(s.root, boss ? Math.min(amount, T.root.bossMax) : amount);
    return {};
  }
  if (kind === 'grow') { // M5: Verdant's vines, and what they meet
    if (s.burn > 0 && !s.black) return { reaction: 'wildfire' }; // (the fire takes the vines as they come: it runs along them)
    if (s.chill > 0 || s.frozen > 0) { s.chill = 0; s.chillT = 0; return { reaction: 'frostbloom' }; }
    if (s.shock > 0) { s.shock = 0; return { reaction: 'pollenspark' }; }
    if (s.hex > 0) { s.hex = Math.min(T.hex.max, s.hex + T.reactions.blight.hex); s.hexT = T.hex.time; return { reaction: 'blight' }; }
    if (s.grow <= 0) s.growHeld = 0;
    s.grow = Math.max(s.grow, amount);
    if (s.sanct > 0 && !s.bloom) { s.bloom = true; return { reaction: 'bloom' }; }
    return {};
  }
  // shock
  if (s.frozen > 0) { s.frozen = 0; s.guard = T.chill.refreezeGuard; return { reaction: 'shatter' }; }
  if (s.burn > 0) { s.burn = 0; s.black = false; return { reaction: 'overload' }; }
  if (s.sanct > 0) { s.sanct = 0; return { reaction: 'verdict' }; }
  if (s.hex > 0) { s.hex = 0; s.hexT = 0; s.voidT = T.reactions.voidspark.time; return { reaction: 'voidspark' }; }
  if (s.grow > 0) { unGrow(s); return { reaction: 'pollenspark' }; } // (M5: a shock in the vines: their pollen sparks)
  s.shock = Math.max(s.shock, amount);
  if (boss && s.stunGuard > 0) return {};
  s.stun = T.shock.stun;
  if (boss) s.stunGuard = T.shock.bossStunGuard;
  return { stunned: true };
}
/** The vines are spent (by the reaction they set off). */
function unGrow(s: StatusState) { s.grow = 0; s.growHeld = 0; }
/** Hallow and Umbral meet: out of the fight for a moment (a boss is only struck, when it comes). */
function eclipse(s: StatusState, boss: boolean, T: MagicTuning): Applied {
  if (!boss) s.eclipse = T.reactions.eclipse.time;
  return { reaction: 'eclipse' };
}

/** Run a status's clocks for `dt` seconds; returns the burn damage dealt meanwhile (in whole ticks), whether it thawed,
    and whether an eclipse just ended (it is struck then). */
export function tickStatus(s: StatusState, dt: number, T: MagicTuning = MAGIC): { burnDamage: number; thawed: boolean; eclipsed: boolean } {
  let burnDamage = 0, thawed = false, eclipsed = false;
  if (s.eclipse > 0) { s.eclipse -= dt; if (s.eclipse <= 0) { s.eclipse = 0; eclipsed = true; } return { burnDamage, thawed, eclipsed }; } // (its clocks wait)
  if (s.burn > 0) {
    const live = Math.min(dt, s.burn), dps = s.black ? T.reactions.blackfire.dps : T.burn.dps;
    if (!s.black) s.burn -= dt; // (blackfire never goes out)
    s.burnTick -= live;
    while (s.burnTick <= 0 && live > 0) { burnDamage += dps * T.burn.tick; s.burnTick += T.burn.tick; }
    if (s.burn <= 0) { s.burn = 0; s.burnTick = 0; }
  }
  if (s.chill > 0) { s.chillT -= dt; if (s.chillT <= 0) { s.chill = 0; s.chillT = 0; } }
  if (s.frozen > 0) { s.frozen -= dt; if (s.frozen <= 0) { s.frozen = 0; s.guard = T.chill.refreezeGuard; thawed = true; } }
  else if (s.guard > 0) s.guard = Math.max(0, s.guard - dt);
  if (s.shock > 0) s.shock = Math.max(0, s.shock - dt);
  if (s.stun > 0) s.stun = Math.max(0, s.stun - dt);
  if (s.stunGuard > 0) s.stunGuard = Math.max(0, s.stunGuard - dt);
  if (s.sanct > 0) s.sanct = Math.max(0, s.sanct - dt);
  if (s.hex > 0) { s.hexT -= dt; if (s.hexT <= 0) { s.hex = 0; s.hexT = 0; } }
  if (s.root > 0) s.root = Math.max(0, s.root - dt);
  if (s.seared > 0) s.seared = Math.max(0, s.seared - dt);
  if (s.voidT > 0) s.voidT = Math.max(0, s.voidT - dt);
  if (s.grow > 0) { s.grow = Math.max(0, s.grow - dt); s.growHeld += dt; if (s.grow <= 0) s.growHeld = 0; }
  if (s.prism > 0) s.prism = s.frozen > 0 ? Math.max(0, s.prism - dt) : 0; // (a prism while the ice lasts)
  return { burnDamage, thawed, eclipsed };
}

/** How fast a foe moves, as a share of its speed: not at all while frozen, stunned, rooted or eclipsed, slower for each
    chill stack, and (M5) slower the longer vines have held it (`boss`: half as much). */
export function speedFactor(s: StatusState | undefined, T: MagicTuning = MAGIC, boss = false) {
  if (!s) return 1;
  if (s.frozen > 0 || s.stun > 0 || s.root > 0 || s.eclipse > 0) return 0;
  return Math.max(T.chill.minSpeed, 1 - s.chill * T.chill.slowPerStack) * (1 - growSlow(s, T) * (boss ? T.grow.bossMul : 1));
}
/** How much an overgrown foe is slowed (0 to `maxSlow`): a little at once, more the longer the vines hold. */
export const growSlow = (s: StatusState | undefined, T: MagicTuning = MAGIC) => !s || s.grow <= 0 ? 0 : Math.min(T.grow.maxSlow, T.grow.slow + s.growHeld * T.grow.ramp);
/** Whether a foe can act (attack, shoot, charge): not while frozen, stunned or eclipsed (rooted, it still can). */
export const canAct = (s: StatusState | undefined) => !s || (s.frozen <= 0 && s.stun <= 0 && s.eclipse <= 0);
/** How much harder a foe is hit: a frozen one cracks, a sanctified one lies open. */
export const damageTakenMul = (s: StatusState | undefined, T: MagicTuning = MAGIC) => !s ? 1 : (s.frozen > 0 ? T.chill.frozenDamageMul : 1) * (s.sanct > 0 ? T.sanct.damageMul : 1);
/** Whether anything may heal a foe (a fawn's light): not while it is sanctified. */
export const canHeal = (s: StatusState | undefined) => !s || s.sanct <= 0;

/** A hit on a shocked foe uses the mark up: true when it should leap to a neighbour. */
export function consumeShock(s: StatusState | undefined) {
  if (!s || s.shock <= 0) return false;
  s.shock = 0;
  return true;
}
/** A hit by the mage on a hexed foe spends a stack: the mana it gives back (0 when unhexed). */
export function spendHex(s: StatusState | undefined, T: MagicTuning = MAGIC) {
  if (!s || s.hex <= 0) return 0;
  s.hex -= 1; if (s.hex <= 0) s.hexT = 0;
  return T.hex.manaPerStack;
}
