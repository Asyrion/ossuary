import { describe, expect, it } from 'vitest';
import { CFG } from '../../src/config';
import { pixelGrid, pixelLook, snapBy } from '../../src/render/pixelLook';

describe('the pixel look', () => {
  it('is the game\'s look: on from the start, at one of the rows it offers, with outlines', () => {
    expect(CFG.pixelLook.lines).toContain(CFG.pixelLook.start);
    expect(pixelLook()).toEqual({ lines: CFG.pixelLook.start, outline: true, bands: false });
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
