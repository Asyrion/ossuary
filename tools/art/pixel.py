"""Image helpers for generator art (R3; ported from Godot-Tamer's tools/pipeline/pixel.py, the parts that are engine
free). Nano Banana draws pixel art at a constant drawn-pixel size: detect_pitch() finds it and resample() samples one
value a drawn pixel. key() removes a magenta or green background by hue; quantize() maps to a fixed palette with no
dithering; downscale_ink() shrinks pixel art by any factor, keeping dark lines (cracks, outlines) closed.
"""
import numpy as np
from PIL import Image


def load_rgba(path):
    return np.array(Image.open(path).convert("RGBA")).astype(int)


def detect_pitch(a, lo=8.0, hi=24.0, step=0.25):
    d = np.abs(np.diff(a[..., :3], axis=1)).sum(axis=2); e = (d > 60).sum(axis=0); n = len(e)
    best = (0, 10.25)
    for p in np.arange(lo, hi + 1e-9, step):
        sc = 0
        for ph in range(int(p)):
            idx = np.round(np.arange(ph, n - 1, p)).astype(int); idx = idx[idx < n]; sc = max(sc, e[idx].sum())
        if sc > best[0]:
            best = (sc, float(p))
    return best[1]


def _phase(a, axis, p):
    d = np.abs(np.diff(a[..., :3], axis=axis)).sum(axis=2)
    e = (d > 60).sum(axis=0) if axis == 1 else (d > 60).sum(axis=1)
    best = (0, 0.0)
    for ph in np.arange(0, p, 0.25):
        idx = np.round(np.arange(ph, len(e) - 1, p)).astype(int); idx = idx[idx < len(e)]; s = e[idx].sum()
        if s > best[0]:
            best = (s, float(ph))
    return best[1]


def resample(a, pitch=None):
    """Generator output -> native pixel-art RGBA (uint8), by sampling drawn-pixel centres."""
    p = pitch or detect_pitch(a)
    phx, phy = _phase(a, 1, p), _phase(a, 0, p)
    xs = np.clip(np.round(np.arange(phx + p / 2, a.shape[1], p)).astype(int), 0, a.shape[1] - 1)
    ys = np.clip(np.round(np.arange(phy + p / 2, a.shape[0], p)).astype(int), 0, a.shape[0] - 1)
    return a[np.ix_(ys, xs)].astype(np.uint8), p


def hue_mask(rgb, target_hue, tol=25, min_sat=0.35, min_val=0.25):
    r, g, b = [rgb[..., i].astype(float) / 255 for i in range(3)]
    mx = np.max(rgb[..., :3], axis=2).astype(float) / 255; mn = np.min(rgb[..., :3], axis=2).astype(float) / 255
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0); d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    diff = np.abs((h - target_hue + 180) % 360 - 180)
    return (diff <= tol) & (sat >= min_sat) & (mx >= min_val)


BACKGROUNDS = {"magenta": 300, "green": 120}


def key(rgba, background="magenta"):
    """Background -> alpha 0; edge pixels blended with the key colour are keyed by a looser hue test."""
    out = rgba.copy(); hue = BACKGROUNDS[background]
    out[hue_mask(out, hue, tol=22, min_sat=0.45), 3] = 0
    op = out[..., 3] > 0
    nb = np.zeros_like(op)
    nb[1:, :] |= ~op[:-1, :]; nb[:-1, :] |= ~op[1:, :]; nb[:, 1:] |= ~op[:, :-1]; nb[:, :-1] |= ~op[:, 1:]
    out[op & nb & hue_mask(out, hue, tol=40, min_sat=0.25), 3] = 0
    return out


def trim(rgba):
    al = rgba[..., 3] > 0
    if not al.any():
        return rgba[:0, :0], (0, 0)
    ys, xs = np.where(al)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (int(xs.min()), int(ys.min()))


def quantize(rgba, palette):
    pal = np.array(palette, float); out = rgba.copy(); al = out[..., 3] > 0
    px = out[al][:, :3].astype(float)
    idx = ((px[:, None, :] - pal[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
    out[al, :3] = pal[idx].astype(np.uint8)
    return out, idx


def downscale_ink(rgba, scale, ink_share=0.3, clear_share=0.55, ink_sum=150):
    """Pixel-art downscale by any factor: each new pixel takes the colour covering most of its area, stays empty when
    more than clear_share of it is empty, and takes the dominant ink (r+g+b < ink_sum) when ink covers ink_share of it,
    so dark lines stay closed."""
    H, W = rgba.shape[:2]
    h, w = int(round(H * scale)), int(round(W * scale))
    out = np.zeros((h, w, 4), np.uint8)
    for ty in range(h):
        y0, y1 = ty / scale, (ty + 1) / scale
        for tx in range(w):
            x0, x1 = tx / scale, (tx + 1) / scale
            acc = {}
            for sy in range(int(np.floor(y0)), min(H, int(np.ceil(y1)))):
                wy = min(y1, sy + 1) - max(y0, sy)
                for sx in range(int(np.floor(x0)), min(W, int(np.ceil(x1)))):
                    wx = min(x1, sx + 1) - max(x0, sx)
                    if wx <= 0 or wy <= 0:
                        continue
                    p = rgba[sy, sx]
                    k = tuple(int(v) for v in p) if p[3] > 0 else (0, 0, 0, 0)
                    acc[k] = acc.get(k, 0.0) + wx * wy
            tot = sum(acc.values())
            if not tot or acc.get((0, 0, 0, 0), 0.0) / tot > clear_share:
                continue
            inks = [k for k in acc if k[3] and sum(k[:3]) < ink_sum]
            if inks and sum(acc[k] for k in inks) / tot >= ink_share:
                out[ty, tx] = max(inks, key=lambda k: acc[k])
            else:
                out[ty, tx] = max((k for k in acc if k[3]), key=lambda k: acc[k])
    return out


def scale2x(rgba):
    """Pixel-art 2x upscale (Scale2x / EPX): no new colours, clean diagonals."""
    a = np.ascontiguousarray(rgba)
    h, w = a.shape[:2]
    p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
    eq = lambda x, y: np.all(x == y, axis=-1)
    e, b, d, f, hh = p[1:-1, 1:-1], p[:-2, 1:-1], p[1:-1, :-2], p[1:-1, 2:], p[2:, 1:-1]
    c = ~eq(b, hh) & ~eq(d, f)
    o = np.zeros((h * 2, w * 2, a.shape[2]), a.dtype)
    o[0::2, 0::2] = np.where((c & eq(d, b))[..., None], d, e)
    o[0::2, 1::2] = np.where((c & eq(b, f))[..., None], f, e)
    o[1::2, 0::2] = np.where((c & eq(d, hh))[..., None], d, e)
    o[1::2, 1::2] = np.where((c & eq(hh, f))[..., None], f, e)
    return o
