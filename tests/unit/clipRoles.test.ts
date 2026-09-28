import { describe, expect, it } from 'vitest';
import { assignRoles } from '../../src/actors/clipRoles';

const roles = (names: string[]) => assignRoles(names, n => n);

describe('clip roles', () => {
  it('recognise the first hero, with Blender suffixes', () => {
    expect(roles(['cast_a_spell.001', 'run.001', 'fall.001', 'hit_to_body_01.001', 'standing_relax.001'])).toEqual({
      death: 'fall.001', hit: 'hit_to_body_01.001', cast: 'cast_a_spell.001', walk: 'run.001', idle: 'standing_relax.001',
    });
  });

  it('take a run over a walk for moving, whatever the order', () => {
    expect(roles(['idle', 'walk', 'hit_to_body_01', 'cast_a_spell', 'run'])).toEqual({
      hit: 'hit_to_body_01', cast: 'cast_a_spell', walk: 'run', idle: 'idle',
    });
    expect(roles(['walk', 'idle']).walk).toBe('walk');
  });

  it('let a missing idle or walk borrow the other, and idle fall back to any leftover clip', () => {
    expect(roles(['run'])).toEqual({ walk: 'run', idle: 'run' });
    expect(roles(['Take 001', 'cast'])).toEqual({ cast: 'cast', idle: 'Take 001', walk: 'Take 001' });
  });
});
