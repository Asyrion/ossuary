/* What the mage has brewed, kept between runs (GDD: Potions and alchemy, Identification and Brewing): the pairs of
   reagents tried at an alchemy table and the potions they made. A potion once brewed is identified in every run after;
   a pair once tried shows what it makes. Kept in the Vigil's save (vigil/save.ts), as spell knowledge is (magic/memory.ts). */
import { pairKey, type PotionId, type ReagentId } from './alchemyData';
import { firstFound, readSlot, writeSlot } from '../vigil/save';

// (kept in the Vigil's save, vigil/save.ts, which owns its key; a potion brewed for the first time ever
// is a first find of the run, Dust at its end)
interface Memory {
  pairs: Record<string, PotionId>;
  potions: PotionId[];
}
const kept = readSlot('recipes');
let mem: Memory = { pairs: { ...kept.pairs } as Record<string, PotionId>, potions: [...kept.potions] as PotionId[] };
const save = () => writeSlot('recipes', { pairs: { ...mem.pairs }, potions: [...mem.potions] });

/** The potions ever brewed (each identified in every run). */
export const brewedPotions = (): readonly PotionId[] => mem.potions;
/** What a pair of reagents brewed when it was tried, if it was. */
export const triedPair = (a: ReagentId, b: ReagentId): PotionId | undefined => mem.pairs[pairKey(a, b)];
/** Every pair tried, with what it made. */
export const triedPairs = (): Readonly<Record<string, PotionId>> => mem.pairs;
/** Remember a brew: the pair and what it made. True when the potion was brewed for the first time. */
export function rememberBrew(a: ReagentId, b: ReagentId, potion: PotionId) {
  mem.pairs[pairKey(a, b)] = potion;
  const first = !mem.potions.includes(potion);
  if (first) mem.potions.push(potion);
  save();
  if (first) firstFound();
  return first;
}
/** Learn a recipe without brewing it (Dr. Jelly's trade): the pair shows what it makes, the potion stays unknown until
    brewed or identified. */
export function learnRecipe(a: ReagentId, b: ReagentId, potion: PotionId) {
  mem.pairs[pairKey(a, b)] = potion;
  save();
}
/** Forget every brew (the dev menu). */
export function forgetBrews() {
  mem = { pairs: {}, potions: [] };
  save();
}
