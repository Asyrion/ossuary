/* Room templates: character grids in data/templates/*.json, one grid the size of the shape's inside
   (shapes.ts). Pure data code (no three.js), shared by the game, the floor generator and the unit tests.

   Legend:  .  floor      #  rock      o  pit      x  wall: outside the room (the L's missing corner), and inside
                                                      it, carved out of the shape (a cut corner, an apse, a bay)
                                                      or standing free (a partition, a pier)
            i  pillar     =  stone tomb (tiles side by side in a row, or else in a column, make one tomb)
            u  urn        $  rune-sealed urn (only a glyph's blast breaks it)
            ~  water      %  oil (both walkable; tiles side by side make one pool, see world/pools.ts)
            b  bone pile  k  skull heap  s  grave sacks  c  oil cask   r  rubble    p  pew (side by side, one pew)
            t  grave roots  v  thorn briar  :  cobwebs  g  glowcaps  d  desk  e  scroll heap
            f  brazier  l  candle stand  a  bell  n  rune stone  y  lodestone  *  hanging censer  q  reliquary
            T  dead tree  (the objects and mechanisms of world/propData.ts)
            R  rotling    W  wisp      H  crypt hound      B  the floor's boss

   Ordeal templates keep their terrain in `grid` (no enemies) and list each wave's enemies in `waves`,
   one grid per wave with only `.` and enemy letters. L-shaped templates are drawn missing the
   bottom-right corner; mirroring turns them to the other corners. */
import standardTemplates from '../../data/templates/standard.json';
import specialTemplates from '../../data/templates/special.json';
import shapedTemplates from '../../data/templates/shapes.json';
import themedTemplates from '../../data/templates/themed.json';
import type { Role } from '../actors/foeData';
import type { RoomType } from '../types';
import { SHAPE_IDS, doorSlots, shapeMask, shapeSize, type ShapeId } from './shapes';
import { PROPS, PROP_KINDS, PROP_OF_CHAR, type PropKind } from './propData';

export type { ShapeId } from './shapes';
export type Tile = 'floor' | 'rock' | 'pit' | 'void' | 'pillar' | 'tomb' | 'urn' | 'sealedUrn' | 'water' | 'oil' | PropKind;
/** Tiles the mage and foes can stand on (soft objects too: briars and cobwebs). */
export const WALKABLE: readonly Tile[] = ['floor', 'water', 'oil', ...PROP_KINDS.filter(k => PROPS[k].class === 'soft' || PROPS[k].class === 'hanging')];
/** Tiles clear enough for a doorway's lane or a foe's first step: walkable, and nothing in the way. */
export const CLEAR: readonly Tile[] = ['floor', 'water', 'oil'];
/** What a template's foe letter names: a role the floor fills (actors/foeData.ts), or its boss. */
export type FoeKind = Role | 'boss';

export interface TemplateDef {
  id: string; shape: ShapeId; types: RoomType[]; difficulty: number; grid: string[];
  /** A themed room's theme (world/themeData.ts, data/themes.json). */ theme?: string;
  /** Ordeal rooms: the enemies of each wave. */ waves?: string[][];
}
export interface Foe { kind: FoeKind; c: number; r: number }
export interface Template {
  id: string; shape: ShapeId; types: RoomType[]; difficulty: number; w: number; h: number;
  tiles: Tile[][]; // [row][col]
  /** Enemies per wave: one wave for normal and boss rooms, none for empty rooms. */ waves: Foe[][];
  /** Every enemy of every wave. */ foes: Foe[];
}

const TILE_OF: Record<string, Tile> = { '.': 'floor', '#': 'rock', 'o': 'pit', 'x': 'void', 'i': 'pillar', '=': 'tomb', 'u': 'urn', '$': 'sealedUrn', '~': 'water', '%': 'oil', ...PROP_OF_CHAR };
const FOE_OF: Record<string, FoeKind> = { R: 'R', W: 'W', H: 'H', B: 'boss' };

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
  // the room's outline comes from its shape: `x` wherever the shape has no inside (and inside it, to carve)
  const mask = shapeMask(def.shape);
  let outline = 0;
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) if (!mask[r][c] && t.tiles[r][c] !== 'void') outline++;
  if (outline) errs.push(`${outline} tiles disagree with the ${def.shape} outline (use x outside the room)`);
  for (const f of t.foes) if (!CLEAR.includes(t.tiles[f.r][f.c])) errs.push(`${f.kind} at (${f.c},${f.r}) stands on ${t.tiles[f.r][f.c]}`);
  const blocked = (c: number, r: number) => !WALKABLE.includes(t.tiles[r]?.[c]);
  const slots = doorSlots(def.shape), lanes = slots.flatMap(s => s.lanes), entries = slots.map(s => s.entry);
  for (const { c, r } of lanes) {
    if (!CLEAR.includes(t.tiles[r]?.[c])) errs.push(`door lane tile (${c},${r}) is blocked`);
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

/** Pools in a parsed template: water or oil tiles joined side by side (not corner to corner) into one pool. */
export function poolsOf(t: Pick<Template, 'tiles' | 'w' | 'h'>) {
  const pools: { kind: 'water' | 'oil'; tiles: { c: number; r: number }[] }[] = [], seen = new Set<string>();
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) {
    const kind = t.tiles[r][c];
    if ((kind !== 'water' && kind !== 'oil') || seen.has(c + ',' + r)) continue;
    const tiles: { c: number; r: number }[] = [], queue = [{ c, r }]; seen.add(c + ',' + r);
    while (queue.length) {
      const p = queue.pop()!; tiles.push(p);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = p.c + dc, nr = p.r + dr, k = nc + ',' + nr;
        if (t.tiles[nr]?.[nc] === kind && !seen.has(k)) { seen.add(k); queue.push({ c: nc, r: nr }); }
      }
    }
    pools.push({ kind, tiles });
  }
  return pools;
}

/** Grow `count` puddles of water, each `size` tiles (least, most), over a template's plain floor, from spots `rnd`
    picks (the drowned floor's standing water made real). Changes `t.tiles`. */
export function growPuddles(t: Pick<Template, 'tiles' | 'w' | 'h'>, rnd: () => number, count: number, size: [number, number]) {
  for (let p = 0; p < count; p++) {
    let at: { c: number; r: number } | null = null;
    for (let i = 0; i < 30 && !at; i++) { const c = Math.floor(rnd() * t.w), r = Math.floor(rnd() * t.h); if (t.tiles[r][c] === 'floor') at = { c, r }; }
    if (!at) continue;
    const want = size[0] + Math.floor(rnd() * (size[1] - size[0] + 1)), grown = [at];
    t.tiles[at.r][at.c] = 'water';
    for (let i = 0; i < 40 && grown.length < want; i++) {
      const from = grown[Math.floor(rnd() * grown.length)], [dc, dr] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
      const c = from.c + dc, r = from.r + dr;
      if (t.tiles[r]?.[c] === 'floor') { t.tiles[r][c] = 'water'; grown.push({ c, r }); }
    }
  }
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
  ...(standardTemplates as TemplateDef[]), ...(specialTemplates as TemplateDef[]), ...(shapedTemplates as TemplateDef[]), ...(themedTemplates as TemplateDef[]),
];
export const TEMPLATES = new Map(TEMPLATE_DEFS.map(d => [d.id, d]));
