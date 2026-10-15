import { expect, test } from '@playwright/test';
import { start } from './helpers';

test("foes in code (M4): floor 3's salamander lays burning ground that burns the mage; the imp blinks about and its hex drains mana; the drakeling (one a room) breathes rime, takes to its wings and lands in a ring of frost", async ({
  page,
}) => {
  type Foe = {
    type: string;
    state: string;
    x: number;
    z: number;
    hidden?: boolean;
    flying: boolean;
    model: { position: { y: number }; visible: boolean };
  };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    burningGround: number;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; chill: number; mana: number };
    enemies: Foe[];
    shots: { chill?: number; hex?: number }[];
  };
  // the salamander
  const errors = await start(page, '?seed=K3F9QX&floor=3&foe=cinderSalamander');
  const sala = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.5);
    let ground = 0;
    for (let i = 0; i < 40; i++) {
      g.sim(0.05);
      ground = Math.max(ground, g.burningGround);
    }
    const e = g.enemies[0];
    g.player.x = e.x;
    g.player.z = e.z;
    g.player.invuln = 0;
    const hp = g.player.hp;
    for (let i = 0; i < 4; i++) {
      g.player.x = e.x;
      g.player.z = e.z;
      g.sim(0.05);
    }
    return { ground, burned: hp - g.player.hp };
  });
  expect(sala.ground).toBeGreaterThan(3);
  expect(sala.burned).toBeGreaterThan(0);
  // the imp
  const e2 = await start(page, '?seed=K3F9QX&floor=3&foe=hexImp&spells=cinder_lance');
  const imp = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.3);
    let hidden = false,
      invisible = false,
      from = 0,
      hexes = 0;
    for (let i = 0; i < 160 && !(hidden && hexes && from); i++) {
      // (every imp in the room: any of them may throw first)
      g.sim(0.05);
      hexes = Math.max(hexes, g.shots.filter((s) => s.hex).length);
      for (const e of g.enemies) {
        if (e.state === 'gone') {
          hidden ||= !!e.hidden;
          invisible ||= !e.model.visible;
        }
        if (e.state === 'raise' && !from) from = Math.hypot(e.x - g.player.x, e.z - g.player.z);
      }
    }
    // stand in a hex's way
    const mana = (g.player.mana = 100);
    let drained = 0; // (full, so no mana comes back meanwhile)
    for (const f of g.enemies) (f as Foe & { contact: number }).contact = 0; // (an imp's touch, beside its fresh throw, would come first)
    for (let i = 0; i < 160 && drained < 5; i++) {
      const s = g.shots.find((s) => s.hex) as { x?: number; z?: number } | undefined;
      if (s) {
        g.player.x = s.x!;
        g.player.z = s.z!;
        g.player.invuln = 0;
      }
      g.sim(0.05);
      drained = mana - g.player.mana;
    }
    return { hidden, invisible, from, hexes, drained };
  });
  expect(imp.hidden).toBe(true);
  expect(imp.invisible).toBe(true);
  expect(imp.hexes).toBeGreaterThan(0);
  expect(imp.from).toBeGreaterThan(1.5);
  expect(imp.drained).toBeGreaterThanOrEqual(5); // (a hex's drain)
  // the drakeling: one a room on its floor, however many heavies the template has
  const e3 = await start(page, '?seed=K3F9QX&floor=3&room=twin_hounds');
  const count = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.warp(1);
    g.sim(0.3);
    return g.enemies.filter((e) => e.type === 'rimeDrakeling').length;
  });
  expect(count).toBeLessThanOrEqual(1);
  const e4 = await start(page, '?seed=K3F9QX&floor=3&foe=rimeDrakeling');
  const drake = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 90;
    g.warp(1);
    g.sim(0.3);
    const e = g.enemies[0],
      seen = new Set<string>();
    let rime = 0,
      high = 0,
      flew = false;
    // (every step: a short flight to a spot near the mage can be over within a 0.05 s slice, so as it takes off the mage
    // stands across the room from it, and its landing spot beside the mage is a long flight away, high enough to see)
    const cx = (g as unknown as { current: { cx: number } }).current.cx;
    for (
      let i = 0;
      i < 3600 && !(seen.has('inhale') && seen.has('fly') && seen.has('land') && rime && high > 0.5);
      i++
    ) {
      if (e.state === 'takeoff') {
        g.player.x = cx - Math.sign(e.x - cx || 1) * 4.5;
        g.player.z = e.z;
      } else if (e.state !== 'fly' && e.state !== 'land') {
        g.player.x = e.x + 2.5;
        g.player.z = e.z;
      }
      g.sim(1 / 60);
      seen.add(e.state);
      rime = Math.max(rime, g.shots.filter((s) => s.chill).length);
      high = Math.max(high, e.model.position.y);
      flew ||= e.flying;
    }
    return { seen: [...seen].sort(), rime, high, flew };
  });
  expect(drake.seen).toEqual(expect.arrayContaining(['stalk', 'inhale', 'takeoff', 'fly', 'land']));
  expect(drake.rime).toBeGreaterThanOrEqual(7);
  expect(drake.high).toBeGreaterThan(0.5);
  expect(drake.flew).toBe(true);
  expect([...errors, ...e2, ...e3, ...e4]).toEqual([]);
});

test('the bestiary (M4.5), floor 3: the nest lets out wasps and only fire harms it; the djinn lights braziers and frost snuffs it; the ooze burns the floor, splits and hardens; the phoenix rises once from its ashes unless they are frozen; the basilisk stares (a tall thing blocks it); the salt golem guards and fire slows it; the rubble golem drops stones and breaks to a blast', async ({
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
    st: number;
    cycle?: number;
    dir?: { x: number; z: number };
  };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string): number;
    spawn(kind: string, x?: number, z?: number): Foe;
    inflict(s: Record<string, number>): void;
    clearRoom(): void;
    blast(x: number, z: number): void;
    prop(kind: string, x: number, z: number): boolean;
    props: { kind: string; lit: boolean }[];
    burningGround: number;
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; stone: number };
    enemies: Foe[];
  };
  const errors = await start(page, '?seed=K3F9QX&floor=3&room=great_hall&variant=quiet');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 99;
    g.warp(1);
    g.sim(0.5);
    const x0 = g.player.x,
      z0 = g.player.z,
      home = () => Object.assign(g.player, { x: x0, z: z0, vx: 0, vz: 0 }); // (each meeting from the same spot)
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
      } // (kept alive: burning ground every step)
      return { e, i: g.enemies.indexOf(e), seen, hurt };
    };
    const R: Record<string, unknown> = {};
    // the nest: set in a wall, it lets out wasps that dash to sting; fire harms it, anything else barely
    {
      let wasps = 0;
      const dashed = new Set<string>();
      const { e, i } = meet('waspNest', 8, () => {
        const w = g.enemies.filter((f) => f.type === 'emberWasp' && !f.dead);
        wasps = Math.max(wasps, w.length);
        w.forEach((f) => dashed.add(f.state));
      });
      let hp = e.hp;
      g.hit(i, 4);
      const plain = hp - e.hp;
      hp = e.hp;
      g.hit(i, 4, 'ember');
      R.nest = { wasps, dash: dashed.has('dash'), plain, ember: hp - e.hp };
    }
    // the djinn (an elemental): brazier to brazier, lighting them; Ember feeds it, Frost hurts it twice over and snuffs it
    {
      g.clearRoom();
      g.sim(0.3);
      home();
      const placed = [
        g.prop('brazier', g.player.x + 3, g.player.z - 2),
        g.prop('brazier', g.player.x - 3, g.player.z - 2),
      ].filter(Boolean).length;
      let burning = 0;
      const { e, i } = meet('cinderDjinn', 8, () => {
        burning = Math.max(burning, g.burningGround);
      });
      e.hp = e.maxHp / 2;
      let hp = e.hp;
      g.hit(i, 2, 'ember');
      const ember = e.hp - hp;
      hp = e.hp;
      g.hit(i, 2, 'frost');
      const frost = hp - e.hp;
      g.inflict({ chill: 1 });
      g.sim(0.1);
      R.djinn = {
        placed,
        lit: g.props.filter((p) => p.kind === 'brazier' && p.lit).length,
        burning,
        ember,
        frost,
        snuffed: e.state,
      };
    }
    // the ooze: burning ground behind it; struck to half, two; chilled, rock, and a blow shatters it
    {
      let burning = 0;
      const { e, i } = meet('magmaOoze', 3, () => {
        burning = Math.max(burning, g.burningGround);
      });
      g.hit(i, e.maxHp * 0.6);
      g.sim(0.3);
      const split = g.enemies.filter((f) => f.type === 'magmaOoze' && !f.dead).length;
      g.inflict({ chill: 1 });
      g.sim(0.1);
      const rock = e.state,
        hp = e.hp;
      g.hit(g.enemies.indexOf(e), 1);
      R.ooze = { burning, split, rock, took: hp - e.hp };
    }
    // the phoenix: it dives in a burning line; felled, ashes that blows don't touch; it rises once, and frozen ashes stay down
    {
      let burning = 0;
      const { e, i, seen } = meet('phoenix', 8, () => {
        burning = Math.max(burning, g.burningGround);
      });
      g.hit(i, 999);
      g.sim(0.1);
      const ashes = e.state,
        down = !!e.dead,
        hp = e.hp;
      g.hit(g.enemies.indexOf(e), 5);
      const untouched = e.hp === hp;
      g.sim(4.2);
      const risen = e.state,
        share = e.hp / e.maxHp;
      g.hit(g.enemies.indexOf(e), 999);
      g.sim(0.1);
      const gone = !!e.dead;
      const f = g.spawn('phoenix', g.player.x + 3, g.player.z);
      g.sim(0.8);
      g.hit(g.enemies.indexOf(f), 999);
      g.sim(0.1);
      g.inflict({ chill: 1 });
      g.sim(0.1);
      R.phoenix = { dived: seen.has('dive'), burning, ashes, down, untouched, risen, share, gone, frozen: !!f.dead };
    }
    // the basilisk: its crest flares and it stares; the mage in its stare is heavy as stone; a tall thing between, and it can't
    {
      const { e, seen } = meet('basilisk', 8);
      const stare = () => {
        // (a stare swept across the mage from 3 tiles off)
        home();
        g.player.stone = 0;
        Object.assign(e, {
          x: g.player.x + 3,
          z: g.player.z,
          vx: 0,
          vz: 0,
          state: 'gaze',
          st: 1.6,
          cycle: -Math.PI / 2,
          dir: { x: 1, z: 0 },
        });
        let stone = 0;
        for (let k = 0; k < 30; k++) {
          g.sim(0.05);
          stone = Math.max(stone, g.player.stone);
        }
        return stone;
      };
      const stone = stare();
      g.prop('reliquary', g.player.x + 1.5, g.player.z);
      const blocked = stare();
      R.basilisk = { stared: seen.has('flare') && seen.has('gaze'), stone, blocked };
    }
    // the salt golem: between the mage and the foe beyond; burning, its wax joints slow it
    {
      g.clearRoom();
      g.sim(0.3);
      home();
      const d = g.spawn('dummy', g.player.x + 5, g.player.z),
        e = g.spawn('saltGolem', g.player.x + 1, g.player.z - 2.5); // (from the north: the hall's south wall is close)
      const off = () => Math.abs(e.z - g.player.z) + Math.max(0, g.player.x - e.x, e.x - d.x); // (how far from the line between the mage and the dummy)
      const from = off();
      g.sim(4);
      const between = off() < Math.min(1, from * 0.5);
      g.clearRoom();
      g.sim(0.3);
      home();
      const s = g.spawn('saltGolem', g.player.x + 4.5, g.player.z);
      g.sim(0.8);
      let x0 = s.x;
      g.sim(0.5);
      const walk = Math.abs(s.x - x0);
      g.inflict({ burn: 3 });
      x0 = s.x;
      g.sim(0.5);
      R.salt = { between, walk, melting: Math.abs(s.x - x0) };
    }
    // the rubble golem: its slam drops stones round the mage; a blast breaks it into stones that come back together,
    // unless they are put down
    {
      const { e, seen, hurt } = meet('rubbleGolem', 6);
      g.blast(e.x, e.z);
      g.sim(0.1);
      const stones = g.enemies.filter((f) => f.type === 'rubbleStone' && !f.dead).length,
        broken = e.hidden;
      g.sim(8);
      const back = e.state,
        left = g.enemies.filter((f) => f.type === 'rubbleStone' && !f.dead).length;
      g.blast(e.x, e.z);
      g.sim(0.1);
      for (const s of g.enemies.filter((f) => f.type === 'rubbleStone' && !f.dead)) g.hit(g.enemies.indexOf(s), 99);
      g.sim(0.2);
      R.rubble = { slammed: seen.has('slam'), hurt, stones, broken, back, left, putDown: !!e.dead };
    }
    return R;
  });
  expect(r.nest).toMatchObject({ dash: true });
  const n = r.nest as { wasps: number; plain: number; ember: number };
  expect(n.wasps).toBeGreaterThan(0);
  expect(n.plain).toBeLessThan(n.ember / 3);
  expect(n.ember).toBeGreaterThan(4);
  const d = r.djinn as { placed: number; lit: number; burning: number; ember: number; frost: number };
  expect(r.djinn).toMatchObject({ snuffed: 'cinder' });
  expect(d.lit).toBe(d.placed);
  expect(d.burning).toBeGreaterThan(0);
  expect(d.ember).toBeGreaterThan(0);
  expect(d.frost).toBeCloseTo(4);
  expect(r.ooze).toMatchObject({ split: 2, rock: 'rock' });
  expect((r.ooze as { burning: number }).burning).toBeGreaterThan(0);
  expect((r.ooze as { took: number }).took).toBeCloseTo(2.5);
  expect(r.phoenix).toMatchObject({
    dived: true,
    ashes: 'ashes',
    down: false,
    untouched: true,
    risen: 'circle',
    gone: true,
    frozen: true,
  });
  expect((r.phoenix as { share: number }).share).toBeCloseTo(0.5);
  expect((r.phoenix as { burning: number }).burning).toBeGreaterThan(0);
  expect((r.basilisk as { stone: number }).stone).toBeGreaterThan(0);
  expect(r.basilisk).toMatchObject({ stared: true, blocked: 0 });
  const s = r.salt as { between: boolean; walk: number; melting: number };
  expect(s.between).toBe(true);
  expect(s.melting).toBeLessThan(s.walk * 0.7);
  expect(r.rubble).toMatchObject({ slammed: true, stones: 3, broken: true, back: 'walk', left: 0, putDown: true });
  expect(errors).toEqual([]);
});
