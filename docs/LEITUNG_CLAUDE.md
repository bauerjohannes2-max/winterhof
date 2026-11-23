# Winterhof – Projektleitung (Claude) · Stand 23.11.2026

## Rollen
- **Claude (Claude Code):** Kopf des Projekts. Architektur, Logik-Kern, Daten, Wirtschaft, Tests, Prüfung aller Ergebnisse.
- **Gemini (Antigravity):** Grafik und Bilder (Sprites, Animationen, Look) nach Claudes Aufträgen, zweite Meinung bei schwierigen Fragen. Ändert Code nur nach ausdrücklicher Freigabe.
- **Nie gleichzeitig im Repo arbeiten.** Wer arbeitet, steht hier unter „Wer arbeitet gerade“.
- **Hannes:** entscheidet, testet, gibt Live-Freigabe.

## Wer arbeitet gerade
- Niemand. Probeausschnitt Runde 2 live (Claude 23.11. 19:00: Acker zusammenhängend, Stall 1,6 + Huhn 0,52 Kacheln, Hof-Details, Wildnis-Rand als Schneehaufen; Vergleich `docs/qa/probe/vergleich_runde2.jpg`). Offen: echtes Hay-Day-Vergleichsbild (nur lokal, nie ins Repo). Rohbögen lokal in `art_src/probe_raw/` (nicht im Repo). Vergleich: `docs/qa/probe/vergleich_vorher_nachher.jpg`, Vorher im Spiel mit `?probe=0`.

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

## Architektur ab v8
- `src/content/winterhof.json` – **einzige Datenquelle** (Waren, Tiere, Gebäude, Level, Ziele, Lager, Aufträge, Start-Hof). `src/gameData.js` ist nur noch ein Adapter für die alte Oberfläche.
- `src/core/` – Logik-Kern in TypeScript, ohne DOM/Pixi/Audio:
  - `commands.ts` – jede Aktion als Befehl, `advanceTime` für Zeit-/Offline-Fortschritt
  - `save.ts` – Speicherstand v8, Migration aus v2–v7 ohne Fortschrittsverlust, Sicherungskopie
  - `session.ts` – hält den Stand, `dispatch`, `tick`, gedrosseltes Speichern
  - `map.ts` – Platzierung aus Gelände + Objektliste
- `src/main.js` – Oberfläche: ändert den Stand nie selbst. Klick → `act(Befehl)`, Kern-Ereignis → `onEvents` (Animation, Ton, Hinweis). Zeit: `session.tick()` 1×/s.
- `src/ui/view.js` – Übergang: rechnet Kern-Stand in die Form um, die `world.js` liest (fällt mit Schritt 2 weg).
- Browser-Test: `npm run build` + `node scripts/e2e_test.mjs` (Spielablauf über Befehle, Speichern/Neuladen).
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
