"""Varianten auf Basis 2 (feine Schneekörnung): was macht den Boden schöner? Aufruf wie fein.py."""
import sys
from pathlib import Path
src = Path(__file__).with_name('boden_fein.py').read_text(encoding='utf-8').split('# ---- Bogen')[0]
exec(src)
from PIL import ImageDraw, ImageFont, ImageFilter


def koernung(img, rng, col_lo=(160, 192, 232), col_hi=(196, 216, 242), spark=110):
    img = crust(img, rng, 11000, col_lo, 8, 0.85)
    img = crust(img, rng, 5000, col_hi, 6, 0.85)
    return specks(img, rng, spark, (255, 255, 255), 1.0, 0.85)


def light_patches(img, seed, warm, k):
    """Große weiche Sonnenflecken (Hay Day: Licht wandert über die Wiese)."""
    m = B.periodic_blur(B.noise(seed, 160), 10)
    m = np.clip((m - 0.5) * 3, 0, 1)
    m = np.asarray(Image.fromarray((m * 255).astype('uint8')).resize((M, M), Image.BICUBIC), float) / 255
    return img + (np.array(warm, float) - img) * (m * k)[..., None]


def details(img, rng, n_twig, n_stone, n_flower):
    """Wenige klare Kleinigkeiten wie Hay Days Blümchen: Zweiglein, Steinchen, Christrosen."""
    layer = Image.new('RGBA', (M, M), (0, 0, 0, 0))
    tw = rng.uniform(0, M, (n_twig, 2)); st = rng.uniform(0, M, (n_stone, 2)); fl = rng.uniform(0, M, (n_flower, 2))

    def fn(d, ox, oy):
        for x, y in tw:
            a = rng.uniform(-0.6, 0.6); L = 26 * S
            x0, y0 = x + ox, y + oy
            x1, y1 = x0 + np.cos(a) * L, y0 + np.sin(a) * L * 0.5
            d.line([(x0 + S, y0 + S), (x1 + S, y1 + S)], fill=(110, 130, 170, 120), width=3 * S)
            d.line([(x0, y0), (x1, y1)], fill=(112, 82, 60, 255), width=2 * S)
            d.line([((x0 + x1) / 2, (y0 + y1) / 2), ((x0 + x1) / 2 + 8 * S, (y0 + y1) / 2 - 7 * S)], fill=(112, 82, 60, 255), width=int(1.5 * S))
        for x, y in st:
            r = rng.uniform(6, 9) * S
            X, Y = x + ox, y + oy
            d.ellipse([X - r + S, Y - r * 0.6 + S, X + r + S, Y + r * 0.6 + S], fill=(110, 130, 175, 130))
            d.ellipse([X - r, Y - r * 0.6, X + r, Y + r * 0.6], fill=(128, 132, 146, 255))
            d.ellipse([X - r * 0.8, Y - r * 0.75, X + r * 0.6, Y - r * 0.05], fill=(246, 250, 255, 255))   # Schneehäubchen
        for x, y in fl:
            X, Y = x + ox, y + oy
            for k in range(5):
                a = k / 5 * 2 * np.pi
                px, py = X + np.cos(a) * 4 * S, Y + np.sin(a) * 2.6 * S
                d.ellipse([px - 3 * S, py - 2.2 * S, px + 3 * S, py + 2.2 * S], fill=(255, 250, 246, 255))
            d.ellipse([X - 1.8 * S, Y - 1.3 * S, X + 1.8 * S, Y + 1.3 * S], fill=(236, 196, 70, 255))
    wrap_draw(layer, fn)
    a = np.asarray(layer, float); m = a[..., 3:] / 255
    return img * (1 - m) + a[..., :3] * m


def drifts(img, seed, k):
    """Große, flache Verwehungswellen (hell oben links, Schatten unten rechts)."""
    h = B.periodic_blur(B.noise(seed, 200, aniso=1.6, angle=-0.35), 10)
    gx = np.roll(h, -2, 1) - np.roll(h, 2, 1); gy = np.roll(h, -2, 0) - np.roll(h, 2, 0)
    sh = np.clip(-(gx + gy) * 40, -1, 1)
    sh = np.asarray(Image.fromarray(((sh + 1) * 127.5).astype('uint8')).resize((M, M), Image.BICUBIC), float) / 127.5 - 1
    return np.clip(img * (1 + sh * k)[..., None], 0, 255)


def variante2(nr):
    rng = np.random.default_rng(500 + nr)
    if nr == 1:    # Basis = gewählte 2
        img = koernung(base(SNOW_D, SNOW_L, 12), rng)
    elif nr == 2:  # + Sonnenflecken, warm
        img = light_patches(koernung(base(SNOW_D, SNOW_L, 12), rng), 81, (214, 220, 232), 0.55)
    elif nr == 3:  # + sanfte Verwehungswellen
        img = drifts(koernung(base(SNOW_D, SNOW_L, 12), rng), 82, 0.05)
    elif nr == 4:  # + wenige Details (Zweiglein, Steinchen, Christrosen)
        img = details(koernung(base(SNOW_D, SNOW_L, 12), rng), rng, 3, 3, 4)
    elif nr == 5:  # Abendlicht: lavendel-blau, mehr Glitzer (Weihnachtszauber)
        img = koernung(base((150, 160, 214), (178, 184, 232), 12), rng, (168, 174, 230), (206, 206, 244), spark=260)
    elif nr == 6:  # Alles zusammen, maßvoll: Wellen + Sonnenflecken + Details
        img = koernung(base(SNOW_D, SNOW_L, 12), rng)
        img = drifts(img, 82, 0.035)
        img = light_patches(img, 81, (214, 220, 232), 0.4)
        img = details(img, rng, 2, 2, 3)
    return finish(img)


TITEL2 = {1: 'Basis (deine 2)', 2: '+ Sonnenflecken', 3: '+ Verwehungswellen',
          4: '+ Zweiglein, Steinchen, Christrosen', 5: 'Abendlicht + Glitzer', 6: 'Alles maßvoll kombiniert'}

W, H = 560, 340
font = ImageFont.truetype('arialbd.ttf', 22)
coop = Image.open(ROOT / 'assets/sprites/probe/coop_v1.webp').convert('RGBA')
coop = coop.resize((int(coop.width * 0.36), int(coop.height * 0.36)), Image.LANCZOS)
field = Image.open(ROOT / 'assets/sprites/probe/field_ripe.webp').convert('RGBA')
field = field.resize((int(field.width * 0.36), int(field.height * 0.36)), Image.LANCZOS)


def scene(tex):
    a = B.hex_render(np.asarray(tex, float), W, H, 320)
    ys, xs = np.mgrid[0:H, 0:W]
    a = np.clip(a * (1.04 - 0.08 * (ys / H) - 0.04 * (1 - xs / W))[..., None], 0, 255)
    cp = (70, H - coop.height - 30); fp = (W - field.width - 50, H - field.height - 30)
    for c, s in (((cp[0] + coop.width // 2 + 10, cp[1] + coop.height - 26), (coop.width * 1.05, coop.width * 0.45)),
                 ((fp[0] + field.width // 2 + 10, fp[1] + field.height - 30), (field.width * 0.95, field.width * 0.45))):
        m = Image.new('L', (W, H), 0)
        ImageDraw.Draw(m).ellipse([c[0] - s[0] / 2, c[1] - s[1] / 2, c[0] + s[0] / 2, c[1] + s[1] / 2], fill=255)
        a = a * (1 - np.asarray(m.filter(ImageFilter.GaussianBlur(7)), float)[..., None] / 255 * 0.45)
    p = Image.fromarray(a.astype('uint8')).convert('RGBA')
    p.alpha_composite(field, fp); p.alpha_composite(coop, cp)
    d = ImageDraw.Draw(p)
    return p.convert('RGB')


TEX.mkdir(parents=True, exist_ok=True)
g = 10
sheet = Image.new('RGB', (W * 3 + g * 4, H * 2 + g * 3), (50, 58, 72))
for i, nr in enumerate(TITEL2):
    t = variante2(nr); t.save(TEX / f'schoen_{nr}.png')
    p = scene(t); d = ImageDraw.Draw(p)
    d.rounded_rectangle([10, 10, 52, 48], 9, fill=(40, 60, 90)); d.text((31, 29), str(nr), font=font, fill='white', anchor='mm')
    d.rounded_rectangle([60, 12, 70 + d.textlength(TITEL2[nr], font=font), 46], 8, fill=(255, 255, 255))
    d.text((65, 29), TITEL2[nr], font=font, fill=(40, 60, 90), anchor='lm')
    sheet.paste(p, (g + (i % 3) * (W + g), g + (i // 3) * (H + g)))
sheet.save(OUT, quality=92)
print(OUT)
