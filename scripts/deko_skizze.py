"""Skizze Boden-Deko-Ebene (Entscheidungen 35, 39, 41): billige Lageplan-Skizze, keine Grafik.

Start-Hof aus winterhof.json (Objekte, Zufahrt, Hindernisse) als Klötzchen in Iso, darauf Boden-Deko
nach verschiedenen Verteilungsregeln. Deko liegt frei (nicht im Raster), wird aus Weltkoordinaten
berechnet und weicht belegten Kacheln und Wegen aus.
Aufruf: python scripts/deko_skizze.py <ausgabeordner>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter, map_coordinates

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
D = json.loads((ROOT / 'src/content/winterhof.json').read_text(encoding='utf-8'))
SIZES, MAP = D['sizes'], D['map']

W, H, TW = 1600, 900, 104          # Bild, Kachelbreite in Pixel
CX, CY = 5.6, 6.2                   # Bildmitte in Rasterkoordinaten
GRAS = np.array((128, 182, 62), float)


def proj(gx, gy):
    return (W / 2 + (gx - gy - (CX - CY)) * TW / 2, H / 2 + (gx + gy - (CX + CY)) * TW / 4)


# ---------------------------------------------------------------- Belegung
def road_tiles(extra=()):
    o = MAP['origin']
    t = {(x + o['gx'], y + o['gy']) for y, r in enumerate(MAP['surface']) for x, c in enumerate(r) if c in 'RP'}
    return t | set(extra)


def footprint(o):
    s = SIZES[o['type']]
    return o['gx'], o['gy'], s['w'], s['h']


class Szene:
    def __init__(self, objs, wege=()):
        self.objs = objs + [dict(o, kind='obstacle') for o in MAP['obstacles']]
        self.road = road_tiles(wege)
        # Raster 8 px je Kachel für Weg-Maske (runde Kanten) und Abstände
        self.g0, self.n, self.r = -12, 44, 8
        m = np.zeros((self.n * self.r, self.n * self.r))
        for gx, gy in self.road:
            i, j = (gx - self.g0) * self.r, (gy - self.g0) * self.r
            if 0 <= i < m.shape[0] and 0 <= j < m.shape[1]:
                m[j:j + self.r, i:i + self.r] = 1
        self.road_f = gaussian_filter(m, self.r * 0.38)
        self.rects = [footprint(o) for o in self.objs]

    def road_at(self, gx, gy):
        skalar = np.ndim(gx) == 0
        gx, gy = np.atleast_1d(gx), np.atleast_1d(gy)
        c = np.stack([(gy - self.g0) * self.r - 0.5, (gx - self.g0) * self.r - 0.5])
        v = map_coordinates(self.road_f, c, order=1, mode='constant')
        return float(v[0]) if skalar else v

    def dist(self, gx, gy, groups=None):
        best = 99.0
        for o, (x, y, w, h) in zip(self.objs, self.rects):
            g = SIZES[o['type']]['group']
            if groups and g not in groups:
                continue
            dx = max(x - gx, 0, gx - (x + w))
            dy = max(y - gy, 0, gy - (y + h))
            best = min(best, (dx * dx + dy * dy) ** 0.5)
        return best

    def nearest_group(self, gx, gy):
        best, bg, bt = 99.0, None, None
        for o, (x, y, w, h) in zip(self.objs, self.rects):
            dx = max(x - gx, 0, gx - (x + w))
            dy = max(y - gy, 0, gy - (y + h))
            d = (dx * dx + dy * dy) ** 0.5
            if d < best:
                best, bg, bt = d, SIZES[o['type']]['group'], o['type']
        return best, bg, bt


# ---------------------------------------------------------------- Boden
def boden(sz):
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    X, Y = (xs - W / 2) / (TW / 2) + (CX - CY), (ys - H / 2) / (TW / 4) + (CX + CY)
    gx, gy = (X + Y) / 2, (Y - X) / 2
    rng = np.random.default_rng(7)
    wolke = gaussian_filter(rng.standard_normal((H // 8 + 1, W // 8 + 1)), 9)
    wolke = np.kron(wolke / (np.abs(wolke).max() + 1e-9), np.ones((8, 8)))[:H, :W]
    img = GRAS[None, None] * (1 + 0.06 * wolke[..., None])
    rf = sz.road_at(gx.ravel(), gy.ravel()).reshape(H, W)
    sand = np.array((214, 186, 132), float)
    a = np.clip((rf - 0.42) / 0.08, 0, 1)[..., None]
    img = img * (1 - a) + sand * a
    saum = ((rf > 0.36) & (rf < 0.46))[..., None]
    img = np.where(saum, img * 0.86, img)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'))


# ---------------------------------------------------------------- Objekte (Klötzchen)
FARBE = {
    'building': ((232, 214, 182), (196, 72, 60)), 'landmark': ((40, 110, 60), (40, 110, 60)),
    'prop': ((150, 104, 64), (176, 128, 84)), 'deco': ((90, 80, 70), (240, 200, 90)),
    'pen': ((204, 170, 110), (176, 64, 54)),
}


def prisma(d, x, y, w, h, hpx, top, side):
    c = [proj(x, y), proj(x + w, y), proj(x + w, y + h), proj(x, y + h)]
    up = [(px, py - hpx) for px, py in c]
    l = tuple(int(v * 0.72) for v in side)
    r = tuple(int(v * 0.88) for v in side)
    d.polygon([c[3], c[2], up[2], up[3]], fill=l)
    d.polygon([c[1], c[2], up[2], up[1]], fill=r)
    d.polygon(up, fill=top)


def schatten(d, x, y, w, h, k=1.0):
    cx, cy = proj(x + w / 2 + 0.15, y + h / 2 + 0.15)
    rx, ry = (w + h) * TW / 4 * 0.62 * k, (w + h) * TW / 8 * 0.62 * k
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(30, 60, 20, 70))


def objekt(d, o):
    s = SIZES[o['type']]
    x, y, w, h = footprint(o)
    g, t = s['group'], o['type']
    ht = s['heightTiles'] - (w + h) / 4
    if g == 'field':
        prisma(d, x + .08, y + .08, w - .16, h - .16, 6, (150, 104, 62), (120, 84, 50))
        for k in range(1, 6):
            a, b = proj(x + .2, y + k * h / 6), proj(x + w - .2, y + k * h / 6)
            d.line([a, b], fill=(232, 200, 80), width=4)
        return
    if g == 'pen':
        prisma(d, x + .05, y + .05, w - .1, h - .1, 3, (196, 168, 112), (160, 130, 90))
        c = [proj(x, y), proj(x + w, y), proj(x + w, y + h), proj(x, y + h)]
        d.line(c + [c[0]], fill=(120, 84, 52), width=3)
        prisma(d, x + .2, y + .2, 1.2, 1.2, TW * 1.0, (176, 64, 54), (220, 190, 150))
        return
    if t.startswith('pine') or t == 'christmasTree':
        schatten(d, x, y, w, h, 0.9)
        cx, cy = proj(x + w / 2, y + h / 2)
        hp = s['heightTiles'] * TW * 0.5
        rad = w * TW * 0.28
        d.rectangle([cx - 4, cy - 14, cx + 4, cy + 2], fill=(110, 76, 46))
        col = (40, 110, 60) if t == 'christmasTree' else (34, 88, 60)
        for k, f in enumerate((1.0, .78, .55)):
            yb = cy - 10 - k * hp * .26
            d.polygon([(cx - rad * f, yb), (cx + rad * f, yb), (cx, yb - hp * .5)], fill=col)
            d.line([(cx - rad * f * .7, yb - 3), (cx, yb - hp * .5 + 4)], fill=(244, 246, 250), width=3)
        if t == 'christmasTree':
            for k in range(7):
                a = proj(x + w / 2, y + h / 2)
                px, py = a[0] + (k % 3 - 1) * rad * .5, a[1] - 20 - k * hp * .1
                d.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(230, 60, 50) if k % 2 else (250, 210, 70))
        return
    if t.startswith('rock'):
        schatten(d, x, y, w, h, .8)
        cx, cy = proj(x + w / 2, y + h / 2)
        rx = w * TW * .36
        d.ellipse([cx - rx, cy - rx * .9, cx + rx, cy + rx * .35], fill=(132, 134, 142))
        d.ellipse([cx - rx * .8, cy - rx * .95, cx + rx * .6, cy - rx * .35], fill=(244, 246, 250))
        return
    if t.startswith('drift'):
        cx, cy = proj(x + w / 2, y + h / 2)
        rx = w * TW * .42
        d.ellipse([cx - rx, cy - rx * .5, cx + rx, cy + rx * .32], fill=(206, 220, 236))
        d.ellipse([cx - rx * .9, cy - rx * .55, cx + rx * .8, cy + rx * .15], fill=(246, 248, 252))
        return
    if t.startswith('ice'):
        prisma(d, x + .1, y + .1, w - .2, h - .2, 8, (186, 222, 242), (140, 180, 210))
        return
    if t == 'snowman':
        cx, cy = proj(x + .5, y + .5)
        for r_, dy in ((16, 0), (12, -22), (9, -38)):
            d.ellipse([cx - r_, cy + dy - r_ * 2 + 6, cx + r_, cy + dy + 6], fill=(246, 248, 252), outline=(190, 200, 214))
        return
    if t == 'lantern':
        cx, cy = proj(x + .5, y + .5)
        hp = s['heightTiles'] * TW * .5
        d.line([(cx, cy), (cx, cy - hp)], fill=(60, 56, 52), width=5)
        d.rectangle([cx - 8, cy - hp - 14, cx + 8, cy - hp + 2], fill=(250, 214, 110), outline=(60, 56, 52), width=2)
        return
    top, side = FARBE.get(g, ((180, 160, 130), (150, 130, 110)))
    if g == 'building':
        schatten(d, x, y, w, h, .9)
    prisma(d, x + .06, y + .06, w - .12, h - .12, max(ht, .2) * TW * .5, side if g == 'building' else top, top if g == 'building' else side)


# ---------------------------------------------------------------- Boden-Deko (Symbole)
def deko(d, kind, gx, gy, rng):
    cx, cy = proj(gx, gy)
    u = TW / 104
    if kind == 'buschel':
        for k in range(5):
            a = (k - 2) * .32 + rng.uniform(-.1, .1)
            ln = rng.uniform(12, 20) * u
            d.line([(cx + (k - 2) * 2, cy), (cx + (k - 2) * 2 + np.sin(a) * ln, cy - np.cos(a) * ln)],
                   fill=(196, 176, 86) if k % 2 else (168, 160, 70), width=2)
    elif kind == 'stein':
        r = rng.uniform(7, 11) * u
        d.ellipse([cx - r, cy - r * .8, cx + r, cy + r * .35], fill=(140, 142, 150))
        d.ellipse([cx - r * .75, cy - r * .85, cx + r * .55, cy - r * .3], fill=(246, 248, 252))
    elif kind == 'christrose':
        d.ellipse([cx - 9 * u, cy - 4 * u, cx + 9 * u, cy + 4 * u], fill=(54, 110, 50))
        for k in range(3):
            px, py = cx + (k - 1) * 6 * u, cy - 4 * u - (k % 2) * 4 * u
            d.ellipse([px - 4 * u, py - 4 * u, px + 4 * u, py + 4 * u], fill=(252, 250, 244), outline=(210, 200, 190))
            d.ellipse([px - 1.4 * u, py - 1.4 * u, px + 1.4 * u, py + 1.4 * u], fill=(240, 200, 60))
    elif kind == 'stechpalme':
        d.ellipse([cx - 10 * u, cy - 6 * u, cx, cy + 2 * u], fill=(28, 92, 48))
        d.ellipse([cx - 1 * u, cy - 7 * u, cx + 10 * u, cy + 1 * u], fill=(36, 104, 54))
        for k in range(3):
            px, py = cx + (k - 1) * 3.2 * u, cy - 6 * u + (k % 2) * 2 * u
            d.ellipse([px - 2.6 * u, py - 2.6 * u, px + 2.6 * u, py + 2.6 * u], fill=(214, 36, 40))
    elif kind == 'zapfen':
        for k in range(rng.integers(2, 4)):
            px, py = cx + rng.uniform(-8, 8) * u, cy + rng.uniform(-3, 3) * u
            d.ellipse([px - 3.5 * u, py - 5 * u, px + 3.5 * u, py + 2 * u], fill=(130, 86, 48), outline=(92, 60, 34))
    elif kind == 'pilz':
        for k in range(rng.integers(1, 3)):
            px, py = cx + k * 9 * u, cy + k * 2 * u
            d.rectangle([px - 2 * u, py - 8 * u, px + 2 * u, py], fill=(246, 242, 232))
            d.chord([px - 7 * u, py - 14 * u, px + 7 * u, py - 2 * u], 180, 360, fill=(220, 44, 40))
            for q in (-3, 1, 4):
                d.ellipse([px + q * u - 1.2 * u, py - 11 * u, px + q * u + 1.2 * u, py - 8.6 * u], fill=(255, 255, 255))
    elif kind == 'laub':
        for k in range(rng.integers(4, 8)):
            px, py = cx + rng.uniform(-14, 14) * u, cy + rng.uniform(-5, 5) * u
            c = [(214, 120, 40), (196, 80, 36), (230, 170, 60)][k % 3]
            d.ellipse([px - 4 * u, py - 2 * u, px + 4 * u, py + 2 * u], fill=c)
    elif kind == 'schneefleck':
        for k in range(4):
            px, py = cx + rng.uniform(-30, 30) * u, cy + rng.uniform(-10, 10) * u
            rx = rng.uniform(18, 30) * u
            d.ellipse([px - rx, py - rx * .42 + 3 * u, px + rx, py + rx * .42 + 3 * u], fill=(150, 176, 206))
        for k in range(4):
            px, py = cx + rng.uniform(-30, 30) * u, cy + rng.uniform(-10, 10) * u
            rx = rng.uniform(16, 27) * u
            d.ellipse([px - rx, py - rx * .42, px + rx, py + rx * .42], fill=(246, 248, 252))
    elif kind == 'laubteppich':
        for k in range(26):
            px, py = cx + rng.normal(0, 20) * u, cy + rng.normal(0, 8) * u
            c = [(214, 120, 40), (196, 80, 36), (230, 170, 60)][k % 3]
            d.ellipse([px - 4 * u, py - 2 * u, px + 4 * u, py + 2 * u], fill=c)
    elif kind == 'blumenwiese':
        for k in range(7):
            deko(d, 'christrose', gx + rng.normal(0, .35), gy + rng.normal(0, .35), rng)


# ---------------------------------------------------------------- Verteilung
def poisson(rng, r, box, n_try=30000):
    x0, x1, y0, y1 = box
    pts = []
    cell = r / 2 ** .5
    grid = {}
    for _ in range(n_try):
        p = (rng.uniform(x0, x1), rng.uniform(y0, y1))
        ci, cj = int(p[0] // cell), int(p[1] // cell)
        ok = True
        for i in range(ci - 2, ci + 3):
            for j in range(cj - 2, cj + 3):
                q = grid.get((i, j))
                if q and (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < r * r:
                    ok = False
                    break
            if not ok:
                break
        if ok:
            grid[(ci, cj)] = p
            pts.append(p)
    return pts


BOX = (-7, 18, -6, 20)


def frei(sz, gx, gy, abst=0.22, weg=0.30):
    return sz.dist(gx, gy) > abst and sz.road_at(gx, gy) < weg


def art_nach_ort(rng, sz, gx, gy):
    d, g, t = sz.nearest_group(gx, gy)
    if d < 1.6 and t.startswith('rock'):
        return rng.choice(['stein', 'buschel', 'stein', 'buschel'])
    if d < 1.6 and (t.startswith('pine') or t == 'christmasTree'):
        return rng.choice(['zapfen', 'buschel', 'stechpalme', 'pilz'])
    if d < 1.0 and g == 'building':
        return rng.choice(['stein', 'buschel'])
    return rng.choice(['buschel', 'buschel', 'christrose', 'laub', 'pilz', 'stein'])


def wolke(gx, gy):
    return 0.6 + 0.4 * np.sin(gx * .7 + 1.3) * np.cos(gy * .55 - .4) + 0.25 * np.sin((gx + gy) * .33)


def verteilung(sz, art, seed=3):
    rng = np.random.default_rng(seed)
    items = []
    if art == 'A':                                     # Hay Day ruhig
        for gx, gy in poisson(rng, 0.85, BOX):
            if not frei(sz, gx, gy):
                continue
            dh = sz.dist(gx, gy, ('obstacle', 'landmark'))
            db = sz.dist(gx, gy, ('building',))
            p = 0.07 * wolke(gx, gy) + 0.55 * np.exp(-dh * dh / 2.2) + 0.30 * np.exp(-db * db / 0.18)
            if rng.random() < p:
                k = art_nach_ort(rng, sz, gx, gy)
                for _ in range(rng.integers(1, 3) if k in ('buschel', 'stein') else 1):
                    qx, qy = gx + rng.uniform(-.25, .25), gy + rng.uniform(-.25, .25)
                    if frei(sz, qx, qy):
                        items.append((k, qx, qy))
    elif art == 'B':                                   # Nester
        themen = {'beet': ['christrose'] * 3 + ['buschel'], 'steine': ['stein', 'stein', 'buschel'],
                  'wald': ['zapfen', 'stechpalme', 'buschel'], 'pilzring': ['pilz'], 'laub': ['laub', 'buschel']}
        for gx, gy in poisson(rng, 3.4, BOX):
            dh = sz.dist(gx, gy, ('obstacle',))
            if rng.random() > 0.35 + 0.5 * np.exp(-dh * dh / 4):
                continue
            th = rng.choice(list(themen))
            n = rng.integers(5, 10)
            for k in range(n):
                if th == 'pilzring':
                    a = k / n * 2 * np.pi
                    qx, qy = gx + np.cos(a) * .55, gy + np.sin(a) * .55
                else:
                    qx, qy = gx + rng.normal(0, .45), gy + rng.normal(0, .45)
                if frei(sz, qx, qy):
                    items.append((rng.choice(themen[th]), qx, qy))
    elif art == 'C':                                   # Mutig: Wiese lebt, Saum an Wegen und Häusern
        for gx, gy in poisson(rng, 2.2, BOX):
            if rng.random() < 0.45 and frei(sz, gx, gy, 0.8, 0.05):
                items.append((rng.choice(['schneefleck', 'laubteppich', 'blumenwiese']), gx, gy))
        for gx, gy in poisson(rng, 0.36, BOX):
            if not frei(sz, gx, gy, 0.10, 0.42):
                continue
            rf = float(sz.road_at(gx, gy))
            db = sz.dist(gx, gy, ('building', 'pen', 'prop', 'obstacle', 'landmark'))
            if rf > 0.10:
                items.append(('buschel', gx, gy))
            elif db < 0.55 and rng.random() < 0.8:
                items.append((art_nach_ort(rng, sz, gx, gy), gx, gy))
            elif rng.random() < 0.12 * wolke(gx, gy):
                items.append((art_nach_ort(rng, sz, gx, gy), gx, gy))
    return items


# ---------------------------------------------------------------- Bild
def schrift(n):
    for f in ('C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf'):
        try:
            return ImageFont.truetype(f, n)
        except OSError:
            pass
    return ImageFont.load_default()


def bild(name, objs, art, titel, wege=(), seed=3, tw=104, c=(5.6, 6.2)):
    global TW, CX, CY
    TW, (CX, CY) = tw, c
    sz = Szene(objs, wege)
    img = boden(sz).convert('RGBA')
    lay = Image.new('RGBA', img.size)
    d = ImageDraw.Draw(lay, 'RGBA')
    # Start-Land dezent
    c = [proj(-1, -1), proj(11, -1), proj(11, 11), proj(-1, 11)]
    d.line(c + [c[0]], fill=(255, 255, 255, 70), width=2)
    rng = np.random.default_rng(11)
    draw = []
    if art:
        for k, gx, gy in verteilung(sz, art, seed):
            draw.append((gx + gy - (2 if k == 'schneefleck' else 0), 'd', (k, gx, gy)))
    for o in sz.objs:
        x, y, w, h = footprint(o)
        flach = SIZES[o['type']]['group'] == 'field' or o['type'].startswith('ice')
        draw.append((x + y + (w + h) / 2 - (3 if flach else 0), 'o', o))
    for _, typ, v in sorted(draw, key=lambda e: e[0]):
        if typ == 'd':
            deko(d, *v, rng)
        else:
            objekt(d, v)
    img = Image.alpha_composite(img, lay)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([18, 18, 18 + 22 + d.textlength(titel, font=schrift(30)), 70], 12, fill=(16, 22, 34, 210))
    d.text((30, 26), titel, font=schrift(30), fill=(243, 195, 91))
    img.convert('RGB').save(OUT / f'{name}.jpg', quality=86)
    return len([e for e in draw if e[1] == 'd'])


START = D['start']['objects']
UMBAU = [dict(o) for o in START]
for o in UMBAU:
    if o['id'] == 'st_bakery':
        o['gx'], o['gy'] = 9, 1
UMBAU += [{'kind': 'field', 'type': 'field', 'id': 'f_5', 'gx': 0, 'gy': 6},
          {'kind': 'field', 'type': 'field', 'id': 'f_6', 'gx': 0, 'gy': 8}]
PLATTEN = [(6, y) for y in range(3, 8)]

if __name__ == '__main__':
    NAH = dict(tw=200, c=(5.2, 8.4))
    for k, t in (('0', 'Ohne Deko (heute)'), ('A', 'Wie Hay Day: ruhig, mehr am Rand'),
                 ('B', 'Nester: Beete, Steingruppen, Pilzring'), ('C', 'Mutig: Wiese lebt, Saum an Weg und Haus')):
        art = None if k == '0' else k
        print(k, bild(f'd_{k}', START, art, f'{k}  {t}'), bild(f'd_{k}_nah', START, art, f'{k}  {t} (nah)', **NAH))
    print('U', bild('d_A_umbau', UMBAU, 'A', 'A nach Umbau: Deko weicht aus', PLATTEN),
          bild('d_A_umbau_nah', UMBAU, 'A', 'A nach Umbau (nah)', PLATTEN, **NAH))
