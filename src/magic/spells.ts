/* Spells in play (GDD: Magic system): two slots on Q and E (LB and RB), paid with mana and held back by a
   cooldown, aimed like the cantrip (the cast direction, or where the mage last walked). Mana comes back over
   time, faster out of a fight, and from every foe the cantrip puts to rest: the dead give back what the spell
   spent. Each spell's `shape` (data/spells.json) is a function in magic/shapes.ts. */
import { CFG } from '../config';
import type { Vec2 } from '../types';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { heroCast } from '../actors/hero';
import { flashMana, renderSpells, spellIcon, toast } from '../ui/hud';
import { showLore } from '../ui/lore';
import { manaRegen, spell } from './spellData';
import { spellCost } from './cost';
import { CAST, clearShapes, leaveRoomShapes, updateShapes } from './shapes';

/* ---------- mana ---------- */

/** Give (or, negative, take) mana, within 0 and the most the mage can hold. */
export function gainMana(n: number) { player.mana = Math.max(0, Math.min(player.stats.maxMana, player.mana + n)); }

/* ---------- slots ---------- */

/** Learn a spell into a slot (the first empty one unless `slot` says); returns the spell it replaced. */
export function learnSpell(id: string, slot?: number, silent = false): string | null {
  const def = spell(id);
  const at = slot ?? Math.max(0, player.spells.indexOf(null));
  const replaced = player.spells[at];
  player.spells[at] = id; player.spellCd[at] = 0;
  renderSpells();
  if (!silent) {
    Sfx.learn();
    showLore({ name: def.name, kind: STR.spellKind(STR.schools[def.school]), effect: STR.spellEffect(def.text, def.mana, def.cooldown), lore: def.lore, icon: spellIcon(def.id) });
  }
  return replaced;
}
/** Forget every spell (a new run, or the dev menu). */
export function forgetSpells() { player.spells = [null, null]; player.spellCd = [0, 0]; renderSpells(); }

/** Where a spell cast now goes: the held cast direction, or where the mage last aimed or walked. */
export function aimDir(cast: Vec2 | null): Vec2 { return cast ?? player.aim; }

/** Cast the spell in `slot`, or refuse: no spell there, the merchant's ward, still cooling down, too little
    mana, nothing to strike. */
export function castSpell(slot: number, cast: Vec2 | null) {
  const id = player.spells[slot];
  if (!id) { toast(STR.toast.noSpell, 2.5); Sfx.spellFail(); return false; }
  const def = spell(id);
  if (G.current.type === 'merchant') { toast(STR.toast.spellWarded, 2.5); Sfx.wardTink(); flashMana(slot, 'target'); return false; }
  if (player.spellCd[slot] > 0) { Sfx.spellFail(); flashMana(slot, 'cooldown'); return false; }
  const cost = spellCost(def);
  if (player.mana < cost && !DEV.mana) { Sfx.spellFail(); flashMana(slot, 'mana'); return false; }
  if (!CAST[def.shape](def, aimDir(cast))) { Sfx.spellFail(); flashMana(slot, 'target'); return false; }
  if (!DEV.mana) gainMana(-cost);
  player.spellCd[slot] = def.cooldown;
  heroCast();
  return true;
}

/** Mana comes back (faster out of a fight), cooldowns run down, and effects fade. Runs every step; `acting` is
    false while paused or in a pan. */
export function updateMagic(dt: number, acting: boolean) {
  if (acting) {
    const fighting = G.current.locked;
    if (!player.stats.effects.has('noRegen')) gainMana(manaRegen(dt, fighting, CFG.mana)); // not with the Hungering Tome
    if (DEV.mana) player.mana = player.stats.maxMana;
    for (let i = 0; i < player.spellCd.length; i++) player.spellCd[i] = Math.max(0, player.spellCd[i] - dt);
  }
  updateShapes(dt, acting);
}

/** A new floor or run: no spell effects left behind. */
export function clearSpellFx() { clearShapes(); }
/** The mage leaves the room: seals, walls and lightning stay behind and go. */
export function leaveRoomSpells() { leaveRoomShapes(); }
