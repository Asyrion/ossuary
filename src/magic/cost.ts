/* What a spell costs now. Its own small module (state and data only), so the HUD can show it without pulling in
   the whole of magic. M6 step 7: and the one reader of a slotted spell (`slotDef`: as its runes make it), its cooldown
   (`spellCooldown`) and how a cast in it would be paid (`payment`), so the cast, the HUD, the hands and the panel agree. */
import { singMul } from '../vigil/walking';
import { CFG } from '../config';
import { DEV, player } from '../state';
import { freeCasts } from '../items/potionFx';
import { spell, type SpellDef } from './spellData';
import { payment as payFor, rune, runedDef, type Payment, type RuneId } from './runeData';

/** A spell's mana cost: the Witch's Knot takes a part off at half health or below; nothing while the Bottled Storm's free casts last. */
export function spellCost(def: SpellDef) {
  if (freeCasts()) return 0; // (M5: the Bottled Storm's free casts)
  return (
    def.mana *
    (player.stats.effects.has('witchKnot') && player.hp <= player.maxHp / 2 ? CFG.artifacts.witchKnot.costMul : 1)
  );
}

/** M6 step 7: the spell in slot `slot` as the runes carved there make it (null: none there); the same object while neither
    the spell nor its runes change (a socket's runes are a new array on every change). */
const kept: ({ id: string; runes: readonly RuneId[]; def: SpellDef } | null)[] = [null, null];
export function slotDef(slot: number): SpellDef | null {
  const id = player.spells[slot];
  if (!id) return null;
  const runes = player.sockets[slot]?.runes ?? [],
    k = kept[slot];
  if (k && k.id === id && k.runes === runes) return k.def;
  const def = runedDef(spell(id), runes);
  kept[slot] = { id, runes, def };
  return def;
}
/** A spell's cooldown now (a runed one's: Quicken's). */
export const spellCooldown = (def: SpellDef) => def.cooldown * singMul(); // (M7 step 6: the chorister's song, walking with the mage)
/** How a cast in slot `slot` would be paid now: free, mana, Vein's half heart, a soul mote, or not at all (null). */
export function payment(slot: number): Payment | null {
  const def = slotDef(slot);
  if (!def) return null;
  return payFor({
    cost: spellCost(def),
    mana: player.mana,
    endless: DEV.mana,
    vein: !!def.runes?.includes('vein'),
    hp: player.hp,
    halves: rune('vein').params.halves,
    souls: player.souls.length,
  });
}
