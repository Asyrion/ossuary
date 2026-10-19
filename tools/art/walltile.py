"""A made wall picture to a wall face at the room kit's texel, in a floor's colours (R3, floor 1 step D).

  python tools/art/walltile.py <image> --floor 1 --units 2 --out <png> [--colours 8] [--mid #rrggbb] [--keep 0.5]
                               [--lmax 0.9] [--preview <png>]

The picture is a seamless-ish front view of a wall (a Tripo Studio image, docs/art-bible.md 4.8). Steps:
- **Tile:** cut where the picture repeats itself: the column and the row nearest its right and bottom edge that match
  its first ones best, so the cut wraps with no seam even when the picture's own edges don't.
- **Texel:** scaled so the cut spans `--units` units across at the kit's 48 texels a unit (`CFG.roomKit.texel`); the
  height keeps the picture's proportion on screen (the wall is seen at 45 degrees, its texels 34 a unit down, so a
  square of texels looks square). Reduced by a majority colour a block, with no blending (art bible 6).
- **Colours:** `--colours` clusters in OKLab, each moved into the floor's wall colours from data/floors.json: the
  darkest to its mortar, the median to its brick (or `--mid`, the bone of an ossuary wall), the rest along the line
  between them; `--keep` of each cluster's own colour against the median is kept, so bricks still differ. Lights lean
  toward the floor's highlight, darks toward its shadow (art bible 4.2).
Writes the PNG at the texel (the game lays its stains on it at run time) and, with --preview, a 2 x 2 repeat blown up.
"""
import argparse, json, pathlib
import numpy as np
from PIL import Image
from oklab import floor_palette, hex_rgb, to_oklab, to_srgb
from pixelize import kmeans, turn_toward

TEXEL = 48  # texels a unit across (CFG.roomKit.texel[0])
DOWN = 4  # each texel is the majority of a DOWN x DOWN block
ROOT = pathlib.Path(__file__).resolve().parents[2]


def cut(img, lo=0.55):
    """The width and height to cut at so the picture wraps: where a column (row) matches the first best, past `lo`."""
    g = img.mean(-1)
    def best(a):
        n = a.shape[1]
        first = a[:, :3]
        scores = [(np.abs(a[:, w:w + 3] - first).mean(), w) for w in range(int(n * lo), n - 2)]
        return min(scores)[1]
    return best(g), best(g.T)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--floor", default="1")
    ap.add_argument("--units", type=float, default=2.0)
    ap.add_argument("--out", required=True)
    ap.add_argument("--colours", type=int, default=8)
    ap.add_argument("--mid", help="the colour the median goes to (default: the floor's brick)")
    ap.add_argument("--keep", type=float, default=0.5)
    ap.add_argument("--lmax", type=float, default=0.9, help="the lightest a colour may get (OKLab L): pale bone washes out")
    ap.add_argument("--preview")
    a = ap.parse_args()

    src = np.asarray(Image.open(a.image).convert("RGB")).astype(np.float64)
    w, h = cut(src)
    src = src[:h, :w]
    tx = round(a.units * TEXEL)
    ty = max(1, round(tx * h / w))
    big = np.asarray(Image.fromarray(src.astype(np.uint8)).resize((tx * DOWN, ty * DOWN), Image.BOX)).astype(np.float64)

    lab = to_oklab(big).reshape(-1, 3)
    rng = np.random.default_rng(3)
    cen = kmeans(lab[rng.choice(len(lab), min(len(lab), 20000), replace=False)], a.colours)
    idx = ((lab[:, None] - cen[None]) ** 2).sum(-1).argmin(1).reshape(ty * DOWN, tx * DOWN)
    # the majority cluster of each block
    blocks = idx.reshape(ty, DOWN, tx, DOWN).transpose(0, 2, 1, 3).reshape(ty, tx, -1)
    counts = np.stack([(blocks == k).sum(-1) for k in range(len(cen))], -1)
    texel = counts.argmax(-1)

    floors = json.loads((ROOT / "data/floors.json").read_text(encoding="utf-8"))
    floors = floors.get("floors", floors) if isinstance(floors, dict) else floors
    look = floors[int(a.floor) - 1]
    look = look.get("look", look)
    dark = to_oklab(np.array(hex_rgb(look["wall"]["mortar"]), np.float64))
    mid = to_oklab(np.array(hex_rgb(a.mid) if a.mid else look["wall"]["brick"], np.float64))
    ramp, _ = floor_palette(a.floor)
    shadow, light = to_oklab(ramp[0].astype(np.float64)), to_oklab(ramp[-1].astype(np.float64))

    weights = np.bincount(texel.ravel(), minlength=len(cen))
    order = np.argsort(cen[:, 0])
    cum = np.cumsum(weights[order]) / weights.sum()
    med = cen[order[np.searchsorted(cum, 0.5)]]
    lmin = cen[order[0], 0]
    span = max(med[0] - lmin, 1e-3)
    out = []
    for c in cen:
        t = (c[0] - lmin) / span
        L = float(np.clip(dark[0] + t * (mid[0] - dark[0]), 0.15, a.lmax))
        ab = dark[1:] + min(max(t, 0.0), 1.0) * (mid[1:] - dark[1:]) + (c[1:] - med[1:]) * a.keep
        if t < 1:
            ab = turn_toward(ab, shadow[1:], 20 * (1 - max(t, 0.0)), 0.0)
        elif t > 1:
            ab = turn_toward(ab, light[1:], min(12.0, 8 * (t - 1)), 0.0)
        out.append([L, *ab])
    pal = to_srgb(np.array(out))
    tile = pal[texel]
    pathlib.Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(tile).save(a.out, optimize=True)
    print(f"cut {w} x {h} of the picture, {tx} x {ty} texels ({a.units:g} units across), {len(cen)} colours: "
          + " ".join("#%02x%02x%02x" % tuple(p) for p in pal))
    if a.preview:
        rep = np.tile(tile, (2, 2, 1))
        Image.fromarray(rep).resize((rep.shape[1] * 6, rep.shape[0] * 6), Image.NEAREST).save(a.preview)


if __name__ == "__main__":
    main()
