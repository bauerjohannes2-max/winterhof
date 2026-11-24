# Vorbild-Analyse Hay Day + Clash of Clans (Claude, 23.11.2026)

Nur Beobachtungen in Worten. Keine Bilder der Spiele im Repo, nichts kopieren – nur die Technik übernehmen.
Quellen angesehen: Hay-Day-Wiki (Farm-Karte, Gebäude-Einzelbilder), Clash-Wiki (Winter-Szenerie leer, Dorf mit Gebäuden).

## 1. Objekt ↔ Boden („nichts wirkt lose“)
- **Hay Day:** Jedes Gebäudebild bringt seinen eigenen Boden mit: Backstube auf Pflaster-Vorplatz mit Gras in den Fugen, Säcke/Fässer/Bank stehen rundum; Scheune auf Steinsockel, Erdfleck vor dem Tor, einzelne Steinchen; Hühnerstall mit eingezäuntem Erdhof. Das Gebäude „wächst“ aus dem Vorplatz, der Vorplatz läuft weich in die Wiese aus.
- **Clash of Clans:** Jedes Gebäude steht auf einer eigenen Bodenfläche in Größe der Grundfläche, eine Spur dunkler als das Gras, mit weichem Rand. Auch Steine haben einen dunklen Grasfleck. Damit liest man Raster und Standfläche sofort.
- **Beide:** weicher Kontaktschatten direkt an der Unterkante, Licht von oben links. Kleine Dinge (Steinchen, Halme, Blumen) liegen an der Grenze und überdecken sie.
- **Für uns (Winter):** je Objekt eine festgetretene, leicht graublaue Schneefläche (Clash) + Kontaktschatten + Schneewehen an der Wand vorn + Trittspur vor der Tür (Hay Day). Später in den Gebäudebildern selbst: eigener Vorplatz (Gemini-Auftrag).

## 2. Weg ↔ Wiese/Schnee
- **Hay Day:** Weg ist eine durchgehende, gemalte Fläche mit runden Kurven und Kreuzungen, nie Kachel-Treppen. Rand innen dunkler, Fahrspuren, Gras ragt über die Kante.
- **Clash:** Erdpfade laufen weich aus, Grasbüschel am Rand.
- **Umgesetzt 23.11.:** Weg als ein Bild (Maske weich gerundet, Rauschen an der Kante, dunkler Saum innen, hinten stärker), Schneeklumpen auf der Kante.

## 3. Feld ↔ Boden
- **Hay Day:** Feld = erhöhte Erdwülste, darunter ein weicher dunkler Schatten auf der Wiese. Kein heller Rand, kein Rahmen.
- **Für uns:** weißer Leuchtrand weg; stattdessen Kontaktschatten + niedriger, unregelmäßiger Schneewall mit Schatten.

## 4. Hof ↔ Wildnis
- **Clash:** Spielfläche hat ringsum einen dunkleren Grasstreifen; dahinter dichter Wald, Baumkronen überlappen sich und werfen Schatten nach innen; Schneeflecken locker verteilt. Die Grenze ist eine Farbstufe, keine Linie.
- **Hay Day:** gesperrtes Land ist dicht bewachsen, Rand organisch.
- **Für uns:** heller Schneewall-Saum dämpfen (kein weißer Aufkleber-Rand), dunkler Schattenstreifen auf der Hofseite, Klumpen in Größe und Abstand unregelmäßig.

## 5. Texturen
- Gemalte Bodentexturen müssen nahtlos sein (Wildnis-Boden und Weg hatten sichtbare Nähte) → `scripts/probe_seamless.py`.

## Offene Punkte (später, nichts Neues ohne Hannes)
- Gebäudebilder mit eigenem Vorplatz neu malen lassen (Gemini) – größter Hebel laut Hay Day.
- Hühnerstall mit kleinem Auslauf (Hay Day: Stall + Gehege in einem Bild).

## 6. Land, Hindernisse, Werkzeuge (Wikis angesehen 24.11., Baustein 2b)
- **Hay Day:** Farm-Erweiterung in Landstücken; kaufbar ist nur ein Stück, das an eigenes Land grenzt. Je Stück gleich viele Grundbriefe, Hämmer, Pflöcke, Menge steigt (5 bis 40). Zweiter Bereich „über der Straße“, Spezialstücke mit eigener Erlaubnis.
- **Hay Day Räumen:** Axt (Busch, kleiner Baum), Säge (großer Baum), Dynamit (einzelner Stein), TNT (Steingruppe), Schaufel (Tümpel). Fund beim Ernten, Abholen, Räumen; seit 2026 fehlendes Werkzeug beim Antippen mit Münzen kaufbar (Preis nach Stufe), wird sofort benutzt, kein Weiterverkauf.
- **Hay Day Wege:** 3 einfache Wege ab Stufe 1 für wenige Münzen, edlere später, Preis steigt je Kauf.
- **Hay Day Fischsee:** eigener Bereich ab Stufe 27 nach Boots-Reparatur, Angelplätze per Erweiterung.
- **Clash:** rund 40 Hindernisse beim Start, Pflanzen wachsen alle 8 h nach (max. 45, mit 1 Feld Abstand), Steine nie. Räumen gibt Erfahrung, manchmal Edelsteine. „Hindernis-Schaufel“ macht ein Hindernis zur verschiebbaren Deko (Vorbild für unser Tannen-Ausgraben).
- **Umgesetzt (Kern):** Landstücke 5×5 nur angrenzend, Land-Material in gleicher Menge, Werkzeug-Sofortkauf nach Stufe, nur Schneewehen wachsen nach (8 h, max. 5, 1 Feld Abstand), Tanne → Deko, Wegplatten mit steigendem Preis.
