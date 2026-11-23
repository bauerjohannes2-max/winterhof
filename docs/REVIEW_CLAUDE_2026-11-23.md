# Winterhof – kritische Code-Prüfung (Claude, 23.11.2026)

Geprüft: Stand v6 „Vertical Slice 1“ (5 Commits, plus nicht committete Änderungen in 9 Dateien).
Kernaussage: **Die Grafik ist brauchbar, das Fundament ist ein Prototyp.** Es gibt keine saubere Trennung zwischen Spiellogik, Darstellung und Bedienung. Jede neue Funktion macht es schwerer. Nicht weiter Features bauen, erst das Fundament neu aufsetzen. Grafik, Sprites, Shader und Spieldaten können bleiben.

---

## 1. Wie ein Farm-/Aufbauspiel wie Hay Day oder Clash of Clans technisch aufgebaut ist

Supercell veröffentlicht seine Architektur nicht im Detail. Gesichert ist: Spieldaten liegen in Tabellen (CSV), die Spiellogik läuft serverseitig mit, Hay Day und Clash of Clans teilen sich offenbar dasselbe Protokoll-Grundgerüst (Quellen unten). Daraus und aus gängiger Praxis bei Aufbauspielen ergeben sich diese Bausteine:

| # | Baustein | Was er bedeutet |
|---|---|---|
| 1 | **Simulation getrennt von Darstellung** | Ein reiner Logik-Kern (kein DOM, kein Pixi, kein Audio) hält den Spielstand und kennt die Regeln. Die Grafik liest nur, sie ändert nie etwas. |
| 2 | **Befehle (Commands)** | Jede Spieleraktion ist ein Befehl, z. B. `plant(fieldId, cropId, t)`. Er wird geprüft und erst dann auf den Stand angewendet. So lässt sich später ein Server dazuschalten, der dieselben Befehle prüft (Schutz gegen Schummeln, Sync über Geräte). |
| 3 | **Zeit als Zeitstempel, nicht als Tick** | Felder, Tiere und Produktion speichern nur `startAt`/`endAt`. Der Zustand wird bei Bedarf ausgerechnet. Offline-Fortschritt ergibt sich so automatisch. |
| 4 | **Datengetriebene Inhalte** | Gebäude, Pflanzen, Rezepte, Level, Preise, Footprint, Sprite und Anker stehen in Tabellen. Code kennt keine einzelnen Gebäude beim Namen. |
| 5 | **Einheitliche Objektliste** | Alles auf der Karte ist ein Objekt `{id, typeId, gx, gy, rot, zustand}`. Footprint, Sprite und Verhalten kommen aus der Tabelle. |
| 6 | **Raster als einzige Wahrheit** | Belegung wird nur bei Änderungen aktualisiert, nicht in jedem Frame neu gebaut. |
| 7 | **Wirtschaft als Tabelle mit Kurven** | Zeiten, Preise, XP und Freischaltungen folgen geplanten Kurven (Tabellenblatt), nicht Bauchgefühl. Kern-Schleife Hay Day: anbauen → verarbeiten → Aufträge/Laden → Münzen/XP → freischalten. |
| 8 | **Speicherstand mit Version und Migrationen** | Nummerierte Migrationsschritte v1→v2→…, die niemals Fortschritt löschen. Dazu Prüfsumme, Sicherungskopie und Fehlermeldung statt stillem Reset. |
| 9 | **Automatische Tests für die Logik** | Unit-Tests für jeden Befehl und für Wirtschaftsregeln. Screenshots ersetzen keine Tests. |
| 10 | **UI als eigene Schicht** | Dialoge als Komponenten, die auf Änderungen reagieren, statt alle 600 ms per `innerHTML` neu gebaut zu werden. |
| 11 | **Online-Funktionen nur mit Server** | Handel mit anderen, Nachbarschaft, Derby, Bestenlisten und geräteübergreifender Spielstand brauchen ein Backend. Ein reines PWA mit `localStorage` kann das nicht. |

---

## 2. Befunde im Code (kritisch, nach Schwere)

### KRITISCH – Fundament

1. **Gott-Klasse `src/main.js` (2.556 Zeilen).** Spiellogik, Speichern, Touch-Eingabe, Treffer-Test, HUD und 12 Dialoge stecken in einer Klasse. 202 direkte Schreibzugriffe auf `this.state.…`, 70 Event-Listener, 30-mal `innerHTML`. Es gibt keinen Logik-Kern, den man ohne Browser testen könnte.
2. **Die Spiellogik hängt am Render-Loop.** `tickSimulation()` läuft in `requestAnimationFrame` (`main.js:324`) und speichert dort bei jeder Statusänderung synchron den kompletten Stand. Läuft die Grafik nicht (Tab im Hintergrund, Fehler im Renderer), steht auch die Logik.
3. **Migration löscht Spielerfortschritt.** `loadState()` (`main.js:268–280`) überschreibt beim Umstieg von v5/v6 Felder, Dekorationen und Tierpositionen mit dem Startzustand. Gepflanzte Felder und gekaufte Deko sind dann weg.
4. **Versionsnummer ist kaputt.** Der neue Stand hat `version: 5`, geladene Stände bekommen `version: 7`. Gespeichert wird unter `winterhof_save_v6_grid`. Es gibt keine nummerierten Migrationsschritte.
5. **Fehler werden verschluckt.** `catch {}` beim Speichern und `catch { return createInitialState() }` beim Laden: Ein einziger defekter Wert setzt das ganze Spiel still auf Anfang zurück. Ist der Speicher voll, geht Fortschritt verloren, ohne Hinweis.
6. **Kein einheitliches Objektmodell.** Chalet, Baum, Wunschtafel, Schlitten und Briefkasten sind Einzelfelder im Stand (`state.chalet`, `state.sleighPos` …). Stationen, Felder, Tiere und Deko haben je eigene Listen mit eigenen Regeln. Jeder neue Objekttyp braucht Code an 5–8 Stellen.
7. **Darstellung fest verdrahtet.** `world.render()` (rund 400 Zeilen ab `world.js:871`) platziert jedes Gebäude einzeln mit Pixel-Korrekturen (`+34`, `232×220`, `anchorY 0.86` …). Footprint und Anker stehen nicht in den Daten. Daher die Probleme mit schwebenden Gebäuden und Zäunen im Wasser.
8. **Das Raster wird in jedem Frame komplett neu gebaut.** `grid.syncFromState()` steht in `world.update()` (`world.js:515`), also 60-mal pro Sekunde. Das ist keine „einzige Wahrheit“, sondern eine Kopie, die ständig neu erzeugt wird.
9. **Keine Befehls-Schicht.** Aktionen ändern den Stand direkt und lösen nebenbei Sound, Partikel, Toasts und Speichern aus (z. B. `startCraft`, `fulfillOrder`). Ein Server oder Mehrspieler lässt sich so nicht nachrüsten.

### HOCH – Spielmechanik und Wirtschaft

10. **Zeit = Gerätezeit (`Date.now()`, 17×).** Uhr am Handy vorstellen heißt sofort alles fertig. Für ein reines Offline-Spiel ist das vertretbar, aber dann bewusst entscheiden und Rücksprünge der Uhr abfangen.
11. **Zufall ohne Seed (`Math.random`, 14×)** in Aufträgen, Käufern und Angeboten. Nicht reproduzierbar und nicht testbar.
12. **Wirtschaft ohne Plan.** Preise, Zeiten und XP sind einzeln in `gameData.js` gesetzt. Es gibt keine Tabelle mit Kurven (Münzen/Stunde je Level, Zeit bis Level-up, Engpass-Waren).
13. **Kern-Schleife unvollständig.** Es fehlt, was Hay Day lange motiviert: echter Auftrags-Lieferwagen mit Ablauf, Schiff-/Zug-Aufträge, Ausbaumaterial für Scheune und Silo statt nur Münzen, Produktionsgebäude mit Ausbaustufen, Tier-Futterkette (Futtermühle), Ernte, die Saatgut zurückgibt.
14. **Scheune zählt alles gemeinsam.** Hay Day trennt Silo (Ernte) und Scheune (Produkte). Das ist ein wichtiger Engpass im Spieldesign.
15. **Ladenstand und Besucher sind lokal simuliert.** Ohne Server sind „Kunden“ nur Zufall, ein echter Handel mit anderen ist so nicht möglich.

### MITTEL – Technik und Qualität

16. **Dialoge werden alle 600 ms komplett neu gebaut** (`main.js:332–339`). Folgen: Scroll-Position springt, Tippen geht ins Leere, unnötige Last.
17. **A*-Wegsuche ohne Priority-Queue** (sortiert bei jedem Schritt die ganze Liste) und mit fest eingebauten Kartengrenzen (`nx < 1 || nx > 15`). Bei größerer Karte wird das langsam und fehleranfällig.
18. **Widersprüchliche Kartengrößen:** `GRID_SIZE = 16`, Doku 20×20, `WORLD_MIN/MAX` 24×24, bebaubar 14×14.
19. **Kein TypeScript, keine Typen** für Stand und Daten. Fehler wie die Versionsnummer fallen so nicht auf.
20. **Tests prüfen vor allem Optik.** `e2e_test.mjs` macht Screenshots und Zählungen. Kein einziger Unit-Test für Ernten, Produktion, Aufträge oder Migration.
21. **Nicht committete Änderungen** in 9 Dateien. Ein Fehlschlag kann Arbeit kosten.

### NIEDRIG – Doku und Marke

22. **Die Doku ist zum Teil Werbetext und falsch.** „AAA“, „60.1 FPS“, „Supercell Titan-Engine“ sind Selbstbehauptungen von Gemini, nicht belegt. Der Architektur-Index verweist auf Pfade einer Gemini-VM (`/home/antigravity/...`).
23. **Die README ist veraltet und rechtlich heikel.** Sie bewirbt noch Herbst/Halloween und Harry-Potter-Inhalte (Hedwig, Goldener Schnatz, Sprechender Hut, Butterbier). Laut v5 wurden diese aus dem Spiel entfernt, also auch aus der README löschen. Für eine öffentliche Seite (GitHub Pages) keine fremden Marken oder Figuren verwenden, auch „Hay Day“ und „Supercell“ nicht in der Oberfläche.

---

## 3. Was gut ist (behalten)

- Pixi v8 mit Vite als Grundlage ist eine gute Wahl für ein 2.5D-Browserspiel.
- Objekt-Pools für Sprites und Partikel statt Neuerzeugung in jedem Frame.
- Produktion und Felder rechnen schon mit Zeitstempeln (`finishAt`, `plantedAt`). Das ist der richtige Ansatz und lässt sich auf einen Logik-Kern übertragen.
- Raster mit Ebenen (Gelände, Oberfläche, Zone, Belegung) und ein Welt-Prüfer sind eine gute Idee. Nur die Umsetzung (Neuaufbau in jedem Frame) ist falsch.
- Sprites, Shader, Beleuchtung und Sound können bleiben.

---

## 4. Empfohlener Umbau (in dieser Reihenfolge)

1. **Sichern:** Alles committen und den Tag `v6-prototyp` setzen.
2. **TypeScript einführen** und die Typen `GameState`, `MapObject`, `ItemDef`, `BuildingDef` festlegen.
3. **Logik-Kern `src/core/`** (ohne DOM, Pixi oder Audio):
   - `state.ts`: einheitliche `objects[]` statt Einzelfelder
   - `commands/*.ts`: `plant`, `harvest`, `feed`, `collect`, `startProduction`, `collectProduct`, `place`, `move`, `buy`, `sell`, `fulfillOrder`, `unlockZone`, `upgradeStorage`. Jeder Befehl ist eine reine Funktion `(state, cmd, now) → {state, events}` oder ein Fehler.
   - `events`: z. B. „geerntet“ oder „Level-up“. Die Grafik, der Sound und das UI reagieren nur auf diese Events.
   - `clock.ts`: eine Zeitquelle, die Rücksprünge der Uhr abfängt
   - `rng.ts`: Zufall mit Seed
4. **Inhalte als Tabellen** (`data/*.json` oder CSV): Gebäude mit Footprint, Sprite, Anker und Ausbaustufen, Pflanzen, Rezepte, Tiere, Level, Zonen, Lager. Der Code liest nur die Tabellen.
5. **Speicherstand neu:** `schemaVersion` plus Liste nummerierter Migrationen, die niemals Fortschritt löschen. Dazu eine Sicherungskopie vor jeder Migration und eine sichtbare Fehlermeldung. Gespeichert wird nur nach einem Befehl und gedrosselt, nicht im Render-Loop.
6. **Unit-Tests (Vitest)** für jeden Befehl, für Offline-Fortschritt (z. B. „8 Stunden weg“), für Migrationen und für die Wirtschaft (simuliere 7 Tage Spiel, prüfe Level und Münzen).
7. **Darstellung datengetrieben:** Ein generischer `MapObjectView` liest Sprite, Anker und Footprint aus der Tabelle. Tiefensortierung nach der vorderen Rasterecke. Das Raster wird nur bei Änderungen aktualisiert.
8. **UI als Komponenten** (z. B. Preact oder Lit, ohne `innerHTML` alle 600 ms), die nur bei Events neu zeichnen.
9. **Wirtschafts-Tabelle** anlegen (Excel/Sheet) und daraus die JSON-Daten erzeugen.
10. **Erst danach** neue Inhalte und Animationen. Ein Backend nur, wenn Online-Funktionen wirklich gewollt sind.

---

## 5. Auftrag zum Kopieren für Gemini / Antigravity

```
Stopp mit neuen Features und Grafik. Wir bauen das Fundament neu, Grafik-Assets bleiben.
Lies docs/REVIEW_CLAUDE_2026-11-23.md komplett. Arbeite die Abschnitte 2 und 4 der Reihe nach ab.

Regeln:
1. Zuerst alles committen, Tag v6-prototyp.
2. Neuer Logik-Kern src/core/ in TypeScript: kein DOM, kein Pixi, kein Audio, keine Date.now()/Math.random direkt.
   Jede Spieleraktion ist ein Command (reine Funktion state+cmd+now -> neuer state + events oder Fehler).
3. Ein einheitliches objects[]-Array für alles auf der Karte; Footprint/Sprite/Anker kommen aus data/*.json.
4. Keine fest verdrahteten Pixel-Offsets je Gebäude in world.js – nur generische Views aus den Daten.
5. Das Raster nur bei Änderungen aktualisieren, nie pro Frame.
6. Speicherstand: schemaVersion + nummerierte Migrationen, die NIE Fortschritt löschen; Backup vor Migration; keine leeren catch-Blöcke.
7. Vitest-Unit-Tests für jeden Command, Offline-Fortschritt, Migration v6->v8, und eine 7-Tage-Wirtschaftssimulation. Alle Tests grün, bevor du weitermachst.
8. Dialoge nicht mehr per innerHTML-Timer neu bauen; nur bei Events neu zeichnen.
9. Doku ehrlich: keine Behauptungen wie "AAA" oder FPS-Werte ohne Messprotokoll; README aktualisieren, alle Harry-Potter-/Fremdmarken-Bezüge entfernen.
10. Nach jedem Schritt: kurzer Bericht, was geändert wurde, welche Tests laufen, was offen ist. Kein Schritt gilt als fertig ohne grüne Tests.
```

---

## Quellen
- Community-Nachbau Clash of Clans (Aufteilung Daten/CSV/Logik/Protokoll/Server): https://github.com/ufaith/cocsharp
- Clash-of-Clans-Daten als CSV: https://github.com/Statscell/clash-of-clans-data
- Protokoll ähnlich Hay Day/Boom Beach (Community-Doku): https://github.com/clanner/cocdp
- Server-Zeitstempel für Ernte/Produktion/Offline-Fortschritt (Design-Dokument): https://radhahariharan.github.io/marketland-plus-gdd/docs/systems/36-technical-systems.html
- Offline-Fortschritt: Logik einmal, ohne UI durchlaufen lassen (Entwickler-Diskussion): https://itch.io/post/14655139
- Open-Source-Browser-Farmspiel mit zentralem Spielstand: https://github.com/jeremyckahn/farmhand
