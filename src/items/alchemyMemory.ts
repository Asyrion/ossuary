/* What the mage has brewed, kept between runs (M5; GDD: Potions and alchemy, Identification and Brewing): the pairs of
   reagents tried at an alchemy table and the potions they made. A potion once brewed is identified in every run after;
   a pair once tried shows what it makes. Kept in this browser (`ossuary.recipes`) until the Vigil's grimoire takes it
   over (M7), as spell knowledge is (magic/memory.ts). */
import { pairKey, type PotionId, type ReagentId } from './alchemyData';

const KEY = 'ossuary.recipes';
interface Memory { pairs: Record<string, PotionId>; potions: PotionId[] }
let mem: Memory = { pairs: {}, potions: [] };
try {
  const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Memory> | null;
  if (v) mem = { pairs: v.pairs ?? {}, potions: v.potions ?? [] };
} catch { /* no storage: nothing remembered */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* not kept */ } };

/** The potions ever brewed (each identified in every run). */
export const brewedPotions = (): readonly PotionId[] => mem.potions;
/** What a pair of reagents brewed when it was tried, if it was. */
export const triedPair = (a: ReagentId, b: ReagentId): PotionId | undefined => mem.pairs[pairKey(a, b)];
/** Every pair tried, with what it made. */
export const triedPairs = (): Readonly<Record<string, PotionId>> => mem.pairs;
/** Remember a brew: the pair and what it made. True when the potion was brewed for the first time. */
export function rememberBrew(a: ReagentId, b: ReagentId, potion: PotionId) {
  mem.pairs[pairKey(a, b)] = potion;
  const first = !mem.potions.includes(potion); if (first) mem.potions.push(potion);
  save(); return first;
}
/** Learn a recipe without brewing it (Dr. Jelly's trade): the pair shows what it makes, the potion stays unknown until
    brewed or identified. */
export function learnRecipe(a: ReagentId, b: ReagentId, potion: PotionId) { mem.pairs[pairKey(a, b)] = potion; save(); }
/** Forget every brew (the dev menu). */
export function forgetBrews() { mem = { pairs: {}, potions: [] }; save(); }
