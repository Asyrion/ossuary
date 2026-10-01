import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { Rng } from '../../src/rng';
import { ARTIFACT_DEFS, DEFAULT_BOLT_COLOR, GILT_COLOR, START_FOCUS, computeStats, halveStat, pickArtifact, validateArtifacts } from '../../src/items/artifactData';
import { DROPS } from '../../src/items/loot';
import { COSTUME_PIECES, isCostume, slotOf, wornIds, wornLooks, wornPieces } from '../../src/actors/costumeData';
import { STR } from '../../src/strings';

const base = CFG.hero;
const stats = (items: string[], focus = START_FOCUS) => computeStats(focus, items, base);

describe('lore', () => {
  it('describes every item and container that can be picked up or opened, for the lore card', () => {
    for (const kind of [...DROPS, 'gilded']) {
      const t = STR.lore.items[kind];
      expect(t, kind).toBeTruthy();
      expect(t.name && t.kind && t.effect).toBeTruthy();
      expect(t.lore.length).toBeGreaterThanOrEqual(60);
    }
    for (const k of ['focus', 'passive', 'cursed']) expect(STR.lore.kinds[k]).toBeTruthy();
  });
});

describe('artifact data', () => {
  it('is valid', () => expect(validateArtifacts()).toEqual([]));

  it('holds the M1 set, the 13 added after M2 step 4, the 7 economy artifacts, the 10 of M3, the Pilgrim\'s Cowl, M4.1\'s 12 and M4.2\'s Rune of Fen-Nex: 57 besides the starting wand', () => {
    expect(ARTIFACT_DEFS.filter(a => !a.start)).toHaveLength(57);
    expect(ARTIFACT_DEFS.filter(a => a.kind !== 'focus')).toHaveLength(47);
    expect(ARTIFACT_DEFS.filter(a => a.kind === 'focus' && !a.start)).toHaveLength(10);
    expect(ARTIFACT_DEFS.filter(a => a.kind === 'cursed')).toHaveLength(8);
  });

  it('M4.1: the Pendulum swings its bolts, the Lodestar and the rest are effects, and a cleansed Last Rite keeps its gift without its price', () => {
    const base = { damage: 3.5, fireDelay: .36, speed: 4.3, shotSpeed: 8.8, range: 6.8, hearts: 3, invuln: 1, mana: 100 };
    const swing = computeStats('pendulum_of_hours', [], base);
    expect(swing.pattern.path).toBe('swing'); expect(swing.damage).toBeCloseTo(3.5 * 1.2);
    const star = computeStats('lodestar_wand', ['echo_stone', 'gilded_halo', 'harts_antler'], base);
    for (const e of ['lodestar', 'echo', 'halo', 'antler'] as const) expect(star.effects.has(e)).toBe(true);
    const rite = computeStats('apprentice_wand', ['the_last_rite'], base), clean = computeStats('apprentice_wand', ['the_last_rite'], base, ['the_last_rite']);
    expect([rite.maxHp, rite.effects.has('lastRite')]).toEqual([4, true]);
    expect([clean.maxHp, clean.effects.has('lastRite')]).toEqual([6, true]);
    const grave = computeStats('apprentice_wand', ['gravemongers_contract'], base), paid = computeStats('apprentice_wand', ['gravemongers_contract'], base, ['gravemongers_contract']);
    expect(['gravemonger', 'noClearHearts', 'dearHearts'].map(e => grave.effects.has(e as never))).toEqual([true, true, true]);
    expect(['gravemonger', 'noClearHearts', 'dearHearts'].map(e => paid.effects.has(e as never))).toEqual([true, false, false]);
  });

  it('M3: spell damage and mana from kills combine like the other stats, and a cleansed curse halves them', () => {
    const base = { damage: 3.5, fireDelay: .36, speed: 4.3, shotSpeed: 8.8, range: 6.8, hearts: 3, invuln: 1, mana: 100 };
    const s = computeStats('apprentice_wand', ['crown_of_thorns', 'hungering_tome', 'mana_lantern'], base);
    expect([s.spellDamage, s.killMana, s.maxMana, s.maxHp]).toEqual([1.5, 5, 140, 4]);
    expect(s.effects.has('noRegen')).toBe(true);
    const clean = computeStats('apprentice_wand', ['crown_of_thorns', 'hungering_tome'], base, ['crown_of_thorns', 'hungering_tome']);
    expect([clean.spellDamage, clean.killMana, clean.maxHp, clean.effects.has('noRegen')]).toEqual([1.25, 2.5, 6, false]);
    const tome = computeStats('tome_of_whispers', [], base);
    expect(tome.pattern.path).toBe('homing');
    expect(tome.shotSpeed).toBeCloseTo(8.8 * .6);
  });

  it('gives every artifact a text, lore, an icon and a place to appear, and every pool something to draw', () => {
    for (const a of ARTIFACT_DEFS) { expect(a.text.length).toBeGreaterThan(10); expect(a.lore.length).toBeGreaterThanOrEqual(60); expect(a.icon).toBeTruthy(); }
    for (const pool of ['treasure', 'ordeal', 'boss', 'altar', 'drop', 'merchant', 'secret', 'vault'] as const) {
      expect(ARTIFACT_DEFS.filter(a => a.pools.includes(pool)).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('stock the merchant and the vault: each pool has several to draw from', () => {
    for (const pool of ['merchant', 'vault'] as const) expect(ARTIFACT_DEFS.filter(a => a.pools.includes(pool)).length).toBeGreaterThanOrEqual(5);
  });

  it('catches mistakes', () => {
    const cursed = ARTIFACT_DEFS.find(a => a.kind === 'cursed')!;
    const bad = [{ ...ARTIFACT_DEFS[4], pools: ['nowhere'], stats: { luck: 1 }, gives: { gold: 3, keys: 1.5 }, costume: 'tiara' }, ARTIFACT_DEFS[4], { ...cursed, curse: undefined }, { ...cursed, id: 'x', curse: { cleansed: '' } }] as never[];
    const errs = validateArtifacts(bad).join('; ');
    expect(errs).toMatch(/gives "gold"/);
    expect(errs).toMatch(/gives "keys"/);
    expect(errs).toMatch(/only they, carry a curse/);
    expect(errs).toMatch(/a curse needs a price and a cleansed text/);
    expect(errs).toMatch(/unknown pool/);
    expect(errs).toMatch(/unknown stat/);
    expect(errs).toMatch(/listed twice/);
    expect(errs).toMatch(/starting focus/);
    expect(errs).toMatch(/unknown costume "tiara"/);
  });
});

describe('costumes', () => {
  it('shows one piece per slot, the one taken last winning it, and ignores what wears nothing', () => {
    expect(wornPieces([])).toEqual([]);
    expect(wornPieces([undefined, 'hood', undefined])).toEqual(['hood']);
    expect(wornPieces(['hood', 'hood'])).toEqual(['hood']);
    expect(wornPieces(['nonsense'])).toEqual([]);
  });

  it('the Pilgrim\'s Cowl puts on the hood', () => {
    expect(wornPieces(['apprentice_wand', 'pilgrims_cowl'].map(id => ARTIFACT_DEFS.find(a => a.id === id)!.costume))).toEqual(['hood']);
  });

  // M4.6: pieces built for the body and an artifact's own model carried at a spot, one per slot
  const def = (id: string) => ARTIFACT_DEFS.find(a => a.id === id)!;
  it('carries an artifact\'s own model at its spot, a built piece in its slot, and the one taken last wins the slot', () => {
    const worn = wornLooks(['mana_lantern', 'ember_sigil', 'pilgrims_cowl', 'rams_skull', 'stormglass_pendant'].map(def));
    expect(worn.map(w => [w.slot, w.piece, w.at ?? null, w.from])).toEqual([
      ['head', 'hood', null, 'pilgrims_cowl'], ['shoulders', 'carried', 'chest', 'stormglass_pendant'], ['back', 'carried', 'back', 'ember_sigil'], ['belt', 'carried', 'belt', 'mana_lantern'],
    ]); // (the pendant, taken after the ram's skull, wins the shoulders)
    expect(wornIds(worn)).toEqual(['hood', 'stormglass_pendant', 'ember_sigil', 'mana_lantern']);
    expect(slotOf('belt')).toBe('belt'); expect(slotOf('chest')).toBe('shoulders'); expect(slotOf('manacles')).toBe('hands');
    expect(isCostume('wrist')).toBe(true); expect(isCostume('aura')).toBe(false); expect(isCostume('tiara')).toBe(false);
  });

  it('shows a cursed artifact\'s curse on its piece until a shrine cleanses it', () => {
    const [chain] = wornLooks([def('chain_of_the_penitent')]);
    expect(chain).toMatchObject({ slot: 'hands', piece: 'manacles', cursed: true, cleansed: false });
    expect(wornLooks([def('chain_of_the_penitent')], ['chain_of_the_penitent'])[0]).toMatchObject({ cursed: false, cleansed: true });
    expect(wornLooks([def('mana_lantern')], ['mana_lantern'])[0].cursed).toBe(false); // (only a cursed artifact shows a curse)
  });

  it('most artifacts show on the mage: a piece, or held in the hand (every focus)', () => {
    const shown = ARTIFACT_DEFS.filter(a => !a.start && (a.costume || a.kind === 'focus'));
    expect(shown.length).toBeGreaterThanOrEqual(50);
    for (const a of ARTIFACT_DEFS) if (a.costume) expect(isCostume(a.costume), a.id).toBe(true);
    for (const id of Object.keys(COSTUME_PIECES)) expect(ARTIFACT_DEFS.some(a => a.costume === id), `${id} worn by none`).toBe(true);
    for (const [id, p] of Object.entries(COSTUME_PIECES)) if ('curse' in p) expect(ARTIFACT_DEFS.filter(a => a.costume === id).every(a => a.kind === 'cursed'), id).toBe(true);
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

  it('weighs the hoard for the Miser\'s Purse: harder, golder bolts for every ten obols', () => {
    const at = (coins: number) => computeStats(START_FOCUS, ['misers_purse'], base, [], coins);
    expect(at(0).damage).toBeCloseTo(base.damage);
    expect(at(9).damage).toBeCloseTo(base.damage);
    expect(at(10).damage).toBeCloseTo(base.damage + .5);
    expect(at(47).damage).toBeCloseTo(base.damage + 2);
    expect(at(0).gilt).toBe(0); expect(at(20).gilt).toBeCloseTo(.4); expect(at(99).gilt).toBe(1);
    expect(at(0).boltColor).toBe(DEFAULT_BOLT_COLOR);
    expect(at(99).boltColor).toBe(GILT_COLOR);
    expect(computeStats(START_FOCUS, [], base, [], 50).damage).toBeCloseTo(base.damage); // obols alone do nothing
    // it scales with the rest: a multiplier multiplies the hoard's bonus too
    expect(computeStats(START_FOCUS, ['misers_purse', 'mask_of_the_drowned'], base, [], 30).damage).toBeCloseTo((base.damage + 1.5) * 2);
  });

  it('knows the economy artifacts: wider blasts, what they hand over, and their effects', () => {
    expect(stats(['glyphwrights_chalk']).blastMul).toBeCloseTo(1.5);
    expect(stats([]).blastMul).toBe(1);
    expect(ARTIFACT_DEFS.find(a => a.id === 'sextons_keyring')!.gives).toEqual({ keys: 3 });
    expect(ARTIFACT_DEFS.find(a => a.id === 'glyphwrights_chalk')!.gives).toEqual({ glyphs: 5 });
    const fx = stats(['sextons_keyring', 'ferrymans_obol', 'warding_band', 'grave_lantern', 'pedlars_scale']).effects;
    expect([...fx].sort()).toEqual(['ferryman', 'freeVault', 'glyphWard', 'graveLantern', 'pedlar']);
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
