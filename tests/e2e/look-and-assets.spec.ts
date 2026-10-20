import { expect, test } from '@playwright/test';
import { start } from './helpers';

test('made assets: the stand-ins load through the manifest and replace their placeholders, and turn off to compare', async ({
  page,
}) => {
  type Info = { where: string; status: string; triangles?: number };
  type Rock = {
    urn?: string;
    mesh?: {
      traverse(
        f: (o: { name: string; material?: { isMeshToonMaterial?: boolean; map?: { magFilter: number } } }) => void,
      ): void;
    };
  }; // (urn: 'plain' or 'sealed')
  type GA = {
    sim(sec: number, draw?: boolean): void;
    assets: { on: boolean; list: Info[] };
    useAssets(on: boolean): void;
    showAssets(): void;
    current: { rocks: Rock[]; spots: { visual: { traverse(f: (o: { name: string }) => void): void } }[] };
  };
  const errors = await start(page, '?seed=K3F9QX&give=ember_sigil&assets=/tests/fixtures/assets/assets.json');
  const look = () =>
    page.evaluate(() => {
      const g = (window as unknown as { __game: GA }).__game;
      const made = (o?: { traverse(f: (o: { name: string }) => void): void }) => {
        let found = false;
        o?.traverse((c) => {
          if (c.name === 'standin') found = true;
        });
        return found;
      };
      const urns = g.current.rocks.filter((r) => r.urn),
        spot = g.current.spots.at(-1);
      // (each wears its texture as pixel art, as every Tripo model does: a toon material, its baked texture sampled sharp)
      const pixelArt = (o?: Rock['mesh']) => {
        let found = false;
        o?.traverse((c) => {
          if (c.material?.isMeshToonMaterial && c.material.map?.magFilter === 1003) found = true;
        });
        return found;
      };
      return {
        on: g.assets.on,
        urns: urns.map((r) => made(r.mesh)),
        texel: urns.map((r) => pixelArt(r.mesh)),
        sigil: made(spot?.visual),
        icon: [...document.querySelectorAll('#items image')].some((i) => !i.getAttribute('href')!.startsWith('data:')),
      }; // (the painted icon's file, not one the room kit renders)
    });
  const list = await page.evaluate(() => {
    const g = (window as unknown as { __game: GA }).__game;
    g.showAssets();
    g.sim(0.3, true);
    return g.assets.list;
  });
  expect(list.map((a) => [a.where, a.status])).toEqual([
    ['props.urn', 'loaded'],
    ['props.pedestal', 'loaded'],
    ['artifacts.ember_sigil', 'loaded'],
    ['floors.crypt.floor', 'loaded'],
    ['icons.ember_sigil', 'loaded'],
  ]);
  expect(list.find((a) => a.where === 'props.urn')!.triangles).toBeLessThanOrEqual(2000); // (lowered to its budget by prepare-asset)
  expect(await look()).toEqual({ on: true, urns: [true, true], texel: [true, true], sigil: true, icon: true });
  await page.screenshot({ path: 'test-results/assets-made.png' });
  // (a rune-sealed urn keeps its dark stone: never a plain urn's material; the stand-ins shown beside the room's own)
  expect(
    await page.evaluate(() => {
      const g = (window as unknown as { __game: GA }).__game,
        mats = (r: Rock) => {
          const s = new Set<unknown>();
          r.mesh?.traverse((c) => {
            if (c.material?.isMeshToonMaterial) s.add(c.material);
          });
          return s;
        };
      g.showAssets();
      g.sim(0.2, true);
      const plain = new Set(g.current.rocks.filter((r) => r.urn === 'plain').flatMap((r) => [...mats(r)]));
      return g.current.rocks.filter((r) => r.urn === 'sealed').map((r) => [...mats(r)].some((m) => plain.has(m)));
    }),
  ).toEqual([false, false]);
  expect(await look()).toMatchObject({ on: true, texel: [true, true, true, true] }); // (stand-ins placed later are pixel art too)
  // off: the floor is built again with the placeholders
  await page.evaluate(() => {
    const g = (window as unknown as { __game: GA }).__game;
    g.useAssets(false);
    g.showAssets();
    g.sim(0.3, true);
  });
  expect(await look()).toEqual({ on: false, urns: [false, false], texel: [false, false], sigil: false, icon: false });
  expect(errors).toEqual([]);
});

test(
  'made assets: missing and broken files, and ?assets=off, leave the placeholders with a warning, never an error',
  { tag: '@fast' },
  async ({ page }) => {
    type GA = {
      sim(sec: number, draw?: boolean): void;
      assets: { on: boolean; list: { where: string; status: string }[] };
      showAssets(): void;
    };
    const warnings: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'warning') warnings.push(m.text());
    });
    const errors = await start(page, '?seed=K3F9QX&give=ember_sigil&assets=/tests/fixtures/assets/broken.json');
    const broken = await page.evaluate(() => {
      const g = (window as unknown as { __game: GA }).__game;
      g.showAssets();
      g.sim(0.1);
      return g.assets;
    }); // (the placeholders are built; no frame needed)
    expect(broken.on).toBe(false);
    expect(broken.list.map((a) => a.status)).toEqual(['missing', 'failed', 'missing', 'missing']);
    expect(warnings.filter((w) => w.startsWith('asset ')).length).toBe(4);
    const off = await start(page, '?seed=K3F9QX&assets=off');
    expect(await page.evaluate(() => (window as unknown as { __game: GA }).__game.assets.on)).toBe(false);
    expect(errors).toEqual([]);
    expect(off).toEqual([]);
  },
);

test('coin faces: the obols wear a coin face, drawn on the fine layer, in the room, the HUD and the card; the dev menu changes it', async ({
  page,
}) => {
  type O = {
    isMesh?: boolean;
    layers: { mask: number };
    material?: { map?: { image: { naturalWidth: number; src: string }; magFilter: number } };
    traverse(f: (o: O) => void): void;
  };
  type GC = {
    sim(sec: number, draw?: boolean): void;
    player: { x: number; z: number };
    pickups: { kind: string; m: O }[];
    drop(kind: string, x: number, z: number): void;
    obolFace: string;
    obolFaces: string[];
    wearFace(id: string): void;
    coinGallery(): number;
    takeCoinGallery(): void;
    fineLayerDrawn: boolean;
  };
  const errors = await start(page, '?seed=K3F9QX');
  const look = () =>
    page.evaluate(() => {
      const g = (window as unknown as { __game: GC }).__game,
        maps: { w: number; src: string; near: boolean; fine: boolean }[] = [];
      for (const p of g.pickups)
        if (p.kind === 'coin')
          p.m.traverse((o) => {
            const m = o.isMesh ? o.material?.map : undefined;
            if (m)
              maps.push({
                w: m.image.naturalWidth,
                src: m.image.src.replace(/.*\//, ''),
                near: m.magFilter === 1003,
                fine: o.layers.mask === 2,
              });
          });
      const hud = document.querySelector('#purse .coins image')?.getAttribute('href')?.replace(/.*\//, '') ?? null;
      return {
        face: g.obolFace,
        maps: [...new Map(maps.map((m) => [m.src, m])).values()],
        hud,
        fineDrawn: g.fineLayerDrawn,
      };
    });
  await page.evaluate(() => {
    const g = (window as unknown as { __game: GC }).__game;
    g.drop('coin', g.player.x + 2, g.player.z - 2);
    g.sim(0.3, true);
  });
  // the manifest's face: 48 pixels across on the fine layer (two to each of the coin's 24 game pixels), drawn pixel for
  // pixel, and its icon on the HUD's counter
  expect(await look()).toEqual({
    face: 'star_crystal',
    maps: [{ w: 48, src: 'star_crystal.png', near: true, fine: true }],
    hud: 'star_crystal-icon.png',
    fineDrawn: true,
  });
  expect(await page.evaluate(() => (window as unknown as { __game: GC }).__game.obolFaces)).toEqual([
    'arcane_eye',
    'silver_owl',
    'star_crystal',
    'grave_coin',
    'arcane_sigil',
    'pale_obol',
    'plain_profile',
    'rune',
  ]);
  // another face: the obol lying there and the counter change with it; the rune: the coin built in code, the drawn icon
  await page.evaluate(() => {
    const g = (window as unknown as { __game: GC }).__game;
    g.wearFace('pale_obol');
    g.sim(0.1, true);
  });
  expect(await look()).toEqual({
    face: 'pale_obol',
    maps: [{ w: 48, src: 'pale_obol.png', near: true, fine: true }],
    hud: 'pale_obol-icon.png',
    fineDrawn: true,
  });
  await page.evaluate(() => {
    const g = (window as unknown as { __game: GC }).__game;
    g.wearFace('rune');
    g.sim(0.1, true);
  });
  expect(await look()).toEqual({ face: 'rune', maps: [], hud: null, fineDrawn: false }); // (nothing on the fine layer: the rune is drawn with the rest)
  // the choice is remembered in the browser; the gallery stands every face side by side
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __game?: unknown }).__game);
  expect(await page.evaluate(() => (window as unknown as { __game: GC }).__game.obolFace)).toBe('rune');
  await page.evaluate(() => (window as unknown as { __game: GC }).__game.wearFace('star_crystal'));
  await start(page, '?seed=K3F9QX');
  expect(
    await page.evaluate(() => {
      const g = (window as unknown as { __game: GC }).__game;
      const n = g.coinGallery();
      g.sim(0.1, true);
      g.takeCoinGallery();
      return n;
    }),
  ).toBe(8);
  // made assets off: the obol built in code
  await start(page, '?seed=K3F9QX&assets=off');
  expect(await page.evaluate(() => (window as unknown as { __game: GC }).__game.obolFace)).toBe('rune');
  expect(errors).toEqual([]);
});

test('the pixel look: at the texel from the start, the fine grid from the URL, drawn with outlines and light in bands, then off again; the mage in pixel art; and the spell effect options, without errors', async ({
  page,
}) => {
  type Look = { lines: 0 | 'texel' | 'fine'; outline: boolean; bands: boolean; ramps: boolean };
  type GP = {
    sim(sec: number, draw?: boolean): void;
    pixelLook: Look;
    pixelRows: number;
    setPixelLook(l: Partial<Look>): void;
    renderInfo(): { calls: number };
    hero: {
      model: { traverse(f: (o: { material?: { type: string }; userData?: { pixel?: unknown } }) => void): void };
    };
  };
  // by default a game pixel is one of the room kit's texels: the view (8.7 units tall) is some 420 rows, whatever the window
  let first: string[] = [];
  const texel = await (async () => {
    first = await start(page, '?seed=K3F9QX');
    return page.evaluate(() => {
      const g = (window as unknown as { __game: GP }).__game;
      g.sim(0.1, true);
      // (the model's own meshes, which the bake dressed; not what it wears or holds)
      const own = (f: (type: string) => void) =>
        g.hero.model.traverse((o) => {
          if (o.material && o.userData?.pixel) f(o.material.type);
        });
      const types = new Set<string>();
      own((t) => types.add(t));
      return { look: g.pixelLook, rows: g.pixelRows, pixel: [...types] };
    });
  })();
  expect(texel.look).toEqual({ lines: 'texel', outline: true, bands: false, ramps: true });
  expect(texel.rows).toBeGreaterThan(400);
  expect(texel.rows).toBeLessThan(440);
  expect(texel.pixel).toEqual(['MeshToonMaterial']); // (the mage's colours baked, a few of them, light in bands)
  expect(first).toEqual([]);
  const errors = await start(page, '?seed=K3F9QX&pixel=fine');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GP }).__game,
      out: { look: Look; calls: number }[] = [];
    for (const l of [
      {},
      { outline: true, bands: true },
      { lines: 'texel', outline: false },
      { lines: 0 },
    ] as Partial<Look>[]) {
      g.setPixelLook(l);
      g.sim(0.1, true);
      out.push({ look: g.pixelLook, calls: g.renderInfo().calls });
    }
    return out;
  });
  expect(r[0].look.lines).toBe('fine');
  expect(r[1].look).toEqual({ lines: 'fine', outline: true, bands: true, ramps: true });
  expect(r[2].look.lines).toBe('texel');
  expect(r[3].look.lines).toBe(0);
  // (the scene, the actors' mask from their stamp, its shading at the grid's size, then the blow-up to the window)
  expect(r[1].calls).toBe(r[3].calls + 3);
  // the spell effect options, each playing its cast over and over
  const played = await page.evaluate(() => {
    const g = (window as unknown as { __game: GP & { effectOptions(): { id: string }[] } }).__game;
    g.setPixelLook({ lines: 'texel' });
    const at = g.effectOptions();
    g.sim(2.5, true);
    g.setPixelLook({ lines: 0 });
    return at.length;
  });
  expect(played).toBe(11);
  await page.screenshot({ path: 'test-results/pixel-look.png' });
  expect(errors).toEqual([]);
  // off, from the URL only (for tools and tests): nothing is drawn in the pixel look
  const offErrors = await start(page, '?seed=K3F9QX&pixel=off');
  const off = await page.evaluate(() => {
    const g = (window as unknown as { __game: GP }).__game;
    g.sim(0.1, true);
    return { lines: g.pixelLook.lines, rows: g.pixelRows };
  });
  expect(off).toEqual({ lines: 0, rows: 0 });
  expect(offErrors).toEqual([]);
});

test("a floor's grade (the art bible's cool shadows): floor 1 leans its darks toward its shadow colour, lifts black and fills more light; a floor without one is drawn as it is", async ({
  page,
}) => {
  type GG = { grade: { shadow: string; amount: number; lift: number }; lightLevels(): { fill: number } };
  const one = await start(page, '?seed=GRADE1');
  const f1 = await page.evaluate(() => {
    const g = (window as unknown as { __game: GG }).__game;
    return { grade: g.grade, fill: g.lightLevels().fill };
  });
  expect(f1.grade.amount).toBeGreaterThan(0);
  expect(f1.grade.lift).toBeGreaterThan(0);
  expect(f1.grade.shadow).toMatch(/^#[0-9a-f]{6}$/);
  expect(f1.fill).toBeGreaterThan(1);
  expect(one).toEqual([]);
  const two = await start(page, '?seed=GRADE1&floor=2');
  const f2 = await page.evaluate(() => {
    const g = (window as unknown as { __game: GG }).__game;
    return { grade: g.grade, fill: g.lightLevels().fill };
  });
  expect(f2.grade).toMatchObject({ amount: 0, lift: 0 });
  expect(f2.fill).toBe(1);
  expect(two).toEqual([]);
});

test("a plain room's scatter: on floor 1 a fight's room is strewn from the floor's own scatter (bones, pebbles, verdigris, cobwebs by the walls), only kinds it names; a floor without one leaves its plain rooms bare", async ({
  page,
}) => {
  type GS = { scatterHere: Record<string, number> };
  const kinds = ['bones', 'pebbles', 'verdigris', 'webs', 'stains', 'relics'];
  const one = await start(page, '?room=crypt_a&seed=SCATTER1');
  const s1 = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS & { warp(i: number): void } }).__game;
    g.warp(1);
    return g.scatterHere;
  });
  expect(Object.values(s1).reduce((a, b) => a + b, 0)).toBeGreaterThan(4);
  for (const k of Object.keys(s1)) expect(kinds).toContain(k);
  expect(one).toEqual([]);
  const two = await start(page, '?room=crypt_a&seed=SCATTER1&floor=2');
  const s2 = await page.evaluate(() => {
    const g = (window as unknown as { __game: GS & { warp(i: number): void } }).__game;
    g.warp(1);
    return g.scatterHere;
  });
  expect(s2).toEqual({});
  expect(two).toEqual([]);
});

test("floor 1's relics: the standing ones (grave marker, angel's head, skull pile, broken urn) block like a rock and break to a glyph's blast; the flat ones are walked over", async ({
  page,
}) => {
  type Rock = {
    x: number;
    z: number;
    hx: number;
    hz: number;
    breakable: boolean;
    mesh?: { userData: { relic?: string } };
  };
  type GR = {
    warp(i: number): void;
    relicsHere(): void;
    blast(x: number, z: number): void;
    sim(t: number): void;
    current: { rocks: Rock[] };
  };
  const errors = await start(page, '?room=crypt_a&variant=quiet&seed=RELIC2');
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: GR }).__game;
    g.warp(1);
    const before = g.current.rocks.length;
    g.relicsHere();
    const mine = g.current.rocks.slice(before);
    const placed = {
      ids: mine.map((k) => k.mesh?.userData.relic ?? '').sort(),
      sized: mine.every((k) => k.breakable && k.hx > 0.08 && k.hz > 0.08 && k.hx < 0.6 && k.hz < 0.6),
    };
    for (const k of mine) {
      g.blast(k.x, k.z);
      g.sim(0.1);
    }
    return { placed, left: mine.filter((k) => g.current.rocks.includes(k)).length }; // (a blast may break the room's own too)
  });
  expect(r.placed.ids).toEqual(['angel_head', 'broken_urn', 'grave_marker', 'skull_pile']);
  expect(r.placed.sized).toBe(true);
  expect(r.left).toBe(0);
  expect(errors).toEqual([]);
});

test("floor 1's standing relics never cut a room in two: on several seeds, every room's floor is as joined up with them as without", async ({
  page,
}) => {
  type Rm = {
    template: { tiles: string[][] };
    rocks: { tile?: { c: number; r: number }; mesh?: { userData: { relic?: string } } }[];
  };
  let relics = 0;
  for (const seed of ['RELICS1', 'RELICS2', 'RELICS3', 'RELICS4']) {
    const errors = await start(page, `?seed=${seed}`);
    const r = await page.evaluate(() => {
      const g = (window as unknown as { __game: { rooms(): Rm[] } }).__game;
      // the pieces of a room's floor (four ways round), with its relics' tiles counted as floor or not
      const parts = (tiles: string[][], open: (c: number, r: number) => boolean) => {
        const seen = new Set<string>();
        let n = 0;
        tiles.forEach((row, r) =>
          row.forEach((_, c) => {
            if (!open(c, r) || seen.has(`${c},${r}`)) return;
            n++;
            const todo = [[c, r]];
            seen.add(`${c},${r}`);
            while (todo.length) {
              const [x, y] = todo.pop()!;
              for (const [dx, dy] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ]) {
                const k = `${x + dx},${y + dy}`;
                if (!seen.has(k) && open(x + dx, y + dy)) {
                  seen.add(k);
                  todo.push([x + dx, y + dy]);
                }
              }
            }
          }),
        );
        return n;
      };
      let relics = 0;
      const cut: number[] = [];
      g.rooms().forEach((room, i) => {
        const mine = new Set(
          room.rocks.filter((k) => k.mesh?.userData.relic && k.tile).map((k) => `${k.tile!.c},${k.tile!.r}`),
        );
        relics += mine.size;
        const t = room.template.tiles,
          floor = (c: number, r: number) => t[r]?.[c] === 'floor';
        if (parts(t, (c, r) => floor(c, r) || mine.has(`${c},${r}`)) !== parts(t, floor)) cut.push(i);
      });
      return { relics, cut };
    });
    relics += r.relics;
    expect(r.cut, seed).toEqual([]);
    expect(errors).toEqual([]);
  }
  expect(relics).toBeGreaterThan(3); // (the check saw some)
});
