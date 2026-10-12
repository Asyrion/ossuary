/* The Vigil's map (M7 step 5; docs/M7-plan.md, decisions 8 and 9): data/vigil.json lays three rooms by hand (the Crypt
   where the mage wakes, the Nave, the Landing), each from a template marked `fixed` in data/templates/vigil.json, with
   what stands in them (the bier, the candle wall, the skulls, the lectern, the echoes' plinths, the Ferryman's boat), the
   six ways barred by a school, the Great Circle cut in the Nave's floor and where the mage wakes. Step 9 (the unfolding):
   six more rooms, each `behind` one barred way and reached only through it (the Cave Mouth, the candle chapel, the scrying
   pool, the echoes' gallery, the garden of the dead, the practice crypt), what fills them (`unfold`), and the doorways
   barred until their school opens them (`barred` on the plan's doors). Pure: its shape, the plan (generate.ts's
   `hubPlan`) and the checks. */
import vigilData from '../../data/vigil.json';
import type { FloorLook, Side } from '../types';
import type { Rng } from '../rng';
import { hubPlan, type FixedRoom, type FloorPlan } from '../world/generate';
import { TEMPLATE_DEFS, parseTemplate, type TemplateDef } from '../world/templates';
import { doorSlots } from '../world/shapes';
import type { School } from '../actors/foeData';
import { SHADE_IDS } from './shadeData';
import { REAGENT_IDS } from '../items/alchemyData';

/** What stands in the Vigil, each its own look (vigilLooks.ts). */
export type PieceKind = 'bier' | 'candleWall' | 'skulls' | 'lectern' | 'plinth' | 'boat';
export const PIECE_KINDS: PieceKind[] = ['bier', 'candleWall', 'skulls', 'lectern', 'plinth', 'boat'];
/** A room of the Vigil; `behind`: the school whose barred way opens it (step 9), reached through that way alone; `kit`:
    the room kit's kinds it draws from, over the Vigil's own. */
export interface VigilRoom extends FixedRoom { name: string; behind?: School; kit?: Partial<Record<'wall' | 'floor' | 'torch' | 'brazier', Record<string, number>>> }
/** What one freed shade raises at the Cave Mouth (step 9), in the order they were freed. */
export type CaveKind = 'house' | 'terrace' | 'bed' | 'fall';
export const CAVE_KINDS: CaveKind[] = ['house', 'terrace', 'bed', 'fall'];
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
  /** Step 9: what fills the rooms behind the barred ways: the Cave Mouth's spots, one raised for each shade freed; the candle
      chapel's altar and a candle for each townsperson; the garden of the dead's bed for each reagent. */
  unfold: {
    cave: { room: string; spots: [number, number, CaveKind][] };
    chapel: { room: string; altar: [number, number]; size: [number, number]; candles: Record<string, [number, number]> };
    garden: { room: string; beds: Record<string, [number, number]> };
  };
  look: FloorLook;
}
export const VIGIL = vigilData as unknown as VigilMap;
/** The Vigil's plan's index: no floor's. */
export const VIGIL_INDEX = -1;
/** The six schools that bar the six ways, in the order the GDD gives them. */
export const BAR_SCHOOLS: School[] = ['ember', 'frost', 'storm', 'hallow', 'umbral', 'verdant'];

/** The Vigil laid out: its rooms where the data puts them, doors between them; a room behind a barred way reached only
    through it, its doorway `barred` while its school isn't among the parts `opened` (step 9). */
export function vigilPlan(rng: Rng, map: VigilMap = VIGIL, library: TemplateDef[] = TEMPLATE_DEFS, opened: readonly string[] = []): FloorPlan {
  const plan = hubPlan(rng, map.rooms, VIGIL_INDEX, library), ways = barDoors(map, plan);
  plan.rooms.forEach((pr, i) => {
    pr.doors = pr.doors.flatMap(d => {
      const way = ways.get(`${i}:${d.gx},${d.gy},${d.side}`);
      if (!map.rooms[i].behind && !map.rooms[d.to].behind) return [d];
      return way ? [{ ...d, ...(!opened.includes(way) && { barred: true }) }] : [];
    });
  });
  return plan;
}
const STEP: Record<Side, [number, number]> = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const BACK: Record<Side, Side> = { n: 's', s: 'n', w: 'e', e: 'w' };
/** The cell a placed thing's middle tile stands in, in a planned room (a cell is 15 tiles across and 9 down, walls in). */
const cellOf = (pr: FloorPlan['rooms'][number], p: Placed) => { const [w, h] = p.size ?? [1, 1]; return { gx: pr.anchor.gx + Math.floor((p.at[0] + (w - 1) / 2) / 15), gy: pr.anchor.gy + Math.floor((p.at[1] + (h - 1) / 2) / 9) }; };
/** Each barred way's doorway, from both sides: `room index:gx,gy,side` to its school. */
function barDoors(map: VigilMap, plan: FloorPlan) {
  const out = new Map<string, School>();
  for (const b of map.bars) {
    const i = roomIndex(map, b.room); if (i < 0) continue;
    const c = cellOf(plan.rooms[i], b), [dx, dy] = STEP[b.side], n = { gx: c.gx + dx, gy: c.gy + dy };
    const j = plan.rooms.findIndex(r => r.cells.some(cl => cl.gx === n.gx && cl.gy === n.gy));
    out.set(`${i}:${c.gx},${c.gy},${b.side}`, b.school);
    if (j >= 0) out.set(`${j}:${n.gx},${n.gy},${BACK[b.side]}`, b.school);
  }
  return out;
}
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
  try { plan = vigilPlan({ int: (a: number) => a } as unknown as Rng, map, library); } catch (e) { return [(e as Error).message]; } // (the doors as laid: a barred way's room through it alone)
  const taken = new Map<string, string>();
  const place = (what: string, p: Placed, onWater: boolean, itsWay = false) => { // (`itsWay`: a barred way, standing in its own doorway's lane until it opens)
    const i = roomIndex(map, p.room);
    if (i < 0) { errs.push(`${what}: no room "${p.room}"`); return; }
    const pr = plan.rooms[i], t = parseTemplate(library.find(d => d.id === pr.templateId)!);
    // the lanes of the doorways this room really has, which nothing may stand in
    const doorLanes = doorSlots(pr.shape).filter(s => pr.doors.some(d => d.side === s.side && d.gx - pr.anchor.gx === s.i && d.gy - pr.anchor.gy === s.j)).flatMap(s => s.lanes);
    for (const [c, r] of tilesOf(p)) {
      const tile = t.tiles[r]?.[c];
      if (tile !== (onWater ? 'water' : 'floor')) errs.push(`${what} at (${c},${r}) in the ${p.room} stands on ${tile ?? 'nothing'}, not ${onWater ? 'water' : 'floor'}`);
      if (!itsWay && doorLanes.some(l => l.c === c && l.r === r)) errs.push(`${what} at (${c},${r}) in the ${p.room} stands in a doorway's lane`);
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
    place(`the ${b.school} bar`, b, false, true);
    const i = roomIndex(map, b.room); if (i < 0) continue;
    const t = parseTemplate(library.find(d => d.id === plan.rooms[i].templateId)!), tiles = tilesOf(b);
    const against = { n: tiles.every(([, r]) => r === 0), s: tiles.every(([, r]) => r === t.h - 1), w: tiles.every(([c]) => c === 0), e: tiles.every(([c]) => c === t.w - 1) }[b.side];
    if (!against) errs.push(`the ${b.school} bar doesn't stand against the ${b.room}'s ${b.side} wall`);
    const behind = map.rooms.findIndex(r => r.behind === b.school), c = cellOf(plan.rooms[i], b), [dx, dy] = STEP[b.side];
    const into = plan.rooms.findIndex(o => o.cells.some(cl => cl.gx === c.gx + dx && cl.gy === c.gy + dy));
    if (behind < 0) errs.push(`no room lies behind the ${b.school} bar`);
    else if (into !== behind) errs.push(`the ${b.school} bar leads ${into < 0 ? 'out of the map' : `into the ${map.rooms[into].name}`}, not the ${map.rooms[behind].name} behind it`);
  }
  for (const r of map.rooms) if (r.behind && map.bars.filter(b => b.school === r.behind).length !== 1) errs.push(`the ${r.name} is behind the ${r.behind} bar, which isn't one way`);
  for (const r of map.rooms) if (r.behind && map.rooms.filter(o => o.behind === r.behind).length > 1) errs.push(`two rooms lie behind the ${r.behind} bar`);
  if (map.rooms[0]?.behind) errs.push('the Vigil\'s first room is barred');
  // step 9: what fills the rooms behind the bars stands on their floor, clear of their doorways and of each other
  const U = map.unfold;
  if (U) {
    U.cave.spots.forEach(([c, r, kind], k) => { if (!CAVE_KINDS.includes(kind)) errs.push(`the Cave Mouth's spot ${k}: no kind "${kind}"`); place(`the Cave Mouth's ${kind} ${k}`, { room: U.cave.room, at: [c, r] }, false); });
    if (U.cave.spots.length < shades.length) errs.push(`the Cave Mouth raises one thing for each shade freed: ${shades.length} spots, not ${U.cave.spots.length}`);
    place('the chapel\'s altar', { room: U.chapel.room, at: U.chapel.altar, size: U.chapel.size }, false);
    for (const id of shades) { const at = U.chapel.candles[id]; if (!at) errs.push(`the chapel: no candle for ${id}`); else place(`${id}'s candle`, { room: U.chapel.room, at }, false); }
    for (const [id, at] of Object.entries(U.garden.beds)) { if (!REAGENT_IDS.includes(id as never)) errs.push(`the garden: a bed of ${id}, which is no reagent`); place(`the ${id} bed`, { room: U.garden.room, at }, false); }
    for (const id of REAGENT_IDS) if (!U.garden.beds[id]) errs.push(`the garden: no bed of ${id}`);
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
