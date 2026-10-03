/* Turning a Tripo mesh's faces outward (docs/creatures.md): Tripo's owlbear came with whole patches inside out (wound and
   lit inward, about half its surface), drawn only because its material is two-sided; where an inside-out patch met an
   outward one the light broke along a jagged line. The faces are gathered into patches that agree across every edge they
   share with one other face (a mesh's edges matched by position, its UV seams split the vertices but not the surface),
   each patch is told its outside by rays (from points on its faces, rays in every direction: the side more of them get
   out of the model from is its outside, which holds for a mesh that isn't closed, as Tripo's aren't),
   the patches facing in are turned, and the normals are made again, smooth across the seams. */
import type { Document } from '@gltf-transform/core';

type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Turn every inside-out patch of `doc`'s meshes outward and make their normals again. Returns the faces turned, of how
    many, in how many patches. */
export function orientOutward(doc: Document, rays = 32, plain = .1) {
  let turned = 0, faces = 0, patches = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')!, nor = prim.getAttribute('NORMAL'), ind = prim.getIndices(); if (!ind) continue;
    const idx = Array.from(ind.getArray()!), n = idx.length / 3, P: V[] = [];
    for (let i = 0; i < pos.getCount(); i++) P.push(pos.getElement(i, [0, 0, 0]) as V);
    // vertices welded by position (a UV seam splits them), and each edge's faces
    const weld = new Map<string, number>(), w = P.map(p => { const k = p.map(x => Math.round(x * 1e5)).join(); if (!weld.has(k)) weld.set(k, weld.size); return weld.get(k)!; });
    const edges = new Map<string, number[]>(), key = (a: number, b: number) => a < b ? `${a}_${b}` : `${b}_${a}`;
    for (let t = 0; t < n; t++) for (let e = 0; e < 3; e++) { const k = key(w[idx[t * 3 + e]], w[idx[t * 3 + (e + 1) % 3]]); (edges.get(k) ?? edges.set(k, []).get(k)!).push(t); }
    // whether face t runs edge a→b forwards
    const forwards = (t: number, a: number, b: number) => { for (let e = 0; e < 3; e++) if (w[idx[t * 3 + e]] === a && w[idx[t * 3 + (e + 1) % 3]] === b) return true; return false; };
    // patches: each face's flip relative to its patch's first, across edges shared by exactly two faces
    const patch = new Int32Array(n).fill(-1), flip = new Uint8Array(n), list: number[][] = [];
    for (let s = 0; s < n; s++) {
      if (patch[s] >= 0) continue;
      const id = list.length, members = [s], queue = [s]; patch[s] = id;
      while (queue.length) {
        const t = queue.pop()!;
        for (let e = 0; e < 3; e++) {
          const a = w[idx[t * 3 + e]], b = w[idx[t * 3 + (e + 1) % 3]], two = edges.get(key(a, b))!; if (two.length !== 2) continue;
          const o = two[0] === t ? two[1] : two[0]; if (patch[o] >= 0) continue;
          // agreeing neighbours run their shared edge in opposite directions
          const tf = forwards(t, a, b) !== !!flip[t], of = forwards(o, a, b);
          flip[o] = tf === of ? 1 : 0; patch[o] = id; members.push(o); queue.push(o);
        }
      }
      list.push(members);
    }
    // the faces as they would be wound once flipped, and a grid over them for the rays
    const corner = (t: number, k: number) => P[idx[t * 3 + (flip[t] ? [0, 2, 1][k] : k)]];
    const tri = Array.from({ length: n }, (_, t) => [corner(t, 0), corner(t, 1), corner(t, 2)] as [V, V, V]);
    const lo: V = [1e9, 1e9, 1e9], hi: V = [-1e9, -1e9, -1e9];
    for (const p of P) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
    const G = 40, size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / G + 1e-6, cells = new Map<number, number[]>();
    const cellOf = (x: number, k: number) => Math.floor((x - lo[k]) / size), cid = (i: number, j: number, k: number) => (i * (G + 2) + j) * (G + 2) + k;
    tri.forEach(([a, b, c], t) => {
      const c0 = [0, 1, 2].map(k => cellOf(Math.min(a[k], b[k], c[k]), k)), c1 = [0, 1, 2].map(k => cellOf(Math.max(a[k], b[k], c[k]), k));
      for (let i = c0[0]; i <= c1[0]; i++) for (let j = c0[1]; j <= c1[1]; j++) for (let k = c0[2]; k <= c1[2]; k++) { const id = cid(i, j, k); (cells.get(id) ?? cells.set(id, []).get(id)!).push(t); }
    });
    const seen = new Int32Array(n).fill(-1); let stamp = 0;
    const blocked = (o: V, d: V) => { // marched through the grid a half cell at a time, each face met tested once (Möller–Trumbore)
      stamp++;
      for (let s = 0; ; s += size / 2) {
        const x = o[0] + d[0] * s, y = o[1] + d[1] * s, z = o[2] + d[2] * s;
        if (x < lo[0] - size || y < lo[1] - size || z < lo[2] - size || x > hi[0] + size || y > hi[1] + size || z > hi[2] + size) return false;
        const list = cells.get(cid(cellOf(x, 0), cellOf(y, 1), cellOf(z, 2))); if (!list) continue;
        for (const t of list) {
          if (seen[t] === stamp) continue; seen[t] = stamp;
          const [a, b, c] = tri[t], e1 = sub(b, a), e2 = sub(c, a), p = cross(d, e2), det = dot(e1, p); if (Math.abs(det) < 1e-12) continue;
          const q0 = sub(o, a), u = dot(q0, p) / det; if (u < 0 || u > 1) continue;
          const q = cross(q0, e1), v = dot(d, q) / det; if (v < 0 || u + v > 1) continue;
          if (dot(e2, q) / det > 1e-6) return true;
        }
      }
    };
    // each face's openness: how many rays from it get out of the model on its front, and on its back
    const dirs: V[] = Array.from({ length: rays }, (_, i) => { const y = 1 - (i + .5) * 2 / rays, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * r, y, Math.sin(a) * r]; });
    const front = new Int16Array(n), back = new Int16Array(n);
    for (let t = 0; t < n; t++) {
      const [a, b, c] = tri[t], g = cross(sub(b, a), sub(c, a)); if (Math.hypot(...g) < 1e-12) continue;
      const m: V = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      for (const d of dirs) if (!blocked([m[0] + d[0] * 1e-4, m[1] + d[1] * 1e-4, m[2] + d[2] * 1e-4], d)) { if (dot(d, g) > 0) front[t]++; else back[t]++; }
    }
    // a patch turns as a whole where its faces' vote says so; then a face whose own rays are plain about it (most of
    // them out on one side) faces that way, whatever its patch (folds and crumpled flaps where a patch can't agree)
    for (const members of list) {
      let f = 0, bk = 0; for (const t of members) { f += front[t]; bk += back[t]; }
      if (bk > f) for (const t of members) { flip[t] ^= 1; [front[t], back[t]] = [back[t], front[t]]; }
    }
    for (let t = 0; t < n; t++) if (back[t] - front[t] >= plain * rays) flip[t] ^= 1;
    for (let t = 0; t < n; t++) if (flip[t]) { [idx[t * 3 + 1], idx[t * 3 + 2]] = [idx[t * 3 + 2], idx[t * 3 + 1]]; turned++; }
    ind.setArray(new (ind.getArray()!.constructor as Uint32ArrayConstructor)(idx));
    // the normals made again: area-weighted, summed by position so a seam doesn't show
    if (nor) {
      const sum = Array.from({ length: weld.size }, () => [0, 0, 0] as V);
      for (let t = 0; t < n; t++) { const [a, b, c] = [0, 1, 2].map(k => P[idx[t * 3 + k]]), g = cross(sub(b, a), sub(c, a)); for (let k = 0; k < 3; k++) { const s = sum[w[idx[t * 3 + k]]]; s[0] += g[0]; s[1] += g[1]; s[2] += g[2]; } }
      const N = new Float32Array(P.length * 3);
      P.forEach((_, i) => { const s = sum[w[i]], l = Math.hypot(...s) || 1; N[i * 3] = s[0] / l; N[i * 3 + 1] = s[1] / l; N[i * 3 + 2] = s[2] / l; });
      nor.setArray(N);
    }
    faces += n; patches += list.length;
  }
  return { turned, faces, patches };
}
