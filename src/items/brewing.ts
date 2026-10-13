/* Brewing at an alchemy table and Dr. Jelly's trade (M5 step 6, docs/archive/M5-plan.md; GDD: Potions and alchemy, Brewing): two
   reagents from the pouch make a potion by the recipes in data/alchemy.json (an unknown pair that matches none makes a
   Volatile Mixture); what was brewed is remembered between runs (alchemyMemory.ts), so the potion is known in every run
   after and the pair shows what it makes. Dr. Jelly sells a recipe for obols (the pair, not the potion's name), and looks
   at one potion a visit for free. The rules are pure (alchemyData.ts); this is the game side. */
import { CFG } from '../config';
import { G, player } from '../state';
import { potionUsed } from '../progression/insight';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { line } from '../ui/hud';
import { freeSpotNear } from '../world/rooms';
import { spawnPickup } from './pickups';
import { jellyGives } from '../world/jellyGives';
import { giveResources } from './pickups';
import { POTIONS, POTION_IDS, RECIPES, REAGENTS, brew, pairKey, type PotionId, type ReagentId } from './alchemyData';
import { learnRecipe, rememberBrew, triedPair, triedPairs } from './alchemyMemory';
import { addPotion, identify, potionCard, potionName } from './potions';

const A = () => CFG.alchemy;
/** Whether the pouch holds the two reagents (two of one, if they are the same). */
export const canBrew = (a: ReagentId, b: ReagentId) =>
  (player.reagents[a] ?? 0) >= (a === b ? 2 : 1) && (player.reagents[b] ?? 0) >= 1;
/** What a pair is known to make, if it is. */
export const knownBrew = (a: ReagentId, b: ReagentId) => triedPair(a, b);

/** Brew two reagents at a table at (x, z): they leave the pouch, the potion goes into the belt (or onto the floor by the
    table, with the belt full) and is known from now on; the first brew of a potion is kept between runs, and a line says
    what came of it. Returns the potion, or null when the pouch hasn't the reagents. */
export function brewNow(a: ReagentId, b: ReagentId, x: number, z: number): PotionId | null {
  if (!canBrew(a, b)) return null;
  for (const r of [a, b]) {
    player.reagents[r]--;
    if (player.reagents[r] <= 0) delete player.reagents[r];
  }
  const { potion, recipe } = brew(a, b),
    knewPair = !!triedPair(a, b),
    first = rememberBrew(a, b, potion);
  identify(potion);
  const name = POTIONS[potion].name,
    c = parseInt(POTIONS[potion].color.slice(1), 16);
  if (!addPotion(potion)) {
    const p = freeSpotNear(G.current, x, z + 1.1);
    spawnPickup('potion', p.x, p.z, { potion });
    line(STR.lab.beltFull, 3.5);
  } else {
    jellyGives({ kind: 'potion', potion }); // (Dr. Jelly corks it and hands it across: the owner's ask, 2026-10-02)
    if (!G.run.loreSeen.has('brewed:' + potion)) {
      G.run.loreSeen.add('brewed:' + potion);
      potionCard(potion);
    }
  }
  line(
    !recipe
      ? STR.lab.failed
      : first
        ? STR.lab.newPotion(name)
        : !knewPair
          ? STR.lab.newRecipe(REAGENTS[a].name, REAGENTS[b].name, name)
          : STR.lab.brewed(name),
    4,
  );
  burst(x, 1.2, z, c, 18, 2, 0.05);
  burst(x, 1.4, z, 0xc8ffb0, 8, 1.2, 0.04);
  Sfx.at(x, z).brew();
  return potion;
}

/** The recipe Dr. Jelly sells for a potion: one without Warden's Ash, if there is one. */
export function recipeOf(id: PotionId) {
  const all = RECIPES.filter((r) => r.makes === id);
  return all.find((r) => !r.of.includes('wardensAsh')) ?? all[0];
}
/** Every recipe known (brewed, or bought), as [pair, potion]. */
export function knownRecipes(): { a: ReagentId; b: ReagentId; potion: PotionId }[] {
  return Object.entries(triedPairs()).map(([k, potion]) => {
    const [a, b] = k.split('+') as ReagentId[];
    return { a, b, potion };
  });
}
/** Whether a recipe that makes this potion is known. */
export const recipeKnown = (id: PotionId) => knownRecipes().some((r) => r.potion === id);
/** The potions whose recipe Dr. Jelly can sell (all but the failed brew), in their order. */
export const RECIPE_POTIONS = POTION_IDS.filter((id) => id !== 'volatile');

/** Buy a potion's recipe from Dr. Jelly: false when it is known already or the mage hasn't the obols (a line says so). */
export function buyRecipe(id: PotionId) {
  const r = recipeOf(id),
    price = A().recipePrice;
  if (!r || recipeKnown(id)) return false;
  if (player.coins < price) {
    line(STR.toast.tooPoor(price, player.coins), 3);
    Sfx.refuse();
    return false;
  }
  giveResources({ coins: -price });
  Sfx.purchase();
  learnRecipe(r.of[0], r.of[1], id);
  jellyGives({ kind: 'recipe' });
  line(STR.lab.recipeBought(REAGENTS[r.of[0]].name, REAGENTS[r.of[1]].name, potionName(id)), 4.5);
  return true;
}

/** Dr. Jelly looks at a potion in the belt, free once a visit: it is known for the rest of the run. */
export function jellyIdentifies(id: PotionId) {
  const lab = G.current.lab;
  if (!lab || lab.identified) return false;
  lab.identified = true;
  identify(id);
  potionCard(id);
  Sfx.at(lab.jelly.x, lab.jelly.z).brew();
  jellyGives({ kind: 'potion', potion: id }); // (he hands it back)
  potionUsed(id); // (M6: named by Dr. Jelly, a kind pays its insight as a first use does)
  return true;
}

export { pairKey };
