"""Zeichnet die Karte aus winterhof.json als Draufsicht (Abnahmebild Baustein 2).
Aufruf: python scripts/karte_bild.py  ->  docs/qa/neustart/b02_karte.png"""
import json, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
c = json.loads((ROOT / 'src/content/winterhof.json').read_text(encoding='utf-8'))
m = c['map']; ox, oy = m['origin']['gx'], m['origin']['gy']
H, W = len(m['terrain']), len(m['terrain'][0]); K = 24
COL = {'forest': (46, 92, 64), 'snow': (232, 240, 248), 'road': (150, 112, 80), 'plaza': (196, 160, 112)}
img = Image.new('RGB', (W * K + 2, H * K + 40), (255, 255, 255)); d = ImageDraw.Draw(img)
try: font = ImageFont.truetype('arial.ttf', 11); big = ImageFont.truetype('arialbd.ttf', 16)
except OSError: font = big = ImageFont.load_default()
for y in range(H):
    for x in range(W):
        t = m['legend']['terrain'][m['terrain'][y][x]]; s = m['legend']['surface'][m['surface'][y][x]]
        d.rectangle([x*K+1, y*K+41, x*K+K, y*K+K+40], fill=COL[s] if s != 'none' else COL[t], outline=(214, 222, 232))
zones = [('Start', m['starterBounds'], (200, 40, 40))] + [(z['name'] if 'name' in z else z['id'], z['bounds'], (40, 90, 200)) for z in c['landZones']]
for name, b, col in zones:
    x0, y0 = (b['x0']-ox)*K+1, (b['y0']-oy)*K+41; x1, y1 = (b['x1']-ox+1)*K, (b['y1']-oy+1)*K+40
    d.rectangle([x0, y0, x1, y1], outline=col, width=2); d.text((x0+3, y0+2), name, fill=col, font=font)
d.text((6, 10), 'Winterhof-Karte aus Daten (Draufsicht): grün Wald, weiß Schnee, braun Weg/Platz, rot Start, blau Grundstücke', fill=(30, 30, 30), font=big)
out = ROOT / 'docs/qa/neustart/b02_karte.png'; img.save(out); print(out)
