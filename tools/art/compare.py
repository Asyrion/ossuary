"""Route A | route B for one subject, for the owner (R3 proof): the four facings' first frame of a clip at play size
(a game pixel 2.6 screen pixels, as at 1080 lines) and the south facing enlarged 4 times, on floor 1's dark tone.

  python tools/art/compare.py <route A sprite dir> <route B sprite dir> <clip> --out <png>
"""
import argparse, pathlib
from PIL import Image, ImageDraw

BG = "#4a3f45"  # floor 1's dark (art bible 4.1)


def facings(d, clip):
    return [Image.open(pathlib.Path(d) / f / clip / "f0000.png").convert("RGBA") for f in "SENW"]


def column(ims, label):
    w, h = ims[0].size
    play = Image.new("RGBA", (w * 4, h), BG)
    for i, im in enumerate(ims):
        play.alpha_composite(im, (i * w, 0))
    play = play.resize((round(play.width * 2.6), round(play.height * 2.6)), Image.NEAREST)
    big = Image.new("RGBA", (w, h), BG); big.alpha_composite(ims[0])
    big = big.resize((w * 4, h * 4), Image.NEAREST)
    col = Image.new("RGBA", (max(play.width, big.width), 28 + play.height + 8 + big.height), "#1c1a22")
    ImageDraw.Draw(col).text((6, 8), label, fill="#e8dcc0")
    col.alpha_composite(play, (0, 28)); col.alpha_composite(big, (0, 28 + play.height + 8))
    return col


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("a"); ap.add_argument("b"); ap.add_argument("clip")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    ca = column(facings(a.a, a.clip), "Route A: model at the texel (real time)")
    cb = column(facings(a.b, a.clip), "Route B: sprite baked in Blender")
    out = Image.new("RGB", (ca.width + cb.width + 12, max(ca.height, cb.height)), "#1c1a22")
    out.paste(ca, (0, 0)); out.paste(cb, (ca.width + 12, 0))
    out.save(a.out)
    print("wrote", a.out)


if __name__ == "__main__":
    main()
