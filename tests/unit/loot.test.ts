import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/rng';
import { FLOORS, generateFloor } from '../../src/world/generate';
import { TEMPLATES, parseTemplate } from '../../src/world/templates';
import { DROPS, LOOT, RESOURCES, dropValue, rollEnemyDrop, rollRoomClear, validateLoot, type LootData } from '../../src/items/loot';

describe('loot data', () => {
  it('is valid', () => expect(validateLoot()).toEqual([]));

  it('catches mistakes', () => {
    const bad = { ...LOOT, start: { ...LOOT.start, glyphs: -1 }, roomClear: { chance: 2, weights: { gold: 3 } } } as unknown as LootData;
    const errs = validateLoot(bad).join('; ');
    expect(errs).toMatch(/start glyphs/);
    expect(errs).toMatch(/"gold" is unknown/);
    expect(errs).toMatch(/room clear chance/);
  });

  it('gives each drop its worth', () => {
    expect(dropValue('heart')).toEqual({ hearts: 2 });
    expect(dropValue('purse')).toEqual({ coins: LOOT.purse });
    expect(dropValue('glyph')).toEqual({ glyphs: 1 });
  });

  it('rolls room-clear drops at the chance and weights in the data', () => {
    const rng = new Rng(7), n = 20000, seen = new Map<string, number>();
    for (let i = 0; i < n; i++) { const d = rollRoomClear(rng); seen.set(String(d), (seen.get(String(d)) ?? 0) + 1); }
    expect(1 - (seen.get('null') ?? 0) / n).toBeCloseTo(LOOT.roomClear.chance, 1);
    const total = Object.values(LOOT.roomClear.weights).reduce((a, b) => a + b, 0);
    for (const d of DROPS) expect((seen.get(d) ?? 0) / n).toBeCloseTo(LOOT.roomClear.chance * LOOT.roomClear.weights[d] / total, 1);
  });
});

/* The economy, simulated on generated floors: every fight cleared, every enemy killed. Step 1 of M2 only
   has room clears and fallen enemies as sources; urns, coffers, chests, the vault's hoard and the secret
   room join in later steps to reach the GDD's 12 to 18 obols per floor. */
describe('economy', () => {
  it.each(FLOORS.map((cfg, i) => [i + 1, cfg] as const))('floor %i: room clears and enemies give a steady trickle', (_n, cfg) => {
    const N = 300, got = { coins: 0, keys: 0, glyphs: 0, hearts: 0 };
    for (let s = 0; s < N; s++) {
      const plan = generateFloor(Rng.from('ECON' + s, 'floor' + (_n - 1)), cfg, _n - 1), drops = Rng.from('ECON' + s, 'drops');
      for (const r of plan.rooms) {
        if (r.type !== 'normal') continue;
        const foes = r.variant === 'quiet' ? 1 : parseTemplate(TEMPLATES.get(r.templateId)!).foes.length;
        const found = [rollRoomClear(drops), ...Array.from({ length: foes }, () => rollEnemyDrop(drops))];
        for (const d of found) if (d) { const v = dropValue(d); for (const k of [...RESOURCES, 'hearts'] as const) got[k] += v[k] ?? 0; }
      }
    }
    const per = Object.fromEntries(Object.entries(got).map(([k, v]) => [k, v / N]));
    expect(per.coins).toBeGreaterThan(2); expect(per.coins).toBeLessThan(7);
    expect(per.glyphs).toBeGreaterThan(.4);
    expect(per.keys).toBeGreaterThan(.3);
    expect(per.hearts).toBeGreaterThan(1.5); // half hearts from room clears alone
  });
});
