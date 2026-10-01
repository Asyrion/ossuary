/* Counters (M4.7 step 3, docs/M4.7-plan.md): each foe's counters, the ways to beat it that its behaviour answers to (a
   hex grounds a griffin, frost snuffs a djinn, a blast flips a crab). Which foe has which is its lines in
   `STR.foes.counterLines` (a foe's keys are its counters); each kind of counter has its rising word in `STR.foes.counters`.
   Pure: the game (actors/counters.ts) and the unit tests share it. */
import { STR } from '../strings';
import { FOE_IDS } from './foeData';

/** The counters foe `id` has (none for a foe without one). */
export const countersOf = (id: string) => Object.keys(STR.foes.counterLines[id] ?? {});
/** What is wrong with the counters' text (empty when all is well): an unknown foe, or a counter without a word. */
export function validateCounters() {
  const out: string[] = [];
  for (const [id, lines] of Object.entries(STR.foes.counterLines)) {
    if (!(FOE_IDS as readonly string[]).includes(id)) out.push(`counters for unknown foe ${id}`);
    for (const kind of Object.keys(lines)) if (!STR.foes.counters[kind]) out.push(`${id}: no word for ${kind}`);
  }
  return out;
}
