import { describe, expect, it } from 'vitest';
import { kernelFor, softenAlpha } from '../../src/render/softEdge';

/** A `w` × `h` canvas's pixels with the square from (x0, y0) to (x1, y1) filled white. */
function square(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d.set([255, 255, 255, 255], (y * w + x) * 4);
  return d;
}

describe('soft edges blurred on the CPU (the canvas filter blur, without the GPU)', () => {
  it('weighs a Gaussian out to 4σ, summing to 1', () => {
    const k = kernelFor(6);
    expect(k.length).toBe(49);
    expect(k.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(k[24]).toBeGreaterThan(k[30]);
  });

  it('keeps a shape whole in its middle, fades it outside, and its faint edge reaches out round, not square', () => {
    const w = 120, d = square(w, w, 40, 40, 80, 80);
    softenAlpha(d, w, w, 6);
    const at = (x: number, y: number) => d[(y * w + x) * 4 + 3];
    expect(at(60, 60)).toBe(255);
    expect(at(40, 60)).toBeGreaterThan(100); expect(at(40, 60)).toBeLessThan(155); // (half, at the shape's own edge)
    expect(at(5, 60)).toBe(0);
    // how far the faint edge reaches along an edge and along the corner's diagonal: a round reach is shorter on the diagonal
    let side = 0; while (at(80 + side, 60)) side++;
    let diag = 0; while (at(80 + diag, 80 + diag)) diag++;
    expect(side).toBeGreaterThan(12);
    expect(diag * Math.SQRT2).toBeLessThan(side * 1.15); // (a square reach would put the corner √2 further out)
    // every pixel it reaches carries the fill's colour, as the canvas hands it to WebGL (an alpha map reads the green)
    expect(d[((60 * w) + 80 + side - 1) * 4 + 1]).toBe(255);
    expect(d[((60 * w) + 80 + side) * 4 + 1]).toBe(0);
  });
});
