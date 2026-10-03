/* Padding a Tripo texture's islands (docs/creatures.md): Tripo packs a model's texture as hundreds of small islands on
   black with no gutter between them, so anything that reads a texel near an island's edge (the texture scaled down, its
   mipmaps, the pixel-art look's bake sampling a few texels round each vertex) reads black or the next island, and the
   seams show as dark and bright specks. The islands are found from the mesh's own UVs (each triangle drawn into a mask),
   and every texel outside them takes the colour of the nearest island texels, grown outward a ring at a time until the
   gaps are filled. */
import type { Document, Texture } from '@gltf-transform/core';
import sharp from 'sharp';

/** Pad the islands of `tex` (a base colour texture of `doc`) outward by up to `rings` texels, filling the gaps between
    them; returns how many texels it filled. The image is written back as a JPEG of the same size. */
export async function padIslands(doc: Document, tex: Texture, rings = 64, quality = 92) {
  const { data, info } = await sharp(Buffer.from(tex.getImage()!)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, inside = new Uint8Array(W * H);
  // the islands: every triangle of every primitive that wears this texture, drawn into the mask at the texels' centres
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    if (p.getMaterial()?.getBaseColorTexture() !== tex) continue;
    const uv = p.getAttribute('TEXCOORD_0'), idx = p.getIndices()?.getArray(); if (!uv) continue;
    const n = idx ? idx.length : uv.getCount(), at = (k: number) => { const e = uv.getElement(idx ? idx[k] : k, []); return [e[0] * W, e[1] * H]; };
    for (let t = 0; t < n; t += 3) {
      const [a, b, c] = [at(t), at(t + 1), at(t + 2)];
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]); if (Math.abs(area) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + .5, py = y + .5;
        const w0 = ((b[0] - px) * (c[1] - py) - (c[0] - px) * (b[1] - py)) / area, w1 = ((c[0] - px) * (a[1] - py) - (a[0] - px) * (c[1] - py)) / area;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) inside[y * W + x] = 1;
      }
      const mx = (a[0] + b[0] + c[0]) / 3, my = (a[1] + b[1] + c[1]) / 3; // (a sliver's corners, each nudged into its face, so a corner on an island's edge marks the texel inside)
      for (const q of [a, b, c]) inside[Math.min(H - 1, Math.max(0, Math.floor(q[1] + (my - q[1]) * 1e-3))) * W + Math.min(W - 1, Math.max(0, Math.floor(q[0] + (mx - q[0]) * 1e-3)))] = 1;
    }
  }
  // grown outward a ring at a time: each texel outside takes the mean of its neighbours already filled
  let filled = 0, done = inside;
  for (let ring = 0; ring < rings; ring++) {
    const next = done.slice(); let grew = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (done[i]) continue;
      let n = 0, r = 0, g = 0, bl = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx; if (!done[j]) continue;
        r += data[j * C]; g += data[j * C + 1]; bl += data[j * C + 2]; n++;
      }
      if (!n) continue;
      data[i * C] = r / n; data[i * C + 1] = g / n; data[i * C + 2] = bl / n; next[i] = 1; grew++;
    }
    done = next; filled += grew; if (!grew) break;
  }
  const out = await sharp(data, { raw: { width: W, height: H, channels: C } }).jpeg({ quality }).toBuffer();
  tex.setImage(new Uint8Array(out)).setMimeType('image/jpeg');
  return { filled, islands: inside.reduce((s, v) => s + v, 0), size: W };
}
