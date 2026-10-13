/* A few colours for many (2026-10-01, the mage in the pixel-art look): a model's colours cut down to a small palette, as
   pixel art keeps them, so its painted detail reads as flat patches at the game's pixel size. Pure (no three.js): median
   cut, then a few rounds of k-means, in OKLab (where distance is near what the eye sees, so a blue coat and a grey belt
   don't fall into one grey); each colour then goes to its nearest. Colours are sRGB triples from 0 to 1, flat in one
   array. */

/** The palette of at most `k` colours that median cut finds in `rgb` (n colours, three numbers each): the box of colours
    with the widest spread is halved at its median along that channel until there are k, each box's mean a colour. A
    colour's `weight` (default 1) counts it that many times. */
export function medianCut(rgb: ArrayLike<number>, k: number, weight?: ArrayLike<number>): number[][] {
  const n = Math.floor(rgb.length / 3);
  if (!n || k < 1) return [];
  const w = (i: number) => (weight ? weight[i] : 1);
  type Box = { idx: number[]; ch: number; spread: number };
  const measure = (idx: number[]): Box => {
    let best = 0,
      spread = -1;
    for (let c = 0; c < 3; c++) {
      let lo = Infinity,
        hi = -Infinity;
      for (const i of idx) {
        const v = rgb[i * 3 + c];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo > spread) {
        spread = hi - lo;
        best = c;
      }
    }
    return { idx, ch: best, spread };
  };
  const boxes: Box[] = [measure([...Array(n).keys()])];
  while (boxes.length < k) {
    let at = -1,
      widest = 0;
    boxes.forEach((b, j) => {
      if (b.idx.length > 1 && b.spread > widest) {
        widest = b.spread;
        at = j;
      }
    });
    if (at < 0) break; // (every box a single colour)
    const b = boxes[at],
      sorted = b.idx.slice().sort((p, q) => rgb[p * 3 + b.ch] - rgb[q * 3 + b.ch]);
    // the weighted median: half the weight on each side
    const total = sorted.reduce((s, i) => s + w(i), 0);
    let acc = 0,
      cut = 1;
    for (let j = 0; j < sorted.length - 1; j++) {
      acc += w(sorted[j]);
      if (acc >= total / 2) {
        cut = j + 1;
        break;
      }
    }
    boxes.splice(at, 1, measure(sorted.slice(0, cut)), measure(sorted.slice(cut)));
  }
  return boxes.map((b) => {
    let s = 0;
    const m = [0, 0, 0];
    for (const i of b.idx) {
      const wi = w(i);
      s += wi;
      for (let c = 0; c < 3; c++) m[c] += rgb[i * 3 + c] * wi;
    }
    return m.map((v) => v / (s || 1));
  });
}

/** The palette colour nearest (a, b, c), straight-line in whatever space the palette is in. */
export function nearestColour(palette: readonly (readonly number[])[], a: number, b: number, c: number) {
  let best = 0,
    d = Infinity;
  palette.forEach((p, j) => {
    const e = (p[0] - a) ** 2 + (p[1] - b) ** 2 + (p[2] - c) ** 2;
    if (e < d) {
      d = e;
      best = j;
    }
  });
  return best;
}

/** The palette moved closer to the colours it stands for: `rounds` of k-means (each colour to its nearest, each palette
    colour to the mean of its own), so a box that held two kinds of colour gives way to both. */
export function refinePalette(rgb: ArrayLike<number>, palette: number[][], rounds: number): number[][] {
  const n = Math.floor(rgb.length / 3);
  let out = palette.map((p) => p.slice());
  for (let k = 0; k < rounds; k++) {
    const sum = out.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const r = rgb[i * 3],
        g = rgb[i * 3 + 1],
        b = rgb[i * 3 + 2],
        s = sum[nearestColour(out, r, g, b)];
      s[0] += r;
      s[1] += g;
      s[2] += b;
      s[3]++;
    }
    out = out.map((p, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : p));
  }
  return out;
}

/** sRGB (0 to 1) to OKLab. */
export function toOklab(r: number, g: number, b: number): [number, number, number] {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const R = lin(r),
    G = lin(g),
    B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
/** OKLab to sRGB (0 to 1, clamped). */
export function fromOklab(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const enc = (v: number) => {
    v = Math.max(0, Math.min(1, v));
    return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  return [
    enc(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    enc(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    enc(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** `rgb` (sRGB, three numbers a colour) cut down to at most `k` colours: the palette (sRGB) and each colour's place in it.
    Median cut and `rounds` of k-means in OKLab, its hue and chroma counted `chroma` times over (lightness spans far more
    of OKLab than colour does: counted plainly, a blue coat and a brown belt as light as each other fall into one grey). */
export function quantize(rgb: ArrayLike<number>, k: number, rounds: number, chroma = 1) {
  const n = Math.floor(rgb.length / 3),
    lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [L, a, b] = toOklab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
    lab[i * 3] = L;
    lab[i * 3 + 1] = a * chroma;
    lab[i * 3 + 2] = b * chroma;
  }
  const pal = refinePalette(lab, medianCut(lab, k), rounds),
    index = new Uint16Array(n);
  for (let i = 0; i < n; i++) index[i] = nearestColour(pal, lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]);
  return { palette: pal.map((p) => fromOklab(p[0], p[1] / chroma, p[2] / chroma)), index };
}
