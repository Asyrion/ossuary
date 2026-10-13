/* The Vigil's HUD (the place: vigil/place.ts): what is kept between descents, the Arcane Dust and the obols, redrawn when
   it changes; and the body's `vigil` class, which hides the HUD's run parts while the mage is there. */
import { STR } from '../strings';
import { on } from '../events';
import { vigil } from '../vigil/save';

let shown = '';
/** Each step at the Vigil (its hook slot, `vigilUi.step`). */
export function renderVigilHud() {
  const v = vigil(),
    H = STR.vigil.hud,
    key = v.dust + ':' + v.obols;
  if (key === shown) return;
  shown = key;
  document.getElementById('vigilHud')!.innerHTML =
    `<span><b>${v.dust}</b><small>${H.dust}</small></span><span><b>${v.obols}</b><small>${H.obols}</small></span>`;
}

/** The Vigil's HUD listens to the game (main.ts calls this at boot). */
export function initVigilHud() {
  on('vigilLeft', () => {
    shown = '';
  });
  on('atVigil', (p) => document.body.classList.toggle('vigil', p.on));
}
