import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/rng';
import { FLOORS, GRID_H, GRID_W, generateFloor, planToText, testPlan } from '../../src/world/generate';
import { OPPOSITE, SIDE_DIR, allowsSide, shapeCells } from '../../src/world/shapes';
import { TEMPLATE_DEFS, parseTemplate, validateTemplate } from '../../src/world/templates';

describe('room templates', () => {
  it.each(TEMPLATE_DEFS.map(d => [d.id, d] as const))('%s is valid', (_id, def) => {
    expect(validateTemplate(def)).toEqual([]);
  });

  it('have unique ids', () => {
    const ids = TEMPLATE_DEFS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cover every room type and normal difficulty the generator asks for', () => {
    for (const type of ['start', 'treasure', 'boss', 'altar'] as const) expect(TEMPLATE_DEFS.some(d => d.types.includes(type))).toBe(true);
    for (const d of [1, 2, 3]) expect(TEMPLATE_DEFS.some(t => t.types.includes('normal') && t.difficulty === d)).toBe(true);
    for (const d of [1, 2, 3]) expect(TEMPLATE_DEFS.some(t => t.types.includes('ordeal') && t.difficulty === d)).toBe(true);
  });

  it('validation catches broken templates', () => {
    const base = TEMPLATE_DEFS.find(d => d.id === 'crypt_a')!;
    const withRow = (r: number, row: string) => ({ ...base, grid: base.grid.map((x, i) => i === r ? row : x) });
    const errors = (def: typeof base) => validateTemplate(def).join('; ');
    expect(errors(withRow(0, '......#......'))).toMatch(/door lane/);        // rock in the north door lane
    expect(errors(withRow(2, '.R....R......'))).toMatch(/next to a door/);   // (1,2) is beside the west entry (0,3)
    expect(errors({ ...base, grid: ['.............', '.ooo.........', '.o.o.........', '.ooo.........', '.............', '.........R...', '.............'] })).toMatch(/\(2,2\) can't be reached/);
    expect(errors(withRow(3, '...R..X..R...'))).toMatch(/unknown character/);
    expect(errors({ ...base, types: ['treasure'] })).toMatch(/can't have enemies/);
  });

  it('mirror without changing their contents', () => {
    const def = TEMPLATE_DEFS.find(d => d.id === 'crypt_b')!;
    const a = parseTemplate(def), b = parseTemplate(def, true, true);
    expect(b.foes.length).toBe(a.foes.length);
    expect(b.tiles[0][0]).toBe(a.tiles[a.h - 1][a.w - 1]);
  });
});

describe('floor generator', () => {
  const SEEDS = 400;

  it.each(FLOORS.map((cfg, i) => [i + 1, cfg] as const))('floor %i follows the rules on %# seeds', (floorNo, cfg) => {
    let altars = 0, roomCount = 0, bigRooms = 0, bossHalls = 0;
    for (let s = 0; s < SEEDS; s++) {
      const plan = generateFloor(Rng.from('T' + s, 'floor' + floorNo), cfg, floorNo - 1);
      const n = plan.rooms.length;
      expect(n).toBeGreaterThanOrEqual(cfg.rooms[0]);
      expect(n).toBeLessThanOrEqual(cfg.rooms[1]);
      const count = (t: string) => plan.rooms.filter(r => r.type === t).length;
      expect([count('start'), count('boss'), count('treasure'), count('ordeal')]).toEqual([1, 1, 1, 1]);
      expect(count('altar')).toBeLessThanOrEqual(1);
      altars += count('altar');

      // cells are in bounds, never shared, and each room covers exactly its shape
      const owner = new Map<string, number>();
      for (const r of plan.rooms) {
        expect(r.cells.length).toBe(shapeCells(r.shape).length);
        for (const c of r.cells) {
          expect(c.gx >= 0 && c.gx < GRID_W && c.gy >= 0 && c.gy < GRID_H).toBe(true);
          expect(owner.has(c.gx + ',' + c.gy)).toBe(false);
          owner.set(c.gx + ',' + c.gy, r.id);
        }
        roomCount++; if (r.shape !== 'standard') bigRooms++;
      }
      // doors come in matching pairs on shared edges, on sides both shapes allow
      for (const r of plan.rooms) for (const d of r.doors) {
        expect(allowsSide(r.shape, d.side)).toBe(true);
        const [dx, dy] = SIDE_DIR[d.side], other = plan.rooms[d.to];
        expect(owner.get((d.gx + dx) + ',' + (d.gy + dy))).toBe(d.to);
        expect(other.doors.some(o => o.to === r.id && o.gx === d.gx + dx && o.gy === d.gy + dy && o.side === OPPOSITE[d.side])).toBe(true);
      }
      // every room is reachable through doors, and the special rooms are one-cell dead ends
      const nbs = (r: (typeof plan.rooms)[number]) => [...new Set(r.doors.map(d => d.to))];
      const seen = new Set([plan.startId]); const queue = [plan.rooms[plan.startId]];
      while (queue.length) for (const id of nbs(queue.pop()!)) if (!seen.has(id)) { seen.add(id); queue.push(plan.rooms[id]); }
      expect(seen.size).toBe(n);
      const boss = plan.rooms[plan.bossId];
      expect(nbs(boss).length).toBe(1);
      expect(['standard', 'great']).toContain(boss.shape);
      expect(boss.dist).toBeGreaterThanOrEqual(2);
      if (boss.shape === 'great') bossHalls++;
      for (const t of ['start', 'treasure', 'ordeal', 'altar']) for (const r of plan.rooms.filter(x => x.type === t)) {
        expect(r.shape).toBe('standard');
        if (t !== 'start') expect(nbs(r).length).toBe(1);
      }
      // templates fit their rooms; floor 1 starts gentle
      for (const r of plan.rooms) {
        const def = TEMPLATE_DEFS.find(d => d.id === r.templateId)!;
        expect(def.types).toContain(r.type);
        expect(def.shape).toBe(r.shape);
        if (floorNo === 1 && r.type === 'normal' && r.dist === 1 && r.shape === 'standard') expect(def.difficulty).toBe(1);
      }
    }
    // altars are optional but should turn up on a fair share of floors
    expect(altars / SEEDS).toBeGreaterThan(.2);
    expect(altars / SEEDS).toBeLessThan(cfg.altarChance + .05);
    // about a third of the rooms take a larger or narrow shape; some bosses get a great hall
    const share = bigRooms / roomCount;
    expect(share).toBeGreaterThan(.12);
    expect(share).toBeLessThan(.5);
    expect(bossHalls).toBeGreaterThan(0);
  });

  it.each(FLOORS.map((cfg, i) => [i + 1, cfg] as const))('floor %i has a complete look', (_n, cfg) => {
    const { floor, wall, torch, light } = cfg.look;
    const hex = /^#[0-9a-f]{6}$/i, rgb = (v: number[]) => v.length === 3 && v.every(x => x >= 0 && x <= 255);
    expect(rgb(floor.base) && rgb(wall.brick)).toBe(true);
    for (const c of [floor.mortar, wall.mortar, torch.flame, torch.light, light.sky, light.ground, light.moon]) expect(c).toMatch(hex);
    expect(floor.stain).toMatch(/^\d+,\d+,\d+$/);
    expect(['bones', 'puddles', 'ash']).toContain(floor.decor);
    expect(['none', 'moss', 'soot']).toContain(wall.stains);
    expect(['bracket', 'lantern', 'brazier']).toContain(torch.style);
  });

  it('gives every floor its own look', () => {
    expect(new Set(FLOORS.map(f => f.look.name)).size).toBe(FLOORS.length);
  });

  it('is deterministic for a seed', () => {
    const a = generateFloor(Rng.from('ABC123', 'floor1'), FLOORS[0], 0);
    const b = generateFloor(Rng.from('ABC123', 'floor1'), FLOORS[0], 0);
    expect(planToText(a)).toBe(planToText(b));
    expect(a.rooms.map(r => r.templateId)).toEqual(b.rooms.map(r => r.templateId));
  });

  it('gives different maps for different seeds', () => {
    const maps = new Set(Array.from({ length: 20 }, (_, i) => planToText(generateFloor(Rng.from('S' + i, 'floor1'), FLOORS[0], 0))));
    expect(maps.size).toBeGreaterThan(15);
  });

  it('builds a test floor for any template', () => {
    const plan = testPlan('boss_pits');
    expect(plan.rooms.map(r => r.type)).toEqual(['start', 'boss']);
    expect(() => testPlan('nope')).toThrow();
    for (const def of TEMPLATE_DEFS) {
      const p = testPlan(def.id);
      expect(p.rooms[1].doors.some(d => d.to === 0)).toBe(true); // reachable from the start
    }
  });
});
