# Winterhof

Gemütliches Weihnachts-Hofspiel für Handys im Querformat. Ziel: mindestens das Niveau von Hay Day und Clash of Clans.

**Stand:** Neustart „langsam und richtig“ (ab 23.11.2026). Der Logik-Kern bleibt, die Darstellung wird Baustein für Baustein neu gebaut. Die alte Oberfläche ist gelöscht (Sicherung: Tag `v9-flickwerk`), die Live-Seite ist eingefroren, bis die neue Darstellung spielbar ist.

## Für jede Sitzung
Zuerst `CLAUDE.md` lesen, dann `docs/QUALITAETS_LEITFADEN.md`, `docs/LEITUNG_CLAUDE.md`, `docs/NEUSTART_PLAN.md`, `docs/KARTEN_KONZEPT.md`.

## Aufbau
- `src/content/winterhof.json`: einzige Datenquelle (Waren, Tiere, Gebäude, Karte, Landstücke, Hindernisse, Werkzeuge).
- `src/core/`: Logik-Kern in TypeScript, ohne Grafik. Jede Aktion ist ein Befehl.
- `src/render/`: neue Darstellung (PixiJS v8), Einstieg `index.html`.
- `tests/core/`: Kern-Tests inkl. Wirtschafts-Bot. `tests/browser/`: Playwright mit Bildvergleich.
- `docs/archiv/`: Unterlagen der alten Fassung, nur zum Nachlesen.

## Befehle
```powershell
npm run check
```
Typprüfung, Lint, Kern-Tests, Build und Browser-Bildvergleich. Nur bei Grün committen und pushen.

```powershell
python scripts/karte_bild.py
```
Zeichnet die Karte aus den Daten als Abnahmebild.
