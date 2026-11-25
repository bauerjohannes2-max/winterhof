# Auftrag an Gemini: Wald, Felswand mit Wasserfall, Tiere für die Karte (Claude, 25.11.2026)

## Ziel
Die Karte (Spielfeld + Rand, Baustein 5) wirkt außen eintönig: überall dieselben Tannengruppen. Hannes will den Wald **mutiger und reicher an Details**, und **oben** (hinterer Kartenrand) ein Wahrzeichen: eine verschneite **Felswand mit Wasserfall**, aus dem der Bach kommt.
Erfolg = Bildschirm „ganz raus“ wirkt neben einem Hay-Day-Hof lebendig und abwechslungsreich, jede Ecke sieht anders aus.

## Vorher
- `docs/qa/neustart/karte_r9_weit.jpg` (ganz raus) und `karte_r9_teich.jpg` (nah). Der Bach kommt oben aus dem Wald und fließt unten aus dem Bild. **Neu (Entscheidung 34):** Bach und Teich sind getrennt, der Bach läuft mit Abstand hinter dem Teich vorbei. Das Bild zeigt noch die alte Mündung.
- Heutige Waldbilder (Handschrift beibehalten!): `assets/sprites/probe/wild_cluster_1..6.webp`.

## Vorbild-Wirkung (nicht abmalen)
- Hay Day: Hof oben von **Felsklippen** begrenzt, Wald aus verschiedenen Baumarten und Büschen, Tiere am Rand, nichts wiederholt sich sichtbar.
- Bach in Hay-Day-Blau: helle Mitte, dunklere Ränder, braunes Erdufer, Strömungslinien. Unser Bach im Bild hat genau diese Farben.

## Lieferung (alles nach `assets/sprites/karte/`, WebP, freigestellt)
Jedes Objekt in **3 Varianten** `_a` (zurückhaltend), `_b`, `_c` (wild). Sei mutig und verspielt in Form und Idee: übertreibe das Star-Merkmal, mach die Silhouette einzigartig. Liefere 3 Varianten von zurückhaltend bis wild.

| Nr | Datei | Inhalt | Grundfläche | Höhe (Kacheln) |
|---|---|---|---|---|
| 1 | `fels_wasserfall_a..c` | **Wahrzeichen.** Verschneite Felswand, in der Mitte ein halb gefrorener Wasserfall (Eiszapfen-Vorhang außen, blauer Strahl in der Mitte, Gischt), unten ein kleines Becken, aus dem der Bach **nach vorn rechts** (Bildschirm unten rechts) abfließt. Star-Merkmal: Eiszapfen-Vorhang. Akzent: Türkis-Blau. Geschichte: Wasseramsel auf einem Stein, Eiszapfen glitzern. | 5 × 3 | 3,0–4,0 |
| 2 | `fels_wand_1..3_a..c` | Felswand-Stücke **ohne** Wasserfall zum Aneinanderreihen links und rechts vom Wasserfall (Kanten links/rechts passen aneinander), Schnee auf Absätzen, einzelne Tannen oben drauf. | 3 × 2 | 2,2–3,2 |
| 3 | `birken_a..c` | Birkengruppe (2–3 Stämme), weiße Rinde mit schwarzen Flecken, Raureif, wenige goldene Restblätter. | 2 × 2 | 1,8–2,6 |
| 4 | `laubbaum_kahl_a..c` | Kahler Laubbaum mit Raureif, knorrig, Vogelnest oder Kobel als Geschichtsdetail. | 2 × 2 | 2,0–2,8 |
| 5 | `kiefer_a..c` | Kiefer mit Schirmkrone und rotbrauner Rinde, Schnee auf der Krone (Gegensatz zur spitzen Tanne). | 2 × 2 | 2,0–2,8 |
| 6 | `fels_gross_a..c` | Großer Felsbrocken mit Moos und dicker Schneehaube, Eiszapfen an einer Kante. | 2 × 2 | 1,0–1,6 |
| 7 | `stamm_liegend_a..c` | Umgestürzter Baumstamm mit Schneekappe, Pilzen, Astloch (Geschichte: Spuren eines Tiers). | 2 × 1 | 0,5–0,8 |
| 8 | `reh_a..c` | Reh, stehend, aufmerksam (Kopf hoch). Später animiert: Körper und Kopf als getrennte Ebenen mitliefern, wenn möglich. | 1 × 1 | 0,6–0,75 |
| 9 | `fuchs_a..c` | Fuchs, sitzend, buschiger Schwanz um die Pfoten, kräftiges Orange als Farbklecks im Schnee. | 1 × 1 | 0,35–0,45 |
| 10 | `hase_a..c` | Schneehase, sitzend, Ohren hoch. | 1 × 1 | 0,25–0,3 |
| 11 | `voegel_a..c` | 2–3 Gimpel/Rotkehlchen auf einem verschneiten Ast oder Zaunpfahl (roter Akzent). | 1 × 1 | 0,4–0,6 |

Bäume und Felsen (3–7) stehen wie die bisherigen Waldbilder auf einer **kleinen Schneeinsel** als Sockel. Tiere (8–11) **ohne** Sockel und ohne Schatten (Schatten macht der Code).

## Maße und Technik
- Isometrisch 2:1, Licht von oben links, Schatten nach unten rechts, gleicher Blickwinkel wie `wild_cluster_*`.
- **1 Kachel = 128 Weltpunkte** (Code `src/render/scene/iso.ts`; ältere Angaben 116 sind überholt). Mindestens 1,6 Bildpunkte je Weltpunkt, also Kachelbreite im Bild mindestens 205 px.
- Bodenpunkt = Mitte der Grundfläche, unten höchstens 4 % leer, nie verzerren.
- Schnee warm-weiß wie in `wild_cluster_*` (nicht blau-weiß).
- Kein Text, kein Wasserzeichen, kein Rand oder Farbsaum. Eigene Grafik, nichts aus anderen Spielen abmalen.

## Regeln
- STIL_REGELN.md gilt vollständig (§5 Kamera/Licht, §6 Bildqualität, §6a Mut).
- **Nur Bilder liefern, keinen Code ändern.** Einbau macht Claude.
- Weihnachtlich-gemütlich, tierfreundlich, nie düster.

## Abschluss
1. Zusätzlich `assets/sprites/karte/_bogen.png`: alle Varianten nebeneinander, nummeriert (z. B. „1a, 1b, 1c …“), auf neutralem Grau.
2. In `docs/LEITUNG_CLAUDE.md` unter „Wer arbeitet gerade“ eintragen: „Gemini fertig mit Wald-Auftrag, Datum“.
3. Dann an Claude übergeben: Claude zeigt Hannes den Bogen, Hannes wählt, Claude baut ein und vergleicht mit Hay Day.
