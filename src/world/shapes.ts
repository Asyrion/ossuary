/* Room shapes (GDD: Room shapes). Rooms are built from cells of 13 × 7 tiles on the floor grid, Isaac-style.
   Cells sit 15 × 9 tiles apart: between two cells of the same room, the two wall tiles become floor, so a
   long hall is 28 × 7 inside, a tall hall 13 × 16, a great hall 28 × 16. Narrow corridors fit inside one
   cell. Pure data (no three.js): the generator, the room builder, templates and tests all use it.

   Tile coordinates (c, r) are relative to the top-left of the room's inside bounding box; cell coordinates
   (i, j) are relative to the shape's top-left cell. */
import type { Side } from '../types';

export type ShapeId = 'standard' | 'corridor_ew' | 'corridor_ns' | 'long' | 'tall' | 'great' | 'l_shape';
export const SHAPE_IDS: ShapeId[] = ['standard', 'corridor_ew', 'corridor_ns', 'long', 'tall', 'great', 'l_shape'];

export const CELL_W = 13,
  CELL_H = 7; // inside of one cell, in tiles
export const PITCH_X = 15,
  PITCH_Y = 9; // cell to cell, in tiles (= world units)

interface ShapeDef {
  /** Cells of the shape, in its canonical orientation. The L is missing its bottom-right cell;
      mirroring gives the other three corners. */
  cells: [number, number][];
  /** Narrow rooms: the inside is this rectangle within the single cell. */
  inset?: { c0: number; r0: number; w: number; h: number };
  /** Narrow rooms only have doors on these sides. */
  doorSides?: Side[];
}
export const SHAPES: Record<ShapeId, ShapeDef> = {
  standard: { cells: [[0, 0]] },
  corridor_ew: { cells: [[0, 0]], inset: { c0: 0, r0: 2, w: 13, h: 3 }, doorSides: ['e', 'w'] },
  corridor_ns: { cells: [[0, 0]], inset: { c0: 4, r0: 0, w: 5, h: 7 }, doorSides: ['n', 's'] },
  long: {
    cells: [
      [0, 0],
      [1, 0],
    ],
  },
  tall: {
    cells: [
      [0, 0],
      [0, 1],
    ],
  },
  great: {
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  l_shape: {
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
  },
};

export const SIDE_DIR: Record<Side, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
export const OPPOSITE: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' };

/** The shape's cells, mirrored within its cell bounding box. */
export function shapeCells(id: ShapeId, mirrorX = false, mirrorY = false): [number, number][] {
  const cells = SHAPES[id].cells;
  const maxI = Math.max(...cells.map((c) => c[0])),
    maxJ = Math.max(...cells.map((c) => c[1]));
  return cells.map(([i, j]) => [mirrorX ? maxI - i : i, mirrorY ? maxJ - j : j]);
}

/** Size of the inside bounding box in tiles (and the size of the shape's template grids). */
export function shapeSize(id: ShapeId) {
  const s = SHAPES[id];
  if (s.inset) return { w: s.inset.w, h: s.inset.h };
  const cw = Math.max(...s.cells.map((c) => c[0])) + 1,
    ch = Math.max(...s.cells.map((c) => c[1])) + 1;
  return { w: cw * PITCH_X - 2, h: ch * PITCH_Y - 2 };
}

/** Which tiles of the bounding box are inside the room: each cell's inside, the two-tile strips between
    neighbouring cells, and the square where four cells meet. */
export function shapeMask(id: ShapeId, mirrorX = false, mirrorY = false): boolean[][] {
  const { w, h } = shapeSize(id);
  const mask = Array.from({ length: h }, () => Array<boolean>(w).fill(!!SHAPES[id].inset));
  if (SHAPES[id].inset) return mask;
  const cells = shapeCells(id, mirrorX, mirrorY),
    has = (i: number, j: number) => cells.some((c) => c[0] === i && c[1] === j);
  const fill = (c0: number, r0: number, cw: number, rh: number) => {
    for (let r = r0; r < r0 + rh; r++) for (let c = c0; c < c0 + cw; c++) mask[r][c] = true;
  };
  for (const [i, j] of cells) {
    fill(i * PITCH_X, j * PITCH_Y, CELL_W, CELL_H);
    if (has(i + 1, j)) fill(i * PITCH_X + CELL_W, j * PITCH_Y, 2, CELL_H);
    if (has(i, j + 1)) fill(i * PITCH_X, j * PITCH_Y + CELL_H, CELL_W, 2);
    if (has(i + 1, j) && has(i, j + 1) && has(i + 1, j + 1)) fill(i * PITCH_X + CELL_W, j * PITCH_Y + CELL_H, 2, 2);
  }
  return mask;
}

/** A place a door can be: in the middle of a cell edge on the room's outline. `entry` is the tile just
    inside it (where the mage arrives), `lanes` the tiles that must stay clear. */
export interface DoorSlot {
  i: number;
  j: number;
  side: Side;
  entry: { c: number; r: number };
  lanes: { c: number; r: number }[];
}

export function doorSlots(id: ShapeId, mirrorX = false, mirrorY = false): DoorSlot[] {
  const s = SHAPES[id],
    slots: DoorSlot[] = [];
  const lane = (cs: number[], rs: number[]) => cs.flatMap((c) => rs.map((r) => ({ c, r })));
  if (s.inset) {
    const { w, h } = shapeSize(id),
      mx = (w - 1) / 2,
      my = (h - 1) / 2;
    for (const side of s.doorSides ?? (['n', 's', 'e', 'w'] as Side[])) {
      const at = { n: { c: mx, r: 0 }, s: { c: mx, r: h - 1 }, w: { c: 0, r: my }, e: { c: w - 1, r: my } }[side];
      const lanes =
        side === 'n' || side === 's'
          ? lane([mx - 1, mx, mx + 1], [at.r])
          : lane(
              [at.c],
              [my - 1, my, my + 1].filter((r) => r >= 0 && r < h),
            );
      slots.push({ i: 0, j: 0, side, entry: at, lanes });
    }
    return slots;
  }
  const cells = shapeCells(id, mirrorX, mirrorY),
    has = (i: number, j: number) => cells.some((c) => c[0] === i && c[1] === j);
  for (const [i, j] of cells)
    for (const side of ['n', 's', 'e', 'w'] as Side[]) {
      const [di, dj] = SIDE_DIR[side];
      if (has(i + di, j + dj)) continue;
      const c0 = i * PITCH_X,
        r0 = j * PITCH_Y,
        mx = c0 + 6,
        my = r0 + 3;
      const at = {
        n: { c: mx, r: r0 },
        s: { c: mx, r: r0 + CELL_H - 1 },
        w: { c: c0, r: my },
        e: { c: c0 + CELL_W - 1, r: my },
      }[side];
      const lanes =
        side === 'n' || side === 's' ? lane([mx - 1, mx, mx + 1], [at.r]) : lane([at.c], [my - 1, my, my + 1]);
      slots.push({ i, j, side, entry: at, lanes });
    }
  return slots;
}

/** Half the inside size of one of the shape's cells, for placing doors in the world. */
export function cellHalfExtents(id: ShapeId) {
  const s = SHAPES[id];
  return s.inset ? { hx: s.inset.w / 2, hz: s.inset.h / 2 } : { hx: CELL_W / 2, hz: CELL_H / 2 };
}

/** Can a room of this shape have a door on this side? */
export const allowsSide = (id: ShapeId, side: Side) => !SHAPES[id].doorSides || SHAPES[id].doorSides.includes(side);
