import { expect, test } from '@playwright/test';
import { start } from './helpers';

test('a great hall packed with every object stays within its draw calls (their still parts are merged)', async ({
  page,
}) => {
  type G9 = {
    warp(id: number): void;
    clearRoom(): void;
    sim(sec: number, draw?: boolean): void;
    prop(kind: string, x: number, z: number): boolean;
    props: { kind: string; x: number; z: number }[];
    element(kind: string, x: number, z: number): void;
    renderInfo(): { calls: number; triangles: number };
    current: {
      cx: number;
      cz: number;
      bounds: { minX: number; minZ: number };
      template: { w: number; h: number; tiles: string[][] };
    };
    player: { x: number; z: number; invuln: number };
  };
  const errors = await start(page, '?room=reliquary_great&seed=K3F9QX'); // (one seed: the same niches, doors and scatter every time)
  const r = await page.evaluate(() => {
    const g = (window as unknown as { __game: G9 }).__game;
    g.warp(1);
    g.clearRoom();
    g.player.invuln = 99;
    const kinds = [
      'bones',
      'skulls',
      'sacks',
      'cask',
      'rubble',
      'roots',
      'briar',
      'web',
      'glowcap',
      'pew',
      'desk',
      'scrolls',
      'brazier',
      'candles',
      'bell',
      'rune',
      'lodestone',
      'censer',
      'reliquary',
      'tree',
    ];
    const t = g.current.template,
      b = g.current.bounds;
    let k = 0;
    for (let row = 1; row < t.h - 1; row += 2)
      for (let c = 1; c < t.w - 1; c += 2)
        if (t.tiles[row][c] === 'floor' && g.prop(kinds[k % kinds.length], b.minX + c + 0.5, b.minZ + row + 0.5)) k++;
    for (const p of g.props) if (p.kind === 'brazier' || p.kind === 'candles') g.element('burn', p.x, p.z);
    g.player.x = g.current.cx;
    g.player.z = g.current.cz;
    g.sim(0.5, true);
    return { placed: k, ...g.renderInfo() };
  });
  console.log(`packed great hall: ${r.placed} objects, ${r.calls} draw calls, ${r.triangles} triangles`);
  expect(r.placed).toBeGreaterThan(80);
  expect(r.calls).toBeLessThan(750); // (1,085 without objects' still parts merged)
  expect(errors).toEqual([]);
});

test(
  "the room kit: torches, braziers and candle stands built in code, the crypt's floor and walls in pixel art",
  { tag: '@fast' },
  async ({ page }) => {
    type Mat = { map?: { magFilter: number }; transparent?: boolean };
    type O = {
      userData: Record<string, unknown>;
      visible: boolean;
      traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void;
    };
    type Box = {
      x: number;
      z: number;
      prop: { kind: string; lit?: boolean; parts?: Record<string, O & { material?: { color: { getHex(): number } } }> };
    };
    type GR = {
      sim(sec: number, draw?: boolean): void;
      prop(kind: string, x: number, z: number): boolean;
      burn(x: number, z: number, r?: number): void;
      renderInfo(): { calls: number };
      current: { group: O; torches: { flame: O; lit: boolean }[]; props?: Box[] };
      player: { x: number; z: number };
    };
    const errors = await start(page, '?seed=K3F9QX');
    const look = () =>
      page.evaluate(() => {
        const g = (window as unknown as { __game: GR }).__game,
          p = g.player,
          room = g.current as unknown as { cx: number; cz: number };
        p.x = room.cx;
        p.z = room.cz + 0.6; // (the room's middle: built again, the mage stands at a door)
        g.prop('brazier', p.x - 1.5, p.z - 1.8);
        g.prop('candles', p.x + 1.5, p.z - 1.8);
        for (const b of g.current.props ?? []) g.burn(b.x, b.z, 0.3);
        g.sim(0.6, true);
        let nearest = 0;
        g.current.group.traverse((o) => {
          if ([o.material ?? []].flat().some((m) => m.map?.magFilter === 1003 && !m.transparent)) nearest++;
        }); // (NearestFilter: the pixel floor and walls; not the stepped glows and shadows)
        const brazier = g.current.props!.find((b) => b.prop.kind === 'brazier')!,
          stand = g.current.props!.find((b) => b.prop.kind === 'candles')!;
        return {
          nearest,
          torches: g.current.torches.length,
          fire: g.current.torches.every((t) => !!t.flame.userData.fire),
          brazier: {
            lit: !!brazier.prop.lit,
            fire: !!brazier.prop.parts?.flame.userData.fire,
            runes: brazier.prop.parts?.runes?.material?.color.getHex() ?? null,
          },
          stand: { lit: !!stand.prop.lit, shown: !!stand.prop.parts?.flames.visible },
          calls: g.renderInfo().calls,
        };
      });
    const kit = await look();
    expect(kit).toMatchObject({
      fire: true,
      brazier: { lit: true, fire: true, runes: 0xffa040 },
      stand: { lit: true, shown: true },
    });
    expect(kit.torches).toBeGreaterThan(0);
    expect(kit.nearest).toBeGreaterThanOrEqual(2); // (the floor, and the walls)
    await page.screenshot({ path: 'test-results/room-kit.png' });
    expect(errors).toEqual([]);
  },
);

// (a test a floor: each floor's rooms are built several times over, too long for one test on a CI runner)
for (const floor of [1, 2, 3, 4, 5])
  test(`the room kit's variety, floor ${floor}: rooms draw different kinds, and every kind of wall, floor, wall light and brazier builds on it`, async ({
    page,
  }) => {
    type K = { wall: string; floor: string; torch: string; brazier: string };
    type GV = {
      sim(sec: number, draw?: boolean): void;
      kinds: K | null;
      forceKinds(k: Partial<K>): void;
      prop(kind: string, x: number, z: number): boolean;
      burn(x: number, z: number, r?: number): void;
      renderInfo(): { calls: number };
      rooms(): { look: { kinds?: K; kit?: Record<string, Record<string, number>> } }[];
      current: { cx: number; cz: number };
    };
    const errors = await start(page, `?seed=K3F9QX&floor=${floor}`);
    const r = await page.evaluate(() => {
      const g = (window as unknown as { __game: GV }).__game,
        kit = g.rooms()[0].look.kit!;
      const drawn = new Set(g.rooms().map((room) => room.look.kinds!.wall + '/' + room.look.kinds!.floor)); // (drawn per room, on its seed)
      const lists = {
          wall: Object.keys(kit.wall),
          floor: Object.keys(kit.floor),
          torch: Object.keys(kit.torch),
          brazier: Object.keys(kit.brazier),
        },
        built: K[] = [],
        calls: number[] = [];
      for (let i = 0; i < 3; i++) {
        const want = {
          wall: lists.wall[i % lists.wall.length],
          floor: lists.floor[i % lists.floor.length],
          torch: lists.torch[i % lists.torch.length],
          brazier: lists.brazier[i % lists.brazier.length],
        };
        g.forceKinds(want);
        g.prop('brazier', g.current.cx, g.current.cz);
        g.burn(g.current.cx, g.current.cz, 0.3);
        g.sim(0.3, true);
        built.push(g.kinds!);
        calls.push(g.renderInfo().calls);
      }
      g.forceKinds({});
      return { drawn: drawn.size, lists, built, calls };
    });
    expect(r.drawn, `floor ${floor}`).toBeGreaterThan(1);
    r.built.forEach((k, i) =>
      expect(k).toEqual({
        wall: r.lists.wall[i % r.lists.wall.length],
        floor: r.lists.floor[i % r.lists.floor.length],
        torch: r.lists.torch[i % r.lists.torch.length],
        brazier: r.lists.brazier[i % r.lists.brazier.length],
      }),
    );
    for (const c of r.calls) expect(c).toBeLessThan(260);
    expect(errors).toEqual([]);
  });

// (a test a floor, as the variety's above)
for (const floor of [1, 2, 3, 4, 5])
  test(`the room kit's objects, floor ${floor}: every pile and object, urns, pedestals, pillars and tombs built in code, burning in the kit's fire`, async ({
    page,
  }) => {
    type Mat = { vertexColors?: boolean };
    type O = { userData: Record<string, unknown>; traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void };
    type Box = { x: number; z: number; prop: { kind: string; flame?: O; mesh: O } };
    type GO = {
      sim(sec: number, draw?: boolean): void;
      objectsHere(): void;
      showAssets(): void;
      burn(x: number, z: number, r?: number): void;
      renderInfo(): { calls: number };
      warp(id: number): void;
      clearRoom(): void;
      current: { props?: Box[]; rocks: { urn?: string; mesh?: O }[]; spots: { pedestal: O }[]; group: O };
    };
    const objects = () =>
      page.evaluate(() => {
        const g = (window as unknown as { __game: GO }).__game;
        const painted = (o: O) => {
          let n = 0;
          o.traverse((q) => {
            if ([q.material ?? []].flat().some((m) => m.vertexColors)) n++;
          });
          return n > 0;
        }; // (the room kit's pieces: colours in the vertices)
        g.objectsHere();
        g.showAssets();
        g.sim(0.3, true);
        const props = g.current.props ?? [],
          urns = g.current.rocks.filter((r) => r.urn),
          calls = g.renderInfo().calls;
        const sack = props.find((b) => b.prop.kind === 'sacks')!;
        g.burn(sack.x, sack.z, 0.1);
        g.sim(0.2, true);
        return {
          kinds: props.map((b) => b.prop.kind).sort(),
          painted: props.filter((b) => painted(b.prop.mesh)).length,
          urns: urns.length,
          urnsPainted: urns.filter((u) => u.mesh && painted(u.mesh)).length,
          pedestal: painted(g.current.spots[g.current.spots.length - 1].pedestal),
          burning: !!sack.prop.flame,
          kitFire: !!sack.prop.flame?.userData.fire,
          calls,
        };
      });
    const kinds = [
      'blossom',
      'boat',
      'bones',
      'briar',
      'bridge',
      'cask',
      'desk',
      'globe',
      'glowcap',
      'hoard',
      'pew',
      'roots',
      'rubble',
      'sacks',
      'scrolls',
      'skulls',
      'tree',
      'web',
    ];
    const errors = await start(page, `?seed=K3F9QX&floor=${floor}`);
    const kit = await objects();
    expect(kit.kinds, `floor ${floor}`).toEqual(kinds);
    // (all but the cobweb, drawn in pixel art; two urns each from both buttons, every floor's its own made urn, so none is
    // painted in code: data/assets.json urn_crypt, urn_drowned, urn_burning, urn_reliquary, urn_shore)
    expect(kit).toMatchObject({ painted: 17, urns: 4, urnsPainted: 0, pedestal: true, burning: true, kitFire: true });
    expect(kit.calls).toBeLessThan(260);
    if (floor === 1) await page.screenshot({ path: 'test-results/room-kit-objects.png' });
    // a room of pillars and a tomb
    const room = await start(page, `?seed=K3F9QX&floor=${floor}&room=sarcophagus`);
    const pieces = await page.evaluate(() => {
      const g = (window as unknown as { __game: GO }).__game;
      g.warp(1);
      g.clearRoom();
      g.sim(0.2, true);
      let n = 0;
      g.current.group.traverse((o) => {
        if ([o.material ?? []].flat().some((m) => m.vertexColors)) n++;
      });
      return n;
    });
    expect(pieces).toBeGreaterThanOrEqual(9); // (four pillars, a tomb, urns and the torches)
    expect(errors).toEqual([]);
    expect(room).toEqual([]);
  });

test("the room kit's doors, gates, niches and pilasters: built in code, one mesh a gate, few draw calls, and the gate still rises", async ({
  page,
}) => {
  type Mat = { vertexColors?: boolean };
  type O = { children: O[]; position: { y: number }; traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void };
  type GD = {
    sim(sec: number, draw?: boolean): void;
    warp(id: number): void;
    renderInfo(): { calls: number };
    current: { locked: boolean; doors: { style: string; bars: O; barH: number }[]; group: O };
  };
  const look = () =>
    page.evaluate(() => {
      const g = (window as unknown as { __game: GD }).__game;
      g.sim(0.3, true);
      const start = {
        calls: g.renderInfo().calls,
        gates: g.current.doors.filter((d) => d.style !== 'secret').map((d) => d.bars.children.length),
      };
      let painted = 0;
      g.current.group.traverse((o) => {
        if ([o.material ?? []].flat().some((m) => m.vertexColors)) painted++;
      });
      g.warp(1);
      g.sim(1.5, true); // (a fight: the doors lock, the gates rise)
      const shut = g.current.doors.filter((d) => d.style !== 'secret').map((d) => Math.abs(d.bars.position.y) < 0.02);
      return { ...start, painted, locked: g.current.locked, shut };
    });
  const errors = await start(page, '?seed=K3F9QX&room=crypt_a');
  const kit = await look();
  expect(kit.gates.every((n) => n === 1)).toBe(true); // (a gate's bars, tips and rivets in one mesh)
  expect(kit.painted).toBeGreaterThan(6);
  expect(kit.locked).toBe(true);
  expect(kit.shut.every(Boolean)).toBe(true);
  await page.screenshot({ path: 'test-results/room-kit-doors.png' });
  expect(kit.calls).toBeLessThan(68); // (each door and each wall's dressing in a call or two; the room draws in 62, its floor's scatter, merged, among them)
  expect(errors).toEqual([]);
});

test("the room kit's artifacts: every one built in code, and the HUD's icons rendered from them", async ({ page }) => {
  type GA = {
    sim(sec: number, draw?: boolean): void;
    artifactGallery(): number;
    current: { group: { userData: Record<string, unknown> } };
  };
  const icons = () =>
    page.evaluate(async () => {
      const imgs = [...document.querySelectorAll('#items svg image')] as SVGImageElement[];
      const sizes = await Promise.all(
        imgs.map(
          (i) =>
            new Promise<number[]>((ok) => {
              const im = new Image();
              im.onload = () => {
                const c = document.createElement('canvas');
                c.width = im.width;
                c.height = im.height;
                const g = c.getContext('2d')!;
                g.drawImage(im, 0, 0);
                const d = g.getImageData(0, 0, c.width, c.height).data;
                let solid = 0,
                  soft = 0;
                for (let k = 3; k < d.length; k += 4) {
                  if (d[k] > 200) solid++;
                  else if (d[k] > 0) soft++;
                }
                ok([im.width, solid, soft]);
              };
              im.src = i.getAttribute('href')!;
            }),
        ),
      );
      return { images: imgs.length, sizes };
    });
  const errors = await start(
    page,
    '?seed=K3F9QX&give=twin_staff,ember_sigil,rams_skull,leech_jar,crown_of_thorns,hungering_tome',
  );
  const n = await page.evaluate(() => {
    const g = (window as unknown as { __game: GA }).__game;
    const n = g.artifactGallery();
    g.sim(0.3, true);
    return n;
  });
  expect(n).toBe(61); // (every artifact, as the room kit builds it)
  await page.screenshot({ path: 'test-results/room-kit-artifacts.png' });
  const kit = await icons();
  expect(kit.images).toBe(6); // (the twin staff, the focus, and five more, each rendered from its model)
  // pixel art at about the artifact's own size in the room: every pixel drawn or clear, none soft
  for (const [w, solid, soft] of kit.sizes) {
    expect(w).toBe(24);
    expect(solid).toBeGreaterThan(15);
    expect(soft).toBe(0);
  }
  expect(errors).toEqual([]);
});

test("the room kit's pickups and special rooms: every drop (the coffers and chests made in Tripo), coffers and chests that still open, the shade, the library, the shrine's stones and the vault's lock built in code", async ({
  page,
}) => {
  type Mat = { vertexColors?: boolean; isMeshToonMaterial?: boolean };
  type O = { layers?: { mask: number }; traverse(f: (o: O & { material?: Mat | Mat[] }) => void): void };
  const painted = (o?: O) => {
    let n = 0;
    o?.traverse((q) => {
      if ([q.material ?? []].flat().some((m) => m.vertexColors) || q.layers?.mask === 2) n++;
    });
    return n;
  }; // (the room kit's pieces: colours in the vertices; an obol's coin face, on the fine layer)
  const made = (o?: O) => {
    let n = 0;
    o?.traverse((q) => {
      if ([q.material ?? []].flat().some((m) => m.isMeshToonMaterial)) n++;
    });
    return n;
  }; // (a made model, its texture worn as pixel art)
  // (evaluated as strings, so the counting function goes along with them)
  const drops = () =>
    page.evaluate<{
      laid: { kind: string; painted: boolean; made: boolean }[];
      opened: number;
      boxes: number;
      spilled: number;
    }>(`(() => {
    const g = window.__game, painted = ${painted.toString()}, made = ${made.toString()};
    g.dropsHere(); g.sim(.8, true);
    const laid = g.pickups.map(p => ({ kind: p.kind, painted: painted(p.m) > 0, made: made(p.m) > 0 }));
    g.loot({ keys: 3 });
    for (const p of g.pickups.filter(p => p.kind === 'coffer' || p.kind === 'chest')) { g.player.x = p.x; g.player.z = p.z + .5; g.sim(.1, true); }
    g.sim(.8, true);
    const boxes = g.pickups.filter(p => p.kind === 'coffer' || p.kind === 'chest');
    return { laid, opened: boxes.filter(p => p.opened && !p.ward).length, boxes: boxes.length, spilled: g.pickups.length - laid.length };
  })()`);
  const errors = await start(page, '?seed=K3F9QX');
  const kit = await drops();
  expect(kit.laid.map((d) => d.kind).sort()).toEqual([
    'blackSoul',
    'chest',
    'chest',
    'coffer',
    'coin',
    'glyph',
    'halfHeart',
    'hallowedSoul',
    'heart',
    'key',
    'mana',
    'paleSoul',
    'potion',
    'purse',
    'reagent',
    'rune',
    'shard',
  ]);
  expect(kit.laid.every((d) => (d.kind === 'coffer' || d.kind === 'chest' ? d.made : d.painted))).toBe(true);
  expect(kit).toMatchObject({ boxes: 3, opened: 3 });
  expect(kit.spilled).toBeGreaterThan(0); // (a key each for the chests; the gilded one's relic is an artifact, not a pickup)
  await page.screenshot({ path: 'test-results/room-kit-drops.png' });
  // the special rooms' pieces: the shade, the lecterns and bookcases, the offering stones, the vault's padlock
  const special = (q: string) =>
    start(page, `?seed=K3F9QX${q}`).then(async (errs) => ({
      errs,
      ...(await page.evaluate<{
        shade: number;
        eyes: number;
        lecterns: number;
        pages: number;
        stones: number;
        lock: number;
      }>(`(() => {
    const g = window.__game, painted = ${painted.toString()}, outer = g.current.doors.find(d => d.seal)?.seal.mark;
    g.warp(1); g.sim(.5, true);
    const r = g.current;
    return { shade: painted(r.shade), eyes: r.shade?.userData.eyes?.length ?? 0, lecterns: (r.pages ?? []).filter(p => painted(p.g)).length, pages: (r.pages ?? []).length,
      stones: (r.shrine?.stones ?? []).filter(s => painted(s.g) > painted(s.visual)).length, lock: painted(outer) };
  })()`)),
    }));
  const shop = await special('&room=merchant_plain'),
    library = await special('&room=library_plain');
  const shrine = await special('&floor=2&room=shrine_henge&give=chain_of_the_penitent,leaden_heart'),
    vault = await special('&room=vault_urns');
  for (const r of [shop, library, shrine, vault]) expect(r.errs).toEqual([]);
  expect(shop.eyes).toBe(2);
  expect(library.pages).toBe(3);
  expect(shop.shade).toBeGreaterThan(0);
  expect(library.lecterns).toBe(3);
  expect(shrine.stones).toBe(2);
  expect(vault.lock).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
