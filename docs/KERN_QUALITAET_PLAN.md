# Winterhof – Kern-Qualität vor neuen Inhalten (Hannes 23.11.2026)

Hannes' Urteil: „Grafisch noch random, nichts wirklich rund.“ Ziel: Gefühl und Ordnung wie Hay Day / Clash of Clans.
**Regel ab jetzt:** Erst Kern sauber, dann neue Systeme (Bergbahn usw. pausiert). Jeder Punkt wird sehr kritisch geprüft, mit Screenshot vorher/nachher, und Best Practices aus dem Netz (Hay Day, Clash of Clans, Township, GDC-Vorträge, Game-Feel/„Juice“-Artikel) werden vorher recherchiert und hier mit Quelle festgehalten.

## Hannes' Punkte → was wir tun
| # | Problem (Hannes) | Plan |
|---|---|---|
| 1 | Fließendes Wasser schwer darstellbar | Bach und fließendes Wasser raus. Höchstens ein **zugefrorener Weiher** (ruhig, Eis, kein Fließen), später fürs Eisfischen. |
| 2 | Brücke – braucht es die? Figuren gehen nicht sauber drüber | Ohne Bach keine Brücke. Raus. |
| 3 | Bäume stehen irgendwo | Bäume nur am Kartenrand, auf festen Rasterpunkten, dichter Waldsaum als ruhiger Rahmen (wie Hay Day). Keine Zufallsstreuung im Hof. |
| 4 | Schilder sehen nicht gut aus | Gesperrtes Land wie bei den Großen: Fläche leicht abgedunkelt/verschneit, ein klares Schild mit Schloss + Stufe, Preis erst beim Antippen. |
| 5 | Häuser stehen irgendwo, komischer Schatten drunter | Jedes Gebäude exakt auf seiner Grundfläche (Bodenpunkt = Mitte), Schatten nur weich unter dem Objekt, keine farbigen Platten/Rauten. Prüfung per Raster-Overlay. |
| 6 | Feld nicht sauber | Felder als einheitliche, gepflegte Beete im Raster, Zustände (leer, wächst, reif) klar unterscheidbar. |
| 7 | Truhe steht random | Feste, sinnvolle Stelle neben dem Haupthaus, Teil des Hofs. |
| 8 | Figuren laufen random ohne Animation | Bis es echte Laufanimationen gibt: keine herumlaufenden Figuren. Später nur auf festen Wegen mit Lauf-Animation (Gemini-Auftrag). |
| 9 | Menü-Buttons nicht rund | Ein einheitliches Button-System (Größe, Rundung, Schatten, Druck-Animation, Symbole) nach Vorbild der Großen. |
| 10 | Spielgefühl | „Juice“: jede Aktion mit Rückmeldung (Hüpfen, Partikel, Ton, Zahlen fliegen ins Lager), Ernten per Wischen, klare nächste Ziele, Belohnungs-Rhythmus. Recherche zuerst. |

## Reihenfolge
1. Recherche Best Practices (Karte/Hof-Aufbau, Buttons/HUD, Game Feel), Ergebnis unten eintragen.
2. Karte vereinfachen: Bach, Brücke, Fluss-Shader raus; Hof = klare Fläche mit Waldrahmen; Land-Erweiterungen anpassen (Bachwiese wird einfach Ostland); Kern-Tests + Validator anpassen.
3. Figuren aus, Truhe fest, Schilder neu, Schatten/Platten weg, Felder sauber.
4. Button-/HUD-System einheitlich.
5. Spielgefühl (Juice) Schritt für Schritt, jeweils Screenshot-Vergleich.
6. Erst dann wieder Inhalte (Bergbahn …).

## Stand 23.11.2026 abends
- Erledigt (Bild: `docs/qa/kern/vergleich_schritt1-4.jpg`): Recherche; Bach, Brücke, Wasser-Shader raus (Validator verbietet Wasser jetzt); Bachwiese → **Ostwiese** (x 14–16); Waldsaum in festen Reihen (hinten hoch, vorn klein, Weg verschwindet im Wald); Felsen nur hinten; keine laufenden Figuren (nur Kunde mit Angebot steht still vor der Wunschtafel); Truhe fest rechts neben Haupthaus (6,3), alte Stände ziehen automatisch um; Platten/Rauten unter Gebäuden weg; neue Schilder (Schloss + „Stufe N“, grün „Erweitern“ wenn erreichbar, Preis erst beim Antippen); gesperrtes Land leicht abgedunkelt; Felder: Saatreihen → kleine blasse Pflanze → reif; einheitliches Button-System (styles.css Ende); Ernte-Zahlen kurz „+2“ statt überlappender Langtexte; fehlende Gebäude-Beschreibungen ergänzt.
- Offen / selbst kritisch gesehen: (a) Weg läuft schnurgerade quer durch den Hof – besser an den Rand? (Hannes entscheidet) (b) Schlitten ragt über den Zaun; (c) Ladebild zeigt Herbst/Kürbisse statt Weihnachten → Gemini-Auftrag in der Grafik-Runde; (d) Spielgefühl (Schritt 5) erst begonnen; (e) Hühnerstall-Strohplatte prüfen.

## Runde 2: Hay Day als Maßstab (Hannes 23.11. spät)
Vorlagen angesehen: Hay-Day-Wiki (Erweiterungskarte, gesperrtes Grundstück), App-Store-Bilder (HUD).
| Detail | Hay Day | Winterhof jetzt |
|---|---|---|
| Gesperrtes Land | verwildert (Bäume, Steine, Stümpfe), Rand, Antippen öffnet Erweitern | Wildnis mit Tannen/Steinen/Büschen/Stümpfen, Schneewall-Kante, Antippen öffnet „Land erweitern“. Keine Schilder mehr |
| Kartengröße | großer Hof, Dutzende Erweiterungsstücke | Welt −10…26, 17 Erweiterungsstücke (5 alt + 12 neu, Stufe 7–18) |
| Zaun um den Hof | keiner | entfernt |
| Boden | ruhige, gemalte Fläche, kein Kachelmuster | einmal gemalter Schneeboden (weiche Flecken, feine Struktur), kein Wiederholmuster, keine großen Licht-Rauten |
| Weg | weicher Feldweg, Ränder fließen | gemalter Erdweg mit Saum + Fahrspuren statt Pflasterkacheln |
| Felder | flache Erdquadrate, nahtlos aneinander | flach im Raster gemalt, gleiche Furchenrichtung, Erdkante nur außen |
| Buttons | Symbole ohne Scheibe, dicke Kontur, Spielschrift | neue bunte Symbole (Laden, Scheune, Auftragstafel, Paket, Zahnrad, Sonne, Münze), Schrift Lilita One, Zahlen weiß mit Rand, grünes Plus, rote Plakette |
| Schatten | weich, dezent | Platten/Rauten/Lichtfleck weg, nur weicher Kontaktschatten |
- Offen: Weg führt schnurgerade quer (Hay Day: Weg am Rand mit Abzweig) – nächster Schritt; Hühnerstall-Strohplatte; Ladebild Herbst → Weihnachten (Grafik-Runde); Spielgefühl (Juice); Münz-Senken (Bot 34.000 Münzen an Tag 7).

## Recherche-Ergebnisse (23.11.2026)
Hinweis: Öffentliche Design-Dokumente von Supercell gibt es kaum. Was nicht aus einer Quelle stammt, ist als **Beobachtung** (eigenes Spielwissen) markiert.

### A. Hof-Aufbau und gesperrtes Land
- **Beobachtung Hay Day:** Der Hof ist eine ruhige, freie Fläche. Der Rand ist dichter Wald/Gebüsch, kein Fluss quer durchs Bild. Gesperrtes Land ist mit Bäumen/Büschen zugewachsen; ein einziges Schild „Erweitern“ steht davor, die Bedingungen (Material, Münzen) kommen erst beim Antippen.
- **Beobachtung Clash of Clans:** Spielfeld als klares Rechteck, außen ein gleichmäßiger Waldsaum als Rahmen. Hindernisse (Bäume, Steine) nur als bewusst platzierte, antippbare Objekte, nie als Zufalls-Deko auf der Fläche.
- Quelle Hay Day Pop (Ableger): Gebietsfortschritt hängt an der Zahl der Objekte, Spieler stellen dafür Deko auf – Land wird als Belohnung erlebt. [pocketgamer.biz](https://www.pocketgamer.biz/pgbiz-deep-dives-deconstructing-hay-day-pop)
- Spieler-Kritik Hay Day: Erweitern wird als zäh empfunden, wenn Material zu schwer zu bekommen ist → bei uns Material-Bedarf klein halten und klar anzeigen. [sikayetvar](https://www.sikayetvar.com/en/hay-day-us/hay-day-expansion-items-too-hard-to-find-ruining-the-game)
- **Folge für uns:** Kein Bach/Brücke. Waldsaum am Rand auf festem Raster. Gesperrtes Land = verschneite, leicht abgedunkelte Fläche mit EINEM Schild (Schloss + Stufe), Preis erst beim Antippen.

### B. Buttons und HUD
- Supercell nutzt dieselben Kunst-Assets (Figuren, Gebäude) in Welt und Oberfläche – die Oberfläche wirkt dadurch wie aus einem Guss, nicht wie ein separates UI-Baukasten-Set. [Adobe/Supercell Helsinki](https://www.adobe.com/products/substance3d/magazine/supercell-helsinki-creating-stylized-content-for-clash-of-clans-and-clash-royale)
- Supercell sucht für UI ausdrücklich Erfahrung in „UI-Animationen, Übergängen, Interaktions-Rückmeldung“ – Druckgefühl ist eigenes Handwerk. [Supercell Stellenanzeige](https://supercell.com/en/careers/senior-ui-artist/66476c5d-30b6-4772-aa41-94d251e3d73c/)
- Clash-of-Clans-UI-Überarbeitung: Buttons wurden nach Häufigkeit an feste Ecken sortiert. [Supercell Blog](https://supercell.com/en/games/clashofclans/blog/news/weve-revamped-the-clash-of-clans-user-interface/)
- Mobile-Button-Handwerk: je Button EINE Hauptfarbe, starker Hell-Dunkel-Kontrast zwischen Symbol und Grund. [Construct-Tutorial](https://construct.net/en/tutorials/design-professional-looking-911)
- **Folge für uns:** Ein Button-Baustein für alles: runde Form, gleiche Größe je Rang (groß = Hauptaktion, klein = Ecke), dicker dunkler Rand + harte Unterkante (3D), Symbol hell auf satter Farbe, Beschriftung darunter in gleicher Schrift. Drücken = 4 px nach unten + Unterkante weg, Loslassen = kurzer Feder-Hüpfer. Feste Ecken: links unten Bauen/Shop, rechts unten Lager/Aufträge/Post, oben Status.

### C. Spielgefühl („Juice“)
- „Juice it or lose it“ (Jonasson/Purho 2012): gleiche Spielregeln, aber Schritt für Schritt Partikel, Wackeln, Ton, Animation, Gesichter → fühlt sich völlig anders an. [Zusammenfassung](https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons), [Wikipedia Game feel](https://Www.wikipedia.org/wiki/Game_feel)
- Forschung: Nicht jeder Juice ist gut; Maß und Zusammenhang entscheiden. [arXiv 2011.09201](https://arxiv.org/abs/2011.09201)
- **Folge für uns:** Jede Aktion bekommt genau EINE klare Rückmeldung in drei Teilen: Objekt reagiert (Quetschen/Hüpfen), Belohnung fliegt sichtbar ins Ziel (Lager/Münzen), kurzer Ton. Kein Bildschirm-Wackeln im Gemütlich-Spiel. Erst Ernten, dann Produktion, dann Auftrag abgeben.
