/* When a level waiting opens its screen (the level-up screen itself: ui/levelUp.ts). A level reached waits in
   `G.run.pending` until the fight is won: the doors open, nothing lives, no other screen is up, and a moment's calm
   (`CFG.levels.calm`). Then the panel door opens the screen. `DEV.autoLevel` (`?autolevel`, the dev menu, the tests and
   the balance bot) chooses without it: the first card, and the attribute with the fewest points; 'skip' lets the levels
   go unchosen. */
import { CFG } from '../config';
import { DEV, G } from '../state';
import { STR } from '../strings';
import { UI, openLevelUp, otherScreenUp } from '../panels';
import { line } from '../notify';
import { renderInsight } from './insight';
import { dealNow, takeBoon } from './boons';
import { ATTRS, type Attr } from './attributes';
import { pointsToSpend, spendPoint } from './points';
import type { Card } from './boonData';

let calm = 0;

/** Each step while playing: a level waiting opens the screen once the fight is won and a moment has passed. */
export function checkLevelUp(dt: number) {
  if (UI.levelOpen || G.run.pending <= 0) {
    calm = 0;
    return;
  }
  const fighting = G.current.locked || G.enemies.some((e) => !e.dead);
  if (G.state !== 'play' || G.trans || fighting || otherScreenUp()) {
    calm = 0;
    waitsSaid(fighting);
    return;
  }
  if ((calm += dt) < CFG.levels.calm) return;
  calm = 0;
  if (DEV.autoLevel === 'skip') {
    G.run.pending = 0;
    renderInsight();
    return;
  }
  if (DEV.autoLevel) {
    while (G.run.pending > 0) chooseLevel();
    return;
  }
  openLevelUp();
}
/** The first time in a run a level waits on a fight, a line says so. */
function waitsSaid(fighting: boolean) {
  if (fighting && G.state === 'play' && !G.run.hinted.has('levelWaits')) {
    G.run.hinted.add('levelWaits');
    line(STR.levels.waits, CFG.afflict.lineShow);
  }
}

/** The points this level's choice spends: all but one for each level still waiting after it (Tempered's three come here). */
export const pointsHere = () => pointsToSpend() - Math.max(0, G.run.pending - 1);

/** A level's choice made without its screen: card `i` of a fresh deal taken, then its points spent on `attr` (or each on
    the attribute with the fewest). Returns the cards dealt. */
export function chooseLevel(i = 0, attr?: Attr): Card[] {
  const cards = dealNow(),
    c = cards[Math.min(i, cards.length - 1)];
  if (c) takeBoon(c.id, false);
  spendHere(attr);
  G.run.pending = Math.max(0, G.run.pending - 1);
  renderInsight();
  return cards;
}
/** Spend this level's points on `attr`, or each on the attribute with the fewest. */
export function spendHere(attr?: Attr) {
  while (pointsHere() > 0) spendPoint(attr ?? [...ATTRS].sort((a, b) => G.run.attrs[a] - G.run.attrs[b])[0]);
}
