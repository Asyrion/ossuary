/* Room templates: character grids in data/templates/*.json, one grid the size of the shape's inside
   (shapes.ts). Pure data code (no three.js), shared by the game, the floor generator and the unit tests.

   Legend:  .  floor      #  rock      o  pit      x  outside the room (the L's missing corner)
            i  pillar     =  stone tomb (tiles side by side in a row, or else in a column, make one tomb)
            u  urn        $  rune-sealed urn (only a glyph's blast breaks it)
            R  rotling    W  wisp      H  crypt hound      B  the floor's boss

   Ordeal templates keep their terrain in `grid` (no enemies) and list each wave's enemies in `waves`,
   one grid per wave with only `.` and enemy letters. L-shaped templates are drawn missing the
   bottom-right corner; mirroring turns them to the other corners. */
import standardTemplates from '../../data/templates/standard.json';
import specialTemplates from '../../data/templates/special.json';
import shapedTemplates from '../../data/templates/shapes.json';
import type { EnemyType } from '../config';
import type { RoomType } from '../types';
import { SHAPE_IDS, doorSlots, shapeMask, shapeSize, type ShapeId } from './shapes';

export type { ShapeId } from './shapes';
export type Tile = 'floor' | 'rock' | 'pit' | 'void' | 'pillar' | 'tomb' | 'urn' | 'sealedUrn';
export type FoeKind = EnemyType | 'boss';

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

const TILE_OF: Record<string, Tile> = { '.': 'floor', '#': 'rock', 'o': 'pit', 'x': 'void', 'i': 'pillar', '=': 'tomb', 'u': 'urn', '$': 'sealedUrn' };
const FOE_OF: Record<string, FoeKind> = { R: 'rotling', W: 'wisp', H: 'hound', B: 'boss' };

/** Parse a template, optionally mirrored left-right and/or top-bottom. */
export function parseTemplate(def: TemplateDef, mirrorX = false, mirrorY = false): Template {
  const { w, h } = shapeSize(def.shape);
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

/** Problems with a template definition; empty when it is valid. */
export function validateTemplate(def: TemplateDef): string[] {
  const errs: string[] = [];
  if (!SHAPE_IDS.includes(def.shape)) return [`unknown shape "${def.shape}"`];
  const size = shapeSize(def.shape);
  if (def.grid.length !== size.h) errs.push(`has ${def.grid.length} rows, needs ${size.h}`);
  def.grid.forEach((row, r) => {
    if (row.length !== size.w) errs.push(`row ${r} has ${row.length} columns, needs ${size.w}`);
    for (const ch of row) if (!TILE_OF[ch] && !FOE_OF[ch]) errs.push(`row ${r} has unknown character "${ch}"`);
  });
  const ordeal = def.types.includes('ordeal');
  if (ordeal !== !!def.waves) errs.push(ordeal ? 'ordeal rooms need waves' : 'only ordeal rooms have waves');
  if (def.waves) {
    if (def.waves.length < 2 || def.waves.length > 3) errs.push(`has ${def.waves.length} waves, needs 2 or 3`);
    if (def.grid.some(row => [...row].some(ch => FOE_OF[ch]))) errs.push('ordeal enemies go in the waves, not the grid');
    def.waves.forEach((grid, i) => {
      if (grid.length !== size.h || grid.some(row => row.length !== size.w)) errs.push(`wave ${i + 1} is not ${size.w} × ${size.h}`);
      else if (grid.some(row => [...row].some(ch => ch !== '.' && ch !== 'x' && !FOE_OF[ch]))) errs.push(`wave ${i + 1} may only hold '.' and enemies`);
      else if (!grid.some(row => [...row].some(ch => FOE_OF[ch]))) errs.push(`wave ${i + 1} has no enemies`);
    });
  }
  if (errs.length) return errs;
  const t = parseTemplate(def);
  // the room's outline comes from its shape: `x` exactly where the shape has no inside
  const mask = shapeMask(def.shape);
  let outline = 0;
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) if ((t.tiles[r][c] === 'void') === mask[r][c]) outline++;
  if (outline) errs.push(`${outline} tiles disagree with the ${def.shape} outline (use x exactly outside the room)`);
  for (const f of t.foes) if (t.tiles[f.r][f.c] !== 'floor') errs.push(`${f.kind} at (${f.c},${f.r}) stands on ${t.tiles[f.r][f.c]}`);
  const blocked = (c: number, r: number) => t.tiles[r]?.[c] !== 'floor';
  const slots = doorSlots(def.shape), lanes = slots.flatMap(s => s.lanes), entries = slots.map(s => s.entry);
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
  // rooms with a centrepiece (pedestal, trapdoor) keep the centre free: one tile, or the 2 × 2 around it
  const cs = [Math.floor((t.w - 1) / 2), Math.ceil((t.w - 1) / 2)], rs = [Math.floor((t.h - 1) / 2), Math.ceil((t.h - 1) / 2)];
  const centre = cs.flatMap(c => rs.map(r => ({ c, r })));
  if (def.types.some(ty => ty !== 'normal') && centre.some(({ c, r }) => blocked(c, r) || t.foes.some(f => f.c === c && f.r === r))) errs.push('centre must be free');
  const bosses = t.foes.filter(f => f.kind === 'boss').length;
  if (def.types.includes('boss') ? bosses !== 1 : bosses !== 0) errs.push('boss rooms need exactly one B, other rooms none');
  if (def.types.includes('normal') && !t.foes.length) errs.push('normal rooms need enemies');
  if (!def.types.some(ty => ty === 'normal' || ty === 'boss' || ty === 'ordeal') && t.foes.length) errs.push(`${def.types.join('/')} rooms can't have enemies`);
  return errs;
}

/** Tombs in a parsed template: runs of tomb tiles side by side in a row (two or more), then what is left
    joined up and down into columns (a lone tile is a small tomb). `len` tiles long from (c, r). */
export function tombRuns(t: Pick<Template, 'tiles' | 'w' | 'h'>) {
  const runs: { c: number; r: number; len: number; across: boolean }[] = [], used = new Set<string>();
  const isTomb = (c: number, r: number) => t.tiles[r]?.[c] === 'tomb' && !used.has(c + ',' + r);
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w;) {
    let len = 0; while (isTomb(c + len, r)) len++;
    if (len >= 2) { runs.push({ c, r, len, across: true }); for (let k = 0; k < len; k++) used.add(c + k + ',' + r); c += len; } else c++;
  }
  for (let c = 0; c < t.w; c++) for (let r = 0; r < t.h;) {
    let len = 0; while (isTomb(c, r + len)) len++;
    if (len) { runs.push({ c, r, len, across: false }); for (let k = 0; k < len; k++) used.add(c + ',' + (r + k)); r += len; } else r++;
  }
  return runs;
}

export const TEMPLATE_DEFS: TemplateDef[] = [
  ...(standardTemplates as TemplateDef[]), ...(specialTemplates as TemplateDef[]), ...(shapedTemplates as TemplateDef[]),
];
export const TEMPLATES = new Map(TEMPLATE_DEFS.map(d => [d.id, d]));
