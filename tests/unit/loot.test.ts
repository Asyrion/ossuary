import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/rng';
import { FLOORS, generateFloor } from '../../src/world/generate';
import { TEMPLATES, parseTemplate } from '../../src/world/templates';
import { DROPS, ITEMS, LOOT, MAX_WARES, RESOURCES, afterBurning, dropValue, priceOf, rollEnemyDrop, rollRoomClear, rollTable, rollWares, validateLoot, type Drop, type Item, type LootData } from '../../src/items/loot';

describe('loot data', () => {
  it('is valid', () => expect(validateLoot()).toEqual([]));

  it('catches mistakes', () => {
    const bad = { ...LOOT, start: { ...LOOT.start, glyphs: -1 }, roomClear: { chance: 2, weights: { gold: 3 } }, chest: { count: [3, 1], weights: { coffer: 1 } } } as unknown as LootData;
    const errs = validateLoot(bad).join('; ');
    expect(errs).toMatch(/start glyphs/);
    expect(errs).toMatch(/room clear drop "gold" is unknown/);
    expect(errs).toMatch(/room clear chance/);
    expect(errs).toMatch(/chest drop "coffer" is unknown/); // containers don't hold containers
    expect(errs).toMatch(/chest count/);
  });

  it('gives each item its worth', () => {
    expect(dropValue('heart')).toEqual({ hearts: 2 });
    expect(dropValue('purse')).toEqual({ coins: LOOT.purse });
    expect(dropValue('glyph')).toEqual({ glyphs: 1 });
  });

  it('rolls room-clear drops at the chance and weights in the data', () => {
    const rng = new Rng(7), n = 20000, seen = new Map<string, number>();
    for (let i = 0; i < n; i++) { const d = rollRoomClear(rng); seen.set(String(d), (seen.get(String(d)) ?? 0) + 1); }
    expect(1 - (seen.get('null') ?? 0) / n).toBeCloseTo(LOOT.roomClear.chance, 1);
    const w = LOOT.roomClear.weights as Record<Drop, number>, total = Object.values(w).reduce((a, b) => a + b, 0);
    for (const d of DROPS) expect((seen.get(d) ?? 0) / n).toBeCloseTo(LOOT.roomClear.chance * (w[d] ?? 0) / total, 1);
  });

  it('fills containers by their tables', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 200; i++) {
      const coffer = rollTable(rng, 'coffer'), chest = rollTable(rng, 'chest'), sealed = rollTable(rng, 'sealedUrn');
      expect(coffer.length).toBeGreaterThanOrEqual(LOOT.coffer.count![0]); expect(coffer.length).toBeLessThanOrEqual(LOOT.coffer.count![1]);
      expect(chest.length).toBeGreaterThanOrEqual(LOOT.chest.count![0]);
      expect(sealed).toHaveLength(1); // a sealed urn always holds something
      for (const d of [...coffer, ...chest, ...sealed]) expect(ITEMS).toContain(d);
    }
    const urns = Array.from({ length: 4000 }, () => rollTable(rng, 'urn').length);
    expect(urns.filter(n => n > 0).length / urns.length).toBeCloseTo(LOOT.urn.chance!, 1);
  });

  it("stocks the merchant: the artifact first when he has one, then items, 3 or 4 wares in all", () => {
    const rng = new Rng(11), [lo, hi] = LOOT.merchant.wares;
    for (let i = 0; i < 300; i++) {
      const withArt = rollWares(rng, true), without = rollWares(rng, false);
      expect(withArt[0]).toBe('artifact');
      expect(without).not.toContain('artifact');
      for (const w of [withArt, without]) {
        expect(w.length).toBeGreaterThanOrEqual(lo); expect(w.length).toBeLessThanOrEqual(Math.min(hi, MAX_WARES));
        for (const ware of w) expect(priceOf(ware)).toBeGreaterThan(0);
        for (const ware of w.filter(x => x !== 'artifact')) expect(Object.keys(LOOT.merchant.weights)).toContain(ware);
      }
    }
    expect(priceOf('artifact')).toBe(15); // GDD: Artifact (merchant pool), 15 obols
    const bad = { ...LOOT, merchant: { wares: [2, 6], prices: { artifact: 0, heart: 3 }, weights: { heart: 1, key: 1 } } } as unknown as LootData;
    const errs = validateLoot(bad).join('; ');
    expect(errs).toMatch(/merchant wares/); expect(errs).toMatch(/price for artifact/); expect(errs).toMatch(/price for key/);
  });

  it('burns half of a forced chest, never all of it', () => {
    expect(afterBurning(['a', 'b', 'c', 'd'])).toEqual(['a', 'b']);
    expect(afterBurning(['a', 'b', 'c'])).toEqual(['a']);
    expect(afterBurning(['a'])).toEqual(['a']);
  });
});

/* The economy, simulated on generated floors: every fight cleared, every enemy killed, every urn broken,
   every coffer opened, every vault and secret room opened; a chest and a vault each cost a bone key, a
   sealed urn and a secret room a glyph (counted as spent). A vault without an artifact holds a hoard and a
   chest; a secret room without one a hoard, coffers and a chest. With all of them the floors reach the
   GDD's 12 to 18 obols. */
describe('economy', () => {
  it.each(FLOORS.map((cfg, i) => [i + 1, cfg] as const))('floor %i: room clears, enemies, urns, containers, vaults and secret rooms', (floorNo, cfg) => {
    const N = 300, got = { coins: 0, keys: 0, glyphs: 0, hearts: 0 };
    let relics = 0;
    const add = (d: Item) => { const v = dropValue(d); for (const k of [...RESOURCES, 'hearts'] as const) got[k] += v[k] ?? 0; };
    // a chest takes a key; a gilded one holds a relic (an artifact beyond the budget) instead of loot
    const chest = () => { got.keys--; if (drops.chance(LOOT.gildedChest)) relics++; else rollTable(drops, 'chest').forEach(add); };
    let drops = new Rng(0);
    for (let s = 0; s < N; s++) {
      const plan = generateFloor(Rng.from('ECON' + s, 'floor' + (floorNo - 1)), cfg, floorNo - 1);
      drops = Rng.from('ECON' + s, 'drops');
      for (const r of plan.rooms) {
        const t = parseTemplate(TEMPLATES.get(r.templateId)!);
        for (const row of t.tiles) for (const tile of row) {
          if (tile === 'urn') rollTable(drops, 'urn').forEach(add);
          if (tile === 'sealedUrn') { got.glyphs--; rollTable(drops, 'sealedUrn').forEach(add); }
        }
        if (r.type === 'vault') {
          got.keys--;
          if (!r.artifact) { rollTable(drops, 'vaultHoard').forEach(add); chest(); }
        }
        if (r.type === 'secret') { // a glyph opens it; without an artifact it holds a hoard, coffers and chests
          got.glyphs--;
          if (!r.artifact) {
            rollTable(drops, 'secretHoard').forEach(add);
            for (let i = 0; i < LOOT.secretRoom.coffers; i++) rollTable(drops, 'coffer').forEach(add);
            for (let i = 0; i < LOOT.secretRoom.chests; i++) chest();
          }
        }
        if (r.type !== 'normal') continue;
        const foes = r.variant === 'quiet' ? 1 : t.foes.length;
        for (let i = 0; i < foes; i++) { const d = rollEnemyDrop(drops); if (d) add(d as Item); }
        const d = rollRoomClear(drops);
        if (d === 'chest') chest();
        else if (d === 'coffer') rollTable(drops, d).forEach(add);
        else if (d) add(d);
      }
    }
    const per = Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v / N]));
    expect(per.coins).toBeGreaterThan(12); expect(per.coins).toBeLessThan(18); // the GDD's target
    expect(per.glyphs).toBeGreaterThan(.2); // net of the glyphs sealed urns and secret rooms ask for
    expect(per.keys).toBeGreaterThan(.2);   // net of the keys chests and vaults ask for
    expect(per.hearts).toBeGreaterThan(2);
    // relics beyond the budget are rare: a few floors in a hundred
    expect(relics / N).toBeGreaterThan(0);
    expect(relics / N).toBeLessThan(.1);
  });
});
