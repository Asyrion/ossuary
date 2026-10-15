import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { SHAPES, SPELL_DEFS, manaRegen, pickPages, shelfPages, spell, validateSpells } from '../../src/magic/spellData';
import { validateLoot } from '../../src/items/loot';
import { Rng } from '../../src/rng';
import { STR } from '../../src/strings';

describe('spell data', () => {
  it('is valid', () => expect(validateSpells()).toEqual([]));

  it('catches mistakes', () => {
    const s = SPELL_DEFS[0];
    const bad = [
      { ...s, school: 'bone', shape: 'blob', status: { rot: 1 }, cooldown: 0, lore: 'short', color: 'red' },
      s,
    ] as never[];
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

  it("has two spells in each of Ember, Frost and Storm (an attack and a utility) and three of Verdant; every shape used, Verdant's on shapes that were there", () => {
    const bySchool = (school: string) => SPELL_DEFS.filter((s) => s.school === school).length;
    expect([bySchool('ember'), bySchool('frost'), bySchool('storm'), bySchool('verdant')]).toEqual([2, 2, 2, 3]);
    expect([...new Set(SPELL_DEFS.map((s) => s.shape))].sort()).toEqual([...SHAPES].sort());
    expect(
      SPELL_DEFS.filter((s) => s.school === 'verdant')
        .map((s) => s.shape)
        .sort(),
    ).toEqual(['grasp', 'wall', 'zone']);
  });

  it("costs mana so that a full bar casts a handful of spells, not a room's worth", () => {
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
    expect(manaRegen(0.5, false, CFG.mana)).toBe(2);
    expect(CFG.hero.mana).toBe(100);
  });
});

describe('grimoire pages', () => {
  it('offer spells the mage does not know, of different schools while they go round', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = new Rng(seed),
        known = ['arc', null];
      const three = pickPages(rng, known, 3);
      expect(three).toHaveLength(3);
      expect(three).not.toContain('arc');
      expect(new Set(three.map((id) => spell(id).school)).size).toBe(3);
      const five = pickPages(rng, known, 5, ['static_mantle']);
      expect(five).toHaveLength(5); // (twelve spells: Storm's two are known or skipped)
      expect(new Set(five.slice(0, 4).map((id) => spell(id).school)).size).toBe(4); // one of each school left first: Ember, Frost, Hallow, Umbral
    }
  });

  it('put the spells given up earlier back on the shelf, latest first, unless known again or on a lectern', () => {
    expect(shelfPages(['arc', 'rime_shards', 'cinder_lance', 'arc'], ['cinder_lance', null], ['pyre_seal'], 2)).toEqual(
      ['arc', 'rime_shards'],
    );
    expect(shelfPages(['arc'], [null, null], ['arc'], 2)).toEqual([]);
    expect(shelfPages([], [null, null], [], 2)).toEqual([]);
  });

  it('are priced and placed by data', () => expect(validateLoot()).toEqual([]));
});
