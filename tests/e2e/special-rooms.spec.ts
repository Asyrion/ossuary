import { expect, test } from '@playwright/test';
import {
  type RoomView,
  type GameHooks,
  type W,
  start,
  type Ware,
  type Seal,
  type G5,
  type G6,
  SEEDED_RANDOM,
  type G12,
} from './helpers';

test('the merchant sells for obols and refuses what the mage cannot pay or use; his shop is warded', async ({
  page,
}) => {
  const errors = await start(page, '?room=merchant_plain&seed=SHOP01&loot=coins:18');
  const shop = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5,
      P = g.player;
    g.warp(1);
    g.sim(0.5);
    const walkInto = (w: Ware) => {
      P.x = w.x;
      P.z = w.z + 1.6;
      P.vx = P.vz = 0;
      g.keys.add('KeyW');
      g.sim(0.6);
      g.keys.delete('KeyW');
      g.sim(0.2);
      P.z += 1.6;
      g.sim(0.1);
    };
    const wares = g.current.wares!,
      art = wares.find((w) => w.ware === 'artifact')!,
      heart = wares.find((w) => w.ware === 'heart');
    const coins = P.coins,
      items = P.items.length + (P.focus !== 'apprentice_wand' ? 1 : 0);
    walkInto(art);
    const bought = {
      spent: coins - P.coins,
      sold: art.sold || art.price === 0,
      gained: P.items.length + (P.focus !== 'apprentice_wand' ? 1 : 0) - items,
    };
    let refused = null;
    if (heart) {
      const c = P.coins;
      walkInto(heart);
      refused = { spent: c - P.coins, sold: heart.sold, toast: document.getElementById('toast')!.textContent };
    }
    // bolts fizzle just after leaving the mage
    P.x = g.current.cx - 4;
    P.z = g.current.cz + 2.5;
    let far = 0;
    g.keys.add('ArrowRight');
    g.arrowOrder.push('ArrowRight');
    for (let t = 0; t < 1; t += 0.05) {
      g.sim(0.05);
      far = Math.max(far, ...g.bolts.map((b) => b.dist));
    }
    g.keys.delete('ArrowRight');
    g.arrowOrder.length = 0;
    g.sim(0.3);
    return { count: wares.length, first: wares[0].ware, price: art.price, bought, refused, far, glyphs: P.glyphs };
  });
  expect(shop.count).toBeGreaterThanOrEqual(3);
  expect(shop.first).toBe('artifact'); // the budget reaches the merchant in a test room
  expect(shop.bought).toEqual({ spent: 15, sold: true, gained: 1 });
  if (shop.refused)
    expect(shop.refused).toMatchObject({ spent: 0, sold: false, toast: expect.stringMatching(/whole/) }); // a heart at full health
  expect(shop.far).toBeLessThan(1);
  await page.keyboard.press('Space'); // the chalk won't take in the shop, and no glyph is spent
  const glyph = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5;
    g.sim(0.1);
    return { glyphs: g.player.glyphs, onFloor: g.glyphs.length };
  });
  expect(glyph).toEqual({ glyphs: shop.glyphs, onFloor: 0 });
  await page.evaluate(() => (window as unknown as W).__game.sim(0.1, true));
  await page.screenshot({ path: 'test-results/smoke-merchant.png' });
  expect(errors).toEqual([]);
});

test('a gilded reliquary shrugs off a blast, and a bone key finds a relic beyond the budget', async ({ page }) => {
  const errors = await start(page, '?room=crypt_c&seed=GILD01&loot=keys:1,glyphs:1');
  type G6 = Omit<G5, 'current'> & {
    current: G5['current'] & { spots: { taken: boolean }[] };
    pickups: { gilded?: boolean; opened?: boolean; x: number; z: number }[];
    drop(k: string, x: number, z: number, o?: { gilded?: boolean }): void;
  };
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6,
      P = g.player;
    g.warp(1);
    g.clearRoom();
    P.invuln = 99;
    P.x = g.current.cx;
    P.z = g.current.cz;
    g.drop('chest', P.x + 2, P.z, { gilded: true });
    g.sim(0.8);
    P.x += 0.85; // beside it, not touching
  });
  await page.keyboard.press('Space');
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6,
      P = g.player,
      c = g.pickups.find((q) => q.gilded)!;
    g.sim(0.05);
    P.x -= 3;
    g.sim(2);
    const afterBlast = !!c.opened,
      spots = g.current.spots.length;
    P.x = c.x;
    P.z = c.z + 0.3;
    g.sim(0.5);
    return { afterBlast, opened: !!c.opened, keys: P.keys, relics: g.current.spots.length - spots };
  });
  expect(r).toEqual({ afterBlast: false, opened: true, keys: 0, relics: 1 });
  expect(errors).toEqual([]);
});

/** Walk from the start room into the test vault's sealed door; returns the seal and the door. */
const walkToVault = () => {
  const g = (window as unknown as W).__game as unknown as G5,
    P = g.player,
    d = g.current.doors.find((x) => x.seal)!;
  P.x = d.x;
  P.z = d.z + 2;
  P.vx = P.vz = 0;
  g.sim(0.2);
  g.keys.add('KeyW');
  g.sim(0.8);
  g.keys.delete('KeyW');
  g.sim(0.2);
  return { sealed: d.seal!.sealed, open: d.open, keys: P.keys, toast: document.getElementById('toast')!.textContent };
};

test('a locked vault stays shut without a key, and a bone key unbinds it', async ({ page }) => {
  const errors = await start(page, '?room=vault_urns&seed=VAULT1');
  const shut = await page.evaluate(walkToVault);
  expect(shut).toMatchObject({ sealed: true, open: false, keys: 0, toast: expect.stringMatching(/bone key/) });
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5;
    g.loot({ keys: 1 });
    g.player.z += 2;
    g.sim(0.3);
  });
  const unbound = await page.evaluate(walkToVault);
  expect(unbound).toMatchObject({ sealed: false, open: true, keys: 0 });
  const inside = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5;
    g.sim(1);
    return { type: g.current.type, locked: g.current.locked, spots: g.current.spots.length };
  });
  expect(inside).toEqual({ type: 'vault', locked: false, spots: 1 }); // the prize, unguarded
  expect(errors).toEqual([]);
});

test('two glyph blasts force a vault, and its warden guards the prize', async ({ page }) => {
  const errors = await start(page, '?room=vault_urns&seed=VAULT2&loot=glyphs:2');
  const blasts: Seal[] = [];
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const g = (window as unknown as W).__game as unknown as G5,
        d = g.current.doors.find((x) => x.seal)!;
      g.player.x = d.x;
      g.player.z = d.z + 0.5;
      g.player.invuln = 99;
    });
    await page.keyboard.press('Space');
    blasts.push(
      await page.evaluate(() => {
        const g = (window as unknown as W).__game as unknown as G5,
          d = g.current.doors.find((x) => x.seal)!;
        g.sim(0.05);
        g.player.z += 3;
        g.sim(1.8);
        return { sealed: d.seal!.sealed, blasts: d.seal!.blasts };
      }),
    );
  }
  expect(blasts).toEqual([
    { sealed: true, blasts: 1 },
    { sealed: false, blasts: 2 },
  ]);
  const inside = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5,
      P = g.player,
      d = g.current.doors.find((x) => x.seal)!;
    P.x = d.x;
    P.z = d.z + 0.8;
    P.invuln = 99;
    g.keys.add('KeyW');
    g.sim(1.4);
    g.keys.delete('KeyW');
    g.sim(0.4);
    const guarded = {
      warden: !!g.current.warden,
      locked: g.current.locked,
      champions: g.enemies.filter((e) => !e.dead && e.champion).length,
      untaken: g.current.spots.filter((s) => !s.taken).length,
    };
    g.clearRoom();
    g.sim(0.5);
    return { guarded, after: { locked: g.current.locked, doorOpen: g.current.doors[0].open } };
  });
  expect(inside.guarded).toEqual({ warden: true, locked: true, champions: 1, untaken: 1 }); // the prize waits for the fight
  expect(inside.after).toEqual({ locked: false, doorOpen: true });
  await page.evaluate(() => (window as unknown as W).__game.sim(0.1, true));
  expect(errors).toEqual([]);
});

test('the Wandering Merchant lays its wares on open floor, never over a chasm, a pillar or an obelisk', async ({
  page,
}) => {
  type GW = GameHooks & {
    callWanderer(): void;
    clearRoom(): void;
    wanderer: { laid: boolean; at: { x: number; z: number }[] };
    current: RoomView & {
      bounds: { minX: number; minZ: number };
      template: { tiles: string[][] };
      rocks: { x: number; z: number; hx: number; hz: number }[];
    };
  };
  const errors: string[][] = [];
  for (const room of ['rope_chasm', 'obelisk_pair']) {
    errors.push(await start(page, `?room=${room}`));
    const spots = await page.evaluate(() => {
      const g = (window as unknown as W).__game as GW;
      g.warp(1);
      g.clearRoom();
      g.sim(0.3);
      g.callWanderer();
      g.sim(3);
      const r = g.current,
        tile = (x: number, z: number) =>
          r.template.tiles[Math.floor(z - r.bounds.minZ)]?.[Math.floor(x - r.bounds.minX)];
      return {
        laid: g.wanderer.laid,
        at: g.wanderer.at.map((p) => ({
          tile: tile(p.x, p.z),
          clear: !r.rocks.some((b) => Math.abs(p.x - b.x) < b.hx && Math.abs(p.z - b.z) < b.hz),
        })),
      };
    });
    expect(spots.laid, room).toBe(true);
    for (const s of spots.at) expect(s, room).toEqual({ tile: 'floor', clear: true });
  }
  for (const e of errors) expect(e).toEqual([]);
});

test("the Wandering Merchant (M4.2): rides into a cleared room, lays out a focus from far off, a soul mote and the crow's wares; the crow sells the map and the secret; the merchant is gone when the mage leaves", async ({
  page,
}) => {
  type Room = { type: string; known: boolean; visited: boolean; plan: { id: number } };
  type GM = Omit<G5, 'rooms' | 'current'> & {
    callWanderer(): void;
    wanderer: { here: boolean; laid: boolean; wares: string[] };
    rooms(): Room[];
    run: { wandererMet: boolean };
    current: G5['current'] & { wares?: { ware: string; x: number; z: number; sold: boolean }[] };
  };
  const errors = await start(page, '?seed=WANDER&floor=2&loot=coins:30');
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GM,
      P = g.player;
    const normal = g.rooms().find((x) => x.type === 'normal')!;
    g.warp(normal.plan.id);
    g.clearRoom();
    g.sim(0.3);
    P.invuln = 99;
    const before = { met: g.run.wandererMet, here: g.wanderer.here };
    g.callWanderer();
    g.sim(1);
    const riding = g.wanderer;
    g.sim(2);
    const laid = g.wanderer;
    const buy = (ware: string) => {
      const w = g.current.wares!.find((x) => x.ware === ware)!;
      P.x = w.x;
      P.z = w.z + 1.4;
      g.sim(0.2);
      P.z = w.z;
      g.sim(0.3);
      P.z = w.z + 1.4;
      g.sim(0.3);
      return w.sold;
    };
    const coins = P.coins,
      unknown = g.rooms().filter((x) => x.type !== 'secret' && !x.known).length;
    const map = buy('map'),
      mapped = g.rooms().filter((x) => x.type !== 'secret' && !x.known).length;
    const secret = laid.wares.includes('secret') ? buy('secret') : null,
      secretKnown = g.rooms().find((x) => x.type === 'secret')?.known ?? null;
    const spent = coins - P.coins;
    const other = g.rooms().find((x) => x.type === 'normal' && x !== normal)!;
    g.warp(other.plan.id);
    g.sim(0.3);
    const away = g.wanderer;
    g.warp(normal.plan.id);
    g.sim(0.3);
    return {
      before,
      riding,
      laid,
      unknown,
      map,
      mapped,
      secret,
      secretKnown,
      spent,
      away,
      back: g.wanderer,
      met: g.run.wandererMet,
    };
  });
  expect(r.before).toEqual({ met: false, here: false });
  expect(r.riding).toMatchObject({ here: true, laid: false, wares: [] });
  expect(r.laid.laid).toBe(true);
  expect(r.laid.wares.slice(0, 3)).toEqual(['artifact', expect.stringMatching(/Soul$/), 'map']);
  expect(r.unknown).toBeGreaterThan(0);
  expect(r).toMatchObject({ map: true, mapped: 0, met: true, away: { here: false }, back: { here: false, wares: [] } });
  if (r.secret !== null) expect(r).toMatchObject({ secret: true, secretKnown: true });
  expect(r.spent).toBe(r.secret ? 13 : 5);
  expect(errors).toEqual([]);
});

test('the shrine cleanses a curse put down inside its circle, refuses the poor, and lets a curse escape in time', async ({
  page,
}) => {
  // (where the wisp flies is random; seeded, the bot's chase goes the same way every run instead of now and then
  // running out of the rite's ten seconds)
  await page.addInitScript(SEEDED_RANDOM);
  const errors = await start(
    page,
    '?room=shrine_henge&seed=SHRN01&give=mask_of_the_drowned,chain_of_the_penitent&loot=coins:14',
  );
  const entered = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6;
    g.warp(1);
    g.sim(0.5);
    return {
      type: g.current.type,
      stones: g.current.shrine.stones.map((s) => s.id),
      banner: document.querySelector('#banner .t')!.textContent,
    };
  });
  expect(entered).toEqual({
    type: 'shrine',
    stones: ['mask_of_the_drowned', 'chain_of_the_penitent'],
    banner: 'A shrine',
  });
  // walk into the mask's stone: its curse comes out as a wisp; a bot keeps level with it south of the circle
  // and casts north whenever it's inside
  const cleansed = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6,
      P = g.player,
      r = g.current,
      K = g.keys,
      s = r.shrine.stones[0];
    (window as unknown as { __reseed(): void }).__reseed();
    P.x = s.x + 1.2;
    P.z = s.z;
    K.add('KeyA');
    g.sim(0.6);
    K.delete('KeyA');
    const began = g.rite?.id;
    P.invuln = 999;
    let t = 0;
    for (; g.rite && !g.rite.fleeing && t < 11; t += 1 / 60) {
      const w = g.rite;
      for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowUp']) K.delete(k);
      g.arrowOrder.length = 0;
      if (w.x < P.x - 0.15) K.add('KeyA');
      else if (w.x > P.x + 0.15) K.add('KeyD');
      if (P.z < r.cz + 2.5) K.add('KeyS');
      else if (P.z > r.cz + 2.9) K.add('KeyW');
      if (w.inside && Math.abs(w.x - P.x) < 0.3) {
        K.add('ArrowUp');
        g.arrowOrder.push('ArrowUp');
      }
      g.sim(1 / 60);
    }
    for (const k of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowUp']) K.delete(k);
    g.arrowOrder.length = 0;
    g.sim(0.5);
    return {
      began,
      seconds: t,
      rite: g.rite,
      coins: P.coins,
      cleansed: P.cleansed,
      dark: P.stats.effects.has('vision'),
      damage: P.stats.damage,
      stones: r.shrine.stones.map((q) => q.id),
      icon: document.querySelector('#items svg.cleansed title')?.textContent,
    };
  });
  console.log(`curse put down in ${cleansed.seconds.toFixed(1)} s`);
  expect(cleansed).toMatchObject({
    began: 'mask_of_the_drowned',
    rite: null,
    coins: 4,
    cleansed: ['mask_of_the_drowned'],
    dark: false,
    stones: ['chain_of_the_penitent'],
  });
  expect(cleansed.damage).toBeCloseTo(3.5 * 1.5); // the gift halved: ×1.5 instead of ×2
  expect(cleansed.icon).toContain('half again');
  await page.evaluate(() => (window as unknown as W).__game.sim(0.1, true));
  await page.screenshot({ path: 'test-results/smoke-shrine.png' });
  // too few obols: the shrine refuses; with enough, a curse left alone slips back into its stone
  const later = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G6,
      P = g.player,
      r = g.current,
      s = r.shrine.stones[0];
    const walkInto = () => {
      P.x = s.x + 1.2;
      P.z = s.z;
      P.vx = P.vz = 0;
      g.keys.add('KeyA');
      g.sim(0.7);
      g.keys.delete('KeyA');
      g.sim(0.1);
      P.x += 1.2;
      g.sim(0.05);
    }; // and step back, so the stone is ready again
    walkInto();
    const refused = { rite: g.rite, toast: document.getElementById('toast')!.textContent };
    g.loot({ coins: 10 });
    walkInto();
    const began = g.rite?.id;
    P.x = r.cx;
    P.z = r.cz + 2.8;
    g.sim(10.8);
    return {
      refused,
      began,
      rite: g.rite,
      coins: P.coins,
      cleansed: P.cleansed,
      speed: P.stats.speed,
      toast: document.getElementById('toast')!.textContent,
    };
  });
  expect(later.refused).toEqual({ rite: null, toast: expect.stringMatching(/asks 10 obols/) });
  expect(later).toMatchObject({
    began: 'chain_of_the_penitent',
    rite: null,
    coins: 14,
    cleansed: ['mask_of_the_drowned'],
    toast: expect.stringMatching(/slips back/),
  });
  expect(later.speed).toBeCloseTo(4.3 * 0.75); // still cursed
  expect(errors).toEqual([]);
});

test('the library: a page learned burns the others, a full hand is asked, given-up pages stay and sell back, bosses leave one', async ({
  page,
}) => {
  const errors = await start(page, '?room=library_plain&seed=LIB1&spells=arc&loot=coins:10');
  // one slot free: walking into a lectern's page learns it, and the other two burn to ash
  const first = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12,
      P = g.player;
    g.forgotten.push('cinder_lance', 'pyre_seal', 'rime_shards'); // given up earlier in the run: on the shelf unless a lectern offers them
    g.warp(1);
    g.sim(0.5);
    const lecterns = g.pages.filter((p) => p.kind === 'lectern'),
      pick = lecterns[0],
      shelf = g.pages.filter((p) => p.kind === 'shelf');
    P.x = pick.x;
    P.z = pick.z + 0.3;
    g.sim(0.3);
    return {
      offered: lecterns.map((p) => p.spell),
      shelf: shelf.map((p) => [p.spell, p.price]),
      spells: [...P.spells],
      gone: lecterns.filter((p) => p.gone).length,
      asked: document.querySelector('#prompt')!.classList.contains('on'),
    };
  });
  expect(new Set(first.offered).size).toBe(3);
  expect(first.offered).not.toContain('arc');
  expect(first.shelf.map((q) => q[0])).toEqual(
    ['rime_shards', 'pyre_seal', 'cinder_lance'].filter((id) => !first.offered.includes(id)).slice(0, 2),
  ); // (latest first, two at most)
  expect(first.shelf.map((q) => q[1])).toEqual([7, 7]);
  expect(first.spells).toEqual(['arc', first.offered[0]]);
  expect(first.gone).toBe(3);
  expect(first.asked).toBe(false);
  // the shelf: both slots full, so it asks; stepping away keeps both; answering pays, and the given-up spell's
  // page stays on the shelf, free
  const shelf = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12,
      P = g.player,
      s = g.pages.find((p) => p.kind === 'shelf')!;
    P.x = s.x;
    P.z = s.z + 0.3;
    g.sim(0.3);
    const asked = document.querySelector('#prompt')!.classList.contains('on');
    P.z += 2;
    g.sim(0.3);
    const kept = !document.querySelector('#prompt')!.classList.contains('on') && P.spells.includes('arc');
    P.z = s.z + 0.3;
    g.sim(0.3);
    const answered = g.cast(0);
    g.sim(0.2);
    return {
      asked,
      kept,
      answered,
      spells: [...P.spells],
      coins: P.coins,
      left: [s.spell, s.price, s.gone],
      forgotten: [...g.forgotten],
    };
  });
  expect(shelf).toMatchObject({ asked: true, kept: true, answered: true, coins: 3, left: ['arc', 0, false] });
  expect(shelf.spells[0]).toBe(first.shelf[0][0]);
  expect(shelf.forgotten).toContain('arc');
  expect(shelf.forgotten).not.toContain(first.shelf[0][0]);
  // take it back, for nothing: the page swaps again
  const back = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12,
      P = g.player,
      s = g.pages.find((p) => p.kind === 'shelf')!;
    P.z += 2;
    g.sim(0.3);
    P.z = s.z + 0.3;
    g.sim(0.3);
    g.cast(0);
    g.sim(0.2);
    return { spells: [...P.spells], coins: P.coins, left: s.spell };
  });
  expect(back.spells[0]).toBe('arc');
  expect(back.coins).toBe(3);
  expect(back.left).toBe(first.shelf[0][0]);
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/smoke-library.png' });
  expect(errors).toEqual([]);
  // a boss leaves a grimoire page beside its artifacts
  const errors2 = await start(page, '?room=boss_open&seed=BP1&spells=arc');
  const boss = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12,
      P = g.player;
    g.warp(1);
    g.sim(1);
    g.clearRoom();
    g.sim(1);
    const pg = g.pages.find((p) => p.kind === 'loose')!,
      id = pg.spell;
    P.x = pg.x;
    P.z = pg.z + 0.3;
    g.sim(0.3);
    return { id, spells: [...P.spells], gone: pg.gone };
  });
  expect(boss.spells).toEqual(['arc', boss.id]);
  expect(boss.gone).toBe(true);
  expect(errors2).toEqual([]);
});

test('the waystone (M6 step 9; where a floor has no waystone room, as under ?room=): it rises where the boss fell and kindles; walking up opens it and rests the mage; one of its pair taken, the other crumbles; a rune carved from the pouch and lifted out; a spell cast into it costs nothing and opens on that spell; Second Socket opens a second socket; the belt reordered here and in the inventory; none at the Seal', async ({
  page,
}) => {
  type WS = {
    x: number;
    z: number;
    rise: number;
    lit: boolean;
    rested: boolean;
    pair: string[] | null;
    target: number;
    screen: { open: boolean; tab: string };
  };
  type GS = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    clearRoom(): void;
    drop(kind: string, x?: number, z?: number, o?: { rune?: string }): void;
    cast(slot: number): boolean;
    waystone: WS | null;
    stoneTake(i: number): boolean;
    stoneCarve(slot: number, id: string): string | null;
    stoneLift(slot: number, id: string): boolean;
    stoneSocket(slot: number): boolean;
    moveInBelt(a: number, b: number): boolean;
    giveBoon(id: string): void;
    closeWaystone(): void;
    belt: { ids: string[]; at: number };
    sockets: { slots: { spell: string | null; size: number; runes: string[] }[]; pouch: string[] };
    player: { x: number; z: number; mana: number; invuln: number; spellCd: number[]; stats: { maxMana: number } };
  };
  const errors = await start(
    page,
    '?room=boss_open&boss=warden&seed=STONE9&spells=cinder_lance,arc&potions=healing,hexBrew',
  );
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS }).__game,
      P = g.player;
    P.invuln = 999;
    g.warp(1);
    g.sim(0.3);
    g.drop('rune', P.x, P.z - 1, { rune: 'quicken' });
    g.sim(0.3);
    P.z -= 1;
    g.sim(0.3); // (a rune in the pouch to carve)
    const before = g.waystone;
    g.clearRoom();
    g.sim(0.2);
    const rising = g.waystone;
    g.sim(2);
    const risen = g.waystone!;
    // walking up: the screen opens, and the rest fills mana and ends the cooldowns
    P.mana = 0;
    P.spellCd = [5, 5];
    P.x = risen.x;
    P.z = risen.z + 2.5;
    g.sim(0.1);
    P.z = risen.z + 0.9;
    g.sim(0.1);
    const opened = g.waystone!.screen.open,
      rest = { mana: P.mana, max: P.stats.maxMana, cd: [...P.spellCd], rested: g.waystone!.rested };
    // the pair: one taken, the other crumbles
    const pair = [...risen.pair!];
    g.stoneTake(0);
    const afterTake = { pouch: [...g.sockets.pouch], pair: g.waystone!.pair };
    // a rune carved from the pouch, then lifted out again
    const carved = g.stoneCarve(0, 'quicken'),
      inQ = [...g.sockets.slots[0].runes],
      pouchCarved = [...g.sockets.pouch];
    const lifted = g.stoneLift(0, 'quicken'),
      pouchLifted = [...g.sockets.pouch];
    g.closeWaystone();
    g.sim(0.1);
    // a spell cast into it: nothing paid, the screen on that spell
    P.mana = 10;
    P.spellCd = [0, 0];
    const cast = g.cast(1),
      castState = { mana: P.mana, cd: P.spellCd[1], screen: g.waystone!.screen, target: g.waystone!.target };
    // Second Socket: the boon taken, a second socket opened in E
    const before2 = g.stoneSocket(1);
    g.giveBoon('secondSocket');
    const opened2 = g.stoneSocket(1),
      again = g.stoneSocket(0);
    const moved = g.moveInBelt(0, 1),
      belt = [...g.belt.ids];
    g.closeWaystone();
    g.sim(0.1);
    return {
      before,
      rising: rising && { lit: rising.lit, rise: rising.rise },
      risen: { lit: risen.lit },
      opened,
      rest,
      pair,
      afterTake,
      carved,
      inQ,
      pouchCarved,
      lifted,
      pouchLifted,
      cast,
      castState,
      before2,
      opened2,
      again,
      size: g.sockets.slots[1].size,
      moved,
      belt,
    };
  });
  expect(r.before).toBeNull();
  expect(r.rising).toMatchObject({ lit: false });
  expect(r.risen.lit).toBe(true);
  expect(r.opened).toBe(true);
  expect(r.rest).toMatchObject({ cd: [0, 0], rested: true });
  expect(r.rest.mana).toBe(r.rest.max);
  expect(r.pair).toHaveLength(2);
  expect(r.pair[0]).not.toBe(r.pair[1]);
  expect(r.afterTake.pair).toBeNull();
  expect(r.afterTake.pouch).toEqual(['quicken', r.pair[0]]);
  expect(r.carved).toBeNull();
  expect(r.inQ).toEqual(['quicken']);
  expect(r.pouchCarved).toEqual([r.pair[0]]);
  expect(r.lifted).toBe(true);
  expect(r.pouchLifted).toEqual([r.pair[0], 'quicken']);
  expect(r.cast).toBe(true);
  expect(r.castState).toMatchObject({ mana: 10, cd: 0, target: 1 });
  expect(r.castState.screen.open).toBe(true);
  expect(r.before2).toBe(false);
  expect(r.opened2).toBe(true);
  expect(r.again).toBe(false);
  expect(r.size).toBe(2);
  expect(r.moved).toBe(true);
  expect(r.belt).toEqual(['hexBrew', 'healing']);
  // the inventory's Potions tab moves them back: Enter on the first slot, then Enter on the second
  await page.keyboard.press('KeyI');
  await page.locator('#invTabs button', { hasText: 'Potions' }).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as unknown as { __game: GS }).__game.belt.ids)).toEqual([
    'healing',
    'hexBrew',
  ]);
  await page.keyboard.press('KeyI');
  expect(errors).toEqual([]);
  // the Seal: no waystone (nothing below to carry runes to)
  const errors5 = await start(page, '?room=boss_open&boss=warden&seed=STONE9&floor=6');
  const deep = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS }).__game;
    g.warp(1);
    g.sim(0.3);
    g.clearRoom();
    g.sim(2);
    return g.waystone;
  });
  expect(deep).toBeNull();
  expect(errors5).toEqual([]);
});

test('the waystone room (M6 step 10): beside the boss room, empty and dark until the boss falls; then the boss room points to it, the stone rises as the mage walks in, kindles and lights the room, the trapdoor opens beyond it away from the door, and it leads down', async ({
  page,
}) => {
  const errors = await start(page, '?seed=WAY10&boss=warden&spells=cinder_lance');
  const r = await page.evaluate<{
    doorShift: number;
    early: { stone: unknown; wayDown: unknown };
    fell: { wayDown: unknown; stone: unknown; sub: string; line: string };
    rising: { lit: boolean; wayDown: unknown };
    lit: boolean;
    toward: number;
    down: string;
    away: number;
    rested: boolean;
    floor: number;
    state: string;
  }>(`(() => {
    const g = window.__game, P = g.player; P.invuln = 999;
    const stone = g.rooms().find(r => r.type === 'waystone'), boss = g.rooms().find(r => r.type === 'boss');
    const door = boss.plan.doors.find(d => d.to === stone.plan.id), side = stone.plan.doors[0].side;
    g.warp(stone.plan.id); g.sim(.5); const early = { stone: g.waystone, wayDown: g.wayDown };
    g.warp(boss.plan.id); g.sim(.3); g.clearRoom(); g.sim(.2);
    const sub = document.querySelector('#banner .s')?.textContent, said = new Set();
    for (let t = 0; t < 40; t++) { said.add(document.getElementById('toast').textContent); g.sim(.25); } // (the lines, one after another)
    const fell = { wayDown: g.wayDown, stone: g.waystone, sub, line: [...said].join(' | ') };
    g.warp(stone.plan.id); g.sim(.2); const rising = { lit: g.waystone?.lit, wayDown: g.wayDown };
    g.sim(2); const w = g.waystone, down = g.wayDown, cx = stone.cx, cz = stone.cz;
    const dir = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[side], away = (down.x - cx) * dir[0] + (down.z - cz) * dir[1];
    P.mana = 0; P.x = w.x + dir[0] * 2; P.z = w.z + dir[1] * 2; g.sim(.1); P.x = w.x + dir[0] * .9; P.z = w.z + dir[1] * .9; g.sim(.1); const rested = g.waystone.rested; // (from the door's side, the trapdoor beyond)
    g.closeWaystone(); g.sim(.1);
    P.x = down.x; P.z = down.z; g.sim(.3, true);
    return { doorShift: door.shift, early, fell, rising, lit: w.lit, toward: (w.x - cx) * dir[0] + (w.z - cz) * dir[1], down: down.room, away, rested, floor: g.floor, state: g.state };
  })()`);
  expect(r.doorShift).toBe(0);
  expect(r.early).toEqual({ stone: null, wayDown: null }); // (dev warp before the boss: nothing rises yet)
  expect(r.fell).toMatchObject({ wayDown: null, stone: null, sub: 'The way down lies past the waystone' });
  expect(r.fell.line).toMatch(/Beyond the (north|south|east|west) door, a stone stirs/);
  expect(r.rising).toEqual({ lit: false, wayDown: null });
  expect(r.lit).toBe(true);
  expect(r.toward).toBeGreaterThan(0.5); // (the stone a little toward the door, the way down beyond it)
  expect(r.down).toBe('waystone');
  expect(r.away).toBeLessThan(-1.5);
  expect(r.rested).toBe(true);
  expect(r).toMatchObject({ floor: 1, state: 'play' });
  expect(errors).toEqual([]);
});

test("the shrine's bargain (M6 step 11): a stone at the circle's head; walking up says how; a spell cast into it costs nothing and deals two boons of its school and one general; Esc pays nothing; a boon taken costs a heart container and keeps it, once; the last heart is refused", async ({
  page,
}) => {
  const errors = await start(page, '?room=shrine_henge&spells=cinder_lance,rime_shards');
  const r = await page.evaluate<{
    at: number[];
    said: string;
    deal: {
      mana: number;
      offer: { open: boolean; mode: string; cards: { id: string }[] };
      b: { state: string; school: string };
    };
    backed: { b: { state: string }; open: boolean; maxHp: number };
    school2: string;
    hp: number;
    kept: { b: { state: string }; open: boolean; maxHp: number; rank: number };
    plain: { paid: number; state: string };
  }>(`(() => {
    const g = window.__game, P = g.player; P.invuln = 999;
    g.warp(1); g.sim(.5); const room = g.current, b0 = g.bargain;
    const at = [b0.x - room.cx, b0.z - room.cz];
    P.x = b0.x; P.z = b0.z + 3; g.sim(.1); P.z = b0.z + 1.1; g.sim(.1); const seen = new Set();
    for (let t = 0; t < 40; t++) { seen.add(document.getElementById('toast').textContent); g.sim(.25); } // (the lines, one after another)
    const said = [...seen].join(' | ');
    g.mana(100); const deal = (() => { g.cast(0); g.sim(.05); return { mana: g.player.mana, offer: g.offer, b: g.bargain }; })();
    g.refuseBargain(); g.sim(.05); const backed = { b: g.bargain, open: g.offer.open, maxHp: P.maxHp };
    g.cast(1); g.sim(.05); const school2 = g.bargain.school, hp = P.maxHp, card = g.offer.cards[0].id;
    g.takeBargain(0); g.sim(.1); const kept = { b: g.bargain, open: g.offer.open, maxHp: P.maxHp, rank: g.boons.taken[card] };
    const before = P.mana; g.player.spellCd = [0, 0]; g.cast(0); g.sim(.05); const plain = { paid: before - P.mana, state: g.bargain.state };
    return { at, said, deal, backed, school2, hp, kept, plain };
  })()`);
  expect(r.at[0]).toBeCloseTo(0, 5);
  expect(r.at[1]).toBeLessThan(-2); // (at the circle's head)
  expect(r.said).toContain('cast a spell into it');
  expect(r.deal.mana).toBe(100);
  expect(r.deal.offer).toMatchObject({ open: true, mode: 'bargain' });
  expect(r.deal.b).toMatchObject({ state: 'open', school: 'ember' });
  expect(
    r.deal.offer.cards
      .map((c) => c.id)
      .slice(0, 2)
      .sort(),
  ).toEqual(['bankedCoals', 'flamekeeper']); // (two of its school; the third general)
  expect(r.deal.offer.cards).toHaveLength(3);
  expect(r.backed).toMatchObject({ b: { state: 'idle' }, open: false, maxHp: r.hp });
  expect(r.school2).toBe('frost');
  expect(r.kept).toMatchObject({ b: { state: 'kept' }, open: false, maxHp: r.hp - 2, rank: 1 });
  expect(r.plain.paid).toBeGreaterThan(0);
  expect(r.plain.state).toBe('kept'); // (a kept stone lets a cast go on as a cast)
  expect(errors).toEqual([]);
  // the last heart: refused
  const errors2 = await start(page, '?room=shrine_henge&spells=cinder_lance');
  const last = await page.evaluate<{ maxHp: number; state: string; open: boolean; mana: number }>(`(() => {
    const g = window.__game, P = g.player; P.invuln = 999; g.warp(1); g.sim(.5);
    g.heartsPaid = P.maxHp / 2 - 1; const b = g.bargain; P.x = b.x; P.z = b.z + 1.1; g.sim(.1);
    g.mana(100); g.cast(0); g.sim(.05);
    return { maxHp: P.maxHp, state: g.bargain.state, open: g.offer.open, mana: P.mana };
  })()`);
  expect(last).toEqual({ maxHp: 2, state: 'idle', open: false, mana: 100 }); // (refused: the cast spent on asking, nothing dealt)
  expect(errors2).toEqual([]);
});

test("a merchant's ware shows a small panel when the mage comes near (2026-10-02): what it is, its price, and why he would refuse it now", async ({
  page,
}) => {
  type GS = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    rooms(): { type: string; plan: { id: number } }[];
    player: { x: number; z: number; invuln: number; coins: number };
    current: { wares: { ware: string; x: number; z: number; price: number }[] };
    warePanel: { name: string; refused: boolean } | null;
  };
  const errors = await start(page, '?seed=SHOP&room=merchant_plain&loot=coins:12');
  const seen = await page.evaluate(() => {
    const w = (window as unknown as { __game: GS }).__game;
    w.player.invuln = 999;
    w.warp(w.rooms().find((r) => r.type === 'merchant')!.plan.id);
    w.sim(2.5, true);
    const out: { ware: string; panel: GS['warePanel'] }[] = [],
      text: string[] = [];
    for (const ware of w.current.wares) {
      w.player.x = ware.x;
      w.player.z = ware.z + 1.25;
      w.sim(0.2, true);
      out.push({ ware: ware.ware, panel: w.warePanel });
      text.push(document.getElementById('warePanel')?.textContent ?? '');
    }
    w.player.x = w.current.wares[0].x;
    w.player.z = w.current.wares[0].z + 3.5;
    w.sim(0.2, true);
    return { out, text, far: w.warePanel, shown: document.getElementById('warePanel')?.classList.contains('on') };
  });
  for (const s of seen.out) expect(s.panel?.name).toBeTruthy();
  const art = seen.out.findIndex((s) => s.ware === 'artifact');
  if (art >= 0) {
    expect(seen.out[art].panel!.refused).toBe(true);
    expect(seen.text[art]).toContain('you carry 12');
  } // (15 obols for an artifact)
  for (const t of seen.text) expect(t).toMatch(/obols|Free/);
  expect(seen.far).toBeNull();
  expect(seen.shown).toBe(false);
  expect(errors).toEqual([]);
});
