"""Boden Runde 4 (Entscheidung 29): Gras im ganzen Tal, Schneelandschaft außerhalb, Übergang als dicke Schollen.

Je Variante zwei Ansichten: nah (Hof am Kartenrand, Schnee oben rechts) und ganz raus (ganzes Tal als Raute, Schnee drumherum).
Gras kachelt per Hex-Tiling wie ground.ts; Rand, Schollen, Verwehungen und Farbflecken liegen in Weltkoordinaten (kein Muster).

Aufruf: python scripts/boden_gras.py <ausgabeordner> [nur,diese]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

sys.argv = [sys.argv[0], sys.argv[1]] + sys.argv[2:]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import boden_mutig as BM  # noqa: E402  (Werkzeuge, Maße, Objekte)
from boden_mutig import (N, S, M, W, H, NAH, WEIT, pnoise, pblur, wnoise, blur, smooth, col, lerp,  # noqa: E402
                         colorize, lift, paint, light_dir_shade, load)
import boden_erzeugen as B  # noqa: E402

OUT = Path(sys.argv[1])


def blur_p(a, px):
    """Weichzeichnen ohne Umlauf (Rand gespiegelt), damit nichts von oben nach unten durchscheint."""
    p = int(px * 3) + 4
    return blur(np.pad(a, p, mode='reflect'), px)[p:-p, p:-p]


# ---------------------------------------------------------------- Gras (kachelt)
def grass(seed, dark, light, blade, count=70000, length=10, tufts=1600, tuft_col=None, flowers=0, frost=0.0, contrast=1.5):
    """Hay-Day-Technik: weiche Flecken, dichte kurze Halme, dazu kleine Grasbüschel (dunkler Fuß, helle Spitzen)."""
    rng = np.random.default_rng(seed)
    t = pblur(pnoise(seed, 300) * 0.6 + pnoise(seed + 1, 90) * 0.4, 6)
    img = colorize(np.clip((t - 0.5) * contrast + 0.5, 0, 1), dark, light)
    for c, n in ((blade, count), (lift(blade, 0.22), count // 2)):
        pts = rng.uniform(0, M, (n, 2))
        L = rng.uniform(0.6, 1.25, n) * length * S
        A = -np.pi / 2 + 0.12 + rng.normal(0, 0.3, n)
        tip = rng.uniform(0, 1, n) < frost
        hi, lo = lift(c, 0.30), lift(c, -0.30)

        def fn(d, i, x, y):
            ex, ey = x + np.cos(A[i]) * L[i], y + np.sin(A[i]) * L[i] * 2.0     # ×2: Boden wird für Iso 2:1 gestaucht
            d.line([(x + S, y + S * 1.2), (ex + S, ey + S * 1.2)], fill=lo + (110,), width=S)
            d.line([(x, y), (ex, ey)], fill=hi + (230,), width=S)
            if tip[i]:
                d.ellipse([ex - S * 1.2, ey - S * 1.8, ex + S * 1.2, ey + S * 1.8], fill=(236, 246, 255, 235))
        img = paint(img, fn, pts, 40)
    tc = tuft_col or lift(blade, -0.1)
    pts = rng.uniform(0, M, (tufts, 2))
    kb = rng.integers(5, 9, tufts)
    sz = rng.uniform(0.8, 1.3, tufts) * length * 1.6 * S

    def tuft(d, i, x, y):
        d.ellipse([x - sz[i] * 0.55, y - sz[i] * 0.24, x + sz[i] * 0.65, y + sz[i] * 0.44], fill=lift(tc, -0.35) + (120,))
        for k in range(kb[i]):
            a = -np.pi / 2 + (k / (kb[i] - 1) - 0.5) * 1.6
            ex, ey = x + np.cos(a) * sz[i], y + np.sin(a) * sz[i] * 2.0
            d.line([(x, y), ((x + ex) / 2 + np.cos(a) * 2, (y + ey) / 2), (ex, ey)], fill=lift(tc, 0.15) + (255,), width=int(S * 1.6))
            d.line([((x + ex) / 2, (y + ey) / 2), (ex, ey)], fill=lift(tc, 0.42) + (255,), width=S)
    img = paint(img, tuft, pts, 60)
    if flowers:
        pts = rng.uniform(0, M, (flowers, 2))
        kind = rng.integers(0, 2, flowers)

        def fl(d, i, x, y):
            petal = (255, 252, 246) if kind[i] == 0 else (255, 226, 120)
            for k in range(5):
                a = k / 5 * 2 * np.pi
                px, py = x + np.cos(a) * 3.2 * S, y + np.sin(a) * 4.4 * S
                d.ellipse([px - 2.4 * S, py - 3.6 * S, px + 2.4 * S, py + 3.6 * S], fill=petal + (255,))
            d.ellipse([x - 1.6 * S, y - 2.4 * S, x + 1.6 * S, y + 2.4 * S], fill=(236, 170, 40, 255))
        img = paint(img, fl, pts, 20)
    return img


# ---------------------------------------------------------------- Welt: Flecken, Kacheln, Rand, Schnee
def tone_patches(img, z, seed, k):
    """Große helle/dunkle Wiesenflecken wie Hay Day (Licht wandert über die Wiese)."""
    n = wnoise(H, W, seed, 700 * z) * 0.7 + wnoise(H, W, seed + 1, 240 * z) * 0.3
    return np.clip(img * (1 + (n - 0.5) * k)[..., None], 0, 255)


def checker(img, z, k):
    """Clash-Kachelmuster: ganz leichtes Rautenschach je Feld (zeigt das Raster, ohne Linien)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    tw, th = 116 * z, 58 * z
    u = np.floor(xx / tw + yy / th)
    v = np.floor(yy / th - xx / tw)
    c = ((u + v) % 2)[..., None]
    return img * (1 - c * k)


def edge_field(z, nah):
    """Abstand zum Kartenrand in Kacheln (positiv = innen/Gras, negativ = außen/Schnee), Rand gewellt."""
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    tile = 116 * z
    if nah:
        # Kartenrand läuft oben rechts diagonal durchs Bild (Iso-Richtung 2:1)
        x0 = W * 0.50
        d = ((yy - 0.5 * (xx - x0)) / (0.5 * tile)) / np.sqrt(5) * 2
    else:
        cx, cy, a = W * 0.5, H * 0.55, W * 0.44
        dd = np.abs(xx - cx) / a + np.abs(yy - cy) / (a / 2)
        d = (1 - dd) * a / tile * 0.9
    wob = (wnoise(H, W, 77, 420 * z) - 0.5) * 0.8 + (wnoise(H, W, 78, 110 * z) - 0.5) * 0.35
    return d + wob


def snow_mask(z, nah, seed, slabs=0.55, small=False):
    d = edge_field(z, nah)
    outside = smooth(0.02, -0.02, d) if False else (d < 0).astype(float)
    sc = 70 if small else 130
    n = wnoise(H, W, seed, sc * z) * 0.8 + wnoise(H, W, seed + 1, sc * 0.4 * z) * 0.2
    # einzelne Schollen auf dem Gras: dicht am Rand, nach innen (≈ 3 Kacheln) auslaufend
    reach = np.clip(1 - d / 3.0, 0, 1) * (d >= 0)
    thr = 0.76 - reach * 0.24 * slabs / 0.55
    sl = (n > thr).astype(float) * (reach > 0.02)
    m = np.clip(outside + sl, 0, 1)
    return blur_p(m, 0.6)


def shift(a, dy, dx):
    """Verschieben ohne Umlauf (Rand wird fortgesetzt)."""
    a = np.pad(a, ((abs(dy), abs(dy)), (abs(dx), abs(dx))), mode='edge')
    h, w = a.shape
    y0, x0 = abs(dy) - dy, abs(dx) - dx
    return a[y0:y0 + h - 2 * abs(dy), x0:x0 + w - 2 * abs(dx)]


def snow_render(img, z, m, seed, top=(238, 244, 255), shade=(176, 190, 236), side=(124, 142, 212), thick=6,
                drift=0.5):
    """Dicke Schneeschicht mit Volumen: Schlagschatten aufs Gras, Seitenkante, Oberseite mit Verwehungen und Körnung."""
    t = max(2, int(round(thick * z * 0.8)))
    topm = shift(m, -t, 0)
    sh = blur_p(shift(topm, int(t * 1.1), int(t * 1.2)), 1.4 * t)
    img = img * (1 - np.clip(sh, 0, 1)[..., None] * col((0.42, 0.36, 0.16)))
    img = lerp(img, col(side) * np.ones_like(img), np.clip(m - topm, 0, 1))
    rim = light_dir_shade(blur_p(topm, 2.4 * z), 3.0)
    h = blur_p(1 - np.abs(wnoise(H, W, seed + 5, 760 * z, aniso=1.5, angle=-0.4) * 2 - 1), 1.5 * z) ** 2
    dr = light_dir_shade(h, 50.0 / z) * drift
    g = wnoise(H, W, seed + 9, 3 * z) - 0.5
    tone = np.clip(0.72 + rim * 0.5 + dr * 0.6 + g * 0.16, 0, 1)
    snow = lerp(col(shade) * np.ones_like(img), col(top) * np.ones_like(img), tone)
    sp = (np.random.default_rng(seed).uniform(0, 1, (H, W)) > 0.9991) * topm
    snow = lerp(snow, np.full_like(img, 255.0), sp)
    return lerp(img, snow, topm), topm


# ---------------------------------------------------------------- Objekte
def objects(z, nah, snow_top):
    k = 0.36 * z
    kw = 0.30 * z
    rng = np.random.default_rng(5)
    obj = []
    if nah:
        pos = [('field_ripe.webp', 0.55, 0.80), ('field_half.webp', 0.74, 0.66), ('coop_v1.webp', 0.18, 0.86),
               ('field_sprout.webp', 0.40, 0.58), ('chicken_1.webp', 0.33, 0.88), ('chicken_3.webp', 0.28, 0.95),
               ('chicken_2.webp', 0.38, 0.97), ('wild_cluster_4.webp', 0.92, 0.84), ('wild_cluster_6.webp', 0.20, 0.36)]
        forest = [(0.60, 0.06), (0.74, 0.10), (0.86, 0.16), (0.97, 0.30), (0.70, 0.00), (0.92, 0.05), (0.82, 0.02)]
    else:
        pos = [('coop_v1.webp', 0.38, 0.44), ('coop_v1.webp', 0.60, 0.40), ('field_ripe.webp', 0.46, 0.60),
               ('field_half.webp', 0.56, 0.66), ('field_sprout.webp', 0.66, 0.56), ('field_ripe.webp', 0.36, 0.62),
               ('field_soil.webp', 0.50, 0.76), ('wild_cluster_5.webp', 0.27, 0.56), ('wild_cluster_4.webp', 0.74, 0.62),
               ('wild_cluster_6.webp', 0.50, 0.25)]
        forest = []
        dens = wnoise(H, W, 91, 300 * z)
        for _ in range(4000):
            x, y = rng.uniform(0, 1), rng.uniform(0, 1.04)
            if len(forest) >= 95:
                break
            px, py = int(x * (W - 1)), int(min(y, 0.999) * (H - 1))
            if snow_top[py, px] > 0.5 and dens[py, px] > rng.uniform(0.35, 0.75) and                     all((x - a) ** 2 + ((y - b) * 0.56) ** 2 > 0.0016 for a, b in forest):
                forest.append((x, y))
    for name, fx, fy in pos:
        kk = kw if name.startswith('wild') else k * (0.55 if name.startswith('chicken') else 1.0)
        obj.append((load(name, kk), fx * W, fy * H, name))
    for j, (fx, fy) in enumerate(forest):
        name = f'wild_cluster_{1 + j % 3}.webp'
        obj.append((load(name, kw * rng.uniform(0.85, 1.15)), fx * W, fy * H, name))
    return obj


def render(v, z, nah):
    rep = 320 * z
    tex = v['tex']()
    if rep < tex.shape[0]:
        tex = np.asarray(Image.fromarray(np.clip(tex, 0, 255).astype('uint8')).resize((int(rep), int(rep)), Image.LANCZOS), float)
    img = B.hex_render(tex, W, H, rep)
    img = tone_patches(img, z, 40, v.get('flecken', 0.18))
    if v.get('kacheln'):
        img = checker(img, z, v['kacheln'])
    if v.get('schnee_feld'):
        snow_top = np.zeros((H, W))
    else:
        m = snow_mask(z, nah, 50, v.get('schollen', 0.55), v.get('klein', False))
        img, snow_top = snow_render(img, z, m, 60, **v.get('schnee', {}))
    ys, xs = np.mgrid[0:H, 0:W]
    img = img * (1.04 - 0.06 * ys / H - 0.03 * xs / W)[..., None]
    obj = objects(z, nah, snow_top)
    img = BM.contact_shadow(img, obj)
    img = BM.place(img, obj)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'))


def lazy(f, *a, **k):
    box = []

    def get():
        if not box:
            box.append(f(*a, **k))
        return box[0]
    return get


def varianten():
    v = {}
    v['A'] = dict(titel='Clash-Gras mit Kachelmuster',
                  text='Gelbgrünes kurzes Gras, ganz leichtes Rautenschach je Feld wie bei Clash. Ruhig, Gebäude stechen heraus.',
                  tex=lazy(grass, 31, (128, 160, 40), (156, 184, 52), (160, 190, 58), tufts=900), kacheln=0.035, flecken=0.12)
    v['B'] = dict(titel='Hay-Day-Wiese, saftig',
                  text='Sattes Grün mit großen hellen und dunklen Flecken, Grasbüscheln und vereinzelten Christrosen.',
                  tex=lazy(grass, 32, (84, 150, 40), (118, 178, 50), (124, 186, 56), flowers=90), flecken=0.22)
    v['C'] = dict(titel='Winterwiese, kühler',
                  text='Etwas kühleres, gedecktes Grün mit Raureif an den Halmspitzen. Passt farblich zum Schnee.',
                  tex=lazy(grass, 33, (78, 132, 70), (110, 158, 88), (124, 170, 104), frost=0.06, tuft_col=(112, 160, 98)), flecken=0.18)
    v['D'] = dict(titel='Smaragd satt (mutig)',
                  text='Tiefes, sattes Grün mit kräftigen gemalten Flecken. Maximaler Kontrast zu Schnee und roten Dächern.',
                  tex=lazy(grass, 34, (40, 118, 52), (78, 152, 62), (88, 166, 72), contrast=2.2), flecken=0.3)
    v['E'] = dict(titel='Hay-Day-Wiese, viele kleine Schollen',
                  text='Wie B, aber der Schneerand zerfällt in viele kleine Schollen statt weniger großer.',
                  tex=v['B']['tex'], flecken=0.22, klein=True, schollen=0.7)
    v['G'] = dict(titel='Hay-Day-Hellgrün',
                  text='Hell und gelbgrün wie im Hay-Day-Store-Bild, ruhig mit wenigen Büscheln. Sehr freundlich.',
                  tex=lazy(grass, 37, (128, 184, 40), (160, 206, 62), (168, 214, 72), tufts=700, flowers=40, contrast=1.2), flecken=0.15)
    v['F'] = dict(titel='Gegenprobe: Schneefeld wie Clash „Snow Day“',
                  text='Clash hat auch Winterkarten mit Schneefeld. Zum Vergleich: blauer Schnee mit Kachelmuster statt Gras.',
                  tex=lazy(BM.snow_tex, 35, (150, 182, 226), (196, 216, 244)), kacheln=0.03, flecken=0.1)
    return v


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
    for key, v in varianten().items():
        if only and key not in only:
            continue
        for z, tag, nah in ((NAH, 'nah', True), (WEIT * 0.85, 'weit', False)):
            render(v, z, nah).save(OUT / f'g{key}_{tag}.jpg', quality=87)
        print(key, flush=True)
