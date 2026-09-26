/* Floor generation, Isaac-style. Pure data (no three.js) so it can be unit-tested on thousands of seeds.

   The map grows from the centre of a GRID_W × GRID_H grid of cells: a queue of rooms, each trying the
   cells around it. A new room may only touch the room it grew from, which keeps the map a tree full of
   dead ends. Some new rooms take a larger shape (shapes.ts) when the cells it needs are free.
   Special rooms take one-cell dead ends: the farthest from the start is the boss (sometimes widened into
   a great hall), then the treasure room and the ordeal; a bone altar takes a spare dead end when the
   floor's altarChance rolls. Doors go on every cell edge two rooms share, if both shapes allow that side. */
import floorsData from '../../data/floors.json';
import type { Rng } from '../rng';
import type { FloorLook, RoomType, Side } from '../types';
import { OPPOSITE, SIDE_DIR, SHAPE_IDS, allowsSide, shapeCells, type ShapeId } from './shapes';
import { TEMPLATE_DEFS, type TemplateDef } from './templates';

export const GRID_W = 9, GRID_H = 8;
export const START_CELL = { gx: 4, gy: 3 };

/** How a normal room is dressed (GDD: Room variants): quiet is easier; champion, ambush and dark are harder. */
export type RoomVariant = 'normal' | 'quiet' | 'champion' | 'ambush' | 'dark';
export const VARIANTS: RoomVariant[] = ['normal', 'quiet', 'champion', 'ambush', 'dark'];
export const HARD_VARIANTS: RoomVariant[] = ['champion', 'ambush', 'dark'];

export interface BossConfig { type: 'warden'; hpMul: number; speedMul: number; shotSpeedMul: number; summons: number; volleys: number }
export interface FloorConfig {
  rooms: [number, number];
  enemyHp: number;
  /** Chance of a bone altar when a spare dead end exists. */ altarChance: number;
  /** Chance the boss room is widened into a great hall when there is space. */ bossHallChance: number;
  /** Relative weights of room shapes for new rooms. */ shapes: Partial<Record<ShapeId, number>>;
  /** Relative weights of the variants a normal room can roll. */ variants: Partial<Record<RoomVariant, number>>;
  templateWeights: Record<string, number>;
  boss: BossConfig;
  look: FloorLook;
}

/** Per-floor settings from data/floors.json, floor 1 first. */
export const FLOORS = floorsData as unknown as FloorConfig[];

export interface Cell { gx: number; gy: number }
/** A door on the cell edge (gx, gy, side), leading to room `to`. */
export interface PlannedDoor { gx: number; gy: number; side: Side; to: number }
export interface PlannedRoom {
  id: number; type: RoomType; shape: ShapeId;
  /** Grid cells the room covers; `anchor` is the top-left of their bounding box. */ cells: Cell[]; anchor: Cell;
  /** Steps from the start room. */ dist: number;
  templateId: string; mirrorX: boolean; mirrorY: boolean;
  /** Only normal rooms roll a variant; every other room is 'normal'. */ variant: RoomVariant;
  /** Seed for this room's own randomness (floor texture, rock shapes, which enemy is the champion). */ seed: number;
  doors: PlannedDoor[];
}
export interface FloorPlan { index: number; rooms: PlannedRoom[]; startId: number; bossId: number; attempts: number }

const key = (gx: number, gy: number) => gx + ',' + gy;
const SIDES: Side[] = ['n', 'e', 's', 'w'];
/** Special rooms and the shapes they may take. */
const SHAPES_FOR: Partial<Record<RoomType, ShapeId[]>> = { start: ['standard'], treasure: ['standard'], altar: ['standard'], ordeal: ['standard'], boss: ['standard', 'great'] };

interface Layout { shape: ShapeId; mirrorX: boolean; mirrorY: boolean; cells: Cell[]; parent: number }

class Grid {
  owner = new Map<string, number>();
  constructor(public rooms: Layout[] = []) {}
  at(c: Cell) { return this.owner.get(key(c.gx, c.gy)); }
  add(l: Layout) { const id = this.rooms.length; this.rooms.push(l); for (const c of l.cells) this.owner.set(key(c.gx, c.gy), id); return id; }
  replace(id: number, l: Layout) { for (const c of this.rooms[id].cells) this.owner.delete(key(c.gx, c.gy)); this.rooms[id] = l; for (const c of l.cells) this.owner.set(key(c.gx, c.gy), id); }
}
const inBounds = (c: Cell) => c.gx >= 0 && c.gy >= 0 && c.gx < GRID_W && c.gy < GRID_H;
const step = (c: Cell, s: Side): Cell => ({ gx: c.gx + SIDE_DIR[s][0], gy: c.gy + SIDE_DIR[s][1] });

/** Ways to place `shape` so it covers `cell`, touching only room `parent` across the edge (cell, facing):
    free cells (or the room being replaced), in bounds, and no contact with any other room. */
function placements(g: Grid, rng: Rng, shape: ShapeId, cell: Cell, facing: Side, parent: number, replacing = -1): Layout[] {
  if (!allowsSide(shape, facing)) return [];
  const out: Layout[] = [];
  const mirrors = shape === 'l_shape' ? [[false, false], [true, false], [false, true], [true, true]] : [[false, false]];
  for (const [mx, my] of mirrors) {
    const rel = shapeCells(shape, mx, my);
    for (const [ai, aj] of rel) {
      const cells = rel.map(([i, j]) => ({ gx: cell.gx + i - ai, gy: cell.gy + j - aj }));
      const mine = new Set(cells.map(c => key(c.gx, c.gy)));
      const ok = cells.every(c => inBounds(c) && (g.at(c) === undefined || g.at(c) === replacing)) &&
        cells.every(c => SIDES.every(s => { const n = step(c, s); if (mine.has(key(n.gx, n.gy))) return true; const o = g.at(n); return o === undefined || o === parent || o === replacing; }));
      if (ok) out.push({ shape, mirrorX: mx, mirrorY: my, cells, parent });
    }
  }
  return rng.shuffle(out);
}

/** Grow a tree of `count` rooms. Returns null when the walk stalls, so the caller retries. */
function growLayout(rng: Rng, count: number, cfg: FloorConfig): Grid | null {
  const g = new Grid();
  g.add({ shape: 'standard', mirrorX: false, mirrorY: false, cells: [{ ...START_CELL }], parent: -1 });
  const queue = [0];
  const weights = Object.fromEntries(SHAPE_IDS.map(s => [s, cfg.shapes[s] ?? 0])) as Record<ShapeId, number>;
  while (queue.length && g.rooms.length < count) {
    const ri = queue.shift()!, room = g.rooms[ri];
    const edges = rng.shuffle(room.cells.flatMap(c => SIDES.filter(s => allowsSide(room.shape, s)).map(s => ({ c, s }))));
    for (const { c, s } of edges) {
      if (g.rooms.length >= count) break;
      const n = step(c, s);
      if (!inBounds(n) || g.at(n) !== undefined) continue;
      if (rng.chance(0.5)) continue; // give up now and then, so maps branch unevenly
      const shape = rng.weighted(weights);
      const place = placements(g, rng, shape, n, OPPOSITE[s], ri)[0] ?? (shape !== 'standard' ? placements(g, rng, 'standard', n, OPPOSITE[s], ri)[0] : undefined);
      if (!place) continue;
      queue.push(g.add(place));
    }
  }
  return g.rooms.length === count ? g : null;
}

/** Doors on every cell edge two rooms share, where both shapes allow the side. */
function computeDoors(rooms: { shape: ShapeId; cells: Cell[] }[]): PlannedDoor[][] {
  const owner = new Map<string, number>();
  rooms.forEach((r, i) => r.cells.forEach(c => owner.set(key(c.gx, c.gy), i)));
  return rooms.map((r, i) => r.cells.flatMap(c => SIDES.flatMap(s => {
    const n = step(c, s), o = owner.get(key(n.gx, n.gy));
    return o !== undefined && o !== i && allowsSide(r.shape, s) && allowsSide(rooms[o].shape, OPPOSITE[s]) ? [{ gx: c.gx, gy: c.gy, side: s, to: o }] : [];
  })));
}

/** Steps from the start room to every room, through doors. */
function roomDistances(doors: PlannedDoor[][]) {
  const dist = [0]; const queue = [0];
  while (queue.length) { const i = queue.shift()!; for (const d of doors[i]) if (dist[d.to] === undefined) { dist[d.to] = dist[i] + 1; queue.push(d.to); } }
  return dist;
}

const anchorOf = (cells: Cell[]): Cell => ({ gx: Math.min(...cells.map(c => c.gx)), gy: Math.min(...cells.map(c => c.gy)) });

export function generateFloor(rng: Rng, cfg: FloorConfig, index: number, library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan {
  for (let attempts = 1; attempts <= 500; attempts++) {
    const g = growLayout(rng, rng.int(cfg.rooms[0], cfg.rooms[1]), cfg);
    if (!g) continue;
    let doors = computeDoors(g.rooms);
    const dist = roomDistances(doors);
    const neighbours = (i: number) => new Set(doors[i].map(d => d.to)).size;
    const deadEnds = g.rooms.map((_, i) => i).filter(i => i > 0 && neighbours(i) === 1);
    const oneCell = deadEnds.filter(i => g.rooms[i].shape === 'standard');
    // the boss: the farthest dead end that can hold it, never next to the start
    const bossOk = deadEnds.filter(i => SHAPES_FOR.boss!.includes(g.rooms[i].shape)).sort((a, b) => dist[b] - dist[a]);
    const boss = bossOk[0];
    if (boss === undefined || dist[boss] < 2) continue;
    const others = rng.shuffle(oneCell.filter(i => i !== boss));
    if (others.length < 2) continue; // treasure and ordeal each need one
    const type = new Map<number, RoomType>([[0, 'start'], [boss, 'boss'], [others[0], 'treasure'], [others[1], 'ordeal']]);
    if (others.length > 2 && rng.chance(cfg.altarChance)) type.set(others[2], 'altar');
    // now and then the boss gets a great hall, when the cells around it are free
    if (g.rooms[boss].shape === 'standard' && rng.chance(cfg.bossHallChance)) {
      const b = g.rooms[boss], d = doors[boss][0];
      const hall = placements(g, rng, 'great', b.cells[0], d.side, d.to, boss)[0];
      if (hall) { g.replace(boss, hall); doors = computeDoors(g.rooms); }
    }
    const rooms: PlannedRoom[] = g.rooms.map((l, id) => ({
      id, type: type.get(id) ?? 'normal', shape: l.shape, cells: l.cells, anchor: anchorOf(l.cells), dist: dist[id],
      templateId: '',
      // L-shaped rooms are turned by mirroring, so their template must match; other shapes mirror freely
      mirrorX: l.shape === 'l_shape' ? l.mirrorX : rng.chance(0.5), mirrorY: l.shape === 'l_shape' ? l.mirrorY : rng.chance(0.5),
      variant: 'normal', seed: rng.int(1, 2 ** 30), doors: doors[id],
    }));
    assignVariants(rng, rooms, cfg, index);
    assignTemplates(rng, rooms, cfg, index, library);
    return { index, rooms, startId: 0, bossId: boss, attempts };
  }
  throw new Error('floor generation failed after 500 attempts');
}

/** Normal rooms roll a variant from the floor's weights; the rooms next to the start on floor 1 are never hard. */
function assignVariants(rng: Rng, rooms: PlannedRoom[], cfg: FloorConfig, index: number) {
  for (const room of rooms) {
    if (room.type !== 'normal') continue;
    const weights = Object.fromEntries(VARIANTS.map(v => [v, cfg.variants[v] ?? 0])) as Record<RoomVariant, number>;
    if (index === 0 && room.dist === 1) for (const v of HARD_VARIANTS) weights[v] = 0;
    room.variant = rng.weighted(weights);
  }
}

/** Normal rooms pick a difficulty from the floor's weights, preferring templates not yet used on this floor. */
function assignTemplates(rng: Rng, rooms: PlannedRoom[], cfg: FloorConfig, index: number, library: TemplateDef[]) {
  const used = new Set<string>();
  for (const room of rng.shuffle(rooms.slice())) {
    let pool = library.filter(t => t.shape === room.shape && t.types.includes(room.type));
    if (room.type === 'normal' || room.type === 'ordeal') {
      // the rooms next to the start on floor 1 stay gentle; ordeals are a step harder than the floor
      let difficulty = index === 0 && room.dist === 1 ? 1 : Number(rng.weighted(cfg.templateWeights));
      if (room.type === 'ordeal') difficulty = Math.min(3, difficulty + 1);
      // prefer the rolled difficulty, else the nearest one this shape has
      const levels = [...new Set(pool.map(t => t.difficulty))].sort((a, b) => Math.abs(a - difficulty) - Math.abs(b - difficulty) || a - b);
      if (levels.length) pool = pool.filter(t => t.difficulty === levels[0]);
    }
    if (!pool.length) throw new Error(`no ${room.shape} template for ${room.type} rooms`);
    const fresh = pool.filter(t => !used.has(t.id));
    const def = rng.pick(fresh.length ? fresh : pool);
    used.add(def.id); room.templateId = def.id;
  }
}

/** A two-room floor for trying out one template (optionally in a variant): the start room with the
    template's room next to it. */
export function testPlan(templateId: string, variant: RoomVariant = 'normal', library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan {
  const def = library.find(t => t.id === templateId);
  if (!def) throw new Error(`no template "${templateId}"`);
  const type = def.types[0] === 'start' ? 'normal' : def.types[0];
  const g = new Grid();
  g.add({ shape: 'standard', mirrorX: false, mirrorY: false, cells: [{ ...START_CELL }], parent: -1 });
  // north of the start if the shape has a south door there, else east (corridors running east-west)
  const tryAt = (s: Side) => {
    const cell = step(START_CELL, s);
    const rel = shapeCells(def.shape);
    for (const [ai, aj] of rel) {
      const cells = rel.map(([i, j]) => ({ gx: cell.gx + i - ai, gy: cell.gy + j - aj }));
      if (allowsSide(def.shape, OPPOSITE[s]) && cells.every(c => inBounds(c) && !(c.gx === START_CELL.gx && c.gy === START_CELL.gy))) {
        // the cell next to the start must be on the shape's outline towards it
        const back = step(cell, OPPOSITE[s]);
        if (!cells.some(c => c.gx === back.gx && c.gy === back.gy) && cells.some(c => c.gx === cell.gx && c.gy === cell.gy)) return cells;
      }
    }
    return null;
  };
  const cells = tryAt('n') ?? tryAt('e');
  if (!cells) throw new Error(`can't place template "${templateId}" next to the start`);
  g.add({ shape: def.shape, mirrorX: false, mirrorY: false, cells, parent: 0 });
  const doors = computeDoors(g.rooms);
  const rooms: PlannedRoom[] = g.rooms.map((l, id) => ({
    id, type: id ? type : 'start', shape: l.shape, cells: l.cells, anchor: anchorOf(l.cells), dist: id,
    templateId: id ? templateId : 'start', mirrorX: false, mirrorY: false,
    variant: id && type === 'normal' ? variant : 'normal', seed: 1000 + id, doors: doors[id],
  }));
  return { index: 0, rooms, startId: 0, bossId: type === 'boss' ? 1 : -1, attempts: 1 };
}

/** The floor as text, one character per cell: S start, B boss, T treasure, O ordeal, A altar,
    # one-cell room, + larger hall, - and | corridors, @ the current room. */
export function planToText(plan: FloorPlan, currentId = -1) {
  const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(' '));
  const mark: Record<string, string> = { start: 'S', boss: 'B', treasure: 'T', ordeal: 'O', altar: 'A' };
  const shapeMark = (s: ShapeId) => s === 'standard' ? '#' : s === 'corridor_ew' ? '-' : s === 'corridor_ns' ? '|' : '+';
  for (const r of plan.rooms) for (const c of r.cells) grid[c.gy][c.gx] = r.id === currentId ? '@' : mark[r.type] ?? shapeMark(r.shape);
  return grid.map(row => row.join('')).join('\n');
}
