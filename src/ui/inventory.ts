/* The inventory: what the mage carries and knows, in tabs (artifacts, spells, M5's potions, items, the mage's own numbers,
   and M4.7's foes met), the
   chosen entry described in a panel beside them: its icon, name and kind, what it does, its numbers and its lore.
   Opened with I or Tab (the gamepad's View button), or from the pause menu; the game waits while it's open.
   Arrows choose, Q and E (LB and RB) change tabs, and I, Tab or Esc (B) close it again. */
import { CFG } from '../config';
import { G, player } from '../state';
import { STR, foeName } from '../strings';
import { $ } from '../util';
import { artifact, focusPattern, halveStat, type StatKey } from '../items/artifactData';
import { LOOT, SOULS } from '../items/loot';
import { SCHOOLS, SPELL_DEFS, spell } from '../magic/spellData';
import { REACTION_IDS, atLeast } from '../magic/knowledge';
import { castsOf, reactionsFound, stage, weavesFound } from '../magic/memory';
import { esc, head, pairIcon, reactionIcon, reactionSheet, spellSheet, weaveSheet } from './spellPanel';
import { WEAVES, WEAVE_IDS } from '../magic/weaves';
import { showScreen } from './screens';
import { artifactIcon, soulSvg, spellIcon } from './hud';
import { itemIcon } from './lore';
import { FOES, FOE_IDS } from '../actors/foeData';
import { bestiary } from '../actors/bestiary';
import { countersOf } from '../actors/counterData';
import { SCHOOL_LIGHT } from '../render/arcane';
import { BOSS_TYPES } from '../config';
import { POTIONS, POTION_IDS, REAGENTS, REAGENT_IDS, type PotionId } from '../items/alchemyData';
import { bottleIconUrl, reagentIconUrl } from '../items/alchemyLooks';
import { beltSlots, knownPotion, potionName } from '../items/potions';
import { brewedPotions } from '../items/alchemyMemory';
import { knownRecipes } from '../items/brewing';

type Tab = 'artifacts' | 'spells' | 'potions' | 'items' | 'mage' | 'foes';
const TABS: Tab[] = ['artifacts', 'spells', 'potions', 'items', 'mage', 'foes'];
/** One entry in a tab: a tile (or a row, in the mage's tab) and what the panel says of it. */
interface Entry { icon: string; label: string; badge?: string; corner?: string; dim?: boolean; section?: string; detail: () => string }

const I = () => STR.inv;
const num = (v: number, d = 1) => String(+v.toFixed(d));
/** Half hearts as hearts: 5 → "2½", 1 → "½". */
const halves = (h: number) => h % 2 ? `${h > 1 ? Math.floor(h / 2) : ''}½` : String(h / 2);

let open = false, tab: Tab = 'artifacts', back: 'pause' | 'play' = 'play';
const chosen: Record<Tab, number> = { artifacts: 0, spells: 0, potions: 0, items: 0, mage: 0, foes: 0 };
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
  if (t === 'potions') return potionEntries();
  if (t === 'items') return itemEntries();
  if (t === 'foes') return foeEntries();
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
    sealed entry for each one not met yet; each described as far as the mage knows it (ui/spellPanel.ts). Last, M4.8's
    wheel of reactions: one entry for each pair of schools, found or not yet. */
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
  // the wheel of reactions (M4.8): every pair of the schools, lit as found, once the book is open or one is found
  const found = reactionsFound(), wheel: Entry[] = book.length || found.length ? REACTION_IDS.map((r, i) => ({
    icon: reactionIcon(r, found.includes(r)), label: found.includes(r) ? STR.reactions[r] : K.unfound, dim: !found.includes(r),
    section: i === 0 ? K.wheel : undefined, detail: () => reactionSheet(r),
  })) : [];
  const woven = weavesFound(), weaves: Entry[] = book.length || woven.length ? WEAVE_IDS.map((id, i) => ({ // (M4.10)
    icon: pairIcon(WEAVES[id].schools, woven.includes(id), WEAVES[id].kind === 'weave'), label: woven.includes(id) ? STR.weaves[id].name : K.unfound, dim: !woven.includes(id),
    section: i === 0 ? K.weavesSec : undefined, detail: () => weaveSheet(id),
  })) : [];
  return [...slots, ...book, ...wheel, ...weaves];
}
/** A page not found yet: a sealed leaf. */
const SEALED = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 7h17l7 7v27H13z" fill="#3a3128" stroke="#7a6a52" stroke-width="2"/><circle cx="25" cy="27" r="6" fill="#6a2a20" stroke="#a8503c" stroke-width="1.5"/><path d="M22 27h6M25 24v6" stroke="#e0b08a" stroke-width="1.4"/></svg>';

/** The Potions tab (M5): the belt's slots (the chosen one marked), the reagents in the pouch, then every potion as known:
    its bottle this run, what it does drunk and thrown, and how it is known; one not known yet is sealed. */
function potionEntries(): Entry[] {
  const P = I().potions, img = (src: string) => `<img class="px" src="${src}" alt="">`;
  const card = (id: PotionId, note: string) => {
    const def = POTIONS[id], icon = img(bottleIconUrl(G.run.bottles[id]));
    if (!knownPotion(id)) return head(icon, STR.alchemy.unknown, note) + `<p class="effect">${esc(P.unknownText)}</p>`;
    return head(icon, def.name, `${STR.alchemy.kind(def.bad)} · ${note}`)
      + `<p class="effect"><b>${esc(STR.alchemy.drink)}</b> ${esc(def.text.drink)}</p><p class="effect"><b>${esc(STR.alchemy.throw)}</b> ${esc(def.text.throw)}</p><p class="lore">${esc(def.lore)}</p>`;
  };
  const at = Math.min(player.beltAt, player.belt.length - 1);
  const belt: Entry[] = Array.from({ length: beltSlots() }, (_, k) => {
    const id = player.belt[k] as PotionId | undefined, section = k === 0 ? P.belt : undefined;
    if (!id) return { icon: SEALED_SLOT, label: P.emptySlot, dim: true, section, detail: () => head(SEALED_SLOT, P.slot(k + 1), P.emptySlot) + `<p class="effect">${esc(P.emptyText)}</p>` };
    return { icon: img(bottleIconUrl(G.run.bottles[id])), label: potionName(id), corner: knownPotion(id) ? undefined : '?', badge: k === at ? '•' : undefined, section,
      detail: () => card(id, k === at ? `${P.slot(k + 1)} · ${P.chosen}` : P.slot(k + 1)) };
  });
  const held = REAGENT_IDS.filter(r => (player.reagents[r] ?? 0) > 0);
  const pouch: Entry[] = held.length ? held.map((r, k) => {
    const def = REAGENTS[r], icon = img(reagentIconUrl(r)), n = player.reagents[r];
    return { icon, label: def.name, badge: String(n), section: k === 0 ? P.pouch : undefined,
      detail: () => head(icon, def.name, `${STR.alchemy.reagentKind} · ${P.held(n)}`) + `<p class="effect">${esc(STR.alchemy.leans(def.leans))}</p><p class="lore">${esc(def.lore)}</p>` };
  }) : [{ icon: SEALED_SLOT, label: P.pouch, dim: true, section: P.pouch, detail: () => `<p class="effect">${esc(P.noReagents)}</p>` }];
  const brewed = brewedPotions();
  const known: Entry[] = POTION_IDS.map((id, k) => knownPotion(id)
    ? { icon: img(bottleIconUrl(G.run.bottles[id])), label: POTIONS[id].name, section: k === 0 ? P.known : undefined, detail: () => card(id, P.knownHow(brewed.includes(id) && !G.run.identified.includes(id))) }
    : { icon: SEALED, label: P.sealed, dim: true, section: k === 0 ? P.known : undefined, detail: () => head(SEALED, P.sealed, STR.alchemy.kind()) + `<p class="effect">${esc(P.sealedText)}</p>` });
  const recipes = knownRecipes(), book: Entry[] = recipes.length ? recipes.map((r, k) => {
    const icon = knownPotion(r.potion) ? img(bottleIconUrl(G.run.bottles[r.potion])) : SEALED_SLOT, name = knownPotion(r.potion) ? POTIONS[r.potion].name : STR.alchemy.unknown;
    return { icon, label: `${P.recipe(REAGENTS[r.a].name, REAGENTS[r.b].name)} → ${name}`, section: k === 0 ? P.recipes : undefined,
      detail: () => head(icon, name, P.recipes) + `<p class="effect">${esc(P.recipe(REAGENTS[r.a].name, REAGENTS[r.b].name))}</p>` };
  }) : [{ icon: SEALED_SLOT, label: P.recipes, dim: true, section: P.recipes, detail: () => `<p class="effect">${esc(P.noRecipes)}</p>` }];
  return [...belt, ...pouch, ...known, ...book];
}
/** An empty belt slot or pouch: a dashed ring. */
const SEALED_SLOT = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="none" stroke="#5a4a38" stroke-width="2" stroke-dasharray="4 4"/></svg>';

function itemEntries(): Entry[] {
  const M = CFG.mana, st = player.stats;
  const item = (k: 'coin' | 'key' | 'glyph', count: number): Entry => {
    const t = STR.lore.items[k];
    return { icon: itemIcon(k), label: t.name, badge: String(count), detail: () => head(itemIcon(k), t.name, `${t.kind} · ${count}`) + `<p class="effect">${esc(t.effect)}</p><p class="lore">${esc(t.lore)}</p>` };
  };
  const H = I().hearts, MI = I().manaItem, SO = I().souls;
  return [
    { icon: itemIcon('heart'), label: H.name, badge: halves(player.hp),
      detail: () => head(itemIcon('heart'), H.name, `${H.kind} · ${I().of(halves(player.hp), halves(player.maxHp))}`) + `<p class="effect">${esc(H.effect)}</p>` },
    { icon: itemIcon('mana'), label: MI.name, badge: String(Math.round(player.mana)),
      detail: () => head(itemIcon('mana'), MI.name, `${MI.kind} · ${I().of(String(Math.round(player.mana)), String(st.maxMana))}`)
        + `<p class="effect">${esc(st.effects.has('noRegen') ? MI.noRegen : MI.effect(M.calm, M.fight, M.perKill))}</p>` },
    { icon: soulSvg(player.souls[player.souls.length - 1] ?? 'pale'), label: SO.name, badge: String(player.souls.length),
      detail: () => head(soulSvg(player.souls[player.souls.length - 1] ?? 'pale'), SO.name, `${SO.kind} · ${player.souls.length ? SO.held(...SOULS.map(k => player.souls.filter(s => s === k).length) as [number, number, number]) : SO.none}`)
        + `<p class="effect">${esc(SO.effect)}</p>` },
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

/** A foe's tile: a dark face with two eyes in its school's light. */
const foeIcon = (color: string) => `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="25" r="17" fill="#1c1820" stroke="${color}" stroke-width="2.5"/><path d="M14 18l6 3M34 18l-6 3" stroke="${color}" stroke-width="2" stroke-linecap="round"/><ellipse cx="18.5" cy="25" rx="3" ry="2" fill="${color}"/><ellipse cx="29.5" cy="25" rx="3" ry="2" fill="${color}"/><path d="M17 33q7 4 14 0" stroke="${color}" stroke-width="1.6" fill="none"/></svg>`;
const css = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** The Foes tab (M4.7): every foe the mage has met, by floor, then the bosses: its weakness and resistance once found
    (an elemental drinks its own school), and its counters, found ones described and the rest sealed. Kept between runs
    (actors/bestiary.ts); M7's bestiary at the Vigil grows from it. */
function foeEntries(): Entry[] {
  const book = bestiary(), F = I().foes, chip = (label: string, found: boolean, school: string, good: boolean) =>
    `<span class="chip${found ? good ? ' good' : ' bad' : ''}">${esc(label)} ${esc(found ? STR.schools[school] : F.unknown)}</span>`;
  const met = FOE_IDS.filter(id => book[id]?.met).sort((a, b) => (FOES[a].floor || 9) - (FOES[b].floor || 9));
  const out: Entry[] = met.map((id, k) => {
    const def = FOES[id], rec = book[id], all = countersOf(id), found = rec.counters ?? [], icon = foeIcon(css(SCHOOL_LIGHT[def.school]));
    const where = F.floor(def.floor), newFloor = k === 0 || FOES[met[k - 1]].floor !== def.floor;
    return {
      icon, label: foeName(id), badge: all.length ? `${found.filter(c => all.includes(c)).length}/${all.length}` : undefined, section: newFloor ? where : undefined,
      detail: () => head(icon, foeName(id), F.kind(STR.schools[def.school], where))
        + `<div class="chips">${chip(F.weak, rec.weak, def.weak, true)}${chip(def.elemental ? F.drinks : F.resist, rec.resist, def.resist, false)}</div>`
        + `<p class="lbl">${esc(F.counters)}</p>`
        + (all.length ? all.map(c => found.includes(c) ? `<p class="effect"><b>${esc(STR.foes.counters[c])}</b> ${esc(STR.foes.counterLines[id][c])}</p>` : `<p class="note">${esc(F.sealed)}</p>`).join('') : `<p class="note">${esc(F.noCounter)}</p>`),
    };
  });
  const bosses = BOSS_TYPES.filter(b => book[b]?.met);
  bosses.forEach((b, k) => {
    const C = CFG.enemy[b] as { weak?: string; resist?: string }, rec = book[b], school = C.weak ? css(0xd8c8a8) : '#a89878', icon = foeIcon(school);
    out.push({
      icon, label: STR.bosses[b].name, section: k === 0 ? F.bosses : undefined,
      detail: () => head(icon, STR.bosses[b].name, STR.bosses[b].sub)
        + (C.weak && C.resist ? `<div class="chips">${chip(F.weak, rec.weak, C.weak, true)}${chip(F.resist, rec.resist, C.resist, false)}</div>` : ''),
    });
  });
  if (!out.length) out.push({ icon: foeIcon('#5a5060'), label: F.noneMet, dim: true, detail: () => `<p class="effect">${esc(F.noneMet)}</p>` });
  return out;
}

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
  else if (/^Digit[1-6]$/.test(code)) { tab = TABS[Number(code.slice(5)) - 1]; render(); }
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
