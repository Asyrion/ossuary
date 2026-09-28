/* Spells as data (GDD: Spells): data/spells.json, read and checked here. Pure (no three.js), shared by the game
   and the unit tests. `shape` picks the code that casts a spell (magic/spells.ts); everything else is data, so
   a new spell of a known shape is a new entry. */
import spellsData from '../../data/spells.json';

/** The schools of magic (GDD: Magic system). M3 brings Ember, Frost and Storm; Hallow and Umbral follow. */
export type School = 'ember' | 'frost' | 'storm' | 'hallow' | 'umbral';
export const SCHOOLS: School[] = ['ember', 'frost', 'storm', 'hallow', 'umbral'];
/** How a spell behaves; each is a function in magic/spells.ts. */
export type Shape = 'beam' | 'placed' | 'shotgun' | 'wall' | 'chain' | 'self';
export const SHAPES: Shape[] = ['beam', 'placed', 'shotgun', 'wall', 'chain', 'self'];
/** The params each shape reads; a spell of that shape must give them all. */
export const SHAPE_PARAMS: Record<Shape, string[]> = {
  beam: ['range', 'width'],                                        // how far, and how wide a line it strikes
  placed: ['delay', 'radius', 'ground', 'groundBurn', 'knockback'], // seconds to erupt, ring size, seconds the ground burns, its burn
  shotgun: ['count', 'fan', 'range', 'speed'],                     // bolts, radians between them
  wall: ['ahead', 'width', 'life', 'burst'],                       // how far ahead, how wide, seconds, reach of its shattering
  chain: ['range', 'jumps', 'jumpRange', 'falloff'],               // first strike, leaps, each strike's share of the last
  self: ['life', 'reach', 'knockback', 'every'],                   // seconds, reach beyond the mage, a foe's rest between zaps
};
/** Status effects a spell can apply (magic/status.ts), with how many stacks or how strongly. */
export type StatusKind = 'burn' | 'chill' | 'shock';
export const STATUS_KINDS: StatusKind[] = ['burn', 'chill', 'shock'];

export interface SpellDef {
  id: string; name: string; school: School; shape: Shape;
  /** Mana to cast, and seconds before it can be cast again. */ mana: number; cooldown: number;
  /** Damage of one hit (a beam's, a shard's, a strike's). */ damage: number;
  status?: Partial<Record<StatusKind, number>>;
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
    for (const k of Object.keys(s.status ?? {})) if (!STATUS_KINDS.includes(k as StatusKind)) errs.push(`${at} has unknown status "${k}"`);
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
