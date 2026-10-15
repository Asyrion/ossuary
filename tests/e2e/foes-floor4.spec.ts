import { expect, test } from '@playwright/test';
import { start } from './helpers';

test("foes in code: floor 4's wickmouse darts and drops its candle burning; the chime bat marks the ground for a spark; the gargoyle perches as stone and pounces; the fawn heals", async ({
  page,
}) => {
  type Foe = { type: string; state: string; x: number; z: number; hp: number; maxHp: number; tele?: number };
  type GF = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    hit(i: number, dmg: number, school?: string): number;
    prop(kind: string, x: number, z: number): boolean;
    props: { kind: string; x: number; z: number; lit: boolean }[];
    spellFx: { strikes: number };
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number };
    enemies: Foe[];
    shots: { chill?: number }[];
  };
  // the wickmouse
  const e1 = await start(page, '?seed=K3F9QX&floor=4&foe=wickmouse');
  const mouse = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.8);
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      g.sim(0.05);
      g.enemies.forEach((e) => seen.add(e.state));
    }
    const e = g.enemies[0];
    [
      [0.4, 0],
      [-0.4, 0],
      [0, 0.4],
      [0, -0.4],
      [0.3, 0.3],
      [-0.3, -0.3],
      [0.3, -0.3],
      [-0.3, 0.3],
    ].some(([dx, dz]) => g.prop('brazier', e.x + dx, e.z + dz));
    /* (beside it, wherever it ran to: a spot that takes it) */ const cold = g.props.find(
      (p) => p.kind === 'brazier',
    )!.lit; // (its candle falls on what burns)
    g.hit(0, 99);
    g.sim(0.2);
    return { seen: [...seen].sort(), cold, lit: g.props.find((p) => p.kind === 'brazier')!.lit };
  });
  expect(mouse.seen).toEqual(expect.arrayContaining(['dart', 'hide', 'peep']));
  expect(mouse).toMatchObject({ cold: false, lit: true });
  // the chime bat: stand still, and the spark finds the mark
  const e2 = await start(page, '?seed=K3F9QX&floor=4&foe=chimeBat');
  const bat = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 60;
    g.warp(1);
    g.sim(0.8);
    let chimed = false,
      struck = 0;
    const hp = g.player.hp;
    for (let i = 0; i < 160 && !(chimed && struck); i++) {
      g.player.invuln = 0;
      g.sim(0.05);
      chimed ||= g.enemies.some((e) => e.state === 'chime');
      struck = Math.max(struck, g.spellFx.strikes);
    }
    return { chimed, struck, hurt: hp - g.player.hp };
  });
  expect(bat.chimed).toBe(true);
  expect(bat.struck).toBeGreaterThan(0);
  expect(bat.hurt).toBeGreaterThan(0);
  // the gargoyle: stone turns most of a blow; awake, it pounces and lands in frost
  const e3 = await start(page, '?seed=K3F9QX&floor=4&foe=gargoyleWhelp');
  const garg = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game;
    g.player.maxHp = g.player.hp = 90;
    g.warp(1);
    g.sim(0.8);
    const e = g.enemies[0],
      state0 = e.state,
      hp0 = e.hp;
    g.hit(0, 10);
    const stoneTook = hp0 - e.hp;
    const seen = new Set<string>();
    let frost = 0;
    for (let i = 0; i < 200; i++) {
      g.player.invuln = 0;
      g.sim(0.05);
      g.enemies.forEach((f) => seen.add(f.state));
      frost = Math.max(frost, g.shots.filter((s) => s.chill).length);
    }
    return { state0, stoneTook, seen: [...seen].sort(), frost };
  });
  expect(garg.state0).toBe('stone');
  expect(garg.stoneTook).toBeCloseTo(2); // (a fifth of the blow)
  expect(garg.seen).toEqual(expect.arrayContaining(['stone', 'wake', 'crouch', 'leap', 'settle']));
  expect(garg.frost).toBeGreaterThanOrEqual(6);
  // the fawn heals the hurt round it
  const e4 = await start(page, '?seed=K3F9QX&floor=4&foe=moonstagFawn');
  const fawn = await page.evaluate(() => {
    const g = (window as unknown as { __game: GF }).__game,
      view = g as unknown as {
        rooms(): {
          type: string;
          cx: number;
          plan: { id: number };
          waves: unknown[][];
          bounds: { minX: number; maxX: number };
        }[];
        current: { cx: number; bounds: { minX: number; maxX: number } };
      };
    const herd = view.rooms().find((r) => r.type === 'normal' && (r.waves[0]?.length ?? 0) >= 2)!; // (a fight with two or more of them)
    g.warp(herd.plan.id);
    g.sim(0.8);
    const b = view.current.bounds;
    g.player.x = g.enemies[0].x > view.current.cx ? b.minX + 1 : b.maxX - 1; // (the far side, so they gather rather than flee)
    g.hit(0, 5);
    const hurt = g.enemies[0].hp;
    let bowed = false;
    for (let i = 0; i < 200 && g.enemies[0].hp <= hurt; i++) {
      g.sim(0.05);
      bowed ||= g.enemies.some((e) => e.state === 'bow');
    }
    return { bowed, healed: g.enemies[0].hp - hurt, n: g.enemies.length };
  });
  expect(fawn.n).toBeGreaterThan(1);
  expect(fawn.bowed).toBe(true);
  expect(fawn.healed).toBeGreaterThan(0);
  for (const e of [e1, e2, e3, e4]) expect(e).toEqual([]);
});

test('the bestiary, floor 4: the griffin soars out of reach, swoops down a marked line and buffets (a hex grounds it); the eye shut takes half, open fires its ray (a hex shuts it); the harpy screeches glyphs away and dives; the lodestone golem draws the mage, bends bolts and drinks storm; the hearth golem turns blows while lit (frost puts it out); the shadow fox blinks shadow to shadow (holy light holds it); the scarab throws its snowball (fire melts it)', async ({
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
    burn(x: number, z: number, r?: number): void;
    prop(kind: string, x: number, z: number): boolean;
    burningGround: number;
    glyphs: { x: number; z: number }[];
    bolts: { vx: number }[];
    shots: unknown[];
    keys: Set<string>;
    arrowOrder: string[];
    player: { x: number; z: number; vx: number; vz: number; hp: number; maxHp: number; invuln: number; chill: number };
    enemies: Foe[];
  };
  const errors = await start(page, '?seed=K3F9QX&floor=4&room=great_hall&variant=quiet&loot=glyphs:9');
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
    // the griffin: soaring, blows can't reach it; it swoops down its line, lands and buffets the mage away; hexed, it comes down
    {
      let aloft = -1,
        pushed = 0;
      const { e, seen } = meet('griffin', 9, (f) => {
        if (f.state === 'soar' && aloft < 0) {
          const hp = f.hp;
          g.hit(g.enemies.indexOf(f), 3);
          aloft = hp - f.hp;
        }
        if (f.state === 'claw') pushed = Math.max(pushed, Math.hypot(g.player.x - x0, g.player.z - z0));
      });
      for (let k = 0; k < 200 && e.state !== 'soar'; k++) g.sim(0.05);
      g.inflict({ hex: 2 });
      g.sim(0.1);
      R.griffin = {
        swooped: seen.has('mark') && seen.has('swoop') && seen.has('claw'),
        aloft,
        pushed,
        hexed: e.state,
        reachable: !e.hidden,
      };
    }
    // the eye: shut, half a blow; open, all of it; its ray strikes where the mage stood; a hex shuts it
    {
      const { e, seen, hurt } = meet('radiantEye', 8);
      for (let k = 0; k < 100 && e.state !== 'shut'; k++) g.sim(0.05);
      let hp = e.hp;
      g.hit(g.enemies.indexOf(e), 4);
      const shut = hp - e.hp;
      for (let k = 0; k < 100 && e.state !== 'track'; k++) g.sim(0.05);
      hp = e.hp;
      g.hit(g.enemies.indexOf(e), 4);
      const open = hp - e.hp;
      g.inflict({ hex: 2 });
      g.sim(0.05);
      R.eye = { fired: seen.has('aim'), hurt, shut, open, hexed: e.state };
    }
    // the harpy: perched, it screeches, and a glyph chalked near it is blown away; then it dives
    {
      const { e, seen } = meet('harpy', 6);
      for (let k = 0; k < 200 && e.state !== 'perch'; k++) g.sim(0.05);
      Object.assign(g.player, { x: e.x + (e.x > x0 ? -1.2 : 1.2), z: e.z });
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      g.sim(0.05);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
      g.sim(0.05);
      const gl = g.glyphs[g.glyphs.length - 1],
        at = gl ? [gl.x, gl.z] : [0, 0];
      Object.assign(e, { state: 'perch', st: 3, fireT: 0.2 }); // (it screeches now, before the glyph's fuse runs out)
      for (let k = 0; k < 100 && e.state !== 'screech'; k++) {
        g.sim(0.05);
        g.player.hp = 99;
      }
      g.sim(0.3);
      R.harpy = { dived: seen.has('dive'), chalked: !!gl, blown: gl ? Math.hypot(gl.x - at[0], gl.z - at[1]) : 0 };
    }
    // the lodestone golem (an elemental): it draws the mage; a bolt flying past bends towards it; storm feeds it
    {
      g.clearRoom();
      g.sim(0.3);
      home();
      const e = g.spawn('lodestoneGolem', g.player.x + 4, g.player.z);
      g.sim(0.8);
      const px = g.player.x;
      g.sim(0.5);
      const drawn = g.player.x - px;
      e.x = g.player.x + 2;
      e.z = g.player.z - 1;
      g.keys.add('ArrowUp');
      g.arrowOrder.push('ArrowUp');
      g.sim(0.1);
      g.keys.delete('ArrowUp');
      g.arrowOrder.length = 0;
      let bent = 0;
      for (let k = 0; k < 10; k++) {
        g.sim(0.03);
        for (const b of g.bolts) bent = Math.max(bent, b.vx);
      }
      const i = g.enemies.indexOf(e);
      e.hp = e.maxHp / 2;
      let hp = e.hp;
      g.hit(i, 2, 'storm');
      const storm = e.hp - hp;
      hp = e.hp;
      g.hit(i, 2, 'frost');
      R.magnet = { drawn, bent, storm, frost: hp - e.hp };
    }
    // the hearth golem (an elemental): coals land burning; lit, a blow barely tells; frost puts it out, and it lights again
    {
      let burning = 0;
      const { e, i } = meet('hearthGolem', 6, () => {
        burning = Math.max(burning, g.burningGround);
      });
      let hp = e.hp;
      g.hit(i, 5);
      const lit = hp - e.hp;
      g.inflict({ chill: 1 });
      g.sim(0.1);
      const out = e.state;
      hp = e.hp;
      g.hit(g.enemies.indexOf(e), 5);
      const cold = hp - e.hp;
      g.sim(5);
      R.hearth = { burning, lit, out, cold, again: e.state };
    }
    // the shadow fox: into one shadow and out of another, and a bite; holy light holds it in the open
    {
      const { e, seen, hurt } = meet('shadowFox', 8);
      Object.assign(e, { state: 'prowl', st: 0, hidden: false }); // (out in the open, whatever it was doing)
      g.inflict({ sanct: 3 });
      const held = new Set<string>();
      for (let k = 0; k < 60; k++) {
        g.sim(0.05);
        held.add(e.state);
      }
      R.fox = { blinked: seen.has('gone') && seen.has('emerge') && seen.has('bite'), hurt, held: [...held] };
      // a lit brazier whose light reaches the whole hall: no shadow near the mage, so it waits in the dark, and in the end
      // rises in the light
      g.prop('brazier', x0 + 2, z0 - 2);
      g.burn(x0 + 2, z0 - 2, 0.3);
      const P = (e as unknown as { foe: { params: { light: number } } }).foe.params,
        reach = P.light;
      P.light = 99;
      Object.assign(e, { state: 'gone', st: 0, cycle: 0, hidden: true });
      g.sim(1);
      const waits = e.state;
      for (let k = 0; k < 80 && e.state === 'gone'; k++) g.sim(0.05);
      P.light = reach;
      R.foxLit = { waits, rose: e.state };
    }
    // the rime scarab: its snowball grows, is thrown and bursts cold; fire melts the ball
    {
      let chill = 0;
      const { e, seen } = meet('rimeScarab', 8, () => {
        chill = Math.max(chill, g.player.chill);
      });
      for (let k = 0; k < 100 && e.state !== 'push'; k++) g.sim(0.05);
      g.burn(e.x, e.z, 0.5);
      g.sim(0.1);
      R.scarab = { threw: seen.has('heave') && seen.has('bare'), chill, melted: e.state };
    }
    return R;
  });
  expect(r.griffin).toMatchObject({ swooped: true, aloft: 0, hexed: 'claw', reachable: true });
  expect((r.griffin as { pushed: number }).pushed).toBeGreaterThan(0.5);
  expect(r.eye).toMatchObject({ fired: true, shut: 2, open: 4, hexed: 'shut' });
  expect(r.harpy).toMatchObject({ dived: true, chalked: true });
  expect((r.harpy as { blown: number }).blown).toBeGreaterThan(1);
  const m = r.magnet as { drawn: number; bent: number; storm: number; frost: number };
  expect(m.drawn).toBeGreaterThan(0.1);
  expect(m.bent).toBeGreaterThan(1);
  expect(m.storm).toBeGreaterThan(0);
  expect(m.frost).toBeCloseTo(4);
  expect(r.hearth).toMatchObject({ out: 'out', cold: 5, again: 'lit' });
  expect((r.hearth as { lit: number }).lit).toBeLessThan(2.5);
  expect((r.hearth as { burning: number }).burning).toBeGreaterThan(0);
  expect(r.fox).toMatchObject({ blinked: true, held: ['prowl'] });
  expect((r.fox as { hurt: number }).hurt).toBeGreaterThan(0);
  expect(r.foxLit).toMatchObject({ waits: 'gone' });
  expect((r.foxLit as { rose: string }).rose).not.toBe('gone');
  expect(r.scarab).toMatchObject({ threw: true, melted: 'bare' });
  expect((r.scarab as { chill: number }).chill).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
