/* Where things stand at the Vigil: a tile of a room in the world, a placed thing's middle, its tiles
   blocked as a rock that never breaks, and its span of wall kept clear of torches and the wall's dressing. Shared by
   vigil/place.ts (the pieces and barred ways) and vigil/unfold.ts (what fills the rooms behind them). */
import type { Room } from '../types';
import type { School } from '../actors/foeData';
import { tilesOf } from './vigilMap';

type Placed = { at: [number, number]; size?: [number, number] };
/** A tile's middle in the world. */
export const at = (room: Room, c: number, r: number) => ({ x: room.bounds.minX + c, z: room.bounds.minZ + r });
/** Where a piece or bar covering tiles from (c, r), `w` × `h`, has its middle. */
export const middle = (room: Room, p: Placed) => {
  const [w, h] = p.size ?? [1, 1];
  return at(room, p.at[0] + w / 2, p.at[1] + h / 2);
};
/** It blocks its tiles, as a rock that never breaks; `bar` for a barred way. */
export function block(room: Room, p: Placed, bar?: School) {
  for (const [c, r] of tilesOf(p)) {
    const m = at(room, c + 0.5, r + 0.5);
    room.rocks.push({
      x: m.x,
      z: m.z,
      hx: 0.5,
      hz: 0.5,
      hp: 0,
      breakable: false,
      tile: { c, r },
      ...(bar && { bar }),
    });
  }
}
/** Its span of wall, kept clear of torches and the wall's dressing. */
export function keep(room: Room, side: 'n' | 's' | 'e' | 'w', p: Placed) {
  const m = middle(room, p),
    [w, h] = p.size ?? [1, 1],
    along = side === 'n' || side === 's';
  (room.keepClear ??= []).push({ side, at: along ? m.x : m.z, half: (along ? w : h) / 2 + 0.1 });
}
