/* Artifacts as data: definitions from data/artifacts.json, how a set of them combines into the mage's stats,
   and how sources pick one. Pure (no three.js), shared by the game and the unit tests.

   Combining rule (GDD, Artifacts): the focus sets the cantrip's pattern (how many bolts, which path);
   passive and cursed artifacts add modifiers. Everything combines automatically, with no pairings.
   A cursed artifact's gift is its stats and effects, its price the `curse`; cleansed at a shrine, the price
   goes and the gift is halved (GDD: Shrine cleansing). */
import artifactsData from '../../data/artifacts.json';
import type { Rng } from '../rng';
import type { Resource } from './loot';

export type Pool = 'treasure' | 'ordeal' | 'boss' | 'altar' | 'drop' | 'merchant' | 'secret' | 'vault';
export type ArtifactKind = 'focus' | 'passive' | 'cursed';
/** Behaviours implemented in code, switched on by artifacts. */
export type Effect = 'pitWalker' | 'fullHeal' | 'deathBurst' | 'hurtRing' | 'rockBreaker' | 'vision'
  | 'crit' | 'split' | 'leech' | 'moth' | 'orbital' | 'unhurtHeal' | 'bloodTithe'
  | 'freeVault' | 'ferryman' | 'glyphWard' | 'graveLantern' | 'pedlar'
  | 'emberBolts' | 'vigil' | 'frostbite' | 'stormglass' | 'thurible' | 'witchKnot' | 'noRegen';
/** Additive unless the name ends in Mul (multiplied). `obolDamage` is cantrip damage per ten obols held;
    `spellDamageMul` multiplies what spells do; `killMana` is mana back for every foe put to rest. */
export type StatKey = 'damage' | 'damageMul' | 'fireDelayMul' | 'speed' | 'speedMul' | 'boltScale' | 'hearts' | 'invuln' | 'pierce'
  | 'shotSpeedMul' | 'rangeMul' | 'knockbackMul' | 'obolDamage' | 'blastMul' | 'mana' | 'spellDamageMul' | 'killMana';
export type BoltPath = 'straight' | 'bounce' | 'boomerang' | 'wave' | 'homing';

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
  /** A few lines of lore for the card shown when it's taken (ui/lore.ts). */ lore: string;
  stats?: Partial<Record<StatKey, number>>; effects?: Effect[]; boltColor?: string;
  /** Cursed artifacts only: the price on top of the gift. */ curse?: Curse;
  /** Obols, keys or glyphs handed over once, when the artifact is taken. */ gives?: Partial<Record<Resource, number>>;
  focus?: Partial<FocusPattern>; start?: boolean;
  /** Pedestal gem and HUD icon colour; icon key for the HUD. */ color: string; icon: string;
}

export const POOLS: Pool[] = ['treasure', 'ordeal', 'boss', 'altar', 'drop', 'merchant', 'secret', 'vault'];
const EFFECTS: Effect[] = ['pitWalker', 'fullHeal', 'deathBurst', 'hurtRing', 'rockBreaker', 'vision', 'crit', 'split', 'leech', 'moth', 'orbital', 'unhurtHeal', 'bloodTithe',
  'freeVault', 'ferryman', 'glyphWard', 'graveLantern', 'pedlar', 'emberBolts', 'vigil', 'frostbite', 'stormglass', 'thurible', 'witchKnot', 'noRegen'];
const STAT_KEYS: StatKey[] = ['damage', 'damageMul', 'fireDelayMul', 'speed', 'speedMul', 'boltScale', 'hearts', 'invuln', 'pierce', 'shotSpeedMul', 'rangeMul', 'knockbackMul', 'obolDamage', 'blastMul', 'mana', 'spellDamageMul', 'killMana'];
const RESOURCE_KEYS: Resource[] = ['coins', 'keys', 'glyphs'];
const PATHS: BoltPath[] = ['straight', 'bounce', 'boomerang', 'wave', 'homing'];

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

export interface BaseStats { damage: number; fireDelay: number; speed: number; shotSpeed: number; range: number; hearts: number; invuln: number; mana: number }
export interface Stats {
  damage: number; fireDelay: number; speed: number; shotSpeed: number; range: number;
  boltScale: number; boltColor: number; pierce: number;
  /** How hard bolts knock foes back, as a multiple. */ knockback: number;
  /** Cantrip damage per ten obols held (Miser's Purse), and how far the bolts have turned gold (0 to 1). */ obolDamage: number; gilt: number;
  /** How far glyph blasts reach, as a multiple. */ blastMul: number;
  /** Heart containers, counted in halves like hp. */ maxHp: number;
  /** The most mana the mage can hold. */ maxMana: number;
  /** What spells do, as a multiple; mana back for every foe put to rest. */ spellDamage: number; killMana: number;
  invuln: number; pattern: FocusPattern; effects: Set<Effect>;
}
export const DEFAULT_BOLT_COLOR = 0xffcf7a;
/** The gold that the Miser's Purse turns the bolts, a fifth of the way for every ten obols held. */
export const GILT_COLOR = 0xffd24a, GILT_PER_TEN = .2;

/** Blend two 0xRRGGBB colours, `k` of the way from a to b. */
function mix(a: number, b: number, k: number) {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k) << s;
  return ch(16) | ch(8) | ch(0);
}

/** Half a gift: half the bonus of an added stat, half the way to 1 of a multiplied one. */
export const halveStat = (k: StatKey, v: number) => k.endsWith('Mul') ? 1 + (v - 1) / 2 : v / 2;

/** The mage's stats for a focus plus the other artifacts held (in pickup order); cursed artifacts in
    `cleansed` have lost their price and half their gift. `coins` (obols held) matters to the Miser's Purse. */
export function computeStats(focusId: string, itemIds: readonly string[], base: BaseStats, cleansed: readonly string[] = [], coins = 0): Stats {
  const focus = artifact(focusId); const pattern = focusPattern(focus);
  const add: Record<StatKey, number> = { damage: 0, damageMul: 1, fireDelayMul: 1, speed: 0, speedMul: 1, boltScale: 0, hearts: 0, invuln: 0, pierce: 0, shotSpeedMul: 1, rangeMul: 1, knockbackMul: 1, obolDamage: 0, blastMul: 1, mana: 0, spellDamageMul: 1, killMana: 0 };
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
  // the Miser's Purse: harder bolts, turning gold, for every ten obols held
  const tens = Math.floor(coins / 10), gilt = add.obolDamage > 0 ? Math.min(1, tens * GILT_PER_TEN) : 0;
  if (gilt) boltColor = mix(boltColor, GILT_COLOR, gilt);
  return {
    damage: (base.damage + add.damage + add.obolDamage * tens) * add.damageMul * pattern.damageMul,
    fireDelay: Math.max(.08, base.fireDelay * add.fireDelayMul),
    speed: (base.speed + add.speed) * add.speedMul,
    shotSpeed: base.shotSpeed * add.shotSpeedMul,
    range: base.range * pattern.rangeMul * add.rangeMul,
    boltScale: 1 + add.boltScale, boltColor, pierce: add.pierce, knockback: add.knockbackMul,
    obolDamage: add.obolDamage, gilt, blastMul: add.blastMul,
    maxHp: Math.max(1, base.hearts + add.hearts) * 2,
    maxMana: Math.max(0, base.mana + add.mana),
    spellDamage: add.spellDamageMul, killMana: add.killMana,
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
    if (!(a.lore?.length >= 60 && a.lore.length <= 260)) errs.push(`${at} needs lore of 60 to 260 characters`);
    if (!['focus', 'passive', 'cursed'].includes(a.kind)) errs.push(`${at} has unknown kind "${a.kind}"`);
    for (const p of a.pools) if (!POOLS.includes(p)) errs.push(`${at} has unknown pool "${p}"`);
    for (const e of [...a.effects ?? [], ...a.curse?.effects ?? []]) if (!EFFECTS.includes(e)) errs.push(`${at} has unknown effect "${e}"`);
    for (const k of Object.keys({ ...a.stats, ...a.curse?.stats })) if (!STAT_KEYS.includes(k as StatKey)) errs.push(`${at} has unknown stat "${k}"`);
    for (const [k, v] of Object.entries(a.gives ?? {})) if (!RESOURCE_KEYS.includes(k as Resource) || !(Number.isInteger(v) && v > 0)) errs.push(`${at} gives "${k}": use obols, keys or glyphs, a whole number above 0`);
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
