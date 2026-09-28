import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { SHAPES, SPELL_DEFS, manaRegen, validateSpells } from '../../src/magic/spellData';
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
    expect(validateSpells([{ ...s, params: {} }] as never[]).join('; ')).toMatch(/needs param/);
  });

  it('has M3\'s six spells: an attack and a utility in each of Ember, Frost and Storm, every shape once', () => {
    const bySchool = (school: string) => SPELL_DEFS.filter(s => s.school === school).length;
    expect([bySchool('ember'), bySchool('frost'), bySchool('storm')]).toEqual([2, 2, 2]);
    expect(SPELL_DEFS.map(s => s.shape).sort()).toEqual([...SHAPES].sort());
  });

  it('costs mana so that a full bar casts a handful of spells, not a room\'s worth', () => {
    for (const s of SPELL_DEFS) {
      expect(s.mana).toBeGreaterThanOrEqual(10);
      expect(CFG.hero.mana / s.mana).toBeLessThanOrEqual(8);
      expect(s.cooldown).toBeGreaterThanOrEqual(1);
    }
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
