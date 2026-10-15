"""Blender frames to pixel art in the art bible's colours (R3, the sprite route; ported from Godot-Tamer's
tools/bake/pixelize.py).

  python tools/art/pixelize.py <render dir> --out <dir> [--floor 1] [--families 7] [--steps 5] [--smooth 1]
                               [--outline outside|inside] [--inner]

Reads render_glb.py's frames (<render dir>/<facing>/<clip>/f####.png and _flat.png, rendered --down times larger).
Where Godot-Tamer reads a creature's hand-made palette, this one makes it (art bible 6.1):
- **Families:** the unlit texture colours are clustered (k-means in OKLab, fixed seed) into `--families` materials.
- **Ramps:** each family gets `--steps` colours around its own colour, its shadows turned toward the floor's shadow hue
  and its lights toward the floor's highlight (art bible 4.2: cool shadows, warm lights); the darkest is never black.
- **Shading:** a pixel's step comes from how lit it is (its lit lightness over its unlit one), cut at the same
  thresholds in every frame and facing, so nothing flickers; a majority vote calms one-pixel speckle.
- **Outline (4.4):** one game pixel, closed (4-connected) all round the silhouette, near black tinted a little toward
  the family it borders. `outside` (the default) draws it round the sprite, so thin limbs keep their colour; `inside`
  replaces the edge pixels as Godot-Tamer does. `--inner` also lines the darker side where two families meet.
No soft alpha survives: alpha is 0 or 255.

Writes <out>/<facing>/<clip>/f####.png, <out>/<facing>_<clip>.png (a strip) and .json (frame times),
<out>/palette.json (the ramps made), <out>/report.json (colours, hues, outline check).
"""
import argparse, json, pathlib
import numpy as np
from PIL import Image
from oklab import floor_palette, hex_rgb, to_oklab, to_srgb, hue_deg

DARK_TURN = [50.0, 25.0]   # degrees the two darker steps turn toward the floor's shadow hue (art bible 4.2: 40 to 60)
LIGHT_TURN = [8.0, 16.0]   # degrees the two lighter steps turn toward the floor's highlight (10 to 20)
L_MIN, L_MAX = 0.2, 0.96
W = np.array([1.0, 2.0, 2.0])  # colour counts more than lightness when telling materials apart (skin from blond hair)    # the darkest step is not black; the lightest not white


def load(f, down):
    im = Image.open(f).convert("RGBA")
    if down > 1:
        im = im.resize((im.width // down, im.height // down), Image.BOX)
    return np.asarray(im).astype(np.float64)


def kmeans(pts, k, seed=7, iters=30):
    rng = np.random.default_rng(seed)
    # farthest-point start: small bright parts (eyes, runes) get a centre of their own
    cen = [pts[rng.integers(len(pts))]]
    for _ in range(k - 1):
        d = np.min([((pts - c) ** 2).sum(-1) for c in cen], axis=0)
        cen.append(pts[d.argmax()])
    cen = np.array(cen)
    for _ in range(iters):
        lab = ((pts[:, None] - cen[None]) ** 2).sum(-1).argmin(1)
        for i in range(k):
            if (lab == i).any():
                cen[i] = pts[lab == i].mean(0)
    return cen[np.argsort(cen[:, 0])]


def turn_toward(ab, target_ab, deg, min_chroma=0.025):
    """Turn the hue of `ab` by up to `deg` degrees toward target_ab's hue, keeping its chroma (a grey gets a little of
    the target's colour, so even a grey ramp leans cool in the dark and warm in the light)."""
    c = float(np.hypot(*ab))
    h = np.arctan2(ab[1], ab[0]); t = np.arctan2(target_ab[1], target_ab[0])
    if c < min_chroma:
        return np.array([np.cos(t), np.sin(t)]) * min_chroma * (deg / 50.0 + 0.5)
    d = (t - h + np.pi) % (2 * np.pi) - np.pi
    h += np.sign(d) * min(abs(d), np.radians(deg))
    return np.array([np.cos(h), np.sin(h)]) * c


def ramp(c, shadow, light, steps):
    """`steps` OKLab colours from dark to light around c, the darks turned toward the floor's shadow hue and the
    lights toward its highlight, chroma kept (art bible 4.2)."""
    mid = steps // 2
    span = [-0.24, -0.12, 0.0, 0.1, 0.19] if steps == 5 else list(np.linspace(-0.24, 0.19, steps))
    out = []
    for k in range(steps):
        L = np.clip(c[0] + span[k], L_MIN, L_MAX)
        ab = c[1:].copy()
        if k < mid:
            deg = DARK_TURN[k] if steps == 5 else 50.0 * (mid - k) / mid
            ab = turn_toward(ab, shadow[1:], deg)
        elif k > mid:
            deg = LIGHT_TURN[k - mid - 1] if steps == 5 else 16.0 * (k - mid) / (steps - 1 - mid)
            ab = turn_toward(ab, light[1:], deg)
        out.append([L, *ab])
    out = np.array(out)
    for k in range(1, steps):  # keep the steps apart
        out[k, 0] = max(out[k, 0], out[k - 1, 0] + 0.045)
    return out


def outline_colour(c, shadow):
    """Near black, tinted a little toward the family's hue (art bible 4.4)."""
    return np.array([0.17, c[1] * 0.25 + shadow[1] * 0.15, c[2] * 0.25 + shadow[2] * 0.15])


def majority(idx, fam_of, opaque, passes):
    h, w = idx.shape
    for _ in range(passes):
        pad = np.pad(idx, 1, constant_values=-1)
        n = int(idx.max()) + 1
        counts = np.zeros((n, h, w), np.int32)
        for dy in range(3):
            for dx in range(3):
                win = pad[dy:dy + h, dx:dx + w]
                for p in range(n):
                    counts[p] += win == p
        # only colours of the pixel's own family may win
        fam_px = fam_of[np.clip(idx, 0, None)]
        for p in range(n):
            counts[p][fam_of[p] != fam_px] = -1
        best = counts.argmax(0)
        keep = counts.max(0) <= counts[np.clip(idx, 0, None), np.arange(h)[:, None], np.arange(w)[None]]
        idx = np.where(opaque & ~keep, best, idx)
    return idx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("render_dir")
    ap.add_argument("--out", required=True)
    ap.add_argument("--floor", default="1")
    ap.add_argument("--families", type=int, default=7)
    ap.add_argument("--steps", type=int, default=5)
    ap.add_argument("--smooth", type=int, default=1)
    ap.add_argument("--outline", default="outside", choices=("outside", "inside"))
    ap.add_argument("--inner", action="store_true")
    ap.add_argument("--centres-from", default="", help="another run's palette.json: take its families (route A uses "
                    "route B's, so both wear the same colours)")
    ap.add_argument("--recolour", default="", help="comma list of colours, one a family, dark to light: each family's "
                    "ramp is built round it instead of the texture's own colour (the texture still picks the family)")
    ap.add_argument("--glow", type=float, default=0.62, help="unlit lightness from which a saturated family is a glow "
                    "(eyes, runes): it keeps its own colour at every step but the darkest")
    a = ap.parse_args()
    rd, out = pathlib.Path(a.render_dir), pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    info = json.loads((rd / "clips.json").read_text(encoding="utf-8"))
    down = info.get("down", 2)  # route A's frames come at the game pixel (down 1)
    floor, _accent = floor_palette(a.floor)
    flab = to_oklab(floor)
    shadow, light = flab[0], flab[4]

    jobs = []  # (facing, clip, [frame paths])
    for facing in info["facings"]:
        for clip in info["clips"]:
            frames = sorted(f for f in (rd / facing / clip).glob("f*.png") if not f.stem.endswith("_flat"))
            if frames:
                jobs.append((facing, clip, frames))

    # 1. families from the unlit colours of a sample of frames
    sample = [f for _, _, fs in jobs for f in fs[:: max(1, len(fs) // 2)]]
    pts, ratios = [], []
    for f in sample:
        lit, flat = load(f, down), load(f.with_name(f.stem + "_flat.png"), down)
        op = lit[..., 3] >= 128
        pts.append(to_oklab(flat[..., :3])[op]); ratios.append((to_oklab(lit[..., :3])[..., 0] / np.maximum(
            to_oklab(flat[..., :3])[..., 0], 0.02))[op])
    pts, ratios = np.concatenate(pts), np.concatenate(ratios)
    rng = np.random.default_rng(1)
    pick = rng.choice(len(pts), min(len(pts), 40000), replace=False)
    if a.centres_from:
        src = json.loads(pathlib.Path(a.centres_from).read_text(encoding="utf-8"))
        cen = to_oklab(np.array([hex_rgb(f["centre"]) for f in src["families"]], np.uint8))
        if src.get("recolour") and not a.recolour:
            a.recolour = ",".join(src["recolour"])
    else:
        cen = kmeans(pts[pick] * W, a.families) / W
    looks = cen
    if a.recolour:
        rc = to_oklab(np.array([hex_rgb(c) for c in a.recolour.split(",")], np.uint8))
        if len(rc) != len(cen):
            raise SystemExit(f"--recolour needs {len(cen)} colours, one a family")
        looks = rc[np.argsort(rc[:, 0])]
    fam_all = ((((pts[:, None] - cen[None]) * W) ** 2).sum(-1)).argmin(1)
    # 2. ramps, the outline colours, and the shading thresholds per family
    ramps, glow, cuts = [], [], []
    for i, c in enumerate(looks):
        chroma = np.hypot(c[1], c[2])
        glow.append(bool(c[0] >= a.glow and chroma >= 0.1))
        r = ramp(c, shadow, light, a.steps)
        if glow[-1]:
            r[1:] = c; r[-1][0] = min(L_MAX, c[0] + 0.12)
        ramps.append(r)
        sel = ratios[fam_all == i]
        q = np.linspace(0, 1, a.steps + 1)[1:-1] if len(sel) else []
        qs = [0.12, 0.35, 0.7, 0.92] if a.steps == 5 else list(q)
        cuts.append(np.quantile(sel, qs) if len(sel) else np.ones(a.steps - 1))
    pal_lab = np.concatenate(ramps + [np.array([outline_colour(c, shadow) for c in looks])])
    pal = to_srgb(pal_lab)
    nf, ns = len(cen), a.steps
    fam_of = np.array([i for i in range(nf) for _ in range(ns)] + list(range(nf)))
    out_idx = nf * ns  # the outline colours follow the ramps
    (out / "palette.json").write_text(json.dumps({
        "floor": a.floor, "recolour": a.recolour.split(",") if a.recolour else [],
        "families": [{"centre": "#%02x%02x%02x" % tuple(to_srgb(c)), "glow": g,
                      "ramp": ["#%02x%02x%02x" % tuple(pal[i * ns + k]) for k in range(ns)],
                      "outline": "#%02x%02x%02x" % tuple(pal[out_idx + i])} for i, (c, g) in enumerate(zip(cen, glow))],
    }, indent=1), encoding="utf-8")

    # 3. every frame
    report = {"colours": 0, "frames": 0, "open_edges": 0}
    used = set()
    for facing, clip, frames in jobs:
        d = out / facing / clip; d.mkdir(parents=True, exist_ok=True)
        done = []
        for f in frames:
            lit, flat = load(f, down), load(f.with_name(f.stem + "_flat.png"), down)
            h, w = lit.shape[:2]
            op = lit[..., 3] >= 128
            llab, flab_ = to_oklab(lit[..., :3]), to_oklab(flat[..., :3])
            fam = (((flab_[..., None, :] - cen[None, None]) * W) ** 2).sum(-1).argmin(-1)
            ratio = llab[..., 0] / np.maximum(flab_[..., 0], 0.02)
            step = np.zeros((h, w), int)
            for i in range(nf):
                sel = fam == i
                step[sel] = np.searchsorted(cuts[i], ratio[sel])
            idx = np.where(op, fam * ns + step, -1)
            idx = majority(idx, fam_of, op, a.smooth)
            # outline
            pad = np.pad(idx, 1, constant_values=-1)
            n4 = [pad[:-2, 1:-1], pad[2:, 1:-1], pad[1:-1, :-2], pad[1:-1, 2:]]
            if a.outline == "outside":
                ring = ~op & np.any([n >= 0 for n in n4], axis=0)
                nb = np.max(n4, axis=0)  # any opaque neighbour's colour
                res = idx.copy()
                res[ring] = out_idx + fam_of[nb[ring]]
            else:
                ring = op & np.any([n < 0 for n in n4], axis=0)
                res = idx.copy()
                res[ring] = out_idx + fam_of[idx[ring]]
            if a.inner:
                lum = pal_lab[:, 0]
                for n in n4:
                    edge = op & ~ring & (n >= 0) & (fam_of[np.clip(idx, 0, None)] != fam_of[np.clip(n, 0, None)]) & (
                        lum[np.clip(idx, 0, None)] < lum[np.clip(n, 0, None)])
                    res[edge] = out_idx + fam_of[idx[edge]]
            solid = res >= 0
            # check: no body pixel touches the empty outside (the outline is closed)
            p2 = np.pad(res, 1, constant_values=-1)
            m4 = [p2[:-2, 1:-1], p2[2:, 1:-1], p2[1:-1, :-2], p2[1:-1, 2:]]
            open_edge = solid & (res < out_idx) & np.any([m < 0 for m in m4], axis=0)
            report["open_edges"] += int(open_edge.sum())
            rgba = np.zeros((h, w, 4), np.uint8)
            rgba[solid, :3] = pal[res[solid]]; rgba[solid, 3] = 255
            used |= set(res[solid].tolist())
            done.append(rgba)
        size = done[0].shape[1]
        strip = Image.new("RGBA", (size * len(done), done[0].shape[0]))
        for i, rgba in enumerate(done):
            Image.fromarray(rgba).save(d / f"f{i:04d}.png")
            strip.paste(Image.fromarray(rgba), (i * size, 0))
        strip.save(out / f"{facing}_{clip}.png")
        ms = info["clips"][clip].get("ms", 83)
        (out / f"{facing}_{clip}.json").write_text(json.dumps(
            {"frames": [{"x": i * size, "ms": ms} for i in range(len(done))], "size": [size, done[0].shape[0]]}),
            encoding="utf-8")
        report["frames"] += len(done)
    report["colours"] = len(used)
    body = [i for i in used if i < out_idx]
    darks = [pal_lab[i] for i in body if i % ns == 0 and not glow[i // ns]]
    lights = [pal_lab[i] for i in body if i % ns == ns - 1 and not glow[i // ns]]
    report["shadow_hue"] = round(float(hue_deg(np.mean(darks, 0))), 1) if darks else None
    report["light_hue"] = round(float(hue_deg(np.mean(lights, 0))), 1) if lights else None
    report["darkest_L"] = round(float(min(pal_lab[i][0] for i in body)), 3)
    (out / "report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
