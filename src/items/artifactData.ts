/* Artifacts as data: definitions from data/artifacts.json, how a set of them combines into the mage's stats,
   and how sources pick one. Pure (no three.js), shared by the game and the unit tests.

   Combining rule (GDD, Artifacts): the focus sets the cantrip's pattern (how many bolts, which path);
   passive and cursed artifacts add modifiers. Everything combines automatically, with no pairings.
   A cursed artifact's gift is its stats and effects, its price the `curse`; cleansed at a shrine, the price
   goes and the gift is halved (GDD: Shrine cleansing). */
import artifactsData from '../../data/artifacts.json';
import type { Rng } from '../rng';

export type Pool = 'treasure' | 'ordeal' | 'boss' | 'altar' | 'drop' | 'merchant' | 'secret' | 'vault';
export type ArtifactKind = 'focus' | 'passive' | 'cursed';
/** Behaviours implemented in code, switched on by artifacts. */
export type Effect = 'pitWalker' | 'fullHeal' | 'deathBurst' | 'hurtRing' | 'rockBreaker' | 'vision'
  | 'crit' | 'split' | 'leech' | 'moth' | 'orbital' | 'unhurtHeal' | 'bloodTithe';
/** Additive unless the name ends in Mul (multiplied). */
export type StatKey = 'damage' | 'damageMul' | 'fireDelayMul' | 'speed' | 'speedMul' | 'boltScale' | 'hearts' | 'invuln' | 'pierce'
  | 'shotSpeedMul' | 'rangeMul' | 'knockbackMul';
export type BoltPath = 'straight' | 'bounce' | 'boomerang' | 'wave';

export interface FocusPattern {
  /** Bolts per cast, side by side. */ count: number;
  /** Distance between side-by-side bolts. */ spread: number;
  /** Angle between bolts fanning out (radians); 0 keeps them side by side. */ fan: number;
  damageMul: number; rangeMul: number; path: BoltPath;
  /** Wall bounces for the bounce path. */ bounces: number;
}
/** A cursed artifact's price, and what it says of itself once cleansed. */
export interface Curse { stats?: Partial<Record<StatKey, number>>; effects?: Effect[]; cleansed: string }
export interface ArtifactDef {
  id: string; name: string; kind: ArtifactKind; text: string; pools: Pool[];
  stats?: Partial<Record<StatKey, number>>; effects?: Effect[]; boltColor?: string;
  /** Cursed artifacts only: the price on top of the gift. */ curse?: Curse;
  focus?: Partial<FocusPattern>; start?: boolean;
  /** Pedestal gem and HUD icon colour; icon key for the HUD. */ color: string; icon: string;
}

export const POOLS: Pool[] = ['treasure', 'ordeal', 'boss', 'altar', 'drop', 'merchant', 'secret', 'vault'];
const EFFECTS: Effect[] = ['pitWalker', 'fullHeal', 'deathBurst', 'hurtRing', 'rockBreaker', 'vision', 'crit', 'split', 'leech', 'moth', 'orbital', 'unhurtHeal', 'bloodTithe'];
const STAT_KEYS: StatKey[] = ['damage', 'damageMul', 'fireDelayMul', 'speed', 'speedMul', 'boltScale', 'hearts', 'invuln', 'pierce', 'shotSpeedMul', 'rangeMul', 'knockbackMul'];
const PATHS: BoltPath[] = ['straight', 'bounce', 'boomerang', 'wave'];

export const ARTIFACT_DEFS = artifactsData as ArtifactDef[];
export const ARTIFACTS = new Map(ARTIFACT_DEFS.map(a => [a.id, a]));
export const START_FOCUS = ARTIFACT_DEFS.find(a => a.start)?.id ?? 'apprentice_wand';

export function artifact(id: string) {
  const def = ARTIFACTS.get(id);
  if (!def) throw new Error(`unknown artifact "${id}"`);
  return def;
}

export function focusPattern(def: ArtifactDef): FocusPattern {
  const f = def.focus ?? {};
  return { count: f.count ?? 1, spread: f.spread ?? .34, fan: f.fan ?? 0, damageMul: f.damageMul ?? 1, rangeMul: f.rangeMul ?? 1, path: f.path ?? 'straight', bounces: f.bounces ?? 0 };
}

export interface BaseStats { damage: number; fireDelay: number; speed: number; shotSpeed: number; range: number; hearts: number; invuln: number }
export interface Stats {
  damage: number; fireDelay: number; speed: number; shotSpeed: number; range: number;
  boltScale: number; boltColor: number; pierce: number;
  /** How hard bolts knock foes back, as a multiple. */ knockback: number;
  /** Heart containers, counted in halves like hp. */ maxHp: number;
  invuln: number; pattern: FocusPattern; effects: Set<Effect>;
}
export const DEFAULT_BOLT_COLOR = 0xffcf7a;

/** Half a gift: half the bonus of an added stat, half the way to 1 of a multiplied one. */
export const halveStat = (k: StatKey, v: number) => k.endsWith('Mul') ? 1 + (v - 1) / 2 : v / 2;

/** The mage's stats for a focus plus the other artifacts held (in pickup order); cursed artifacts in
    `cleansed` have lost their price and half their gift. */
export function computeStats(focusId: string, itemIds: readonly string[], base: BaseStats, cleansed: readonly string[] = []): Stats {
  const focus = artifact(focusId); const pattern = focusPattern(focus);
  const add: Record<StatKey, number> = { damage: 0, damageMul: 1, fireDelayMul: 1, speed: 0, speedMul: 1, boltScale: 0, hearts: 0, invuln: 0, pierce: 0, shotSpeedMul: 1, rangeMul: 1, knockbackMul: 1 };
  const effects = new Set<Effect>(); let boltColor = DEFAULT_BOLT_COLOR;
  for (const id of [focusId, ...itemIds]) {
    const def = artifact(id), clean = !!def.curse && cleansed.includes(id);
    const apply = (stats: Partial<Record<StatKey, number>> = {}, halve = false) => {
      for (const [k, raw] of Object.entries(stats) as [StatKey, number][]) {
        const v = halve ? halveStat(k, raw) : raw;
        if (k.endsWith('Mul')) add[k] *= v; else add[k] += v;
      }
    };
    apply(def.stats, clean);
    for (const e of def.effects ?? []) effects.add(e);
    if (def.curse && !clean) { apply(def.curse.stats); for (const e of def.curse.effects ?? []) effects.add(e); }
    if (def.boltColor) boltColor = parseInt(def.boltColor.slice(1), 16);
  }
  return {
    damage: (base.damage + add.damage) * add.damageMul * pattern.damageMul,
    fireDelay: Math.max(.08, base.fireDelay * add.fireDelayMul),
    speed: (base.speed + add.speed) * add.speedMul,
    shotSpeed: base.shotSpeed * add.shotSpeedMul,
    range: base.range * pattern.rangeMul * add.rangeMul,
    boltScale: 1 + add.boltScale, boltColor, pierce: add.pierce, knockback: add.knockbackMul,
    maxHp: Math.max(1, base.hearts + add.hearts) * 2,
    invuln: base.invuln + add.invuln,
    pattern, effects,
  };
}

/** An artifact for a source: unseen this run and in the source's pool if possible, otherwise any unseen
    artifact (never the starting focus). Null when everything has been offered; the caller gives a heart. */
export function pickArtifact(rng: Rng, pool: Pool, seen: ReadonlySet<string>): ArtifactDef | null {
  const unseen = ARTIFACT_DEFS.filter(a => !a.start && !seen.has(a.id));
  const inPool = unseen.filter(a => a.pools.includes(pool));
  const list = inPool.length ? inPool : unseen;
  return list.length ? rng.pick(list) : null;
}

/** Problems in data/artifacts.json; empty when valid. */
export function validateArtifacts(defs: ArtifactDef[] = ARTIFACT_DEFS): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const a of defs) {
    const at = `artifact "${a.id}"`;
    if (ids.has(a.id)) errs.push(`${at} is listed twice`); ids.add(a.id);
    if (!a.name || !a.text) errs.push(`${at} needs a name and a text`);
    if (!['focus', 'passive', 'cursed'].includes(a.kind)) errs.push(`${at} has unknown kind "${a.kind}"`);
    for (const p of a.pools) if (!POOLS.includes(p)) errs.push(`${at} has unknown pool "${p}"`);
    for (const e of [...a.effects ?? [], ...a.curse?.effects ?? []]) if (!EFFECTS.includes(e)) errs.push(`${at} has unknown effect "${e}"`);
    for (const k of Object.keys({ ...a.stats, ...a.curse?.stats })) if (!STAT_KEYS.includes(k as StatKey)) errs.push(`${at} has unknown stat "${k}"`);
    if ((a.kind === 'cursed') !== !!a.curse) errs.push(`${at}: cursed artifacts, and only they, carry a curse`);
    if (a.curse && (!a.curse.cleansed || !(a.curse.effects?.length || Object.keys(a.curse.stats ?? {}).length))) errs.push(`${at}: a curse needs a price and a cleansed text`);
    if ((a.kind === 'focus') !== !!a.focus) errs.push(`${at}: foci, and only foci, have a focus pattern`);
    if (a.focus?.path && !PATHS.includes(a.focus.path)) errs.push(`${at} has unknown path "${a.focus.path}"`);
    if (!/^#[0-9a-f]{6}$/i.test(a.color) || (a.boltColor && !/^#[0-9a-f]{6}$/i.test(a.boltColor))) errs.push(`${at} has a bad colour`);
    if (!a.start && !a.pools.length) errs.push(`${at} is in no pool, so it can never appear`);
  }
  if (defs.filter(a => a.start).length !== 1) errs.push('exactly one artifact must be the starting focus');
  return errs;
}
