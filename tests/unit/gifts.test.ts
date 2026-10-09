import { describe, expect, it } from 'vitest';
import { BOND_MAX, TOWNSFOLK, bondCost, disciplinesOpen, questMet, questOf, startOf, validateTownsfolk } from '../../src/vigil/giftData';
import { DIALOGUE, giftLinesMissing } from '../../src/vigil/dialogueData';
import { SHADE_IDS } from '../../src/vigil/shadeData';
import { SCHOOLS, SPELL_DEFS, inPool } from '../../src/magic/spellData';
import { POTION_IDS } from '../../src/items/alchemyData';
import { ARTIFACT_DEFS } from '../../src/items/artifactData';
import { STR } from '../../src/strings';

const known = { folk: [...SHADE_IDS], spells: SPELL_DEFS.map(s => s.id), potions: [...POTION_IDS], artifacts: ARTIFACT_DEFS.map(a => a.id), foci: ARTIFACT_DEFS.filter(a => a.kind === 'focus').map(a => a.id), schools: [...SCHOOLS] };
const none = { freed: [] as string[], bonds: {}, powers: [] as string[], flags: {} };

describe('gifts, bonds and powers (M7 step 8)', () => {
  it('pass their checks: a gift for each townsperson, six powers from six of them, three quests, a discipline a school', () => {
    expect(validateTownsfolk(TOWNSFOLK, known)).toEqual([]);
    expect(giftLinesMissing(DIALOGUE, { folk: [...SHADE_IDS], powers: TOWNSFOLK.powers.map(p => p.by), quests: TOWNSFOLK.quests.map(q => q.by) })).toEqual([]);
    for (const p of TOWNSFOLK.powers) expect(STR.gifts.powers[p.id], p.id).toBeTruthy();
    for (const d of TOWNSFOLK.disciplines) expect(STR.gifts.disciplines[d.id], d.id).toBeTruthy();
    for (const q of TOWNSFOLK.quests) expect(STR.gifts.quests[q.id], q.id).toBeTruthy();
  });
  it('finds what is wrong: an unknown spell, a power too cheap, a discipline on a spell that is no focus', () => {
    const bad = JSON.parse(JSON.stringify(TOWNSFOLK));
    bad.folk.scribe.gift.pool = ['nothing']; bad.powers[0].dust = 20; bad.disciplines[0].focus = 'bone_lens';
    const errs = validateTownsfolk(bad, known).join('\n');
    expect(errs).toMatch(/no spell nothing/); expect(errs).toMatch(/100 to 200 Dust/); expect(errs).toMatch(/is no focus/);
  });
  it('opens the Pyromancer from the start, each other discipline with its townsperson', () => {
    expect(disciplinesOpen([])).toEqual(['pyromancer']);
    expect(disciplinesOpen(['novice', 'scribe'])).toEqual(['pyromancer', 'hexer']);
    expect(disciplinesOpen([...SHADE_IDS])).toHaveLength(6);
  });
  it('keeps the two spells waiting out of the libraries until their townsperson is freed', () => {
    expect(inPool([]).map(s => s.id)).not.toContain('lantern_of_vigil');
    expect(inPool(['scribe']).map(s => s.id)).toContain('lantern_of_vigil');
    expect(inPool(['scribe']).map(s => s.id)).not.toContain('soul_harvest');
    expect(inPool(['novice']).map(s => s.id)).toContain('soul_harvest');
  });
  it('adds up what a descent begins with: the gifts of the freed, the second gift of a whole bond, the powers, the quests done', () => {
    expect(startOf(none)).toEqual({});
    expect(startOf({ ...none, freed: ['forager'] })).toEqual({ reagents: 1 });
    expect(startOf({ ...none, freed: ['forager'], bonds: { forager: BOND_MAX } })).toEqual({ reagents: 2 });
    expect(startOf({ ...none, freed: ['forager'], bonds: { forager: 1 } })).toEqual({ reagents: 1 });
    expect(startOf({ ...none, powers: ['deepWell', 'purse', 'heartstone'] })).toEqual({ maxMana: 10, coins: 5, hearts: 1 });
    expect(startOf({ ...none, freed: ['sexton'], flags: { 'quest.sexton': 'done' } })).toEqual({ souls: 'hallowed' });
    expect(startOf({ ...none, freed: ['sexton'], flags: { 'quest.sexton': 'open' } })).toEqual({});
  });
  it('costs 5 obols, then 15, to deepen a bond, and nothing past it', () => {
    expect([bondCost(0), bondCost(1), bondCost(2)]).toEqual([5, 15, null]);
  });
  it('counts a quest met only in the runs since it was given', () => {
    const keyring = questOf('sexton')!, seal = questOf('pilgrim')!, reactions = questOf('scribe')!;
    const echoes = [{ carried: ['sextons_keyring'], floor: 6 }, { carried: [], floor: 2 }];
    expect(questMet(keyring, { runs: 5, echoes, reactions: [] }, 4, 0)).toBe(true); // (the last run carried it)
    expect(questMet(keyring, { runs: 5, echoes: [...echoes].reverse(), reactions: [] }, 4, 0)).toBe(false); // (only an older one did)
    expect(questMet(seal, { runs: 5, echoes, reactions: [] }, 4, 0)).toBe(true);
    expect(questMet(seal, { runs: 5, echoes, reactions: [] }, 5, 0)).toBe(false); // (no run since)
    expect(questMet(reactions, { runs: 5, echoes, reactions: ['a', 'b', 'c', 'd'] }, 4, 1)).toBe(true);
    expect(questMet(reactions, { runs: 5, echoes, reactions: ['a', 'b', 'c', 'd'] }, 4, 2)).toBe(false);
  });
});
