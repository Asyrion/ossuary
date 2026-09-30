/* What the mage has learned of the foes, kept between runs in this browser (M4; the hub's bestiary, M7, takes it over):
   which foes it has met, and whether it has found each one's weakness and resistance (GDD: Enemy affinities, "shown in
   the bestiary once discovered"). A private window or blocked storage starts from nothing and keeps what is found for
   the session only. The bosses with affinities (M4.1) are kept beside the foes. */
import { FOE_IDS, type FoeId } from './foeData';
import { BOSS_TYPES, type BossType } from '../config';

type BookId = FoeId | BossType;

export interface FoeRecord { met: boolean; weak: boolean; resist: boolean }
const KEY = 'ossuary.bestiary';
let book: Partial<Record<BookId, FoeRecord>> = {};
try { book = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { /* no storage, or not ours: start from nothing */ }
function save() { try { localStorage.setItem(KEY, JSON.stringify(book)); } catch { /* not kept, still known this session */ } }
const entry = (id: BookId) => book[id] ??= { met: false, weak: false, resist: false };

/** The mage has met foe `id` (it came into a fight). */
export function metFoe(id: BookId) { const e = entry(id); if (!e.met) { e.met = true; save(); } }
/** A hit of its weakness or resistance: returns whether that was the first (so the word rises over it). */
export function foundAffinity(id: BookId, which: 'weak' | 'resist') {
  const e = entry(id); if (e[which]) return false;
  e[which] = true; e.met = true; save(); return true;
}
/** Every foe's record (the dev menu, tests). */
export const bestiary = () => Object.fromEntries([...FOE_IDS, ...BOSS_TYPES].map(id => [id, { ...entry(id) }])) as Record<BookId, FoeRecord>;
/** Forget it all (the dev menu, tests). */
export function forgetBestiary() { book = {}; save(); }
