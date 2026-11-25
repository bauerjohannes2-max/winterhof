"""Grundboden-Texturen gemalt, ruhig, fast einfarbig (Entscheidung 26, wie Hay Day).

Alles aus periodischem Rauschen (FFT-gefiltert) → von Natur aus nahtlos, kein Überblenden nötig.
Gemalter Eindruck: Helligkeit in wenige Tonstufen gelegt und leicht weichgezeichnet (Pinselkante statt Foto-Rauschen).

Aufruf:
  python scripts/boden_erzeugen.py bogen            → Kandidaten + Auswahlbogen in docs/qa/neustart/b05_bogen.png
  python scripts/boden_erzeugen.py nimm <nr>        → Kandidat <nr> nach art_src/spiel{m}/boden/schnee.png
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

N = 512
ROOT = Path(__file__).resolve().parent.parent
OUT_TMP = ROOT / 'docs' / 'qa' / 'neustart' / 'b05_kandidaten'


def noise(seed, scale, aniso=1.0, angle=0.0):
    """Periodisches Rauschen 0..1, Strukturgröße ~scale px; aniso > 1 = in Richtung angle gestreckt (Windstriche)."""
    rng = np.random.default_rng(seed)
    f = np.fft.fftfreq(N)
    fx, fy = np.meshgrid(f, f)
    c, s = np.cos(angle), np.sin(angle)
    u, v = fx * c + fy * s, -fx * s + fy * c
    r = np.sqrt((u * aniso) ** 2 + (v / aniso) ** 2) * scale
    amp = np.exp(-r * r * 2.0)
    amp[0, 0] = 0
    spec = (rng.normal(size=(N, N)) + 1j * rng.normal(size=(N, N))) * amp
    out = np.real(np.fft.ifft2(spec))
    out -= out.min()
    return out / out.max()


def periodic_blur(a, px):
    """Weichzeichnen mit Umlauf (bleibt nahtlos)."""
    f = np.fft.fftfreq(N)
    fx, fy = np.meshgrid(f, f)
    g = np.exp(-2 * (np.pi * px) ** 2 * (fx ** 2 + fy ** 2))
    if a.ndim == 2:
        return np.real(np.fft.ifft2(np.fft.fft2(a) * g))
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., i]) * g)) for i in range(a.shape[2])], -1)


def painted(field, levels, soft):
    """Tonstufen wie mit dem Pinsel gesetzt, Kanten weich."""
    q = np.floor(field * levels) / (levels - 1)
    return np.clip(periodic_blur(q, soft), 0, 1)


def colorize(t, dark, light):
    dark, light = np.array(dark, float), np.array(light, float)
    return dark + (light - dark) * t[..., None]


def strokes(rng, img, count, length, width, color, angle, jitter, alpha):
    """Wenige kurze Pinselstriche (Windkanten / Halme), mit Umlauf gezeichnet."""
    layer = Image.new('L', (N * 3, N * 3), 0)
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        x, y = rng.uniform(0, N, 2)
        a = angle + rng.normal(0, jitter)
        L = length * rng.uniform(0.6, 1.3)
        pts = []
        for k in range(8):
            t = k / 7
            bend = np.sin(t * np.pi) * L * 0.12
            pts.append((x + np.cos(a) * L * t - np.sin(a) * bend, y + np.sin(a) * L * t + np.cos(a) * bend))
        for ox in (0, N, 2 * N):
            for oy in (0, N, 2 * N):
                d.line([(px + ox, py + oy) for px, py in pts], fill=255, width=width, joint='curve')
    m = np.asarray(layer, float)[N:2 * N, N:2 * N] / 255
    m = periodic_blur(m, 0.8) * alpha
    return img * (1 - m[..., None]) + np.array(color, float) * m[..., None]


def tufts(rng, img, count, color, size):
    """Vereinzelte Halme/Zweigspitzen, die durch den Schnee schauen (wenige, klare Details)."""
    layer = Image.new('RGBA', (N * 3, N * 3), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        x, y = rng.uniform(0, N, 2)
        blades = rng.integers(3, 6)
        for b in range(blades):
            a = -np.pi / 2 + rng.normal(0, 0.45)
            L = size * rng.uniform(0.5, 1.0)
            bx = x + rng.normal(0, size * 0.15)
            for ox in (0, N, 2 * N):
                for oy in (0, N, 2 * N):
                    d.line([(bx + ox, y + oy), (bx + ox + np.cos(a) * L, y + oy + np.sin(a) * L)], fill=tuple(color) + (255,), width=4)
        # kleiner Schneerest am Fuß
        for ox in (0, N, 2 * N):
            for oy in (0, N, 2 * N):
                d.ellipse([x + ox - size * 0.35, y + oy - 2, x + ox + size * 0.35, y + oy + 3], fill=(250, 252, 255, 230))
    arr = np.asarray(layer, float)[N:2 * N, N:2 * N]
    a = periodic_blur(arr[..., 3] / 255, 0.5)[..., None]
    return img * (1 - a) + arr[..., :3] * a


def sparkles(rng, img, count):
    for _ in range(count):
        x, y = rng.integers(0, N, 2)
        for dx, dy, k in ((0, 0, 1.0), (1, 0, .4), (-1, 0, .4), (0, 1, .4), (0, -1, .4)):
            p = img[(y + dy) % N, (x + dx) % N]
            img[(y + dy) % N, (x + dx) % N] = p + (np.array([255, 255, 255.]) - p) * k
    return img


# Grundtöne: kein Papierweiß, Licht oben links → Schatten kühl-blau, Lichter leicht warm
SHADOW = (206, 220, 238)
LIGHT = (246, 248, 250)


def kandidat(nr):
    rng = np.random.default_rng(100 + nr)
    if nr == 1:   # Ganz glatt: nur große weiche Flecken, kaum sichtbar
        t = painted(noise(1, 110), 5, 10) * 0.7 + 0.3
        img = colorize(t, SHADOW, LIGHT)
        img = sparkles(rng, img, 10)
    elif nr == 2:  # Weiche Flecken (Hay-Day-Gras übertragen): 3 Tonstufen, Pinselkanten
        base = noise(2, 120) * 0.7 + noise(22, 45) * 0.3
        t = painted(base, 3, 6) * 0.55 + 0.45
        img = colorize(t, SHADOW, LIGHT)
        img = sparkles(rng, img, 14)
    elif nr == 3:  # Sanfte Windwellen: gestreckte Flecken, wenige helle Kanten
        base = noise(3, 90, aniso=2.6, angle=-0.25) * 0.75 + noise(33, 140) * 0.25
        t = painted(base, 4, 4) * 0.7 + 0.3
        img = colorize(t, SHADOW, LIGHT)
        img = strokes(rng, img, 7, 110, 3, (252, 253, 255), -0.25, 0.15, 0.8)
        img = sparkles(rng, img, 10)
    elif nr == 4:  # Wie 1, dazu wenige lange, ganz feine Windkanten
        t = painted(noise(1, 110), 5, 10) * 0.7 + 0.3
        img = colorize(t, SHADOW, LIGHT)
        img = strokes(rng, img, 4, 150, 3, (252, 253, 255), -0.25, 0.1, 0.7)
        img = sparkles(rng, img, 10)
    elif nr == 5:  # Kühler, mehr Tiefe: stärkere blaue Mulden, helle Kuppen
        base = noise(5, 110) * 0.75 + noise(55, 40) * 0.25
        t = painted(base, 4, 6) * 0.8 + 0.2
        img = colorize(t, (190, 207, 232), (247, 249, 252))
        img = sparkles(rng, img, 16)
    elif nr == 6:  # Wärmer, cremig: wie 2, Licht leicht warm, Schatten lila-grau
        base = noise(2, 120) * 0.7 + noise(22, 45) * 0.3
        t = painted(base, 3, 6) * 0.55 + 0.45
        img = colorize(t, (212, 214, 232), (250, 248, 244))
        img = sparkles(rng, img, 12)
    else:
        raise SystemExit(f'Kein Kandidat {nr}')
    return Image.fromarray(np.clip(img, 0, 255).round().astype('uint8'))


TITEL = {1: 'Ganz glatt', 2: 'Weiche Flecken', 3: 'Sanfte Windwellen',
         4: 'Glatt + feine Windkanten', 5: 'Kühler, mehr Tiefe', 6: 'Wärmer, cremig'}


# ---- Vorschau wie im Spiel: Hex-Tiling (gleich wie ground.ts), Boden 2:1 gestaucht --------------------------------
def hash22(p):
    p3 = np.stack([p[..., 0] * .1031, p[..., 1] * .1030, p[..., 0] * .0973], -1)
    p3 = p3 - np.floor(p3)
    d = (p3 * (p3[..., [1, 2, 0]] + 33.33)).sum(-1, keepdims=True)
    p3 = p3 + d
    r = np.stack([(p3[..., 0] + p3[..., 1]) * p3[..., 2], (p3[..., 0] + p3[..., 2]) * p3[..., 1]], -1)
    return r - np.floor(r)


def sample(tex, uv):
    h, w, _ = tex.shape
    x = (uv[..., 0] % 1) * w
    y = (uv[..., 1] % 1) * h
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    x1, y1 = (x0 + 1) % w, (y0 + 1) % h
    x0, y0 = x0 % w, y0 % h
    return (tex[y0, x0] * (1 - fx) + tex[y0, x1] * fx) * (1 - fy) + (tex[y1, x0] * (1 - fx) + tex[y1, x1] * fx) * fy


def hex_render(tex, W, H, repeat, cam=(0, 0)):
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    uv = np.stack([(xs + cam[0]) / repeat, (ys + cam[1]) * 2 / repeat], -1)
    st = uv * 3.4641016
    sk = np.stack([st[..., 0] - 0.57735027 * st[..., 1], 1.15470054 * st[..., 1]], -1)
    base = np.floor(sk)
    f = sk - base
    tz = 1 - f[..., 0] - f[..., 1]
    s = (tz < 0).astype(float)
    s2 = 2 * s - 1
    w = np.stack([-tz * s2, s - f[..., 1] * s2, s - f[..., 0] * s2], -1)
    v = [base + np.stack([s, s], -1), base + np.stack([s, 1 - s], -1), base + np.stack([1 - s, s], -1)]
    cs = [sample(tex, uv + hash22(vi)) for vi in v]
    lum = np.stack([(c * [0.3, 0.59, 0.11]).sum(-1) / 255 for c in cs], -1)
    w = w * (1 + (lum - 1) * 0.6)
    w = np.maximum(w, 0) ** 5
    w = w / w.sum(-1, keepdims=True)
    return sum(cs[i] * w[..., i:i + 1] for i in range(3))


def bogen():
    OUT_TMP.mkdir(parents=True, exist_ok=True)
    W, H, scale = 760, 430, 0.5        # Ausschnitt in Weltpunkten bei mittlerem Zoom (≈ 6 Kacheln breit), Texturmaßstab wie im Spiel
    coop = Image.open(ROOT / 'assets/sprites/probe/coop_v1.webp').convert('RGBA')
    coop = coop.resize((int(coop.width * 0.42), int(coop.height * 0.42)), Image.LANCZOS)
    field = Image.open(ROOT / 'assets/sprites/probe/field_ripe.webp').convert('RGBA')
    field = field.resize((int(field.width * 0.42), int(field.height * 0.42)), Image.LANCZOS)
    try:
        font = ImageFont.truetype('arialbd.ttf', 30)
    except OSError:
        font = ImageFont.load_default()
    panels = []
    for nr in TITEL:
        img = kandidat(nr)
        img.save(OUT_TMP / f'kandidat_{nr}.png')
        tex = np.asarray(img, float)
        view = hex_render(tex, W, H, 320 * scale * 2)   # 320 Welt = 1 Wiederholung, Vorschau in 1:1 Weltpunkten
        p = Image.fromarray(np.clip(view, 0, 255).astype('uint8')).convert('RGBA')
        p.alpha_composite(field, (W - field.width - 30, H - field.height - 20))
        p.alpha_composite(coop, (60, H - coop.height - 40))
        d = ImageDraw.Draw(p)
        d.rounded_rectangle([12, 12, 64, 58], 10, fill=(40, 60, 90, 230))
        d.text((38, 35), str(nr), font=font, fill='white', anchor='mm')
        d.text((76, 35), TITEL[nr], font=font, fill=(40, 60, 90), anchor='lm')
        panels.append(p)
    gap = 12
    sheet = Image.new('RGB', (W * 2 + gap * 3, H * 3 + gap * 4), (60, 70, 85))
    for i, p in enumerate(panels):
        sheet.paste(p, (gap + (i % 2) * (W + gap), gap + (i // 2) * (H + gap)), p)
    out = ROOT / 'docs/qa/neustart/b05_bogen.png'
    sheet.save(out)
    print(out)


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'bogen':
        bogen()
    elif len(sys.argv) >= 3 and sys.argv[1] == 'nimm':
        nr = int(sys.argv[2])
        kandidat(nr).save(ROOT / 'art_src/spiel{m}/boden/schnee.png')
        print('art_src/spiel{m}/boden/schnee.png ←', TITEL[nr])
    else:
        print(__doc__)
