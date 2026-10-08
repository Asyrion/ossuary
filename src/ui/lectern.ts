/* M7 step 5: the Vigil's grimoire lectern (docs/M7-plan.md, decision 8), built as the waystone's screen (ui/waystone.ts):
   it opens when the mage walks up to the lectern in the Crypt (vigil/place.ts), and the game waits while it's open. At the
   Vigil the mage's two hands hold any two spells it has learned: the screen lists the two hands, then every spell learned,
   by school; Q or E (LB or RB) puts the chosen spell in that hand, Enter in the free one (or Q's), and Enter on a hand
   empties it. The choice is kept in the save (`slots`), for every waking. Esc (B) closes; tiles can be clicked. A descent
   starts empty-handed, as ever: the lectern's spells are the Vigil's. */
import { player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { $ } from '../util';
import { showScreen } from './screens';
import { esc, head, spellSheet } from './spellPanel';
import { spellIcon, toast } from './hud';
import { SCHOOLS, SPELL_DEFS, spell } from '../magic/spellData';
import { atLeast } from '../magic/knowledge';
import { castsOf, stage } from '../magic/memory';
import { forgetSpell, learnSpell } from '../magic/spells';
import { setVigilSlot } from '../vigil/save';

interface Entry { icon: string; label: string; corner?: string; dim?: boolean; section?: string; detail: () => string; spell?: string; hand?: number }
let open = false, chosen = 0;
let actions: { pause(): void; resume(): void } = { pause: () => {}, resume: () => {} };
const L = () => STR.vigil.lectern;
const KEYS = () => STR.controls.spellsKeys.split(' and ');
const DUST = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="none" stroke="#5a4a38" stroke-width="2" stroke-dasharray="4 4"/></svg>';

/** How the game pauses and goes on (flow's, from main.ts). */
export function initLectern(a: { pause(): void; resume(): void }) { actions = a; }
export const lecternOpen = () => open;
/** The spells the mage has learned, by school (those the lectern offers). */
export const learnedSpells = () => SCHOOLS.flatMap(s => SPELL_DEFS.filter(d => d.school === s && atLeast(stage(d.id), 'learned')).map(d => d.id));

export function openLectern() {
  if (open) return;
  open = true; chosen = Math.min(2, entries().length - 1); actions.pause(); showScreen('lectern'); render(); Sfx.potionChoose();
}
export function closeLectern() { if (!open) return; open = false; actions.resume(); }

function entries(): Entry[] {
  const keys = KEYS(), out: Entry[] = [];
  player.spells.forEach((id, hand) => out.push(id ? {
    icon: spellIcon(id), label: spell(id).name, corner: keys[hand], section: hand === 0 ? L().inHand : undefined, hand, spell: id,
    detail: () => spellSheet(spell(id), stage(id), '', castsOf(id)) + `<p class="note">${esc(L().note)}</p>`,
  } : {
    icon: DUST, label: L().empty(keys[hand]), corner: keys[hand], dim: true, section: hand === 0 ? L().inHand : undefined, hand,
    detail: () => `<p class="effect">${esc(L().emptyText)}</p><p class="note">${esc(L().note)}</p>`,
  }));
  const list = learnedSpells();
  if (!list.length) out.push({ icon: DUST, label: L().none, dim: true, section: STR.vigil.lectern.title, detail: () => head(DUST, L().none, '') + `<p class="note">${esc(L().note)}</p>` });
  let last = '';
  for (const id of list) {
    const d = spell(id), section = d.school !== last ? L().school(STR.schools[d.school]) : undefined; last = d.school;
    const k = player.spells.indexOf(id);
    out.push({ icon: spellIcon(id), label: d.name, section, spell: id, corner: k >= 0 ? keys[k] : undefined, detail: () => spellSheet(d, stage(id), '', castsOf(id)) });
  }
  return out;
}

function render() {
  const list = entries(), i = chosen = Math.max(0, Math.min(chosen, list.length - 1)), box = $('lecternList');
  box.innerHTML = list.map((e, k) => (e.section ? `<p class="sec">${esc(e.section)}</p>` : '')
    + `<button type="button" class="tile${e.dim ? ' dim' : ''}" role="option" data-i="${k}" aria-selected="${k === i}" title="${esc(e.label)}">${e.icon}${e.corner ? `<b class="k">${esc(e.corner)}</b>` : ''}</button>`).join('');
  $('lecternDetail').innerHTML = list[i]?.detail() ?? '';
  for (const b of box.querySelectorAll<HTMLButtonElement>('.tile')) b.onclick = () => { const k = Number(b.dataset.i); if (chosen === k) act(); else { chosen = k; render(); } };
  box.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
function columns() {
  const tiles = [...$('lecternList').querySelectorAll<HTMLElement>('.tile')], top = tiles[0]?.offsetTop ?? 0;
  return Math.max(1, tiles.filter(t => t.offsetTop === top).length);
}
function move(dx: number, dy: number) { const n = entries().length; if (!n) return; chosen = Math.max(0, Math.min(n - 1, chosen + dx + dy * columns())); render(); }
/** Enter: a hand chosen is emptied; a spell goes into the free hand, or Q's. */
function act() {
  const e = entries()[chosen]; if (!e) return;
  if (e.hand !== undefined) { if (e.spell) holdIn(e.hand, null); return; }
  if (e.spell) holdIn(Math.max(0, player.spells.indexOf(null)), e.spell);
}
/** Q or E: the chosen spell into that hand. */
function toHand(hand: number) { const e = entries()[chosen]; if (e?.spell && e.hand === undefined) holdIn(hand, e.spell); }

/** Put spell `id` in hand `hand` (or empty it): kept in the save. True when it changed. The tests and the dev menu call it. */
export function holdIn(hand: number, id: string | null) {
  if (hand !== 0 && hand !== 1) return false;
  if (id && !learnedSpells().includes(id)) return false;
  const other = 1 - hand;
  if (id && player.spells[other] === id) { forgetSpell(other); setVigilSlot(other, null); } // (one spell, one hand)
  if (id) learnSpell(id, hand, true); else forgetSpell(hand);
  setVigilSlot(hand, id); Sfx.potionChoose();
  toast(id ? L().put(spell(id).name, KEYS()[hand]) : L().cleared(KEYS()[hand]), 1.6);
  if (open) render(); return true;
}

/** A key while the screen is open: true when it was used here. */
export function lecternKey(code: string) {
  if (!open) return false;
  if (code === 'Escape' || code === 'KeyP' || code === 'KeyI' || code === 'Tab') closeLectern();
  else if (code === 'ArrowLeft' || code === 'KeyA') move(-1, 0);
  else if (code === 'ArrowRight' || code === 'KeyD') move(1, 0);
  else if (code === 'ArrowUp' || code === 'KeyW') move(0, -1);
  else if (code === 'ArrowDown' || code === 'KeyS') move(0, 1);
  else if (code === 'KeyQ') toHand(0);
  else if (code === 'KeyE') toHand(1);
  else if (code === 'Enter' || code === 'Space') act();
  else return false;
  return true;
}
/** A gamepad button newly pressed while the screen is open: the d-pad chooses, A puts in the free hand, LB and RB in that
    hand, B closes. */
export function lecternPad(button: number) {
  if (!open) return false;
  if (button === 1 || button === 8) closeLectern();
  else if (button === 0) act();
  else if (button === 4) toHand(0); else if (button === 5) toHand(1);
  else if (button === 12) move(0, -1); else if (button === 13) move(0, 1); else if (button === 14) move(-1, 0); else if (button === 15) move(1, 0);
  else return false;
  return true;
}
/** For the tests: the screen's state. */
export const lecternNow = () => ({ open, chosen, entries: open ? entries().map(e => e.label) : [], hands: [...player.spells] });
