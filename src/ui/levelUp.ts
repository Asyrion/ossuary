/* M6 step 4: the level-up screen (docs/M6-plan.md; GDD: RPG progression, "the game pauses, like a card choice"). A level
   reached waits in `G.run.pending` until the fight is won: the doors open, nothing lives, no other screen is up, and a
   moment's calm. Then the game pauses and the screen deals three boons (progression/boons.ts): one is taken, then the
   level's point is spent on an attribute; each level waiting comes in turn. Arrows or WASD (the d-pad) choose, Enter or
   Space (A) takes, a card can be clicked; a short lock keeps a key held from the fight from choosing, and Esc doesn't
   close it (the level's choice is the mage's to make). `DEV.autoLevel` (`?autolevel`, the dev menu, the tests and the
   balance bot) chooses without it: the first card, and the attribute with the fewest points. M6 step 11: the shrine's
   bargain deals here too (`openBargainDeal`): three cards from the school cast into its stone, each costing a heart
   container, no point after; Esc (the pad's B) backs out with nothing paid. */
import { CFG } from '../config';
import { DEV, G } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { $ } from '../util';
import { showScreen } from './screens';
import { esc } from './spellPanel';
import { line } from './hud';
import { boon, boonText } from '../progression/boonData';
import { dealNow, takeBoon } from '../progression/boons';
import { isDevKey } from '../input/devKey';
import { boonIconImg } from '../progression/boonLooks';
import { ATTRS, type Attr } from '../progression/attributes';
import { ATTR_COLOR, attrText, pointsToSpend, spendPoint } from '../progression/points';
import type { Card } from '../progression/boonData';
import { renderInsight } from '../progression/insight';
import { keepBargain, refuseBargain } from '../world/bargain';
import type { School } from '../magic/spellData';

type Phase = 'boon' | 'point';
let open = false, phase: Phase = 'boon', cards: Card[] = [], chosen = 0, lockUntil = 0, calm = 0, mode: 'level' | 'bargain' = 'level';
let actions: { pause(): void; resume(): void; others(): boolean } = { pause: () => {}, resume: () => {}, others: () => false };

/** How the game pauses and goes on, and whether another screen is up (main.ts). */
export function initLevelUp(a: typeof actions) { actions = a; }
export const levelOpen = () => open;
/** The level whose choice is being made (or waits next). */
const levelNow = () => G.run.level - G.run.pending + 1;
/** What the screen shows, for the tests and the dev menu. */
export const offerNow = () => ({ open, mode, phase, level: levelNow(), pending: G.run.pending, chosen, cards: cards.map(c => ({ ...c })) });

/** Each step while playing: a level waiting opens the screen once the fight is won and a moment has passed. */
export function checkLevelUp(dt: number) {
  if (open || G.run.pending <= 0) { calm = 0; return; }
  const fighting = G.current.locked || G.enemies.some(e => !e.dead);
  if (G.state !== 'play' || G.trans || fighting || actions.others()) { calm = 0; waitsSaid(fighting); return; }
  if ((calm += dt) < CFG.levels.calm) return;
  calm = 0;
  if (DEV.autoLevel === 'skip') { G.run.pending = 0; renderInsight(); return; }
  if (DEV.autoLevel) { while (G.run.pending > 0) chooseFor(); return; }
  openLevelUp();
}
/** The first time in a run a level waits on a fight, a line says so. */
function waitsSaid(fighting: boolean) {
  if (fighting && G.state === 'play' && !G.run.hinted.has('levelWaits')) { G.run.hinted.add('levelWaits'); line(STR.levels.waits, CFG.afflict.lineShow); }
}

/** Open the screen for the next level waiting (the dev menu may, mid-fight). */
export function openLevelUp() {
  if (open || G.run.pending <= 0) return false;
  open = true; actions.pause(); showScreen('level'); deal(); Sfx.levelUp();
  return true;
}
function close() { open = false; mode = 'level'; actions.resume(); }

/** M6 step 11: the shrine's bargain: three boons, two of `school` (the spell cast into its stone) and one general; taking
    one pays a heart container (bargain.ts' `keepBargain`). */
export function openBargainDeal(school: School) {
  if (open) return false;
  mode = 'bargain'; open = true; actions.pause(); showScreen('level');
  cards = dealNow(school); chosen = 0; phase = 'boon'; render(); lock();
  return true;
}
/** Esc while the screen is open: the bargain is backed out of (nothing paid); a level's choice waits. */
export function levelEsc() {
  if (!open || mode !== 'bargain') return;
  refuseBargain(); close(); Sfx.cardTurn();
}
/** The tests' and the dev menu's: take the bargain's card `i` now (no lock). */
export function takeBargainCard(i: number) {
  if (!open || mode !== 'bargain' || !cards.length) return false;
  chosen = Math.min(i, cards.length - 1); lockUntil = 0; take(); return true;
}
function deal() {
  cards = dealNow(); chosen = 0; phase = cards.length ? 'boon' : 'point';
  if (phase === 'point' && pointsToSpend() <= 0) { done(); return; }
  render(); lock();
}
/** Choices wait a moment once shown (counted from when the cards are drawn: the first draw of a sigil takes a while). */
function lock() { lockUntil = performance.now() + CFG.levels.lock * 1000; }
/** One level's choice made: the next waiting, or back to the fight. */
function done() {
  G.run.pending = Math.max(0, G.run.pending - 1); renderInsight();
  if (G.run.pending > 0) deal(); else close();
}

/** The points this level's screen spends: all but one for each level still waiting after it (Tempered's three come here). */
const pointsHere = () => pointsToSpend() - Math.max(0, G.run.pending - 1);
/** Take the card chosen (a boon), or spend a point on the attribute chosen (again while this level has more). */
function take() {
  if (performance.now() < lockUntil) return;
  if (phase === 'boon') {
    const c = cards[chosen]; if (!c) return;
    if (mode === 'bargain') { Sfx.cardTake(); close(); keepBargain(c.id); return; } // (its own card and line: bargain.ts)
    takeBoon(c.id, false); Sfx.cardTake();
    if (pointsHere() > 0) { phase = 'point'; chosen = 0; render(); lock(); } else done();
    return;
  }
  spendPoint(ATTRS[chosen]);
  if (pointsHere() > 0) render(); else done();
}
function move(d: number) {
  const n = phase === 'boon' ? cards.length : ATTRS.length; if (!n) return;
  chosen = (chosen + d + n) % n; Sfx.cardTurn(); render();
}

/** The dev menu's and the tests': take card `i` (a boon), then spend on `attr` (or the fewest-spent). */
export function chooseFor(i = 0, attr?: Attr) {
  if (G.run.pending <= 0) return false;
  if (!open) cards = dealNow();
  const c = cards[Math.min(i, cards.length - 1)]; if (c && (!open || phase === 'boon')) takeBoon(c.id, false); // (on the point's page, its boon is taken already)
  while (pointsHere() > 0) spendPoint(attr ?? [...ATTRS].sort((a, b) => G.run.attrs[a] - G.run.attrs[b])[0]);
  if (open) { done(); return true; }
  G.run.pending = Math.max(0, G.run.pending - 1); renderInsight(); return true;
}

const L = () => STR.levels;
function render() {
  const bargain = mode === 'bargain';
  $('lvTitle').textContent = bargain ? STR.bargain.title : L().up(levelNow());
  $('lvHint').textContent = bargain ? STR.bargain.hint : L().hint;
  $('lvSub').textContent = bargain ? STR.bargain.sub : phase === 'boon' ? L().chooseBoon : L().choosePoint(pointsHere());
  const box = $('lvCards');
  if (phase === 'boon') {
    box.innerHTML = cards.map((c, k) => {
      const b = boon(c.id), name = c.rank > 1 ? STR.boons.ranked(b.name) : b.name, kind = b.school ? STR.boons.kindOf(STR.schools[b.school]) : STR.boons.kindGeneral;
      return `<button type="button" class="lvCard" data-i="${k}" aria-selected="${k === chosen}" style="--c:${b.color}">${boonIconImg(c.id, c.rank)}`
        + `<b>${esc(name)}</b><small>${esc(kind)}</small><span>${esc(boonText(c.id, c.rank))}</span>`
        + (c.lean && b.school && !bargain ? `<em>${esc(STR.boons.lean(STR.schools[b.school]))}</em>` : '') + (bargain ? `<em class="lvPrice">${esc(STR.bargain.price)}</em>` : '') + `<i>${esc(b.lore)}</i></button>`;
    }).join('');
  } else {
    box.innerHTML = ATTRS.map((a, k) => `<button type="button" class="lvCard lvAttr" data-i="${k}" aria-selected="${k === chosen}" style="--c:#${ATTR_COLOR[a].toString(16).padStart(6, '0')}">`
      + `<b>${esc(STR.attrs[a].name)}</b><small>${esc(L().attrNow(G.run.attrs[a]))}</small><span>${esc(attrText(a))}</span></button>`).join('');
  }
  for (const el of box.querySelectorAll<HTMLButtonElement>('.lvCard')) el.onclick = () => { chosen = Number(el.dataset.i); render(); take(); };
}

/** A key while the screen is open: true when it was used here (every key is: the choice waits). */
export function levelKey(code: string) {
  if (!open || isDevKey(code)) return false; // (the dev menu still opens over it)
  if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') move(-1);
  else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') move(1);
  else if (code === 'Enter' || code === 'Space') take();
  else if (code === 'Escape') levelEsc();
  return true;
}
/** A gamepad button newly pressed while the screen is open: the d-pad chooses, A takes. */
export function levelPad(button: number) {
  if (!open) return false;
  if (button === 0) take();
  else if (button === 1) levelEsc();
  else if (button === 14 || button === 12) move(-1); else if (button === 15 || button === 13) move(1);
  return true;
}
