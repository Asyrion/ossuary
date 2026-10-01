import { describe, expect, it } from 'vitest';
import floors from '../../data/floors.json';
import { extraSlot, floorWeakness, leanSchools, pickFoe, wallsOff, type RoleTable } from '../../src/actors/foeData';
import { pickPages, SPELL_DEFS, spell } from '../../src/magic/spellData';
import { CFG } from '../../src/config';

const mulberry = (a: number) => () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // (util.ts's, which needs a window)

describe('the curve (M4.9): pressure dials', () => {
  it('rise from floor to floor: foes added, elites, an ordeal\'s waves, champions and pairs', () => {
    const dial = (f: typeof floors[number]) => {
      const v = f.variants as Record<string, number>, total = Object.values(v).reduce((a, b) => a + b, 0);
      return [f.pressure.extra, f.pressure.eliteMul, f.pressure.ordealWaves, v.champion / total, f.pairs!.chance];
    };
    for (let i = 1; i < floors.length; i++) {
      const a = dial(floors[i - 1]), b = dial(floors[i]);
      b.forEach((x, k) => expect(x, `floor ${i + 1}, dial ${k}`).toBeGreaterThanOrEqual(a[k]));
    }
    expect(floors[0].pressure).toEqual({ extra: 0, eliteMul: 1, ordealWaves: 0 }); // (floor 1 is as it was)
    expect(floors[4].pressure.extra).toBeGreaterThan(.25);
  });

  it('add one more of a fight\'s walkers or fliers in a share of rooms, never the boss, a heavy, an elite or a pack', () => {
    const wave = [{ kind: 'sporeling', role: 'R' }, { kind: 'runeBeetle', role: 'H' }, { kind: 'vesperMoth', role: 'W' }, { kind: 'boss', role: 'R' }, { kind: 'fireflySwarm', role: 'W' }];
    let added = 0;
    for (let s = 1; s <= 2000; s++) {
      const i = extraSlot(wave, .25, mulberry(s));
      if (i < 0) continue;
      added++;
      expect(['sporeling', 'vesperMoth']).toContain(wave[i].kind);
    }
    expect(added / 2000).toBeGreaterThan(.2); expect(added / 2000).toBeLessThan(.3);
    expect(extraSlot(wave, 0, () => 0)).toBe(-1);
    expect(extraSlot([{ kind: 'boss', role: 'R' }], 1, () => 0)).toBe(-1);
  });

  it('make elites likelier by the floor\'s weight, never more than one a room', () => {
    const table = floors[4].foes as unknown as RoleTable, count = (mul: number) => { let n = 0; const R = mulberry(7); for (let k = 0; k < 4000; k++) if (['glacierGolem', 'hydra', 'lanternTortoise'].includes(pickFoe(table, 'H', R, false, false, mul))) n++; return n; };
    expect(count(1.4)).toBeGreaterThan(count(1));
    expect(pickFoe(table, 'H', () => .99, true, false, 9)).not.toMatch(/^(glacierGolem|hydra|lanternTortoise)$/);
  });
});

describe('the curve (M4.9): the floor teaches its counter', () => {
  it('works out what each floor\'s foes are weak to, resist and drink, from its rolls', () => {
    const w = floors.map(f => floorWeakness(f.foes as unknown as RoleTable));
    expect(leanSchools(w[0])).toEqual(expect.arrayContaining(['ember', 'frost']));
    expect(leanSchools(w[1])[0]).toBe('storm');
    expect(leanSchools(w[2])[0]).toBe('frost');
    expect(leanSchools(w[4])[0]).toBe('ember');
    expect(wallsOff(w[2], 'ember')).toBe(true); // (floor 3: three in four of its foes resist or drink fire)
    expect(wallsOff(w[1], 'frost')).toBe(true);
    expect(wallsOff(w[3], 'ember')).toBe(false);
    for (const x of w) for (const k of ['weak', 'resist', 'drink'] as const) for (const v of Object.values(x[k])) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    expect(CFG.curve.lean).toBeLessThan(CFG.curve.wall);
  });

  it('a library leans: a mage holding none of the floor\'s weak schools is offered one', () => {
    const shuffle = <T,>(R: () => number) => (a: readonly T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    for (let s = 1; s <= 200; s++) {
      const R = mulberry(s), pages = pickPages({ shuffle: shuffle(R) } as never, ['cinder_lance', 'pyre_seal'], 3, [], SPELL_DEFS, ['frost', 'storm']);
      expect(pages.some(id => ['frost', 'storm'].includes(spell(id).school))).toBe(true);
    }
    // holding one already, no lean (the draw as before)
    const R = mulberry(3), plain = pickPages({ shuffle: shuffle(R) } as never, ['rime_shards', null], 3, [], SPELL_DEFS, ['frost']);
    expect(plain.length).toBe(3);
  });
});
