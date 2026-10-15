"""A GIF of a sprite clip standing in a room, for review (R3; after Godot-Tamer's tools/bake/compose_gif.py).

  python tools/art/compose_gif.py <strip.png> <strip.json> --room <room.png> --at <x> <z> --margin <px> --out <gif>
                                  [--scale 3] [--crop x y w h]

<strip.json> is pixelize.py's: {"frames": [{"x": .., "ms": ..}], "size": [w, h]}; a frame's feet are `margin` pixels
above its bottom edge. --at is in tiles from the floor's north-west corner, as room.py places sprites.
"""
import argparse, json, pathlib
from PIL import Image
from room import TX, TZ, X0, Y0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("strip"); ap.add_argument("json")
    ap.add_argument("--room", required=True)
    ap.add_argument("--at", type=float, nargs=2, required=True)
    ap.add_argument("--margin", type=int, required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=int, default=3)
    ap.add_argument("--crop", type=int, nargs=4)
    a = ap.parse_args()
    strip = Image.open(a.strip).convert("RGBA")
    meta = json.loads(pathlib.Path(a.json).read_text(encoding="utf-8"))
    w, h = meta["size"]
    room = Image.open(a.room).convert("RGBA")
    fx, fy = round(X0 + a.at[0] * TX), round(Y0 + a.at[1] * TZ)
    crop = a.crop or (fx - w, fy - h, 2 * w, h + 24)
    frames, times = [], []
    for f in meta["frames"]:
        im = strip.crop((f["x"], 0, f["x"] + w, h))
        r = room.copy()
        r.alpha_composite(im, (fx - w // 2, fy - (h - a.margin)))
        r = r.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3])).convert("RGB")
        frames.append(r.resize((r.width * a.scale, r.height * a.scale), Image.NEAREST))
        times.append(max(40, f["ms"]))
    frames[0].save(a.out, save_all=True, append_images=frames[1:], duration=times, loop=0)
    print("wrote", a.out, len(frames), "frames")


if __name__ == "__main__":
    main()
