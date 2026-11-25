# Größenkatalog (Baustein 5b) · Maßstab D „Hay-Day-Maß“ · Größen abgenommen Hannes 25.11.2026

**Die Werte stehen nur in `src/content/winterhof.json` → `sizes`** (eine Quelle für Kern und Bilder, Entscheidungen 42–48). Diese Datei erklärt die Regeln. Aufstellungsbild aus der JSON: `python scripts/katalog_skizze.py` → `docs/qa/neustart/b05b_katalog.jpg` (abgenommener Stand), Prüfung jedes Bilds: `python scripts/pruefe_assets.py`.

## Regeln
- 1 Kachel = 128 Weltpunkte breit (`render/scene/iso.ts`, `art.tilePx`). Alle Maße in Kacheln.
- **Schlüssel = Objekt-Typ** (wie im Spielstand: `chalet`, `bakery`, `field`, `chicken_pen`, `lantern`, `rock_small` …). Tiere (`chicken` …), `person` und `crop` (Pflanze auf dem Acker) haben nur eine Höhe, sie stehen nicht selbst im Raster.
- **Grundfläche** `w × h` = Platz im Raster (Kern prüft Platzierung, Überlappung, Migration damit). Fehlt sie bei einem platzierbaren Typ, meldet `validateContent` einen Datenfehler; es gibt keinen stillen 1 × 1-Ersatz.
- **Bildhöhe** `heightTiles` = ganze Bildhöhe in Kacheln, Grundfläche mitgezählt (eine w × h-Raute ist (w + h) / 4 Kacheln hoch). `0` = flach (Wegplatten). Breite ergibt sich aus dem Bild, nie verzerren.
- **Bodenpunkt** = Mitte der Grundfläche; im Bild `art.sprites.<bild>.anchorY`.
- **Bilder** (`art.sprites`): `file` (in `art_src/spiel{m}/objekte{tps}`), `size` (Katalog-Schlüssel), `anchorY`. Mehrere Bilder dürfen auf denselben Eintrag zeigen (drei Personen, mehrere Pflanzen).
- **Maß ist die Person: 0,8 Kachel**, alle Personen gleich groß. Haus ≈ 2,4 Personen hoch (Hay Day 2,45, VORBILD_ANALYSE §12).
- **Gruppe** (`group`) ordnet die Aufstellung und steuert die Prüfung: Gebäude, Wahrzeichen, Felder und Gehege füllen ihre Grundfläche (Bildbreite 85–115 % der Rautenbreite), alles andere nicht.
- **Gehege** (`pens`): Gehege-Typ je Tierart, 6 Tiere, `levels`/`costs` je weiterem Gehege (Entscheidungen 44, 45, 48). Gehege-Höhe = Zaun + Stall in der hinteren Ecke; Eulen-Voliere darf später höher werden (dann hier und in der JSON ändern).
- **Landstück 6 × 6** (`map.plots.size`), Tal 30 × 30 = 5 × 5 Stücke, 9 Felder je Stück, Start 2 × 2 Stücke = 12 × 12. Zufahrt 2 Kacheln breit.
- Grafik ist hier egal (Klötzchen, alte Bilder). Aussehen kommt in den Grafik-Bausteinen (8 Gebäude, 9 Felder, 10 Deko, 11 Tiere) und der Grafik-Runde.

## Änderungen
Neue Größe oder neues Objekt: Eintrag in `sizes` (und ggf. `art.sprites`), `npm run check` (Daten- und Platzierungstests), `python scripts/pruefe_assets.py`, Aufstellungsbild an Hannes. Grundflächen ändern heißt Spielstand-Migration (wie v10, `core/migrate.ts`).
