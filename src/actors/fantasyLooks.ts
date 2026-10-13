/* M4.12 Fantasy foes (docs/archive/M4.12-plan.md; the owner's ask, 2026-10-02): the cute looks and the plain animals redone as
   creatures of fantasy, each fight unchanged. A look is kept here by the look it replaces (a foe's `look` or its id), and
   every foe that has one wears it (`buildFoe`): the owner approved them all. A look keeps the parts its foe's behaviour
   moves, by name (`parts`). */
import type { Built } from './beastParts';
import { FLOOR1_LOOKS } from './fantasyFloor1';
import { FLOOR2_LOOKS } from './fantasyFloor2';
import { FLOOR3_LOOKS } from './fantasyFloor3';
import { FLOOR4_LOOKS } from './fantasyFloor4';
import { FLOOR5_LOOKS } from './fantasyFloor5';
import { WARDLING_LOOKS } from './fantasyWardlings';

/** The fantasy looks, by the look id they replace. */
export const FANTASY_LOOKS: Partial<Record<string, () => Built>> = {
  ...FLOOR1_LOOKS,
  ...FLOOR2_LOOKS,
  ...FLOOR3_LOOKS,
  ...FLOOR4_LOOKS,
  ...FLOOR5_LOOKS,
  ...WARDLING_LOOKS,
};
