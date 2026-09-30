/* Loot as data (data/loot.json): what a run starts with, what a cleared room or a fallen enemy leaves
   behind, what urns, coffers, reliquary chests and a vault's hoard hold, and what the merchant sells.
   Pure (no three.js), so the economy can be simulated in the unit tests.

   Resources (GDD: Coins, keys and blast glyphs): obols (coins), bone keys and blast glyphs, each capped. */
import lootData from '../../data/loot.json';
import type { Rng } from '../rng';

export type Resource = 'coins' | 'keys' | 'glyphs';
export const RESOURCES: Resource[] = ['coins', 'keys', 'glyphs'];
/** Things picked up by walking over them. M4.1 adds the soul motes (pale, black and hallowed) and the lodestone shard. */
export type Item = 'halfHeart' | 'heart' | 'coin' | 'purse' | 'key' | 'glyph' | 'mana' | 'paleSoul' | 'blackSoul' | 'hallowedSoul' | 'shard';
export const ITEMS: Item[] = ['halfHeart', 'heart', 'coin', 'purse', 'key', 'glyph', 'mana', 'paleSoul', 'blackSoul', 'hallowedSoul', 'shard'];

/** Soul motes (M4.1; GDD: Items): pale flames kept beside the hearts that take a hit before the hearts do. A pale one
    guards one hit; a black one guards one and hexes the room when it goes; a hallowed one goes last, and gives back half
    a heart at the end of every floor it lives through. */
export type Soul = 'pale' | 'black' | 'hallowed';
export const SOULS: Soul[] = ['pale', 'black', 'hallowed'];
/** Each mote's light, in the room. */
export const SOUL_COLOR: Record<Soul, number> = { pale: 0xcfe0ff, black: 0xa266ff, hallowed: 0xffe39a };
const SOUL_ITEM: Record<Soul, Item> = { pale: 'paleSoul', black: 'blackSoul', hallowed: 'hallowedSoul' };
export const soulItem = (s: Soul) => SOUL_ITEM[s];
export const isSoul = (d: Drop): boolean => d === 'paleSoul' || d === 'blackSoul' || d === 'hallowedSoul';
/** Which of the motes held a hit (or a spell short of mana) takes: the last taken that isn't hallowed, else the last
    hallowed one; -1 when there are none. */
export function soulToLose(souls: readonly Soul[]) {
  for (let i = souls.length - 1; i >= 0; i--) if (souls[i] !== 'hallowed') return i;
  return souls.length - 1;
}
/** Containers left on the floor: a coffer opens when walked into, a reliquary chest is sealed by a ward. */
export type Container = 'coffer' | 'chest';
/** Anything that can lie on the floor. */
export type Drop = Item | Container;
export const DROPS: Drop[] = [...ITEMS, 'coffer', 'chest'];

/** A loot table: with `chance` (default always), `count` items (default one), each picked by weight. */
export interface LootTable { chance?: number; count?: [number, number]; weights: Partial<Record<Item, number>> }
/** `remains` and `bundle`: what bone piles, skull heaps (poorer than an urn) and grave sacks leave (M3.6); `hoard`, what
    an offering heap spills to a blast (M4.1). */
export type TableName = 'urn' | 'sealedUrn' | 'coffer' | 'chest' | 'vaultHoard' | 'secretHoard' | 'remains' | 'bundle' | 'hoard';
export const TABLES: TableName[] = ['urn', 'sealedUrn', 'coffer', 'chest', 'vaultHoard', 'secretHoard', 'remains', 'bundle', 'hoard'];

/** What the merchant sells: an artifact, or an item. */
/** What a trader sells: an artifact, an item, or (M4.2, the Wandering Merchant's crow) the floor's map or where its secret
    room lies. */
export type Ware = 'artifact' | Item | 'map' | 'secret';
/** The merchant's stock: how many wares (the artifact counts), their prices in obols, and how the wares
    after the artifact are picked. */
export interface MerchantData { wares: [number, number]; prices: Partial<Record<Ware, number>>; weights: Partial<Record<Item, number>> }
/** Most wares a shop has room for. */
export const MAX_WARES = 4;

export interface LootData extends Record<TableName, LootTable> {
  /** What every run starts with. */ start: Record<Resource, number>;
  /** Most of each resource the mage can carry. */ cap: number;
  /** Obols in a purse. */ purse: number;
  /** Mana in a mana vial. */ manaVial: number;
  /** Mana a lodestone shard gives (it also ends every spell's cooldown). */ shard: number;
  /** A cleared room leaves one drop with this chance, picked by weight. */ roomClear: { chance: number; weights: Partial<Record<Drop, number>> };
  /** Chance a fallen enemy leaves an obol. */ enemyCoin: number;
  /** Chance a reliquary chest is gilded: it holds an artifact outside the floor's budget, and only a bone
      key opens it. */ gildedChest: number;
  /** A secret room without an artifact: coffers and reliquary chests beside its hoard (`secretHoard`). */
  secretRoom: { coffers: number; chests: number };
  /** Obols the shrine asks to cleanse a curse, paid once the curse is put down. */ shrine: { price: number };
  /** M4.2: the Wandering Merchant's prices, and the soul motes in the beast's packs (by weight). */
  wanderer: { prices: Partial<Record<Ware, number>>; souls: Partial<Record<Item, number>> };
  /** Grimoire pages: how many a library's lecterns offer, how many given-up spells its shelf sells back and for how
      many obols, and the chance a cleared room leaves one. */ grimoire: { lecterns: number; shelf: number; rebuy: number; clearChance: number };
  merchant: MerchantData;
}
export const LOOT = lootData as LootData;

/** What an item gives: half hearts, or resources. */
export function dropValue(d: Item, loot: LootData = LOOT): { hearts?: number; mana?: number; soul?: Soul; shard?: number } & Partial<Record<Resource, number>> {
  switch (d) {
    case 'halfHeart': return { hearts: 1 };
    case 'heart': return { hearts: 2 };
    case 'coin': return { coins: 1 };
    case 'purse': return { coins: loot.purse };
    case 'key': return { keys: 1 };
    case 'glyph': return { glyphs: 1 };
    case 'mana': return { mana: loot.manaVial };
    case 'paleSoul': return { soul: 'pale' };
    case 'blackSoul': return { soul: 'black' };
    case 'hallowedSoul': return { soul: 'hallowed' };
    case 'shard': return { shard: loot.shard };
  }
}

/** Weights with the soul motes' scaled by `souls` (a floor's `souls` in data/floors.json: the deep floors give more). */
function soulWeighted<K extends string>(w: Partial<Record<K, number>>, souls: number): Record<K, number> {
  if (souls === 1) return w as Record<K, number>;
  const out = { ...w } as Record<K, number>;
  for (const k of Object.keys(out) as K[]) if (isSoul(k as Drop)) out[k] *= souls;
  return out;
}
/** What a cleared room leaves behind, if anything: an item, or now and then a coffer or a chest. */
export function rollRoomClear(rng: Rng, loot: LootData = LOOT, souls = 1): Drop | null {
  return rng.chance(loot.roomClear.chance) ? rng.weighted(soulWeighted(loot.roomClear.weights, souls)) : null;
}
/** What an urn, a rune-sealed urn, a coffer or a chest holds (possibly nothing). */
export function rollTable(rng: Rng, name: TableName, loot: LootData = LOOT, souls = 1): Item[] {
  const t = loot[name];
  if (t.chance !== undefined && !rng.chance(t.chance)) return [];
  const [lo, hi] = t.count ?? [1, 1], w = soulWeighted(t.weights, souls);
  return Array.from({ length: rng.int(lo, hi) }, () => rng.weighted(w));
}
/** A reliquary chest forced open by a blast: the ward burns half of what's inside (never all of it). */
export const afterBurning = <T>(contents: T[]) => contents.slice(0, Math.max(1, Math.floor(contents.length / 2)));
/** Now and then a fallen enemy leaves an obol. */
export function rollEnemyDrop(rng: Rng, loot: LootData = LOOT): Drop | null {
  return rng.chance(loot.enemyCoin) ? 'coin' : null;
}

/** The merchant's stock: the artifact first when he has one, then items by weight (the same item can come
    twice), 3 or 4 wares in all. */
export function rollWares(rng: Rng, withArtifact: boolean, loot: LootData = LOOT, souls = 1): Ware[] {
  const m = loot.merchant, n = rng.int(m.wares[0], m.wares[1]), w = soulWeighted(m.weights, souls);
  const wares: Ware[] = withArtifact ? ['artifact'] : [];
  while (wares.length < n) wares.push(rng.weighted(w));
  return wares;
}
/** A ware's price in obols. */
export const priceOf = (ware: Ware, loot: LootData = LOOT) => loot.merchant.prices[ware] ?? 0;

/** Problems in data/loot.json; empty when valid. */
export function validateLoot(loot: LootData = LOOT): string[] {
  const errs: string[] = [];
  for (const r of RESOURCES) if (!(loot.start[r] >= 0 && loot.start[r] <= loot.cap)) errs.push(`start ${r} must be between 0 and the cap`);
  if (!(loot.cap > 0)) errs.push('the cap must be above 0');
  if (!(loot.purse > 1)) errs.push('a purse must hold more than one obol');
  if (!(loot.manaVial > 0)) errs.push('a mana vial must hold some mana');
  if (!(loot.shard > 0)) errs.push('a lodestone shard must give some mana');
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
  for (const [name, p] of [['room clear chance', loot.roomClear.chance], ['enemy coin chance', loot.enemyCoin], ['gilded chest chance', loot.gildedChest]] as const) if (!(p >= 0 && p <= 1)) errs.push(`${name} must be between 0 and 1`);
  if (!(Number.isInteger(loot.shrine?.price) && loot.shrine.price > 0)) errs.push("the shrine's price must be a whole number above 0");
  const gr = loot.grimoire;
  if (!gr) errs.push('the grimoire is missing');
  else {
    if (!(Number.isInteger(gr.lecterns) && gr.lecterns >= 1 && gr.lecterns <= 3)) errs.push('a library has 1 to 3 lecterns');
    if (!(Number.isInteger(gr.shelf) && gr.shelf >= 0 && gr.shelf <= 2)) errs.push("a library's shelf holds 0 to 2 pages");
    if (!(Number.isInteger(gr.rebuy) && gr.rebuy > 0)) errs.push('a page on the shelf must cost a whole number of obols above 0');
    if (!(gr.clearChance >= 0 && gr.clearChance <= 1)) errs.push("a room's page chance must be between 0 and 1");
  }
  const m = loot.merchant;
  if (!m) errs.push('the merchant is missing');
  else {
    weights('merchant', m.weights, ITEMS);
    if (!(m.wares[0] >= 1 && m.wares[1] >= m.wares[0] && m.wares[1] <= MAX_WARES)) errs.push(`merchant wares must be [least, most], from 1 to ${MAX_WARES}`);
    for (const w of ['artifact', ...Object.keys(m.weights)]) {
      const p = m.prices[w as Ware];
      if (!(p !== undefined && Number.isInteger(p) && p > 0)) errs.push(`merchant price for ${w} must be a whole number above 0`);
    }
  }
  return errs;
}
