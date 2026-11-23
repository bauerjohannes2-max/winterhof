# Winterhof – Karten-Konzept (Entscheidung 14, Hannes 24.11.2026)

Anlass: Das Kartenbild aus Baustein 2 hat gezeigt, dass das bisherige Konzept nicht Hay-Day-Niveau hat: eine schnurgerade Straße quer durch die ganze Karte, 17 benannte Rechteck-Grundstücke, Wald als Rechteck ringsum.

## Entscheidungen (Hannes per Rückfrage, je Empfehlung gewählt)
| Frage | Entscheidung | Vorbild |
|---|---|---|
| Wege | **Eine kurze feste Zufahrt** vom Kartenrand zum Haus. Alle weiteren Wege legt der Spieler selbst als Wegplatten (Deko), frei gestaltbar. | Hay Day |
| Neues Land | **Kaufen schaltet frei, danach Hindernisse einzeln räumen** (Schneewehen, Felsen, Eis, Tannen). | Hay Day |
| Räumen | **Mit Werkzeugen:** Schaufel (Schneewehe), Spitzhacke (Fels), Eispickel (Eis), Spaten (Tanne). Zufallsfund beim Ernten/Abholen oder kaufen. | Hay Day (Axt, Säge, Dynamit …) |
| Tannen | **Ausgraben statt fällen:** Die Tanne landet als Deko im Lager und kann woanders eingepflanzt werden. Nichts wird gefällt. | eigene Idee (tierfreundlich, Weihnachten) |
| Namen | **Land hat keine Namen.** Nur besondere Orte bekommen einen (z. B. der See). | Hay Day |
| Umgebung | **Alpental:** Berge hinten, Tannenwald an den Seiten, Zufahrt von vorn unten, zugefrorener See an einer Seite (später Eisfischen). Der Hof liegt in einer Landschaft, nicht in einem Rahmen. | Hay Day (Hof in Landschaft) |
| Startgröße | **Klein wie jetzt** (etwa 10 × 10 Felder). Platz wird schnell knapp, Erweitern fühlt sich wertvoll an. | Hay Day |

## Was das für den Code heißt (Baustein 2b)
- Karte (`winterhof.json → map`): Gelände um `mountain` und `lake` (Eis) ergänzen; Weg-Ebene enthält nur noch die Zufahrt. Wegplatten des Spielers sind Objekte im Spielstand, keine Kartendaten.
- Erweiterungen: gleichförmige Landstücke ohne Namen statt 17 benannter Rechtecke. Kosten weiter Münzen + Baumaterial (das passt zu Hay Days Urkunden/Pflöcken).
- Hindernisse: neue Objektart `obstacle` (Schneewehe, Fels, Eis, Tanne) mit nötigem Werkzeug; Befehle `clearObstacle` und `digUpPine` (Tanne → Deko-Lager); Werkzeuge als Waren mit Zufallsfund.
- Speicherstand: Migration ohne Fortschrittsverlust (bereits gekaufte Grundstücke bleiben frei, Objekte auf alter Straße werden verschoben).
- Wirtschafts-Bot und Tests anpassen.

## Noch offen (Rückfragen an Hannes, bevor 2b beginnt)
- Größe eines Landstücks (Hay Day: gleich große Quadrate) und wie viele insgesamt.
- Wo genau der See liegt und ab welcher Stufe er frei wird.
- Werkzeuge: nur Zufallsfund oder auch im Laden? Wie selten?
- Wohin führt die Zufahrt (Haus, Auftragstafel, Lieferschlitten)?
- Weitere Wegplatten-Arten (Kopfstein, Holzbohlen, Schneepfad …) und ab welcher Stufe.
