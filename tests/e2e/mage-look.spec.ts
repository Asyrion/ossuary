import { expect, test } from '@playwright/test';
import { type GameHooks, type W, start } from './helpers';

test("the Pilgrim's Cowl puts a hood on the mage, hung from the head bone, and it moves with the head", async ({
  page,
}) => {
  const errors = await start(page, '?seed=HOOD01');
  type Obj = {
    name: string;
    isBone?: boolean;
    isMesh?: boolean;
    children: Obj[];
    traverse(f: (o: Obj) => void): void;
    matrixWorld: unknown;
    getWorldPosition(v: V3): V3;
    geometry: { boundingSphere: { center: V3 } | null; computeBoundingSphere(): void };
    localToWorld(v: V3): V3;
  };
  type V3 = { x: number; y: number; z: number; clone(): V3; distanceTo(v: V3): number };
  const view = () =>
    page.evaluate(() => {
      const g = (window as unknown as W).__game as GameHooks & {
        costume: string[];
        hero: { model: Obj };
        camera: { position: V3 & { constructor: new () => V3 } };
      };
      let head: Obj | null = null;
      g.hero.model.traverse((o) => {
        if (!head && o.isBone && /head$/i.test(o.name)) head = o;
      });
      const h = head as Obj | null;
      if (!h) return { worn: g.costume, onHead: -1, gap: -1 };
      const parts = h.children.filter((c) => !c.isBone);
      // how far the hood's middle is from the head bone, in the world
      const V = g.camera.position.constructor,
        at = h.getWorldPosition(new V());
      let gap = -1;
      parts[0]?.traverse((o) => {
        if (gap < 0 && o.isMesh) {
          o.geometry.computeBoundingSphere();
          gap = o.localToWorld(o.geometry.boundingSphere!.center.clone()).distanceTo(at);
        }
      });
      return { worn: g.costume, onHead: parts.length, gap };
    });
  expect(await view()).toMatchObject({ worn: [], onHead: 0 });
  await page.evaluate(() =>
    (window as unknown as W & { __game: { give(...ids: string[]): void } }).__game.give('pilgrims_cowl'),
  );
  const worn = await view();
  expect(worn).toMatchObject({ worn: ['hood'], onHead: 1 });
  expect(worn.gap).toBeLessThan(0.6);
  // run and cast: the head bone moves, and the hood stays on it
  for (const t of [0.2, 0.35, 0.5]) {
    await page.evaluate((t) => {
      const g = (window as unknown as W).__game;
      g.keys.add('KeyD');
      g.keys.add('ArrowDown');
      g.arrowOrder.push('ArrowDown');
      g.sim(t, true);
    }, t);
    expect((await view()).gap).toBeLessThan(0.6);
  }
  await page.screenshot({ path: 'test-results/hood.png' });
  expect(errors).toEqual([]);
});

test('costumes: the focus is held in the casting hand, artifacts show on the mage in their slots (their own model at a spot, or a piece built for the body), and a cursed piece changes once cleansed', async ({
  page,
}) => {
  const errors = await start(page, '?seed=COST01');
  type Worn = {
    slot: string;
    piece: string;
    from: string;
    cursed: boolean;
    cleansed: boolean;
    parts: number;
    bones: string[];
  };
  type GC = GameHooks & {
    give(...ids: string[]): void;
    cleanse(): void;
    costume: string[];
    costumeDetail: Worn[];
    held: string | null;
    renderInfo(): { calls: number };
    hero: {
      model: {
        traverse(
          f: (o: {
            isBone?: boolean;
            name: string;
            getWorldPosition(v: unknown): { x: number; y: number; z: number };
          }) => void,
        ): void;
      };
    };
    camera: { position: { constructor: new () => unknown } };
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GC,
      out: Record<string, unknown> = {};
    g.sim(0.3, true);
    out.start = { worn: g.costume, held: g.held };
    const calls0 = g.renderInfo().calls;
    g.give(
      'twin_staff',
      'mana_lantern',
      'ember_sigil',
      'bone_lens',
      'stormglass_pendant',
      'crown_of_thorns',
      'pilgrims_boots',
      'chain_of_the_penitent',
    );
    g.sim(0.3, true);
    out.held = g.held;
    out.worn = g.costumeDetail.map((w) => [w.slot, w.piece === 'carried' ? w.from : w.piece, w.bones[0]]);
    out.cursed = g.costumeDetail.filter((w) => w.cursed).map((w) => w.piece);
    out.calls = g.renderInfo().calls - calls0;
    g.cleanse();
    g.cleanse();
    g.sim(0.1);
    out.cleansed = g.costumeDetail.filter((w) => w.cleansed).map((w) => w.piece);
    out.stillCursed = g.costumeDetail.filter((w) => w.cursed).length;
    return out;
  });
  expect(r.start).toEqual({ worn: [], held: 'apprentice_wand' });
  expect(r.held).toBe('twin_staff');
  expect(r.worn).toEqual([
    ['head', 'thorns', 'mixamorigHead'],
    ['face', 'lens', 'mixamorigHead'],
    ['shoulders', 'stormglass_pendant', 'mixamorigSpine2'],
    ['hands', 'manacles', 'mixamorigLeftHand'],
    ['belt', 'mana_lantern', 'mixamorigHips'],
    ['feet', 'boots', 'mixamorigLeftFoot'],
  ]); // (the Ember Sigil wears nothing: only what it is logical to wear shows)
  expect(r.cursed).toEqual(['thorns', 'manacles']);
  expect(r.cleansed).toEqual(['thorns', 'manacles']);
  expect(r.stillCursed).toBe(0); // (cleansed at a shrine: their cleansed looks)
  expect(r.calls).toBeLessThan(20); // (every slot filled and the focus held: a few draw calls each)
  await page.evaluate(() => {
    const g = (window as unknown as W & { __game: { closeUp(on?: boolean): void } }).__game;
    g.closeUp(true);
    g.sim(0.05, true);
  });
  await page.screenshot({ path: 'test-results/costumes.png' });
  expect(errors).toEqual([]);
});

test('transformations: three of a family transform the mage, said in a banner and a lore card, with a look and a gift; the gifts stay as others form', async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&variant=quiet&seed=TRANS1');
  type GT = GameHooks & {
    give(...ids: string[]): void;
    transform(id: string): boolean;
    transforms: string[];
    costume: string[];
    robeTint: number;
    blinkRest: number;
    burningGround: number;
    moths: number;
    spawn(kind: string, x?: number, z?: number): void;
    clearRoom(): void;
    closeUp(on?: boolean): void;
    player: { x: number; z: number; hp: number; maxHp: number; stats: { effects: Set<string> } };
    enemies: { dead?: boolean; x: number; z: number; hp: number; maxHp: number; vx: number; vz: number }[];
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GT,
      out: Record<string, unknown> = {};
    g.warp(1);
    g.sim(0.3, true);
    g.clearRoom();
    g.sim(0.3, true);
    // two of the Pyromancer's family: nothing yet; the third forms it
    g.give('ember_sigil', 'thurible_of_ash');
    g.sim(0.1, true);
    out.two = g.transforms;
    g.give('blood_moon_pendant');
    g.sim(0.1, true);
    out.formed = g.transforms;
    out.banner = document.querySelector('#banner .t')?.textContent;
    out.lore = document.querySelector('#loreName')?.textContent;
    out.look = g.costume;
    out.tint = g.robeTint > 0.05;
    // its gift: a bolt that strikes leaves embers, which never burn the mage
    g.spawn('rotling', g.player.x, g.player.z - 2.5);
    const foe = g.enemies[g.enemies.length - 1];
    foe.hp = foe.maxHp = 200;
    const at = { x: foe.x, z: foe.z };
    const ground = g.burningGround,
      hp = g.player.hp;
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    for (let i = 0; i < 12; i++) {
      g.sim(0.05, true);
      foe.x = at.x;
      foe.z = at.z;
      foe.vx = foe.vz = 0;
    }
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    out.embers = g.burningGround > ground;
    out.hurt = hp - g.player.hp;
    // a second: the Shadowstep's look over the Pyromancer's, both gifts kept; Shift blinks the way the mage walks
    g.transform('shadowstep');
    g.sim(0.1, true);
    out.both = g.transforms;
    out.look2 = g.costume;
    out.gifts = ['emberStrike', 'blink'].map((e) => g.player.stats.effects.has(e));
    return out;
  });
  expect(r.two).toEqual([]);
  expect(r.formed).toEqual(['pyromancer']);
  expect(r.banner).toBe('Pyromancer');
  expect(r.lore).toBe('Pyromancer');
  expect(r.look).toEqual(expect.arrayContaining(['flameCrown', 'emberSteps', 'aura']));
  expect(r.tint).toBe(true);
  expect(r.embers).toBe(true);
  expect(r.hurt).toBe(0);
  expect(r.both).toEqual(['pyromancer', 'shadowstep']);
  expect(r.look2).toEqual(expect.arrayContaining(['shadowCloak', 'shadowEyes', 'aura']));
  expect(r.look2).not.toContain('flameCrown');
  expect(r.gifts).toEqual([true, true]);
  const x0 = await page.evaluate(() => (window as unknown as W).__game.player.x);
  await page.keyboard.down('KeyD');
  await page.keyboard.press('ShiftLeft');
  await page.evaluate(() => (window as unknown as W).__game.sim(0.05, true));
  await page.keyboard.up('KeyD');
  const blink = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GT;
    return { x: g.player.x, rest: g.blinkRest };
  });
  expect(blink.x - x0).toBeGreaterThan(2);
  expect(blink.rest).toBeGreaterThan(1);
  // the Pilgrim maps the floor at once; the Beastcaller brings one more moth
  const more = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GT;
    g.transform('pilgrim');
    g.transform('beastcaller');
    g.sim(0.1, true);
    return {
      mapped: (g.rooms() as unknown as { known?: boolean; plan: { type: string } }[]).every(
        (r) => r.plan.type === 'secret' || r.known,
      ),
      moths: g.moths,
    };
  });
  expect(more).toEqual({ mapped: true, moths: 1 });
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as GT;
    g.clearRoom();
    g.closeUp(true);
    g.sim(5, true);
  });
  await page.screenshot({ path: 'test-results/transformations.png' });
  expect(errors).toEqual([]);
});

// (the other gifts apart from the forming above: each needs a fresh run, and both together ran past the time a test has
// on a CI runner)
test("transformations' other gifts, each on a fresh run: the Frostborn chills what touches it, the Stormcaller's fifth bolt leaps, the Runescribe's mark bursts, the Lightbearer floats over pits, the Pyromancer's embers spare the mage", async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&variant=quiet&seed=TRANS1');
  type GT = GameHooks & {
    transform(id: string): boolean;
    burningGround: number;
    spawn(kind: string, x?: number, z?: number): void;
    clearRoom(): void;
    player: { x: number; z: number; hp: number; maxHp: number; stats: { effects: Set<string> } };
  };
  // foes pinned where they stand, the mage kept alive
  type Foe = { x: number; z: number; vx: number; vz: number; hp: number; maxHp: number; status?: { chill?: number } };
  const gifts = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GT & {
        startGame(o: object): void;
        draw(): void;
        enemies: Foe[];
        hero: { root: { position: { y: number } } };
        player: { invuln: number };
      },
      out: Record<string, unknown> = {};
    const pinned: [Foe, number, number][] = [];
    const step = (t: number) => {
      for (let k = 0; k < Math.round(t / 0.05); k++) {
        g.sim(0.05, true);
        for (const [e, x, z] of pinned) {
          e.x = x;
          e.z = z;
          e.vx = e.vz = 0;
        }
      }
    };
    const foe = (x: number, z: number) => {
      g.spawn('rotling', x, z);
      const e = g.enemies[g.enemies.length - 1];
      e.hp = e.maxHp = 200;
      pinned.push([e, x, z]);
      return e;
    };
    const shoot = (n: number) => {
      for (let i = 0; i < n; i++) {
        g.keys.add('ArrowUp');
        g.arrowOrder.push('ArrowUp');
        step(0.05);
        g.keys.delete('ArrowUp');
        g.arrowOrder.length = 0;
        step(0.5);
      }
    };
    const fresh = (t: string) => {
      g.startGame({ seed: 'TRANS2', testTemplate: 'great_hall', testVariant: 'quiet' });
      g.warp(1);
      g.sim(0.3, true);
      g.clearRoom();
      g.sim(0.3, true);
      pinned.length = 0;
      g.player.hp = g.player.maxHp = 12;
      g.transform(t);
      g.sim(0.2, true);
    };
    fresh('frostborn');
    const toucher = foe(g.player.x + 0.35, g.player.z);
    step(1.2);
    out.chilled = (toucher.status?.chill ?? 0) > 0; // (it touched the mage: chilled)
    fresh('stormcaller');
    foe(g.player.x, g.player.z - 2.5);
    const other = foe(g.player.x + 2, g.player.z - 2.5);
    step(0.8);
    const h0 = other.hp;
    shoot(4);
    const h4 = other.hp;
    shoot(1);
    step(0.2);
    out.leap = { firstFour: h0 - h4, fifth: h4 - other.hp > 0 };
    fresh('runescribe');
    const marked = foe(g.player.x, g.player.z - 2.5);
    step(0.8);
    g.keys.add('ArrowUp');
    g.arrowOrder.push('ArrowUp');
    step(0.05);
    g.keys.delete('ArrowUp');
    g.arrowOrder.length = 0;
    let t = 0;
    while (marked.hp === marked.maxHp && t < 1) {
      step(0.05);
      t += 0.05;
    }
    const bolt = marked.maxHp - marked.hp;
    step(0.8);
    out.rune = { bolt: bolt > 0, burst: marked.maxHp - marked.hp > bolt };
    fresh('lightbearer');
    step(0.5);
    g.draw();
    out.float = { lifted: g.hero.root.position.y > 0.05, pits: g.player.stats.effects.has('pitWalker') };
    fresh('pyromancer');
    const target = foe(g.player.x, g.player.z - 1.4),
      at = { x: target.x, z: target.z };
    step(0.6);
    shoot(1);
    pinned[0][1] = at.x + 4;
    step(0.05);
    g.player.x = at.x;
    g.player.z = at.z;
    g.player.invuln = 0;
    const hp = g.player.hp;
    step(0.5);
    out.ownEmbers = { burning: g.burningGround > 0, hurt: hp - g.player.hp }; // (standing in its own embers)
    return out;
  });
  expect(gifts).toEqual({
    chilled: true,
    leap: { firstFour: 0, fifth: true },
    rune: { bolt: true, burst: true },
    float: { lifted: true, pits: true },
    ownEmbers: { burning: true, hurt: 0 },
  });
  expect(errors).toEqual([]);
});

test("Azyrion's arc: with more artifacts held the chaos mage's pieces arrive, each stage said once in a line, and the dev menu steps through them", async ({
  page,
}) => {
  const errors = await start(page, '?room=great_hall&variant=quiet&seed=ARC1');
  type GA = GameHooks & {
    give(...ids: string[]): void;
    costume: string[];
    arc: { stage: number; held: number; reached: number };
    setArc(n?: number): void;
    clearRoom(): void;
    closeUp(on?: boolean): void;
  };
  const r = await page.evaluate(() => {
    const g = (window as unknown as W).__game as GA,
      out: Record<string, unknown> = {};
    g.warp(1);
    g.sim(0.3, true);
    g.clearRoom();
    g.sim(0.3, true);
    g.give('bone_lens', 'leech_jar');
    g.sim(0.1, true);
    out.two = { ...g.arc, worn: g.costume };
    g.give('misers_purse');
    g.sim(0.1, true);
    out.three = { ...g.arc, worn: g.costume, line: document.querySelector('#toast')?.textContent };
    g.give('sextons_keyring', 'mana_lantern', 'pedlars_scale', 'ferrymans_obol', 'masons_chisel', 'cracked_mirror');
    g.sim(0.1, true);
    out.nine = { ...g.arc, worn: g.costume };
    g.setArc(4);
    g.sim(0.1, true);
    out.forced = { ...g.arc, worn: g.costume };
    g.setArc(undefined);
    g.sim(0.1, true);
    out.back = g.arc.stage;
    return out;
  });
  expect(r.two).toMatchObject({ stage: 0, held: 2, reached: 0 });
  expect((r.two as { worn: string[] }).worn).not.toContain('bracers');
  expect(r.three).toMatchObject({
    stage: 1,
    held: 3,
    reached: 1,
    line: 'Bronze closes round your forearms. The apprentice is giving way.',
  });
  expect((r.three as { worn: string[] }).worn).toContain('bracers');
  expect(r.nine).toMatchObject({ stage: 3, held: 9, reached: 3 });
  expect((r.nine as { worn: string[] }).worn).toContain('runeOrbs');
  expect(r.forced).toMatchObject({ stage: 4, reached: 3 });
  expect((r.forced as { worn: string[] }).worn).toEqual(expect.arrayContaining(['runeOrbs', 'chaosFlame']));
  expect(r.back).toBe(3);
  await page.evaluate(() => {
    const g = (window as unknown as W).__game as GA;
    g.setArc(4);
    g.closeUp(true);
    g.sim(4, true);
  });
  await page.screenshot({ path: 'test-results/arc.png' });
  expect(errors).toEqual([]);
});
