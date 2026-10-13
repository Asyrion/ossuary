/* Where reagents come from (M5 step 5, docs/archive/M5-plan.md; GDD: Potions and alchemy): now and then a fallen foe leaves its
   own (a few kinds have one: Sporelings leave Grave Moss, golems Bone Dust), else its school's, and one that died burning
   leaves Ember Salt; a boss always leaves Warden's Ash; a broken bone pile, skull heap, root, glowcap, sack or cask now
   and then leaves the reagent it holds, as does a brazier the first time it is lit; M5 step 9: a foe that fell overgrown
   leaves Bloom Petal, and a flowering plant more often than the others. The rules are data (`sources` in
   data/alchemy.json, `reagentFor`), the chances `CFG.alchemy.reagent`; the Alchemist's Satchel (M5 step 8) makes them
   come more often. */
import { CFG } from '../config';
import { DEV, G, player } from '../state';
import { freeSpotNear } from '../world/rooms';
import { spawnPickup } from './pickups';
import { reagentFor, type ReagentId } from './alchemyData';
import type { Enemy } from '../types';
import { boonActs, boonRank } from '../progression/boonHooks';

const R = () => CFG.alchemy.reagent;
const more = () => (DEV.reagents ? Infinity : player.stats.effects.has('satchel') ? R().satchelMul : 1); // (the dev menu: always)
function drop(id: ReagentId | null, x: number, z: number) {
  if (!id) return;
  const p = freeSpotNear(G.current, x, z);
  spawnPickup('reagent', p.x, p.z, { reagent: id, rise: true });
}

/** A foe falls: now and then its reagent (a boss's every time). */
export function foeReagent(e: Enemy) {
  if (e.type === 'dummy') return;
  if (e.isBoss) {
    drop(reagentFor({ boss: true }), e.x + 0.8, e.z);
    return;
  }
  const rolled = G.run.reagents.chance(Math.min(1, R().foe * more())),
    sure = !rolled && !!e.weakBlow && boonRank('scavenger') > 0; // (the roll drawn either way: seeds replay)
  if (!rolled && !sure) return;
  const s = e.status;
  drop(
    (s?.burn ?? 0) > 0
      ? 'emberSalt'
      : (s?.grow ?? 0) > 0 || s?.bloom
        ? 'bloomPetal'
        : reagentFor({ foe: e.foe?.id, school: e.foe?.school }),
    e.x,
    e.z,
  );
  if (sure) boonActs('scavenger', e.x, e.z); // (M6: Scavenger, struck down by its weakness)
}
/** An object breaks (or a brazier is first lit): now and then the reagent it holds. */
export function objectReagent(kind: string, x: number, z: number) {
  if (!G.run.reagents.chance(Math.min(1, (kind === 'blossom' ? R().blossom : R().object) * more()))) return;
  drop(reagentFor({ object: kind }), x, z);
}
