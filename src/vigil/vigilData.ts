/* The keeping (docs/M7-plan.md, decisions 3 and 17, "What the save keeps"): what carries over from one run to
   the next, as one versioned record (`ossuary.vigil`, kept by save.ts). Pure: its shape, a record made whole from whatever
   was stored (`migrate`, which also takes over the five keys kept before it), a record checked (`validate`), and what a
   run brings home: its Arcane Dust from each source (`dustFor`) and its obols (`obolsHome`). */

export const SAVE_VERSION = 1;
/** The keys kept before the save, which it takes over once (and leaves in place). */
export const LEGACY_KEYS = {
  knowledge: 'ossuary.knowledge',
  reactions: 'ossuary.reactions',
  weaves: 'ossuary.weaves',
  bestiary: 'ossuary.bestiary',
  recipes: 'ossuary.recipes',
} as const;
export type SlotKey = keyof typeof LEGACY_KEYS;
export const SLOT_KEYS = Object.keys(LEGACY_KEYS) as SlotKey[];

/** One run as the save remembers it (the echoes stand from these). */
export interface RunRecord {
  seed: string;
  won: boolean;
  /** The deepest floor reached (1-based), the room it ended in (its type and template), what struck the mage last. */
  floor: number;
  room: string;
  template: string;
  struck: string | null;
  /** The artifacts carried (the focus first), the level reached, and what it brought home. */
  carried: string[];
  level: number;
  dust: number;
  obols: number;
  /** The bosses it put to rest (the townspeople speak of them). */ felled: string[];
}
export interface VigilSave {
  v: number;
  /** The five modules' own records, as they kept them in their keys (magic/memory.ts, actors/bestiary.ts, items/alchemyMemory.ts). */
  knowledge: Record<string, unknown>;
  reactions: string[];
  weaves: string[];
  bestiary: Record<string, unknown>;
  recipes: { pairs: Record<string, string>; potions: string[] };
  dust: number;
  obols: number;
  runs: number;
  wins: number;
  deepest: number;
  /** The last runs, newest first. */
  echoes: RunRecord[];
  /** Every artifact ever found. */
  found: string[];
  /** The Vigil itself, filled in by the steps to come: the shades freed and bound, the bonds, quests and flags; the parts
      opened and the candle lit; the sigils owned and placed; the powers. */
  freed: string[];
  bound: string[];
  bonds: Record<string, number>;
  flags: Record<string, string | number | boolean>;
  parts: string[];
  candle: boolean;
  sigils: { owned: string[]; placed: string[] };
  powers: string[];
  /** The two spells the mage holds at the Vigil (Q and E), chosen at its lectern. */ slots: (string | null)[];
  /** The townspeople's lines heard (a line's id, or `id@subject` for one that tells of something), each with
      when it was heard (a count: the higher, the later). */ heard: Record<string, number>;
  /** The townsperson whose candle burns in the chapel for the next descent (its blessing), and the reagent the
      garden of the dead gives every descent (the embalmer's). */ blessing: string | null;
  garden: string | null;
}

export function blankSave(): VigilSave {
  return {
    v: SAVE_VERSION,
    knowledge: {},
    reactions: [],
    weaves: [],
    bestiary: {},
    recipes: { pairs: {}, potions: [] },
    dust: 0,
    obols: 0,
    runs: 0,
    wins: 0,
    deepest: 0,
    echoes: [],
    found: [],
    freed: [],
    bound: [],
    bonds: {},
    flags: {},
    parts: [],
    candle: false,
    sigils: { owned: [], placed: [] },
    powers: [],
    slots: [null, null],
    heard: {},
    blessing: null,
    garden: null,
  };
}

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
function runOf(v: unknown): RunRecord | null {
  const r = obj(v);
  if (typeof r.seed !== 'string') return null;
  return {
    seed: r.seed,
    won: !!r.won,
    floor: num(r.floor),
    room: str(r.room),
    template: str(r.template),
    struck: typeof r.struck === 'string' ? r.struck : null,
    carried: strs(r.carried),
    level: num(r.level) || 1,
    dust: num(r.dust),
    obols: num(r.obols),
    felled: strs(r.felled),
  };
}

/** A save made whole: whatever was stored under `ossuary.vigil` (anything, or nothing), or, when there was none, the five
    keys kept before it (`legacy`: each key's stored value, parsed). Anything missing or malformed takes its blank value;
    a save from a later version is read as far as it goes. */
export function migrate(raw: unknown, legacy: Partial<Record<SlotKey, unknown>> = {}): VigilSave {
  const s = blankSave(),
    r = obj(raw),
    had = raw !== null && raw !== undefined && Object.keys(r).length > 0;
  const src = (k: SlotKey) => (had ? r[k] : legacy[k]);
  s.knowledge = obj(src('knowledge'));
  s.reactions = strs(src('reactions'));
  s.weaves = strs(src('weaves'));
  s.bestiary = obj(src('bestiary'));
  const rec = obj(src('recipes'));
  s.recipes = {
    pairs: Object.fromEntries(Object.entries(obj(rec.pairs)).filter(([, p]) => typeof p === 'string')) as Record<
      string,
      string
    >,
    potions: strs(rec.potions),
  };
  if (!had) return s;
  s.dust = num(r.dust);
  s.obols = num(r.obols);
  s.runs = num(r.runs);
  s.wins = num(r.wins);
  s.deepest = num(r.deepest);
  s.echoes = (Array.isArray(r.echoes) ? r.echoes : []).map(runOf).filter((x): x is RunRecord => !!x);
  s.found = strs(r.found);
  s.freed = strs(r.freed);
  s.bound = strs(r.bound);
  s.parts = strs(r.parts);
  s.powers = strs(r.powers);
  s.bonds = Object.fromEntries(Object.entries(obj(r.bonds)).filter(([, v]) => typeof v === 'number')) as Record<
    string,
    number
  >;
  s.flags = Object.fromEntries(
    Object.entries(obj(r.flags)).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v)),
  ) as VigilSave['flags'];
  s.candle = !!r.candle;
  const sg = obj(r.sigils);
  s.sigils = { owned: strs(sg.owned), placed: strs(sg.placed) };
  const sl = Array.isArray(r.slots) ? r.slots : [];
  s.slots = [0, 1].map((i) => (typeof sl[i] === 'string' ? sl[i] : null));
  s.heard = Object.fromEntries(Object.entries(obj(r.heard)).filter(([, v]) => typeof v === 'number')) as Record<
    string,
    number
  >;
  s.blessing = typeof r.blessing === 'string' ? r.blessing : null;
  s.garden = typeof r.garden === 'string' ? r.garden : null;
  return s;
}

/** What is wrong with a save, if anything (an import is refused on any). */
export function validate(s: unknown): string[] {
  const errs: string[] = [],
    r = obj(s);
  if (!Object.keys(r).length) return ['not a save of the Vigil'];
  if (typeof r.v !== 'number' || r.v < 1) errs.push('no version');
  for (const k of ['dust', 'obols', 'runs', 'wins', 'deepest'] as const)
    if (r[k] !== undefined && !(typeof r[k] === 'number' && r[k] >= 0)) errs.push(`${k} is not a count`);
  for (const k of ['reactions', 'weaves', 'found', 'freed', 'bound', 'parts', 'powers', 'echoes'] as const)
    if (r[k] !== undefined && !Array.isArray(r[k])) errs.push(`${k} is not a list`);
  if (typeof r.wins === 'number' && typeof r.runs === 'number' && r.wins > r.runs) errs.push('more wins than runs');
  return errs;
}

/** What a run did that pays in Dust. */
export interface RunTally {
  floor: number;
  bosses: number;
  kaelith: boolean;
  firsts: number;
  freed: number;
  vows: number;
  echoes: number;
}
export type DustSource = 'floor' | 'bosses' | 'kaelith' | 'firsts' | 'freed' | 'echoes' | 'vows';
export interface DustTuning {
  floor: number;
  boss: number;
  kaelith: number;
  first: number;
  shade: number;
  vow: number;
  vowFloor: number;
  echo: number;
}
/** The Dust a run brings home, a line for each source that paid (the end screen's tally): the deepest floor reached, the
    bosses put to rest (Kaelith apart), the first finds, the shades freed, the echoes laid to rest, and then the vows kept,
    each a share of all the rest, paid only if the run went deep enough. */
export function dustFor(
  t: RunTally,
  c: DustTuning,
): { total: number; lines: { source: DustSource; count: number; dust: number }[] } {
  const lines: { source: DustSource; count: number; dust: number }[] = [];
  const add = (source: DustSource, count: number, dust: number) => {
    if (count > 0 && dust > 0) lines.push({ source, count, dust: Math.round(dust) });
  };
  add('floor', t.floor, t.floor * c.floor);
  add('bosses', t.bosses, t.bosses * c.boss);
  add('kaelith', t.kaelith ? 1 : 0, c.kaelith);
  add('firsts', t.firsts, t.firsts * c.first);
  add('freed', t.freed, t.freed * c.shade);
  add('echoes', t.echoes, t.echoes * c.echo);
  const base = lines.reduce((a, l) => a + l.dust, 0);
  if (t.floor >= c.vowFloor) add('vows', t.vows, base * c.vow * t.vows);
  return { total: lines.reduce((a, l) => a + l.dust, 0), lines };
}

/** The obols that come home: all of them after a win, a share (rounded down) after a death. */
export const obolsHome = (carried: number, won: boolean, afterDeath: number) =>
  won ? Math.max(0, carried) : Math.floor(Math.max(0, carried) * afterDeath);
