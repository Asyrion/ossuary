/* Daylight (M7 step 3; docs/M7-plan.md): the pure part of the cave mouth at dawn. Its ridgelines and where the scene is in
   its few seconds; daylight.ts builds and runs it, daylightLooks.ts draws it. */
import { mulberry } from '../rng';

/** A ridgeline from x0 to x1: points every `step` apart, about `base` high, rising and falling by up to `amp` (two waves
    and a little roughness, so a range reads as hills and peaks, not noise); the same `seed`, the same ridge. */
export function ridge(seed: number, x0: number, x1: number, step: number, base: number, amp: number): [number, number][] {
  const R = mulberry(seed), p1 = R() * 6.28, p2 = R() * 6.28, f1 = .25 + R() * .2, f2 = .7 + R() * .5, out: [number, number][] = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) {
    const wave = Math.sin(x * f1 + p1) * .6 + Math.sin(x * f2 + p2) * .3 + (R() - .5) * .2; // (in -1.1 .. 1.1)
    out.push([x, base + amp * wave / 1.1]);
  }
  return out;
}

export interface DaylightTimes { flash: number; lift: number; endAt: number }
/** Where the scene is at `t` seconds: the white still fading (`flash`, 1 to 0), the cave's overhang lifting off the view
    (`lift`, 0 to 1, eased), and whether the end screen is due. */
export function daylightPhase(t: number, c: DaylightTimes) {
  const k = Math.min(1, Math.max(0, t / c.lift));
  return { flash: Math.max(0, 1 - t / c.flash), lift: k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, end: t >= c.endAt };
}
