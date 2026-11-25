"""Karten-Skizzen (Entscheidung 35): Konzept erst als billige Skizze, dann aufwendiges Bild.

Flächen + Symbole in Iso-Draufsicht, gleiche Geometrie wie scripts/karte_rand.py (Tal, Wiesenform, Kamera).
Eine Skizze dauert Sekunden. Zweck: Komposition klären (wo Wald, Wasser, Felsen, Lichtungen), nicht Grafik.
Aufruf: python scripts/karte_skizze.py <ausgabeordner> [S0,SA,...]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(sys.argv[1])
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
ROOT = Path(__file__).resolve().parent.parent
sys.argv = [sys.argv[0], str(OUT)]
sys.path.insert(0, str(ROOT / 'scripts'))
import karte_rand as K  # noqa: E402

W, H = K.W, K.H
GRAS, SCHNEE, WASSER, UFER = (124, 178, 70), (238, 240, 236), (64, 150, 214), (128, 96, 66)
TANNE, TANNE_H = (34, 84, 58), (60, 120, 80)
FELS, FELS_H = (120, 122, 128), (170, 172, 178)
TEICH_EIS = (178, 214, 238)


# ---------------------------------------------------------------- Geometrie
def linie(ctrl, n=4, step=0.1):
    p = K.chaikin(ctrl, n)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])
    t = np.arange(0, s[-1], step)
    return np.stack([np.interp(t, s, p[:, 0]), np.interp(t, s, p[:, 1])], -1)


def abstand(pts, line):
    from scipy.spatial import cKDTree
    return cKDTree(line).query(pts)[0]


def teich_rand(pc, a=2.5, b=2.0, k=1.0, n=200):
    ph = np.linspace(0, 2 * np.pi, n, endpoint=False)
    w = 1 + 0.10 * np.sin(2 * ph + 0.6) + 0.05 * np.sin(3 * ph + 2.0)
    return np.asarray(pc) + np.stack([a * np.cos(ph), b * np.sin(ph)], -1) * (w * k)[:, None]


def teich_rho(pts, pc, a=2.5, b=2.0):
    dx, dy = (pts[:, 0] - pc[0]) / a, (pts[:, 1] - pc[1]) / b
    ph = np.arctan2(dy, dx)
    return np.hypot(dx, dy) / (1 + 0.10 * np.sin(2 * ph + 0.6) + 0.05 * np.sin(3 * ph + 2.0))


def wiese(gx, gy, buchten):
    f = K.ffield(gx, gy)
    for bx, by, a, sg in buchten:
        f = f + a * np.exp(-((gx - bx) ** 2 + (gy - by) ** 2) / (2 * sg * sg))
    return f


# ---------------------------------------------------------------- Zeichnen
class Skizze:
    def __init__(self, cam, buchten=()):
        self.cam, self.buchten = cam, buchten
        gx, gy = cam.grid()
        f = wiese(gx, gy, buchten)
        img = np.where((f > 0)[..., None], np.array(GRAS, float), np.array(SCHNEE, float))
        self.img = Image.fromarray(img.astype('uint8'))
        self.d = ImageDraw.Draw(self.img, 'RGBA')
        self.objs = []                     # (sy, fn)
        self.U = cam.tw

    def p(self, x, y):
        return tuple(float(v) for v in self.cam.proj(x, y))

    def f(self, x, y):
        return float(wiese(np.array(x), np.array(y), self.buchten))

    def flaeche(self, ring, fill, outline=None, width=1):
        self.d.polygon([self.p(*q) for q in ring], fill=fill, outline=outline, width=width)

    def bach(self, line, breit=0.55, ufer=0.85):
        u = self.U
        pts = [self.p(*q) for q in line]
        self.d.line(pts, fill=UFER, width=max(2, int(ufer * u)), joint='curve')
        self.d.line(pts, fill=WASSER, width=max(1, int(breit * u)), joint='curve')

    def teich(self, pc, eisloch=True):
        self.flaeche(teich_rand(pc, k=1.18), SCHNEE)
        self.flaeche(teich_rand(pc), TEICH_EIS, outline=(110, 150, 190), width=2)
        if eisloch:
            self.flaeche(teich_rand((pc[0] - 0.25, pc[1] + 0.15), k=0.42), (40, 110, 150))

    def pfad(self, line, farbe=(214, 222, 232)):
        self.d.line([self.p(*q) for q in line], fill=farbe, width=max(2, int(0.28 * self.U)), joint='curve')

    # Symbole (Fußpunkt = Raster), werden nach Bildschirm-y sortiert
    def tanne(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.polygon([(sx - 0.42 * u, sy), (sx + 0.42 * u, sy), (sx, sy - 1.25 * u)], fill=TANNE)
            d.polygon([(sx - 0.42 * u, sy), (sx, sy), (sx, sy - 1.25 * u)], fill=TANNE_H)
            d.polygon([(sx - 0.16 * u, sy - 0.85 * u), (sx + 0.16 * u, sy - 0.85 * u), (sx, sy - 1.25 * u)], fill=(245, 246, 242))
        self.objs.append((sy, fn))

    def birke(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.ellipse([sx - 0.32 * u, sy - 1.35 * u, sx + 0.32 * u, sy - 0.6 * u], fill=(196, 170, 150, 150), outline=(150, 120, 100))
            d.line([(sx, sy), (sx, sy - 1.15 * u)], fill=(250, 250, 248), width=max(2, int(0.1 * u)))
            d.line([(sx, sy - 0.3 * u), (sx, sy - 0.36 * u)], fill=(40, 40, 40), width=max(2, int(0.1 * u)))
        self.objs.append((sy, fn))

    def laub(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.line([(sx, sy), (sx, sy - 0.9 * u)], fill=(96, 66, 44), width=max(2, int(0.1 * u)))
            d.ellipse([sx - 0.45 * u, sy - 1.4 * u, sx + 0.45 * u, sy - 0.55 * u], outline=(110, 78, 52), width=max(2, int(0.06 * u)))
        self.objs.append((sy, fn))

    def fels(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.ellipse([sx - 0.45 * u, sy - 0.55 * u, sx + 0.45 * u, sy + 0.1 * u], fill=FELS)
            d.ellipse([sx - 0.38 * u, sy - 0.6 * u, sx + 0.2 * u, sy - 0.3 * u], fill=SCHNEE)
        self.objs.append((sy, fn))

    def busch(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.ellipse([sx - 0.3 * u, sy - 0.45 * u, sx + 0.3 * u, sy + 0.05 * u], fill=(40, 96, 52))
            d.ellipse([sx - 0.08 * u, sy - 0.3 * u, sx + 0.02 * u, sy - 0.2 * u], fill=(210, 40, 40))
        self.objs.append((sy, fn))

    def schilf(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            for k in (-0.12, 0, 0.12):
                d.line([(sx + k * u, sy), (sx + k * u * 1.4, sy - 0.6 * u)], fill=(150, 160, 80), width=max(1, int(0.05 * u)))
                d.ellipse([sx + k * u * 1.4 - 0.04 * u, sy - 0.62 * u, sx + k * u * 1.4 + 0.04 * u, sy - 0.48 * u], fill=(112, 70, 38))
        self.objs.append((sy, fn))

    def stamm(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.line([(sx - 0.45 * u, sy - 0.05 * u), (sx + 0.45 * u, sy - 0.25 * u)], fill=(110, 76, 48), width=max(2, int(0.16 * u)))
        self.objs.append((sy, fn))

    def tier(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.ellipse([sx - 0.18 * u, sy - 0.35 * u, sx + 0.18 * u, sy - 0.12 * u], fill=(170, 100, 50))
            d.line([(sx + 0.15 * u, sy - 0.3 * u), (sx + 0.22 * u, sy - 0.5 * u)], fill=(170, 100, 50), width=max(1, int(0.06 * u)))
        self.objs.append((sy, fn))

    def rentier(self, x, y, s=1.0, rechts=True):
        sx, sy = self.p(x, y)
        u = self.U * s
        k = 1 if rechts else -1

        def fn(d):
            braun, dunkel = (150, 98, 58), (96, 62, 38)
            for b in (-0.14, 0.12):
                d.line([(sx + b * u, sy - 0.3 * u), (sx + b * u, sy)], fill=dunkel, width=max(1, int(0.06 * u)))
            d.ellipse([sx - 0.26 * u, sy - 0.48 * u, sx + 0.26 * u, sy - 0.24 * u], fill=braun)
            hx, hy = sx + k * 0.3 * u, sy - 0.58 * u
            d.line([(sx + k * 0.18 * u, sy - 0.4 * u), (hx, hy)], fill=braun, width=max(2, int(0.1 * u)))
            d.ellipse([hx - 0.08 * u, hy - 0.06 * u, hx + 0.1 * u, hy + 0.06 * u], fill=braun)
            for g in (-0.1, 0.06):
                d.line([(hx + g * u, hy - 0.04 * u), (hx + g * u * 1.6, hy - 0.3 * u)], fill=(226, 206, 170), width=max(1, int(0.05 * u)))
        self.objs.append((sy, fn))

    def heu(self, x, y, s=1.0):
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.rectangle([sx - 0.4 * u, sy - 0.5 * u, sx + 0.4 * u, sy], fill=(120, 84, 52))
            d.ellipse([sx - 0.36 * u, sy - 0.6 * u, sx + 0.36 * u, sy - 0.3 * u], fill=(222, 192, 96))
        self.objs.append((sy, fn))

    def zaun(self, ring, luecke=None):
        """Holzzaun entlang eines Rings (Raster), Pfosten + Latte; luecke = Index-Bereich fürs Tor."""
        u = self.U
        for k, (a, b) in enumerate(zip(ring, np.roll(ring, -1, 0))):
            if luecke and luecke[0] <= k < luecke[1]:
                continue
            pa, pb = self.p(*a), self.p(*b)

            def fn(d, pa=pa, pb=pb):
                for h in (0.22, 0.42):
                    d.line([(pa[0], pa[1] - h * u), (pb[0], pb[1] - h * u)], fill=(140, 98, 60), width=max(1, int(0.07 * u)))
                d.line([pa, (pa[0], pa[1] - 0.55 * u)], fill=(96, 64, 40), width=max(2, int(0.09 * u)))
            self.objs.append((max(pa[1], pb[1]), fn))

    def steg(self, x, y, nx, ny, lang=1.3, s=1.0):
        a, b = self.p(x - nx * lang / 2, y - ny * lang / 2), self.p(x + nx * lang / 2, y + ny * lang / 2)
        sy = max(a[1], b[1])

        def fn(d):
            d.line([a, b], fill=(150, 104, 62), width=max(3, int(0.42 * self.U * s)))
            d.line([(a[0], a[1] - 0.18 * self.U), (b[0], b[1] - 0.18 * self.U)], fill=(110, 74, 44), width=max(1, int(0.06 * self.U)))
        self.objs.append((sy + 2, fn))

    def wasserfall(self, x, y, s=1.0):
        """Felswand mit Wasserfall (Platzhalter für Gemini-Bild): 5 × 3 Kacheln, ~3,5 hoch."""
        sx, sy = self.p(x, y)
        u = self.U * s

        def fn(d):
            d.polygon([(sx - 2.6 * u, sy), (sx - 2.2 * u, sy - 2.6 * u), (sx - 0.8 * u, sy - 3.6 * u), (sx + 0.9 * u, sy - 3.3 * u),
                       (sx + 2.4 * u, sy - 2.4 * u), (sx + 2.7 * u, sy)], fill=(132, 132, 140), outline=(90, 92, 100))
            d.polygon([(sx - 2.2 * u, sy - 2.6 * u), (sx - 0.8 * u, sy - 3.6 * u), (sx + 0.9 * u, sy - 3.3 * u), (sx + 2.4 * u, sy - 2.4 * u),
                       (sx + 1.2 * u, sy - 2.7 * u), (sx - 1.0 * u, sy - 2.9 * u)], fill=SCHNEE)
            d.rectangle([sx - 0.3 * u, sy - 3.1 * u, sx + 0.3 * u, sy - 0.2 * u], fill=(120, 196, 236))
            d.ellipse([sx - 0.9 * u, sy - 0.5 * u, sx + 0.9 * u, sy + 0.3 * u], fill=WASSER)
        self.objs.append((sy, fn))

    def see(self, ring):
        """Großer See: Schneeufer, Eisrand (Eisfischen), offenes Wasser in der Mitte."""
        self.flaeche(ring(1.10), SCHNEE)
        self.flaeche(ring(1.0), (198, 226, 244), outline=(120, 160, 200), width=2)
        self.flaeche(ring(0.84), (52, 136, 196))

    def felswand(self, line, h=1.5, seed=1):
        """Verschneite Felswand entlang einer Linie (Fußpunkte), zur Kamera hin offen."""
        rng = np.random.default_rng(seed)
        u = self.U
        for a, b in zip(line[:-1], line[1:]):
            pa, pb = self.p(*a), self.p(*b)
            ha, hb = h * u * rng.uniform(0.8, 1.2), h * u * rng.uniform(0.8, 1.2)
            tone = int(rng.uniform(118, 158))

            def fn(d, pa=pa, pb=pb, ha=ha, hb=hb, tone=tone):
                d.polygon([pa, pb, (pb[0], pb[1] - hb), (pa[0], pa[1] - ha)], fill=(tone, tone - 2, tone + 6))
                d.line([(pa[0], pa[1] - ha * 0.45), (pb[0], pb[1] - hb * 0.5)], fill=(tone - 30, tone - 30, tone - 22), width=max(1, int(0.05 * u)))
                d.polygon([(pa[0], pa[1] - ha), (pb[0], pb[1] - hb), (pb[0], pb[1] - hb * 0.82), (pa[0], pa[1] - ha * 0.8)], fill=SCHNEE)
            self.objs.append((max(pa[1], pb[1]) - 0.5, fn))

    def text(self, x, y, t):
        sx, sy = self.p(x, y)
        self.objs.append((1e9, lambda d: (d.rectangle([sx - 4, sy - 2, sx + 9 * len(t) + 4, sy + 20], fill=(255, 255, 255, 210)),
                                          d.text((sx, sy), t, fill=(20, 20, 20), font=FONT))))

    def bild(self):
        for _, fn in sorted(self.objs, key=lambda t: t[0]):
            fn(self.d)
        return self.img


try:
    FONT = ImageFont.truetype('arial.ttf', 17)
except OSError:
    FONT = ImageFont.load_default()


# ---------------------------------------------------------------- Streu-Helfer
def streu(cam, dichte, dmin, seed, pad=4):
    """Blaue-Rauschen-Punkte im Bildausschnitt; dichte(x, y) -> 0..1 entscheidet je Punkt."""
    rng = np.random.default_rng(seed)
    gx, gy = cam.grid()
    lo_x, hi_x, lo_y, hi_y = gx.min() - pad, gx.max() + pad, gy.min() - pad, gy.max() + pad
    n = int(min((hi_x - lo_x) * (hi_y - lo_y) * 4, 50000))
    xs, ys = rng.uniform(lo_x, hi_x, n), rng.uniform(lo_y, hi_y, n)
    keep = rng.uniform(0, 1, n) < dichte(xs, ys)
    out, cell = [], {}
    for x, y in zip(xs[keep], ys[keep]):
        if not K.in_view(cam, x, y):
            continue
        k = (int(x // dmin), int(y // dmin))
        if any((q[0] - x) ** 2 + (q[1] - y) ** 2 < dmin * dmin
               for dx in (-1, 0, 1) for dy in (-1, 0, 1) for q in cell.get((k[0] + dx, k[1] + dy), ())):
            continue
        cell.setdefault(k, []).append((x, y))
        out.append((x, y))
    return out


def tongues(x, y):
    return np.array([K.tongue(a, b) for a, b in zip(np.atleast_1d(x), np.atleast_1d(y))])


# ---------------------------------------------------------------- Runde 2: Seiten-Aufteilung (Hannes 25.11.: SB, Teich eingebettet, mehr Abwechslung je Seite)
def oval(c, a, b, seed=0):
    """Ring-Funktion k -> Randpunkte eines unregelmäßigen Ovals (Raster)."""
    ph = np.linspace(0, 2 * np.pi, 260, endpoint=False)
    w = 1 + 0.08 * np.sin(3 * ph + 1.1 + seed) + 0.05 * np.sin(5 * ph + 0.3) + 0.03 * np.sin(9 * ph + 2 + seed)
    return lambda k: np.asarray(c) + np.stack([a * np.cos(ph), b * np.sin(ph)], -1) * (w * k)[:, None]


def rho_oval(x, y, c, a, b):
    return np.hypot((np.asarray(x) - c[0]) / a, (np.asarray(y) - c[1]) / b)


def kante(f, seite, lo, hi, achse=0, step=0.6):
    """Punkte auf der Linie ffield = f an einer Seite, begrenzt über eine Achse (0 = gx, 1 = gy)."""
    c = K.level_curve(f, 2400)
    sd = np.array([str(K.side_of(x, y)) for x, y in c])
    c = c[(sd == seite) & (c[:, achse] > lo) & (c[:, achse] < hi)]
    c = c[np.argsort(c[:, achse])]
    return linie(c[::6], 2, step) if len(c) > 3 else c


LAYOUT = {
    'L1': dict(titel='1  Alpental (nach Karten-Konzept)',
               wand=[('R', -2.6, -9.0, 13.0, 0)], fall=[(3.5, -19.2)], see=((28.5, -15.5), 7.0, 6.5),
               baeche=[[(3.5, -18.6), (7.0, -17.4), (11.0, -18.6), (15.0, -17.2), (19.0, -16.0), (21.8, -15.2)],
                       [(26.0, -9.0), (26.2, -5.0), (24.6, -0.5), (26.8, 4.2), (27.6, 9.8), (31.5, 9.6), (37.5, 5.2), (47.0, 0.0)]],
               text=[(-21.0, -6.0, 'Mischwald, Lichtungen'), (8.0, -24.5, 'Felswand + Wasserfall'), (25.0, -17.0, 'Sternsee'), (27.5, 0.0, 'Uferzone mit Teich')]),
    'L2': dict(titel='2  Wie Hay Day: See oben links, Felswand oben rechts',
               wand=[('R', -2.6, -9.0, 15.0, 0)], fall=[(3.5, -19.2)], see=((-27.5, -5.0), 9.0, 11.5), boot=True,
               baeche=[[(3.5, -18.6), (8.0, -17.2), (13.0, -18.8), (18.5, -16.5), (22.3, -12.6), (23.0, -7.5), (24.4, -2.5),
                        (26.0, 2.0), (26.8, 7.0), (27.5, 11.0), (32.0, 9.5), (38.0, 5.0), (47.0, 0.0)]],
               text=[(-23.0, -2.0, 'Bergsee mit Steg'), (8.0, -24.5, 'Felswand + Wasserfall'), (27.5, 0.0, 'Uferzone mit Teich')]),
    'L3': dict(titel='3  Mutig: Felskessel ringsum hinten',
               wand=[('R', -2.2, -12.0, 16.0, 0), ('L', -2.2, -12.0, 14.0, 1)], fall=[(3.5, -18.8), (-18.8, -1.0)],
               see=((-23.0, 9.5), 4.0, 3.2),
               baeche=[[(3.5, -18.2), (8.0, -17.0), (13.0, -18.4), (18.5, -16.0), (22.3, -12.6), (23.0, -7.5), (24.4, -2.5),
                        (26.0, 2.0), (26.8, 7.0), (27.5, 11.0), (32.0, 9.5), (38.0, 5.0), (47.0, 0.0)],
                       [(-18.4, -0.6), (-17.6, 3.0), (-19.2, 6.5), (-20.0, 8.0)]],
               text=[(5.0, -24.0, 'Felswand rundum'), (-26.0, 11.0, 'Bergteich'), (27.5, 0.0, 'Uferzone mit Teich')]),
}
# Runde 3 (Hannes 25.11.: L2 gewählt; Teich in den Bachknick? Teich nötig? normale Bäume reichen?)
_KNICK = [(3.5, -18.6), (8.0, -17.2), (13.0, -18.8), (18.5, -16.5), (22.3, -12.6), (23.0, -7.5), (24.4, -2.5),
          (25.6, 2.0), (25.2, 7.0), (26.6, 11.4), (30.2, 12.0), (33.2, 8.8), (33.6, 4.2), (37.0, 1.0), (47.0, -2.5)]
_L2 = {k: v for k, v in LAYOUT['L2'].items() if k not in ('titel', 'text')}
LAYOUT['L2A'] = dict(_L2, titel='2A  Teich im Bachknick', baeche=[_KNICK], teich=(29.6, 7.4), bucht=False, steg_bei=(25.5, 4.6),
                     text=[(-23.0, -2.0, 'Bergsee mit Steg'), (8.0, -24.5, 'Felswand + Wasserfall'), (30.0, 2.5, 'Teich im Bachknick')])
LAYOUT['L2B'] = dict(_L2, titel='2B  Ohne Teich, Eisloch am Bergsee', teich=None, eisloch_see=True,
                     text=[(-23.0, -2.0, 'Bergsee: Eisrand mit Eisloch'), (8.0, -24.5, 'Felswand + Wasserfall'), (27.5, 0.0, 'Uferzone')])
LAYOUT['L2C'] = dict(LAYOUT['L2A'], titel='2C  Wie 2A, nur Tannen (Birken nur am Wasser)', nur_tannen=True,
                     text=[(-23.0, -2.0, 'Bergsee mit Steg'), (30.0, 2.5, 'Teich im Bachknick'), (-14.0, 22.0, 'nur Tannen')])
# Runde 4 (Hannes 25.11.: L2C super; vorn links Rentier-Koppel, links Mitte Lichtung mit Felsen)
LAYOUT['L2D'] = dict(LAYOUT['L2C'], titel='2D  Wie 2C + Koppel mit Rentieren vorn links, Lichtung links',
                     koppel=((2.0, 29.5), 3.0, 4.2, 3), lichtung=((-21.0, 15.0), 2.8, 2.6),
                     text=[(-23.0, -2.0, 'Bergsee mit Steg'), (30.0, 2.5, 'Teich im Bachknick'), (-2.5, 35.0, 'Rentier-Koppel'),
                           (-26.0, 12.5, 'Lichtung')])
LAYOUT['L2E'] = dict(LAYOUT['L2C'], titel='2E  Mutig: große Rentierweide bis an die Wiese, Felslichtung',
                     koppel=((-0.4, 28.0), 4.8, 6.0, 6), unterstand=True, lichtung=((-21.0, 15.0), 3.8, 3.4), lichtung_hoch=True,
                     text=[(-23.0, -2.0, 'Bergsee mit Steg'), (30.0, 2.5, 'Teich im Bachknick'), (-5.0, 35.5, 'Rentierweide'),
                           (-27.0, 11.5, 'Felslichtung')])
TEICH2 = (21.8, 6.8)


def layout(key, cam):
    L = LAYOUT[key]
    S = Skizze(cam, buchten=[(20.6, 7.0, 2.4, 2.4)] if L.get('bucht', True) else [])
    rng = np.random.default_rng(11)
    tp = L.get('teich', TEICH2)
    tp = None if tp is None else np.array(tp)
    sc, sa, sb = L['see']
    laeufe = [linie(c) for c in L['baeche']]
    alle = np.vstack(laeufe)
    waende = [kante(f, sd, lo, hi, ax) for sd, f, lo, hi, ax in L['wand']]
    wpts = np.vstack(waende)
    side = lambda x, y: np.array([str(K.side_of(a, b)) for a, b in zip(np.atleast_1d(x), np.atleast_1d(y))])  # noqa: E731

    def f(x, y):
        return wiese(np.atleast_1d(x), np.atleast_1d(y), S.buchten)

    def d_bach(x, y):
        return abstand(np.stack([np.atleast_1d(x), np.atleast_1d(y)], -1), alle)

    def d_wand(x, y):
        return abstand(np.stack([np.atleast_1d(x), np.atleast_1d(y)], -1), wpts)

    def vor_wand(x, y):                      # zwischen Wiese und Wand keine Bäume (Wand bleibt sichtbar)
        return (d_wand(x, y) < 1.3) & (f(x, y) > -2.9)

    def d_teich(x, y):
        if tp is None:
            return np.full(np.atleast_1d(x).shape, 99.0)
        return teich_rho(np.stack([np.atleast_1d(x), np.atleast_1d(y)], -1), tp)

    def r_see(x, y):
        return rho_oval(np.atleast_1d(x), np.atleast_1d(y), sc, sa, sb)

    def rechts(x, y):
        return (np.atleast_1d(x) > 12) & np.isin(side(x, y), ['VR', 'R'])

    weg = linie([tuple(q) for q in K.WEG], 2)
    kp, lp = L.get('koppel'), L.get('lichtung')

    def frei(x, y):                          # Weg, Koppel, Lichtung baumfrei
        x, y = np.atleast_1d(x), np.atleast_1d(y)
        m = (abstand(np.stack([x, y], -1), weg) < 2.1) if kp else np.zeros(x.shape, bool)
        if kp:
            m |= rho_oval(x, y, kp[0], kp[1], kp[2]) < 1.2
        if lp:
            m |= rho_oval(x, y, lp[0], lp[1], lp[2]) < 1.0
        return m

    if kp:                                   # Koppel: festgetretener Schnee, Zaun mit Tor zum Weg
        S.flaeche(oval(kp[0], kp[1], kp[2], 3)(1.0), (226, 230, 222), outline=(200, 204, 196))
    if lp:
        S.flaeche(oval(lp[0], lp[1], lp[2], 5)(1.0), (246, 247, 244))
    S.pfad(K.WEG, (226, 196, 146))
    S.see(oval(sc, sa, sb, 1))
    if L.get('boot'):
        S.steg(sc[0] + sa * 0.62, sc[1] + sb * 0.5, 0.6, 0.8, lang=3.0)
    if L.get('eisloch_see'):                 # Eisfischen am Bergsee statt eigenem Teich
        e = np.array(sc) + np.array([sa * 0.6, sb * 0.62])
        S.flaeche(teich_rand(e, a=1.1, b=0.9, k=0.5), (40, 110, 150))
    for lf in laeufe:
        S.bach(lf)
    if tp is not None:
        S.teich(tp)
    for w in waende:
        S.felswand(w, h=1.7 if key == 'L3' else 1.5, seed=len(w))
    for x, y in L['fall']:
        S.wasserfall(x, y, 0.8)

    def dichte(x, y):
        ff, db, dt, rs = f(x, y), d_bach(x, y), d_teich(x, y), r_see(x, y)
        dense = np.where(ff < -0.3, 0.95, np.where((ff < 1.6) & tongues(x, y), 0.85, 0.0))
        loose = np.where(db < 2.2, 0.0, np.where(ff < -6.5, 0.95, np.where(ff < -3.0, 0.35, 0.0)))
        p = np.where(rechts(x, y), loose, dense)
        p = np.where(side(x, y) == 'VL', np.where(ff < -0.8, 0.55, 0), p)
        lich = (np.sin(0.31 * x + 0.2 * y + 0.5) + np.sin(0.23 * y - 0.37 * x + 2.0)) > 1.45     # Lichtungen
        p = np.where(lich & (ff < -2.0), 0.08, p)
        return np.where((db < 0.8) | (dt < 1.6) | (rs < 1.25) | vor_wand(x, y) | frei(x, y), 0, p)
    for x, y in streu(cam, dichte, 0.9, 5):
        v = np.sin(0.35 * x + 0.21 * y) + np.sin(0.27 * y - 0.41 * x + 1.0)
        ff = float(f(x, y)[0])
        if L.get('nur_tannen'):
            nass = min(float(d_bach(x, y)[0]), float(d_teich(x, y)[0]) * 2.2, (float(r_see(x, y)[0]) - 1) * sa)
            S.birke(x, y) if nass < 2.4 and rng.uniform() < 0.6 else S.tanne(x, y, rng.uniform(0.85, 1.2))
        elif rechts(x, y)[0] and ff > -6.5:
            S.birke(x, y) if rng.uniform() < 0.6 else S.laub(x, y)
        elif v > 0.9:
            S.birke(x, y, rng.uniform(0.9, 1.1))
        elif v < -1.0:
            S.laub(x, y, rng.uniform(0.9, 1.15))
        else:
            S.tanne(x, y, rng.uniform(0.85, 1.2))
    ufer = streu(cam, lambda x, y: np.where(((d_bach(x, y) < 1.6) & (d_bach(x, y) > 0.75) & (np.atleast_1d(x) > 0))
                                             | ((r_see(x, y) > 1.12) & (r_see(x, y) < 1.3)), 0.5, 0.0), 1.1, 9)
    for x, y in ufer:
        r = rng.uniform()
        S.schilf(x, y) if r < 0.35 else (S.fels(x, y, rng.uniform(0.6, 1.1)) if r < 0.75 else S.busch(x, y))
    zone = streu(cam, lambda x, y: np.where(rechts(x, y) & (f(x, y) < -0.2) & (f(x, y) > -2.8) & (d_bach(x, y) > 1.6)
                                            & (d_teich(x, y) > 1.5) & (r_see(x, y) > 1.3), 0.35, 0.0), 1.4, 11)
    for x, y in zone:
        r = rng.uniform()
        S.busch(x, y) if r < 0.4 else (S.fels(x, y, 0.8) if r < 0.7 else (S.stamm(x, y) if r < 0.85 else S.birke(x, y)))
    for x, y in wpts[::5]:                   # Felsbrocken am Wandfuß
        if rng.uniform() < 0.5:
            S.fels(x + rng.uniform(0.3, 0.9), y + rng.uniform(0.3, 0.9), rng.uniform(0.8, 1.3))
    # Teich eingebettet: Schilfgürtel, Felsen dahinter, Birken – verbindet Teich mit Uferzone und Bach
    if tp is not None:
        ring = teich_rand(tp, k=1.12, n=360)
        for ph in np.linspace(0.3, 5.9, 12):
            if rng.uniform() < 0.75:
                S.schilf(*ring[int(ph / (2 * np.pi) * 360)])
        for ph, k, s in ((5.6, 1.35, 1.6), (0.2, 1.4, 1.3), (5.0, 1.45, 1.0)):
            S.fels(*teich_rand(tp, k=k, n=360)[int(ph / (2 * np.pi) * 360)], s)
        for ph, k in ((4.6, 1.7), (5.3, 1.95), (0.6, 1.8)):
            S.birke(*teich_rand(tp, k=k, n=360)[int(ph / (2 * np.pi) * 360)])
    lf = laeufe[-1] if key == 'L1' else laeufe[0]
    sb_x, sb_y = L.get('steg_bei', (26.8, 3.6))
    i = int(np.argmin(np.hypot(lf[:, 0] - sb_x, lf[:, 1] - sb_y)))
    t = lf[i + 1] - lf[i - 1]
    ln = np.hypot(t[0], t[1])
    if 'steg_bei' in L:                      # Trampelpfad Wiese -> Steg -> Teich im Knick
        S.pfad(linie([(22.6, 4.0), (24.0, 4.4), tuple(lf[i]), (27.0, 5.6), (28.0, 6.4)], 3), (206, 216, 230))
    else:
        S.pfad(linie([(23.6, 5.4), (25.0, 4.4), tuple(lf[i]), (29.5, 2.5), (32.0, 1.6)], 3), (206, 216, 230))
    S.steg(*lf[i], -t[1] / ln, t[0] / ln)
    if kp:
        ring = oval(kp[0], kp[1], kp[2], 3)(1.0)[::5]
        wx = float(weg[int(np.argmin(np.abs(weg[:, 1] - kp[0][1]))), 0])
        tor = int(np.argmin(np.hypot(ring[:, 0] - wx, ring[:, 1] - kp[0][1])))
        S.zaun(ring, (tor - 1, tor + 1))
        S.pfad(linie([tuple(ring[tor]), (wx, kp[0][1] + 0.3)], 2), (206, 216, 230))
        for i in range(kp[3]):
            ph = rng.uniform(0, 2 * np.pi)
            r = rng.uniform(0.15, 0.65)
            S.rentier(kp[0][0] + kp[1] * r * np.cos(ph), kp[0][1] + kp[2] * r * np.sin(ph), 1.0, rng.uniform() < 0.5)
        S.heu(kp[0][0] - kp[1] * 0.35, kp[0][1] - kp[2] * 0.45)
        if L.get('unterstand'):              # offener Unterstand an der Rückseite (Platzhalter)
            ux, uy = kp[0][0] - kp[1] * 0.75, kp[0][1] + kp[2] * 0.1
            S.flaeche([(ux - 0.9, uy - 1.2), (ux + 0.9, uy - 1.2), (ux + 0.9, uy + 1.2), (ux - 0.9, uy + 1.2)], (120, 84, 52), outline=(80, 56, 36))
        for t in np.arange(12.5, 46.0, 0.75):  # Hecke auf der anderen Wegseite
            j = int(np.argmin(np.abs(weg[:, 1] - t)))
            if rng.uniform() < 0.85 and f(weg[j, 0] + 1.25, t)[0] < -0.6:
                S.busch(weg[j, 0] + 1.25 + rng.uniform(-0.15, 0.15), t, rng.uniform(0.9, 1.15))
    if lp:
        c, a, b = lp
        for ph, r, s in ((0.4, 0.55, 1.6), (1.1, 0.35, 1.1), (2.6, 0.6, 1.3), (4.0, 0.45, 0.9), (5.2, 0.7, 1.2)):
            S.fels(c[0] + a * r * np.cos(ph), c[1] + b * r * np.sin(ph), s * (1.5 if L.get('lichtung_hoch') else 1.0))
        S.stamm(c[0] - a * 0.1, c[1] + b * 0.55)
        S.stamm(c[0] + a * 0.5, c[1] - b * 0.2)
        if L.get('lichtung_hoch'):
            S.tier(c[0] + 0.4, c[1] + 0.2, 1.2)
    S.tier(24.8, -2.5)
    S.tier(-19.0, -9.5)
    for x, y, tx in L['text']:
        S.text(x, y, tx)
    return S.bild()


# ---------------------------------------------------------------- Konzepte
QUELLE = (-2.5, -21.0)                      # Wasserfall oben (später Gemini-Bild)
TEICH = (20.4, 7.2)                         # ganz außerhalb des Tals (Rand ≥ 17)


def bach_lauf(art):
    if art == 'r9':
        return K.LAUF
    if art == 'wald':                      # schlängelt sich 3–5 Kacheln hinter der Waldkante durch den Wald
        c = [QUELLE, (1.5, -23.0), (5.0, -21.5), (8.5, -23.5), (12.5, -23.0), (17.0, -19.5), (22.5, -15.5),
             (23.5, -9.0), (26.5, -4.5), (25.5, 1.0), (27.6, 6.0), (27.8, 10.8), (32.0, 9.5), (37.0, 5.0), (47.0, 0.0)]
    elif art == 'ufer':                    # nah an der Wiese, ruhige Bögen
        c = [QUELLE, (1.5, -22.5), (5.5, -21.0), (10.0, -21.0), (16.0, -18.5), (21.0, -14.0), (22.5, -8.5),
             (23.5, -3.0), (26.0, 2.0), (26.8, 7.0), (27.5, 11.0), (32.0, 9.5), (38.0, 5.0), (47.0, 0.0)]
    else:                                  # 'fels': geradere Abschnitte mit Stufen zwischen Felsen
        c = [QUELLE, (1.5, -23.0), (5.5, -22.5), (9.5, -23.5), (14.5, -20.5), (20.0, -17.0), (23.0, -11.0),
             (24.0, -5.0), (26.5, 0.5), (27.0, 6.5), (28.5, 11.0), (33.0, 9.0), (39.0, 5.0), (47.0, 0.0)]
    return linie(c)


def konzept(key, cam):
    if key in LAYOUT:
        return layout(key, cam)
    tp = np.array(TEICH)
    if key == 'S0':                                                    # heute (R9) zum Vergleich
        S = Skizze(cam)
        lauf, tp = bach_lauf('r9'), K.PC
    elif key == 'SA':
        S = Skizze(cam, buchten=[(21.6, 7.3, 4.6, 3.0)])
        lauf = bach_lauf('wald')
    elif key == 'SB':
        S = Skizze(cam, buchten=[(21.6, 7.3, 4.6, 3.0)])
        lauf = bach_lauf('ufer')
    else:
        S = Skizze(cam, buchten=[(21.6, 7.3, 4.6, 3.0)])
        lauf = bach_lauf('fels')
    side = lambda x, y: np.array([str(K.side_of(a, b)) for a, b in zip(np.atleast_1d(x), np.atleast_1d(y))])  # noqa: E731

    def f(x, y):
        return wiese(np.atleast_1d(x), np.atleast_1d(y), S.buchten)

    def d_bach(x, y):
        return abstand(np.stack([np.atleast_1d(x), np.atleast_1d(y)], -1), lauf)

    def d_teich(x, y):
        return teich_rho(np.stack([np.atleast_1d(x), np.atleast_1d(y)], -1), tp)

    zaun_vl = lambda x, y: side(x, y) == 'VL'                          # noqa: E731
    rng = np.random.default_rng(7)

    # Wasser + Weg zuerst (Fläche)
    S.pfad(K.WEG, (226, 196, 146))
    S.bach(lauf)
    S.teich(tp)
    if key != 'S0':
        S.wasserfall(*QUELLE)

    if key == 'S0':
        def dichte(x, y):
            ff = f(x, y)
            band = (ff < -0.15) & (ff > -3.6)
            p = np.where(band, 0.9, np.where(ff <= -3.6, 0.12, 0.0))
            p = np.where(zaun_vl(x, y), np.where(ff < -0.8, 0.4, 0), p)
            p = np.where(side(x, y) == 'VR', np.where(ff < -3.6, 0.75, 0.0), p)
            p = np.where(d_bach(x, y) < 1.25, 0, p)
            p = np.where(d_teich(x, y) < 1.7, 0, p)
            return p
        for x, y in streu(cam, dichte, 0.95, 5):
            S.tanne(x, y, rng.uniform(0.85, 1.15))

    elif key == 'SA':
        # Wald ist überall der Rand; Wasser liegt IM Wald: Bäume bis ans Ufer, Lichtung um den Teich,
        # kleine Schneelichtungen an Bachbiegungen, Birken/Laubbäume am Wasser, Felsen an den Biegungen.
        licht = [(24.5, -6.0, 1.8), (27.0, 2.6, 1.3), (12.0, -21.0, 1.7), (30.5, 7.0, 1.5)]

        def dichte(x, y):
            ff, db, dt = f(x, y), d_bach(x, y), d_teich(x, y)
            p = np.where(ff < -0.3, 0.95, np.where((ff < 1.6) & tongues(x, y), 0.85, 0.0))
            p = np.where(zaun_vl(x, y), np.where(ff < -0.8, 0.5, 0), p)
            for a, b, r in licht:
                p = np.where((x - a) ** 2 + (y - b) ** 2 < r * r, 0, p)
            p = np.where(db < 0.75, 0, p)
            p = np.where(dt < 1.35, 0, p)
            return p
        for x, y in streu(cam, dichte, 0.9, 5):
            db = float(d_bach(x, y)[0])
            dt = float(d_teich(x, y)[0])
            r = rng.uniform()
            if (db < 1.8 or dt < 2.2) and r < 0.45:
                S.birke(x, y, rng.uniform(0.85, 1.1))
            elif r < 0.12:
                S.laub(x, y)
            else:
                S.tanne(x, y, rng.uniform(0.85, 1.2))
        for k in range(0, len(lauf), 28):
            x, y = lauf[k]
            if rng.uniform() < 0.5:
                S.fels(x + rng.uniform(-0.9, 0.9), y + rng.uniform(-0.9, 0.9), rng.uniform(0.6, 1.0))
        for ph in (3.3, 4.2, 2.3):
            x, y = teich_rand(tp, k=1.12, n=360)[int(ph / (2 * np.pi) * 360)]
            S.schilf(x, y)
        S.tier(26.8, 2.4)
        S.stamm(24.0, -6.5)
        S.text(24.5, -9.5, 'Bach im Wald')
        S.text(25.5, 4.0, 'Teich in Lichtung')

    elif key == 'SB':
        # Uferzone: Wiese -> Büsche/Schilf/Felsen/einzelne Birken -> Bach -> lockere Bäume -> dichter Wald.
        def dichte(x, y):
            ff, db, dt = f(x, y), d_bach(x, y), d_teich(x, y)
            vr = np.isin(side(x, y), ['VR', 'R']) & (x > 8)
            dense = np.where(ff < -0.3, 0.95, np.where((ff < 1.6) & tongues(x, y), 0.85, 0.0))
            loose = np.where(db < 2.2, 0.0, np.where(ff < -6.5, 0.95, np.where(ff < -3.0, 0.35, 0.0)))
            p = np.where(vr, loose, dense)
            p = np.where(zaun_vl(x, y), np.where(ff < -0.8, 0.5, 0), p)
            p = np.where(db < 0.8, 0, p)
            p = np.where(dt < 1.5, 0, p)
            return p
        for x, y in streu(cam, dichte, 0.9, 5):
            ff = float(f(x, y)[0])
            if ff > -6.5 and x > 8 and rng.uniform() < 0.5:
                S.birke(x, y) if rng.uniform() < 0.6 else S.laub(x, y)
            else:
                S.tanne(x, y, rng.uniform(0.85, 1.2))
        ufer = streu(cam, lambda x, y: np.where((d_bach(x, y) < 1.6) & (d_bach(x, y) > 0.75) & (x > 8), 0.5, 0.0), 1.1, 9)
        for x, y in ufer:
            r = rng.uniform()
            S.schilf(x, y) if r < 0.4 else (S.fels(x, y, rng.uniform(0.5, 0.9)) if r < 0.75 else S.busch(x, y))
        zone = streu(cam, lambda x, y: np.where((f(x, y) < -0.2) & (f(x, y) > -2.8) & (x > 10) & (d_bach(x, y) > 1.6) & (d_teich(x, y) > 1.4), 0.35, 0.0), 1.4, 11)
        for x, y in zone:
            r = rng.uniform()
            S.busch(x, y) if r < 0.45 else (S.fels(x, y, 0.7) if r < 0.7 else (S.stamm(x, y) if r < 0.85 else S.birke(x, y)))
        for ph in np.linspace(1.6, 4.8, 7):
            x, y = teich_rand(tp, k=1.12, n=360)[int(ph / (2 * np.pi) * 360)]
            S.schilf(x, y)
        S.tier(23.5, -1.0)
        S.text(23.0, -9.5, 'Uferzone, Wald weiter hinten')

    else:
        # Felsental: Felsrücken begleiten den Bach (Ufer aus Felsen, kleine Stufen), Tannen auf den Felsen,
        # Teich hinten von großen Felsen eingerahmt. Gleiche Felsen/Bäume wie Gemini-Auftrag.
        def dichte(x, y):
            ff, db, dt = f(x, y), d_bach(x, y), d_teich(x, y)
            p = np.where(ff < -0.3, 0.95, np.where((ff < 1.6) & tongues(x, y), 0.85, 0.0))
            p = np.where(zaun_vl(x, y), np.where(ff < -0.8, 0.5, 0), p)
            p = np.where(db < 1.6, 0, p)
            p = np.where(dt < 1.7, 0, p)
            return p
        for x, y in streu(cam, dichte, 0.92, 5):
            S.tanne(x, y, rng.uniform(0.85, 1.25)) if rng.uniform() > 0.12 else S.laub(x, y)
        for k in range(0, len(lauf), 7):
            x, y = lauf[k]
            if k < 25:
                continue
            for sgn in (-1, 1):
                if rng.uniform() < 0.75:
                    t = lauf[min(k + 1, len(lauf) - 1)] - lauf[max(k - 1, 0)]
                    nx, ny = -t[1], t[0]
                    ln = np.hypot(nx, ny) + 1e-9
                    o = sgn * rng.uniform(0.8, 1.2)
                    S.fels(x + nx / ln * o, y + ny / ln * o, rng.uniform(0.8, 1.4))
        for ph in np.linspace(4.0, 6.6, 6):                              # Felsen hinter dem Teich
            x, y = teich_rand(tp, k=1.35, n=360)[int((ph % (2 * np.pi)) / (2 * np.pi) * 360)]
            S.fels(x, y, rng.uniform(1.3, 1.9))
        S.text(23.0, -9.5, 'Bach im Felsental')

    if key != 'S0':                                                     # Steg mit Trampelpfad (mutig)
        i = int(np.argmin(np.hypot(lauf[:, 0] - 26.6, lauf[:, 1] - 3.0)))
        t = lauf[i + 1] - lauf[i - 1]
        nx, ny = -t[1], t[0]
        ln = np.hypot(nx, ny)
        S.pfad(linie([(23.2, 5.2), (24.8, 4.0), tuple(lauf[i]), (29.0, 1.8), (31.5, 1.2)], 3), (206, 216, 230))
        S.steg(*lauf[i], nx / ln, ny / ln)
    return S.bild()


TITEL = {**{k: v['titel'] for k, v in LAYOUT.items()},
         'S0': 'Heute (R9): Baumstreifen, davor Wasser',
         'SA': 'A  Waldbach: Wasser liegt im Wald',
         'SB': 'B  Uferzone: weicher Übergang Wiese → Wasser → Wald',
         'SC': 'C  Felsental (mutig): Bach zwischen Felsen'}
WEIT = K.WEIT
RECHTS = K.Cam(19.0, -2.5, 64)
LINKS = K.Cam(-8.0, 20.0, 64)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for key in TITEL:
        if ONLY and key not in ONLY:
            continue
        for nm, cam in (('weit', WEIT), ('rechts', RECHTS)) + ((('links', LINKS),) if key in ('L2C', 'L2D', 'L2E') else ()):
            im = konzept(key, cam)
            ImageDraw.Draw(im).text((14, 10), TITEL[key], fill=(10, 10, 10), font=ImageFont.truetype('arialbd.ttf', 26) if FONT else None)
            im.save(OUT / f'{key}_{nm}.jpg', quality=86)
        print(key, flush=True)
