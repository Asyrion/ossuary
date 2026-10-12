/* Spell marks (M4.11, docs/archive/M4.11-plan.md; GDD: Spells, Spell marks): what the mage's spells and what they know put on
   them, as rules. Pure (no three.js): a slotted spell's state at its hand, attunement, and the knowledge circle with the
   schools known in full. The look is actors/spellMarks.ts. */
import { SCHOOLS, type School, type SpellDef } from './spellData';
import { atLeast, type Stage } from './knowledge';

/** A slotted spell at its hand: ready, cooling down (`fill`: how far back it has come), or short of what it costs. */
export interface HandState { state: 'ready' | 'cooling' | 'short'; fill: number }
/** The state of a slotted spell with `cdLeft` of its `cooldown` to run; `canPay`: the mana (or a soul mote to burn) is
    there; `manaShare`: how much of its cost the mana covers. */
export function handState(cdLeft: number, cooldown: number, canPay: boolean, manaShare: number): HandState {
  if (cdLeft > 0) return { state: 'cooling', fill: cooldown > 0 ? Math.max(0, Math.min(1, 1 - cdLeft / cooldown)) : 1 };
  if (!canPay) return { state: 'short', fill: Math.max(0, Math.min(1, manaShare)) };
  return { state: 'ready', fill: 1 };
}

/** The school both slots hold, if they hold spells of one school (attuned to it); else null. */
export function attunedTo(slots: readonly (School | null | undefined)[]): School | null {
  const [a, b] = slots;
  return a && b && a === b ? a : null;
}

/** A school's arc of the knowledge circle: its spells, which are known well (cast enough: the "used" stage or more), and
    whether every one of them is (the school known in full, its arc closed). */
export interface CircleArc { school: School; spells: { id: string; known: boolean }[]; mastered: boolean }
/** The knowledge circle from each spell's stage: one arc per school, in the schools' order. */
export function circleOf(defs: readonly Pick<SpellDef, 'id' | 'school'>[], stageOf: (id: string) => Stage): CircleArc[] {
  return SCHOOLS.map(school => {
    const spells = defs.filter(d => d.school === school).map(d => ({ id: d.id, known: atLeast(stageOf(d.id), 'used') }));
    return { school, spells, mastered: spells.length > 0 && spells.every(s => s.known) };
  });
}
/** The schools known in full. */
export const masteredSchools = (circle: readonly CircleArc[]) => circle.filter(a => a.mastered).map(a => a.school);
/** How many spells are known well in all. */
export const knownWell = (circle: readonly CircleArc[]) => circle.reduce((n, a) => n + a.spells.filter(s => s.known).length, 0);
