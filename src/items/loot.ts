/* Loot as data (data/loot.json): what a run starts with, what a cleared room or a fallen enemy leaves
   behind, and what urns, coffers and reliquary chests hold. Pure (no three.js), so the economy can be
   simulated in the unit tests.

   Resources (GDD: Coins, keys and blast glyphs): obols (coins), bone keys and blast glyphs, each capped. */
import lootData from '../../data/loot.json';
import type { Rng } from '../rng';

export type Resource = 'coins' | 'keys' | 'glyphs';
export const RESOURCES: Resource[] = ['coins', 'keys', 'glyphs'];
/** Things picked up by walking over them. */
export type Item = 'halfHeart' | 'heart' | 'coin' | 'purse' | 'key' | 'glyph';
export const ITEMS: Item[] = ['halfHeart', 'heart', 'coin', 'purse', 'key', 'glyph'];
/** Containers left on the floor: a coffer opens when walked into, a reliquary chest is sealed by a ward. */
export type Container = 'coffer' | 'chest';
/** Anything that can lie on the floor. */
export type Drop = Item | Container;
export const DROPS: Drop[] = [...ITEMS, 'coffer', 'chest'];

/** A loot table: with `chance` (default always), `count` items (default one), each picked by weight. */
export interface LootTable { chance?: number; count?: [number, number]; weights: Partial<Record<Item, number>> }
export type TableName = 'urn' | 'sealedUrn' | 'coffer' | 'chest';
export const TABLES: TableName[] = ['urn', 'sealedUrn', 'coffer', 'chest'];

export interface LootData extends Record<TableName, LootTable> {
  /** What every run starts with. */ start: Record<Resource, number>;
  /** Most of each resource the mage can carry. */ cap: number;
  /** Obols in a purse. */ purse: number;
  /** A cleared room leaves one drop with this chance, picked by weight. */ roomClear: { chance: number; weights: Partial<Record<Drop, number>> };
  /** Chance a fallen enemy leaves an obol. */ enemyCoin: number;
}
export const LOOT = lootData as LootData;

/** What an item gives: half hearts, or resources. */
export function dropValue(d: Item, loot: LootData = LOOT): { hearts?: number } & Partial<Record<Resource, number>> {
  switch (d) {
    case 'halfHeart': return { hearts: 1 };
    case 'heart': return { hearts: 2 };
    case 'coin': return { coins: 1 };
    case 'purse': return { coins: loot.purse };
    case 'key': return { keys: 1 };
    case 'glyph': return { glyphs: 1 };
  }
}

/** What a cleared room leaves behind, if anything: an item, or now and then a coffer or a chest. */
export function rollRoomClear(rng: Rng, loot: LootData = LOOT): Drop | null {
  return rng.chance(loot.roomClear.chance) ? rng.weighted(loot.roomClear.weights as Record<Drop, number>) : null;
}
/** What an urn, a rune-sealed urn, a coffer or a chest holds (possibly nothing). */
export function rollTable(rng: Rng, name: TableName, loot: LootData = LOOT): Item[] {
  const t = loot[name];
  if (t.chance !== undefined && !rng.chance(t.chance)) return [];
  const [lo, hi] = t.count ?? [1, 1];
  return Array.from({ length: rng.int(lo, hi) }, () => rng.weighted(t.weights as Record<Item, number>));
}
/** A reliquary chest forced open by a blast: the ward burns half of what's inside (never all of it). */
export const afterBurning = <T>(contents: T[]) => contents.slice(0, Math.max(1, Math.floor(contents.length / 2)));
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
  const weights = (name: string, w: Record<string, number>, known: readonly string[]) => {
    for (const k of Object.keys(w)) if (!known.includes(k)) errs.push(`${name} drop "${k}" is unknown`);
    if (!Object.values(w).some(v => v > 0) || Object.values(w).some(v => v < 0)) errs.push(`${name} weights must be positive`);
  };
  weights('room clear', loot.roomClear.weights, DROPS);
  for (const name of TABLES) {
    const t = loot[name];
    if (!t) { errs.push(`the ${name} table is missing`); continue; }
    weights(name, t.weights, ITEMS);
    if (t.chance !== undefined && !(t.chance >= 0 && t.chance <= 1)) errs.push(`${name} chance must be between 0 and 1`);
    if (t.count && !(t.count[0] >= 1 && t.count[1] >= t.count[0])) errs.push(`${name} count must be [least, most], at least 1`);
  }
  for (const [name, p] of [['room clear chance', loot.roomClear.chance], ['enemy coin chance', loot.enemyCoin]] as const) if (!(p >= 0 && p <= 1)) errs.push(`${name} must be between 0 and 1`);
  return errs;
}
