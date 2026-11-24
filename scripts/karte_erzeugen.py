"""Erzeugt die Karte des Alpentals in src/content/winterhof.json -> map (Baustein 2b, KARTEN_KONZEPT.md).

Schreibt nur die Ebenen terrain/surface und die Hindernis-Ebene (Objekt-Ebene wie in Tiled).
Alles andere in map (plots, fixed, legend) ist Hand-Daten und bleibt, wie es ist.
Deterministisch: gleicher Aufruf = gleiche Karte. Danach von Hand nachbessern ist erlaubt,
dann dieses Skript nicht erneut laufen lassen (oder die Änderung hier einbauen).

Aufruf: python scripts/karte_erzeugen.py
"""
import json, math, pathlib, random

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = ROOT / 'src/content/winterhof.json'
c = json.loads(PATH.read_text(encoding='utf-8'))
m = c['map']

# ---------------------------------------------------------------- Maße
OX, OY = -21, -21           # linke obere Ecke der Karte
W, H = 54, 43               # gx -21..32, gy -21..21
P = m['plots']
TX0, TY0, SIZE = P['origin']['gx'], P['origin']['gy'], P['size']
TX1, TY1 = TX0 + P['cols'] * SIZE - 1, TY0 + P['rows'] * SIZE - 1   # Tal: -13..16
ROAD_X = (7, 8)             # Zufahrt, 2 Felder breit
PLAZA = (6, 10, 9, 11)      # Hofplatz x0, y0, x1, y1
LAKE_C, LAKE_R = (24.5, -6.0), (5.2, 8.4)


def noise(x, y, seed=0):
    """Glattes Rauschen 0..1 aus Gitterwerten (deterministisch)."""
    def h(ix, iy):
        n = (ix * 374761393 + iy * 668265263 + seed * 2147483647) & 0xFFFFFFFF
        n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
        return ((n ^ (n >> 16)) & 0xFFFF) / 0xFFFF
    x0, y0 = math.floor(x), math.floor(y)
    fx, fy = x - x0, y - y0
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * sx
    b = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * sx
    return a + (b - a) * sy


def in_tal(gx, gy):
    return TX0 <= gx <= TX1 and TY0 <= gy <= TY1


def lake_dist(gx, gy):
    dx, dy = (gx - LAKE_C[0]) / LAKE_R[0], (gy - LAKE_C[1]) / LAKE_R[1]
    return math.hypot(dx, dy) + (noise(gx / 3, gy / 3, 7) - 0.5) * 0.25


def terrain(gx, gy):
    if in_tal(gx, gy):
        return '.'
    if ROAD_X[0] <= gx <= ROAD_X[1] and gy > TY1:
        return '.'                                  # Zufahrt liegt auf Schnee
    ld = lake_dist(gx, gy)
    if ld < 1.0:
        return 'I'                                  # zugefrorener See
    if ld < 1.5 and gx > TX1:
        return '.'                                  # Uferwiese zwischen Tal und See
    back = gx < TX0 or gy < TY0
    if back:
        d = max(TX0 - gx, TY0 - gy)                 # Abstand zum Tal auf der Bergseite
        # Berge am höchsten hinten (obere Ecke), zu den Seitenecken hin mehr Wald
        side = (gy - TY0) if gx < TX0 else (gx - TX0)
        band = 2 + round(noise(gx / 4, gy / 4, 3) * 2.2) + max(0, side) * 0.22
        return 'F' if d <= band else 'M'
    return 'F'


def surface(gx, gy):
    if PLAZA[0] <= gx <= PLAZA[2] and PLAZA[1] <= gy <= PLAZA[3]:
        return 'P'
    if ROAD_X[0] <= gx <= ROAD_X[1] and gy > PLAZA[3]:
        return 'R'
    return '.'


m['origin'] = {'gx': OX, 'gy': OY}
m['terrain'] = [''.join(terrain(OX + x, OY + y) for x in range(W)) for y in range(H)]
m['surface'] = [''.join(surface(OX + x, OY + y) for x in range(W)) for y in range(H)]

# ---------------------------------------------------------------- Hindernisse
START = {tuple(map(int, k.split(','))) for k in P['start']}
LAKESIDE = {tuple(map(int, k.split(','))) for k in P.get('levels', {})}
OB = c['obstacles']
blocked = set()
for gy in range(TY0, TY1 + 1):
    for gx in range(TX0, TX1 + 1):
        if surface(gx, gy) != '.':
            blocked.add((gx, gy))
# Start-Hof: von Hand gesetzt (Einführung: zwei Schneewehen, ein Fels, zwei kleine Tannen)
obstacles = [
    {'type': 'drift_small', 'gx': 2, 'gy': 6},
    {'type': 'drift_small', 'gx': 11, 'gy': 6},
    {'type': 'rock_small', 'gx': 2, 'gy': 2},
    {'type': 'pine_small', 'gx': 11, 'gy': 2},
    {'type': 'pine_small', 'gx': 2, 'gy': 11},
]
for o in obstacles:
    blocked.add((o['gx'], o['gy']))


def kind_weights(col, row):
    if (col, row) in LAKESIDE:
        return {'ice': 0.4, 'drift': 0.3, 'pine': 0.15, 'rock': 0.15}
    if row <= 1 or col <= 1:
        return {'rock': 0.35, 'pine': 0.3, 'drift': 0.35}
    return {'pine': 0.35, 'drift': 0.45, 'rock': 0.2}


for row in range(P['rows']):
    for col in range(P['cols']):
        if (col, row) in START:
            continue
        rnd = random.Random(f'winterhof-{col}-{row}')
        x0, y0 = TX0 + col * SIZE, TY0 + row * SIZE
        wanted = 5 + rnd.randint(0, 2)
        kinds = kind_weights(col, row)
        placed = tries = 0
        while placed < wanted and tries < 200:
            tries += 1
            kind = rnd.choices(list(kinds), weights=list(kinds.values()))[0]
            size = 2 if rnd.random() < 0.3 else 1
            gx, gy = x0 + rnd.randint(0, SIZE - size), y0 + rnd.randint(0, SIZE - size)
            cells = [(gx + dx, gy + dy) for dx in range(size) for dy in range(size)]
            if any(cl in blocked for cl in cells):
                continue
            blocked.update(cells)
            obstacles.append({'type': f'{kind}_{"large" if size == 2 else "small"}', 'gx': gx, 'gy': gy})
            placed += 1

for o in obstacles:
    assert o['type'] in OB, o
m['obstacles'] = sorted(obstacles, key=lambda o: (o['gy'], o['gx']))

PATH.write_text(json.dumps(c, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Karte {W}x{H}, Tal {TX1 - TX0 + 1}x{TY1 - TY0 + 1}, {len(obstacles)} Hindernisse')
