/* The soundscapes as data (data/ambience.json; docs/sound-plan.md): each floor's space, bed and one-shots, the special
   rooms' and themes' over them. Pure: the kinds, the checks, and which soundscape plays where. */
import data from '../../data/ambience.json';

/** What a bed can be made of: shaped noise (wind, rumble, roar, a whistle), a stream of bubbles, fire's crackle, waves
    on a shore, a hum of slowly beating tones. */
export const BED_KINDS = ['noise', 'stream', 'crackle', 'shore', 'hum'] as const;
export type BedKind = typeof BED_KINDS[number];
/** The one-shots (ambienceShots.ts makes each). */
export const SHOT_KINDS = [
  'drip', 'bones', 'chant', 'rats', 'chapelBell', 'bubbles', 'slosh', 'underBell', 'stones', 'pages', 'beam', 'ember', 'books',
  'flare', 'chimes', 'coins', 'censer', 'highVoice', 'wax', 'ferryBell', 'whispers', 'boatCreak', 'oar', 'shingle', 'pulse',
  'bookThud', 'chime', 'glass', 'gloop', 'murmur', 'dust', 'rubble', 'rustle', 'insect', 'choirHum', 'birds',
] as const;
export type ShotKind = typeof SHOT_KINDS[number];

export interface Space { seconds: number; bright: number }
export interface BedLayer {
  kind: BedKind; gain: number;
  colour?: 'white' | 'pink' | 'brown'; filter?: 'lowpass' | 'bandpass' | 'highpass'; freq?: number; q?: number;
  /** Where a noise's band wanders between, and how it gusts (`every` seconds, `depth` 0 to 1 of its loudness). */
  sweep?: [number, number]; gust?: { every: number; depth: number };
  rate?: number; lo?: number; hi?: number; thick?: number; period?: number; freqs?: number[]; beat?: number;
}
export interface ShotSpec { kind: ShotKind; every: number; gain: number; far: [number, number]; steady?: boolean }
export interface Scape { space?: Space; bed?: BedLayer[]; shots?: ShotSpec[]; duck?: number }
export interface FloorScape extends Scape { id: string; space: Space }

/** Scenes with a soundscape of their own beside the room types' (M7 step 3: the cave mouth at dawn). */
export const SCENE_SCAPES: readonly string[] = ['daylight'];
export const FLOOR_SCAPES = data.floors as unknown as FloorScape[];
export const ROOM_SCAPES = data.rooms as unknown as Record<string, Scape>;
export const THEME_SCAPES = data.themes as unknown as Record<string, Scape>;

/** The floor's soundscape (past the last, the last's). */
export const floorScape = (floor: number) => FLOOR_SCAPES[Math.max(0, Math.min(FLOOR_SCAPES.length - 1, floor))];

/** What plays over the floor's in a room: its type's soundscape, else its theme's (a themed room is an ordinary one). */
export function roomScape(type: string, theme?: string): { id: string; scape: Scape } | null {
  if (ROOM_SCAPES[type]) return { id: type, scape: ROOM_SCAPES[type] };
  if (theme && THEME_SCAPES[theme]) return { id: theme, scape: THEME_SCAPES[theme] };
  return null;
}

/** The space a room is heard in: its own if it has one, else the floor's. */
export const spaceFor = (floor: number, over: Scape | null) => over?.space ?? floorScape(floor).space;

const BED_NEEDS: Record<BedKind, (keyof BedLayer)[]> = {
  noise: ['colour', 'filter', 'freq'], stream: ['rate', 'lo', 'hi'], crackle: ['rate'], shore: ['period'], hum: ['freqs'],
};

/** Every soundscape checked: known kinds, what each needs, sane numbers; `rooms` and `themes` the ids they may name. */
export function validateAmbience(rooms: readonly string[], themes: readonly string[], d = data as unknown as { floors: FloorScape[]; rooms: Record<string, Scape>; themes: Record<string, Scape> }): string[] {
  const errs: string[] = [];
  const check = (at: string, s: Scape) => {
    if (s.space && !(s.space.seconds > 0 && s.space.seconds <= 6 && s.space.bright >= 0 && s.space.bright <= 1)) errs.push(`${at}: a space lasts 0 to 6 s, bright 0 to 1`);
    if (s.duck !== undefined && !(s.duck >= 0 && s.duck <= 1)) errs.push(`${at}: duck is 0 to 1`);
    for (const [i, b] of (s.bed ?? []).entries()) {
      const where = `${at} bed ${i}`;
      if (!BED_KINDS.includes(b.kind)) { errs.push(`${where}: unknown kind "${b.kind}"`); continue; }
      for (const k of BED_NEEDS[b.kind]) if (b[k] === undefined) errs.push(`${where}: a ${b.kind} needs ${k}`);
      if (!(b.gain > 0 && b.gain <= 1)) errs.push(`${where}: gain is above 0, at most 1`);
      if (b.sweep && !(b.sweep[0] > 0 && b.sweep[1] > b.sweep[0])) errs.push(`${where}: a sweep goes from low to high`);
      if (b.gust && !(b.gust.every > 0 && b.gust.depth >= 0 && b.gust.depth <= 1)) errs.push(`${where}: a gust comes every so many seconds, its depth 0 to 1`);
    }
    for (const sh of s.shots ?? []) {
      const where = `${at} shot ${sh.kind}`;
      if (!SHOT_KINDS.includes(sh.kind)) errs.push(`${where}: unknown kind`);
      if (!(sh.every >= .5)) errs.push(`${where}: comes every half a second at most`);
      if (!(sh.gain > 0 && sh.gain <= 1)) errs.push(`${where}: gain is above 0, at most 1`);
      if (!(sh.far?.length === 2 && sh.far[0] >= 0 && sh.far[1] <= 1 && sh.far[0] <= sh.far[1])) errs.push(`${where}: far is a range within 0 to 1`);
    }
  };
  if (d.floors.length < 5) errs.push('every floor needs a soundscape');
  d.floors.forEach((f, i) => { if (!f.space) errs.push(`floor ${i + 1} needs a space`); if (!f.bed?.length) errs.push(`floor ${i + 1} needs a bed`); check(`floor ${f.id}`, f); });
  for (const [id, s] of Object.entries(d.rooms)) { if (!rooms.includes(id) && !SCENE_SCAPES.includes(id)) errs.push(`room "${id}" is no room type`); check(`room ${id}`, s); }
  for (const [id, s] of Object.entries(d.themes)) { if (!themes.includes(id)) errs.push(`theme "${id}" is no theme`); check(`theme ${id}`, s); }
  return errs;
}
