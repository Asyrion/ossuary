"""A review sheet of pixelize.py's sprites: one row a facing, the frames of one clip, at play size and enlarged.

  python tools/art/sheet.py <sprite dir> <clip> --out <sheet.png> [--scale 4] [--bg #4a3f45] [--play 2.6]

The play-size row is what a screen shows at 1080 lines (a game pixel 2.6 screen pixels, nearest neighbour; `--play`).
"""
import argparse, json, pathlib
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir"); ap.add_argument("clip")
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=4)
    ap.add_argument("--bg", default="#4a3f45")
    ap.add_argument("--play", type=float, default=2.6)
    ap.add_argument("--facings", default="S,E,N,W")
    ap.add_argument("--frames", type=int, default=0, help="at most this many frames a row (0 = all)")
    a = ap.parse_args()
    d = pathlib.Path(a.dir)
    rows = []
    for facing in a.facings.split(","):
        strip = d / f"{facing}_{a.clip}.png"
        if not strip.exists():
            continue
        meta = json.loads(strip.with_suffix(".json").read_text(encoding="utf-8"))
        w, h = meta["size"]
        im = Image.open(strip).convert("RGBA")
        n = len(meta["frames"]) if not a.frames else min(a.frames, len(meta["frames"]))
        rows.append(im.crop((0, 0, w * n, h)))
    W = max(r.width for r in rows); H = sum(r.height for r in rows)
    big = Image.new("RGBA", (W * a.scale, H * a.scale), a.bg)
    y = 0
    for r in rows:
        big.alpha_composite(r.resize((r.width * a.scale, r.height * a.scale), Image.NEAREST), (0, y))
        y += r.height * a.scale
    first = Image.new("RGBA", (rows[0].height * len(rows), rows[0].height), a.bg)
    for i, r in enumerate(rows):
        first.alpha_composite(r.crop((0, 0, r.height, r.height)), (i * r.height, 0))
    play = first.resize((round(first.width * a.play), round(first.height * a.play)), Image.NEAREST)
    sheet = Image.new("RGBA", (max(big.width, play.width), big.height + play.height + 8), "#1c1a22")
    sheet.alpha_composite(play, (0, 0)); sheet.alpha_composite(big, (0, play.height + 8))
    sheet.convert("RGB").save(a.out)
    print("wrote", a.out)


if __name__ == "__main__":
    main()
