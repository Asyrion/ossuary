import { expect, test } from '@playwright/test';
import { type Foe, type GameHooks, type W, start, type G10, type G13 } from './helpers';

test('statuses: chill freezes and stops a foe, Shatter and Overload go off, bosses never freeze, the dummy never falls', async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&seed=STAT1&spells=arc');
  const frozen = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10,
      P = g.player;
    g.warp(1);
    g.sim(0.3);
    const foe = g.spawn('rotling', P.x, P.z - 3);
    g.sim(0.8);
    for (let i = 0; i < 3; i++) g.inflict({ chill: 1 });
    const at = { x: foe.x, z: foe.z },
      hp = P.hp;
    g.sim(1);
    return { frozen: (foe.status?.frozen ?? 0) > 0, moved: Math.hypot(foe.x - at.x, foe.z - at.z), hurt: hp - P.hp };
  });
  expect(frozen).toEqual({ frozen: true, moved: 0, hurt: 0 });
  // Shatter: Arc's shock on the frozen foe
  const shatter = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10,
      foe = g.enemies[0],
      hp = foe.hp;
    g.cast(0, { x: 0, z: -1 });
    g.sim(0.05);
    return { frozen: (foe.status?.frozen ?? 0) > 0, damage: hp - Math.max(0, foe.hp), dead: !!foe.dead };
  });
  expect(shatter.frozen).toBe(false);
  expect(shatter.damage >= 9 || shatter.dead).toBe(true); // Arc (cracked ice: ×1.5) and the shatter's own blow
  // Overload: a burning foe shocked
  const overload = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10,
      P = g.player;
    g.sim(0.5);
    const foe = g.spawn('rotling', P.x + 2, P.z - 3);
    g.sim(0.8);
    foe.hp = 40;
    g.inflict({ burn: 4 });
    const burning = foe.status!.burn;
    g.inflict({ shock: 2 });
    return { burning, burn: foe.status!.burn, shock: foe.status!.shock, damage: 40 - foe.hp };
  });
  expect(overload).toMatchObject({ burning: 4, burn: 0, shock: 0 });
  expect(overload.damage).toBeGreaterThanOrEqual(10);
  // a boss is slowed but never frozen; the training dummy never falls and lists its statuses
  const boss = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G10,
      P = g.player;
    g.sim(1);
    const warden = g.spawn('warden', P.x - 3, P.z - 3),
      dummy = g.spawn('dummy', P.x + 3, P.z - 3);
    g.sim(0.8);
    for (let i = 0; i < 4; i++) g.inflict({ chill: 1 });
    const wardenFrozen = (warden.status?.frozen ?? 0) > 0,
      wardenChill = warden.status?.chill;
    for (let k = 0; k < 70; k++) {
      (P as unknown as { invuln: number }).invuln = 9;
      g.sim(0.05);
    } // (the cold thaws: fire now is a burn, not Steam)
    g.inflict({ burn: 2 });
    dummy.hp = 1;
    g.sim(0.6);
    const d = g.enemies.find((e) => e.type === 'dummy')!;
    return { wardenFrozen, wardenChill, dummyHp: d.hp, dummyMax: d.maxHp, label: d.label?.userData.text };
  });
  expect(boss).toMatchObject({ wardenFrozen: false, wardenChill: 2 });
  expect(boss.dummyHp).toBe(boss.dummyMax);
  expect(boss.label).toMatch(/Burn/);
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-statuses.png' });
  expect(errors).toEqual([]);
});

test('water and oil: the lance lights oil that burns foes and the mage; shock runs through water; frost freezes it; wading is slow', async ({
  page,
}) => {
  const errors = await start(page, '?room=oil_and_water&seed=PW1&spells=cinder_lance,arc');
  // oil: a rotling standing in it, the lance through it
  const oil = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G13,
      P = g.player;
    g.warp(1);
    g.sim(0.2);
    g.clearRoom();
    g.sim(0.3);
    const pool = () => g.pools.find((q) => q.kind === 'oil')!,
      t = pool().tiles[0];
    const foe = g.spawn('rotling', t.x, t.z);
    g.sim(0.7);
    foe.hp = 60;
    foe.x = t.x;
    foe.z = t.z;
    P.x = t.x;
    P.z = t.z + 3;
    g.cast(0, { x: 0, z: -1 });
    g.sim(0.1);
    const lit = pool().state,
      burning = foe.status?.burn ?? 0;
    P.x = t.x;
    P.z = t.z;
    P.invuln = 0;
    const hp = P.hp;
    g.sim(0.1);
    const hurt = hp - P.hp;
    P.z = t.z + 3;
    g.sim(5.5);
    return {
      lit,
      burning,
      hurt,
      after: pool().state,
      other: g.pools.filter((q) => q.kind === 'oil').map((q) => q.state),
    };
  });
  expect(oil).toMatchObject({ lit: 'burning', after: 'spent', other: ['spent', 'still'] }); // only the pool it touched
  expect(oil.burning).toBeGreaterThan(0);
  expect(oil.hurt).toBeGreaterThan(0);
  // water: wading is slower than walking; a shock in it reaches every foe standing in it, and the mage
  const water = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G13,
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    P.hp = P.maxHp;
    const pool = g.pools.filter((q) => q.kind === 'water').sort((a, b) => b.tiles[0].z - a.tiles[0].z)[0];
    const xs = pool.tiles.map((t) => t.x),
      zs = pool.tiles.map((t) => t.z),
      x0 = Math.min(...xs),
      z0 = Math.min(...zs);
    const walk = (x: number, z: number) => {
      P.x = x;
      P.z = z;
      P.vx = P.vz = 0;
      g.keys.add('KeyD');
      g.sim(0.5);
      g.keys.delete('KeyD');
      const d = P.x - x;
      g.sim(0.3);
      return d;
    };
    const wading = walk(x0 - 0.3, z0),
      dry = walk(x0 - 0.3, z0 - 3.2);
    const a = g.spawn('rotling', x0 + 2, z0),
      b = g.spawn('rotling', x0 + 2, z0 + 1),
      c = g.spawn('rotling', x0 + 4, z0 - 2.5);
    g.sim(0.7);
    for (const f of [a, b, c]) f.hp = 60;
    a.x = x0 + 2;
    a.z = z0;
    b.x = x0 + 2;
    b.z = z0 + 1;
    c.x = x0 + 4;
    c.z = z0 - 2.5;
    P.x = x0;
    P.z = z0 + 1;
    P.invuln = 0;
    const hp = P.hp;
    g.pool('shock');
    return { ratio: wading / dry, shocked: [a, b, c].map((f) => (f.status?.shock ?? 0) > 0), hurt: hp - P.hp };
  });
  expect(water.ratio).toBeGreaterThan(0.45);
  expect(water.ratio).toBeLessThan(0.75);
  expect(water.shocked).toEqual([true, true, false]); // not the foe on dry floor
  expect(water.hurt).toBeGreaterThan(0);
  // Arc on a foe in water carries too; Rime Shards freeze the pool, which then conducts nothing and is crossed at full speed
  const ice = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G13,
      P = g.player;
    g.clearRoom();
    g.sim(2);
    P.hp = P.maxHp;
    const pool = () => g.pools.filter((q) => q.kind === 'water').sort((a, b) => b.tiles[0].z - a.tiles[0].z)[0];
    const xs = pool().tiles.map((t) => t.x),
      zs = pool().tiles.map((t) => t.z),
      x0 = Math.min(...xs),
      z0 = Math.min(...zs);
    const a = g.spawn('rotling', x0, z0),
      b = g.spawn('rotling', x0 + 2, z0 + 1);
    g.sim(0.7);
    a.hp = b.hp = 60;
    a.x = x0;
    a.z = z0;
    b.x = x0 + 2;
    b.z = z0 + 1;
    P.x = x0 + 5;
    P.z = z0;
    g.mana(999);
    g.player.spellCd[1] = 0;
    g.cast(1, { x: -1, z: 0 });
    g.sim(0.05);
    const carried = [a, b].every((f) => f.hp < 60);
    g.clearRoom();
    g.sim(1);
    g.learn('rime_shards', 0);
    P.x = x0 + 4;
    P.z = z0;
    g.player.spellCd[0] = 0;
    g.cast(0, { x: -1, z: 0 });
    g.sim(0.4);
    const frozen = pool().state;
    P.x = x0 - 0.3;
    P.z = z0;
    P.vx = P.vz = 0;
    g.keys.add('KeyD');
    g.sim(0.5);
    g.keys.delete('KeyD');
    return { carried, frozen, moved: P.x - (x0 - 0.3) };
  });
  expect(ice).toMatchObject({ carried: true, frozen: 'frozen' });
  expect(ice.moved).toBeGreaterThan(1.6); // full speed on the ice
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-pools.png' });
  expect(errors).toEqual([]);
});

test("what is done to the mage shows beside the mana bar: a hexing blow (with the mana it took), chill and a basilisk's stone; each says what it is the first time", async ({
  page,
}) => {
  type GA = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): unknown;
    shoot(x: number, z: number, dx: number, dz: number, o?: { hex?: number }): void;
    ground: { web: number };
    player: {
      x: number;
      z: number;
      mana: number;
      hp: number;
      maxHp: number;
      invuln: number;
      chill: number;
      stone: number;
    };
  };
  const errors = await start(page, '?seed=K3F9QX&room=great_hall&variant=quiet');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GA }).__game,
      chips = () => document.getElementById('afflict')!.textContent ?? '',
      line = () => document.getElementById('toast')!.textContent ?? '';
    g.player.maxHp = g.player.hp = 12;
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    const mana0 = g.player.mana;
    g.shoot(g.player.x + 2, g.player.z, -1, 0, { hex: 8 });
    g.sim(0.6);
    const hex = { chips: chips(), took: mana0 - g.player.mana, line: line() };
    g.sim(4);
    g.player.chill = 2;
    g.player.stone = 2;
    g.sim(0.05);
    const both = chips();
    g.sim(2.5);
    const cleared = chips();
    return { hex, both, cleared };
  });
  expect(r.hex.took).toBeGreaterThan(6.5);
  expect(r.hex.chips).toContain('Hexed −8 mana'); // (mana comes back a little while the shot flies) expect(r.hex.line).toContain('hexed blow');
  expect(r.both).toContain('Chilled');
  expect(r.both).toContain('Heavy as stone');
  expect(r.cleared).toBe('');
  expect(errors).toEqual([]);
});

test('Steam (Ember + Frost): a chilled foe set burning goes up in steam, scalded; shots thrown out of it go wide; fire on ice and frost on burning oil steam too', async ({
  page,
}) => {
  type S = { x: number; z: number; vx: number; vz: number };
  type GS = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): { hp: number; status?: { chill: number; burn: number } };
    inflict(s: Record<string, number>): void;
    steam: number;
    steamAt(x: number, z: number): void;
    shoot(x: number, z: number, dx: number, dz: number): void;
    shots: S[];
    pool(kind: string): void;
    pools: { kind: string; state: string; tiles: { x: number; z: number }[] }[];
    burn(x: number, z: number, r?: number): void;
    element(kind: string, x: number, z: number): void;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number };
  };
  const errors = await start(page, '?seed=K3F9QX&room=great_hall&variant=quiet');
  const foe = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    const e = g.spawn('rotling', g.player.x + 3, g.player.z);
    g.sim(0.8);
    const hp = e.hp;
    g.inflict({ chill: 1 });
    g.inflict({ burn: 3 });
    g.sim(0.05);
    const steam = g.steam,
      after = { chill: e.status?.chill, burn: e.status?.burn, scalded: hp - e.hp };
    // shots thrown from inside a cloud go wide; from outside, straight
    const spread = (x: number, z: number) => {
      let worst = 0;
      for (let i = 0; i < 24; i++) {
        const n = g.shots.length;
        g.shoot(x, z, 1, 0);
        const s = g.shots[n];
        worst = Math.max(worst, Math.abs(Math.atan2(s.vz, s.vx)));
      }
      return worst;
    };
    g.steamAt(g.player.x - 3, g.player.z - 2);
    const inside = spread(g.player.x - 3, g.player.z - 2),
      outside = spread(g.player.x - 7, g.player.z - 3); // (clear of both clouds)
    return { steam, after, inside, outside };
  });
  expect(foe.steam).toBeGreaterThanOrEqual(1);
  expect(foe.after).toMatchObject({ chill: 0, burn: 0 });
  expect(foe.after.scalded).toBeGreaterThan(0);
  expect(foe.inside).toBeGreaterThan(0.2);
  expect(foe.outside).toBeLessThan(0.01);
  errors.push(...(await start(page, '?seed=K3F9QX&room=oil_and_water')));
  const tiles = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    const water = g.pools.find((p) => p.kind === 'water')!,
      oil = g.pools.find((p) => p.kind === 'oil')!;
    g.pool('frost');
    const s0 = g.steam;
    g.burn(water.tiles[0].x, water.tiles[0].z, 0.3);
    const iceSteams = g.steam - s0;
    const oilNow = () => g.pools.find((p) => p.kind === 'oil')!.state; // (the hook reads them afresh each time)
    g.burn(oil.tiles[0].x, oil.tiles[0].z, 0.3);
    g.sim(0.2);
    const lit = oilNow();
    const s1 = g.steam;
    g.element('chill', oil.tiles[0].x, oil.tiles[0].z);
    g.sim(0.05);
    return { iceSteams, lit, oilSteams: g.steam - s1, oil: oilNow() };
  });
  expect(tiles).toMatchObject({ lit: 'burning', oil: 'spent' });
  expect(tiles.iceSteams).toBeGreaterThan(0);
  expect(tiles.oilSteams).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("any build can bring a water foe up: a glyph's blast in its water, fire boiling it to steam (a scald), or a shock through it", async ({
  page,
}) => {
  type F = { state: string; hidden?: boolean; hp: number; x: number; z: number; dead?: boolean };
  type GW = {
    sim(sec: number): void;
    warp(id: number): void;
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): F;
    blast(x: number, z: number): void;
    burn(x: number, z: number, r?: number): void;
    pool(kind: string): void;
    enemies: F[];
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number };
  };
  const errors = await start(page, '?seed=K3F9QX&floor=2&room=great_hall&variant=quiet');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GW }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.6);
    const out: Record<string, { hidden: boolean; up: string; shown: boolean; scald?: number }> = {};
    for (const id of ['cisternLurker', 'brineSerpent', 'glassNewt'])
      for (const way of ['blast', 'steam', 'shock']) {
        g.clearRoom();
        g.sim(0.3);
        const e = g.spawn(id, g.player.x + 5, g.player.z - 3);
        g.sim(0.9);
        for (let k = 0; k < 60 && !e.hidden; k++) {
          g.player.hp = 99;
          g.sim(0.05);
        } // (until it is under)
        const hidden = !!e.hidden,
          hp = e.hp;
        if (way === 'blast') g.blast(e.x, e.z);
        else if (way === 'steam') g.burn(e.x, e.z, 0.3);
        else g.pool('shock');
        g.sim(0.05);
        out[`${id}:${way}`] = { hidden, up: e.state, shown: !e.hidden, scald: way === 'steam' ? hp - e.hp : undefined };
      }
    return out;
  });
  for (const [k, v] of Object.entries(r)) {
    expect(v.hidden, `${k} hid`).toBe(true);
    expect(v.shown, `${k} came up (${v.up})`).toBe(true);
    if (k.endsWith('steam')) expect(v.scald, `${k} scalded`).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test("the full wheel: Searing opens a shut eye, a Prism splits a bolt in three, Verdict strikes every sanctified foe, Black Ice slides foes (not the mage) and fire melts it, a Void Spark carries hexes and its marked give mana; a shock through burning oil and a hex on holy ground react; the book's wheel fills in", async ({
  page,
}) => {
  type E = Foe & {
    hp: number;
    maxHp: number;
    state?: string;
    guard?: number;
    target?: { x: number; z: number };
    slide?: unknown;
    status?: Record<string, number>;
  };
  type GW = Omit<GameHooks, 'enemies' | 'player'> & {
    enemies: E[];
    player: GameHooks['player'] & { invuln: number };
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): E;
    inflict(s: Record<string, number>): void;
    hit(i: number, dmg: number, school?: string, by?: string): number;
    reaction(r: string, x?: number, z?: number): number[];
    reactions: string[];
    forgetReactions(): void;
    bolts: { secondary: boolean }[];
    spellFx: { strikes: number };
    mana(v?: number): number;
    learn(id: string, slot: number): void;
    cast(slot: number): boolean;
    layGround(kind: string, x: number, z: number, by?: string): void;
    foeGround(i: number): { slide: boolean };
    ground: Record<string, number>;
    burn(x: number, z: number, r?: number): void;
    steamAt(x: number, z: number): void;
    element(kind: string, x: number, z: number): void;
    pool(what: string): void;
    pools: { kind: string; state: string; tiles: { x: number; z: number }[] }[];
  };
  const errors = await start(page, '?seed=K3F9QX&room=great_hall&variant=quiet');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GW }).__game,
      P = g.player;
    P.maxHp = P.hp = 99;
    P.invuln = 999;
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    g.forgetReactions();
    const at = (e: E) => g.enemies.indexOf(e),
      fresh = () => {
        g.clearRoom();
        g.sim(0.1);
      };
    // Searing: a shut Radiant Eye turns half a blow; seared, a full one
    const eye = g.spawn('radiantEye', P.x + 3, P.z - 1);
    g.sim(0.8);
    eye.hp = eye.maxHp = 200;
    let h = eye.hp;
    g.hit(at(eye), 10);
    const shutTook = h - eye.hp,
      shut = eye.state === 'shut';
    g.inflict({ sanct: 3 });
    g.inflict({ burn: 4 });
    const seared = eye.status?.seared ?? 0;
    eye.state = 'shut';
    eye.guard = 0.5;
    h = eye.hp;
    g.hit(at(eye), 10);
    const searedTook = h - eye.hp;
    // the eye, open, loses the mage behind steam: it strikes where they last showed
    eye.status = undefined;
    eye.state = 'track';
    (eye as { st?: number }).st = 5;
    eye.target = undefined;
    g.sim(0.05);
    const was = { ...eye.target! };
    g.steamAt((eye.x + P.x) / 2, (eye.z + P.z) / 2);
    P.x += 1.5;
    g.sim(0.1);
    const lost = Math.hypot(eye.target!.x - was.x, eye.target!.z - was.z) < 0.01;
    P.x -= 1.5;
    fresh();
    // Prism: frozen in holy light, a dummy splits the cantrip in three
    const prismAt = g.reaction('prism', P.x, P.z - 3)[0],
      prism = (g.enemies[prismAt].status?.prism ?? 0) > 0;
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    for (let k = 0; k < 20 && !g.bolts.length; k++) g.sim(0.02);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0; // (one bolt)
    let split = 0;
    for (let k = 0; k < 40 && !split; k++) {
      g.sim(0.02);
      split = g.bolts.filter((b) => b.secondary).length;
    }
    fresh();
    // Verdict: three sanctified, one shocked: lightning on all three
    const s0 = g.spellFx.strikes,
      vd = g.reaction('verdict'),
      stunned = vd.filter((i) => (g.enemies[i].status?.stun ?? 0) > 0).length,
      strikes = g.spellFx.strikes - s0;
    fresh();
    // Black Ice: under a chilled foe hexed; a walker on it slides, the mage crosses it at full speed, fire melts it
    g.reaction('blackice', P.x, P.z - 3);
    g.sim(0.05);
    const black = g.ground.blackice,
      drawn = g.ground.blackiceDrawn;
    fresh();
    const walker = g.spawn('runeBeetle', P.x + 2, P.z - 3);
    g.sim(0.8);
    g.layGround('blackice', walker.x, walker.z);
    g.sim(0.1);
    const slides = g.foeGround(at(walker)).slide;
    fresh();
    const ice = { x: P.x, z: P.z - 1.2 };
    g.layGround('blackice', ice.x, ice.z);
    const z0 = P.z;
    g.keys.add('KeyW');
    g.sim(0.6);
    g.keys.delete('KeyW');
    const walked = z0 - P.z;
    g.burn(ice.x, ice.z, 0.5);
    g.sim(0.1);
    const melted = g.ground.blackice;
    fresh();
    // Void Spark: hexed, shocked: the spark leaps, carrying a hex; a marked foe falling gives mana
    const vs = g.reaction('voidspark'),
      carried = vs
        .slice(1)
        .filter((i) => (g.enemies[i].status?.hex ?? 0) > 0 && (g.enemies[i].status?.voidT ?? 0) > 0).length;
    fresh();
    const marked = g.spawn('rotling', P.x + 2, P.z - 2);
    g.sim(0.8);
    g.inflict({ shock: 1 });
    marked.status!.voidT = 4;
    g.mana(0);
    g.hit(at(marked), 999);
    const mana = g.mana();
    fresh();
    // a hex on Consecrate's holy ground: everyone standing in it under a black sun
    g.learn('consecrate', 0);
    g.mana(999);
    const a = g.spawn('rotling', P.x + 0.8, P.z),
      b = g.spawn('rotling', P.x - 0.8, P.z);
    g.sim(0.8);
    a.hp = b.hp = 99;
    g.cast(0);
    g.sim(0.2);
    g.element('hex', P.x, P.z);
    g.sim(0.05);
    const eclipsed = [a, b].filter((e) => (e.status?.eclipse ?? 0) > 0).length;
    return {
      shut,
      shutTook,
      seared,
      searedTook,
      lost,
      prism,
      split,
      stunned,
      strikes,
      black,
      drawn,
      slides,
      walked,
      melted,
      carried,
      mana,
      eclipsed,
      found: g.reactions,
    };
  });
  expect(r.shut).toBe(true);
  expect(r.seared).toBeGreaterThan(0);
  expect(r.searedTook).toBeCloseTo(r.shutTook * 2, 1);
  expect(r.lost).toBe(true);
  expect(r.prism).toBe(true);
  expect(r.split).toBe(3);
  expect(r.stunned).toBe(3);
  expect(r.strikes).toBeGreaterThanOrEqual(3);
  expect(r.black).toBe(1);
  expect(r.drawn).toBe(1);
  expect(r.slides).toBe(true);
  expect(r.walked).toBeGreaterThan(1.2);
  expect(r.melted).toBe(0);
  expect(r.carried).toBe(2);
  expect(r.mana).toBeGreaterThanOrEqual(6);
  expect(r.eclipsed).toBe(2);
  expect(r.found).toEqual(expect.arrayContaining(['searing', 'prism', 'verdict', 'blackice', 'voidspark', 'eclipse']));
  // a shock through burning oil: an Overload at the pool's middle, the fire blown out
  errors.push(...(await start(page, '?seed=K3F9QX&room=oil_and_water')));
  const oil = await page.evaluate(() => {
    const g = (window as unknown as { __game: GW }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    g.forgetReactions();
    const pool = g.pools.find((p) => p.kind === 'oil')!,
      t = pool.tiles[0];
    g.burn(t.x, t.z, 0.3);
    g.sim(0.2);
    const lit = g.pools.find((p) => p.kind === 'oil')!.state;
    g.pool('shock');
    g.sim(0.05); // (a shock run through every pool in the room)
    return { lit, after: g.pools.find((p) => p.kind === 'oil')!.state, found: g.reactions };
  });
  expect(oil).toEqual({ lit: 'burning', after: 'spent', found: ['overload'] });
  // the book: a wheel of every pair, the ones found lit
  await page.evaluate(() => {
    const g = (window as unknown as { __game: GW }).__game;
    g.learn('arc', 0);
  });
  await page.keyboard.press('i');
  await page.keyboard.press('e');
  const tiles = page.locator('#invList .tile');
  await tiles.nth((await tiles.count()) - 14 - 17).click(); // (the wheel's second entry of fifteen: Overload; the seventeen weaves come after it)
  await expect(page.locator('#invDetail h3')).toHaveText('Overload');
  await expect(page.locator('#invDetail .wheel svg line')).toHaveCount(15); // (every pair of the six schools)
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test("the curve: an open sluice drains a water room to mud and keeps its lurker up; a floor that walls off the mage's one school says so and its library leans to a counter; holy light gives back what a hex took", async ({
  page,
}) => {
  type GC = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): { hidden?: boolean; state?: string };
    props: { kind: string; x: number; z: number; open: number }[];
    pools: { mud: boolean }[];
    blast(x: number, z: number): void;
    pages: { spell: string; kind: string }[];
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number };
    learn(id: string, slot: number): void;
    cast(slot: number): boolean;
    mana(v?: number): number;
    shoot(x: number, z: number, dx: number, dz: number, o?: { hex?: number }): void;
    startGame(o: object): void;
  };
  const errors = await start(page, '?room=flooded_hall&floor=2&variant=quiet');
  const sl = await page.evaluate(() => {
    const g = (window as unknown as { __game: GC }).__game,
      P = g.player;
    P.maxHp = P.hp = 99;
    P.invuln = 999;
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    const s = g.props.find((b) => b.kind === 'sluice')!,
      lurk = g.spawn('cisternLurker', P.x, P.z - 2.5);
    g.sim(1.5);
    const hid = !!lurk.hidden;
    g.blast(s.x, s.z);
    g.sim(0.4);
    const up = !lurk.hidden,
      open = g.props.find((b) => b.kind === 'sluice')!.open,
      mud = g.pools.some((p) => p.mud);
    g.sim(4);
    const stillUp = !lurk.hidden; // (it would have dived by now: the open sluice keeps it up)
    g.sim(5);
    return {
      hid,
      up,
      open,
      mud,
      stillUp,
      shut: g.props.find((b) => b.kind === 'sluice')!.open,
      water: !g.pools.some((p) => p.mud),
    };
  });
  expect(sl).toMatchObject({ hid: true, up: true, mud: true, stillUp: true, shut: 0, water: true });
  expect(sl.open).toBeGreaterThan(5);
  // floor 3 with only Ember spells: its banner's line says the heat feeds on fire, and its library offers a Frost page
  errors.push(...(await start(page, '?floor=3&spells=cinder_lance,pyre_seal&room=library_plain')));
  const lib = await page.evaluate(() => {
    const g = (window as unknown as { __game: GC }).__game;
    g.sim(1);
    const said = document.getElementById('toast')?.textContent ?? '';
    g.warp(1);
    g.sim(0.5);
    return { said, pages: g.pages.filter((p) => p.kind === 'lectern').map((p) => p.spell) };
  });
  expect(lib.said).toContain('heat');
  expect(lib.pages.some((id) => ['rime_shards', 'glacial_wall'].includes(id))).toBe(true);
  // a hex takes mana; a Hallow cast gives it back
  const back = await page.evaluate(() => {
    const g = (window as unknown as { __game: GC }).__game,
      P = g.player;
    P.invuln = 0;
    g.clearRoom();
    g.sim(0.3);
    g.learn('consecrate', 0);
    g.mana(60);
    g.shoot(P.x + 2, P.z, -1, 0, { hex: 8 });
    for (let k = 0; k < 40 && g.mana() > 55; k++) g.sim(0.05);
    const hexed = g.mana();
    g.cast(0);
    return { hexed, after: g.mana() };
  });
  expect(back.hexed).toBeLessThan(56); // (8 taken, a little mana back as time passes)
  expect(back.after).toBeCloseTo(back.hexed - 35 + 8, 0);
  expect(errors).toEqual([]);
});

test('weaves and chains: each one set up and struck goes off, its name rises and the book keeps it; the room joins in (a rune stone struck by a second school, a bell rung by a shock, a brazier taken by darkness)', async ({
  page,
}) => {
  type GW = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    clearRoom(): void;
    startGame(o: object): void;
    weave(id: string): void;
    weaves: string[];
    forgetWeaves(): void;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number };
    steam: number;
    enemies: { dead?: boolean; status?: Record<string, number> }[];
    prop(kind: string, x?: number, z?: number): unknown;
    props: { kind: string; x: number; z: number; school: string | null; lit: boolean }[];
    element(kind: string, x: number, z: number): void;
    sparkGround: number;
  };
  const errors = await start(page, '?room=great_hall&variant=quiet');
  const ids = [
    'steamCurtain',
    'conductor',
    'overloadSeal',
    'blackPyre',
    'eclipseGround',
    'hallowedHail',
    'lanternFan',
    'liveWade',
    'refraction',
    'tollChain',
    'thundercloud',
    'incense',
    'miasma',
    'blackMelt',
    'hailburst',
    'moltenGlass',
    'corona',
  ];
  const r = await page.evaluate((ids) => {
    const g = (window as unknown as { __game: GW }).__game,
      out: Record<string, number> = {};
    for (const id of ids) {
      g.startGame({ seed: 'WV1', testTemplate: 'great_hall', testVariant: 'quiet' });
      g.warp(1);
      g.sim(0.6);
      g.clearRoom();
      g.sim(0.3);
      g.player.maxHp = g.player.hp = 99;
      g.player.invuln = 99;
      g.forgetWeaves();
      g.weave(id);
      let t = 0;
      for (; t < 6 && !g.weaves.includes(id); t += 0.05) g.sim(0.05);
      out[id] = g.weaves.includes(id) ? t : -1;
      if (id === 'steamCurtain') out.curtainClouds = g.steam;
    }
    return out;
  }, ids);
  for (const id of ids) expect(r[id], id).toBeGreaterThanOrEqual(0);
  expect(r.curtainClouds).toBeGreaterThan(1); // (a cloud for each block of the wall)
  // the room joins in
  const room = await page.evaluate(() => {
    const g = (window as unknown as { __game: GW }).__game,
      P = g.player;
    g.startGame({ seed: 'WV2', testTemplate: 'great_hall', testVariant: 'quiet' });
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    P.maxHp = P.hp = 99;
    P.invuln = 99;
    const at = { x: P.x, z: P.z - 2.5 };
    g.prop('rune', at.x, at.z);
    g.element('burn', at.x, at.z);
    const charged = g.props.find((p) => p.kind === 'rune')!.school;
    g.element('chill', at.x, at.z);
    g.sim(0.05);
    const recharged = g.props.find((p) => p.kind === 'rune')!.school;
    g.prop('brazier', at.x + 2, at.z);
    g.element('burn', at.x + 2, at.z);
    g.sim(0.05);
    g.element('hex', at.x + 2, at.z);
    g.sim(0.05);
    const br = g.props.find((p) => p.kind === 'brazier')! as unknown as { lit: boolean; black: boolean };
    g.prop('bell', at.x - 2.5, at.z);
    const s0 = g.sparkGround;
    g.element('shock', at.x - 2.5, at.z);
    g.sim(0.05);
    return { charged, recharged, lit: br.lit, black: br.black, sparks: g.sparkGround - s0 };
  });
  expect(room).toMatchObject({ charged: 'burn', recharged: 'chill', lit: true, black: true });
  expect(room.sparks).toBeGreaterThanOrEqual(8);
  // once, not without end: a rune stone's reaction with a foe in its reach (the statuses it lays come back to the stone), and
  // fire on black ice lying over other ground (its melt's own fire is heard by the same fire)
  const once = await page.evaluate(() => {
    const g = (
        window as unknown as {
          __game: GW & {
            spawn(kind: string, x: number, z: number): { status?: Record<string, number> };
            layGround(kind: string, x: number, z: number): void;
            burn(x: number, z: number, r?: number): void;
            burningGround: number;
          };
        }
      ).__game,
      P = g.player;
    g.startGame({ seed: 'WV3', testTemplate: 'great_hall', testVariant: 'quiet' });
    g.warp(1);
    g.sim(0.6);
    g.clearRoom();
    g.sim(0.3);
    P.maxHp = P.hp = 99;
    P.invuln = 99;
    const at = { x: P.x, z: P.z - 2.5 };
    g.prop('rune', at.x, at.z);
    g.element('chill', at.x, at.z);
    const d = g.spawn('dummy', at.x + 0.8, at.z);
    g.sim(1);
    g.element('burn', at.x, at.z);
    g.sim(0.05);
    const school = g.props.find((p) => p.kind === 'rune')!.school,
      steamed = g.steam > 0;
    void d; // (frozen, then burnt: Steam rises from it)
    const b0 = g.burningGround,
      ice = { x: at.x - 3.5, z: at.z };
    g.layGround('blackice', ice.x, ice.z);
    g.layGround('blackice', ice.x + 0.4, ice.z);
    g.layGround('web', ice.x, ice.z + 0.4);
    g.burn(ice.x, ice.z, 1);
    g.sim(0.05);
    return { school, steamed, melted: g.burningGround - b0 };
  });
  expect(once).toMatchObject({ school: 'burn', steamed: true });
  expect(once.melted).toBeGreaterThanOrEqual(14); // (two melts of seven patches each)
  expect(errors).toEqual([]);
});
