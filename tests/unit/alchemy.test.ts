import { describe, expect, it } from 'vitest';
import {
  BOTTLE_SHAPES,
  COMMON_REAGENTS,
  POTIONS,
  POTION_IDS,
  RECIPES,
  REAGENT_IDS,
  bottlesFor,
  brew,
  isKnown,
  pairKey,
  pickPotion,
  reagentFor,
  recipeFor,
  validateAlchemy,
} from '../../src/items/alchemyData';
import { Rng } from '../../src/rng';
import { LOOT, priceOf, rollWares } from '../../src/items/loot';

// The potions, reagents and recipes as data (docs/archive/M5-plan.md; GDD: Potions and alchemy)
describe('alchemy', () => {
  it('the data is whole: twelve potions, seven reagents, every potion but the failed brew has a recipe', () => {
    expect(validateAlchemy()).toEqual([]);
    expect(POTION_IDS).toHaveLength(12);
    expect(REAGENT_IDS).toEqual([
      'graveMoss',
      'wispEssence',
      'boneDust',
      'emberSalt',
      'rimewater',
      'bloomPetal',
      'wardensAsh',
    ]);
    for (const id of POTION_IDS) if (id !== 'volatile') expect(RECIPES.some((r) => r.makes === id)).toBe(true);
    expect(POTIONS.hexBrew.bad && POTIONS.graveDraught.bad).toBe(true); // (still worth throwing)
  });

  it('the validator refuses a broken entry', () => {
    const bad = JSON.parse(
      JSON.stringify({
        potions: {
          x: {
            name: 'X',
            color: 'red',
            weight: 0,
            drink: { effect: 'fly' },
            throw: { effect: 'firePool' },
            text: { drink: 'a', throw: 'b' },
            lore: 'c',
          },
        },
        reagents: { r: { name: 'R', color: '#ffffff', leans: 'x', lore: 'y' } },
        recipes: [
          { of: ['r', 'r'], makes: 'x' },
          { of: ['r', 'r'], makes: 'nope' },
        ],
        sources: { schools: {}, foes: { f: 'nothing' }, objects: {}, boss: 'r' },
        bottles: { shapes: [], liquids: [] },
      }),
    ) as Parameters<typeof validateAlchemy>[0];
    const errs = validateAlchemy(bad).join('\n');
    expect(errs).toMatch(/colour red/);
    expect(errs).toMatch(/weight/);
    expect(errs).toMatch(/drink effect fly/);
    expect(errs).toMatch(/throw needs seconds/);
    expect(errs).toMatch(/makes nope/);
    expect(errs).toMatch(/second recipe/);
    expect(errs).toMatch(/source f/);
    expect(errs).toMatch(/too few liquid colours/);
  });

  it("brewing: the GDD's recipes, the order not counted, and a pair with none fails into a Volatile Mixture", () => {
    expect(brew('graveMoss', 'graveMoss')).toEqual({ potion: 'healing', recipe: true });
    expect(brew('graveMoss', 'wispEssence')).toEqual({ potion: 'mana', recipe: true });
    expect(brew('boneDust', 'emberSalt').potion).toBe('liquidEmber');
    expect(brew('wispEssence', 'rimewater').potion).toBe('frostbrew');
    expect(brew('emberSalt', 'rimewater')).toEqual({ potion: 'volatile', recipe: false }); // (fire and frost don't mix)
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'));
    // Warden's Ash with anything brews something strong
    for (const r of REAGENT_IDS) {
      const p = brew('wardensAsh', r).potion;
      expect(p).not.toBe('volatile');
    }
    expect(recipeFor('rimewater', 'graveMoss')).toBeUndefined();
    // Verdant's Bloom Petal leans to healing and growth
    expect(brew('bloomPetal', 'graveMoss').potion).toBe('healing');
    expect(brew('wispEssence', 'bloomPetal').potion).toBe('mana');
    expect(brew('bloomPetal', 'emberSalt').potion).toBe('liquidEmber');
    expect(brew('bloomPetal', 'rimewater')).toEqual({ potion: 'volatile', recipe: false });
  });

  it('bottles: each potion its own, the same seed dealing the same, another seed another; shapes spread before one repeats', () => {
    const a = bottlesFor(1234),
      b = bottlesFor(1234),
      c = bottlesFor(98765);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    const liquids = POTION_IDS.map((id) => a[id].liquid);
    expect(new Set(liquids).size).toBe(POTION_IDS.length); // (no two the same colour)
    const shapes = POTION_IDS.map((id) => a[id].shape);
    for (const s of BOTTLE_SHAPES) expect(shapes.filter((x) => x === s).length).toBe(2); // (twelve potions over six shapes)
    // over many seeds, a potion's bottle doesn't give it away
    const liquidOfHealing = new Set(Array.from({ length: 40 }, (_, i) => bottlesFor(i * 7919).healing.liquid));
    expect(liquidOfHealing.size).toBeGreaterThan(6);
  });

  it('a potion is known when identified this run, or ever brewed', () => {
    expect(isKnown('healing', [], [])).toBe(false);
    expect(isKnown('healing', ['healing'], [])).toBe(true);
    expect(isKnown('healing', new Set(), new Set(['healing']))).toBe(true);
  });

  it("reagents: a foe's own, else its school's; a boss leaves Warden's Ash; objects their own or none", () => {
    expect(reagentFor({ foe: 'sporeling', school: 'umbral' })).toBe('graveMoss');
    expect(reagentFor({ foe: 'hexImp', school: 'umbral' })).toBe('boneDust');
    expect(reagentFor({ foe: 'cinderSalamander', school: 'ember' })).toBe('emberSalt');
    expect(reagentFor({ foe: 'mireToad', school: 'frost' })).toBe('rimewater');
    expect(reagentFor({ foe: 'vesperMoth', school: 'hallow' })).toBe('wispEssence');
    expect(reagentFor({ foe: 'warden', boss: true })).toBe('wardensAsh');
    expect(reagentFor({ object: 'bones' })).toBe('boneDust');
    expect(reagentFor({ object: 'pew' })).toBeNull();
    expect(reagentFor({ object: 'blossom' })).toBe('bloomPetal'); // (the garden's flowering plants, and Verdant's foes)
    expect(reagentFor({ foe: 'wardVerdant', school: 'verdant' })).toBe('bloomPetal');
    expect(reagentFor({ foe: 'rotling', school: null })).toBeNull();
  });

  it('found potions follow their weights: rare ones rarer, all of them turning up', () => {
    const rng = new Rng(42),
      n: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const p = pickPotion(rng);
      n[p] = (n[p] ?? 0) + 1;
    }
    for (const id of POTION_IDS) expect(n[id]).toBeGreaterThan(0);
    expect(n.healing).toBeGreaterThan(n.echoes * 2);
  });

  it("potions turn up after fights and in coffers and chests, and shops stock potions (4 obols) and reagents (2), never Warden's Ash", () => {
    for (const w of [LOOT.roomClear.weights, LOOT.coffer.weights, LOOT.chest.weights])
      expect(w.potion).toBeGreaterThan(0);
    expect([priceOf('potion'), priceOf('reagent')]).toEqual([4, 2]);
    const rng = new Rng(7),
      seen = new Set<string>();
    for (let i = 0; i < 300; i++) for (const w of rollWares(rng, false)) seen.add(w);
    expect(seen.has('potion') && seen.has('reagent')).toBe(true);
    expect(COMMON_REAGENTS).not.toContain('wardensAsh');
  });
});
