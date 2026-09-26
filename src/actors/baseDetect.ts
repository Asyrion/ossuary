/* Tripo figurines often stand on a round base. Detect a disc at the bottom of the silhouette and work out
   which triangles to keep. Pure data in, data out, so tools/prepare-asset.ts can use the same test. */

export interface MeshData {
  /** World-space xyz positions. */
  positions: ArrayLike<number>;
  /** Triangle indices. */
  index: ArrayLike<number>;
}

/** Returns, per mesh, the triangle indices to keep, or null if no base was found. */
export function findMiniatureBase(meshes: MeshData[]): number[][] | null {
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const { positions: p } of meshes) for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    if (y < minY) minY = y; if (y > maxY) maxY = y; if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const h = maxY - minY, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2; if (!(h > 0)) return null;
  // the bottom 3% must be a wide disc that also covers the centre
  let bandMaxR = 0, bandCenter = false;
  for (const { positions: p } of meshes) for (let i = 0; i < p.length; i += 3) {
    if (p[i + 1] < minY + .03 * h) { const r = Math.hypot(p[i] - cx, p[i + 2] - cz); if (r > bandMaxR) bandMaxR = r; if (r < .08 * h) bandCenter = true; }
  }
  if (!bandCenter || bandMaxR < .25 * h) return null;
  // top of the base = highest vertex near the rim, in the bottom 20%
  let top = -Infinity;
  for (const { positions: p } of meshes) for (let i = 0; i < p.length; i += 3) {
    const y = p[i + 1];
    if (y < minY + .2 * h && Math.hypot(p[i] - cx, p[i + 2] - cz) > .8 * bandMaxR && y > top) top = y;
  }
  const cut = top + .006 * h; let removed = 0, total = 0; const plans: number[][] = [];
  for (const { positions: p, index: idx } of meshes) {
    const keep: number[] = [];
    for (let i = 0; i < idx.length; i += 3) {
      total++; const a = idx[i], b = idx[i + 1], c = idx[i + 2];
      if (Math.max(p[a * 3 + 1], p[b * 3 + 1], p[c * 3 + 1]) > cut) keep.push(a, b, c); else removed++;
    }
    plans.push(keep);
  }
  if (removed < total * .005 || removed > total * .3) return null;
  return plans;
}
