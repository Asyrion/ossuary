import { describe, expect, it } from 'vitest';
import { SPELL_DEFS, spell, type Shape } from '../../src/magic/spellData';
import {
  RUNE_DEFS,
  RUNE_IDS,
  canCarve,
  payment,
  pickPair,
  pickRune,
  reprisedDef,
  runeFits,
  runedDef,
  runesFor,
  validateRunes,
} from '../../src/magic/runeData';
import { Rng } from '../../src/rng';

/* M6 step 7: runes, as rules (docs/archive/M6-plan.md, decision 9 and the runes table). */
describe('runes', () => {
  it('are valid: seven, and every spell takes three or more', () => {
    expect(validateRunes()).toEqual([]);
    expect(RUNE_DEFS).toHaveLength(7);
    for (const s of SPELL_DEFS) expect(runesFor(s).length).toBeGreaterThanOrEqual(3);
  });
  it("take the plan's counts by shape", () => {
    const takes = (shape: Shape) => runesFor({ shape }).length;
    for (const s of ['beam', 'chain', 'self'] as Shape[]) expect(takes(s)).toBe(3);
    for (const s of ['wall', 'orbit', 'smite', 'mark'] as Shape[]) expect(takes(s)).toBe(4);
    for (const s of ['placed', 'shotgun', 'zone', 'bolt'] as Shape[]) expect(takes(s)).toBe(5);
    expect(takes('grasp')).toBe(6);
    expect(runesFor({ shape: 'wall' })).not.toContain('reprise'); // (a second wall, mantle or ward would be a cast for nothing)
    expect(runesFor({ shape: 'self' })).not.toContain('reprise');
    expect(runesFor({ shape: 'orbit' })).not.toContain('reprise');
  });
  it('catch mistakes', () => {
    const wide = RUNE_DEFS.find((r) => r.id === 'wide')!;
    const errs = validateRunes([
      ...RUNE_DEFS.filter((r) => r !== wide),
      { ...wide, shapes: ['beam'] },
      { ...wide, id: 'wide' },
    ]).join('; ');
    expect(errs).toMatch(/listed twice/);
    expect(errs).toMatch(/WIDENS says nothing of it/);
    expect(validateRunes(RUNE_DEFS.filter((r) => r.id !== 'quicken' && r.id !== 'vein')).join(';')).toMatch(
      /takes fewer than three runes/,
    );
  });
  it('carve into a socket only what fits, while there is room, never twice', () => {
    const arc = spell('arc'),
      socket = { size: 1, runes: [] as never[] };
    expect(canCarve(socket, 'quicken', arc)).toBeNull();
    expect(canCarve(socket, 'wide', arc)).toBe('fit');
    expect(canCarve({ size: 1, runes: ['vein'] }, 'quicken', arc)).toBe('full');
    expect(canCarve({ size: 2, runes: ['quicken'] }, 'quicken', arc)).toBe('twice');
    expect(canCarve({ size: 2, runes: ['quicken'] }, 'vein', arc)).toBeNull();
  });
});

describe('a runed spell', () => {
  it('is the base spell itself with no runes, and never changes it', () => {
    const seal = spell('pyre_seal'),
      before = JSON.stringify(seal);
    expect(runedDef(seal, [])).toBe(seal);
    runedDef(seal, ['wide', 'lasting', 'quicken']);
    reprisedDef(seal, 0.5);
    expect(JSON.stringify(seal)).toBe(before);
  });
  it('Quicken: ready 30% sooner for 20% more mana (whole mana, the cooldown to a hundredth)', () => {
    const shards = spell('rime_shards'),
      q = runedDef(shards, ['quicken']);
    expect(q.cooldown).toBe(Math.round(shards.cooldown * 0.7 * 100) / 100);
    expect(q.mana).toBe(Math.round(shards.mana * 1.2));
    expect(Number.isInteger(runedDef(spell('hex_bolt'), ['quicken']).mana)).toBe(true);
    expect(q.runes).toEqual(['quicken']);
  });
  it('Wide: half again as large, 20% softer; a wall grows longer', () => {
    const seal = spell('pyre_seal'),
      w = runedDef(seal, ['wide']);
    expect(w.params.radius).toBeCloseTo(seal.params.radius * 1.5);
    expect(w.damage).toBeCloseTo(seal.damage * 0.8, 1);
    const wall = spell('glacial_wall');
    expect(runedDef(wall, ['wide']).params.width).toBeCloseTo(wall.params.width * 1.5);
    const ward = spell('wardlight');
    expect(runedDef(ward, ['wide']).params.radius).toBeCloseTo(ward.params.radius * 1.5, 1); // (to a hundredth)
  });
  it('Lasting: what it leaves lasts half again as long, for 20% more mana; a grasp holds longer', () => {
    const seal = spell('pyre_seal'),
      mantle = spell('static_mantle'),
      grasp = spell('grasp_of_the_grave');
    expect(runedDef(seal, ['lasting']).params.ground).toBeCloseTo(seal.params.ground * 1.5);
    expect(runedDef(mantle, ['lasting']).params.life).toBeCloseTo(mantle.params.life * 1.5);
    expect(runedDef(grasp, ['lasting']).status!.root).toBeCloseTo(grasp.status!.root! * 1.5);
    expect(runedDef(mantle, ['lasting', 'quicken']).mana).toBe(Math.round(mantle.mana * 1.2 * 1.2));
  });
  it('rounds away what multiplying leaves (no 1.2599999999999998 on a panel)', () => {
    const d = runedDef(spell('pyre_seal'), ['wide', 'quicken']);
    for (const v of [d.cooldown, d.damage, ...Object.values(d.params)]) expect(String(v)).not.toMatch(/\d{5,}/);
  });
});

describe('Reprise', () => {
  it("casts again at half: damage, statuses (stacks rounded up) and a seal's ground; a zone mends nothing", () => {
    const arc = reprisedDef(spell('arc'), 0.5);
    expect(arc.damage).toBe(spell('arc').damage / 2);
    expect(arc.status).toEqual({ shock: 0.5 });
    expect(arc.reprise).toBe(true);
    expect(reprisedDef(spell('rime_shards'), 0.5).status).toEqual({ chill: 1 });
    expect(reprisedDef(spell('pyre_seal'), 0.5).params.groundBurn).toBe(spell('pyre_seal').params.groundBurn / 2);
    expect(reprisedDef(spell('consecrate'), 0.5).params.heal).toBe(0);
  });
});

describe('paying for a cast', () => {
  const base = { cost: 20, mana: 50, vein: false, hp: 6, halves: 1, souls: 0 };
  it('free, then mana, then Vein, then a soul mote, then refused', () => {
    expect(payment({ ...base, cost: 0 })).toBe('free');
    expect(payment(base)).toBe('mana');
    expect(payment({ ...base, mana: 5 })).toBeNull();
    expect(payment({ ...base, mana: 5, endless: true })).toBe('mana');
    expect(payment({ ...base, mana: 5, vein: true, souls: 1 })).toBe('vein');
    expect(payment({ ...base, mana: 5, souls: 1 })).toBe('soul');
  });
  it('Vein never takes the last half heart', () => {
    expect(payment({ ...base, mana: 5, vein: true, hp: 1 })).toBeNull();
    expect(payment({ ...base, mana: 5, vein: true, hp: 1, souls: 1 })).toBe('soul');
    expect(payment({ ...base, mana: 5, vein: true, hp: 2 })).toBe('vein');
  });
});

/* M6 step 8: which rune a drop or a ware is: two times in three one that fits the hand, else any of the seven. */
describe('pickRune', () => {
  it('leans to the spells in the slots, two times in three', () => {
    const rng = new Rng(7),
      hand = [spell('cinder_lance')],
      N = 3000; // (a beam: three runes fit it)
    let fits = 0;
    for (let i = 0; i < N; i++) if (runeFits(pickRune(rng, hand, 2 / 3), hand[0])) fits++;
    const anyFits = runesFor(hand[0]).length / RUNE_IDS.length,
      expected = 2 / 3 + (1 / 3) * anyFits;
    expect(fits / N).toBeGreaterThan(expected - 0.04);
    expect(fits / N).toBeLessThan(expected + 0.04);
  });
  it('deals any of the seven with nothing in the hand, each about as often', () => {
    const rng = new Rng(11),
      seen: Record<string, number> = {};
    for (let i = 0; i < 7000; i++) {
      const id = pickRune(rng, [], 2 / 3);
      seen[id] = (seen[id] ?? 0) + 1;
    }
    expect(Object.keys(seen).sort()).toEqual([...RUNE_IDS].sort());
    for (const n of Object.values(seen)) {
      expect(n).toBeGreaterThan(800);
      expect(n).toBeLessThan(1200);
    }
  });
  it('draws the same twice from a stream whatever the hand, so a seed replays', () => {
    const a = new Rng(5),
      b = new Rng(5);
    pickRune(a, [spell('cinder_lance')], 2 / 3);
    pickRune(b, [], 2 / 3);
    expect(a.next()).toBe(b.next());
  });
});

/* M6 step 9: a waystone's pair: two different runes, dealt as one is. */
describe('pickPair', () => {
  it('deals two different runes, every time, and replays on a seed', () => {
    const rng = new Rng(3),
      hand = [spell('arc')];
    for (let i = 0; i < 500; i++) {
      const [a, b] = pickPair(rng, hand, 2 / 3);
      expect(a).not.toBe(b);
    }
    expect(pickPair(new Rng(9), hand, 2 / 3)).toEqual(pickPair(new Rng(9), hand, 2 / 3));
  });
});
