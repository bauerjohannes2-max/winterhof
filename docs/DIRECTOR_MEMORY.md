# Winterhof — Director Memory & Creative Constitution

Dauerhaftes Gedächtnis aller Entscheidungen, Visionen und Feedback-Regeln des Spiel-Direktors (Mensch). Jede neue Sitzung und jeder Meilenstein muss diese Vorgaben einhalten.

## 1. Kernvision & Qualitätsanspruch
- **Ziel-Niveau:** Echte AAA-Mobile-Referenz auf Augenhöhe mit **Hay Day**, **Clash of Clans** und **Clash Royale** (Supercell-Standard in Grafik-Kohärenz, Lebendigkeit, Haptik und Performance).
- **Thema (unveränderlich):** 100 % reines **Alpen-Weihnachtsdorf („Winterhof“)** — kein Themen-Mix.
- **Format (unveränderlich):** **Nur Querformat (Landscape-Only)** inkl. sauberem Zero-Emoji „Handy drehen“-Hinweis im Hochformat.
- **UI-Stil (unveränderlich):** Strikte **0-Emoji-Politik**, kommerzieller Minimalismus, eigene hochwertige Vektor-/Grafik-Assets.

## 2. Zusammenarbeit (Mensch = Creative Director, Agent = Technical Director)
- **Visuelle Entscheidungen immer am Bild:** Niemals reine Text-Beschreibungen für Stil-Entscheidungen verlangen — immer echte Vergleichsbilder, Concept-Boards oder Live-Screenshots zeigen.
- **Stück für Stück (Vertical Slices):** Kleine, klar sichtbare Meilensteine bauen, per Auto-Gate vorprüfen, dann live auf GitHub Pages + per Screenshots vom Director abnehmen lassen.
- **Rollenverteilung:**
  - Agent verantwortet Technik, Engine-Architektur, Best-Practice-Qualität, Selbst-Audit und Sync (`main`, GitHub Pages, Google Drive).
  - Director bewertet als Mensch knallhart Aussehen, Atmosphäre und Spielgefühl („schaut gut/schlecht aus“, „fühlt sich gut/schlecht an“).
- **Pflicht zur Konservierung:** Jedes menschliche Feedback wird unten im Log mit Datum & konkreter Auswirkung festgehalten.

## 3. Bestätigte Grundentscheidungen
- **2026-11-23 — Render-Engine:** **PixiJS v8 WebGL 2.5D (Supercell CoC/CR-Hybrid-Technik)** + AI-generierte Terrain-Atlanten, 4-Frame-Sprite-Sheets, Multi-Part-Building-Rigging & GLSL Wasser-/Licht-Shader.
- **2026-11-23 — Build & Sync:** Vite ESM-Bundle, automatisches GitHub-Pages-Deployment via GitHub Actions bei jedem Push auf `main`, Google-Drive-Sync nach jedem Meilenstein.
- **2026-11-23 — Vorgehen:** Ultra-kleiner **Vertical Slice 1** zuerst (nur neues Terrain + PixiJS-Licht/Wasser + Querformat-Lock live zeigen -> Director-Go -> dann animierte Figuren/Gebäude).
- **2026-11-23 — Stil-Findung (FINAL):** **Stil C (Knackiges Supercell / Clash-of-Clans Terrassen-Tal)** als Tag-Basis (skulptierte Schneefelsen-Terrassen, markantes Kopfsteinpflaster, maximale Mobile-Klarheit) kombiniert mit **Stil B (Märchenhafte Goldene Stunde)** als Dämmerungs-Lichtstimmung + tiefblaue Nacht mit warmem Gold-Bloom.

## 4. Director-Feedback-Log (append-only)
- **2026-11-23 (Look-Dev):** Stil-Entscheidungen immer visuell am Bild treffen. Gewähltes Zielbild: Stil C (Tag/Struktur) + Stil B (Goldene Stunde). Vertical Slice 1 zuerst: Terrain + PixiJS-Wasser/Licht + Querformat live abnehmen vor Figuren-Animationen.
- **2026-11-23 (Kritisches Review Slice 1 — MASSGEBENDES GESETZ):**
  1. **Logik & echtes Raster VOR Grafik:** Nie wieder lose Koordinaten! Zuerst Single-Source-of-Truth `WorldGrid` mit harten Invarianten bauen (Zaun NIEMALS im Wasser, Haus NIEMALS auf Zaun oder Gehweg, Brücke immer exakt in Straßenrichtung über Bach, Wege sauber gerastert ohne Zufalls-Flecken).
  2. **Automatische 1000-Fehler-Prüfung:** Ein strikter `WorldValidator` muss vor jedem Build alle räumlichen, topologischen und Pfad-Invarianten mathematisch erzwingen — der Director darf solche Grundfehler nie selbst finden müssen.
  3. **Grounding gegen Schweben:** Jedes Gebäude/Objekt braucht eine echte isometrische Boden-Grundplatte (Footprint), einheitliche Boden-Ankerzeile und kalibrierte Kontaktschatten; Boden-Schnee deutlich ruhiger & wertiger.
  4. **HUD / Buttons auf echtes Hay-Day-/CoC-Niveau umbauen:** Bestehende flache braune Kreise verworfen. Neue plastische 3D-Tactile-Buttons (Gloss-Highlight, dicke Bevels, fette schattierte Spiel-Typografie, hochwertige Spiel-Icons).
  5. **Mobile-First Steuerung:** `+`/`-`-Zoom-Buttons am rechten Rand KOMPLETT entfernen (Pinch-Zoom auf Handy + Mausrad am PC).
  6. **2.5D-Sprites bestätigt:** Vorgerenderte 3D-Sprites (= Supercell Titan-Engine in Hay Day & CoC) sind das richtige technische Fundament — entscheidend sind striktes Raster, Grounding, einheitliche Perspektive und echte Spiel-Logik.
