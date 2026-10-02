/* M6 step 5: the dev menu's "Boons here" and `__game.boonHere(id)`: each school boon taken (if it isn't yet) and set off
   just ahead of the mage (north of it), on training dummies or a foe, through the same hooks the game uses, a beat at a
   time on sim-time timers so the game runs between the steps. Its name may rise again (the room forgets it said it). */
import { G, after, player } from '../state';
import { makeEnemy } from '../actors/enemies';
import { inflict } from '../magic/statusFx';
import { CAST } from '../magic/shapes';
import { spell } from '../magic/spellData';
import { damageEnemy } from '../combat/damage';
import { placeProp } from '../world/props';
import { fireAt } from '../world/pools';
import { renderHearts } from '../ui/hud';
import type { Enemy, Vec2 } from '../types';
import { takeBoon } from './boons';
import { boonRank, magicNow } from './boonHooks';
import { BOON_DEFS } from './boonData';

/** The school boons, in the data's order (the dev menu's buttons). */
export const SCHOOL_BOONS = BOON_DEFS.filter(b => b.school).map(b => b.id);

const UP: Vec2 = { x: 0, z: -1 };
const cast = (id: string, dir: Vec2 = UP) => { const def = spell(id); return CAST[def.shape](def, dir); };
/** A training dummy at (x, z), up at once. */
const dummy = (x: number, z: number): Enemy => { const d = makeEnemy('dummy', x, z); d.spawn = 0; return d; };
const hurt = () => { if (player.hp >= player.maxHp) { player.hp = Math.max(1, player.maxHp - 1); renderHearts(); } };

/** Take boon `id` if need be and set it off ahead of the mage. */
export function setOffBoon(id: string) {
  if (!boonRank(id)) takeBoon(id, false);
  const room = G.current, px = player.x, pz = player.z, q = { x: px, z: pz - 2.6 };
  room.boonsSaid?.delete(id);
  switch (id) {
    case 'deepWinter': { const d = dummy(q.x, q.z); inflict(d, { chill: 1 }, 'mage'); after(.35, () => inflict(d, { chill: 1 }, 'mage')); break; }
    case 'coldSnap': { const a = dummy(q.x - .55, q.z); dummy(q.x + .55, q.z); for (let k = 0; k < magicNow().chill.freezeAt; k++) inflict(a, { chill: 1 }, 'mage'); break; }
    case 'bankedCoals': { const d = dummy(q.x, q.z); inflict(d, { burn: spell('cinder_lance').status!.burn! }, 'mage'); break; }
    case 'flamekeeper': { dummy(q.x + 2, q.z); placeProp('brazier', px, pz - 1.4); after(.1, () => fireAt(px, pz - 1.4, .5)); break; }
    case 'forkingArc': for (let k = 0; k < 8; k++) dummy(px + (k - 3.5) * 1.25, pz - 2 + (k % 2) * .6); after(.1, () => cast('arc')); break;
    case 'sparkWake': dummy(q.x, q.z); after(.1, () => cast('arc')); break;
    case 'votiveHeart': hurt(); room.votive = false; room.boonMended = 0; dummy(q.x, q.z); break;
    case 'laidBare': { const d = dummy(q.x, q.z); d.guard = .3; inflict(d, { sanct: 4 }, 'mage'); after(.3, () => damageEnemy(d, 10, 0, -1, 0, 'cantrip')); break; }
    case 'thirstingHex': { hurt(); room.boonMended = 0; const d = dummy(q.x, q.z); inflict(d, { hex: 5 }, 'mage'); for (let k = 1; k <= 6; k++) after(k * .2, () => damageEnemy(d, 1, 0, -1, 0, 'cantrip')); break; }
    case 'gatheringDark': { const d = dummy(q.x, q.z); for (let k = 0; k < 9; k++) inflict(d, { hex: 1 }, 'mage'); break; }
    case 'seedfall': { const f = makeEnemy('sporeling', q.x, q.z); f.spawn = 0; inflict(f, { grow: 3 }, 'mage'); after(.4, () => damageEnemy(f, 999, 0, -1, 0, 'spell', 'verdant')); break; }
    case 'perennial': { const d = dummy(q.x, q.z); inflict(d, { grow: 4 }, 'mage'); break; }
  }
}
