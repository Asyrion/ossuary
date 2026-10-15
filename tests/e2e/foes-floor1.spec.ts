import { expect, test } from '@playwright/test';
import { start } from './helpers';

test('foes in code: the Sporeling fills the fights, hops, swells and puffs spores that sting and dim the sight, takes half again from Ember and half from Frost, and the bestiary keeps what was found', async ({
  page,
}) => {
  type Foe = { type: string; state: string; tele?: number; hp: number; mats: unknown[]; contact: number };
  type GS = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    renderInfo(): { calls: number };
    forgetBestiary(): void;
    hit(i: number, dmg: number, school?: string): number;
    bestiary: Record<string, { met: boolean; weak: boolean; resist: boolean }>;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; dim: number };
    enemies: Foe[];
    current: { spores?: { x: number; z: number; sting?: number }[] };
  };
  const errors = await start(page, '?seed=K3F9QX&foe=sporeling');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS }).__game;
    g.forgetBestiary();
    g.player.maxHp = g.player.hp = 60; // (the test stands among them)
    g.warp(1);
    g.sim(0.8, true);
    const kinds = [...new Set(g.enemies.map((e) => e.type))],
      calls = g.renderInfo().calls,
      n = g.enemies.length;
    let swelled = false,
      puffed = false;
    for (let i = 0; i < 100 && !puffed; i++) {
      g.sim(0.1);
      swelled ||= g.enemies.some((e) => e.state === 'swell' && (e.tele ?? 0) > 0);
      puffed = (g.current.spores ?? []).some((s) => s.sting);
    }
    const cloud = (g.current.spores ?? []).find((s) => s.sting)!;
    // (a sting lands only on a mage not reeling from another blow: the Sporeling that puffed it stands in its cloud, and
    // its touch would come first, so the foes touch no one while the mage steps in)
    for (const f of g.enemies) f.contact = 0;
    g.player.x = cloud.x;
    g.player.z = cloud.z;
    g.player.invuln = 0;
    g.sim(0.1);
    const dim = g.player.dim,
      e = g.enemies[0];
    const before = e.hp;
    g.hit(0, 2, 'ember');
    const weak = before - e.hp;
    const mid = e.hp;
    g.hit(0, 2, 'frost');
    const resist = mid - e.hp;
    const last = e.hp;
    g.hit(0, 2);
    const plain = last - e.hp;
    return {
      kinds,
      calls,
      n,
      swelled,
      puffed,
      dim,
      weak,
      resist,
      plain,
      book: g.bestiary.sporeling,
      mats: e.mats.length,
    };
  });
  expect(r.kinds).toEqual(['sporeling']);
  expect(r.n).toBeGreaterThan(0);
  expect(r.calls).toBeLessThan(90 + r.n * 20); // (each foe's still parts merged: about a dozen calls, not fifty)
  expect(r.swelled).toBe(true);
  expect(r.puffed).toBe(true);
  expect(r.dim).toBeGreaterThan(1);
  expect(r.weak).toBeCloseTo(3);
  expect(r.resist).toBeCloseTo(1);
  expect(r.plain).toBeCloseTo(2);
  expect(r.book).toMatchObject({ met: true, weak: true, resist: true }); // (and the counters found)
  expect(r.mats).toBeGreaterThan(0); // (its merged surfaces flash when hit)
  await page.screenshot({ path: 'test-results/foes-sporeling.png' });
  expect(errors).toEqual([]);
});

test("foes in code: floor 1's moth loops, scatters light and is lured by a lit brazier; the beetle charges, is stunned against a wall and throws a spark; the mimic waits among the urns, wakes, spits embers and shuts", async ({
  page,
}) => {
  type Foe = {
    type: string;
    state: string;
    x: number;
    z: number;
    hp: number;
    contact: number;
    guard?: number;
    fireT?: number;
    status?: { burn?: number };
  };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string): number;
    prop(kind: string, x?: number, z?: number): boolean;
    props: { kind: string; x: number; z: number; lit: boolean }[];
    element(kind: string, x: number, z: number): void;
    player: { x: number; z: number; hp: number; maxHp: number };
    enemies: Foe[];
    shots: { fire?: boolean }[];
    current: { cx: number; cz: number; rocks: { x: number; z: number; urn?: string }[] };
  };
  // the moth
  const errors = await start(page, '?seed=K3F9QX&foe=vesperMoth');
  const moth = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.8);
    g.player.x = g.current.cx;
    g.player.z = g.current.cz; // (in the room's middle: moths circling the mage by a wall lose motes to it as they scatter)
    // (motes counted as they're pushed, not as they stand after the step: a mote made against a rock or the mage can be
    // gone within the step that made it, and older ones dying in the same step can't hide new ones)
    let flares = 0,
      motes = 0,
      made = 0;
    const shots = g.shots as unknown as { push(...a: unknown[]): number },
      push = shots.push.bind(shots);
    shots.push = (...a: unknown[]) => {
      made += a.length;
      return push(...a);
    };
    for (let i = 0; i < 90; i++) {
      made = 0;
      g.sim(0.1);
      flares += g.enemies.filter((e) => e.state === 'flare').length ? 1 : 0;
      motes = Math.max(motes, made);
    }
    delete (shots as { push?: unknown }).push;
    // a lit brazier in the middle: the moths come to it
    const c = g.current;
    g.prop('brazier', c.cx, c.cz);
    const b = g.props.find((p) => p.kind === 'brazier')!;
    g.element('burn', b.x, b.z);
    let near = 0,
      burned = false;
    for (let i = 0; i < 300 && !(near && burned); i++) {
      g.sim(0.1);
      near = Math.max(near, g.enemies.filter((e) => Math.hypot(e.x - b.x, e.z - b.z) < 1.6).length);
      burned ||= g.enemies.some((e) => (e.status?.burn ?? 0) > 0);
    } // (the lure and the singeing are chance: time enough for both)
    return { flares, motes, lit: g.props.find((p) => p.kind === 'brazier')!.lit, near, burned };
  });
  expect(moth.flares).toBeGreaterThan(0);
  expect(moth.motes).toBeGreaterThanOrEqual(6);
  expect(moth.lit).toBe(true);
  expect(moth.near).toBeGreaterThan(0);
  expect(moth.burned).toBe(true);
  // the beetle
  const e2 = await start(page, '?seed=K3F9QX&foe=runeBeetle');
  const beetle = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.5);
    const seen = new Set<string>();
    let sparks = 0;
    for (let i = 0; i < 200 && !(seen.has('stun') && sparks); i++) {
      g.sim(0.05);
      g.enemies.forEach((e) => seen.add(e.state));
      if (g.enemies.some((e) => e.state === 'stun' && e.fireT === 1)) sparks++;
    } // (thrown once a stun)
    return { seen: [...seen].sort(), sparks };
  });
  expect(beetle.seen).toEqual(expect.arrayContaining(['wander', 'tell', 'charge', 'stun']));
  expect(beetle.sparks).toBeGreaterThan(0);
  // the mimic
  const e3 = await start(page, '?seed=K3F9QX&room=crypt_b&foe=urnMimic');
  const mimic = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.5);
    const urns = g.current.rocks.filter((r) => r.urn);
    const hidden = g.enemies.every((e) => e.state === 'hidden' && e.contact === 0);
    const byUrns = g.enemies.every((e) => urns.some((u) => Math.hypot(u.x - e.x, u.z - e.z) < 1.6));
    const m = g.enemies[0];
    g.player.x = m.x + 1.2;
    g.player.z = m.z;
    g.sim(0.1);
    const woke = m.state,
      states = new Set<string>();
    let embers = 0;
    for (let i = 0; i < 80 && !states.has('shut'); i++) {
      g.sim(0.05);
      states.add(m.state);
      embers = Math.max(embers, g.shots.filter((s) => s.fire).length);
    }
    const guard = m.guard,
      before = m.hp;
    g.hit(0, 2);
    const took = before - m.hp;
    return {
      hidden,
      byUrns,
      woke,
      states: [...states].sort(),
      embers,
      guard,
      took,
      others: g.enemies.slice(1).some((e) => e.state === 'hidden'),
    };
  });
  expect(mimic.hidden).toBe(true);
  expect(mimic.byUrns).toBe(true);
  expect(mimic.woke).toBe('peek');
  expect(mimic.states).toEqual(expect.arrayContaining(['peek', 'hop', 'shut']));
  expect(mimic.embers).toBeGreaterThanOrEqual(3); // (a fan of embers, each lighting what it passes)
  expect(mimic.guard).toBe(0.5);
  expect(mimic.took).toBeCloseTo(1); // (shut, its clay turns half a blow)
  expect(mimic.others).toBe(true); // (those the mage didn't come near wait on)
  expect([...errors, ...e2, ...e3]).toEqual([]);
});

test('the bestiary, floor 1: the spider drops from out of reach and spits webs that slow (fire burns them); the octopus splits, or cracks when chilled; the grimoire lies shut; the swarm comes whole; the lark hastens; the mantis parries from the front; the crab hides and is flipped', async ({
  page,
}) => {
  type Foe = {
    type: string;
    state: string;
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    hidden?: boolean;
    scale: number;
    sung?: number;
    count?: number;
    face: number;
    pack?: { members: unknown[] };
  };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string, by?: string, dx?: number, dz?: number): number;
    spawn(kind: string, x?: number, z?: number): Foe;
    inflict(s: Record<string, number>): void;
    burn(x: number, z: number, r?: number): void;
    blast(x: number, z: number): void;
    ground: { web: number; ink: number };
    clock: number;
    clearRoom(): void;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number };
    enemies: Foe[];
    shots: unknown[];
  };
  // the spider: out of reach while it hangs, then down, webbing the floor; fire burns the webs
  const e1 = await start(page, '?seed=K3F9QX&floor=1&foe=cryptSpider');
  const spider = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.3);
    const e = g.enemies[0],
      hp0 = e.hp,
      hangHit = e.state === 'hang' ? hp0 - g.hit(0, 5) : -1;
    const seen = new Set<string>();
    let webs = 0;
    for (let i = 0; i < 260 && webs < 1; i++) {
      g.player.invuln = 0;
      g.sim(0.05);
      g.enemies.forEach((f) => seen.add(f.state));
      webs = g.ground.web;
    }
    g.clearRoom();
    g.sim(1.2);
    g.burn(g.player.x, g.player.z, 6);
    g.sim(0.1); // (the fight over and every gob landed, fire burns the webs)
    return { hangHit, seen: [...seen].sort(), webs, burnt: g.ground.web };
  });
  expect(spider.hangHit).toBe(0);
  expect(spider.seen).toEqual(expect.arrayContaining(['drop', 'ground', 'spit']));
  expect(spider.webs).toBeGreaterThan(0);
  expect(spider.burnt).toBe(0);
  // the octopus: struck to half it splits in two smaller ones; chilled, it cracks instead
  const e2 = await start(page, '?seed=K3F9QX&floor=1&foe=inkOctopus');
  const octo = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.warp(1);
    g.sim(0.8);
    g.clearRoom();
    g.sim(0.2);
    const a = g.spawn('inkOctopus', g.player.x + 3, g.player.z);
    g.sim(0.8);
    const i = g.enemies.indexOf(a);
    g.hit(i, a.maxHp * 0.6);
    g.sim(0.4);
    const split = g.enemies.filter((f) => f.type === 'inkOctopus').length,
      small = a.scale;
    g.sim(1);
    const ink = g.ground.ink;
    g.clearRoom();
    g.sim(0.2);
    const b = g.spawn('inkOctopus', g.player.x + 3, g.player.z);
    g.sim(0.8);
    g.inflict({ chill: 2 });
    g.hit(g.enemies.indexOf(b), b.maxHp * 0.6);
    g.sim(0.2);
    return { split, small, ink, chilled: g.enemies.filter((f) => f.type === 'inkOctopus').length };
  });
  expect(octo.split).toBe(2);
  expect(octo.small).toBeLessThan(1);
  expect(octo.ink).toBeGreaterThan(0);
  expect(octo.chilled).toBe(1);
  // the grimoire lies shut, turning half a blow; near it, it wakes and flies; the swarm comes whole, one blow each
  const e3 = await start(page, '?seed=K3F9QX&floor=1');
  const more = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.8);
    g.clearRoom();
    g.sim(0.2);
    const book = g.spawn('grimoireMimic', g.player.x + 4, g.player.z);
    g.sim(0.3);
    const shut = book.state,
      i = g.enemies.indexOf(book);
    const hp0 = book.hp;
    g.hit(i, 4);
    const took = hp0 - book.hp;
    g.player.x = book.x - 1;
    let woke = '';
    for (let k = 0; k < 40 && !woke; k++) {
      g.sim(0.05);
      if (book.state === 'fly') woke = book.state;
    }
    g.clearRoom();
    g.sim(0.2);
    const first = g.spawn('fireflySwarm', g.player.x + 3, g.player.z);
    g.sim(0.8);
    const n = g.enemies.filter((f) => f.type === 'fireflySwarm').length;
    g.hit(g.enemies.indexOf(first), 2);
    g.sim(0.1);
    const after = g.enemies.filter((f) => f.type === 'fireflySwarm').length;
    return { shut, took, woke, n, pack: first.pack?.members.length, after };
  });
  expect(more).toMatchObject({ shut: 'shut', took: 2, woke: 'fly' });
  expect(more.n).toBeGreaterThanOrEqual(5);
  expect(more.pack).toBe(more.n);
  expect(more.after).toBe(more.n - 1);
  // the lark sings to the foes round it (not while hexed); the mantis parries a bolt at its front, not one from behind
  // nor while chilled; the crab hides as rubble, then a blast flips it
  const e4 = await start(page, '?seed=K3F9QX&floor=1');
  const last = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.8);
    g.clearRoom();
    g.sim(0.2);
    const lark = g.spawn('choirLark', g.player.x + 4, g.player.z - 1);
    const rot = g.spawn('rotling', g.player.x + 4, g.player.z + 1);
    Object.assign(lark, { state: 'perch', st: 5, fireT: 0.1, vx: 0, vz: 0 }); // (perched where it was spawned: the perch it flies to is the room's to pick, and the song is what this checks)
    let sung = false;
    for (let k = 0; k < 200 && !sung; k++) {
      g.player.invuln = 0;
      g.sim(0.05);
      rot.x = lark.x + 0.8;
      rot.z = lark.z;
      sung = (rot.sung ?? 0) > g.clock;
    }
    g.inflict({ hex: 3 });
    rot.sung = 0;
    let hushed = true;
    for (let k = 0; k < 40; k++) {
      g.sim(0.05);
      rot.x = lark.x + 0.8;
      rot.z = lark.z;
      if ((rot.sung ?? 0) > g.clock && lark.state === 'perch') hushed = false;
    }
    g.clearRoom();
    g.sim(0.2);
    const m = g.spawn('stormMantis', g.player.x + 2.5, g.player.z);
    g.sim(0.9);
    const i = g.enemies.indexOf(m);
    m.state = 'stalk';
    const fx = Math.sin(m.face),
      fz = Math.cos(m.face),
      hp0 = m.hp;
    g.hit(i, 3, undefined, 'cantrip', -fx, -fz);
    const front = hp0 - m.hp;
    g.hit(i, 3, undefined, 'cantrip', fx, fz);
    const back = hp0 - m.hp;
    g.inflict({ chill: 2 });
    m.state = 'stalk';
    g.hit(i, 3, undefined, 'cantrip', -Math.sin(m.face), -Math.cos(m.face));
    const chilled = hp0 - m.hp - back;
    g.clearRoom();
    g.sim(0.2);
    const crab = g.spawn('rubbleCrab', g.player.x + 4, g.player.z);
    g.sim(0.8);
    const hidden = crab.state,
      chp = crab.hp;
    g.hit(g.enemies.indexOf(crab), 10);
    const hidTook = chp - crab.hp;
    g.sim(0.6);
    g.blast(crab.x, crab.z);
    g.sim(0.05);
    const flipped = crab.state;
    g.clearRoom();
    g.sim(0.2);
    const lone = g.spawn('rubbleCrab', g.player.x + 6, g.player.z);
    g.sim(1.5);
    const waits = lone.state;
    g.sim(4); // (far from the mage, the last in the room: it doesn't wait for ever)
    return { sung, hushed, front, back, chilled, parries: m.count, hidden, hidTook, flipped, waits, alone: lone.state };
  });
  expect(last).toMatchObject({
    sung: true,
    hushed: true,
    front: 0,
    back: 3,
    chilled: 3,
    parries: 1,
    hidden: 'hidden',
    flipped: 'flipped',
    waits: 'hidden',
  });
  expect(last.alone).not.toBe('hidden');
  expect(last.hidTook).toBeCloseTo(3);
  for (const e of [e1, e2, e3, e4]) expect(e).toEqual([]);
});
