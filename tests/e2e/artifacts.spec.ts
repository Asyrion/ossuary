import { expect, test } from '@playwright/test';
import { type Foe, type RoomView, type GameHooks, type W, start, type G5, type GS, type G14, type G7 } from './helpers';

test('an artifact is taken from its pedestal and changes the mage', { tag: '@fast' }, async ({ page }) => {
  const errors = await start(page, '?room=treasure_plain&seed=SMOKE2');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & {
      current: RoomView & { spots: { x: number; z: number; taken: boolean; def: { id: string; kind: string } }[] };
      player: { focus: string; items: string[]; x: number; z: number };
    };
    g.warp(1);
    const spot = g.current.spots[0],
      offered = spot.def;
    g.player.x = spot.x;
    g.player.z = spot.z + 0.5;
    g.sim(0.1); // walk into it
    const holds = offered.kind === 'focus' ? g.player.focus === offered.id : g.player.items.includes(offered.id);
    return {
      offered: offered.id,
      holds,
      icons: document.querySelectorAll('#items svg').length,
      banner: document.querySelector('#banner .t')!.textContent,
    };
  });
  console.log(`took ${result.offered}`);
  expect(result.holds).toBe(true);
  expect(result.icons).toBeGreaterThanOrEqual(1);
  expect(result.banner).not.toBe('');
  expect(errors).toEqual([]);
});

test('a bone altar takes a heart container for its artifact', async ({ page }) => {
  const errors = await start(page, '?room=altar_bones&seed=ARTF1');
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & {
      current: RoomView & {
        spots: {
          x: number;
          z: number;
          taken: boolean;
          def: { stats?: { hearts?: number }; curse?: { stats?: { hearts?: number } } };
        }[];
      };
      player: { maxHp: number; x: number; z: number };
    };
    g.warp(1);
    // what the artifact itself does to the hearts: the Leaden Heart gives two back, the Crown of Thorns' curse takes one
    const spot = g.current.spots[0],
      before = g.player.maxHp,
      gift = ((spot.def.stats?.hearts ?? 0) + (spot.def.curse?.stats?.hearts ?? 0)) * 2;
    g.player.x = spot.x;
    g.player.z = spot.z + 0.6;
    g.sim(0.1);
    return { before, after: g.player.maxHp - gift, taken: spot.taken };
  });
  expect(result).toMatchObject({ before: 6, after: 4, taken: true }); // a container paid
  expect(errors).toEqual([]);
});

test("Fen-Nex: the Rune of Fen-Nex binds it at the mage's heel; it bites foes, grows a stage a floor, and in its full shape breathes Ember", async ({
  page,
}) => {
  const errors = await start(page, '?seed=FENNEX&give=fennex_rune'); // (a run, not a test room: it goes down)
  type G2 = GameHooks & {
    fennex: { stage: number; x: number; z: number; hunting: boolean } | null;
    growFennex(): void;
    descend(): void;
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): Foe & { hp: number; maxHp: number; status?: { burn: number } };
  };
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2,
      out: Record<string, unknown> = {};
    g.clearRoom();
    g.sim(0.6);
    const near = () => Math.hypot(g.fennex!.x - g.player.x, g.fennex!.z - g.player.z);
    out.bound = g.fennex?.stage;
    out.heel = near() < 2;
    g.player.x += 2;
    g.sim(1.5);
    out.follows = near() < 2; // (it keeps at the mage's heel)
    const foe = g.spawn('rotling', g.player.x + 3, g.player.z);
    foe.hp = foe.maxHp = 999;
    g.sim(0.3);
    let hunted = false;
    for (let i = 0; i < 60; i++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
      hunted ||= g.fennex!.hunting;
    }
    out.hunted = hunted;
    out.bitten = foe.hp < 999;
    g.clearRoom();
    g.descend();
    g.sim(0.3);
    out.second = g.fennex?.stage; // (a floor deeper, it has grown)
    g.descend();
    g.sim(0.3);
    out.full = g.fennex?.stage;
    out.toast = document.getElementById('toast')?.textContent;
    // in its full shape it breathes Ember at a foe near it
    const f = g.fennex!,
      close = g.spawn('rotling', f.x + 1.6, f.z);
    close.hp = close.maxHp = 999;
    g.sim(0.3);
    let burned = false;
    for (let i = 0; i < 90 && !burned; i++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
      burned = (close.status?.burn ?? 0) > 0;
    }
    out.burned = burned;
    return out;
  });
  expect(result).toMatchObject({
    bound: 1,
    heel: true,
    follows: true,
    hunted: true,
    bitten: true,
    second: 2,
    full: 3,
    burned: true,
  });
  expect(result.toast).toMatch(/Fen-Nex/);
  expect(errors).toEqual([]);
});

test('Fen-Nex as its animated creatures: it stands, trots at the heel, gallops and bites, shakes as it grows, breathes, and is built in code when switched off', async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_b&seed=FEN1&give=fennex_rune');
  type Clip = { clip: string; time: number; rate: number; over: string[] };
  type G2 = GameHooks & {
    fennex: {
      stage: number;
      x: number;
      z: number;
      hunting: boolean;
      creature: string | null;
      clip: Clip | null;
    } | null;
    growFennex(): void;
    fennexCreature(on?: boolean): boolean;
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): Foe & { hp: number; maxHp: number };
  };
  const result = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2,
      out: Record<string, unknown> = {};
    g.warp(1);
    g.clearRoom();
    g.player.x = g.current.cx - 1.5;
    g.player.z = g.current.cz;
    /** Step `s` seconds a sixtieth at a time (the mage walking `vx` a second, unhurt), noting every clip it played. */
    const seen = new Set<string>();
    const run = (s: number, vx = 0) => {
      for (let k = 0; k < Math.round(s * 60); k++) {
        g.player.hp = g.player.maxHp;
        g.player.x += vx / 60;
        g.sim(1 / 60);
        const c = g.fennex?.clip;
        if (c) for (const n of [c.clip, ...c.over]) seen.add(`${g.fennex!.stage}:${n}`);
      }
    };
    run(1);
    out.creature1 = g.fennex?.creature;
    out.stands = g.fennex?.clip?.clip;
    run(1.2, 3); // (the mage walks east: it trots after)
    run(0.8);
    const foe = g.spawn('rotling', g.fennex!.x + 3.5, g.fennex!.z);
    foe.hp = foe.maxHp = 9999;
    run(2.5); // (it darts at the foe and bites it)
    out.bitten = foe.hp < 9999;
    g.clearRoom();
    run(0.6);
    g.growFennex();
    run(0.05);
    out.grown = g.fennex?.clip?.clip; // (it shakes itself as it grows)
    out.creature2 = g.fennex?.creature;
    run(1);
    g.growFennex();
    run(0.6);
    out.creature3 = g.fennex?.creature;
    const close = g.spawn('rotling', g.fennex!.x + 1.6, g.fennex!.z);
    close.hp = close.maxHp = 9999;
    run(4); // (its breath comes round)
    out.seen = [...seen].sort();
    g.fennexCreature(false); // (built in code at once)
    run(0.1);
    out.off = { creature: g.fennex?.creature, clip: g.fennex?.clip };
    g.fennexCreature(true);
    run(0.1);
    out.on = g.fennex?.creature;
    return out;
  });
  expect(result).toMatchObject({
    creature1: 'fennex',
    stands: 'idle',
    bitten: true,
    grown: 'shake',
    creature2: 'fennex',
    creature3: 'fennex_full',
    off: { creature: null, clip: null },
    on: 'fennex_full',
  });
  expect(result.seen).toEqual(
    expect.arrayContaining(['1:idle', '1:trot', '1:run', '1:bite', '2:shake', '3:shake', '3:breathe']),
  );
  expect(errors).toEqual([]);
});

test('Fen-Nex is built in code with the made assets off', async ({ page }) => {
  const errors = await start(page, '?room=crypt_b&seed=FEN1&give=fennex_rune&assets=off');
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GameHooks & {
      fennex: { stage: number; creature: string | null; clip: unknown } | null;
    };
    g.warp(1);
    g.sim(0.5);
    return { stage: g.fennex?.stage, creature: g.fennex?.creature, clip: g.fennex?.clip };
  });
  expect(r).toEqual({ stage: 1, creature: null, clip: null });
  expect(errors).toEqual([]);
});

test('new artifacts: the censer fans three bolts, the moth stings foes, and the skull circles the mage', async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_b&seed=ART01&give=mourners_censer,candle_moth,weeping_skull');
  const r = await page.evaluate(() => {
    type B = { secondary: boolean; vx: number; vz: number };
    const g = (window as unknown as W).__game as unknown as Omit<G5, 'bolts' | 'enemies'> & {
      bolts: B[];
      enemies: { hp: number; dead?: boolean }[];
    };
    g.warp(1);
    g.sim(0.8);
    g.player.x = g.current.cx;
    g.player.z = g.current.cz + 2;
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    g.sim(0.05);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    const cast = g.bolts.filter((b) => !b.secondary);
    const angles = cast.map((b) => Math.round(Math.atan2(b.vx, -b.vz) * 100) / 100);
    let stings = 0;
    const hp0 = g.enemies.reduce((a, e) => a + e.hp, 0);
    for (let t = 0; t < 5; t += 0.1) {
      g.player.invuln = 99;
      g.sim(0.1);
      stings = Math.max(stings, g.bolts.filter((b) => b.secondary).length);
    }
    return {
      cast: cast.length,
      fanned: new Set(angles).size,
      stings,
      hurt: hp0 > g.enemies.filter((e) => !e.dead).reduce((a, e) => a + e.hp, 0),
    };
  });
  expect(r).toEqual({ cast: 3, fanned: 3, stings: expect.any(Number), hurt: true });
  expect(r.stings).toBeGreaterThan(0); // the moth's lesser bolts
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-new-artifacts.png' });
  expect(errors).toEqual([]);
});

test("soul motes: they take hits before the hearts, a black one hexes the room, a hallowed one goes last and mends at a floor's end, a spell short of mana burns one, a hexed foe leaves one; the lodestone shard ends cooldowns", async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&seed=SOUL1&spells=arc');
  // a pale mote picked up shows beside the hearts, and takes the next hit
  const pale = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      P = g.player;
    g.warp(1);
    g.sim(0.3);
    P.x -= 3;
    g.drop('paleSoul', P.x, P.z);
    g.sim(0.8);
    const held = g.souls,
      shown = document.querySelectorAll('#hearts .ht.soul').length;
    P.invuln = 0;
    const hp = P.hp;
    g.shoot(P.x, P.z - 2.5, 0, 1);
    g.sim(1);
    return { held, shown, hurt: hp - P.hp, after: g.souls, left: document.querySelectorAll('#hearts .ht.soul').length };
  });
  expect(pale).toEqual({ held: ['pale'], shown: 1, hurt: 0, after: [], left: 0 });
  // a black and a hallowed one: the hit takes the black (the hallowed goes last though taken later), which hexes every foe
  const black = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      P = g.player;
    const a = g.spawn('rotling', P.x + 4, P.z - 2),
      b = g.spawn('rotling', P.x + 5, P.z + 2);
    g.sim(0.8);
    g.soul('black');
    g.soul('hallowed');
    P.invuln = 0;
    const hp = P.hp;
    g.shoot(P.x, P.z - 2.5, 0, 1);
    g.sim(1);
    const after = g.souls,
      hexed = [a.status?.hex ?? 0, b.status?.hex ?? 0];
    P.invuln = 0;
    g.shoot(P.x, P.z - 2.5, 0, 1);
    g.sim(1);
    return { after, hexed, hurt: hp - P.hp, last: g.souls };
  });
  expect(black).toEqual({ after: ['hallowed'], hexed: [2, 2], hurt: 0, last: [] });
  // hallowed motes held at a floor's end give back half a heart each
  const mend = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    P.hp = P.maxHp - 3;
    g.soul('hallowed');
    g.soul('hallowed');
    g.soul('pale');
    return { mended: g.hallowedMend(), short: P.maxHp - P.hp, kept: g.souls };
  });
  expect(mend).toEqual({ mended: 2, short: 1, kept: ['hallowed', 'hallowed', 'pale'] });
  // a spell short of mana burns a mote for the rest (the last taken that isn't hallowed); with none, it fails
  const burn = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS;
    g.spawn('dummy', g.player.x, g.player.z - 2);
    g.sim(0.8);
    g.mana(2);
    const cast = g.cast(0, { x: 0, z: -1 }),
      after = g.souls,
      toast = document.querySelector('#toast')!.textContent;
    g.sim(2);
    g.player.souls.length = 0;
    g.mana(2);
    const failed = !g.cast(0, { x: 0, z: -1 });
    return { cast, after, toast, failed };
  });
  expect(burn).toMatchObject({ cast: true, after: ['hallowed', 'hallowed'], failed: true });
  expect(burn.toast).toMatch(/soul mote/);
  // the lodestone shard ends the cooldown and gives mana; with nothing to give, it is left lying
  const shard = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    g.mana(999);
    g.spawn('dummy', P.x, P.z - 2);
    g.sim(0.8);
    g.cast(0, { x: 0, z: -1 });
    const cd = P.spellCd[0];
    g.mana(10);
    g.clearRoom();
    g.drop('shard', P.x, P.z);
    g.sim(0.8);
    const after = { cd: P.spellCd[0], mana: P.mana };
    g.mana(999);
    g.drop('shard', P.x, P.z);
    g.sim(0.8);
    return { cd, after, lying: g.pickups.filter((q) => q.kind === 'shard').length };
  });
  expect(shard.cd).toBeGreaterThan(0.5);
  expect(shard.after.cd).toBe(0);
  expect(shard.after.mana).toBeGreaterThanOrEqual(35);
  expect(shard.lying).toBe(1);
  // a foe that falls deep in a hex leaves a black mote now and then (about one in two; here every roll comes up, so the
  // test checks the mote, not the odds)
  const hexed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS & { dropsAlways(on: boolean): void },
      P = g.player;
    g.clearRoom();
    g.sim(0.3);
    g.dropsAlways(true);
    for (let i = 0; i < 8; i++) g.spawn('rotling', P.x - 3 + (i % 4) * 1.6, P.z - 2.5 + Math.floor(i / 4) * 1.2);
    g.sim(0.8);
    g.inflict({ hex: 4 });
    for (let i = g.enemies.length - 1; i >= 0; i--) g.hit(i, 999, undefined, 'spell');
    g.sim(1);
    g.dropsAlways(false);
    return g.pickups.filter((q) => q.kind === 'blackSoul').length;
  });
  expect(hexed).toBeGreaterThanOrEqual(1);
  expect(hexed).toBeLessThanOrEqual(8);
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-souls.png' });
  expect(errors).toEqual([]);
});

test("artifacts that bend bolts and fights: the pendulum swings, the lodestar hangs stars, the echo stone, the halo, the antler's lance, the candles, the blood moon, the salt circle, the choir, the lantern, the contract and the last rite", async ({
  page,
}) => {
  const errors = await start(page, '?room=treasure_plain&seed=ART41');
  const fire = `(g, key) => { g.player.fireCd = 0; g.keys.add(key); g.arrowOrder.push(key); g.sim(1 / 60); g.keys.delete(key); g.arrowOrder.length = 0; }`;
  // the Pendulum of Hours: bolts set out to one side, then the other, and curve back onto the aim line
  const swing = await page.evaluate<{ first: number; second: number; outward: number; most: number }>(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.warp(1); g.sim(.3); P.x -= 3; g.give('pendulum_of_hours');
    fire(g, 'ArrowUp'); const a = g.bolts[g.bolts.length - 1], a0 = { x: a.x, curve: a.curve, vx: a.vx };
    fire(g, 'ArrowUp'); const b = g.bolts[g.bolts.length - 1];
    let most = 0; for (let i = 0; i < 30 && g.bolts.includes(a); i++) { g.sim(1 / 30); most = Math.max(most, Math.abs(a.x - a0.x)); }
    return { first: Math.sign(a0.curve), second: Math.sign(b.curve), outward: Math.sign(a0.vx), most };
  })()`);
  expect(swing.first * swing.second).toBe(-1); // (left, then right)
  expect(swing.outward).toBe(-swing.first); // (out one way, turning back the other)
  expect(swing.most).toBeGreaterThan(0.4);
  // the Lodestar Wand: a bolt stops at its range's end and hangs there as a star, then goes out
  const star = await page.evaluate<{ became: boolean; t: number; hung: boolean; gone: boolean }>(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.sim(2); for (const b of [...g.bolts]) b.dist = 99; g.sim(.1); g.give('lodestar_wand');
    fire(g, 'ArrowRight'); const b = g.bolts[g.bolts.length - 1];
    let t = 0; for (; t < 3 && b.star === undefined; t += .05) g.sim(.05);
    const at = { x: b.x, z: b.z }; g.sim(1); const hung = g.bolts.includes(b) && Math.hypot(b.x - at.x, b.z - at.z) < .01;
    g.sim(1.5); return { became: b.star !== undefined, t, hung, gone: !g.bolts.includes(b) };
  })()`);
  expect(star).toMatchObject({ became: true, hung: true, gone: true });
  // the Echo Stone: a bolt at a wall comes back, once; the Gilded Halo: the first bolt on a foe sanctifies it
  const echo = await page.evaluate<{ back: boolean; sanct: number }>(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.give('apprentice_wand', 'echo_stone', 'gilded_halo'); g.sim(.2);
    const room = g.current; P.z = room.cz - 1.5; P.x = room.cx - 3;
    fire(g, 'ArrowUp'); const b = g.bolts[g.bolts.length - 1], vz = b.vz;
    for (let i = 0; i < 40 && !b.echoed; i++) g.sim(1 / 30);
    const back = b.echoed && Math.sign(b.vz) === -Math.sign(vz);
    const d = g.spawn('dummy', P.x + 2.5, P.z); g.sim(.8); fire(g, 'ArrowRight'); g.sim(.5);
    return { back, sanct: d.status?.sanct ?? 0 };
  })()`);
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
  const steady = await page.evaluate<{ still: number; mul: number; speed: number; color: number; cd: number }>(`(() => {
    const g = window.__game, P = g.player, fire = ${fire}; g.clearRoom(); g.sim(3); g.give('twin_vigil_candles', 'blood_moon_pendant');
    g.sim(.5); const still = P.still; fire(g, 'ArrowLeft'); const a = g.bolts[g.bolts.length - 1], base = P.stats.damage;
    P.hp = 2; g.sim(.3); fire(g, 'ArrowLeft'); const b = g.bolts[g.bolts.length - 1];
    return { still, mul: a.damage / base, speed: Math.hypot(b.vx, b.vz) / P.stats.shotSpeed, color: b.color, cd: P.fireCd };
  })()`);
  expect(steady.still).toBeGreaterThan(0.25);
  expect(steady.mul).toBeCloseTo(1.5);
  expect(steady.speed).toBeGreaterThan(1.25);
  expect(steady.color).toBe(0xe03040);
  expect(steady.cd).toBeLessThan(0.36 * 0.8);
  // the Salt Circle: standing still a moment, a ring forms that walking foes can't cross; stepping out breaks it
  const salt = await page.evaluate<{ formed: boolean; least: number; after: unknown }>(`(() => {
    const g = window.__game, P = g.player; P.hp = P.maxHp; g.clearRoom(); g.give('salt_circle'); g.sim(1.4);
    const ring = g.salt; const foe = g.spawn('rotling', P.x + 3, P.z); g.sim(.8); let least = 9;
    for (let i = 0; i < 60; i++) { g.sim(.05); least = Math.min(least, Math.hypot(foe.x - ring.x, foe.z - ring.z)); }
    g.clearRoom(); g.keys.add('KeyD'); g.sim(.6); g.keys.delete('KeyD'); g.sim(.3); // (walks out of it)
    return { formed: !!ring, least, after: g.salt };
  })()`);
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
  // the Gravemonger's Contract: the dead pay (about one in two; here every roll comes up), fights won leave no hearts
  const grave = await page.evaluate(`(() => {
    const g = window.__game, P = g.player; g.clearRoom(); g.sim(.3); g.give('gravemongers_contract');
    const coins = g.pickups.filter(q => q.kind === 'coin').length;
    for (let i = 0; i < 12; i++) g.spawn('rotling', P.x - 4 + (i % 6) * 1.4, P.z - 2.5 + Math.floor(i / 6) * 1.2);
    g.sim(.8); g.dropsAlways(true); for (let i = g.enemies.length - 1; i >= 0; i--) g.hit(i, 999); g.sim(.5); g.dropsAlways(false);
    return g.pickups.filter(q => q.kind === 'coin').length - coins;
  })()`);
  expect(grave).toBeGreaterThanOrEqual(3);
  // the Last Rite: a killing blow refused once a floor, the mage risen with half a heart; its price, a heart less
  const rite = await page.evaluate<{ lost: number; hp: number; state: string; used: boolean }>(`(() => {
    const g = window.__game, P = g.player; g.clearRoom(); g.sim(.3); const max = P.maxHp; g.give('the_last_rite');
    P.hp = 1; P.invuln = 0; g.shoot(P.x, P.z - .8, 0, 1); g.sim(1);
    return { lost: max - P.maxHp, hp: P.hp, state: g.state, used: g.run.riteFloor === g.run.floor };
  })()`);
  expect(rite).toEqual({ lost: 2, hp: 1, state: 'play', used: true });
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-artifacts-41.png' });
  expect(errors).toEqual([]);
});

test('artifacts on the bolts and the mage: burning and chilling bolts, homing bolts, the pendant, the thurible, the knot, the crown, the tome, the lantern, the candle', async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_a&seed=ART3&spells=arc');
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G14,
      P = g.player;
    const shoot = () => {
      g.keys.add('ArrowUp');
      g.arrowOrder.push('ArrowUp');
      g.sim(0.05);
      g.keys.delete('ArrowUp');
      g.arrowOrder.length = 0;
      g.sim(0.6);
    };
    const dummy = (x: number, z: number) => {
      const d = g.spawn('dummy', x, z);
      g.sim(0.8);
      return d;
    };
    g.warp(1);
    g.sim(0.3);
    // the Candle of the Vigil: a fight won refills mana
    g.give('candle_of_the_vigil');
    g.mana(0);
    g.clearRoom();
    const vigil = g.mana();
    // the Emberwood Wand: bolts set foes burning
    g.give('emberwood_wand');
    let d = dummy(P.x, P.z - 3);
    shoot();
    const ember = d.status?.burn ?? 0;
    g.clearRoom();
    g.sim(2.5);
    // the Tome of Whispers: a bolt cast straight ahead curves into a dummy off to the side
    g.give('tome_of_whispers');
    dummy(P.x + 1.6, P.z - 3.5);
    shoot();
    g.sim(0.6);
    const homing = g.enemies.find((e) => e.type === 'dummy')!.lastHit;
    g.clearRoom();
    g.sim(0.3);
    // the Frostbitten Ring: the fifth cast chills
    g.give('apprentice_wand', 'frostbitten_ring');
    d = dummy(P.x, P.z - 3);
    const chills: number[] = [];
    for (let i = 0; i < 5; i++) {
      shoot();
      chills.push(d.status?.chill ?? 0);
    }
    g.clearRoom();
    g.sim(3.5);
    // the Stormglass Pendant: a shocked foe takes more from the cantrip
    g.give('stormglass_pendant');
    const f = g.spawn('rotling', P.x, P.z - 2.5);
    g.sim(0.8);
    f.hp = 100;
    shoot();
    const plain = 100 - f.hp;
    f.hp = 100;
    g.inflict({ shock: 2 });
    shoot();
    const glass = 100 - f.hp;
    g.clearRoom();
    g.sim(0.3);
    // the Thurible of Ash: a foe dying in flames sets its neighbour burning
    g.give('thurible_of_ash');
    const a = g.spawn('rotling', P.x - 1, P.z - 3),
      b = g.spawn('rotling', P.x + 0.6, P.z - 3.2);
    g.sim(0.8);
    g.inflict({ burn: 3 });
    b.status!.burn = 0;
    a.hp = 1;
    b.hp = 100;
    g.sim(0.6);
    const spread = { died: !!(a as { dead?: boolean }).dead, burn: b.status?.burn ?? 0 };
    g.clearRoom();
    g.sim(0.3);
    // the Witch's Knot: spells cost less at half health or below
    g.give('witchs_knot');
    const cost = () => Number(document.querySelector('#slot0 small')!.textContent);
    P.hp = P.maxHp;
    g.sim(0.05);
    const full = cost();
    P.hp = P.maxHp / 2;
    g.sim(0.05);
    const low = cost();
    P.hp = P.maxHp;
    // the Crown of Thorns, the Hungering Tome and the Mana Lantern
    g.give('crown_of_thorns', 'hungering_tome', 'mana_lantern');
    const held = { maxMana: P.stats.maxMana, maxHp: P.maxHp };
    const t = g.spawn('rotling', P.x, P.z - 2.5);
    g.sim(0.8);
    t.hp = 100;
    g.mana(100);
    g.player.spellCd[0] = 0;
    g.cast(0, { x: 0, z: -1 });
    const crown = 100 - t.hp;
    g.mana(50);
    g.sim(1);
    const still = g.mana();
    t.hp = 1;
    shoot();
    const fed = g.mana() - still;
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

test('economy artifacts: the keyring opens a vault, the scale lowers prices, the purse weighs the hoard', async ({
  page,
}) => {
  const errors = await start(page, '?room=vault_urns&seed=ECON01&give=sextons_keyring');
  const vault = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7,
      P = g.player,
      d = g.current.doors.find((x) => x.seal)!;
    const keys = P.keys;
    P.x = d.x;
    P.z = d.z + 1.6;
    g.keys.add('KeyW');
    g.sim(0.6);
    g.keys.delete('KeyW');
    g.sim(0.2);
    return { keys, after: P.keys, sealed: d.seal!.sealed, free: g.run.freeVault === g.run.floor };
  });
  expect(vault).toEqual({ keys: 3, after: 3, sealed: false, free: true }); // three keys on taking it, and none spent

  await page.goto('/?room=merchant_plain&seed=SHOP01&give=pedlars_scale,misers_purse&loot=coins:30&autolevel=skip');
  await page.waitForFunction(() => !!(window as unknown as W).__game);
  await page.click('#btnStart');
  const shop = await page.evaluate(() => {
    const w = window as unknown as W;
    w.__manual = true;
    const g = w.__game as unknown as G7,
      P = g.player;
    g.warp(1);
    g.sim(0.5);
    const purse = { damage: P.stats.damage, gilt: P.stats.gilt };
    const art = g.current.wares!.find((x) => x.ware === 'artifact')!,
      tags = g.current.wares!.map((x) => [x.price, x.tagPrice]);
    const coins = P.coins;
    P.x = art.x;
    P.z = art.z + 1.6;
    g.keys.add('KeyW');
    g.sim(0.6);
    g.keys.delete('KeyW');
    g.sim(0.2);
    return { purse, tags, spent: coins - P.coins, after: { damage: P.stats.damage, gilt: P.stats.gilt } };
  });
  expect(shop.purse.damage).toBeCloseTo(3.5 + 1.5); // 30 obols: three tens, half a point each
  expect(shop.purse.gilt).toBeGreaterThan(0);
  for (const [price, tag] of shop.tags) expect(tag).toBe(Math.max(1, Math.round(price * 0.7)));
  expect(shop.spent).toBe(11); // 15 obols, less 30%
  expect(shop.after.damage).toBeCloseTo(3.5 + 0.5); // 19 obols left: one ten
  expect(errors).toEqual([]);
});

test('economy artifacts: chalk widens blasts, the band spares the mage, the ferryman pays, the lantern finds', async ({
  page,
}) => {
  const errors = await start(
    page,
    '?room=secret_cell&seed=ECON02&give=glyphwrights_chalk,warding_band,ferrymans_obol,grave_lantern',
  );
  const found = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7;
    g.sim(0.2);
    return {
      glyphs: g.player.glyphs,
      divined: g.current.doors.find((d) => d.secret)?.secret?.divined,
      toast: document.getElementById('toast')!.textContent,
    };
  });
  expect(found).toEqual({ glyphs: 6, divined: true, toast: expect.stringMatching(/Grave Lantern/) }); // one to start, five from the chalk
  await page.keyboard.press('Space');
  const blast = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G7,
      P = g.player;
    g.sim(0.05);
    const gl = { fuse: g.glyphs[0].fuseMax, radius: g.glyphs[0].radius },
      hp = P.hp;
    g.sim(1.2);
    return { ...gl, hurt: hp - P.hp, left: g.glyphs.length };
  });
  expect(blast).toEqual({ fuse: 1, radius: 2.25, hurt: 0, left: 0 });
  // the ferryman: the same fight won on the same seed, with his obol and without, leaves one obol more
  const obolsAfterFight = async (give: string) => {
    await page.goto(`/?room=crypt_a&seed=ECON03${give}&autolevel=skip`);
    await page.waitForFunction(() => !!(window as unknown as W).__game);
    await page.click('#btnStart');
    return page.evaluate(() => {
      const w = window as unknown as W;
      w.__manual = true;
      const g = w.__game as unknown as G7 & { clearRoom(): void };
      g.warp(1);
      g.sim(0.3);
      g.clearRoom();
      g.sim(0.3);
      return g.pickups.filter((q) => q.kind === 'coin').length;
    });
  };
  expect(await obolsAfterFight('&give=ferrymans_obol')).toBe((await obolsAfterFight('')) + 1);
  expect(errors).toEqual([]);
});
