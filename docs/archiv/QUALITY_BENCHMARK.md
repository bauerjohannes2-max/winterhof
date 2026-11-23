# Winterhof — 2-Stufen Supercell-Benchmark-System (`QUALITY_BENCHMARK.md`)

Verbindliches Qualitäts-Gate für jeden Meilenstein. Kein Stand wird dem Director als „fertig“ vorgelegt, solange Stufe 1 nicht vollständig bestanden ist.

## Golden Visual Target (90 %-Benchmark-Referenz)
Jeder Live-Screenshot wird im Stufe-1-Audit direkt neben diese beiden Zielbilder gelegt:
- **Tag-Ziel (Struktur, Terrassen, Klarheit):** `docs/lookdev_target_day_style_c.jpg` (Stil C — Supercell CoC Alpen-Terrassen-Tal)
- **Dämmerungs-Ziel (Wärme, Lichtkegel, Bach-Reflexion):** `docs/lookdev_target_dusk_style_b.jpg` (Stil B — Goldene Stunde Märchen-Weihnachtsdorf)
- **Zielkorridor:** 85–90 % optische Annäherung bei voller Spielbarkeit (verschiebbare Gebäude, dynamische Felder, 60 FPS auf Mobilgeräten).

---

## Stufe 1: Automatisches & Visuelles Selbst-Gate (Agent vor jedem Update)

### A. Harte Mess-Invarianten (0 Toleranz — Fail = Blocker)
1. **Performance:** Durchschnitt `>= 55 FPS` im Headless/Chromium-Benchmark, JS-Frame-Budget `<= 5.0 ms` avg, `<= 14.0 ms` max, Zero-GC-Ticker (keine Objekt-Allokationen pro Frame).
2. **Fehlerfreiheit:** `0` Konsolenfehler, `0` Uncaught Exceptions, `0` fehlgeschlagene Asset-/Texture-Requests, WebGL2 aktiv.
3. **Format & Hygiene:** `0` Unicode-Emojis im gesamten DOM/Canvas/Code; `#rotate-overlay` im Hochformat (`390x844`) aktiv und blockiert Welt-Input; Querformat (`844x390` & `1280x720`) zeigt mind. `85 %` freie Spielfläche.
4. **Layout-Kollisionen:** `0` abgeschnittene oder hinter Gebäuden verdeckte Schilder/HUD-Elemente (automatischer Bounding-Box-Check).
5. **Nacht-Kontrast-Check:** Nachtszene darf kein flacher Grauschleier sein (geprüft über Luminanz-Dynamik & warme Gold-Peaks um Laternen/Fenster).

### B. Die 8 Supercell-Säulen (Selbstbewertung 1–10 pro aktivem Meilenstein)
**Regel:** Jede für den aktuellen Meilenstein relevante Säule muss **mindestens 8/10** erreichen. Unter 8/10 -> automatische Verbesserungsrunde vor Übergabe an den Director.

| # | Säule | Was echte 9–10/10 (Hay Day / CoC) ausmacht | Sofortiges Durchfall-Kriterium (< 6/10) |
| :-: | :--- | :--- | :--- |
| 1 | **Terrain & Welt-Tiefe** | Handgemalte kachellose Schneelandschaft, Schneeverwehungen, Steine, echte Hügel/Tiefe, glaubwürdiger Eisbach mit Shader | Einfarbige Flächen, geometrische `ctx.ellipse`-Flecken, glatte Vektor-Straßenbänder |
| 2 | **Stil-Einheit (0 Platzhalter)** | Alle Gebäude, Figuren, Tiere, Zäune, Schilder, Truhen sprechen dieselbe 3D-painterly Bildsprache | Mix aus 3D-WebPs und flachen 2D-Strichmännchen / dünnen Linien-Zäunen |
| 3 | **Licht & Atmosphäre** | Tiefenstaffelung, weiche Kontaktschatten, warmes Sonnen-/Dämmerungslicht, tiefblaue Nacht mit additivem Laternen-/Fenster-Bloom | Flache graue Abdunkelungs-Folie über dem Bild |
| 4 | **Komposition & Lesbarkeit** | Klares Dorfzentrum, abwechslungsreicher Randwald (Größen/Varianten/Felsen), perfekte Silhouetten auf Handy-Querformat | Copy-Paste-Klonwald, verdeckte Schilder, überladene Ecke |
| 5 | **Animation & Welt-Leben** | 4-Frame laufende Tiere & Dorfbewohner, arbeitende Gebäude (Rad, Rauch, Ofenglut, Fenster), wehender Schnee, fließendes Wasser | Starre 1-Frame-Sticker oder billiges Gebäude-Wackeln |
| 6 | **Haptik, Sound & „Juice“** | Butterweiches Pan/Pinch-Zoom mit Trägheit, befriedigende Wisch-Ernte, fliegende Rewards, Micro-Bounce, warme Alpen-Soundkulisse | Träge Reaktion, hakeliges Scrollen, stummes Tippen |
| 7 | **UI-Minimalismus** | Schlanke Ecken-Medaillons, klare Typografie, großzügiger Raum für die Spielwelt, 0 Emojis, Safe-Area-tauglich | Überladene Leisten, inkonsistente Icons, abgeschnittene Buttons |
| 8 | **Mobile-Performance & Sync** | Schneller PWA-Start, 60 FPS auf Mittelklasse-Handy, verlustfreie Save-Migration, live auf GitHub Pages + Drive | Ruckeln, Save-Reset, veraltete Live-Version |

---

## Stufe 2: Director-Abnahme (Menschliches Urteil)

Nach bestandenem Stufe-1-Gate erhält der Director pro Vertical Slice:
1. **Direkten Live-Link** (`https://bauerjohannes2-max.github.io/winterhof/`) zum Testen auf Handy & PC.
2. **Frische Vergleichs-Screenshots** (Tag / Dämmerung / Nacht / Portrait-Sperre).
3. **Ehrliche Selbst-Scorecard** (wo wir stehen, was noch offen ist).
4. **Konkrete Feedback-Fragen** an den Director — sein Urteil bestimmt die nächste Iteration und wird in `DIRECTOR_MEMORY.md` gespeichert.

---

## Aktuelle Baseline (v5 — Audit vom 2026-11-23)

| Säule | v5 Score | Hauptgrund | Ziel v6 Vertical Slice 1 |
| :--- | :-: | :--- | :-: |
| 1. Terrain & Welt-Tiefe | 3/10 | Flaches Canvas-Blau, Vektor-Straßenband, Strich-Zäune | **>= 8/10** |
| 2. Stil-Einheit | 4/10 | 3D-Gebäude stark, aber Strichmännchen-Bewohner, SVG-Truhe, Kreis-Gehege | **>= 8/10** |
| 3. Licht & Atmosphäre | 4/10 | Grauschleier-Nacht statt tiefblauem Kontrast + Gold-Bloom | **>= 8/10** |
| 4. Komposition & Lesbarkeit | 5/10 | Schilder hinter Gebäuden abgeschnitten, Klon-Tannenwald | **>= 8/10** |
| 5. Animation & Welt-Leben | 4/10 | 1-Frame-Sticker, kaum Eigenleben | Slice 2 (**>= 8/10**) |
| 6. Haptik, Sound & Juice | 7/10 | Wisch-Ernte & Sound gut, Kamera/VFX noch steigerbar | Slice 2 (**>= 9/10**) |
| 7. UI-Minimalismus | 8/10 | Ecken-Medaillons & 0 Emojis stark; Querformat-Lock fehlt | **>= 9/10** |
| 8. Mobile-Performance & Sync | 7/10 | Läuft, braucht PixiJS-WebGL-Batching & Pages-Actions-Workflow | **>= 9/10** |

---

## Stage-1 Audit-Log: v6 Vertical Slice 1 (2026-11-23)

- **Messwerte:** `60.1 FPS` (`16.63 ms`), `WebGL2` aktiv, `0` Konsolenfehler, `0` Emojis, `0` Schild-/Gebäude-Überlappungen, Landscape-Lock & Mobile-Zoom verifiziert.
- **Selbst gefangene & behobene Fehler vor Übergabe:**
  1. SVG-WebGL-Rasterisierung (Truhe & Ei-Bubble waren schwarz/leer -> sauber gerastert).
  2. Fehlende Hof-Zäune beim Erststart (`_lastUnlockedKey = null` Fix).
  3. Schild-Kollisionen (`north_ridge` / Chalet, `east_glade` / Klippe -> 100 % frei platziert).
  4. Schnee-Kachelnaht & Rorschach-Symmetrie -> High-Pass-Offset-Blend (nahtlos, natürlich).
  5. Mobile-Landscape-Zoom (`844x390`) -> responsiver Kamera-Fit.

| Säule | v5 | v6 Slice 1 | Status |
| :--- | :-: | :-: | :--- |
| 1. Terrain & Welt-Tiefe | 3/10 | **8.5/10** | Handgemalter Schnee, Kopfsteinpflaster-Platz, Fels-Terrassen, GLSL-Eisbach, 3D-Brücke |
| 2. Stil-Einheit | 4/10 | **8.5/10** | 3D-Dorfbewohner, Stroh-Holz-Gehege, Holzzäune, Holzschilder, 0 Strichmännchen |
| 3. Licht & Atmosphäre | 4/10 | **9.0/10** | Style-C Tag -> Style-B Goldene Stunde -> Saphir-Nacht mit warmem Add-Bloom |
| 4. Komposition & Lesbarkeit | 5/10 | **8.5/10** | 0 Schild-Überlappungen, gemischter Randwald, ausgewogener Handy-Querformat-Fit |
| 5. Animation & Welt-Leben | 4/10 | **6.5/10** | Slice 2 Fokus (4-Frame-Sprite-Sheets & arbeitende Gebäudeteile folgen nach Go) |
| 6. Haptik, Sound & Juice | 7/10 | **8.0/10** | Zero-GC GPU-Partikel, flüssiges Pan/Zoom, Wisch-Ernte |
| 7. UI-Minimalismus | 8/10 | **9.0/10** | Querformat-Guard ohne Emojis, 90 % freie Spielwelt |
| 8. Mobile-Performance & Sync | 7/10 | **9.0/10** | 60.1 FPS WebGL2, Vite-Build -> GitHub Pages Actions + Drive |
