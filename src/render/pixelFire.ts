/* Flames as pixel art on a canvas, shared by what burns on the floor: burning ground (actors/foes.ts) and burning oil
   (world/pools.ts). A tongue stands up the picture (up the screen once laid on the floor), stepped from a dark rim through
   the flame's colour to a pale brimstone core at its base (art bible 4.21): hard pixels, never a soft glow. */

/** A flame's tones, darkest to palest: rim, deep, mid, hot, core, white. */
export type FlameTones = readonly [string, string, string, string, string, string];
export const FLAME_TONES: Record<'fire' | 'blackfire', FlameTones> = {
  fire: ['#6e1a0c', '#c8401a', '#ff7a2a', '#ffc04a', '#f0e070', '#fff6c0'],
  blackfire: ['#1e0838', '#4a1a8a', '#8a4ae8', '#b88aff', '#e0c8ff', '#f6eeff'],
};

/** One tongue of flame `w` pixels wide at its base (x, y) and `h` tall, swaying by `phase`; `R` a seeded random. */
export function drawTongue(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  phase: number,
  tones: FlameTones,
  R: () => number,
) {
  const [rim, deep, mid, hot, core, white] = tones,
    dot = (px: number, py: number, col: string) => {
      g.fillStyle = col;
      g.fillRect(Math.round(px), Math.round(py), 1, 1);
    };
  for (let j = 0; j < h; j++) {
    const half = (w / 2) * Math.pow(1 - j / h, 0.7),
      sway = Math.round(Math.sin(j * 0.45 + phase) * (j / h) * 1.5);
    for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
      const edge = Math.abs(dx) >= half - 0.5,
        col = edge
          ? j > h * 0.6
            ? rim
            : deep
          : j < h * 0.25 && Math.abs(dx) <= 0.5
            ? j < 2
              ? white
              : core
            : j < h * 0.55 && Math.abs(dx) < half - 1
              ? hot
              : mid;
      dot(x + sway + dx, y - j, col);
    }
  }
  if (R() < 0.5) dot(x + (R() - 0.5) * 3, y - h - 2 - R() * 2, R() < 0.5 ? hot : mid); // (a flicker torn off)
}

/** A seeded random (visual only), as the floor's other pixel art draws. */
export function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
