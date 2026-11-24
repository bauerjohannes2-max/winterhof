"""Erzeugt die Karte des Alpentals in src/content/winterhof.json -> map (Baustein 2b, KARTEN_KONZEPT.md).

Schreibt nur origin, die Ebenen terrain/surface, die Hindernis-Ebene (Objekt-Ebene wie in Tiled) und places.
Alles andere in map (plots, fixed, legend) ist Hand-Daten und bleibt, wie es ist.
Deterministisch: gleicher Aufruf = gleiche Karte. Danach von Hand nachbessern ist erlaubt,
dann dieses Skript nicht erneut laufen lassen (oder die Änderung hier einbauen).

Natürliche Verteilung (Rückmeldung Hannes 24.11.: „gleichmäßig gestreut“ ist nicht Hay-Day-Niveau):
- Berge: tiefe Kulisse hinten, Baumgrenze unregelmäßig (Waldzungen ziehen hinauf, Felsrippen herunter).
- Hindernisse in Gruppen: Felsnester zu den Bergen hin, Tannenhaine an den Waldrändern, Eis am Ufer,
  Schneewehen locker dazwischen. Gruppen-Mittelpunkte mit Mindestabstand (Poisson-Scheibe), Art nach Gegend.

Aufruf: python scripts/karte_erzeugen.py
"""
import json, math, pathlib, random

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = ROOT / 'src/content/winterhof.json'
c = json.loads(PATH.read_text(encoding='utf-8'))
m = c['map']

# ---------------------------------------------------------------- Maße
OX, OY = -27, -27           # linke obere Ecke der Karte (hinten tiefe Bergkulisse)
W, H = 60, 49               # gx -27..32, gy -27..21
P = m['plots']
TX0, TY0, SIZE = P['origin']['gx'], P['origin']['gy'], P['size']
TX1, TY1 = TX0 + P['cols'] * SIZE - 1, TY0 + P['rows'] * SIZE - 1   # Tal: -13..16
ROAD_X = (7, 8)             # Zufahrt, 2 Felder breit
PLAZA = (6, 10, 9, 11)      # Hofplatz x0, y0, x1, y1
LAKE_C, LAKE_R = (24.5, -6.0), (5.2, 8.4)
LAKE_NAME = 'Sternsee'      # Hannes 24.11.


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


def fbm(x, y, seed):
    """Zwei Oktaven: große Formen + kleine Zacken."""
    return 0.65 * noise(x / 6, y / 6, seed) + 0.35 * noise(x / 2.5, y / 2.5, seed + 1)


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
    if gx < TX0 or gy < TY0:                        # Bergseite (beide hinteren Ränder)
        d = max(TX0 - gx, TY0 - gy)                 # Abstand zum Tal
        # Zu den Seitenecken hin sinkt das Gebirge ab, dort mehr Wald
        side = min(1.0, max(0, (gy - TY0) if gx < TX0 else (gx - TX0)) / (TX1 - TX0 + 8))
        # Baumgrenze: Waldzungen ziehen hinauf, Felsrippen bis ans Tal herunter; zu den Ecken mehr Wald
        line = 0.6 + fbm(gx, gy, 3) * 5.2 + side * side * 5.0
        return 'F' if d <= line else 'M'
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

# ---------------------------------------------------------------- Besondere Orte (nur diese tragen Namen)
lake = [(OX + x, OY + y) for y in range(H) for x in range(W) if m['terrain'][y][x] == 'I']
lcx = round(sum(p[0] for p in lake) / len(lake)); lcy = round(sum(p[1] for p in lake) / len(lake))
assert terrain(lcx, lcy) == 'I'
m['places'] = [{'id': 'lake', 'name': LAKE_NAME, 'gx': lcx, 'gy': lcy}]

# ---------------------------------------------------------------- Hindernisse
START = {tuple(map(int, k.split(','))) for k in P['start']}
LAKESIDE = {tuple(map(int, k.split(','))) for k in P.get('levels', {})}
OB = c['obstacles']


def plot_of(gx, gy):
    return ((gx - TX0) // SIZE, (gy - TY0) // SIZE)


blocked = set()
for gy in range(TY0, TY1 + 1):
    for gx in range(TX0, TX1 + 1):
        if surface(gx, gy) != '.' or plot_of(gx, gy) in START:
            blocked.add((gx, gy))
# Start-Hof: von Hand gesetzt (Einführung: zwei Schneewehen, ein Fels, zwei kleine Tannen)
obstacles = [
    {'type': 'drift_small', 'gx': 2, 'gy': 6},
    {'type': 'drift_small', 'gx': 11, 'gy': 6},
    {'type': 'rock_small', 'gx': 2, 'gy': 2},
    {'type': 'pine_small', 'gx': 11, 'gy': 2},
    {'type': 'pine_small', 'gx': 2, 'gy': 11},
]
# Abstandsfelder zur Kulisse
cells = [(OX + x, OY + y, m['terrain'][y][x]) for y in range(H) for x in range(W)]
forest = [(x, y) for x, y, t in cells if t == 'F']
mount = [(x, y) for x, y, t in cells if t == 'M']
ice = [(x, y) for x, y, t in cells if t == 'I']


def dist_to(pts, gx, gy):
    return min(math.hypot(gx - x, gy - y) for x, y in pts)


def kind_weights(gx, gy):
    """Art einer Gruppe nach Gegend: Fels zu den Bergen (hinten), Tanne am Waldrand, Eis am Ufer.
    Schneewehen bilden keine Gruppen, sie liegen locker überall (Schritt 3)."""
    back = (TX1 + TY1 - gx - gy) / (TX1 + TY1 - TX0 - TY0)          # 1 = hinterste Ecke, 0 = vorn
    df, di = dist_to(forest, gx, gy), dist_to(ice, gx, gy)
    return {
        'rock': 0.08 + 1.6 * back ** 2,
        'pine': 0.12 + 1.2 * math.exp(-df / 2.5),
        'ice': (2.2 + 1.5 * math.exp(-di / 3)) if plot_of(gx, gy) in LAKESIDE else 0.0,
    }


def free(cells_):
    return all(in_tal(x, y) and (x, y) not in blocked for x, y in cells_) and \
        len({plot_of(x, y) for x, y in cells_}) == 1


def put(kind, gx, gy, size):
    cl = [(gx + dx, gy + dy) for dx in range(size) for dy in range(size)]
    if not free(cl):
        return False
    blocked.update(cl)
    obstacles.append({'type': f'{kind}_{"large" if size == 2 else "small"}', 'gx': gx, 'gy': gy})
    return True


rnd = random.Random('winterhof-gruppen-v2')
# 1. Gruppen-Mittelpunkte: Poisson-Scheibe (Mindestabstand), damit Gruppen nicht verkleben
centers = []
cand = [(x, y) for y in range(TY0, TY1 + 1) for x in range(TX0, TX1 + 1) if (x, y) not in blocked]
rnd.shuffle(cand)
for p in cand:
    if all(math.hypot(p[0] - q[0], p[1] - q[1]) >= 4.6 for q in centers):
        centers.append(p)

# 2. Jede Gruppe: Kern (oft groß) + 2–5 kleine Glieder dicht drumherum, selten eine fremde Art dazwischen
for cx, cy in centers:
    w = kind_weights(cx, cy)
    kind = rnd.choices(list(w), weights=list(w.values()))[0]
    big = {'rock': 0.5, 'pine': 0.45, 'ice': 0.35}[kind]
    # großer Kern: so verschieben, dass 2×2 ganz in einem Landstück liegt
    bx = cx - 1 if (cx - TX0) % SIZE == SIZE - 1 else cx
    by = cy - 1 if (cy - TY0) % SIZE == SIZE - 1 else cy
    if not (rnd.random() < big and put(kind, bx, by, 2)):
        put(kind, cx, cy, 1)
    members = 2 + rnd.randint(0, 4)
    tries = 0
    while members > 0 and tries < 40:
        tries += 1
        a = rnd.random() * math.tau
        r = 1.0 + abs(rnd.gauss(0, 0.6))
        gx, gy = round(cx + 0.5 + math.cos(a) * r), round(cy + 0.5 + math.sin(a) * r)
        k = kind if rnd.random() < 0.85 else 'drift'
        if put(k, gx, gy, 1):
            members -= 1

# 3. Lose Schneewehen überall (blaues Rauschen: Mindestabstand 3), dann je Landstück mindestens 5 Hindernisse
cand = [(x, y) for y in range(TY0, TY1 + 1) for x in range(TX0, TX1 + 1)]
rnd.shuffle(cand)
loose = []
for gx, gy in cand:
    if len(loose) >= 40:
        break
    if all(math.hypot(gx - a, gy - b) >= 3 for a, b in loose) and             not any(abs(gx - o['gx']) <= 1 and abs(gy - o['gy']) <= 1 for o in obstacles) and             put('drift', gx, gy, 2 if rnd.random() < 0.15 else 1):
        loose.append((gx, gy))
for row in range(P['rows']):
    for col in range(P['cols']):
        if (col, row) in START:
            continue
        x0, y0 = TX0 + col * SIZE, TY0 + row * SIZE
        have = sum(1 for o in obstacles if plot_of(o['gx'], o['gy']) == (col, row))
        tries = 0
        while have < 5 and tries < 200:
            tries += 1
            gx, gy = x0 + rnd.randint(0, SIZE - 1), y0 + rnd.randint(0, SIZE - 1)
            near = any(abs(gx - o['gx']) <= 1 and abs(gy - o['gy']) <= 1 for o in obstacles)
            if (not near or tries > 120) and put('drift', gx, gy, 1):   # Abstand nur, solange es Platz gibt
                have += 1

# 4. Kein Landstück überladen (höchstens 9): zuerst lose Schneewehen, dann Randglieder entfernen
for row in range(P['rows']):
    for col in range(P['cols']):
        if (col, row) in START:
            continue
        mine = [o for o in obstacles if plot_of(o['gx'], o['gy']) == (col, row)]
        mine.sort(key=lambda o: (not o['type'].startswith('drift'), o['type'].endswith('large')))
        for o in mine[:max(0, len(mine) - 9)]:
            obstacles.remove(o)

for o in obstacles:
    assert o['type'] in OB, o
m['obstacles'] = sorted(obstacles, key=lambda o: (o['gy'], o['gx']))

PATH.write_text(json.dumps(c, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
per = {}
for o in obstacles:
    per[plot_of(o['gx'], o['gy'])] = per.get(plot_of(o['gx'], o['gy']), 0) + 1
print(f'Karte {W}x{H}, Tal {TX1 - TX0 + 1}x{TY1 - TY0 + 1}, {len(centers)} Gruppen, {len(obstacles)} Hindernisse, '
      f'je Landstück {min(per.values())}..{max(per.values())}, Orte: {m["places"]}')
