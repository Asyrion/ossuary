/* The alchemy table (M5 step 6, docs/archive/M5-plan.md; GDD: Potions and alchemy, Brewing): a screen like the inventory's that
   opens when the mage walks up to the table in Dr. Jelly's laboratory (world/laboratory.ts), and waits while it's open.
   Three tabs: Brew (two reagents from the pouch into the mortar, then the flask brews them, items/brewing.ts: a pair
   brewed or bought before says what it makes), Dr. Jelly looks (one unknown potion in the belt identified free, once a
   visit) and Recipes (every potion's recipe, those known with their pair, the rest for sale). Arrows choose, Enter
   takes, Q and E (LB and RB) change tabs, Esc (B) closes; tiles can be clicked. */
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { $ } from '../util';
import { showScreen } from './screens';
import { esc, head } from './spellPanel';
import { POTIONS, REAGENTS, REAGENT_IDS, type PotionId, type ReagentId } from '../items/alchemyData';
import { bottleIconUrl, reagentIconUrl } from '../items/alchemyLooks';
import { knownPotion, potionName } from '../items/potions';
import {
  RECIPE_POTIONS,
  brewNow,
  buyRecipe,
  canBrew,
  jellyIdentifies,
  knownBrew,
  knownRecipes,
} from '../items/brewing';
import { stirAfterBrew } from '../world/laboratory';
import { UI, type LabTab } from '../panels';

export type { LabTab };
const TABS: LabTab[] = ['brew', 'identify', 'recipes'];
interface Entry {
  icon: string;
  label: string;
  badge?: string;
  dim?: boolean;
  section?: string;
  detail: () => string;
  act?: () => void;
}

let open = false,
  tab: LabTab = 'brew';
const chosen: Record<LabTab, number> = { brew: 0, identify: 0, recipes: 0 };
let mortar: ReagentId[] = [];
let actions: { pause(): void; resume(): void } = { pause: () => {}, resume: () => {} };

/** How the game pauses and goes on (flow's, from main.ts). */
export function initLab(a: { pause(): void; resume(): void }) {
  actions = a;
}
export const labOpen = () => open;
/** What the table shows, for the tests: open, the tab, the mortar. */
export const labNow = () => ({ open, tab, mortar: [...mortar] });

/** Open the table at a tab (the game waits). */
export function openLab(t: LabTab) {
  if (open) return;
  open = UI.labOpen = true;
  tab = t;
  mortar = [];
  actions.pause();
  showScreen('lab');
  render();
  Sfx.potionChoose();
}
export function closeLab() {
  if (!open) return;
  open = UI.labOpen = false;
  mortar = [];
  actions.resume();
}

const P = () => STR.lab;
const img = (src: string) => `<img class="px" src="${src}" alt="">`;
const bottle = (id: PotionId) => img(bottleIconUrl(G.run.bottles[id]));
const reagentImg = (r: ReagentId) => img(reagentIconUrl(r));
/** A flask for the brew tile, a crossed ring for emptying the mortar, a sealed leaf. */
const FLASK =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M19 8h10M21 8v10l-9 16a4 4 0 0 0 4 6h16a4 4 0 0 0 4-6l-9-16V8" fill="none" stroke="#c8ffb0" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 31h18l3 5a2 2 0 0 1-2 3H14a2 2 0 0 1-2-3z" fill="#7ae070"/></svg>';
const CLEAR =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="26" r="12" fill="none" stroke="#a99b80" stroke-width="2.5"/><path d="M16 18l16 16M32 18L16 34" stroke="#a99b80" stroke-width="2.5"/></svg>';
const SEALED =
  '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 7h17l7 7v27H13z" fill="#3a3128" stroke="#7a6a52" stroke-width="2"/><circle cx="25" cy="27" r="6" fill="#2a5a2a" stroke="#7ae070" stroke-width="1.5"/></svg>';

/** How many of a reagent are left in the pouch, the mortar's taken out. */
const left = (r: ReagentId) => (player.reagents[r] ?? 0) - mortar.filter((m) => m === r).length;
function mortarHtml() {
  const names = [0, 1].map((i) => (mortar[i] ? esc(REAGENTS[mortar[i]].name) : `<i>${esc(P().empty)}</i>`));
  let out = `<p class="lbl">${esc(P().mortar)}</p><p class="effect">${names.join(' + ')}</p>`;
  if (mortar.length === 2) {
    const k = knownBrew(mortar[0], mortar[1]);
    out += k
      ? `<div class="top"><div class="big">${bottle(k)}</div><p class="effect">${esc(P().brews(potionName(k)))}</p></div>`
      : `<p class="note">${esc(P().experiment)}</p>`;
  }
  return out;
}

function entries(t: LabTab): Entry[] {
  const L = P();
  if (t === 'brew') {
    const held = REAGENT_IDS.filter((r) => (player.reagents[r] ?? 0) > 0);
    const out: Entry[] = held.map((r, k) => ({
      icon: reagentImg(r),
      label: REAGENTS[r].name,
      badge: String(left(r)),
      dim: left(r) <= 0,
      section: k === 0 ? L.tabs.brew : undefined,
      detail: () =>
        head(
          reagentImg(r),
          REAGENTS[r].name,
          `${STR.alchemy.reagentKind} · ${STR.inv.potions.held(player.reagents[r] ?? 0)}`,
        ) +
        `<p class="effect">${esc(STR.alchemy.leans(REAGENTS[r].leans))}</p>` +
        mortarHtml() +
        `<p class="note">${esc(L.pickTwo)}</p>`,
      act: () => {
        if (left(r) > 0 && mortar.length < 2) {
          mortar.push(r);
          Sfx.potionChoose();
        }
      },
    }));
    if (!held.length)
      out.push({
        icon: SEALED,
        label: L.noReagents,
        dim: true,
        detail: () => `<p class="effect">${esc(L.noReagents)}</p>`,
      });
    out.push({
      icon: FLASK,
      label: L.brewTile,
      dim: mortar.length < 2,
      detail: () =>
        head(FLASK, L.brewTile, '') + mortarHtml() + (mortar.length < 2 ? `<p class="note">${esc(L.needTwo)}</p>` : ''),
      act: () => {
        if (mortar.length < 2 || !canBrew(mortar[0], mortar[1])) {
          Sfx.spellFail();
          return;
        }
        const lab = G.current.lab;
        brewNow(mortar[0], mortar[1], lab?.table.x ?? player.x, lab?.table.z ?? player.z);
        mortar = [];
        stirAfterBrew();
      },
    });
    out.push({
      icon: CLEAR,
      label: L.clearTile,
      dim: !mortar.length,
      detail: () => head(CLEAR, L.clearTile, '') + mortarHtml(),
      act: () => {
        mortar = [];
      },
    });
    return out;
  }
  if (t === 'identify') {
    const used = !!G.current.lab?.identified,
      unknown = [...new Set(player.belt as PotionId[])].filter((id) => !knownPotion(id));
    if (!unknown.length)
      return [
        {
          icon: SEALED,
          label: L.identifyNone,
          dim: true,
          detail: () => head(SEALED, L.tabs.identify, L.jellyKind) + `<p class="effect">${esc(L.identifyNone)}</p>`,
        },
      ];
    return unknown.map((id) => ({
      icon: bottle(id),
      label: STR.alchemy.unknown,
      dim: used,
      detail: () =>
        head(bottle(id), STR.alchemy.unknown, L.jellyKind) +
        `<p class="effect">${esc(used ? L.identifyUsed : L.identifyText)}</p>`,
      act: () => {
        if (!jellyIdentifies(id)) Sfx.refuse();
      },
    }));
  }
  const known = knownRecipes(),
    price = CFG.alchemy.recipePrice;
  return RECIPE_POTIONS.map((id, k) => {
    const mine = known.find((r) => r.potion === id),
      name = knownPotion(id) ? POTIONS[id].name : potionName(id);
    const section = k === 0 ? L.tabs.recipes : undefined;
    if (mine)
      return {
        icon: knownPotion(id) ? bottle(id) : FLASK,
        label: name,
        badge: '✓',
        section,
        detail: () =>
          head(knownPotion(id) ? bottle(id) : FLASK, POTIONS[id].name, L.recipeKnownNote) +
          `<p class="effect">${esc(L.pair(REAGENTS[mine.a].name, REAGENTS[mine.b].name))}</p>` +
          (knownPotion(id) ? `<p class="lore">${esc(POTIONS[id].lore)}</p>` : ''),
      };
    return {
      icon: SEALED,
      label: POTIONS[id].name,
      badge: String(price),
      dim: player.coins < price,
      section,
      detail: () =>
        head(SEALED, POTIONS[id].name, L.recipePrice(price)) + `<p class="effect">${esc(L.recipesText(price))}</p>`,
      act: () => {
        buyRecipe(id);
      },
    };
  });
}

function render() {
  const list = entries(tab),
    i = (chosen[tab] = Math.max(0, Math.min(chosen[tab], list.length - 1)));
  $('labTabs').innerHTML = TABS.map(
    (t) => `<button type="button" role="tab" data-tab="${t}" aria-selected="${t === tab}">${esc(P().tabs[t])}</button>`,
  ).join('');
  const box = $('labList');
  box.innerHTML = list
    .map(
      (e, k) =>
        (e.section ? `<p class="sec">${esc(e.section)}</p>` : '') +
        `<button type="button" class="tile${e.dim ? ' dim' : ''}" role="option" data-i="${k}" aria-selected="${k === i}" title="${esc(e.label)}">${e.icon}${e.badge ? `<b class="n">${esc(e.badge)}</b>` : ''}</button>`,
    )
    .join('');
  $('labDetail').innerHTML = list[i]?.detail() ?? '';
  for (const b of $('labTabs').querySelectorAll<HTMLButtonElement>('button'))
    b.onclick = () => {
      tab = b.dataset.tab as LabTab;
      render();
    };
  for (const b of box.querySelectorAll<HTMLButtonElement>('.tile'))
    b.onclick = () => {
      const k = Number(b.dataset.i);
      if (chosen[tab] === k) act();
      else {
        chosen[tab] = k;
        render();
      }
    };
  box.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
function act() {
  entries(tab)[chosen[tab]]?.act?.();
  if (open) render();
}
function columns() {
  const tiles = [...$('labList').querySelectorAll<HTMLElement>('.tile')],
    top = tiles[0]?.offsetTop ?? 0;
  return Math.max(1, tiles.filter((t) => t.offsetTop === top).length);
}
function move(dx: number, dy: number) {
  const n = entries(tab).length;
  if (!n) return;
  chosen[tab] = Math.max(0, Math.min(n - 1, chosen[tab] + dx + dy * columns()));
  render();
}
function turn(d: number) {
  tab = TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length];
  render();
}

/** A key while the table is open: true when it was used here. */
export function labKey(code: string) {
  if (!open) return false;
  if (code === 'Escape' || code === 'KeyP' || code === 'KeyI' || code === 'Tab') closeLab();
  else if (code === 'ArrowLeft' || code === 'KeyA') move(-1, 0);
  else if (code === 'ArrowRight' || code === 'KeyD') move(1, 0);
  else if (code === 'ArrowUp' || code === 'KeyW') move(0, -1);
  else if (code === 'ArrowDown' || code === 'KeyS') move(0, 1);
  else if (code === 'KeyQ') turn(-1);
  else if (code === 'KeyE') turn(1);
  else if (code === 'Enter' || code === 'Space') act();
  else if (code === 'Backspace') {
    mortar = [];
    render();
  } else return false;
  return true;
}
/** A gamepad button newly pressed while the table is open: the d-pad chooses, A takes, LB and RB change tabs, B closes. */
export function labPad(button: number) {
  if (!open) return false;
  if (button === 1 || button === 8 || button === 9) closeLab();
  else if (button === 0) act();
  else if (button === 4) turn(-1);
  else if (button === 5) turn(1);
  else if (button === 12) move(0, -1);
  else if (button === 13) move(0, 1);
  else if (button === 14) move(-1, 0);
  else if (button === 15) move(1, 0);
  else return false;
  return true;
}

/** For the tests and the dev menu: put two reagents in the mortar and brew them, as Enter on the flask does. */
export function brewAtTable(a: ReagentId, b: ReagentId) {
  mortar = [a, b];
  tab = 'brew';
  const flask = entries('brew').findIndex((e) => e.icon === FLASK);
  chosen.brew = flask;
  act();
}
