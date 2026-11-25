"""Boden Runde 5 (Entscheidung 30): nur die Karte. Hay-Day-Wiese im Spielfeld, klare gerade Spielfeldkante wie Clash,
außen dunklerer Wildgras-Streifen, dann Schnee mit Schollen und verschneitem Wald. Keine Gebäude.

Aufruf: python scripts/boden_rand.py <ausgabeordner> [nur,diese]
"""
import sys
from pathlib import Path
import numpy as np
from scipy import ndimage
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boden_gras as G  # noqa: E402
from boden_gras import (W, H, NAH, WEIT, wnoise, smooth, col, lerp, blur_p, grass, tone_patches, checker,  # noqa: E402
                        snow_render, lazy, load)
import boden_mutig as BM  # noqa: E402
import boden_erzeugen as B  # noqa: E402

OUT = Path(sys.argv[1])


def edge_dist(z, nah):
    """Gerader Abstand zur Spielfeldkante in Kacheln (positiv = Spielfeld)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    perp = 116 * z * 58 * z / np.hypot(116 * z, 58 * z)          # Breite einer Kachel quer zur Kante
    if nah:                                                        # Kante läuft oben rechts diagonal durchs Bild
        x0 = W * 0.02
        return (yy - 0.5 * (xx - x0)) / np.hypot(1, 0.5) / perp
    cx, cy, a = W * 0.5, H * 0.56, W * 0.36
    b = a / 2
    dd = np.abs(xx - cx) / a + np.abs(yy - cy) / b
    return (1 - dd) * (a * b / np.hypot(a, b)) / perp


def hex_tex(tex, z):
    rep = 320 * z
    t = tex()
    if rep < t.shape[0]:
        t = np.asarray(Image.fromarray(np.clip(t, 0, 255).astype('uint8')).resize((int(rep), int(rep)), Image.LANCZOS), float)
    return B.hex_render(t, W, H, rep)


def dirt_line(img, z, d, width=0.06, color=(156, 124, 70)):
    """Schmale Erdkante direkt am Spielfeldrand (Clash): leicht unterbrochen, mit dunklerem Saum."""
    w = width
    m = smooth(-w - 0.03, -w, d) * smooth(0.02, -0.01, d)
    brk = smooth(0.30, 0.62, wnoise(H, W, 81, 26 * z))
    m = m * (0.25 + 0.75 * brk)
    img = lerp(img, col(color) * np.ones_like(img), m * 0.7)
    seam = smooth(-w - 0.10, -w - 0.03, d) * smooth(-w + 0.0, -w - 0.03, d)
    return img * (1 - seam[..., None] * 0.18)


def forest(z, nah, snow_top, count):
    rng = np.random.default_rng(7)
    dens = wnoise(H, W, 91, 300 * z)
    pts = []
    for _ in range(6000):
        if len(pts) >= count:
            break
        x, y = rng.uniform(-0.02, 1.02), rng.uniform(0, 1.06)
        px, py = int(np.clip(x, 0, 1) * (W - 1)), int(min(y, 0.999) * (H - 1))
        md = 0.004 if nah else 0.0016
        if snow_top[py, px] > 0.6 and dens[py, px] > rng.uniform(0.3, 0.7) and \
                all((x - a) ** 2 + ((y - b) * 0.56) ** 2 > md for a, b in pts):
            pts.append((x, y))
    kw = 0.30 * z
    return [(load(f'wild_cluster_{1 + j % 3}.webp', kw * rng.uniform(0.85, 1.15)), x * W, y * H, 'wild')
            for j, (x, y) in enumerate(pts)]


def render(v, z, nah):
    d = edge_dist(z, nah)
    inner = hex_tex(v['wiese'], z)
    inner = tone_patches(inner, z, 40, 0.15)
    if v.get('kacheln'):
        inner = checker(inner, z, v['kacheln'])
    band = hex_tex(v['streifen'], z)
    band = tone_patches(band, z, 41, 0.22)
    field = (d >= 0).astype(float)
    field = blur_p(field, 0.7)
    img = lerp(band, inner, field)
    if v.get('erdlinie'):
        img = dirt_line(img, z, d)
    # Schnee: beginnt hinter dem Streifen, Rand gewellt; Schollen liegen auf dem Streifen
    bw = v['breite']
    wob = (wnoise(H, W, 77, 420 * z) - 0.5) * 1.6 + (wnoise(H, W, 78, 110 * z) - 0.5) * 0.7
    if v.get('wall'):
        snow = (d < -0.02).astype(float)
    else:
        snow = (d < -bw + wob).astype(float)
        n = wnoise(H, W, 50, 130 * z) * 0.8 + wnoise(H, W, 51, 52 * z) * 0.2
        reach = np.clip(1 + (d + 0.35) / max(bw - 0.35, 0.1), 0, 1)        # 0 am Spielfeld, 1 am Schnee
        thr = 0.78 - reach * 0.22 * v.get('schollen', 1.0)
        # nur ganze Schollen: jede Scholle, die bis an das Spielfeld reicht, fällt weg (keine angeschnittenen Halbmonde)
        lab, _ = ndimage.label((n > thr) & (d < 0) & (d > -bw + wob))
        bad = np.unique(lab[(d > -0.45) & (lab > 0)])
        slabs = (lab > 0) & ~np.isin(lab, bad)
        snow = np.clip(snow + slabs, 0, 1)
    img, snow_top = snow_render(img, z, blur_p(snow, 0.6), 60, thick=v.get('dicke', 6))
    ys, xs = np.mgrid[0:H, 0:W]
    img = img * (1.04 - 0.06 * ys / H - 0.03 * xs / W)[..., None]
    obj = forest(z, nah, snow_top, 18 if nah else 110)
    for name, fx, fy in (v.get('hindernisse_nah') if nah else v.get('hindernisse_weit')) or []:
        obj.append((load(name, 0.30 * z), fx * W, fy * H, 'wild'))
    img = BM.contact_shadow(img, obj)
    img = BM.place(img, obj)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'))


WIESE_G = lazy(grass, 37, (128, 184, 40), (160, 206, 62), (168, 214, 72), tufts=700, flowers=40, contrast=1.2)
WIESE_B = lazy(grass, 32, (84, 150, 40), (118, 178, 50), (124, 186, 56), flowers=90)
STREIFEN = lazy(grass, 38, (80, 134, 40), (100, 152, 48), (112, 166, 58), count=50000, tufts=3200, length=11, contrast=1.5)
STREIFEN_REIF = lazy(grass, 39, (70, 122, 64), (96, 146, 80), (110, 160, 96), tufts=2600, length=13, frost=0.12,
                     tuft_col=(104, 150, 92), contrast=1.8)
HN = [('wild_cluster_4.webp', 0.16, 0.86), ('wild_cluster_6.webp', 0.42, 0.97)]
HW = [('wild_cluster_5.webp', 0.40, 0.58), ('wild_cluster_4.webp', 0.60, 0.70), ('wild_cluster_6.webp', 0.52, 0.42)]


def varianten():
    base = dict(wiese=WIESE_G, streifen=STREIFEN, hindernisse_nah=HN, hindernisse_weit=HW)
    return {
        'K1': dict(base, titel='Clash-Kante: Erdlinie + Wildgras-Streifen',
                   text='Gerade Kante mit schmaler Erdlinie, außen 2,5 Felder dunkleres Wildgras mit Schneeschollen, dann Schnee und Wald.',
                   breite=2.5, erdlinie=True),
        'K2': dict(base, titel='Schmaler Streifen ohne Erdlinie',
                   text='Kante nur durch den Farbsprung hell/dunkel, Streifen 1 Feld breit. Schnee kommt früher.',
                   breite=1.2, schollen=0.6),
        'K3': dict(base, titel='Schneewall direkt an der Kante',
                   text='Das Spielfeld endet direkt an einer dicken Schneeschicht mit sichtbarer Kante. Am deutlichsten.',
                   breite=0, wall=True, dicke=9),
        'K4': dict(base, streifen=STREIFEN_REIF, titel='Breite Raureif-Wildwiese',
                   text='Erdlinie, dann 4 Felder bereifte Wildwiese mit vielen Schollen. Weicher Übergang in den Schnee.',
                   breite=4.0, erdlinie=True, schollen=1.2),
        'K5': dict(base, titel='Wie K1 plus Kachelschach (Clash pur)',
                   text='K1 mit ganz leichtem Rautenschach im Spielfeld. Zeigt das Raster, ohne Linien.',
                   breite=2.5, erdlinie=True, kacheln=0.03),
        'K6': dict(base, wiese=WIESE_B, titel='Wie K1 mit saftiger Wiese',
                   text='K1, innen aber die sattere Hay-Day-Wiese B statt Hellgrün.',
                   breite=2.5, erdlinie=True),
    }


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
    for key, v in varianten().items():
        if only and key not in only:
            continue
        for z, tag, nah in ((NAH, 'nah', True), (WEIT * 0.85, 'weit', False)):
            render(v, z, nah).save(OUT / f'{key}_{tag}.jpg', quality=87)
        print(key, flush=True)
