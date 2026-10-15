import { expect, test } from '@playwright/test';
import { start } from './helpers';

test("foes in code: floor 5's rootling burrows and bursts up (fire keeps it up); the storm ray lays sparks; the void mote swallows bolts and spills them; the tortoise hides, spins and lies dizzy", async ({
  page,
}) => {
  type Foe = { type: string; state: string; x: number; z: number; hp: number; hidden?: boolean };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string, by?: string): number;
    inflict(s: Record<string, number>): void;
    sparkGround: number;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number };
    enemies: Foe[];
    shots: { chill?: number }[];
  };
  // the rootling
  const e1 = await start(page, '?seed=K3F9QX&floor=5&foe=rootling');
  const root = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.8);
    const seen = new Set<string>();
    let hid = false;
    for (let i = 0; i < 160; i++) {
      g.player.invuln = 0;
      g.sim(0.05);
      g.enemies.forEach((e) => {
        seen.add(e.state);
        hid ||= !!e.hidden && e.state === 'under';
      });
    }
    // burning, they stay above ground
    for (let i = 0; i < 30 && g.enemies.some((e) => e.hidden); i++) g.sim(0.1);
    g.inflict({ burn: 6 });
    g.sim(1.5);
    g.inflict({ burn: 6 });
    const dug = false; // (set alight, one caught digging or under climbs out first; then it stays up) for (let i = 0; i < 60; i++) { g.sim(.05); dug ||= g.enemies.some(e => e.state === 'under' || e.state === 'dig'); }
    return { seen: [...seen].sort(), hid, dug };
  });
  expect(root.seen).toEqual(expect.arrayContaining(['dig', 'rumble', 'under', 'up']));
  expect(root.hid).toBe(true);
  expect(root.dug).toBe(false);
  // the storm ray
  const e2 = await start(page, '?seed=K3F9QX&floor=5&foe=stormRay');
  const ray = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.8);
    let passed = false,
      sparks = 0;
    for (let i = 0; i < 120 && !(passed && sparks); i++) {
      g.sim(0.05);
      passed ||= g.enemies.some((e) => e.state === 'pass');
      sparks = Math.max(sparks, g.sparkGround);
    }
    return { passed, sparks };
  });
  expect(ray.passed).toBe(true);
  expect(ray.sparks).toBeGreaterThan(2);
  // the void mote: the cantrip's bolts are swallowed, five spill back, then it is open to them
  const e3 = await start(page, '?seed=K3F9QX&floor=5&foe=voidMote');
  const mote = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.8);
    const e = g.enemies[0],
      hp0 = e.hp;
    for (let i = 0; i < 5; i++) g.hit(0, 3, undefined, 'cantrip');
    const swallowed = hp0 - e.hp,
      shots0 = g.shots.length;
    let spilt = 0;
    for (let i = 0; i < 30 && e.state !== 'spent'; i++) {
      g.sim(0.05);
      spilt = Math.max(spilt, g.shots.length - shots0);
    }
    const hp1 = e.hp;
    g.hit(0, 2, undefined, 'cantrip');
    const open = hp1 - e.hp;
    const hp2 = e.hp;
    g.sim(3.2);
    g.hit(0, 2);
    const spell = hp2 - e.hp; // (spells hurt it as ever)
    return { swallowed, spilt, state: e.state, open, spell };
  });
  expect(mote.swallowed).toBe(0);
  expect(mote.spilt).toBeGreaterThanOrEqual(8);
  expect(mote.open).toBeCloseTo(3);
  expect(mote.spell).toBeCloseTo(2);
  // the tortoise
  const e4 = await start(page, '?seed=K3F9QX&floor=5&foe=lanternTortoise');
  const tort = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 90;
    g.warp(1);
    g.sim(0.8);
    const seen = new Set<string>();
    let shut = -1,
      dizzy = -1;
    for (let i = 0; i < 200 && (shut < 0 || dizzy < 0); i++) {
      g.player.invuln = 0;
      g.sim(0.05);
      g.enemies.forEach((e) => seen.add(e.state));
      const e = g.enemies[0],
        hp = e.hp;
      if (shut < 0 && e.state === 'hide') {
        g.hit(0, 10);
        shut = hp - e.hp;
      } else if (dizzy < 0 && e.state === 'dizzy') {
        g.hit(0, 10);
        dizzy = hp - e.hp;
      }
    }
    return { seen: [...seen].sort(), shut, dizzy };
  });
  expect(tort.seen).toEqual(expect.arrayContaining(['dizzy', 'hide', 'spin', 'walk']));
  expect(tort.shut).toBeCloseTo(1.5);
  expect(tort.dizzy).toBeCloseTo(15);
  for (const e of [e1, e2, e3, e4]) expect(e).toEqual([]);
});

test('the bestiary, floor 5: the glacier golem turns blows from the front, stomps ice spikes, freezes and shatters; the hydra loses heads that grow back as two unless burned; the raven darkens the sight and flees light; the wolves come as a pack, howl and scatter from fire; the pangolin rolls (bolts glance off) and is dazed; the jackalope bounds away stamping rime; the manticore volleys and pounces (holy light stills its tail)', async ({
  page,
}) => {
  type Foe = {
    type: string;
    state: string;
    x: number;
    z: number;
    hp: number;
    maxHp: number;
    face: number;
    st: number;
    sung?: number;
    dead?: boolean;
    parts: Record<string, { visible: boolean }>;
  };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string, by?: string, dx?: number, dz?: number): number;
    spawn(kind: string, x?: number, z?: number): Foe;
    inflict(s: Record<string, number>): void;
    clearRoom(): void;
    burn(x: number, z: number, r?: number): void;
    prop(kind: string, x: number, z: number): boolean;
    clock: number;
    ground: { rime: number };
    shots: unknown[];
    player: {
      x: number;
      z: number;
      vx: number;
      vz: number;
      hp: number;
      maxHp: number;
      invuln: number;
      chill: number;
      dim: number;
    };
    enemies: Foe[];
  };
  const errors = await start(page, '?seed=K3F9QX&floor=5&room=great_hall&variant=quiet');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.5);
    const x0 = g.player.x,
      z0 = g.player.z,
      home = () => Object.assign(g.player, { x: x0, z: z0, vx: 0, vz: 0 });
    const meet = (id: string, secs: number, every?: (e: Foe) => void, dx = 3) => {
      g.clearRoom();
      g.sim(0.3);
      home();
      g.player.hp = 99;
      g.spawn('dummy', g.player.x - 5, g.player.z - 2.5);
      const e = g.spawn(id, g.player.x + dx, g.player.z);
      g.sim(0.7);
      const seen = new Set<string>();
      let hurt = 0;
      for (let i = 0; i < secs * 20; i++) {
        g.player.invuln = 0;
        const before = g.player.hp;
        g.sim(0.05);
        hurt += before - g.player.hp;
        g.player.hp = 99;
        seen.add(e.state);
        every?.(e);
      }
      return { e, i: g.enemies.indexOf(e), seen, hurt };
    };
    const R: Record<string, unknown> = {};
    // the glacier golem (an elemental): a blow from ahead barely tells; chilled, it freezes stiff and a shock shatters it
    {
      const { e, i, seen } = meet('glacierGolem', 6);
      const f = { x: Math.sin(e.face), z: Math.cos(e.face) };
      let hp = e.hp;
      g.hit(i, 4, undefined, 'cantrip', -f.x, -f.z);
      const front = hp - e.hp;
      hp = e.hp;
      g.hit(i, 4, undefined, 'cantrip', f.x, f.z);
      const back = hp - e.hp;
      g.inflict({ chill: 1 });
      g.sim(0.1);
      const frozen = e.state;
      hp = e.hp;
      g.inflict({ shock: 1 });
      g.sim(0.05);
      R.glacier = { stomped: seen.has('stomp'), front, back, frozen, shattered: (hp - e.hp) / e.maxHp };
    }
    // the hydra: a head cut off grows back as two; a burned stump doesn't
    {
      const { e } = meet('hydra', 2);
      const heads = () => [0, 1, 2, 3, 4].filter((k) => e.parts[`neck${k}`].visible).length;
      const first = heads();
      g.hit(g.enemies.indexOf(e), 12);
      g.sim(0.1);
      const cut = heads();
      g.sim(4);
      const regrown = heads();
      g.hit(g.enemies.indexOf(e), 12);
      g.sim(0.1);
      g.inflict({ burn: 2 });
      g.sim(4);
      R.hydra = { first, cut, regrown, seared: heads() };
    }
    // the raven: in its gloom the mage's sight darkens; a lit brazier drives it off
    {
      let dim = 0;
      const { e, seen } = meet(
        'gloomRaven',
        8,
        () => {
          dim = Math.max(dim, g.player.dim);
        },
        2,
      );
      const bx = x0 + 2,
        bz = z0 - 2;
      g.prop('brazier', bx, bz);
      g.burn(bx, bz, 0.3);
      Object.assign(e, { x: bx + 0.8, z: bz, state: 'wheel', st: 5 });
      g.sim(1);
      R.raven = { dived: seen.has('dive'), dim, fled: Math.hypot(e.x - bx, e.z - bz) };
    }
    // the wolves: a pack that lunges by turns and howls itself faster; fire scatters them
    {
      g.clearRoom();
      g.sim(0.3);
      home();
      g.player.hp = 99;
      g.spawn('rimeWolf', g.player.x + 3, g.player.z);
      g.sim(0.7);
      const pack = g.enemies.filter((f) => f.type === 'rimeWolf' && !f.dead);
      const seen = new Set<string>();
      let hasted = 0;
      for (let k = 0; k < 160; k++) {
        g.player.invuln = 0;
        g.sim(0.05);
        g.player.hp = 99;
        pack.forEach((f) => seen.add(f.state));
        hasted = Math.max(hasted, pack.filter((f) => (f.sung ?? 0) > g.clock).length);
      }
      g.burn(pack[0].x, pack[0].z, 0.3);
      g.sim(0.1);
      R.wolf = { n: pack.length, lunged: seen.has('lunge'), hasted, scattered: pack[0].state };
    }
    // the pangolin: rolling, the cantrip glances off; into a wall, dazed in dust that dims the sight, open to twice the harm
    {
      let glanced = -1,
        open = -1,
        dim = 0;
      meet('dustPangolin', 8, (f) => {
        if (f.state === 'roll' && glanced < 0) {
          const hp = f.hp;
          g.hit(g.enemies.indexOf(f), 4, undefined, 'cantrip');
          glanced = hp - f.hp;
        }
        if (f.state === 'dazed' && open < 0) {
          const hp = f.hp;
          g.hit(g.enemies.indexOf(f), 4);
          open = hp - f.hp;
          dim = g.player.dim;
        }
      });
      R.pangolin = { glanced, open, dim };
    }
    // the jackalope: it bounds away and stamps ice shards and rime
    {
      let rime = 0,
        shards = 0;
      const { seen } = meet(
        'frostJackalope',
        8,
        () => {
          rime = Math.max(rime, g.ground.rime);
          shards = Math.max(shards, g.shots.length, g.player.chill > 0 ? 1 : 0);
        },
        2,
      );
      R.hare = { leapt: seen.has('leap'), rime, shards };
    }
    // the manticore: its tail volleys and it pounces; under holy light the tail doesn't rise
    {
      const { e, seen } = meet('manticore', 9);
      g.inflict({ sanct: 3 });
      const held = new Set<string>();
      for (let k = 0; k < 60; k++) {
        g.sim(0.05);
        held.add(e.state);
      }
      R.manticore = { volleyed: seen.has('aim'), pounced: seen.has('pounce'), aimedHoly: held.has('aim') };
    }
    return R;
  });
  const gl = r.glacier as { front: number; back: number; shattered: number };
  expect(r.glacier).toMatchObject({ stomped: true, frozen: 'frozen' });
  expect(gl.front).toBeLessThan(gl.back / 2);
  expect(gl.back).toBeCloseTo(4);
  expect(gl.shattered).toBeGreaterThan(0.3);
  expect(r.hydra).toEqual({ first: 3, cut: 2, regrown: 4, seared: 3 });
  const rv = r.raven as { dim: number; fled: number };
  expect(r.raven).toMatchObject({ dived: true });
  expect(rv.dim).toBeGreaterThan(0);
  expect(rv.fled).toBeGreaterThan(1.5);
  expect(r.wolf).toMatchObject({ lunged: true, scattered: 'flee' });
  const w = r.wolf as { n: number; hasted: number };
  expect(w.n).toBeGreaterThanOrEqual(2);
  expect(w.hasted).toBe(w.n);
  expect(r.pangolin).toMatchObject({ glanced: 0, open: 8 });
  expect((r.pangolin as { dim: number }).dim).toBeGreaterThan(0);
  expect(r.hare).toMatchObject({ leapt: true });
  expect((r.hare as { rime: number }).rime).toBeGreaterThan(0);
  expect((r.hare as { shards: number }).shards).toBeGreaterThan(0);
  expect(r.manticore).toMatchObject({ volleyed: true, pounced: true, aimedHoly: false });
  expect(errors).toEqual([]);
});
