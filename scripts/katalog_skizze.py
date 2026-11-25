"""Aufstellungsbild Größenkatalog (Baustein 5b, Maßstab D): alle Objekte auf ihrer Grundfläche, Person als Maß.

Eine Quelle: Grundfläche und Höhe kommen aus src/content/winterhof.json -> sizes, Bilder aus art.sprites
(art_src/spiel{m}/objekte{tps}). Vorhandene Bilder in Zielhöhe, fehlende als Klötzchen, Gehege als Zaun mit Stall.
Wird auch von scripts/pruefe_assets.py für docs/qa/aufstellung.png benutzt.

Aufruf: python scripts/katalog_skizze.py [ausgabe.jpg]   (Standard: docs/qa/neustart/b05b_katalog.jpg)
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'src' / 'content' / 'winterhof.json'
SPR = ROOT / 'art_src' / 'spiel{m}' / 'objekte{tps}'
S = 0.5                                    # Bildmaßstab der Skizze (1 Kachel = tilePx * S Bildpunkte)


def schrift(fett=False, groesse=17):
    for name in (('segoeuib.ttf', 'arialbd.ttf') if fett else ('segoeui.ttf', 'arial.ttf')):
        try:
            return ImageFont.truetype(name, groesse)
        except OSError:
            continue
    return ImageFont.load_default()


# Reihen der Aufstellung: Titel, Gruppen aus dem Katalog, Farbe der Klötzchen
REIHEN = [
    ('Gebäude', ('building',), (200, 140, 100)),
    ('Wahrzeichen, Hof-Objekte, Felder', ('landmark', 'prop', 'field'), (170, 120, 80)),
    ('Gehege (6 Tiere) und Tiere', ('pen', 'animal'), (170, 130, 90)),
    ('Deko', ('deco', 'path'), (190, 90, 90)),
    ('Hindernisse (räumbar)', ('obstacle',), (150, 160, 175)),
]
# Namen für Hof-Objekte, die in den Daten keinen eigenen Namen tragen (nur Beschriftung)
PROP_NAMEN = {'chalet': 'Chalet', 'christmasTree': 'Weihnachtsbaum', 'wishlistBoard': 'Wunschtafel', 'sleigh': 'Schlitten',
              'mailbox': 'Briefkasten', 'dailyChest': 'Truhe', 'farmStand': 'Hofladen', 'field': 'Feld', 'person': 'Person'}


def name_of(c, key):
    for teil in ('stations', 'pens', 'decorations', 'obstacles', 'animals'):
        if key in c[teil]:
            return c[teil][key]['name']
    return PROP_NAMEN.get(key, key)


def sprite_of(c, key):
    """Erstes Bild, das auf diesen Katalog-Eintrag verweist (oder None)."""
    for k, sp in c['art']['sprites'].items():
        if sp['size'] == key and (SPR / sp['file']).exists():
            return k
    return None


def eintraege(c):
    """Katalog als Reihen: [(Titel, Farbe, [(key, name, sprite, w, h, höhe), ...])]."""
    sizes = c['sizes']
    out = []
    for titel, gruppen, farbe in REIHEN:
        liste = [(k, name_of(c, k), sprite_of(c, k), v.get('w', 1), v.get('h', 1), v['heightTiles'])
                 for k, v in sizes.items() if v['group'] in gruppen]
        out.append((titel, farbe, liste))
    return out


def zeichne_katalog(c, out_path):
    T = c['art']['tilePx']
    TW = T * S
    F, FB = schrift(), schrift(True, 26)
    cache = {}

    def bild(key):
        if key not in cache:
            cache[key] = Image.open(SPR / c['art']['sprites'][key]['file']).convert('RGBA')
        return cache[key]

    def raute(cx, cy, w, h):
        def p(a, b):
            return cx + (a - b) * TW / 2, cy + (a + b) * TW / 4
        return [p(-w / 2, -h / 2), p(w / 2, -h / 2), p(w / 2, h / 2), p(-w / 2, h / 2)]

    def klotz(d, cx, cy, w, h, hp, farbe, f=None):
        f = f if f is not None else min(0.9, 0.5 * hp / ((w + h) * TW / 4))
        top = raute(cx, cy, w * f, h * f)
        up = max(4, hp - (top[2][1] - top[0][1]))
        _, b, cc, e = top
        d.polygon([e, cc, (cc[0], cc[1] - up), (e[0], e[1] - up)], fill=tuple(int(v * 0.8) for v in farbe))
        d.polygon([cc, b, (b[0], b[1] - up), (cc[0], cc[1] - up)], fill=tuple(int(v * 0.65) for v in farbe))
        d.polygon([(x, y - up) for x, y in top], fill=farbe)

    def setze(im, key, hoehe, px, py):
        sp = bild(key)
        hp = hoehe * TW
        wp = sp.width * hp / sp.height                     # nie verzerren: Breite aus dem Bild
        r = sp.resize((max(1, round(wp)), max(1, round(hp))), Image.LANCZOS)
        a = c['art']['sprites'][key]['anchorY']
        im.paste(r, (round(px - wp / 2), round(py - hp * a)), r)

    def zeichne(im, d, cx, cy, e, farbe):
        key, name, spr, w, h, ht = e
        grp = c['sizes'][key]['group']
        d.polygon(raute(cx, cy, w, h), fill=(140, 190, 70, 255), outline=(60, 100, 30, 255))
        hp = ht * TW
        if grp == 'field':                                 # Acker mit Pflanzen in Pflanzenhöhe
            d.polygon(raute(cx, cy, w, h), fill=(122, 82, 48, 255))
            crop = sprite_of(c, 'crop')
            if crop:
                for a in range(w):
                    for b in range(h):
                        setze(im, crop, c['sizes']['crop']['heightTiles'], cx + (a - b + (h - w) / 2) * TW / 2,
                              cy + (a + b + 1 - (w + h) / 2) * TW / 4)
        elif grp == 'pen':                                 # Zaun + Stall in der hinteren Ecke, Höhe = Katalog
            d.polygon(raute(cx, cy, w, h), fill=(150, 120, 80, 255))

            def pt(a, b):
                return cx + (a - b) * TW / 2, cy + (a + b) * TW / 4
            st = 1.6
            sx, sy = pt(-w / 2 + st / 2 + 0.1, -h / 2 + st / 2 + 0.1)
            boden_y = cy + (w + h) * TW / 8
            up = hp - (boden_y - (sy - st * TW / 4))       # Stall so hoch, dass das Ganze die Katalog-Höhe hat
            top = raute(sx, sy, st, st)
            _, b, cc, ee = top
            d.polygon([ee, cc, (cc[0], cc[1] - up), (ee[0], ee[1] - up)], fill=tuple(int(v * 0.8) for v in farbe))
            d.polygon([cc, b, (b[0], b[1] - up), (cc[0], cc[1] - up)], fill=tuple(int(v * 0.65) for v in farbe))
            d.polygon([(x, y - up) for x, y in top], fill=(110, 110, 120))
            tier = c['pens'][key]['animal']
            tspr = sprite_of(c, tier)
            for a2, b2 in [(0.3, -0.4), (-0.4, 0.5), (0.6, 0.6)]:
                px, py = pt(a2 * w / 2, b2 * h / 2)
                if tspr:
                    setze(im, tspr, c['sizes'][tier]['heightTiles'], px, py)
                else:
                    klotz(d, px, py, 0.4, 0.4, c['sizes'][tier]['heightTiles'] * TW, farbe, 1)
            zaun = 0.28 * TW
            ecken = raute(cx, cy, w, h)
            for i in range(4):
                p, q = ecken[i], ecken[(i + 1) % 4]
                d.line([(p[0], p[1] - zaun), (q[0], q[1] - zaun)], fill=(110, 70, 40, 255), width=3)
                for t in range(9):
                    x0 = p[0] + (q[0] - p[0]) * t / 8
                    y0 = p[1] + (q[1] - p[1]) * t / 8
                    d.line([(x0, y0), (x0, y0 - zaun)], fill=(110, 70, 40, 255), width=3)
        elif spr and ht > 0:
            setze(im, spr, ht, cx, cy)
        elif ht > 0:
            klotz(d, cx, cy, w, h, hp, farbe)
        else:
            d.polygon(raute(cx, cy, w * 0.92, h * 0.92), fill=(200, 175, 130, 255))
        txt = f'{name}\n{w}×{h} · {str(ht).replace(".", ",")}' if 'w' in c['sizes'][key] else f'{name}\n{str(ht).replace(".", ",")}'
        tw = d.multiline_textbbox((0, 0), txt, font=F, align='center')[2]
        d.multiline_text((cx - tw / 2, cy + (w + h) * TW / 4 + 8), txt, font=F, fill=(25, 25, 25), align='center')

    person = ('person', 'Person', sprite_of(c, 'person'), 1, 1, c['sizes']['person']['heightTiles'])
    reihen = eintraege(c)
    GAP = 52
    mess = ImageDraw.Draw(Image.new('RGB', (1, 1)))

    def platz(e):
        """Breite je Eintrag: Grundfläche oder Beschriftung, was breiter ist (Namen überlappen nie)."""
        return max((e[3] + e[4]) * TW / 2, mess.textlength(e[1], font=F) + 8)
    maße = []
    for _, _, liste in reihen:
        alle = [person] + liste
        maße.append((max(e[5] for e in alle) * TW + 30, max((e[3] + e[4]) * TW / 4 for e in alle) + 60))
    W = max(sum(platz(e) + GAP for e in [person] + l) for _, _, l in reihen) + 60
    H = sum(a + b + 100 for a, b in maße) + 40
    im = Image.new('RGB', (int(W), int(H)), (236, 240, 230))
    d = ImageDraw.Draw(im, 'RGBA')
    y = 20
    for (titel, farbe, liste), (hoch, tief) in zip(reihen, maße):
        d.text((24, y), titel, font=FB, fill=(30, 30, 30))
        boden = y + 40 + hoch
        for k in range(int(hoch / TW) + 1):              # Linien je Kachel Höhe
            ly = boden - k * TW
            d.line([(0, ly), (W, ly)], fill=(0, 0, 0, 22 if k else 50), width=1)
            d.text((4, ly - 18), f'{k}', font=F, fill=(120, 120, 120))
        x = 40
        for e in [person] + liste:
            bw = platz(e)
            zeichne(im, d, x + bw / 2, boden, e, farbe)
            x += bw + GAP
        y = boden + tief + 60
    out_path.parent.mkdir(parents=True, exist_ok=True)
    im.save(out_path, quality=88)
    return im.size


if __name__ == '__main__':
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'docs' / 'qa' / 'neustart' / 'b05b_katalog.jpg'
    print(out, zeichne_katalog(json.loads(CONTENT.read_text(encoding='utf-8')), out))
