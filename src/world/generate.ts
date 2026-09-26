/* Floor generation, Isaac-style. Pure data (no three.js) so it can be unit-tested on thousands of seeds.

   The map grows from the centre of a GRID_W × GRID_H grid: a queue of rooms, each trying its four
   neighbours; a new room may not touch more than one existing room, which keeps the map a tree full of
   dead ends. Special rooms take the dead ends: the farthest is the boss, then the treasure room.
   Rooms are stored as lists of cells so larger shapes can be added later. */
import floorsData from '../../data/floors.json';
import type { Rng } from '../rng';
import type { RoomType } from '../types';
import { TEMPLATE_DEFS, type ShapeId, type TemplateDef } from './templates';

export const GRID_W = 9, GRID_H = 8;
export const START_CELL = { gx: 4, gy: 3 };

export interface BossConfig { type: 'warden'; hpMul: number; speedMul: number; shotSpeedMul: number; summons: number; volleys: number }
export interface FloorConfig {
  rooms: [number, number];
  enemyHp: number;
  templateWeights: Record<string, number>;
  boss: BossConfig;
}

/** Per-floor settings from data/floors.json, floor 1 first. */
export const FLOORS = floorsData as unknown as FloorConfig[];

export interface Cell { gx: number; gy: number }
export interface PlannedRoom {
  id: number; type: RoomType; shape: ShapeId; cells: Cell[];
  /** Steps from the start room. */
  dist: number;
  templateId: string; mirrorX: boolean; mirrorY: boolean;
  /** Seed for this room's cosmetic randomness (floor texture, rock shapes). */
  seed: number;
}
export interface FloorPlan { index: number; rooms: PlannedRoom[]; startId: number; bossId: number; attempts: number }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const key = (gx: number, gy: number) => gx + ',' + gy;

/** Grow a tree of `count` cells. Returns null when the walk stalls, so the caller retries. */
function growLayout(rng: Rng, count: number): Cell[] | null {
  const taken = new Set([key(START_CELL.gx, START_CELL.gy)]);
  const cells: Cell[] = [{ ...START_CELL }];
  const queue: Cell[] = [{ ...START_CELL }];
  const neighbours = (gx: number, gy: number) => DIRS.filter(([dx, dy]) => taken.has(key(gx + dx, gy + dy))).length;
  while (queue.length && cells.length < count) {
    const cell = queue.shift()!;
    for (const [dx, dy] of rng.shuffle(DIRS.slice())) {
      if (cells.length >= count) break;
      const gx = cell.gx + dx, gy = cell.gy + dy;
      if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H || taken.has(key(gx, gy))) continue;
      if (neighbours(gx, gy) > 1) continue; // keep it a tree
      if (rng.chance(0.5)) continue;        // give up now and then, so maps branch unevenly
      taken.add(key(gx, gy)); const n = { gx, gy }; cells.push(n); queue.push(n);
    }
  }
  return cells.length === count ? cells : null;
}

/** Steps from the start to every cell. */
function distances(cells: Cell[]) {
  const set = new Set(cells.map(c => key(c.gx, c.gy)));
  const dist = new Map([[key(START_CELL.gx, START_CELL.gy), 0]]);
  const queue = [START_CELL];
  while (queue.length) {
    const c = queue.shift()!; const d = dist.get(key(c.gx, c.gy))!;
    for (const [dx, dy] of DIRS) {
      const k = key(c.gx + dx, c.gy + dy);
      if (set.has(k) && !dist.has(k)) { dist.set(k, d + 1); queue.push({ gx: c.gx + dx, gy: c.gy + dy }); }
    }
  }
  return dist;
}

export function generateFloor(rng: Rng, cfg: FloorConfig, index: number, library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan {
  for (let attempts = 1; attempts <= 500; attempts++) {
    const cells = growLayout(rng, rng.int(cfg.rooms[0], cfg.rooms[1]));
    if (!cells) continue;
    const set = new Set(cells.map(c => key(c.gx, c.gy)));
    const dist = distances(cells);
    const deadEnds = cells.filter(c =>
      !(c.gx === START_CELL.gx && c.gy === START_CELL.gy) &&
      DIRS.filter(([dx, dy]) => set.has(key(c.gx + dx, c.gy + dy))).length === 1);
    if (deadEnds.length < 2) continue;
    deadEnds.sort((a, b) => dist.get(key(b.gx, b.gy))! - dist.get(key(a.gx, a.gy))!);
    const boss = deadEnds[0];
    if (dist.get(key(boss.gx, boss.gy))! < 2) continue; // the boss never touches the start room
    const treasure = rng.pick(deadEnds.slice(1));
    const typeOf = (c: Cell): RoomType =>
      c === cells[0] ? 'start' : c === boss ? 'boss' : c === treasure ? 'treasure' : 'normal';
    const rooms: PlannedRoom[] = cells.map((c, id) => ({
      id, type: typeOf(c), shape: 'standard', cells: [c], dist: dist.get(key(c.gx, c.gy))!,
      templateId: '', mirrorX: rng.chance(0.5), mirrorY: rng.chance(0.5), seed: rng.int(1, 2 ** 30),
    }));
    assignTemplates(rng, rooms, cfg, index, library);
    return { index, rooms, startId: 0, bossId: rooms.find(r => r.type === 'boss')!.id, attempts };
  }
  throw new Error('floor generation failed after 500 attempts');
}

/** Normal rooms pick a difficulty from the floor's weights, preferring templates not yet used on this floor. */
function assignTemplates(rng: Rng, rooms: PlannedRoom[], cfg: FloorConfig, index: number, library: TemplateDef[]) {
  const used = new Set<string>();
  for (const room of rng.shuffle(rooms.slice())) {
    let pool = library.filter(t => t.shape === room.shape && t.types.includes(room.type));
    if (room.type === 'normal') {
      // the rooms next to the start on floor 1 stay gentle
      const difficulty = index === 0 && room.dist === 1 ? 1 : Number(rng.weighted(cfg.templateWeights));
      const atLevel = pool.filter(t => t.difficulty === difficulty);
      if (atLevel.length) pool = atLevel;
    }
    if (!pool.length) throw new Error(`no ${room.shape} template for ${room.type} rooms`);
    const fresh = pool.filter(t => !used.has(t.id));
    const def = rng.pick(fresh.length ? fresh : pool);
    used.add(def.id); room.templateId = def.id;
  }
}

/** A two-room floor for trying out one template: the start room with the template's room north of it. */
export function testPlan(templateId: string, library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan {
  const def = library.find(t => t.id === templateId);
  if (!def) throw new Error(`no template "${templateId}"`);
  const room = (id: number, type: RoomType, gy: number, tid: string): PlannedRoom =>
    ({ id, type, shape: def.shape, cells: [{ gx: START_CELL.gx, gy }], dist: id, templateId: tid, mirrorX: false, mirrorY: false, seed: 1000 + id });
  const type = def.types[0] === 'start' ? 'normal' : def.types[0];
  const rooms = [room(0, 'start', START_CELL.gy, 'start'), room(1, type, START_CELL.gy - 1, templateId)];
  return { index: 0, rooms, startId: 0, bossId: type === 'boss' ? 1 : -1, attempts: 1 };
}

/** The floor as text, one character per cell: S start, B boss, T treasure, # normal. */
export function planToText(plan: FloorPlan, currentId = -1) {
  const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(' '));
  const mark: Record<string, string> = { start: 'S', boss: 'B', treasure: 'T', normal: '#' };
  for (const r of plan.rooms) for (const c of r.cells) grid[c.gy][c.gx] = r.id === currentId ? '@' : mark[r.type] ?? '?';
  return grid.map(row => row.join('')).join('\n');
}
