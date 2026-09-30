/* Spell knowledge (M3.7, GDD: Spells, Spell knowledge): how well the mage knows each spell. A spell is seen when its
   page is first approached, learned when a page of it is taken, used after enough casts over all runs, and upgraded
   when runes or school mastery change it (M6). What each stage shows is in ui/spellPanel.ts. These are the pure rules
   (unit-tested); magic/memory.ts keeps them in the browser between runs. */
import type { Reaction } from './status';
import type { School, SpellDef } from './spellData';

export type Stage = 'unknown' | 'seen' | 'learned' | 'used' | 'upgraded';
export const STAGES: readonly Stage[] = ['unknown', 'seen', 'learned', 'used', 'upgraded'];

/** What the mage knows of one spell. */
export interface Known {
  seen: boolean; learned: boolean;
  /** Times cast, over all runs. */ casts: number;
  /** What has changed it (runes, school mastery: M6). */ upgrades: string[];
}
export type Knowledge = Record<string, Known>;

export const blank = (): Known => ({ seen: false, learned: false, casts: 0, upgrades: [] });

/** The stage a record has reached; `usedCasts` casts of a learned spell make it used. */
export function stageOf(k: Known | undefined, usedCasts: number): Stage {
  if (!k) return 'unknown';
  if (k.upgrades.length) return 'upgraded';
  if (k.learned) return k.casts >= usedCasts ? 'used' : 'learned';
  return k.seen ? 'seen' : 'unknown';
}
/** Is stage `s` at `t` or past it? */
export const atLeast = (s: Stage, t: Stage) => STAGES.indexOf(s) >= STAGES.indexOf(t);

/** What happens to the record of `id`; each returns whether anything changed (so there is something to save). */
export function see(kn: Knowledge, id: string) { const k = kn[id] ??= blank(); if (k.seen) return false; k.seen = true; return true; }
export function learn(kn: Knowledge, id: string) { const k = kn[id] ??= blank(); if (k.learned) return false; k.seen = k.learned = true; return true; }
export function cast(kn: Knowledge, id: string) { const k = kn[id] ??= blank(); k.seen = k.learned = true; k.casts++; return true; }
export function upgrade(kn: Knowledge, id: string, what: string) { const k = kn[id] ??= blank(); if (k.upgrades.includes(what)) return false; k.upgrades.push(what); return true; }
/** Bring the record of `id` to `stage` at least (the dev menu, tests). */
export function reach(kn: Knowledge, id: string, stage: Stage, usedCasts: number) {
  const k = kn[id] ??= blank();
  if (atLeast(stage, 'seen')) k.seen = true;
  if (atLeast(stage, 'learned')) k.learned = true;
  if (atLeast(stage, 'used')) k.casts = Math.max(k.casts, usedCasts);
  if (stage === 'upgraded' && !k.upgrades.length) k.upgrades.push('dev');
}

/** Knowledge read back from storage: anything malformed is left out, never thrown. */
export function parse(text: string | null | undefined): Knowledge {
  const out: Knowledge = {};
  let raw: unknown;
  try { raw = JSON.parse(text ?? '{}'); } catch { return out; }
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const r = v as Partial<Known>;
    out[id] = { seen: !!r.seen, learned: !!r.learned, casts: Number.isFinite(r.casts) ? Math.max(0, Math.floor(r.casts!)) : 0, upgrades: Array.isArray(r.upgrades) ? r.upgrades.filter(u => typeof u === 'string') : [] };
  }
  return out;
}

/** The school whose status each status is (Burn is Ember's, Chill Frost's, Shock Storm's, Sanctified Hallow's, Hex
    Umbral's). */
const SCHOOL_OF = { burn: 'ember', chill: 'frost', shock: 'storm', sanct: 'hallow', hex: 'umbral' } as const;
/** The reactions a spell can set off with another school's status (magic/status.ts): a frozen foe shocked, or a
    shocked foe frozen, shatters; a burning foe shocked, or a shocked foe set burning, overloads; a sanctified foe
    hexed, or a hexed one sanctified, is eclipsed; a hexed foe set burning, or a burning one hexed, burns with
    blackfire. */
export function reactionsOf(def: Pick<SpellDef, 'status'>): { reaction: Reaction; with: School }[] {
  const has = (k: keyof typeof SCHOOL_OF) => (def.status?.[k] ?? 0) > 0, out: { reaction: Reaction; with: School }[] = [];
  if (has('chill')) out.push({ reaction: 'shatter', with: SCHOOL_OF.shock });
  if (has('burn')) out.push({ reaction: 'overload', with: SCHOOL_OF.shock }, { reaction: 'blackfire', with: SCHOOL_OF.hex });
  if (has('shock')) out.push({ reaction: 'shatter', with: SCHOOL_OF.chill }, { reaction: 'overload', with: SCHOOL_OF.burn });
  if (has('sanct')) out.push({ reaction: 'eclipse', with: SCHOOL_OF.hex });
  if (has('hex')) out.push({ reaction: 'eclipse', with: SCHOOL_OF.sanct }, { reaction: 'blackfire', with: SCHOOL_OF.burn });
  return out.filter((r, i) => out.findIndex(o => o.reaction === r.reaction && o.with === r.with) === i);
}
