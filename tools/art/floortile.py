"""A made floor picture to a floor face at the room kit's texel, as steps of light the game colours (R3, floor 2).

  python tools/art/floortile.py <image> --units 3 --out <png> [--levels 5] [--preview <png>]

The picture is a seamless-ish top-down view of a floor (a Tripo Studio image). Steps:
- **Tile:** cut where the picture repeats itself, as walltile.py does.
- **Texel:** scaled so the cut spans `--units` units across at the kit's 48 texels a unit and, down, 34 texels a unit
  (the floor is seen at 45 degrees: `CFG.roomKit.texel`), reduced by a majority level a block, with no blending.
- **Levels:** the picture's lightness in `--levels` steps (k-means on OKLab L), the darkest its joints. Only the steps
  are kept, not the colours: the game paints them in the room's own floor colours (its mortar for the joints, its base
  shaded for the rest: render/pixelTextures.ts `madeFloor`), so a theme's floor or a boss room's still differs.
Writes a grey PNG, step i of n at 255 * i / (n - 1), and with --preview a 2 x 2 repeat blown up.
"""
import argparse
import numpy as np
from PIL import Image
from oklab import to_oklab
from pixelize import kmeans
from walltile import cut

TX, TY = 48, 34  # texels a unit across and down (CFG.roomKit.texel)
DOWN = 4  # each texel is the majority of a DOWN x DOWN block


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--units", type=float, default=2.0)
    ap.add_argument("--out", required=True)
    ap.add_argument("--levels", type=int, default=5)
    ap.add_argument("--preview")
    a = ap.parse_args()

    src = np.asarray(Image.open(a.image).convert("RGB")).astype(np.float64)
    w, h = cut(src)
    src = src[:h, :w]
    tx = round(a.units * TX)
    ty = max(1, round(a.units * h / w * TY))
    big = np.asarray(Image.fromarray(src.astype(np.uint8)).resize((tx * DOWN, ty * DOWN), Image.BOX)).astype(np.float64)
    L = to_oklab(big)[..., :1].reshape(-1, 1)
    rng = np.random.default_rng(3)
    cen = kmeans(L[rng.choice(len(L), min(len(L), 20000), replace=False)], a.levels)
    order = np.argsort(cen[:, 0])
    rank = np.empty(len(cen), int)
    rank[order] = np.arange(len(cen))
    idx = rank[((L[:, None] - cen[None]) ** 2).sum(-1).argmin(1)].reshape(ty * DOWN, tx * DOWN)
    blocks = idx.reshape(ty, DOWN, tx, DOWN).transpose(0, 2, 1, 3).reshape(ty, tx, -1)
    counts = np.stack([(blocks == k).sum(-1) for k in range(len(cen))], -1)
    level = counts.argmax(-1)
    grey = (level * 255 / max(1, len(cen) - 1)).round().astype(np.uint8)
    Image.fromarray(grey, "L").save(a.out, optimize=True)
    share = np.bincount(level.ravel(), minlength=len(cen)) / level.size
    print(f"cut {w} x {h} of the picture, {tx} x {ty} texels ({a.units:g} units across), {len(cen)} levels: "
          + " ".join(f"{s:.0%}" for s in share))
    if a.preview:
        rep = np.tile(grey, (2, 2))
        Image.fromarray(rep, "L").resize((rep.shape[1] * 4, rep.shape[0] * 4), Image.NEAREST).save(a.preview)


if __name__ == "__main__":
    main()
