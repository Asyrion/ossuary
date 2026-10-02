/* M6 RPG growth, step 2: the four attributes (docs/M6-plan.md; GDD: RPG progression), the pure rules (unit-tested). A
   level brings a point to spend on one of them. They stay deliberately plain and small, so that boons and runes make the
   build: Vigor (half a heart container every 2 points), Arcana (spell damage), Will (the GDD's Focus, renamed: "focus"
   names the artifacts held in the casting hand; more mana and its coming back) and Swiftness (moving and casting the
   cantrip faster). Each grows in a line with its points, never compounding; `computeStats` folds the bonus in after the
   artifacts. Tuning in `CFG.attributes`. */
import { CFG } from '../config';

export const ATTRS = ['vigor', 'arcana', 'will', 'swiftness'] as const;
export type Attr = (typeof ATTRS)[number];
export type Attrs = Record<Attr, number>;
export const noAttrs = (): Attrs => ({ vigor: 0, arcana: 0, will: 0, swiftness: 0 });
export const isAttr = (k: string): k is Attr => (ATTRS as readonly string[]).includes(k);

/** What the points give, in the terms `computeStats` folds in: half containers, mana, and multipliers. */
export interface AttrBonus { heartHalves: number; mana: number; regenMul: number; spellDamageMul: number; speedMul: number; fireDelayMul: number }
export const NO_BONUS: AttrBonus = { heartHalves: 0, mana: 0, regenMul: 1, spellDamageMul: 1, speedMul: 1, fireDelayMul: 1 };

export function attrBonus(a: Attrs, A = CFG.attributes): AttrBonus {
  return {
    heartHalves: Math.floor(a.vigor / A.vigor.pointsPerHalf),
    mana: a.will * A.will.mana, regenMul: 1 + a.will * A.will.regen,
    spellDamageMul: 1 + a.arcana * A.arcana.spell,
    speedMul: 1 + a.swiftness * A.swiftness.speed, fireDelayMul: Math.max(0, 1 - a.swiftness * A.swiftness.delay),
  };
}

/** Points spent so far. */
export const spentPoints = (a: Attrs) => ATTRS.reduce((s, k) => s + a[k], 0);
/** Points to spend: one for each level past the first, and `extra` (Tempered's, step 6), less those spent. */
export const freePoints = (level: number, a: Attrs, extra = 0) => Math.max(0, level - 1 + extra - spentPoints(a));
