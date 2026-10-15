import { expect, test } from '@playwright/test';
import { start } from './helpers';

test('?runes carves two runes into a slot (a + in the address reaches the page as a space)', async ({ page }) => {
  const errors = await start(page, '?seed=RUNES3&spells=arc,cinder_lance&runes=q:quicken+vein,e:reprise+quicken');
  const got = await page.evaluate(() =>
    (
      window as unknown as { __game: { sockets: { slots: { size: number; runes: string[] }[] } } }
    ).__game.sockets.slots.map((s) => ({ size: s.size, runes: s.runes })),
  );
  expect(got).toEqual([
    { size: 2, runes: ['quicken', 'vein'] },
    { size: 2, runes: ['reprise', 'quicken'] },
  ]);
  expect(errors).toEqual([]);
});

test('runes on the cast: Quicken sooner and dearer on the HUD and in the cast, Lasting holds longer, Wide reaches further, Vein bleeds but never the last half heart, a spell given up sends its runes to the pouch, a runed spell still comes to be known well', async ({
  page,
}) => {
  type Def = { mana: number; cooldown: number; damage: number; params: Record<string, number> };
  type GR = {
    sim(s: number, draw?: boolean): void;
    cast(slot: number): boolean;
    mana(n: number): void;
    learn(id: string, slot: number): void;
    spawn(kind: string): void;
    socket(slot: number, id: string | null, size?: number): string | null;
    mantle: number;
    knowledge: Record<string, string>;
    sockets: {
      slots: { spell: string | null; size: number; runes: string[]; def: Def | null }[];
      pouch: string[];
      acted: Record<string, number>;
      said: string[];
    };
    player: {
      x: number;
      z: number;
      hp: number;
      maxHp: number;
      mana: number;
      invuln: number;
      spellCd: number[];
      souls: unknown[];
    };
    enemies: { type: string; x: number; z: number; status?: Record<string, number> }[];
    run: { hinted: Set<string> };
  };
  const errors = await start(page, '?seed=RUNES&spells=rime_shards,static_mantle&runes=q:quicken,e:lasting');
  // Quicken: ready 30% sooner for 20% more mana, on the slot and in the cast; Lasting: the mantle holds half again as long
  const quick = await page.evaluate(() => {
    const w = (window as unknown as { __game: GR }).__game;
    w.player.invuln = 999;
    w.sim(0.1);
    const before = { ...w.sockets.slots[0] },
      small = document.querySelector('#slot0 small')?.textContent;
    w.mana(60);
    w.cast(0);
    const after = { mana: w.player.mana, cd: w.player.spellCd[0] };
    w.cast(1);
    w.sim(0.1, true);
    const pips = [0, 1].map((i) =>
        [...document.querySelectorAll(`#slot${i} .pips i`)].map((p) => p.className || 'carved'),
      ),
      hands = (w as unknown as { spellMarks: { hands: ({ specks: number } | null)[] } }).spellMarks.hands.map(
        (h) => h?.specks,
      );
    return { before, small, after, mantle: w.mantle, sockets: w.sockets, pips, hands };
  });
  expect(quick.pips).toEqual([['carved'], ['carved']]);
  expect(quick.hands).toEqual([1, 1]); // (a pip on each slot, a speck at each hand)
  expect(quick.before.runes).toEqual(['quicken']);
  expect(quick.before.def).toMatchObject({ mana: 18, cooldown: 1.05 });
  expect(quick.small).toBe('18');
  expect(quick.after.cd).toBeCloseTo(1.05, 2);
  expect(quick.after.mana).toBeCloseTo(60 - 18, 5);
  expect(quick.sockets.slots[1].def!.params.life).toBe(9);
  expect(quick.mantle).toBeGreaterThan(8.7);
  expect(quick.sockets.said).toEqual(expect.arrayContaining(['rune:quicken', 'rune:lasting']));
  expect(quick.sockets.acted['rune:quicken']).toBe(1);
  // a spell given up: its rune goes to the pouch, the socket stays; Wide: the seal's ring half again as wide reaches a dummy 2.4 tiles off
  const wide = await page.evaluate(() => {
    const w = (window as unknown as { __game: GR }).__game;
    w.sim(10);
    w.learn('pyre_seal', 0);
    const pouch = [...w.sockets.pouch],
      socket = w.sockets.slots[0];
    w.spawn('dummy');
    w.sim(0.1);
    const d = w.enemies.find((e) => e.type === 'dummy')!;
    const seal = () => {
      d.x = w.player.x + 2.4;
      d.z = w.player.z;
      if (d.status) d.status.burn = 0;
      w.player.spellCd[0] = 0;
      w.mana(60);
      w.cast(0);
      w.sim(1.15);
      return d.status?.burn ?? 0;
    };
    const plain = seal();
    w.sim(6);
    w.socket(0, 'wide');
    const widened = seal();
    return { pouch, socket, plain, widened, radius: w.sockets.slots[0].def!.params.radius };
  });
  expect(wide.pouch).toEqual(['quicken']);
  expect(wide.socket).toMatchObject({ spell: 'pyre_seal', size: 1, runes: [] });
  expect(wide.radius).toBeCloseTo(2.7, 2);
  expect(wide.plain).toBe(0);
  expect(wide.widened).toBeGreaterThan(0);
  // Vein: short of mana, it takes what there is and half a heart; never the last half heart (its line says so, once)
  const vein = await page.evaluate(() => {
    const w = (window as unknown as { __game: GR }).__game;
    w.sim(6);
    w.learn('arc', 1);
    w.socket(1, 'vein');
    w.player.souls.length = 0;
    w.player.hp = w.player.maxHp;
    w.mana(5);
    w.player.spellCd[1] = 0;
    const learned = w.knowledge.arc,
      hp0 = w.player.hp,
      cast = w.cast(1),
      paid = { hp: w.player.hp, mana: w.player.mana, cast };
    w.player.hp = 1;
    w.mana(5);
    w.player.spellCd[1] = 0;
    const refused = w.cast(1);
    return {
      learned,
      hp0,
      paid,
      refused,
      hpLast: w.player.hp,
      said: w.sockets.said,
      hinted: w.run.hinted.has('rune:veinLast'),
      toast: document.getElementById('toast')?.textContent,
      pouch: w.sockets.pouch,
    };
  });
  expect(vein.paid).toEqual({ hp: vein.hp0 - 1, mana: 0, cast: true });
  expect(vein.refused).toBe(false);
  expect(vein.hpLast).toBe(1);
  expect(vein.said).toContain('rune:vein');
  expect(vein.hinted).toBe(true);
  expect(vein.pouch).toEqual(['quicken', 'lasting']); // (the mantle given up for Arc sent its Lasting there)
  expect(vein.learned).toBe('learned'); // (carved, but not yet used: Upgraded waits for the tenth cast)
  // the tenth cast of a runed spell: known well, and its stage Upgraded
  const known = await page.evaluate(() => {
    const w = (window as unknown as { __game: GR }).__game;
    w.player.hp = w.player.maxHp;
    let said = '';
    for (let k = 0; k < 15 && w.knowledge.arc === 'learned'; k++) {
      w.mana(60);
      w.player.spellCd[1] = 0;
      w.cast(1);
      said = document.getElementById('toast')?.textContent ?? '';
      w.sim(0.05);
    }
    return { stage: w.knowledge.arc, said };
  });
  expect(known.stage).toBe('upgraded');
  expect(known.said).toContain('well now');
  expect(errors).toEqual([]);
});

test('runes on the bolts and the second cast: Thrice fires three (fifteen shards), only the middle carrying statuses; Seeking bends a bolt into a foe off the line and lets the hands reach further; Reprise strikes again, its holy ground mends nothing, its toll marks a second foe, two lances show at once', async ({
  page,
}) => {
  type Foe = { type: string; x: number; z: number; dead?: boolean; toll?: unknown; status?: Record<string, number> };
  type GT = {
    sim(s: number, draw?: boolean): void;
    cast(slot: number, aim?: { x: number; z: number }): boolean;
    mana(n: number): void;
    learn(id: string, slot: number): void;
    spawn(kind: string): void;
    socket(slot: number, id: string | null): string | null;
    givePotion(id: string): void;
    usePotion(how: string): void;
    sockets: { acted: Record<string, number> };
    spellFx: { lances: number };
    bolts: { spell?: boolean; status?: Record<string, number>; damage: number }[];
    player: { x: number; z: number; hp: number; maxHp: number; invuln: number; spellCd: number[] };
    enemies: Foe[];
    current: { cx: number; cz: number };
  };
  const errors = await start(page, '?seed=RUNES2&spells=hex_bolt,rime_shards&runes=q:thrice,e:thrice');
  const r = await page.evaluate(() => {
    const w = (window as unknown as { __game: GT }).__game,
      N = { x: 0, z: -1 };
    const ready = (slot: number) => {
      w.player.spellCd[slot] = 0;
      w.mana(100);
    };
    const home = () => {
      w.player.x = w.current.cx;
      w.player.z = w.current.cz + 3;
    };
    w.player.invuln = 999;
    home();
    w.sim(0.2);
    const spellBolts = () => w.bolts.filter((b) => b.spell);
    // Thrice
    ready(0);
    w.cast(0, N);
    const hex = spellBolts().map((b) => ({ hex: b.status?.hex ?? 0, damage: b.damage }));
    w.sim(2);
    ready(1);
    w.cast(1, N);
    const shards = spellBolts().length;
    w.sim(2);
    // Seeking: a Hex Bolt cast north past a dummy a tile and a half to the side
    w.socket(0, null);
    w.spawn('dummy');
    w.sim(0.1);
    const d = w.enemies.find((e) => e.type === 'dummy')!;
    const shoot = () => {
      home();
      d.x = w.player.x + 1.5;
      d.z = w.player.z - 4;
      if (d.status) d.status.hex = 0;
      ready(0);
      w.cast(0, N);
      w.sim(1.6);
      return d.status?.hex ?? 0;
    };
    const straight = shoot();
    w.socket(0, 'seeking');
    const seeking = shoot();
    // the Grasp's hands with Seeking: a foe 5.5 tiles ahead is out of their reach without it
    w.learn('grasp_of_the_grave', 1);
    const grasp = () => {
      home();
      d.x = w.player.x;
      d.z = w.player.z - 5.5;
      if (d.status) d.status.root = 0;
      ready(1);
      w.cast(1, N);
      w.sim(0.6);
      const rooted = d.status?.root ?? 0;
      w.sim(3);
      return rooted;
    };
    const near = grasp();
    w.socket(1, 'seeking');
    const far = grasp();
    // Reprise: Arc comes again; Consecrate's second ground mends nothing; the Toll's marks a second foe
    w.learn('arc', 0);
    w.socket(0, 'reprise');
    home();
    d.x = w.player.x;
    d.z = w.player.z - 2;
    ready(0);
    w.cast(0, N);
    w.sim(0.8);
    const reprised = w.sockets.acted['rune:reprise'] ?? 0;
    w.learn('consecrate', 1);
    w.socket(1, 'reprise');
    w.player.hp = w.player.maxHp - 2;
    ready(1);
    w.cast(1, N);
    w.sim(1.2);
    const mended = w.player.maxHp - w.player.hp;
    w.spawn('dummy');
    w.sim(0.1);
    const d2 = w.enemies.filter((e) => e.type === 'dummy')[1];
    d2.x = d.x + 1.2;
    d2.z = d.z;
    w.learn('ferrymans_toll', 0);
    w.socket(0, 'reprise');
    ready(0);
    w.cast(0, N);
    w.sim(0.8);
    const tolled = w.enemies.filter((e) => e.type === 'dummy' && e.toll).length;
    // two lances at once: the Philter of Echoes and Reprise with the Cinder Lance
    w.learn('cinder_lance', 1);
    w.socket(1, 'reprise');
    w.givePotion('echoes');
    w.usePotion('drink');
    w.sim(0.2);
    ready(1);
    w.cast(1, N);
    let lances = 0;
    for (let k = 0; k < 45; k++) {
      w.sim(1 / 60);
      lances = Math.max(lances, w.spellFx.lances);
    }
    return { hex, shards, straight, seeking, near, far, reprised, mended, tolled, lances, acted: w.sockets.acted };
  });
  expect(r.hex.map((b) => b.hex)).toEqual([0, 2, 0]);
  for (const b of r.hex) expect(b.damage).toBeCloseTo(2.8, 1);
  expect(r.shards).toBe(15);
  expect(r.straight).toBe(0);
  expect(r.seeking).toBeGreaterThan(0);
  expect(r.near).toBe(0);
  expect(r.far).toBeGreaterThan(0);
  expect(r.reprised).toBeGreaterThanOrEqual(1);
  expect(r.mended).toBe(1);
  expect(r.tolled).toBe(2);
  expect(r.lances).toBeGreaterThanOrEqual(2);
  expect(Object.keys(r.acted)).toEqual(expect.arrayContaining(['rune:thrice', 'rune:seeking', 'rune:reprise']));
  expect(errors).toEqual([]);
});

/* The school boons at work. Each case starts its own run with `?boons=`, sets the boon off through the game's own
   hooks, and checks what it did, that its name rose (`said`), its line was said once (`hinted`) and, where cheap, rank II.
   (Written as strings: the page's own JavaScript, `window.__game` untyped. Eight dummies stand in a 4 × 2 block, each
   within a leap of another.) */

test('runes as things: a rune walked over goes to the pouch with its card, the merchant sells one at 10 obols as an extra ware, a runed spell given up for a page sends its rune to the pouch, the inventory shows the sockets and the pouch', async ({
  page,
}) => {
  type Ware = { ware: string; x: number; z: number; price: number; sold: boolean; rune?: string };
  type GR = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    drop(kind: string, x?: number, z?: number, o?: { rune?: string }): void;
    runesAlways(on: boolean): void;
    page(id?: string, x?: number, z?: number): string | null;
    cast(slot: number): boolean;
    runeOdds: Record<string, number>;
    sockets: { slots: { spell: string | null; size: number; runes: string[] }[]; pouch: string[] };
    keys: Set<string>;
    player: { x: number; z: number; vx: number; vz: number; coins: number; invuln: number; spells: (string | null)[] };
    current: { cx: number; cz: number; wares?: Ware[] };
  };
  const errors = await start(page, '?room=merchant_plain&seed=RUNES8&spells=cinder_lance&loot=coins:30');
  // the odds here (floor 1), a rune dropped and walked over: into the pouch, a chime, its card
  const found = await page.evaluate(() => {
    const g = (window as unknown as { __game: GR }).__game,
      P = g.player;
    P.invuln = 999;
    g.sim(0.2);
    const odds = g.runeOdds;
    g.drop('rune', P.x, P.z - 1.2, { rune: 'seeking' });
    g.sim(0.2);
    P.z -= 1.2;
    g.sim(0.3);
    return { odds, pouch: [...g.sockets.pouch], lore: document.querySelector('#lore')?.textContent ?? '' };
  });
  expect(found.odds).toMatchObject({ merchant: 0.5, secret: 0.5, wanderer: 0.5, gilded: 1 });
  expect(found.pouch).toEqual(['seeking']);
  expect(found.lore).toContain('Seeking');
  expect(found.lore).toContain('Rune');
  expect(found.lore).toContain('waystone');
  // the merchant: with runes wherever they can lie, the shop lays one beside the rest; bought for 10 obols into the pouch
  const shop = await page.evaluate(() => {
    const g = (window as unknown as { __game: GR }).__game,
      P = g.player;
    g.runesAlways(true);
    g.warp(1);
    g.sim(0.5);
    const wares = g.current.wares!,
      w = wares.find((x) => x.ware === 'rune')!,
      coins = P.coins;
    P.x = w.x;
    P.z = w.z + 1.6;
    P.vx = P.vz = 0;
    g.keys.add('KeyW');
    g.sim(0.6);
    g.keys.delete('KeyW');
    g.sim(0.2);
    P.z += 1.6;
    g.sim(0.1);
    g.runesAlways(false);
    return {
      n: wares.length,
      last: wares[wares.length - 1].ware,
      price: w.price,
      rune: w.rune,
      spent: coins - P.coins,
      sold: w.sold,
      pouch: [...g.sockets.pouch],
    };
  });
  expect(shop.last).toBe('rune');
  expect(shop.n).toBeGreaterThanOrEqual(4);
  expect(shop.price).toBe(10);
  expect(shop.spent).toBe(10);
  expect(shop.sold).toBe(true);
  expect(shop.pouch).toEqual(['seeking', shop.rune]);
  expect(errors).toEqual([]);
  // a runed spell given up for a grimoire page: its rune goes to the pouch, the socket stays
  const errors2 = await start(page, '?room=library_plain&seed=RUNES8&spells=cinder_lance,arc&runes=q:quicken');
  const swap = await page.evaluate(() => {
    const g = (window as unknown as { __game: GR }).__game,
      P = g.player;
    P.invuln = 999;
    g.sim(0.2);
    g.page('rime_shards', P.x, P.z - 1.2);
    g.sim(0.2);
    P.z -= 1.2;
    g.sim(0.3);
    g.cast(0);
    g.sim(0.3);
    return {
      spells: [...P.spells],
      pouch: [...g.sockets.pouch],
      socket: g.sockets.slots[0],
      line: document.querySelector('#line')?.textContent ?? document.body.textContent,
    };
  });
  expect(swap.spells).toEqual(['rime_shards', 'arc']);
  expect(swap.pouch).toEqual(['quicken']);
  expect(swap.socket).toMatchObject({ size: 1, runes: [] });
  // the inventory's Spells tab: each slot's socket, then the pouch
  await page.keyboard.press('KeyI');
  await page.locator('#invTabs button', { hasText: 'Spells' }).click();
  await expect(page.locator('#invList .sec', { hasText: 'The pouch' })).toBeVisible();
  await expect(page.locator('#invList .tile[title="Quicken"]')).toBeVisible();
  await expect(page.locator('#invList .tile[title="Rime Shards"] .n')).toHaveText('◇');
  await page.locator('#invList .tile[title="Quicken"]').click();
  await expect(page.locator('#invDetail')).toContainText('A waystone carves it');
  await page.keyboard.press('KeyI');
  expect(errors2).toEqual([]);
});
