import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { Rng } from '../../src/rng';
import { ARTIFACT_DEFS, START_FOCUS, computeStats, halveStat, pickArtifact, validateArtifacts } from '../../src/items/artifactData';

const base = CFG.hero;
const stats = (items: string[], focus = START_FOCUS) => computeStats(focus, items, base);

describe('artifact data', () => {
  it('is valid', () => expect(validateArtifacts()).toEqual([]));

  it('holds the M1 set and the 13 added after M2 step 4: 20 artifacts and 6 foci besides the starting wand', () => {
    expect(ARTIFACT_DEFS.filter(a => a.kind !== 'focus')).toHaveLength(20);
    expect(ARTIFACT_DEFS.filter(a => a.kind === 'focus' && !a.start)).toHaveLength(6);
    expect(ARTIFACT_DEFS.filter(a => a.kind === 'cursed')).toHaveLength(4);
  });

  it('gives every artifact a text, an icon and a place to appear, and every pool something to draw', () => {
    for (const a of ARTIFACT_DEFS) { expect(a.text.length).toBeGreaterThan(10); expect(a.icon).toBeTruthy(); }
    for (const pool of ['treasure', 'ordeal', 'boss', 'altar', 'drop', 'merchant', 'secret', 'vault'] as const) {
      expect(ARTIFACT_DEFS.filter(a => a.pools.includes(pool)).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('stock the merchant and the vault: each pool has several to draw from', () => {
    for (const pool of ['merchant', 'vault'] as const) expect(ARTIFACT_DEFS.filter(a => a.pools.includes(pool)).length).toBeGreaterThanOrEqual(5);
  });

  it('catches mistakes', () => {
    const cursed = ARTIFACT_DEFS.find(a => a.kind === 'cursed')!;
    const bad = [{ ...ARTIFACT_DEFS[4], pools: ['nowhere'], stats: { luck: 1 } }, ARTIFACT_DEFS[4], { ...cursed, curse: undefined }, { ...cursed, id: 'x', curse: { cleansed: '' } }] as never[];
    const errs = validateArtifacts(bad).join('; ');
    expect(errs).toMatch(/only they, carry a curse/);
    expect(errs).toMatch(/a curse needs a price and a cleansed text/);
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

  it('knows the new shapes and modifiers: fans, weaving, speed, range, knockback and heavy bolts', () => {
    expect(stats([], 'mourners_censer').pattern).toMatchObject({ count: 3, fan: .3 });
    expect(stats([], 'mourners_censer').range).toBeCloseTo(base.range * .6);
    expect(stats([], 'serpent_rod').pattern.path).toBe('wave');
    const spear = stats([], 'gravewarden_spear');
    expect(spear.fireDelay).toBeCloseTo(base.fireDelay * 1.9);
    expect(spear.pierce).toBeGreaterThan(50);
    expect(spear.damage).toBeCloseTo(base.damage * 2.4);
    const hawk = stats(['hawkbone_fletching']);
    expect(hawk.shotSpeed).toBeCloseTo(base.shotSpeed * 1.35);
    expect(hawk.range).toBeCloseTo(base.range * 1.3);
    expect(stats(['rams_skull']).knockback).toBeCloseTo(2.6);
    expect(stats([]).knockback).toBe(1);
    // the Leaden Heart's gift and price stack with others: two more hearts, a shorter reach
    const lead = stats(['leaden_heart', 'hawkbone_fletching']);
    expect(lead.maxHp).toBe((base.hearts + 2) * 2);
    expect(lead.range).toBeCloseTo(base.range * .6 * 1.3);
  });

  it('cleanses a curse: the price goes and the gift is halved (GDD: Shrine cleansing)', () => {
    const clean = (id: string, others: string[] = []) => computeStats(START_FOCUS, [...others, id], base, [id]);
    // Mask of the Drowned: damage ×2 in the dark; cleansed, ×1.5 and the dark lifts
    expect(stats(['mask_of_the_drowned']).effects.has('vision')).toBe(true);
    expect(clean('mask_of_the_drowned').damage).toBeCloseTo(base.damage * 1.5);
    expect(clean('mask_of_the_drowned').effects.has('vision')).toBe(false);
    // Chain of the Penitent: +1 s after a hit, no slowness
    expect(clean('chain_of_the_penitent').invuln).toBeCloseTo(base.invuln + 1);
    expect(clean('chain_of_the_penitent').speed).toBeCloseTo(base.speed);
    // Leaden Heart: one more heart, full reach
    expect(clean('leaden_heart').maxHp).toBe((base.hearts + 1) * 2);
    expect(clean('leaden_heart').range).toBeCloseTo(base.range);
    // Bloodied Covenant: +1.25 damage, no tithe
    expect(clean('bloodied_covenant').damage).toBeCloseTo(base.damage + 1.25);
    expect(clean('bloodied_covenant').effects.has('bloodTithe')).toBe(false);
    // it stacks with the rest as before, and the list only cleanses cursed artifacts
    expect(clean('mask_of_the_drowned', ['ember_sigil']).damage).toBeCloseTo((base.damage + 1.5) * 1.5);
    expect(computeStats(START_FOCUS, ['ember_sigil'], base, ['ember_sigil']).damage).toBeCloseTo(base.damage + 1.5);
    // every curse: its price is gone once cleansed, and some gift is left
    for (const a of ARTIFACT_DEFS.filter(x => x.curse)) {
      const s = clean(a.id), plain = stats([]);
      for (const e of a.curse!.effects ?? []) expect(s.effects.has(e)).toBe(false);
      for (const [k, v] of Object.entries(a.stats ?? {})) expect(halveStat(k as never, v)).not.toBe(k.endsWith('Mul') ? 1 : 0);
      expect(s).not.toEqual(plain);
    }
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
    for (let i = 0; i < 100; i++) { const a = pickArtifact(rng, 'treasure', seen); if (!a) break; seen.add(a.id); picks.push(a.id); }
    expect(new Set(picks).size).toBe(picks.length);
    expect(picks).not.toContain(START_FOCUS);
    expect(picks).toHaveLength(ARTIFACT_DEFS.length - 1); // falls back to other pools once treasure runs dry
    const treasureCount = ARTIFACT_DEFS.filter(a => a.pools.includes('treasure')).length;
    for (const id of picks.slice(0, treasureCount)) expect(ARTIFACT_DEFS.find(a => a.id === id)!.pools).toContain('treasure');
    expect(pickArtifact(rng, 'treasure', seen)).toBeNull();
  });
});
