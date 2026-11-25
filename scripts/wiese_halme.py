"""Wiese nach Hay-Day-Technik (Analyse Hannes-Screenshots 25.11.2026, VORBILD_ANALYSE §11).

Aufbau wie Hay Day: fast glatte Grundfarbe, wenige große, weiche Einzelhalme (meist heller, einige dunkler).
Gelbliche Trockenflecken macht der Shader in Weltkoordinaten (in der Textur würden sie sich als Muster wiederholen).
Keine Blumen, Pilze oder Büschel in der Textur: die kommen als eigene Boden-Deko, die Gebäuden ausweicht.

Nahtlos (1024 px, Hex-Tiling im Shader). Halme senkrecht ×2 gemalt (Boden wird für Iso 2:1 gestaucht).
Aufruf als Modul: wiese(seed, **stil) -> N×N×3 float. Maße in Texturpunkten (1 Weltpunkt ≈ 2,9 px).
"""
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from boden_mutig import N, S, M, pnoise, pblur, colorize, lift, paint  # noqa: E402


def _halm(d, x, y, h, w, a, c):
    """Spitz zulaufender, leicht gebogener Halm als Fläche (Fuß bei x,y, nach oben)."""
    bend = a * 0.3
    pts_l, pts_r = [], []
    for t in np.linspace(0, 1, 7):
        cx = x + np.sin(a) * h * t + np.sin(bend) * h * 0.25 * t * t
        cy = y - h * t
        ww = w * (1 - t) ** 0.8 / 2
        pts_l.append((cx - ww, cy))
        pts_r.append((cx + ww, cy))
    d.polygon(pts_l + pts_r[::-1], fill=c)


def wiese(seed=7, base=(128, 190, 40), dark=(112, 172, 34), light=(170, 210, 70),
          n_light=110, n_dark=30, height=95, width=12, soft=1.3, cloud=0.45, lean=0.16):
    rng = np.random.default_rng(seed)
    # Grund: fast glatt, nur große weiche Wolken (Hay Day: ±4 % Helligkeit)
    t = pnoise(seed, 260) * 0.7 + pnoise(seed + 1, 120) * 0.3
    t = np.clip((t - 0.5) * 1.6 * cloud + 0.5, 0, 1)
    img = colorize(t, dark, base)

    def blades(img, pts, cols, hmul):
        H = rng.uniform(0.6, 1.15, len(pts)) * height * S * hmul
        Wd = rng.uniform(0.75, 1.2, len(pts)) * width * S
        A = rng.normal(0.0, lean, len(pts))

        def fn(d, i, x, y):
            _halm(d, x, y, H[i], Wd[i], A[i], cols[i])
        return paint(img, fn, pts, int(height * S * 1.3))

    def clumps(n):
        """n Gruppen à 1–3 Halme, eng beieinander (Hay Day malt Halme meist in kleinen Gruppen)."""
        c = rng.uniform(0, M, (n, 2))
        k = rng.integers(1, 4, n)
        return np.concatenate([(c[i] + rng.normal(0, width * S * 0.9, (k[i], 2))) % M for i in range(n)])

    # dunkle Halme zuerst (liegen tiefer), dann helle
    pts = clumps(n_dark)
    cols = [lift(dark, -0.12) + (int(a),) for a in rng.uniform(90, 150, len(pts))]
    img = blades(img, pts, cols, 0.9)
    pts = clumps(n_light)
    cols = [lift(light, rng.uniform(-0.05, 0.15)) + (int(a),) for a in rng.uniform(110, 190, len(pts))]
    img = blades(img, pts, cols, 1.0)
    # weich wie gemalt (Hay-Day-Halme haben keine harten Kanten)
    return pblur(img, soft)


# ---------------------------------------------------------------- Runde 2 (25.11. spät): gemalte Halme
# Hannes: Halme „zackig“. Hay Day nah (Screenshots 1000325439/461): Grund kräftig gelbgrün (Median 140/189/14),
# Halme dünn, lang, leicht gebogen, in Fächern aus einem Fuß; der Fuß verschwindet im Grund (Deckkraft läuft von 0
# am Fuß zur Spitze hoch), dadurch keine harten V-Formen. Dichte schwankt in großen Wolken (Lücken + dichte Stellen).

def _halm_weich(d, x, y, h, w, a, c, alpha, steps=9):
    """Halm in Abschnitten: Deckkraft steigt vom Fuß (0) zur Mitte, Spitze läuft schmal aus."""
    bend = a * 0.45
    pts = []
    for t in np.linspace(0, 1, steps + 1):
        cx = x + np.sin(a) * h * t + np.sin(bend) * h * 0.3 * t * t
        pts.append((cx, y - h * t, w * (1 - t) ** 0.7 / 2))
    for i in range(steps):
        (x0, y0, w0), (x1, y1, w1) = pts[i], pts[i + 1]
        t = (i + 0.5) / steps
        k = min(1.0, t / 0.55) ** 1.4 * (1 - 0.25 * t)
        d.polygon([(x0 - w0, y0), (x1 - w1, y1), (x1 + w1, y1), (x0 + w0, y0)], fill=c + (int(alpha * k),))


def wiese_gemalt(seed=11, base=(140, 189, 16), dark=(128, 178, 12), light=(168, 206, 44),
                 tufts=150, per=(3, 6), height=120, width=7.0, spread=0.32, alpha=(70, 130),
                 n_dark=0.25, soft=0.9, cloud=0.35, dens_contrast=1.0):
    rng = np.random.default_rng(seed)
    t = pnoise(seed, 260) * 0.7 + pnoise(seed + 1, 120) * 0.3
    t = np.clip((t - 0.5) * 1.6 * cloud + 0.5, 0, 1)
    img = colorize(t, dark, base)
    # Fächer-Füße: dort mehr, wo die Dichte-Wolke hoch ist (Lücken und dichte Stellen wie Hay Day)
    dens = pnoise(seed + 5, 180)
    feet = []
    while len(feet) < tufts:
        p = rng.uniform(0, M, 2)
        v = dens[int(p[1] / S) % N, int(p[0] / S) % N]
        if rng.uniform() < np.clip((v - 0.5) * 2.2 * dens_contrast + 0.5, 0.05, 1):
            feet.append(p)
    blades = []   # (x, y, h, w, a, col, alpha)
    for fx, fy in feet:
        k = rng.integers(per[0], per[1] + 1)
        dk = rng.uniform() < n_dark
        hm = rng.uniform(0.7, 1.15)
        for j in range(k):
            a = (j / max(k - 1, 1) - 0.5) * 2 * spread + rng.normal(0, 0.08)
            h = height * S * hm * rng.uniform(0.6, 1.0) * (1 - 0.35 * abs(a) / max(spread, 1e-3))
            c = lift(dark, -0.14) if dk else lift(light, rng.uniform(-0.08, 0.12))
            blades.append((fx + rng.normal(0, width * S * 0.4), fy + rng.normal(0, 2 * S), h,
                           width * S * rng.uniform(0.8, 1.2), a, c, rng.uniform(*alpha) * (0.8 if dk else 1)))
    blades.sort(key=lambda b: b[1])   # hinten zuerst
    pts = [(b[0], b[1]) for b in blades]

    def fn(d, i, x, y):
        b = blades[i]
        _halm_weich(d, x, y, b[2], b[3], b[4], b[5], b[6])
    img = paint(img, fn, pts, int(height * S * 1.3))
    return pblur(img, soft)
