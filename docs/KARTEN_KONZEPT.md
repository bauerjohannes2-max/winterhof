# Winterhof – Karten-Konzept (Entscheidungen 14 + 15, Hannes 24.11.2026)

Anlass: Das Kartenbild aus Baustein 2 hat gezeigt, dass das bisherige Konzept nicht Hay-Day-Niveau hat: eine schnurgerade Straße quer durch die ganze Karte, 17 benannte Rechteck-Grundstücke, Wald als Rechteck ringsum.

## Entscheidungen Runde 1 (Entscheidung 14)
| Frage | Entscheidung | Vorbild |
|---|---|---|
| Wege | **Eine kurze feste Zufahrt** vom Kartenrand zum Hof. Alle weiteren Wege legt der Spieler selbst als Wegplatten (Deko), frei gestaltbar. | Hay Day |
| Neues Land | **Kaufen schaltet frei, danach Hindernisse einzeln räumen** (Schneewehen, Felsen, Eis, Tannen). | Hay Day |
| Räumen | **Mit Werkzeugen:** Schaufel (Schneewehe), Spitzhacke (Fels), Eispickel (Eis), Spaten (Tanne). | Hay Day (Axt, Säge, Dynamit …) |
| Tannen | **Ausgraben statt fällen:** Die Tanne landet als Deko im Lager und kann woanders eingepflanzt werden. | eigene Idee; Clash hat dafür die „Hindernis-Schaufel“ |
| Namen | **Land hat keine Namen.** Nur besondere Orte bekommen einen (z. B. der See). | Hay Day |
| Umgebung | **Alpental:** Berge hinten, Tannenwald an den Seiten, Zufahrt von vorn unten, zugefrorener See an einer Seite. | Hay Day (Hof in Landschaft) |
| Startgröße | **Klein** (10 × 10 Felder). | Hay Day |

## Entscheidungen Runde 2–4 (Entscheidung 15, je Empfehlung gewählt)
| Frage | Entscheidung |
|---|---|
| Landstücke | **5 × 5 Felder**, Tal insgesamt **30 × 30** = 36 Stücke, Start = 4 davon. Kaufbar ist nur ein Stück, das an eigenes Land grenzt (Hay Day). |
| Freischalten | **Hindernisse schon auf dem Start-Hof** (erstes Räumen in der Einführung). **Landkauf ab Stufe 3.** |
| Nachwachsen | **Nur Schneewehen kommen nach** (gelegentlich nach Schneefall, wenige, mit Abstand zu allem). Felsen, Eis, Tannen nie. (Clash: Pflanzen alle 8 h, Steine nie; Hay Day: nichts.) |
| Werkzeuge | **Zufallsfund + Sofortkauf:** Fund beim Ernten, Abholen, Räumen. Fehlt eins, kauft man es beim Antippen des Hindernisses mit Münzen, es wird sofort benutzt, Preis nach Stufe (Hay Day seit 2026). Kein Horten. |
| Startpaket | **1 Schaufel + 1 Spitzhacke.** Eispickel und Spaten sind das erste Sammelziel. |
| Größen | **Klein 1 × 1 (1 Werkzeug), groß 2 × 2 (2 Werkzeuge derselben Art).** Große Tanne → große Deko-Tanne. |
| Belohnung | **Erfahrung + Chance auf Fund** (Werkzeug oder Baumaterial). Eigene Funde wie Stein oder Eiskristall erst, wenn es eine Verwendung dafür gibt. |
| See | **Rechts seitlich**, vom Start aus sichtbar. Ufer-Landstücke ab **Stufe 13** (Eisfischen, INHALTSPLAN). Name: **Sternsee** (Hannes 24.11.), Daten `map.places`. |
| Zufahrt | **Von vorn unten zum Hofplatz.** Am Hofplatz fest: **Lieferschlitten, Auftragstafel, Hofladen, Briefkasten**, dazu die **Tagestruhe** (fest am Hofplatz, Hannes 24.11.). **Chalet und alles andere frei verschiebbar.** |
| Startlage | **Mitte, eher vorn:** Hof wächst nach links, rechts (zum See) und hinten (zu den Bergen). |
| Wegplatten | **Ab Start: Schneepfad, Kies, Holzbohlen** (billig, fester Preis). **Später: Kopfstein (8), Natursteinplatten (14), Sternenpflaster (20)**, Preis steigt je Kauf. |
| Land-Material | **Grundbrief, Holzhammer, Grenzpflock** (statt Flurkarte, Schneeschaufel, Grenzpflock). Alte Bestände werden 1 : 1 umgerechnet. |
| Alte Oberfläche | **Gelöscht**, Live-Seite eingefroren bis zur neuen Darstellung (Sicherung Tag `v9-flickwerk`). |

## Aufbau der Karte (Daten in `winterhof.json → map`)
Raster wie bisher: Bildschirm-x = (gx − gy), Bildschirm-y = (gx + gy). „Hinten“ = kleines gx + gy, „vorn“ = großes, „rechts“ = großes gx / kleines gy, „links“ = kleines gx / großes gy.

| Bereich | Lage |
|---|---|
| Tal (bebaubar) | gx −13 … 16, gy −13 … 16, 6 × 6 Landstücke à 5 × 5 |
| Start | Landstücke Spalte 3–4, Reihe 3–4 = gx 2 … 11, gy 2 … 11 (wie bisher, kein Objekt muss wandern) |
| Berge | hinten: beide oberen Kartenränder (gx < −13 bzw. gy < −13), **14 Reihen tief** (Karte 60 × 49, gx −27 … 32, gy −27 … 21). Baumgrenze unregelmäßig: Waldzungen ziehen hinauf, Felsrippen herunter, zu den Seitenecken mehr Wald (Hannes 24.11.: „schmaler Streifen“ reicht nicht) |
| Tannenwald | vorn links und vorn rechts, rings um den See |
| See (Eis) | rechts neben dem Tal (gx > 16, gy klein), grenzt an die Ufer-Landstücke |
| Zufahrt | 2 Felder breit, vom vorderen linken Kartenrand bis zum Hofplatz im Start-Hof |
| Hofplatz | vorn im Start-Hof, daneben die festen Stationen |
| Hindernisse | Objekt-Ebene wie in Tiled (Liste mit Art + Feld), **in Gruppen** (Hannes 24.11.: gleichmäßig gestreut ist nicht Hay-Day-Niveau): Gruppen-Mittelpunkte mit Mindestabstand (Poisson-Scheibe), je Gruppe ein oft großer Kern, an den 2–6 kleine Glieder dicht anwachsen (Anlagerung, selten 1 Feld Lücke) – dichte Nester wie Hay-Days Steingruppen. Art nach Gegend: Felsnester zu den Bergen (hinten), Tannenhaine an den Waldrändern, Eis nur am Ufer; Schneewehen locker überall dazwischen. Je kaufbares Landstück 5–9 Hindernisse. Messbar im Test: über 75 % der Felsen/Tannen/Eis haben einen Nachbarn derselben Art (zufällig verteilt rund 40 %) |

## Regeln im Kern
- **Landstück kaufen** (`unlockPlot`): ab Stufe 3, nur angrenzend an eigenes Land, Ufer-Stücke ab Stufe 13. Preis steigt mit der Zahl gekaufter Stücke (berechenbar, fair). Ab dem 4. Stück zusätzlich Grundbrief, Holzhammer, Grenzpflock in gleicher Menge (Hay Day).
- **Räumen** (`clearObstacle`): nur auf eigenem Land. Braucht Werkzeug × Größe. Mit `buyMissing` werden fehlende Werkzeuge zum Stufenpreis gekauft und sofort benutzt. Gibt Erfahrung, Chance auf Fund; Tannen wandern als Deko ins Lager.
- **Hindernisse** sind Objekte im Spielstand (wie bei Clash): Sie belegen Felder, lassen sich nicht verschieben, dürfen auf fremdem Land liegen.
- **Schneewehen nachwachsen:** alle 8 h eine kleine Schneewehe auf freiem eigenem Land, höchstens 5, mit 1 Feld Abstand zu allem, nie auf Wegen.
- **Feste Stationen** lassen sich nicht verschieben.
- **Wegplatten** sind Deko-Objekte (Art `path`), Preis fest oder steigend je Kauf.

## Migration (Spielstand v8 → v9, ohne Fortschrittsverlust)
1. Land-Material umrechnen: Schneeschaufel → Holzhammer, Flurkarte → Grundbrief, Grenzpflock bleibt.
2. Jedes alte Grundstück wird zu allen neuen Landstücken, die es berührt (eigene Fläche wird nie kleiner).
3. Feste Stationen an ihren Platz; der neue Hofladen kommt dazu.
4. Hindernisse nur auf Landstücken, die der Spieler noch nicht besitzt.
5. Jedes Objekt, das nicht mehr passt (alte Straße, Hofplatz, außerhalb des Tals): auf das nächste freie eigene Feld. Gibt es keins, bekommt der Spieler das nächste angrenzende Landstück geschenkt. Nichts geht verloren.
6. Startpaket-Werkzeuge auch für bestehende Spielstände.
