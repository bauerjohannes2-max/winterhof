"""Mutige Boden-Varianten (Baustein 5, Runde 3): viele klar verschiedene Richtungen zum Durchklicken.

Je Variante zwei Ansichten wie im Spiel: nah (mittlerer Zoom) und weit (ganz raus, zeigt Wiederholung).
Grundtextur läuft durch dasselbe Hex-Tiling wie ground.ts. Was im Spiel nicht kachelt (Schneeschollen, Verwehungen,
Lichtinseln), entsteht in Weltkoordinaten (wie später im Shader per Welt-Rauschen) und wiederholt sich nie.

Aufruf: python scripts/boden_mutig.py <ausgabeordner>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import boden_erzeugen as B  # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else None   # nur beim Bogen-Aufruf nötig; als Werkzeug-Modul importierbar
N = 1024          # Texturgröße
S = 2             # Striche doppelt aufgelöst gemalt, dann verkleinert
M = N * S
W, H = 1280, 720  # Bildgröße je Ansicht
NAH = 1.6         # Bildpunkte je Weltpunkt, mittlerer Zoom (≈ 7 Kacheln breit)
WEIT = 0.6        # ganz raus (≈ 18 Kacheln breit)


# ---------------------------------------------------------------- Grundwerkzeuge
def pnoise(seed, scale, aniso=1.0, angle=0.0, n=N):
    """Periodisches Rauschen 0..1 (nahtlos), Strukturgröße ~scale px."""
    rng = np.random.default_rng(seed)
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    c, s = np.cos(angle), np.sin(angle)
    u, v = fx * c + fy * s, -fx * s + fy * c
    r = np.sqrt((u * aniso) ** 2 + (v / aniso) ** 2) * scale
    amp = np.exp(-r * r * 2.0)
    amp[0, 0] = 0
    out = np.real(np.fft.ifft2((rng.normal(size=(n, n)) + 1j * rng.normal(size=(n, n))) * amp))
    out -= out.min()
    return out / out.max()


def pblur(a, px):
    n = a.shape[0]
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    g = np.exp(-2 * (np.pi * px) ** 2 * (fx ** 2 + fy ** 2))
    if a.ndim == 2:
        return np.real(np.fft.ifft2(np.fft.fft2(a) * g))
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., i]) * g)) for i in range(a.shape[2])], -1)


def wnoise(h, w, seed, scale, aniso=1.0, angle=0.0):
    """Welt-Rauschen für eine Ansicht (h×w Bildpunkte), Boden 2:1 gestaucht. scale in Bildpunkten (waagrecht)."""
    rng = np.random.default_rng(seed)
    hh = h * 2
    fy, fx = np.meshgrid(np.fft.fftfreq(hh), np.fft.fftfreq(w), indexing='ij')
    c, s = np.cos(angle), np.sin(angle)
    u, v = fx * c + fy * s, -fx * s + fy * c
    r = np.sqrt((u * aniso) ** 2 + (v / aniso) ** 2) * scale
    amp = np.exp(-r * r * 2.0)
    amp[0, 0] = 0
    out = np.real(np.fft.ifft2((rng.normal(size=(hh, w)) + 1j * rng.normal(size=(hh, w))) * amp))
    out = out.reshape(h, 2, w).mean(1)
    out -= out.min()
    return out / out.max()


def blur(a, px):
    if px <= 0:
        return a
    if a.ndim == 2:
        h, w = a.shape                      # Gauß per FFT (Ränder laufen um, bei Ansichten unkritisch)
        fy, fx = np.meshgrid(np.fft.fftfreq(h), np.fft.fftfreq(w), indexing='ij')
        g = np.exp(-2 * (np.pi * px) ** 2 * (fx ** 2 + fy ** 2))
        return np.real(np.fft.ifft2(np.fft.fft2(a) * g))
    return np.stack([blur(a[..., i], px) for i in range(a.shape[2])], -1)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def col(c):
    return np.array(c, float)


def lerp(a, b, t):
    t = np.asarray(t, float)
    if t.ndim == a.ndim - 1:
        t = t[..., None]
    return a + (b - a) * t


def colorize(t, dark, light):
    return col(dark) + (col(light) - col(dark)) * t[..., None]


def lift(c, k):
    c = col(c)
    return tuple(int(v) for v in np.clip(c + (255 - c) * k if k > 0 else c * (1 + k), 0, 255))


def paint(img, draw_fn, pts, margin):
    """Malt mit Umlauf (nahtlos) in doppelter Auflösung und legt das Ergebnis über img (N×N×3)."""
    layer = Image.new('RGBA', (M, M), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, 'RGBA')
    for ox in (-M, 0, M):
        for oy in (-M, 0, M):
            sel = [(i, p) for i, p in enumerate(pts)
                   if -margin <= p[0] + ox <= M + margin and -margin <= p[1] + oy <= M + margin]
            for i, (x, y) in sel:
                draw_fn(d, i, x + ox, y + oy)
    a = np.asarray(layer.resize((N, N), Image.LANCZOS), float)
    m = a[..., 3:] / 255
    return img * (1 - m) + a[..., :3] * m


# ---------------------------------------------------------------- Texturen (kacheln, Hex-Tiling)
def grass_tex(seed, dark, light, blade, count, length=10, tilt=0.12, frost=0.0):
    """Hay-Day-Technik: weiche Grundflecken + sehr viele kurze Halme (oben hell, Fuß dunkel)."""
    rng = np.random.default_rng(seed)
    t = pblur(pnoise(seed, 300) * 0.6 + pnoise(seed + 1, 90) * 0.4, 6)
    img = colorize(np.clip((t - 0.5) * 1.5 + 0.5, 0, 1), dark, light)
    for k, (c, n) in enumerate(((blade, count), (lift(blade, 0.25), count // 2))):
        pts = rng.uniform(0, M, (n, 2))
        L = rng.uniform(0.6, 1.25, n) * length * S
        A = -np.pi / 2 + tilt + rng.normal(0, 0.3, n)
        tip = rng.uniform(0, 1, n) < frost
        hi, lo = lift(c, 0.32), lift(c, -0.28)

        def fn(d, i, x, y):
            ex, ey = x + np.cos(A[i]) * L[i], y + np.sin(A[i]) * L[i]
            d.line([(x + S, y + S * 0.6), (ex + S, ey + S * 0.6)], fill=lo + (110,), width=S)
            d.line([(x, y), (ex, ey)], fill=hi + (235,), width=S)
            if tip[i]:
                d.ellipse([ex - S * 1.3, ey - S * 1.0, ex + S * 1.3, ey + S * 1.0], fill=(240, 248, 255, 255))
        img = paint(img, fn, pts, 40)
    return img


def snow_tex(seed, shadow, light, grain=1.0, sparkle=220, warm=None):
    """Feine Schneekörnung: kleine Bögen, Licht oben links (helle Oberkante, kühler Schatten unten rechts)."""
    rng = np.random.default_rng(seed)
    t = pblur(pnoise(seed, 320) * 0.55 + pnoise(seed + 1, 110) * 0.45, 8)
    img = colorize(t * 0.8 + 0.1, shadow, light)
    if warm is not None:
        img = lerp(img, img * 0 + col(warm), smooth(0.55, 0.9, pnoise(seed + 2, 360)) * 0.35)
    base = tuple(int(v) for v in (col(shadow) + col(light)) / 2)
    for c, n, size in ((base, int(36000 * grain), 9), (lift(light, 0.2), int(16000 * grain), 7)):
        pts = rng.uniform(0, M, (n, 2))
        sz = rng.uniform(0.6, 1.4, n) * size * S
        hi, lo = lift(c, 0.45), lift(c, -0.12)

        def fn(d, i, x, y):
            w = sz[i]
            h = w * 0.45
            d.arc([x + S, y + S, x + w + S, y + h + S], 200, 340, fill=lo + (120,), width=S)
            d.arc([x, y, x + w, y + h], 200, 340, fill=hi + (220,), width=S)
        img = paint(img, fn, pts, 40)
    pts = rng.uniform(0, M, (sparkle, 2))

    def sp(d, i, x, y):
        r = S * 1.2
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(255, 255, 255, 240))
    return paint(img, sp, pts, 10)


def brush_tex(seed, tones):
    """Gemälde: lange, breite, sichtbare Pinselstriche entlang einer Fließrichtung, wenige Tonstufen."""
    rng = np.random.default_rng(seed)
    flow = pblur(pnoise(seed, 400), 10) * 2.4 - 0.35
    img = np.zeros((N, N, 3)) + col(tones[1])
    for k, c in enumerate(tones):
        n = 1100 if k in (1, 2) else 600
        pts = rng.uniform(0, M, (n, 2))
        L = rng.uniform(34, 70, n) * S
        Wd = rng.uniform(16, 28, n) * S

        def fn(d, i, x, y):
            a = flow[int(y / S) % N, int(x / S) % N] * 0.9 - 0.45 + rng.normal(0, 0.25)
            pts_ = [(x + np.cos(a) * L[i] * t - np.sin(a) * np.sin(t * np.pi) * L[i] * 0.08,
                     y + np.sin(a) * L[i] * t * 0.5 + np.cos(a) * np.sin(t * np.pi) * L[i] * 0.04) for t in np.linspace(0, 1, 7)]
            d.line(pts_, fill=tuple(c) + (120,), width=int(Wd[i]), joint='curve')
        img = paint(img, fn, pts, 200)
    return np.clip(pblur(img, 1.6), 0, 255)


def earth_tex(seed):
    """Alm im Frühwinter: trockenes Ockergras, braune Erdflecken, Halme."""
    rng = np.random.default_rng(seed)
    g = grass_tex(seed, (150, 128, 70), (190, 164, 92), (196, 170, 96), 60000, 8, 0.15)
    e = smooth(0.70, 0.80, pblur(pnoise(seed + 5, 340) * 0.85 + pnoise(seed + 6, 90) * 0.15, 4))
    soil = colorize(pnoise(seed + 7, 40), (110, 82, 60), (138, 104, 76))
    return g


# ---------------------------------------------------------------- Welt-Ebenen (wiederholen sich nie)
def light_dir_shade(h, k):
    gx = np.roll(h, -1, 1) - np.roll(h, 1, 1)
    gy = np.roll(h, -1, 0) - np.roll(h, 1, 0)
    return np.clip(-(gx * 0.8 + gy * 1.0) * k, -1, 1)


def snow_slabs(img, z, seed, cover, top=(238, 244, 255), shade=(184, 198, 240), side=(128, 146, 214),
               thick=5, grain_seed=0):
    """Clash-Technik: dicke Schneeschollen mit Volumen (Oberseite, Seitenkante, Schlagschatten auf das Gras)."""
    n = wnoise(H, W, seed, 480 * z) * 0.64 + wnoise(H, W, seed + 1, 150 * z) * 0.32 + wnoise(H, W, seed + 4, 60 * z) * 0.04
    thr = np.quantile(n, 1 - cover)
    m = smooth(thr - 0.004, thr + 0.004, n)
    t = max(2, int(round(thick * z * 0.8)))
    topm = np.roll(m, -t, 0)
    sh = blur(np.roll(np.roll(topm, int(t * 1.2), 1), int(t * 1.1), 0), 1.2 * t)
    img = img * (1 - np.clip(sh, 0, 1)[..., None] * col((0.40, 0.34, 0.16)))
    yy = np.arange(H)[:, None]
    grad = np.clip((m - topm), 0, 1)
    img = lerp(img, col(side) * np.ones_like(img), grad)
    hb = blur(topm, 2.2 * z)
    rim = light_dir_shade(hb, 3.0)
    g = wnoise(H, W, seed + 9 + grain_seed, 3 * z) - 0.5
    big = wnoise(H, W, seed + 3, 300 * z)
    tone = np.clip(0.70 + rim * 0.55 + g * 0.18 + (big - 0.5) * 0.35, 0, 1)
    snow = lerp(col(shade) * np.ones_like(img), col(top) * np.ones_like(img), tone)
    sp = (np.random.default_rng(seed).uniform(0, 1, (H, W)) > 0.9992) * topm
    snow = lerp(snow, np.full_like(img, 255.0), sp)
    return lerp(img, snow, topm)


def drifts(img, z, seed, amount, shadow, light, scale=760):
    """Große Verwehungen mit Graten, Licht oben links (Form statt flacher Fläche, wie Dünen im Schnee)."""
    n = wnoise(H, W, seed, scale * z, aniso=1.5, angle=-0.4) * 0.75 + wnoise(H, W, seed + 1, 180 * z) * 0.25
    ridge = 1 - np.abs(n * 2 - 1)
    h = blur(ridge ** 2.2, 1.5 * z)
    s = light_dir_shade(h, 60.0 / z)
    out = lerp(img, img * 0 + col(light), np.clip(s, 0, 1) * amount)
    out = lerp(out, out * 0 + col(shadow), np.clip(-s, 0, 1) * amount)
    return out


def frost_patches(img, z, seed, cover, color=(232, 240, 252), soft=0.03):
    n = wnoise(H, W, seed, 300 * z) * 0.7 + wnoise(H, W, seed + 1, 80 * z) * 0.3
    thr = np.quantile(n, 1 - cover)
    m = smooth(thr - soft, thr + soft, n) * (0.55 + 0.45 * wnoise(H, W, seed + 2, 6 * z))
    return lerp(img, img * 0 + col(color), m * 0.8)


# ---------------------------------------------------------------- Farbstimmung (ganzes Bild)
def lum(img):
    return (img * col((0.3, 0.59, 0.11))).sum(-1) / 255


def grade_golden(img):
    """Abendsonne: alles wärmer, Lichter pfirsich, Schatten violett."""
    L = lum(img)[..., None]
    out = img * col((1.0, 0.94, 0.86))
    out = lerp(out, col((92, 74, 156)) * np.ones_like(img), np.clip(0.75 - L, 0, 1) * 0.6)
    out = lerp(out, col((255, 228, 196)) * np.ones_like(img), np.clip(L - 0.6, 0, 1) * 0.5)
    return out


def grade_night(img, glows):
    out = img * col((0.42, 0.50, 0.80))
    yy, xx = np.mgrid[0:H, 0:W]
    g = np.zeros((H, W))
    for (x, y, r) in glows:
        d = ((xx - x) / r) ** 2 + ((yy - y) / (r * 0.5)) ** 2
        g += np.exp(-d * 2.2)
    g = np.clip(g, 0, 1)[..., None]
    warm = col((255, 190, 110))
    return out + (img * warm / 255 * 1.05 - out) * g * 0.85


# ---------------------------------------------------------------- Szene
def load(name, k):
    im = Image.open(ROOT / 'assets/sprites/probe' / name).convert('RGBA')
    return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)


def layout(z):
    """Objekte (Bild, Fuß-Mitte x, Fuß y, Schattenbreite in Weltpunkten)."""
    k = 0.36 * z      # Maßstab wie Bogen b05 (dort 1 Bildpunkt je Weltpunkt, Faktor 0,36)
    obj = []
    if z >= 1.5:
        pos = [('field_ripe.webp', 0.66, 0.80), ('field_half.webp', 0.86, 0.60), ('coop_v1.webp', 0.20, 0.84),
               ('field_sprout.webp', 0.48, 0.52), ('chicken_1.webp', 0.38, 0.86), ('chicken_3.webp', 0.33, 0.93),
               ('chicken_2.webp', 0.42, 0.95)]
    else:
        pos = [('coop_v1.webp', 0.25, 0.42), ('coop_v1.webp', 0.62, 0.30), ('field_ripe.webp', 0.42, 0.60),
               ('field_half.webp', 0.55, 0.70), ('field_sprout.webp', 0.68, 0.80), ('field_ripe.webp', 0.82, 0.55),
               ('coop_v1.webp', 0.86, 0.88), ('field_soil.webp', 0.30, 0.78), ('field_sprout.webp', 0.16, 0.66)]
    for name, fx, fy in pos:
        kk = k * (0.55 if name.startswith('chicken') else 1.0)
        im = load(name, kk)
        obj.append((im, fx * W, fy * H, name))
    return obj


def contact_shadow(img, obj):
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    for im, x, y, name in obj:
        if 'field' in name:
            w, cx, cy = im.width * 1.0, x + im.width * 0.03, y - im.height * 0.31 + im.width * 0.03
        elif 'coop' in name:
            w, cx, cy = im.width * 0.92, x + im.width * 0.05, y - im.height * 0.07
        else:
            w, cx, cy = im.width * 0.7, x + im.width * 0.05, y - im.height * 0.08
        d.ellipse([cx - w / 2, cy - w * 0.25, cx + w / 2, cy + w * 0.25], fill=255)
    a = np.asarray(m.filter(ImageFilter.GaussianBlur(max(3, W / 260))), float)[..., None] / 255
    return img * (1 - a * col((0.42, 0.38, 0.22)))


def place(img, obj):
    p = Image.fromarray(np.clip(img, 0, 255).astype('uint8')).convert('RGBA')
    for im, x, y, name in sorted(obj, key=lambda o: o[2]):
        foot = 0.93 if 'field' in name else 0.97
        p.alpha_composite(im, (int(x - im.width / 2), int(y - im.height * foot)))
    return np.asarray(p.convert('RGB'), float)


def render(v, z):
    """z = Bildpunkte je Weltpunkt."""
    rep = 320 * z
    tex = v['tex']()
    if rep < tex.shape[0]:                 # vorab verkleinern (wie Mipmap), sonst flimmert es
        tex = np.asarray(Image.fromarray(np.clip(tex, 0, 255).astype('uint8')).resize((int(rep), int(rep)), Image.LANCZOS), float)
    img = B.hex_render(tex, W, H, rep)
    for f in v.get('welt', []):
        img = f(img, z)
    ys, xs = np.mgrid[0:H, 0:W]
    img = img * (1.04 - 0.06 * ys / H - 0.03 * xs / W)[..., None]          # großer Lichtverlauf (oben links hell)
    obj = layout(z)
    img = contact_shadow(img, obj)
    img = place(img, obj)
    if 'stimmung' in v:
        img = v['stimmung'](img, obj)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'))


# ---------------------------------------------------------------- Varianten
def old_tex():
    return np.asarray(Image.open(sys.argv[2]).convert('RGB').resize((N, N), Image.BICUBIC), float) if len(sys.argv) > 2 else None


GRASS_CLASH = dict(dark=(92, 150, 40), light=(128, 182, 52), blade=(132, 190, 56), count=70000)
GRASS_HD = dict(dark=(128, 178, 52), light=(160, 204, 70), blade=(170, 212, 80), count=60000)


def lazy(f, *a, **k):
    box = []

    def get():
        if not box:
            box.append(f(*a, **k))
        return box[0]
    return get


def varianten():
    v = {}
    ot = old_tex()
    if ot is not None:
        v['00'] = dict(titel='Bisher: Mittelton-Schnee (deine 2)', text='Zum Vergleich, was du zuletzt gewählt hast.', tex=lambda: ot)
    gc = lazy(grass_tex, 11, **GRASS_CLASH)
    v['01'] = dict(titel='Clash-Weg: grüne Wiese, dicke Schneeschollen',
                   text='Wie Clash im Winter: Spielfläche grün, Schnee als dicke Schollen mit Kante und Schatten.',
                   tex=gc, welt=[lambda i, z: snow_slabs(i, z, 21, 0.30)])
    gh = lazy(grass_tex, 12, **GRASS_HD, frost=0.04)
    v['02'] = dict(titel='Hay-Day-Weg: sonnige Wiese, Schnee nur in Flecken',
                   text='Hell und freundlich, wenig Schnee, Raureif an Halmspitzen.',
                   tex=gh, welt=[lambda i, z: snow_slabs(i, z, 22, 0.13, thick=3)])
    v['03'] = dict(titel='Schneedecke, Grasinseln schauen durch',
                   text='Viel Schnee, aber das Grün gibt Farbe und Halt.',
                   tex=gc, welt=[lambda i, z: snow_slabs(i, z, 23, 0.68, thick=4)])
    gf = lazy(grass_tex, 14, (86, 128, 124), (120, 158, 150), (150, 184, 176), 70000, frost=0.35)
    v['04'] = dict(titel='Raureif-Wiese',
                   text='Gefrorenes Blaugrün, weiße Reifspitzen, Puderzucker-Flecken. Kein Schneefeld.',
                   tex=gf, welt=[lambda i, z: frost_patches(i, z, 24, 0.35)])
    sm = lazy(snow_tex, 15, (168, 186, 228), (236, 242, 252))
    v['05'] = dict(titel='Pulverschnee mit Form',
                   text='Ganz Schnee, aber große Verwehungen mit Licht und Schatten statt flacher Fläche.',
                   tex=sm, welt=[lambda i, z: drifts(i, z, 25, 0.75, (140, 150, 214), (252, 252, 255))])
    sb = lazy(snow_tex, 16, (104, 150, 226), (178, 208, 248), sparkle=360)
    v['06'] = dict(titel='Eisblau kräftig',
                   text='Satt blauer Schnee, klare Verwehungen, viel Glitzer. Gebäude leuchten davor.',
                   tex=sb, welt=[lambda i, z: drifts(i, z, 26, 0.6, (70, 104, 196), (214, 232, 255))])
    v['07'] = dict(titel='Goldene Stunde',
                   text='Wie 5, aber Abendsonne: Lichter pfirsich, Schatten violett.',
                   tex=sm, welt=v['05']['welt'], stimmung=lambda i, o: grade_golden(i))
    sn = lazy(snow_tex, 18, (150, 170, 222), (226, 236, 252), sparkle=500)
    v['08'] = dict(titel='Blaue Stunde mit warmem Licht',
                   text='Winterabend: tiefblauer Schnee, warme Lichtinseln um Gebäude (später echte Laternen).',
                   tex=sn, welt=[lambda i, z: drifts(i, z, 28, 0.6, (120, 130, 200), (250, 252, 255))],
                   stimmung=lambda i, o: grade_night(i, [(x, y - im.height * 0.25, im.width * 1.6) for im, x, y, n in o if 'coop' in n]))
    sp_ = lazy(snow_tex, 19, (214, 190, 222), (255, 244, 238), sparkle=420, warm=(255, 226, 214))
    v['09'] = dict(titel='Zuckerguss-Pastell',
                   text='Cremig-rosa Licht, flieder Schatten. Sehr weihnachtlich, wie Lebkuchen-Welt.',
                   tex=sp_, welt=[lambda i, z: drifts(i, z, 29, 0.55, (186, 160, 214), (255, 250, 246))])
    bt = lazy(brush_tex, 20, [(150, 168, 222), (188, 204, 240), (214, 226, 250), (240, 245, 255)])
    v['10'] = dict(titel='Pinsel-Gemälde',
                   text='Sichtbare breite Pinselstriche in vier Tönen, wie ein gemaltes Bilderbuch.',
                   tex=bt, welt=[lambda i, z: drifts(i, z, 30, 0.35, (130, 146, 210), (250, 252, 255))])
    et = lazy(earth_tex, 21)
    v['11'] = dict(titel='Alm im Frühwinter',
                   text='Trockenes Ockergras und erste Schneeschollen. Alpen-Gefühl, warm statt weiß.',
                   tex=et, welt=[lambda i, z: snow_slabs(i, z, 31, 0.28, thick=4)])
    mt = lazy(snow_tex, 22, (130, 196, 196), (222, 246, 242), sparkle=300)
    v['12'] = dict(titel='Mint-Frost',
                   text='Türkis-minziger Fantasie-Schnee. Sehr eigen, hebt sich von allen ab.',
                   tex=mt, welt=[lambda i, z: drifts(i, z, 32, 0.6, (84, 150, 168), (246, 255, 252))])
    v['13'] = dict(titel='Clash-Weg am Abend',
                   text='Variante 1 in Goldener Stunde: zeigt, wie Grün + Schnee mit Stimmung wirkt.',
                   tex=gc, welt=v['01']['welt'], stimmung=lambda i, o: grade_golden(i))
    return v


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[3].split(',') if len(sys.argv) > 3 else None
    for key, v in varianten().items():
        if only and key not in only:
            continue
        for zoom, tag in ((NAH, 'nah'), (WEIT, 'weit')):
            render(v, zoom).save(OUT / f'v{key}_{tag}.jpg', quality=86)
        Image.fromarray(np.clip(v['tex'](), 0, 255).astype('uint8')).save(OUT / f'tex_{key}.png')
        print(key, v['titel'], flush=True)
