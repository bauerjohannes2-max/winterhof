"""Grasbüschel für den Wegrand (Baustein 6, Runde 4, Hannes 26.11.2026: „zerfranst, ich will feine Grasbüschel wie Hay Day“).

Hay Day nah (Hannes-Screenshot, stark vergrößert): die Kante ist eine Reihe kleiner, runder Büschel, je 3–6 kurze
Halme als Fächer aus einem Fuß, oben links heller (Licht), innen dunkler; dahinter ein hellgrünes Band.
Technik wie Profi-Spiele (Rand-Decals): gemalte Büschel-Bildchen, die der Shader entlang der Kante setzt.

Ausgabe: art_src/spiel{m}/boden/bueschel.png, 4 Varianten nebeneinander (je 128 × 128).
R = Helligkeit (0,5 = Wiesenfarbe; darüber heller), A = Deckkraft. Fuß unten Mitte.
Aufruf: python scripts/boden_bueschel.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
T = 128          # Kachel je Variante
S = 4            # vierfach gemalt, dann verkleinert (weiche Kanten)
V = 4


def bueschel(rng):
    W = T * S
    shade = Image.new('L', (W, W), 0)
    alpha = Image.new('L', (W, W), 0)
    ds, da = ImageDraw.Draw(shade), ImageDraw.Draw(alpha)
    k = int(rng.integers(8, 13))
    foot = np.array([W * 0.5, W * 0.97])
    blades = []
    for j in range(k):
        a = (j / (k - 1) - 0.5) * rng.uniform(0.8, 1.0) + rng.normal(0, 0.07)   # Fächer, kompakt
        h = W * rng.uniform(0.5, 0.88) * (1 - 0.35 * abs(a))
        w = W * rng.uniform(0.15, 0.21)
        blades.append((abs(a), a, h, w))
    blades.sort(key=lambda b: -b[0])   # außen zuerst (hinten), Mitte vorn
    for _, a, h, w in blades:
        steps = 16
        off = rng.normal(0, W * 0.03)
        for i in range(steps):
            t0, t1 = i / steps, (i + 1) / steps
            def pt(t):
                return (foot[0] + off * (1 - t) + np.sin(a) * h * t + a * 0.35 * h * t * t, foot[1] - np.cos(a * 0.8) * h * t)
            (x0, y0), (x1, y1) = pt(t0), pt(t1)
            w0, w1 = w * (1 - t0) ** 0.6 / 2, w * (1 - t1) ** 0.6 / 2
            poly = [(x0 - w0, y0), (x1 - w1, y1), (x1 + w1, y1), (x0 + w0, y0)]
            t = (t0 + t1) / 2
            light = 0.42 + 0.4 * t - 0.14 * np.sin(a)        # zur Spitze heller, links (Licht) heller
            ds.polygon(poly, fill=int(np.clip(light, 0, 1) * 255))
            da.polygon(poly, fill=255)
    # Mittellinie je Halm etwas heller (gemalter Glanz)
    sh = np.asarray(shade.resize((T, T), Image.LANCZOS), np.float32)
    al = np.asarray(alpha.resize((T, T), Image.LANCZOS), np.float32)
    return sh, al


if __name__ == '__main__':
    rng = np.random.default_rng(5)
    out = np.zeros((T, T * V, 4), np.uint8)
    for v in range(V):
        sh, al = bueschel(rng)
        out[:, v * T:(v + 1) * T, 0] = np.clip(sh, 0, 255)
        out[:, v * T:(v + 1) * T, 1] = np.clip(sh, 0, 255)
        out[:, v * T:(v + 1) * T, 2] = np.clip(sh, 0, 255)
        out[:, v * T:(v + 1) * T, 3] = np.clip(al, 0, 255)
    p = ROOT / 'art_src/spiel{m}/boden/bueschel.png'
    Image.fromarray(out, 'RGBA').save(p)
    print(p)
