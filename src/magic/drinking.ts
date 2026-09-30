/* The drinking ward's rules (M4.2, from the Eda lore; GDD: Floors and rooms, From the Eda lore). A ward that drinks the
   spells cast at it, counting what it drank by school; full, it breaks, and a Wardling of the school it drank most rises
   from it (a vault's ward in world/vault.ts, a foe's shield in actors/wardShield.ts). Pure: no three.js, unit-tested. */
import { SCHOOLS, type School } from './spellData';

export interface Drink {
  /** How much it holds before it breaks, and how much it has drunk. */ need: number; total: number;
  /** What it drank of each school, and the school it drank last (ties go to it). */ by: Record<School, number>; last?: School;
}

export const newDrink = (need: number): Drink => ({ need, total: 0, by: { ember: 0, frost: 0, storm: 0, hallow: 0, umbral: 0 } });

/** The ward drinks `amount` of `school`. Returns whether it is full now. */
export function drink(d: Drink, school: School, amount: number) {
  d.by[school] += amount; d.total += amount; d.last = school;
  return d.total >= d.need;
}

/** How full it is, from 0 to 1. */
export const fullness = (d: Drink) => Math.min(1, d.total / d.need);

/** The school it drank most; of two drunk alike, the one it drank last, else the first in the schools' order. */
export function mostDrunk(d: Drink): School {
  const top = Math.max(...SCHOOLS.map(s => d.by[s]));
  if (d.last && d.by[d.last] === top) return d.last;
  return SCHOOLS.find(s => d.by[s] === top) ?? SCHOOLS[0];
}

/** The Wardling that rises from a ward full of each school (data/foes.json). */
export const WARDLING = { ember: 'wardEmber', frost: 'wardFrost', storm: 'wardStorm', hallow: 'wardHallow', umbral: 'wardUmbral' } as const satisfies Record<School, string>;
