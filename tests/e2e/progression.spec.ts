import { expect, test } from '@playwright/test';
import { start } from './helpers';

test("insight and levels: a foe put to rest pays its purse as a streak to the hand, a fight's first clear and a boss pay theirs, levels rise and wait, the HUD shows them, a potion and the Grave Draught pay, ?level starts higher and the end screen says it", async ({
  page,
}) => {
  type GI = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    clearRoom(): void;
    spawn(kind: string, x?: number, z?: number): { maxHp: number };
    hit(i: number, dmg: number): void;
    enemies: unknown[];
    rooms(): { type: string; cleared: boolean; plan: { id: number } }[];
    descend(): void;
    usePotion(how: string): boolean;
    insight: {
      insight: number;
      level: number;
      pending: number;
      next: number;
      cap: number;
      potionsUsed: string[];
      streaks: number;
    };
    giveInsight(n: number): void;
    setLevel(n: number): void;
    player: { x: number; z: number; invuln: number };
  };
  const errors = await start(page, '?seed=INSIGHT');
  const got = await page.evaluate(() => {
    const g = (window as unknown as { __game: GI }).__game;
    g.player.invuln = 999;
    g.sim(0.3);
    const at0 = g.insight.insight,
      foe = g.spawn('sporeling');
    g.sim(0.8);
    g.hit(g.enemies.length - 1, 999);
    g.sim(0.05);
    const purse = g.insight.insight - at0,
      streaks = g.insight.streaks,
      said = document.getElementById('toast')?.textContent ?? '';
    g.sim(1);
    const landed = g.insight.streaks;
    const fight = g.rooms().find((r) => r.type === 'normal' && !r.cleared)!;
    g.warp(fight.plan.id);
    g.sim(0.6);
    const at1 = g.insight.insight;
    g.clearRoom();
    g.sim(0.2);
    const clear = g.insight.insight - at1;
    g.clearRoom();
    const twice = g.insight.insight - at1; // (a room pays its clear once)
    const boss = g.rooms().find((r) => r.type === 'boss')!;
    g.warp(boss.plan.id);
    g.sim(1.2);
    const at2 = g.insight.insight;
    g.clearRoom();
    g.sim(0.2);
    const bossPaid = g.insight.insight - at2;
    const lv = g.insight;
    g.giveInsight(lv.next + 0.5);
    g.sim(0.2);
    return {
      purse,
      hp: foe.maxHp,
      streaks,
      landed,
      said,
      clear,
      twice,
      bossPaid,
      before: lv,
      after: g.insight,
      badge: document.querySelector('#level b')?.textContent,
      strip: (document.querySelector('#insight i') as HTMLElement).style.transform,
    };
  });
  expect(got.purse).toBeCloseTo(got.hp / 4, 3);
  expect(got.streaks).toBeGreaterThan(0);
  expect(got.landed).toBe(0);
  expect(got.said).toContain('insight');
  expect(got.clear).toBe(4);
  expect(got.twice).toBe(4);
  expect(got.bossPaid).toBe(60);
  expect(got.after.level).toBe(got.before.level + 1);
  expect(got.after.pending).toBe(got.before.pending + 1);
  expect(got.badge).toBe(String(got.after.level));
  expect(got.strip).toMatch(/scaleX\(0\.0/);
  // a potion's first use and the Grave Draught's sip; the end screen says the level reached
  errors.push(...(await start(page, '?room=library_plain&potions=graveDraught,healing&level=5&seed=PROG1')));
  const potions = await page.evaluate(() => {
    const g = (window as unknown as { __game: GI }).__game;
    g.sim(0.3);
    const start = g.insight;
    g.usePotion('drink');
    g.sim(0.2);
    const sip = g.insight.insight - start.insight;
    g.usePotion('drink');
    g.sim(0.2);
    const healing = g.insight.insight - start.insight - sip;
    g.descend();
    return { start, sip, healing, used: g.insight.potionsUsed, end: document.getElementById('endLevel')?.textContent };
  });
  expect(potions.start).toMatchObject({ level: 5, pending: 4 });
  expect(potions.sip).toBe(15 + 4); // (15 × floor 1 for the sip, 4 for the kind's first use)
  expect(potions.healing).toBe(4);
  expect(potions.used.sort()).toEqual(['graveDraught', 'healing']);
  expect(potions.end).toMatch(/^5 \(/);
  expect(errors).toEqual([]);
});

test("attributes: a level's point spent on Vigor, Will, Arcana or Swiftness changes the numbers and says so; two in Vigor draw a half container; points are only the levels'; a shock's leap carries the spell's multiplier once", async ({
  page,
}) => {
  type GA = {
    sim(s: number, draw?: boolean): void;
    spend(a: string, free?: boolean): boolean;
    attrs: Record<string, number>;
    spawn(kind: string, x?: number, z?: number): { hp: number };
    hit(i: number, dmg: number, school?: string, by?: string): void;
    enemies: unknown[];
    inflict(s: object): void;
    give(...ids: string[]): void;
    player: {
      x: number;
      z: number;
      hp: number;
      maxHp: number;
      mana: number;
      invuln: number;
      stats: { maxMana: number; spellDamage: number; speed: number; fireDelay: number; regenMul: number };
    };
  };
  const errors = await start(page, '?seed=ATTRS&level=5');
  const got = await page.evaluate(() => {
    const g = (window as unknown as { __game: GA }).__game,
      P = g.player;
    g.sim(0.5);
    const start = {
      free: g.attrs.free,
      maxHp: P.maxHp,
      maxMana: P.stats.maxMana,
      spell: P.stats.spellDamage,
      speed: P.stats.speed,
      delay: P.stats.fireDelay,
    };
    g.spend('vigor');
    g.spend('vigor');
    g.sim(0.1);
    const hearts = [...document.querySelectorAll('#hearts svg:not(.soul)')].map((s) => s.classList.contains('half'));
    const mana0 = P.mana;
    g.spend('will');
    const will = { max: P.stats.maxMana, mana: P.mana - mana0, regen: P.stats.regenMul };
    g.spend('arcana');
    const spell = P.stats.spellDamage,
      left = g.attrs.free,
      refused = g.spend('swiftness');
    g.spend('swiftness', true); // (the dev menu's: without a level's point)
    return {
      start,
      hp: P.hp,
      maxHp: P.maxHp,
      hearts,
      will,
      spell,
      left,
      refused,
      speed: P.stats.speed,
      delay: P.stats.fireDelay,
      after: g.attrs,
    };
  });
  expect(got.start.free).toBe(4);
  expect(got.maxHp).toBe(got.start.maxHp + 1);
  expect(got.hp).toBe(got.maxHp); // (the half container comes filled)
  expect(got.hearts).toEqual([false, false, false, true]);
  expect(got.will).toEqual({ max: got.start.maxMana + 10, mana: 10, regen: 1.05 });
  expect(got.spell).toBeCloseTo(got.start.spell * 1.06);
  expect(got.left).toBe(0);
  expect(got.refused).toBe(false);
  expect(got.speed).toBeCloseTo(got.start.speed * 1.03);
  expect(got.delay).toBeCloseTo(got.start.delay * 0.97);
  expect(got.after).toMatchObject({ vigor: 2, will: 1, arcana: 1, swiftness: 1, free: 0 });
  // a shocked foe struck by a spell passes half the blow on, the Crown of Thorns' ×1.5 applied once, at the foe it leaps to
  errors.push(...(await start(page, '?seed=LEAP&give=crown_of_thorns')));
  const leap = await page.evaluate(() => {
    const g = (window as unknown as { __game: GA }).__game,
      P = g.player;
    P.invuln = 999;
    g.sim(0.3);
    const a = g.spawn('rotling', P.x - 0.6, P.z - 2.5),
      b = g.spawn('rotling', P.x + 0.6, P.z - 2.5);
    g.sim(0.8);
    g.inflict({ shock: 1 });
    const hp = b.hp;
    g.hit(g.enemies.indexOf(a), 4, 'storm', 'spell');
    return { lost: hp - b.hp, mul: P.stats.spellDamage };
  });
  expect(leap.mul).toBeCloseTo(1.5);
  expect(leap.lost).toBeCloseTo(4 * 0.5 * 1.5); // (the ×1.5 comes once, not twice)
  expect(errors).toEqual([]);
});

test('boons: a deal of three leans to the build, a school boon taken before its spells pledges the next library (which keeps it), Tempered gives points, casts count', async ({
  page,
}) => {
  type GB = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    deal(): { id: string; rank: number; lean: boolean }[];
    giveBoon(id: string): boolean;
    boons: { taken: Record<string, number>; pledge: string | null; casts: Record<string, number> };
    attrs: { free: number };
    pages: { spell: string; kind: string }[];
    learn(id: string, slot: number): void;
    cast(slot: number): boolean;
    mana(v?: number): number;
    player: { invuln: number };
  };
  const errors = await start(page, '?seed=BOON1&room=library_plain');
  const got = await page.evaluate(() => {
    const g = (window as unknown as { __game: GB }).__game;
    g.player.invuln = 999;
    g.sim(0.5);
    const first = g.deal(),
      again = g.deal();
    g.giveBoon('seedfall');
    g.sim(0.1);
    const pledged = {
      pledge: g.boons.pledge,
      said: document.getElementById('toast')?.textContent ?? '',
      card: document.getElementById('loreName')?.textContent,
    };
    g.giveBoon('tempered');
    const free = g.attrs.free;
    g.warp(1);
    g.sim(0.6);
    const lecterns = g.pages.filter((p) => p.kind === 'lectern').map((p) => p.spell);
    g.learn('static_mantle', 0);
    g.mana(200);
    g.cast(0);
    g.sim(0.2);
    g.learn('arc', 1); // (a Storm spell in both slots: attuned; the mantle needs no foe)
    const leaning = Array.from({ length: 8 }, () => g.deal()).flat();
    return { first, again, pledged, free, lecterns, after: g.boons, leaning };
  });
  expect(got.first).toHaveLength(3);
  expect(new Set(got.first.map((c) => c.id)).size).toBe(3);
  expect(got.again).not.toEqual(got.first); // (each deal its own draw)
  expect(got.pledged.pledge).toBe('verdant');
  expect(got.pledged.said).toContain('Verdant');
  expect(got.pledged.card).toBe('Seedfall');
  expect(got.free).toBe(3);
  expect(got.lecterns.some((id) => ['thorn_snare', 'pollen_cloud', 'living_wall'].includes(id))).toBe(true);
  expect(got.after.pledge).toBeNull();
  expect(got.after.casts.storm).toBe(1);
  const storm = got.leaning.filter((c) => ['forkingArc', 'sparkWake'].includes(c.id));
  expect(storm.length).toBe(16);
  expect(storm.every((c) => c.lean)).toBe(true); // (attuned: both school cards of every deal are Storm's)
  expect(errors).toEqual([]);
});

test("the level-up screen: a level waits for the fight to be won, then the game pauses for three boons and a point; a key held from the fight can't choose, Esc doesn't close it, each level waiting comes in turn", async ({
  page,
}) => {
  type GL = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    clearRoom(): void;
    state: string;
    rooms(): { type: string; cleared: boolean; plan: { id: number } }[];
    offer: {
      open: boolean;
      phase: string;
      level: number;
      pending: number;
      chosen: number;
      cards: { id: string; rank: number; lean: boolean }[];
    };
    boons: { taken: Record<string, number> };
    attrs: Record<string, number>;
    giveInsight(n: number): void;
    insight: { next: number; pending: number };
    player: { invuln: number };
  };
  const errors = await start(page, '?seed=LVUP&level=3&autolevel=0');
  const g = () => page.evaluate(() => (window as unknown as { __game: GL }).__game.offer);
  const locked = await page.evaluate(() => {
    // (opened, and Enter at once, as a key mashed from the fight would: locked, it takes nothing)
    const w = (window as unknown as { __game: GL }).__game;
    w.player.invuln = 999;
    for (let k = 0; k < 200 && !w.offer.open; k++) w.sim(1 / 60);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    return w.offer.phase;
  });
  expect(locked).toBe('boon');
  const first = await g();
  expect(first).toMatchObject({ open: true, phase: 'boon', level: 2, pending: 2 });
  expect(first.cards).toHaveLength(3);
  expect(await page.evaluate(() => (window as unknown as { __game: GL }).__game.state)).toBe('pause');
  expect(await page.locator('#scrLevel').isVisible()).toBe(true);
  await page.waitForTimeout(450);
  await page.keyboard.press('Escape');
  expect((await g()).open).toBe(true);
  await page.keyboard.press('ArrowRight');
  expect((await g()).chosen).toBe(1);
  await page.keyboard.press('Enter');
  const taken = await page.evaluate(() => (window as unknown as { __game: GL }).__game.boons.taken);
  expect(Object.keys(taken)).toContain(first.cards[1].id);
  expect((await g()).phase).toBe('point');
  await page.waitForTimeout(450);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter'); // (Will)
  const second = await g();
  expect(second).toMatchObject({ open: true, phase: 'boon', level: 3, pending: 1 });
  await page.waitForTimeout(450);
  await page.click('#lvCards .lvCard[data-i="0"]');
  await page.waitForTimeout(450);
  await page.keyboard.press('Enter'); // (Vigor)
  const after = await page.evaluate(() => {
    const w = (window as unknown as { __game: GL }).__game;
    return { offer: w.offer, state: w.state, attrs: w.attrs, badge: document.getElementById('level')?.className };
  });
  expect(after.offer).toMatchObject({ open: false, pending: 0 });
  expect(after.state).toBe('play');
  expect(after.attrs).toMatchObject({ will: 1, vigor: 1, free: 0 });
  expect(after.badge).not.toContain('waits');
  // a level reached in a fight waits for its end, its badge glowing and a line saying so the first time
  const fight = await page.evaluate(() => {
    const w = (window as unknown as { __game: GL }).__game,
      room = w.rooms().find((r) => r.type === 'normal' && !r.cleared)!;
    w.warp(room.plan.id);
    w.sim(0.6);
    w.giveInsight(w.insight.next + 1);
    w.sim(1.5);
    const during = {
      open: w.offer.open,
      pending: w.insight.pending,
      badge: document.getElementById('level')?.className,
      said: (w as unknown as { run: { hinted: Set<string> } }).run.hinted.has('levelWaits'),
    };
    w.clearRoom();
    w.sim(1.2);
    return { during, open: w.offer.open };
  });
  expect(fight.during).toMatchObject({ open: false, pending: 1 });
  expect(fight.during.badge).toContain('waits');
  expect(fight.during.said).toBe(true); // (its line raised: it shows after the line before it)
  expect(fight.open).toBe(true);
  expect(errors).toEqual([]);
});

test("Tempered and the boons taken: a level's screen spends every point it owes, Tempered's three too, and the inventory's mage tab lists the boons", async ({
  page,
}) => {
  const errors = await start(page, '?seed=TEMP&level=2&autolevel=0&boons=tempered,deepWinter');
  const w = () =>
    page.evaluate(() => {
      const g = (
        window as unknown as { __game: { offer: { open: boolean; phase: string }; attrs: Record<string, number> } }
      ).__game;
      return { open: g.offer.open, phase: g.offer.phase, attrs: g.attrs };
    });
  await page.evaluate(() => {
    const g = (
      window as unknown as { __game: { sim(s: number): void; offer: { open: boolean }; player: { invuln: number } } }
    ).__game;
    g.player.invuln = 999;
    for (let k = 0; k < 200 && !g.offer.open; k++) g.sim(1 / 60);
  });
  expect((await w()).open).toBe(true);
  await page.waitForTimeout(450);
  await page.keyboard.press('Enter'); // (a card)
  const presses: string[] = [];
  for (let k = 0; k < 8 && (await w()).open; k++) {
    presses.push((await w()).phase);
    await page.waitForTimeout(450);
    await page.keyboard.press('Enter');
  }
  const after = await w();
  expect(after.open).toBe(false);
  expect(after.attrs.free).toBe(0);
  const spent = ['vigor', 'arcana', 'will', 'swiftness'].reduce((n, k) => n + after.attrs[k], 0);
  expect(spent).toBeGreaterThanOrEqual(4);
  expect(presses.every((p) => p === 'point')).toBe(true); // (the level's own point and Tempered's three, on one screen)
  await page.keyboard.press('KeyI');
  for (let k = 0; k < 4; k++) await page.keyboard.press('KeyE');
  const list = (await page.locator('#invList').innerText()).toLowerCase(); // (section labels are set in capitals)
  expect(list).toContain('boons');
  expect(list).toContain('tempered');
  expect(list).toContain('deep winter');
  expect(errors).toEqual([]);
});

test("the general boons: Keen Nose knows a potion by smell, Scavenger takes a reagent from a foe struck by its weakness, Brewer's Breath breathes the throw out sparing the mage, Afterglow carries a spell into the cantrip", async ({
  page,
}) => {
  const errors = await start(page, '?seed=BOON6');
  const got = await page.evaluate<{
    nose: boolean[];
    reap: number[];
    reapSaid: boolean;
    breath: { ground: number; burning: boolean; said: boolean; hurt: number; healOnly: number };
    glow: (number | string | null | boolean | undefined)[];
  }>(`(() => {
    const g = window.__game, out = {};
    const fresh = (boons, spells) => { g.startGame({ seed: 'BOON6', boons, spells }); g.player.invuln = 999; g.sim(.3); };
    fresh({}); g.givePotion('volatile'); out.nose = [g.belt.known[0]];
    fresh({ keenNose: 1 }); g.givePotion('volatile'); out.nose.push(g.belt.known[0], g.boons.said.includes('keenNose'));
    const reap = (boons, school) => { fresh(boons); for (let k = 0; k < 6; k++) g.spawn('sporeling', g.player.x + (k - 2.5) * 1.1, g.player.z - 2.2); g.sim(1.2);
      for (const e of g.enemies.filter(e => e.type === 'sporeling')) g.hit(g.enemies.indexOf(e), 999, school); g.sim(.2); out.reapSaid = out.reapSaid || g.run.hinted.has('boon:scavenger'); return g.pickups.filter(p => p.kind === 'reagent').length; };
    out.reap = [reap({ scavenger: 1 }, 'ember')]; out.reap.push(reap({ scavenger: 1 }, 'frost'));
    fresh({ brewersBreath: 1 }); g.spawn('dummy', g.player.x + .9, g.player.z); g.sim(1.2); const d = g.enemies.find(e => e.type === 'dummy');
    g.givePotion('liquidEmber'); g.player.invuln = 0; const hp = g.player.hp; g.usePotion('drink'); g.sim(.2);
    out.breath = { ground: g.burningGround, burning: d.status ? d.status.burn > 0 : false, said: g.boons.said.includes('brewersBreath') }; g.sim(2); out.breath.hurt = hp - g.player.hp; g.player.invuln = 999;
    g.givePotion('healing'); g.player.hp = g.player.maxHp - 2; const acted = g.boons.acted.brewersBreath; g.usePotion('drink'); out.breath.healOnly = g.boons.acted.brewersBreath - acted;
    fresh({ afterglow: 1 }, ['rime_shards']); g.spawn('dummy', g.player.x, g.player.z - 2.5); g.sim(1.2); g.mana(200); g.cast(0, { x: 0, z: -1 }); out.glow = [g.run.afterglow && g.run.afterglow.left];
    const shoot = () => { g.player.fireCd = 0; g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(1 / 60); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0; return g.bolts[g.bolts.length - 1]; };
    const b1 = shoot(); out.glow.push(JSON.stringify(b1 && b1.status)); shoot(); shoot(); out.glow.push(g.run.afterglow, JSON.stringify(shoot().status), g.boons.said.includes('afterglow'));
    return out;
  })()`);
  expect(got.nose).toEqual([false, true, true]); // (unknown without it; known by smell with it, and said)
  expect(got.reap[0]).toBe(6);
  expect(got.reap[1]).toBeLessThan(6);
  expect(got.reapSaid).toBe(true); // (every foe struck by its weakness leaves its reagent)
  expect(got.breath.ground).toBeGreaterThan(0);
  expect(got.breath.burning).toBe(true);
  expect(got.breath.said).toBe(true);
  expect(got.breath.hurt).toBe(0);
  expect(got.breath.healOnly).toBe(0); // (its fire spares the mage; a healing draught breathes nothing)
  expect(got.glow[0]).toBe(3);
  expect(got.glow[1]).toBe('{"chill":1}');
  expect(got.glow[2]).toBeNull();
  expect(got.glow[3]).toBeUndefined();
  expect(got.glow[4]).toBe(true); // (three casts carry half its chill, then it fades)
  expect(errors).toEqual([]);
});

test('the school boons that tune: Deep Winter freezes on two stacks and holds longer at II, Banked Coals burns longer, Gathering Dark gathers deeper, Perennial roots, Forking Arc forks', async ({
  page,
}) => {
  const errors = await start(page, '?seed=BOON5A&boons=deepWinter');
  const got = await page.evaluate<{
    one: number;
    two: number;
    said: string[];
    told: boolean;
    rank2: number;
    acted: number;
  }>(`(() => {
    const g = window.__game; g.player.invuln = 999; g.sim(.3);
    g.spawn('dummy'); g.sim(1.2);
    const d = g.enemies.find(e => e.type === 'dummy');
    g.inflict({ chill: 1 }); const one = d.status.frozen;
    g.inflict({ chill: 1 }); const two = d.status.frozen;
    const said = g.boons.said.slice(), told = g.run.hinted.has('boon:deepWinter');
    g.sim(4); g.giveBoon('deepWinter'); g.inflict({ chill: 1 }); g.inflict({ chill: 1 });
    return { one, two, said, told, rank2: d.status.frozen, acted: g.boons.acted.deepWinter };
  })()`);
  expect(got.one).toBe(0);
  expect(got.two).toBeCloseTo(2, 1);
  expect(got.said).toContain('deepWinter');
  expect(got.told).toBe(true);
  expect(got.rank2).toBeCloseTo(3, 1);
  expect(got.acted).toBe(2);

  const more = await page.evaluate<{
    coals: number[];
    coalsSaid: boolean;
    dark: number[];
    darkSaid: boolean;
    grow: number;
    root: { rootedAt: number; roots: number; said: number };
    fork: number[];
    forkSaid: boolean;
    leap: (string | undefined)[];
  }>(`(() => {
    const g = window.__game, fresh = (boons, n = 1) => { g.startGame({ seed: 'BOON5B', boons }); g.player.invuln = 999; g.sim(.3); for (let k = 0; k < n; k++) g.spawn('dummy', g.player.x + (k % 4 - 1.5) * (n > 4 ? 1 : 1.2), g.player.z - 2 - Math.floor(k / 4)); g.sim(1.2); return g.enemies.filter(e => e.type === 'dummy'); };
    const out = {};
    let [d] = fresh({ bankedCoals: 1 }); g.inflict({ burn: 4 }); out.coals = [d.status.burn]; out.coalsSaid = g.boons.said.includes('bankedCoals');
    g.giveBoon('bankedCoals'); g.inflict({ burn: 4 }); out.coals.push(d.status.burn);
    [d] = fresh({ gatheringDark: 1 }); for (let k = 0; k < 12; k++) g.inflict({ hex: 1 }); out.dark = [d.status.hex, d.status.hexT]; out.darkSaid = g.boons.said.includes('gatheringDark');
    g.giveBoon('gatheringDark'); for (let k = 0; k < 4; k++) g.inflict({ hex: 1 }); out.dark.push(d.status.hex);
    [d] = fresh({ perennial: 1 }); g.inflict({ grow: 4 }); out.grow = d.status.grow; let rootedAt = -1, roots = 0, was = 0;
    for (let t = 0; t < 5; t += 1 / 60) { g.sim(1 / 60); if (d.status.root > 0 && was <= 0) { roots++; if (rootedAt < 0) rootedAt = t; } was = d.status.root; }
    out.root = { rootedAt, roots, said: g.boons.acted.perennial };
    const ds = fresh({ forkingArc: 1 }, 8); g.learn('arc', 0); g.mana(200); g.cast(0, { x: 0, z: -1 });
    out.fork = [ds.filter(e => e.status && e.status.shock > 0).length]; out.forkSaid = g.boons.said.includes('forkingArc');
    const ds2 = fresh({ forkingArc: 2 }, 8); g.learn('arc', 0); g.mana(200); g.cast(0, { x: 0, z: -1 }); out.fork.push(ds2.filter(e => e.status && e.status.shock > 0).length);
    const three = fresh({ forkingArc: 1 }, 3); g.inflict({ shock: 1 }); three[0].status.shock = 0; three[2].status.shock = 0; for (const e of three) e.lastHit = undefined;
    g.hit(g.enemies.indexOf(three[1]), 4, undefined, 'cantrip'); out.leap = [three[0].lastHit, three[2].lastHit];
    return out;
  })()`);
  expect(more.coals[0]).toBeCloseTo(6, 1);
  expect(more.coals[1]).toBeCloseTo(8, 1);
  expect(more.coalsSaid).toBe(true);
  expect(more.dark[0]).toBe(7);
  expect(more.dark[1]).toBeCloseTo(6 * 1.33, 1);
  expect(more.dark[2]).toBe(9);
  expect(more.darkSaid).toBe(true);
  expect(more.grow).toBeCloseTo(6, 1);
  expect(more.root.roots).toBe(1);
  expect(more.root.rootedAt).toBeGreaterThan(2.8);
  expect(more.root.rootedAt).toBeLessThan(3.3);
  expect(more.root.said).toBe(1);
  expect(more.fork).toEqual([6, 8]);
  expect(more.forkSaid).toBe(true); // (Arc's own three jumps, and two more, then four)
  expect(more.leap).toEqual(['spell', 'spell']); // (the shock's leap reached both neighbours)
  expect(errors).toEqual([]);
});

test("the school boons that mend and lay bare: Votive Heart's containers and its mend, Thirsting Hex mends from hex spent, both within a room's budget, Laid Bare strips a guard", async ({
  page,
}) => {
  const errors = await start(page, '?seed=BOON5C');
  const got = await page.evaluate<{
    hearts: number[];
    votive: number[];
    recast: boolean;
    votiveSaid: boolean;
    spent: { hp: number; told: boolean };
    thirst: number[];
    thirstSaid: boolean;
    bare: number[];
    bareSaid: boolean;
  }>(`(() => {
    const g = window.__game, out = {};
    const fresh = (boons, spells) => { g.startGame({ seed: 'BOON5C', boons, spells }); g.player.invuln = 999; g.sim(.3); g.spawn('dummy'); g.sim(1.2); return g.enemies.find(e => e.type === 'dummy'); };
    const hitN = (d, n) => { for (let k = 0; k < n; k++) g.hit(g.enemies.indexOf(d), 1, undefined, 'cantrip'); };
    fresh({ votiveHeart: 1 }, ['wardlight']); out.hearts = [g.player.maxHp];
    g.player.hp = g.player.maxHp - 2; g.mana(200); g.cast(0); out.votive = [g.player.hp - (g.player.maxHp - 2)]; out.votiveSaid = g.boons.said.includes('votiveHeart');
    g.sim(14.5); g.mana(200); out.recast = g.cast(0); out.votive.push(g.player.hp - (g.player.maxHp - 2));
    g.giveBoon('votiveHeart'); out.hearts.push(g.player.maxHp);
    g.giveBoon('thirstingHex'); g.player.hp = g.player.maxHp - 2; const d0 = g.enemies.find(e => e.type === 'dummy');
    g.inflict({ hex: 5 }); hitN(d0, 5); g.inflict({ hex: 3 }); hitN(d0, 3); out.spent = { hp: g.player.maxHp - g.player.hp, told: g.run.hinted.has('boonMendSpent') }; // (the room's half heart is Votive's)
    let d = fresh({ thirstingHex: 1 }); g.player.hp = g.player.maxHp - 3;
    g.inflict({ hex: 5 }); hitN(d, 5); out.thirst = [g.player.hp]; g.inflict({ hex: 1 }); hitN(d, 1); out.thirst.push(g.player.hp); out.thirstSaid = g.boons.said.includes('thirstingHex');
    g.giveBoon('thirstingHex'); g.current.boonMended = 0; g.inflict({ hex: 4 }); hitN(d, 3); out.thirst.push(g.player.hp); hitN(d, 1); out.thirst.push(g.player.hp);
    g.startGame({ seed: 'BOON5C', boons: { laidBare: 1 } }); g.player.invuln = 999; g.sim(.3); g.spawn('rotling'); g.sim(1.2);
    const r = g.enemies.find(e => e.type === 'rotling'), i = g.enemies.indexOf(r); r.hp = r.maxHp = 1000; r.guard = .3;
    const before = r.hp; g.hit(i, 10, undefined, 'cantrip'); const guarded = before - r.hp;
    g.inflict({ sanct: 4 }); const mid = r.hp; g.hit(i, 10, undefined, 'cantrip'); out.bare = [guarded, mid - r.hp, r.status.sanct]; out.bareSaid = g.boons.said.includes('laidBare');
    g.giveBoon('laidBare'); r.status.sanct = 0; g.inflict({ sanct: 4 }); out.bare.push(r.status.sanct);
    return out;
  })()`);
  expect(got.hearts).toEqual([8, 10]); // (three hearts and one, then two)
  expect(got.votive).toEqual([1, 1]);
  expect(got.recast).toBe(true);
  expect(got.votiveSaid).toBe(true); // (cast again, it mends no more: once a room)
  expect(got.spent).toEqual({ hp: 2, told: true }); // (eight stacks spent, but this room's mend went to Votive Heart)
  expect(got.thirst).toEqual([3, 4, 4, 5]);
  expect(got.thirstSaid).toBe(true); // (every 6 stacks, then every 4)
  expect(got.bare[0]).toBeCloseTo(3, 1);
  expect(got.bare[1]).toBeCloseTo(12.5, 1);
  expect(got.bareSaid).toBe(true); // (its guard gone while sanctified, and holy light's ×1.25)
  expect(got.bare[2]).toBeCloseTo(4, 1);
  expect(got.bare[3]).toBeCloseTo(6, 1); // (Sanctified half again as long at II)
  expect(errors).toEqual([]);
});

test('the school boons that leave things behind: Flamekeeper draws mana from flames near, Cold Snap breathes once, Spark Wake lays sparks that sting foes and never the mage, Seedfall sows a plant that holds no reagent', async ({
  page,
}) => {
  const errors = await start(page, '?seed=BOON5D');
  const got = await page.evaluate<{
    flames: number[][];
    flameSaid: boolean;
    snap1: { b: number; said: boolean };
    snap2: { froze: number[]; acted: number };
    sparks: number[];
    sparkSaid: boolean;
    mageHurt: number;
    stung: number;
    seed: { near: number; mage: number; middle: number }[];
    seedSaid: boolean;
    seedReagent: number;
    seedLeft: number;
    burst: (number | boolean)[];
  }>(
    `(() => {
    const g = window.__game, out = {};
    const fresh = (boons, spells) => { g.startGame({ seed: 'BOON5D', boons, spells }); g.player.invuln = 999; g.sim(.3); };
    const gain = (boons, n) => { fresh(boons); g.spawn('dummy', g.player.x + 4, g.player.z + 1.5); g.sim(1.2);
      for (let k = 0; k < n; k++) { const x = g.player.x + (k % 3 - 1), z = g.player.z + (k < 3 ? -1 : 1); g.prop('brazier', x, z); g.element('burn', x, z); }
      g.sim(.1); const lit = g.props.filter(p => p.kind === 'brazier' && p.lit).length; g.mana(0); g.sim(1); return [lit, g.player.mana]; };
    out.flames = [gain({}, 1), gain({ flamekeeper: 1 }, 1), gain({ flamekeeper: 1 }, 6)]; out.flameSaid = g.boons.said.includes('flamekeeper');
    const pair = boons => { fresh(boons); g.spawn('dummy', g.player.x - .5, g.player.z - 2); g.spawn('dummy', g.player.x + .5, g.player.z - 2); g.sim(1.2); return g.enemies.filter(e => e.type === 'dummy'); };
    let [a, b] = pair({ coldSnap: 1 }); g.boonHere('coldSnap'); g.sim(MAGIC_FREEZE + .2); out.snap1 = { b: b.status && b.status.chill, said: g.boons.said.includes('coldSnap') };
    [a, b] = pair({ coldSnap: 2, deepWinter: 2 }); g.boonHere('coldSnap'); const froze = [0, 0], was = [0, 0];
    for (let t = 0; t < 12; t += 1 / 30) { g.sim(1 / 30); [a, b].forEach((d, k) => { const f = d.status ? d.status.frozen : 0; if (f > 0 && was[k] <= 0) froze[k]++; was[k] = f; }); }
    out.snap2 = { froze, acted: g.boons.acted.coldSnap };
    fresh({ sparkWake: 1 }, ['arc']); g.spawn('dummy', g.player.x, g.player.z - 2); g.sim(1.2); g.mana(200); g.cast(0, { x: 0, z: -1 });
    out.sparks = [g.sparkGround]; out.sparkSaid = g.boons.said.includes('sparkWake');
    const d = g.enemies.find(e => e.type === 'dummy'); g.player.invuln = 0; const hp = g.player.hp; g.player.x = d.x; g.player.z = d.z + .15; g.sim(1); out.mageHurt = hp - g.player.hp; g.player.invuln = 999;
    fresh({ sparkWake: 1 }, ['arc']); g.spawn('sporeling', g.player.x, g.player.z - 2.4); g.sim(1.2);
    const sp = g.enemies.find(e => e.type === 'sporeling'); sp.hp = sp.maxHp = 1000; g.inflict({ root: 5 }); g.mana(200); g.cast(0, { x: 0, z: -1 }); const struck = 1000 - sp.hp; g.sim(1.2); out.stung = 1000 - sp.hp - struck;
    fresh({ seedfall: 1 }); g.reagentsAlways(true); g.spawn('sporeling'); g.sim(1.2); let f = g.enemies.find(e => e.type === 'sporeling');
    g.inflict({ grow: 3 }); const at = { x: f.x, z: f.z }; g.hit(g.enemies.indexOf(f), 999, 'verdant');
    let plants = g.props.filter(p => p.kind === 'blossom' && p.sown); out.seed = plants.map(p => ({ near: Math.hypot(p.x - at.x, p.z - at.z), mage: Math.hypot(p.x - g.player.x, p.z - g.player.z), middle: Math.hypot(p.x - g.current.cx, p.z - g.current.cz) }));
    out.seedSaid = g.boons.said.includes('seedfall'); const reagents = g.pickups.filter(p => p.kind === 'reagent').length;
    if (plants[0]) g.blast(plants[0].x, plants[0].z); g.sim(.6); out.seedReagent = g.pickups.filter(p => p.kind === 'reagent').length - reagents; out.seedLeft = g.props.filter(p => p.kind === 'blossom').length;
    g.giveBoon('seedfall'); g.spawn('sporeling'); g.spawn('dummy', g.player.x + 1.4, g.player.z - 2.5); g.sim(1.2); f = g.enemies.find(e => e.type === 'sporeling' && !e.dead);
    g.inflict({ grow: 3 }); const dm = g.enemies.find(e => e.type === 'dummy'); dm.status.grow = 0; g.hit(g.enemies.indexOf(f), 999, 'verdant');
    const plant = g.props.find(p => p.kind === 'blossom'); out.burst = [g.props.filter(p => p.kind === 'blossom').length]; if (plant) { dm.x = plant.x + .7; dm.z = plant.z; } g.sim(1.5); out.burst.push(g.props.filter(p => p.kind === 'blossom').length, dm.status.grow > 0);
    return out;
  })()`.replace('MAGIC_FREEZE', '2'),
  );
  const [base, one, many] = got.flames;
  expect(base[0]).toBe(1);
  expect(one[0]).toBe(1);
  expect(many[0]).toBe(6);
  expect(one[1] - base[1]).toBeCloseTo(1, 0);
  expect(many[1] - base[1]).toBeCloseTo(4, 0);
  expect(got.flameSaid).toBe(true); // (a mana a second each, up to four flames)
  expect(got.snap1).toEqual({ b: 1, said: true }); // (a thawing foe breathes a stack onto its neighbour)
  expect(got.snap2.froze).toEqual([1, 1]);
  expect(got.snap2.acted).toBe(1); // (one hop: what its breath froze breathes nothing, so they never freeze each other again)
  expect(got.sparks[0]).toBeGreaterThan(0);
  expect(got.sparkSaid).toBe(true);
  expect(got.mageHurt).toBe(0); // (the mage's own spark never stings them)
  expect(got.stung).toBeGreaterThanOrEqual(3); // (a foe held on it is stung, Spark Wake's 3 a time)
  expect(got.seed).toHaveLength(1);
  expect(got.seed[0].near).toBeLessThan(2.1);
  expect(got.seed[0].mage).toBeGreaterThan(1);
  expect(got.seed[0].middle).toBeGreaterThan(1.2);
  expect(got.seedSaid).toBe(true);
  expect(got.seedReagent).toBe(0);
  expect(got.seedLeft).toBe(0); // (broken, a sown plant leaves no reagent, even with reagents always dropping)
  expect(got.burst).toEqual([1, 0, true]); // (at II it bursts by itself, overgrowing the foe near)
  expect(errors).toEqual([]);
});
