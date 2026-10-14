/* What the mage knows of spells, kept between runs in this browser.
   The rules are the pure ones in knowledge.ts; this reads them at boot and writes them whenever they change, through the
   Vigil's save (vigil/save.ts, which owns this module's keys). A private window or blocked storage
   starts from nothing and keeps what is learned for the session only. A spell learned, a reaction or a weave found for the
   first time ever is a first find of the run (`firstFound`: Dust at its end). */
import { CFG } from '../config';
import { SPELL_DEFS } from './spellData';
import {
  type Knowledge,
  type Stage,
  atLeast,
  blank,
  cast,
  learn,
  parse,
  reach,
  see,
  stageOf,
  upgrade,
} from './knowledge';
import { firstFound, readSlot, writeSlot } from '../vigil/save';

const C = CFG.knowledge;
let kn: Knowledge = parse(JSON.stringify(readSlot('knowledge')));
let dirty = false; // casts counted since the last save (saved when a stage changes, and when the page goes)
let version = 0; // (counts the changes to what is known: the spell marks rebuild only when it moves)
function save() {
  dirty = false;
  version++;
  writeSlot('knowledge', kn as Record<string, unknown>);
}
if (typeof window !== 'undefined')
  window.addEventListener('pagehide', () => {
    if (dirty) save();
  });

/** A number that changes whenever any spell's stage does (the spell marks read it before recomputing). */
export const knowledgeVersion = () => version;
/** How well the mage knows spell `id`. */
export const stage = (id: string): Stage => stageOf(kn[id], C.usedCasts);
/** Times cast, over all runs. */
export const castsOf = (id: string) => kn[id]?.casts ?? 0;
/** Its page was approached: returns whether it was seen for the first time. */
export function sawSpell(id: string) {
  const now = see(kn, id);
  if (now) save();
  return now;
}
/** A page of it was taken (or the dev menu taught it). */
export function learnedSpell(id: string) {
  const first = !atLeast(stage(id), 'learned');
  if (learn(kn, id)) {
    save();
    if (first) firstFound();
  }
}
/** It was cast: returns whether that made it known well (used) just now. */
export function castSpellOnce(id: string) {
  const was = stage(id);
  cast(kn, id);
  dirty = true;
  if (stage(id) !== was) save();
  return !atLeast(was, 'used') && atLeast(stage(id), 'used');
} // (an upgraded spell crossing into known well counts too)
/** a rune carved into spell `id` changes it (kept between runs: the panel's Upgraded stage says what changed it). */
export function upgradedSpell(id: string, what: string) {
  if (upgrade(kn, id, what)) save();
}
/** What has changed spell `id` over all runs (`rune:<id>` for each rune carved into it). */
export const upgradesOf = (id: string) => [...(kn[id]?.upgrades ?? [])];

/* The reactions found (the codex): kept beside the spells, in their own part of the save. */
let found: string[] = [...readSlot('reactions')];
const saveFound = () => writeSlot('reactions', [...found]);
/** Reaction `r` went off: returns whether it was the first time ever (its name rises larger, and the book marks it). */
export function foundReaction(r: string) {
  if (found.includes(r)) return false;
  found.push(r);
  saveFound();
  firstFound();
  return true;
}
/** The reactions found so far. */
export const reactionsFound = (): readonly string[] => found;
/** The dev menu and tests: every reaction found, or none. */
export function findEveryReaction(all: readonly string[]) {
  found = [...all];
  saveFound();
}
export function forgetReactions() {
  found = [];
  saveFound();
}

/* The weaves and chains found (the codex), in their own part of the save. */
let woven: string[] = [...readSlot('weaves')];
const saveWoven = () => writeSlot('weaves', [...woven]);
/** Weave or chain `id` went off: whether it was the first time ever. */
export function foundWeave(id: string) {
  if (woven.includes(id)) return false;
  woven.push(id);
  saveWoven();
  firstFound();
  return true;
}
export const weavesFound = (): readonly string[] => woven;
export function findEveryWeave(all: readonly string[]) {
  woven = [...all];
  saveWoven();
}
export function forgetWeaves() {
  woven = [];
  saveWoven();
}

/** The dev menu and tests: every spell known well; nothing known; one spell brought to a stage. */
export function knowEvery() {
  for (const s of SPELL_DEFS) reach(kn, s.id, 'used', C.usedCasts);
  save();
}
export function forgetKnowledge() {
  kn = {};
  save();
}
export function setStage(id: string, st: Stage) {
  kn[id] = blank();
  reach(kn, id, st, C.usedCasts);
  save();
}
/** Every spell's stage, by id. */
export const knowledgeNow = () =>
  Object.fromEntries(SPELL_DEFS.map((s) => [s.id, stage(s.id)])) as Record<string, Stage>;
