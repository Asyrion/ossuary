import { expect, test } from '@playwright/test';
import { type RoomView, type GameHooks, type W, start, type G5 } from './helpers';

test('an ordeal is fought wave by wave and rewards an artifact', async ({ page }) => {
  const errors = await start(page, '?room=ordeal_pillars');
  const result = await page.evaluate(() => {
    const w = window as unknown as W;
    const g = w.__game as GameHooks & { current: RoomView & { waves: unknown[]; wave: number; spots: unknown[] } };
    g.warp(1);
    const room = g.current,
      waves = room.waves.length,
      seen: number[] = [];
    for (let i = 0; i < 6 && !room.cleared; i++) {
      seen.push(room.wave);
      w.__fight(90);
      g.sim(1.2);
    }
    return { waves, seen: [...new Set(seen)], cleared: room.cleared, locked: room.locked, reward: room.spots.length };
  });
  expect(result.waves).toBe(2);
  expect(result.seen).toEqual([0, 1]);
  expect(result).toMatchObject({ cleared: true, locked: false, reward: 1 });
  expect(errors).toEqual([]);
});

test('a cracked wall rings hollow to a bolt, a glyph breaks it open, and the secret room appears', async ({ page }) => {
  const errors = await start(page, '?room=secret_cell&seed=SEC01&loot=glyphs:1');
  type D = { x: number; z: number; open: boolean; secret?: { open: boolean; divined: boolean } };
  type G7 = Omit<G5, 'current' | 'rooms'> & {
    current: Omit<G5['current'], 'doors'> & { doors: D[] };
    rooms(): (RoomView & { known: boolean; found?: boolean })[];
  };
  const before = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7,
      P = g.player,
      d = g.current.doors.find((x) => x.secret)!;
    const hidden = { known: g.rooms()[1].known, open: d.open };
    P.x = d.x;
    P.z = d.z + 3;
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    g.sim(0.8);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    g.sim(0.5);
    const rang = { divined: d.secret!.divined, open: d.secret!.open };
    P.x = d.x;
    P.z = d.z + 0.6;
    P.invuln = 99;
    return { hidden, rang };
  });
  expect(before).toEqual({ hidden: { known: false, open: false }, rang: { divined: true, open: false } }); // bolts don't break it
  await page.keyboard.press('Space');
  const after = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7,
      P = g.player,
      d = g.current.doors.find((x) => x.secret)!;
    g.sim(0.05);
    P.z += 3;
    g.sim(2);
    const opened = { open: d.open, found: !!g.rooms()[1].found, known: g.rooms()[1].known };
    P.x = d.x;
    P.z = d.z + 1;
    g.keys.add('KeyW');
    g.sim(1.2);
    g.keys.delete('KeyW');
    g.sim(0.5);
    return { opened, inside: g.current.type };
  });
  expect(after).toEqual({ opened: { open: true, found: true, known: true }, inside: 'secret' });
  await page.evaluate(() => (window as unknown as W).__game.sim(0.1, true));
  await page.screenshot({ path: 'test-results/smoke-secret.png' });
  expect(errors).toEqual([]);
});

test("carved rooms: x tiles inside the shape are wall the mage can't walk into", async ({ page }) => {
  const errors = await start(page, '?room=octagon_crypt');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as {
      warp(id: number): void;
      clearRoom(): void;
      sim(sec: number, draw?: boolean): void;
      keys: Set<string>;
      current: {
        bounds: { minX: number; minZ: number };
        mask: boolean[][];
        walls: unknown[];
        group: { children: unknown[] };
      };
      player: { x: number; z: number; vx: number; vz: number };
    };
    g.warp(1);
    g.clearRoom();
    const b = g.current.bounds;
    // walk into the top-left corner, which the template cuts away
    g.player.x = b.minX + 2.5;
    g.player.z = b.minZ + 1.5;
    g.keys.add('KeyW');
    g.keys.add('KeyA');
    g.sim(1.5, true);
    g.keys.clear();
    return {
      corner: g.current.mask[0][0],
      x: g.player.x - b.minX,
      z: g.player.z - b.minZ,
      walls: g.current.walls.length,
    };
  });
  expect(result.corner).toBe(false);
  // the mage stops at the cut corner's walls: not inside tile (0,0), (1,0) or (0,1)
  expect(result.x >= 2 || result.z >= 1).toBe(true);
  expect(result.x >= 1 || result.z >= 2).toBe(true);
  expect(result.walls).toBeGreaterThan(4);
  expect(errors).toEqual([]);
});

test('objects: bolts break piles and casks (oil spills), pews stop walking not bolts, fire burns roots, webs slow, briars sting, spores flash, blasts clear rubble', async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&loot=glyphs:3');
  type P = { kind: string; x: number; z: number; burning: number; hits: number };
  type G5 = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    keys: Set<string>;
    arrowOrder: string[];
    current: { bounds: { minX: number; minZ: number } };
    prop(kind: string, x: number, z: number): boolean;
    props: P[];
    spores: number;
    pools: { kind: string }[];
    burn(x: number, z: number, r?: number): void;
    spawn(kind: string, x: number, z: number): { hp: number; maxHp: number };
    player: { x: number; z: number; vx: number; vz: number; hp: number; maxHp: number; invuln: number };
  };
  const result = await page.evaluate(() => {
    const g = (window as unknown as { __game: G5 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + 0.5, z: g.current.bounds.minZ + r + 0.5 });
    const put = (kind: string, c: number, r: number) => {
      const q = at(c, r);
      return g.prop(kind, q.x, q.z);
    };
    const stand = (c: number, r: number) => {
      const q = at(c, r);
      g.player.x = q.x;
      g.player.z = q.z;
      g.player.vx = g.player.vz = 0;
    };
    const has = (kind: string) => g.props.filter((p) => p.kind === kind).length;
    const shootEast = (sec: number) => {
      g.keys.add('ArrowRight');
      g.arrowOrder.push('ArrowRight');
      g.sim(sec);
      g.keys.delete('ArrowRight');
      g.arrowOrder.length = 0;
      g.sim(0.5);
    };
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    const out: Record<string, unknown> = {};
    // a bone pile breaks to one bolt, a skull heap to two, a cask spills oil
    put('bones', 4, 0);
    stand(1, 0);
    shootEast(0.3);
    out.bones = has('bones');
    put('skulls', 4, 6);
    stand(1, 6);
    shootEast(0.3);
    out.skullsAfterOne = has('skulls');
    shootEast(1.2);
    out.skulls = has('skulls');
    put('cask', 11, 1);
    stand(8, 1);
    shootEast(0.8);
    out.cask = has('cask');
    out.oil = g.pools.filter((p) => p.kind === 'oil').length;
    // a pew: the mage can't walk through it, bolts fly over it
    put('pew', 4, 4);
    stand(2, 4);
    g.keys.add('KeyD');
    g.sim(1);
    g.keys.delete('KeyD');
    out.pewStops = g.player.x < at(4, 4).x - 0.4;
    stand(2, 4);
    shootEast(1);
    out.pew = has('pew');
    // roots burn away
    put('roots', 11, 5);
    g.burn(at(11, 5).x, at(11, 5).z);
    out.rootsBurning = g.props.some((p) => p.kind === 'roots' && p.burning > 0);
    g.sim(4.5);
    out.roots = has('roots');
    // cobwebs slow the mage
    const walk = () => {
      const x0 = g.player.x;
      g.keys.add('KeyD');
      g.sim(0.6);
      g.keys.delete('KeyD');
      return g.player.x - x0;
    };
    stand(0, 2);
    const free = walk();
    put('web', 1, 2);
    put('web', 2, 2);
    stand(0, 2);
    g.sim(0.2);
    const snag = walk();
    out.webSlows = snag < free * 0.8;
    // a briar stings
    put('briar', 9, 3);
    stand(9, 3);
    g.player.invuln = 0;
    const hp0 = g.player.hp;
    g.sim(0.6);
    out.stung = g.player.hp < hp0;
    g.player.hp = g.player.maxHp;
    g.player.invuln = 99;
    // a glowcap bursts into spores, and fire in them flashes, hurting a foe in reach
    put('glowcap', 11, 3);
    stand(8, 3);
    shootEast(0.3);
    out.spores = g.spores;
    const foe = g.spawn('rotling', at(11, 2).x, at(11, 2).z);
    g.sim(0.6);
    const fhp = foe.hp;
    g.burn(at(11, 3).x, at(11, 3).z);
    out.flashed = g.spores === 0 && foe.hp < fhp;
    put('rubble', 2, 5);
    stand(3, 6);
    return out;
  });
  expect(result).toMatchObject({
    bones: 0,
    skullsAfterOne: 1,
    skulls: 0,
    cask: 0,
    oil: 1,
    pewStops: true,
    pew: 1,
    rootsBurning: true,
    roots: 0,
    webSlows: true,
    stung: true,
    spores: 1,
    flashed: true,
  });
  // a glyph's blast clears rubble
  await page.keyboard.press('Space');
  const rubble = await page.evaluate(() => {
    const g = (window as unknown as { __game: G5 }).__game;
    g.sim(0.05);
    g.player.x += 4;
    g.sim(3);
    return g.props.filter((p) => p.kind === 'rubble').length;
  });
  expect(rubble).toBe(0);
  await page.screenshot({ path: 'test-results/objects.png' });
  expect(errors).toEqual([]);
});

test("themed rooms: sleepers wake when the mage comes close, the ossuary's bones rise, a blast brings the ceiling down", async ({
  page,
}) => {
  type E = { x: number; z: number; dead?: boolean; asleep?: boolean; type: string };
  type G6 = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    enemies: E[];
    props: { kind: string }[];
    current: { cx: number; cz: number; theme?: { id: string }; bounds: { minX: number; minZ: number } };
    player: { x: number; z: number; invuln: number; hp: number; maxHp: number };
  };
  let errors = await start(page, '?room=pilgrims_rest');
  const sleepers = await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 }).__game;
    g.warp(1);
    g.player.invuln = 99;
    const at = g.enemies.map((e) => ({ x: e.x, z: e.z }));
    g.sim(2);
    const still = g.enemies.every((e, i) => e.asleep && Math.hypot(e.x - at[i].x, e.z - at[i].z) < 0.05);
    const e = g.enemies[0];
    g.player.x = e.x + 1.2;
    g.player.z = e.z;
    g.sim(0.3);
    return {
      theme: g.current.theme?.id,
      count: g.enemies.length,
      still,
      woke: !g.enemies[0].asleep,
      toast: document.getElementById('toast')!.textContent,
    };
  });
  expect(sleepers).toMatchObject({ theme: 'pilgrims', still: true, woke: true, toast: "Pilgrims' rest" });
  expect(sleepers.count).toBeGreaterThan(1);
  expect(errors).toEqual([]);

  errors = await start(page, '?room=ossuary_niches');
  const risen = await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 }).__game;
    g.warp(1);
    const piles = () => g.props.filter((p) => p.kind === 'bones' || p.kind === 'skulls').length;
    const before = { piles: piles(), foes: g.enemies.filter((e) => !e.dead).length };
    g.player.x = g.current.cx;
    g.player.z = g.current.cz + 3.2; // keep to the bottom, out of the way
    for (let t = 0; t < 11.5; t += 0.5) {
      g.player.hp = g.player.maxHp;
      g.player.invuln = 99;
      g.sim(0.5);
    }
    return { before, after: { piles: piles(), foes: g.enemies.filter((e) => !e.dead).length } };
  });
  expect(risen.after.piles).toBe(risen.before.piles - 1);
  expect(risen.after.foes).toBeGreaterThanOrEqual(risen.before.foes); // a rotling rose from the pile
  // its skulls watch: their eyes take the colour of the last spell cast
  const eyes = await page.evaluate(() => {
    const g = (
      window as unknown as {
        __game: G6 & { learn(id: string, slot: number): void; cast(slot: number): boolean; mana(v: number): number };
      }
    ).__game;
    const mat = (g.current as unknown as { eyes?: { color: { getHexString(): string } } }).eyes,
      before = mat?.color.getHexString();
    g.learn('rime_shards', 0);
    g.mana(100);
    const cast = g.cast(0);
    g.sim(0.1);
    return { before, cast, after: mat?.color.getHexString() };
  });
  expect(eyes).toEqual({ before: '000000', cast: true, after: '9fd8ff' });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=collapsed_crypt&loot=glyphs:3');
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 }).__game;
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    g.player.x = g.current.cx;
    g.player.z = g.current.cz;
  });
  await page.keyboard.press('Space');
  const fell = await page.evaluate(() => {
    const g = (window as unknown as { __game: G6 }).__game,
      rubble = () => g.props.filter((p) => p.kind === 'rubble').length;
    const before = rubble();
    g.sim(0.05);
    g.player.z += 3;
    g.sim(4);
    return { before, after: rubble() };
  });
  expect(fell.after).toBeGreaterThan(fell.before); // the glyph went off clear of the rubble; stones fell round it
  expect(errors).toEqual([]);
});

test("themed rooms: the treasury's guardians stand as statues until their gold is taken, a blast spills a heap's obols; the drowned climb out of the landing's river until it freezes", async ({
  page,
}) => {
  type E = { x: number; z: number; dead?: boolean; asleep?: boolean; statue?: boolean; type: string };
  type GT = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    enemies: E[];
    props: { kind: string; x: number; z: number }[];
    pickups: { kind: string; x: number; z: number }[];
    loot(v: Record<string, number>): void;
    pool(what: string): void;
    pools: { kind: string; state: string }[];
    current: { theme?: { id: string } };
    player: { x: number; z: number; invuln: number };
  };
  let errors = await start(page, '?room=treasury_vault&floor=4&seed=TRS1');
  const statues = await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game;
    g.warp(1);
    g.player.invuln = 99;
    const at = g.enemies.map((e) => ({ x: e.x, z: e.z }));
    g.sim(1);
    const e = g.enemies[0];
    g.player.x = e.x + 1.1;
    g.player.z = e.z;
    g.sim(1.5); // (close by: a statue doesn't wake)
    const still = g.enemies.every((q, i) => q.asleep && q.statue && Math.hypot(q.x - at[i].x, q.z - at[i].z) < 0.05);
    const heaps = g.props.filter((p) => p.kind === 'hoard').length;
    return { theme: g.current.theme?.id, count: g.enemies.length, still, heaps };
  });
  expect(statues).toMatchObject({ theme: 'treasury', still: true, heaps: 4 });
  expect(statues.count).toBeGreaterThan(1);
  // a glyph chalked beside a heap: its blast scatters the heap's obols; taking one wakes every guardian
  await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game,
      h = g.props.find((p) => p.kind === 'hoard')!;
    g.loot({ glyphs: 1 });
    g.player.x = h.x + 0.9;
    g.player.z = h.z;
  });
  await page.keyboard.press('Space');
  const spill = await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game;
    g.sim(0.1);
    g.player.x += 2.5;
    g.sim(2.2);
    const heaps = g.props.filter((p) => p.kind === 'hoard').length,
      loot = g.pickups.filter((q) => q.kind !== 'chest' && q.kind !== 'coffer');
    const statuesBefore = g.enemies.filter((e) => e.statue).length;
    const coin = g.pickups.find((q) => q.kind === 'coin' || q.kind === 'purse');
    if (coin) {
      g.player.x = coin.x;
      g.player.z = coin.z;
    }
    g.sim(0.6);
    return {
      heaps,
      loot: loot.length,
      statuesBefore,
      statuesAfter: g.enemies.filter((e) => e.statue).length,
      awake: g.enemies.filter((e) => !e.asleep && !e.dead).length,
      toast: document.getElementById('toast')!.textContent,
    };
  });
  expect(spill.heaps).toBe(3);
  expect(spill.loot).toBeGreaterThanOrEqual(1);
  expect(spill.statuesAfter).toBe(0);
  expect(spill.awake).toBeGreaterThan(0);
  expect(spill.toast).toMatch(/guardians wake/);
  await page.evaluate(() => (window as unknown as { __game: GT }).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-treasury.png' });
  expect(errors).toEqual([]);
  // the ferry landing: while the fight lasts the drowned climb out of the river; frozen, it keeps them
  errors = await start(page, '?room=landing_moor&floor=5&seed=LND1');
  const drowned = await page.evaluate(() => {
    const g = (window as unknown as { __game: GT }).__game;
    g.warp(1);
    g.player.invuln = 99;
    for (const e of g.enemies) e.asleep = true; // (the room's own foes held still: a frost foe spinning over the river freezes it)
    const n0 = g.enemies.filter((e) => !e.dead).length;
    g.sim(6);
    const n1 = g.enemies.length,
      toast = document.getElementById('toast')!.textContent;
    g.pool('frost');
    const frozen = g.pools.filter((p) => p.kind === 'water').every((p) => p.state === 'frozen');
    const n2 = g.enemies.length;
    g.sim(8);
    return { theme: g.current.theme?.id, rose: n1 - n0, toast, frozen, later: g.enemies.length - n2 };
  });
  expect(drowned).toMatchObject({ theme: 'landing', rose: 1, frozen: true, later: 0 });
  expect(drowned.toast).toMatch(/drowned/);
  await page.evaluate(() => (window as unknown as { __game: GT }).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-landing.png' });
  expect(errors).toEqual([]);
});

test('room variants: ambush, champion, dark and quiet', async ({ page }) => {
  const errors = await start(page, '?room=crypt_b&variant=ambush');
  const result = await page.evaluate(() => {
    type E = { champion?: boolean; mantle?: string; type: string; maxHp: number; x: number; z: number };
    type Rm = { locked: boolean; ambush?: string; torches: { lit: boolean }[]; waves: { role: string }[][] };
    const g = (window as unknown as W).__game as unknown as {
      startGame(o: object): void;
      warp(id: number): void;
      sim(s: number): void;
      keys: Set<string>;
      enemies: E[];
      current: Rm;
      player: { x: number; z: number; invuln: number };
      lightLevels(): { hemi: number; torches: number[] };
    };
    // ambush: an empty, open room until the mage walks into the middle
    g.warp(1);
    g.sim(0.5);
    const armed = { foes: g.enemies.length, locked: g.current.locked };
    g.keys.add('KeyW');
    for (let t = 0; g.current.ambush === 'armed' && t < 3; t += 0.05) g.sim(0.05);
    g.keys.delete('KeyW');
    const sprung = {
      foes: g.enemies.length,
      locked: g.current.locked,
      nearest: Math.min(...g.enemies.map((e) => Math.hypot(e.x - g.player.x, e.z - g.player.z))),
    };
    // champion: one enemy with double health
    g.startGame({ testTemplate: 'crypt_b', testVariant: 'champion' });
    g.warp(1);
    g.sim(0.2);
    const champ = g.enemies.filter((e) => e.champion),
      peer = g.enemies.find((e) => !e.champion && e.type === champ[0]?.type);
    // dark: torches out, the fill light low
    g.startGame({ testTemplate: 'crypt_b', testVariant: 'dark' });
    g.warp(1);
    g.sim(2);
    const light = g.lightLevels();
    // quiet: at most two weak enemies
    g.startGame({ testTemplate: 'crypt_c', testVariant: 'quiet' });
    g.warp(1);
    g.sim(0.2);
    return {
      armed,
      sprung,
      champions: champ.length,
      mantle: champ[0].mantle,
      hpRatio: champ[0].maxHp / peer!.maxHp,
      lit: g.current.torches.length,
      darkTorches: light.torches.reduce((a, b) => a + b, 0),
      hemi: light.hemi,
      quiet: g.enemies.map((e) => e.type),
      quietRoles: g.current.waves.flat().map((f) => f.role),
    };
  });
  expect(result.armed).toEqual({ foes: 0, locked: false });
  expect(result.sprung.foes).toBeGreaterThan(0);
  expect(result.sprung.locked).toBe(true);
  expect(result.sprung.nearest).toBeGreaterThan(2);
  expect(result.champions).toBe(1);
  expect(['kindled', 'rimebound', 'stormcharged', 'hallowed', 'hexbound']).toContain(result.mantle); // (in one of the floor's mantles)
  expect(result.hpRatio).toBeCloseTo(2);
  expect(result.darkTorches).toBe(0);
  expect(result.hemi).toBeLessThan(0.6);
  expect(result.quiet.length).toBeLessThanOrEqual(2);
  expect(result.quietRoles.every((r) => r === 'R' || r === 'W')).toBe(true); // (walkers and flyers, never a heavy)
  expect(errors).toEqual([]);
});

test('mechanisms: a lit brazier sets bolts alight, runes take a school, bells stun, lodestones leap, a censer falls burning', async ({
  page,
}) => {
  type P = { kind: string; x: number; z: number; lit: boolean; school: string | null; cd: number };
  type Foe = {
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    status?: { burn: number; chill: number; shock: number; stun: number };
  };
  type G7 = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    keys: Set<string>;
    arrowOrder: string[];
    current: { bounds: { minX: number; minZ: number }; locked: boolean };
    prop(kind: string, x: number, z: number): boolean;
    props: P[];
    element(kind: string, x: number, z: number): void;
    spawn(kind: string, x: number, z: number): Foe;
    enemies: Foe[];
    pools: { kind: string; state: string }[];
    player: { x: number; z: number; vx: number; vz: number; hp: number; maxHp: number; invuln: number };
  };
  let errors = await start(page, '?room=treasure_plain');
  const result = await page.evaluate(() => {
    const g = (window as unknown as { __game: G7 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + 0.5, z: g.current.bounds.minZ + r + 0.5 });
    const put = (kind: string, c: number, r: number) => {
      const q = at(c, r);
      return g.prop(kind, q.x, q.z);
    };
    const stand = (c: number, r: number) => {
      const q = at(c, r);
      g.player.x = q.x;
      g.player.z = q.z;
      g.player.vx = g.player.vz = 0;
    };
    const find = (kind: string, c: number, r: number) =>
      g.props.find((p) => p.kind === kind && Math.hypot(p.x - at(c, r).x, p.z - at(c, r).z) < 0.6);
    const shootEast = (sec: number) => {
      g.keys.add('ArrowRight');
      g.arrowOrder.push('ArrowRight');
      g.sim(sec);
      g.keys.delete('ArrowRight');
      g.arrowOrder.length = 0;
      g.sim(0.5);
    };
    const clearFoes = () => {
      g.clearRoom();
      g.sim(0.1);
    };
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    const out: Record<string, unknown> = {};
    // a brazier lights to fire; a bolt through its flame charges the rune stone behind it with the ember school
    put('brazier', 3, 3);
    put('rune', 5, 3);
    out.brazierDark = find('brazier', 3, 3)?.lit;
    g.element('burn', at(3, 3).x, at(3, 3).z);
    out.brazierLit = find('brazier', 3, 3)?.lit;
    stand(1, 3);
    shootEast(0.1);
    out.rune = find('rune', 5, 3)?.school;
    out.runeStands = !!find('rune', 5, 3);
    // a bolt set alight by a brazier sets roots alight where it strikes
    put('brazier', 3, 0);
    put('roots', 5, 0);
    g.element('burn', at(3, 0).x, at(3, 0).z);
    stand(1, 0);
    shootEast(0.1);
    out.rootsLit =
      (g.props.find((p) => p.kind === 'roots') as unknown as { burning: number } | undefined)?.burning ?? 0;
    // a dead tree burns longer than roots
    put('tree', 11, 4);
    g.element('burn', at(11, 4).x, at(11, 4).z);
    g.sim(4.5);
    out.treeAt4 = !!find('tree', 11, 4);
    g.sim(2.5);
    out.treeAt7 = !!find('tree', 11, 4);
    // frost reaching an uncharged rune stone charges it with frost; a second school sets off their reaction and the stone takes it
    put('rune', 11, 1);
    g.element('chill', at(11, 1).x, at(11, 1).z);
    out.frostRune = find('rune', 11, 1)?.school;
    g.element('shock', at(11, 1).x, at(11, 1).z);
    out.frostRuneTurned = find('rune', 11, 1)?.school;
    // a bolt rings the bell: every foe reels, and the bell must settle before it rings again
    put('bell', 4, 5);
    const dummy = g.spawn('dummy', at(10, 6).x, at(10, 6).z);
    g.sim(1);
    stand(1, 5);
    shootEast(0.1);
    out.stunned = (dummy.status?.stun ?? 0) > 0;
    out.bellCd = (find('bell', 4, 5)?.cd ?? 0) > 0;
    clearFoes();
    // shock on a lodestone leaps to the other, hurting and shocking the foe between
    put('lodestone', 2, 1);
    put('lodestone', 9, 1);
    const between = g.spawn('dummy', at(5, 1).x, at(5, 1).z);
    g.sim(1);
    stand(5, 6);
    g.element('shock', at(2, 1).x, at(2, 1).z);
    out.leapt = (between.status?.shock ?? 0) > 0;
    out.lodeCd = (find('lodestone', 9, 1)?.cd ?? 0) > 0; // (the dummy's health never drops)
    clearFoes();
    // a bolt through a censer's chain brings it down on the foe under it, and its oil spills burning
    out.censerHung = put('censer', 9, 6);
    const under = g.spawn('dummy', at(9, 6).x, at(9, 6).z - 0.8);
    g.sim(1);
    stand(6, 6);
    shootEast(0.1);
    g.sim(0.3);
    out.censer = !!g.props.find((p) => p.kind === 'censer');
    out.crushed = (under.status?.burn ?? 0) > 0;
    out.oil = g.pools.filter((p) => p.kind === 'oil').map((p) => p.state);
    stand(6, 4);
    g.sim(0.05, true);
    return out;
  });
  expect(result).toMatchObject({
    brazierDark: false,
    brazierLit: true,
    rune: 'burn',
    runeStands: true,
    frostRune: 'chill',
    frostRuneTurned: 'shock',
    treeAt4: true,
    treeAt7: false,
    stunned: true,
    bellCd: true,
    leapt: true,
    lodeCd: true,
    censerHung: true,
    censer: false,
    crushed: true,
    oil: ['burning'],
  });
  expect(result.rootsLit).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/mechanisms.png' });
  expect(errors).toEqual([]);

  // a charged rune stone pulses its school on the foes round it while the fight lasts
  errors = await start(page, '?room=rune_circle');
  const pulse = await page.evaluate(() => {
    const g = (window as unknown as { __game: G7 }).__game;
    g.warp(1);
    const rune = g.props.find((p) => p.kind === 'rune')!;
    const dummy = g.spawn('dummy', rune.x + 1, rune.z);
    g.element('chill', rune.x, rune.z);
    for (let t = 0; t < 3; t += 0.5) {
      g.player.hp = g.player.maxHp;
      g.player.invuln = 99;
      g.sim(0.5);
    }
    return {
      locked: g.current.locked,
      school: g.props.find((p) => p.kind === 'rune' && p.x === rune.x && p.z === rune.z)?.school,
      chilled: (dummy.status?.chill ?? 0) > 0,
    };
  });
  expect(pulse).toEqual({ locked: true, school: 'chill', chilled: true });
  expect(errors).toEqual([]);
});

test('watching statues and sapping obelisks: a statue in sight charges, marks the mage and strikes; a pillar breaks its gaze, a hex blinds it; an obelisk saps the cantrip and mana until its school breaks its ward', async ({
  page,
}) => {
  type P = {
    kind: string;
    x: number;
    z: number;
    cd: number;
    charge: number;
    blind: number;
    aiming: boolean;
    ward: string | null;
    broken: boolean;
  };
  type G12 = {
    warp(id: number): void;
    sim(sec: number, draw?: boolean): void;
    props: P[];
    element(kind: string, x: number, z: number): void;
    enemies: { x: number; z: number; asleep?: boolean; spawn: number }[];
    current: { bounds: { minX: number; minZ: number }; locked: boolean };
    player: { x: number; z: number; vx: number; vz: number; hp: number; invuln: number; mana: number };
    sap: number;
    learn(id: string, slot: number): void;
    mana(n: number): void;
    cast(slot: number, dir?: { x: number; z: number }): boolean;
    keys: Set<string>;
    arrowOrder: string[];
    bolts: { damage: number }[];
  };
  let errors = await start(page, '?room=gaze_watch&seed=GAZE01');
  const gaze = await page.evaluate(() => {
    const g = (window as unknown as { __game: G12 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + 0.5, z: g.current.bounds.minZ + r + 0.5 });
    const stand = (c: number, r: number) => {
      const q = at(c, r);
      g.player.x = q.x;
      g.player.z = q.z;
      g.player.vx = g.player.vz = 0;
    };
    const statue = (c: number) => g.props.find((p) => p.kind === 'statue' && Math.abs(p.x - at(c, 1).x) < 0.6)!;
    g.warp(1);
    g.sim(0.3);
    const corner = at(11, 5);
    for (const e of g.enemies) {
      e.asleep = true;
      e.spawn = 0;
      e.x = corner.x;
      e.z = corner.z;
    } // (the fight goes on, held still)
    stand(6, 5);
    g.player.invuln = 0;
    const hp = g.player.hp;
    g.sim(2.3);
    const marked = [statue(3).aiming, statue(9).aiming];
    g.sim(0.8);
    const struck = hp - g.player.hp,
      rested = statue(3).cd > 0;
    g.player.invuln = 99;
    g.sim(1.6);
    g.element('hex', at(9, 1).x, at(9, 1).z); // darkness blinds the east statue
    stand(1, 5);
    g.sim(3); // the pillar at (2, 3) stands between the mage and the west statue
    const hidden = { blindEast: statue(9).blind > 0, east: statue(9).charge, west: statue(3).charge };
    stand(3, 4);
    g.mana(999);
    g.learn('hex_bolt', 0);
    g.cast(0, { x: 0, z: -1 });
    g.sim(1.5); // a Hex Bolt into the west statue
    return { marked, struck, rested, hidden, blindWest: statue(3).blind > 0, locked: g.current.locked };
  });
  expect(gaze).toMatchObject({
    marked: [true, true],
    rested: true,
    hidden: { blindEast: true, east: 0 },
    blindWest: true,
    locked: true,
  });
  expect(gaze.struck).toBeGreaterThan(0);
  expect(gaze.hidden.west).toBeLessThan(0.1);
  expect(errors).toEqual([]);

  errors = await start(page, '?room=obelisk_court&seed=OBEL01');
  const ob = await page.evaluate(() => {
    const g = (window as unknown as { __game: G12 }).__game;
    const at = (c: number, r: number) => ({ x: g.current.bounds.minX + c + 0.5, z: g.current.bounds.minZ + r + 0.5 });
    g.warp(1);
    g.sim(0.3);
    g.player.invuln = 99;
    const corner = at(0, 0);
    for (const e of g.enemies) {
      e.asleep = true;
      e.spawn = 0;
      e.x = corner.x;
      e.z = corner.z;
    }
    const q = at(6, 5);
    g.player.x = q.x;
    g.player.z = q.z;
    g.player.vx = g.player.vz = 0;
    g.mana(100);
    g.sim(1);
    const sap = g.sap,
      drained = 100 - g.player.mana,
      toast = document.getElementById('toast')!.textContent;
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    g.sim(0.05);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    const weak = g.bolts[0]?.damage ?? 0;
    g.sim(1);
    const o = () => g.props.find((p) => p.kind === 'obelisk')!,
      ward = o().ward!;
    const kinds: Record<string, string> = {
      ember: 'burn',
      frost: 'chill',
      storm: 'shock',
      hallow: 'sanct',
      umbral: 'hex',
    };
    const wrong = Object.values(kinds).find((k) => k !== kinds[ward])!;
    g.element(wrong, o().x, o().z);
    const held = !o().broken;
    g.element(kinds[ward], o().x, o().z);
    g.sim(0.3);
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    g.sim(0.05);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    const whole = g.bolts[0]?.damage ?? 0;
    g.sim(0.05, true);
    return { ward, sap, drained, toast, held, broken: o().broken, sapAfter: g.sap, weak, whole };
  });
  expect(ob).toMatchObject({ sap: 0.5, held: true, broken: true, sapAfter: 1 });
  expect(ob.drained).toBeGreaterThan(2);
  expect(ob.toast).toMatch(/saps your magic/);
  expect(ob.weak).toBeGreaterThan(0);
  expect(ob.whole).toBeCloseTo(ob.weak * 2, 5);
  await page.screenshot({ path: 'test-results/smoke-obelisk.png' });
  expect(errors).toEqual([]);
});

test('rope bridges, currents and candles in water: a bridge carries the mage over a chasm until fire burns it through; a current carries the mage and what lies in it, and stops when frozen; stands in water light it and go out to a shock', async ({
  page,
}) => {
  type P = { kind: string; x: number; z: number; lit: boolean; burning: number };
  type GB = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    props: P[];
    element(kind: string, x: number, z: number): void;
    spawn(kind: string, x: number, z: number): { x: number; z: number; dead?: boolean };
    enemies: { asleep?: boolean; spawn: number }[];
    player: { x: number; z: number; vx: number; vz: number; hp: number; invuln: number };
    pools: { kind: string; state: string; tiles: { x: number; z: number }[] }[];
    pool(what: string): void;
    flow: { dir: string | null; falls: number };
    drop(kind: string, x?: number, z?: number): void;
    pickups: { kind: string; x: number; z: number }[];
    current: { template: { tiles: string[][] }; bounds: { minX: number; minZ: number } };
  };
  let errors = await start(page, '?room=rope_chasm&seed=BRIDGE1');
  const bridge = await page.evaluate(() => {
    const g = (window as unknown as { __game: GB }).__game,
      P = g.player;
    g.warp(1);
    g.clearRoom();
    g.sim(0.3);
    P.invuln = 0;
    const b = g.props.find((p) => p.kind === 'bridge')!,
      tile = (x: number, z: number) =>
        g.current.template.tiles[Math.floor(z - g.current.bounds.minZ)][Math.floor(x - g.current.bounds.minX)];
    P.x = b.x;
    P.z = b.z;
    P.vx = P.vz = 0;
    g.sim(0.5);
    const held = Math.hypot(P.x - b.x, P.z - b.z) < 0.1; // (standing on it, over the chasm)
    const foe = g.spawn('rotling', b.x, b.z + 0.8);
    g.sim(0.3);
    foe.x = b.x;
    foe.z = b.z + 0.8;
    P.z = b.z - 0.6;
    const hp = P.hp;
    g.element('burn', b.x, b.z);
    const burning = (g.props.find((p) => p.kind === 'bridge' && p.x === b.x)?.burning ?? 0) > 0;
    const standing = () => g.props.some((p) => p.kind === 'bridge' && p.x === b.x);
    for (let t = 0; t < 6 && standing(); t += 0.05) {
      P.x = b.x;
      P.z = b.z - 0.6;
      P.vx = P.vz = 0;
      foe.x = b.x;
      foe.z = b.z + 0.8;
      P.invuln = t < 3.8 ? 99 : 0;
      g.sim(0.05);
    } // (on it as it burns through)
    g.sim(0.3);
    return {
      held,
      burning,
      gone: !g.props.some((p) => p.kind === 'bridge' && p.x === b.x),
      chasm: tile(b.x, b.z),
      fell: !!foe.dead,
      hurt: hp - P.hp,
      ledge: tile(P.x, P.z),
    };
  });
  expect(bridge).toMatchObject({ held: true, burning: true, gone: true, chasm: 'pit', fell: true, ledge: 'floor' });
  expect(bridge.hurt).toBeGreaterThan(0);
  await page.evaluate(() => (window as unknown as { __game: GB }).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-bridge.png' });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=mill_race&seed=RACE1');
  const race = await page.evaluate(() => {
    const g = (window as unknown as { __game: GB }).__game,
      P = g.player;
    g.warp(1);
    g.clearRoom();
    g.sim(0.3);
    P.invuln = 99;
    const w = g.pools.find((p) => p.kind === 'water')!,
      top = w.tiles.reduce((a, t) => (t.z < a.z ? t : a));
    P.x = top.x;
    P.z = top.z + 0.6;
    P.vx = P.vz = 0;
    const z0 = P.z;
    g.sim(1);
    const carried = P.z - z0;
    P.x = top.x + 5;
    P.z = top.z + 3; // (out of the race and away: obols would drift to the mage)
    g.drop('key', top.x, top.z + 1.2);
    g.sim(0.8);
    const key = g.pickups.find((q) => q.kind === 'key')!,
      kz0 = key.z;
    g.sim(1);
    const drifted = key.z - kz0;
    g.pool('frost');
    P.x = top.x;
    P.z = top.z + 0.6;
    const z1 = P.z;
    g.sim(1);
    const frozen = P.z - z1;
    return { flow: g.flow, carried, drifted, frozen, state: g.pools.find((p) => p.kind === 'water')!.state };
  });
  expect(race.flow).toEqual({ dir: 's', falls: 1 });
  expect(race.carried).toBeGreaterThan(1);
  expect(race.drifted).toBeGreaterThan(0.8);
  expect(race.state).toBe('frozen');
  expect(Math.abs(race.frozen)).toBeLessThan(0.1);
  expect(errors).toEqual([]);

  errors = await start(page, '?room=flooded_hall&seed=FLOOD1');
  const stands = await page.evaluate(() => {
    const g = (window as unknown as { __game: GB }).__game,
      P = g.player;
    g.warp(1);
    g.clearRoom();
    g.sim(0.3);
    P.invuln = 99;
    const wet = () => g.props.filter((p) => p.kind === 'wetCandles');
    const count = wet().length;
    for (const p of wet()) g.element('burn', p.x, p.z);
    const lit = wet().filter((p) => p.lit).length,
      reliquary = g.props.some((p) => p.kind === 'reliquary');
    g.pool('shock');
    g.sim(0.2);
    return { count, lit, reliquary, afterShock: wet().filter((p) => p.lit).length };
  });
  expect(stands).toEqual({ count: 4, lit: 4, reliquary: false, afterShock: 0 }); // (every stand lit opened the reliquary)
  await page.evaluate(() => (window as unknown as { __game: GB }).__game.sim(0.05, true));
  expect(errors).toEqual([]);
});

test("candle stands: all lit, a reliquary opens with its hoard and a chapel blesses the next casts; the frozen mausoleum's dead wait in ice", async ({
  page,
}) => {
  type P = { kind: string; x: number; z: number; lit: boolean };
  type E = { x: number; z: number; dead?: boolean; asleep?: boolean; entombed?: unknown; isBoss?: boolean };
  type G8 = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    keys: Set<string>;
    arrowOrder: string[];
    current: { cx: number; cz: number; bounds: { minX: number; minZ: number }; theme?: { id: string } };
    props: P[];
    pickups: unknown[];
    enemies: E[];
    element(kind: string, x: number, z: number): void;
    burn(x: number, z: number, r?: number): void;
    player: {
      x: number;
      z: number;
      vx: number;
      vz: number;
      hp: number;
      maxHp: number;
      invuln: number;
      blessed: number;
      stats: { speed: number };
    };
  };
  let errors = await start(page, '?room=reliquary_gallery&variant=dark');
  const reliquary = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 & { lightLevels(): { hemi: number } } }).__game;
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    g.sim(2);
    const dark = g.lightLevels().hemi,
      stands = g.props.filter((p) => p.kind === 'candles'),
      pickups = g.pickups.length;
    for (const s of stands.slice(1)) g.element('burn', s.x, s.z);
    const sealed = g.props.some((p) => p.kind === 'reliquary');
    g.element('burn', stands[0].x, stands[0].z);
    g.sim(0.2);
    const opened = !g.props.some((p) => p.kind === 'reliquary'),
      hoard = g.pickups.length - pickups;
    g.sim(2);
    const lifted = g.lightLevels().hemi;
    g.warp(0);
    g.sim(1);
    g.warp(1);
    g.sim(2); // the dark stays away once the candles are lit
    return {
      stands: stands.length,
      sealedWhileOneDark: sealed,
      opened,
      hoard,
      lifted: lifted > dark * 1.5,
      stays: g.lightLevels().hemi > dark * 1.5,
    };
  });
  expect(reliquary).toMatchObject({ stands: 4, sealedWhileOneDark: true, opened: true, lifted: true, stays: true });
  expect(reliquary.hoard).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);

  // a glyph's blast knocks the one dark stand over in burning wax; the others are lit, so the reliquary opens
  errors = await start(page, '?room=reliquary_gallery&loot=glyphs:1');
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game;
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    g.sim(0.5);
    const stands = g.props.filter((p) => p.kind === 'candles');
    for (const s of stands.slice(1)) g.element('burn', s.x, s.z);
    g.player.x = stands[0].x + 0.9;
    g.player.z = stands[0].z;
    g.player.vx = g.player.vz = 0;
  });
  await page.keyboard.press('Space');
  const knocked = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game;
    g.sim(0.05);
    g.player.x += 4;
    g.sim(3);
    return {
      stands: g.props.filter((p) => p.kind === 'candles').length,
      opened: !g.props.some((p) => p.kind === 'reliquary'),
    };
  });
  expect(knocked).toEqual({ stands: 3, opened: true });
  expect(errors).toEqual([]);

  // with every stand knocked over, nothing holds the seal: the reliquary breaks open (and nothing else happens)
  errors = await start(page, '?room=reliquary_gallery&variant=dark&loot=glyphs:4');
  const spots = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game;
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    g.sim(0.5);
    return g.props
      .filter((p) => p.kind === 'candles')
      .map((p) => ({ x: p.x + (p.x < g.current.cx ? 0.9 : -0.9), z: p.z }));
  });
  for (const s of spots) {
    await page.evaluate((q) => {
      const g = (window as unknown as { __game: G8 }).__game;
      g.player.x = q.x;
      g.player.z = q.z;
      g.player.vx = g.player.vz = 0;
      g.sim(0.05);
    }, s);
    await page.keyboard.press('Space');
    await page.evaluate(() => {
      const g = (window as unknown as { __game: G8 }).__game;
      g.sim(0.05);
      g.player.x = g.current.cx;
      g.player.z = g.current.cz + 2;
      g.sim(3);
    });
  }
  const bare = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 & { current: { candlesLit?: boolean } } }).__game;
    return {
      stands: g.props.filter((p) => p.kind === 'candles').length,
      opened: !g.props.some((p) => p.kind === 'reliquary'),
      lit: !!g.current.candlesLit,
    };
  });
  expect(bare).toEqual({ stands: 0, opened: true, lit: false });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=chapel_nave');
  const blessing = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game;
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    g.sim(0.5);
    for (const s of g.props.filter((p) => p.kind === 'candles')) g.element('burn', s.x, s.z);
    const blessed = g.player.blessed,
      toast = document.getElementById('toast')!.textContent;
    g.player.x = g.current.cx;
    g.player.z = g.current.cz + 2;
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    g.sim(0.05);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    g.sim(0.5);
    return { blessed, toast, after: g.player.blessed };
  });
  expect(blessing).toEqual({ blessed: 6, toast: 'The candles bless your next 6 casts', after: 5 });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=mausoleum_tombs');
  const rime = await page.evaluate(() => {
    const g = (window as unknown as { __game: G8 }).__game;
    g.warp(1);
    const foes = g.enemies.filter((e) => !e.isBoss),
      at = foes.map((e) => ({ x: e.x, z: e.z }));
    g.player.x = g.current.bounds.minX + 1.5;
    g.player.z = g.current.bounds.minZ + 6.5;
    g.player.vx = g.player.vz = 0;
    for (let t = 0; t < 2; t += 0.5) {
      g.player.hp = g.player.maxHp;
      g.player.invuln = 99;
      g.sim(0.5);
    }
    const frozen = foes.every((e, i) => e.entombed && e.asleep && Math.hypot(e.x - at[i].x, e.z - at[i].z) < 0.05);
    // rime underfoot: the mage slides on after letting go
    g.keys.add('KeyD');
    g.sim(0.6);
    g.keys.delete('KeyD');
    const v0 = g.player.vx;
    g.sim(0.15);
    const glide = g.player.vx / v0;
    // fire thaws one out of its ice
    const thawed = foes[0];
    g.burn(thawed.x, thawed.z, 0.3);
    g.sim(0.1);
    const runes = (g.props as unknown as { kind: string; school: string | null }[])
      .filter((p) => p.kind === 'rune')
      .map((p) => p.school);
    return {
      theme: g.current.theme?.id,
      count: foes.length,
      frozen,
      glide,
      thawed: !thawed.asleep && !thawed.entombed,
      othersStill: foes.slice(1).every((e) => e.entombed),
      runes,
    };
  });
  expect(rime).toMatchObject({
    theme: 'mausoleum',
    frozen: true,
    thawed: true,
    othersStill: true,
    runes: ['chill', 'chill'],
  }); // its rune stones hold frost
  expect(rime.count).toBeGreaterThan(1);
  expect(rime.glide).toBeGreaterThan(0.45); // on stone the mage stops within a few steps (under .15 of the speed)
  expect(errors).toEqual([]);

  // its water is ice, until fire finds it
  errors = await start(page, '?room=mausoleum_hall');
  const ice = await page.evaluate(() => {
    const g = (
      window as unknown as {
        __game: G8 & { pools: { kind: string; state: string; tiles: { x: number; z: number }[] }[] };
      }
    ).__game;
    g.warp(1);
    g.clearRoom();
    g.sim(5);
    const before = g.pools.map((p) => p.state),
      t = g.pools[0].tiles[0];
    g.burn(t.x, t.z);
    g.sim(0.1);
    return { before, after: g.pools.map((p) => p.state) };
  });
  expect(ice).toEqual({ before: ['frozen'], after: ['still'] });
  expect(errors).toEqual([]);
});
