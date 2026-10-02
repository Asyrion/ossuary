/* M6 step 3: boons as data, and the deal (docs/M6-plan.md; GDD: RPG progression, Boons), the pure rules (unit-tested).
   Eighteen boons in data/boons.json: two for each school, each taken up to twice (its second rank grown, `rank2`), and six
   general ones (Tempered again and again, Second Socket twice). A level deals three: one general always, so the deal
   never runs dry, and two leaning to the build (each school weighted by its spells in the slots, its casts this run, its
   boons taken and a pledge); an attuned mage (both slots one school) draws both from that school while any are left. A
   school boon taken before any spell of its school is a pledge: the next library holds a page of it. The game side is
   boons.ts. M6 step 5: what the school boons change, as rules: the statuses' tuning (`boonTuning`: Deep Winter's freeze,
   Gathering Dark's hex), how long a status holds (`statusMul`: Banked Coals, Perennial, Laid Bare) and which spells a boon
   touches (`touches`, `boonsTouching`: the spell's panel lists them). */
import boonsData from '../../data/boons.json';
import { SCHOOLS, SHAPES, SPELL_STATUSES, type School, type Shape, type SpellDef, type SpellStatus } from '../magic/spellData';
import type { MagicTuning } from '../magic/status';
import { CFG } from '../config';

export type BoonArea = 'mage' | 'runes' | 'potions' | 'reagents' | 'cantrip';
export interface BoonDef {
  id: string; name: string;
  /** A school's boon, or a general one's area. */ school?: School; area?: BoonArea;
  /** How many times it can be taken (a school boon twice: its second rank grown). */ max: number;
  icon: string; color: string;
  /** Its numbers at the first rank, and those its second rank changes. */ params: Record<string, number>; rank2?: Record<string, number>;
  text: string; text2?: string; lore: string;
  /** A school boon's reach (step 5): the spells it changes, by the statuses they bring, their shape or their school. */
  touches?: { status?: SpellStatus[]; shape?: Shape[]; school?: School[] };
}
export const BOON_DEFS = boonsData.boons as BoonDef[];
export const BOONS = new Map(BOON_DEFS.map(b => [b.id, b]));
export const boon = (id: string) => { const b = BOONS.get(id); if (!b) throw new Error(`no boon "${id}"`); return b; };
const AREAS: BoonArea[] = ['mage', 'runes', 'potions', 'reagents', 'cantrip'];

/** A boon's numbers at `rank` (1 or 2): the second rank's over the first's (made once a rank: the hooks ask every step). */
const kept = new Map<string, Record<string, number>>();
export function boonParams(id: string, rank: number): Readonly<Record<string, number>> {
  const key = id + (rank >= 2 ? ':2' : ':1');
  let p = kept.get(key);
  if (!p) { p = { ...boon(id).params, ...(rank >= 2 ? boon(id).rank2 : {}) }; kept.set(key, p); }
  return p;
}
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
    const t = b.touches;
    if (b.school && !(t?.status?.length || t?.shape?.length || t?.school?.length)) errs.push(`${at}, a school's, needs \`touches\`: the statuses, shapes or schools it changes`);
    for (const k of t?.status ?? []) if (!SPELL_STATUSES.includes(k)) errs.push(`${at} touches unknown status "${k}"`);
    for (const k of t?.shape ?? []) if (!SHAPES.includes(k)) errs.push(`${at} touches unknown shape "${k}"`);
    for (const k of t?.school ?? []) if (!SCHOOLS.includes(k)) errs.push(`${at} touches unknown school "${k}"`);
  }
  for (const s of SCHOOLS) if (defs.filter(b => b.school === s).length !== 2) errs.push(`school ${s} needs two boons`);
  return errs;
}

/** What a school's weight in the deal comes from: its spells in the slots, its casts this run, its boons taken (rank
    counted) and a pledge. Every school keeps a little (`base`), so any can come. */
export interface Lean { slots: readonly (School | null | undefined)[]; casts: Partial<Record<School, number>>; taken: Readonly<Record<string, number>>; pledge?: School | null }
export const LEAN = CFG.boons.lean;
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
export interface DealState { taken: Readonly<Record<string, number>>; weights: Record<School, number>; attuned?: School | null; spoon?: boolean; socketable?: boolean; only?: School | null;
  /** Boons held back from the deal (default `NOT_YET`). */ hold?: ReadonlySet<string> }
/** General boons whose hooks come with a later step of M6 (Second Socket with the runes, step 7): not dealt until they act,
    so no card is dead. Each step takes its own off this list. */
export const NOT_YET: ReadonlySet<string> = new Set(['secondSocket']);
/** A card dealt: the boon, the rank it would reach, and whether the build's lean brought it (its card says so). */
export interface Card { id: string; rank: number; lean: boolean }

/** Whether `b` can be dealt now. */
function open(b: BoonDef, s: DealState) {
  if ((s.taken[b.id] ?? 0) >= b.max || (s.hold ?? NOT_YET).has(b.id)) return false;
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

/* ---------- step 5: what the school boons change ---------- */

/** The statuses' tuning with the boons `taken`: Deep Winter freezes on fewer stacks and (rank II) holds the freeze longer;
    Gathering Dark lets a hex gather more stacks and fade slower. `T` itself when neither is taken. */
export function boonTuning(T: MagicTuning, taken: Readonly<Record<string, number>>): MagicTuning {
  const dw = taken.deepWinter ?? 0, gd = taken.gatheringDark ?? 0;
  if (!dw && !gd) return T;
  const out = { ...T, chill: { ...T.chill }, hex: { ...T.hex } };
  if (dw) { const p = boonParams('deepWinter', dw); out.chill.freezeAt = Math.min(T.chill.freezeAt, p.freezeAt); out.chill.freezeTime = T.chill.freezeTime * p.frozenMul; }
  if (gd) { const p = boonParams('gatheringDark', gd); out.hex.max = Math.max(T.hex.max, p.maxHex); out.hex.time = T.hex.time * p.fadeMul; }
  return out;
}
/** How much longer a status holds with the boons `taken`: Burn (Banked Coals), Overgrown (Perennial), Sanctified (Laid
    Bare's second rank). */
export function statusMul(kind: SpellStatus, taken: Readonly<Record<string, number>>) {
  const by = (id: string, key: string) => { const r = taken[id] ?? 0; return r ? boonParams(id, r)[key] ?? 1 : 1; };
  return kind === 'burn' ? by('bankedCoals', 'burnMul') : kind === 'grow' ? by('perennial', 'growMul') : kind === 'sanct' ? by('laidBare', 'sanctMul') : 1;
}
/** Whether boon `b` changes spell `def`. */
export const touches = (b: BoonDef, def: Pick<SpellDef, 'school' | 'shape' | 'status'>) => !!b.touches && (
  !!b.touches.school?.includes(def.school) || !!b.touches.shape?.includes(def.shape)
  || Object.keys(def.status ?? {}).some(k => b.touches!.status?.includes(k as SpellStatus)));
/** The boons taken that change spell `def`, in the order of the data. */
export const boonsTouching = (def: Pick<SpellDef, 'school' | 'shape' | 'status'>, taken: Readonly<Record<string, number>>) =>
  BOON_DEFS.filter(b => (taken[b.id] ?? 0) > 0 && touches(b, def)).map(b => b.id);

/* ---------- step 6: the general boons' rules ---------- */

/** Afterglow: the share of a spell's statuses its next cantrip casts carry. Stacks (Chill, Hex) round up, so a spell's one
    stack still carries one; seconds are shared as they are. */
export function afterglowOf(status: Partial<Record<SpellStatus, number>> | undefined, share: number) {
  const out: Partial<Record<SpellStatus, number>> = {};
  for (const [k, v] of Object.entries(status ?? {}) as [SpellStatus, number][]) out[k] = k === 'chill' || k === 'hex' ? Math.ceil(v * share) : Math.round(v * share * 10) / 10;
  return out;
}
