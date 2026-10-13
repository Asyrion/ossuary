/* M6 step 3: boons in the game (the rules are boonData.ts). `G.run.boons` holds each boon taken and its rank; the hooks
   that carry a boon out (steps 5 and 6) ask `boonRank` and `boonParam`. A deal reads the build: the spells in the slots,
   the run's casts by school (`G.run.casts`), the boons taken and a pledge (`G.run.pledge`); each deal is drawn on its own
   stream (`'boons' + G.run.deals`), so a seed deals the same cards to the same choices. Taking one shows its lore card;
   a school boon taken before any spell of its school pledges the next library to it, and says so. The level-up screen
   (step 4) and the shrine's bargain (step 11) deal and take through here. */
import { G, player } from '../state';
import { STR } from '../strings';
import { CFG } from '../config';
import { Rng } from '../rng';
import { line } from '../ui/hud';
import { showLore } from '../ui/lore';
import { refreshStats } from '../items/artifacts';
import { FLOORS } from '../world/generate';
import { spell, type School } from '../magic/spellData';
import { attunedTo } from '../magic/marksData';
import { boonIconImg } from './boonLooks';
import { boonRank } from './boonHooks';
import { boon, boonText, dealBoons, pledgeFor, schoolWeights, type Card } from './boonData';

export { boonRank, boonParam } from './boonHooks';

/** The schools of the spells in the slots. */
const slotSchools = () => player.spells.map((id) => (id ? spell(id).school : null));

/** Three cards for a choice now (a level's, or with `only`, a bargain's school), drawn on the run's own stream. An attuned
    mage is told once a run that the deal leans to its school. */
export function dealNow(only?: School | null): Card[] {
  const slots = slotSchools(),
    attuned = attunedTo(slots),
    taken = G.run.boons;
  const weights = schoolWeights({ slots, casts: G.run.casts, taken, pledge: G.run.pledge });
  const socketable = G.run.floor < FLOORS.length - 1 && player.spells.some(Boolean); // (a waystone still ahead, and a spell to carve)
  const rng = Rng.from(G.run.seed, 'boons' + G.run.deals++);
  const cards = dealBoons(
    { taken, weights, attuned, spoon: player.stats.effects.has('taster'), socketable, only },
    () => rng.next(),
  );
  if (attuned && !only && !G.run.hinted.has('dealLeans:' + attuned)) {
    G.run.hinted.add('dealLeans:' + attuned);
    line(STR.boons.attuned(STR.schools[attuned]), CFG.afflict.lineShow);
  }
  return cards;
}

/** Take boon `id` (its next rank): its lore card (not from the level-up screen, whose card says it all), a pledge if its
    school's spells are yet to come, and the stats refreshed (a boon may change them). Whether it could be taken. */
export function takeBoon(id: string, card = true) {
  const def = boon(id),
    rank = boonRank(id) + 1;
  if (rank > def.max) return false;
  G.run.boons[id] = rank;
  boonsChanged++;
  const pledge = rank === 1 ? pledgeFor(id, slotSchools()) : null;
  if (pledge) {
    G.run.pledge = pledge;
    line(STR.boons.pledged(STR.schools[pledge]), CFG.afflict.lineShow);
  }
  if (card)
    showLore({
      icon: boonIconImg(id, rank),
      name: rank > 1 ? STR.boons.ranked(def.name) : def.name,
      kind: def.school ? STR.boons.kindOf(STR.schools[def.school]) : STR.boons.kindGeneral,
      effect: boonText(id, rank),
      lore: def.lore,
    });
  refreshStats(false);
  return true;
}

/** How many times a boon has been taken since the page loaded (a panel showing the boons knows when to change). */
export let boonsChanged = 0;

/** The boons taken this run, for the dev hooks and the dev menu. */
export const boonsNow = () => ({ ...G.run.boons });
