import { expect, test } from '@playwright/test';
import { type GameHooks, type W, start, type G9, type G11, type G11h, type GP } from './helpers';

test('spells: Arc strikes and leaps for mana, a cooldown holds it back, and the dead give mana back', async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_a&seed=MAG1&spells=arc');
  await expect(page.locator('#scrTitle .controls')).toContainText('Q and E');
  const arc = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G9,
      P = g.player;
    g.warp(1);
    g.sim(1);
    const hp = g.enemies.reduce((s, e) => s + e.hp, 0),
      mana = P.mana;
    const cast = g.cast(0, { x: 0, z: -1 }),
      struck = g.enemies.filter((e) => e.lastHit === 'spell').length;
    const again = g.cast(0); // still cooling down
    return {
      spells: P.spells,
      cast,
      again,
      spent: mana - P.mana,
      struck,
      damage: hp - g.enemies.reduce((s, e) => s + e.hp, 0),
      cd: P.spellCd[0],
    };
  });
  expect(arc).toMatchObject({ spells: ['arc', null], cast: true, again: false });
  expect(arc.spent).toBeCloseTo(15, 0);
  expect(arc.struck).toBeGreaterThanOrEqual(2); // it leaps
  expect(arc.damage).toBeGreaterThan(9);
  expect(arc.cd).toBeGreaterThan(0.9);
  // the cantrip's kills give mana back; a cast with too little mana is refused
  const back = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as unknown as G9,
      P = g.player;
    g.mana(10);
    const refused = !g.cast(0);
    g.mana(40);
    w.__fight(40);
    return { refused, mana: P.mana, left: g.enemies.length };
  });
  expect(back).toMatchObject({ refused: true, left: 0 });
  expect(back.mana).toBeGreaterThan(40 + 3); // at least one kill's worth, beyond regeneration in the fight
  // a mana vial is left lying at full mana, and taken when mana is short
  const vial = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G9 & { pickups: { kind: string; x: number; z: number }[] },
      P = g.player;
    g.mana(999);
    const full = P.mana; // as full as it goes
    g.drop('mana', g.player.x, g.player.z + 0.3);
    g.sim(1);
    const lying = g.pickups.filter((q) => q.kind === 'mana').length;
    const q = g.pickups.find((x) => x.kind === 'mana')!; // nudged away while refused: step onto it
    g.mana(20);
    P.x = q.x;
    P.z = q.z;
    g.sim(0.3);
    return {
      full,
      max: P.stats.maxMana,
      lying,
      after: P.mana,
      left: g.pickups.filter((q) => q.kind === 'mana').length,
    };
  });
  expect(vial).toMatchObject({ lying: 1, left: 0 });
  expect(vial.full).toBe(vial.max);
  expect(vial.after).toBeGreaterThanOrEqual(45);
  await page.evaluate(() => (window as unknown as W).__game.sim(0.1, true));
  await page.screenshot({ path: 'test-results/smoke-spells.png' });
  expect(errors).toEqual([]);
});

test('spells: the lance burns a line, the seal erupts and leaves fire, shards freeze, ice walls hold, the mantle throws foes back', async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&seed=SPL3');
  // Cinder Lance: a beam through two dummies (clear of the pedestal in the middle), burning both
  const lance = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11,
      P = g.player;
    g.warp(1);
    g.sim(0.3);
    P.x -= 4;
    g.learn('cinder_lance', 0);
    g.spawn('dummy', P.x + 2.5, P.z);
    g.spawn('dummy', P.x + 5, P.z + 0.2);
    g.sim(0.8);
    const cast = g.cast(0, { x: 1, z: 0 }),
      shows = g.spellFx.lance;
    g.sim(0.1);
    const burning = g.enemies.filter((e) => (e.status?.burn ?? 0) > 0 && e.lastHit === 'spell').length,
      still = g.spellFx.lance;
    g.sim(0.7);
    return { cast, shows, still, gone: !g.spellFx.lance, burning }; // (its look swells, holds and fades by itself)
  });
  expect(lance).toEqual({ cast: true, shows: true, still: true, gone: true, burning: 2 });
  // Pyre Seal: nothing for a heartbeat, then the ring strikes, burns and throws back; the ground burns on
  const seal = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11,
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    g.mana(999);
    g.learn('pyre_seal', 1);
    const foe = g.spawn('rotling', P.x + 1.2, P.z - 0.6);
    g.sim(0.8);
    foe.hp = 60;
    g.cast(1);
    g.sim(0.5);
    const early = foe.status?.burn ?? 0,
      at = { x: foe.x, z: foe.z };
    g.sim(0.6);
    const hit = 60 - foe.hp,
      burn = foe.status?.burn ?? 0,
      shockwave = g.spellFx.rings > 0;
    g.clearRoom();
    const late = g.spawn('dummy', P.x, P.z);
    g.sim(1.5);
    P.hp = P.maxHp;
    return {
      early,
      hit,
      burn,
      shockwave,
      ground: late.status?.burn ?? 0,
      pushed: Math.hypot(foe.x - at.x, foe.z - at.z),
    };
  });
  expect(seal.early).toBe(0);
  expect(seal.shockwave).toBe(true); // (the eruption's ring of fire on the floor)
  expect(seal.hit).toBeGreaterThanOrEqual(14);
  expect(seal.burn).toBeGreaterThan(3);
  expect(seal.ground).toBeGreaterThan(0); // walked onto burning ground after the eruption
  // Rime Shards: at close range all five strike, and the third chill freezes
  const shards = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11,
      P = g.player;
    g.clearRoom();
    g.sim(3);
    g.mana(999);
    P.x += 4;
    g.learn('rime_shards', 0);
    const d = g.spawn('dummy', P.x, P.z - 1.1);
    g.sim(0.8);
    g.cast(0, { x: 0, z: -1 });
    const flying = g.bolts.length;
    g.sim(0.4);
    return { flying, frozen: (d.status?.frozen ?? 0) > 0 };
  });
  expect(shards).toEqual({ flying: 5, frozen: true });
  // Glacial Wall: it holds a foe back and stops its shots, lets the mage's bolts through, then shatters and chills
  const wall = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11 & { keys: Set<string>; arrowOrder: string[] },
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    g.mana(999);
    g.learn('glacial_wall', 1);
    P.x += 2.5; // clear of the pedestal
    const cast = g.cast(1, { x: 0, z: -1 }),
      barriers = g.current.barriers?.length ?? 0,
      wallZ = P.z - 2;
    const foe = g.spawn('rotling', P.x, P.z - 4);
    g.sim(0.8);
    foe.hp = 60;
    const hp = P.hp;
    g.shoot(P.x + 0.3, P.z - 4.5, 0, 1);
    g.sim(1.2);
    const held = foe.z < wallZ,
      shots = g.shots.length,
      hurt = hp - P.hp;
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    g.sim(0.8);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    const shotThrough = foe.hp < 60;
    foe.hp = 60;
    g.sim(3);
    return {
      cast,
      barriers: barriers > 3,
      held,
      shots,
      hurt,
      shotThrough,
      after: g.current.barriers?.length ?? 0,
      shattered: 60 - foe.hp,
      chill: foe.status?.chill ?? 0,
    };
  });
  expect(wall).toMatchObject({
    cast: true,
    barriers: true,
    held: true,
    shots: 0,
    hurt: 0,
    shotThrough: true,
    after: 0,
  });
  expect(wall.shattered).toBeGreaterThanOrEqual(8);
  expect(wall.chill).toBeGreaterThanOrEqual(1);
  // Static Mantle: foes that touch the mage are shocked and thrown back and don't hurt; when it ends, they do
  const mantle = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11,
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    g.mana(999);
    g.learn('static_mantle', 0);
    const a = g.spawn('rotling', P.x - 0.8, P.z - 1.2),
      b = g.spawn('rotling', P.x + 1, P.z - 1);
    g.sim(0.7);
    a.hp = b.hp = 60;
    g.cast(0);
    const hp = P.hp;
    g.sim(1.5);
    const during = {
      hurt: hp - P.hp,
      left: g.mantle,
      zapped: g.enemies.filter((e) => e.hp < 60 && e.lastHit === 'spell').length,
    };
    let crackled = 0;
    for (let i = 0; i < 20; i++) {
      g.sim(0.05);
      crackled = Math.max(crackled, g.spellFx.strikes);
    } // (arcs over the mage, zaps)
    P.invuln = 0;
    const hp2 = P.hp;
    g.sim(4.5);
    return { during, crackled, left: g.mantle, hurtAfter: hp2 - P.hp, gone: g.spellFx.strikes };
  });
  expect(mantle.during).toMatchObject({ hurt: 0, zapped: 2 });
  expect(mantle.during.left).toBeGreaterThan(4);
  expect(mantle.crackled).toBeGreaterThan(0);
  expect(mantle.gone).toBe(0); // (the lightning goes back to its pool when it's done)
  expect(mantle.left).toBe(0);
  expect(mantle.hurtAfter).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('Hallow and Umbral (M4.1): holy ground heals and lays foes open, judgement falls on the strongest, wardlight breaks shots, hexes give mana back, hands hold, the toll pays; Eclipse and Blackfire', async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&seed=HAL1');
  // Consecrate: the dummy in the holy ground is struck and sanctified; the mage in it is healed once
  const zone = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h,
      P = g.player;
    g.warp(1);
    g.sim(0.3);
    P.x -= 3;
    g.learn('consecrate', 0);
    g.mana(999);
    const d = g.spawn('dummy', P.x + 1, P.z);
    g.prop('candles', P.x - 1.2, P.z);
    g.sim(0.8);
    P.hp = P.maxHp - 1;
    const cast = g.cast(0);
    g.sim(1.2);
    return {
      cast,
      sanct: d.status?.sanct ?? 0,
      healed: P.hp === P.maxHp,
      candles: g.props.find((q) => q.kind === 'candles')?.lit,
    };
  });
  expect(zone).toMatchObject({ cast: true, healed: true, candles: true }); // (holy ground kindles the candle stands on it)
  expect(zone.sanct).toBeGreaterThan(1);
  // Judgement: nothing for a moment, then the pillar falls on the strongest foe in reach, and only on it
  const judge = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h,
      P = g.player;
    g.clearRoom();
    g.sim(3);
    g.mana(999);
    g.learn('judgement', 0);
    const strong = g.spawn('rotling', P.x + 4, P.z - 2),
      weak = g.spawn('rotling', P.x + 4, P.z + 2.5);
    g.sim(0.8);
    strong.hp = 80;
    weak.hp = 30;
    const cast = g.cast(0);
    g.sim(0.5);
    const early = 80 - strong.hp;
    g.sim(0.7);
    return { cast, early, struck: 80 - strong.hp, sanct: strong.status?.sanct ?? 0, weak: 30 - weak.hp };
  });
  expect(judge).toMatchObject({ cast: true, early: 0, weak: 0 });
  expect(judge.struck).toBeGreaterThanOrEqual(26);
  expect(judge.sanct).toBeGreaterThan(3);
  // Wardlight: motes circle the mage for a while and break the shots they meet
  const ward = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h,
      P = g.player;
    g.clearRoom();
    g.sim(3);
    g.mana(999);
    g.learn('wardlight', 0);
    const cast = g.cast(0),
      left = g.ward;
    P.invuln = 0;
    const hp = P.hp;
    for (let i = 0; i < 4; i++) g.shoot(P.x + (i - 1.5) * 0.15, P.z - 3, 0, 1);
    g.sim(1.2);
    return { cast, left, hurt: hp - P.hp, shots: g.shots.length };
  });
  expect(ward).toMatchObject({ cast: true, hurt: 0, shots: 0 });
  expect(ward.left).toBeGreaterThan(7);
  // Hex Bolt: a slow bolt hexes what it strikes, and each blow on a hexed foe spends a stack for mana
  const hexed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h,
      P = g.player;
    g.clearRoom();
    g.sim(9);
    g.mana(999);
    g.learn('hex_bolt', 0);
    const d = g.spawn('dummy', P.x, P.z - 2.2);
    g.sim(0.8);
    const cast = g.cast(0, { x: 0, z: -1 });
    g.sim(0.8);
    const hex = d.status?.hex ?? 0;
    g.mana(10);
    const i = g.enemies.findIndex((e) => e.type === 'dummy');
    g.hit(i, 1, undefined, 'cantrip');
    return { cast, hex, after: d.status?.hex ?? 0, mana: P.mana };
  });
  expect(hexed).toMatchObject({ cast: true, hex: 2, after: 1 });
  expect(hexed.mana).toBeGreaterThanOrEqual(13);
  // Eclipse (Hallow + Umbral): out of the fight under a black sun, then struck; Blackfire (Umbral + Ember) never goes out
  const react = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h,
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    const foe = g.spawn('rotling', P.x + 3, P.z - 2.5);
    g.sim(0.8);
    foe.hp = 60;
    g.inflict({ sanct: 3 });
    g.inflict({ hex: 1 });
    const eclipse = foe.status?.eclipse ?? 0,
      at = { x: foe.x, z: foe.z };
    g.sim(1);
    const moved = Math.hypot(foe.x - at.x, foe.z - at.z),
      during = 60 - foe.hp;
    g.sim(1.2);
    const after = 60 - foe.hp;
    g.clearRoom();
    g.sim(0.3);
    const other = g.spawn('rotling', P.x + 3, P.z - 2.5);
    g.sim(0.8);
    other.hp = 200;
    g.inflict({ burn: 2 });
    g.inflict({ hex: 1 });
    g.sim(4);
    return {
      eclipse,
      moved,
      during,
      after,
      black: other.status?.black,
      burning: other.status?.burn ?? 0,
      burnt: 200 - other.hp,
    };
  });
  expect(react.eclipse).toBeGreaterThan(1.5);
  expect(react).toMatchObject({ moved: 0, during: 0, black: true });
  expect(react.after).toBeGreaterThanOrEqual(18);
  expect(react.burning).toBeGreaterThan(0); // (a burn of 2 s, still alight after 4)
  expect(react.burnt).toBeGreaterThanOrEqual(10);
  // Grasp of the Grave: hands rise where the mage aims and hold the foe there, hexed
  const held = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h,
      P = g.player;
    g.clearRoom();
    g.sim(3);
    g.mana(999);
    g.learn('grasp_of_the_grave', 0);
    const foe = g.spawn('rotling', P.x, P.z - 3);
    g.sim(0.8);
    foe.hp = 60;
    const cast = g.cast(0, { x: 0, z: -1 });
    g.sim(0.5);
    const at = { x: foe.x, z: foe.z },
      root = foe.status?.root ?? 0,
      hex = foe.status?.hex ?? 0;
    g.sim(1);
    return { cast, root, hex, moved: Math.hypot(foe.x - at.x, foe.z - at.z), struck: 60 - foe.hp };
  });
  expect(held).toMatchObject({ cast: true, hex: 1 });
  expect(held.root).toBeGreaterThan(1.5);
  expect(held.moved).toBeLessThan(0.05);
  expect(held.struck).toBeGreaterThanOrEqual(5);
  // the Ferryman's Toll: the nearest foe is marked, blows on it give mana back, and falling it pays an obol and spreads its hex
  const toll = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h,
      P = g.player;
    g.clearRoom();
    g.sim(3);
    g.mana(999);
    g.learn('ferrymans_toll', 0);
    const near = g.spawn('rotling', P.x, P.z - 2.5),
      by = g.spawn('rotling', P.x + 1.2, P.z - 3);
    g.sim(0.8);
    near.hp = by.hp = 60;
    const coins = g.pickups.filter((q) => q.kind === 'coin').length,
      cast = g.cast(0, { x: 0, z: -1 }),
      marked = !!near.toll;
    g.sim(0.3);
    g.mana(10);
    const i = g.enemies.indexOf(near as never);
    g.hit(i, 1, undefined, 'cantrip');
    const mana = P.mana;
    g.sim(0.3);
    g.hit(g.enemies.indexOf(near as never), 99, undefined, 'cantrip');
    g.sim(0.1);
    return {
      cast,
      marked,
      mana,
      paid: g.pickups.filter((q) => q.kind === 'coin').length - coins,
      spread: by.status?.hex ?? 0,
    };
  });
  expect(toll).toMatchObject({ cast: true, marked: true });
  expect(toll.mana).toBeGreaterThanOrEqual(14); // the toll's 4 (and the hex's stack)
  expect(toll.paid).toBeGreaterThanOrEqual(1);
  expect(toll.spread).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-hallow-umbral.png' });
  expect(errors).toEqual([]);
});

test('spell marks (M4.11): each slotted spell shows at its hand (ready, cooling, short of mana), both of one school attune the mage, a school known in full rings the wrist, and standing still shows the knowledge circle', async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&variant=quiet&seed=MARK1');
  type Hand = { spell: string; school: string; state: string; glow: number; ring: boolean } | null;
  type GM = GameHooks & {
    spellMarks: {
      hands: Hand[];
      attuned: string | null;
      circle: { shown: boolean; known: number[]; mastered: string[] };
    };
    attune(s: string): void;
    learn(id: string, slot: number): void;
    cast(slot: number, dir?: { x: number; z: number }): boolean;
    mana(v?: number): number;
    know(id: string, stage: string): void;
    forgetKnowledge(): void;
    clearRoom(): void;
    closeUp(on?: boolean): void;
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GM,
      out: Record<string, unknown> = {};
    g.forgetKnowledge();
    g.warp(1);
    g.sim(0.3, true);
    g.clearRoom();
    g.sim(0.3, true);
    out.none = g.spellMarks.hands;
    g.learn('arc', 0);
    g.learn('cinder_lance', 1);
    g.mana(100);
    g.sim(0.2, true);
    out.ready = g.spellMarks.hands.map((h) => h && [h.school, h.state]);
    out.handsLine = document.querySelector('#toast')?.textContent; // (the first time they show, a line says what they tell)
    g.cast(1, { x: 0, z: -1 });
    g.sim(0.1, true);
    out.cooling = g.spellMarks.hands[1]?.state;
    g.sim(2.5, true);
    out.back = g.spellMarks.hands[1]?.state;
    g.mana(0);
    g.sim(0.1, true);
    out.short = g.spellMarks.hands.map((h) => h?.state);
    g.mana(100);
    out.unattuned = g.spellMarks.attuned;
    g.attune('ember');
    g.sim(0.2, true);
    out.attuned = g.spellMarks.attuned;
    g.sim(1.5, true);
    out.line = document.querySelector('#toast')?.textContent; // (after the hands' line, never cutting it short)
    out.ringBefore = g.spellMarks.hands.map((h) => h?.ring);
    g.know('cinder_lance', 'used');
    g.know('pyre_seal', 'used');
    g.know('arc', 'used');
    g.sim(0.1, true);
    out.ringAfter = g.spellMarks.hands.map((h) => h?.ring);
    out.mastered = g.spellMarks.circle.mastered;
    g.sim(0.4, true);
    out.early = g.spellMarks.circle.shown;
    g.sim(1.5, true);
    out.circle = g.spellMarks.circle;
    return out;
  });
  expect(r.none).toEqual([null, null]);
  expect(r.ready).toEqual([
    ['storm', 'ready'],
    ['ember', 'ready'],
  ]);
  expect(r.cooling).toBe('cooling');
  expect(r.back).toBe('ready');
  expect(r.short).toEqual(['short', 'short']);
  expect(r.handsLine).toContain('Your spells show at your hands');
  expect(r.unattuned).toBeNull();
  expect(r.attuned).toBe('ember');
  expect(r.line).toContain('Attuned to Ember');
  expect(r.ringBefore).toEqual([false, false]);
  expect(r.ringAfter).toEqual([true, true]);
  expect(r.mastered).toEqual(['ember']);
  expect(r.circle).toMatchObject({ shown: true, known: [2, 0, 1, 0, 0, 0], mastered: ['ember'] }); // (Verdant's arc, sixth)
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as GM;
    g.closeUp(true);
    g.sim(0.2, true);
  });
  await page.screenshot({ path: 'test-results/spell-marks.png' });
  await page.evaluate(() => ((window as unknown as W).__game as GM).forgetKnowledge());
  expect(errors).toEqual([]);
});

test('Verdant (M5 step 9): the Thorn Snare holds and overgrows, the Living Wall rises and burns down, the Pollen Cloud mends; an overgrown foe flowers as it falls (once a room); its five reactions go off', async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_a&seed=VERD1&spells=thorn_snare,living_wall');
  type GV = GP & {
    clearRoom(): void;
    current: { cx: number; cz: number; barriers?: unknown[] };
    burn(x: number, z: number, r: number): void;
    inflict(s: Record<string, number>): void;
    element(kind: string, x: number, z: number): void;
    hit(i: number, dmg: number, school?: string): void;
    reaction(r: string): void;
    reactions: string[];
    forgetReactions(): void;
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GV,
      P = g.player;
    g.forgetReactions();
    g.warp(1);
    g.sim(0.3);
    g.clearRoom();
    g.sim(0.2);
    g.mana(200);
    P.x = g.current.cx;
    P.z = g.current.cz + 2;
    for (let i = 0; i < 3; i++) g.spawn('rotling');
    g.sim(0.7);
    g.enemies.forEach((e, i) => {
      const f = e as unknown as { x: number; z: number; hp: number; maxHp: number };
      f.x = P.x - 1 + i;
      f.z = P.z - 3;
      f.hp = f.maxHp = 200;
    });
    g.cast(0, { x: 0, z: -1 });
    g.sim(0.6);
    const snared = g.enemies.map((e) => ({ grow: (e.status?.grow ?? 0) > 0, root: (e.status?.root ?? 0) > 0 }));
    g.sim(1.5);
    g.cast(1, { x: 0, z: -1 });
    g.sim(0.5);
    const wall = g.current.barriers?.length ?? 0;
    g.burn(P.x, P.z - 2, 0.5);
    g.sim(0.2);
    const burnt = g.current.barriers?.length ?? 0;
    // the flower: an overgrown foe falling mends half a heart, once a room
    P.hp = 3;
    g.inflict({ grow: 4 });
    g.hit(0, 9999);
    g.sim(0.2);
    const once = P.hp;
    g.hit(0, 9999);
    g.sim(0.2);
    const twice = P.hp;
    // the Pollen Cloud mends once
    g.learn('pollen_cloud', 0);
    P.hp = 3;
    g.sim(1);
    g.cast(0, { x: 0, z: -1 });
    g.sim(0.6);
    const pollen = P.hp;
    // pollen is no holy ground: darkness on it sets off no Eclipse
    g.forgetReactions();
    g.element('hex', P.x, P.z);
    g.sim(0.2);
    const eclipse = g.reactions.includes('eclipse');
    return { snared, wall, burnt, once, twice, pollen, eclipse };
  });
  expect(r.snared).toEqual([
    { grow: true, root: true },
    { grow: true, root: true },
    { grow: true, root: true },
  ]);
  expect(r.wall).toBeGreaterThan(0);
  expect(r.burnt).toBe(0);
  expect([r.once, r.twice]).toEqual([4, 4]);
  expect(r.pollen).toBe(4);
  expect(r.eclipse).toBe(false);
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/verdant.png' });
  // the five reactions that make the wheel whole
  const found = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GV;
    for (const r of ['wildfire', 'frostbloom', 'pollenspark', 'bloom', 'blight']) {
      g.clearRoom();
      g.sim(2);
      g.reaction(r);
      g.sim(1);
    }
    return g.reactions;
  });
  expect(found).toEqual(expect.arrayContaining(['wildfire', 'frostbloom', 'pollenspark', 'bloom', 'blight']));
  await page.evaluate(() => ((window as unknown as W).__game as unknown as GV).forgetReactions());
  expect(errors).toEqual([]);
});

test('spell knowledge: a page shows its spell as far as it is known, learning and casting teach more, and it is kept between runs', async ({
  page,
}) => {
  type Pg = { spell: string; x: number; z: number; gone?: boolean };
  type GK = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    pages: Pg[];
    knowledge: Record<string, string>;
    pagePanel: { spell: string | null; text: string };
    cast(slot: number): boolean;
    mana(v: number): number;
    spawn(kind: string, x?: number, z?: number): unknown;
    know(id: string, st: string): void;
    forgetKnowledge(): void;
    player: { x: number; z: number; invuln: number; spells: (string | null)[]; spellCd: number[] };
  };
  const errors = await start(page, '?room=library_plain&seed=K3F9QX');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GK }).__game;
    g.warp(1);
    g.player.invuln = 99;
    g.sim(0.3);
    const p = g.pages.filter((q) => !q.gone)[0],
      before = g.knowledge[p.spell];
    // near the page: its panel, at the stage seen (name, school, what it does; the rest when it is learned)
    g.player.x = p.x;
    g.player.z = p.z + 1.4;
    g.sim(0.1);
    const seen = { stage: g.knowledge[p.spell], panel: g.pagePanel.spell, text: g.pagePanel.text };
    // known well elsewhere (set by hand here, then set back): the panel adds what it sets off, and its lore
    g.know(p.spell, 'used');
    g.sim(0.05);
    const usedText = g.pagePanel.text;
    g.know(p.spell, 'seen');
    g.sim(0.05);
    // into the page: taken, and learned
    g.player.x = p.x;
    g.player.z = p.z;
    g.sim(0.2);
    const learned = g.knowledge[p.spell],
      slot = g.player.spells.indexOf(p.spell);
    // cast it ten times: known well (a foe ahead for the spells that need one)
    g.spawn('dummy');
    g.sim(1.2);
    for (let i = 0; i < 10; i++) {
      g.player.spellCd[slot] = 0;
      g.mana(200);
      g.cast(slot);
      g.sim(0.3);
    }
    return {
      spell: p.spell,
      before,
      seen,
      usedText,
      learned,
      slot,
      used: g.knowledge[p.spell],
      toast: document.getElementById('toast')!.textContent,
    };
  });
  expect(r.before).toBe('unknown');
  expect(r.seen).toMatchObject({ stage: 'seen', panel: r.spell });
  expect(r.seen.text).toContain('Take its page to learn more of it');
  expect(r.usedText).toContain('What it sets off');
  expect(r.learned).toBe('learned');
  expect(r.slot).toBeGreaterThanOrEqual(0);
  expect(r.used).toBe('used');
  expect(r.toast).toContain('well now');
  expect(errors).toEqual([]);
  // a new run in the same browser: still known well; then forgotten
  const again = await start(page, '?room=library_plain&seed=K3F9QX');
  const kept = await page.evaluate((id) => {
    const g = (window as unknown as { __game: GK }).__game;
    const k = g.knowledge[id];
    g.forgetKnowledge();
    return { k, after: g.knowledge[id] };
  }, r.spell);
  expect(kept).toEqual({ k: 'used', after: 'unknown' });
  expect(again).toEqual([]);
});
