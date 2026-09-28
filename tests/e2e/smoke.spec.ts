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
      current: RoomView & { spots: { x: number; z: number; taken: boolean; def: { stats?: { hearts?: number } } }[] }; player: { maxHp: number; x: number; z: number };
    };
    g.warp(1);
    const spot = g.current.spots[0], before = g.player.maxHp, gift = (spot.def.stats?.hearts ?? 0) * 2; // the Leaden Heart gives two back
    g.player.x = spot.x; g.player.z = spot.z + .6; g.sim(0.1);
    return { before, after: g.player.maxHp - gift, taken: spot.taken };
  });
  expect(result).toMatchObject({ before: 6, after: 4, taken: true }); // a container paid
  expect(errors).toEqual([]);
});

test('a seeded floor is generated and the trapdoor leads down', async ({ page }) => {
  const errors = await start(page, '?seed=SMOKE1');
  const floor1 = await page.evaluate(() => {
    const g = (window as unknown as W).__game;
    return { seed: g.seed, floor: g.floor, rooms: g.rooms().filter(r => r.type !== 'secret').length, types: g.rooms().map(r => r.type), map: g.map() };
  });
  expect(floor1.seed).toBe('SMOKE1');
  expect(floor1.floor).toBe(0);
  expect(floor1.rooms).toBeGreaterThanOrEqual(10); // M3's counts (data/floors.json), the secret room on top
  expect(floor1.rooms).toBeLessThanOrEqual(14);
  for (const t of ['start', 'boss', 'treasure', 'ordeal', 'merchant', 'library', 'secret']) expect(floor1.types.filter(x => x === t)).toHaveLength(1);

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
    return { state: g.state, floor: g.floor, rooms: g.rooms().filter(r => r.type !== 'secret').length, current: g.current.type, shrines: g.rooms().filter(r => r.type === 'shrine').length };
  });
  await page.screenshot({ path: 'test-results/smoke-floor2.png' });
  expect(floor2).toMatchObject({ state: 'play', floor: 1, current: 'start', shrines: 1 }); // the shrine is on floor 2
  expect(floor2.rooms).toBeGreaterThanOrEqual(13);
  expect(floor2.rooms).toBeLessThanOrEqual(17);
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
  type G2 = GameHooks & { descend(): void; drop(kind: string, x?: number, z?: number): void; player: GameHooks['player'] & { invuln: number } };
  const summary = () => page.evaluate(() => ({
    shown: !document.getElementById('scrEnd')!.classList.contains('hidden'),
    title: document.getElementById('endTitle')!.textContent, floor: document.getElementById('endFloor')!.textContent,
    kills: document.getElementById('endKills')!.textContent, seed: document.getElementById('endSeed')!.textContent,
    time: document.getElementById('endTime')!.textContent, carried: document.querySelectorAll('#endItems li').length,
    obols: Number(document.getElementById('endObols')!.textContent),
  }));
  // a test room ends the run as a win when the mage takes the way down
  await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game as G2; g.warp(1); w.__fight(60);
    g.drop('purse', g.player.x, g.player.z + .3); g.sim(1); // obols found count towards the summary
    g.descend();
  });
  const won = await summary();
  expect(won.obols).toBeGreaterThanOrEqual(5);
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

test('a cracked wall rings hollow to a bolt, a glyph breaks it open, and the secret room appears', async ({ page }) => {
  const errors = await start(page, '?room=secret_cell&seed=SEC01&loot=glyphs:1');
  type D = { x: number; z: number; open: boolean; secret?: { open: boolean; divined: boolean } };
  type G7 = Omit<G5, 'current' | 'rooms'> & { current: Omit<G5['current'], 'doors'> & { doors: D[] }; rooms(): (RoomView & { known: boolean; found?: boolean })[] };
  const before = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7, P = g.player, d = g.current.doors.find(x => x.secret)!;
    const hidden = { known: g.rooms()[1].known, open: d.open };
    P.x = d.x; P.z = d.z + 3; g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(.8); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0; g.sim(.5);
    const rang = { divined: d.secret!.divined, open: d.secret!.open };
    P.x = d.x; P.z = d.z + .6; P.invuln = 99;
    return { hidden, rang };
  });
  expect(before).toEqual({ hidden: { known: false, open: false }, rang: { divined: true, open: false } }); // bolts don't break it
  await page.keyboard.press('Space');
  const after = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7, P = g.player, d = g.current.doors.find(x => x.secret)!;
    g.sim(.05); P.z += 3; g.sim(2);
    const opened = { open: d.open, found: !!g.rooms()[1].found, known: g.rooms()[1].known };
    P.x = d.x; P.z = d.z + 1; g.keys.add('KeyW'); g.sim(1.2); g.keys.delete('KeyW'); g.sim(.5);
    return { opened, inside: g.current.type };
  });
  expect(after).toEqual({ opened: { open: true, found: true, known: true }, inside: 'secret' });
  await page.evaluate(() => (window as unknown as W).__game.sim(.1, true));
  await page.screenshot({ path: 'test-results/smoke-secret.png' });
  expect(errors).toEqual([]);
});

test('new artifacts: the censer fans three bolts, the moth stings foes, and the skull circles the mage', async ({ page }) => {
  const errors = await start(page, '?room=crypt_b&seed=ART01&give=mourners_censer,candle_moth,weeping_skull');
  const r = await page.evaluate(() => {
    type B = { secondary: boolean; vx: number; vz: number };
    const g = (window as unknown as W).__game as unknown as Omit<G5, 'bolts' | 'enemies'> & { bolts: B[]; enemies: { hp: number; dead?: boolean }[] };
    g.warp(1); g.sim(.8); g.player.x = g.current.cx; g.player.z = g.current.cz + 2;
    g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(.05); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0;
    const cast = g.bolts.filter(b => !b.secondary);
    const angles = cast.map(b => Math.round(Math.atan2(b.vx, -b.vz) * 100) / 100);
    let stings = 0; const hp0 = g.enemies.reduce((a, e) => a + e.hp, 0);
    for (let t = 0; t < 5; t += .1) { g.player.invuln = 99; g.sim(.1); stings = Math.max(stings, g.bolts.filter(b => b.secondary).length); }
    return { cast: cast.length, fanned: new Set(angles).size, stings, hurt: hp0 > g.enemies.filter(e => !e.dead).reduce((a, e) => a + e.hp, 0) };
  });
  expect(r).toEqual({ cast: 3, fanned: 3, stings: expect.any(Number), hurt: true });
  expect(r.stings).toBeGreaterThan(0); // the moth's lesser bolts
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-new-artifacts.png' });
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

/* M2 step 5: the shrine. */
type Rite = { id: string; x: number; z: number; hits: number; t: number; inside: boolean; fleeing: boolean } | null;
type G6 = G5 & {
  rite: Rite; player: G5['player'] & { cleansed: string[]; stats: { damage: number; speed: number; effects: Set<string> } };
  current: G5['current'] & { shrine: { stones: { id: string; x: number; z: number }[] } };
};

test('the shrine cleanses a curse put down inside its circle, refuses the poor, and lets a curse escape in time', async ({ page }) => {
  const errors = await start(page, '?room=shrine_henge&seed=SHRN01&give=mask_of_the_drowned,chain_of_the_penitent&loot=coins:14');
  const entered = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6; g.warp(1); g.sim(.5);
    return { type: g.current.type, stones: g.current.shrine.stones.map(s => s.id), banner: document.querySelector('#banner .t')!.textContent };
  });
  expect(entered).toEqual({ type: 'shrine', stones: ['mask_of_the_drowned', 'chain_of_the_penitent'], banner: 'A shrine' });
  // walk into the mask's stone: its curse comes out as a wisp; a bot keeps level with it south of the circle
  // and casts north whenever it's inside
  const cleansed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6, P = g.player, r = g.current, K = g.keys, s = r.shrine.stones[0];
    P.x = s.x + 1.2; P.z = s.z; K.add('KeyA'); g.sim(.6); K.delete('KeyA');
    const began = g.rite?.id;
    P.invuln = 999; let t = 0;
    for (; g.rite && !g.rite.fleeing && t < 11; t += 1 / 60) {
      const w = g.rite;
      for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowUp']) K.delete(k); g.arrowOrder.length = 0;
      if (w.x < P.x - .15) K.add('KeyA'); else if (w.x > P.x + .15) K.add('KeyD');
      if (P.z < r.cz + 2.5) K.add('KeyS'); else if (P.z > r.cz + 2.9) K.add('KeyW');
      if (w.inside && Math.abs(w.x - P.x) < .3) { K.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); }
      g.sim(1 / 60);
    }
    for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowUp']) K.delete(k); g.arrowOrder.length = 0; g.sim(.5);
    return {
      began, seconds: t, rite: g.rite, coins: P.coins, cleansed: P.cleansed, dark: P.stats.effects.has('vision'), damage: P.stats.damage,
      stones: r.shrine.stones.map(q => q.id), icon: document.querySelector('#items svg.cleansed title')?.textContent,
    };
  });
  console.log(`curse put down in ${cleansed.seconds.toFixed(1)} s`);
  expect(cleansed).toMatchObject({ began: 'mask_of_the_drowned', rite: null, coins: 4, cleansed: ['mask_of_the_drowned'], dark: false, stones: ['chain_of_the_penitent'] });
  expect(cleansed.damage).toBeCloseTo(3.5 * 1.5); // the gift halved: ×1.5 instead of ×2
  expect(cleansed.icon).toContain('half again');
  await page.evaluate(() => (window as unknown as W).__game.sim(.1, true));
  await page.screenshot({ path: 'test-results/smoke-shrine.png' });
  // too few obols: the shrine refuses; with enough, a curse left alone slips back into its stone
  const later = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6, P = g.player, r = g.current, s = r.shrine.stones[0];
    const walkInto = () => { P.x = s.x + 1.2; P.z = s.z; P.vx = P.vz = 0; g.keys.add('KeyA'); g.sim(.7); g.keys.delete('KeyA'); g.sim(.1); P.x += 1.2; g.sim(.05); }; // and step back, so the stone is ready again
    walkInto();
    const refused = { rite: g.rite, toast: document.getElementById('toast')!.textContent };
    g.loot({ coins: 10 }); walkInto();
    const began = g.rite?.id;
    P.x = r.cx; P.z = r.cz + 2.8; g.sim(10.8);
    return { refused, began, rite: g.rite, coins: P.coins, cleansed: P.cleansed, speed: P.stats.speed, toast: document.getElementById('toast')!.textContent };
  });
  expect(later.refused).toEqual({ rite: null, toast: expect.stringMatching(/asks 10 obols/) });
  expect(later).toMatchObject({ began: 'chain_of_the_penitent', rite: null, coins: 14, cleansed: ['mask_of_the_drowned'], toast: expect.stringMatching(/slips back/) });
  expect(later.speed).toBeCloseTo(4.3 * .75); // still cursed
  expect(errors).toEqual([]);
});

/* M3: magic. */
type G9 = Omit<GameHooks, 'enemies'> & {
  enemies: (Foe & { hp: number; lastHit?: string })[];
  player: GameHooks['player'] & { mana: number; spells: (string | null)[]; spellCd: number[]; stats: { maxMana: number } };
  cast(slot: number, aim?: { x: number; z: number }): boolean; mana(v?: number): number; learn(id: string, slot?: number): string | null;
  drop(kind: string, x?: number, z?: number): void;
};

test('spells: Arc strikes and leaps for mana, a cooldown holds it back, and the dead give mana back', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&seed=MAG1&spells=arc');
  await expect(page.locator('#scrTitle .controls')).toContainText('Q and E');
  const arc = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G9, P = g.player; g.warp(1); g.sim(1);
    const hp = g.enemies.reduce((s, e) => s + e.hp, 0), mana = P.mana;
    const cast = g.cast(0, { x: 0, z: -1 }), struck = g.enemies.filter(e => e.lastHit === 'spell').length;
    const again = g.cast(0); // still cooling down
    return { spells: P.spells, cast, again, spent: mana - P.mana, struck, damage: hp - g.enemies.reduce((s, e) => s + e.hp, 0), cd: P.spellCd[0] };
  });
  expect(arc).toMatchObject({ spells: ['arc', null], cast: true, again: false });
  expect(arc.spent).toBeCloseTo(15, 0);
  expect(arc.struck).toBeGreaterThanOrEqual(2); // it leaps
  expect(arc.damage).toBeGreaterThan(9);
  expect(arc.cd).toBeGreaterThan(.9);
  // the cantrip's kills give mana back; a cast with too little mana is refused
  const back = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game as unknown as G9, P = g.player;
    g.mana(10); const refused = !g.cast(0);
    g.mana(40); w.__fight(40);
    return { refused, mana: P.mana, left: g.enemies.length };
  });
  expect(back).toMatchObject({ refused: true, left: 0 });
  expect(back.mana).toBeGreaterThan(40 + 3); // at least one kill's worth, beyond regeneration in the fight
  // a mana vial is left lying at full mana, and taken when mana is short
  const vial = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G9 & { pickups: { kind: string; x: number; z: number }[] }, P = g.player;
    g.mana(999); const full = P.mana; // as full as it goes
    g.drop('mana', g.player.x, g.player.z + .3); g.sim(1); const lying = g.pickups.filter(q => q.kind === 'mana').length;
    const q = g.pickups.find(x => x.kind === 'mana')!; // nudged away while refused: step onto it
    g.mana(20); P.x = q.x; P.z = q.z; g.sim(.3);
    return { full, max: P.stats.maxMana, lying, after: P.mana, left: g.pickups.filter(q => q.kind === 'mana').length };
  });
  expect(vial).toMatchObject({ lying: 1, left: 0 });
  expect(vial.full).toBe(vial.max);
  expect(vial.after).toBeGreaterThanOrEqual(45);
  await page.evaluate(() => (window as unknown as W).__game.sim(.1, true));
  await page.screenshot({ path: 'test-results/smoke-spells.png' });
  expect(errors).toEqual([]);
});

type Status = { burn: number; chill: number; frozen: number; shock: number; stun: number };
type G10 = Omit<G9, 'enemies'> & {
  enemies: (Foe & { hp: number; maxHp: number; type: string; status?: Status; label?: { userData: { text: string } } })[];
  spawn(kind: string, x?: number, z?: number): { hp: number; x: number; z: number; status?: Status; type: string };
  inflict(status: Record<string, number>): void;
};

test('statuses: chill freezes and stops a foe, Shatter and Overload go off, bosses never freeze, the dummy never falls', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=STAT1&spells=arc');
  const frozen = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10, P = g.player; g.warp(1); g.sim(.3);
    const foe = g.spawn('rotling', P.x, P.z - 3); g.sim(.8);
    for (let i = 0; i < 3; i++) g.inflict({ chill: 1 });
    const at = { x: foe.x, z: foe.z }, hp = P.hp; g.sim(1);
    return { frozen: (foe.status?.frozen ?? 0) > 0, moved: Math.hypot(foe.x - at.x, foe.z - at.z), hurt: hp - P.hp };
  });
  expect(frozen).toEqual({ frozen: true, moved: 0, hurt: 0 });
  // Shatter: Arc's shock on the frozen foe
  const shatter = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10, foe = g.enemies[0], hp = foe.hp;
    g.cast(0, { x: 0, z: -1 }); g.sim(.05);
    return { frozen: (foe.status?.frozen ?? 0) > 0, damage: hp - Math.max(0, foe.hp), dead: !!foe.dead };
  });
  expect(shatter.frozen).toBe(false);
  expect(shatter.damage >= 9 || shatter.dead).toBe(true); // Arc (cracked ice: ×1.5) and the shatter's own blow
  // Overload: a burning foe shocked
  const overload = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10, P = g.player; g.sim(.5);
    const foe = g.spawn('rotling', P.x + 2, P.z - 3); g.sim(.8); foe.hp = 40;
    g.inflict({ burn: 4 }); const burning = foe.status!.burn; g.inflict({ shock: 2 });
    return { burning, burn: foe.status!.burn, shock: foe.status!.shock, damage: 40 - foe.hp };
  });
  expect(overload).toMatchObject({ burning: 4, burn: 0, shock: 0 });
  expect(overload.damage).toBeGreaterThanOrEqual(10);
  // a boss is slowed but never frozen; the training dummy never falls and lists its statuses
  const boss = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10, P = g.player; g.sim(1);
    const warden = g.spawn('warden', P.x - 3, P.z - 3), dummy = g.spawn('dummy', P.x + 3, P.z - 3); g.sim(.8);
    for (let i = 0; i < 4; i++) g.inflict({ chill: 1 });
    g.inflict({ burn: 2 }); dummy.hp = 1; g.sim(.6);
    const d = g.enemies.find(e => e.type === 'dummy')!;
    return { wardenFrozen: (warden.status?.frozen ?? 0) > 0, wardenChill: warden.status?.chill, dummyHp: d.hp, dummyMax: d.maxHp, label: d.label?.userData.text };
  });
  expect(boss).toMatchObject({ wardenFrozen: false, wardenChill: 2 });
  expect(boss.dummyHp).toBe(boss.dummyMax);
  expect(boss.label).toMatch(/Burn/);
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-statuses.png' });
  expect(errors).toEqual([]);
});

type G11 = Omit<G10, 'current' | 'enemies' | 'player'> & {
  clearRoom(): void; shoot(x: number, z: number, dx: number, dz: number): void; readonly mantle: number;
  shots: unknown[]; bolts: unknown[]; current: G10['current'] & { barriers?: unknown[] };
  enemies: (G10['enemies'][number] & { lastHit?: string })[]; player: G10['player'] & { invuln: number };
};

test('spells: the lance burns a line, the seal erupts and leaves fire, shards freeze, ice walls hold, the mantle throws foes back', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=SPL3');
  // Cinder Lance: a beam through two dummies (clear of the pedestal in the middle), burning both
  const lance = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11, P = g.player; g.warp(1); g.sim(.3);
    P.x -= 4; g.learn('cinder_lance', 0);
    g.spawn('dummy', P.x + 2.5, P.z); g.spawn('dummy', P.x + 5, P.z + .2); g.sim(.8);
    const cast = g.cast(0, { x: 1, z: 0 });
    return { cast, burning: g.enemies.filter(e => (e.status?.burn ?? 0) > 0 && e.lastHit === 'spell').length };
  });
  expect(lance).toEqual({ cast: true, burning: 2 });
  // Pyre Seal: nothing for a heartbeat, then the ring strikes, burns and throws back; the ground burns on
  const seal = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11, P = g.player; g.clearRoom(); g.sim(.3); g.mana(999); g.learn('pyre_seal', 1);
    const foe = g.spawn('rotling', P.x + 1.2, P.z - .6); g.sim(.8); foe.hp = 60;
    g.cast(1); g.sim(.5); const early = foe.status?.burn ?? 0, at = { x: foe.x, z: foe.z };
    g.sim(.6); const hit = 60 - foe.hp, burn = foe.status?.burn ?? 0;
    g.clearRoom(); const late = g.spawn('dummy', P.x, P.z); g.sim(1.5); P.hp = P.maxHp;
    return { early, hit, burn, ground: late.status?.burn ?? 0, pushed: Math.hypot(foe.x - at.x, foe.z - at.z) };
  });
  expect(seal.early).toBe(0);
  expect(seal.hit).toBeGreaterThanOrEqual(14);
  expect(seal.burn).toBeGreaterThan(3);
  expect(seal.ground).toBeGreaterThan(0); // walked onto burning ground after the eruption
  // Rime Shards: at close range all five strike, and the third chill freezes
  const shards = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11, P = g.player; g.clearRoom(); g.sim(3); g.mana(999); P.x += 4;
    g.learn('rime_shards', 0); const d = g.spawn('dummy', P.x, P.z - 1.1); g.sim(.8);
    g.cast(0, { x: 0, z: -1 }); const flying = g.bolts.length; g.sim(.4);
    return { flying, frozen: (d.status?.frozen ?? 0) > 0 };
  });
  expect(shards).toEqual({ flying: 5, frozen: true });
  // Glacial Wall: it holds a foe back and stops its shots, lets the mage's bolts through, then shatters and chills
  const wall = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11 & { keys: Set<string>; arrowOrder: string[] }, P = g.player;
    g.clearRoom(); g.sim(.3); g.mana(999); g.learn('glacial_wall', 1); P.x += 2.5; // clear of the pedestal
    const cast = g.cast(1, { x: 0, z: -1 }), barriers = g.current.barriers?.length ?? 0, wallZ = P.z - 2;
    const foe = g.spawn('rotling', P.x, P.z - 4); g.sim(.8); foe.hp = 60;
    const hp = P.hp; g.shoot(P.x + .3, P.z - 4.5, 0, 1); g.sim(1.2);
    const held = foe.z < wallZ, shots = g.shots.length, hurt = hp - P.hp;
    g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(.8); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0;
    const shotThrough = foe.hp < 60; foe.hp = 60; g.sim(3);
    return { cast, barriers: barriers > 3, held, shots, hurt, shotThrough, after: g.current.barriers?.length ?? 0, shattered: 60 - foe.hp, chill: foe.status?.chill ?? 0 };
  });
  expect(wall).toMatchObject({ cast: true, barriers: true, held: true, shots: 0, hurt: 0, shotThrough: true, after: 0 });
  expect(wall.shattered).toBeGreaterThanOrEqual(8);
  expect(wall.chill).toBeGreaterThanOrEqual(1);
  // Static Mantle: foes that touch the mage are shocked and thrown back and don't hurt; when it ends, they do
  const mantle = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11, P = g.player; g.clearRoom(); g.sim(.3); g.mana(999); g.learn('static_mantle', 0);
    const a = g.spawn('rotling', P.x - .8, P.z - 1.2), b = g.spawn('rotling', P.x + 1, P.z - 1); g.sim(.7); a.hp = b.hp = 60;
    g.cast(0); const hp = P.hp; g.sim(1.5);
    const during = { hurt: hp - P.hp, left: g.mantle, zapped: g.enemies.filter(e => e.hp < 60 && e.lastHit === 'spell').length };
    P.invuln = 0; const hp2 = P.hp; g.sim(5.5);
    return { during, left: g.mantle, hurtAfter: hp2 - P.hp };
  });
  expect(mantle.during).toMatchObject({ hurt: 0, zapped: 2 });
  expect(mantle.during.left).toBeGreaterThan(4);
  expect(mantle.left).toBe(0);
  expect(mantle.hurtAfter).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

type PageView = { spell: string; kind: string; price: number; gone: boolean; x: number; z: number };
type G12 = Omit<G11, 'player'> & {
  player: G11['player'] & { coins: number };
  page(id?: string, x?: number, z?: number): string | null; readonly pages: PageView[]; readonly forgotten: string[];
};

test('the library: a page learned burns the others, a full hand is asked, given-up pages stay and sell back, bosses leave one', async ({ page }) => {
  const errors = await start(page, '?room=library_plain&seed=LIB1&spells=arc&loot=coins:10');
  // one slot free: walking into a lectern's page learns it, and the other two burn to ash
  const first = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12, P = g.player;
    g.forgotten.push('cinder_lance', 'pyre_seal'); // given up earlier in the run: one is on a lectern, the other on the shelf
    g.warp(1); g.sim(.5);
    const lecterns = g.pages.filter(p => p.kind === 'lectern'), pick = lecterns[0], shelf = g.pages.filter(p => p.kind === 'shelf');
    P.x = pick.x; P.z = pick.z + .3; g.sim(.3);
    return { offered: lecterns.map(p => p.spell), shelf: shelf.map(p => [p.spell, p.price]), spells: [...P.spells], gone: lecterns.filter(p => p.gone).length, asked: document.querySelector('#prompt')!.classList.contains('on') };
  });
  expect(new Set(first.offered).size).toBe(3);
  expect(first.offered).not.toContain('arc');
  expect(first.shelf).toHaveLength(1);
  expect(first.offered).not.toContain(first.shelf[0][0]);
  expect(first.shelf[0][1]).toBe(7);
  expect(first.spells).toEqual(['arc', first.offered[0]]);
  expect(first.gone).toBe(3);
  expect(first.asked).toBe(false);
  // the shelf: both slots full, so it asks; stepping away keeps both; answering pays, and the given-up spell's
  // page stays on the shelf, free
  const shelf = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12, P = g.player, s = g.pages.find(p => p.kind === 'shelf')!;
    P.x = s.x; P.z = s.z + .3; g.sim(.3); const asked = document.querySelector('#prompt')!.classList.contains('on');
    P.z += 2; g.sim(.3); const kept = !document.querySelector('#prompt')!.classList.contains('on') && P.spells.includes('arc');
    P.z = s.z + .3; g.sim(.3); const answered = g.cast(0); g.sim(.2);
    return { asked, kept, answered, spells: [...P.spells], coins: P.coins, left: [s.spell, s.price, s.gone], forgotten: [...g.forgotten] };
  });
  expect(shelf).toMatchObject({ asked: true, kept: true, answered: true, coins: 3, left: ['arc', 0, false] });
  expect(shelf.spells[0]).toBe(first.shelf[0][0]);
  expect(shelf.forgotten).toContain('arc');
  expect(shelf.forgotten).not.toContain(first.shelf[0][0]);
  // take it back, for nothing: the page swaps again
  const back = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12, P = g.player, s = g.pages.find(p => p.kind === 'shelf')!;
    P.z += 2; g.sim(.3); P.z = s.z + .3; g.sim(.3); g.cast(0); g.sim(.2);
    return { spells: [...P.spells], coins: P.coins, left: s.spell };
  });
  expect(back.spells[0]).toBe('arc');
  expect(back.coins).toBe(3);
  expect(back.left).toBe(first.shelf[0][0]);
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-library.png' });
  expect(errors).toEqual([]);
  // a boss leaves a grimoire page beside its artifacts
  const errors2 = await start(page, '?room=boss_open&seed=BP1&spells=arc');
  const boss = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12, P = g.player; g.warp(1); g.sim(1); g.clearRoom(); g.sim(1);
    const pg = g.pages.find(p => p.kind === 'loose')!, id = pg.spell;
    P.x = pg.x; P.z = pg.z + .3; g.sim(.3);
    return { id, spells: [...P.spells], gone: pg.gone };
  });
  expect(boss.spells).toEqual(['arc', boss.id]);
  expect(boss.gone).toBe(true);
  expect(errors2).toEqual([]);
});

type PoolView = { kind: string; state: string; tiles: { x: number; z: number }[] };
type G13 = Omit<G12, 'keys' | 'player'> & {
  readonly pools: PoolView[]; pool(what: 'fire' | 'frost' | 'shock'): void; keys: Set<string>; player: G12['player'] & { vx: number; vz: number };
};

test('water and oil: the lance lights oil that burns foes and the mage; shock runs through water; frost freezes it; wading is slow', async ({ page }) => {
  const errors = await start(page, '?room=oil_and_water&seed=PW1&spells=cinder_lance,arc');
  // oil: a rotling standing in it, the lance through it
  const oil = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G13, P = g.player; g.warp(1); g.sim(.2); g.clearRoom(); g.sim(.3);
    const pool = () => g.pools.find(q => q.kind === 'oil')!, t = pool().tiles[0];
    const foe = g.spawn('rotling', t.x, t.z); g.sim(.7); foe.hp = 60; foe.x = t.x; foe.z = t.z;
    P.x = t.x; P.z = t.z + 3; g.cast(0, { x: 0, z: -1 }); g.sim(.1);
    const lit = pool().state, burning = foe.status?.burn ?? 0;
    P.x = t.x; P.z = t.z; P.invuln = 0; const hp = P.hp; g.sim(.1); const hurt = hp - P.hp;
    P.z = t.z + 3; g.sim(5.5);
    return { lit, burning, hurt, after: pool().state, other: g.pools.filter(q => q.kind === 'oil').map(q => q.state) };
  });
  expect(oil).toMatchObject({ lit: 'burning', after: 'spent', other: ['spent', 'still'] }); // only the pool it touched
  expect(oil.burning).toBeGreaterThan(0);
  expect(oil.hurt).toBeGreaterThan(0);
  // water: wading is slower than walking; a shock in it reaches every foe standing in it, and the mage
  const water = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G13, P = g.player; g.clearRoom(); g.sim(.3); P.hp = P.maxHp;
    const pool = g.pools.filter(q => q.kind === 'water').sort((a, b) => b.tiles[0].z - a.tiles[0].z)[0];
    const xs = pool.tiles.map(t => t.x), zs = pool.tiles.map(t => t.z), x0 = Math.min(...xs), z0 = Math.min(...zs);
    const walk = (x: number, z: number) => { P.x = x; P.z = z; P.vx = P.vz = 0; g.keys.add('KeyD'); g.sim(.5); g.keys.delete('KeyD'); const d = P.x - x; g.sim(.3); return d; };
    const wading = walk(x0 - .3, z0), dry = walk(x0 - .3, z0 - 3.2);
    const a = g.spawn('rotling', x0 + 2, z0), b = g.spawn('rotling', x0 + 2, z0 + 1), c = g.spawn('rotling', x0 + 4, z0 - 2.5); g.sim(.7);
    for (const f of [a, b, c]) f.hp = 60;
    a.x = x0 + 2; a.z = z0; b.x = x0 + 2; b.z = z0 + 1; c.x = x0 + 4; c.z = z0 - 2.5;
    P.x = x0; P.z = z0 + 1; P.invuln = 0; const hp = P.hp;
    g.pool('shock');
    return { ratio: wading / dry, shocked: [a, b, c].map(f => (f.status?.shock ?? 0) > 0), hurt: hp - P.hp };
  });
  expect(water.ratio).toBeGreaterThan(.45);
  expect(water.ratio).toBeLessThan(.75);
  expect(water.shocked).toEqual([true, true, false]); // not the foe on dry floor
  expect(water.hurt).toBeGreaterThan(0);
  // Arc on a foe in water carries too; Rime Shards freeze the pool, which then conducts nothing and is crossed at full speed
  const ice = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G13, P = g.player; g.clearRoom(); g.sim(2); P.hp = P.maxHp;
    const pool = () => g.pools.filter(q => q.kind === 'water').sort((a, b) => b.tiles[0].z - a.tiles[0].z)[0];
    const xs = pool().tiles.map(t => t.x), zs = pool().tiles.map(t => t.z), x0 = Math.min(...xs), z0 = Math.min(...zs);
    const a = g.spawn('rotling', x0, z0), b = g.spawn('rotling', x0 + 2, z0 + 1); g.sim(.7); a.hp = b.hp = 60; a.x = x0; a.z = z0; b.x = x0 + 2; b.z = z0 + 1;
    P.x = x0 + 5; P.z = z0; g.mana(999); g.player.spellCd[1] = 0; g.cast(1, { x: -1, z: 0 }); g.sim(.05);
    const carried = [a, b].every(f => f.hp < 60);
    g.clearRoom(); g.sim(1); g.learn('rime_shards', 0); P.x = x0 + 4; P.z = z0; g.player.spellCd[0] = 0; g.cast(0, { x: -1, z: 0 }); g.sim(.4);
    const frozen = pool().state;
    P.x = x0 - .3; P.z = z0; P.vx = P.vz = 0; g.keys.add('KeyD'); g.sim(.5); g.keys.delete('KeyD');
    return { carried, frozen, moved: P.x - (x0 - .3) };
  });
  expect(ice).toMatchObject({ carried: true, frozen: 'frozen' });
  expect(ice.moved).toBeGreaterThan(1.6); // full speed on the ice
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-pools.png' });
  expect(errors).toEqual([]);
});

type G14 = G13 & { give(...ids: string[]): void; arrowOrder: string[] };

test('M3 artifacts: burning and chilling bolts, homing bolts, the pendant, the thurible, the knot, the crown, the tome, the lantern, the candle', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&seed=ART3&spells=arc');
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G14, P = g.player;
    const shoot = () => { g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(.05); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0; g.sim(.6); };
    const dummy = (x: number, z: number) => { const d = g.spawn('dummy', x, z); g.sim(.8); return d; };
    g.warp(1); g.sim(.3);
    // the Candle of the Vigil: a fight won refills mana
    g.give('candle_of_the_vigil'); g.mana(0); g.clearRoom(); const vigil = g.mana();
    // the Emberwood Wand: bolts set foes burning
    g.give('emberwood_wand'); let d = dummy(P.x, P.z - 3); shoot(); const ember = d.status?.burn ?? 0; g.clearRoom(); g.sim(2.5);
    // the Tome of Whispers: a bolt cast straight ahead curves into a dummy off to the side
    g.give('tome_of_whispers'); dummy(P.x + 1.6, P.z - 3.5); shoot(); g.sim(.6);
    const homing = g.enemies.find(e => e.type === 'dummy')!.lastHit; g.clearRoom(); g.sim(.3);
    // the Frostbitten Ring: the fifth cast chills
    g.give('apprentice_wand', 'frostbitten_ring'); d = dummy(P.x, P.z - 3);
    const chills: number[] = []; for (let i = 0; i < 5; i++) { shoot(); chills.push(d.status?.chill ?? 0); } g.clearRoom(); g.sim(3.5);
    // the Stormglass Pendant: a shocked foe takes more from the cantrip
    g.give('stormglass_pendant'); const f = g.spawn('rotling', P.x, P.z - 2.5); g.sim(.8); f.hp = 100;
    shoot(); const plain = 100 - f.hp; f.hp = 100; g.inflict({ shock: 2 }); shoot(); const glass = 100 - f.hp; g.clearRoom(); g.sim(.3);
    // the Thurible of Ash: a foe dying in flames sets its neighbour burning
    g.give('thurible_of_ash'); const a = g.spawn('rotling', P.x - 1, P.z - 3), b = g.spawn('rotling', P.x + .6, P.z - 3.2); g.sim(.8);
    g.inflict({ burn: 3 }); b.status!.burn = 0; a.hp = 1; b.hp = 100; g.sim(.6); const spread = { died: !!(a as { dead?: boolean }).dead, burn: b.status?.burn ?? 0 }; g.clearRoom(); g.sim(.3);
    // the Witch's Knot: spells cost less at half health or below
    g.give('witchs_knot'); const cost = () => Number(document.querySelector('#slot0 small')!.textContent);
    P.hp = P.maxHp; g.sim(.05); const full = cost(); P.hp = P.maxHp / 2; g.sim(.05); const low = cost(); P.hp = P.maxHp;
    // the Crown of Thorns, the Hungering Tome and the Mana Lantern
    g.give('crown_of_thorns', 'hungering_tome', 'mana_lantern');
    const held = { maxMana: P.stats.maxMana, maxHp: P.maxHp };
    const t = g.spawn('rotling', P.x, P.z - 2.5); g.sim(.8); t.hp = 100; g.mana(100); g.player.spellCd[0] = 0; g.cast(0, { x: 0, z: -1 }); const crown = 100 - t.hp;
    g.mana(50); g.sim(1); const still = g.mana(); t.hp = 1; shoot(); const fed = g.mana() - still;
    return { vigil, ember, homing, chills, plain, glass, spread, full, low, held, crown, still, fed };
  });
  expect(r.vigil).toBeGreaterThanOrEqual(25);
  expect(r.ember).toBeGreaterThan(0);
  expect(r.homing).toBe('cantrip');
  expect(r.chills).toEqual([0, 0, 0, 0, 1]);
  expect(r.glass).toBeCloseTo(r.plain * 1.25, 1);
  expect(r.spread.died).toBe(true);
  expect(r.spread.burn).toBeGreaterThan(0);
  expect([r.full, r.low]).toEqual([15, 12]);
  expect(r.held).toEqual({ maxMana: 140, maxHp: 4 }); // the crown's price: a heart
  expect(r.crown).toBeGreaterThanOrEqual(9); // Arc's 6, half again
  expect(r.still).toBe(50); // no mana back on its own
  expect(r.fed).toBeGreaterThanOrEqual(8); // the cantrip's 3 and the tome's 5
  expect(errors).toEqual([]);
});

test('the Pilgrim\'s Cowl puts a hood on the mage, hung from the head bone, and it moves with the head', async ({ page }) => {
  const errors = await start(page, '?seed=HOOD01');
  type Obj = { name: string; isBone?: boolean; isMesh?: boolean; children: Obj[]; traverse(f: (o: Obj) => void): void;
    matrixWorld: unknown; getWorldPosition(v: V3): V3; geometry: { boundingSphere: { center: V3 } | null; computeBoundingSphere(): void }; localToWorld(v: V3): V3 };
  type V3 = { x: number; y: number; z: number; clone(): V3; distanceTo(v: V3): number };
  const view = () => page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & { costume: string[]; hero: { model: Obj }; camera: { position: V3 & { constructor: new () => V3 } } };
    let head: Obj | null = null; g.hero.model.traverse(o => { if (!head && o.isBone && /head$/i.test(o.name)) head = o; });
    const h = head as Obj | null; if (!h) return { worn: g.costume, onHead: -1, gap: -1 };
    const parts = h.children.filter(c => !c.isBone);
    // how far the hood's middle is from the head bone, in the world
    const V = g.camera.position.constructor, at = h.getWorldPosition(new V());
    let gap = -1;
    parts[0]?.traverse(o => { if (gap < 0 && o.isMesh) { o.geometry.computeBoundingSphere(); gap = o.localToWorld(o.geometry.boundingSphere!.center.clone()).distanceTo(at); } });
    return { worn: g.costume, onHead: parts.length, gap };
  });
  expect(await view()).toMatchObject({ worn: [], onHead: 0 });
  await page.evaluate(() => (window as unknown as W & { __game: { give(...ids: string[]): void } }).__game.give('pilgrims_cowl'));
  const worn = await view();
  expect(worn).toMatchObject({ worn: ['hood'], onHead: 1 });
  expect(worn.gap).toBeLessThan(.6);
  // run and cast: the head bone moves, and the hood stays on it
  for (const t of [.2, .35, .5]) {
    await page.evaluate(t => { const g = (window as unknown as W).__game; g.keys.add('KeyD'); g.keys.add('ArrowDown'); g.arrowOrder.push('ArrowDown'); g.sim(t, true); }, t);
    expect((await view()).gap).toBeLessThan(.6);
  }
  await page.screenshot({ path: 'test-results/hood.png' });
  expect(errors).toEqual([]);
});

test('the pause menu sets the volumes, and the browser remembers them; positioned effects play without errors', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&seed=VOL1&spells=arc');
  // a fight: hits, deaths and a spell, all panned to where they happen
  await page.evaluate(() => { const w = window as unknown as W, g = w.__game as unknown as G9; g.warp(1); g.cast(0, { x: 0, z: -1 }); w.__fight(30); });
  await page.keyboard.press('Escape');
  await expect(page.locator('#scrPause')).toBeVisible();
  await page.locator('#volEffects').fill('40');
  await page.locator('#volInterface').fill('70');
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 30_000 });
  expect(await page.locator('#volEffects').inputValue()).toBe('40');
  expect(await page.locator('#volInterface').inputValue()).toBe('70');
  expect(await page.locator('#volMaster').inputValue()).toBe('100');
  expect(errors).toEqual([]);
});

test('the inventory lists what the mage carries and knows, in tabs, and describes the chosen entry', async ({ page }) => {
  const errors = await start(page, '?seed=INV1&spells=arc,pyre_seal&give=twin_staff,mana_lantern,crown_of_thorns&loot=coins:12,keys:1,glyphs:3');
  await page.evaluate(() => { ((window as unknown as W).__game as unknown as G12).forgotten.push('rime_shards'); });
  const inv = page.locator('#scrInv'), detail = page.locator('#invDetail'), tiles = page.locator('#invList .tile');
  // I pauses and opens it on the artifacts: the focus first, then what was taken
  await page.keyboard.press('KeyI');
  await expect(inv).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('pause');
  await expect(tiles).toHaveCount(3);
  await expect(detail).toContainText('Twin-Headed Staff');
  await expect(detail).toContainText('2 bolts side by side');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Crown of Thorns');
  await expect(detail).toContainText('Spell damage ×1.5');
  await expect(detail.locator('.chip.bad')).toContainText('Hearts -1'); // its price
  // E turns to the spells: the two slots, and the page given up
  await page.keyboard.press('KeyE');
  await expect(tiles).toHaveCount(3);
  await expect(page.locator('#invList .sec')).toHaveText(['Carried', 'Given up']);
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Pyre Seal');
  await expect(detail).toContainText('Ember spell');
  await expect(detail).toContainText('35 mana');
  await expect(detail).toContainText('Burn 4 s');
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Rime Shards');
  await expect(detail).toContainText('sell its page back for 7 obols');
  // clicking a tab: the items, with their counts
  await page.locator('#invTabs button', { hasText: 'Items' }).click();
  await expect(tiles).toHaveCount(5);
  await expect(page.locator('#invList .tile .n')).toHaveText(['2', '100', '12', '1', '4']); // the crown took a heart
  await tiles.nth(2).click();
  await expect(detail).toContainText('Grave obol');
  // the mage's numbers
  await page.keyboard.press('KeyE');
  await expect(page.locator('#invList .tile', { hasText: 'Mana' }).first()).toContainText('of 140');
  // I closes it and the game goes on; from the pause menu it comes back to the pause menu
  await page.keyboard.press('KeyI');
  await expect(inv).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  await page.keyboard.press('Escape'); await page.click('#btnInv');
  await expect(inv).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#scrPause')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('pause');
  await page.screenshot({ path: 'test-results/smoke-inventory.png' });
  expect(errors).toEqual([]);
});

/* M2 step 6: the artifacts that bend the economy. */
type G7 = Omit<G6, 'current'> & {
  give(...ids: string[]): void; drop(kind: string, x?: number, z?: number): void; pickups: { kind: string }[];
  glyphs: { fuseMax: number; radius: number }[];
  run: { freeVault: number; floor: number };
  player: G6['player'] & { stats: G6['player']['stats'] & { gilt: number; blastMul: number; boltColor: number } };
  current: Omit<G6['current'], 'doors' | 'wares'> & { doors: { x: number; z: number; open: boolean; seal?: Seal; secret?: { divined: boolean } }[]; wares?: (Ware & { tagPrice: number })[] };
};

test('economy artifacts: the keyring opens a vault, the scale lowers prices, the purse weighs the hoard', async ({ page }) => {
  const errors = await start(page, '?room=vault_urns&seed=ECON01&give=sextons_keyring');
  const vault = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7, P = g.player, d = g.current.doors.find(x => x.seal)!;
    const keys = P.keys; P.x = d.x; P.z = d.z + 1.6; g.keys.add('KeyW'); g.sim(.6); g.keys.delete('KeyW'); g.sim(.2);
    return { keys, after: P.keys, sealed: d.seal!.sealed, free: g.run.freeVault === g.run.floor };
  });
  expect(vault).toEqual({ keys: 3, after: 3, sealed: false, free: true }); // three keys on taking it, and none spent

  await page.goto('/?room=merchant_plain&seed=SHOP01&give=pedlars_scale,misers_purse&loot=coins:30');
  await page.waitForFunction(() => !!(window as unknown as W).__game);
  await page.click('#btnStart');
  const shop = await page.evaluate(() => {
    const w = window as unknown as W; w.__manual = true;
    const g = w.__game as unknown as G7, P = g.player; g.warp(1); g.sim(.5);
    const purse = { damage: P.stats.damage, gilt: P.stats.gilt };
    const art = g.current.wares!.find(x => x.ware === 'artifact')!, tags = g.current.wares!.map(x => [x.price, x.tagPrice]);
    const coins = P.coins; P.x = art.x; P.z = art.z + 1.6; g.keys.add('KeyW'); g.sim(.6); g.keys.delete('KeyW'); g.sim(.2);
    return { purse, tags, spent: coins - P.coins, after: { damage: P.stats.damage, gilt: P.stats.gilt } };
  });
  expect(shop.purse.damage).toBeCloseTo(3.5 + 1.5); // 30 obols: three tens, half a point each
  expect(shop.purse.gilt).toBeGreaterThan(0);
  for (const [price, tag] of shop.tags) expect(tag).toBe(Math.max(1, Math.round(price * .7)));
  expect(shop.spent).toBe(11); // 15 obols, less 30%
  expect(shop.after.damage).toBeCloseTo(3.5 + .5); // 19 obols left: one ten
  expect(errors).toEqual([]);
});

test('economy artifacts: chalk widens blasts, the band spares the mage, the ferryman pays, the lantern finds', async ({ page }) => {
  const errors = await start(page, '?room=secret_cell&seed=ECON02&give=glyphwrights_chalk,warding_band,ferrymans_obol,grave_lantern');
  const found = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7; g.sim(.2);
    return { glyphs: g.player.glyphs, divined: g.current.doors.find(d => d.secret)?.secret?.divined, toast: document.getElementById('toast')!.textContent };
  });
  expect(found).toEqual({ glyphs: 6, divined: true, toast: expect.stringMatching(/Grave Lantern/) }); // one to start, five from the chalk
  await page.keyboard.press('Space');
  const blast = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7, P = g.player; g.sim(.05);
    const gl = { fuse: g.glyphs[0].fuseMax, radius: g.glyphs[0].radius }, hp = P.hp;
    g.sim(1.2); return { ...gl, hurt: hp - P.hp, left: g.glyphs.length };
  });
  expect(blast).toEqual({ fuse: 1, radius: 2.25, hurt: 0, left: 0 });
  // the ferryman: the same fight won on the same seed, with his obol and without, leaves one obol more
  const obolsAfterFight = async (give: string) => {
    await page.goto(`/?room=crypt_a&seed=ECON03${give}`);
    await page.waitForFunction(() => !!(window as unknown as W).__game);
    await page.click('#btnStart');
    return page.evaluate(() => {
      const w = window as unknown as W; w.__manual = true;
      const g = w.__game as unknown as G7 & { clearRoom(): void }; g.warp(1); g.sim(.3); g.clearRoom(); g.sim(.3);
      return g.pickups.filter(q => q.kind === 'coin').length;
    });
  };
  expect(await obolsAfterFight('&give=ferrymans_obol')).toBe(await obolsAfterFight('') + 1);
  expect(errors).toEqual([]);
});

test('picking things up shows their lore: artifacts every time, items and containers the first time in a run', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=LORE1');
  type G8 = G7 & { current: G7['current'] & { spots: { x: number; z: number; def: { name: string } }[] } };
  const card = () => page.evaluate(() => ({
    on: document.getElementById('lore')!.classList.contains('on'), name: document.getElementById('loreName')!.textContent,
    kind: document.getElementById('loreKind')!.textContent, lore: document.getElementById('loreText')!.textContent!.length,
  }));
  const art = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G8; g.warp(1); g.sim(.3);
    const s = g.current.spots[0], name = s.def.name; // a focus taken leaves the old one on the pedestal
    g.player.x = s.x; g.player.z = s.z + .7; g.sim(.3);
    return name;
  });
  expect(await card()).toMatchObject({ on: true, name: art });
  expect((await card()).lore).toBeGreaterThan(60);
  await page.screenshot({ path: 'test-results/smoke-lore.png' });
  // it fades while the game runs; an obol is described the first time, not the second
  const obol = () => page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G8; g.sim(12); g.drop('coin', g.player.x + .5, g.player.z + .8); g.sim(1.2); });
  await obol();
  expect(await card()).toMatchObject({ on: true, name: 'Grave obol', kind: 'Coin' });
  await obol();
  expect((await card()).on).toBe(false);
  expect(errors).toEqual([]);
});

test('the dev menu opens on its key, pauses the game, and hands out what it lists', async ({ page }) => {
  const errors = await start(page, '?seed=DEVM01');
  await expect(page.locator('#devHint')).toContainText('F2'); // the key is shown on the HUD during play-tests
  await expect(page.locator('#scrTitle .controls')).toContainText('F2'); // and among the controls at the start
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
  // the floor's secret room is listed, hidden until found, and the menu can open it
  await expect(page.locator('#dev button', { hasText: 'Secret room (hidden)' })).toBeVisible();
  await click('Open the secret room');
  await expect(page.locator('#dev button', { hasText: /^Secret room$/ })).toBeVisible();
  await page.keyboard.press('Escape'); // closes the menu (not the pause screen) and the game goes on
  await expect(page.locator('#dev')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  // a boss fight from the menu keeps what the mage carries
  await page.keyboard.press('F2'); await click('The Pyre Knight');
  const boss = await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G5 & { run: { boss: string } }; return { boss: g.run.boss, items: g.player.items, coins: g.player.coins, rooms: g.rooms().length }; });
  expect(boss).toEqual({ boss: 'pyre', items: ['ember_sigil'], coins: 10, rooms: 2 });
  // a curse to try the shrine with, and cleansing it at once
  await page.keyboard.press('F2'); await click('Take a curse'); await click('Cleanse a curse');
  const curse = await page.evaluate(() => { const P = (window as unknown as W).__game.player as unknown as { items: string[]; cleansed: string[] }; return { items: P.items.length, cleansed: P.cleansed }; });
  expect(curse.items).toBe(2);
  expect(curse.cleansed).toEqual([(await page.evaluate(() => ((window as unknown as W).__game.player as unknown as { items: string[] }).items[1]))]);
  // a spell into slot E, and endless mana
  await page.locator('#dev select[aria-label="Slot"]').selectOption('1');
  await click('Arc'); await click('Endless mana');
  await page.keyboard.press('Escape'); // back to play, where mana flows
  const magic = await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G9; g.mana(0); g.sim(.05); return { spells: g.player.spells, mana: g.player.mana }; });
  expect(magic).toEqual({ spells: [null, 'arc'], mana: 100 });
  // a grimoire page dropped ahead of the mage; the floor's library is listed
  // the movement clip for the play-tests: run, then the walk in step, then the walk at a natural pace
  await page.keyboard.press('F2'); await click('Moving: run clip');
  await expect(page.locator('#dev button', { hasText: 'Moving: walk clip, feet in step' })).toBeVisible();
  await click('Moving: walk clip, feet in step'); await click('Moving: walk clip, natural pace');
  await expect(page.locator('#dev button', { hasText: 'Moving: run clip' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('F2'); await click('Drop a grimoire page');
  expect(await page.evaluate(() => ((window as unknown as W).__game as unknown as G12).pages.filter(p => p.kind === 'loose' && p.spell !== 'arc').length)).toBe(1);
  await click('Floor 1'); await page.keyboard.press('F2'); await expect(page.locator('#dev button', { hasText: /^Library/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('every door of a seeded floor leads to its neighbour, onto open floor', async ({ page }) => {
  const errors = await start(page, '?seed=DOORS1&floor=2&loot=keys:9'); // keys unbind a vault's ward on the way
  const result = await page.evaluate(() => {
    const secret = ((window as unknown as W).__game as unknown as { openSecret(): boolean }).openSecret(); // its cracked walls, broken open
    type D = { side: 'n' | 's' | 'e' | 'w'; x: number; z: number; nb: unknown; open: boolean };
    type R = Omit<RoomView, 'doors' | 'plan'> & { doors: D[]; bounds: { minX: number; minZ: number }; mask: boolean[][]; plan: RoomView['plan'] & { doors: { shift?: number }[] } };
    const g = (window as unknown as W).__game as unknown as {
      rooms(): R[]; current: R; warp(id: number): void; clearRoom(): void; sim(sec: number): void; keys: Set<string>;
      player: { x: number; z: number; vx: number; vz: number; invuln: number }; camera: { zoom: number };
    };
    const HALLS = ['long', 'tall', 'great', 'l_shape'];
    const KEY: Record<D['side'], string> = { n: 'KeyW', s: 'KeyS', e: 'KeyD', w: 'KeyA' };
    const DIR: Record<D['side'], number[]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    const fails: string[] = []; let walked = 0, shifted = 0; const shapes = new Set<string>();
    for (const room of g.rooms()) for (const [i, d] of room.doors.entries()) {
      if (room.plan.doors[i].shift) shifted++; // doors moved off the middle of their edge (M3.6)
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
    return { walked, shifted, shapes: shapes.size, fails, secret };
  });
  console.log(`walked through ${result.walked} doors (${result.shifted} off the middle) in rooms of ${result.shapes} shapes${result.secret ? ', a secret room among them' : ''}`);
  expect(result.secret).toBe(true);
  expect(result.shifted).toBeGreaterThan(0);
  expect(result.walked).toBeGreaterThan(20);
  expect(result.fails).toEqual([]);
  expect(errors).toEqual([]);
});

test('carved rooms: x tiles inside the shape are wall the mage can\'t walk into', async ({ page }) => {
  const errors = await start(page, '?room=octagon_crypt');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as {
      warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; keys: Set<string>;
      current: { bounds: { minX: number; minZ: number }; mask: boolean[][]; walls: unknown[]; group: { children: unknown[] } };
      player: { x: number; z: number; vx: number; vz: number };
    };
    g.warp(1); g.clearRoom();
    const b = g.current.bounds;
    // walk into the top-left corner, which the template cuts away
    g.player.x = b.minX + 2.5; g.player.z = b.minZ + 1.5; g.keys.add('KeyW'); g.keys.add('KeyA'); g.sim(1.5, true); g.keys.clear();
    return { corner: g.current.mask[0][0], x: g.player.x - b.minX, z: g.player.z - b.minZ, walls: g.current.walls.length };
  });
  expect(result.corner).toBe(false);
  // the mage stops at the cut corner's walls: not inside tile (0,0), (1,0) or (0,1)
  expect(result.x >= 2 || result.z >= 1).toBe(true);
  expect(result.x >= 1 || result.z >= 2).toBe(true);
  expect(result.walls).toBeGreaterThan(4);
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
