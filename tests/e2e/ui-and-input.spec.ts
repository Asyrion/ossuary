import { expect, test } from '@playwright/test';
import { type W, start, type G5, type G9, type G12 } from './helpers';

test('the inventory lists what the mage carries and knows, in tabs, and describes the chosen entry', async ({
  page,
}) => {
  const errors = await start(
    page,
    '?seed=INV1&spells=arc,pyre_seal&give=twin_staff,mana_lantern,crown_of_thorns&loot=coins:12,keys:1,glyphs:3',
  );
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G12 & { know(id: string, st: string): void };
    g.forgotten.push('rime_shards');
    g.know('rime_shards', 'learned');
  });
  const inv = page.locator('#scrInv'),
    detail = page.locator('#invDetail'),
    tiles = page.locator('#invList .tile');
  // I pauses and opens it on the artifacts: the focus first, then what was taken
  await page.keyboard.press('KeyI');
  await expect(inv).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('pause');
  await expect(tiles).toHaveCount(3);
  await expect(detail).toContainText('Twin-Headed Staff');
  await expect(detail).toContainText('2 bolts side by side');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Crown of Thorns');
  await expect(detail).toContainText('Spell damage ×1.5');
  await expect(detail.locator('.chip.bad')).toContainText('Hearts -1'); // its price
  // E turns to the spells: the two slots, the pouch of runes (empty, one sealed entry), then a book by school (a
  // school opens with its first spell learned), with a sealed entry for each spell not met yet; then the wheel of the
  // fifteen reactions (the ten and Verdant's five) and the seventeen weaves and chains
  await page.keyboard.press('KeyE');
  await expect(tiles).toHaveCount(41);
  await expect(page.locator('#invList .sec')).toHaveText([
    'Carried',
    'The pouch',
    'Ember',
    'Frost',
    'Storm',
    'Reactions',
    'Weaves and chains',
  ]);
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Pyre Seal');
  await expect(detail).toContainText('Ember spell');
  await expect(detail).toContainText('35 mana');
  await expect(detail).toContainText('Burn 4 s');
  await expect(detail).toContainText('Cast it 10 more times to know it well');
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('No runes yet'); // (the pouch, empty)
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('A page not yet found'); // Cinder Lance, not met
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(detail).toContainText('Rime Shards');
  await expect(detail).toContainText('sell its page back for 7 obols');
  // clicking a tab: the items, with their counts
  await page.locator('#invTabs button', { hasText: 'Items' }).click();
  await expect(tiles).toHaveCount(6);
  await expect(page.locator('#invList .tile .n')).toHaveText(['2', '100', '0', '12', '1', '4']); // the crown took a heart; no soul motes yet
  await tiles.nth(2).click();
  await expect(detail).toContainText('None held');
  await tiles.nth(3).click();
  await expect(detail).toContainText('Grave obol');
  // the mage's numbers
  await page.keyboard.press('KeyE');
  await expect(page.locator('#invList .tile', { hasText: 'Mana' }).first()).toContainText('of 140');
  // I closes it and the game goes on; from the pause menu it comes back to the pause menu
  await page.keyboard.press('KeyI');
  await expect(inv).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  await page.keyboard.press('Escape');
  await page.click('#btnInv');
  await expect(inv).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#scrPause')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('pause');
  await page.screenshot({ path: 'test-results/smoke-inventory.png' });
  expect(errors).toEqual([]);
});

test('the dev menu opens on its key, pauses the game, and hands out what it lists', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' })); // (on a Mac, for its key left of 1)
  const errors = await start(page, '?seed=DEVM01');
  await expect(page.locator('#devHint')).toContainText('F2'); // the key is shown on the HUD during play-tests
  await expect(page.locator('#scrTitle .controls')).toContainText('F2'); // and among the controls at the start
  // a Mac's ISO keyboard (the German one among them) reports the key left of 1 as IntlBackslash: there it opens and shuts it too
  const macKey = () =>
    page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'IntlBackslash', key: 'Dead' }))); // (Playwright has no such key: the event as a Mac's browser sends it)
  await macKey();
  await expect(page.locator('#dev')).toBeVisible();
  await macKey();
  await expect(page.locator('#dev')).toBeHidden();
  await page.keyboard.press('Backquote');
  await expect(page.locator('#dev')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('pause');
  const click = (text: string) => page.locator('#dev .dv-page:not([hidden]) button', { hasText: text }).first().click();
  const tab = (name: string) => page.locator('#dev .dv-tabs button', { hasText: name }).click();
  // in tabs: the mage's opens first
  await expect(page.locator('#dev .dv-tabs button')).toHaveText([
    'Mage',
    'Magic',
    'Foes & objects',
    'Rooms & runs',
    'Look',
    'Galleries',
    'Sound',
  ]);
  await expect(page.locator('#dev .dv-tab.on')).toHaveText('Mage');
  await click('+10 obols');
  await click('+5 keys');
  await click('Ember Sigil');
  await click('God mode');
  await click('Gilded chest');
  const got = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5 & { pickups: { gilded?: boolean }[] };
    return {
      coins: g.player.coins,
      keys: g.player.keys,
      items: g.player.items,
      gilded: g.pickups.filter((q) => q.gilded).length,
    };
  });
  expect(got).toEqual({ coins: 10, keys: 5, items: ['ember_sigil'], gilded: 1 });
  // the floor's secret room is listed, hidden until found, and the menu can open it
  await tab('Rooms & runs');
  await expect(page.locator('#dev button', { hasText: 'Secret room (hidden)' })).toBeVisible();
  await click('Open the secret room');
  await expect(page.locator('#dev button', { hasText: /^Secret room$/ })).toBeVisible();
  await expect(page.locator('#dev button', { hasText: 'Open the secret room' })).toHaveCount(0); // (open: nothing left to open)
  await page.keyboard.press('Escape'); // closes the menu (not the pause screen) and the game goes on
  await expect(page.locator('#dev')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as W).__game.state)).toBe('play');
  // a boss fight from the menu keeps what the mage carries (and the menu opens on the tab it was left on)
  await page.keyboard.press('F2');
  await expect(page.locator('#dev .dv-tab.on')).toHaveText('Rooms & runs');
  await click('The Pyre Knight');
  const boss = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G5 & { run: { boss: string } };
    return { boss: g.run.boss, items: g.player.items, coins: g.player.coins, rooms: g.rooms().length };
  });
  expect(boss).toEqual({ boss: 'pyre', items: ['ember_sigil'], coins: 10, rooms: 2 });
  // a curse to try the shrine with, and cleansing it at once
  await page.keyboard.press('F2');
  await tab('Mage');
  await click('Take a curse');
  await click('Cleanse a curse');
  const curse = await page.evaluate(() => {
    const P = (window as unknown as W).__game.player as unknown as { items: string[]; cleansed: string[] };
    return { items: P.items.length, cleansed: P.cleansed };
  });
  expect(curse.items).toBe(2);
  expect(curse.cleansed).toEqual([
    await page.evaluate(() => ((window as unknown as W).__game.player as unknown as { items: string[] }).items[1]),
  ]);
  // a spell into slot E, and endless mana
  await tab('Magic');
  await page.locator('#dev select[aria-label="Slot"]').selectOption('1');
  await click('Arc');
  await click('Endless mana');
  await page.keyboard.press('Escape'); // back to play, where mana flows
  const magic = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as G9;
    g.mana(0);
    g.sim(0.05);
    return { spells: g.player.spells, mana: g.player.mana };
  });
  expect(magic).toEqual({ spells: [null, 'arc'], mana: 100 });
  // a grimoire page dropped ahead of the mage; the floor's library is listed
  await page.keyboard.press('F2');
  await tab('Magic');
  await click('Drop a grimoire page');
  expect(
    await page.evaluate(
      () =>
        ((window as unknown as W).__game as unknown as G12).pages.filter((p) => p.kind === 'loose' && p.spell !== 'arc')
          .length,
    ),
  ).toBe(1);
  await tab('Rooms & runs');
  await click('Floor 1');
  await page.keyboard.press('F2');
  await expect(page.locator('#dev button', { hasText: /^Library/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('gamepads: every pad connected is read, so an idle one listed first hides none; a pad heard says so by name; A begins from the title, the left stick moves, LB casts, A takes on the level-up screen', async ({
  page,
}) => {
  type GP = {
    state: string;
    player: { x: number; z: number; invuln: number };
    mantle: number;
    sim(s: number): void;
    offer: { open: boolean; phase: string };
    pads: { index: number; id: string; buttons: number[] }[];
  };
  type PW = { __game: GP; __pads: { axes: number[]; buttons: { pressed: boolean }[] }[] };
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  // two pads as a browser may list them: an idle one first (an adapter, a virtual pad), then the one in hand
  await page.addInitScript(`window.__manual = true;
    const mk = (index, id) => ({ index, id, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
    window.__pads = [mk(0, 'Virtual pad'), mk(1, 'Xbox Elite Series 2 (STANDARD GAMEPAD Vendor: 045e Product: 0b00)')];
    Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => window.__pads, configurable: true });`);
  await page.goto('/?seed=PADS&level=2&autolevel=0&spells=static_mantle');
  await page.waitForFunction(() => !!(window as unknown as PW).__game, null, { timeout: 30_000 });
  const title = await page.evaluate(() => {
    const ev = new Event('gamepadconnected');
    Object.defineProperty(ev, 'gamepad', { value: (window as unknown as PW).__pads[1] });
    window.dispatchEvent(ev);
    const w = window as unknown as PW;
    w.__game.sim(1 / 60);
    return {
      state: w.__game.state,
      toast: document.getElementById('toast')?.textContent,
      pads: w.__game.pads.map((p) => p.id),
    };
  });
  expect(title.state).toBe('title');
  expect(title.toast).toContain('Xbox Elite Series 2');
  expect(title.toast).toContain('A or Start');
  expect(title.pads).toHaveLength(2);
  const play = await page.evaluate(() => {
    // A on the second pad begins
    const w = window as unknown as PW,
      a = w.__pads[1].buttons[0];
    a.pressed = true;
    w.__game.sim(1 / 60);
    const state = w.__game.state;
    a.pressed = false;
    w.__game.sim(1 / 60);
    w.__game.player.invuln = 999;
    return state;
  });
  expect(play).toBe('play');
  // the level waiting opens its screen; A takes the boon (after the lock), then the point
  const levelled = await page.evaluate(() => {
    const w = window as unknown as PW;
    for (let k = 0; k < 200 && !w.__game.offer.open; k++) w.__game.sim(1 / 60);
    return w.__game.offer;
  });
  expect(levelled).toMatchObject({ open: true, phase: 'boon' });
  const pressA = () =>
    page.evaluate(() => {
      const w = window as unknown as PW,
        a = w.__pads[1].buttons[0];
      a.pressed = true;
      w.__game.sim(1 / 60);
      a.pressed = false;
      w.__game.sim(1 / 60);
      return w.__game.offer;
    });
  await page.waitForTimeout(450);
  expect((await pressA()).phase).toBe('point');
  await page.waitForTimeout(450);
  expect((await pressA()).open).toBe(false);
  // the left stick of the second pad moves the mage while the first lies idle; LB casts the spell in the first slot
  const moved = await page.evaluate(() => {
    const w = window as unknown as PW,
      g = w.__game,
      x0 = g.player.x;
    w.__pads[1].axes[0] = 1;
    g.sim(0.5);
    w.__pads[1].axes[0] = 0;
    g.sim(1 / 60);
    const lb = w.__pads[1].buttons[4];
    lb.pressed = true;
    g.sim(1 / 60);
    lb.pressed = false;
    g.sim(0.1);
    return { dx: g.player.x - x0, state: g.state, mantle: g.mantle };
  });
  expect(moved.state).toBe('play');
  expect(moved.dx).toBeGreaterThan(1);
  expect(moved.mantle).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the minimap marks finished rooms: been in, the fight won, nothing left to take; an obol left lying unmarks it until it is taken', async ({
  page,
}) => {
  type GM = {
    sim(s: number, draw?: boolean): void;
    drop(kind: string, x?: number, z?: number): void;
    finished: number[];
    current: { plan: { id: number } };
    player: { x: number; z: number; invuln: number };
  };
  const errors = await start(page, '?seed=MAPS');
  const marks = await page.evaluate(() => {
    const w = (window as unknown as { __game: GM }).__game;
    w.player.invuln = 999;
    w.sim(0.5);
    const id = w.current.plan.id,
      before = w.finished.includes(id);
    w.drop('coin', w.player.x + 3, w.player.z);
    w.sim(0.6);
    const lying = w.finished.includes(id);
    w.player.x += 3;
    w.sim(1.5);
    const taken = w.finished.includes(id);
    return { before, lying, taken };
  });
  expect(marks).toEqual({ before: true, lying: false, taken: true });
  expect(errors).toEqual([]);
});
