/* Alchemy as data (M5, docs/archive/M5-plan.md; GDD: Potions and alchemy): data/alchemy.json read and checked here. Pure (no
   three.js), shared by the game and the unit tests. Potions with a drink effect on the mage and a throw effect on the
   room, the reagents they are brewed from, the recipes, where reagents come from, and the bottles a run shuffles. Each
   effect is a function in items/potions.ts; everything else is data. */
import alchemyData from '../../data/alchemy.json';
import { Rng } from '../rng';
import { SCHOOLS, type School } from '../magic/spellData';

/** What a potion does drunk (items/potions.ts, `DRINK`). */
export type DrinkEffect =
  | 'heal'
  | 'mana'
  | 'emberCantrip'
  | 'frostWard'
  | 'freeSpells'
  | 'echoSpell'
  | 'giant'
  | 'unseen'
  | 'remedy'
  | 'random'
  | 'reversed'
  | 'graveSip';
/** What a potion does thrown (items/potions.ts, `THROW`). */
export type ThrowEffect =
  | 'healSplash'
  | 'daze'
  | 'firePool'
  | 'freezeSplash'
  | 'stormSplash'
  | 'echoSplash'
  | 'giantSplash'
  | 'darkSplash'
  | 'cleanseSplash'
  | 'explode'
  | 'hexSplash'
  | 'raiseThrall';
/** The params each effect reads; a potion with that effect must give them all. */
export const DRINK_PARAMS: Record<DrinkEffect, string[]> = {
  heal: ['halves'],
  mana: ['amount'],
  emberCantrip: ['seconds'],
  frostWard: ['seconds', 'speed'],
  freeSpells: ['casts'],
  echoSpell: [],
  giant: ['damage', 'speed', 'scale'],
  unseen: ['seconds'],
  remedy: [],
  random: [],
  reversed: ['seconds'],
  graveSip: ['halves', 'insight'],
};
export const THROW_PARAMS: Record<ThrowEffect, string[]> = {
  healSplash: ['halves'],
  daze: ['seconds'],
  firePool: ['seconds', 'burn'],
  freezeSplash: ['seconds', 'chill'],
  stormSplash: ['seconds', 'every', 'damage'],
  echoSplash: [],
  giantSplash: ['speed', 'scale'],
  darkSplash: ['seconds'],
  cleanseSplash: [],
  explode: [],
  hexSplash: ['stacks'],
  raiseThrall: [],
};

export type PotionId =
  | 'healing'
  | 'mana'
  | 'liquidEmber'
  | 'frostbrew'
  | 'bottledStorm'
  | 'echoes'
  | 'giants'
  | 'shadowstep'
  | 'bitterRemedy'
  | 'volatile'
  | 'hexBrew'
  | 'graveDraught';
export type ReagentId =
  'graveMoss' | 'wispEssence' | 'boneDust' | 'emberSalt' | 'rimewater' | 'bloomPetal' | 'wardensAsh';
type Params = Record<string, number | string | undefined>;
export interface PotionDef {
  id: PotionId;
  name: string;
  /** The potion's own colour (its splash and its card; its bottle's is shuffled each run). */ color: string;
  /** How often it is found, against the others. */ weight: number;
  /** Rare: brewed with Warden's Ash (and found less). Bad: worse drunk than thrown. */ rare?: boolean;
  bad?: boolean;
  drink: Params & { effect: DrinkEffect };
  throw: Params & { effect: ThrowEffect; school?: School };
  text: { drink: string; throw: string };
  lore: string;
}
export interface ReagentDef {
  id: ReagentId;
  name: string;
  color: string;
  leans: string;
  lore: string;
  rare?: boolean;
}
export interface Recipe {
  of: [ReagentId, ReagentId];
  makes: PotionId;
}

const D = alchemyData as unknown as {
  potions: Record<string, Omit<PotionDef, 'id'>>;
  reagents: Record<string, Omit<ReagentDef, 'id'>>;
  recipes: Recipe[];
  sources: {
    schools: Record<string, string>;
    foes: Record<string, string>;
    objects: Record<string, string>;
    boss: string;
  };
  bottles: { shapes: string[]; liquids: string[] };
};
export const POTIONS = Object.fromEntries(Object.entries(D.potions).map(([id, p]) => [id, { id, ...p }])) as Record<
  PotionId,
  PotionDef
>;
export const POTION_IDS = Object.keys(POTIONS) as PotionId[];
export const REAGENTS = Object.fromEntries(Object.entries(D.reagents).map(([id, r]) => [id, { id, ...r }])) as Record<
  ReagentId,
  ReagentDef
>;
export const REAGENT_IDS = Object.keys(REAGENTS) as ReagentId[];
/** The reagents a shop or a dealt drop may be: all but the rare (Warden's Ash, which only bosses leave). */
export const COMMON_REAGENTS = REAGENT_IDS.filter((r) => !REAGENTS[r].rare);
export const RECIPES: readonly Recipe[] = D.recipes;
export const BOTTLE_SHAPES = D.bottles.shapes;
export const isPotion = (id: string): id is PotionId => id in POTIONS;
export const isReagent = (id: string): id is ReagentId => id in REAGENTS;

/** Everything wrong with the alchemy data (empty when it is all right): unknown effects or reagents, missing params, a
    pair with two recipes, a potion (but Volatile Mixture, what fails) with no recipe, sources naming no reagent, too few
    bottles for the potions. */
export function validateAlchemy(d = D): string[] {
  const errs: string[] = [];
  const potions = Object.keys(d.potions),
    reagents = Object.keys(d.reagents);
  for (const [id, p] of Object.entries(d.potions)) {
    const at = `potion ${id}`;
    if (!p.name || !p.lore || !p.text?.drink || !p.text?.throw) errs.push(`${at}: a name, both texts and lore`);
    if (!/^#[0-9a-f]{6}$/i.test(p.color)) errs.push(`${at}: colour ${p.color}`);
    if (!(p.weight > 0)) errs.push(`${at}: weight`);
    const dp = DRINK_PARAMS[p.drink?.effect],
      tp = THROW_PARAMS[p.throw?.effect];
    if (!dp) errs.push(`${at}: drink effect ${p.drink?.effect}`);
    else for (const k of dp) if (p.drink[k] === undefined) errs.push(`${at}: drink needs ${k}`);
    if (!tp) errs.push(`${at}: throw effect ${p.throw?.effect}`);
    else for (const k of tp) if (p.throw[k] === undefined) errs.push(`${at}: throw needs ${k}`);
    if (p.throw?.school && !SCHOOLS.includes(p.throw.school)) errs.push(`${at}: school ${p.throw.school}`);
  }
  for (const [id, r] of Object.entries(d.reagents))
    if (!r.name || !r.lore || !r.leans || !/^#[0-9a-f]{6}$/i.test(r.color))
      errs.push(`reagent ${id}: name, colour, leans and lore`);
  const pairs = new Set<string>();
  for (const r of d.recipes) {
    if (r.of.length !== 2 || r.of.some((x) => !reagents.includes(x)))
      errs.push(`recipe ${r.of.join(' + ')}: two reagents`);
    if (!potions.includes(r.makes)) errs.push(`recipe ${r.of.join(' + ')}: makes ${r.makes}`);
    const k = pairKey(r.of[0], r.of[1]);
    if (pairs.has(k)) errs.push(`recipe ${r.of.join(' + ')}: a second recipe for the pair`);
    pairs.add(k);
  }
  for (const id of potions)
    if (id !== 'volatile' && !d.recipes.some((r) => r.makes === id)) errs.push(`potion ${id}: no recipe`);
  for (const [k, v] of [
    ...Object.entries(d.sources.schools),
    ...Object.entries(d.sources.foes),
    ...Object.entries(d.sources.objects),
    ['boss', d.sources.boss],
  ])
    if (!reagents.includes(v)) errs.push(`source ${k}: ${v} is no reagent`);
  if (d.bottles.liquids.length < potions.length) errs.push('too few liquid colours: each potion has its own');
  if (d.bottles.liquids.some((c) => !/^#[0-9a-f]{6}$/i.test(c))) errs.push('bottle liquid colours');
  return errs;
}

/** A pair of reagents, the order not counted. */
export const pairKey = (a: string, b: string) => (a < b ? `${a}+${b}` : `${b}+${a}`);
/** The recipe for a pair of reagents, if there is one. */
export const recipeFor = (a: ReagentId, b: ReagentId) =>
  RECIPES.find((r) => pairKey(r.of[0], r.of[1]) === pairKey(a, b));
/** What two reagents brew: their recipe's potion, or a Volatile Mixture when the pair has none (an experiment that
    failed). `recipe` says whether there was one. */
export function brew(a: ReagentId, b: ReagentId): { potion: PotionId; recipe: boolean } {
  const r = recipeFor(a, b);
  return r ? { potion: r.makes, recipe: true } : { potion: 'volatile', recipe: false };
}

/** A run's bottles: each potion a shape and a liquid colour, no two of them the same colour, the shapes dealt as evenly as
    they go (twelve potions over six shapes: two of each), shuffled on the run's seed (so the same seed deals the same
    bottles, as Isaac's pills). */
export interface Bottle {
  shape: string;
  liquid: string;
}
export function bottlesFor(seed: number): Record<PotionId, Bottle> {
  const rng = new Rng(seed ^ 0xb077e5),
    n = POTION_IDS.length;
  const shuffle = <T>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const liquids = shuffle(D.bottles.liquids.slice()).slice(0, n);
  const shapes = shuffle(Array.from({ length: n }, (_, i) => BOTTLE_SHAPES[i % BOTTLE_SHAPES.length]));
  const order = shuffle(POTION_IDS.slice());
  return Object.fromEntries(order.map((id, i) => [id, { shape: shapes[i], liquid: liquids[i] }])) as Record<
    PotionId,
    Bottle
  >;
}

/** Whether a potion shows what it is: identified this run (drunk, thrown, at a table), or ever brewed (kept between runs). */
export const isKnown = (
  id: PotionId,
  run: ReadonlySet<string> | readonly string[],
  brewed: ReadonlySet<string> | readonly string[],
) =>
  (Array.isArray(run) ? run.includes(id) : (run as ReadonlySet<string>).has(id)) ||
  (Array.isArray(brewed) ? brewed.includes(id) : (brewed as ReadonlySet<string>).has(id));

/** The reagent a fallen foe leaves (its own, else its school's; a boss's is Warden's Ash), or a broken object (null when
    it has none). */
export function reagentFor(src: {
  foe?: string;
  school?: School | null;
  boss?: boolean;
  object?: string;
}): ReagentId | null {
  if (src.boss) return D.sources.boss as ReagentId;
  if (src.object) return (D.sources.objects[src.object] as ReagentId) ?? null;
  if (src.foe && D.sources.foes[src.foe]) return D.sources.foes[src.foe] as ReagentId;
  return src.school ? ((D.sources.schools[src.school] as ReagentId) ?? null) : null;
}

/** A potion found (a drop, a chest): weighted, rare ones as their weight says. */
export function pickPotion(rng: { next(): number }, ids: readonly PotionId[] = POTION_IDS): PotionId {
  const total = ids.reduce((s, id) => s + POTIONS[id].weight, 0);
  let r = rng.next() * total;
  for (const id of ids) {
    r -= POTIONS[id].weight;
    if (r < 0) return id;
  }
  return ids[ids.length - 1];
}
