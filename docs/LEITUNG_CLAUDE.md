# Winterhof – Projektleitung (Claude) · Stand 23.11.2026

## Rollen
- **Claude (Claude Code):** Kopf des Projekts. Architektur, Logik-Kern, Daten, Wirtschaft, Tests, Prüfung aller Ergebnisse.
- **Gemini (Antigravity):** Grafik und Bilder (Sprites, Animationen, Look) nach Claudes Aufträgen, zweite Meinung bei schwierigen Fragen. Ändert Code nur nach ausdrücklicher Freigabe.
- **Nie gleichzeitig im Repo arbeiten.** Wer arbeitet, steht hier unter „Wer arbeitet gerade“.
- **Hannes:** entscheidet, testet, gibt Live-Freigabe.

## Wer arbeitet gerade
- Niemand. Baustein 4 abgenommen (Hannes 24.11.). Nächstes: Baustein 5 Grundboden, erst Konzeptfragen an Hannes.

## Entscheidungen (Hannes, 23.11.2026)
1. Offline-Spiel, aber server-fähig gebaut (Befehle + reiner Logik-Kern).
2. Push auf GitHub (= live) erlaubt, wenn Typprüfung + Tests + Build grün sind (Hannes 23.11.). Lokal committen ist frei.
3. Geminis Stand gesichert als Tag `v6-prototyp`.
4. Thema: Alpen-Winter als Basis, Daten so, dass später Jahreszeiten möglich sind.
7. **Weihnachten ist das Konzept** (Hannes 23.11.): jede neue Ware, jedes Tier, Gebäude und jede Deko hat Weihnachtsbezug; Alpen nur Kulisse. Kein normaler Bauernhof-Inhalt (Kuh, Kartoffel, Kohl).
8. **Tierfreundlich, möglichst vegan** (Hannes 23.11.): nichts schlachten oder rupfen, kein Fleisch. Eier, Milch, Wolle, Honig in Maßen ok. Eisfischen bleibt erlaubt (Hannes 23.11.).
5. Grafik mutiger: gleiche Handschrift, aber jedes Objekt mit eigener Silhouette, Star-Merkmal, Akzentfarbe; später = spektakulärer. Gemini liefert je Auftrag 3 Varianten (zurückhaltend → wild), Hannes wählt (STIL_REGELN §6a). **Erst ganz zum Schluss** (Hannes 23.11.): zuerst Spiel fertig, dann Grafik-Runde.
6. Stufe 6–30 (Hannes 23.11.): Baumaterial ab Stufe 6 für Lager- und Landausbau. Neue Systeme: Bergbahn-Lieferungen, Eisfischen, Schneestollen (Mine), Weihnachtsmarkt-Fest. Inhalte jetzt mit Platzhalter-Bildern einbauen, echte Grafik am Schluss.

9. **Hay Day ist der Maßstab für alles** (Hannes 23.11. abends): Bei jeder Frage und jedem Detail (Karte, Boden, Wege, Felder, Erweitern, Buttons, Schrift, Schatten, Spielgefühl) zuerst nachsehen, wie Hay Day es macht, Bild daneben legen, dann umsetzen. Weihnachten bleibt das Thema, Grafiken eigene (nichts kopieren).

10. **Grafik-Probeausschnitt jetzt** (Hannes 23.11. spät, ersetzt „Grafik erst ganz zum Schluss“ teilweise): kleiner Hofkern in fertiger Qualität (Boden, Weg, Wildnis, Feld/Weizen, Huhn/Stall, HUD), um Machbarkeit zu prüfen. Danach Inhalte im selben Stil.

11. **Erst perfektionieren, nichts Neues** (Hannes 23.11. abends): Bestehendes auf Hay-Day-/Clash-of-Clans-Niveau bringen, vor allem Übergänge (Objekt↔Boden, Weg↔Schnee, Feld↔Boden, Hof↔Wildnis); „vieles wirkt lose“. Vorher echte Screenshots beider Spiele im Detail analysieren (nie ins Repo).

12. **Neustart „langsam und richtig“** (Hannes 23.11. spät): Kein Flicken mehr. Von vorn, ein Baustein nach dem anderen, jeder fertig und von Hannes abgenommen, bevor der nächste kommt. Erst technisches Fundament, dann Grafik Stück für Stück. Vorbild Hay Day + Clash of Clans bis ins Detail. Schritt 0: Bestandsaufnahme, Hannes entscheidet „Kern behalten, Darstellung neu“ (Empfehlung) oder „alles neu“. Alter Stand bleibt als Tag `v9-flickwerk`. **Hannes 23.11.: Kern behalten, Darstellung neu.** Plan: `docs/NEUSTART_PLAN.md` (wartet auf Abnahme).

13. **Bestes Spiel, keine Abkürzungen** (Hannes 24.11.): Ziel ist mindestens das Niveau von Hay Day und Clash of Clans, wo möglich besser. Keine Umwege, Abkürzungen oder Pflaster, auch nicht auf Hannes' eigene Bitte: Claude widerspricht, nennt den besten Weg, und eine Ausnahme gibt es nur nach ausdrücklicher Entscheidung von Hannes (hier eintragen). Jedes Vorgehen wird kritisch geprüft, mit Vorbildern und seriösen Quellen. Verbindlich: `docs/QUALITAETS_LEITFADEN.md`, `CLAUDE.md` im Projekt.

14. **Karten-Konzept wie Hay Day + viel nachfragen** (Hannes 24.11.): feste Zufahrt statt Straße quer durch, Wege legt der Spieler, Land kaufen + Hindernisse mit Werkzeugen räumen, Tannen ausgraben statt fällen, keine Grundstücksnamen, Alpental mit Bergen/See, Start klein. Details `docs/KARTEN_KONZEPT.md`. Claude fragt Hannes bei jeder Konzeptfrage interaktiv (Auswahl mit Empfehlung).

15. **Karten-Details + alte Oberfläche weg** (Hannes 24.11., Rückfragen Runde 2–4, je Empfehlung): Landstücke 5×5 im Tal 30×30, Hindernisse ab Start, Landkauf ab Stufe 3, nur Schneewehen wachsen nach, Werkzeuge per Fund + Sofortkauf, Startpaket Schaufel + Spitzhacke, Hindernisse klein 1×1 / groß 2×2, Räumen gibt XP + Fundchance, See rechts ab Stufe 13, Zufahrt zum Hofplatz mit festen Stationen (Chalet frei), Start Mitte eher vorn, 3 + 3 Wegplatten, Land-Material Grundbrief/Holzhammer/Grenzpflock. **Alte Oberfläche gelöscht, Live-Seite eingefroren** (Hochladen nur von Hand, erst wenn die neue Darstellung spielbar ist). Details `docs/KARTEN_KONZEPT.md`.

16. **Karte nachbessern vor Abnahme 2b** (Hannes 24.11. spät, je Empfehlung): Berge breiter und gestaffelt, Hindernisse in natürlichen Gruppen statt gleichmäßig gestreut; See heißt **Sternsee**; Tagestruhe bleibt fest am Hofplatz.

17. **Kein App-Store, Web-Spiel mit PixiJS** (Hannes 24.11. spät): Winterhof bleibt ein Browser-Spiel (später als Web-App auf den Startbildschirm), keine Store-Version. Deshalb keine Game-Engine (Unity/Godot): PixiJS v8 + TypeScript bleibt (Baustein 0). Begründung: 2D-Schrägansicht braucht keine Engine, läuft auf jedem Handy ohne Installation, alles ist prüfbarer Code. Vorbild: Supercell nutzt ebenfalls keine fertige Engine.

18. **Wirtschaft vor Baustein 3** (Hannes 24.11. spät, je Empfehlung): Der 7-Tage-Bot schwankt je Zufallsverlauf zwischen 7.500 und 62.000 Münzen (Stufe 14–16), Ursache: Aufträge reiner Zufall, kaum Münz-Ausgaben. Neu als Baustein 2c: **Aufträge passend zum Hof** (nur herstellbare Waren, Mischung leicht/mittel/schwer, Lohn nach Aufwand), **zwei Lohn-Arten** (Münz- und Erfahrungs-Aufträge), **Münz-Ausgaben wie Hay Day** (Weihnachtsdeko, steigende Preise je Kauf, alles was bei Hay Day Sinn macht), **Tempo:** Vielspieler Woche 1 etwa Stufe 15, jeder Verlauf höchstens ±1 Stufe. Prüfung mit mehreren Zufallsverläufen statt einem.

19. **2c nachbessern, Vorgaben Baustein 3** (Hannes 24.11. Nacht, Rückfragen): 2c erst abnehmen, wenn die Einnahmen-Streuung im Ziel ist (klügerer Bot, Ursache statt Band weiten). Baustein 3: Ladebild wie Hay Day (Bild + Logo + Balken + wechselnde Tipps, erst Platzhalter), hochkant pausiert das Spiel mit Hinweis „Bitte quer halten“ (bewegtes Symbol), Bildschärfe automatisch je Handy (@1x/@2x), Schalter in den Einstellungen später.

20. **Münzen brauchen Ziele** (Hannes 24.11. Nacht, Rückfragen, je Empfehlung): mehrere Sparziele statt Lohn kürzen – Land steigt je Stück um 25 % (300 → ~4.400 beim 13. Stück), Gebäude ab Stufe 2 deutlich teurer (Patisserie 300 … Spielzeugwerkstatt 12.000). Deko maßvoll (Bot: 2,5 Teile je Landstück). Sparen ist erlaubt: höchstens das nächste große Ziel (Land oder Gebäude bis 2 Stufen voraus) + 1.000; Horten wird nur bis zur höchsten Stufe mit Inhalten geprüft (jetzt 12), darüber fehlen Inhalte (Stufe 13+ laut INHALTSPLAN).
21. **Ladebild erscheint als Ganzes** (Hannes 24.11., je Empfehlung): Bis das Motiv dekodiert ist, nur die ruhige Grundfarbe des Motivs (Apple HIG „Launching“), dann Motiv, Schriftzug, Tipp und Balken gemeinsam eingeblendet – nie Text vor Bild (wie Hay Day/Clash). Balken nach echten Etappen, läuft sichtbar voll, erst dann Ausblenden; Ladebild mindestens 1 s ganz zu sehen (kein Aufblitzen). Weihnachtsmotiv + echtes Logo erst in der Grafik-Runde (Platzhalter zeigt noch Herbst). **Nachtrag (Hannes 24.11.): einfarbige Fläche sah nicht gut aus** → statt Farbe steht ab dem ersten Bild eine weiche Mini-Vorschau des Motivs (rund 1 KB im HTML, beim Bauen aus dem Motiv erzeugt, ebenso die Grundfarbe); in Baustein 14 kommt das Motiv in den Speicher auf dem Handy, dann ab dem 2. Start sofort scharf. Scharfstellen 0,7 s weich an-/auslaufend, Vorschau beim Bauen weichgezeichnet (gleiche Lage, kein Sprung), Motiv unsichtbar vorgezeichnet + Ebenen auf der Grafikkarte: gemessen 60 Bilder/s auch bei 4-fach gedrosselter Rechenleistung (Hannes 24.11.: „muss komplett flüssig sein“).

22. **Kamera wie Hay Day/Clash** (Hannes 24.11., Rückfragen Runde 1–3, je Empfehlung): Ganz raus = **ganzes Tal** sichtbar, ganz rein = **8 Kacheln breit** (Grenzen in Kacheln, gleich auf jedem Bildschirm; ersetzt „Zoom 0,5–1,6“). **Gleiten + Gummirand:** Nachlauf wie iPhone, am Rand gebremst und Zurückfedern, auch der Zoom federt an den Grenzen. **Hilfsraster nur beim Platzieren** (ab Baustein 12 rund ums Objekt); bis dahin zum Prüfen sichtbar, Taste G bzw. Drei-Finger-Tipp. **Start-Ansicht:** jeder Start gleich, **Start-Hof mittig und bildfüllend**, Hofplatz sichtbar vorn (Hannes: lieber so als Hofplatz genau mittig, der liegt am Rand des Start-Hofs). **Kartenrand:** Tal + Kulissenstreifen (seitlich 2 Kacheln, hinten 4, vorn 2 Kachelhöhen), nicht bis in die hinteren Berge. **Kein Doppeltipp-Zoom** (Tippen gehört den Objekten). **Mausrad/Touchpad** weich zum Mauszeiger.

## Architektur ab v8
- `src/content/winterhof.json` – **einzige Datenquelle** (Waren, Tiere, Gebäude, Level, Ziele, Lager, Aufträge, Start-Hof, Karte, Landstücke, Hindernisse, Werkzeuge).
- `src/core/` – Logik-Kern in TypeScript, ohne DOM/Pixi/Audio:
  - `commands.ts` – jede Aktion als Befehl, `advanceTime` für Zeit-/Offline-Fortschritt
  - `save.ts` – Speicherstand v9, Migration aus v8 und v2–v7 ohne Fortschrittsverlust, Sicherungskopie (v8-Stand zusätzlich einmalig unter `winterhof_save_v8_before_v9`)
  - `migrate.ts` – v8 → v9: alte Grundstücke → Landstücke, feste Stationen, Objekte umziehen statt löschen, Hindernisse nur auf fremdem Land
  - `land.ts` – Regeln Landkauf, Räumen, Werkzeugpreis, Wegplatten-Preis
  - `session.ts` – hält den Stand, `dispatch`, `tick`, gedrosseltes Speichern
  - `terrain.ts` – Alpental (Schnee, Wald, Berge, See-Eis, Zufahrt, Hofplatz) und Landstücke aus `winterhof.json → map`, Ebenen wie Tiled, Hindernisse als Objekt-Ebene (Baustein 2 + 2b)
  - `map.ts` – Platzierung aus Gelände + Objektliste
- `src/render/scene/iso.ts` – einzige Umrechnung Raster ↔ Welt (Baustein 4). `src/render/camera/` – Kamera als reines Rechenmodell (`camera.ts`, testbar ohne Browser), Rahmen aus der Karte (`mapView.ts`), Eingabe (`input.ts`). Im Entwicklungsmodus schreibt `window.__kameraSpur` jede Kamera-Lage je Bild mit (für die Bild-für-Bild-Prüfung).
- `src/render/` – neue Darstellung (Einstieg `index.html`), liest nur den Kern und schickt Befehle. Alte Oberfläche (`main.js`, `world.js`, `engine/`) gelöscht 24.11. (Tag `v9-flickwerk`).
- Browser-Test: Playwright mit Bildvergleich (`tests/browser/`).
- `tests/core/` – 38 Tests inkl. 7-Tage-Wirtschafts-Bot. `npm test`, `npm run typecheck`.

## Wirtschaft (Baustein 2c, 24.11.)
- Aufträge: `core/orders.ts` – nur herstellbare Waren, Mischung leicht 45 % / mittel 35 % / anspruchsvoll 20 % per Kartenstapel (Shuffle Bag, 20 Karten), Zielwert 40·Stufe^1,15 × Stufenfaktor, Lohn-Art Münzen (×1,3 Münzen, ×0,7 XP) oder Erfahrung (umgekehrt) je 50 %, Waren im Lager 3× so oft.
- Münz-Ausgaben: Weihnachtsdeko (Bot kauft Überschuss), Tierpreis steigt je Tier um 50 % des Grundpreises, Felder/Land/Wegplatten wie bisher. Deko gibt nur ~5 % ihres Preises als XP (vorher ~25 %: Deko war eine Stufen-Maschine).
- XP-Kurve ab Stufe 11 bis 20 % steiler.
- **Bot = Spieler-Modell mit Bedarfsplanung** (24.11. Nacht): offene Aufträge bis zu den Rohwaren aufgelöst + Futter je Tier, pflanzt/produziert, was fehlt; Extra-Produktion nur mit übrigen Zutaten; verkauft nur Überschuss; lehnt einen Auftrag erst ab, wenn er 3 Sitzungen hängt; spart für fehlende Gebäude vor Land. Vorher (feste Pflanzliste) hungerte Verlauf 7 tagelang an Weizen (Futter für Huhn, Schaf, Esel). Ergebnis 12 Verläufe: Woche 1 Stufe 15–16, Einnahmen 108.000–131.000 (Faktor 1,2), Münzen bis Stufe 12 knapp. 6 Verläufe (Seeds 1–6) laufen in `npm run check`.

## Wirtschaft (erste Kalibrierung, überholt)
- Ernte gibt 2, Pflanzen kostet 1 aus dem Silo (sonst Münzen).
- Silo (Ernte) und Scheune (Produkte) getrennt.
- Sofortverkauf an Händler nur 30 % des Werts. Aufträge und Hofladen sind besser.
- 30 Level (XP = 60·(L−1)^2,2), kleine Level-Boni.
- Vielspieler-Bot (3×20 min/Tag): Tag 1 Stufe 6, Tag 7 Stufe 16 (Stand 23.11.).

## Stil und Prüfung
- Verbindliche Regeln: `docs/STIL_REGELN.md` (nur Querformat, Maßstab in Kacheln, nie verzerren, Licht oben links, Bodenlinie).
- Prüfung: `python scripts/pruefe_assets.py` erzeugt Ampel + `docs/qa/aufstellung.png`. Vorschau ohne Datenänderung: `--set key=hoehe --out datei.png`.
- Veröffentlichen erlaubt (Hannes 23.11.): wenn Tests, Typprüfung und Build grün sind. GitHub prüft das vor jedem Deploy automatisch.

## Nächste Schritte
1. ~~Oberfläche auf `GameSession` umstellen~~ erledigt 23.11. (alte Logik gelöscht, E2E grün).
2. Darstellung datengetrieben: Sprite, Anker und Footprint in die JSON, generische Objekt-Ansicht statt Pixel-Code je Gebäude.
3. ~~Inhaltsplan Stufe 6–30~~ steht in `docs/INHALTSPLAN.md` (23.11.). ~~Baumaterial im Kern~~ erledigt 23.11.: 6 Materialien (Lager + Land), Zufallsfund ab Stufe 6, Lagerausbau ab Stufe 6 mit Material, Grundstück Bachwiese (Ostufer, Felsen/Wald dafür nach Osten verschoben). ~~Stufe 6–12 als Daten~~ erledigt 23.11. (4 Feldfrüchte, Esel, Schneeeule, 5 Gebäude, 11 Rezepte, 3 Deko; Platzhalter-Bilder). Wirtschaft neu justiert: Aufträge ×1,1 Münzen/×1,0 XP, XP-Kurve ab Stufe 10 steiler; Bot lehnt je Sitzung 1 Auftrag ab, baut Lager/Land aus → Tag 1 Stufe 6, Tag 7 Stufe 16, 26.000 Münzen (Münz-Senken fehlen noch). **Neu (Hannes 23.11. abends): Kern-Qualität zuerst**, Bergbahn pausiert. Arbeitsplan: `docs/KERN_QUALITAET_PLAN.md` (Bach/Brücke raus, Bäume/Schilder/Häuser/Felder/Truhe/Figuren/Buttons sauber, Spielgefühl; immer sehr kritisch, Best Practices recherchieren, Screenshot vorher/nachher).
4. Danach Gemini-Aufträge für Animationen (Tiere, Gebäude).
5. Ganz zum Schluss: Grafik-Runde „mutiger“ (STIL_REGELN §6a).
- Hühnerstall = Variante 1 (Hannes 23.11. 18:50).
23. **Handy-Vorschau über feste Seite** (Hannes 24.11., je Empfehlung): WLAN-Link (172.16.2.9:8090) scheitert an der Firmen-Firewall (Domänennetz). Stattdessen `npm run vorschau` → baut und lädt nach https://bauerjohannes2-max.github.io/winterhof-vorschau/ (eigenes Repo, nur gebaute Testversion, Stand in `version.txt`). Läuft in jedem Netz mit HTTPS; Live-Spiel bleibt eingefroren (Entscheidung 15). Geprüft: lädt auf iPhone-Emulation, langsames Netz + 4-fach gedrosselt, in rund 10 s ohne Fehler.
24. **Kamera-Grenze bleibt Rechteck, ganz raus mit Luft** (Hannes 24.11., Handy-Test: „komme nicht ganz an die Ecken“; je Empfehlung „wie Hay Day“): Hay Day und Clash begrenzen rechteckig, die Ecken füllt Landschaft (bei uns ab Baustein 5 die Wildnis). Ganz raus passt jetzt Tal + Kulissenstreifen drauf (vorher nur das Tal haargenau → Spitzen beim Verschieben angeschnitten); Test prüft das ganze Tal in jeder erreichbaren Lage. **Vollbild erst in Baustein 14** (Hannes 24.11.): Android per erstem Tippen, iPhone nur als Startbildschirm-App.
