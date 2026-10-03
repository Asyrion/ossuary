/* M6 RPG growth: insight (the GDD's XP) and levels, the pure rules (docs/M6-plan.md; unit-tested). Insight comes from
   foes put to rest (each a purse fixed when it is made: its health ÷ `foeDiv`, paid once as it falls), a room's first
   clear, a boss, a potion's kind first used in a run and the Grave Draught. Nothing that can be farmed pays: a nest's
   brood, a golem's stones, a boss's helpers and the dummies carry no purse of their own. Tuning in `CFG.levels`, each
   boss's in data/floors.json. The game side is progression/insight.ts. */
import { CFG, type EnemyType } from '../config';
import { FOES, isFoe } from '../actors/foeData';
import { FLOORS } from '../world/generate';

const L = CFG.levels;
/** The highest level a run reaches (12). */
export const LEVEL_CAP = L.at.length + 1;

/** The level `insight` reaches (1 to the cap), by the thresholds `at` (level 2 at `at[0]`, and on). */
export function levelFor(insight: number, at: readonly number[] = L.at) {
  let level = 1;
  for (const need of at) if (insight >= need) level++; else break;
  return level;
}
/** The level a run expects to start floor `floor` (0-based) at: what the floors before it give (`CFG.levels.floorInsight`,
    the measured medians), so a deeper start (`?level=auto`, the dev menu's new runs) begins on the curve (M6 step 12). */
export const levelAtFloor = (floor: number, perFloor: readonly number[] = L.floorInsight) =>
  levelFor(perFloor.slice(0, Math.max(0, floor)).reduce((a, b) => a + b, 0));
/** Where `insight` stands within its level: the level, the insight gained into it and the insight it spans (0 at the cap). */
export function levelProgress(insight: number, at: readonly number[] = L.at) {
  const level = levelFor(insight, at), from = level > 1 ? at[level - 2] : 0;
  if (level > at.length) return { level, into: 0, span: 0 };
  return { level, into: insight - from, span: at[level - 1] - from };
}
/** The insight that starts level `level` (1 to the cap). */
export const insightAt = (level: number, at: readonly number[] = L.at) => level <= 1 ? 0 : at[Math.min(level, at.length + 1) - 2];

/** A foe's purse: its health on its floor (× `hpMul`, ×2 a champion) ÷ `foeDiv`. A nest's counts its first brood (the
    wasps it lets out carry none, nor can more of them be farmed); the dummy carries none. */
export function purseOf(type: string, hpMul: number, champion = false) {
  if (type === 'dummy') return 0;
  const def = isFoe(type) ? FOES[type] : undefined, hp = def ? def.hp : CFG.enemy[type as EnemyType]?.hp ?? 0;
  const brood = def?.behaviour === 'nest' ? Number(def.params.brood ?? 0) * FOES.emberWasp.hp : 0;
  return ((hp * (champion ? CFG.champion.hpMul : 1)) + brood) * hpMul / L.foeDiv;
}
/** A room's first clear on floor `floor` (0-based): `perFloor` × the floor, an ordeal `ordealMul` times that. */
export const clearInsight = (floor: number, ordeal = false) => L.perFloor * (floor + 1) * (ordeal ? L.ordealMul : 1);
/** A potion's kind first used in a run, on floor `floor` (0-based). */
export const potionInsight = (floor: number) => L.perFloor * (floor + 1);
/** The floor's boss, falling (0-based). */
export const bossInsight = (floor: number) => FLOORS[Math.min(floor, FLOORS.length - 1)].boss.insight;
