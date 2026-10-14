import { describe, expect, it } from 'vitest';
import {
  atLeast,
  blank,
  cast,
  learn,
  parse,
  reach,
  reactionsOf,
  see,
  stageOf,
  upgrade,
  type Knowledge,
} from '../../src/magic/knowledge';
import { SPELL_DEFS } from '../../src/magic/spellData';

describe('spell knowledge (M3.7)', () => {
  it('goes from unknown to seen, learned and used as pages are approached, taken and the spell cast', () => {
    const kn: Knowledge = {};
    expect(stageOf(kn.arc, 10)).toBe('unknown');
    expect(see(kn, 'arc')).toBe(true);
    expect(see(kn, 'arc')).toBe(false); // seen once
    expect(stageOf(kn.arc, 10)).toBe('seen');
    expect(learn(kn, 'arc')).toBe(true);
    expect(stageOf(kn.arc, 10)).toBe('learned');
    for (let i = 0; i < 9; i++) cast(kn, 'arc');
    expect(stageOf(kn.arc, 10)).toBe('learned');
    cast(kn, 'arc');
    expect(stageOf(kn.arc, 10)).toBe('used');
    expect(upgrade(kn, 'arc', 'rune:echo')).toBe(true);
    expect(upgrade(kn, 'arc', 'rune:echo')).toBe(false);
    expect(stageOf(kn.arc, 10)).toBe('upgraded');
    // (a rune carved into a spell not yet known well waits for the casts: it reads learned until then)
    const early: Knowledge = {};
    learn(early, 'arc');
    upgrade(early, 'arc', 'rune:quicken');
    expect(stageOf(early.arc, 10)).toBe('learned');
    for (let i = 0; i < 10; i++) cast(early, 'arc');
    expect(stageOf(early.arc, 10)).toBe('upgraded');
  });

  it('learning a spell sees it too, and casting one learns it (knowledge only grows)', () => {
    const kn: Knowledge = {};
    learn(kn, 'pyre_seal');
    expect(kn.pyre_seal).toMatchObject({ seen: true, learned: true });
    cast(kn, 'rime_shards');
    expect(kn.rime_shards).toMatchObject({ seen: true, learned: true, casts: 1 });
  });

  it('orders the stages', () => {
    expect(atLeast('used', 'learned')).toBe(true);
    expect(atLeast('seen', 'learned')).toBe(false);
    expect(atLeast('upgraded', 'seen')).toBe(true);
  });

  it('brings a record to a stage for the dev menu, without taking knowledge away', () => {
    const kn: Knowledge = {};
    reach(kn, 'arc', 'used', 10);
    expect(stageOf(kn.arc, 10)).toBe('used');
    reach(kn, 'arc', 'seen', 10);
    expect(stageOf(kn.arc, 10)).toBe('used');
    reach(kn, 'arc', 'upgraded', 10);
    expect(stageOf(kn.arc, 10)).toBe('upgraded');
  });

  it('reads back what it wrote, and survives anything malformed in storage', () => {
    const kn: Knowledge = {
      arc: { ...blank(), seen: true, learned: true, casts: 12, upgrades: [] },
      cinder_lance: { ...blank(), seen: true },
    };
    expect(parse(JSON.stringify(kn))).toEqual(kn);
    expect(parse(null)).toEqual({});
    expect(parse('not json')).toEqual({});
    expect(parse('[1,2]')).toEqual({}); // (numbers are not records)
    expect(parse('{"arc": 5, "x": {"seen": 1, "casts": -3, "upgrades": ["a", 2]}}')).toEqual({
      x: { seen: true, learned: false, casts: 0, upgrades: ['a'] },
    });
  });

  it('tells the reactions a spell can set off from its statuses', () => {
    // (the wheel: each status is half of a reaction with each other school; Verdant makes it five)
    expect(reactionsOf({ status: { chill: 1 } })).toEqual([
      { reaction: 'shatter', with: 'storm' },
      { reaction: 'steam', with: 'ember' },
      { reaction: 'prism', with: 'hallow' },
      { reaction: 'blackice', with: 'umbral' },
      { reaction: 'frostbloom', with: 'verdant' },
    ]);
    expect(reactionsOf({ status: { burn: 3 } })).toEqual([
      { reaction: 'overload', with: 'storm' },
      { reaction: 'blackfire', with: 'umbral' },
      { reaction: 'steam', with: 'frost' },
      { reaction: 'searing', with: 'hallow' },
      { reaction: 'wildfire', with: 'verdant' },
    ]);
    expect(reactionsOf({ status: { sanct: 2 } })).toEqual([
      { reaction: 'eclipse', with: 'umbral' },
      { reaction: 'searing', with: 'ember' },
      { reaction: 'prism', with: 'frost' },
      { reaction: 'verdict', with: 'storm' },
      { reaction: 'bloom', with: 'verdant' },
    ]);
    expect(reactionsOf({ status: { root: 2, hex: 1 } })).toEqual([
      { reaction: 'eclipse', with: 'hallow' },
      { reaction: 'blackfire', with: 'ember' },
      { reaction: 'blackice', with: 'frost' },
      { reaction: 'voidspark', with: 'storm' },
      { reaction: 'blight', with: 'verdant' },
    ]);
    expect(reactionsOf({ status: { shock: 1 } })).toEqual([
      { reaction: 'shatter', with: 'frost' },
      { reaction: 'overload', with: 'ember' },
      { reaction: 'verdict', with: 'hallow' },
      { reaction: 'voidspark', with: 'umbral' },
      { reaction: 'pollenspark', with: 'verdant' },
    ]);
    expect(reactionsOf({ status: { grow: 3 } })).toEqual([
      { reaction: 'wildfire', with: 'ember' },
      { reaction: 'frostbloom', with: 'frost' },
      { reaction: 'pollenspark', with: 'storm' },
      { reaction: 'bloom', with: 'hallow' },
      { reaction: 'blight', with: 'umbral' },
    ]);
    expect(reactionsOf({})).toEqual([]);
    // every spell in the data with a status can set off at least one reaction
    for (const s of SPELL_DEFS)
      if (Object.values(s.status ?? {}).some((v) => v > 0)) expect(reactionsOf(s).length, s.id).toBeGreaterThan(0);
  });
});
