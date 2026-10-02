/* M4.12 Fantasy foes (docs/M4.12-plan.md; the owner's ask, 2026-10-02): the cute looks and the plain animals redone as
   creatures of fantasy, each fight unchanged. A new look is kept here by the look it replaces (a foe's `look` or its id)
   and first stands beside the old one in the Galleries tab (`showLookPairs`), so the game is unchanged until the owner
   says yes; then its id goes into `APPROVED` and the foe wears it. `DEV.foeLooks` (the dev menu's Look tab, `?looks=`)
   dresses the foes in the approved looks (the game), in every new look (to try one in a fight before it is approved), or
   in the old ones (to compare). Each new look keeps what its behaviour moves: the old look's `parts` by name, and about its
   height (the browser test `lookContract` checks both). */
import type { Built } from './beastParts';
import { FLOOR1_LOOKS } from './fantasyFloor1';

/** The new looks, by the look id they replace. */
export const FANTASY_LOOKS: Partial<Record<string, () => Built>> = { ...FLOOR1_LOOKS };
/** The new looks the owner has approved: the ones the foes wear in the game. */
export const APPROVED: ReadonlySet<string> = new Set<string>([]);

export type FoeLooks = 'approved' | 'new' | 'old';
export const FOE_LOOK_MODES: readonly FoeLooks[] = ['approved', 'new', 'old'];
/** The new look a foe of look `id` wears now under `mode`, if any (else its old look). */
export function fantasyLook(id: string, mode: FoeLooks): (() => Built) | undefined {
  const b = FANTASY_LOOKS[id];
  return b && (mode === 'new' || (mode === 'approved' && APPROVED.has(id))) ? b : undefined;
}
