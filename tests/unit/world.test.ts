import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/rng';
import {
  DOOR_SHIFTS,
  FLOORS,
  GRID_H,
  GRID_W,
  fixedPlan,
  GUARANTEED_SOURCES,
  HARD_VARIANTS,
  OPTIONAL_SOURCES,
  SECRET_SHUNS,
  SHIFTING,
  doorFits,
  generateFloor,
  pickBoss,
  planToText,
  testPlan,
} from '../../src/world/generate';
import { CFG } from '../../src/config';
import { BOSS_TYPES, type BossType } from '../../src/config';
import { OPPOSITE, SIDE_DIR, allowsSide, shapeCells } from '../../src/world/shapes';
import {
  TEMPLATE_DEFS,
  growPuddles,
  parseTemplate,
  poolsOf,
  tombRuns,
  validateTemplate,
} from '../../src/world/templates';
import { validateThemes } from '../../src/world/themeData';
import { isFoe } from '../../src/actors/foeData';
import { floodTiles } from '../../src/world/flood';

describe('room templates', () => {
  it.each(TEMPLATE_DEFS.map((d) => [d.id, d] as const))('%s is valid', (_id, def) => {
    expect(validateTemplate(def)).toEqual([]);
  });

  it('have unique ids', () => {
    const ids = TEMPLATE_DEFS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cover every room type and normal difficulty the generator asks for', () => {
    for (const type of [
      'start',
      'treasure',
      'boss',
      'altar',
      'merchant',
      'vault',
      'secret',
      'shrine',
      'library',
      'laboratory',
      'waystone',
    ] as const)
      expect(TEMPLATE_DEFS.some((d) => d.types.includes(type))).toBe(true);
    for (const d of [1, 2, 3])
      expect(TEMPLATE_DEFS.some((t) => t.types.includes('normal') && t.difficulty === d)).toBe(true);
    for (const d of [1, 2, 3])
      expect(TEMPLATE_DEFS.some((t) => t.types.includes('ordeal') && t.difficulty === d)).toBe(true);
  });

  it('validation catches broken templates', () => {
    const base = TEMPLATE_DEFS.find((d) => d.id === 'crypt_a')!;
    const withRow = (r: number, row: string) => ({ ...base, grid: base.grid.map((x, i) => (i === r ? row : x)) });
    const errors = (def: typeof base) => validateTemplate(def).join('; ');
    expect(errors(withRow(0, '......#......'))).toMatch(/door lane/); // rock in the north door lane
    expect(errors(withRow(2, '.R....R......'))).toMatch(/next to a door/); // (1,2) is beside the west entry (0,3)
    expect(
      errors({
        ...base,
        grid: [
          '.............',
          '.ooo.........',
          '.o.o.........',
          '.ooo.........',
          '.............',
          '.........R...',
          '.............',
        ],
      }),
    ).toMatch(/\(2,2\) can't be reached/);
    expect(errors(withRow(3, '...R..X..R...'))).toMatch(/unknown character/);
    expect(errors({ ...base, types: ['treasure'] })).toMatch(/can't have enemies/);
  });

  it('join tomb tiles into tombs: along a row first, then up and down', () => {
    const def = {
      ...TEMPLATE_DEFS.find((d) => d.id === 'crypt_a')!,
      grid: [
        '.............',
        '.===....=....',
        '........=..i.',
        '..=..........',
        '.............',
        '.........==..',
        '.............',
      ],
    };
    expect(tombRuns(parseTemplate(def))).toEqual([
      { c: 1, r: 1, len: 3, across: true },
      { c: 9, r: 5, len: 2, across: true },
      { c: 2, r: 3, len: 1, across: false },
      { c: 8, r: 1, len: 2, across: false },
    ]);
    // pillars and tombs block like rocks: not in door lanes, and enemies can't stand on them
    expect(
      validateTemplate({ ...def, grid: def.grid.map((row, r) => (r === 3 ? 'i..=.....R...' : row)) }).join(),
    ).toMatch(/door lane tile \(0,3\) is blocked/);
  });

  it('mirror without changing their contents', () => {
    const def = TEMPLATE_DEFS.find((d) => d.id === 'crypt_b')!;
    const a = parseTemplate(def),
      b = parseTemplate(def, true, true);
    expect(b.foes.length).toBe(a.foes.length);
    expect(b.tiles[0][0]).toBe(a.tiles[a.h - 1][a.w - 1]);
  });
});

describe('water and oil', () => {
  it('join side by side into pools, never corner to corner, and oil never with water', () => {
    const t = parseTemplate({
      id: 't',
      shape: 'standard',
      types: ['normal'],
      difficulty: 1,
      grid: [
        '~~...........',
        '~.%%.........',
        '...%.........',
        '....~........',
        '.............',
        '.............',
        '............R',
      ],
    });
    const pools = poolsOf(t)
      .map((p) => [p.kind, p.tiles.length])
      .sort();
    expect(pools).toEqual([
      ['oil', 3],
      ['water', 1],
      ['water', 3],
    ]);
  });

  it('stand in some templates of each difficulty, and are walkable where doors and foes need them', () => {
    const kinds = (ch: string) => TEMPLATE_DEFS.filter((d) => d.grid.some((r) => r.includes(ch)));
    expect(kinds('~').length).toBeGreaterThanOrEqual(3);
    expect(kinds('%').length).toBeGreaterThanOrEqual(3);
    for (const d of [...kinds('~'), ...kinds('%')]) expect(validateTemplate(d)).toEqual([]);
  });

  it('grow as puddles over plain floor only, joined up', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const def = TEMPLATE_DEFS.find((d) => d.id === 'crypt_a')!,
        t = parseTemplate(def),
        before = t.tiles.map((r) => [...r]);
      const rng = new Rng(seed);
      growPuddles(t, () => rng.next(), 2, [2, 4]);
      let grown = 0;
      t.tiles.forEach((row, r) =>
        row.forEach((tile, c) => {
          if (tile !== before[r][c]) {
            grown++;
            expect(before[r][c]).toBe('floor');
            expect(tile).toBe('water');
          }
        }),
      );
      expect(grown).toBeGreaterThanOrEqual(2);
      expect(grown).toBeLessThanOrEqual(8);
      for (const p of poolsOf(t)) expect(p.tiles.length).toBeGreaterThanOrEqual(1);
    }
  });
});

/** The floors the generator lays out; the Seal is laid by hand. */
const GENERATED = FLOORS.filter((f) => !f.fixed);

describe('floor generator', () => {
  const SEEDS = 400;

  it.each(GENERATED.map((cfg, i) => [i + 1, cfg] as const))(
    'floor %i follows the rules on %# seeds',
    (floorNo, cfg) => {
      let altars = 0,
        vaults = 0,
        secrets = 0,
        secretArtifacts = 0,
        roomCount = 0,
        bigRooms = 0,
        bossHalls = 0,
        labs = 0,
        stones = 0;
      for (let s = 0; s < SEEDS; s++) {
        const plan = generateFloor(Rng.from('T' + s, 'floor' + floorNo), cfg, floorNo - 1);
        const n = plan.rooms.filter(
          (r) => r.type !== 'secret' && r.type !== 'laboratory' && r.type !== 'waystone',
        ).length; // the secret room comes on top, as do a laboratory and the waystone room
        expect(n).toBeGreaterThanOrEqual(cfg.rooms[0]);
        expect(n).toBeLessThanOrEqual(cfg.rooms[1]);
        const count = (t: string) => plan.rooms.filter((r) => r.type === t).length;
        expect([count('start'), count('boss'), count('treasure'), count('ordeal'), count('merchant')]).toEqual([
          1, 1, 1, 1, 1,
        ]);
        expect(count('altar')).toBeLessThanOrEqual(1);
        expect(count('vault')).toBeLessThanOrEqual(1);
        expect(count('secret')).toBeLessThanOrEqual(1);
        expect(count('shrine')).toBe(cfg.shrine ? 1 : 0); // on floor 2, where it takes a dead end of its own
        expect(count('library')).toBe(1); // on every floor (GDD: first spell no later than the first library)
        expect(count('laboratory')).toBeLessThanOrEqual(cfg.laboratory ? 1 : 0); // (Dr. Jelly's, on floors 1 and 3, in a spare dead end)
        for (const r of plan.rooms.filter((x) => x.type === 'laboratory')) {
          expect(r.dist).toBeGreaterThanOrEqual(2);
          expect(r.shape).toBe('standard');
          expect(r.artifact).toBe(false);
        }
        labs += count('laboratory');
        // the waystone room, on every floor: one cell beside the boss room, opening only into it, never touching the
        // secret room, its door in the middle of its edge, which the boss room's template leaves clear
        expect(count('waystone')).toBeLessThanOrEqual(cfg.waystone ? 1 : 0);
        for (const r of plan.rooms.filter((x) => x.type === 'waystone')) {
          const b = plan.rooms[plan.bossId],
            hid = plan.rooms.find((x) => x.type === 'secret');
          expect([r.shape, r.artifact, r.dist, r.doors.length, r.doors[0].to, r.doors[0].shift]).toEqual([
            'standard',
            false,
            b.dist + 1,
            1,
            b.id,
            0,
          ]);
          const cell = r.cells[0],
            near = (c: { gx: number; gy: number }) => Math.abs(c.gx - cell.gx) + Math.abs(c.gy - cell.gy) === 1;
          if (hid) expect(hid.cells.some(near)).toBe(false);
          const door = b.doors.find((d) => d.to === r.id)!;
          expect(door.shift).toBe(0);
          expect(doorFits(b, door, 0)).toBe(true);
        }
        stones += count('waystone');
        altars += count('altar');
        vaults += count('vault');
        secrets += count('secret');
        // artifacts: the guaranteed sources always; optional ones share what's left of the budget, and an
        // altar is only placed with an artifact to offer
        for (const r of plan.rooms) {
          if (GUARANTEED_SOURCES.includes(r.type) || r.type === 'altar') expect(r.artifact).toBe(true);
          else if (r.type === 'secret') {
            if (r.artifact) secretArtifacts++;
          } // by chance, outside the budget
          else if (!OPTIONAL_SOURCES.includes(r.type)) expect(r.artifact).toBe(false);
        }
        expect(plan.rooms.filter((r) => r.artifact && r.type !== 'secret').length).toBeLessThanOrEqual(
          CFG.artifacts.maxPerFloor,
        );

        // cells are in bounds, never shared, and each room covers exactly its shape
        const owner = new Map<string, number>();
        for (const r of plan.rooms) {
          expect(r.cells.length).toBe(shapeCells(r.shape).length);
          for (const c of r.cells) {
            expect(c.gx >= 0 && c.gx < GRID_W && c.gy >= 0 && c.gy < GRID_H).toBe(true);
            expect(owner.has(c.gx + ',' + c.gy)).toBe(false);
            owner.set(c.gx + ',' + c.gy, r.id);
          }
          roomCount++;
          if (r.shape !== 'standard') bigRooms++;
        }
        // doors come in matching pairs on shared edges, on sides both shapes allow
        for (const r of plan.rooms)
          for (const d of r.doors) {
            expect(allowsSide(r.shape, d.side)).toBe(true);
            const [dx, dy] = SIDE_DIR[d.side],
              other = plan.rooms[d.to];
            expect(owner.get(d.gx + dx + ',' + (d.gy + dy))).toBe(d.to);
            expect(
              other.doors.some(
                (o) => o.to === r.id && o.gx === d.gx + dx && o.gy === d.gy + dy && o.side === OPPOSITE[d.side],
              ),
            ).toBe(true);
          }
        // every room is reachable through doors, and the special rooms are one-cell dead ends
        const nbs = (r: (typeof plan.rooms)[number]) => [...new Set(r.doors.map((d) => d.to))];
        const seen = new Set([plan.startId]);
        const queue = [plan.rooms[plan.startId]];
        while (queue.length)
          for (const id of nbs(queue.pop()!))
            if (!seen.has(id)) {
              seen.add(id);
              queue.push(plan.rooms[id]);
            }
        expect(seen.size).toBe(plan.rooms.length);
        // ...and without passing through the secret room, which opens into two or more rooms, never the boss,
        // a vault or the merchant, from a single cell
        const hidden = plan.rooms.find((r) => r.type === 'secret');
        if (hidden) {
          const open = new Set([plan.startId]),
            q = [plan.rooms[plan.startId]];
          while (q.length)
            for (const id of nbs(q.pop()!))
              if (id !== hidden.id && !open.has(id)) {
                open.add(id);
                q.push(plan.rooms[id]);
              }
          expect(open.size).toBe(n + count('laboratory') + count('waystone'));
          expect(hidden.shape).toBe('standard');
          expect(nbs(hidden).length).toBeGreaterThanOrEqual(2);
          for (const id of nbs(hidden)) expect(SECRET_SHUNS).not.toContain(plan.rooms[id].type);
        }
        const boss = plan.rooms[plan.bossId];
        expect(nbs(boss).filter((id) => plan.rooms[id].type !== 'waystone').length).toBe(1); // a dead end, but for its waystone room
        expect(['standard', 'great']).toContain(boss.shape);
        expect(boss.dist).toBeGreaterThanOrEqual(2);
        if (boss.shape === 'great') bossHalls++;
        for (const t of ['start', 'treasure', 'ordeal', 'altar', 'merchant', 'vault', 'shrine', 'library'])
          for (const r of plan.rooms.filter((x) => x.type === t)) {
            expect(r.shape).toBe('standard');
            if (t !== 'start') expect(nbs(r).filter((id) => plan.rooms[id].type !== 'secret').length).toBe(1); // a hidden doorway may add one
          }
        // templates fit their rooms; floor 1 starts gentle
        for (const r of plan.rooms) {
          const def = TEMPLATE_DEFS.find((d) => d.id === r.templateId)!;
          expect(def.types).toContain(r.type);
          expect(def.shape).toBe(r.shape);
          if (floorNo === 1 && r.type === 'normal' && r.dist === 1 && r.shape === 'standard')
            expect(def.difficulty).toBe(1);
        }
      }
      // altars and vaults are optional; the walk makes room for them, so they turn up about as often as the
      // floor's chances say (an altar a little less, when the budget leaves it nothing to offer)
      expect(altars / SEEDS).toBeGreaterThan(cfg.altarChance * 0.6);
      expect(altars / SEEDS).toBeLessThan(cfg.altarChance + 0.06);
      expect(Math.abs(vaults / SEEDS - cfg.vaultChance)).toBeLessThan(0.08);
      // nearly every floor has a secret room; about half of them hold an artifact
      expect(secrets / SEEDS).toBeGreaterThan(0.95);
      if (cfg.laboratory) expect(labs / SEEDS).toBeGreaterThan(0.9); // (nearly every floor 1 and 3 has a spare dead end for it)
      if (cfg.waystone) expect(stones / SEEDS).toBeGreaterThanOrEqual(0.98);
      else expect(stones).toBe(0); // (nearly always a free cell beside the boss; floor 5's great halls leave a few seeds none)
      expect(Math.abs(secretArtifacts / secrets - cfg.secretArtifactChance)).toBeLessThan(0.1);
      // about a third of the rooms take a larger or narrow shape; some bosses get a great hall
      const share = bigRooms / roomCount;
      expect(share).toBeGreaterThan(0.12);
      expect(share).toBeLessThan(0.5);
      expect(bossHalls).toBeGreaterThan(0);
    },
  );

  it.each(FLOORS.map((cfg, i) => [i + 1, cfg] as const))('floor %i has a complete look', (_n, cfg) => {
    const { floor, wall, torch, light } = cfg.look;
    const hex = /^#[0-9a-f]{6}$/i,
      rgb = (v: number[]) => v.length === 3 && v.every((x) => x >= 0 && x <= 255);
    expect(rgb(floor.base) && rgb(wall.brick)).toBe(true);
    for (const c of [floor.mortar, wall.mortar, torch.flame, torch.light, light.sky, light.ground, light.moon])
      expect(c).toMatch(hex);
    expect(floor.stain).toMatch(/^\d+,\d+,\d+$/);
    expect(['bones', 'puddles', 'ash', 'wax']).toContain(floor.decor);
    expect(['none', 'moss', 'soot', 'gilt', 'salt']).toContain(wall.stains);
  });

  it("names a known enemy as each floor's vault warden", () => {
    for (const f of FLOORS) {
      expect(isFoe(f.vaultWarden), f.vaultWarden).toBe(true);
      expect(BOSS_TYPES).not.toContain(f.vaultWarden as never);
    } // (a floor's own foe)
  });

  it('gives every floor its own look', () => {
    expect(new Set(FLOORS.map((f) => f.look.name)).size).toBe(FLOORS.length);
  });

  it('dresses only normal rooms in variants, harder ones more often on deeper floors', () => {
    const hardShare = GENERATED.map((cfg, f) => {
      let normal = 0,
        hard = 0;
      for (let s = 0; s < 300; s++) {
        const plan = generateFloor(Rng.from('V' + s, 'floor' + f), cfg, f);
        for (const r of plan.rooms) {
          if (r.type !== 'normal') {
            expect(r.variant).toBe('normal');
            continue;
          }
          normal++;
          if (HARD_VARIANTS.includes(r.variant)) hard++;
          if (f === 0 && r.dist === 1) expect(HARD_VARIANTS).not.toContain(r.variant); // the first rooms stay gentle
        }
      }
      return hard / normal;
    });
    expect(hardShare[0]).toBeGreaterThan(0.08);
    for (let f = 1; f < hardShare.length; f++)
      expect(hardShare[f - 1], `floor ${f} against ${f + 1}`).toBeLessThan(hardShare[f]);
  });

  it('has room in the budget for every optional source a floor has today', () => {
    for (let s = 0; s < 300; s++) {
      const plan = generateFloor(Rng.from('B' + s, 'floor3'), FLOORS[2], 2);
      for (const r of plan.rooms.filter((x) => OPTIONAL_SOURCES.includes(x.type))) expect(r.artifact).toBe(true);
    }
  });

  it('shares a tighter budget among the optional sources in a shuffled order', () => {
    const cap = CFG.artifacts.maxPerFloor;
    CFG.artifacts.maxPerFloor = GUARANTEED_SOURCES.length + 2; // two optional artifacts
    try {
      const got: Record<string, number> = { merchant: 0, vault: 0, altar: 0 },
        had: Record<string, number> = { merchant: 0, vault: 0, altar: 0 };
      for (let s = 0; s < 600; s++) {
        const plan = generateFloor(Rng.from('B' + s, 'floor3'), FLOORS[2], 2);
        const optional = plan.rooms.filter((r) => OPTIONAL_SOURCES.includes(r.type));
        expect(optional.filter((r) => r.artifact).length).toBe(Math.min(optional.length, 2));
        if (plan.rooms.some((r) => r.type === 'vault'))
          for (const r of optional) {
            had[r.type]++;
            if (r.artifact) got[r.type]++;
          }
      }
      // with a vault on the floor, the merchant and the vault both sometimes go without
      expect(got.merchant).toBeLessThan(had.merchant);
      expect(got.vault).toBeLessThan(had.vault);
      expect(got.vault).toBeGreaterThan(had.vault * 0.5);
    } finally {
      CFG.artifacts.maxPerFloor = cap;
    }
  });

  it('is deterministic for a seed', () => {
    const a = generateFloor(Rng.from('ABC123', 'floor1'), FLOORS[0], 0);
    const b = generateFloor(Rng.from('ABC123', 'floor1'), FLOORS[0], 0);
    expect(planToText(a)).toBe(planToText(b));
    expect(a.rooms.map((r) => r.templateId)).toEqual(b.rooms.map((r) => r.templateId));
  });

  it('gives different maps for different seeds', () => {
    const maps = new Set(
      Array.from({ length: 20 }, (_, i) => planToText(generateFloor(Rng.from('S' + i, 'floor1'), FLOORS[0], 0))),
    );
    expect(maps.size).toBeGreaterThan(15);
  });

  it('builds a test floor for any template', () => {
    const plan = testPlan('boss_pits');
    expect(plan.rooms.map((r) => r.type)).toEqual(['start', 'boss']);
    expect(testPlan('crypt_a', 'dark').rooms[1].variant).toBe('dark');
    expect(testPlan('boss_pits', 'dark').rooms[1].variant).toBe('normal'); // variants are for normal rooms
    expect(testPlan('merchant_plain').rooms[1]).toMatchObject({ type: 'merchant', artifact: true });
    expect(testPlan('crypt_a').rooms[1].artifact).toBe(false);
    expect(() => testPlan('nope')).toThrow();
    for (const def of TEMPLATE_DEFS) {
      const p = testPlan(def.id);
      expect(p.rooms[1].doors.some((d) => d.to === 0)).toBe(true); // reachable from the start
    }
  });
});

describe('doors off the middle', () => {
  it('move along their edge on both sides alike, only where both rooms leave room, and never in shops and the like', () => {
    let doors = 0,
      shifted = 0;
    for (let s = 0; s < 150; s++)
      for (const [i, cfg] of FLOORS.entries()) {
        const plan = generateFloor(Rng.from('D' + s, 'floor' + (i + 1)), cfg, i);
        for (const room of plan.rooms)
          for (const d of room.doors) {
            const other = plan.rooms[d.to],
              [dx, dy] = SIDE_DIR[d.side];
            const back = other.doors.find(
              (o) => o.to === room.id && o.side === OPPOSITE[d.side] && o.gx === d.gx + dx && o.gy === d.gy + dy,
            )!;
            expect(back.shift).toBe(d.shift);
            doors++;
            if (!d.shift) continue;
            shifted++;
            expect(SHIFTING.includes(room.type) && SHIFTING.includes(other.type)).toBe(true);
            expect(DOOR_SHIFTS[d.side === 'n' || d.side === 's' ? 'ns' : 'ew']).toContain(d.shift);
            expect(doorFits(room, d, d.shift)).toBe(true);
          }
      }
    // about half of the doors roll to move, and most of those find somewhere to go
    expect(shifted / doors).toBeGreaterThan(0.2);
    expect(shifted / doors).toBeLessThan(0.5);
  });

  it('the waystone room leaves the rest of the floor as it was', () => {
    const without = (plan: ReturnType<typeof generateFloor>) => {
      const stone = plan.rooms.find((r) => r.type === 'waystone')?.id;
      return plan.rooms
        .filter((r) => r.id !== stone)
        .map((r) => [r.type, r.templateId, r.cells, r.seed, r.doors.filter((d) => d.to !== stone)]);
    };
    for (let f = 0; f < 4; f++)
      for (let s = 0; s < 60; s++) {
        const plan = generateFloor(Rng.from('W' + s, 'floor' + f), FLOORS[f], f),
          none = generateFloor(Rng.from('W' + s, 'floor' + f), { ...FLOORS[f], waystone: false }, f);
        expect(none.rooms.some((r) => r.type === 'waystone')).toBe(false);
        expect(without(plan)).toEqual(without(none));
      }
  });

  it('leave the rest of the floor as it was', () => {
    const plan = generateFloor(Rng.from('SAME', 'floor1'), FLOORS[0], 0),
      still = generateFloor(Rng.from('SAME', 'floor1'), { ...FLOORS[0], doorShift: 0 }, 0);
    expect(plan.rooms.map((r) => [r.type, r.templateId, r.cells])).toEqual(
      still.rooms.map((r) => [r.type, r.templateId, r.cells]),
    );
    expect(still.rooms.every((r) => r.doors.every((d) => d.shift === 0))).toBe(true);
  });
});

describe('themed rooms', () => {
  it('are valid: every theme has templates, only fights are themed, floors draw on known themes', () => {
    expect(validateThemes(TEMPLATE_DEFS, FLOORS)).toEqual([]);
    expect(validateThemes([{ id: 'a', theme: 'nope', types: ['boss'] }], [{ themes: { nope: 1 } }]).join()).toMatch(
      /unknown theme "nope".*only fights.*floor 1 draws on unknown/s,
    );
  });

  it("hold about two fights in five, from the floor's themes; the rest stay plain", () => {
    for (const [i, cfg] of GENERATED.entries()) {
      let fights = 0,
        themed = 0;
      for (let s = 0; s < 150; s++)
        for (const r of generateFloor(Rng.from('TH' + s, 'floor' + (i + 1)), cfg, i).rooms) {
          if (r.type !== 'normal') continue;
          fights++;
          const theme = TEMPLATE_DEFS.find((d) => d.id === r.templateId)!.theme;
          if (theme) {
            themed++;
            expect(Object.keys(cfg.themes)).toContain(theme);
          }
        }
      expect(themed / fights).toBeGreaterThan(0.2);
      expect(themed / fights).toBeLessThan(cfg.themeChance + 0.05);
    }
  });

  it('can be forced: every one-cell fight in one theme', () => {
    const plan = generateFloor(
      Rng.from('FORCE', 'floor1'),
      { ...FLOORS[0], themeChance: 1, themes: { ossuary: 1 } },
      0,
    );
    for (const r of plan.rooms)
      if (r.type === 'normal' && r.shape === 'standard')
        expect(TEMPLATE_DEFS.find((d) => d.id === r.templateId)!.theme).toBe('ossuary');
  });
});

describe('bosses', () => {
  it('every floor draws from a pool of known bosses', () => {
    for (const f of FLOORS) {
      expect(f.boss.pool.length).toBeGreaterThan(0);
      for (const b of f.boss.pool) expect(BOSS_TYPES).toContain(b);
    }
  });

  it('a run meets a different boss on every floor, and runs differ', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const met: BossType[] = [];
      FLOORS.forEach((f, floor) => met.push(pickBoss(Rng.from('RUN' + i, 'boss' + floor), f.boss.pool, met)));
      expect(new Set(met).size).toBe(met.length);
      orders.add(met.join());
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('falls back to the whole pool once every boss in it has been met', () => {
    expect(pickBoss(new Rng(1), ['warden'], ['warden'])).toBe('warden');
  });
});

describe('jelly floods (the jelly serpent)', () => {
  // a 13 × 7 room: open floor but for a rock in the middle and a pillar at (2, 1)
  const W = 13,
    H = 7,
    blocked = new Set(['6,3', '2,1']),
    open = (c: number, r: number) => !blocked.has(c + ',' + r);
  const joined = (tiles: { c: number; r: number }[]) => {
    // every tile reached from the first through the others, side by side
    const left = new Set(tiles.map((t) => t.c + ',' + t.r)),
      queue = [tiles[0]];
    left.delete(tiles[0].c + ',' + tiles[0].r);
    while (queue.length) {
      const t = queue.pop()!;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const k = t.c + dc + ',' + (t.r + dr);
        if (left.delete(k)) queue.push({ c: t.c + dc, r: t.r + dr });
      }
    }
    return left.size === 0;
  };
  it('covers open floor only, as many tiles as asked, joined side by side, each once', () => {
    for (let seed = 1; seed < 60; seed++) {
      const rng = new Rng(seed),
        tiles = floodTiles(open, 6, 0, 30, () => rng.next(), W, H);
      expect(tiles.length).toBe(30);
      expect(new Set(tiles.map((t) => t.c + ',' + t.r)).size).toBe(30);
      for (const t of tiles) {
        expect(open(t.c, t.r)).toBe(true);
        expect(t.c >= 0 && t.c < W && t.r >= 0 && t.r < H).toBe(true);
      }
      expect(joined(tiles)).toBe(true);
      expect(tiles[0]).toEqual({ c: 6, r: 0 }); // (it pours in where it starts)
    }
  });
  it('starts from the nearest open tile when the spot is blocked, and stops when the floor runs out', () => {
    expect(floodTiles(open, 6, 3, 1, () => 0.5, W, H)[0]).not.toEqual({ c: 6, r: 3 });
    expect(
      Math.hypot(
        floodTiles(open, 6, 3, 1, () => 0.5, W, H)[0].c - 6,
        floodTiles(open, 6, 3, 1, () => 0.5, W, H)[0].r - 3,
      ),
    ).toBeLessThanOrEqual(Math.SQRT2);
    expect(floodTiles(open, 0, 0, 500, Math.random, W, H).length).toBe(W * H - blocked.size);
    expect(floodTiles(() => false, 0, 0, 10, Math.random, W, H)).toEqual([]);
  });
});

describe('the Seal', () => {
  const seal = FLOORS.findIndex((f) => f.fixed),
    cfg = FLOORS[seal];
  it("is the last level, laid by hand: the Stair, the Last Hall and Kaelith's Hall, a door between each", () => {
    expect(seal).toBe(FLOORS.length - 1);
    for (let s = 0; s < 20; s++) {
      const plan = generateFloor(Rng.from('SEAL' + s, 'floor' + seal), cfg, seal);
      expect(plan.rooms.map((r) => [r.type, r.shape, r.dist, r.artifact])).toEqual([
        ['start', 'standard', 0, false],
        ['ordeal', 'great', 1, true],
        ['boss', 'great', 2, true],
      ]);
      expect([plan.startId, plan.bossId]).toEqual([0, 2]);
      const nbs = plan.rooms.map((r) => r.doors.map((d) => d.to).sort());
      expect(nbs).toEqual([[1], [0, 2], [1]]); // (one door between each two, none between the Stair and the boss)
      for (const r of plan.rooms) {
        expect(TEMPLATE_DEFS.find((t) => t.id === r.templateId)!.fixed).toBe(true);
        for (const d of r.doors) expect(d.shift).toBe(0);
      }
      expect(plan.rooms[1].seed).not.toBe(
        generateFloor(Rng.from('SEAL' + (s + 1), 'floor' + seal), cfg, seal).rooms[1].seed,
      ); // (the run's seed still dresses it)
    }
  });
  it('keeps its rooms its own: no generated floor draws them', () => {
    const fixed = new Set(TEMPLATE_DEFS.filter((t) => t.fixed).map((t) => t.id));
    expect([...fixed].sort()).toEqual([
      'seal_kaelith',
      'seal_last_hall',
      'seal_stair',
      'vigil_cave',
      'vigil_chapel',
      'vigil_crypt',
      'vigil_gallery',
      'vigil_garden',
      'vigil_landing',
      'vigil_nave',
      'vigil_pool',
      'vigil_practice',
    ]); // (and the Vigil, with the rooms behind its barred ways)
    for (let s = 0; s < 60; s++)
      for (const [i, f] of GENERATED.entries())
        for (const r of generateFloor(Rng.from('NF' + s, 'floor' + i), f, i).rooms)
          expect(fixed.has(r.templateId)).toBe(false);
    expect(() =>
      fixedPlan(
        new Rng(1),
        { ...cfg, fixed: { rooms: [{ type: 'start', shape: 'standard', at: [4, 6], template: 'seal_kaelith' }] } },
        seal,
      ),
    ).toThrow(/no standard start template/);
  });
  it('lies below floor 5, whose boss now has a waystone room before the way down', () => {
    expect(FLOORS[seal - 1].waystone).toBe(true);
    expect(cfg.look.name).toBe('seal');
  });
});
