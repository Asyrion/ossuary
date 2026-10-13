/* The lore card: picking something up shows what it is, in the middle of the screen, the way a soulslike
   describes an item, if a little less cryptic: its icon, name and kind, what it does, and a few lines of lore.
   Artifacts show theirs every time (data/artifacts.json); items and containers the first time in a run
   (STR.lore.items). Later kinds of things (spells, potions) show theirs through `showLore`. The card fades
   after a few seconds (the inventory keeps everything to read again); its time only runs while the game does. */
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { $ } from '../util';
import type { ArtifactDef } from '../items/artifactData';
import { HEART_PATH, RES_ICONS, SOUL_HUES, SOUL_PATH, artifactIcon, coinIconBody } from './hud';

export interface LoreEntry {
  name: string;
  kind: string;
  effect: string;
  lore: string;
  icon: string;
}
/** Things described the first time they're taken in a run: items and containers. */
export type LoreItem =
  | 'coin'
  | 'purse'
  | 'key'
  | 'glyph'
  | 'halfHeart'
  | 'heart'
  | 'mana'
  | 'paleSoul'
  | 'blackSoul'
  | 'hallowedSoul'
  | 'shard'
  | 'coffer'
  | 'chest'
  | 'gilded';

const svg = (body: string, color = 'currentColor') =>
  `<svg viewBox="0 0 24 24" style="color:${color}" aria-hidden="true">${body}</svg>`;
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const soul = (kind: keyof typeof SOUL_HUES) => {
  const [fill, rim, core] = SOUL_HUES[kind];
  return svg(
    `<path d="${SOUL_PATH}" fill="${fill}" stroke="${rim}" stroke-width="1.4"/><ellipse cx="12" cy="15.2" rx="2.3" ry="3" fill="${core}" opacity=".75"/>`,
  );
};
const box = (lid: string) => `<path d="M3 10h18v10H3z" ${S}/><path d="M3 10l2-5h14l2 5" ${S}/>${lid}`;
const ITEM_ICONS: Record<LoreItem, string> = {
  coin: svg(RES_ICONS.coins),
  purse: svg(
    `<path d="M8 7c-3 3-4 6-4 9a8 5 0 0 0 16 0c0-3-1-6-4-9z" ${S}/><path d="M7 7h10M10 4l2 3 2-3" ${S}/><circle cx="12" cy="15" r="2.4" fill="currentColor"/>`,
    '#d8a848',
  ),
  key: svg(RES_ICONS.keys),
  glyph: svg(RES_ICONS.glyphs),
  halfHeart: svg(
    `<path d="${HEART_PATH}" fill="none" stroke="#e0473a" stroke-width="1.5"/><path d="${HEART_PATH}" fill="#e0473a" clip-path="url(#halfclip)"/>`,
  ),
  heart: svg(`<path d="${HEART_PATH}" fill="#e0473a"/>`),
  mana: svg(
    `<path d="M9 3h6M10 3v4l-4 5v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7l-4-5V3" ${S}/><path d="M7 14h10v5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" fill="currentColor"/>`,
    '#6fa8ff',
  ),
  paleSoul: soul('pale'),
  blackSoul: soul('black'),
  hallowedSoul: soul('hallowed'),
  shard: svg(
    `<path d="M9 3l6 2 3 7-4 9-6-3-3-8z" fill="#3a3a4a" stroke="#8aa0d8" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.5 7l3 3-1 4 2 3" fill="none" stroke="#9ec8ff" stroke-width="1.4" stroke-linecap="round"/>`,
  ),
  coffer: svg(box(''), '#b08a5a'),
  chest: svg(box(`<circle cx="12" cy="15" r="2.6" ${S}/>`), '#8ab8ff'),
  gilded: svg(box(`<circle cx="12" cy="15" r="2.6" ${S}/>`), '#e8c060'),
};

/** An item's icon, as on its lore card (the inventory shows them too); an obol's is the face the obols wear. */
export const itemIcon = (item: LoreItem) => (item === 'coin' ? svg(coinIconBody()) : ITEM_ICONS[item]);

let el: {
  card: HTMLElement;
  icon: HTMLElement;
  name: HTMLElement;
  kind: HTMLElement;
  effect: HTMLElement;
  lore: HTMLElement;
} | null = null;
let left = 0;
const els = () =>
  (el ??= {
    card: $('lore'),
    icon: $('loreIcon'),
    name: $('loreName'),
    kind: $('loreKind'),
    effect: $('loreEffect'),
    lore: $('loreText'),
  });

/** Show a lore card, replacing any on screen: a few seconds, a little longer for longer lore (`CFG.lore`). */
export function showLore(e: LoreEntry) {
  const c = els();
  c.icon.innerHTML = e.icon;
  c.name.textContent = e.name;
  c.kind.textContent = e.kind;
  c.effect.textContent = e.effect;
  c.lore.textContent = e.lore;
  const L = CFG.lore;
  left = Math.min(L.most, L.least + e.lore.split(/\s+/).length * L.perWord);
  c.card.classList.add('on');
}

/** An artifact taken: every time, with the focus framed and cursed ones ringed in red, as in the HUD. */
export function artifactLore(def: ArtifactDef) {
  showLore({
    name: def.name,
    kind: STR.lore.kinds[def.kind] ?? def.kind,
    effect: def.text,
    lore: def.lore,
    icon: artifactIcon(def.id, def.kind === 'focus', false),
  });
}

/** An item or container taken or opened: described the first time in a run. */
export function itemLore(item: LoreItem) {
  if (G.run.loreSeen.has(item)) return;
  G.run.loreSeen.add(item);
  const t = STR.lore.items[item];
  showLore({ ...t, icon: itemIcon(item) });
}

/** The card's time runs only while the game does (not paused, not in the dev menu). */
export function updateLore(dt: number) {
  if (left <= 0 || G.state !== 'play' || player.dead) return;
  left -= dt;
  if (left <= 0) els().card.classList.remove('on');
}

/** A new run: no card left over. */
export function hideLore() {
  left = 0;
  els().card.classList.remove('on');
}
