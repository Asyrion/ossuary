/* The HUD's potion belt (the potions themselves: items/potions.ts): a slot for each potion it can hold, the chosen one lit,
   an unknown one marked, and its keys. Drawn again whenever the belt changes (the `beltChanged` event). */
import { G, player } from '../state';
import { STR } from '../strings';
import { on } from '../events';
import type { PotionId } from '../items/alchemyData';
import { bottleIconUrl } from '../items/alchemyLooks';
import { beltSlots, knownPotion, potionName } from '../items/potions';

export function renderBelt() {
  const box = document.getElementById('belt');
  if (!box) return;
  const n = beltSlots(),
    keys = STR.controls.potionKeys;
  let html = '';
  for (let i = 0; i < n; i++) {
    const id = player.belt[i] as PotionId | undefined,
      lit = id && i === Math.min(player.beltAt, player.belt.length - 1);
    html += `<div class="bslot${id ? '' : ' empty'}${lit ? ' on' : ''}" title="${id ? potionName(id) : ''}">${id ? `<img class="px" src="${bottleIconUrl(G.run.bottles[id])}" alt="">${knownPotion(id) ? '' : '<i>?</i>'}` : ''}</div>`;
  }
  box.innerHTML = html + `<b>${keys}</b>`;
}

/** The belt listens to the game (main.ts calls this at boot). */
export function initBelt() {
  on('beltChanged', () => renderBelt());
}
