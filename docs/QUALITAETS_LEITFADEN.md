# Winterhof – Qualitäts-Leitfaden (verbindlich, Hannes 24.11.2026)

Gilt für jede Sitzung, jeden Helfer und jede Zeile Code, jedes Bild und jeden Text. Er steht über Tempo, Bequemlichkeit und Gewohnheit.

## 1. Grundregel (Entscheidung 13, verschärft Entscheidung 64)
**Winterhof wird ein einzigartiges AAA-Mobile-Game, mindestens auf dem Niveau von Hay Day, Clash of Clans und den erfolgreichsten Spielen des Genres – visuell UND codetechnisch, wo möglich besser.**
- Keine Abkürzungen, keine Umwege, keine Pflaster, kein „passt schon“. Qualität vor Tempo, immer.
- **Extrem kritische Selbstprüfung Pflicht (Entscheidung 64):** Jedes Ergebnis wird **selbst** mit extrem hoher Messlatte gegen Top-Spiele (visuell + Code + Spielgefühl) geprüft – inklusive Nahaufnahmen ohne Raster, Handy-Querformat und Live-Vorschau. Niemals „schau du mal“ abladen: selbst erkennbare Mängel (z. B. schwebende Objekte, falsche Schatten, fehlende Verankerung) werden sofort selbst gefunden und behoben, bevor Hannes etwas zur Abnahme bekommt.
- **Das gilt auch gegen Hannes' eigene Bitte.** Will Hannes etwas schneller oder einfacher, als es richtig ist, widerspricht der Agent klar: Was kostet die Abkürzung, was ist der beste Weg? Es wird immer der beste Weg vorgeschlagen. Nur wenn Hannes danach ausdrücklich trotzdem anders entscheidet, wird das als bewusste Ausnahme mit Grund in `LEITUNG_CLAUDE.md` eingetragen.
- **Einzigartige Winterhof-Identität (4 Säulen, Hannes 27.11., Entscheidung 64):**
  1. Magische, lebendige Weihnachtswelt voller kleiner Geschichten und liebevoller Details (Maßstab: Hay Day + Animal Crossing).
  2. Extrem knackiges Spielgefühl und „Juice“ (jedes Tippen, Ernten und Bauen fühlt sich rund und befriedigend an).
  3. Kluge, tiefe Hof-Wirtschaft und spürbarer Fortschritt über alle Stufen (Maßstab: Clash + Hay Day).
  4. Aufgeräumte, moderne Oberfläche – null überladen, sofort intuitiv am Handy quer.

## 1a. Grundlage vor Austauschbarem (Hannes 25.11., Entscheidung 39)
Vor jeder Arbeit fragen: **Kann man das später ohne Umbau tauschen?**
- **Ja (austauschbar):** Rand-Kulisse, Deko, Tiere, Lichtungen, Animationen, Einzelbilder. → Jetzt nur Konzept/Lageplan per Skizze festhalten, Platzhalter einbauen, Feinschliff in der Grafik-Runde am Schluss. Nicht darin stecken bleiben.
- **Nein (Grundlage):** Boden des Spielfelds, Spielfeldform und -grenze, Kachelmaß, Größen/Maßstab, Datenmodell, Logik-Kern. → Jetzt gründlich und in voller Qualität, wie §1 verlangt.
- Das ist keine Abkürzung im Sinne von §1: Austauschbares wird nicht schlechter, nur später gemacht. Grundlagen bekommen nie Pflaster.
- Bei jeder Runde sagen, ob es Grundlage oder austauschbar ist; austauschbare Runden höchstens eine Skizzen-Wahl, dann weiter.
- **Spielfortschritt vor Zier-Details (Hannes 28.11., Entscheidung 74):** Alles, was kein tragendes Spielfundament ist und später ohne Umbau ergänzt oder angepasst werden kann (z. B. herumlaufende Dorfbewohner), wird bewusst auf später verschoben, damit das spielbare Spiel zügig vorankommt.

## 2. Vor jedem Schritt: kritisch prüfen
Bevor ein Baustein oder eine wichtige Entscheidung beginnt, beantwortet Claude schriftlich (kurz, im Baustein-Commit oder in der Doku):
1. **Ist das wirklich der beste Weg, oder nur der naheliegende?** Mindestens eine Alternative nennen und begründen, warum sie schlechter ist.
2. **Wie machen es Hay Day und Clash of Clans?** Im Browser ansehen (Wikis, Videos), Beobachtung in `VORBILD_ANALYSE.md`. Nichts kopieren.
3. **Was sagen seriöse Quellen?** Siehe §4. Bei Technik immer die offizielle Doku der aktuellen Version.
4. **Ursache statt Symptom:** Ist das Fundament richtig? Wenn nicht, zuerst das Fundament reparieren, nie drumherum bauen.
5. **Stimmt das Konzept, nicht nur die Technik?** Würde Hay Day/Clash es überhaupt so machen? (Lehre aus Baustein 2: technisch sauber, aber die Straße quer durch die Karte war konzeptionell falsch.)
6. **Hannes fragen:** Jede Konzept- und Gestaltungsfrage als interaktive Auswahlfrage mit Empfehlung, gern mehrere Runden. Lieber eine Frage zu viel als eine Annahme.
7. **Was kann schiefgehen?** Auf welchen Handys, bei welchem Spielstand, offline, nach einem Update?

6. **Plausibilität (Hannes 24.11.):** Passt das Ergebnis zum Rest (Größen, Licht, Maßstab, Technik-Grundlage)? Widersprüche zwischen Doku, Code und Bildern sofort melden und beheben, nicht übergehen.
7. **Überblick (Hannes 24.11.):** Bei jeder Abnahme kurz sagen, was als Nächstes ansteht (2–3 Bausteine).

## 3. Nach jedem Schritt: ehrlich prüfen
- Alle Prüfungen grün (`npm run check`). **Nie einen Test abschwächen oder ein Vergleichsbild erneuern, nur damit es grün wird.** Vergleichsbilder werden nur nach Hannes' Abnahme erneuert.
- **Kritiker-Durchgang:** Claude sieht sich das Ergebnis selbst an (Bild, nicht nur Code) und legt es neben Hay Day/Clash. In der Abnahme an Hannes steht ehrlich, was noch nicht auf Vorbild-Niveau ist.
- **Abläufe in Bewegung prüfen, nicht nur Standbilder** (Hannes 24.11.: „hättest du selbst sehen müssen“): Laden, Übergänge, Ein-/Ausblenden immer bei langsamem Netz aufnehmen und **Bild für Bild** ansehen, bevor es an Hannes geht. Fehlerbilder: etwas ploppt einzeln auf (Text vor Bild), blitzt kurz, springt, Balken steht oder blendet vor 100 % aus. Was ein Profi-Spiel so nie zeigen würde, ist ein Fehler, auch wenn kein Test anschlägt – und bekommt danach einen Test.
- **Lieber verwerfen als mittelmäßig behalten.** So arbeitet auch Supercell: Was die Qualitätslatte nicht schafft, fliegt raus, auch wenn schon viel Arbeit drinsteckt.
- Ein Baustein ist erst fertig, wenn Hannes ihn abgenommen hat. Nie zwei Baustellen gleichzeitig.

## 4. Seriöse Quellen
| Thema | Quelle |
|---|---|
| Grafik-Technik | offizielle PixiJS-v8-Doku (pixijs.com/8.x), MDN Web Docs, W3C/WHATWG |
| Tests | offizielle Doku von Playwright, Vitest, TypeScript, ESLint |
| Bedienung am Handy | Apple Human Interface Guidelines, Google Material Design |
| Spieldesign, Spielgefühl | GDC-Vorträge (GDC Vault), Game Developer (gamedeveloper.com), Supercell-Beiträge, Fachbücher |
| Vorbild-Details | Hay-Day- und Clash-Wikis, Spielvideos (nur ansehen) |

Foren, KI-Blogs und Meinungsartikel nur als Hinweis, nie als alleinige Grundlage. Steht etwas im Widerspruch zur offiziellen Doku, gilt die Doku.

## 5. Messbare Qualitätslatte
| Bereich | Maßstab |
|---|---|
| Leistung | ≥ 55 Bilder/s auf einem Mittelklasse-Handy, Start ≤ 3 s, kein Ruckeln beim Wischen (GRAFIK_TECHNIK §7) |
| Bedienung | Tippziele mindestens 44 pt (Apple) bzw. 48 dp (Google); jede Berührung zeigt sofort eine sichtbare Reaktion; das Wichtigste liegt im Daumenbereich; ohne Anleitung verständlich |
| Spielgefühl | Jede Aktion hat Bild, Bewegung und Ton als Rückmeldung (Ernten, Abholen, Stufe hoch). Passend zum gemütlichen Thema: weich und freundlich, nie hektisch. Effekte unterstützen das Spiel und verdecken keine Schwächen |
| Grafik | STIL_REGELN + GRAFIK_TECHNIK: nichts schwebt, nichts wirkt lose, eine Lichtrichtung, nahtlose Übergänge, scharf auf Retina |
| Technik | Kern ohne Darstellung, jede Regel getestet, Bildvergleich für jede Ansicht, keine Sonderwege |
| Verlässlichkeit | Der Spielstand geht nie verloren (Migration, Sicherungskopie), offline spielbar, keine Konsolenfehler |
| Geräte | iOS Safari, Chrome (Android/Desktop), Samsung Internet, nur Querformat |
| Zugänglichkeit | Farbe ist nie die einzige Information, Text gut lesbar am Handy |

## 5a. AAA-Benchmark-System (Entscheidung 64 – Pflicht-Tor vor jeder Abnahme)
Damit am Ende garantiert ein außergewöhnliches Spiel auf AAA-Mobile-Niveau herauskommt, durchläuft **jeder Baustein** vor der Vorlage an Hannes eine verbindliche 4-Säulen-Benchmark-Prüfung. Bewertet wird gnadenlos auf einer Skala von **1–10** (10 = Spitzen-AAA-Mobile wie Hay Day / Clash of Clans / Township / Animal Crossing):

| Säule | Benchmark-Vorbilder | Was extrem kritisch geprüft wird | AAA-Tor (Pflicht für Abnahme) |
|---|---|---|---|
| **1. Visuell & Atmosphäre** | Hay Day, Clash of Clans, Township, Animal Crossing | Bodenverankerung (nichts schwebt), Licht/Schatten aus einer Richtung, weiche Übergänge ohne Nähte, klare Silhouetten und Lesbarkeit bei Handy-Querformat (844 × 390), ruhiger Hintergrund mit klarem Fokus, eigener unverwechselbarer Winterhof-Charakter | **≥ 9/10** für den aktuellen Baustein (bewusste Platzhalter späterer Bausteine einzeln benannt) |
| **2. Spielgefühl & Bedienung** | Hay Day, Clash of Clans, Apple HIG, Material Design | Sofortige Reaktion (< 16 ms), weiche Physik/Übergänge (Bild für Bild geprüft), Tippziele ≥ 44 pt / 48 dp, Daumen-Ergonomie, klare Rückmeldung (Bild, Bewegung, später Ton), ohne Anleitung selbsterklärend | **≥ 9/10** für jede berührte Interaktion / Bewegung |
| **3. Code & Architektur** | Supercell-Architektur (Kern getrennt, datengetrieben, deterministisch), PixiJS v8 Best Practices | Strenge Kern/Render-Grenze (ESLint), eine Datenquelle (`winterhof.json`), deterministische Befehle ohne Nebeneffekte, keine Workarounds/Duplikate, saubere Modularität, harte Tests inkl. Randfälle & Migration | **≥ 9/10**, 0 Workarounds, `typecheck` + `lint` + alle Tests grün |
| **4. Leistung & Verlässlichkeit** | Mittelklasse-Handy (4× gedrosselt, langsames Netz), WebGL-Budget | Kaltstart **Ziel ≤ 2,0 s** (harte Grenze < 3,0 s), ≥ 55–60 FPS ohne Ruckler, ≤ 60 Draw Calls, Texturspeicher ≤ 96 MB, Shader-Übersetzung ≤ 1 s, 0 Konsolenfehler, Spielstand sicher | **100 % grün** (kein Wert im roten Bereich, keine Ausreißer) |

### K.O.-Kriterien (sofortiges Zurückweisen vor Abnahme)
Ein Baustein darf Hannes **nicht** zur Abnahme vorgelegt werden, wenn auch nur **eines** zutrifft:
- Ein Objekt schwebt, zeigt harte Kanten/Nähte oder verletzt Lichtrichtung/Maßstab.
- Ein Ablauf ruckelt, blitzt auf, springt oder lädt stockend (Bild-für-Bild-Prüfung).
- Code enthält ein Pflaster, einen Sonderweg, doppelte Logik oder bricht die Kern/Render-Grenze.
- Eine Messgröße verletzt das Leistungsbudget (z. B. Kaltstart-Ausreißer > 3 s, FPS-Einbruch, überdimensionierte Atlanten).
- Das Ergebnis wirkt wie ein „guter Prototyp“ statt wie ein fertiger Baustein eines Top-Store-Spiels.

### Autonome Selbst-Abnahme (Entscheidung 75, Hannes 28.11.2026)
Alle technischen, gestalterischen und strukturellen Fragen, die sich aus Regeln, Vorbildern (Hay Day / Clash) und diesem Benchmark-System beantworten lassen, entscheidet und prüft der Agent eigenständig. Sind alle 4 Säulen **≥ 9/10**, **0 K.O.-Kriterien** verletzt, alle Prüfbilder (Desktop, Handy quer, Nahaufnahme, ohne Raster, Bewegung) kritisch selbst angesehen und **`npm run check` 100 % grün**, nimmt der Agent den Baustein **selbst ab**, erneuert die Vergleichsbilder, committet auf `test`, lädt die Handy-Vorschau hoch und macht nahtlos weiter. Rückfragen an Hannes nur bei echten Grundsatz-/Geschmacksentscheidungen und vor einem Live-Push auf `main`.

### Pflicht-Ausgabe bei jeder Abnahme / Übergabe (Entscheidungen 64, 71 & 75)
Jede Vorlage bzw. Abschlussmeldung an Hannes enthält kompakt:
1. **Vorher/Nachher-Bild** (und Nahaufnahme / Ablauf-Prüfung) direkt im Chat sowie den direkt klickbaren Handy-Vorschau-Link `https://bauerjohannes2-max.github.io/winterhof-vorschau/` (`npm run vorschau`).
2. **Konkrete Sicht-Prüfpunkte für Hannes (2–3 einfache Stichpunkte):** Was genau er sich anschauen soll – reine Technik prüft der Agent komplett selbst.
3. **AAA-Benchmark-Urteil** (Punkte je betroffener Säule + automatisch geloggte Messwerte aus `npm run check`: Startzeit, FPS, Draw Calls, Texturspeicher).
4. **Ehrliche Schwächen-Liste:** Was fehlt noch zu 10/10 und in welchem Baustein genau wird es gelöst (nie stillschweigend übergehen).
5. **Interaktive Fragen (`ask_question`)** nur noch, wenn wirklich eine echte Grundsatz- oder Geschmacksentscheidung offen ist.

## 6. Verboten
- Sonderwege, Schalter für Varianten oder „vorläufige“ Lösungen im Code.
- Bauen auf einem Fundament, das als falsch erkannt ist.
- Mehrere Baustellen gleichzeitig.
- Fertig melden ohne Bild und ohne grüne Prüfung.
- Etwas von Hay Day oder Clash kopieren (Bilder, Namen, Figuren). Die Technik übernehmen ist erlaubt.

## 7. Spieltests
- Hannes testet jede Abnahme am eigenen Handy (quer).
- Ab spielbarer Fassung: kurze Testrunden mit Spielern, die das Spiel nicht kennen. Wo sie hängen bleiben, ist ein Fehler im Spiel, nicht beim Spieler.
