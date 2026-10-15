import { describe, expect, it } from 'vitest';
import {
  MANTLE_IDS,
  mantleImmune,
  mantleSchool,
  pickMantle,
  stripsMantle,
  validateMantles,
} from '../../src/actors/mantleData';
import { MAGIC } from '../../src/magic/status';
import floors from '../../data/floors.json';

describe('champion mantles', () => {
  it("are five, one a school, and the tuning and every floor's weights check out", () => {
    expect(MANTLE_IDS).toEqual(['kindled', 'rimebound', 'stormcharged', 'hallowed', 'hexbound']);
    expect(MANTLE_IDS.map((id) => mantleSchool(id))).toEqual(['ember', 'frost', 'storm', 'hallow', 'umbral']);
    expect(validateMantles(MAGIC, floors)).toEqual([]);
    for (const f of floors) expect(Object.keys(f.mantles ?? {}).length).toBeGreaterThan(0); // (every floor's champions wear one)
  });

  it("are stripped by their opposite school's status, and keep their own off where they say so", () => {
    expect(stripsMantle('kindled', 'chill')).toBe(true);
    expect(stripsMantle('kindled', 'burn')).toBe(false);
    expect(stripsMantle('rimebound', 'burn')).toBe(true);
    expect(stripsMantle('stormcharged', 'chill')).toBe(true);
    expect(stripsMantle('hallowed', 'hex')).toBe(true);
    expect(stripsMantle('hallowed', 'root')).toBe(true); // (Umbral's hands too)
    expect(stripsMantle('hexbound', 'sanct')).toBe(true);
    expect(stripsMantle('hexbound', 'shock')).toBe(false);
    expect(mantleImmune('kindled', 'burn')).toBe(true);
    expect(mantleImmune('rimebound', 'chill')).toBe(true);
    expect(mantleImmune('stormcharged', 'shock')).toBe(false);
    for (const id of MANTLE_IDS)
      for (const k of ['burn', 'chill', 'shock', 'sanct', 'hex'] as const)
        expect(mantleImmune(id, k) && stripsMantle(id, k)).toBe(false);
  });

  it("are drawn by the floor's weights, none when it names none", () => {
    expect(pickMantle({ kindled: 1 }, 0.99)).toBe('kindled');
    expect(pickMantle({ kindled: 1, hexbound: 3 }, 0.2)).toBe('kindled');
    expect(pickMantle({ kindled: 1, hexbound: 3 }, 0.3)).toBe('hexbound');
    expect(pickMantle({}, 0.5)).toBeUndefined();
    expect(pickMantle(undefined, 0.5)).toBeUndefined();
    const seen = new Set(Array.from({ length: 200 }, (_, i) => pickMantle(floors[2].mantles, i / 200)));
    expect([...seen].sort()).toEqual(Object.keys(floors[2].mantles).sort()); // (each the floor names comes up, none else)
  });

  it('catch a mantle stripped by its own school or immune to what strips it', () => {
    const bad = structuredClone(MAGIC);
    (bad.mantles.kindled as { stripBy: string }).stripBy = 'ember';
    (bad.mantles.rimebound as { immune?: string }).immune = 'burn';
    expect(validateMantles(bad, [{ mantles: { glowing: 1 } }])).toEqual([
      'kindled: stripped by its own school',
      'kindled: immune to what strips it',
      'rimebound: immune to what strips it',
      'floor 1: mantle glowing 1',
    ]);
  });
});

describe('counters', () => {
  it("each foe's counters have a word, and name foes that exist", async () => {
    const { validateCounters, countersOf } = await import('../../src/actors/counterData');
    expect(validateCounters()).toEqual([]);
    expect(countersOf('griffin')).toEqual(['grounded']);
    expect(countersOf('stormMantis')).toEqual(['numbed', 'flanked']);
    expect(countersOf('mireToad')).toEqual([]);
  });
});

describe('rooms with a pair', () => {
  it("every floor's pairs name foes, and a pair takes the first two slots, keeping one elite and one pack a room, on hundreds of seeds", async () => {
    const { FOES, isFoe, pairRoom, validatePairs } = await import('../../src/actors/foeData');
    const mulberry = (a: number) => () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }; // (util.ts's, which needs a window)
    expect(validatePairs(floors as never)).toEqual([]);
    floors.forEach((f, fi) => {
      let paired = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const R = mulberry(seed * 977 + fi),
          roles = ['R', 'W', 'H', 'R', 'W'];
        const wave = roles.map((role) => ({
          kind: (f.foes as unknown as Record<string, [string, number][]>)[role][0][0],
          role,
        }));
        const at = pairRoom(wave, f.pairs as never, f.foes as never, R);
        if (!at) continue;
        paired++;
        expect(at).toEqual([0, 1]);
        expect(f.pairs.list.some(([a, b]) => wave[0].kind === a && wave[1].kind === b)).toBe(true);
        const elites = wave.filter((w) => isFoe(w.kind) && FOES[w.kind].elite).length,
          packs = wave.filter((w) => isFoe(w.kind) && FOES[w.kind].pack).length;
        expect(elites).toBeLessThanOrEqual(1);
        expect(packs).toBeLessThanOrEqual(1);
      }
      expect(paired / 400).toBeGreaterThan(f.pairs.chance * 0.5);
      expect(paired / 400).toBeLessThan(f.pairs.chance * 1.6);
    });
    expect(
      pairRoom(
        [
          { kind: 'boss', role: 'R' },
          { kind: 'sporeling', role: 'R' },
        ],
        { chance: 1, list: [['cryptSpider', 'inkOctopus', 1]] },
        floors[0].foes as never,
        () => 0,
      ),
    ).toBeUndefined(); // (one slot besides the boss: no pair)
  });
});
