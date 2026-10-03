/* Potions in a run (M5, docs/M5-plan.md; GDD: Potions and alchemy): the belt the mage carries them in, the pouch of
   reagents, which potions are known, and what each does drunk. Thrown, a potion flies and splashes (items/potionThrow.ts).
   The rules (what each potion is and does, the run's bottles, brewing) are data, read by the pure alchemyData.ts. What a
   drink leaves on the mage shows as a chip beside the mana bar (ui/afflictions.ts) for as long as it lasts. */
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { heroDrink, hero } from '../actors/hero';
import { gainMana } from '../magic/spells';
import { floatText } from '../magic/statusFx';
import { line, renderHearts, toast } from '../ui/hud';
import { showLore } from '../ui/lore';
import { gainInsight, potionUsed } from '../progression/insight';
import { refreshStats } from './artifacts';
import { artifact } from './artifactData';
import { POTIONS, POTION_IDS, REAGENTS, isKnown, type DrinkEffect, type PotionDef, type PotionId, type ReagentId } from './alchemyData';
import { brewedPotions } from './alchemyMemory';
import { bottleIconUrl, reagentIconUrl } from './alchemyLooks';
import { throwPotion, breathe } from './potionThrow';
import { inputFx } from '../input';
import { potionFx } from './potionFx';
import { boonActs, boonRank } from '../progression/boonHooks';
export { potionFx, emberCantrip, freeCasts, spendFreeCast, takeEcho, giantDamageMul, potionSpeedMul, unseen, reversedControls } from './potionFx';

let giantIn: object | null = null; // (the room the Giant's Brew was drunk in: it wears off in the next)
export function resetPotions() { Object.assign(potionFx, { ember: 0, frost: 0, free: 0, echo: 0, giant: 0, unseen: 0, reversed: 0 }); giantIn = null; setGiant(false); inputFx.reversed = false; }

/** How many potions the belt holds (CFG.alchemy.belt, one more with the Alchemist's Satchel). */
export const beltSlots = () => CFG.alchemy.belt + (player.stats.effects.has('satchel') ? 1 : 0);
/** Whether a potion shows what it is: identified this run, or ever brewed (kept between runs). */
export const knownPotion = (id: PotionId) => isKnown(id, G.run.identified, brewedPotions()) || boonRank('keenNose') > 0; // (M6: Keen Nose knows it by its smell)
/** A potion's name as the mage knows it. */
export const potionName = (id: PotionId) => knownPotion(id) ? POTIONS[id].name : STR.alchemy.unknown;
/** The chosen potion, if the belt holds any. */
export const chosenPotion = (): PotionId | undefined => player.belt[Math.min(player.beltAt, player.belt.length - 1)] as PotionId | undefined;

/** A potion's lore card: what it is and does, or only its bottle while it is unknown. */
export function potionCard(id: PotionId) {
  const def = POTIONS[id], icon = `<img class="px" src="${bottleIconUrl(G.run.bottles[id])}" alt="">`;
  if (!knownPotion(id)) { const u = STR.lore.items.potion; showLore({ ...u, icon }); return; }
  showLore({ name: def.name, kind: STR.alchemy.kind(def.bad), effect: `${STR.alchemy.drink}: ${def.text.drink}. ${STR.alchemy.throw}: ${def.text.throw}.`, lore: def.lore, icon });
}
/** A reagent's lore card. */
export function reagentCard(id: ReagentId) {
  const r = REAGENTS[id];
  showLore({ name: r.name, kind: STR.alchemy.reagentKind, effect: STR.alchemy.leans(r.leans), lore: r.lore, icon: `<img class="px" src="${reagentIconUrl(id)}" alt="">` });
}

/** Put a potion in the belt: false when it is full (it stays where it lay). Its card shows the first time each is taken in
    a run. */
export function addPotion(id: PotionId) {
  if (player.belt.length >= beltSlots()) return false;
  player.belt.push(id); if (player.belt.length === 1) player.beltAt = 0;
  if (!G.run.loreSeen.has('potion:' + id)) { G.run.loreSeen.add('potion:' + id); potionCard(id); }
  if (boonRank('keenNose') && !isKnown(id, G.run.identified, brewedPotions())) boonActs('keenNose'); // (known only by its smell)
  renderBelt(); return true;
}
/** Put a reagent in the pouch (no limit); its card the first time each is taken in a run. */
export function addReagent(id: ReagentId, n = 1) {
  player.reagents[id] = (player.reagents[id] ?? 0) + n;
  if (!G.run.loreSeen.has('reagent:' + id)) { G.run.loreSeen.add('reagent:' + id); reagentCard(id); }
}

/** A potion identified (drunk, thrown, or at an alchemy table): known for the rest of the run, said in a line. */
export function identify(id: PotionId) {
  if (G.run.identified.includes(id)) return false;
  const was = knownPotion(id); G.run.identified.push(id);
  if (!was) { line(STR.alchemy.identified(POTIONS[id].name), 3.5); renderBelt(); }
  return !was;
}

/** M6 step 9: the potion in belt slot `from` moved to slot `to` (the others closing up round it; past the last, it goes
    last); the chosen one stays chosen. False when there is nothing to move. */
export function moveInBelt(from: number, to: number) {
  if (from < 0 || from >= player.belt.length || from === to) return false;
  const [id] = player.belt.splice(from, 1), at = Math.min(to, player.belt.length), was = player.beltAt;
  player.belt.splice(at, 0, id);
  if (was === from) player.beltAt = at; // (the chosen one followed)
  else { const k = was > from ? was - 1 : was; player.beltAt = k >= at ? k + 1 : k; } // (the chosen one where the others closed up)
  Sfx.potionChoose(); renderBelt(); return true;
}

/** Choose the next potion in the belt (`d` 1) or the one before (−1). */
export function choosePotion(d: number) {
  if (player.belt.length < 2) return;
  player.beltAt = ((player.beltAt + d) % player.belt.length + player.belt.length) % player.belt.length;
  Sfx.potionChoose(); renderBelt();
}

/** Use the chosen potion: drink it, or throw it where the mage aims. Says so when the belt is empty. */
export function usePotion(how: 'drink' | 'throw') {
  const id = chosenPotion();
  if (!id) { if (!G.run.hinted.has('beltEmpty')) { G.run.hinted.add('beltEmpty'); toast(STR.alchemy.empty, 2.5); } Sfx.spellFail(); return false; }
  player.belt.splice(Math.min(player.beltAt, player.belt.length - 1), 1);
  player.beltAt = Math.min(player.beltAt, Math.max(0, player.belt.length - 1));
  const def = POTIONS[id], known = knownPotion(id);
  if (how === 'drink') {
    heroDrink(); Sfx.drink(); burst(player.x, 1, player.z, parseInt(def.color.slice(1), 16), 10, 1.6, .04);
    floatText(player.x, 1.8, player.z, def.name, parseInt(def.color.slice(1), 16), 34);
    DRINK[def.drink.effect](def);
    if (boonRank('brewersBreath')) breathe(id); // (M6: Brewer's Breath)
  } else throwPotion(id);
  identify(id); if (!known) potionCard(id); // (unknown before: what it was, now)
  potionUsed(id); // (M6: each kind's first use in a run gives insight)
  renderBelt(); return true;
}

const num = (v: number | string | undefined) => Number(v ?? 0);
/** Each drink, on the mage. */
const DRINK: Record<DrinkEffect, (def: PotionDef) => void> = {
  heal(def) { player.hp = Math.min(player.maxHp, player.hp + num(def.drink.halves)); renderHearts(); },
  mana(def) { gainMana(num(def.drink.amount)); },
  emberCantrip(def) { potionFx.ember = num(def.drink.seconds); },
  frostWard(def) { potionFx.frost = num(def.drink.seconds); player.chill = 0; },
  freeSpells(def) { potionFx.free = num(def.drink.casts); },
  echoSpell() { potionFx.echo = 1; },
  giant() { potionFx.giant = 1; giantIn = G.current; setGiant(true); },
  unseen(def) { potionFx.unseen = num(def.drink.seconds); },
  remedy() {
    const curse = [...player.items].reverse().find(id => artifact(id).curse && !player.cleansed.includes(id));
    if (!curse) { line(STR.alchemy.noCurse, 3); return; }
    G.run.remedy = curse; refreshStats(false); line(STR.alchemy.remedied(artifact(curse).name), 3.5);
  },
  random() { // another potion's drink, at random (not itself)
    const ids = POTION_IDS.filter(id => id !== 'volatile'), id = ids[Math.floor(G.run.alchemy.next() * ids.length)];
    floatText(player.x, 2.1, player.z, POTIONS[id].name, parseInt(POTIONS[id].color.slice(1), 16), 30);
    DRINK[POTIONS[id].drink.effect](POTIONS[id]);
  },
  reversed(def) { potionFx.reversed = num(def.drink.seconds); },
  graveSip(def) { // (M6: insight for the half heart, more the deeper; M5 gave a pale soul mote until M6)
    player.hp = Math.max(1, player.hp - num(def.drink.halves)); renderHearts(); gainInsight(num(def.drink.insight) * (G.run.floor + 1));
  },
};

/** The Giant's Brew: the mage bigger (and back). */
function setGiant(on: boolean) { hero.root.scale.setScalar(on ? Number(POTIONS.giants.drink.scale) : 1); }
/** Every step: what the drinks left runs down; the Frostbrew keeps the cold off; the giant shrinks back in a new room. */
export function updatePotions(dt: number) {
  const f = potionFx;
  for (const k of ['ember', 'frost', 'unseen', 'reversed'] as const) if (f[k] > 0) f[k] = Math.max(0, f[k] - dt);
  if (f.frost > 0) player.chill = 0;
  inputFx.reversed = f.reversed > 0;
  if (f.giant && G.current !== giantIn) { f.giant = 0; setGiant(false); }
  if (player.stats.effects.has('taster')) for (const id of player.belt as PotionId[]) if (!knownPotion(id)) identify(id); // (M5 step 8: the Taster's Spoon)
}

/** The HUD's belt: a slot for each potion it can hold, the chosen one lit, an unknown one marked; its keys. */
export function renderBelt() {
  const box = document.getElementById('belt'); if (!box) return;
  const n = beltSlots(), keys = STR.controls.potionKeys;
  let html = '';
  for (let i = 0; i < n; i++) {
    const id = player.belt[i] as PotionId | undefined, on = id && i === Math.min(player.beltAt, player.belt.length - 1);
    html += `<div class="bslot${id ? '' : ' empty'}${on ? ' on' : ''}" title="${id ? potionName(id) : ''}">${id ? `<img class="px" src="${bottleIconUrl(G.run.bottles[id])}" alt="">${knownPotion(id) ? '' : '<i>?</i>'}` : ''}</div>`;
  }
  box.innerHTML = html + `<b>${keys}</b>`;
}
