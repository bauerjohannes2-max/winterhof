# Neustart „langsam und richtig“ (Entscheidung 12) · Plan · Stand 23.11.2026

Hannes 23.11. spät: **Kern behalten, Darstellung neu.**

## Bestandsaufnahme
| Teil | Zustand | Was passiert |
|---|---|---|
| `src/core/` (Befehle, Speicherstand v8, Wirtschaft, Karte) | sauber, 44 Tests grün, Typprüfung grün | bleibt |
| `src/content/winterhof.json` | einzige Datenquelle | bleibt, bekommt je Objekt Bild, Anker, Grundfläche, Standfläche |
| `src/world.js` (1452 Z.), `engine/terrainLayer.js`, `worldGrid.js`, `worldValidator.js`, `lightingLayer.js`, `particles.js`, `textures.js`, `sprites.js`, `ui/view.js`, `gameData.js` | gewachsen, 30 Sonderwege „probe“ | wird in `src/render/` neu gebaut, alt wird am Ende gelöscht |
| `src/main.js` (2249 Z., HUD + Menüs) | mischt Oberfläche und Darstellung | HUD neu in Baustein 11, Menüs danach Stück für Stück |
| `scripts/e2e_test.mjs`, `probe_seamless.py`, `pruefe_assets.py` | brauchbar | bleiben, werden auf neue Darstellung umgestellt |
| Bilder `assets/` | Platzhalter + Probe-Grafik | bleiben vorerst, neue Bilder nur nach Auftrag |

Mitnehmen aus Runde 3 (Tag `v9-flickwerk`): Weg als eine weiche Fläche mit Saum, Standfläche + Kontaktschatten je Objekt, Feld ohne Leuchtrand, Hofrand als Farbstufe mit Schatten, nur nahtlose Texturen.

## Bauweise
- Neue Darstellung entsteht in `src/render/` und läuft während des Baus auf eigener Seite `neu.html` (nur lokal). Die Live-Seite bleibt unverändert, bis Baustein 12 umschaltet. Kein Mischen alt/neu in einer Datei.
- Darstellung liest nur den Kern-Stand und schickt nur Befehle. Keine Spiellogik in `src/render/`.
- Kein Sonderweg, kein `?probe`, keine Schalter für Varianten. Varianten zum Vergleich nur als Bild in `docs/qa/neustart/`.

## Jeder Baustein (Abnahme-Ablauf)
1. Ziel in 1 Satz.
2. Vergleich Hay Day + Clash of Clans (nur im Browser ansehen, nie ins Repo), Beobachtung in `VORBILD_ANALYSE.md`.
3. Umsetzen, eigener kleiner Commit.
4. Grün: Typprüfung, Tests, Build, E2E; neue Rechenteile mit eigenen Tests.
5. Vorher/Nachher-Bild nach `docs/qa/neustart/bXX_*.jpg`, an Hannes.
6. **Hannes nickt ab → erst dann nächster Baustein.** Nie zwei gleichzeitig.

## Bausteine
| Nr. | Baustein | Abnahmekriterium |
|---|---|---|
| 0 | **Grafik-Technik festlegen** (`docs/GRAFIK_TECHNIK.md`) | Hannes nickt ab: Bilder mit eingebautem Vorplatz, Boden-Ebenen Grund → Wege → Standflächen → Schatten → Objekte → Effekte → HUD, feste Zeichenreihenfolge, eine Kamera, Licht oben links, nahtlose Texturen, Maße je Objekt in der JSON |
| 1 | **Technik-Gerüst** `src/render/` + `neu.html` | Leere Szene startet in Chrome, iOS Safari, Samsung Internet; Ebenen in fester Reihenfolge per Test geprüft; Bildrate ≥ 55 auf Handy |
| 2 | **Karte, Raster, Kamera** | Umrechnung Raster ↔ Bild mit Tests; Wischen, Zoomen (2 Finger + Mausrad) weich mit Grenzen; Hilfsraster ein-/ausblendbar; gleiche Kartengröße wie Kern |
| 3 | **Grundboden** Schnee (Hof) + Wildnis (außen) | Nahtlose Textur ohne sichtbare Wiederholung; Hofrand als Farbstufe mit Schattenstreifen, keine Linie, kein weißer Rand |
| 4 | **Wege** | Eine durchgehende Fläche aus den Kern-Daten, runde Kurven und Kreuzungen, Saum innen, Schneeklumpen auf der Kante, keine Kachel-Treppen |
| 5 | **Standflächen + Kontaktschatten** (generisch) | Jedes Objekt bekommt aus der JSON seine Standfläche (Clash) + weichen Schatten nach unten rechts; mit Testklötzen geprüft, noch ohne Gebäudebilder |
| 6 | **Ein Gebäude perfekt verankert** (Chalet) | Bodenpunkt exakt auf Grundflächen-Mitte, nichts schwebt, Schneewehe vorn, Trittspur zur Tür; `pruefe_assets.py` GRÜN; Hannes: „steht fest auf dem Boden“ |
| 7 | **Felder** | Acker als erhöhte Wülste, 4 Wachstumsstufen, Ernte-Wischgeste schickt Befehle an den Kern; kein Leuchtrand |
| 8 | **Alle übrigen Gebäude + Deko** | Laufen über dieselbe Objekt-Ansicht wie Baustein 6, nur Daten neu, kein Code je Gebäude; Sortierung vorn/hinten stimmt überall |
| 9 | **Figuren + Tiere** | Laufen auf Wegen/Weiden, richtige Überdeckung mit Gebäuden, Größen nach STIL_REGELN §4 |
| 10 | **Antippen, Platzieren, Verschieben** | Treffer genau auf Bildform, Platzier-Vorschau grün/rot aus dem Kern, Verschieben speichert |
| 11 | **HUD + Buttons** (Hay-Day-Maßstab) | Münzen, Stufe, Lager, Haupt-Buttons neu; daumengroß, lesbar am Handy quer; bestehende Menüs weiter erreichbar |
| 12 | **Umschalten + Aufräumen** | `index.html` nutzt die neue Darstellung; `world.js`, `engine/*`, `view.js`, `sprites.js`, Probe-Bilder gelöscht; Licht/Schneefall neu; E2E über alle Spielabläufe grün; danach live |

Danach: Menüs Stück für Stück, dann neue Inhalte, dann Gemini-Grafikrunde.
