import { describe, expect, it } from 'vitest';
import { arc, heap, lay, neck, spiral, spiralStart, trim, type P3 } from '../../src/actors/dragonPath';

const COIL = { radius: 0.6, turns: 1.25, drop: 1.2 };
const dist = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("the Pillar Dragon's path (M4.2)", () => {
  it('coils round a pillar at its radius, climbing to just above its top, from the side it came from', () => {
    const s = spiral(2, 3, 1.75, Math.PI / 2, COIL);
    for (const p of s) expect(Math.hypot(p[0] - 2, p[2] - 3)).toBeCloseTo(0.6);
    expect(s[0]).toEqual(spiralStart(2, 3, 1.75, Math.PI / 2, COIL));
    expect(s[0][1]).toBeCloseTo(0.55);
    expect(s[s.length - 1][1]).toBeCloseTo(1.85);
    for (let i = 1; i < s.length; i++) expect(s[i][1]).toBeGreaterThanOrEqual(s[i - 1][1]);
    expect(spiral(0, 0, 0.9, 0, COIL)[0][1]).toBe(0.3); // (round a broken pillar it starts no lower than the floor allows)
  });

  it('flies in an arc that rises at its middle and ends where it was sent', () => {
    const a: P3 = [0, 1, 0],
      b: P3 = [4, 1, 0],
      path = arc(a, b, 1.5);
    expect(path[path.length - 1]).toEqual(b);
    expect(Math.max(...path.map((p) => p[1]))).toBeCloseTo(2.5, 1);
  });

  it('lays its segments a spacing apart along the spine, bunching at the end when the spine is short', () => {
    const spine: P3[] = [
        [0, 0, 0],
        [10, 0, 0],
      ],
      segs = lay(spine, 5, 0.5, 0.25);
    expect(segs.map((p) => p[0])).toEqual([0.25, 0.75, 1.25, 1.75, 2.25]);
    const short = lay(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      4,
      0.5,
      0,
    );
    expect(short.map((p) => p[0])).toEqual([0, 0.5, 1, 1]);
    const coil = spiral(0, 0, 1.75, 0, COIL).reverse(),
      onIt = lay(coil, 20, 0.2, 0);
    for (let i = 1; i < onIt.length; i++) expect(dist(onIt[i], onIt[i - 1])).toBeLessThanOrEqual(0.2 + 1e-9); // (a chord of the coil, never more than the spacing)
  });

  it('keeps only as much trail as the body needs', () => {
    const trail: P3[] = Array.from({ length: 50 }, (_, i) => [i * 0.1, 0, 0] as P3);
    trim(trail, 1);
    const len = trail.slice(1).reduce((s, p, i) => s + dist(p, trail[i]), 0);
    expect(len).toBeGreaterThanOrEqual(1);
    expect(len).toBeLessThan(1.25);
    expect(trail[trail.length - 1]).toEqual([4.9, 0, 0]); // (the newest stays)
  });

  it('lies in a heap on the floor with its head at the outside, and arches its neck from the head to the trail', () => {
    const h = heap(5, 5, 0);
    for (const p of h) expect(p[1]).toBeCloseTo(0.24);
    const end = h[h.length - 1];
    expect(Math.hypot(end[0] - 5, end[2] - 5)).toBeCloseTo(1.05);
    expect(end[0]).toBeGreaterThan(5.9); // (outermost, towards angle 0)
    const n = neck([0, 1.5, 1], [0, 1.8, 0], 0.35);
    expect(n[0]).toEqual([0, 1.5, 1]);
    expect(n[n.length - 1]).toEqual([0, 1.8, 0]);
    expect(Math.max(...n.map((p) => p[1]))).toBeGreaterThan(1.8);
  });
});
