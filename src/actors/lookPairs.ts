/* M4.12 (docs/M4.12-plan.md): the old and new looks of the foes side by side, for the owner to compare and approve (the
   Galleries tab, `__game.lookPairs(floor)`), and the contract a new look keeps (`lookContract`, read by a browser test):
   every part its behaviour moves, by the old look's names, and about the old look's height. */
import * as THREE from 'three';
import type { Room } from '../types';
import { FOES } from './foeData';
import { oldLook } from './foes';
import { FANTASY_LOOKS, RETIRED } from './fantasyLooks';
import { standLook } from './modelOptions';
import { freeSpotNear } from '../world/rooms';
import type { Built } from './beastParts';

/** The look ids of a floor's foes (0: the Wardlings), as the data names them. */
const floorLooks = (floor: number) => [...new Set(Object.values(FOES).filter(d => d.floor === floor).map(d => d.look ?? d.id))];
/** Every look id that has a new look waiting on the owner (its old one not yet retired), on `floor` or on every floor. */
export const newLooks = (floor?: number) => (floor === undefined ? Object.keys(FANTASY_LOOKS) : floorLooks(floor)).filter(id => FANTASY_LOOKS[id] && !RETIRED[id]);

/** Stand each of `floor`'s foes that has a new look, the old look to its left and the new to its right, in rows ahead of
    world (x, z) (a great hall holds a floor's: `?room=great_hall`); `only` names the ones to stand. */
export function showLookPairs(room: Room, x: number, z: number, floor?: number, only?: readonly string[]) {
  const ids = newLooks(floor).filter(id => !only || only.includes(id)), across = Math.max(1, Math.min(4, Math.floor((room.bounds.maxX - room.bounds.minX) / 3.2)));
  return ids.map((id, i) => {
    const n = Math.min(across, ids.length - Math.floor(i / across) * across), cx = x + ((i % across) - (n - 1) / 2) * 3.2, cz = z - 2 - Math.floor(i / across) * 2.4;
    const a = freeSpotNear(room, cx - .7, cz), b = freeSpotNear(room, cx + .7, cz);
    standLook(room, oldLook(id)!, 'old:' + id, a.x, a.z); standLook(room, FANTASY_LOOKS[id]!, 'new:' + id, b.x, b.z);
    return { id, old: a, new: b };
  });
}

/** How tall a look stands (its idle at rest), and the names of the parts it moves. */
function measure(build: () => Built) {
  const b = build(); b.idle(0); b.group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(b.group), parts = Object.keys(b.parts ?? {});
  b.group.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh && !m.geometry.userData.shared) m.geometry.dispose(); });
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
