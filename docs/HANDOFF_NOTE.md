# Winterhof — Handoff Note für neue Sitzung (Stand: v5 AAA, 2026-11-23)

## 1. Aktueller Projektstand (alles lokal gespeichert & auf Google Drive gesynct)
- **Lokales Git-Repo (Windows):** `c:\Users\hannes.bauer\OneDrive - Farbenbauer GmbH & Co KG\Privat\Hannes\Programmieren_Spiele\Antigravity\winterhof` (Branch `main`, Commit `f6aea7d`+).
- **Google Drive Backup (`Winterhof`):** https://drive.google.com/drive/folders/1R5uN6cih27bQP56rs0ZRjOoeELPLcRJM (`winterhof-pwa.zip`, `winterhof-standalone.html`, `winterhof-v5-source.zip`, Docs).
- **GitHub CLI installiert:** `C:\Users\hannes.bauer\Tools\gh\bin\gh.exe` (Account: `bauerjohannes2-max`, Ziel-Repo: `winterhof` -> GitHub Pages `https://bauerjohannes2-max.github.io/winterhof/`).
- **Thema (fixiert):** 100 % reines **Alpen-Weihnachtsdorf („Winterhof“)** — kein Halloween/Herbst/Harry-Potter-Mix.
- **UI-Standard (fixiert):** Strikte **0-Emoji-Politik**, kommerzieller Minimalismus, Hay-Day-Ecken-Medaillons, ruhiger Level-1-Start ohne Begrüßungsbrief-Popup.
- **Format-Entscheidung (NEU):** **Nur Querformat (`Landscape`)** wie echtes Hay Day (mit sauberem „Handy drehen“-Overlay im Hochformat).
- **QA-Status v5:** Alle E2E-Tests (`scripts/e2e_test.mjs`) bestanden, 0 Konsolenfehler, 0 Emojis im gesamten DOM/Modals.

## 2. Zentrale Architektur-Entscheidung für v6 (Echte Hay-Day-Technik!)
Der Nutzer will keinen einfachen „statische Bilder auf flachem 2D-Canvas“-Ansatz mehr, sondern die **echte Technik von Top-Spielen wie Hay Day**:
1. **Querformat-Lock (`Landscape-Only`)** für echtes filmisches Farm-Framing.
2. **Kein prozedurales Flach-Terrain (`ctx.ellipse`/Linien) mehr:** Umstieg auf **WebGL / PixiJS (2.5D GPU) oder Three.js (echtes 3D-Isometrie-Mesh)** mit:
   - Handgemaltem, kachellosem **Terrain-Textur-Atlas** (Schnee, Trampelpfade, Eisbach-Shader, Autotile-Wege & Zäune).
   - **Animierten Figuren & Gebäuden** (Mehrteil-Rigging / Sprite-Sheet-Zyklen für laufende Tiere, Dorfbewohner, drehende Räder/Klappen/Schlitten — keine starren 1-Frame-Sticker).
   - **GPU-Beleuchtung, weichen Kontaktschatten & Partikel-Shadern** (Schnee, Kaminrauch, warmes Abendlicht).
3. **Nächster erster Schritt in der neuen Sitzung:**
   - Zuerst Architektur-Entscheidung mit dem Nutzer final bestätigen: **Option A: PixiJS WebGL 2.5D (Supercell-Hybrid: gemalte Terrain-Tiles + animierte Sprite-Sheets/Rigging + GPU-Lighting)** vs. **Option B: Three.js Echtes 3D (orthografische Isometrie + 3D-Terrain-Mesh + stilisierte 3D-Modelle `.glb`)**.
   - Danach `implementation_plan.md` schreiben, Querformat-Lock + neue Rendering-Engine umsetzen, per Chromium-Screenshots gegen echtes Hay-Day-Referenzniveau abnehmen und per `git push` direkt auf GitHub Pages aktualisieren.
