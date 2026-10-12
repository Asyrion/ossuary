/* Chained shades (M7 step 6; docs/M7-plan.md, decisions 10 and 11). In a run the mage finds, about one a floor, a shade of
   someone who died in the dungeon, chained in a secret room, at an ordeal's end, in a boss's keeping, now and then in a
   library or vault. Two or three chains bind it, each warded by a school the mage can land (or plain, which anything it
   casts breaks; a glyph's blast breaks any); with them broken it chooses: free it (it goes up to the Vigil, kept even if
   the run ends in death) or bind it (it walks with the mage through the next run, then slips back into its chains).
   Pure: the data (data/shades.json), which shade lies where on a floor, and which schools ward its chains. */
import data from '../../data/shades.json';
import type { RoomType } from '../types';
import type { School } from '../magic/spellData';

/** What a bound shade does for the mage in the run it walks with it (vigil/shadeHelp.ts). */
export type ShadeHelp = 'storm' | 'roots' | 'bow' | 'turn' | 'dig' | 'sing' | 'ring' | 'hex' | 'brew' | 'map';
export const SHADE_HELPS: ShadeHelp[] = ['storm', 'roots', 'bow', 'turn', 'dig', 'sing', 'ring', 'hex', 'brew', 'map'];
export interface ShadeDef { id: string; floors: [number, number]; light: string; help: ShadeHelp }
export interface ShadeData { rooms: Partial<Record<RoomType, number>>; chains: number[]; shades: ShadeDef[] }
export const SHADE_DATA = data as unknown as ShadeData;
export const SHADES = new Map(SHADE_DATA.shades.map(s => [s.id, s]));
export const SHADE_IDS = SHADE_DATA.shades.map(s => s.id);
export const shade = (id: string) => SHADES.get(id)!;

/** The shade that lies on floor `floor` (1-based): one whose floors take it in, not freed yet, not walking with the mage nor
    met already this run; drawn on `rnd`. Null when the floor's chance fails or none is left. */
export function pickShade(floor: number, chance: number, freed: readonly string[], skip: readonly string[], rnd: () => number, d: ShadeData = SHADE_DATA): string | null {
  if (!(rnd() < chance)) return null;
  const pool = d.shades.filter(s => floor >= s.floors[0] && floor <= s.floors[1] && !freed.includes(s.id) && !skip.includes(s.id));
  return pool.length ? pool[Math.floor(rnd() * pool.length)].id : null;
}
/** The room it lies in, of those the floor's plan has (`types`, by id): weighted by `rooms` in the data. Null when none fits. */
export function shadeRoom(types: { id: number; type: RoomType }[], rnd: () => number, d: ShadeData = SHADE_DATA): number | null {
  const can = types.filter(t => (d.rooms[t.type] ?? 0) > 0), total = can.reduce((a, t) => a + d.rooms[t.type]!, 0);
  let x = rnd() * total;
  for (const t of can) { x -= d.rooms[t.type]!; if (x < 0) return t.id; }
  return can.length ? can[can.length - 1].id : null;
}
/** How many chains bind a shade on floor `floor` (1-based). */
export const chainCount = (floor: number, d: ShadeData = SHADE_DATA) => d.chains[Math.min(Math.max(1, floor), d.chains.length) - 1];
/** The schools that ward its `n` chains: different schools the mage can land (`landable`, in the order given, shuffled by
    `rnd`), and for each chain more than that a plain one (`null`), which anything the mage casts breaks. Never a school the
    mage can't reach. */
export function chainSchools(landable: readonly School[], n: number, rnd: () => number): (School | null)[] {
  const pool = [...new Set(landable)];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return Array.from({ length: n }, (_, i) => pool[i] ?? null);
}
/** Whether a blow of `school` (undefined: a plain bolt; 'blast': a glyph's) breaks a chain warded by `ward`. */
export const breaks = (ward: School | null, school: School | 'blast' | undefined) => school === 'blast' || (ward === null ? true : ward === school);

/** What is wrong with the data. */
export function validateShades(d: ShadeData = SHADE_DATA, floors = 5): string[] {
  const errs: string[] = [];
  if (d.shades.length !== 10) errs.push(`ten townspeople, not ${d.shades.length}`);
  for (const s of d.shades) {
    if (!SHADE_HELPS.includes(s.help)) errs.push(`${s.id}: unknown help "${s.help}"`);
    if (!(s.floors[0] >= 1 && s.floors[1] <= floors && s.floors[0] <= s.floors[1])) errs.push(`${s.id}: floors ${s.floors.join(' to ')} out of 1 to ${floors}`);
    if (!/^#[0-9a-f]{6}$/i.test(s.light)) errs.push(`${s.id}: light "${s.light}" isn't a colour`);
  }
  if (new Set(d.shades.map(s => s.help)).size !== d.shades.length) errs.push('each shade helps its own way');
  for (let f = 1; f <= floors; f++) if (!d.shades.some(s => f >= s.floors[0] && f <= s.floors[1])) errs.push(`no shade lies on floor ${f}`);
  if (!d.chains.every(n => n >= 1 && n <= 3)) errs.push('one to three chains a shade');
  return errs;
}
