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
import { flashMana, line, renderSpells, toast, showLore } from '../notify';
import { spellIcon } from '../render/icons';
import { SPELL_DEFS, manaRegen, spell, type School, type SpellDef } from './spellData';
import { payment, slotDef, spellCooldown, spellCost } from './cost';
import { castRunes, runeActs, unslot } from './runes';
import { reprisedDef, rune, type Payment } from './runeData';
import { bleed } from '../combat/damage';
import { CAST, clearShapes, flamesNear, leaveRoomShapes, updateShapes } from './shapes';
import { skullsWatch } from '../world/dressing';
import { castSpellOnce, learnedSpell } from './memory';
import { burnSoul } from '../items/souls';
import { drinkSpell, wardNear } from '../world/vault';
import { hexGiveBack } from './hex';
import { flareEyes, handAt } from '../actors/costume';
import { castSide } from '../actors/costumeFit';
import { burst } from '../combat/fx';
import { knownWellNow } from '../actors/spellMarks';
import { spendFreeCast, takeEcho } from '../items/potionFx';
import { castIntoStone } from '../world/waystone';
import { castIntoBargain } from '../world/bargain';
import { afterglowCast, boonActs, boonParam, boonRank, inFight, votiveCast } from '../progression/boonHooks';

/* ---------- mana ---------- */

/** Give (or, negative, take) mana, within 0 and the most the mage can hold. */
export function gainMana(n: number) {
  player.mana = Math.max(0, Math.min(player.stats.maxMana, player.mana + n));
}

/* ---------- slots ---------- */

/** Learn a spell into a slot (the first empty one unless `slot` says); returns the spell it replaced. */
export function learnSpell(id: string, slot?: number, silent = false): string | null {
  const def = spell(id);
  const at = slot ?? Math.max(0, player.spells.indexOf(null));
  const replaced = player.spells[at];
  if (replaced && replaced !== id) unslot(at); // (its runes go to the pouch; the socket stays the slot's)
  player.spells[at] = id;
  player.spellCd[at] = 0;
  learnedSpell(id); // known from here on, in every run
  renderSpells();
  if (!silent) {
    Sfx.learn();
    showLore({
      name: def.name,
      kind: STR.spellKind(STR.schools[def.school]),
      effect: STR.spellEffect(def.text, def.mana, def.cooldown),
      lore: def.lore,
      icon: spellIcon(def.id),
    });
  }
  return replaced;
}

/** The dev menu's: both slots filled with a school's spells, attuning the mage to it, and mana full. */
export function attuneTo(school: School) {
  SPELL_DEFS.filter((s) => s.school === school)
    .slice(0, 2)
    .forEach((s, i) => learnSpell(s.id, i, true));
  player.mana = player.stats.maxMana;
}
/** Forget every spell (a new run, or the dev menu): their runes go to the pouch, the sockets stay. */
export function forgetSpells() {
  unslot(0);
  unslot(1);
  player.spells = [null, null];
  player.spellCd = [0, 0];
  renderSpells();
}
/** One hand emptied (the Vigil's lectern). */
export function forgetSpell(slot: number) {
  unslot(slot);
  player.spells[slot] = null;
  player.spellCd[slot] = 0;
  renderSpells();
}

/** Where a spell cast now goes: the held cast direction, or where the mage last aimed or walked. */
export function aimDir(cast: Vec2 | null): Vec2 {
  return cast ?? player.aim;
}

/** Cast the spell in `slot` (as its runes make it), or refuse: no spell there, the merchant's ward, still cooling
    down, nothing to pay with (mana, Vein's blood, a soul mote), nothing to strike. */
export function castSpell(slot: number, cast: Vec2 | null) {
  const def = slotDef(slot);
  if (!def) {
    toast(STR.toast.noSpell, 2.5);
    Sfx.spellFail();
    return false;
  }
  const id = def.id;
  if (G.room.current.type === 'merchant') {
    toast(STR.toast.spellWarded, 2.5);
    Sfx.wardTink();
    flashMana(slot, 'target');
    return false;
  }
  if (castIntoBargain(def)) return true; // (a spell cast into a shrine's bargain stone opens its deal on the spell's school)
  if (castIntoStone(slot, def)) return true; // (a spell cast into a waystone, ready or not, costs nothing and opens its screen on that spell)
  if (player.spellCd[slot] > 0) {
    Sfx.spellFail();
    flashMana(slot, 'cooldown');
    return false;
  }
  const can = payment(slot);
  if (!can) {
    Sfx.spellFail();
    flashMana(slot, 'mana');
    if (def.runes?.includes('vein')) veinWontBleed();
    return false;
  }
  const ward = wardNear(); // (a sealed vault's ward near the mage drinks the spell instead)
  if (ward) drinkSpell(ward, def);
  else if (!CAST[def.shape](def, aimDir(cast))) {
    Sfx.spellFail();
    flashMana(slot, 'target');
    return false;
  }
  pay(def, payment(slot) ?? can); // (asked again: the cast may have given mana back, a foe it felled or a toll paid)
  spendFreeCast(); // (the Bottled Storm's)
  if (!ward && takeEcho()) {
    const room = G.room.current;
    after(CFG.alchemy.echoAfter, () => {
      if (G.room.current === room && !G.flow.trans && !player.dead) CAST[def.shape](def, aimDir(cast));
    });
  } // (the Philter of Echoes casts it again)
  if (!ward && def.runes?.includes('reprise')) {
    // (Reprise casts it again, softer, while the mage is still in the room)
    const R = rune('reprise').params,
      room = G.room.current,
      again = reprisedDef(def, R.share);
    after(R.after, () => {
      if (G.room.current === room && !G.flow.trans && !player.dead && CAST[def.shape](again, aimDir(cast)))
        runeActs('reprise', def.school);
    });
  }
  if (def.school === 'hallow') {
    hexGiveBack();
    votiveCast();
  } // (holy light gives back what a hex just took; Votive Heart mends)
  if (def.school === 'storm') flareEyes(); // (a Stormcaller's eyes flare)
  player.spellCd[slot] = spellCooldown(def);
  castRunes(def); // (Quicken, Wide and Lasting show at the cast)
  G.run.casts[def.school] = (G.run.casts[def.school] ?? 0) + 1; // (the boons' deal leans to the schools cast)
  afterglowCast(def.status, def.color); // (Afterglow)
  skullsWatch(G.room.current, def.color); // an ossuary's skulls take the spell's colour
  if (castSpellOnce(id)) {
    toast(STR.knowledge.knownWell(def.name), 3);
    knownWellNow(def.school);
  } // cast enough times: its lore and reactions are known (and perhaps its whole school)
  heroCast();
  return true;
}

/** Pay for a cast as `how` says: mana; Vein's half heart for what mana lacks, or a soul mote should the heart have
    gone in the cast; a soul mote burnt for the rest. */
function pay(def: SpellDef, how: Payment) {
  const cost = spellCost(def);
  if (how === 'mana') {
    if (!DEV.mana) gainMana(-cost);
  } else if (how === 'vein') {
    gainMana(-player.mana);
    if (bleed(rune('vein').params.halves)) runeActs('vein', def.school);
    else if (player.souls.length) burnSoul();
  } else if (how === 'soul') {
    burnSoul();
    gainMana(-cost);
  }
}
/** Vein refused a cast for the last half heart (a runed spell refused for want of payment can only be that): a line says
    why, once a run. */
function veinWontBleed() {
  if (!G.run.hinted.has('rune:veinLast')) {
    G.run.hinted.add('rune:veinLast');
    line(STR.runes.veinLast, CFG.afflict.lineShow);
  }
}

/** Mana comes back (faster out of a fight), cooldowns run down, and effects fade. Runs every step; `acting` is
    false while paused or in a pan. */
export function updateMagic(dt: number, acting: boolean) {
  if (acting) {
    const fighting = G.room.current.locked;
    if (!player.stats.effects.has('noRegen')) gainMana(manaRegen(dt, fighting, CFG.mana) * player.stats.regenMul); // (Will brings it back faster) // not with the Hungering Tome
    keepFlames(dt); // (Flamekeeper)
    if (DEV.mana) player.mana = player.stats.maxMana;
    for (let i = 0; i < player.spellCd.length; i++) player.spellCd[i] = Math.max(0, player.spellCd[i] - dt);
  }
  updateShapes(dt, acting);
}

let emberT = 0;
const hand = new THREE.Vector3(),
  FLAME = 0xffa040;
/** Flamekeeper: in a fight, each flame within reach (up to four) gives mana; embers run from each to the casting hand. */
function keepFlames(dt: number) {
  if (!boonRank('flamekeeper') || !inFight() || player.mana >= player.stats.maxMana) return;
  const flames = flamesNear(player.x, player.z, boonParam('flamekeeper', 'reach'), boonParam('flamekeeper', 'most'));
  if (!flames.length) return;
  gainMana(flames.length * boonParam('flamekeeper', 'mana') * dt); // (not Will's: its regen is the mana's own coming back)
  if ((emberT -= dt) <= 0) {
    emberT = CFG.boons.emberEvery;
    if (!handAt(castSide(), hand)) hand.set(player.x, 1, player.z);
    for (const f of flames)
      for (let k = 1; k <= 4; k++)
        after(k * 0.05, () => {
          const t = k / 5;
          burst(
            f.x + (hand.x - f.x) * t,
            0.5 + (hand.y - 0.5) * t,
            f.z + (hand.z - f.z) * t,
            k % 2 ? FLAME : 0xffd080,
            1,
            0.4,
            0.035,
          );
        });
  }
  if (!G.room.current.boonsSaid?.has('flamekeeper')) boonActs('flamekeeper', player.x, player.z);
}

/** A new floor or run: no spell effects left behind. */
export function clearSpellFx() {
  clearShapes();
}
/** The mage leaves the room: seals, walls and lightning stay behind and go. */
export function leaveRoomSpells() {
  leaveRoomShapes();
}
