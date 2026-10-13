/* Which bound shades walk with the mage this run (M7 step 6), for the low-level modules that read a help without the helps
   themselves (vigil/shadeHelp.ts): the chorister's song in `spellCooldown`. */
import { CFG } from '../config';
import { G } from '../state';
import { SHADES, type ShadeHelp } from './shadeData';

/** Whether a shade helping `help`'s way walks with the mage. */
export const walking = (help: ShadeHelp) => G.run.walking.some((id) => SHADES.get(id)?.help === help);
/** The spells' cooldowns while the chorister walks with the mage. */
export const singMul = () => (walking('sing') ? CFG.shadeHelp.sing.mul : 1);
