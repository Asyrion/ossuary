import { describe, expect, it } from 'vitest';
import { daylightPhase, ridge } from '../../src/world/daylightData';
import { CFG } from '../../src/config';

describe('daylight: the cave mouth at dawn', () => {
  it('draws each range of hills the same from its seed, within its height', () => {
    const a = ridge(11, -15, 15, 0.3, 2, 0.75),
      b = ridge(11, -15, 15, 0.3, 2, 0.75),
      c = ridge(12, -15, 15, 0.3, 2, 0.75);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a[0][0]).toBe(-15);
    expect(a[a.length - 1][0]).toBeCloseTo(15);
    for (const [, y] of a) {
      expect(y).toBeGreaterThanOrEqual(2 - 0.75 - 1e-9);
      expect(y).toBeLessThanOrEqual(2 + 0.75 + 1e-9);
    }
    const heights = a.map(([, y]) => y);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.5); // (hills and peaks, not a flat line)
  });
  it('fades the white, opens the cave and lays the end screen over it, in that order', () => {
    const C = CFG.daylight;
    expect(daylightPhase(0, C)).toEqual({ flash: 1, lift: 0, end: false });
    const mid = daylightPhase(C.lift / 2, C);
    expect(mid.lift).toBeCloseTo(0.5);
    expect(mid.end).toBe(false);
    expect(daylightPhase(C.lift, C).lift).toBe(1);
    expect(daylightPhase(C.flash, C).flash).toBe(0);
    expect(daylightPhase(C.endAt - 0.01, C).end).toBe(false);
    expect(daylightPhase(C.endAt, C).end).toBe(true);
    expect(C.endAt).toBeGreaterThan(C.lift); // (the view is open before the end screen comes)
  });
});
