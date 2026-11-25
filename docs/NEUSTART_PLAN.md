# Neustart „langsam und richtig“ (Entscheidung 12) · Plan · Stand 23.11.2026

Hannes 23.11. spät: **Kern behalten, Darstellung neu.**

## Bestandsaufnahme
| Teil | Zustand | Was passiert |
|---|---|---|
| `src/core/` (Befehle, Speicherstand v8, Wirtschaft, Karte) | sauber, 44 Tests grün, Typprüfung grün | bleibt |
| `src/content/winterhof.json` | einzige Datenquelle | bleibt, bekommt je Objekt Bild, Anker, Grundfläche, Standfläche |
| `src/world.js`, `engine/*`, `sprites.js`, `ui/*`, `gameData.js`, `main.js` (HUD + Menüs), `index.html` alt, `sw.js`, `styles.css`, `scripts/e2e_test.mjs` | gewachsen, Sonderwege „probe“ | **gelöscht 24.11. (Entscheidung 15)**, Sicherung Tag `v9-flickwerk`; HUD neu in Baustein 13, Menüs danach Stück für Stück |
| `probe_seamless.py`, `probe_cut.py`, `pruefe_assets.py` | brauchbar | bleiben |
| Bilder `assets/` | Platzhalter + Probe-Grafik | bleiben vorerst, neue Bilder nur nach Auftrag |

## Kritische Prüfung (24.11., Abgleich mit Marktführern + Best Practices)
**Was trägt (wie bei den Großen):**
- Befehle + reiner, deterministischer Kern (Zeit und Zufall werden hereingereicht, kein `Math.random`/`Date.now` im Kern). So machen es Supercell-Spiele: Das Gerät schickt Befehle, der Server rechnet dieselbe Logik nach. Später ist ein Server also ohne Umbau möglich.
- Speicherstand mit Versionsnummer und Migration, Sicherungskopie und gedrosseltes Speichern.
- Alle Inhalte in einer einzigen Datendatei, Wirtschaft mit Bot-Test abgesichert.
- PixiJS v8 ist im Browser die führende 2D-Grafik-Bibliothek und bleibt.

**Lücken, die vor dem Neubau zu schließen sind:**
1. **Kern hängt an alter Darstellung:** `core/map.ts` holt die Karte aus `engine/worldGrid.js`, und die holt sie aus `gameData.js`. Die Karte ist im Code fest verdrahtet (z. B. Straße fest auf Reihe 6, einzelne Wegkacheln). Profis halten die Karte als Daten (Tiled/LDtk-Prinzip). → Karte als Daten in die JSON, Kern ohne Abhängigkeit zur Darstellung (Baustein 2).
2. **Nur der Kern ist typgeprüft:** Die Darstellung ist JavaScript ohne Prüfung. → `src/render/` streng in TypeScript.
3. **Keine Lint-Regeln:** Nichts verhindert, dass Darstellungscode den Spielstand ändert. → ESLint mit Import-Grenzen (render darf aus core nur lesen und Befehle schicken).
4. **Browser-Test selbst gebaut (CDP), kein Bildvergleich:** Standard ist Playwright mit Screenshot-Vergleich. Das passt genau zu unserer Vorher/Nachher-Abnahme. → Playwright mit dem installierten Chrome (kein Browser-Download).
5. **Online-Prüfung ohne Browser-Test:** Der GitHub-Ablauf prüft Typen, Tests und Build, aber nicht den Browser. → E2E kommt in den Ablauf, sobald es stabil läuft.
6. **Bilder einzeln, kein Atlas, keine Auflösungsstufen:** Profis packen Bilder in Atlanten (weniger Ladevorgänge und Zeichenaufrufe). → Bild-Pipeline mit Pixi AssetPack (Baustein 0 legt das fest, Baustein 3 baut es).

Mitnehmen aus Runde 3 (Tag `v9-flickwerk`): Weg als eine weiche Fläche mit Saum, Standfläche + Kontaktschatten je Objekt, Feld ohne Leuchtrand, Hofrand als Farbstufe mit Schatten, nur nahtlose Texturen.

## Bauweise
- Neue Darstellung entsteht in `src/render/`, Einstieg `index.html`. Die alte Oberfläche ist gelöscht, die Live-Seite eingefroren (Hochladen nur von Hand) bis Baustein 14.
- Darstellung liest nur den Kern-Stand und schickt nur Befehle. Keine Spiellogik in `src/render/`.
- Kein Sonderweg, kein `?probe`, keine Schalter für Varianten. Varianten zum Vergleich nur als Bild in `docs/qa/neustart/`.

## Prüfen
- `npm run check` = Typprüfung + Lint + Kern-Tests + Build + Browser-Bildvergleich. Nur bei Grün committen/pushen.
- Vergleichsbilder neu erzeugen nur nach Abnahme durch Hannes: `node ./node_modules/@playwright/test/cli.js test --update-snapshots`.

## Jeder Baustein (Abnahme-Ablauf)
Verbindlich nach `QUALITAETS_LEITFADEN.md` §2–3 (kritisch prüfen vorher, ehrlich prüfen nachher).
1. Ziel in 1 Satz, beste Lösung mit verworfener Alternative und Quellen.
2. Vergleich Hay Day + Clash of Clans (nur im Browser ansehen, nie ins Repo), Beobachtung in `VORBILD_ANALYSE.md`.
3. Umsetzen, eigener kleiner Commit.
4. Grün: Typprüfung, Tests, Build, E2E; neue Rechenteile mit eigenen Tests.
5. Vorher/Nachher-Bild nach `docs/qa/neustart/bXX_*.jpg`, an Hannes.
6. **Hannes nickt ab → erst dann nächster Baustein.** Nie zwei gleichzeitig.

## Bausteine
| Nr. | Baustein | Abnahmekriterium |
|---|---|---|
| 0 ✅ | **Grafik-Technik festlegen** (`docs/GRAFIK_TECHNIK.md`) | abgenommen Hannes 24.11. |
| 1 ✅ | **Werkzeuge** (abgenommen Hannes 24.11.) | TypeScript streng für `src/render/`, ESLint mit Import-Grenzen (Gegenprobe: verbotene Importe werden erkannt), Playwright mit Bildvergleich (installierter Chrome, Gegenprobe: leichte Farbänderung wird erkannt); alles mit einem Befehl `npm run check` grün. Bild-Pipeline verschoben nach Baustein 3 (erst dort wird ein Bild geladen) |
| 2 ✅ | **Karte als Daten** (abgenommen mit 2b, Hannes 24.11.; Bild `docs/qa/neustart/b02_karte.png`, Format wie Tiled-Ebenen) | Gelände, Zonen, Wege, Waldrand in `winterhof.json`; `core/map.ts` ohne Import aus `engine/` oder `gameData.js`; Tests: Karte gültig, alter Spielstand passt weiter (keine Objekte auf Weg/Wald) |
| 2b ✅ | **Karten-Konzept im Kern** (`KARTEN_KONZEPT.md`, abgenommen Hannes 24.11. nach Nachbesserung, Entscheidung 16; Bild `docs/qa/neustart/b02b_karte.png`) |  Dann: Zufahrt statt Straße, Alpental (Berge, See), Landstücke ohne Namen, Hindernisse + Werkzeuge + Tannen ausgraben als Befehle mit Tests, Migration ohne Fortschrittsverlust, Wirtschafts-Bot grün, Kartenbild abgenommen |
| 2c ✅ | **Wirtschaft stabil** (Entscheidung 18–20; abgenommen Hannes 24.11. Nacht. Bedarfs-Bot statt fester Pflanzliste: 12 Verläufe Stufe 15–16, Einnahmen Faktor 1,2 statt 1,9; Land +25 % je Stück, Gebäude teurer, Sparen bis zum nächsten Ziel erlaubt. **Bekannte Lücke:** ab Stufe 13 gibt es noch nichts zu kaufen, Münzen sammeln sich ab Tag 5 – schließt sich mit Inhalten Stufe 13+) | Aufträge passend zum Hof mit Mischung und zwei Lohn-Arten, steigende Preise je Kauf, Deko als Münz-Ausgabe; Bot über mehrere Zufallsverläufe: Woche 1 etwa Stufe 15, Unterschied höchstens 2 Stufen, kein Verlauf hängt fest, Einnahmen je Verlauf nah beieinander |
| 3 ✅ | **Technik-Gerüst** `src/render/` + `index.html` + Bild-Pipeline (AssetPack → Atlas, Manifest) (abgenommen Hannes 24.11. nach Ladebild-Nachbesserung, Entscheidung 21; Bilder `tests/browser/__bilder__/b03-*`. Offen: Messung am echten Handy durch Hannes – der Bilder/s-Test misst nur den Test-Chrome) | Leere Szene startet in Chrome, iOS Safari, Samsung Internet; Ebenen in fester Reihenfolge per Test geprüft; ≥ 55 Bilder/s am Handy |
| 4 | **Raster + Kamera** ✅ (abgenommen 24.11.; Entscheidungen 22 + 24; Bild `docs/qa/neustart/b04_kamera.jpg`) | Umrechnung Raster ↔ Bild mit Tests; Wischen und Zoomen (2 Finger, Mausrad) weich mit Grenzen und Nachlauf; Hilfsraster ein-/ausblendbar |
| 5 ✅ | **Grundboden** Wiese im ganzen Tal + Schnee außen (Entsch. 26, 29–31, 40; abgenommen Hannes 25.11., Wiese D mit Halmen, Entsch. 41) | Wiesenform aus den Daten (Kern = Shader, getestet); nahtlose Wiese ohne sichtbare Wiederholung; weicher Rand in Buchten, Schnee mit Kante und Schatten, keine Linie; Rand-Kulisse (Wald, See, Bach, Koppel) nur als Lageplan L2D, Bild erst in der Grafik-Runde (Entsch. 39) |
| 5b ✅ | **Größenkatalog** (Maßstab D „Hay-Day-Maß“, Entsch. 42–50; abgenommen Hannes 25.11., Vorher/Nachher `docs/qa/neustart/b05b_vorher_nachher.jpg`). Eine Quelle `winterhof.json → sizes` (Grundfläche + Höhe), Bilder per `art.sprites.size`; Landstück 6 × 6, Start 12 × 12, Feld 2 × 2, Chalet 3 × 3, Tafel/Schlitten 2 × 1, Gehege mit 6 Tieren (Befehle `buyPen`, `buyAnimal`, `feedPen`, `collectPen`), Spielstand v10 mit Migration, Bot grün, `pruefe_assets.py` prüft jedes Bild gegen den Katalog | Ein Katalog aller Bilder mit Grundfläche, Höhe in Kacheln, Bodenpunkt; Maßregel nach Hay Day (Person als Maß); Aufstellungsbild aus den Daten; `pruefe_assets.py` prüft jedes Bild dagegen; Kachelmaß 128 überall |
| 6 | **Wege** (Zufahrt + Wegplatten des Spielers) | Eine durchgehende Fläche aus Zufahrt und gelegten Wegplatten, runde Kurven und Kreuzungen, Saum innen, Schneeklumpen auf der Kante, keine Kachel-Treppen |
| 7 | **Standflächen + Kontaktschatten** (generisch) | Jedes Objekt bekommt aus der JSON Standfläche + weichen Schatten nach unten rechts; mit Testklötzen geprüft |
| 8 | **Ein Gebäude perfekt verankert** (Chalet) | Bodenpunkt exakt, nichts schwebt, Vorplatz läuft weich in den Schnee, Schneewehe, Trittspur; `pruefe_assets.py` GRÜN; Hannes: „steht fest“ |
| 9 | **Felder** | Erhöhte Wülste, 4 Wachstumsstufen, Ernte-Wischgeste schickt Befehle; kein Leuchtrand |
| 10 | **Alle übrigen Gebäude + Deko** | Dieselbe Objekt-Ansicht wie Baustein 8, nur Daten neu; Vorn/hinten stimmt überall (Test) |
| 11 | **Figuren + Tiere** | Laufen auf Wegen/Weiden, richtige Überdeckung, Größen nach STIL_REGELN §4 |
| 12 | **Antippen, Platzieren, Verschieben** | Treffer genau auf Bildform, Vorschau grün/rot aus dem Kern, Verschieben speichert |
| 13 | **HUD + Buttons** (Hay-Day-Maßstab) | Münzen, Stufe, Lager, Haupt-Buttons neu; daumengroß, lesbar am Handy quer; Menüs weiter erreichbar |
| 14 | **Live schalten** | Offline-Fähigkeit (Service Worker neu, Ladebild-Motiv vorab gespeichert: ab 2. Start sofort scharf, Entscheidung 21), Probe-Bilder aufgeräumt, Browser-Test in GitHub-Prüfung; Hochladen wieder automatisch; danach live (alte Oberfläche schon 24.11. gelöscht) |

**Befund Baustein 2:** Das Kartenkonzept (Straße quer durch, benannte Rechteck-Grundstücke, Wald-Rahmen) war nicht Hay-Day-Niveau. Hannes hat es am 24.11. neu entschieden (Entscheidung 14), Umsetzung in Baustein 2b.

Danach: Menüs Stück für Stück, dann neue Inhalte, dann Gemini-Grafikrunde.
