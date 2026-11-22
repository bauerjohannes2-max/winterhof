"""
Cross-platform (Windows / macOS / Linux) bundler for Winterhof & Zauberherbst.
Builds inside dist/:
  1. winterhof-standalone.html (single offline HTML with all 28 WebP sprites + splash art inlined)
  2. winterhof-pwa.zip         (ready-to-host PWA bundle)
  3. winterhof-v3-source.zip   (clean full source repository archive for local Windows IDE use)
"""
import base64
import json
import os
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SPRITE_DIR = ROOT / "assets" / "sprites"

JS_ORDER = [
    "src/gameData.js",
    "src/audio.js",
    "src/sprites.js",
    "src/giftExchange.js",
    "src/world.js",
    "src/main.js",
]


def strip_es_modules(code: str) -> str:
    code = re.sub(r"^\s*import\s+[\s\S]*?from\s+['\"][^'\"]+['\"];?\s*$", "", code, flags=re.MULTILINE)
    code = re.sub(r"^(\s*)export\s+(?=(const|let|var|function|class)\s)", r"\1", code, flags=re.MULTILINE)
    return code


def build_standalone() -> Path:
    DIST.mkdir(parents=True, exist_ok=True)

    assets_map = {}
    for p in sorted(SPRITE_DIR.glob("*.webp")):
        b64 = base64.b64encode(p.read_bytes()).decode("ascii")
        assets_map[p.stem] = f"data:image/webp;base64,{b64}"

    splash_path = ROOT / "assets" / "splash_art.webp"
    if splash_path.exists():
        assets_map["splash_art"] = "data:image/webp;base64," + base64.b64encode(splash_path.read_bytes()).decode("ascii")

    icon_b64 = "data:image/png;base64," + base64.b64encode((ROOT / "assets" / "icon-180.png").read_bytes()).decode("ascii")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    html = (ROOT / "index.html").read_text(encoding="utf-8")

    bundled_js_parts = [f"window.__WINTERHOF_ASSETS__ = {json.dumps(assets_map)};"]
    for rel in JS_ORDER:
        src = strip_es_modules((ROOT / rel).read_text(encoding="utf-8"))
        bundled_js_parts.append(f"// === {rel} ===\n{src}")

    bundled_js = "(function(){\n'use strict';\n" + "\n\n".join(bundled_js_parts) + "\n})();"

    html = html.replace('<link rel="manifest" href="./manifest.json" />', "")
    html = html.replace("./assets/icon-180.png", icon_b64)
    html = html.replace('<link rel="stylesheet" href="./styles.css" />', f"<style>\n{css}\n</style>")
    html = html.replace('<script type="module" src="./src/main.js"></script>', f"<script>\n{bundled_js}\n</script>")

    out_path = DIST / "winterhof-standalone.html"
    out_path.write_text(html, encoding="utf-8")
    print(f"Built standalone HTML: {out_path} ({out_path.stat().st_size / 1024:.1f} KB)")
    return out_path


def build_pwa_zip() -> Path:
    zip_path = DIST / "winterhof-pwa.zip"
    include_files = [
        "index.html",
        "styles.css",
        "manifest.json",
        "sw.js",
        ".nojekyll",
        "assets/icon-180.png",
        "assets/icon-512.png",
        "assets/splash_art.webp",
    ] + JS_ORDER + [f"assets/sprites/{p.name}" for p in sorted(SPRITE_DIR.glob("*.webp"))]

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in include_files:
            fp = ROOT / rel
            if fp.exists():
                zf.write(fp, rel)

    print(f"Built PWA zip: {zip_path} ({zip_path.stat().st_size / 1024:.1f} KB)")
    return zip_path


def build_source_zip() -> Path:
    zip_path = DIST / "winterhof-v4-source.zip"
    skip_dirs = {".git", "dist", "qa", "__pycache__", "node_modules"}
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(ROOT):
            dirs[:] = [d for d in sorted(dirs) if d not in skip_dirs]
            for fname in sorted(files):
                if fname.endswith((".png", ".pyc")) and Path(root).name == "scripts":
                    continue
                fp = Path(root) / fname
                rel = fp.relative_to(ROOT).as_posix()
                zf.write(fp, f"winterhof/{rel}")

    print(f"Built full source zip: {zip_path} ({zip_path.stat().st_size / 1024:.1f} KB)")
    return zip_path


if __name__ == "__main__":
    build_standalone()
    build_pwa_zip()
    build_source_zip()
