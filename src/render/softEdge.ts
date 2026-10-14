/* A soft edge drawn in code: the alpha of a canvas blurred as the canvas filter `blur(σpx)` would (a
   Gaussian, in two passes), on the CPU. A canvas filter is rasterised on the GPU, and on a software GPU (the browser
   tests' SwiftShader, a machine without a graphics card) a pool's or a pit's blurred outline cost seconds each: a floor of
   pools held its first frame for fifteen. Pure (no DOM): the pixels in, the pixels out. */

/** A Gaussian of `sigma` as weights from -4σ to 4σ, summing to 1 (a Gaussian's every contour is round, as the canvas's
    blur is, out to its faintest, which is where an alpha map's edge lies: three box blurs, or a kernel cut at 3σ, leave
    square corners there). */
export function kernelFor(sigma: number): Float32Array {
  const r = Math.ceil(4 * sigma),
    k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return k;
}

/** One pass of the kernel along rows or columns, from `src` into `dst` (both `w` × `h`); outside is 0. */
function pass(src: Float32Array, dst: Float32Array, w: number, h: number, k: Float32Array, horizontal: boolean) {
  const r = (k.length - 1) / 2,
    lines = horizontal ? h : w,
    len = horizontal ? w : h,
    step = horizontal ? 1 : w;
  for (let l = 0; l < lines; l++) {
    const base = horizontal ? l * w : l;
    for (let i = 0; i < len; i++) {
      let acc = 0;
      for (let j = Math.max(0, i - r), e = Math.min(len - 1, i + r); j <= e; j++)
        acc += src[base + j * step] * k[j - i + r];
      dst[base + i * step] = acc;
    }
  }
}

/** Blur `rgba` (`w` × `h`, four bytes a pixel) in place as `blur(sigma px)` would, for shapes filled in one colour: the
    alpha blurred, and every pixel left with any (a whole step of 8 bits) in that colour, as the canvas hands a blurred
    shape to WebGL, unpremultiplied (a three.js alpha map reads the green, so its outline reaches as far). */
export function softenAlpha(rgba: Uint8ClampedArray, w: number, h: number, sigma: number) {
  const a = new Float32Array(w * h),
    b = new Float32Array(w * h),
    fill = [0, 0, 0];
  for (let i = 0; i < w * h; i++) {
    a[i] = rgba[i * 4 + 3];
    if (a[i] === 255) for (let c = 0; c < 3; c++) fill[c] = rgba[i * 4 + c];
  }
  const k = kernelFor(sigma);
  pass(a, b, w, h, k, true);
  pass(b, a, w, h, k, false);
  for (let i = 0; i < w * h; i++) {
    const v = Math.round(a[i]);
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = v ? fill[c] : 0;
    rgba[i * 4 + 3] = v;
  }
}

/** Blur what has been drawn on `g`'s canvas so far (as `softenAlpha`), through a context read on the CPU. */
export function softenCanvas(g: CanvasRenderingContext2D, sigma: number) {
  const { width: w, height: h } = g.canvas,
    img = g.getImageData(0, 0, w, h);
  softenAlpha(img.data, w, h, sigma);
  g.putImageData(img, 0, 0);
}
