# Winterhof & Zauberherbst — GAME_STATUS.md

Definitive chronological release & verification log (append-only).

## v3 (2026-11-22) — Hay-Day Benchmark Mega-Polish
- 28 hand-painted 3D Supercell WebP sprites + `splash_art.webp` + PWA icons.
- Living world: 4-stage crops, autonomous walking/sleeping animals, strolling villagers, red-ribbon construction unwrap, mastery stars, 4 story chapters, Hofladen, Eulenpost, 34/34 E2E tests passed.

## v4 (2026-11-22) — Complete Hay-Day Depth & Winterhof Unification
- **Unified Branding:** Folder, titles, defaults, Service Worker (`winterhof-v4`), and Drive folder aligned on `Winterhof`.
- **New 3D Sprite:** Extracted transparent 3D WebP sprite `assets/sprites/deco_spider.webp` (29 WebP sprites total; 4 remaining sprites hit external image quota and use rich 2.5D layered SVG fallback until quota resets).
- **Mühle & Molkerei (`st_mill_dairy`):** Pre-built at `(2, 2)` with animated rotating wooden windmill sails; crafts `flour` (Feines Mehl), `butter` (Hof-Butter), and `mascarpone` (Cremiger Mascarpone). Authentic multi-step recipes wired across Bakery & Patisserie with backward-compatible save migration.
- **Scheunen-Lager mit Ausbau:** `barnCapacity` starts at 50, upgradable in +25 steps up to 300 (`cost = 80 + tier * 65`). Capacity meter & upgrade button in Barn modal; harvest/animal/station guards prevent silent overflow while gifts/daily chest never drop rewards.
- **Besucher-Kaufangebote an der Haustür:** Strolling villagers periodically display golden item-price offer bubbles (`1.22x` coin value + XP) and open a dedicated Accept/Decline dialog on tap.
- **Tägliche Schatztruhe:** Glowing daily treasure chest at plaza `(6.5, 4.5)` with calendar-day streak tracking, coin + unlocked item + XP rewards, and reveal modal.
- **Rezept- & Sammelbuch:** Dedicated `Sammelbuch` tab inside the Village modal tracking all 31 items + 6 magic secrets with progress bar and silhouettes.
- **Alles-ernten-Sense (Level 3+):** Floating scythe button harvests all ripe fields in one tap (respecting barn space).
- **Saison-Dach-Varianten:** Smoothly cross-faded autumn foliage, mini-pumpkins, and warm roof glaze across all 6 buildings when switching to Autumn.
- **Engine Hardening:** Clamped `dt <= 0.033s`, finite camera bounds guards, debounced `scheduleSave()` on rapid actions, `pagehide` flush.
- **Verification:** Automated Chromium CDP E2E suite (`scripts/e2e_test.mjs`) executed with v4 assertions and screenshot inspection.

## v5 (2026-11-22) — AAA Alpine Christmas Reboot (Hay-Day Benchmark Polish)
- **100% Pure Alpine Christmas Theme:** Removed all non-Christmas mashup themes (Autumn, Halloween, Harry Potter) for single-vision artistic cohesion using 19 true 3D Supercell WebP assets.
- **Strict Zero-Emoji Policy:** Removed every Unicode emoji across HTML, CSS, JS, Canvas, modals, toasts, and data; replaced with bespoke vector SVG iconography and illustrated miniature winter villagers on canvas.
- **Hay-Day Corner-Anchored HUD:** Replaced clunky bottom white-box dock bar with sculpted circular brass-and-oak floating corner medallions (90% unobstructed viewport) + 5-point gold Level Star crest.
- **Calm Level-1 Start:** Removed welcome letter popup; clean composed starter estate (Chalet, Christmas Tree, Bakery, 2x2 wheat plots, 1 chicken in fenced pen, road-aligned Wishlist Board & Sleigh, 2 symmetric lanterns).
- **Infinite Alpine Valley World:** Eliminated floating diamond void; added continuous snow hills, horizon-to-horizon grid-aligned cobblestone village road, split-rail timber estate boundary fences, winding frozen mountain brook & snow-banked alpine pond with timber jetty, and snow-dusted perimeter boulders.
- **Proportional Scale & Grounded Motion:** Re-scaled animals (Chicken 48px, Sheep 64px, Reindeer 78px), props (Mailbox 52px, Lantern 56px), and buildings (Chalet 242px, Stations 206px); eliminated idle building wobble/jelly bouncing.
- **Verification:** Full Chromium E2E suite passed (including automated zero-emoji DOM/modal audit and 0 console errors) with visual screenshot review.

## v6 Vertical Slice 1 (2026-11-23) — PixiJS v8 WebGL 2.5D Supercell-Hybrid Engine
- **Engine Overhaul:** Replaced Canvas2D renderer with **PixiJS v8 WebGL2** (`src/engine/textures.js`, `waterShader.js`, `terrainLayer.js`, `lightingLayer.js`, `particles.js`, `src/world.js`) + **Vite ESM build** (`dist/assets/index.js` 48.7 KB gzip, `pixi.js` 170 KB gzip).
- **Art Direction Locked (Golden Target):** Style C (Crisp Supercell CoC Terraced Alpine Valley) for Day + Style B (Fairytale Golden Hour) for Dusk + Deep Sapphire & Additive Gold-Bloom Night (`docs/lookdev_target_day_style_c.jpg`, `docs/lookdev_target_dusk_style_b.jpg`).
- **Painted Terrain & GLSL Water:** Seamless high-pass hand-painted alpine snow tiling (`snow_ground.webp`), chunky snow-creviced cobblestone village road & Christmas plaza (`cobble_road.webp`), custom GLSL glacial mountain brook shader with crystalline ice banks & dusk lantern reflection, 3D arched snowy timber bridge (`timber_bridge.webp`), sculpted snowy granite perimeter cliffs (`alpine_cliff.webp`), varied multi-scale pine forest rim, and snow-capped beveled 3D timber perimeter fences.
- **Style Cohesion Upgrade:** Replaced flat stick-figure villagers with 3D Supercell Alpine Villagers (`alpine_villager.webp`, `_green`, `_navy`), upgraded animal pens to isometric golden straw & snow-capped timber rails, rasterized all SVG icons cleanly for WebGL2, positioned all 4 carved wooden land-expansion signposts with 0 building overlaps, and purged 10 legacy non-Christmas sprites.
- **Landscape-Only Format Lock:** Added zero-emoji `#rotate-overlay` in Portrait (`@media (orientation: portrait)` + JS `is-portrait` guard), `"orientation": "landscape"` in `manifest.json`, and responsive mobile-landscape zoom framing.
- **Persistence & QA:** Seamless `winterhof_save_v5 -> winterhof_save_v6` migration, Zero-GC retained entity/particle pools, Stage-1 Supercell Benchmark passed: **60.1 FPS**, WebGL2 active, `0` console errors, `0` emojis, `0` sign/building overlaps.
