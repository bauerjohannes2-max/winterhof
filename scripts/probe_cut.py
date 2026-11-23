"""Magenta-Bogen freistellen und in Einzelbilder schneiden (Probeausschnitt).
Aufruf: python scripts/probe_cut.py <bogen.png> <ausgabe-praefix> [min_flaeche] [max_hoehe_px]
Ergebnis: <praefix>_1.webp, _2 ... (links->rechts, oben->unten), eng zugeschnitten, Farbsaum entfernt.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def key_magenta(rgb):
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    mn = np.minimum(r, b)
    excess = mn - g  # Magenta: R und B hoch, G niedrig
    diff = np.abs(r - b)
    a = np.ones_like(r)
    hard = (excess > 70) & (diff < 100) & (mn > 110)
    soft = (excess > 22) & (diff < 120) & (mn > 80) & ~hard
    a[hard] = 0.0
    a[soft] = 1.0 - np.clip((excess[soft] - 22) / 48.0, 0, 1)
    # Despill: Magenta-Anteil aus Kantenpixeln nehmen (R/B auf G-Niveau ziehen)
    spill = (a < 1) | (excess > 15)
    lim = np.maximum(g, (r + b) / 2 - np.clip(excess, 0, None) * 0.9)
    r2 = np.where(spill, np.minimum(r, lim + 10), r)
    b2 = np.where(spill, np.minimum(b, lim + 10), b)
    out = np.dstack([r2, g, b2, a * 255]).clip(0, 255).astype(np.uint8)
    return out


def main():
    src, prefix = sys.argv[1], sys.argv[2]
    min_area = int(sys.argv[3]) if len(sys.argv) > 3 else 3000
    max_h = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    rgba = key_magenta(np.array(Image.open(src).convert("RGB")))
    alpha = rgba[..., 3]
    # Alpha-Kante 1px weich + Rand um 1px schrumpfen (Saum weg)
    al = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    rgba[..., 3] = np.minimum(alpha, np.array(al))
    mask = rgba[..., 3] > 40
    mask = ndimage.binary_closing(mask, iterations=4)
    lab, n = ndimage.label(mask)
    objs = ndimage.find_objects(lab)
    parts = []
    for i, sl in enumerate(objs, 1):
        area = int((lab[sl] == i).sum())
        if area < min_area:
            continue
        parts.append((sl, i, area))
    parts.sort(key=lambda p: (round(p[0][0].start / 200), p[0][1].start))
    for k, (sl, i, area) in enumerate(parts, 1):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        crop = rgba[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(lab[y0:y1, x0:x1] == i, crop[..., 3], 0)
        im = Image.fromarray(crop)
        if max_h and im.height > max_h:
            im = im.resize((round(im.width * max_h / im.height), max_h), Image.Resampling.LANCZOS)
        out = f"{prefix}_{k}.webp"
        im.save(out, "WEBP", quality=92, method=6)
        print(out, im.size, area)


if __name__ == "__main__":
    main()
