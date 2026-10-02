/* M6 step 3: boons as data, and the deal (docs/M6-plan.md; GDD: RPG progression, Boons), the pure rules (unit-tested).
   Eighteen boons in data/boons.json: two for each school, each taken up to twice (its second rank grown, `rank2`), and six
   general ones (Tempered again and again, Second Socket twice). A level deals three: one general always, so the deal
   never runs dry, and two leaning to the build (each school weighted by its spells in the slots, its casts this run, its
   boons taken and a pledge); an attuned mage (both slots one school) draws both from that school while any are left. A
   school boon taken before any spell of its school is a pledge: the next library holds a page of it. The game side is
   boons.ts. */
import boonsData from '../../data/boons.json';
import { SCHOOLS, type School } from '../magic/spellData';

export type BoonArea = 'mage' | 'runes' | 'potions' | 'reagents' | 'cantrip';
export interface BoonDef {
  id: string; name: string;
  /** A school's boon, or a general one's area. */ school?: School; area?: BoonArea;
  /** How many times it can be taken (a school boon twice: its second rank grown). */ max: number;
  icon: string; color: string;
  /** Its numbers at the first rank, and those its second rank changes. */ params: Record<string, number>; rank2?: Record<string, number>;
  text: string; text2?: string; lore: string;
}
export const BOON_DEFS = boonsData.boons as BoonDef[];
export const BOONS = new Map(BOON_DEFS.map(b => [b.id, b]));
export const boon = (id: string) => { const b = BOONS.get(id); if (!b) throw new Error(`no boon "${id}"`); return b; };
const AREAS: BoonArea[] = ['mage', 'runes', 'potions', 'reagents', 'cantrip'];

/** A boon's numbers at `rank` (1 or 2): the second rank's over the first's. */
export const boonParams = (id: string, rank: number) => ({ ...boon(id).params, ...(rank >= 2 ? boon(id).rank2 : {}) });
/** What its card says at `rank`: the first rank's text, or what the second adds. */
export const boonText = (id: string, rank: number) => rank >= 2 ? boon(id).text2 ?? boon(id).text : boon(id).text;

export function validateBoons(defs: BoonDef[] = BOON_DEFS): string[] {
  const errs: string[] = [], seen = new Set<string>();
  for (const b of defs) {
    const at = `boon "${b.id}"`;
    if (seen.has(b.id)) errs.push(`${at} is listed twice`); seen.add(b.id);
    if (!b.name || !b.text || !b.icon) errs.push(`${at} needs a name, a text and an icon`);
    if (!/^#[0-9a-f]{6}$/i.test(b.color ?? '')) errs.push(`${at} needs a colour like #ff7a2a`);
    if (!(b.lore?.length >= 60 && b.lore.length <= 260)) errs.push(`${at} needs lore of 60 to 260 characters`);
    if (!!b.school === !!b.area) errs.push(`${at} needs a school or an area, not both`);
    if (b.school && !SCHOOLS.includes(b.school)) errs.push(`${at} has unknown school "${b.school}"`);
    if (b.area && !AREAS.includes(b.area)) errs.push(`${at} has unknown area "${b.area}"`);
    if (b.school && (b.max !== 2 || !b.rank2 || !b.text2)) errs.push(`${at}, a school's, is taken twice: max 2, its rank2 and text2`);
    if (!(b.max >= 1)) errs.push(`${at} needs a max of 1 or more`);
    for (const [k, v] of Object.entries({ ...b.params, ...b.rank2 })) if (typeof v !== 'number') errs.push(`${at}'s ${k} is not a number`);
    for (const k of Object.keys(b.rank2 ?? {})) if (!(k in b.params)) errs.push(`${at}'s rank2 changes ${k}, which its params lack`);
  }
  for (const s of SCHOOLS) if (defs.filter(b => b.school === s).length !== 2) errs.push(`school ${s} needs two boons`);
  return errs;
}

/** What a school's weight in the deal comes from: its spells in the slots, its casts this run, its boons taken (rank
    counted) and a pledge. Every school keeps a little (`base`), so any can come. */
export interface Lean { slots: readonly (School | null | undefined)[]; casts: Partial<Record<School, number>>; taken: Readonly<Record<string, number>>; pledge?: School | null }
export const LEAN = { base: 1, slot: 3, castsPer: 5, castsMax: 3, boon: 2, pledge: 2 };
export function schoolWeights(l: Lean): Record<School, number> {
  const w = {} as Record<School, number>;
  for (const s of SCHOOLS) {
    const slots = l.slots.filter(x => x === s).length, casts = Math.min(LEAN.castsMax, Math.floor((l.casts[s] ?? 0) / LEAN.castsPer));
    const boons = BOON_DEFS.filter(b => b.school === s).reduce((n, b) => n + (l.taken[b.id] ?? 0), 0);
    w[s] = LEAN.base + LEAN.slot * slots + casts + LEAN.boon * boons + (l.pledge === s ? LEAN.pledge : 0);
  }
  return w;
}

/** What a deal reads: the boons taken (their ranks), the school weights, the school both slots hold (attuned), whether the
    Taster's Spoon is held (Keen Nose isn't dealt then) and whether a waystone lies ahead with a spell to carve (Second
    Socket only then); `only`, a bargain's school (step 11): its two cards from that school. */
export interface DealState { taken: Readonly<Record<string, number>>; weights: Record<School, number>; attuned?: School | null; spoon?: boolean; socketable?: boolean; only?: School | null }
/** A card dealt: the boon, the rank it would reach, and whether the build's lean brought it (its card says so). */
export interface Card { id: string; rank: number; lean: boolean }

/** Whether `b` can be dealt now. */
function open(b: BoonDef, s: DealState) {
  if ((s.taken[b.id] ?? 0) >= b.max) return false;
  if (b.id === 'keenNose' && s.spoon) return false;
  if (b.id === 'secondSocket' && !s.socketable) return false;
  return true;
}
/** Three cards (fewer only if the pool runs out): two of the schools' by the weights (both of the attuned school while it
    has any, or the bargain's), and one general; `R` from 0 to 1. The same state and stream deal the same cards. */
export function dealBoons(s: DealState, R: () => number, defs: BoonDef[] = BOON_DEFS): Card[] {
  const card = (b: BoonDef): Card => ({ id: b.id, rank: (s.taken[b.id] ?? 0) + 1, lean: !!b.school && s.weights[b.school] > LEAN.base });
  const general = defs.filter(b => !b.school && open(b, s)), schools = defs.filter(b => b.school && open(b, s));
  const out: BoonDef[] = [];
  const draw = (list: BoonDef[], weight: (b: BoonDef) => number) => {
    const free = list.filter(b => !out.includes(b)), total = free.reduce((t, b) => t + weight(b), 0);
    if (!free.length || total <= 0) return false;
    let r = R() * total;
    for (const b of free) { r -= weight(b); if (r < 0) { out.push(b); return true; } }
    out.push(free[free.length - 1]); return true;
  };
  const focus = s.only ?? s.attuned;
  for (let k = 0; k < 2; k++) {
    const own = focus ? schools.filter(b => b.school === focus) : [];
    if (!(own.some(b => !out.includes(b)) && draw(own, () => 1)) && !draw(schools, b => s.weights[b.school!])) draw(general, () => 1);
  }
  draw(general, () => 1);
  while (out.length < 3 && (draw(schools, () => 1) || draw(general, () => 1))) { /* (a pool nearly spent: whatever is left) */ }
  return out.map(card);
}

/** A school boon taken while no spell of its school is held: the school the next library will hold a page of. */
export const pledgeFor = (id: string, held: readonly (School | null | undefined)[]) => { const s = boon(id).school; return s && !held.includes(s) ? s : null; };
