import { describe, expect, it } from 'vitest';
import { MANTLE_IDS, mantleImmune, mantleSchool, pickMantle, stripsMantle, validateMantles } from '../../src/actors/mantleData';
import { MAGIC } from '../../src/magic/status';
import floors from '../../data/floors.json';

describe('champion mantles (M4.7)', () => {
  it('are five, one a school, and the tuning and every floor\'s weights check out', () => {
    expect(MANTLE_IDS).toEqual(['kindled', 'rimebound', 'stormcharged', 'hallowed', 'hexbound']);
    expect(MANTLE_IDS.map(id => mantleSchool(id))).toEqual(['ember', 'frost', 'storm', 'hallow', 'umbral']);
    expect(validateMantles(MAGIC, floors)).toEqual([]);
    for (const f of floors) expect(Object.keys(f.mantles ?? {}).length).toBeGreaterThan(0); // (every floor's champions wear one)
  });

  it('are stripped by their opposite school\'s status, and keep their own off where they say so', () => {
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
    for (const id of MANTLE_IDS) for (const k of ['burn', 'chill', 'shock', 'sanct', 'hex'] as const) expect(mantleImmune(id, k) && stripsMantle(id, k)).toBe(false);
  });

  it('are drawn by the floor\'s weights, none when it names none', () => {
    expect(pickMantle({ kindled: 1 }, .99)).toBe('kindled');
    expect(pickMantle({ kindled: 1, hexbound: 3 }, .2)).toBe('kindled');
    expect(pickMantle({ kindled: 1, hexbound: 3 }, .3)).toBe('hexbound');
    expect(pickMantle({}, .5)).toBeUndefined();
    expect(pickMantle(undefined, .5)).toBeUndefined();
    const seen = new Set(Array.from({ length: 200 }, (_, i) => pickMantle(floors[2].mantles, i / 200)));
    expect([...seen].sort()).toEqual(Object.keys(floors[2].mantles).sort()); // (each the floor names comes up, none else)
  });

  it('catch a mantle stripped by its own school or immune to what strips it', () => {
    const bad = structuredClone(MAGIC);
    (bad.mantles.kindled as { stripBy: string }).stripBy = 'ember';
    (bad.mantles.rimebound as { immune?: string }).immune = 'burn';
    expect(validateMantles(bad, [{ mantles: { glowing: 1 } }])).toEqual(['kindled: stripped by its own school', 'kindled: immune to what strips it', 'rimebound: immune to what strips it', 'floor 1: mantle glowing 1']);
  });
});
