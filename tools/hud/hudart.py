"""The HUD's pixel art (art bible 4.6: "arcane glass, held back"): dark glass and fine gold for what counts (the hearts,
the mana vial, the spell medallions, the level gem, the cards), a stepped, dithered dark backing for the rest (the purse,
the map, the chips, the toasts). Every picture is drawn here pixel by pixel, so it comes out the same on every run.

  python tools/hud/hudart.py public/assets/hud

Each file is drawn at the HUD's pixel: the CSS shows one picture pixel as `--u` screen pixels (CFG.hud.pixel). The
nine-slices' cuts are printed for the CSS's `border-image`. A sheet of every picture enlarged goes beside them with
`--sheet out.png` (not for the game: for looking at them).
"""
import math
import os
import sys

from PIL import Image

# the palette: floor 1's shadow blue for the glass, a warm gold, the mana's blues, a ruby, the accent's verdigris
OUT = (18, 15, 24)  # the outline: near black, toward the floors' shadow (4.4)
GLASS = [(22, 24, 38), (26, 29, 46), (43, 48, 71), (67, 74, 106), (106, 115, 150)]
GOLD = [(110, 84, 70), (184, 149, 106), (242, 212, 154), (255, 246, 216)]
MANA = [(28, 46, 110), (47, 92, 184), (74, 134, 232), (159, 208, 255), (230, 244, 255)]
RUBY = [(74, 14, 22), (128, 26, 30), (186, 46, 42), (226, 82, 68), (255, 150, 128), (255, 214, 196)]
JADE = [(22, 58, 52), (36, 96, 82), (62, 140, 114), (104, 182, 148), (176, 230, 200)]
RED = [(110, 22, 18), (196, 50, 36), (255, 128, 104)]
SHADE = (17, 18, 30)  # the dithered backing's tone
SOULS = {  # a soul mote's flame: fill, rim, core (render/icons.ts SOUL_HUES)
    'pale': ((207, 224, 255), (90, 106, 138), (255, 255, 255)),
    'black': ((42, 22, 64), (162, 102, 255), (200, 160, 255)),
    'hallowed': ((255, 227, 154), (154, 122, 42), (255, 251, 232)),
}
SOUL = [  # (render/icons.ts SOUL)
    '....f....',
    '....f....',
    '...ff....',
    '...fff...',
    '..ffff.f.',
    '..ffffff.',
    '.fffkfff.',
    '.ffkkkfff',
    'fffkkkfff',
    'ffffkffff',
    '.fffffff.',
    '..fffff..',
]


def new(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def put(im, x, y, c, a=255):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), (*c, a))


def outline(im, ink=OUT):
    """A closed one-pixel outline round every solid pixel (4.4), eight-way."""
    src = im.copy()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if src.getpixel((x, y))[3]:
                continue
            if any(
                0 <= x + dx < w and 0 <= y + dy < h and src.getpixel((x + dx, y + dy))[3] == 255
                for dx in (-1, 0, 1)
                for dy in (-1, 0, 1)
            ):
                put(im, x, y, ink)
    return im


# --- the frames --------------------------------------------------------------------------------------------------


def diamond(im, cx, cy, r, gem=MANA[3]):
    """A corner jewel: a gold diamond with a gem at its heart."""
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = abs(x - cx) + abs(y - cy)
            if d == r:
                put(im, x, y, OUT)
            elif d == r - 1:
                put(im, x, y, GOLD[3] if (x - cx) + (y - cy) < 0 else GOLD[1])
            elif d < r - 1:
                put(im, x, y, gem if d == 0 else GOLD[2])


def glass(n=24, cut=9, jewel=3, fill_a=238, double=False):
    """A glass panel: a near-black edge, a gold hairline lit from the top left, a dark joint, the dark blue glass with a
    lighter top row; a gold jewel on each corner. `double` adds an inner hairline (the cards)."""
    im = new(n, n)
    m = jewel - 1  # (the frame stands in from the edge by the jewel's reach)
    for y in range(m, n - m):
        for x in range(m, n - m):
            d = min(x, y, n - 1 - x, n - 1 - y) - m
            lit = x + y < n - 1
            if d == 0:
                c, a = OUT, 255
            elif d == 1:
                c, a = (GOLD[2] if lit else GOLD[1]), 255
            elif d == 2:
                c, a = OUT, 255
            elif double and d == 4:
                c, a = (GOLD[0] if lit else (80, 62, 56)), 255
            elif d == 3 and y - m == 3:
                c, a = GLASS[2], fill_a  # (light along the glass's top)
            else:
                c, a = GLASS[1], fill_a
            put(im, x, y, c, a)
    for cx, cy in ((m + 1, m + 1), (n - m - 2, m + 1), (m + 1, n - m - 2), (n - m - 2, n - m - 2)):
        diamond(im, cx, cy, jewel)
    return im, cut


def halo(n=24, cut=8, a_core=180):
    """The dithered backing (direction C): no line, no frame, a dark tone that steps out to nothing in a checker."""
    im = new(n, n)
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            cx, cy = min(x, n - 1 - x), min(y, n - 1 - y)
            if cx < 4 and cy < 4:
                d -= 1 if cx + cy < 4 else 0  # (the corners rounded off)
            if d <= 0:
                continue
            if d == 1:
                a = 96 if (x + y) % 2 == 0 else 0
            elif d == 2:
                a = 96 if (x + y) % 2 == 0 else 132
            elif d == 3:
                a = 150 if (x + y) % 2 == 0 else a_core
            else:
                a = a_core
            if a:
                put(im, x, y, SHADE, a)
    return im, cut


def button(lit=False, n=12, cut=4):
    """A button or a tab: glass with a cool rim; lit (the primary, the chosen) a gold rim and a lighter glass."""
    im = new(n, n)
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            top = x + y < n - 1
            if d == 0:
                c = OUT
            elif d == 1:
                c = (GOLD[3] if top else GOLD[1]) if lit else (GLASS[4] if top else GLASS[3])
            elif d == 2 and y == 2:
                c = GLASS[3] if lit else GLASS[2]
            else:
                c = GLASS[2] if lit else GLASS[1]
            put(im, x, y, c)
    if (n, lit) and True:
        for x, y in ((0, 0), (n - 1, 0), (0, n - 1), (n - 1, n - 1)):
            put(im, x, y, (0, 0, 0), 0)  # (the corners clipped: a cut stone, not a box)
    return im, cut


def tile(lit=False, n=12, cut=4):
    """An inventory tile, a sunken socket in the glass: a dark rim, a fine inner edge (gold when chosen), a deep field."""
    im = new(n, n)
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            low = x + y >= n - 1
            if d == 0:
                c = OUT
            elif d == 1:
                c = (GOLD[2] if not low else GOLD[1]) if lit else (GLASS[2] if not low else GLASS[3])
            elif d == 2 and lit:
                c = MANA[1] if not low else GLASS[2]
            else:
                c = GLASS[0]
            put(im, x, y, c)
    for x, y in ((0, 0), (n - 1, 0), (0, n - 1), (n - 1, n - 1)):
        put(im, x, y, (0, 0, 0), 0)
    return im, cut


# --- the hearts --------------------------------------------------------------------------------------------------

HW, HH = 28, 26  # a heart's socket


def socket_ring(im, ox=0, half=False):
    """The round gold setting a heart sits in: an outline, a ring lit from the top left, a dark well. `half`: Vigor's
    half container, its left half closed by a straight gold edge."""
    cx, cy, rx, ry = 13.5, 12.5, 12.6, 11.6
    for y in range(HH):
        for x in range(HW):
            if half and x > 14:
                continue
            e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if e > 1.0:
                continue
            ring = ((x - cx) / (rx - 1.2)) ** 2 + ((y - cy) / (ry - 1.2)) ** 2
            inner = ((x - cx) / (rx - 3.0)) ** 2 + ((y - cy) / (ry - 3.0)) ** 2
            lit = (x - cx) * 0.8 + (y - cy) < 0
            if ring > 1.0:
                c = OUT
            elif inner > 1.0:
                ang = math.atan2(y - cy, x - cx)
                c = GOLD[3] if -2.6 < ang < -1.2 else GOLD[2] if lit else GOLD[1]
                if inner > 1.0 and ((x - cx) / (rx - 2.2)) ** 2 + ((y - cy) / (ry - 2.2)) ** 2 <= 1.0 and not lit:
                    c = GOLD[0]
            else:
                c = GLASS[0]
            put(im, ox + x, y, c)
        if half:
            for y in range(HH):
                if im.getpixel((ox + 14, y))[3]:
                    put(im, ox + 14, y, GOLD[1] if y < HH - 3 else OUT)
                    put(im, ox + 15, y, OUT)


def heart_mask():
    """The ruby's heart, 18 × 15: the classic two lobes and the point."""
    pts = set()
    for y in range(15):
        for x in range(18):
            u = (x - 8.5) / 8.6
            v = (6.0 - y) / 7.6
            if (u * u + v * v - 1) ** 3 - u * u * v ** 3 * 1.0 <= 0:
                pts.add((x, y))
    return pts


HEART = heart_mask()
HOX, HOY = 5, 5  # where the ruby sits in its socket


def ruby_colour(x, y, pale=0):
    """A facet's colour at (x, y) in the heart: a lit lobe top left, a glint, the body, the shade toward the point."""
    if (x, y) in ((4, 2), (5, 2), (3, 3), (12, 2)):
        c = RUBY[5]
    elif y <= 4 and x <= 7 and x + y >= 4:
        c = RUBY[4]
    elif y + abs(x - 8.5) * 0.6 > 10.5 or x >= 15:
        c = RUBY[1]
    elif x > 9 and y > 6:
        c = RUBY[2]
    else:
        c = RUBY[3]
    if pale:  # (the flash of a breaking gem: toward white)
        c = tuple(min(255, int(v + (255 - v) * pale)) for v in c)
    return c


def ruby(im, ox, side='both', pale=0, crack=False, gone=False):
    """The ruby in its socket: `side` left, right or both halves; `gone` draws the empty well's faint heart instead."""
    for x, y in HEART:
        left = x <= 8
        has = side == 'both' or (side == 'left') == left
        X, Y = ox + HOX + x, HOY + y
        if has and not gone:
            put(im, X, Y, ruby_colour(x, y, pale))
        else:
            edge = any((x + dx, y + dy) not in HEART for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                put(im, X, Y, GLASS[2])  # (the empty setting keeps the heart's shape, faintly)
    if crack and not gone:
        for x, y in ((9, 1), (9, 2), (8, 3), (9, 4), (10, 5), (9, 6), (8, 7), (9, 8), (9, 9), (8, 10)):
            if (x, y) in HEART:
                put(im, ox + HOX + x, HOY + y, RUBY[0])


def shards(im, ox, frame, side='both'):
    """Shards of ruby flying out of the setting (frame 0: near, 1: far and fewer)."""
    near = [(-3, 4), (-1, -4), (4, -5), (6, 2), (-4, -1), (3, 6)]
    for i, (dx, dy) in enumerate(near):
        if side == 'right' and dx < 0:
            continue
        if side == 'left' and dx > 0:
            continue
        if frame == 1 and i % 2:
            continue
        k = 1.0 if frame == 0 else 1.7
        x, y = int(13 + dx * k * 1.6), int(12 + dy * k * 1.5)
        put(im, ox + x, y, RUBY[5] if frame == 0 else RUBY[3])
        if frame == 0:
            put(im, ox + x + (1 if dx > 0 else -1), y, RUBY[3])
            put(im, ox + x, y + (1 if dy > 0 else -1), RUBY[2])


def heart_cell(kind):
    im = new(HW, HH)
    half = kind.startswith('vigor')
    socket_ring(im, half=half)
    if kind == 'full':
        ruby(im, 0)
    elif kind == 'half':
        ruby(im, 0, side='left')
    elif kind == 'empty':
        ruby(im, 0, gone=True)
    elif kind == 'vigor_full':
        for x, y in HEART:
            if x <= 8:
                put(im, HOX + x, HOY + y, ruby_colour(x, y))
    elif kind == 'vigor_empty':
        for x, y in HEART:
            if x <= 8 and any((x + dx, y + dy) not in HEART for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                put(im, HOX + x, HOY + y, GLASS[2])
    elif kind.startswith('soul_'):
        fill, rim, core = SOULS[kind[5:]]
        flame = new(HW, HH)
        for y, row in enumerate(SOUL):
            for x, ch in enumerate(row):
                if ch != '.':
                    put(flame, 9 + x, 6 + y, core if ch == 'k' else fill)
        outline(flame, rim)
        im.alpha_composite(flame)
    return im


def crack_strip(start, end):
    """Five frames of a heart breaking on a hit (held, never blended): cracked, the flash, shards out, sparks, and the
    heart as it is left. `start` and `end`: 'full', 'half' or 'empty'."""
    side = {'full': 'both', 'half': 'left'}[start]
    lost = 'right' if (start, end) == ('full', 'half') else side  # (which part breaks)
    frames = []
    for f in range(5):
        im = new(HW, HH)
        socket_ring(im)
        if f == 0:
            ruby(im, 0, side=side, crack=True)
        elif f == 1:
            ruby(im, 0, side=side, pale=0.55)
        else:
            ruby(im, 0, side='left' if end == 'half' else 'both', gone=end == 'empty')
            if end == 'half':
                ruby(im, 0, side='right', gone=True)
                ruby(im, 0, side='left')
            if f < 4:
                shards(im, 0, f - 2, lost)
        frames.append(im)
    return frames


def hearts():
    """The hearts' sheet: row 0 the states (full, half, empty, the three soul motes, Vigor's half container full and
    empty); rows 1 to 3 the cracks (full to empty, full to half, half to empty), five frames each."""
    row0 = ['full', 'half', 'empty', 'soul_pale', 'soul_black', 'soul_hallowed', 'vigor_full', 'vigor_empty']
    sheet = new(HW * 8, HH * 4)
    for i, k in enumerate(row0):
        sheet.alpha_composite(heart_cell(k), (i * HW, 0))
    for r, (a, b) in enumerate((('full', 'empty'), ('full', 'half'), ('half', 'empty'))):
        for i, im in enumerate(crack_strip(a, b)):
            sheet.alpha_composite(im, (i * HW, (r + 1) * HH))
    return sheet


# --- the mana vial -----------------------------------------------------------------------------------------------

VW, VH = 176, 18
LIQ = (9, 4, 158, 10)  # where the liquid shows: x, y, width, height (the CSS fills it)


def vial():
    """The mana vial: a glass tube between two gold caps, its glass dark where no mana is, ticks at each quarter (the
    segments of direction C); the liquid itself is the CSS's, so it can fill in whole pixels."""
    im = new(VW, VH)
    x0, y0, w, h = LIQ
    for y in range(y0 - 2, y0 + h + 2):
        for x in range(x0 - 1, x0 + w + 1):
            d = min(y - (y0 - 2), (y0 + h + 1) - y)
            if d == 0:
                c = OUT
            elif d == 1:
                c = GLASS[4] if y < y0 else GLASS[3]  # (the glass's rim, lit above)
            else:
                continue  # (the well: the CSS draws the empty glass and the liquid)
            put(im, x, y, c)
    for q in (1, 2, 3):  # ticks above and below at each quarter
        tx = x0 + round(w * q / 4)
        put(im, tx, y0 - 1, GOLD[2])
        put(im, tx, y0 + h, GOLD[1])
    for side in (0, 1):  # the caps: half domes of gold, a mana spark in the left one
        for y in range(VH):
            for x in range(10):
                dx = x if side == 0 else 9 - x
                e = ((9.5 - dx) / 9.5) ** 2 + ((y - 8.5) / 8.8) ** 2
                if e > 1.0 or dx > 9:
                    continue
                X = x if side == 0 else VW - 10 + x
                inner = ((9.5 - dx) / 8.0) ** 2 + ((y - 8.5) / 7.3) ** 2
                if inner > 1.0:
                    c = OUT
                else:
                    c = GOLD[3] if y < 6 and dx < 6 else GOLD[2] if y < 10 else GOLD[1] if y < 14 else GOLD[0]
                    if dx >= 8:
                        c = GOLD[0]
                put(im, X, y, c)
    put(im, 4, 8, MANA[3])
    put(im, 4, 9, MANA[2])
    put(im, 3, 9, MANA[4])
    return im


# --- the medallions, the gem, the sockets ------------------------------------------------------------------------


def octagon(n=52, cut=10, rim=GOLD, inner_line=GLASS[3], fill=GLASS[1]):
    """An octagonal medallion (a spell's, a card's sigil): an outline, a gold rim three pixels wide lit from the top
    left, a fine inner line, the glass; the corners cut at `cut`."""
    im = new(n, n)

    def inside(x, y, k):  # within the octagon shrunk by k
        a, b = x - k, y - k
        m = n - 1 - 2 * k
        if a < 0 or b < 0 or a > m or b > m:
            return False
        c = max(cut - k, 1)
        return a + b >= c and (m - a) + b >= c and a + (m - b) >= c and (m - a) + (m - b) >= c

    for y in range(n):
        for x in range(n):
            if not inside(x, y, 0):
                continue
            lit = x + y < n - 1
            if not inside(x, y, 1):
                c = OUT
            elif not inside(x, y, 2):
                c = rim[3] if lit and (x < n * 0.45 and y < n * 0.45) else rim[2] if lit else rim[1]
            elif not inside(x, y, 3):
                c = rim[2] if lit else rim[0]
            elif not inside(x, y, 4):
                c = OUT
            elif not inside(x, y, 5):
                c = inner_line if lit else GLASS[2]
            else:
                c = fill
            put(im, x, y, c)
    return im


def medallions():
    """The spell's medallion, plain, lit (a spell come ready) and red (a cast refused); a nine-slice cut at 11."""
    return {
        'medallion': octagon(),
        'medallion_lit': octagon(rim=[GOLD[1], GOLD[3], (255, 255, 255), (255, 255, 255)], inner_line=MANA[3]),
        'medallion_red': octagon(rim=[RED[0], RED[1], RED[2], (255, 220, 200)], inner_line=RED[1]),
    }


def level_gem():
    """The level as a jade gem, a long hexagon in a gold setting; lit (a level's choice waiting) a brighter setting
    and glints. Two frames side by side."""
    w, h = 28, 34
    sheet = new(w * 2, h)
    for f in range(2):
        im = new(w, h)
        for y in range(h):
            for x in range(w):
                # a pointy-top hexagon
                cx, cy = 13.5, 16.5
                dx, dy = abs(x - cx), abs(y - cy)
                if dx > 13 or dy + dx * 0.5 > 16.8:
                    continue
                d = min(13 - dx, 16.8 - dy - dx * 0.5)
                lit = (x - cx) + (y - cy) * 0.6 < 0
                if d < 1:
                    c = OUT
                elif d < 2.2:
                    c = (GOLD[3] if lit else GOLD[2]) if f else (GOLD[2] if lit else GOLD[1])
                elif d < 3:
                    c = OUT
                else:
                    band = (x - cx) * 0.7 - (y - cy)
                    c = JADE[3] if band > 6 else JADE[2] if band > -4 else JADE[1]
                    if f and band > 9:
                        c = JADE[4]
                put(im, x, y, c)
        for x, y in ((8, 9), (9, 8), (9, 9)):
            put(im, x, y, JADE[4] if not f else (255, 255, 255))
        if f:
            for x, y in ((13, 0), (13, 1), (27, 17), (0, 17), (13, 33)):
                put(im, x, y, GOLD[3])
        sheet.alpha_composite(im, (f * w, 0))
    return sheet


def potion_socket():
    """A belt socket for a bottle: an arch of gold over a dark well; lit (the chosen bottle) a bright rim. Two frames."""
    w, h = 30, 36
    sheet = new(w * 2, h)
    for f in range(2):
        im = new(w, h)
        r = w / 2 - 0.5
        for y in range(h):
            for x in range(w):
                cx = (w - 1) / 2
                if y < r:
                    e = math.hypot(x - cx, y - r) / r
                    if e > 1.0:
                        continue
                    d = (1 - e) * r
                else:
                    d = min(x, w - 1 - x, h - 1 - y)
                lit = x < cx and y < h * 0.6
                if d < 1:
                    c = OUT
                elif d < 2.2:
                    c = (GOLD[3] if f else GOLD[2]) if lit else (GOLD[2] if f else GOLD[1])
                elif d < 3:
                    c = OUT
                else:
                    c = GLASS[2] if f and y > h - 6 else GLASS[0]
                put(im, x, y, c)
        sheet.alpha_composite(im, (f * w, 0))
    return sheet


# --- the ornaments and the purse's icons -------------------------------------------------------------------------


def crest():
    """The cards' crest: a half arch of gold standing on the card's top edge, a mana gem at its heart."""
    w, h = 52, 22
    im = new(w, h)
    cx, cy = (w - 1) / 2, h - 1
    for y in range(h):
        for x in range(w):
            r = math.hypot((x - cx) * 0.95, (y - cy) * 1.22)
            if r > 24:
                continue
            lit = x < cx
            if r > 22.8:
                c = OUT
            elif r > 20.6:
                c = GOLD[3] if lit and y < 10 else GOLD[2] if lit else GOLD[1]
            elif r > 19.5:
                c = OUT
            else:
                c = GLASS[1]
            put(im, x, y, c)
    for x in range(w):  # (its foot on the card's edge)
        if im.getpixel((x, h - 1))[3]:
            put(im, x, h - 1, GOLD[1])
    gx, gy = int(cx), 12
    for y in range(gy - 5, gy + 6):
        for x in range(gx - 5, gx + 6):
            d = abs(x - gx) + abs(y - gy)
            if d == 5:
                put(im, x, y, OUT)
            elif d < 5:
                c = MANA[4] if (x - gx) + (y - gy) <= -3 else MANA[3] if (x - gx) + (y - gy) < 0 else MANA[2] if d < 3 else MANA[1]
                put(im, x, y, c)
    for x in (gx - 12, gx + 12):  # two gold studs on the arch
        put(im, x, 9, GOLD[3])
    return im


def wing():
    """A gold flourish (for the banner's rule, a toast's ends, the level-up's title): a curl at the outer end, a wave that
    runs in and thins to a point, a stud where it starts. The CSS mirrors it for the other side."""
    w, h = 30, 11
    im = new(w, h)
    for y in range(h):  # the curl: a small open ring at the left
        for x in range(9):
            r = math.hypot(x - 4, y - 5)
            ang = math.atan2(y - 5, x - 4)
            if 2.2 < r <= 3.6 and not (-0.9 < ang < 0.5):
                put(im, x, y, GOLD[3] if y < 5 else GOLD[2])
    put(im, 4, 5, GOLD[3])
    for x in range(7, w - 1):  # the wave: one long swell, its crest lit
        t = (x - 7) / (w - 8)
        y = round(5 + 2.6 * math.sin(math.pi * 2 * t + 0.3) * (1 - t * 0.5))
        put(im, x, y, GOLD[3] if y <= 5 else GOLD[2])
        if t < 0.55:
            put(im, x, y + 1, GOLD[1])
    for y in range(4, 7):  # a stud where it meets the rule
        put(im, w - 2, y, GOLD[2])
    put(im, w - 2, 5, GOLD[3])
    return outline(im)


def key_icon():
    """The bone key: a ring bow, a long shaft, two teeth; a blue glint in the bow (the old icon's)."""
    rows = [
        '.bbbb...............',
        'bb..bb..............',
        'b.ww.bbbbbbbbbbbbbbb',
        'b.ww.bdddddddddddddd',
        'bb..bb.......b..b.b.',
        '.bbbb........d..d.d.',
    ]
    pal = {'b': (232, 220, 192), 'd': (168, 150, 120), 'w': (138, 184, 255)}
    im = new(len(rows[0]) + 2, len(rows) + 2)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                put(im, x + 1, y + 1, pal[ch])
    return outline(im)


def glyph_icon():
    """The blast glyph: a round slate with an amber star cut into it."""
    n = 18
    im = new(n, n)
    c = (n - 1) / 2
    for y in range(n):
        for x in range(n):
            d = math.hypot(x - c, y - c)
            if d > 8.2:
                continue
            col = (107, 97, 88) if d > 7.0 else (58, 52, 48) if (x - c) + (y - c) < -2 else (43, 38, 34)
            put(im, x, y, col)
    pts = [(c + math.cos(-math.pi / 2 + i * math.pi * 6 / 7) * 5.4, c + math.sin(-math.pi / 2 + i * math.pi * 6 / 7) * 5.4) for i in range(8)]
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        steps = int(max(abs(bx - ax), abs(by - ay))) + 1
        for s in range(steps + 1):
            t = s / steps
            put(im, round(ax + (bx - ax) * t), round(ay + (by - ay) * t), (255, 176, 74))
    put(im, round(c), round(c), (255, 220, 150))
    return outline(im)


# --- writing them ------------------------------------------------------------------------------------------------


def build():
    out = {}
    out['glass'], g_cut = glass()
    out['card'], c_cut = glass(n=40, cut=13, jewel=4, fill_a=246, double=True)
    out['halo'], h_cut = halo()
    out['button'], b_cut = button()
    out['button_on'], _ = button(True)
    out['tile'], t_cut = tile()
    out['tile_on'], _ = tile(True)
    out['hearts'] = hearts()
    out['vial'] = vial()
    out.update(medallions())
    out['levelgem'] = level_gem()
    out['socket'] = potion_socket()
    out['crest'] = crest()
    out['wing'] = wing()
    out['key'] = key_icon()
    out['glyph'] = glyph_icon()
    cuts = {'glass': g_cut, 'card': c_cut, 'halo': h_cut, 'button': b_cut, 'tile': t_cut, 'medallion': 11}
    return out, cuts


def sheet(images, path, k=5):
    """Every picture enlarged on one sheet, on a mid grey, for looking at them."""
    x = y = rowh = 0
    pos = []
    W = 1400
    for im in images.values():
        w, h = im.width * k, im.height * k
        if x + w > W:
            x, y, rowh = 0, y + rowh + 12, 0
        pos.append((x, y))
        x += w + 12
        rowh = max(rowh, h)
    s = Image.new('RGBA', (W, y + rowh), (70, 66, 74, 255))
    for im, p in zip(images.values(), pos):
        s.alpha_composite(im.resize((im.width * k, im.height * k), Image.NEAREST), p)
    s.save(path)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out_dir = args[0] if args else 'public/assets/hud'
    os.makedirs(out_dir, exist_ok=True)
    images, cuts = build()
    for name, im in images.items():
        im.save(os.path.join(out_dir, f'{name}.png'))
        print(f'{name:14} {im.size}' + (f'  slice {cuts[name]}' if name in cuts else ''))
    if '--sheet' in sys.argv:
        sheet(images, sys.argv[sys.argv.index('--sheet') + 1])
