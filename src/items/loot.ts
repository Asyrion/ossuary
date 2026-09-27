/* Loot as data (data/loot.json): what a run starts with, and what a cleared room or a fallen enemy leaves
   behind. Pure (no three.js), so the economy can be simulated in the unit tests.

   Resources (GDD: Coins, keys and blast glyphs): obols (coins), bone keys and blast glyphs, each capped. */
import lootData from '../../data/loot.json';
import type { Rng } from '../rng';

export type Resource = 'coins' | 'keys' | 'glyphs';
export const RESOURCES: Resource[] = ['coins', 'keys', 'glyphs'];
/** Things that can lie on the floor to be picked up. */
export type Drop = 'halfHeart' | 'heart' | 'coin' | 'purse' | 'key' | 'glyph';
export const DROPS: Drop[] = ['halfHeart', 'heart', 'coin', 'purse', 'key', 'glyph'];

export interface LootData {
  /** What every run starts with. */ start: Record<Resource, number>;
  /** Most of each resource the mage can carry. */ cap: number;
  /** Obols in a purse. */ purse: number;
  /** A cleared room leaves one drop with this chance, picked by weight. */ roomClear: { chance: number; weights: Record<Drop, number> };
  /** Chance a fallen enemy leaves an obol. */ enemyCoin: number;
}
export const LOOT = lootData as LootData;

/** What a drop gives: half hearts, or resources. */
export function dropValue(d: Drop, loot: LootData = LOOT): { hearts?: number } & Partial<Record<Resource, number>> {
  switch (d) {
    case 'halfHeart': return { hearts: 1 };
    case 'heart': return { hearts: 2 };
    case 'coin': return { coins: 1 };
    case 'purse': return { coins: loot.purse };
    case 'key': return { keys: 1 };
    case 'glyph': return { glyphs: 1 };
  }
}

/** What a cleared room leaves behind, if anything. */
export function rollRoomClear(rng: Rng, loot: LootData = LOOT): Drop | null {
  return rng.chance(loot.roomClear.chance) ? rng.weighted(loot.roomClear.weights) : null;
}
/** Now and then a fallen enemy leaves an obol. */
export function rollEnemyDrop(rng: Rng, loot: LootData = LOOT): Drop | null {
  return rng.chance(loot.enemyCoin) ? 'coin' : null;
}

/** Problems in data/loot.json; empty when valid. */
export function validateLoot(loot: LootData = LOOT): string[] {
  const errs: string[] = [];
  for (const r of RESOURCES) if (!(loot.start[r] >= 0 && loot.start[r] <= loot.cap)) errs.push(`start ${r} must be between 0 and the cap`);
  if (!(loot.cap > 0)) errs.push('the cap must be above 0');
  if (!(loot.purse > 1)) errs.push('a purse must hold more than one obol');
  const w = loot.roomClear.weights;
  for (const k of Object.keys(w)) if (!DROPS.includes(k as Drop)) errs.push(`room clear drop "${k}" is unknown`);
  if (!Object.values(w).some(v => v > 0) || Object.values(w).some(v => v < 0)) errs.push('room clear weights must be positive');
  for (const [name, p] of [['room clear chance', loot.roomClear.chance], ['enemy coin chance', loot.enemyCoin]] as const) if (!(p >= 0 && p <= 1)) errs.push(`${name} must be between 0 and 1`);
  return errs;
}
