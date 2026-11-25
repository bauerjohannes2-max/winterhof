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

## 9. Kamera (24.11., Baustein 4)
- **Hay Day / Clash (eigene Spielerfahrung, Spielvideos; technische Details veröffentlichen beide nicht):** Wischen mit Nachlauf, am Rand weich gebremst und zurückgefedert; Zwei-Finger-Zoom um den Punkt zwischen den Fingern, an den Grenzen federt der Zoom zurück. Clash zeigt ganz rausgezoomt fast das ganze Dorf, Hay Day bleibt enger. Raster nur beim Bauen/Verschieben sichtbar (Clash: Gitter unter dem Gebäude, Hay Day: Feldraster beim Platzieren). Kein Doppeltipp-Zoom, Tippen gehört den Objekten. Jeder Start beginnt mit derselben Ansicht auf Hof bzw. Dorf.
- **Quellen Technik:** Apple `UIScrollView` (Abbremsfaktor normal 0,998 je ms; Gummirand-Formel `(1 − 1/(x·c/d + 1))·d`, c = 0,55, wie in UIKit), Apple HIG „Gestures“ (Pinch zoomt um den Mittelpunkt, Tipp-Schwelle), MDN Pointer Events (`getCoalescedEvents`, `setPointerCapture`, `touch-action`). Forenbeiträge zum „Clash-Kamera“-Nachbau (Roblox, GDevelop, Construct) bestätigen nur das Muster (Begrenzen, Zoom zum Fingerpunkt), keine Werte.
- **Verworfene Alternativen:** (1) harte Grenzen ohne Gummi – wirkt wie ein Anschlag, beide Vorbilder federn; (2) Pixi-Plugin `pixi-viewport` – fremde Abhängigkeit mit eigener Logik, schwer genau zu testen und an unsere Regeln (Kachel-Grenzen, Rundung bei Stillstand) anzupassen; eigenes reines Rechenmodell ist mit 25 Tests abgesichert; (3) Zoom-Grenzen als feste Zahl (0,5–1,6) – je nach Bildschirm sieht man dann sehr unterschiedlich viel, deshalb in Kacheln.
- **Geprüft in Bewegung (CPU 4-fach gedrosselt, Handy quer):** 60 Bilder/s, kein Bild über 19 ms; Kamera-Spur Bild für Bild: Nachlauf schließt ohne Sprung an das Wischen an und klingt gleichmäßig ab, Gummirand bremst zunehmend, Zurückfedern weich ohne Ruck, Zoom-Gummi federt in ≈ 0,6 s auf die Grenze. Gefundener Fehler: bei seltenen Fingermeldungen (alle 65 ms) kein Nachlauf → behoben, mit Test.
- **Noch nicht Vorbild-Niveau (ehrlich):** Ohne Boden und Objekte ist nur das Raster zu sehen; wie sich die Kamera „anfühlt“, zeigt sich erst mit Grafik (Baustein 5 ff.). Werte (Nachlauf, Federhärte) sind nach Apple gewählt, nicht an Hay Day gemessen; Feinabstimmung nach Hannes' Handy-Test.

## 10. Boden im Winter (24.11., Baustein 5)
- **Korrektur (24.11. später):** Clash hat beide Wege. „Snow Day“, „Frost Age“, „Of the North“ haben ein **blaues Schneefeld mit Kachelmuster**, Weihnachts-Szenerien (Jolly, Gingerbread, Toy Workshop) farbige Felder. Hay-Day-Winterdesigns (Spielervideo „Snowy Zen“) stehen auf grüner Wiese.
- **Clash „Classic/Epic Winter“ (Wiki-Kartenbilder):** Spielfläche bleibt **grünes Gras** (feine Halme, leichtes Rautenmuster). Schnee nur außen als **dicke Schollen mit Volumen**: helle Oberseite mit feiner Körnung, lila-blaue Seitenkante unten rechts, Schlagschatten aufs Gras, runde Formen mit kleinen Bruchstücken am Rand.
- **Hay Day Winter:** Werbebild 2018 grüne Wiese mit Schnee am Rand; Supercell kündigt im Dezember eine Schneedecke als Saison-Ereignis an.
- **Folgerung:** Schnee wirkt durch Form (Kante, Licht, Schatten) und Kontrast, flaches Weiß wirkt billig. Schollen/Verwehungen gehören in Welt-Koordinaten (kein Kachelmuster), nur die feine Körnung kachelt.
- Bogen zum Durchklicken (14 Varianten, nah/weit, Vorbilder daneben): Skript `scripts/boden_mutig.py`, Seite privat für Hannes (Vorbild-Bilder nie ins Repo).
- **Runde 4 (Entscheidung 29):** `scripts/boden_gras.py`: Gras kachelt (Hex-Tiling), Kartenrand, Schollen, Verwehungen, Farbflecken und Clash-Kachelschach in Weltkoordinaten. Wald außen aus `wild_cluster_*` (Probebilder) macht die Szene erst glaubhaft. Echte Store- und Wiki-Bilder als Vergleich nur in der privaten Klickseite.
- **Runde 5 (24.11. abends):** Clash-Kante (gerade Raute, Erdlinie, dunkler Streifen, `scripts/boden_rand.py`) wirkte wie Clash, nicht wie Hay Day → verworfen (Entscheidung 31). Gelernt: Grashalme in der Bodentextur senkrecht ×2 malen, weil der Boden für Iso 2:1 gestaucht wird (sonst liegen Halme flach als Striche); Schollen nur ganz, nie an Kanten angeschnitten.
- **Runde 6 (24.11. abends, Entscheidung 31):** Hay-Day-Hofgrenzen angesehen (Wiki „Farm Expansions“, Spielervideos „Inspiring Farms“, Store-Bilder; nur privat): Erweiterungsland trennen **niedrige Trockenmauern** (zwei Steinlagen, Moos), dazu **Hecken**, **Holz-/Lattenzäune** und **Feldwege**; das Kartenende ist ein **dichter Baumrand**; jede Seite sieht anders aus. Gelernt beim Nachbauen (`scripts/karte_rand.py`): **vorn (unten im Bild) nur Niedriges** (Zaun, Hecke, Bach, Weg), hohe Bäume vorn verdecken sonst das Feld; die weiche Form entsteht durch Buchten **außerhalb** des 30 × 30-Tals (bis 5 Kacheln) und Baumgruppen, die in die Wiese wachsen (= Hindernisse); Schnee der Kulisse farblich an den Schnee der Baumbilder anpassen (warm-weiß statt blau-weiß).
- **Runde 7 (24.11. abends, Hannes: Basis K6B, Weg schöner, kleiner Teich am Bach):** Hay-Day-Vorbilder (Wiki „Small Frozen Pond“, „Hockey Pond“, Spielervideos Hof mit Bach + Angelsee; nur privat): Weg **hell-sandig, glatt**, runde Kurven, Rand leicht dunkler, Gras ragt über die Kante; Bach **schmal und stark geschlängelt**; Eisteich **blassblau mit 2–3 schrägen Glanzstreifen**, Schneerand ums Eis, Steine mit Schneehaube, Rohrkolben. Umgesetzt in `scripts/karte_rand.py` (R7A Sandweg + Eisteich, R7B Fahrspuren, R7C Eisloch). Gelernt: Schnee muss am Weg eine **scharfe Kante** haben (weich = verschmiert); Bach im Schnee hat zu wenig Kontrast, deshalb am Wiesenrand führen; Teich auf die Wiese legen, nicht in den Schnee.
- Runde-6-Ergebnis (Hannes 24.11.): Favoriten K3 (Holzzaun), K5 (Bach), K6B (Mischung, Gras B). Weg und See noch hässlich, nächste Runde K6B mit neuem Weg + See.
- **Runde 8 (24.11. spät, Hannes: R7C, Bach kräftiger):** Hay-Day-Bach bleibt auch im Winter offen und blau (helle Mitte, dunkle Ränder, braunes Erdufer, Strömungslinien). Gelernt: weißes Eis im Schnee verschwindet ganz raus völlig; offenes Blau mit brauner Uferkante liest sich in jeder Zoomstufe. Erdufer muss über der Schneelippe liegen, sonst entsteht ein weißer Streifen zwischen Ufer und Wasser.
- **Runde 9 (25.11.):** Bach als Linienzug statt Höhenlinie: gibt freie Führung (von oben ins Bild, durch den Teich, unten hinaus). Mündung: Schneelippe und Innenwand des Teichs dort aussparen, offene Bucht an Ein- und Auslauf, sonst wirkt der Bach „abgeschnitten“. Eisloch als ruhiges Oval statt Rauschmaske (Rauschen erzeugte Splitter und hellen Fleck).

## 11. Gras und Verankerung nah (25.11., 15 Handy-Screenshots von Hannes, Hay Day Herbst; Bilder nur privat)
- **Grund:** fast glattes, kräftiges Gelbgrün (gemessen Median etwa RGB 139/189/14), Helligkeit schwankt nur leicht in großen weichen Wolken. Keine dunklen Sprenkel, keine dunklen Flecken.
- **Halme:** wenige, weich gemalte Einzelhalme, fast senkrecht, oft 2–3 beieinander; meist heller/gelblicher als der Grund, wenige dunkler. Sehr wenig Kontrast.
- **Trockenflecken:** selten, etwa kachelgroß, aus gelben Halmen mit leichtem gelbem Grund.
- **Deko ist nicht im Gras gemalt:** Büschel, Pilze, Laub, Steine (bemoost), Blumen, Teiche sind eigene Objekte bzw. Gruppen, nur auf freiem Land.
- **Gebäude bringen ihren Boden mit:** Scheune mit Steinsockel, einzelne Steine und Grasbüschel an Ecken; Haus mit Blumenbeet, Trittsteinen, Töpfen. Schatten nur schmal direkt an der Wand.
- **Bäume:** weicher dunkler Fleck unter der Krone. **Felder:** liegen ohne Rahmen und fast ohne Schatten auf der Wiese. **Wege:** Gras ragt über die Kante, Fahrspuren, Laub.
- **Atmosphäre:** wandernde helle Nebel-/Lichtschleier über allem (Grafik-Runde).
- **Folgerung für uns:** Gras-Textur ruhig halten (Halme mit wenig Kontrast, `scripts/wiese_halme.py`); Trockenflecken im Shader in Weltkoordinaten (in der Textur wiederholen sie sich als Muster); Deko als eigene Ebene, die Gebäuden und Wegen ausweicht; Standfläche je Gebäude in Baustein 7/8.
