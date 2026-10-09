/* The Vigil's map (M7 step 5; docs/M7-plan.md, decisions 8 and 9): data/vigil.json lays three rooms by hand (the Crypt
   where the mage wakes, the Nave, the Landing), each from a template marked `fixed` in data/templates/vigil.json, with
   what stands in them (the bier, the candle wall, the skulls, the lectern, the echoes' plinths, the Ferryman's boat), the
   six ways barred by a school (opened in step 9), the Great Circle cut in the Nave's floor and where the mage wakes. Pure:
   its shape, the plan (generate.ts's `hubPlan`) and the checks. */
import vigilData from '../../data/vigil.json';
import type { FloorLook, Side } from '../types';
import type { Rng } from '../rng';
import { hubPlan, type FixedRoom, type FloorPlan } from '../world/generate';
import { TEMPLATE_DEFS, parseTemplate, type TemplateDef } from '../world/templates';
import { doorSlots } from '../world/shapes';
import type { School } from '../actors/foeData';
import { SHADE_IDS } from './shadeData';

/** What stands in the Vigil, each its own look (vigilLooks.ts). */
export type PieceKind = 'bier' | 'candleWall' | 'skulls' | 'lectern' | 'plinth' | 'boat';
export const PIECE_KINDS: PieceKind[] = ['bier', 'candleWall', 'skulls', 'lectern', 'plinth', 'boat'];
export interface VigilRoom extends FixedRoom { name: string }
/** A thing on the map: its room (by name), its top-left tile and how many tiles it covers (it blocks them all). */
interface Placed { room: string; at: [number, number]; size?: [number, number] }
export interface VigilPiece extends Placed { kind: PieceKind }
/** A way barred by a school: in a doorway's place on the room's outer wall (`side`), leading nowhere until step 9. */
export interface VigilBar extends Placed { school: School; side: Side }
export interface VigilMap {
  rooms: VigilRoom[];
  /** Where the mage wakes: a room and a point in it, in tiles. */ wake: { room: string; at: [number, number] };
  pieces: VigilPiece[]; bars: VigilBar[];
  /** The Great Circle, cut in the floor: its room, its middle in tiles and its radius. */ circle: { room: string; at: [number, number]; radius: number };
  /** Where each freed shade stands (M7 step 7): a room and a tile for each shade of data/shades.json. */ town: { room: string; spots: Record<string, [number, number]> };
  look: FloorLook;
}
export const VIGIL = vigilData as unknown as VigilMap;
/** The Vigil's plan's index: no floor's. */
export const VIGIL_INDEX = -1;
/** The six schools that bar the six ways, in the order the GDD gives them. */
export const BAR_SCHOOLS: School[] = ['ember', 'frost', 'storm', 'hallow', 'umbral', 'verdant'];

/** The Vigil laid out: its rooms where the data puts them, doors between them. */
export const vigilPlan = (rng: Rng, map: VigilMap = VIGIL, library: TemplateDef[] = TEMPLATE_DEFS): FloorPlan => hubPlan(rng, map.rooms, VIGIL_INDEX, library);
/** The room a piece or bar stands in (its index in the plan). */
export const roomIndex = (map: VigilMap, name: string) => map.rooms.findIndex(r => r.name === name);
/** The tiles a piece or bar covers. */
export const tilesOf = (p: Pick<Placed, 'at' | 'size'>) => { const [w, h] = p.size ?? [1, 1], out: [number, number][] = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push([p.at[0] + i, p.at[1] + j]); return out; };

/** What is wrong with the map, if anything. */
export function validateVigil(map: VigilMap = VIGIL, library: TemplateDef[] = TEMPLATE_DEFS, shades: string[] = SHADE_IDS): string[] {
  const errs: string[] = [];
  for (const r of map.rooms) {
    const def = library.find(t => t.id === r.template);
    if (!def) { errs.push(`${r.name}: no template "${r.template}"`); continue; }
    if (!def.fixed) errs.push(`${r.name}: its template "${r.template}" isn't marked fixed`);
    if (r.type !== 'vigil' || !def.types.includes('vigil')) errs.push(`${r.name}: a room of the Vigil is a vigil room`);
  }
  if (errs.length) return errs;
  let plan: FloorPlan;
  try { plan = hubPlan({ int: (a: number) => a } as unknown as Rng, map.rooms, VIGIL_INDEX, library); } catch (e) { return [(e as Error).message]; }
  const taken = new Map<string, string>();
  const place = (what: string, p: Placed, onWater: boolean) => {
    const i = roomIndex(map, p.room);
    if (i < 0) { errs.push(`${what}: no room "${p.room}"`); return; }
    const pr = plan.rooms[i], t = parseTemplate(library.find(d => d.id === pr.templateId)!);
    // the lanes of the doorways this room really has, which nothing may stand in
    const doorLanes = doorSlots(pr.shape).filter(s => pr.doors.some(d => d.side === s.side && d.gx - pr.anchor.gx === s.i && d.gy - pr.anchor.gy === s.j)).flatMap(s => s.lanes);
    for (const [c, r] of tilesOf(p)) {
      const tile = t.tiles[r]?.[c];
      if (tile !== (onWater ? 'water' : 'floor')) errs.push(`${what} at (${c},${r}) in the ${p.room} stands on ${tile ?? 'nothing'}, not ${onWater ? 'water' : 'floor'}`);
      if (doorLanes.some(l => l.c === c && l.r === r)) errs.push(`${what} at (${c},${r}) in the ${p.room} stands in a doorway's lane`);
      const k = `${p.room}:${c},${r}`, other = taken.get(k);
      if (other) errs.push(`${what} and ${other} both stand at (${c},${r}) in the ${p.room}`); else taken.set(k, what);
    }
  };
  for (const p of map.pieces) {
    if (!PIECE_KINDS.includes(p.kind)) errs.push(`unknown piece "${p.kind}"`);
    place(p.kind, p, p.kind === 'boat');
  }
  for (const k of ['bier', 'candleWall', 'lectern', 'boat'] as PieceKind[]) if (!map.pieces.some(p => p.kind === k)) errs.push(`the Vigil has no ${k}`);
  for (const b of map.bars) {
    place(`the ${b.school} bar`, b, false);
    const i = roomIndex(map, b.room); if (i < 0) continue;
    const t = parseTemplate(library.find(d => d.id === plan.rooms[i].templateId)!), tiles = tilesOf(b);
    const against = { n: tiles.every(([, r]) => r === 0), s: tiles.every(([, r]) => r === t.h - 1), w: tiles.every(([c]) => c === 0), e: tiles.every(([c]) => c === t.w - 1) }[b.side];
    if (!against) errs.push(`the ${b.school} bar doesn't stand against the ${b.room}'s ${b.side} wall`);
    const pr = plan.rooms[i], [dx, dy] = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[b.side];
    if (tiles.some(([c, r]) => { const gx = pr.anchor.gx + Math.floor(c / 15) + dx, gy = pr.anchor.gy + Math.floor(r / 9) + dy; return plan.rooms.some(o => o.cells.some(cl => cl.gx === gx && cl.gy === gy)); }))
      errs.push(`the ${b.school} bar leads into another of the Vigil's rooms: its way must lead out of the map`);
  }
  const schools = map.bars.map(b => b.school);
  if (schools.length !== BAR_SCHOOLS.length || BAR_SCHOOLS.some(s => !schools.includes(s))) errs.push(`the six ways are barred by one school each (${BAR_SCHOOLS.join(', ')})`);
  if (roomIndex(map, map.circle.room) < 0) errs.push(`the circle: no room "${map.circle.room}"`);
  for (const id of shades) if (!map.town.spots[id]) errs.push(`the townspeople: no spot for ${id}`);
  for (const [id, at] of Object.entries(map.town.spots)) {
    if (!shades.includes(id)) errs.push(`the townspeople: a spot for ${id}, who is no shade`);
    place(id, { room: map.town.room, at }, false);
    if (map.town.room === map.circle.room && Math.hypot(at[0] + .5 - map.circle.at[0], at[1] + .5 - map.circle.at[1]) < map.circle.radius + 1) errs.push(`${id} stands on the Great Circle`);
  }
  const w = roomIndex(map, map.wake.room);
  if (w < 0) errs.push(`waking: no room "${map.wake.room}"`);
  else {
    const t = parseTemplate(library.find(d => d.id === plan.rooms[w].templateId)!), c = Math.floor(map.wake.at[0]), r = Math.floor(map.wake.at[1]);
    if (t.tiles[r]?.[c] !== 'floor' || taken.has(`${map.wake.room}:${c},${r}`)) errs.push(`the mage wakes at (${c},${r}) in the ${map.wake.room}, which isn't clear floor`);
  }
  return errs;
}
