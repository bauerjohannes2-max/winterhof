# Winterhof – Stil- und Größenregeln (verbindlich)

Gilt für jedes Bild, jede Figur, jedes Gebäude und jeden Code, der etwas zeichnet, egal ob von Claude oder Gemini.
Geprüft wird automatisch mit `python scripts/qa/pruefe_assets.py`. Es wird nur veröffentlicht, was GRÜN ist. Bei GELB entscheidet Hannes anhand des Aufstellungsbilds `docs/qa/aufstellung.png`.

## 1. Grundgefühl
- Cozy, weihnachtlich, Alpen-Winter: warmes Licht, Schnee, Holz, Lichterketten. Nie kalt oder düster.
- Freundlich und rund statt kantig. Satte, warme Farben, Schnee leicht bläulich.
- Spaß am Entdecken und am Weitermachen: Jede Stufe bringt etwas Neues zum Anschauen.
- Eigene Welt: Wir übernehmen das Genre (Farm- und Aufbauspiel), aber keine Figuren, Grafiken, Namen oder Marken anderer Spiele.

## 2. Format
- **Nur Querformat.** Es gibt keine Hochkant-Ansicht und keinen Hinweis zum Drehen.
- Installierte App (Android): Querformat ist fest eingestellt. Im Browser, vor allem in iOS Safari, kann eine Webseite das Drehen technisch nicht sperren. Dort zeigt sich das Spiel auch bei hochkant gehaltenem Handy im Querformat, man hält das Handy einfach quer, wie bei einem Video.

## 3. Maßstab: Das Raster ist das Maß
- Alles wird in **Kacheln** gemessen (1 Kachel = Kachelbreite = 116 Weltpunkte), nie in Pixeln.
- Jedes Objekt hat in der Größentabelle (`src/content/winterhof.json` → `art.sprites`) eine **Grundfläche** (1×1, 2×2 …), eine **Höhe in Kacheln** und einen **Bodenpunkt** (`anchorY`).
- **Die Breite ergibt sich immer aus dem Bild. Nie verzerren.** Der Code setzt nur die Höhe.
- Zielhöhen je Gruppe:

| Gruppe | Höhe in Kacheln |
|---|---|
| Gebäude 2×2 | 1,5–2,4 (Haupthaus am größten) |
| Wahrzeichen 2×2 (Baum) | 1,6–2,8 |
| Hof-Objekt 1×1 | 0,45–1,0 |
| Deko 1×1 | 0,45–1,2 |
| Person | 0,5–0,65 |
| Tier | 0,25–0,75 |
| Feldfrucht | 0,4–0,8 |
| Bodenplatte | füllt die Kachel in der Breite |

## 4. Verhältnisse zueinander
- **Figuren bewusst etwas zu groß** (Cartoon-Maßstab), damit man sie erkennt und antippen kann: Ein Haus ist etwa 3 Personen hoch, nicht 6.
- Reihenfolge der Tiere: Huhn < Schaf < Rentier.
- Huhn höchstens 0,7 × Person, Schaf höchstens 0,9 × Person.
- Person höchstens 0,36 × Gebäude.
- Laterne ist größer als eine Person.
- Backstube und andere Werkstätten sind kleiner als das Chalet (Haupthaus).
- Alle Personen sind gleich groß, Abwechslung kommt über Kleidung, nicht über Größe.

## 5. Kamera, Licht, Boden
- Eine Kamera für alles: isometrisch 2:1, gleicher Blickwinkel von schräg oben, keine Frontal- oder Seitenansichten.
- **Licht immer von oben links**, Schatten fallen nach unten rechts. Jedes Objekt bekommt einen weichen Kontaktschatten.
- **Bodenlinie:** Jedes Bild ist eng zugeschnitten. Unten sind höchstens 4 % leer, sonst schwebt das Objekt. Der Bodenpunkt sitzt genau auf der Mitte seiner Grundfläche.
- Nichts ragt auf Wege, Wasser oder Zäune (prüft der Logik-Kern bei jeder Platzierung).

## 6. Bildqualität
- Gleiche Detail-Dichte und Linienstärke bei allen Bildern, kein Objekt wirkt wie aus einem anderen Spiel.
- Mindestens 1,6 Bildpunkte je Weltpunkt, damit es auf Retina-Displays scharf bleibt.
- Freigestellt (durchsichtiger Hintergrund), kein Rand und kein Farbsaum, kein Text im Bild, keine Wasserzeichen und kein „Made with AI“.
- Jahreszeiten-fähig: Schnee und Deko möglichst als eigene Ebene, damit später Herbst/Frühling-Varianten möglich sind.

## 7. Ablauf für neue Bilder (Gemini)
1. Claude schreibt den Auftrag mit Grundfläche, Zielhöhe, Blickwinkel, Licht und Stil-Referenz (Aufstellungsbild).
2. Gemini liefert das Bild nach `assets/sprites/`.
3. Claude trägt es in die Größentabelle ein und startet `pruefe_assets.py`.
4. Das Aufstellungsbild geht an Hannes. Er entscheidet, wie es aussieht.
5. Erst dann wird eingebaut und veröffentlicht.
