"""Wiesen-Textur fürs Spiel (Baustein 5, Entscheidung 41): Variante D nach Hay-Day-Technik (scripts/wiese_halme.py).

Glatter Grund, Einzelhalme in kleinen Gruppen; Trockenflecken und Lichtflecken macht der Shader in Weltkoordinaten.
Nahtlos (1024 px, Hex-Tiling im Shader). Ziel: art_src/spiel{m}/boden/wiese.png (@2x-Quelle für AssetPack).
Aufruf: python scripts/boden_wiese.py
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import wiese_halme as WH  # noqa: E402

tex = WH.wiese()   # Standardwerte = Variante D (Hannes 25.11.)
out = ROOT / 'art_src/spiel{m}/boden/wiese.png'
Image.fromarray(np.clip(tex, 0, 255).astype('uint8')).save(out)
print(out, tex.shape)
