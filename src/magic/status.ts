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
          burn that never goes out while the foe lives. Each uses up the statuses that met. */
import magicData from '../../data/magic.json';
import type { SpellStatus } from './spellData';

export const MAGIC = magicData;
export type MagicTuning = typeof magicData;
export type Reaction = 'shatter' | 'overload' | 'eclipse' | 'blackfire';

export interface StatusState {
  /** Seconds left burning, and until the next burn tick. */ burn: number; burnTick: number;
  /** Chill stacks, and seconds before they thaw. */ chill: number; chillT: number;
  /** Seconds left frozen, and of the guard against freezing again. */ frozen: number; guard: number;
  /** Seconds left marked by Shock, left stunned, and (bosses) before a stun can land again. */ shock: number; stun: number; stunGuard: number;
  /** Seconds left sanctified. */ sanct: number;
  /** Hex stacks, and seconds before they fade. */ hex: number; hexT: number;
  /** Seconds left rooted. */ root: number;
  /** Seconds left eclipsed (out of the fight), and whether its burn is blackfire (it never goes out). */ eclipse: number; black: boolean;
}
export const newStatus = (): StatusState => ({ burn: 0, burnTick: 0, chill: 0, chillT: 0, frozen: 0, guard: 0, shock: 0, stun: 0, stunGuard: 0, sanct: 0, hex: 0, hexT: 0, root: 0, eclipse: 0, black: false });

/** What applying a status did. */
export interface Applied { froze?: boolean; stunned?: boolean; reaction?: Reaction }

/** Apply `amount` of a status (Burn, Shock, Sanctified and Root: seconds; Chill and Hex: stacks). */
export function applyStatus(s: StatusState, kind: SpellStatus, amount: number, boss: boolean, T: MagicTuning = MAGIC): Applied {
  if (s.eclipse > 0) return {}; // (out of the fight: nothing reaches it)
  if (kind === 'burn') {
    if (s.shock > 0) { s.shock = 0; return { reaction: 'overload' }; }
    if (s.hex > 0 && !s.black) { s.hex = 0; s.black = true; s.burn = Math.max(s.burn, amount); s.burnTick = T.burn.tick; return { reaction: 'blackfire' }; }
    if (s.burn <= 0) s.burnTick = T.burn.tick;
    s.burn = Math.max(s.burn, amount);
    return {};
  }
  if (kind === 'chill') {
    if (s.frozen > 0) return {};
    s.chill += amount; s.chillT = T.chill.stackTime;
    if (boss) { s.chill = Math.min(s.chill, T.chill.bossMaxStacks); return {}; }
    if (s.chill < T.chill.freezeAt || s.guard > 0) { s.chill = Math.min(s.chill, T.chill.freezeAt - 1); return {}; }
    s.chill = 0;
    if (s.shock > 0) { s.shock = 0; return { reaction: 'shatter' }; } // frozen while shocked: it shatters at once
    s.frozen = T.chill.freezeTime;
    return { froze: true };
  }
  if (kind === 'sanct') {
    if (s.hex > 0) { s.hex = 0; return eclipse(s, boss, T); }
    s.sanct = Math.max(s.sanct, amount);
    return {};
  }
  if (kind === 'hex') {
    if (s.sanct > 0) { s.sanct = 0; return eclipse(s, boss, T); }
    if (s.burn > 0 && !s.black) { s.black = true; return { reaction: 'blackfire' }; }
    s.hex = Math.min(T.hex.max, s.hex + amount); s.hexT = T.hex.time;
    return {};
  }
  if (kind === 'root') {
    s.root = Math.max(s.root, boss ? Math.min(amount, T.root.bossMax) : amount);
    return {};
  }
  // shock
  if (s.frozen > 0) { s.frozen = 0; s.guard = T.chill.refreezeGuard; return { reaction: 'shatter' }; }
  if (s.burn > 0) { s.burn = 0; s.black = false; return { reaction: 'overload' }; }
  s.shock = Math.max(s.shock, amount);
  if (boss && s.stunGuard > 0) return {};
  s.stun = T.shock.stun;
  if (boss) s.stunGuard = T.shock.bossStunGuard;
  return { stunned: true };
}
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
  return { burnDamage, thawed, eclipsed };
}

/** How fast a foe moves, as a share of its speed: not at all while frozen, stunned, rooted or eclipsed, slower for each
    chill stack. */
export function speedFactor(s: StatusState | undefined, T: MagicTuning = MAGIC) {
  if (!s) return 1;
  if (s.frozen > 0 || s.stun > 0 || s.root > 0 || s.eclipse > 0) return 0;
  return Math.max(T.chill.minSpeed, 1 - s.chill * T.chill.slowPerStack);
}
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
