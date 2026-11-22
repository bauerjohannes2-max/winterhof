# Winterhof & Zauberherbst — GAME_SYSTEMS.md

Live specification synchronized with v4 code (`src/gameData.js`, `src/main.js`, `src/world.js`, `src/sprites.js`).

## 1. Core Loop & Hardening
- **Frame Loop (`src/main.js`):** `dt = Math.min(0.033, Math.max(0, (now - lastFrame) / 1000))`.
- **Camera Guards (`src/world.js`):** `clampCamera()` verifies `Number.isFinite` on `x, y, zoom, vx, vy`.
- **Persistence:** `SAVE_KEY = 'winterhof_save_v2'` (version `4`). Debounced `scheduleSave(1500ms)` during rapid harvest sweeps; synchronous `saveState()` on rewards, unlocks, upgrades, and `pagehide`. Full backward-compatible migration injects `st_mill_dairy`, `barnCapacity`, and `discoveredItems`.

## 2. Production Chains & Stations (`src/gameData.js`)
| Station | Footprint | Unlock | Products |
| :--- | :---: | :---: | :--- |
| `mill_dairy` (Mühle & Molkerei) | 2x2 | Lv.1 (pre-built `2,2`) | `flour` (2 wheat, 45s), `butter` (1 starmilk, 60s), `mascarpone` (2 starmilk + 1 egg, 120s) |
| `bakery` (Backstube & Waffel-Ofen) | 2x2 | Lv.1 (pre-built `3,6`) | `butterplaetzchen`, `waffles`, `lebkuchen`, `stollen` |
| `teahouse` (Matcha- & Zauber-Teehaus) | 2x2 | Lv.1 (90★) | `matcha_latte`, `herbal_tea`, `butterbeer`, `hot_cocoa`, `pumpkin_latte` |
| `patisserie` (Tiramisu- & Schwammerl-Küche) | 2x2 | Lv.2 (160★) | `mushroom_quiche`, `chocofrog`, `tiramisu`, `matcha_tiramisu` |
| `gift_workshop` (Wichtel- & Zauberwerkstatt) | 2x2 | Lv.4 (240★) | `wool_scarf`, `cookie_tin`, `mega_gift` |

## 3. Barn Capacity (`BARN_CONFIG`)
- Base: `50` slots; Step: `+25`; Max: `300`.
- Cost formula: `80 + tier * 65` coins (`tier = floor((cap - 50) / 25)`).
- Guarded actions: `harvestField` (+2), `forageWildMushroom` (+2), `interactAnimal` (+1), `interactStation` (+ready.length).
- Overflow-safe actions: `claimDailyChest`, `receiveGiftParcel` (rewards never lost).

## 4. Living Village & Daily Systems
- **Doorstep Villager Offers:** Checked every `22s`; one strolling villager offers `round(sellPrice * qty * 1.22) + 4` coins + XP for an in-stock item.
- **Daily Treasure Chest:** Spawns at plaza `(6.5, 4.5)` once per local calendar date (`YYYY-MM-DD`). Streak increments on consecutive days. Coins = `45 + min(streak, 7) * 10`, XP = `20 + min(streak, 7) * 4`, plus 2 unlocked item bundles.
- **Harvest-All Scythe:** Visible at `level >= 3` when `readyFieldsCount > 0`; harvests ripe plots until complete or barn full.
- **Recipe & Collection Album:** Tracks `discoveredItems` (31 items) + `ALBUM_SECRETS` (6 secrets) inside Village → `Sammelbuch`.
- **Seasonal Roofs:** `_drawAutumnRoofTrim()` cross-fades golden foliage, mini-pumpkins, and amber roof glaze on Chalet + all 5 stations using `seasonBlend`.
