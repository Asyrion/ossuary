/* M4.12 Fantasy foes (docs/M4.12-plan.md; the owner's ask, 2026-10-02): the cute looks and the plain animals redone as
   creatures of fantasy, each fight unchanged. A new look is kept here by the look it replaces (a foe's `look` or its id)
   and first stands beside the old one in the Galleries tab (`showLookPairs`), so the game is unchanged until the owner
   says yes; then its id goes into `APPROVED`, the foe wears it, and the old builder is deleted (`RETIRED` keeps its height
   and parts for the contract). `DEV.foeLooks` (the dev menu's Look tab, `?looks=`)
   dresses the foes in the approved looks (the game), in every new look (to try one in a fight before it is approved), or
   in the old ones (to compare). Each new look keeps what its behaviour moves: the old look's `parts` by name, and about its
   height (the browser test `lookContract` checks both). */
import type { Built } from './beastParts';
import { FLOOR1_LOOKS } from './fantasyFloor1';
import { FLOOR2_LOOKS } from './fantasyFloor2';

/** The new looks, by the look id they replace. */
export const FANTASY_LOOKS: Partial<Record<string, () => Built>> = { ...FLOOR1_LOOKS, ...FLOOR2_LOOKS };
/** The new looks the owner has approved: the ones the foes wear in the game (floors 1 and 2, 2026-10-02). */
export const APPROVED: ReadonlySet<string> = new Set<string>([
  'sporeling', 'vesperMoth', 'runeBeetle', 'urnMimic', 'cryptSpider', 'inkOctopus', 'fireflyBeetle', 'choirLark', 'stormMantis', 'rubbleCrab',
  'mireToad', 'cisternLurker', 'lanternJelly', 'glassNewt', 'rimeSnail', 'stormDarter',
]);
/** What an approved look's old one was, kept once the old builder is deleted (on the owner's yes the galleries stand the new
    look in its place): its height at rest and the parts its behaviour moves, so `lookContract` still holds the new look to
    them. */
export const RETIRED: Readonly<Record<string, { h: number; parts: readonly string[] }>> = {
  sporeling: { h: 1.06, parts: [] }, vesperMoth: { h: .7, parts: [] }, runeBeetle: { h: .8, parts: ['halfL', 'halfR', 'inner'] },
  urnMimic: { h: .91, parts: ['lid', 'peek', 'inside'] }, cryptSpider: { h: .83, parts: ['body', 'abdomen'] }, inkOctopus: { h: 1.12, parts: ['body', 'mantle'] },
  fireflyBeetle: { h: .6, parts: ['body'] }, choirLark: { h: .65, parts: ['body', 'head'] }, stormMantis: { h: 1.7, parts: ['chest', 'head'] },
  rubbleCrab: { h: .67, parts: ['body', 'big', 'small'] },
  mireToad: { h: .8, parts: ['body', 'throat'] }, cisternLurker: { h: 1.21, parts: ['rise', 'lures', 'lures2', 'disc'] },
  lanternJelly: { h: .75, parts: ['bell', 'light'] }, glassNewt: { h: .55, parts: ['body', 'head'] }, rimeSnail: { h: 1, parts: ['body', 'head', 'shell'] },
  stormDarter: { h: .49, parts: ['body'] },
};

export type FoeLooks = 'approved' | 'new' | 'old';
export const FOE_LOOK_MODES: readonly FoeLooks[] = ['approved', 'new', 'old'];
/** The new look a foe of look `id` wears now under `mode`, if any (else its old look). */
export function fantasyLook(id: string, mode: FoeLooks): (() => Built) | undefined {
  const b = FANTASY_LOOKS[id];
  return b && (mode === 'new' || (mode === 'approved' && APPROVED.has(id))) ? b : undefined;
}
