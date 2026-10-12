import { describe, expect, it } from 'vitest';
import { SHADE_DATA, SHADE_IDS, breaks, chainCount, chainSchools, pickShade, shadeRoom, validateShades } from '../../src/vigil/shadeData';
import { FLOORS } from '../../src/world/generate';
import { STR } from '../../src/strings';
import { mulberry } from '../../src/rng';

describe('chained shades (M7 step 6)', () => {
  it('ten townspeople, each found on its floors and helping its own way, every floor with one to find; named and told', () => {
    expect(validateShades()).toEqual([]);
    for (const id of SHADE_IDS) expect(STR.shades.names[id], id).toBeTruthy();
    for (const s of SHADE_DATA.shades) { expect(STR.shades.helps[s.help], s.help).toBeTruthy(); expect(STR.shades.acts[s.help], s.help).toBeTruthy(); }
    expect(FLOORS.filter(f => !f.fixed).every(f => (f.shade ?? 0) > .5)).toBe(true); // (about one a floor)
    expect(FLOORS.filter(f => f.fixed).every(f => !f.shade)).toBe(true); // (none at the Seal)
  });
  it('picks a shade the floor takes in, never one freed, walking or met; none when the chance fails or all are gone', () => {
    for (let s = 0; s < 200; s++) {
      const floor = 1 + (s % 5), id = pickShade(floor, 1, ['scribe'], ['sexton'], mulberry(s));
      if (!id) continue;
      const def = SHADE_DATA.shades.find(d => d.id === id)!;
      expect(floor).toBeGreaterThanOrEqual(def.floors[0]); expect(floor).toBeLessThanOrEqual(def.floors[1]);
      expect(['scribe', 'sexton']).not.toContain(id);
    }
    expect(pickShade(1, 0, [], [], mulberry(1))).toBeNull();
    expect(pickShade(1, 1, ['forager', 'scribe', 'sexton'], [], mulberry(1))).toBeNull(); // (floor 1's three all freed)
  });
  it('lies in a secret room, an ordeal, a boss\'s keeping, a library or a vault, never anywhere else', () => {
    const rooms = [{ id: 0, type: 'start' as const }, { id: 1, type: 'normal' as const }, { id: 2, type: 'library' as const }, { id: 3, type: 'boss' as const }];
    const seen = new Set<number | null>(); for (let s = 0; s < 100; s++) seen.add(shadeRoom(rooms, mulberry(s)));
    expect([...seen].sort()).toEqual([2, 3]);
    expect(shadeRoom([{ id: 0, type: 'start' }], mulberry(1))).toBeNull();
  });
  it('wards its chains with schools the mage can land, plain ones beyond them; a blast breaks any', () => {
    expect(chainCount(1)).toBe(2); expect(chainCount(5)).toBe(3); expect(chainCount(9)).toBe(3);
    const w = chainSchools(['umbral', 'ember', 'ember'], 3, mulberry(4));
    expect(w.filter(Boolean).sort()).toEqual(['ember', 'umbral']); expect(w.filter(x => x === null)).toHaveLength(1);
    expect(chainSchools([], 2, mulberry(1))).toEqual([null, null]);
    expect(breaks('ember', 'ember')).toBe(true); expect(breaks('ember', 'frost')).toBe(false); expect(breaks('ember', undefined)).toBe(false);
    expect(breaks(null, undefined)).toBe(true); expect(breaks(null, 'frost')).toBe(true); expect(breaks('hallow', 'blast')).toBe(true);
  });
});
