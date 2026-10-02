import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/rng';
import { SCHOOLS, SPELL_DEFS, pickPages, spell, type School } from '../../src/magic/spellData';
import { BOON_DEFS, LEAN, boon, boonParams, boonText, dealBoons, pledgeFor, schoolWeights, validateBoons, type BoonDef, type DealState } from '../../src/progression/boonData';

/* M6 step 3: boons as data and the deal (docs/M6-plan.md). */
const flat = () => schoolWeights({ slots: [null, null], casts: {}, taken: {} });
const state = (o: Partial<DealState> = {}): DealState => ({ taken: {}, weights: flat(), socketable: true, ...o });
const deals = (s: DealState, n: number, seed = 1) => { const r = new Rng(seed); return Array.from({ length: n }, () => dealBoons(s, () => r.next())); };

describe('boons', () => {
  it('are valid: eighteen, two for each school (taken twice) and six general', () => {
    expect(validateBoons()).toEqual([]);
    expect(BOON_DEFS).toHaveLength(18);
    for (const s of SCHOOLS) expect(BOON_DEFS.filter(b => b.school === s)).toHaveLength(2);
    expect(BOON_DEFS.filter(b => !b.school)).toHaveLength(6);
  });
  it('catch mistakes', () => {
    const bad = [...BOON_DEFS.slice(1), { ...BOON_DEFS[0], id: 'flamekeeper', max: 1, rank2: { nothing: 2 } } as BoonDef];
    const errs = validateBoons(bad).join('; ');
    expect(errs).toMatch(/listed twice/); expect(errs).toMatch(/taken twice: max 2/); expect(errs).toMatch(/rank2 changes nothing/);
    expect(validateBoons([{ ...BOON_DEFS[0], area: 'mage' } as BoonDef]).join(';')).toMatch(/not both/);
  });
  it('grow at the second rank', () => {
    expect(boonParams('bankedCoals', 1).burnMul).toBe(1.5); expect(boonParams('bankedCoals', 2).burnMul).toBe(2);
    expect(boonParams('perennial', 2)).toMatchObject({ growMul: 2, root: 1 });
    expect(boonText('deepWinter', 2)).toBe(boon('deepWinter').text2);
  });
});

describe('the deal', () => {
  it('weighs each school by its slots, casts, boons and a pledge', () => {
    const w = schoolWeights({ slots: ['ember', 'frost'], casts: { ember: 12, storm: 99 }, taken: { bankedCoals: 2, coldSnap: 1 }, pledge: 'verdant' });
    expect(w.ember).toBe(LEAN.base + LEAN.slot + 2 + 2 * LEAN.boon);
    expect(w.frost).toBe(LEAN.base + LEAN.slot + LEAN.boon);
    expect(w.storm).toBe(LEAN.base + LEAN.castsMax);
    expect(w.verdant).toBe(LEAN.base + LEAN.pledge);
    expect(w.hallow).toBe(LEAN.base);
  });
  it('deals three, one general always, none taken as often as it can be', () => {
    const taken = { bankedCoals: 2, keenNose: 1 };
    for (const cards of deals(state({ taken }), 300)) {
      expect(cards).toHaveLength(3); expect(new Set(cards.map(c => c.id)).size).toBe(3);
      expect(cards.filter(c => !boon(c.id).school).length).toBeGreaterThanOrEqual(1);
      expect(cards.some(c => c.id === 'bankedCoals' || c.id === 'keenNose')).toBe(false);
    }
  });
  it('offers a school boon again as its second rank', () => {
    const seen = deals(state({ taken: { flamekeeper: 1 }, attuned: 'ember' }), 50).flat().find(c => c.id === 'flamekeeper');
    expect(seen?.rank).toBe(2);
  });
  it("leans to the build: a mage's own school comes more often, and an attuned mage draws both school cards from it", () => {
    const leaning = state({ weights: schoolWeights({ slots: ['storm', null], casts: { storm: 20 }, taken: {} }) });
    const storm = deals(leaning, 600).flat().filter(c => boon(c.id).school === 'storm');
    expect(storm.length / 600).toBeGreaterThan(.6); // (flat, it would be about a third)
    expect(storm.every(c => c.lean)).toBe(true);
    for (const cards of deals(state({ attuned: 'frost' }), 100)) expect(cards.filter(c => boon(c.id).school === 'frost')).toHaveLength(2);
    // once its school's boons are all taken, an attuned mage is dealt the others'
    const done = deals(state({ attuned: 'frost', taken: { deepWinter: 2, coldSnap: 2 } }), 50);
    for (const cards of done) { expect(cards).toHaveLength(3); expect(cards.some(c => boon(c.id).school === 'frost')).toBe(false); }
  });
  it('never runs dry: Tempered is always there to deal', () => {
    const taken = Object.fromEntries(BOON_DEFS.filter(b => b.id !== 'tempered').map(b => [b.id, b.max]));
    const cards = dealBoons(state({ taken }), () => .5);
    expect(cards.map(c => c.id)).toEqual(['tempered']);
  });
  it("keeps Keen Nose from a Taster's Spoon and Second Socket from a run with no waystone ahead", () => {
    const all = deals(state({ spoon: true, socketable: false }), 400).flat().map(c => c.id);
    expect(all).not.toContain('keenNose'); expect(all).not.toContain('secondSocket');
    expect(deals(state(), 400).flat().map(c => c.id)).toEqual(expect.arrayContaining(['keenNose', 'secondSocket']));
  });
  it("deals a bargain's two cards from its school", () => {
    for (const cards of deals(state({ only: 'umbral' }), 50)) expect(cards.filter(c => boon(c.id).school === 'umbral')).toHaveLength(2);
  });
  it('deals the same cards from the same state and stream', () => {
    expect(deals(state(), 20, 7)).toEqual(deals(state(), 20, 7));
  });
});

describe('the pledge', () => {
  it("comes with a school boon taken while none of its school's spells is held", () => {
    expect(pledgeFor('seedfall', [null, null])).toBe('verdant');
    expect(pledgeFor('seedfall', ['verdant', null])).toBeNull();
    expect(pledgeFor('tempered', [null, null])).toBeNull();
  });
  it('puts a page of its school first at the next library, and changes nothing without one', () => {
    for (let s = 0; s < 40; s++) {
      const pledge: School = SCHOOLS[s % SCHOOLS.length];
      const pages = pickPages(Rng.from('PL' + s, 'pages'), [null, null], 3, [], SPELL_DEFS, [], pledge);
      expect(spell(pages[0]).school).toBe(pledge);
      expect(pickPages(Rng.from('PL' + s, 'pages'), [null, null], 3, [], SPELL_DEFS, ['frost'])).toEqual(pickPages(Rng.from('PL' + s, 'pages'), [null, null], 3, [], SPELL_DEFS, ['frost'], null));
    }
  });
});
