import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/rng';
import { FLOORS, generateFloor } from '../../src/world/generate';
import { TEMPLATES, parseTemplate } from '../../src/world/templates';
import { DROPS, ITEMS, LOOT, MAX_WARES, RESOURCES, afterBurning, dropValue, priceOf, rollEnemyDrop, rollRoomClear, rollTable, rollWares, soulToLose, validateLoot, type Drop, type Item, type LootData, type TableName } from '../../src/items/loot';

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
    // piles are poorer than urns: less often anything, rarely a heart, never keys
    const remains = Array.from({ length: 4000 }, () => rollTable(rng, 'remains')).flat(), urnLoot = Array.from({ length: 4000 }, () => rollTable(rng, 'urn')).flat();
    expect(remains.length).toBeLessThan(urnLoot.length);
    expect(remains.filter(d => d === 'halfHeart').length).toBeLessThan(urnLoot.filter(d => d === 'halfHeart').length / 2);
    expect([...remains, ...Array.from({ length: 2000 }, () => rollTable(rng, 'bundle')).flat()].some(d => d === 'key')).toBe(false);
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
  it.each(FLOORS.filter(f => !f.fixed).map((cfg, i) => [i + 1, cfg] as const))('floor %i: room clears, enemies, urns, containers, vaults and secret rooms', (floorNo, cfg) => {
    const N = 300, got = { coins: 0, keys: 0, glyphs: 0, hearts: 0, souls: 0 }, souls = cfg.souls ?? 1; // (the deep floors give more motes)
    let relics = 0;
    const add = (d: Item) => { const v = dropValue(d); for (const k of [...RESOURCES, 'hearts'] as const) got[k] += v[k] ?? 0; if (v.soul) got.souls++; };
    const roll = (name: TableName) => rollTable(drops, name, LOOT, souls);
    // a chest takes a key; a gilded one holds a relic (an artifact beyond the budget) instead of loot
    const chest = () => { got.keys--; if (drops.chance(LOOT.gildedChest)) relics++; else roll('chest').forEach(add); };
    let drops = new Rng(0);
    for (let s = 0; s < N; s++) {
      const plan = generateFloor(Rng.from('ECON' + s, 'floor' + (floorNo - 1)), cfg, floorNo - 1);
      drops = Rng.from('ECON' + s, 'drops');
      for (const r of plan.rooms) {
        const t = parseTemplate(TEMPLATES.get(r.templateId)!);
        for (const row of t.tiles) for (const tile of row) {
          if (tile === 'urn') roll('urn').forEach(add);
          if (tile === 'sealedUrn') { got.glyphs--; roll('sealedUrn').forEach(add); }
          if (tile === 'bones' || tile === 'skulls') roll('remains').forEach(add); // M3.6 piles
          if (tile === 'sacks') roll('bundle').forEach(add);
          if (tile === 'hoard') roll('hoard').forEach(add); // M4.1: a treasury's offering heaps, broken by blasts
        }
        if (r.type === 'vault') {
          got.keys--;
          if (!r.artifact) { roll('vaultHoard').forEach(add); chest(); }
        }
        if (r.type === 'secret') { // a glyph opens it; without an artifact it holds a hoard, coffers and chests
          got.glyphs--;
          if (!r.artifact) {
            roll('secretHoard').forEach(add);
            for (let i = 0; i < LOOT.secretRoom.coffers; i++) roll('coffer').forEach(add);
            for (let i = 0; i < LOOT.secretRoom.chests; i++) chest();
          }
        }
        if (r.type !== 'normal') continue;
        const foes = r.variant === 'quiet' ? 1 : t.foes.length;
        for (let i = 0; i < foes; i++) { const d = rollEnemyDrop(drops); if (d) add(d as Item); }
        const d = rollRoomClear(drops, LOOT, souls);
        if (d === 'chest') chest();
        else if (d === 'coffer') roll(d).forEach(add);
        else if (d) add(d);
      }
    }
    const per = Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v / N]));
    expect(per.coins).toBeGreaterThan(12); expect(per.coins).toBeLessThan(18); // the GDD's target
    expect(per.glyphs).toBeGreaterThan(.2); // net of the glyphs sealed urns and secret rooms ask for
    expect(per.keys).toBeGreaterThan(.2);   // net of the keys chests and vaults ask for
    expect(per.hearts).toBeGreaterThan(2);
    // soul motes (M4.1): a few a floor, more on the deep floors than the first
    expect(per.souls).toBeGreaterThan(floorNo >= 4 ? .8 : .25); expect(per.souls).toBeLessThan(floorNo >= 4 ? 3 : 1);
    // relics beyond the budget are rare: a few floors in a hundred
    expect(relics / N).toBeGreaterThan(0);
    expect(relics / N).toBeLessThan(.1);
  });
});

/* M6 step 8: runes as things, rolled on the run's own stream beside the drops (docs/archive/M6-plan.md, decision 10): half the
   shops lay one as an extra ware, half the secret rooms without an artifact keep one, a gilded chest always lets one out
   beside its relic, and the Wandering Merchant (once a run at most, all but sure to come) carries one half the time; none
   on floor 5. With the waystones' four (step 9) a run finds five or six. */
describe('runes as things (M6 step 8)', () => {
  it('a run finds one or two and is offered two or three, none on floor 5', () => {
    const N = 300, R = LOOT.runes;
    let found = 0, offered = 0, deep = 0;
    for (let s = 0; s < N; s++) {
      const runes = Rng.from('ECON' + s, 'runes'), drops = Rng.from('ECON' + s, 'drops');
      FLOORS.forEach((cfg, f) => {
        const odds = (p: number) => runes.chance(p * (cfg.runes ?? 1));
        const plan = generateFloor(Rng.from('ECON' + s, 'floor' + f), cfg, f);
        for (const r of plan.rooms) {
          let n = 0, o = 0;
          if (r.type === 'merchant' && odds(R.merchant)) o++;
          if (r.type === 'secret' && !r.artifact && odds(R.secret)) n++;
          if ((r.type === 'secret' && !r.artifact || r.type === 'vault' && !r.artifact) && drops.chance(LOOT.gildedChest) && odds(R.gilded)) n++;
          found += n; offered += o; if (f === 4) deep += n + o;
        }
      });
      if (runes.chance(R.wanderer)) offered++; // (the Wandering Merchant, on floors 1 to 4 where it comes)
    }
    expect(found / N).toBeGreaterThan(.6); expect(found / N).toBeLessThan(1.8);
    expect(offered / N).toBeGreaterThan(1.5); expect(offered / N).toBeLessThan(3.5);
    expect(deep).toBe(0);
    expect(FLOORS[4].runes).toBe(0); for (const f of FLOORS.slice(0, 4)) expect(f.runes ?? 1).toBeGreaterThan(0);
  });
  it('a rune is a ware with a price at both traders, and goes to the pouch', () => {
    expect(priceOf('rune')).toBe(10); expect(LOOT.wanderer.prices.rune).toBeGreaterThan(0);
    expect(dropValue('rune')).toEqual({ rune: 1 });
    const bad = { ...LOOT, runes: { merchant: 2, secret: .5, wanderer: .5, gilded: 1 }, wanderer: { ...LOOT.wanderer, prices: { ...LOOT.wanderer.prices, rune: 0 } } } as unknown as LootData;
    const errs = validateLoot(bad).join('; ');
    expect(errs).toContain("runes' merchant chance"); expect(errs).toContain("wanderer's price for a rune");
  });
});

describe('soul motes and the lodestone shard (M4.1)', () => {
  it('each gives what it is', () => {
    expect(dropValue('paleSoul')).toEqual({ soul: 'pale' });
    expect(dropValue('blackSoul')).toEqual({ soul: 'black' });
    expect(dropValue('hallowedSoul')).toEqual({ soul: 'hallowed' });
    expect(dropValue('shard')).toEqual({ shard: LOOT.shard });
  });

  it('a hit takes the last mote taken, a hallowed one only when no other is left', () => {
    expect(soulToLose([])).toBe(-1);
    expect(soulToLose(['pale', 'black'])).toBe(1);
    expect(soulToLose(['black', 'hallowed', 'pale'])).toBe(2);
    expect(soulToLose(['pale', 'hallowed', 'hallowed'])).toBe(0);
    expect(soulToLose(['hallowed', 'hallowed'])).toBe(1);
  });

  it('a floor that gives more motes gives them in proportion, and only them', () => {
    const count = (souls: number) => {
      const rng = new Rng(7), seen = new Map<string, number>();
      for (let i = 0; i < 20000; i++) { const d = rollRoomClear(rng, LOOT, souls); seen.set(String(d), (seen.get(String(d)) ?? 0) + 1); }
      return seen;
    };
    const one = count(1), three = count(3);
    const motes = (m: Map<string, number>) => ['paleSoul', 'blackSoul', 'hallowedSoul'].reduce((a, k) => a + (m.get(k) ?? 0), 0);
    expect(motes(three) / motes(one)).toBeGreaterThan(2.3);
    expect((three.get('glyph') ?? 0) / (one.get('glyph') ?? 1)).toBeLessThan(1); // (the rest a little rarer, as the weights share out)
    expect(three.get('null')! / one.get('null')!).toBeCloseTo(1, 1); // (as often something at all)
  });
});
