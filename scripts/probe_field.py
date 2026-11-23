"""Feld-Bogen (2x2) zerlegen, Störobjekt (Stumpf) zwischen unteren Feldern entfernen."""
import sys, numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, 'scripts')
from probe_cut import key_magenta
from scipy import ndimage

src = 'assets/sprites/probe/raw/field_sheet.jpg'
rgba = key_magenta(np.array(Image.open(src).convert('RGB')))
al = Image.fromarray(rgba[..., 3]).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
rgba[..., 3] = np.minimum(rgba[..., 3], np.array(al))
H, W = rgba.shape[:2]; hy, hx = H // 2, W // 2
A = rgba[..., 3] > 40

def bottom(m):
    ys = np.where(m.any(1))[0]; return ys.max()

out = {}
for col, (x0, x1) in enumerate(((0, hx), (hx, W))):
    top = np.zeros_like(A); top[:hy, x0:x1] = A[:hy, x0:x1]
    top = ndimage.binary_fill_holes(top)
    lab, n = ndimage.label(top); sizes = ndimage.sum(top, lab, range(1, n + 1))
    foot = lab == (np.argmax(sizes) + 1)
    bot = np.zeros_like(A); bot[hy:, x0:x1] = A[hy:, x0:x1]
    dy = bottom(bot) - bottom(foot)
    fs = np.roll(foot, dy, axis=0)
    fx = np.where(fs.any(0))[0]; lx, rx = fx.min(), fx.max()
    # Oberkante des Rauten-Fußes je Spalte
    topy = np.full(W, H); 
    for x in range(lx, rx + 1):
        ys = np.where(fs[:, x])[0]; topy[x] = ys.min()
    yy = np.arange(H)[:, None]
    above = (yy < topy[None, :]) & bot
    inset = 70  # Ecken frei vom Störobjekt
    above[:, :lx + (inset if col == 1 else 0)] = False
    above[:, rx - (inset if col == 0 else 0):] = False
    keep = ndimage.binary_dilation(fs, iterations=3) | above
    keep &= bot
    lab, n = ndimage.label(ndimage.binary_closing(keep, iterations=2))
    sizes = ndimage.sum(keep, lab, range(1, n + 1)); keep = lab == (np.argmax(sizes) + 1)
    for name, m in ((('field_soil', 'field_sprout')[col], foot), (('field_half', 'field_ripe')[col], keep)):
        ys, xs = np.where(m); y0, y1, x0b, x1b = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        c = rgba[y0:y1, x0b:x1b].copy(); c[..., 3] = np.where(m[y0:y1, x0b:x1b], c[..., 3], 0)
        im = Image.fromarray(c)
        im.save(f'assets/sprites/probe/{name}.webp', 'WEBP', quality=92, method=6)
        print(name, im.size, 'dy', dy)
