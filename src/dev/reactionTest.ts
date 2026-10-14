/* The dev menu's "Reactions here" and `__game.reaction(r)`: each reaction set off on training dummies ahead of the
   mage, by laying its two statuses on in turn (a freeze takes its stacks first; Verdict and Void Spark want more than
   one foe, to show the lightning and the leaps). */
import type { Reaction } from '../magic/status';
import type { SpellStatus } from '../magic/spellData';
import { MAGIC } from '../magic/status';
import { makeEnemy } from '../actors/enemies';
import { inflict } from '../magic/statusFx';

type Step = Partial<Record<SpellStatus, number>>;
const FREEZE: Step[] = Array.from({ length: MAGIC.chill.freezeAt }, () => ({ chill: 1 }));
/** What each reaction needs: how many dummies, what all of them carry first, and what the first is then given. */
export const RECIPES: Record<Reaction, { dummies?: number; all?: Step; steps: Step[] }> = {
  shatter: { steps: [...FREEZE, { shock: 1 }] },
  overload: { steps: [{ burn: 4 }, { shock: 1 }] },
  eclipse: { steps: [{ sanct: 3 }, { hex: 1 }] },
  blackfire: { steps: [{ hex: 1 }, { burn: 4 }] },
  steam: { steps: [{ chill: 1 }, { burn: 4 }] },
  searing: { steps: [{ sanct: 3 }, { burn: 4 }] },
  prism: { steps: [{ sanct: 3 }, ...FREEZE] },
  verdict: { dummies: 3, all: { sanct: 3 }, steps: [{ shock: 1 }] },
  blackice: { steps: [{ chill: 1 }, { hex: 1 }] },
  voidspark: { dummies: 3, steps: [{ hex: 1 }, { shock: 1 }] },
  // Verdant's five (Wildfire wants overgrown foes to run to; Blight, one to creep to)
  wildfire: { dummies: 3, all: { grow: 4 }, steps: [{ burn: 4 }] },
  frostbloom: { dummies: 2, steps: [{ grow: 4 }, { chill: 1 }] },
  pollenspark: { dummies: 2, steps: [{ grow: 4 }, { shock: 1 }] },
  bloom: { steps: [{ grow: 4 }, { sanct: 3 }] },
  blight: { dummies: 2, steps: [{ grow: 4 }, { hex: 1 }] },
};

/** Set `r` off at (x, z): its dummies stand in a row there, and the first is given the statuses that make it. */
export function setOffReaction(r: Reaction, x: number, z: number) {
  const R = RECIPES[r],
    n = R.dummies ?? 1;
  const dummies = Array.from({ length: n }, (_, i) => makeEnemy('dummy', x + (i - (n - 1) / 2) * 1.6, z));
  for (const d of dummies) d.spawn = 0; // (no rising out of the floor: the statuses land at once)
  if (R.all) for (const d of dummies) inflict(d, R.all);
  for (const s of R.steps) inflict(dummies[0], s);
  return dummies;
}
