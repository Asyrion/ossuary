/* Jelly poured over a room's floor (docs/archive/M5-plan.md): which tiles a flood covers, spreading over open floor from
   where it pours in (the jelly serpent's vat, or round the serpent when it is a floor's boss). Pure (no three.js) and
   unit-tested; world/pools.ts makes the tiles a pool and actors/jellySerpent.ts pours it. */

export interface FloodTile {
  c: number;
  r: number;
}

/** Up to `n` tiles of open floor, joined side by side, spreading out from (c0, r0) (from the nearest open tile, if that one
    isn't): nearer tiles first, `rng` making the edge ragged. `open(c, r)` says whether a tile can be flooded; the grid is
    `cols` by `rows`. */
export function floodTiles(
  open: (c: number, r: number) => boolean,
  c0: number,
  r0: number,
  n: number,
  rng: () => number,
  cols: number,
  rows: number,
  ragged = 1.6,
): FloodTile[] {
  const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < cols && r < rows && open(c, r);
  let start: FloodTile | null = inside(c0, r0) ? { c: c0, r: r0 } : null;
  for (let ring = 1; !start && ring < Math.max(cols, rows); ring++)
    // (the nearest open tile, ring by ring)
    for (let dr = -ring; dr <= ring && !start; dr++)
      for (let dc = -ring; dc <= ring && !start; dc++)
        if (Math.max(Math.abs(dc), Math.abs(dr)) === ring && inside(c0 + dc, r0 + dr))
          start = { c: c0 + dc, r: r0 + dr };
  if (!start || n <= 0) return [];
  const key = (c: number, r: number) => c + ',' + r,
    seen = new Set([key(start.c, start.r)]);
  const out: FloodTile[] = [],
    frontier: (FloodTile & { w: number })[] = [{ ...start, w: 0 }];
  while (out.length < n && frontier.length) {
    let best = 0;
    for (let i = 1; i < frontier.length; i++) if (frontier[i].w < frontier[best].w) best = i;
    const t = frontier.splice(best, 1)[0];
    out.push({ c: t.c, r: t.r });
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const c = t.c + dc,
        r = t.r + dr;
      if (seen.has(key(c, r)) || !inside(c, r)) continue;
      seen.add(key(c, r));
      frontier.push({ c, r, w: Math.hypot(c - start.c, r - start.r) + rng() * ragged });
    }
  }
  return out;
}
