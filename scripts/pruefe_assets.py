"""
Winterhof – Asset-Prüfung (Ampel) + Aufstellungsbild.

Prüft jedes Bild der Größentabelle (src/content/winterhof.json -> art.sprites)
gegen docs/STIL_REGELN.md:
  ROT   Datei fehlt, kein Alpha-Kanal, Höhe außerhalb der Gruppe, Größenverhältnis verletzt
  GELB  zu wenig Auflösung (< art.minSourcePxPerWorldPx), unten mehr als 4 % leer
  GRÜN  alles im Rahmen
Schreibt docs/qa/asset_report.md und docs/qa/aufstellung.png.

Aufruf:
  python scripts/pruefe_assets.py
  python scripts/pruefe_assets.py --set animal_sheep=0.5 --out docs/qa/vorschau.png   (Vorschau, Daten bleiben unverändert)

Exit-Code 1 bei ROT (für CI).
Hinweis: Liegt bewusst in scripts/ (nicht scripts/qa/, das ist Testausgabe und wird nicht gesichert).
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'src' / 'content' / 'winterhof.json'
SPRITES = ROOT / 'assets' / 'sprites'
QA = ROOT / 'docs' / 'qa'
MAX_BOTTOM_EMPTY = 0.04


def alpha_bbox(img):
    a = img.getchannel('A')
    return a.point(lambda v: 255 if v > 8 else 0).getbbox()


def check(art, overrides):
    sprites = {k: dict(v) for k, v in art['sprites'].items()}
    for k, h in overrides.items():
        if k not in sprites:
            raise SystemExit(f'--set: {k} steht nicht in art.sprites')
        sprites[k]['heightTiles'] = h
    cats = art['categories']
    min_px = art.get('minSourcePxPerWorldPx', 1.6)
    tile = art.get('tilePx', 116)
    results, images = {}, {}

    for key, d in sprites.items():
        red, yellow = [], []
        path = SPRITES / d['file']
        h = float(d.get('heightTiles', 0))
        cat = cats.get(d.get('category'))
        if cat is None:
            red.append(f"unbekannte Gruppe {d.get('category')}")
        elif not (cat['heightTiles'][0] <= h <= cat['heightTiles'][1]):
            red.append(f"Höhe {h} außerhalb {cat['label']} {cat['heightTiles'][0]}–{cat['heightTiles'][1]}")
        if not path.exists():
            red.append(f'Datei fehlt: {d["file"]}')
        else:
            img = Image.open(path)
            if img.mode != 'RGBA':
                if 'A' not in img.getbands():
                    red.append('kein durchsichtiger Hintergrund')
                img = img.convert('RGBA')
            images[key] = img
            bbox = alpha_bbox(img)
            if bbox:
                empty = (img.height - bbox[3]) / img.height
                if empty > MAX_BOTTOM_EMPTY:
                    yellow.append(f'unten {empty:.0%} leer (max. 4 %) – Objekt schwebt')
            px_per_world = img.height / (h * tile) if h > 0 else 0
            if px_per_world < min_px:
                yellow.append(f'Auflösung {px_per_world:.2f} px/Weltpunkt (min. {min_px})')
        results[key] = {'red': red, 'yellow': yellow, 'h': h}

    rel_msgs = []
    for r in art.get('relations', []):
        a, b = r['smaller'], r['larger']
        if a not in sprites or b not in sprites:
            continue
        ha, hb = float(sprites[a]['heightTiles']), float(sprites[b]['heightTiles'])
        if ha >= hb:
            rel_msgs.append(f'{a} ({ha}) muss kleiner sein als {b} ({hb})')
        elif 'maxRatio' in r and ha / hb > r['maxRatio']:
            rel_msgs.append(f'{a}/{b} = {ha / hb:.2f}, erlaubt max. {r["maxRatio"]}')
    return sprites, results, rel_msgs, images


def lineup(sprites, images, out, tile_px_draw=90):
    keys = sorted(images, key=lambda k: float(sprites[k]['heightTiles']))
    scaled, total_w, max_h = [], 40, 0
    for k in keys:
        img = images[k]
        bbox = alpha_bbox(img) or (0, 0, img.width, img.height)
        crop = img.crop(bbox)
        h_px = max(1, int(float(sprites[k]['heightTiles']) * tile_px_draw))
        w_px = max(1, int(crop.width * h_px / crop.height))  # nie verzerren
        scaled.append((k, crop.resize((w_px, h_px), Image.LANCZOS)))
        total_w += max(w_px, len(k) * 8) + 30
        max_h = max(max_h, h_px)
    H = max_h + 120
    canvas = Image.new('RGBA', (total_w + 40, H), (234, 242, 250, 255))
    dr = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('arial.ttf', 14)
    except OSError:
        font = ImageFont.load_default()
    ground = H - 60
    for t in range(0, int(max_h / tile_px_draw) + 2):
        y = ground - t * tile_px_draw
        dr.line([(0, y), (canvas.width, y)], fill=(190, 205, 222, 255), width=1)
        dr.text((6, y - 16), f'{t} Kachel', fill=(90, 110, 140, 255), font=font)
    dr.line([(0, ground), (canvas.width, ground)], fill=(80, 60, 40, 255), width=2)
    x = 60
    for k, im in scaled:
        canvas.alpha_composite(im, (x, ground - im.height))
        dr.text((x, ground + 8), k, fill=(60, 40, 20, 255), font=font)
        dr.text((x, ground + 26), f"{sprites[k]['heightTiles']}", fill=(120, 90, 50, 255), font=font)
        x += max(im.width, int(dr.textlength(k, font=font))) + 30
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert('RGB').save(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', action='append', default=[], help='key=hoehe (nur Vorschau)')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()
    overrides = {}
    for s in args.set:
        k, v = s.split('=')
        overrides[k.strip()] = float(v)

    content = json.loads(CONTENT.read_text(encoding='utf-8'))
    art = content['art']
    sprites, results, rel_msgs, images = check(art, overrides)

    lines = ['# Winterhof – Asset-Prüfung', '']
    worst = 'GRÜN'
    for k, r in results.items():
        level = 'ROT' if r['red'] else 'GELB' if r['yellow'] else 'GRÜN'
        if level == 'ROT' or (level == 'GELB' and worst == 'GRÜN'):
            worst = level
        detail = '; '.join(r['red'] + r['yellow'])
        lines.append(f'- **{level}** `{k}`' + (f' – {detail}' if detail else ''))
    lines += ['', '## Größenverhältnisse']
    if rel_msgs:
        worst = 'ROT'
        lines += [f'- ROT {m}' for m in rel_msgs]
    else:
        lines.append('- alle im Rahmen')
    known = {Path(d['file']).name for d in art['sprites'].values()}
    extra = sorted(p.stem for p in SPRITES.glob('*.webp') if p.name not in known)
    lines += ['', '## Bilder ohne Eintrag in der Größentabelle'] + ([f'- {e}' for e in extra] or ['- keine'])
    out_img = Path(args.out) if args.out else QA / 'aufstellung.png'
    lines += ['', f'Gesamt: **{worst}**', '', f'Aufstellungsbild: {out_img.relative_to(ROOT) if out_img.is_absolute() else out_img}']

    lineup(sprites, images, out_img if out_img.is_absolute() else ROOT / out_img)
    if not overrides:
        (QA / 'asset_report.md').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))
    sys.exit(1 if worst == 'ROT' else 0)


if __name__ == '__main__':
    main()
