import { describe, expect, it } from 'vitest';
import { WARDLING, drink, fullness, mostDrunk, newDrink } from '../../src/magic/drinking';
import { SCHOOLS } from '../../src/magic/spellData';
import { FOES, isFoe, validateFoes } from '../../src/actors/foeData';

describe('the drinking ward', () => {
  it('fills with what it drinks, and says when it is full', () => {
    const d = newDrink(60);
    expect(drink(d, 'ember', 25)).toBe(false);
    expect(fullness(d)).toBeCloseTo(25 / 60);
    expect(drink(d, 'frost', 20)).toBe(false);
    expect(drink(d, 'ember', 15)).toBe(true);
    expect(fullness(d)).toBe(1);
    expect(d.by).toMatchObject({ ember: 40, frost: 20, storm: 0 });
  });

  it('breaks into the school it drank most; of two drunk alike, the one it drank last', () => {
    const d = newDrink(100);
    drink(d, 'storm', 30);
    drink(d, 'hallow', 10);
    drink(d, 'storm', 5);
    expect(mostDrunk(d)).toBe('storm');
    const tie = newDrink(100);
    drink(tie, 'umbral', 20);
    drink(tie, 'ember', 20);
    expect(mostDrunk(tie)).toBe('ember');
    drink(tie, 'frost', 5);
    expect(mostDrunk(tie)).toBe('ember'); // (the last drunk isn't among the most: the first of them in the schools' order)
    expect(mostDrunk(newDrink(10))).toBe(SCHOOLS[0]);
  });

  it('a Wardling for every school, of that school, resisting it, and called up by wards only', () => {
    expect(validateFoes()).toEqual([]);
    for (const s of SCHOOLS) {
      const id = WARDLING[s];
      expect(isFoe(id), id).toBe(true);
      expect(FOES[id]).toMatchObject({ school: s, resist: s, floor: 0, behaviour: 'wardling', flying: true });
    }
  });
});
