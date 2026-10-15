import { expect, test } from '@playwright/test';
import { start } from './helpers';

test("foes in code: floor 2's toad leaps and breathes cold that chills; the lurker lives in water, rises, spits and dives out of reach, and is trapped when its pool freezes; the jelly drifts close and pulses light", async ({
  page,
}) => {
  type Foe = {
    type: string;
    state: string;
    x: number;
    z: number;
    hp: number;
    hidden?: boolean;
    model: { position: { y: number } };
  };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string): number;
    pool(what: string): void;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; chill: number };
    enemies: Foe[];
    shots: { chill?: number; x: number; z: number; vx: number; vz: number }[];
    current: { pools?: { kind: string; state: string }[] };
  };
  // the toad
  const errors = await start(page, '?seed=K3F9QX&floor=2&foe=mireToad');
  const toad = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.5);
    const seen = new Set<string>();
    let high = 0,
      cold = 0;
    for (let i = 0; i < 300 && !(seen.has('puff') && cold); i++) {
      const e = g.enemies[0];
      g.player.x = e.x + 2.2;
      g.player.z = e.z; // (close enough for it to breathe)
      g.sim(0.05);
      seen.add(e.state);
      high = Math.max(high, e.model.position.y);
      cold = Math.max(cold, g.shots.filter((s) => s.chill).length);
    }
    for (let i = 0; i < 300 && !g.player.chill; i++) {
      // (in the cone's way: on a cold shot's path, wherever the toad landed, clear of its touch;
      const e = g.enemies[0],
        s = g.shots.find((o) => o.chill); //  with none in flight, close enough for it to breathe again)
      if (s) {
        const v = Math.hypot(s.vx, s.vz) || 1,
          d = Math.max(1.3, Math.hypot(s.x - e.x, s.z - e.z) + 0.3);
        g.player.x = e.x + (s.vx / v) * d;
        g.player.z = e.z + (s.vz / v) * d;
      } else {
        g.player.x = e.x + 2.2;
        g.player.z = e.z;
      }
      g.player.invuln = 0;
      g.sim(0.05);
    }
    return { seen: [...seen].sort(), high, cold, chilled: g.player.chill > 0 };
  });
  expect(toad.seen).toEqual(expect.arrayContaining(['sit', 'crouch', 'leap', 'puff']));
  expect(toad.high).toBeGreaterThan(0.3);
  expect(toad.cold).toBeGreaterThanOrEqual(3);
  expect(toad.chilled).toBe(true);
  // the lurker
  const e2 = await start(page, '?seed=K3F9QX&floor=2&foe=cisternLurker');
  const lurker = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.3);
    const e = g.enemies[0],
      water = (g.current.pools ?? []).some((p) => p.kind === 'water'),
      startHidden = !!e.hidden;
    const hpUnder = e.hp;
    g.hit(0, 3);
    const tookUnder = hpUnder - e.hp;
    let upAt = -1;
    for (let i = 0; i < 100 && e.state !== 'up'; i++) {
      g.sim(0.05);
      if (e.state === 'up') upAt = i;
    }
    const hpUp = e.hp;
    g.hit(0, 3);
    const tookUp = hpUp - e.hp; // (storm-free: a plain hit)
    let dove = false;
    for (let i = 0; i < 100 && !dove; i++) {
      g.sim(0.05);
      dove = e.state === 'under' && !!e.hidden;
    }
    g.pool('frost');
    g.sim(0.1); // its water freezes over: up it comes, and there it stays
    const trapped = e.state,
      trappedHidden = !!e.hidden;
    return { water, startHidden, tookUnder, upAt, tookUp, dove, trapped, trappedHidden };
  });
  expect(lurker.water).toBe(true);
  expect(lurker.startHidden).toBe(true);
  expect(lurker.tookUnder).toBe(0);
  expect(lurker.upAt).toBeGreaterThanOrEqual(0);
  expect(lurker.tookUp).toBeCloseTo(3);
  expect(lurker.dove).toBe(true);
  expect(lurker.trapped).toBe('trapped');
  expect(lurker.trappedHidden).toBe(false);
  // the jelly
  const e3 = await start(page, '?seed=K3F9QX&floor=2&foe=lanternJelly');
  const jelly = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.3);
    const e = g.enemies[0],
      before = g.player.hp;
    let glowed = false;
    // (until it has glowed, a touch is mended: the jelly drifts into contact too, and its first pulse comes 2.5 to 3.5 s in)
    for (let i = 0; i < 160 && (!glowed || g.player.hp === before); i++) {
      if (!glowed) g.player.hp = before;
      g.player.x = e.x + 1;
      g.player.z = e.z;
      g.player.invuln = 0;
      g.sim(0.05);
      glowed ||= e.state === 'glow';
    }
    return { glowed, hurt: before - g.player.hp, flying: e.model.position.y };
  });
  expect(jelly.glowed).toBe(true);
  expect(jelly.hurt).toBeGreaterThan(0);
  expect([...errors, ...e2, ...e3]).toEqual([]);
});

test('the bestiary, floor 2: the snail leaves rime and hides in its shell (fire cracks it); the walking wave pours water, drinks frost and shatters; the newt lunges out of water and chills (a shock shows it); the serpent rises and is trapped by ice; the thunderhead rains sparks and drinks storm; the darter dashes (chilled, it hangs); the puffcap bursts (fire pops it)', async ({
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
    dead?: boolean;
  };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string): number;
    spawn(kind: string, x?: number, z?: number): Foe;
    inflict(s: Record<string, number>): void;
    clearRoom(): void;
    pool(what: string): void;
    ground: { rime: number };
    pools: unknown[];
    sparkGround: number;
    spores: number;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; chill: number; dim: number };
    enemies: Foe[];
    shots: unknown[];
  };
  const errors = await start(page, '?seed=K3F9QX&floor=2&room=great_hall&variant=quiet');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.5);
    /** One foe 3 tiles from the mage (a training dummy keeps the room's fight going), run for up to `secs` or until `until`. */
    const meet = (id: string, secs: number, until?: (e: Foe) => boolean, every?: (e: Foe) => void) => {
      g.clearRoom();
      g.sim(0.3);
      g.player.hp = 99;
      g.spawn('dummy', g.player.x - 5, g.player.z - 2.5);
      const e = g.spawn(id, g.player.x + 3, g.player.z);
      g.sim(0.7);
      const seen = new Set<string>();
      for (let i = 0; i < secs * 20 && !until?.(e); i++) {
        g.player.invuln = 0;
        g.sim(0.05);
        seen.add(e.state);
        every?.(e);
      }
      return { e, i: g.enemies.indexOf(e), seen };
    };
    const R: Record<string, unknown> = {};
    // the snail: a trail of rime; struck often, into its shell (a blow barely tells); fire cracks it
    {
      const { e, i, seen } = meet('rimeSnail', 2.5);
      R.snail = { seen: [...seen], rime: g.ground.rime };
      g.hit(i, 8);
      g.sim(0.1);
      const shut = e.state,
        hp = e.hp;
      g.hit(i, 4);
      const took = hp - e.hp;
      g.inflict({ burn: 2 });
      g.sim(0.1);
      Object.assign(R.snail as object, { shut, took, burnt: e.state });
    }
    // the walking wave (an elemental, met before the others' pools lie frozen): water behind it; frost feeds it, Ember hurts it twice over; chilled, it is ice, and a shock shatters it
    {
      const pools = g.pools.length;
      const { e, i, seen } = meet('puddleElemental', 5, (f) => f.state === 'rear');
      e.hp = e.maxHp / 2;
      let hp = e.hp;
      g.hit(i, 2, 'frost');
      const frost = e.hp - hp;
      hp = e.hp;
      g.hit(i, 2, 'ember');
      const ember = hp - e.hp;
      hp = e.hp;
      g.hit(i, 2);
      const plain = hp - e.hp;
      e.hp = e.maxHp;
      g.inflict({ chill: 2 });
      g.sim(0.2);
      const iced = e.state;
      hp = e.hp;
      g.inflict({ shock: 1 });
      g.sim(0.05);
      R.wave = {
        poured: g.pools.length - pools,
        reared: seen.has('rear'),
        frost,
        ember,
        plain,
        iced,
        shattered: (hp - e.hp) / e.maxHp,
        after: e.state,
      };
    }
    // the newt: hidden in water (its own pool, the hall's being far), out at the mage, a bite that chills; a shock shows it
    {
      let chill = 0;
      const { e, seen } = meet(
        'glassNewt',
        10,
        () => chill > 0,
        () => {
          chill = Math.max(chill, g.player.chill);
        },
      );
      const hidden = seen.has('swim');
      for (let k = 0; k < 160 && e.state !== 'swim'; k++) g.sim(0.05);
      const under = e.hidden;
      g.pool('shock');
      g.sim(0.1);
      R.newt = { hidden, chill, under, shocked: e.state, shown: !e.hidden };
    }
    // the serpent: it rises and spits; its pool frozen, it is trapped above the ice
    {
      let shots = 0;
      const { e, seen } = meet(
        'brineSerpent',
        6,
        (f) => f.state === 'up' && shots > 0,
        () => {
          shots = Math.max(shots, g.shots.length);
        },
      );
      // kept from the place it makes for (beyond the wall), it doesn't slide beneath for ever: it makes for the water nearest
      // itself, and rises there
      Object.assign(e, { state: 'under', st: 0, count: 0, target: { x: e.x + 40, z: e.z } });
      const lost = new Set<string>();
      for (let k = 0; k < 160 && !lost.has('rise'); k++) {
        g.sim(0.05);
        lost.add(e.state);
      }
      g.pool('frost');
      g.sim(1.5);
      R.serpent = { up: seen.has('up'), shots, lost: lost.has('rise'), trapped: e.state };
    }
    // the thunderhead (an elemental): over the mage it gathers and rains sparks; storm feeds it, frost hurts it twice over
    {
      let sparks = 0;
      const { e, i, seen } = meet(
        'thunderhead',
        8,
        () => sparks > 0,
        () => {
          sparks = Math.max(sparks, g.sparkGround);
        },
      );
      e.hp = e.maxHp / 2;
      let hp = e.hp;
      g.hit(i, 2, 'storm');
      const storm = e.hp - hp;
      hp = e.hp;
      g.hit(i, 2, 'frost');
      R.cloud = { gathered: seen.has('gather'), sparks, storm, frost: hp - e.hp };
    }
    // the darter: a dash leaves sparks; chilled, it hangs in the air
    {
      let sparks = 0;
      const { e } = meet(
        'stormDarter',
        6,
        () => sparks > 0,
        () => {
          sparks = Math.max(sparks, g.sparkGround);
        },
      );
      for (let k = 0; k < 40 && e.state !== 'hover'; k++) g.sim(0.05);
      g.inflict({ chill: 1 });
      const seen = new Set<string>();
      for (let k = 0; k < 30; k++) {
        g.sim(0.05);
        seen.add(e.state);
      }
      R.darter = { sparks, chilled: [...seen] };
    }
    // the puffcap: it shambles up, swells and bursts in stinging spores; burning, it pops where it stands and leaves none
    {
      let dim = 0;
      const { e, seen } = meet(
        'puffcap',
        6,
        (f) => !!f.dead,
        () => {
          dim = Math.max(dim, g.player.dim);
        },
      );
      for (let k = 0; k < 30; k++) {
        g.player.invuln = 0;
        g.sim(0.05);
        dim = Math.max(dim, g.player.dim);
      }
      const burst = { swelled: seen.has('swell'), gone: !!e.dead, spores: g.spores, dim };
      g.clearRoom();
      g.sim(4.5);
      g.spawn('dummy', g.player.x - 5, g.player.z - 2.5);
      const f = g.spawn('puffcap', g.player.x + 4, g.player.z);
      g.sim(0.7);
      g.inflict({ burn: 1 });
      g.sim(0.4); // (once the first cloud has gone)
      R.puff = { ...burst, popped: !!f.dead, popSpores: g.spores };
    }
    return R;
  });
  expect(r.snail).toMatchObject({ shut: 'shell', burnt: 'cracked' });
  expect((r.snail as { rime: number }).rime).toBeGreaterThan(0);
  expect((r.snail as { took: number }).took).toBeLessThan(1);
  expect(r.newt).toMatchObject({ hidden: true, under: true, shocked: 'stunned', shown: true });
  expect((r.newt as { chill: number }).chill).toBeGreaterThan(0);
  expect(r.serpent).toMatchObject({ up: true, lost: true, trapped: 'trapped' });
  expect((r.serpent as { shots: number }).shots).toBeGreaterThan(0);
  const w = r.wave as { poured: number; frost: number; ember: number; plain: number; shattered: number };
  expect(r.wave).toMatchObject({ reared: true, iced: 'ice', after: 'walk' });
  expect(w.poured).toBeGreaterThan(0);
  expect(w.frost).toBeGreaterThan(0);
  expect(w.ember).toBeCloseTo(w.plain * 2);
  expect(w.shattered).toBeGreaterThan(0.5);
  const c = r.cloud as { sparks: number; storm: number; frost: number };
  expect(r.cloud).toMatchObject({ gathered: true });
  expect(c.sparks).toBeGreaterThan(0);
  expect(c.storm).toBeGreaterThan(0);
  expect(c.frost).toBeCloseTo(4);
  expect((r.darter as { sparks: number }).sparks).toBeGreaterThan(0);
  expect(r.darter).toMatchObject({ chilled: ['hover'] });
  expect(r.puff).toMatchObject({ swelled: true, gone: true, spores: 1, popped: true, popSpores: 0 });
  expect((r.puff as { dim: number }).dim).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
