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
