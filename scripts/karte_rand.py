"""Karte Runde 6 (Entscheidung 31): ganzes Tal Hay-Day-Wiese, weiche Spielfeldform, Kartenende durch DINGE.

Vorbild Hay Day (Wiki „Farm Expansions“, Spielervideos): Erweiterungsland mit niedrigen Trockenmauern,
Hecken, Holz-/Lattenzäunen, Feldwegen; Kartenende dichter Baumrand. Clash nur Technik (Schneeschollen mit Kante).
Nur Karte: Boden + Grenze, keine Gebäude.

Je Variante: nah (≈ 11 Kacheln breit, am Rand) und ganz raus (ganzes Tal + Kulissenstreifen, Handy quer).
Aufruf: python scripts/karte_rand.py <ausgabeordner> [K1,K2,...]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1])
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
sys.argv = [sys.argv[0], str(OUT)]
sys.path.insert(0, str(ROOT / 'scripts'))
import boden_mutig as BM  # noqa: E402
import boden_gras as G  # noqa: E402
import boden_erzeugen as B  # noqa: E402

W, H = 1600, 740                     # Handy quer (≈ 2,16 : 1)
for _m in (BM, G):
    _m.W, _m.H = W, H
SS = 2                               # Objekte doppelt aufgelöst malen
LO, HI = -13.0, 17.0                 # Tal in Rasterkoordinaten (30 × 30)
C0 = np.array([2.0, 2.0])            # Talmitte


# ---------------------------------------------------------------- Kamera
class Cam:
    def __init__(self, cx, cy, tw):
        self.cx, self.cy, self.tw = cx, cy, tw
        self.z = tw / 116.0

    def proj(self, gx, gy):
        gx, gy = np.asarray(gx, float) - self.cx, np.asarray(gy, float) - self.cy
        return W / 2 + (gx - gy) * self.tw / 2, H / 2 + (gx + gy) * self.tw / 4

    def grid(self):
        ys, xs = np.mgrid[0:H, 0:W].astype(float)
        a, b = (xs - W / 2) / (self.tw / 2), (ys - H / 2) / (self.tw / 4)
        return self.cx + (a + b) / 2, self.cy + (b - a) / 2

    def vec(self, dx, dy):
        return (dx - dy) * self.tw / 2, (dx + dy) * self.tw / 4


# ---------------------------------------------------------------- Spielfeldform
def dist_sq(gx, gy):
    """Abstand außerhalb des Tal-Quadrats (0 innen), Ecken dadurch rund."""
    dx = np.maximum(np.maximum(LO - gx, gx - HI), 0)
    dy = np.maximum(np.maximum(LO - gy, gy - HI), 0)
    return np.hypot(dx, dy)


_rng = np.random.default_rng(15)
_K = np.arange(2, 10)
_A = _rng.uniform(0.6, 1.0, len(_K)) / _K ** 1.1
_P = _rng.uniform(0, 2 * np.pi, len(_K))
_t = np.linspace(0, 2 * np.pi, 4000)
_n = (_A[None] * np.cos(_K[None] * _t[:, None] + _P[None])).sum(1)
_N0, _N1 = _n.min(), _n.max()


def border(theta):
    """Wie weit die Wiese über das Tal hinausreicht (Kacheln), in großen weichen Buchten: 0,6 … 5,2."""
    n = (_A * np.cos(_K * np.asarray(theta)[..., None] + _P)).sum(-1)
    return 0.6 + 4.6 * (n - _N0) / (_N1 - _N0)


def ffield(gx, gy):
    """> 0 Wiese, < 0 außerhalb (Kacheln bis zum Kartenende)."""
    th = np.arctan2(gy - C0[1], gx - C0[0])
    return border(th) - dist_sq(gx, gy)


def side_of(gx, gy):
    """L = links hinten, R = rechts hinten, VR = vorn rechts, VL = vorn links."""
    e = np.stack([LO - gx, LO - gy, gx - HI, gy - HI], -1)
    return np.array(['L', 'R', 'VR', 'VL'])[np.argmax(e, -1)]


def level_curve(f, n=2400):
    """Punkte (Raster) auf der Linie ffield = f, rund ums Tal."""
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    d = np.stack([np.cos(th), np.sin(th)], -1)
    lo, hi = np.zeros(n), np.full(n, 60.0)
    target = border(th) - f
    for _ in range(50):
        mid = (lo + hi) / 2
        p = C0 + d * mid[:, None]
        out = dist_sq(p[:, 0], p[:, 1]) > target
        hi, lo = np.where(out, mid, hi), np.where(out, lo, mid)
    return C0 + d * ((lo + hi) / 2)[:, None]


def resample(pts, step):
    seg = np.linalg.norm(np.diff(np.vstack([pts, pts[:1]]), axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, s[-1], step)
    loop = np.vstack([pts, pts[:1]])
    return np.stack([np.interp(t, s, loop[:, 0]), np.interp(t, s, loop[:, 1])], -1)


# ---------------------------------------------------------------- Bodenschicht
SCHNEE = dict(top=(243, 242, 234), shade=(190, 206, 218), side=(136, 160, 192))   # passend zum Schnee der Baumbilder
def ice(img, z, m, seed):
    """Eis (Bach, See): helles Blaugrau mit Schlieren, dunkle Rinne zum Ufer hin, Schneelippe am Rand."""
    st = BM.wnoise(H, W, seed, 90 * z, aniso=3.0, angle=0.46)
    gr = BM.wnoise(H, W, seed + 1, 8 * z)
    inner = G.blur_p(m, 5 * z)
    t = np.clip(0.45 + (st - 0.5) * 0.9 + (gr - 0.5) * 0.15, 0, 1)
    c = BM.lerp(BM.col((150, 196, 226)) * np.ones_like(img), BM.col((216, 236, 248)) * np.ones_like(img), t)
    c = c * (0.82 + 0.18 * np.clip(inner * 1.6, 0, 1))[..., None]                  # Ufer dunkler (Tiefe)
    sh = G.blur_p(G.shift(m, int(4 * z) + 1, int(4 * z) + 1), 2 * z)                 # Schatten der oberen Schneelippe
    c = c * (1 - (1 - sh)[..., None] * 0.25 * m[..., None])
    return BM.lerp(img, c, m)


def road(img, z, m, seed):
    """Feldweg: warme Erde, Rand dunkler, zwei Fahrspuren, weich auslaufend."""
    n = BM.wnoise(H, W, seed, 30 * z) * 0.6 + BM.wnoise(H, W, seed + 1, 6 * z) * 0.4
    core = G.blur_p((m > 0.5).astype(float), 3 * z)
    c = BM.colorize(np.clip(0.35 + (n - 0.5) * 0.8 + core * 0.35, 0, 1), (138, 100, 64), (196, 154, 104))
    return BM.lerp(img, c, np.clip(G.blur_p(m, 1.2 * z), 0, 1))


# ---------------------------------------------------------------- Runde 7: Weg, Teich, Bach nach Hay Day
# Vorbild (privat angesehen): Hay-Day-Weg = hellsandige glatte Fläche, runde Kurven, Rand leicht dunkler,
# Gras ragt über die Kante, kaum Kleinkram. Hay-Day-Bach = schmal, stark geschlängelt. Hay-Day-Eisteich
# („Small Frozen Pond“) = blassblaues Eis mit 2–3 schrägen Glanzstreifen, feinen Rissen, Schneelippe,
# Steine mit Schneehaube, Rohrkolben mit Schnee.
def chaikin(p, n=4):
    p = np.asarray(p, float)
    for _ in range(n):
        q = [p[0]]
        for a, b in zip(p[:-1], p[1:]):
            q += [0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b]
        q.append(p[-1])
        p = np.array(q)
    return p


WEG = chaikin([(6.9, 50.0), (6.8, 33.0), (6.8, 21.0), (4.6, 15.0), (4.6, 8.6)])   # Runde 9: führt aus dem Bild
WEG_HALF = 0.42


def path_dist(gx, gy):
    """Abstand zur Wegmitte (Kacheln) und seitlicher Versatz mit Vorzeichen."""
    gx, gy = np.asarray(gx, float), np.asarray(gy, float)
    d = np.full(gx.shape, 1e9)
    sd = np.zeros(gx.shape)
    for a, b in zip(WEG[:-1], WEG[1:]):
        ab = b - a
        t = np.clip(((gx - a[0]) * ab[0] + (gy - a[1]) * ab[1]) / (ab @ ab), 0, 1)
        ex, ey = gx - a[0] - t * ab[0], gy - a[1] - t * ab[1]
        dd = np.hypot(ex, ey)
        s = np.sign(ab[0] * ey - ab[1] * ex) * dd
        better = dd < d
        d, sd = np.where(better, dd, d), np.where(better, s, sd)
    return d, sd


def path_samples(step):
    """Punkte entlang der Wegmitte mit Normale (Raster)."""
    seg = np.linalg.norm(np.diff(WEG, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    t = np.arange(0, s[-1], step)
    x, y = np.interp(t, s, WEG[:, 0]), np.interp(t, s, WEG[:, 1])
    tx, ty = np.gradient(x), np.gradient(y)
    ln = np.hypot(tx, ty) + 1e-9
    return np.stack([x, y], -1), np.stack([-ty / ln, tx / ln], -1)


def paint_path(img, cam, d, sd, style, seed=80):
    """Weg als gemalte Fläche. 'sand' = Hay-Day-Weg, 'spur' = Fahrspuren mit Gras/Schnee dazwischen."""
    z = cam.z
    soft = 1.6 / cam.tw
    wob = (BM.wnoise(H, W, seed + 2, 7 * z) - 0.5) * 0.07
    n1, n2 = BM.wnoise(H, W, seed, 9 * z), BM.wnoise(H, W, seed + 1, 80 * z)
    t = np.clip(0.5 + (n1 - 0.5) * 0.45 + (n2 - 0.5) * 0.7, 0, 1)
    if style == 'sand':
        base = BM.colorize(t, (204, 168, 116), (230, 200, 148))
        rim = BM.smooth(WEG_HALF * 0.5, WEG_HALF, d)
        base = base * (1 - 0.14 * rim ** 1.6)[..., None]
        base = BM.lerp(base, BM.col((242, 218, 172)) * np.ones_like(base), 0.22 * (1 - rim) ** 2)
        m = BM.smooth(WEG_HALF + soft, WEG_HALF - soft, d + wob)
        outer = BM.smooth(WEG_HALF + 0.16, WEG_HALF, d + wob) * (1 - m)
    else:
        r = np.abs(np.abs(sd) - 0.25)
        base = BM.colorize(t, (124, 88, 56), (168, 126, 82))
        base = base * (0.84 + 0.16 * BM.smooth(0.0, 0.13, r))[..., None]             # Rinne in der Mitte dunkler
        puddle = (BM.wnoise(H, W, seed + 5, 60 * z) > 0.72) * BM.smooth(0.07, 0.03, r)   # gefrorene Pfützen
        ice = BM.lerp(BM.col((176, 210, 232)) * np.ones_like(base), BM.col((226, 242, 250)) * np.ones_like(base), n1)
        base = BM.lerp(base, ice, G.blur_p(puddle.astype(float), 1.0) * 0.9)
        m = BM.smooth(0.14 + soft, 0.14 - soft, r + wob) * (d < 0.5)
        outer = BM.smooth(0.22, 0.14, r + wob) * (1 - m) * (d < 0.5)
    img = img * (1 - 0.12 * outer)[..., None]
    return BM.lerp(img, base, m), m


TA, TB = 2.5, 2.0                                       # Teich-Halbachsen (Kacheln)
_PC = level_curve(2.6, 720)
PC = _PC[int(round(0.34 / (2 * np.pi) * 720))]


def teich_rho(gx, gy):
    dx, dy = (np.asarray(gx, float) - PC[0]) / TA, (np.asarray(gy, float) - PC[1]) / TB
    ph = np.arctan2(dy, dx)
    return np.hypot(dx, dy) / (1 + 0.10 * np.sin(2 * ph + 0.6) + 0.05 * np.sin(3 * ph + 2.0))


def teich_rim(ph, k=1.0):
    w = 1 + 0.10 * np.sin(2 * ph + 0.6) + 0.05 * np.sin(3 * ph + 2.0)
    return PC + np.stack([TA * np.cos(ph), TB * np.sin(ph)], -1) * (w * k)[..., None]


BACH_BREIT = {1: 1.0, 2: 1.15, 3: 1.45}                 # Runde 8: Bach-Stufe → Breite


def _bachlauf():
    """Runde 9: Bach als Linienzug – kommt oben aus dem Bild (später Wasserfall), läuft hinter dem
    Wiesenrand rechts entlang, mündet in den Teich und fließt unten aus dem Bild."""
    c = level_curve(-0.45, 1200)
    j0 = int(np.argmin(np.hypot(c[:, 0] - 8.0, c[:, 1] + 17.6)))
    j1 = int(np.argmin(np.hypot(c[:, 0] - 20.6, c[:, 1] - 2.5)))
    seg = c[j0:j1 + 1] if j0 < j1 else np.vstack([c[j0:], c[:j1 + 1]])
    seg = seg[::25]
    ctrl = np.vstack([[(-2.0, -40.0), (0.5, -29.0), (4.0, -22.5)], seg, [PC], [(16.9, 10.4), (18.6, 13.2), (20.9, 15.6), (21.2, 20.5), (22.0, 28.0), (22.6, 46.0)]])
    p = chaikin(ctrl, 4)
    sg = np.linalg.norm(np.diff(p, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(sg)])
    tt = np.arange(0, s[-1], 0.04)
    x, y = np.interp(tt, s, p[:, 0]), np.interp(tt, s, p[:, 1])
    tx, ty = np.gradient(x), np.gradient(y)
    ln = np.hypot(tx, ty) + 1e-9
    nx, ny = -ty / ln, tx / ln
    near = np.clip((np.hypot(x - PC[0], y - PC[1]) - 2.6) / 2.5, 0, 1)        # gerade Einmündung am Teich
    off = (0.34 * np.sin(tt * 2.0) + 0.12 * np.sin(tt * 4.6 + 1.0)) * near
    x, y = x + nx * off, y + ny * off
    tx, ty = np.gradient(x), np.gradient(y)
    ln = np.hypot(tx, ty) + 1e-9
    return np.stack([x, y], -1), np.stack([-ty / ln, tx / ln], -1), tt


LAUF, LAUF_N, LAUF_T = _bachlauf()
_rho = teich_rho(LAUF[:, 0], LAUF[:, 1])
_inside = np.nonzero(_rho < 1)[0]
MUND = LAUF[_inside[0]] if len(_inside) else PC                  # Einmündung (offene Bucht)
AUSL = LAUF[_inside[-1]] if len(_inside) else PC                 # Auslauf
_LAUF_KD = None


def lauf_s(gx, gy, breit=1.45):
    """Querkoordinate zum Bachlauf (|s| < 1 = Wasser) mit wechselnder Breite."""
    global _LAUF_KD
    from scipy.spatial import cKDTree
    if _LAUF_KD is None:
        _LAUF_KD = cKDTree(LAUF)
    gx, gy = np.asarray(gx, float), np.asarray(gy, float)
    q = np.stack([gx.ravel(), gy.ravel()], -1)
    d, i = _LAUF_KD.query(q)
    sd = (q[:, 0] - LAUF[i, 0]) * LAUF_N[i, 0] + (q[:, 1] - LAUF[i, 1]) * LAUF_N[i, 1]
    tt = LAUF_T[i]
    w = 0.19 * breit * (1 + 0.22 * np.sin(tt * 0.9 + 0.7) + 0.12 * np.sin(tt * 2.3 + 2.4))
    s = np.where(d < 4, sd / w, 9.0)
    return s.reshape(gx.shape)


def bach_s(gx, gy, v):
    """Querkoordinate im Bach: |s| < 1 Wasser, 0 = Mitte; dazu Maske der Bach-Seiten."""
    if v.get('lauf'):
        s = lauf_s(gx, gy, BACH_BREIT.get(v.get('bach', 1), 1.0))
        return s, np.ones(np.shape(s), bool)
    gx, gy = np.asarray(gx, float), np.asarray(gy, float)
    th = np.arctan2(gy - C0[1], gx - C0[0])
    f = ffield(gx, gy)
    mea = f - 0.2 + 0.40 * np.sin(th * 34 + 1.0) + 0.15 * np.sin(th * 71 + 0.3)
    w = (0.19 + 0.04 * np.sin(th * 37 + 2.0)) * BACH_BREIT.get(v.get('bach', 1), 1.0)
    if v.get('bach', 1) == 3:                                   # natürlich: Breite schwankt (Gumpen, Engstellen)
        w = w * (1 + 0.22 * np.sin(th * 13 + 0.7) + 0.12 * np.sin(th * 29 + 2.4))
    bs = np.isin(side_of(gx, gy), [s for s, e in v['rand'].items() if e == 'bach'])
    return mea / w, bs


def water(gx, gy, v, teil='alles'):
    """Wasser (Raster, weltfest): geschlängelter Bach an den Bach-Seiten + Teich."""
    s, bs = bach_s(gx, gy, v)
    bach = (np.abs(s) < 1) & bs
    teich = teich_rho(gx, gy) < 1
    return {'bach': bach & ~teich, 'teich': teich}.get(teil, bach | teich)


def bach_hd(img, cam, v, gx, gy, stufe, seed=120):
    """Bach in drei Stufen: 1 kräftiges Eis, 2 Eis mit offener Rinne, 3 offenes Wasser mit Erdufer (Hay Day)."""
    z, U = cam.z, cam.tw
    s, bs = bach_s(gx, gy, v)
    s = np.where(bs & (teich_rho(gx, gy) >= 1.0), s, 9.0)       # nur Bach, Teich malt ice_hd
    a = np.abs(s)
    I = np.clip(G.blur_p(BM.smooth(1.04, 0.96, a), 0.04 * U), 0, 1)
    ones = np.ones_like(img)
    outer = BM.smooth(0.14, 0.30, G.blur_p(I, 0.10 * U))
    if stufe == 3:
        outer = BM.smooth(0.14, 0.30, G.blur_p(np.clip(G.blur_p(BM.smooth(1.75, 1.6, a), 0.04 * U), 0, 1), 0.10 * U))
        outer = np.clip(outer - BM.smooth(0.2, 0.6, I), 0, 1)
    sh_ring = np.clip(G.blur_p(outer, 0.05 * U) - outer, 0, 1)   # bläulicher Schatten, trennt Lippe vom Schnee
    img = img * (1 - 0.30 * sh_ring[..., None] * np.array([0.55, 0.40, 0.10]))
    img, _ = G.snow_render(img, z, outer, seed, thick=4, **SCHNEE)
    if stufe == 3:                                              # Erdufer direkt am Wasser, über der Schneelippe
        bank = np.clip(G.blur_p(BM.smooth(1.22, 1.08, a), 0.012 * U), 0, 1)
        ec = BM.lerp(BM.col((150, 112, 76)) * ones, BM.col((104, 74, 50)) * ones, BM.wnoise(H, W, seed + 7, 0.12 * U))
        img = BM.lerp(img, ec, bank)
    t = max(2, int(0.07 * U))
    wall = np.clip(I - G.shift(I, t, 0), 0, 1)                    # Uferwand oben sichtbar
    surf = np.clip(I - wall, 0, 1)
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    nz = BM.wnoise(H, W, seed + 1, 0.5 * U)
    if stufe in (1, 2):
        k = np.clip(1 - a, 0, 1) ** 0.7
        c = BM.lerp(BM.col((170, 210, 240)) * ones, BM.col((92, 150, 210)) * ones, k)
        u = (xs * 0.82 - ys * 0.57) / (0.12 * U)
        streak = BM.smooth(0.82, 0.97, np.sin(u)) * BM.smooth(0.45, 0.75, BM.wnoise(H, W, seed + 2, 0.9 * U))
        c = BM.lerp(c, BM.col((236, 248, 255)) * ones, streak * 0.75)
        wc = BM.lerp(BM.col((126, 158, 204)) * ones, BM.col((70, 104, 160)) * ones, np.clip(G.blur_p(wall, 0.6), 0, 1))
        if stufe == 2:                                          # offene Rinne in der Mitte
            ch = np.clip(G.blur_p(BM.smooth(0.52, 0.40, a + (nz - 0.5) * 0.35), 0.02 * U), 0, 1) * surf
            lip = np.clip(G.shift(ch, -max(1, t // 2), 0) - ch, 0, 1)
            wtr = BM.lerp(BM.col((34, 96, 136)) * ones, BM.col((60, 136, 170)) * ones, BM.wnoise(H, W, seed + 3, 0.25 * U))
            rip = BM.smooth(0.90, 0.99, np.sin(s * 9 + nz * 6)) * 0.35
            wtr = BM.lerp(wtr, BM.col((160, 214, 230)) * ones, rip)
            c = BM.lerp(c, wtr, ch)
            c = BM.lerp(c, BM.col((240, 250, 255)) * ones, lip)
    else:                                                       # offenes Wasser wie Hay Day
        k = np.clip(1 - a, 0, 1)
        c = BM.lerp(BM.col((44, 124, 178)) * ones, BM.col((112, 196, 230)) * ones, BM.smooth(0.05, 0.75, k))
        rip = BM.smooth(0.86, 0.99, np.sin(s * 7.5 + nz * 7)) * BM.smooth(0.15, 0.5, k)
        c = BM.lerp(c, BM.col((214, 242, 252)) * ones, rip * 0.55)
        glint = (np.random.default_rng(seed).uniform(0, 1, (H, W)) > 0.9985) * BM.smooth(0.3, 0.7, k)
        c = BM.lerp(c, np.full_like(img, 255.0), np.clip(G.blur_p(glint.astype(float), 0.6 * z) * 3, 0, 1))
        wc = BM.lerp(BM.col((120, 86, 58)) * ones, BM.col((78, 54, 38)) * ones, np.clip(G.blur_p(wall, 0.6), 0, 1))
    sh = G.blur_p(G.shift(wall, int(t * 0.8), int(t * 0.3)), t * 0.8) * surf
    c = c * (1 - (0.30 if stufe == 3 else 0.18) * sh)[..., None]
    img = BM.lerp(img, wc, wall)
    return BM.lerp(img, c, surf)


def ice_hd(img, cam, I, style, seed=90, bucht=None, frei=None):
    """Eis wie Hay-Day-Eisteich: Schneelippe mit Volumen, Innenwand, blasses Eis, Glanzstreifen, Risse.
    bucht = offenes Wasser im Teich (Bach-Mündung), frei = dort keine Schneelippe/Wand (Bach fließt durch)."""
    z, U = cam.z, cam.tw
    outer = BM.smooth(0.14, 0.24, G.blur_p(I, 0.10 * U))
    if frei is not None:
        outer = outer * (1 - frei)
    img, _ = G.snow_render(img, z, outer, seed, thick=4, **SCHNEE)               # Schneelippe
    Ib = BM.smooth(0.55, 0.8, G.blur_p(I, 0.05 * U))
    t = max(2, int(0.06 * U))
    wall = np.clip(Ib - G.shift(Ib, t, 0), 0, 1)
    if frei is not None:
        wall = wall * (1 - frei)
    surf = np.clip(Ib - wall, 0, 1)
    inner = G.blur_p(Ib, 0.32 * U)
    k = np.clip((inner - 0.45) * 2.2, 0, 1)
    ones = np.ones_like(img)
    c = BM.lerp(BM.col((192, 222, 242)) * ones, BM.col((128, 172, 212)) * ones, k)
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    u = (xs * 0.82 - ys * 0.57) / (0.16 * U)
    env = BM.smooth(0.45, 0.75, BM.wnoise(H, W, seed + 1, 1.2 * U))
    streak = BM.smooth(0.80, 0.97, np.sin(u)) * env
    broad = BM.smooth(0.3, 1.0, np.sin(u / 4.3 + 1.2)) * 0.35
    c = BM.lerp(c, BM.col((240, 250, 255)) * ones, np.clip(streak * 0.8 + broad * 0.8, 0, 1))
    c = c * (1 + (BM.wnoise(H, W, seed + 2, 2.5 * z) - 0.5) * 0.05)[..., None]
    if style == 'loch':                                                            # offenes Eisloch
        if bucht is not None:                                                      # Runde 9: ein ruhiges Loch, keine Splitter
            hx, hy = cam.grid()
            hole = (teich_rho(hx + 0.25, hy - 0.15) < 0.46 + (BM.wnoise(H, W, seed + 3, 0.5 * U) - 0.5) * 0.10).astype(float)
        else:
            hole = ((inner > 0.9) * (BM.wnoise(H, W, seed + 3, 0.7 * U) > 0.45)).astype(float)
        hole = BM.smooth(0.4, 0.6, G.blur_p(hole, 0.06 * U)) * surf
        lip = np.clip(G.shift(hole, -max(1, t // 2), 0) - hole, 0, 1)             # Eiskante oben sichtbar
        wtr = BM.lerp(BM.col((40, 108, 140)) * ones, BM.col((72, 146, 172)) * ones, BM.wnoise(H, W, seed + 4, 0.3 * U))
        ph = BM.wnoise(H, W, seed + 6, 0.25 * U) * 9
        rip = BM.smooth(0.92, 0.99, np.sin((xs * 0.9 - ys * 0.4) / (0.04 * U) + ph)) * 0.14
        wtr = BM.lerp(wtr, BM.col((150, 210, 226)) * ones, rip)
        c = BM.lerp(c, wtr, hole)
        c = BM.lerp(c, BM.col((236, 248, 255)) * ones, lip)
    if bucht is not None:                                                          # offene Bucht: fließendes Wasser friert nicht
        b = bucht * surf
        blip = np.clip(G.shift(b, max(1, t // 2), 0) - b, 0, 1)                    # Eiskante unten an der Bucht
        bt = np.clip(G.shift(b, -max(1, t // 2), 0) - b, 0, 1)                     # Eiskante oben (Dicke sichtbar)
        nz = BM.wnoise(H, W, seed + 8, 0.5 * U)
        kk = BM.smooth(0.0, 1.0, G.blur_p(b, 0.12 * U))
        ow = BM.lerp(BM.col((44, 124, 178)) * ones, BM.col((112, 196, 230)) * ones, kk)
        rip = BM.smooth(0.88, 0.99, np.sin((xs * 0.7 + ys * 0.9) / (0.05 * U) + nz * 7)) * kk
        ow = BM.lerp(ow, BM.col((214, 242, 252)) * ones, rip * 0.5)
        c = BM.lerp(c, ow, b)
        c = BM.lerp(c, BM.col((150, 186, 214)) * ones, bt * 0.9)
        c = BM.lerp(c, BM.col((240, 250, 255)) * ones, blip)
    wc = BM.lerp(BM.col((168, 190, 214)) * ones, BM.col((120, 150, 188)) * ones, np.clip(G.blur_p(wall, 0.6), 0, 1))
    sh = G.blur_p(G.shift(wall, int(t * 0.7), int(t * 0.3)), t * 0.7) * surf
    c = c * (1 - 0.16 * sh)[..., None]
    # Risse (fein, dunkel mit heller Begleitlinie), nur auf der Eisfläche
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    rng = np.random.default_rng(seed + 7)
    yy, xx = np.nonzero(surf > 0.95)
    if len(xx):
        for _ in range(max(2, int(len(xx) / (U * U * 1.2)))):
            j = rng.integers(len(xx))
            p = np.array([xx[j], yy[j]], float)
            ang = rng.uniform(0, 2 * np.pi)
            for _ in range(rng.integers(3, 6)):
                ang += rng.uniform(-0.8, 0.8)
                q = p + np.array([np.cos(ang), np.sin(ang) * 0.5]) * U * rng.uniform(0.08, 0.18)
                dr.line([tuple(p + (0, 1.5)), tuple(q + (0, 1.5))], fill=(244, 250, 255, 200), width=max(1, int(U / 90)))
                dr.line([tuple(p), tuple(q)], fill=(70, 108, 150, 230), width=max(1, int(U / 70)))
                p = q
    la = np.asarray(layer, float)
    a = la[..., 3:] / 255 * surf[..., None]
    c = c * (1 - a) + la[..., :3] * a
    img = BM.lerp(img, wc, wall)
    return BM.lerp(img, c, surf)


def ground(v, cam):
    z = cam.z
    rep = 320 * z
    tex = v['tex']()
    if rep < tex.shape[0]:
        tex = np.asarray(Image.fromarray(np.clip(tex, 0, 255).astype('uint8')).resize((int(rep), int(rep)), Image.LANCZOS), float)
    img = B.hex_render(tex, W, H, rep)
    img = G.tone_patches(img, z, 40, v.get('flecken', 0.15 if cam.tw > 80 else 0.26))
    gx, gy = cam.grid()
    f = ffield(gx, gy)
    sides = side_of(gx, gy)
    # Schnee außerhalb + einzelne Schollen auf der Wiese (nur wo Wald angrenzt, Mauer/Zaun halten den Schnee)
    fe = f + (BM.wnoise(H, W, 52, 40 * z) - 0.5) * 0.5 + (BM.wnoise(H, W, 53, 14 * z) - 0.5) * 0.18
    outside = np.clip(0.5 - fe * cam.tw / 4, 0, 1)
    loose = np.isin(sides, [s for s, e in v['rand'].items() if e == 'wald']).astype(float)
    n = BM.wnoise(H, W, 50, 120 * z) * 0.8 + BM.wnoise(H, W, 51, 50 * z) * 0.2
    reach = np.clip(1 - fe / 0.9, 0, 1) * (fe > 0)
    slabs = ((n > 0.84 - reach * 0.26) * (reach > 0.35) * loose).astype(float)
    m = np.clip(outside + slabs, 0, 1)
    if v.get('weg'):                                   # Runde 7: Weg zuerst, Schnee weicht ihm mit Kante
        d, sd = path_dist(gx, gy)
        img, wm = paint_path(img, cam, d, sd, v['weg'])
        clear = BM.smooth(WEG_HALF + 0.16, WEG_HALF + 0.08, d) if v['weg'] == 'sand' else np.clip(G.blur_p(wm, 0.03 * cam.tw) * 3, 0, 1)
        m = m * (1 - clear)
    img, top = G.snow_render(img, z, G.blur_p(m, 0.6), 60, **SCHNEE)
    if v.get('wasser') and v.get('bach'):              # Runde 8: Bach eigene Stufe, Teich danach (Bach läuft unters Eis)
        img = bach_hd(img, cam, v, gx, gy, v['bach'])
        wmask = water(gx, gy, v, 'teich').astype(float)
        bucht = frei = None
        if v.get('lauf'):
            U = cam.tw
            s, _ = bach_s(gx, gy, v)
            nb = BM.wnoise(H, W, 131, 0.5 * U)
            r_m = np.hypot(gx - MUND[0], gy - MUND[1]) + (nb - 0.5) * 0.5
            r_a = np.hypot(gx - AUSL[0], gy - AUSL[1]) + (nb - 0.5) * 0.4
            bucht = np.clip(G.blur_p(((r_m < 0.78) | (r_a < 0.45)).astype(float), 0.02 * U), 0, 1)
            frei = np.clip(G.blur_p((np.abs(s) < 1.35).astype(float), 0.03 * U), 0, 1) * BM.smooth(1.8, 1.2, np.minimum(r_m, r_a))
        img = ice_hd(img, cam, np.clip(G.blur_p(wmask, 0.7), 0, 1), v['wasser'], bucht=bucht, frei=frei)
    elif v.get('wasser'):                              # Runde 7: Bach (Mäander) + Teich wie Hay Day
        wmask = water(gx, gy, v).astype(float)
        img = ice_hd(img, cam, np.clip(G.blur_p(wmask, 0.7), 0, 1), v['wasser'])
    extra = v.get('extra', ())
    if 'bach' in v['rand'].values() and not v.get('wasser'):
        wn = BM.wnoise(H, W, 70, 500 * z)
        bs = np.isin(sides, [s for s, e in v['rand'].items() if e == 'bach'])
        cm = (np.abs(f + 1.05) < 0.38 + wn * 0.3) * bs
        if 'see' in extra:
            cm = cm & ~((gy < -3) & (sides == 'VR'))
        img = ice(img, z, np.clip(G.blur_p(cm.astype(float), 0.8 * z), 0, 1), 71)
    if 'see' in extra:
        lake = (((gx - 24.5) / 6.5) ** 2 + ((gy + 6.0) / 7.5) ** 2) < 1 + (BM.wnoise(H, W, 72, 300 * z) - 0.5) * 0.5
        img = ice(img, z, np.clip(G.blur_p(lake.astype(float), 0.8 * z), 0, 1), 73)
    if 'weg' in extra:
        wob = (BM.wnoise(H, W, 74, 400 * z) - 0.5) * 0.5
        rm = (np.abs(gx - 5.5 - wob) < 1.0) & (gy > 10.5)
        rm |= ((gx - 5.5) ** 2 + (gy - 10.5) ** 2) < 1.0
        img = road(img, z, rm.astype(float), 75)
    ys = np.mgrid[0:H, 0:W][0]
    img = img * (1.03 - 0.05 * ys / H)[..., None]
    return img, f, gx, gy


# ---------------------------------------------------------------- Objekte
_cache = {}


def sprite(name, k):
    key = (name, round(k, 3))
    if key not in _cache:
        _cache[key] = BM.load(name, k)
    return _cache[key]


def in_view(cam, gx, gy, pad=2.0):
    sx, sy = cam.proj(gx, gy)
    return (-pad * cam.tw < sx < W + pad * cam.tw) and (-pad * cam.tw * 0.5 < sy < H + pad * cam.tw * 1.4)


_tg = np.random.default_rng(21)
_TONGUES = [(*level_curve(_tg.uniform(0.6, 2.2), 64)[_tg.integers(0, 64)], _tg.uniform(1.0, 2.2)) for _ in range(14)]


def tongue(x, y):
    """Waldzungen: Baumgruppen, die vom Waldrand in die Wiese wachsen (Hay-Day-Hindernisgruppen)."""
    return any((x - a) ** 2 + (y - b) ** 2 < r * r for a, b, r in _TONGUES)


def trees(v, cam, seed=5):
    """Wald: dicht am Kartenende, dahinter locker in der Schneelandschaft. Vorn niedriger und weiter weg (Sicht aufs Feld)."""
    rng = np.random.default_rng(seed)
    gx0, gy0 = cam.grid()
    lo_x, hi_x = gx0.min() - 3, gx0.max() + 3
    lo_y, hi_y = gy0.min() - 3, gy0.max() + 3
    pts, out = [], []
    cell = {}
    dmin = 0.95
    names = ['wild_cluster_1.webp', 'wild_cluster_2.webp', 'wild_cluster_3.webp', 'wild_cluster_6.webp', 'wild_cluster_4.webp']
    prob = [0.34, 0.26, 0.30, 0.05, 0.05]
    extra = v.get('extra', ())
    n = int((hi_x - lo_x) * (hi_y - lo_y) * 3)
    for _ in range(min(n, 60000)):
        x, y = rng.uniform(lo_x, hi_x), rng.uniform(lo_y, hi_y)
        f = float(ffield(x, y))
        if f > 3.5 or not in_view(cam, x, y):
            continue
        if f > 0.3 and not (v['rand'][str(side_of(x, y))] == 'wald' and tongue(x, y)):
            continue
        s = str(side_of(x, y))
        e = v['rand'][s]
        front = s in ('VL', 'VR')
        if e == 'wald':
            start = -1.6 if front else -0.15
            p = 0.9 if start - 3.5 < f < start else 0.12
            if front and f < start:
                p = 0.55 if f > start - 2.5 else 0.12
            if f >= start:
                p = 0.0
            if not front and f > -0.4 and tongue(x, y):
                p = 0.85
        elif e == 'bach':
            p = 0.75 if f < (-3.6 if front else -2.4) else 0.0
            if f < -5:
                p = 0.12
        else:                                           # Mauer, Zaun, Hecke: lockerer Baumgürtel dahinter
            p = 0.55 if -3.0 < f < -0.8 else (0.12 if f <= -3.0 else 0.0)
            if front:
                p *= 0.6
        if 'weg' in extra and abs(x - 5.5) < 2.0 and y > 9:
            p = 0
        if 'see' in extra and ((x - 24.5) / 7.5) ** 2 + ((y + 6.0) / 8.5) ** 2 < 1:
            p = 0
        if v.get('weg') and float(path_dist(x, y)[0]) < 2.2:
            p = 0
        if v.get('wasser') and float(teich_rho(x, y)) < 1.7:
            p = 0
        if v.get('lauf') and abs(float(lauf_s(np.array([x]), np.array([y]))[0])) * 0.28 < 1.25:
            p = 0
        if rng.uniform() > p:
            continue
        key = (int(x // dmin), int(y // dmin))
        ok = True
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for q in cell.get((key[0] + dx, key[1] + dy), ()):
                    if (q[0] - x) ** 2 + (q[1] - y) ** 2 < dmin ** 2:
                        ok = False
        if not ok:
            continue
        cell.setdefault(key, []).append((x, y))
        pts.append((x, y))
        nm = names[rng.choice(len(names), p=prob)]
        k = 0.30 * cam.z * SS * rng.uniform(0.82, 1.2)
        if front and f > -3.5 and e == 'wald':
            k *= 0.85
        k = round(k / (0.02 * SS * cam.z)) * 0.02 * SS * cam.z
        out.append((x, y, nm, k))
    return out


class Painter:
    """Sammelt Zeichenschritte mit Fuß-Höhe, malt sortiert (hinten zuerst) in doppelter Auflösung."""
    def __init__(self, cam):
        self.cam, self.items, self.shadow = cam, [], []
        self.U = cam.tw * SS

    def p(self, gx, gy):
        sx, sy = self.cam.proj(gx, gy)
        return np.array([sx * SS, sy * SS])

    def add(self, y, fn):
        self.items.append((y, len(self.items), fn))

    def run(self, img):
        sh = Image.new('L', (W * SS, H * SS), 0)
        ds = ImageDraw.Draw(sh)
        for fn in self.shadow:
            fn(ds)
        a = np.asarray(sh.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(max(1.5, self.cam.tw / 26))), float)
        img = img * (1 - (a / 255)[..., None] * BM.col((0.42, 0.36, 0.18)))
        cv = Image.fromarray(np.clip(img, 0, 255).astype('uint8')).resize((W * SS, H * SS), Image.LANCZOS).convert('RGBA')
        d = ImageDraw.Draw(cv, 'RGBA')
        for _, _, fn in sorted(self.items, key=lambda t: (t[0], t[1])):
            fn(cv, d)
        return np.asarray(cv.resize((W, H), Image.LANCZOS).convert('RGB'), float)


def add_trees(P, v, cam):
    for x, y, nm, k in trees(v, cam):
        im = sprite(nm, k)
        foot = P.p(x, y)

        def fn(cv, d, im=im, foot=foot):
            cv.alpha_composite(im, (int(foot[0] - im.width / 2), int(foot[1] - im.height * 0.95)))

        def sh(ds, im=im, foot=foot):
            w = im.width * 0.62
            cx, cy = foot[0] + im.width * 0.10, foot[1] - im.height * 0.06
            ds.ellipse([cx - w / 2, cy - w * 0.22, cx + w / 2, cy + w * 0.22], fill=150)
        P.add(foot[1], fn)
        P.shadow.append(sh)


def segs_for(v, kind, f, step, skip=None):
    pts = resample(level_curve(f), step)
    keep = np.array([v['rand'][str(side_of(x, y))] == kind for x, y in pts])
    if skip is not None:
        keep &= ~np.array([skip(x, y) for x, y in pts])
    return pts, keep


def _upnormal(P, a, b, t):
    """Bildschirm-Versatz der Mauerdicke, zeigt nach hinten (oben)."""
    d = b - a
    nx, ny = -d[1], d[0]
    ln = np.hypot(nx, ny) + 1e-9
    nx, ny = nx / ln, ny / ln
    vx, vy = P.cam.vec(nx * t, ny * t)
    vx, vy = vx * SS, vy * SS
    return (vx, vy) if vy < 0 else (-vx, -vy)


def add_wall(P, v, rng, skip=None):
    """Trockenmauer wie Hay-Day-Erweiterungen: zwei Steinlagen, Moos, dicke Schneekappe."""
    U = P.U
    pts, keep = segs_for(v, 'mauer', 0.45, 0.42, skip)
    h = 0.27 * U
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        if not (keep[i] and keep[j]):
            continue
        a, b = P.p(*pts[i]), P.p(*pts[j])
        up = np.array(_upnormal(P, pts[i], pts[j], 0.36))
        tones = [(150, 146, 134), (178, 172, 156), (132, 130, 122), (164, 154, 134), (190, 184, 168)]
        st = [tones[k] for k in rng.integers(0, 5, 3)]
        jit = rng.uniform(-0.2, 0.2, 9)
        moss = rng.uniform() < 0.5
        bumps = rng.uniform(0.8, 1.25, 3)

        def fn(cv, d, a=a, b=b, up=up, st=st, jit=jit, moss=moss, bumps=bumps):
            fa, fb = a + up * 0.5, b + up * 0.5            # Vorderkante
            ta, tb = fa - (0, h), fb - (0, h)
            d.polygon([tuple(fa), tuple(fb), tuple(tb), tuple(ta)], fill=(70, 66, 60, 255))
            L = np.hypot(*(b - a))
            for row, (yy, cx) in enumerate(((0.28, 0.5), (0.74, 0.02), (0.74, 0.98))):
                c = fa + (fb - fa) * (cx + jit[row] * 0.25) - (0, h * (yy + jit[row + 6] * 0.12))
                rx, ry = max(L * 0.56, 0.08 * U) * (1 + jit[row + 3]), h * 0.30
                s = st[row]
                d.ellipse([c[0] - rx, c[1] - ry, c[0] + rx, c[1] + ry * 1.05], fill=BM.lift(s, -0.38) + (255,))
                d.ellipse([c[0] - rx * 0.94, c[1] - ry * 0.98, c[0] + rx * 0.9, c[1] + ry * 0.78], fill=s + (255,))
                d.ellipse([c[0] - rx * 0.74, c[1] - ry * 0.9, c[0] + rx * 0.25, c[1] - ry * 0.1], fill=BM.lift(s, 0.25) + (255,))
            if moss:
                c = fa + (fb - fa) * 0.35 - (0, h * 0.06)
                d.ellipse([c[0] - 0.06 * U, c[1] - 0.03 * U, c[0] + 0.07 * U, c[1] + 0.025 * U], fill=(92, 128, 58, 255))
                d.ellipse([c[0] - 0.04 * U, c[1] - 0.03 * U, c[0] + 0.03 * U, c[1] + 0.0 * U], fill=(122, 156, 70, 255))
            # Schneekappe: Oberseite + unregelmäßige runde Wülste, leicht überhängend
            d.polygon([tuple(ta), tuple(tb), tuple(tb + up), tuple(ta + up)], fill=(243, 242, 234, 255))
            for t, bm in zip((0.0, 0.5, 1.0), bumps):
                c = ta + (tb - ta) * t + up * 0.45
                rx, ry = max(L * 0.42, 0.08 * U) * bm, 0.06 * U * bm
                d.ellipse([c[0] - rx, c[1] - ry * 1.3, c[0] + rx, c[1] + ry * 1.1], fill=(190, 206, 218, 255))
                d.ellipse([c[0] - rx * 0.98, c[1] - ry * 1.4, c[0] + rx * 0.96, c[1] + ry * 0.8], fill=(245, 244, 236, 255))

        def sh(ds, a=a, b=b):
            o = np.array([0.10 * U, 0.05 * U])
            ds.polygon([tuple(a), tuple(b), tuple(b + o), tuple(a + o)], fill=170)
        P.add((a[1] + b[1]) / 2, fn)
        P.shadow.append(sh)


def add_fence(P, v, rng, skip=None):
    """Holzzaun mit Pfosten und zwei Latten, Schneehauben auf Pfosten und oberer Latte."""
    U = P.U
    pts, keep = segs_for(v, 'zaun', 0.40, 0.95, skip)
    wood, light, dark = (128, 84, 50), (176, 128, 84), (92, 58, 34)
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        if keep[i]:
            a = P.p(*pts[i])
            lean = rng.uniform(-0.01, 0.01) * U

            def post(cv, d, a=a, lean=lean):
                w, h = 0.05 * U, 0.44 * U
                d.polygon([(a[0] - w, a[1]), (a[0] + w, a[1]), (a[0] + w + lean, a[1] - h), (a[0] - w + lean, a[1] - h)], fill=wood + (255,))
                d.polygon([(a[0] - w, a[1]), (a[0] - w * 0.1, a[1]), (a[0] - w * 0.1 + lean, a[1] - h), (a[0] - w + lean, a[1] - h)], fill=light + (255,))
                d.line([(a[0] + w * 0.95, a[1]), (a[0] + w * 0.95 + lean, a[1] - h)], fill=dark + (255,), width=max(1, int(0.012 * U)))
                c = (a[0] + lean, a[1] - h)
                d.ellipse([c[0] - w * 1.25, c[1] - w * 1.1, c[0] + w * 1.25, c[1] + w * 0.55], fill=(240, 246, 255, 255))

            def psh(ds, a=a):
                ds.ellipse([a[0] - 0.04 * U, a[1] - 0.02 * U, a[0] + 0.12 * U, a[1] + 0.04 * U], fill=170)
            P.add(a[1] + 0.5, post)
            P.shadow.append(psh)
        if keep[i] and keep[j]:
            a, b = P.p(*pts[i]), P.p(*pts[j])
            sag = rng.uniform(0.0, 0.015) * U

            def rails(cv, d, a=a, b=b, sag=sag):
                for hr, snow in ((0.15, False), (0.32, True)):
                    t = 0.05 * U
                    pa, pb = a - (0, hr * U), b - (0, hr * U)
                    m = (pa + pb) / 2 + (0, sag)
                    for p0, p1 in ((pa, m), (m, pb)):
                        d.polygon([tuple(p0), tuple(p1), tuple(p1 - (0, t)), tuple(p0 - (0, t))], fill=wood + (255,))
                        d.line([tuple(p0 - (0, t)), tuple(p1 - (0, t))], fill=light + (255,), width=max(1, int(0.014 * U)))
                        d.line([tuple(p0), tuple(p1)], fill=dark + (255,), width=max(1, int(0.01 * U)))
                        if snow:
                            d.polygon([tuple(p0 - (0, t)), tuple(p1 - (0, t)), tuple(p1 - (0, t * 1.7)), tuple(p0 - (0, t * 1.7))], fill=(238, 245, 255, 255))

            def rsh(ds, a=a, b=b):
                o = np.array([0.16 * U, 0.08 * U])
                ds.line([tuple(a + o * 0.5), tuple(b + o * 0.5)], fill=110, width=max(1, int(0.04 * U)))
            P.add((a[1] + b[1]) / 2, rails)
            P.shadow.append(rsh)


def add_hedge(P, v, rng, skip=None):
    """Stechpalmenhecke: dichte dunkelgrüne Wülste, Schnee obenauf, rote Beeren (Weihnachtsbezug)."""
    U = P.U
    pts, keep = segs_for(v, 'hecke', 0.45, 0.20, skip)
    for i in range(len(pts)):
        if not keep[i]:
            continue
        a = P.p(*pts[i])
        r = rng.uniform(0.75, 1.3)
        sub = rng.uniform(-1, 1, (3, 2))
        ber = rng.uniform(-1, 1, (4, 2))
        nb = rng.integers(0, 4)
        snow = rng.uniform(0.6, 1.25) if rng.uniform() < 0.8 else 0

        def fn(cv, d, a=a, r=r, sub=sub, ber=ber, nb=nb, snow=snow):
            c = a - (0, 0.24 * U * r)
            rx, ry = 0.15 * U * r, 0.22 * U * r
            d.ellipse([c[0] - rx, c[1] - ry, c[0] + rx, c[1] + ry * 1.05], fill=(22, 60, 34, 255))
            for k in range(3):                                         # Blattbüschel
                q = c + sub[k] * (rx * 0.35, ry * 0.3) - (rx * 0.12, ry * 0.12)
                qr = rx * (0.62 - k * 0.1)
                d.ellipse([q[0] - qr, q[1] - qr * 1.1, q[0] + qr, q[1] + qr * 0.9], fill=(38 + k * 14, 94 + k * 18, 48 + k * 8, 255))
            q = c - (rx * 0.35, ry * 0.42)
            d.ellipse([q[0] - rx * 0.28, q[1] - ry * 0.22, q[0] + rx * 0.22, q[1] + ry * 0.16], fill=(98, 160, 84, 255))
            for k in range(nb):
                q = c + ber[k] * (rx * 0.6, ry * 0.5)
                d.ellipse([q[0] - 0.02 * U, q[1] - 0.02 * U, q[0] + 0.02 * U, q[1] + 0.02 * U], fill=(206, 32, 40, 255))
                d.ellipse([q[0] - 0.008 * U, q[1] - 0.012 * U, q[0] + 0.004 * U, q[1] - 0.002 * U], fill=(255, 150, 150, 255))
            if snow:
                s = c - (0.0, ry * 0.8)
                d.ellipse([s[0] - rx * 0.8 * snow, s[1] - ry * 0.22, s[0] + rx * 0.75 * snow, s[1] + ry * 0.36], fill=(186, 204, 216, 255))
                d.ellipse([s[0] - rx * 0.78 * snow, s[1] - ry * 0.28, s[0] + rx * 0.7 * snow, s[1] + ry * 0.2], fill=(245, 244, 236, 255))

        def sh(ds, a=a, r=r):
            ds.ellipse([a[0] - 0.12 * U, a[1] - 0.06 * U, a[0] + 0.26 * U, a[1] + 0.07 * U], fill=180)
        P.add(a[1], fn)
        P.shadow.append(sh)


def add_stones(P, v, rng, cam):
    """Ufersteine am Bach (rund, Schneehaube)."""
    U = P.U
    for f in (-0.55, -1.6):
        pts, keep = segs_for(v, 'bach', f, 0.9)
        for (x, y), k in zip(pts, keep):
            if not k or rng.uniform() > 0.45:
                continue
            a = P.p(x + rng.uniform(-0.2, 0.2), y + rng.uniform(-0.2, 0.2))
            r = rng.uniform(0.05, 0.09) * U

            def fn(cv, d, a=a, r=r):
                d.ellipse([a[0] - r, a[1] - r * 1.1, a[0] + r, a[1] + r * 0.2], fill=(118, 120, 122, 255))
                d.ellipse([a[0] - r * 0.9, a[1] - r * 1.1, a[0] + r * 0.6, a[1] - r * 0.1], fill=(154, 156, 156, 255))
                d.ellipse([a[0] - r * 0.85, a[1] - r * 1.25, a[0] + r * 0.7, a[1] - r * 0.6], fill=(240, 246, 255, 255))
            P.add(a[1], fn)


def _snow_clump(P, a, w, rng):
    U = P.U
    h = w * rng.uniform(0.38, 0.5)

    def fn(cv, d, a=a, w=w, h=h):
        d.ellipse([a[0] - w, a[1] - h * 1.4, a[0] + w, a[1] + h * 0.5], fill=(176, 196, 214, 255))
        d.ellipse([a[0] - w * 0.96, a[1] - h * 1.55, a[0] + w * 0.86, a[1] + h * 0.1], fill=(245, 244, 236, 255))
        d.ellipse([a[0] - w * 0.7, a[1] - h * 1.45, a[0] + w * 0.1, a[1] - h * 0.7], fill=(255, 255, 252, 255))

    def sh(ds, a=a, w=w):
        ds.ellipse([a[0] - w * 0.6, a[1] - w * 0.15, a[0] + w * 1.3, a[1] + w * 0.32], fill=120)
    P.add(a[1], fn)
    P.shadow.append(sh)


def _tuft(P, a, rng, s=1.0):
    U = P.U
    n = rng.integers(7, 12)
    bl = [(rng.uniform(-0.06, 0.06) * U * s, rng.uniform(0.05, 0.10) * U * s, rng.uniform(-0.035, 0.035) * U * s,
           rng.integers(0, 3)) for _ in range(n)]
    tones = [(72, 136, 36), (98, 162, 46), (126, 188, 58)]

    def fn(cv, d, a=a, bl=bl):
        for dx, hh, lean, k in sorted(bl, key=lambda b: b[3]):
            b0 = (a[0] + dx - 0.012 * U, a[1])
            b1 = (a[0] + dx + 0.012 * U, a[1])
            tip = (a[0] + dx + lean, a[1] - hh)
            d.polygon([b0, b1, tip], fill=tones[k] + (255,))
    P.add(a[1] - 0.5, fn)


def _pebble(P, a, r):
    def fn(cv, d, a=a, r=r):
        d.ellipse([a[0] - r, a[1] - r * 0.7, a[0] + r, a[1] + r * 0.35], fill=(160, 134, 100, 255))
        d.ellipse([a[0] - r * 0.9, a[1] - r * 0.75, a[0] + r * 0.6, a[1] + r * 0.05], fill=(208, 190, 160, 255))
        d.ellipse([a[0] - r * 0.6, a[1] - r * 0.7, a[0] + r * 0.05, a[1] - r * 0.3], fill=(236, 224, 200, 255))
    P.add(a[1] - 1, fn)


def add_path_details(P, v, cam):
    """Gras ragt über die Wegkante, ein paar Kiesel und Schneeklumpen (sparsam wie Hay Day)."""
    rng = np.random.default_rng(41)
    pts, nrm = path_samples(0.22)
    U = P.U
    for (x, y), (nx, ny) in zip(pts, nrm):
        for side in (-1, 1):
            if v['weg'] == 'sand':
                o = side * (WEG_HALF + rng.uniform(-0.03, 0.04))
            else:
                o = side * rng.choice([0.0, 0.0, 0.36])
            px, py = x + nx * o, y + ny * o
            if not in_view(cam, px, py, 0.5):
                continue
            onm = float(ffield(px, py)) > 0.25
            if onm and rng.uniform() < (0.55 if v['weg'] == 'sand' else 0.45):
                _tuft(P, P.p(px, py), rng, rng.uniform(0.8, 1.2))
        if v['weg'] == 'sand' and rng.uniform() < 0.12:
            o = rng.uniform(-0.3, 0.3)
            px, py = x + nx * o, y + ny * o
            if in_view(cam, px, py, 0.5):
                _pebble(P, P.p(px, py), rng.uniform(0.018, 0.032) * U)


def add_gate(P, v, cam):
    """Torpfosten am Zaun, wo der Weg durchgeht: dicker, Schneehaube, Adventskranz mit roter Schleife."""
    if not v.get('weg'):
        return
    U = P.U
    pts, keep = segs_for(v, 'zaun', 0.40, 0.95)
    gap = np.array([float(path_dist(x, y)[0]) < 0.95 for x, y in pts])
    n = len(pts)
    for i in range(n):
        if not keep[i] or gap[i] or not (gap[(i + 1) % n] or gap[i - 1]):
            continue
        a = P.p(*pts[i])

        def fn(cv, d, a=a):
            w, h = 0.085 * U, 0.62 * U
            d.polygon([(a[0] - w, a[1]), (a[0] + w, a[1]), (a[0] + w, a[1] - h), (a[0] - w, a[1] - h)], fill=(116, 76, 44, 255))
            d.polygon([(a[0] - w, a[1]), (a[0] - w * 0.05, a[1]), (a[0] - w * 0.05, a[1] - h), (a[0] - w, a[1] - h)], fill=(170, 122, 78, 255))
            d.ellipse([a[0] - w * 1.4, a[1] - h - w * 1.1, a[0] + w * 1.4, a[1] - h + w * 0.7], fill=(186, 204, 218, 255))
            d.ellipse([a[0] - w * 1.35, a[1] - h - w * 1.3, a[0] + w * 1.25, a[1] - h + w * 0.4], fill=(245, 244, 236, 255))
            c = (a[0], a[1] - h * 0.62)                                            # Kranz
            r = 0.085 * U
            d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=(34, 92, 46, 255), width=max(2, int(0.045 * U)))
            d.arc([c[0] - r, c[1] - r, c[0] + r, c[1] + r], 200, 320, fill=(70, 140, 70, 255), width=max(1, int(0.02 * U)))
            for k in range(5):
                q = (c[0] + np.cos(k * 1.3 + 0.4) * r, c[1] + np.sin(k * 1.3 + 0.4) * r)
                d.ellipse([q[0] - 0.014 * U, q[1] - 0.014 * U, q[0] + 0.014 * U, q[1] + 0.014 * U], fill=(214, 36, 44, 255))
            b = (c[0], c[1] + r * 0.9)
            d.polygon([b, (b[0] - 0.05 * U, b[1] - 0.03 * U), (b[0] - 0.05 * U, b[1] + 0.03 * U)], fill=(210, 30, 40, 255))
            d.polygon([b, (b[0] + 0.05 * U, b[1] - 0.03 * U), (b[0] + 0.05 * U, b[1] + 0.03 * U)], fill=(210, 30, 40, 255))
            d.polygon([b, (b[0] - 0.025 * U, b[1] + 0.09 * U), (b[0] - 0.005 * U, b[1] + 0.09 * U)], fill=(180, 24, 34, 255))
            d.polygon([b, (b[0] + 0.025 * U, b[1] + 0.09 * U), (b[0] + 0.005 * U, b[1] + 0.09 * U)], fill=(180, 24, 34, 255))

        def sh(ds, a=a):
            ds.ellipse([a[0] - 0.06 * U, a[1] - 0.03 * U, a[0] + 0.2 * U, a[1] + 0.06 * U], fill=180)
        P.add(a[1] + 1, fn)
        P.shadow.append(sh)


def _rock(P, a, r):
    def fn(cv, d, a=a, r=r):
        d.ellipse([a[0] - r, a[1] - r * 0.95, a[0] + r, a[1] + r * 0.25], fill=(90, 96, 108, 255))
        d.ellipse([a[0] - r * 0.95, a[1] - r * 1.0, a[0] + r * 0.82, a[1] + r * 0.02], fill=(144, 148, 156, 255))
        d.ellipse([a[0] - r * 0.8, a[1] - r * 0.96, a[0] + r * 0.15, a[1] - r * 0.4], fill=(180, 184, 190, 255))
        d.ellipse([a[0] - r * 0.7, a[1] - r * 1.18, a[0] + r * 0.6, a[1] - r * 0.66], fill=(184, 202, 216, 255))
        d.ellipse([a[0] - r * 0.68, a[1] - r * 1.24, a[0] + r * 0.52, a[1] - r * 0.76], fill=(245, 244, 236, 255))

    def sh(ds, a=a, r=r):
        ds.ellipse([a[0] - r * 0.6, a[1] - r * 0.3, a[0] + r * 1.5, a[1] + r * 0.45], fill=160)
    P.add(a[1], fn)
    P.shadow.append(sh)


def _reeds(P, a, rng):
    U = P.U * 1.6
    st = [(rng.uniform(-0.07, 0.07) * U, rng.uniform(0.28, 0.42) * U, rng.uniform(-0.04, 0.04) * U) for _ in range(rng.integers(4, 7))]
    lv = [(rng.uniform(-0.06, 0.06) * U, rng.uniform(0.16, 0.26) * U, rng.choice([-1, 1]) * rng.uniform(0.05, 0.1) * U) for _ in range(5)]

    def fn(cv, d, a=a, st=st, lv=lv):
        for dx, h, bend in lv:                                                      # Blätter
            b = (a[0] + dx, a[1])
            m = (a[0] + dx + bend * 0.4, a[1] - h * 0.6)
            tip = (a[0] + dx + bend, a[1] - h)
            d.polygon([(b[0] - 0.014 * U, b[1]), m, tip, (b[0] + 0.014 * U, b[1])], fill=(150, 170, 90, 255))
            d.line([b, m, tip], fill=(188, 200, 120, 255), width=max(1, int(0.008 * U)))
        for dx, h, lean in st:                                                      # Rohrkolben
            b, t = (a[0] + dx, a[1]), (a[0] + dx + lean, a[1] - h)
            d.line([b, t], fill=(120, 136, 70, 255), width=max(1, int(0.014 * U)))
            hc = (t[0] - lean * 0.1, t[1] + 0.05 * U)
            d.ellipse([hc[0] - 0.024 * U, hc[1] - 0.055 * U, hc[0] + 0.024 * U, hc[1] + 0.055 * U], fill=(112, 70, 38, 255))
            d.ellipse([hc[0] - 0.02 * U, hc[1] - 0.05 * U, hc[0] + 0.004 * U, hc[1] + 0.03 * U], fill=(150, 98, 56, 255))
            d.ellipse([hc[0] - 0.026 * U, hc[1] - 0.07 * U, hc[0] + 0.024 * U, hc[1] - 0.03 * U], fill=(245, 244, 236, 255))

    def sh(ds, a=a):
        ds.ellipse([a[0] - 0.08 * U, a[1] - 0.03 * U, a[0] + 0.22 * U, a[1] + 0.06 * U], fill=140)
    P.add(a[1], fn)
    P.shadow.append(sh)


def add_bank(P, v, cam):
    """Ufersteine mit Schneehaube am Bach und Teich (weltfest), Rohrkolben am Teich."""
    if not v.get('wasser'):
        return
    rng = np.random.default_rng(33)
    gx0, gy0 = cam.grid()
    lo_x, hi_x, lo_y, hi_y = gx0.min() - 2, gx0.max() + 2, gy0.min() - 2, gy0.max() + 2
    n = int(min((hi_x - lo_x) * (hi_y - lo_y) * 6, 60000))
    xs, ys = rng.uniform(lo_x, hi_x, n), rng.uniform(lo_y, hi_y, n)
    rs, rp = rng.uniform(0.08, 0.16, n), rng.uniform(0, 1, n)
    wet = water(xs, ys, v)
    near = np.zeros(n, bool)
    for ang in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        near |= water(xs + np.cos(ang) * 0.30, ys + np.sin(ang) * 0.30, v)
    idx = np.nonzero(~wet & near & (rp < 0.30))[0]
    placed = []
    U = P.U
    for i in idx:
        x, y = xs[i], ys[i]
        if not in_view(cam, x, y, 0.5) or any((x - a) ** 2 + (y - b) ** 2 < 1.4 ** 2 for a, b in placed):
            continue
        placed.append((x, y))
        _rock(P, P.p(x, y), rs[i] * U)
        for k in range(int(rp[i] * 10) % 3):                                   # kleine Nachbarsteine (Gruppe)
            ox, oy = np.cos(k * 2.3 + rp[i] * 9) * 0.22, np.sin(k * 2.3 + rp[i] * 9) * 0.22
            if not water(x + ox, y + oy, v):
                _rock(P, P.p(x + ox, y + oy), rs[i] * U * 0.55)
    rg = np.random.default_rng(35)
    for ph in (3.45, 4.35, 2.15):
        x, y = teich_rim(np.array(ph), 1.08)
        if in_view(cam, x, y, 0.5):
            _reeds(P, P.p(x, y), rg)
    for ph, k, nm, sc in ((4.05, 1.45, 'wild_cluster_4.webp', 0.22), (5.2, 1.5, 'wild_cluster_6.webp', 0.24)):
        x, y = teich_rim(np.array(ph), k)                                          # Felsgruppe/Busch hinter dem Teich
        if not in_view(cam, x, y, 1.0):
            continue
        im = sprite(nm, round(sc * cam.z * SS, 3))
        foot = P.p(x, y)

        def fn(cv, d, im=im, foot=foot):
            cv.alpha_composite(im, (int(foot[0] - im.width / 2), int(foot[1] - im.height * 0.95)))
        P.add(foot[1], fn)


def render(v, cam):
    img, f, gx, gy = ground(v, cam)
    P = Painter(cam)
    rng = np.random.default_rng(3)
    skip = (lambda x, y: abs(x - 5.5) < 1.5 and y > 9) if 'weg' in v.get('extra', ()) else None
    if v.get('weg'):
        skip = lambda x, y: float(path_dist(x, y)[0]) < 0.95          # noqa: E731
        add_path_details(P, v, cam)
        add_gate(P, v, cam)
    add_bank(P, v, cam)
    add_trees(P, v, cam)
    add_wall(P, v, rng, skip)
    add_fence(P, v, rng, skip)
    add_hedge(P, v, rng, skip)
    if not v.get('wasser'):
        add_stones(P, v, rng, cam)
    return Image.fromarray(np.clip(P.run(img), 0, 255).astype('uint8'))


# ---------------------------------------------------------------- Varianten
GRAS_G = G.lazy(G.grass, 37, (128, 184, 40), (160, 206, 62), (168, 214, 72), tufts=700, flowers=40, contrast=1.2)
GRAS_B = G.lazy(G.grass, 32, (84, 150, 40), (118, 178, 50), (124, 186, 56), flowers=90)
ALLE = ('L', 'R', 'VR', 'VL')
NAH_R = Cam(12.0, -14.0, 145)           # Rand hinten rechts, zur rechten Ecke hin
NAH_VL = Cam(4.0, 17.5, 145)            # Rand vorn links mit Zufahrt
WEIT = Cam(1.6, 1.6, 36)
K6B_RAND = {'L': 'wald', 'R': 'wald', 'VL': 'zaun', 'VR': 'bach'}


def varianten():
    return {
        'K1': dict(titel='Dichter Waldrand', gras=GRAS_G, rand={s: 'wald' for s in ALLE},
                   text='Ringsum dichter verschneiter Tannenwald, einzelne Tannen und Schollen treten auf die Wiese. Vorn niedriger und weiter weg.'),
        'K2': dict(titel='Trockenmauer + Wald', gras=GRAS_G, rand={s: 'mauer' for s in ALLE},
                   text='Niedrige Feldsteinmauer mit Schneekappe wie bei Hay-Day-Erweiterungen, dahinter lockerer Wald und Schnee.'),
        'K3': dict(titel='Holzzaun + Wald', gras=GRAS_G, rand={s: 'zaun' for s in ALLE},
                   text='Rustikaler Holzzaun mit Schneehauben, dahinter lockerer Wald. Sehr klar, wirkt wie eingezäunter Hof.'),
        'K4': dict(titel='Stechpalmenhecke + Wald', gras=GRAS_G, rand={s: 'hecke' for s in ALLE},
                   text='Dichte dunkelgrüne Hecke mit roten Beeren und Schnee obenauf (Weihnachten), dahinter Wald.'),
        'K5': dict(titel='Zugefrorener Bach + Wald', gras=GRAS_G, rand={s: 'bach' for s in ALLE},
                   text='Ein vereister Bach mit Ufersteinen umschließt die Wiese, dahinter dichter Wald.'),
        'K6': dict(titel='Mischung wie Hay Day', gras=GRAS_G,
                   rand={'L': 'wald', 'R': 'wald', 'VL': 'zaun', 'VR': 'bach'}, extra=('weg', 'see'),
                   nah=NAH_VL,
                   text='Hinten dichter Wald, vorn links Holzzaun mit Zufahrt (Feldweg), vorn rechts Bach zum Sternsee. Jede Seite anders, wie bei Hay Day.'),
        'K7': dict(titel='Mischung, Mauer statt Zaun', gras=GRAS_G,
                   rand={'L': 'wald', 'R': 'mauer', 'VL': 'hecke', 'VR': 'bach'}, extra=('weg', 'see'),
                   nah=NAH_VL,
                   text='Hinten links Wald, hinten rechts Trockenmauer, vorn links Hecke mit Zufahrt, vorn rechts Bach zum Sternsee.'),
        'K6B': dict(titel='K6 mit Gras B (saftig)', gras=GRAS_B,
                    rand={'L': 'wald', 'R': 'wald', 'VL': 'zaun', 'VR': 'bach'}, extra=('weg', 'see'),
                    nah=NAH_VL, flecken=0.22,
                    text='Wie K6, aber mit dem satteren Gras B zum Vergleich mit G (Hellgrün).'),
        # Runde 7: K6B mit neuem Weg, Teich am Bach, Bach geschlängelt (Hay-Day-Vorbild)
        'R7A': dict(titel='Sandweg + Eisteich', gras=GRAS_B, rand=K6B_RAND, flecken=0.22, weg='sand', wasser='eis',
                    text='Heller Sandweg wie Hay Day mit Gras über der Kante, Tor mit Kranz. Eisteich mit Glanz, Steinen, Rohrkolben am geschlängelten Bach.'),
        'R7B': dict(titel='Fahrspuren + Eisteich', gras=GRAS_B, rand=K6B_RAND, flecken=0.22, weg='spur', wasser='eis',
                    text='Zwei Fahrspuren mit gefrorenen Pfützen, dazwischen Gras (im Schnee: Schnee). Gleicher Eisteich wie A.'),
        'R7C': dict(titel='Sandweg + Eisloch', gras=GRAS_B, rand=K6B_RAND, flecken=0.22, weg='sand', wasser='loch',
                    text='Wie A, aber der Teich hat ein offenes Eisloch mit dunklem Wasser (Idee: später Eisangeln).'),
        # Runde 8 (Hannes 24.11.: R7C gewählt, Bach kräftiger, 3 Stufen bis wild)
        'R8B1': dict(titel='Bach 1: kräftiges Eis', gras=GRAS_B, rand=K6B_RAND, flecken=0.22, weg='sand', wasser='loch', bach=1,
                     text='Bach bleibt zugefroren, aber kräftig blau mit dunkler Uferwand und Schattensaum.'),
        'R8B2': dict(titel='Bach 2: offene Rinne', gras=GRAS_B, rand=K6B_RAND, flecken=0.22, weg='sand', wasser='loch', bach=2,
                     text='Eis am Rand, in der Mitte fließt dunkles Wasser in einer offenen Rinne.'),
        'R8B3': dict(titel='Bach 3: offen wie Hay Day', gras=GRAS_B, rand=K6B_RAND, flecken=0.22, weg='sand', wasser='loch', bach=3,
                     text='Breiter offener Bach in Hay-Day-Blau mit Erdufer, Strömungslinien und Schneehauben auf dem Ufer.'),
        # Runde 9 (Hannes 25.11.: R8B3, Bach mündet in offene Teichbucht, Weg + Bach aus dem Bild)
        'R9': dict(titel='Bachlauf mit Teichbucht', gras=GRAS_B, rand=K6B_RAND, flecken=0.22, weg='sand', wasser='loch', bach=3, lauf=True,
                   text='Bach kommt oben aus dem Wald, läuft am Wiesenrand entlang, mündet in eine offene Bucht des Teichs und fließt unten aus dem Bild. Weg führt aus dem Bild.'),
    }


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    NAH_T = Cam(PC[0] - 0.8, PC[1] + 0.6, 145)
    NAH_B = Cam(17.5, -4.0, 145)            # Bach weiter oben am rechten Rand
    for key, v in varianten().items():
        if ONLY and key not in ONLY:
            continue
        v['tex'] = v['gras']
        if key.startswith('R8') or key == 'R9':
            render(v, NAH_T).save(OUT / f'{key}_teich.jpg', quality=87)
            render(v, NAH_B).save(OUT / f'{key}_bach.jpg', quality=87)
        elif key.startswith('R7'):
            render(v, NAH_VL).save(OUT / f'{key}_weg.jpg', quality=87)
            render(v, NAH_T).save(OUT / f'{key}_teich.jpg', quality=87)
        else:
            render(v, v.get('nah', NAH_R)).save(OUT / f'{key}_nah.jpg', quality=87)
        render(v, WEIT).save(OUT / f'{key}_weit.jpg', quality=87)
        print(key, flush=True)
