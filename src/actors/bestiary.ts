/* What the mage has learned of the foes, kept between runs in this browser (M4; the hub's bestiary, M7, takes it over):
   which foes it has met, and whether it has found each one's weakness and resistance (GDD: Enemy affinities, "shown in
   the bestiary once discovered"). A private window or blocked storage starts from nothing and keeps what is found for
   the session only. The bosses with affinities (M4.1) are kept beside the foes. M4.7: the counters found for each foe
   (actors/counterData.ts), for the inventory's Foes tab. */
import { FOE_IDS, type FoeId } from './foeData';
import { BOSS_TYPES, type BossType } from '../config';
import { firstFound, readSlot, writeSlot } from '../vigil/save';

type BookId = FoeId | BossType;

export interface FoeRecord {
  met: boolean;
  weak: boolean;
  resist: boolean;
  counters?: string[];
}
// (kept in the Vigil's save since M7 step 4, vigil/save.ts, which took over its key; a counter found for the first time ever
// is a first find of the run, Dust at its end)
let book = JSON.parse(JSON.stringify(readSlot('bestiary'))) as Partial<Record<BookId, FoeRecord>>;
function save() {
  writeSlot('bestiary', JSON.parse(JSON.stringify(book)) as Record<string, unknown>);
}
const entry = (id: BookId) => (book[id] ??= { met: false, weak: false, resist: false });

/** The mage has met foe `id` (it came into a fight). */
export function metFoe(id: BookId) {
  const e = entry(id);
  if (!e.met) {
    e.met = true;
    save();
  }
}
/** A hit of its weakness or resistance: returns whether that was the first (so the word rises over it). */
export function foundAffinity(id: BookId, which: 'weak' | 'resist') {
  const e = entry(id);
  if (e[which]) return false;
  e[which] = true;
  e.met = true;
  save();
  return true;
}
/** Foe `id`'s counter `kind` came about: returns whether that was the first time (so the line says what was learned). */
export function foundCounter(id: BookId, kind: string) {
  const e = entry(id),
    list = (e.counters ??= []);
  if (list.includes(kind)) return false;
  list.push(kind);
  e.met = true;
  save();
  firstFound();
  return true;
}
/** Find every counter of every foe at once (the dev menu, tests). */
export function findCounters(all: Partial<Record<string, string[]>>) {
  for (const [id, kinds] of Object.entries(all)) {
    const e = entry(id as BookId);
    e.counters = [...new Set([...(e.counters ?? []), ...(kinds ?? [])])];
    e.met = true;
  }
  save();
}
/** Every foe's record (the dev menu, tests). */
export const bestiary = () =>
  Object.fromEntries(
    [...FOE_IDS, ...BOSS_TYPES].map((id) => {
      const e = entry(id);
      return [id, { ...e, counters: [...(e.counters ?? [])] }];
    }),
  ) as Record<BookId, FoeRecord>;
/** Forget it all (the dev menu, tests). */
export function forgetBestiary() {
  book = {};
  save();
}
