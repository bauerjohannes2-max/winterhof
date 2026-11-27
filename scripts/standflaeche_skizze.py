"""Skizze Baustein 7 (Standflächen + Kontaktschatten): billige Vergleichsskizze, keine Spielgrafik.

Echte Platzhalter-Bilder aus art_src auf der Wiese, je Variante eine andere Standfläche/Schatten-Regel.
Aufruf: python scripts/standflaeche_skizze.py <ausgabedatei.jpg> [runde]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def gaussian_filter(a, sigma):
    """Weichzeichnen ohne scipy: Gauss per FFT, Rand gespiegelt."""
    pad = int(3 * sigma) + 1
    b = np.pad(a, pad, mode='reflect')
    fy = np.fft.fftfreq(b.shape[0])[:, None]
    fx = np.fft.rfftfreq(b.shape[1])[None, :]
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    return np.fft.irfft2(np.fft.rfft2(b) * g, s=b.shape)[pad:-pad, pad:-pad]


ROOT = Path(__file__).resolve().parent.parent
D = json.loads((ROOT / 'src/content/winterhof.json').read_text(encoding='utf-8'))
SPR = D['art']['sprites']
OBJ = ROOT / 'art_src/spiel{m}/objekte{tps}'
WIESE = Image.open(ROOT / 'art_src/spiel{m}/boden/wiese.png').convert('RGB')

PW, PH, TW = 820, 620, 104               # Feldgröße, Kachelbreite in Pixel
ERDE = np.array((150, 112, 70), float)
SCHATTEN = np.array((40, 60, 70), float)  # kühles Blaugrau, nie Schwarz

# Aufstellung: (Bild, gx, gy) – Grundfläche aus sizes
AUF = [('winter_chalet', 0, 0), ('gift_workshop', 5, 0), ('deco_pine', 0, 5), ('deco_lantern', 3.5, 4),
       ('christmas_tree', 5, 4)]
MITTE = (3.4, 3.4)


def size_of(key):
    return D['sizes'][SPR[key]['size']]


def proj(gx, gy):
    return (PW / 2 + (gx - gy - (MITTE[0] - MITTE[1])) * TW / 2, PH / 2 + (gx + gy - (MITTE[0] + MITTE[1])) * TW / 4)


def wiese():
    s = WIESE.resize((int(WIESE.width * 0.5), int(WIESE.height * 0.5)), Image.LANCZOS)
    bg = Image.new('RGB', (PW, PH))
    for x in range(0, PW, s.width):
        for y in range(0, PH, s.height):
            bg.paste(s, (x, y))
    return np.asarray(bg, float)


def raute_maske(gx, gy, w, h, rand=0.0):
    m = Image.new('L', (PW, PH), 0)
    pts = [proj(gx - rand, gy - rand), proj(gx + w + rand, gy - rand), proj(gx + w + rand, gy + h + rand),
           proj(gx - rand, gy + h + rand)]
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.asarray(m, float) / 255


def mische(img, farbe, a):
    return img * (1 - a[..., None]) + farbe * a[..., None]


def boden(img, key, gx, gy, v):
    sz = size_of(key)
    w, h = sz.get('w', 1), sz.get('h', 1)
    gross = sz['group'] == 'building'
    if v['pad'] and (gross or v['pad_alle']):
        m = gaussian_filter(raute_maske(gx, gy, w, h, v['pad_rand']), TW * v['pad_weich'])
        m = np.clip((m - 0.25) / 0.5, 0, 1)
        if v['pad'] == 'dunkel':
            img = img * (1 - 0.20 * m[..., None])
            grau = img.mean(axis=2, keepdims=True)
            img = img * (1 - 0.25 * m[..., None]) + grau * 0.25 * m[..., None]
        else:  # festgetreten: Erde schimmert durch, unregelmäßiger Rand
            rng = np.random.default_rng(int(gx * 10 + gy))
            n = gaussian_filter(rng.random((PH, PW)), TW * 0.12)
            n = (n - n.mean()) / (n.std() + 1e-6)
            m2 = np.clip(m * (0.75 + 0.35 * n), 0, 1)
            img = mische(img, ERDE, 0.65 * m2)
    # Kontaktschatten: Grundfläche, nach unten rechts versetzt, weich
    k = raute_maske(gx + v['sch_versatz'], gy + v['sch_versatz'] * 0.3, w, h, 0.05)
    k = gaussian_filter(k, TW * v['sch_weich'])
    ao = gaussian_filter(raute_maske(gx, gy, w, h, 0.0), TW * 0.05)
    a = np.clip(v['sch_staerke'] * k + v['ao'] * ao, 0, 0.6)
    return mische(img, SCHATTEN, a)


def bild(key):
    return Image.open(OBJ / SPR[key]['file']).convert('RGBA')


def platz(key, gx, gy):
    """Bild in Zielgröße + linke obere Ecke (Bodenpunkt = Mitte der Grundfläche)."""
    sz = size_of(key)
    w, h = sz.get('w', 1), sz.get('h', 1)
    px, py = proj(gx + w / 2, gy + h / 2)
    sp = bild(key)
    hp = sz['heightTiles'] * TW
    wp = sp.width * hp / sp.height
    r = sp.resize((round(wp), round(hp)), Image.LANCZOS)
    return r, (round(px - wp / 2), round(py - hp * SPR[key]['anchorY']))


def alpha_auf_feld(r, pos, dy=0):
    m = Image.new('L', (PW, PH), 0)
    m.paste(r.getchannel('A'), (pos[0], pos[1] + dy))
    return np.asarray(m, float) / 255


def bildschatten(img, key, gx, gy, v):
    """Schatten aus der Bildform: enge Kontaktlinie an der Unterkante + kurzer weicher Wurf nach unten rechts."""
    r, pos = platz(key, gx, gy)
    a = alpha_auf_feld(r, pos)
    # Kontakt: Bildform leicht nach unten geschoben, eng weich, nur unter dem Bild sichtbar
    k = gaussian_filter(alpha_auf_feld(r, pos, round(TW * 0.035)), TW * 0.035)
    unten = np.zeros_like(a)
    rows = np.where(a.max(axis=1) > 0.5)[0]
    fuss = rows.max() if len(rows) else 0
    unten[max(0, fuss - round(TW * 0.35)):, :] = 1           # nur der Fuß des Objekts wirft Kontakt
    kontakt = np.clip(k * unten * v['kontakt'], 0, 1)
    wurf = 0
    if v['wurf'] and (not v.get('fleck_nur') or size_of(key)['group'] in v['fleck_nur']):
        sz = size_of(key)
        w, h = sz.get('w', 1), sz.get('h', 1)
        breite = r.width
        cx, cy = pos[0] + breite / 2 + TW * 0.10, fuss - breite * 0.10
        e = Image.new('L', (PW, PH), 0)
        rx, ry = breite * 0.50, breite * 0.17
        ImageDraw.Draw(e).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
        wurf = gaussian_filter(np.asarray(e, float) / 255, TW * 0.07) * v['wurf']
    return mische(img, SCHATTEN, np.clip(kontakt + wurf, 0, 0.65))


def feld(v):
    img = wiese()
    for key, gx, gy in AUF:
        if v.get('bild'):
            img = bildschatten(img, key, gx, gy, v)
        else:
            img = boden(img, key, gx, gy, v)
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')
    for key, gx, gy in sorted(AUF, key=lambda t: t[1] + t[2] + size_of(t[0]).get('w', 1) + size_of(t[0]).get('h', 1)):
        r, pos = platz(key, gx, gy)
        im.alpha_composite(r, pos)
    return im.convert('RGB')


RUNDEN = {
    '1': [
        ('A  Nur Schatten (Hay Day)', dict(pad=None, pad_alle=False, pad_rand=0, pad_weich=0, sch_versatz=0.18,
                                          sch_weich=0.10, sch_staerke=0.38, ao=0.15)),
        ('B  Dunklere Grasfläche (Clash)', dict(pad='dunkel', pad_alle=True, pad_rand=0.25, pad_weich=0.08,
                                              sch_versatz=0.18, sch_weich=0.10, sch_staerke=0.38, ao=0.15)),
        ('C  Festgetretener Vorplatz', dict(pad='erde', pad_alle=False, pad_rand=0.35, pad_weich=0.10,
                                           sch_versatz=0.18, sch_weich=0.10, sch_staerke=0.38, ao=0.15)),
    ],
    '2': [
        ('A1  Runde 1 (wirkt schwebend)', dict(pad=None, pad_alle=False, pad_rand=0, pad_weich=0, sch_versatz=0.18,
                                              sch_weich=0.10, sch_staerke=0.38, ao=0.15)),
        ('A2  Enge Kontaktlinie', dict(bild=True, kontakt=1.0, wurf=0.0)),
        ('A3  Kontaktlinie + weicher Fleck', dict(bild=True, kontakt=0.9, wurf=0.32)),
    ],
    '3': [
        ('A2  Nur Kontaktlinie', dict(bild=True, kontakt=1.0, wurf=0.0)),
        ('Vorschlag: Linie, Baum/Laterne + Fleck', dict(bild=True, kontakt=1.0, wurf=0.30,
                                                     fleck_nur=('deco', 'tree', 'animal', 'landmark'))),
    ],
}


def main():
    out = Path(sys.argv[1])
    runde = sys.argv[2] if len(sys.argv) > 2 else '1'
    vs = RUNDEN[runde]
    font = ImageFont.truetype('arialbd.ttf', 30)
    blatt = Image.new('RGB', (PW * len(vs) + 20 * (len(vs) - 1), PH + 56), (245, 242, 235))
    for i, (titel, v) in enumerate(vs):
        x = i * (PW + 20)
        blatt.paste(feld(v), (x, 56))
        ImageDraw.Draw(blatt).text((x + 12, 12), titel, fill=(40, 40, 40), font=font)
    out.parent.mkdir(parents=True, exist_ok=True)
    blatt.save(out, quality=90)
    print(out)


if __name__ == '__main__':
    main()
