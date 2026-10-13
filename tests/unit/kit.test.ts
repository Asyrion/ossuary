import { describe, expect, it } from 'vitest';
import { FLOORS } from '../../src/world/generate';
import { THEME_DEFS, themedLook } from '../../src/world/themeData';
import { KIT_PARTS, kindsOf, pickKinds, validateKit, type KitWeights } from '../../src/world/kitData';

describe("the room kit's kinds (M3.5 step 3)", () => {
  it('every floor offers two or three known kinds of wall, floor, wall light and brazier', () => {
    for (const f of FLOORS) {
      expect(validateKit(f.look.name, f.look.kit)).toEqual([]);
      for (const part of KIT_PARTS)
        expect(kindsOf(f.look.kit, part).length, `${f.look.name} ${part}`).toBeGreaterThanOrEqual(2);
      for (const part of KIT_PARTS)
        expect(kindsOf(f.look.kit, part).length, `${f.look.name} ${part}`).toBeLessThanOrEqual(3);
    }
  });

  it('a theme pins only known kinds, and a pinned kind is the one its rooms draw', () => {
    for (const t of THEME_DEFS) expect(validateKit(t.id, t.look?.kit, false)).toEqual([]);
    const ossuary = THEME_DEFS.find((t) => t.id === 'ossuary')!;
    const look = themedLook(FLOORS[0].look, ossuary);
    for (let seed = 1; seed < 40; seed++) expect(pickKinds(look.kit, seed).wall).toBe('bones');
    expect(kindsOf(look.kit, 'floor')).toEqual(kindsOf(FLOORS[0].look.kit, 'floor')); // (the rest as the floor's)
  });

  it("a room draws the same kinds every time, from its floor's list, about as often as weighted", () => {
    const kit = FLOORS[0].look.kit;
    expect(pickKinds(kit, 1234)).toEqual(pickKinds(kit, 1234));
    const count: Record<string, number> = {};
    for (let seed = 0; seed < 3000; seed++) {
      const k = pickKinds(kit, seed * 7919 + 13);
      for (const part of KIT_PARTS) expect(kindsOf(kit, part)).toContain(k[part]);
      count[k.wall] = (count[k.wall] ?? 0) + 1;
    }
    const w = kit.wall as Record<string, number>,
      total = Object.values(w).reduce((a, b) => a + b, 0);
    for (const [kind, n] of Object.entries(count)) expect(n / 3000).toBeCloseTo(w[kind] / total, 1);
  });

  it('forcing a kind (the dev menu) pins it and leaves the other parts as drawn', () => {
    const kit = FLOORS[1].look.kit,
      free = pickKinds(kit, 99),
      forced = pickKinds(kit, 99, { wall: 'rubble' });
    expect(forced.wall).toBe('rubble');
    expect({ ...forced, wall: free.wall }).toEqual(free);
  });

  it("every floor names its pottery (the room kit's urns: clay and bands) and its candles' wax", () => {
    for (const f of FLOORS) {
      for (const c of [f.look.urn.clay, f.look.urn.band, f.look.torch.wax])
        expect(c, f.look.name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('names unknown kinds and empty parts', () => {
    expect(validateKit('x', { wall: { velvet: 1 } } as unknown as KitWeights)).toEqual(
      expect.arrayContaining(['look "x": kit.wall names unknown kind "velvet"', 'look "x": kit.floor lists no kinds']),
    );
  });
});
