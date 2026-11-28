# Winterhof – Regeln für jede Sitzung

**Oberste Regel (Hannes 24.11.2026, Entscheidung 13; verschärft 27.11., Entscheidung 64):** Winterhof wird ein einzigartiges **AAA-Mobile-Game**, mindestens auf dem Niveau von Hay Day, Clash of Clans und den besten Spielen des Genres, wo möglich besser – **visuell wie auch codetechnisch**. Keine Abkürzungen, keine Umwege, keine Pflaster, Qualität vor Tempo. Jedes Ergebnis wird **extrem kritisch** anhand des verbindlichen **AAA-Benchmark-Systems** (`docs/QUALITAETS_LEITFADEN.md` §5a) gegen die Spitzen-Vorbilder geprüft. Das gilt auch, wenn Hannes selbst eine Abkürzung vorschlägt: Dann klar widersprechen, den besten Weg nennen und eine Ausnahme nur nach ausdrücklicher Entscheidung von Hannes in `docs/LEITUNG_CLAUDE.md` eintragen. Jedes Vorgehen kritisch hinterfragen und mit Vorbildern und seriösen Quellen prüfen.

**Selbst entscheiden & streng selbst prüfen (Hannes 28.11., Entscheidung 75):** Alle Fragen, die sich aus den Regeln, Vorbildern (Hay Day / Clash), dem AAA-Benchmark-System und eigener kritischer Prüfung selbst beantworten lassen, entscheidet der Agent eigenständig, nimmt bestandene Bausteine selbst ab und arbeitet direkt weiter. Rückfragen an Hannes nur bei echten offenen Grundsatz-/Geschmacksentscheidungen und vor Live-Push auf `main`. Vor jedem Baustein zuerst prüfen: Ist das Konzept dahinter richtig, nicht nur die Technik?

**Grundlage vor Austauschbarem (Hannes 25.11., Entscheidung 39; verschärft 28.11., Entscheidung 74: Spielfortschritt vor Zier-Details – nichts bauen, was später ohne Umbau nachgerüstet werden kann, wie herumlaufende Dorfbewohner):** Was sich später ohne Umbau tauschen lässt (Kulisse, Deko, Tiere, Animationen), nur per Skizze festhalten und mit Platzhalter weiter; Grundlagen (Boden, Spielfeldform, Kachelmaß, Größen, Datenmodell) jetzt gründlich. Ziel: vorankommen, nicht in der Karte stecken bleiben.

Vor jeder Arbeit lesen:
1. `docs/QUALITAETS_LEITFADEN.md` – verbindlich, wie geprüft und gearbeitet wird
2. `docs/LEITUNG_CLAUDE.md` – Rollen, Entscheidungen, wer gerade arbeitet
3. `docs/KARTEN_KONZEPT.md` – Karte, Wege, Erweiterung (Entscheidung 14)
4. `docs/NEUSTART_PLAN.md` – Bausteine, aktueller Stand, Abnahmekriterien
5. `docs/GRAFIK_TECHNIK.md`, `docs/STIL_REGELN.md`, `docs/VORBILD_ANALYSE.md` – bei Darstellung und Grafik

Gemini (Antigravity) arbeitet nach denselben Regeln, Einstieg `AGENTS.md` (Entscheidung 63). Wer gerade arbeitet: `docs/LEITUNG_CLAUDE.md`, nie gleichzeitig.

Ablauf: ein Baustein nach dem anderen, `npm run check` grün, Vorher/Nachher-Bild, Hannes nimmt ab, erst dann der nächste Baustein.
