/* Floor generation, Isaac-style. Pure data (no three.js) so it can be unit-tested on thousands of seeds.

   The map grows from the centre of a GRID_W × GRID_H grid of cells: a queue of rooms, each trying the
   cells around it. A new room may only touch the room it grew from, which keeps the map a tree full of
   dead ends. Some new rooms take a larger shape (shapes.ts) when the cells it needs are free.
   Special rooms take one-cell dead ends: the farthest from the start is the boss (sometimes widened into
   a great hall), then the treasure room, the ordeal, the merchant, the library and, on floors that have one, the shrine;
   a bone altar and a locked vault each
   take a spare dead end when the floor's chance for them rolls (the walk tries again for a while until it
   leaves enough dead ends). The optional artifact sources (merchant,
   vault, altar) then share what the floor's budget leaves, in an order shuffled with the floor's seed.
   Doors go on every cell edge two rooms share, if both shapes allow that side. Last comes the secret room:
   an empty cell with hidden doorways into two or more rooms (never the boss, the vault or the merchant). */
import floorsData from '../../data/floors.json';
import type { FoeType, PairTable, Pressure, RoleTable } from '../actors/foeData';
import { CFG, type BossType } from '../config';
import { Rng } from '../rng';
import type { FloorLook, RoomType, Side } from '../types';
import { OPPOSITE, SIDE_DIR, SHAPE_IDS, allowsSide, doorSlots, shapeCells, type ShapeId } from './shapes';
import { CLEAR, TEMPLATE_DEFS, parseTemplate, type TemplateDef } from './templates';

export const GRID_W = 9, GRID_H = 8;
export const START_CELL = { gx: 4, gy: 3 };

/** How a normal room is dressed (GDD: Room variants): quiet is easier; champion, ambush and dark are harder. */
export type RoomVariant = 'normal' | 'quiet' | 'champion' | 'ambush' | 'dark';
export const VARIANTS: RoomVariant[] = ['normal', 'quiet', 'champion', 'ambush', 'dark'];
export const HARD_VARIANTS: RoomVariant[] = ['champion', 'ambush', 'dark'];

/** A floor's boss: drawn from `pool`, then tuned. `summons` is how many foes it calls below half health,
    `volleys` how often it repeats its aimed attack (the warden's volleys, the abbess's fans, the knight's
    ember sprays). */
export interface BossConfig { pool: BossType[]; hpMul: number; speedMul: number; shotSpeedMul: number; summons: number; volleys: number;
  /** M6: the insight the floor's boss gives when it falls (the same for every boss in the pool). */ insight: number }
export interface FloorConfig {
  rooms: [number, number];
  enemyHp: number;
  /** Chance the floor has a bone altar. */ altarChance: number;
  /** Chance the floor has a locked vault. */ vaultChance: number;
  /** Whether the floor has a shrine, where curses are cleansed (GDD: 1 on floor 2). */ shrine: boolean;
  /** Whether the floor has a library, where grimoire pages teach spells (GDD: one on every floor). */ library: boolean;
  /** Whether the floor has Dr. Jelly's laboratory, with its alchemy table (M5: floors 1 and 3). */ laboratory?: boolean;
  /** Whether the floor has a waystone room beside its boss room, holding the way down (M6 step 10: floors 1 to 4; M7: 5 too, the Seal below it). */ waystone?: boolean;
  /** Chance the secret room holds an artifact (outside the budget) rather than a hoard. */ secretArtifactChance: number;
  /** The champion that rises in a vault forced open with glyphs. */ vaultWarden: FoeType;
  /** How much likelier soul motes are in the floor's loot than on the first floors (M4.1: the deep floors give more;
      1 when unset). */ souls?: number;
  /** M6 step 8: how likely runes are in the floor's loot, times each chance in data/loot.json's `runes` (0 on floor 5:
      no waystone lies below it to carve them); 1 when unset. */ runes?: number;
  /** The floor's foes by role (M4): what fills a template's walkers (`R`), flyers and shooters (`W`) and chargers and
      heavies (`H`), by weight (actors/foeData.ts). */ foes: RoleTable;
  /** Chance the boss room is widened into a great hall when there is space. */ bossHallChance: number;
  /** Chance a door moves off the middle of its edge, where both rooms leave room for it (M3.6). */ doorShift: number;
  /** Chance a fight takes place in a themed room, and which themes the floor draws on, by weight (M3.6). */
  themeChance: number; themes: Record<string, number>;
  /** Relative weights of room shapes for new rooms. */ shapes: Partial<Record<ShapeId, number>>;
  /** Relative weights of the variants a normal room can roll. */ variants: Partial<Record<RoomVariant, number>>;
  /** Relative weights of the school mantles a champion here wears (M4.7, actors/mantleData.ts). */ mantles?: Partial<Record<string, number>>;
  /** How often a fight here rolls a pair of foes made to work together, and the pairs (M4.7, `pairRoom` in foeData.ts). */ pairs?: PairTable;
  /** The descent's pressure dials (M4.9, `Pressure` in foeData.ts): one more foe in a share of fights, likelier elites,
      more waves in an ordeal. */ pressure: Pressure;
  templateWeights: Record<string, number>;
  boss: BossConfig;
  look: FloorLook;
  /** M7 step 1: a level laid by hand instead of generated (the Seal below floor 5): each room's type, shape, top-left
      cell and template; doors on every edge two rooms share, the first room the start. */ fixed?: { rooms: FixedRoom[] };
}
/** A room of a fixed level: its type, shape, top-left cell (gx, gy) and template (one marked `fixed` in the data). */
export interface FixedRoom { type: RoomType; shape: ShapeId; at: [number, number]; template: string }

/** Per-floor settings from data/floors.json, floor 1 first. */
export const FLOORS = floorsData as unknown as FloorConfig[];

export interface Cell { gx: number; gy: number }
/** A door on the cell edge (gx, gy, side), leading to room `to`; `shift` moves it along the edge from the middle,
    in tiles (towards +x on north and south edges, +z on east and west ones), the same for both its sides. */
export interface PlannedDoor { gx: number; gy: number; side: Side; to: number; shift?: number }
export interface PlannedRoom {
  id: number; type: RoomType; shape: ShapeId;
  /** Grid cells the room covers; `anchor` is the top-left of their bounding box. */ cells: Cell[]; anchor: Cell;
  /** Steps from the start room. */ dist: number;
  templateId: string; mirrorX: boolean; mirrorY: boolean;
  /** Only normal rooms roll a variant; every other room is 'normal'. */ variant: RoomVariant;
  /** Whether the room holds an artifact: always for the treasure room, the ordeal and the boss; optional
      sources only while the floor's budget allows (GDD: Artifacts); the secret room by chance, outside the
      budget. */ artifact: boolean;
  /** Seed for this room's own randomness (floor texture, rock shapes, which enemy is the champion). */ seed: number;
  doors: PlannedDoor[];
}
export interface FloorPlan { index: number; rooms: PlannedRoom[]; startId: number; bossId: number; attempts: number }

const key = (gx: number, gy: number) => gx + ',' + gy;
const SIDES: Side[] = ['n', 'e', 's', 'w'];
/** Special rooms and the shapes they may take. */
const SHAPES_FOR: Partial<Record<RoomType, ShapeId[]>> = { start: ['standard'], treasure: ['standard'], altar: ['standard'], ordeal: ['standard'], merchant: ['standard'], vault: ['standard'], secret: ['standard'], shrine: ['standard'], library: ['standard'], boss: ['standard', 'great'] };
/** Rooms a secret room never opens into: the boss (no way round the fight), the vault (no way round its ward)
    and the merchant (whose warded shop won't let a glyph be chalked). */
export const SECRET_SHUNS: RoomType[] = ['boss', 'vault', 'merchant'];
/** Artifact sources on every floor, and optional ones that share what the budget leaves (GDD: Artifacts). */
export const GUARANTEED_SOURCES: RoomType[] = ['treasure', 'ordeal', 'boss'];
export const OPTIONAL_SOURCES: RoomType[] = ['merchant', 'vault', 'altar'];

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

/** Where the secret room goes: an empty cell that could open into the most rooms, at least two, among those a
    secret room may open into. Null when no cell qualifies. */
function secretCell(g: Grid, rng: Rng, type: Map<number, RoomType>): Cell | null {
  let best: Cell[] = [], most = 1;
  for (let gy = 0; gy < GRID_H; gy++) for (let gx = 0; gx < GRID_W; gx++) {
    const c = { gx, gy };
    if (g.at(c) !== undefined) continue;
    const opens = new Set<number>();
    for (const s of SIDES) {
      const o = g.at(step(c, s));
      if (o !== undefined && !SECRET_SHUNS.includes(type.get(o) ?? 'normal') && allowsSide(g.rooms[o].shape, OPPOSITE[s])) opens.add(o);
    }
    if (opens.size > most) { most = opens.size; best = [c]; } else if (opens.size === most && most >= 2) best.push(c);
  }
  return best.length ? rng.pick(best) : null;
}

export function generateFloor(rng: Rng, cfg: FloorConfig, index: number, library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan {
  if (cfg.fixed) return fixedPlan(rng, cfg, index, library);
  library = library.filter(t => !t.fixed); // (the fixed levels' rooms stay theirs)
  // the optional rooms this floor wants (in a shuffled order, so neither always gets the last dead end);
  // for a while the walk tries again until it leaves them spare dead ends, then makes do with fewer
  const wanted = rng.shuffle<[RoomType, number]>([['altar', cfg.altarChance], ['vault', cfg.vaultChance]]).filter(([, p]) => rng.chance(p)).map(([t]) => t);
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
    // treasure, ordeal, merchant (and the floor's library and shrine) each need one; the wanted optional rooms
    // too, for the first attempts
    const needed: RoomType[] = ['treasure', 'ordeal', 'merchant', ...(cfg.library ? ['library' as const] : []), ...(cfg.shrine ? ['shrine' as const] : [])];
    if (others.length < needed.length || (attempts <= CFG.generator.optionalTries && others.length < needed.length + wanted.length)) continue;
    const type = new Map<number, RoomType>([[0, 'start'], [boss, 'boss'], ...needed.map((t, i) => [others[i], t] as [number, RoomType])]);
    wanted.forEach((t, i) => { if (needed.length + i < others.length) type.set(others[needed.length + i], t); });
    // the optional sources share what the guaranteed ones leave of the budget, in a shuffled order; a bone
    // altar with nothing to offer isn't placed (its dead end holds a fight instead)
    const optional = rng.shuffle([...type].filter(([, t]) => OPTIONAL_SOURCES.includes(t)).map(([id]) => id));
    const slots = new Set(optional.slice(0, CFG.artifacts.maxPerFloor - GUARANTEED_SOURCES.length));
    for (const id of optional) if (!slots.has(id) && type.get(id) === 'altar') type.delete(id);
    // now and then the boss gets a great hall, when the cells around it are free
    if (g.rooms[boss].shape === 'standard' && rng.chance(cfg.bossHallChance)) {
      const b = g.rooms[boss], d = doors[boss][0];
      const hall = placements(g, rng, 'great', b.cells[0], d.side, d.to, boss)[0];
      if (hall) { g.replace(boss, hall); doors = computeDoors(g.rooms); }
    }
    // the secret room, with hidden doorways into every room it may open into; the others keep their distances
    const cell = secretCell(g, rng, type);
    let secretArtifact = false;
    if (cell) {
      const sid = g.add({ shape: 'standard', mirrorX: false, mirrorY: false, cells: [cell], parent: -1 });
      type.set(sid, 'secret'); secretArtifact = rng.chance(cfg.secretArtifactChance);
      const shuns = (i: number) => SECRET_SHUNS.includes(type.get(i) ?? 'normal');
      doors = computeDoors(g.rooms).map((list, i) => list.filter(d => !(i === sid && shuns(d.to)) && !(d.to === sid && shuns(i))));
      dist[sid] = 1 + Math.min(...doors[sid].map(d => dist[d.to]));
    }
    const rooms: PlannedRoom[] = g.rooms.map((l, id) => ({
      id, type: type.get(id) ?? 'normal', shape: l.shape, cells: l.cells, anchor: anchorOf(l.cells), dist: dist[id],
      artifact: GUARANTEED_SOURCES.includes(type.get(id) ?? 'normal') || slots.has(id) || (type.get(id) === 'secret' && secretArtifact),
      templateId: '',
      // L-shaped rooms are turned by mirroring, so their template must match; other shapes mirror freely
      mirrorX: l.shape === 'l_shape' ? l.mirrorX : rng.chance(0.5), mirrorY: l.shape === 'l_shape' ? l.mirrorY : rng.chance(0.5),
      variant: 'normal', seed: rng.int(1, 2 ** 30), doors: doors[id],
    }));
    assignVariants(rng, rooms, cfg, index);
    assignTemplates(rng, rooms, cfg, index, library);
    // a stream of its own, so shifting doors doesn't change anything else about the floor
    assignDoorShifts(new Rng(rooms.reduce((a, r) => (a ^ r.seed) * 31 >>> 0, 0x5d0025)), rooms, cfg.doorShift, library);
    // M5: Dr. Jelly's laboratory comes on top of the room count, last and on a stream of its own (the rest of the floor is as
    // it would be without it)
    if (cfg.laboratory) placeLaboratory(new Rng(rooms.reduce((a, r) => (a ^ r.seed) * 17 >>> 0, 0x1ab0)), rooms, library);
    // M6 step 10: the waystone room beside the boss room, last (after the laboratory, which may take a cell beside the boss
    // room first), on a stream from the boss room's seed
    if (cfg.waystone) placeWaystone(new Rng((rooms[boss].seed ^ 0x57a7e) >>> 0), rooms, library);
    return { index, rooms, startId: 0, bossId: boss, attempts };
  }
  throw new Error('floor generation failed after 500 attempts');
}

/** M7 step 1: a level laid by hand (`fixed` in its floor's data): its rooms where the data puts them, doors on every edge two
    of them share, the first the start; the boss's room the boss, its distances walked from the start. Its own seeds come
    from `rng`, so a run's seed still decides each room's dressing. */
export function fixedPlan(rng: Rng, cfg: FloorConfig, index: number, library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan {
  const rooms = layFixed(rng, cfg.fixed!.rooms, library);
  const bossId = rooms.findIndex(r => r.type === 'boss');
  if (rooms[0].type !== 'start' || bossId < 0) throw new Error('a fixed level needs its start first and a boss');
  return { index, rooms, startId: 0, bossId, attempts: 1 };
}
/** M7 step 5: the Vigil's map (data/vigil.json), laid as a fixed level is but with no boss: the first room the start,
    every room reached. Its index is the Vigil's own (`VIGIL_INDEX`), never a floor's. */
export function hubPlan(rng: Rng, list: FixedRoom[], index: number, library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan {
  return { index, rooms: layFixed(rng, list, library), startId: 0, bossId: -1, attempts: 1 };
}
/** A level laid by hand: each room where the list puts it, its template checked against its shape and type, doors on every
    edge two rooms share (in the middle: shift 0), every room reached from the first. */
function layFixed(rng: Rng, list: FixedRoom[], library: TemplateDef[]): PlannedRoom[] {
  const layouts = list.map(f => ({ shape: f.shape, cells: shapeCells(f.shape).map(([i, j]) => ({ gx: f.at[0] + i, gy: f.at[1] + j })) }));
  const doors = computeDoors(layouts), dist = roomDistances(doors);
  const rooms: PlannedRoom[] = list.map((f, id) => {
    const def = library.find(t => t.id === f.template);
    if (!def || def.shape !== f.shape || !def.types.includes(f.type)) throw new Error(`fixed room ${id}: no ${f.shape} ${f.type} template "${f.template}"`);
    return {
      id, type: f.type, shape: f.shape, cells: layouts[id].cells, anchor: anchorOf(layouts[id].cells), dist: dist[id],
      artifact: GUARANTEED_SOURCES.includes(f.type), templateId: f.template, mirrorX: false, mirrorY: false, variant: 'normal',
      seed: rng.int(1, 2 ** 30), doors: doors[id].map(d => ({ ...d, shift: 0 })),
    };
  });
  if (rooms.some(r => r.dist === undefined)) throw new Error('a fixed level needs every room reached from its first');
  return rooms;
}

/** M6 step 10: the waystone room: one more one-cell room on a free cell beside the boss room (any of a great hall's
    cells), opening only into it, never touching the secret room, a lone cell where there is one. Its door is in the middle
    of its edge, which every boss template leaves clear (`validateTemplate`). Null where no cell is free: the stone then
    rises in the boss room. */
export function placeWaystone(rng: Rng, rooms: PlannedRoom[], library: TemplateDef[] = TEMPLATE_DEFS) {
  const pool = library.filter(t => t.shape === 'standard' && t.types.includes('waystone'));
  const boss = rooms.find(r => r.type === 'boss'), secret = rooms.find(r => r.type === 'secret');
  if (!boss || !pool.length) return null;
  const owner = new Map<string, number>();
  rooms.forEach((r, i) => r.cells.forEach(c => owner.set(key(c.gx, c.gy), i)));
  const touches = (n: Cell, r: PlannedRoom | undefined) => !!r && SIDES.some(t => { const m = step(n, t); return r.cells.some(c => c.gx === m.gx && c.gy === m.gy); });
  const spots: { cell: Cell; at: Cell; side: Side; alone: boolean }[] = [];
  for (const c of boss.cells) for (const s of SIDES) {
    const n = step(c, s);
    if (!inBounds(n) || owner.has(key(n.gx, n.gy)) || !allowsSide(boss.shape, s) || touches(n, secret)) continue;
    const alone = SIDES.every(t => { const m = step(n, t); return boss.cells.some(b => b.gx === m.gx && b.gy === m.gy) || !owner.has(key(m.gx, m.gy)); });
    spots.push({ cell: n, at: c, side: s, alone });
  }
  const lone = spots.filter(p => p.alone), pick = lone.length ? lone : spots;
  if (!pick.length) return null;
  const p = rng.pick(pick), id = rooms.length;
  boss.doors.push({ gx: p.at.gx, gy: p.at.gy, side: p.side, to: id, shift: 0 });
  const stone: PlannedRoom = {
    id, type: 'waystone', shape: 'standard', cells: [p.cell], anchor: p.cell, dist: boss.dist + 1, templateId: rng.pick(pool).id,
    mirrorX: false, mirrorY: false, variant: 'normal', artifact: false, seed: rng.int(1, 2 ** 30),
    doors: [{ gx: p.cell.gx, gy: p.cell.gy, side: OPPOSITE[p.side], to: boss.id, shift: 0 }],
  };
  rooms.push(stone);
  return stone;
}

/** M5: Dr. Jelly's laboratory: one more one-cell room, on a free cell beside an ordinary fight room at least a step from
    the start (so the rooms beside the start keep their ways), with one door into it; a cell beside no other room if there
    is one, so it is a dead end. None when there is no such cell. */
export function placeLaboratory(rng: Rng, rooms: PlannedRoom[], library: TemplateDef[] = TEMPLATE_DEFS) {
  const pool = library.filter(t => t.shape === 'standard' && t.types.includes('laboratory'));
  const owner = new Map<string, number>();
  rooms.forEach((r, i) => r.cells.forEach(c => owner.set(key(c.gx, c.gy), i)));
  const spots: { cell: Cell; from: PlannedRoom; at: Cell; side: Side; alone: boolean }[] = [];
  for (const r of rooms) {
    if (r.type !== 'normal' || r.dist < 1) continue;
    for (const c of r.cells) for (const s of SIDES) {
      const n = step(c, s);
      if (!inBounds(n) || owner.has(key(n.gx, n.gy)) || !allowsSide(r.shape, s)) continue;
      const alone = SIDES.every(t => { const m = step(n, t); return (m.gx === c.gx && m.gy === c.gy) || !owner.has(key(m.gx, m.gy)); });
      spots.push({ cell: n, from: r, at: c, side: s, alone });
    }
  }
  const lone = spots.filter(p => p.alone), pick = (lone.length ? lone : spots);
  if (!pick.length || !pool.length) return null;
  const p = rng.pick(pick), id = rooms.length;
  p.from.doors.push({ gx: p.at.gx, gy: p.at.gy, side: p.side, to: id, shift: 0 }); // (in the middle of its edge)
  const lab: PlannedRoom = {
    id, type: 'laboratory', shape: 'standard', cells: [p.cell], anchor: p.cell, dist: p.from.dist + 1, templateId: rng.pick(pool).id,
    mirrorX: false, mirrorY: false, variant: 'normal', artifact: false, seed: rng.int(1, 2 ** 30),
    doors: [{ gx: p.cell.gx, gy: p.cell.gy, side: OPPOSITE[p.side], to: p.from.id, shift: 0 }],
  };
  rooms.push(lab);
  return lab;
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
    // fights: now and then in a themed room of one of the floor's themes (if it has one of this shape), else a plain one
    if (room.type === 'normal') {
      const theme = Object.keys(cfg.themes ?? {}).length && rng.chance(cfg.themeChance) ? rng.weighted(cfg.themes) : undefined;
      // the gentle rooms beside floor 1's start take a theme only if it has a gentle template of this shape
      const gentle = index === 0 && room.dist === 1;
      const inTheme = theme ? pool.filter(t => t.theme === theme && (!gentle || t.difficulty === 1)) : [];
      pool = inTheme.length ? inTheme : pool.filter(t => !t.theme);
    }
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

/** Rooms whose doors may move off the middle of their edges. Shops, vaults, libraries, shrines and secret cells
    furnish their walls around a door in the middle, so theirs stay there. */
export const SHIFTING: RoomType[] = ['normal', 'start', 'boss', 'treasure', 'ordeal', 'altar'];
/** How far a door may move, in tiles: along a north or south edge (13 tiles), along an east or west one (7). */
export const DOOR_SHIFTS = { ns: [-4, -2, 2, 4], ew: [-2, 2] };

/** Does a door moved `shift` tiles along its edge fit the room's template: its lane clear, no foe beside it? */
export function doorFits(room: PlannedRoom, door: PlannedDoor, shift: number, library: TemplateDef[] = TEMPLATE_DEFS) {
  const def = library.find(t => t.id === room.templateId); if (!def) return false;
  const t = parseTemplate(def, room.mirrorX, room.mirrorY);
  const slot = doorSlots(room.shape, room.mirrorX, room.mirrorY).find(s => s.side === door.side && s.i === door.gx - room.anchor.gx && s.j === door.gy - room.anchor.gy);
  if (!slot) return false;
  const ns = door.side === 'n' || door.side === 's', move = (p: { c: number; r: number }) => ns ? { c: p.c + shift, r: p.r } : { c: p.c, r: p.r + shift };
  const entry = move(slot.entry);
  return slot.lanes.map(move).every(({ c, r }) => CLEAR.includes(t.tiles[r]?.[c]) && !t.foes.some(f => f.c === c && f.r === r))
    && !t.foes.some(f => Math.max(Math.abs(f.c - entry.c), Math.abs(f.r - entry.r)) < 2);
}

/** Now and then a door moves along its edge (both its sides alike), to a place both rooms' templates leave free. */
function assignDoorShifts(rng: Rng, rooms: PlannedRoom[], chance: number, library: TemplateDef[]) {
  for (const room of rooms) for (const d of room.doors) {
    if (d.shift !== undefined) continue; // set already, from the other side
    const other = rooms[d.to], [dx, dy] = SIDE_DIR[d.side];
    const back = other.doors.find(o => o.to === room.id && o.side === OPPOSITE[d.side] && o.gx === d.gx + dx && o.gy === d.gy + dy);
    let shift = 0;
    if (back && SHIFTING.includes(room.type) && SHIFTING.includes(other.type) && rng.chance(chance)) {
      const ns = d.side === 'n' || d.side === 's';
      shift = rng.shuffle(DOOR_SHIFTS[ns ? 'ns' : 'ew'].slice()).find(s => doorFits(room, d, s, library) && doorFits(other, back, s, library)) ?? 0;
    }
    d.shift = shift; if (back) back.shift = shift;
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
    artifact: !!id && [...GUARANTEED_SOURCES, ...OPTIONAL_SOURCES, 'secret'].includes(type),
    templateId: id ? templateId : 'start', mirrorX: false, mirrorY: false,
    variant: id && type === 'normal' ? variant : 'normal', seed: 1000 + id, doors: doors[id],
  }));
  return { index: 0, rooms, startId: 0, bossId: type === 'boss' ? 1 : -1, attempts: 1 };
}

/** The floor's boss: one from its pool that this run hasn't met yet, or any from the pool once all have. */
export function pickBoss(rng: Rng, pool: readonly BossType[], met: readonly BossType[]): BossType {
  const fresh = pool.filter(b => !met.includes(b));
  return rng.pick(fresh.length ? fresh : pool);
}

/** The floor as text, one character per cell: S start, B boss, T treasure, O ordeal, A altar, M merchant,
    V vault, ? secret, * shrine, L library, J laboratory, W waystone, # one-cell room, + larger hall, - and | corridors, @ the current room. */
export function planToText(plan: FloorPlan, currentId = -1) {
  const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(' '));
  const mark: Record<string, string> = { start: 'S', boss: 'B', treasure: 'T', ordeal: 'O', altar: 'A', merchant: 'M', vault: 'V', secret: '?', shrine: '*', library: 'L', laboratory: 'J', waystone: 'W' };
  const shapeMark = (s: ShapeId) => s === 'standard' ? '#' : s === 'corridor_ew' ? '-' : s === 'corridor_ns' ? '|' : '+';
  for (const r of plan.rooms) for (const c of r.cells) grid[c.gy][c.gx] = r.id === currentId ? '@' : mark[r.type] ?? shapeMark(r.shape);
  return grid.map(row => row.join('')).join('\n');
}
