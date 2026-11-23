# Winterhof — Supercell-Architektur-Masterplan (Logic-First Rebuild)

Ergebnis der tiefgehenden technischen Recherche zu **Supercells Titan-Engine (Hay Day & Clash of Clans)** sowie **Single-Source-of-Truth Isometric City-Builder Architecture**.

---

## 1. Wie Hay Day & Clash of Clans wirklich aufgebaut sind
1. **Single Source of Truth (`WorldGrid`):** Die gesamte Spielwelt ist ein einziges orthogonales 2D-Raster (bei CoC `44×44`, bei Winterhof `20×20` Kacheln). Die isometrische Darstellung (`2:1 Dimetrie`) ist **nur die Sicht-Projektion** auf dieses Datenmodell — niemals eine zweite Wahrheit.
2. **4 strikt getrennte Kachel-Ebenen pro `(gx, gy)`:**
   - `terrain`: `SNOW` | `WATER` | `CLIFF` | `FOREST`
   - `surface`: `NONE` | `ROAD` | `PLAZA` | `BRIDGE_X` | `BRIDGE_Y` | `PLOT`
   - `zone`: `STARTER` | `WEST_FOREST` | `SOUTH_MEADOW` | `EAST_GLADE` | `NORTH_RIDGE` | `BORDER`
   - `occupant`: `null` oder eindeutige Entity-ID (mit definiertem Footprint `w × h` und Bottom-Center-Anker).
3. **2.5D Pre-Rendered 3D Sprites (Supercell Titan):** Sowohl Hay Day als auch Clash of Clans rendern 3D-Modelle in 2.5D-Sprites/Atlanten — **aber** mit strenger **Footprint-Grundplatte**, einheitlicher **Boden-Ankerzeile**, gerichteten **Top-Left-Kontaktschatten** und exaktem **Y-Sorting** nach der vorderen Kachel-Ecke.
4. **A*-Pathfinding auf Kachel-Graph:** Dorfbewohner laufen deterministisch über `ROAD`/`PLAZA`/`BRIDGE`-Kacheln — nie durch Gebäude, Zäune oder Wasser.
5. **Supercell Tactile 3D UI:** Plastische, glänzende Buttons mit gebogenem Top-Gloss, 3D-Bevel, tiefem Sockelschatten, fetter dunkler Schrift-Kontur (`text-stroke`) und spürbarem Druck-Feedback; **keine** `+`/`-`-Zoom-Buttons auf Mobile (Pinch-Zoom + Mausrad).

---

## 2. Der automatische 12-Regeln-Welt-Validator (`src/engine/worldValidator.js`)
Läuft bei **jedem Build & E2E-Test**. Verletzt auch nur 1 Kachel oder Entity eine Regel, schlägt der Build sofort fehl:

1. **Zero Fence-in-Water:** Kein Zaunsegment darf eine `WATER`-, `BRIDGE`- oder `ROAD`-Kachel schneiden oder betreten.
2. **Zero Building-on-Fence:** Kein Gebäude-Footprint darf eine Zaun-Grenzlinie berühren oder überlappen (mindestens 1 saubere Kachel Innenabstand bzw. strikt innerhalb der inneren Grundstückskacheln).
3. **Zero Building-on-Road / Water / Cliff:** Jede Kachel eines Gebäude-, Feld-, Tier- oder Deko-Footprints muss `terrain === SNOW`, `surface === NONE` (bzw. `PLOT` bei Feldern) und `zone` freigeschaltet sein.
4. **Zero Entity Overlap:** Keine zwei Entities dürfen dieselbe `(gx, gy)`-Kachel belegen.
5. **Bridge Alignment Invariant:** Jede Brücke muss exakt auf einer `WATER`-Kachel liegen, deren gegenüberliegende Nachbarn `ROAD` sind; Ausrichtung (`BRIDGE_X` vs. `BRIDGE_Y`) bestimmt automatisch Sprite-Winkel/Spiegelung.
6. **Road Connectivity Invariant:** Alle `ROAD`/`PLAZA`/`BRIDGE`-Kacheln bilden ein zusammenhängendes Netz ohne isolierte Stummel; jedes Start-Gebäude hat direkten Zugang (Nachbarkachel = `ROAD`/`PLAZA`).
7. **Signpost Isolation Invariant:** Jedes Erweiterungsschild steht auf einer freien `SNOW`-Kachel seiner Zielzone, mindestens `1` Kachel entfernt von Wasser, Klippen, Straßen und Gebäuden.
8. **Villager Walkability Invariant:** Alle Wegpunkte & Laufpositionen von Dorfbewohnern liegen ausschließlich auf begehbaren `ROAD`/`PLAZA`/`BRIDGE`-Kacheln (A*-Pfad).
9. **Daily Chest Grounding Invariant:** Schatztruhe steht auf einer freien `SNOW`-Uferkachel neben `WATER` (nie im Wasser, nie auf Zaun).
10. **Grounding & Pivot Invariant:** Jede Entity rendert eine kalibrierte isometrische Boden-Grundplatte + Kontaktschatten exakt an ihrer Footprint-Mitte `(gx + w/2, gy + h/2)`.
11. **Zero Clutter UI Invariant:** Keine `+`/`-`-Zoom-Buttons im DOM; `0` Emojis; Querformat-Lock aktiv im Hochformat.
12. **Debug-Grid Parity (`?grid=1`):** Ein umschaltbares Debug-Raster visualisiert alle Kachel-Typen, Zaun-Kanten und Footprints direkt auf dem WebGL-Canvas für 100 % Transparenz.

---

## 3. Stufenweiser Umsetzungsplan (Erst Logik, dann UI, dann Grafik-Feinschliff)

- **Stufe A (Grundlogik & Raster-Fundament):** `WorldGrid` + `WorldValidator` (12 Invarianten) + A*-Dorfbewohner + korrekt ausgerichtete Brücke/Wege/Zäune/Gebäude + umschaltbares Debug-Raster (`?grid=1`).
- **Stufe B (Grounding & Ruhiger Boden):** Isometrische Grundplatten (Schnee-Sockel/Steinfundamente + gerichtete Schatten) unter jedem Gebäude/Prop + deutlich ruhigerer, hochwertigerer Schnee-Boden (kein „Schweben“ mehr).
- **Stufe C (Supercell Tactile 3D HUD):** Kompletter Neubau aller HUD-Buttons im echten Hay-Day-/Clash-of-Clans-Look (3D-Bevel, Gloss-Highlight, fette Kontur-Typografie, hochwertige Icons) + komplettes Entfernen der `+`/`-`-Zoom-Buttons.
- **Stufe D (Lebendigkeit & Animationen):** 4-Frame-Animationen für Tiere/Dorfbewohner, arbeitende Gebäudeteile, taktiles Feedback & Sound-Polish.
