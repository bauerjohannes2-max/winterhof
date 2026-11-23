# Winterhof — Handoff Note (Stand: v6 Vertical Slice 1, 2026-11-23)

## 1. Aktueller Projektstand
- **Lokales Git-Repo (Windows):** `c:\Users\hannes.bauer\OneDrive - Farbenbauer GmbH & Co KG\Privat\Hannes\Programmieren_Spiele\Antigravity\winterhof` (Branch `main`).
- **Live GitHub Pages:** `https://bauerjohannes2-max.github.io/winterhof/` (automatischer Vite-Build via `.github/workflows/deploy-pages.yml`).
- **Google Drive Backup (`Winterhof`):** https://drive.google.com/drive/folders/1R5uN6cih27bQP56rs0ZRjOoeELPLcRJM
- **Governance & Benchmark:** `docs/DIRECTOR_MEMORY.md`, `docs/QUALITY_BENCHMARK.md`, Golden Visual Targets (`docs/lookdev_target_day_style_c.jpg`, `docs/lookdev_target_dusk_style_b.jpg`).
- **Technik (v6 Slice 1):** Vite 6 + **PixiJS v8 WebGL 2.5D** (Supercell CoC/CR-Hybrid), Custom GLSL Glacial Brook Shader, 3-Phasen GPU-Beleuchtung (Tag / Style-B Goldene Stunde / Saphir-Nacht mit Add-Bloom), Landscape-Only Lock, Zero-GC Entity-/Partikel-Pools, `60.1 FPS`, `0` Fehler, `0` Emojis.

## 2. Nächster Schritt (nach Director-Review von Vertical Slice 1)
1. Director-Feedback zu Slice 1 in `docs/DIRECTOR_MEMORY.md` eintragen und ggf. sofort nachjustieren.
2. **Vertical Slice 2 (Lebendige Welt & Animationen):** 4-Frame-Sprite-Sheets für Tiere & Dorfbewohner, animierte Gebäudeteile (drehendes Rad, Ofenglut, schwingende Werkstatt-Deko), 3D-WebP-Upgrade für Kakao/Zimt/Zuckerstange/Truhe/Hühnerstall (sobald Bild-Quota zurückgesetzt ist).
