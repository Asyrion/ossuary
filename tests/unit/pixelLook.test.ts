import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { LINES, gridFor, pixelGrid, pixelLook, snapBy, texelPixel } from '../../src/render/pixelLook';

describe('the pixel look', () => {
  it('is the game\'s look: on from the start, at the texel (the room kit\'s), with outlines; the rows of earlier offered too', () => {
    expect(CFG.pixelLook.start).toBe('texel');
    expect(LINES).toEqual(['texel', 'fine', ...CFG.pixelLook.lines]);
    expect(pixelLook()).toEqual({ lines: 'texel', outline: true, bands: false });
  });
  it('at the texel, a game pixel is a room-kit texel: a 48th of a unit across, and down the screen as much as a floor texel seen at 45°', () => {
    const { px, py } = texelPixel(48, 34, Math.PI / 4);
    expect(px).toBeCloseTo(1 / 48, 10);
    expect(py).toBeCloseTo(Math.SQRT1_2 / 34, 10); // (a floor texel, 1/34 of a unit along z, foreshortened)
    expect(py / px).toBeGreaterThan(.99); expect(py / px).toBeLessThan(1.01); // (square on screen, near enough)
    // a one-cell room at 1080p (15.5 × 8.72 units in view): about 2.6 screen pixels to a game pixel
    const g = gridFor(15.5, 15.5 * 1080 / 1920, px, py, 2);
    expect(g.w % 2).toBe(0); expect(g.h % 2).toBe(0); // (even, so the camera's whole pixel lands on a pixel edge)
    expect(g.w).toBe(744 + 4); expect(g.h).toBe(420 + 4);
    expect(1080 / (g.h - 4)).toBeGreaterThan(2.5); expect(1080 / (g.h - 4)).toBeLessThan(2.7);
  });
  it('blows each game pixel up to a whole number of screen pixels, never more rows than asked for', () => {
    expect(pixelGrid(1920, 1080, 270)).toEqual({ w: 480, h: 270, f: 4 });
    expect(pixelGrid(1920, 1080, 360)).toEqual({ w: 640, h: 360, f: 3 });
    expect(pixelGrid(1920, 1080, 540)).toEqual({ w: 960, h: 540, f: 2 });
    expect(pixelGrid(1280, 720, 270)).toEqual({ w: 427, h: 240, f: 3 }); // (720 / 270 rounds up to 3)
    expect(pixelGrid(2560, 1440, 180)).toEqual({ w: 320, h: 180, f: 8 });
    expect(pixelGrid(2560, 1440, 540).h).toBe(480); // (1440 / 540 rounds up to 3)
    expect(pixelGrid(2560, 1440, 720).h).toBe(720);
    expect(pixelGrid(1920, 1080, 720).h).toBe(540); // (a 1080p screen hasn't the pixels for 720)
    expect(pixelGrid(3840, 2160, 540).h).toBe(540); // 4K: 540, 720 and 1080 each on whole pixels
    expect(pixelGrid(3840, 2160, 720).h).toBe(720);
    expect(pixelGrid(3840, 2160, 1080).h).toBe(1080);
    expect(pixelGrid(2560, 1440, 1080).h).toBe(720); // (1440p: 1080 draws as 720)
    // a smaller window keeps the look, at fewer rows, rather than turning sharp
    expect(pixelGrid(1920, 950, 540)).toMatchObject({ h: 475, f: 2 });
    expect(pixelGrid(1440, 800, 540)).toMatchObject({ h: 400, f: 2 });
    expect(pixelGrid(1920, 950, 720).f).toBe(2);
    expect(pixelGrid(300, 100, 360).f).toBe(1); // (a tiny window: never below one screen pixel)
  });
  it('snaps a camera coordinate to the nearest whole pixel', () => {
    expect(1.23 + snapBy(1.23, .1)).toBeCloseTo(1.2, 10);
    expect(-0.26 + snapBy(-0.26, .1)).toBeCloseTo(-0.3, 10);
    expect(snapBy(0.5, .25)).toBe(0);
  });
});
