# Auftrag an Gemini: Grafik-Probeausschnitt „Hofkern“ (Claude, 23.11.2026)

## Ziel
Prüfen, ob Winterhof in Hay-Day-Qualität aussehen kann. Nur ein kleiner Ausschnitt, aber fertig: Boden, Weg, Wildnis, 1 Feld mit Weizen, Huhn + Hühnerstall, Leiste oben/unten.
Erfolg = ein Bildschirm, der neben einem Hay-Day-Screenshot nicht billig wirkt.

## Was heute schlecht aussieht (Vorher: `docs/qa/probe/vorher.jpg`)
1. Boden: fast reines Weiß, sichtbare Rasterlinien, keine Struktur → wirkt leer und unfertig.
2. Wildnis: immer dieselbe Tanne und derselbe Stein, gleichmäßig verstreut → wirkt wie Rauschen.
3. Weg: verwaschener Streifen ohne Kante.
4. Gebäude/Tiere sind gemalt-3D, der Boden flach → zwei verschiedene Spiele.
5. Leiste oben/unten: Symbole ok, Leisten selbst zu dünn und blass.

## Hay-Day-Maßstab (so muss es wirken)
- Boden lebt: weiche Farbflecken, kleine Grasbüschel/Blumen, nie einfarbig, nie Raster sichtbar. Bei uns: Schnee leicht bläulich mit warmen Lichtflecken, Grasspitzen und Steinchen schauen durch, zarte Fußspuren.
- Gesperrtes Land: dichte, buschige Wildnis aus GRUPPEN (Baumgruppen, Steinhaufen, Stümpfe, Büsche), deutlich dunkler/satter als der Hof, mit klarer weicher Kante.
- Weg: Erde/Matschschnee mit weicher, unregelmäßiger Kante, leicht erhaben, Steinchen am Rand.
- Felder: satte braune Erde mit Furchen, dicke Kante, Pflanzen prall und glänzend.
- Alles mit weichem Kontaktschatten, Licht oben links, satte Farben, dicke ruhige Formen.
- Stil-Referenz Handschrift: `docs/lookdev_target_day_style_c.jpg` (Licht, Materialien, Schnee auf Dächern). Kein Wasser, keine Brücke, keine Zäune um den Hof.

## Lieferung (alles nach `assets/sprites/probe/`, WebP, freigestellt wo nötig)
| Nr | Datei | Inhalt | Größe |
|---|---|---|---|
| 1 | `ground_snow.webp` | Hof-Schneeboden, **nahtlos kachelbar**, isometrisch neutral (Draufsicht-Textur), keine wiederkehrenden Auffälligkeiten | 1024×1024 |
| 2 | `ground_wild.webp` | Wildnis-Boden, nahtlos, dunkler, mehr Grasbüschel/Moos unter Schnee | 1024×1024 |
| 3 | `path_dirt.webp` | Weg-Textur nahtlos (Erde + Matschschnee + Steinchen) | 512×512 |
| 4 | `wild_cluster_1..6.webp` | 6 Wildnis-Gruppen je 2×2 Kacheln: 3 Tannengruppen (verschieden hoch, verschneit), 1 Steinhaufen mit Busch, 1 Stumpf + Holzstapel + Busch, 1 gemischte | Höhe 1,6–2,6 Kacheln |
| 5 | `field_soil.webp` | Feld 1×1, Erde mit Furchen, dicke Kante, Schneerand außen | Kachelbreite |
| 6 | `crop_wheat_1..3.webp` | Weizen Keim / halb / reif (goldglänzend, prall) für 1×1 | 0,4–0,8 Kacheln |
| 7 | `coop.webp` | Hühnerstall 2×2 mit Strohplatte, Star-Merkmal + Akzentfarbe nach STIL_REGELN §6a, 3 Varianten zurückhaltend → wild | 1,5–2,0 Kacheln |
| 8 | `chicken_idle.webp` + `chicken_peck.webp` | Huhn, 2 Posen (Huhn < Schaf < Rentier, ≤ 0,7 × Person) | 0,25–0,4 Kacheln |
| 9 | `hud_bar_top.webp`, `hud_pill.webp` | Leiste oben: Holz/Schnee-Plakette für Stern+Stufe, Pille für Münzen (dicke Kontur, Glanz, Weihnachtsdetail) | 9-Slice-fähig |
| 10 | `hud_btn_bg.webp` | Hintergrund-Plakette für die Knöpfe unten (Laden, Scheune, Aufträge, Post) | 9-Slice-fähig |

Maße: 1 Kachel = 116 Weltpunkte, mindestens 1,6 Bildpunkte je Weltpunkt (Kachelbreite ≈ 190 px). Unten max. 4 % leer. Nie verzerren.

## Regeln
- STIL_REGELN.md gilt vollständig (Kamera isometrisch 2:1, Licht oben links, kein Text, keine Wasserzeichen).
- Eigene Grafik, nichts von Hay Day abmalen; nur Qualität und Wirkung als Maßstab.
- Weihnachtlich, tierfreundlich.
- **Nur Bilder liefern, keinen Code ändern.** Einbau macht Claude.
- Sei mutig und verspielt in Form und Idee: übertreibe das Star-Merkmal, mach die Silhouette einzigartig.

## Abschluss
1. Zusätzlich ein Mockup-Bild `assets/sprites/probe/_mockup.png` (1600×900): wie der Hofkern-Ausschnitt mit diesen Teilen zusammen aussehen soll.
2. In `docs/LEITUNG_CLAUDE.md` unter „Wer arbeitet gerade“ eintragen: „Gemini fertig mit Probeausschnitt, Datum“.
3. Dann Claude übergeben: Einbau, Vorher/Nachher-Bild neben Hay-Day-Vorlage, Hannes entscheidet.
