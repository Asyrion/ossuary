/* M6 step 7: runes, as rules (docs/archive/M6-plan.md, decisions 9 and 10; GDD: Magic system, Runes). Pure, unit-tested; the game
   side is magic/runes.ts. Seven runes in data/runes.json, each fitting a spell by its shape (not by tags): Thrice, Reprise,
   Seeking, Wide, Quicken, Vein and Lasting. A slot's socket holds one (two with Second Socket, never the same rune twice);
   `runedDef` is the spell as its runes make it for one cast (a frozen copy, the base def itself with none), read through
   `slotDef` (cost.ts) by the cast, the HUD, the hands and the panel alike; `reprisedDef` is Reprise's second, softer cast;
   `payment` is the order a cast is paid in. */
import runesData from '../../data/runes.json';
import { SHAPES, SPELL_DEFS, shareStatus, type Shape, type SpellDef, type SpellStatus } from './spellData';
import type { Rng } from '../rng';

export type RuneId = 'thrice' | 'reprise' | 'seeking' | 'wide' | 'quicken' | 'vein' | 'lasting';
export const RUNE_IDS: readonly RuneId[] = ['thrice', 'reprise', 'seeking', 'wide', 'quicken', 'vein', 'lasting'];
export interface RuneDef { id: RuneId; name: string; color: string; icon: string; shapes: Shape[]; params: Record<string, number>; text: string; lore: string }
export const RUNE_DEFS = runesData.runes as unknown as RuneDef[];
const BY_ID = new Map(RUNE_DEFS.map(r => [r.id, r]));
export const rune = (id: RuneId) => { const r = BY_ID.get(id); if (!r) throw new Error(`no rune "${id}"`); return r; };
export const isRune = (id: string): id is RuneId => BY_ID.has(id as RuneId);
/** How many shapes there are: a rune taking them all fits every spell. */
export const SHAPE_COUNT = SHAPES.length;

/** What Wide makes larger in each shape it takes (a wall grows longer: its width across). */
export const WIDENS: Partial<Record<Shape, string>> = { placed: 'radius', zone: 'radius', smite: 'radius', grasp: 'radius', orbit: 'radius', wall: 'width' };
/** What Lasting makes last, in each shape it takes: a param, or (the grasp) the root it holds with. */
export const LASTS: Partial<Record<Shape, string>> = { placed: 'ground', wall: 'life', self: 'life', zone: 'life', orbit: 'life', mark: 'life', grasp: 'root', lantern: 'life' };

/** Whether rune `id` fits spell `def` (by its shape). */
export const runeFits = (id: RuneId, def: Pick<SpellDef, 'shape'>) => rune(id).shapes.includes(def.shape);
/** The runes spell `def` takes, in the data's order. */
export const runesFor = (def: Pick<SpellDef, 'shape'>) => RUNE_DEFS.filter(r => r.shapes.includes(def.shape)).map(r => r.id);

/** M6 step 8: which rune a drop or a ware is. With chance `lean` one that fits a spell in `slotted` (when any fits), else
    any of the seven; both draws are made either way, so a seed replays the same draws whatever the hand. */
export function pickRune(rng: Rng, slotted: readonly Pick<SpellDef, 'shape'>[], lean: number): RuneId {
  const leans = rng.next() < lean, at = rng.next();
  const fitting = RUNE_IDS.filter(id => slotted.some(d => runeFits(id, d)));
  const pool = leans && fitting.length ? fitting : RUNE_IDS;
  return pool[Math.min(pool.length - 1, Math.floor(at * pool.length))];
}

/** M6 step 9: a waystone's pair, two different runes dealt as `pickRune` deals one (a twin drawn again, then the next of
    the seven). */
export function pickPair(rng: Rng, slotted: readonly Pick<SpellDef, 'shape'>[], lean: number): [RuneId, RuneId] {
  const a = pickRune(rng, slotted, lean);
  let b = pickRune(rng, slotted, lean);
  for (let i = 0; i < 6 && b === a; i++) b = pickRune(rng, slotted, lean);
  if (b === a) b = RUNE_IDS[(RUNE_IDS.indexOf(a) + 1) % RUNE_IDS.length];
  return [a, b];
}

/** A slot's socket: how many runes it holds, and those carved. */
export interface Socket { size: number; runes: RuneId[] }
/** Why rune `id` can't be carved into `socket` for spell `def` (null: it can). */
export function canCarve(socket: Socket, id: RuneId, def: Pick<SpellDef, 'shape'>): 'fit' | 'full' | 'twice' | null {
  if (!runeFits(id, def)) return 'fit';
  if (socket.runes.includes(id)) return 'twice';
  if (socket.runes.length >= socket.size) return 'full';
  return null;
}

const r1 = (v: number) => Math.round(v * 10) / 10, r2 = (v: number) => Math.round(v * 100) / 100;
const roundStatus = (s: Partial<Record<SpellStatus, number>>) => { for (const k of Object.keys(s) as SpellStatus[]) s[k] = r1(s[k]!); return s; };

/** Spell `def` as `runes` make it, for one cast: Quicken (sooner, dearer), Wide (larger, softer), Lasting (longer, dearer);
    Thrice, Seeking and Reprise ride along in `runes` for the shapes and the cast to read. Mana is whole, the cooldown to a
    hundredth, damage and statuses to a tenth. The base def itself when no rune is carved; never changes the base. */
export function runedDef(def: SpellDef, runes: readonly RuneId[]): SpellDef {
  if (!runes.length) return def;
  let mana = def.mana, cooldown = def.cooldown, damage = def.damage;
  const params = { ...def.params }, status = def.status ? { ...def.status } : undefined;
  for (const id of runes) {
    const P = rune(id).params;
    if (id === 'quicken') { cooldown *= P.cooldownMul; mana *= P.manaMul; }
    else if (id === 'wide') { const k = WIDENS[def.shape]; if (k) params[k] = r2(params[k] * P.sizeMul); damage *= P.damageMul; }
    else if (id === 'lasting') {
      const k = LASTS[def.shape];
      if (k === 'root') { if (status?.root) status.root *= P.lastMul; } else if (k) params[k] = r2(params[k] * P.lastMul);
      mana *= P.manaMul;
    }
  }
  return Object.freeze({ ...def, mana: Math.round(mana), cooldown: r2(cooldown), damage: r1(damage), params: Object.freeze(params),
    status: status && Object.freeze(roundStatus(status)), runes: Object.freeze([...runes]) }) as SpellDef;
}

/** Reprise's second cast of `def`: its damage and statuses at `share` (stacks rounded up), a seal's burning ground too; a
    zone mends nothing; marked as a reprise (a Toll's marks another foe). */
export function reprisedDef(def: SpellDef, share: number): SpellDef {
  const params = { ...def.params };
  if ('heal' in params) params.heal = 0;
  if ('groundBurn' in params) params.groundBurn = r1(params.groundBurn * share);
  return Object.freeze({ ...def, damage: r1(def.damage * share), status: def.status && Object.freeze(shareStatus(def.status, share)), params: Object.freeze(params), reprise: true }) as SpellDef;
}

/** How a cast is paid: nothing (a free cast), mana, Vein's half heart for what mana lacks, a soul mote for the rest, or
    not at all (null: refused). Vein never takes the last half heart. */
export type Payment = 'free' | 'mana' | 'vein' | 'soul';
export interface PayState { cost: number; mana: number; endless?: boolean; vein: boolean; hp: number; halves: number; souls: number }
export function payment(p: PayState): Payment | null {
  if (p.cost <= 0) return 'free';
  if (p.endless || p.mana >= p.cost) return 'mana';
  if (p.vein && p.hp > p.halves) return 'vein';
  if (p.souls > 0) return 'soul';
  return null;
}

/** Problems in data/runes.json (and in what the spells can take); empty when valid. */
export function validateRunes(defs: RuneDef[] = RUNE_DEFS, spells: SpellDef[] = SPELL_DEFS): string[] {
  const errs: string[] = [], seen = new Set<string>();
  for (const r of defs) {
    const at = `rune "${r.id}"`;
    if (seen.has(r.id)) errs.push(`${at} is listed twice`); seen.add(r.id);
    if (!RUNE_IDS.includes(r.id)) errs.push(`${at} isn't one the game knows (${RUNE_IDS.join(', ')})`);
    if (!r.name || !r.text || !r.icon) errs.push(`${at} needs a name, a text and an icon`);
    if (!/^#[0-9a-f]{6}$/i.test(r.color ?? '')) errs.push(`${at} needs a colour like #f0d080`);
    if (!(r.lore?.length >= 60 && r.lore.length <= 260)) errs.push(`${at} needs lore of 60 to 260 characters`);
    if (!r.shapes?.length) errs.push(`${at} fits no shape`);
    for (const s of r.shapes ?? []) {
      if (!SHAPES.includes(s)) errs.push(`${at} fits unknown shape "${s}"`);
      if (r.id === 'wide' && !WIDENS[s]) errs.push(`${at} fits ${s}, but WIDENS says nothing of it`);
      if (r.id === 'lasting' && !LASTS[s]) errs.push(`${at} fits ${s}, but LASTS says nothing of it`);
    }
    for (const [k, v] of Object.entries(r.params ?? {})) if (typeof v !== 'number') errs.push(`${at}'s ${k} is not a number`);
  }
  for (const s of spells) if (defs.filter(r => r.shapes?.includes(s.shape)).length < 3) errs.push(`spell "${s.id}" (${s.shape}) takes fewer than three runes`);
  return errs;
}
