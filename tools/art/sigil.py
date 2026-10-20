"""A made circle of magic (white line art on black, from Tripo Studio's image tab) to a mask at the game's pixel: the
circles a spell draws on the floor or over a foe (R3, floor 1 step F2).

  python tools/art/sigil.py <image> --size 192 --out <png> [--erase 0.75:0.91 ...] [--glyphs 0.76:0.9:16 ...]
                            [--cut 0.4] [--preview <png>]

- **Cut out:** the circle's box from where the lines are, a disc of radius 1 round its middle.
- **Pixel:** reduced to `--size` pixels across (the spell's diameter at 48 game pixels a unit) by the share of line in
  each pixel, kept where it passes `--cut`: whole pixels, no blending.
- **Glyphs:** a picture's rune bands may hold letters of a real alphabet, which the game doesn't name (CLAUDE.md, Lore
  limits): each `--erase a:b` clears the band between those radii (a share of the radius), and each `--glyphs a:b:n`
  sets `n` of the Wardens' glyphs round it (the five-by-five glyphs cut into the Seal's walls, render/pixelTextures.ts
  `WARD_GLYPHS`), upright, grown to the band in whole pixels.
Writes a PNG: white, its alpha the mask (the game colours it in the spell's school and lights it).
"""
import argparse, math
import numpy as np
from PIL import Image

# render/pixelTextures.ts WARD_GLYPHS (the Wardens' glyphs)
WARD_GLYPHS = [
    ['..X..', '.XXX.', 'X.X.X', '..X..', '..X..'],
    ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'],
    ['XXXXX', '..X..', '.XXX.', '..X..', 'XXXXX'],
    ['.X.X.', '.X.X.', 'XXXXX', '..X..', '.XXX.'],
    ['..X..', '.X.X.', 'X...X', '.X.X.', '..X..'],
    ['X.X.X', 'X.X.X', 'XXXXX', '..X..', '..X..'],
]


def band(s):
    return [float(v) for v in s.split(':')]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('image')
    ap.add_argument('--size', type=int, required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--erase', action='append', default=[])
    ap.add_argument('--glyphs', action='append', default=[])
    ap.add_argument('--cut', type=float, default=0.4)
    ap.add_argument('--preview')
    a = ap.parse_args()

    src = np.asarray(Image.open(a.image).convert('L')).astype(np.float64) / 255
    ys, xs = np.nonzero(src > 0.5)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    R = max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 + 2
    box = (int(cx - R), int(cy - R), int(cx + R), int(cy + R))
    crop = Image.fromarray((src * 255).astype(np.uint8)).crop(box)
    N = a.size
    small = np.asarray(crop.resize((N, N), Image.BOX)).astype(np.float64) / 255
    mask = small > a.cut
    yy, xx = np.indices((N, N))
    r = np.hypot(yy + 0.5 - N / 2, xx + 0.5 - N / 2) / (N / 2)
    mask &= r <= 1.0
    for e in a.erase:
        lo, hi = band(e)
        mask &= ~((r >= lo) & (r <= hi))
    for gspec in a.glyphs:
        lo, hi, n = band(gspec)
        k = max(1, int((hi - lo) * N / 2 / 5))  # whole pixels a glyph's texel
        rm = (lo + hi) / 2 * N / 2
        for i in range(int(n)):
            ang = i / n * 2 * math.pi - math.pi / 2
            gx, gy = N / 2 + math.cos(ang) * rm, N / 2 + math.sin(ang) * rm
            glyph = WARD_GLYPHS[i % len(WARD_GLYPHS)]
            for row, line in enumerate(glyph):
                for col, ch in enumerate(line):
                    if ch != 'X':
                        continue
                    x0 = int(round(gx + (col - 2.5) * k))
                    y0 = int(round(gy + (row - 2.5) * k))
                    mask[max(0, y0):y0 + k, max(0, x0):x0 + k] = True
    out = np.zeros((N, N, 4), np.uint8)
    out[..., :3] = 255
    out[..., 3] = mask * 255
    Image.fromarray(out).save(a.out, optimize=True)
    print(f'{a.image}: {N} px across, {int(mask.sum())} pixels lit')
    if a.preview:
        p = np.zeros((N, N, 3), np.uint8)
        p[mask] = 255
        Image.fromarray(p).resize((N * 3, N * 3), Image.NEAREST).save(a.preview)


if __name__ == '__main__':
    main()
