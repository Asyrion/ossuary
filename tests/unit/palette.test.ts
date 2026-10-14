import { describe, expect, it } from 'vitest';
import { fromOklab, medianCut, nearestColour, quantize, refinePalette, toOklab } from '../../src/render/palette';

// The mage's colours cut down to a few, as pixel art keeps them (actors/heroPixel.ts)
describe('the palette', () => {
  const blue = [0.2, 0.3, 0.7],
    navy = [0.1, 0.15, 0.45],
    brown = [0.45, 0.25, 0.12],
    gold = [0.95, 0.8, 0.4];
  const many = (c: number[], n: number, jitter = 0.02) =>
    Array.from({ length: n }, (_, i) => c.map((v) => v + ((i % 3) - 1) * jitter)).flat();

  it('median cut, refined, finds the kinds of colour given, never more than asked for', () => {
    const rgb = [...many(blue, 30), ...many(brown, 30), ...many(gold, 30)];
    const p = refinePalette(rgb, medianCut(rgb, 3), 4); // (a median falls inside a group; k-means sorts it out)
    expect(p).toHaveLength(3);
    for (const c of [blue, brown, gold])
      expect(Math.min(...p.map((q) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2])))).toBeLessThan(0.05);
    expect(medianCut(rgb, 200).length).toBeLessThanOrEqual(90); // (no more colours than there are)
    expect(medianCut([], 4)).toEqual([]);
  });
  it('k-means moves a palette towards the colours it stands for', () => {
    const rgb = [...many(blue, 20, 0), ...many(gold, 20, 0)];
    const p = refinePalette(
      rgb,
      [
        [0.5, 0.5, 0.5],
        [0.6, 0.6, 0.6],
      ],
      4,
    );
    const near = (c: number[]) => p.some((q) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) < 1e-6);
    expect(near(blue)).toBe(true);
    expect(near(gold)).toBe(true);
    expect(nearestColour(p, gold[0], gold[1], gold[2])).not.toBe(nearestColour(p, blue[0], blue[1], blue[2]));
  });
  it('OKLab goes there and back', () => {
    for (const c of [blue, brown, gold, [0, 0, 0], [1, 1, 1]]) {
      const back = fromOklab(...toOklab(c[0], c[1], c[2]));
      back.forEach((v, i) => expect(v).toBeCloseTo(c[i], 4));
    }
  });
  it('quantising keeps a blue coat blue beside a brown belt as light as it (hue counted over)', () => {
    // as light as each other: plain lightness-led cuts put them in one grey
    const rgb = [...many(blue, 40), ...many(navy, 40), ...many(brown, 40), ...many(gold, 40)];
    const { palette, index } = quantize(rgb, 4, 6, 3);
    expect(palette).toHaveLength(4);
    const of = (i: number) => palette[index[i]];
    expect(of(0)[2]).toBeGreaterThan(of(0)[0] + 0.2); // (the coat's colour is still blue)
    expect(of(80)[0]).toBeGreaterThan(of(80)[2] + 0.15); // (the belt's still brown)
    expect(new Set([index[0], index[40], index[80], index[120]]).size).toBe(4);
  });
});
