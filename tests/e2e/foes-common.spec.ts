import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { type Foe, type RoomView, type GameHooks, type W, start, type G5 } from './helpers';

test('the bestiary (M4.5): thirty-five looks in rows by kind, each named with the fight it brings, apart from each other inside a great hall', async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&variant=quiet');
  type GB = GameHooks & {
    clearRoom(): void;
    bestiaryOptions(ids?: string[]): { id: string; x: number; z: number }[];
    takeModelOptions(): void;
    current: RoomView & { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } };
  };
  const shown = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GB;
    g.warp(1);
    g.sim(0.3);
    g.clearRoom();
    g.sim(0.3);
    const b = g.current.bounds;
    g.player.x = (b.minX + b.maxX) / 2;
    g.player.z = b.maxZ - 0.8;
    const all = g.bestiaryOptions();
    g.sim(0.5, true);
    const inside =
      all.every((o) => o.x > b.minX && o.x < b.maxX && o.z > b.minZ && o.z < b.maxZ) &&
      all.every((o, i) => all.every((q, j) => i === j || Math.hypot(o.x - q.x, o.z - q.z) >= 1.5)); // (and none on another)
    g.takeModelOptions();
    const some = g.bestiaryOptions(['cryptSpider', 'cinderDjinn']);
    g.sim(0.2, true);
    g.takeModelOptions();
    return { n: all.length, ids: new Set(all.map((o) => o.id)).size, inside, some: some.map((o) => o.id) };
  });
  expect(shown).toEqual({ n: 35, ids: 35, inside: true, some: ['cryptSpider', 'cinderDjinn'] });
  expect(errors).toEqual([]);
});

test("the drinking ward (M4.2): a vault's ward drinks the spells cast near it and bursts into a Wardling of what it drank most; a warded foe drinks spells, keeps statuses off, and breaks into a Wardling", async ({
  page,
}) => {
  type Wards = {
    vaults: { sealed: boolean; fill: number; top: string | null; guard: string | null }[];
    foes: { type: string; fill: number; top: string }[];
  };
  type F = Foe & {
    hp: number;
    maxHp: number;
    type: string;
    champion?: boolean;
    dead?: boolean;
    status?: Record<string, number>;
  };
  type GW = Omit<G5, 'enemies'> & {
    learn(id: string, slot: number): void;
    mana(n: number): void;
    cast(slot: number, dir?: { x: number; z: number }): boolean;
    wards: Wards;
    wardFoe(i: number): boolean;
    hit(i: number, dmg: number, school?: string, by?: string): void;
    inflict(s: Record<string, number>): void;
    spawn(kind: string, x: number, z: number): F;
    enemies: F[];
  };
  let errors = await start(page, '?room=vault_urns&seed=VAULT3');
  const vault = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GW,
      P = g.player,
      d = g.current.doors.find((x) => x.seal)!;
    P.x = d.x;
    P.z = d.z + 2.5;
    P.vx = P.vz = 0;
    P.invuln = 99;
    g.sim(0.2);
    g.mana(999);
    g.learn('rime_shards', 0);
    g.learn('cinder_lance', 1);
    g.cast(0, { x: 0, z: -1 });
    const first = { ...g.wards.vaults[0], bolts: g.bolts.length, toast: document.getElementById('toast')!.textContent };
    g.sim(1.6);
    g.cast(0, { x: 0, z: -1 });
    g.sim(1.6);
    g.cast(1, { x: 0, z: -1 });
    g.sim(2.1);
    const three = g.wards.vaults[0];
    g.cast(0, { x: 0, z: -1 });
    g.sim(0.3);
    const burst = { ...g.wards.vaults[0], open: d.open, toast: document.getElementById('toast')!.textContent };
    P.x = d.x;
    P.z = d.z + 0.8;
    g.keys.add('KeyW');
    g.sim(1.4);
    g.keys.delete('KeyW');
    g.sim(0.6);
    const guard = g.enemies.filter((e) => !e.dead);
    return {
      first,
      three,
      burst,
      inside: {
        type: g.current.type,
        locked: g.current.locked,
        guards: guard.map((e) => e.type),
        champion: guard.every((e) => e.champion),
        banner: document.querySelector('#banner .t')!.textContent,
      },
    };
  });
  expect(vault.first).toMatchObject({
    sealed: true,
    top: 'frost',
    bolts: 0,
    toast: expect.stringMatching(/drinks your spell/),
  });
  expect(vault.first.fill).toBeCloseTo(15 / 60, 5);
  expect(vault.three).toMatchObject({ sealed: true, top: 'frost' });
  expect(vault.three.fill).toBeCloseTo(50 / 60, 5);
  expect(vault.burst).toMatchObject({
    sealed: false,
    open: true,
    guard: 'wardFrost',
    toast: expect.stringMatching(/bursts, full of Frost/),
  });
  expect(vault.inside).toEqual({
    type: 'vault',
    locked: true,
    guards: ['wardFrost'],
    champion: true,
    banner: 'What the ward drank rises',
  });
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-wardling.png' });
  expect(errors).toEqual([]);

  errors = await start(page, '?room=crypt_a&seed=WARD1');
  const foe = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GW,
      P = g.player;
    g.warp(1);
    g.clearRoom();
    g.sim(0.3);
    P.invuln = 99;
    const e = g.spawn('rotling', P.x, P.z - 2.5);
    e.hp = e.maxHp = 200;
    g.sim(0.8);
    const i = g.enemies.indexOf(e);
    g.wardFoe(i);
    g.hit(i, 25, 'storm', 'spell');
    g.inflict({ hex: 1, burn: 2 });
    const held = { hp: e.hp, hex: e.status?.hex ?? 0, burn: e.status?.burn ?? 0, fill: g.wards.foes[0]?.fill };
    g.hit(i, 3, undefined, 'cantrip');
    const cantrip = 200 - e.hp;
    g.mana(999);
    g.learn('arc', 0);
    g.cast(0, { x: 0, z: -1 });
    g.sim(0.3);
    const arc = g.wards.foes[0]?.fill ?? 1;
    g.hit(i, 25, 'storm', 'spell');
    g.hit(i, 15, 'umbral', 'spell');
    g.sim(0.2);
    return {
      held,
      cantrip,
      arc,
      after: g.wards.foes.length,
      risen: g.enemies.filter((x) => !x.dead && x.type.startsWith('ward')).map((x) => x.type),
      hp: e.hp,
    };
  });
  expect(foe.held).toMatchObject({ hp: 200, hex: 0, burn: 0 });
  expect(foe.held.fill).toBeCloseTo(25 / 60, 5);
  expect(foe.cantrip).toBe(3);
  expect(foe.arc).toBeGreaterThan(25 / 60);
  expect(foe).toMatchObject({ after: 0, risen: ['wardStorm'], hp: 197 });
  expect(errors).toEqual([]);
});

test("a pack's size comes from the room's seed: a replayed seed brings the same swarms", async ({ page }) => {
  const sizes = async () => {
    const errors = await start(page, '?seed=K3F9QX&room=crypt_b&foe=fireflySwarm');
    const n = await page.evaluate(() => {
      const g = (window as unknown as W).__game;
      g.warp(1);
      g.sim(0.8);
      const packs: { members: unknown[] }[] = [];
      for (const e of g.enemies as unknown as { pack?: { members: unknown[] } }[])
        if (e.pack && !packs.includes(e.pack)) packs.push(e.pack);
      return packs.map((p) => p.members.length);
    });
    return { errors, n };
  };
  const a = await sizes(),
    b = await sizes();
  expect(a.n.length).toBeGreaterThan(1);
  expect(b.n).toEqual(a.n); // (each swarm as big as the first time, in the same order)
  expect([...a.errors, ...b.errors]).toEqual([]);
});

test('champion mantles (M4.7): each does its own, keeps its own school off, and the school that strips it unbinds it, stunned and open', async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&floor=2');
  const r = await page.evaluate(() => {
    type Ch = Foe & {
      mantle?: string;
      unbound?: number;
      hp: number;
      status?: { stun: number; burn: number; chill: number };
    };
    type G2 = GameHooks & {
      champion(kind: string, mantle?: string, x?: number, z?: number): Ch;
      spawn(kind: string, x?: number, z?: number): Ch;
      clearRoom(): void;
      inflict(s: Record<string, number>): void;
      hit(i: number, dmg: number, school?: string, by?: string): number;
      burningGround: number;
      sparkGround: number;
      mana(v?: number): number;
      shots: { chill?: number; hex?: number }[];
      player: GameHooks['player'] & { invuln: number; chill: number };
    };
    const g = (window as unknown as W).__game as G2,
      P = g.player,
      R: Record<string, Record<string, unknown>> = {};
    const fresh = (m: string, kind = 'sporeling') => {
      g.clearRoom();
      g.sim(0.2);
      const e = g.champion(kind, m, P.x, P.z - 2.5);
      g.sim(0.8);
      return e;
    };
    const stripped = (e: Ch) => ({
      mantle: e.mantle ?? null,
      stunned: (e.status?.stun ?? 0) > 0,
      open: (e.unbound ?? 0) > 0,
    });
    const keep = (s: number) => {
      for (let k = 0; k < s / 0.05; k++) {
        P.hp = P.maxHp;
        P.invuln = 9;
        g.sim(0.05);
      }
    };
    // Kindled: burning ground behind it, no burn on it; frost unbinds it, and an unbound champion takes a quarter more
    let e = fresh('kindled');
    keep(3);
    R.kindled = { trail: g.burningGround > 0 };
    g.inflict({ burn: 3 });
    R.kindled.burning = e.status?.burn ?? 0;
    g.inflict({ chill: 1 });
    Object.assign(R.kindled, stripped(e));
    const hp0 = e.hp;
    g.hit(g.enemies.indexOf(e), 8, undefined, 'cantrip');
    R.kindled.took = +(hp0 - e.hp).toFixed(2);
    // Rimebound: no chill on it; its touch chills the mage; its shots chill (a Hex Imp's carry its hex and the cold); fire unbinds it
    e = fresh('rimebound');
    g.inflict({ chill: 3 });
    R.rimebound = { chilled: e.status?.chill ?? 0 };
    P.invuln = 0;
    P.chill = 0;
    P.x = e.x;
    P.z = e.z;
    g.sim(0.05);
    R.rimebound.touch = P.chill > 0;
    P.x += 3;
    P.hp = P.maxHp;
    g.inflict({ burn: 2 });
    Object.assign(R.rimebound, stripped(e));
    const imp = fresh('rimebound', 'hexImp');
    let shot: { chill?: number; hex?: number } | undefined;
    for (let k = 0; k < 240 && !shot && imp.mantle; k++) {
      P.hp = P.maxHp;
      P.invuln = 9;
      g.sim(0.05);
      shot = g.shots[0];
    }
    R.rimebound.shot = { chill: (shot?.chill ?? 0) > 0, hex: (shot?.hex ?? 0) > 0 };
    // Stormcharged: struck, a spark under the mage; frost unbinds it
    e = fresh('stormcharged');
    g.hit(g.enemies.indexOf(e), 1, undefined, 'cantrip');
    R.stormcharged = { spark: g.sparkGround > 0 };
    g.inflict({ chill: 1 });
    Object.assign(R.stormcharged, stripped(e));
    // Hallowed: mends a hurt foe beside it; darkness unbinds it
    e = fresh('hallowed');
    const hurt = g.spawn('sporeling', e.x + 1.2, e.z);
    g.sim(0.8);
    g.hit(g.enemies.indexOf(hurt), 4, undefined, 'cantrip');
    const low = hurt.hp;
    keep(2.2);
    R.hallowed = { mended: hurt.hp > low };
    g.inflict({ hex: 1 });
    Object.assign(R.hallowed, stripped(e));
    // Hexbound: falling, its curse drains the mage's mana if it stays inside; holy light unbinds it, and then it doesn't
    e = fresh('hexbound');
    P.x = e.x + 1;
    P.z = e.z;
    g.mana(100);
    P.invuln = 9;
    g.hit(g.enemies.indexOf(e), 999, undefined, 'cantrip');
    g.sim(1);
    R.hexbound = { drained: Math.round(100 - g.mana()) };
    e = fresh('hexbound');
    g.inflict({ sanct: 2 });
    Object.assign(R.hexbound, stripped(e));
    P.x = e.x + 1;
    P.z = e.z;
    g.mana(100);
    P.invuln = 9;
    g.hit(g.enemies.indexOf(e), 999, undefined, 'cantrip');
    g.sim(1);
    R.hexbound.drainedAfter = Math.round(100 - g.mana());
    return R;
  });
  const unbound = { mantle: null, stunned: true, open: true };
  expect(r.kindled).toEqual({ trail: true, burning: 0, ...unbound, took: 10 });
  expect(r.rimebound).toEqual({ chilled: 0, touch: true, ...unbound, shot: { chill: true, hex: true } });
  expect(r.stormcharged).toEqual({ spark: true, ...unbound });
  expect(r.hallowed).toEqual({ mended: true, ...unbound });
  expect(r.hexbound.drained).toBeGreaterThan(8);
  expect(r.hexbound).toMatchObject({ ...unbound, drainedAfter: 0 });
  expect(errors).toEqual([]);
});

test("foes in each other's ground (M4.7): webs and ink hold a walker, rime trips it, fire and sparks burn it, spores sting it; its own kind's and its own school's spare it; a golem goes round", async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&floor=3');
  const r = await page.evaluate(() => {
    type F = Foe & { hp: number; maxHp: number; status?: { burn: number; shock: number }; vx: number; vz: number };
    type G2 = GameHooks & {
      spawn(kind: string, x?: number, z?: number): F;
      clearRoom(): void;
      inflict(s: Record<string, number>): void;
      layGround(kind: string, x: number, z: number, by?: string): void;
      foeGround(i: number): { pace: number; at?: string; slide: boolean };
      player: GameHooks['player'] & { invuln: number };
    };
    const g = (window as unknown as W).__game as G2,
      P = g.player,
      R: Record<string, unknown> = {};
    const keep = (s: number) => {
      for (let k = 0; k < s / 0.05; k++) {
        P.hp = P.maxHp;
        P.invuln = 9;
        g.sim(0.05);
      }
    };
    // (a Frost foe by default: at home on rime, not in webs, ink, fire, sparks or spores)
    const on = (ground: string, by: string, kind = 'rimeSnail') => {
      g.clearRoom();
      g.sim(0.2);
      const x = P.x,
        z = P.z - 4;
      const e = g.spawn(kind, x, z);
      g.sim(0.7);
      e.x = x;
      e.z = z;
      g.layGround(ground, x, z, by);
      g.sim(0.05);
      return e;
    };
    // webs and ink hold a walker of another kind, not its own
    let e = on('web', 'cryptSpider');
    R.web = g.foeGround(g.enemies.indexOf(e));
    e = on('ink', 'inkOctopus');
    R.ink = g.foeGround(g.enemies.indexOf(e));
    e = on('ink', 'inkOctopus', 'inkOctopus');
    R.ownInk = g.foeGround(g.enemies.indexOf(e));
    // fire burns it, sparks shock and hurt it, spores sting it
    e = on('fire', 'magmaOoze');
    keep(0.6);
    R.fire = (e.status?.burn ?? 0) > 0;
    e = on('fire', 'sporeling', 'sporeling');
    keep(0.6);
    R.ownFire = (e.status?.burn ?? 0) > 0;
    e = on('spark', 'thunderhead');
    g.inflict({ root: 3 });
    const hp0 = e.hp;
    keep(1.2);
    R.spark = e.hp < hp0; // (held on the spot until the spark arms)
    e = on('spores', 'puffcap');
    g.inflict({ root: 3 });
    const hp1 = e.hp;
    keep(0.7);
    R.spores = e.hp < hp1; // (stung again while it stays)
    // rime: a walker on another kind's rime slides; a Frost foe is at home on it
    e = on('rime', 'rimeSnail', 'runeBeetle');
    keep(0.3);
    R.rime = g.foeGround(g.enemies.indexOf(e))?.slide ?? 'gone';
    e = on('rime', 'frostJackalope');
    keep(0.3);
    R.homeRime = g.foeGround(g.enemies.indexOf(e))?.slide ?? 'gone';
    // a golem goes round a band of burning ground between it and the mage, never into it
    g.clearRoom();
    g.sim(0.2);
    const gx = P.x,
      gz = P.z - 7;
    for (let k = -3; k <= 3; k++) g.layGround('fire', gx + k * 0.5, P.z - 3.5, 'magmaOoze');
    const golem = g.spawn('rubbleGolem', gx, gz);
    const d0 = Math.hypot(golem.x - P.x, golem.z - P.z);
    let burnt = false;
    for (let k = 0; k < 160 && !golem.dead; k++) {
      P.hp = P.maxHp;
      P.invuln = 9;
      g.sim(0.05);
      const i = g.enemies.indexOf(golem);
      burnt ||= g.foeGround(i)?.at === 'fire';
    }
    R.golem = { burnt, closer: d0 - Math.hypot(golem.x - P.x, golem.z - P.z) > 1.5 };
    return R;
  });
  expect(r.web).toMatchObject({ pace: 0.45, at: 'web' });
  expect(r.ink).toMatchObject({ pace: 0.65, at: 'ink' });
  expect(r.ownInk).toMatchObject({ pace: 1 });
  expect(r).toMatchObject({
    fire: true,
    ownFire: false,
    spark: true,
    spores: true,
    rime: true,
    homeRime: false,
    golem: { burnt: false, closer: true },
  });
  expect(errors).toEqual([]);
});

test("counters found (M4.7): a hex grounds a griffin, its word rises, the bestiary keeps it, and the inventory's Foes tab opens its line", async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&floor=4');
  const r = await page.evaluate(() => {
    type G2 = GameHooks & {
      forgetBestiary(): void;
      spawn(kind: string, x?: number, z?: number): Foe & { state: string };
      inflict(s: Record<string, number>): void;
      bestiary: Record<string, { met: boolean; counters: string[] }>;
      player: GameHooks['player'] & { invuln: number };
    };
    const g = (window as unknown as W).__game as G2,
      P = g.player;
    g.forgetBestiary();
    const e = g.spawn('griffin', P.x, P.z - 4);
    for (let k = 0; k < 30; k++) {
      P.invuln = 9;
      g.sim(0.05);
    }
    const before = [...(g.bestiary.griffin.counters ?? [])];
    g.inflict({ hex: 1 });
    g.sim(0.1);
    return {
      before,
      after: g.bestiary.griffin.counters,
      state: e.state,
      toast: document.getElementById('toast')?.textContent ?? '',
    };
  });
  expect(r).toMatchObject({ before: [], after: ['grounded'], state: 'claw' });
  expect(r.toast).toContain('A hex grounds it');
  // the Foes tab: the griffin met, one counter of one found, its line open
  await page.keyboard.press('KeyI');
  await page.locator('#invTabs button', { hasText: 'Foes' }).click();
  const tile = page.locator('#invList .tile[title="Griffin"]');
  await expect(tile).toHaveCount(1);
  await expect(tile.locator('.n')).toHaveText('1/1');
  await tile.click();
  await expect(page.locator('#invDetail')).toContainText('Grounded! A hex grounds it.');
  await expect(page.locator('#invDetail .chip').first()).toContainText('Weak to ?'); // (its weakness not found yet)
  expect(errors).toEqual([]);
});

test('rooms with a pair (M4.7): some fights roll two foes made to work together, set side by side, and the first time in a run a line says what they do', async ({
  page,
}) => {
  const errors = await start(page, '?floor=3');
  const r = await page.evaluate(() => {
    type Rm = { plan: { id: number }; pair?: [string, string] };
    type G2 = Omit<GameHooks, 'rooms' | 'enemies'> & {
      startGame(o: object): void;
      rooms(): Rm[];
      enemies: (Foe & { foe?: { id: string } })[];
      player: GameHooks['player'] & { invuln: number };
    };
    const g = (window as unknown as W).__game as unknown as G2;
    for (let s = 0; s < 40; s++) {
      // (a floor 3 rolls a pair in about one fight in five: a few seeds find one)
      g.startGame({ seed: 'PAIR' + s, floor: 2 });
      const room = g.rooms().find((x) => x.pair);
      if (!room) continue;
      g.warp(room.plan.id);
      g.player.invuln = 99;
      g.sim(1.2);
      const [a, b] = room.pair!,
        A = g.enemies.find((e) => e.foe?.id === a),
        B = g.enemies.find((e) => e.foe?.id === b && e !== A);
      return {
        seed: s,
        pair: room.pair,
        near: !!A && !!B && Math.hypot(A.x - B.x, A.z - B.z) < 2.6,
        toast: document.getElementById('toast')?.textContent ?? '',
      };
    }
    return null;
  });
  expect(r).not.toBeNull();
  expect(r!.near).toBe(true);
  expect(r!.toast.length).toBeGreaterThan(10); // (its line)
  expect(errors).toEqual([]);
});

test("fantasy foes (M4.12): every look keeps the parts its foe's behaviour moves, and every foe in its look fights a while without an error", async ({
  page,
}) => {
  type GL = {
    sim(s: number, draw?: boolean): void;
    spawn(kind: string): void;
    clearRoom(): void;
    enemies: { type: string; foe?: { id: string } }[];
    player: { invuln: number };
    lookContract(): { id: string; missing: string[]; known: boolean }[];
  };
  const errors = await start(page, '?seed=LOOKS&room=great_hall');
  const contract = await page.evaluate(() => (window as unknown as { __game: GL }).__game.lookContract());
  expect(contract.length).toBeGreaterThanOrEqual(39);
  for (const c of contract) expect(c, c.id).toMatchObject({ known: true, missing: [] });
  // (a foe wears the fantasy look of its `look`, or of its own id: one foe for each look fights)
  const FOES = JSON.parse(readFileSync('data/foes.json', 'utf8')) as Record<string, { look?: string }>;
  const ids = contract.map((c) => {
    const id = Object.keys(FOES).find((f) => f !== '_comment' && (FOES[f].look ?? f) === c.id);
    expect(id, c.id).toBeDefined();
    return id!;
  });
  const fought = await page.evaluate((ids) => {
    const w = (window as unknown as { __game: GL }).__game,
      seen: string[] = [];
    w.player.invuln = 999;
    for (const id of ids) {
      w.clearRoom();
      w.sim(0.2);
      w.spawn(id);
      w.sim(3, true);
      if (w.enemies.some((e) => e.foe?.id === id)) seen.push(id);
    }
    return seen;
  }, ids);
  expect(fought).toEqual(ids);
  expect(errors).toEqual([]);
});

test('a creature made in Tripo and animated in code (docs/creatures.md): it stands, walks its lap, roars at the mage, its clips are baked in, and it wears its texture as pixel art', async ({
  page,
}) => {
  const errors = await start(page, '?seed=OWLB1&room=great_hall&variant=quiet');
  type C = {
    id: string;
    texture: number;
    state: string;
    clip: string;
    time: number;
    x: number;
    z: number;
  };
  type GC = GameHooks & {
    showCreature(id?: string, d?: number): Promise<C[]>;
    creatures: C[];
    roarNow(): void;
    takeCreatures(): void;
    renderInfo(): { calls: number };
    soundFiles(): Promise<Record<string, (number | null)[]>>;
  };
  const r = (await page.evaluate(async () => {
    const g = (window as unknown as { __game: GC }).__game,
      out: Record<string, unknown> = {};
    g.sim(0.3, true);
    const calls0 = g.renderInfo().calls;
    out.stood = await g.showCreature('owlbear', 1.6);
    g.sim(2.5, true);
    out.walking = g.creatures[0];
    g.sim(1, true);
    out.moved = Math.hypot(g.creatures[0].x - (out.stood as C[])[0].x, g.creatures[0].z - (out.stood as C[])[0].z);
    out.calls = g.renderInfo().calls - calls0;
    g.roarNow();
    g.sim(1, true);
    out.roaring = g.creatures[0];
    g.takeCreatures();
    g.sim(0.1, true);
    out.left = g.creatures.length;
    // the dragonling (a model Tripo set facing +x, turned by the tool): it stands, walks and strikes in the same routine
    out.dragon = await g.showCreature('dragonling', 1.6);
    g.sim(2.5, true);
    out.dragonWalk = g.creatures[0];
    g.roarNow();
    g.sim(1, true);
    out.dragonRoar = g.creatures[0];
    g.takeCreatures();
    // the Chameleon Wyvern (through the viewer, its own weights kept): the same routine, its roar the longest, and its
    // sounds from files, each decoded
    out.chameleon = await g.showCreature('chameleon', 1.6);
    g.sim(2.5, true);
    out.chameleonWalk = g.creatures[0];
    g.roarNow();
    g.sim(3, true);
    out.chameleonRoar = g.creatures[0];
    g.takeCreatures();
    out.files = await g.soundFiles();
    return out;
  })) as {
    stood: C[];
    walking: C;
    moved: number;
    calls: number;
    roaring: C;
    left: number;
    dragon: C[];
    dragonWalk: C;
    dragonRoar: C;
    chameleon: C[];
    chameleonWalk: C;
    chameleonRoar: C;
    files: Record<string, (number | null)[]>;
  };
  expect(r.stood).toHaveLength(1);
  expect(r.stood[0].clip).toBe('idle');
  expect(r.walking).toMatchObject({ state: 'walk', clip: 'walk' });
  expect(r.moved).toBeGreaterThan(0.2); // (it walks its lap at the pace its paws set)
  expect(r.calls).toBeLessThan(8); // (one skinned mesh and its shadow)
  expect(r.roaring).toMatchObject({ state: 'roar', clip: 'roar' });
  expect(r.roaring.time).toBeGreaterThan(0.5);
  // pixel art from its own texture (texturePixel.ts): the texture shrunk to the size the game draws it, sampled sharp
  expect(r.stood[0].texture).toBeGreaterThanOrEqual(64);
  expect(r.stood[0].texture).toBeLessThanOrEqual(512);
  expect(r.left).toBe(0);
  expect(r.dragon).toHaveLength(1);
  expect(r.dragon[0]).toMatchObject({ id: 'dragonling', clip: 'idle' });
  expect(r.dragonWalk).toMatchObject({ state: 'walk', clip: 'walk' });
  expect(r.dragonRoar).toMatchObject({ state: 'roar', clip: 'roar' });
  expect(r.chameleon).toHaveLength(1);
  expect(r.chameleon[0]).toMatchObject({ id: 'chameleon', clip: 'idle' });
  expect(r.chameleonWalk).toMatchObject({ state: 'walk', clip: 'walk' });
  expect(r.chameleonRoar).toMatchObject({ state: 'roar', clip: 'roar' });
  expect(r.chameleonRoar.time).toBeGreaterThan(2.5);
  // (each file's length as made, give or take the codec's padding)
  const lengths = { chameleonGrowl: [1.5], chameleonScreech: [1.3], clubSlam: [0.75, 0.75] } as Record<
    string,
    number[]
  >;
  expect(Object.keys(r.files)).toEqual(Object.keys(lengths));
  for (const [name, want] of Object.entries(lengths))
    want.forEach((s, i) => expect(Math.abs((r.files[name][i] ?? 0) - s), name).toBeLessThan(0.05));
  expect(errors).toEqual([]);
});
