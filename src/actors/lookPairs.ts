/* M4.12 (docs/M4.12-plan.md): the old and new looks of the foes side by side, for the owner to compare and approve (the
   Galleries tab, `__game.lookPairs(floor)`; the bosses' as floor `BOSSES`), and the contract a new look keeps
   (`lookContract`, `bossContract`, read by browser tests): every part its fight moves, by the old look's names, and about
   the old look's height. */
import * as THREE from 'three';
import type { Room } from '../types';
import { FOES } from './foeData';
import { oldLook } from './foes';
import { FANTASY_LOOKS, RETIRED } from './fantasyLooks';
import { standLook } from './modelOptions';
import { disposeTree } from '../render/materials';
import { freeSpotNear } from '../world/rooms';
import type { Built } from './beastParts';
import { BOSS_FANTASY } from './fantasyBosses';
import { OLD_BOSS_LOOKS, dragonLook, type BossBuilt } from './bossLooks';
import { serpentLook } from './serpentLooks';

/** The floor the bosses' pairs are asked for by (`lookPairs(-1)`, the sheets' `floor=boss`). */
export const BOSSES = -1;
/** The bosses with a new look waiting on the owner (the old one's builder still there). */
export const newBossLooks = () => Object.keys(BOSS_FANTASY).filter(id => OLD_BOSS_LOOKS[id]);
/** A boss's old and new looks as the pairs stand them: the dragon's and the serpent's heads with their bodies. */
function bossPair(id: string): [() => BossBuilt, () => BossBuilt] {
  const was = OLD_BOSS_LOOKS[id]!, now = BOSS_FANTASY[id]!;
  if (id === 'dragonHead') return [() => dragonLook(was), () => dragonLook(now)];
  if (id === 'serpentHead') return [() => serpentLook(was), () => serpentLook(now)];
  return [was, now];
}

/** The look ids of a floor's foes (0: the Wardlings), as the data names them. */
const floorLooks = (floor: number) => [...new Set(Object.values(FOES).filter(d => d.floor === floor).map(d => d.look ?? d.id))];
/** Every look id that has a new look waiting on the owner (its old one not yet retired), on `floor` or on every floor. */
export const newLooks = (floor?: number) => (floor === undefined ? Object.keys(FANTASY_LOOKS) : floorLooks(floor)).filter(id => FANTASY_LOOKS[id] && !RETIRED[id]);

/** Stand each of `floor`'s foes that has a new look, the old look to its left and the new to its right, in rows ahead of
    world (x, z) (a great hall holds a floor's: `?room=great_hall`); `only` names the ones to stand. */
export function showLookPairs(room: Room, x: number, z: number, floor?: number, only?: readonly string[]) {
  const boss = floor === BOSSES, gap = boss ? 5.6 : 3.2, half = boss ? 1.5 : .7, deep = boss ? 3.8 : 2.4; // (a boss stands about two units across)
  const ids = (boss ? newBossLooks() : newLooks(floor)).filter(id => !only || only.includes(id)), across = Math.max(1, Math.min(4, Math.floor((room.bounds.maxX - room.bounds.minX) / gap)));
  return ids.map((id, i) => {
    const n = Math.min(across, ids.length - Math.floor(i / across) * across), cx = x + ((i % across) - (n - 1) / 2) * gap, cz = z - (boss ? 3 : 2) - Math.floor(i / across) * deep;
    const a = freeSpotNear(room, cx - half, cz), b = freeSpotNear(room, cx + half, cz), [was, now] = boss ? bossPair(id) : [oldLook(id)!, FANTASY_LOOKS[id]!];
    standLook(room, was, 'old:' + id, a.x, a.z); standLook(room, now, 'new:' + id, b.x, b.z);
    return { id, old: a, new: b };
  });
}

/** How tall a look stands (its idle at rest), and the names of the parts it moves. */
function measure(build: () => Built) {
  const b = build(); b.idle(0); b.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(b.group), parts = Object.keys(b.parts ?? {});
  disposeTree(b.group); // (its geometries and materials, the shared ones aside)
  return { h: +(box.max.y - box.min.y).toFixed(2), parts };
}
/** For each new look: the parts the old look's behaviour moves that it lacks, and both heights (an approved look's old
    ones from `RETIRED`, its builder gone). */
export function lookContract() {
  return Object.keys(FANTASY_LOOKS).map(id => {
    const retired = RETIRED[id], was = retired ?? measure(oldLook(id)!), now = measure(FANTASY_LOOKS[id]!);
    return { id, missing: was.parts.filter(p => !now.parts.includes(p)), oldH: was.h, newH: now.h, retired: !!retired };
  });
}
/** The same for the bosses' new looks still waiting on the owner (the heads alone, as their fights build them). */
export function bossContract() {
  return newBossLooks().map(id => {
    const was = measure(OLD_BOSS_LOOKS[id]!), now = measure(BOSS_FANTASY[id]!);
    return { id, missing: was.parts.filter(p => !now.parts.includes(p)), oldH: was.h, newH: now.h, retired: false };
  });
}
