"""The HUD's frames as pixel art (art bible 4.6, variant B: small panels with brass and stone frames): nine-slice
images the HUD's CSS stretches with `border-image`, each pixel drawn at the HUD's pixel size.

  python tools/art/hudframe.py public/assets/hud

Writes `panel.png` (a panel: a near-black outline, a brass ring two pixels thick lit from the top left, a dark joint, a
stone field with a faint dither) and `slot.png` (a slot sunk into a panel: a dark rim, a brass hairline, a darker field), and `bar.png` (a
bar's trough). The slice of each is printed for the CSS.
"""
import os, sys
from PIL import Image

INK = (11, 9, 16)  # the outline: near black, toward the floors' shadow (4.4)
BRASS = [(96, 70, 38), (138, 106, 60), (186, 148, 84), (226, 192, 120)]  # shadow to highlight
STONE = [(26, 22, 31), (31, 27, 37), (36, 31, 43)]  # the field: a cool dark stone (4.2)
BEVEL = (17, 14, 22)  # (a slot's sunken rim)


def panel(n=14, b=4):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    p = im.load()
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)  # how deep inside the edge
            lit = x + y < n - 1  # (the top left half catches the light)
            if d == 0:
                c = INK
            elif d == 1:
                c = BRASS[3] if lit else BRASS[1]
            elif d == 2:
                c = BRASS[2] if lit else BRASS[0]
            elif d == 3:
                c = INK
            else:
                c = STONE[(x * 3 + y * 5) % 7 % 3]  # (a faint dither, never a pattern that reads)
            p[x, y] = (*c, 255)
    return im, b


def slot(n=10, b=3):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    p = im.load()
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            lit = x + y < n - 1
            c = INK if d == 0 else (BRASS[1] if lit else BRASS[0]) if d == 1 else BEVEL if d == 2 else (14, 12, 19)
            p[x, y] = (*c, 255)
    return im, b


def bar(w=8, h=6, b=2):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    p = im.load()
    for y in range(h):
        for x in range(w):
            d = min(x, y, w - 1 - x, h - 1 - y)
            c = INK if d == 0 else (BRASS[1] if y < h / 2 else BRASS[0]) if d == 1 else (9, 8, 14)
            p[x, y] = (*c, 255)
    return im, b


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'public/assets/hud'
    os.makedirs(out, exist_ok=True)
    for name, (im, b) in (('panel', panel()), ('slot', slot()), ('bar', bar())):
        im.save(os.path.join(out, f'{name}.png'))
        print(name, im.size, 'slice', b)
