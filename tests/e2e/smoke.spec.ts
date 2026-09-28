import { expect, test, type Page } from '@playwright/test';

/* Minimal view of window.__game for the tests. */
interface Foe { x: number; z: number; spawn: number; dead?: boolean; isBoss?: boolean }
interface RoomView { type: string; cleared: boolean; locked: boolean; cx: number; cz: number; plan: { id: number; shape: string }; doors: { open: boolean }[] }
interface GameHooks {
  state: string; seed: string; floor: number; player: { x: number; z: number; hp: number; maxHp: number };
  enemies: Foe[]; current: RoomView; rooms(): RoomView[]; map(): string;
  hero: { info: string }; keys: Set<string>; arrowOrder: string[];
  warp(id: number): void; sim(sec: number, draw?: boolean): void;
}
type W = { __game: GameHooks; __manual: boolean; __fight(limit: number): number };

/** Collect console errors, open the game and press Descend. */
async function start(page: Page, query: string) {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/' + query);
  await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 30_000 });
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('title');
  expect(await page.evaluate(() => (window as unknown as W).__game.hero.info)).toContain('rigged');
  await page.click('#btnStart');
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  // a simple auto-player: line up with the nearest foe and cast at it, backing off when too close
  await page.evaluate(() => {
    const w = window as unknown as W; w.__manual = true; const g = w.__game;
    const hold = (codes: string[]) => {
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) g.keys.delete(k);
      for (const c of codes) g.keys.add(c);
      g.arrowOrder.length = 0; const a = codes.find(c => c.startsWith('Arrow')); if (a) g.arrowOrder.push(a);
    };
    w.__fight = (limit: number) => {
      let t = 0;
      for (; t < limit && g.enemies.length; t += 0.05) {
        g.player.hp = g.player.maxHp; // these tests check the loop, not survival (hits still knock the hero back)
        const p = g.player;
        // a foe killed by a bolt stays in the list, marked dead, until the next step
        const e = g.enemies.filter(f => !f.dead).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
        if (!e) { hold([]); g.sim(0.05); continue; }
        const dx = e.x - p.x, dz = e.z - p.z, codes: string[] = [];
        if (Math.hypot(dx, dz) < (e.isBoss ? 1.6 : .9)) {
          codes.push(dx > 0 ? 'KeyA' : 'KeyD', dz > 0 ? 'KeyW' : 'KeyS');
          codes.push(Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'ArrowLeft' : 'ArrowRight') : (dz < 0 ? 'ArrowUp' : 'ArrowDown'));
        } else if (Math.abs(dx) <= Math.abs(dz)) {
          if (dx > .2) codes.push('KeyD'); else if (dx < -.2) codes.push('KeyA');
          codes.push(dz < 0 ? 'ArrowUp' : 'ArrowDown');
        } else {
          if (dz > .2) codes.push('KeyS'); else if (dz < -.2) codes.push('KeyW');
          codes.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
        }
        hold(codes); g.sim(0.05);
      }
      hold([]); return t;
    };
  });
  return errors;
}

test('clear a room without console errors', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a');
  const result = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game;
    g.warp(1);
    const foes = g.enemies.length, seconds = w.__fight(60);
    g.sim(0.5, true); // let the door bars sink and render a frame
    const room = g.current;
    return { foes, seconds, left: g.enemies.length, cleared: room.cleared, locked: room.locked,
      doorsOpen: Object.values(room.doors).every(d => d.open), state: g.state };
  });
  await page.screenshot({ path: 'test-results/smoke-room.png' });
  console.log(`cleared ${result.foes} foes in ${result.seconds.toFixed(1)} s of game time`);
  expect(result).toMatchObject({ foes: 3, left: 0, cleared: true, locked: false, doorsOpen: true, state: 'play' });
  expect(errors).toEqual([]);
});

test('an artifact is taken from its pedestal and changes the mage', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=SMOKE2');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & {
      current: RoomView & { spots: { x: number; z: number; taken: boolean; def: { id: string; kind: string } }[] };
      player: { focus: string; items: string[]; x: number; z: number };
    };
    g.warp(1);
    const spot = g.current.spots[0], offered = spot.def;
    g.player.x = spot.x; g.player.z = spot.z + .5; g.sim(0.1); // walk into it
    const holds = offered.kind === 'focus' ? g.player.focus === offered.id : g.player.items.includes(offered.id);
    return { offered: offered.id, holds, icons: document.querySelectorAll('#items svg').length, banner: document.querySelector('#banner .t')!.textContent };
  });
  console.log(`took ${result.offered}`);
  expect(result.holds).toBe(true);
  expect(result.icons).toBeGreaterThanOrEqual(1);
  expect(result.banner).not.toBe('');
  expect(errors).toEqual([]);
});

test('an ordeal is fought wave by wave and rewards an artifact', async ({ page }) => {
  const errors = await start(page, '?room=ordeal_pillars');
  const result = await page.evaluate(() => {
    const w = window as unknown as W;
    const g = w.__game as GameHooks & { current: RoomView & { waves: unknown[]; wave: number; spots: unknown[] } };
    g.warp(1);
    const room = g.current, waves = room.waves.length, seen: number[] = [];
    for (let i = 0; i < 6 && !room.cleared; i++) { seen.push(room.wave); w.__fight(90); g.sim(1.2); }
    return { waves, seen: [...new Set(seen)], cleared: room.cleared, locked: room.locked, reward: room.spots.length };
  });
  expect(result.waves).toBe(2);
  expect(result.seen).toEqual([0, 1]);
  expect(result).toMatchObject({ cleared: true, locked: false, reward: 1 });
  expect(errors).toEqual([]);
});

test('a bone altar takes a heart container for its artifact', async ({ page }) => {
  const errors = await start(page, '?room=altar_bones');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & {
      current: RoomView & { spots: { x: number; z: number; taken: boolean }[] }; player: { maxHp: number; x: number; z: number };
    };
    g.warp(1);
    const spot = g.current.spots[0], before = g.player.maxHp;
    g.player.x = spot.x; g.player.z = spot.z + .6; g.sim(0.1);
    return { before, after: g.player.maxHp, taken: spot.taken };
  });
  expect(result).toMatchObject({ before: 6, after: 4, taken: true });
  expect(errors).toEqual([]);
});

test('a seeded floor is generated and the trapdoor leads down', async ({ page }) => {
  const errors = await start(page, '?seed=SMOKE1');
  const floor1 = await page.evaluate(() => {
    const g = (window as unknown as W).__game;
    return { seed: g.seed, floor: g.floor, rooms: g.rooms().length, types: g.rooms().map(r => r.type), map: g.map() };
  });
  expect(floor1.seed).toBe('SMOKE1');
  expect(floor1.floor).toBe(0);
  expect(floor1.rooms).toBeGreaterThanOrEqual(8);
  expect(floor1.rooms).toBeLessThanOrEqual(12);
  for (const t of ['start', 'boss', 'treasure', 'ordeal']) expect(floor1.types.filter(x => x === t)).toHaveLength(1);

  const boss = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game;
    g.warp(g.rooms().find(r => r.type === 'boss')!.plan.id);
    const seconds = w.__fight(180);
    g.sim(0.5);
    const spots = (g.current as RoomView & { spots: { pair?: object }[] }).spots;
    return { seconds, left: g.enemies.length, cleared: g.current.cleared, choice: spots.length, paired: spots.every(s => !!s.pair) };
  });
  console.log(`floor 1 boss beaten in ${boss.seconds.toFixed(1)} s of game time`);
  expect(boss).toMatchObject({ left: 0, cleared: true, choice: 2, paired: true });

  const floor2 = await page.evaluate(() => {
    const g = (window as unknown as W).__game, room = g.current;
    g.player.x = room.cx; g.player.z = room.cz + .3; g.sim(0.2, true); // step onto the trapdoor
    return { state: g.state, floor: g.floor, rooms: g.rooms().length, current: g.current.type };
  });
  await page.screenshot({ path: 'test-results/smoke-floor2.png' });
  expect(floor2).toMatchObject({ state: 'play', floor: 1, current: 'start' });
  expect(floor2.rooms).toBeGreaterThanOrEqual(10);
  expect(floor2.rooms).toBeLessThanOrEqual(14);
  expect(errors).toEqual([]);
});

for (const boss of ['abbess', 'pyre']) test(`the ${boss} boss dives or leaps out of reach and can be beaten`, async ({ page }) => {
  const errors = await start(page, `?room=boss_open&boss=${boss}`);
  const result = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game;
    g.warp(1);
    const foe = g.enemies.find(e => e.isBoss) as Foe & { type: string; state: string; hidden?: boolean };
    const states = new Set<string>(); let hidden = false, seconds = 0;
    for (; seconds < 240 && g.enemies.length; seconds += .25) {
      w.__fight(.25);
      states.add(foe.state); hidden ||= !!foe.hidden;
    }
    g.sim(0.5);
    const spots = (g.current as RoomView & { spots: unknown[] }).spots;
    return { type: foe.type, seconds, states: [...states], hidden, left: g.enemies.length, cleared: g.current.cleared, choice: spots.length };
  });
  console.log(`${boss} beaten in ${result.seconds.toFixed(1)} s of game time; states seen: ${result.states.join(', ')}`);
  expect(result).toMatchObject({ type: boss, hidden: true, left: 0, cleared: true, choice: 2 });
  expect(errors).toEqual([]);
});

test('the end screen sums up the run, and replays its seed', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&seed=ENDRUN&give=twin_staff,bone_lens');
  type G2 = GameHooks & { descend(): void; player: GameHooks['player'] & { invuln: number } };
  const summary = () => page.evaluate(() => ({
    shown: !document.getElementById('scrEnd')!.classList.contains('hidden'),
    title: document.getElementById('endTitle')!.textContent, floor: document.getElementById('endFloor')!.textContent,
    kills: document.getElementById('endKills')!.textContent, seed: document.getElementById('endSeed')!.textContent,
    time: document.getElementById('endTime')!.textContent, carried: document.querySelectorAll('#endItems li').length,
  }));
  // a test room ends the run as a win when the mage takes the way down
  await page.evaluate(() => { const w = window as unknown as W, g = w.__game as G2; g.warp(1); w.__fight(60); g.descend(); });
  const won = await summary();
  await page.screenshot({ path: 'test-results/smoke-end.png' });
  expect(won).toMatchObject({ shown: true, floor: '1 of 3', kills: '3', seed: 'ENDRUN', carried: 2 }); // twin staff replaced the wand
  expect(won.time).toMatch(/^\d+:\d\d$/);

  // replay: a full run on the same seed; then fall in its first fight
  await page.click('#btnReplay');
  const replay = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game as G2;
    const state = g.state, seed = g.seed;
    g.warp(g.rooms().find(r => r.type === 'normal' && !r.cleared)!.plan.id);
    for (let t = 0; t < 40 && g.state !== 'end'; t += .1) { g.player.hp = Math.min(g.player.hp, 1); g.sim(.1); }
    return { state, seed, after: g.state };
  });
  expect(replay).toEqual({ state: 'play', seed: 'ENDRUN', after: 'end' });
  const lost = await summary();
  expect(lost).toMatchObject({ shown: true, floor: '1 of 3', seed: 'ENDRUN', carried: 1 });
  expect(lost.title).not.toBe(won.title);
  expect(errors).toEqual([]);
});

test('obols, bone keys and glyph stones are picked up, and obols drift to the mage', async ({ page }) => {
  const errors = await start(page, '?seed=LOOT01');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & {
      player: GameHooks['player'] & { coins: number; keys: number; glyphs: number }; pickups: unknown[];
      drop(kind: string, x?: number, z?: number): void;
    };
    const p = g.player, start = { coins: p.coins, keys: p.keys, glyphs: p.glyphs };
    g.drop('coin', p.x + 1.4, p.z); g.sim(1.5);            // out of reach, but it drifts over
    const drifted = p.coins - start.coins;
    g.drop('key', p.x, p.z); g.drop('glyph', p.x, p.z); g.drop('purse', p.x, p.z); g.drop('heart', p.x, p.z); g.sim(1);
    return { start, coins: p.coins, keys: p.keys, glyphs: p.glyphs, drifted, left: g.pickups.length, hud: document.getElementById('purse')!.textContent };
  });
  expect(result.start).toEqual({ coins: 0, keys: 0, glyphs: 1 });
  expect(result).toMatchObject({ drifted: 1, coins: 6, keys: 1, glyphs: 2, left: 1, hud: '060102' }); // the heart waits: health is full
  expect(errors).toEqual([]);
});

test('a blast glyph flares, hurts foes and the mage, breaks rocks, and bolts set glyphs off', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&loot=glyphs:4');
  type Rock = { x: number; z: number; breakable: boolean };
  type G3 = GameHooks & {
    player: GameHooks['player'] & { glyphs: number; invuln: number; vx: number; vz: number };
    glyphs: { x: number; z: number }[]; current: RoomView & { rocks: Rock[] };
  };
  // 1. a glyph by a rock, a rotling on top of it and the mage beside it: the fuse runs out
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G3; g.warp(1); g.sim(.8);
    const rock = g.current.rocks.find(r => r.breakable)!;
    g.player.x = rock.x; g.player.z = rock.z + 1; g.player.invuln = 0;
  });
  await page.keyboard.press('Space');
  const fused = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G3, p = g.player;
    g.sim(.05);
    const placed = g.glyphs.length, left = p.glyphs, rocks = g.current.rocks.length, hp = p.hp;
    const foe = g.enemies[0]; foe.x = p.x + .6; foe.z = p.z;
    let t = 0; for (; t < 3 && g.glyphs.length; t += .05) { foe.x = p.x + .6; foe.z = p.z; p.vx = p.vz = 0; g.sim(.05); }
    return { placed, left, t, rocksBroken: rocks - g.current.rocks.length, hpLost: hp - p.hp, pinnedFell: !g.enemies.includes(foe) };
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
    await page.evaluate(({ fx, fz, dx }) => { const g = (window as unknown as W).__game as unknown as G3; g.player.x = fx + dx; g.player.z = fz; g.sim(.4); }, { ...shot, dx });
    await page.keyboard.press('Space');
  }
  const chained = await page.evaluate(({ fx, fz }) => {
    const g = (window as unknown as W).__game as unknown as G3, p = g.player;
    g.sim(.05); const placed = g.glyphs.length;
    p.x = fx - 3.5; p.z = fz; p.invuln = 0; const hp = p.hp;
    g.keys.add('ArrowRight'); g.arrowOrder.push('ArrowRight');
    let t = 0; for (; t < 1 && g.glyphs.length; t += .05) g.sim(.05);
    g.keys.delete('ArrowRight'); g.arrowOrder.length = 0;
    return { placed, t, left: g.glyphs.length, hpLost: hp - p.hp };
  }, shot);
  expect(chained).toMatchObject({ placed: 2, left: 0, hpLost: 0 });
  expect(chained.t).toBeLessThan(.8); // well before the 1.5 s fuse
  await page.evaluate(() => (window as unknown as W).__game.sim(.1, true));
  await page.screenshot({ path: 'test-results/smoke-glyph.png' });
  expect(errors).toEqual([]);
});

test('urns break to bolts, sealed urns only to a blast; coffers open, warded chests take a key or burn', async ({ page }) => {
  const errors = await start(page, '?room=crypt_c&loot=glyphs:4,keys:1&seed=URNS01');
  type Rock = { x: number; z: number; urn?: 'plain' | 'sealed' };
  type Pick = { kind: string; x: number; z: number; opened?: boolean; contents?: unknown[] };
  type G4 = GameHooks & {
    player: GameHooks['player'] & { keys: number; glyphs: number; invuln: number; vx: number; vz: number };
    current: RoomView & { rocks: Rock[]; bounds: { minX: number; minZ: number } }; pickups: Pick[];
    clearRoom(): void; drop(kind: string, x: number, z: number): void;
  };
  const urns = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game as unknown as G4;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + .5, z: g.current.bounds.minZ + r + .5 });
    g.warp(1); g.clearRoom(); g.player.invuln = 99;
    const count = (k: string) => g.current.rocks.filter(r => r.urn === k).length;
    const before = { plain: count('plain'), sealed: count('sealed') };
    for (const row of [0, 6]) { // cast east along the top and bottom rows, at the urns in the corners
      const p = at(7, row); g.player.x = p.x; g.player.z = p.z; g.player.vx = g.player.vz = 0;
      g.keys.add('ArrowRight'); g.arrowOrder.push('ArrowRight'); g.sim(1.6);
      g.keys.delete('ArrowRight'); g.arrowOrder.length = 0; g.sim(.8);
    }
    const p = at(11, 0); g.player.x = p.x; g.player.z = p.z; // beside the sealed urn, to chalk a glyph
    return { before, after: { plain: count('plain'), sealed: count('sealed') } };
  });
  expect(urns.before).toEqual({ plain: 3, sealed: 1 });
  expect(urns.after).toEqual({ plain: 0, sealed: 1 }); // bolts glance off the ward
  await page.keyboard.press('Space');
  const sealed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G4;
    const spot = { x: g.current.bounds.minX + 12.5, z: g.current.bounds.minZ + .5 };
    g.sim(.05); g.player.x -= 4; g.player.z += 2; g.sim(2);
    return { left: g.current.rocks.filter(r => r.urn).length, rose: g.pickups.filter(q => Math.hypot(q.x - spot.x, q.z - spot.z) < .1).length };
  });
  expect(sealed).toEqual({ left: 0, rose: 1 }); // a sealed urn always holds something

  const containers = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G4, P = g.player;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + .5, z: g.current.bounds.minZ + r + .5 });
    const spots = [at(2, 4), at(6, 4), at(10, 4)];
    g.drop('coffer', spots[0].x, spots[0].z); g.drop('chest', spots[1].x, spots[1].z); g.drop('chest', spots[2].x, spots[2].z); g.sim(.8);
    const [coffer, chestA, chestB] = g.pickups.slice(-3);
    const sizes = [coffer, chestA, chestB].map(c => c.contents!.length);
    // what a container spilled: pickups that weren't there before (the mage may pick up others meanwhile)
    const spilledBy = (act: () => void) => { const before = new Set(g.pickups); act(); return g.pickups.filter(q => !before.has(q)).length; };
    const walkTo = (c: Pick) => { P.x = c.x; P.z = c.z + .2; g.sim(.3); };
    const cofferSpilled = spilledBy(() => walkTo(coffer));
    const keys = P.keys, chestSpilled = spilledBy(() => walkTo(chestA));
    walkTo(chestB); const refused = !chestB.opened, toast = document.getElementById('toast')!.textContent;
    P.x = chestB.x - .8; P.z = chestB.z;
    return { sizes, cofferSpilled, chestSpilled, keysSpent: keys - P.keys, refused, toast };
  });
  expect(containers.cofferSpilled).toBe(containers.sizes[0]);
  expect(containers.chestSpilled).toBe(containers.sizes[1]);
  expect(containers).toMatchObject({ keysSpent: 1, refused: true });
  expect(containers.toast).toMatch(/bone key/);
  await page.keyboard.press('Space'); // a glyph beside the second chest: its ward breaks, half burns
  const forced = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G4, P = g.player, chest = g.pickups.filter(q => q.kind === 'chest')[1];
    const before = new Set(g.pickups);
    g.sim(.05); P.x = g.current.bounds.minX + 2.5; P.z = g.current.bounds.minZ + 2.5; g.sim(2); // out of the way
    return { opened: chest.opened, spilled: g.pickups.filter(q => !before.has(q)).length };
  });
  expect(forced.opened).toBe(true);
  expect(forced.spilled).toBe(Math.max(1, Math.floor(containers.sizes[2] / 2)));
  await page.evaluate(() => (window as unknown as W).__game.sim(.1, true));
  await page.screenshot({ path: 'test-results/smoke-containers.png' });
  expect(errors).toEqual([]);
});

/* M2 step 3: the merchant and the locked vault. */
type Ware = { ware: string; price: number; x: number; z: number; sold: boolean; def?: { id: string } };
type Seal = { sealed: boolean; blasts: number };
type G5 = Omit<GameHooks, 'current' | 'enemies'> & {
  player: GameHooks['player'] & { coins: number; keys: number; glyphs: number; items: string[]; focus: string; invuln: number; vx: number; vz: number };
  current: Omit<RoomView, 'doors'> & { wares?: Ware[]; warden?: boolean; spots: { taken: boolean }[]; doors: { x: number; z: number; open: boolean; seal?: Seal }[] };
  bolts: { dist: number }[]; glyphs: unknown[]; enemies: (Foe & { champion?: boolean })[]; clearRoom(): void; loot(v: Record<string, number>): void;
};

test('the merchant sells for obols and refuses what the mage cannot pay or use; his shop is warded', async ({ page }) => {
  const errors = await start(page, '?room=merchant_plain&seed=SHOP01&loot=coins:18');
  const shop = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5, P = g.player;
    g.warp(1); g.sim(.5);
    const walkInto = (w: Ware) => { P.x = w.x; P.z = w.z + 1.6; P.vx = P.vz = 0; g.keys.add('KeyW'); g.sim(.6); g.keys.delete('KeyW'); g.sim(.2); P.z += 1.6; g.sim(.1); };
    const wares = g.current.wares!, art = wares.find(w => w.ware === 'artifact')!, heart = wares.find(w => w.ware === 'heart');
    const coins = P.coins, items = P.items.length + (P.focus !== 'apprentice_wand' ? 1 : 0);
    walkInto(art);
    const bought = { spent: coins - P.coins, sold: art.sold || art.price === 0, gained: P.items.length + (P.focus !== 'apprentice_wand' ? 1 : 0) - items };
    let refused = null;
    if (heart) { const c = P.coins; walkInto(heart); refused = { spent: c - P.coins, sold: heart.sold, toast: document.getElementById('toast')!.textContent }; }
    // bolts fizzle just after leaving the mage
    P.x = g.current.cx - 4; P.z = g.current.cz + 2.5; let far = 0;
    g.keys.add('ArrowRight'); g.arrowOrder.push('ArrowRight');
    for (let t = 0; t < 1; t += .05) { g.sim(.05); far = Math.max(far, ...g.bolts.map(b => b.dist)); }
    g.keys.delete('ArrowRight'); g.arrowOrder.length = 0; g.sim(.3);
    return { count: wares.length, first: wares[0].ware, price: art.price, bought, refused, far, glyphs: P.glyphs };
  });
  expect(shop.count).toBeGreaterThanOrEqual(3);
  expect(shop.first).toBe('artifact'); // the budget reaches the merchant in a test room
  expect(shop.bought).toEqual({ spent: 15, sold: true, gained: 1 });
  if (shop.refused) expect(shop.refused).toMatchObject({ spent: 0, sold: false, toast: expect.stringMatching(/whole/) }); // a heart at full health
  expect(shop.far).toBeLessThan(1);
  await page.keyboard.press('Space'); // the chalk won't take in the shop, and no glyph is spent
  const glyph = await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G5; g.sim(.1); return { glyphs: g.player.glyphs, onFloor: g.glyphs.length }; });
  expect(glyph).toEqual({ glyphs: shop.glyphs, onFloor: 0 });
  await page.evaluate(() => (window as unknown as W).__game.sim(.1, true));
  await page.screenshot({ path: 'test-results/smoke-merchant.png' });
  expect(errors).toEqual([]);
});

test('a gilded reliquary shrugs off a blast, and a bone key finds a relic beyond the budget', async ({ page }) => {
  const errors = await start(page, '?room=crypt_c&seed=GILD01&loot=keys:1,glyphs:1');
  type G6 = Omit<G5, 'current'> & { current: G5['current'] & { spots: { taken: boolean }[] }; pickups: { gilded?: boolean; opened?: boolean; x: number; z: number }[]; drop(k: string, x: number, z: number, o?: { gilded?: boolean }): void };
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6, P = g.player;
    g.warp(1); g.clearRoom(); P.invuln = 99; P.x = g.current.cx; P.z = g.current.cz;
    g.drop('chest', P.x + 2, P.z, { gilded: true }); g.sim(.8); P.x += .85; // beside it, not touching
  });
  await page.keyboard.press('Space');
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6, P = g.player, c = g.pickups.find(q => q.gilded)!;
    g.sim(.05); P.x -= 3; g.sim(2);
    const afterBlast = !!c.opened, spots = g.current.spots.length;
    P.x = c.x; P.z = c.z + .3; g.sim(.5);
    return { afterBlast, opened: !!c.opened, keys: P.keys, relics: g.current.spots.length - spots };
  });
  expect(r).toEqual({ afterBlast: false, opened: true, keys: 0, relics: 1 });
  expect(errors).toEqual([]);
});

/** Walk from the start room into the test vault's sealed door; returns the seal and the door. */
const walkToVault = () => {
  const g = (window as unknown as W).__game as unknown as G5, P = g.player, d = g.current.doors.find(x => x.seal)!;
  P.x = d.x; P.z = d.z + 2; P.vx = P.vz = 0; g.sim(.2);
  g.keys.add('KeyW'); g.sim(.8); g.keys.delete('KeyW'); g.sim(.2);
  return { sealed: d.seal!.sealed, open: d.open, keys: P.keys, toast: document.getElementById('toast')!.textContent };
};

test('a locked vault stays shut without a key, and a bone key unbinds it', async ({ page }) => {
  const errors = await start(page, '?room=vault_urns&seed=VAULT1');
  const shut = await page.evaluate(walkToVault);
  expect(shut).toMatchObject({ sealed: true, open: false, keys: 0, toast: expect.stringMatching(/bone key/) });
  await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G5; g.loot({ keys: 1 }); g.player.z += 2; g.sim(.3); });
  const unbound = await page.evaluate(walkToVault);
  expect(unbound).toMatchObject({ sealed: false, open: true, keys: 0 });
  const inside = await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G5; g.sim(1); return { type: g.current.type, locked: g.current.locked, spots: g.current.spots.length }; });
  expect(inside).toEqual({ type: 'vault', locked: false, spots: 1 }); // the prize, unguarded
  expect(errors).toEqual([]);
});

test('two glyph blasts force a vault, and its warden guards the prize', async ({ page }) => {
  const errors = await start(page, '?room=vault_urns&seed=VAULT2&loot=glyphs:2');
  const blasts: Seal[] = [];
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G5, d = g.current.doors.find(x => x.seal)!; g.player.x = d.x; g.player.z = d.z + .5; g.player.invuln = 99; });
    await page.keyboard.press('Space');
    blasts.push(await page.evaluate(() => {
      const g = (window as unknown as W).__game as unknown as G5, d = g.current.doors.find(x => x.seal)!;
      g.sim(.05); g.player.z += 3; g.sim(1.8); return { sealed: d.seal!.sealed, blasts: d.seal!.blasts };
    }));
  }
  expect(blasts).toEqual([{ sealed: true, blasts: 1 }, { sealed: false, blasts: 2 }]);
  const inside = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5, P = g.player, d = g.current.doors.find(x => x.seal)!;
    P.x = d.x; P.z = d.z + .8; P.invuln = 99; g.keys.add('KeyW'); g.sim(1.4); g.keys.delete('KeyW'); g.sim(.4);
    const guarded = { warden: !!g.current.warden, locked: g.current.locked, champions: g.enemies.filter(e => !e.dead && e.champion).length, untaken: g.current.spots.filter(s => !s.taken).length };
    g.clearRoom(); g.sim(.5);
    return { guarded, after: { locked: g.current.locked, doorOpen: g.current.doors[0].open } };
  });
  expect(inside.guarded).toEqual({ warden: true, locked: true, champions: 1, untaken: 1 }); // the prize waits for the fight
  expect(inside.after).toEqual({ locked: false, doorOpen: true });
  await page.evaluate(() => (window as unknown as W).__game.sim(.1, true));
  expect(errors).toEqual([]);
});

test('the dev menu opens on its key, pauses the game, and hands out what it lists', async ({ page }) => {
  const errors = await start(page, '?seed=DEVM01');
  await expect(page.locator('#devHint')).toContainText('F2'); // the key is shown on the HUD during play-tests
  await page.keyboard.press('Backquote');
  await expect(page.locator('#dev')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('pause');
  const click = (text: string) => page.locator('#dev button', { hasText: text }).first().click();
  await click('+10 obols'); await click('+5 keys'); await click('Ember Sigil'); await click('God mode'); await click('Gilded chest');
  const got = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5 & { pickups: { gilded?: boolean }[] };
    return { coins: g.player.coins, keys: g.player.keys, items: g.player.items, gilded: g.pickups.filter(q => q.gilded).length };
  });
  expect(got).toEqual({ coins: 10, keys: 5, items: ['ember_sigil'], gilded: 1 });
  await page.keyboard.press('Escape'); // closes the menu (not the pause screen) and the game goes on
  await expect(page.locator('#dev')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  // a boss fight from the menu keeps what the mage carries
  await page.keyboard.press('F2'); await click('The Pyre Knight');
  const boss = await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G5 & { run: { boss: string } }; return { boss: g.run.boss, items: g.player.items, coins: g.player.coins, rooms: g.rooms().length }; });
  expect(boss).toEqual({ boss: 'pyre', items: ['ember_sigil'], coins: 10, rooms: 2 });
  expect(errors).toEqual([]);
});

test('every door of a seeded floor leads to its neighbour, onto open floor', async ({ page }) => {
  const errors = await start(page, '?seed=DOORS1&floor=2&loot=keys:9'); // keys unbind a vault's ward on the way
  const result = await page.evaluate(() => {
    type D = { side: 'n' | 's' | 'e' | 'w'; x: number; z: number; nb: unknown; open: boolean };
    type R = Omit<RoomView, 'doors'> & { doors: D[]; bounds: { minX: number; minZ: number }; mask: boolean[][] };
    const g = (window as unknown as W).__game as unknown as {
      rooms(): R[]; current: R; warp(id: number): void; clearRoom(): void; sim(sec: number): void; keys: Set<string>;
      player: { x: number; z: number; vx: number; vz: number; invuln: number }; camera: { zoom: number };
    };
    const HALLS = ['long', 'tall', 'great', 'l_shape'];
    const KEY: Record<D['side'], string> = { n: 'KeyW', s: 'KeyS', e: 'KeyD', w: 'KeyA' };
    const DIR: Record<D['side'], number[]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    const fails: string[] = []; let walked = 0; const shapes = new Set<string>();
    for (const room of g.rooms()) for (const d of room.doors) {
      g.warp(room.plan.id); g.clearRoom(); g.player.invuln = 99;
      const [dx, dz] = DIR[d.side];
      g.player.x = d.x - dx * 1.2; g.player.z = d.z - dz * 1.2; g.player.vx = g.player.vz = 0;
      g.keys.add(KEY[d.side]);
      for (let t = 0; g.current === room && t < 2; t += .05) g.sim(.05);
      g.keys.delete(KEY[d.side]); g.sim(.3);
      walked++; shapes.add(room.plan.shape);
      const nb = g.current, c = Math.floor(g.player.x - nb.bounds.minX), r = Math.floor(g.player.z - nb.bounds.minZ);
      if (nb !== d.nb || nb.mask[r]?.[c] !== true) fails.push(`room ${room.plan.id} (${room.plan.shape}) door ${d.side}`);
      // the camera is pulled back in larger halls only
      if ((g.camera.zoom < 1) !== HALLS.includes(nb.plan.shape)) fails.push(`zoom ${g.camera.zoom} in room ${nb.plan.id} (${nb.plan.shape})`);
    }
    return { walked, shapes: shapes.size, fails };
  });
  console.log(`walked through ${result.walked} doors in rooms of ${result.shapes} shapes`);
  expect(result.walked).toBeGreaterThan(20);
  expect(result.fails).toEqual([]);
  expect(errors).toEqual([]);
});

test('room variants: ambush, champion, dark and quiet', async ({ page }) => {
  const errors = await start(page, '?room=crypt_b&variant=ambush');
  const result = await page.evaluate(() => {
    type E = { champion?: boolean; type: string; maxHp: number; x: number; z: number };
    type Rm = { locked: boolean; ambush?: string; torches: { lit: boolean }[] };
    const g = (window as unknown as W).__game as unknown as {
      startGame(o: object): void; warp(id: number): void; sim(s: number): void; keys: Set<string>;
      enemies: E[]; current: Rm; player: { x: number; z: number; invuln: number };
      lightLevels(): { hemi: number; torches: number[] };
    };
    // ambush: an empty, open room until the mage walks into the middle
    g.warp(1); g.sim(.5);
    const armed = { foes: g.enemies.length, locked: g.current.locked };
    g.keys.add('KeyW'); for (let t = 0; g.current.ambush === 'armed' && t < 3; t += .05) g.sim(.05); g.keys.delete('KeyW');
    const sprung = { foes: g.enemies.length, locked: g.current.locked, nearest: Math.min(...g.enemies.map(e => Math.hypot(e.x - g.player.x, e.z - g.player.z))) };
    // champion: one enemy with double health
    g.startGame({ testTemplate: 'crypt_b', testVariant: 'champion' }); g.warp(1); g.sim(.2);
    const champ = g.enemies.filter(e => e.champion), peer = g.enemies.find(e => !e.champion && e.type === champ[0]?.type);
    // dark: torches out, the fill light low
    g.startGame({ testTemplate: 'crypt_b', testVariant: 'dark' }); g.warp(1); g.sim(2);
    const light = g.lightLevels();
    // quiet: at most two weak enemies
    g.startGame({ testTemplate: 'crypt_c', testVariant: 'quiet' }); g.warp(1); g.sim(.2);
    return { armed, sprung, champions: champ.length, hpRatio: champ[0].maxHp / peer!.maxHp, lit: g.current.torches.length,
      darkTorches: light.torches.reduce((a, b) => a + b, 0), hemi: light.hemi, quiet: g.enemies.map(e => e.type) };
  });
  expect(result.armed).toEqual({ foes: 0, locked: false });
  expect(result.sprung.foes).toBeGreaterThan(0);
  expect(result.sprung.locked).toBe(true);
  expect(result.sprung.nearest).toBeGreaterThan(2);
  expect(result.champions).toBe(1);
  expect(result.hpRatio).toBeCloseTo(2);
  expect(result.darkTorches).toBe(0);
  expect(result.hemi).toBeLessThan(.6);
  expect(result.quiet.length).toBeLessThanOrEqual(2);
  expect(result.quiet.every(t => t === 'rotling' || t === 'wisp')).toBe(true);
  expect(errors).toEqual([]);
});
