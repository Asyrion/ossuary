import { expect, test } from '@playwright/test';
import { type RoomView, type GameHooks, type W, start } from './helpers';

test('clear a room without console errors', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a');
  const result = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game;
    g.warp(1);
    const foes = g.enemies.length,
      seconds = w.__fight(60);
    g.sim(0.5, true); // let the door bars sink and render a frame
    const room = g.current;
    return {
      foes,
      seconds,
      left: g.enemies.length,
      cleared: room.cleared,
      locked: room.locked,
      doorsOpen: Object.values(room.doors).every((d) => d.open),
      state: g.state,
    };
  });
  await page.screenshot({ path: 'test-results/smoke-room.png' });
  console.log(`cleared ${result.foes} foes in ${result.seconds.toFixed(1)} s of game time`);
  expect(result).toMatchObject({ foes: 3, left: 0, cleared: true, locked: false, doorsOpen: true, state: 'play' });
  expect(errors).toEqual([]);
});

test('a seeded floor is generated and the trapdoor leads down', async ({ page }) => {
  const errors = await start(page, '?seed=SMOKE1');
  const floor1 = await page.evaluate(() => {
    const g = (window as unknown as W).__game;
    return {
      seed: g.seed,
      floor: g.floor,
      rooms: g.rooms().filter((r) => !['secret', 'laboratory', 'waystone'].includes(r.type)).length,
      types: g.rooms().map((r) => r.type),
      map: g.map(),
    };
  });
  expect(floor1.seed).toBe('SMOKE1');
  expect(floor1.floor).toBe(0);
  expect(floor1.rooms).toBeGreaterThanOrEqual(13); // the floor's counts (data/floors.json), the secret room, a laboratory and the waystone room on top
  expect(floor1.rooms).toBeLessThanOrEqual(17);
  for (const t of ['start', 'boss', 'treasure', 'ordeal', 'merchant', 'library', 'secret', 'waystone'])
    expect(floor1.types.filter((x) => x === t)).toHaveLength(1);

  const boss = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game;
    g.warp(g.rooms().find((r) => r.type === 'boss')!.plan.id);
    const seconds = w.__fight(180);
    g.sim(0.5);
    const spots = (g.current as RoomView & { spots: { pair?: object }[] }).spots;
    return {
      seconds,
      left: g.enemies.length,
      cleared: g.current.cleared,
      choice: spots.length,
      paired: spots.every((s) => !!s.pair),
      wayDown: g.wayDown,
    };
  });
  console.log(`floor 1 boss beaten in ${boss.seconds.toFixed(1)} s of game time`);
  expect(boss).toMatchObject({ left: 0, cleared: true, choice: 2, paired: true, wayDown: null }); // (the way down is in the waystone room)

  const floor2 = await page.evaluate(() => {
    const g = (window as unknown as W).__game;
    g.warp(g.rooms().find((r) => r.type === 'waystone')!.plan.id);
    g.sim(2); // the stone rises, kindles, and the trapdoor opens beyond it
    const down = g.wayDown!;
    g.player.x = down.x;
    g.player.z = down.z;
    g.sim(0.2, true); // step onto the trapdoor
    return {
      down: down.room,
      state: g.state,
      floor: g.floor,
      rooms: g.rooms().filter((r) => !['secret', 'laboratory', 'waystone'].includes(r.type)).length,
      current: g.current.type,
      shrines: g.rooms().filter((r) => r.type === 'shrine').length,
    };
  });
  await page.screenshot({ path: 'test-results/smoke-floor2.png' });
  expect(floor2).toMatchObject({ down: 'waystone', state: 'play', floor: 1, current: 'start', shrines: 1 }); // the shrine is on floor 2
  expect(floor2.rooms).toBeGreaterThanOrEqual(16);
  expect(floor2.rooms).toBeLessThanOrEqual(20);
  expect(errors).toEqual([]);
});

test("a run is five floors and the Seal: the Gilded Reliquary and the Ferryman's Shore below the Scriptorium, the Seal below the Shore, whose boss wins it", async ({
  page,
}) => {
  const errors = await start(page, '?seed=DEEP01&floor=3');
  type G2 = GameHooks & { descend(): void; run: { boss: string } };
  const floors = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2,
      seen: { floor: number; boss: string; shrines: number; banner: string }[] = [];
    const note = () =>
      seen.push({
        floor: g.floor,
        boss: g.run.boss,
        shrines: g.rooms().filter((r) => r.type === 'shrine').length,
        banner: document.querySelector('#banner .t')?.textContent ?? '',
      });
    g.descend();
    g.sim(0.2, true);
    note(); // (from the Scriptorium down to the Reliquary)
    g.descend();
    g.sim(0.2, true);
    note(); // (and on to the Shore)
    return seen;
  });
  expect(floors.map((f) => [f.floor, f.boss, f.shrines, f.banner])).toEqual([
    [3, expect.stringMatching(/^(hart|tiger)$/), 1, 'The Gilded Reliquary'],
    [4, expect.stringMatching(/^(angler|dragon)$/), 0, "The Ferryman's Shore"],
  ]); // (a shrine on floor 4 as on floor 2; the bosses join their pools)
  await page.screenshot({ path: 'test-results/smoke-floor5.png' });
  const end = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2;
    g.descend();
    g.sim(0.2, true);
    const seal = { floor: g.floor, banner: document.querySelector('#banner .t')?.textContent };
    g.descend();
    g.sim(0.2);
    return { seal, state: g.state, floor: document.getElementById('endFloor')!.textContent };
  });
  expect(end).toEqual({ seal: { floor: 5, banner: 'The Seal' }, state: 'end', floor: '6 of 6' }); // (the Seal below the Shore, the last)
  expect(errors).toEqual([]);
});

test('the end screen sums up the run, and replays its seed', async ({ page }) => {
  const errors = await start(page, '?room=crypt_a&seed=ENDRUN&give=twin_staff,bone_lens');
  type G2 = GameHooks & {
    descend(): void;
    drop(kind: string, x?: number, z?: number): void;
    player: GameHooks['player'] & { invuln: number };
  };
  const summary = () =>
    page.evaluate(() => ({
      shown: !document.getElementById('scrEnd')!.classList.contains('hidden'),
      title: document.getElementById('endTitle')!.textContent,
      floor: document.getElementById('endFloor')!.textContent,
      kills: document.getElementById('endKills')!.textContent,
      seed: document.getElementById('endSeed')!.textContent,
      time: document.getElementById('endTime')!.textContent,
      carried: document.querySelectorAll('#endItems li').length,
      obols: Number(document.getElementById('endObols')!.textContent),
      text: document.getElementById('endText')!.textContent,
    }));
  // a test room ends the run as a win when the mage takes the way down
  await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as G2;
    g.warp(1);
    w.__fight(60);
    g.drop('purse', g.player.x, g.player.z + 0.3);
    g.sim(1); // obols found count towards the summary
    g.descend();
  });
  const won = await summary();
  expect(won.obols).toBeGreaterThanOrEqual(5);
  await page.screenshot({ path: 'test-results/smoke-end.png' });
  expect(won).toMatchObject({ shown: true, floor: '1 of 6', kills: '3', seed: 'ENDRUN', carried: 2 }); // twin staff replaced the wand
  expect(won.time).toMatch(/^\d+:\d\d$/);
  expect(won.text).toMatch(/Kaelith knelt.*Wardens' vault.*dawn/); // (the setting in the text)

  // replay: a full run on the same seed; then fall in its first fight
  await page.click('#btnReplay');
  const replay = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as G2;
    const state = g.state,
      seed = g.seed;
    g.warp(g.rooms().find((r) => r.type === 'normal' && !r.cleared)!.plan.id);
    for (let t = 0; t < 40 && g.state !== 'end'; t += 0.1) {
      g.player.hp = Math.min(g.player.hp, 1);
      g.sim(0.1);
    }
    return { state, seed, after: g.state };
  });
  expect(replay).toEqual({ state: 'play', seed: 'ENDRUN', after: 'end' });
  const lost = await summary();
  expect(lost).toMatchObject({ shown: true, floor: '1 of 6', seed: 'ENDRUN', carried: 1 });
  expect(lost.title).not.toBe(won.title);
  expect(lost).toMatchObject({
    title: 'Azyrion fell in the vault',
    text: expect.stringMatching(/^Azyrion's descent ended on floor 1, The Ossuary/),
  });
  expect(errors).toEqual([]);
});

test("the setting: the title names the Gate of Uzulim and Azyrion; the first floor opens beneath the Wardens' chapel, and the Warden is one of them", async ({
  page,
}) => {
  await page.addInitScript('window.__manual = true');
  await page.goto('/?seed=GATE01&autolevel=skip');
  await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 30_000 });
  const title = await page.evaluate(() => ({
    heading: document.querySelector('#scrTitle h1')!.textContent,
    place: document.querySelector('#scrTitle .place')!.textContent,
    intro: document.querySelector('#scrTitle .place + p')!.textContent,
  }));
  expect(title).toEqual({
    heading: 'Ossuary',
    place: 'Beneath the Gate of Uzulim',
    intro: expect.stringMatching(/^Azyrion's first descent into the Wardens' vault/),
  });
  await page.screenshot({ path: 'test-results/smoke-title.png' });
  await page.click('#btnStart');
  const banner = await page.evaluate(() => [
    document.querySelector('#banner .t')!.textContent,
    document.querySelector('#banner .s')!.textContent,
  ]);
  expect(banner).toEqual(['The Ossuary', "Beneath the Wardens' chapel, below the Gate of Uzulim"]);
  // the floor-1 boss's banner names what it was
  const errors = await start(page, '?seed=GATE01&boss=warden');
  const warden = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as {
      rooms(): { type: string; plan: { id: number } }[];
      warp(id: number): void;
      sim(s: number): void;
    };
    g.warp(g.rooms().find((r) => r.type === 'boss')!.plan.id);
    g.sim(0.3);
    return [document.querySelector('#banner .t')!.textContent, document.querySelector('#banner .s')!.textContent];
  });
  expect(warden).toEqual(['The Hollow Warden', 'A Warden of Uzulim who never came back up']);
  expect(errors).toEqual([]);
});

test('every door of a seeded floor leads to its neighbour, onto open floor', async ({ page }) => {
  const errors = await start(page, '?seed=DOORS1&floor=2&loot=keys:9'); // keys unbind a vault's ward on the way
  const result = await page.evaluate(() => {
    const secret = ((window as unknown as W).__game as unknown as { openSecret(): boolean }).openSecret(); // its cracked walls, broken open
    type D = { side: 'n' | 's' | 'e' | 'w'; x: number; z: number; nb: unknown; open: boolean };
    type R = Omit<RoomView, 'doors' | 'plan'> & {
      doors: D[];
      bounds: { minX: number; minZ: number };
      mask: boolean[][];
      plan: RoomView['plan'] & { doors: { shift?: number }[] };
    };
    const g = (window as unknown as W).__game as unknown as {
      rooms(): R[];
      current: R;
      warp(id: number): void;
      clearRoom(): void;
      sim(sec: number): void;
      keys: Set<string>;
      player: { x: number; z: number; vx: number; vz: number; invuln: number };
      camera: { zoom: number };
    };
    const HALLS = ['long', 'tall', 'great', 'l_shape'];
    const KEY: Record<D['side'], string> = { n: 'KeyW', s: 'KeyS', e: 'KeyD', w: 'KeyA' };
    const DIR: Record<D['side'], number[]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    const fails: string[] = [];
    let walked = 0,
      shifted = 0;
    const shapes = new Set<string>();
    for (const room of g.rooms())
      for (const [i, d] of room.doors.entries()) {
        if (room.plan.doors[i].shift) shifted++; // doors moved off the middle of their edge
        g.warp(room.plan.id);
        g.clearRoom();
        g.player.invuln = 99;
        const [dx, dz] = DIR[d.side];
        g.player.x = d.x - dx * 1.2;
        g.player.z = d.z - dz * 1.2;
        g.player.vx = g.player.vz = 0;
        g.keys.add(KEY[d.side]);
        for (let t = 0; g.current === room && t < 2; t += 0.05) g.sim(0.05);
        g.keys.delete(KEY[d.side]);
        g.sim(0.3);
        walked++;
        shapes.add(room.plan.shape);
        const nb = g.current,
          c = Math.floor(g.player.x - nb.bounds.minX),
          r = Math.floor(g.player.z - nb.bounds.minZ);
        if (nb !== d.nb || nb.mask[r]?.[c] !== true)
          fails.push(`room ${room.plan.id} (${room.plan.shape}) door ${d.side}`);
        // the camera is pulled back in larger halls only
        if (g.camera.zoom < 1 !== HALLS.includes(nb.plan.shape))
          fails.push(`zoom ${g.camera.zoom} in room ${nb.plan.id} (${nb.plan.shape})`);
      }
    return { walked, shifted, shapes: shapes.size, fails, secret };
  });
  console.log(
    `walked through ${result.walked} doors (${result.shifted} off the middle) in rooms of ${result.shapes} shapes${result.secret ? ', a secret room among them' : ''}`,
  );
  expect(result.secret).toBe(true);
  expect(result.shifted).toBeGreaterThan(0);
  expect(result.walked).toBeGreaterThan(20);
  expect(result.fails).toEqual([]);
  expect(errors).toEqual([]);
});

test('the keeping: one save takes over the five keys kept before it; a run ends into it, remembering how it went and what struck last, and brings home its Dust and a tenth of its obols, tallied on the end screen; the save goes out to a file and back; the dev menu gives Dust', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('ossuary.vigil')) {
      localStorage.setItem('ossuary.reactions', JSON.stringify(['steam']));
      localStorage.setItem('ossuary.recipes', JSON.stringify({ pairs: {}, potions: ['healing'] }));
    }
  });
  const errors = await start(page, '?seed=KEEP1&loot=coins:57');
  type V = {
    dust: number;
    obols: number;
    runs: number;
    wins: number;
    deepest: number;
    reactions: string[];
    recipes: { potions: string[] };
    echoes: {
      seed: string;
      won: boolean;
      floor: number;
      room: string;
      struck: string | null;
      carried: string[];
      obols: number;
      dust: number;
    }[];
  };
  const r = await page.evaluate<{
    took: { vigil: V; stored: boolean; reactions: string[] };
    state: string;
    vigil: V;
    home: string;
    hidden: boolean;
  }>(`(() => {
    const g = window.__game, P = g.player, took = { vigil: g.vigil, stored: !!localStorage.getItem('ossuary.vigil'), reactions: [...g.reactions] };
    // fall to a foe in the first fight
    g.warp(g.rooms().find(r => r.type === 'normal' && !r.cleared).plan.id); g.sim(.3);
    for (const e of g.enemies) e.hp = 0; g.sim(.2); g.clearRoom(); g.sim(.2);
    const foe = g.spawn('sporeling'); P.hp = 1; P.invuln = 0;
    for (let t = 0; t < 120 && g.state !== 'end'; t++) { foe.x = P.x + .3; foe.z = P.z; P.invuln = Math.min(P.invuln, .05); g.sim(.25); }
    const home = document.getElementById('endHome');
    return { took, state: g.state, vigil: g.vigil, home: home.textContent, hidden: home.hidden };
  })()`);
  expect(r.took.stored).toBe(true);
  expect(r.took.vigil.reactions).toEqual(['steam']);
  expect(r.took.vigil.recipes.potions).toEqual(['healing']);
  expect(r.took.reactions).toContain('steam');
  expect(r.state).toBe('end');
  expect(r.vigil).toMatchObject({ runs: 1, wins: 0, deepest: 1, obols: 5 }); // (a tenth of 57, after a death)
  expect(r.vigil.dust).toBeGreaterThanOrEqual(10); // (floor 1 reached, and any first finds)
  expect(r.vigil.echoes[0]).toMatchObject({ seed: 'KEEP1', won: false, floor: 1, struck: 'sporeling', obols: 5 });
  expect(r.vigil.echoes[0].carried.length).toBeGreaterThan(0);
  expect(r.hidden).toBe(false);
  expect(r.home).toContain('Carried home');
  expect(r.home).toContain('Floor 1 reached');
  expect(r.home).toContain('Arcane Dust');
  expect(r.home).toContain('a tenth of 57');
  expect(r.home).toContain('Struck down by');
  await page.screenshot({ path: 'test-results/keeping-end.png' });
  // out to a file and back; what is not a save is refused
  const io = await page.evaluate<{
    wiped: number;
    refused: number;
    taken: number;
    same: boolean;
    out: string;
    in: string;
  }>(`(() => {
    const g = window.__game, text = g.exportSave(), before = g.vigil;
    g.wipeSave(); const wiped = g.vigil.runs;
    const refused = g.importSave('{"hello":1}'), taken = g.importSave(text);
    return { wiped, refused: refused.length, taken: taken.length, same: JSON.stringify(g.vigil) === JSON.stringify(before), out: document.getElementById('btnSaveOut').textContent, in: document.getElementById('btnSaveIn').textContent };
  })()`);
  expect(io).toEqual({ wiped: 0, refused: 1, taken: 0, same: true, out: 'Export the Vigil', in: 'Import the Vigil' });
  // the dev menu gives Dust (from a run)
  await page.click('#btnAgain');
  const before = await page.evaluate(() => ((window as unknown as W).__game as unknown as { vigil: V }).vigil.dust);
  await page.keyboard.press('F2');
  await page.locator('#dev .dv-tab', { hasText: 'Rooms' }).click();
  await page.locator('#dev .dv-page:not([hidden]) button', { hasText: '+100 Arcane Dust' }).click();
  expect(await page.evaluate(() => ((window as unknown as W).__game as unknown as { vigil: V }).vigil.dust)).toBe(
    before + 100,
  );
  expect(errors).toEqual([]);
});

test("the run around it: a deeper start begins at its floor's expected level, its choices waiting; levels count toward Azyrion's arc, three to an artifact", async ({
  page,
}) => {
  const errors = await start(page, '?floor=4&level=auto');
  const r = await page.evaluate<{
    start: { level: number; floor: number };
    arc0: { stage: number; held: number };
    arc12: { stage: number; held: number; reached: number };
  }>(`(() => {
    const g = window.__game; const start = { level: g.level, floor: g.floor };
    const arc0 = g.arc; g.setLevel(12); g.sim(.1); const arc12 = g.arc;
    return { start, arc0, arc12 };
  })()`);
  expect(r.start).toMatchObject({ level: 9, floor: 3 });
  expect(r.arc0).toMatchObject({ stage: 0, held: 2 }); // (nothing held, level 9: two)
  expect(r.arc12).toMatchObject({ stage: 1, held: 3, reached: 1 }); // (level 12, nothing held: the first stage)
  expect(errors).toEqual([]);
});
