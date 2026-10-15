import { expect, test } from '@playwright/test';
import { type W, start, type GP } from './helpers';

test('the potion belt: potions start unknown in their bottles; R tapped drinks and held throws, F chooses; drinking or throwing one identifies it; a full belt leaves a potion where it lies; the inventory has a Potions tab', async ({
  page,
}) => {
  const errors = await start(page, '?seed=BELT1&variant=quiet&potions=healing,liquidEmber,hexBrew&spells=cinder_lance');
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP;
    g.forgetPotions();
    g.sim(6);
    g.player.hp = 2;
  });
  const first = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP;
    return { belt: g.belt, bottles: g.bottles };
  });
  expect(first.belt).toMatchObject({
    ids: ['healing', 'liquidEmber', 'hexBrew'],
    at: 0,
    slots: 3,
    known: [false, false, false],
  });
  expect(await page.locator('#belt .bslot img.px').count()).toBe(3);
  expect(await page.locator('#belt .bslot i').count()).toBe(3); // (each marked unknown)
  expect(new Set(Object.values(first.bottles).map((b) => b.liquid)).size).toBe(12); // (every potion its own colour)
  const icon = await page
    .locator('#belt .bslot img')
    .first()
    .evaluate((i) => [(i as HTMLImageElement).naturalWidth, getComputedStyle(i).imageRendering]);
  expect(icon).toEqual([24, 'pixelated']);
  // a tap of R drinks the chosen potion (the Healing Draught): healed, known
  await page.keyboard.down('KeyR');
  await page.keyboard.up('KeyR');
  const drunk = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP;
    g.sim(0.1);
    return {
      hp: g.player.hp,
      belt: g.belt.ids,
      line: document.querySelector('#toast')?.textContent,
      lore: document.querySelector('#lore')?.textContent,
    };
  });
  expect(drunk.hp).toBe(4);
  expect(drunk.belt).toEqual(['liquidEmber', 'hexBrew']);
  expect(drunk.line).toContain('Healing Draught');
  expect(drunk.lore).toContain('Healing Draught');
  // F chooses the next; held, R throws it where the mage aims (a ring shows where), and the splash hexes the foe there
  await page.keyboard.down('KeyF');
  await page.keyboard.up('KeyF');
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP;
    g.sim(0.05);
    g.spawn('dummy');
    g.sim(0.6);
    g.player.aim = { x: 0, z: -1 };
    const e = g.enemies[0];
    e.x = g.player.x;
    e.z = g.player.z - 4.4;
  });
  expect(await page.evaluate(() => ((window as unknown as W).__game as GP).belt.at)).toBe(1);
  await page.keyboard.down('KeyR');
  await page.evaluate(() => {
    const t = performance.now();
    while (performance.now() - t < 350) {
      /* held past the throw's moment */
    }
  });
  await page.keyboard.up('KeyR');
  const thrown = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP;
    g.sim(0.05);
    const flying = g.throws.flying;
    g.sim(0.6);
    return { flying, hex: g.enemies[0].status?.hex ?? 0, belt: g.belt.ids, known: g.belt.known };
  });
  expect(thrown.flying).toBe(1);
  expect(thrown.hex).toBeGreaterThanOrEqual(3);
  expect(thrown.belt).toEqual(['liquidEmber']);
  expect(thrown.known).toEqual([false]);
  // a full belt leaves a potion lying, and says so once
  const full = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP;
    g.sim(5);
    g.givePotion('mana');
    g.givePotion('frostbrew');
    g.drop('potion', g.player.x, g.player.z, { potion: 'healing' });
    g.sim(0.8);
    return {
      belt: g.belt.ids.length,
      lying: g.pickups.filter((p) => p.kind === 'potion').length,
      line: document.querySelector('#toast')?.textContent,
    };
  });
  expect(full).toMatchObject({ belt: 3, lying: 1 });
  expect(full.line).toContain('belt is full');
  // the inventory's Potions tab: the belt, then every potion, those known by name
  await page.keyboard.press('KeyI');
  await page.locator('#invTabs button', { hasText: 'Potions' }).click();
  await expect(page.locator('#invList .sec', { hasText: 'Belt' })).toBeVisible();
  await expect(page.locator('#invList .tile[title="Healing Draught"]')).toHaveCount(1); // (known now: in the book of potions)
  await page.screenshot({ path: 'test-results/potions-tab.png' });
  await page.keyboard.press('KeyI');
  expect(errors).toEqual([]);
});

test("potions drunk and thrown: each drink does its own and shows a chip while it lasts (the cantrip burns, spells are free, one echoes, a giant, unseen, reversed, a curse's price lifted); each throw lands its splash through the magic hooks", async ({
  page,
}) => {
  const errors = await start(page, '?seed=BELT2&variant=quiet&spells=cinder_lance,arc&give=gravemongers_contract');
  const drink = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP,
      P = g.player,
      out: Record<string, unknown> = {};
    g.forgetPotions();
    g.sim(1);
    const sip = (id: string) => {
      g.givePotion(id);
      g.usePotion('drink');
      g.sim(0.1);
    };
    P.hp = 2;
    g.mana(10);
    sip('mana');
    out.mana = Math.round(P.mana);
    sip('liquidEmber');
    sip('frostbrew');
    sip('bottledStorm');
    sip('echoes');
    sip('shadowstep');
    sip('bitterRemedy');
    out.fx = { ...g.potionFx };
    out.chips = document.getElementById('afflict')?.textContent;
    const before = Math.round(P.mana);
    g.cast(0, { x: 0, z: -1 });
    g.sim(0.1);
    out.free = [Math.round(P.mana) >= before, g.potionFx.free, g.potionFx.echo]; // (no mana spent: it only came back)
    sip('giants');
    out.giant = g.potionFx.scale;
    const x0 = P.x;
    sip('hexBrew');
    g.keys.add('KeyD');
    g.sim(0.4);
    g.keys.delete('KeyD');
    out.reversed = P.x < x0 - 0.3;
    g.sim(6);
    P.hp = 3;
    const ins = (g as unknown as { insight: { insight: number } }).insight.insight;
    sip('graveDraught');
    out.grave = [
      P.hp,
      (g as unknown as { souls: string[] }).souls.length,
      (g as unknown as { insight: { insight: number } }).insight.insight - ins,
    ];
    g.warp(1);
    g.sim(0.6);
    out.shrunk = g.potionFx.scale;
    return out;
  });
  expect(drink.mana).toBe(60);
  expect(drink.fx).toMatchObject({ remedy: 'gravemongers_contract', free: 3, echo: 1 });
  for (const k of ['ember', 'frost', 'unseen']) expect((drink.fx as Record<string, number>)[k]).toBeGreaterThan(0);
  for (const chip of ['Liquid Ember', 'Frostbrew', 'Free spells ×3', 'Echoing', 'Unseen', 'Remedied'])
    expect(drink.chips).toContain(chip);
  expect(drink.free).toEqual([true, 2, 0]); // (a free cast spent, the echo too)
  expect(drink.giant).toBeCloseTo(1.25);
  expect(drink.reversed).toBe(true);
  expect(drink.grave).toEqual([2, 0, 15 + 4]);
  expect(drink.shrunk).toBe(1); // (half a heart for insight, 15 on floor 1, and 4 for the kind's first use)
  const thrown = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GP,
      P = g.player,
      out: Record<string, unknown> = {};
    g.clearRoom();
    g.sim(0.2);
    for (const id of ['mana', 'liquidEmber', 'frostbrew', 'bottledStorm', 'giants', 'hexBrew', 'graveDraught']) {
      for (const e of g.enemies) e.dead = true;
      const room = (g as unknown as { current: { cx: number; cz: number } }).current;
      P.x = room.cx;
      P.z = room.cz + 2; // (south of the middle: the dummy ahead stays inside the room)
      g.sim(0.05);
      g.spawn('dummy');
      g.sim(0.6);
      P.aim = { x: 0, z: -1 };
      const e = g.enemies.filter((f) => !f.dead)[0];
      e.x = P.x;
      e.z = P.z - 4.4;
      g.givePotion(id);
      g.usePotion('throw');
      g.sim(0.55);
      const st = e.status ?? {};
      out[id] = {
        stun: st.stun > 0,
        burn: st.burn > 0,
        frozen: st.frozen > 0,
        shock: st.shock > 0,
        hex: st.hex ?? 0,
        giant: !!e.giant,
        ...g.throws,
      };
      g.sim(3.5);
    }
    return out;
  });
  expect(thrown.mana).toMatchObject({ stun: true });
  expect(thrown.liquidEmber).toMatchObject({ burn: true });
  expect(thrown.frostbrew).toMatchObject({ frozen: true });
  expect(thrown.bottledStorm).toMatchObject({ storms: 1 });
  expect(thrown.giants).toMatchObject({ giant: true });
  expect((thrown.hexBrew as { hex: number }).hex).toBeGreaterThanOrEqual(3);
  expect(thrown.graveDraught).toMatchObject({ thrall: true });
  expect(errors).toEqual([]);
});

test("reagents: a fallen foe leaves its own kind's, else its school's, Ember Salt if it died burning; a boss always leaves Warden's Ash; walked over, they go into the pouch, each one's card the first time", async ({
  page,
}) => {
  const errors = await start(page, '?seed=REAG2&variant=quiet&boss=warden');
  type GR = GP & {
    reagentsAlways(on: boolean): void;
    hit(i: number, dmg: number, school?: string): number;
    inflict(s: Record<string, number>): void;
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GR,
      out: Record<string, unknown> = {};
    g.sim(1);
    g.reagentsAlways(true);
    for (const k of ['sporeling', 'vesperMoth', 'mireToad']) g.spawn(k);
    g.sim(0.8);
    const live = g.enemies.filter((e) => !e.dead);
    g.hit(g.enemies.indexOf(live[0]), 9999);
    g.hit(g.enemies.indexOf(live[1]), 9999);
    g.sim(0.05);
    g.inflict({ burn: 3 });
    g.hit(g.enemies.indexOf(live[2]), 9999);
    g.sim(0.8); // (the toad dies burning)
    out.dropped = g.pickups.filter((p) => p.kind === 'reagent').map((p) => p.reagent);
    for (const p of g.pickups.filter((q) => q.kind === 'reagent')) {
      g.player.x = p.x;
      g.player.z = p.z;
      g.sim(0.1);
    }
    out.pouch = g.belt.reagents;
    out.lore = document.querySelector('#lore')?.textContent;
    g.reagentsAlways(false);
    g.warp(g.rooms().find((q) => q.type === 'boss')!.plan.id);
    g.sim(2.5);
    const boss = g.enemies.findIndex((e) => e.isBoss && !e.dead);
    g.hit(boss, 1e6);
    g.sim(1.5);
    out.ash = g.pickups.filter((p) => p.kind === 'reagent').map((p) => p.reagent);
    return out;
  });
  expect(r.dropped).toEqual(expect.arrayContaining(['graveMoss', 'wispEssence', 'emberSalt']));
  expect(r.pouch).toMatchObject({ graveMoss: 1, wispEssence: 1, emberSalt: 1 });
  expect(r.lore).toContain('Reagent');
  expect(r.ash).toContain('wardensAsh');
  await page.keyboard.press('KeyI');
  await page.locator('#invTabs button', { hasText: 'Potions' }).click();
  await expect(page.locator('#invList .sec', { hasText: 'Reagents' })).toBeVisible();
  await expect(page.locator('#invList .tile[title="Grave Moss"] .n')).toHaveText('1');
  await page.keyboard.press('KeyI');
  expect(errors).toEqual([]);
});

test("Dr. Jelly's laboratory: the table opens when walked up to; two reagents in the mortar brew a potion that is known from then on and its recipe kept; Dr. Jelly looks at one potion a visit and sells recipes; a jelly globe bursts", async ({
  page,
}) => {
  const errors = await start(page, '?seed=LAB2&room=lab_plain&potions=mana&loot=coins:10');
  type GL = GP & {
    lab: {
      open: boolean;
      tab: string;
      mortar: string[];
      here: boolean;
      table: { x: number; z: number; hz: number };
      jelly: { x: number; z: number };
      identified: boolean;
      recipes: { a: string; b: string; potion: string }[];
    };
    props: { kind: string; x?: number; z?: number }[];
    blast(x: number, z: number): void;
    giveReagent(id: string, n: number): void;
    player: GP['player'] & { coins: number };
    state: string;
  };
  const g = () =>
    page.evaluate(() => {
      const g = (window as unknown as W).__game as unknown as GL;
      return {
        lab: g.lab,
        belt: g.belt,
        coins: g.player.coins,
        state: g.state,
        line: document.querySelector('#toast')?.textContent,
      };
    });
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GL;
    g.forgetPotions();
    g.warp(1);
    g.sim(0.5);
    g.giveReagent('graveMoss', 2);
    g.giveReagent('wispEssence', 1);
    g.sim(6);
  });
  expect(await page.evaluate(() => document.querySelector('#banner .t')?.textContent)).toBe("Dr. Jelly's Laboratory");
  // walked up to, the table opens at its Brew tab; two Grave Moss in the mortar, then the flask
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GL,
      t = g.lab.table;
    g.player.x = t.x;
    g.player.z = t.z + t.hz + 0.5;
    g.sim(0.1);
  });
  expect((await g()).lab).toMatchObject({ open: true, tab: 'brew' });
  await expect(page.locator('#scrLab')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  expect((await g()).lab.mortar).toEqual(['graveMoss', 'graveMoss']);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter'); // (past the Wisp Essence, to the flask)
  const brewed = await g();
  expect(brewed.belt.ids).toEqual(['mana', 'healing']);
  expect(brewed.belt.known).toEqual([false, true]);
  expect(brewed.lab.recipes).toEqual([{ a: 'graveMoss', b: 'graveMoss', potion: 'healing' }]);
  expect(brewed.belt.reagents).toEqual({ wispEssence: 1 });
  await page.screenshot({ path: 'test-results/alchemy-table.png' });
  // Dr. Jelly looks at the unknown one, once a visit
  await page.keyboard.press('KeyE');
  await page.keyboard.press('Enter');
  const looked = await g();
  expect(looked.lab.identified).toBe(true);
  expect(looked.belt.known).toEqual([true, true]);
  // and sells a recipe (6 obols): the Mana Tonic's
  await page.keyboard.press('KeyE');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const bought = await g();
  expect(bought.coins).toBe(4);
  expect(bought.lab.recipes.map((r) => r.potion).sort()).toEqual(['healing', 'mana']);
  expect(
    await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('ossuary.vigil') ?? '{}') as { recipes?: { potions?: string[] } }).recipes
          ?.potions,
    ),
  ).toEqual(['healing']); // (kept between runs, in the Vigil's save: the brew, and the bought pair)
  await page.keyboard.press('Escape');
  expect(await g()).toMatchObject({ state: 'play', lab: { open: false } });
  // stepping away and back opens it again; a blast bursts a jelly globe, and a jelly or a reagent comes out of it
  const again = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GL,
      t = g.lab.table;
    g.player.z = t.z + 2.5;
    g.sim(0.2);
    g.player.z = t.z + t.hz + 0.5;
    g.sim(0.1);
    const open = g.lab.open;
    return open;
  });
  expect(again).toBe(true);
  await page.keyboard.press('Escape');
  const globe = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GL,
      before = g.props.filter((p) => p.kind === 'globe').length,
      gl = (g.props as unknown as { kind: string; x: number; z: number }[]).find((p) => p.kind === 'globe')!;
    const foes = g.enemies.filter((e) => !e.dead).length,
      reagents = g.pickups.filter((p) => p.kind === 'reagent').length;
    g.player.x = gl.x + 3;
    g.blast(gl.x, gl.z);
    g.sim(0.8);
    return {
      before,
      after: g.props.filter((p) => p.kind === 'globe').length,
      spilled:
        g.enemies.filter((e) => !e.dead).length -
        foes +
        g.pickups.filter((p) => p.kind === 'reagent').length -
        reagents,
    };
  });
  expect(globe.after).toBe(globe.before - 1);
  expect(globe.spilled).toBe(1);
  await page.evaluate(() => ((window as unknown as W).__game as unknown as GL).forgetPotions());
  expect(errors).toEqual([]);
});

test('Dr. Jelly as the plague doctor, a figure that turns to the mage; he hands over what he gives once the table shuts (a brewed potion, a recipe), reaching, holding, tossing it to the mage', async ({
  page,
}) => {
  type GJ = {
    sim(s: number, draw?: boolean): void;
    warp(id: number): void;
    rooms(): { type: string; plan: { id: number } }[];
    player: { x: number; z: number; invuln: number; reagents: Record<string, number> };
    jellyLooks(): { id: string }[];
    giving: { kind: string; phase: string; waiting: number } | null;
    giveReagent(id: string, n: number): void;
    openLab(t?: string): void;
    closeLab(): void;
    brew(a: string, b: string): string | null;
    buyRecipe(id: string): boolean;
    loot(r: Record<string, number>): void;
    lab: { here: boolean };
    renderInfo(): { calls: number };
  };
  const errors = await start(page, '?seed=LAB&room=lab_plain');
  const looks = await page.evaluate(() => {
    const w = (window as unknown as { __game: GJ }).__game;
    w.player.invuln = 999;
    const stood = w.jellyLooks().map((o) => o.id);
    w.sim(0.5, true);
    return { stood };
  });
  expect(looks.stood).toEqual(['plague']);
  // in his laboratory: a brew, then the table shut: he reaches, holds it out, tosses it, and is done
  const phases = await page.evaluate(() => {
    const w = (window as unknown as { __game: GJ }).__game,
      r = w.rooms().find((q) => q.type === 'laboratory')!;
    w.warp(r.plan.id);
    w.sim(2.5);
    w.giveReagent('graveMoss', 1);
    w.giveReagent('emberSalt', 1);
    w.openLab('brew');
    w.brew('graveMoss', 'emberSalt');
    const whileOpen = w.giving;
    w.sim(0.5);
    const stillOpen = w.giving;
    w.closeLab();
    const seen: string[] = [];
    for (let k = 0; k < 150 && (k < 2 || w.giving); k++) {
      w.sim(1 / 60);
      const p = w.giving?.phase;
      if (p && seen.at(-1) !== p) seen.push(p);
    }
    return { whileOpen, stillOpen, seen, after: w.giving };
  });
  expect(phases.whileOpen).toBeNull();
  expect(phases.stillOpen).toBeNull(); // (it waits for the table to shut)
  expect(phases.seen).toEqual(['reach', 'hold', 'toss', 'back']);
  expect(phases.after).toBeNull();
  // a recipe bought: he gives again
  const recipe = await page.evaluate(() => {
    const w = (window as unknown as { __game: GJ }).__game;
    w.loot({ coins: 30 });
    w.openLab('recipes');
    const bought = w.buyRecipe('healing') || w.buyRecipe('frostWard') || w.buyRecipe('hexBrew');
    w.closeLab();
    w.sim(0.3, true);
    return { bought, giving: w.giving };
  });
  expect(recipe.bought).toBe(true);
  expect(recipe.giving).toMatchObject({ kind: 'recipe', phase: 'reach' });
  expect(errors).toEqual([]);
});

test("the jelly serpent: three bolts crack the vat window and it breaks out, flooding the room with jelly and locking the doors; under the jelly no bolt reaches it; a shock through its jelly or a freeze traps it at the surface; fallen, it leaves Warden's Ash, a rare potion and a free recipe, and no trapdoor; a restless one breaks out after a brew; as a floor's boss it pours its own jelly", async ({
  page,
}) => {
  const errors = await start(page, '?seed=SERP1&room=lab_plain');
  type Info = {
    serpent: {
      state: string;
      hidden: boolean;
      x: number;
      z: number;
      hp: number;
      maxHp: number;
      trap: string | null;
      under: string | null;
    } | null;
    jelly: number;
    frozen: number;
    run: string;
    restless: boolean;
    cracks: number;
    broken: boolean;
  };
  type GS = GP & {
    serpent: Info;
    crackVat(): boolean;
    breakVat(): boolean;
    restless: boolean;
    pool(what: string): void;
    element(k: string, x: number, z: number): void;
    rooms(): { type: string; cx: number; cz: number; bounds: { minZ: number }; plan: { id: number } }[];
    current: { locked?: boolean; type: string };
    hit(i: number, dmg: number, school?: string): void;
    lab: { recipes: { potion: string }[]; open: boolean };
    openLab(t: string): void;
    closeLab(): void;
    brew(a: string, b: string): void;
    giveReagent(id: string, n: number): void;
    forgetPotions(): void;
    keys: Set<string>;
    arrowOrder: string[];
  };
  await page.evaluate(() => ((window as unknown as W).__game as unknown as GS).forgetPotions());
  // three bolts at the vat window (from under it, beside Dr. Jelly), a crack each, and it breaks out
  const out = await page.evaluate<{ one: number; two: number; after: Info; locked: boolean }>(`(() => {
    const g = window.__game, P = g.player, lab = g.rooms().find(r => r.type === 'laboratory');
    g.warp(lab.plan.id); g.sim(.5); P.x = lab.cx + .9; P.z = lab.bounds.minZ + .7; g.sim(.1); // (under the window, out of Dr. Jelly's reach)
    const fire = () => { P.fireCd = 0; g.keys.add('ArrowUp'); g.arrowOrder.push('ArrowUp'); g.sim(1 / 60); g.keys.delete('ArrowUp'); g.arrowOrder.length = 0; g.sim(.4); };
    fire(); const one = g.serpent.cracks; fire(); const two = g.serpent.cracks; fire();
    return { one, two, after: g.serpent, locked: g.current.locked };
  })()`);
  expect([out.one, out.two]).toEqual([1, 2]);
  expect(out.after).toMatchObject({ run: 'out', broken: true, cracks: 3 });
  expect(out.after.jelly).toBeGreaterThanOrEqual(25);
  expect(out.after.serpent).toBeTruthy();
  expect(out.locked).toBe(true);
  await expect(page.locator('#bossbar')).toHaveClass(/on/);
  // under the jelly it can't be struck; a shock through its jelly traps it at the surface (and hurts it), as a freeze does
  const traps = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      until = (st: string) => {
        for (let i = 0; i < 80 && g.serpent.serpent!.state !== st; i++) g.sim(0.1);
        return g.serpent.serpent!;
      };
    const under = until('swim'),
      hp = under.hp,
      i = g.enemies.findIndex((e) => (e as unknown as { type: string }).type === 'serpent');
    g.pool('shock');
    g.sim(0.05);
    const shocked = g.serpent.serpent!;
    g.sim(3.2);
    const s2 = until('swim');
    g.element('chill', s2.x, s2.z);
    g.sim(0.05);
    const frozen = g.serpent.serpent!;
    return {
      hidden: under.hidden,
      shocked: { state: shocked.state, trap: shocked.trap, hidden: shocked.hidden, lost: hp - shocked.hp },
      frozen: { state: frozen.state, trap: frozen.trap },
      i,
    };
  });
  expect(traps.hidden).toBe(true);
  expect(traps.shocked).toMatchObject({ state: 'trapped', trap: 'shock', hidden: false });
  expect(traps.shocked.lost).toBeGreaterThan(0);
  expect(traps.frozen).toMatchObject({ state: 'trapped', trap: 'frost' });
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/jelly-serpent.png' });
  // fallen: Warden's Ash, a rare potion, Dr. Jelly's recipe; the doors open and no trapdoor (it is no floor's boss)
  const fell = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      i = g.enemies.findIndex((e) => (e as unknown as { type: string }).type === 'serpent');
    g.hit(i, 9999, 'storm');
    g.sim(2);
    return {
      run: g.serpent.run,
      locked: !!g.current.locked,
      pickups: g.pickups.map((p) => p.kind + ':' + (p.potion ?? p.reagent ?? '')),
      recipes: g.lab.recipes.length,
      trapdoor: (g as unknown as { trapdoor: boolean }).trapdoor,
    };
  });
  expect(fell).toMatchObject({ run: 'slain', locked: false, recipes: 1, trapdoor: false });
  expect(fell.pickups).toContain('reagent:wardensAsh');
  expect(fell.pickups.some((p) => /^potion:(bottledStorm|echoes|giants)$/.test(p))).toBe(true);
  expect(await page.evaluate(() => ((window as unknown as W).__game as unknown as GS).breakVat())).toBe(false); // (once a run)
  // a restless serpent breaks out by itself, a little after the first brew (once the table is closed)
  errors.push(...(await start(page, '?seed=SERP2&room=lab_plain')));
  const restless = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      lab = g.rooms().find((r) => r.type === 'laboratory')!;
    g.warp(lab.plan.id);
    g.sim(0.5);
    g.restless = true;
    g.giveReagent('graveMoss', 2);
    g.openLab('brew');
    g.brew('graveMoss', 'graveMoss');
    g.sim(3);
    const waiting = g.serpent.run;
    g.closeLab();
    g.sim(3.5);
    return { waiting, after: g.serpent.run, locked: !!g.current.locked };
  });
  expect(restless).toEqual({ waiting: 'caged', after: 'out', locked: true });
  await page.evaluate(() => ((window as unknown as W).__game as unknown as GS).forgetPotions());
  expect(errors).toEqual([]);
});

test("the jelly serpent as a floor's boss (?boss=serpent) pours its own jelly round it, and falls as bosses do, its way down past the waystone", async ({
  page,
}) => {
  const errors = await start(page, '?seed=SERPB&boss=serpent');
  type GS = GP & {
    serpent: { serpent: { state: string } | null; jelly: number; run: string };
    rooms(): { type: string; plan: { id: number } }[];
    current: { locked?: boolean };
    hit(i: number, dmg: number, school?: string): void;
  };
  const boss = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      b = g.rooms().find((r) => r.type === 'boss')!;
    g.warp(b.plan.id);
    g.sim(2);
    return { s: g.serpent, locked: !!g.current.locked, bar: document.querySelector('#bossname')?.textContent };
  });
  expect(boss.s.jelly).toBeGreaterThanOrEqual(25);
  expect(boss.s.serpent).toBeTruthy();
  expect(boss.locked).toBe(true);
  expect(boss.bar).toBe('The Jelly Serpent');
  const fell = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GS,
      i = g.enemies.findIndex((e) => (e as unknown as { type: string }).type === 'serpent');
    (g.enemies[i] as unknown as { hidden: boolean }).hidden = false;
    g.hit(i, 9999, 'storm');
    g.sim(1.5);
    const fell = {
      locked: !!g.current.locked,
      banner: document.querySelector('#banner .t')?.textContent,
      run: g.serpent.run,
      sub: document.querySelector('#banner .s')?.textContent,
    };
    g.warp(g.rooms().find((r) => r.type === 'waystone')!.plan.id);
    g.sim(2);
    return { ...fell, wayDown: g.wayDown?.room };
  });
  expect(fell).toEqual({
    locked: false,
    banner: 'The serpent melts back into jelly',
    sub: 'The way down lies past the waystone',
    run: 'caged',
    wayDown: 'waystone',
  }); // (the vat's own serpent is still in its vat)
  expect(errors).toEqual([]);
});

test("the Alchemist: the Satchel adds a belt slot, the Taster's Spoon knows every potion carried, the Cracked Retort's wider splash cuts; three of the family transform the mage (a bandolier and an apron) and a thrown potion splits in two", async ({
  page,
}) => {
  const errors = await start(page, '?room=crypt_a&seed=ALCH8&potions=healing,liquidEmber');
  type GA = GP & {
    belt: { slots: number; known: boolean[] };
    give(...ids: string[]): void;
    transforms: string[];
    costume: string[];
    current: { cx: number; cz: number };
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GA;
    g.forgetPotions();
    g.warp(1);
    g.sim(0.5);
    const before = { slots: g.belt.slots, known: [...g.belt.known] };
    g.give('alchemists_satchel');
    g.sim(0.1);
    const slots = g.belt.slots;
    g.give('tasters_spoon');
    g.sim(0.1);
    const known = [...g.belt.known];
    g.give('cracked_retort');
    g.sim(0.3);
    return { before, slots, known, transforms: g.transforms, costume: g.costume };
  });
  expect(r.before).toEqual({ slots: 3, known: [false, false] });
  expect(r.slots).toBe(4);
  expect(r.known).toEqual([true, true]);
  expect(r.transforms).toEqual(['alchemist']);
  expect(r.costume).toEqual(expect.arrayContaining(['bandolier', 'apron', 'aura']));
  // a throw splits in two bottles across the aim, and where they land the retort's glass cuts
  const t = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GA,
      P = g.player;
    g.clearRoom();
    P.x = g.current.cx;
    P.z = g.current.cz + 2;
    g.sim(0.3);
    g.spawn('rotling');
    g.sim(0.7); // (a rotling made sturdy: the dummy never loses health)
    const d = g.enemies[g.enemies.length - 1] as unknown as { x: number; z: number; hp: number; maxHp: number };
    d.hp = d.maxHp = 200;
    d.x = P.x;
    d.z = P.z - 4.5;
    g.sim(0.05);
    const hp = d.hp;
    P.aim = { x: 0, z: -1 };
    g.usePotion('throw');
    const flying = g.throws.flying;
    g.sim(0.8);
    return { flying, cut: hp - d.hp };
  });
  expect(t.flying).toBe(2);
  expect(t.cut).toBeGreaterThanOrEqual(6);
  await page.evaluate(() => ((window as unknown as W).__game as unknown as GA).forgetPotions());
  expect(errors).toEqual([]);
});

test('the overgrown garden: a flowering plant struck bursts into pollen that overgrows the foes near, longer in the garden, its word rising once; it leaves Bloom Petal, as an overgrown foe does; fire burns it', async ({
  page,
}) => {
  const errors = await start(page, '?room=garden_beds&seed=GARD1');
  type B = { x: number; z: number; prop: { kind: string; burning: number } };
  type GG = GP & {
    clearRoom(): void;
    current: { theme?: { id: string; twist: string }; props?: B[]; gardenSaid?: boolean };
    keys: Set<string>;
    arrowOrder: string[];
    reagentsAlways(on: boolean): void;
    pickups: { kind: string; reagent?: string }[];
    burn(x: number, z: number, r: number): void;
    hit(i: number, dmg: number, school?: string): void;
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as unknown as GG,
      P = g.player;
    g.warp(1);
    g.sim(0.3);
    g.clearRoom();
    g.sim(0.2);
    (P as unknown as { invuln: number }).invuln = 99;
    g.reagentsAlways(true);
    const theme = g.current.theme,
      blossoms = () => (g.current.props ?? []).filter((b) => b.prop.kind === 'blossom');
    const b = blossoms()[0],
      before = blossoms().length;
    P.x = b.x - 2;
    P.z = b.z;
    g.spawn('rotling');
    g.spawn('rotling');
    g.sim(0.8);
    g.enemies.forEach((e, i) => {
      const f = e as unknown as { x: number; z: number; hp: number; maxHp: number; speed: number };
      f.x = b.x + 0.4;
      f.z = b.z + (i ? 0.9 : -0.9);
      f.hp = f.maxHp = 300;
      f.speed = 0;
    });
    g.keys.add('ArrowRight');
    g.arrowOrder.push('ArrowRight');
    g.sim(0.3);
    g.keys.delete('ArrowRight');
    g.arrowOrder.length = 0;
    g.sim(0.15);
    const grow = g.enemies.map((e) => e.status?.grow ?? 0),
      said = !!g.current.gardenSaid;
    const petals = g.pickups.filter((p) => p.kind === 'reagent' && p.reagent === 'bloomPetal').length;
    // an overgrown foe falling leaves Bloom Petal too
    g.hit(0, 9999);
    g.sim(0.3);
    const fell = g.pickups.filter((p) => p.kind === 'reagent' && p.reagent === 'bloomPetal').length;
    // fire burns a flowering plant away
    const c = blossoms()[0];
    g.burn(c.x, c.z, 0.1);
    g.sim(0.1);
    const burning = c.prop.burning > 0;
    g.sim(2);
    g.reagentsAlways(false);
    return {
      theme: theme && { id: theme.id, twist: theme.twist },
      before,
      after: blossoms().length,
      grow,
      said,
      petals,
      fell,
      burning,
    };
  });
  expect(r.theme).toEqual({ id: 'garden', twist: 'garden' });
  expect(r.before).toBe(10);
  expect(r.after).toBe(8); // (one burst, one burnt)
  for (const t of r.grow) expect(t).toBeGreaterThan(6); // (4 seconds, ×1.75 in the garden)
  expect(r.said).toBe(true);
  expect(r.petals).toBe(1);
  expect(r.fell).toBe(2);
  expect(r.burning).toBe(true);
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.screenshot({ path: 'test-results/garden.png' });
  expect(errors).toEqual([]);
});
