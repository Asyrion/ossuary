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
import { takeBoon } from '../progression/boons';
import { afterglowCast, boonRank, magicNow, votiveCast } from '../progression/boonHooks';
import { BOON_DEFS } from '../progression/boonData';
import { POTION_IDS } from '../items/alchemyData';
import { brewedPotions } from '../items/alchemyMemory';
import { addPotion, usePotion } from '../items/potions';
import { FOES } from '../actors/foeData';
import { arrowOrder, keys } from '../input';

/** The boons the bench sets off, in the data's order (the dev menu's buttons): the school boons, and the general boons that
    act on something (Tempered is points; Second Socket waits for the runes). */
export const BENCH_BOONS = BOON_DEFS.filter(
  (b) => b.school || ['keenNose', 'scavenger', 'brewersBreath', 'afterglow'].includes(b.id),
).map((b) => b.id);

const UP: Vec2 = { x: 0, z: -1 };
const cast = (id: string, dir: Vec2 = UP) => {
  const def = spell(id);
  return CAST[def.shape](def, dir);
};
/** A training dummy at (x, z), up at once. */
const dummy = (x: number, z: number): Enemy => {
  const d = makeEnemy('dummy', x, z);
  d.spawn = 0;
  return d;
};
const hurt = () => {
  if (player.hp >= player.maxHp) {
    player.hp = Math.max(1, player.maxHp - 1);
    renderHearts();
  }
};

/** The cantrip cast once at `e` (the bench's Afterglow): the cast key held for a moment towards it. */
function cantripAt(e: Enemy) {
  const dx = e.x - player.x,
    dz = e.z - player.z,
    code = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dz > 0 ? 'ArrowDown' : 'ArrowUp';
  keys.add(code);
  arrowOrder.push(code);
  player.fireCd = 0;
  after(0.15, () => {
    keys.delete(code);
    arrowOrder.splice(arrowOrder.indexOf(code), 1);
  });
}

/** Take boon `id` if need be and set it off ahead of the mage. */
export function setOffBoon(id: string) {
  if (!boonRank(id)) takeBoon(id, false);
  const room = G.room.current,
    px = player.x,
    pz = player.z,
    q = { x: px, z: pz - 2.6 };
  room.boonsSaid?.delete(id);
  switch (id) {
    case 'deepWinter': {
      const d = dummy(q.x, q.z);
      inflict(d, { chill: 1 }, 'mage');
      after(0.35, () => inflict(d, { chill: 1 }, 'mage'));
      break;
    }
    case 'coldSnap': {
      const a = dummy(q.x - 0.55, q.z);
      dummy(q.x + 0.55, q.z);
      for (let k = 0; k < magicNow().chill.freezeAt; k++) inflict(a, { chill: 1 }, 'mage');
      break;
    }
    case 'bankedCoals': {
      const d = dummy(q.x, q.z);
      inflict(d, { burn: spell('cinder_lance').status!.burn! }, 'mage');
      break;
    }
    case 'flamekeeper': {
      dummy(q.x + 2, q.z);
      placeProp('brazier', px - 1.5, pz - 1.5);
      after(0.1, () => {
        fireAt(px - 1.5, pz - 1.5, 0.5);
        player.mana = 0;
      });
      break;
    } // (mana spent, so the flame has something to fill)
    case 'forkingArc':
      for (let k = 0; k < 8; k++) dummy(px + ((k % 4) - 1.5), pz - 1.6 - Math.floor(k / 4));
      after(0.1, () => cast('arc'));
      break; // (a block of eight, each within a leap of another)
    case 'sparkWake':
      dummy(q.x, q.z);
      after(0.1, () => cast('arc'));
      break;
    case 'votiveHeart':
      hurt();
      room.votive = false;
      room.boonMended = 0;
      dummy(q.x, q.z);
      after(0.1, () => {
        cast('consecrate');
        votiveCast();
      });
      break; // (as castSpell does after a Hallow spell)
    case 'laidBare': {
      const d = dummy(q.x, q.z);
      d.guard = 0.3;
      inflict(d, { sanct: 4 }, 'mage');
      after(0.3, () => damageEnemy(d, 10, 0, -1, 0, 'cantrip'));
      break;
    }
    case 'thirstingHex': {
      hurt();
      room.boonMended = 0;
      const d = dummy(q.x, q.z);
      inflict(d, { hex: 5 }, 'mage');
      for (let k = 1; k <= 6; k++) after(k * 0.2, () => damageEnemy(d, 1, 0, -1, 0, 'cantrip'));
      break;
    }
    case 'gatheringDark': {
      const d = dummy(q.x, q.z);
      for (let k = 0; k < 9; k++) inflict(d, { hex: 1 }, 'mage');
      break;
    }
    case 'seedfall': {
      const f = makeEnemy('sporeling', q.x, q.z);
      f.spawn = 0;
      inflict(f, { grow: 3 }, 'mage');
      after(0.4, () => damageEnemy(f, 999, 0, -1, 0, 'spell', 'verdant'));
      break;
    }
    case 'perennial': {
      const d = dummy(q.x, q.z);
      inflict(d, { grow: 4 }, 'mage');
      break;
    }
    case 'keenNose': {
      const id = POTION_IDS.find((p) => !G.run.identified.includes(p) && !brewedPotions().includes(p)) ?? 'volatile';
      addPotion(id);
      break;
    } // (one not known otherwise, into the belt)
    case 'scavenger': {
      const f = makeEnemy('sporeling', q.x, q.z);
      f.spawn = 0;
      after(0.3, () => damageEnemy(f, 999, 0, -1, 0, 'spell', FOES.sporeling.weak));
      break;
    }
    case 'brewersBreath': {
      dummy(px + 0.8, pz - 0.8);
      addPotion('liquidEmber');
      player.beltAt = player.belt.length - 1;
      after(0.2, () => usePotion('drink'));
      break;
    } // (its fire pool at the feet, sparing the mage)
    case 'afterglow': {
      const d = dummy(q.x, q.z);
      afterglowCast(spell('rime_shards').status, spell('rime_shards').color);
      after(0.1, () => cantripAt(d));
      break;
    }
  }
}
