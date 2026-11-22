# Winterhof — GAME_SYSTEMS.md (v5 AAA Alpine Christmas)

Live technical specification synchronized with v5 code (`src/gameData.js`, `src/main.js`, `src/world.js`, `src/sprites.js`).

## 1. Core Loop & Hardening
- **Frame Loop (`src/main.js`):** `dt = Math.min(0.033, Math.max(0, (now - lastFrame) / 1000))`.
- **Camera Guards (`src/world.js`):** `clampCamera()` verifies `Number.isFinite` on `x, y, zoom, vx, vy`.
- **Persistence:** `SAVE_KEY = 'winterhof_save_v5'`, debounced `scheduleSave(1500ms)` during swipe-harvesting, synchronous `saveState()` on rewards/upgrades/`pagehide`.
- **Zero-Emoji Policy:** Enforced across HTML, CSS, JS, Canvas, and verified via automated regex assertion in `scripts/e2e_test.mjs`.

## 2. World Architecture (`src/world.js`)
- **Infinite Alpine Snow Valley:** Continuous snow terrain (`-14..30`) + layered hills, dense snow-pine border forest, winding frozen mountain brook & pond with timber jetty, split-rail timber estate boundary fences with evergreen corner shrubs.
- **Grid-Aligned Roads:** Horizon-to-horizon main cobblestone village road along `gy = 5.5` with clean entrance aprons to Chalet `(6.0, 4.15..5.5)` and Backstube `(4.0, 5.5..6.95)`.
- **Proportional Scale (`TILE_W = 116`):** Chalet `242px`, Stations `206px` (`punch_stand` `184px`), Sleigh `170px`, Board `88px`, Snowman `64px`, Lantern `56px`, Mailbox `52px`, Reindeer `78px`, Sheep `64px`, Chicken `48px`, Illustrated Villagers `~44px`.
- **Grounded Motion:** Zero idle building wobble/scaling; micro-tap feedback `4.5%` over `0.2s`; gentle crop sway `0.014 rad`.

## 3. Progression & Stations (`src/gameData.js`)
- **Calm Starter Estate (Lv.1):** Chalet, Christmas Tree, Backstube, 4 wheat plots (`2x2`), 1 Schneehuhn (`Flöckchen`), Wishlist Board, Reindeer Sleigh, Mailbox, 2 road lanterns, 1 snowman.
- **4 True-3D Production Stations:** `bakery` (Lv.1), `teahouse` / Punsch- & Café-Stand (Lv.1, 90), `patisserie` (Lv.2, 165), `gift_workshop` (Lv.3, 240).
- **6 Crops:** `wheat`, `berries`, `matcha`, `cocoa`, `cinnamon`, `candycane`.
- **3 Animals:** `chicken`, `reindeer`, `sheep`.
- **Barn Capacity (`BARN_CONFIG`):** `50 -> 300` in `+25` steps (`80 + tier * 65`).
- **Living Systems:** Doorstep villager offers (`1.22x` price + XP), Lakeside Daily Treasure Chest (`(11.4, 12.6)` with streak), Level-3 Harvest-All Scythe, Illustrated `Sammelbuch` (23 items + 4 milestones), 4 Story Chapters, 8 Achievements, Winterpost (`WH-...`).
