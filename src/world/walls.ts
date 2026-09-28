/* The walls round a room, as tiles: every tile outside the room's inside that touches it (corners too), and every
   tile a template carves out of its shape (`x` inside the shape). Each wall tile is tall or low, and the tiles are
   merged into rectangles that never overlap (two faces in one plane flicker). Pure (no three.js): the room
   builder turns the rectangles into boxes and cuts the doorways out of them; the unit tests check the rules.

   Heights: the camera looks north, so a wall hides what lies just north of it. A wall tile is tall only where the
   wall runs unbroken from it to the room's north edge (the north wall, the side walls, a spur coming down from
   the north wall); wherever the floor lies somewhere north of it (the south wall, a carved corner at the bottom, a
   spur from a side or the south wall), and at the south wall's corners, it is low. A block of wall standing free
   inside a hall (a partition, a pier) is low all over, so it never hides the mage. */

/** A rectangle of wall tiles [c0, c1) × [r0, r1) in the room's tile coordinates (they reach -1 and w or h). */
export interface WallRect { c0: number; c1: number; r0: number; r1: number; tall: boolean; /** Carved out of the shape, inside the room. */ inner: boolean }

/** `inside[r][c]`: the room's floor (its shape, less what the template carves); `shape[r][c]`: the shape. */
export function wallRects(inside: boolean[][], shape: boolean[][]): WallRect[] {
  const h = inside.length, w = inside[0].length;
  const inRoom = (c: number, r: number) => r >= 0 && r < h && c >= 0 && c < w && inside[r][c];
  const carved = (c: number, r: number) => r >= 0 && r < h && c >= 0 && c < w && shape[r][c] && !inside[r][c];
  const near = (c: number, r: number) => [-1, 0, 1].some(dr => [-1, 0, 1].some(dc => (dc || dr) && inRoom(c + dc, r + dr)));
  // the grid reaches one tile beyond the inside on every side; k maps (c, r) into it
  const W = w + 2, H = h + 2, k = (c: number, r: number) => (r + 1) * W + (c + 1);
  const isWall = new Array<boolean>(W * H).fill(false);
  for (let r = -1; r <= h; r++) for (let c = -1; c <= w; c++) if (!inRoom(c, r) && (carved(c, r) || near(c, r))) isWall[k(c, r)] = true;
  const wall = (c: number, r: number) => c >= -1 && c <= w && r >= -1 && r <= h && isWall[k(c, r)];
  // blocks standing free: wall tiles whose group never touches anything that is neither room nor wall
  const free = new Array<boolean>(W * H).fill(false), seen = new Array<boolean>(W * H).fill(false);
  for (let r = -1; r <= h; r++) for (let c = -1; c <= w; c++) {
    if (!wall(c, r) || seen[k(c, r)]) continue;
    const group: [number, number][] = [[c, r]]; seen[k(c, r)] = true; let edge = false;
    for (let i = 0; i < group.length; i++) {
      const [gc, gr] = group[i];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = gc + dc, nr = gr + dr;
        if (wall(nc, nr)) { if (!seen[k(nc, nr)]) { seen[k(nc, nr)] = true; group.push([nc, nr]); } } else if (!inRoom(nc, nr)) edge = true;
      }
    }
    if (!edge) for (const [gc, gr] of group) free[k(gc, gr)] = true;
  }
  const tall = (c: number, r: number) => {
    if (free[k(c, r)]) return false;
    // a corner of the south wall: the floor only diagonally north of it
    if (!inRoom(c - 1, r) && !inRoom(c + 1, r) && !inRoom(c, r - 1) && (inRoom(c - 1, r - 1) || inRoom(c + 1, r - 1))) return false;
    // tall only if the wall runs unbroken to the north edge, with no floor north of it
    let up = r - 1; while (wall(c, up)) up--;
    return !inRoom(c, up);
  };
  // rows first, then stack rows of the same span and height
  const strips: WallRect[] = [];
  for (let r = -1; r <= h; r++) for (let c = -1; c <= w;) {
    if (!wall(c, r)) { c++; continue; }
    const t = tall(c, r), inner = carved(c, r), c0 = c; while (c <= w && wall(c, r) && tall(c, r) === t && carved(c, r) === inner) c++;
    strips.push({ c0, c1: c, r0: r, r1: r + 1, tall: t, inner });
  }
  const rects: WallRect[] = [];
  for (const s of strips) {
    const above = rects.find(q => q.c0 === s.c0 && q.c1 === s.c1 && q.tall === s.tall && q.inner === s.inner && q.r1 === s.r0);
    if (above) above.r1 = s.r1; else rects.push({ ...s });
  }
  return rects;
}

/** An axis-aligned rectangle [x0, x1] × [z0, z1]. */
export interface Rect { x0: number; x1: number; z0: number; z1: number }

/** `a` with `b` cut out of it: up to four rectangles, none thinner than `min`. */
export function subtractRect(a: Rect, b: Rect, min = .02): Rect[] {
  if (b.x1 <= a.x0 || b.x0 >= a.x1 || b.z1 <= a.z0 || b.z0 >= a.z1) return [a];
  const mx0 = Math.max(a.x0, b.x0), mx1 = Math.min(a.x1, b.x1);
  return [
    { x0: a.x0, x1: b.x0, z0: a.z0, z1: a.z1 }, { x0: b.x1, x1: a.x1, z0: a.z0, z1: a.z1 },
    { x0: mx0, x1: mx1, z0: a.z0, z1: b.z0 }, { x0: mx0, x1: mx1, z0: b.z1, z1: a.z1 },
  ].filter(p => p.x1 - p.x0 > min && p.z1 - p.z0 > min);
}
