import { expect, test } from '@playwright/test';
import { type RoomView, type GameHooks, type W, start, type G7 } from './helpers';

test('obols, bone keys and glyph stones are picked up, and obols drift to the mage', async ({ page }) => {
  const errors = await start(page, '?seed=LOOT01');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & {
      player: GameHooks['player'] & { coins: number; keys: number; glyphs: number };
      pickups: unknown[];
      drop(kind: string, x?: number, z?: number): void;
    };
    const p = g.player,
      start = { coins: p.coins, keys: p.keys, glyphs: p.glyphs };
    g.drop('coin', p.x + 1.4, p.z);
    g.sim(1.5); // out of reach, but it drifts over
    const drifted = p.coins - start.coins;
    g.drop('key', p.x, p.z);
    g.drop('glyph', p.x, p.z);
    g.drop('purse', p.x, p.z);
    g.drop('heart', p.x, p.z);
    g.sim(1);
    return {
      start,
      coins: p.coins,
      keys: p.keys,
      glyphs: p.glyphs,
      drifted,
      left: g.pickups.length,
      hud: document.getElementById('purse')!.textContent,
    };
  });
  expect(result.start).toEqual({ coins: 0, keys: 0, glyphs: 1 });
  expect(result).toMatchObject({ drifted: 1, coins: 6, keys: 1, glyphs: 2, left: 1, hud: '060102' }); // the heart waits: health is full
  expect(errors).toEqual([]);
});

test('a blast glyph flares, hurts foes and the mage, breaks rocks, and bolts set glyphs off', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&loot=glyphs:4&seed=PICK1');
  type Rock = { x: number; z: number; breakable: boolean };
  type G3 = GameHooks & {
    player: GameHooks['player'] & { glyphs: number; invuln: number; vx: number; vz: number };
    glyphs: { x: number; z: number }[];
    current: RoomView & { rocks: Rock[] };
  };
  // 1. a glyph by a rock, a rotling on top of it and the mage beside it: the fuse runs out
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G3;
    g.warp(1);
    g.sim(0.8);
    const rock = g.current.rocks.find((r) => r.breakable)!;
    g.player.x = rock.x;
    g.player.z = rock.z + 1;
    g.player.invuln = 0;
  });
  await page.keyboard.press('Space');
  const fused = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G3,
      p = g.player;
    g.sim(0.05);
    const placed = g.glyphs.length,
      left = p.glyphs,
      rocks = g.current.rocks.length,
      hp = p.hp;
    const foe = g.enemies[0];
    foe.x = p.x + 0.6;
    foe.z = p.z;
    let t = 0;
    for (; t < 3 && g.glyphs.length; t += 0.05) {
      foe.x = p.x + 0.6;
      foe.z = p.z;
      p.vx = p.vz = 0;
      g.sim(0.05);
    }
    return {
      placed,
      left,
      t,
      rocksBroken: rocks - g.current.rocks.length,
      hpLost: hp - p.hp,
      pinnedFell: !g.enemies.includes(foe),
    };
  });
  expect(fused).toMatchObject({ placed: 1, left: 4, rocksBroken: 1, hpLost: 2, pinnedFell: true });
  expect(fused.t).toBeGreaterThan(1.3);

  // 2. two glyphs in a row, the mage steps away and casts across them: the bolt sets off the first at once,
  //    and its blast the second
  const shot = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G3;
    return { fx: g.current.cx, fz: g.current.cz + 2.5 }; // an open strip south of the middle
  });
  for (const dx of [0, 1]) {
    await page.evaluate(
      ({ fx, fz, dx }) => {
        const g = (window as unknown as W).__game as unknown as G3;
        g.player.x = fx + dx;
        g.player.z = fz;
        g.sim(0.4);
      },
      { ...shot, dx },
    );
    await page.keyboard.press('Space');
  }
  const chained = await page.evaluate(({ fx, fz }) => {
    const g = (window as unknown as W).__game as unknown as G3,
      p = g.player;
    g.sim(0.05);
    const placed = g.glyphs.length;
    p.x = fx - 3.5;
    p.z = fz;
    p.invuln = 0;
    const hp = p.hp;
    g.keys.add('ArrowRight');
    g.arrowOrder.push('ArrowRight');
    let t = 0;
    for (; t < 1 && g.glyphs.length; t += 0.05) g.sim(0.05);
    g.keys.delete('ArrowRight');
    g.arrowOrder.length = 0;
    return { placed, t, left: g.glyphs.length, hpLost: hp - p.hp };
  }, shot);
  expect(chained).toMatchObject({ placed: 2, left: 0, hpLost: 0 });
  expect(chained.t).toBeLessThan(0.8); // well before the 1.5 s fuse
  await page.evaluate(() => (window as unknown as W).__game.sim(0.1, true));
  await page.screenshot({ path: 'test-results/smoke-glyph.png' });
  expect(errors).toEqual([]);
});

test('urns break to bolts, sealed urns only to a blast; coffers open, warded chests take a key or burn', async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_c&loot=glyphs:4,keys:1&seed=URNS01');
  type Rock = { x: number; z: number; urn?: 'plain' | 'sealed' };
  type Pick = { kind: string; x: number; z: number; opened?: boolean; contents?: unknown[] };
  type G4 = GameHooks & {
    player: GameHooks['player'] & { keys: number; glyphs: number; invuln: number; vx: number; vz: number };
    current: RoomView & { rocks: Rock[]; bounds: { minX: number; minZ: number } };
    pickups: Pick[];
    clearRoom(): void;
    drop(kind: string, x: number, z: number): void;
  };
  const urns = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as unknown as G4;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + 0.5, z: g.current.bounds.minZ + r + 0.5 });
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    const count = (k: string) => g.current.rocks.filter((r) => r.urn === k).length;
    const before = { plain: count('plain'), sealed: count('sealed') };
    for (const row of [0, 6]) {
      // cast east along the top and bottom rows, at the urns in the corners
      const p = at(7, row);
      g.player.x = p.x;
      g.player.z = p.z;
      g.player.vx = g.player.vz = 0;
      g.keys.add('ArrowRight');
      g.arrowOrder.push('ArrowRight');
      g.sim(1.6);
      g.keys.delete('ArrowRight');
      g.arrowOrder.length = 0;
      g.sim(0.8);
    }
    const p = at(11, 0);
    g.player.x = p.x;
    g.player.z = p.z; // beside the sealed urn, to chalk a glyph
    return { before, after: { plain: count('plain'), sealed: count('sealed') } };
  });
  expect(urns.before).toEqual({ plain: 3, sealed: 1 });
  expect(urns.after).toEqual({ plain: 0, sealed: 1 }); // bolts glance off the ward
  await page.keyboard.press('Space');
  const sealed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G4;
    const spot = { x: g.current.bounds.minX + 12.5, z: g.current.bounds.minZ + 0.5 };
    g.sim(0.05);
    g.player.x -= 4;
    g.player.z += 2;
    g.sim(2);
    return {
      left: g.current.rocks.filter((r) => r.urn).length,
      rose: g.pickups.filter((q) => Math.hypot(q.x - spot.x, q.z - spot.z) < 0.1).length,
    };
  });
  expect(sealed).toEqual({ left: 0, rose: 1 }); // a sealed urn always holds something

  const containers = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G4,
      P = g.player;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + 0.5, z: g.current.bounds.minZ + r + 0.5 });
    const spots = [at(2, 4), at(6, 4), at(10, 4)];
    g.drop('coffer', spots[0].x, spots[0].z);
    g.drop('chest', spots[1].x, spots[1].z);
    g.drop('chest', spots[2].x, spots[2].z);
    g.sim(0.8);
    const [coffer, chestA, chestB] = g.pickups.slice(-3);
    const sizes = [coffer, chestA, chestB].map((c) => c.contents!.length);
    // what a container spilled: pickups that weren't there before (the mage may pick up others meanwhile)
    const spilledBy = (act: () => void) => {
      const before = new Set(g.pickups);
      act();
      return g.pickups.filter((q) => !before.has(q)).length;
    };
    const walkTo = (c: Pick) => {
      P.x = c.x;
      P.z = c.z + 0.2;
      g.sim(0.3);
    };
    const cofferSpilled = spilledBy(() => walkTo(coffer));
    const keys = P.keys,
      chestSpilled = spilledBy(() => walkTo(chestA));
    walkTo(chestB);
    const refused = !chestB.opened,
      toast = document.getElementById('toast')!.textContent;
    P.x = chestB.x - 0.8;
    P.z = chestB.z;
    return { sizes, cofferSpilled, chestSpilled, keysSpent: keys - P.keys, refused, toast };
  });
  expect(containers.cofferSpilled).toBe(containers.sizes[0]);
  expect(containers.chestSpilled).toBe(containers.sizes[1]);
  expect(containers).toMatchObject({ keysSpent: 1, refused: true });
  expect(containers.toast).toMatch(/bone key/);
  await page.keyboard.press('Space'); // a glyph beside the second chest: its ward breaks, half burns
  const forced = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G4,
      P = g.player,
      chest = g.pickups.filter((q) => q.kind === 'chest')[1];
    const before = new Set(g.pickups);
    g.sim(0.05);
    P.x = g.current.bounds.minX + 2.5;
    P.z = g.current.bounds.minZ + 2.5;
    g.sim(2); // out of the way
    return { opened: chest.opened, spilled: g.pickups.filter((q) => !before.has(q)).length };
  });
  expect(forced.opened).toBe(true);
  expect(forced.spilled).toBe(Math.max(1, Math.floor(containers.sizes[2] / 2)));
  await page.evaluate(() => (window as unknown as W).__game.sim(0.1, true));
  await page.screenshot({ path: 'test-results/smoke-containers.png' });
  expect(errors).toEqual([]);
});

test('mana vials: loot gives an obol instead while the mage knows no spell; a vial or heart left lying at full says why, once', async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&seed=PICK2');
  type G7 = {
    warp(id: number): void;
    sim(sec: number): void;
    learn(id: string, slot: number): void;
    mana(n: number): void;
    drop(kind: string, x?: number, z?: number, opts?: { asLoot?: boolean }): void;
    pickups: { kind: string }[];
    player: { x: number; z: number; hp: number; maxHp: number };
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: G7 }).__game,
      P = g.player;
    const kinds = () => g.pickups.map((p) => p.kind);
    g.warp(1);
    g.sim(0.2);
    // no spell yet: a vial from loot arrives as an obol
    g.drop('mana', P.x + 3, P.z, { asLoot: true });
    g.sim(0.1);
    const noSpell = kinds().slice(-1)[0];
    // with a spell, loot drops the vial itself; at full mana it stays on the floor, and the mage is told why
    g.learn('arc', 0);
    g.drop('mana', P.x - 3, P.z, { asLoot: true });
    g.sim(0.6);
    const withSpell = kinds().slice(-1)[0];
    g.mana(999);
    const x = P.x;
    P.x = x - 3;
    g.sim(0.3);
    const manaHint = document.getElementById('toast')!.textContent,
      stillThere = kinds().includes('mana');
    // a heart at full health says so too
    P.x = x;
    P.hp = P.maxHp;
    g.drop('heart', P.x, P.z - 2);
    g.sim(0.6);
    P.z -= 2;
    g.sim(0.3);
    return { noSpell, withSpell, manaHint, stillThere, heartHint: document.getElementById('toast')!.textContent };
  });
  expect(r).toEqual({
    noSpell: 'coin',
    withSpell: 'mana',
    manaHint: 'Your mana is already full',
    stillThere: true,
    heartHint: 'You are already at full health',
  });
  expect(errors).toEqual([]);
});

test('picking things up shows their lore: artifacts every time, items and containers the first time in a run', async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&seed=LORE1');
  type G8 = G7 & { current: G7['current'] & { spots: { x: number; z: number; def: { name: string } }[] } };
  const card = () =>
    page.evaluate(() => ({
      on: document.getElementById('lore')!.classList.contains('on'),
      name: document.getElementById('loreName')!.textContent,
      kind: document.getElementById('loreKind')!.textContent,
      lore: document.getElementById('loreText')!.textContent.length,
    }));
  const art = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G8;
    g.warp(1);
    g.sim(0.3);
    const s = g.current.spots[0],
      name = s.def.name; // a focus taken leaves the old one on the pedestal
    g.player.x = s.x;
    g.player.z = s.z + 0.7;
    g.sim(0.3);
    return name;
  });
  expect(await card()).toMatchObject({ on: true, name: art });
  expect((await card()).lore).toBeGreaterThan(60);
  await page.screenshot({ path: 'test-results/smoke-lore.png' });
  // it fades while the game runs; an obol is described the first time, not the second
  const obol = () =>
    page.evaluate(() => {
      const g = (window as unknown as W).__game as unknown as G8;
      g.sim(12);
      g.drop('coin', g.player.x + 0.5, g.player.z + 0.8);
      g.sim(1.2);
    });
  await obol();
  expect(await card()).toMatchObject({ on: true, name: 'Grave obol', kind: 'Coin' });
  await obol();
  expect((await card()).on).toBe(false);
  expect(errors).toEqual([]);
});
