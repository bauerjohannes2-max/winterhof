# Winterhof – Regeln für Gemini (Antigravity)

Antigravity lädt diese Datei bei jeder Arbeit in diesem Ordner. Sie gilt dauerhaft, nicht nur für eine Sitzung.
Übergabe von Claude an Gemini am 26.11.2026 (Entscheidung 63 in `docs/LEITUNG_CLAUDE.md`).

## 1. Worum es geht
Winterhof ist Hannes' privates Aufbauspiel: ein gemütlicher Weihnachts-Bauernhof im Alpental, Browser-Spiel fürs Handy im Querformat (später als Web-App), PixiJS v8 + TypeScript.
**Ziel: ein einzigartiges AAA-Mobile-Game, mindestens auf dem Niveau von Hay Day, Clash of Clans und den besten Mobile-Spielen – visuell UND codetechnisch (Entscheidungen 13 & 64).** Vorbilder sind nur Maßstab für Qualität, Spielgefühl und Technik. Nichts kopieren: keine Bilder, Namen, Figuren, Karten oder Musik.
Privatprojekt: nichts mit Hannes' Firma vermischen, keine persönlichen Daten an fremde Dienste geben.

## 2. Die Regeln stehen an EINER Stelle
In diesen Dateien steht oft „Claude“. Das gilt für dich genauso. Lies sie vor jeder Arbeit:
1. `CLAUDE.md`: oberste Regeln (bestes Spiel, viel nachfragen, Grundlage vor Austauschbarem)
2. `docs/QUALITAETS_LEITFADEN.md`: wie geprüft wird, messbare Qualitätslatte, was verboten ist
3. `docs/LEITUNG_CLAUDE.md`: Rollen, „Wer arbeitet gerade“, alle Entscheidungen 1–63 (die neuere gilt)
4. `docs/NEUSTART_PLAN.md`: Bausteine 0–14, Stand, Abnahmekriterien
5. `docs/KARTEN_KONZEPT.md`: Karte, Landstücke, Hindernisse, Wege
6. Bei Grafik und Darstellung: `docs/GRAFIK_TECHNIK.md`, `docs/STIL_REGELN.md`, `docs/VORBILD_ANALYSE.md`, `docs/GROESSEN_KATALOG.md`
7. Bei Inhalten und Wirtschaft: `docs/INHALTSPLAN.md`
Steht hier etwas anderes als dort, gelten die Dateien oben. Widersprüche meldest du Hannes und behebst sie.

## 3. So arbeitest du
- **Ein Baustein nach dem anderen.** Ein Baustein ist erst fertig, wenn er das AAA-Benchmark-Tor (§5a) sauber bestanden hat (Autonome Selbst-Abnahme, Entsch. 75). Nie zwei Baustellen gleichzeitig.
- **Erst das Konzept, dann der Code – selbst entscheiden, nur bei echten Unklarheiten fragen (Entsch. 75).** Vor jedem Baustein zuerst prüfen, ob das Konzept stimmt (nicht nur die Technik). Alle Fragen, die sich aus den Regeln, Vorbildern (Hay Day / Clash of Clans), dem Benchmark-System und eigener strenger Prüfung selbst beantworten lassen, entscheidest du eigenständig. `ask_question` nutzt du **nur** bei echten offenen Grundsatz-/Geschmacksentscheidungen (dann immer mit Empfehlung + kurzem Grund).
- **Erst Skizze, dann aufwendiges Bild** (Entscheidung 35): Gestaltungsfragen zuerst mit einer billigen Skizze klären (z. B. `scripts/standflaeche_skizze.py`, `scripts/weg_skizze.py`), erst danach das echte Bild oder den echten Code.
- **Grundlage vor Austauschbarem** (Entscheidung 39 & 74): Boden, Spielfeld, Kachelmaß, Größen, Datenmodell und Kern gründlich. Austauschbares (Kulisse, Deko, Tiere, Animationen) nur als Skizze oder Platzhalter, Feinschliff in der Grafik-Runde am Schluss.
- **Bilder & Vorschau-Link zeigen** (Entscheidung 61, 71 & 75): Bei Vorlagen oder Rückfragen zu Aussehen und bei jeder Ergebnis-/Übergabemeldung nach abgeschlossenen Bausteinen zeigst du sichtbare Bilder direkt im Chat, lädst die Handy-Vorschau selbst hoch (`npm run vorschau`) und gibst immer direkt den **klickbaren Link** `https://bauerjohannes2-max.github.io/winterhof-vorschau/` (niemals `npm …` als Anleitung nennen!).
- **Vorbilder prüfen (visuell + Code):** Wie machen es Hay Day, Clash of Clans und andere Top-Mobile-Spiele (z. B. Township, Stardew Valley, Animal Crossing)? Beobachtung in `docs/VORBILD_ANALYSE.md`. Technik nur nach offizieller Doku der aktuellen Version (PixiJS 8, Playwright, Vitest, MDN).
- **Extrem kritisch SELBST prüfen & AAA-Benchmark-System (Entscheidungen 64 & 75):** Messlatte extrem hoch setzen, nie wohlwollend abnicken. Vor jeder Abnahme **selbst** Desktop-, Handy-Quer- und Nahaufnahmen (auch ohne Hilfsraster) sowie Live-Vorschau ansehen, Abläufe Bild für Bild prüfen, jeden sichtbaren Fehler sofort selbst beheben und gegen `docs/QUALITAETS_LEITFADEN.md` §5a gnadenlos bewerten. Besteht der Baustein alle 4 Säulen ≥ 9/10 bei 0 K.O.-Kriterien und grünem `npm run check`, nimmst du ihn selbst ab, erneuerst die Vergleichsbilder, committest auf `test` und machst direkt weiter.
- **Widersprechen:** Schlägt Hannes eine Abkürzung vor, nennst du klar den besseren Weg. Eine Ausnahme gibt es nur nach seiner ausdrücklichen Entscheidung, eingetragen in `LEITUNG_CLAUDE.md`.

### In Antigravity
- Arbeite im **Planning-Modus**: vor jedem Baustein einen Umsetzungsplan als Artefakt (Ziel in 1 Satz, beste Lösung + verworfene Alternative, betroffene Dateien, Tests, Prüfbild).
- Prüfbilder machst du mit dem Browser des Agenten oder per Playwright (`npm run dev`, Port 8085) und legst sie unter `docs/qa/neustart/bXX_*.jpg` ab.
- Die Skills „caveman“ und „token-optimization“ hier **nicht** verwenden: Doku, Commit-Texte und Antworten an Hannes sind ganze, klare deutsche Sätze.

## 4. Mit Hannes reden
- Deutsch, Du, kurz und klar. Ergebnis zuerst, dann höchstens 3–5 Stichpunkte. Keine Fachwörter ohne Not, keine langen Erklärungen.
- Bei echten offenen Grundsatzentscheidungen nutzt du die **interaktiven Auswahlfragen (`ask_question`)** mit deiner Empfehlung an erster Stelle; bei Ergebnismeldungen immer mit klickbarem Link `https://bauerjohannes2-max.github.io/winterhof-vorschau/`.
- Bei jeder Abschluss-/Übergabemeldung sagst du kurz, was als Nächstes kommt (2–3 Bausteine).
- Bevor du etwas startest, das eine Windows-Sicherheitsmeldung auslösen kann (neues Programm, Installation, Firewall, Admin-Rechte), kündigst du es Hannes vorher an: was genau und warum.

## 5. Technik in Kürze
- `src/content/winterhof.json`: **einzige Datenquelle** (Waren, Tiere, Gebäude, Karte, Größen `sizes`, Bilder `art.sprites` mit `size`, `anchorY`, `shadow`).
- `src/core/`: Logik-Kern ohne DOM und Pixi. Jede Aktion ist ein Befehl (`commands.ts`), Zeit und Zufall werden hereingereicht (kein `Math.random`/`Date.now` im Kern). Spielstand v10 mit Migration (`save.ts`, `migrate.ts`), nie Fortschritt verlieren.
- `src/render/`: Darstellung, liest nur den Kern und schickt nur Befehle. ESLint erzwingt diese Grenze. Einzige Umrechnung Raster ↔ Welt: `scene/iso.ts` (1 Kachel = 128 × 64 Weltpunkte). Ebenen fest: grund, bodenzeichnung, kontaktschatten, objekte, effekte, auswahl (`scene/layers.ts`). Boden und Wege im Shader `scene/ground.ts` (Shader-Regeln GRAFIK_TECHNIK §7, Übersetzung ≤ 1 s). Objekte + Schatten: `scene/objects.ts`.
- Bilder: Quellen in `art_src/` (PNG, versioniert), AssetPack baut Atlanten nach `assets/gen/`. Schattenbilder backt `scripts/schatten_backen.mjs` vor jedem Bündeln (nicht versioniert). Code lädt Bilder nur über das Manifest.
- Größen und Bilder prüft `python scripts/pruefe_assets.py`.
- Verboten: Sonderwege, Schalter für Varianten (`?probe`), „vorläufige“ Lösungen im Code. Varianten zum Vergleich nur als Bild in `docs/qa/neustart/`.

## 6. Befehle (Windows, PowerShell, Ordner = dieses Projekt)
- Gesamtprüfung: `npm run check` (Typprüfung, Lint, Kern-Tests, Build, Browser-Bildvergleich; dauert rund 4 Min.). Während der Arbeit nur die betroffenen Teile: `npm test`, `npm run typecheck`, `npm run lint`, einzelne Browser-Tests mit `node ./node_modules/@playwright/test/cli.js test tests/browser/<datei>`.
- Spiel lokal: `npm run dev` → http://127.0.0.1:8085
- Handy-Vorschau für Hannes: `npm run vorschau` (lädt eine Testfassung in das eigene Vorschau-Repo, Entscheidung 23).
- Werkzeuge nur über `npm run …` oder `node ./node_modules/…` starten. Playwright nutzt den installierten Chrome, keine Browser herunterladen.
- **Vergleichsbilder erst nach bestandener AAA-Selbst-Abnahme (Entsch. 75) erneuern** (`node ./node_modules/@playwright/test/cli.js test --update-snapshots`). Nie einen Test abschwächen oder ein Vergleichsbild erneuern, nur damit es grün wird.
- Messhilfen `scripts/_*.mjs` (z. B. `_shaderzeit.mjs`, `_startzeit.mjs`) sind nur für dich und werden nicht committet.

## 7. Git und Veröffentlichen
- Gearbeitet wird im Zweig `test`. Ein Push auf `main` baut automatisch die Live-Seite (`.github/workflows/deploy-pages.yml`).
- Committen nur bei grüner Gesamtprüfung, je Baustein ein eigener kleiner Commit, Text auf Deutsch im Stil der bisherigen Commits („Test: …“, Entscheidungsnummer nennen).
- Push auf `main` nur, wenn alles grün ist **und** Hannes es für genau diesen Stand freigegeben hat.
- Git hat auf diesem PC keine eigene Identität: `git -c user.name="<Name wie in git log>" -c user.email="<E-Mail wie in git log>" commit …`. `gh` ist nicht installiert.
- Der Ordner liegt lokal unter `C:\Projekte\winterhof\` (aus OneDrive umgezogen, Entscheidung 77). Alter Rest `.git/worktrees/wt_main` per `git worktree prune` bereinigen.

## 8. Wer arbeitet gerade
Nie gleichzeitig mit Claude im Repo arbeiten. Wer arbeitet, steht in `docs/LEITUNG_CLAUDE.md` unter „Wer arbeitet gerade“. Pflege die Zeile, wenn du anfängst und wenn du aufhörst.

## 9. Lernschleife (was wohin gehört)
- Neue Entscheidung von Hannes → nummeriert in `docs/LEITUNG_CLAUDE.md` (nächste Nummer fortlaufend, Datum, Hannes' Wortlaut kurz, verworfene Varianten).
- Neue Qualitätsregel → `docs/QUALITAETS_LEITFADEN.md`. Neue oberste Regel → `CLAUDE.md`.
- Stand eines Bausteins → `docs/NEUSTART_PLAN.md`. Technik-Regel → `docs/GRAFIK_TECHNIK.md`.
- Jede Korrektur von Hannes gilt automatisch dauerhaft, auch für Verwandtes. Er muss nie „ab jetzt immer“ sagen.
- **Tokenarm arbeiten – regelmäßig neue Sitzung vorschlagen (Entscheidung 67):** Nach jedem größeren Abschnitt (spätestens alle 1–2 abgeschlossenen Bausteine oder wenn die Sitzung spürbar lang wird) schlägst du Hannes **von selbst** eine neue Sitzung vor, speicherst den Stand nach `_Eingang/Start-Prompt_winterhof-<thema>.md` im OneDrive-Hauptordner und gibst den fertigen Übergabe-Prompt **immer direkt als Codeblock im Chat** zum Ein-Klick-Kopieren. Vor einer Übergabe keine neuen offenen Fragen mehr anhängen – offene Punkte gehören in den Start-Prompt.
