/* Room templates: character grids in data/templates/*.json. Pure data code (no three.js), shared by the
   game, the floor generator and the unit tests.

   Legend:  .  floor      #  rock      o  pit
            R  rotling    W  wisp      H  crypt hound      B  the floor's boss

   Ordeal templates keep their terrain in `grid` (no enemies) and list each wave's enemies in `waves`,
   one grid per wave with only `.` and enemy letters. */
import standardTemplates from '../../data/templates/standard.json';
import specialTemplates from '../../data/templates/special.json';
import type { EnemyType } from '../config';
import type { RoomType } from '../types';

export type Tile = 'floor' | 'rock' | 'pit';
export type ShapeId = 'standard';
export type FoeKind = EnemyType | 'boss';

export const SHAPES: Record<ShapeId, { w: number; h: number }> = {
  standard: { w: 13, h: 7 },
};

export interface TemplateDef {
  id: string; shape: ShapeId; types: RoomType[]; difficulty: number; grid: string[];
  /** Ordeal rooms: the enemies of each wave. */ waves?: string[][];
}
export interface Foe { kind: FoeKind; c: number; r: number }
export interface Template {
  id: string; shape: ShapeId; types: RoomType[]; difficulty: number; w: number; h: number;
  tiles: Tile[][]; // [row][col]
  /** Enemies per wave: one wave for normal and boss rooms, none for empty rooms. */ waves: Foe[][];
  /** Every enemy of every wave. */ foes: Foe[];
}

const TILE_OF: Record<string, Tile> = { '.': 'floor', '#': 'rock', 'o': 'pit' };
const FOE_OF: Record<string, FoeKind> = { R: 'rotling', W: 'wisp', H: 'hound', B: 'boss' };

/** Parse a template, optionally mirrored left-right and/or top-bottom. */
export function parseTemplate(def: TemplateDef, mirrorX = false, mirrorY = false): Template {
  const { w, h } = SHAPES[def.shape];
  const at = (grid: string[], c: number, r: number) => grid[mirrorY ? h - 1 - r : r]?.[mirrorX ? w - 1 - c : c];
  const tiles: Tile[][] = []; const inGrid: Foe[] = [];
  for (let r = 0; r < h; r++) {
    const row: Tile[] = [];
    for (let c = 0; c < w; c++) {
      const ch = at(def.grid, c, r), foe = FOE_OF[ch];
      if (foe) { inGrid.push({ kind: foe, c, r }); row.push('floor'); } else row.push(TILE_OF[ch]);
    }
    tiles.push(row);
  }
  const waves = def.waves
    ? def.waves.map(grid => { const list: Foe[] = []; for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const f = FOE_OF[at(grid, c, r)]; if (f) list.push({ kind: f, c, r }); } return list; })
    : inGrid.length ? [inGrid] : [];
  return { id: def.id, shape: def.shape, types: def.types, difficulty: def.difficulty, w, h, tiles, waves, foes: waves.flat() };
}

/** Where the player appears when entering through each door, and the tiles that must stay clear. */
export function doorTiles(shape: ShapeId) {
  const { w, h } = SHAPES[shape]; const mx = (w - 1) / 2, my = (h - 1) / 2;
  return {
    entries: [{ c: mx, r: 0 }, { c: mx, r: h - 1 }, { c: 0, r: my }, { c: w - 1, r: my }],
    lanes: [
      [mx - 1, 0], [mx, 0], [mx + 1, 0], [mx - 1, h - 1], [mx, h - 1], [mx + 1, h - 1],
      [0, my - 1], [0, my], [0, my + 1], [w - 1, my - 1], [w - 1, my], [w - 1, my + 1],
    ].map(([c, r]) => ({ c, r })),
  };
}

/** Problems with a template definition; empty when it is valid. */
export function validateTemplate(def: TemplateDef): string[] {
  const errs: string[] = [];
  const shape = SHAPES[def.shape];
  if (!shape) return [`unknown shape "${def.shape}"`];
  if (def.grid.length !== shape.h) errs.push(`has ${def.grid.length} rows, needs ${shape.h}`);
  def.grid.forEach((row, r) => {
    if (row.length !== shape.w) errs.push(`row ${r} has ${row.length} columns, needs ${shape.w}`);
    for (const ch of row) if (!TILE_OF[ch] && !FOE_OF[ch]) errs.push(`row ${r} has unknown character "${ch}"`);
  });
  const ordeal = def.types.includes('ordeal');
  if (ordeal !== !!def.waves) errs.push(ordeal ? 'ordeal rooms need waves' : 'only ordeal rooms have waves');
  if (def.waves) {
    if (def.waves.length < 2 || def.waves.length > 3) errs.push(`has ${def.waves.length} waves, needs 2 or 3`);
    if (def.grid.some(row => [...row].some(ch => FOE_OF[ch]))) errs.push('ordeal enemies go in the waves, not the grid');
    def.waves.forEach((grid, i) => {
      if (grid.length !== shape.h || grid.some(row => row.length !== shape.w)) errs.push(`wave ${i + 1} is not ${shape.w} × ${shape.h}`);
      else if (grid.some(row => [...row].some(ch => ch !== '.' && !FOE_OF[ch]))) errs.push(`wave ${i + 1} may only hold '.' and enemies`);
      else if (!grid.some(row => [...row].some(ch => FOE_OF[ch]))) errs.push(`wave ${i + 1} has no enemies`);
    });
  }
  if (errs.length) return errs;
  const t = parseTemplate(def);
  for (const f of t.foes) if (t.tiles[f.r][f.c] !== 'floor') errs.push(`${f.kind} at (${f.c},${f.r}) stands on a ${t.tiles[f.r][f.c]}`);
  const blocked = (c: number, r: number) => t.tiles[r][c] !== 'floor';
  const { entries, lanes } = doorTiles(def.shape);
  for (const { c, r } of lanes) {
    if (blocked(c, r)) errs.push(`door lane tile (${c},${r}) is blocked`);
    if (t.foes.some(f => f.c === c && f.r === r)) errs.push(`enemy on door lane tile (${c},${r})`);
  }
  for (const f of t.foes) for (const e of entries) {
    if (Math.max(Math.abs(f.c - e.c), Math.abs(f.r - e.r)) < 2) errs.push(`${f.kind} at (${f.c},${f.r}) is next to a door entry`);
  }
  // every floor tile must be reachable from the doors (no pockets sealed off by rocks or pits)
  const seen = new Set<string>(); const queue = lanes.filter(l => !blocked(l.c, l.r)).map(l => [l.c, l.r]);
  for (const [c, r] of queue) seen.add(c + ',' + r);
  while (queue.length) {
    const [c, r] = queue.pop()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, k = nc + ',' + nr;
      if (nc < 0 || nr < 0 || nc >= t.w || nr >= t.h || seen.has(k) || blocked(nc, nr)) continue;
      seen.add(k); queue.push([nc, nr]);
    }
  }
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) if (!blocked(c, r) && !seen.has(c + ',' + r)) errs.push(`tile (${c},${r}) can't be reached`);
  // rooms with a centrepiece (pedestal, trapdoor) keep the centre free
  const centre = { c: (t.w - 1) / 2, r: (t.h - 1) / 2 };
  if (def.types.some(ty => ty !== 'normal') && (blocked(centre.c, centre.r) || t.foes.some(f => f.c === centre.c && f.r === centre.r))) errs.push('centre must be free');
  const bosses = t.foes.filter(f => f.kind === 'boss').length;
  if (def.types.includes('boss') ? bosses !== 1 : bosses !== 0) errs.push('boss rooms need exactly one B, other rooms none');
  if (def.types.includes('normal') && !t.foes.length) errs.push('normal rooms need enemies');
  if (!def.types.some(ty => ty === 'normal' || ty === 'boss' || ty === 'ordeal') && t.foes.length) errs.push(`${def.types.join('/')} rooms can't have enemies`);
  return errs;
}

export const TEMPLATE_DEFS: TemplateDef[] = [...(standardTemplates as TemplateDef[]), ...(specialTemplates as TemplateDef[])];
export const TEMPLATES = new Map(TEMPLATE_DEFS.map(d => [d.id, d]));
