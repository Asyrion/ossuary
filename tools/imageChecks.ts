/* Checks on a texture's pixels for tools/prepare-texture.ts (docs/assets.md: floor and wall textures), pure so the
   unit tests can feed them made-up images. Pixels are raw rows of `channels` bytes each (RGB or RGBA). */

export interface Pixels {
  data: Uint8Array | Uint8ClampedArray | Buffer;
  width: number;
  height: number;
  channels: number;
}

const lum = (p: Pixels, x: number, y: number) => {
  const i = (y * p.width + x) * p.channels;
  return 0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2];
};

/** How much a tile's edges jump where it repeats, against how much neighbouring pixels differ inside it: about 1 for
    a seamless tile, 2 or more where a seam will show. The larger of the two seams (left against right, top against
    bottom). */
export function seamScore(p: Pixels) {
  const { width: w, height: h } = p;
  let seamX = 0,
    seamY = 0,
    inX = 0,
    inY = 0;
  for (let y = 0; y < h; y++) {
    seamX += Math.abs(lum(p, w - 1, y) - lum(p, 0, y));
    for (let x = 0; x < w - 1; x += Math.max(1, w >> 5)) inX += Math.abs(lum(p, x + 1, y) - lum(p, x, y));
  }
  for (let x = 0; x < w; x++) {
    seamY += Math.abs(lum(p, x, h - 1) - lum(p, x, 0));
    for (let y = 0; y < h - 1; y += Math.max(1, h >> 5)) inY += Math.abs(lum(p, x, y + 1) - lum(p, x, y));
  }
  const perX = inX / (h * Math.ceil((w - 1) / Math.max(1, w >> 5))),
    perY = inY / (w * Math.ceil((h - 1) / Math.max(1, h >> 5)));
  return Math.max(seamX / h / Math.max(perX, 1), seamY / w / Math.max(perY, 1));
}

/** How uneven the light is: the brightest quarter of the tile against the darkest, as a share of the mean (0 for
    flat light; baked light and shadow read as a glow or a hole when the tile repeats). */
export function lightSpread(p: Pixels) {
  const { width: w, height: h } = p,
    q = [0, 0, 0, 0],
    n = [0, 0, 0, 0];
  const step = Math.max(1, Math.min(w, h) >> 7);
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) {
      const k = (y < h / 2 ? 0 : 2) + (x < w / 2 ? 0 : 1);
      q[k] += lum(p, x, y);
      n[k]++;
    }
  const means = q.map((s, i) => s / n[i]),
    mean = means.reduce((a, b) => a + b, 0) / 4;
  return mean > 0 ? (Math.max(...means) - Math.min(...means)) / mean : 0;
}

/** Whether an image's border is see-through (an icon cut out from its background). */
export function transparentBorder(p: Pixels) {
  if (p.channels < 4) return false;
  let clear = 0,
    total = 0;
  const at = (x: number, y: number) => {
    total++;
    if (p.data[(y * p.width + x) * 4 + 3] < 16) clear++;
  };
  for (let x = 0; x < p.width; x++) {
    at(x, 0);
    at(x, p.height - 1);
  }
  for (let y = 1; y < p.height - 1; y++) {
    at(0, y);
    at(p.width - 1, y);
  }
  return clear / total > 0.9;
}

/** A coin on a plain ground (2026-10-02, the owner's coins: white, or cut out): its circle, found as the width of what
    differs from the ground (the corners' colour, or see-through), centred that far below its top, so a shadow or a
    piece hanging under it doesn't stretch it; `round` is its height over its width (about 1 for a plain coin). Null when
    nothing stands on the ground. */
export function coinCircle(p: Pixels) {
  const { width: w, height: h, channels: c, data } = p,
    at = (x: number, y: number) => (y * w + x) * c;
  const clear = c === 4 && [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)].every((i) => data[i + 3] < 16);
  const ground = [0, 1, 2].map(
    (k) => [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)].reduce((s, i) => s + data[i + k], 0) / 4,
  );
  const isGround = (i: number) =>
    clear
      ? data[i + 3] < 16
      : Math.abs(data[i] - ground[0]) + Math.abs(data[i + 1] - ground[1]) + Math.abs(data[i + 2] - ground[2]) <
          24 * 3 ||
        (c === 4 && data[i + 3] < 16);
  let x0 = w,
    x1 = -1,
    y0 = h,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!isGround(at(x, y))) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return null;
  const d = x1 - x0 + 1;
  return { cx: (x0 + x1 + 1) / 2, cy: y0 + d / 2, r: d / 2, round: (y1 - y0 + 1) / d };
}
