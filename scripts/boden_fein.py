"""Feiner Winterboden nach Hay-Day-Art: dichte kleine Pinselstriche, geringer Kontrast, Mittelton.
Aufruf: python fein.py <repo> <refs-ordner> <ausgabe.jpg> <textur-ordner>"""
import sys
from pathlib import Path
ROOT = Path(sys.argv[1]); REFS = Path(sys.argv[2]); OUT = Path(sys.argv[3]); TEX = Path(sys.argv[4])
sys.path.insert(0, str(ROOT / 'scripts'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import boden_erzeugen as B

N = B.N          # 512 Endgröße
S = 2            # gemalt in doppelter Auflösung, dann verkleinert (weiche, saubere Kanten)
M = N * S


def base(dark, light, seed):
    t = B.noise(seed, 140) * 0.6 + B.noise(seed + 1, 50) * 0.4
    img = B.colorize(B.periodic_blur(t, 6), dark, light)
    return np.asarray(Image.fromarray(np.clip(img, 0, 255).astype('uint8')).resize((M, M), Image.BICUBIC), float)


def wrap_draw(layer, fn):
    d = ImageDraw.Draw(layer, 'RGBA')
    for ox in (-M, 0, M):
        for oy in (-M, 0, M):
            fn(d, ox, oy)


def lift(c, k):
    c = np.array(c, float)
    return tuple(int(v) for v in np.clip(c + (255 - c) * k if k > 0 else c * (1 + k), 0, 255))


def blades(img, rng, count, col, length, tilt, alpha, density=None):
    """Hay-Day-Gras-Technik: viele kurze Striche, oben hell, Fuß dunkler. Hier bereifte Halme / Schneekruste."""
    layer = Image.new('RGBA', (M, M), (0, 0, 0, 0))
    hi, lo = lift(col, 0.35), lift(col, -0.12)
    pts = rng.uniform(0, M, (count * 2, 2))
    if density is not None:      # Dichte nach Gegend (keine gleichmäßige Streuung)
        keep = density[(pts[:, 1] // S).astype(int) % N, (pts[:, 0] // S).astype(int) % N] > rng.uniform(0, 1, len(pts))
        pts = pts[keep]
    pts = pts[:count]

    def fn(d, ox, oy):
        for (x, y) in pts:
            L = length * S * rng.uniform(0.6, 1.2)
            a = -np.pi / 2 + tilt + rng.normal(0, 0.28)
            ex, ey = x + ox + np.cos(a) * L, y + oy + np.sin(a) * L
            d.line([(x + ox + S, y + oy + S * 0.6), (ex + S, ey + S * 0.6)], fill=lo + (int(alpha * 120),), width=S)
            d.line([(x + ox, y + oy), (ex, ey)], fill=hi + (int(alpha * 255),), width=S)
    wrap_draw(layer, fn)
    a = np.asarray(layer, float)
    m = a[..., 3:] / 255
    return img * (1 - m) + a[..., :3] * m


def crust(img, rng, count, col, size, alpha):
    """Schneekörnung: kleine Bögen, Licht oben links → helle Oberkante, blauer Schatten unten rechts."""
    layer = Image.new('RGBA', (M, M), (0, 0, 0, 0))
    hi, lo = lift(col, 0.45), lift(col, -0.10)
    pts = rng.uniform(0, M, (count, 2))

    def fn(d, ox, oy):
        for (x, y) in pts:
            w = size * S * rng.uniform(0.6, 1.4)
            h = w * 0.45
            X, Y = x + ox, y + oy
            d.arc([X + S, Y + S, X + w + S, Y + h + S], 200, 340, fill=lo + (int(alpha * 140),), width=S)
            d.arc([X, Y, X + w, Y + h], 200, 340, fill=hi + (int(alpha * 255),), width=S)
    wrap_draw(layer, fn)
    a = np.asarray(layer, float)
    m = a[..., 3:] / 255
    return img * (1 - m) + a[..., :3] * m


def specks(img, rng, count, col, r, alpha):
    layer = Image.new('RGBA', (M, M), (0, 0, 0, 0))
    pts = rng.uniform(0, M, (count, 2))

    def fn(d, ox, oy):
        for (x, y) in pts:
            rr = r * S * rng.uniform(0.6, 1.3)
            d.ellipse([x + ox - rr, y + oy - rr * 0.6, x + ox + rr, y + oy + rr * 0.6], fill=tuple(col) + (int(alpha * 255),))
    wrap_draw(layer, fn)
    a = np.asarray(layer, float)
    m = a[..., 3:] / 255
    return img * (1 - m) + a[..., :3] * m


def finish(img):
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8')).resize((N, N), Image.LANCZOS)


SNOW_D, SNOW_L = (140, 176, 222), (168, 198, 236)   # Mittelton-Schnee (~75 % hell), kühl
GRASS = (120, 140, 120)


def variante(nr):
    rng = np.random.default_rng(300 + nr)
    dens = B.periodic_blur(B.noise(70 + nr, 90), 4)
    if nr == 1:   # Bereiftes Gras: Hay-Day-Gras, aber gefroren (dichte feine Halme, weißblau)
        img = base((128, 158, 186), (152, 180, 204), 11)
        img = blades(img, rng, 14000, (176, 200, 222), 6, 0.15, 0.8)
        img = blades(img, rng, 8000, (210, 226, 242), 5, 0.2, 0.85)
        img = specks(img, rng, 90, (255, 255, 255), 1.0, 0.8)
    elif nr == 2:  # Feine Schneekörnung: kleine Bögen statt Halme, sonst gleiche Technik
        img = base(SNOW_D, SNOW_L, 12)
        img = crust(img, rng, 11000, (160, 192, 232), 8, 0.85)
        img = crust(img, rng, 5000, (196, 216, 242), 6, 0.85)
        img = specks(img, rng, 110, (255, 255, 255), 1.0, 0.85)
    elif nr == 3:  # Schneekörnung + bereifte Halme in Gruppen (lebendiger, natürlich verteilt)
        img = base(SNOW_D, SNOW_L, 13)
        img = crust(img, rng, 10000, (160, 192, 232), 8, 0.8)
        img = blades(img, rng, 5000, (128, 146, 132), 7, 0.1, 0.9, density=np.clip((dens - 0.5) * 4, 0, 1))
        img = crust(img, rng, 4500, (196, 216, 242), 6, 0.85)
        img = specks(img, rng, 110, (255, 255, 255), 1.0, 0.85)
    return finish(img)


TITEL = {1: 'Bereiftes Gras', 2: 'Feine Schneekörnung', 3: 'Körnung + Halme in Gruppen'}

# ---- Bogen: oben Hay Day nah (gleicher Maßstab), unten unsere drei -------------------------------
W, H = 560, 340
font = ImageFont.truetype('arialbd.ttf', 22)
coop = Image.open(ROOT / 'assets/sprites/probe/coop_v1.webp').convert('RGBA')
coop = coop.resize((int(coop.width * 0.36), int(coop.height * 0.36)), Image.LANCZOS)
field = Image.open(ROOT / 'assets/sprites/probe/field_ripe.webp').convert('RGBA')
field = field.resize((int(field.width * 0.36), int(field.height * 0.36)), Image.LANCZOS)


def shadow(arr, center, size):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse([center[0] - size[0] / 2, center[1] - size[1] / 2, center[0] + size[0] / 2, center[1] + size[1] / 2], fill=255)
    m = np.asarray(m.filter(ImageFilter.GaussianBlur(7)), float) / 255
    return arr * (1 - m[..., None] * 0.45)


def scene(tex):
    a = B.hex_render(np.asarray(tex, float), W, H, 320)
    ys, xs = np.mgrid[0:H, 0:W]
    a = np.clip(a * (1.04 - 0.08 * (ys / H) - 0.04 * (1 - xs / W))[..., None], 0, 255)
    cp = (70, H - coop.height - 30)
    fp = (W - field.width - 50, H - field.height - 30)
    a = shadow(a, (cp[0] + coop.width // 2 + 10, cp[1] + coop.height - 26), (coop.width * 1.05, coop.width * 0.45))
    a = shadow(a, (fp[0] + field.width // 2 + 10, fp[1] + field.height - 30), (field.width * 0.95, field.width * 0.45))
    p = Image.fromarray(a.astype('uint8')).convert('RGBA')
    p.alpha_composite(field, fp)
    p.alpha_composite(coop, cp)
    return p.convert('RGB')


def label(p, tag, text, ref=False):
    d = ImageDraw.Draw(p)
    d.rounded_rectangle([10, 10, 52, 48], 9, fill=(150, 60, 40) if ref else (40, 60, 90))
    d.text((31, 29), tag, font=font, fill='white', anchor='mm')
    d.rounded_rectangle([60, 12, 70 + d.textlength(text, font=font), 46], 8, fill=(255, 255, 255))
    d.text((65, 29), text, font=font, fill=(40, 60, 90), anchor='lm')
    return p


hd_far = Image.open(REFS / 'hayday.jpg').convert('RGB').crop((395, 235, 765, 460)).resize((W, H), Image.LANCZOS)
hd_near = Image.open(REFS / 'hayday_nah.png').convert('RGB')
hd_near = hd_near.crop((0, 0, hd_near.width, int(hd_near.width * H / W))).resize((W, H), Image.LANCZOS)
row1 = [label(hd_far, 'HD', 'Hay Day', True), label(hd_near, 'HD', 'Hay Day ganz nah: feine Halme', True)]
TEX.mkdir(parents=True, exist_ok=True)
row2 = []
for nr in TITEL:
    t = variante(nr)
    t.save(TEX / f'fein_{nr}.png')
    row2.append(label(scene(t), str(nr), TITEL[nr]))
# Nahansicht unserer Empfehlung wie Hay Day ganz nah
row1.append(label(Image.fromarray(B.hex_render(np.asarray(Image.open(TEX / 'fein_3.png'), float), W // 2, H // 2, 320).astype('uint8')).resize((W, H), Image.LANCZOS), '3', 'Unsere 3 ganz nah'))
g = 10
sheet = Image.new('RGB', (W * 3 + g * 4, H * 2 + g * 3), (50, 58, 72))
for i, p in enumerate(row1):
    sheet.paste(p, (g + i * (W + g), g))
for i, p in enumerate(row2):
    sheet.paste(p, (g + i * (W + g), H + 2 * g))
sheet.save(OUT, quality=92)
print(OUT)
