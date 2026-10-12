/* M6 step 9: the waystone's screen (docs/archive/M6-plan.md, decision 11), built as the alchemy table's (ui/alchemyTable.ts): it
   opens when the mage walks up to a kindled waystone or casts into it (world/waystone.ts), and the game waits while it's
   open. The first opening rests the mage. Two tabs:
   - Runes: each slot's sockets (a carved rune lifts back into the pouch for nothing; an empty hollow makes its slot the
     one carved into), a second socket while Second Socket is owed, the pair the stone offers (one taken, the other
     crumbles), and the pouch (a rune carved into the chosen slot).
   - Belt: a potion picked up and put down in another slot (the inventory's Potions tab does the same at any time).
   Arrows choose, Enter takes, Q and E (LB and RB) change tabs, Esc (B) closes; tiles can be clicked. */
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { CFG } from '../config';
import { $ } from '../util';
import { showScreen } from './screens';
import { esc, head, spellSheet } from './spellPanel';
import { line, toast } from './hud';
import { spell } from '../magic/spellData';
import { rune, type RuneId } from '../magic/runeData';
import { addRune, carveFromPouch, liftRune, runeFitsText, setSockets } from '../magic/runes';
import { runeIconImg } from '../items/runeLooks';
import { castsOf, stage } from '../magic/memory';
import { boonRank } from '../progression/boonHooks';
import { beltSlots, moveInBelt, potionName } from '../items/potions';
import { bottleIconUrl } from '../items/alchemyLooks';
import type { PotionId } from '../items/alchemyData';
import { restAtStone } from '../world/waystone';

export type StoneTab = 'runes' | 'belt';
const TABS: StoneTab[] = ['runes', 'belt'];
interface Entry { icon: string; label: string; badge?: string; corner?: string; dim?: boolean; section?: string; detail: () => string; act?: () => void }

let open = false, tab: StoneTab = 'runes', held: number | null = null;
const chosen: Record<StoneTab, number> = { runes: 0, belt: 0 };
let actions: { pause(): void; resume(): void } = { pause: () => {}, resume: () => {} };

/** How the game pauses and goes on (flow's, from main.ts). */
export function initWaystone(a: { pause(): void; resume(): void }) { actions = a; }
export const waystoneOpen = () => open;

/** Open the stone's screen at a tab (the game waits); `slot` makes that spell the one carved into (a cast into the stone).
    The first opening rests the mage. */
export function openWaystone(t: StoneTab, slot?: number) {
  const w = G.current.waystone; if (open || !w) return;
  if (slot !== undefined) w.target = slot; else if (!player.spells[w.target]) w.target = Math.max(0, player.spells.findIndex(Boolean));
  open = true; tab = t; held = null; chosen.runes = 0; restAtStone(); actions.pause(); showScreen('stone'); render(); Sfx.potionChoose();
}
export function closeWaystone() {
  if (!open) return;
  open = false; held = null; actions.resume();
}

const W = () => STR.waystone;
const KEYS = () => STR.controls.spellsKeys.split(' and ');
const img = (src: string) => `<img class="px" src="${src}" alt="">`;
/** An empty socket: a dark hollow in a ring of stone; one owed by Second Socket: a ring with a plus. */
const HOLLOW = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="#0c0806" stroke="#7a6a52" stroke-width="3"/></svg>';
const SOCKET = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="none" stroke="#ffd98a" stroke-width="2.5" stroke-dasharray="5 3"/><path d="M24 17v14M17 24h14" stroke="#ffd98a" stroke-width="2.5"/></svg>';
const DUST = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="none" stroke="#5a4a38" stroke-width="2" stroke-dasharray="4 4"/></svg>';

/** What a rune does and fits, for the detail panel; `extra` says what Enter does here. */
const runeDetail = (id: RuneId, sub: string, extra: string) => {
  const r = rune(id);
  return head(runeIconImg(id), r.name, `${STR.runes.kind} · ${sub}`) + `<p class="effect">${esc(r.text)}.</p><p class="effect">${esc(runeFitsText(id))}</p><p class="note">${esc(extra)}</p><p class="lore">${esc(r.lore)}</p>`;
};
/** Second Socket's sockets still owed: its rank above the second sockets it has opened. */
const owed = () => Math.max(0, boonRank('secondSocket') - G.run.socketsOpened);

function runeEntries(): Entry[] {
  const w = G.current.waystone!, keys = KEYS(), out: Entry[] = [];
  player.spells.forEach((sid, slot) => {
    const section = sid ? W().slot(keys[slot], spell(sid).name) : W().emptySlot(keys[slot]);
    if (!sid) { out.push({ icon: DUST, label: W().emptySlot(keys[slot]), dim: true, section, detail: () => `<p class="effect">${esc(STR.inv.emptyText)}</p>` }); return; }
    const sock = player.sockets[slot], def = spell(sid), mark = slot === w.target ? '•' : undefined, key = keys[slot];
    for (let i = 0; i < sock.size; i++) {
      const id = sock.runes[i] as RuneId | undefined, first = i === 0 ? section : undefined;
      out.push(id ? {
        icon: runeIconImg(id), label: rune(id).name, corner: key, badge: mark, section: first,
        detail: () => runeDetail(id, def.name, W().liftText),
        act: () => { w.target = slot; if (liftRune(slot, id)) line(W().lifted(rune(id).name), CFG.afflict.lineShow); },
      } : {
        icon: HOLLOW, label: W().hollow, corner: key, badge: mark, section: first,
        detail: () => spellSheet(def, stage(sid), slot === w.target ? W().target : '', castsOf(sid), sock.runes) + `<p class="note">${esc(W().hollowText(def.name))}</p>`,
        act: () => { w.target = slot; Sfx.potionChoose(); },
      });
    }
  });
  if (owed()) player.spells.forEach((sid, slot) => {
    if (!sid || player.sockets[slot].size > 1) return;
    const name = spell(sid).name;
    out.push({ icon: SOCKET, label: W().socketTile(name), corner: KEYS()[slot], section: out.some(e => e.icon === SOCKET) ? undefined : W().socket,
      detail: () => head(SOCKET, W().socket, name) + `<p class="effect">${esc(W().socketText(name))}</p>`,
      act: () => { secondSocket(slot); } });
  });
  if (w.pair) w.pair.forEach((id, i) => out.push({
    icon: runeIconImg(id as RuneId), label: rune(id as RuneId).name, section: i === 0 ? W().offers : undefined,
    detail: () => runeDetail(id as RuneId, W().offers, W().takeText),
    act: () => takeFromStone(i),
  }));
  else out.push({ icon: DUST, label: W().offered, dim: true, section: W().offers, detail: () => `<p class="effect">${esc(W().offered)}</p>` });
  const target = player.spells[w.target], ids = [...new Set(player.runes)] as RuneId[];
  if (ids.length) ids.forEach((id, i) => {
    const n = player.runes.filter(r => r === id).length;
    out.push({ icon: runeIconImg(id), label: rune(id).name, badge: n > 1 ? String(n) : undefined, section: i === 0 ? W().pouch : undefined,
      detail: () => runeDetail(id, STR.inv.potions.held(n), target ? W().carveText(spell(target).name) : W().noTarget),
      act: () => carveHere(id) });
  });
  else out.push({ icon: DUST, label: W().noRunes, dim: true, section: W().pouch, detail: () => head(DUST, W().noRunes, W().pouch) + `<p class="effect">${esc(W().noRunesText)}</p>` });
  return out;
}

function beltEntries(): Entry[] {
  return Array.from({ length: beltSlots() }, (_, k) => {
    const id = player.belt[k] as PotionId | undefined, section = k === 0 ? W().belt : undefined;
    const icon = id ? img(bottleIconUrl(G.run.bottles[id])) : DUST, name = id ? potionName(id) : W().emptyBelt;
    return { icon, label: name, badge: held === k ? '✋' : k === player.beltAt && id ? '•' : undefined, dim: !id, section,
      detail: () => head(icon, name, STR.inv.potions.slot(k + 1)) + `<p class="effect">${esc(held !== null ? W().holding(potionName(player.belt[held] as PotionId)) : W().beltText)}</p>`,
      act: () => beltAct(k) };
  });
}
/** The belt's act: pick the potion in slot `k` up, or put the one held down there. */
function beltAct(k: number) {
  if (held === null) { if (player.belt[k]) { held = k; Sfx.potionChoose(); } return; }
  const id = player.belt[held] as PotionId; if (moveInBelt(held, k)) toast(W().moved(potionName(id)), 1.6);
  held = null;
}

const entries = (t: StoneTab) => t === 'runes' ? runeEntries() : beltEntries();

function render() {
  if (!G.current.waystone) { closeWaystone(); return; }
  const list = entries(tab), i = chosen[tab] = Math.max(0, Math.min(chosen[tab], list.length - 1));
  $('stoneTabs').innerHTML = TABS.map(t => `<button type="button" role="tab" data-tab="${t}" aria-selected="${t === tab}">${esc(W().tabs[t])}</button>`).join('');
  const box = $('stoneList');
  box.innerHTML = list.map((e, k) => (e.section ? `<p class="sec">${esc(e.section)}</p>` : '')
    + `<button type="button" class="tile${e.dim ? ' dim' : ''}" role="option" data-i="${k}" aria-selected="${k === i}" title="${esc(e.label)}">${e.icon}${e.badge ? `<b class="n">${esc(e.badge)}</b>` : ''}${e.corner ? `<b class="k">${esc(e.corner)}</b>` : ''}</button>`).join('');
  $('stoneDetail').innerHTML = list[i]?.detail() ?? '';
  for (const b of $('stoneTabs').querySelectorAll<HTMLButtonElement>('button')) b.onclick = () => { tab = b.dataset.tab as StoneTab; held = null; render(); };
  for (const b of box.querySelectorAll<HTMLButtonElement>('.tile')) b.onclick = () => { const k = Number(b.dataset.i); if (chosen[tab] === k) act(); else { chosen[tab] = k; render(); } };
  box.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
function act() { entries(tab)[chosen[tab]]?.act?.(); if (open) render(); }
function columns() {
  const tiles = [...$('stoneList').querySelectorAll<HTMLElement>('.tile')], top = tiles[0]?.offsetTop ?? 0;
  return Math.max(1, tiles.filter(t => t.offsetTop === top).length);
}
function move(dx: number, dy: number) { const n = entries(tab).length; if (!n) return; chosen[tab] = Math.max(0, Math.min(n - 1, chosen[tab] + dx + dy * columns())); render(); }
function turn(d: number) { tab = TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length]; held = null; render(); }

/** A key while the screen is open: true when it was used here. */
export function stoneKey(code: string) {
  if (!open) return false;
  if (code === 'Escape' || code === 'KeyP' || code === 'KeyI' || code === 'Tab') closeWaystone();
  else if (code === 'ArrowLeft' || code === 'KeyA') move(-1, 0);
  else if (code === 'ArrowRight' || code === 'KeyD') move(1, 0);
  else if (code === 'ArrowUp' || code === 'KeyW') move(0, -1);
  else if (code === 'ArrowDown' || code === 'KeyS') move(0, 1);
  else if (code === 'KeyQ') turn(-1);
  else if (code === 'KeyE') turn(1);
  else if (code === 'Enter' || code === 'Space') act();
  else return false;
  return true;
}
/** A gamepad button newly pressed while the screen is open: the d-pad chooses, A takes, LB and RB change tabs, B closes. */
export function stonePad(button: number) {
  if (!open) return false;
  if (button === 1 || button === 8) closeWaystone();
  else if (button === 0) act();
  else if (button === 4) turn(-1); else if (button === 5) turn(1);
  else if (button === 12) move(0, -1); else if (button === 13) move(0, 1); else if (button === 14) move(-1, 0); else if (button === 15) move(1, 0);
  else return false;
  return true;
}

/* ---------- what Enter does (the tests and the dev menu call these too) ---------- */

/** Take the pair's rune `i` into the pouch; the other crumbles. */
export function takeFromStone(i: number) {
  const w = G.current.waystone; if (!w?.pair || (i !== 0 && i !== 1)) return false;
  const took = w.pair[i] as RuneId, lost = w.pair[1 - i] as RuneId; w.pair = null;
  addRune(took); Sfx.at(w.x, w.z).crumble(); line(W().taken(rune(took).name, rune(lost).name), CFG.afflict.lineShow);
  if (open) render(); return true;
}
/** Carve rune `id` from the pouch into the stone's chosen slot: null when carved, else why not (said in a toast). */
export function carveHere(id: RuneId, slot = G.current.waystone?.target ?? 0) {
  const w = G.current.waystone; if (!w) return 'empty';
  w.target = slot;
  const why = carveFromPouch(slot, id), sid = player.spells[slot];
  if (why) { toast(why === 'none' ? W().noRunes : STR.runes.refused[why] ?? why, 2.2); Sfx.refuse(); }
  else if (sid) line(W().carved(rune(id).name, spell(sid).name), CFG.afflict.lineShow);
  if (open) render(); return why;
}
/** Second Socket's owed socket opened in slot `slot` (false when none is owed or it has two already). */
export function secondSocket(slot: number) {
  const w = G.current.waystone, sid = player.spells[slot];
  if (!w || !sid || !owed() || player.sockets[slot].size > 1) return false;
  setSockets(slot, 2); G.run.socketsOpened++; w.target = slot; Sfx.carve(); line(W().socketOpened(spell(sid).name), CFG.afflict.lineShow);
  if (open) render(); return true;
}
/** For the tests: the screen's state. */
export const waystoneNow = () => ({ open, tab, held, target: G.current.waystone?.target ?? null, entries: open ? entries(tab).map(e => e.label) : [] });
