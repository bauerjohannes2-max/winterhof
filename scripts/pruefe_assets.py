"""
Winterhof – Asset-Prüfung (Ampel) gegen den Größenkatalog + Aufstellungsbild.

Eine Quelle: src/content/winterhof.json -> sizes (Grundfläche + Bildhöhe je Objekt, Baustein 5b)
und art.sprites (Bild -> Katalog-Eintrag, Bodenpunkt). Bilder liegen in art_src/spiel{m}/objekte{tps}.
Regeln: docs/GROESSEN_KATALOG.md, docs/STIL_REGELN.md.

  ROT   Katalog-Eintrag fehlt, Datei fehlt, kein Alpha-Kanal, Höhe 0 bei einem stehenden Objekt
  GELB  zu wenig Auflösung (< art.minSourcePxPerWorldPx), unten mehr als 4 % leer (schwebt),
        Bildbreite passt nicht zur Grundfläche (Gebäude, Wahrzeichen, Felder, Gehege: 85–115 % der Rautenbreite)
  GRÜN  alles im Rahmen
Zusätzlich (Hinweis, keine Ampel): Katalog-Einträge ohne Bild, Bilder ohne Eintrag.

Schreibt docs/qa/asset_report.md und docs/qa/aufstellung.png (alle Katalog-Einträge, fehlende Bilder als Klötzchen).

Aufruf:
  python scripts/pruefe_assets.py
  python scripts/pruefe_assets.py --set chalet=2.4 --out docs/qa/vorschau.png   (Vorschau, Daten bleiben unverändert)

Exit-Code 1 bei ROT (für CI).
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from katalog_skizze import SPR, zeichne_katalog  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'src' / 'content' / 'winterhof.json'
QA = ROOT / 'docs' / 'qa'
MAX_BOTTOM_EMPTY = 0.04
# Objekte, die ihre ganze Grundfläche füllen: Bildbreite muss zur Raute passen
FILLS_FOOTPRINT = {'building', 'landmark', 'field', 'pen'}
WIDTH_RANGE = (0.85, 1.15)


def alpha_bbox(img):
    return img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()


def check(content):
    art, sizes = content['art'], content['sizes']
    min_px = art.get('minSourcePxPerWorldPx', 1.6)
    tile = art['tilePx']
    results = {}
    for key, sp in art['sprites'].items():
        red, yellow = [], []
        sz = sizes.get(sp.get('size'))
        path = SPR / sp['file']
        if sz is None:
            red.append(f"Katalog-Eintrag {sp.get('size')} fehlt")
        elif sz['heightTiles'] <= 0:
            red.append('Höhe 0 im Katalog, Bild steht aber auf dem Boden')
        if not path.exists():
            red.append(f'Datei fehlt: {sp["file"]}')
        elif sz is not None and sz['heightTiles'] > 0:
            img = Image.open(path)
            if 'A' not in img.getbands():
                red.append('kein durchsichtiger Hintergrund')
            img = img.convert('RGBA')
            bbox = alpha_bbox(img) or (0, 0, img.width, img.height)
            empty = (img.height - bbox[3]) / img.height
            if empty > MAX_BOTTOM_EMPTY:
                yellow.append(f'unten {empty:.0%} leer (max. 4 %) – Objekt schwebt')
            h = sz['heightTiles']
            px_per_world = img.height / (h * tile)
            if px_per_world < min_px:
                yellow.append(f'Auflösung {px_per_world:.2f} px/Weltpunkt (min. {min_px})')
            if sz['group'] in FILLS_FOOTPRINT and 'w' in sz:
                width_tiles = (bbox[2] - bbox[0]) / img.height * h          # Bildbreite bei Zielhöhe, nie verzerrt
                ratio = width_tiles / ((sz['w'] + sz['h']) / 2)
                if not (WIDTH_RANGE[0] <= ratio <= WIDTH_RANGE[1]):
                    yellow.append(f'Breite {ratio:.0%} der Grundfläche {sz["w"]}×{sz["h"]} (Soll 85–115 %) – neues Bild nötig')
        results[key] = {'red': red, 'yellow': yellow}
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', action='append', default=[], help='katalog_key=hoehe (nur Vorschau)')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()

    content = json.loads(CONTENT.read_text(encoding='utf-8'))
    for s in args.set:
        k, v = s.split('=')
        if k.strip() not in content['sizes']:
            raise SystemExit(f'--set: {k} steht nicht im Größenkatalog (sizes)')
        content['sizes'][k.strip()]['heightTiles'] = float(v)

    results = check(content)
    lines = ['# Winterhof – Asset-Prüfung gegen den Größenkatalog', '']
    worst = 'GRÜN'
    for k, r in results.items():
        level = 'ROT' if r['red'] else 'GELB' if r['yellow'] else 'GRÜN'
        if level == 'ROT' or (level == 'GELB' and worst == 'GRÜN'):
            worst = level
        detail = '; '.join(r['red'] + r['yellow'])
        lines.append(f'- **{level}** `{k}` → `{content["art"]["sprites"][k]["size"]}`' + (f' – {detail}' if detail else ''))

    used = {sp['size'] for sp in content['art']['sprites'].values()}
    no_img = [k for k, v in content['sizes'].items() if k not in used and v['heightTiles'] > 0]
    lines += ['', '## Katalog-Einträge ohne Bild (Klötzchen in der Aufstellung)', ', '.join(f'`{k}`' for k in no_img) or '- keine']
    overlays = content['art'].get('overlays', {})
    for ok, ov in overlays.items():
        opath = SPR / ov['file']
        if not opath.exists():
            lines.append(f'- **ROT** Overlay `{ok}` fehlt: {ov["file"]}')
            worst = 'ROT'
        else:
            oimg = Image.open(opath)
            if 'A' not in oimg.getbands():
                lines.append(f'- **ROT** Overlay `{ok}` ohne Alpha-Kanal')
                worst = 'ROT'
    known = {sp['file'] for sp in content['art']['sprites'].values()} | {ov['file'] for ov in overlays.values()}
    extra = sorted(p.name for p in SPR.glob('*.png') if p.name not in known)
    lines += ['', '## Bilder ohne Eintrag in art.sprites'] + ([f'- {e}' for e in extra] or ['- keine'])

    out_img = Path(args.out) if args.out else QA / 'aufstellung.png'
    out_img = out_img if out_img.is_absolute() else ROOT / out_img
    zeichne_katalog(content, out_img)
    lines += ['', f'Gesamt: **{worst}**', '', f'Aufstellungsbild: {out_img.relative_to(ROOT) if out_img.is_relative_to(ROOT) else out_img}']
    if not args.set:
        (QA / 'asset_report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines))
    sys.exit(1 if worst == 'ROT' else 0)


if __name__ == '__main__':
    main()
