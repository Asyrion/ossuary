/* What a spell costs now. Its own small module (state and data only), so the HUD can show it without pulling in
   the whole of magic. */
import { CFG } from '../config';
import { player } from '../state';
import type { SpellDef } from './spellData';

/** A spell's mana cost: the Witch's Knot takes a part off at half health or below. */
export function spellCost(def: SpellDef) {
  return def.mana * (player.stats.effects.has('witchKnot') && player.hp <= player.maxHp / 2 ? CFG.artifacts.witchKnot.costMul : 1);
}
