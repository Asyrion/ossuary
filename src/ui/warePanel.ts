/* The panel over a merchant's ware: coming near one shows what it is before it is bought (a
   ware is bought by walking into it): its icon, name and kind, what it does, its price, and why he would refuse it now if
   he would. The merchant's shop and the Wandering Merchant's wares alike. The grimoire page's panel's way (magic/pages.ts):
   a dark card over the ware, or beside it when there is no room above; written again only when what it says changes. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { camera, canvas } from '../render/renderer';
import { artifactIcon } from './hud';
import { esc, head } from './spellPanel';
import { itemIcon } from './lore';
import type { LoreItem } from '../types';
import { POTIONS, REAGENTS, type PotionId, type ReagentId } from '../items/alchemyData';
import { knownPotion } from '../items/potions';
import { bottleIconUrl, reagentIconUrl } from '../items/alchemyLooks';
import { priceNow, refusal } from '../items/merchant';
import type { WareSpot } from '../types';
import { rune, type RuneId } from '../magic/runeData';
import { runeIconImg } from '../items/runeLooks';
import { runeFitsText } from '../magic/runes';

const at = new THREE.Vector3();
let shown: { w: WareSpot; key: string; wd: number; ht: number } | null = null;
const img = (src: string) => `<img class="px" src="${src}" alt="">`;

/** What ware `w` is, as the panel says it: icon, name, kind and what it does. */
function described(w: WareSpot) {
  if (w.def)
    return {
      icon: artifactIcon(w.def.id, w.def.kind === 'focus', false),
      name: w.def.name,
      kind: STR.lore.kinds[w.def.kind] ?? w.def.kind,
      effect: w.def.text,
    };
  if (w.potion) {
    const id = w.potion as PotionId,
      def = POTIONS[id],
      icon = img(bottleIconUrl(G.run.bottles[id]));
    if (!knownPotion(id)) {
      const u = STR.lore.items.potion;
      return { icon, name: u.name, kind: u.kind, effect: u.effect };
    }
    return {
      icon,
      name: def.name,
      kind: STR.alchemy.kind(def.bad),
      effect: `${STR.alchemy.drink}: ${def.text.drink}. ${STR.alchemy.throw}: ${def.text.throw}.`,
    };
  }
  if (w.rune) {
    const id = w.rune as RuneId,
      r = rune(id);
    return { icon: runeIconImg(id), name: r.name, kind: STR.runes.kind, effect: `${r.text}. ${runeFitsText(id)}` };
  }
  if (w.reagent) {
    const r = REAGENTS[w.reagent as ReagentId];
    return {
      icon: img(reagentIconUrl(w.reagent as ReagentId)),
      name: r.name,
      kind: STR.alchemy.reagentKind,
      effect: STR.alchemy.leans(r.leans),
    };
  }
  if (w.ware === 'map' || w.ware === 'secret') {
    const c = STR.shop.crow[w.ware];
    return { icon: '', name: c.name, kind: c.kind, effect: c.effect };
  }
  const t = STR.lore.items[w.ware as LoreItem];
  return { icon: itemIcon(w.ware as LoreItem), name: t.name, kind: t.kind, effect: t.effect };
}

/** Every step while playing: the panel over the nearest ware still for sale within reach, or none. */
export function updateWarePanel() {
  const el = document.getElementById('warePanel');
  if (!el) return;
  let near: WareSpot | null = null,
    best = CFG.merchant.panelReach + player.r;
  for (const w of G.room.current.wares ?? []) {
    if (w.sold) continue;
    const d = Math.hypot(player.x - w.x, player.z - w.z);
    if (d < best) {
      best = d;
      near = w;
    }
  }
  if (!near) {
    hideWarePanel();
    return;
  }
  const price = priceNow(near),
    no = refusal(near),
    d = described(near),
    key = `${d.name}|${price}|${no}|${d.effect}`;
  if (shown?.w !== near || shown.key !== key) {
    // (written and measured only when what it says changes)
    const S = STR.shop,
      was = price < near.price ? ` ${S.was(near.price)}` : '';
    el.innerHTML =
      head(d.icon, d.name, d.kind) +
      `<p class="effect">${esc(d.effect)}</p>` +
      `<div class="chips"><span class="chip price">${esc(price ? S.price(price) + was : S.free)}</span></div>` +
      `<p class="note${no ? ' refuse' : ''}">${esc(no ?? S.walkIn)}</p>`;
    el.classList.add('on');
    shown = { w: near, key, wd: el.offsetWidth, ht: el.offsetHeight };
  }
  const r = canvas.getBoundingClientRect(),
    { wd, ht } = shown;
  at.set(near.x, 2.2, near.z).project(camera); // (over the price tag)
  const px = r.left + ((at.x + 1) / 2) * r.width,
    py = r.top + ((1 - at.y) / 2) * r.height;
  let x = Math.max(r.left + wd / 2 + 8, Math.min(r.right - wd / 2 - 8, px)),
    y = py - ht - 6;
  if (y < r.top + 8) {
    x = px < r.left + r.width / 2 ? px + 70 + wd / 2 : px - 70 - wd / 2;
    y = Math.max(r.top + 8, Math.min(r.bottom - ht - 8, py));
  } // (no room above: beside it)
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
}
export function hideWarePanel() {
  shown = null;
  document.getElementById('warePanel')?.classList.remove('on');
}
/** The ware whose panel shows, by name (the tests). */
export const warePanelNow = () => shown && { name: described(shown.w).name, refused: !!refusal(shown.w) };
