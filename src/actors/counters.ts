/* Counters found, in the game (M4.7 step 3, docs/M4.7-plan.md; which foe has which: actors/counterData.ts). A behaviour
   calls `counter(e, kind)` where its counter comes about (a hex grounds the griffin, a blast flips the crab): the word
   rises over the foe (not again within a moment), and the first time ever, the bestiary keeps it, a chime sounds and a
   line says what was learned. The inventory's Foes tab lists the counters found, and seals the rest. */
import type { Enemy } from '../types';
import { G } from '../state';
import { CFG } from '../config';
import { STR, foeName } from '../strings';
import { Sfx } from '../audio/sfx';
import { floatText } from '../magic/statusFx';
import { line as showLine } from '../ui/hud';
import { findCounters, foundCounter } from './bestiary';
import type { FoeId } from './foeData';

const GOLD = 0xffe08a;
const said = new Map<string, number>();

/** Foe `e`'s counter `kind` came about. */
export function counter(e: Enemy, kind: string) { if (e.foe) counterAt(e.foe.id, kind, e.x, e.z); }
/** A counter of foe kind `id` came about at (x, z) (where no one foe is there: a web burnt, a cloud of spores flashed). */
export function counterAt(id: string, kind: string, x: number, z: number) {
  const text = STR.foes.counterLines[id]?.[kind]; if (!text) return; // (not one of its counters)
  const fresh = foundCounter(id as FoeId, kind), key = id + ':' + kind;
  if (fresh || G.simClock - (said.get(key) ?? -9) > 1.2) { floatText(x, 1.8, z, STR.foes.counters[kind], GOLD, fresh ? 40 : 30); said.set(key, G.simClock); }
  if (fresh) { Sfx.at(x, z).counter(); showLine(STR.foes.counterFound(foeName(id), text), CFG.afflict.lineShow); }
}
/** Every counter of every foe found at once (the dev menu, tests). */
export function findEveryCounter() { findCounters(Object.fromEntries(Object.entries(STR.foes.counterLines).map(([id, lines]) => [id, Object.keys(lines)]))); }
