/* Drawn icons made pixel art (art bible 4.6: the HUD's icons are pixel art with the hard outline): an SVG drawn small
   onto a canvas, its edge cut hard (a pixel is the icon's or it isn't), a closed outline one pixel outside it. The SVG
   loads as an image, so the first ask starts the work and gets nothing; whoever shows icons listens for them
   (`onPixelIcons`) and draws again. */
const INK = [11, 9, 16];
const done = new Map<string, string>(),
  started = new Set<string>(),
  listeners: (() => void)[] = [];

/** The icon `key` as pixel art `size` pixels across (and one of outline round it), as a data URL; null while it is being
    made from `svg` (a standalone SVG document). */
export function pixelIcon(key: string, svg: string, size: number) {
  const hit = done.get(key);
  if (hit) return hit;
  if (!started.has(key)) {
    started.add(key);
    void make(svg, size).then((url) => {
      if (!url) return;
      done.set(key, url);
      for (const f of listeners) f();
    });
  }
  return null;
}
/** Call `f` whenever an icon has been made. */
export function onPixelIcons(f: () => void) {
  listeners.push(f);
}

async function make(svg: string, size: number) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  try {
    await img.decode();
  } catch {
    return null; // (the drawn SVG stays where it is shown)
  }
  const n = size + 2,
    c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 1, 1, size, size);
  const d = g.getImageData(0, 0, n, n),
    a = d.data,
    solid = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && a[(y * n + x) * 4 + 3] === 255;
  for (let i = 3; i < a.length; i += 4) a[i] = a[i] >= 110 ? 255 : 0; // (hard edges: no soft alpha, art bible 3)
  const ring: number[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (!solid(x, y) && [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => solid(x + dx, y + dy)))) ring.push(y * n + x);
  for (const i of ring) a.set([...INK, 255], i * 4);
  g.putImageData(d, 0, 0);
  return c.toDataURL();
}
