/* M7 step 1: the Seal (docs/M7-plan.md, decision 2): a level laid by hand below floor 5 (`fixed` in data/floors.json, built
   by `fixedPlan` in generate.ts): the Stair, where Kaelith's voice speaks the first time down; the Wardens' Last Hall, one
   fight of two waves drawn from every floor's foes, the horde pressing at the seal; and Kaelith's Hall. */
import { Sfx } from '../audio/sfx';
import { STR } from '../strings';
import type { Room } from '../types';
import { line } from '../ui/hud';
import { FLOORS } from './generate';
import { G } from '../state';

/** Whether floor `i` (the current one by default) is the Seal: a level laid by hand. */
export const atSeal = (i = G.run.floor) => !!FLOORS[i]?.fixed;
/** The floor's index that is the Seal (the last). */
export const SEAL_FLOOR = FLOORS.findIndex(f => f.fixed);

/** The mage arrives at the Seal: Kaelith's voice from under the stone. */
export function arriveAtSeal() { Sfx.sealVoice(); line(STR.seal.voice, 5); }

/** A room of the Seal entered: the Last Hall says what presses at the seal the first time. */
export function enterSealRoom(room: Room, firstVisit: boolean) {
  if (!atSeal() || !firstVisit) return;
  if (room.type === 'ordeal') line(STR.seal.horde, 4);
}
