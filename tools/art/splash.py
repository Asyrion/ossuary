"""A made splash picture to a splash decal at the room kit's texel, as tones the game colours (R3, polish).

  python tools/art/splash.py <image> --units 2.42 --out <png> [--shares 0.15,0.45,0.3,0.1] [--preview <png>]

The picture is a top-down splash of one pale liquid on a light grey ground (a Tripo picture): a pool and its droplets
inside dark rims, a few glass shards. Steps:
- **Cut out:** the rims are the dark pixels, the liquid the coloured ones; what they close round is kept (small gaps
  in a rim closed first, so a shard's outline holds its glass), the ground and the soft glow outside the rims dropped.
  A kept piece that is mostly liquid is liquid (its pale edge band too); one that holds little is glass.
- **Texel:** the cut-out's square round its middle, scaled so it spans `--units` units across at the kit's 48 texels a
  unit and, down, 34 (the floor is seen at 45 degrees: `CFG.roomKit.texel`), each texel the majority tone of its
  block: no blending, alpha 0 or 255. Lone texels go to what surrounds them, and every liquid texel on the outside is
  made rim, so the splash is closed in a hard dark edge.
- **Tones:** the liquid's lightness in steps holding `--shares` of it (OKLab L, cut at its quantiles). Only the tones are kept, not the colours:
  the game paints the liquid in the potion's colour, the rim leaning to the floor's shadow, the glass as the shards
  (items/potionThrow.ts `splashPaint`).
Writes a grey PNG with alpha: tone i of n at 255 * i / (n - 1), tone 0 the rim, 1 the glass, 2 and up the liquid from
dark to light; with --preview the decal blown up in sample colours.
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from oklab import to_oklab

TX, TY = 48, 34  # texels a unit across and down (CFG.roomKit.texel)
DOWN = 8  # each texel the majority of a DOWN x DOWN block of the picture scaled to DOWN times the texels
RIM_L = 0.6  # OKLab lightness under which a pixel is rim (the ground is about 0.74)
LIQ_C = 0.045  # OKLab chroma over which a pixel is liquid (the ground about 0.014, the glow outside the rims under 0.04)
CLOSE = 5  # pixels of the picture: gaps in a rim this wide are closed before what it holds is filled
SPECK = 400  # pixels of the picture: kept pieces smaller than this are dropped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--units", type=float, default=2.42)
    ap.add_argument("--out", required=True)
    ap.add_argument("--shares", default="0.15,0.45,0.3,0.1", help="the liquid's tones, dark to light, as shares of it")
    ap.add_argument("--margin", type=float, default=0.02, help="share of the square left clear round the cut-out")
    ap.add_argument("--preview")
    a = ap.parse_args()

    rgb = np.asarray(Image.open(a.image).convert("RGB")).astype(np.float64)
    lab = to_oklab(rgb)
    L, C = lab[..., 0], np.hypot(lab[..., 1], lab[..., 2])
    rim = L < RIM_L
    liq = (C > LIQ_C) & ~rim
    closed = nd.binary_closing(rim, structure=np.ones((CLOSE, CLOSE)), iterations=1) | rim
    keep = nd.binary_fill_holes(closed | liq)
    lab_id, n = nd.label(keep)
    sizes = nd.sum(np.ones_like(L), lab_id, range(1, n + 1))
    liq_share = nd.sum(liq, lab_id, range(1, n + 1)) / np.maximum(sizes, 1)
    # tone per picture pixel: -1 clear, 0 rim, 1 glass, 2.. liquid
    tone = np.full(L.shape, -1, int)
    liquid_px = np.zeros(L.shape, bool)
    for i in range(n):
        m = lab_id == i + 1
        if sizes[i] < SPECK:
            continue
        if liq_share[i] > 0.25:
            liquid_px |= m & ~rim
        else:
            tone[m] = 1
        tone[m & rim] = 0
    # the liquid's tones by share of its pixels (k-means started from the extremes gave the few darkest pixels a tone
    # of their own and left the body one flat tone): the darkest `--shares[0]` the edge band, the lightest the highlight
    shares = np.cumsum([float(s) for s in a.shares.split(",")])[:-1]
    cuts = np.quantile(L[liquid_px], shares)
    tone[liquid_px] = 2 + np.searchsorted(cuts, L[liquid_px])
    # the square round the cut-out's middle
    ys, xs = np.nonzero(tone >= 0)
    cy, cx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2
    half = max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 / (1 - 2 * a.margin)
    pad = int(np.ceil(half)) + 2
    tone = np.pad(tone, pad, constant_values=-1)
    cy, cx = cy + pad, cx + pad
    sq = tone[int(round(cy - half)):int(round(cy + half)), int(round(cx - half)):int(round(cx + half))]
    tx, ty = round(a.units * TX), round(a.units * TY)
    big = np.asarray(Image.fromarray((sq + 1).astype(np.uint8)).resize((tx * DOWN, ty * DOWN), Image.NEAREST)).astype(int) - 1
    blocks = big.reshape(ty, DOWN, tx, DOWN).transpose(0, 2, 1, 3).reshape(ty, tx, -1)
    levels = len(a.shares.split(","))
    nt = 2 + levels
    counts = np.stack([(blocks == k).sum(-1) for k in range(-1, nt)], -1)
    # a texel is clear only when clear wins outright over the splash's tones together (thin droplets stay)
    t = counts[..., 1:].argmax(-1)
    t[counts[..., 0] > counts[..., 1:].sum(-1)] = -1

    # lone texels: a texel no 4-neighbour shares goes to its neighbours' majority
    for _ in range(2):
        p = np.pad(t, 1, constant_values=-1)
        nb = np.stack([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]], -1)
        lone = (nb != t[..., None]).all(-1)
        for y, x in zip(*np.nonzero(lone)):
            v, c = np.unique(nb[y, x], return_counts=True)
            t[y, x] = v[c.argmax()]
    # the outside edge in rim: a liquid texel beside clear (4-connected) is rim
    p = np.pad(t, 1, constant_values=-1)
    out_edge = (np.stack([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]], -1) == -1).any(-1)
    t[out_edge & (t >= 2)] = 0

    grey = np.where(t >= 0, np.round(np.maximum(t, 0) * 255 / (nt - 1)), 0).astype(np.uint8)
    alpha = np.where(t >= 0, 255, 0).astype(np.uint8)
    Image.fromarray(np.stack([grey, alpha], -1), "LA").save(a.out, optimize=True)
    share = np.bincount(t[t >= 0].ravel(), minlength=nt) / max(1, (t >= 0).sum())
    print(f"{tx} x {ty} texels ({a.units:g} units across), {(t >= 0).mean():.0%} drawn: rim {share[0]:.0%}, glass "
          f"{share[1]:.0%}, liquid " + " ".join(f"{s:.0%}" for s in share[2:]))
    if a.preview:
        pal = np.array([[0, 0, 0, 0], [28, 34, 56, 255], [180, 196, 204, 255]]
                       + [[40 + 50 * i, 120 + 35 * i, 110 + 35 * i, 255] for i in range(levels)], np.uint8)
        img = pal[t + 1]
        bg = np.zeros_like(img) + np.array([122, 98, 80, 255], np.uint8)
        img = np.where(img[..., 3:] > 0, img, bg)
        Image.fromarray(img, "RGBA").resize((tx * 6, ty * 6), Image.NEAREST).save(a.preview)


if __name__ == "__main__":
    main()
