import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/rng';
import { SCHOOLS, SPELL_DEFS, pickPages, spell, type School } from '../../src/magic/spellData';
import {
  BOON_DEFS,
  LEAN,
  boon,
  boonParams,
  boonText,
  boonTuning,
  boonsTouching,
  dealBoons,
  pledgeFor,
  schoolWeights,
  statusMul,
  validateBoons,
  NOT_YET,
  afterglowOf,
  type BoonDef,
  type DealState,
} from '../../src/progression/boonData';
import { MAGIC, applyStatus, newStatus, tickStatus } from '../../src/magic/status';

/* Boons as data and the deal (docs/archive/M6-plan.md). */
const flat = () => schoolWeights({ slots: [null, null], casts: {}, taken: {} });
const state = (o: Partial<DealState> = {}): DealState => ({ taken: {}, weights: flat(), socketable: true, ...o });
const deals = (s: DealState, n: number, seed = 1) => {
  const r = new Rng(seed);
  return Array.from({ length: n }, () => dealBoons(s, () => r.next()));
};

describe('boons', () => {
  it('are valid: eighteen, two for each school (taken twice) and six general', () => {
    expect(validateBoons()).toEqual([]);
    expect(BOON_DEFS).toHaveLength(18);
    for (const s of SCHOOLS) expect(BOON_DEFS.filter((b) => b.school === s)).toHaveLength(2);
    expect(BOON_DEFS.filter((b) => !b.school)).toHaveLength(6);
  });
  it('catch mistakes', () => {
    const bad = [
      ...BOON_DEFS.slice(1),
      { ...BOON_DEFS[0], id: 'flamekeeper', max: 1, rank2: { nothing: 2 } } as BoonDef,
    ];
    const errs = validateBoons(bad).join('; ');
    expect(errs).toMatch(/listed twice/);
    expect(errs).toMatch(/taken twice: max 2/);
    expect(errs).toMatch(/rank2 changes nothing/);
    expect(validateBoons([{ ...BOON_DEFS[0], area: 'mage' }]).join(';')).toMatch(/not both/);
  });
  it('grow at the second rank', () => {
    expect(boonParams('bankedCoals', 1).burnMul).toBe(1.5);
    expect(boonParams('bankedCoals', 2).burnMul).toBe(2);
    expect(boonParams('perennial', 2)).toMatchObject({ growMul: 2, root: 1 });
    expect(boonText('deepWinter', 2)).toBe(boon('deepWinter').text2);
  });
});

describe('the deal', () => {
  it('weighs each school by its slots, casts, boons and a pledge', () => {
    const w = schoolWeights({
      slots: ['ember', 'frost'],
      casts: { ember: 12, storm: 99 },
      taken: { bankedCoals: 2, coldSnap: 1 },
      pledge: 'verdant',
    });
    expect(w.ember).toBe(LEAN.base + LEAN.slot + 2 + 2 * LEAN.boon);
    expect(w.frost).toBe(LEAN.base + LEAN.slot + LEAN.boon);
    expect(w.storm).toBe(LEAN.base + LEAN.castsMax);
    expect(w.verdant).toBe(LEAN.base + LEAN.pledge);
    expect(w.hallow).toBe(LEAN.base);
  });
  it('deals three, one general always, none taken as often as it can be', () => {
    const taken = { bankedCoals: 2, keenNose: 1 };
    for (const cards of deals(state({ taken }), 300)) {
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map((c) => c.id)).size).toBe(3);
      expect(cards.filter((c) => !boon(c.id).school).length).toBeGreaterThanOrEqual(1);
      expect(cards.some((c) => c.id === 'bankedCoals' || c.id === 'keenNose')).toBe(false);
    }
  });
  it('offers a school boon again as its second rank', () => {
    const seen = deals(state({ taken: { flamekeeper: 1 }, attuned: 'ember' }), 50)
      .flat()
      .find((c) => c.id === 'flamekeeper');
    expect(seen?.rank).toBe(2);
  });
  it("leans to the build: a mage's own school comes more often, and an attuned mage draws both school cards from it", () => {
    const leaning = state({ weights: schoolWeights({ slots: ['storm', null], casts: { storm: 20 }, taken: {} }) });
    const storm = deals(leaning, 600)
      .flat()
      .filter((c) => boon(c.id).school === 'storm');
    expect(storm.length / 600).toBeGreaterThan(0.6); // (flat, it would be about a third)
    expect(storm.every((c) => c.lean)).toBe(true);
    for (const cards of deals(state({ attuned: 'frost' }), 100))
      expect(cards.filter((c) => boon(c.id).school === 'frost')).toHaveLength(2);
    // once its school's boons are all taken, an attuned mage is dealt the others'
    const done = deals(state({ attuned: 'frost', taken: { deepWinter: 2, coldSnap: 2 } }), 50);
    for (const cards of done) {
      expect(cards).toHaveLength(3);
      expect(cards.some((c) => boon(c.id).school === 'frost')).toBe(false);
    }
  });
  it('never runs dry: Tempered is always there to deal', () => {
    const taken = Object.fromEntries(BOON_DEFS.filter((b) => b.id !== 'tempered').map((b) => [b.id, b.max]));
    const cards = dealBoons(state({ taken }), () => 0.5);
    expect(cards.map((c) => c.id)).toEqual(['tempered']);
  });
  it("keeps Keen Nose from a Taster's Spoon and Second Socket from a run with no waystone ahead", () => {
    const none = new Set<string>(),
      all = deals(state({ spoon: true, socketable: false, hold: none }), 400)
        .flat()
        .map((c) => c.id);
    expect(all).not.toContain('keenNose');
    expect(all).not.toContain('secondSocket');
    expect(
      deals(state({ hold: none }), 400)
        .flat()
        .map((c) => c.id),
    ).toEqual(expect.arrayContaining(['keenNose', 'secondSocket']));
  });
  it('holds back the general boons whose step is yet to come, so no card is dead', () => {
    const dealt = new Set(
      deals(state(), 400)
        .flat()
        .map((c) => c.id),
    );
    for (const id of NOT_YET) expect(dealt.has(id)).toBe(false);
    expect(dealt.has('tempered')).toBe(true);
  });
  it("deals a bargain's two cards from its school", () => {
    for (const cards of deals(state({ only: 'umbral' }), 50))
      expect(cards.filter((c) => boon(c.id).school === 'umbral')).toHaveLength(2);
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
      expect(pickPages(Rng.from('PL' + s, 'pages'), [null, null], 3, [], SPELL_DEFS, ['frost'])).toEqual(
        pickPages(Rng.from('PL' + s, 'pages'), [null, null], 3, [], SPELL_DEFS, ['frost'], null),
      );
    }
  });
});

/* What the school boons change. */
describe('the boons at work', () => {
  it('tune the statuses: Deep Winter freezes on two stacks and (II) longer, Gathering Dark gathers more hex and fades slower', () => {
    expect(boonTuning(MAGIC, {})).toBe(MAGIC);
    const dw = boonTuning(MAGIC, { deepWinter: 1 }),
      dw2 = boonTuning(MAGIC, { deepWinter: 2 });
    expect(dw.chill.freezeAt).toBe(2);
    expect(dw.chill.freezeTime).toBe(MAGIC.chill.freezeTime);
    expect(dw2.chill.freezeTime).toBeCloseTo(MAGIC.chill.freezeTime * 1.5);
    const gd = boonTuning(MAGIC, { gatheringDark: 1 }),
      gd2 = boonTuning(MAGIC, { gatheringDark: 2 });
    expect(gd.hex.max).toBe(7);
    expect(gd2.hex.max).toBe(9);
    expect(gd2.hex.time).toBeCloseTo(MAGIC.hex.time * 1.66);
    expect(MAGIC.chill.freezeAt).toBe(3);
    expect(MAGIC.hex.max).toBe(5); // (the data untouched)
  });
  it('freeze on the tuned stacks, never a boss, and a prism takes the tuned ice', () => {
    const T = boonTuning(MAGIC, { deepWinter: 2 });
    const s = newStatus();
    expect(applyStatus(s, 'chill', 1, false, T).froze).toBeFalsy();
    expect(applyStatus(s, 'chill', 1, false, T).froze).toBe(true);
    expect(s.frozen).toBeCloseTo(3);
    tickStatus(s, 3.01, T); // (thawed: a short guard against freezing again)
    expect(applyStatus(s, 'chill', 2, false, T).froze).toBeFalsy();
    expect(s.chill).toBe(1); // (the guard caps it a stack short)
    const boss = newStatus();
    applyStatus(boss, 'chill', 1, true, T);
    expect(applyStatus(boss, 'chill', 1, true, T).froze).toBeFalsy();
    const holy = newStatus();
    applyStatus(holy, 'sanct', 3, false, T);
    applyStatus(holy, 'chill', 1, false, T);
    expect(applyStatus(holy, 'chill', 1, false, T).reaction).toBe('prism');
    expect(holy.prism).toBeCloseTo(3);
  });
  it('gather hex to the tuned cap, fading slower, Blight to it too', () => {
    const T = boonTuning(MAGIC, { gatheringDark: 2 }),
      s = newStatus();
    for (let k = 0; k < 12; k++) applyStatus(s, 'hex', 1, false, T);
    expect(s.hex).toBe(9);
    expect(s.hexT).toBeCloseTo(MAGIC.hex.time * 1.66);
    tickStatus(s, MAGIC.hex.time + 0.1, T);
    expect(s.hex).toBe(9);
    const b = newStatus();
    applyStatus(b, 'hex', 6, false, T);
    expect(applyStatus(b, 'grow', 3, false, T).reaction).toBe('blight');
    expect(b.hex).toBe(9);
  });
  it('lengthen Burn, Overgrown and (Laid Bare II) Sanctified', () => {
    expect(statusMul('burn', {})).toBe(1);
    expect(statusMul('burn', { bankedCoals: 1 })).toBe(1.5);
    expect(statusMul('burn', { bankedCoals: 2 })).toBe(2);
    expect(statusMul('grow', { perennial: 2 })).toBe(2);
    expect(statusMul('sanct', { laidBare: 1 })).toBe(1);
    expect(statusMul('sanct', { laidBare: 2 })).toBe(1.5);
    expect(statusMul('chill', { bankedCoals: 2, perennial: 2, laidBare: 2 })).toBe(1);
  });
  it("know which spells they touch, for a spell's panel", () => {
    const all = Object.fromEntries(BOON_DEFS.map((b) => [b.id, 1]));
    expect(boonsTouching(spell('pyre_seal'), all)).toEqual(['bankedCoals', 'flamekeeper']);
    expect(boonsTouching(spell('arc'), all)).toEqual(['forkingArc', 'sparkWake']);
    expect(boonsTouching(spell('grasp_of_the_grave'), all)).toEqual(['thirstingHex', 'gatheringDark']);
    expect(boonsTouching(spell('arc'), {})).toEqual([]);
    for (const def of SPELL_DEFS) expect(boonsTouching(def, all).length).toBeGreaterThan(0); // (every spell has a boon to grow it)
  });
  it("refuse a school boon that doesn't say what it touches", () => {
    const deep = BOON_DEFS.find((b) => b.id === 'deepWinter')!;
    expect(validateBoons([...BOON_DEFS.filter((b) => b !== deep), { ...deep, touches: undefined }]).join(';')).toMatch(
      /needs `touches`/,
    );
    expect(
      validateBoons([
        ...BOON_DEFS.filter((b) => b !== deep),
        { ...deep, touches: { status: ['frostbite' as never] } },
      ]).join(';'),
    ).toMatch(/unknown status/);
  });
});

describe('the general boons', () => {
  it("Afterglow carries half a spell's statuses: stacks rounded up, seconds as they are", () => {
    expect(afterglowOf({ chill: 1 }, 0.5)).toEqual({ chill: 1 });
    expect(afterglowOf({ chill: 2, hex: 3 }, 0.5)).toEqual({ chill: 1, hex: 2 });
    expect(afterglowOf({ burn: 3, sanct: 4, root: 1.6, grow: 4, shock: 1 }, 0.5)).toEqual({
      burn: 1.5,
      sanct: 2,
      root: 0.8,
      grow: 2,
      shock: 0.5,
    });
    expect(afterglowOf(undefined, 0.5)).toEqual({});
  });
  it('deals them now, Second Socket too', () => {
    expect([...NOT_YET]).toEqual([]);
    const dealt = new Set(
      deals(state(), 600)
        .flat()
        .map((c) => c.id),
    );
    for (const id of ['keenNose', 'scavenger', 'brewersBreath', 'afterglow', 'secondSocket'])
      expect(dealt.has(id)).toBe(true);
  });
});
