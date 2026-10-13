/* M6 step 2: spending a level's point on an attribute (the rules are attributes.ts). The points spent live in
   `G.run.attrs` and are lost with the run; `refreshStats` folds them in. A point spent rises over the mage in the
   attribute's colour; Will fills the mana it adds, Vigor's half container comes filled (as any container does). The
   level-up screen (step 4) spends them; until it comes, the dev menu and `__game.spend` do. */
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { floatText } from '../magic/statusFx';
import { refreshStats } from '../items/artifacts';
import { attrBonus, freePoints, type Attr } from './attributes';
import { boonRank } from './boons';
import { boonParams } from './boonData';

/** Each attribute's colour as it rises over the mage (and in the inventory). */
export const ATTR_COLOR: Record<Attr, number> = {
  vigor: 0xe0473a,
  arcana: 0xc8a0ff,
  will: 0x8fc0ff,
  swiftness: 0xb0e890,
};

/** Points the mage has to spend now. */
const pct = (v: number) => Math.round(v * 100);
/** What a point in `a` does, in words built from its tuning (`CFG.attributes`). */
export function attrText(a: Attr) {
  const A = CFG.attributes,
    T = STR.attrs;
  return a === 'vigor'
    ? T.vigor.text(A.vigor.pointsPerHalf)
    : a === 'arcana'
      ? T.arcana.text(pct(A.arcana.spell))
      : a === 'will'
        ? T.will.text(A.will.mana, pct(A.will.regen))
        : T.swiftness.text(pct(A.swiftness.speed), pct(A.swiftness.delay));
}
export const pointsToSpend = () =>
  freePoints(G.run.level, G.run.attrs, boonRank('tempered') * boonParams('tempered', 1).points); // (and Tempered's)
/** What the attributes give now (for `refreshStats`). */
export const bonusNow = () => attrBonus(G.run.attrs);

/** Spend a point on `attr`; `free` (the dev menu) adds one without a level's point. Whether it was spent. */
export function spendPoint(attr: Attr, free = false) {
  if (!free && pointsToSpend() <= 0) return false;
  G.run.attrs[attr]++;
  refreshStats(false);
  if (attr === 'will') player.mana = Math.min(player.stats.maxMana, player.mana + CFG.attributes.will.mana); // (the mana it adds comes full)
  floatText(player.x, 1.9, player.z, STR.attrs.spent(STR.attrs[attr].name), ATTR_COLOR[attr], 36);
  burst(player.x, 1, player.z, ATTR_COLOR[attr], 12, 1.4, 0.04);
  Sfx.attrUp();
  return true;
}
