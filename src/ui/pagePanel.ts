/* The grimoire page's panel and question (the pages themselves: magic/pages.ts). The nearest page within reach gets a
   panel over it with its spell's sheet at the stage the mage knows it; it follows the page on screen as the camera moves,
   over it if there is room above, otherwise beside it. With both slots full, a page walked into asks which spell to give
   up (the panel door's `askPage`); the answer is a spell key, which the game's own step hears (`answerPage`). */
import * as THREE from 'three';
import { G, player } from '../state';
import { STR } from '../strings';
import type { Page } from '../types';
import { spell } from '../magic/spellData';
import { castsOf, stage } from '../magic/memory';
import { boonsChanged } from '../progression/boons';
import { camera, canvas } from '../render/renderer';
import { spellIcon } from '../render/icons';
import { spellSheet } from './spellPanel';
import { showPrompt } from './hud';
import { on } from '../events';

const panelAt = new THREE.Vector3();
let shown: { page: Page; stage: string; boons: number; run: object; w: number; h: number } | null = null,
  view: DOMRect | null = null;
if (typeof window !== 'undefined')
  window.addEventListener('resize', () => {
    view = null;
  });
/** Every step while playing: the panel over `near`, the page within reach (magic/pages.ts' `pageNear`), or none. */
export function updatePagePanel(near: Page | null) {
  const el = document.getElementById('pagePanel');
  if (!el) return;
  if (!near) {
    hidePagePanel();
    return;
  }
  const st = stage(near.spell),
    boons = boonsChanged; // (a boon taken changes what the panel says)
  if (shown?.page !== near || shown.stage !== st || shown.boons !== boons || shown.run !== G.run) {
    // new content: measured once here, not every step
    el.innerHTML = spellSheet(spell(near.spell), st, '', castsOf(near.spell));
    el.classList.add('on');
    shown = { page: near, stage: st, boons, run: G.run, w: el.offsetWidth, h: el.offsetHeight };
  }
  // over the page if there is room above it on screen, otherwise beside it (the mage comes from below: never there)
  const r = (view ??= canvas.getBoundingClientRect()),
    { w, h } = shown;
  panelAt.set(near.x, near.kind === 'loose' ? 1.1 : 1.8, near.z).project(camera);
  const px = r.left + ((panelAt.x + 1) / 2) * r.width,
    py = r.top + ((1 - panelAt.y) / 2) * r.height;
  let x = Math.max(r.left + w / 2 + 8, Math.min(r.right - w / 2 - 8, px)),
    y = py - h - 6;
  if (y < r.top + 8) {
    // on its outer side (a row of pages across the room keeps its neighbours in sight), if that side has room
    const left = px - 56 - w >= r.left + 8,
      right = px + 56 + w <= r.right - 8,
      outerLeft = px < r.left + r.width / 2;
    x = (outerLeft ? left || !right : !right && left) ? px - 56 - w / 2 : px + 56 + w / 2;
    y = Math.max(r.top + 8, Math.min(r.bottom - h - 8, py - 24));
  }
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
}
export function hidePagePanel() {
  shown = null;
  document.getElementById('pagePanel')?.classList.remove('on');
}
/** The spell whose panel shows, if any (tests). */
export const pagePanelSpell = () => shown?.page.spell ?? null;

/** Both slots full: the page of `id` asks which of the two spells held to give up (its keys and buttons beside each). */
export function askPage(id: string) {
  const keys = STR.controls.spellsKeys.split(' and '),
    pad = STR.controls.spellsPad.split(' and ');
  const opts = player.spells.map(
    (held, i) => `<span class="opt"><b>${keys[i]} · ${pad[i]}</b>${spellIcon(held!)}${spell(held!).name}</span>`,
  );
  showPrompt(
    `<p>${STR.pages.ask(spell(id).name)}</p><div class="opts">${opts.join(`<i>${STR.pages.or}</i>`)}</div><small>${STR.pages.keep}</small>`,
  );
}

/** The page's panel listens to the game (main.ts calls this at boot). */
export function initPagePanel() {
  on('pagesCleared', () => hidePagePanel());
}
