/* The dev menu's "Weaves and chains here" and `__game.weave(id)` (M4.10): each weave or chain set up just ahead of the mage
   (north of it) with the spells, reactions and dummies it needs, then set off, a beat at a time on sim-time timers so the
   game runs between the steps. The spells are cast through `CAST` as the mage would, mana and cooldowns aside. */
import { G, after, player } from '../state';
import { makeEnemy } from '../actors/enemies';
import { layFire } from '../actors/foes';
import { layGround } from '../actors/bestiaryGround';
import { addPool, fireAt, shockAt } from '../world/pools';
import { hallowAt, umbralAt } from '../world/mechanisms';
import { inflict } from './statusFx';
import { CAST, wardMotes } from './shapes';
import { steamAt } from './steam';
import { MAGIC } from './status';
import { spell } from './spellData';
import type { Enemy, Vec2 } from '../types';
import type { WeaveId } from './weaves';

const UP: Vec2 = { x: 0, z: -1 };
const cast = (id: string, dir: Vec2 = UP) => {
  const def = spell(id);
  return CAST[def.shape](def, dir);
};
/** A training dummy at (x, z), up at once (no rising out of the floor). */
const dummy = (x: number, z: number): Enemy => {
  const d = makeEnemy('dummy', x, z);
  d.spawn = 0;
  return d;
};
const freeze = (e: Enemy) => {
  for (let i = 0; i < MAGIC.chill.freezeAt; i++) inflict(e, { chill: 1 });
};

/** Set weave or chain `id` up ahead of the mage and set it off. */
export function setOffWeave(id: WeaveId) {
  const room = G.current,
    px = player.x,
    pz = player.z,
    q = { x: px, z: pz - 2.6 };
  switch (id) {
    case 'steamCurtain':
      cast('glacial_wall');
      after(0.4, () => cast('cinder_lance'));
      break;
    case 'conductor':
      cast('glacial_wall');
      dummy(px, pz - spell('glacial_wall').params.ahead - 0.6);
      after(0.4, () => cast('arc'));
      break;
    case 'overloadSeal':
      cast('pyre_seal');
      dummy(px, pz - 0.9);
      after(0.3, () => cast('arc'));
      break;
    case 'blackPyre':
      cast('pyre_seal');
      after(spell('pyre_seal').params.delay + 0.2, () => cast('hex_bolt'));
      break;
    case 'eclipseGround':
      cast('consecrate');
      dummy(px - 0.7, pz - 0.9);
      dummy(px + 0.7, pz - 0.9);
      after(0.3, () => cast('grasp_of_the_grave'));
      break;
    case 'hallowedHail':
      cast('consecrate');
      dummy(px, pz - 2.4);
      after(0.2, () => cast('rime_shards'));
      break;
    case 'lanternFan':
      cast('wardlight');
      dummy(px, pz - 3);
      after(0.2, () => {
        const m = wardMotes().sort((a, b) => a.z - b.z)[0];
        if (m) {
          const d = Math.hypot(m.x - player.x, m.z - player.z) || 1;
          cast('cinder_lance', { x: (m.x - player.x) / d, z: (m.z - player.z) / d });
        }
      });
      break; // (through the mote most to the north, where the dummy stands)
    case 'liveWade': {
      const c = Math.floor(px - room.bounds.minX),
        r = Math.floor(pz - room.bounds.minZ),
        tiles: { c: number; r: number }[] = [];
      for (let dr = -2; dr <= 0; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (room.template.tiles[r + dr]?.[c + dc] === 'floor') tiles.push({ c: c + dc, r: r + dr });
      addPool(room, 'water', tiles);
      dummy(px, pz - 1.5);
      cast('static_mantle');
      break;
    }
    case 'refraction':
      cast('glacial_wall');
      dummy(px, pz - spell('glacial_wall').params.ahead - 0.7);
      after(0.3, () => cast('judgement'));
      break;
    case 'tollChain':
      dummy(px, pz - 2);
      dummy(px + 0.8, pz - 3);
      cast('ferrymans_toll');
      after(0.3, () => cast('arc'));
      break;
    case 'thundercloud':
      dummy(q.x, q.z);
      steamAt(q.x, q.z);
      after(0.2, () => shockAt(q.x, q.z));
      break;
    case 'incense':
      dummy(q.x, q.z);
      steamAt(q.x, q.z);
      after(0.2, () => hallowAt(q.x, q.z));
      break;
    case 'miasma':
      dummy(q.x, q.z);
      steamAt(q.x, q.z);
      after(0.2, () => umbralAt(q.x, q.z));
      break;
    case 'blackMelt':
      layGround(room, 'blackice', q.x, q.z, 1.15, 10, '');
      after(0.3, () => fireAt(q.x, q.z, 0.4));
      break;
    case 'hailburst': {
      const a = dummy(q.x - 0.5, q.z),
        b = dummy(q.x + 0.5, q.z);
      inflict(a, { chill: 1 });
      after(0.2, () => {
        inflict(b, { burn: 4 });
        inflict(b, { shock: 1 });
      });
      break;
    }
    case 'moltenGlass': {
      for (let i = -1; i <= 1; i++) layFire(room, q.x + i * 0.5, q.z - 1, 8, '');
      const d = dummy(q.x, q.z + 0.2);
      freeze(d);
      after(0.2, () => inflict(d, { shock: 1 }));
      break;
    }
    case 'corona': {
      const a = dummy(q.x - 0.6, q.z),
        b = dummy(q.x + 0.8, q.z);
      inflict(a, { sanct: 3 });
      inflict(a, { hex: 1 });
      after(0.3, () => inflict(b, { shock: 1 }));
      break;
    }
  }
}
