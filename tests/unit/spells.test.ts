import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { SPELL_DEFS, manaRegen, validateSpells } from '../../src/magic/spellData';
import { STR } from '../../src/strings';

describe('spell data', () => {
  it('is valid', () => expect(validateSpells()).toEqual([]));

  it('catches mistakes', () => {
    const s = SPELL_DEFS[0];
    const bad = [{ ...s, school: 'bone', shape: 'blob', status: { rot: 1 }, cooldown: 0, lore: 'short', color: 'red' }, s] as never[];
    const errs = validateSpells(bad).join('; ');
    expect(errs).toMatch(/unknown school/);
    expect(errs).toMatch(/unknown shape/);
    expect(errs).toMatch(/unknown status/);
    expect(errs).toMatch(/cooldown above 0/);
    expect(errs).toMatch(/lore of 60/);
    expect(errs).toMatch(/bad colour/);
    expect(validateSpells([s, s] as never[]).join('; ')).toMatch(/listed twice/);
  });

  it('names every school a spell belongs to', () => {
    for (const s of SPELL_DEFS) expect(STR.schools[s.school]).toBeTruthy();
  });
});

describe('mana', () => {
  it('comes back four times faster out of a fight than in one (GDD: Magic system)', () => {
    expect(manaRegen(1, false, CFG.mana)).toBe(4);
    expect(manaRegen(1, true, CFG.mana)).toBe(1);
    expect(manaRegen(.5, false, CFG.mana)).toBe(2);
    expect(CFG.hero.mana).toBe(100);
  });
});
