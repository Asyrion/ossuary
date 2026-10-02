/* Spell knowledge (M3.7, GDD: Spells, Spell knowledge): how well the mage knows each spell. A spell is seen when its
   page is first approached, learned when a page of it is taken, used after enough casts over all runs, and upgraded
   when runes or school mastery change it (M6). What each stage shows is in ui/spellPanel.ts. These are the pure rules
   (unit-tested); magic/memory.ts keeps them in the browser between runs. */
import { REACTIONS, type Reaction } from './status';
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

/** The stage a record has reached; `usedCasts` casts of a learned spell make it used, and a used spell runes have changed
    is upgraded (M6: a rune carved into one not yet known well waits for the casts, so "known well" still comes). */
export function stageOf(k: Known | undefined, usedCasts: number): Stage {
  if (!k) return 'unknown';
  if (k.learned) return k.casts >= usedCasts ? (k.upgrades.length ? 'upgraded' : 'used') : 'learned';
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
    Umbral's, Overgrown Verdant's). */
const SCHOOL_OF = { burn: 'ember', chill: 'frost', shock: 'storm', sanct: 'hallow', hex: 'umbral', grow: 'verdant' } as const;
/** The two schools whose statuses meet in reaction `r` (the wheel's chord between them, M4.8). */
export const reactionSchools = (r: Reaction): [School, School] => REACTIONS[r].map(k => SCHOOL_OF[k as keyof typeof SCHOOL_OF]) as [School, School];
/** Every reaction, in the table's order (the book's wheel lists them so). */
export const REACTION_IDS = Object.keys(REACTIONS) as Reaction[];
/** The reactions a spell can set off with another school's status (magic/status.ts's `REACTIONS`, the wheel of every
    pair of the five schools, M4.8): for each status it brings, each reaction that status is half of, and the school of
    the other half. */
export function reactionsOf(def: Pick<SpellDef, 'status'>): { reaction: Reaction; with: School }[] {
  const has = (k: string) => (def.status?.[k as keyof typeof def.status] ?? 0) > 0, out: { reaction: Reaction; with: School }[] = [];
  for (const k of Object.keys(SCHOOL_OF) as (keyof typeof SCHOOL_OF)[]) {
    if (!has(k)) continue;
    for (const [r, [a, b]] of Object.entries(REACTIONS) as [Reaction, [string, string]][]) {
      if (a === k) out.push({ reaction: r, with: SCHOOL_OF[b as keyof typeof SCHOOL_OF] });
      else if (b === k) out.push({ reaction: r, with: SCHOOL_OF[a as keyof typeof SCHOOL_OF] });
    }
  }
  return out.filter((r, i) => out.findIndex(o => o.reaction === r.reaction && o.with === r.with) === i);
}
