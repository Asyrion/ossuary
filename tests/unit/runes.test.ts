import { describe, expect, it } from 'vitest';
import { SPELL_DEFS, spell, type Shape } from '../../src/magic/spellData';
import { RUNE_DEFS, canCarve, payment, reprisedDef, runedDef, runesFor, validateRunes, type RuneDef } from '../../src/magic/runeData';

/* M6 step 7: runes, as rules (docs/M6-plan.md, decision 9 and the runes table). */
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
    expect(runesFor({ shape: 'self' })).not.toContain('reprise'); expect(runesFor({ shape: 'orbit' })).not.toContain('reprise');
  });
  it('catch mistakes', () => {
    const wide = RUNE_DEFS.find(r => r.id === 'wide')!;
    const errs = validateRunes([...RUNE_DEFS.filter(r => r !== wide), { ...wide, shapes: ['beam'] } as RuneDef, { ...wide, id: 'wide' } as RuneDef]).join('; ');
    expect(errs).toMatch(/listed twice/); expect(errs).toMatch(/WIDENS says nothing of it/);
    expect(validateRunes(RUNE_DEFS.filter(r => r.id !== 'quicken' && r.id !== 'vein')).join(';')).toMatch(/takes fewer than three runes/);
  });
  it('carve into a socket only what fits, while there is room, never twice', () => {
    const arc = spell('arc'), socket = { size: 1, runes: [] as never[] };
    expect(canCarve(socket, 'quicken', arc)).toBeNull();
    expect(canCarve(socket, 'wide', arc)).toBe('fit');
    expect(canCarve({ size: 1, runes: ['vein'] }, 'quicken', arc)).toBe('full');
    expect(canCarve({ size: 2, runes: ['quicken'] }, 'quicken', arc)).toBe('twice');
    expect(canCarve({ size: 2, runes: ['quicken'] }, 'vein', arc)).toBeNull();
  });
});

describe('a runed spell', () => {
  it('is the base spell itself with no runes, and never changes it', () => {
    const seal = spell('pyre_seal'), before = JSON.stringify(seal);
    expect(runedDef(seal, [])).toBe(seal);
    runedDef(seal, ['wide', 'lasting', 'quicken']); reprisedDef(seal, .5);
    expect(JSON.stringify(seal)).toBe(before);
  });
  it('Quicken: ready 30% sooner for 20% more mana (whole mana, the cooldown to a hundredth)', () => {
    const shards = spell('rime_shards'), q = runedDef(shards, ['quicken']);
    expect(q.cooldown).toBe(Math.round(shards.cooldown * .7 * 100) / 100); expect(q.mana).toBe(Math.round(shards.mana * 1.2));
    expect(Number.isInteger(runedDef(spell('hex_bolt'), ['quicken']).mana)).toBe(true);
    expect(q.runes).toEqual(['quicken']);
  });
  it('Wide: half again as large, 20% softer; a wall grows longer', () => {
    const seal = spell('pyre_seal'), w = runedDef(seal, ['wide']);
    expect(w.params.radius).toBeCloseTo(seal.params.radius * 1.5); expect(w.damage).toBeCloseTo(seal.damage * .8, 1);
    const wall = spell('glacial_wall'); expect(runedDef(wall, ['wide']).params.width).toBeCloseTo(wall.params.width * 1.5);
    const ward = spell('wardlight'); expect(runedDef(ward, ['wide']).params.radius).toBeCloseTo(ward.params.radius * 1.5, 1); // (to a hundredth)
  });
  it('Lasting: what it leaves lasts half again as long, for 20% more mana; a grasp holds longer', () => {
    const seal = spell('pyre_seal'), mantle = spell('static_mantle'), grasp = spell('grasp_of_the_grave');
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
  it('casts again at half: damage, statuses (stacks rounded up) and a seal\'s ground; a zone mends nothing', () => {
    const arc = reprisedDef(spell('arc'), .5);
    expect(arc.damage).toBe(spell('arc').damage / 2); expect(arc.status).toEqual({ shock: .5 }); expect(arc.reprise).toBe(true);
    expect(reprisedDef(spell('rime_shards'), .5).status).toEqual({ chill: 1 });
    expect(reprisedDef(spell('pyre_seal'), .5).params.groundBurn).toBe(spell('pyre_seal').params.groundBurn / 2);
    expect(reprisedDef(spell('consecrate'), .5).params.heal).toBe(0);
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
