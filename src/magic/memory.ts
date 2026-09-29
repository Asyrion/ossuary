/* What the mage knows of spells, kept between runs in this browser (M3.7; the hub's grimoire takes it over later).
   The rules are the pure ones in knowledge.ts; this reads them at boot and writes them whenever they change. A private
   window or blocked storage starts from nothing and keeps what is learned for the session only. */
import { CFG } from '../config';
import { SPELL_DEFS } from './spellData';
import { type Knowledge, type Stage, blank, cast, learn, parse, reach, see, stageOf } from './knowledge';

const KEY = 'ossuary.knowledge', C = CFG.knowledge;
let kn: Knowledge = {};
try { kn = parse(localStorage.getItem(KEY)); } catch { /* no storage: start from nothing */ }
let dirty = false; // casts counted since the last save (saved when a stage changes, and when the page goes)
function save() { dirty = false; try { localStorage.setItem(KEY, JSON.stringify(kn)); } catch { /* not kept, still known this session */ } }
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { if (dirty) save(); });

/** How well the mage knows spell `id`. */
export const stage = (id: string): Stage => stageOf(kn[id], C.usedCasts);
/** Times cast, over all runs. */
export const castsOf = (id: string) => kn[id]?.casts ?? 0;
/** Its page was approached: returns whether it was seen for the first time. */
export function sawSpell(id: string) { const now = see(kn, id); if (now) save(); return now; }
/** A page of it was taken (or the dev menu taught it). */
export function learnedSpell(id: string) { if (learn(kn, id)) save(); }
/** It was cast: returns whether that made it known well (used) just now. */
export function castSpellOnce(id: string) { const was = stage(id); cast(kn, id); dirty = true; if (stage(id) !== was) save(); return was !== 'used' && stage(id) === 'used'; }

/** The dev menu and tests: every spell known well; nothing known; one spell brought to a stage. */
export function knowEvery() { for (const s of SPELL_DEFS) reach(kn, s.id, 'used', C.usedCasts); save(); }
export function forgetKnowledge() { kn = {}; save(); }
export function setStage(id: string, st: Stage) { kn[id] = blank(); reach(kn, id, st, C.usedCasts); save(); }
/** Every spell's stage, by id. */
export const knowledgeNow = () => Object.fromEntries(SPELL_DEFS.map(s => [s.id, stage(s.id)])) as Record<string, Stage>;
