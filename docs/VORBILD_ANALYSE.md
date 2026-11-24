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
- **Natürliche Verteilung (24.11., Nachbesserung 2b):** Hay Day setzt Hindernisse sichtbar in Gruppen (TNT räumt eine ganze Steingruppe, Tümpel und Baumgruppen an Rändern). Technik nach Red Blob Games (Poisson-Scheibe statt reinem Zufall, Dichte über Rauschen/Gegend steuern) und Erfahrungsberichten zur Objekt-Platzierung: reiner Zufall gibt Klumpen und Löcher, Mindestabstand + Gegend gibt natürliche Gruppen. Quellen: redblobgames.com/x/1830-jittered-grid, redblobgames.com/articles/noise/introduction.org, pocketgamer.com (Hay Day TNT/Erweiterung).

## 7. Wirtschaft (24.11., Baustein 2c)
- **Hay Day Auftragstafel:** Plätze wachsen mit der Stufe (1 bis 9 ab Stufe 32), Aufträge mit mehr Münzen oder mehr Erfahrung (Spieler-Tipps raten zur Mischung). Wie die Tafel Aufträge wählt, ist öffentlich nicht dokumentiert; spürbar ist, dass sie nur Herstellbares verlangt.
- **Quellen Wirtschaftslehre:** Unity Game Economy Guide (Währungen, Quellen, Senken, Umwandler; Quellen und Senken im Gleichgewicht), Medium „Designing Game Economies“ (ohne Senken Inflation und Horten). Shuffle Bag (gemischter Kartenstapel statt Würfel) ist eine gängige Technik gegen Glücks-/Pechsträhnen.
- **Befund Bot:** Deko mit viel XP je Münze erzeugt eine Rückkopplung (mehr Münzen → mehr Deko → höhere Stufe → größere Aufträge). Deshalb Deko-XP klein.
- **Gebäudepreise Hay Day (Suche 24.11. Nacht, Listen teils alt und widersprüchlich):** Bäckerei Stufe 1 ~20, Molkerei 6 ~50, Zuckermühle 7 ~350, Popcorn 8 ~1.180, Kuchenofen 14 ~3.100, Tortenofen 21 ~14.200, Saftpresse 26 ~36.800. Also steil steigend, aber um Stufe 12–14 eher 1.000–3.000, nicht „Zehntausende“ (Claudes Aussage an Hannes war zu hoch). Unsere Preise (Stufe 12: 12.000) sind absolut höher, weil unsere Aufträge mehr zahlen; maßgeblich ist das Verhältnis Preis zu Wocheneinnahmen. Quellen: supercheats.com/hay-day/walkthrough/production-buildings, gameskinny.com (Hay Day Guides), giga.de (Hay Day alle Gebäude).
- **Befund Bot 24.11. Nacht:** Eine feste Pflanzliste lässt Futter (Weizen) ausgehen, sobald viele Tiere da sind; Aufträge hängen dann tagelang. Ein echter Spieler pflanzt nach Bedarf. Mit Bedarfsplanung liegen alle Verläufe eng beieinander (Faktor 1,2).

## 8. Start und Ladebild (24.11., Baustein 3)
- **Hay Day / Clash:** Vollbild-Motiv, großes Logo oben, unten Ladebalken mit wechselndem Tipp; das Bild steht sofort, der Balken läuft nie rückwärts. Beide spielen nur in einer Ausrichtung (Hay Day quer); als App erzwingen sie das, im Browser geht das auf dem iPhone nicht, daher Hinweis „quer halten“ + Pause.
- **Umgesetzt:** dasselbe Muster als HTML vor dem Skript, Tipp wechselt je Start und alle 4 s, Balken im Daumenbereich, Ausblenden weich (0,35 s), bei „Bewegung reduzieren“ ohne Animation.
