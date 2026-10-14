/* Whether the mage is at the Vigil, for the modules that behave otherwise there (no glyphs chalked, the HUD's
   run parts hidden, the music and soundscape its own), without their importing the place itself (vigil/place.ts). */
import type { RockBox } from '../types';
import type { School, SpellStatus } from '../magic/spellData';
import { emit } from '../events';

let here = false;
/** The mage is at the Vigil. */
export const atVigil = () => here;
export function setAtVigil(on: boolean) {
  here = on;
  emit('atVigil', { on }); // (the HUD's run parts hide there)
}
/** What the Vigil hears from elsewhere (set by vigil/place.ts): a bolt or beam of the mage's struck one of its barred ways. */
export const vigilHooks = {
  barStruck: (
    _rock: RockBox,
    _x: number,
    _z: number,
    _status?: Partial<Record<SpellStatus, number>>,
    _school?: School,
  ) => {}, // (`school`: a beam's own)
  /** Heard by vigil/shades.ts: a chained shade struck by a bolt or beam of the mage's (the school it carries, if any); a
      school landing on the ground at (x, z), reaching `r`; a glyph's blast there. */
  shadeStruck: (_x: number, _z: number, _school?: School) => {},
  landed: (school: School | 'blast', x: number, z: number, r: number) => {
    for (const f of landers) f(school, x, z, r);
  },
};
/** Who hears a school landing at the Vigil and in runs: the chained shades, the barred ways. */
const landers: ((school: School | 'blast', x: number, z: number, r: number) => void)[] = [];
export const hearLanding = (f: (school: School | 'blast', x: number, z: number, r: number) => void) => {
  landers.push(f);
};
