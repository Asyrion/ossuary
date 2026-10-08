/* Whether the mage is at the Vigil (M7 step 5), for the modules that behave otherwise there (no glyphs chalked, the HUD's
   run parts hidden, the music and soundscape its own), without their importing the place itself (vigil/place.ts). */
import type { RockBox } from '../types';
import type { SpellStatus } from '../magic/spellData';

let here = false;
/** The mage is at the Vigil. */
export const atVigil = () => here;
export function setAtVigil(on: boolean) { here = on; document.body.classList.toggle('vigil', on); }
/** What the Vigil hears from elsewhere (set by vigil/place.ts): a bolt or beam of the mage's struck one of its barred ways. */
export const vigilHooks = { barStruck: (_rock: RockBox, _x: number, _z: number, _status?: Partial<Record<SpellStatus, number>>) => {} };
