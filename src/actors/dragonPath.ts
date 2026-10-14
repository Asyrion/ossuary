/* The Pillar Dragon's path: where its long body lies, as plain geometry. The fight moves a leading point along a
   route (an arc through the air, then a coil round a pillar's top) and keeps the trail it leaves behind; the body's
   segments lie along that trail a fixed spacing apart, so the body follows the head through the air and winds round the
   pillar as the head did. The head itself may lean out from the trail's end; a short arched neck joins them. */

/** A point: x, y (up), z. */
export type P3 = [number, number, number];

/** A coil round the top of a pillar standing at (x, z) and `top` tall: `turns` times round at `radius`, climbing from
    `drop` below its top to just above it, starting on the side at angle `from` (radians, from +x towards +z). */
export function spiral(
  x: number,
  z: number,
  top: number,
  from: number,
  o: { radius: number; turns: number; drop: number },
  step = 0.1,
): P3[] {
  const low = Math.max(0.3, top - o.drop),
    high = top + 0.1,
    len = o.turns * Math.PI * 2 * o.radius,
    n = Math.max(2, Math.ceil(len / step));
  const out: P3[] = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n,
      a = from + s * o.turns * Math.PI * 2;
    out.push([x + Math.cos(a) * o.radius, low + (high - low) * s, z + Math.sin(a) * o.radius]);
  }
  return out;
}
/** Where a coil round the pillar at (x, z) starts, coming from angle `from`. */
export const spiralStart = (
  x: number,
  z: number,
  top: number,
  from: number,
  o: { radius: number; drop: number },
): P3 => [x + Math.cos(from) * o.radius, Math.max(0.3, top - o.drop), z + Math.sin(from) * o.radius];

/** A flight from `a` to `b` through the air, rising `lift` above the straight line at its middle. */
export function arc(a: P3, b: P3, lift: number, step = 0.1): P3[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
    n = Math.max(2, Math.ceil(len / step)),
    out: P3[] = [];
  for (let k = 1; k <= n; k++) {
    const s = k / n;
    out.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s + lift * 4 * s * (1 - s), a[2] + (b[2] - a[2]) * s]);
  }
  return out;
}

/** A heap on the floor: the body lying in a flat coil round (x, z), from its tail in the middle out to where the head
    lies, which ends towards angle `to`. Oldest (the tail's end) first, as a trail is. */
export function heap(x: number, z: number, to: number, step = 0.1): P3[] {
  const turns = 1.6,
    n = Math.ceil((turns * Math.PI * 2 * 0.7) / step),
    out: P3[] = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n,
      a = to - (1 - s) * turns * Math.PI * 2,
      r = 0.3 + 0.75 * s;
    out.push([x + Math.cos(a) * r, 0.24, z + Math.sin(a) * r]);
  }
  return out;
}

/** An arched neck from the head at `h` back to the trail's end at `t` (head first), bowing up by `bow`. */
export function neck(h: P3, t: P3, bow: number, n = 6): P3[] {
  const c: P3 = [(h[0] + t[0]) / 2, Math.max(h[1], t[1]) + bow, (h[2] + t[2]) / 2],
    out: P3[] = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n,
      a = (1 - s) * (1 - s),
      b = 2 * s * (1 - s),
      d = s * s;
    out.push([a * h[0] + b * c[0] + d * t[0], a * h[1] + b * c[1] + d * t[1], a * h[2] + b * c[2] + d * t[2]]);
  }
  return out;
}

/** Lay `n` segments `spacing` apart along `spine` (head first), the first `gap` behind its start; past the spine's end,
    the rest bunch up at its last point. Writes into `out` (reused each step) and returns it. */
export function lay(spine: P3[], n: number, spacing: number, gap: number, out: P3[] = []): P3[] {
  let i = 0,
    want = gap,
    walked = 0;
  for (let k = 1; k < spine.length && i < n; k++) {
    const a = spine[k - 1],
      b = spine[k],
      len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    while (i < n && want <= walked + len) {
      const s = len > 1e-6 ? (want - walked) / len : 0;
      out[i] = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
      i++;
      want += spacing;
    }
    walked += len;
  }
  const last = spine[spine.length - 1];
  for (; i < n; i++) out[i] = [last[0], last[1], last[2]];
  out.length = n;
  return out;
}

/** Drop the trail's oldest points beyond `keep` of length behind its newest (a trail is oldest first). */
export function trim(trail: P3[], keep: number) {
  let walked = 0;
  for (let k = trail.length - 1; k > 0; k--) {
    const a = trail[k],
      b = trail[k - 1];
    walked += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (walked > keep) {
      trail.splice(0, k - 1);
      return;
    }
  }
}
