"""Zeichnet die Karte aus winterhof.json als Abnahmebild in Spielansicht (schräg von oben, wie am Handy).
Nur Plan-Farben, keine Spielgrafik. Aufruf: python scripts/karte_bild.py -> docs/qa/neustart/b02b_karte.png"""
import json, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
c = json.loads((ROOT / 'src/content/winterhof.json').read_text(encoding='utf-8'))
m = c['map']; ox, oy = m['origin']['gx'], m['origin']['gy']
H, W = len(m['terrain']), len(m['terrain'][0])
P = m['plots']; S = P['size']; px0, py0 = P['origin']['gx'], P['origin']['gy']
TW, TH = 28, 14                       # Kachel im Bild (Raute)
COL = {'forest': (52, 98, 66), 'mountain': (128, 128, 140), 'ice': (168, 214, 236), 'snow': (240, 245, 250),
       'road': (160, 120, 86), 'plaza': (200, 164, 118)}
OBS = {'drift': (255, 255, 255), 'rock': (110, 104, 98), 'ice': (90, 190, 230), 'pine': (30, 120, 60)}
FIX = {'sleigh': 'Schlitten', 'wishlistBoard': 'Auftragstafel', 'farmStand': 'Hofladen', 'mailbox': 'Briefkasten', 'dailyChest': 'Truhe'}

ext_x = (W + H) * TW // 2 + 40
img = Image.new('RGB', (ext_x, (W + H) * TH // 2 + 170), (255, 255, 255)); d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('arial.ttf', 12); big = ImageFont.truetype('arialbd.ttf', 18); mid = ImageFont.truetype('arialbd.ttf', 13)
except OSError:
    font = big = mid = ImageFont.load_default()
X0 = H * TW // 2 + 20; Y0 = 60


def iso(gx, gy):
    x, y = gx - ox, gy - oy
    return X0 + (x - y) * TW / 2, Y0 + (x + y) * TH / 2


def diamond(gx, gy, w=1, h=1):
    a = iso(gx, gy); b = iso(gx + w, gy); cc = iso(gx + w, gy + h); e = iso(gx, gy + h)
    return [a, b, cc, e]


for y in range(H):
    for x in range(W):
        t = m['legend']['terrain'][m['terrain'][y][x]]; s = m['legend']['surface'][m['surface'][y][x]]
        d.polygon(diamond(ox + x, oy + y), fill=COL[s] if s != 'none' else COL[t], outline=(222, 228, 236) if t == 'snow' else None)
# Landstücke: Grenzen + Stufe
for r in range(P['rows']):
    for cl in range(P['cols']):
        pid = f'{cl},{r}'; gx, gy = px0 + cl * S, py0 + r * S
        start = pid in P['start']
        d.polygon(diamond(gx, gy, S, S), outline=(200, 40, 40) if start else (70, 110, 210), width=3 if start else 1)
        lvl = P['levels'].get(pid)
        if lvl:
            cx, cy = iso(gx + S / 2, gy + S / 2); d.text((cx - 22, cy - 7), f'ab {lvl}', fill=(20, 90, 160), font=mid)
# Hindernisse
for o in m['obstacles']:
    kind, size = o['type'].split('_'); n = 2 if size == 'large' else 1
    cx, cy = iso(o['gx'] + n / 2, o['gy'] + n / 2); rr = 4 if n == 1 else 8
    d.ellipse([cx - rr, cy - rr / 1.4, cx + rr, cy + rr / 1.4], fill=OBS[kind], outline=(40, 40, 40))
# Start-Objekte
for o in c['start']['objects']:
    fp = c['footprints'].get(o['type'], c['footprints'].get(o['kind'], {'w': 1, 'h': 1}))
    fixed = o['type'] in m['fixed']
    d.polygon(diamond(o['gx'], o['gy'], fp['w'], fp['h']), fill=(236, 150, 40) if fixed else (190, 120, 200), outline=(60, 40, 20))
    if fixed:
        cx, cy = iso(o['gx'] + fp['w'], o['gy'] + fp['h'] / 2); d.text((cx + 3, cy - 6), FIX[o['type']], fill=(120, 60, 0), font=font)
cx, cy = iso(4 + 1, 3 + 1); d.text((cx - 18, cy - 24), 'Chalet', fill=(90, 30, 110), font=mid)
# See-Name, Himmelsrichtungen
lake = [(ox + x, oy + y) for y in range(H) for x in range(W) if m['terrain'][y][x] == 'I']
lx = sum(p[0] for p in lake) / len(lake); ly = sum(p[1] for p in lake) / len(lake)
cx, cy = iso(lx, ly); d.text((cx - 50, cy - 8), 'See (Name offen)', fill=(20, 70, 120), font=mid)
cx, cy = iso(ox + 2, oy + 2); d.text((cx - 70, cy + 10), 'Berge (hinten)', fill=(60, 60, 70), font=mid)
cx, cy = iso(7.5, oy + H - 1); d.text((cx + 12, cy - 4), 'Zufahrt', fill=(110, 70, 30), font=mid)

d.text((16, 14), 'Winterhof Baustein 2b: Alpental in Spielansicht (Planfarben, keine Grafik)', fill=(30, 30, 30), font=big)
leg = ['rot = Start-Hof 10×10 (4 Landstücke)', 'blau = Landstück 5×5 zum Kaufen, „ab 13“ = Ufer', 'orange = feste Stationen am Hofplatz, lila = frei verschiebbar',
       'Punkte: weiß Schneewehe, grau Fels, hellblau Eis, grün Tanne (groß = 2×2)']
for i, t in enumerate(leg):
    d.text((16, img.height - 95 + i * 20), t, fill=(40, 40, 40), font=font)
out = ROOT / 'docs/qa/neustart/b02b_karte.png'; img.save(out); print(out)
