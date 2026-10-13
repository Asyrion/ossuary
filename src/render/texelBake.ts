/* A Tripo model's painted texture made pixel art at the size the game draws it (2026-10-05, the owner: Tripo's 2k painted
   textures don't read at the game's pixel size; every model from Tripo gets it), baked once by tools/texel-bake.ts (from
   animate-creature and prepare-asset). Pure (no three.js): how big the texture should be for at least one of its texels
   to a game pixel, the texture shrunk to that by averaging blocks of texels within each UV island (which smooths away
   the paint's fine noise, and keeps the atlas's thousand small islands, unrelated parts of the model, from bleeding into
   each other), its glowing markings kept (eyes, bright stripes: a sliver of the texture that averaging would wash out),
   the shadows Tripo painted in lifted (the game's banded light shades it again), and the colours cut to a palette.
   Colours are sRGB from 0 to 1, three numbers each, flat in one array. */
import { fromOklab, quantize, toOklab } from './palette';

/** The side of the shrunk texture, a power of two: the texture's side `size` over how many of its texels fall on a game
    pixel (the square root of the texels the model's faces cover, `texelArea`, over the game pixels they cover,
    `pixelArea`), times `detail`, kept within [min, max] and never more than `size`. */
export function bakeSize(size: number, texelArea: number, pixelArea: number, detail: number, min: number, max: number) {
  if (!(texelArea > 0) || !(pixelArea > 0)) return Math.min(size, max);
  const want = (size / Math.sqrt(texelArea / pixelArea)) * detail;
  const p2 = 2 ** Math.ceil(Math.log2(Math.max(1, want)) - 1e-9); // (up: never fewer texels than game pixels)
  return Math.min(size, max, Math.max(min, p2));
}

/** Which UV island each texel of a `w` × `h` texture belongs to (0: none, the gutter between them), from a mesh's
    texture coordinates `uv` (two numbers a vertex, v up as glTF's are drawn: rows from the image's top) and its triangles
    `index`: triangles sharing a vertex are one island (a texture's seams split the vertices), and each is drawn into the
    texels whose middles it covers. `first` numbers the islands on from there (several meshes, one texture). */
export function islandLabels(
  uv: ArrayLike<number>,
  index: ArrayLike<number>,
  w: number,
  h: number,
  labels = new Int32Array(w * h),
  first = 1,
) {
  const n = Math.floor(uv.length / 2),
    parent = new Int32Array(n).map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let t = 0; t + 2 < index.length; t += 3) {
    const a = find(index[t]),
      b = find(index[t + 1]),
      c = find(index[t + 2]);
    parent[b] = a;
    parent[c] = a;
  }
  const id = new Map<number, number>();
  let next = first;
  for (let t = 0; t + 2 < index.length; t += 3) {
    const root = find(index[t]);
    let lab = id.get(root);
    if (lab === undefined) {
      lab = next++;
      id.set(root, lab);
    }
    const [ax, ay, bx, by, cx, cy] = [index[t], index[t + 1], index[t + 2]].flatMap((v) => [
      uv[v * 2] * w,
      uv[v * 2 + 1] * h,
    ]);
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (!area) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))),
      x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))),
      y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5,
          py = y + 0.5;
        const u = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area,
          v = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area;
        if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) labels[y * w + x] = lab;
      }
  }
  return { labels, next };
}

/** The RGBA texels `data` (`w` × `h`, bytes) shrunk to `side` × `side`, each texel the mean of the block it covers:
    sRGB, three numbers a texel, rows from the image's top as `data`'s are. With `labels` (islandLabels), a block averages
    only the texels of the island that covers most of it, so neighbouring islands (unrelated parts of the model) don't
    bleed into each other. Texels for which `keep` holds (a glowing marking) take a block over when they are `share` of
    it or more, its colour then their mean, and are flagged in `kept`. */
export function shrink(
  data: ArrayLike<number>,
  w: number,
  h: number,
  side: number,
  labels?: ArrayLike<number>,
  keep?: (r: number, g: number, b: number) => boolean,
  share = 0.2,
) {
  const rgb = new Float32Array(side * side * 3),
    kept = new Uint8Array(side * side);
  const bw = w / side,
    bh = h / side,
    counts = new Map<number, number>();
  for (let oy = 0; oy < side; oy++)
    for (let ox = 0; ox < side; ox++) {
      const x0 = Math.floor(ox * bw),
        x1 = Math.max(x0 + 1, Math.floor((ox + 1) * bw)),
        y0 = Math.floor(oy * bh),
        y1 = Math.max(y0 + 1, Math.floor((oy + 1) * bh));
      let major = 0;
      if (labels) {
        // (the island covering most of the block)
        counts.clear();
        let best = 0;
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const l = labels[y * w + x];
            if (l) {
              const c = (counts.get(l) ?? 0) + 1;
              counts.set(l, c);
              if (c > best) {
                best = c;
                major = l;
              }
            }
          }
      }
      const all = [0, 0, 0, 0],
        glow = [0, 0, 0, 0];
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          if (major && labels![y * w + x] !== major) continue;
          const k = (y * w + x) * 4,
            r = data[k] / 255,
            g = data[k + 1] / 255,
            b = data[k + 2] / 255;
          all[0] += r;
          all[1] += g;
          all[2] += b;
          all[3]++;
          if (keep?.(r, g, b)) {
            glow[0] += r;
            glow[1] += g;
            glow[2] += b;
            glow[3]++;
          }
        }
      const o = oy * side + ox,
        use = glow[3] && glow[3] >= share * all[3] ? glow : all;
      kept[o] = use === glow ? 1 : 0;
      for (let c = 0; c < 3; c++) rgb[o * 3 + c] = use[3] ? use[c] / use[3] : 0;
    }
  return { rgb, kept };
}

/** Whether a colour glows: light enough (OKLab lightness `light` or more) and colourful enough (chroma `chroma` or more),
    as painted eyes and glowing markings are; a grey or a pale skin never does. */
export const glows = (light: number, chroma: number) => (r: number, g: number, b: number) => {
  const [L, a, bb] = toOklab(r, g, b);
  return L >= light && Math.hypot(a, bb) >= chroma;
};

/** Lift the shadows painted into the colours `rgb` and set their contrast, in place: each colour's lightness (OKLab) is
    raised to `lift` (below 1 lifts the darks most, the lights hardly), then spread about the middle by `contrast`, its hue
    kept. */
export function liftShadows(rgb: Float32Array, lift: number, contrast = 1) {
  for (let i = 0; i < rgb.length; i += 3) {
    const [L, a, b] = toOklab(rgb[i], rgb[i + 1], rgb[i + 2]);
    const L2 = Math.min(1, Math.max(0, (Math.max(0, L) ** lift - 0.5) * contrast + 0.5));
    const [r, g, bl] = fromOklab(L2, a, b);
    rgb[i] = Math.min(1, Math.max(0, r));
    rgb[i + 1] = Math.min(1, Math.max(0, g));
    rgb[i + 2] = Math.min(1, Math.max(0, bl));
  }
  return rgb;
}

/** The faces' area in texels of a `w` × `h` texture and in game pixels (at `pxPerUnit` game pixels a model unit, the
    share `facing` of them turned to the camera): positions `pos` (three numbers a vertex), texture coordinates `uv` (two)
    and triangles `index`. */
export function faceAreas(
  pos: ArrayLike<number>,
  uv: ArrayLike<number>,
  index: ArrayLike<number>,
  w: number,
  h: number,
  pxPerUnit: number,
  facing = 0.5,
) {
  let texel = 0,
    pixel = 0;
  for (let t = 0; t + 2 < index.length; t += 3) {
    const i = index[t],
      j = index[t + 1],
      k = index[t + 2];
    const e1 = [0, 1, 2].map((c) => pos[j * 3 + c] - pos[i * 3 + c]),
      e2 = [0, 1, 2].map((c) => pos[k * 3 + c] - pos[i * 3 + c]);
    pixel +=
      (Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2) *
      pxPerUnit *
      pxPerUnit *
      facing;
    const du1 = (uv[j * 2] - uv[i * 2]) * w,
      dv1 = (uv[j * 2 + 1] - uv[i * 2 + 1]) * h,
      du2 = (uv[k * 2] - uv[i * 2]) * w,
      dv2 = (uv[k * 2 + 1] - uv[i * 2 + 1]) * h;
    texel += Math.abs(du1 * dv2 - du2 * dv1) / 2;
  }
  return { texel, pixel };
}

/** The tuning of a bake (CFG.creatures.texel). */
export interface TexelTuning {
  detail: number;
  facing: number;
  min: number;
  max: number;
  glowLight: number;
  glowChroma: number;
  glowShare: number;
  lift: number;
  contrast: number;
  colours: number;
  refine: number;
  chroma: number;
}

/** A model's texture (`data`, RGBA bytes, `w` × `h`, rows from the image's top) made pixel art for the game: the meshes
    wearing it (`meshes`: positions, texture coordinates with v from the image's top as glTF's, triangles), drawn at
    `pxPerUnit` game pixels a model unit. Its colour and its glow (black but the kept markings), RGBA bytes, `side` ×
    `side`; how many colours it kept and how many of its texels glow. */
export function bakeTexel(
  data: ArrayLike<number>,
  w: number,
  h: number,
  meshes: { pos: ArrayLike<number>; uv: ArrayLike<number>; index: ArrayLike<number> }[],
  pxPerUnit: number,
  T: TexelTuning,
) {
  let texel = 0,
    pixel = 0,
    labels: Int32Array<ArrayBuffer> | undefined,
    first = 1;
  for (const m of meshes) {
    const a = faceAreas(m.pos, m.uv, m.index, w, h, pxPerUnit, T.facing);
    texel += a.texel;
    pixel += a.pixel;
    ({ labels, next: first } = islandLabels(m.uv, m.index, w, h, labels, first));
  }
  const side = bakeSize(w, texel, pixel, T.detail, T.min, T.max);
  const { rgb, kept } = shrink(data, w, h, side, labels, glows(T.glowLight, T.glowChroma), T.glowShare);
  liftShadows(rgb, T.lift, T.contrast);
  const { palette, index } = quantize(rgb, T.colours, T.refine, T.chroma);
  const colour = new Uint8Array(side * side * 4),
    glow = new Uint8Array(side * side * 4);
  for (let i = 0; i < side * side; i++) {
    const p = palette[index[i]];
    for (let c = 0; c < 3; c++) {
      colour[i * 4 + c] = Math.round(p[c] * 255);
      if (kept[i]) glow[i * 4 + c] = colour[i * 4 + c];
    }
    colour[i * 4 + 3] = glow[i * 4 + 3] = 255;
  }
  return { side, colour, glow, colours: palette.length, glowing: kept.reduce((n, k) => n + k, 0) };
}
