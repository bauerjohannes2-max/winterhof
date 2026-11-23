"""Macht Boden-Texturen nahtlos (Probe 23.11.): je Achse Bild + um halbe Größe verschobenes Bild,
weich überblendet. Ränder kommen aus dem verschobenen Bild (dort ist es durchgehend),
die Mitte aus dem Original. Aufruf: python scripts/probe_seamless.py ground_wild path_dirt"""
import sys
import numpy as np
from PIL import Image

for name in sys.argv[1:]:
    path = f'assets/sprites/probe/{name}.webp'
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    h, w, _ = a.shape
    def blend(img, axis, n):
        # je Achse getrennt: Naht des verschobenen Bilds liegt genau dort, wo das Original voll zählt
        r = np.roll(img, n // 2, axis=axis)
        t = np.clip((1 - np.abs(np.linspace(-1, 1, n))) / 0.5, 0, 1)
        t = t * t * (3 - 2 * t)
        m = t[:, None, None] if axis == 0 else t[None, :, None]
        return img * m + r * (1 - m)
    out = blend(blend(a, 1, w), 0, h)
    Image.fromarray(out.round().clip(0, 255).astype('uint8')).save(path, quality=88, method=6)
    print(name, 'naht oben/unten', round(np.abs(out[0] - out[-1]).mean(), 1), 'links/rechts', round(np.abs(out[:, 0] - out[:, -1]).mean(), 1))
