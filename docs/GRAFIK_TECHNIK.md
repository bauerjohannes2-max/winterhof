# Winterhof – Grafik-Technik (Baustein 0) · abgenommen Hannes 24.11.2026

Ziel: Bevor eine Zeile Darstellung entsteht, ist festgelegt, wie gezeichnet wird. Alles Spätere hält sich daran, kein Sonderweg.
Vorbild: Hay Day (Bilder bringen ihren Boden mit) und Clash of Clans (jede Grundfläche hat eine eigene Standfläche, Raster lesbar). Ergänzt die Gestaltungsregeln in `STIL_REGELN.md`.

## 1. Technik
- **PixiJS v8** (WebGL, WebGPU später möglich), Code in `src/render/`, **TypeScript streng**.
- Darstellung liest den Kern-Stand (`GameSession.state`) und schickt nur Befehle (`dispatch`). Keine Spielregel in `src/render/`, per ESLint-Grenze erzwungen.
- **HUD und Menüs als HTML/CSS über der Spielfläche** (scharfe Schrift, Bedienhilfen, einfach anzupassen); in der Spielfläche nur, was in der Welt steht (Symbole über Gebäuden, Ernte-Flug).

## 2. Raster und Kamera
- **Isometrisch 2:1, eine Kachel = 128 × 64 Weltpunkte** (bisher 116 × 58; 128 lässt sich bis 1/16 Kachel ohne Rest teilen, das gibt saubere Kanten und passt zu Textur-Größen). Maße in der JSON bleiben in Kacheln, deshalb ändert sich an Bildern nichts.
- Kachel (gx, gy) → Welt: `x = (gx − gy) · 64`, `y = (gx + gy) · 32`. Nur eine Funktion im ganzen Code, mit Tests.
- **Eine Kamera** = Verschiebung + Zoom eines einzigen Welt-Containers. Steht die Kamera still, wird auf ganze Bildpunkte gerundet (scharf).
- **Umsetzung Baustein 4 (Entscheidung 22):** Zoom = CSS-Pixel je Weltpunkt, Grenzen in Kacheln: ganz raus passt das Tal (30 × 30) ganz auf den Bildschirm, ganz rein 8 Kacheln breit (Handy quer 0,20–0,82, Desktop 1280 × 720 0,33–1,25). Schärfe: @2x lädt jetzt auch ein Bildschirm ohne Retina, wenn er ganz reingezoomt über 1 : 1 kommt (z. B. Desktop 1280 breit: 1,25); auf schwachen Geräten (@1x) begrenzt die Kamera den Zoom auf Bildstufe ÷ Zeichenauflösung, damit nie hochgerechnet wird (vorher hätte der PC ganz rein unscharf gezeigt). Bildmitte begrenzt auf Tal + Kulissenstreifen. Wischen mit Nachlauf (Abbremsen 0,998 je ms wie iOS `UIScrollView` normal), Gummirand nach Apple-Formel (c = 0,55), Zurückfedern kritisch gedämpft (≈ 0,35 s), Zoom-Gummi bis rund +35 %. Zwei Finger: Zoom und Verschieben aus demselben Gestenstand (Punkt zwischen den Fingern bleibt darunter). Tipp-Schwelle 8 px. Mausrad weich zum Zeiger (Zeitkonstante 0,07 s), harte Grenzen. Alles bildratenunabhängig (Tests mit 60 und 120 Bildern/s).
- **Hinweis für Baustein 5:** Auf Bildschirmen höher als das Tal (Tablet 4:3) und in den vorderen Ecken zeigt die Kamera Fläche außerhalb der Kartendaten (Karte reicht vorn nur 5 Reihen über das Tal). Der Grundboden muss den ganzen sichtbaren Bereich füllen (Wildnis über den Kartenrand hinaus), nicht nur die Kartenkacheln.

## 3. Ebenen in fester Reihenfolge (hinten → vorn)
| Nr. | Ebene | Inhalt | Wie gezeichnet |
|---|---|---|---|
| 1 | Grund | Schnee im Hof, Wildnis außen, Hofrand als Farbstufe + Schattenstreifen | gebacken |
| 2 | Bodenzeichnung | Wege, Plätze, Acker-Erde | gebacken |
| 3 | Kontaktschatten | enge Kontaktlinie an der Unterkante, bei Bäumen/Laternen/Tieren kleiner Fleck nach unten rechts (Entsch. 62) | je Objekt ein vorgebackenes Schattenbild aus einem Atlas |
| 4 | Objekte | Gebäude, Bäume, Deko, Feldfrüchte, Tiere, Figuren | einzeln, nach Tiefe sortiert |
| 5 | Welt-Effekte | Rauch, Funkeln, Symbole über Gebäuden, Ernte-Flug | einzeln |
| 6 | Auswahl | Platzier-Vorschau grün/rot, Markierung | einzeln |
| – | HUD | HTML über der Spielfläche | – |

- **Keine Standfläche** (Entsch. 62): Gebäude bringen ihren Vorplatz im Bild mit, unter Objekten liegt nur Wiese.
- **Gebacken** heißt: Ebenen 1–2 werden einmal in Bild-Kacheln von 8 × 8 Rasterfeldern vorgerechnet und nur neu gemalt, wenn sich dort etwas ändert (Bauen, Verschieben). Das spart am Handy am meisten Leistung.
- **Tiefe (vorn/hinten)** in Ebene 4: Exakte topologische Tiefensortierung (`render/scene/depth.ts`, Guibas-Yao DAG) auf disjunkten Grundflächen (`A ≺ B`, sobald `(ax1 <= bx0 && ay0 < by1) || (ay1 <= by0 && ax0 < bx1)`), aufgelöst per deterministischem Kahn-Sort (Gleichstand nach `ground.y`, `gx`, `id`), da eine reine Skalarformel wie `gx + gy + w + h` kleine Objekte vor größeren Gebäuden (`1×1` vor `3×3`/`4×4`) oder versetzte `2×1`-Objekte falsch sortiert. Bewegte Figuren und Tiere (Baustein 11) nutzen dieselbe Ordnung. Das prüft ein Test.

## 4. Bild-Vertrag je Objekt (Größe in `winterhof.json` → `sizes`, Bild in `art.sprites`, Baustein 5b)
| Feld | Bedeutung |
|---|---|
| `sprites.<bild>.file` | Bild in `art_src/spiel{m}/objekte{tps}` (Atlas per AssetPack) |
| `sprites.<bild>.size` | Schlüssel im Größenkatalog `sizes` (eine Quelle für Kern und Bild) |
| `sizes.<typ>.w`, `.h` | Grundfläche in Kacheln, z. B. 2 × 2 |
| `sizes.<typ>.heightTiles` | Bildhöhe in Kacheln, die Breite ergibt sich aus dem Bild (nie verzerren) |
| `sprites.<bild>.anchorY` | Bodenpunkt im Bild (0–1), liegt genau auf der Mitte der Grundfläche |
| `sprites.<bild>.shadow` | Schatten: `kontakt` (Linie an der Unterkante), `fleck` (Linie + weicher Fleck, Bäume/Laternen/Tiere) oder `bild` (Bild bringt Schatten selbst mit) |

- **Eingebauter Vorplatz (Hay Day):** Neue Gebäudebilder bringen ihren eigenen Boden mit (Pflaster, Trittspur, Säcke, Schneewehe). Er reicht höchstens eine Viertelkachel über die Grundfläche hinaus und läuft im Bild weich aus.
- **Schattenbilder (Baustein 7):** `scripts/schatten_backen.mjs` rechnet vor jedem Bündeln aus der Bildform jedes Objekts ein Schattenbild (halbe Auflösung, nach `art_src/spiel{m}/schatten{tps}/`, nicht versioniert; Maße als Anteil der Kachel, wie Skizze `scripts/standflaeche_skizze.py` Runde 3). Im Spiel liegt es mit demselben Bodenpunkt unter dem Objekt, Farbe kühles Blaugrau per Tönung.
- Nichts ragt auf Wege oder fremde Grundflächen (prüft der Kern).

## 5. Licht und Schatten
- Licht immer von **oben links**. Schatten fallen nach unten rechts, kühles Blaugrau (nie Schwarz), weicher Rand, Deckkraft ungefähr 35 %.
- Abends und nachts: Ein Farbfilter über die ganze Welt plus warme Lichtpunkte an Fenstern und Laternen. Kein Objekt hat eine eigene Lichtrichtung.

## 6. Texturen und Bilder
- Bodentexturen **512 × 512, nahtlos** (Prüfung `scripts/probe_seamless.py`). Gegen sichtbare Wiederholung liegen zwei Lagen in unterschiedlichem Maßstab übereinander.
- Wege: Aus den Kartendaten entsteht eine Maske, die weich gerundet wird (Unschärfe + Schwelle). Darauf kommen die Wegtextur, ein dunkler Saum innen und Schneeklumpen auf der Kante.
- **Bild-Pipeline:** Quellbilder liegen in `art_src/`, Pixi **AssetPack** baut daraus Atlanten (WebP + PNG als Ersatz) in zwei Auflösungen (@1x, @2x). Der Code lädt nur über ein Manifest, nie über einen Dateipfad.
- Mindestschärfe: 1,6 Bildpunkte je Weltpunkt (STIL_REGELN §6).
- **Umsetzung (Baustein 3, 24.11.):** AssetPack 1.7 (`.assetpack.js`, `npm run assets`, läuft vor jedem Build). Quellbilder **verlustfrei als PNG** in `art_src/` (versioniert; AssetPack packt nur PNG/JPG). Ordner-Tags: `{m}` = Bündel im Manifest, `{tps}` = Atlas. Quelle gilt als @2x, daraus entsteht @1x; Atlasseiten höchstens 2048 px; Ausgabe `assets/gen/` (nicht versioniert) mit `manifest.json`. Laden: `Assets.init({ basePath: 'assets/gen/', manifest: 'manifest.json', texturePreference })`, dann `loadBundle`.
- **Bildschärfe automatisch (Entscheidung 19):** `render/boot/quality.ts` wählt @2x nur bei Retina-Bildschirm, Grafik ≥ 4096, ≥ 3 GB Speicher, ≥ 4 Kernen (wo der Browser es verrät). Zeichenauflösung höchstens 2. Liegt das Mittel der ersten Sekunden unter 45 Bildern/s, startet das Gerät beim nächsten Mal mit @1x. Schalter in den Einstellungen kommt mit den Menüs.
- **Ladebild und Hochkant** sind HTML in `index.html` (sofort sichtbar vor dem Skript): Motiv (Platzhalter `assets/splash_art.webp`), Schriftzug, Tipp aus `winterhof.json → loadingTips`, Balken. Hochkant zeigt CSS sofort „Bitte halte dein Handy quer“, `ui/orientation.ts` hält die Zeit an.

## 7. Leistungsbudget (Mittelklasse-Handy, quer)
- ≥ 55 Bilder pro Sekunde, ≤ 60 Zeichenaufrufe pro Bild, Texturspeicher ≤ 96 MB, Start bis spielbar ≤ 3 s bei WLAN.
- Was außerhalb des Bildschirms ist, wird nicht gezeichnet.
- Das misst der Playwright-Test bei jeder Prüfung.
- **Shader-Übersetzung ≤ 1 s** (gemessen unter Windows/ANGLE-D3D, dem langsamsten Übersetzer; 26.11.): Shader-Code wird beim ersten Bild übersetzt und blockiert alles. Regeln: keine Funktion mit Schleife oder Rauschen mehrfach aufrufen (D3D rollt alles aus) – mehrere Proben in EINE Schleife mit Uniform-Länge; Rauschen aus der Zufallstabelle (`noiseTable`), nicht als Hash-Rechnung; Ableitungen (dFdx, fwidth) vor Verzweigungen. Das erste Bild wird noch unter dem Ladebild gezeichnet (`app.render()` in `main.ts`), damit nach dem Laden nichts stockt. Messen: `scripts/_shaderzeit.mjs` (Hilfsskript, nicht im Repo).

## 8. Animation
- Erst Bildfolgen aus dem Atlas (Tiere, Rauch, Feld wiegt sich), dazu einfache Bewegung per Code (Wippen, Hüpfen beim Antippen, „Quetschen“ beim Fertigwerden wie in Hay Day). Skelett-Animation (Spine) erst, wenn es nötig wird.

## 9. Abnahme pro Baustein
Vorher/Nachher-Bild aus dem Playwright-Test (immer dieselbe Kamera, derselbe Spielstand) nach `docs/qa/neustart/`. Dieses Bild wird zum Vergleichsbild: Ändert sich später ungewollt etwas, schlägt der Test an.
