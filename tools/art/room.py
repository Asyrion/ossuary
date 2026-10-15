"""A room of floor 1 both ways, at the game pixel, for the R3 proof (docs/art-bible.md 4.1 to 4.3).

  python tools/art/room.py code <shot.png> <shot.json> --out <room.png>
      today's room kit (tools/art/room-shot.ts) sampled at the game pixel and recoloured to floor 1's ramp
  python tools/art/room.py tiles <sheet.png> --out <dir> --kind floor|wall
      generator tiles (four in a 2 x 2 grid on magenta) keyed, cut apart and shrunk to the tile's game pixels
  python tools/art/room.py compose <tile dir> --out <room.png>
      a 13 x 7 room from the tiles in floor 1's ramp, lit in steps (cool ambient, warm torch pools)
  python tools/art/room.py stand <room.png> --out <png> --sprite <png>:<x>:<z>:<margin> ...
      sprites stood in a room at tile coordinates (x across, z down, from the floor's north-west corner)
  python tools/art/room.py measure <room.png> [--json]
      the art bible's measures on the walkable floor: mean lightness, near black, shadow and light hue

Layout of a room picture (game pixels, 48 a unit across and 34 down, as the camera sees it): the north wall's top
(34) and face (1.35 units tall: 46), the 13 x 7 floor (624 x 238), the low south wall's top (34) and face (17), side
walls one unit wide. The floor's north-west corner is at (48, 80).
"""
import argparse, json, pathlib
import numpy as np
from PIL import Image
from oklab import floor_palette, to_oklab, to_srgb
import pixel

TX, TZ = 48, 34                       # game pixels a unit across and down the floor
COLS, ROWS = 13, 7
NORTH_FACE = round(1.35 * TZ)         # 46
X0, Y0 = TX, TZ + NORTH_FACE          # the floor's north-west corner
W, H = (COLS + 2) * TX, Y0 + ROWS * TZ + TZ + TZ // 2
FLOOR = (X0, Y0, X0 + COLS * TX, Y0 + ROWS * TZ)
TORCHES = [3.0, 10.0]                 # chapel_nave's two torches on the north wall, in units from the west


def ramp9(floor="1"):
    """Floor 1's five colours with a step between each pair (OKLab), shadow to highlight; and the accent's three."""
    base, accent = floor_palette(floor)
    lab = to_oklab(base)
    steps = []
    for i in range(4):
        steps += [lab[i], (lab[i] + lab[i + 1]) / 2]
    steps.append(lab[4])
    acc = to_oklab(accent)
    acc3 = [acc - [0.14, 0, 0.02], acc, acc + [0.12, 0, 0.02]]
    return to_srgb(np.array(steps)), to_srgb(np.array(acc3))


def map_to_ramp(rgba, lo, hi, mask=None, green_accent=True, floor="1", offsets=None, clip_pct=(4, 96)):
    """Each opaque pixel to a step of the ramp by its lightness, the image's spread (within `mask`) stretched over
    steps lo..hi; greenish pixels to the accent. `offsets` (an int array) moves steps: the light."""
    ramp, acc = ramp9(floor)
    lab = to_oklab(rgba[..., :3])
    op = rgba[..., 3] > 0
    sel = op & (mask if mask is not None else True)
    a, b = np.percentile(lab[..., 0][sel], clip_pct)
    t = np.clip((lab[..., 0] - a) / max(b - a, 1e-6), 0, 1)
    idx = np.round(lo + t * (hi - lo)).astype(int)
    if offsets is not None:
        idx = idx + offsets
    idx = np.clip(idx, 0, len(ramp) - 1)
    out = np.zeros(rgba.shape[:2] + (4,), np.uint8)
    out[..., :3] = ramp[idx]; out[..., 3] = np.where(op, 255, 0)
    if green_accent:
        green = op & (lab[..., 1] < -0.03) & (np.hypot(lab[..., 1], lab[..., 2]) > 0.04)
        ai = np.clip(np.round(t * 2).astype(int) + (0 if offsets is None else np.sign(offsets)), 0, 2)
        out[green, :3] = acc[ai[green]]
    return out


def code(a):
    """The game's shot at the game pixel, framed like compose(), recoloured to floor 1's ramp by lightness."""
    im = np.array(Image.open(a.shot).convert("RGBA")).astype(int)
    info = json.loads(pathlib.Path(a.info).read_text(encoding="utf-8"))
    ox, oy = info["origin"]
    pitch = (info["unitX"][0] - ox) / TX
    xs = ox + (np.arange(W) - X0 + 0.5) * pitch
    ys = oy + (np.arange(H) - Y0 + 0.5) * pitch
    xs = np.clip(np.round(xs).astype(int), 0, im.shape[1] - 1); ys = np.clip(np.round(ys).astype(int), 0, im.shape[0] - 1)
    g = im[np.ix_(ys, xs)].astype(np.uint8)
    Image.fromarray(g).save(str(a.out).replace(".png", "_today.png"))
    lab = to_oklab(g[..., :3])
    mask = np.zeros(g.shape[:2], bool); mask[FLOOR[1]:FLOOR[3], FLOOR[0]:FLOOR[2]] = True
    # the black outside the room stays black (art bible 4.2: black only there and in outlines); the floor is never void
    void = (lab[..., 0] < 0.14) & ~mask
    g[..., 3] = np.where(void, 0, 255)
    out = map_to_ramp(g, 0, 7, mask & ~void, green_accent=False, clip_pct=(3, 99))
    canvas = np.zeros_like(out); canvas[..., 3] = 255
    canvas[out[..., 3] > 0] = out[out[..., 3] > 0]
    Image.fromarray(canvas).save(a.out)
    print("wrote", a.out, "pitch", round(pitch, 3))


def tiles(a):
    """Four pieces from a 2 x 2 sheet on magenta, each shrunk to the tile's game pixels."""
    src = pixel.key(pixel.load_rgba(a.sheet))
    h, w = src.shape[:2]
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    size = (2 * TX, 2 * TZ) if a.kind == "floor" else (TX, NORTH_FACE)  # a floor slab spans 2 x 2 cells
    for i in range(4):
        q = src[(i // 2) * h // 2:(i // 2 + 1) * h // 2, (i % 2) * w // 2:(i % 2 + 1) * w // 2]
        t, _ = pixel.trim(q)
        if a.kind == "floor":  # the generator frames each tile with a dark border: cut it, so tiles join
            m = int(t.shape[0] * 0.05)
            t = t[m:-m, m:-m]
        small = pixel.downscale_ink(t.astype(np.uint8), size[0] / t.shape[1], ink_share=0.45, ink_sum=110)
        small = np.array(Image.fromarray(small).resize(size, Image.NEAREST))
        small[..., 3] = 255
        Image.fromarray(small).save(out / f"{a.kind}_{i}.png")
    print("wrote", out)


def light_offsets():
    """Steps added a pixel: a cool ambient one step down, warm pools round the torches (stepped, up to three), the
    room's edges a step darker (the dark at the edges, art bible 4.3)."""
    yy, xx = np.mgrid[0:H, 0:W]
    off = np.full((H, W), -1)
    for t in TORCHES:
        tx, ty = X0 + t * TX, Y0 - NORTH_FACE // 2
        d = np.hypot((xx - tx) / TX, (yy - ty) / TZ)
        off += np.floor(np.clip(3.2 - d * 0.95, 0, 3)).astype(int)
    edge = (xx < X0 + TX // 2) | (xx > FLOOR[2] - TX // 2) | (yy > FLOOR[3] - TZ // 2)
    off -= edge.astype(int)
    return off


def compose(a):
    d = pathlib.Path(a.tiles)
    floors = [np.array(Image.open(d / f"floor_{i}.png").convert("RGBA")) for i in range(4)]
    walls = [np.array(Image.open(d / f"wall_{i}.png").convert("RGBA")) for i in range(4)]
    rng = np.random.default_rng(3)
    img = np.zeros((H, W, 4), np.uint8)
    # the floor: the plain three most, the stained one now and then
    for r in range(0, ROWS, 2):
        for c in range(0, COLS, 2):
            k = rng.choice(4, p=[0.34, 0.3, 0.3, 0.06])
            t = floors[k]
            if rng.random() < 0.5:
                t = t[:, ::-1]
            if rng.random() < 0.5:
                t = t[::-1]
            h, w = min(2 * TZ, (ROWS - r) * TZ), min(2 * TX, (COLS - c) * TX)
            img[Y0 + r * TZ:Y0 + r * TZ + h, X0 + c * TX:X0 + c * TX + w] = t[:h, :w]
    # the north wall's face: plain, a pilaster every few, the niche and the roots once each
    plan = ["plain"] * COLS
    for c in (1, 5, 7, 11):
        plan[c] = "pilaster"
    plan[0], plan[12], plan[9] = "niche", "niche", "roots"
    which = {"plain": 0, "pilaster": 1, "niche": 2, "roots": 3}
    for c, p in enumerate(plan):
        img[TZ:Y0, X0 + c * TX:X0 + (c + 1) * TX] = walls[which[p]]
    # the doorway in the middle of the north wall: dark, framed by the wall
    dx = X0 + 6 * TX + 6
    img[TZ + 8:Y0, dx:dx + TX - 12] = [6, 6, 10, 255]
    # wall tops (north, the sides, the south) and the low south face, from the plain wall's top rows
    top = walls[0][:6]
    tile_top = np.array(Image.fromarray(top).resize((TX, TZ), Image.NEAREST))
    for c in range(COLS + 2):
        img[0:TZ, c * TX:(c + 1) * TX] = tile_top
        img[FLOOR[3]:FLOOR[3] + TZ, c * TX:(c + 1) * TX] = tile_top
    for r in range(ROWS + 3):
        y = r * TZ
        img[y:y + TZ, 0:TX] = tile_top[:min(TZ, H - y)]
        img[y:y + TZ, FLOOR[2]:FLOOR[2] + TX] = tile_top[:min(TZ, H - y)]
    south = walls[0][-TZ // 2:]
    for c in range(COLS + 2):
        img[FLOOR[3] + TZ:H, c * TX:(c + 1) * TX] = south
    # to floor 1's ramp, lit in steps: the floor and walls each stretched over their own steps
    off = light_offsets()
    mask = np.zeros((H, W), bool); mask[FLOOR[1]:FLOOR[3], FLOOR[0]:FLOOR[2]] = True
    face = np.zeros((H, W), bool); face[TZ:Y0, X0:FLOOR[2]] = True
    out = map_to_ramp(img, 1, 5, mask, offsets=off)
    out[face] = map_to_ramp(img, 1, 7, face, offsets=off)[face]
    tops = ~mask & ~face
    out[tops] = map_to_ramp(img, 0, 3, tops, green_accent=False, offsets=np.minimum(off, 0))[tops]
    out[TZ + 8:Y0, dx:dx + TX - 12] = [6, 6, 10, 255]
    # the torches: a bracket and a flame (stepped glow is the pool above)
    ramp, _ = ramp9()
    for t in TORCHES:
        x, y = int(X0 + t * TX), TZ + 14
        out[y + 6:y + 14, x - 1:x + 1] = [*ramp[1], 255]
        out[y:y + 6, x - 2:x + 2] = [*ramp[8], 255]
        out[y + 2:y + 5, x - 1:x + 1] = [255, 246, 214, 255]
        out[y - 2:y, x - 1:x] = [*ramp[7], 255]
    Image.fromarray(out).save(a.out)
    print("wrote", a.out)


def stand(a):
    room = Image.open(a.room).convert("RGBA")
    for s in a.sprite:
        path, x, z, margin = s.rsplit(":", 3)
        sp = Image.open(path).convert("RGBA")
        fx, fy = round(X0 + float(x) * TX), round(Y0 + float(z) * TZ)
        room.alpha_composite(sp, (fx - sp.width // 2, fy - (sp.height - int(margin))))
    room.save(a.out)
    print("wrote", a.out)


def measure_img(path):
    """Art bible section 2 on the walkable floor: lightness is CIELAB L*; near black under 8 %; the shadow hue is the
    mean HSL hue of saturated pixels from 8 to 22 % lightness, the light hue of those over 50 %."""
    g = np.array(Image.open(path).convert("RGB"))[FLOOR[1]:FLOOR[3], FLOOR[0]:FLOOR[2]].reshape(-1, 3) / 255.0
    lin = np.where(g <= 0.04045, g / 12.92, ((g + 0.055) / 1.055) ** 2.4)
    Y = lin @ np.array([0.2126, 0.7152, 0.0722])
    L = np.where(Y > 216 / 24389, 116 * np.cbrt(Y) - 16, Y * 24389 / 27)
    mx, mn = g.max(1), g.min(1)
    sat = np.where(mx + mn > 0, (mx - mn) / np.maximum(1 - np.abs(mx + mn - 1), 1e-6), 0)
    d = np.maximum(mx - mn, 1e-6); r, gg, b = g.T
    hue = np.where(mx == r, ((gg - b) / d) % 6, np.where(mx == gg, (b - r) / d + 2, (r - gg) / d + 4)) * 60

    def mean_hue(sel):
        if not sel.any():
            return None
        h = np.radians(hue[sel])
        return round(float(np.degrees(np.arctan2(np.sin(h).mean(), np.cos(h).mean())) % 360))
    return {"mean_light": round(float(L.mean()), 1), "near_black": round(float((L < 8).mean() * 100), 1),
            "shadow_hue": mean_hue((L >= 8) & (L <= 22) & (sat > 0.15)),
            "light_hue": mean_hue((L > 50) & (sat > 0.15))}


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("code"); p.add_argument("shot"); p.add_argument("info"); p.add_argument("--out", required=True)
    p = sub.add_parser("tiles"); p.add_argument("sheet"); p.add_argument("--out", required=True)
    p.add_argument("--kind", choices=("floor", "wall"), required=True)
    p = sub.add_parser("compose"); p.add_argument("tiles"); p.add_argument("--out", required=True)
    p = sub.add_parser("stand"); p.add_argument("room"); p.add_argument("--out", required=True)
    p.add_argument("--sprite", action="append", default=[])
    p = sub.add_parser("measure"); p.add_argument("room")
    a = ap.parse_args()
    if a.cmd == "measure":
        print(json.dumps(measure_img(a.room)))
    else:
        {"code": code, "tiles": tiles, "compose": compose, "stand": stand}[a.cmd](a)


if __name__ == "__main__":
    main()
