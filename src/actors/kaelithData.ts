/* Kaelith's fight, its pure rules (M7 step 2; docs/M7-plan.md, decision 6; the fight is kaelith.ts): which phase its health
   puts it in, and which schools the four ward pillars of its hall wake with in the second. Unit-tested. */
import type { School } from '../render/arcane';

export type KaelithPhase = 1 | 2 | 3;
/** The phase at `hp` of `max`: the Sentinel above the first mark, the seal cracking above the second, the last light below. */
export function phaseOf(hp: number, max: number, marks: readonly number[]): KaelithPhase {
  const f = hp / max;
  return f > marks[0] ? 1 : f > marks[1] ? 2 : 3;
}

/** The schools a ward may hold: those that reach a mechanism (as an obelisk's, world/mechanisms.ts: Verdant reaches none). */
export const WARD_SCHOOLS: readonly School[] = ['ember', 'frost', 'storm', 'hallow', 'umbral'];
/** The four wards' schools, all different: first the schools the mage holds (in the order given), then Ember and Hallow,
    then the rest; laid round the hall in an order `rnd` shuffles. A glyph's blast breaks any of them, so none is out of reach. */
export function sealWards(held: readonly (School | null | undefined)[], rnd: () => number): School[] {
  const order = [...held.filter((s): s is School => !!s && WARD_SCHOOLS.includes(s)), 'ember', 'hallow', ...WARD_SCHOOLS] as School[];
  const four = [...new Set(order)].slice(0, 4);
  for (let i = four.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [four[i], four[j]] = [four[j], four[i]]; }
  return four;
}
