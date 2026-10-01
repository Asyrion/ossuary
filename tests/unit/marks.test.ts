import { describe, expect, it } from 'vitest';
import { attunedTo, circleOf, handState, knownWell, masteredSchools } from '../../src/magic/marksData';
import { SPELL_DEFS } from '../../src/magic/spellData';
import type { Stage } from '../../src/magic/knowledge';

// M4.11: the marks the mage's spells and knowledge put on them
describe('spell marks', () => {
  it('a slotted spell is ready, cooling down (and how far back), or short of its cost', () => {
    expect(handState(0, 2, true, 1)).toEqual({ state: 'ready', fill: 1 });
    expect(handState(1.5, 2, true, 1)).toEqual({ state: 'cooling', fill: .25 });
    expect(handState(.5, 2, false, .2)).toMatchObject({ state: 'cooling' }); // (the cooldown shows first)
    expect(handState(0, 2, false, .4)).toEqual({ state: 'short', fill: .4 });
    expect(handState(3, 2, true, 1).fill).toBe(0);
  });

  it('both slots of one school attune the mage to it', () => {
    expect(attunedTo(['ember', 'ember'])).toBe('ember');
    expect(attunedTo(['ember', 'frost'])).toBeNull();
    expect(attunedTo(['hallow', null])).toBeNull();
    expect(attunedTo([null, null])).toBeNull();
  });

  it('the knowledge circle has an arc per school, a spell lit when known well, and a school known in full closes its arc', () => {
    const stages: Record<string, Stage> = { cinder_lance: 'used', pyre_seal: 'upgraded', rime_shards: 'used', glacial_wall: 'learned', arc: 'seen' };
    const circle = circleOf(SPELL_DEFS, id => stages[id] ?? 'unknown');
    expect(circle.map(a => a.school)).toEqual(['ember', 'frost', 'storm', 'hallow', 'umbral']);
    expect(circle[0]).toMatchObject({ mastered: true, spells: [{ id: 'cinder_lance', known: true }, { id: 'pyre_seal', known: true }] });
    expect(circle[1].mastered).toBe(false); expect(circle[1].spells.filter(s => s.known).map(s => s.id)).toEqual(['rime_shards']);
    expect(masteredSchools(circle)).toEqual(['ember']);
    expect(knownWell(circle)).toBe(3);
    expect(circleOf(SPELL_DEFS, () => 'used').every(a => a.mastered)).toBe(true);
    expect(circleOf(SPELL_DEFS, () => 'unknown').some(a => a.mastered)).toBe(false);
  });
});
