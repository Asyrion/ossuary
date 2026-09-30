import { describe, expect, it } from 'vitest';
import { BOSS_TYPES, CFG } from '../../src/config';
import { BEHAVIOUR_PARAMS, FOES, FOE_IDS, ROLES, affinityMul, callFoe, isFoe, pickFoe, schoolOf, validateFoes, type FoeDef, type RoleTable } from '../../src/actors/foeData';
import { FLOORS } from '../../src/world/generate';

describe('the foes built in code (M4)', () => {
  it('are all valid, each with the parameters its behaviour needs', () => {
    expect(validateFoes()).toEqual([]);
    for (const id of FOE_IDS) expect(BEHAVIOUR_PARAMS[FOES[id].behaviour], id).toBeDefined();
  });

  it('the validator catches what is wrong', () => {
    const bad = { floor: 4, school: 'ember', weak: 'frost', resist: 'frost', hp: 0, r: .3, speed: 1, contact: 1, flying: false, behaviour: 'hopper', params: {}, gib: 'red', stain: null } as unknown as FoeDef;
    const errors = validateFoes({ bad });
    for (const bit of ['floor 4', 'weak to what it resists', 'hp 0', 'hopper needs hopRate', 'gib or stain']) expect(errors.some(e => e.includes(bit)), bit).toBe(true);
  });

  it('a weakness takes half again, a resistance half, anything else as it is', () => {
    const def = { weak: 'ember', resist: 'frost' } as const;
    expect(affinityMul(def, 'ember')).toBe(1.5);
    expect(affinityMul(def, 'frost')).toBe(.5);
    expect(affinityMul(def, 'storm')).toBe(1);
    expect(affinityMul(def)).toBe(1);             // (the cantrip carries no school)
    expect(affinityMul(undefined, 'ember')).toBe(1); // (the placeholders have no affinities)
  });

  it('a hit carries the school of the statuses it brings', () => {
    expect(schoolOf({ burn: 2 })).toBe('ember');
    expect(schoolOf({ chill: 1 })).toBe('frost');
    expect(schoolOf({ shock: 1 })).toBe('storm');
    expect(schoolOf({ burn: 0 })).toBeUndefined();
    expect(schoolOf()).toBeUndefined();
  });

  it('every floor fills every role, with foes that exist and are not bosses', () => {
    for (const [i, f] of FLOORS.entries()) for (const role of ROLES) {
      expect(f.foes[role].length, `floor ${i + 1} ${role}`).toBeGreaterThan(0);
      for (const [id, w] of f.foes[role]) {
        expect(isFoe(id) || id in CFG.enemy, `${id}`).toBe(true);
        expect(BOSS_TYPES as readonly string[]).not.toContain(id); expect(id).not.toBe('dummy');
        expect(w).toBeGreaterThan(0);
        if (isFoe(id)) expect(FOES[id].floor, `${id} on floor ${i + 1}`).toBe(i + 1); // (a floor each)
      }
    }
  });

  it('picks by weight, and passes an elite over when asked while another can fill the role', () => {
    let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // (a small seeded stream)
    const table = { R: [['sporeling', 3], ['rotling', 1]], W: [['vesperMoth', 1]], H: [['runeBeetle', 1]] } as RoleTable;
    const n = 4000, count = Array.from({ length: n }, () => pickFoe(table, 'R', R)).filter(id => id === 'sporeling').length;
    expect(count / n).toBeGreaterThan(.7); expect(count / n).toBeLessThan(.8);
    const elite = { ...FOES.sporeling, elite: true };
    const was = FOES.sporeling; (FOES as Record<string, FoeDef>).sporeling = elite;
    try {
      expect(Array.from({ length: 50 }, () => pickFoe(table, 'R', R, true)).every(id => id === 'rotling')).toBe(true);
      const only = { ...table, R: [['sporeling', 1]] } as RoleTable;
      expect(pickFoe(only, 'R', R, true)).toBe('sporeling'); // (nothing else can fill it)
    } finally { (FOES as Record<string, FoeDef>).sporeling = was; }
  });

  it('calls up neither an elite nor a mimic in the middle of a fight, unless nothing else fills the role', () => {
    let seed = 11; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const [f1, , f3] = FLOORS, called = (table: RoleTable, role: 'R' | 'W' | 'H') => new Set(Array.from({ length: 300 }, () => callFoe(table, role, R)));
    expect([...called(f1.foes, 'H')]).toEqual(['runeBeetle']);      // (floor 1's heavies: beetles, and mimics waiting as urns)
    expect([...called(f3.foes, 'H')]).toEqual(['cinderSalamander']); // (floor 3's: the drakeling is an elite)
    expect([...called(f1.foes, 'R')]).toEqual(['sporeling']);
    const mimicsOnly = { ...f1.foes, H: [['urnMimic', 1]] } as RoleTable, eliteOnly = { ...f3.foes, H: [['rimeDrakeling', 1]] } as RoleTable;
    expect(callFoe(mimicsOnly, 'H', R)).toBe('urnMimic'); expect(callFoe(eliteOnly, 'H', R)).toBe('rimeDrakeling');
  });
});
