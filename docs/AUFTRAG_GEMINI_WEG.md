# Auftrag an Gemini: Erdweg und Wegrand gemalt (Claude, 26.11.2026)

## Ziel
Der Erdweg (Baustein 6) sieht noch nicht gemalt aus. Hannes (26.11.): „viel zu fein und nicht natürlich“. Der Rand aus Grasbüscheln ist zu klein und zu regelmäßig, die Erde wirkt wie eine glatte Fläche mit Kratzern.
Erfolg = ein Erdweg mit Grasrand, der neben einem Hay-Day-Hof genauso **handgemalt, weich und natürlich** wirkt. Eigener Look, nichts abmalen.

## Vorher
- `docs/qa/neustart/b06_r5_nah.jpg` (heutiger Stand, nah).
- Wiese, die bleibt (Hannes: „super“): `art_src/spiel{m}/boden/wiese.png` – Farbe und Pinselstrich des Wegrands müssen dazu passen.

## Vorbild-Wirkung (nicht abmalen)
- Erde warm orange-braun (etwa RGB 200/110/48), große weiche Hell-Dunkel-Flecken, lange flache Fahrrillen längs des Wegs (dunkle Rille, helle Lippe), einzelne kleine Steinchen.
- Rand: kräftige, **gut sichtbare** Grasbüschel (deutlich größer als heute, etwa ein Viertel Kachel breit), runde Fächer aus 8–12 breiten, weichen Halmen, oben links heller. Büschel stehen dicht an dicht, überlappen sich, ragen leicht auf die Erde. Dahinter ein heller Grasstreifen.

## Lieferung (nach `art_src/probe_raw/gemini_weg/` (Rohmaterial, wird nicht ins Spiel gepackt), PNG)
Jede Datei in **3 Varianten** `_a` (zurückhaltend), `_b`, `_c` (mutig). Sei mutig in Pinselstrich und Form, aber ruhig genug für einen Boden.

| Nr | Datei | Inhalt | Format |
|---|---|---|---|
| 1 | `zielbild_a..c` | **Zielbild zuerst:** Ausschnitt Wiese mit einem 2 Kacheln breiten Erdweg, der eine S-Kurve macht und sich zu einem kleinen Platz weitet, isometrisch 2:1 wie `b06_r5_nah.jpg`. Zeigt, wie das Ganze aussehen soll. Hannes wählt daraus. | 1600 × 900, ohne Alpha |
| 2 | `erde_a..c` | Nahtlos kachelbare Erd-Textur in Spielansicht (flach, keine Perspektive), große weiche Flecken, keine harten Muster, keine Rillen (Rillen setzt der Code entlang des Wegs). | 1024 × 1024, nahtlos |
| 3 | `rillen_a..c` | Rillen-Streifen: 3–4 lange flache Fahrrillen waagerecht, links/rechts nahtlos, auf transparentem Grund. | 1024 × 256, Alpha |
| 4 | `bueschel_a..c` | Blatt mit **8 einzelnen Wegrand-Büscheln** nebeneinander (je 128 × 128 Feld, Fuß unten mittig), freigestellt, Licht oben links. Farbe passend zu `wiese.png`, etwas heller. | 1024 × 128, Alpha |
| 5 | `randstreifen_a..c` | Grasrand als Band: unten Erde-transparent, oben Wiese, dazwischen dichte überlappende Büschel; links/rechts nahtlos. | 1024 × 256, Alpha |

## Maße und Technik
- Isometrisch 2:1, Licht von oben links. **1 Kachel = 128 Weltpunkte**; ein Büschel ist etwa 30–45 Weltpunkte breit.
- Kein Text, kein Wasserzeichen, kein Farbsaum an freigestellten Kanten. Eigene Grafik.

## Runde 2 (Hannes 26.11. zu den Zielbildern)
Hannes: Malstil von **C (mutig) „ultra nice“**, B auch schön; aber **Grasfarbe von uns besser** (`wiese.png`), und der Büschel-Ring um den Weg ist **viel zu groß** – ziel war nur, das Pixelige wegzubringen.
Claude-Einschätzung: Wie bei Hay Day bleibt die Wiese ruhig (Gebäude, Felder, Tiere müssen darauf lesbar sein); Büschel sind Deko, vereinzelt. Der Malstil soll in Wiese und Erde stecken, nicht in einem Büschelwall.
Lieferung `zielbild2_a..c.png` (1600 × 900, gleiche Wegform wie Runde 1, Pinselstil wie `zielbild_c`, Grasfarbe wie `wiese.png`):
- **a – ruhig:** Wiese glatt gemalt mit weichen großen Hell-Dunkel-Wolken, kaum Halme. Wegrand **schmal**: Gras ragt nur in kleinen weichen Zacken über die Erde. **Vereinzelt** 1 Büschel im C-Stil je ~3 Kacheln Wegrand, 3–5 Büschel locker auf der Wiese.
- **b – gemalte Wiese (Empfehlung):** wie a, aber die Wiese selbst trägt den C-Pinselstrich: viele weiche flache Halmstriche, wenig Kontrast, keine Büschel-Hügel. Wegrand schmal, Büschel vereinzelt.
- **c – Büschelwiese:** Wiese überall dicht mit C-Büscheln (zum Vergleich, wie unruhig das wirkt).

## Runde 3 – Bausteine für 2b (Hannes 26.11.: „2b super“, erst ohne Büschel, Entsch. 56)
Zielbild: `docs/qa/neustart/b06_ziel_2b.jpg`. Breite Fließ-Streifen längs des Wegs, dunkle Kante innen, Vertiefung und schmaler Grasrand macht der Shader; Gemini liefert nur, was sich nicht gut rechnen lässt:
| Nr | Datei | Inhalt | Format |
|---|---|---|---|
| 6 | `erde_2b_a..c` | Nahtlos kachelbare Erd-Textur im Pinselstil von 2b, **ohne Richtung** (keine Rillen, keine Streifen, keine Steine, keine Schatten), mittlerer Ton etwa RGB 200/111/50, weiche Pinselflecken, wenig Kontrast. Draufsicht, kein Licht. | 1024 × 1024, nahtlos (links/rechts, oben/unten) |
| 7 | `steine_2b_a..c` | Blatt mit **8 einzelnen Steinchen** wie in 2b (flach, rundlich, grau-beige, Licht oben links, kleiner Schatten unten rechts), je 128 × 128 Feld, Stein mittig, freigestellt. | 1024 × 128, Alpha |

## Regeln
- STIL_REGELN.md gilt (§5 Kamera/Licht, §6 Bildqualität, §6a Mut).
- **Nur Bilder liefern, keinen Code ändern.** Einbau (Shader `src/render/scene/ground.ts`) macht Claude.
- Erst Nr. 1 liefern; Nr. 2–5 erst, wenn Hannes ein Zielbild gewählt hat (spart Bildlimit).
