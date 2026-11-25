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

## Lieferung (nach `art_src/spiel{m}/boden/gemini/`, PNG)
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

## Regeln
- STIL_REGELN.md gilt (§5 Kamera/Licht, §6 Bildqualität, §6a Mut).
- **Nur Bilder liefern, keinen Code ändern.** Einbau (Shader `src/render/scene/ground.ts`) macht Claude.
- Erst Nr. 1 liefern; Nr. 2–5 erst, wenn Hannes ein Zielbild gewählt hat (spart Bildlimit).
