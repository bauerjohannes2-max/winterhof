# Winterhof – Projektleitung (Claude) · Stand 23.11.2026

## Rollen
- **Claude (Claude Code):** Kopf des Projekts. Architektur, Logik-Kern, Daten, Wirtschaft, Tests, Prüfung aller Ergebnisse.
- **Gemini (Antigravity):** Grafik und Bilder (Sprites, Animationen, Look) nach Claudes Aufträgen, zweite Meinung bei schwierigen Fragen. Ändert Code nur nach ausdrücklicher Freigabe.
- **Nie gleichzeitig im Repo arbeiten.** Wer arbeitet, steht hier unter „Wer arbeitet gerade“.
- **Hannes:** entscheidet, testet, gibt Live-Freigabe.

## Wer arbeitet gerade
- Claude (Kern-Umbau). Gemini pausiert seit 23.11.2026 (bestätigt).

## Entscheidungen (Hannes, 23.11.2026)
1. Offline-Spiel, aber server-fähig gebaut (Befehle + reiner Logik-Kern).
2. Push auf GitHub (= live) nur nach Hannes' OK. Lokal committen ist frei.
3. Geminis Stand gesichert als Tag `v6-prototyp`.
4. Thema: Alpen-Winter als Basis, Daten so, dass später Jahreszeiten möglich sind.

## Architektur ab v8
- `src/content/winterhof.json` – **einzige Datenquelle** (Waren, Tiere, Gebäude, Level, Ziele, Lager, Aufträge, Start-Hof). `src/gameData.js` ist nur noch ein Adapter für die alte Oberfläche.
- `src/core/` – Logik-Kern in TypeScript, ohne DOM/Pixi/Audio:
  - `commands.ts` – jede Aktion als Befehl, `advanceTime` für Zeit-/Offline-Fortschritt
  - `save.ts` – Speicherstand v8, Migration aus v2–v7 ohne Fortschrittsverlust, Sicherungskopie
  - `session.ts` – hält den Stand, `dispatch`, `tick`, gedrosseltes Speichern
  - `map.ts` – Platzierung aus Gelände + Objektliste
- `tests/core/` – 32 Tests inkl. 7-Tage-Wirtschafts-Bot. `npm test`, `npm run typecheck`.

## Wirtschaft (erste Kalibrierung)
- Ernte gibt 2, Pflanzen kostet 1 aus dem Silo (sonst Münzen).
- Silo (Ernte) und Scheune (Produkte) getrennt.
- Sofortverkauf an Händler nur 30 % des Werts. Aufträge und Hofladen sind besser.
- 30 Level (XP = 60·(L−1)^2,2), kleine Level-Boni.
- Vielspieler-Bot (3×20 min/Tag): Tag 1 Stufe 6, Tag 7 Stufe 15.

## Nächste Schritte
1. Oberfläche (`main.js`) auf `GameSession` umstellen: Klick → Befehl, Ereignis → Animation/Ton. Danach alte Logik in `main.js` löschen.
2. Darstellung datengetrieben: Sprite, Anker und Footprint in die JSON, generische Objekt-Ansicht statt Pixel-Code je Gebäude.
3. Inhalte für Stufe 6–30 planen (neue Waren, Gebäude, Tiere). Gemini liefert die Grafik dazu.
4. Danach Gemini-Aufträge für Animationen (Tiere, Gebäude).
