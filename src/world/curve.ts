/* The curve (M4.9, docs/archive/M4.9-plan.md; GDD: M4.9 as built): what a floor's foes are weak to leans its pages (the library's
   lecterns, a page a boss or a fight drops) to those schools while the mage holds none of them, and a floor that walls off
   the one school the mage carries says so as the mage arrives. The rules are pure, in actors/foeData.ts. */
import { G, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { FLOORS } from './generate';
import { floorWeakness, leanSchools, wallsOff } from '../actors/foeData';
import { SCHOOLS, spell, type School } from '../magic/spellData';
import { line } from '../notify';

const floorOf = (i: number) => FLOORS[Math.min(Math.max(0, i), FLOORS.length - 1)];
/** What floor `i`'s foes are weak to, resist and drink (this floor's when not given). */
export const weaknessOf = (i = G.run.floor) => floorWeakness(floorOf(i).foes);
/** The schools floor `i`'s pages lean to. */
export const floorLean = (i = G.run.floor) => leanSchools(weaknessOf(i));
/** The schools floor `i` walls off: most of its foes resist or drink them. */
export const floorWalls = (i = G.run.floor) => SCHOOLS.filter((s) => wallsOff(weaknessOf(i), s));
/** The school all the mage's carried spells are of, if they are all of one. */
function onlySchool(): School | undefined {
  const s = [...new Set(player.spells.filter((id): id is string => !!id).map((id) => spell(id).school))];
  return s.length === 1 ? s[0] : undefined;
}
/** As the mage arrives on floor `i` (and from the dev menu): if the floor walls off the one school it carries, a line says
    so. Returns the school it warned of. */
export function warnFloor(i = G.run.floor) {
  const s = onlySchool();
  if (!s || !floorWalls(i).includes(s)) return undefined;
  line(STR.curve.walls[s], CFG.curve.lineShow);
  return s;
}
