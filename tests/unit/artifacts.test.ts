import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { Rng } from '../../src/rng';
import { ARTIFACT_DEFS, START_FOCUS, computeStats, pickArtifact, validateArtifacts } from '../../src/items/artifactData';

const base = CFG.hero;
const stats = (items: string[], focus = START_FOCUS) => computeStats(focus, items, base);

describe('artifact data', () => {
  it('is valid', () => expect(validateArtifacts()).toEqual([]));

  it('holds the M1 set: 10 artifacts and 3 foci besides the starting wand', () => {
    expect(ARTIFACT_DEFS.filter(a => a.kind !== 'focus')).toHaveLength(10);
    expect(ARTIFACT_DEFS.filter(a => a.kind === 'focus' && !a.start)).toHaveLength(3);
    expect(ARTIFACT_DEFS.filter(a => a.kind === 'cursed')).toHaveLength(2);
  });

  it('stock the merchant and the vault: each pool has several to draw from', () => {
    for (const pool of ['merchant', 'vault'] as const) expect(ARTIFACT_DEFS.filter(a => a.pools.includes(pool)).length).toBeGreaterThanOrEqual(5);
  });

  it('catches mistakes', () => {
    const bad = [{ ...ARTIFACT_DEFS[4], pools: ['nowhere'], stats: { luck: 1 } }, ARTIFACT_DEFS[4]] as never[];
    const errs = validateArtifacts(bad).join('; ');
    expect(errs).toMatch(/unknown pool/);
    expect(errs).toMatch(/unknown stat/);
    expect(errs).toMatch(/listed twice/);
    expect(errs).toMatch(/starting focus/);
  });
});

describe('combining artifacts', () => {
  it('starts from the base stats with a single straight bolt', () => {
    const s = stats([]);
    expect(s.damage).toBe(base.damage);
    expect(s.fireDelay).toBe(base.fireDelay);
    expect(s.maxHp).toBe(base.hearts * 2);
    expect(s.pattern).toMatchObject({ count: 1, path: 'straight' });
    expect(s.effects.size).toBe(0);
  });

  it('adds and multiplies stats', () => {
    expect(stats(['ember_sigil']).damage).toBeCloseTo(base.damage + 1.5);
    expect(stats(['ember_sigil']).boltScale).toBeCloseTo(1.35);
    expect(stats(['ember_sigil', 'mask_of_the_drowned']).damage).toBeCloseTo((base.damage + 1.5) * 2);
    expect(stats(['rosary_of_haste']).fireDelay).toBeCloseTo(base.fireDelay * .75);
    expect(stats(['pilgrims_boots', 'chain_of_the_penitent']).speed).toBeCloseTo((base.speed + .6) * .75);
    expect(stats(['chain_of_the_penitent']).invuln).toBeCloseTo(base.invuln + 2);
    expect(stats(['reliquary_shard']).maxHp).toBe((base.hearts + 1) * 2);
  });

  it('lets the focus set the pattern while passives modify it', () => {
    const twinLens = stats(['bone_lens'], 'twin_staff');
    expect(twinLens.pattern.count).toBe(2);
    expect(twinLens.pierce).toBe(1);
    expect(twinLens.damage).toBeCloseTo(base.damage * .7);
    expect(stats([], 'drowned_orb').pattern).toMatchObject({ path: 'bounce', bounces: 2 });
    expect(stats([], 'drowned_orb').range).toBeGreaterThan(base.range);
    expect(stats(['bone_lens'], 'shepherds_crook').pattern.path).toBe('boomerang');
  });

  it('collects effects and the last bolt colour', () => {
    const s = stats(['saints_knucklebone', 'masons_chisel', 'ember_sigil']);
    expect([...s.effects].sort()).toEqual(['deathBurst', 'rockBreaker']);
    expect(s.boltColor).toBe(0xfff0c4);
  });
});

describe('picking artifacts', () => {
  it('prefers the pool, never repeats and never offers the starting wand', () => {
    const rng = new Rng(7), seen = new Set<string>();
    const picks: string[] = [];
    for (let i = 0; i < 20; i++) { const a = pickArtifact(rng, 'treasure', seen); if (!a) break; seen.add(a.id); picks.push(a.id); }
    expect(new Set(picks).size).toBe(picks.length);
    expect(picks).not.toContain(START_FOCUS);
    expect(picks).toHaveLength(ARTIFACT_DEFS.length - 1); // falls back to other pools once treasure runs dry
    const treasureCount = ARTIFACT_DEFS.filter(a => a.pools.includes('treasure')).length;
    for (const id of picks.slice(0, treasureCount)) expect(ARTIFACT_DEFS.find(a => a.id === id)!.pools).toContain('treasure');
    expect(pickArtifact(rng, 'treasure', seen)).toBeNull();
  });
});
