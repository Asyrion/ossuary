/* Spells in play (GDD: Magic system): two slots on Q and E (LB and RB), paid with mana and held back by a
   cooldown, aimed like the cantrip (the cast direction, or where the mage last walked). Mana comes back over
   time, faster out of a fight, and from every foe the cantrip puts to rest: the dead give back what the spell
   spent. Each spell's `shape` (data/spells.json) is a function in magic/shapes.ts. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Vec2 } from '../types';
import { DEV, G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { heroCast } from '../actors/hero';
import { flashMana, renderSpells, spellIcon, toast } from '../ui/hud';
import { showLore } from '../ui/lore';
import { SPELL_DEFS, manaRegen, spell, type School } from './spellData';
import { spellCost } from './cost';
import { CAST, clearShapes, flamesNear, leaveRoomShapes, updateShapes } from './shapes';
import { skullsWatch } from '../world/dressing';
import { castSpellOnce, learnedSpell } from './memory';
import { burnSoul } from '../items/souls';
import { drinkSpell, wardNear } from '../world/vault';
import { hexGiveBack } from '../ui/afflictions';
import { flareEyes, handAt } from '../actors/costume';
import { castSide } from '../actors/costumeFit';
import { burst } from '../combat/fx';
import { knownWellNow } from '../actors/spellMarks';
import { spendFreeCast, takeEcho } from '../items/potionFx';
import { boonActs, boonParam, boonRank, inFight, votiveCast } from '../progression/boonHooks';

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
  learnedSpell(id); // known from here on, in every run (M3.7)
  renderSpells();
  if (!silent) {
    Sfx.learn();
    showLore({ name: def.name, kind: STR.spellKind(STR.schools[def.school]), effect: STR.spellEffect(def.text, def.mana, def.cooldown), lore: def.lore, icon: spellIcon(def.id) });
  }
  return replaced;
}

/** The dev menu's (M4.11): both slots filled with a school's spells, attuning the mage to it, and mana full. */
export function attuneTo(school: School) {
  SPELL_DEFS.filter(s => s.school === school).slice(0, 2).forEach((s, i) => learnSpell(s.id, i, true));
  player.mana = player.stats.maxMana;
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
  const cost = spellCost(def), short = player.mana < cost && !DEV.mana;
  if (short && !player.souls.length) { Sfx.spellFail(); flashMana(slot, 'mana'); return false; } // (with a soul mote, it burns for the rest)
  const ward = wardNear(); // (M4.2: a sealed vault's ward near the mage drinks the spell instead)
  if (ward) drinkSpell(ward, def);
  else if (!CAST[def.shape](def, aimDir(cast))) { Sfx.spellFail(); flashMana(slot, 'target'); return false; }
  if (short) burnSoul();
  if (!DEV.mana) gainMana(-cost);
  spendFreeCast(); // (M5: the Bottled Storm's)
  if (!ward && takeEcho()) { const room = G.current; after(CFG.alchemy.echoAfter, () => { if (G.current === room && !player.dead) CAST[def.shape](def, aimDir(cast)); }); } // (M5: the Philter of Echoes casts it again)
  if (def.school === 'hallow') { hexGiveBack(); votiveCast(); } // (M4.9: holy light gives back what a hex just took; M6: Votive Heart mends)
  if (def.school === 'storm') flareEyes(); // (M4.6: a Stormcaller's eyes flare)
  player.spellCd[slot] = def.cooldown;
  G.run.casts[def.school] = (G.run.casts[def.school] ?? 0) + 1; // (M6: the boons' deal leans to the schools cast)
  skullsWatch(G.current, def.color); // an ossuary's skulls take the spell's colour
  if (castSpellOnce(id)) { toast(STR.knowledge.knownWell(def.name), 3); knownWellNow(def.school); } // cast enough times: its lore and reactions are known (and perhaps its whole school: M4.11)
  heroCast();
  return true;
}

/** Mana comes back (faster out of a fight), cooldowns run down, and effects fade. Runs every step; `acting` is
    false while paused or in a pan. */
export function updateMagic(dt: number, acting: boolean) {
  if (acting) {
    const fighting = G.current.locked;
    if (!player.stats.effects.has('noRegen')) gainMana(manaRegen(dt, fighting, CFG.mana) * player.stats.regenMul); // (M6: Will brings it back faster) // not with the Hungering Tome
    keepFlames(dt); // (M6: Flamekeeper)
    if (DEV.mana) player.mana = player.stats.maxMana;
    for (let i = 0; i < player.spellCd.length; i++) player.spellCd[i] = Math.max(0, player.spellCd[i] - dt);
  }
  updateShapes(dt, acting);
}

let emberT = 0;
const hand = new THREE.Vector3(), FLAME = 0xffa040;
/** Flamekeeper (M6): in a fight, each flame within reach (up to four) gives mana; embers run from each to the casting hand. */
function keepFlames(dt: number) {
  if (!boonRank('flamekeeper') || !inFight() || player.mana >= player.stats.maxMana) return;
  const flames = flamesNear(player.x, player.z, boonParam('flamekeeper', 'reach'), boonParam('flamekeeper', 'most'));
  if (!flames.length) return;
  gainMana(flames.length * boonParam('flamekeeper', 'mana') * dt); // (not Will's: its regen is the mana's own coming back)
  if ((emberT -= dt) <= 0) {
    emberT = CFG.boons.emberEvery;
    if (!handAt(castSide(), hand)) hand.set(player.x, 1, player.z);
    for (const f of flames) for (let k = 1; k <= 4; k++) after(k * .05, () => { const t = k / 5; burst(f.x + (hand.x - f.x) * t, .5 + (hand.y - .5) * t, f.z + (hand.z - f.z) * t, k % 2 ? FLAME : 0xffd080, 1, .4, .035); });
  }
  if (!G.current.boonsSaid?.has('flamekeeper')) boonActs('flamekeeper', player.x, player.z);
}

/** A new floor or run: no spell effects left behind. */
export function clearSpellFx() { clearShapes(); }
/** The mage leaves the room: seals, walls and lightning stay behind and go. */
export function leaveRoomSpells() { leaveRoomShapes(); }
