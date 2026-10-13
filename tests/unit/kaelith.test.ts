import { describe, expect, it } from 'vitest';
import { WARD_SCHOOLS, phaseOf, sealWards } from '../../src/actors/kaelithData';
import { CFG } from '../../src/config';
import { FLOORS } from '../../src/world/generate';

const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};

describe("Kaelith's fight (M7 step 2)", () => {
  it('runs in three phases by its health: the Sentinel, the seal cracking, the last light', () => {
    const M = CFG.enemy.kaelith.phases;
    expect(phaseOf(100, 100, M)).toBe(1);
    expect(phaseOf(67, 100, M)).toBe(1);
    expect(phaseOf(66, 100, M)).toBe(2);
    expect(phaseOf(34, 100, M)).toBe(2);
    expect(phaseOf(33, 100, M)).toBe(3);
    expect(phaseOf(0, 100, M)).toBe(3);
  });
  it('wakes four wards, all different, the schools the mage holds first, then Ember and Hallow', () => {
    for (let s = 0; s < 50; s++) {
      const r = Math.random;
      expect(new Set(sealWards([], r)).size).toBe(4);
      expect(sealWards([], seq(0.99)).sort()).toEqual(['ember', 'frost', 'hallow', 'storm'].sort());
      expect(sealWards(['umbral', 'storm'], r)).toEqual(expect.arrayContaining(['umbral', 'storm', 'ember', 'hallow']));
      expect(sealWards(['verdant', null, 'frost'], r)).toEqual(expect.arrayContaining(['frost', 'ember', 'hallow'])); // (Verdant reaches no ward)
      for (const w of sealWards(['ember', 'ember'], r)) expect(WARD_SCHOOLS).toContain(w);
    }
  });
  it("is the Seal's boss, weak to Hallow and resisting Umbral", () => {
    const seal = FLOORS.find((f) => f.fixed)!;
    expect(seal.boss.pool).toEqual(['kaelith']);
    expect(CFG.enemy.kaelith).toMatchObject({ weak: 'hallow', resist: 'umbral' });
    for (const f of FLOORS.filter((f) => !f.fixed)) expect(f.boss.pool).not.toContain('kaelith');
  });
});
