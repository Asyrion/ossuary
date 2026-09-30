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
  // the tests step the game themselves: no frames drawn in real time from the moment the page loads (with software
  // WebGL on a two-core runner, the title screen drawing flat out slowed every start down)
  await page.addInitScript('window.__manual = true');
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
      current: RoomView & { spots: { x: number; z: number; taken: boolean; def: { stats?: { hearts?: number }; curse?: { stats?: { hearts?: number } } } }[] }; player: { maxHp: number; x: number; z: number };
    };
    g.warp(1);
    // what the artifact itself does to the hearts: the Leaden Heart gives two back, the Crown of Thorns' curse takes one
    const spot = g.current.spots[0], before = g.player.maxHp, gift = ((spot.def.stats?.hearts ?? 0) + (spot.def.curse?.stats?.hearts ?? 0)) * 2;
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

test('a run is five floors: the Gilded Reliquary and the Ferryman\'s Shore below the Scriptorium, and the Shore\'s boss wins it', async ({ page }) => {
  const errors = await start(page, '?seed=DEEP01&floor=3');
  type G2 = GameHooks & { descend(): void; run: { boss: string } };
  const floors = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2, seen: { floor: number; boss: string; shrines: number; banner: string }[] = [];
    const note = () => seen.push({ floor: g.floor, boss: g.run.boss, shrines: g.rooms().filter(r => r.type === 'shrine').length, banner: document.querySelector('#banner .t')?.textContent ?? '' });
    g.descend(); g.sim(.2, true); note(); // (from the Scriptorium down to the Reliquary)
    g.descend(); g.sim(.2, true); note(); // (and on to the Shore)
    return seen;
  });
  expect(floors.map(f => [f.floor, f.boss, f.shrines, f.banner])).toEqual([[3, 'hart', 1, 'The Gilded Reliquary'], [4, 'angler', 0, "The Ferryman's Shore"]]); // (a shrine on floor 4 as on floor 2)
  await page.screenshot({ path: 'test-results/smoke-floor5.png' });
  const end = await page.evaluate(() => { const g = (window as unknown as W).__game as G2; g.descend(); g.sim(.2); return { state: g.state, floor: document.getElementById('endFloor')!.textContent }; });
  expect(end).toEqual({ state: 'end', floor: '5 of 5' });
  expect(errors).toEqual([]);
});

for (const boss of ['hart', 'angler']) test(`the ${boss === 'hart' ? 'Hallowed Hart' : 'Deep Angler'}, built in code, fights as it should and can be beaten`, async ({ page }) => {
  const errors = await start(page, `?room=boss_open&boss=${boss}&floor=${boss === 'hart' ? 4 : 5}`);
  type Boss = Foe & { type: string; state: string; hp: number; summoned?: boolean; st: number; cycle: number; bossAff?: { weak: string; resist: string }; parts?: Record<string, unknown> };
  type G2 = GameHooks & { hit(i: number, dmg: number, school?: string): number; player: GameHooks['player'] & { invuln: number } };
  const result = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game as G2;
    g.warp(1);
    const foe = g.enemies.find(e => e.isBoss) as Boss, i = g.enemies.indexOf(foe);
    // its weakness and resistance
    g.sim(.7); const hp0 = foe.hp; g.hit(i, 4, foe.bossAff!.weak); const weak = hp0 - foe.hp; const hp1 = foe.hp; g.hit(i, 4, foe.bossAff!.resist); const resist = hp1 - foe.hp;
    // the angler's lure draws the mage in: stand three tiles off, and let it pull
    let drawn = 0;
    if (foe.type === 'angler') {
      g.player.x = foe.x; g.player.z = foe.z + 3; foe.state = 'pull'; foe.st = 1.5; (foe as Boss & { fireT: number }).fireT = foe.hp;
      const d0 = Math.hypot(g.player.x - foe.x, g.player.z - foe.z); g.sim(.5); drawn = d0 - Math.hypot(g.player.x - foe.x, g.player.z - foe.z);
    }
    const states = new Set<string>(); let called = false, seconds = 0;
    for (; seconds < 240 && g.enemies.length; seconds += .25) { w.__fight(.25); states.add(foe.state); called ||= !!foe.summoned; }
    g.sim(0.5);
    const spots = (g.current as RoomView & { spots: unknown[] }).spots;
    return { type: foe.type, weak, resist, drawn, seconds, states: [...states], called, left: g.enemies.length, cleared: g.current.cleared, choice: spots.length };
  });
  console.log(`${boss} beaten in ${result.seconds.toFixed(1)} s of game time; states seen: ${result.states.join(', ')}`);
  expect(result).toMatchObject({ type: boss, called: true, left: 0, cleared: true, choice: 2 });
  expect(result.weak).toBeCloseTo(6); expect(result.resist).toBeCloseTo(2); // (half again, and half)
  expect(result.states).toEqual(expect.arrayContaining(boss === 'hart' ? ['walk', 'aim', 'charge', 'spokes', 'windStamp'] : ['drift', 'lure', 'spit', 'windRing']));
  if (boss === 'angler') expect(result.drawn).toBeGreaterThan(.5);
  expect(errors).toEqual([]);
});

test('the Hollow Warden wears the look chosen for it, its shots in its school\'s light, and can be beaten', async ({ page }) => {
  const LIGHT: Record<string, number> = { bellWarden: 0xf0e070, motherOfSpores: 0xa266ff, hollowOwl: 0xffd878 }; // (SCHOOL_LIGHT: storm, umbral, hallow)
  type Boss = Foe & { type: string; state: string; summoned?: boolean; mats: unknown[]; eye?: object; ring?: object; halo?: object; model: { traverse(f: (o: { isMesh?: boolean; isSprite?: boolean; isPoints?: boolean }) => void): void } };
  type G2 = GameHooks & { bossLook: string; setBossLook(id: string): void; bossLooks(): { id: string }[]; shots: { color: number }[] };
  const errors: string[][] = [];
  for (const look of Object.keys(LIGHT)) {
    await page.addInitScript(`localStorage.setItem('ossuary.bossLook', '${look}')`); // (the later init scripts run last)
    errors.push(await start(page, '?room=boss_open&boss=warden'));
    const seen = await page.evaluate(() => {
      const g = (window as unknown as W).__game as G2; g.warp(1); g.sim(.1, true);
      const e = g.enemies.find(f => f.isBoss) as Boss;
      let meshes = 0; e.model.traverse(o => { if (o.isMesh || o.isSprite || o.isPoints) meshes++; });
      for (let i = 0; i < 300 && !g.shots.length; i++) { g.player.hp = g.player.maxHp; g.sim(.05); }
      return { look: g.bossLook, type: e.type, parts: !!(e.eye && e.ring && e.halo), lit: e.mats.length > 0, meshes, colors: [...new Set(g.shots.map(s => s.color))] };
    });
    expect(seen).toMatchObject({ look, type: 'warden', parts: true, lit: true, colors: [LIGHT[look]] });
    expect(seen.meshes).toBeLessThanOrEqual(30); // (its still parts merged: about twenty draw calls, not a hundred)
  }
  // the last look fights to the end: it walks, bursts rings, fires volleys, calls the floor's walkers, and falls
  const fight = await page.evaluate(() => {
    const w = window as unknown as W, g = w.__game as G2;
    const foe = g.enemies.find(e => e.isBoss) as Boss;
    const states = new Set<string>(); let called = false, seconds = 0;
    for (; seconds < 240 && g.enemies.length; seconds += .25) { w.__fight(.25); states.add(foe.state); called ||= !!foe.summoned; }
    g.sim(0.5);
    return { states: [...states].sort(), called, left: g.enemies.length, cleared: g.current.cleared };
  });
  expect(fight).toMatchObject({ called: true, left: 0, cleared: true });
  expect(fight.states).toEqual(expect.arrayContaining(['walk', 'windAim', 'windBurst', 'volley']));
  // the dev menu's gallery stands the three (with the other bosses built in code), and the switch is remembered in this browser
  const gallery = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2, ids = g.bossLooks().map(o => o.id);
    g.sim(.2, true); g.setBossLook('bellWarden');
    return { ids, look: g.bossLook, kept: localStorage.getItem('ossuary.bossLook') };
  });
  expect(gallery).toEqual({ ids: ['bellWarden', 'motherOfSpores', 'hollowOwl', 'hart', 'angler'], look: 'bellWarden', kept: 'bellWarden' }); // (and the bosses of floors 4 and 5, M4.1)
  for (const e of errors) expect(e).toEqual([]);
});

test('the end screen sums up the run, and replays its seed', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&seed=ENDRUN&give=twin_staff,bone_lens');
  type G2 = GameHooks & { descend(): void; drop(kind: string, x?: number, z?: number): void; player: GameHooks['player'] & { invuln: number } };
  const summary = () => page.evaluate(() => ({
    shown: !document.getElementById('scrEnd')!.classList.contains('hidden'),
    title: document.getElementById('endTitle')!.textContent, floor: document.getElementById('endFloor')!.textContent,
    kills: document.getElementById('endKills')!.textContent, seed: document.getElementById('endSeed')!.textContent,
    time: document.getElementById('endTime')!.textContent, carried: document.querySelectorAll('#endItems li').length,
    obols: Number(document.getElementById('endObols')!.textContent), text: document.getElementById('endText')!.textContent,
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
  expect(won).toMatchObject({ shown: true, floor: '1 of 5', kills: '3', seed: 'ENDRUN', carried: 2 }); // twin staff replaced the wand
  expect(won.time).toMatch(/^\d+:\d\d$/);
  expect(won.text).toMatch(/Wardens' vault.*Kaelith's seal/); // (M4.2: the setting in the text)

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
  expect(lost).toMatchObject({ shown: true, floor: '1 of 5', seed: 'ENDRUN', carried: 1 });
  expect(lost.title).not.toBe(won.title);
  expect(lost).toMatchObject({ title: 'Asyrion fell in the vault', text: expect.stringMatching(/^Asyrion's descent ended on floor 1, The Ossuary/) });
  expect(errors).toEqual([]);
});

test('the setting (M4.2): the title names the Gate of Uzulim and Asyrion; the first floor opens beneath the Wardens\' chapel, and the Warden is one of them', async ({ page }) => {
  await page.addInitScript('window.__manual = true');
  await page.goto('/?seed=GATE01');
  await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 30_000 });
  const title = await page.evaluate(() => ({
    heading: document.querySelector('#scrTitle h1')!.textContent, place: document.querySelector('#scrTitle .place')!.textContent,
    intro: document.querySelector('#scrTitle .place + p')!.textContent,
  }));
  expect(title).toEqual({ heading: 'Ossuary', place: 'Beneath the Gate of Uzulim', intro: expect.stringMatching(/^Asyrion's first descent into the Wardens' vault/) });
  await page.screenshot({ path: 'test-results/smoke-title.png' });
  await page.click('#btnStart');
  const banner = await page.evaluate(() => [document.querySelector('#banner .t')!.textContent, document.querySelector('#banner .s')!.textContent]);
  expect(banner).toEqual(['The Ossuary', "Beneath the Wardens' chapel, below the Gate of Uzulim"]);
  // the floor-1 boss's banner names what it was
  const errors = await start(page, '?seed=GATE01&boss=warden');
  const warden = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as { rooms(): { type: string; plan: { id: number } }[]; warp(id: number): void; sim(s: number): void };
    g.warp(g.rooms().find(r => r.type === 'boss')!.plan.id); g.sim(.3);
    return [document.querySelector('#banner .t')!.textContent, document.querySelector('#banner .s')!.textContent];
  });
  expect(warden).toEqual(['The Hollow Warden', 'A Warden of Uzulim who never came back up']);
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

test('the drinking ward (M4.2): a vault\'s ward drinks the spells cast near it and bursts into a Wardling of what it drank most; a warded foe drinks spells, keeps statuses off, and breaks into a Wardling', async ({ page }) => {
  type Wards = { vaults: { sealed: boolean; fill: number; top: string | null; guard: string | null }[]; foes: { type: string; fill: number; top: string }[] };
  type F = Foe & { hp: number; maxHp: number; type: string; champion?: boolean; dead?: boolean; status?: Record<string, number> };
  type GW = Omit<G5, 'enemies'> & { learn(id: string, slot: number): void; mana(n: number): void; cast(slot: number, dir?: { x: number; z: number }): boolean; wards: Wards;
    wardFoe(i: number): boolean; hit(i: number, dmg: number, school?: string, by?: string): void; inflict(s: Record<string, number>): void;
    spawn(kind: string, x: number, z: number): F; enemies: F[] };
  let errors = await start(page, '?room=vault_urns&seed=VAULT3');
  const vault = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GW, P = g.player, d = g.current.doors.find(x => x.seal)!;
    P.x = d.x; P.z = d.z + 2.5; P.vx = P.vz = 0; P.invuln = 99; g.sim(.2);
    g.mana(999); g.learn('rime_shards', 0); g.learn('cinder_lance', 1);
    g.cast(0, { x: 0, z: -1 }); const first = { ...g.wards.vaults[0], bolts: g.bolts.length, toast: document.getElementById('toast')!.textContent };
    g.sim(1.6); g.cast(0, { x: 0, z: -1 }); g.sim(1.6); g.cast(1, { x: 0, z: -1 }); g.sim(2.1);
    const three = g.wards.vaults[0];
    g.cast(0, { x: 0, z: -1 }); g.sim(.3);
    const burst = { ...g.wards.vaults[0], open: d.open, toast: document.getElementById('toast')!.textContent };
    P.x = d.x; P.z = d.z + .8; g.keys.add('KeyW'); g.sim(1.4); g.keys.delete('KeyW'); g.sim(.6);
    const guard = g.enemies.filter(e => !e.dead);
    return { first, three, burst, inside: { type: g.current.type, locked: g.current.locked, guards: guard.map(e => e.type), champion: guard.every(e => e.champion), banner: document.querySelector('#banner .t')!.textContent } };
  });
  expect(vault.first).toMatchObject({ sealed: true, top: 'frost', bolts: 0, toast: expect.stringMatching(/drinks your spell/) });
  expect(vault.first.fill).toBeCloseTo(15 / 60, 5);
  expect(vault.three).toMatchObject({ sealed: true, top: 'frost' });
  expect(vault.three.fill).toBeCloseTo(50 / 60, 5);
  expect(vault.burst).toMatchObject({ sealed: false, open: true, guard: 'wardFrost', toast: expect.stringMatching(/bursts, full of Frost/) });
  expect(vault.inside).toEqual({ type: 'vault', locked: true, guards: ['wardFrost'], champion: true, banner: 'What the ward drank rises' });
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-wardling.png' });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=crypt_a&seed=WARD1');
  const foe = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GW, P = g.player;
    g.warp(1); g.clearRoom(); g.sim(.3); P.invuln = 99;
    const e = g.spawn('rotling', P.x, P.z - 2.5); e.hp = e.maxHp = 200; g.sim(.8);
    const i = g.enemies.indexOf(e); g.wardFoe(i);
    g.hit(i, 25, 'storm', 'spell'); g.inflict({ hex: 1, burn: 2 });
    const held = { hp: e.hp, hex: e.status?.hex ?? 0, burn: e.status?.burn ?? 0, fill: g.wards.foes[0]?.fill };
    g.hit(i, 3, undefined, 'cantrip'); const cantrip = 200 - e.hp;
    g.mana(999); g.learn('arc', 0); g.cast(0, { x: 0, z: -1 }); g.sim(.3); const arc = g.wards.foes[0]?.fill ?? 1;
    g.hit(i, 25, 'storm', 'spell'); g.hit(i, 15, 'umbral', 'spell'); g.sim(.2);
    return { held, cantrip, arc, after: g.wards.foes.length, risen: g.enemies.filter(x => !x.dead && x.type.startsWith('ward')).map(x => x.type), hp: e.hp };
  });
  expect(foe.held).toMatchObject({ hp: 200, hex: 0, burn: 0 });
  expect(foe.held.fill).toBeCloseTo(25 / 60, 5);
  expect(foe.cantrip).toBe(3);
  expect(foe.arc).toBeGreaterThan(25 / 60);
  expect(foe).toMatchObject({ after: 0, risen: ['wardStorm'], hp: 197 });
  expect(errors).toEqual([]);
});

test('the Wandering Merchant (M4.2): rides into a cleared room, lays out a focus from far off, a soul mote and the crow\'s wares; the crow sells the map and the secret; he is gone when the mage leaves', async ({ page }) => {
  type Room = { type: string; known: boolean; visited: boolean; plan: { id: number } };
  type GM = Omit<G5, 'rooms' | 'current'> & { callWanderer(): void; wanderer: { here: boolean; laid: boolean; wares: string[] }; rooms(): Room[]; run: { wandererMet: boolean };
    current: G5['current'] & { wares?: { ware: string; x: number; z: number; sold: boolean }[] } };
  const errors = await start(page, '?seed=WANDER&floor=2&loot=coins:30');
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GM, P = g.player;
    const normal = g.rooms().find(x => x.type === 'normal')!;
    g.warp(normal.plan.id); g.clearRoom(); g.sim(.3); P.invuln = 99;
    const before = { met: g.run.wandererMet, here: g.wanderer.here };
    g.callWanderer(); g.sim(1); const riding = g.wanderer;
    g.sim(2); const laid = g.wanderer;
    const buy = (ware: string) => { const w = g.current.wares!.find(x => x.ware === ware)!; P.x = w.x; P.z = w.z + 1.4; g.sim(.2); P.z = w.z; g.sim(.3); P.z = w.z + 1.4; g.sim(.3); return w.sold; };
    const coins = P.coins, unknown = g.rooms().filter(x => x.type !== 'secret' && !x.known).length;
    const map = buy('map'), mapped = g.rooms().filter(x => x.type !== 'secret' && !x.known).length;
    const secret = laid.wares.includes('secret') ? buy('secret') : null, secretKnown = g.rooms().find(x => x.type === 'secret')?.known ?? null;
    const spent = coins - P.coins;
    const other = g.rooms().find(x => x.type === 'normal' && x !== normal)!; g.warp(other.plan.id); g.sim(.3); const away = g.wanderer;
    g.warp(normal.plan.id); g.sim(.3);
    return { before, riding, laid, unknown, map, mapped, secret, secretKnown, spent, away, back: g.wanderer, met: g.run.wandererMet };
  });
  expect(r.before).toEqual({ met: false, here: false });
  expect(r.riding).toMatchObject({ here: true, laid: false, wares: [] });
  expect(r.laid.laid).toBe(true);
  expect(r.laid.wares.slice(0, 3)).toEqual(['artifact', expect.stringMatching(/Soul$/), 'map']);
  expect(r.unknown).toBeGreaterThan(0);
  expect(r).toMatchObject({ map: true, mapped: 0, met: true, away: { here: false }, back: { here: false, wares: [] } });
  if (r.secret !== null) expect(r).toMatchObject({ secret: true, secretKnown: true });
  expect(r.spent).toBe(r.secret ? 13 : 5);
  expect(errors).toEqual([]);
});

/* M2 step 5: the shrine. */
type Rite = { id: string; x: number; z: number; hits: number; t: number; inside: boolean; fleeing: boolean } | null;
type G6 = G5 & {
  rite: Rite; player: G5['player'] & { cleansed: string[]; stats: { damage: number; speed: number; effects: Set<string> } };
  current: G5['current'] & { shrine: { stones: { id: string; x: number; z: number }[] } };
};

/** Math.random from a seed, started again by `window.__reseed()` (as `npm run inspect` does): for a test whose outcome
    hangs on the game's unseeded randomness, such as where the shrine's wisp flies. */
const SEEDED_RANDOM = `(() => { let s = 1; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; window.__reseed = () => { s = 1; }; })();`;

test('the shrine cleanses a curse put down inside its circle, refuses the poor, and lets a curse escape in time', async ({ page }) => {
  // (where the wisp flies is random; seeded, the bot's chase goes the same way every run instead of now and then
  // running out of the rite's ten seconds)
  await page.addInitScript(SEEDED_RANDOM);
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
    (window as unknown as { __reseed(): void }).__reseed();
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
  clearRoom(): void; shoot(x: number, z: number, dx: number, dz: number): void; readonly mantle: number; readonly spellFx: { lance: boolean; rings: number; strikes: number };
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
    const cast = g.cast(0, { x: 1, z: 0 }), shows = g.spellFx.lance; g.sim(.1);
    const burning = g.enemies.filter(e => (e.status?.burn ?? 0) > 0 && e.lastHit === 'spell').length, still = g.spellFx.lance; g.sim(.7);
    return { cast, shows, still, gone: !g.spellFx.lance, burning }; // (its look swells, holds and fades by itself)
  });
  expect(lance).toEqual({ cast: true, shows: true, still: true, gone: true, burning: 2 });
  // Pyre Seal: nothing for a heartbeat, then the ring strikes, burns and throws back; the ground burns on
  const seal = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11, P = g.player; g.clearRoom(); g.sim(.3); g.mana(999); g.learn('pyre_seal', 1);
    const foe = g.spawn('rotling', P.x + 1.2, P.z - .6); g.sim(.8); foe.hp = 60;
    g.cast(1); g.sim(.5); const early = foe.status?.burn ?? 0, at = { x: foe.x, z: foe.z };
    g.sim(.6); const hit = 60 - foe.hp, burn = foe.status?.burn ?? 0, shockwave = g.spellFx.rings > 0;
    g.clearRoom(); const late = g.spawn('dummy', P.x, P.z); g.sim(1.5); P.hp = P.maxHp;
    return { early, hit, burn, shockwave, ground: late.status?.burn ?? 0, pushed: Math.hypot(foe.x - at.x, foe.z - at.z) };
  });
  expect(seal.early).toBe(0);
  expect(seal.shockwave).toBe(true); // (the eruption's ring of fire on the floor)
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
    let crackled = 0; for (let i = 0; i < 20; i++) { g.sim(.05); crackled = Math.max(crackled, g.spellFx.strikes); } // (arcs over the mage, zaps)
    P.invuln = 0; const hp2 = P.hp; g.sim(4.5);
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

type HStatus = Status & { sanct: number; hex: number; root: number; eclipse: number; black: boolean };
type G11h = Omit<G11, 'enemies' | 'spawn' | 'inflict'> & {
  enemies: (Omit<G11['enemies'][number], 'status'> & { status?: HStatus; toll?: unknown })[];
  spawn(kind: string, x?: number, z?: number): { hp: number; x: number; z: number; status?: HStatus; toll?: unknown; type: string };
  inflict(status: Record<string, number>): void; hit(i: number, dmg: number, school?: string, by?: string): number;
  readonly ward: number; pickups: { kind: string }[]; prop(kind: string, x?: number, z?: number): boolean; props: { kind: string; lit?: boolean }[];
};

test('Hallow and Umbral (M4.1): holy ground heals and lays foes open, judgement falls on the strongest, wardlight breaks shots, hexes give mana back, hands hold, the toll pays; Eclipse and Blackfire', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=HAL1');
  // Consecrate: the dummy in the holy ground is struck and sanctified; the mage in it is healed once
  const zone = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h, P = g.player; g.warp(1); g.sim(.3); P.x -= 3;
    g.learn('consecrate', 0); g.mana(999); const d = g.spawn('dummy', P.x + 1, P.z); g.prop('candles', P.x - 1.2, P.z); g.sim(.8);
    P.hp = P.maxHp - 1; const cast = g.cast(0); g.sim(1.2);
    return { cast, sanct: d.status?.sanct ?? 0, healed: P.hp === P.maxHp, candles: g.props.find(q => q.kind === 'candles')?.lit };
  });
  expect(zone).toMatchObject({ cast: true, healed: true, candles: true }); // (holy ground kindles the candle stands on it)
  expect(zone.sanct).toBeGreaterThan(1);
  // Judgement: nothing for a moment, then the pillar falls on the strongest foe in reach, and only on it
  const judge = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h, P = g.player; g.clearRoom(); g.sim(3); g.mana(999); g.learn('judgement', 0);
    const strong = g.spawn('rotling', P.x + 4, P.z - 2), weak = g.spawn('rotling', P.x + 4, P.z + 2.5); g.sim(.8); strong.hp = 80; weak.hp = 30;
    const cast = g.cast(0); g.sim(.5); const early = 80 - strong.hp; g.sim(.7);
    return { cast, early, struck: 80 - strong.hp, sanct: strong.status?.sanct ?? 0, weak: 30 - weak.hp };
  });
  expect(judge).toMatchObject({ cast: true, early: 0, weak: 0 });
  expect(judge.struck).toBeGreaterThanOrEqual(26);
  expect(judge.sanct).toBeGreaterThan(3);
  // Wardlight: motes circle the mage for a while and break the shots they meet
  const ward = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h, P = g.player; g.clearRoom(); g.sim(3); g.mana(999); g.learn('wardlight', 0);
    const cast = g.cast(0), left = g.ward; P.invuln = 0; const hp = P.hp;
    for (let i = 0; i < 4; i++) g.shoot(P.x + (i - 1.5) * .15, P.z - 3, 0, 1);
    g.sim(1.2);
    return { cast, left, hurt: hp - P.hp, shots: g.shots.length };
  });
  expect(ward).toMatchObject({ cast: true, hurt: 0, shots: 0 });
  expect(ward.left).toBeGreaterThan(7);
  // Hex Bolt: a slow bolt hexes what it strikes, and each blow on a hexed foe spends a stack for mana
  const hexed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h, P = g.player; g.clearRoom(); g.sim(9); g.mana(999); g.learn('hex_bolt', 0);
    const d = g.spawn('dummy', P.x, P.z - 2.2); g.sim(.8);
    const cast = g.cast(0, { x: 0, z: -1 }); g.sim(.8); const hex = d.status?.hex ?? 0;
    g.mana(10); const i = g.enemies.findIndex(e => e.type === 'dummy'); g.hit(i, 1, undefined, 'cantrip');
    return { cast, hex, after: d.status?.hex ?? 0, mana: P.mana };
  });
  expect(hexed).toMatchObject({ cast: true, hex: 2, after: 1 });
  expect(hexed.mana).toBeGreaterThanOrEqual(13);
  // Eclipse (Hallow + Umbral): out of the fight under a black sun, then struck; Blackfire (Umbral + Ember) never goes out
  const react = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h, P = g.player; g.clearRoom(); g.sim(.3);
    const foe = g.spawn('rotling', P.x + 3, P.z - 2.5); g.sim(.8); foe.hp = 60;
    g.inflict({ sanct: 3 }); g.inflict({ hex: 1 });
    const eclipse = foe.status?.eclipse ?? 0, at = { x: foe.x, z: foe.z }; g.sim(1);
    const moved = Math.hypot(foe.x - at.x, foe.z - at.z), during = 60 - foe.hp; g.sim(1.2);
    const after = 60 - foe.hp; g.clearRoom(); g.sim(.3);
    const other = g.spawn('rotling', P.x + 3, P.z - 2.5); g.sim(.8); other.hp = 200;
    g.inflict({ burn: 2 }); g.inflict({ hex: 1 }); g.sim(4);
    return { eclipse, moved, during, after, black: other.status?.black, burning: other.status?.burn ?? 0, burnt: 200 - other.hp };
  });
  expect(react.eclipse).toBeGreaterThan(1.5);
  expect(react).toMatchObject({ moved: 0, during: 0, black: true });
  expect(react.after).toBeGreaterThanOrEqual(18);
  expect(react.burning).toBeGreaterThan(0); // (a burn of 2 s, still alight after 4)
  expect(react.burnt).toBeGreaterThanOrEqual(10);
  // Grasp of the Grave: hands rise where the mage aims and hold the foe there, hexed
  const held = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h, P = g.player; g.clearRoom(); g.sim(3); g.mana(999); g.learn('grasp_of_the_grave', 0);
    const foe = g.spawn('rotling', P.x, P.z - 3); g.sim(.8); foe.hp = 60;
    const cast = g.cast(0, { x: 0, z: -1 }); g.sim(.5); const at = { x: foe.x, z: foe.z }, root = foe.status?.root ?? 0, hex = foe.status?.hex ?? 0;
    g.sim(1);
    return { cast, root, hex, moved: Math.hypot(foe.x - at.x, foe.z - at.z), struck: 60 - foe.hp };
  });
  expect(held).toMatchObject({ cast: true, hex: 1 });
  expect(held.root).toBeGreaterThan(1.5);
  expect(held.moved).toBeLessThan(.05);
  expect(held.struck).toBeGreaterThanOrEqual(5);
  // the Ferryman's Toll: the nearest foe is marked, blows on it give mana back, and falling it pays an obol and spreads its hex
  const toll = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G11h, P = g.player; g.clearRoom(); g.sim(3); g.mana(999); g.learn('ferrymans_toll', 0);
    const near = g.spawn('rotling', P.x, P.z - 2.5), by = g.spawn('rotling', P.x + 1.2, P.z - 3); g.sim(.8); near.hp = by.hp = 60;
    const coins = g.pickups.filter(q => q.kind === 'coin').length, cast = g.cast(0, { x: 0, z: -1 }), marked = !!near.toll;
    g.sim(.3); g.mana(10); const i = g.enemies.indexOf(near as never); g.hit(i, 1, undefined, 'cantrip'); const mana = P.mana;
    g.sim(.3); g.hit(g.enemies.indexOf(near as never), 99, undefined, 'cantrip'); g.sim(.1);
    return { cast, marked, mana, paid: g.pickups.filter(q => q.kind === 'coin').length - coins, spread: by.status?.hex ?? 0 };
  });
  expect(toll).toMatchObject({ cast: true, marked: true });
  expect(toll.mana).toBeGreaterThanOrEqual(14); // the toll's 4 (and the hex's stack)
  expect(toll.paid).toBeGreaterThanOrEqual(1);
  expect(toll.spread).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-hallow-umbral.png' });
  expect(errors).toEqual([]);
});

type GS = Omit<G11h, 'player'> & {
  player: G11h['player'] & { spellCd: number[]; souls: string[] }; readonly souls: string[]; soul(kind: string): boolean; hallowedMend(): number;
  drop(kind: string, x?: number, z?: number): void;
};

test('soul motes (M4.1): they take hits before the hearts, a black one hexes the room, a hallowed one goes last and mends at a floor\'s end, a spell short of mana burns one, a hexed foe leaves one; the lodestone shard ends cooldowns', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=SOUL1&spells=arc');
  // a pale mote picked up shows beside the hearts, and takes the next hit
  const pale = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS, P = g.player; g.warp(1); g.sim(.3); P.x -= 3;
    g.drop('paleSoul', P.x, P.z); g.sim(.8); const held = g.souls, shown = document.querySelectorAll('#hearts svg.soul').length;
    P.invuln = 0; const hp = P.hp; g.shoot(P.x, P.z - 2.5, 0, 1); g.sim(1);
    return { held, shown, hurt: hp - P.hp, after: g.souls, left: document.querySelectorAll('#hearts svg.soul').length };
  });
  expect(pale).toEqual({ held: ['pale'], shown: 1, hurt: 0, after: [], left: 0 });
  // a black and a hallowed one: the hit takes the black (the hallowed goes last though taken later), which hexes every foe
  const black = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS, P = g.player;
    const a = g.spawn('rotling', P.x + 4, P.z - 2), b = g.spawn('rotling', P.x + 5, P.z + 2); g.sim(.8);
    g.soul('black'); g.soul('hallowed'); P.invuln = 0; const hp = P.hp; g.shoot(P.x, P.z - 2.5, 0, 1); g.sim(1);
    const after = g.souls, hexed = [a.status?.hex ?? 0, b.status?.hex ?? 0];
    P.invuln = 0; g.shoot(P.x, P.z - 2.5, 0, 1); g.sim(1);
    return { after, hexed, hurt: hp - P.hp, last: g.souls };
  });
  expect(black).toEqual({ after: ['hallowed'], hexed: [2, 2], hurt: 0, last: [] });
  // hallowed motes held at a floor's end give back half a heart each
  const mend = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS, P = g.player; g.clearRoom(); g.sim(.3);
    P.hp = P.maxHp - 3; g.soul('hallowed'); g.soul('hallowed'); g.soul('pale');
    return { mended: g.hallowedMend(), short: P.maxHp - P.hp, kept: g.souls };
  });
  expect(mend).toEqual({ mended: 2, short: 1, kept: ['hallowed', 'hallowed', 'pale'] });
  // a spell short of mana burns a mote for the rest (the last taken that isn't hallowed); with none, it fails
  const burn = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS; g.spawn('dummy', g.player.x, g.player.z - 2); g.sim(.8);
    g.mana(2); const cast = g.cast(0, { x: 0, z: -1 }), after = g.souls, toast = document.querySelector('#toast')!.textContent;
    g.sim(2); g.player.souls.length = 0; g.mana(2); const failed = !g.cast(0, { x: 0, z: -1 });
    return { cast, after, toast, failed };
  });
  expect(burn).toMatchObject({ cast: true, after: ['hallowed', 'hallowed'], failed: true });
  expect(burn.toast).toMatch(/soul mote/);
  // the lodestone shard ends the cooldown and gives mana; with nothing to give, it is left lying
  const shard = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS, P = g.player; g.clearRoom(); g.sim(.3); g.mana(999);
    g.spawn('dummy', P.x, P.z - 2); g.sim(.8); g.cast(0, { x: 0, z: -1 }); const cd = P.spellCd[0]; g.mana(10); g.clearRoom();
    g.drop('shard', P.x, P.z); g.sim(.8); const after = { cd: P.spellCd[0], mana: P.mana };
    g.mana(999); g.drop('shard', P.x, P.z); g.sim(.8);
    return { cd, after, lying: g.pickups.filter(q => q.kind === 'shard').length };
  });
  expect(shard.cd).toBeGreaterThan(.5);
  expect(shard.after.cd).toBe(0); expect(shard.after.mana).toBeGreaterThanOrEqual(35);
  expect(shard.lying).toBe(1);
  // a foe that falls deep in a hex leaves a black mote now and then (about one in two)
  const hexed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS, P = g.player; g.clearRoom(); g.sim(.3);
    for (let i = 0; i < 8; i++) g.spawn('rotling', P.x - 3 + (i % 4) * 1.6, P.z - 2.5 + Math.floor(i / 4) * 1.2);
    g.sim(.8); g.inflict({ hex: 4 });
    for (let i = g.enemies.length - 1; i >= 0; i--) g.hit(i, 999, undefined, 'spell');
    g.sim(1);
    return g.pickups.filter(q => q.kind === 'blackSoul').length;
  });
  expect(hexed).toBeGreaterThanOrEqual(1);
  expect(hexed).toBeLessThanOrEqual(8);
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-souls.png' });
  expect(errors).toEqual([]);
});

test('M4.1\'s artifacts: the pendulum swings, the lodestar hangs stars, the echo stone, the halo, the antler\'s lance, the candles, the blood moon, the salt circle, the choir, the lantern, the contract and the last rite', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=ART41');
  const fire = `(g, key) => { g.player.fireCd = 0; g.keys.add(key); g.arrowOrder.push(key); g.sim(1 / 60); g.keys.delete(key); g.arrowOrder.length = 0; }`;
  // the Pendulum of Hours: bolts set out to one side, then the other, and curve back onto the aim line
  const swing = await page.evaluate(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.warp(1); g.sim(.3); P.x -= 3; g.give('pendulum_of_hours');
    fire(g, 'ArrowUp'); const a = g.bolts[g.bolts.length - 1], a0 = { x: a.x, curve: a.curve, vx: a.vx };
    fire(g, 'ArrowUp'); const b = g.bolts[g.bolts.length - 1];
    let most = 0; for (let i = 0; i < 30 && g.bolts.includes(a); i++) { g.sim(1 / 30); most = Math.max(most, Math.abs(a.x - a0.x)); }
    return { first: Math.sign(a0.curve), second: Math.sign(b.curve), outward: Math.sign(a0.vx), most };
  })()`) as { first: number; second: number; outward: number; most: number };
  expect(swing.first * swing.second).toBe(-1); // (left, then right)
  expect(swing.outward).toBe(-swing.first); // (out one way, turning back the other)
  expect(swing.most).toBeGreaterThan(.4);
  // the Lodestar Wand: a bolt stops at its range's end and hangs there as a star, then goes out
  const star = await page.evaluate(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.sim(2); for (const b of [...g.bolts]) b.dist = 99; g.sim(.1); g.give('lodestar_wand');
    fire(g, 'ArrowRight'); const b = g.bolts[g.bolts.length - 1];
    let t = 0; for (; t < 3 && b.star === undefined; t += .05) g.sim(.05);
    const at = { x: b.x, z: b.z }; g.sim(1); const hung = g.bolts.includes(b) && Math.hypot(b.x - at.x, b.z - at.z) < .01;
    g.sim(1.5); return { became: b.star !== undefined, t, hung, gone: !g.bolts.includes(b) };
  })()`) as { became: boolean; t: number; hung: boolean; gone: boolean };
  expect(star).toMatchObject({ became: true, hung: true, gone: true });
  // the Echo Stone: a bolt at a wall comes back, once; the Gilded Halo: the first bolt on a foe sanctifies it
  const echo = await page.evaluate(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.give('apprentice_wand', 'echo_stone', 'gilded_halo'); g.sim(.2);
    const room = g.current; P.z = room.cz - 1.5; P.x = room.cx - 3;
    fire(g, 'ArrowUp'); const b = g.bolts[g.bolts.length - 1], vz = b.vz;
    for (let i = 0; i < 40 && !b.echoed; i++) g.sim(1 / 30);
    const back = b.echoed && Math.sign(b.vz) === -Math.sign(vz);
    const d = g.spawn('dummy', P.x + 2.5, P.z); g.sim(.8); fire(g, 'ArrowRight'); g.sim(.5);
    return { back, sanct: d.status?.sanct ?? 0 };
  })()`) as { back: boolean; sanct: number };
  expect(echo.back).toBe(true);
  expect(echo.sanct).toBeGreaterThan(2);
  // the Hart's Antler: every sixth cast a lance of light that pierces and sanctifies
  const lance = await page.evaluate(`(() => {
    const g = window.__game, fire = ${fire}; g.clearRoom(); g.give('harts_antler'); const seen = [];
    for (let i = 0; i < 12; i++) { fire(g, 'ArrowDown'); const b = g.bolts[g.bolts.length - 1]; seen.push(b.pierce >= 99 && (b.status?.sanct ?? 0) > 0); g.sim(.2); }
    return seen.filter(Boolean).length;
  })()`);
  expect(lance).toBe(2);
  // the Twin Vigil Candles: standing still, bolts strike half again as hard; the Blood Moon: hurt, faster and in crimson
  const steady = await page.evaluate(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.clearRoom(); g.sim(3); g.give('twin_vigil_candles', 'blood_moon_pendant');
    g.sim(.5); const still = P.still; fire(g, 'ArrowLeft'); const a = g.bolts[g.bolts.length - 1], base = P.stats.damage;
    P.hp = 2; g.sim(.3); fire(g, 'ArrowLeft'); const b = g.bolts[g.bolts.length - 1];
    return { still, mul: a.damage / base, speed: Math.hypot(b.vx, b.vz) / P.stats.shotSpeed, color: b.color, cd: P.fireCd };
  })()`) as { still: number; mul: number; speed: number; color: number; cd: number };
  expect(steady.still).toBeGreaterThan(.25);
  expect(steady.mul).toBeCloseTo(1.5);
  expect(steady.speed).toBeGreaterThan(1.25); expect(steady.color).toBe(0xe03040);
  expect(steady.cd).toBeLessThan(.36 * .8);
  // the Salt Circle: standing still a moment, a ring forms that walking foes can't cross; stepping out breaks it
  const salt = await page.evaluate(`(() => {
    const g = window.__game, P = g.player; P.hp = P.maxHp; g.clearRoom(); g.give('salt_circle'); g.sim(1.4);
    const ring = g.salt; const foe = g.spawn('rotling', P.x + 3, P.z); g.sim(.8); let least = 9;
    for (let i = 0; i < 60; i++) { g.sim(.05); least = Math.min(least, Math.hypot(foe.x - ring.x, foe.z - ring.z)); }
    g.clearRoom(); g.keys.add('KeyD'); g.sim(.6); g.keys.delete('KeyD'); g.sim(.3); // (walks out of it)
    return { formed: !!ring, least, after: g.salt };
  })()`) as { formed: boolean; least: number; after: unknown };
  expect(salt.formed).toBe(true);
  expect(salt.least).toBeGreaterThan(1.35);
  expect(salt.after).toBeNull();
  // the Ossuary Choir: the fifth foe put to rest in a room makes it sing, striking the rest
  const choir = await page.evaluate(`(() => {
    const g = window.__game, P = g.player; g.clearRoom(); g.sim(.3); g.give('ossuary_choir');
    for (let i = 0; i < 6; i++) g.spawn('rotling', P.x - 3 + i * 1.2, P.z - 2.5);
    g.sim(.8); const last = g.enemies[5]; last.hp = 50;
    for (let k = 0; k < 5; k++) g.hit(g.enemies.findIndex(e => !e.dead && e !== last), 999);
    g.sim(.6); return 50 - last.hp;
  })()`);
  expect(choir).toBeGreaterThanOrEqual(5);
  // the Ferryman's Lantern: a hex gives back half again the mana
  const lantern = await page.evaluate(`(() => {
    const g = window.__game, P = g.player; g.clearRoom(); g.give('ferrymans_lantern'); const d = g.spawn('dummy', P.x, P.z - 2); g.sim(.8);
    g.inflict({ hex: 2 }); P.spells[0] = 'arc'; g.mana(10); g.hit(g.enemies.indexOf(d), 1, undefined, 'cantrip'); return P.mana;
  })()`);
  expect(lantern).toBeCloseTo(14.5, 0);
  // the Gravemonger's Contract: the dead pay (about one in two), fights won leave no hearts
  const grave = await page.evaluate(`(() => {
    const g = window.__game, P = g.player; g.clearRoom(); g.sim(.3); g.give('gravemongers_contract');
    const coins = g.pickups.filter(q => q.kind === 'coin').length;
    for (let i = 0; i < 12; i++) g.spawn('rotling', P.x - 4 + (i % 6) * 1.4, P.z - 2.5 + Math.floor(i / 6) * 1.2);
    g.sim(.8); for (let i = g.enemies.length - 1; i >= 0; i--) g.hit(i, 999); g.sim(.5);
    return g.pickups.filter(q => q.kind === 'coin').length - coins;
  })()`);
  expect(grave).toBeGreaterThanOrEqual(3);
  // the Last Rite: a killing blow refused once a floor, the mage risen with half a heart; its price, a heart less
  const rite = await page.evaluate(`(() => {
    const g = window.__game, P = g.player; g.clearRoom(); g.sim(.3); const max = P.maxHp; g.give('the_last_rite');
    P.hp = 1; P.invuln = 0; g.shoot(P.x, P.z - .8, 0, 1); g.sim(1);
    return { lost: max - P.maxHp, hp: P.hp, state: g.state, used: g.run.riteFloor === g.run.floor };
  })()`) as { lost: number; hp: number; state: string; used: boolean };
  expect(rite).toEqual({ lost: 2, hp: 1, state: 'play', used: true });
  await page.evaluate(() => (window as unknown as W).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-artifacts-41.png' });
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
    g.forgotten.push('cinder_lance', 'pyre_seal', 'rime_shards'); // given up earlier in the run: on the shelf unless a lectern offers them
    g.warp(1); g.sim(.5);
    const lecterns = g.pages.filter(p => p.kind === 'lectern'), pick = lecterns[0], shelf = g.pages.filter(p => p.kind === 'shelf');
    P.x = pick.x; P.z = pick.z + .3; g.sim(.3);
    return { offered: lecterns.map(p => p.spell), shelf: shelf.map(p => [p.spell, p.price]), spells: [...P.spells], gone: lecterns.filter(p => p.gone).length, asked: document.querySelector('#prompt')!.classList.contains('on') };
  });
  expect(new Set(first.offered).size).toBe(3);
  expect(first.offered).not.toContain('arc');
  expect(first.shelf.map(q => q[0])).toEqual(['rime_shards', 'pyre_seal', 'cinder_lance'].filter(id => !first.offered.includes(id)).slice(0, 2)); // (latest first, two at most)
  expect(first.shelf.map(q => q[1])).toEqual([7, 7]);
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
  await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G12 & { know(id: string, st: string): void }; g.forgotten.push('rime_shards'); g.know('rime_shards', 'learned'); });
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
  // E turns to the spells: the two slots, then a book by school (a school opens with its first spell learned), with a
  // sealed entry for each spell not met yet
  await page.keyboard.press('KeyE');
  await expect(tiles).toHaveCount(8);
  await expect(page.locator('#invList .sec')).toHaveText(['Carried', 'Ember', 'Frost', 'Storm']);
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Pyre Seal');
  await expect(detail).toContainText('Ember spell');
  await expect(detail).toContainText('35 mana');
  await expect(detail).toContainText('Burn 4 s');
  await expect(detail).toContainText('Cast it 10 more times to know it well');
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('A page not yet found'); // Cinder Lance, not met
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Rime Shards');
  await expect(detail).toContainText('sell its page back for 7 obols');
  // clicking a tab: the items, with their counts
  await page.locator('#invTabs button', { hasText: 'Items' }).click();
  await expect(tiles).toHaveCount(6);
  await expect(page.locator('#invList .tile .n')).toHaveText(['2', '100', '0', '12', '1', '4']); // the crown took a heart; no soul motes yet
  await tiles.nth(2).click();
  await expect(detail).toContainText('None held');
  await tiles.nth(3).click();
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

test('mana vials: loot gives an obol instead while the mage knows no spell; a vial or heart left lying at full says why, once', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain');
  type G7 = { warp(id: number): void; sim(sec: number): void; learn(id: string, slot: number): void; mana(n: number): void;
    drop(kind: string, x?: number, z?: number, opts?: { asLoot?: boolean }): void; pickups: { kind: string }[];
    player: { x: number; z: number; hp: number; maxHp: number } };
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: G7 }).__game, P = g.player;
    const kinds = () => g.pickups.map(p => p.kind);
    g.warp(1); g.sim(.2);
    // no spell yet: a vial from loot arrives as an obol
    g.drop('mana', P.x + 3, P.z, { asLoot: true }); g.sim(.1); const noSpell = kinds().slice(-1)[0];
    // with a spell, loot drops the vial itself; at full mana it stays on the floor, and the mage is told why
    g.learn('arc', 0); g.drop('mana', P.x - 3, P.z, { asLoot: true }); g.sim(.6); const withSpell = kinds().slice(-1)[0];
    g.mana(999); const x = P.x; P.x = x - 3; g.sim(.3);
    const manaHint = document.getElementById('toast')!.textContent, stillThere = kinds().includes('mana');
    // a heart at full health says so too
    P.x = x; P.hp = P.maxHp; g.drop('heart', P.x, P.z - 2); g.sim(.6); P.z -= 2; g.sim(.3);
    return { noSpell, withSpell, manaHint, stillThere, heartHint: document.getElementById('toast')!.textContent };
  });
  expect(r).toEqual({ noSpell: 'coin', withSpell: 'mana', manaHint: 'Your mana is already full', stillThere: true, heartHint: 'You are already at full health' });
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
  const click = (text: string) => page.locator('#dev .dv-page:not([hidden]) button', { hasText: text }).first().click();
  const tab = (name: string) => page.locator('#dev .dv-tabs button', { hasText: name }).click();
  // in tabs: the mage's opens first
  await expect(page.locator('#dev .dv-tabs button')).toHaveText(['Mage', 'Magic', 'Foes & objects', 'Rooms & runs', 'Look', 'Galleries']);
  await expect(page.locator('#dev .dv-tab.on')).toHaveText('Mage');
  await click('+10 obols'); await click('+5 keys'); await click('Ember Sigil'); await click('God mode'); await click('Gilded chest');
  const got = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5 & { pickups: { gilded?: boolean }[] };
    return { coins: g.player.coins, keys: g.player.keys, items: g.player.items, gilded: g.pickups.filter(q => q.gilded).length };
  });
  expect(got).toEqual({ coins: 10, keys: 5, items: ['ember_sigil'], gilded: 1 });
  // the floor's secret room is listed, hidden until found, and the menu can open it
  await tab('Rooms & runs');
  await expect(page.locator('#dev button', { hasText: 'Secret room (hidden)' })).toBeVisible();
  await click('Open the secret room');
  await expect(page.locator('#dev button', { hasText: /^Secret room$/ })).toBeVisible();
  await page.keyboard.press('Escape'); // closes the menu (not the pause screen) and the game goes on
  await expect(page.locator('#dev')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  // a boss fight from the menu keeps what the mage carries (and the menu opens on the tab it was left on)
  await page.keyboard.press('F2'); await expect(page.locator('#dev .dv-tab.on')).toHaveText('Rooms & runs'); await click('The Pyre Knight');
  const boss = await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G5 & { run: { boss: string } }; return { boss: g.run.boss, items: g.player.items, coins: g.player.coins, rooms: g.rooms().length }; });
  expect(boss).toEqual({ boss: 'pyre', items: ['ember_sigil'], coins: 10, rooms: 2 });
  // a curse to try the shrine with, and cleansing it at once
  await page.keyboard.press('F2'); await tab('Mage'); await click('Take a curse'); await click('Cleanse a curse');
  const curse = await page.evaluate(() => { const P = (window as unknown as W).__game.player as unknown as { items: string[]; cleansed: string[] }; return { items: P.items.length, cleansed: P.cleansed }; });
  expect(curse.items).toBe(2);
  expect(curse.cleansed).toEqual([(await page.evaluate(() => ((window as unknown as W).__game.player as unknown as { items: string[] }).items[1]))]);
  // a spell into slot E, and endless mana
  await tab('Magic'); await page.locator('#dev select[aria-label="Slot"]').selectOption('1');
  await click('Arc'); await click('Endless mana');
  await page.keyboard.press('Escape'); // back to play, where mana flows
  const magic = await page.evaluate(() => { const g = (window as unknown as W).__game as unknown as G9; g.mana(0); g.sim(.05); return { spells: g.player.spells, mana: g.player.mana }; });
  expect(magic).toEqual({ spells: [null, 'arc'], mana: 100 });
  // a grimoire page dropped ahead of the mage; the floor's library is listed
  // the movement clip for the play-tests: run, then the walk in step, then the walk at a natural pace
  await page.keyboard.press('F2'); await tab('Mage'); await click('Moving: run clip');
  await expect(page.locator('#dev button', { hasText: 'Moving: walk clip, feet in step' })).toBeVisible();
  await click('Moving: walk clip, feet in step'); await click('Moving: walk clip, natural pace');
  await expect(page.locator('#dev button', { hasText: 'Moving: run clip' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('F2'); await tab('Magic'); await click('Drop a grimoire page');
  expect(await page.evaluate(() => ((window as unknown as W).__game as unknown as G12).pages.filter(p => p.kind === 'loose' && p.spell !== 'arc').length)).toBe(1);
  await tab('Rooms & runs'); await click('Floor 1'); await page.keyboard.press('F2'); await expect(page.locator('#dev button', { hasText: /^Library/ })).toBeVisible();
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

test('objects: bolts break piles and casks (oil spills), pews stop walking not bolts, fire burns roots, webs slow, briars sting, spores flash, blasts clear rubble', async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&loot=glyphs:3');
  type P = { kind: string; x: number; z: number; burning: number; hits: number };
  type G5 = {
    warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; keys: Set<string>; arrowOrder: string[];
    current: { bounds: { minX: number; minZ: number } }; prop(kind: string, x: number, z: number): boolean; props: P[]; spores: number;
    pools: { kind: string }[]; burn(x: number, z: number, r?: number): void; spawn(kind: string, x: number, z: number): { hp: number; maxHp: number };
    player: { x: number; z: number; vx: number; vz: number; hp: number; maxHp: number; invuln: number };
  };
  const result = await page.evaluate(() => {
    const g = (window as unknown as { __game: G5 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + .5, z: g.current.bounds.minZ + r + .5 });
    const put = (kind: string, c: number, r: number) => { const q = at(c, r); return g.prop(kind, q.x, q.z); };
    const stand = (c: number, r: number) => { const q = at(c, r); g.player.x = q.x; g.player.z = q.z; g.player.vx = g.player.vz = 0; };
    const has = (kind: string) => g.props.filter(p => p.kind === kind).length;
    const shootEast = (sec: number) => { g.keys.add('ArrowRight'); g.arrowOrder.push('ArrowRight'); g.sim(sec); g.keys.delete('ArrowRight'); g.arrowOrder.length = 0; g.sim(.5); };
    g.warp(1); g.clearRoom(); g.player.invuln = 99;
    const out: Record<string, unknown> = {};
    // a bone pile breaks to one bolt, a skull heap to two, a cask spills oil
    put('bones', 4, 0); stand(1, 0); shootEast(.3); out.bones = has('bones');
    put('skulls', 4, 6); stand(1, 6); shootEast(.3); out.skullsAfterOne = has('skulls'); shootEast(1.2); out.skulls = has('skulls');
    put('cask', 11, 1); stand(8, 1); shootEast(.8); out.cask = has('cask'); out.oil = g.pools.filter(p => p.kind === 'oil').length;
    // a pew: the mage can't walk through it, bolts fly over it
    put('pew', 4, 4); stand(2, 4); g.keys.add('KeyD'); g.sim(1); g.keys.delete('KeyD'); out.pewStops = g.player.x < at(4, 4).x - .4;
    stand(2, 4); shootEast(1); out.pew = has('pew');
    // roots burn away
    put('roots', 11, 5); g.burn(at(11, 5).x, at(11, 5).z); out.rootsBurning = g.props.some(p => p.kind === 'roots' && p.burning > 0); g.sim(4.5); out.roots = has('roots');
    // cobwebs slow the mage
    const walk = () => { const x0 = g.player.x; g.keys.add('KeyD'); g.sim(.6); g.keys.delete('KeyD'); return g.player.x - x0; };
    stand(0, 2); const free = walk(); put('web', 1, 2); put('web', 2, 2); stand(0, 2); g.sim(.2); const snag = walk(); out.webSlows = snag < free * .8;
    // a briar stings
    put('briar', 9, 3); stand(9, 3); g.player.invuln = 0; const hp0 = g.player.hp; g.sim(.6); out.stung = g.player.hp < hp0; g.player.hp = g.player.maxHp; g.player.invuln = 99;
    // a glowcap bursts into spores, and fire in them flashes, hurting a foe in reach
    put('glowcap', 11, 3); stand(8, 3); shootEast(.3); out.spores = g.spores;
    const foe = g.spawn('rotling', at(11, 2).x, at(11, 2).z); g.sim(.6); const fhp = foe.hp;
    g.burn(at(11, 3).x, at(11, 3).z); out.flashed = g.spores === 0 && foe.hp < fhp;
    put('rubble', 2, 5); stand(3, 6);
    return out;
  });
  expect(result).toMatchObject({ bones: 0, skullsAfterOne: 1, skulls: 0, cask: 0, oil: 1, pewStops: true, pew: 1, rootsBurning: true, roots: 0, webSlows: true, stung: true, spores: 1, flashed: true });
  // a glyph's blast clears rubble
  await page.keyboard.press('Space');
  const rubble = await page.evaluate(() => {
    const g = (window as unknown as { __game: G5 }).__game;
    g.sim(.05); g.player.x += 4; g.sim(3);
    return g.props.filter(p => p.kind === 'rubble').length;
  });
  expect(rubble).toBe(0);
  await page.screenshot({ path: 'test-results/objects.png' });
  expect(errors).toEqual([]);
});

test('themed rooms: sleepers wake when the mage comes close, the ossuary\'s bones rise, a blast brings the ceiling down', async ({ page }) => {
  type E = { x: number; z: number; dead?: boolean; asleep?: boolean; type: string };
  type G6 = { warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; enemies: E[]; props: { kind: string }[];
    current: { cx: number; cz: number; theme?: { id: string }; bounds: { minX: number; minZ: number } }; player: { x: number; z: number; invuln: number; hp: number; maxHp: number } };
  let errors = await start(page, '?room=pilgrims_rest');
  const sleepers = await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 }).__game; g.warp(1); g.player.invuln = 99;
    const at = g.enemies.map(e => ({ x: e.x, z: e.z })); g.sim(2);
    const still = g.enemies.every((e, i) => e.asleep && Math.hypot(e.x - at[i].x, e.z - at[i].z) < .05);
    const e = g.enemies[0]; g.player.x = e.x + 1.2; g.player.z = e.z; g.sim(.3);
    return { theme: g.current.theme?.id, count: g.enemies.length, still, woke: !g.enemies[0].asleep, toast: document.getElementById('toast')!.textContent };
  });
  expect(sleepers).toMatchObject({ theme: 'pilgrims', still: true, woke: true, toast: "Pilgrims' rest" });
  expect(sleepers.count).toBeGreaterThan(1);
  expect(errors).toEqual([]);

  errors = await start(page, '?room=ossuary_niches');
  const risen = await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 }).__game; g.warp(1);
    const piles = () => g.props.filter(p => p.kind === 'bones' || p.kind === 'skulls').length;
    const before = { piles: piles(), foes: g.enemies.filter(e => !e.dead).length };
    g.player.x = g.current.cx; g.player.z = g.current.cz + 3.2; // keep to the bottom, out of the way
    for (let t = 0; t < 11.5; t += .5) { g.player.hp = g.player.maxHp; g.player.invuln = 99; g.sim(.5); }
    return { before, after: { piles: piles(), foes: g.enemies.filter(e => !e.dead).length } };
  });
  expect(risen.after.piles).toBe(risen.before.piles - 1);
  expect(risen.after.foes).toBeGreaterThanOrEqual(risen.before.foes); // a rotling rose from the pile
  // its skulls watch: their eyes take the colour of the last spell cast
  const eyes = await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 & { learn(id: string, slot: number): void; cast(slot: number): boolean; mana(v: number): number } }).__game;
    const mat = (g.current as unknown as { eyes?: { color: { getHexString(): string } } }).eyes, before = mat?.color.getHexString();
    g.learn('rime_shards', 0); g.mana(100); const cast = g.cast(0); g.sim(.1);
    return { before, cast, after: mat?.color.getHexString() };
  });
  expect(eyes).toEqual({ before: '000000', cast: true, after: '9fd8ff' });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=collapsed_crypt&loot=glyphs:3');
  await page.evaluate(() => { const g = (window as unknown as { __game: G6 }).__game; g.warp(1); g.clearRoom(); g.player.invuln = 99; g.player.x = g.current.cx; g.player.z = g.current.cz; });
  await page.keyboard.press('Space');
  const fell = await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 }).__game, rubble = () => g.props.filter(p => p.kind === 'rubble').length;
    const before = rubble(); g.sim(.05); g.player.z += 3; g.sim(4);
    return { before, after: rubble() };
  });
  expect(fell.after).toBeGreaterThan(fell.before); // the glyph went off clear of the rubble; stones fell round it
  expect(errors).toEqual([]);
});

test('themed rooms (M4.1): the treasury\'s guardians stand as statues until their gold is taken, a blast spills a heap\'s obols; the drowned climb out of the landing\'s river until it freezes', async ({ page }) => {
  type E = { x: number; z: number; dead?: boolean; asleep?: boolean; statue?: boolean; type: string };
  type GT = { warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; enemies: E[]; props: { kind: string; x: number; z: number }[]; pickups: { kind: string; x: number; z: number }[];
    loot(v: Record<string, number>): void; pool(what: string): void; pools: { kind: string; state: string }[];
    current: { theme?: { id: string } }; player: { x: number; z: number; invuln: number } };
  let errors = await start(page, '?room=treasury_vault&floor=4&seed=TRS1');
  const statues = await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game; g.warp(1); g.player.invuln = 99;
    const at = g.enemies.map(e => ({ x: e.x, z: e.z })); g.sim(1);
    const e = g.enemies[0]; g.player.x = e.x + 1.1; g.player.z = e.z; g.sim(1.5); // (close by: a statue doesn't wake)
    const still = g.enemies.every((q, i) => q.asleep && q.statue && Math.hypot(q.x - at[i].x, q.z - at[i].z) < .05);
    const heaps = g.props.filter(p => p.kind === 'hoard').length;
    return { theme: g.current.theme?.id, count: g.enemies.length, still, heaps };
  });
  expect(statues).toMatchObject({ theme: 'treasury', still: true, heaps: 4 });
  expect(statues.count).toBeGreaterThan(1);
  // a glyph chalked beside a heap: its blast scatters the heap's obols; taking one wakes every guardian
  await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game, h = g.props.find(p => p.kind === 'hoard')!;
    g.loot({ glyphs: 1 }); g.player.x = h.x + .9; g.player.z = h.z;
  });
  await page.keyboard.press('Space');
  const spill = await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game; g.sim(.1); g.player.x += 2.5; g.sim(2.2);
    const heaps = g.props.filter(p => p.kind === 'hoard').length, loot = g.pickups.filter(q => q.kind !== 'chest' && q.kind !== 'coffer');
    const statuesBefore = g.enemies.filter(e => e.statue).length;
    const coin = g.pickups.find(q => q.kind === 'coin' || q.kind === 'purse');
    if (coin) { g.player.x = coin.x; g.player.z = coin.z; } g.sim(.6);
    return { heaps, loot: loot.length, statuesBefore, statuesAfter: g.enemies.filter(e => e.statue).length, awake: g.enemies.filter(e => !e.asleep && !e.dead).length, toast: document.getElementById('toast')!.textContent };
  });
  expect(spill.heaps).toBe(3);
  expect(spill.loot).toBeGreaterThanOrEqual(1);
  expect(spill.statuesAfter).toBe(0);
  expect(spill.awake).toBeGreaterThan(0);
  expect(spill.toast).toMatch(/guardians wake/);
  await page.evaluate(() => (window as unknown as { __game: GT }).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-treasury.png' });
  expect(errors).toEqual([]);
  // the ferry landing: while the fight lasts the drowned climb out of the river; frozen, it keeps them
  errors = await start(page, '?room=landing_moor&floor=5&seed=LND1');
  const drowned = await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game; g.warp(1); g.player.invuln = 99;
    for (const e of g.enemies) e.asleep = true; // (the room's own foes held still: a frost foe spinning over the river freezes it)
    const n0 = g.enemies.filter(e => !e.dead).length; g.sim(6);
    const n1 = g.enemies.length, toast = document.getElementById('toast')!.textContent;
    g.pool('frost'); const frozen = g.pools.filter(p => p.kind === 'water').every(p => p.state === 'frozen');
    const n2 = g.enemies.length; g.sim(8);
    return { theme: g.current.theme?.id, rose: n1 - n0, toast, frozen, later: g.enemies.length - n2 };
  });
  expect(drowned).toMatchObject({ theme: 'landing', rose: 1, frozen: true, later: 0 });
  expect(drowned.toast).toMatch(/drowned/);
  await page.evaluate(() => (window as unknown as { __game: GT }).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-landing.png' });
  expect(errors).toEqual([]);
});

test('room variants: ambush, champion, dark and quiet', async ({ page }) => {
  const errors = await start(page, '?room=crypt_b&variant=ambush');
  const result = await page.evaluate(() => {
    type E = { champion?: boolean; type: string; maxHp: number; x: number; z: number };
    type Rm = { locked: boolean; ambush?: string; torches: { lit: boolean }[]; waves: { role: string }[][] };
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
      darkTorches: light.torches.reduce((a, b) => a + b, 0), hemi: light.hemi, quiet: g.enemies.map(e => e.type), quietRoles: g.current.waves.flat().map(f => f.role) };
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
  expect(result.quietRoles.every(r => r === 'R' || r === 'W')).toBe(true); // (walkers and flyers, never a heavy)
  expect(errors).toEqual([]);
});

test('mechanisms: a lit brazier sets bolts alight, runes take a school, bells stun, lodestones leap, a censer falls burning', async ({ page }) => {
  type P = { kind: string; x: number; z: number; lit: boolean; school: string | null; cd: number };
  type Foe = { x: number; z: number; hp: number; maxHp: number; status?: { burn: number; chill: number; shock: number; stun: number } };
  type G7 = {
    warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; keys: Set<string>; arrowOrder: string[];
    current: { bounds: { minX: number; minZ: number }; locked: boolean }; prop(kind: string, x: number, z: number): boolean; props: P[];
    element(kind: string, x: number, z: number): void; spawn(kind: string, x: number, z: number): Foe; enemies: Foe[];
    pools: { kind: string; state: string }[]; player: { x: number; z: number; vx: number; vz: number; hp: number; maxHp: number; invuln: number };
  };
  let errors = await start(page, '?room=treasure_plain');
  const result = await page.evaluate(() => {
    const g = (window as unknown as { __game: G7 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + .5, z: g.current.bounds.minZ + r + .5 });
    const put = (kind: string, c: number, r: number) => { const q = at(c, r); return g.prop(kind, q.x, q.z); };
    const stand = (c: number, r: number) => { const q = at(c, r); g.player.x = q.x; g.player.z = q.z; g.player.vx = g.player.vz = 0; };
    const find = (kind: string, c: number, r: number) => g.props.find(p => p.kind === kind && Math.hypot(p.x - at(c, r).x, p.z - at(c, r).z) < .6);
    const shootEast = (sec: number) => { g.keys.add('ArrowRight'); g.arrowOrder.push('ArrowRight'); g.sim(sec); g.keys.delete('ArrowRight'); g.arrowOrder.length = 0; g.sim(.5); };
    const clearFoes = () => { g.clearRoom(); g.sim(.1); };
    g.warp(1); g.clearRoom(); g.player.invuln = 99;
    const out: Record<string, unknown> = {};
    // a brazier lights to fire; a bolt through its flame charges the rune stone behind it with the ember school
    put('brazier', 3, 3); put('rune', 5, 3);
    out.brazierDark = find('brazier', 3, 3)?.lit;
    g.element('burn', at(3, 3).x, at(3, 3).z); out.brazierLit = find('brazier', 3, 3)?.lit;
    stand(1, 3); shootEast(.1); out.rune = find('rune', 5, 3)?.school; out.runeStands = !!find('rune', 5, 3);
    // a bolt set alight by a brazier sets roots alight where it strikes
    put('brazier', 3, 0); put('roots', 5, 0); g.element('burn', at(3, 0).x, at(3, 0).z);
    stand(1, 0); shootEast(.1); out.rootsLit = (g.props.find(p => p.kind === 'roots') as unknown as { burning: number } | undefined)?.burning ?? 0;
    // a dead tree burns longer than roots
    put('tree', 11, 4); g.element('burn', at(11, 4).x, at(11, 4).z); g.sim(4.5); out.treeAt4 = !!find('tree', 11, 4); g.sim(2.5); out.treeAt7 = !!find('tree', 11, 4);
    // frost reaching an uncharged rune stone charges it with frost; a charged one keeps its school
    put('rune', 11, 1); g.element('chill', at(11, 1).x, at(11, 1).z); out.frostRune = find('rune', 11, 1)?.school;
    g.element('shock', at(11, 1).x, at(11, 1).z); out.frostRuneKept = find('rune', 11, 1)?.school;
    // a bolt rings the bell: every foe reels, and the bell must settle before it rings again
    put('bell', 4, 5); const dummy = g.spawn('dummy', at(10, 6).x, at(10, 6).z); g.sim(1);
    stand(1, 5); shootEast(.1); out.stunned = (dummy.status?.stun ?? 0) > 0; out.bellCd = (find('bell', 4, 5)?.cd ?? 0) > 0;
    clearFoes();
    // shock on a lodestone leaps to the other, hurting and shocking the foe between
    put('lodestone', 2, 1); put('lodestone', 9, 1); const between = g.spawn('dummy', at(5, 1).x, at(5, 1).z); g.sim(1);
    stand(5, 6); g.element('shock', at(2, 1).x, at(2, 1).z);
    out.leapt = (between.status?.shock ?? 0) > 0; out.lodeCd = (find('lodestone', 9, 1)?.cd ?? 0) > 0; // (the dummy's health never drops)
    clearFoes();
    // a bolt through a censer's chain brings it down on the foe under it, and its oil spills burning
    out.censerHung = put('censer', 9, 6); const under = g.spawn('dummy', at(9, 6).x, at(9, 6).z - .8); g.sim(1);
    stand(6, 6); shootEast(.1); g.sim(.3);
    out.censer = !!g.props.find(p => p.kind === 'censer'); out.crushed = (under.status?.burn ?? 0) > 0;
    out.oil = g.pools.filter(p => p.kind === 'oil').map(p => p.state);
    stand(6, 4); g.sim(.05, true);
    return out;
  });
  expect(result).toMatchObject({
    brazierDark: false, brazierLit: true, rune: 'burn', runeStands: true, frostRune: 'chill', frostRuneKept: 'chill', treeAt4: true, treeAt7: false,
    stunned: true, bellCd: true, leapt: true, lodeCd: true, censerHung: true, censer: false, crushed: true, oil: ['burning'],
  });
  expect(result.rootsLit).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/mechanisms.png' });
  expect(errors).toEqual([]);

  // a charged rune stone pulses its school on the foes round it while the fight lasts
  errors = await start(page, '?room=rune_circle');
  const pulse = await page.evaluate(() => {
    const g = (window as unknown as { __game: G7 }).__game; g.warp(1);
    const rune = g.props.find(p => p.kind === 'rune')!;
    const dummy = g.spawn('dummy', rune.x + 1, rune.z);
    g.element('chill', rune.x, rune.z);
    for (let t = 0; t < 3; t += .5) { g.player.hp = g.player.maxHp; g.player.invuln = 99; g.sim(.5); }
    return { locked: g.current.locked, school: g.props.find(p => p.kind === 'rune' && p.x === rune.x && p.z === rune.z)?.school, chilled: (dummy.status?.chill ?? 0) > 0 };
  });
  expect(pulse).toEqual({ locked: true, school: 'chill', chilled: true });
  expect(errors).toEqual([]);
});

test('watching statues and sapping obelisks (M4.2): a statue in sight charges, marks the mage and strikes; a pillar breaks its gaze, a hex blinds it; an obelisk saps the cantrip and mana until its school breaks its ward', async ({ page }) => {
  type P = { kind: string; x: number; z: number; cd: number; charge: number; blind: number; aiming: boolean; ward: string | null; broken: boolean };
  type G12 = {
    warp(id: number): void; sim(sec: number, draw?: boolean): void; props: P[]; element(kind: string, x: number, z: number): void;
    enemies: { x: number; z: number; asleep?: boolean; spawn: number }[]; current: { bounds: { minX: number; minZ: number }; locked: boolean };
    player: { x: number; z: number; vx: number; vz: number; hp: number; invuln: number; mana: number }; sap: number;
    learn(id: string, slot: number): void; mana(n: number): void; cast(slot: number, dir?: { x: number; z: number }): boolean;
    keys: Set<string>; arrowOrder: string[]; bolts: { damage: number }[];
  };
  let errors = await start(page, '?room=gaze_watch&seed=GAZE01');
  const gaze = await page.evaluate(() => {
    const g = (window as unknown as { __game: G12 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + .5, z: g.current.bounds.minZ + r + .5 });
    const stand = (c: number, r: number) => { const q = at(c, r); g.player.x = q.x; g.player.z = q.z; g.player.vx = g.player.vz = 0; };
    const statue = (c: number) => g.props.find(p => p.kind === 'statue' && Math.abs(p.x - at(c, 1).x) < .6)!;
    g.warp(1); g.sim(.3);
    const corner = at(11, 5); for (const e of g.enemies) { e.asleep = true; e.spawn = 0; e.x = corner.x; e.z = corner.z; } // (the fight goes on, held still)
    stand(6, 5); g.player.invuln = 0; const hp = g.player.hp;
    g.sim(2.3); const marked = [statue(3).aiming, statue(9).aiming];
    g.sim(.8); const struck = hp - g.player.hp, rested = statue(3).cd > 0;
    g.player.invuln = 99; g.sim(1.6);
    g.element('hex', at(9, 1).x, at(9, 1).z);   // darkness blinds the east statue
    stand(1, 5); g.sim(3);                        // the pillar at (2, 3) stands between the mage and the west statue
    const hidden = { blindEast: statue(9).blind > 0, east: statue(9).charge, west: statue(3).charge };
    stand(3, 4); g.mana(999); g.learn('hex_bolt', 0); g.cast(0, { x: 0, z: -1 }); g.sim(1.5); // a Hex Bolt into the west statue
    return { marked, struck, rested, hidden, blindWest: statue(3).blind > 0, locked: g.current.locked };
  });
  expect(gaze).toMatchObject({ marked: [true, true], rested: true, hidden: { blindEast: true, east: 0 }, blindWest: true, locked: true });
  expect(gaze.struck).toBeGreaterThan(0);
  expect(gaze.hidden.west).toBeLessThan(.1);
  expect(errors).toEqual([]);

  errors = await start(page, '?room=obelisk_court&seed=OBEL01');
  const ob = await page.evaluate(() => {
    const g = (window as unknown as { __game: G12 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + .5, z: g.current.bounds.minZ + r + .5 });
    g.warp(1); g.sim(.3); g.player.invuln = 99;
    const corner = at(0, 0); for (const e of g.enemies) { e.asleep = true; e.spawn = 0; e.x = corner.x; e.z = corner.z; }
    const q = at(6, 5); g.player.x = q.x; g.player.z = q.z; g.player.vx = g.player.vz = 0;
    g.mana(100); g.sim(1);
    const sap = g.sap, drained = 100 - g.player.mana, toast = document.getElementById('toast')!.textContent;
    g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(.05); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0;
    const weak = g.bolts[0]?.damage ?? 0; g.sim(1);
    const o = () => g.props.find(p => p.kind === 'obelisk')!, ward = o().ward!;
    const kinds: Record<string, string> = { ember: 'burn', frost: 'chill', storm: 'shock', hallow: 'sanct', umbral: 'hex' };
    const wrong = Object.values(kinds).find(k => k !== kinds[ward])!;
    g.element(wrong, o().x, o().z); const held = !o().broken;
    g.element(kinds[ward], o().x, o().z); g.sim(.3);
    g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(.05); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0;
    const whole = g.bolts[0]?.damage ?? 0; g.sim(.05, true);
    return { ward, sap, drained, toast, held, broken: o().broken, sapAfter: g.sap, weak, whole };
  });
  expect(ob).toMatchObject({ sap: .5, held: true, broken: true, sapAfter: 1 });
  expect(ob.drained).toBeGreaterThan(2);
  expect(ob.toast).toMatch(/saps your magic/);
  expect(ob.weak).toBeGreaterThan(0);
  expect(ob.whole).toBeCloseTo(ob.weak * 2, 5);
  await page.screenshot({ path: 'test-results/smoke-obelisk.png' });
  expect(errors).toEqual([]);
});

test('rope bridges, currents and candles in water (M4.2): a bridge carries the mage over a chasm until fire burns it through; a current carries the mage and what lies in it, and stops when frozen; stands in water light it and go out to a shock', async ({ page }) => {
  type P = { kind: string; x: number; z: number; lit: boolean; burning: number };
  type GB = {
    warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; props: P[]; element(kind: string, x: number, z: number): void;
    spawn(kind: string, x: number, z: number): { x: number; z: number; dead?: boolean }; enemies: { asleep?: boolean; spawn: number }[];
    player: { x: number; z: number; vx: number; vz: number; hp: number; invuln: number }; pools: { kind: string; state: string; tiles: { x: number; z: number }[] }[];
    pool(what: string): void; flow: { dir: string | null; falls: number }; drop(kind: string, x?: number, z?: number): void; pickups: { kind: string; x: number; z: number }[];
    current: { template: { tiles: string[][] }; bounds: { minX: number; minZ: number } };
  };
  let errors = await start(page, '?room=rope_chasm&seed=BRIDGE1');
  const bridge = await page.evaluate(() => {
    const g = (window as unknown as { __game: GB }).__game, P = g.player;
    g.warp(1); g.clearRoom(); g.sim(.3); P.invuln = 0;
    const b = g.props.find(p => p.kind === 'bridge')!, tile = (x: number, z: number) => g.current.template.tiles[Math.floor(z - g.current.bounds.minZ)][Math.floor(x - g.current.bounds.minX)];
    P.x = b.x; P.z = b.z; P.vx = P.vz = 0; g.sim(.5); const held = Math.hypot(P.x - b.x, P.z - b.z) < .1; // (standing on it, over the chasm)
    const foe = g.spawn('rotling', b.x, b.z + .8); g.sim(.3); foe.x = b.x; foe.z = b.z + .8; P.z = b.z - .6; const hp = P.hp;
    g.element('burn', b.x, b.z); const burning = (g.props.find(p => p.kind === 'bridge' && p.x === b.x)?.burning ?? 0) > 0;
    const standing = () => g.props.some(p => p.kind === 'bridge' && p.x === b.x);
    for (let t = 0; t < 6 && standing(); t += .05) { P.x = b.x; P.z = b.z - .6; P.vx = P.vz = 0; foe.x = b.x; foe.z = b.z + .8; P.invuln = t < 3.8 ? 99 : 0; g.sim(.05); } // (on it as it burns through)
    g.sim(.3);
    return { held, burning, gone: !g.props.some(p => p.kind === 'bridge' && p.x === b.x), chasm: tile(b.x, b.z), fell: !!foe.dead, hurt: hp - P.hp, ledge: tile(P.x, P.z) };
  });
  expect(bridge).toMatchObject({ held: true, burning: true, gone: true, chasm: 'pit', fell: true, ledge: 'floor' });
  expect(bridge.hurt).toBeGreaterThan(0);
  await page.evaluate(() => (window as unknown as { __game: GB }).__game.sim(.05, true));
  await page.screenshot({ path: 'test-results/smoke-bridge.png' });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=mill_race&seed=RACE1');
  const race = await page.evaluate(() => {
    const g = (window as unknown as { __game: GB }).__game, P = g.player;
    g.warp(1); g.clearRoom(); g.sim(.3); P.invuln = 99;
    const w = g.pools.find(p => p.kind === 'water')!, top = w.tiles.reduce((a, t) => t.z < a.z ? t : a);
    P.x = top.x; P.z = top.z + .6; P.vx = P.vz = 0; const z0 = P.z; g.sim(1); const carried = P.z - z0;
    P.x = top.x + 5; P.z = top.z + 3; // (out of the race and away: obols would drift to the mage)
    g.drop('key', top.x, top.z + 1.2); g.sim(.8); const key = g.pickups.find(q => q.kind === 'key')!, kz0 = key.z; g.sim(1); const drifted = key.z - kz0;
    g.pool('frost'); P.x = top.x; P.z = top.z + .6; const z1 = P.z; g.sim(1); const frozen = P.z - z1;
    return { flow: g.flow, carried, drifted, frozen, state: g.pools.find(p => p.kind === 'water')!.state };
  });
  expect(race.flow).toEqual({ dir: 's', falls: 1 });
  expect(race.carried).toBeGreaterThan(1);
  expect(race.drifted).toBeGreaterThan(.8);
  expect(race.state).toBe('frozen');
  expect(Math.abs(race.frozen)).toBeLessThan(.1);
  expect(errors).toEqual([]);

  errors = await start(page, '?room=flooded_hall&seed=FLOOD1');
  const stands = await page.evaluate(() => {
    const g = (window as unknown as { __game: GB }).__game, P = g.player;
    g.warp(1); g.clearRoom(); g.sim(.3); P.invuln = 99;
    const wet = () => g.props.filter(p => p.kind === 'wetCandles');
    const count = wet().length;
    for (const p of wet()) g.element('burn', p.x, p.z);
    const lit = wet().filter(p => p.lit).length, reliquary = g.props.some(p => p.kind === 'reliquary');
    g.pool('shock'); g.sim(.2);
    return { count, lit, reliquary, afterShock: wet().filter(p => p.lit).length };
  });
  expect(stands).toEqual({ count: 4, lit: 4, reliquary: false, afterShock: 0 }); // (every stand lit opened the reliquary)
  await page.evaluate(() => (window as unknown as { __game: GB }).__game.sim(.05, true));
  expect(errors).toEqual([]);
});

test('candle stands: all lit, a reliquary opens with its hoard and a chapel blesses the next casts; the frozen mausoleum\'s dead wait in ice', async ({ page }) => {
  type P = { kind: string; x: number; z: number; lit: boolean };
  type E = { x: number; z: number; dead?: boolean; asleep?: boolean; entombed?: unknown; isBoss?: boolean };
  type G8 = {
    warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; keys: Set<string>; arrowOrder: string[];
    current: { cx: number; cz: number; bounds: { minX: number; minZ: number }; theme?: { id: string } }; props: P[]; pickups: unknown[]; enemies: E[];
    element(kind: string, x: number, z: number): void; burn(x: number, z: number, r?: number): void;
    player: { x: number; z: number; vx: number; vz: number; hp: number; maxHp: number; invuln: number; blessed: number; stats: { speed: number } };
  };
  let errors = await start(page, '?room=reliquary_gallery&variant=dark');
  const reliquary = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 & { lightLevels(): { hemi: number } } }).__game; g.warp(1); g.clearRoom(); g.player.invuln = 99; g.sim(2);
    const dark = g.lightLevels().hemi, stands = g.props.filter(p => p.kind === 'candles'), pickups = g.pickups.length;
    for (const s of stands.slice(1)) g.element('burn', s.x, s.z);
    const sealed = g.props.some(p => p.kind === 'reliquary'); g.element('burn', stands[0].x, stands[0].z); g.sim(.2);
    const opened = !g.props.some(p => p.kind === 'reliquary'), hoard = g.pickups.length - pickups;
    g.sim(2); const lifted = g.lightLevels().hemi;
    g.warp(0); g.sim(1); g.warp(1); g.sim(2); // the dark stays away once the candles are lit
    return { stands: stands.length, sealedWhileOneDark: sealed, opened, hoard, lifted: lifted > dark * 1.5, stays: g.lightLevels().hemi > dark * 1.5 };
  });
  expect(reliquary).toMatchObject({ stands: 4, sealedWhileOneDark: true, opened: true, lifted: true, stays: true });
  expect(reliquary.hoard).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);

  // a glyph's blast knocks the one dark stand over in burning wax; the others are lit, so the reliquary opens
  errors = await start(page, '?room=reliquary_gallery&loot=glyphs:1');
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game; g.warp(1); g.clearRoom(); g.player.invuln = 99; g.sim(.5);
    const stands = g.props.filter(p => p.kind === 'candles');
    for (const s of stands.slice(1)) g.element('burn', s.x, s.z);
    g.player.x = stands[0].x + .9; g.player.z = stands[0].z; g.player.vx = g.player.vz = 0;
  });
  await page.keyboard.press('Space');
  const knocked = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game;
    g.sim(.05); g.player.x += 4; g.sim(3);
    return { stands: g.props.filter(p => p.kind === 'candles').length, opened: !g.props.some(p => p.kind === 'reliquary') };
  });
  expect(knocked).toEqual({ stands: 3, opened: true });
  expect(errors).toEqual([]);

  // with every stand knocked over, nothing holds the seal: the reliquary breaks open (and nothing else happens)
  errors = await start(page, '?room=reliquary_gallery&variant=dark&loot=glyphs:4');
  const spots = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game; g.warp(1); g.clearRoom(); g.player.invuln = 99; g.sim(.5);
    return g.props.filter(p => p.kind === 'candles').map(p => ({ x: p.x + (p.x < g.current.cx ? .9 : -.9), z: p.z }));
  });
  for (const s of spots) {
    await page.evaluate(q => { const g = (window as unknown as { __game: G8 }).__game; g.player.x = q.x; g.player.z = q.z; g.player.vx = g.player.vz = 0; g.sim(.05); }, s);
    await page.keyboard.press('Space');
    await page.evaluate(() => { const g = (window as unknown as { __game: G8 }).__game; g.sim(.05); g.player.x = g.current.cx; g.player.z = g.current.cz + 2; g.sim(3); });
  }
  const bare = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 & { current: { candlesLit?: boolean } } }).__game;
    return { stands: g.props.filter(p => p.kind === 'candles').length, opened: !g.props.some(p => p.kind === 'reliquary'), lit: !!g.current.candlesLit };
  });
  expect(bare).toEqual({ stands: 0, opened: true, lit: false });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=chapel_nave');
  const blessing = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game; g.warp(1); g.clearRoom(); g.player.invuln = 99; g.sim(.5);
    for (const s of g.props.filter(p => p.kind === 'candles')) g.element('burn', s.x, s.z);
    const blessed = g.player.blessed, toast = document.getElementById('toast')!.textContent;
    g.player.x = g.current.cx; g.player.z = g.current.cz + 2;
    g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(.05); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0; g.sim(.5);
    return { blessed, toast, after: g.player.blessed };
  });
  expect(blessing).toEqual({ blessed: 6, toast: 'The candles bless your next 6 casts', after: 5 });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=mausoleum_tombs');
  const rime = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game; g.warp(1);
    const foes = g.enemies.filter(e => !e.isBoss), at = foes.map(e => ({ x: e.x, z: e.z }));
    g.player.x = g.current.bounds.minX + 1.5; g.player.z = g.current.bounds.minZ + 6.5; g.player.vx = g.player.vz = 0;
    for (let t = 0; t < 2; t += .5) { g.player.hp = g.player.maxHp; g.player.invuln = 99; g.sim(.5); }
    const frozen = foes.every((e, i) => e.entombed && e.asleep && Math.hypot(e.x - at[i].x, e.z - at[i].z) < .05);
    // rime underfoot: the mage slides on after letting go
    g.keys.add('KeyD'); g.sim(.6); g.keys.delete('KeyD'); const v0 = g.player.vx; g.sim(.15); const glide = g.player.vx / v0;
    // fire thaws one out of its ice
    const thawed = foes[0]; g.burn(thawed.x, thawed.z, .3); g.sim(.1);
    const runes = (g.props as unknown as { kind: string; school: string | null }[]).filter(p => p.kind === 'rune').map(p => p.school);
    return { theme: g.current.theme?.id, count: foes.length, frozen, glide, thawed: !thawed.asleep && !thawed.entombed, othersStill: foes.slice(1).every(e => e.entombed), runes };
  });
  expect(rime).toMatchObject({ theme: 'mausoleum', frozen: true, thawed: true, othersStill: true, runes: ['chill', 'chill'] }); // its rune stones hold frost
  expect(rime.count).toBeGreaterThan(1);
  expect(rime.glide).toBeGreaterThan(.45); // on stone the mage stops within a few steps (under .15 of the speed)
  expect(errors).toEqual([]);

  // its water is ice, until fire finds it
  errors = await start(page, '?room=mausoleum_hall');
  const ice = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 & { pools: { kind: string; state: string; tiles: { x: number; z: number }[] }[] } }).__game; g.warp(1); g.clearRoom(); g.sim(5);
    const before = g.pools.map(p => p.state), t = g.pools[0].tiles[0]; g.burn(t.x, t.z); g.sim(.1);
    return { before, after: g.pools.map(p => p.state) };
  });
  expect(ice).toEqual({ before: ['frozen'], after: ['still'] });
  expect(errors).toEqual([]);
});

test('a great hall packed with every object stays within its draw calls (their still parts are merged)', async ({ page }) => {
  type G9 = { warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; prop(kind: string, x: number, z: number): boolean;
    props: { kind: string; x: number; z: number }[]; element(kind: string, x: number, z: number): void; renderInfo(): { calls: number; triangles: number };
    current: { cx: number; cz: number; bounds: { minX: number; minZ: number }; template: { w: number; h: number; tiles: string[][] } }; player: { x: number; z: number; invuln: number } };
  const errors = await start(page, '?room=reliquary_great&seed=K3F9QX'); // (one seed: the same niches, doors and scatter every time)
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: G9 }).__game; g.warp(1); g.clearRoom(); g.player.invuln = 99;
    const kinds = ['bones', 'skulls', 'sacks', 'cask', 'rubble', 'roots', 'briar', 'web', 'glowcap', 'pew', 'desk', 'scrolls', 'brazier', 'candles', 'bell', 'rune', 'lodestone', 'censer', 'reliquary', 'tree'];
    const t = g.current.template, b = g.current.bounds; let k = 0;
    for (let row = 1; row < t.h - 1; row += 2) for (let c = 1; c < t.w - 1; c += 2) if (t.tiles[row][c] === 'floor' && g.prop(kinds[k % kinds.length], b.minX + c + .5, b.minZ + row + .5)) k++;
    for (const p of g.props) if (p.kind === 'brazier' || p.kind === 'candles') g.element('burn', p.x, p.z);
    g.player.x = g.current.cx; g.player.z = g.current.cz; g.sim(.5, true);
    return { placed: k, ...g.renderInfo() };
  });
  console.log(`packed great hall: ${r.placed} objects, ${r.calls} draw calls, ${r.triangles} triangles`);
  expect(r.placed).toBeGreaterThan(80);
  expect(r.calls).toBeLessThan(750); // 1,085 before objects' still parts were merged
  expect(errors).toEqual([]);
});

test('spell knowledge: a page shows its spell as far as it is known, learning and casting teach more, and it is kept between runs', async ({ page }) => {
  type Pg = { spell: string; x: number; z: number; gone?: boolean };
  type GK = { warp(id: number): void; clearRoom(): void; sim(sec: number, draw?: boolean): void; pages: Pg[]; knowledge: Record<string, string>;
    pagePanel: { spell: string | null; text: string }; cast(slot: number): boolean; mana(v: number): number; spawn(kind: string, x?: number, z?: number): unknown;
    know(id: string, st: string): void; forgetKnowledge(): void; player: { x: number; z: number; invuln: number; spells: (string | null)[]; spellCd: number[] } };
  const errors = await start(page, '?room=library_plain&seed=K3F9QX');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GK }).__game; g.warp(1); g.player.invuln = 99; g.sim(.3);
    const p = g.pages.filter(q => !q.gone)[0], before = g.knowledge[p.spell];
    // near the page: its panel, at the stage seen (name, school, what it does; the rest when it is learned)
    g.player.x = p.x; g.player.z = p.z + 1.4; g.sim(.1);
    const seen = { stage: g.knowledge[p.spell], panel: g.pagePanel.spell, text: g.pagePanel.text };
    // known well elsewhere (set by hand here, then set back): the panel adds what it sets off, and its lore
    g.know(p.spell, 'used'); g.sim(.05); const usedText = g.pagePanel.text; g.know(p.spell, 'seen'); g.sim(.05);
    // into the page: taken, and learned
    g.player.x = p.x; g.player.z = p.z; g.sim(.2);
    const learned = g.knowledge[p.spell], slot = g.player.spells.indexOf(p.spell);
    // cast it ten times: known well (a foe ahead for the spells that need one)
    g.spawn('dummy'); g.sim(1.2);
    for (let i = 0; i < 10; i++) { g.player.spellCd[slot] = 0; g.mana(200); g.cast(slot); g.sim(.3); }
    return { spell: p.spell, before, seen, usedText, learned, slot, used: g.knowledge[p.spell], toast: document.getElementById('toast')!.textContent };
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
  const kept = await page.evaluate(id => { const g = (window as unknown as { __game: GK }).__game; const k = g.knowledge[id]; g.forgetKnowledge(); return { k, after: g.knowledge[id] }; }, r.spell);
  expect(kept).toEqual({ k: 'used', after: 'unknown' });
  expect(again).toEqual([]);
});

test('made assets: the stand-ins load through the manifest and replace their placeholders, and turn off to compare', async ({ page }) => {
  type Info = { where: string; status: string; triangles?: number };
  type Rock = { urn?: string; mesh?: { traverse(f: (o: { name: string }) => void): void } };
  type GA = { sim(sec: number, draw?: boolean): void; assets: { on: boolean; list: Info[] }; useAssets(on: boolean): void; showAssets(): void;
    current: { rocks: Rock[]; spots: { visual: { traverse(f: (o: { name: string }) => void): void } }[] } };
  const errors = await start(page, '?seed=K3F9QX&give=ember_sigil&assets=/tests/fixtures/assets/assets.json');
  const look = () => page.evaluate(() => {
    const g = (window as unknown as { __game: GA }).__game;
    const made = (o?: { traverse(f: (o: { name: string }) => void): void }) => { let found = false; o?.traverse(c => { if (c.name === 'standin') found = true; }); return found; };
    const urns = g.current.rocks.filter(r => r.urn), spot = g.current.spots.at(-1);
    return { on: g.assets.on, urns: urns.map(r => made(r.mesh)), sigil: made(spot?.visual), icon: [...document.querySelectorAll('#items image')].some(i => !i.getAttribute('href')!.startsWith('data:')) }; // (the painted icon's file, not one the room kit renders)
  });
  const list = await page.evaluate(() => { const g = (window as unknown as { __game: GA }).__game; g.showAssets(); g.sim(.3, true); return g.assets.list; });
  expect(list.map(a => [a.where, a.status])).toEqual([['props.urn', 'loaded'], ['props.pedestal', 'loaded'], ['artifacts.ember_sigil', 'loaded'], ['floors.crypt.floor', 'loaded'], ['icons.ember_sigil', 'loaded']]);
  expect(list.find(a => a.where === 'props.urn')!.triangles).toBeLessThanOrEqual(2000); // (lowered to its budget by prepare-asset)
  expect(await look()).toEqual({ on: true, urns: [true, true], sigil: true, icon: true });
  await page.screenshot({ path: 'test-results/assets-made.png' });
  // off: the floor is built again with the placeholders
  await page.evaluate(() => { const g = (window as unknown as { __game: GA }).__game; g.useAssets(false); g.showAssets(); g.sim(.3, true); });
  expect(await look()).toEqual({ on: false, urns: [false, false], sigil: false, icon: false });
  expect(errors).toEqual([]);
});

test('made assets: missing and broken files, and ?assets=off, leave the placeholders with a warning, never an error', async ({ page }) => {
  type GA = { sim(sec: number, draw?: boolean): void; assets: { on: boolean; list: { where: string; status: string }[] }; showAssets(): void };
  const warnings: string[] = []; page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  const errors = await start(page, '?seed=K3F9QX&give=ember_sigil&assets=/tests/fixtures/assets/broken.json');
  const broken = await page.evaluate(() => { const g = (window as unknown as { __game: GA }).__game; g.showAssets(); g.sim(.1); return g.assets; }); // (the placeholders are built; no frame needed)
  expect(broken.on).toBe(false);
  expect(broken.list.map(a => a.status)).toEqual(['missing', 'failed', 'missing', 'missing']);
  expect(warnings.filter(w => w.startsWith('asset ')).length).toBe(4);
  const off = await start(page, '?seed=K3F9QX&assets=off');
  expect(await page.evaluate(() => (window as unknown as { __game: GA }).__game.assets.on)).toBe(false);
  expect(errors).toEqual([]); expect(off).toEqual([]);
});

test('the room kit: torches, braziers and candle stands built in code, the crypt\'s floor and walls in pixel art, and the old look to compare', async ({ page }) => {
  type Mat = { map?: { magFilter: number } };
  type O = { userData: Record<string, unknown>; visible: boolean; traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void };
  type Box = { x: number; z: number; prop: { kind: string; lit?: boolean; parts?: Record<string, O & { material?: { color: { getHex(): number } } }> } };
  type GR = { sim(sec: number, draw?: boolean): void; roomKit: boolean; useRoomKit(on: boolean): void; prop(kind: string, x: number, z: number): boolean;
    burn(x: number, z: number, r?: number): void; renderInfo(): { calls: number };
    current: { group: O; torches: { flame: O; lit: boolean }[]; props?: Box[] }; player: { x: number; z: number } };
  const errors = await start(page, '?seed=K3F9QX');
  const look = () => page.evaluate(() => {
    const g = (window as unknown as { __game: GR }).__game, p = g.player;
    g.prop('brazier', p.x - 1.5, p.z - 1.8); g.prop('candles', p.x + 1.5, p.z - 1.8);
    for (const b of g.current.props ?? []) g.burn(b.x, b.z, .3);
    g.sim(.6, true);
    let nearest = 0; g.current.group.traverse(o => { if ([o.material ?? []].flat().some(m => m.map?.magFilter === 1003)) nearest++; }); // (NearestFilter: the pixel floor and walls)
    const brazier = g.current.props!.find(b => b.prop.kind === 'brazier')!, stand = g.current.props!.find(b => b.prop.kind === 'candles')!;
    return {
      kit: g.roomKit, nearest, torches: g.current.torches.length, fire: g.current.torches.every(t => !!t.flame.userData.fire),
      brazier: { lit: !!brazier.prop.lit, fire: !!brazier.prop.parts?.flame.userData.fire, runes: brazier.prop.parts?.runes?.material?.color.getHex() ?? null },
      stand: { lit: !!stand.prop.lit, shown: !!stand.prop.parts?.flames.visible }, calls: g.renderInfo().calls,
    };
  });
  const kit = await look();
  expect(kit).toMatchObject({ kit: true, fire: true, brazier: { lit: true, fire: true, runes: 0xffa040 }, stand: { lit: true, shown: true } });
  expect(kit.torches).toBeGreaterThan(0);
  expect(kit.nearest).toBeGreaterThanOrEqual(2); // (the floor, and the walls)
  await page.screenshot({ path: 'test-results/room-kit.png' });
  // off: the floor is built again in the old look
  await page.evaluate(() => (window as unknown as { __game: GR }).__game.useRoomKit(false));
  const old = await look();
  expect(old).toMatchObject({ kit: false, nearest: 0, fire: false, brazier: { lit: true, fire: false, runes: null }, stand: { lit: true, shown: true } });
  // and ?kit=old starts in the old look
  const again = await start(page, '?seed=K3F9QX&kit=old');
  expect(await page.evaluate(() => (window as unknown as { __game: GR }).__game.roomKit)).toBe(false);
  expect(errors).toEqual([]); expect(again).toEqual([]);
});

test('the room kit\'s variety: rooms draw different kinds, and every kind of wall, floor, wall light and brazier builds on its floor', async ({ page }) => {
  type K = { wall: string; floor: string; torch: string; brazier: string };
  type GV = { sim(sec: number, draw?: boolean): void; kinds: K | null; forceKinds(k: Partial<K>): void; prop(kind: string, x: number, z: number): boolean;
    burn(x: number, z: number, r?: number): void; renderInfo(): { calls: number }; rooms(): { look: { kinds?: K; kit?: Record<string, Record<string, number>> } }[];
    current: { cx: number; cz: number } };
  for (const floor of [1, 2, 3, 4, 5]) { // (floors 4 and 5 from M4.1)
    const errors = await start(page, `?seed=K3F9QX&floor=${floor}`);
    const r = await page.evaluate(() => {
      const g = (window as unknown as { __game: GV }).__game, kit = g.rooms()[0].look.kit!;
      const drawn = new Set(g.rooms().map(room => room.look.kinds!.wall + '/' + room.look.kinds!.floor)); // (drawn per room, on its seed)
      const lists = { wall: Object.keys(kit.wall), floor: Object.keys(kit.floor), torch: Object.keys(kit.torch), brazier: Object.keys(kit.brazier) }, built: K[] = [], calls: number[] = [];
      for (let i = 0; i < 3; i++) {
        const want = { wall: lists.wall[i % lists.wall.length], floor: lists.floor[i % lists.floor.length], torch: lists.torch[i % lists.torch.length], brazier: lists.brazier[i % lists.brazier.length] };
        g.forceKinds(want); g.prop('brazier', g.current.cx, g.current.cz); g.burn(g.current.cx, g.current.cz, .3); g.sim(.3, true);
        built.push(g.kinds!); calls.push(g.renderInfo().calls);
      }
      g.forceKinds({});
      return { drawn: drawn.size, lists, built, calls };
    });
    expect(r.drawn, `floor ${floor}`).toBeGreaterThan(1);
    r.built.forEach((k, i) => expect(k).toEqual({ wall: r.lists.wall[i % r.lists.wall.length], floor: r.lists.floor[i % r.lists.floor.length], torch: r.lists.torch[i % r.lists.torch.length], brazier: r.lists.brazier[i % r.lists.brazier.length] }));
    for (const c of r.calls) expect(c).toBeLessThan(260);
    expect(errors).toEqual([]);
  }
});

test('the room kit\'s objects: every pile and object, urns, pedestals, pillars and tombs built in code on each floor, burning in the kit\'s fire, and the old look to compare', async ({ page }) => {
  type Mat = { vertexColors?: boolean };
  type O = { userData: Record<string, unknown>; traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void };
  type Box = { x: number; z: number; prop: { kind: string; flame?: O; mesh: O } };
  type GO = { sim(sec: number, draw?: boolean): void; objectsHere(): void; showAssets(): void; burn(x: number, z: number, r?: number): void;
    renderInfo(): { calls: number }; warp(id: number): void; clearRoom(): void;
    current: { props?: Box[]; rocks: { urn?: string; mesh?: O }[]; spots: { pedestal: O }[]; group: O } };
  const objects = () => page.evaluate(() => {
    const g = (window as unknown as { __game: GO }).__game;
    const painted = (o: O) => { let n = 0; o.traverse(q => { if ([q.material ?? []].flat().some(m => m.vertexColors)) n++; }); return n > 0; }; // (the room kit's pieces: colours in the vertices)
    g.objectsHere(); g.showAssets(); g.sim(.3, true);
    const props = g.current.props ?? [], urns = g.current.rocks.filter(r => r.urn), calls = g.renderInfo().calls;
    const sack = props.find(b => b.prop.kind === 'sacks')!; g.burn(sack.x, sack.z, .1); g.sim(.2, true);
    return {
      kinds: props.map(b => b.prop.kind).sort(), painted: props.filter(b => painted(b.prop.mesh)).length,
      urns: urns.length, urnsPainted: urns.filter(u => u.mesh && painted(u.mesh)).length, pedestal: painted(g.current.spots[g.current.spots.length - 1].pedestal),
      burning: !!sack.prop.flame, kitFire: !!sack.prop.flame?.userData.fire, calls,
    };
  });
  const kinds = ['boat', 'bones', 'briar', 'bridge', 'cask', 'desk', 'glowcap', 'hoard', 'pew', 'roots', 'rubble', 'sacks', 'scrolls', 'skulls', 'tree', 'web'];
  for (const floor of [1, 2, 3, 4, 5]) {
    const errors = await start(page, `?seed=K3F9QX&floor=${floor}`);
    const kit = await objects();
    expect(kit.kinds, `floor ${floor}`).toEqual(kinds);
    expect(kit).toMatchObject({ painted: 15, urns: 4, urnsPainted: 4, pedestal: true, burning: true, kitFire: true }); // (all but the cobweb, drawn in pixel art; two urns each from both buttons)
    expect(kit.calls).toBeLessThan(260);
    if (floor === 1) await page.screenshot({ path: 'test-results/room-kit-objects.png' });
    // a room of pillars and a tomb
    const room = await start(page, `?seed=K3F9QX&floor=${floor}&room=sarcophagus`);
    const pieces = await page.evaluate(() => {
      const g = (window as unknown as { __game: GO }).__game; g.warp(1); g.clearRoom(); g.sim(.2, true);
      let n = 0; g.current.group.traverse(o => { if ([o.material ?? []].flat().some(m => m.vertexColors)) n++; });
      return n;
    });
    expect(pieces).toBeGreaterThanOrEqual(9); // (four pillars, a tomb, urns and the torches)
    expect(errors).toEqual([]); expect(room).toEqual([]);
  }
  // off: the old looks, nothing painted
  await start(page, '?seed=K3F9QX&kit=old');
  expect(await objects()).toMatchObject({ kinds, painted: 3, urnsPainted: 0, pedestal: false, burning: true, kitFire: false }); // (M4.1's heap and boat and M4.2's bridge have only the kit's look)
});

test('the room kit\'s doors, gates, niches and pilasters: built in code, one mesh a gate, fewer draw calls, and the gate still rises', async ({ page }) => {
  type Mat = { vertexColors?: boolean };
  type O = { children: O[]; position: { y: number }; traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void };
  type GD = { sim(sec: number, draw?: boolean): void; warp(id: number): void; renderInfo(): { calls: number };
    current: { locked: boolean; doors: { style: string; bars: O; barH: number }[]; group: O } };
  const look = () => page.evaluate(() => {
    const g = (window as unknown as { __game: GD }).__game; g.sim(.3, true);
    const start = { calls: g.renderInfo().calls, gates: g.current.doors.filter(d => d.style !== 'secret').map(d => d.bars.children.length) };
    let painted = 0; g.current.group.traverse(o => { if ([o.material ?? []].flat().some(m => m.vertexColors)) painted++; });
    g.warp(1); g.sim(1.5, true); // (a fight: the doors lock, the gates rise)
    const shut = g.current.doors.filter(d => d.style !== 'secret').map(d => Math.abs(d.bars.position.y) < .02);
    return { ...start, painted, locked: g.current.locked, shut };
  });
  const errors = await start(page, '?seed=K3F9QX&room=crypt_a');
  const kit = await look();
  expect(kit.gates.every(n => n === 1)).toBe(true); // (a gate's bars, tips and rivets in one mesh)
  expect(kit.painted).toBeGreaterThan(6);
  expect(kit.locked).toBe(true); expect(kit.shut.every(Boolean)).toBe(true);
  await page.screenshot({ path: 'test-results/room-kit-doors.png' });
  const old = await start(page, '?seed=K3F9QX&room=crypt_a&kit=old');
  const before = await look();
  expect(before.gates.every(n => n > 1)).toBe(true); expect(before.shut.every(Boolean)).toBe(true);
  expect(kit.calls).toBeLessThan(before.calls - 20); // (each door and each wall's dressing in a call or two)
  expect(errors).toEqual([]); expect(old).toEqual([]);
});

test('the room kit\'s artifacts: every one built in code, the HUD\'s icons rendered from them, and the old ones to compare', async ({ page }) => {
  type GA = { sim(sec: number, draw?: boolean): void; artifactGallery(): number; takeArtifactGallery(): void; useRoomKit(on: boolean): void;
    current: { group: { userData: Record<string, unknown> } } };
  const icons = () => page.evaluate(async () => {
    const imgs = [...document.querySelectorAll('#items svg image')] as SVGImageElement[], paths = document.querySelectorAll('#items svg path').length;
    const sizes = await Promise.all(imgs.map(i => new Promise<number[]>(ok => { const im = new Image(); im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d')!; g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let solid = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 200) solid++;
      ok([im.width, solid]); }; im.src = i.getAttribute('href')!; })));
    return { images: imgs.length, paths, sizes };
  });
  const errors = await start(page, '?seed=K3F9QX&give=twin_staff,ember_sigil,rams_skull,leech_jar,crown_of_thorns,hungering_tome');
  const n = await page.evaluate(() => { const g = (window as unknown as { __game: GA }).__game; const n = g.artifactGallery(); g.sim(.3, true); return n; });
  expect(n).toBe(57); // (every artifact, as the room kit builds it)
  await page.screenshot({ path: 'test-results/room-kit-artifacts.png' });
  const kit = await icons();
  expect(kit.images).toBe(6); // (the twin staff, now the focus, and five more, each rendered from its model)
  for (const [w, solid] of kit.sizes) { expect(w).toBe(48); expect(solid).toBeGreaterThan(40); }
  await page.evaluate(() => { const g = (window as unknown as { __game: GA }).__game; g.takeArtifactGallery(); g.useRoomKit(false); });
  const old = await icons();
  expect(old.images).toBe(0); expect(old.paths).toBeGreaterThan(0); // (the drawn icons again)
  expect(errors).toEqual([]);
});

test('the room kit\'s pickups and special rooms: every drop, coffers and chests that still open, the shade, the library, the shrine\'s stones and the vault\'s lock built in code, and the old look to compare', async ({ page }) => {
  type Mat = { vertexColors?: boolean };
  type O = { traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void };
  const painted = (o?: O) => { let n = 0; o?.traverse(q => { if ([q.material ?? []].flat().some(m => m.vertexColors)) n++; }); return n; }; // (the room kit's pieces: colours in the vertices)
  // (evaluated as strings, so the counting function goes along with them)
  const drops = () => page.evaluate(`(() => {
    const g = window.__game, painted = ${painted.toString()};
    g.dropsHere(); g.sim(.8, true);
    const laid = g.pickups.map(p => ({ kind: p.kind, painted: painted(p.m) > 0 }));
    g.loot({ keys: 3 });
    for (const p of g.pickups.filter(p => p.kind === 'coffer' || p.kind === 'chest')) { g.player.x = p.x; g.player.z = p.z + .5; g.sim(.1, true); }
    g.sim(.8, true);
    const boxes = g.pickups.filter(p => p.kind === 'coffer' || p.kind === 'chest');
    return { laid, opened: boxes.filter(p => p.opened && !p.ward).length, boxes: boxes.length, spilled: g.pickups.length - laid.length };
  })()`) as Promise<{ laid: { kind: string; painted: boolean }[]; opened: number; boxes: number; spilled: number }>;
  const errors = await start(page, '?seed=K3F9QX');
  const kit = await drops();
  expect(kit.laid.map(d => d.kind).sort()).toEqual(['blackSoul', 'chest', 'chest', 'coffer', 'coin', 'glyph', 'halfHeart', 'hallowedSoul', 'heart', 'key', 'mana', 'paleSoul', 'purse', 'shard']);
  expect(kit.laid.every(d => d.painted)).toBe(true);
  expect(kit).toMatchObject({ boxes: 3, opened: 3 }); expect(kit.spilled).toBeGreaterThan(0); // (a key each for the chests; the gilded one's relic is an artifact, not a pickup)
  await page.screenshot({ path: 'test-results/room-kit-drops.png' });
  // the special rooms' pieces: the shade, the lecterns and bookcases, the offering stones, the vault's padlock
  const special = (q: string) => start(page, `?seed=K3F9QX${q}`).then(async errs => ({ errs, ...(await page.evaluate(`(() => {
    const g = window.__game, painted = ${painted.toString()}, outer = g.current.doors.find(d => d.seal)?.seal.mark;
    g.warp(1); g.sim(.5, true);
    const r = g.current;
    return { shade: painted(r.shade), eyes: r.shade?.userData.eyes?.length ?? 0, lecterns: (r.pages ?? []).filter(p => painted(p.g)).length, pages: (r.pages ?? []).length,
      stones: (r.shrine?.stones ?? []).filter(s => painted(s.g) > painted(s.visual)).length, lock: painted(outer) };
  })()`) as { shade: number; eyes: number; lecterns: number; pages: number; stones: number; lock: number }) }));
  for (const old of [false, true]) {
    const k = old ? '&kit=old' : '';
    const shop = await special(`&room=merchant_plain${k}`), library = await special(`&room=library_plain${k}`);
    const shrine = await special(`&floor=2&room=shrine_henge&give=chain_of_the_penitent,leaden_heart${k}`), vault = await special(`&room=vault_urns${k}`);
    for (const r of [shop, library, shrine, vault]) expect(r.errs).toEqual([]);
    expect(shop.eyes).toBe(2); expect(library.pages).toBe(3);
    if (old) { expect([shop.shade, library.lecterns, shrine.stones, vault.lock]).toEqual([0, 0, 0, 0]); continue; }
    expect(shop.shade).toBeGreaterThan(0); expect(library.lecterns).toBe(3); expect(shrine.stones).toBe(2); expect(vault.lock).toBeGreaterThan(0);
  }
  // off: the old pickups, nothing painted
  await start(page, '?seed=K3F9QX&kit=old');
  const old = await drops();
  expect(old.laid.filter(d => d.painted).map(d => d.kind).sort()).toEqual(['blackSoul', 'hallowedSoul', 'paleSoul', 'shard']); // (M4.1's items have only the kit's look)
  expect(old).toMatchObject({ boxes: 3, opened: 3 });
  expect(errors).toEqual([]);
});

test('foes in code (M4): the Sporeling fills the fights, hops, swells and puffs spores that sting and dim the sight, takes half again from Ember and half from Frost, and the bestiary keeps what was found', async ({ page }) => {
  type Foe = { type: string; state: string; tele?: number; hp: number; mats: unknown[]; contact: number };
  type GS = { sim(sec: number, draw?: boolean): void; warp(id: number): void; renderInfo(): { calls: number }; forgetBestiary(): void;
    hit(i: number, dmg: number, school?: string): number; bestiary: Record<string, { met: boolean; weak: boolean; resist: boolean }>;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; dim: number }; enemies: Foe[];
    current: { spores?: { x: number; z: number; sting?: number }[] } };
  const errors = await start(page, '?seed=K3F9QX&foe=sporeling');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS }).__game; g.forgetBestiary();
    g.player.maxHp = g.player.hp = 60; // (the test stands among them)
    g.warp(1); g.sim(.8, true);
    const kinds = [...new Set(g.enemies.map(e => e.type))], calls = g.renderInfo().calls, n = g.enemies.length;
    let swelled = false, puffed = false;
    for (let i = 0; i < 100 && !puffed; i++) { g.sim(.1); swelled ||= g.enemies.some(e => e.state === 'swell' && (e.tele ?? 0) > 0); puffed = (g.current.spores ?? []).some(s => s.sting); }
    const cloud = (g.current.spores ?? []).find(s => s.sting)!;
    // (a sting lands only on a mage not reeling from another blow: the Sporeling that puffed it stands in its cloud, and
    // its touch would come first, so the foes touch no one while the mage steps in)
    for (const f of g.enemies) f.contact = 0;
    g.player.x = cloud.x; g.player.z = cloud.z; g.player.invuln = 0; g.sim(.1);
    const dim = g.player.dim, e = g.enemies[0];
    const before = e.hp; g.hit(0, 2, 'ember'); const weak = before - e.hp;
    const mid = e.hp; g.hit(0, 2, 'frost'); const resist = mid - e.hp;
    const last = e.hp; g.hit(0, 2); const plain = last - e.hp;
    return { kinds, calls, n, swelled, puffed, dim, weak, resist, plain, book: g.bestiary.sporeling, mats: e.mats.length };
  });
  expect(r.kinds).toEqual(['sporeling']); expect(r.n).toBeGreaterThan(0);
  expect(r.calls).toBeLessThan(90 + r.n * 20); // (each foe's still parts merged: about a dozen calls, not fifty)
  expect(r.swelled).toBe(true); expect(r.puffed).toBe(true);
  expect(r.dim).toBeGreaterThan(1);
  expect(r.weak).toBeCloseTo(3); expect(r.resist).toBeCloseTo(1); expect(r.plain).toBeCloseTo(2);
  expect(r.book).toEqual({ met: true, weak: true, resist: true });
  expect(r.mats).toBeGreaterThan(0); // (its merged surfaces flash when hit)
  await page.screenshot({ path: 'test-results/foes-sporeling.png' });
  expect(errors).toEqual([]);
});

test('foes in code (M4): floor 1\'s moth loops, scatters light and is lured by a lit brazier; the beetle charges, is stunned against a wall and throws a spark; the mimic waits among the urns, wakes, spits embers and shuts', async ({ page }) => {
  type Foe = { type: string; state: string; x: number; z: number; hp: number; contact: number; guard?: number; fireT?: number; status?: { burn?: number } };
  type GF = { sim(sec: number, draw?: boolean): void; warp(id: number): void; hit(i: number, dmg: number, school?: string): number;
    prop(kind: string, x?: number, z?: number): boolean; props: { kind: string; x: number; z: number; lit: boolean }[]; element(kind: string, x: number, z: number): void;
    player: { x: number; z: number; hp: number; maxHp: number }; enemies: Foe[]; shots: { fire?: boolean }[];
    current: { cx: number; cz: number; rocks: { x: number; z: number; urn?: string }[] } };
  // the moth
  const errors = await start(page, '?seed=K3F9QX&foe=vesperMoth');
  const moth = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.8);
    let flares = 0, motes = 0;
    for (let i = 0; i < 90; i++) { const was = g.shots.length; g.sim(.1); flares += g.enemies.filter(e => e.state === 'flare').length ? 1 : 0; motes = Math.max(motes, g.shots.length - was); }
    // a lit brazier in the middle: the moths come to it
    const c = g.current; g.prop('brazier', c.cx, c.cz); const b = g.props.find(p => p.kind === 'brazier')!; g.element('burn', b.x, b.z);
    let near = 0, burned = false;
    for (let i = 0; i < 300 && !(near && burned); i++) { g.sim(.1); near = Math.max(near, g.enemies.filter(e => Math.hypot(e.x - b.x, e.z - b.z) < 1.6).length); burned ||= g.enemies.some(e => (e.status?.burn ?? 0) > 0); } // (the lure and the singeing are chance: time enough for both)
    return { flares, motes, lit: g.props.find(p => p.kind === 'brazier')!.lit, near, burned };
  });
  expect(moth.flares).toBeGreaterThan(0); expect(moth.motes).toBeGreaterThanOrEqual(6);
  expect(moth.lit).toBe(true); expect(moth.near).toBeGreaterThan(0); expect(moth.burned).toBe(true);
  // the beetle
  const e2 = await start(page, '?seed=K3F9QX&foe=runeBeetle');
  const beetle = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.5);
    const seen = new Set<string>(); let sparks = 0;
    for (let i = 0; i < 200 && !(seen.has('stun') && sparks); i++) { g.sim(.05); g.enemies.forEach(e => seen.add(e.state)); if (g.enemies.some(e => e.state === 'stun' && e.fireT === 1)) sparks++; } // (thrown once a stun)
    return { seen: [...seen].sort(), sparks };
  });
  expect(beetle.seen).toEqual(expect.arrayContaining(['wander', 'tell', 'charge', 'stun'])); expect(beetle.sparks).toBeGreaterThan(0);
  // the mimic
  const e3 = await start(page, '?seed=K3F9QX&room=crypt_b&foe=urnMimic');
  const mimic = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.5);
    const urns = g.current.rocks.filter(r => r.urn);
    const hidden = g.enemies.every(e => e.state === 'hidden' && e.contact === 0);
    const byUrns = g.enemies.every(e => urns.some(u => Math.hypot(u.x - e.x, u.z - e.z) < 1.6));
    const m = g.enemies[0]; g.player.x = m.x + 1.2; g.player.z = m.z; g.sim(.1);
    const woke = m.state, states = new Set<string>(); let embers = 0;
    for (let i = 0; i < 80 && !states.has('shut'); i++) { g.sim(.05); states.add(m.state); embers = Math.max(embers, g.shots.filter(s => s.fire).length); }
    const guard = m.guard, before = m.hp; g.hit(0, 2); const took = before - m.hp;
    return { hidden, byUrns, woke, states: [...states].sort(), embers, guard, took, others: g.enemies.slice(1).some(e => e.state === 'hidden') };
  });
  expect(mimic.hidden).toBe(true); expect(mimic.byUrns).toBe(true);
  expect(mimic.woke).toBe('peek'); expect(mimic.states).toEqual(expect.arrayContaining(['peek', 'hop', 'shut']));
  expect(mimic.embers).toBeGreaterThanOrEqual(3); // (a fan of embers, each lighting what it passes)
  expect(mimic.guard).toBe(.5); expect(mimic.took).toBeCloseTo(1); // (shut, its clay turns half a blow)
  expect(mimic.others).toBe(true); // (those the mage didn't come near wait on)
  expect([...errors, ...e2, ...e3]).toEqual([]);
});

test('foes in code (M4): floor 2\'s toad leaps and breathes cold that chills; the lurker lives in water, rises, spits and dives out of reach, and is trapped when its pool freezes; the jelly drifts close and pulses light', async ({ page }) => {
  type Foe = { type: string; state: string; x: number; z: number; hp: number; hidden?: boolean; model: { position: { y: number } } };
  type GF = { sim(sec: number, draw?: boolean): void; warp(id: number): void; hit(i: number, dmg: number, school?: string): number; pool(what: string): void;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; chill: number }; enemies: Foe[]; shots: { chill?: number }[];
    current: { pools?: { kind: string; state: string }[] } };
  // the toad
  const errors = await start(page, '?seed=K3F9QX&floor=2&foe=mireToad');
  const toad = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.5);
    const seen = new Set<string>(); let high = 0, cold = 0;
    for (let i = 0; i < 300 && !(seen.has('puff') && cold); i++) {
      const e = g.enemies[0]; g.player.x = e.x + 2.2; g.player.z = e.z; // (close enough for it to breathe)
      g.sim(.05); seen.add(e.state); high = Math.max(high, e.model.position.y); cold = Math.max(cold, g.shots.filter(s => s.chill).length);
    }
    for (let i = 0; i < 20 && !g.player.chill; i++) { g.player.invuln = 0; g.sim(.05); } // (in the cone's way)
    return { seen: [...seen].sort(), high, cold, chilled: g.player.chill > 0 };
  });
  expect(toad.seen).toEqual(expect.arrayContaining(['sit', 'crouch', 'leap', 'puff'])); expect(toad.high).toBeGreaterThan(.3);
  expect(toad.cold).toBeGreaterThanOrEqual(3); expect(toad.chilled).toBe(true);
  // the lurker
  const e2 = await start(page, '?seed=K3F9QX&floor=2&foe=cisternLurker');
  const lurker = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.3);
    const e = g.enemies[0], water = (g.current.pools ?? []).some(p => p.kind === 'water'), startHidden = !!e.hidden;
    const hpUnder = e.hp; g.hit(0, 3); const tookUnder = hpUnder - e.hp;
    let upAt = -1; for (let i = 0; i < 100 && e.state !== 'up'; i++) { g.sim(.05); if (e.state === 'up') upAt = i; }
    const hpUp = e.hp; g.hit(0, 3); const tookUp = hpUp - e.hp; // (storm-free: a plain hit)
    let dove = false; for (let i = 0; i < 100 && !dove; i++) { g.sim(.05); dove = e.state === 'under' && !!e.hidden; }
    g.pool('frost'); g.sim(.1); // its water freezes over: up it comes, and there it stays
    const trapped = e.state, trappedHidden = !!e.hidden;
    return { water, startHidden, tookUnder, upAt, tookUp, dove, trapped, trappedHidden };
  });
  expect(lurker.water).toBe(true); expect(lurker.startHidden).toBe(true); expect(lurker.tookUnder).toBe(0);
  expect(lurker.upAt).toBeGreaterThanOrEqual(0); expect(lurker.tookUp).toBeCloseTo(3);
  expect(lurker.dove).toBe(true); expect(lurker.trapped).toBe('trapped'); expect(lurker.trappedHidden).toBe(false);
  // the jelly
  const e3 = await start(page, '?seed=K3F9QX&floor=2&foe=lanternJelly');
  const jelly = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.3);
    const e = g.enemies[0], before = g.player.hp; let glowed = false;
    for (let i = 0; i < 160 && g.player.hp === before; i++) { g.player.x = e.x + 1; g.player.z = e.z; g.player.invuln = 0; g.sim(.05); glowed ||= e.state === 'glow'; }
    return { glowed, hurt: before - g.player.hp, flying: e.model.position.y };
  });
  expect(jelly.glowed).toBe(true); expect(jelly.hurt).toBeGreaterThan(0);
  expect([...errors, ...e2, ...e3]).toEqual([]);
});

test('foes in code (M4): floor 3\'s salamander lays burning ground that burns the mage; the imp blinks about and its hex drains mana; the drakeling (one a room) breathes rime, takes to its wings and lands in a ring of frost', async ({ page }) => {
  type Foe = { type: string; state: string; x: number; z: number; hidden?: boolean; flying: boolean; model: { position: { y: number }; visible: boolean } };
  type GF = { sim(sec: number, draw?: boolean): void; warp(id: number): void; burningGround: number;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; chill: number; mana: number }; enemies: Foe[]; shots: { chill?: number; hex?: number }[] };
  // the salamander
  const errors = await start(page, '?seed=K3F9QX&floor=3&foe=cinderSalamander');
  const sala = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.5);
    let ground = 0; for (let i = 0; i < 40; i++) { g.sim(.05); ground = Math.max(ground, g.burningGround); }
    const e = g.enemies[0]; g.player.x = e.x; g.player.z = e.z; g.player.invuln = 0; const hp = g.player.hp;
    for (let i = 0; i < 4; i++) { g.player.x = e.x; g.player.z = e.z; g.sim(.05); }
    return { ground, burned: hp - g.player.hp };
  });
  expect(sala.ground).toBeGreaterThan(3); expect(sala.burned).toBeGreaterThan(0);
  // the imp
  const e2 = await start(page, '?seed=K3F9QX&floor=3&foe=hexImp&spells=cinder_lance');
  const imp = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.3);
    let hidden = false, invisible = false, from = 0, hexes = 0;
    for (let i = 0; i < 160 && !(hidden && hexes && from); i++) { // (every imp in the room: any of them may throw first)
      g.sim(.05); hexes = Math.max(hexes, g.shots.filter(s => s.hex).length);
      for (const e of g.enemies) {
        if (e.state === 'gone') { hidden ||= !!e.hidden; invisible ||= !e.model.visible; }
        if (e.state === 'raise' && !from) from = Math.hypot(e.x - g.player.x, e.z - g.player.z);
      }
    }
    // stand in a hex's way
    const mana = g.player.mana = 100; let drained = 0; // (full, so no mana comes back meanwhile)
    for (const f of g.enemies) (f as Foe & { contact: number }).contact = 0; // (an imp's touch, beside its fresh throw, would come first)
    for (let i = 0; i < 160 && drained < 5; i++) { const s = g.shots.find(s => s.hex) as { x?: number; z?: number } | undefined; if (s) { g.player.x = s.x!; g.player.z = s.z!; g.player.invuln = 0; } g.sim(.05); drained = mana - g.player.mana; }
    return { hidden, invisible, from, hexes, drained };
  });
  expect(imp.hidden).toBe(true); expect(imp.invisible).toBe(true); expect(imp.hexes).toBeGreaterThan(0);
  expect(imp.from).toBeGreaterThan(1.5); expect(imp.drained).toBeGreaterThanOrEqual(5); // (a hex's drain)
  // the drakeling: one a room on its floor, however many heavies the template has
  const e3 = await start(page, '?seed=K3F9QX&floor=3&room=twin_hounds');
  const count = await page.evaluate(() => { const g = (window as unknown as { __game: GF }).__game; g.warp(1); g.sim(.3); return g.enemies.filter(e => e.type === 'rimeDrakeling').length; });
  expect(count).toBeLessThanOrEqual(1);
  const e4 = await start(page, '?seed=K3F9QX&floor=3&foe=rimeDrakeling');
  const drake = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 90; g.warp(1); g.sim(.3);
    const e = g.enemies[0], seen = new Set<string>(); let rime = 0, high = 0, flew = false;
    for (let i = 0; i < 400 && !(seen.has('inhale') && seen.has('land') && rime); i++) {
      g.player.x = e.x + 2.5; g.player.z = e.z; g.sim(.05); seen.add(e.state); rime = Math.max(rime, g.shots.filter(s => s.chill).length);
      high = Math.max(high, e.model.position.y); flew ||= e.flying;
    }
    return { seen: [...seen].sort(), rime, high, flew };
  });
  expect(drake.seen).toEqual(expect.arrayContaining(['stalk', 'inhale', 'takeoff', 'fly', 'land']));
  expect(drake.rime).toBeGreaterThanOrEqual(7); expect(drake.high).toBeGreaterThan(.5); expect(drake.flew).toBe(true);
  expect([...errors, ...e2, ...e3, ...e4]).toEqual([]);
});

test('foes in code (M4.1): floor 4\'s wickmouse darts and drops its candle burning; the chime bat marks the ground for a spark; the gargoyle perches as stone and pounces; the fawn heals', async ({ page }) => {
  type Foe = { type: string; state: string; x: number; z: number; hp: number; maxHp: number; tele?: number };
  type GF = { sim(sec: number, draw?: boolean): void; warp(id: number): void; hit(i: number, dmg: number, school?: string): number; prop(kind: string, x: number, z: number): boolean;
    props: { kind: string; x: number; z: number; lit: boolean }[]; spellFx: { strikes: number };
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number }; enemies: Foe[]; shots: { chill?: number }[] };
  // the wickmouse
  const e1 = await start(page, '?seed=K3F9QX&floor=4&foe=wickmouse');
  const mouse = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.8);
    const seen = new Set<string>(); for (let i = 0; i < 100; i++) { g.sim(.05); g.enemies.forEach(e => seen.add(e.state)); }
    const e = g.enemies[0]; g.prop('brazier', e.x + .4, e.z); const cold = g.props.find(p => p.kind === 'brazier')!.lit; // (its candle falls on what burns)
    g.hit(0, 99); g.sim(.2);
    return { seen: [...seen].sort(), cold, lit: g.props.find(p => p.kind === 'brazier')!.lit };
  });
  expect(mouse.seen).toEqual(expect.arrayContaining(['dart', 'hide', 'peep'])); expect(mouse).toMatchObject({ cold: false, lit: true });
  // the chime bat: stand still, and the spark finds the mark
  const e2 = await start(page, '?seed=K3F9QX&floor=4&foe=chimeBat');
  const bat = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.8);
    let chimed = false, struck = 0; const hp = g.player.hp;
    for (let i = 0; i < 160 && !(chimed && struck); i++) { g.player.invuln = 0; g.sim(.05); chimed ||= g.enemies.some(e => e.state === 'chime'); struck = Math.max(struck, g.spellFx.strikes); }
    return { chimed, struck, hurt: hp - g.player.hp };
  });
  expect(bat.chimed).toBe(true); expect(bat.struck).toBeGreaterThan(0); expect(bat.hurt).toBeGreaterThan(0);
  // the gargoyle: stone turns most of a blow; awake, it pounces and lands in frost
  const e3 = await start(page, '?seed=K3F9QX&floor=4&foe=gargoyleWhelp');
  const garg = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 90; g.warp(1); g.sim(.8);
    const e = g.enemies[0], state0 = e.state, hp0 = e.hp; g.hit(0, 10); const stoneTook = hp0 - e.hp;
    const seen = new Set<string>(); let frost = 0;
    for (let i = 0; i < 200; i++) { g.player.invuln = 0; g.sim(.05); g.enemies.forEach(f => seen.add(f.state)); frost = Math.max(frost, g.shots.filter(s => s.chill).length); }
    return { state0, stoneTook, seen: [...seen].sort(), frost };
  });
  expect(garg.state0).toBe('stone'); expect(garg.stoneTook).toBeCloseTo(2); // (a fifth of the blow)
  expect(garg.seen).toEqual(expect.arrayContaining(['stone', 'wake', 'crouch', 'leap', 'settle'])); expect(garg.frost).toBeGreaterThanOrEqual(6);
  // the fawn heals the hurt round it
  const e4 = await start(page, '?seed=K3F9QX&floor=4&foe=moonstagFawn');
  const fawn = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.warp(1); g.sim(.8);
    g.player.x = g.enemies[0].x + 6; // (far off, so they gather rather than flee)
    g.hit(0, 5); const hurt = g.enemies[0].hp; let bowed = false;
    for (let i = 0; i < 200 && g.enemies[0].hp <= hurt; i++) { g.sim(.05); bowed ||= g.enemies.some(e => e.state === 'bow'); }
    return { bowed, healed: g.enemies[0].hp - hurt, n: g.enemies.length };
  });
  expect(fawn.n).toBeGreaterThan(1); expect(fawn.bowed).toBe(true); expect(fawn.healed).toBeGreaterThan(0);
  for (const e of [e1, e2, e3, e4]) expect(e).toEqual([]);
});

test('foes in code (M4.1): floor 5\'s rootling burrows and bursts up (fire keeps it up); the storm ray lays sparks; the void mote swallows bolts and spills them; the tortoise hides, spins and lies dizzy', async ({ page }) => {
  type Foe = { type: string; state: string; x: number; z: number; hp: number; hidden?: boolean };
  type GF = { sim(sec: number, draw?: boolean): void; warp(id: number): void; hit(i: number, dmg: number, school?: string, by?: string): number; inflict(s: Record<string, number>): void;
    sparkGround: number; player: { x: number; z: number; hp: number; maxHp: number; invuln: number }; enemies: Foe[]; shots: { chill?: number }[] };
  // the rootling
  const e1 = await start(page, '?seed=K3F9QX&floor=5&foe=rootling');
  const root = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.8);
    const seen = new Set<string>(); let hid = false;
    for (let i = 0; i < 160; i++) { g.player.invuln = 0; g.sim(.05); g.enemies.forEach(e => { seen.add(e.state); hid ||= !!e.hidden && e.state === 'under'; }); }
    // burning, they stay above ground
    for (let i = 0; i < 30 && g.enemies.some(e => e.hidden); i++) g.sim(.1);
    g.inflict({ burn: 6 }); let dug = false; for (let i = 0; i < 60; i++) { g.sim(.05); dug ||= g.enemies.some(e => e.state === 'under' || e.state === 'dig'); }
    return { seen: [...seen].sort(), hid, dug };
  });
  expect(root.seen).toEqual(expect.arrayContaining(['dig', 'rumble', 'under', 'up'])); expect(root.hid).toBe(true); expect(root.dug).toBe(false);
  // the storm ray
  const e2 = await start(page, '?seed=K3F9QX&floor=5&foe=stormRay');
  const ray = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.8);
    let passed = false, sparks = 0; for (let i = 0; i < 120 && !(passed && sparks); i++) { g.sim(.05); passed ||= g.enemies.some(e => e.state === 'pass'); sparks = Math.max(sparks, g.sparkGround); }
    return { passed, sparks };
  });
  expect(ray.passed).toBe(true); expect(ray.sparks).toBeGreaterThan(2);
  // the void mote: the cantrip's bolts are swallowed, five spill back, then it is open to them
  const e3 = await start(page, '?seed=K3F9QX&floor=5&foe=voidMote');
  const mote = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 60; g.warp(1); g.sim(.8);
    const e = g.enemies[0], hp0 = e.hp; for (let i = 0; i < 5; i++) g.hit(0, 3, undefined, 'cantrip');
    const swallowed = hp0 - e.hp, shots0 = g.shots.length; let spilt = 0;
    for (let i = 0; i < 30 && e.state !== 'spent'; i++) { g.sim(.05); spilt = Math.max(spilt, g.shots.length - shots0); }
    const hp1 = e.hp; g.hit(0, 2, undefined, 'cantrip'); const open = hp1 - e.hp;
    const hp2 = e.hp; g.sim(3.2); g.hit(0, 2); const spell = hp2 - e.hp; // (spells hurt it as ever)
    return { swallowed, spilt, state: e.state, open, spell };
  });
  expect(mote.swallowed).toBe(0); expect(mote.spilt).toBeGreaterThanOrEqual(8); expect(mote.open).toBeCloseTo(3); expect(mote.spell).toBeCloseTo(2);
  // the tortoise
  const e4 = await start(page, '?seed=K3F9QX&floor=5&foe=lanternTortoise');
  const tort = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game; g.player.maxHp = g.player.hp = 90; g.warp(1); g.sim(.8);
    const seen = new Set<string>(); let shut = -1, dizzy = -1;
    for (let i = 0; i < 200 && (shut < 0 || dizzy < 0); i++) {
      g.player.invuln = 0; g.sim(.05); g.enemies.forEach(e => seen.add(e.state));
      const e = g.enemies[0], hp = e.hp;
      if (shut < 0 && e.state === 'hide') { g.hit(0, 10); shut = hp - e.hp; } else if (dizzy < 0 && e.state === 'dizzy') { g.hit(0, 10); dizzy = hp - e.hp; }
    }
    return { seen: [...seen].sort(), shut, dizzy };
  });
  expect(tort.seen).toEqual(expect.arrayContaining(['dizzy', 'hide', 'spin', 'walk'])); expect(tort.shut).toBeCloseTo(1.5); expect(tort.dizzy).toBeCloseTo(15);
  for (const e of [e1, e2, e3, e4]) expect(e).toEqual([]);
});

test('the pixel look: on from the URL, drawn with outlines and light in bands, then off again, and the enemy and spell effect options, without errors', async ({ page }) => {
  type Look = { lines: number; outline: boolean; bands: boolean };
  type GP = { sim(sec: number, draw?: boolean): void; pixelLook: Look; setPixelLook(l: Partial<Look>): void; renderInfo(): { calls: number } };
  const errors = await start(page, '?seed=K3F9QX&pixel=270');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GP }).__game, out: { look: Look; calls: number }[] = [];
    for (const l of [{}, { outline: true, bands: true }, { lines: 360, outline: false }, { lines: 0 }]) {
      g.setPixelLook(l); g.sim(.1, true); out.push({ look: g.pixelLook, calls: g.renderInfo().calls });
    }
    return out;
  });
  expect(r[0].look.lines).toBe(270);
  expect(r[1].look).toEqual({ lines: 270, outline: true, bands: true });
  expect(r[2].look.lines).toBe(360); expect(r[3].look.lines).toBe(0);
  expect(r[1].calls).toBe(r[3].calls + 1); // (the scene, then the blow-up to the window)
  // the enemy model options (looks only) stand ahead of the mage and idle, in the pixel look
  const shown = await page.evaluate(() => {
    const g = (window as unknown as { __game: GP & { modelOptions(): { id: string }[] } }).__game;
    g.setPixelLook({ lines: 270 }); const at = g.modelOptions(); g.sim(.5, true); g.setPixelLook({ lines: 0 }); return at.map(a => a.id);
  });
  expect(shown.length).toBe(23); // (M4.2: the five Wardlings too)
  // and the familiar options (the owner's drawings built in code): the Rune Fox
  const familiars = await page.evaluate(() => {
    const g = (window as unknown as { __game: GP & { takeModelOptions(): void; familiarOptions(): { id: string }[] } }).__game;
    g.takeModelOptions(); g.setPixelLook({ lines: 360 }); const at = g.familiarOptions(); g.sim(.5, true); g.setPixelLook({ lines: 0 }); return at.map(a => a.id);
  });
  expect(familiars).toEqual(['runeFox']);
  // and the spell effect options, each playing its cast over and over
  const played = await page.evaluate(() => {
    const g = (window as unknown as { __game: GP & { takeModelOptions(): void; effectOptions(): { id: string }[] } }).__game;
    g.takeModelOptions(); g.setPixelLook({ lines: 270 }); const at = g.effectOptions(); g.sim(2.5, true); g.setPixelLook({ lines: 0 }); return at.length;
  });
  expect(played).toBe(11);
  await page.screenshot({ path: 'test-results/pixel-look.png' });
  expect(errors).toEqual([]);
});
