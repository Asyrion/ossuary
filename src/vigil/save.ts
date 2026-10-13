/* The save (M7 step 4; docs/M7-plan.md, decision 17): one versioned record in this browser, `ossuary.vigil`, holding what
   carries from run to run (vigilData.ts says what). The first time it loads it takes over the five keys kept before it
   (spell knowledge, the reactions and weaves found, the bestiary, the recipes), which stay until M7's close; the five
   modules that kept them read and write their part through it now (`readSlot`, `writeSlot`), keeping their own functions.
   A run ends into it (`recordRun`: the run remembered, its Dust and obols added); it can be exported as a file and
   imported again (the pause menu), wiped, or made a veteran's (the dev menu). The settings keep their own keys. A private
   window or blocked storage keeps it for the session only. */
import { CFG } from '../config';
import { SHADE_IDS } from './shadeData';
import {
  LEGACY_KEYS,
  SLOT_KEYS,
  blankSave,
  migrate,
  validate,
  type RunRecord,
  type SlotKey,
  type VigilSave,
} from './vigilData';

const KEY = 'ossuary.vigil';
const tryParse = (text: string | null) => {
  if (text === null) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

function load(): VigilSave {
  try {
    const raw = tryParse(localStorage.getItem(KEY));
    if (raw !== undefined) return migrate(raw);
    const legacy = Object.fromEntries(
      SLOT_KEYS.map((k) => [k, tryParse(localStorage.getItem(LEGACY_KEYS[k]))]),
    ) as Partial<Record<SlotKey, unknown>>;
    const s = migrate(null, legacy);
    localStorage.setItem(KEY, JSON.stringify(s));
    return s; // (the keys taken over, once)
  } catch {
    return blankSave();
  }
}
let save = load();
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* kept this session only */
  }
}

/** The save as it stands (read it; change it through the functions here). */
export const vigil = (): Readonly<VigilSave> => save;
/** A module's own part of the save, as it kept it in its key. */
export const readSlot = <K extends SlotKey>(k: K): VigilSave[K] => save[k];
/** A module's part changed: keep it. */
export function writeSlot<K extends SlotKey>(k: K, v: VigilSave[K]) {
  save[k] = v;
  persist();
}

/* The first finds of the run (a spell learned, a reaction, weave, counter or recipe found for the first time ever), each
   worth Dust at the run's end; the modules that keep them say so here. */
let firsts = 0;
/** Something was found for the first time ever, in this run. */
export const firstFound = () => {
  firsts++;
};
/** The first finds so far this run (and a new run starts again from none). */
export const runFirsts = () => firsts;
export const resetRunFirsts = () => {
  firsts = 0;
};

/** A run ended: remember it (newest first, the last few kept), count it, and bring home its Dust and obols. */
export function recordRun(run: RunRecord) {
  save.runs++;
  if (run.won) save.wins++;
  save.deepest = Math.max(save.deepest, run.floor);
  save.dust += run.dust;
  save.obols += run.obols;
  save.echoes = [run, ...save.echoes].slice(0, CFG.vigil.runsKept);
  save.found = [...new Set([...save.found, ...run.carried])];
  persist();
}

/** The mage's own candle on the Vigil's wall is lit (its first waking there). */
export function lightCandle() {
  if (!save.candle) {
    save.candle = true;
    persist();
  }
}
/** The spell held in a hand at the Vigil (the lectern's choice), or none. */
export function setVigilSlot(slot: number, id: string | null) {
  save.slots[slot] = id;
  persist();
}

/** M7 step 6: a chained shade freed: it goes up to the Vigil at once, kept even if the run ends in death (and no longer bound). */
export function freeShade(id: string) {
  if (!save.freed.includes(id)) save.freed = [...save.freed, id];
  save.bound = save.bound.filter((b) => b !== id);
  persist();
}
/** A chained shade bound: it walks with the mage through the next run. */
export function bindShade(id: string) {
  if (!save.bound.includes(id) && !save.freed.includes(id)) save.bound = [...save.bound, id];
  persist();
}
/** A run begins: the shades bound before walk with it, and are bound no longer (they slip back into their chains after). */
export function takeBound() {
  const b = save.bound;
  save.bound = [];
  persist();
  return b;
}

/** The dev menu: Dust and obols given. */
export function giveHome(dust: number, obols: number) {
  save.dust = Math.max(0, save.dust + dust);
  save.obols = Math.max(0, save.obols + obols);
  persist();
}
/** M7 step 7: a townsperson's line heard (its key: the line's id, or `id@subject`), stamped later than every other. */
export function hearLine(key: string) {
  save.heard = { ...save.heard, [key]: Math.max(0, ...Object.values(save.heard)) + 1 };
  persist();
}
/** M7 step 7: a flag set by a choice in a talk (or the dev menu); `undefined` clears it. */
export function setFlag(k: string, v: string | number | boolean | undefined) {
  const f = { ...save.flags };
  if (v === undefined) delete f[k];
  else f[k] = v;
  save.flags = f;
  persist();
}
/** M7 step 8: Dust and obols spent at the Vigil (a power, obols on the eyes): false, and nothing spent, when there isn't
    enough of either. */
export function spend(dust: number, obols: number) {
  if (save.dust < dust || save.obols < obols) return false;
  save.dust -= dust;
  save.obols -= obols;
  persist();
  return true;
}
/** M7 step 8: a townsperson's bond one step deeper (or set, the dev menu); a power owned (or given up, the dev menu). */
export function setBond(id: string, n: number) {
  const b = { ...save.bonds };
  if (n > 0) b[id] = n;
  else delete b[id];
  save.bonds = b;
  persist();
}
export function setPower(id: string, owned: boolean) {
  save.powers = owned ? [...new Set([...save.powers, id])] : save.powers.filter((p) => p !== id);
  persist();
}

/** M7 step 9: a part of the Vigil opened by its school (or closed again, the dev menu: none, or every one). */
export function openPart(school: string) {
  if (!save.parts.includes(school)) {
    save.parts = [...save.parts, school];
    persist();
  }
}
export function setParts(schools: string[]) {
  save.parts = [...schools];
  persist();
}
/** M7 step 9: a townsperson's candle lit in the chapel (or none): its blessing goes with the next descent. */
export function setBlessing(id: string | null) {
  save.blessing = id;
  persist();
}
/** A descent begins: the candle lit for it burns down with it (its blessing the run's); none is lit after. */
export function takeBlessing() {
  const b = save.blessing;
  if (b) {
    save.blessing = null;
    persist();
  }
  return b;
}
/** M7 step 9: the reagent the garden of the dead gives every descent (or none). */
export function setGarden(id: string | null) {
  save.garden = id;
  persist();
}

/** The dev menu: every line forgotten (the townspeople say their first again). */
export function forgetHeard() {
  save.heard = {};
  persist();
}
/** The dev menu: every shade freed, or none (those freed go back to their chains). */
export function setFreed(ids: string[]) {
  save.freed = [...ids];
  persist();
}

/** The dev menu: a wiped save (everything forgotten; the page reloads, so every module starts from nothing). */
export function wipeSave() {
  save = blankSave();
  persist();
}
/** The dev menu: a veteran's save (every part open, the candle lit, every shade freed, runs behind it and Dust to spend);
    the sigils and powers come with step 10. What is known stays as it is. */
export function veteranSave() {
  Object.assign(save, {
    dust: Math.max(save.dust, 900),
    obols: Math.max(save.obols, 300),
    runs: Math.max(save.runs, 24),
    wins: Math.max(save.wins, 6),
    deepest: 6,
    candle: true,
    parts: ['ember', 'frost', 'storm', 'hallow', 'umbral', 'verdant'],
    freed: [...SHADE_IDS],
    flags: { ...save.flags, veteran: true },
  });
  persist();
}

/** The save as a file's text (the pause menu's export). */
export const exportSave = () => JSON.stringify(save, null, 1);
/** A file's text taken in as the save (the pause menu's import): what is wrong with it, or nothing (then it is kept, and
    the page reloads so every module reads it). */
export function importSave(text: string): string[] {
  const raw = tryParse(text),
    errs = validate(raw);
  if (errs.length) return errs;
  save = migrate(raw);
  persist();
  return [];
}
