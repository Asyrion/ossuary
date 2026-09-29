/* The inventory: what the mage carries and knows, in tabs (artifacts, spells, items, the mage's own numbers), the
   chosen entry described in a panel beside them: its icon, name and kind, what it does, its numbers and its lore.
   Opened with I or Tab (the gamepad's View button), or from the pause menu; the game waits while it's open.
   Arrows choose, Q and E (LB and RB) change tabs, and I, Tab or Esc (B) close it again. */
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { $ } from '../util';
import { artifact, focusPattern, halveStat, type StatKey } from '../items/artifactData';
import { LOOT } from '../items/loot';
import { SCHOOLS, SPELL_DEFS, spell } from '../magic/spellData';
import { atLeast } from '../magic/knowledge';
import { castsOf, stage } from '../magic/memory';
import { esc, head, spellSheet } from './spellPanel';
import { showScreen } from './screens';
import { artifactIcon, spellIcon } from './hud';
import { itemIcon } from './lore';

type Tab = 'artifacts' | 'spells' | 'items' | 'mage';
const TABS: Tab[] = ['artifacts', 'spells', 'items', 'mage'];
/** One entry in a tab: a tile (or a row, in the mage's tab) and what the panel says of it. */
interface Entry { icon: string; label: string; badge?: string; corner?: string; dim?: boolean; section?: string; detail: () => string }

const I = () => STR.inv;
const num = (v: number, d = 1) => String(+v.toFixed(d));
/** Half hearts as hearts: 5 → "2½", 1 → "½". */
const halves = (h: number) => h % 2 ? `${h > 1 ? Math.floor(h / 2) : ''}½` : String(h / 2);

let open = false, tab: Tab = 'artifacts', back: 'pause' | 'play' = 'play';
const chosen: Record<Tab, number> = { artifacts: 0, spells: 0, items: 0, mage: 0 };
let actions: { resume(): void } = { resume: () => {} };

/** How to go back to the game when the inventory closes (flow's resume, from main.ts). */
export function initInventory(a: { resume(): void }) {
  actions = a;
  $('btnInv').addEventListener('click', () => openInventory('pause'));
}
export const inventoryOpen = () => open;

/** Open on the last tab used; `from` says where closing returns to (the pause menu, or straight back to play). */
export function openInventory(from: 'pause' | 'play') {
  open = true; back = from;
  render(); showScreen('inv');
}
export function closeInventory() {
  if (!open) return;
  open = false;
  if (back === 'play') actions.resume(); else { showScreen('pause'); $('btnInv').focus(); }
}

/* ---------- the tabs ---------- */

function entries(t: Tab): Entry[] {
  if (t === 'artifacts') return artifactEntries();
  if (t === 'spells') return spellEntries();
  if (t === 'items') return itemEntries();
  return mageEntries();
}

/** Artifact chips: what each stat does (halved once cleansed); `bad` marks the price. */
function statChips(stats: Partial<Record<StatKey, number>> | undefined, halve: boolean, bad = false) {
  return Object.entries(stats ?? {}).map(([k, raw]) => {
    const key = k as StatKey, v = halve ? halveStat(key, raw) : raw, mul = key.endsWith('Mul');
    const good = !bad && (key === 'fireDelayMul' ? v < 1 : mul ? v > 1 : v > 0);
    const val = key === 'boltScale' ? `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`
      : key === 'pierce' && v >= 99 ? '∞' : mul ? `×${num(v, 2)}` : `${v > 0 ? '+' : ''}${num(v, 2)}${key === 'invuln' ? ' s' : ''}`;
    return `<span class="chip ${good ? 'good' : 'bad'}">${esc(I().stat[key] ?? key)} ${val}</span>`;
  }).join('');
}

function artifactEntries(): Entry[] {
  return [player.focus, ...player.items].map((id, i) => {
    const def = artifact(id), focus = i === 0, clean = !!def.curse && player.cleansed.includes(id);
    return {
      icon: artifactIcon(id, focus, clean), label: def.name,
      detail: () => {
        const kind = focus ? STR.lore.kinds.focus : clean ? I().cleansed : STR.lore.kinds[def.kind] ?? def.kind;
        const p = focusPattern(def), pattern = focus ? [
          p.count > 1 ? `<span class="chip">${esc(I().bolts(p.count, p.fan > 0))}</span>` : '',
          p.path !== 'straight' ? `<span class="chip">${esc(I().paths[p.path] ?? p.path)}</span>` : '',
          p.damageMul !== 1 ? `<span class="chip ${p.damageMul > 1 ? 'good' : 'bad'}">${esc(I().boltDamage)} ×${num(p.damageMul, 2)}</span>` : '',
          p.rangeMul !== 1 ? `<span class="chip ${p.rangeMul > 1 ? 'good' : 'bad'}">${esc(I().stat.rangeMul)} ×${num(p.rangeMul, 2)}</span>` : '',
        ].join('') : '';
        const price = def.curse && !clean && def.curse.stats ? `<p class="lbl">${esc(I().price)}</p><div class="chips">${statChips(def.curse.stats, false, true)}</div>` : '';
        return head(artifactIcon(id, focus, clean), def.name, kind)
          + `<p class="effect">${esc(clean ? def.curse!.cleansed : def.text)}</p>`
          + `<div class="chips">${pattern}${statChips(def.stats, clean)}</div>${price}`
          + (clean ? `<p class="note">${esc(I().cleansedNote)}</p>` : '')
          + `<p class="lore">${esc(def.lore)}</p>`;
      },
    };
  });
}

/** The spells tab (M3.7): the two carried slots, then a book by school. A school shows once a spell of it is learned,
    with every spell of it the mage has met (carried ones marked Q or E, given-up ones and ones only seen dimmed) and a
    sealed entry for each one not met yet; each described as far as the mage knows it (ui/spellPanel.ts). */
function spellEntries(): Entry[] {
  const keys = STR.controls.spellsKeys.split(' and '), pads = STR.controls.spellsPad.split(' and '), K = STR.knowledge;
  const sheet = (id: string, note = '') => spellSheet(spell(id), stage(id), note, castsOf(id));
  const slots: Entry[] = player.spells.map((id, i) => id ? {
    icon: spellIcon(id), label: spell(id).name, corner: keys[i], section: i === 0 ? I().carried : undefined,
    detail: () => sheet(id, `${I().slot(keys[i])} · ${pads[i]}`),
  } : {
    icon: '', label: I().empty, corner: keys[i], dim: true, section: i === 0 ? I().carried : undefined,
    detail: () => head('', I().empty, I().slot(keys[i])) + `<p class="effect">${esc(I().emptyText)}</p>`,
  });
  const book: Entry[] = [];
  for (const school of SCHOOLS) {
    const all = SPELL_DEFS.filter(s => s.school === school);
    if (!all.some(s => atLeast(stage(s.id), 'learned'))) continue; // a school opens with its first spell learned
    const name = STR.schools[school];
    all.forEach((s, i) => {
      const st = stage(s.id), slot = player.spells.indexOf(s.id), given = G.run.forgotten.includes(s.id) && slot < 0;
      book.push(st === 'unknown' ? {
        icon: SEALED, label: K.sealed, dim: true, section: i === 0 ? name : undefined,
        detail: () => head(SEALED, K.sealed, I().school(name)) + `<p class="effect">${esc(K.sealedText(name))}</p>`,
      } : {
        icon: spellIcon(s.id), label: s.name, section: i === 0 ? name : undefined, corner: slot >= 0 ? keys[slot] : undefined,
        dim: given || st === 'seen',
        detail: () => sheet(s.id, slot >= 0 ? `${I().slot(keys[slot])} · ${pads[slot]}` : given ? I().givenUpNote(LOOT.grimoire.rebuy) : st === 'seen' ? '' : K.notCarried),
      });
    });
  }
  return [...slots, ...book];
}
/** A page not found yet: a sealed leaf. */
const SEALED = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 7h17l7 7v27H13z" fill="#3a3128" stroke="#7a6a52" stroke-width="2"/><circle cx="25" cy="27" r="6" fill="#6a2a20" stroke="#a8503c" stroke-width="1.5"/><path d="M22 27h6M25 24v6" stroke="#e0b08a" stroke-width="1.4"/></svg>';

function itemEntries(): Entry[] {
  const M = CFG.mana, st = player.stats;
  const item = (k: 'coin' | 'key' | 'glyph', count: number): Entry => {
    const t = STR.lore.items[k];
    return { icon: itemIcon(k), label: t.name, badge: String(count), detail: () => head(itemIcon(k), t.name, `${t.kind} · ${count}`) + `<p class="effect">${esc(t.effect)}</p><p class="lore">${esc(t.lore)}</p>` };
  };
  const H = I().hearts, MI = I().manaItem;
  return [
    { icon: itemIcon('heart'), label: H.name, badge: halves(player.hp),
      detail: () => head(itemIcon('heart'), H.name, `${H.kind} · ${I().of(halves(player.hp), halves(player.maxHp))}`) + `<p class="effect">${esc(H.effect)}</p>` },
    { icon: itemIcon('mana'), label: MI.name, badge: String(Math.round(player.mana)),
      detail: () => head(itemIcon('mana'), MI.name, `${MI.kind} · ${I().of(String(Math.round(player.mana)), String(st.maxMana))}`)
        + `<p class="effect">${esc(st.effects.has('noRegen') ? MI.noRegen : MI.effect(M.calm, M.fight, M.perKill))}</p>` },
    item('coin', player.coins), item('key', player.keys), item('glyph', player.glyphs),
  ];
}

function mageEntries(): Entry[] {
  const st = player.stats, H = CFG.hero, M = CFG.mana, T = I().mage, p = st.pattern;
  const row = (k: string, value: string, base?: string): Entry => ({
    icon: '', label: T[k].name, badge: value,
    detail: () => head('', T[k].name, value) + `<p class="effect">${esc(T[k].text)}</p>` + (base ? `<p class="note">${esc(I().base(base))}</p>` : ''),
  });
  return [
    row('damage', num(st.damage), num(H.damage)),
    row('rate', num(1 / st.fireDelay, 2), num(1 / H.fireDelay, 2)),
    row('boltSpeed', num(st.shotSpeed), num(H.shotSpeed)),
    row('range', num(st.range), num(H.range)),
    row('speed', num(st.speed), num(H.speed)),
    row('hearts', I().of(halves(player.hp), halves(player.maxHp))),
    row('mana', I().of(String(Math.round(player.mana)), String(st.maxMana)), String(H.mana)),
    row('regen', st.effects.has('noRegen') ? '0 / 0' : `${M.calm} / ${M.fight}`),
    row('spellDamage', `×${num(st.spellDamage, 2)}`, '×1'),
    row('killMana', st.killMana ? `${M.perKill} + ${num(st.killMana)}` : String(M.perKill)),
    row('pattern', `${p.count} · ${p.path === 'straight' ? I().straight : I().paths[p.path] ?? p.path}`),
    row('grace', `${num(st.invuln)} s`, `${num(H.invuln)} s`),
    row('extra', `${st.pierce >= 99 ? '∞' : st.pierce} · ×${num(st.knockback, 2)} · ×${num(st.blastMul, 2)}`),
  ];
}

/** The top of the panel: the icon large, the name, and the kind under it. */

/* ---------- drawing and choosing ---------- */

function render() {
  const list = entries(tab), i = chosen[tab] = Math.max(0, Math.min(chosen[tab], list.length - 1));
  $('invTabs').innerHTML = TABS.map(t => `<button type="button" role="tab" data-tab="${t}" aria-selected="${t === tab}">${esc(I().tabs[t])}</button>`).join('');
  const box = $('invList');
  box.classList.toggle('rows', tab === 'mage');
  box.innerHTML = list.length ? list.map((e, k) =>
    (e.section ? `<p class="sec">${esc(e.section)}</p>` : '')
    + `<button type="button" class="tile${e.dim ? ' dim' : ''}" role="option" data-i="${k}" aria-selected="${k === i}" title="${esc(e.label)}">`
    + (tab === 'mage' ? `<span class="nm">${esc(e.label)}</span>` : e.icon)
    + (e.badge ? `<b class="n">${esc(e.badge)}</b>` : '') + (e.corner ? `<b class="k">${esc(e.corner)}</b>` : '') + `</button>`,
  ).join('') : `<p class="sec">${esc(I().none)}</p>`;
  $('invDetail').innerHTML = list[i]?.detail() ?? '';
  for (const b of $('invTabs').querySelectorAll<HTMLButtonElement>('button')) b.onclick = () => { tab = b.dataset.tab as Tab; render(); };
  for (const b of box.querySelectorAll<HTMLButtonElement>('.tile')) b.onclick = () => { chosen[tab] = Number(b.dataset.i); render(); };
  box.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

/** Tiles in a row of the list, as the grid lays them out (one in the mage's tab, which is a list of rows). */
function columns() {
  if (tab === 'mage') return 1;
  const tiles = [...$('invList').querySelectorAll<HTMLElement>('.tile')];
  const top = tiles[0]?.offsetTop ?? 0;
  return Math.max(1, tiles.filter(t => t.offsetTop === top).length);
}
function move(dx: number, dy: number) {
  const n = entries(tab).length; if (!n) return;
  const step = dx + dy * columns();
  chosen[tab] = Math.max(0, Math.min(n - 1, chosen[tab] + step)); render();
}
function turn(d: number) { tab = TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length]; render(); }

/** A key while the inventory is open (or I or Tab to open it while playing). Returns true when it was used here. */
export function inventoryKey(code: string, playing: boolean) {
  if (!open) {
    if ((code === 'KeyI' || code === 'Tab') && playing) return 'open' as const;
    return false;
  }
  if (code === 'KeyI' || code === 'Tab' || code === 'Escape' || code === 'KeyP') closeInventory();
  else if (code === 'ArrowLeft' || code === 'KeyA') move(-1, 0);
  else if (code === 'ArrowRight' || code === 'KeyD') move(1, 0);
  else if (code === 'ArrowUp' || code === 'KeyW') move(0, -1);
  else if (code === 'ArrowDown' || code === 'KeyS') move(0, 1);
  else if (code === 'KeyQ') turn(-1);
  else if (code === 'KeyE') turn(1);
  else if (/^Digit[1-4]$/.test(code)) { tab = TABS[Number(code.slice(5)) - 1]; render(); }
  else return false;
  return true;
}

/** A gamepad button newly pressed while the inventory is open: the d-pad chooses, LB and RB change tabs, B closes. */
export function inventoryPad(button: number) {
  if (!open) return false;
  if (button === 1 || button === 8) closeInventory();
  else if (button === 4) turn(-1); else if (button === 5) turn(1);
  else if (button === 12) move(0, -1); else if (button === 13) move(0, 1);
  else if (button === 14) move(-1, 0); else if (button === 15) move(1, 0);
  else return false;
  return true;
}
