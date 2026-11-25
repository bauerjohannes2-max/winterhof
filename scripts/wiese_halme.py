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
