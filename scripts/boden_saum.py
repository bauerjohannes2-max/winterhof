"""Saum-Maske für den Wegrand (Baustein 6, Runde 3, Hannes 26.11.2026: Rand „zackig, spitz hoch“).

Technik wie Profi-Spiele (Höhen-/Alpha-Masken-Übergang, z. B. Torchlight-Grasrand, Polycount-Diskussionen):
die Grenze Wiese/Weg wird nicht geometrisch gezackt, sondern von einer gemalten Halm-Maske „angefressen“.
Jeder Halm ist ein feiner, leicht gebogener Strich, Wert 1 am Fuß bis 0 an der Spitze (Höhenverlauf).
Der Shader deckt einen Weg-Bildpunkt mit Gras, wenn Abstand zur Kante < Reichweite × Maskenwert.
So entstehen feine, weiche Halmspitzen in unregelmäßiger Länge, nie ein Sägezahn.

Nahtlos, 512 px, Halme senkrecht ×2 gemalt (Boden wird für Iso 2:1 gestaucht).
Ausgabe: art_src/spiel{m}/boden/saum.png (Graustufen, R = Höhe).
Aufruf: python scripts/boden_saum.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
N = 512
S = 2                 # doppelt gemalt, dann verkleinert
M = N * S


def saum(seed=3, count=1500, length=(40, 120), width=(4.0, 7.0), lean=0.12):
    rng = np.random.default_rng(seed)
    layer = np.zeros((M, M), np.float32)
    feet = rng.uniform(0, M, (count, 2))
    L = rng.uniform(*length, count) * S * rng.choice([0.6, 1.0, 1.0, 1.3], count)
    W = rng.uniform(*width, count) * S
    A = rng.normal(0.08, lean, count)          # leicht nach rechts geneigt wie Hay Day
    steps = 24
    for (x, y), h, w, a in zip(feet, L, W, A):
        # jeder Halm auf eigener kleiner Fläche, dann Maximum (Halme überdecken sich, keine Stufen durch Übermalen)
        pad = int(w) + 4
        bw = int(abs(np.sin(a)) * h + abs(a) * 0.4 * h + 2 * pad) + 1
        bh = int(h + 2 * pad) + 1
        img = Image.new('F', (bw, bh), 0.0)
        d = ImageDraw.Draw(img)
        x0 = pad + (abs(np.sin(a)) * h + abs(a) * 0.4 * h if a < 0 else 0)
        y0 = bh - pad
        for i in range(steps):
            t0, t1 = i / steps, (i + 1) / steps
            p0 = (x0 + np.sin(a) * h * t0 + a * 0.4 * h * t0 * t0, y0 - h * t0)
            p1 = (x0 + np.sin(a) * h * t1 + a * 0.4 * h * t1 * t1, y0 - h * t1)
            w0, w1 = w * (1 - t0) ** 0.9 / 2, w * (1 - t1) ** 0.9 / 2
            v = 1.0 - (t0 + t1) / 2           # Höhe: Fuß 1, Spitze 0
            d.polygon([(p0[0] - w0, p0[1]), (p1[0] - w1, p1[1]), (p1[0] + w1, p1[1]), (p0[0] + w0, p0[1])], fill=float(v))
        arr = np.asarray(img, np.float32)
        ox, oy = int(x - x0), int(y - y0)
        ys = (np.arange(bh) + oy) % M
        xs = (np.arange(bw) + ox) % M
        sub = layer[np.ix_(ys, xs)]
        layer[np.ix_(ys, xs)] = np.maximum(sub, arr)
    out = Image.fromarray(np.clip(layer * 255, 0, 255).astype('uint8')).resize((N, N), Image.LANCZOS)
    return np.asarray(out)


if __name__ == '__main__':
    a = saum()
    out = ROOT / 'art_src/spiel{m}/boden/saum.png'
    Image.fromarray(a).convert('RGB').save(out)
    print(out, a.shape, a.mean())
