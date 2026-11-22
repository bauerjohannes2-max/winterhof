# 🎄🍂 Winterhof & Zauberherbst

Ein gemütliches, handgemaltes Mobile-Farmspiel im **Hay-Day-Stil** für **iPhone & Android** (Hoch- & Querformat, installierbare Offline-PWA) – mit wechselbarem **Herbst (Halloween, Kürbisse, Geister, Spinnen & Schwammerl)** und **Winter (Weihnachten, Schnee & Nordlichter)**, **Matcha, Tiramisu, Waffeln, Butterplätzchen**, erkennbarer **Harry-Potter-Magie** (Schnee-Eule *Hedwig*, Goldener Schnatz, Sprechender Zauberhut, Zauber-Butterbier) und **Eulenpost-Päckchenversand**.

---

## 🚀 Lokal unter Windows (oder macOS/Linux) starten

Keine Node-Abhängigkeiten nötig – ein lokaler statischer Webserver reicht:

```powershell
# Im Projektordner (z. B. in der Antigravity IDE / PowerShell):
python -m http.server 8080
```

Danach im Browser öffnen: `http://localhost:8080`

---

## 📦 Pakete bauen (Windows / macOS / Linux)

Erstellt in `dist/`:
- `winterhof-pwa.zip` – fertiges PWA-Paket (z. B. für Netlify Drop)
- `winterhof-standalone.html` – einzelne komplett offline lauffähige HTML-Datei (alle 29 3D-Sprites & Splash-Art eingebettet)
- `winterhof-v4-source.zip` – sauberes Quellcode-Archiv

```powershell
python scripts/build_bundle.py
```

---

## 🌐 GitHub Pages (Handy-Link für iPhone & Android)

1. Repository auf GitHub pushen (`main`-Branch).
2. In den GitHub-Repo-Einstellungen unter **Settings → Pages**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / `/ (root)` → **Save**
3. Nach ca. 1 Minute ist das Spiel unter `https://bauerjohannes2-max.github.io/winterhof/` live!
4. Am iPhone (Safari) oder Android (Chrome) öffnen und **„Zum Home-Bildschirm hinzufügen“** wählen.

---

## 📁 Projektstruktur

- `index.html`, `styles.css`, `manifest.json`, `sw.js` – PWA-Basis & saison-reaktives UI
- `src/` – Spiel-Engine (`main.js`, `world.js`, `sprites.js`, `gameData.js`, `audio.js`, `giftExchange.js`)
- `assets/` – 28 handgemalte 3D-WebP-Sprites (`assets/sprites/`), Vollbild-Ladescreen (`splash_art.webp`) & App-Icons
- `docs/` – Architektur-Index (`ARCHITECTURE_INDEX.md`), 30-Kategorien-Hay-Day-Benchmark (`HAYDAY_BENCHMARK_30_CATEGORIES.md`) & Roadmap
- `scripts/` – Cross-Platform Build-Skript (`build_bundle.py`) & E2E-QA-Suite (`e2e_test.mjs`)
