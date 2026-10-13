import { describe, expect, it } from 'vitest';
import { assignRoles } from '../../src/actors/clipRoles';

const roles = (names: string[]) => assignRoles(names, (n) => n);

describe('clip roles', () => {
  it('recognise the first hero, with Blender suffixes', () => {
    expect(roles(['cast_a_spell.001', 'run.001', 'fall.001', 'hit_to_body_01.001', 'standing_relax.001'])).toEqual({
      death: 'fall.001',
      hit: 'hit_to_body_01.001',
      cast: 'cast_a_spell.001',
      run: 'run.001',
      idle: 'standing_relax.001',
    });
  });

  it('use every clip of the final hero: a run and a walk, two deaths, drinking and eating', () => {
    expect(
      roles([
        'defeat_03',
        'hit_to_body_01',
        'Drink Potion',
        'standing_relax',
        'Eat',
        'run',
        'fall',
        'walk',
        'cast_a_spell',
      ]),
    ).toEqual({
      death: 'defeat_03',
      deathAlt: 'fall',
      hit: 'hit_to_body_01',
      drink: 'Drink Potion',
      eat: 'Eat',
      cast: 'cast_a_spell',
      run: 'run',
      walk: 'walk',
      idle: 'standing_relax',
    });
  });

  it('run with a walk when there is no run', () => {
    expect(roles(['walk', 'idle'])).toEqual({ run: 'walk', idle: 'idle' });
  });

  it('let a missing idle or run borrow the other, and idle fall back to any leftover clip', () => {
    expect(roles(['run'])).toEqual({ run: 'run', idle: 'run' });
    expect(roles(['Take 001', 'cast'])).toEqual({ cast: 'cast', idle: 'Take 001', run: 'Take 001' });
  });
});
