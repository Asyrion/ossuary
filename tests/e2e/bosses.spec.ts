import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { type Foe, type RoomView, type GameHooks, type W, start } from './helpers';

for (const boss of ['abbess', 'pyre'])
  test(
    `the ${boss} boss, built in code, dives or leaps out of reach and can be beaten`,
    { tag: boss === 'abbess' ? ['@fast'] : [] },
    async ({ page }) => {
      const errors = await start(page, `?room=boss_open&boss=${boss}&seed=BOSS1`);
      const result = await page.evaluate(() => {
        const w = window as unknown as W,
          g = w.__game;
        g.warp(1);
        const foe = g.enemies.find((e) => e.isBoss) as Foe & {
          type: string;
          state: string;
          hidden?: boolean;
          bossSchool?: string;
          bossAff?: { weak: string; resist: string };
          parts?: Record<string, unknown>;
        };
        const look = { school: foe.bossSchool, aff: foe.bossAff, parts: Object.keys(foe.parts ?? {}).length > 5 };
        const states = new Set<string>();
        let hidden = false,
          seconds = 0;
        for (; seconds < 240 && g.enemies.length; seconds += 0.25) {
          w.__fight(0.25);
          states.add(foe.state);
          hidden ||= !!foe.hidden;
        }
        g.sim(0.5);
        const spots = (g.current as RoomView & { spots: unknown[] }).spots;
        return {
          type: foe.type,
          look,
          seconds,
          states: [...states],
          hidden,
          left: g.enemies.length,
          cleared: g.current.cleared,
          choice: spots.length,
        };
      });
      console.log(
        `${boss} beaten in ${result.seconds.toFixed(1)} s of game time; states seen: ${result.states.join(', ')}`,
      );
      expect(result).toMatchObject({ type: boss, hidden: true, left: 0, cleared: true, choice: 2 });
      expect(result.look).toEqual(
        boss === 'abbess'
          ? { school: 'frost', aff: { weak: 'storm', resist: 'frost' }, parts: true }
          : { school: 'ember', aff: { weak: 'frost', resist: 'ember' }, parts: true },
      );
      expect(errors).toEqual([]);
    },
  );

for (const boss of ['hart', 'angler'])
  test(`the ${boss === 'hart' ? 'Hallowed Hart' : 'Deep Angler'}, built in code, fights as it should and can be beaten`, async ({
    page,
  }) => {
    const errors = await start(page, `?room=boss_open&boss=${boss}&floor=${boss === 'hart' ? 4 : 5}&seed=BOSS2`);
    type Boss = Foe & {
      type: string;
      state: string;
      hp: number;
      summoned?: boolean;
      st: number;
      cycle: number;
      bossAff?: { weak: string; resist: string };
      parts?: Record<string, unknown>;
    };
    type G2 = GameHooks & {
      hit(i: number, dmg: number, school?: string): number;
      player: GameHooks['player'] & { invuln: number };
    };
    const result = await page.evaluate(() => {
      const w = window as unknown as W,
        g = w.__game as G2;
      g.warp(1);
      const foe = g.enemies.find((e) => e.isBoss) as Boss,
        i = g.enemies.indexOf(foe);
      // its weakness and resistance
      g.sim(0.7);
      const hp0 = foe.hp;
      g.hit(i, 4, foe.bossAff!.weak);
      const weak = hp0 - foe.hp;
      const hp1 = foe.hp;
      g.hit(i, 4, foe.bossAff!.resist);
      const resist = hp1 - foe.hp;
      // the angler's lure draws the mage in: stand three tiles off, and let it pull
      let drawn = 0;
      if (foe.type === 'angler') {
        g.player.x = foe.x;
        g.player.z = foe.z + 3;
        foe.state = 'pull';
        foe.st = 1.5;
        (foe as Boss & { fireT: number }).fireT = foe.hp;
        const d0 = Math.hypot(g.player.x - foe.x, g.player.z - foe.z);
        g.sim(0.5);
        drawn = d0 - Math.hypot(g.player.x - foe.x, g.player.z - foe.z);
      }
      const states = new Set<string>();
      let called = false,
        seconds = 0;
      // (every step: a charge that meets a wall at once can last a step or two, and the fight is random)
      for (; seconds < 240 && g.enemies.length; seconds += 1 / 60) {
        w.__fight(1 / 60, 1 / 60);
        states.add(foe.state);
        called ||= !!foe.summoned;
      }
      g.sim(0.5);
      const spots = (g.current as RoomView & { spots: unknown[] }).spots;
      return {
        type: foe.type,
        weak,
        resist,
        drawn,
        seconds,
        states: [...states],
        called,
        left: g.enemies.length,
        cleared: g.current.cleared,
        choice: spots.length,
      };
    });
    console.log(
      `${boss} beaten in ${result.seconds.toFixed(1)} s of game time; states seen: ${result.states.join(', ')}`,
    );
    expect(result).toMatchObject({ type: boss, called: true, left: 0, cleared: true, choice: 2 });
    expect(result.weak).toBeCloseTo(6);
    expect(result.resist).toBeCloseTo(2); // (half again, and half)
    expect(result.states).toEqual(
      expect.arrayContaining(
        boss === 'hart' ? ['walk', 'aim', 'charge', 'spokes', 'windStamp'] : ['drift', 'lure', 'spit', 'windRing'],
      ),
    );
    if (boss === 'angler') expect(result.drawn).toBeGreaterThan(0.5);
    expect(errors).toEqual([]);
  });

test('the War-Tiger stands as a statue until the mage comes near, loses its plates to a glyph, a Shatter and blows, and can be beaten', async ({
  page,
}) => {
  const errors = await start(page, '?room=boss_open&boss=tiger&floor=4&seed=BOSS3');
  type Boss = Foe & {
    type: string;
    state: string;
    st: number;
    cycle: number;
    hp: number;
    maxHp: number;
    contact: number;
    plates: number;
    guard: number;
    summoned?: boolean;
    bossAff: { weak: string; resist: string };
  };
  type G2 = GameHooks & {
    hit(i: number, dmg: number, school?: string): number;
    inflict(s: Record<string, number>): void;
    glyphs: { x: number; z: number }[];
    shots: { chill?: number }[];
  };
  const still = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2;
    g.warp(1);
    g.sim(0.7, true);
    const e = g.enemies.find((f) => f.isBoss) as Boss,
      far = Math.hypot(g.player.x - e.x, g.player.z - e.z);
    g.sim(1.5);
    const x0 = e.x,
      z0 = e.z;
    g.player.x = e.x;
    g.player.z = e.z + 3.4;
    g.sim(0.5); // (not quite near enough)
    return {
      far: far > 3,
      state: e.state,
      contact: e.contact,
      moved: Math.hypot(e.x - x0, e.z - z0),
      plates: e.plates,
      guard: e.guard,
    };
  });
  expect(still).toEqual({ far: true, state: 'statue', contact: 0, moved: 0, plates: 4, guard: 0.4 });
  await page.keyboard.press('Space'); // a glyph chalked while it stands, then moved beside it: the blast knocks a plate off and wakes it
  const plates = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2,
      e = g.enemies.find((f) => f.isBoss) as Boss,
      i = g.enemies.indexOf(e),
      seen: Record<string, unknown> = {};
    g.sim(0.05);
    g.glyphs[0].x = e.x + 1.2;
    g.glyphs[0].z = e.z;
    for (let k = 0; k < 40 && e.plates === 4; k++) g.sim(0.05);
    g.sim(0.1);
    seen.glyph = [e.plates, e.state];
    g.player.hp = g.player.maxHp;
    g.sim(1);
    g.inflict({ chill: 2 });
    g.inflict({ shock: 1 });
    seen.shatter = e.plates; // (a shock on its rimed plates)
    seen.guard = e.guard;
    const hp0 = e.hp;
    g.hit(i, 4, e.bossAff.weak);
    seen.weak = (hp0 - e.hp) / e.guard;
    const hp1 = e.hp;
    g.hit(i, 4, e.bossAff.resist);
    seen.resist = (hp1 - e.hp) / e.guard;
    for (let k = 0; k < 20 && e.plates === 2; k++) g.hit(i, 6);
    seen.worn = e.plates; // (blows turned wear a plate through)
    // with the mage across the room, it crouches and pounces at where they stood, throwing frost as it lands
    const room = g.current,
      states = new Set<string>();
    let frost = false;
    g.player.x = room.cx - 5;
    g.player.z = room.cz;
    e.x = room.cx + 3;
    e.z = room.cz;
    e.state = 'prowl';
    e.st = 0;
    e.cycle = 0;
    let stepped = false; // (once it crouches, the mage steps off the marked spot: shards thrown right on the mage would strike it the same step, unseen)
    for (let k = 0; k < 50; k++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
      states.add(e.state);
      if (e.state === 'crouch' && !stepped) {
        g.player.z += 1.5;
        stepped = true;
      }
      frost ||= g.shots.some((sh) => sh.chill);
    }
    seen.pounced = ['crouch', 'pounce'].every((st) => states.has(st)) && (states.has('recover') || states.has('stun'));
    seen.frost = frost;
    return seen;
  });
  expect(plates).toMatchObject({ glyph: [3, 'wake'], shatter: 2, guard: 0.7, worn: 1, pounced: true, frost: true });
  expect(plates.weak).toBeCloseTo(6);
  expect(plates.resist).toBeCloseTo(2); // (half again, and half, of what gets through)
  const result = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as G2,
      foe = g.enemies.find((e) => e.isBoss) as Boss;
    const states = new Set<string>();
    let called = false,
      seconds = 0;
    for (; seconds < 240 && g.enemies.length; seconds += 0.25) {
      w.__fight(0.25);
      states.add(foe.state);
      called ||= !!foe.summoned;
    }
    g.sim(0.5);
    return { seconds, states: [...states], called, left: g.enemies.length, cleared: g.current.cleared };
  });
  console.log(`tiger beaten in ${result.seconds.toFixed(1)} s of game time; states seen: ${result.states.join(', ')}`);
  expect(result).toMatchObject({ called: true, left: 0, cleared: true });
  expect(result.states).toEqual(expect.arrayContaining(['prowl', 'windSwipe', 'windRoar']));
  expect(errors).toEqual([]);
});

test("the Pillar Dragon coils round the pillars (raising its own where too few), breathes fire and frost, falls to a glyph at its pillar's foot or a bell, and can be beaten", async ({
  page,
}) => {
  type Boss = Foe & { type: string; state: string; hp: number; contact: number; summoned?: boolean };
  type G2 = GameHooks & {
    hit(i: number, dmg: number, school?: string): number;
    glyphs: { x: number; z: number; fuse: number }[];
    shots: { fire?: boolean; chill?: number }[];
    dragon: { state: string; pillars: number; on: boolean; headY: number; risen: boolean };
    props: { kind: string; x: number; z: number; cd?: number }[];
  };
  const errors = [await start(page, '?room=boss_open&boss=dragon&floor=5&seed=BOSS4')];
  const first = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2,
      seen = new Set<string>();
    let fire = false,
      frost = false,
      high = 0;
    g.warp(1);
    g.sim(0.7, true);
    for (let k = 0; k < 200; k++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
      seen.add(g.dragon.state);
      fire ||= g.shots.some((s) => s.fire);
      frost ||= g.shots.some((s) => !!s.chill);
      if (g.dragon.on) high = Math.max(high, g.dragon.headY);
    }
    return { pillars: g.dragon.pillars, risen: g.dragon.risen, seen: [...seen], fire, frost, high: high > 1.2 };
  });
  expect(first).toMatchObject({ pillars: 4, risen: true, fire: true, frost: true, high: true }); // (a plain room: it raised four)
  expect(first.seen).toEqual(expect.arrayContaining(['arrive', 'coiled', 'windBreath', 'breath', 'travel']));
  // a glyph at the foot of its pillar knocks it down: it lies open a while (half again of each blow, and it hurts to touch), then climbs back
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2;
    for (let k = 0; k < 200 && !(g.dragon.on && g.dragon.state === 'coiled'); k++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
    }
    g.sim(0.45);
  });
  await page.keyboard.press('Space');
  const knocked = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2,
      e = g.enemies.find((f) => f.isBoss) as Boss,
      i = g.enemies.indexOf(e);
    g.sim(0.05);
    const gl = g.glyphs[0];
    gl.x = e.x;
    gl.z = e.z;
    gl.fuse = 0.01;
    g.sim(0.1);
    const fell = g.dragon.state;
    for (let k = 0; k < 30 && e.state !== 'down'; k++) g.sim(0.05);
    const down = { state: e.state, contact: e.contact, low: g.dragon.headY < 0.6 };
    const hp0 = e.hp;
    g.hit(i, 4);
    const open = hp0 - e.hp;
    for (let k = 0; k < 200 && !g.dragon.on; k++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
    }
    return { fell, down, open, back: g.dragon.on };
  });
  expect(knocked).toMatchObject({ fell: 'fall', down: { state: 'down', contact: 2, low: true }, back: true });
  expect(knocked.open).toBeCloseTo(6);
  // in the belfry, a bell rung knocks it down too; then the fight to the end
  errors.push(await start(page, '?room=boss_belfry&boss=dragon&floor=5&seed=BOSS5'));
  const belfry = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as G2;
    g.warp(1);
    g.sim(0.7, true);
    for (let k = 0; k < 200 && !(g.dragon.on && g.dragon.state === 'coiled'); k++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
    }
    const bell = g.props.filter((p) => p.kind === 'bell').sort((a, b) => b.x - a.x)[0];
    g.player.x = bell.x - 1;
    g.player.z = bell.z;
    g.keys.add('ArrowRight');
    g.arrowOrder.push('ArrowRight');
    g.sim(0.1);
    g.keys.delete('ArrowRight');
    g.arrowOrder.length = 0;
    const seen = new Set<string>();
    for (let k = 0; k < 12; k++) {
      g.sim(0.05);
      seen.add(g.dragon.state);
    }
    const rang = (g.props.find((p) => p.kind === 'bell' && p.x === bell.x && p.z === bell.z)?.cd ?? 0) > 0; // (props are read afresh)
    const boss = g.enemies.find((f) => f.isBoss) as Boss;
    let called = false,
      seconds = 0;
    for (; seconds < 240 && g.enemies.length; seconds += 0.25) {
      w.__fight(0.25);
      called ||= !!boss.summoned;
    }
    g.sim(0.5);
    return { rang, fell: seen.has('fall'), seconds, called, left: g.enemies.length, cleared: g.current.cleared };
  });
  console.log(`dragon beaten in ${belfry.seconds.toFixed(1)} s of game time`);
  expect(belfry).toMatchObject({ rang: true, fell: true, called: true, left: 0, cleared: true });
  for (const e of errors) expect(e).toEqual([]);
});

test('the Twin Guardians wake together; one strikes while the other shields it, bolts glancing off; they trade the shield; when one falls the other rages; one reward for both', async ({
  page,
}) => {
  const errors = await start(page, '?room=boss_open&boss=twins&floor=4&seed=BOSS6');
  type Twin = Foe & {
    type: string;
    state: string;
    hp: number;
    maxHp: number;
    contact: number;
    role?: string;
    glance?: boolean;
    rage?: boolean;
    ward?: object;
    summoned?: boolean;
  };
  type G2 = GameHooks & { hit(i: number, dmg: number, school?: string, by?: string): number };
  const woke = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2;
    g.warp(1);
    g.sim(0.7, true);
    const twins = g.enemies.filter((f) => f.isBoss) as Twin[],
      still = twins.map((t) => [t.state, t.contact]);
    g.sim(1);
    const stay = twins.map((t) => t.state);
    g.player.x = twins[0].x;
    g.player.z = twins[0].z + 2.4;
    g.sim(1.2);
    const shield = twins.find((t) => t.role === 'shield')!,
      strike = twins.find((t) => t.role === 'strike')!,
      si = g.enemies.indexOf(shield),
      ki = g.enemies.indexOf(strike);
    const out: Record<string, unknown> = {
      n: twins.length,
      still,
      stay,
      states: twins.map((t) => t.state).sort(),
      warded: !!shield.ward && !strike.ward,
      glance: [shield.glance, strike.glance],
    };
    const s0 = shield.hp;
    g.hit(si, 5, undefined, 'cantrip');
    out.glanced = s0 - shield.hp; // (bolts glance off the shielding twin)
    g.hit(si, 5, 'ember', 'spell');
    out.drunk = s0 - shield.hp; // (its ward drinks spells)
    const k0 = strike.hp;
    g.hit(ki, 5, undefined, 'cantrip');
    out.struck = k0 - strike.hp;
    const fill = parseFloat((document.querySelector('#bossbar .fill') as HTMLElement).style.width);
    out.bar = Math.abs(fill - ((shield.hp + strike.hp) / (shield.maxHp + strike.maxHp)) * 100) < 0.01; // (one bar for both)
    for (let k = 0; k < 240 && shield.role === 'shield'; k++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
    }
    out.traded = [shield.role, strike.role, !!strike.ward];
    // one falls: the other rages, and the fight isn't over
    const fall = g.enemies.indexOf(shield);
    g.hit(fall, 9999);
    g.sim(0.1);
    out.rage = {
      left: g.enemies.filter((f) => f.isBoss).length,
      rage: strike.rage,
      glance: strike.glance,
      ward: !!strike.ward,
      cleared: g.current.cleared,
    };
    return out;
  });
  expect(woke).toMatchObject({
    n: 2,
    still: [
      ['statue', 0],
      ['statue', 0],
    ],
    stay: ['statue', 'statue'],
    warded: true,
    glance: [true, false],
    glanced: 0,
    drunk: 0,
    struck: 5,
    bar: true,
    traded: ['strike', 'shield', true],
  });
  expect(woke.states).toEqual(['guard', 'stalk']);
  expect(woke.rage).toEqual({ left: 1, rage: true, glance: false, ward: false, cleared: false });
  const fight = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as G2,
      last = g.enemies.find((f) => f.isBoss) as Twin,
      states = new Set<string>();
    let seconds = 0;
    for (; seconds < 240 && g.enemies.length; seconds += 0.25) {
      w.__fight(0.25);
      states.add(last.state);
    }
    g.sim(0.5);
    return {
      seconds,
      states: [...states],
      left: g.enemies.length,
      cleared: g.current.cleared,
      choice: (g.current as RoomView & { spots: unknown[] }).spots.length,
    };
  });
  console.log(`the last twin beaten in ${fight.seconds.toFixed(1)} s; states seen: ${fight.states.join(', ')}`);
  expect(fight).toMatchObject({ left: 0, cleared: true, choice: 2 }); // (the reward once, for the pair)
  expect(fight.states).toEqual(expect.arrayContaining(['stalk', 'windSlam', 'windGaze', 'gaze']));
  expect(errors).toEqual([]);
});

test("the Hollow Warden wears the Owlbear, its shots in Hallow's light, and can be beaten", async ({ page }) => {
  type Boss = Foe & {
    type: string;
    state: string;
    summoned?: boolean;
    mats: unknown[];
    eye?: object;
    ring?: object;
    halo?: object;
    model: { traverse(f: (o: { isMesh?: boolean; isSprite?: boolean; isPoints?: boolean }) => void): void };
  };
  type G2 = GameHooks & { bossLooks(): { id: string }[]; shots: { color: number }[] };
  const errors = await start(page, '?room=boss_open&boss=warden&seed=BOSS7');
  const seen = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2;
    g.warp(1);
    g.sim(0.1, true);
    const e = g.enemies.find((f) => f.isBoss) as Boss;
    let meshes = 0;
    e.model.traverse((o) => {
      if (o.isMesh || o.isSprite || o.isPoints) meshes++;
    });
    for (let i = 0; i < 300 && !g.shots.length; i++) {
      g.player.hp = g.player.maxHp;
      g.sim(0.05);
    }
    return {
      type: e.type,
      parts: !!(e.eye && e.ring && e.halo),
      lit: e.mats.length > 0,
      meshes,
      colors: [...new Set(g.shots.map((s) => s.color))],
    };
  });
  expect(seen).toMatchObject({ type: 'warden', parts: true, lit: true, colors: [0xffd878] }); // (SCHOOL_LIGHT.hallow)
  expect(seen.meshes).toBeLessThanOrEqual(30); // (its still parts merged: about a dozen draw calls, not a hundred)
  // it fights to the end: it walks, bursts rings, fires volleys, calls the floor's walkers, and falls
  const fight = await page.evaluate(() => {
    const w = window as unknown as W,
      g = w.__game as G2;
    const foe = g.enemies.find((e) => e.isBoss) as Boss;
    const states = new Set<string>();
    let called = false,
      seconds = 0;
    for (; seconds < 240 && g.enemies.length; seconds += 0.25) {
      w.__fight(0.25);
      states.add(foe.state);
      called ||= !!foe.summoned;
    }
    g.sim(0.5);
    return { states: [...states].sort(), called, left: g.enemies.length, cleared: g.current.cleared };
  });
  expect(fight).toMatchObject({ called: true, left: 0, cleared: true });
  expect(fight.states).toEqual(expect.arrayContaining(['walk', 'windAim', 'windBurst', 'volley']));
  // the dev menu's gallery stands every boss built in code
  const ids = await page.evaluate(() => {
    const g = (window as unknown as W).__game as G2,
      ids = g.bossLooks().map((o) => o.id);
    g.sim(0.2, true);
    return ids;
  });
  expect(ids).toEqual(['warden', 'abbess', 'pyre', 'hart', 'angler', 'tiger', 'dragon', 'twins', 'serpent', 'kaelith']); // (the bosses of floors 2 and 3, remade in code; of floors 4 and 5; the Eda lore's; the jelly serpent; and Kaelith's two looks)
  expect(errors).toEqual([]);
});

test(
  "the Seal: floor 5 has its waystone room and leads down to the Seal, a level of three rooms; Kaelith speaks on arrival; the Last Hall's two waves come from every floor; its boss's fall opens the way out, and taking it wins the run",
  { tag: '@fast' },
  async ({ page }) => {
    const errors = await start(page, '?floor=5&seed=SEAL1');
    const five = await page.evaluate<{ floor: number; stone: boolean }>(
      `(() => { const g = window.__game; return { floor: g.floor, stone: g.rooms().some(r => r.type === 'waystone') }; })()`,
    );
    expect(five).toEqual({ floor: 4, stone: true }); // (floor 5's boss has a waystone room before the way down)
    const r = await page.evaluate<{
      arrive: { floor: number; banner: string; rooms: string[]; said: string; look: string };
      hall: string;
      kinds: string[];
      waves: string;
      cleared: boolean;
      boss: string;
      out: string;
      kind: string;
      stepped: string;
      state: string;
      end: string;
    }>(`(() => {
    const g = window.__game, P = g.player; P.invuln = 999; g.descend(); g.sim(.1);
    const said = new Set(); for (let t = 0; t < 30; t++) { said.add(document.getElementById('toast').textContent); g.sim(.25); }
    const arrive = { floor: g.floor, banner: document.querySelector('#banner .t').textContent, rooms: g.rooms().map(r => r.type + ':' + r.plan.shape), map: g.map(), said: [...said].join(' | '), look: g.current.look?.name };
    g.warp(g.rooms().find(r => r.plan.templateId === 'seal_last_hall').plan.id); g.sim(.2); const hall = new Set(); for (let t = 0; t < 12; t++) { hall.add(document.getElementById('toast').textContent); g.sim(.25); }
    const kinds = new Set(), seen = new Set(), total = g.current.waves.length;
    // (each wave is struck down through the game's own hook rather than fought: a foe hiding or still rising takes no blow, so
    // a fight could stall on one; the wave is read after the steps too, as the last can come and fall within one pass)
    for (let k = 0; k < 400 && !g.current.cleared; k++) {
      seen.add(g.current.wave);
      g.enemies.forEach((e, i) => { if (e.dead) return; kinds.add(e.type); Object.assign(e, { hidden: false, spawn: 0, ward: undefined, glance: false }); g.hit(i, 9999); });
      g.sim(.25); seen.add(g.current.wave);
    }
    const waves = seen.size + ':' + total;
    const cleared = g.current.cleared;
    g.warp(g.rooms().find(r => r.plan.templateId === 'seal_kaelith').plan.id); g.sim(.3); const boss = g.enemies.find(e => e.isBoss)?.type; g.clearRoom(); g.sim(.5);
    const out = g.wayDown; P.x = out.x; P.z = out.z; g.sim(.5); const stepped = g.state;
    g.sim(7);
    return { arrive, hall: [...hall].join(' | '), kinds: [...kinds], waves, cleared, boss, out: out.room, kind: out.kind, stepped, state: g.state, end: document.getElementById('endTitle').textContent };
  })()`);
    expect(r.arrive).toMatchObject({
      floor: 5,
      banner: 'The Seal',
      rooms: ['start:standard', 'ordeal:great', 'boss:great'],
      look: 'seal',
    });
    expect(r.arrive.said).toContain('Kaelith: "Go back up, mage.');
    expect(r.hall).toContain('The horde presses against the seal');
    expect(r.waves).toBe('2:2');
    expect(r.cleared).toBe(true);
    const FOES = JSON.parse(readFileSync('data/foes.json', 'utf8')) as Record<string, { floor: number }>;
    expect(new Set(r.kinds.map((k) => FOES[k]?.floor)).size).toBeGreaterThanOrEqual(2); // (the horde from every floor)
    expect(r.boss).toBe('kaelith');
    expect(r.out).toBe('boss'); // (Kaelith, the Seal's boss)
    expect(r).toMatchObject({ kind: 'shaft', stepped: 'daylight', state: 'end', end: 'Into the daylight' }); // (its way out is daylight, then the run is won)
    expect(errors).toEqual([]);
  },
);

test('Kaelith: the Sentinel stalks, sweeps, fires and steps through shadow; at two thirds the seal cracks, four wards wake in the schools the mage holds and the horde comes out, and with all four shut it reels open; at a third the last light falls and the black sun draws the mage in, but not beside a lit candle; it kneels, and the way out wins the run', async ({
  page,
}) => {
  const errors = await start(page, '?floor=6&seed=KAE1&spells=cinder_lance,arc');
  type K = {
    phase: number;
    state: string;
    guard: number;
    hidden: boolean;
    wards: { x: number; z: number; school: string | null; shut: boolean }[];
    pulling: boolean;
    safe: boolean;
    sun: boolean;
  } | null;
  const r = await page.evaluate<{
    bar: number;
    banner1: string;
    states: string[];
    p1: K;
    banner2: string;
    p2: K;
    hit: number;
    horde: number;
    reel: K;
    banner3: string;
    pulled: number;
    held: { moved: number; safe: boolean };
    p3: K;
    fell: { kaelith: K; banner: string; way: { room: string; kind: string }; clear: number };
    state: string;
  }>(`(() => {
    const g = window.__game, P = g.player; P.invuln = 999;
    g.warp(g.rooms().find(r => r.plan.templateId === 'seal_kaelith').plan.id); P.x = g.current.cx; P.z = g.current.cz + 3.5; g.sim(1, true);
    const bar = document.querySelectorAll('#bossbar .mark').length, banner1 = document.querySelector('#banner .t').textContent;
    const states = new Set(); for (let t = 0; t < 60; t++) { P.hp = P.maxHp; g.sim(.25); states.add(g.kaelith.state); }
    if (!states.has('sink')) { const k = g.enemies.find(e => e.isBoss); k.state = 'sink'; k.st = .5; for (let t = 0; t < 12; t++) { P.hp = P.maxHp; g.sim(.25); states.add(g.kaelith.state); } } // (its step waits on where its circling leaves it standing dark; if none came, it steps now)
    const p1 = g.kaelith;
    g.kaelithToPhase(2); g.sim(.2, true); const banner2 = document.querySelector('#banner .t').textContent;
    g.sim(3); const p2 = g.kaelith, hit = (() => { const i = g.enemies.findIndex(e => e.isBoss), e = g.enemies[i], h = e.hp; g.hit(i, 10, 'ember'); return h - e.hp; })();
    for (let t = 0; t < 30; t++) { P.hp = P.maxHp; g.sim(.25); }
    const horde = g.enemies.filter(e => !e.dead && !e.isBoss).length;
    const KIND = { ember: 'burn', frost: 'chill', storm: 'shock', hallow: 'sanct', umbral: 'hex' };
    for (const w of g.kaelith.wards) g.element(KIND[w.school], w.x, w.z);
    g.sim(.1); const reel = g.kaelith;
    g.kaelithToPhase(3); g.sim(.2, true); const banner3 = document.querySelector('#banner .t').textContent;
    // the pull: away from the candles it draws the mage in; beside a lit stand it doesn't
    const stands = g.props.filter(p => p.kind === 'candles');
    const boss = () => g.enemies.find(e => e.isBoss);
    const pulled = (() => { const b = boss(); P.x = g.current.cx + 6; P.z = g.current.cz; b.state = 'pull'; b.st = 1.5; const d0 = Math.hypot(P.x - b.x, P.z - b.z); g.sim(.5); return d0 - Math.hypot(P.x - b.x, P.z - b.z); })();
    for (const s of stands) g.element('burn', s.x, s.z);
    const held = (() => { const b = boss(), s = stands[0]; P.x = s.x + .8; P.z = s.z; b.state = 'pull'; b.st = 1.5; const x0 = P.x, z0 = P.z; g.sim(.5); return { moved: Math.hypot(P.x - x0, P.z - z0), safe: g.kaelith.safe }; })();
    const p3 = g.kaelith;
    const i = g.enemies.findIndex(e => e.isBoss); g.enemies[i].hidden = false; g.hit(i, 99999, 'hallow'); g.sim(1, true);
    const fell = { kaelith: g.kaelith, banner: document.querySelector('#banner .t').textContent, way: g.wayDown, clear: Math.hypot(g.kaelithKnelt.x - g.wayDown.x, g.kaelithKnelt.z - g.wayDown.z) };
    P.x = fell.way.x; P.z = fell.way.z; g.sim(.5);
    return { bar, banner1, states: [...states], p1, banner2, p2, hit, horde, reel, banner3, pulled, held, p3, fell, state: g.state };
  })()`);
  expect(r.bar).toBe(2);
  expect(r.banner1).toBe('Kaelith'); // (its bar marks the phases)
  expect(r.p1!.phase).toBe(1);
  expect(r.states).toEqual(expect.arrayContaining(['stalk', 'windSweep', 'windVolley', 'sink', 'gone', 'rise']));
  expect(r.banner2).toBe('The seal cracks');
  expect(r.p2!.phase).toBe(2);
  expect(r.p2!.guard).toBe(0.25);
  expect(r.p2!.wards.map((w) => w.school).sort()).toEqual(['ember', 'frost', 'hallow', 'storm']); // (Cinder Lance and Arc held: Ember and Storm, then Hallow, then Frost)
  expect(r.hit).toBeGreaterThan(0);
  expect(r.hit).toBeLessThan(5); // (a quarter of the blow, holding the seal)
  expect(r.horde).toBeGreaterThan(0);
  expect(r.reel!.wards.every((w) => w.shut)).toBe(true);
  expect(r.reel).toMatchObject({ state: 'reel', guard: 1.5 });
  expect(r.banner3).toBe('The last light');
  expect(r.p3).toMatchObject({ phase: 3, sun: true });
  expect(r.pulled).toBeGreaterThan(0.3);
  expect(r.held.safe).toBe(true);
  expect(r.held.moved).toBeLessThan(0.15);
  expect(r.fell).toMatchObject({ kaelith: null, banner: 'The seal holds', way: { room: 'boss', kind: 'shaft' } });
  expect(r.fell.clear).toBeGreaterThan(3); // (it kneels clear of the way out)
  expect(r.state).toBe('daylight'); // (the way out is a shaft of daylight)
  expect(errors).toEqual([]);
});

test("daylight: Kaelith's way out is a shaft of light; stepping into it, the mage walks out of the cave onto a terrace over the valleys at dawn as the rock opens, the HUD away, the end screen laid over it with the won text, and a new run takes it away; the dev menu steps into it from anywhere", async ({
  page,
}) => {
  const errors = await start(page, '?floor=6&seed=DAWN1');
  type D = {
    on: boolean;
    shaft: boolean;
    t?: number;
    lift?: number;
    ended?: boolean;
    walking?: boolean;
    mage?: { x: number; z: number };
  };
  const r = await page.evaluate<{
    way: { kind: string; room: string };
    said: string;
    hud: string;
    start: { state: string; day: D };
    mid: D;
    out: D;
  }>(`(() => {
    const g = window.__game, P = g.player; P.invuln = 999;
    g.warp(g.rooms().find(r => r.plan.templateId === 'seal_kaelith').plan.id); g.sim(.5); g.clearRoom(); g.sim(1);
    const way = g.wayDown, said = new Set();
    for (let t = 0; t < 60; t++) { said.add(document.getElementById('toast').textContent); g.sim(.25); }
    P.x = way.x; P.z = way.z + .3; g.sim(.2);
    const hud = getComputedStyle(document.getElementById('hud')).display;
    const start = { state: g.state, day: g.daylight };
    g.sim(1.6, true); const mid = g.daylight;
    g.sim(2, true); const out = g.daylight;
    return { way, said: [...said].join(' | '), hud, start, mid, out };
  })()`);
  // the frame as drawn (a screenshot, read on a plain canvas): the sky above bright and warm, where the Seal was dark
  const shot = (await page.screenshot()).toString('base64');
  const sky = await page.evaluate(async (b64) => {
    const im = new Image();
    im.src = 'data:image/png;base64,' + b64;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = im.height;
    const x = c.getContext('2d')!;
    x.drawImage(im, 0, 0);
    const d = x.getImageData(
      Math.round(im.width * 0.6),
      Math.round(im.height * 0.25),
      Math.round(im.width * 0.2),
      Math.round(im.height * 0.1),
    ).data;
    const m = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) m[k] += d[i + k];
    return m.map((v) => Math.round(v / (d.length / 4)));
  }, shot);
  const end = await page.evaluate<{
    state: string;
    title: string;
    text: string;
    shown: boolean;
    day: boolean;
    calls: number;
  }>(`(() => {
    const g = window.__game;
    g.sim(4); const end = { state: g.state, title: document.getElementById('endTitle').textContent, text: document.getElementById('endText').textContent, shown: !document.getElementById('scrEnd').classList.contains('hidden'), day: g.daylight.on, calls: g.renderInfo().calls };
    return end;
  })()`);
  expect(r.way).toMatchObject({ kind: 'shaft', room: 'boss' });
  expect(r.said).toContain('Daylight falls where Kaelith knelt');
  expect(r.start.state).toBe('daylight');
  expect(r.start.day).toMatchObject({ on: true, walking: true });
  expect(r.hud).toBe('none');
  expect(r.mid.lift!).toBeGreaterThan(0.3);
  expect(r.mid.lift!).toBeLessThan(1);
  expect(r.out).toMatchObject({ lift: 1, walking: false, ended: false }); // (out at the edge, the view open, the end screen not yet)
  expect(sky[0]).toBeGreaterThan(120);
  expect(sky[0]).toBeGreaterThan(sky[2] - 30); // (a bright dawn sky, warm)
  expect(end).toMatchObject({ state: 'end', title: 'Into the daylight', shown: true, day: true });
  expect(end.text).toContain('Kaelith knelt');
  expect(end.calls).toBeLessThan(160);
  await page.screenshot({ path: 'test-results/daylight-end.png' });
  // a new run takes the daylight away; the dev menu brings it back from anywhere
  await page.click('#btnAgain');
  const again = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as { state: string; daylight: D; sim(s: number): void };
    g.sim(0.3);
    return { state: g.state, day: g.daylight.on, cls: document.body.classList.contains('daylight') };
  });
  expect(again).toEqual({ state: 'play', day: false, cls: false });
  await page.keyboard.press('F2');
  await page.locator('#dev .dv-tab', { hasText: 'Rooms' }).click();
  await page.locator('#dev .dv-page:not([hidden]) button', { hasText: 'Daylight now' }).click();
  const dev = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as { state: string; daylight: D; sim(s: number): void };
    g.sim(0.5);
    return { state: g.state, day: g.daylight };
  });
  expect(dev.state).toBe('daylight');
  expect(dev.day.on).toBe(true);
  expect(errors).toEqual([]);
});
