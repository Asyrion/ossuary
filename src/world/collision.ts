import type { Box, Circle, Room } from '../types';
import { clamp } from '../util';
import { doorsOf } from './rooms';

/** Who is moving: each is stopped by different things. */
export type Mover = 'player' | 'walker' | 'flyer' | 'bolt';

/** What blocks a mover in a room: walls and closed doors always; rocks stop everything but flyers;
    pits stop the mage and walkers, not bolts or flyers; a spell's ice stops all but the mage's bolts. */
export function blockers(room: Room, who: Mover, overPits = false) {
  const list: Box[] = room.walls.slice();
  for (const d of doorsOf(room)) if (!d.open) list.push(d.box);
  if (who !== 'flyer') list.push(...room.rocks);
  if ((who === 'player' || who === 'walker') && !overPits) list.push(...room.pits);
  if ((who === 'player' || who === 'walker') && room.lows) list.push(...room.lows); // pews and rubble: bolts fly over
  if (who !== 'bolt' && room.barriers) list.push(...room.barriers);
  return list;
}

/** The box (of `boxes`) that the point (x, z) is inside, if any. */
export const boxAt = (x: number, z: number, boxes: Box[]) =>
  boxes.find((b) => Math.abs(x - b.x) < b.hx && Math.abs(z - b.z) < b.hz);

/** Circle vs AABB push-out; returns true if any contact. */
export function collide(e: Circle, boxes: Box[]) {
  let hit = false;
  for (const b of boxes) {
    const nx = clamp(e.x, b.x - b.hx, b.x + b.hx),
      nz = clamp(e.z, b.z - b.hz, b.z + b.hz);
    const dx = e.x - nx,
      dz = e.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < e.r * e.r) {
      hit = true;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2),
          push = (e.r - d) / d;
        e.x += dx * push;
        e.z += dz * push;
      } else {
        // centre inside box: exit along the shallowest axis
        const ox = b.hx + e.r - Math.abs(e.x - b.x),
          oz = b.hz + e.r - Math.abs(e.z - b.z);
        if (ox < oz) e.x += Math.sign(e.x - b.x || 1) * ox;
        else e.z += Math.sign(e.z - b.z || 1) * oz;
      }
    }
  }
  return hit;
}

export const pointInBoxes = (x: number, z: number, pad: number, boxes: Box[]) =>
  boxes.some((b) => Math.abs(x - b.x) < b.hx + pad && Math.abs(z - b.z) < b.hz + pad);
