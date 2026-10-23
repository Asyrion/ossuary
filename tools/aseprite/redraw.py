"""Drawn pixel art in Aseprite (docs/assets.md, "Aseprite (2D pixel art)"): a generated picture traced into an indexed
.aseprite at its final size with a small hand palette, hand edits as text grids, and the export for review.

    python tools/aseprite/redraw.py ramp  --color "#d8c7a4" [--floor 1]       a hue-shifted ramp to start a palette from
    python tools/aseprite/redraw.py trace <picture> --id <id> [--force]       picture -> inspiration/icons/<id>.aseprite
    python tools/aseprite/redraw.py dump  --id <id>                           the sprite as a text grid (a char a pixel)
    python tools/aseprite/redraw.py paint --id <id> <grid.txt> [--outline] [--repalette]
                                                     a text grid (a hand edit) into the sprite
    python tools/aseprite/redraw.py export --id <id> [--out <dir>] [--scale 8] <id>.png and <id>@8x.png (nearest)
    python tools/aseprite/redraw.py export --id <id> --game   into the game, once the owner accepted it: exported fresh
                                                     and handed to `prepare-texture --kind icon --drawn`, which keeps
                                                     its pixels, checks them and writes public/assets/icons/<id>.png

The palette is a JSON beside the source, `<dir>/<id>.palette.json`: {"colors": ["#rrggbb", ...], "keep": [indices]}.
Index 0 is transparent and index 1 the outline ink (#0b0910, render/pixelIcons.ts) in every sprite; `colors` are
indices 2 and up. `keep` names indices the island cleaning leaves alone (a one-pixel highlight, a spark).

The trace: the background (the colour round the picture's border, flood-filled in from it) is cut away; the object
cropped square, the 22 inner pixels of a 24 px icon (one pixel all round for the outline) each the majority palette
colour of the picture's block under it (art bible 6: no blending), solid where at least `--solid` of it is drawn;
specks of the silhouette and pinholes in it removed, colour islands of up to `--islands` pixels replaced by the
colour round them, and a closed outline one pixel outside the silhouette forced to ink (art bible 4.4). An existing
.aseprite is never overwritten without `--force`: it is the source of truth once made, hand edits included.

Python 3 with Pillow and numpy (tools/art/oklab.py for the colour maths); Aseprite 1.3 headless (`ASEPRITE` overrides
its path).
"""
import argparse, json, os, pathlib, subprocess, sys, tempfile
from collections import Counter

import numpy as np
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "art"))
from oklab import hex_rgb, to_oklab, to_srgb  # noqa: E402

ASEPRITE = os.environ.get("ASEPRITE", r"C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe")
LUA = pathlib.Path(__file__).resolve().parent / "sprite.lua"
INK = "#0b0910"
CHARS = ".#23456789abcdefghijklmnopqrstuvwxyz"  # (index 0 clear, 1 ink, then one char an index)


# ---------- Aseprite ----------
def aseprite(**params):
    cmd = [ASEPRITE, "-b"]
    for k, v in params.items():
        cmd += ["--script-param", f"{k}={v}"]
    cmd += ["--script", str(LUA)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or "error" in (r.stdout + r.stderr).lower():
        sys.exit(f"Aseprite failed ({r.returncode}): {r.stdout}{r.stderr}")


def write_grid(path, idx, pal):
    h, w = idx.shape
    lines = [f"{w} {h}", str(len(pal))] + [" ".join(map(str, c)) for c in pal]
    lines += [" ".join(map(str, row)) for row in idx]
    pathlib.Path(path).write_text("\n".join(lines) + "\n")


def read_grid(path):
    nums = [int(t) for t in pathlib.Path(path).read_text().split()]
    w, h, n = nums[:3]
    pal = [tuple(nums[3 + 4 * i: 7 + 4 * i]) for i in range(n)]
    px = np.array(nums[3 + 4 * n: 3 + 4 * n + w * h], np.int32).reshape(h, w)
    return px, pal


def build(src, idx, pal):
    with tempfile.TemporaryDirectory() as t:
        g = pathlib.Path(t) / "grid.txt"
        write_grid(g, idx, pal)
        aseprite(mode="build", data=g, out=src)


def load(src):
    with tempfile.TemporaryDirectory() as t:
        g = pathlib.Path(t) / "grid.txt"
        aseprite(mode="dump", src=src, data=g)
        return read_grid(g)


# ---------- palette ----------
def palette_of(pfile):
    spec = json.loads(pathlib.Path(pfile).read_text(encoding="utf-8"))
    cols = [(0, 0, 0, 0), tuple(hex_rgb(INK)) + (255,)] + [tuple(hex_rgb(c)) + (255,) for c in spec["colors"]]
    return cols, set(spec.get("keep", []))


def ramp(color, floor="1", n=5):
    """`color` as a ramp of `n`, shadow to highlight: the shadows lean to the floor's shadow (art bible 4.2: cooler,
    toward blue and violet), the lights to its highlight (warmer); the colour itself in the middle."""
    pals = json.loads((ROOT / "tools/art/palettes.json").read_text(encoding="utf-8"))[str(floor)]
    c, sh, hi = (to_oklab(np.array(hex_rgb(x), float)) for x in (color, pals[0], pals[4]))
    mid = n // 2
    out = []
    for i in range(n):
        if i < mid:
            t = (mid - i) / mid * 0.72
            lab = c * (1 - t) + sh * t
        elif i > mid:
            t = (i - mid) / (n - 1 - mid) * 0.6
            lab = c * (1 - t) + hi * t
            lab[0] = c[0] + (min(0.97, c[0] + 0.25) - c[0]) * (i - mid) / (n - 1 - mid)
        else:
            lab = c
        out.append(color.lower() if i == mid else "#%02x%02x%02x" % tuple(to_srgb(lab)))
    return out


# ---------- the trace ----------
def cut_background(img, tol, hole=0.004):
    """The object's mask: everything not reached by flooding the border's colour in from the border, nor in a hole."""
    rgb = img.convert("RGB")
    a = np.asarray(rgb).astype(int)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = tuple(int(v) for v in np.median(border, 0))
    mark = (255, 0, 255)
    flood = rgb.copy()
    h, w = a.shape[:2]
    step = max(1, min(w, h) // 64)
    for x in range(0, w, step):
        for y in (0, h - 1):
            if np.abs(a[y, x] - bg).max() <= tol and flood.getpixel((x, y)) != mark:
                ImageDraw.floodfill(flood, (x, y), mark, thresh=tol)
    for y in range(0, h, step):
        for x in (0, w - 1):
            if np.abs(a[y, x] - bg).max() <= tol and flood.getpixel((x, y)) != mark:
                ImageDraw.floodfill(flood, (x, y), mark, thresh=tol)
    # holes the object closes round (a loop of beads, a bell's handle): the background's colour in a patch of at least
    # `hole` of the picture (smaller ones are the object's own grey)
    probe, small = (0, 255, 1), (0, 255, 2)
    for y in range(step // 2, h, step):
        for x in range(step // 2, w, step):
            if np.abs(a[y, x] - bg).max() > tol or flood.getpixel((x, y)) in (mark, small):
                continue
            ImageDraw.floodfill(flood, (x, y), probe, thresh=tol)
            f = np.array(flood)
            hit = (f == probe).all(-1)
            f[hit] = mark if hit.sum() >= hole * w * h else small
            flood = Image.fromarray(f.astype(np.uint8))
    f = np.asarray(flood)
    mask = ~((f[..., 0] == 255) & (f[..., 1] == 0) & (f[..., 2] == 255))
    if img.mode == "RGBA":
        mask &= np.asarray(img)[..., 3] > 128
    return a, mask


def components(grid, value_at, conn4=True):
    """Connected groups of equal value (4-connected): a list of (value, [(y, x), ...])."""
    h, w = grid.shape
    seen = np.zeros_like(grid, bool)
    out = []
    for y in range(h):
        for x in range(w):
            if seen[y, x]:
                continue
            v = value_at(y, x)
            stack, cells = [(y, x)], []
            seen[y, x] = True
            while stack:
                cy, cx = stack.pop()
                cells.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and value_at(ny, nx) == v:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            out.append((v, cells))
    return out


def around(idx, cells, skip):
    """The most common colour 4-next to `cells`, other than the values in `skip`."""
    h, w = idx.shape
    inside = set(cells)
    c = Counter()
    for y, x in cells:
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and (ny, nx) not in inside and idx[ny, nx] not in skip:
                c[int(idx[ny, nx])] += 1
    return c.most_common(1)[0][0] if c else None


def outline(idx):
    """Ink one pixel outside the silhouette (4-next to it), closed all round; old ink inside the ring is kept."""
    solid = idx > 1
    ring = np.zeros_like(solid)
    ring[1:] |= solid[:-1]
    ring[:-1] |= solid[1:]
    ring[:, 1:] |= solid[:, :-1]
    ring[:, :-1] |= solid[:, 1:]
    idx[ring & (idx == 0)] = 1
    idx[(idx == 1) & ~ring] = 0  # (ink that no longer touches the silhouette goes)
    return idx


def trace(picture, pal, keep, size, solid_share, islands, tol, inner_margin, ink_depth=1):
    img = Image.open(picture)
    if max(img.size) > 384:  # (blocks of 16 or more picture pixels still vote; the colour maths stays small)
        img = img.resize((384 * img.width // max(img.size), 384 * img.height // max(img.size)), Image.BOX)
    a, mask = cut_background(img, tol)
    lab_pal = to_oklab(np.array([c[:3] for c in pal[1:]], float))
    lab = to_oklab(a.astype(float))
    near = np.argmin(((lab[..., None, :] - lab_pal[None, None]) ** 2).sum(-1), -1) + 1
    # the concept's own dark outline is not the object: the background grows in through ink connected to it, so the
    # object is cropped to its colours and the icon's outline takes the old one's place
    out, ink = ~mask, near == 1
    for _ in range(max(2, round(0.014 * max(a.shape[:2])))):  # (an outline's width, not a dark part next to it)
        grow = out.copy()
        grow[1:] |= out[:-1]
        grow[:-1] |= out[1:]
        grow[:, 1:] |= out[:, :-1]
        grow[:, :-1] |= out[:, 1:]
        grow &= ink | out
        if (grow == out).all():
            break
        out = grow
    mask = ~out
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    side = max(y1 - y0, x1 - x0)
    cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
    inner = size - 2 - 2 * inner_margin
    k = side / inner
    idx = np.zeros((size, size), np.int32)
    o = 1 + inner_margin
    for j in range(inner):
        for i in range(inner):
            sy, sx = int(round(cy - side / 2 + j * k)), int(round(cx - side / 2 + i * k))
            ey, ex = int(round(cy - side / 2 + (j + 1) * k)), int(round(cx - side / 2 + (i + 1) * k))
            sy, sx, ey, ex = max(sy, 0), max(sx, 0), min(ey, a.shape[0]), min(ex, a.shape[1])
            if ey <= sy or ex <= sx:
                continue
            m = mask[sy:ey, sx:ex]
            if m.mean() < solid_share:
                continue
            idx[o + j, o + i] = Counter(near[sy:ey, sx:ex][m].tolist()).most_common(1)[0][0]
    noise = 0
    # the concept's own outline: ink at the silhouette's edge is cleared (the outline goes there), ink inside it takes
    # the colour round it (ink is the outline's alone)
    for _ in range(ink_depth):
        edge = idx == 1
        p = np.pad(idx, 1)
        touch = (p[:-2, 1:-1] == 0) | (p[2:, 1:-1] == 0) | (p[1:-1, :-2] == 0) | (p[1:-1, 2:] == 0)
        idx[edge & touch] = 0
    for v, cells in components(idx, lambda y, x: idx[y, x]):
        if v == 1:
            c = around(idx, cells, {0, 1})
            for y, x in cells:
                idx[y, x] = c if c is not None else 0
    # the silhouette: specks of it (under 3 pixels) and pinholes in it (single clear pixels) go
    for v, cells in components(idx, lambda y, x: idx[y, x] > 0):
        if v and len(cells) < 3:
            for y, x in cells:
                idx[y, x] = 0
            noise += len(cells)
        elif not v and len(cells) == 1:
            y, x = cells[0]
            if 0 < y < size - 1 and 0 < x < size - 1:
                idx[y, x] = around(idx, cells, {0, 1}) or 0
                noise += 1
    # colour islands up to `islands` pixels take the colour round them
    for _ in range(2):
        for v, cells in components(idx, lambda y, x: idx[y, x]):
            if v > 1 and v not in keep and len(cells) <= islands:
                c = around(idx, cells, {0, 1, v})
                if c is not None:
                    for y, x in cells:
                        idx[y, x] = c
                    noise += len(cells)
    return outline(idx), noise


# ---------- text grids (hand edits) ----------
def to_text(idx):
    return "\n".join("".join(CHARS[v] for v in row) for row in idx)


def from_text(text, size):
    rows = [r for r in text.splitlines() if r.strip() and not r.startswith(";")]
    idx = np.array([[CHARS.index(ch) for ch in r.strip()] for r in rows], np.int32)
    if idx.shape != size:
        sys.exit(f"the grid is {idx.shape[1]} x {idx.shape[0]}, the sprite {size[1]} x {size[0]}")
    return idx


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["ramp", "trace", "dump", "paint", "export"])
    ap.add_argument("file", nargs="?")
    ap.add_argument("--id")
    ap.add_argument("--dir", default=str(ROOT / "inspiration" / "icons"))
    ap.add_argument("--palette", help="the palette JSON (default <dir>/<id>.palette.json)")
    ap.add_argument("--size", type=int, default=24)
    ap.add_argument("--solid", type=float, default=0.5, help="share of a block drawn for its pixel to be solid")
    ap.add_argument("--islands", type=int, default=1, help="colour islands of up to this many pixels are cleaned")
    ap.add_argument("--tol", type=int, default=28, help="how far from the background's colour still counts as it")
    ap.add_argument("--margin", type=int, default=0, help="clear pixels inside the outline's margin")
    ap.add_argument("--force", action="store_true", help="overwrite an existing .aseprite")
    ap.add_argument("--outline", action="store_true", help="paint: force the outline again after the edit")
    ap.add_argument("--repalette", action="store_true", help="paint: take the palette from its JSON again")
    ap.add_argument("--out", default=str(ROOT / "asset-previews" / "icons" / "out"))
    ap.add_argument("--scale", type=int, default=8)
    ap.add_argument("--game", action="store_true", help="export: into the game (prepare-texture --drawn)")
    ap.add_argument("--color")
    ap.add_argument("--floor", default="1")
    ap.add_argument("--n", type=int, default=5)
    a = ap.parse_args()
    if a.cmd == "ramp":
        print(json.dumps(ramp(a.color, a.floor, a.n)))
        return
    d = pathlib.Path(a.dir)
    src = d / f"{a.id}.aseprite"
    if a.cmd == "trace":
        if src.exists() and not a.force:
            sys.exit(f"{src} exists: it is the source now (hand edits included). --force to trace over it.")
        pal, keep = palette_of(a.palette or d / f"{a.id}.palette.json")
        idx, noise = trace(a.file, pal, keep, a.size, a.solid, a.islands, a.tol, a.margin)
        d.mkdir(parents=True, exist_ok=True)
        build(src, idx, pal)
        used = sorted(set(idx.flatten().tolist()) - {0})
        print(f"{src}: {a.size} px, {len(used)} of {len(pal) - 1} colours used, {noise} noise pixels cleaned")
        print(to_text(idx))
    elif a.cmd == "dump":
        idx, pal = load(src)
        print("; " + " ".join(f"{CHARS[i]}=#{c[0]:02x}{c[1]:02x}{c[2]:02x}" for i, c in enumerate(pal) if i))
        print(to_text(idx))
    elif a.cmd == "paint":
        idx0, pal = load(src)
        if a.repalette:
            pal, _ = palette_of(a.palette or d / f"{a.id}.palette.json")
        idx = from_text(pathlib.Path(a.file).read_text(), idx0.shape)
        if idx.max() >= len(pal):
            sys.exit(f"the grid uses index {idx.max()}, the palette has {len(pal)}")
        if a.outline:
            idx = outline(idx)
        build(src, idx, pal)
        print(f"{src}: {int((idx != idx0).sum())} pixels changed")
    elif a.cmd == "export" and a.game:
        # (exported fresh from the source, never a review export lying about: the game gets what the .aseprite holds)
        with tempfile.TemporaryDirectory() as tmp:
            png = pathlib.Path(tmp) / f"{a.id}.png"
            aseprite(mode="export", src=src, png=png)
            npx = "npx.cmd" if os.name == "nt" else "npx"
            cmd = [npx, "tsx", "tools/prepare-texture.ts", str(png), "--kind", "icon", "--id", a.id, "--drawn"]
            cmd += ["--previews", str(ROOT / "asset-previews" / "icons" / "game")]
            sys.exit(subprocess.run(cmd, cwd=ROOT).returncode)
    elif a.cmd == "export":
        out = pathlib.Path(a.out)
        out.mkdir(parents=True, exist_ok=True)
        aseprite(mode="export", src=src, png=out / f"{a.id}.png", big=out / f"{a.id}@{a.scale}x.png", scale=a.scale)
        print(out / f"{a.id}.png", out / f"{a.id}@{a.scale}x.png")


if __name__ == "__main__":
    main()
