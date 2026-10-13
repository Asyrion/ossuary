import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import {
  ARTIFACT_DEFS,
  START_FOCUS,
  computeStats,
  validateArtifacts,
  type ArtifactDef,
} from '../../src/items/artifactData';
import { ATTRS, attrBonus, freePoints, noAttrs, spentPoints } from '../../src/progression/attributes';

/* M6 step 2: the four attributes (docs/archive/M6-plan.md). */
const base = { ...CFG.hero };
const A = CFG.attributes;

describe('attributes', () => {
  it('give nothing at none', () => {
    expect(attrBonus(noAttrs())).toEqual({
      heartHalves: 0,
      mana: 0,
      regenMul: 1,
      spellDamageMul: 1,
      speedMul: 1,
      fireDelayMul: 1,
    });
    expect(computeStats(START_FOCUS, [], base, [], 0, [], attrBonus(noAttrs()))).toEqual(
      computeStats(START_FOCUS, [], base),
    );
  });
  it('grow in a line with their points', () => {
    const b = attrBonus({ vigor: 3, arcana: 4, will: 2, swiftness: 5 });
    expect(b.heartHalves).toBe(Math.floor(3 / A.vigor.pointsPerHalf)); // (half a container every 2 points)
    expect(b.spellDamageMul).toBeCloseTo(1 + 4 * A.arcana.spell);
    expect(b.mana).toBe(2 * A.will.mana);
    expect(b.regenMul).toBeCloseTo(1 + 2 * A.will.regen);
    expect(b.speedMul).toBeCloseTo(1 + 5 * A.swiftness.speed);
    expect(b.fireDelayMul).toBeCloseTo(1 - 5 * A.swiftness.delay);
  });
  it('fold into the stats after the artifacts: half containers and mana added, multipliers multiplied', () => {
    const plain = computeStats(START_FOCUS, ['crown_of_thorns'], base);
    const grown = computeStats(
      START_FOCUS,
      ['crown_of_thorns'],
      base,
      [],
      0,
      [],
      attrBonus({ vigor: 2, arcana: 5, will: 3, swiftness: 4 }),
    );
    expect(grown.maxHp).toBe(plain.maxHp + 1); // (an odd number of halves: a half container)
    expect(grown.maxMana).toBe(plain.maxMana + 3 * A.will.mana);
    expect(grown.spellDamage).toBeCloseTo(plain.spellDamage * (1 + 5 * A.arcana.spell)); // (with the Crown of Thorns' ×1.5)
    expect(grown.speed).toBeCloseTo(plain.speed * (1 + 4 * A.swiftness.speed));
    expect(grown.fireDelay).toBeCloseTo(plain.fireDelay * (1 - 4 * A.swiftness.delay));
    expect(grown.regenMul).toBeCloseTo(1 + 3 * A.will.regen);
    expect(plain.regenMul).toBe(1);
    const fast = computeStats(
      START_FOCUS,
      [],
      { ...base, fireDelay: 0.09 },
      [],
      0,
      [],
      attrBonus({ ...noAttrs(), swiftness: 30 }),
    );
    expect(fast.fireDelay).toBe(0.08); // (the cantrip's floor kept)
  });
  it("are spent with a level's point", () => {
    expect(freePoints(1, noAttrs())).toBe(0);
    expect(freePoints(5, noAttrs())).toBe(4);
    const a = { ...noAttrs(), vigor: 2, will: 1 };
    expect(spentPoints(a)).toBe(3);
    expect(freePoints(5, a)).toBe(1);
    expect(freePoints(5, a, 3)).toBe(4); // (Tempered's three, step 6)
    expect(freePoints(2, a)).toBe(0);
    expect(ATTRS).toEqual(['vigor', 'arcana', 'will', 'swiftness']);
  });
  it("stay the mage's: an artifact can't carry the attributes' own keys", () => {
    const bad = [
      ...ARTIFACT_DEFS,
      {
        ...ARTIFACT_DEFS.find((d) => d.id === 'crown_of_thorns')!,
        id: 'test_halves',
        stats: { heartHalves: 1 },
      } as unknown as ArtifactDef,
    ];
    expect(validateArtifacts(bad).join('; ')).toMatch(/test_halves.*unknown stat "heartHalves"/);
  });
});
