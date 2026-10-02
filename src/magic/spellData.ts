/* Spells as data (GDD: Spells): data/spells.json, read and checked here. Pure (no three.js), shared by the game
   and the unit tests. `shape` picks the code that casts a spell (magic/spells.ts); everything else is data, so
   a new spell of a known shape is a new entry. */
import spellsData from '../../data/spells.json';
import type { Rng } from '../rng';

/** The schools of magic (GDD: Magic system). M3 brings Ember, Frost and Storm; M4.1 Hallow and Umbral; M5 the sixth,
    Verdant. */
export type School = 'ember' | 'frost' | 'storm' | 'hallow' | 'umbral' | 'verdant';
export const SCHOOLS: School[] = ['ember', 'frost', 'storm', 'hallow', 'umbral', 'verdant'];
/** How a spell behaves; each is a function in magic/shapes.ts. M4.1's Hallow and Umbral bring the last six. */
export type Shape = 'beam' | 'placed' | 'shotgun' | 'wall' | 'chain' | 'self' | 'zone' | 'smite' | 'orbit' | 'bolt' | 'grasp' | 'mark';
export const SHAPES: Shape[] = ['beam', 'placed', 'shotgun', 'wall', 'chain', 'self', 'zone', 'smite', 'orbit', 'bolt', 'grasp', 'mark'];
/** The params each shape reads; a spell of that shape must give them all. */
export const SHAPE_PARAMS: Record<Shape, string[]> = {
  beam: ['range', 'width'],                                        // how far, and how wide a line it strikes
  placed: ['delay', 'radius', 'ground', 'groundBurn', 'knockback'], // seconds to erupt, ring size, seconds the ground burns, its burn
  shotgun: ['count', 'fan', 'range', 'speed'],                     // bolts, radians between them
  wall: ['ahead', 'width', 'life', 'burst'],                       // how far ahead, how wide, seconds, reach of its shattering
  chain: ['range', 'jumps', 'jumpRange', 'falloff'],               // first strike, leaps, each strike's share of the last
  self: ['life', 'reach', 'knockback', 'every'],                   // seconds, reach beyond the mage, a foe's rest between zaps
  zone: ['radius', 'life', 'every', 'heal'],                       // holy ground: size, seconds, between its touches, the mage's healing (halves, once)
  smite: ['range', 'delay', 'radius'],                             // how far it looks for the strongest foe, seconds to fall, its pillar
  orbit: ['count', 'radius', 'life', 'turn', 'every', 'reach'],    // motes, how far out, seconds, their turning (rad/s), a foe's rest between touches, a mote's reach
  bolt: ['range', 'speed', 'scale'],                               // one slow bolt: how far, how fast, how big
  grasp: ['ahead', 'radius', 'delay'],                             // where the hands rise, how wide, seconds before they close
  mark: ['range', 'life', 'mana', 'obols', 'spread', 'spreadRange'], // the nearest foe marked: how long, mana a hit, obols if it falls, the hex it spreads
};
/** The elemental statuses (magic/status.ts): what the room answers to as well (oil, water, braziers, rune stones). */
export type StatusKind = 'burn' | 'chill' | 'shock';
export const STATUS_KINDS: StatusKind[] = ['burn', 'chill', 'shock'];
/** Every status a spell can apply, with how many stacks or how strongly: the elements, and Hallow's Sanctified (seconds),
    Umbral's Hex (stacks) and the grave's hold, Root (seconds), from M4.1; M5's Verdant Overgrown (`grow`, seconds). */
export type SpellStatus = StatusKind | 'sanct' | 'hex' | 'root' | 'grow';
export const SPELL_STATUSES: SpellStatus[] = [...STATUS_KINDS, 'sanct', 'hex', 'root', 'grow'];
/** Only the elemental part of a set of statuses (what rooms, props and mechanisms hear). */
export const elemental = (s?: Partial<Record<SpellStatus, number>>) => s && Object.fromEntries(Object.entries(s).filter(([k]) => (STATUS_KINDS as string[]).includes(k))) as Partial<Record<StatusKind, number>>;

export interface SpellDef {
  id: string; name: string; school: School; shape: Shape;
  /** Mana to cast, and seconds before it can be cast again. */ mana: number; cooldown: number;
  /** Damage of one hit (a beam's, a shard's, a strike's). */ damage: number;
  status?: Partial<Record<SpellStatus, number>>;
  /** Numbers only the shape reads (range, count, radius, duration...). */ params: Record<string, number>;
  tags: string[]; color: string; icon: string;
  /** What it does, in a few words (the lore card), and its lore. */ text: string; lore: string;
}

export const SPELL_DEFS = spellsData as unknown as SpellDef[];
export const SPELLS = new Map(SPELL_DEFS.map(s => [s.id, s]));

export function spell(id: string) {
  const def = SPELLS.get(id);
  if (!def) throw new Error(`unknown spell "${id}"`);
  return def;
}

/** Problems in data/spells.json; empty when valid. */
export function validateSpells(defs: SpellDef[] = SPELL_DEFS): string[] {
  const errs: string[] = [], ids = new Set<string>();
  for (const s of defs) {
    const at = `spell "${s.id}"`;
    if (ids.has(s.id)) errs.push(`${at} is listed twice`); ids.add(s.id);
    if (!s.name || !s.text) errs.push(`${at} needs a name and a text`);
    if (!(s.lore?.length >= 60 && s.lore.length <= 260)) errs.push(`${at} needs lore of 60 to 260 characters`);
    if (!SCHOOLS.includes(s.school)) errs.push(`${at} has unknown school "${s.school}"`);
    if (!SHAPES.includes(s.shape)) errs.push(`${at} has unknown shape "${s.shape}"`);
    else for (const k of SHAPE_PARAMS[s.shape]) if (!(k in (s.params ?? {}))) errs.push(`${at} (${s.shape}) needs param "${k}"`);
    if (!(s.mana >= 0 && s.cooldown > 0 && s.damage >= 0)) errs.push(`${at} needs mana of 0 or more, a cooldown above 0 and damage of 0 or more`);
    for (const k of Object.keys(s.status ?? {})) if (!SPELL_STATUSES.includes(k as SpellStatus)) errs.push(`${at} has unknown status "${k}"`);
    for (const [k, v] of Object.entries(s.params ?? {})) if (typeof v !== 'number' || !isFinite(v)) errs.push(`${at} param "${k}" must be a number`);
    if (!/^#[0-9a-f]{6}$/i.test(s.color)) errs.push(`${at} has a bad colour`);
    if (!s.icon) errs.push(`${at} needs an icon`);
  }
  return errs;
}

/* ---------- mana (GDD: Magic system) ---------- */

export interface ManaTuning { calm: number; fight: number }
/** Mana regained over `dt` seconds: faster out of a fight than in one. */
export const manaRegen = (dt: number, fighting: boolean, t: ManaTuning) => dt * (fighting ? t.fight : t.calm);

/* ---------- grimoire pages (GDD: Spells) ---------- */

/** Up to `count` spells for grimoire pages: none the mage knows or `skip` lists, each of a different school while
    the schools go round, then any. `lean` (M4.9): the schools the floor's foes are weak to; while the mage holds none of
    them, the first page is of one. */
/** `pledge` (M6: a school boon taken before any spell of its school): a page of that school comes first, whatever else. */
export function pickPages(rng: Pick<Rng, 'shuffle'>, known: readonly (string | null)[], count: number, skip: readonly string[] = [], defs: SpellDef[] = SPELL_DEFS, lean: readonly string[] = [], pledge?: string | null): string[] {
  const pool = rng.shuffle(defs.filter(s => !known.includes(s.id) && !skip.includes(s.id)));
  const out: SpellDef[] = [];
  const pledged = pledge ? pool.find(s => s.school === pledge) : undefined;
  if (pledged && count > 0) out.push(pledged);
  // (M4.9: a mage holding no spell of a school the floor's foes are weak to is offered one first)
  const leans = lean.length && !known.some(id => id && lean.includes(defs.find(d => d.id === id)?.school ?? ''));
  const first = leans ? pool.find(s => lean.includes(s.school)) : undefined;
  if (first && out.length < count && !out.includes(first)) out.push(first);
  for (const s of pool) if (out.length < count && !out.some(o => o.school === s.school)) out.push(s);
  for (const s of pool) if (out.length < count && !out.includes(s)) out.push(s);
  return out.map(s => s.id);
}

/** A library's shelf: the spells given up earlier in the run (latest first) that the mage doesn't know again and
    the lecterns don't already offer, at most `count`. */
export function shelfPages(forgotten: readonly string[], known: readonly (string | null)[], lecterns: readonly string[], count: number): string[] {
  return [...new Set([...forgotten].reverse())].filter(id => !known.includes(id) && !lecterns.includes(id)).slice(0, count);
}
