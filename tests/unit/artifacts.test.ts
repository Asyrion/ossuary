import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { Rng } from '../../src/rng';
import {
  ARTIFACT_DEFS,
  DEFAULT_BOLT_COLOR,
  GILT_COLOR,
  START_FOCUS,
  computeStats,
  halveStat,
  pickArtifact,
  validateArtifacts,
} from '../../src/items/artifactData';
import { DROPS } from '../../src/items/loot';
import {
  ARC_PIECES,
  COSTUME_PIECES,
  SHOWS_OTHERWISE,
  TRANSFORM_LOOKS,
  arcStage,
  isCostume,
  slotOf,
  wornIds,
  wornLooks,
  wornPieces,
} from '../../src/actors/costumeData';
import {
  TRANSFORMS,
  TRANSFORM_IDS,
  TRANSFORM_NEEDS,
  formed,
  giftEffects,
  validateFamilies,
} from '../../src/items/transformData';
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

  it("holds the M1 set, the 13 added after M2 step 4, the 7 economy artifacts, the 10 of M3, the Pilgrim's Cowl, M4.1's 12, M4.2's Rune of Fen-Nex and M5's three of the Alchemist: 60 besides the starting wand", () => {
    expect(ARTIFACT_DEFS.filter((a) => !a.start)).toHaveLength(60);
    expect(ARTIFACT_DEFS.filter((a) => a.kind !== 'focus')).toHaveLength(50);
    expect(ARTIFACT_DEFS.filter((a) => a.kind === 'focus' && !a.start)).toHaveLength(10);
    expect(ARTIFACT_DEFS.filter((a) => a.kind === 'cursed')).toHaveLength(8);
  });

  it('M4.1: the Pendulum swings its bolts, the Lodestar and the rest are effects, and a cleansed Last Rite keeps its gift without its price', () => {
    const base = {
      damage: 3.5,
      fireDelay: 0.36,
      speed: 4.3,
      shotSpeed: 8.8,
      range: 6.8,
      hearts: 3,
      invuln: 1,
      mana: 100,
    };
    const swing = computeStats('pendulum_of_hours', [], base);
    expect(swing.pattern.path).toBe('swing');
    expect(swing.damage).toBeCloseTo(3.5 * 1.2);
    const star = computeStats('lodestar_wand', ['echo_stone', 'gilded_halo', 'harts_antler'], base);
    for (const e of ['lodestar', 'echo', 'halo', 'antler'] as const) expect(star.effects.has(e)).toBe(true);
    const rite = computeStats('apprentice_wand', ['the_last_rite'], base),
      clean = computeStats('apprentice_wand', ['the_last_rite'], base, ['the_last_rite']);
    expect([rite.maxHp, rite.effects.has('lastRite')]).toEqual([4, true]);
    expect([clean.maxHp, clean.effects.has('lastRite')]).toEqual([6, true]);
    const grave = computeStats('apprentice_wand', ['gravemongers_contract'], base),
      paid = computeStats('apprentice_wand', ['gravemongers_contract'], base, ['gravemongers_contract']);
    expect(['gravemonger', 'noClearHearts', 'dearHearts'].map((e) => grave.effects.has(e as never))).toEqual([
      true,
      true,
      true,
    ]);
    expect(['gravemonger', 'noClearHearts', 'dearHearts'].map((e) => paid.effects.has(e as never))).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('M3: spell damage and mana from kills combine like the other stats, and a cleansed curse halves them', () => {
    const base = {
      damage: 3.5,
      fireDelay: 0.36,
      speed: 4.3,
      shotSpeed: 8.8,
      range: 6.8,
      hearts: 3,
      invuln: 1,
      mana: 100,
    };
    const s = computeStats('apprentice_wand', ['crown_of_thorns', 'hungering_tome', 'mana_lantern'], base);
    expect([s.spellDamage, s.killMana, s.maxMana, s.maxHp]).toEqual([1.5, 5, 140, 4]);
    expect(s.effects.has('noRegen')).toBe(true);
    const clean = computeStats('apprentice_wand', ['crown_of_thorns', 'hungering_tome'], base, [
      'crown_of_thorns',
      'hungering_tome',
    ]);
    expect([clean.spellDamage, clean.killMana, clean.maxHp, clean.effects.has('noRegen')]).toEqual([
      1.25,
      2.5,
      6,
      false,
    ]);
    const tome = computeStats('tome_of_whispers', [], base);
    expect(tome.pattern.path).toBe('homing');
    expect(tome.shotSpeed).toBeCloseTo(8.8 * 0.6);
  });

  it('gives every artifact a text, lore, an icon and a place to appear, and every pool something to draw', () => {
    for (const a of ARTIFACT_DEFS) {
      expect(a.text.length).toBeGreaterThan(10);
      expect(a.lore.length).toBeGreaterThanOrEqual(60);
      expect(a.icon).toBeTruthy();
    }
    for (const pool of ['treasure', 'ordeal', 'boss', 'altar', 'drop', 'merchant', 'secret', 'vault'] as const) {
      expect(ARTIFACT_DEFS.filter((a) => a.pools.includes(pool)).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('stock the merchant and the vault: each pool has several to draw from', () => {
    for (const pool of ['merchant', 'vault'] as const)
      expect(ARTIFACT_DEFS.filter((a) => a.pools.includes(pool)).length).toBeGreaterThanOrEqual(5);
  });

  it('catches mistakes', () => {
    const cursed = ARTIFACT_DEFS.find((a) => a.kind === 'cursed')!;
    const bad = [
      { ...ARTIFACT_DEFS[4], pools: ['nowhere'], stats: { luck: 1 }, gives: { gold: 3, keys: 1.5 }, costume: 'tiara' },
      ARTIFACT_DEFS[4],
      { ...cursed, curse: undefined },
      { ...cursed, id: 'x', curse: { cleansed: '' } },
    ] as never[];
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

  it("the Pilgrim's Cowl puts on the hood", () => {
    expect(
      wornPieces(['apprentice_wand', 'pilgrims_cowl'].map((id) => ARTIFACT_DEFS.find((a) => a.id === id)!.costume)),
    ).toEqual(['hood']);
  });

  // M4.6: pieces built for the body and an artifact's own model carried at a spot, one per slot
  const def = (id: string) => ARTIFACT_DEFS.find((a) => a.id === id)!;
  it("carries an artifact's own model at its spot, a built piece in its slot, and the one taken last wins the slot", () => {
    const worn = wornLooks(
      ['mana_lantern', 'ember_sigil', 'pilgrims_cowl', 'the_last_rite', 'stormglass_pendant'].map(def),
    );
    expect(worn.map((w) => [w.slot, w.piece, w.at ?? null, w.from])).toEqual([
      ['head', 'hood', null, 'pilgrims_cowl'],
      ['shoulders', 'carried', 'chest', 'stormglass_pendant'],
      ['belt', 'carried', 'belt', 'mana_lantern'],
    ]); // (the pendant, taken after the stole, wins the shoulders; the Ember Sigil wears nothing)
    expect(wornIds(worn)).toEqual(['hood', 'stormglass_pendant', 'mana_lantern']);
    expect(slotOf('belt')).toBe('belt');
    expect(slotOf('chest')).toBe('shoulders');
    expect(slotOf('manacles')).toBe('hands');
    expect(isCostume('wrist')).toBe(true);
    expect(isCostume('aura')).toBe(false);
    expect(isCostume('tiara')).toBe(false);
    expect(isCostume('none')).toBe(false);
  });

  it("shows a cursed artifact's curse on its piece until a shrine cleanses it", () => {
    const [chain] = wornLooks([def('chain_of_the_penitent')]);
    expect(chain).toMatchObject({ slot: 'hands', piece: 'manacles', cursed: true, cleansed: false });
    expect(wornLooks([def('chain_of_the_penitent')], ['chain_of_the_penitent'])[0]).toMatchObject({
      cursed: false,
      cleansed: true,
    });
    expect(wornLooks([def('mana_lantern')], ['mana_lantern'])[0].cursed).toBe(false); // (only a cursed artifact shows a curse)
  });

  it('every artifact decides how it shows on the mage (a piece, held in the hand, nothing, or what shows instead), and the validator asks a new one to decide', () => {
    for (const a of ARTIFACT_DEFS)
      if (!a.start) expect(!!a.costume || a.kind === 'focus' || a.id in SHOWS_OTHERWISE, a.id).toBe(true);
    expect(validateArtifacts(ARTIFACT_DEFS)).toEqual([]);
    expect(wornLooks([def('echo_stone'), def('harts_antler')])).toEqual([]); // ("none": the mage as it was)
    for (const id of Object.keys(SHOWS_OTHERWISE))
      expect(
        ARTIFACT_DEFS.some((a) => a.id === id),
        id,
      ).toBe(true);
    const bare = { ...def('mana_lantern'), id: 'new_one', costume: undefined };
    expect(
      validateArtifacts([...ARTIFACT_DEFS, bare]).some(
        (e) => e.includes('new_one') && e.includes("doesn't say how it shows"),
      ),
    ).toBe(true);
  });

  it('only what it is logical to wear shows on the mage (the owner, 2026-10-02): a piece, or held in the hand (every focus)', () => {
    const worn = ARTIFACT_DEFS.filter((a) => isCostume(a.costume ?? ''));
    expect(worn.length).toBeLessThanOrEqual(20);
    expect(worn.some((a) => a.costume === 'back' || a.costume === 'shoulder')).toBe(false); // (nothing carried on the back or perched on a shoulder)
    for (const a of ARTIFACT_DEFS) if (a.costume) expect(isCostume(a.costume) || a.costume === 'none', a.id).toBe(true);
    for (const [id, p] of Object.entries(COSTUME_PIECES))
      expect(
        'transform' in p
          ? Object.values(TRANSFORM_LOOKS).some((l) => l.includes(id as never))
          : 'arc' in p
            ? ARC_PIECES.flat().includes(id as never)
            : ARTIFACT_DEFS.some((a) => a.costume === id),
        `${id} worn by none`,
      ).toBe(true);
    expect(isCostume('flameCrown')).toBe(false); // (a transformation's own: no artifact wears it)
    for (const [id, p] of Object.entries(COSTUME_PIECES))
      if ('curse' in p)
        expect(
          ARTIFACT_DEFS.filter((a) => a.costume === id).every((a) => a.kind === 'cursed'),
          id,
        ).toBe(true);
  });
});

// M4.6: three artifacts of a family transform the mage for the rest of the run
describe('transformations', () => {
  const def = (id: string) => ARTIFACT_DEFS.find((a) => a.id === id)!;
  it('forms at three of a family, in the order the third was taken, and stays formed', () => {
    const pyro = ARTIFACT_DEFS.filter((a) => a.family === 'pyromancer').slice(0, TRANSFORM_NEEDS),
      frost = ARTIFACT_DEFS.filter((a) => a.family === 'frostborn').slice(0, TRANSFORM_NEEDS);
    expect(formed(pyro.slice(0, 2))).toEqual([]);
    expect(formed([...pyro.slice(0, 2), ...frost, pyro[2]])).toEqual(['frostborn', 'pyromancer']);
    expect(formed([pyro[0], pyro[0], pyro[1]])).toEqual([]); // (the same artifact twice counts once)
    expect(formed([], ['pilgrim'])).toEqual(['pilgrim']); // (an artifact given up since: it stays)
    expect(formed([def('apprentice_wand')])).toEqual([]);
  });
  it('every transformation has its family of at least three and a gift no artifact gives; the data passes its checks', () => {
    expect(validateFamilies(ARTIFACT_DEFS)).toEqual([]);
    for (const t of TRANSFORM_IDS) {
      expect(ARTIFACT_DEFS.filter((a) => a.family === t).length, t).toBeGreaterThanOrEqual(TRANSFORM_NEEDS);
      expect(TRANSFORMS[t].gift.length, t).toBeGreaterThan(0);
      expect(STR.transforms[t], t).toMatchObject({
        name: expect.any(String),
        gift: expect.any(String),
        lore: expect.any(String),
      });
    }
    expect(validateFamilies([{ id: 'x', family: 'alchemist' }]).some((e) => e.includes('alchemist'))).toBe(true);
    expect(
      validateArtifacts([...ARTIFACT_DEFS, { ...def('ember_sigil'), id: 'bad', effects: ['blink'] }]).some((e) =>
        e.includes('gift'),
      ),
    ).toBe(true);
    expect([...giftEffects(['lightbearer', 'pilgrim'])].sort()).toEqual([
      'float',
      'graveLantern',
      'pilgrimPath',
      'pitWalker',
    ]);
  });
  it("the latest formed wears its look over the artifacts' pieces in those slots, its aura in the aura slot", () => {
    const held = ['pilgrims_cowl', 'mana_lantern', 'stormglass_pendant'].map(def);
    const worn = wornLooks(held, [], 'pyromancer');
    expect(worn.map((w) => [w.slot, w.piece])).toEqual([
      ['head', 'flameCrown'],
      ['shoulders', 'carried'],
      ['belt', 'carried'],
      ['feet', 'emberSteps'],
      ['aura', 'aura'],
    ]);
    expect(worn.find((w) => w.slot === 'aura')).toMatchObject({ from: 'pyromancer', transform: true });
    expect(wornLooks(held, [], 'pilgrim').find((w) => w.slot === 'belt')).toMatchObject({
      piece: 'carried',
      at: 'belt',
      from: 'grave_lantern',
    });
    for (const t of TRANSFORM_IDS) {
      expect(TRANSFORM_LOOKS[t], t).toBeDefined();
      for (const p of TRANSFORM_LOOKS[t])
        if (typeof p === 'string') expect(COSTUME_PIECES[p], `${t}: ${p}`).toBeDefined();
        else
          expect(
            ARTIFACT_DEFS.some((a) => a.id === p.from),
            `${t}: ${p.from}`,
          ).toBe(true);
    }
  });
});

// M4.6: Azyrion grows towards the chaos mage as the artifacts held add up
describe("Azyrion's arc", () => {
  const def = (id: string) => ARTIFACT_DEFS.find((a) => a.id === id)!;
  it('reaches a stage at each threshold, four at most', () => {
    const at = CFG.arc.at;
    expect([0, 2, 3, 5, 6, 9, 11, 12, 30].map((n) => arcStage(n, at))).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4]);
    expect(ARC_PIECES.length).toBe(at.length);
  });
  it("puts the chaos mage's pieces on only where nothing else is worn: an artifact's piece or a transformation's look wins the slot", () => {
    expect(wornIds(wornLooks([], [], undefined, 4))).toEqual(['chaosCollar', 'bracers', 'runeOrbs', 'chaosFlame']);
    expect(wornIds(wornLooks([], [], undefined, 2))).toEqual(['chaosCollar', 'bracers']);
    expect(wornIds(wornLooks([def('frostbitten_ring')], [], undefined, 4))).toEqual([
      'chaosCollar',
      'frostRing',
      'runeOrbs',
      'chaosFlame',
    ]);
    expect(wornIds(wornLooks([], [], 'stormcaller', 4))).toEqual([
      'stormMarks',
      'chaosCollar',
      'stormSpirals',
      'aura',
      'runeOrbs',
      'chaosFlame',
    ]);
    expect(wornLooks([], [], undefined, 1)[0]).toMatchObject({ piece: 'bracers', from: 'arc', arc: true });
    expect(isCostume('bracers')).toBe(false); // (the arc's own: no artifact wears it)
    expect(STR.arc.length).toBe(ARC_PIECES.length);
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
    expect(stats(['rosary_of_haste']).fireDelay).toBeCloseTo(base.fireDelay * 0.75);
    expect(stats(['pilgrims_boots', 'chain_of_the_penitent']).speed).toBeCloseTo((base.speed + 0.6) * 0.75);
    expect(stats(['chain_of_the_penitent']).invuln).toBeCloseTo(base.invuln + 2);
    expect(stats(['reliquary_shard']).maxHp).toBe((base.hearts + 1) * 2);
  });

  it('lets the focus set the pattern while passives modify it', () => {
    const twinLens = stats(['bone_lens'], 'twin_staff');
    expect(twinLens.pattern.count).toBe(2);
    expect(twinLens.pierce).toBe(1);
    expect(twinLens.damage).toBeCloseTo(base.damage * 0.7);
    expect(stats([], 'drowned_orb').pattern).toMatchObject({ path: 'bounce', bounces: 2 });
    expect(stats([], 'drowned_orb').range).toBeGreaterThan(base.range);
    expect(stats(['bone_lens'], 'shepherds_crook').pattern.path).toBe('boomerang');
  });

  it('knows the new shapes and modifiers: fans, weaving, speed, range, knockback and heavy bolts', () => {
    expect(stats([], 'mourners_censer').pattern).toMatchObject({ count: 3, fan: 0.3 });
    expect(stats([], 'mourners_censer').range).toBeCloseTo(base.range * 0.6);
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
    expect(lead.range).toBeCloseTo(base.range * 0.6 * 1.3);
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
    for (const a of ARTIFACT_DEFS.filter((x) => x.curse)) {
      const s = clean(a.id),
        plain = stats([]);
      for (const e of a.curse!.effects ?? []) expect(s.effects.has(e)).toBe(false);
      for (const [k, v] of Object.entries(a.stats ?? {}))
        expect(halveStat(k as never, v)).not.toBe(k.endsWith('Mul') ? 1 : 0);
      expect(s).not.toEqual(plain);
    }
  });

  it("weighs the hoard for the Miser's Purse: harder, golder bolts for every ten obols", () => {
    const at = (coins: number) => computeStats(START_FOCUS, ['misers_purse'], base, [], coins);
    expect(at(0).damage).toBeCloseTo(base.damage);
    expect(at(9).damage).toBeCloseTo(base.damage);
    expect(at(10).damage).toBeCloseTo(base.damage + 0.5);
    expect(at(47).damage).toBeCloseTo(base.damage + 2);
    expect(at(0).gilt).toBe(0);
    expect(at(20).gilt).toBeCloseTo(0.4);
    expect(at(99).gilt).toBe(1);
    expect(at(0).boltColor).toBe(DEFAULT_BOLT_COLOR);
    expect(at(99).boltColor).toBe(GILT_COLOR);
    expect(computeStats(START_FOCUS, [], base, [], 50).damage).toBeCloseTo(base.damage); // obols alone do nothing
    // it scales with the rest: a multiplier multiplies the hoard's bonus too
    expect(computeStats(START_FOCUS, ['misers_purse', 'mask_of_the_drowned'], base, [], 30).damage).toBeCloseTo(
      (base.damage + 1.5) * 2,
    );
  });

  it('knows the economy artifacts: wider blasts, what they hand over, and their effects', () => {
    expect(stats(['glyphwrights_chalk']).blastMul).toBeCloseTo(1.5);
    expect(stats([]).blastMul).toBe(1);
    expect(ARTIFACT_DEFS.find((a) => a.id === 'sextons_keyring')!.gives).toEqual({ keys: 3 });
    expect(ARTIFACT_DEFS.find((a) => a.id === 'glyphwrights_chalk')!.gives).toEqual({ glyphs: 5 });
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
    const rng = new Rng(7),
      seen = new Set<string>();
    const picks: string[] = [];
    for (let i = 0; i < 100; i++) {
      const a = pickArtifact(rng, 'treasure', seen);
      if (!a) break;
      seen.add(a.id);
      picks.push(a.id);
    }
    expect(new Set(picks).size).toBe(picks.length);
    expect(picks).not.toContain(START_FOCUS);
    expect(picks).toHaveLength(ARTIFACT_DEFS.length - 1); // falls back to other pools once treasure runs dry
    const treasureCount = ARTIFACT_DEFS.filter((a) => a.pools.includes('treasure')).length;
    for (const id of picks.slice(0, treasureCount))
      expect(ARTIFACT_DEFS.find((a) => a.id === id)!.pools).toContain('treasure');
    expect(pickArtifact(rng, 'treasure', seen)).toBeNull();
  });
});
