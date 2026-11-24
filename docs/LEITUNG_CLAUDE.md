# Winterhof – Projektleitung (Claude) · Stand 23.11.2026

## Rollen
- **Claude (Claude Code):** Kopf des Projekts. Architektur, Logik-Kern, Daten, Wirtschaft, Tests, Prüfung aller Ergebnisse.
- **Gemini (Antigravity):** Grafik und Bilder (Sprites, Animationen, Look) nach Claudes Aufträgen, zweite Meinung bei schwierigen Fragen. Ändert Code nur nach ausdrücklicher Freigabe.
- **Nie gleichzeitig im Repo arbeiten.** Wer arbeitet, steht hier unter „Wer arbeitet gerade“.
- **Hannes:** entscheidet, testet, gibt Live-Freigabe.

## Wer arbeitet gerade
- Niemand. Baustein 2b fertig (24.11.), wartet auf Abnahme durch Hannes (Kartenbild `docs/qa/neustart/b02b_karte.png`, offen: Name des Sees). Danach Baustein 3. Prüfen: `npm run check`.

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
- `src/render/` – neue Darstellung (Einstieg `index.html`), liest nur den Kern und schickt Befehle. Alte Oberfläche (`main.js`, `world.js`, `engine/`) gelöscht 24.11. (Tag `v9-flickwerk`).
- Browser-Test: Playwright mit Bildvergleich (`tests/browser/`).
- `tests/core/` – 38 Tests inkl. 7-Tage-Wirtschafts-Bot. `npm test`, `npm run typecheck`.

## Wirtschaft (erste Kalibrierung)
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
