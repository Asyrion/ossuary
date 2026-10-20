import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { LINES, gridFor, pixelLook, snapBy, texelPixel } from '../../src/render/pixelLook';

describe('the pixel look', () => {
  it("is the game's look: on from the start, at the texel (the room kit's), with outlines; the dev menu offers the texel and the fine grid", () => {
    expect(CFG.pixelLook.start).toBe('texel');
    expect(LINES).toEqual(['texel', 'fine']);
    expect(pixelLook()).toEqual({ lines: 'texel', outline: true, bands: false });
  });
  it('at the texel, a game pixel is a room-kit texel: a 48th of a unit across, and down the screen as much as a floor texel seen at 45°', () => {
    const { px, py } = texelPixel(48, 34, Math.PI / 4);
    expect(px).toBeCloseTo(1 / 48, 10);
    expect(py).toBeCloseTo(Math.SQRT1_2 / 34, 10); // (a floor texel, 1/34 of a unit along z, foreshortened)
    expect(py / px).toBeGreaterThan(0.99);
    expect(py / px).toBeLessThan(1.01); // (square on screen, near enough)
    // a one-cell room at 1080p (15.5 × 8.72 units in view): about 2.6 screen pixels to a game pixel
    const g = gridFor(15.5, (15.5 * 1080) / 1920, px, py, 2);
    expect(g.w % 2).toBe(0);
    expect(g.h % 2).toBe(0); // (even, so the camera's whole pixel lands on a pixel edge)
    expect(g.w).toBe(744 + 4);
    expect(g.h).toBe(420 + 4);
    expect(1080 / (g.h - 4)).toBeGreaterThan(2.5);
    expect(1080 / (g.h - 4)).toBeLessThan(2.7);
  });
  it('snaps a camera coordinate to the nearest whole pixel', () => {
    expect(1.23 + snapBy(1.23, 0.1)).toBeCloseTo(1.2, 10);
    expect(-0.26 + snapBy(-0.26, 0.1)).toBeCloseTo(-0.3, 10);
    expect(snapBy(0.5, 0.25)).toBe(0);
  });
});
