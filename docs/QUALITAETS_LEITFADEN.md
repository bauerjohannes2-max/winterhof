# Winterhof – Qualitäts-Leitfaden (verbindlich, Hannes 24.11.2026)

Gilt für jede Sitzung, jeden Helfer und jede Zeile Code, jedes Bild und jeden Text. Er steht über Tempo, Bequemlichkeit und Gewohnheit.

## 1. Grundregel (Entscheidung 13)
**Winterhof wird das bestmögliche Spiel, mindestens auf dem Niveau von Hay Day und Clash of Clans, wo möglich besser.**
- Keine Abkürzungen, keine Umwege, keine Pflaster. Qualität vor Tempo, immer.
- **Das gilt auch gegen Hannes' eigene Bitte.** Will Hannes etwas schneller oder einfacher, als es richtig ist, widerspricht Claude klar: Was kostet die Abkürzung, was ist der beste Weg? Claude schlägt immer den besten Weg vor. Nur wenn Hannes danach ausdrücklich trotzdem anders entscheidet, wird das als bewusste Ausnahme mit Grund in `LEITUNG_CLAUDE.md` eingetragen.
- „Besser als die Vorbilder“ heißt für uns: gleiche Sorgfalt bei Bedienung, Grafik und Spielgefühl, dazu eigene Stärken: gemütliche Weihnachtswelt, tierfreundlich, fair ohne Druck.

## 2. Vor jedem Schritt: kritisch prüfen
Bevor ein Baustein oder eine wichtige Entscheidung beginnt, beantwortet Claude schriftlich (kurz, im Baustein-Commit oder in der Doku):
1. **Ist das wirklich der beste Weg, oder nur der naheliegende?** Mindestens eine Alternative nennen und begründen, warum sie schlechter ist.
2. **Wie machen es Hay Day und Clash of Clans?** Im Browser ansehen (Wikis, Videos), Beobachtung in `VORBILD_ANALYSE.md`. Nichts kopieren.
3. **Was sagen seriöse Quellen?** Siehe §4. Bei Technik immer die offizielle Doku der aktuellen Version.
4. **Ursache statt Symptom:** Ist das Fundament richtig? Wenn nicht, zuerst das Fundament reparieren, nie drumherum bauen.
5. **Stimmt das Konzept, nicht nur die Technik?** Würde Hay Day/Clash es überhaupt so machen? (Lehre aus Baustein 2: technisch sauber, aber die Straße quer durch die Karte war konzeptionell falsch.)
6. **Hannes fragen:** Jede Konzept- und Gestaltungsfrage als interaktive Auswahlfrage mit Empfehlung, gern mehrere Runden. Lieber eine Frage zu viel als eine Annahme.
7. **Was kann schiefgehen?** Auf welchen Handys, bei welchem Spielstand, offline, nach einem Update?

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

## 6. Verboten
- Sonderwege, Schalter für Varianten oder „vorläufige“ Lösungen im Code.
- Bauen auf einem Fundament, das als falsch erkannt ist.
- Mehrere Baustellen gleichzeitig.
- Fertig melden ohne Bild und ohne grüne Prüfung.
- Etwas von Hay Day oder Clash kopieren (Bilder, Namen, Figuren). Die Technik übernehmen ist erlaubt.

## 7. Spieltests
- Hannes testet jede Abnahme am eigenen Handy (quer).
- Ab spielbarer Fassung: kurze Testrunden mit Spielern, die das Spiel nicht kennen. Wo sie hängen bleiben, ist ein Fehler im Spiel, nicht beim Spieler.
