import { expect, test } from '@playwright/test';
import { type RoomView, type W, start } from './helpers';

test(
  "the Vigil as a place: the first waking is dark until its candle lights itself; three rooms with nothing to fight; the lectern puts learned spells in hand and keeps them; the six barred ways say what bars them and stir at their own school; no glyphs; the boat goes down to floor 1; a run's end and the title lead back to it",
  { tag: '@fast' },
  async ({ page }) => {
    const errors = await start(page, '?vigil=first&seed=VIGL1');
    type VP = {
      here: boolean;
      room: string | null;
      first: boolean;
      candles: number;
      slots: (string | null)[];
      lectern: { x: number; z: number; open: boolean; entries: string[]; hands: (string | null)[] };
      boat: { x: number; z: number; boarded: boolean };
      bars: { school: string; x: number; z: number; said: boolean; stirred: boolean; open: boolean }[];
    };
    type VG = {
      vigilPlace: VP;
      vigil: { candle: boolean; slots: (string | null)[]; runs: number };
      know(id: string, s: string): void;
      sim(s: number, d?: boolean): void;
      warp(i: number): void;
      mana(n: number): void;
      cast(slot: number, dir?: { x: number; z: number }): void;
      player: { x: number; z: number; spells: (string | null)[]; glyphs: number };
      enemies: unknown[];
      rooms(): RoomView[];
      state: string;
      current: RoomView;
      lightLevels?: unknown;
    };
    const wake = await page.evaluate(() => {
      const g = (window as unknown as { __game: VG }).__game,
        at0 = { ...g.vigilPlace, dark: document.body.classList.contains('vigil') };
      g.sim(0.5);
      const before = g.vigilPlace.candles;
      g.sim(5);
      return {
        at0,
        before,
        after: g.vigilPlace.candles,
        kept: g.vigil.candle,
        enemies: g.enemies.length,
        open:
          g.rooms().every((r) => r.cleared) &&
          g
            .rooms()
            .flatMap((r) => r.doors)
            .filter((d) => !d.open).length === 12, // (every door open but the six barred ways, from both sides)
        hud: getComputedStyle(document.getElementById('vigilHud')!).display,
        hearts: getComputedStyle(document.getElementById('hearts')!).display,
        hudText: document.getElementById('vigilHud')!.textContent,
      };
    });
    expect(wake.at0).toMatchObject({ here: true, room: 'crypt', first: true, candles: 0, dark: true });
    expect(wake.before).toBe(0);
    expect(wake.after).toBe(1);
    expect(wake.kept).toBe(true);
    expect(wake).toMatchObject({ enemies: 0, open: true, hud: 'flex', hearts: 'none' });
    expect(wake.hudText).toContain('Arcane Dust');
    await page.screenshot({ path: 'test-results/vigil-crypt.png' });
    // the lectern: walked up to, it opens; Q puts the chosen spell in hand, and the choice is kept
    const lec = await page.evaluate(() => {
      const g = (window as unknown as { __game: VG }).__game;
      g.know('arc', 'learned');
      g.know('rime_shards', 'learned');
      const l = g.vigilPlace.lectern;
      g.player.x = l.x;
      g.player.z = l.z + 0.7;
      g.sim(0.2);
      return g.vigilPlace.lectern;
    });
    expect(lec.open).toBe(true);
    expect(lec.entries).toEqual(['Q: empty', 'E: empty', 'Rime Shards', 'Arc']);
    await page.keyboard.press('KeyQ'); // (the first spell offered is chosen)
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('KeyE');
    await page.screenshot({ path: 'test-results/vigil-lectern.png' });
    await page.keyboard.press('Escape');
    const hands = await page.evaluate(() => {
      const g = (window as unknown as { __game: VG }).__game;
      return { state: g.state, spells: [...g.player.spells], kept: g.vigil.slots, open: g.vigilPlace.lectern.open };
    });
    expect(hands).toEqual({ state: 'play', spells: ['rime_shards', 'arc'], kept: ['rime_shards', 'arc'], open: false });
    // a barred way: walked up to, it says what bars it; struck by another school, it stirs and holds (its own opens it)
    const bar = await page.evaluate(() => {
      const g = (window as unknown as { __game: VG }).__game;
      g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_nave')!.plan.id);
      g.sim(0.6);
      const b = g.vigilPlace.bars.find((x) => x.school === 'storm')!;
      g.player.x = b.x;
      g.player.z = b.z + 1.3;
      g.sim(0.3);
      g.mana(100);
      g.cast(0, { x: 0, z: -1 });
      g.sim(1); // (Rime Shards: Frost)
      return g.vigilPlace.bars.find((x) => x.school === 'storm');
    });
    expect(bar).toMatchObject({ said: true, stirred: true, open: false });
    // no glyphs at the Vigil: the chalk won't take
    await page.keyboard.press('Space');
    expect(
      await page.evaluate(() => {
        (window as unknown as { __game: VG }).__game.sim(0.1);
        return document.getElementById('toast')!.textContent;
      }),
    ).toContain('chalk will not take');
    // the boat: stepped into from the jetty, down to floor 1, empty-handed
    const down = await page.evaluate(() => {
      const g = (window as unknown as { __game: VG }).__game;
      g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_landing')!.plan.id);
      g.sim(0.6);
      const b = g.vigilPlace.boat;
      g.player.x = b.x;
      g.player.z = b.z;
      g.sim(0.2);
      const t = g as unknown as { talkNow: { open: boolean; who?: string }; closeTalk(): void }; // (the Ferryman's first word, the first time at the jetty)
      if (t.talkNow.open && t.talkNow.who === 'ferryman') {
        t.closeTalk();
        g.sim(0.2);
      }
      const boarded = g.vigilPlace.boat.boarded;
      g.sim(2.5);
      return {
        boarded,
        state: g.state,
        here: g.vigilPlace.here,
        floor: (g as unknown as { floor: number }).floor,
        type: g.current.type,
        spells: [...g.player.spells],
        cls: document.body.classList.contains('vigil'),
      };
    });
    expect(down).toEqual({
      boarded: true,
      state: 'play',
      here: false,
      floor: 0,
      type: 'start',
      spells: [null, null],
      cls: false,
    });
    // the run ends: the end screen leads back to the Vigil, the candle still lit, the lectern's spells in hand
    await page.evaluate(() => {
      const g = (
          window as unknown as {
            __game: VG & { spawn(k: string): { x: number; z: number }; player: { hp: number; invuln: number } };
          }
        ).__game,
        P = g.player;
      const foe = g.spawn('sporeling');
      P.hp = 1;
      P.invuln = 0;
      for (let t = 0; t < 120 && g.state !== 'end'; t++) {
        foe.x = P.x + 0.3;
        foe.z = P.z;
        P.invuln = Math.min(P.invuln, 0.05);
        g.sim(0.25);
      }
    });
    expect(await page.textContent('#btnAgain')).toBe('Wake at the Vigil');
    await page.click('#btnAgain');
    const back = await page.evaluate(() => {
      const g = (window as unknown as { __game: VG }).__game;
      g.sim(0.5);
      return {
        here: g.vigilPlace.here,
        room: g.vigilPlace.room,
        first: g.vigilPlace.first,
        candles: g.vigilPlace.candles,
        spells: [...g.player.spells],
      };
    });
    expect(back).toEqual({ here: true, room: 'crypt', first: false, candles: 1, spells: ['rime_shards', 'arc'] });
    // the title leads there, once a run has been played
    await page.goto('/?seed=VIGTTL&autolevel=skip');
    await page.waitForFunction(() => !!(window as unknown as W).__game, null, { timeout: 30_000 });
    expect(await page.textContent('#btnStart')).toBe('Wake at the Vigil');
    await page.click('#btnStart');
    expect(
      await page.evaluate(() => {
        const g = (window as unknown as { __game: VG }).__game;
        g.sim(0.3);
        return { state: g.state, here: g.vigilPlace.here };
      }),
    ).toEqual({ state: 'play', here: true });
    // the dev menu wakes the mage there from anywhere
    await page.keyboard.press('F2');
    await page.locator('#dev .dv-tab', { hasText: 'Rooms' }).click();
    await expect(page.locator('#dev .dv-page:not([hidden]) .dv-info', { hasText: 'In the crypt' })).toBeVisible();
    expect(errors).toEqual([]);
  },
);

test("chained shades: one lies in a secret room, chained by schools the mage can land; its chains break to their schools; loose, it asks: Q frees it to the Vigil (a candle more), E binds it; one at an ordeal's end waits until the fight is won; a bound shade walks with the next run and helps", async ({
  page,
}) => {
  type SI = {
    id: string;
    room: number;
    type: string;
    x: number;
    z: number;
    state: string;
    asking: boolean;
    chains: { ward: string | null; broken: boolean }[];
  } | null;
  type SG = {
    shade: SI;
    shadeHere(id: string): void;
    blast(x: number, z: number): void;
    sim(s: number, d?: boolean): void;
    warp(i: number): void;
    openSecret(): void;
    mana(n: number): void;
    cast(slot: number, dir?: { x: number; z: number }): void;
    clearRoom(): void;
    player: { x: number; z: number; invuln: number; spellCd: number[]; spells: (string | null)[] };
    vigil: { freed: string[]; bound: string[] };
    run: { freed: string[]; walking: string[] };
    shadeHelp: { walking: string[]; acted: Record<string, number> };
    state: string;
    current: RoomView;
    walkWith(id: string): void;
  };
  const errors = await start(page, '?seed=SHADEB&spells=hex_bolt,cinder_lance');
  // the floor's shade lies in its secret room; found, its chains are drawn from the hex bolt and the lance
  const found = await page.evaluate(() => {
    const g = (window as unknown as { __game: SG }).__game,
      s0 = g.shade!;
    g.openSecret();
    g.warp(s0.room);
    g.sim(0.6);
    return { s0, s1: g.shade, toast: document.getElementById('toast')!.textContent };
  });
  expect(found.s0).toMatchObject({ id: 'sexton', type: 'secret', state: 'waiting' });
  expect(found.s1!.state).toBe('chained');
  expect(found.s1!.chains.map((c) => c.ward).sort()).toEqual(['ember', 'umbral']);
  // its chains break to their schools: the lance and the hex bolt, cast at it
  const freed = await page.evaluate(() => {
    const g = (window as unknown as { __game: SG }).__game,
      s = g.shade!,
      P = g.player;
    P.invuln = 999;
    P.x = s.x;
    P.z = s.z + 2.2;
    g.sim(0.1);
    const after: string[] = [];
    for (const slot of [0, 1]) {
      g.mana(100);
      P.spellCd = [0, 0];
      g.cast(slot, { x: 0, z: -1 });
      g.sim(0.8);
      after.push(
        g
          .shade!.chains.filter((c) => c.broken)
          .map((c) => c.ward)
          .join(),
      );
    }
    P.z = s.z + 1.1;
    g.sim(0.3);
    const asked = { ...g.shade!, prompt: document.getElementById('prompt')!.textContent };
    return { after, asked };
  });
  expect(freed.after[1].split(',').sort()).toEqual(['ember', 'umbral']);
  expect(freed.asked).toMatchObject({ state: 'loose', asking: true });
  expect(freed.asked.prompt).toContain('free it');
  expect(freed.asked.prompt).toContain('bind it');
  await page.screenshot({ path: 'test-results/shade-loose.png' });
  await page.keyboard.press('KeyQ');
  const up = await page.evaluate(() => {
    const g = (window as unknown as { __game: SG }).__game;
    g.sim(3);
    return { state: g.shade!.state, saved: g.vigil.freed, run: g.run.freed };
  });
  expect(up).toEqual({ state: 'gone', saved: ['sexton'], run: ['sexton'] });
  // another, here: a glyph's blast breaks every chain; E binds it
  const bound = await page.evaluate(() => {
    const g = (window as unknown as { __game: SG }).__game,
      P = g.player;
    g.shadeHere('scribe');
    g.sim(0.3);
    const s = g.shade!;
    g.blast(s.x, s.z);
    g.sim(0.2);
    P.x = s.x;
    P.z = s.z + 1.1;
    g.sim(0.3);
    return g.shade;
  });
  expect(bound).toMatchObject({ state: 'loose', asking: true });
  await page.keyboard.press('KeyE');
  expect(
    await page.evaluate(() => {
      const g = (window as unknown as { __game: SG }).__game;
      g.sim(1.2);
      return { state: g.shade!.state, bound: g.vigil.bound };
    }),
  ).toEqual({ state: 'gone', bound: ['scribe'] });
  // the end of the run: a shade freed brings Dust home; at the Vigil, a candle more burns
  await page.evaluate(() => {
    const g = (
        window as unknown as { __game: SG & { spawn(k: string): { x: number; z: number }; player: { hp: number } } }
      ).__game,
      P = g.player;
    const foe = g.spawn('sporeling');
    P.hp = 1;
    P.invuln = 0;
    for (let t = 0; t < 120 && g.state !== 'end'; t++) {
      foe.x = P.x + 0.3;
      foe.z = P.z;
      P.invuln = Math.min(P.invuln, 0.05);
      g.sim(0.25);
    }
  });
  expect(await page.textContent('#endHome')).toContain('A shade freed');
  await page.click('#btnAgain');
  expect(
    await page.evaluate(() => {
      const g = (window as unknown as { __game: SG & { vigilPlace: { candles: number } } }).__game;
      g.sim(3);
      return g.vigilPlace.candles;
    }),
  ).toBe(2); // (the first waking: its own candle, and one for the shade freed)
  // the boat down: the bound scribe walks with this run (and is bound no longer); it turns the first shot aside
  const walk = await page.evaluate(() => {
    const g = (
      window as unknown as {
        __game: SG & { takeBoat(): void; shoot(x: number, z: number, dx: number, dz: number): void };
      }
    ).__game;
    g.takeBoat();
    g.sim(2.5);
    const P = g.player;
    P.invuln = 999;
    g.shoot(P.x + 2, P.z, -1, 0);
    g.sim(0.6);
    return {
      walking: g.run.walking,
      bound: g.vigil.bound,
      acted: g.shadeHelp.acted,
      toast: document.getElementById('toast')!.textContent,
    };
  });
  expect(walk.walking).toEqual(['scribe']);
  expect(walk.bound).toEqual([]);
  expect(walk.acted.turn).toBe(1);
  await page.screenshot({ path: 'test-results/shade-walks.png' });
  expect(errors).toEqual([]);
});

test("chained shades: one at an ordeal's end comes forth only once the fight is won; the dev menu shows the floor's", async ({
  page,
}) => {
  type SG = {
    shade: { type: string; room: number; state: string } | null;
    sim(s: number): void;
    warp(i: number): void;
    clearRoom(): void;
    current: { cleared: boolean };
  };
  const errors = await start(page, '?seed=SHADEC');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: SG }).__game,
      s = g.shade!;
    g.warp(s.room);
    g.sim(0.6);
    const during = g.shade!.state;
    g.clearRoom();
    g.sim(0.6);
    return { type: s.type, during, after: g.shade!.state };
  });
  expect(r).toEqual({ type: 'ordeal', during: 'waiting', after: 'chained' });
  await page.keyboard.press('F2');
  await page.locator('#dev .dv-tab', { hasText: 'Rooms' }).click();
  await expect(
    page.locator('#dev .dv-page:not([hidden]) .dv-info', { hasText: 'A forager of the valleys' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('townspeople: the freed stand round the Nave, each with something to say; walking up to one opens its talk, written out a little at a time, the game waiting; a choice sets its flag and leads on; after a death, the line names what struck; the Ferryman speaks at the jetty once; the dev menu makes any one talk', async ({
  page,
}) => {
  type Fig = { id: string; x: number; z: number; news: boolean; made: boolean; clip: string | null };
  type TN = {
    open: boolean;
    top?: boolean;
    who?: string;
    line?: string;
    text?: string;
    whole?: boolean;
    choices?: string[];
  };
  type TG = {
    rooms(): RoomView[];
    veteranSave(): void;
    toVigil(first?: boolean): void;
    sim(s: number, d?: boolean): void;
    warp(i: number): void;
    state: string;
    player: { x: number; z: number };
    town: {
      wear: string;
      figures: Fig[];
      ferryman: { clip: string } | null;
      ferry: { x: number; z: number; said: boolean } | null;
      heard: Record<string, number>;
      flags: Record<string, unknown>;
    };
    talkNow: TN;
    talkTo(id: string, m?: string | null): boolean;
    closeTalk(): void;
    importSave(t: string): string[];
  };
  const errors = await start(page, '?vigil=1&seed=VIGL2');
  const stood = await page.evaluate(() => {
    const g = (window as unknown as { __game: TG }).__game;
    g.veteranSave();
    g.toVigil(false);
    g.sim(3);
    return g.town.figures;
  });
  expect(stood.map((f) => f.id).sort()).toEqual([
    'bellringer',
    'chorister',
    'embalmer',
    'forager',
    'novice',
    'pilgrim',
    'scribe',
    'sexton',
    'stormcaller',
    'wizard',
  ]);
  expect(stood.every((f) => f.news)).toBe(true); // (each has its first to say: a glint over it)
  // each wears its model made in Tripo, at rest in its idle (docs/creatures.md: the Mixamo recipe), the Ferryman in his boat
  await page.waitForFunction(
    () => {
      const t = (window as unknown as { __game: TG }).__game.town;
      return t.figures.every((f) => f.made) && !!t.ferryman;
    },
    null,
    { timeout: 20000 },
  );
  const made = await page.evaluate(() => (window as unknown as { __game: TG }).__game.town);
  expect(made.wear).toBe('made');
  expect(made.figures.every((f) => f.clip === 'idle')).toBe(true);
  expect(made.ferryman).toMatchObject({ clip: 'idle' });
  // walking up to the scribe opens its talk, the line written out a little at a time while the game waits
  const met = await page.evaluate(() => {
    const g = (window as unknown as { __game: TG }).__game;
    g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_nave')!.plan.id);
    g.sim(0.6);
    const f = g.town.figures.find((x) => x.id === 'scribe')!;
    g.player.x = f.x;
    g.player.z = f.z + 1.8;
    g.sim(0.2);
    g.player.z = f.z + 0.9;
    g.sim(0.4);
    const at = { ...g.talkNow, state: g.state, clip: g.town.figures.find((x) => x.id === 'scribe')!.clip };
    g.sim(4);
    return { at, later: g.talkNow };
  });
  expect(met.at).toMatchObject({
    open: true,
    top: false,
    who: 'scribe',
    line: 'scribe.first',
    whole: false,
    state: 'pause',
    clip: 'talk',
  }); // (the scribe in the north row: the panel below)
  expect(met.later).toMatchObject({ whole: true, choices: ['Teach me what you remember.', 'The books are ash now.'] });
  await page.screenshot({ path: 'test-results/vigil-talk.png' });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  const reply = await page.evaluate(() => {
    const g = (window as unknown as { __game: TG }).__game;
    return { talk: g.talkNow, flags: g.town.flags };
  });
  expect(reply.talk).toMatchObject({ open: true, line: 'scribe.ash' });
  expect(reply.flags['scribe.ash']).toBe(true);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // (the whole line, then away)
  const after = await page.evaluate(() => {
    const g = (window as unknown as { __game: TG }).__game;
    g.sim(0.3);
    return {
      open: g.talkNow.open,
      state: g.state,
      news: g.town.figures.find((x) => x.id === 'scribe')!.news,
      heard: Object.keys(g.town.heard),
    };
  });
  expect(after).toMatchObject({ open: false, state: 'play', news: true });
  expect(after.heard).toEqual(expect.arrayContaining(['scribe.first', 'scribe.ash']));
  // after a death to the War-Tiger, the storm caller (its first heard) speaks of it once, then of what it knows
  const death = await page.evaluate(() => {
    const g = (window as unknown as { __game: TG }).__game;
    const echo = {
      seed: 'T1',
      won: false,
      floor: 3,
      room: 'boss',
      template: 'boss_plain',
      struck: 'tiger',
      carried: [],
      level: 4,
      dust: 30,
      obols: 1,
      felled: ['warden'],
    };
    const before = {
      seed: 'T0',
      won: false,
      floor: 2,
      room: 'normal',
      template: '',
      struck: 'sporeling',
      carried: [],
      level: 2,
      dust: 10,
      obols: 0,
      felled: ['warden'],
    };
    g.importSave(
      JSON.stringify({
        v: 1,
        runs: 2,
        deepest: 3,
        echoes: [echo, before],
        freed: ['stormcaller', 'sexton'],
        heard: { 'storm.first': 1, 'sexton.first': 2 },
      }),
    );
    g.toVigil(false);
    g.sim(0.5);
    g.talkTo('stormcaller');
    const tiger = g.talkNow;
    g.closeTalk();
    g.talkTo('sexton');
    const sexton = g.talkNow;
    g.closeTalk();
    g.talkTo('stormcaller');
    const then = g.talkNow;
    g.closeTalk();
    return { tiger, sexton, then, figures: g.town.figures.map((f) => f.id) };
  });
  expect(death.figures.sort()).toEqual(['sexton', 'stormcaller']);
  expect(death.tiger).toMatchObject({ line: 'storm.death.tiger' });
  expect(death.tiger.text).toContain('War-Tiger');
  expect(death.sexton).toMatchObject({ line: 'sexton.death' });
  expect(death.sexton.text).toMatch(/^The War-Tiger, was it/);
  expect(death.then.line).toMatch(/^storm\.idle\./);
  // the Ferryman says his first line as the mage comes to the jetty, once
  const ferry = await page.evaluate(() => {
    const g = (window as unknown as { __game: TG }).__game;
    g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_landing')!.plan.id);
    g.sim(0.6);
    const f = g.town.ferry!;
    g.player.x = f.x - 1.5;
    g.player.z = f.z;
    g.sim(0.3);
    const at = { ...g.talkNow };
    g.closeTalk();
    g.player.x = f.x - 4;
    g.sim(0.3);
    g.player.x = f.x - 1.5;
    g.sim(0.3);
    return { at, again: g.talkNow.open, said: g.town.ferry!.said };
  });
  expect(ferry.at).toMatchObject({ open: true, top: true, who: 'ferryman', line: 'ferryman.first' }); // (his boat low on the screen: the panel above)
  expect(ferry).toMatchObject({ again: false, said: true });
  // the dev menu makes any one talk
  await page.keyboard.press('F2');
  await page.locator('#dev .dv-tab', { hasText: 'Rooms' }).click();
  await page.locator('#dev .dv-page:not([hidden]) button', { hasText: 'The pilgrim talks' }).click();
  expect(await page.evaluate(() => (window as unknown as { __game: TG }).__game.talkNow)).toMatchObject({
    open: true,
    who: 'pilgrim',
    line: 'pilgrim.first',
  });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as unknown as { __game: TG }).__game.talkNow.open)).toBe(false);
  expect(errors).toEqual([]);
});

test('gifts, bonds and powers: a talk ends with what can be offered; obols on the eyes deepen a bond (a memory, then the second gift); a power is bought with Dust; a quest is given once the bond has begun; the next descent begins with the gifts; a shade freed says what it gives; the two spells that waited join the libraries', async ({
  page,
}) => {
  type TN = { open: boolean; who?: string; line?: string; text?: string; whole?: boolean; choices?: string[] };
  type GG = {
    veteranSave(): void;
    toVigil(first?: boolean): void;
    sim(s: number, d?: boolean): void;
    state: string;
    talkNow: TN;
    talkTo(id: string): boolean;
    talkOn(): void;
    say(i: number): boolean;
    closeTalk(): void;
    vigil: {
      dust: number;
      obols: number;
      bonds: Record<string, number>;
      powers: string[];
      flags: Record<string, unknown>;
    };
    forgetHeard(): void;
    gifts: {
      folk: Record<string, { bond: number; quest: string | null }>;
      powers: string[];
      start: Record<string, unknown>;
      disciplines: string[];
    };
    takeBoat(): void;
    player: { stats: { maxMana: number }; mana: number; reagents: Record<string, number>; coins: number };
    current: { type: string };
  };
  const errors = await start(page, '?vigil=1&seed=VIGL3');
  const talk = await page.evaluate(() => {
    const g = (window as unknown as { __game: GG }).__game;
    g.veteranSave();
    g.toVigil(false);
    g.sim(1);
    g.talkTo('scribe');
    g.sim(5);
    const first = g.talkNow;
    g.say(1);
    g.sim(5); // (its first line, a choice, its reply: the offers follow)
    const offers = g.talkNow.choices;
    const before = { obols: g.vigil.obols, dust: g.vigil.dust };
    g.say(1);
    g.sim(5);
    const eyes1 = { ...g.talkNow, bond: g.vigil.bonds.scribe, obols: g.vigil.obols };
    g.say(2);
    g.sim(5);
    const power = { ...g.talkNow, powers: [...g.vigil.powers], dust: g.vigil.dust };
    g.say(1);
    g.sim(5);
    const eyes2 = { ...g.talkNow, bond: g.vigil.bonds.scribe, obols: g.vigil.obols, start: g.gifts.start };
    g.closeTalk();
    g.talkTo('scribe');
    g.sim(5);
    const quest = { ...g.talkNow, flag: g.vigil.flags['quest.scribe'] };
    g.closeTalk();
    return { first: first.line, offers, before, eyes1, power, eyes2, quest, disciplines: g.gifts.disciplines };
  });
  expect(talk.first).toBe('scribe.first');
  expect(talk.offers).toEqual(['Nothing now', 'Lay 5 obols on its eyes', 'Ask for Deep Well (150 Arcane Dust)']);
  expect(talk.eyes1).toMatchObject({ line: 'scribe.eyes1', bond: 1, obols: talk.before.obols - 5 });
  expect(talk.power).toMatchObject({ line: 'scribe.power', powers: ['deepWell'], dust: talk.before.dust - 150 });
  expect(talk.eyes2).toMatchObject({ line: 'scribe.eyes2', bond: 2, obols: talk.before.obols - 20 });
  expect(talk.eyes2.start).toMatchObject({ maxMana: 10, page: 1, reagents: 1 }); // (its second gift: a page each descent; the forager's reagent; the power's mana)
  expect(talk.quest).toMatchObject({ line: 'scribe.quest', flag: 'open' });
  expect(talk.disciplines).toHaveLength(6);
  await page.screenshot({ path: 'test-results/vigil-gifts.png' });
  // the next descent begins with them
  const run = await page.evaluate(() => {
    const g = (window as unknown as { __game: GG }).__game;
    g.takeBoat();
    g.sim(3);
    return {
      type: g.current.type,
      maxMana: g.player.stats.maxMana,
      mana: g.player.mana,
      reagents: Object.values(g.player.reagents).reduce((a, b) => a + b, 0),
      coins: g.player.coins,
    };
  });
  expect(run.type).toBe('start');
  expect(run.maxMana).toBeGreaterThanOrEqual(110);
  expect(run.mana).toBe(run.maxMana);
  expect(run.reagents).toBeGreaterThanOrEqual(1); // (the forager's reagent)
  // a shade freed in a run gives at once: the novice's Hex Bolt learned, its discipline open
  const freed = await page.evaluate(() => {
    const g = (
      window as unknown as {
        __game: GG & {
          setFreed?: unknown;
          knowledge: Record<string, string>;
          forgetKnowledge(): void;
          shadeHere(id: string): void;
          breakChains(): boolean;
          freeShade(): boolean;
          importSave(t: string): string[];
        };
      }
    ).__game;
    g.importSave(JSON.stringify({ v: 1, runs: 1, dust: 0, obols: 0, freed: [] }));
    g.forgetKnowledge();
    g.shadeHere('novice');
    g.sim(0.5);
    g.breakChains();
    g.sim(0.2);
    g.freeShade();
    g.sim(0.2);
    return { hex: g.knowledge.hex_bolt, disciplines: g.gifts.disciplines };
  });
  expect(freed.hex).toBe('learned');
  expect(freed.disciplines).toEqual(['pyromancer', 'hexer']);
  // the dev menu's section: a power given there
  await page.keyboard.press('F2');
  await page.locator('#dev .dv-tab', { hasText: 'Rooms' }).click();
  await page.locator('#dev .dv-page:not([hidden]) button', { hasText: 'Heartstone' }).click();
  expect(await page.evaluate(() => (window as unknown as { __game: GG }).__game.gifts.powers)).toEqual(['heartstone']);
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('the unfolding: the six ways stay walled until their school lands on them (another school does nothing); each opens to a room behind it, kept in the save; the Cave Mouth looks out on the valleys and holds what the freed have built; a candle lit in the chapel blesses the next descent alone; the garden gives its reagent; the dev menu opens and closes them', async ({
  page,
}) => {
  type Bar = { school: string; x: number; z: number; open: boolean };
  type UG = {
    rooms(): RoomView[];
    veteranSave(): void;
    setParts(s: string[]): void;
    toVigil(first?: boolean): void;
    sim(s: number, d?: boolean): void;
    warp(i: number): void;
    keys: Set<string>;
    player: { x: number; z: number; maxHp: number; reagents: Record<string, number>; stats: { spellDamage: number } };
    current: { type: string; cx: number; cz: number };
    vigilPlace: { room: string | null; bars: Bar[]; parts: string[] };
    element(kind: string, x: number, z: number): void;
    learn(id: string, slot?: number): void;
    mana(n: number): void;
    cast(slot: number, aim?: { x: number; z: number }): void;
    unfold: {
      parts: string[];
      blessing: string | null;
      garden: string | null;
      cave?: { built: number; open: boolean };
      candles?: { id: string; x: number; z: number; lit: boolean }[];
      beds?: { id: string; x: number; z: number; chosen: boolean }[];
      tended?: boolean;
    };
    lightBlessing(id: string | null): void;
    takeBoat(): void;
    run: { blessing: string | null };
  };
  const errors = await start(page, '?vigil=1&seed=VIGL4');
  // every way walled: walking north into the frozen stair, the mage stays in the Nave
  const walled = await page.evaluate(() => {
    const g = (window as unknown as { __game: UG }).__game;
    g.veteranSave();
    g.setParts([]);
    g.toVigil(false);
    g.sim(1);
    g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_nave')!.plan.id);
    g.sim(0.6);
    const ember = g.vigilPlace.bars.find((b) => b.school === 'ember')!;
    g.player.x = ember.x;
    g.player.z = ember.z + 1.2;
    g.keys.add('KeyW');
    g.sim(1.5);
    g.keys.delete('KeyW');
    const stayed = g.vigilPlace.room;
    g.element('hex', ember.x, ember.z + 0.6);
    g.sim(0.3); // (the dark: not its school)
    const afterHex = g.vigilPlace.bars.find((b) => b.school === 'ember')!.open;
    g.element('burn', ember.x, ember.z + 0.6);
    g.sim(0.5); // (fire: it opens)
    const opened = { open: g.vigilPlace.bars.find((b) => b.school === 'ember')!.open, parts: [...g.unfold.parts] };
    g.keys.add('KeyW');
    g.sim(2.5);
    g.keys.delete('KeyW');
    g.sim(0.6);
    return {
      shut: g.vigilPlace.bars.every((b) => !b.open),
      stayed,
      afterHex,
      opened,
      through: g.vigilPlace.room,
      cave: g.unfold.cave,
    };
  });
  expect(walled.stayed).toBe('nave');
  expect(walled.afterHex).toBe(false);
  expect(walled.opened).toEqual({ open: true, parts: ['ember'] });
  expect(walled.through).toBe('cave');
  expect(walled.cave).toMatchObject({ built: 10, open: true }); // (every shade freed in the veteran's save: ten things built)
  await page.screenshot({ path: 'test-results/vigil-cave-mouth.png' });
  // a spell of its school opens another: Rime Shards cast at the cellar stair under black water
  const frost = await page.evaluate(() => {
    const g = (window as unknown as { __game: UG }).__game;
    g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_landing')!.plan.id);
    g.sim(0.6);
    const bar = g.vigilPlace.bars.find((b) => b.school === 'frost')!;
    g.learn('rime_shards', 0);
    g.mana(100);
    g.player.x = bar.x;
    g.player.z = bar.z + 2;
    g.sim(0.1);
    g.cast(0, { x: 0, z: -1 });
    g.sim(1);
    return { open: g.vigilPlace.bars.find((b) => b.school === 'frost')!.open, parts: [...g.unfold.parts] };
  });
  expect(frost).toEqual({ open: true, parts: ['ember', 'frost'] });
  // kept: woken again, both stand open, the others walled
  const kept = await page.evaluate(() => {
    const g = (window as unknown as { __game: UG }).__game;
    g.toVigil(false);
    g.sim(1);
    return g.vigilPlace.bars
      .filter((b) => b.open)
      .map((b) => b.school)
      .sort();
  });
  expect(kept).toEqual(['ember', 'frost']);
  // the chapel (its way opened by the dev menu's hook): a candle walked up to is lit for the next descent; walked up to again, it goes out
  const chapel = await page.evaluate(() => {
    const g = (window as unknown as { __game: UG & { openPart(s: string): void } }).__game;
    g.openPart('hallow');
    g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_chapel')!.plan.id);
    g.sim(0.6);
    const at = (id: string) => g.unfold.candles!.find((c) => c.id === id)!;
    const walkTo = (id: string) => {
      const c = at(id);
      g.player.x = c.x;
      g.player.z = c.z + 2;
      g.sim(0.2);
      g.player.z = c.z + 0.7;
      g.sim(0.3);
    };
    walkTo('scribe');
    const lit = { blessing: g.unfold.blessing, lit: at('scribe').lit };
    walkTo('scribe');
    const out = { blessing: g.unfold.blessing, lit: at('scribe').lit };
    walkTo('sexton');
    const sexton = {
      blessing: g.unfold.blessing,
      lit: at('sexton').lit,
      others: g.unfold.candles!.filter((c) => c.lit).length,
    };
    return { lit, out, sexton };
  });
  expect(chapel.lit).toEqual({ blessing: 'scribe', lit: true });
  expect(chapel.out).toEqual({ blessing: null, lit: false });
  expect(chapel.sexton).toEqual({ blessing: 'sexton', lit: true, others: 1 });
  await page.screenshot({ path: 'test-results/vigil-chapel.png' });
  // the garden (its way opened by the dev menu's hook): the embalmer tends it, a bed walked up to gives its reagent
  const garden = await page.evaluate(() => {
    const g = (window as unknown as { __game: UG & { openPart(s: string): void } }).__game;
    g.openPart('verdant');
    g.warp(g.rooms().find((r) => r.plan.templateId === 'vigil_garden')!.plan.id);
    g.sim(0.6);
    const b = g.unfold.beds!.find((x) => x.id === 'emberSalt')!;
    g.player.x = b.x;
    g.player.z = b.z + 2;
    g.sim(0.2);
    g.player.z = b.z + 0.7;
    g.sim(0.3);
    return { garden: g.unfold.garden, tended: g.unfold.tended };
  });
  expect(garden).toEqual({ garden: 'emberSalt', tended: true });
  // the next descent: the sexton's half heart, the garden's Ember Salt; the candle burns down with it
  const run = await page.evaluate(() => {
    const g = (window as unknown as { __game: UG }).__game;
    const was = g.player.maxHp;
    g.takeBoat();
    g.sim(3);
    return {
      type: g.current.type,
      blessing: g.run.blessing,
      saved: g.unfold.blessing,
      more: g.player.maxHp - was,
      salt: g.player.reagents.emberSalt ?? 0,
    };
  });
  expect(run).toMatchObject({ type: 'start', blessing: 'sexton', saved: null });
  expect(run.salt).toBeGreaterThanOrEqual(1); // (the garden's one; the forager's start gift is a random reagent, Ember Salt too about one run in eight)
  expect(run.more).toBeGreaterThanOrEqual(1); // (half a heart more, with the powers' hearts besides)
  // the dev menu closes every way again
  await page.evaluate(() => {
    const g = (window as unknown as { __game: UG }).__game;
    g.toVigil(false);
    g.sim(1);
  });
  await page.keyboard.press('F2');
  await page.locator('#dev .dv-tab', { hasText: 'Rooms' }).click();
  await page.locator('#dev .dv-page:not([hidden]) button', { hasText: 'Close every way again' }).click();
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as unknown as { __game: UG }).__game.vigilPlace.bars.some((b) => b.open)),
  ).toBe(false);
  expect(errors).toEqual([]);
});
