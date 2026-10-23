/* The animated creatures' data (data/creatures.json, written by tools/animate-creature.ts and tools/texel-bake.ts:
   docs/creatures.md), what each entry holds, and its check (the unit tests and the dev board run it). Nothing of three.js
   here, so the dev board's check can read it. */
import { BUDGETS } from '../assets/assetData';

export interface ClipInfo {
  duration: number;
  loop: boolean;
  speed?: number; // (how far a clip that carries it goes a second, in the model's units: a gallop)
  at?: number; // (when its blow falls: a stamp's hooves down)
  events: { t: number; sound: string; at?: string; loud?: boolean }[];
}
export interface CreatureInfo {
  file: string;
  height: number;
  fine?: boolean;
  modelHeight: number;
  modelLength: number;
  walkSpeed: number;
  clips: Record<string, ClipInfo>;
  budget?: string;
  // (every model has its bake: tests/unit/texelBake.test.ts; `colours` its palette's size, `glowing` its texels that glow)
  texel: { file: string; glow: string; side: number; colours?: number; glowing?: number };
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** What is wrong with data/creatures.json `table` (its `_comment` aside): one line each, none when it is sound. */
export function validateCreatures(table: Record<string, unknown>) {
  const errors: string[] = [];
  for (const [id, e] of Object.entries(table)) {
    if (id === '_comment') continue;
    const c = e as Partial<CreatureInfo>,
      bad = (what: string) => errors.push(`${id}: ${what}`);
    if (typeof c.file !== 'string' || !c.file.endsWith('.glb')) bad('file must be a .glb');
    for (const k of ['height', 'modelHeight', 'modelLength'] as const)
      if (!(num(c[k]) && c[k] > 0)) bad(`${k} must be above 0`);
    if (!(num(c.walkSpeed) && c.walkSpeed >= 0)) bad('walkSpeed must be a number, 0 or more');
    if (c.budget !== undefined && !(c.budget in BUDGETS))
      bad(`budget "${String(c.budget)}" is none of ${Object.keys(BUDGETS).join(', ')}`);
    if (!c.clips || typeof c.clips !== 'object' || !c.clips.idle) bad('needs its clips, an idle among them');
    for (const [name, k] of Object.entries(c.clips ?? {})) {
      const clip = `clip ${name}`;
      if (!(num(k.duration) && k.duration > 0)) {
        bad(`${clip}: duration must be above 0`);
        continue;
      }
      if (typeof k.loop !== 'boolean') bad(`${clip}: loop must be true or false`);
      if (k.speed !== undefined && !(num(k.speed) && k.speed > 0)) bad(`${clip}: speed must be above 0`);
      if (k.at !== undefined && !(num(k.at) && k.at >= 0 && k.at <= k.duration))
        bad(`${clip}: at must fall within its ${k.duration} s`);
      if (!Array.isArray(k.events)) bad(`${clip}: events must be a list`);
      else
        for (const ev of k.events)
          if (!(num(ev.t) && ev.t >= 0 && ev.t <= k.duration && typeof ev.sound === 'string' && ev.sound))
            bad(`${clip}: an event needs a sound and a time within its ${k.duration} s`);
    }
    const t = c.texel;
    if (!t) bad('texel: no baked texture (npm run texel-bake)');
    else {
      if (typeof t.file !== 'string' || typeof t.glow !== 'string') bad('texel: needs its file and glow');
      if (!(num(t.side) && t.side > 0 && (t.side & (t.side - 1)) === 0)) bad('texel: side must be a power of two');
      if (t.colours !== undefined && !(Number.isInteger(t.colours) && t.colours > 0))
        bad('texel: colours must be a whole number above 0');
      if (t.glowing !== undefined && !(num(t.glowing) && t.glowing >= 0)) bad('texel: glowing must be 0 or more');
    }
  }
  return errors;
}
