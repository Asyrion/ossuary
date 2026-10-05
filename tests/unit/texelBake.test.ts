/* A Tripo model's painted texture made pixel art at the size the game draws it (render/texelBake.ts, 2026-10-05). */
import { describe, expect, it } from 'vitest';
import { bakeSize, glows, islandLabels, liftShadows, shrink } from '../../src/render/texelBake';
import { toOklab } from '../../src/render/palette';

describe('bakeSize', () => {
  it('shrinks to at least one texel a game pixel, a power of two within its bounds', () => {
    expect(bakeSize(1024, 1024 * 1024, 1024 * 1024 / 16, 1, 64, 512)).toBe(256); // (4 texels a pixel across: 1024 / 4)
    expect(bakeSize(1024, 1024 * 1024, 1024 * 1024 / 30, 1, 64, 512)).toBe(256); // (5.5 across: 187 rounds up, never fewer)
    expect(bakeSize(1024, 1024, 1e9, 1, 64, 512)).toBe(512); // (drawn huge: kept to the most)
    expect(bakeSize(1024, 1e9, 1, 1, 64, 512)).toBe(64); // (drawn tiny: kept to the least)
    expect(bakeSize(1024, 0, 0, 1, 64, 512)).toBe(512);
  });
});

/** A `w` × `h` RGBA image filled by `at(x, y)`. */
const image = (w: number, h: number, at: (x: number, y: number) => number[]) => {
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([...at(x, y), 255], (y * w + x) * 4);
  return d;
};

describe('islandLabels and shrink', () => {
  it('numbers each UV island, and a block averages only the island covering most of it', () => {
    // two islands: a square on the left 5 of 8 columns (red), one on the right 3 (blue), each two triangles
    const uv = [0, 0, 5 / 8, 0, 5 / 8, 1, 0, 1, 5 / 8, 0, 1, 0, 1, 1, 5 / 8, 1], index = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
    const { labels, next } = islandLabels(uv, index, 8, 8);
    expect(next).toBe(3);
    expect(labels[0]).toBe(1); expect(labels[7]).toBe(2); expect(new Set(labels)).toEqual(new Set([1, 2]));
    const data = image(8, 8, x => x < 5 ? [255, 0, 0] : [0, 0, 255]);
    // shrunk to 2 × 2: the right blocks span columns 4 to 7, one red column and three blue
    const plain = shrink(data, 8, 8, 2), kept = shrink(data, 8, 8, 2, labels);
    expect(plain.rgb[3 + 0]).toBeCloseTo(.25); // (the plain mean bleeds the red island into the blue)
    expect(kept.rgb[3 + 0]).toBe(0); expect(kept.rgb[3 + 2]).toBe(1); // (by islands: blue only)
    expect(kept.rgb[0]).toBe(1); // (the left block all red)
  });
  it('keeps a thin glowing marking that averaging would wash out, and flags it', () => {
    const data = image(8, 8, x => x === 1 ? [80, 230, 255] : [20, 30, 60]); // (a cyan stripe, one texel wide, on dark blue)
    const glow = glows(.65, .1), plain = shrink(data, 8, 8, 2), kept = shrink(data, 8, 8, 2, undefined, glow, .2);
    expect(glow(80 / 255, 230 / 255, 1)).toBe(true); expect(glow(20 / 255, 30 / 255, 60 / 255)).toBe(false);
    expect(glow(.85, .85, .85)).toBe(false); // (a pale grey never glows)
    expect(plain.kept[0]).toBe(0); expect(plain.rgb[1]).toBeLessThan(.4);
    expect(kept.kept[0]).toBe(1); expect(kept.rgb[1]).toBeCloseTo(230 / 255); // (the stripe a quarter of its block: kept)
    expect(kept.kept[1]).toBe(0); // (the block beside it, no stripe)
  });
});

describe('liftShadows', () => {
  it('lifts the darks most and keeps the hue', () => {
    const rgb = new Float32Array([.1, .12, .25, .8, .8, .8]);
    const L0 = toOklab(.1, .12, .25)[0], L1 = toOklab(.8, .8, .8)[0];
    liftShadows(rgb, .8);
    const d = toOklab(rgb[0], rgb[1], rgb[2]), l = toOklab(rgb[3], rgb[4], rgb[5]);
    expect(d[0] - L0).toBeGreaterThan(l[0] - L1); // (the dark rose more than the light)
    expect(rgb[2]).toBeGreaterThan(rgb[0]); // (still blue)
  });
});
